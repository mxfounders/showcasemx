import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';

const collectionMap: Record<string, { title: string; desc: string }> = {
  'essential': { title: 'Essential Stack MX', desc: 'Las herramientas mínimas e indispensables para operar una empresa en México sin caos.' },
  'cfo': { title: 'CFO Toolkit', desc: 'Control financiero de alto nivel para directores de finanzas y equipos contables modernos.' },
  'agencia': { title: 'Agencia en 30 días', desc: 'El stack operativo para lanzar, operar y escalar tu agencia de servicios B2B desde cero.' },
  'legal': { title: 'Stack legal moderno', desc: 'El kit completo de transformación digital para tu departamento legal interno o despacho.' },
};

export default async function ColeccionesCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const info = collectionMap[params.slug];
  if (!info) return notFound();

  const products = await publicProducts();
  
  const categoryProducts = products.slice(0, 8); // demo filtering

  return (
    <CategoryPageLayout
      title={info.title}
      description={info.desc}
      categorySlug={params.slug}
      basePath="/colecciones"
      products={categoryProducts}
      searchParams={searchParams}
    />
  );
}
