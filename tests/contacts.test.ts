import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  readContact,
  canTransition,
  contactStatuses,
  contactCompanySizes,
  contactSizeLabel,
  sizeFit,
  timelines,
  consentVersion,
  isBuyerEmailVerified,
  buyerSignal,
  readOutcome,
  needPreview,
  contactOutcomes,
  outcomeValues,
} from '../src/lib/contacts/model';
import { comparisonKeys } from '../src/lib/library/model';
import { authReturnTo } from '../src/lib/auth/return-to';
import { POST } from '../src/app/api/contacts/route';
const details = {
  name: 'Ana Pérez',
  company: 'Ejemplo SA',
  size: contactCompanySizes[1],
  timeline: timelines[0],
  budget: '',
  need: 'Necesitamos ordenar la cobranza de nuestra empresa.',
};
test('contact context is bounded and cannot overwrite identity or routing', () => {
  assert.deepEqual(
    readContact({
      ...details,
      buyer_email: 'forged@example.com',
      recipient_id: 'other',
      status: 'closed',
    }),
    details,
  );
  for (const patch of [
    { name: ' ' },
    { company: '' },
    { size: 'fake' },
    { timeline: 'fake' },
    { need: 'corto' },
    { need: 'x'.repeat(2001) },
    { budget: 'x'.repeat(201) },
    { name: 42 },
  ])
    assert.equal(readContact({ ...details, ...patch }), null);
  assert.equal(consentVersion, 'contact-v1');
});
test('a request shows a verified email only when that same address is verified', () => {
  const sent = 'Ana@Ejemplo.com';
  const at = '2026-11-01 10:00:00+00';
  assert.equal(
    isBuyerEmailVerified({
      buyer_email: sent,
      buyer_account_email: 'ana@ejemplo.com',
      buyer_email_verified_at: at,
    }),
    true,
  );
  assert.equal(
    isBuyerEmailVerified({
      buyer_email: sent,
      buyer_account_email: 'ana@ejemplo.com',
      buyer_email_verified_at: null,
    }),
    false,
  );
  // The account verified a different address than the one the founder sees.
  assert.equal(
    isBuyerEmailVerified({
      buyer_email: sent,
      buyer_account_email: 'otra@ejemplo.com',
      buyer_email_verified_at: at,
    }),
    false,
  );
  // The buyer account no longer exists.
  assert.equal(
    isBuyerEmailVerified({
      buyer_email: sent,
      buyer_account_email: null,
      buyer_email_verified_at: null,
    }),
    false,
  );
});
test('contact size uses the listing scale; old requests keep their label', async () => {
  const { getDictionary } = await import('../src/i18n/get-dictionary');
  const legacy = (await getDictionary('es')).contacts.teamSizes;
  assert.equal(readContact({ ...details, size: '2–10 personas' }), null, 'old scale refused');
  assert.equal(contactSizeLabel('pyme', 'es', legacy), 'PyME (11–100 personas)');
  assert.equal(contactSizeLabel('51–200 personas', 'es', legacy), '51–200 personas');
  assert.equal(sizeFit('pyme', ['pyme', 'mediana']), 'declared');
  assert.equal(sizeFit('pyme', []), 'any');
  assert.equal(sizeFit('pyme', ['corporativo']), 'other');
  assert.equal(sizeFit('pyme', undefined), 'unknown');
  assert.equal(sizeFit('51–200 personas', ['pyme']), 'unknown');
});
test('contact transitions distinguish buyers and recipients and make withdrawal terminal', () => {
  for (const current of contactStatuses) {
    assert.equal(canTransition(current, 'conversation', 'buyer'), false);
    assert.equal(canTransition(current, 'closed', 'buyer'), false);
    assert.equal(canTransition(current, 'withdrawn', 'recipient'), false);
    assert.equal(canTransition('withdrawn', current, 'buyer'), false);
    assert.equal(canTransition('withdrawn', current, 'recipient'), false);
  }
  assert.equal(canTransition('new', 'withdrawn', 'buyer'), true);
  assert.equal(canTransition('conversation', 'withdrawn', 'buyer'), true);
  assert.equal(canTransition('closed', 'withdrawn', 'buyer'), false);
  assert.equal(canTransition('new', 'conversation', 'recipient'), true);
  assert.equal(canTransition('new', 'closed', 'recipient'), true);
  assert.equal(canTransition('closed', 'conversation', 'recipient'), true);
});
test('comparison selection is limited, unique and constrained to the private list', () => {
  const keys = ['catalog:cord', 'catalog:flouvia'];
  assert.deepEqual(comparisonKeys(keys, keys), keys);
  for (const value of [
    keys[0],
    [],
    [keys[0]],
    [keys[0], keys[0]],
    [...keys, keys[0], keys[1]],
    ['catalog:cord', 'catalog:fake'],
  ])
    assert.equal(comparisonKeys(value, keys), null);
  assert.equal(comparisonKeys(keys, ['catalog:cord']), null);
});
test('contact auth returns only to allowed local request routes', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal(
    authReturnTo('/account/contacts/new?solution=' + id),
    '/account/contacts/new?solution=' + id,
  );
  assert.equal(authReturnTo('/account/contacts/' + id), '/account/contacts/' + id);
  for (const value of [
    '/account/contacts/new?solution=../x',
    '//evil.test/account/contacts',
    '/account/contacts/../settings',
    '/account/opportunities?redirect=https://evil.test',
  ])
    assert.equal(authReturnTo(value), '/account');
});
test('contact mutation rejects cross-origin and absent sessions', async () => {
  const url = 'http://localhost:3000/api/contacts';
  for (const [origin, status] of [
    ['https://evil.test', 403],
    ['http://localhost:3000', 401],
  ] as const) {
    const r = new NextRequest(url, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal((await POST(r)).status, status);
  }
});
test('the buyer signal uses the review levels: unverified, verified, company address', () => {
  const at = '2026-11-01 10:00:00+00';
  const request = (email: string, verified: string | null) => ({
    buyer_email: email,
    buyer_account_email: email.toLowerCase(),
    buyer_email_verified_at: verified,
  });
  assert.equal(buyerSignal(request('ana@acme.mx', null)), 'unverified');
  assert.equal(buyerSignal(request('Ana@Gmail.com', at)), 'email');
  assert.equal(buyerSignal(request('ana@hotmail.es', at)), 'email');
  assert.equal(buyerSignal(request('ana@acme.mx', at)), 'work');
  // A company domain never upgrades an address the account has not verified.
  assert.equal(
    buyerSignal({ ...request('ana@acme.mx', at), buyer_account_email: 'otra@acme.mx' }),
    'unverified',
  );
});
test('an outcome is one of three; a value range only for a won deal', () => {
  assert.deepEqual(readOutcome('won', '5k_25k'), { outcome: 'won', value: '5k_25k' });
  assert.deepEqual(readOutcome('won', undefined), { outcome: 'won', value: null });
  assert.deepEqual(readOutcome('won', ''), { outcome: 'won', value: null });
  assert.deepEqual(readOutcome('lost', null), { outcome: 'lost', value: null });
  assert.deepEqual(readOutcome('not_fit', undefined), { outcome: 'not_fit', value: null });
  assert.equal(readOutcome('lost', '1k_5k'), null, 'a lost deal carries no value');
  assert.equal(readOutcome('won', '1000000'), null, 'only the fixed ranges');
  assert.equal(readOutcome('closed', undefined), null);
  assert.equal(readOutcome(undefined, undefined), null);
  for (const value of outcomeValues)
    assert.deepEqual(readOutcome('won', value), { outcome: 'won', value });
  assert.deepEqual([...contactOutcomes], ['won', 'lost', 'not_fit']);
});
test('a need preview collapses whitespace and cuts at a word', () => {
  assert.equal(needPreview('  Ordenar\n\nla   cobranza  '), 'Ordenar la cobranza');
  const long = 'palabra '.repeat(60);
  const preview = needPreview(long, 50);
  assert.ok(preview.length <= 51 && preview.endsWith('…'));
  assert.ok(!preview.includes('  ') && !/\s…$/.test(preview));
  assert.equal(needPreview('x'.repeat(200), 50), 'x'.repeat(50) + '…');
});
test('reading or recording an outcome also requires the same origin and a session', async () => {
  const url = 'http://localhost:3000/api/contacts';
  const id = '6f1c2a40-1b2c-4d3e-8f40-5a6b7c8d9e0f';
  for (const body of [
    { action: 'read', id },
    { action: 'outcome', id, version: 1, outcome: 'won' },
  ])
    for (const [origin, status] of [
      ['https://evil.test', 403],
      ['http://localhost:3000', 401],
    ] as const) {
      const r = new NextRequest(url, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal((await POST(r)).status, status);
    }
});
