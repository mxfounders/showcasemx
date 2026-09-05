import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';
const PAGE_SIZE = 30;
const VALID_STATUSES = ['open', 'resolved', 'dismissed', 'all'];
const VALID_DECISIONS = ['resolve', 'dismiss', 'takedown'];

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
        r.id, r.subject_type, r.reason, r.details, r.status, r.decision, r.created_at, r.resolved_at, r.version,
        r.list_id, l.name AS list_name, l.curator_name, owner.email AS owner_email,
        r.comment_id, c.body AS comment_body, author.email AS comment_author_email,
        reviewer.email AS reviewer_email
      FROM community_reports r
      JOIN buyer_lists l ON l.id = r.list_id
      JOIN auth_accounts owner ON owner.id = l.owner_id
      LEFT JOIN community_list_comments c ON c.id = r.comment_id
      LEFT JOIN auth_accounts author ON author.id = c.author_id
      LEFT JOIN auth_accounts reviewer ON reviewer.id = r.reviewer_id
      WHERE (${status}::text = 'all' OR r.status = ${status})
      ORDER BY r.created_at DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
    `;
    const hasMore = rows.length > PAGE_SIZE;
    return NextResponse.json({
      ok: true, hasMore, page,
      items: rows.slice(0, PAGE_SIZE).map(r => ({
        id: String(r.id), subjectType: String(r.subject_type), reason: String(r.reason), details: String(r.details),
        status: String(r.status), decision: r.decision ?? null,
        createdAt: String(r.created_at), resolvedAt: r.resolved_at ? String(r.resolved_at) : null,
        version: Number(r.version), listId: String(r.list_id), listName: String(r.list_name),
        curatorName: r.curator_name ?? '', ownerEmail: String(r.owner_email),
        commentId: r.comment_id ? String(r.comment_id) : null,
        commentBody: r.comment_body ?? null, commentAuthorEmail: r.comment_author_email ?? null,
        reviewerEmail: r.reviewer_email ?? null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/community-reports]', err);
    return failure('Error interno.', 503);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('community-reports-review', requestIdentity(req.headers), 60, 400))) return failure('Demasiados cambios. Intenta más tarde.', 429);

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
        UPDATE community_reports r SET
          status = CASE WHEN ${decision} = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
          decision = ${trimmed}, reviewer_id = ${user.id}, resolved_at = now(), version = r.version + 1
        WHERE r.id = ${reportId} AND r.status = 'open' AND r.version = ${version}
        RETURNING r.subject_type, r.list_id, r.comment_id
      ), took_list AS (
        UPDATE buyer_lists SET visibility = 'private', updated_at = now()
        WHERE id IN (SELECT list_id FROM changed WHERE subject_type = 'list') AND ${decision === 'takedown'}
        RETURNING id
      ), took_comment AS (
        DELETE FROM community_list_comments
        WHERE id IN (SELECT comment_id FROM changed WHERE subject_type = 'comment') AND ${decision === 'takedown'}
        RETURNING id
      )
      SELECT * FROM changed
    `;

    if (!rows.length) return failure('El reporte cambió o no existe. Recarga e intenta de nuevo.', 409);

    await audit({
      actorId: user.id, actorEmail: user.email, action: `community_report_${decision}`,
      subjectType: String(rows[0].subject_type), subjectId: reportId, reason: trimmed, ip: requestIp(req.headers),
    });

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/community-reports]', err);
    return failure('Error interno.', 503);
  }
}
