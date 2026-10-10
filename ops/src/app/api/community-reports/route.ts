import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf } from '@/lib/http';
import { listCommunityReports, REPORT_STATUSES } from '@/lib/data/reports';

export const runtime = 'nodejs';
const DECISIONS = ['resolve', 'dismiss', 'takedown'] as const;

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listCommunityReports(
    oneOf(url.searchParams.get('status'), REPORT_STATUSES, 'open'),
    intParam(url, 'page', 1, 1, 10000),
  );
  return ok(data);
});

export const POST = opsRoute(
  { limit: ['community-reports-review', 120, 600] },
  async ({ body, user, sql, ip }) => {
    const { reportId, decision, message, version } = body;
    if (!isUuid(reportId)) return failure('ID inválido.', 400);
    if (typeof decision !== 'string' || !(DECISIONS as readonly string[]).includes(decision))
      return failure('Decisión inválida.', 400);
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000)
      return failure('Explica la decisión (mínimo 10 caracteres).', 400);
    if (typeof version !== 'number' || !Number.isSafeInteger(version))
      return failure('Versión requerida.', 400);
    const text = message.trim();

    const rows = await sql`
    WITH changed AS (
      UPDATE community_reports r SET
        status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
        decision = ${text}, reviewer_id = ${user.id}, resolved_at = now(), version = r.version + 1
      WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
        AND r.reporter_id IS DISTINCT FROM ${user.id}::uuid
      RETURNING r.subject_type, r.list_id, r.comment_id
    ), took_list AS (
      UPDATE buyer_lists SET visibility = 'private', updated_at = now()
      WHERE id IN (SELECT list_id FROM changed WHERE subject_type = 'list') AND ${decision === 'takedown'}
      RETURNING id
    ), took_comment AS (
      DELETE FROM community_list_comments
      WHERE id IN (SELECT comment_id FROM changed WHERE subject_type = 'comment') AND ${decision === 'takedown'}
      RETURNING id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, ${'community_report_' + decision}, subject_type, ${reportId}, left(${text}, 1000),
        jsonb_build_object('listId', list_id::text, 'commentId', comment_id::text), ${ip}
      FROM changed
    )
    SELECT subject_type FROM changed
  `;
    if (!rows.length)
      return failure(
        'El reporte cambió, no existe o lo presentaste tú. Recarga e intenta de nuevo.',
        409,
      );
    return ok({});
  },
);
