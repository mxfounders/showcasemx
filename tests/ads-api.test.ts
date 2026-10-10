import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { checkoutSessionParams } from '../src/lib/ads/checkout';
import { POST as checkout } from '../src/app/api/ads/checkout/route';
import { POST as cancel } from '../src/app/api/ads/cancel/route';
import { POST as events } from '../src/app/api/ads/events/route';
import { POST as webhook } from '../src/app/api/webhooks/stripe/route';

const request = {
  solutionId: '00000000-0000-4000-8000-000000000001',
  placement: 'category' as const,
  scope: 'cobros',
  startsOn: '2026-10-12',
  days: 7,
  currency: 'mxn' as const,
};

test('checkout charges days × daily rate with tax always added on top', () => {
  const params = checkoutSessionParams({
    bookingId: 'booking-1',
    request,
    dailyAmount: 45_000,
    customer: 'cus_test',
    productName: 'Patrocinado · Página de categoría · Cobros · Demo',
    locale: 'es',
    origin: 'https://shwcs.site',
    automaticTax: true,
    now: new Date('2026-10-09T16:00:00Z'),
  });
  const line = params.line_items?.[0];
  assert.equal(line?.quantity, 7);
  assert.equal(line?.price_data?.unit_amount, 45_000);
  assert.equal(line?.price_data?.currency, 'mxn');
  assert.equal(line?.price_data?.tax_behavior, 'exclusive');
  assert.equal(line?.price_data?.product_data?.description, '2026-10-12 → 2026-10-18');
  assert.deepEqual(params.automatic_tax, { enabled: true });
  assert.equal(params.mode, 'payment');
});

test('checkout carries the booking id to the PaymentIntent and invoice, and expires with the hold', () => {
  const now = new Date('2026-10-09T16:00:00Z');
  const params = checkoutSessionParams({
    bookingId: 'booking-1',
    request,
    dailyAmount: 2_500,
    customer: 'cus_test',
    productName: 'Sponsored',
    locale: 'en',
    origin: 'https://shwcs.site',
    automaticTax: true,
    now,
  });
  assert.equal(params.client_reference_id, 'booking-1');
  assert.deepEqual(params.metadata, { booking_id: 'booking-1' });
  assert.deepEqual(params.payment_intent_data?.metadata, { booking_id: 'booking-1' });
  assert.deepEqual(params.invoice_creation?.invoice_data?.metadata, { booking_id: 'booking-1' });
  assert.equal(params.expires_at, Math.floor(now.getTime() / 1000) + 31 * 60);
  assert.equal(params.locale, 'en');
  assert.deepEqual(params.adaptive_pricing, { enabled: false });
  // OXXO settles days later and cannot be refunded; the API version rejects
  // payment_method_types on Checkout, so methods are excluded instead.
  assert.ok(params.excluded_payment_method_types?.includes('oxxo'));
  assert.equal('payment_method_types' in params, false);
  assert.match(params.success_url ?? '', /\{CHECKOUT_SESSION_ID\}/);
  assert.match(params.cancel_url ?? '', /\/en\/account\/solutions\/.+\/promote\?checkout=canceled/);
});

/** Runs `body` with environment overrides (undefined deletes), restoring them afterwards. */
async function withEnv(overrides: Record<string, string | undefined>, body: () => Promise<void>) {
  const saved = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  const apply = (values: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  apply(overrides);
  try {
    await body();
  } finally {
    apply(saved);
  }
}

const post = (url: string, origin: string, body: unknown = {}) =>
  new NextRequest(url, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', referer: 'http://localhost:3000/es/' },
    body: JSON.stringify(body),
  });

test('ad mutations reject other origins and require a session', async () => {
  await withEnv({ STRIPE_SECRET_KEY: 'sk_test_unit_only' }, async () => {
    const checkoutUrl = 'http://localhost:3000/api/ads/checkout';
    const cancelUrl = 'http://localhost:3000/api/ads/cancel';
    assert.equal((await checkout(post(checkoutUrl, 'https://evil.example'))).status, 403);
    assert.equal((await checkout(post(checkoutUrl, 'http://localhost:3000'))).status, 401);
    assert.equal((await cancel(post(cancelUrl, 'https://evil.example'))).status, 403);
    assert.equal((await cancel(post(cancelUrl, 'http://localhost:3000'))).status, 401);
    const eventsUrl = 'http://localhost:3000/api/ads/events';
    assert.equal((await events(post(eventsUrl, 'https://evil.example'))).status, 403);
  });
});

test('checkout answers 503 instead of pretending to charge when Stripe is not configured', async () => {
  await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
    const response = await checkout(
      post('http://localhost:3000/api/ads/checkout', 'http://localhost:3000'),
    );
    assert.equal(response.status, 503);
  });
});

test('ad events honour Do Not Track and Global Privacy Control', async () => {
  for (const header of ['dnt', 'sec-gpc']) {
    const response = await events(
      new NextRequest('http://localhost:3000/api/ads/events', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          [header]: '1',
        },
        body: JSON.stringify({ bookingId: request.solutionId, kind: 'impression' }),
      }),
    );
    assert.equal(response.status, 204);
  }
});

test('the Stripe webhook refuses unsigned or forged payloads', async () => {
  await withEnv(
    { STRIPE_SECRET_KEY: 'sk_test_unit_only', STRIPE_WEBHOOK_SECRET: 'whsec_unit_only' },
    async () => {
      const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
      const unsigned = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: payload,
      });
      assert.equal((await webhook(unsigned)).status, 400);
      const forged = new Stripe('sk_test_unit_only').webhooks.generateTestHeaderString({
        payload,
        secret: 'whsec_someone_else',
      });
      const signedWrong = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': forged },
        body: payload,
      });
      assert.equal((await webhook(signedWrong)).status, 400);
    },
  );
});
