import type { MetadataRoute } from 'next';
import { localized, staticPages } from '@/lib/sitemap';
import { publicProducts } from '@/lib/solutions/public';
import { indexableCollections } from '@/lib/library/community';
import { indexableProfiles } from '@/lib/profiles/server';

// Rebuilt hourly so new approvals show up without a deploy. publicProducts()
// returns [] when the database is unreachable, so a build without one still works.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const solutions = (await publicProducts()).flatMap(product =>
    product.detailUrl
      ? [{ path: product.detailUrl, lastModified: product.publishedAt ?? null }]
      : [],
  );
  // Lists that meet the indexing minimum (SHCWS-119); none if the database is down.
  const lists = (await indexableCollections().catch(() => [])).map(list => ({
    path: `/comunidad/${list.id}`,
    lastModified: list.updatedAt,
  }));
  // Public profiles that are on and show something (SHCWS-120); an empty one is noindex.
  const profiles = (await indexableProfiles().catch(() => [])).map(profile => ({
    path: `/c/${profile.handle}`,
    lastModified: profile.updatedAt,
  }));
  return [...staticPages(), ...solutions, ...lists, ...profiles].flatMap(localized);
}
