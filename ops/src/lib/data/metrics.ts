import { getDb } from '../db';

export const METRIC_RANGES = ['7', '30', '90'] as const;
export type MetricRange = (typeof METRIC_RANGES)[number];

export async function platformMetrics(range: MetricRange) {
  const sql = getDb();
  const days = Number(range);
  const [series, projects, funnel] = await sql.transaction(
    [
      sql`
        WITH days AS (SELECT generate_series(current_date - ${days - 1}::int, current_date, interval '1 day')::date AS day),
        m AS (SELECT day, sum(views)::int AS views, sum(clicks)::int AS clicks FROM solution_daily_metrics
              WHERE day >= current_date - ${days - 1}::int GROUP BY day),
        r AS (SELECT created_at::date AS day, count(*)::int AS n FROM contact_requests
              WHERE created_at >= current_date - ${days - 1}::int GROUP BY 1),
        s AS (SELECT created_at::date AS day, count(*)::int AS n FROM auth_accounts
              WHERE created_at >= current_date - ${days - 1}::int GROUP BY 1),
        l AS (SELECT created_at::date AS day, count(*)::int AS n FROM solution_likes
              WHERE created_at >= current_date - ${days - 1}::int GROUP BY 1),
        sv AS (SELECT created_at::date AS day, count(*)::int AS n FROM buyer_saved_projects
              WHERE created_at >= current_date - ${days - 1}::int GROUP BY 1)
        SELECT d.day::text AS day, COALESCE(m.views, 0) AS views, COALESCE(m.clicks, 0) AS clicks,
          COALESCE(r.n, 0) AS requests, COALESCE(s.n, 0) AS signups, COALESCE(l.n, 0) AS likes, COALESCE(sv.n, 0) AS saves
        FROM days d LEFT JOIN m ON m.day = d.day LEFT JOIN r ON r.day = d.day LEFT JOIN s ON s.day = d.day
          LEFT JOIN l ON l.day = d.day LEFT JOIN sv ON sv.day = d.day
        ORDER BY d.day
      `,
      sql`
        SELECT s.id, COALESCE(s.published_data->>'name', s.data->>'name') AS name, s.catalog_key,
          COALESCE((SELECT sum(views) FROM solution_daily_metrics m WHERE m.solution_id = s.id AND m.day >= current_date - ${days - 1}::int), 0)::int AS views,
          COALESCE((SELECT sum(clicks) FROM solution_daily_metrics m WHERE m.solution_id = s.id AND m.day >= current_date - ${days - 1}::int), 0)::int AS clicks,
          (SELECT count(*)::int FROM contact_requests r WHERE r.solution_id = s.id AND r.created_at >= current_date - ${days - 1}::int) AS requests,
          (SELECT count(*)::int FROM solution_likes l WHERE l.solution_id = s.id) AS likes,
          (SELECT count(*)::int FROM solution_comments c WHERE c.solution_id = s.id) AS comments,
          (SELECT count(*)::int FROM buyer_saved_projects sp
            WHERE sp.project_key = 'solution:' || s.id::text OR (s.catalog_key IS NOT NULL AND sp.project_key = 'catalog:' || s.catalog_key)) AS saves
        FROM founder_solutions s
        WHERE s.published_data IS NOT NULL
        ORDER BY views DESC, requests DESC
        LIMIT 50
      `,
      sql`
        SELECT
          COALESCE((SELECT sum(views) FROM solution_daily_metrics WHERE day >= current_date - ${days - 1}::int), 0)::int AS views,
          COALESCE((SELECT sum(clicks) FROM solution_daily_metrics WHERE day >= current_date - ${days - 1}::int), 0)::int AS clicks,
          (SELECT count(*)::int FROM contact_requests WHERE created_at >= current_date - ${days - 1}::int) AS requests,
          (SELECT count(*)::int FROM contact_requests WHERE created_at >= current_date - ${days - 1}::int AND status IN ('conversation', 'closed')) AS answered
      `,
    ],
    { readOnly: true },
  );
  const f = funnel[0] ?? {};
  return {
    range,
    series: series.map(r => ({
      day: String(r.day),
      views: Number(r.views),
      clicks: Number(r.clicks),
      requests: Number(r.requests),
      signups: Number(r.signups),
      likes: Number(r.likes),
      saves: Number(r.saves),
    })),
    projects: projects.map(r => ({
      id: String(r.id),
      name: r.name ? String(r.name) : '(sin nombre)',
      catalogKey: r.catalog_key ? String(r.catalog_key) : null,
      views: Number(r.views),
      clicks: Number(r.clicks),
      requests: Number(r.requests),
      likes: Number(r.likes),
      comments: Number(r.comments),
      saves: Number(r.saves),
    })),
    funnel: {
      views: Number(f.views ?? 0),
      clicks: Number(f.clicks ?? 0),
      requests: Number(f.requests ?? 0),
      answered: Number(f.answered ?? 0),
    },
  };
}
