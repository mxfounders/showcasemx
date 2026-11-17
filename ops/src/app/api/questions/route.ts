import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';

export const runtime = 'nodejs';

/** hidden_reason is varchar(500): the author reads it as it was written, never cut. */
const MAX_REASON = 500;

/**
 * Hides a public question without a prior report (SHCWS-57). Same effect as deciding a
 * report with «hide»: it leaves the listing and its FAQPage, its author still reads it
 * with the reason, and «Restaurar» (POST /api/question-reports, action restore) brings it
 * back. Modo seguro because nobody asked for it. The audit entry is written in the same
 * statement and keeps the question's text.
 */
export const POST = opsRoute(
  { elevated: true, limit: ['question-moderate', 120, 600] },
  async ({ body, user, sql, ip }) => {
    if (body.action !== 'hide') return failure('Acción inválida.', 400);
    if (!isUuid(body.questionId)) return failure('ID inválido.', 400);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length < 10 || message.length > MAX_REASON)
      return failure(
        `Escribe el motivo que verá su autor (entre 10 y ${MAX_REASON} caracteres).`,
        400,
      );
    const rows = await sql`
      WITH hidden AS (
        UPDATE solution_questions SET hidden_at = now(), hidden_reason = ${message}
        WHERE id = ${body.questionId} AND hidden_at IS NULL
        RETURNING id, solution_id, author_name, left(body, 500) AS body
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'question_hide', 'question', id::text, ${message},
          jsonb_build_object('solutionId', solution_id::text, 'author', author_name, 'body', body), ${ip}
        FROM hidden
      )
      SELECT id FROM hidden
    `;
    if (!rows.length) {
      const [question] = await sql`SELECT id FROM solution_questions WHERE id = ${body.questionId}`;
      return failure(question ? 'La pregunta ya está oculta.' : 'La pregunta ya no existe.', 409);
    }
    await triggerCatalogRevalidate();
    return ok({});
  },
);
