import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_DAILY_RATE,
  firstRefundableDay,
  parseRate,
  planRemoval,
  refundAmount,
  type RemovableBooking,
} from '../ops/src/lib/ads';
import { refundRequest } from '../ops/src/lib/stripe';
import { removalSummary } from '../ops/src/lib/ad-removal';
import {
  firstRefundableDay as productFirstRefundableDay,
  refundAmount as productRefundAmount,
} from '../src/lib/ads/model';

// 15 Nov 2026, 10:00 in Mexico City (UTC−6).
const now = new Date('2026-11-15T16:00:00Z');

test('ops refund rules match the product on the same inputs', () => {
  const bookings = [
    { startsOn: '2026-11-10', endsOn: '2026-11-20' },
    { startsOn: '2026-11-16', endsOn: '2026-11-18' },
    { startsOn: '2026-11-15', endsOn: '2026-11-16' },
    { startsOn: '2026-12-01', endsOn: '2026-12-31' },
    { startsOn: '2026-11-01', endsOn: '2026-11-15' },
  ];
  const moments = [now, new Date('2026-11-16T05:59:00Z'), new Date('2026-11-16T06:01:00Z')];
  for (const booking of bookings)
    for (const at of moments)
      for (const reason of ['platformRemoval', 'policyRemoval', 'advertiserCancel'] as const) {
        const first = firstRefundableDay(booking, reason, at);
        assert.equal(first, productFirstRefundableDay(booking, reason, at), `${reason} ${at}`);
        for (const refundRequested of [0, 300]) {
          const input = { ...booking, totalAmount: 11_600, refundRequested };
          assert.equal(refundAmount(input, first), productRefundAmount(input, first));
        }
      }
});

const live: RemovableBooking = {
  status: 'paid',
  startsOn: '2026-11-10',
  endsOn: '2026-11-20',
  servedUntil: null,
  totalAmount: 10_000,
  refundRequested: 0,
  pauseReason: null,
  disputeStatus: null,
};

test('withdrawing for a shwcs decision refunds today on; for a breach, from tomorrow', () => {
  assert.deepEqual(planRemoval(live, 'platformRemoval', now), {
    ok: true,
    firstRefundable: '2026-11-15',
    servedUntil: '2026-11-15',
    refund: 5_000,
  });
  assert.deepEqual(planRemoval(live, 'policyRemoval', now), {
    ok: true,
    firstRefundable: '2026-11-16',
    servedUntil: '2026-11-16',
    refund: 4_000,
  });
  // A booking that has not started is refunded whole either way.
  const future = { ...live, startsOn: '2026-12-01', endsOn: '2026-12-05' };
  const plan = planRemoval(future, 'policyRemoval', now);
  assert.ok(plan.ok && plan.refund === 10_000 && plan.servedUntil === '2026-12-01');
});

test('a withdrawal nets out an earlier cancellation and never serves longer', () => {
  // The advertiser cancelled: days from the 17th were already refunded (3 of 10 days).
  const canceled = { ...live, servedUntil: '2026-11-17', refundRequested: 3_000 };
  assert.deepEqual(planRemoval(canceled, 'platformRemoval', now), {
    ok: true,
    firstRefundable: '2026-11-15',
    servedUntil: '2026-11-15',
    refund: 2_000,
  });
  // Already served only until tomorrow and a breach refunds from tomorrow: nothing more.
  const almost = { ...live, servedUntil: '2026-11-16', refundRequested: 4_000 };
  assert.deepEqual(planRemoval(almost, 'policyRemoval', now), {
    ok: true,
    firstRefundable: '2026-11-16',
    servedUntil: '2026-11-16',
    refund: 0,
  });
});

test('withdrawal is refused when there is nothing it may do', () => {
  assert.deepEqual(planRemoval({ ...live, status: 'checkout' }, 'platformRemoval', now), {
    ok: false,
    error: 'not_paid',
  });
  assert.deepEqual(planRemoval({ ...live, disputeStatus: 'open' }, 'platformRemoval', now), {
    ok: false,
    error: 'dispute',
  });
  assert.deepEqual(planRemoval({ ...live, pauseReason: 'policyRemoval' }, 'platformRemoval', now), {
    ok: false,
    error: 'already_removed',
  });
  assert.deepEqual(planRemoval({ ...live, servedUntil: '2026-11-15' }, 'platformRemoval', now), {
    ok: false,
    error: 'ended',
  });
  // An ops pause is not a removal: it can still be withdrawn.
  assert.equal(planRemoval({ ...live, pauseReason: 'opsPause' }, 'platformRemoval', now).ok, true);
});

test('daily rates are parsed as text, in minor units, within one Stripe charge', () => {
  assert.equal(parseRate('25'), 2_500);
  assert.equal(parseRate('19.99'), 1_999);
  assert.equal(parseRate('19.9'), 1_990);
  assert.equal(parseRate(' 1,250.00 '), 125_000);
  assert.equal(parseRate(9), 900);
  assert.equal(parseRate('0'), null);
  assert.equal(parseRate('-5'), null);
  assert.equal(parseRate('1.234'), null);
  assert.equal(parseRate('abc'), null);
  assert.equal(parseRate(String(MAX_DAILY_RATE / 100 + 1)), null);
  assert.ok(MAX_DAILY_RATE * 90 <= 99_999_999);
});

test('ops refunds reuse the product idempotency key and repeat the original reason', () => {
  const base = { bookingId: 'b1', paymentIntent: 'pi_1', amount: 500, requestedTotal: 1_500 };
  const removal = refundRequest(base);
  assert.equal(removal.idempotencyKey, 'refund:b1:1500');
  assert.equal(removal.body, 'payment_intent=pi_1&amount=500&metadata%5Bbooking_id%5D=b1');
  const retry = refundRequest({ ...base, customerRequested: true });
  assert.match(retry.body, /reason=requested_by_customer/);
});

test('a withdrawn listing tells ops what happened to its sponsored slots (SHCWS-81)', () => {
  assert.equal(removalSummary({ stopped: 0, refunded: 0, pending: 0 }), '');
  assert.equal(
    removalSummary({ stopped: 1, refunded: 1, pending: 0 }),
    'Se detuvo 1 espacio patrocinado y se envió 1 reembolso a Stripe.',
  );
  assert.equal(
    removalSummary({ stopped: 2, refunded: 0, pending: 2 }),
    'Se detuvieron 2 espacios patrocinados. 2 reembolsos quedaron pendientes: usa «Reintentar reembolso» en Anuncios.',
  );
});
