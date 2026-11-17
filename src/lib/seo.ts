import type { Metadata } from 'next';
import { i18n, isLocale } from '@/i18n/config';

/** The canonical public origin (CLAUDE.md §34), the same one the root layout's metadataBase names. */
export const siteOrigin = 'https://shwcs.site';

/**
 * Canonical + hreflang links for a public page that exists at the same path
 * under every locale (`/es/blog`, `/en/blog`). Paths are relative and resolve
 * against the root layout's `metadataBase`. Kept per page on purpose, never in
 * a layout: alternates are inherited, and a layout-level canonical would point
 * every child page (account, auth, legal…) at the layout's own URL.
 */
export function localeAlternates(locale: string, path = ''): Metadata['alternates'] {
  const current = isLocale(locale) ? locale : i18n.defaultLocale;
  return {
    canonical: `/${current}${path}`,
    languages: {
      ...Object.fromEntries(i18n.locales.map(item => [item, `/${item}${path}`])),
      'x-default': `/${i18n.defaultLocale}${path}`,
    },
  };
}

/** A page's own Open Graph block (SHCWS-99): without it, pages inherit the home's url. */
export function pageOpenGraph({
  locale,
  path,
  title,
  description,
  ogLocale,
  publishedTime,
}: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  ogLocale: string;
  /** Set for articles: the page is then typed `article` with its date. */
  publishedTime?: string;
}): NonNullable<Metadata['openGraph']> {
  const base = {
    title,
    ...(description ? { description } : {}),
    url: `${siteOrigin}/${isLocale(locale) ? locale : i18n.defaultLocale}${path}`,
    siteName: 'shwcs',
    locale: ogLocale,
  };
  return publishedTime ? { ...base, type: 'article', publishedTime } : { ...base, type: 'website' };
}
