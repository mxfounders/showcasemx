import { solutionCategories, solutionIndustries, companySizes } from '@/lib/solutions/model';
import { communitySorts, type CommunitySort } from './community-model';

// Pure URL contract for /comunidad, shared by the page and its filter bar.
// Multi-value axes travel comma-joined (?category=Ventas,Cobros) so
// ExpandingSearch's Record<string,string> `fields` needs no change. Every
// value is validated against the taxonomy here — the SQL only ever sees known
// categories/industries/sizes (plus the escaped free-text `q`).

export type CommunityFilters = {
  q: string;
  categories: string[];
  industries: string[];
  sizes: string[];
  sort: CommunitySort;
  savedOnly: boolean;
  page: number;
};

const clean = (raw: string | undefined, allowed: readonly string[]): string[] =>
  raw ? Array.from(new Set(raw.split(',').map(v => v.trim()).filter(v => allowed.includes(v)))).slice(0, 7) : [];

export function readCommunityFilters(params: { q?: string; category?: string; industria?: string; tamano?: string; sort?: string; guardadas?: string; page?: string }): CommunityFilters {
  return {
    q: typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '',
    categories: clean(params.category, solutionCategories),
    industries: clean(params.industria, solutionIndustries),
    sizes: clean(params.tamano, companySizes),
    sort: communitySorts.includes(params.sort as CommunitySort) ? (params.sort as CommunitySort) : 'recent',
    savedOnly: params.guardadas === '1',
    page: Math.max(1, Math.min(1000, Number.parseInt(String(params.page ?? '1'), 10) || 1)),
  };
}

export function communityHasFilters(f: CommunityFilters): boolean {
  return Boolean(f.q || f.categories.length || f.industries.length || f.sizes.length || f.savedOnly || f.sort !== 'recent');
}

// Build a /comunidad href from the current filters plus a patch. `page` always
// resets to 1 unless the patch sets it — the classic "new filter, stranded on
// page 7" bug.
export function communityHref(f: CommunityFilters, patch: Partial<CommunityFilters> = {}): string {
  const next = { ...f, page: 1, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.categories.length) params.set('category', next.categories.join(','));
  if (next.industries.length) params.set('industria', next.industries.join(','));
  if (next.sizes.length) params.set('tamano', next.sizes.join(','));
  if (next.sort !== 'recent') params.set('sort', next.sort);
  if (next.savedOnly) params.set('guardadas', '1');
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/comunidad?${query}` : '/comunidad';
}

// Toggle one value in a multi-select axis.
export function toggleAxis(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter(v => v !== value) : [...values, value];
}

// Hidden fields ExpandingSearch must carry so a search keeps the active filters.
export function communitySearchFields(f: CommunityFilters): Record<string, string> {
  const fields: Record<string, string> = {};
  if (f.categories.length) fields.category = f.categories.join(',');
  if (f.industries.length) fields.industria = f.industries.join(',');
  if (f.sizes.length) fields.tamano = f.sizes.join(',');
  if (f.sort !== 'recent') fields.sort = f.sort;
  if (f.savedOnly) fields.guardadas = '1';
  return fields;
}
