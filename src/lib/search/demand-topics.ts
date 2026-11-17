import { rankTopics } from './topics';

/**
 * Searches that found nothing, grouped by the catalog topic their words point at (SHCWS-60):
 * «cobrar facturas atrasadas» and «cobranza» are one gap, Cobros. The same topic ranking
 * /buscar uses (rankTopics); a search no topic answers stays in its own «sin tema» group.
 * Input rows are already aggregated (search_demand): words, counts, never a person.
 */
export type DemandQuery = { query: string; searches: number; empty: number };
export type DemandTopic = {
  kind: 'category' | 'industry' | 'none';
  /** Canonical taxonomy value (Cobros, Hospitalidad), '' for searches with no topic. */
  value: string;
  title: string;
  href: string | null;
  empty: number;
  searches: number;
  queries: DemandQuery[];
};

export function groupDemandByTopic(rows: readonly DemandQuery[], locale = 'es'): DemandTopic[] {
  const groups = new Map<string, DemandTopic>();
  for (const row of rows) {
    const [topic] = rankTopics(row.query, locale, 1);
    const key = topic ? `${topic.kind}:${topic.value}` : 'none';
    const group =
      groups.get(key) ??
      (topic
        ? {
            kind: topic.kind,
            value: topic.value,
            title: topic.title,
            href: topic.href,
            empty: 0,
            searches: 0,
            queries: [],
          }
        : {
            kind: 'none' as const,
            value: '',
            title: '',
            href: null,
            empty: 0,
            searches: 0,
            queries: [],
          });
    group.empty += row.empty;
    group.searches += row.searches;
    group.queries.push(row);
    groups.set(key, group);
  }
  // Biggest unmet demand first; the searches no topic answers always last.
  return [...groups.values()]
    .map(group => ({
      ...group,
      queries: [...group.queries].sort(
        (a, b) => b.empty - a.empty || a.query.localeCompare(b.query),
      ),
    }))
    .sort(
      (a, b) =>
        Number(a.kind === 'none') - Number(b.kind === 'none') ||
        b.empty - a.empty ||
        a.title.localeCompare(b.title),
    );
}
