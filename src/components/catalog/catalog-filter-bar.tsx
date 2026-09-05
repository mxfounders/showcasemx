'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FilterMenu, type FilterOption } from './filter-menu';

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
  sortOptions = [
    { value: 'popular', label: 'Más populares' },
    { value: 'newest', label: 'Más recientes' },
    { value: 'az', label: 'Nombre A-Z' }
  ]
}: {
  filters: FilterConfig[];
  totalItems: number;
  values: { [key: string]: string[] | undefined };
  onChange: (id: string, value: string) => void;
  onClear: () => void;
  sortOptions?: FilterOption[];
}) {
  const [openFilter, setOpenFilter] = useState('');
  const filterOpen = (id: string) => (open: boolean) => setOpenFilter(current => open ? id : current === id ? '' : current);
  const activeFiltersCount = Object.keys(values).filter(key => key !== 'sort' && (values[key]?.length ?? 0) > 0).length;

  return (
    <div className="sticky top-[72px] z-30 -mx-5 flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 mb-6">
      <div className="flex flex-wrap items-center gap-2.5">
        {filters.map(filter => (
          <FilterMenu
            key={filter.id}
            label={filter.label}
            values={values[filter.id] ?? []}
            options={filter.options}
            open={openFilter === filter.id}
            onOpenChange={filterOpen(filter.id)}
            onChange={value => onChange(filter.id, value)}
          />
        ))}

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 ml-2 px-2 py-1 text-[12px] font-medium text-stone-400 hover:text-stone-900 transition-colors shrink-0"
          >
            <SlidersHorizontal className="size-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="text-[12.5px] text-stone-400">
          Mostrando {totalItems} {totalItems === 1 ? 'solución' : 'soluciones'}
        </span>
        <FilterMenu
          label="Ordenar por"
          values={[values.sort?.[0] || 'popular']}
          options={sortOptions}
          allowClear={false}
          open={openFilter === 'sort'}
          onOpenChange={filterOpen('sort')}
          onChange={value => onChange('sort', value)}
        />
      </div>
    </div>
  );
}
