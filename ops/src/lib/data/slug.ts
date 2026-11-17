import { getDb } from '../db';
import { iso } from '../http';

// The listing's public address (db/solution-slugs.sql, SHCWS-101). Kept apart from
// solutionDetail so a base without the migration hides only this card.

export interface SlugState {
  /** Null until the first approval assigns one. */
  slug: string | null;
  /** Slugs the listing used before; each still redirects (301) to the current one. */
  previous: Array<{ slug: string; retiredAt: string | null }>;
}

export async function slugState(solutionId: string): Promise<SlugState> {
  const sql = getDb();
  const [current, history] = await sql.transaction(
    [
      sql`SELECT slug FROM founder_solutions WHERE id = ${solutionId}`,
      sql`
        SELECT slug, retired_at FROM solution_slug_history
        WHERE solution_id = ${solutionId} ORDER BY retired_at DESC, slug LIMIT 20`,
    ],
    { readOnly: true },
  );
  return {
    slug: current[0]?.slug ? String(current[0].slug) : null,
    previous: history.map(row => ({ slug: String(row.slug), retiredAt: iso(row.retired_at) })),
  };
}
