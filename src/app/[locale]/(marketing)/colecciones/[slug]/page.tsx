import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';
import { collections, matchesCollection, localizedCollections } from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates, pageOpenGraph } from '@/lib/seo';
import { sponsoredProducts } from '@/lib/ads/sponsored';
import { SponsoredSlots } from '@/components/ads/sponsored-slots';
import { PlacementBeacon } from '@/components/ads/beacons';

// See explorar/[slug]/page.tsx for why {locale, slug} pairs (not just slug)
// and dynamicParams=false both matter here.
export function generateStaticParams() {
  return i18n.locales.flatMap(locale => collections.map(item => ({ locale, slug: item.slug })));
}
export const dynamicParams = false;

export async function generateMetadata(props: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await props.params;
  const info = localizedCollections(locale).find(item => item.slug === slug);
  if (!info) return {};
  const { meta } = await getDictionary(locale);
  return {
    title: `${info.title} | shwcs`,
    description: info.description,
    alternates: localeAlternates(locale, `/colecciones/${slug}`),
    openGraph: pageOpenGraph({
      locale,
      path: `/colecciones/${slug}`,
      title: `${info.title} | shwcs`,
      description: info.description,
      ogLocale: meta.site.ogLocale,
    }),
  };
}

export default async function ColeccionesCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const info = collections.find(item => item.slug === params.slug);
  if (!info) return notFound();
  const localizedInfo = localizedCollections(params.locale).find(
    item => item.slug === params.slug,
  )!;

  // The sponsored slot reads through a cached, tagged query (src/lib/ads/sponsored.ts),
  // like /explorar: the page stays prerendered and refreshes with the catalog.
  const [products, dict, sponsored] = await Promise.all([
    publicProducts(),
    getDictionary(params.locale),
    sponsoredProducts('collection', params.slug),
  ]);

  // Each collection filters by its declared rule (categories and/or
  // industries) from src/lib/taxonomy.ts instead of an unrelated slice of the
  // whole catalogue.
  const categoryProducts = products.filter(p => matchesCollection(p, info.rule));

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      {/* Page views for this page's sponsored slot reach estimate (SHCWS-72/79). */}
      <PlacementBeacon placement="collection" scope={params.slug} />
      <CategoryPageLayout
        title={localizedInfo.title}
        description={localizedInfo.description}
        categorySlug={params.slug}
        basePath="/colecciones"
        products={categoryProducts}
        locale={params.locale}
        dict={dict.catalog}
        alertDict={dict.alerts.button}
        sponsored={
          sponsored.length > 0 && (
            <SponsoredSlots items={sponsored} locale={params.locale} dict={dict.ads.slot} />
          )
        }
      />
    </Suspense>
  );
}
