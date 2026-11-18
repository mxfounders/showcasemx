import { isFastResponder, type ResponseSignal } from '@/lib/solutions/response-model';
import { effectivePriceBand, matchesPricingModel, type PriceFields } from '@/lib/solutions/pricing';
import {
  isRealMatch,
  languageFit,
  marketFit,
  matchCapability,
  matchCompanySize,
  matchIndustry,
  type FacetSubject,
  type FitLevel,
  type MarketSubject,
} from './facets';

/**
 * The catalog's filter rules as a pure function, so a saved-search alert (SHCWS-47) can
 * ask «would this listing show in the main grid of that page with those filters?» on the
 * server. Same rules as CategoryPageLayout (src/components/catalog/category-page-layout.tsx):
 *
 * - hard axes (problema, integración, cumplimiento, precio, contratación, arranque, modelo,
 *   respuesta) are AND across axes and OR within one; a mismatch excludes the listing.
 *   «precio» compares the band the listing declared or, without one, the band its USD
 *   «Desde» price falls in (src/lib/solutions/pricing.ts);
 * - soft axes (industria, capacidad, tamaño, país, idioma): a declared match or «fits any»
 *   keeps it in the grid; a value only inferred from its text, or a size, market or
 *   support language never declared, sends it to «También podrían servir»; a declared
 *   mismatch excludes it. «país» means serves *and* invoices there (marketFit, SHCWS-56).
 *
 * Keep both in step: a change here belongs in the layout too, and the other way round.
 */
export interface FilterableProduct extends FacetSubject, PriceFields, MarketSubject {
  category?: string;
  categories?: string[];
  integrationKeys?: string[];
  compliance?: string[];
  setupTime?: string;
  offering?: string;
  response?: ResponseSignal | null;
}

export type CatalogSelections = Readonly<Record<string, readonly string[] | undefined>>;
export type SoftReason = 'industry' | 'capability' | 'companySize' | 'market' | 'language';
export type CatalogPlacement =
  { level: 'primary' } | { level: 'inferred'; reasons: SoftReason[] } | { level: 'excluded' };

/** Axes that take several values at once (OR within the axis). */
export const multiValueAxes = new Set([
  'problema',
  'industria',
  'capacidad',
  'integracion',
  'cumplimiento',
  'tamano',
  'contratacion',
  'pais',
  'idioma',
]);
/** Every axis a catalog page can filter by; `sort` orders and never filters. */
export const filterAxes = [
  'problema',
  'industria',
  'capacidad',
  'respuesta',
  'tamano',
  'integracion',
  'precio',
  'contratacion',
  'arranque',
  'cumplimiento',
  'modelo',
  'pais',
  'idioma',
] as const;
export type FilterAxis = (typeof filterAxes)[number];

function passesHard(product: FilterableProduct, selections: CatalogSelections) {
  const problema = selections.problema ?? [],
    integracion = selections.integracion ?? [],
    cumplimiento = selections.cumplimiento ?? [],
    precio = selections.precio?.[0],
    contratacion = selections.contratacion ?? [],
    arranque = selections.arranque?.[0],
    modelo = selections.modelo?.[0],
    respuesta = selections.respuesta?.[0];
  if (
    problema.length &&
    !problema.some(value => product.category === value || product.categories?.includes(value))
  )
    return false;
  if (integracion.length && !integracion.some(value => product.integrationKeys?.includes(value)))
    return false;
  if (cumplimiento.length && !cumplimiento.some(value => product.compliance?.includes(value)))
    return false;
  if (precio && effectivePriceBand(product) !== precio) return false;
  if (contratacion.length && !contratacion.some(value => matchesPricingModel(product, value)))
    return false;
  if (arranque && product.setupTime !== arranque) return false;
  if (modelo && product.offering !== modelo) return false;
  if (respuesta === 'rapido' && !isFastResponder(product.response)) return false;
  return true;
}

type Level = FitLevel;
/** OR within the axis: the best level any chosen value reaches. */
function bestFit(values: readonly string[], fit: (value: string) => Level): Level {
  if (!values.length) return 'real';
  const levels = values.map(fit);
  return levels.includes('real') ? 'real' : levels.includes('soft') ? 'soft' : 'fail';
}
function softLevel(values: readonly string[], match: (value: string) => string): Level {
  if (!values.length) return 'real';
  const levels = values.map(match);
  if (levels.some(level => level === 'declared' || level === 'any')) return 'real';
  return levels.includes('inferred') ? 'soft' : 'fail';
}

export function placeProduct(
  product: FilterableProduct,
  selections: CatalogSelections,
): CatalogPlacement {
  if (!passesHard(product, selections)) return { level: 'excluded' };
  const industry = softLevel(selections.industria ?? [], value => matchIndustry(product, value));
  const capability = softLevel(selections.capacidad ?? [], value =>
    matchCapability(product, value),
  );
  const sizes = selections.tamano ?? [];
  // matchCompanySize never infers: «never declared» is the gap the soft bucket exists for,
  // a declared size that doesn't fit is a real mismatch.
  const size: Level = !sizes.length
    ? 'real'
    : sizes.some(value => isRealMatch(matchCompanySize(product, value)))
      ? 'real'
      : product.companySizes === undefined
        ? 'soft'
        : 'fail';
  const market = bestFit(selections.pais ?? [], value => marketFit(product, value));
  const language = bestFit(selections.idioma ?? [], value => languageFit(product, value));
  if ([industry, capability, size, market, language].includes('fail')) return { level: 'excluded' };
  const reasons: SoftReason[] = [];
  if (industry === 'soft') reasons.push('industry');
  if (capability === 'soft') reasons.push('capability');
  if (size === 'soft') reasons.push('companySize');
  if (market === 'soft') reasons.push('market');
  if (language === 'soft') reasons.push('language');
  return reasons.length ? { level: 'inferred', reasons } : { level: 'primary' };
}
