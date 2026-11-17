import { solutionsSql } from '@/lib/solutions/server';
import { resolveProjects } from './server';
import {
  communityScore,
  communityWeights,
  rankCollections,
  type CommunitySort,
} from './community-model';
import { rankingHalfLifeDays } from '@/lib/solutions/ranking';
import { minPublicListProjects } from './model';
import type { BuyerProject } from './model';
export type PublicCollection = {
  id: string;
  name: string;
  description: string;
  curator: string;
  categories: string[];
  count: number;
  likes: number;
  saves: number;
  comments: number;
  score: number;
  liked: boolean;
  saved: boolean;
  /** The viewer follows this list / the signature behind it (SHCWS-121). */
  following: boolean;
  followingCurator: boolean;
  own: boolean;
  covers: Pick<BuyerProject, 'key' | 'name' | 'image'>[];
  projects: BuyerProject[];
  visibility: 'public';
};
export type PublicComment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  mine: boolean;
};
const communityPageSize = 24;
/** Upper bound of lists scored per search; far above today's Comunidad. */
const maxSearchedLists = 500;
// Filters run in SQL because pagination (OFFSET) and `total` do — a client-side
// pass over one page would count and paginate wrong. `categories` filters the
// list's own declared categories (array overlap); `industries`/`sizes` filter
// the *contained projects'* declared facets, respecting the tri-state from
// src/lib/solutions/model.ts ([] = fits any). `query` now also matches the
// name of a project inside the list, not only the list's own text. See §19/§56.
export async function getPublicCollections({
  id = '',
  categories = [],
  industries = [],
  sizes = [],
  query = '',
  page = 1,
  sort = 'recent',
  viewer = '',
  savedBy = '',
  followedBy = '',
}: {
  id?: string;
  categories?: readonly string[];
  industries?: readonly string[];
  sizes?: readonly string[];
  query?: string;
  page?: number;
  sort?: CommunitySort;
  viewer?: string;
  savedBy?: string;
  /** Lists this account follows; resolved from the session, never from the URL. */
  followedBy?: string;
} = {}): Promise<{ collections: PublicCollection[]; hasMore: boolean; total: number }> {
  const sql = solutionsSql(),
    offset = (Math.max(1, Math.min(1000, page)) - 1) * communityPageSize,
    popular = sort === 'popular',
    halfLifeSeconds = rankingHalfLifeDays * 86400,
    // With words typed, every list that passes the other filters is scored in TS by the
    // catalog's scorer (rankCollections), then paged. Bounded: Comunidad is small.
    searching = Boolean(query.trim());
  const cats = [...categories],
    inds = [...industries],
    szs = [...sizes];
  const rows = await sql`WITH matched AS (
  SELECT l.id,l.owner_id,l.name,l.public_description,l.curator_name,l.categories,l.created_at,
   -- «Populares» (communityRank in community-model.ts): only verified accounts, never the
   -- list's owner, each interaction decayed by its age. Counters shown stay raw.
   ((SELECT COALESCE(sum(exp(-ln(2)*extract(epoch FROM now()-x.created_at)/${halfLifeSeconds})),0)
      FROM community_list_likes x JOIN auth_accounts a ON a.id=x.owner_id
      WHERE x.list_id=l.id AND a.email_verified_at IS NOT NULL AND x.owner_id<>l.owner_id)*${communityWeights.like}
    +(SELECT COALESCE(sum(exp(-ln(2)*extract(epoch FROM now()-x.created_at)/${halfLifeSeconds})),0)
      FROM community_saved_lists x JOIN auth_accounts a ON a.id=x.owner_id
      WHERE x.list_id=l.id AND a.email_verified_at IS NOT NULL AND x.owner_id<>l.owner_id)*${communityWeights.save}
    +(SELECT COALESCE(sum(exp(-ln(2)*extract(epoch FROM now()-x.created_at)/${halfLifeSeconds})),0)
      FROM community_list_comments x JOIN auth_accounts a ON a.id=x.author_id
      WHERE x.list_id=l.id AND a.email_verified_at IS NOT NULL AND x.author_id<>l.owner_id)*${communityWeights.comment}) AS rank_score
  FROM buyer_lists l
  WHERE l.visibility='public'
   -- Hidden while it has fewer available projects than a public list needs (SHCWS-116).
   AND (SELECT count(DISTINCT s.id) FROM buyer_list_items i JOIN founder_solutions s
     ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
     WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL)>=${minPublicListProjects}
   AND (${id}='' OR l.id::text=${id})
   AND (cardinality(${cats}::text[])=0 OR l.categories && ${cats}::text[])
   AND (${savedBy}='' OR EXISTS(SELECT 1 FROM community_saved_lists x WHERE x.list_id=l.id AND x.owner_id=${savedBy || null}::uuid))
   AND (${followedBy}='' OR EXISTS(SELECT 1 FROM community_list_follows x WHERE x.list_id=l.id AND x.follower_id=${followedBy || null}::uuid))
   AND (cardinality(${inds}::text[])=0 OR EXISTS(SELECT 1 FROM buyer_list_items i JOIN founder_solutions s
     ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
     WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL
      AND jsonb_typeof(s.published_data->'industries')='array'
      AND (s.published_data->'industries'='[]'::jsonb OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.published_data->'industries') e WHERE e = ANY(${inds}::text[])))))
   AND (cardinality(${szs}::text[])=0 OR EXISTS(SELECT 1 FROM buyer_list_items i JOIN founder_solutions s
     ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
     WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL
      AND jsonb_typeof(s.published_data->'companySizes')='array'
      AND (s.published_data->'companySizes'='[]'::jsonb OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.published_data->'companySizes') e WHERE e = ANY(${szs}::text[])))))
 ),counted AS (SELECT m.*,count(*) OVER ()::int AS total FROM matched m)
 SELECT c.id,c.name,c.public_description,c.curator_name,c.categories,c.total,
  (SELECT count(*)::int FROM community_list_likes x WHERE x.list_id=c.id) likes,
  (SELECT count(*)::int FROM community_saved_lists x WHERE x.list_id=c.id) saves,
  (SELECT count(*)::int FROM community_list_comments x WHERE x.list_id=c.id) comments,
  EXISTS(SELECT 1 FROM community_list_likes x WHERE x.list_id=c.id AND x.owner_id=${viewer || null}::uuid) liked,
  EXISTS(SELECT 1 FROM community_saved_lists x WHERE x.list_id=c.id AND x.owner_id=${viewer || null}::uuid) saved,
  EXISTS(SELECT 1 FROM community_list_follows x WHERE x.list_id=c.id AND x.follower_id=${viewer || null}::uuid) following,
  EXISTS(SELECT 1 FROM community_curator_follows x WHERE x.curator_id=c.owner_id
   AND x.curator_key=curator_key(c.curator_name) AND x.follower_id=${viewer || null}::uuid) following_curator,
  c.owner_id=${viewer || null}::uuid own,
  COALESCE((SELECT jsonb_agg(available.project_key ORDER BY available.created_at DESC,available.project_key) FROM (
   SELECT i.project_key,i.created_at FROM buyer_list_items i JOIN founder_solutions s ON (i.project_key='solution:'||s.id::text OR i.project_key='catalog:'||s.catalog_key)
   WHERE i.list_id=c.id AND i.owner_id=c.owner_id AND s.published_data IS NOT NULL
  ) available),'[]'::jsonb) AS project_keys,
  CASE WHEN ${searching} THEN COALESCE((SELECT jsonb_agg(s.published_data->>'name') FROM buyer_list_items i
   JOIN founder_solutions s ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
   WHERE i.list_id=c.id AND i.owner_id=c.owner_id AND s.published_data IS NOT NULL),'[]'::jsonb) ELSE '[]'::jsonb END AS project_names
 FROM counted c
 ORDER BY CASE WHEN ${popular} THEN c.rank_score END DESC,c.created_at DESC,c.id
 LIMIT ${id ? 1 : searching ? maxSearchedLists : communityPageSize} OFFSET ${id || searching ? 0 : offset}`;
  const matched = searching
    ? rankCollections(query, rows, row => ({
        name: String(row.name),
        publicDescription: String(row.public_description),
        curator: String(row.curator_name),
        categories: row.categories as string[],
        projectNames: row.project_names as string[],
      }))
    : rows;
  const pageRows = searching ? matched.slice(offset, offset + communityPageSize) : rows;
  const total = searching ? matched.length : Number(rows[0]?.total ?? 0),
    keys = Array.from(new Set(pageRows.flatMap(row => row.project_keys as string[]))),
    projects = await resolveProjects(keys);
  return {
    total,
    hasMore: offset + pageRows.length < total,
    collections: pageRows.map(row => {
      const items = (row.project_keys as string[]).flatMap(key =>
          projects[key] ? [projects[key]] : [],
        ),
        likes = Number(row.likes),
        saves = Number(row.saves),
        comments = Number(row.comments);
      return {
        id: String(row.id),
        name: String(row.name),
        description: String(row.public_description),
        curator: String(row.curator_name),
        categories: row.categories as string[],
        visibility: 'public',
        count: items.length,
        likes,
        saves,
        comments,
        score: communityScore(likes, saves, comments),
        liked: !!row.liked,
        saved: !!row.saved,
        following: !!row.following,
        followingCurator: !!row.following_curator,
        own: !!row.own,
        covers: items.slice(0, 4).map(({ key, name, image }) => ({ key, name, image })),
        projects: items,
      };
    }),
  };
}
export async function getPublicComments(listId: string, viewer = ''): Promise<PublicComment[]> {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT c.id,c.author_name,c.body,c.created_at,(c.author_id=${viewer || null}::uuid OR l.owner_id=${viewer || null}::uuid) mine FROM community_list_comments c JOIN buyer_lists l ON l.id=c.list_id WHERE c.list_id=${listId} AND l.visibility='public' ORDER BY c.created_at DESC,c.id LIMIT 100`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.author_name),
    body: String(row.body),
    createdAt: new Date(row.created_at).toISOString(),
    mine: !!row.mine,
  }));
}

/**
 * Public lists worth indexing (SHCWS-119): visible in Comunidad (public, with at least
 * minPublicListProjects available projects), with a public description of their own and
 * no open report against them. Everything else stays `noindex`. Pass an id to ask
 * about one list.
 */
export async function indexableCollections(id = ''): Promise<{ id: string; updatedAt: string }[]> {
  const sql = solutionsSql();
  const rows = await sql`SELECT l.id,l.updated_at::text FROM buyer_lists l
   WHERE l.visibility='public' AND length(trim(l.public_description))>0
    AND (${id}='' OR l.id::text=${id})
    AND NOT EXISTS(SELECT 1 FROM community_reports r WHERE r.list_id=l.id AND r.subject_type='list' AND r.status='open')
    AND (SELECT count(DISTINCT s.id) FROM buyer_list_items i JOIN founder_solutions s
     ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
     WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL)>=${minPublicListProjects}
   ORDER BY l.updated_at DESC LIMIT 5000`;
  return rows.map(row => ({ id: String(row.id), updatedAt: String(row.updated_at) }));
}
