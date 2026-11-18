import { after, NextRequest, NextResponse } from 'next/server';
import { authorizedOpsNewsletter } from '@/lib/newsletter/guard';
import { sendReconfirmations } from '@/lib/newsletter/confirm';
import { previewCampaign, processNewsletterQueue, sendCampaignTest } from '@/lib/newsletter/send';
import { createWeeklyNewsletterDraft } from '@/lib/newsletter/weekly-draft';

export const maxDuration = 300;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * What ops asks of the newsletter (SHCWS-124). ops decides and audits in its own database
 * statements; the product renders and sends, so templates, unsubscribe tokens and the sending
 * idempotency live in one place. Bearer OPS_NEWSLETTER_SECRET, no browser origin.
 *
 * - preview: rendered message (as a test of the current version), problems and audience.
 * - test: sends `version` to one address; answers the version sent.
 * - run: drains the queue after answering (the daily mail cron is the retry).
 * - weekly-draft: this week's «Nuevo esta semana» draft, or a refresh of one.
 * - reconfirm: asks subscribers from before double opt-in to confirm (after answering).
 */
export async function POST(request: NextRequest) {
  if (!authorizedOpsNewsletter(request.headers.get('authorization')))
    return reply({ error: 'unauthorized' }, 401);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 4096) return reply({ error: 'too-long' }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: 'invalid' }, 400);
  }
  const campaignId =
    typeof body.campaignId === 'string' && uuid.test(body.campaignId) ? body.campaignId : null;
  try {
    switch (body.action) {
      case 'preview': {
        if (!campaignId) return reply({ error: 'invalid' }, 400);
        const preview = await previewCampaign(campaignId, body.locale === 'en' ? 'en' : 'es');
        return preview ? reply({ ok: true, ...preview }) : reply({ error: 'not-found' }, 404);
      }
      case 'test': {
        const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
        const version = Number(body.version);
        if (!campaignId || !Number.isInteger(version) || to.length > 254 || !emailPattern.test(to))
          return reply({ error: 'invalid' }, 400);
        const result = await sendCampaignTest(campaignId, version, to);
        return 'error' in result ? reply(result, 409) : reply({ ok: true, ...result });
      }
      case 'run':
        after(() =>
          processNewsletterQueue({ campaignId: campaignId ?? undefined }).catch(() =>
            console.error('Newsletter run failed.'),
          ),
        );
        return reply({ ok: true, accepted: true }, 202);
      case 'weekly-draft': {
        const result = await createWeeklyNewsletterDraft({ refresh: campaignId ?? undefined });
        return reply({ ok: true, ...result });
      }
      case 'reconfirm':
        after(() => sendReconfirmations().catch(() => console.error('Reconfirmations failed.')));
        return reply({ ok: true, accepted: true }, 202);
      default:
        return reply({ error: 'invalid' }, 400);
    }
  } catch {
    console.error('Internal newsletter request failed.');
    return reply({ error: 'unavailable' }, 503);
  }
}
