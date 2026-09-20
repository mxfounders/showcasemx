import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { getPublicCollections } from '@/lib/library/community';
import { readCommunityFilters, communityHref, communityHasFilters } from '@/lib/library/community-url';
import { CommunityFilterBar } from '@/components/library/community-filter-bar';
import { BoardCard } from '@/components/library/board-card';
import { CommunityIcon } from '@/components/library/community-icon';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Listas de la comunidad | shwcs', description: 'Descubre selecciones de software, agencias y servicios compartidas por la comunidad.' };

export default async function CommunityPage({ searchParams, params }: { searchParams: Promise<Record<string, string | undefined>>; params: Promise<{ locale: string }> }) {
  const filters = readCommunityFilters(await searchParams);
  const { locale } = await params;
  const dict = (await getDictionary(locale as Locale)).community;

  // Session is read on the server. `guardadas=1` is a boolean in the URL; the
  // account id it resolves to never is — a ?savedBy=<uuid> from a visitor
  // would enumerate another account's saved lists.
  let viewer = '';
  try { viewer = (await getSession((await cookies()).get(sessionCookie)?.value))?.id ?? ''; } catch { /* the public page still works without account storage */ }
  const savedBy = filters.savedOnly && viewer ? viewer : '';

  const { collections, hasMore, total } = await getPublicCollections({
    categories: filters.categories,
    industries: filters.industries,
    sizes: filters.sizes,
    query: filters.q,
    page: filters.page,
    sort: filters.sort,
    viewer,
    savedBy,
  });

  const active = communityHasFilters(filters);

  return (
    <section className={`mx-auto w-full max-w-[1500px] px-5 pb-24 sm:px-10 lg:px-16 ${active ? 'pt-20' : 'pt-16 sm:pt-24'}`}>
      {!active && (
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">{dict.heroTitleLine1}<br />{dict.heroTitleLine2}</h1>
            <p className="mt-5 text-base text-stone-500">{dict.heroSubtitle}</p>
          </div>
          <Link href="/account/lists" style={actionButtonStyle} className="action-button inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium">
            {dict.createList}<Plus className="size-4" aria-hidden="true" />
          </Link>
        </header>
      )}

      <CommunityFilterBar filters={filters} total={total} canFilterSaved={!!viewer} locale={locale} dict={dict} />

      {collections.length ? (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collections.map(collection => (
            <BoardCard
              key={collection.id}
              board={{ id: collection.id, name: collection.name, count: collection.count, covers: collection.covers, visibility: collection.visibility }}
              href={`/comunidad/${collection.id}`}
              byline={collection.curator}
              stats={{ likes: collection.likes, saves: collection.saves, comments: collection.comments }}
              dict={dict}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center py-12 text-center">
          <CommunityIcon className="mb-5 size-12 text-stone-300" />
          <h2 className="text-2xl font-medium tracking-tight">
            {active ? dict.emptyFilteredTitle : dict.emptyTitle}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
            {active ? dict.emptyFilteredDesc : dict.emptyDesc}
          </p>
          <Link href={active ? '/comunidad' : '/account/lists'} className="mt-6 inline-flex items-center gap-2 text-sm text-[#365DC4]">
            {active ? dict.clearFiltersLink : dict.createListLink}<ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {(filters.page > 1 || hasMore) && (
        <nav aria-label={dict.pagination.label} className="mt-12 flex items-center justify-between border-t border-stone-200 pt-6">
          {filters.page > 1
            ? <Link href={communityHref(filters, { page: filters.page - 1 })} className="inline-flex items-center gap-2 text-sm text-[#365DC4]"><ArrowLeft className="size-4" />{dict.pagination.previous}</Link>
            : <span />}
          <span className="text-xs text-stone-400">{dict.pagination.pagePrefix} {filters.page}</span>
          {hasMore
            ? <Link href={communityHref(filters, { page: filters.page + 1 })} className="inline-flex items-center gap-2 text-sm text-[#365DC4]">{dict.pagination.next}<ArrowRight className="size-4" /></Link>
            : <span />}
        </nav>
      )}
    </section>
  );
}
