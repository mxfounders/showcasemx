import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf } from '@/lib/http';
import { listSolutionReports, REPORT_STATUSES } from '@/lib/data/reports';
import { triggerCatalogRevalidate } from '@/lib/catalog';

export const runtime = 'nodejs';
const DECISIONS = ['resolve', 'dismiss', 'withdraw'] as const;

export const GET = opsRoute({}, async ({ url }) => {
  const data = await listSolutionReports(
    oneOf(url.searchParams.get('status'), REPORT_STATUSES, 'open'),
    intParam(url, 'page', 1, 1, 10000),
  );
  return ok(data);
});

export const POST = opsRoute(
  { limit: ['reports-review', 120, 600] },
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

    // Resolving a report you filed yourself stays blocked: that is third-party
    // moderation, unlike deciding on your own listing (CLAUDE.md §51).
    const rows = await sql`
    WITH changed AS (
      UPDATE solution_reports r SET
        status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
        decision = ${text}, reviewer_id = ${user.id}, resolved_at = now(), version = r.version + 1
      WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
        AND r.reporter_id IS DISTINCT FROM ${user.id}::uuid
      RETURNING r.solution_id
    ), withdrawn AS (
      UPDATE founder_solutions SET
        published_data = NULL, published_at = NULL, status = 'changes_requested',
        updated_at = now(), version = version + 1
      WHERE id IN (SELECT solution_id FROM changed) AND ${decision === 'withdraw'}
      RETURNING id
    ), event AS (
      INSERT INTO solution_events (solution_id, status, message, actor_id)
      SELECT id, 'withdrawn', ${text}, ${user.id} FROM withdrawn
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, ${'report_' + decision}, 'report', ${reportId}, left(${text}, 1000),
        jsonb_build_object('solutionId', solution_id::text), ${ip}
      FROM changed
    )
    SELECT solution_id, (SELECT count(*)::int FROM withdrawn) AS withdrawn FROM changed
  `;
    if (!rows.length)
      return failure(
        'El reporte cambió, no existe o lo presentaste tú. Recarga e intenta de nuevo.',
        409,
      );
    if (Number(rows[0].withdrawn) > 0) await triggerCatalogRevalidate();
    return ok({});
  },
);
