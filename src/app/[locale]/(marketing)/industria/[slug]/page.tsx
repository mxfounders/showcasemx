import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';
import { CategoryPageSkeleton } from '@/components/catalog/category-page-skeleton';

const industryMap: Record<string, { title: string; desc: string; label: string }> = {
  'agencias': { title: 'Software para Agencias', desc: 'Sistemas operativos para facturar horas, gestionar proyectos de clientes y asegurar la rentabilidad por cuenta.', label: 'Agencias' },
  'retail': { title: 'Retail y e-commerce', desc: 'Soluciones integradas para sincronizar inventario físico y digital, orquestar pagos y automatizar logística.', label: 'Retail' },
  'manufactura': { title: 'Manufactura', desc: 'Digitaliza tu planta productiva. ERPs industriales, gestión de calidad, mantenimiento y portal de proveedores.', label: 'Manufactura' },
  'legal': { title: 'Despachos legales', desc: 'Práctica legal moderna: expedientes digitales, facturación por horas (billable hours) y relación con clientes sin papel.', label: 'Legal' },
  'construccion': { title: 'Construcción y real estate', desc: 'Control de presupuestos de obra, contratos, estimaciones a contratistas y seguimiento físico-financiero.', label: 'Construcción' },
  'salud': { title: 'Salud y clínicas', desc: 'Expediente clínico electrónico (NOM-024), agendas multisede, cobranza a aseguradoras y telemedicina.', label: 'Salud' },
  'educacion': { title: 'Educación y EdTech', desc: 'Sistemas de control escolar, plataformas LMS, cobranza de colegiaturas y comunicación efectiva con padres.', label: 'Educación' },
};

export function generateStaticParams() { return Object.keys(industryMap).map(slug => ({ slug })); }

export default async function IndustriaCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;

  const info = industryMap[params.slug];
  if (!info) return notFound();

  const products = await publicProducts();

  const categoryProducts = products.filter(p =>
    p.category === info.label ||
    p.categories?.includes(info.label) ||
    p.description.toLowerCase().includes(info.label.toLowerCase())
  );

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageLayout
        title={info.title}
        description={info.desc}
        categorySlug={params.slug}
        basePath="/industria"
        products={categoryProducts}
      />
    </Suspense>
  );
}
