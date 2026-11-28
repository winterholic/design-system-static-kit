import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {nodeSpecs} from '../src/catalog/nodes.mjs';
import {nodeSpecAt, nodeExtended, NODE_SPEC_EXTENSIONS} from '../src/catalog/node-extensions.mjs';
import {CATALOG_VERSION, VERSION_ORDER, TOP_LEVEL_SINCE_FIELDS, atLeast} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {catalogRegistry, resolveChartPreset} from '../src/materials/index.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {renderChartPreset, validateChartPresetData} from '../src/render/chart-presets.mjs';
import {getMaterial} from '../src/service/index.mjs';
import {rest, mcpConnect} from './channel-support.mjs';

const REQUIREMENT_CHARTS = Object.freeze({
  'Vertical Bar': 'bar', 'Horizontal Bar': 'bars-h', 'Grouped Bar': 'grouped-bar',
  'Stacked Bar': 'stacked-bar', '100% Stacked Bar': 'normalized-stacked-bar',
  Line: 'line', 'Multi-line': 'multi-line', 'Step Line': 'step-line', Area: 'area',
  'Stacked Area': 'stacked-area', Pie: 'pie', Donut: 'donut', Scatter: 'scatter',
  Bubble: 'bubble', Heatmap: 'heatmap', Treemap: 'treemap', Radar: 'radar',
  Waterfall: 'waterfall', Funnel: 'funnel', Gauge: 'gauge', Bullet: 'bullet',
  Sparkline: 'sparkline', Candlestick: 'candlestick', OHLC: 'ohlc', Histogram: 'histogram',
  'Box Plot': 'box-plot', 'Combination Chart': 'combination', 'Calendar Heatmap': 'calendar-heatmap',
  'Progress Chart': 'progress-chart',
});

const svgShapeCounts = svg => Object.fromEntries(['rect', 'path', 'circle', 'line', 'polygon', 'polyline', 'text'].map(tag => [tag, (svg.match(new RegExp(`<${tag}\\b`, 'g')) ?? []).length]));

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

test('chart presets are verified materials with render-ready examples and legacy examples remain compiler-ready', () => {
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
      const rendered = renderChartPreset(preset.id);
      assert.equal(typeof rendered, 'string', `${preset.id} renders its example`);
      assert.match(rendered, /class="kit-chart"/);
      assert.match(rendered, /<table[ >]/);
      if (['bar', 'bars-h', 'stacked-bar', 'line', 'area', 'donut', 'scatter', 'heatmap', 'waterfall', 'funnel', 'sparkline', 'candlestick', 'ohlc', 'histogram'].includes(preset.ext.chartKind)) {
        assert.deepEqual(extended(example), [], preset.id);
        const result = compiled(example);
        assert.match(result.html, /class="kit-chart"/);
        assert.match(result.html, /<table>/);
      }
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

  // 앞부분이 같은 긴 이름은 눈금에서 잘리면 모두 같은 글자가 되므로 검증기가 거부한다(전체 이름은 표에 남는다).
  const denseLabels = Array.from({length: 8}, (_, i) => `2026년 사업계획 ${i + 1}분기 항목`);
  const denseChart = sample('bar', {axis: {showX: 'yes', showY: 'yes'}, categories: denseLabels, series: [{name: '계획', values: [1, 2, 3, 4, 5, 6, 7, 8]}]});
  assert.ok(extended(denseChart).some(error => error.code === 'CHART_LABEL_OVERLAP' && error.path.endsWith('.categories')));
  const shortLabels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];
  const dense = compiled({...denseChart, categories: shortLabels}).html;
  assert.match(dense, />1월<\/text>/, 'tick labels that fit are shown whole');
  assert.ok(dense.includes(`<th scope="row">${shortLabels[0]}</th>`), 'the table keeps full category labels');
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
  assert.deepEqual(Object.keys(extension.fields).sort(), [...Object.keys(base.fields), 'xLabel', 'yLabel', 'axis', 'dataType', 'grid', 'labels', 'legend', 'density', 'responsive', 'bins'].sort());
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

test('REQUEST §9.1 chart types have per-type schemas and render distinct responsive SVG structures with an accessible data table', () => {
  const byKind = new Map(chartPresetMaterials.map(material => [material.ext.chartKind, material]));
  assert.equal(Object.keys(REQUIREMENT_CHARTS).length, 29);
  const signatures = new Set();
  for (const [label, kind] of Object.entries(REQUIREMENT_CHARTS)) {
    const material = byKind.get(kind);
    assert.ok(material, `${label} has a preset with renderer-supported kind ${kind}`);
    assert.ok(material.ext.options.dataSchema && material.ext.options.distortionRules?.length, `${label} declares a schema and anti-distortion rules`);
    const example = material.examples[0];
    assert.deepEqual(validateChartPresetData(kind, example), [], `${label} example validates against its schema`);
    const rendered = renderChartPreset(material.id);
    assert.equal(typeof rendered, 'string', `${label} renders`);
    assert.match(rendered, new RegExp(`data-kind="${kind}"`));
    if (!['bar', 'bars-h', 'stacked-bar', 'line', 'area', 'donut', 'scatter', 'heatmap', 'waterfall', 'funnel', 'sparkline', 'candlestick', 'ohlc', 'histogram'].includes(kind)) assert.match(rendered, new RegExp(`data-renderer-kind="${kind}"`));
    assert.match(rendered, /<svg[^>]+viewBox=/, `${label} emits responsive viewBox SVG`);
    assert.match(rendered, /<table[ >]/, `${label} emits an accessible data table`);
    const svg = rendered.match(/<svg[\s\S]*?<\/svg>/)?.[0];
    assert.ok(svg, `${label} has an SVG`);
    const signature = JSON.stringify(svgShapeCounts(svg));
    assert.ok(!signatures.has(signature), `${label} has a distinct SVG element-kind/count signature (${signature})`);
    signatures.add(signature);
    assert.ok(validateChartPresetData(kind, {...structuredClone(example), series: []}).length > 0, `${label} rejects an empty data series`);
    const changed = structuredClone(example);
    if (['scatter', 'bubble'].includes(kind)) changed.series[0].points[0].x += 1;
    else if (['candlestick', 'ohlc'].includes(kind)) changed.series[0].candles[0].close -= 1;
    else if (kind === 'histogram') changed.series[0].samples[0] += 25;
    else if (kind === 'box-plot') changed.series[0].quartiles.median += 0.25;
    else if (kind === 'normalized-stacked-bar') { changed.series[0].values[0] += 1; changed.series[1].values[0] -= 1; }
    else if (kind === 'pie' || kind === 'donut') { changed.series[0].values[0] += 1; changed.series[0].values[1] -= 1; }
    else if (kind === 'waterfall') { changed.series[0].values[0] += 1; changed.series[0].values[changed.series[0].values.length - 1] += 1; }
    else if (kind === 'bullet') changed.series[0].values[0] += 1;
    else if (kind === 'gauge' || kind === 'progress-chart') changed.series[0].values[0] -= 1;
    else changed.series[0].values[0] += 1;
    assert.notEqual(renderChartPreset(material.id), renderChartPreset(material.id, {series: changed.series}), `${label} SVG/table consumes supplied values`);
  }
  assert.equal(signatures.size, 29);
});

test('each chart type rejects an input that violates its domain-specific data rule', () => {
  const corrupt = kind => {
    const chart = structuredClone(chartPresetMaterials.find(material => material.ext.chartKind === kind).examples[0]);
    switch (kind) {
      case 'bar': case 'bars-h': case 'grouped-bar': case 'area': case 'histogram': case 'waterfall': chart.axis = {...chart.axis, min: 1}; break;
      case 'stacked-bar': case 'stacked-area': chart.series[0].values[0] = -1; break;
      case 'normalized-stacked-bar': chart.series[0].values[0] += 1; break;
      case 'line': case 'multi-line': case 'step-line': chart.categories[0] = ''; break;
      case 'pie': case 'donut': chart.series[0].values[0] += 1; break;
      case 'scatter': chart.series[0].points[0].x = Infinity; break;
      case 'bubble': chart.series[0].points[0].size = 0; break;
      case 'heatmap': chart.series[0].values[0] = -1; break;
      case 'treemap': chart.series[0].values.fill(0); break;
      case 'radar': chart.series[0].values[0] = 101; break;
      case 'gauge': case 'progress-chart': chart.series[0].values[0] = 101; break;
      case 'funnel': chart.series[0].values[1] = chart.series[0].values[0] + 1; break;
      case 'bullet': delete chart.series[0].target; break;
      case 'sparkline': chart.series.push(structuredClone(chart.series[0])); break;
      case 'candlestick': case 'ohlc': chart.series[0].candles[0].open = chart.series[0].candles[0].high + 1; break;
      case 'box-plot': chart.series[0].quartiles.median = chart.series[0].quartiles.q3 + 1; break;
      case 'combination': chart.series.forEach(item => { item.mark = 'bar'; }); break;
      case 'calendar-heatmap': chart.categories.pop(); break;
      default: throw new Error(`missing invalid fixture for ${kind}`);
    }
    return chart;
  };
  for (const kind of Object.values(REQUIREMENT_CHARTS)) {
    const example = corrupt(kind);
    const preset = chartPresetMaterials.find(material => material.ext.chartKind === kind);
    assert.ok(validateChartPresetData(kind, example).length > 0 || typeof renderChartPreset(preset.id, {series: example.series, categories: example.categories, axis: example.axis}) !== 'string', `${kind} rejects its invalid input`);
  }
});

test('business chart schemas reject distorted part-to-whole totals and non-zero bar baselines', () => {
  const pie = chartPresetMaterials.find(material => material.ext.chartKind === 'pie');
  const pieInput = structuredClone(pie.examples[0]);
  pieInput.series[0].values = [20, 30, 40];
  assert.ok(validateChartPresetData('pie', pieInput).some(error => error.code === 'CHART_TOTAL'));

  const bar = chartPresetMaterials.find(material => material.ext.chartKind === 'bar');
  const barInput = structuredClone(bar.examples[0]);
  barInput.axis = {...barInput.axis, min: 10};
  assert.ok(validateChartPresetData('bar', barInput).some(error => error.code === 'CHART_BASELINE'));
});

test('chart preset records resolve through the service registry, REST and MCP material queries', async () => {
  const id = 'chart-preset:analytics-bubble-segments';
  const serviceResult = getMaterial({id});
  assert.equal(serviceResult.ok, true);
  assert.equal(serviceResult.value.ext.chartKind, 'bubble');
  assert.equal(serviceResult.value.ext.options.dataSchema.seriesField, 'points');

  const restResult = await rest('GET', `/api/v1/materials/${id}`);
  assert.equal(restResult.status, 200);
  assert.equal(restResult.json.value.ext.chartKind, 'bubble');

  const client = await mcpConnect('modern');
  try {
    const mcpResult = await client.callTool({name: 'get_material', arguments: {id}});
    assert.equal(mcpResult.structuredContent.value.ext.chartKind, 'bubble');
    assert.equal(mcpResult.structuredContent.value.ext.options.dataSchema.seriesField, 'points');
  } finally {
    await client.close();
  }
});
