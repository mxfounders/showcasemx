/** ISO 3166-1 alpha-2 countries from Intl rather than a hand-kept list: any market. */

/** Region codes Intl knows that are not countries a company can be in. */
const notCountries = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ']);
const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

export function isCountryCode(value: string) {
  return /^[A-Z]{2}$/.test(value) && !notCountries.has(value) && !!regionNames.of(value);
}

export function countryCodes(): string[] {
  const codes: string[] = [];
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (isCountryCode(code)) codes.push(code);
    }
  return codes;
}

/** Codes with their names in `locale`, sorted for a selector. */
export function countryOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return countryCodes()
    .map(code => ({ value: code, label: names.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

/**
 * Shown first where a founder picks the countries they serve (SHCWS-56): Latin America,
 * where most listings start, then the United States and Spain. Ordering only, never a
 * default; every other country follows alphabetically.
 */
const frequentCountries = ['MX', 'CO', 'US', 'AR', 'CL', 'PE', 'BR', 'ES'];

export type CountryOptions = {
  frequent: { value: string; label: string }[];
  all: { value: string; label: string }[];
};

/** Built on the server and handed to the editor, like currencyOptions. */
export function countryPickerOptions(locale: string): CountryOptions {
  const all = countryOptions(locale);
  return {
    frequent: frequentCountries.flatMap(code => all.filter(option => option.value === code)),
    all: all.filter(option => !frequentCountries.includes(option.value)),
  };
}

/** A country's name in `locale`; the code itself if Intl does not know it. */
export function countryName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
