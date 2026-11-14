import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  readUpdateInput,
  solutionUpdateKinds,
  updatesPerWeek,
} from '../src/lib/solutions/updates-model';
import { followDigestEmail } from '../src/lib/notifications/follow-email';
import { authReturnTo } from '../src/lib/auth/return-to';
import { POST as updatesPost } from '../src/app/api/solutions/[id]/updates/route';
import { es } from '../src/i18n/dictionaries/es';
import { en } from '../src/i18n/dictionaries/en';

const id = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';

test('a dated update needs a known kind, 10–500 characters and at most an http(s) link', () => {
  const ok = readUpdateInput({ id, kind: 'pricing', body: '  Nuevo plan para equipos de 5.  ' });
  assert.deepEqual(ok, { id, kind: 'pricing', body: 'Nuevo plan para equipos de 5.', link: null });
  assert.equal(
    readUpdateInput({
      id,
      kind: 'case',
      body: 'Caso con una distribuidora.',
      link: 'https://example.com/caso',
    })?.link,
    'https://example.com/caso',
  );
  for (const bad of [
    { id, kind: 'pricing', body: 'corto' },
    { id, kind: 'pricing', body: 'x'.repeat(501) },
    { id, kind: 'promo', body: 'Una novedad suficientemente larga.' },
    { id: 'not-a-uuid', kind: 'other', body: 'Una novedad suficientemente larga.' },
    { id, kind: 'other', body: 'Una novedad suficientemente larga.', link: 'javascript:alert(1)' },
    {
      id,
      kind: 'other',
      body: 'Una novedad suficientemente larga.',
      link: 'https://user:pw@example.com',
    },
    { id, kind: 'other', body: 'Una novedad suficientemente larga.', link: 'https://localhost/x' },
    null,
  ])
    assert.equal(readUpdateInput(bad), null, JSON.stringify(bad));
  assert.equal(updatesPerWeek, 4);
});

test('every update kind has a label in both languages', () => {
  for (const kind of solutionUpdateKinds) {
    assert.ok(es.follows.updates.kinds[kind]);
    assert.ok(en.follows.updates.kinds[kind]);
  }
});

test('the weekly follow summary carries followed listings’ updates, escaped', () => {
  const email = followDigestEmail({
    title: 'Una novedad de un proyecto que sigues',
    lists: [],
    curatorLists: [],
    projects: [
      {
        id,
        name: 'Cord <beta>',
        updates: [{ kind: 'integration', body: 'Ahora con <b>SAP</b>.' }],
      },
    ],
    origin: 'https://shwcs.example',
  });
  const html = email.paragraphs.join('');
  assert.ok(html.includes('Novedades de proyectos que sigues'));
  assert.ok(
    html.includes('Cord &lt;beta&gt;') &&
      html.includes('Integración: Ahora con &lt;b&gt;SAP&lt;/b&gt;.'),
  );
  assert.ok(!html.includes('<b>SAP'));
  assert.ok(email.text.includes(`https://shwcs.example/es/soluciones/${id}`));
});

test('a listing is a valid place to come back to after signing in, by UUID only', () => {
  assert.equal(authReturnTo(`/soluciones/${id}`), `/soluciones/${id}`);
  assert.equal(authReturnTo('/soluciones/cord'), '/account');
  assert.equal(authReturnTo(`/soluciones/${id}/../../evil`), '/account');
  assert.equal(authReturnTo('//evil.example/soluciones/x'), '/account');
});

test('posting updates needs the same origin and a session', async () => {
  const request = (origin: string) =>
    new NextRequest(`https://shwcs.example/api/solutions/${id}/updates`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'post', id, kind: 'other', body: 'Una novedad cualquiera.' }),
    });
  const params = { params: Promise.resolve({ id }) };
  assert.equal((await updatesPost(request('https://evil.example'), params)).status, 403);
  assert.equal((await updatesPost(request('https://shwcs.example'), params)).status, 401);
});
