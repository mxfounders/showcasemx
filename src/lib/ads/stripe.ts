import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * The Stripe client, created on first use so builds never need the key. Returns null
 * when Stripe is not configured; callers answer 503 instead of pretending to charge.
 * The API version is pinned to the one the installed SDK's types describe.
 */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, {
    apiVersion: '2026-09-30.endive',
    maxNetworkRetries: 2,
    appInfo: { name: 'shwcs', url: 'https://shwcs.site' },
  });
  return client;
}

/**
 * The publishable key Stripe.js uses to mount the payment form on shwcs. Public by design
 * (it can only create payment details for this account), so it is a NEXT_PUBLIC variable;
 * without it no Checkout Session is opened, since nothing could collect the payment.
 */
export function publishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key && /^pk_(test|live)_[A-Za-z0-9]+$/.test(key) ? key : null;
}

/**
 * Stripe Tax is required: prices are quoted before tax and Checkout adds it. Only local
 * testing against an account without Stripe Tax set up may turn it off, explicitly.
 */
export function automaticTaxEnabled() {
  return process.env.STRIPE_AUTOMATIC_TAX !== 'off';
}

/** "Website Advertising": online advertising services (Stripe tax code catalogue). */
export const adTaxCode = 'txcd_10701000';
