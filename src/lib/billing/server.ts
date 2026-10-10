import { solutionsSql } from '@/lib/solutions/server';
import {
  cfdiTaxRate,
  issuesCfdi,
  maxBillingAttempts,
  retryDelayMinutes,
  type BillingProfile,
  type CfdiUse,
  type SatTaxRegime,
} from './model';
import { cord, cordClientFields, cordConfigured, cordInvoiceDraft, CordError } from './cord';
import { ads as adsEs } from '@/i18n/dictionaries/es/ads';
import { categories } from '@/lib/taxonomy';
import type { AdPlacement } from '@/lib/ads/model';

export type StoredBillingProfile = BillingProfile & { version: number };

export async function getBillingProfile(accountId: string): Promise<StoredBillingProfile | null> {
  const [row] = await solutionsSql()`SELECT country_code, legal_name, tax_id, tax_regime,
      postal_code, cfdi_use, invoice_email, version
    FROM billing_profiles WHERE account_id = ${accountId}`;
  if (!row) return null;
  return {
    countryCode: String(row.country_code),
    legalName: String(row.legal_name),
    taxId: row.tax_id ? String(row.tax_id) : null,
    taxRegime: (row.tax_regime as SatTaxRegime | null) ?? null,
    postalCode: row.postal_code ? String(row.postal_code) : null,
    cfdiUse: (row.cfdi_use as CfdiUse | null) ?? null,
    invoiceEmail: row.invoice_email ? String(row.invoice_email) : null,
    version: Number(row.version),
  };
}

/**
 * Creates the profile (when the form saw none, version 0; it starts at 1) or updates the
 * version the form was loaded with. Returns the new version, or null when another save
 * got there first, so a stale form never overwrites newer details.
 */
export async function saveBillingProfile(
  accountId: string,
  profile: BillingProfile,
  expectedVersion: number,
): Promise<number | null> {
  const sql = solutionsSql();
  const [row] =
    expectedVersion === 0
      ? await sql`INSERT INTO billing_profiles (account_id, country_code, legal_name, tax_id,
            tax_regime, postal_code, cfdi_use, invoice_email, version)
          VALUES (${accountId}, ${profile.countryCode}, ${profile.legalName}, ${profile.taxId},
            ${profile.taxRegime}, ${profile.postalCode}, ${profile.cfdiUse}, ${profile.invoiceEmail}, 1)
          ON CONFLICT (account_id) DO NOTHING
          RETURNING version`
      : await sql`UPDATE billing_profiles SET country_code = ${profile.countryCode},
            legal_name = ${profile.legalName}, tax_id = ${profile.taxId},
            tax_regime = ${profile.taxRegime}, postal_code = ${profile.postalCode},
            cfdi_use = ${profile.cfdiUse}, invoice_email = ${profile.invoiceEmail},
            updated_at = now(), version = version + 1
          WHERE account_id = ${accountId} AND version = ${expectedVersion}
          RETURNING version`;
  return row ? Number(row.version) : null;
}

export type BillingDocumentView = {
  kind: 'invoice' | 'credit_note';
  status: 'pending' | 'processing' | 'issued' | 'failed' | 'skipped';
  amount: number;
  folio: string | null;
  number: string | null;
  issuedAt: string | null;
};

export type PaymentRecord = {
  id: string;
  solutionName: string;
  placement: string;
  scope: string;
  startsOn: string;
  endsOn: string;
  currency: 'usd' | 'mxn';
  subtotal: number;
  tax: number;
  total: number;
  refunded: number;
  paidAt: string;
  receiptUrl: string | null;
  documents: BillingDocumentView[];
};

/** Every paid booking of the account, newest first, with its fiscal documents. */
export async function paymentHistory(accountId: string): Promise<PaymentRecord[]> {
  const rows = await solutionsSql()`SELECT c.id, c.solution_name, c.placement, c.scope,
      to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
      c.currency, c.subtotal_amount, c.tax_amount, c.total_amount, c.refunded_amount, c.paid_at,
      c.invoice_url,
      coalesce(json_agg(json_build_object('kind', d.kind, 'status', d.status, 'amount', d.amount,
        'folio', d.folio_fiscal, 'number', d.document_number, 'issuedAt', d.issued_at)
        ORDER BY d.created_at) FILTER (WHERE d.id IS NOT NULL), '[]') AS documents
    FROM ad_campaigns c LEFT JOIN billing_documents d ON d.campaign_id = c.id
    WHERE c.owner_id = ${accountId} AND c.paid_at IS NOT NULL
    GROUP BY c.id ORDER BY c.paid_at DESC LIMIT 200`;
  return rows.map(row => ({
    id: String(row.id),
    solutionName: String(row.solution_name),
    placement: String(row.placement),
    scope: String(row.scope),
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    currency: row.currency as 'usd' | 'mxn',
    subtotal: Number(row.subtotal_amount),
    tax: Number(row.tax_amount ?? 0),
    total: Number(row.total_amount ?? row.subtotal_amount),
    refunded: Number(row.refunded_amount),
    paidAt: new Date(row.paid_at).toISOString(),
    receiptUrl: row.invoice_url ? String(row.invoice_url) : null,
    documents: (row.documents as BillingDocumentView[]).map(document => ({
      ...document,
      amount: Number(document.amount),
    })),
  }));
}

/**
 * Queues the invoice of a booking that just became paid. Mexican buyers get a CFDI;
 * anyone else (or a booking without a profile) is recorded as skipped, so the history
 * says why there is no CFDI instead of waiting forever.
 */
export async function queueInvoice(sessionId: string) {
  await solutionsSql()`INSERT INTO billing_documents (id, campaign_id, kind, source_id, amount,
      currency, receptor, status)
    SELECT gen_random_uuid(), c.id, 'invoice', ${sessionId}, c.total_amount, c.currency,
      coalesce(to_jsonb(p) - 'cord_client_id' - 'cord_client_version', '{}'::jsonb),
      CASE WHEN p.country_code = 'MX' THEN 'pending' ELSE 'skipped' END
    FROM ad_campaigns c LEFT JOIN billing_profiles p ON p.account_id = c.owner_id
    WHERE c.stripe_checkout_session_id = ${sessionId} AND c.status = 'paid'
      AND c.total_amount > 0
    ON CONFLICT (source_id) DO NOTHING`;
}

/** Queues a credit note for a refund that succeeded, mirroring its invoice's fate. */
export async function queueCreditNote(refundId: string, paymentIntent: string, amount: number) {
  await solutionsSql()`INSERT INTO billing_documents (id, campaign_id, kind, source_id, amount,
      currency, receptor, status)
    SELECT gen_random_uuid(), c.id, 'credit_note', ${refundId}, ${amount}, c.currency,
      i.receptor, CASE WHEN i.status = 'skipped' THEN 'skipped' ELSE 'pending' END
    FROM ad_campaigns c
    JOIN billing_documents i ON i.campaign_id = c.id AND i.kind = 'invoice'
    WHERE c.stripe_payment_intent_id = ${paymentIntent} AND ${amount} > 0
    ON CONFLICT (source_id) DO NOTHING`;
}

type QueuedDocument = {
  id: string;
  campaign_id: string;
  kind: 'invoice' | 'credit_note';
  amount: number;
  currency: 'usd' | 'mxn';
  receptor: Record<string, unknown>;
  attempts: number;
  provider_document_id: string | null;
};

/**
 * Issues queued documents in Cord. Each run leases a few rows so concurrent runs (the
 * webhook's after() and the daily cron) never work on the same one. Without
 * CORD_API_KEY nothing is sent and documents simply wait.
 */
export async function processBillingQueue(limit = 10) {
  if (!cordConfigured()) return { processed: 0 };
  const sql = solutionsSql();
  const leased =
    (await sql`UPDATE billing_documents SET locked_until = now() + interval '5 minutes',
      status = 'processing', updated_at = now()
    WHERE id IN (SELECT id FROM billing_documents
      WHERE status IN ('pending','processing') AND next_attempt_at <= now()
        AND (locked_until IS NULL OR locked_until < now())
      ORDER BY kind, next_attempt_at LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING id, campaign_id, kind, amount, currency, receptor, attempts, provider_document_id`) as QueuedDocument[];

  for (const document of leased) {
    try {
      const issued =
        document.kind === 'invoice'
          ? await issueInvoice(document)
          : await issueCreditNote(document);
      if (issued) {
        await sql`UPDATE billing_documents SET status = 'issued', issued_at = now(),
            provider_document_id = ${issued.id}, folio_fiscal = ${issued.folio_fiscal ?? null},
            document_number = ${issued.numero ?? null}, locked_until = NULL, last_error = NULL,
            updated_at = now()
          WHERE id = ${document.id}`;
      } else {
        // Waiting on something (the PAC, or the invoice a credit note depends on).
        await sql`UPDATE billing_documents SET locked_until = NULL,
            next_attempt_at = now() + make_interval(mins => ${retryDelayMinutes(document.attempts)}),
            attempts = attempts + 1, updated_at = now()
          WHERE id = ${document.id}`;
      }
    } catch (error) {
      const code = error instanceof CordError ? error.code : 'unexpected';
      const attempts = document.attempts + 1;
      await sql`UPDATE billing_documents SET attempts = ${attempts}, last_error = ${code.slice(0, 80)},
          status = CASE WHEN ${attempts >= maxBillingAttempts} THEN 'failed' ELSE 'pending' END,
          next_attempt_at = now() + make_interval(mins => ${retryDelayMinutes(attempts)}),
          locked_until = NULL, updated_at = now()
        WHERE id = ${document.id}`;
      console.error('billing.document', document.id, code);
    }
  }
  return { processed: leased.length };
}

/** Creates (or reuses), stamps, records the payment of and sends a booking's CFDI. */
async function issueInvoice(document: QueuedDocument) {
  const sql = solutionsSql();
  const [booking] = await sql`SELECT c.owner_id, c.billing_email, c.solution_name, c.placement,
      c.scope, c.ends_on - c.starts_on AS days, c.daily_amount, c.subtotal_amount, c.tax_amount,
      c.currency, c.stripe_payment_intent_id,
      to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on - 1, 'YYYY-MM-DD') AS last_day
    FROM ad_campaigns c WHERE c.id = ${document.campaign_id}`;
  const taxRate = cfdiTaxRate(Number(booking.subtotal_amount), Number(booking.tax_amount ?? 0));
  if (taxRate === null) throw new CordError(0, 'tax_rate_mismatch');

  const providerId =
    document.provider_document_id ??
    (
      await cord.createInvoice(
        cordInvoiceDraft(await cordClientFor(document), {
          description: invoiceConcept(booking),
          days: Number(booking.days),
          dailyAmount: Number(booking.daily_amount),
          currency: document.currency,
          taxRate,
          reference: `shwcs booking ${document.campaign_id}`,
        }),
        `invoice:${document.id}`,
      )
    ).id;
  await sql`UPDATE billing_documents SET provider_document_id = ${providerId} WHERE id = ${document.id}`;

  const stamped = await cord.act(providerId, { action: 'finalize' }, `finalize:${document.id}`);
  if (stamped.estado_fiscal === 'error') throw new CordError(0, 'fiscal_error');
  if (stamped.estado_fiscal !== 'issued') return null;

  await cord.act(
    providerId,
    {
      action: 'payment',
      monto: document.amount / 100,
      moneda: document.currency.toUpperCase(),
      metodo: 'tarjeta',
      referencia: String(booking.stripe_payment_intent_id ?? document.campaign_id),
    },
    `payment:${document.id}`,
  );
  await cord.act(providerId, { action: 'send' }, `send:${document.id}`);
  return stamped;
}

/** Issues the CFDI de egreso for a refund, once its invoice exists. */
async function issueCreditNote(document: QueuedDocument) {
  const [invoice] = await solutionsSql()`SELECT provider_document_id, status FROM billing_documents
    WHERE campaign_id = ${document.campaign_id} AND kind = 'invoice'`;
  if (!invoice?.provider_document_id || invoice.status !== 'issued') return null;
  return cord.act(
    String(invoice.provider_document_id),
    {
      action: 'credit_note',
      monto: document.amount / 100,
      moneda: document.currency.toUpperCase(),
      motivo: 'Reembolso de días no servidos de un espacio patrocinado',
    },
    `credit:${document.id}`,
  );
}

/**
 * The Cord client for a document's receptor. Accounts keep one client, refreshed when
 * their profile changes; a deleted account's documents use the stored receptor copy.
 */
async function cordClientFor(document: QueuedDocument) {
  const sql = solutionsSql();
  const receptor = document.receptor;
  const profile: BillingProfile = {
    countryCode: String(receptor.country_code ?? ''),
    legalName: String(receptor.legal_name ?? ''),
    taxId: receptor.tax_id ? String(receptor.tax_id) : null,
    taxRegime: (receptor.tax_regime as SatTaxRegime | null) ?? null,
    postalCode: receptor.postal_code ? String(receptor.postal_code) : null,
    cfdiUse: (receptor.cfdi_use as CfdiUse | null) ?? null,
    invoiceEmail: receptor.invoice_email ? String(receptor.invoice_email) : null,
  };
  if (!issuesCfdi(profile)) throw new CordError(0, 'not_mexican_receptor');

  const [stored] =
    await sql`SELECT p.account_id, p.cord_client_id, p.cord_client_version, p.version,
      c.billing_email
    FROM ad_campaigns c LEFT JOIN billing_profiles p ON p.account_id = c.owner_id
    WHERE c.id = ${document.campaign_id}`;
  const fields = cordClientFields(profile, String(stored?.billing_email ?? ''));
  if (!stored?.account_id) {
    return (await cord.createClient(fields, `client:document:${document.id}`)).id;
  }
  if (stored.cord_client_id) {
    if (Number(stored.cord_client_version) !== Number(stored.version)) {
      await cord.updateClient(String(stored.cord_client_id), fields);
      await sql`UPDATE billing_profiles SET cord_client_version = ${Number(stored.version)}
        WHERE account_id = ${stored.account_id}`;
    }
    return String(stored.cord_client_id);
  }
  const created = await cord.createClient(
    fields,
    `client:${stored.account_id}:${Number(stored.version)}`,
  );
  await sql`UPDATE billing_profiles SET cord_client_id = ${created.id},
      cord_client_version = ${Number(stored.version)}
    WHERE account_id = ${stored.account_id} AND cord_client_id IS NULL`;
  return created.id;
}

/** The CFDI concept, in Spanish like the rest of the fiscal document. */
function invoiceConcept(booking: Record<string, unknown>) {
  const placement = adsEs.placements[booking.placement as AdPlacement]?.label ?? 'Espacio';
  const category = categories.find(entry => entry.slug === booking.scope)?.label;
  return [
    'Espacio patrocinado',
    category ? `${placement} (${category})` : placement,
    String(booking.solution_name),
    `${booking.starts_on} a ${booking.last_day}`,
  ].join(' · ');
}
