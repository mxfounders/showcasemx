import { isRealMatch, matchIndustry } from '@/lib/search/facets';
import { getSolutionCategories } from '@/lib/solutions/model';
import {
  categories,
  collections,
  industries,
  localizedCategoryDisplayLabel,
  localizedCollections,
  localizedIndustries,
  matchesCollection,
} from '@/lib/taxonomy';
import type { AdPlacement } from './model';

/**
 * The pages a published listing may buy a sponsored slot on (SHCWS-79). A slot only runs
 * where the listing already belongs organically, by what it declared:
 * - `category` and `search`: a category it declares (search runs on queries that point at
 *   that category);
 * - `industry`: an industry it declares, or any industry when it declared that it serves
 *   all of them (`industries: []`, the same rule as the industry pages themselves);
 * - `collection`: a collection whose rule it meets (src/lib/taxonomy.ts).
 * Nothing is inferred from the listing's text. Unscoped placements return [''].
 */
export function listingScopes(
  placement: AdPlacement,
  published: { category?: string; categories?: string[]; industries?: string[] },
): string[] {
  const declared = getSolutionCategories(published);
  if (placement === 'category' || placement === 'search') {
    return categories.filter(entry => declared.includes(entry.label)).map(entry => entry.slug);
  }
  if (placement === 'industry') {
    // Only the declared answer: matchIndustry would otherwise infer from text it is not given.
    const subject = { industries: published.industries };
    return industries
      .filter(entry => isRealMatch(matchIndustry(subject, entry.value)))
      .map(entry => entry.slug);
  }
  if (placement === 'collection') {
    const subject = { categories: declared, industries: published.industries };
    return collections
      .filter(entry => matchesCollection(subject, entry.rule))
      .map(entry => entry.slug);
  }
  return [''];
}

/** How a scope reads to people: the category, industry or collection name in `locale`. */
export function scopeLabel(placement: AdPlacement, scope: string, locale: string): string {
  if (placement === 'category' || placement === 'search') {
    const entry = categories.find(item => item.slug === scope);
    return entry ? localizedCategoryDisplayLabel(entry.label, locale) : scope;
  }
  if (placement === 'industry') {
    return localizedIndustries(locale).find(item => item.slug === scope)?.label ?? scope;
  }
  if (placement === 'collection') {
    return localizedCollections(locale).find(item => item.slug === scope)?.title ?? scope;
  }
  return '';
}
