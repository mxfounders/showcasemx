import { NextResponse } from 'next/server';
import { requireOpsApi } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  try {
    const sql = getDb();
    const [projectRows, dailyRows] = await sql.transaction([
      sql`
        SELECT s.id, COALESCE(s.published_data->>'name', s.data->>'name') AS name,
          COALESCE(sum(m.views), 0)::int AS views, COALESCE(sum(m.clicks), 0)::int AS clicks,
          (SELECT count(*)::int FROM contact_requests r WHERE r.solution_id = s.id) AS requests
        FROM founder_solutions s
        LEFT JOIN solution_daily_metrics m ON m.solution_id = s.id AND m.day >= current_date - 29
        WHERE s.published_data IS NOT NULL
        GROUP BY s.id
        ORDER BY views DESC
        LIMIT 100
      `,
      sql`
        WITH dates AS (SELECT generate_series(current_date - 29, current_date, interval '1 day')::date AS day),
        activity AS (
          SELECT m.day, sum(m.views)::int AS views, sum(m.clicks)::int AS clicks
          FROM solution_daily_metrics m WHERE m.day >= current_date - 29 GROUP BY m.day
        ),
        requests AS (
          SELECT r.created_at::date AS day, count(*)::int AS requests
          FROM contact_requests r WHERE r.created_at >= current_date - 29 GROUP BY r.created_at::date
        )
        SELECT d.day::text, COALESCE(a.views, 0)::int AS views, COALESCE(a.clicks, 0)::int AS clicks,
          COALESCE(r.requests, 0)::int AS requests
        FROM dates d LEFT JOIN activity a ON a.day = d.day LEFT JOIN requests r ON r.day = d.day
        ORDER BY d.day
      `,
    ]);

    return NextResponse.json({
      ok: true,
      projects: projectRows.map(r => ({
        id: String(r.id), name: r.name ?? '(sin nombre)',
        views: Number(r.views), clicks: Number(r.clicks), requests: Number(r.requests),
      })),
      days: dailyRows.map(r => ({
        day: String(r.day), views: Number(r.views), clicks: Number(r.clicks), requests: Number(r.requests),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/metrics]', err);
    return failure('Error interno.', 503);
  }
}
