import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  listPublicationDetails,
  minPublicListProjects,
  reservedCurator,
} from '../src/lib/library/model';
import {
  communityComment,
  communityRank,
  communityScore,
  communityReport,
  escapeLikeTerm,
} from '../src/lib/library/community-model';
import { POST as communityPost } from '../src/app/api/community/route';
import { communityHref, readCommunityFilters, toggleAxis } from '../src/lib/library/community-url';
test('publication is opt-in; legacy inputs and private metadata never become public copy', () => {
  assert.deepEqual(
    listPublicationDetails({ purpose: 'Confidential budget', note: 'Private note' }),
    { visibility: 'private', categories: [], publicDescription: '', curatorName: '' },
  );
  const valid = {
    visibility: 'public',
    categories: ['Finanzas', 'Finanzas', 'Cobros'],
    publicDescription: ' Para equipos ',
    curatorName: ' Alias ',
    publishConfirmed: true,
  };
  assert.deepEqual(listPublicationDetails(valid), {
    visibility: 'public',
    categories: ['Finanzas', 'Cobros'],
    publicDescription: 'Para equipos',
    curatorName: 'Alias',
  });
  for (const override of [
    { publishConfirmed: false },
    { publishConfirmed: 'true' },
    { categories: [] },
    { categories: ['Unknown'] },
    { categories: 'Finanzas' },
    { curatorName: ' ' },
    { curatorName: 'a'.repeat(61) },
    { publicDescription: 'a'.repeat(401) },
    { visibility: 'unlisted' },
  ])
    assert.equal(listPublicationDetails({ ...valid, ...override }), null);
  assert.equal(
    listPublicationDetails({ ...valid, visibility: 'private', publishConfirmed: false })
      ?.visibility,
    'private',
  );
});
test('nobody signs a list as shwcs, however the name is spelled', () => {
  for (const name of [
    'shwcs',
    'shwcs editorial',
    'Equipo SHWCS',
    's.h.w.c.s',
    'Shwcs Team',
    'shwсs', // Cyrillic «с»
    'ｓｈｗｃｓ', // full-width letters
    'Showcase MX',
  ])
    assert.equal(reservedCurator(name), true, name);
  for (const name of ['Ana Torres', 'Equipo de finanzas', 'Show me the cases', ''])
    assert.equal(reservedCurator(name), false, name);
  const base = {
    visibility: 'public',
    categories: ['Finanzas'],
    publishConfirmed: true,
  };
  assert.equal(listPublicationDetails({ ...base, curatorName: 'shwcs editorial' }), null);
  // A private list can't keep a reserved signature for later either.
  assert.equal(
    listPublicationDetails({ ...base, visibility: 'private', curatorName: 'SHWCS' }),
    null,
  );
  assert.equal(listPublicationDetails({ ...base, curatorName: 'Ana' })?.curatorName, 'Ana');
  assert.equal(minPublicListProjects, 3);
});
test('«Popular» counts verified, non-owner interactions and lets them fade', () => {
  const fresh = { verified: true, own: false, ageDays: 0 };
  assert.equal(communityRank([{ kind: 'comment', ...fresh }], 60), 3);
  // Unverified accounts and the list's own maker add nothing, however many.
  assert.equal(
    communityRank(
      [
        ...Array.from({ length: 50 }, () => ({ kind: 'like' as const, ...fresh, verified: false })),
        { kind: 'save', ...fresh, own: true },
      ],
      60,
    ),
    0,
  );
  // One half-life halves the weight; the raw counters are a separate number.
  assert.ok(Math.abs(communityRank([{ kind: 'save', ...fresh, ageDays: 60 }], 60) - 1) < 1e-9);
  assert.equal(communityScore(1, 1, 1), 6);
});
test('community ranking is explicit and interaction counts are weighted consistently', () => {
  assert.equal(communityScore(0, 0, 0), 0);
  assert.equal(communityScore(2, 3, 4), 20);
});
test('public comments trim content and enforce the public limits', () => {
  assert.deepEqual(communityComment({ name: '  André  ', comment: '  Buena selección.  ' }), {
    name: 'André',
    comment: 'Buena selección.',
  });
  for (const input of [
    null,
    {},
    { name: '', comment: 'hola' },
    { name: 'a'.repeat(61), comment: 'hola' },
    { name: 'André', comment: '' },
    { name: 'André', comment: 'a'.repeat(501) },
  ])
    assert.equal(communityComment(input), null);
});
test('community reports require a known reason and enough context, trimmed', () => {
  assert.deepEqual(
    communityReport({ reason: 'spam', details: '  Enlaces a otra tienda no relacionada.  ' }),
    { reason: 'spam', details: 'Enlaces a otra tienda no relacionada.' },
  );
  for (const input of [
    null,
    {},
    { reason: 'spam', details: 'corto' },
    { reason: 'other', details: 'a'.repeat(2001) },
    { reason: 'unknown', details: 'Suficiente contexto aquí.' },
    { reason: 123, details: 'Suficiente contexto aquí.' },
  ])
    assert.equal(communityReport(input), null);
});
test('escapeLikeTerm neutralizes LIKE wildcards so a search term matches itself literally', () => {
  assert.equal(escapeLikeTerm('50% off'), '50\\% off');
  assert.equal(escapeLikeTerm('a_b'), 'a\\_b');
  assert.equal(escapeLikeTerm('back\\slash'), 'back\\\\slash');
  assert.equal(escapeLikeTerm('nomina'), 'nomina');
});
test('community mutations reject foreign origins and anonymous participation before storage', async () => {
  const body = { action: 'like', listId: '00000000-0000-4000-8000-000000000001' };
  const foreign = await communityPost(
    new NextRequest('https://shwcs.example/api/community', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  assert.equal(foreign.status, 403);
  const anonymous = await communityPost(
    new NextRequest('https://shwcs.example/api/community', {
      method: 'POST',
      headers: { origin: 'https://shwcs.example', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  assert.equal(anonymous.status, 401);
});

test('one community URL per set of filters, whatever the click order', () => {
  const filters = readCommunityFilters({ category: 'Ventas,Cobros', tamano: 'pyme,micro' });
  assert.deepEqual(filters.categories, ['Cobros', 'Ventas']);
  assert.deepEqual(filters.sizes, ['micro', 'pyme']);
  const forward = communityHref(filters, {
    categories: toggleAxis(filters.categories, 'Finanzas'),
  });
  const reversed = communityHref(
    readCommunityFilters({ category: 'Ventas,Finanzas,Cobros', tamano: 'micro,pyme' }),
  );
  assert.equal(forward, reversed);
  assert.equal(forward, '/comunidad?category=Cobros%2CFinanzas%2CVentas&tamano=micro%2Cpyme');
});
