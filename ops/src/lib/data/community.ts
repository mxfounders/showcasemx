import { getDb } from '../db';
import { iso, likePattern } from '../http';

export async function communityOverview(q = '', page = 1, pageSize = 30) {
  const sql = getDb();
  const like = likePattern(q);
  const offset = (page - 1) * pageSize;
  const [lists, listComments, solutionComments, stats] = await sql.transaction(
    [
      sql`
        SELECT l.id, l.name, l.public_description, l.curator_name, l.categories, l.created_at, l.updated_at,
          a.id AS owner_id, a.email AS owner_email,
          (SELECT count(*)::int FROM buyer_list_items i WHERE i.list_id = l.id) AS item_count,
          (SELECT count(*)::int FROM community_list_likes WHERE list_id = l.id) AS like_count,
          (SELECT count(*)::int FROM community_saved_lists WHERE list_id = l.id) AS save_count,
          (SELECT count(*)::int FROM community_list_comments WHERE list_id = l.id) AS comment_count,
          (SELECT count(*)::int FROM community_reports cr WHERE cr.list_id = l.id AND cr.status = 'open') AS open_reports
        FROM buyer_lists l JOIN auth_accounts a ON a.id = l.owner_id
        WHERE l.visibility = 'public'
          AND (${like}::text IS NULL OR lower(l.name) LIKE ${like} OR lower(COALESCE(l.curator_name, '')) LIKE ${like}
            OR lower(a.email) LIKE ${like} OR lower(COALESCE(l.public_description, '')) LIKE ${like})
        ORDER BY l.updated_at DESC
        LIMIT ${pageSize + 1} OFFSET ${offset}
      `,
      sql`
        SELECT c.id, c.list_id, c.author_name, c.body, c.created_at, l.name AS target_name, a.email AS author_email
        FROM community_list_comments c
        JOIN buyer_lists l ON l.id = c.list_id
        LEFT JOIN auth_accounts a ON a.id = c.author_id
        WHERE (${like}::text IS NULL OR lower(c.body) LIKE ${like} OR lower(c.author_name) LIKE ${like} OR lower(l.name) LIKE ${like})
        ORDER BY c.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${offset}
      `,
      sql`
        SELECT c.id, c.solution_id, c.author_name, c.body, c.created_at,
          COALESCE(s.published_data->>'name', s.data->>'name') AS target_name, a.email AS author_email
        FROM solution_comments c
        JOIN founder_solutions s ON s.id = c.solution_id
        LEFT JOIN auth_accounts a ON a.id = c.author_id
        WHERE (${like}::text IS NULL OR lower(c.body) LIKE ${like} OR lower(c.author_name) LIKE ${like}
          OR lower(COALESCE(s.published_data->>'name', s.data->>'name', '')) LIKE ${like})
        ORDER BY c.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${offset}
      `,
      sql`
        SELECT
          (SELECT count(*)::int FROM buyer_lists WHERE visibility = 'public') AS public_lists,
          (SELECT count(*)::int FROM community_list_comments) AS list_comments,
          (SELECT count(*)::int FROM solution_comments) AS solution_comments,
          (SELECT count(*)::int FROM community_list_likes) AS list_likes,
          (SELECT count(*)::int FROM solution_likes) AS solution_likes,
          (SELECT count(*)::int FROM community_saved_lists) AS saved_lists
      `,
    ],
    { readOnly: true },
  );
  const comment = (c: Record<string, unknown>, kind: 'list' | 'solution') => ({
    id: String(c.id),
    kind,
    targetId: String(kind === 'list' ? c.list_id : c.solution_id),
    targetName: c.target_name ? String(c.target_name) : '(sin nombre)',
    authorName: String(c.author_name),
    authorEmail: c.author_email ? String(c.author_email) : null,
    body: String(c.body),
    createdAt: iso(c.created_at),
  });
  const s = stats[0] ?? {};
  return {
    page,
    lists: {
      hasMore: lists.length > pageSize,
      items: lists.slice(0, pageSize).map(l => ({
        id: String(l.id),
        name: String(l.name),
        publicDescription: l.public_description ? String(l.public_description) : '',
        curatorName: l.curator_name ? String(l.curator_name) : '',
        categories: Array.isArray(l.categories) ? (l.categories as string[]) : [],
        createdAt: iso(l.created_at),
        updatedAt: iso(l.updated_at),
        ownerId: String(l.owner_id),
        ownerEmail: String(l.owner_email),
        itemCount: Number(l.item_count),
        likeCount: Number(l.like_count),
        saveCount: Number(l.save_count),
        commentCount: Number(l.comment_count),
        openReports: Number(l.open_reports),
      })),
    },
    listComments: {
      hasMore: listComments.length > pageSize,
      items: listComments.slice(0, pageSize).map(c => comment(c, 'list')),
    },
    solutionComments: {
      hasMore: solutionComments.length > pageSize,
      items: solutionComments.slice(0, pageSize).map(c => comment(c, 'solution')),
    },
    stats: {
      publicLists: Number(s.public_lists ?? 0),
      listComments: Number(s.list_comments ?? 0),
      solutionComments: Number(s.solution_comments ?? 0),
      listLikes: Number(s.list_likes ?? 0),
      solutionLikes: Number(s.solution_likes ?? 0),
      savedLists: Number(s.saved_lists ?? 0),
    },
  };
}
