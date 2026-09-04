'use client';

import { useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';

type FilterOption = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
};

// Canonical dropdown pattern from CLAUDE.md §28: .selector-dropdown-trigger /
// .selector-menu-active, the same one used in SavedGallery. Replaces the
// invisible native <select> overlay this bar used before — no aria-label on
// the visible surface, single-select only, and it opened the native wheel on
// mobile instead of this floating menu.
function FilterMenu({ label, value, options, allowClear = true, open, onOpenChange, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allowClear?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const selected = options.find(option => option.value === value);
  return (
    <details open={open} onToggle={event => onOpenChange(event.currentTarget.open)} className="group relative shrink-0">
      <summary aria-label={label} data-selected={!!value} className="selector-dropdown-trigger [&::-webkit-details-marker]:hidden">
        <span className="max-w-40 truncate">{selected ? selected.label : label}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 text-stone-700 shadow-[0_18px_45px_-20px_rgba(41,37,36,0.35)]">
        {allowClear && (
          <button type="button" aria-pressed={!value} onClick={() => { onChange(''); onOpenChange(false); }} className={`flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${!value ? 'selector-menu-active' : ''}`}>
            <span>Cualquiera</span>
            {!value && <Check aria-hidden="true" className="size-4 shrink-0" />}
          </button>
        )}
        {options.map(option => {
          const active = value === option.value;
          return (
            <button key={option.value} type="button" aria-pressed={active} onClick={() => { onChange(option.value); onOpenChange(false); }} className={`flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${active ? 'selector-menu-active' : ''}`}>
              <span className="truncate">{option.label}</span>
              {active && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </details>
  );
}

// Controlled by CategoryPageLayout: a plain {id: value} map plus setters, no
// router/searchParams here. Filtering was already 100% client-side, so this
// component only needs to report intent — the parent decides what happens,
// including how (or whether) the URL reflects it.
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
  filters: FilterOption[];
  totalItems: number;
  values: { [key: string]: string | undefined };
  onChange: (id: string, value: string | null) => void;
  onClear: () => void;
  sortOptions?: { value: string; label: string }[];
}) {
  const [openFilter, setOpenFilter] = useState('');
  const filterOpen = (id: string) => (open: boolean) => setOpenFilter(current => open ? id : current === id ? '' : current);
  const activeFiltersCount = Object.keys(values).filter(k => k !== 'sort' && values[k]).length;

  return (
    <div className="sticky top-[72px] z-30 -mx-5 flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 mb-6">
      <div className="flex flex-wrap items-center gap-2.5">
        {filters.map(filter => (
          <FilterMenu
            key={filter.id}
            label={filter.label}
            value={values[filter.id] || ''}
            options={filter.options}
            open={openFilter === filter.id}
            onOpenChange={filterOpen(filter.id)}
            onChange={value => onChange(filter.id, value || null)}
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
          value={values.sort || 'popular'}
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
