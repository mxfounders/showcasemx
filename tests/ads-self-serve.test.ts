import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  clickThroughRate,
  discountAmount,
  estimatedTaxRate,
  firstRefundableDay,
  lastBookableDay,
  preferredCurrency,
  readPromotionCode,
  refundAmount,
} from '../src/lib/ads/model';
import { checkoutSessionParams } from '../src/lib/ads/checkout';
import { isPromotionRejection } from '../src/lib/ads/promo';
import { cordInvoiceDraft } from '../src/lib/billing/cord';
import { cfdiTaxRate } from '../src/lib/billing/model';
import { authReturnTo } from '../src/lib/auth/return-to';
import { POST as promoRoute } from '../src/app/api/ads/promo/route';
import { POST as waitlistRoute } from '../src/app/api/ads/waitlist/route';
import { POST as reachRoute } from '../src/app/api/ads/reach/route';
import { POST as eventsRoute } from '../src/app/api/ads/events/route';

const solution = '00000000-0000-4000-8000-000000000001';
const booking = '00000000-0000-4000-8000-000000000002';

test('promotion codes: Stripe alphabet only, empty means none', () => {
  assert.equal(readPromotionCode(undefined), null);
  assert.equal(readPromotionCode('  '), null);
  assert.equal(readPromotionCode(' FUNDADOR-30 '), 'FUNDADOR-30');
  assert.equal(readPromotionCode('DROP TABLE;'), 'invalid');
  assert.equal(readPromotionCode('x'.repeat(61)), 'invalid');
  assert.equal(readPromotionCode(30), 'invalid');
});

test('a discount comes off the pre-tax subtotal and never goes below zero', () => {
  // 7 category days at 169 MXN.
  assert.equal(discountAmount(118_300, { percentOff: 30, amountOff: null }), 35_490);
  assert.equal(discountAmount(118_300, { percentOff: 100, amountOff: null }), 118_300);
  assert.equal(discountAmount(118_300, { percentOff: null, amountOff: 50_000 }), 50_000);
  assert.equal(discountAmount(10_000, { percentOff: null, amountOff: 50_000 }), 10_000);
  assert.equal(discountAmount(118_300, null), 0);
});

test('refunds stay proportional to what was charged after a discount (SHCWS-75)', () => {
  // 30 % off 7 × 169 MXN: 82 810 net + 16 % IVA (13 250) = 96 060 charged.
  const now = new Date('2026-10-12T18:00:00Z'); // day 1 of 2026-10-12 → 2026-10-19 (Mexico City)
  const window = { startsOn: '2026-10-12', endsOn: '2026-10-19' };
  const first = firstRefundableDay(window, 'advertiserCancel', now);
  assert.equal(first, '2026-10-14'); // today and tomorrow (< 24 h) keep serving
  assert.equal(
    refundAmount({ ...window, totalAmount: 96_060, refundRequested: 0 }, first),
    Math.floor((96_060 * 5) / 7),
  );
  // Never more than what was paid, and a 100 % code leaves nothing to refund.
  assert.equal(refundAmount({ ...window, totalAmount: 0, refundRequested: 0 }, first), 0);
  assert.equal(
    refundAmount({ ...window, totalAmount: 96_060, refundRequested: 0 }, '2026-10-12'),
    96_060,
  );
});

test('the CFDI of a discounted booking matches the Stripe charge', () => {
  const draft = cordInvoiceDraft('client_1', {
    description: 'Espacio patrocinado',
    days: 7,
    dailyAmount: 16_900,
    currency: 'mxn',
    taxRate: 0.16,
    reference: 'ref',
    discountAmount: 35_490,
  });
  assert.deepEqual(draft.items, [
    { descripcion: 'Espacio patrocinado', cantidad: 1, precio_unitario: 828.1, tax_rate: 0.16 },
  ]);
  // The IVA rate is read on the net base Stripe taxed.
  assert.equal(cfdiTaxRate(118_300 - 35_490, 13_250), 0.16);
  assert.equal(cfdiTaxRate(118_300, 13_250), null);
  const plain = cordInvoiceDraft('client_1', {
    description: 'x',
    days: 7,
    dailyAmount: 16_900,
    currency: 'mxn',
    taxRate: 0.16,
    reference: 'ref',
  });
  assert.equal(plain.items[0].cantidad, 7);
});

test('checkout applies a server-checked promotion code, never one typed on Stripe', () => {
  const input = {
    bookingId: booking,
    request: {
      solutionId: solution,
      placement: 'home' as const,
      scope: '',
      startsOn: '2026-10-12',
      days: 7,
      currency: 'usd' as const,
    },
    dailyAmount: 1_900,
    customer: 'cus_test',
    productName: 'Sponsored',
    locale: 'es',
    origin: 'https://shwcs.site',
    automaticTax: true,
  };
  assert.equal('discounts' in checkoutSessionParams(input), false);
  const withCode = checkoutSessionParams({ ...input, promotionCodeId: 'promo_123' });
  assert.deepEqual(withCode.discounts, [{ promotion_code: 'promo_123' }]);
  assert.equal('allow_promotion_codes' in withCode, false);
  assert.equal(isPromotionRejection({ param: 'discounts[0][promotion_code]' }), true);
  assert.equal(isPromotionRejection({ code: 'resource_missing', param: 'customer' }), false);
});

test('tax and currency estimates follow the billing country', () => {
  assert.equal(estimatedTaxRate('MX'), 0.16);
  assert.equal(estimatedTaxRate('US'), 0);
  assert.equal(estimatedTaxRate(null), null);
  assert.equal(preferredCurrency('MX', 'en'), 'mxn');
  assert.equal(preferredCurrency('ES', 'es'), 'usd');
  assert.equal(preferredCurrency(null, 'es'), 'mxn');
  assert.equal(preferredCurrency(null, 'en'), 'usd');
});

test('a calendar range never crosses a full day (SHCWS-77)', () => {
  const full = ['2026-11-20', '2026-11-25'];
  assert.equal(lastBookableDay('2026-11-15', full), '2026-11-19');
  assert.equal(lastBookableDay('2026-11-20', full), null);
  assert.equal(lastBookableDay('2026-11-21', full), '2026-11-24');
  assert.equal(lastBookableDay('2026-12-01', full, 3), '2026-12-03');
});

test('click-through rate waits for the first impression', () => {
  assert.equal(clickThroughRate(3, 0), null);
  assert.equal(clickThroughRate(3, 150), 0.02);
});

test('the sponsored booking survives sign-in on the way to the contact form', () => {
  assert.equal(
    authReturnTo(`/account/contacts/new?solution=${solution}&ad=${booking}`),
    `/account/contacts/new?solution=${solution}&ad=${booking}`,
  );
  assert.equal(
    authReturnTo(`/account/contacts/new?solution=${solution}&ad=https://evil.example`),
    `/account/contacts/new?solution=${solution}`,
  );
});

const post = (url: string, origin: string, body: unknown = {}, headers = {}) =>
  new NextRequest(url, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

test('promo, waitlist and reach reject other origins; promo and waitlist need a session', async () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit_only';
  try {
    const promo = 'http://localhost:3000/api/ads/promo';
    const waitlist = 'http://localhost:3000/api/ads/waitlist';
    const reach = 'http://localhost:3000/api/ads/reach';
    assert.equal((await promoRoute(post(promo, 'https://evil.example'))).status, 403);
    assert.equal((await promoRoute(post(promo, 'http://localhost:3000'))).status, 401);
    assert.equal((await waitlistRoute(post(waitlist, 'https://evil.example'))).status, 403);
    assert.equal((await waitlistRoute(post(waitlist, 'http://localhost:3000'))).status, 401);
    assert.equal((await reachRoute(post(reach, 'https://evil.example'))).status, 403);
  } finally {
    if (saved === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = saved;
  }
});

test('reach and listing visits honour Do Not Track and reject malformed events', async () => {
  const reach = 'http://localhost:3000/api/ads/reach';
  const events = 'http://localhost:3000/api/ads/events';
  const local = 'http://localhost:3000';
  assert.equal(
    (await reachRoute(post(reach, local, { placement: 'home', scope: '' }, { dnt: '1' }))).status,
    204,
  );
  assert.equal((await reachRoute(post(reach, local, { placement: 'newsletter' }))).status, 400);
  assert.equal(
    (await reachRoute(post(reach, local, { placement: 'category', scope: 'nope' }))).status,
    400,
  );
  assert.equal(
    (
      await eventsRoute(
        post(
          events,
          local,
          { bookingId: booking, kind: 'visit', solutionId: solution },
          {
            'sec-gpc': '1',
          },
        ),
      )
    ).status,
    204,
  );
  // A visit or a contact must name the listing it happened on.
  assert.equal(
    (await eventsRoute(post(events, local, { bookingId: booking, kind: 'visit' }))).status,
    400,
  );
  assert.equal(
    (await eventsRoute(post(events, local, { bookingId: booking, kind: 'refund' }))).status,
    400,
  );
});
