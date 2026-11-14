import assert from 'node:assert/strict';
import test from 'node:test';
import { domainExpiringTitle, txtMatches } from '../src/lib/trust/renewal';

test('a TXT proof renews only with the exact published record (SHCWS-134)', () => {
  assert.equal(txtMatches([['showcasemx-verification=abc']], 'abc'), true);
  // DNS may split a long record into chunks; they are joined like the manual check does.
  assert.equal(txtMatches([['showcasemx-verification=', 'abc']], 'abc'), true);
  assert.equal(txtMatches([['showcasemx-verification=abcd']], 'abc'), false);
  assert.equal(txtMatches([], 'abc'), false);
});

test('the expiry notice names the listing and the day, in Mexico City time', () => {
  assert.equal(
    domainExpiringTitle('Cord', new Date('2026-11-28T03:00:00Z')),
    'La verificación del dominio de Cord vence el 27 de noviembre',
  );
  assert.ok(domainExpiringTitle('x'.repeat(300), new Date()).length <= 180);
});
