import type Stripe from 'stripe';
import { addDays, checkoutHoldMinutes, type CampaignRequest } from './model';
import { adTaxCode } from './stripe';

export type CheckoutInput = {
  bookingId: string;
  request: CampaignRequest;
  dailyAmount: number;
  customer: string;
  /** Product line shown on Checkout and the invoice, already in the buyer's language. */
  productName: string;
  locale: string;
  origin: string;
  automaticTax: boolean;
  now?: Date;
};

/**
 * Parameters for the hosted Checkout Session of one booking.
 *
 * - quantity × unit_amount is days × daily rate, so `amount_subtotal` equals the quoted
 *   subtotal and the invoice reads "7 × rate".
 * - Tax is always added on top (`exclusive`); Stripe Tax computes it from the billing
 *   address and tax id.
 * - The booking id travels on the session and on the PaymentIntent, so refunds and
 *   disputes (which only carry the charge) can be traced back to it.
 * - The session expires with the inventory hold. OXXO and bank-transfer balances are
 *   excluded: they settle days later and OXXO cannot be refunded.
 */
export function checkoutSessionParams(input: CheckoutInput): Stripe.Checkout.SessionCreateParams {
  const { bookingId, request } = input;
  const now = input.now ?? new Date();
  const lastDay = addDays(request.startsOn, request.days - 1);
  const promotePage = `${input.origin}/${input.locale}/account/solutions/${request.solutionId}/promote`;
  const metadata = { booking_id: bookingId };

  return {
    mode: 'payment',
    customer: input.customer,
    customer_update: { address: 'auto', name: 'auto' },
    line_items: [
      {
        quantity: request.days,
        price_data: {
          currency: request.currency,
          unit_amount: input.dailyAmount,
          tax_behavior: 'exclusive',
          product_data: {
            name: input.productName,
            description: `${request.startsOn} → ${lastDay}`,
            tax_code: adTaxCode,
          },
        },
      },
    ],
    automatic_tax: { enabled: input.automaticTax },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    adaptive_pricing: { enabled: false },
    excluded_payment_method_types: ['oxxo', 'customer_balance'],
    client_reference_id: bookingId,
    metadata,
    payment_intent_data: { metadata },
    invoice_creation: { enabled: true, invoice_data: { metadata } },
    locale: input.locale === 'en' ? 'en' : 'es-419',
    expires_at: Math.floor(now.getTime() / 1000) + (checkoutHoldMinutes + 1) * 60,
    success_url: `${promotePage}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${promotePage}?checkout=canceled&booking=${bookingId}`,
  };
}
