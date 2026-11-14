import { getDb } from '../db';
import { iso } from '../http';

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

/**
 * Saved-search alerts by topic (SHCWS-175), from the product's search_alerts
 * (db/search-alerts.sql, SHCWS-47): what buyers asked to hear about, to know which
 * founders to invite. Counts only. A topic is where the alert was made (search,
 * category, industry or collection), its slug and its readable label, which already
 * carries the words and filters. No owner_id, email or any other column that says who
 * created an alert leaves this query; suspended accounts are left out of the counts.
 * «Coincidencias» are distinct listings announced to the topic's alerts in the last 30
 * days, never the baseline seen when an alert was created.
 */
export const ALERT_TOPIC_SORTS = ['alerts', 'accounts', 'matches', 'last'] as const;
export type AlertTopicSort = (typeof ALERT_TOPIC_SORTS)[number];

export interface AlertTopicRow {
  scope: 'search' | 'explorar' | 'industria' | 'colecciones';
  topic: string | null;
  label: string;
  alerts: number;
  accounts: number;
  matches30d: number;
  lastMatchAt: string | null;
}

export async function alertTopics(sort: AlertTopicSort = 'alerts', dir: 'asc' | 'desc' = 'desc') {
  const sql = getDb();
  const [table] = await sql`SELECT to_regclass('search_alerts') IS NOT NULL AS ok`;
  if (!table?.ok) return { available: false as const };
  const [rows, totals] = await sql.transaction(
    [
      sql`
        WITH active AS (
          SELECT sa.id, sa.scope, sa.topic, sa.label, sa.owner_id, sa.last_matched_at
          FROM search_alerts sa JOIN auth_accounts a ON a.id = sa.owner_id AND a.suspended_at IS NULL
        ), recent AS (
          SELECT m.alert_id, m.solution_id FROM search_alert_matches m
          WHERE NOT m.baseline AND m.matched_at > now() - interval '30 days'
        ), topics AS (
          SELECT ac.scope, ac.topic, ac.label,
            count(DISTINCT ac.id)::int AS alerts,
            count(DISTINCT ac.owner_id)::int AS accounts,
            count(DISTINCT r.solution_id)::int AS matches_30d,
            max(ac.last_matched_at) AS last_match
          FROM active ac LEFT JOIN recent r ON r.alert_id = ac.id
          GROUP BY ac.scope, ac.topic, ac.label
        )
        SELECT scope, topic, label, alerts, accounts, matches_30d, last_match FROM topics
        ORDER BY
          CASE WHEN ${sort} = 'alerts' AND ${dir} = 'asc' THEN alerts END ASC,
          CASE WHEN ${sort} = 'alerts' AND ${dir} = 'desc' THEN alerts END DESC,
          CASE WHEN ${sort} = 'accounts' AND ${dir} = 'asc' THEN accounts END ASC,
          CASE WHEN ${sort} = 'accounts' AND ${dir} = 'desc' THEN accounts END DESC,
          CASE WHEN ${sort} = 'matches' AND ${dir} = 'asc' THEN matches_30d END ASC,
          CASE WHEN ${sort} = 'matches' AND ${dir} = 'desc' THEN matches_30d END DESC,
          CASE WHEN ${sort} = 'last' AND ${dir} = 'asc' THEN last_match END ASC NULLS FIRST,
          CASE WHEN ${sort} = 'last' AND ${dir} = 'desc' THEN last_match END DESC NULLS LAST,
          alerts DESC, label
        LIMIT 100
      `,
      sql`
        WITH active AS (
          SELECT sa.id, sa.scope, sa.topic, sa.label, sa.owner_id
          FROM search_alerts sa JOIN auth_accounts a ON a.id = sa.owner_id AND a.suspended_at IS NULL
        ), served AS (
          SELECT DISTINCT ac.scope, ac.topic, ac.label FROM active ac
          JOIN search_alert_matches m ON m.alert_id = ac.id
          WHERE NOT m.baseline AND m.matched_at > now() - interval '30 days'
        )
        SELECT (SELECT count(*)::int FROM active) AS alerts,
          (SELECT count(DISTINCT owner_id)::int FROM active) AS accounts,
          (SELECT count(*)::int FROM (SELECT DISTINCT scope, topic, label FROM active) t) AS topics,
          (SELECT count(*)::int FROM served) AS served
      `,
    ],
    { readOnly: true },
  );
  return {
    available: true as const,
    rows: rows.map((row): AlertTopicRow => ({
      scope: String(row.scope) as AlertTopicRow['scope'],
      topic: row.topic ? String(row.topic) : null,
      label: String(row.label),
      alerts: Number(row.alerts),
      accounts: Number(row.accounts),
      matches30d: Number(row.matches_30d),
      lastMatchAt: iso(row.last_match),
    })),
    totals: {
      alerts: Number(totals[0]?.alerts ?? 0),
      accounts: Number(totals[0]?.accounts ?? 0),
      topics: Number(totals[0]?.topics ?? 0),
      unserved: Number(totals[0]?.topics ?? 0) - Number(totals[0]?.served ?? 0),
    },
  };
}
