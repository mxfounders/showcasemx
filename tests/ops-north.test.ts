import assert from 'node:assert/strict';
import test from 'node:test';
import { delta, fmtSpan, localDayStart, periods, rate } from '../ops/src/lib/north';

test('months start at midnight in Mexico City, not UTC', () => {
  assert.equal(localDayStart('2026-11-01').toISOString(), '2026-11-01T06:00:00.000Z');
  // 14 Nov 2026, 01:00 in UTC is still the 13th in Mexico City.
  const p = periods(new Date('2026-11-14T01:00:00Z'));
  assert.equal(p.today, '2026-11-13');
  assert.equal(p.curStart.toISOString(), '2026-11-01T06:00:00.000Z');
  assert.equal(p.prevStart.toISOString(), '2026-10-01T06:00:00.000Z');
});

test('the previous month is compared over the same stretch, never past its end', () => {
  const p = periods(new Date('2026-11-14T18:00:00Z'));
  // 13 days and 12 hours into November → the same into October.
  assert.equal(p.prevEnd.toISOString(), '2026-10-14T18:00:00.000Z');
  assert.equal(p.prevToday, '2026-10-14');
  assert.equal(p.weeksStart.toISOString(), '2026-10-17T18:00:00.000Z');
  // 31 March is longer than all of February: the comparison stops at 1 March.
  const march = periods(new Date('2027-03-31T20:00:00Z'));
  assert.equal(march.prevStart.toISOString(), '2027-02-01T06:00:00.000Z');
  assert.equal(march.prevEnd.toISOString(), march.curStart.toISOString());
  // January compares with December of the year before.
  const january = periods(new Date('2027-01-10T18:00:00Z'));
  assert.equal(january.prevStart.toISOString(), '2026-12-01T06:00:00.000Z');
});

test('a change is good or bad depending on which way the metric should move', () => {
  assert.deepEqual(delta(10, 7), { change: 3, tone: 'sage', arrow: '↑' });
  assert.deepEqual(delta(5, 7), { change: -2, tone: 'terracotta', arrow: '↓' });
  // Fewer hours to answer is better.
  assert.deepEqual(delta(3600, 7200, 'down'), { change: -3600, tone: 'sage', arrow: '↓' });
  assert.deepEqual(delta(4, 4), { change: 0, tone: 'neutral', arrow: '→' });
  assert.deepEqual(delta(null, 4), { change: null, tone: 'neutral', arrow: '→' });
  assert.deepEqual(delta(4, null), { change: null, tone: 'neutral', arrow: '→' });
});

test('durations and rates read the way people say them', () => {
  assert.equal(fmtSpan(20), '1 min');
  assert.equal(fmtSpan(45 * 60), '45 min');
  assert.equal(fmtSpan(6.25 * 3600), '6,3 h');
  assert.equal(fmtSpan(60 * 3600), '2,5 días');
  assert.equal(fmtSpan(null), '—');
  assert.equal(rate(1, 3), 33);
  assert.equal(rate(0, 0), null);
});
