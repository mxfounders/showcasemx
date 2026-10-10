/**
 * The buyer's fiscal data and the rules for issuing Mexican CFDI. Pure: shared by the
 * settings form, the API route and the invoicing worker.
 */
import { isGenericRfc, isRfc } from '@/lib/compliance/rfc';

/** Countries offered in the billing form (ISO 3166-1 alpha-2). Mexico first. */
export const billingCountries = [
  'MX',
  'US',
  'CA',
  'CO',
  'AR',
  'CL',
  'PE',
  'EC',
  'UY',
  'PY',
  'BO',
  'VE',
  'GT',
  'CR',
  'PA',
  'DO',
  'SV',
  'HN',
  'NI',
  'PR',
  'BR',
  'ES',
  'PT',
  'GB',
  'IE',
  'FR',
  'DE',
  'IT',
  'NL',
  'BE',
  'CH',
  'AT',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'IL',
  'AE',
  'IN',
  'SG',
  'JP',
  'KR',
  'CN',
  'AU',
  'NZ',
] as const;

/**
 * SAT catalogue c_RegimenFiscal. Official names are kept in Spanish in every locale:
 * they are legal terms the buyer reads on their own Constancia de Situación Fiscal.
 */
export const satTaxRegimes = {
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
} as const;
export type SatTaxRegime = keyof typeof satTaxRegimes;

/** c_UsoCFDI values that fit buying advertising as a business expense. */
export const cfdiUses = {
  G03: 'Gastos en general',
  S01: 'Sin efectos fiscales',
} as const;
export type CfdiUse = keyof typeof cfdiUses;

export type BillingProfile = {
  countryCode: string;
  legalName: string;
  taxId: string | null;
  taxRegime: SatTaxRegime | null;
  postalCode: string | null;
  cfdiUse: CfdiUse | null;
  invoiceEmail: string | null;
};

export type BillingProfileError =
  | 'country'
  | 'legalName'
  | 'rfc'
  | 'genericRfc'
  | 'taxRegime'
  | 'postalCode'
  | 'cfdiUse'
  | 'taxId'
  | 'invoiceEmail';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: unknown, max: number) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, max + 1)
    : '';

/** Validates untrusted input into a profile, or the first field that is wrong. */
export function readBillingProfile(
  value: unknown,
): { ok: true; profile: BillingProfile } | { ok: false; error: BillingProfileError } {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const countryCode = text(input.countryCode, 2).toUpperCase();
  if (!(billingCountries as readonly string[]).includes(countryCode)) {
    return { ok: false, error: 'country' };
  }
  // CFDI 4.0 compares the name with the SAT registry: keep it as typed, only trimmed.
  const legalName = text(input.legalName, 254);
  if (!legalName || legalName.length > 254) return { ok: false, error: 'legalName' };

  const invoiceEmail = text(input.invoiceEmail, 254).toLowerCase() || null;
  if (invoiceEmail && (invoiceEmail.length > 254 || !emailPattern.test(invoiceEmail))) {
    return { ok: false, error: 'invoiceEmail' };
  }

  if (countryCode === 'MX') {
    const rfc = text(input.taxId, 13).toUpperCase().replace(/[\s-]/g, '');
    if (!isRfc(rfc)) return { ok: false, error: 'rfc' };
    // A generic RFC (público en general, extranjero) does not identify a business buyer.
    if (isGenericRfc(rfc)) return { ok: false, error: 'genericRfc' };
    const taxRegime = text(input.taxRegime, 3);
    if (!(taxRegime in satTaxRegimes)) return { ok: false, error: 'taxRegime' };
    const postalCode = text(input.postalCode, 5);
    if (!/^\d{5}$/.test(postalCode)) return { ok: false, error: 'postalCode' };
    const cfdiUse = text(input.cfdiUse, 3).toUpperCase();
    if (!(cfdiUse in cfdiUses)) return { ok: false, error: 'cfdiUse' };
    return {
      ok: true,
      profile: {
        countryCode,
        legalName,
        taxId: rfc,
        taxRegime: taxRegime as SatTaxRegime,
        postalCode,
        cfdiUse: cfdiUse as CfdiUse,
        invoiceEmail,
      },
    };
  }

  const taxId = text(input.taxId, 30).toUpperCase() || null;
  if (taxId && (taxId.length > 30 || !/^[A-Z0-9 .\-/]+$/.test(taxId))) {
    return { ok: false, error: 'taxId' };
  }
  const postalCode = text(input.postalCode, 10) || null;
  if (postalCode && postalCode.length > 10) return { ok: false, error: 'postalCode' };
  return {
    ok: true,
    profile: {
      countryCode,
      legalName,
      taxId,
      taxRegime: null,
      postalCode,
      cfdiUse: null,
      invoiceEmail,
    },
  };
}

/** Mexican buyers receive a CFDI; everyone else gets Stripe's receipt and invoice. */
export function issuesCfdi(profile: Pick<BillingProfile, 'countryCode'>) {
  return profile.countryCode === 'MX';
}

/**
 * The IVA rate a CFDI line must carry so its total matches what Stripe charged:
 * the effective rate snapped to the rates SAT accepts. Null when it fits none, so the
 * worker stops instead of issuing a document that disagrees with the charge.
 */
export function cfdiTaxRate(subtotal: number, tax: number): 0 | 0.08 | 0.16 | null {
  if (subtotal <= 0 || tax < 0) return null;
  const effective = tax / subtotal;
  for (const rate of [0, 0.08, 0.16] as const) {
    if (Math.abs(effective - rate) <= 0.0005) return rate;
  }
  return null;
}

/** Minutes until the next attempt: 1, 2, 4 … capped at one day. */
export function retryDelayMinutes(attempts: number) {
  return Math.min(2 ** Math.max(0, attempts), 24 * 60);
}

/** After this many failed attempts a document is marked failed for a person to review. */
export const maxBillingAttempts = 10;
