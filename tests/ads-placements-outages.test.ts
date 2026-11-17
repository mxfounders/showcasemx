import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as outageRoute } from '../src/app/api/internal/outages/route';
import { POST as reachRoute } from '../src/app/api/ads/reach/route';
import { visitorHash } from '../src/lib/solutions/view-visitor';
import {
  adPlacements,
  dayRefundAmount,
  dayStart,
  isPlacementScope,
  makegoodPlan,
  outageThresholdMinutes,
  readCampaignRequest,
  refundAmount,
  undeliveredDays,
  unservedMinutesByDay,
} from '../src/lib/ads/model';
import { listingScopes, scopeLabel } from '../src/lib/ads/scopes';
import { readOutageReport } from '../src/lib/ads/outage-report';
import { inferQueryCategory } from '../src/lib/search/topics';
import { AD_PLACEMENTS, PLACEMENT_LABEL } from '../ops/src/lib/ads';

/* SHCWS-79: industry, collection and search placements. */

test('every placement validates its own scope', () => {
  assert.equal(isPlacementScope('category', 'cobros'), true);
  assert.equal(isPlacementScope('search', 'cobros'), true);
  assert.equal(isPlacementScope('industry', 'retail'), true);
  assert.equal(isPlacementScope('collection', 'essential'), true);
  // A slug from another taxonomy never passes, nor does an empty scope on a scoped slot.
  assert.equal(isPlacementScope('industry', 'cobros'), false);
  assert.equal(isPlacementScope('collection', 'retail'), false);
  assert.equal(isPlacementScope('search', ''), false);
  assert.equal(isPlacementScope('home', ''), true);
  assert.equal(isPlacementScope('home', 'cobros'), false);
  const request = {
    solutionId: '00000000-0000-4000-8000-000000000001',
    placement: 'industry',
    scope: 'retail',
    startsOn: '2026-11-20',
    days: 3,
    currency: 'mxn',
  };
  assert.equal(readCampaignRequest(request, '2026-11-17').ok, true);
  assert.deepEqual(readCampaignRequest({ ...request, scope: 'nope' }, '2026-11-17'), {
    ok: false,
    error: 'scope',
  });
});

test('ops knows the same placements as the product', () => {
  assert.deepEqual([...AD_PLACEMENTS], [...adPlacements]);
  for (const placement of adPlacements) assert.ok(PLACEMENT_LABEL[placement]);
});

test('a listing can sponsor only the pages it belongs to by what it declared', () => {
  const sales = { categories: ['Ventas'], industries: ['Retail'] };
  assert.deepEqual(listingScopes('category', sales), ['ventas']);
  assert.deepEqual(listingScopes('search', sales), ['ventas']);
  assert.deepEqual(listingScopes('industry', sales), ['retail']);
  assert.deepEqual(listingScopes('home', sales), ['']);
  // «Serves any industry» is a real answer: every industry page shows it, so it may sponsor any.
  const any = listingScopes('industry', { categories: ['Ventas'], industries: [] });
  assert.ok(any.length > 10 && any.includes('retail') && any.includes('salud'));
  // Never answered: nothing is inferred.
  assert.deepEqual(listingScopes('industry', { categories: ['Ventas'] }), []);
  // Collections follow their rule: «Lo básico para operar» gathers Cobros.
  assert.ok(listingScopes('collection', { categories: ['Cobros'] }).includes('essential'));
  assert.ok(!listingScopes('collection', { categories: ['Ventas'] }).includes('essential'));
  // The legacy single `category` still counts.
  assert.deepEqual(listingScopes('category', { category: 'Cobros' }), ['cobros']);
});

test('scopes read as the page they run on, in each language', () => {
  assert.equal(scopeLabel('collection', 'essential', 'es'), 'Lo básico para operar');
  assert.notEqual(scopeLabel('collection', 'essential', 'en'), 'Lo básico para operar');
  // «agencias» is both a category and an industry slug: the placement decides which.
  assert.notEqual(
    scopeLabel('industry', 'agencias', 'es'),
    scopeLabel('category', 'agencias', 'es'),
  );
});

test('a search reaches the slot of the one category it points at', () => {
  assert.equal(inferQueryCategory('cotizaciones de mayoreo', 'es'), 'ventas');
  assert.equal(inferQueryCategory('cobranza a clientes', 'es'), 'cobros');
  assert.equal(inferQueryCategory('payroll', 'en'), inferQueryCategory('nómina', 'es'));
  assert.equal(inferQueryCategory('', 'es'), null);
  assert.equal(inferQueryCategory('zzqx', 'es'), null);
  // Deterministic: the same words always reach the same slot.
  assert.equal(
    inferQueryCategory('facturación electrónica', 'es'),
    inferQueryCategory('facturación electrónica', 'es'),
  );
});

/* SHCWS-179: outages, make-good days and day refunds. */

const at = (day: string, hour: number, minute = 0) =>
  new Date(dayStart(day).getTime() + (hour * 60 + minute) * 60_000);

test('unserved minutes are counted per Mexico City day, overlaps once', () => {
  const minutes = unservedMinutesByDay([
    { start: at('2026-11-16', 8), end: at('2026-11-16', 11) },
    // Same outage from a second reporter, overlapping the first.
    { start: at('2026-11-16', 10), end: at('2026-11-16', 12) },
    // A separate outage later that day.
    { start: at('2026-11-16', 20), end: at('2026-11-16', 21, 30) },
  ]);
  assert.equal(minutes.get('2026-11-16'), 4 * 60 + 90);
  assert.deepEqual(
    undeliveredDays([{ start: at('2026-11-16', 8), end: at('2026-11-16', 11, 59) }]),
    [],
  );
  assert.deepEqual(undeliveredDays([{ start: at('2026-11-16', 8), end: at('2026-11-16', 12) }]), [
    { day: '2026-11-16', minutes: outageThresholdMinutes },
  ]);
});

test('an outage across midnight is split between the days it touched', () => {
  const days = undeliveredDays([{ start: at('2026-11-16', 21), end: at('2026-11-17', 6) }]);
  // 3 h on the 16th does not reach the threshold; 6 h on the 17th does.
  assert.deepEqual(days, [{ day: '2026-11-17', minutes: 360 }]);
  const month = undeliveredDays([{ start: at('2026-10-11', 9), end: at('2026-10-14', 9) }]);
  assert.deepEqual(
    month.map(item => [item.day, item.minutes]),
    [
      ['2026-10-11', 900],
      ['2026-10-12', 1440],
      ['2026-10-13', 1440],
      ['2026-10-14', 540],
    ],
  );
});

test('a day refund is the same proportion as a cancellation of that day', () => {
  const booking = { startsOn: '2026-11-10', endsOn: '2026-11-17', totalAmount: 96060 };
  assert.equal(dayRefundAmount({ ...booking, refundRequested: 0 }), Math.floor(96060 / 7));
  // Same as refundAmount for the last day alone.
  assert.equal(
    dayRefundAmount({ ...booking, refundRequested: 0 }),
    refundAmount({ ...booking, refundRequested: 0 }, '2026-11-16'),
  );
  // Never more than what has not been refunded yet, never negative.
  assert.equal(dayRefundAmount({ ...booking, refundRequested: 90000 }), 6060);
  assert.equal(dayRefundAmount({ ...booking, refundRequested: 96060 }), 0);
  assert.equal(dayRefundAmount({ ...booking, totalAmount: 0, refundRequested: 0 }), 0);
});

test('a make-good goes right after the booking while there is a day left to run', () => {
  const live = { servedUntil: null, canceledAt: null, lastEnd: '2026-11-20' };
  assert.deepEqual(makegoodPlan(live, true, '2026-11-17'), { ok: true, day: '2026-11-20' });
  // The day after it would already have started (or passed): refund instead.
  assert.deepEqual(makegoodPlan({ ...live, lastEnd: '2026-11-17' }, true, '2026-11-17'), {
    ok: false,
    reason: 'ended',
  });
  assert.deepEqual(makegoodPlan({ ...live, servedUntil: '2026-11-18' }, true, '2026-11-17'), {
    ok: false,
    reason: 'stopped',
  });
  assert.deepEqual(
    makegoodPlan({ ...live, canceledAt: '2026-11-15T10:00:00Z' }, true, '2026-11-17'),
    {
      ok: false,
      reason: 'stopped',
    },
  );
  assert.deepEqual(makegoodPlan(live, false, '2026-11-17'), { ok: false, reason: 'unlisted' });
});

test('outage reports: two of start, end and duration; recoveries only', () => {
  const now = new Date('2026-11-17T18:00:00Z');
  const fromDuration = readOutageReport(
    { source: 'uptime', incident: 'm1-1', endedAt: '1794934800', durationSeconds: '18000' },
    now,
  );
  assert.ok(fromDuration.ok && 'report' in fromDuration);
  if (fromDuration.ok && 'report' in fromDuration) {
    assert.equal(fromDuration.report.endedAt.toISOString(), '2026-11-17T17:00:00.000Z');
  }
  const report = readOutageReport(
    { startedAt: '2026-11-17T08:00:00Z', durationSeconds: 3600 },
    now,
  );
  assert.ok(report.ok && 'report' in report);
  if (report.ok && 'report' in report) {
    assert.equal(report.report.source, 'uptime');
    assert.equal(report.report.endedAt.toISOString(), '2026-11-17T09:00:00.000Z');
    // Without an id of its own, its start is the incident: a retry is the same row.
    assert.equal(report.report.externalId, '2026-11-17T08:00:00.000Z');
  }
  assert.deepEqual(readOutageReport({ event: 'Down', startedAt: '2026-11-17T08:00:00Z' }, now), {
    ok: true,
    ignored: true,
  });
  assert.deepEqual(readOutageReport({ startedAt: '2026-11-17T08:00:00Z' }, now), {
    ok: false,
    error: 'times',
  });
  assert.deepEqual(
    readOutageReport({ startedAt: '2026-11-17T09:00:00Z', endedAt: '2026-11-17T08:00:00Z' }, now),
    { ok: false, error: 'order' },
  );
  assert.deepEqual(
    readOutageReport({ startedAt: '2026-11-17T17:00:00Z', endedAt: '2026-11-17T19:00:00Z' }, now),
    { ok: false, error: 'future' },
  );
  assert.deepEqual(
    readOutageReport({ startedAt: '2026-08-01T00:00:00Z', endedAt: '2026-08-01T05:00:00Z' }, now),
    { ok: false, error: 'tooOld' },
  );
  assert.deepEqual(readOutageReport({ source: 'bad source!', durationSeconds: 1 }, now), {
    ok: false,
    error: 'source',
  });
});

test('the outage webhook needs its own secret and a valid body before anything is stored', async () => {
  const saved = process.env.OUTAGE_WEBHOOK_SECRET;
  const secret = 'o'.repeat(40);
  process.env.OUTAGE_WEBHOOK_SECRET = secret;
  const send = (body: unknown, authorization?: string) =>
    outageRoute(
      new NextRequest('http://localhost:3000/api/internal/outages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authorization ? { authorization } : {}),
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  try {
    assert.equal((await send({})).status, 401);
    assert.equal((await send({}, `Bearer ${'x'.repeat(40)}`)).status, 401);
    // CRON_SECRET is not this secret.
    assert.equal((await send({}, `Bearer ${process.env.CRON_SECRET ?? ''}`)).status, 401);
    assert.equal((await send('not json', `Bearer ${secret}`)).status, 400);
    assert.equal((await send({ startedAt: 'yesterday' }, `Bearer ${secret}`)).status, 400);
    assert.equal(
      (await send({ event: 'down', startedAt: new Date().toISOString() }, `Bearer ${secret}`))
        .status,
      202,
    );
    // A short secret never authorizes, even when it matches.
    process.env.OUTAGE_WEBHOOK_SECRET = 'short';
    assert.equal((await send({}, 'Bearer short')).status, 401);
  } finally {
    if (saved === undefined) delete process.env.OUTAGE_WEBHOOK_SECRET;
    else process.env.OUTAGE_WEBHOOK_SECRET = saved;
  }
});

test('reach counts only pages that carry a slot, and hashes visitors per day', async () => {
  const local = 'http://localhost:3000';
  const post = (body: unknown) =>
    reachRoute(
      new NextRequest(`${local}/api/ads/reach`, {
        method: 'POST',
        headers: { origin: local, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  // A category slug is not an industry; search needs the category the query pointed at.
  assert.equal((await post({ placement: 'industry', scope: 'cobros' })).status, 400);
  assert.equal((await post({ placement: 'collection', scope: '' })).status, 400);
  assert.equal((await post({ placement: 'search', scope: '' })).status, 400);
  assert.equal((await post({ placement: 'newsletter', scope: '' })).status, 400);
  const saved = process.env.VIEW_HASH_SECRET;
  try {
    delete process.env.VIEW_HASH_SECRET;
    assert.equal(visitorHash('203.0.113.7', '2026-11-17'), null);
    process.env.VIEW_HASH_SECRET = 'unit-test-secret';
    const today = visitorHash('203.0.113.7', '2026-11-17');
    assert.ok(today && !today.includes('203.0.113.7'));
    assert.equal(visitorHash('203.0.113.7', '2026-11-17'), today);
    assert.notEqual(visitorHash('203.0.113.7', '2026-11-18'), today);
  } finally {
    if (saved === undefined) delete process.env.VIEW_HASH_SECRET;
    else process.env.VIEW_HASH_SECRET = saved;
  }
});
