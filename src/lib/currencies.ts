/**
 * ISO 4217 currencies from Intl rather than a hand-kept list: any market (CLAUDE.md §1),
 * same idea as src/lib/countries.ts. A listing's price is shown in the currency its
 * founder declared; nothing here converts between currencies.
 */

/** Used only where the runtime has no Intl.supportedValuesOf (very old browsers). */
const fallbackCodes = ['USD', 'EUR', 'MXN', 'BRL', 'COP', 'ARS', 'CLP', 'PEN', 'CAD', 'GBP'];

/**
 * Shown first in a selector because most listings will use one of them. Ordering only:
 * no currency is assumed or preselected.
 */
const frequentCurrencies = ['USD', 'EUR', 'MXN', 'BRL', 'COP', 'ARS', 'CLP', 'PEN', 'CAD'];

let codes: Set<string> | null = null;
function currencySet() {
  codes ??= new Set(
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('currency')
      : fallbackCodes,
  );
  return codes;
}

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value) && currencySet().has(value);
}

type CurrencyOption = { value: string; label: string };
export type CurrencyOptions = { frequent: CurrencyOption[]; all: CurrencyOption[] };

/**
 * Every code with its name in `locale` («MXN · peso mexicano»), frequent ones first.
 * Built on the server and handed to the editor: the browser's Intl may know other codes
 * or spell a name differently, and the server is what validates the choice.
 */
export function currencyOptions(locale: string): CurrencyOptions {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'currency' });
  } catch {
    /* the bare code is still a complete answer */
  }
  const option = (code: string): CurrencyOption => {
    const name = names?.of(code);
    return { value: code, label: name && name !== code ? `${code} · ${name}` : code };
  };
  const frequent = frequentCurrencies.filter(code => currencySet().has(code));
  const rest = [...currencySet()].filter(code => !frequent.includes(code)).sort();
  return { frequent: frequent.map(option), all: rest.map(option) };
}

/**
 * «$1,500 MXN», «€29 EUR», «CHF 29»: the amount with the code always visible, because
 * «$» alone is the symbol of a dozen currencies. Whole amounts drop the cents.
 */
export function formatMoney(amount: number, currency: string, locale: string) {
  const digits = Number.isInteger(amount) ? 0 : 2;
  let text: string;
  try {
    text = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
  return text.includes(currency) ? text : `${text} ${currency}`;
}
