export const i18n = {
  defaultLocale: 'es',
  locales: ['es', 'en'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

/** Request header the middleware sets with the route's locale, for code that gets no `params`. */
export const localeHeader = 'x-locale';

export function isLocale(value: string): value is Locale {
  return (i18n.locales as readonly string[]).includes(value);
}
