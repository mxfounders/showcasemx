import { getDb } from '../db';
import { iso, likePattern } from '../http';
import { reviewLevel, type ReviewLevel } from '../reviews';

export interface ReviewSignal {
  level: ReviewLevel;
  /** Written through the founder's own invitation link (weighs half in the ranking). */
  invited: boolean;
}

/**
 * Level and «invited» mark of some reviews, computed the way the product does when
 * reading (review_contact_backed, review_invited and solution_review_proofs). Empty when
 * this database lacks db/review-invitations.sql or db/compliance.sql: the page then
 * shows no level instead of a wrong one.
 */
export async function reviewSignals(ids: string[]): Promise<Map<string, ReviewSignal>> {
  const map = new Map<string, ReviewSignal>();
  if (!ids.length) return map;
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT r.id, a.email, (a.email_verified_at IS NOT NULL) AS verified,
        EXISTS (SELECT 1 FROM solution_review_proofs p WHERE p.review_id = r.id) AS proven,
        review_contact_backed(r.author_id, r.solution_id) AS contacted,
        review_invited(r.author_id, r.solution_id) AS invited
      FROM solution_reviews r JOIN auth_accounts a ON a.id = r.author_id
      WHERE r.id = ANY(${ids}::uuid[])
    `;
    for (const row of rows)
      map.set(String(row.id), {
        level: reviewLevel(
          row.email ? String(row.email) : null,
          Boolean(row.verified),
          Boolean(row.proven),
          Boolean(row.contacted),
        ),
        invited: Boolean(row.invited),
      });
  } catch (err) {
    const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : '';
    if (code !== '42883' && code !== '42P01') throw err;
  }
  return map;
}

export const REVIEW_FILTERS = ['all', 'published', 'hidden', 'unverified'] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

/**
 * Every review of a solution, for moderation without a prior report (SHCWS-142).
 * Reviews are public content; an unverified author's review is only visible to its
 * author, which `public` says. Returns null when db/solution-reviews.sql is missing.
 */
export async function reviewsOverview(filter: ReviewFilter, q = '', page = 1, pageSize = 30) {
  const sql = getDb();
  const like = likePattern(q);
  try {
    const rows = await sql`
      SELECT r.id, r.solution_id, COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name,
        r.author_name, a.id AS author_id, a.email AS author_email,
        (a.email_verified_at IS NOT NULL) AS author_verified, r.rating, r.recommends, r.headline,
        r.use_case, r.pros, r.cons, r.status, r.hidden_reason, r.reply, r.created_at, r.updated_at,
        (SELECT count(*)::int FROM solution_review_reports x WHERE x.review_id = r.id AND x.status = 'open') AS open_reports,
        count(*) OVER () AS total
      FROM solution_reviews r
      JOIN founder_solutions s ON s.id = r.solution_id
      JOIN auth_accounts a ON a.id = r.author_id
      WHERE CASE ${filter}
          WHEN 'published' THEN r.status = 'published' AND a.email_verified_at IS NOT NULL
          WHEN 'hidden' THEN r.status = 'hidden'
          WHEN 'unverified' THEN r.status = 'published' AND a.email_verified_at IS NULL
          ELSE true END
        AND (${like}::text IS NULL OR lower(r.headline) LIKE ${like} OR lower(r.author_name) LIKE ${like}
          OR lower(a.email) LIKE ${like} OR lower(r.pros) LIKE ${like} OR lower(r.cons) LIKE ${like}
          OR lower(COALESCE(s.published_data->>'name', s.data->>'name', '')) LIKE ${like})
      ORDER BY r.created_at DESC, r.id
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `;
    const shown = rows.slice(0, pageSize);
    const signals = await reviewSignals(shown.map(r => String(r.id)));
    return {
      page,
      pageSize,
      hasMore: rows.length > pageSize,
      total: rows.length ? Number(rows[0].total) : 0,
      items: shown.map(r => ({
        signal: signals.get(String(r.id)) ?? null,
        id: String(r.id),
        solutionId: String(r.solution_id),
        solutionName: r.solution_name ? String(r.solution_name) : '(sin nombre)',
        authorName: String(r.author_name),
        authorId: String(r.author_id),
        authorEmail: String(r.author_email),
        authorVerified: Boolean(r.author_verified),
        rating: Number(r.rating),
        recommends: Boolean(r.recommends),
        headline: String(r.headline),
        useCase: String(r.use_case),
        pros: String(r.pros),
        cons: String(r.cons),
        hidden: r.status === 'hidden',
        hiddenReason: r.hidden_reason ? String(r.hidden_reason) : null,
        reply: r.reply ? String(r.reply) : null,
        createdAt: iso(r.created_at),
        updatedAt: iso(r.updated_at),
        openReports: Number(r.open_reports),
      })),
    };
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01')
      return null;
    throw err;
  }
}
