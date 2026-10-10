import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  adToday,
  bookingState,
  campaignSubtotal,
  daysBetween,
  isIsoDate,
  maxCampaignDays,
  maxLeadDays,
  dayStart,
  firstRefundableDay,
  readCampaignRequest,
  refundAmount,
} from '../src/lib/ads/model';

const today = '2026-10-09';
const valid = {
  solutionId: '00000000-0000-4000-8000-000000000001',
  placement: 'category',
  scope: 'cobros',
  startsOn: '2026-10-12',
  days: 7,
  currency: 'usd',
};

test('accepts a well-formed request, including a single day', () => {
  const result = readCampaignRequest(valid, today);
  assert.equal(result.ok, true);
  assert.equal(readCampaignRequest({ ...valid, days: 1 }, today).ok, true);
  assert.equal(readCampaignRequest({ ...valid, startsOn: today }, today).ok, true);
  assert.equal(
    readCampaignRequest({ ...valid, placement: 'home', scope: '', currency: 'mxn' }, today).ok,
    true,
  );
});

test('rejects each malformed field with its own code', () => {
  const error = (patch: Record<string, unknown>) => {
    const result = readCampaignRequest({ ...valid, ...patch }, today);
    return result.ok ? null : result.error;
  };
  assert.equal(error({ solutionId: '../other' }), 'solution');
  assert.equal(error({ placement: 'sidebar' }), 'placement');
  assert.equal(error({ scope: 'unknown-category' }), 'scope');
  assert.equal(error({ placement: 'home', scope: 'cobros' }), 'scope');
  assert.equal(error({ startsOn: '2026-02-30' }), 'startsOn');
  assert.equal(error({ startsOn: '2026-10-08' }), 'startsInPast');
  assert.equal(error({ startsOn: addDays(today, maxLeadDays + 1) }), 'startsTooLate');
  for (const days of [0, -1, 1.5, maxCampaignDays + 1, '7']) assert.equal(error({ days }), 'days');
  assert.equal(error({ currency: 'eur' }), 'currency');
  assert.equal(readCampaignRequest(null, today).ok, false);
});

test('calendar helpers work in whole UTC days', () => {
  assert.equal(isIsoDate('2028-02-29'), true);
  assert.equal(isIsoDate('2026-02-29'), false);
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(daysBetween('2026-10-09', '2026-10-16'), 7);
});

test("today follows the platform's time zone, not UTC", () => {
  // 03:00 UTC on Oct 10 is still Oct 9 in Mexico City (UTC-6).
  assert.equal(adToday(new Date('2026-10-10T03:00:00Z')), '2026-10-09');
  assert.equal(adToday(new Date('2026-10-10T07:00:00Z')), '2026-10-10');
});

test('price is days × daily rate and never exceeds one Stripe charge', () => {
  assert.equal(campaignSubtotal(7, 2_500), 17_500);
  assert.equal(campaignSubtotal(90, 2_000_000), null);
});

test('a day starts at midnight Mexico City time', () => {
  assert.equal(dayStart('2026-10-12').toISOString(), '2026-10-12T06:00:00.000Z');
});

test('advertiser cancellation refunds only days starting 24 hours or more later', () => {
  const booking = { startsOn: '2026-10-12', endsOn: '2026-10-19' }; // 7 days
  // Oct 9, 10:00 local: Oct 10 starts in 14h (kept), Oct 11 in 38h — but the booking
  // starts Oct 12, so everything is refunded.
  assert.equal(
    firstRefundableDay(booking, 'advertiserCancel', new Date('2026-10-09T16:00:00Z')),
    '2026-10-12',
  );
  // Oct 11, 10:00 local: Oct 12 starts in 14h → kept; Oct 13 onwards refunded.
  assert.equal(
    firstRefundableDay(booking, 'advertiserCancel', new Date('2026-10-11T16:00:00Z')),
    '2026-10-13',
  );
  // Oct 15, 23:30 local: Oct 16 starts in 30 min, Oct 17 in 24h30 → refunded from the 17th.
  assert.equal(
    firstRefundableDay(booking, 'advertiserCancel', new Date('2026-10-16T05:30:00Z')),
    '2026-10-17',
  );
  // After the last day nothing is refundable.
  assert.equal(
    firstRefundableDay(booking, 'advertiserCancel', new Date('2026-10-20T16:00:00Z')),
    '2026-10-19',
  );
});

test('removals refund from today (shwcs reasons) or tomorrow (breach)', () => {
  const booking = { startsOn: '2026-10-12', endsOn: '2026-10-19' };
  const midRun = new Date('2026-10-15T16:00:00Z'); // Oct 15 local
  assert.equal(firstRefundableDay(booking, 'platformRemoval', midRun), '2026-10-15');
  assert.equal(firstRefundableDay(booking, 'policyRemoval', midRun), '2026-10-16');
  const beforeStart = new Date('2026-10-01T16:00:00Z');
  assert.equal(firstRefundableDay(booking, 'policyRemoval', beforeStart), '2026-10-12');
});

test('refunds are a share of the amount charged, tax included, never more than paid', () => {
  const booking = {
    startsOn: '2026-10-12',
    endsOn: '2026-10-19',
    totalAmount: 8_120,
    refundRequested: 0,
  };
  assert.equal(refundAmount(booking, '2026-10-12'), 8_120); // never started: everything
  assert.equal(refundAmount(booking, '2026-10-16'), 3_480); // 3 of 7 days
  assert.equal(refundAmount(booking, '2026-10-19'), 0);
  assert.equal(refundAmount({ ...booking, refundRequested: 3_480 }, '2026-10-16'), 0);
  assert.equal(refundAmount({ ...booking, totalAmount: 1_000 }, '2026-10-13'), 857); // rounds down
});

test('booking state reads the payment, the calendar and any stop', () => {
  const paid = {
    status: 'paid' as const,
    startsOn: '2026-10-12',
    endsOn: '2026-10-19',
    servedUntil: null,
    canceledAt: null,
    pausedAt: null,
    disputeStatus: null,
  };
  assert.equal(bookingState(paid, '2026-10-10'), 'scheduled');
  assert.equal(bookingState(paid, '2026-10-12'), 'live');
  assert.equal(bookingState(paid, '2026-10-19'), 'ended');
  assert.equal(bookingState({ ...paid, status: 'checkout' }, '2026-10-10'), 'checkout');
  const canceled = { ...paid, canceledAt: '2026-10-13T10:00:00Z', servedUntil: '2026-10-15' };
  assert.equal(bookingState(canceled, '2026-10-14'), 'live'); // paid days within 24h keep serving
  assert.equal(bookingState(canceled, '2026-10-15'), 'canceled');
  const canceledEarly = { ...paid, canceledAt: '2026-10-01T10:00:00Z', servedUntil: '2026-10-12' };
  assert.equal(bookingState(canceledEarly, '2026-10-05'), 'canceled');
  assert.equal(bookingState({ ...paid, pausedAt: '2026-10-13T00:00:00Z' }, '2026-10-14'), 'paused');
  assert.equal(bookingState({ ...paid, disputeStatus: 'open' }, '2026-10-14'), 'disputed');
});
