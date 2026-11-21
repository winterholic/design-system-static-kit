import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {nodeSpecs} from '../src/catalog/nodes.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {catalogRegistry, resolveChartPreset} from '../src/materials/index.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';

const chartKinds = nodeSpecs.chart.fields.kind.enum;
const pageWithChart = chart => {
  const blueprint = createBlueprint('dashboard-overview');
  blueprint.pageType = 'general';
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '차트'}, chart]};
  return blueprint;
};
const sample = (kind, extra = {}) => ({
  type: 'chart', title: '월별 매출', caption: '월별 순매출, 백만 원', kind,
  unit: '백만 원', categories: ['1월', '2월', '3월'],
  series: [{name: '순매출', values: [12, 18, 15]}], ...extra,
});

test('chart node advertises reusable and separately encoded chart forms', () => {
  for (const kind of ['bar', 'bars-h', 'line', 'area', 'donut', 'stacked-bar', 'scatter', 'heatmap', 'sparkline']) {
    assert.ok(chartKinds.includes(kind), `${kind} is a supported chart kind`);
  }
});

test('chart data domains are checked and the SVG renderer exposes intentional axis omission', () => {
  const scatter = sample('scatter', {categories: ['1', '2', '3'], series: [{name: '실측', points: [{x: 1, y: 12}, {x: 2, y: 18}, {x: 3, y: 15}]}]});
  assert.equal(validateBlueprint(pageWithChart(scatter)).valid, true);
  const badScatter = structuredClone(scatter); badScatter.series[0].points[1].x = Number.NaN;
  const invalid = validateBlueprint(pageWithChart(badScatter));
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some(error => ['CHART_SHAPE', 'NUMBER'].includes(error.code)));

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
      const result = compile(pageWithChart(example));
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
  assert.match(compile(pageWithChart(node)).html, /data-kind="stacked-bar"/);
});

test('data domains reject incompatible forms, nonfinite points, zero spans and out of domain values', () => {
  const incompatible = validateBlueprint(pageWithChart(sample('donut', {series: [
    {name: 'A', values: [2, 3, 4]}, {name: 'B', values: [4, 3, 2]},
  ]})));
  assert.equal(incompatible.valid, false);
  assert.ok(incompatible.errors.some(error => error.code === 'CHART_SHAPE'));

  const distorted = validateBlueprint(pageWithChart(sample('bar', {axis: {min: 10, max: 10}})));
  assert.equal(distorted.valid, false);
  assert.ok(distorted.errors.some(error => error.code === 'CHART_AXIS'));

  const rejected = renderChartPreset('chart-preset:mobile-sparkline', {
    categories: ['월', '화', '수'], series: [{name: '요청', values: [1, Infinity, 3]}],
  });
  assert.equal(rejected.errors.some(error => error.code === 'CHART_VALUE'), true);

  const clippedStack = validateBlueprint(pageWithChart(sample('stacked-bar', {
    categories: ['1분기', '2분기', '3분기'], axis: {max: 30},
    series: [{name: '제품', values: [20, 20, 20]}, {name: '서비스', values: [20, 20, 20]}],
  })));
  assert.ok(clippedStack.errors.some(error => error.code === 'CHART_AXIS'), 'stack totals must fit the axis');
});

test('axis and label omission are explicit, while clipping and overlap stay visible in responsive markup', () => {
  const chart = sample('stacked-bar', {
    title: '긴 범례 예시', categories: ['2026년 1분기 계획', '2026년 2분기 계획', '2026년 3분기 계획'],
    series: [{name: '매출 목표', values: [20, 22, 24]}, {name: '실제 달성', values: [18, 25, 21]}],
  });
  const result = compile(pageWithChart(chart));
  assert.match(result.html, /role="img"/);
  assert.match(result.html, /<table>/);
  assert.match(result.html, /stacked-bar/);
  assert.match(result.html, /class="ch-bar"/);
  assert.match(result.css, /overflow-wrap|overflow-x/);

  const denseLabels = Array.from({length: 8}, (_, i) => `2026년 ${i + 1}분기 사업계획 항목`);
  const dense = compile(pageWithChart(sample('bar', {
    axis: {showX: 'yes', showY: 'yes'}, categories: denseLabels,
    series: [{name: '계획', values: [1, 2, 3, 4, 5, 6, 7, 8]}],
  }))).html;
  assert.match(dense, />202…<\/text>/, 'visual tick labels shorten to the plot width');
  assert.ok(dense.includes(`<th scope="row">${denseLabels[0]}</th>`), 'the table keeps full category labels');
});
