import { solutionsSql } from '@/lib/solutions/server';
import { solutionCategories } from '@/lib/solutions/model';
import {
  freeEmailDomains,
  freeEmailPattern,
  reviewInvitedFactor,
  reviewWeights,
} from '@/lib/reviews/model';
import {
  lastCompletedWeek,
  rankWeekly,
  recognitionHost,
  recognitionTimeZone,
  sortAwards,
  weeklyWeights,
  type Award,
  type Recognition,
} from './model';

type Row = Record<string, unknown>;
const day = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

function readAward(row: Row): Award {
  return {
    id: String(row.id),
    kind: row.kind === 'editorial' ? 'editorial' : 'weekly',
    scope: String(row.scope),
    rank: row.rank === null || row.rank === undefined ? null : Number(row.rank),
    periodStart: day(row.period_start),
    periodEnd: day(row.period_end),
    note: row.note ? String(row.note) : null,
  };
}

/**
 * What a listing has earned: the team's verification (only while its website is still on
 * the host that was checked) and its standing awards, most notable first. Revoked awards
 * never come back from here.
 */
export async function getRecognition(
  solutionId: string,
  website: string | undefined,
): Promise<Recognition> {
  const sql = solutionsSql();
  const [verification, awards] = await Promise.all([
    sql`SELECT host, verified_at FROM solution_verifications WHERE solution_id = ${solutionId}`,
    sql`SELECT id, kind, scope, rank, period_start, period_end, note FROM solution_awards
      WHERE solution_id = ${solutionId} AND revoked_at IS NULL
      ORDER BY period_start DESC LIMIT 24`,
  ]);
  const host = recognitionHost(website);
  const row = verification[0];
  return {
    verifiedAt:
      row && host && String(row.host) === host
        ? new Date(String(row.verified_at)).toISOString()
        : null,
    awards: sortAwards(awards.map(readAward)),
    movedAway: !!row && String(row.host) !== host,
  };
}

/**
 * Computes last week's «Top de la semana» once (docs/recognition.md). Runs from the daily
 * cron; every run after the first one for a week is a no-op, so the first result stands
 * even if later data (an account verifying its email, say) would change it.
 */
export async function runWeeklyRecognition(now = new Date()) {
  const sql = solutionsSql();
  const { start, end } = lastCompletedWeek(now);
  const [done] = await sql`SELECT 1 FROM solution_award_runs WHERE period_start = ${start}`;
  if (done) return { period: start, status: 'already-computed' as const, awarded: 0 };

  // One row per published solution with activity in the week. Only verified accounts
  // other than the owner count, the same rule as the catalogue order.
  const rows = await sql`WITH bounds AS (
      SELECT (${start}::date)::timestamp AT TIME ZONE ${recognitionTimeZone} AS from_at,
             (${start}::date + 7)::timestamp AT TIME ZONE ${recognitionTimeZone} AS to_at),
    live AS (
      SELECT s.id, s.owner_id, s.catalog_key, s.published_at,
        COALESCE(s.published_data->'categories', jsonb_build_array(s.published_data->>'category')) AS categories
      FROM founder_solutions s, bounds b
      WHERE s.published_data IS NOT NULL AND s.published_at < b.to_at),
    events AS (
      SELECT l.solution_id, l.owner_id AS actor, ${weeklyWeights.like}::float AS points
        FROM solution_likes l, bounds b WHERE l.created_at >= b.from_at AND l.created_at < b.to_at
      UNION ALL
      SELECT c.solution_id, c.author_id, ${weeklyWeights.comment}::float
        FROM solution_comments c, bounds b WHERE c.hidden_at IS NULL AND c.created_at >= b.from_at AND c.created_at < b.to_at
      UNION ALL
      SELECT s.id, p.owner_id, ${weeklyWeights.save}::float
        FROM live s JOIN buyer_saved_projects p
          ON p.project_key = 'solution:' || s.id::text
          OR (s.catalog_key IS NOT NULL AND p.project_key = 'catalog:' || s.catalog_key), bounds b
        WHERE p.created_at >= b.from_at AND p.created_at < b.to_at
      UNION ALL
      SELECT r.solution_id, r.author_id, r.rating * CASE
          WHEN EXISTS (SELECT 1 FROM solution_review_proofs x WHERE x.review_id = r.id) THEN ${reviewWeights.customer}::float
          WHEN review_contact_backed(r.author_id, r.solution_id) THEN ${reviewWeights.contact}::float
          WHEN split_part(a.email, '@', 2) <> ALL(${freeEmailDomains as readonly string[]}::text[])
            AND split_part(a.email, '@', 2) !~ ${freeEmailPattern} THEN ${reviewWeights.work}::float
          ELSE ${reviewWeights.email}::float END
          -- Invited through the founder's link: half, as in the catalogue (SHCWS-132).
          * CASE WHEN review_invited(r.author_id, r.solution_id) THEN ${reviewInvitedFactor}::float ELSE 1 END
        FROM solution_reviews r JOIN auth_accounts a ON a.id = r.author_id, bounds b
        WHERE r.status = 'published' AND r.created_at >= b.from_at AND r.created_at < b.to_at)
    SELECT e.solution_id, sum(e.points)::float AS score, count(DISTINCT e.actor)::int AS accounts,
      l.published_at, l.categories
    FROM events e JOIN live l ON l.id = e.solution_id JOIN auth_accounts a ON a.id = e.actor
    WHERE a.email_verified_at IS NOT NULL AND e.actor <> l.owner_id
    GROUP BY e.solution_id, l.published_at, l.categories`;

  const { competitors, places } = rankWeekly(
    rows.map(row => ({
      solutionId: String(row.solution_id),
      categories: Array.isArray(row.categories) ? row.categories.map(String) : [],
      score: Number(row.score),
      accounts: Number(row.accounts),
      publishedAt: new Date(String(row.published_at)).toISOString(),
    })),
    solutionCategories,
  );
  await sql.transaction([
    ...places.map(
      place => sql`INSERT INTO solution_awards (solution_id, kind, scope, rank, period_start, period_end, score)
        VALUES (${place.solutionId}, 'weekly', ${place.scope}, ${place.rank}, ${start}, ${end}, ${place.score})
        ON CONFLICT DO NOTHING`,
    ),
    sql`INSERT INTO solution_award_runs (period_start, competitors, awarded)
      VALUES (${start}, ${competitors}, ${places.length}) ON CONFLICT (period_start) DO NOTHING`,
  ]);
  return { period: start, status: 'computed' as const, awarded: places.length };
}
