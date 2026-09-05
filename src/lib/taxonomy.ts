import type { BrandTone } from './brand-colors';
import { solutionCategories, solutionIndustries, companySizes as companySizeValues } from './solutions/model';
import { matchIndustry, isRealMatch } from './search/facets';

/**
 * The one place the catalogue's *presentation* structure lives — labels,
 * tones, routes, titles, collection rules. `solutions/model.ts` stays the
 * single source of *legal values* (what a solution may actually store); this
 * file imports those value lists rather than repeating them, so the two can
 * never drift apart the way they did before this file existed: the industry
 * filter offered 6 values while the industry routes had 7 (missing
 * Construcción), and the size filter's three values (pyme/midmarket/enterprise)
 * never matched anything — a mock that always returned zero results, because
 * no solution had ever been able to declare a size in the first place.
 */

export { solutionCategories, solutionIndustries, companySizeValues as companySizeIds };
export type SolutionCategory = typeof solutionCategories[number];

export type CategoryEntry = { slug: string; label: typeof solutionCategories[number]; tone: BrandTone; title: string; description: string };
export const categories: CategoryEntry[] = [
  { slug: 'cobros', label: 'Cobros', tone: 'sage', title: 'Cobros y cuentas por cobrar', description: 'Sistemas para reducir tu ciclo de cobranza de semanas a días. Conciliación automática, recordatorios y portales de pago B2B.' },
  { slug: 'contratos', label: 'Legal', tone: 'lavender', title: 'Contratos y firma digital', description: 'Cierra acuerdos B2B sin imprimir una sola hoja. Gestión del ciclo de vida del contrato (CLM), firmas con validez NOM-151 y resguardo seguro.' },
  { slug: 'nomina', label: 'Nómina', tone: 'lavender', title: 'Nómina y compliance', description: 'Cálculos de IMSS, SAT, dispersión bancaria y gestión de vacaciones en un solo lugar. Evita multas y errores manuales.' },
  { slug: 'finanzas', label: 'Finanzas', tone: 'blue', title: 'Visibilidad financiera', description: 'Herramientas para saber exactamente qué entra, qué sale y cuándo. Flujo de efectivo, presupuestos y consolidación bancaria.' },
  { slug: 'inventario', label: 'Operación', tone: 'amber', title: 'Inventario y supply chain', description: 'Control de stock en tiempo real, logística y compras. Dile adiós a los inventarios gestionados en hojas de Excel.' },
  { slug: 'ventas', label: 'Ventas', tone: 'terracotta', title: 'Ventas y CRM', description: 'Mapea tu pipeline, haz seguimiento a prospectos y cierra más tratos. CRM especializados en ciclos de venta B2B largos.' },
  { slug: 'soporte', label: 'Operación', tone: 'amber', title: 'Atención al cliente', description: 'Mesa de ayuda omnicanal, ticketing y automatización de respuestas para escalar tu soporte B2B sin caos.' },
];

/** The seven industries, exactly matching solutionIndustries and the seven routes. */
export const industries: { slug: string; value: typeof solutionIndustries[number]; label: string; tone: BrandTone; title: string; description: string }[] = [
  { slug: 'agencias', value: 'Agencias', label: 'Agencias y consultoras', tone: 'blue', title: 'Software para Agencias', description: 'Sistemas operativos para facturar horas, gestionar proyectos de clientes y asegurar la rentabilidad por cuenta.' },
  { slug: 'retail', value: 'Retail', label: 'Retail & E-commerce', tone: 'terracotta', title: 'Retail y e-commerce', description: 'Soluciones integradas para sincronizar inventario físico y digital, orquestar pagos y automatizar logística.' },
  { slug: 'manufactura', value: 'Manufactura', label: 'Manufactura y logística', tone: 'amber', title: 'Manufactura', description: 'Digitaliza tu planta productiva. ERPs industriales, gestión de calidad, mantenimiento y portal de proveedores.' },
  { slug: 'legal', value: 'Legal', label: 'Despachos legales', tone: 'lavender', title: 'Despachos legales', description: 'Práctica legal moderna: expedientes digitales, facturación por horas (billable hours) y relación con clientes sin papel.' },
  { slug: 'construccion', value: 'Construcción', label: 'Construcción y real estate', tone: 'amber', title: 'Construcción y real estate', description: 'Control de presupuestos de obra, contratos, estimaciones a contratistas y seguimiento físico-financiero.' },
  { slug: 'salud', value: 'Salud', label: 'Salud y clínicas', tone: 'sage', title: 'Salud y clínicas', description: 'Expediente clínico electrónico (NOM-024), agendas multisede, cobranza a aseguradoras y telemedicina.' },
  { slug: 'educacion', value: 'Educación', label: 'Educación y EdTech', tone: 'blue', title: 'Educación y EdTech', description: 'Sistemas de control escolar, plataformas LMS, cobranza de colegiaturas y comunicación efectiva con padres.' },
];
export type Industry = typeof solutionIndustries[number];

/**
 * Labels for the four size tiers declared in solutions/model.ts. Replaces the
 * old pyme/midmarket/enterprise filter, which matched those literal strings
 * against free-text description fields and never found anything — a mock,
 * not a filter, since no solution could declare a size in the first place.
 */
export const companySizes: { value: typeof companySizeValues[number]; label: string; range: string }[] = [
  { value: 'micro', label: 'Microempresa', range: '1–10 personas' },
  { value: 'pyme', label: 'PyME', range: '11–100 personas' },
  { value: 'mediana', label: 'Mediana empresa', range: '101–500 personas' },
  { value: 'corporativo', label: 'Corporativo', range: '500+ personas' },
];
export type CompanySize = typeof companySizeValues[number];

export const offerings = ['Software', 'Agencia', 'Servicio'] as const;
export type Offering = typeof offerings[number];

/** A product matches a declarative rule instead of `products.slice(0, 8)`. */
export type CollectionRule = { categories?: SolutionCategory[]; industries?: Industry[] };
export type CollectionEntry = { slug: string; title: string; description: string; rule: CollectionRule };
export const collections: CollectionEntry[] = [
  { slug: 'essential', title: 'Essential Stack MX', description: 'Las herramientas mínimas e indispensables para operar una empresa en México sin caos.', rule: { categories: ['Cobros', 'Finanzas', 'Nómina', 'Operación'] } },
  { slug: 'cfo', title: 'CFO Toolkit', description: 'Control financiero de alto nivel para directores de finanzas y equipos contables modernos.', rule: { categories: ['Finanzas', 'Cobros'] } },
  { slug: 'agencia', title: 'Agencia en 30 días', description: 'El stack operativo para lanzar, operar y escalar tu agencia de servicios B2B desde cero.', rule: { industries: ['Agencias'] } },
  { slug: 'legal', title: 'Stack legal moderno', description: 'El kit completo de transformación digital para tu departamento legal interno o despacho.', rule: { categories: ['Legal'] } },
];

export function matchesCollection(
  product: { categories?: string[]; industries?: string[]; name?: string; description?: string; feature?: string },
  rule: CollectionRule,
): boolean {
  if (rule.categories?.some(category => product.categories?.includes(category))) return true;
  // isRealMatch, not includes(): a product that declared industries: []
  // ("fits any") belongs in every industry collection, and one that never
  // declared an industry must not be pulled in by inference — an editorial
  // collection only grows by a real declared match. See src/lib/search/facets.ts.
  if (rule.industries?.some(industry => isRealMatch(matchIndustry(product, industry)))) return true;
  return false;
}

/** The 18 category routes, for anything that needs to enumerate or link them. */
export function catalogRoutes(): string[] {
  return [
    ...categories.map(item => `/explorar/${item.slug}`),
    ...industries.map(item => `/industria/${item.slug}`),
    ...collections.map(item => `/colecciones/${item.slug}`),
  ];
}
