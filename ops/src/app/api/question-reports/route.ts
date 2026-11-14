import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf } from '@/lib/http';
import { listQuestionReports, REPORT_STATUSES } from '@/lib/data/reports';
import { triggerCatalogRevalidate } from '@/lib/catalog';

export const runtime = 'nodejs';
const DECISIONS = ['resolve', 'dismiss', 'hide'] as const;

/** solution_questions.hidden_reason is varchar(500): the author reads it uncut. */
const MAX_HIDDEN_REASON = 500;

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listQuestionReports(
    oneOf(url.searchParams.get('status'), REPORT_STATUSES, 'open'),
    intParam(url, 'page', 1, 1, 10000),
  );
  return ok(data);
});

/**
 * Decides a report on a public question of a listing (SHCWS-57), or restores a hidden
 * question. Mirrors /api/solution-comment-reports: `hide` keeps the question (and its
 * answer) as evidence, takes it off the public listing and its FAQPage, and its author
 * reads the decision as the reason. The listing's founder can never do this (§46). The
 * audit entry is written in the same statement and keeps the question's text; hiding or
 * restoring asks the product to refresh its cached catalogue.
 */
export const POST = opsRoute(
  { limit: ['question-reports-review', 120, 600] },
  async ({ body, user, sql, ip }) => {
    const { message } = body;
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000)
      return failure('Explica la decisión (mínimo 10 caracteres).', 400);
    const text = message.trim();

    if (body.action === 'restore') {
      if (!isUuid(body.questionId)) return failure('ID inválido.', 400);
      const rows = await sql`
        WITH restored AS (
          UPDATE solution_questions SET hidden_at = NULL, hidden_reason = NULL
          WHERE id = ${body.questionId} AND hidden_at IS NOT NULL
          RETURNING id, solution_id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'question_restore', 'question', id::text, left(${text}, 1000),
            jsonb_build_object('solutionId', solution_id::text), ${ip}
          FROM restored
        )
        SELECT id FROM restored
      `;
      if (!rows.length) return failure('La pregunta ya no está oculta o no existe.', 409);
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
        UPDATE solution_question_reports r SET
          status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
          decision = ${text}, reviewer_id = ${user.id}, resolved_at = now(),
          updated_at = now(), version = r.version + 1
        WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
          AND r.reporter_id IS DISTINCT FROM ${user.id}::uuid
        RETURNING r.question_id, r.solution_id
      ), hidden AS (
        UPDATE solution_questions SET hidden_at = now(), hidden_reason = ${text}
        WHERE id IN (SELECT question_id FROM changed) AND hidden_at IS NULL AND ${decision === 'hide'}
        RETURNING id, author_name, left(body, 500) AS body
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, ${'question_report_' + decision}, 'question_report', ${reportId},
          left(${text}, 1000),
          jsonb_build_object('questionId', changed.question_id::text, 'solutionId', changed.solution_id::text,
            'author', hidden.author_name, 'body', hidden.body), ${ip}
        FROM changed LEFT JOIN hidden ON hidden.id = changed.question_id
      )
      SELECT question_id, (SELECT count(*) FROM hidden)::int AS hidden FROM changed
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
          message: 'El reporte quedó resuelto; la pregunta ya estaba oculta o ya no existe.',
        });
    }
    return ok({});
  },
);
