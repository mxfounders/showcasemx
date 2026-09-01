import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { hashPassword, verifyPassword, validateCredentials, hashToken } from '../src/lib/auth/password';
import { getSession, cookieOptions } from '../src/lib/auth/session';
import { POST } from '../src/app/api/auth/[action]/route';
import { requestIdentity } from '../src/lib/auth/security';

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
  assert.deepEqual(validateCredentials({ email: ' USER@example.com ', password: '  long passphrase  ' }), { email: 'user@example.com', password: '  long passphrase  ' });
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
  function request(origin: string) { return new NextRequest('http://localhost:3000/api/auth/login', { method: 'POST', headers: { origin } }); }
  assert.equal((await POST(request('https://other.example'), { params: Promise.resolve({ action: 'login' }) })).status, 403);
  const keys = ['NEON_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => { delete process.env[key]; });
  try { for (const action of ['login', 'register', 'logout']) assert.equal((await POST(request('http://localhost:3000'), { params: Promise.resolve({ action }) })).status, 503); }
  finally { keys.forEach((key, i) => { if (previous[i] !== undefined) process.env[key] = previous[i]; else delete process.env[key]; }); }
});

test('six characters and long passphrases are supported', () => {
  assert.ok(validateCredentials({email:'x@example.com',password:'abcdef'}));
  assert.ok(validateCredentials({email:'x@example.com',password:'a'.repeat(500)}));
  assert.equal(validateCredentials({email:'x@example.com',password:'abcde'}),null);
});

test('rate-limit identity accepts bounded network addresses and rejects arbitrary headers', () => {
  assert.equal(requestIdentity(new Headers({'x-forwarded-for':'203.0.113.8, 10.0.0.1'})), '203.0.113.8');
  assert.equal(requestIdentity(new Headers({'x-forwarded-for':'2001:db8::1'})), '2001:db8::1');
  assert.equal(requestIdentity(new Headers({'x-forwarded-for':'attacker-controlled value'})), 'unknown');
});
