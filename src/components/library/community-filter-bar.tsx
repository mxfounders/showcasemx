import Link from 'next/link';
import { SlidersHorizontal, Bookmark } from 'lucide-react';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { FilterMenu } from '@/components/catalog/filter-menu';
import { industries, companySizes } from '@/lib/taxonomy';
import { solutionCategories } from '@/lib/solutions/model';
import { communityHref, communitySearchFields, communityHasFilters, toggleAxis, type CommunityFilters } from '@/lib/library/community-url';

const industryOptions = industries.map(item => ({ value: item.value, label: item.label }));
const sizeOptions = companySizes.map(item => ({ value: item.value, label: item.label }));
const sortOptions = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'popular', label: 'Más populares' },
];

// Server Component: same visual language as CatalogFilterBar (§28) but every
// control is a <Link>. Community must round-trip to the server on every filter
// change — pagination and the result count live in SQL — so a client
// router.push would only add state that can drift from the URL. Works with no
// JS; ExpandingSearch is already a native GET form here.
export function CommunityFilterBar({ filters, total, canFilterSaved }: {
  filters: CommunityFilters;
  total: number;
  canFilterSaved: boolean;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 border-b border-stone-200 pb-6">
      <nav aria-label="Categorías de listas" className="selector-tabs">
        <Link href={communityHref(filters, { categories: [] })} aria-current={filters.categories.length === 0 ? 'page' : undefined} className="selector-tab">Todas</Link>
        {solutionCategories.map(item => (
          <Link
            key={item}
            href={communityHref(filters, { categories: toggleAxis(filters.categories, item) })}
            aria-pressed={filters.categories.includes(item)}
            className="selector-tab"
          >
            {item}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterMenu
            label="Industria"
            values={filters.industries}
            options={industryOptions}
            href={value => communityHref(filters, { industries: toggleAxis(filters.industries, value) })}
            clearHref={communityHref(filters, { industries: [] })}
          />
          <FilterMenu
            label="Tamaño de empresa"
            values={filters.sizes}
            options={sizeOptions}
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
              Guardadas por mí
            </Link>
          )}
          {communityHasFilters(filters) && (
            <Link href="/comunidad" className="ml-2 flex shrink-0 items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-stone-400 transition-colors hover:text-stone-900">
              <SlidersHorizontal className="size-3.5" />
              Limpiar
            </Link>
          )}
        </div>

        <div className="relative flex items-center gap-4">
          <span className="text-[12.5px] text-stone-400">{total} {total === 1 ? 'lista' : 'listas'}</span>
          <ExpandingSearch
            className="community-search !absolute left-0 !ml-0 sm:!relative sm:left-auto sm:!ml-auto"
            key={`${filters.categories.join()}-${filters.industries.join()}-${filters.sizes.join()}-${filters.q}-${filters.sort}-${filters.savedOnly}`}
            label="Buscar listas de la comunidad"
            placeholder="Nombre de lista o de proyecto"
            defaultValue={filters.q}
            action="/comunidad"
            fields={communitySearchFields(filters)}
            maxLength={100}
          />
          <FilterMenu
            label="Ordenar por"
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
