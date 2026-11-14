import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  isSolutionSlug,
  solutionPath,
  solutionSlugBase,
  solutionSlugCandidates,
} from '../src/lib/solutions/slug';
import {
  buildSlugSnapshot,
  primeListingSlugs,
  routeListing,
} from '../src/lib/solutions/slug-routing';
import * as ops from '../ops/src/lib/slug';
import { middleware } from '../src/middleware';

const cordId = '3f2b8c1e-5d4a-4f6b-9c7e-2a1d0b9e8f7a';
const atlasId = '8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const names = [
  'Cord',
  'Flouvia',
  'Cómo Cobrar Más — S.A. de C.V.',
  'ÁRBOL Ñandú',
  'Straße & Œuvre',
  'Ærø Łódź Đakovo',
  '  --Hola--  ',
  '日本語',
  '',
  'Ventas & Cobros 2.0',
  'Opengraph Image',
  cordId,
  'A'.repeat(70),
  'Una solución con un nombre larguísimo que pasa de sesenta caracteres de verdad',
];

test('a listing slug comes from its name: no accents, lowercase, hyphens, 60 characters', () => {
  assert.equal(solutionSlugBase('Cord'), 'cord');
  assert.equal(solutionSlugBase('Cómo Cobrar Más — S.A. de C.V.'), 'como-cobrar-mas-s-a-de-c-v');
  assert.equal(solutionSlugBase('ÁRBOL Ñandú'), 'arbol-nandu');
  assert.equal(solutionSlugBase('Straße & Œuvre'), 'strasse-oeuvre');
  assert.equal(solutionSlugBase('Ærø Łódź Đakovo'), 'aero-lodz-dakovo');
  assert.equal(solutionSlugBase('  --Hola--  '), 'hola');
  assert.equal(solutionSlugBase('Ventas & Cobros 2.0'), 'ventas-cobros-2-0');
  // Nothing usable: a neutral word, never an empty path.
  assert.equal(solutionSlugBase('日本語'), 'solucion');
  assert.equal(solutionSlugBase(''), 'solucion');
  // Never the share-image path Next serves under a page, never something like a UUID.
  assert.equal(solutionSlugBase('Opengraph Image'), 'solucion-opengraph-image');
  assert.equal(solutionSlugBase(cordId), `solucion-${cordId}`);
  const long = solutionSlugBase(
    'Una solución con un nombre larguísimo que pasa de sesenta caracteres de verdad',
  );
  assert.equal(long, 'una-solucion-con-un-nombre-larguisimo-que-pasa-de-sesenta-ca');
  assert.ok(long.length <= 60);
  for (const name of names) assert.ok(isSolutionSlug(solutionSlugBase(name)), name);
});

test('only well-formed slugs pass; UUIDs and file-like or reserved paths never do', () => {
  for (const slug of ['cord', 'cord-hq', 'a', 'x1', '2024', 'a'.repeat(60)])
    assert.equal(isSolutionSlug(slug), true, slug);
  for (const slug of [
    '',
    'Cord',
    'cord_hq',
    'cord--hq',
    '-cord',
    'cord-',
    'cord.md',
    'córd',
    'a'.repeat(61),
    cordId,
    cordId.toUpperCase(),
    'opengraph-image',
    'twitter-image-1a2b',
    undefined,
    42,
  ])
    assert.equal(isSolutionSlug(slug), false, String(slug));
});

test('candidates add -2, -3… and stay within 60 characters', () => {
  assert.deepEqual(solutionSlugCandidates('Cord', 3), ['cord', 'cord-2', 'cord-3']);
  const long = solutionSlugCandidates('A'.repeat(70), 12);
  assert.equal(long[0], 'a'.repeat(60));
  assert.equal(long[1], `${'a'.repeat(58)}-2`);
  assert.equal(long[11], `${'a'.repeat(57)}-12`);
  // A cut that would end in a hyphen does not leave a double one before the suffix.
  const words = solutionSlugCandidates(`${'a'.repeat(57)} bc`, 2)[1];
  assert.equal(words, `${'a'.repeat(57)}-2`);
  for (const slug of [...long, words]) assert.ok(isSolutionSlug(slug), slug);
});

test('ops derives and validates slugs exactly like the product', () => {
  for (const name of names) {
    assert.equal(ops.solutionSlugBase(name), solutionSlugBase(name), name);
    assert.deepEqual(ops.solutionSlugCandidates(name, 5), solutionSlugCandidates(name, 5), name);
  }
  for (const value of ['cord', 'cord--hq', cordId, 'opengraph-image', 'a'.repeat(61)])
    assert.equal(ops.isSolutionSlug(value), isSolutionSlug(value), value);
  // What an admin types: spaces and capitals are forgiven, anything else is refused.
  assert.deepEqual(ops.checkSlugInput('  Cord HQ '), { ok: true, slug: 'cord-hq' });
  assert.deepEqual(ops.checkSlugInput('córd'), { ok: false, error: 'shape' });
  assert.deepEqual(ops.checkSlugInput(cordId), { ok: false, error: 'shape' });
  assert.deepEqual(ops.checkSlugInput(''), { ok: false, error: 'empty' });
});

test('the public path is the slug when there is one, else the UUID', () => {
  assert.equal(solutionPath({ id: cordId, slug: 'cord' }), '/soluciones/cord');
  assert.equal(solutionPath({ id: cordId, slug: null }), `/soluciones/${cordId}`);
  assert.equal(solutionPath({ id: cordId }), `/soluciones/${cordId}`);
  // Anything that is not a slug never reaches a link.
  assert.equal(solutionPath({ id: cordId, slug: 'Not A Slug' }), `/soluciones/${cordId}`);
});

const rows = [
  { slug: 'cord', id: cordId, retired: null },
  { slug: 'atlas-cobranza', id: atlasId, retired: null },
  // Atlas was called «Atlas» before; that link keeps working.
  { slug: 'atlas-cobranza', id: atlasId, retired: 'atlas' },
];

test('routing: UUIDs and old slugs redirect, current slugs render, unknown slugs are missing', () => {
  const snapshot = buildSlugSnapshot(rows);
  assert.deepEqual(routeListing(cordId, snapshot), { kind: 'redirect', slug: 'cord' });
  assert.deepEqual(routeListing(cordId.toUpperCase(), snapshot), {
    kind: 'redirect',
    slug: 'cord',
  });
  assert.deepEqual(routeListing('atlas', snapshot), { kind: 'redirect', slug: 'atlas-cobranza' });
  assert.deepEqual(routeListing('cord', snapshot), { kind: 'page' });
  assert.deepEqual(routeListing('no-existe', snapshot), { kind: 'missing' });
  // A UUID the snapshot does not know (no slug, unpublished…) is left to the page.
  assert.deepEqual(routeListing('11111111-2222-4333-8444-555555555555', snapshot), {
    kind: 'page',
  });
});

const request = (path: string, language = 'es') =>
  new NextRequest(`http://localhost:3000${path}`, { headers: { 'accept-language': language } });

test('middleware: an old listing URL answers 301 to its slug, keeping locale and query', async () => {
  primeListingSlugs(rows);
  const byId = await middleware(request(`/en/soluciones/${cordId}?from=sponsored&ad=x`));
  assert.equal(byId.status, 301);
  assert.equal(
    byId.headers.get('location'),
    'http://localhost:3000/en/soluciones/cord?from=sponsored&ad=x',
  );
  const oldSlug = await middleware(request('/es/soluciones/atlas'));
  assert.equal(oldSlug.status, 301);
  assert.equal(
    oldSlug.headers.get('location'),
    'http://localhost:3000/es/soluciones/atlas-cobranza',
  );
  // A client navigation keeps its transport form; the share image follows its page.
  const rsc = await middleware(request(`/es/soluciones/${cordId}.rsc`));
  assert.equal(rsc.headers.get('location'), 'http://localhost:3000/es/soluciones/cord.rsc');
  const image = await middleware(request(`/es/soluciones/${cordId}/opengraph-image-1a2b3c`));
  assert.equal(
    image.headers.get('location'),
    'http://localhost:3000/es/soluciones/cord/opengraph-image-1a2b3c',
  );
  // Without a locale: straight to the slug in one hop; the locale part stays temporary.
  const bare = await middleware(request(`/soluciones/${cordId}`, 'en'));
  assert.equal(bare.status, 307);
  assert.equal(bare.headers.get('location'), 'http://localhost:3000/en/soluciones/cord');
});

test('middleware: a current slug renders and an unknown one is a real 404', async () => {
  primeListingSlugs(rows);
  const page = await middleware(request('/es/soluciones/cord'));
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('x-middleware-request-x-locale'), 'es');
  const missing = await middleware(request('/en/soluciones/no-existe'));
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Page not found/);
  assert.equal((await middleware(request('/soluciones/no-existe'))).status, 404);
});
