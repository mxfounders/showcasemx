import assert from 'node:assert/strict';
import test from 'node:test';
import { CURATOR_MAX, checkCuratorName, reservedCurator } from '../ops/src/lib/community';
import { reservedCurator as productReservedCurator } from '../src/lib/library/model';

test('ops curator rename keeps the product limits and never signs as shwcs', () => {
  assert.deepEqual(checkCuratorName('  Equipo   de compras '), {
    ok: true,
    name: 'Equipo de compras',
  });
  assert.deepEqual(checkCuratorName(''), { ok: false, error: 'empty' });
  assert.deepEqual(checkCuratorName('   '), { ok: false, error: 'empty' });
  assert.deepEqual(checkCuratorName(42), { ok: false, error: 'empty' });
  assert.deepEqual(checkCuratorName('x'.repeat(CURATOR_MAX + 1)), {
    ok: false,
    error: 'too_long',
  });
  assert.equal(checkCuratorName('x'.repeat(CURATOR_MAX)).ok, true);
  assert.deepEqual(checkCuratorName('Equipo SHWCS'), { ok: false, error: 'reserved' });
  assert.deepEqual(checkCuratorName('ѕһwсѕ editorial'), { ok: false, error: 'reserved' });
});

test('ops reservedCurator stays in step with the product copy', () => {
  for (const name of [
    'shwcs',
    's.h.w.c.s',
    'Showcase MX',
    'ѕһwсѕ',
    'Ana López',
    'Compras Acme',
    '',
    'show case',
  ])
    assert.equal(reservedCurator(name), productReservedCurator(name), name);
});
