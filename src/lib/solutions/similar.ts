import { categories as categoryEntries, collections, matchesCollection } from '@/lib/taxonomy';

/**
 * «Otras soluciones que te podrían interesar» at the end of a listing (SHCWS-55).
 *
 * Similarity is what two listings declared in common, weighted by how specific it is:
 * a shared capability says more than a shared category, and industry or company size
 * only refine the order. `industries: []` / `companySizes: []` («fits any») are real
 * answers but no signal of likeness, so they never add points. A candidate needs at
 * least a shared capability or category to count; ties keep the catalogue's order
 * (real interaction, src/lib/solutions/public.ts). Callers pass the organic catalogue
 * only: sponsored placements never appear here.
 */
export type SimilarityFacets = {
  categories?: string[];
  capabilities?: string[];
  industries?: string[];
  companySizes?: string[];
};

export const similarityWeights = {
  capability: 3,
  category: 2,
  industry: 1,
  companySize: 1,
} as const;

export type SimilarityMatch = {
  score: number;
  capabilities: string[];
  categories: string[];
  industries: string[];
  companySizes: string[];
};

function shared(current?: string[], candidate?: string[]) {
  if (!current?.length || !candidate?.length) return [];
  const values = new Set(current);
  return [...new Set(candidate)].filter(value => values.has(value));
}

export function similarity(
  current: SimilarityFacets,
  candidate: SimilarityFacets,
): SimilarityMatch {
  const match = {
    capabilities: shared(current.capabilities, candidate.capabilities),
    categories: shared(current.categories, candidate.categories),
    industries: shared(current.industries, candidate.industries),
    companySizes: shared(current.companySizes, candidate.companySizes),
  };
  return {
    ...match,
    score:
      match.capabilities.length * similarityWeights.capability +
      match.categories.length * similarityWeights.category +
      match.industries.length * similarityWeights.industry +
      match.companySizes.length * similarityWeights.companySize,
  };
}

export function pickSimilar<Product extends SimilarityFacets & { detailUrl?: string }>(
  current: SimilarityFacets,
  currentUrl: string,
  catalog: Product[],
  limit = 3,
): Array<{ product: Product; match: SimilarityMatch }> {
  return catalog
    .map((product, index) => ({ product, match: similarity(current, product), index }))
    .filter(
      ({ product, match }) =>
        product.detailUrl !== currentUrl && (match.capabilities.length || match.categories.length),
    )
    .sort((a, b) => b.match.score - a.match.score || a.index - b.index)
    .slice(0, limit)
    .map(({ product, match }) => ({ product, match }));
}

/**
 * Where else to go when there are fewer than `limit` similar listings, so every listing
 * ends with at least one useful exit: the editorial collection it belongs to, its
 * category page, and the «tell us what you need» brief, which always fits. With little
 * room the brief wins, then the category; they render in browsing order.
 */
export type SimilarExit =
  | { kind: 'collection'; slug: string }
  | { kind: 'category'; slug: string; label: string }
  | { kind: 'brief' };

export function similarExits(
  current: { categories: string[]; industries?: string[] },
  similarCount: number,
  limit = 3,
): SimilarExit[] {
  const room = Math.max(0, limit - similarCount);
  if (!room) return [];
  const collection = collections.find(entry => matchesCollection(current, entry.rule));
  const category = categoryEntries.find(entry => current.categories.includes(entry.label));
  const exits: SimilarExit[] = [
    ...(collection ? [{ kind: 'collection' as const, slug: collection.slug }] : []),
    ...(category
      ? [{ kind: 'category' as const, slug: category.slug, label: category.label }]
      : []),
    { kind: 'brief' },
  ];
  return exits.slice(-room);
}
