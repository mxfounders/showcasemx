import { createHmac, timingSafeEqual } from 'node:crypto';
import { authSql } from '@/lib/auth/security';

/**
 * Resend's webhooks (SHCWS-124): a permanent bounce, a suppression or a spam complaint takes
 * the address off the newsletter; deliveries and bounces are counted per campaign. Resend
 * signs with Svix: HMAC-SHA256 of `${svix-id}.${svix-timestamp}.${raw body}` with the
 * base64 key after `whsec_`, sent as space-separated `v1,<base64>` entries.
 */
export const webhookToleranceSeconds = 300;

export function verifySvixSignature({
  secret,
  id,
  timestamp,
  signature,
  body,
  now = Date.now(),
}: {
  secret: string | undefined;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: number;
}) {
  if (!secret?.startsWith('whsec_') || !id || !timestamp || !signature) return false;
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > webhookToleranceSeconds) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  } catch {
    return false;
  }
  if (!key.length) return false;
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(' ').some(entry => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    const supplied = Buffer.from(value, 'base64');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}

export type ResendEvent = {
  type: string;
  emailId: string | null;
  to: string[];
  campaignId: string | null;
  bounceType: string | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The fields this receiver uses; anything else in the payload is ignored and not stored. */
export function readResendEvent(value: unknown): ResendEvent | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const data =
    input.data && typeof input.data === 'object' ? (input.data as Record<string, unknown>) : {};
  if (typeof input.type !== 'string' || input.type.length > 40) return null;
  const to = (Array.isArray(data.to) ? data.to : typeof data.to === 'string' ? [data.to] : [])
    .filter((item): item is string => typeof item === 'string' && item.length <= 254)
    .map(item =>
      item
        .trim()
        .toLowerCase()
        .replace(/^.*<([^>]+)>$/, '$1'),
    );
  // Webhook tags arrive as a map ({"campaign": "…"}); requests send them as a list.
  const tags =
    data.tags && typeof data.tags === 'object' && !Array.isArray(data.tags)
      ? (data.tags as Record<string, unknown>)
      : {};
  const campaign =
    typeof tags.campaign === 'string' && uuid.test(tags.campaign) ? tags.campaign : null;
  const bounce =
    data.bounce && typeof data.bounce === 'object' ? (data.bounce as Record<string, unknown>) : {};
  return {
    type: input.type,
    emailId:
      typeof data.email_id === 'string' && data.email_id.length <= 100 ? data.email_id : null,
    to: to.slice(0, 50),
    campaignId: campaign,
    bounceType: typeof bounce.type === 'string' ? bounce.type : null,
  };
}

/** What an event does to the newsletter: the delivery timestamp it sets, and whether it unsubscribes. */
export function eventEffect(event: ResendEvent) {
  switch (event.type) {
    case 'email.delivered':
      return { column: 'delivered' as const, reason: null };
    case 'email.bounced':
      // A temporary bounce may still arrive later; only a permanent one is final.
      return event.bounceType === 'Permanent'
        ? { column: 'bounced' as const, reason: 'bounce' as const }
        : { column: null, reason: null };
    case 'email.suppressed':
      // Resend refused to send: the address is on its suppression list after an earlier bounce.
      return { column: 'bounced' as const, reason: 'bounce' as const };
    case 'email.complained':
      return { column: 'complained' as const, reason: 'complaint' as const };
    default:
      return { column: null, reason: null };
  }
}

/**
 * Applies one event once (deduplicated by svix-id in the same statement). A bounce or complaint
 * on any shwcs email unsubscribes the newsletter address too: sending less is the safe side.
 */
export async function applyResendEvent(svixId: string, event: ResendEvent) {
  const effect = eventEffect(event);
  const sql = authSql();
  const rows = await sql`WITH fresh AS (
      INSERT INTO resend_webhook_events (id, type) VALUES (${svixId}, ${event.type})
      ON CONFLICT (id) DO NOTHING RETURNING id
    ), delivery AS (
      UPDATE newsletter_deliveries SET
        delivered_at = CASE WHEN ${effect.column} = 'delivered' THEN COALESCE(delivered_at, now()) ELSE delivered_at END,
        bounced_at = CASE WHEN ${effect.column} = 'bounced' THEN COALESCE(bounced_at, now()) ELSE bounced_at END,
        complained_at = CASE WHEN ${effect.column} = 'complained' THEN COALESCE(complained_at, now()) ELSE complained_at END
      WHERE EXISTS (SELECT 1 FROM fresh) AND ${effect.column}::text IS NOT NULL AND ${event.emailId}::text IS NOT NULL
        AND resend_id = ${event.emailId}
        AND CASE ${effect.column} WHEN 'delivered' THEN delivered_at IS NULL WHEN 'bounced' THEN bounced_at IS NULL
          WHEN 'complained' THEN complained_at IS NULL ELSE false END
      RETURNING campaign_id
    ), counted AS (
      UPDATE newsletter_campaigns SET
        delivered = delivered + CASE WHEN ${effect.column} = 'delivered' THEN 1 ELSE 0 END,
        bounced = bounced + CASE WHEN ${effect.column} = 'bounced' THEN 1 ELSE 0 END,
        complained = complained + CASE WHEN ${effect.column} = 'complained' THEN 1 ELSE 0 END
      WHERE id IN (SELECT campaign_id FROM delivery)
    ), left_list AS (
      UPDATE newsletter_subscribers SET unsubscribe_reason = ${effect.reason}, unsubscribed_at = now()
      WHERE EXISTS (SELECT 1 FROM fresh) AND ${effect.reason}::text IS NOT NULL
        AND email = ANY(${event.to}::text[]) AND unsubscribed_at IS NULL
      RETURNING email
    )
    SELECT (SELECT count(*) FROM fresh)::int AS fresh, (SELECT count(*) FROM delivery)::int AS deliveries,
      (SELECT count(*) FROM left_list)::int AS unsubscribed`;
  return {
    fresh: Number(rows[0]?.fresh ?? 0) > 0,
    deliveries: Number(rows[0]?.deliveries ?? 0),
    unsubscribed: Number(rows[0]?.unsubscribed ?? 0),
  };
}
