import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const AD_FILTERS = [
  'all',
  'active',
  'upcoming',
  'paid',
  'pending',
  'refunds',
  'disputes',
  'failed',
] as const;
export type AdFilter = (typeof AD_FILTERS)[number];

function isMissingTable(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01';
}

/**
 * Sponsored placements (db/ad-campaigns.sql), read-only. Returns null when the
 * migration is not applied in this database yet, so the page can say so instead
 * of failing. Amounts are integer minor units (cents) in each campaign's currency.
 */
export async function adsOverview(filter: AdFilter, q = '', page = 1, pageSize = 30) {
  const sql = getDb();
  const like = likePattern(q);
  try {
    const [rows, totals, placements, rates] = await sql.transaction(
      [
        sql`
          SELECT c.id, c.solution_id, c.owner_id, c.solution_name, c.billing_email, c.placement, c.scope,
            c.starts_on::text AS starts_on, c.ends_on::text AS ends_on, c.currency, c.daily_amount, c.subtotal_amount,
            c.tax_amount, c.total_amount, c.refund_requested_amount, c.refunded_amount, c.status, c.served_until::text AS served_until,
            c.canceled_at, c.paused_at, c.pause_reason, c.dispute_status, c.created_at, c.paid_at,
            right(COALESCE(c.stripe_payment_intent_id, ''), 8) AS payment_ref,
            COALESCE((SELECT sum(impressions) FROM ad_campaign_daily_metrics m WHERE m.campaign_id = c.id), 0)::int AS impressions,
            COALESCE((SELECT sum(clicks) FROM ad_campaign_daily_metrics m WHERE m.campaign_id = c.id), 0)::int AS clicks,
            count(*) OVER () AS total
          FROM ad_campaigns c
          WHERE CASE ${filter}
              WHEN 'active' THEN c.status = 'paid' AND c.canceled_at IS NULL AND c.paused_at IS NULL
                AND c.starts_on <= current_date AND c.ends_on > current_date
              WHEN 'upcoming' THEN c.status = 'paid' AND c.canceled_at IS NULL AND c.starts_on > current_date
              WHEN 'paid' THEN c.status = 'paid'
              WHEN 'pending' THEN c.status IN ('checkout', 'processing')
              WHEN 'refunds' THEN c.refund_requested_amount > 0 OR c.refunded_amount > 0
              WHEN 'disputes' THEN c.dispute_status IS NOT NULL
              WHEN 'failed' THEN c.status IN ('failed', 'expired')
              ELSE true END
            AND (${like}::text IS NULL OR lower(c.solution_name) LIKE ${like} OR lower(c.billing_email) LIKE ${like})
          ORDER BY c.created_at DESC
          LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
        `,
        sql`
          SELECT currency,
            COALESCE(sum(total_amount) FILTER (WHERE status = 'paid'), 0)::bigint AS revenue,
            COALESCE(sum(refunded_amount), 0)::bigint AS refunded,
            count(*) FILTER (WHERE status = 'paid' AND canceled_at IS NULL AND paused_at IS NULL
              AND starts_on <= current_date AND ends_on > current_date)::int AS active,
            count(*) FILTER (WHERE dispute_status = 'open')::int AS disputes,
            count(*) FILTER (WHERE status IN ('checkout', 'processing'))::int AS pending
          FROM ad_campaigns GROUP BY currency
        `,
        sql`SELECT id, slots, enabled, updated_at FROM ad_placements ORDER BY id`,
        sql`SELECT placement, currency, daily_amount FROM ad_rates ORDER BY placement, currency`,
      ],
      { readOnly: true },
    );
    return {
      page,
      pageSize,
      hasMore: rows.length > pageSize,
      total: rows.length ? Number(rows[0].total) : 0,
      totals: totals.map(t => ({
        currency: String(t.currency),
        revenue: Number(t.revenue),
        refunded: Number(t.refunded),
        active: Number(t.active),
        disputes: Number(t.disputes),
        pending: Number(t.pending),
      })),
      placements: placements.map(p => ({
        id: String(p.id),
        slots: Number(p.slots),
        enabled: Boolean(p.enabled),
        updatedAt: iso(p.updated_at),
        rates: rates
          .filter(r => r.placement === p.id)
          .map(r => ({ currency: String(r.currency), dailyAmount: Number(r.daily_amount) })),
      })),
      items: rows.slice(0, pageSize).map(r => ({
        id: String(r.id),
        solutionId: r.solution_id ? String(r.solution_id) : null,
        ownerId: r.owner_id ? String(r.owner_id) : null,
        solutionName: String(r.solution_name),
        billingEmail: String(r.billing_email),
        placement: String(r.placement),
        scope: String(r.scope ?? ''),
        startsOn: String(r.starts_on),
        endsOn: String(r.ends_on),
        currency: String(r.currency),
        dailyAmount: Number(r.daily_amount),
        subtotal: Number(r.subtotal_amount),
        tax: r.tax_amount !== null ? Number(r.tax_amount) : null,
        total: r.total_amount !== null ? Number(r.total_amount) : null,
        refundRequested: Number(r.refund_requested_amount),
        refunded: Number(r.refunded_amount),
        status: String(r.status),
        servedUntil: r.served_until ? String(r.served_until) : null,
        canceledAt: iso(r.canceled_at),
        pausedAt: iso(r.paused_at),
        pauseReason: r.pause_reason ? String(r.pause_reason) : null,
        disputeStatus: r.dispute_status ? String(r.dispute_status) : null,
        createdAt: iso(r.created_at),
        paidAt: iso(r.paid_at),
        paymentRef: r.payment_ref ? String(r.payment_ref) : null,
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
      })),
    };
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

/** One booking with what ops needs to pause, withdraw or retry its refund (SHCWS-69). */
export async function adBooking(id: string) {
  const sql = getDb();
  try {
    const [rows, metrics, documents, audit] = await sql.transaction(
      [
        sql`
          SELECT c.id, c.version, c.solution_id, c.owner_id, c.solution_name, c.billing_email, c.placement,
            c.scope, c.starts_on::text AS starts_on, c.ends_on::text AS ends_on,
            c.served_until::text AS served_until, c.currency, c.daily_amount, c.subtotal_amount,
            c.tax_amount, c.total_amount, c.refund_requested_amount, c.refunded_amount, c.status,
            c.canceled_at, c.paused_at, c.pause_reason, c.dispute_status, c.created_at, c.paid_at,
            c.updated_at, c.invoice_url, right(COALESCE(c.stripe_payment_intent_id, ''), 8) AS payment_ref,
            (c.stripe_payment_intent_id IS NOT NULL) AS has_payment,
            (s.published_data IS NOT NULL) AS listing_published
          FROM ad_campaigns c LEFT JOIN founder_solutions s ON s.id = c.solution_id
          WHERE c.id = ${id}
        `,
        sql`
          SELECT day::text AS day, impressions, clicks FROM ad_campaign_daily_metrics
          WHERE campaign_id = ${id} ORDER BY day
        `,
        sql`
          SELECT id, kind, amount, currency, status, folio_fiscal, last_error, attempts, created_at, issued_at
          FROM billing_documents WHERE campaign_id = ${id} ORDER BY created_at
        `,
        sql`
          SELECT l.id, l.action, l.reason, l.actor_email, l.created_at, l.metadata
          FROM ops_audit_log l WHERE l.subject_type = 'ad_campaign' AND l.subject_id = ${id}
          ORDER BY l.created_at DESC LIMIT 50
        `,
      ],
      { readOnly: true },
    );
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: String(r.id),
      version: Number(r.version),
      solutionId: r.solution_id ? String(r.solution_id) : null,
      ownerId: r.owner_id ? String(r.owner_id) : null,
      solutionName: String(r.solution_name),
      billingEmail: String(r.billing_email),
      placement: String(r.placement),
      scope: String(r.scope ?? ''),
      startsOn: String(r.starts_on),
      endsOn: String(r.ends_on),
      servedUntil: r.served_until ? String(r.served_until) : null,
      currency: String(r.currency),
      dailyAmount: Number(r.daily_amount),
      subtotal: Number(r.subtotal_amount),
      tax: r.tax_amount !== null ? Number(r.tax_amount) : null,
      total: r.total_amount !== null ? Number(r.total_amount) : null,
      refundRequested: Number(r.refund_requested_amount),
      refunded: Number(r.refunded_amount),
      status: String(r.status),
      canceledAt: iso(r.canceled_at),
      pausedAt: iso(r.paused_at),
      pauseReason: r.pause_reason ? String(r.pause_reason) : null,
      disputeStatus: r.dispute_status ? String(r.dispute_status) : null,
      createdAt: iso(r.created_at),
      paidAt: iso(r.paid_at),
      updatedAt: iso(r.updated_at),
      invoiceUrl: r.invoice_url ? String(r.invoice_url) : null,
      paymentRef: r.payment_ref ? String(r.payment_ref) : null,
      hasPayment: Boolean(r.has_payment),
      listingPublished: Boolean(r.listing_published),
      metrics: metrics.map(m => ({
        day: String(m.day),
        impressions: Number(m.impressions),
        clicks: Number(m.clicks),
      })),
      documents: documents.map(d => ({
        id: String(d.id),
        kind: String(d.kind),
        amount: Number(d.amount),
        currency: String(d.currency),
        status: String(d.status),
        folio: d.folio_fiscal ? String(d.folio_fiscal) : null,
        lastError: d.last_error ? String(d.last_error) : null,
        attempts: Number(d.attempts),
        createdAt: iso(d.created_at),
        issuedAt: iso(d.issued_at),
      })),
      audit: audit.map(a => ({
        id: String(a.id),
        action: String(a.action),
        reason: a.reason ? String(a.reason) : '',
        actorEmail: String(a.actor_email ?? ''),
        createdAt: iso(a.created_at),
        metadata: (a.metadata ?? {}) as Record<string, unknown>,
      })),
    };
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}
