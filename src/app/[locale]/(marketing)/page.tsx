import type { Metadata } from 'next';
import { publicProducts } from '@/lib/solutions/public';
import { Suspense } from 'react';
import { LandingDiscovery } from '@/components/landing-discovery';
import { LandingFeatures } from '@/components/landing-features';
import { LandingStackingCards } from '@/components/landing-stacking-cards';
import { LandingBentoBlogs } from '@/components/landing-bento-blogs';
import { FounderInvitation } from '@/components/founder-invitation';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates } from '@/lib/seo';
import { sponsoredProducts } from '@/lib/ads/sponsored';
import { SponsoredSlots } from '@/components/ads/sponsored-slots';

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
  const [published, dictionary, sponsored] = await Promise.all([
    publicProducts(),
    getDictionary(locale),
    sponsoredProducts('home'),
  ]);

  return (
    <div>
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
      <LandingBentoBlogs dict={dictionary.bentoBlogs} locale={locale} />
      <FounderInvitation dict={dictionary.landing} />
    </div>
  );
}
