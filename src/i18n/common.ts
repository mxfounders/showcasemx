import { isLocale } from './config';
import type { Dictionary } from './dictionary';
import { common as en } from './dictionaries/en/common';
import { common as es } from './dictionaries/es/common';

/**
 * The few interface strings needed by components that only know the locale (the skip
 * link, the logo's accessible name). Both locales are imported statically because the
 * section is tiny; everything else is loaded per locale through getDictionary().
 */
export function commonText(locale: string): Dictionary['common'] {
  return isLocale(locale) && locale === 'en' ? en : es;
}
