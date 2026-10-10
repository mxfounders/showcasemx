import { i18n } from './config';

const localePrefix = new RegExp(`^/(?:${i18n.locales.join('|')})(?=/|$|\\?|#)`);

/**
 * Prefixes an internal path with the route's locale: `/account/saved` → `/en/account/saved`.
 *
 * Every page lives under `/[locale]`, so a bare internal href costs a 307 through the
 * middleware, and Next never prefetches a link that resolves to a redirect. External
 * URLs, API routes, fragments and paths that already carry a locale pass through.
 */
export function localePath(href: string, locale: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (href.startsWith('/api/') || localePrefix.test(href)) return href;
  // `/`, `/?q=…` and `/#catalogo` are the locale's home, not `/es/`.
  if (href === '/' || href.startsWith('/?') || href.startsWith('/#'))
    return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

/** The route without its locale segment, for comparing against unprefixed hrefs. */
export function stripLocale(pathname: string): string {
  return pathname.replace(localePrefix, '') || '/';
}
