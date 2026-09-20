import Link from 'next/link';
import { SlidersHorizontal, Bookmark } from 'lucide-react';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { FilterMenu } from '@/components/catalog/filter-menu';
import { localizedIndustries, localizedCompanySizes, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { solutionCategories } from '@/lib/solutions/model';
import { communityHref, communitySearchFields, communityHasFilters, toggleAxis, type CommunityFilters } from '@/lib/library/community-url';

// The shape of dict.community (see src/i18n/dictionaries/es.ts and en.ts).
// Shared across every community component; each one only reads the slice it
// needs. Optional everywhere it's consumed — a caller without a locale keeps
// rendering the Spanish literal, same convention as dict.catalog/soluciones.
export type CommunityDict = {
  heroTitleLine1: string; heroTitleLine2: string; heroSubtitle: string; createList: string;
  filters: { industry: string; companySize: string; savedByMe: string; clear: string; all: string; searchLabel: string; searchPlaceholder: string; any: string; sort: { label: string; recent: string; popular: string } };
  listSingular: string; listPlural: string; projectSingular: string; projectPlural: string;
  emptyFilteredTitle: string; emptyTitle: string; emptyFilteredDesc: string; emptyDesc: string;
  clearFiltersLink: string; createListLink: string;
  pagination: { label: string; previous: string; next: string; pagePrefix: string };
  byPrefix: string; public: string; private: string; projectUnavailable: string;
  detail: { back: string; noProjects: string; footerNote: string };
  share: { copied: string; share: string; viewPublic: string; copyThisLink: string; copiedToClipboard: string };
  actions: { like: string; saveList: string; ownTitle: string; loginPrompt: string; loginSuffixParticipate: string; reportThisList: string; commentSingular: string; commentPlural: string; nameLabel: string; namePlaceholder: string; commentLabel: string; commentPlaceholder: string; publicNote: string; posting: string; submit: string; deleteLabel: string; reportCommentLabel: string; empty: string; genericError: string; deleteError: string; postError: string };
  report: { done: string; loginSuffixReport: string; reasonLabel: string; reasonSpam: string; reasonAbuse: string; reasonImpersonation: string; reasonOther: string; detailsLabel: string; saving: string; submit: string; genericError: string };
};

// Server Component: same visual language as CatalogFilterBar (§28) but every
// control is a <Link>. Community must round-trip to the server on every filter
// change — pagination and the result count live in SQL — so a client
// router.push would only add state that can drift from the URL. Works with no
// JS; ExpandingSearch is already a native GET form here.
export function CommunityFilterBar({ filters, total, canFilterSaved, locale, dict }: {
  filters: CommunityFilters;
  total: number;
  canFilterSaved: boolean;
  locale?: string;
  dict?: CommunityDict;
}) {
  const industryOptions = localizedIndustries(locale).map(item => ({ value: item.value, label: item.label }));
  const sizeOptions = localizedCompanySizes(locale).map(item => ({ value: item.value, label: item.label }));
  const sortOptions = [
    { value: 'recent', label: dict?.filters.sort.recent ?? 'Más recientes' },
    { value: 'popular', label: dict?.filters.sort.popular ?? 'Más populares' },
  ];
  return (
    <div className="mb-10 flex flex-col gap-4 border-b border-stone-200 pb-6">
      <nav aria-label="Categorías de listas" className="selector-tabs">
        <Link href={communityHref(filters, { categories: [] })} aria-current={filters.categories.length === 0 ? 'page' : undefined} className="selector-tab">{dict?.filters.all ?? 'Todas'}</Link>
        {solutionCategories.map(item => (
          <Link
            key={item}
            href={communityHref(filters, { categories: toggleAxis(filters.categories, item) })}
            aria-pressed={filters.categories.includes(item)}
            className="selector-tab"
          >
            {localizedCategoryDisplayLabel(item, locale)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterMenu
            label={dict?.filters.industry ?? 'Industria'}
            values={filters.industries}
            options={industryOptions}
            clearLabel={dict?.filters.any}
            href={value => communityHref(filters, { industries: toggleAxis(filters.industries, value) })}
            clearHref={communityHref(filters, { industries: [] })}
          />
          <FilterMenu
            label={dict?.filters.companySize ?? 'Tamaño de empresa'}
            values={filters.sizes}
            options={sizeOptions}
            clearLabel={dict?.filters.any}
            href={value => communityHref(filters, { sizes: toggleAxis(filters.sizes, value) })}
            clearHref={communityHref(filters, { sizes: [] })}
          />
          {canFilterSaved && (
            <Link
              href={communityHref(filters, { savedOnly: !filters.savedOnly })}
              aria-pressed={filters.savedOnly}
              className="selector-tab inline-flex items-center gap-2"
            >
              <Bookmark aria-hidden="true" className="size-3.5" />
              {dict?.filters.savedByMe ?? 'Guardadas por mí'}
            </Link>
          )}
          {communityHasFilters(filters) && (
            <Link href="/comunidad" className="ml-2 flex shrink-0 items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-stone-400 transition-colors hover:text-stone-900">
              <SlidersHorizontal className="size-3.5" />
              {dict?.filters.clear ?? 'Limpiar'}
            </Link>
          )}
        </div>

        <div className="relative flex items-center gap-4">
          <span className="text-[12.5px] text-stone-400">{total} {total === 1 ? (dict?.listSingular ?? 'lista') : (dict?.listPlural ?? 'listas')}</span>
          <ExpandingSearch
            className="community-search !absolute left-0 !ml-0 sm:!relative sm:left-auto sm:!ml-auto"
            key={`${filters.categories.join()}-${filters.industries.join()}-${filters.sizes.join()}-${filters.q}-${filters.sort}-${filters.savedOnly}`}
            label={dict?.filters.searchLabel ?? 'Buscar listas de la comunidad'}
            placeholder={dict?.filters.searchPlaceholder ?? 'Nombre de lista o de proyecto'}
            defaultValue={filters.q}
            action="/comunidad"
            fields={communitySearchFields(filters)}
            maxLength={100}
          />
          <FilterMenu
            label={dict?.filters.sort.label ?? 'Ordenar por'}
            values={[filters.sort]}
            options={sortOptions}
            allowClear={false}
            href={value => communityHref(filters, { sort: value as CommunityFilters['sort'] })}
            clearHref={communityHref(filters, { sort: 'recent' })}
          />
        </div>
      </div>
    </div>
  );
}
