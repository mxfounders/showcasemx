'use client';

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionary';
import { FilterMenu, type FilterOption } from './filter-menu';

// Beyond three axes, dropdowns stop fitting one row (capabilities alone add
// a fourth on /explorar, plus integrations/price/setup/compliance). Rather
// than wrap them awkwardly, the first three stay always visible and the rest
// collapse behind a "Más filtros" disclosure — same .selector-dropdown-trigger
// styling as every other filter, so it doesn't read as a different control.
const PRIMARY_COUNT = 3;

type FilterConfig = {
  id: string;
  label: string;
  options: FilterOption[];
};

// Controlled by CategoryPageLayout: `values` is an id -> string[] map (one
// entry, or several for the multi-select axes), plus setters. No
// router/searchParams here — filtering is 100% client-side and the parent
// mirrors the state into the URL with history.replaceState.
export function CatalogFilterBar({
  filters,
  totalItems,
  values,
  onChange,
  onClear,
  dict,
  sortOptions,
}: {
  filters: FilterConfig[];
  totalItems: number;
  values: { [key: string]: string[] | undefined };
  onChange: (id: string, value: string) => void;
  onClear: () => void;
  dict: Dictionary['catalog'];
  sortOptions?: FilterOption[];
}) {
  const [openFilter, setOpenFilter] = useState('');
  const [showMore, setShowMore] = useState(false);
  const filterOpen = (id: string) => (open: boolean) =>
    setOpenFilter(current => (open ? id : current === id ? '' : current));
  const activeFiltersCount = Object.keys(values).filter(
    key => key !== 'sort' && (values[key]?.length ?? 0) > 0,
  ).length;

  const resolvedSortOptions = sortOptions ?? [
    { value: 'popular', label: dict.sort.popular },
    { value: 'newest', label: dict.sort.newest },
    { value: 'az', label: dict.sort.az },
  ];

  const primaryFilters = filters.slice(0, PRIMARY_COUNT);
  const overflowFilters = filters.slice(PRIMARY_COUNT);
  const overflowActiveCount = overflowFilters.filter(
    filter => (values[filter.id]?.length ?? 0) > 0,
  ).length;

  const renderFilter = (filter: FilterConfig) => (
    <FilterMenu
      key={filter.id}
      label={filter.label}
      values={values[filter.id] ?? []}
      options={filter.options}
      clearLabel={dict.any}
      open={openFilter === filter.id}
      onOpenChange={filterOpen(filter.id)}
      onChange={value => onChange(filter.id, value)}
    />
  );

  return (
    <div className="sticky top-[72px] z-30 -mx-5 flex flex-col gap-3 px-5 py-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {primaryFilters.map(renderFilter)}

          {overflowFilters.length > 0 && (
            <button
              type="button"
              aria-expanded={showMore}
              data-selected={overflowActiveCount > 0}
              onClick={() => setShowMore(current => !current)}
              className="selector-dropdown-trigger"
            >
              <span>
                {dict.moreFilters}
                {overflowActiveCount > 0 ? ` · ${overflowActiveCount}` : ''}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${showMore ? 'rotate-180' : ''}`}
              />
            </button>
          )}

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 ml-2 px-2 py-1 text-[12px] font-medium text-stone-400 hover:text-stone-900 transition-colors shrink-0"
            >
              <SlidersHorizontal className="size-3.5" />
              {dict.clear}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[12.5px] text-stone-400">
            {dict.showingPrefix} {totalItems}{' '}
            {totalItems === 1 ? dict.solutionSingular : dict.solutionPlural}
          </span>
          <FilterMenu
            label={dict.sort.label}
            values={[values.sort?.[0] || 'popular']}
            options={resolvedSortOptions}
            allowClear={false}
            open={openFilter === 'sort'}
            onOpenChange={filterOpen('sort')}
            onChange={value => onChange('sort', value)}
          />
        </div>
      </div>

      {showMore && overflowFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {overflowFilters.map(renderFilter)}
        </div>
      )}
    </div>
  );
}
