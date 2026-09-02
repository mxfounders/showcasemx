import { notFound } from 'next/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { CategoryPageLayout } from '@/components/catalog/category-page-layout';

const categoryMap: Record<string, { title: string; desc: string; label: string }> = {
  'cobros': { title: 'Cobros y cuentas por cobrar', desc: 'Sistemas para reducir tu ciclo de cobranza de semanas a días. Conciliación automática, recordatorios y portales de pago B2B.', label: 'Cobros' },
  'contratos': { title: 'Contratos y firma digital', desc: 'Cierra acuerdos B2B sin imprimir una sola hoja. Gestión del ciclo de vida del contrato (CLM), firmas con validez NOM-151 y resguardo seguro.', label: 'Legal' },
  'nomina': { title: 'Nómina y compliance', desc: 'Cálculos de IMSS, SAT, dispersión bancaria y gestión de vacaciones en un solo lugar. Evita multas y errores manuales.', label: 'Nómina' },
  'finanzas': { title: 'Visibilidad financiera', desc: 'Herramientas para saber exactamente qué entra, qué sale y cuándo. Flujo de efectivo, presupuestos y consolidación bancaria.', label: 'Finanzas' },
  'inventario': { title: 'Inventario y supply chain', desc: 'Control de stock en tiempo real, logística y compras. Dile adiós a los inventarios gestionados en hojas de Excel.', label: 'Operación' },
  'ventas': { title: 'Ventas y CRM', desc: 'Mapea tu pipeline, haz seguimiento a prospectos y cierra más tratos. CRM especializados en ciclos de venta B2B largos.', label: 'Ventas' },
  'soporte': { title: 'Atención al cliente', desc: 'Mesa de ayuda omnicanal, ticketing y automatización de respuestas para escalar tu soporte B2B sin caos.', label: 'Operación' },
};

export default async function ExplorarCategoryPage(props: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const categoryInfo = categoryMap[params.slug];
  if (!categoryInfo) return notFound();

  const products = await publicProducts();
  
  const categoryProducts = products.filter(p => 
    p.category === categoryInfo.label || 
    p.categories?.includes(categoryInfo.label)
  );

  return (
    <CategoryPageLayout
      title={categoryInfo.title}
      description={categoryInfo.desc}
      categorySlug={params.slug}
      basePath="/explorar"
      products={categoryProducts}
      searchParams={searchParams}
    />
  );
}
