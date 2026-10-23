import type { MetadataRoute } from 'next';
import { i18n } from '@/i18n/config';
import { getPostSummaries } from '@/lib/blog';
import { infoSlugs, unindexedInfoPages } from '@/lib/info-pages';
import { siteOrigin } from '@/lib/seo';
import { publicProducts } from '@/lib/solutions/public';
import { categories, collections, industries } from '@/lib/taxonomy';

// Prerendered and served from the CDN. It inherits the catalog cache's 5-minute
// window (publicProducts), so a newly approved solution appears without a deploy and
// a stale copy is refreshed in the background at most that often. Only indexable
// public pages: private, auth and noindex pages stay out, as do community filter
// URLs (see robots.ts).

type Page = { path: string; lastModified?: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const solutions = await publicProducts();
  const pages: Page[] = [
    { path: '' },
    ...infoSlugs
      .filter(info => !unindexedInfoPages.includes(info))
      .map(info => ({ path: `/${info}` })),
    { path: '/blog' },
    ...getPostSummaries(i18n.defaultLocale).map(post => ({
      path: `/blog/${post.slug}`,
      lastModified: post.publishedAt,
    })),
    ...categories.map(item => ({ path: `/explorar/${item.slug}` })),
    ...industries.map(item => ({ path: `/industria/${item.slug}` })),
    ...collections.map(item => ({ path: `/colecciones/${item.slug}` })),
    { path: '/comunidad' },
    { path: '/contacto' },
    { path: '/newsletter' },
    ...solutions.flatMap(product =>
      product.detailUrl ? [{ path: product.detailUrl, lastModified: product.publishedAt }] : [],
    ),
  ];

  return pages.flatMap(({ path, lastModified: raw }) => {
    // publishedAt arrives as whatever text the database driver produced; only a
    // parseable date is worth sending.
    const date = raw ? new Date(raw) : null;
    const lastModified = date && !Number.isNaN(date.getTime()) ? date : undefined;
    const languages = {
      ...Object.fromEntries(i18n.locales.map(locale => [locale, `${siteOrigin}/${locale}${path}`])),
      'x-default': `${siteOrigin}/${i18n.defaultLocale}${path}`,
    };
    return i18n.locales.map(locale => ({
      url: `${siteOrigin}/${locale}${path}`,
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
