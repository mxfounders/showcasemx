// Presentation of founder_solutions.data inside ops. Enum ids are humanised; a
// few short maps read better than the slug. Unknown values fall back to the
// humanised slug, so a new product option never breaks this page.

export const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  kind: 'Tipo',
  category: 'Categoría (legado)',
  categories: 'Categorías',
  problem: 'Problema que resuelve',
  audience: 'Cliente ideal',
  website: 'Sitio web',
  contactEmail: 'Correo privado de contacto',
  scope: 'Alcance',
  pricing: 'Precio',
  implementation: 'Implementación',
  integrations: 'Integraciones (texto)',
  support: 'Soporte',
  evidence: 'Evidencia',
  evidenceUrl: 'Enlace de evidencia',
  demoUrl: 'Demo',
  notFor: 'Cuándo no encaja',
  screenshots: 'Capturas',
  founders: 'Creadores',
  projectLinks: 'Enlaces del proyecto',
  hideSiteImage: 'Ocultar portada del sitio',
  industries: 'Industrias',
  companySizes: 'Tamaños de empresa',
  capabilities: 'Capacidades',
  integrationKeys: 'Integraciones declaradas',
  pricingModel: 'Modelo de precio',
  priceBand: 'Rango de precio',
  setupTime: 'Tiempo de arranque',
  compliance: 'Cumplimiento',
};

const VALUE_LABELS: Record<string, string> = {
  micro: 'Micro (1–10)',
  pyme: 'PyME (11–50)',
  mediana: 'Mediana (51–250)',
  corporativo: 'Corporativo (250+)',
  'menos-1000': 'Menos de $1,000 MXN/mes',
  'de-1000-a-5000': '$1,000–5,000 MXN/mes',
  'de-5000-a-20000': '$5,000–20,000 MXN/mes',
  'de-20000-a-50000': '$20,000–50,000 MXN/mes',
  'mas-50000': 'Más de $50,000 MXN/mes',
  'depende-alcance': 'Depende del alcance',
  'mismo-dia': 'El mismo día',
  'menos-semana': 'Menos de una semana',
  'una-a-cuatro-semanas': '1 a 4 semanas',
  'uno-a-tres-meses': '1 a 3 meses',
  'mas-tres-meses': 'Más de 3 meses',
  'sat-cfdi': 'SAT / CFDI',
  'api-publica': 'API pública',
  'cfdi-4-0': 'CFDI 4.0',
  'nom-151': 'NOM-151',
  'nom-024': 'NOM-024',
  'iso-27001': 'ISO 27001',
  'soc-2': 'SOC 2',
  lfpdppp: 'LFPDPPP',
  gdpr: 'GDPR',
};

export function humanize(value: string): string {
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  const text = value.replace(/[-_]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Only http(s) links are ever rendered as anchors. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export interface ChecklistItem {
  label: string;
  done: boolean;
  required: boolean;
}

/** Mirrors the submit requirements at a glance. Completeness is not quality. */
export function checklist(data: Record<string, unknown>): ChecklistItem[] {
  const has = (key: string) => asText(data[key]).length > 0;
  const declared = (key: string) => Array.isArray(data[key]);
  const categories = asList(data.categories).length > 0 || has('category');
  return [
    { label: 'Nombre y tipo', done: has('name') && has('kind'), required: true },
    { label: 'Categorías', done: categories, required: true },
    { label: 'Problema y cliente ideal', done: has('problem') && has('audience'), required: true },
    {
      label: 'Sitio y correo de contacto',
      done: has('website') && has('contactEmail'),
      required: true,
    },
    { label: 'Capacidades', done: asList(data.capabilities).length > 0, required: true },
    {
      label: 'Industrias y tamaños',
      done: declared('industries') && declared('companySizes'),
      required: true,
    },
    { label: 'Alcance y cuándo no encaja', done: has('scope') && has('notFor'), required: false },
    {
      label: 'Precio',
      done: has('pricing') || asList(data.pricingModel).length > 0 || has('priceBand'),
      required: false,
    },
    {
      label: 'Implementación y soporte',
      done: has('implementation') || has('support') || has('setupTime'),
      required: false,
    },
    { label: 'Evidencia', done: has('evidence') || has('evidenceUrl'), required: false },
    {
      label: 'Capturas',
      done: Array.isArray(data.screenshots) && data.screenshots.length > 0,
      required: false,
    },
    {
      label: 'Creadores',
      done: Array.isArray(data.founders) && data.founders.length > 0,
      required: false,
    },
  ];
}
