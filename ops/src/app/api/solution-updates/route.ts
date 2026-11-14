import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';

export const runtime = 'nodejs';

/** hidden_reason is varchar(500): the founder reads it as it was written, never cut. */
const MAX_REASON = 500;

/**
 * Moderation after the fact of a listing's dated updates (SHCWS-24). An update goes out
 * without a full review; ops hides one that breaks the criteria, with the reason the
 * founder reads next to it in their account, and can restore it. Hidden updates leave
 * the public listing and the followers' weekly summary. Modo seguro, like hiding a review
 * without a report; the audit entry is written in the same statement and keeps the text.
 */
export const POST = opsRoute(
  { elevated: true, limit: ['update-moderate', 120, 600] },
  async ({ body, user, sql, ip }) => {
    if (body.action !== 'hide' && body.action !== 'restore')
      return failure('Acción inválida.', 400);
    if (!isUuid(body.updateId)) return failure('ID inválido.', 400);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length < 10 || message.length > MAX_REASON)
      return failure(
        `Escribe el motivo${body.action === 'hide' ? ' que verá el fundador' : ''} (entre 10 y ${MAX_REASON} caracteres).`,
        400,
      );
    const hiding = body.action === 'hide';
    const rows = await sql`
      WITH changed AS (
        UPDATE solution_updates SET
          hidden_at = CASE WHEN ${hiding} THEN now() ELSE NULL END,
          hidden_reason = CASE WHEN ${hiding} THEN ${message} ELSE NULL END,
          hidden_by = CASE WHEN ${hiding} THEN ${user.id}::uuid ELSE NULL END
        WHERE id = ${body.updateId} AND deleted_at IS NULL
          AND (hidden_at IS NULL) = ${hiding}
        RETURNING id, solution_id, kind, body
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, ${hiding ? 'solution_update_hide' : 'solution_update_restore'},
          'solution_update', id::text, ${message},
          jsonb_build_object('solutionId', solution_id::text, 'kind', kind, 'body', left(body, 500)), ${ip}
        FROM changed
      )
      SELECT id FROM changed
    `;
    if (!rows.length) {
      const [update] =
        await sql`SELECT hidden_at IS NOT NULL AS hidden, deleted_at IS NOT NULL AS deleted FROM solution_updates WHERE id = ${body.updateId}`;
      return failure(
        !update || update.deleted
          ? 'La novedad ya no existe.'
          : update.hidden
            ? 'La novedad ya está oculta.'
            : 'La novedad ya está visible.',
        409,
      );
    }
    return ok({});
  },
);
