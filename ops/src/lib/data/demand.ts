import { getDb } from '../db';

/**
 * Search demand (SHCWS-107), from the product's aggregate table search_demand: what
 * people looked for, what found nothing and what ended in a click on a listing. No
 * person behind any row. A database without the table yet shows an empty board.
 */
export interface DemandRow {
  query: string;
  searches: number;
  empty: number;
  clicks: number;
}
export interface DemandWeek {
  week: string;
  searches: number;
  empty: number;
  clicks: number;
}

export async function searchDemand() {
  const sql = getDb();
  const [table] = await sql`SELECT to_regclass('search_demand') IS NOT NULL AS ok`;
  if (!table?.ok) return { available: false as const };
  const [unmet, top, weeks, totals] = await sql.transaction(
    [
      sql`SELECT query, sum(searches)::int AS searches, sum(empty)::int AS empty, sum(clicks)::int AS clicks
        FROM search_demand WHERE day > current_date - 7
        GROUP BY query HAVING sum(empty) > 0 ORDER BY sum(empty) DESC, query LIMIT 20`,
      sql`SELECT query, sum(searches)::int AS searches, sum(empty)::int AS empty, sum(clicks)::int AS clicks
        FROM search_demand WHERE day > current_date - 7
        GROUP BY query ORDER BY sum(searches) DESC, query LIMIT 20`,
      sql`SELECT to_char(date_trunc('week', day), 'YYYY-MM-DD') AS week, sum(searches)::int AS searches,
          sum(empty)::int AS empty, sum(clicks)::int AS clicks
        FROM search_demand WHERE day >= date_trunc('week', current_date) - interval '7 weeks'
        GROUP BY 1 ORDER BY 1`,
      sql`SELECT COALESCE(sum(searches), 0)::int AS searches, COALESCE(sum(empty), 0)::int AS empty,
          COALESCE(sum(clicks), 0)::int AS clicks, count(DISTINCT query)::int AS queries
        FROM search_demand WHERE day > current_date - 7`,
    ],
    { readOnly: true },
  );
  const rows = (list: Record<string, unknown>[]): DemandRow[] =>
    list.map(row => ({
      query: String(row.query),
      searches: Number(row.searches),
      empty: Number(row.empty),
      clicks: Number(row.clicks),
    }));
  return {
    available: true as const,
    unmet: rows(unmet),
    top: rows(top),
    weeks: weeks.map(row => ({
      week: String(row.week),
      searches: Number(row.searches),
      empty: Number(row.empty),
      clicks: Number(row.clicks),
    })) as DemandWeek[],
    totals: {
      searches: Number(totals[0]?.searches ?? 0),
      empty: Number(totals[0]?.empty ?? 0),
      clicks: Number(totals[0]?.clicks ?? 0),
      queries: Number(totals[0]?.queries ?? 0),
    },
  };
}
