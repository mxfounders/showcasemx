import { safeSolutionUrl } from './model';
import { solutionsSql } from './server';
import { updatesPerWeek, type SolutionUpdate, type SolutionUpdateKind } from './updates-model';

export * from './updates-model';

/**
 * Dated updates on a published listing and following it (SHCWS-24, db/solution-updates.sql).
 * An update goes out without a full editorial review; ops can hide it afterwards. Buyers
 * who follow the listing get it in their weekly «what you follow» notice. Nobody but the
 * founder sees how many follow a listing, and never who.
 */
function toUpdate(row: Record<string, unknown>, withReason = false): SolutionUpdate {
  return {
    id: String(row.id),
    kind: row.kind as SolutionUpdateKind,
    body: String(row.body),
    // Read back through the same check as on the way in: only http(s), never credentials.
    link: safeSolutionUrl(typeof row.link === 'string' ? row.link : undefined),
    createdAt: new Date(String(row.created_at)).toISOString(),
    ...(withReason && row.hidden_at
      ? { hiddenReason: String(row.hidden_reason ?? '').trim() || '—' }
      : {}),
  };
}

/** The public side of a published listing: its visible updates and the viewer's follow. */
export async function getSolutionUpdates(
  solutionId: string,
  viewer = '',
): Promise<{ updates: SolutionUpdate[]; following: boolean }> {
  const sql = solutionsSql();
  const [rows, [state]] = await Promise.all([
    sql`SELECT u.id, u.kind, u.body, u.link, u.created_at FROM solution_updates u
      JOIN founder_solutions s ON s.id = u.solution_id AND s.published_data IS NOT NULL
      WHERE u.solution_id = ${solutionId} AND u.hidden_at IS NULL AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC, u.id LIMIT 6`,
    sql`SELECT EXISTS(SELECT 1 FROM solution_follows WHERE solution_id = ${solutionId}
      AND follower_id = ${viewer || null}::uuid) AS following`,
  ]);
  return { updates: rows.map(row => toUpdate(row)), following: !!state?.following };
}

/** The founder's side: every update (hidden ones with their reason) and the follower count. */
export async function getOwnerUpdates(solutionId: string, owner: string) {
  const sql = solutionsSql();
  const [rows, [week], [count]] = await Promise.all([
    sql`SELECT u.id, u.kind, u.body, u.link, u.created_at, u.hidden_at, u.hidden_reason
      FROM solution_updates u JOIN founder_solutions s ON s.id = u.solution_id
      WHERE u.solution_id = ${solutionId} AND s.owner_id = ${owner} AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC, u.id LIMIT 30`,
    sql`SELECT count(*)::int AS n FROM solution_updates u JOIN founder_solutions s ON s.id = u.solution_id
      WHERE u.solution_id = ${solutionId} AND s.owner_id = ${owner}
        AND u.created_at > now() - interval '7 days'`,
    sql`SELECT count(*)::int AS followers FROM solution_follows f
      JOIN founder_solutions s ON s.id = f.solution_id
      WHERE f.solution_id = ${solutionId} AND s.owner_id = ${owner}`,
  ]);
  return {
    updates: rows.map(row => toUpdate(row, true)),
    followers: Number(count?.followers ?? 0),
    /** How many more in these seven days; hidden and deleted ones count too. */
    remaining: Math.max(0, updatesPerWeek - Number(week?.n ?? 0)),
  };
}

export type FollowedSolution = {
  id: string;
  name: string;
  /** False when the listing was withdrawn after it was followed: it can still be unfollowed. */
  published: boolean;
  latest: SolutionUpdate | null;
};

/** What the account follows, for /account/community. Withdrawn listings keep only their name. */
export async function followedSolutions(follower: string): Promise<FollowedSolution[]> {
  const sql = solutionsSql();
  const rows = await sql`SELECT s.id::text AS id,
      COALESCE(s.published_data->>'name', s.data->>'name') AS name,
      s.published_data IS NOT NULL AS published,
      u.id AS update_id, u.kind, u.body, u.link, u.created_at
    FROM solution_follows f
    JOIN founder_solutions s ON s.id = f.solution_id
    LEFT JOIN LATERAL (
      SELECT * FROM solution_updates x
      WHERE x.solution_id = s.id AND x.hidden_at IS NULL AND x.deleted_at IS NULL
        AND s.published_data IS NOT NULL
      ORDER BY x.created_at DESC, x.id LIMIT 1
    ) u ON true
    WHERE f.follower_id = ${follower}
    ORDER BY COALESCE(u.created_at, f.created_at) DESC LIMIT 50`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    published: !!row.published,
    latest: row.update_id ? toUpdate({ ...row, id: row.update_id }) : null,
  }));
}
