import {
  categories,
  collections,
  industries,
  localizedCapabilityLabel,
  localizedCategoryDisplayLabel,
  localizedCollections,
  localizedCompanySizes,
  localizedComplianceOptions,
  localizedIndustries,
  localizedIntegrationOptions,
  localizedOfferingOptions,
  localizedPriceBandOptions,
  localizedSetupTimeOptions,
  matchesCollection,
  offerings,
} from '@/lib/taxonomy';
import {
  companySizes,
  solutionCapabilities,
  solutionCategories,
  solutionCompliance,
  solutionIndustries,
  solutionIntegrations,
  solutionPriceBands,
  solutionSetupTimes,
} from '@/lib/solutions/model';
import { isRealMatch, matchIndustry } from '@/lib/search/facets';
import { normalizeText } from '@/lib/search/normalize';
import { makeQueryScorer, queryTokens, type SearchableProduct } from '@/lib/search/score';
import {
  filterAxes,
  multiValueAxes,
  placeProduct,
  type FilterAxis,
  type FilterableProduct,
} from '@/lib/search/catalog-filter';

/**
 * Saved-search alerts (SHCWS-47): «Avísame cuando haya algo nuevo» from /buscar or a
 * catalog page with its filters. An alert stores where it was made (scope and topic), the
 * words typed and the filters, and matches a listing exactly when that listing would show
 * in the main results of that page: same scorer as search, same filter rules as the
 * catalog (src/lib/search/catalog-filter.ts). «También podrían servir» is not a match.
 */
export type AlertScope = 'search' | 'explorar' | 'industria' | 'colecciones';
export const alertScopes: readonly AlertScope[] = [
  'search',
  'explorar',
  'industria',
  'colecciones',
];
export type AlertFilters = Partial<Record<FilterAxis, string[]>>;
export interface AlertCriteria {
  scope: AlertScope;
  /** The category, industry or collection slug; null for /buscar. */
  topic: string | null;
  query: string;
  filters: AlertFilters;
}
export type AlertProduct = FilterableProduct & SearchableProduct;

/** Alerts one account may keep. */
export const maxAlertsPerAccount = 20;
/** Values per filter axis, like the URL contract of Comunidad. */
const maxValuesPerAxis = 7;
const maxQueryLength = 200;

const legalValues: Record<FilterAxis, readonly string[]> = {
  problema: solutionCategories,
  industria: solutionIndustries,
  capacidad: solutionCapabilities.map(item => item.id),
  respuesta: ['rapido'],
  tamano: companySizes,
  integracion: solutionIntegrations,
  precio: solutionPriceBands,
  arranque: solutionSetupTimes,
  cumplimiento: solutionCompliance,
  modelo: offerings,
};

function topicExists(scope: AlertScope, topic: string) {
  if (scope === 'explorar') return categories.some(item => item.slug === topic);
  if (scope === 'industria') return industries.some(item => item.slug === topic);
  if (scope === 'colecciones') return collections.some(item => item.slug === topic);
  return false;
}

/**
 * Validates what the page sends (or what was stored), or null. Unknown axes or values are
 * refused rather than dropped: a quietly narrower alert would promise what it can't keep.
 * Values are deduplicated and sorted, so the same search is the same alert.
 */
export function readAlertCriteria(input: unknown): AlertCriteria | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  const scope = alertScopes.find(value => value === body.scope);
  if (!scope) return null;
  const query = typeof body.query === 'string' ? body.query.trim().replace(/\s+/g, ' ') : '';
  if (body.query !== undefined && typeof body.query !== 'string') return null;
  if (query.length > maxQueryLength) return null;
  let topic: string | null = null;
  if (scope === 'search') {
    if (body.topic !== undefined && body.topic !== null) return null;
    // /buscar has no filters and needs words that carry meaning.
    if (!queryTokens(query).length) return null;
  } else {
    if (typeof body.topic !== 'string' || !topicExists(scope, body.topic)) return null;
    topic = body.topic;
  }
  const rawFilters = body.filters ?? {};
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) return null;
  const filters: AlertFilters = {};
  for (const [key, raw] of Object.entries(rawFilters as Record<string, unknown>)) {
    if (key === 'sort') continue;
    const axis = filterAxes.find(value => value === key);
    if (!axis || scope === 'search') return null;
    if (!Array.isArray(raw) || raw.some(value => typeof value !== 'string')) return null;
    const values = [...new Set(raw as string[])].sort();
    if (!values.length) continue;
    if (values.length > (multiValueAxes.has(axis) ? maxValuesPerAxis : 1)) return null;
    if (values.some(value => !legalValues[axis].includes(value))) return null;
    filters[axis] = values;
  }
  return { scope, topic, query, filters };
}

/** One string per distinct search: same scope, topic, words (any accents/case) and filters. */
export function alertSignature(criteria: AlertCriteria) {
  return JSON.stringify([
    criteria.scope,
    criteria.topic,
    normalizeText(criteria.query),
    filterAxes
      .filter(axis => criteria.filters[axis]?.length)
      .map(axis => [axis, criteria.filters[axis]]),
  ]);
}

function inTopic(product: AlertProduct, criteria: AlertCriteria) {
  if (criteria.scope === 'explorar') {
    const label = categories.find(item => item.slug === criteria.topic)?.label;
    return !!label && (product.category === label || !!product.categories?.includes(label));
  }
  if (criteria.scope === 'industria') {
    const value = industries.find(item => item.slug === criteria.topic)?.value;
    return !!value && isRealMatch(matchIndustry(product, value));
  }
  if (criteria.scope === 'colecciones') {
    const rule = collections.find(item => item.slug === criteria.topic)?.rule;
    return !!rule && matchesCollection(product, rule);
  }
  return true;
}

/** Whether `product` shows in the main results of the page the alert was made on. */
export function alertMatches(product: AlertProduct, criteria: AlertCriteria): boolean {
  if (criteria.scope === 'search') {
    // /buscar ranks with rankSearch, which keeps every listing with a positive score.
    const scorer = makeQueryScorer(criteria.query);
    return !!scorer && scorer(product) > 0;
  }
  if (!inTopic(product, criteria)) return false;
  if (placeProduct(product, criteria.filters).level !== 'primary') return false;
  // Words typed inside a category page must hit the listing itself (SHCWS-45).
  const scorer = makeQueryScorer(criteria.query, { requireLiteral: true });
  return !scorer || scorer(product) > 0;
}

/** The page the alert came from, with its filters: `/explorar/cobros?industria=Retail&q=…`. */
export function alertHref(criteria: AlertCriteria) {
  const params = new URLSearchParams();
  for (const axis of filterAxes) {
    const values = criteria.filters[axis];
    if (values?.length) params.set(axis, values.join(','));
  }
  if (criteria.query) params.set('q', criteria.query);
  const search = params.toString();
  const path = criteria.scope === 'search' ? '/buscar' : `/${criteria.scope}/${criteria.topic}`;
  return search ? `${path}?${search}` : path;
}

function filterValueLabel(axis: FilterAxis, value: string, locale: string, fastResponse: string) {
  const option = (list: readonly { value: string; label: string }[]) =>
    list.find(item => item.value === value)?.label ?? value;
  switch (axis) {
    case 'problema':
      return localizedCategoryDisplayLabel(value, locale);
    case 'industria':
      return option(localizedIndustries(locale));
    case 'capacidad':
      return localizedCapabilityLabel(value, locale);
    case 'respuesta':
      return fastResponse;
    case 'tamano':
      return option(localizedCompanySizes(locale));
    case 'integracion':
      return option(localizedIntegrationOptions(locale));
    case 'precio':
      return option(localizedPriceBandOptions(locale));
    case 'arranque':
      return option(localizedSetupTimeOptions(locale));
    case 'cumplimiento':
      return option(localizedComplianceOptions(locale));
    case 'modelo':
      return option(localizedOfferingOptions(locale));
  }
}

/** What the alert is about, in words: «nómina» · Retail · PyME. */
export function alertLabel(
  criteria: AlertCriteria,
  locale: string,
  labels: { fastResponse: string },
) {
  const parts: string[] = [];
  if (criteria.query) parts.push(`«${criteria.query}»`);
  if (criteria.scope === 'explorar') {
    const label = categories.find(item => item.slug === criteria.topic)?.label;
    if (label) parts.push(localizedCategoryDisplayLabel(label, locale));
  } else if (criteria.scope === 'industria') {
    const item = localizedIndustries(locale).find(entry => entry.slug === criteria.topic);
    if (item) parts.push(item.label);
  } else if (criteria.scope === 'colecciones') {
    const item = localizedCollections(locale).find(entry => entry.slug === criteria.topic);
    if (item) parts.push(item.title);
  }
  for (const axis of filterAxes)
    for (const value of criteria.filters[axis] ?? [])
      parts.push(filterValueLabel(axis, value, locale, labels.fastResponse));
  const label = parts.join(' · ');
  return label.length > 150 ? `${label.slice(0, 149)}…` : label;
}
