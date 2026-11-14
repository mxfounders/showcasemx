import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/seo';

/**
 * Public pages are open; private, auth and API routes are not crawled. Query strings
 * (catalog filters, searches, community pages) are left out so crawlers spend their
 * budget on canonical URLs. Published images under /api stay reachable because a
 * listing's Open Graph image is served from there and LinkedIn honours robots.txt.
 *
 * AI crawlers get the same rules as everyone else: being a source assistants can
 * cite is part of docs/strategy.md. Revisit together with the firewall (SHCWS-3).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // /_next/ assets may carry a ?dpl= deployment query; the longer rule wins over /*?.
        allow: ['/', '/_next/', '/api/solutions/*/site-image', '/api/solutions/*/media/'],
        disallow: [
          '/api/',
          '/relay/',
          '/*/account',
          '/*/sign-in',
          '/*/sign-up',
          '/*/forgot-password',
          '/*/reset-password',
          '/*/verify-email',
          '/*/onboarding',
          '/*/newsletter/unsubscribe',
          '/*?',
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
