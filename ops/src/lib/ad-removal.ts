import { audit } from './audit';
import { AD_TIME_ZONE, REMOVAL_REASONS, planRemoval, type RemovalReason } from './ads';
import type { Sql } from './api';
import { StripeRefundError, createRefund, stripeConfigured } from './stripe';

export interface ListingRemovalOutcome {
  /** Bookings stopped because their listing left the catalog. */
  stopped: number;
  /** Refunds Stripe confirmed now. */
  refunded: number;
  /** Refunds recorded but not confirmed (Stripe missing or failing): «Reintentar reembolso». */
  pending: number;
}

/**
 * A sponsored slot can't serve a listing that is no longer published (SHCWS-81). When ops
 * withdraws one (review, upheld report, «despublicar todo»), its paid bookings that still
 * have days ahead stop under the removal rule of the terms: `platformRemoval` refunds every
 * day not served, from today; `policyRemoval` (a breach) from tomorrow. The amount comes
 * from the same rule as a manual withdrawal (planRemoval), never from the operator.
 *
 * The stop and the refund owed are recorded before Stripe is called, with the same
 * idempotency key as the product, so «Reintentar reembolso» in /panel/anuncios finishes
 * any refund Stripe didn't confirm. Withdrawing the listing never waits on Stripe: a
 * listing that must go comes off the catalog even if a refund has to be retried later.
 * Founders hear about it from the ad_campaigns trigger, as for any withdrawal.
 */
export async function stopListingBookings(
  sql: Sql,
  solutionIds: string[],
  kind: RemovalReason,
  actor: { id: string; email: string },
  reason: string,
  ip: string | null,
): Promise<ListingRemovalOutcome> {
  const outcome: ListingRemovalOutcome = { stopped: 0, refunded: 0, pending: 0 };
  if (!solutionIds.length) return outcome;
  // The ads tables may not exist in an environment without the migration.
  const rows = await sql`
    SELECT id, version, status, starts_on::text AS starts_on, ends_on::text AS ends_on,
      served_until::text AS served_until, total_amount, refund_requested_amount, currency,
      pause_reason, dispute_status, stripe_payment_intent_id, solution_name
    FROM ad_campaigns
    WHERE solution_id = ANY(${solutionIds}::uuid[]) AND status = 'paid' AND canceled_at IS NULL
      AND (now() AT TIME ZONE ${AD_TIME_ZONE})::date < coalesce(served_until, ends_on)
  `.catch(() => []);
  const removalCodes = REMOVAL_REASONS as readonly string[];
  for (const row of rows) {
    const bookingId = String(row.id);
    const plan = planRemoval(
      {
        status: String(row.status),
        startsOn: String(row.starts_on),
        endsOn: String(row.ends_on),
        servedUntil: row.served_until ? String(row.served_until) : null,
        totalAmount: row.total_amount === null ? null : Number(row.total_amount),
        refundRequested: Number(row.refund_requested_amount),
        pauseReason: row.pause_reason ? String(row.pause_reason) : null,
        disputeStatus: row.dispute_status ? String(row.dispute_status) : null,
      },
      kind,
    );
    // Disputed, already removed or over: nothing to stop here (a dispute settles at Stripe).
    if (!plan.ok) continue;
    const [stopped] = await sql`
      WITH changed AS (
        UPDATE ad_campaigns SET paused_at = coalesce(paused_at, now()), pause_reason = ${kind},
          served_until = ${plan.servedUntil}::date,
          refund_requested_amount = refund_requested_amount + ${plan.refund},
          updated_at = now(), version = version + 1
        WHERE id = ${bookingId} AND version = ${Number(row.version)} AND status = 'paid'
          AND canceled_at IS NULL AND dispute_status IS DISTINCT FROM 'open'
          AND (pause_reason IS NULL OR pause_reason <> ALL(${removalCodes as string[]}::text[]))
        RETURNING id, refund_requested_amount
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${actor.id}, ${actor.email},
          ${kind === 'policyRemoval' ? 'ad_withdraw_policy' : 'ad_withdraw_platform'},
          'ad_campaign', id::text, left(${reason}, 1000),
          jsonb_build_object('solution', ${String(row.solution_name)}::text, 'refund', ${plan.refund}::int,
            'currency', ${String(row.currency)}::text, 'servedUntil', ${plan.servedUntil}::text,
            'automatic', true), ${ip}
        FROM changed
      )
      SELECT refund_requested_amount FROM changed
    `;
    // Changed by someone else in between (a cancellation, a webhook): leave it to them.
    if (!stopped) continue;
    outcome.stopped++;
    const paymentIntent = row.stripe_payment_intent_id
      ? String(row.stripe_payment_intent_id)
      : null;
    if (plan.refund <= 0) continue;
    if (!paymentIntent || !stripeConfigured()) {
      outcome.pending++;
      continue;
    }
    try {
      const refundId = await createRefund({
        bookingId,
        paymentIntent,
        amount: plan.refund,
        requestedTotal: Number(stopped.refund_requested_amount),
      });
      outcome.refunded++;
      await audit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'ad_refund_issued',
        subjectType: 'ad_campaign',
        subjectId: bookingId,
        metadata: {
          refund: plan.refund,
          currency: String(row.currency),
          stripeRefund: refundId,
          automatic: true,
        },
        ip,
      });
    } catch (err) {
      outcome.pending++;
      await audit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'ad_refund_failed',
        subjectType: 'ad_campaign',
        subjectId: bookingId,
        metadata: {
          code: err instanceof StripeRefundError ? (err.code ?? 'unknown') : 'unknown',
          automatic: true,
        },
        ip,
      });
    }
  }
  return outcome;
}

/** One line for the operator after a withdrawal, empty when no booking was affected. */
export function removalSummary(outcome: ListingRemovalOutcome): string {
  if (!outcome.stopped) return '';
  const stopped =
    outcome.stopped === 1
      ? 'Se detuvo 1 espacio patrocinado'
      : `Se detuvieron ${outcome.stopped} espacios patrocinados`;
  const refunded = !outcome.refunded
    ? ''
    : outcome.refunded === 1
      ? ' y se envió 1 reembolso a Stripe'
      : ` y se enviaron ${outcome.refunded} reembolsos a Stripe`;
  const pending = !outcome.pending
    ? ''
    : outcome.pending === 1
      ? ' 1 reembolso quedó pendiente: usa «Reintentar reembolso» en Anuncios.'
      : ` ${outcome.pending} reembolsos quedaron pendientes: usa «Reintentar reembolso» en Anuncios.`;
  return `${stopped}${refunded}.${pending}`;
}
