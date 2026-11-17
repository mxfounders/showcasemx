import type { Metadata } from 'next';
import { publicProducts } from '@/lib/solutions/public';
import { Suspense } from 'react';
import { LandingDiscovery } from '@/components/landing-discovery';
import { LandingFeatures } from '@/components/landing-features';
import { LandingStackingCards } from '@/components/landing-stacking-cards';
import { LandingBentoBlogs } from '@/components/landing-bento-blogs';
import { FounderInvitation } from '@/components/founder-invitation';
import { NewThisWeekStrip } from '@/components/new-this-week';
import { CommunityStrip } from '@/components/community/community-strip';
import { getPublicCollections } from '@/lib/library/community';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates } from '@/lib/seo';
import { sponsoredProducts } from '@/lib/ads/sponsored';
import { SponsoredSlots } from '@/components/ads/sponsored-slots';
import { PlacementBeacon } from '@/components/ads/beacons';
import { JsonLd } from '@/components/json-ld';
import { siteJsonLd } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

// Title/description/Open Graph come from the root layout (meta.site); the home
// only adds its hreflang alternates.
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return { alternates: localeAlternates((await props.params).locale) };
}

export default async function Home(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const { locale } = params;
  const [published, dictionary, sponsored, lists] = await Promise.all([
    publicProducts(),
    getDictionary(locale),
    sponsoredProducts('home'),
    // The home's way into Comunidad; the home still renders when it cannot be read.
    getPublicCollections({ sort: 'popular' })
      .then(result => result.collections.slice(0, 3))
      .catch(() => []),
  ]);

  return (
    <div>
      <JsonLd data={siteJsonLd(locale)} />
      {/* Page views for the sponsored home slot's reach estimate (SHCWS-72). */}
      <PlacementBeacon placement="home" />
      <Suspense
        fallback={<div className="min-h-[70vh]" aria-label={dictionary.landing.loadingCatalog} />}
      >
        <LandingDiscovery
          published={published}
          dict={dictionary.landing}
          explorerDict={dictionary.categoryExplorer}
          saveDict={dictionary.solutionUi}
          locale={locale}
        />
      </Suspense>
      <NewThisWeekStrip products={published} locale={locale} dict={dictionary.catalog} />
      {sponsored.length > 0 && (
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SponsoredSlots items={sponsored} locale={locale} dict={dictionary.ads.slot} />
        </div>
      )}
      <LandingFeatures
        products={published}
        dict={dictionary.landing}
        explorerDict={dictionary.categoryExplorer}
      />
      <LandingStackingCards products={published} dict={dictionary.landing} />
      <CommunityStrip collections={lists} dict={dictionary.community} />
      <LandingBentoBlogs dict={dictionary.bentoBlogs} locale={locale} />
      <FounderInvitation dict={dictionary.landing} />
    </div>
  );
}
