import { solutionCategories } from '@/lib/solutions/model';

/** Longest text a link carries into the form: the catalog's search box stops at 200. */
const maxPrefill = 200;

const oneLine = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxPrefill) : '';

/**
 * What a link may pre-fill in «Publica tu necesidad» (SHCWS-58):
 * `/account/briefs/new?necesidad=…&categoria=…`. A bounded single line and a known
 * category; the buyer still completes, reviews and publishes the brief themselves.
 */
export function readBriefPrefill(params: { necesidad?: unknown; categoria?: unknown }) {
  const category = oneLine(params.categoria);
  return {
    problem: oneLine(params.necesidad),
    categories: (solutionCategories as readonly string[]).includes(category) ? [category] : [],
  };
}

/** The «Publica tu necesidad» link from a search, a category or a listing. */
export function briefHref(need = '', category = '') {
  const query = new URLSearchParams();
  const text = oneLine(need);
  if (text) query.set('necesidad', text);
  if ((solutionCategories as readonly string[]).includes(category))
    query.set('categoria', category);
  return `/account/briefs/new${query.size ? `?${query}` : ''}`;
}
