import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lastCompletedWeek,
  rankWeekly,
  recognitionHost,
  sortAwards,
  weeklyPlaces,
  type Award,
  type WeeklyRow,
} from '../src/lib/recognition/model';
import { badgeSvg, badgeWidth, escapeXml } from '../src/lib/recognition/badge';
import { awardPeriod, awardTitle } from '../src/lib/recognition/format';
import { readSiteLinks, readSiteMeta } from '../src/lib/solutions/site-image';
import { suggestCapabilityIds, suggestCategories } from '../src/lib/search/suggest';

const row = (id: string, score: number, accounts = 3, categories = ['Ventas']): WeeklyRow => ({
  solutionId: id,
  categories,
  score,
  accounts,
  publishedAt: '2026-09-01T00:00:00.000Z',
});

test('weekly places: none below three competitors, one per two, never more than three', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 20].map(weeklyPlaces), [0, 0, 0, 1, 2, 2, 3, 3, 3]);
});

test('rankWeekly needs three verified accounts and a real score to compete', () => {
  const { competitors, places } = rankWeekly(
    [row('a', 9), row('b', 8), row('c', 7), row('lonely', 50, 2), row('zero', 0, 9)],
    ['Ventas', 'Cobros'],
  );
  assert.equal(competitors, 3);
  // Three competitors give a single place, overall and in Ventas; Cobros has nobody.
  assert.deepEqual(places, [
    { solutionId: 'a', scope: 'all', rank: 1, score: 9 },
    { solutionId: 'a', scope: 'Ventas', rank: 1, score: 9 },
  ]);
});

test('rankWeekly breaks ties by accounts, then the earlier listing, deterministically', () => {
  const rows = [
    row('late', 10, 3),
    row('wide', 10, 5),
    row('early', 10, 3),
    row('x', 1),
    row('y', 1),
    row('z', 1),
  ];
  rows[0].publishedAt = '2026-10-01T00:00:00.000Z';
  const { places } = rankWeekly(rows, []);
  assert.deepEqual(
    places.map(place => place.solutionId),
    ['wide', 'early', 'late'],
  );
});

test('lastCompletedWeek is the previous Monday–Sunday in Mexico City time', () => {
  // Monday 05:00 UTC is still Sunday night in Mexico City: that week is not over yet.
  assert.deepEqual(lastCompletedWeek(new Date('2026-11-16T05:00:00Z')), {
    start: '2026-11-02',
    end: '2026-11-08',
  });
  assert.deepEqual(lastCompletedWeek(new Date('2026-11-16T14:00:00Z')), {
    start: '2026-11-09',
    end: '2026-11-15',
  });
  assert.deepEqual(lastCompletedWeek(new Date('2026-11-14T12:00:00Z')), {
    start: '2026-11-02',
    end: '2026-11-08',
  });
});

test('a verification is tied to the host, ignoring scheme, www. and path', () => {
  assert.equal(recognitionHost('https://www.CordHQ.app/precios?x=1'), 'cordhq.app');
  assert.equal(recognitionHost('http://cordhq.app'), 'cordhq.app');
  assert.equal(recognitionHost('javascript:alert(1)'), null);
  assert.equal(recognitionHost('https://localhost'), null);
  assert.equal(recognitionHost(undefined), null);
});

test('awards read as dated titles, editorial picks first', () => {
  const weekly: Award = {
    id: '1',
    kind: 'weekly',
    scope: 'Ventas',
    rank: 2,
    periodStart: '2026-11-09',
    periodEnd: '2026-11-15',
    note: null,
  };
  const pick: Award = {
    ...weekly,
    id: '2',
    kind: 'editorial',
    scope: 'all',
    rank: null,
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    note: 'Porque sí.',
  };
  const words = {
    weeklyAll: '#{rank} de la semana',
    weeklyIn: '#{rank} de la semana en {category}',
    editorial: 'Selección shwcs',
  };
  assert.equal(awardTitle(weekly, words, 'es'), '#2 de la semana en Ventas');
  assert.match(awardPeriod(weekly, 'es'), /9.*15.*nov.*2026/);
  assert.match(awardPeriod(pick, 'en'), /November 2026/);
  assert.deepEqual(
    sortAwards([weekly, pick]).map(award => award.id),
    ['2', '1'],
  );
});

test('the badge is self-contained SVG and escapes what it prints', () => {
  const svg = badgeSvg({
    variant: 'award',
    tone: 'gold',
    theme: 'dark',
    label: '#1 de la semana en <Ventas>',
    seal: { line1: 'De la semana', line2: '<Ventas>' },
    date: '9–15 nov 2026',
    rank: 1,
    title: 'A & B en shwcs',
  });
  const seal = badgeSvg({
    layout: 'seal',
    variant: 'verified',
    tone: 'verified',
    theme: 'light',
    label: 'Verificado por',
    seal: { line1: 'Verificado', line2: 'Por el equipo' },
    title: 'Seal',
  });
  assert.ok(seal.includes('width="132" height="156"'));
  assert.equal([...seal.matchAll(/href="(?!data:)/g)].length, 0);
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('&lt;VENTAS&gt;'));
  assert.ok(svg.includes('A &amp; B en shwcs'));
  // Nothing outside the file: only embedded data URIs.
  assert.equal([...svg.matchAll(/href="(?!data:)/g)].length, 0);
  assert.ok(!/<script|on\w+=/i.test(svg));
  assert.ok(badgeWidth('Publicado en') >= 200);
  assert.ok(
    badgeWidth('#1 de la semana en Comercio electrónico', '9–15 nov 2026') >
      badgeWidth('Publicado en'),
  );
  assert.equal(escapeXml(`"'<>&`), '&quot;&apos;&lt;&gt;&amp;');
});

test('the site reader takes name, description and profile links from fixed HTML', () => {
  const html = `<html><head><title>Cord — Cotiza y factura</title>
    <meta content="Cord's pipeline &amp; cotizaciones" property="og:description">
    <meta name="description" content="ignored"></head><body>
    <a href="https://twitter.com/intent/tweet?text=x">share</a>
    <a href='https://x.com/cordhq'>X</a><a href="https://www.linkedin.com/company/cordhq/">in</a>
    <a href="https://www.instagram.com/p/123">post</a><a href="https://github.com/cordhq">gh</a>
    <a href="https://www.linkedin.com/company/other">second</a></body></html>`;
  const meta = readSiteMeta(html);
  assert.equal(meta.name, 'Cord');
  assert.equal(meta.description, "Cord's pipeline & cotizaciones");
  assert.deepEqual(meta.links, [
    { label: 'X', url: 'https://x.com/cordhq' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/company/cordhq/' },
    { label: 'GitHub', url: 'https://github.com/cordhq' },
  ]);
  assert.equal(readSiteMeta('<meta property="og:site_name" content="Flouvia">').name, 'Flouvia');
  assert.deepEqual(readSiteLinks('<a href="javascript:alert(1)">x</a>'), []);
});

test('category suggestions come from the text and never repeat a chosen one', () => {
  const text = { problem: 'Cotizaciones, pipeline de ventas y facturación con CFDI y cobranza' };
  const suggested = suggestCategories(text);
  assert.ok(suggested.includes('Ventas'), suggested.join());
  assert.ok(!suggestCategories(text, ['Ventas']).includes('Ventas'));
  assert.deepEqual(suggestCategories({ problem: '' }), []);
});

test('suggestions read roots, ignore generic words and never promote a weak runner-up', () => {
  const cord = {
    problem:
      'Cotiza, factura y cobra en México desde un solo link: tu cliente aprueba y paga con tarjeta.',
  };
  assert.deepEqual(suggestCategories(cord), ['Cobros', 'Ventas']);
  // Choosing the right ones does not pull Finanzas («tarjeta») into view.
  assert.deepEqual(suggestCategories(cord, ['Cobros', 'Ventas']), []);
  const capabilities = suggestCapabilityIds(cord, ['Cobros', 'Ventas']);
  for (const id of ['facturacion-cfdi', 'cotizaciones-propuestas', 'cobranza-recordatorios'])
    assert.ok(capabilities.includes(id), id);
  assert.deepEqual(
    suggestCategories({ problem: 'La mejor plataforma para tu empresa y tus clientes.' }),
    [],
  );
});
