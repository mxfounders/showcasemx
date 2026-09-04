import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';
import { categories } from '@/lib/taxonomy';

// Must enumerate {locale, slug} pairs, not just slug: this is the innermost
// dynamic segment, so Next needs the full combination to prerender each
// locale correctly (an outer [locale] with no generateStaticParams of its own
// does not get one inferred). Getting this wrong doesn't just skip locales —
// combined with dynamicParams=false below it 404s even the known-good slugs,
// because none of them cleanly match a {slug}-only manifest at serve time.
export function generateStaticParams() { return i18n.locales.flatMap(locale => categories.map(item => ({ locale, slug: item.slug }))); }
// The slugs are a fixed, closed set (see src/lib/taxonomy.ts): an unknown one
// should 404 at the routing layer, never attempt an on-demand dynamic render.
// (An on-demand render here previously crashed outright — the route commits
// fully static at build time since cookies() resolves to nothing during
// prerendering, and a real per-request cookies() read during the fallback
// trips Next's static→dynamic guard: "Page changed from static to dynamic at
// runtime … reason: cookies".)
export const dynamicParams = false;

export default async function ExplorarCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const categoryInfo = categories.find(item => item.slug === params.slug);
  if (!categoryInfo) return notFound();

  const products = await publicProducts();

  const categoryProducts = products.filter(p =>
    p.category === categoryInfo.label ||
    p.categories?.includes(categoryInfo.label)
  );

  return (
    // Filters read the URL client-side (useSearchParams), so this boundary is
    // required — it's also what lets the page stay static instead of forcing
    // dynamic rendering just because a query string might exist.
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={categoryInfo.title}
        description={categoryInfo.description}
        categorySlug={params.slug}
        basePath="/explorar"
        products={categoryProducts}
      />
    </Suspense>
  );
}
