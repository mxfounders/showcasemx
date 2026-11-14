import { randomBytes } from 'node:crypto';
import { authSql } from './security';
import { hashToken } from './password';
// Not routed through notifications/server.ts's sendEmail(): that module
// imports recoveryConfig from this file, and importing sendEmail back here
// would make the two modules circular for no real benefit — this fetch call
// was already independent, so it only gains the branded `html` body.
import { resetEmail } from '@/lib/notifications/account-emails';
export function recoveryConfig() {
  const { RESEND_API_KEY: key, AUTH_EMAIL_FROM: from, AUTH_APP_ORIGIN: origin } = process.env;
  if (!key || !from || !origin) return null;
  try {
    const url = new URL(origin);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return { key, from, origin: url.origin };
  } catch {
    return null;
  }
}
export async function issueReset(accountId: string, passwordHash: string) {
  const token = randomBytes(32).toString('hex');
  const sql = authSql();
  await sql`INSERT INTO auth_password_resets(token_hash,account_id,password_hash_at_issue,expires_at) VALUES(${hashToken(token)},${accountId},${passwordHash},now()+interval '30 minutes')`;
  return token;
}
export async function deliverReset(email: string, token: string) {
  const config = recoveryConfig();
  if (!config) throw new Error('Recovery unavailable');
  // Fragment keeps the bearer token out of server URL/access logs and referrers.
  const link = `${config.origin}/reset-password#token=${token}`;
  const message = resetEmail(config.origin, link);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Delivery unavailable');
}
/** The account whose password changed, or null; callers that only need truthiness still work. */
export async function consumeReset(token: string, passwordHash: string): Promise<string | null> {
  const sql = authSql();
  // Account CAS serializes competing tokens; changing the hash invalidates all earlier links.
  const rows = await sql`WITH changed AS (
    UPDATE auth_accounts a SET password_hash=${passwordHash}
    FROM auth_password_resets r WHERE r.token_hash=${hashToken(token)} AND r.account_id=a.id AND r.expires_at>now() AND a.password_hash=r.password_hash_at_issue
    RETURNING a.id
  ), sessions AS (DELETE FROM auth_sessions WHERE account_id IN(SELECT id FROM changed)),
  tokens AS (DELETE FROM auth_password_resets WHERE account_id IN(SELECT id FROM changed)) SELECT id FROM changed`;
  return rows.length ? String(rows[0].id) : null;
}
