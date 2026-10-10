import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { validateAccount } from '../src/lib/account';
import { credentialErrors } from '../src/lib/auth/validation';
import { auth as es } from '../src/i18n/dictionaries/es/auth';
import { auth as en } from '../src/i18n/dictionaries/en/auth';
import { PATCH } from '../src/app/api/account/route';
test('account validates segmentation and bounds without accepting identity fields', () => {
  const value = {
    name: ' Test ',
    organization: ' Demo ',
    profile: 'buyer',
    role: 'operations',
    id: 'other-account',
    email: 'other@example.com',
  };
  assert.deepEqual(validateAccount(value), {
    name: 'Test',
    organization: 'Demo',
    profile: 'buyer',
    role: 'operations',
  });
  for (const patch of [
    { name: '' },
    { name: 'a'.repeat(101) },
    { organization: 'a'.repeat(121) },
    { profile: 'admin' },
    { role: 'invalid' },
  ])
    assert.equal(validateAccount({ ...value, ...patch }), null);
});
test('inline credential feedback is specific and accepts long passwords', () => {
  assert.equal(credentialErrors('bad', '12345').email, 'emailInvalid');
  assert.equal(credentialErrors('', 'x').email, 'emailMissing');
  assert.equal(credentialErrors('x@example.com', '12345').password, 'passwordShort');
  assert.equal(credentialErrors('x@example.com', '').password, 'passwordMissing');
  assert.equal(credentialErrors('x@example.com', 'a'.repeat(4097)).password, 'passwordLong');
  assert.deepEqual(credentialErrors('x@example.com', '123456'), {});
  assert.deepEqual(credentialErrors('x@example.com', 'a'.repeat(500)), {});
});
test('every credential error code has a message in each language', () => {
  for (const messages of [es.credentialErrors, en.credentialErrors]) {
    const codes = [
      credentialErrors('', '').email,
      credentialErrors('bad', '12345').email,
      credentialErrors('', '').password,
      credentialErrors('x@example.com', '12345').password,
      credentialErrors('x@example.com', 'a'.repeat(4097)).password,
    ];
    for (const code of codes) assert.ok(code && messages[code].length > 0);
  }
  assert.match(es.credentialErrors.passwordShort, /6 caracteres/);
  assert.match(en.credentialErrors.passwordShort, /6 characters/);
});
test('profile mutation requires same origin and an authenticated session', async () => {
  const req = (origin: string) =>
    new NextRequest('http://localhost:3000/api/account', {
      method: 'PATCH',
      headers: { origin, 'content-type': 'application/json' },
      body: '{}',
    });
  assert.equal((await PATCH(req('https://other.example'))).status, 403);
  assert.equal((await PATCH(req('http://localhost:3000'))).status, 401);
});
