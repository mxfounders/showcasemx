import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryPositionsFrom, visibleMedian } from '../src/lib/metrics/founder';

test('catalog position counts only listings in the same category, in catalog order', () => {
  const ordered = [
    { id: 'a', name: 'A', categories: ['Cobros'] },
    { id: 'mine', name: 'Mía', categories: ['Ventas', 'Cobros'] },
    { id: 'b', name: 'B', categories: ['Ventas'] },
    { id: 'c', name: 'C', categories: ['Cobros'] },
  ];
  assert.deepEqual(categoryPositionsFrom(ordered, new Set(['mine'])), [
    { id: 'mine', name: 'Mía', category: 'Ventas', position: 1, total: 2 },
    { id: 'mine', name: 'Mía', category: 'Cobros', position: 2, total: 3 },
  ]);
  assert.deepEqual(categoryPositionsFrom(ordered, new Set(['nobody'])), []);
});

test('a peer comparison needs at least three other listings', () => {
  assert.equal(visibleMedian(0, null), null);
  assert.equal(visibleMedian(1, 40), null, 'one competitor would be exposed');
  assert.equal(visibleMedian(2, 40), null);
  assert.equal(visibleMedian(3, 40), 40);
  assert.equal(visibleMedian(8, 0), 0);
  assert.equal(visibleMedian(5, Number.NaN), null);
});
