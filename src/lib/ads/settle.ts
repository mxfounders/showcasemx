import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { processBillingQueue, queueInvoice } from '@/lib/billing/server';
import type Stripe from 'stripe';
import { fulfillCheckout, ownedCheckoutSession, recordInvoiceUrl } from './server';

/** Cache tag of every sponsored-slot lookup; bumped whenever a booking starts or stops. */
export const adsCacheTag = 'ads';

/**
 * Settles a Checkout Session from either the webhook or the buyer's return page —
 * whichever arrives first — and is safe to run any number of times.
 */
export async function settleCheckout(stripe: Stripe, session: Stripe.Checkout.Session) {
  const paid = await fulfillCheckout(session);
  if (!paid) return false;
  revalidateTag(adsCacheTag);
  // The fiscal document is queued with the payment and issued right after the response.
  await queueInvoice(session.id);
  after(() => processBillingQueue());
  const invoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice?.id;
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      if (invoice.hosted_invoice_url)
        await recordInvoiceUrl(session.id, invoice.hosted_invoice_url);
    } catch {
      // The invoice link is a convenience; Stripe also emails the receipt.
    }
  }
  return true;
}

/**
 * The buyer is back from Checkout. Reads the session from Stripe (never from the URL)
 * and settles it if it belongs to this account, so the page can show the outcome even
 * before the webhook arrives. Like the webhook, it only records what Stripe confirms.
 */
export async function settleReturn(stripe: Stripe, sessionId: string, accountId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  if (!(await ownedCheckoutSession(sessionId, accountId))) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return (await settleCheckout(stripe, session)) ? 'success' : 'pending';
}
