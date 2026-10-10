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
