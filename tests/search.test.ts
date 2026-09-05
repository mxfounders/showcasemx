import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeText, tokenize } from '../src/lib/search/normalize';
import { categoryVocabulary, industryVocabulary, conceptCategories, expandVocabulary } from '../src/lib/search/vocabulary';
import { matchIndustry, matchCompanySize, isRealMatch } from '../src/lib/search/facets';
import { rankSearch } from '../src/lib/search/score';
import { searchCatalog } from '../src/lib/catalog-search';

test('normalizeText strips accents, case and punctuation to spaced tokens', () => {
  assert.equal(normalizeText('Cotización de Mayoreo, S.A.'), 'cotizacion de mayoreo s a');
  assert.equal(normalizeText('  Nómina/IMSS  '), 'nomina imss');
  assert.deepEqual(tokenize('CRM y forecast'), ['crm', 'y', 'forecast']);
});

test('every vocabulary term is already normalized (no accents, no uppercase, no punctuation)', () => {
  const all = [
    ...Object.values(categoryVocabulary).flat(),
    ...Object.values(industryVocabulary).flat(),
  ];
  for (const term of all) {
    for (const word of tokenize(term)) {
      assert.equal(word, normalizeText(word), `term "${term}" is not normalized`);
    }
  }
});

test('conceptCategories only points at real solution categories', () => {
  const legal = new Set(['Cobros', 'Finanzas', 'Nómina', 'Ventas', 'Operación', 'Legal', 'Agencias']);
  for (const [concept, cats] of Object.entries(conceptCategories)) {
    assert.ok(cats.length > 0, `${concept} maps to nothing`);
    for (const category of cats) assert.ok(legal.has(category), `${concept} -> unknown category ${category}`);
  }
});

test('matchIndustry resolves the declared tri-state before ever inferring', () => {
  // [] = "fits any" — matches every industry, the bug the old includes() had
  assert.equal(matchIndustry({ industries: [] }, 'Salud'), 'any');
  // declared and present / declared and absent
  assert.equal(matchIndustry({ industries: ['Retail'] }, 'Retail'), 'declared');
  assert.equal(matchIndustry({ industries: ['Retail'] }, 'Salud'), 'none');
  // declaring closes the question: text that screams "clínica" can't override
  // a founder who declared only Retail
  assert.equal(matchIndustry({ industries: ['Retail'], description: 'clinica hospital paciente expediente clinico' }, 'Salud'), 'none');
});

test('matchIndustry infers from text only when the field was never declared, and needs real evidence', () => {
  assert.equal(matchIndustry({ description: 'somos una agencia', feature: '' }, 'Agencias'), 'none'); // one hit is not enough
  assert.equal(matchIndustry({ description: 'agencia de consultoria con clientes B2B', feature: 'retainer' }, 'Agencias'), 'inferred');
  assert.ok(!isRealMatch('inferred'));
  assert.ok(isRealMatch('declared') && isRealMatch('any'));
});

test('matchCompanySize never infers — text does not carry company size', () => {
  assert.equal(matchCompanySize({ companySizes: [] }, 'pyme'), 'any');
  assert.equal(matchCompanySize({ companySizes: ['pyme'] }, 'pyme'), 'declared');
  assert.equal(matchCompanySize({ companySizes: ['pyme'] }, 'corporativo'), 'none');
  assert.equal(matchCompanySize({}, 'pyme'), 'none');
});

test('expandVocabulary pulls a declared category/industry’s full vocabulary', () => {
  const words = new Set(tokenize(expandVocabulary(['Ventas'], undefined).join(' ')));
  assert.ok(words.has('cotizacion'));
  assert.ok(words.has('mayoreo'));
  assert.ok(words.has('prediccion'));
  assert.deepEqual(expandVocabulary([], []), []); // "fits any" adds no flood of words
});

test('rankSearch puts full-token-coverage matches first, then by score', () => {
  const products = [
    { name: 'Alfa', description: 'cobros', feature: '', categories: ['Cobros'] },
    { name: 'Beta cobros facturacion', description: '', feature: '', categories: ['Cobros'] },
  ];
  const ranked = rankSearch('cobros facturacion', products);
  assert.equal(ranked[0].name, 'Beta cobros facturacion'); // matches both tokens
});

test('searchCatalog finds Cord by Ventas concepts its own copy never uses', () => {
  for (const query of ['mayoreo', 'cotización', 'cotizacion', 'predicción', 'CRM', 'forecast', 'pipeline']) {
    assert.ok(searchCatalog(query).some(p => p.name === 'Cord'), `"${query}" did not surface Cord`);
  }
});

test('searchCatalog keeps its precision guardrails', () => {
  assert.deepEqual(searchCatalog('quiero cobrar a tiempo').map(p => p.name), ['Cord']);
  assert.deepEqual(searchCatalog('Necesito una tienda online').map(p => p.name), ['Flouvia']);
  assert.equal(searchCatalog('nómina').length, 0); // no real product serves Nómina — honest empty
  assert.equal(searchCatalog('inexistente').length, 0);
});

test('stem-lite folds singular/plural without a stemmer', () => {
  // "cotizacion" (singular) must find copy that says "cotizaciones"
  const fake = [{ name: 'Quincena', description: 'Timbra la cotizaciones del mes', feature: 'cotizaciones', categories: ['Ventas'] }];
  assert.equal(rankSearch('cotizacion', fake).length, 1);
});
