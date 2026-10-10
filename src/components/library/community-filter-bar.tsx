import Link from '@/i18n/navigation';
import { SlidersHorizontal, Bookmark } from 'lucide-react';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { FilterMenu } from '@/components/catalog/filter-menu';
import {
  localizedIndustries,
  localizedCompanySizes,
  localizedCategoryDisplayLabel,
} from '@/lib/taxonomy';
import { solutionCategories } from '@/lib/solutions/model';
import type { Dictionary } from '@/i18n/dictionary';
import {
  communityHref,
  communitySearchFields,
  communityHasFilters,
  toggleAxis,
  type CommunityFilters,
} from '@/lib/library/community-url';
import { commonText } from '@/i18n/common';

// Server Component: same visual language as CatalogFilterBar (§28) but every
// control is a <Link>. Community must round-trip to the server on every filter
// change — pagination and the result count live in SQL — so a client
// router.push would only add state that can drift from the URL. Works with no
// JS; ExpandingSearch is already a native GET form here.
export function CommunityFilterBar({
  filters,
  total,
  canFilterSaved,
  locale,
  dict,
}: {
  filters: CommunityFilters;
  total: number;
  canFilterSaved: boolean;
  locale: string;
  dict: Dictionary['community'];
}) {
  const industryOptions = localizedIndustries(locale).map(item => ({
    value: item.value,
    label: item.label,
  }));
  const sizeOptions = localizedCompanySizes(locale).map(item => ({
    value: item.value,
    label: item.label,
  }));
  const sortOptions = [
    { value: 'recent', label: dict.filters.sort.recent },
    { value: 'popular', label: dict.filters.sort.popular },
  ];
  return (
    <div className="mb-10 flex flex-col gap-4 border-b border-stone-200 pb-6">
      <nav aria-label={dict.filters.categoriesLabel} className="selector-tabs">
        <Link
          href={communityHref(filters, { categories: [] })}
          aria-current={filters.categories.length === 0 ? 'page' : undefined}
          className="selector-tab"
        >
          {dict.filters.all}
        </Link>
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
            label={dict.filters.industry}
            values={filters.industries}
            options={industryOptions}
            clearLabel={dict.filters.any}
            href={value =>
              communityHref(filters, { industries: toggleAxis(filters.industries, value) })
            }
            clearHref={communityHref(filters, { industries: [] })}
          />
          <FilterMenu
            label={dict.filters.companySize}
            values={filters.sizes}
            options={sizeOptions}
            clearLabel={dict.filters.any}
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
              {dict.filters.savedByMe}
            </Link>
          )}
          {communityHasFilters(filters) && (
            <Link
              href="/comunidad"
              className="ml-2 flex shrink-0 items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-stone-400 transition-colors hover:text-stone-900"
            >
              <SlidersHorizontal className="size-3.5" />
              {dict.filters.clear}
            </Link>
          )}
        </div>

        <div className="relative flex items-center gap-4">
          <span className="text-[12.5px] text-stone-400">
            {total} {total === 1 ? dict.listSingular : dict.listPlural}
          </span>
          <ExpandingSearch
            clearLabel={commonText(locale).clearSearch}
            className="community-search !absolute left-0 !ml-0 sm:!relative sm:left-auto sm:!ml-auto"
            key={`${filters.categories.join()}-${filters.industries.join()}-${filters.sizes.join()}-${filters.q}-${filters.sort}-${filters.savedOnly}`}
            label={dict.filters.searchLabel}
            placeholder={dict.filters.searchPlaceholder}
            defaultValue={filters.q}
            action="/comunidad"
            fields={communitySearchFields(filters)}
            maxLength={100}
          />
          <FilterMenu
            label={dict.filters.sort.label}
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
