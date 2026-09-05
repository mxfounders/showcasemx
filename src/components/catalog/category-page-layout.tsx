'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { CatalogFilterBar } from './catalog-filter-bar';
import { ProductVisual } from '@/components/product-visual';
import { getAccentStyle } from '@/lib/brand-colors';
import { categories, industries, companySizes, offerings, capabilitiesByCategory, integrationOptions, priceBandOptions, setupTimeOptions, complianceOptions } from '@/lib/taxonomy';
import { matchIndustry, matchCapability, matchCompanySize, isRealMatch } from '@/lib/search/facets';
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
// Every capability option, for routes with no single category to scope by
// (/industria, /colecciones). /explorar/[slug] scopes this down to the one
// category being browsed — see capabilityOptions below.
function capabilityFilterOptions(categoryLabels: string[]) {
  return capabilitiesByCategory(categoryLabels).flatMap(group => group.items.map(item => ({ value: item.id, label: item.label })));
}
const allCapabilityOptions = capabilityFilterOptions([...new Set(categories.map(item => item.label))]);

// Category, industry, capacity, integration, compliance and size all accept
// several values at once (OR within the axis); price band, setup time,
// format and sort stay single.
const MULTI = new Set(['problema', 'industria', 'capacidad', 'integracion', 'cumplimiento', 'tamano']);

function readValues(raw: string | null): string[] {
  return raw ? raw.split(',').map(value => value.trim()).filter(Boolean) : [];
}

// Only offer a filter value if at least one product in the current result set
// could actually satisfy it — a dropdown full of options that all lead to
// "no encontramos soluciones" isn't a filter, it's a wall of dead ends. This
// also means an axis with zero live options simply doesn't render (see the
// `.filter(f => f.options.length > 0)` below), which matters while the real
// catalogue is still one or two solutions deep.
function deriveOptions<T extends { value: string }>(options: T[], products: Product[], matches: (product: Product, value: string) => boolean): T[] {
  return options.filter(option => products.some(product => matches(product, option.value)));
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

  // On /explorar/[slug] the capability filter is scoped to the one category
  // being browsed (a Ventas category page has no business offering Nómina
  // capabilities); elsewhere every category's capabilities are candidates,
  // trimmed by deriveOptions to whatever the result set actually declared.
  const capabilityOptions = useMemo(() => {
    if (basePath !== '/explorar') return allCapabilityOptions;
    const info = categories.find(item => item.slug === categorySlug);
    return info ? capabilityFilterOptions([info.label]) : allCapabilityOptions;
  }, [basePath, categorySlug]);

  // Contextual filters by route (CLAUDE.md §41): never offer the dimension the
  // user is already browsing by. Every axis's options are then derived from
  // the actual result set (deriveOptions) and dropped entirely if empty —
  // see the .filter at the end, which is what keeps a one-solution catalogue
  // from rendering eight dropdowns that all say "Cualquiera" and nothing else.
  const filters = useMemo(() => {
    const capacidad = { id: 'capacidad', label: 'Qué hace', options: deriveOptions(capabilityOptions, products, (p, v) => !!p.capabilities?.includes(v)) };
    const tamano = { id: 'tamano', label: 'Tamaño de empresa', options: deriveOptions(sizeFilterOptions, products, (p, v) => isRealMatch(matchCompanySize(p, v))) };
    const integracion = { id: 'integracion', label: 'Se integra con', options: deriveOptions(integrationOptions, products, (p, v) => !!p.integrationKeys?.includes(v)) };
    const precio = { id: 'precio', label: 'Rango de precio', options: deriveOptions(priceBandOptions, products, (p, v) => p.priceBand === v) };
    const arranque = { id: 'arranque', label: 'Tiempo de arranque', options: deriveOptions(setupTimeOptions, products, (p, v) => p.setupTime === v) };
    const cumplimiento = { id: 'cumplimiento', label: 'Cumplimiento', options: deriveOptions(complianceOptions, products, (p, v) => !!p.compliance?.includes(v)) };
    const modelo = { id: 'modelo', label: 'Formato', options: deriveOptions(modelFilterOptions, products, (p, v) => p.offering === v) };
    const problema = { id: 'problema', label: 'Caso de uso', options: deriveOptions(categoryFilterOptions, products, (p, v) => p.category === v || !!p.categories?.includes(v)) };
    const industria = { id: 'industria', label: 'Industria', options: deriveOptions(industryFilterOptions, products, (p, v) => isRealMatch(matchIndustry(p, v))) };

    const byRoute =
      basePath === '/explorar' ? [industria, capacidad, tamano, integracion, precio, arranque, cumplimiento, modelo] :
      basePath === '/industria' ? [problema, capacidad, tamano, integracion, precio, arranque, modelo] :
      [problema, capacidad, tamano, modelo];

    return byRoute.filter(filter => filter.options.length > 0);
  }, [basePath, products, capabilityOptions]);

  const sortValue = selections.sort?.[0] ?? 'popular';

  const applySort = useCallback((list: Product[]) => {
    const result = [...list];
    if (sortValue === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    // A real chronological sort on published_at, not a reverse() of the
    // score-ranked order the server returns (that inverted the ranking
    // instead of ordering by date, and a missing date sorts last).
    else if (sortValue === 'newest') result.sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());
    else result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return result;
  }, [sortValue]);

  // Each axis compares against the real declared field, not substrings in
  // free-text copy. Hard axes (problema, integración, cumplimiento, precio,
  // arranque, modelo) are a strict AND across axes, OR within each axis — a
  // real mismatch on any of them excludes the product outright. Industry,
  // capability and size are "soft": [] ("fits any", industry/size only) or a
  // declared match keeps a product in the main grid; a product that never
  // declared the axis but whose own text implies it (industry/capability via
  // matchIndustry/matchCapability's inference) — or never declared a size at
  // all — lands in the separate "También podrían servir" section, never
  // mixed into the declared results; a real declared mismatch on any axis,
  // soft or hard, excludes the product entirely.
  const { primary, inferred } = useMemo(() => {
    const problema = selections.problema ?? [];
    const industria = selections.industria ?? [];
    const capacidad = selections.capacidad ?? [];
    const tamano = selections.tamano ?? [];
    const integracion = selections.integracion ?? [];
    const cumplimiento = selections.cumplimiento ?? [];
    const precio = selections.precio?.[0];
    const arranque = selections.arranque?.[0];
    const modelo = selections.modelo?.[0];

    const passesHard = (product: Product) => {
      if (problema.length && !problema.some(value => product.category === value || product.categories?.includes(value))) return false;
      if (integracion.length && !integracion.some(value => product.integrationKeys?.includes(value))) return false;
      if (cumplimiento.length && !cumplimiento.some(value => product.compliance?.includes(value))) return false;
      if (precio && product.priceBand !== precio) return false;
      if (arranque && product.setupTime !== arranque) return false;
      if (modelo && product.offering !== modelo) return false;
      return true;
    };

    // 'real' passes outright; 'soft' lands the product in "También podrían
    // servir" (with a reason) as long as nothing else was a hard 'fail';
    // 'fail' excludes the product from both lists.
    const industriaLevel = (product: Product): 'real' | 'soft' | 'fail' => {
      if (!industria.length) return 'real';
      const levels = industria.map(value => matchIndustry(product, value));
      if (levels.some(isRealMatch)) return 'real';
      return levels.includes('inferred') ? 'soft' : 'fail';
    };
    const capacidadLevel = (product: Product): 'real' | 'soft' | 'fail' => {
      if (!capacidad.length) return 'real';
      const levels = capacidad.map(value => matchCapability(product, value));
      if (levels.some(isRealMatch)) return 'real';
      return levels.includes('inferred') ? 'soft' : 'fail';
    };
    const tamanoLevel = (product: Product): 'real' | 'soft' | 'fail' => {
      if (!tamano.length) return 'real';
      if (tamano.some(value => isRealMatch(matchCompanySize(product, value)))) return 'real';
      // matchCompanySize never infers (see facets.ts) — a 'none' here could
      // mean "declared, doesn't match" (a real fail) or "never answered"
      // (the actual gap this bucket exists for); only the latter is soft.
      return product.companySizes === undefined ? 'soft' : 'fail';
    };

    const primaryList: Product[] = [];
    const inferredList: { product: Product; reasons: string[] }[] = [];
    for (const product of products) {
      if (!passesHard(product)) continue;
      const iLevel = industriaLevel(product), cLevel = capacidadLevel(product), tLevel = tamanoLevel(product);
      if (iLevel === 'fail' || cLevel === 'fail' || tLevel === 'fail') continue;
      if (iLevel === 'real' && cLevel === 'real' && tLevel === 'real') { primaryList.push(product); continue; }
      const reasons: string[] = [];
      if (iLevel === 'soft') reasons.push('No declaró esa industria');
      if (cLevel === 'soft') reasons.push('No declaró esa capacidad');
      if (tLevel === 'soft') reasons.push('No declaró tamaño de empresa');
      inferredList.push({ product, reasons });
    }
    return {
      primary: applySort(primaryList),
      inferred: applySort(inferredList.map(item => item.product)).map(product => inferredList.find(item => item.product === product)!),
    };
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
            No declararon todo lo que filtraste, pero encajan por su categoría y por lo que describen. Confírmalo con cada proyecto.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inferred.map((item, index) => (
              <div key={item.product.catalogId || item.product.detailUrl || item.product.name}>
                {renderCard(item.product, index)}
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400">{item.reasons.join(' · ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
