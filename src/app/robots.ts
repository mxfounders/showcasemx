import type { MetadataRoute } from 'next';
import { i18n } from '@/i18n/config';
import { siteOrigin } from '@/lib/seo';

// Served as a static file. Before it existed, /robots.txt rendered the home page and
// crawlers read no rules at all (CLAUDE.md §73). Explicit locale prefixes instead of
// `*` wildcards, so even crawlers that only do prefix matching follow them.
export default function robots(): MetadataRoute.Robots {
  const perLocale = (paths: string[]) =>
    i18n.locales.flatMap(locale => paths.map(path => `/${locale}${path}`));
  return {
    rules: {
      userAgent: '*',
      // Community pagination stays crawlable: page 2+ is how crawlers reach older
      // lists. The longest rule wins, so this beats the `/comunidad?` disallow below.
      allow: ['/', ...perLocale(['/comunidad?page='])],
      disallow: [
        '/api/',
        ...perLocale([
          // Search and filter combinations: endless distinct URLs, one rendered page each.
          '?',
          '/comunidad?',
          // Private, or a form every link reaches with its own ?next= return path.
          '/account',
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/onboarding',
          '/newsletter/unsubscribe',
        ]),
      ],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
