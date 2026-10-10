'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from '@/i18n/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Grid2X2, List, ListFilter } from 'lucide-react';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { blogTones, formatBlogDate, type BlogCategory, type BlogPostSummary } from '@/lib/blog';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { commonText } from '@/i18n/common';

type View = 'grid' | 'list';

export function BlogIndex({
  dict,
  locale,
  posts: blogPosts,
}: {
  dict: Dictionary['blog'];
  locale: string;
  posts: BlogPostSummary[];
}) {
  const language = locale === 'en' ? 'en' : 'es';
  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          blogPosts.map((post): [BlogCategory, string] => [post.category, post.categoryLabel]),
        ),
      ),
    [blogPosts],
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<BlogCategory | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [view, setView] = useState<View>('grid');
  const [page, setPage] = useState(1);
  const POSTS_PER_PAGE = 12;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [query, category, sort]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const posts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language);
    return blogPosts
      .filter(post => category === null || post.category === category)
      .filter(
        post =>
          !normalized ||
          `${post.title} ${post.excerpt} ${post.categoryLabel}`
            .toLocaleLowerCase(language)
            .includes(normalized),
      )
      .sort((a, b) =>
        sort === 'title'
          ? a.title.localeCompare(b.title, language)
          : sort === 'oldest'
            ? a.publishedAt.localeCompare(b.publishedAt)
            : b.publishedAt.localeCompare(a.publishedAt),
      );
  }, [blogPosts, category, language, query, sort]);

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => {
      document
        .getElementById('blog-posts-top')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (page >= totalPages - 2)
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const featuredPosts = blogPosts.slice(0, 10);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
      <section className="mb-16 lg:mb-24">
        <div className="flex items-center justify-between mb-8 px-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-3xl">
            {dict.heroTitleIndex}
          </h1>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => scroll('left')}
              className="flex size-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-[#365DC4] hover:text-[#365DC4]"
              aria-label={dict.leftAria}
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex size-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-[#365DC4] hover:text-[#365DC4]"
              aria-label={dict.rightAria}
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory overflow-x-auto gap-6 pb-8 no-scrollbar -mx-5 px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
        >
          {featuredPosts.map(post => {
            const tone = blogTones[post.tone];
            return (
              <Link
                key={`featured-${post.slug}`}
                href={`/blog/${post.slug}`}
                className="group relative flex w-[85vw] max-w-[420px] shrink-0 snap-center snap-always flex-col overflow-hidden rounded-[32px] border border-stone-200 bg-white sm:w-[400px] shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="relative flex h-24 shrink-0 items-start p-6"
                  style={{ background: tone.background, color: tone.foreground }}
                >
                  <span className="w-fit rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-md">
                    {dict.featuredLabel}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#365DC4]">
                    {post.categoryLabel}
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold leading-[1.05] tracking-tight">
                    {post.title}
                  </h3>
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-500">
                    {post.excerpt}
                  </p>
                  <div className="mt-8 flex items-center gap-3 text-xs text-stone-400">
                    <time dateTime={post.publishedAt}>
                      {formatBlogDate(post.publishedAt, locale)}
                    </time>
                    <span>·</span>
                    <span>
                      {post.readingMinutes} {dict.minutesShort}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="flex items-center gap-2 border-b border-stone-200 pb-4 text-sm font-medium">
            <ListFilter className="size-4" />
            {dict.filterAndSort}
          </p>
          <label
            className="mt-5 block text-xs uppercase tracking-[0.16em] text-stone-400"
            htmlFor="blog-sort"
          >
            {dict.sortLabel}
          </label>
          <details className="group relative mt-2 w-fit lg:w-full">
            <summary
              id="blog-sort"
              className="selector-dropdown-trigger min-w-48 justify-between [&::-webkit-details-marker]:hidden lg:w-full"
            >
              <span>
                {sort === 'newest'
                  ? dict.sortNewest
                  : sort === 'oldest'
                    ? dict.sortOldest
                    : dict.sortTitle}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_18px_45px_-20px_rgba(41,37,36,0.35)]">
              {(
                [
                  ['newest', dict.sortNewest],
                  ['oldest', dict.sortOldest],
                  ['title', dict.sortTitle],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={sort === value}
                  onClick={event => {
                    setSort(value);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${sort === value ? 'selector-menu-active' : ''}`}
                >
                  {label}
                  {sort === value && <Check aria-hidden="true" className="size-4" />}
                </button>
              ))}
            </div>
          </details>
          <p className="mt-7 text-xs uppercase tracking-[0.16em] text-stone-400">
            {dict.categoryLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1 lg:block">
            {[[null, dict.allCategories] as const, ...categories].map(([item, label]) => (
              <button
                type="button"
                key={item ?? 'all'}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className="selector-tab block w-auto text-left lg:w-full"
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section id="blog-posts-top" className="scroll-mt-24">
          <div className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <p className="text-sm text-stone-400">
              {posts.length} {posts.length === 1 ? dict.articleCount : dict.articlesCount}
            </p>
            <div
              className="ml-auto hidden selector-tabs w-fit rounded-full bg-stone-100 p-1 sm:flex"
              aria-label={dict.viewAria}
            >
              <button
                type="button"
                aria-label={dict.gridLabel}
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
                className="selector-tab flex items-center gap-2"
              >
                <Grid2X2 className="h-4 w-4" />
                <span>{dict.gridLabel}</span>
              </button>
              <button
                type="button"
                aria-label={dict.listLabel}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className="selector-tab flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                <span>{dict.listLabel}</span>
              </button>
            </div>
            <ExpandingSearch
              clearLabel={commonText(locale).clearSearch}
              label={dict.searchPlaceholder}
              placeholder={dict.searchPlaceholder}
              value={query}
              onChange={setQuery}
            />
          </div>

          {posts.length ? (
            <>
              <div
                className={
                  view === 'grid'
                    ? 'mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3'
                    : 'mt-6 space-y-4'
                }
              >
                {paginatedPosts.map(post => {
                  const tone = blogTones[post.tone];
                  return (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className={`action-button group flex min-h-[470px] flex-col overflow-hidden rounded-[26px] border border-stone-200 bg-white ${view === 'list' ? 'sm:grid sm:min-h-56 sm:grid-cols-[250px_1fr]' : 'md:min-h-[510px]'}`}
                    >
                      <div
                        className={`relative flex items-start overflow-hidden p-6 ${view === 'list' ? 'min-h-32 sm:min-h-48' : 'min-h-40 md:min-h-48'}`}
                        style={{ background: tone.background, color: tone.foreground }}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
                          {post.categoryLabel}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-6 sm:p-7">
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <time dateTime={post.publishedAt}>
                            {formatBlogDate(post.publishedAt, locale)}
                          </time>
                          <span>·</span>
                          <span>
                            {post.readingMinutes} {dict.minutesShort}
                          </span>
                        </div>
                        <h2 className="mt-4 text-2xl font-semibold leading-[1.05] tracking-[-0.035em]">
                          {post.title}
                        </h2>
                        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-500">
                          {post.excerpt}
                        </p>
                        <span className="mt-auto flex items-center justify-between pt-7 text-sm font-medium text-[#365DC4]">
                          {dict.readArticle} <ArrowRight className="h-4 w-4 button-arrow" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-4 sm:gap-6 border-t border-stone-200 pt-10">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={actionButtonStyle}
                    className="action-button flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ArrowLeft className="size-4" /> {dict.previousPage}
                  </button>

                  <div className="flex items-center gap-1 sm:gap-2">
                    {getPageNumbers().map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="flex size-10 items-center justify-center text-[13.5px] text-stone-400"
                          >
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          style={page === p ? actionButtonStyle : undefined}
                          className={`flex size-10 items-center justify-center rounded-full text-[13.5px] font-medium transition-colors ${
                            page === p
                              ? 'action-button shadow-sm'
                              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    style={actionButtonStyle}
                    className="action-button flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {dict.nextPage} <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-[26px] border border-dashed border-stone-300 px-6 py-20 text-center">
              <p className="text-lg font-medium">{dict.emptyTitle}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory(null);
                }}
                className="mt-3 text-sm text-[#365DC4]"
              >
                {dict.clearFilters}
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="mt-20 border-t border-stone-200 pt-16 lg:mt-32">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          {dict.topicsTitle}
        </h3>
        <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
          {dict.topics.map(tag => (
            <button
              key={tag}
              type="button"
              className="action-button rounded-full bg-[#F4F5F7] px-4 py-2.5 text-[13px] font-medium text-stone-600 transition-colors hover:bg-[#E5E7EB] hover:text-stone-900"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
