import assert from 'node:assert/strict';
import test from 'node:test';
import { searchCatalog } from '../src/lib/catalog-search';

test('Spanish intent, accents and deduplication', () => {
  assert.deepEqual(
    searchCatalog('quiero cobrar a tiempo').map(p => p.name),
    ['Cord'],
  );
  assert.deepEqual(
    searchCatalog('Necesito una tienda online').map(p => p.name),
    ['Flouvia'],
  );
  assert.deepEqual(
    searchCatalog('AUTOMATIZACIÓN').map(p => p.name),
    ['Flouvia'],
  );
  assert.equal(searchCatalog('Flouvia').length, 2); // provider and offering both relevant
  assert.equal(searchCatalog('nómina').length, 0);
  assert.equal(searchCatalog('quiero una solución').length, 0);
  assert.equal(searchCatalog('inexistente').length, 0);
});
