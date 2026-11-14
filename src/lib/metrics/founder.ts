import { solutionsSql } from '@/lib/solutions/server';
import { publicProducts } from '@/lib/solutions/public';
import { outcomeValues, type OutcomeValue } from '@/lib/contacts/model';

/**
 * The founder's metrics beyond visits and clicks (SHCWS-23, SHCWS-22). Everything here
 * is counted from rows that exist: nothing estimated, nothing about who did it. Signals
 * that shwcs does not record (search appearances and queries, comparisons, the industry
 * or size of whoever saved a listing) are left out rather than approximated.
 */

/** Fewer listings than this and a comparison would expose one competitor's numbers. */
export const peerThreshold = 3;

export type IntentTotals = {
  saves: number;
  saves30: number;
  publicLists: number;
  likes: number;
  likes30: number;
  reviews: number;
  reviews30: number;
  /** Average of the public reviews, null without any. */
  rating: number | null;
};
export type OutcomeTotals = {
  won: number;
  lost: number;
  notFit: number;
  /** Closed without an outcome recorded. */
  unrecorded: number;
  values: Record<OutcomeValue, number>;
};
export type MonthMetric = {
  month: string;
  views: number;
  clicks: number;
  requests: number;
  saves: number;
  likes: number;
  reviews: number;
  won: number;
};
export type CategoryPosition = {
  id: string;
  name: string;
  category: string;
  position: number;
  total: number;
};
export type PeerComparison = {
  id: string;
  name: string;
  category: string;
  views: number;
  /** Other owners' published listings in the same category. */
  peers: number;
  /** Median of their visits in the last 30 days; null below `peerThreshold`. */
  median: number | null;
};

/**
 * Saves, public lists, likes and public reviews across the founder's listings. Saves
 * use both identities a listing can have (solution:UUID and catalog:key); the founder's
 * own saves and lists never count as interest.
 */
export async function intentTotals(owner: string): Promise<IntentTotals> {
  const sql = solutionsSql();
  const [row] =
    await sql`WITH mine AS (SELECT id,catalog_key FROM founder_solutions WHERE owner_id=${owner}),
    keys AS (SELECT 'solution:'||id AS k FROM mine UNION SELECT 'catalog:'||catalog_key FROM mine WHERE catalog_key IS NOT NULL),
    saved AS (SELECT b.created_at FROM buyer_saved_projects b WHERE b.project_key IN (SELECT k FROM keys) AND b.owner_id<>${owner}),
    liked AS (SELECT x.created_at FROM solution_likes x JOIN mine m ON m.id=x.solution_id WHERE x.owner_id<>${owner}),
    reviewed AS (SELECT r.created_at,r.rating FROM solution_reviews r JOIN mine m ON m.id=r.solution_id
      JOIN auth_accounts a ON a.id=r.author_id WHERE r.status='published' AND a.email_verified_at IS NOT NULL)
    SELECT (SELECT count(*) FROM saved)::int AS saves,
      (SELECT count(*) FROM saved WHERE created_at>=current_date-29)::int AS saves30,
      (SELECT count(DISTINCT l.id) FROM buyer_list_items i JOIN buyer_lists l ON l.id=i.list_id AND l.owner_id=i.owner_id
        WHERE l.visibility='public' AND l.owner_id<>${owner} AND i.project_key IN (SELECT k FROM keys))::int AS public_lists,
      (SELECT count(*) FROM liked)::int AS likes,
      (SELECT count(*) FROM liked WHERE created_at>=current_date-29)::int AS likes30,
      (SELECT count(*) FROM reviewed)::int AS reviews,
      (SELECT count(*) FROM reviewed WHERE created_at>=current_date-29)::int AS reviews30,
      (SELECT avg(rating)::float FROM reviewed) AS rating`;
  return {
    saves: Number(row?.saves ?? 0),
    saves30: Number(row?.saves30 ?? 0),
    publicLists: Number(row?.public_lists ?? 0),
    likes: Number(row?.likes ?? 0),
    likes30: Number(row?.likes30 ?? 0),
    reviews: Number(row?.reviews ?? 0),
    reviews30: Number(row?.reviews30 ?? 0),
    rating: row?.rating == null ? null : Number(row.rating),
  };
}

/** What the founder recorded when closing opportunities (SHCWS-22). Their own data. */
export async function outcomeTotals(owner: string): Promise<OutcomeTotals> {
  const sql = solutionsSql();
  const rows = await sql`SELECT outcome,outcome_value,count(*)::int AS n FROM contact_requests
    WHERE recipient_id=${owner} AND status='closed' GROUP BY outcome,outcome_value`;
  const totals: OutcomeTotals = {
    won: 0,
    lost: 0,
    notFit: 0,
    unrecorded: 0,
    values: Object.fromEntries(outcomeValues.map(value => [value, 0])) as Record<
      OutcomeValue,
      number
    >,
  };
  for (const row of rows) {
    const n = Number(row.n);
    if (row.outcome === 'won') {
      totals.won += n;
      if (outcomeValues.includes(row.outcome_value))
        totals.values[row.outcome_value as OutcomeValue] += n;
    } else if (row.outcome === 'lost') totals.lost += n;
    else if (row.outcome === 'not_fit') totals.notFit += n;
    else totals.unrecorded += n;
  }
  return totals;
}

/** Twelve calendar months, oldest first, including the current one. */
export async function monthlyMetrics(owner: string): Promise<MonthMetric[]> {
  const sql = solutionsSql();
  const rows = await sql`WITH months AS (
      SELECT generate_series(date_trunc('month',current_date)-interval '11 months',date_trunc('month',current_date),interval '1 month')::date AS m),
    mine AS (SELECT id,catalog_key FROM founder_solutions WHERE owner_id=${owner}),
    keys AS (SELECT 'solution:'||id AS k FROM mine UNION SELECT 'catalog:'||catalog_key FROM mine WHERE catalog_key IS NOT NULL),
    activity AS (SELECT date_trunc('month',d.day)::date AS m,sum(d.views)::int AS views,sum(d.clicks)::int AS clicks
      FROM solution_daily_metrics d JOIN mine ON mine.id=d.solution_id
      WHERE d.day>=date_trunc('month',current_date)-interval '11 months' GROUP BY 1),
    requests AS (SELECT date_trunc('month',r.created_at)::date AS m,count(*)::int AS n
      FROM contact_requests r JOIN mine ON mine.id=r.solution_id
      WHERE r.created_at>=date_trunc('month',current_date)-interval '11 months' GROUP BY 1),
    -- Won deals in the month the founder recorded them, not when the request arrived.
    won AS (SELECT date_trunc('month',r.outcome_at)::date AS m,count(*)::int AS n
      FROM contact_requests r WHERE r.recipient_id=${owner} AND r.outcome='won'
        AND r.outcome_at>=date_trunc('month',current_date)-interval '11 months' GROUP BY 1),
    saves AS (SELECT date_trunc('month',b.created_at)::date AS m,count(*)::int AS n FROM buyer_saved_projects b
      WHERE b.project_key IN (SELECT k FROM keys) AND b.owner_id<>${owner}
        AND b.created_at>=date_trunc('month',current_date)-interval '11 months' GROUP BY 1),
    likes AS (SELECT date_trunc('month',x.created_at)::date AS m,count(*)::int AS n FROM solution_likes x JOIN mine ON mine.id=x.solution_id
      WHERE x.owner_id<>${owner} AND x.created_at>=date_trunc('month',current_date)-interval '11 months' GROUP BY 1),
    reviews AS (SELECT date_trunc('month',r.created_at)::date AS m,count(*)::int AS n FROM solution_reviews r JOIN mine ON mine.id=r.solution_id
      JOIN auth_accounts a ON a.id=r.author_id
      WHERE r.status='published' AND a.email_verified_at IS NOT NULL
        AND r.created_at>=date_trunc('month',current_date)-interval '11 months' GROUP BY 1)
    SELECT to_char(months.m,'YYYY-MM') AS month,COALESCE(a.views,0)::int AS views,COALESCE(a.clicks,0)::int AS clicks,
      COALESCE(q.n,0)::int AS requests,COALESCE(s.n,0)::int AS saves,COALESCE(l.n,0)::int AS likes,
      COALESCE(v.n,0)::int AS reviews,COALESCE(w.n,0)::int AS won
    FROM months LEFT JOIN activity a ON a.m=months.m LEFT JOIN requests q ON q.m=months.m
      LEFT JOIN saves s ON s.m=months.m LEFT JOIN likes l ON l.m=months.m LEFT JOIN reviews v ON v.m=months.m
      LEFT JOIN won w ON w.m=months.m
    ORDER BY months.m`;
  return rows.map(row => ({
    month: String(row.month),
    views: Number(row.views),
    clicks: Number(row.clicks),
    requests: Number(row.requests),
    saves: Number(row.saves),
    likes: Number(row.likes),
    reviews: Number(row.reviews),
    won: Number(row.won),
  }));
}

/**
 * Where each published listing sits in its categories under the catalog's default order
 * («Más populares», src/lib/solutions/ranking.ts). The same list the public pages read.
 */
export async function categoryPositions(owner: string): Promise<CategoryPosition[]> {
  const sql = solutionsSql();
  const owned =
    await sql`SELECT id::text FROM founder_solutions WHERE owner_id=${owner} AND published_data IS NOT NULL`;
  if (!owned.length) return [];
  const products = await publicProducts();
  return categoryPositionsFrom(
    products.map(product => ({
      id: product.detailUrl?.split('/').pop() ?? '',
      name: product.name,
      categories: product.categories,
    })),
    new Set(owned.map(row => String(row.id))),
  );
}

/** Pure part of `categoryPositions`: `ordered` is the catalog order, best first. */
export function categoryPositionsFrom(
  ordered: readonly { id: string; name: string; categories: readonly string[] }[],
  mine: ReadonlySet<string>,
): CategoryPosition[] {
  const result: CategoryPosition[] = [];
  for (const item of ordered) {
    if (!mine.has(item.id)) continue;
    for (const category of item.categories) {
      const inCategory = ordered.filter(other => other.categories.includes(category));
      result.push({
        id: item.id,
        name: item.name,
        category,
        position: inCategory.findIndex(other => other.id === item.id) + 1,
        total: inCategory.length,
      });
    }
  }
  return result;
}

/** A peer median is shown only when enough other listings make it anonymous. */
export function visibleMedian(peers: number, median: number | null) {
  return peers >= peerThreshold && median != null && Number.isFinite(median) ? median : null;
}

/**
 * Each published listing against other owners' listings in its first category: their
 * median visits in the last 30 days, only when there are at least `peerThreshold`.
 */
export async function peerComparisons(owner: string): Promise<PeerComparison[]> {
  const sql = solutionsSql();
  const rows =
    await sql`WITH views AS (SELECT solution_id,sum(views)::int AS n FROM solution_daily_metrics WHERE day>=current_date-29 GROUP BY 1),
    mine AS (SELECT s.id,s.published_data->>'name' AS name,
        COALESCE(s.published_data->'categories'->>0,s.published_data->>'category') AS category
      FROM founder_solutions s WHERE s.owner_id=${owner} AND s.published_data IS NOT NULL)
    SELECT m.id::text,m.name,m.category,COALESCE(own.n,0)::int AS views,count(o.id)::int AS peers,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY COALESCE(pv.n,0))::float AS median
    FROM mine m LEFT JOIN views own ON own.solution_id=m.id
    LEFT JOIN founder_solutions o ON o.published_data IS NOT NULL AND o.owner_id<>${owner}
      AND (o.published_data->'categories' ? m.category OR o.published_data->>'category'=m.category)
    LEFT JOIN views pv ON pv.solution_id=o.id
    WHERE m.category IS NOT NULL
    GROUP BY m.id,m.name,m.category,own.n ORDER BY m.name`;
  return rows.map(row => {
    const peers = Number(row.peers);
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      category: String(row.category),
      views: Number(row.views),
      peers,
      median: visibleMedian(peers, row.median == null ? null : Number(row.median)),
    };
  });
}

/** The few numbers Inicio shows a founder, with a link to the full page. */
export async function founderSummary(owner: string) {
  const sql = solutionsSql();
  const [row] = await sql`WITH mine AS (SELECT id FROM founder_solutions WHERE owner_id=${owner})
    SELECT (SELECT COALESCE(sum(views),0) FROM solution_daily_metrics d JOIN mine ON mine.id=d.solution_id WHERE d.day>=current_date-29)::int AS views,
      (SELECT count(*) FROM contact_requests r JOIN mine ON mine.id=r.solution_id WHERE r.created_at>=current_date-29)::int AS requests,
      (SELECT count(*) FROM contact_requests WHERE recipient_id=${owner} AND outcome='won')::int AS won,
      EXISTS(SELECT 1 FROM founder_solutions WHERE owner_id=${owner} AND published_data IS NOT NULL) AS published`;
  return {
    views: Number(row?.views ?? 0),
    requests: Number(row?.requests ?? 0),
    won: Number(row?.won ?? 0),
    published: Boolean(row?.published),
  };
}
