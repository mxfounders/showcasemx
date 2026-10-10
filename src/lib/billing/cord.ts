import type { BillingProfile } from './model';

/**
 * Client for Cord's public API (cordhq.app), which issues and stamps Mexican CFDI 4.0
 * with shwcs's CSD. Contract: the OpenAPI document at https://cordhq.app/openapi.yaml,
 * version pinned below. Every write carries an Idempotency-Key, so a retried job never
 * creates a second client, invoice, payment or credit note.
 */
const apiVersion = '2026-10-01';

export class CordError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'CordError';
  }
}

export function cordConfigured() {
  return Boolean(process.env.CORD_API_KEY);
}

export type CordInvoice = {
  id: string;
  numero?: string | null;
  folio_fiscal?: string | null;
  estado?: string | null;
  estado_fiscal?: 'pending' | 'issued' | 'cancelled' | 'error' | null;
};

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const key = process.env.CORD_API_KEY;
  if (!key) throw new CordError(0, 'not_configured');
  // CORD_API_URL only for tests or a Cord staging environment; production uses the default.
  const baseUrl = process.env.CORD_API_URL ?? 'https://cordhq.app/api/v1';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Cord-Version': apiVersion,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload: { data?: T; code?: string } | null = await response.json().catch(() => null);
  if (!response.ok)
    throw new CordError(response.status, payload?.code ?? `http_${response.status}`);
  if (!payload?.data) throw new CordError(response.status, 'empty_response');
  return payload.data;
}

/** The receptor as a Cord client: the fiscal fields CFDI 4.0 validates against SAT. */
export function cordClientFields(profile: BillingProfile, fallbackEmail: string) {
  return {
    empresa: profile.legalName,
    email: profile.invoiceEmail ?? fallbackEmail,
    rfc: profile.taxId,
    regimenFiscal: profile.taxRegime,
    usoCfdi: profile.cfdiUse,
    cpFiscal: profile.postalCode,
    countryCode: profile.countryCode,
  };
}

/** A fiscal invoice draft whose total equals the Stripe charge: days × daily rate + IVA. */
export function cordInvoiceDraft(
  clientId: string,
  booking: {
    description: string;
    days: number;
    dailyAmount: number;
    currency: 'usd' | 'mxn';
    taxRate: number;
    reference: string;
  },
) {
  return {
    cliente_id: clientId,
    items: [
      {
        descripcion: booking.description,
        cantidad: booking.days,
        precio_unitario: booking.dailyAmount / 100,
        tax_rate: booking.taxRate,
      },
    ],
    currency: booking.currency.toUpperCase(),
    document_mode: 'fiscal' as const,
    iva_incluido: false,
    notas: booking.reference,
  };
}

export const cord = {
  createClient: (fields: ReturnType<typeof cordClientFields>, idempotencyKey: string) =>
    request<{ id: string }>('POST', '/clientes', fields, idempotencyKey),
  updateClient: (id: string, fields: ReturnType<typeof cordClientFields>) =>
    request<{ id: string }>('PATCH', `/clientes/${encodeURIComponent(id)}`, fields),
  createInvoice: (draft: ReturnType<typeof cordInvoiceDraft>, idempotencyKey: string) =>
    request<CordInvoice>('POST', '/facturas', draft, idempotencyKey),
  getInvoice: (id: string) => request<CordInvoice>('GET', `/facturas/${encodeURIComponent(id)}`),
  act: (
    id: string,
    action:
      | { action: 'finalize' }
      | { action: 'send' }
      | { action: 'payment'; monto: number; moneda: string; metodo: string; referencia: string }
      | { action: 'credit_note'; monto: number; moneda: string; motivo: string },
    idempotencyKey: string,
  ) => request<CordInvoice>('POST', `/facturas/${encodeURIComponent(id)}`, action, idempotencyKey),
};
