import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const actorEmail = url.searchParams.get('actor');
  const action = url.searchParams.get('action');
  const subjectType = url.searchParams.get('subjectType');
  const subjectId = url.searchParams.get('subjectId');
  const cursorId = url.searchParams.get('cursor');

  try {
    const sql = getDb();
    const cursor = cursorId && /^\d+$/.test(cursorId) ? Number(cursorId) : null;

    const rows = await sql`
      SELECT id, actor_email, action, subject_type, subject_id, reason, metadata, ip, created_at
      FROM ops_audit_log
      WHERE (${actorEmail}::text IS NULL OR actor_email = ${actorEmail})
        AND (${action}::text IS NULL OR action = ${action})
        AND (${subjectType}::text IS NULL OR subject_type = ${subjectType})
        AND (${subjectId}::text IS NULL OR subject_id = ${subjectId})
        AND (${cursor}::bigint IS NULL OR id < ${cursor})
      ORDER BY id DESC
      LIMIT ${PAGE_SIZE + 1}
    `;

    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE);

    return NextResponse.json({
      ok: true,
      hasMore,
      nextCursor: hasMore ? String(items[items.length - 1].id) : null,
      items: items.map(r => ({
        id: String(r.id), actorEmail: String(r.actor_email), action: String(r.action),
        subjectType: String(r.subject_type), subjectId: String(r.subject_id),
        reason: String(r.reason ?? ''), metadata: r.metadata ?? {},
        ip: r.ip ?? null, createdAt: String(r.created_at),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/audit]', err);
    return failure('Error interno.', 503);
  }
}
