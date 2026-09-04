import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';
import { i18n } from '@/i18n/config';

const collectionMap: Record<string, { title: string; desc: string }> = {
  'essential': { title: 'Essential Stack MX', desc: 'Las herramientas mínimas e indispensables para operar una empresa en México sin caos.' },
  'cfo': { title: 'CFO Toolkit', desc: 'Control financiero de alto nivel para directores de finanzas y equipos contables modernos.' },
  'agencia': { title: 'Agencia en 30 días', desc: 'El stack operativo para lanzar, operar y escalar tu agencia de servicios B2B desde cero.' },
  'legal': { title: 'Stack legal moderno', desc: 'El kit completo de transformación digital para tu departamento legal interno o despacho.' },
};

// See explorar/[slug]/page.tsx for why {locale, slug} pairs (not just slug)
// and dynamicParams=false both matter here.
export function generateStaticParams() { return i18n.locales.flatMap(locale => Object.keys(collectionMap).map(slug => ({ locale, slug }))); }
export const dynamicParams = false;

export default async function ColeccionesCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const info = collectionMap[params.slug];
  if (!info) return notFound();

  const products = await publicProducts();

  // TODO(Fase 3): each collection should filter by a declared rule from the
  // shared taxonomy, not a slice of the whole catalogue. Tracked in the plan.
  const categoryProducts = products.slice(0, 8); // demo filtering

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={info.title}
        description={info.desc}
        categorySlug={params.slug}
        basePath="/colecciones"
        products={categoryProducts}
      />
    </Suspense>
  );
}
