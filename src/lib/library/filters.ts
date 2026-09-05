import type { BuyerProject } from './model';
import { makeQueryScorer } from '@/lib/search/score';
import { matchIndustry, matchCompanySize, isRealMatch } from '@/lib/search/facets';

export type SavedEntry = { key: string; project?: BuyerProject; memberships: string[] };
export type SavedFilters = { query: string; kind: string; category: string; industry: string; size: string; list: string; sort: string };

// Kept as a re-export for callers that still import the old name; it's just
// the shared normalizer now.
export { normalizeText as normalizeLibrarySearch } from '@/lib/search/normalize';

// A saved project seen as something the shared search scorer can rank:
// `feature` maps to `audience`, the same way PublishedProduct does it.
const searchable = (project: BuyerProject) => ({
  name: project.name,
  description: project.description,
  feature: project.audience ?? '',
  categories: project.categories,
  industries: project.industries,
  companySizes: project.companySizes,
});

export function filterSaved(entries: SavedEntry[], filters: SavedFilters) {
  const scorer = filters.query.trim() ? makeQueryScorer(filters.query) : null;

  const scored: { entry: SavedEntry; score: number }[] = [];
  for (const entry of entries) {
    const project = entry.project;
    if (filters.kind && project?.kind !== filters.kind) continue;
    if (filters.category && !project?.categories.includes(filters.category)) continue;
    // Industry/size use the declared tri-state ([] = "fits any" matches every
    // value). No inference here — a personal library view stays literal.
    if (filters.industry && !(project && isRealMatch(matchIndustry(searchable(project), filters.industry)))) continue;
    if (filters.size && !(project && isRealMatch(matchCompanySize(project, filters.size)))) continue;
    if (filters.list === 'none' && entry.memberships.length) continue;
    if (filters.list && filters.list !== 'none' && !entry.memberships.includes(filters.list)) continue;

    if (scorer) {
      const score = project ? scorer(searchable(project)) : (scorer({ name: 'Proyecto no disponible', description: '', feature: '' }));
      if (score <= 0) continue;
      scored.push({ entry, score });
    } else {
      scored.push({ entry, score: 0 });
    }
  }

  // With an active query, relevance wins; otherwise the requested sort.
  if (scorer) return scored.sort((a, b) => b.score - a.score).map(item => item.entry);
  const visible = scored.map(item => item.entry);
  if (filters.sort === 'name') return visible.sort((a, b) => (a.project?.name ?? 'Proyecto no disponible').localeCompare(b.project?.name ?? 'Proyecto no disponible', 'es'));
  if (filters.sort === 'oldest') return visible.reverse();
  return visible;
}
