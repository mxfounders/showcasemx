'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { useCallback } from 'react';

type FilterOption = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
};

export function CatalogFilterBar({
  filters,
  totalItems,
  sortOptions = [
    { value: 'popular', label: 'Más populares' },
    { value: 'newest', label: 'Más recientes' },
    { value: 'az', label: 'Nombre A-Z' }
  ]
}: {
  filters: FilterOption[];
  totalItems: number;
  sortOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      return params.toString();
    },
    [searchParams]
  );

  const activeFiltersCount = Array.from(searchParams.keys()).filter(k => k !== 'sort').length;

  return (
    <div className="sticky top-[72px] z-30 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 py-4 mb-6 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2.5 shrink-0">
        {filters.map((filter) => {
          const activeValue = searchParams.get(filter.id);
          const activeLabel = filter.options.find(o => o.value === activeValue)?.label;
          
          return (
            <div key={filter.id} className="relative group">
              <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={activeValue || ''}
                onChange={(e) => {
                  router.push(pathname + '?' + createQueryString(filter.id, e.target.value || null), { scroll: false });
                }}
              >
                <option value="">Cualquiera</option>
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13.5px] font-medium transition-colors pointer-events-none ${
                activeValue 
                  ? 'bg-[#E4EBFC] text-[#365DC4]' 
                  : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200 group-hover:text-stone-900'
              }`}>
                <span>{activeValue ? activeLabel : filter.label}</span>
                {activeValue ? (
                  <button 
                    className="pointer-events-auto relative z-10 ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(pathname + '?' + createQueryString(filter.id, null), { scroll: false });
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <X className="size-3" />
                  </button>
                ) : (
                  <ChevronDown className="size-3 text-stone-400" />
                )}
              </div>
            </div>
          );
        })}

        {activeFiltersCount > 0 && (
          <button
            onClick={() => router.push(pathname, { scroll: false })}
            className="flex items-center gap-1.5 ml-2 px-2 py-1 text-[12px] font-medium text-stone-400 hover:text-stone-900 transition-colors shrink-0"
          >
            <SlidersHorizontal className="size-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <div className="flex items-center shrink-0">
        <span className="text-[12.5px] text-stone-400 mr-6">
          Mostrando {totalItems} {totalItems === 1 ? 'solución' : 'soluciones'}
        </span>
        
        <div className="relative group cursor-pointer">
          <select
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            value={searchParams.get('sort') || 'popular'}
            onChange={(e) => {
              router.push(pathname + '?' + createQueryString('sort', e.target.value), { scroll: false });
            }}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-stone-700 pointer-events-none group-hover:text-stone-900 transition-colors">
            <span>{sortOptions.find(o => o.value === (searchParams.get('sort') || 'popular'))?.label}</span>
            <ChevronDown className="size-3 text-stone-400" />
          </div>
        </div>

        <details className="ml-2 shrink-0">
          <summary>Cómo se ordena</summary>
          <div className="mt-2 w-72 rounded-xl border border-stone-200 bg-white p-4 text-[12.5px] leading-relaxed text-stone-500 shadow-sm">
            <p>Un comentario pesa como 3, un guardado como 2, un like como 1, y las vistas 0.1 cada una. El orden refleja interacción real, empieza en cero y no es un aval de calidad ni un puntaje editorial — puede manipularse creando cuentas.</p>
          </div>
        </details>
      </div>
    </div>
  );
}
