import assert from 'node:assert/strict';
import test from 'node:test';
import { rankCollections, type CollectionSearchFields } from '../src/lib/library/community-model';

const lists: (CollectionSearchFields & { id: string })[] = [
  {
    id: 'cobros',
    name: 'Para cobrar a tiempo',
    publicDescription: 'Lo que usamos para que nos paguen.',
    curator: 'Ana',
    categories: ['Cobros'],
    projectNames: ['Recordatorio'],
  },
  {
    id: 'ventas',
    name: 'Mi stack comercial',
    publicDescription: '',
    curator: 'Luis',
    categories: ['Ventas'],
    projectNames: ['Cord'],
  },
  {
    id: 'legal',
    name: 'Contratos sin papel',
    publicDescription: 'Firma electrónica.',
    curator: 'Eva',
    categories: ['Legal'],
    projectNames: ['Firmamos'],
  },
];
const ids = (query: string) => rankCollections(query, lists, list => list).map(list => list.id);

test('Comunidad search uses the catalog scorer: vocabulary, plurals and project names', () => {
  // «cobranza» never appears in the list, but its category implies it (SHCWS-118).
  assert.deepEqual(ids('cobranza'), ['cobros']);
  assert.deepEqual(ids('cotizaciones de mayoreo'), ['ventas']);
  assert.deepEqual(ids('contrato'), ['legal']);
  // A project inside the list and the signature count too.
  assert.deepEqual(ids('cord'), ['ventas']);
  assert.deepEqual(ids('eva'), ['legal']);
  assert.deepEqual(ids('inexistente'), []);
  // No usable words: the incoming order is kept untouched.
  assert.deepEqual(ids('  '), ['cobros', 'ventas', 'legal']);
});
