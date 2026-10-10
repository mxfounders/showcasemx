import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import type Stripe from 'stripe';
import {
  claimStripeEvent,
  completeStripeEvent,
  expireCheckout,
  recordDispute,
  recordRefunded,
} from '@/lib/ads/server';
import { adsCacheTag, settleCheckout } from '@/lib/ads/settle';
import { stripeClient } from '@/lib/ads/stripe';
import { processBillingQueue, queueCreditNote } from '@/lib/billing/server';

const respond = (status: number) => new Response(null, { status });

/**
 * Stripe webhook. The signature is verified over the raw body; each event id is
 * processed once, and every handler is idempotent because Stripe may deliver an event
 * more than once and in any order. A 5xx makes Stripe retry (for up to three days).
 */
export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return respond(503);

  const signature = request.headers.get('stripe-signature');
  if (!signature) return respond(400);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return respond(400);
  }

  try {
    if (!(await claimStripeEvent(event))) return respond(200);
    await handle(stripe, event);
    await completeStripeEvent(event.id);
    return respond(200);
  } catch {
    console.error('stripe.webhook', event.type, event.id);
    return respond(500);
  }
}

async function handle(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await settleCheckout(stripe, event.data.object);
      return;
    case 'checkout.session.async_payment_failed':
      await expireCheckout(event.data.object.id, 'failed');
      return;
    case 'checkout.session.expired':
      await expireCheckout(event.data.object.id, 'expired');
      return;
    case 'charge.refunded': {
      const charge = event.data.object;
      const paymentIntent = idOf(charge.payment_intent);
      if (paymentIntent) await recordRefunded(paymentIntent, charge.amount_refunded);
      return;
    }
    case 'refund.created':
    case 'refund.updated': {
      // One credit note per refund that actually went through.
      const refund = event.data.object;
      const paymentIntent = idOf(refund.payment_intent);
      if (refund.status === 'succeeded' && paymentIntent) {
        await queueCreditNote(refund.id, paymentIntent, refund.amount);
        after(() => processBillingQueue());
      }
      return;
    }
    case 'charge.dispute.created': {
      const paymentIntent = idOf(event.data.object.payment_intent);
      if (paymentIntent) await recordDispute(paymentIntent, 'open');
      revalidateTag(adsCacheTag);
      return;
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object;
      const paymentIntent = idOf(dispute.payment_intent);
      const outcome = dispute.status === 'won' ? 'won' : dispute.status === 'lost' ? 'lost' : null;
      if (paymentIntent && outcome) await recordDispute(paymentIntent, outcome);
      return;
    }
    default:
      // Subscribed events only; anything else is acknowledged and ignored.
      return;
  }
}

function idOf(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : (value?.id ?? null);
}
