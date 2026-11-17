'use client';

import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import { SearchDemandBeacon } from '@/components/search/search-demand-beacon';
import { useSearchParams } from 'next/navigation';
import Link from '@/i18n/navigation';
import type { Dictionary } from '@/i18n/dictionary';
import { CatalogFilterBar } from './catalog-filter-bar';
import { actionButtonStyle, getAccentStyle } from '@/lib/brand-colors';
import {
  categories,
  offerings,
  localizedCategories,
  localizedIndustries,
  localizedCompanySizes,
  localizedOfferingOptions,
  localizedCapabilitiesByCategory,
  localizedIntegrationOptions,
  localizedPriceBandOptions,
  localizedSetupTimeOptions,
  localizedComplianceOptions,
  localizedCategoryDisplayLabel,
} from '@/lib/taxonomy';
import { matchIndustry, matchCapability, matchCompanySize, isRealMatch } from '@/lib/search/facets';
import type { PublishedProduct } from '@/lib/solutions/public';
import { contactBriefHref } from '@/lib/contact-inquiry';
import { makeQueryScorer } from '@/lib/search/score';
import { commonText } from '@/i18n/common';
import { isFastResponder } from '@/lib/solutions/response-model';
import { CatalogCard } from './catalog-card';
import { SearchAlertButton } from '@/components/alerts/search-alert-button';
import { alertScopes, readAlertCriteria } from '@/lib/alerts/model';
import { filterAxes } from '@/lib/search/catalog-filter';

type Product = PublishedProduct;

// Category labels repeat (inventario and soporte both surface as
// "Operación"), so they're deduped for the menu; filtering still matches
// every route that shares that label. `value` always stays the canonical
// Spanish value products are matched against — only `label` is localized.
function categoryFilterOptions(locale?: string) {
  const seen = new Map<string, string>();
  for (const item of localizedCategories(locale))
    if (!seen.has(item.label)) seen.set(item.label, item.label);
  return Array.from(seen.keys()).map(value => ({
    value,
    label: localizedCategoryDisplayLabel(value, locale),
  }));
}
function industryFilterOptions(locale?: string) {
  return localizedIndustries(locale).map(item => ({ value: item.value, label: item.label }));
}
function sizeFilterOptions(locale?: string) {
  return localizedCompanySizes(locale).map(item => ({ value: item.value, label: item.label }));
}
// Every capability option, for routes with no single category to scope by
// (/industria, /colecciones). /explorar/[slug] scopes this down to the one
// category being browsed — see capabilityOptions below.
function capabilityFilterOptions(categoryLabels: string[], locale?: string) {
  return localizedCapabilitiesByCategory(categoryLabels, locale).flatMap(group =>
    group.items.map(item => ({ value: item.id, label: item.label })),
  );
}
const allCategoryLabels = [...new Set(categories.map(item => item.label))];

// Category, industry, capacity, integration, compliance and size all accept
// several values at once (OR within the axis); price band, setup time,
// format and sort stay single.
const MULTI = new Set([
  'problema',
  'industria',
  'capacidad',
  'integracion',
  'cumplimiento',
  'tamano',
]);

function readValues(raw: string | null): string[] {
  return raw
    ? raw
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
    : [];
}

// Only offer a filter value if at least one product in the current result set
// could actually satisfy it — a dropdown full of options that all lead to
// "no encontramos soluciones" isn't a filter, it's a wall of dead ends. This
// also means an axis with zero live options simply doesn't render (see the
// `.filter(f => f.options.length > 0)` below), which matters while the real
// catalogue is still one or two solutions deep.
function deriveOptions<T extends { value: string }>(
  options: T[],
  products: Product[],
  matches: (product: Product, value: string) => boolean,
): T[] {
  return options.filter(option => products.some(product => matches(product, option.value)));
}

export function CategoryPageLayout({
  title,
  description,
  categorySlug,
  basePath,
  products,
  locale,
  dict,
  alertDict,
  sponsored,
}: {
  title: string;
  description: string;
  categorySlug: string;
  basePath: string;
  products: Product[];
  locale?: string;
  dict: Dictionary['catalog'];
  /** «Avísame cuando haya algo nuevo» with this page's filters (SHCWS-47). */
  alertDict: Dictionary['alerts']['button'];
  /** Labelled paid placements, shown apart from (and unaffected by) the filtered results. */
  sponsored?: ReactNode;
}) {
  // The URL is a mirror of this state via history.replaceState — it never
  // triggers a Next navigation or a server request (see CatalogFilterBar and
  // CLAUDE.md §52). Multi-value axes are stored comma-joined.
  const initial = useSearchParams();
  const [selections, setSelections] = useState<{ [key: string]: string[] }>(() => {
    const entries: [string, string[]][] = [];
    for (const [key, value] of initial.entries())
      if (key !== 'q') entries.push([key, readValues(value)]);
    return Object.fromEntries(entries);
  });
  // Free text within the page (SHCWS-45): kept apart from the comma-joined facet values
  // because a query may itself contain commas.
  const [query, setQuery] = useState(() => (initial.get('q') ?? '').slice(0, 200));

  const setFilter = useCallback((id: string, value: string) => {
    setSelections(current => {
      const next = { ...current };
      if (!value) {
        delete next[id];
        return next;
      }
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
  // Sorting isn't filtering: an empty page with only a sort chosen has nothing to remove.
  const filtering =
    Boolean(query.trim()) ||
    Object.entries(selections).some(([key, value]) => key !== 'sort' && value.length > 0);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(selections))
      if (value.length) params.set(key, value.join(','));
    if (query.trim()) params.set('q', query.trim());
    const search = params.toString();
    window.history.replaceState(
      null,
      '',
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }, [selections, query]);

  // On /explorar/[slug] the capability filter is scoped to the one category
  // being browsed (a Ventas category page has no business offering Nómina
  // capabilities); elsewhere every category's capabilities are candidates,
  // trimmed by deriveOptions to whatever the result set actually declared.
  const capabilityOptions = useMemo(() => {
    if (basePath !== '/explorar') return capabilityFilterOptions(allCategoryLabels, locale);
    const info = categories.find(item => item.slug === categorySlug);
    return info
      ? capabilityFilterOptions([info.label], locale)
      : capabilityFilterOptions(allCategoryLabels, locale);
  }, [basePath, categorySlug, locale]);

  // Contextual filters by route (CLAUDE.md §41): never offer the dimension the
  // user is already browsing by. Every axis's options are then derived from
  // the actual result set (deriveOptions) and dropped entirely if empty —
  // see the .filter at the end, which is what keeps a one-solution catalogue
  // from rendering eight dropdowns that all say "Cualquiera" and nothing else.
  const filters = useMemo(() => {
    const modelFilterOptions = offerings.map(value => ({
      value,
      label: localizedOfferingOptions(locale).find(item => item.value === value)?.label ?? value,
    }));
    const capacidad = {
      id: 'capacidad',
      label: dict.filters.capability,
      options: deriveOptions(capabilityOptions, products, (p, v) => !!p.capabilities?.includes(v)),
    };
    const tamano = {
      id: 'tamano',
      label: dict.filters.companySize,
      options: deriveOptions(sizeFilterOptions(locale), products, (p, v) =>
        isRealMatch(matchCompanySize(p, v)),
      ),
    };
    const integracion = {
      id: 'integracion',
      label: dict.filters.integrations,
      options: deriveOptions(
        localizedIntegrationOptions(locale),
        products,
        (p, v) => !!p.integrationKeys?.includes(v),
      ),
    };
    const precio = {
      id: 'precio',
      label: dict.filters.priceBand,
      options: deriveOptions(
        localizedPriceBandOptions(locale),
        products,
        (p, v) => p.priceBand === v,
      ),
    };
    const arranque = {
      id: 'arranque',
      label: dict.filters.setupTime,
      options: deriveOptions(
        localizedSetupTimeOptions(locale),
        products,
        (p, v) => p.setupTime === v,
      ),
    };
    const cumplimiento = {
      id: 'cumplimiento',
      label: dict.filters.compliance,
      options: deriveOptions(
        localizedComplianceOptions(locale),
        products,
        (p, v) => !!p.compliance?.includes(v),
      ),
    };
    const modelo = {
      id: 'modelo',
      label: dict.filters.format,
      options: deriveOptions(modelFilterOptions, products, (p, v) => p.offering === v),
    };
    const problema = {
      id: 'problema',
      label: dict.filters.useCase,
      options: deriveOptions(
        categoryFilterOptions(locale),
        products,
        (p, v) => p.category === v || !!p.categories?.includes(v),
      ),
    };
    const industria = {
      id: 'industria',
      label: dict.filters.industry,
      options: deriveOptions(industryFilterOptions(locale), products, (p, v) =>
        isRealMatch(matchIndustry(p, v)),
      ),
    };

    // «Responde rápido» (SHCWS-52): offered only once some listing earns it.
    const respuesta = {
      id: 'respuesta',
      label: dict.filters.response,
      options: deriveOptions([{ value: 'rapido', label: dict.filters.fastResponse }], products, p =>
        isFastResponder(p.response),
      ),
    };

    const byRoute =
      basePath === '/explorar'
        ? [
            industria,
            capacidad,
            respuesta,
            tamano,
            integracion,
            precio,
            arranque,
            cumplimiento,
            modelo,
          ]
        : basePath === '/industria'
          ? [problema, capacidad, respuesta, tamano, integracion, precio, arranque, modelo]
          : [problema, capacidad, respuesta, tamano, modelo];

    return byRoute.filter(filter => filter.options.length > 0);
  }, [basePath, products, capabilityOptions, locale, dict]);

  const sortValue = selections.sort?.[0] ?? 'popular';

  const applySort = useCallback(
    (list: Product[]) => {
      const result = [...list];
      if (sortValue === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
      // A real chronological sort on published_at, not a reverse() of the
      // score-ranked order the server returns (that inverted the ranking
      // instead of ordering by date, and a missing date sorts last).
      else if (sortValue === 'newest')
        result.sort(
          (a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime(),
        );
      else result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return result;
    },
    [sortValue],
  );

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
    const respuesta = selections.respuesta?.[0];

    const passesHard = (product: Product) => {
      if (
        problema.length &&
        !problema.some(value => product.category === value || product.categories?.includes(value))
      )
        return false;
      if (
        integracion.length &&
        !integracion.some(value => product.integrationKeys?.includes(value))
      )
        return false;
      if (cumplimiento.length && !cumplimiento.some(value => product.compliance?.includes(value)))
        return false;
      if (precio && product.priceBand !== precio) return false;
      if (arranque && product.setupTime !== arranque) return false;
      if (modelo && product.offering !== modelo) return false;
      if (respuesta === 'rapido' && !isFastResponder(product.response)) return false;
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

    // Same scorer as the catalog search (synonyms, plurals, vocabulary of the declared
    // categories); with words typed, relevance leads and the chosen sort breaks ties.
    const scorer = makeQueryScorer(query, { requireLiteral: true });
    const relevance = (list: Product[]) =>
      scorer ? [...list].sort((a, b) => scorer(b) - scorer(a)) : list;
    const primaryList: Product[] = [];
    const inferredList: { product: Product; reasons: string[] }[] = [];
    for (const product of products) {
      if (scorer && scorer(product) <= 0) continue;
      if (!passesHard(product)) continue;
      const iLevel = industriaLevel(product),
        cLevel = capacidadLevel(product),
        tLevel = tamanoLevel(product);
      if (iLevel === 'fail' || cLevel === 'fail' || tLevel === 'fail') continue;
      if (iLevel === 'real' && cLevel === 'real' && tLevel === 'real') {
        primaryList.push(product);
        continue;
      }
      const reasons: string[] = [];
      if (iLevel === 'soft') reasons.push(dict.reasonIndustry);
      if (cLevel === 'soft') reasons.push(dict.reasonCapability);
      if (tLevel === 'soft') reasons.push(dict.reasonCompanySize);
      inferredList.push({ product, reasons });
    }
    return {
      primary: relevance(applySort(primaryList)),
      inferred: relevance(applySort(inferredList.map(item => item.product))).map(product =>
        inferredList.find(item => item.product === product)!,
      ),
    };
  }, [products, selections, query, applySort, dict]);

  const palette = getAccentStyle(basePath + '/' + categorySlug);

  // The alert keeps exactly what this page shows: its topic, words and filters (not the
  // sort, nor URL parameters that aren't filters). Invalid values hide the button.
  const alertCriteria = useMemo(() => {
    const scope = alertScopes.find(value => `/${value}` === basePath);
    if (!scope || scope === 'search') return null;
    const filters = Object.fromEntries(
      Object.entries(selections).filter(([key]) => (filterAxes as readonly string[]).includes(key)),
    );
    return readAlertCriteria({ scope, topic: categorySlug, query, filters });
  }, [basePath, categorySlug, query, selections]);

  const renderCard = (product: Product, index: number) => (
    <CatalogCard
      key={product.catalogId || product.detailUrl || product.name}
      product={product}
      index={index}
      palette={palette}
      locale={locale ?? 'es'}
      dict={dict}
    />
  );

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
      <SearchDemandBeacon
        query={query}
        results={primary.length + inferred.length}
        surface="category"
      />
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12 lg:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-semibold tracking-tight leading-[1.05] md:max-w-md lg:max-w-lg shrink-0">
          {title}
        </h1>
        <p className="max-w-lg text-[17px] leading-relaxed text-stone-500 md:pt-2">{description}</p>
      </div>

      {sponsored}

      <CatalogFilterBar
        filters={filters}
        totalItems={primary.length}
        values={selections}
        onChange={setFilter}
        onClear={clearFilters}
        query={query}
        onQueryChange={setQuery}
        clearSearchLabel={commonText(locale ?? 'es').clearSearch}
        dict={dict}
      />

      {primary.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {primary.map(renderCard)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 py-32 text-center">
          <p className="text-lg font-medium text-stone-900">{dict.noResultsTitle}</p>
          {/* «Remove filters» only makes sense when some filter is on. */}
          <p className="mt-2 max-w-sm text-sm text-stone-500">
            {filtering ? dict.noResultsDesc : dict.emptyPageDesc}
          </p>
          <Link
            href={contactBriefHref(query.trim() || title)}
            style={actionButtonStyle}
            className="action-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            {dict.briefCta}
            <span className="button-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      )}

      {inferred.length > 0 && (
        <section className="mt-16">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">
            {dict.alsoUsefulTitle}
          </h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-stone-500">
            {dict.alsoUsefulDesc}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inferred.map((item, index) => (
              <div key={item.product.catalogId || item.product.detailUrl || item.product.name}>
                {renderCard(item.product, index)}
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
                  {item.reasons.join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {alertCriteria && (
        <SearchAlertButton
          criteria={alertCriteria}
          dict={alertDict}
          className="mt-16 border-t border-stone-200 pt-8"
        />
      )}
    </div>
  );
}
