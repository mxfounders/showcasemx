import type { AdCurrency } from './model';

/** A minor-unit amount as currency text, e.g. 2500 USD → "US$25.00" / "$25.00". */
export function formatMoney(minor: number, currency: AdCurrency, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}

/** A YYYY-MM-DD calendar date as text, read as that calendar day everywhere. */
export function formatDay(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
