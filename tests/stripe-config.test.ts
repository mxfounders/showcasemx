import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { adTaxCode } from '../src/lib/ads/stripe';
import { apiVersion, taxCode, webhookEvents } from '../scripts/verify-stripe.cjs';

// The webhook endpoint in Stripe is configured from this list (verify:stripe, stripe:listen and
// docs/ads.md), so an event the handler learns must be subscribed too, and the other way round.
test('verify:stripe subscribes to exactly the events the webhook handles', () => {
  const route = readFileSync('src/app/api/webhooks/stripe/route.ts', 'utf8');
  const handled = [...route.matchAll(/case '([a-z_.]+)':/g)].map(match => match[1]);
  assert.deepEqual([...webhookEvents].sort(), [...handled].sort());
});

test('docs/ads.md lists the same webhook events', () => {
  const docs = readFileSync('docs/ads.md', 'utf8');
  for (const event of webhookEvents)
    assert.match(docs, new RegExp(`^${event.replace(/\./g, '\\.')}$`, 'm'));
});

test('verify:stripe reads the API version and tax code the app uses', () => {
  assert.match(apiVersion, /^\d{4}-\d{2}-\d{2}\.[a-z]+$/);
  assert.equal(taxCode, adTaxCode);
});
