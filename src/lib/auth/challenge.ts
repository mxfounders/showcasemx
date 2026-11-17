import { randomBytes } from 'node:crypto';
import { authSql } from './security';
import { hashToken } from './password';
import { challengeSeconds } from './session';

/**
 * Starts the second step of a sign-in for an account with two-step verification: the
 * password (or Google, SHCWS-172) checked out, but no session exists until a code does.
 * Any earlier challenge of the account is dropped. Bound to the current password hash, so
 * a password change in between leaves nothing to finish. Returns the cookie value.
 */
export async function issueLoginChallenge(accountId: string, passwordHash: string) {
  const sql = authSql();
  const token = randomBytes(32).toString('hex');
  await sql.transaction([
    sql`DELETE FROM auth_login_challenges WHERE account_id = ${accountId} OR expires_at <= now()`,
    sql`INSERT INTO auth_login_challenges (token_hash, account_id, password_hash_at_issue, expires_at)
        VALUES (${hashToken(token)}, ${accountId}, ${passwordHash}, now() + ${challengeSeconds} * interval '1 second')`,
  ]);
  return token;
}
