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
  // 자기 자신만 가리키는 관계뿐인 부품은 Composition 탭에 보일 정보가 없다(아래 'exposed tabs carry real data' 시험).
  assert.deepEqual(buildTabs(catalogDetailView('component:stack')).map(tab => tab.id), ['overview', 'code']);
  assert.deepEqual(buildTabs(catalogDetailView('component:responsive-grid')).map(tab => tab.id), ['overview', 'code', 'composition']);
  assert.deepEqual(playgroundAxes(catalogDetailView('component:stack')), []);
  // 배치 원형 6개는 접근성 규칙·역할·키보드 계약이 모두 비어 있어 Accessibility 탭을 열지 않는다.
  assert.deepEqual(buildTabs(catalogDetailView('layout-primitive:stack')).map(tab => tab.id), ['overview', 'code']);
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

test('layout density options mark values the layout rejects as incompatible with the Core reason before selection', () => {
  for (const [id, rejected] of [['layout:bento', 'compact'], ['layout:dashboard-grid', 'spacious'], ['layout:settings-layout', 'compact']]) {
    const view = catalogDetailView(id);
    const option = view.playground.axes.density.find(item => item.value === rejected);
    assert.equal(option.ok, false, id);
    assert.match(option.reason, new RegExp(`${id}는 ${rejected} 밀도를 받지 않습니다`), id);
    assert.equal(exportCatalogDetail(view, {density: rejected}).ok, false, id);
    for (const value of view.material.density.allowed) {
      assert.equal(view.playground.axes.density.find(item => item.value === value).ok, true, `${id} ${value}`);
      assert.equal(exportCatalogDetail(view, {density: value}).ok, true, `${id} ${value}`);
    }
  }
  assert.ok(catalogDetailView('layout:equal-grid').playground.axes.density.every(item => item.ok), 'a layout that accepts all densities disables nothing');
  assert.ok(catalogDetailView('chart-preset:erp-quarterly-revenue').playground.axes.density.every(item => item.ok));
});

test('exposed tabs carry real data: empty accessibility and self-referencing composition tabs are hidden, layout slots are slots', () => {
  for (const row of catalogDetailRows().filter(item => item.kind === 'layout-primitive')) {
    const view = catalogDetailView(row.type);
    const a11y = view.material.a11y ?? {};
    const hasData = Boolean(a11y.rules?.length || a11y.role || a11y.keyboard);
    assert.equal(buildTabs(view).some(tab => tab.id === 'accessibility'), hasData, row.type);
  }
  for (const id of ['component:stack', 'component:container', 'component:resizable-panel']) {
    assert.ok(!buildTabs(catalogDetailView(id)).some(tab => tab.id === 'composition'), `${id} has no relation other than itself`);
  }
  for (const id of ['component:responsive-grid', 'component:center', 'component:sticky-region', 'component:scroll-area']) {
    const view = catalogDetailView(id);
    assert.ok(buildTabs(view).some(tab => tab.id === 'composition'), id);
    assert.ok(view.detail.composition.related.length >= 1 && !view.detail.composition.related.includes(id), id);
    assert.equal(new Set(view.detail.composition.related).size, view.detail.composition.related.length, `${id} lists each relation once`);
  }
  const bento = catalogDetailView('layout:bento');
  assert.deepEqual(bento.detail.composition.slots, ['head (0–1)', 'tiles (3–6)']);
  assert.deepEqual(bento.detail.composition.related, []);
  assert.deepEqual([bento.children.min, bento.children.max], [3, 7]);
});

test('chart presets expose the density axis only when Core renders more than one density for them', () => {
  const donut = catalogDetailView('chart-preset:marketing-channel-share');
  assert.deepEqual(playgroundAxes(donut), [], 'a donut accepts no density option, so no axis can change its output');
  assert.ok(!buildTabs(donut).some(tab => tab.id === 'playground'));
  for (const row of catalogDetailRows().filter(item => item.kind === 'chart-preset')) {
    const view = catalogDetailView(row.type);
    const axes = playgroundAxes(view);
    assert.equal(exportCatalogDetail(view, {}).ok, true, row.type);
    if (!axes.length) { assert.equal(exportCatalogDetail(view, {density: 'compact'}).ok, false, row.type); continue; }
    const densities = ['compact', 'comfortable', 'spacious'].filter(value => exportCatalogDetail(view, {density: value}).ok);
    assert.ok(densities.length > 1, row.type);
    assert.deepEqual(view.playground.axes.density.filter(option => option.ok).map(option => option.value), densities, row.type);
  }
});
