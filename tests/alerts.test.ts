import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  alertHref,
  alertLabel,
  alertMatches,
  alertSignature,
  readAlertCriteria,
  type AlertProduct,
} from '../src/lib/alerts/model';
import { placeProduct } from '../src/lib/search/catalog-filter';
import { searchAlertEmail } from '../src/lib/notifications/alert-email';
import { followDigestEmail } from '../src/lib/notifications/follow-email';
import { POST as alertsPost } from '../src/app/api/alerts/route';
import { POST as followsPost } from '../src/app/api/follows/route';

const labels = { fastResponse: 'Responde rápido' };

const payroll: AlertProduct = {
  name: 'Nominal',
  description: 'Calcula la nómina y los recibos de tu equipo cada quincena.',
  feature: 'Equipos de tiendas con turnos',
  category: 'Nómina',
  categories: ['Nómina'],
  industries: ['Retail'],
  companySizes: ['pyme'],
  offering: 'Software',
};

test('alert criteria are validated, normalized and refused when they would mean something else', () => {
  assert.deepEqual(
    readAlertCriteria({
      scope: 'explorar',
      topic: 'nomina',
      query: '  turnos   rotativos ',
      filters: { industria: ['Salud', 'Retail', 'Retail'], sort: ['az'] },
    }),
    {
      scope: 'explorar',
      topic: 'nomina',
      query: 'turnos rotativos',
      filters: { industria: ['Retail', 'Salud'] },
    },
  );
  assert.deepEqual(readAlertCriteria({ scope: 'search', query: 'nómina para retail' }), {
    scope: 'search',
    topic: null,
    query: 'nómina para retail',
    filters: {},
  });
  for (const bad of [
    null,
    { scope: 'search', query: '' },
    { scope: 'search', query: 'para mi' }, // only filler words
    { scope: 'search', query: 'x', topic: 'cobros' },
    { scope: 'search', query: 'cobranza', filters: { industria: ['Retail'] } },
    { scope: 'explorar', topic: 'no-existe' },
    { scope: 'explorar', topic: 'cobros', filters: { inventado: ['x'] } },
    { scope: 'explorar', topic: 'cobros', filters: { industria: ['Marte'] } },
    { scope: 'explorar', topic: 'cobros', filters: { precio: ['a', 'b'] } },
    { scope: 'explorar', topic: 'cobros', query: 'x'.repeat(201) },
    { scope: 'otro', topic: 'cobros' },
  ])
    assert.equal(readAlertCriteria(bad), null, JSON.stringify(bad));
});

test('the same search is the same alert, whatever the accents, case or filter order', () => {
  const a = readAlertCriteria({
    scope: 'industria',
    topic: 'retail',
    query: 'Nómina',
    filters: { tamano: ['pyme', 'micro'], problema: ['Nómina'] },
  })!;
  const b = readAlertCriteria({
    scope: 'industria',
    topic: 'retail',
    query: 'nomina',
    filters: { problema: ['Nómina'], tamano: ['micro', 'pyme'] },
  })!;
  assert.equal(alertSignature(a), alertSignature(b));
  assert.notEqual(alertSignature(a), alertSignature({ ...b, topic: 'salud' }));
});

test('an alert matches what the main results of its page would show, never «also useful»', () => {
  const nomina = readAlertCriteria({ scope: 'explorar', topic: 'nomina' })!;
  assert.equal(alertMatches(payroll, nomina), true);
  assert.equal(
    alertMatches(payroll, readAlertCriteria({ scope: 'explorar', topic: 'cobros' })!),
    false,
  );
  // Declared industry: in; another declared industry: out.
  const retail = readAlertCriteria({
    scope: 'explorar',
    topic: 'nomina',
    filters: { industria: ['Retail'] },
  })!;
  assert.equal(alertMatches(payroll, retail), true);
  const health = readAlertCriteria({
    scope: 'explorar',
    topic: 'nomina',
    filters: { industria: ['Salud'] },
  })!;
  assert.equal(alertMatches(payroll, health), false);
  // Never declared a size: the catalog files it under «También podrían servir», so no alert.
  const undeclared = { ...payroll, companySizes: undefined };
  const pyme = readAlertCriteria({
    scope: 'explorar',
    topic: 'nomina',
    filters: { tamano: ['pyme'] },
  })!;
  assert.deepEqual(placeProduct(undeclared, pyme.filters), {
    level: 'inferred',
    reasons: ['companySize'],
  });
  assert.equal(alertMatches(undeclared, pyme), false);
  assert.equal(alertMatches(payroll, pyme), true);
  // Words typed inside a category must hit the listing itself.
  assert.equal(
    alertMatches(
      payroll,
      readAlertCriteria({ scope: 'explorar', topic: 'nomina', query: 'recibos' })!,
    ),
    true,
  );
  assert.equal(
    alertMatches(
      payroll,
      readAlertCriteria({ scope: 'explorar', topic: 'nomina', query: 'hipotecas' })!,
    ),
    false,
  );
  // /buscar: the catalog's scorer, plurals and roots included.
  assert.equal(
    alertMatches(payroll, readAlertCriteria({ scope: 'search', query: 'recibo' })!),
    true,
  );
  assert.equal(
    alertMatches(payroll, readAlertCriteria({ scope: 'search', query: 'hipotecas' })!),
    false,
  );
  // Industry pages: «fits any» counts, inference does not.
  const industry = readAlertCriteria({ scope: 'industria', topic: 'retail' })!;
  assert.equal(alertMatches({ ...payroll, industries: [] }, industry), true);
  assert.equal(alertMatches({ ...payroll, industries: ['Salud'] }, industry), false);
});

test('an alert links back to its page and reads as words in both languages', () => {
  const criteria = readAlertCriteria({
    scope: 'explorar',
    topic: 'nomina',
    query: 'turnos',
    filters: { industria: ['Retail'], tamano: ['pyme'], respuesta: ['rapido'] },
  })!;
  assert.equal(
    alertHref(criteria),
    '/explorar/nomina?industria=Retail&respuesta=rapido&tamano=pyme&q=turnos',
  );
  assert.equal(
    alertHref(readAlertCriteria({ scope: 'search', query: 'cobranza' })!),
    '/buscar?q=cobranza',
  );
  assert.equal(
    alertLabel(criteria, 'es', labels),
    '«turnos» · Nómina · Retail & E-commerce · Responde rápido · PyME',
  );
  const english = alertLabel(criteria, 'en', { fastResponse: 'Responds fast' });
  assert.ok(english.includes('Payroll') && english.includes('Responds fast'), english);
});

test('the alert email escapes what people wrote and says how many there are', () => {
  const email = searchAlertEmail({
    title: '3 proyectos nuevos para tu alerta «nómina»',
    label: 'nómina',
    listings: [
      { id: 'a', name: '<b>Uno</b>', problem: 'Paga <script>' },
      { id: 'b', name: 'Dos', problem: '' },
    ],
    total: 3,
    resultsUrl: 'https://shwcs.example/es/buscar?q=n%C3%B3mina',
    manageUrl: 'https://shwcs.example/es/account/alerts',
    origin: 'https://shwcs.example',
  });
  const html = email.paragraphs.join('');
  assert.ok(!html.includes('<b>Uno') && !html.includes('<script>'));
  assert.ok(html.includes('&lt;b&gt;Uno&lt;/b&gt;'));
  assert.ok(html.includes('Y uno más.'));
  assert.ok(email.text.includes('https://shwcs.example/es/soluciones/b'));
  assert.equal(email.button.href, 'https://shwcs.example/es/buscar?q=n%C3%B3mina');
});

test('the weekly follow summary lists public lists only by their public names', () => {
  const email = followDigestEmail({
    title: 'Esta semana en lo que sigues',
    lists: [{ id: 'l1', name: 'Cobranza <sana>', projects: ['A', 'B', 'C', 'D'] }],
    curatorLists: [{ id: 'l2', name: 'Retail', curator: 'Ana' }],
    origin: 'https://shwcs.example',
  });
  const html = email.paragraphs.join('');
  assert.ok(html.includes('Cobranza &lt;sana&gt;') && html.includes('A, B, C y 1 más'));
  assert.ok(html.includes('de Ana'));
  assert.ok(email.text.includes('https://shwcs.example/es/comunidad/l2'));
});

test('alerts and follows need the same origin and a session', async () => {
  for (const [post, url, body] of [
    [alertsPost, 'https://shwcs.example/api/alerts', { action: 'create', criteria: {} }],
    [followsPost, 'https://shwcs.example/api/follows', { action: 'list', id: crypto.randomUUID() }],
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
