import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';
import { industries, localizedIndustries } from '@/lib/taxonomy';
import { matchIndustry, isRealMatch } from '@/lib/search/facets';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

// See explorar/[slug]/page.tsx for why {locale, slug} pairs (not just slug)
// and dynamicParams=false both matter here.
export function generateStaticParams() { return i18n.locales.flatMap(locale => industries.map(item => ({ locale, slug: item.slug }))); }
export const dynamicParams = false;

export default async function IndustriaCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const info = industries.find(item => item.slug === params.slug);
  if (!info) return notFound();
  const localizedInfo = localizedIndustries(params.locale).find(item => item.slug === params.slug)!;

  const products = await publicProducts();
  const dict = await getDictionary(params.locale as Locale);

  // Matches the founder-declared `industries` field (src/lib/solutions/model.ts)
  // through matchIndustry/isRealMatch, not a raw includes(): a product that
  // never declared an industry no longer shows up here by accident of wording,
  // but one that explicitly declared "sirve a cualquier industria"
  // (industries:[]) is a deliberate "any" answer and must appear on every
  // industry landing page — the same rule the client-side filter and
  // matchesCollection already apply. A bare `.includes()` here used to
  // exclude that "any" answer from every one of these seven routes.
  const categoryProducts = products.filter(p => isRealMatch(matchIndustry(p, info.value)));

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={localizedInfo.title}
        description={localizedInfo.description}
        categorySlug={params.slug}
        basePath="/industria"
        products={categoryProducts}
        locale={params.locale}
        dict={dict.catalog}
      />
    </Suspense>
  );
}
