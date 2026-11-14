import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed one-click unsubscribe for account notices (SHCWS-161, RFC 8058): one token per
 * account and kind of notice, so the button in a contact alert turns off contact alerts
 * and nothing else. Same secret as the newsletter and the weekly summary, with its own
 * prefix, so none of their tokens works here and none of these works there.
 * Security notices and the one-off welcome never carry one.
 */
export const unsubscribableCategories = ['contact', 'solution', 'community', 'alert'] as const;
export type UnsubscribableCategory = (typeof unsubscribableCategories)[number];

export const isUnsubscribable = (value: unknown): value is UnsubscribableCategory =>
  unsubscribableCategories.some(category => category === value);

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function key(secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET) {
  return typeof secret === 'string' && secret.length >= 32 ? secret : null;
}

const sign = (secret: string, payload: string) =>
  createHmac('sha256', secret).update(`notice:${payload}`).digest();

export function createNoticeUnsubscribeToken(
  accountId: string,
  category: string,
  secret?: string,
): string | null {
  const k = key(secret);
  if (!k || !uuid.test(accountId) || !isUnsubscribable(category)) return null;
  const payload = Buffer.from(`${accountId}:${category}`, 'utf8').toString('base64url');
  return `${payload}.${sign(k, payload).toString('base64url')}`;
}

export function readNoticeUnsubscribeToken(
  token: unknown,
  secret?: string,
): { accountId: string; category: UnsubscribableCategory } | null {
  const k = key(secret);
  if (!k || typeof token !== 'string' || token.length > 256) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = sign(k, payload);
  const supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  const [accountId, category, rest] = Buffer.from(payload, 'base64url').toString('utf8').split(':');
  if (rest !== undefined || !uuid.test(accountId ?? '') || !isUnsubscribable(category)) return null;
  return { accountId, category };
}
