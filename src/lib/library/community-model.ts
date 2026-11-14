import { makeQueryScorer } from '@/lib/search/score';
export const communitySorts = ['recent', 'popular'] as const;
export type CommunitySort = (typeof communitySorts)[number];
/** One place for the weights the SQL order (community.ts) and the TS score share. */
export const communityWeights = { like: 1, save: 2, comment: 3 } as const;
export const communityScore = (likes: number, saves: number, comments: number) =>
  likes * communityWeights.like +
  saves * communityWeights.save +
  comments * communityWeights.comment;

/**
 * The «Populares» rule, the same one the catalog uses (§55, SHCWS-115): an interaction
 * counts only if its account has a verified email and isn't the list's owner, and it
 * weighs half as much every rankingHalfLifeDays. community.ts computes exactly this in
 * SQL; this function states it for tests and readers. The visible counters stay raw.
 */
export function communityRank(
  interactions: readonly {
    kind: keyof typeof communityWeights;
    verified: boolean;
    own: boolean;
    ageDays: number;
  }[],
  halfLifeDays: number,
) {
  return interactions.reduce(
    (total, item) =>
      item.verified && !item.own
        ? total + communityWeights[item.kind] * Math.exp((-Math.LN2 * item.ageDays) / halfLifeDays)
        : total,
    0,
  );
}
export function communityComment(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.name !== 'string' || typeof body.comment !== 'string') return null;
  const name = body.name.trim(),
    comment = body.comment.trim();
  return name.length > 0 && name.length <= 60 && comment.length > 0 && comment.length <= 500
    ? { name, comment }
    : null;
}
const communityReportReasons = ['spam', 'abuse', 'impersonation', 'other'] as const;
export type CommunityReportReason = (typeof communityReportReasons)[number];
export function communityReport(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.reason !== 'string' ||
    !communityReportReasons.includes(body.reason as CommunityReportReason) ||
    typeof body.details !== 'string'
  )
    return null;
  const details = body.details.trim();
  return details.length >= 10 && details.length <= 2000
    ? { reason: body.reason as CommunityReportReason, details }
    : null;
}
export function escapeLikeTerm(value: string) {
  return value.replace(/[\\%_]/g, match => '\\' + match);
}

/**
 * Community search with the catalog's scorer (SHCWS-118): synonyms, plurals and the
 * vocabulary of each list's categories, over its name, public description, the names
 * of the projects in it and its signature. Lists that don't match drop out; the rest
 * keep the order they came in (recent or popular) among equal scores.
 */
export type CollectionSearchFields = {
  name: string;
  publicDescription: string;
  curator: string;
  categories: string[];
  projectNames: string[];
};
export function rankCollections<T>(
  query: string,
  rows: readonly T[],
  fields: (row: T) => CollectionSearchFields,
): T[] {
  const scorer = makeQueryScorer(query);
  if (!scorer) return [...rows];
  return rows
    .map((row, index) => {
      const list = fields(row);
      return {
        row,
        index,
        score: scorer({
          name: list.name,
          description: [list.publicDescription, ...list.projectNames].join(' '),
          feature: list.curator,
          categories: list.categories,
        }),
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.row);
}
