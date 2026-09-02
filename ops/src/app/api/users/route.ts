import { NextResponse } from 'next/server';
import { getOpsSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const user = await getOpsSession();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200);

  try {
    const sql = getDb();
    const offset = (page - 1) * PAGE_SIZE;
    const searchFilter = q ? sql`WHERE lower(a.email) LIKE ${'%' + q.toLowerCase() + '%'}` : sql``;

    const rows = await sql`
      SELECT
        a.id, a.email, a.created_at, a.email_verified_at,
        (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id) AS solution_count,
        (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.status = 'published') AS published_count,
        (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.status = 'pending') AS pending_count,
        (SELECT count(*)::int FROM contact_requests cr WHERE cr.buyer_id = a.id) AS contacts_sent,
        (SELECT count(*)::int FROM contact_requests cr WHERE cr.recipient_id = a.id) AS contacts_received,
        (SELECT count(*)::int FROM auth_sessions s WHERE s.account_id = a.id AND s.expires_at > now()) AS active_sessions,
        EXISTS(SELECT 1 FROM solution_reviewers r WHERE r.account_id = a.id) AS is_reviewer
      FROM auth_accounts a
      ${searchFilter}
      ORDER BY a.created_at DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
    `;

    const total = await sql`SELECT count(*)::int AS n FROM auth_accounts`;
    const hasMore = rows.length > PAGE_SIZE;

    return NextResponse.json({
      ok: true,
      total: Number(total[0]?.n ?? 0),
      hasMore,
      page,
      items: rows.slice(0, PAGE_SIZE).map(r => ({
        id: String(r.id), email: String(r.email),
        createdAt: String(r.created_at),
        emailVerifiedAt: r.email_verified_at ? String(r.email_verified_at) : null,
        solutionCount: Number(r.solution_count),
        publishedCount: Number(r.published_count),
        pendingCount: Number(r.pending_count),
        contactsSent: Number(r.contacts_sent),
        contactsReceived: Number(r.contacts_received),
        activeSessions: Number(r.active_sessions),
        isReviewer: Boolean(r.is_reviewer),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('[ops/users]', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 503 });
  }
}
