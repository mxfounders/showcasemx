import { opsRoute, readReason } from '@/lib/api';
import { failure, ok } from '@/lib/http';

export const runtime = 'nodejs';

/**
 * Incident response: closes every ops session of every member except the one
 * making the request, and drops all pending login challenges. Everyone must sign
 * in again with password + TOTP.
 */
export const POST = opsRoute(
  { admin: true, elevated: true, limit: ['lockdown', 5, 20] },
  async ({ body, user, sql, ip }) => {
    const reason = readReason(body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    const [sessions, challenges] = await sql.transaction([
      sql`DELETE FROM ops_sessions WHERE token_hash <> ${user.sessionId} RETURNING account_id`,
      sql`DELETE FROM ops_login_challenges RETURNING account_id`,
      sql`
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      VALUES (${user.id}, ${user.email}, 'ops_lockdown', 'security', 'all', ${reason}, '{}'::jsonb, ${ip})
    `,
    ]);
    return ok({
      message: `Se cerraron ${sessions.length} sesiones y ${challenges.length} accesos a medio camino. Tu sesión sigue abierta.`,
    });
  },
);
