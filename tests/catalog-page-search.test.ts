import assert from 'node:assert/strict';
import test from 'node:test';
import { makeQueryScorer } from '../src/lib/search/score';

// Two listings in the same category, as on /explorar/cobros (SHCWS-45).
const base = { feature: 'Pymes', categories: ['Cobros'] };
const reminders = {
  ...base,
  name: 'Recordatorios QA',
  description: 'Envía recordatorios de pago a tus clientes que deben facturas.',
};
const reconciliation = {
  ...base,
  name: 'Conciliación QA',
  description: 'Concilia depósitos bancarios con facturas emitidas.',
};

test('inside a category, a word only the shared vocabulary implies narrows nothing', () => {
  const loose = makeQueryScorer('recordatorios')!;
  // The catalog-wide search keeps the vocabulary match (weak, but present)…
  assert.ok(loose(reconciliation) > 0);
  const strict = makeQueryScorer('recordatorios', { requireLiteral: true })!;
  // …the in-page search keeps only the listing that says it.
  assert.ok(strict(reminders) > 0);
  assert.equal(strict(reconciliation), 0);
  // Stems and plurals still count as the listing's own words.
  assert.ok(makeQueryScorer('conciliar depositos', { requireLiteral: true })!(reconciliation) > 0);
  assert.equal(makeQueryScorer('   ', { requireLiteral: true }), null);
});
