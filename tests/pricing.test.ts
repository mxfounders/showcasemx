import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readSolutionData,
  solutionErrors,
  solutionPriceBands,
  solutionPriceUnits,
  type SolutionData,
} from '../src/lib/solutions/model';
import {
  derivePriceBand,
  effectivePriceBand,
  formatPriceFrom,
  matchesPricingModel,
  priceBandFamilies,
  priceBandFamily,
  priceSummary,
  pricingModelLabels,
} from '../src/lib/solutions/pricing';
import { currencyOptions, formatMoney, isCurrencyCode } from '../src/lib/currencies';
import { localizedPriceUnitSuffix } from '../src/lib/taxonomy';
import { placeProduct } from '../src/lib/search/catalog-filter';
import { readAlertCriteria } from '../src/lib/alerts/model';
import { solutionJsonLd } from '../src/lib/structured-data';
import { solutionMarkdown } from '../src/lib/machine-readable';
import { sectionFilled } from '../src/lib/solutions/questions';

const base = {
  name: 'Atlas',
  kind: 'Agencia',
  category: 'Ventas',
  problem: 'Diseñamos y lanzamos tu tienda en línea completa.',
  audience: 'Marcas que venden en línea',
  website: 'https://atlas.example',
  contactEmail: 'hola@atlas.example',
};

test('the entry price validates its amount, ISO currency and unit, and stays optional', () => {
  const read = readSolutionData({
    ...base,
    priceFrom: 1499.999,
    priceCurrency: 'MXN',
    priceUnit: 'por-proyecto',
  });
  assert.equal(read?.priceFrom, 1500, 'rounded to cents');
  assert.equal(read?.priceCurrency, 'MXN');
  assert.equal(read?.priceUnit, 'por-proyecto');
  // Absent stays absent: nothing is defaulted, least of all a currency.
  const bare = readSolutionData(base);
  assert.equal(bare?.priceFrom, undefined);
  assert.equal(bare?.priceCurrency, undefined);
  assert.equal(readSolutionData({ ...base, priceFrom: 0 })?.priceFrom, 0);
  for (const bad of [
    { priceFrom: -1 },
    { priceFrom: '29' },
    { priceFrom: 1e11 },
    { priceFrom: null },
    { priceCurrency: 'usd' },
    { priceCurrency: 'ABC' },
    { priceCurrency: 'US' },
    { priceUnit: 'comision' },
    { priceUnit: 'solo-cotizar' },
    { priceUnit: 'mensual' },
    { priceBand: 'proyecto-barato' },
  ])
    assert.equal(readSolutionData({ ...base, ...bad }), null, JSON.stringify(bad));
  // Bands stored before SHCWS-51 still read, next to the new per-project ones.
  for (const band of ['menos-1000', 'mas-50000', 'depende-alcance', 'proyecto-1000-a-5000'])
    assert.equal(readSolutionData({ ...base, priceBand: band })?.priceBand, band);
});

test('a price above zero needs its currency and unit to be submitted; a free plan does not', () => {
  const data = readSolutionData(base) as SolutionData;
  assert.equal(solutionErrors({ ...data, priceFrom: 500 }).priceFrom, 'priceIncomplete');
  assert.equal(
    solutionErrors({ ...data, priceFrom: 500, priceCurrency: 'USD' }).priceFrom,
    'priceIncomplete',
  );
  assert.equal(
    solutionErrors({ ...data, priceFrom: 500, priceCurrency: 'USD', priceUnit: 'por-proyecto' })
      .priceFrom,
    undefined,
  );
  assert.equal(solutionErrors({ ...data, priceFrom: 0 }).priceFrom, undefined);
  assert.equal(solutionErrors(data).priceFrom, undefined, 'price stays optional to publish');
  assert.ok(sectionFilled({ ...data, priceFrom: 0 }, 'pricing'));
});

test('the band set offered follows the pricing model', () => {
  assert.deepEqual(priceBandFamilies(['suscripcion-mensual']), ['monthly']);
  assert.deepEqual(priceBandFamilies(['suscripcion-anual', 'por-uso']), ['monthly']);
  assert.deepEqual(priceBandFamilies(['por-proyecto']), ['project']);
  assert.deepEqual(priceBandFamilies(['por-hora', 'pago-unico']), ['project']);
  assert.deepEqual(priceBandFamilies(['suscripcion-mensual', 'por-proyecto']), [
    'monthly',
    'project',
  ]);
  // Nothing (or only «quote») says which family fits: both are offered.
  assert.deepEqual(priceBandFamilies(undefined), ['monthly', 'project']);
  assert.deepEqual(priceBandFamilies(['solo-cotizar']), ['monthly', 'project']);
  assert.equal(priceBandFamily('de-1000-a-5000'), 'monthly');
  assert.equal(priceBandFamily('proyecto-mas-50000'), 'project');
  assert.equal(priceBandFamily('depende-alcance'), null);
  // Every band belongs to one family, except «Depende del alcance».
  for (const band of solutionPriceBands)
    assert.equal(priceBandFamily(band) === null, band === 'depende-alcance', band);
});

test('a USD price implies its band; other currencies and per-use prices never do', () => {
  const usd = (priceFrom: number, priceUnit: string) =>
    derivePriceBand({ priceFrom, priceCurrency: 'USD', priceUnit });
  assert.equal(usd(29, 'suscripcion-mensual'), 'menos-1000');
  assert.equal(usd(50, 'suscripcion-mensual'), 'de-1000-a-5000');
  assert.equal(usd(2500, 'suscripcion-mensual'), 'mas-50000');
  assert.equal(usd(1200, 'suscripcion-anual'), 'de-1000-a-5000', '1,200 a year is 100 a month');
  assert.equal(usd(800, 'por-proyecto'), 'proyecto-menos-1000');
  assert.equal(usd(12000, 'por-proyecto'), 'proyecto-5000-a-20000');
  assert.equal(usd(50000, 'pago-unico'), 'proyecto-mas-50000');
  assert.equal(usd(80, 'por-hora'), undefined);
  assert.equal(usd(0.5, 'por-uso'), undefined);
  assert.equal(
    derivePriceBand({ priceFrom: 900, priceCurrency: 'MXN', priceUnit: 'suscripcion-mensual' }),
    undefined,
    'no exchange rate, no guess',
  );
  // A declared band always wins over the derived one.
  assert.equal(
    effectivePriceBand({
      priceFrom: 29,
      priceCurrency: 'USD',
      priceUnit: 'suscripcion-mensual',
      priceBand: 'de-5000-a-20000',
    }),
    'de-5000-a-20000',
  );
});

test('«Desde» is shown in the founder currency with its code and unit, in both languages', () => {
  const monthly = { priceFrom: 29, priceCurrency: 'USD', priceUnit: 'suscripcion-mensual' };
  assert.equal(formatPriceFrom(monthly, 'es'), 'Desde $29 USD/mes');
  assert.equal(formatPriceFrom(monthly, 'en'), 'From $29 USD/month');
  assert.equal(
    formatPriceFrom({ priceFrom: 15000, priceCurrency: 'MXN', priceUnit: 'por-proyecto' }, 'es'),
    'Desde $15,000 MXN por proyecto',
  );
  assert.equal(
    formatPriceFrom({ priceFrom: 9.5, priceCurrency: 'EUR', priceUnit: 'pago-unico' }, 'en'),
    'From €9.50 EUR, one-time',
  );
  // A currency written as its code is not repeated.
  const chf = formatPriceFrom(
    { priceFrom: 120, priceCurrency: 'CHF', priceUnit: 'por-hora' },
    'en',
  );
  assert.equal(chf?.match(/CHF/g)?.length, 1);
  assert.ok(chf?.endsWith('/hour'));
  assert.equal(formatPriceFrom({ priceFrom: 0 }, 'es'), 'Plan gratuito');
  assert.equal(formatPriceFrom({ priceFrom: 0 }, 'en'), 'Free plan');
  // Incomplete or absent: nothing, never a bare number.
  assert.equal(formatPriceFrom({ priceFrom: 500 }, 'es'), null);
  assert.equal(formatPriceFrom({}, 'es'), null);
  assert.equal(formatMoney(1500, 'MXN', 'es'), '$1,500 MXN');
  // Every unit has a suffix in both languages.
  for (const unit of solutionPriceUnits) {
    assert.ok(localizedPriceUnitSuffix(unit, 'es'), `${unit} has no Spanish suffix`);
    assert.ok(localizedPriceUnitSuffix(unit, 'en'), `${unit} has no English suffix`);
    assert.notEqual(localizedPriceUnitSuffix(unit, 'en'), localizedPriceUnitSuffix(unit, 'es'));
  }
});

test('a card shows the price it declared, falling back to band, model, then nothing', () => {
  assert.equal(
    priceSummary({ priceFrom: 29, priceCurrency: 'USD', priceUnit: 'suscripcion-mensual' }, 'es'),
    'Desde $29 USD/mes',
  );
  assert.equal(
    priceSummary({ priceBand: 'proyecto-1000-a-5000', pricingModel: ['por-proyecto'] }, 'en'),
    '$1,000–$5,000 USD per project',
  );
  assert.equal(
    priceSummary({ pricingModel: ['solo-cotizar', 'por-proyecto'] }, 'es'),
    'Por proyecto · Solo a cotizar',
  );
  assert.equal(priceSummary({ priceBand: 'depende-alcance' }, 'es'), 'Depende del alcance');
  assert.equal(priceSummary({}, 'es'), null);
  // The unit of the price counts as a declared model.
  assert.deepEqual(pricingModelLabels({ priceUnit: 'por-hora' }, 'en'), ['Per hour']);
  assert.ok(matchesPricingModel({ priceUnit: 'por-hora' }, 'por-hora'));
  assert.ok(!matchesPricingModel({ pricingModel: ['por-uso'] }, 'por-hora'));
});

test('the catalog filters by band (declared or from a USD price) and by pricing model', () => {
  const saas = {
    categories: ['Ventas'],
    priceFrom: 29,
    priceCurrency: 'USD',
    priceUnit: 'suscripcion-mensual',
    pricingModel: ['suscripcion-mensual'],
  };
  const agency = {
    categories: ['Ventas'],
    priceFrom: 90000,
    priceCurrency: 'MXN',
    priceUnit: 'por-proyecto',
    pricingModel: ['por-proyecto'],
    priceBand: 'proyecto-5000-a-20000',
  };
  const mxnNoBand = { ...agency, priceBand: undefined };
  const place = (product: object, selections: Record<string, string[]>) =>
    placeProduct(product, selections).level;
  assert.equal(place(saas, { precio: ['menos-1000'] }), 'primary');
  assert.equal(place(saas, { precio: ['proyecto-5000-a-20000'] }), 'excluded');
  assert.equal(place(agency, { precio: ['proyecto-5000-a-20000'] }), 'primary');
  assert.equal(place(mxnNoBand, { precio: ['proyecto-5000-a-20000'] }), 'excluded');
  assert.equal(place(agency, { contratacion: ['por-proyecto'] }), 'primary');
  assert.equal(place(saas, { contratacion: ['por-proyecto'] }), 'excluded');
  assert.equal(place(saas, { contratacion: ['por-proyecto', 'suscripcion-mensual'] }), 'primary');
  assert.equal(place({ categories: ['Ventas'] }, { contratacion: ['por-hora'] }), 'excluded');
  // A saved alert accepts the new axis with its legal values only.
  assert.ok(
    readAlertCriteria({
      scope: 'explorar',
      topic: 'ventas',
      query: '',
      filters: { contratacion: ['por-proyecto'], precio: ['proyecto-1000-a-5000'] },
    }),
  );
  assert.equal(
    readAlertCriteria({
      scope: 'explorar',
      topic: 'ventas',
      query: '',
      filters: { contratacion: ['regalado'] },
    }),
    null,
  );
});

test('the declared price reaches JSON-LD and the Markdown listing, and only then', () => {
  const data = {
    ...base,
    kind: 'Software',
    priceFrom: 29,
    priceCurrency: 'USD',
    priceUnit: 'suscripcion-mensual',
    pricingModel: ['suscripcion-mensual'],
  };
  const ld = solutionJsonLd({
    id: 'abc',
    locale: 'es',
    data,
    publishedAt: null,
    reviews: { count: 0, average: null },
  });
  assert.ok('offers' in ld);
  assert.deepEqual(ld.offers, {
    '@type': 'AggregateOffer',
    lowPrice: 29,
    priceCurrency: 'USD',
    url: 'https://shwcs.site/es/soluciones/abc',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: 29,
      priceCurrency: 'USD',
      unitCode: 'MON',
    },
  });
  const noCurrency = solutionJsonLd({
    id: 'abc',
    locale: 'es',
    data: { ...data, priceCurrency: undefined },
    publishedAt: null,
    reviews: { count: 0, average: null },
  });
  assert.equal('offers' in noCurrency, false);
  const markdown = solutionMarkdown({
    id: '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f',
    data,
    publishedAt: null,
    domainVerified: false,
    generatedAt: new Date('2026-11-14T12:00:00Z'),
  });
  assert.match(markdown, /- Precio de entrada: Desde \$29 USD\/mes/);
  assert.match(markdown, /- Modelo: Suscripción mensual/);
});

test('currencies come from Intl: any ISO code, frequent ones first, none preselected', () => {
  assert.ok(isCurrencyCode('MXN'));
  assert.ok(isCurrencyCode('JPY'));
  assert.ok(!isCurrencyCode('usd'));
  assert.ok(!isCurrencyCode('XYZ'));
  assert.ok(!isCurrencyCode(840));
  const { frequent, all } = currencyOptions('es');
  assert.equal(frequent[0].value, 'USD');
  assert.ok(frequent.some(option => option.value === 'MXN'));
  assert.ok(all.length > 100, 'any market, not a short list');
  const codes = [...frequent, ...all].map(option => option.value);
  assert.equal(new Set(codes).size, codes.length, 'no currency listed twice');
  assert.match(frequent.find(option => option.value === 'MXN')!.label, /^MXN · /);
});
