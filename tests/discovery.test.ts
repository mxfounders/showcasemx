import assert from 'node:assert/strict';
import test from 'node:test';
import { searchCatalog } from '../src/lib/catalog-search';
import { staticArtFor } from '../src/lib/catalog-preview';

test('Spanish intent, accents and deduplication', () => {
  assert.deepEqual(
    searchCatalog('quiero cobrar a tiempo').map(p => p.name),
    ['Cord'],
  );
  assert.deepEqual(
    searchCatalog('Necesito una tienda online').map(p => p.name),
    ['Flouvia'],
  );
  assert.deepEqual(
    searchCatalog('AUTOMATIZACIÓN').map(p => p.name),
    ['Flouvia'],
  );
  assert.equal(searchCatalog('Flouvia').length, 2); // provider and offering both relevant
  assert.equal(searchCatalog('nómina').length, 0);
  assert.equal(searchCatalog('quiero una solución').length, 0);
  assert.equal(searchCatalog('inexistente').length, 0);
});

test('the hero only suggests categories and searches that lead to results', async () => {
  const { heroSuggestions } = await import('../src/lib/catalog-search');
  const { previewCategories } = await import('../src/lib/catalog-preview');
  const { getDictionary } = await import('../src/i18n/get-dictionary');
  // What the home renders without demo projects: only real projects (with a site).
  const realOnly = previewCategories.map(category => ({
    ...category,
    products: category.products.filter(product => product.website),
  }));
  for (const locale of ['es', 'en']) {
    const examples = (await getDictionary(locale)).landing.heroSearchExamples;
    const suggested = heroSuggestions(realOnly, examples);
    assert.ok(suggested.examples.length > 0, `${locale}: no example works`);
    for (const example of suggested.examples)
      assert.ok(searchCatalog(example, realOnly).length > 0, `${locale}: «${example}» is empty`);
    assert.ok(suggested.chips.length > 0);
    for (const chip of suggested.chips) assert.ok(chip.products.length > 0, chip.id);
  }
  const es = heroSuggestions(realOnly, (await getDictionary('es')).landing.heroSearchExamples);
  assert.ok(!es.chips.some(chip => chip.id === 'nomina'), 'no project declares Nómina');
  assert.ok(!es.examples.includes('necesito organizar mi nómina'));
  // An empty catalog suggests nothing at all instead of dead ends.
  const empty = heroSuggestions(
    realOnly.map(category => ({ ...category, products: [] })),
    ['quiero cobrar a tiempo'],
  );
  assert.deepEqual(empty, { chips: [], examples: [] });
});

test('shipped art follows the catalog key, or else the exact host of the website', () => {
  assert.equal(staticArtFor('cord', undefined)?.favicon, '/images/catalog/cord-favicon.svg');
  // A published listing without a catalog_key (production's Cord) still gets its logo.
  assert.equal(staticArtFor(null, 'https://cordhq.app')?.catalogId, 'cord');
  assert.equal(staticArtFor(null, 'https://www.flouvia.com/casos')?.catalogId, 'flouvia');
  // A linked key wins over the host, and other hosts get nothing.
  assert.equal(staticArtFor('flouvia', 'https://cordhq.app/')?.catalogId, 'flouvia');
  assert.equal(staticArtFor(null, 'https://cordhq.app.example.com'), undefined);
  assert.equal(staticArtFor(null, 'not a url'), undefined);
  assert.equal(staticArtFor(null, undefined), undefined);
});
