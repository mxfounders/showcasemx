import { i18n, isLocale } from './config';
import type { Dictionary } from './dictionary';

const loaders: Record<string, () => Promise<Dictionary>> = {
  es: () => import('./dictionaries/es').then(module => module.es),
  en: () => import('./dictionaries/en').then(module => module.en),
};

/**
 * Loads the dictionary for a route's `[locale]` segment. Unknown values fall back to
 * the default locale, so callers can pass `params.locale` straight through.
 */
export function getDictionary(locale: string): Promise<Dictionary> {
  return loaders[isLocale(locale) ? locale : i18n.defaultLocale]();
}
