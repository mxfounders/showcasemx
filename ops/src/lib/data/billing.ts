import { getDb } from '../db';
import { iso, likePattern } from '../http';
import { STUCK_HOURS, type BillingFilter } from '../billing';

function isMissingTable(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01';
}

const str = (value: unknown) => (value === null || value === undefined ? null : String(value));

function receptorOf(value: unknown) {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    countryCode: str(r.country_code),
    legalName: str(r.legal_name),
    taxId: str(r.tax_id),
    taxRegime: str(r.tax_regime),
    postalCode: str(r.postal_code),
    cfdiUse: str(r.cfdi_use),
    invoiceEmail: str(r.invoice_email),
  };
}
export type Receptor = ReturnType<typeof receptorOf>;

/**
 * Fiscal documents for ops (SHCWS-96): failed ones and pending ones stuck for more than
 * a day first. Reads the document's receptor copy and, when the account still exists,
 * its current billing profile, so ops can see whether the buyer already fixed it.
 * Returns null when db/billing.sql is not applied in this database.
 */
export async function billingOverview(filter: BillingFilter, q = '', page = 1, pageSize = 30) {
  const sql = getDb();
  const like = likePattern(q);
  try {
    const [rows, stats] = await sql.transaction(
      [
        sql`
          SELECT d.id, d.campaign_id, d.kind, d.amount, d.currency, d.receptor, d.status, d.attempts,
            d.last_error, d.next_attempt_at, d.created_at, d.updated_at, d.issued_at, d.folio_fiscal,
            (d.provider_document_id IS NOT NULL) AS has_draft,
            (d.locked_until IS NOT NULL AND d.locked_until > now()) AS locked,
            c.solution_name, c.billing_email, c.owner_id,
            p.country_code AS p_country_code, p.legal_name AS p_legal_name, p.tax_id AS p_tax_id,
            p.tax_regime AS p_tax_regime, p.postal_code AS p_postal_code, p.cfdi_use AS p_cfdi_use,
            p.invoice_email AS p_invoice_email, p.updated_at AS p_updated_at,
            (SELECT max(n.created_at) FROM account_notifications n
              WHERE n.source_key LIKE 'billing-data:' || d.id::text || ':%') AS notified_at,
            count(*) OVER () AS total
          FROM billing_documents d
          JOIN ad_campaigns c ON c.id = d.campaign_id
          LEFT JOIN billing_profiles p ON p.account_id = c.owner_id
          WHERE CASE ${filter}
              WHEN 'atencion' THEN d.status = 'failed'
                OR (d.status IN ('pending', 'processing') AND d.created_at < now() - ${STUCK_HOURS} * interval '1 hour')
              WHEN 'failed' THEN d.status = 'failed'
              WHEN 'pending' THEN d.status IN ('pending', 'processing')
              WHEN 'issued' THEN d.status = 'issued'
              WHEN 'skipped' THEN d.status = 'skipped'
              ELSE true END
            AND (${like}::text IS NULL OR lower(c.solution_name) LIKE ${like}
              OR lower(c.billing_email) LIKE ${like} OR lower(COALESCE(d.receptor->>'legal_name', '')) LIKE ${like}
              OR lower(COALESCE(d.receptor->>'tax_id', '')) LIKE ${like} OR lower(COALESCE(d.folio_fiscal, '')) LIKE ${like})
          ORDER BY (d.status = 'failed') DESC, d.created_at DESC
          LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
        `,
        sql`
          SELECT
            count(*) FILTER (WHERE status = 'failed')::int AS failed,
            count(*) FILTER (WHERE status IN ('pending', 'processing')
              AND created_at < now() - ${STUCK_HOURS} * interval '1 hour')::int AS stuck,
            count(*) FILTER (WHERE status IN ('pending', 'processing'))::int AS queued,
            count(*) FILTER (WHERE status = 'issued' AND issued_at > now() - interval '30 days')::int AS issued_30d,
            count(*) FILTER (WHERE status = 'skipped')::int AS skipped
          FROM billing_documents
        `,
      ],
      { readOnly: true },
    );
    const s = stats[0] ?? {};
    return {
      page,
      pageSize,
      hasMore: rows.length > pageSize,
      total: rows.length ? Number(rows[0].total) : 0,
      stats: {
        failed: Number(s.failed ?? 0),
        stuck: Number(s.stuck ?? 0),
        queued: Number(s.queued ?? 0),
        issued30d: Number(s.issued_30d ?? 0),
        skipped: Number(s.skipped ?? 0),
      },
      items: rows.slice(0, pageSize).map(r => ({
        id: String(r.id),
        campaignId: String(r.campaign_id),
        kind: String(r.kind),
        amount: Number(r.amount),
        currency: String(r.currency),
        status: String(r.status),
        attempts: Number(r.attempts),
        lastError: str(r.last_error),
        nextAttemptAt: iso(r.next_attempt_at),
        createdAt: iso(r.created_at),
        updatedAt: iso(r.updated_at),
        issuedAt: iso(r.issued_at),
        folio: str(r.folio_fiscal),
        hasDraft: Boolean(r.has_draft),
        locked: Boolean(r.locked),
        solutionName: String(r.solution_name),
        billingEmail: String(r.billing_email),
        ownerId: str(r.owner_id),
        receptor: receptorOf(r.receptor),
        profile:
          r.p_country_code === null || r.p_country_code === undefined
            ? null
            : {
                ...receptorOf({
                  country_code: r.p_country_code,
                  legal_name: r.p_legal_name,
                  tax_id: r.p_tax_id,
                  tax_regime: r.p_tax_regime,
                  postal_code: r.p_postal_code,
                  cfdi_use: r.p_cfdi_use,
                  invoice_email: r.p_invoice_email,
                }),
                updatedAt: iso(r.p_updated_at),
              },
        notifiedAt: iso(r.notified_at),
      })),
    };
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

export type BillingItem = NonNullable<Awaited<ReturnType<typeof billingOverview>>>['items'][number];
