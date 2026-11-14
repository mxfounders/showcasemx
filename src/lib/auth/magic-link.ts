import { randomBytes, randomUUID } from 'node:crypto';
import { authSql } from './security';
import { hashPassword, hashToken } from './password';

/**
 * Email sign-in links for the review invitation page (SHCWS-132, db/review-invitations.sql).
 *
 * Opening the link proves the person controls the inbox, which is exactly what email
 * verification proves, so a new account is created already verified and the review it
 * writes is public right away. The rules keep it no stronger than password recovery
 * (which already lets an inbox reset a password):
 *
 * - The token is 32 random bytes, kept only as a SHA-256 hash, valid 30 minutes, consumed
 *   once by the DELETE that reads it (two tabs racing get one session and one refusal).
 * - It travels in the URL fragment and is posted from the page; a GET never signs anyone in.
 * - An existing account is signed in only if it existed when the link was asked for, its
 *   address is verified and its password has not changed since. An unverified one may have been
 *   registered by someone else with this address (account pre-hijacking), so it is never
 *   signed in or verified by the link: its owner uses their password or recovery.
 * - An account with two-step verification is never signed in by email alone.
 * - Suspended accounts get the same refusal as a used link.
 */

export const magicLinkMinutes = 30;

export const validMagicToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Stores a link for this address and returns its raw token, or null for a suspended account. */
export async function issueMagicLink(email: string, solutionId: string): Promise<string | null> {
  const sql = authSql();
  const [account] =
    await sql`SELECT password_hash,suspended_at FROM auth_accounts WHERE email=${email}`;
  if (account?.suspended_at) return null;
  const token = randomBytes(32).toString('hex');
  await sql.transaction([
    sql`DELETE FROM auth_magic_links WHERE expires_at<now()`,
    sql`INSERT INTO auth_magic_links(token_hash,email,solution_id,password_hash_at_issue,expires_at)
      VALUES (${hashToken(token)},${email},${solutionId},${account ? String(account.password_hash) : null},
        now()+${magicLinkMinutes}*interval '1 minute')`,
  ]);
  return token;
}

export const forgetMagicLink = (token: string) =>
  authSql()`DELETE FROM auth_magic_links WHERE token_hash=${hashToken(token)}`;

export type MagicLinkResult =
  | { status: 'ok'; accountId: string; passwordHash: string; created: boolean; solutionId: string }
  /** Used, expired, unknown, or the account changed or was suspended since. */
  | { status: 'invalid' }
  /** The account has two-step verification: sign in with password and code. */
  | { status: 'totp' }
  /** An account that was not verified when the link was asked for: use the password. */
  | { status: 'password' };

export async function consumeMagicLink(token: string): Promise<MagicLinkResult> {
  if (!validMagicToken(token)) return { status: 'invalid' };
  const sql = authSql();
  const [link] = await sql`DELETE FROM auth_magic_links WHERE token_hash=${hashToken(token)}
    RETURNING email,solution_id,password_hash_at_issue,expires_at>now() AS live`;
  if (!link?.live) return { status: 'invalid' };
  const email = String(link.email),
    solutionId = String(link.solution_id),
    issuedHash = link.password_hash_at_issue == null ? null : String(link.password_hash_at_issue);

  let [account] =
    await sql`SELECT id,password_hash,email_verified_at,suspended_at,totp_confirmed_at FROM auth_accounts WHERE email=${email}`;
  if (!account) {
    // A random password nobody knows: the person signs in by email, or sets one later
    // through recovery. The address is verified because the link reached it.
    const passwordHash = await hashPassword(randomBytes(48).toString('hex'));
    const [created] =
      await sql`INSERT INTO auth_accounts(id,email,password_hash,email_verified_at) VALUES (${randomUUID()},${email},${passwordHash},now())
        ON CONFLICT (email) DO NOTHING RETURNING id`;
    if (created) {
      const accountId = String(created.id);
      // Same default a confirmed address gets (consumeVerification): contact alerts on.
      await sql`INSERT INTO notification_preferences(owner_id,contact_email) VALUES (${accountId},true) ON CONFLICT (owner_id) DO NOTHING`;
      return { status: 'ok', accountId, passwordHash, created: true, solutionId };
    }
    // Someone registered this address a moment ago: treat it as an account that existed
    // unverified, below.
    [account] =
      await sql`SELECT id,password_hash,email_verified_at,suspended_at,totp_confirmed_at FROM auth_accounts WHERE email=${email}`;
    if (!account) return { status: 'invalid' };
  }
  if (account.suspended_at) return { status: 'invalid' };
  if (account.totp_confirmed_at) return { status: 'totp' };
  if (issuedHash === null || !account.email_verified_at) return { status: 'password' };
  if (String(account.password_hash) !== issuedHash) return { status: 'invalid' };
  return {
    status: 'ok',
    accountId: String(account.id),
    passwordHash: String(account.password_hash),
    created: false,
    solutionId,
  };
}
