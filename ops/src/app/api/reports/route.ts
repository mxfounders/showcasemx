import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';
const PAGE_SIZE = 30;
const VALID_STATUSES = ['open', 'resolved', 'dismissed', 'all'];
const VALID_DECISIONS = ['resolve', 'dismiss', 'withdraw'];

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'open';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  if (!VALID_STATUSES.includes(status)) return failure('Estado inválido.', 400);

  try {
    const sql = getDb();
    const offset = (page - 1) * PAGE_SIZE;
    const rows = await sql`
      SELECT
        r.id, r.reason, r.details, r.status, r.decision, r.created_at, r.resolved_at, r.version,
        r.solution_id, COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name,
        owner.email AS owner_email, reviewer.email AS reviewer_email
      FROM solution_reports r
      JOIN founder_solutions s ON s.id = r.solution_id
      JOIN auth_accounts owner ON owner.id = s.owner_id
      LEFT JOIN auth_accounts reviewer ON reviewer.id = r.reviewer_id
      WHERE (${status}::text = 'all' OR r.status = ${status})
      ORDER BY r.created_at DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
    `;
    const hasMore = rows.length > PAGE_SIZE;
    return NextResponse.json({
      ok: true, hasMore, page,
      items: rows.slice(0, PAGE_SIZE).map(r => ({
        id: String(r.id), reason: String(r.reason), details: String(r.details),
        status: String(r.status), decision: r.decision ?? null,
        createdAt: String(r.created_at), resolvedAt: r.resolved_at ? String(r.resolved_at) : null,
        version: Number(r.version), solutionId: String(r.solution_id),
        solutionName: r.solution_name ?? '(retirada)', ownerEmail: String(r.owner_email),
        reviewerEmail: r.reviewer_email ?? null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/reports]', err);
    return failure('Error interno.', 503);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('reports-review', requestIdentity(req.headers), 60, 400))) return failure('Demasiados cambios. Intenta más tarde.', 429);

  const body = await opsBody(req);
  const reportId = body?.reportId;
  const decision = body?.decision;
  const message = body?.message;
  const version = body?.version;

  if (!isUuid(reportId)) return failure('ID inválido.', 400);
  if (typeof decision !== 'string' || !VALID_DECISIONS.includes(decision)) return failure('Decisión inválida.', 400);
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) return failure('Explica la decisión (mínimo 10 caracteres).', 400);
  if (typeof version !== 'number' || !Number.isSafeInteger(version)) return failure('Versión requerida.', 400);

  try {
    const sql = getDb();
    const trimmed = message.trim();
    const rows = await sql`
      WITH changed AS (
        UPDATE solution_reports r SET
          status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
          decision = ${trimmed}, reviewer_id = ${user.id}, resolved_at = now(), version = r.version + 1
        WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
        RETURNING r.solution_id
      ), withdrawn AS (
        UPDATE founder_solutions SET
          published_data = NULL, published_at = NULL, status = 'changes_requested',
          updated_at = now(), version = version + 1
        WHERE id IN (SELECT solution_id FROM changed) AND ${decision === 'withdraw'}
        RETURNING id
      ), event AS (
        INSERT INTO solution_events (solution_id, status, message, actor_id)
        SELECT id, 'withdrawn', ${trimmed}, ${user.id} FROM withdrawn
      )
      SELECT * FROM changed
    `;

    if (!rows.length) return failure('El reporte cambió o no existe. Recarga e intenta de nuevo.', 409);

    await audit({
      actorId: user.id, actorEmail: user.email, action: `report_${decision}`,
      subjectType: 'report', subjectId: reportId, reason: trimmed, ip: requestIp(req.headers),
    });

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/reports]', err);
    return failure('Error interno.', 503);
  }
}
