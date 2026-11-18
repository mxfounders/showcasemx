import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  comparisonHref,
  declaredMatrix,
  maxCompared,
  minCompared,
  publishedSelection,
  selectionKeys,
} from '../src/lib/library/comparison';
import { comparisonKeys } from '../src/lib/library/model';
import { authReturnTo } from '../src/lib/auth/return-to';
import { readBatch } from '../src/lib/contacts/batch';
import { consentVersion, contactCompanySizes, timelines } from '../src/lib/contacts/model';
import { isPagePath } from '../src/lib/routes';
import { POST as libraryPost } from '../src/app/api/library/route';

const a = 'solution:6f1c2a40-1b2c-4d3e-8f40-000000000001';
const b = 'solution:6f1c2a40-1b2c-4d3e-8f40-000000000002';
const c = 'solution:6f1c2a40-1b2c-4d3e-8f40-000000000003';
const d = 'solution:6f1c2a40-1b2c-4d3e-8f40-000000000004';

test('a temporary comparison is 2–3 distinct listings named by their library key', () => {
  assert.equal(minCompared, 2);
  assert.equal(maxCompared, 3);
  assert.deepEqual(selectionKeys([a, b]), [a, b]);
  assert.deepEqual(selectionKeys([c, a, b]), [c, a, b]);
  assert.deepEqual(selectionKeys(['catalog:cord', a]), ['catalog:cord', a]);
  for (const bad of [
    undefined,
    a,
    [a],
    [a, b, c, d],
    [a, a],
    [a, b, a],
    [a, 'cord'],
    [a, '/soluciones/cord'],
    // Static examples never get compared, saved or contacted.
    [a, 'catalog:ejemplo'],
    [a, 'solution:not-a-uuid'],
    [a, 7],
  ])
    assert.equal(selectionKeys(bad), null, JSON.stringify(bad));
});

test('only listings published right now can be compared; the server decides which', () => {
  assert.deepEqual(publishedSelection([a, b], [a, b, c]), [a, b]);
  // One of them is a draft or was withdrawn: the whole selection is refused.
  assert.equal(publishedSelection([a, b], [a]), null);
  assert.equal(publishedSelection([a, b], []), null);
  // A list comparison keeps its own rule: members of the buyer's list only (§8).
  assert.deepEqual(comparisonKeys([a, b], [a, b, c]), [a, b]);
  assert.equal(comparisonKeys([a, d], [a, b, c]), null);
  assert.equal(
    comparisonHref([a, b]),
    `/comparar?project=${encodeURIComponent(a)}&project=${encodeURIComponent(b)}`,
  );
  assert.ok(isPagePath(['comparar']));
  assert.ok(!isPagePath(['comparar', 'x']));
});

test('declared values line up side by side without inventing an answer', () => {
  const rows = declaredMatrix([['cotizaciones', 'crm'], ['crm'], undefined]);
  assert.deepEqual(rows, [
    { value: 'cotizaciones', cells: ['yes', 'no', 'unknown'] },
    { value: 'crm', cells: ['yes', 'yes', 'unknown'] },
  ]);
  // [] answers «connects to nothing», distinct from never answering.
  assert.deepEqual(declaredMatrix([['slack'], [], undefined])[0].cells, ['yes', 'none', 'unknown']);
  assert.deepEqual(declaredMatrix([undefined, undefined]), []);
});

test('signing in returns to the comparison or its proposal, with nothing else in the query', () => {
  const query = `project=${encodeURIComponent(a)}&project=${encodeURIComponent(b)}`;
  assert.equal(authReturnTo(`/comparar?${query}`), `/comparar?${query}`);
  assert.equal(
    authReturnTo(`/account/contacts/proposal?${query}&next=https://evil.example`),
    `/account/contacts/proposal?${query}`,
  );
  assert.equal(authReturnTo(`/comparar?project=${encodeURIComponent(a)}`), '/account');
  assert.equal(authReturnTo('/comparar?project=x&project=y'), '/account');
  assert.equal(authReturnTo('https://evil.example/comparar?project=a'), '/account');
});

test('a proposal from a temporary comparison needs no list; a list id must still be valid', () => {
  const uuid = (n: number) => `6f1c2a40-1b2c-4d3e-8f40-${String(n).padStart(12, '0')}`;
  const body = (patch: Record<string, unknown>) => ({
    name: 'Ana Pérez',
    company: 'Ejemplo SA',
    size: contactCompanySizes[1],
    timeline: timelines[0],
    budget: '',
    need: 'Necesitamos ordenar la cobranza de nuestra empresa.',
    id: uuid(1),
    consentVersion,
    recipients: [
      { id: uuid(101), solutionId: uuid(201), recipientId: uuid(301), consent: true },
      { id: uuid(102), solutionId: uuid(202), recipientId: uuid(302), consent: true },
    ],
    ...patch,
  });
  assert.equal(readBatch(body({}))?.listId, null);
  assert.equal(readBatch(body({ listId: null }))?.listId, null);
  assert.equal(readBatch(body({ listId: uuid(2) }))?.listId, uuid(2));
  assert.equal(readBatch(body({ listId: 'not-a-uuid' })), null);
  assert.equal(readBatch(body({ listId: 7 })), null);
});

test('saving a comparison as a list needs the same origin and a session', async () => {
  const request = (origin: string) =>
    new NextRequest('http://localhost:3000/api/library', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({
        action: 'save-comparison',
        id: '6f1c2a40-1b2c-4d3e-8f40-000000000009',
        name: 'Comparación',
        projectKeys: [a, b],
      }),
    });
  assert.equal((await libraryPost(request('https://evil.example'))).status, 403);
  assert.equal((await libraryPost(request('http://localhost:3000'))).status, 401);
});
