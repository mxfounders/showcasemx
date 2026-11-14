// Refunds from ops (SHCWS-69), over Stripe's REST API with fetch: ops only ever creates
// refunds, so it does not carry the SDK. Same API version and the same idempotency key
// as the product (src/lib/ads/refund.ts), so a refund issued from either side for the
// same requested total is one refund at Stripe. The product's webhook records it
// (refunded_amount) and queues the credit note, exactly as for a cancellation.

const STRIPE_VERSION = '2026-09-30.endive';

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export class StripeRefundError extends Error {
  constructor(
    message: string,
    public code: string | null,
  ) {
    super(message);
  }
}

export interface RefundSpec {
  bookingId: string;
  paymentIntent: string;
  amount: number;
  requestedTotal: number;
  /**
   * The product sends 'requested_by_customer' for an advertiser's cancellation and
   * nothing for a removal. A retry must repeat the original parameters: Stripe rejects
   * an idempotency key reused with different ones.
   */
  customerRequested?: boolean;
}

export function refundRequest(refund: RefundSpec) {
  const params = new URLSearchParams({
    payment_intent: refund.paymentIntent,
    amount: String(refund.amount),
  });
  if (refund.customerRequested) params.set('reason', 'requested_by_customer');
  params.set('metadata[booking_id]', refund.bookingId);
  return {
    idempotencyKey: `refund:${refund.bookingId}:${refund.requestedTotal}`,
    body: params.toString(),
  };
}

/** Creates the refund; resolves with Stripe's refund id. Throws StripeRefundError. */
export async function createRefund(refund: RefundSpec): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeRefundError('Stripe no está configurado en ops.', 'not_configured');
  const { idempotencyKey, body } = refundRequest(refund);
  let response: Response;
  try {
    response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': idempotencyKey,
        'Stripe-Version': STRIPE_VERSION,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new StripeRefundError('No se pudo conectar con Stripe.', 'network');
  }
  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { code?: string; type?: string };
  };
  if (!response.ok || typeof data.id !== 'string') {
    // Only the code goes back: Stripe's messages can echo payment details.
    const code = data.error?.code ?? data.error?.type ?? `http_${response.status}`;
    throw new StripeRefundError('Stripe rechazó el reembolso.', code);
  }
  return data.id;
}
