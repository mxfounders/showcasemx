// No '@/' imports here: tests in the repo root import this file, where '@/' is the product.
type Label = {
  label: string;
  tone: 'neutral' | 'blue' | 'sage' | 'lavender' | 'terracotta' | 'amber';
};

// Fiscal documents (db/billing.sql), ops side (SHCWS-96). Statuses and kinds as the
// product's billing queue writes them (src/lib/billing/server.ts). The receptor rules
// are copied from src/lib/billing/model.ts and src/lib/compliance/rfc.ts: ops builds
// separately and cannot import from them. Keep both in step (tests/ops-billing.test.ts).

export const DOC_STATUS: Record<string, Label> = {
  pending: { label: 'En cola', tone: 'blue' },
  processing: { label: 'Procesando', tone: 'amber' },
  issued: { label: 'Emitido', tone: 'sage' },
  failed: { label: 'Fallido', tone: 'terracotta' },
  skipped: { label: 'Sin CFDI', tone: 'neutral' },
};
export const docStatus = (status: string): Label =>
  DOC_STATUS[status] ?? { label: status, tone: 'neutral' };

export const DOC_KIND: Record<string, string> = {
  invoice: 'Factura',
  credit_note: 'Nota de crédito',
};

/** Same as the product worker: after this many attempts a document stops retrying. */
export const MAX_BILLING_ATTEMPTS = 10;

/** A pending document this old is stuck, not just waiting its turn. */
export const STUCK_HOURS = 24;

export const BILLING_FILTERS = [
  'atencion',
  'failed',
  'pending',
  'issued',
  'skipped',
  'all',
] as const;
export type BillingFilter = (typeof BILLING_FILTERS)[number];

/**
 * What an error code most likely means and what to do. The worker stores a code, never
 * a message. Codes from Cord's API arrive as Cord sends them; `fiscal_error` is the
 * worker's own and hides the reason (Cord marked the invoice estado_fiscal = error).
 * `receptor` marks the codes where the buyer's fiscal data is the usual cause.
 */
const ERROR_HINTS: Record<string, { hint: string; receptor?: boolean }> = {
  receptor_invalido: {
    hint: 'Se rechazaron los datos fiscales del receptor (nombre, RFC, régimen o código postal). Corrígelos y reemite, o avisa al anunciante.',
    receptor: true,
  },
  certificado_vencido: {
    hint: 'El certificado (CSD) del emisor venció. Renuévalo en Cord y reintenta.',
  },
  pac_caido: { hint: 'El PAC no respondió. Suele resolverse solo: reintenta.' },
  timbre_duplicado: {
    hint: 'El PAC dice que ya hay un timbre para este documento. Revisa la factura en Cord antes de reintentar.',
  },
  fiscal_error: {
    hint: 'Cord marcó la factura con error fiscal sin decir por qué. Revisa la factura en Cord; si es por los datos del receptor, reemite con datos corregidos.',
  },
  tax_rate_mismatch: {
    hint: 'El IVA que cobró Stripe no coincide con una tasa del SAT (0, 8 o 16 %). Revisa el cobro: reintentar no lo arregla.',
  },
  not_mexican_receptor: {
    hint: 'El receptor no es de México y no lleva CFDI. Si en realidad sí lo es, reemite con sus datos mexicanos.',
    receptor: true,
  },
  not_configured: {
    hint: 'Falta CORD_API_KEY en el producto: no se emite nada hasta configurarla.',
  },
  unexpected: {
    hint: 'Error inesperado del trabajador de facturación. Revisa los registros del producto.',
  },
};

export function errorHint(code: string | null): { hint: string; receptor: boolean } | null {
  if (!code) return null;
  const known = ERROR_HINTS[code];
  if (known) return { hint: known.hint, receptor: Boolean(known.receptor) };
  if (/^http_(401|403)$/.test(code))
    return { hint: 'Cord rechazó la llave del producto.', receptor: false };
  if (/^http_(400|422)$/.test(code))
    return {
      hint: 'Cord rechazó los datos enviados. Suele ser el receptor: revisa y reemite.',
      receptor: true,
    };
  if (/^http_5\d\d$/.test(code))
    return { hint: 'Cord no estuvo disponible. Reintenta más tarde.', receptor: false };
  return null;
}

/** SAT catalogue c_RegimenFiscal (copy of the product's). */
export const SAT_TAX_REGIMES: Record<string, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625':
    'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
};

/** c_UsoCFDI values the product accepts for advertising. */
export const CFDI_USES: Record<string, string> = {
  G03: 'Gastos en general',
  S01: 'Sin efectos fiscales',
};

const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
const GENERIC_RFCS = new Set(['XAXX010101000', 'XEXX010101000']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The receptor of a Mexican CFDI, in the snake_case keys billing_documents.receptor uses. */
export interface CfdiReceptor {
  country_code: 'MX';
  legal_name: string;
  tax_id: string;
  tax_regime: string;
  postal_code: string;
  cfdi_use: string;
  invoice_email: string | null;
}

export type ReceptorError =
  'legalName' | 'rfc' | 'genericRfc' | 'taxRegime' | 'postalCode' | 'cfdiUse' | 'invoiceEmail';

export const RECEPTOR_ERROR: Record<ReceptorError, string> = {
  legalName: 'Escribe la razón social exactamente como en la constancia del SAT.',
  rfc: 'El RFC no tiene un formato válido.',
  genericRfc: 'Un RFC genérico no identifica a una empresa.',
  taxRegime: 'Elige un régimen fiscal del catálogo del SAT.',
  postalCode: 'El código postal fiscal tiene 5 dígitos.',
  cfdiUse: 'Elige un uso de CFDI.',
  invoiceEmail: 'El correo para facturas no es válido.',
};

const text = (value: unknown, max: number) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, max + 1)
    : '';

/** Same rules as the product's readBillingProfile for a Mexican buyer. */
export function readCfdiReceptor(
  value: unknown,
): { ok: true; receptor: CfdiReceptor } | { ok: false; error: ReceptorError } {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const legalName = text(input.legalName, 254);
  if (!legalName || legalName.length > 254) return { ok: false, error: 'legalName' };
  const invoiceEmail = text(input.invoiceEmail, 254).toLowerCase() || null;
  if (invoiceEmail && (invoiceEmail.length > 254 || !EMAIL_PATTERN.test(invoiceEmail)))
    return { ok: false, error: 'invoiceEmail' };
  const rfc = text(input.taxId, 13).toUpperCase().replace(/[\s-]/g, '');
  if (!RFC_PATTERN.test(rfc)) return { ok: false, error: 'rfc' };
  if (GENERIC_RFCS.has(rfc)) return { ok: false, error: 'genericRfc' };
  const taxRegime = text(input.taxRegime, 3);
  if (!(taxRegime in SAT_TAX_REGIMES)) return { ok: false, error: 'taxRegime' };
  const postalCode = text(input.postalCode, 5);
  if (!/^\d{5}$/.test(postalCode)) return { ok: false, error: 'postalCode' };
  const cfdiUse = text(input.cfdiUse, 3).toUpperCase();
  if (!(cfdiUse in CFDI_USES)) return { ok: false, error: 'cfdiUse' };
  return {
    ok: true,
    receptor: {
      country_code: 'MX',
      legal_name: legalName,
      tax_id: rfc,
      tax_regime: taxRegime,
      postal_code: postalCode,
      cfdi_use: cfdiUse,
      invoice_email: invoiceEmail,
    },
  };
}
