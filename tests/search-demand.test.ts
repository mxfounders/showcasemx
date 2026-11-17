import assert from 'node:assert/strict';
import test from 'node:test';
import { demandQuery } from '../src/lib/search/demand';

test('search demand keeps normalized words and drops anything personal', () => {
  assert.equal(demandQuery('  Nómina para RETAIL '), 'nomina para retail');
  assert.equal(demandQuery('nomina para retail'), 'nomina para retail');
  assert.equal(demandQuery('a'), null);
  assert.equal(demandQuery(''), null);
  assert.equal(demandQuery(42), null);
  assert.equal(demandQuery('ana@empresa.com'), null);
  assert.equal(demandQuery('www.cordhq.app'), null);
  assert.equal(demandQuery('https://algo.mx/x'), null);
  assert.equal(demandQuery('cobranza empresa.com'), null);
  assert.equal(demandQuery('llamar 55 1234 5678'), null);
  assert.equal(demandQuery('rfc ABC123456XYZ'), null);
  assert.equal(demandQuery('software 2026'), 'software 2026');
  assert.equal(demandQuery('x'.repeat(201)), null);
  assert.ok((demandQuery('palabra '.repeat(20)) ?? '').length <= 80);
});
