import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;
const VALID_STATUSES = ['draft', 'pending', 'changes_requested', 'published', 'rejected', 'all'];

export async function GET(req: NextRequest) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200);
  const catalogKey = url.searchParams.get('catalogKey');

  if (!VALID_STATUSES.includes(status)) return failure('Estado inválido.', 400);

  try {
    const sql = getDb();
    const offset = (page - 1) * PAGE_SIZE;
    const qLike = q ? '%' + q.toLowerCase() + '%' : null;
    const catalogFilter = catalogKey === 'cord' || catalogKey === 'flouvia' ? catalogKey : null;

    const rows = await sql`
      SELECT
        fs.id, fs.status, fs.version, fs.updated_at, fs.created_at, fs.catalog_key,
        fs.data->>'name' AS solution_name,
        fs.data->>'category' AS category,
        a.email AS owner_email, a.id AS owner_id,
        (fs.published_data IS NOT NULL) AS has_published,
        (SELECT count(*) FROM solution_events se WHERE se.solution_id = fs.id) AS event_count
      FROM founder_solutions fs
      JOIN auth_accounts a ON a.id = fs.owner_id
      WHERE (${status}::text = 'all' OR fs.status = ${status})
        AND (${qLike}::text IS NULL OR lower(fs.data->>'name') LIKE ${qLike} OR lower(a.email) LIKE ${qLike})
        AND (${catalogFilter}::text IS NULL OR fs.catalog_key = ${catalogFilter})
      ORDER BY fs.updated_at DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
    `;

    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map(r => ({
      id: String(r.id), status: String(r.status), version: Number(r.version),
      updatedAt: String(r.updated_at), createdAt: String(r.created_at),
      solutionName: r.solution_name ?? '(sin nombre)', category: r.category ?? '',
      catalogKey: r.catalog_key ?? null,
      ownerEmail: String(r.owner_email), ownerId: String(r.owner_id),
      hasPublished: Boolean(r.has_published), eventCount: Number(r.event_count),
    }));

    const counts = await sql`SELECT status, count(*)::int AS n FROM founder_solutions GROUP BY status`;
    const statusCounts = Object.fromEntries(counts.map(r => [String(r.status), Number(r.n)]));

    return NextResponse.json({ ok: true, items, hasMore, page, statusCounts }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[ops/solutions]', err);
    return failure('Error al cargar postulaciones.', 503);
  }
}
