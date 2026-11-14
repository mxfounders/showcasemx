import { solutionsSql } from '@/lib/solutions/server';

export type PublicQuestion = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  answer: { body: string; at: string } | null;
  mine: boolean;
  /** Only on the viewer's own question after ops hid it: why, as ops wrote it. */
  hiddenReason?: string;
};

/**
 * Questions shown on a listing: the visible ones from verified accounts, plus the
 * viewer's own whatever its state. Answered first, then newest. Who asked never leaves
 * the server beyond the alias they chose.
 */
export async function getSolutionQuestions(
  solutionId: string,
  viewer = '',
): Promise<PublicQuestion[]> {
  const viewerId = viewer || null;
  const rows =
    await solutionsSql()`SELECT q.id,q.author_name,q.body,q.created_at,q.answer,q.answered_at,
      q.hidden_reason,q.author_id=${viewerId}::uuid AS mine
    FROM solution_questions q JOIN auth_accounts a ON a.id=q.author_id
    WHERE q.solution_id=${solutionId}
      AND ((q.hidden_at IS NULL AND a.email_verified_at IS NOT NULL) OR q.author_id=${viewerId}::uuid)
    ORDER BY (q.answer IS NOT NULL) DESC,q.created_at DESC,q.id LIMIT 100`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.author_name),
    body: String(row.body),
    createdAt: new Date(row.created_at).toISOString(),
    answer: row.answer
      ? { body: String(row.answer), at: new Date(row.answered_at).toISOString() }
      : null,
    mine: Boolean(row.mine),
    ...(row.mine && row.hidden_reason ? { hiddenReason: String(row.hidden_reason) } : {}),
  }));
}
