import assert from 'node:assert/strict';
import test from 'node:test';
import { searchCatalog } from '../src/lib/catalog-search';
import { validateApplication } from '../src/lib/applications';

test('Spanish intent, accents and deduplication', () => {
  assert.deepEqual(searchCatalog('quiero cobrar a tiempo').map(p => p.name), ['Cord']);
  assert.deepEqual(searchCatalog('Necesito una tienda online').map(p => p.name), ['Flouvia']);
  assert.deepEqual(searchCatalog('AUTOMATIZACIÓN').map(p => p.name), ['Flouvia']);
  assert.equal(searchCatalog('Flouvia').length, 2); // provider and offering both relevant
  assert.equal(searchCatalog('nómina').length, 0);
  assert.equal(searchCatalog('quiero una solución').length, 0);
  assert.equal(searchCatalog('inexistente').length, 0);
});
const valid = { name: 'Ejemplo', website: 'https://example.com', email: 'test@example.com', kind: 'Agencia', problem: 'Ayudamos a equipos a organizar su operación.' };
test('applications accept known offerings and normalize URL', () => {
  assert.equal(validateApplication(valid)?.website, 'https://example.com/');
  for (const kind of ['Software', 'Agencia', 'Servicio']) assert.ok(validateApplication({ ...valid, kind }));
});
test('applications reject malformed and oversized input', () => {
  for (const patch of [{ website: 'javascript:alert(1)' }, { website: 'https://user:pass@example.com' }, { email: 'bad' }, { kind: 'Other' }, { problem: 'short' }, { name: 'a'.repeat(101) }, { name: 42 }]) assert.equal(validateApplication({ ...valid, ...patch }), null);
  assert.equal(validateApplication(null), null);
});
