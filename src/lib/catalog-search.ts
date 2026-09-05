import { previewCategories, catalogPriority, type PreviewCategory, type PreviewProduct } from "./catalog-preview";
import { normalizeText } from "./search/normalize";
import { rankSearch } from "./search/score";

// Kept exported: some callers still import it. Now delegates to the shared
// normalizer so the catalog and the saved library agree on what a token is.
export function normalizeQuery(value: string) {
  return normalizeText(value);
}

// Accumulates every category label a product appears under, across every
// PreviewCategory group that lists it (a static example carries this only via
// which group it sits in; a published product already declares its own
// `.categories`, left untouched). Dedupes by website, so scoring sees the
// union of the product's categories — not just whichever group listed it
// first — and its declared industries/keywords come along.
function collectSearchableProducts(categories: PreviewCategory[]): PreviewProduct[] {
  const byWebsite = new Map<string, PreviewProduct>();
  for (const category of categories) {
    for (const product of category.products) {
      if (!product.website) continue; // no real site to open — not a search result
      const existing = byWebsite.get(product.website);
      if (existing) {
        existing.categories = Array.from(new Set([...(existing.categories ?? []), category.label]));
      } else {
        byWebsite.set(product.website, { ...product, categories: product.categories ?? [category.label] });
      }
    }
  }
  return Array.from(byWebsite.values());
}

// Free-text catalog search. Scores each product across its name, declared
// taxonomy, feature/description and the vocabulary a declared category or
// industry implies (src/lib/search/vocabulary.ts), so a Ventas product is
// found by "cotización", "mayoreo" or "predicción" even when its own copy
// never uses those words. Products matching every query word rank first;
// Cord/Flouvia break score ties, no longer the primary order.
export function searchCatalog(query: string, categories: PreviewCategory[] = previewCategories) {
  const products = collectSearchableProducts(categories);
  return rankSearch(query, products, (a, b) => catalogPriority(a) - catalogPriority(b));
}
