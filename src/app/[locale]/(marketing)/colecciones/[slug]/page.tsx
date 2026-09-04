import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';
import { collections, matchesCollection } from '@/lib/taxonomy';

// See explorar/[slug]/page.tsx for why {locale, slug} pairs (not just slug)
// and dynamicParams=false both matter here.
export function generateStaticParams() { return i18n.locales.flatMap(locale => collections.map(item => ({ locale, slug: item.slug }))); }
export const dynamicParams = false;

export default async function ColeccionesCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const info = collections.find(item => item.slug === params.slug);
  if (!info) return notFound();

  const products = await publicProducts();

  // Each collection filters by its declared rule (categories and/or
  // industries) from src/lib/taxonomy.ts instead of an unrelated slice of the
  // whole catalogue.
  const categoryProducts = products.filter(p => matchesCollection(p, info.rule));

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={info.title}
        description={info.description}
        categorySlug={params.slug}
        basePath="/colecciones"
        products={categoryProducts}
      />
    </Suspense>
  );
}
