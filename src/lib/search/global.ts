import { getPostSummaries } from '@/lib/blog';
import { getPublicCollections } from '@/lib/library/community';
import { publicProducts } from '@/lib/solutions/public';
import { makeQueryScorer, rankSearch } from './score';
import { rankTopics } from './topics';

/**
 * Everything /buscar shows for one query (SHCWS-44), with the same scorer as the catalog
 * (synonyms, plurals and the vocabulary of declared categories): published listings,
 * public lists, blog articles and the category or industry pages that fit. Each part is
 * independent; one that can't be read comes back empty instead of failing the page.
 */
export async function globalSearch(query: string, locale: string) {
  const q = query.trim().slice(0, 200);
  const scorer = makeQueryScorer(q);
  if (!scorer) return { query: q, solutions: [], lists: [], articles: [], topics: [], total: 0 };
  const [products, lists] = await Promise.all([
    publicProducts().catch(() => []),
    getPublicCollections({ query: q })
      .then(result => result.collections.slice(0, 6))
      .catch(() => []),
  ]);
  const solutions = rankSearch(q, products).slice(0, 12);
  const top = <T>(items: { item: T; score: number }[], limit: number) =>
    items
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(entry => entry.item);
  const articles = top(
    getPostSummaries(locale).map(post => ({
      item: post,
      score: scorer({ name: post.title, description: post.excerpt, feature: post.categoryLabel }),
    })),
    6,
  );
  // Topic pages match by their own words and by the vocabulary their category implies.
  const topics = rankTopics(q, locale);
  return {
    query: q,
    solutions,
    lists,
    articles,
    topics,
    total: solutions.length + lists.length + articles.length + topics.length,
  };
}
