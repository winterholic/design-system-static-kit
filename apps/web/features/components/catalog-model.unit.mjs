import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG_CATEGORIES, classifyCatalogMaterial, filterCatalogMaterials,
  readCatalogQuery, writeCatalogQuery, paginateCatalogMaterials, classificationLabels, KIND_LABELS,
} from './catalog-model.mjs';

const manifest = {requirements: [
  {id: 'req:comp:o-02-bottom-navigation', section: '§6.2 O', name: 'Bottom Navigation', materialIds: ['purpose:navigation.bottom']},
  {id: 'req:comp:a-01-button', section: '§6.2 A', name: 'Button', materialIds: ['component:button-control']},
]};

test('declares all 17 catalog categories, including All', () => {
  assert.equal(CATALOG_CATEGORIES.length, 17);
  assert.deepEqual(CATALOG_CATEGORIES.map(({id}) => id), [
    'all', 'buttons', 'inputs', 'selection', 'date-time', 'navigation', 'cards', 'data', 'charts',
    'overlays', 'feedback', 'information', 'media', 'layouts', 'work-patterns', 'commerce', 'mobile',
  ]);
});

test('classifies a newly registered material from its manifest requirement without a hand-maintained item list', () => {
  const temporary = {id: 'purpose:navigation.bottom', kind: 'purpose-family', label: 'Bottom Navigation', category: 'purpose-family', requirementIds: ['req:comp:o-02-bottom-navigation'], tags: ['mobile'], contexts: ['mobile']};
  const [registered] = [temporary].map(material => ({...material, relatedCategories: classifyCatalogMaterial(material, manifest)}));
  assert.deepEqual(registered.relatedCategories, ['mobile']);
  assert.deepEqual(filterCatalogMaterials([registered], {category: 'mobile'}), [registered]);
  assert.deepEqual(filterCatalogMaterials([registered], {category: 'all', q: 'bottom'}), [registered]);
});

test('search covers the full material index while an unfiltered category view uses only assigned categories', () => {
  const first = {id: 'component:button-control', label: 'Action Button', purpose: 'Submit a form', relatedCategories: classifyCatalogMaterial({id: 'component:button-control', requirementIds: ['req:comp:a-01-button']}, manifest)};
  const later = {id: 'purpose:navigation.bottom', label: 'Bottom Navigation', purpose: 'Mobile wayfinding', relatedCategories: ['mobile']};
  const all = [first, later];
  assert.deepEqual(filterCatalogMaterials(all, {category: 'all', q: 'wayfinding'}), [later]);
  assert.deepEqual(filterCatalogMaterials(all, {category: 'buttons', q: ''}), [first]);
  assert.deepEqual(filterCatalogMaterials(all, {category: 'navigation', q: ''}), []);
  assert.deepEqual(filterCatalogMaterials(all, {category: 'navigation', q: 'wayfinding'}), [later]);
});

test('URL query preserves category, search, and page and paginates at 24 cards', () => {
  const query = readCatalogQuery(new URLSearchParams('category=mobile&q=bottom&page=2'));
  assert.deepEqual(query, {category: 'mobile', q: 'bottom', page: 2});
  assert.equal(writeCatalogQuery(query), 'category=mobile&q=bottom&page=2');
  const result = paginateCatalogMaterials(Array.from({length: 57}, (_, i) => i), 2);
  assert.equal(result.items.length, 24);
  assert.equal(result.items[0], 24);
  assert.equal(result.pages, 3);
});

test('chart presets land in the charts category through their §9.1 requirement, and §9.2 layout patterns do not', () => {
  const chartManifest = {requirements: [
    {id: 'req:chart:14-bubble', section: '§9.1', name: 'Bubble', materialIds: ['chart-preset:analytics-bubble-segments']},
    {id: 'req:chart:15-x', section: '§9.10', name: 'Other', materialIds: []},
  ], materials: [{id: 'chart-preset:analytics-bubble-segments', requirementIds: ['req:chart:14-bubble']}]};
  assert.deepEqual(classifyCatalogMaterial({id: 'chart-preset:analytics-bubble-segments', kind: 'chart-preset'}, chartManifest), ['charts']);
  assert.deepEqual(classifyCatalogMaterial({id: 'x:y', requirementIds: ['req:chart:15-x']}, chartManifest), [], '§9.10 is not §9.1');
});

test('search results always show a classification: the category when there is one, otherwise the material kind', () => {
  assert.deepEqual(classificationLabels({kind: 'chart-preset', relatedCategories: ['charts']}), ['차트']);
  assert.deepEqual(classificationLabels({kind: 'palette', relatedCategories: []}), ['팔레트']);
  assert.deepEqual(classificationLabels({kind: 'brand-new-kind'}), ['brand-new-kind'], 'an unknown kind is shown as is, never blank or "준비 중"');
  for (const kind of Object.keys(KIND_LABELS)) assert.ok(KIND_LABELS[kind].trim(), kind);
});
