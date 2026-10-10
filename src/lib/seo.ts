import type { Metadata } from 'next';
import { i18n, isLocale } from '@/i18n/config';

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
