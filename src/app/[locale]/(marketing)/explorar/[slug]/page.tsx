import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';
import { categories, localizedCategories } from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates } from '@/lib/seo';
import { sponsoredProducts } from '@/lib/ads/sponsored';
import { SponsoredSlots } from '@/components/ads/sponsored-slots';

// Must enumerate {locale, slug} pairs, not just slug: this is the innermost
// dynamic segment, so Next needs the full combination to prerender each
// locale correctly (an outer [locale] with no generateStaticParams of its own
// does not get one inferred). Getting this wrong doesn't just skip locales —
// combined with dynamicParams=false below it 404s even the known-good slugs,
// because none of them cleanly match a {slug}-only manifest at serve time.
export function generateStaticParams() {
  return i18n.locales.flatMap(locale => categories.map(item => ({ locale, slug: item.slug })));
}
// The slugs are a fixed, closed set (see src/lib/taxonomy.ts): an unknown one
// should 404 at the routing layer, never attempt an on-demand dynamic render.
// (An on-demand render here previously crashed outright — the route commits
// fully static at build time since cookies() resolves to nothing during
// prerendering, and a real per-request cookies() read during the fallback
// trips Next's static→dynamic guard: "Page changed from static to dynamic at
// runtime … reason: cookies".)
export const dynamicParams = false;

export async function generateMetadata(props: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await props.params;
  const info = localizedCategories(locale).find(item => item.slug === slug);
  if (!info) return {};
  return {
    title: `${info.title} | shwcs`,
    description: info.description,
    alternates: localeAlternates(locale, `/explorar/${slug}`),
  };
}

export default async function ExplorarCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const categoryInfo = categories.find(item => item.slug === params.slug);
  if (!categoryInfo) return notFound();
  // Only title/description vary by locale — `.label` stays the canonical
  // Spanish value the filter below matches against (see localizedCategories).
  const localizedInfo = localizedCategories(params.locale).find(item => item.slug === params.slug)!;

  const [products, dict, sponsored] = await Promise.all([
    publicProducts(),
    getDictionary(params.locale),
    sponsoredProducts('category', params.slug),
  ]);

  const categoryProducts = products.filter(
    p => p.category === categoryInfo.label || p.categories?.includes(categoryInfo.label),
  );

  return (
    // Filters read the URL client-side (useSearchParams), so this boundary is
    // required — it's also what lets the page stay static instead of forcing
    // dynamic rendering just because a query string might exist.
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={localizedInfo.title}
        description={localizedInfo.description}
        categorySlug={params.slug}
        basePath="/explorar"
        products={categoryProducts}
        locale={params.locale}
        dict={dict.catalog}
        sponsored={
          sponsored.length > 0 && (
            <SponsoredSlots items={sponsored} locale={params.locale} dict={dict.ads.slot} />
          )
        }
      />
    </Suspense>
  );
}
