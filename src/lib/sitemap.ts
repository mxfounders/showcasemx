import type { MetadataRoute } from 'next';
import { i18n } from '@/i18n/config';
import { getPostSummaries } from '@/lib/blog';
import { infoSlugs, noindexInfoSlugs } from '@/lib/info-pages';
import { siteOrigin } from '@/lib/seo';
import { categories, collections, industries } from '@/lib/taxonomy';

export type SitemapPage = { path: string; lastModified?: string | null };

/** Every page exists under each locale; each URL lists its translations. */
export function localized({ path, lastModified }: SitemapPage): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    i18n.locales.map(locale => [locale, `${siteOrigin}/${locale}${path}`]),
  );
  return i18n.locales.map(locale => ({
    url: `${siteOrigin}/${locale}${path}`,
    // Only real dates: a page without one says nothing rather than "today".
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    alternates: { languages },
  }));
}

/** Pages whose list doesn't depend on the database. */
export function staticPages(): SitemapPage[] {
  return [
    { path: '' },
    { path: '/comunidad' },
    { path: '/nuevo' },
    { path: '/blog' },
    { path: '/newsletter' },
    { path: '/contacto' },
    ...infoSlugs
      .filter(slug => !noindexInfoSlugs.includes(slug))
      .map(slug => ({ path: `/${slug}` })),
    ...categories.map(item => ({ path: `/explorar/${item.slug}` })),
    ...industries.map(item => ({ path: `/industria/${item.slug}` })),
    ...collections.map(item => ({ path: `/colecciones/${item.slug}` })),
    ...getPostSummaries(i18n.defaultLocale).map(post => ({
      path: `/blog/${post.slug}`,
      lastModified: post.publishedAt,
    })),
  ];
}
