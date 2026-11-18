import assert from 'node:assert/strict';
import test from 'node:test';
import { readSolutionData, solutionErrors, type SolutionData } from '../src/lib/solutions/model';
import { providerRows } from '../src/lib/solutions/provider';
import {
  declaredLanguages,
  declaredMarkets,
  languageFit,
  marketFit,
} from '../src/lib/search/facets';
import { placeProduct, type FilterableProduct } from '../src/lib/search/catalog-filter';
import { isLanguageCode, languageOptions } from '../src/lib/languages';
import { readAlertCriteria } from '../src/lib/alerts/model';
import { mergeSiteDraft, readDraftOutput } from '../src/lib/solutions/site-draft';
import { solutionMarkdown } from '../src/lib/machine-readable';

const full: SolutionData = {
  name: 'Atlas',
  kind: 'Software',
  category: 'Cobros',
  problem: 'Ayuda a organizar cobros y facturas pendientes.',
  audience: 'Pequeñas empresas y equipos de finanzas.',
  website: 'https://atlas.example.com',
  contactEmail: 'founder@example.com',
  industries: [],
  companySizes: [],
  capabilities: ['facturacion-cfdi'],
};

test('provider facts validate against Intl codes and closed lists, and stay optional', () => {
  const facts = {
    originCountry: 'CO',
    serviceCountries: ['CO', 'MX', 'CO'],
    billingCountries: [],
    currencies: ['COP', 'USD'],
    supportLanguages: ['es', 'en'],
    supportHours: '  Lunes a viernes, 9 a 18 h  ',
    paymentMethods: ['tarjeta', 'transferencia'],
    foundedYear: 2021,
    teamSize: 'de-11-a-50',
    customerCount: 'de-51-a-200',
  };
  const data = readSolutionData({ ...full, ...facts });
  assert.ok(data);
  assert.deepEqual(data.serviceCountries, ['CO', 'MX']);
  // [] is the deliberate «any country», kept apart from never answered.
  assert.deepEqual(data.billingCountries, []);
  assert.equal(readSolutionData(full)?.billingCountries, undefined);
  assert.equal(data.supportHours, 'Lunes a viernes, 9 a 18 h');
  assert.deepEqual(solutionErrors(data), {});
  for (const bad of [
    { originCountry: 'ZZ' },
    { originCountry: 'co' },
    { serviceCountries: ['XX'] },
    { billingCountries: 'CO' },
    { currencies: ['PESOS'] },
    { supportLanguages: ['ES'] },
    { supportLanguages: ['xx'] },
    { supportHours: 'x'.repeat(121) },
    { paymentMethods: ['trueque'] },
    { foundedYear: 1850 },
    { foundedYear: 2020.5 },
    { foundedYear: '2020' },
    { teamSize: '5' },
    { customerCount: 'muchos' },
  ])
    assert.equal(readSolutionData({ ...full, ...bad }), null, JSON.stringify(bad));
  // An empty currency or language list says nothing: it is dropped, not stored.
  const empty = readSolutionData({ ...full, currencies: [], supportLanguages: [] });
  assert.equal(empty?.currencies, undefined);
  assert.equal(empty?.supportLanguages, undefined);
  assert.ok(isLanguageCode('pt') && !isLanguageCode('zz') && !isLanguageCode('PT'));
  assert.deepEqual(
    languageOptions('es').frequent.map(option => option.value),
    ['es', 'en', 'pt', 'fr', 'de', 'it'],
  );
});

test('customer cases are bounded, always declared, and a founder cannot mark them confirmed', () => {
  const data = readSolutionData({
    ...full,
    cases: [
      {
        client: ' Distribuidora Norte ',
        problem: 'Cobraba con 60 días de retraso.',
        result: 'Bajó a 25 días.',
        url: 'https://atlas.example.com/casos/norte',
        confirmed: true,
        confirmedBy: 'cliente',
      },
    ],
  });
  assert.deepEqual(data?.cases, [
    {
      client: 'Distribuidora Norte',
      problem: 'Cobraba con 60 días de retraso.',
      result: 'Bajó a 25 días.',
      url: 'https://atlas.example.com/casos/norte',
    },
  ]);
  const one = { client: 'A', problem: '', result: 'B' };
  assert.equal(readSolutionData({ ...full, cases: Array(5).fill(one) }), null);
  assert.equal(readSolutionData({ ...full, cases: [{ ...one, result: 'x'.repeat(401) }] }), null);
  assert.equal(readSolutionData({ ...full, cases: [{ ...one, client: 3 }] }), null);
  assert.equal(
    solutionErrors({ ...full, cases: [{ client: '', problem: '', result: 'B' }] }).cases,
    'casesInvalid',
  );
  assert.equal(
    solutionErrors({ ...full, cases: [{ ...one, url: 'javascript:alert(1)' }] }).cases,
    'casesInvalid',
  );
  const nextYear = new Date().getUTCFullYear() + 1;
  assert.equal(
    solutionErrors({ ...full, foundedYear: nextYear }).foundedYear,
    'foundedYearInvalid',
  );
});

test('a country fits when the listing serves and invoices there; never answered is soft', () => {
  assert.equal(marketFit({ serviceCountries: ['CO'], billingCountries: ['CO'] }, 'CO'), 'real');
  assert.equal(marketFit({ serviceCountries: [], billingCountries: [] }, 'CO'), 'real');
  assert.equal(marketFit({ serviceCountries: ['CO'], billingCountries: ['MX'] }, 'CO'), 'fail');
  assert.equal(marketFit({ serviceCountries: ['CO'] }, 'CO'), 'soft');
  assert.equal(marketFit({ serviceCountries: ['MX'] }, 'CO'), 'fail');
  assert.equal(marketFit({}, 'CO'), 'soft');
  assert.equal(languageFit({ supportLanguages: ['es'] }, 'es'), 'real');
  assert.equal(languageFit({ supportLanguages: ['en'] }, 'es'), 'fail');
  assert.equal(languageFit({}, 'es'), 'soft');
  // «Any country» listings match every choice without turning all countries into options.
  assert.deepEqual(
    declaredMarkets([
      { serviceCountries: [], billingCountries: [] },
      { serviceCountries: ['CO', 'MX'], billingCountries: ['CO'] },
    ]),
    ['CO'],
  );
  assert.deepEqual(declaredLanguages([{ supportLanguages: ['es', 'pt'] }, {}]), ['es', 'pt']);
});

test('a buyer in Colombia filters providers that serve and invoice in Colombia', () => {
  const listing = (name: string, extra: Partial<FilterableProduct>): FilterableProduct => ({
    name,
    description: '',
    categories: ['Cobros'],
    ...extra,
  });
  const products = [
    listing('both', { serviceCountries: ['CO', 'MX'], billingCountries: ['CO'] }),
    listing('anywhere', { serviceCountries: [], billingCountries: [] }),
    listing('serves-only', { serviceCountries: ['CO'], billingCountries: ['MX'] }),
    listing('unknown', {}),
    listing('half', { serviceCountries: ['CO'] }),
    listing('mexico', { serviceCountries: ['MX'], billingCountries: ['MX'] }),
  ];
  const placed = Object.fromEntries(
    products.map(product => [product.name, placeProduct(product, { pais: ['CO'] })]),
  );
  assert.equal(placed.both.level, 'primary');
  assert.equal(placed.anywhere.level, 'primary');
  assert.equal(placed['serves-only'].level, 'excluded');
  assert.equal(placed.mexico.level, 'excluded');
  assert.deepEqual(placed.unknown, { level: 'inferred', reasons: ['market'] });
  assert.deepEqual(placed.half, { level: 'inferred', reasons: ['market'] });
  // OR within the axis, AND with the language axis.
  assert.equal(placeProduct(products[5], { pais: ['CO', 'MX'] }).level, 'primary');
  assert.equal(
    placeProduct({ ...products[0], supportLanguages: ['en'] }, { pais: ['CO'], idioma: ['es'] })
      .level,
    'excluded',
  );
  // A saved search can keep these filters; made-up codes are refused, not dropped.
  assert.ok(
    readAlertCriteria({
      scope: 'explorar',
      topic: 'cobros',
      filters: { pais: ['CO'], idioma: ['es'] },
    }),
  );
  assert.equal(
    readAlertCriteria({ scope: 'explorar', topic: 'cobros', filters: { pais: ['XX'] } }),
    null,
  );
});

test('provider rows show only what was declared, in the reader’s language', () => {
  const labels = {
    origin: 'Origin',
    serves: 'Serves',
    bills: 'Invoices in',
    anyCountry: 'Any country',
    currencies: 'Currencies',
    languages: 'Languages',
    hours: 'Hours',
    payment: 'Payment',
    founded: 'Founded',
    team: 'Team',
    customers: 'Customers',
  };
  assert.deepEqual(providerRows({}, 'en', labels), []);
  const rows = providerRows(
    {
      originCountry: 'CO',
      serviceCountries: ['CO', 'MX'],
      billingCountries: [],
      supportLanguages: ['es'],
      teamSize: 'de-2-a-10',
    },
    'en',
    labels,
  );
  assert.deepEqual(
    rows.map(row => [row.key, row.value]),
    [
      ['origin', 'Colombia'],
      ['serves', 'Colombia, Mexico'],
      ['bills', 'Any country'],
      ['languages', 'Spanish'],
      ['team', '2 to 10 people'],
    ],
  );
});

test('the AI draft proposes provider facts only from valid codes and never writes «any»', () => {
  const site = { pages: [{ url: 'https://atlas.example.com/', title: '', text: '' }], anchors: [] };
  const { patch } = readDraftOutput(
    {
      originCountry: 'co',
      serviceCountries: ['CO', 'XX', 'mx'],
      billingCountries: [],
      currencies: ['cop', 'PESOS'],
      supportLanguages: ['ES', 'zz'],
      paymentMethods: ['tarjeta', 'trueque'],
      foundedYear: new Date().getUTCFullYear() + 3,
      supportHours: 'L-V 9 a 18 h',
      sources: [],
    },
    site as never,
  );
  assert.equal(patch.originCountry, 'CO');
  assert.deepEqual(patch.serviceCountries, ['CO', 'MX']);
  assert.equal(patch.billingCountries, undefined);
  assert.deepEqual(patch.currencies, ['COP']);
  assert.deepEqual(patch.supportLanguages, ['es']);
  assert.deepEqual(patch.paymentMethods, ['tarjeta']);
  assert.equal(patch.foundedYear, undefined);
  assert.equal(patch.supportHours, 'L-V 9 a 18 h');
  // A founder's «any country» is an answer the draft never overwrites.
  const merged = mergeSiteDraft({ ...full, serviceCountries: [] }, patch);
  assert.deepEqual(merged.data.serviceCountries, []);
  assert.deepEqual(merged.data.currencies, ['COP']);
});

test('the Markdown view lists where it operates and says cases are not confirmed', () => {
  const markdown = solutionMarkdown({
    path: '/soluciones/atlas',
    data: {
      ...full,
      serviceCountries: ['CO'],
      billingCountries: [],
      cases: [{ client: 'Norte', problem: '', result: 'Cobra en 25 días' }],
    },
    publishedAt: null,
    domainVerified: false,
    generatedAt: new Date('2026-11-17T12:00:00Z'),
  });
  assert.match(markdown, /## Dónde opera\n\n- Atiende en: Colombia\n- Factura en: Cualquier país/);
  assert.match(markdown, /sin confirmar por el cliente/);
  assert.match(markdown, /\*\*Norte\*\* · Qué cambió: Cobra en 25 días/);
  assert.ok(!markdown.includes('founder@example.com'));
});
