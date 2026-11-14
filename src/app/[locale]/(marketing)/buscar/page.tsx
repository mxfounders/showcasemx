import type { Metadata } from 'next';
import { SearchDemandBeacon } from '@/components/search/search-demand-beacon';
import Link from '@/i18n/navigation';
import { ArrowRightIcon, SearchIcon } from '@/components/icons/gota';
import { BoardCard } from '@/components/library/board-card';
import { ProjectMark } from '@/components/project-mark';
import { actionButtonStyle } from '@/lib/brand-colors';
import { contactBriefHref } from '@/lib/contact-inquiry';
import { globalSearch } from '@/lib/search/global';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
import { SearchAlertButton } from '@/components/alerts/search-alert-button';
import { readAlertCriteria } from '@/lib/alerts/model';

// One page for the whole site's search (SHCWS-44): listings, public lists, articles and
// topic pages for the same words. Query URLs are kept out of crawling by robots.ts; a
// query with no results is also `noindex`.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};
const readQuery = (value: string | string[] | undefined) =>
  (typeof value === 'string' ? value : '').trim().slice(0, 200);

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [{ locale }, { q }] = await Promise.all([props.params, props.searchParams]);
  const query = readQuery(q);
  const t = (await getDictionary(locale)).catalog.searchPage;
  const results = query ? await globalSearch(query, locale) : null;
  return {
    title: `${query ? t.title.replace('{query}', query) : t.metaTitle} | shwcs`,
    robots: results && results.total > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function SearchPage(props: Props) {
  const [{ locale }, { q }] = await Promise.all([props.params, props.searchParams]);
  const query = readQuery(q);
  const dictionary = await getDictionary(locale);
  const t = dictionary.catalog.searchPage;
  const results = await globalSearch(query, locale);
  // «Avísame» for these words (SHCWS-47); null when the query has no words that search.
  const alertCriteria = readAlertCriteria({ scope: 'search', query });
  return (
    <section className="mx-auto w-full max-w-[1500px] px-5 pb-24 pt-14 sm:px-10 sm:pt-20 lg:px-16">
      <SearchDemandBeacon query={query} results={results.total} surface="search" />
      <h1 className="max-w-4xl break-words text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
        {query ? t.title.replace('{query}', query) : t.titleEmpty}
      </h1>
      <form action={`/${locale}/buscar`} role="search" className="mt-8 flex max-w-2xl gap-2">
        <label htmlFor="global-search" className="sr-only">
          {t.label}
        </label>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 focus-within:border-[#365DC4]/50">
          <SearchIcon aria-hidden="true" className="size-4 text-stone-400" />
          <input
            id="global-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={200}
            placeholder={t.placeholder}
            className="h-12 w-full bg-transparent text-[15px] outline-none"
          />
        </div>
        <button
          type="submit"
          style={actionButtonStyle}
          className="action-button rounded-full px-6 text-sm font-medium"
        >
          {t.submit}
        </button>
      </form>
      {alertCriteria && (
        <SearchAlertButton
          criteria={alertCriteria}
          dict={dictionary.alerts.button}
          className="mt-5"
        />
      )}

      {query && results.total === 0 && (
        <div className="mt-14 rounded-3xl border border-dashed border-stone-300 p-8 sm:p-12">
          <h2 className="text-2xl font-medium tracking-tight">
            {t.noResults.replace('{query}', query)}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500">{t.noResultsDesc}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={contactBriefHref(query)}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              {t.brief}
              <ArrowRightIcon aria-hidden="true" className="size-4 button-arrow" />
            </Link>
            <Link
              href="/#catalogo"
              className="inline-flex items-center rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700"
            >
              {t.explore}
            </Link>
          </div>
        </div>
      )}

      {results.topics.length > 0 && (
        <section className="mt-14" aria-labelledby="search-topics">
          <h2 id="search-topics" className="text-lg font-semibold tracking-tight">
            {t.topics}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {results.topics.map(topic => (
              <Link
                key={topic.href}
                href={topic.href}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:border-stone-400"
              >
                {topic.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.solutions.length > 0 && (
        <section className="mt-14" aria-labelledby="search-solutions">
          <h2 id="search-solutions" className="text-lg font-semibold tracking-tight">
            {t.solutions} <span className="text-stone-400">{results.solutions.length}</span>
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.solutions.map(product => (
              <li key={product.detailUrl ?? product.name}>
                <Link
                  href={product.detailUrl ?? '/#catalogo'}
                  className="flex h-full gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <ProjectMark
                    name={product.name}
                    favicon={product.favicon}
                    size={44}
                    className="size-11 shrink-0 overflow-hidden rounded-xl border border-stone-200"
                    imageClassName="object-contain bg-white"
                    fallbackClassName="flex items-center justify-center bg-stone-100 text-sm font-semibold text-stone-700"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-stone-900">{product.name}</span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-stone-500">
                      {product.description}
                    </span>
                    <span className="mt-2 block text-xs text-stone-400">
                      {product.categories
                        .map(category => localizedCategoryDisplayLabel(category, locale))
                        .join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.lists.length > 0 && (
        <section className="mt-14" aria-labelledby="search-lists">
          <h2 id="search-lists" className="text-lg font-semibold tracking-tight">
            {t.lists} <span className="text-stone-400">{results.lists.length}</span>
          </h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.lists.map(list => (
              <BoardCard
                key={list.id}
                board={list}
                href={`/comunidad/${list.id}`}
                byline={list.curator}
                stats={{ likes: list.likes, saves: list.saves, comments: list.comments }}
                dict={dictionary.community}
              />
            ))}
          </div>
        </section>
      )}

      {results.articles.length > 0 && (
        <section className="mt-14" aria-labelledby="search-articles">
          <h2 id="search-articles" className="text-lg font-semibold tracking-tight">
            {t.articles} <span className="text-stone-400">{results.articles.length}</span>
          </h2>
          <ul className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {results.articles.map(post => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block py-5">
                  <span className="text-xs uppercase tracking-[0.15em] text-stone-400">
                    {post.categoryLabel}
                  </span>
                  <span className="mt-1 block text-lg font-medium text-stone-900 group-hover:text-[#365DC4]">
                    {post.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-stone-500">
                    {post.excerpt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
