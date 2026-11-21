import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {nodeSpecs} from '../src/catalog/nodes.mjs';
import {nodeSpecAt, nodeExtended, NODE_SPEC_EXTENSIONS} from '../src/catalog/node-extensions.mjs';
import {CATALOG_VERSION, VERSION_ORDER, TOP_LEVEL_SINCE_FIELDS, atLeast} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {catalogRegistry, resolveChartPreset} from '../src/materials/index.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';

const NEW_KINDS = ['stacked-bar', 'scatter', 'heatmap', 'sparkline'];
const chartKinds = nodeSpecAt('chart', '2.6.0').fields.kind.enum;
const pageWithChart = (chart, catalogVersion = '2.4.0') => {
  const blueprint = createBlueprint('dashboard-overview');
  blueprint.catalogVersion = catalogVersion;
  blueprint.pageType = 'general';
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '차트'}, chart]};
  return blueprint;
};
// 새 차트 형태와 필드는 catalogVersion 2.6.0을 고른 Blueprint에서만 받는다(src/catalog/node-extensions.mjs).
const extended = chart => validateBlueprint(pageWithChart(chart, '2.6.0')).errors;
const compiled = chart => compile(pageWithChart(chart, '2.6.0'));
const sample = (kind, extra = {}) => ({
  type: 'chart', title: '월별 매출', caption: '월별 순매출, 백만 원', kind,
  unit: '백만 원', categories: ['1월', '2월', '3월'],
  series: [{name: '순매출', values: [12, 18, 15]}], ...extra,
});

test('chart node advertises reusable and separately encoded chart forms', () => {
  for (const kind of ['bar', 'bars-h', 'line', 'area', 'donut', ...NEW_KINDS]) {
    assert.ok(chartKinds.includes(kind), `${kind} is a supported chart kind in the 2.6.0 extension`);
  }
});

test('chart data domains are checked and the SVG renderer exposes intentional axis omission', () => {
  const scatter = sample('scatter', {categories: ['1', '2', '3'], series: [{name: '실측', points: [{x: 1, y: 12}, {x: 2, y: 18}, {x: 3, y: 15}]}]});
  assert.deepEqual(extended(scatter), []);
  const badScatter = structuredClone(scatter); badScatter.series[0].points[1].x = Number.NaN;
  const invalid = extended(badScatter);
  assert.ok(invalid.some(error => ['CHART_SHAPE', 'NUMBER'].includes(error.code)));

  const svg = renderChartPreset('chart-preset:mobile-sparkline', {
    categories: ['월', '화', '수', '목', '금'], series: [{name: '요청', values: [4, 8, 6, 11, 9]}],
  });
  assert.match(svg, /<svg/);
  assert.match(svg, /data-axis="omitted-intentionally"/);
  assert.doesNotMatch(svg, /class="ch-t"/);
});

test('chart presets are complete verified materials with compile-ready examples', () => {
  assert.ok(chartPresetMaterials.length >= 6);
  const registry = catalogRegistry();
  assert.deepEqual(registry.check(), []);
  const presets = registry.filter({kind: 'chart-preset', preset: true, minQuality: 'verified'});
  assert.ok(presets.length >= 6);
  assert.ok(new Set(presets.map(preset => preset.ext.chartKind)).size >= 5);
  for (const preset of presets) {
    assert.ok(preset.ext.axes && preset.ext.series && preset.ext.unit && preset.ext.labels);
    assert.ok(preset.responsive.strategy !== 'unspecified');
    assert.ok(preset.a11y.rules.length >= 2);
    assert.ok(preset.examples.length > 0);
    for (const example of preset.examples) {
      assert.deepEqual(extended(example), [], preset.id);
      const result = compiled(example);
      assert.match(result.html, /class="kit-chart"/);
      assert.match(result.html, /<table>/);
    }
  }
});

test('2.6.0 preset seam resolves ids to the existing compiler chart-node shape', () => {
  const node = resolveChartPreset('chart-preset:erp-quarterly-revenue', {
    categories: ['1분기', '2분기'],
    series: [{name: '제품', values: [40, 50]}, {name: '서비스', values: [20, 30]}],
  });
  assert.equal(node.type, 'chart');
  assert.equal(node.kind, 'stacked-bar');
  assert.deepEqual(node.axis, {showX: 'yes', showY: 'yes'});
  assert.deepEqual(extended(node), []);
  assert.match(compiled(node).html, /data-kind="stacked-bar"/);
});

test('data domains reject incompatible forms, nonfinite points, zero spans and out of domain values', () => {
  const incompatible = extended(sample('donut', {series: [
    {name: 'A', values: [2, 3, 4]}, {name: 'B', values: [4, 3, 2]},
  ]}));
  assert.ok(incompatible.some(error => error.code === 'CHART_SHAPE'));

  const distorted = extended(sample('bar', {axis: {min: 10, max: 10}}));
  assert.ok(distorted.some(error => error.code === 'CHART_AXIS'));

  const rejected = renderChartPreset('chart-preset:mobile-sparkline', {
    categories: ['월', '화', '수'], series: [{name: '요청', values: [1, Infinity, 3]}],
  });
  assert.equal(rejected.errors.some(error => error.code === 'CHART_VALUE'), true);

  const clippedStack = extended(sample('stacked-bar', {
    categories: ['1분기', '2분기', '3분기'], axis: {max: 30},
    series: [{name: '제품', values: [20, 20, 20]}, {name: '서비스', values: [20, 20, 20]}],
  }));
  assert.ok(clippedStack.some(error => error.code === 'CHART_AXIS'), 'stack totals must fit the axis');
});

test('axis and label omission are explicit, while clipping and overlap stay visible in responsive markup', () => {
  const chart = sample('stacked-bar', {
    title: '긴 범례 예시', categories: ['2026년 1분기 계획', '2026년 2분기 계획', '2026년 3분기 계획'],
    series: [{name: '매출 목표', values: [20, 22, 24]}, {name: '실제 달성', values: [18, 25, 21]}],
  });
  const result = compiled(chart);
  assert.match(result.html, /role="img"/);
  assert.match(result.html, /<table>/);
  assert.match(result.html, /stacked-bar/);
  assert.match(result.html, /class="ch-bar"/);
  assert.match(result.css, /overflow-wrap|overflow-x/);

  const denseLabels = Array.from({length: 8}, (_, i) => `2026년 ${i + 1}분기 사업계획 항목`);
  const dense = compiled(sample('bar', {
    axis: {showX: 'yes', showY: 'yes'}, categories: denseLabels,
    series: [{name: '계획', values: [1, 2, 3, 4, 5, 6, 7, 8]}],
  })).html;
  assert.match(dense, />202…<\/text>/, 'visual tick labels shorten to the plot width');
  assert.ok(dense.includes(`<th scope="row">${denseLabels[0]}</th>`), 'the table keeps full category labels');
});

test('catalog 2.4.0 and 2.5.0 reject the new chart kinds as unknown enum values and the new chart fields as unknown keys', () => {
  for (const version of ['2.4.0', '2.5.0']) {
    for (const kind of NEW_KINDS) {
      const result = validateBlueprint(pageWithChart(sample(kind), version));
      assert.equal(result.valid, false, `${version} ${kind}`);
      assert.ok(result.errors.some(error => error.code === 'ENUM' && error.path.endsWith('.kind')), `${version} ${kind} is an unknown kind value`);
    }
    for (const extra of [{axis: {showX: 'yes'}}, {xLabel: '월'}, {yLabel: '매출'}]) {
      const result = validateBlueprint(pageWithChart(sample('bar', extra), version));
      assert.ok(result.errors.some(error => error.code === 'UNKNOWN_KEY' && error.path.endsWith('.' + Object.keys(extra)[0])), `${version} ${Object.keys(extra)[0]}`);
    }
    const points = sample('bar', {series: [{name: '실측', values: [1, 2, 3], points: [{x: 1, y: 2}, {x: 2, y: 3}]}]});
    assert.ok(validateBlueprint(pageWithChart(points, version)).errors.some(error => error.code === 'UNKNOWN_KEY' && error.path.endsWith('.points')), `${version} points`);
  }
  assert.equal(validateBlueprint(pageWithChart(sample('bar'), '2.5.0')).valid, true, 'the five original kinds stay valid');
});

test('the base chart node spec keeps its 2.4.0 and 2.5.0 contract; the new shapes live only in the version extension table', () => {
  const base = nodeSpecs.chart;
  assert.deepEqual(base.fields.kind.enum, ['bar', 'bars-h', 'line', 'area', 'donut']);
  assert.deepEqual(Object.keys(base.fields), ['title', 'caption', 'kind', 'unit', 'categories', 'series']);
  assert.deepEqual(base.optional, ['unit']);
  assert.equal(base.fields.unit.maxLength, 12);
  assert.equal(base.fields.categories.items.maxLength, 16);
  assert.deepEqual(Object.keys(base.fields.series.items.properties), ['name', 'values']);
  assert.deepEqual(Object.keys(NODE_SPEC_EXTENSIONS), ['2.6.0']);
  assert.strictEqual(nodeSpecAt('chart', '2.4.0'), base);
  assert.strictEqual(nodeSpecAt('chart', '2.5.0'), base);
  assert.strictEqual(nodeSpecAt('chart', undefined), base);
  assert.strictEqual(nodeSpecAt('chart', '2.6'), base);
  assert.strictEqual(nodeSpecAt('hero', '2.6.0'), nodeSpecs.hero);
  const extension = nodeSpecAt('chart', '2.6.0');
  assert.deepEqual(Object.keys(extension.fields).sort(), [...Object.keys(base.fields), 'xLabel', 'yLabel', 'axis'].sort());
  assert.ok(Object.hasOwn(extension.fields.series.items.properties, 'points'));
});

test('only a Blueprint that selects catalogVersion 2.6.0 gets the new chart shapes, and the default creation version stays 2.4.0', () => {
  assert.equal(CATALOG_VERSION, '2.4.0');
  assert.equal(createBlueprint('dashboard-overview').catalogVersion, '2.4.0');
  const stacked = sample('stacked-bar', {series: [{name: '제품', values: [1, 2, 3]}, {name: '서비스', values: [3, 2, 1]}], xLabel: '월', yLabel: '매출', axis: {showX: 'yes', showY: 'yes'}});
  for (const version of ['2.4.0', '2.5.0']) assert.equal(validateBlueprint(pageWithChart(stacked, version)).valid, false, version);
  assert.equal(validateBlueprint(pageWithChart(stacked, '2.6.0')).valid, true);
  assert.match(compile(pageWithChart(stacked, '2.6.0')).html, /data-kind="stacked-bar"/);
  // a 2.6.0 document that uses none of the new shapes is judged by the old chart rules plus the new data checks, never looser
  assert.equal(validateBlueprint(pageWithChart(sample('bar'), '2.6.0')).valid, true);
  assert.equal(validateBlueprint(pageWithChart(sample('donut', {series: [{name: 'A', values: [1, -2, 3]}]}), '2.6.0')).valid, false);
});

test('the chart extension and the color-token 2.6.0 fields are judged by one gate: atLeast over VERSION_ORDER', () => {
  for (const since of Object.keys(NODE_SPEC_EXTENSIONS)) assert.ok(VERSION_ORDER.includes(since), `${since} must be in VERSION_ORDER or its extension never turns on`);
  const color = TOP_LEVEL_SINCE_FIELDS.find(field => field.field === 'colorPalette');
  for (const version of [...VERSION_ORDER, '2.7.0', '2.6', undefined]) {
    assert.equal(nodeExtended('chart', version), atLeast(version, '2.6.0'), `chart extension at ${version}`);
    assert.equal(nodeExtended('chart', version), atLeast(version, color.since), `chart extension and colorPalette agree at ${version}`);
    const blueprint = {...createBlueprint('saas-landing'), catalogVersion: version, colorPalette: 'static-kit'};
    assert.equal(validateBlueprint(blueprint).errors.some(error => error.code === 'VERSION_FIELD'), !atLeast(version, color.since), `colorPalette gate at ${version}`);
  }
});

test('catalogVersion 2.6.0 Blueprints validate and compile scatter, stacked-bar, heatmap and sparkline charts into deterministic HTML', () => {
  const charts = {
    scatter: sample('scatter', {categories: undefined, xLabel: '방문', yLabel: '전환', series: [{name: '표본', points: [{x: 1, y: 2}, {x: 3, y: 6}, {x: 5, y: 7}]}]}),
    'stacked-bar': sample('stacked-bar', {series: [{name: '제품', values: [4, 6, 5]}, {name: '서비스', values: [2, 3, 4]}], axis: {showX: 'yes', showY: 'yes'}}),
    heatmap: sample('heatmap', {series: [{name: '월', values: [1, 5, 3]}, {name: '화', values: [4, 2, 6]}]}),
    sparkline: sample('sparkline', {series: [{name: '요청', values: [3, 8, 5]}]}),
  };
  delete charts.scatter.categories;
  assert.deepEqual(Object.keys(charts).sort(), [...NEW_KINDS].sort());
  for (const [kind, chart] of Object.entries(charts)) {
    const blueprint = pageWithChart(chart, '2.6.0');
    assert.deepEqual(validateBlueprint(blueprint).errors, [], kind);
    const first = compile(blueprint), second = compile(structuredClone(blueprint));
    assert.match(first.html, new RegExp(`<figure[^>]* class="kit-chart" data-kind="${kind}"`), kind);
    assert.match(first.html, /<table>/, kind);
    assert.equal(first.html, second.html, `${kind} html is deterministic`);
    assert.equal(first.css, second.css, `${kind} css is deterministic`);
    for (const version of ['2.4.0', '2.5.0']) {
      const errors = validateBlueprint(pageWithChart(chart, version)).errors;
      assert.ok(errors.some(error => error.code === 'ENUM' && error.path.endsWith('.kind')), `${version} ${kind}`);
    }
  }
  assert.ok(validateBlueprint(pageWithChart(charts.scatter, '2.5.0')).errors.some(error => error.code === 'UNKNOWN_KEY'), 'points are an unknown key before 2.6.0');
});
