import type { MetadataRoute } from 'next';
import { i18n } from '@/i18n/config';
import { siteOrigin } from '@/lib/seo';

/**
 * Served as a static file. Before it existed, /robots.txt rendered the home page and
 * crawlers read no rules at all (the bot-traffic fix, 23 Oct 2026). Explicit locale
 * prefixes sit next to the `/*?` wildcard, so crawlers that only do prefix matching still
 * follow them, and the wildcard keeps every filtered or searched URL out for the rest.
 *
 * Published images under /api stay reachable: a listing's Open Graph image is served from
 * there and LinkedIn honours robots.txt. AI crawlers get the same rules as everyone else:
 * being a source assistants can cite is part of docs/strategy.md. Revisit together with
 * the firewall (SHCWS-3).
 */
export default function robots(): MetadataRoute.Robots {
  const perLocale = (paths: string[]) =>
    i18n.locales.flatMap(locale => paths.map(path => `/${locale}${path}`));
  return {
    rules: {
      userAgent: '*',
      // The longest rule wins: these beat `/*?` and the `/comunidad?` disallow below.
      // /_next/ assets may carry a ?dpl= deployment query; community pagination is how
      // crawlers reach older lists.
      allow: [
        '/',
        '/_next/',
        '/api/solutions/*/site-image',
        '/api/solutions/*/media/',
        ...perLocale(['/comunidad?page=']),
      ],
      disallow: [
        '/api/',
        '/relay/',
        // Search and filter combinations: endless distinct URLs, one rendered page each.
        '/*?',
        ...perLocale([
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
          '/weekly/unsubscribe',
          '/resenar',
        ]),
      ],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
