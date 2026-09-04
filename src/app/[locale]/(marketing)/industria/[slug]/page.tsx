import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';
import { industries } from '@/lib/taxonomy';

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

  const products = await publicProducts();

  // Matches the founder-declared `industries` field (src/lib/solutions/model.ts),
  // not a substring search over description copy: a product that never
  // declared an industry no longer shows up here by accident of wording, and
  // one that explicitly declared "sirve a cualquier industria" (industries:[])
  // is a deliberate answer, not a match for any specific one.
  const categoryProducts = products.filter(p => p.industries?.includes(info.value));

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={info.title}
        description={info.description}
        categorySlug={params.slug}
        basePath="/industria"
        products={categoryProducts}
      />
    </Suspense>
  );
}
