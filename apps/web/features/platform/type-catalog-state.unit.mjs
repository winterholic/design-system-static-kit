import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTypeSelection, toggleTypeSelection, typeCatalogHref, typeCatalogPage, TYPE_CATALOG_PAGE_SIZE} from './type-catalog-state.mjs';

test('typography compare restores only valid unique systems and never selects more than four', () => {
  const valid = new Set(['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(normalizeTypeSelection('a,b,a,unknown,c,d,e', valid), ['a', 'b', 'c', 'd']);
  assert.deepEqual(toggleTypeSelection(['a', 'b', 'c', 'd'], 'e'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(toggleTypeSelection(['a', 'b', 'c', 'd'], 'c'), ['a', 'b', 'd']);
});

test('typography catalog URL patches preserve unrelated comparison and filter state', () => {
  assert.equal(typeCatalogHref('with=a%2Cb&sample=commerce&q=bank&family=finance&page=2', {page: 1}), '/materials/typography?with=a%2Cb&sample=commerce&q=bank&family=finance');
});

test('typography catalog pages are clamped and initial catalog batches stay at 24 or fewer', () => {
  assert.equal(TYPE_CATALOG_PAGE_SIZE, 24);
  assert.equal(typeCatalogPage('99', 2), 2);
  assert.equal(typeCatalogPage('nope', 2), 1);
});
