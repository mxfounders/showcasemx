import { localizedCategories, localizedIndustries } from '@/lib/taxonomy';
import { solutionCapabilities } from '@/lib/solutions/model';
import { makeQueryScorer, queryTokens, type SearchableProduct } from './score';

export interface TopicMatch {
  kind: 'category' | 'industry';
  /** The canonical taxonomy value (`Cobros`, `Hospitalidad`), the same in every locale. */
  value: string;
  title: string;
  href: string;
  score: number;
}

// A page's description is presentation copy: words like «cobranza» or «control» appear in
// half of them. It counts a quarter as much as the page's own title and vocabulary, so an
// incidental word never outranks the page that is actually about it.
const DESCRIPTION_WEIGHT = 0.25;

/**
 * The category and industry pages a buyer's own words point at, best first (SHCWS-41):
 * «que me cobren a tiempo» → Cobros, «sistema para mi restaurante» → Hospitalidad. Same
 * scorer as the catalog; a category also answers to the capabilities filed under it
 * («facturación electrónica» is Cobros, not the page whose title says «electrónico»).
 * Pages that answer every word of the query come first, then by score. /buscar lists
 * these next to the listings.
 */
export function rankTopics(query: string, locale: string, limit = 6): TopicMatch[] {
  const scorers = queryTokens(query)
    .map(token => makeQueryScorer(token))
    .filter(scorer => scorer !== null);
  if (!scorers.length) return [];
  const rate = (subject: SearchableProduct, description: string) => {
    const perWord = scorers.map(
      scorer =>
        scorer(subject) + scorer({ name: '', description, feature: '' }) * DESCRIPTION_WEIGHT,
    );
    return {
      score: perWord.reduce((sum, value) => sum + value, 0),
      answered: perWord.filter(value => value > 0).length,
    };
  };
  return [
    ...localizedCategories(locale).map(category => ({
      kind: 'category' as const,
      value: category.label,
      title: category.title,
      href: `/explorar/${category.slug}`,
      ...rate(
        {
          name: category.title,
          description: '',
          feature: '',
          categories: [category.label],
          capabilities: solutionCapabilities
            .filter(item => item.category === category.label)
            .map(item => item.id),
        },
        category.description,
      ),
    })),
    ...localizedIndustries(locale).map(industry => ({
      kind: 'industry' as const,
      value: industry.value,
      title: industry.title,
      href: `/industria/${industry.slug}`,
      ...rate(
        { name: industry.title, description: '', feature: '', industries: [industry.value] },
        industry.description,
      ),
    })),
  ]
    .filter(topic => topic.score > 0)
    .sort((a, b) => b.answered - a.answered || b.score - a.score)
    .slice(0, limit)
    .map(({ kind, value, title, href, score }) => ({ kind, value, title, href, score }));
}
