import { timingSafeEqual } from 'node:crypto';

/**
 * Outside production (local, previews) campaigns and reconfirmations are only written to
 * Resend's test addresses (`…@resend.dev`): the development database is shared and must never
 * mail a real person by accident. Test sends and the confirmation someone asks for themselves
 * are not limited. Same idea as REVIEW_ALERTS (docs/env.md).
 */
export const testRecipientDomain = '@resend.dev';

export function newsletterSendsAnywhere() {
  return process.env.VERCEL_ENV === 'production';
}

export function newsletterRecipientAllowed(email: string) {
  return newsletterSendsAnywhere() || email.toLowerCase().endsWith(testRecipientDomain);
}

/**
 * ops (another Vercel project) asks the product to preview, test and start a campaign through
 * /api/internal/newsletter with `Authorization: Bearer OPS_NEWSLETTER_SECRET`. Dedicated secret,
 * like OPS_MEDIA_SECRET: one leaked secret never opens another door.
 */
export function authorizedOpsNewsletter(value: string | null) {
  const expected = process.env.OPS_NEWSLETTER_SECRET;
  if (!expected || expected.length < 32 || !value) return false;
  const a = Buffer.from(value),
    b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
