import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { generateKeyPair, SignJWT } from 'jose';
import { googleConfig, googleIdentity } from '../src/lib/auth/google';
import { authorizedCron } from '../src/lib/notifications/cron';
import { verificationDomain } from '../src/lib/trust/domain';
import { validVerificationToken } from '../src/lib/auth/verification';
import { POST as notifications } from '../src/app/api/notifications/route';
import { POST as reports } from '../src/app/api/reports/route';
import { POST as metrics } from '../src/app/api/metrics/route';
import { navigationHref, availableNavigation } from '../src/lib/navigation-destinations';

test('Google rejects unverified, replayed, expired, wrong audience and unsigned identities', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const keys = (async () => publicKey) as Parameters<typeof googleIdentity>[3];
  const base = { sub: 'test-google-subject', email: 'TEST@example.invalid', email_verified: true, nonce: 'requested-nonce', azp: 'test-client' };
  async function token(changes: Record<string, unknown> = {}, audience = 'test-client', expires = '5m') {
    return new SignJWT({ ...base, ...changes }).setProtectedHeader({ alg: 'RS256' }).setIssuedAt().setExpirationTime(expires).setIssuer('https://accounts.google.com').setAudience(audience).sign(privateKey);
  }
  assert.equal((await googleIdentity(await token(), 'requested-nonce', 'test-client', keys)).email, 'test@example.invalid');
  for (const value of [await token({ email_verified: false }), await token({ nonce: 'another-nonce' }), await token({ azp: 'another-client' }), await token({ sub: '' }), await token({}, 'another-client'), await token({}, 'test-client', '-1m'), 'unsigned.token.value']) {
    await assert.rejects(googleIdentity(value, 'requested-nonce', 'test-client', keys));
  }
});

test('provider origins and cron reject missing or malformed configuration', () => {
  const names = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AUTH_APP_ORIGIN', 'CRON_SECRET'];
  const saved = names.map(name => process.env[name]);
  try {
    process.env.GOOGLE_CLIENT_ID = 'fixture'; process.env.GOOGLE_CLIENT_SECRET = 'fixture';
    for (const origin of ['http://untrusted.example', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com?redirect=evil']) { process.env.AUTH_APP_ORIGIN = origin; assert.equal(googleConfig(), null); }
    process.env.AUTH_APP_ORIGIN = 'https://example.com'; assert.equal(googleConfig()?.redirectUri, 'https://example.com/api/auth/google/callback');
    delete process.env.GOOGLE_CLIENT_SECRET; assert.equal(googleConfig(), null);
    delete process.env.CRON_SECRET; assert.equal(authorizedCron('Bearer anything'), false);
    process.env.CRON_SECRET = 'a'.repeat(32); assert.equal(authorizedCron('Bearer ' + 'a'.repeat(32)), true);
    assert.equal(authorizedCron('Bearer ' + 'b'.repeat(32)), false); assert.equal(authorizedCron(null), false);
  } finally { names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; }); }
});

test('domain proof excludes IPs, credentials, local hosts and insecure sites', () => {
  for (const url of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://user:pass@example.com', 'https://example.com:444', 'https://foo.internal']) assert.equal(verificationDomain(url), null);
  assert.equal(verificationDomain('https://www.example.com/path'), 'www.example.com');
  assert.equal(validVerificationToken('a'.repeat(64)), true); assert.equal(validVerificationToken('a'.repeat(63)), false); assert.equal(validVerificationToken('g'.repeat(64)), false);
});

test('new mutations reject cross origin and metrics respect privacy signals before storage', async () => {
  for (const handler of [notifications, reports, metrics]) assert.equal((await handler(new NextRequest('https://example.com/api/test', { method: 'POST', headers: { origin: 'https://evil.example' } }))).status, 403);
  for (const header of ['dnt', 'sec-gpc']) assert.equal((await metrics(new NextRequest('https://example.com/api/metrics', { method: 'POST', headers: { origin: 'https://example.com', [header]: '1' } }))).status, 204);
});

test('navigation uses dedicated catalog pages and hides unimplemented destinations', () => {
  assert.equal(navigationHref('/explorar/nomina'), '/explorar/nomina');
  assert.equal(navigationHref('/leads'), '/account/opportunities');
  assert.equal(availableNavigation('/drops'), false); assert.equal(availableNavigation('/colecciones/test'), true);
  assert.equal(availableNavigation('/criterios'), true);
});

test('transactional mail retries use a stable provider key and never report provider rejection as success', async () => {
  const { sendEmail } = await import('../src/lib/notifications/server');
  const names = ['RESEND_API_KEY', 'AUTH_EMAIL_FROM', 'AUTH_APP_ORIGIN'];
  const saved = names.map(name => process.env[name]); const original = globalThis.fetch;
  try {
    process.env.RESEND_API_KEY = 'fixture-only'; process.env.AUTH_EMAIL_FROM = 'Fixture <test@example.invalid>'; process.env.AUTH_APP_ORIGIN = 'https://example.com';
    const requests: RequestInit[] = [];
    globalThis.fetch = async (_url, init) => { requests.push(init!); return new Response(JSON.stringify({ id: 'fixture-delivery' }), { status: 200 }); };
    assert.equal(await sendEmail('recipient@example.invalid', 'Aviso', 'Abre tu cuenta.', 'stable-event-id'), 'fixture-delivery');
    await sendEmail('recipient@example.invalid', 'Aviso', 'Abre tu cuenta.', 'stable-event-id');
    assert.equal(new Headers(requests[0].headers).get('Idempotency-Key'), new Headers(requests[1].headers).get('Idempotency-Key'));
    assert.deepEqual(JSON.parse(String(requests[0].body)).to, ['recipient@example.invalid']);
    globalThis.fetch = async () => new Response('', { status: 429 });
    await assert.rejects(sendEmail('recipient@example.invalid', 'Aviso', 'Texto', 'stable-event-id'));
    delete process.env.RESEND_API_KEY;
    await assert.rejects(sendEmail('recipient@example.invalid', 'Aviso', 'Texto'));
  } finally { globalThis.fetch = original; names.forEach((name,i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; }); }
});
