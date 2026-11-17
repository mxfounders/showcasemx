import assert from 'node:assert/strict';
import test from 'node:test';
import { overdueHours, reviewAlertsEnabled } from '../src/lib/review-queue/alerts';

test('reviewer emails only go out automatically in production or when forced', () => {
  const saved = { vercel: process.env.VERCEL_ENV, forced: process.env.REVIEW_ALERTS };
  try {
    delete process.env.VERCEL_ENV;
    delete process.env.REVIEW_ALERTS;
    assert.equal(reviewAlertsEnabled(), false);
    process.env.VERCEL_ENV = 'preview';
    assert.equal(reviewAlertsEnabled(), false);
    process.env.VERCEL_ENV = 'production';
    assert.equal(reviewAlertsEnabled(), true);
    delete process.env.VERCEL_ENV;
    process.env.REVIEW_ALERTS = '1';
    assert.equal(reviewAlertsEnabled(), true);
    delete process.env.SOLUTION_REVIEW_TARGET_HOURS;
    assert.equal(overdueHours(), 48);
    process.env.SOLUTION_REVIEW_TARGET_HOURS = '24';
    assert.equal(overdueHours(), 24);
    delete process.env.SOLUTION_REVIEW_TARGET_HOURS;
  } finally {
    if (saved.vercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved.vercel;
    if (saved.forced === undefined) delete process.env.REVIEW_ALERTS;
    else process.env.REVIEW_ALERTS = saved.forced;
  }
});
