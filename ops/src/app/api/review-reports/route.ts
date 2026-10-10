import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf } from '@/lib/http';
import { listReviewReports, REPORT_STATUSES } from '@/lib/data/reports';

export const runtime = 'nodejs';
const DECISIONS = ['resolve', 'dismiss', 'hide'] as const;

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listReviewReports(
    oneOf(url.searchParams.get('status'), REPORT_STATUSES, 'open'),
    intParam(url, 'page', 1, 1, 10000),
  );
  return ok(data);
});

/**
 * Decides a report on a product review, or restores a hidden review.
 *
 * `hide` keeps the review (its author can still read and edit it) but takes it off the
 * public ficha; the decision text becomes the reason the author sees. The founder of
 * the solution can never do this — only ops, always with a reason in the audit log.
 * The product's catalogue cache picks the change up within its 5-minute window
 * (CLAUDE.md §52: ops cannot invalidate the product's cache).
 */
export const POST = opsRoute(
  { limit: ['review-reports-review', 120, 600] },
  async ({ body, user, sql, ip }) => {
    const { message } = body;
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000)
      return failure('Explica la decisión (mínimo 10 caracteres).', 400);
    const text = message.trim();

    if (body.action === 'restore') {
      if (!isUuid(body.reviewId)) return failure('ID inválido.', 400);
      const rows = await sql`
        WITH restored AS (
          UPDATE solution_reviews SET status = 'published', hidden_reason = NULL, updated_at = now()
          WHERE id = ${body.reviewId} AND status = 'hidden'
          RETURNING id, solution_id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'review_restore', 'review', id::text, left(${text}, 1000),
            jsonb_build_object('solutionId', solution_id::text), ${ip}
          FROM restored
        )
        SELECT id FROM restored
      `;
      if (!rows.length) return failure('La reseña ya no está oculta o no existe.', 409);
      return ok({});
    }

    const { reportId, decision, version } = body;
    if (!isUuid(reportId)) return failure('ID inválido.', 400);
    if (typeof decision !== 'string' || !(DECISIONS as readonly string[]).includes(decision))
      return failure('Decisión inválida.', 400);
    if (typeof version !== 'number' || !Number.isSafeInteger(version))
      return failure('Versión requerida.', 400);

    const rows = await sql`
      WITH changed AS (
        UPDATE solution_review_reports r SET
          status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
          decision = ${text}, reviewer_id = ${user.id}, resolved_at = now(),
          updated_at = now(), version = r.version + 1
        WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
          AND r.reporter_id IS DISTINCT FROM ${user.id}::uuid
        RETURNING r.review_id, r.solution_id
      ), hidden AS (
        UPDATE solution_reviews SET status = 'hidden', hidden_reason = left(${text}, 500), updated_at = now()
        WHERE id IN (SELECT review_id FROM changed) AND ${decision === 'hide'}
        RETURNING id
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, ${'review_report_' + decision}, 'review_report', ${reportId}, left(${text}, 1000),
          jsonb_build_object('reviewId', review_id::text, 'solutionId', solution_id::text), ${ip}
        FROM changed
      )
      SELECT review_id FROM changed
    `;
    if (!rows.length)
      return failure(
        'El reporte cambió, no existe o lo presentaste tú. Recarga e intenta de nuevo.',
        409,
      );
    return ok({});
  },
);
