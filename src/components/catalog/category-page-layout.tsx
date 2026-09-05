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
import { matchIndustry, matchCompanySize, isRealMatch } from '@/lib/search/facets';
import type { PublishedProduct } from '@/lib/solutions/public';

type Product = PublishedProduct;

// Filter option lists, sourced from src/lib/taxonomy.ts instead of a local
// copy. Category labels repeat (inventario and soporte both surface as
// "Operación"), so they're deduped for the menu; filtering still matches
// every route that shares that label.
const categoryFilterOptions = Array.from(new Map(categories.map(item => [item.label, item.label])).values()).map(label => ({ value: label, label }));
const industryFilterOptions = industries.map(item => ({ value: item.value, label: item.label }));
const sizeFilterOptions = companySizes.map(item => ({ value: item.value, label: item.label }));
const modelFilterOptions = offerings.map(value => ({ value, label: value }));

// Category and industry accept several values at once (OR within the axis);
// size, format and sort stay single.
const MULTI = new Set(['problema', 'industria']);

function readValues(raw: string | null): string[] {
  return raw ? raw.split(',').map(value => value.trim()).filter(Boolean) : [];
}

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
  // The URL is a mirror of this state via history.replaceState — it never
  // triggers a Next navigation or a server request (see CatalogFilterBar and
  // CLAUDE.md §52). Multi-value axes are stored comma-joined.
  const initial = useSearchParams();
  const [selections, setSelections] = useState<{ [key: string]: string[] }>(() => {
    const entries: [string, string[]][] = [];
    for (const [key, value] of initial.entries()) entries.push([key, readValues(value)]);
    return Object.fromEntries(entries);
  });

  const setFilter = useCallback((id: string, value: string) => {
    setSelections(current => {
      const next = { ...current };
      if (!value) { delete next[id]; return next; }
      if (MULTI.has(id)) {
        const list = next[id] ?? [];
        next[id] = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
        if (next[id].length === 0) delete next[id];
      } else {
        next[id] = [value];
      }
      return next;
    });
  }, []);
  const clearFilters = useCallback(() => setSelections({}), []);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(selections)) if (value.length) params.set(key, value.join(','));
    const query = params.toString();
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [selections]);

  // Contextual filters by route (CLAUDE.md §41): never offer the dimension the
  // user is already browsing by.
  const filters = useMemo(() => {
    if (basePath === '/explorar') {
      return [
        { id: 'industria', label: 'Industria', options: industryFilterOptions },
        { id: 'tamano', label: 'Tamaño de empresa', options: sizeFilterOptions },
        { id: 'modelo', label: 'Formato', options: modelFilterOptions },
      ];
    }
    if (basePath === '/industria') {
      return [
        { id: 'problema', label: 'Caso de uso', options: categoryFilterOptions },
        { id: 'tamano', label: 'Tamaño de empresa', options: sizeFilterOptions },
        { id: 'modelo', label: 'Formato', options: modelFilterOptions },
      ];
    }
    return [
      { id: 'problema', label: 'Caso de uso', options: categoryFilterOptions },
      { id: 'modelo', label: 'Formato', options: modelFilterOptions },
    ];
  }, [basePath]);

  const sortValue = selections.sort?.[0] ?? 'popular';

  const applySort = useCallback((list: Product[]) => {
    const result = [...list];
    if (sortValue === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortValue === 'newest') result.reverse();
    else result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return result;
  }, [sortValue]);

  // Each axis compares against the real declared field, not substrings in
  // free-text copy. matchIndustry() resolves the tri-state from
  // src/lib/solutions/model.ts: [] ("fits any") now matches every filter —
  // the bug where p.industries?.includes(x) silently excluded it — and a
  // product that never declared an industry but whose text strongly implies
  // one lands in the separate "También podrían servir" section, never mixed
  // into the declared results.
  const { primary, inferred } = useMemo(() => {
    const problema = selections.problema ?? [];
    const industria = selections.industria ?? [];
    const tamano = selections.tamano ?? [];
    const modelo = selections.modelo?.[0];

    const passesOthers = (product: Product) => {
      if (problema.length && !problema.some(value => product.category === value || product.categories?.includes(value))) return false;
      if (tamano.length && !tamano.some(value => isRealMatch(matchCompanySize(product, value)))) return false;
      if (modelo && product.offering !== modelo) return false;
      return true;
    };

    const primaryList: Product[] = [];
    const inferredList: Product[] = [];
    for (const product of products) {
      if (!passesOthers(product)) continue;
      if (!industria.length) { primaryList.push(product); continue; }
      const best = industria.map(value => matchIndustry(product, value));
      if (best.some(isRealMatch)) primaryList.push(product);
      else if (best.includes('inferred')) inferredList.push(product);
    }
    return { primary: applySort(primaryList), inferred: applySort(inferredList) };
  }, [products, selections, applySort]);

  const palette = getAccentStyle(basePath + '/' + categorySlug);

  const renderCard = (product: Product, index: number) => (
    <Link
      key={product.catalogId || product.detailUrl || product.name}
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
  );

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

      <CatalogFilterBar filters={filters} totalItems={primary.length} values={selections} onChange={setFilter} onClear={clearFilters} />

      {primary.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {primary.map(renderCard)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 py-32 text-center">
          <p className="text-lg font-medium text-stone-900">No encontramos soluciones</p>
          <p className="mt-2 max-w-sm text-sm text-stone-500">Intenta quitar algunos filtros o explora otras categorías relacionadas.</p>
        </div>
      )}

      {inferred.length > 0 && (
        <section className="mt-16">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">También podrían servir</h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-stone-500">
            No declararon esta industria, pero encajan por su categoría y por lo que describen. Confírmalo con cada proyecto.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inferred.map(renderCard)}
          </div>
        </section>
      )}
    </div>
  );
}
