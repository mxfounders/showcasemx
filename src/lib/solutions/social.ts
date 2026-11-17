import { solutionsSql } from './server';
export type SolutionComment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  mine: boolean;
  /**
   * Set only on the viewer's own comment after ops hid it (SHCWS-140): its author keeps
   * reading it, with the reason; nobody else receives hidden comments at all.
   */
  hiddenReason?: string;
};
export async function getSolutionSocial(
  id: string,
  viewer = '',
): Promise<{ likes: number; liked: boolean; commentsCount: number }> {
  const sql = solutionsSql();
  const [row] = await sql`SELECT
 (SELECT count(*)::int FROM solution_likes x WHERE x.solution_id=${id}) likes,
 EXISTS(SELECT 1 FROM solution_likes x WHERE x.solution_id=${id} AND x.owner_id=${viewer || null}::uuid) liked,
 (SELECT count(*)::int FROM solution_comments x WHERE x.solution_id=${id} AND x.hidden_at IS NULL) comments_count`;
  return {
    likes: Number(row?.likes ?? 0),
    liked: !!row?.liked,
    commentsCount: Number(row?.comments_count ?? 0),
  };
}
export async function getSolutionComments(id: string, viewer = ''): Promise<SolutionComment[]> {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT c.id,c.author_name,c.body,c.created_at,c.author_id=${viewer || null}::uuid mine,c.hidden_reason FROM solution_comments c WHERE c.solution_id=${id} AND (c.hidden_at IS NULL OR c.author_id=${viewer || null}::uuid) ORDER BY c.created_at DESC,c.id LIMIT 100`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.author_name),
    body: String(row.body),
    createdAt: new Date(row.created_at).toISOString(),
    mine: !!row.mine,
    ...(row.mine && row.hidden_reason ? { hiddenReason: String(row.hidden_reason) } : {}),
  }));
}
