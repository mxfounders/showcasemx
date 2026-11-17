import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  handleProblem,
  isProfileHandle,
  normalizeHandle,
  reservedHandle,
} from '../src/lib/profiles/handle';
import { isHandleShape } from '../src/lib/profiles/handle-shape';
import { publicProfileLinks, readProfileInput } from '../src/lib/profiles/model';
import {
  buildHandleSnapshot,
  primeProfileHandles,
  routeProfile,
} from '../src/lib/profiles/routing';
import { followDigestEmail } from '../src/lib/notifications/follow-email';
import { isPagePath } from '../src/lib/routes';
import { middleware } from '../src/middleware';
import { POST as profilePost } from '../src/app/api/account/public-profile/route';
import { POST as followsPost } from '../src/app/api/follows/route';
import * as opsProfiles from '../ops/src/lib/profiles';

test('a handle is typed freely and stored in one shape', () => {
  assert.equal(normalizeHandle('@Ana López_99'), 'ana-lopez-99');
  assert.equal(normalizeHandle('  Ñandú   Straße  '), 'nandu-strasse');
  assert.equal(normalizeHandle('--x--'), 'x');
  assert.equal(normalizeHandle('a'.repeat(40)), 'a'.repeat(30));
  // Cut at 30 never leaves a trailing hyphen.
  assert.equal(normalizeHandle(`${'a'.repeat(29)} b`), 'a'.repeat(29));
  assert.equal(handleProblem('ab'), 'short');
  assert.equal(handleProblem('a--b'), 'shape');
  assert.equal(handleProblem('ana-lopez'), null);
  assert.ok(isHandleShape('ana-lopez') && !isHandleShape('Ana') && !isHandleShape('-ana'));
});

test('nobody can claim the platform, a page of the site or an authority', () => {
  for (const handle of [
    'shwcs',
    'equipo-shwcs',
    's-h-w-c-s',
    'showcase-mx',
    'admin',
    'ad-min',
    'soporte',
    'comunidad',
    'fundadores',
    'soluciones',
    'opengraph-image',
    'twitter-image-2',
  ])
    assert.equal(reservedHandle(handle), true, handle);
  for (const handle of ['ana-lopez', 'cord-founder', 'maria'])
    assert.equal(isProfileHandle(handle), true, handle);
  // Lookalike letters from other scripts normalize away, so «ѕһwсѕ» is not a way around it.
  assert.equal(handleProblem(normalizeHandle('ѕһwсѕ')), 'short');
});

test('ops checks a forced handle with the same rules as the product', () => {
  const samples = [
    '@Ana López_99',
    'shwcs',
    'equipo-shwcs',
    'admin',
    'ab',
    'a--b',
    'maria',
    'opengraph-image',
    'x'.repeat(40),
  ];
  for (const sample of samples) {
    const ops = opsProfiles.checkHandle(sample);
    const handle = normalizeHandle(sample);
    const problem = handleProblem(handle);
    assert.equal(ops.ok, problem === null, sample);
    if (ops.ok) assert.equal(ops.handle, handle, sample);
    else assert.equal(ops.error, problem, sample);
  }
  // The reserved words are the same list on both sides.
  const words = (file: string) =>
    /reservedWords = new Set\(\[([\s\S]*?)\]\)/.exec(
      readFileSync(join(__dirname, '..', file), 'utf8'),
    )?.[1];
  assert.equal(words('ops/src/lib/profiles.ts'), words('src/lib/profiles/handle.ts'));
});

const valid = {
  handle: 'Ana López',
  displayName: '  Ana   López ',
  bio: 'Construyo software de cobranza.\r\n',
  links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/ana' }],
  hiddenSolutions: ['3F2B8C1E-5D4A-4F6B-9C7E-2A1D0B9E8F7A'],
  hiddenLists: [],
  active: true,
  version: 0,
};

test('a profile save is validated and normalized before it touches the database', () => {
  const result = readProfileInput(valid);
  assert.ok(result.ok);
  assert.deepEqual(result.value, {
    handle: 'ana-lopez',
    displayName: 'Ana López',
    bio: 'Construyo software de cobranza.',
    links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/ana' }],
    hiddenSolutions: ['3f2b8c1e-5d4a-4f6b-9c7e-2a1d0b9e8f7a'],
    hiddenLists: [],
    active: true,
    version: 0,
  });
  const error = (patch: Record<string, unknown>) => {
    const outcome = readProfileInput({ ...valid, ...patch });
    return outcome.ok ? null : outcome.error;
  };
  assert.deepEqual(error({ handle: 'shwcs' }), { field: 'handle', problem: 'reserved' });
  assert.deepEqual(error({ displayName: 'Equipo SHWCS' }), {
    field: 'displayName',
    problem: 'reserved',
  });
  assert.deepEqual(error({ displayName: ' ' }), { field: 'displayName', problem: 'empty' });
  assert.equal(error({ bio: 'x'.repeat(601) })?.field, 'bio');
  // Same URL rules as a listing (§17): http(s), no credentials, a real host.
  for (const url of [
    'javascript:alert(1)',
    'https://user:pw@x.com',
    'http://localhost',
    'ftp://x.com',
  ])
    assert.equal(error({ links: [{ label: 'X', url }] })?.field, 'links', url);
  assert.equal(error({ links: [{ label: 'Correo', url: 'https://x.com' }] })?.field, 'links');
  assert.equal(
    error({ links: Array.from({ length: 7 }, () => ({ label: 'X', url: 'https://x.com' })) })
      ?.field,
    'links',
  );
  assert.equal(error({ hiddenLists: ['not-a-uuid'] })?.field, 'hidden');
  assert.equal(error({ active: 'yes' })?.field, 'active');
  assert.equal(error({ version: -1 })?.field, 'version');
});

test('links read back from the database are dropped if they no longer pass', () => {
  assert.deepEqual(
    publicProfileLinks([
      { label: 'GitHub', url: 'https://github.com/ana' },
      { label: 'X', url: 'javascript:alert(1)' },
    ]),
    [{ label: 'GitHub', url: 'https://github.com/ana' }],
  );
  assert.deepEqual(publicProfileLinks('nope'), []);
});

test('a handle routes to its page, its lowercase form or its current name', () => {
  const snapshot = buildHandleSnapshot([
    { handle: 'ana-lopez', retired: null },
    { handle: 'ana-lopez', retired: 'ana' },
  ]);
  assert.deepEqual(routeProfile('ana-lopez', snapshot), { kind: 'page' });
  assert.deepEqual(routeProfile('Ana-Lopez', snapshot), { kind: 'redirect', handle: 'ana-lopez' });
  assert.deepEqual(routeProfile('ana', snapshot), { kind: 'redirect', handle: 'ana-lopez' });
  assert.deepEqual(routeProfile('nadie', snapshot), { kind: 'missing' });
  assert.deepEqual(routeProfile('a_b', snapshot), { kind: 'missing' });
});

test('/c/<handle> and /fundadores are pages; anything else under /c is not', () => {
  assert.equal(isPagePath(['c', 'ana-lopez']), true);
  assert.equal(isPagePath(['c', 'Ana-Lopez']), true);
  assert.equal(isPagePath(['fundadores']), true);
  for (const path of [
    ['c'],
    ['c', 'ab'],
    ['c', 'ana', 'x'],
    ['c', 'a_b'],
    ['c', '.env'],
    ['fundadores', 'x'],
  ])
    assert.equal(isPagePath(path), false, path.join('/'));
});

test('the middleware answers 404, 301 or the page for a profile, before rendering', async () => {
  primeProfileHandles([
    { handle: 'ana-lopez', retired: null },
    { handle: 'ana-lopez', retired: 'ana' },
  ]);
  const request = (path: string) =>
    new NextRequest(`http://localhost:3000${path}`, { headers: { 'accept-language': 'es' } });
  const missing = await middleware(request('/en/c/nadie-aqui'));
  assert.equal(missing.status, 404);
  assert.ok((await missing.text()).includes('Page not found'));
  const old = await middleware(request('/es/c/ana?ref=x'));
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), 'http://localhost:3000/es/c/ana-lopez?ref=x');
  const upper = await middleware(request('/es/c/Ana-Lopez'));
  assert.equal(upper.status, 301);
  assert.equal(upper.headers.get('location'), 'http://localhost:3000/es/c/ana-lopez');
  const page = await middleware(request('/es/c/ana-lopez'));
  assert.equal(page.status, 200);
  // Without a locale, an old handle goes straight to the current one.
  const bare = await middleware(request('/c/ana'));
  assert.equal(bare.headers.get('location'), 'http://localhost:3000/es/c/ana-lopez');
});

test('the weekly email lists what followed profiles published, by handle only', () => {
  const email = followDigestEmail({
    title: 'Un proyecto nuevo de un perfil que sigues',
    lists: [],
    curatorLists: [],
    profiles: [
      {
        handle: 'ana-lopez',
        name: 'Ana <López>',
        projects: [{ path: '/soluciones/cobra', name: 'Cobra' }],
        lists: [{ id: 'l1', name: 'Mis favoritas' }],
      },
    ],
    origin: 'https://shwcs.example',
  });
  const html = email.paragraphs.join('');
  assert.ok(html.includes('Ana &lt;López&gt;'));
  assert.ok(html.includes('https://shwcs.example/es/c/ana-lopez'));
  assert.ok(html.includes('https://shwcs.example/es/soluciones/cobra'));
  assert.ok(email.text.includes('Lista: Mis favoritas (https://shwcs.example/es/comunidad/l1)'));
});

test('editing or following a profile needs the same origin and a session', async () => {
  for (const [post, url, body] of [
    [profilePost, 'https://shwcs.example/api/account/public-profile', { action: 'save' }],
    [followsPost, 'https://shwcs.example/api/follows', { action: 'profile', handle: 'ana-lopez' }],
  ] as const) {
    const request = (origin: string) =>
      new NextRequest(url, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    assert.equal((await post(request('https://evil.example'))).status, 403);
    assert.equal((await post(request('https://shwcs.example'))).status, 401);
  }
});
