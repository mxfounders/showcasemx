import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { consentCookie, readConsent, withoutUrlFragments } from '../src/lib/analytics/consent';
import { captureServerEvent } from '../src/lib/analytics/server';

test('readConsent accepts only an explicit answer', () => {
  assert.equal(readConsent('granted'), 'granted');
  assert.equal(readConsent('denied'), 'denied');
  assert.equal(readConsent('yes'), null);
  assert.equal(readConsent(''), null);
  assert.equal(readConsent(undefined), null);
});

test('withoutUrlFragments drops one-time tokens from every URL an event carries', () => {
  const event = withoutUrlFragments({
    event: '$pageview',
    properties: {
      $current_url: 'https://shwcs.site/es/reset-password#token=abc123',
      $referrer: 'https://shwcs.site/es/verify-email#token=xyz',
      $pathname: '/es/reset-password',
      title: 'Paso #2',
      count: 3,
    },
    $set_once: { $initial_current_url: 'https://shwcs.site/es#catalogo' },
  });
  assert.equal(event.properties.$current_url, 'https://shwcs.site/es/reset-password');
  assert.equal(event.properties.$referrer, 'https://shwcs.site/es/verify-email');
  assert.equal(event.properties.$pathname, '/es/reset-password');
  assert.equal(event.properties.title, 'Paso #2');
  assert.equal(event.properties.count, 3);
  assert.equal(event.$set_once?.$initial_current_url, 'https://shwcs.site/es');
  assert.equal('$set' in event, false);
});

test('captureServerEvent sends nothing without consent or without a configured project', () => {
  const saved = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  try {
    // Outside a request scope `after()` would throw: returning early is what passes.
    const url = 'http://localhost:3000/api/library';
    captureServerEvent(new NextRequest(url), 'account', 'project_saved');
    captureServerEvent(
      new NextRequest(url, { headers: { cookie: `${consentCookie}=denied` } }),
      'account',
      'project_saved',
    );
    captureServerEvent(
      new NextRequest(url, { headers: { cookie: `${consentCookie}=granted` } }),
      'account',
      'project_saved',
    );
  } finally {
    if (saved !== undefined) process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = saved;
  }
});
