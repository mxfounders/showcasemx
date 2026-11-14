import { solutionsSql } from '@/lib/solutions/server';

/**
 * The account side of following (SHCWS-121, db/community-follows.sql). Lists followed are
 * read through getPublicCollections({ followedBy }); these are the curators someone
 * follows and, for a curator, how many follow them: numbers only, never who.
 */
export type FollowedCurator = {
  /** The follower's own follow row: enough to unfollow, says nothing about the curator. */
  id: string;
  name: string;
  lists: { id: string; name: string }[];
};

export async function followedCurators(owner: string): Promise<FollowedCurator[]> {
  const sql = solutionsSql();
  const rows = await sql`SELECT c.id::text, c.curator_name,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name) ORDER BY l.created_at DESC)
        FROM buyer_lists l
       WHERE l.owner_id = c.curator_id AND curator_key(l.curator_name) = c.curator_key
         AND community_list_visible(l.id)), '[]'::jsonb) AS lists
    FROM community_curator_follows c WHERE c.follower_id = ${owner}
    ORDER BY c.created_at DESC LIMIT 100`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.curator_name),
    lists: (row.lists as { id: string; name: string }[]).map(list => ({
      id: String(list.id),
      name: String(list.name),
    })),
  }));
}

export type FollowerCounts = {
  /** Whether the account has a public list at all (otherwise there is nothing to show). */
  curator: boolean;
  signatures: { name: string; count: number }[];
  lists: { id: string; name: string; count: number }[];
};

export async function followerCounts(owner: string): Promise<FollowerCounts> {
  const sql = solutionsSql();
  const [signatures, lists, [publicLists]] = await Promise.all([
    sql`SELECT (array_agg(curator_name ORDER BY created_at DESC))[1] AS name, count(*)::int AS count
      FROM community_curator_follows WHERE curator_id = ${owner}
      GROUP BY curator_key ORDER BY count(*) DESC`,
    sql`SELECT l.id::text, l.name, count(*)::int AS count
      FROM buyer_lists l JOIN community_list_follows f ON f.list_id = l.id
     WHERE l.owner_id = ${owner} GROUP BY l.id, l.name ORDER BY count(*) DESC, l.name`,
    sql`SELECT EXISTS (SELECT 1 FROM buyer_lists WHERE owner_id = ${owner} AND visibility = 'public') AS any`,
  ]);
  return {
    curator: !!publicLists?.any || signatures.length > 0 || lists.length > 0,
    signatures: signatures.map(row => ({ name: String(row.name), count: Number(row.count) })),
    lists: lists.map(row => ({
      id: String(row.id),
      name: String(row.name),
      count: Number(row.count),
    })),
  };
}
