import type { BrandTone } from './brand-colors';
import { solutionCategories, solutionIndustries, companySizes as companySizeValues, solutionCapabilities, solutionIntegrations, solutionPricingModels, solutionPriceBands, solutionSetupTimes, solutionCompliance } from './solutions/model';
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
  // Agencias is a legal category (solutionCategories) with no route of its
  // own until now — a solution that only declared it had no landing page and
  // no filter option (bug fixed alongside the capabilities axis). Distinct
  // from the *industry* "Agencias" below: this is the category for service
  // providers (who sells), that one is the industry of buying agencies (who
  // buys) — see docs/listings.md.
  { slug: 'agencias', label: 'Agencias', tone: 'blue', title: 'Software para vender servicios', description: 'Herramientas de agencias, consultorías y estudios que ejecutan por ti: horas facturables, propuestas y rentabilidad por cuenta.' },
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

/**
 * Labels for the five new commercial axes. solutions/model.ts owns which ids
 * are legal to store; this is only presentation, same split as everything
 * above. Capabilities have no tone of their own — the editor and filters use
 * their parent category's tone (solutionCategoryTones) so a capability chip
 * always reads as "part of Ventas/Cobros/etc.", never as an unrelated color.
 */
export const capabilityLabels: Record<string, string> = {
  'facturacion-cfdi': 'Facturación y CFDI', 'cobranza-recordatorios': 'Cobranza y recordatorios', 'conciliacion-bancaria': 'Conciliación bancaria', 'portal-pagos': 'Portal de pagos', suscripciones: 'Cobro de suscripciones', 'cartera-antiguedad': 'Cartera y antigüedad de saldos', 'cuentas-por-pagar': 'Cuentas por pagar', factoraje: 'Factoraje',
  'flujo-efectivo': 'Flujo de efectivo', presupuestos: 'Presupuestos', contabilidad: 'Contabilidad', 'reportes-tableros': 'Reportes y tableros financieros', 'gastos-reembolsos': 'Gastos y reembolsos', 'tarjetas-corporativas': 'Tarjetas corporativas', 'consolidacion-multiempresa': 'Consolidación multiempresa', impuestos: 'Impuestos',
  'calculo-timbrado': 'Cálculo y timbrado de nómina', dispersion: 'Dispersión de pagos', 'imss-infonavit': 'IMSS e INFONAVIT', 'asistencia-horarios': 'Asistencia y horarios', 'vacaciones-ausencias': 'Vacaciones y ausencias', 'reclutamiento-onboarding': 'Reclutamiento y onboarding', desempeno: 'Evaluación de desempeño', capacitacion: 'Capacitación', prestaciones: 'Prestaciones y beneficios',
  'crm-pipeline': 'CRM y pipeline', 'cotizaciones-propuestas': 'Cotizaciones y propuestas', 'catalogo-precios': 'Catálogo y listas de precios', prospeccion: 'Prospección', pronostico: 'Pronóstico de ventas', comisiones: 'Comisiones', 'contratos-cierre': 'Contratos y cierre', 'mayoreo-b2b': 'Ventas de mayoreo B2B', 'postventa-renovaciones': 'Postventa y renovaciones',
  'inventario-almacen': 'Inventario y almacén', 'compras-proveedores': 'Compras y proveedores', 'logistica-envios': 'Logística y envíos', 'proyectos-tareas': 'Proyectos y tareas', produccion: 'Producción', mantenimiento: 'Mantenimiento', calidad: 'Control de calidad', 'mesa-ayuda': 'Mesa de ayuda', 'automatizacion-procesos': 'Automatización de procesos', documentos: 'Gestión documental',
  'firma-electronica': 'Firma electrónica', 'gestion-contratos': 'Gestión de contratos', 'expedientes-casos': 'Expedientes y casos', 'cumplimiento-normativo': 'Cumplimiento normativo', societario: 'Corporativo y societario', 'marcas-pi': 'Marcas y propiedad intelectual', 'proteccion-datos': 'Protección de datos',
  'horas-facturables': 'Horas facturables', 'cuentas-clientes': 'Gestión de cuentas de clientes', 'propuestas-briefs': 'Propuestas y briefs', 'rentabilidad-proyecto': 'Rentabilidad por proyecto', 'reportes-cliente': 'Reportes para clientes', 'capacidad-equipo': 'Capacidad del equipo', 'aprobaciones-creativas': 'Aprobaciones creativas',
};

/** Capabilities grouped by their parent category, in solutionCapabilities' declared order — what the editor renders once a category is picked. */
export function capabilitiesByCategory(categories: readonly string[]): { category: string; items: { id: string; label: string }[] }[] {
  return categories
    .map(category => ({ category, items: solutionCapabilities.filter(item => item.category === category).map(item => ({ id: item.id, label: capabilityLabels[item.id] ?? item.id })) }))
    .filter(group => group.items.length > 0);
}

export const integrationLabels: Record<string, string> = {
  'sat-cfdi': 'SAT / CFDI', contpaqi: 'Contpaqi', aspel: 'Aspel', quickbooks: 'QuickBooks', xero: 'Xero', odoo: 'Odoo', sap: 'SAP', netsuite: 'Oracle NetSuite',
  shopify: 'Shopify', 'mercado-libre': 'Mercado Libre', woocommerce: 'WooCommerce', amazon: 'Amazon', stripe: 'Stripe', conekta: 'Conekta', clip: 'Clip', 'mercado-pago': 'Mercado Pago', paypal: 'PayPal', 'bancos-mx': 'Bancos mexicanos',
  'google-workspace': 'Google Workspace', 'microsoft-365': 'Microsoft 365', slack: 'Slack', 'whatsapp-business': 'WhatsApp Business', 'zapier-make': 'Zapier / Make', 'api-publica': 'API pública', webhooks: 'Webhooks',
};
export const integrationOptions = solutionIntegrations.map(id => ({ value: id, label: integrationLabels[id] ?? id }));

export const pricingModelLabels: Record<string, string> = { 'suscripcion-mensual': 'Suscripción mensual', 'suscripcion-anual': 'Suscripción anual', 'pago-unico': 'Pago único', 'por-uso': 'Por uso o transacción', 'por-proyecto': 'Por proyecto', 'por-hora': 'Por hora', comision: 'Comisión sobre operación', 'solo-cotizar': 'Solo a cotizar' };
export const pricingModelOptions = solutionPricingModels.map(id => ({ value: id, label: pricingModelLabels[id] ?? id }));

export const priceBandLabels: Record<string, string> = { 'menos-1000': 'Menos de $1,000 MXN/mes', 'de-1000-a-5000': '$1,000–$5,000 MXN/mes', 'de-5000-a-20000': '$5,000–$20,000 MXN/mes', 'de-20000-a-50000': '$20,000–$50,000 MXN/mes', 'mas-50000': 'Más de $50,000 MXN/mes', 'depende-alcance': 'Depende del alcance' };
export const priceBandOptions = solutionPriceBands.map(id => ({ value: id, label: priceBandLabels[id] ?? id }));

export const setupTimeLabels: Record<string, string> = { 'mismo-dia': 'El mismo día', 'menos-semana': 'Menos de una semana', 'una-a-cuatro-semanas': 'De una a cuatro semanas', 'uno-a-tres-meses': 'De uno a tres meses', 'mas-tres-meses': 'Más de tres meses' };
export const setupTimeOptions = solutionSetupTimes.map(id => ({ value: id, label: setupTimeLabels[id] ?? id }));

export const complianceLabels: Record<string, string> = { 'cfdi-4-0': 'CFDI 4.0 y timbrado', 'sat-buzon': 'Buzón y descarga SAT', 'nom-151': 'NOM-151 (firma)', 'nom-024': 'NOM-024 (expediente clínico)', 'imss-infonavit': 'IMSS / INFONAVIT', lfpdppp: 'LFPDPPP', gdpr: 'GDPR', 'iso-27001': 'ISO 27001', 'soc-2': 'SOC 2', 'soporte-espanol': 'Soporte en español', 'factura-fiscal-mx': 'Factura fiscal mexicana' };
export const complianceOptions = solutionCompliance.map(id => ({ value: id, label: complianceLabels[id] ?? id }));

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
