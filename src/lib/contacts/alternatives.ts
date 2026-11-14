import { solutionsSql } from '@/lib/solutions/server';
import { getSolutionCategories } from '@/lib/solutions/model';
import { pickSimilar, type SimilarityFacets, type SimilarityMatch } from '@/lib/solutions/similar';
import type { PublishedProduct } from '@/lib/solutions/public';

/**
 * Similar listings for a buyer whose request went unanswered (SHCWS-61). The same rule
 * as «Otras soluciones» at the end of a listing (pickSimilar, SHCWS-55): what both
 * declared in common, over the organic catalogue only, so never a draft and never a
 * sponsored slot. Never the listing that did not answer, nor one the buyer owns or
 * already contacted (a second request to it is not possible anyway).
 */
export function pickContactAlternatives(
  current: SimilarityFacets | null,
  solutionId: string,
  excluded: ReadonlySet<string>,
  catalog: readonly PublishedProduct[],
  limit = 3,
): Array<{ product: PublishedProduct; match: SimilarityMatch }> {
  if (!current) return [];
  const open = catalog.filter(product => {
    const id = /^\/soluciones\/([0-9a-f-]{36})$/.exec(product.detailUrl ?? '')?.[1];
    return Boolean(id) && id !== solutionId && !excluded.has(id as string);
  });
  return pickSimilar(current, `/soluciones/${solutionId}`, open, limit);
}

/**
 * Loads what the picker needs for one request: the facets of the listing as published
 * (never the draft: a buyer only ever sees published_data, CLAUDE.md §17) and the
 * listings to leave out. The caller has already checked that the request is the
 * buyer's, or is the mail worker sending the buyer's own notice.
 */
export async function contactAlternatives(
  request: { solutionId: string; buyerId: string },
  catalog: readonly PublishedProduct[],
  limit = 3,
) {
  const sql = solutionsSql();
  const [listing] =
    await sql`SELECT published_data FROM founder_solutions WHERE id=${request.solutionId} AND published_data IS NOT NULL`;
  const excludedRows =
    await sql`SELECT id::text AS id FROM founder_solutions WHERE owner_id=${request.buyerId}
      UNION SELECT solution_id::text FROM contact_requests WHERE buyer_id=${request.buyerId}`;
  const data = listing?.published_data as Record<string, unknown> | undefined;
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const current: SimilarityFacets | null = data
    ? {
        categories: getSolutionCategories({
          category: typeof data.category === 'string' ? data.category : undefined,
          categories: Array.isArray(data.categories) ? list(data.categories) : undefined,
        }),
        capabilities: list(data.capabilities),
        industries: list(data.industries),
        companySizes: list(data.companySizes),
      }
    : null;
  return pickContactAlternatives(
    current,
    request.solutionId,
    new Set(excludedRows.map(row => String(row.id))),
    catalog,
    limit,
  );
}
