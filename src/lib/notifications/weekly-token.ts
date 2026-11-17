import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed one-click unsubscribe for the weekly summary (SHCWS-21). Same secret as the
 * newsletter's, with its own prefix so a newsletter token never works here and vice versa.
 */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function key(secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET) {
  return typeof secret === 'string' && secret.length >= 32 ? secret : null;
}

const sign = (secret: string, payload: string) =>
  createHmac('sha256', secret).update(`weekly:${payload}`).digest();

export function createWeeklyUnsubscribeToken(accountId: string, secret?: string) {
  const k = key(secret);
  if (!k || !uuid.test(accountId)) return null;
  const payload = Buffer.from(accountId, 'utf8').toString('base64url');
  return `${payload}.${sign(k, payload).toString('base64url')}`;
}

export function readWeeklyUnsubscribeToken(token: unknown, secret?: string) {
  const k = key(secret);
  if (!k || typeof token !== 'string' || token.length > 256) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = sign(k, payload);
  const supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  const accountId = Buffer.from(payload, 'base64url').toString('utf8');
  return uuid.test(accountId) ? accountId : null;
}
