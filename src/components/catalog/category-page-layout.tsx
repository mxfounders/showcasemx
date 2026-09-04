'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { CatalogFilterBar } from './catalog-filter-bar';
import { ProductVisual } from '@/components/product-visual';
import { getAccentStyle } from '@/lib/brand-colors';
import { categories, industries, companySizes, offerings } from '@/lib/taxonomy';
import type { PublishedProduct } from '@/lib/solutions/public';

type Product = PublishedProduct;

// Filter option lists, sourced from src/lib/taxonomy.ts instead of a local
// copy — the "tamano" filter here used to compare pyme/midmarket/enterprise
// against free-text description fields and never matched anything, and
// "industria" was missing Construcción. Category labels repeat (inventario
// and soporte both surface as "Operación"), so they're deduped for the menu;
// filtering still matches every route that shares that label.
const categoryFilterOptions = Array.from(new Map(categories.map(item => [item.label, item.label])).values()).map(label => ({ value: label, label }));
const industryFilterOptions = industries.map(item => ({ value: item.value, label: item.label }));
const sizeFilterOptions = companySizes.map(item => ({ value: item.value, label: item.label }));
const modelFilterOptions = offerings.map(value => ({ value, label: value }));

export function CategoryPageLayout({
  title,
  description,
  categorySlug,
  basePath,
  products,
}: {
  title: string;
  description: string;
  categorySlug: string;
  basePath: string;
  products: Product[];
}) {
  // Filtering was already 100% client-side (see below) — the only thing a
  // router.push() on every filter click bought us was a full server round-trip
  // for a re-render whose result never depended on the server. State now lives
  // here and the URL is a mirror of it via history.replaceState, which never
  // triggers Next navigation or a server request. See CatalogFilterBar.
  const initial = useSearchParams();
  const [searchParams, setSearchParams] = useState<{ [key: string]: string | undefined }>(() => Object.fromEntries(initial.entries()));

  const setFilter = useCallback((id: string, value: string | null) => {
    setSearchParams(current => {
      const next = { ...current };
      if (value === null) delete next[id]; else next[id] = value;
      return next;
    });
  }, []);
  const clearFilters = useCallback(() => setSearchParams({}), []);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) if (value) params.set(key, value);
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [searchParams]);


  // Dynamic Contextual Filters depending on where the user is
  const filters = useMemo(() => {
    if (basePath === '/explorar') {
      // User is looking at a specific Problem (e.g., Cobros). Allow filtering by Industry and Size.
      return [
        { id: 'industria', label: 'Industria específica', options: industryFilterOptions },
        { id: 'tamano', label: 'Tamaño de empresa', options: sizeFilterOptions },
        { id: 'modelo', label: 'Formato', options: modelFilterOptions }
      ];
    }
    if (basePath === '/industria') {
      // User is looking at a specific Industry (e.g., Retail). Allow filtering by Problem and Size.
      return [
        { id: 'problema', label: 'Caso de uso', options: categoryFilterOptions },
        { id: 'tamano', label: 'Tamaño de empresa', options: sizeFilterOptions },
        { id: 'modelo', label: 'Formato', options: modelFilterOptions }
      ];
    }
    // Default for /colecciones
    return [
      { id: 'problema', label: 'Caso de uso', options: categoryFilterOptions },
      { id: 'modelo', label: 'Formato', options: modelFilterOptions }
    ];
  }, [basePath]);

  // Filtering Logic. Each filter compares against the real declared field
  // (categories/industries/companySizes) instead of matching substrings in
  // free-text description/feature copy. A product that never declared
  // industries/companySizes simply doesn't match a specific filter for that
  // dimension — that's a real, honest gap, not a bug: see SolutionData in
  // src/lib/solutions/model.ts, where undefined means "never answered".
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchParams.industria) result = result.filter(p => p.industries?.includes(searchParams.industria!));
    if (searchParams.problema) result = result.filter(p => p.category === searchParams.problema || p.categories?.includes(searchParams.problema!));
    if (searchParams.tamano) result = result.filter(p => p.companySizes?.includes(searchParams.tamano!));
    if (searchParams.modelo) result = result.filter(p => p.offering === searchParams.modelo);

    // Sorting
    if (searchParams.sort === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (searchParams.sort === 'newest') {
      // No publish-date field is exposed on these product rows yet; this is an
      // approximation of "newest first" over the server's default order, not a
      // real date sort. See src/lib/solutions/public.ts if that's ever added.
      result.reverse();
    } else {
      // 'popular' (the default): real interaction — comments > saves > likes >
      // views. See src/lib/solutions/ranking.ts. Static examples score 0 and
      // sink to the bottom, which is correct: nothing real has happened yet.
      result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    return result;
  }, [products, searchParams]);

  const palette = getAccentStyle(basePath + '/' + categorySlug);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12 lg:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-semibold tracking-tight leading-[1.05] md:max-w-md lg:max-w-lg shrink-0">
          {title}
        </h1>
        <p className="max-w-lg text-[17px] leading-relaxed text-stone-500 md:pt-2">
          {description}
        </p>
      </div>

      <CatalogFilterBar filters={filters} totalItems={filteredProducts.length} values={searchParams} onChange={setFilter} onClear={clearFilters} />

      {filteredProducts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product, index) => (
            <Link 
              key={product.catalogId || product.name} 
              href={product.detailUrl || '#'}
              className="group flex flex-col justify-between rounded-[24px] border border-stone-200 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-200/50"
            >
              <div>
                {product.website ? (
                  <div className="relative flex h-36 shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-[16px]" style={{ backgroundColor: palette.backgroundColor, color: palette.color }}>
                    {product.ogImage ? (
                      <Image src={product.ogImage} alt={product.name} fill sizes="(min-width: 640px) 30vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <>
                        <span className="text-[28px] font-semibold tracking-[-0.04em]">{product.name}</span>
                        <span className="text-[10px] opacity-80">{new URL(product.website).hostname}</span>
                      </>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[9px] font-medium uppercase tracking-widest text-stone-800 backdrop-blur-md">{product.offering}</span>
                  </div>
                ) : (
                  <ProductVisual variant={index % 4} color={palette.backgroundColor} />
                )}
                
                <div className="flex items-center gap-3 pt-5">
                  {product.favicon || product.website ? (
                    <img src={product.favicon || `https://www.google.com/s2/favicons?domain=${product.website}&sz=128`} alt="" className="size-8 shrink-0 rounded-[8px] object-contain" />
                  ) : (
                    <span aria-hidden="true" style={{ backgroundColor: palette.color }} className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-xs font-semibold text-white">
                      {product.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="text-lg font-semibold tracking-tight text-stone-900">{product.name}</span>
                  <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-stone-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                
                <p className="line-clamp-2 pt-3 text-[13px] leading-relaxed text-stone-500">{product.description}</p>
              </div>
              
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-[11px] font-medium text-stone-400">
                <span className="truncate pr-4">{product.provider || product.name}</span>
                <span className="inline-flex shrink-0 items-center text-[#365DC4]">Conocer solución</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 py-32 text-center">
          <p className="text-lg font-medium text-stone-900">No encontramos soluciones</p>
          <p className="mt-2 max-w-sm text-sm text-stone-500">Intenta quitar algunos filtros o explora otras categorías relacionadas.</p>
        </div>
      )}
    </div>
  );
}
