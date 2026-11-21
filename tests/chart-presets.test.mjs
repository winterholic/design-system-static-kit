import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {nodeSpecs} from '../src/catalog/nodes.mjs';
import {nodeSpecAt, NODE_SPEC_EXTENSIONS} from '../src/catalog/node-extensions.mjs';
import {ACCEPTED_CATALOG_VERSIONS} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {renderChart} from '../src/render/chart.mjs';
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
// 2.6.0은 아직 받는 버전이 아니므로 2.6.0 문서는 버전 오류를 낸다. 그 오류만 빼면 확장 명세로 노드를 검사한 결과다.
const extended = chart => validateBlueprint(pageWithChart(chart, '2.6.0')).errors.filter(error => error.path !== '$.catalogVersion');
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
      const html = renderChart(example, 'preset-example');
      assert.match(html, /class="kit-chart"/);
      assert.match(html, /<table>/);
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
  assert.match(renderChart(node, 'seam'), /data-kind="stacked-bar"/);
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
  const html = renderChart(chart, 'stacked');
  assert.match(html, /role="img"/);
  assert.match(html, /<table>/);
  assert.match(html, /stacked-bar/);
  assert.match(html, /class="ch-bar"/);
  assert.match(compile(pageWithChart(sample('bar'))).css, /overflow-wrap|overflow-x/);

  const denseLabels = Array.from({length: 8}, (_, i) => `2026년 ${i + 1}분기 사업계획 항목`);
  const dense = renderChart(sample('bar', {
    axis: {showX: 'yes', showY: 'yes'}, categories: denseLabels,
    series: [{name: '계획', values: [1, 2, 3, 4, 5, 6, 7, 8]}],
  }), 'dense');
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
  assert.strictEqual(nodeSpecAt('chart', '2.6.1'), extension);
});

test('2.6.0 stays inactive: the validator still refuses a 2.6.0 document and the accepted version list is unchanged', () => {
  assert.deepEqual([...ACCEPTED_CATALOG_VERSIONS], ['2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0']);
  const result = validateBlueprint(pageWithChart(sample('stacked-bar', {series: [{name: '제품', values: [1, 2, 3]}, {name: '서비스', values: [3, 2, 1]}]}), '2.6.0'));
  assert.ok(result.errors.some(error => error.code === 'CATALOG_VERSION'));
  assert.deepEqual(result.errors.filter(error => error.path !== '$.catalogVersion'), [], 'only the version gate blocks the extended chart');
});
