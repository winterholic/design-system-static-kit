import test from 'node:test';
import assert from 'node:assert/strict';
import {DETAIL_TABS, buildTabs, playgroundAxes} from './detail-model.mjs';
import {catalogDetailRows, catalogDetailView, exportCatalogDetail} from './material-detail.mjs';

test('81 chart and layout materials resolve to detail routes with type-specific visible tabs and axes', () => {
  const rows = catalogDetailRows();
  assert.equal(rows.length, 81);
  assert.deepEqual(Object.fromEntries(['chart-preset', 'layout', 'layout-component', 'layout-primitive'].map(kind => [kind, rows.filter(row => row.kind === kind).length])), {
    'chart-preset': 44, layout: 24, 'layout-component': 7, 'layout-primitive': 6,
  });
  for (const row of rows) {
    const view = catalogDetailView(row.type);
    assert.ok(view, row.type);
    assert.equal(buildTabs(view).some(tab => tab.id === 'playground'), playgroundAxes(view).length > 0, row.type);
    assert.ok(buildTabs(view).every(tab => DETAIL_TABS.some(known => known.id === tab.id)), row.type);
    assert.ok(!buildTabs(view).some(tab => tab.id === 'states' || tab.id === 'sizes'), row.type);
  }
  const encodedChartId = encodeURIComponent('chart-preset:erp-quarterly-revenue');
  assert.equal(catalogDetailView(encodedChartId).type, 'chart-preset:erp-quarterly-revenue', 'Next route params may encode the colon in an id');
  assert.deepEqual(buildTabs(catalogDetailView('chart-preset:erp-quarterly-revenue')).map(tab => tab.id), ['overview', 'playground', 'tokens', 'code', 'accessibility']);
  assert.deepEqual(playgroundAxes(catalogDetailView('chart-preset:erp-quarterly-revenue')), ['density']);
  assert.deepEqual(buildTabs(catalogDetailView('layout:bento')).map(tab => tab.id), ['overview', 'playground', 'code', 'composition']);
  assert.deepEqual(playgroundAxes(catalogDetailView('layout:bento')), ['density', 'mode']);
  assert.deepEqual(buildTabs(catalogDetailView('component:stack')).map(tab => tab.id), ['overview', 'code', 'composition']);
  assert.deepEqual(playgroundAxes(catalogDetailView('component:stack')), []);
  assert.deepEqual(buildTabs(catalogDetailView('layout-primitive:stack')).map(tab => tab.id), ['overview', 'code', 'accessibility']);
  assert.deepEqual(playgroundAxes(catalogDetailView('layout-primitive:stack')), []);
});

test('each material kind previews the exact HTML bytes returned by Code export', () => {
  const examples = [
    'chart-preset:erp-quarterly-revenue',
    'layout:bento',
    'component:stack',
    'layout-primitive:stack',
  ];
  for (const type of examples) {
    const view = catalogDetailView(type);
    assert.ok(view, type);
    const result = exportCatalogDetail(view, {});
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.files['index.html'], result.previewHtml, `${type} preview/export byte equality`);
    assert.ok(result.files['tokens.css']);
    assert.ok(result.files['tokens.json']);
    assert.ok(result.files['blueprint.json']);
  }
});

test('chart input validation and layout assembly rejection produce no preview HTML', () => {
  const chart = catalogDetailView('chart-preset:mobile-sparkline');
  const rejectedChart = exportCatalogDetail(chart, {density: 'heavy'});
  assert.equal(rejectedChart.ok, false);
  assert.equal(rejectedChart.previewHtml, undefined);
  assert.match(exportCatalogDetail(chart, {mode: 'dark'}).reason, /mode 축을 받지 않습니다/);
  const layout = catalogDetailView('layout:bento');
  const rejectedLayout = exportCatalogDetail(layout, {density: 'heavy'});
  assert.equal(rejectedLayout.ok, false);
  assert.equal(rejectedLayout.previewHtml, undefined);
});
