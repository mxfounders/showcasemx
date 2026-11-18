import { createHash } from 'node:crypto';
import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import { sendEmail } from '@/lib/notifications/server';
import { createNewsletterUnsubscribeToken } from '@/lib/newsletter-unsubscribe';
import { getDictionary } from '@/i18n/get-dictionary';
import {
  campaignProblems,
  readCampaignContent,
  readCampaignSegment,
  renderCampaignEmail,
  type CampaignContent,
} from './content';
import { newsletterSendsAnywhere, testRecipientDomain } from './guard';

/**
 * The newsletter worker (SHCWS-124). ops queues a tested campaign; this sends it with Resend's
 * batch API, 100 recipients per request. Why our own worker and not Resend Broadcasts:
 * docs/newsletter.md («Por qué un worker propio»).
 *
 * Idempotency: recipients are fixed when sending starts and grouped in batches of 100 that
 * never change. Each request carries `Idempotency-Key: nl:<campaign>:<batch>:<hash of its
 * recipients>`, so retrying an uncertain request (timeout, 5xx) within Resend's 24 h window
 * never sends twice. A retried batch keeps the same recipients on purpose, even if one of them
 * unsubscribed in between; attempts older than 23 h are given up instead of retried.
 */
export const batchSize = 100;
const maxAttempts = 5;

type Config = NonNullable<ReturnType<typeof recoveryConfig>>;

export type SendOutcome =
  | { ok: true; ids: string[] }
  | { ok: false; retry: 'soon' | 'later' | 'never'; stop: boolean; status: number };

function unsubscribeUrl(origin: string, email: string, locale: string, campaignId: string) {
  const token = createNewsletterUnsubscribeToken(email);
  return token ? `${origin}/${locale}/newsletter/unsubscribe?token=${token}&c=${campaignId}` : null;
}

export function batchKey(campaignId: string, batch: number, emails: string[]) {
  const members = createHash('sha256')
    .update([...emails].sort().join('\n'))
    .digest('hex');
  return `nl:${campaignId}:${batch}:${members.slice(0, 24)}`;
}

/** One request to Resend's batch endpoint and what to do with the answer. */
export async function postBatch(
  config: Config,
  messages: Array<Record<string, unknown>>,
  idempotencyKey: string,
): Promise<SendOutcome> {
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'User-Agent': 'shwcs-newsletter',
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    // Timeout or network: the request may have arrived. Retry with the same key.
    return { ok: false, retry: 'soon', stop: false, status: 0 };
  }
  const result = (await response.json().catch(() => ({}))) as {
    data?: { id?: unknown }[];
    name?: unknown;
  };
  if (response.ok) {
    const ids = (result.data ?? []).map(item => (typeof item.id === 'string' ? item.id : ''));
    return ids.length === messages.length && ids.every(Boolean)
      ? { ok: true, ids }
      : { ok: false, retry: 'soon', stop: false, status: response.status };
  }
  const name = typeof result.name === 'string' ? result.name : '';
  if (response.status === 429)
    return {
      ok: false,
      // A daily or monthly quota (free plan) won't clear in a minute.
      retry: /quota/.test(name) ? 'later' : 'soon',
      stop: true,
      status: 429,
    };
  if (response.status === 409 && name === 'concurrent_idempotent_requests')
    return { ok: false, retry: 'soon', stop: false, status: 409 };
  if (response.status >= 500)
    return { ok: false, retry: 'soon', stop: false, status: response.status };
  // 4xx: the payload itself is wrong (or the key was reused with another payload): retrying won't help.
  return { ok: false, retry: 'never', stop: false, status: response.status };
}

async function campaignRow(id: string) {
  const [row] = await authSql()`SELECT id::text, status, version, tested_version, content, segment
    FROM newsletter_campaigns WHERE id = ${id}`;
  if (!row) return null;
  const content = readCampaignContent(row.content);
  return {
    id: String(row.id),
    status: String(row.status),
    version: Number(row.version),
    testedVersion: row.tested_version == null ? null : Number(row.tested_version),
    content,
    segment: readCampaignSegment(row.segment),
  };
}

/** Freezes the audience of a queued campaign: confirmed, active, in the segment, at this moment. */
async function startCampaign(id: string) {
  const sql = authSql();
  const anywhere = newsletterSendsAnywhere();
  const [, started] = await sql.transaction([
    sql`WITH started AS (
        UPDATE newsletter_campaigns SET status = 'sending', started_at = now(), updated_at = now()
        WHERE id = ${id} AND status = 'queued' AND tested_version = version RETURNING id, segment
      )
      INSERT INTO newsletter_deliveries (campaign_id, email, locale, batch)
      SELECT st.id, s.email, COALESCE(s.locale, 'es'), ((row_number() OVER (ORDER BY s.email)) - 1) / ${batchSize}
      FROM started st JOIN newsletter_subscribers s
        ON s.confirmed_at IS NOT NULL AND s.unsubscribed_at IS NULL
        AND newsletter_in_segment(s.profile, s.role, st.segment)
      WHERE ${anywhere} OR s.email LIKE ${`%${testRecipientDomain}`}
      ON CONFLICT DO NOTHING RETURNING 1`,
    sql`UPDATE newsletter_campaigns SET recipients = (SELECT count(*) FROM newsletter_deliveries WHERE campaign_id = ${id})
      WHERE id = ${id} AND status = 'sending' RETURNING recipients`,
  ]);
  return started.length;
}

async function finishCampaign(id: string) {
  await authSql()`UPDATE newsletter_campaigns c SET status = 'sent', finished_at = now(), updated_at = now(),
      sent = (SELECT count(*) FROM newsletter_deliveries WHERE campaign_id = c.id AND state = 'sent'),
      failed = (SELECT count(*) FROM newsletter_deliveries WHERE campaign_id = c.id AND state = 'failed')
    WHERE c.id = ${id} AND c.status = 'sending'
      AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id = c.id AND d.state IN ('pending', 'sending'))`;
}

/**
 * Drains queued and sending campaigns within a time budget. Called right away when ops queues a
 * campaign (through /api/internal/newsletter) and by the daily mail cron as the retry.
 */
export async function processNewsletterQueue({
  campaignId,
  budgetMs = 240_000,
}: { campaignId?: string; budgetMs?: number } = {}) {
  const config = recoveryConfig();
  const summary = {
    available: false,
    started: 0,
    sent: 0,
    failed: 0,
    campaigns: 0,
    stopped: false,
  };
  // Without a signing secret there is no one-click unsubscribe: nothing goes out.
  if (!config || !createNewsletterUnsubscribeToken('check@example.invalid')) return summary;
  summary.available = true;
  const sql = authSql();
  const deadline = Date.now() + budgetMs;
  const only = campaignId ?? null;
  for (const row of await sql`SELECT id::text FROM newsletter_campaigns
      WHERE status = 'queued' AND (${only}::uuid IS NULL OR id = ${only}::uuid) ORDER BY queued_at LIMIT 5`)
    summary.started += (await startCampaign(String(row.id))) ? 1 : 0;
  // Uncertain attempts older than Resend's idempotency window, or retried too often, stop here.
  await sql`UPDATE newsletter_deliveries SET state = 'failed', locked_at = NULL
    WHERE state IN ('pending', 'sending') AND attempts > 0
      AND (attempts >= ${maxAttempts} OR first_attempt_at < now() - interval '23 hours')`;
  const copies = {
    es: (await getDictionary('es')).newsletter.mail.campaign,
    en: (await getDictionary('en')).newsletter.mail.campaign,
  };
  const sending = await sql`SELECT id::text FROM newsletter_campaigns
    WHERE status = 'sending' AND (${only}::uuid IS NULL OR id = ${only}::uuid) ORDER BY started_at`;
  for (const { id } of sending) {
    const campaign = await campaignRow(String(id));
    if (!campaign?.content || campaign.status !== 'sending') continue;
    summary.campaigns++;
    const content: CampaignContent = campaign.content;
    // Anyone who left (or was never confirmed) before their first attempt is skipped.
    await sql`UPDATE newsletter_deliveries d SET state = 'skipped' FROM newsletter_subscribers s
      WHERE d.campaign_id = ${campaign.id} AND d.state = 'pending' AND d.attempts = 0 AND s.email = d.email
        AND (s.unsubscribed_at IS NOT NULL OR s.confirmed_at IS NULL)`;
    while (Date.now() < deadline) {
      const rows = await sql`WITH next AS (
          SELECT batch FROM newsletter_deliveries
          WHERE campaign_id = ${campaign.id} AND attempts < ${maxAttempts} AND next_attempt_at <= now()
            AND (state = 'pending' OR (state = 'sending' AND locked_at < now() - interval '10 minutes'))
          ORDER BY batch LIMIT 1
        ), claim AS (
          SELECT d.email FROM newsletter_deliveries d JOIN next n ON d.batch = n.batch
          WHERE d.campaign_id = ${campaign.id} AND d.attempts < ${maxAttempts} AND d.next_attempt_at <= now()
            AND (d.state = 'pending' OR (d.state = 'sending' AND d.locked_at < now() - interval '10 minutes'))
          FOR UPDATE OF d SKIP LOCKED
        )
        UPDATE newsletter_deliveries d SET state = 'sending', locked_at = now(), attempts = attempts + 1,
          first_attempt_at = COALESCE(first_attempt_at, now())
        FROM claim WHERE d.campaign_id = ${campaign.id} AND d.email = claim.email
        RETURNING d.email, d.locale, d.batch`;
      if (!rows.length) {
        await finishCampaign(campaign.id);
        break;
      }
      const emails = rows.map(row => String(row.email));
      const messages = rows.map(row => {
        const email = String(row.email);
        const locale = row.locale === 'en' ? 'en' : 'es';
        const url = unsubscribeUrl(config.origin, email, locale, campaign.id);
        const message = renderCampaignEmail({
          content,
          locale,
          origin: config.origin,
          campaignId: campaign.id,
          unsubscribeUrl: url,
          copy: copies[locale],
        });
        const token = createNewsletterUnsubscribeToken(email);
        return {
          from: config.from,
          to: [email],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: {
            // One click in the mail client (RFC 8058); the mailto works where POST doesn't.
            'List-Unsubscribe': `<${config.origin}/api/newsletter/unsubscribe?token=${token}&c=${campaign.id}>, <mailto:hola@shwcs.site?subject=Baja%20newsletter>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: [
            { name: 'kind', value: 'newsletter' },
            { name: 'campaign', value: campaign.id },
          ],
        };
      });
      const outcome = await postBatch(
        config,
        messages,
        batchKey(campaign.id, Number(rows[0].batch), emails),
      );
      if (outcome.ok) {
        await sql.transaction([
          sql`UPDATE newsletter_deliveries d SET state = 'sent', sent_at = now(), locked_at = NULL, resend_id = v.id
            FROM (SELECT unnest(${emails}::text[]) AS email, unnest(${outcome.ids}::text[]) AS id) v
            WHERE d.campaign_id = ${campaign.id} AND d.email = v.email`,
          sql`UPDATE newsletter_campaigns SET sent = sent + ${emails.length}, updated_at = now() WHERE id = ${campaign.id}`,
        ]);
        summary.sent += emails.length;
        continue;
      }
      if (outcome.retry === 'never') {
        await sql.transaction([
          sql`UPDATE newsletter_deliveries SET state = 'failed', locked_at = NULL WHERE campaign_id = ${campaign.id} AND email = ANY(${emails}::text[])`,
          sql`UPDATE newsletter_campaigns SET failed = failed + ${emails.length}, updated_at = now() WHERE id = ${campaign.id}`,
        ]);
        summary.failed += emails.length;
        console.error(`Newsletter batch rejected (${outcome.status}).`);
        continue;
      }
      const wait = outcome.retry === 'later' ? '1 hour' : '1 minute';
      await sql`UPDATE newsletter_deliveries SET state = 'pending', locked_at = NULL, next_attempt_at = now() + ${wait}::interval
        WHERE campaign_id = ${campaign.id} AND email = ANY(${emails}::text[]) AND state = 'sending'`;
      if (outcome.stop) {
        summary.stopped = true;
        return summary;
      }
      // Leave the rest of this campaign for the next run rather than hammering a failing API.
      break;
    }
  }
  return summary;
}

/** Who the campaign would reach now: confirmed and active in the segment, and those this environment may write to. */
export async function campaignAudience(segment: unknown) {
  const [row] = await authSql()`SELECT count(*)::int AS confirmed,
      count(*) FILTER (WHERE ${newsletterSendsAnywhere()} OR email LIKE ${`%${testRecipientDomain}`})::int AS sendable,
      count(*) FILTER (WHERE locale = 'en')::int AS english
    FROM newsletter_subscribers
    WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL
      AND newsletter_in_segment(profile, role, ${JSON.stringify(readCampaignSegment(segment))}::jsonb)`;
  return {
    confirmed: Number(row?.confirmed ?? 0),
    sendable: Number(row?.sendable ?? 0),
    english: Number(row?.english ?? 0),
  };
}

/** What ops shows before testing: the rendered message, why it can't go out yet, and its audience. */
export async function previewCampaign(campaignId: string, locale: 'es' | 'en') {
  const config = recoveryConfig();
  const campaign = await campaignRow(campaignId);
  if (!campaign) return null;
  if (!campaign.content) return { version: campaign.version, problems: ['content'] };
  const origin = config?.origin ?? 'https://shwcs.site';
  const copy = (await getDictionary(locale)).newsletter.mail.campaign;
  const message = renderCampaignEmail({
    content: campaign.content,
    locale,
    origin,
    campaignId: campaign.id,
    unsubscribeUrl: `${origin}/${locale}/newsletter/unsubscribe`,
    copy,
    test: { version: campaign.version },
  });
  return {
    version: campaign.version,
    problems: campaignProblems(campaign.content),
    message,
    audience: await campaignAudience(campaign.segment),
    emailAvailable: Boolean(config),
  };
}

/**
 * The test send ops requires before a campaign can go out: every language version of exactly
 * `version` to one address. Its links are not counted and its unsubscribe link does nothing.
 * Returns the version that was sent; ops records it in the same statement as its audit entry.
 */
export async function sendCampaignTest(campaignId: string, version: number, to: string) {
  const config = recoveryConfig();
  if (!config) return { error: 'email-unavailable' as const };
  const campaign = await campaignRow(campaignId);
  if (!campaign) return { error: 'not-found' as const };
  if (campaign.status !== 'draft') return { error: 'not-draft' as const };
  if (campaign.version !== version) return { error: 'version' as const };
  if (!campaign.content) return { error: 'content' as const };
  const problems = campaignProblems(campaign.content);
  if (problems.length) return { error: 'problems' as const, problems };
  const locales = campaign.content.en ? (['es', 'en'] as const) : (['es'] as const);
  const minute = Math.floor(Date.now() / 60_000);
  const recipient = createHash('sha256').update(to).digest('hex').slice(0, 12);
  for (const locale of locales) {
    const copy = (await getDictionary(locale)).newsletter.mail.campaign;
    const message = renderCampaignEmail({
      content: campaign.content,
      locale,
      origin: config.origin,
      campaignId: campaign.id,
      unsubscribeUrl: `${config.origin}/${locale}/newsletter/unsubscribe`,
      copy,
      test: { version },
    });
    await sendEmail({
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      // A double click within the same minute sends once.
      idempotencyKey: `nl-test:${campaign.id}:${version}:${locale}:${recipient}:${minute}`,
    });
  }
  return { version, locales: [...locales] };
}
