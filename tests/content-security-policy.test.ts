import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy } from '../src/lib/content-security-policy.mjs';

const directives = (policy: string) =>
  new Map(
    policy.split('; ').map(entry => {
      const [name, ...sources] = entry.split(' ');
      return [name, sources] as const;
    }),
  );

test('production pages only load from shwcs itself', () => {
  const policy = directives(contentSecurityPolicy());
  assert.deepEqual(policy.get('default-src'), ["'self'"]);
  assert.deepEqual(policy.get('script-src'), ["'self'", "'unsafe-inline'"]);
  assert.deepEqual(policy.get('connect-src'), ["'self'"]);
  assert.deepEqual(policy.get('frame-src'), ["'none'"]);
  assert.deepEqual(policy.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(policy.get('object-src'), ["'none'"]);
  assert.deepEqual(policy.get('base-uri'), ["'self'"]);
  assert.deepEqual(policy.get('form-action'), ["'self'"]);
  assert.ok(policy.has('upgrade-insecure-requests'));
  // No other host anywhere, and nothing that lets a string become code.
  const text = contentSecurityPolicy();
  assert.doesNotMatch(text, /https?:\/\//);
  assert.doesNotMatch(text, /unsafe-eval/);
});

test('preview deployments add only the Vercel toolbar', () => {
  const policy = directives(contentSecurityPolicy({ preview: true }));
  assert.ok(policy.get('script-src')?.includes('https://vercel.live'));
  assert.deepEqual(policy.get('frame-src'), ['https://vercel.live']);
  assert.doesNotMatch(contentSecurityPolicy({ preview: true }), /unsafe-eval/);
});

test('development keeps hot reload and the analytics debug scripts working', () => {
  const policy = directives(contentSecurityPolicy({ dev: true }));
  assert.ok(policy.get('script-src')?.includes("'unsafe-eval'"));
  assert.ok(policy.get('script-src')?.includes('https://va.vercel-scripts.com'));
  assert.ok(policy.get('connect-src')?.includes('ws:'));
  assert.ok(!policy.has('upgrade-insecure-requests'));
});

test('only the payment page lets Stripe in, and only what Stripe Elements needs', () => {
  const policy = directives(contentSecurityPolicy({ stripe: true }));
  assert.ok(policy.get('script-src')?.includes('https://js.stripe.com'));
  assert.ok(policy.get('frame-src')?.includes('https://hooks.stripe.com'));
  assert.ok(policy.get('connect-src')?.includes('https://api.stripe.com'));
  assert.ok(!policy.get('frame-src')?.includes("'none'"));
  assert.deepEqual(policy.get('frame-ancestors'), ["'none'"]);
  assert.doesNotMatch(contentSecurityPolicy({ stripe: true }), /unsafe-eval/);
  // Every other page stays closed to Stripe.
  assert.doesNotMatch(contentSecurityPolicy(), /stripe/);
});
