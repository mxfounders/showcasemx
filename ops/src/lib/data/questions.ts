import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const QUESTION_FILTERS = ['all', 'visible', 'hidden', 'unanswered'] as const;
export type QuestionFilter = (typeof QUESTION_FILTERS)[number];

/**
 * Every public question on a listing, for moderation without a prior report (SHCWS-57).
 * Questions and answers are public content. Returns null when db/solution-questions.sql
 * is missing in this database.
 */
export async function questionsOverview(filter: QuestionFilter, q = '', page = 1, pageSize = 30) {
  const sql = getDb();
  const like = likePattern(q);
  try {
    const rows = await sql`
      SELECT x.id, x.solution_id, COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name,
        x.author_name, a.id AS author_id, a.email AS author_email, x.body, x.answer, x.answered_at,
        x.hidden_at, x.hidden_reason, x.created_at,
        (SELECT count(*)::int FROM solution_question_reports r
          WHERE r.question_id = x.id AND r.status = 'open') AS open_reports,
        count(*) OVER () AS total
      FROM solution_questions x
      JOIN founder_solutions s ON s.id = x.solution_id
      JOIN auth_accounts a ON a.id = x.author_id
      WHERE CASE ${filter}
          WHEN 'visible' THEN x.hidden_at IS NULL
          WHEN 'hidden' THEN x.hidden_at IS NOT NULL
          WHEN 'unanswered' THEN x.hidden_at IS NULL AND x.answer IS NULL
          ELSE true END
        AND (${like}::text IS NULL OR lower(x.body) LIKE ${like} OR lower(x.author_name) LIKE ${like}
          OR lower(a.email) LIKE ${like} OR lower(COALESCE(x.answer, '')) LIKE ${like}
          OR lower(COALESCE(s.published_data->>'name', s.data->>'name', '')) LIKE ${like})
      ORDER BY x.created_at DESC, x.id
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `;
    return {
      page,
      pageSize,
      hasMore: rows.length > pageSize,
      total: rows.length ? Number(rows[0].total) : 0,
      items: rows.slice(0, pageSize).map(r => ({
        id: String(r.id),
        solutionId: String(r.solution_id),
        solutionName: r.solution_name ? String(r.solution_name) : '(sin nombre)',
        authorName: String(r.author_name),
        authorId: String(r.author_id),
        authorEmail: String(r.author_email),
        body: String(r.body),
        answer: r.answer ? String(r.answer) : null,
        answeredAt: iso(r.answered_at),
        hidden: r.hidden_at !== null && r.hidden_at !== undefined,
        hiddenReason: r.hidden_reason ? String(r.hidden_reason) : null,
        createdAt: iso(r.created_at),
        openReports: Number(r.open_reports),
      })),
    };
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01')
      return null;
    throw err;
  }
}
