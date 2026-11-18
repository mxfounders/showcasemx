import { countryName } from '@/lib/countries';
import { languageName } from '@/lib/languages';
import {
  localizedCustomerCountOptions,
  localizedPaymentMethodOptions,
  localizedTeamSizeOptions,
} from '@/lib/taxonomy';
import type { SolutionData } from './model';

/**
 * The provider facts of SHCWS-56 as readable rows: where it is and operates, how it
 * supports and charges, and its track record. Shared by the public listing, the
 * comparator and the Markdown view, so the three always say the same thing. Only what
 * the project declared becomes a row; nothing is filled in.
 */
export type ProviderFacts = Pick<
  SolutionData,
  | 'originCountry'
  | 'serviceCountries'
  | 'billingCountries'
  | 'currencies'
  | 'supportLanguages'
  | 'supportHours'
  | 'paymentMethods'
  | 'foundedYear'
  | 'teamSize'
  | 'customerCount'
>;

export const providerRowKeys = [
  'origin',
  'serves',
  'bills',
  'currencies',
  'languages',
  'hours',
  'payment',
  'founded',
  'team',
  'customers',
] as const;
export type ProviderRowKey = (typeof providerRowKeys)[number];

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find(option => option.value === value)?.label ?? value;

/** «Cualquier país», the countries' names, or null when never answered. */
export function countryListText(list: string[] | undefined, locale: string, anyLabel: string) {
  if (list === undefined) return null;
  if (!list.length) return anyLabel;
  return list.map(code => countryName(code, locale)).join(', ');
}

/** Every declared fact as text, keyed by row; an undeclared one is null. */
export function providerValues(
  data: ProviderFacts,
  locale: string,
  anyCountry: string,
): Record<ProviderRowKey, string | null> {
  return {
    origin: data.originCountry ? countryName(data.originCountry, locale) : null,
    serves: countryListText(data.serviceCountries, locale, anyCountry),
    bills: countryListText(data.billingCountries, locale, anyCountry),
    currencies: data.currencies?.length ? data.currencies.join(' · ') : null,
    languages: data.supportLanguages?.length
      ? data.supportLanguages.map(code => languageName(code, locale)).join(', ')
      : null,
    hours: data.supportHours?.trim() || null,
    payment: data.paymentMethods?.length
      ? data.paymentMethods
          .map(value => labelOf(localizedPaymentMethodOptions(locale), value))
          .join(', ')
      : null,
    founded: data.foundedYear !== undefined ? String(data.foundedYear) : null,
    team: data.teamSize ? labelOf(localizedTeamSizeOptions(locale), data.teamSize) : null,
    customers: data.customerCount
      ? labelOf(localizedCustomerCountOptions(locale), data.customerCount)
      : null,
  };
}

/** Declared rows only, in display order, with their labels. */
export function providerRows(
  data: ProviderFacts,
  locale: string,
  labels: Record<ProviderRowKey, string> & { anyCountry: string },
) {
  const values = providerValues(data, locale, labels.anyCountry);
  return providerRowKeys.flatMap(key =>
    values[key] ? [{ key, label: labels[key], value: values[key] as string }] : [],
  );
}
