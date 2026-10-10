import type Stripe from 'stripe';

/**
 * Issues the refund recorded for a booking. The idempotency key is derived from the total
 * requested so far, so a retry of the same request never refunds twice, while a later,
 * separate stop (e.g. a removal after a cancellation) gets its own refund.
 */
export async function issueRefund(
  stripe: Stripe,
  refund: { bookingId: string; paymentIntent: string; amount: number; requestedTotal: number },
  reason: 'requested_by_customer' | undefined,
) {
  if (refund.amount <= 0) return;
  await stripe.refunds.create(
    {
      payment_intent: refund.paymentIntent,
      amount: refund.amount,
      reason,
      metadata: { booking_id: refund.bookingId },
    },
    { idempotencyKey: `refund:${refund.bookingId}:${refund.requestedTotal}` },
  );
}
