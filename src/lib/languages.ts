/**
 * ISO 639-1 languages from Intl rather than a hand-kept list, the same idea as
 * src/lib/countries.ts: a listing can declare support in any language (SHCWS-56).
 */

const englishNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' });

export function isLanguageCode(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[a-z]{2}$/.test(value)) return false;
  const name = englishNames.of(value);
  return !!name && name !== value;
}

let codes: string[] | null = null;
export function languageCodes(): string[] {
  if (codes) return codes;
  const found: string[] = [];
  for (let a = 97; a <= 122; a++)
    for (let b = 97; b <= 122; b++) {
      const code = String.fromCharCode(a, b);
      if (isLanguageCode(code)) found.push(code);
    }
  codes = found;
  return found;
}

/**
 * Shown first in a selector because most listings will use one of them. Ordering only:
 * nothing is assumed or preselected.
 */
const frequentLanguages = ['es', 'en', 'pt', 'fr', 'de', 'it'];

export type LanguageOption = { value: string; label: string };
export type LanguageOptions = { frequent: LanguageOption[]; all: LanguageOption[] };

/** «Español», «English»… in `locale`, capitalised for a list, frequent ones first. */
export function languageOptions(locale: string): LanguageOptions {
  const names = new Intl.DisplayNames([locale], { type: 'language' });
  const option = (code: string): LanguageOption => {
    const name = names.of(code) ?? code;
    return { value: code, label: name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) };
  };
  const frequent = frequentLanguages.filter(isLanguageCode).map(option);
  const all = languageCodes()
    .filter(code => !frequentLanguages.includes(code))
    .map(option)
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  return { frequent, all };
}

/** One language's name in `locale`, capitalised; the code itself if Intl does not know it. */
export function languageName(code: string, locale: string) {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    return code;
  }
}
