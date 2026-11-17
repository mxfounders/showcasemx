import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf } from '@/lib/http';
import { listCommentReports, REPORT_STATUSES } from '@/lib/data/reports';
import { triggerCatalogRevalidate } from '@/lib/catalog';

export const runtime = 'nodejs';
const DECISIONS = ['resolve', 'dismiss', 'hide'] as const;

/** solution_comments.hidden_reason is varchar(500): the author reads it uncut. */
const MAX_HIDDEN_REASON = 500;

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listCommentReports(
    oneOf(url.searchParams.get('status'), REPORT_STATUSES, 'open'),
    intParam(url, 'page', 1, 1, 10000),
  );
  return ok(data);
});

/**
 * Decides a report on a comment of a listing (SHCWS-140), or restores a hidden comment.
 * Mirrors /api/review-reports: `hide` keeps the comment as evidence, takes it off the
 * public listing, its comment count, the ranking and the awards, and its author reads
 * the decision as the reason. The listing's founder can never do this (§46). The audit
 * entry is written in the same statement; hiding or restoring asks the product to
 * refresh its cached catalogue so the ranking moves at once.
 */
export const POST = opsRoute(
  { limit: ['comment-reports-review', 120, 600] },
  async ({ body, user, sql, ip }) => {
    const { message } = body;
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000)
      return failure('Explica la decisión (mínimo 10 caracteres).', 400);
    const text = message.trim();

    if (body.action === 'restore') {
      if (!isUuid(body.commentId)) return failure('ID inválido.', 400);
      const rows = await sql`
        WITH restored AS (
          UPDATE solution_comments SET hidden_at = NULL, hidden_reason = NULL
          WHERE id = ${body.commentId} AND hidden_at IS NOT NULL
          RETURNING id, solution_id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'solution_comment_restore', 'comment', id::text, left(${text}, 1000),
            jsonb_build_object('solutionId', solution_id::text), ${ip}
          FROM restored
        )
        SELECT id FROM restored
      `;
      if (!rows.length) return failure('El comentario ya no está oculto o no existe.', 409);
      await triggerCatalogRevalidate();
      return ok({});
    }

    const { reportId, decision, version } = body;
    if (!isUuid(reportId)) return failure('ID inválido.', 400);
    if (typeof decision !== 'string' || !(DECISIONS as readonly string[]).includes(decision))
      return failure('Decisión inválida.', 400);
    if (typeof version !== 'number' || !Number.isSafeInteger(version))
      return failure('Versión requerida.', 400);
    if (decision === 'hide' && text.length > MAX_HIDDEN_REASON)
      return failure(
        `Al ocultar, su autor lee la decisión como motivo: máximo ${MAX_HIDDEN_REASON} caracteres.`,
        400,
      );

    const rows = await sql`
      WITH changed AS (
        UPDATE solution_comment_reports r SET
          status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
          decision = ${text}, reviewer_id = ${user.id}, resolved_at = now(),
          updated_at = now(), version = r.version + 1
        WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
          AND r.reporter_id IS DISTINCT FROM ${user.id}::uuid
        RETURNING r.comment_id, r.solution_id
      ), hidden AS (
        UPDATE solution_comments SET hidden_at = now(), hidden_reason = ${text}
        WHERE id IN (SELECT comment_id FROM changed) AND hidden_at IS NULL AND ${decision === 'hide'}
        RETURNING id, author_name, left(body, 500) AS body
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, ${'comment_report_' + decision}, 'comment_report', ${reportId},
          left(${text}, 1000),
          jsonb_build_object('commentId', changed.comment_id::text, 'solutionId', changed.solution_id::text,
            'author', hidden.author_name, 'body', hidden.body), ${ip}
        FROM changed LEFT JOIN hidden ON hidden.id = changed.comment_id
      )
      SELECT comment_id, (SELECT count(*) FROM hidden)::int AS hidden FROM changed
    `;
    if (!rows.length)
      return failure(
        'El reporte cambió, no existe o lo presentaste tú. Recarga e intenta de nuevo.',
        409,
      );
    if (decision === 'hide') {
      await triggerCatalogRevalidate();
      if (!rows[0].hidden)
        return ok({
          message: 'El reporte quedó resuelto; el comentario ya estaba oculto o ya no existe.',
        });
    }
    return ok({});
  },
);
