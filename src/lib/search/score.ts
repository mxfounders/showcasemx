import { tokenize } from './normalize';
import { expandVocabulary } from './vocabulary';

// A searchable thing: the fields catalog-search and (later) the saved library
// score against. Only `name`/`description`/`feature` are required; everything
// else is optional so a bare PreviewProduct still fits.
export interface SearchableProduct {
  name: string;
  description: string;
  feature: string;
  provider?: string;
  categories?: string[];
  industries?: string[];
  companySizes?: string[];
  keywords?: string[];
}

// The old catalog-search `ignored` set: filler words a buyer types around
// the real query ("quiero", "necesito", "para mi empresa"). Kept verbatim.
const STOPWORDS = new Set(
  'quiero necesito busco para mi mis una un el la los las de del a al en y o que me con por como empresa negocio tiempo organizar ayuda solucion soluciones'.split(' '),
);

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

// Trim a trailing Spanish plural so pago/pagos and cotizacion/cotizaciones
// compare equal, without a real stemmer.
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

// A query token matches a document word if they're equal, if their stems are
// equal (singular/plural), or if they share a 6+ char prefix (automatizar ~
// automatizacion). Words under 4 characters only match exactly. The 6-char
// prefix floor is deliberate: 5 would fold contrato ~ control.
function tokenMatches(queryToken: string, word: string): boolean {
  if (queryToken === word) return true;
  if (queryToken.length < 4 || word.length < 4) return false;
  if (stem(queryToken) === stem(word)) return true;
  return commonPrefixLength(queryToken, word) >= 6;
}

function anyMatch(token: string, words: readonly string[]): boolean {
  return words.some(word => tokenMatches(token, word));
}

// Literal fields carry the strongest evidence, weighted by how much a hit
// there means: a query word in the product name is worth far more than the
// same word buried in a description. Expanded vocabulary (what a declared
// category/industry implies) is the weakest signal — enough to surface a
// Ventas product for "cotización" or "mayoreo", but never enough to outrank
// a product that literally says so.
const WEIGHTS = { name: 6, facet: 4, feature: 3, description: 2, provider: 1, vocabulary: 1.5 };

interface Scored<T> {
  product: T;
  score: number;
  matchedAll: boolean;
}

function scoreProduct<T extends SearchableProduct>(tokens: readonly string[], product: T): Scored<T> {
  const nameWords = tokenize(product.name);
  const facetWords = tokenize([...(product.categories ?? []), ...(product.industries ?? []), ...(product.companySizes ?? [])].join(' '));
  const featureWords = tokenize(product.feature);
  const descriptionWords = tokenize(product.description);
  const providerWords = tokenize(product.provider ?? '');
  const vocabularyWords = tokenize([...expandVocabulary(product.categories, product.industries), ...(product.keywords ?? [])].join(' '));

  let score = 0;
  let matched = 0;
  for (const token of tokens) {
    let hit = false;
    if (anyMatch(token, nameWords)) { score += WEIGHTS.name; hit = true; }
    if (anyMatch(token, facetWords)) { score += WEIGHTS.facet; hit = true; }
    if (anyMatch(token, featureWords)) { score += WEIGHTS.feature; hit = true; }
    if (anyMatch(token, descriptionWords)) { score += WEIGHTS.description; hit = true; }
    if (anyMatch(token, providerWords)) { score += WEIGHTS.provider; hit = true; }
    if (anyMatch(token, vocabularyWords)) { score += WEIGHTS.vocabulary; hit = true; }
    if (hit) matched += 1;
  }
  return { product, score, matchedAll: matched === tokens.length };
}

// A reusable scorer for one query, for callers that need to keep their own
// data structure around each product (the saved library filters entries, not
// bare products). Returns null when the query has no usable tokens; otherwise
// a function giving 0 (no match) or a positive relevance score.
export function makeQueryScorer(query: string): ((product: SearchableProduct) => number) | null {
  const tokens = tokenize(query).filter(token => token.length > 0 && !STOPWORDS.has(token));
  if (!tokens.length) return null;
  return product => scoreProduct(tokens, product).score;
}

// Ranks products against a free-text query. Products that match every token
// of the query come first (the "all words present" intent), then by score,
// then by an optional caller tie-break (catalog priority, real interaction).
export function rankSearch<T extends SearchableProduct>(
  query: string,
  products: readonly T[],
  tieBreak?: (a: T, b: T) => number,
): T[] {
  const tokens = tokenize(query).filter(token => token.length > 0 && !STOPWORDS.has(token));
  if (!tokens.length) return [];
  return products
    .map(product => scoreProduct(tokens, product))
    .filter(result => result.score > 0)
    .sort((a, b) =>
      (Number(b.matchedAll) - Number(a.matchedAll)) ||
      (b.score - a.score) ||
      (tieBreak ? tieBreak(a.product, b.product) : 0))
    .map(result => result.product);
}
