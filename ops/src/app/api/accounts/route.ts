import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';
const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200);

  try {
    const sql = getDb();
    const offset = (page - 1) * PAGE_SIZE;
    const qLike = q ? '%' + q.toLowerCase() + '%' : null;

    const rows = await sql`
      SELECT
        a.id, a.email, a.name, a.organization, a.created_at, a.email_verified_at, a.suspended_at,
        (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id) AS solution_count,
        (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.status = 'published') AS published_count,
        (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.status = 'pending') AS pending_count,
        (SELECT count(*)::int FROM contact_requests cr WHERE cr.buyer_id = a.id) AS contacts_sent,
        (SELECT count(*)::int FROM contact_requests cr WHERE cr.recipient_id = a.id) AS contacts_received,
        (SELECT count(*)::int FROM auth_sessions s WHERE s.account_id = a.id AND s.expires_at > now()) AS active_sessions,
        EXISTS(SELECT 1 FROM solution_reviewers r WHERE r.account_id = a.id AND r.disabled_at IS NULL) AS is_ops
      FROM auth_accounts a
      WHERE (${qLike}::text IS NULL OR lower(a.email) LIKE ${qLike} OR lower(COALESCE(a.name, '')) LIKE ${qLike} OR lower(COALESCE(a.organization, '')) LIKE ${qLike})
      ORDER BY a.created_at DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
    `;

    const total = await sql`
      SELECT count(*)::int AS n FROM auth_accounts a
      WHERE (${qLike}::text IS NULL OR lower(a.email) LIKE ${qLike} OR lower(COALESCE(a.name, '')) LIKE ${qLike} OR lower(COALESCE(a.organization, '')) LIKE ${qLike})
    `;

    const hasMore = rows.length > PAGE_SIZE;
    return NextResponse.json({
      ok: true,
      total: Number(total[0]?.n ?? 0),
      hasMore,
      page,
      items: rows.slice(0, PAGE_SIZE).map(r => ({
        id: String(r.id), email: String(r.email), name: r.name ?? null, organization: r.organization ?? null,
        createdAt: String(r.created_at),
        emailVerifiedAt: r.email_verified_at ? String(r.email_verified_at) : null,
        suspendedAt: r.suspended_at ? String(r.suspended_at) : null,
        solutionCount: Number(r.solution_count), publishedCount: Number(r.published_count), pendingCount: Number(r.pending_count),
        contactsSent: Number(r.contacts_sent), contactsReceived: Number(r.contacts_received),
        activeSessions: Number(r.active_sessions), isOps: Boolean(r.is_ops),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/accounts]', err);
    return failure('Error interno.', 503);
  }
}
