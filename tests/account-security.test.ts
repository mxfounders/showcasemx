import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { base32Decode, base32Encode, currentStep, generateBackupCodes, generateTotp, generateTotpSecret, otpauthUri, verifyTotp } from '../src/lib/auth/totp';
import { deviceLabel } from '../src/lib/auth/session';
import { POST as totpPost } from '../src/app/api/account/totp/route';
import { POST as sessionsPost } from '../src/app/api/account/sessions/route';
import { POST as deletePost } from '../src/app/api/account/delete/route';

test('base32 round-trips the bytes an authenticator secret is made of', () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.equal(base32Encode(base32Decode(secret)), secret);
});

test('a TOTP code verifies inside the drift window and never replays a used step', () => {
  const secret = generateTotpSecret();
  const step = currentStep();
  const code = generateTotp(secret, step);
  // Accepted when nothing has been used yet.
  assert.equal(verifyTotp(secret, code, null), step);
  // The very same step is refused once it is recorded, so a shoulder-surfed code
  // cannot be reused inside its own 30-second window.
  assert.equal(verifyTotp(secret, code, step), null);
  // A code from a neighbouring step still passes: clocks drift.
  const previous = step - BigInt(1);
  assert.equal(verifyTotp(secret, generateTotp(secret, previous), null), previous);
  // Three steps away is outside the window.
  assert.equal(verifyTotp(secret, generateTotp(secret, step - BigInt(3)), null), null);
  // Anything that is not six digits is rejected without touching the secret.
  assert.equal(verifyTotp(secret, '12345', null), null);
  assert.equal(verifyTotp(secret, 'abcdef', null), null);
});

test('backup codes are eight digits and distinct enough to be listed', () => {
  const codes = generateBackupCodes(10);
  assert.equal(codes.length, 10);
  for (const code of codes) assert.match(code, /^\d{8}$/);
  assert.equal(new Set(codes).size, 10);
});

test('the otpauth URI carries the issuer and the account it belongs to', () => {
  const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'persona@example.invalid');
  assert.ok(uri.startsWith('otpauth://totp/'));
  assert.ok(uri.includes('secret=JBSWY3DPEHPK3PXP'));
  assert.ok(uri.includes('issuer=shwcs'));
  assert.ok(decodeURIComponent(uri).includes('persona@example.invalid'));
});

test('a device label stays coarse and never echoes the raw user agent', () => {
  assert.equal(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'), 'Chrome en macOS');
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'), 'Safari en iOS');
  assert.equal(deviceLabel(null), 'Dispositivo desconocido');
  assert.ok(!deviceLabel('Mozilla/5.0 (Windows NT 10.0) Firefox/121.0').includes('Mozilla'));
});

const foreign = (path: string, body: unknown) => new NextRequest(`https://shwcs.example${path}`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify(body) });
const anonymous = (path: string, body: unknown) => new NextRequest(`https://shwcs.example${path}`, { method: 'POST', headers: { origin: 'https://shwcs.example', 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('account security mutations reject foreign origins and anonymous callers before storage', async () => {
  for (const [handler, path, body] of [
    [totpPost, '/api/account/totp', { action: 'start', password: 'x' }],
    [sessionsPost, '/api/account/sessions', { action: 'revoke-others' }],
    [deletePost, '/api/account/delete', { password: 'x', confirm: 'ELIMINAR' }],
  ] as const) {
    assert.equal((await handler(foreign(path, body))).status, 403, `${path} debe rechazar otro origen`);
    assert.equal((await handler(anonymous(path, body))).status, 401, `${path} debe exigir sesión`);
  }
});
