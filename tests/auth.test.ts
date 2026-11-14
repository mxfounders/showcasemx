import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  hashPassword,
  verifyPassword,
  validateCredentials,
  hashToken,
} from '../src/lib/auth/password';
import { getSession, cookieOptions } from '../src/lib/auth/session';
import { POST } from '../src/app/api/auth/[action]/route';
import {
  clearGoogleCookies,
  googleCookieOptions,
  googleStateCookie,
  legacyGoogleCookie,
} from '../src/lib/auth/google';
import {
  networkOf,
  pressureAllowance,
  requestIdentity,
  withinLimit,
} from '../src/lib/auth/security';

test('passwords use random salts, verify correctly and reject corruption', async () => {
  const password = 'a long test passphrase';
  const a = await hashPassword(password);
  const b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(password));
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword('wrong password here', a), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
  assert.equal(hashToken('opaque-token').length, 64);
});
test('credentials normalize email without trimming passwords', () => {
  assert.deepEqual(
    validateCredentials({ email: ' USER@example.com ', password: '  long passphrase  ' }),
    { email: 'user@example.com', password: '  long passphrase  ' },
  );
  assert.equal(validateCredentials({ email: 'x@example.com', password: 'short' }), null);
  assert.equal(validateCredentials({ email: 'x@example.com', password: 'x'.repeat(4097) }), null);
});
test('sessions reject malformed tokens and use protected cookies', async () => {
  assert.equal(await getSession(undefined), null);
  assert.equal(await getSession('fake-token'), null);
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.sameSite, 'lax');
  assert.equal(cookieOptions.path, '/');
});
test('auth rejects cross-origin before touching storage and never fakes access', async () => {
  function request(origin: string) {
    return new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { origin },
    });
  }
  assert.equal(
    (await POST(request('https://other.example'), { params: Promise.resolve({ action: 'login' }) }))
      .status,
    403,
  );
  const keys = ['NEON_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => {
    delete process.env[key];
  });
  try {
    for (const action of ['login', 'register', 'logout'])
      assert.equal(
        (await POST(request('http://localhost:3000'), { params: Promise.resolve({ action }) }))
          .status,
        503,
      );
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] !== undefined) process.env[key] = previous[i];
      else delete process.env[key];
    });
  }
});

test('six characters and long passphrases are supported', () => {
  assert.ok(validateCredentials({ email: 'x@example.com', password: 'abcdef' }));
  assert.ok(validateCredentials({ email: 'x@example.com', password: 'a'.repeat(500) }));
  assert.equal(validateCredentials({ email: 'x@example.com', password: 'abcde' }), null);
});

test('rate-limit identity accepts bounded network addresses and rejects arbitrary headers', () => {
  assert.equal(
    requestIdentity(new Headers({ 'x-forwarded-for': '203.0.113.8, 10.0.0.1' })),
    '203.0.113.8',
  );
  // IPv6 counts by its /64 (SHCWS-171): every address of one connection is one network.
  assert.equal(
    requestIdentity(new Headers({ 'x-forwarded-for': '2001:db8::1' })),
    '2001:db8:0:0::/64',
  );
  assert.equal(
    requestIdentity(new Headers({ 'x-forwarded-for': 'attacker-controlled value' })),
    'unknown',
  );
});

test('IPv6 addresses of one /64 share a network; IPv4 stays exact', () => {
  const same = [
    '2001:db8:aa:bb:1:2:3:4',
    '2001:0db8:00aa:00bb:ffff::1',
    '2001:DB8:AA:BB::',
    '2001:db8:aa:bb:0:0:1.2.3.4',
  ].map(networkOf);
  assert.deepEqual(new Set(same), new Set(['2001:db8:aa:bb::/64']));
  assert.equal(networkOf('2001:db8:aa:bc::1'), '2001:db8:aa:bc::/64');
  assert.equal(networkOf('::1'), '0:0:0:0::/64');
  assert.equal(networkOf('::ffff:203.0.113.8'), '203.0.113.8');
  assert.equal(networkOf('203.0.113.8'), '203.0.113.8');
  for (const bad of [
    '256.1.1.1',
    '1:2:3:4:5:6:7:8:9',
    '1::2::3',
    'g::1',
    '1:2:3',
    '',
    '::ffff:1.2.3',
  ])
    assert.equal(networkOf(bad), null, bad);
});

test('a busy scope narrows each identity instead of refusing everyone', () => {
  // Calm: the identity's own allowance applies.
  assert.equal(withinLimit(30, 120, 30, 120), true);
  assert.equal(withinLimit(31, 1, 30, 120), false);
  // Under pressure: a newcomer still gets in, a network that kept trying does not.
  assert.equal(withinLimit(1, 5000, 30, 120), true);
  assert.equal(withinLimit(8, 5000, 30, 120), true);
  assert.equal(withinLimit(9, 5000, 30, 120), false);
  assert.equal(pressureAllowance(3), 1);
  assert.equal(pressureAllowance(1), 1);
});

test('the Google state cookie is __Host- when secure, and clearing covers the old name', () => {
  // A __Host- cookie can't be planted by a sibling subdomain such as ops (SHCWS-174).
  assert.equal(googleStateCookie(true), '__Host-showcasemx_google_state');
  assert.equal(googleStateCookie(false), legacyGoogleCookie);
  assert.equal(googleCookieOptions.path, '/');
  assert.equal(googleCookieOptions.httpOnly, true);
  assert.equal('domain' in googleCookieOptions, false);
  const cleared: Array<[string, number]> = [];
  clearGoogleCookies({ set: (name, _value, options) => cleared.push([name, options.maxAge]) });
  assert.ok(cleared.some(([name]) => name === legacyGoogleCookie));
  assert.ok(cleared.every(([, maxAge]) => maxAge === 0));
});
