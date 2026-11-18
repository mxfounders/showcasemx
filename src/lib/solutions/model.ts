import { readPublicLinks, readFounders, type PublicLink, type SolutionFounder } from './profile';
import { isCurrencyCode } from '@/lib/currencies';
import { isCountryCode } from '@/lib/countries';
import { isLanguageCode } from '@/lib/languages';
export type SolutionScreenshot = { id: string; caption: string };
/**
 * A customer case the project tells about (SHCWS-56): who, what they had, what changed and
 * a link to read more. Always shown as declared by the project: the customer has not
 * confirmed it, and nothing in this object can say otherwise (a flag here would be
 * founder-written, so readSolutionData drops any extra key).
 */
export type SolutionCase = { client: string; problem: string; result: string; url?: string };
/**
 * One plan of a price list (SHCWS-180): its name, what it costs and what it includes.
 * No `price` means «a la medida» (quoted); 0 is a free plan; above zero it needs its
 * currency and what it pays for, like the «Desde» price. Never converted.
 */
export type SolutionPlan = {
  name: string;
  price?: number;
  currency?: string;
  unit?: string;
  includes?: string;
};
/** Public pages a buyer or their technical team reads before deciding (SHCWS-180). */
export const solutionResourceKinds = [
  'docs',
  'api',
  'changelog',
  'status',
  'roadmap',
  'help',
  'community',
] as const;
export type SolutionResourceKind = (typeof solutionResourceKinds)[number];
// hideSiteImage: the founder's opt-out of showing the auto-fetched og:image of
// their own site as a ficha slide. Absent/false = shown, so no existing ficha
// changes. Named in the negative on purpose: an absent boolean must mean
// "show", and a jsonb key that is merely false already means that.
// coverSource: which image leads — the card cover and the first slide. Absent or 'site'
// = the site's og:image (the default the owner chose on 18 Nov 2026); 'screenshot' = the
// founder's first gallery image, with the og:image after the gallery.
export const solutionCoverSources = ['site', 'screenshot'] as const;
export type SolutionCoverSource = (typeof solutionCoverSources)[number];
export type SolutionData = {
  name: string;
  kind: string;
  category: string;
  categories?: string[];
  problem: string;
  audience: string;
  website: string;
  contactEmail: string;
  scope?: string;
  pricing?: string;
  implementation?: string;
  integrations?: string;
  support?: string;
  evidence?: string;
  evidenceUrl?: string;
  demoUrl?: string;
  notFor?: string;
  screenshots?: SolutionScreenshot[];
  founders?: SolutionFounder[];
  projectLinks?: PublicLink[];
  hideSiteImage?: boolean;
  coverSource?: SolutionCoverSource;
  industries?: string[];
  companySizes?: string[];
  capabilities?: string[];
  integrationKeys?: string[];
  pricingModel?: string[];
  priceBand?: string;
  /**
   * The entry price («Desde», SHCWS-51) in the founder's own currency: an amount, its ISO
   * 4217 code and what it pays for (one of `solutionPriceUnits`). Optional to publish; the
   * three only show once the amount and currency are there. 0 means a free plan. Never
   * converted: there is no exchange-rate source, so a buyer sees the declared currency.
   */
  priceFrom?: number;
  priceCurrency?: string;
  priceUnit?: string;
  setupTime?: string;
  compliance?: string[];
  /**
   * Where the provider is and operates (SHCWS-56), all optional and declared by the
   * project. ISO 3166-1 alpha-2 country codes. `serviceCountries` (where it serves
   * customers) and `billingCountries` (where it can invoice) keep the tri-state of
   * industries/companySizes: undefined = never answered, [] = any country, a list = those.
   */
  originCountry?: string;
  serviceCountries?: string[];
  billingCountries?: string[];
  /** ISO 4217 currencies it charges in. */
  currencies?: string[];
  /** ISO 639-1 languages it gives support in, and its support hours in its own words. */
  supportLanguages?: string[];
  supportHours?: string;
  paymentMethods?: string[];
  /** Track record, declared: year founded, team and customer bands, customer cases. */
  foundedYear?: number;
  teamSize?: string;
  customerCount?: string;
  cases?: SolutionCase[];
  /**
   * SHCWS-180, all optional and declared. Plans and how to try it; the tools a technical
   * team can build with and the public pages behind them; how support works and what
   * leaving looks like. Closed lists so a founder fills them in with clicks.
   */
  plans?: SolutionPlan[];
  tryOptions?: string[];
  /** Length of the free trial, when `tryOptions` says there is one. */
  trialDays?: number;
  developerTools?: string[];
  resources?: Partial<Record<SolutionResourceKind, string>>;
  supportChannels?: string[];
  /** How soon the first answer arrives, as declared (one of `solutionSupportResponses`). */
  supportResponse?: string;
  /** Contractual availability in percent; only a real commitment belongs here. */
  slaUptime?: number;
  onboarding?: string[];
  exitTerms?: string[];
  /**
   * A category the founder could not find in the list, in their own words. Private:
   * only the team reads it in ops, to learn which categories are missing. It never
   * places the listing anywhere by itself.
   */
  otherCategory?: string;
};
export const emptySolution: SolutionData = {
  name: '',
  kind: '',
  category: '',
  problem: '',
  audience: '',
  website: '',
  contactEmail: '',
};
export const solutionCategories = [
  'Cobros',
  'Finanzas',
  'Nómina',
  'Ventas',
  'Operación',
  'Legal',
  'Agencias',
  // Added so projects outside finance/operations have a real home instead of being
  // filed under the nearest neighbour. The seven above stay as stored values.
  'Marketing',
  'Atención al cliente',
  'Datos e IA',
  'TI y seguridad',
  'Comercio electrónico',
  'Productividad',
  'Desarrollo',
] as const;
// Plain value lists a solution can declare. This file owns what is legal to
// store; src/lib/taxonomy.ts imports these same arrays to attach labels,
// tones and routes for the UI, so the two can never drift apart. Reversing
// that import direction would create a cycle (model.ts needs the value list
// to validate; taxonomy.ts needs the value list to build its richer entries).
export const solutionIndustries = [
  'Agencias',
  'Retail',
  'Manufactura',
  'Legal',
  'Construcción',
  'Salud',
  'Educación',
  'Tecnología',
  'Servicios financieros',
  'Logística y transporte',
  'Hospitalidad',
  'Inmobiliario',
  'Servicios profesionales',
  'Sector público',
  'Agroindustria',
] as const;
export const companySizes = ['micro', 'pyme', 'mediana', 'corporativo'] as const;
// [] on either field means "declared, serves any" — a deliberate answer, not a
// gap. undefined means the founder never answered the question. The public
// ficha and the filters must tell these two apart; see solutionChecklist.
// Capabilities: what a solution actually *does*, one level more specific than
// its 7 broad categories — "Ventas" alone can't tell "cotizaciones" apart from
// "conciliación bancaria". Each capability belongs to exactly one category, so
// the editor can offer only the ones under categories the founder already
// declared. Unlike industries/companySizes there's no "any" answer here: a
// solution either does something concrete or it doesn't, so the field has no
// [] state — undefined (never answered) is the only gap, and at least one
// capability is required to submit (see solutionErrors). Labels live in
// src/lib/taxonomy.ts, search terms in src/lib/search/vocabulary.ts.
export const solutionCapabilities = [
  { id: 'facturacion-cfdi', category: 'Cobros' },
  { id: 'cobranza-recordatorios', category: 'Cobros' },
  { id: 'conciliacion-bancaria', category: 'Cobros' },
  { id: 'portal-pagos', category: 'Cobros' },
  { id: 'suscripciones', category: 'Cobros' },
  { id: 'cartera-antiguedad', category: 'Cobros' },
  { id: 'cuentas-por-pagar', category: 'Cobros' },
  { id: 'factoraje', category: 'Cobros' },
  { id: 'flujo-efectivo', category: 'Finanzas' },
  { id: 'presupuestos', category: 'Finanzas' },
  { id: 'contabilidad', category: 'Finanzas' },
  { id: 'reportes-tableros', category: 'Finanzas' },
  { id: 'gastos-reembolsos', category: 'Finanzas' },
  { id: 'tarjetas-corporativas', category: 'Finanzas' },
  { id: 'consolidacion-multiempresa', category: 'Finanzas' },
  { id: 'impuestos', category: 'Finanzas' },
  { id: 'calculo-timbrado', category: 'Nómina' },
  { id: 'dispersion', category: 'Nómina' },
  { id: 'imss-infonavit', category: 'Nómina' },
  { id: 'asistencia-horarios', category: 'Nómina' },
  { id: 'vacaciones-ausencias', category: 'Nómina' },
  { id: 'reclutamiento-onboarding', category: 'Nómina' },
  { id: 'desempeno', category: 'Nómina' },
  { id: 'capacitacion', category: 'Nómina' },
  { id: 'prestaciones', category: 'Nómina' },
  { id: 'crm-pipeline', category: 'Ventas' },
  { id: 'cotizaciones-propuestas', category: 'Ventas' },
  { id: 'catalogo-precios', category: 'Ventas' },
  { id: 'prospeccion', category: 'Ventas' },
  { id: 'pronostico', category: 'Ventas' },
  { id: 'comisiones', category: 'Ventas' },
  { id: 'contratos-cierre', category: 'Ventas' },
  { id: 'mayoreo-b2b', category: 'Ventas' },
  { id: 'postventa-renovaciones', category: 'Ventas' },
  { id: 'inventario-almacen', category: 'Operación' },
  { id: 'compras-proveedores', category: 'Operación' },
  { id: 'logistica-envios', category: 'Operación' },
  { id: 'proyectos-tareas', category: 'Operación' },
  { id: 'produccion', category: 'Operación' },
  { id: 'mantenimiento', category: 'Operación' },
  { id: 'calidad', category: 'Operación' },
  { id: 'mesa-ayuda', category: 'Operación' },
  { id: 'automatizacion-procesos', category: 'Operación' },
  { id: 'documentos', category: 'Operación' },
  { id: 'firma-electronica', category: 'Legal' },
  { id: 'gestion-contratos', category: 'Legal' },
  { id: 'expedientes-casos', category: 'Legal' },
  { id: 'cumplimiento-normativo', category: 'Legal' },
  { id: 'societario', category: 'Legal' },
  { id: 'marcas-pi', category: 'Legal' },
  { id: 'proteccion-datos', category: 'Legal' },
  { id: 'horas-facturables', category: 'Agencias' },
  { id: 'cuentas-clientes', category: 'Agencias' },
  { id: 'propuestas-briefs', category: 'Agencias' },
  { id: 'rentabilidad-proyecto', category: 'Agencias' },
  { id: 'reportes-cliente', category: 'Agencias' },
  { id: 'capacidad-equipo', category: 'Agencias' },
  { id: 'aprobaciones-creativas', category: 'Agencias' },
  { id: 'email-marketing', category: 'Marketing' },
  { id: 'redes-sociales', category: 'Marketing' },
  { id: 'seo-contenido', category: 'Marketing' },
  { id: 'publicidad-digital', category: 'Marketing' },
  { id: 'automatizacion-marketing', category: 'Marketing' },
  { id: 'analitica-marketing', category: 'Marketing' },
  { id: 'eventos-webinars', category: 'Marketing' },
  { id: 'chat-en-vivo', category: 'Atención al cliente' },
  { id: 'whatsapp-atencion', category: 'Atención al cliente' },
  { id: 'base-conocimiento', category: 'Atención al cliente' },
  { id: 'encuestas-satisfaccion', category: 'Atención al cliente' },
  { id: 'centro-contacto', category: 'Atención al cliente' },
  { id: 'chatbots', category: 'Atención al cliente' },
  { id: 'lealtad-clientes', category: 'Atención al cliente' },
  { id: 'inteligencia-negocios', category: 'Datos e IA' },
  { id: 'asistentes-ia', category: 'Datos e IA' },
  { id: 'automatizacion-ia', category: 'Datos e IA' },
  { id: 'procesamiento-documentos', category: 'Datos e IA' },
  { id: 'modelos-predictivos', category: 'Datos e IA' },
  { id: 'integracion-datos', category: 'Datos e IA' },
  { id: 'ciberseguridad', category: 'TI y seguridad' },
  { id: 'identidad-accesos', category: 'TI y seguridad' },
  { id: 'respaldos-recuperacion', category: 'TI y seguridad' },
  { id: 'gestion-dispositivos', category: 'TI y seguridad' },
  { id: 'monitoreo-infraestructura', category: 'TI y seguridad' },
  { id: 'soporte-ti', category: 'TI y seguridad' },
  { id: 'tienda-online', category: 'Comercio electrónico' },
  { id: 'venta-marketplaces', category: 'Comercio electrónico' },
  { id: 'checkout-pagos-online', category: 'Comercio electrónico' },
  { id: 'catalogo-online', category: 'Comercio electrónico' },
  { id: 'carritos-abandonados', category: 'Comercio electrónico' },
  { id: 'punto-venta', category: 'Comercio electrónico' },
  { id: 'comunicacion-interna', category: 'Productividad' },
  { id: 'documentos-colaborativos', category: 'Productividad' },
  { id: 'agenda-reuniones', category: 'Productividad' },
  { id: 'gestion-conocimiento', category: 'Productividad' },
  { id: 'flujos-aprobacion', category: 'Productividad' },
  { id: 'intranet', category: 'Productividad' },
  { id: 'apis-integraciones', category: 'Desarrollo' },
  { id: 'herramientas-desarrollo', category: 'Desarrollo' },
  { id: 'infraestructura-nube', category: 'Desarrollo' },
  { id: 'no-code-low-code', category: 'Desarrollo' },
  { id: 'pruebas-calidad-software', category: 'Desarrollo' },
  { id: 'analitica-producto', category: 'Desarrollo' },
] as const satisfies readonly { id: string; category: (typeof solutionCategories)[number] }[];
// The other four commercial axes. None of these have a tri-state "any": an
// empty/absent value means the same thing (never answered), so there's
// nothing to distinguish the way [] does for industries/companySizes.
export const solutionIntegrations = [
  'sat-cfdi',
  'contpaqi',
  'aspel',
  'quickbooks',
  'xero',
  'odoo',
  'sap',
  'netsuite',
  'shopify',
  'mercado-libre',
  'woocommerce',
  'amazon',
  'stripe',
  'conekta',
  'clip',
  'mercado-pago',
  'paypal',
  'bancos-mx',
  'google-workspace',
  'microsoft-365',
  'slack',
  'whatsapp-business',
  'zapier-make',
  'api-publica',
  'webhooks',
] as const;
export const solutionPricingModels = [
  'suscripcion-mensual',
  'suscripcion-anual',
  'pago-unico',
  'por-uso',
  'por-proyecto',
  'por-hora',
  'comision',
  'solo-cotizar',
] as const;
/**
 * What a «Desde» price pays for: the pricing models a single amount can describe.
 * «Comisión» (a percentage) and «Solo a cotizar» (no public price) have no amount.
 */
export const solutionPriceUnits = [
  'suscripcion-mensual',
  'suscripcion-anual',
  'pago-unico',
  'por-uso',
  'por-proyecto',
  'por-hora',
] as const satisfies readonly (typeof solutionPricingModels)[number][];
/** Upper bound of a declared amount: room for currencies with large numbers (COP, IDR). */
export const maxPriceFrom = 10_000_000_000;
/**
 * Price bands, in US dollars so listings in any currency can be filtered together
 * (SHCWS-51). Two families: a recurring monthly cost for software, and a budget per
 * project for agencies and services. The monthly ids keep the names they were stored
 * with (they once counted pesos); their labels say what they mean today.
 */
export const monthlyPriceBands = [
  'menos-1000',
  'de-1000-a-5000',
  'de-5000-a-20000',
  'de-20000-a-50000',
  'mas-50000',
] as const;
export const projectPriceBands = [
  'proyecto-menos-1000',
  'proyecto-1000-a-5000',
  'proyecto-5000-a-20000',
  'proyecto-20000-a-50000',
  'proyecto-mas-50000',
] as const;
export const solutionPriceBands = [
  ...monthlyPriceBands,
  ...projectPriceBands,
  'depende-alcance',
] as const;
export const solutionSetupTimes = [
  'mismo-dia',
  'menos-semana',
  'una-a-cuatro-semanas',
  'uno-a-tres-meses',
  'mas-tres-meses',
] as const;
export const solutionCompliance = [
  'cfdi-4-0',
  'sat-buzon',
  'nom-151',
  'nom-024',
  'imss-infonavit',
  'lfpdppp',
  'gdpr',
  'iso-27001',
  'soc-2',
  'soporte-espanol',
  'factura-fiscal-mx',
] as const;
/** How a customer can pay (SHCWS-56). Labels in src/lib/taxonomy.ts. */
export const solutionPaymentMethods = [
  'tarjeta',
  'transferencia',
  'domiciliacion',
  'efectivo',
  'paypal',
  'billeteras',
  'credito',
  'cripto',
] as const;
/** People on the team, in bands: a number nobody can check would look more precise than it is. */
export const solutionTeamSizes = [
  'uno',
  'de-2-a-10',
  'de-11-a-50',
  'de-51-a-200',
  'de-201-a-1000',
  'mas-1000',
] as const;
export const solutionCustomerCounts = [
  'hasta-10',
  'de-11-a-50',
  'de-51-a-200',
  'de-201-a-1000',
  'de-1001-a-10000',
  'mas-10000',
] as const;
// SHCWS-180. Labels in src/lib/taxonomy.ts and src/lib/taxonomy-en.ts.
/** Ways a buyer can try it before paying. */
export const solutionTryOptions = [
  'plan-gratis',
  'prueba-gratis',
  'sin-tarjeta',
  'demo-publica',
  'demo-guiada',
  'diagnostico-gratis',
] as const;
/** What a technical team can build with. */
export const solutionDeveloperTools = [
  'api-rest',
  'graphql',
  'webhooks',
  'openapi',
  'sdks',
  'cli',
  'mcp',
  'sandbox',
  'embebibles',
  'oauth',
] as const;
export const solutionSupportChannels = [
  'correo',
  'chat',
  'telefono',
  'whatsapp',
  'videollamada',
  'centro-ayuda',
  'comunidad',
  'portal-clientes',
  'persona-asignada',
] as const;
/** How soon the first answer arrives, fastest first. */
export const solutionSupportResponses = [
  'menos-1-hora',
  'menos-4-horas',
  'mismo-dia',
  'menos-24-horas',
  'menos-48-horas',
  'mas-48-horas',
] as const;
/** How a new customer gets started. */
export const solutionOnboarding = [
  'autoservicio',
  'configuracion-asistida',
  'importacion-datos',
  'capacitacion',
  'acompanamiento',
] as const;
/** What leaving looks like: the lock-in questions a buyer asks before signing. */
export const solutionExitTerms = [
  'cancela-cuando-quieras',
  'sin-plazo-forzoso',
  'exporta-tus-datos',
  'borra-tu-cuenta',
  'codigo-es-tuyo',
  'garantia-reembolso',
] as const;
export const maxSolutionPlans = 6;
export const planLimits = { name: 40, includes: 240 } as const;
export const maxTrialDays = 365;
/** A declared SLA below this is not an availability commitment worth publishing. */
export const minSlaUptime = 90;
/** Gallery images per listing; a solution keeps up to 12 files (src/lib/solutions/screenshots.ts). */
export const maxSolutionScreenshots = 8;
export const maxSolutionCases = 4;
export const caseLimits = { client: 100, problem: 400, result: 400, url: 500 } as const;
export const supportHoursLimit = 120;
/** The earliest founding year a listing can declare; the latest is the current year. */
export const minFoundedYear = 1900;

// Review states of a founder's solution. Their labels and next-step copy live in
// the `solutionEditor.statuses` dictionary section, keyed by these same values.
export const solutionStatuses = [
  'draft',
  'pending',
  'changes_requested',
  'published',
  'rejected',
] as const;
export type SolutionStatus = (typeof solutionStatuses)[number];
export const isSolutionStatus = (value: unknown): value is SolutionStatus =>
  solutionStatuses.some(status => status === value);
// has_site_image: whether the og:image read from the project's own website is
// stored, so a draft already has a cover. See src/lib/solutions/site-image.ts.
export type FounderSolution = {
  id: string;
  /** Names the public page, /soluciones/<slug>; set at the first approval (SHCWS-101). */
  slug?: string | null;
  catalog_key?: string | null;
  owner_id: string;
  data: SolutionData;
  status: SolutionStatus;
  step: number;
  version: number;
  published_data: SolutionData | null;
  updated_at: string;
  published_at?: string | null;
  editor_question?: string | null;
  has_site_image?: boolean;
  site_image_failure?: string | null;
  /** The logo read from the same site is stored (SHCWS-177, src/lib/solutions/site-icon.ts). */
  has_site_icon?: boolean;
  /** Approved at some point, even if unpublished since: never deletable (SHCWS-32). */
  was_published?: boolean;
};
export type SolutionEvent = {
  id: string;
  status: SolutionStatus;
  message: string;
  created_at: string;
};
/**
 * Fixed messages the founder's own actions store in `solution_events`. They stay in
 * Spanish in the database (ops reads them too); the account shows them through the
 * dictionary. A reviewer's message is their own words and is never translated.
 */
export const solutionSystemMessages = {
  submitted: 'Postulación enviada a revisión.',
  unpublished: 'Ficha despublicada por su fundador.',
  submissionWithdrawn: 'Envío retirado de la revisión por su fundador.',
} as const;
/**
 * The decision a founder needs to read at the top of their listing (SHCWS-31): the latest
 * event, when it is a request for changes or a rejection nobody has answered yet. Saving
 * turns the listing back into a draft without writing an event, so the comment stays in
 * view while the founder fixes it, and goes away once they submit again.
 * `events` comes newest first, as getEvents returns it.
 */
export function latestDecision(status: SolutionStatus, events: readonly SolutionEvent[]) {
  if (status === 'pending' || status === 'published') return null;
  const event = events[0];
  return event && (event.status === 'changes_requested' || event.status === 'rejected')
    ? event
    : null;
}
/** The review target ops commits to, in business hours, or null while none is set. */
export function reviewTargetHours(value: string | undefined) {
  const hours = Number(value);
  return Number.isInteger(hours) && hours > 0 && hours <= 720 ? hours : null;
}
export const isSolutionId = (value: string) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function readSolutionData(value: unknown): SolutionData | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const result = { ...emptySolution };
  const limits = {
    name: 100,
    kind: 20,
    category: 30,
    problem: 1500,
    audience: 800,
    website: 500,
    contactEmail: 254,
  };
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    if (key === 'category' && input.category === undefined && Array.isArray(input.categories))
      continue;
    if (typeof input[key] !== 'string' || input[key].length > limits[key]) return null;
    result[key] = input[key].trim();
  }
  if (result.kind && !['Software', 'Agencia', 'Servicio'].includes(result.kind)) return null;
  if (result.category && !solutionCategories.some(category => category === result.category))
    return null;
  if (input.categories !== undefined) {
    if (
      !Array.isArray(input.categories) ||
      input.categories.length > solutionCategories.length ||
      input.categories.some(
        value =>
          typeof value !== 'string' || !solutionCategories.some(category => category === value),
      )
    )
      return null;
    result.categories = Array.from(new Set(input.categories as string[]));
    result.category = result.categories[0] ?? '';
  }
  for (const field of solutionEvaluationFields) {
    const value = input[field.key];
    if (value !== undefined) {
      if (typeof value !== 'string' || value.length > field.limit) return null;
      result[field.key] = value.trim();
    }
  }
  if (input.evidenceUrl !== undefined) {
    if (typeof input.evidenceUrl !== 'string' || input.evidenceUrl.length > 500) return null;
    result.evidenceUrl = input.evidenceUrl.trim();
  }
  if (input.demoUrl !== undefined) {
    if (typeof input.demoUrl !== 'string' || input.demoUrl.length > 500) return null;
    result.demoUrl = input.demoUrl.trim();
  }
  if (input.notFor !== undefined) {
    if (typeof input.notFor !== 'string' || input.notFor.length > 500) return null;
    result.notFor = input.notFor.trim();
  }
  if (input.screenshots !== undefined) {
    if (!Array.isArray(input.screenshots) || input.screenshots.length > maxSolutionScreenshots)
      return null;
    const screenshots: SolutionScreenshot[] = [];
    for (const item of input.screenshots) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.id !== 'string' ||
        !isSolutionId(item.id) ||
        typeof item.caption !== 'string' ||
        item.caption.length > 180 ||
        screenshots.some(s => s.id === item.id)
      )
        return null;
      screenshots.push({ id: item.id, caption: item.caption.trim() });
    }
    result.screenshots = screenshots;
  }
  if (input.founders !== undefined) {
    const founders = readFounders(input.founders);
    if (!founders) return null;
    result.founders = founders;
  }
  if (input.projectLinks !== undefined) {
    const links = readPublicLinks(input.projectLinks, 6);
    if (!links) return null;
    result.projectLinks = links;
  }
  if (input.otherCategory !== undefined) {
    if (typeof input.otherCategory !== 'string' || input.otherCategory.length > 80) return null;
    const value = input.otherCategory.trim();
    if (value) result.otherCategory = value;
  }
  if (input.hideSiteImage !== undefined) {
    if (typeof input.hideSiteImage !== 'boolean') return null;
    result.hideSiteImage = input.hideSiteImage;
  }
  if (input.coverSource !== undefined) {
    if (!solutionCoverSources.includes(input.coverSource as SolutionCoverSource)) return null;
    if (input.coverSource === 'screenshot') result.coverSource = 'screenshot';
  }
  // An empty array is a real, valid answer ("sirve a cualquier industria/tamaño"),
  // distinct from the field being absent (never answered). Both fields keep that
  // distinction all the way through: never default a missing one to [].
  if (input.industries !== undefined) {
    if (
      !Array.isArray(input.industries) ||
      input.industries.length > solutionIndustries.length ||
      input.industries.some(
        value =>
          typeof value !== 'string' || !solutionIndustries.some(industry => industry === value),
      )
    )
      return null;
    result.industries = Array.from(new Set(input.industries as string[]));
  }
  if (input.companySizes !== undefined) {
    if (
      !Array.isArray(input.companySizes) ||
      input.companySizes.length > companySizes.length ||
      input.companySizes.some(
        value => typeof value !== 'string' || !companySizes.some(size => size === value),
      )
    )
      return null;
    result.companySizes = Array.from(new Set(input.companySizes as string[]));
  }
  // capabilities has no [] state (see the comment above its declaration): an
  // absent key is the only gap, so this is the same shape of check as
  // industries/companySizes minus the "any" branch.
  if (input.capabilities !== undefined) {
    if (
      !Array.isArray(input.capabilities) ||
      input.capabilities.length > solutionCapabilities.length ||
      input.capabilities.some(
        value => typeof value !== 'string' || !solutionCapabilities.some(item => item.id === value),
      )
    )
      return null;
    result.capabilities = Array.from(new Set(input.capabilities as string[]));
  }
  if (input.integrationKeys !== undefined) {
    if (
      !Array.isArray(input.integrationKeys) ||
      input.integrationKeys.length > solutionIntegrations.length ||
      input.integrationKeys.some(
        value => typeof value !== 'string' || !solutionIntegrations.some(key => key === value),
      )
    )
      return null;
    result.integrationKeys = Array.from(new Set(input.integrationKeys as string[]));
  }
  if (input.pricingModel !== undefined) {
    if (
      !Array.isArray(input.pricingModel) ||
      input.pricingModel.length > solutionPricingModels.length ||
      input.pricingModel.some(
        value => typeof value !== 'string' || !solutionPricingModels.some(model => model === value),
      )
    )
      return null;
    result.pricingModel = Array.from(new Set(input.pricingModel as string[]));
  }
  if (input.priceBand !== undefined) {
    if (
      typeof input.priceBand !== 'string' ||
      !solutionPriceBands.some(band => band === input.priceBand)
    )
      return null;
    result.priceBand = input.priceBand;
  }
  if (input.priceFrom !== undefined) {
    if (
      typeof input.priceFrom !== 'number' ||
      !Number.isFinite(input.priceFrom) ||
      input.priceFrom < 0 ||
      input.priceFrom > maxPriceFrom
    )
      return null;
    // Cents at most: a price list never needs more, and it keeps formatting exact.
    result.priceFrom = Math.round(input.priceFrom * 100) / 100;
  }
  if (input.priceCurrency !== undefined) {
    if (!isCurrencyCode(input.priceCurrency)) return null;
    result.priceCurrency = input.priceCurrency;
  }
  if (input.priceUnit !== undefined) {
    if (
      typeof input.priceUnit !== 'string' ||
      !solutionPriceUnits.some(unit => unit === input.priceUnit)
    )
      return null;
    result.priceUnit = input.priceUnit;
  }
  if (input.setupTime !== undefined) {
    if (
      typeof input.setupTime !== 'string' ||
      !solutionSetupTimes.some(time => time === input.setupTime)
    )
      return null;
    result.setupTime = input.setupTime;
  }
  if (input.compliance !== undefined) {
    if (
      !Array.isArray(input.compliance) ||
      input.compliance.length > solutionCompliance.length ||
      input.compliance.some(
        value => typeof value !== 'string' || !solutionCompliance.some(item => item === value),
      )
    )
      return null;
    result.compliance = Array.from(new Set(input.compliance as string[]));
  }
  if (input.originCountry !== undefined) {
    if (!isCountryCode(String(input.originCountry))) return null;
    result.originCountry = String(input.originCountry);
  }
  // Same tri-state as industries: [] = any country, a real answer; absent = never answered.
  for (const key of ['serviceCountries', 'billingCountries'] as const) {
    const value = readCodes(input[key], isCountryCode, 300);
    if (value === null) return null;
    if (value) result[key] = value;
  }
  const currencies = readCodes(input.currencies, isCurrencyCode, 20);
  if (currencies === null) return null;
  if (currencies?.length) result.currencies = currencies;
  const languages = readCodes(input.supportLanguages, isLanguageCode, 20);
  if (languages === null) return null;
  if (languages?.length) result.supportLanguages = languages;
  if (input.supportHours !== undefined) {
    if (typeof input.supportHours !== 'string' || input.supportHours.length > supportHoursLimit)
      return null;
    const value = input.supportHours.trim();
    if (value) result.supportHours = value;
  }
  const payments = readCodes(
    input.paymentMethods,
    (value: string) => solutionPaymentMethods.some(item => item === value),
    solutionPaymentMethods.length,
  );
  if (payments === null) return null;
  if (payments?.length) result.paymentMethods = payments;
  if (input.foundedYear !== undefined) {
    if (
      typeof input.foundedYear !== 'number' ||
      !Number.isInteger(input.foundedYear) ||
      input.foundedYear < minFoundedYear ||
      input.foundedYear > 2100
    )
      return null;
    result.foundedYear = input.foundedYear;
  }
  if (input.teamSize !== undefined) {
    if (!solutionTeamSizes.some(item => item === input.teamSize)) return null;
    result.teamSize = String(input.teamSize);
  }
  if (input.customerCount !== undefined) {
    if (!solutionCustomerCounts.some(item => item === input.customerCount)) return null;
    result.customerCount = String(input.customerCount);
  }
  if (input.cases !== undefined) {
    if (!Array.isArray(input.cases) || input.cases.length > maxSolutionCases) return null;
    const cases: SolutionCase[] = [];
    for (const item of input.cases) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const entry = item as Record<string, unknown>;
      const read = (key: keyof typeof caseLimits) =>
        entry[key] === undefined
          ? ''
          : typeof entry[key] === 'string' && entry[key].length <= caseLimits[key]
            ? entry[key].trim()
            : null;
      const [client, problem, outcome, url] = [
        read('client'),
        read('problem'),
        read('result'),
        read('url'),
      ];
      if (client === null || problem === null || outcome === null || url === null) return null;
      // Unknown keys (a «confirmed» flag, say) are dropped: only the customer could confirm.
      cases.push({ client, problem, result: outcome, ...(url ? { url } : {}) });
    }
    result.cases = cases;
  }
  if (!readOffer(input, result)) return null;
  return result;
}

/**
 * Only the SHCWS-180 fields of a stored listing, for readers that select them on their own
 * (the comparator). Null keys from SQL count as absent; a malformed value yields nothing.
 */
export function readOfferFacts(value: unknown): Partial<SolutionData> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== null),
  );
  const result: SolutionData = { ...emptySolution };
  if (!readOffer(input, result)) return {};
  const { plans, tryOptions, trialDays, developerTools, resources } = result;
  const { supportChannels, supportResponse, slaUptime, onboarding, exitTerms } = result;
  return Object.fromEntries(
    Object.entries({
      plans,
      tryOptions,
      trialDays,
      developerTools,
      resources,
      supportChannels,
      supportResponse,
      slaUptime,
      onboarding,
      exitTerms,
    }).filter(([, item]) => item !== undefined),
  );
}

/**
 * The SHCWS-180 fields: plans and how to try it, developer tools and public resources,
 * support and exit terms. Writes what is valid into `result`; false when anything is
 * malformed, so readSolutionData rejects the whole payload as it does for the rest.
 */
function readOffer(input: Record<string, unknown>, result: SolutionData) {
  if (input.plans !== undefined) {
    if (!Array.isArray(input.plans) || input.plans.length > maxSolutionPlans) return false;
    const plans: SolutionPlan[] = [];
    for (const item of input.plans) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const entry = item as Record<string, unknown>;
      if (typeof entry.name !== 'string' || entry.name.length > planLimits.name) return false;
      const plan: SolutionPlan = { name: entry.name.trim() };
      if (entry.price !== undefined) {
        if (
          typeof entry.price !== 'number' ||
          !Number.isFinite(entry.price) ||
          entry.price < 0 ||
          entry.price > maxPriceFrom
        )
          return false;
        plan.price = Math.round(entry.price * 100) / 100;
      }
      if (entry.currency !== undefined) {
        if (!isCurrencyCode(entry.currency)) return false;
        plan.currency = entry.currency;
      }
      if (entry.unit !== undefined) {
        if (!solutionPriceUnits.some(unit => unit === entry.unit)) return false;
        plan.unit = String(entry.unit);
      }
      if (entry.includes !== undefined) {
        if (typeof entry.includes !== 'string' || entry.includes.length > planLimits.includes)
          return false;
        const includes = entry.includes.trim();
        if (includes) plan.includes = includes;
      }
      plans.push(plan);
    }
    if (plans.length) result.plans = plans;
  }
  const lists = [
    ['tryOptions', solutionTryOptions],
    ['developerTools', solutionDeveloperTools],
    ['supportChannels', solutionSupportChannels],
    ['onboarding', solutionOnboarding],
    ['exitTerms', solutionExitTerms],
  ] as const;
  for (const [key, allowed] of lists) {
    const value = readCodes(
      input[key],
      (code: string) => allowed.some(item => item === code),
      allowed.length,
    );
    if (value === null) return false;
    if (value?.length) result[key] = value;
  }
  if (input.trialDays !== undefined) {
    if (
      typeof input.trialDays !== 'number' ||
      !Number.isInteger(input.trialDays) ||
      input.trialDays < 1 ||
      input.trialDays > maxTrialDays
    )
      return false;
    result.trialDays = input.trialDays;
  }
  if (input.supportResponse !== undefined) {
    if (!solutionSupportResponses.some(item => item === input.supportResponse)) return false;
    result.supportResponse = String(input.supportResponse);
  }
  if (input.slaUptime !== undefined) {
    if (
      typeof input.slaUptime !== 'number' ||
      !Number.isFinite(input.slaUptime) ||
      input.slaUptime < minSlaUptime ||
      input.slaUptime > 100
    )
      return false;
    result.slaUptime = Math.round(input.slaUptime * 1000) / 1000;
  }
  if (input.resources !== undefined) {
    if (!input.resources || typeof input.resources !== 'object' || Array.isArray(input.resources))
      return false;
    const resources: Partial<Record<SolutionResourceKind, string>> = {};
    for (const [kind, url] of Object.entries(input.resources as Record<string, unknown>)) {
      // Unknown kinds are dropped like any unknown key; a known one must be a short string.
      if (!solutionResourceKinds.some(item => item === kind)) continue;
      if (typeof url !== 'string' || url.length > 500) return false;
      const value = url.trim();
      if (value) resources[kind as SolutionResourceKind] = value;
    }
    if (Object.keys(resources).length) result.resources = resources;
  }
  return true;
}

/**
 * A list of codes, deduplicated: undefined when absent, null when anything in it is not
 * a valid code, and the list (possibly empty) otherwise.
 */
function readCodes(
  value: unknown,
  valid: (code: string) => boolean,
  max: number,
): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some(item => typeof item !== 'string' || !valid(item))
  )
    return null;
  return Array.from(new Set(value as string[]));
}
/**
 * Why a solution cannot move forward, as stable codes shared by the editor and the
 * API. Each code maps to a message in the `solutionEditor.validation` dictionary.
 */
export type SolutionErrorCode =
  | 'nameRequired'
  | 'kindRequired'
  | 'categoryRequired'
  | 'problemTooShort'
  | 'audienceTooShort'
  | 'industriesRequired'
  | 'companySizesRequired'
  | 'capabilitiesRequired'
  | 'capabilitiesOrphaned'
  | 'websiteInvalid'
  | 'contactEmailInvalid'
  | 'evidenceUrlInvalid'
  | 'demoUrlInvalid'
  | 'screenshotCaptionsTooShort'
  | 'foundersInvalid'
  | 'projectLinksInvalid'
  | 'priceIncomplete'
  | 'foundedYearInvalid'
  | 'casesInvalid'
  | 'plansInvalid'
  | 'resourcesInvalid';
export function solutionErrors(data: SolutionData, step?: number) {
  const errors: Partial<Record<keyof SolutionData, SolutionErrorCode>> = {};
  if (step === undefined || step === 0) {
    if (!data.name) errors.name = 'nameRequired';
    if (!data.kind) errors.kind = 'kindRequired';
    if (!getSolutionCategories(data).length) errors.category = 'categoryRequired';
  }
  if (step === undefined || step === 1) {
    if (data.problem.length < 20) errors.problem = 'problemTooShort';
    if (data.audience.length < 10) errors.audience = 'audienceTooShort';
    if (data.industries === undefined) errors.industries = 'industriesRequired';
    if (data.companySizes === undefined) errors.companySizes = 'companySizesRequired';
    if (!data.capabilities?.length) errors.capabilities = 'capabilitiesRequired';
    else if (
      data.capabilities.some(id => {
        const capability = solutionCapabilities.find(item => item.id === id);
        return !capability || !getSolutionCategories(data).includes(capability.category);
      })
    )
      errors.capabilities = 'capabilitiesOrphaned';
  }
  if (step === undefined || step === 2) {
    try {
      const url = new URL(data.website);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        !url.hostname.includes('.')
      )
        throw new Error();
    } catch {
      errors.website = 'websiteInvalid';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail))
      errors.contactEmail = 'contactEmailInvalid';
  }
  if ((step === undefined || step === 2) && data.evidenceUrl && !safeSolutionUrl(data.evidenceUrl))
    errors.evidenceUrl = 'evidenceUrlInvalid';
  // A price above zero needs its currency and what it pays for, or «Desde 500» would
  // reach a buyer without saying 500 of what, or per what. A free plan (0) needs neither.
  if (
    (step === undefined || step === 2) &&
    data.priceFrom !== undefined &&
    data.priceFrom > 0 &&
    (!data.priceCurrency || !data.priceUnit)
  )
    errors.priceFrom = 'priceIncomplete';
  if ((step === undefined || step === 1) && data.demoUrl && !safeSolutionUrl(data.demoUrl))
    errors.demoUrl = 'demoUrlInvalid';
  if (
    (step === undefined || step === 1) &&
    data.screenshots?.some(item => item.caption.trim().length < 3)
  )
    errors.screenshots = 'screenshotCaptionsTooShort';
  if (step === undefined || step === 1) {
    if (
      data.founders?.some(
        person => !person.name.trim() || person.links.some(link => !safeSolutionUrl(link.url)),
      )
    )
      errors.founders = 'foundersInvalid';
    if (data.projectLinks?.some(link => !safeSolutionUrl(link.url)))
      errors.projectLinks = 'projectLinksInvalid';
  }
  // Optional track record (SHCWS-56): only checked when declared.
  if (step === undefined || step === 2) {
    if (data.foundedYear !== undefined && data.foundedYear > new Date().getUTCFullYear())
      errors.foundedYear = 'foundedYearInvalid';
    // A case says who and what changed, and its link is a real web address.
    if (
      data.cases?.some(
        item => !item.client || !item.result || (item.url && !safeSolutionUrl(item.url)),
      )
    )
      errors.cases = 'casesInvalid';
    // SHCWS-180: a plan has a name, and a price above zero says in what and per what.
    if (
      data.plans?.some(
        plan =>
          !plan.name.trim() ||
          (plan.price !== undefined && plan.price > 0 && (!plan.currency || !plan.unit)),
      )
    )
      errors.plans = 'plansInvalid';
    if (Object.values(data.resources ?? {}).some(url => !safeSolutionUrl(url)))
      errors.resources = 'resourcesInvalid';
  }
  return errors;
}

export function getSolutionCategories(data: { category?: string; categories?: string[] }) {
  return data.categories ?? (data.category ? [data.category] : []);
}

// Optional free-text blocks of a ficha and their length limits. Their labels,
// prompts and placeholders live in the `solutionEditor.evaluationFields`
// dictionary section (and the public labels in `solution.evaluationLabels`).
export const solutionEvaluationFields = [
  { key: 'scope', limit: 800 },
  { key: 'pricing', limit: 400 },
  { key: 'implementation', limit: 400 },
  { key: 'integrations', limit: 400 },
  { key: 'support', limit: 400 },
  { key: 'evidence', limit: 800 },
] as const;
export type SolutionEvaluationKey = (typeof solutionEvaluationFields)[number]['key'];
export function safeSolutionUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.hostname.includes('.')
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function solutionEvaluationRows(
  data: SolutionData,
  text: { fields: Record<SolutionEvaluationKey, { label: string }>; missing: string },
) {
  return solutionEvaluationFields.map(
    field => [text.fields[field.key].label, data[field.key] || text.missing] as const,
  );
}
