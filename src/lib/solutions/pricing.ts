import { commonText } from '@/i18n/common';
import { formatMoney } from '@/lib/currencies';
import {
  localizedPriceBandOptions,
  localizedPricingModelOptions,
  localizedPriceUnitSuffix,
} from '@/lib/taxonomy';
import { monthlyPriceBands, projectPriceBands, type SolutionData } from './model';

/**
 * Price that helps decide (SHCWS-51): the declared «Desde» amount in the founder's own
 * currency, the pricing model and a band in US dollars so listings in any currency can be
 * filtered together. Everything here reads what the project declared; nothing converts
 * currencies or fills a gap. Shared by the cards, the listing, the comparator, the
 * catalog filter, the machine-readable listing and the JSON-LD offer.
 */
export type PriceFields = Pick<
  SolutionData,
  'priceFrom' | 'priceCurrency' | 'priceUnit' | 'priceBand' | 'pricingModel'
>;

export type PriceBandFamily = 'monthly' | 'project';

/** Models whose cost is recurring, so their band reads per month. */
const monthlyModels = new Set(['suscripcion-mensual', 'suscripcion-anual', 'por-uso', 'comision']);
/** Models charged per piece of work: agencies and services quote a budget per project. */
const projectModels = new Set(['por-proyecto', 'pago-unico', 'por-hora']);

/**
 * Which band families the editor offers for the declared models. A model that only
 * says «quote» (or none at all) keeps both: nothing tells which one fits yet.
 */
export function priceBandFamilies(models: readonly string[] | undefined): PriceBandFamily[] {
  const monthly = !!models?.some(model => monthlyModels.has(model));
  const project = !!models?.some(model => projectModels.has(model));
  if (!monthly && !project) return ['monthly', 'project'];
  return [...(monthly ? ['monthly' as const] : []), ...(project ? ['project' as const] : [])];
}

export function priceBandFamily(band: string | undefined): PriceBandFamily | null {
  if ((monthlyPriceBands as readonly string[]).includes(band ?? '')) return 'monthly';
  if ((projectPriceBands as readonly string[]).includes(band ?? '')) return 'project';
  return null;
}

/**
 * The band a declared USD price falls in, for the founder to confirm and for the price
 * filter when no band was chosen. Only arithmetic on what was declared: an annual price
 * is divided by twelve; usage and hourly prices say nothing about a month or a project,
 * and other currencies would need an exchange rate shwcs does not have.
 */
export function derivePriceBand(price: PriceFields): string | undefined {
  const { priceFrom: amount, priceCurrency, priceUnit } = price;
  if (amount === undefined || priceCurrency !== 'USD') return undefined;
  if (priceUnit === 'suscripcion-mensual' || priceUnit === 'suscripcion-anual') {
    const monthly = priceUnit === 'suscripcion-anual' ? amount / 12 : amount;
    const edges = [50, 250, 1000, 2500];
    return monthlyPriceBands[edges.filter(edge => monthly >= edge).length];
  }
  if (priceUnit === 'por-proyecto' || priceUnit === 'pago-unico') {
    const edges = [1000, 5000, 20000, 50000];
    return projectPriceBands[edges.filter(edge => amount >= edge).length];
  }
  return undefined;
}

/** The band a listing is filtered by: the one it declared, else the one its USD price implies. */
export function effectivePriceBand(price: PriceFields): string | undefined {
  return price.priceBand ?? derivePriceBand(price);
}

/** Whether a listing declared a pricing model, counting the one its «Desde» price names. */
export function matchesPricingModel(price: PriceFields, model: string) {
  return !!price.pricingModel?.includes(model) || price.priceUnit === model;
}

/** «Desde $29 USD/mes», «Plan gratuito», or null while the amount or currency is missing. */
export function formatPriceFrom(price: PriceFields, locale = 'es'): string | null {
  const { priceFrom: amount, priceCurrency, priceUnit } = price;
  const text = commonText(locale);
  if (amount === undefined) return null;
  if (amount === 0) return text.priceFree;
  if (!priceCurrency) return null;
  const unit = priceUnit ? localizedPriceUnitSuffix(priceUnit, locale) : '';
  return text.priceFrom.replace('{price}', () => formatMoney(amount, priceCurrency, locale) + unit);
}

/** Labels of the declared pricing models, in the order of the closed list. */
export function pricingModelLabels(price: PriceFields, locale = 'es'): string[] {
  const declared = new Set([
    ...(price.pricingModel ?? []),
    ...(price.priceUnit ? [price.priceUnit] : []),
  ]);
  return localizedPricingModelOptions(locale)
    .filter(option => declared.has(option.value))
    .map(option => option.label);
}

export function priceBandLabel(band: string | undefined, locale = 'es'): string | null {
  if (!band) return null;
  return localizedPriceBandOptions(locale).find(option => option.value === band)?.label ?? null;
}

/**
 * One line of price for a card: the «Desde» amount when declared, else the band, else the
 * pricing models («Por proyecto · Solo a cotizar»), else «Depende del alcance». Null when
 * the listing said nothing about price: a card never shows a made-up one.
 */
export function priceSummary(price: PriceFields, locale = 'es'): string | null {
  const from = formatPriceFrom(price, locale);
  if (from) return from;
  if (price.priceBand && price.priceBand !== 'depende-alcance')
    return priceBandLabel(price.priceBand, locale);
  const models = pricingModelLabels(price, locale);
  if (models.length) return models.slice(0, 2).join(' · ');
  return priceBandLabel(price.priceBand, locale);
}
