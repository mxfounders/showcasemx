import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';

export const runtime = 'nodejs';

/** hidden_reason is varchar(500): the author reads it as it was written, never cut. */
const MAX_REASON = 500;

/**
 * Hides a review without a prior report (SHCWS-142). Same effect as deciding a report
 * with «hide»: the review leaves the public ficha, its author still reads (and can edit)
 * it with the reason, and «Restaurar» (POST /api/review-reports, action restore) brings
 * it back. Modo seguro because nobody asked for it: ops acts on its own initiative.
 * The audit entry is written in the same statement and keeps the review's text.
 */
export const POST = opsRoute(
  { elevated: true, limit: ['review-moderate', 120, 600] },
  async ({ body, user, sql, ip }) => {
    if (body.action !== 'hide') return failure('Acción inválida.', 400);
    if (!isUuid(body.reviewId)) return failure('ID inválido.', 400);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length < 10 || message.length > MAX_REASON)
      return failure(
        `Escribe el motivo que verá su autor (entre 10 y ${MAX_REASON} caracteres).`,
        400,
      );
    const rows = await sql`
      WITH hidden AS (
        UPDATE solution_reviews SET status = 'hidden', hidden_reason = ${message}, updated_at = now()
        WHERE id = ${body.reviewId} AND status = 'published'
        RETURNING id, solution_id, author_name, rating, headline
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'review_hide', 'review', id::text, ${message},
          jsonb_build_object('solutionId', solution_id::text, 'author', author_name, 'rating', rating,
            'headline', headline), ${ip}
        FROM hidden
      )
      SELECT id FROM hidden
    `;
    if (!rows.length) {
      const [review] = await sql`SELECT status FROM solution_reviews WHERE id = ${body.reviewId}`;
      return failure(review ? 'La reseña ya está oculta.' : 'La reseña ya no existe.', 409);
    }
    // Stars feed the catalogue order: refresh the product's cached catalogue now.
    await triggerCatalogRevalidate();
    return ok({});
  },
);
