import { opsRoute } from '@/lib/api';
import { failure, ok } from '@/lib/http';

export const runtime = 'nodejs';

// Own ops sessions only: the account id comes from the session, never the body.
export const POST = opsRoute(
  { limit: ['me-sessions', 60, 300] },
  async ({ body, user, sql, ip }) => {
    if (body.action === 'revoke_others') {
      const [revoked] = await sql.transaction([
        sql`DELETE FROM ops_sessions WHERE account_id = ${user.id} AND token_hash <> ${user.sessionId} RETURNING token_hash`,
        sql`
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        VALUES (${user.id}, ${user.email}, 'sessions_revoked_others', 'session', ${user.sessionId.slice(0, 12)}, '', '{}'::jsonb, ${ip})
      `,
      ]);
      return ok({ message: `Se cerraron ${revoked.length} sesiones en otros dispositivos.` });
    }
    if (body.action === 'revoke') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!/^[a-f0-9]{64}$/.test(id)) return failure('Sesión inválida.', 400);
      if (id === user.sessionId)
        return failure('Para cerrar esta sesión usa «Cerrar sesión».', 422);
      const rows = await sql`
      WITH gone AS (DELETE FROM ops_sessions WHERE account_id = ${user.id} AND token_hash = ${id} RETURNING token_hash),
      logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'session_revoked', 'session', left(token_hash, 12), '', '{}'::jsonb, ${ip} FROM gone
      )
      SELECT token_hash FROM gone
    `;
      if (!rows.length) return failure('Esa sesión ya no existe.', 404);
      return ok({});
    }
    return failure('Acción inválida.', 400);
  },
);
