import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  outboundMedium,
  outboundRel,
  outboundUrl,
  sponsoredVisitParam,
  sponsoredVisitValue,
} from '../src/lib/solutions/outbound';
import { pickSimilar, similarExits, similarity } from '../src/lib/solutions/similar';
import { POST as solutionSocialPost } from '../src/app/api/solutions/social/route';
import { es } from '../src/i18n/dictionaries/es';
import { en } from '../src/i18n/dictionaries/en';

test('outbound links tag the visit as shwcs traffic and keep the referrer (SHCWS-19)', () => {
  assert.equal(outboundRel, 'noopener');
  assert.equal(
    outboundUrl('https://cordhq.app'),
    'https://cordhq.app/?utm_source=shwcs&utm_medium=listing',
  );
  // Existing query and fragment survive; the tags go in the query.
  assert.equal(
    outboundUrl('https://example.com/demo?lang=es#video', 'sponsored'),
    'https://example.com/demo?lang=es&utm_source=shwcs&utm_medium=sponsored#video',
  );
  // A founder who tagged their own link keeps their tags.
  const own = 'https://example.com/?utm_source=directory&utm_campaign=q4';
  assert.equal(outboundUrl(own), own);
  // Nothing but http(s), and nothing unparsable, is touched.
  assert.equal(outboundUrl('mailto:hola@example.com'), 'mailto:hola@example.com');
  assert.equal(outboundUrl('not a url'), 'not a url');
  // Only the exact flag from a sponsored slot changes the medium.
  assert.equal(sponsoredVisitParam, 'from');
  assert.equal(outboundMedium(sponsoredVisitValue), 'sponsored');
  assert.equal(outboundMedium(undefined), 'listing');
  assert.equal(outboundMedium(['sponsored']), 'listing');
  assert.equal(outboundMedium('Sponsored'), 'listing');
});

const listing = (id: string, facets: Record<string, string[] | undefined>) => ({
  detailUrl: `/soluciones/${id}`,
  name: id,
  ...facets,
});

test('similar listings weigh shared capabilities over categories over industry and size (SHCWS-55)', () => {
  const current = {
    categories: ['Ventas', 'Cobros'],
    capabilities: ['cotizaciones-propuestas', 'cobranza-recordatorios'],
    industries: ['Retail'],
    companySizes: ['pyme'],
  };
  const match = similarity(current, {
    categories: ['Ventas'],
    capabilities: ['cotizaciones-propuestas'],
    industries: ['Retail', 'Salud'],
    companySizes: ['pyme', 'mediana'],
  });
  assert.deepEqual(match.capabilities, ['cotizaciones-propuestas']);
  assert.deepEqual(match.categories, ['Ventas']);
  assert.equal(match.score, 3 + 2 + 1 + 1);
  // «Fits any» ([]) is a real answer but no sign of likeness.
  assert.equal(similarity(current, { industries: [], companySizes: [] }).score, 0);

  const catalog = [
    listing('self', { categories: ['Ventas'], capabilities: ['cotizaciones-propuestas'] }),
    listing('same-size-only', { categories: ['Legal'], companySizes: ['pyme'] }),
    listing('category', { categories: ['Cobros'] }),
    listing('capability', { categories: ['Finanzas'], capabilities: ['cobranza-recordatorios'] }),
    listing('both', { categories: ['Ventas'], capabilities: ['cotizaciones-propuestas'] }),
    listing('category-2', { categories: ['Ventas'] }),
  ];
  const picked = pickSimilar(current, '/soluciones/self', catalog).map(
    ({ product }) => product.name,
  );
  // Never itself; sharing only a size is not «similar»; ties keep the catalogue order.
  assert.deepEqual(picked, ['both', 'capability', 'category']);
  assert.deepEqual(
    pickSimilar(current, '/soluciones/self', catalog, 5).map(({ product }) => product.name),
    ['both', 'capability', 'category', 'category-2'],
  );
});

test('every listing ends with a useful exit, the brief first when room is short (SHCWS-55)', () => {
  const cobros = { categories: ['Cobros'] };
  assert.deepEqual(similarExits(cobros, 3), []);
  assert.deepEqual(similarExits(cobros, 2), [{ kind: 'brief' }]);
  assert.deepEqual(similarExits(cobros, 1), [
    { kind: 'category', slug: 'cobros', label: 'Cobros' },
    { kind: 'brief' },
  ]);
  assert.deepEqual(similarExits(cobros, 0), [
    { kind: 'collection', slug: 'essential' },
    { kind: 'category', slug: 'cobros', label: 'Cobros' },
    { kind: 'brief' },
  ]);
  // An industry collection only counts for a declared industry.
  assert.deepEqual(similarExits({ categories: ['Ventas'], industries: ['Agencias'] }, 0)[0], {
    kind: 'collection',
    slug: 'agencia',
  });
  // Even with nothing declared there is still a way out.
  assert.deepEqual(similarExits({ categories: [] }, 0), [{ kind: 'brief' }]);
});

test('reporting a listing comment requires same origin and a session (SHCWS-140)', async () => {
  const body = JSON.stringify({
    action: 'report-comment',
    solutionId: '7f6d3a4e-1b2c-4d5e-8f90-123456789abc',
    commentId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    reason: 'spam',
    details: 'Publicidad repetida de otro producto.',
  });
  const foreign = await solutionSocialPost(
    new NextRequest('http://localhost:3000/api/solutions/social', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      body,
    }),
  );
  assert.equal(foreign.status, 403);
  const anonymous = await solutionSocialPost(
    new NextRequest('http://localhost:3000/api/solutions/social', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body,
    }),
  );
  assert.equal(anonymous.status, 401);
});

test('listing share, contact and exit copy exists in both languages', () => {
  for (const dict of [es, en]) {
    assert.ok(dict.solution.share.text.includes('{name}'));
    assert.ok(dict.solution.exits.briefNeed.includes('{name}'));
    assert.ok(dict.solution.exits.categoryTitle.includes('{category}'));
    assert.ok(dict.solution.contactCta.length > 0);
    assert.ok(dict.solutionUi.commentReport.reasonSpam.length > 0);
    assert.ok(dict.solutionUi.errors.reportConflict.length > 0);
  }
});
