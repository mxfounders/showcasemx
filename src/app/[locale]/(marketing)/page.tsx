import { publicProducts } from "@/lib/solutions/public";
import { Suspense } from "react";
import { LandingDiscovery } from "@/components/landing-discovery";
import { LandingFeatures } from "@/components/landing-features";
import { FounderInvitation } from "@/components/founder-invitation";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function Home(
  props: { params: Promise<{ locale: string }> }
) {
  const params = await props.params;
  const { locale } = params;
  const published = await publicProducts();
  const dict = await getDictionary(locale as Locale);

  return (
    <div>
      <Suspense fallback={<div className="min-h-[70vh]" aria-label={dict.landing.loadingCatalog} />}>
        <LandingDiscovery published={published} dict={dict.landing} />
      </Suspense>
      <LandingFeatures />
      <FounderInvitation dict={dict.landing} />
    </div>
  );
}
