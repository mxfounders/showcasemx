import { solutionsSql } from '@/lib/solutions/server';
import { adTimeZone } from './model';
import { issueRefund } from './refund';
import { pendingRefund, stopBooking } from './server';
import { stripeClient } from './stripe';

/**
 * Deleting an account cancels its sponsored bookings under the 24-hour rule (terms of
 * service, «Publicidad y espacios patrocinados») and refunds them before the account is
 * gone. Payment records themselves survive: ad_campaigns.owner_id is ON DELETE SET NULL.
 *
 * Returns false when a refund could not be issued; the caller then keeps the account so
 * the person can retry instead of losing money they are owed.
 */
export async function cancelAccountBookings(accountId: string): Promise<boolean> {
  const rows = await solutionsSql()`SELECT id, version FROM ad_campaigns
    WHERE owner_id = ${accountId} AND (
      status IN ('checkout','processing')
      OR (status = 'paid' AND canceled_at IS NULL AND paused_at IS NULL
          AND coalesce(served_until, ends_on) > (now() AT TIME ZONE ${adTimeZone})::date)
      OR (status = 'paid' AND refund_requested_amount > refunded_amount))`;
  if (rows.length === 0) return true;

  const stripe = stripeClient();
  if (!stripe) return false;

  for (const row of rows) {
    const bookingId = String(row.id);
    const outcome = await stopBooking(bookingId, 'advertiserCancel', {
      ownerId: accountId,
      version: Number(row.version),
    });
    try {
      if (outcome.ok) {
        if (outcome.checkoutSession) {
          await stripe.checkout.sessions.expire(outcome.checkoutSession).catch(() => undefined);
        }
        if (outcome.paymentIntent && outcome.refund > 0) {
          await issueRefund(
            stripe,
            {
              bookingId,
              paymentIntent: outcome.paymentIntent,
              amount: outcome.refund,
              requestedTotal: outcome.requestedTotal,
            },
            'requested_by_customer',
          );
        }
      } else {
        // Cancelled earlier but Stripe never confirmed the refund: finish it now.
        const pending = await pendingRefund(bookingId, accountId);
        if (pending) {
          await issueRefund(
            stripe,
            {
              bookingId,
              paymentIntent: pending.paymentIntent,
              amount: pending.amount,
              requestedTotal: pending.requested,
            },
            'requested_by_customer',
          );
        }
      }
    } catch {
      return false;
    }
  }
  return true;
}
