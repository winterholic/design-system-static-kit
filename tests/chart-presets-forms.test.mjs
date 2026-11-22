import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBlueprint} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {nodeSpecs} from '../src/catalog/nodes.mjs';
import {nodeSpecAt} from '../src/catalog/node-extensions.mjs';
import {HINTS} from '../src/service/errors.mjs';
import {CHART_FONT, CHART_W, CHART_MIN_RENDER_WIDTH, CHART_MIN_EFFECTIVE_FONT, chartDiagnostics, histogramBins, waterfallSteps, tickPlan, textWidth, isTimeLabel} from '../src/catalog/chart-rules.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';

const page = (chart, catalogVersion = '2.6.0') => {
  const blueprint = createBlueprint('dashboard-overview');
  blueprint.catalogVersion = catalogVersion;
  blueprint.pageType = 'general';
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '차트'}, chart]};
  return blueprint;
};
const base = {type: 'chart', title: '검사 차트', caption: '검사용 데이터', unit: '건', axis: {showX: 'yes', showY: 'yes'}};
const months = ['1월', '2월', '3월', '4월'];
const codes = chart => validateBlueprint(page({...base, ...chart})).errors.map(error => error.code);
const errorsOf = chart => validateBlueprint(page({...base, ...chart})).errors;
const candles = [{open: 10, high: 14, low: 9, close: 12}, {open: 12, high: 13, low: 8, close: 9}, {open: 9, high: 11, low: 9, close: 11}];
const ok = {
  candlestick: {kind: 'candlestick', dataType: 'time', categories: ['11/03', '11/04', '11/05'], series: [{name: '지수', candles}]},
  ohlc: {kind: 'ohlc', dataType: 'time', categories: ['11/03', '11/04', '11/05'], series: [{name: '지수', candles}]},
  waterfall: {kind: 'waterfall', categories: ['기초', '증가', '감소', '기말'], series: [{name: '잔액', values: [100, 30, -20, 110], roles: ['total', 'delta', 'delta', 'total']}]},
  funnel: {kind: 'funnel', dataType: 'process', categories: ['방문', '가입', '구매'], series: [{name: '인원', values: [900, 300, 90]}]},
  histogram: {kind: 'histogram', dataType: 'distribution', series: [{name: '세션', samples: [1, 2, 2, 3, 3, 3, 4, 4, 5, 9, 12]}]},
};

test('new chart forms: valid data of each form passes the validator and compiles on 2.6.0 only', () => {
  for (const [kind, chart] of Object.entries(ok)) {
    assert.deepEqual(errorsOf(chart), [], kind);
    const html = compile(page({...base, ...chart})).html;
    assert.match(html, new RegExp(`data-kind="${kind}"`), kind);
    assert.match(html, /<table>/, `${kind} keeps an HTML data table`);
    for (const version of ['2.4.0', '2.5.0']) assert.ok(validateBlueprint(page({...base, ...chart}, version)).errors.some(error => error.code === 'ENUM' && error.path.endsWith('.kind')), `${version} rejects ${kind}`);
  }
  assert.deepEqual(nodeSpecs.chart.fields.kind.enum, ['bar', 'bars-h', 'line', 'area', 'donut'], 'the 2.4.0/2.5.0 chart contract is untouched');
  for (const kind of Object.keys(ok)) assert.ok(nodeSpecAt('chart', '2.6.0').fields.kind.enum.includes(kind));
});

test('OHLC data model: open, high, low and close are required and high/low must enclose open and close', () => {
  const bad = (mutate) => { const list = structuredClone(candles); mutate(list); return errorsOf({...ok.candlestick, series: [{name: '지수', candles: list}]}); };
  assert.ok(bad(list => { list[0].high = 11; }).some(error => error.code === 'CHART_OHLC' && error.path.endsWith('candles[0].high')), 'high below close');
  assert.ok(bad(list => { list[1].low = 10; }).some(error => error.code === 'CHART_OHLC' && error.path.endsWith('candles[1].low')), 'low above close');
  assert.ok(bad(list => { delete list[2].open; }).some(error => ['CHART_OHLC', 'REQUIRED'].includes(error.code)), 'a missing open');
  assert.ok(bad(list => { list.pop(); }).some(error => error.code === 'CHART_SHAPE'), 'one candle fewer than categories');
  assert.ok(errorsOf({...ok.ohlc, series: [{name: '지수', values: [1, 2, 3]}]}).some(error => error.code === 'CHART_SHAPE'), 'values instead of candles');
  assert.ok(errorsOf({...ok.candlestick, series: [{name: 'A', candles}, {name: 'B', candles}]}).some(error => error.code === 'CHART_SHAPE'), 'a candlestick shows one instrument');
  const doji = structuredClone(candles); doji[2] = {open: 10, high: 10, low: 10, close: 10};
  assert.deepEqual(errorsOf({...ok.candlestick, series: [{name: '지수', candles: doji}]}), [], 'a flat candle (open=high=low=close) is legal');
  const html = compile(page({...base, ...ok.candlestick})).html;
  assert.equal((html.match(/class="ch-body"/g) ?? []).length, 3);
  assert.match(html, /data-dir="up"/); assert.match(html, /data-dir="down"/);
  assert.match(compile(page({...base, ...ok.ohlc})).html, /class="ch-ohlc"/);
});

test('waterfall: totals must equal the running sum and a waterfall needs a total', () => {
  assert.ok(errorsOf({...ok.waterfall, series: [{name: '잔액', values: [100, 30, -20, 999], roles: ['total', 'delta', 'delta', 'total']}]}).some(error => error.code === 'CHART_WATERFALL' && error.path.endsWith('values[3]')));
  assert.ok(errorsOf({...ok.waterfall, series: [{name: '잔액', values: [100, 30, -20, 110]}]}).some(error => error.code === 'CHART_WATERFALL'), 'no roles → no total');
  assert.ok(errorsOf({...ok.waterfall, series: [{name: '잔액', values: [100, 30, -20, 110], roles: ['total', 'delta']}]}).some(error => error.code === 'CHART_SHAPE'), 'roles length');
  assert.deepEqual(waterfallSteps([100, 30, -20, 110], ['total', 'delta', 'delta', 'total']).map(step => [step.start, step.end, step.mismatch]), [[0, 100, false], [100, 130, false], [130, 110, false], [0, 110, false]]);
  const html = compile(page({...base, ...ok.waterfall, labels: 'values'})).html;
  assert.equal((html.match(/data-step="total"/g) ?? []).length, 2);
  assert.match(html, />\+30<\/text>/); assert.match(html, />−20<\/text>/);
});

test('data that does not suit the form is rejected: donut on a time series, funnel with negatives or growth, histogram of one value', () => {
  const donutOverTime = errorsOf({kind: 'donut', categories: months, series: [{name: '값', values: [10, 20, 30, 40]}]});
  assert.ok(donutOverTime.some(error => error.code === 'CHART_DATA_FIT' && /시계열/.test(error.message)), 'inferred time labels');
  assert.ok(errorsOf({kind: 'donut', dataType: 'time', categories: ['가', '나'], series: [{name: '값', values: [1, 2]}]}).some(error => error.code === 'CHART_DATA_FIT'), 'declared time');
  assert.ok(errorsOf({kind: 'line', dataType: 'part-to-whole', categories: ['가', '나'], series: [{name: '값', values: [1, 2]}]}).some(error => error.code === 'CHART_DATA_FIT'), 'line of shares');
  assert.ok(errorsOf({kind: 'scatter', dataType: 'time', series: [{name: 'a', points: [{x: 1, y: 1}, {x: 2, y: 2}]}]}).some(error => error.code === 'CHART_DATA_FIT'));
  assert.ok(errorsOf({...ok.funnel, series: [{name: '인원', values: [900, -30, 90]}]}).some(error => error.code === 'CHART_DATA_FIT' && /음수/.test(error.message)), 'negative funnel');
  assert.ok(errorsOf({...ok.funnel, series: [{name: '인원', values: [90, 300, 20]}]}).some(error => error.code === 'CHART_DATA_FIT'), 'a stage larger than the one before');
  const {dataType: declared, ...undeclared} = ok.funnel;
  assert.ok(errorsOf({...undeclared, categories: months.slice(0, 3)}).some(error => error.code === 'CHART_DATA_FIT'), 'funnel over month labels without a declared type');
  assert.ok(errorsOf({...ok.histogram, series: [{name: '세션', samples: [7, 7, 7, 7, 7, 7]}]}).some(error => error.code === 'CHART_DATA_FIT' && /같은 값/.test(error.message)), 'single-valued histogram');
  assert.ok(errorsOf({...ok.histogram, series: [{name: '세션', samples: [7]}]}).some(error => ['CHART_SHAPE', 'ARRAY_LENGTH'].includes(error.code)), 'one observation');
  assert.ok(errorsOf({...ok.histogram, bins: 2}).length > 0 && errorsOf({...ok.histogram, bins: 5.5}).some(error => error.code === 'CHART_SHAPE'), 'bins range and integer');
  // suitable cases pass
  assert.deepEqual(errorsOf({kind: 'donut', dataType: 'part-to-whole', categories: ['검색', '메일', '추천'], series: [{name: '전환', values: [48, 31, 21]}]}), []);
  assert.deepEqual(errorsOf({kind: 'line', dataType: 'time', categories: months, series: [{name: '값', values: [1, 2, 3, 4]}]}), []);
  assert.equal(isTimeLabel('2026년 1분기') && isTimeLabel('11/03') && isTimeLabel('월') && !isTimeLabel('검색') && !isTimeLabel('A등급'), true);
});

test('axis distortion: bar-like forms must include zero, line and candle forms may start elsewhere', () => {
  const bar = {kind: 'bar', categories: months, series: [{name: '값', values: [60, 70, 80, 90]}]};
  for (const kind of ['bar', 'bars-h', 'area']) assert.ok(errorsOf({...bar, kind, axis: {showX: 'yes', showY: 'yes', min: 50}}).some(error => error.code === 'CHART_BASELINE'), `${kind} with min 50`);
  assert.ok(errorsOf({...bar, kind: 'stacked-bar', series: [{name: 'a', values: [60, 70, 80, 90]}, {name: 'b', values: [1, 2, 3, 4]}], axis: {showX: 'yes', min: 40}}).some(error => error.code === 'CHART_BASELINE'));
  assert.ok(errorsOf({...bar, axis: {max: -1}}).some(error => error.code === 'CHART_BASELINE'), 'all-negative axis excludes zero');
  assert.ok(errorsOf({...ok.waterfall, axis: {min: 50}}).some(error => error.code === 'CHART_BASELINE'));
  assert.ok(errorsOf({...ok.histogram, axis: {min: 1}}).some(error => error.code === 'CHART_BASELINE'));
  assert.deepEqual(errorsOf({...bar, axis: {showX: 'yes', showY: 'yes', min: 0, max: 100}}), [], 'a zero-based bar with an explicit range is fine');
  assert.deepEqual(errorsOf({...bar, kind: 'line', dataType: 'time', axis: {min: 50, max: 100}}), [], 'a truncated line axis is allowed');
  assert.deepEqual(errorsOf({...ok.candlestick, axis: {min: 5, max: 20}}), [], 'candles may start away from zero');
  assert.ok(errorsOf({...ok.candlestick, axis: {min: 10}}).some(error => error.code === 'CHART_AXIS'), 'but must not clip a low');
});

test('label checks: overlapping value labels, ambiguous tick labels and unreadable values are rejected; roomy labels pass', () => {
  const wide = {kind: 'bar', categories: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'], series: [{name: 'a', values: [1200, 3400, 5600, 7800, 9100, 4300, 2100, 6500]}, {name: 'b', values: [1100, 3000, 5000, 7000, 9000, 4000, 2000, 6000]}]};
  assert.ok(errorsOf({...wide, labels: 'values'}).some(error => error.code === 'CHART_LABEL_OVERLAP' && error.path.endsWith('.labels')), 'grouped 4-digit labels do not fit 8 slots');
  assert.deepEqual(errorsOf({...wide, labels: 'extremes'}).filter(error => error.code === 'CHART_LABEL_OVERLAP'), [], 'extremes only label two bars');
  const single = {...wide, series: [wide.series[0]]};
  assert.ok(errorsOf({...single, labels: 'values'}).some(error => error.code === 'CHART_LABEL_OVERLAP'), 'one series still too tight in the 360px plot');
  assert.deepEqual(errorsOf({...single, labels: 'values', responsive: 'scroll'}).filter(error => error.code === 'CHART_LABEL_OVERLAP'), [], 'the 600px scroll plot gives each label room');
  assert.ok(errorsOf({kind: 'line', dataType: 'time', categories: months, labels: 'values', series: [{name: 'a', values: [1, 2, 3, 4]}, {name: 'b', values: [2, 3, 4, 5]}]}).some(error => error.code === 'CHART_LABEL_OVERLAP'), 'two lines labelled at every point');
  const same = Array.from({length: 8}, (_, i) => `2026년 사업계획 ${i + 1}분기 항목`);
  assert.ok(errorsOf({kind: 'bar', categories: same, series: [{name: 'a', values: [1, 2, 3, 4, 5, 6, 7, 8]}]}).some(error => error.code === 'CHART_LABEL_OVERLAP' && error.path.endsWith('.categories')), 'tick labels cut to the same text');
  assert.deepEqual(errorsOf({kind: 'bar', categories: Array.from({length: 8}, (_, i) => `${i + 1}분기 사업계획`), series: [{name: 'a', values: [1, 2, 3, 4, 5, 6, 7, 8]}]}).filter(error => error.code === 'CHART_LABEL_OVERLAP'), [], 'labels that differ at the front survive the cut');
  assert.ok(errorsOf({kind: 'bar', categories: months, axis: {showX: 'yes', showY: 'no'}, series: [{name: 'a', values: [1, 2, 3, 4]}]}).some(error => error.code === 'CHART_LABEL_MISSING'), 'no axis numbers and no value labels');
  assert.deepEqual(errorsOf({kind: 'bar', categories: months, axis: {showX: 'yes', showY: 'no'}, labels: 'values', series: [{name: 'a', values: [1, 2, 3, 4]}]}), []);
  const plan = tickPlan(['2026년 1분기', '2026년 2분기', '2026년 3분기'], 40);
  assert.equal(plan.ambiguous || plan.stride > 1, true);
  assert.ok(textWidth('가나다') > textWidth('abc'), 'Hangul is measured wider than Latin');
});

test('options that the form cannot draw are rejected so presets cannot claim invisible differences', () => {
  const donut = {kind: 'donut', dataType: 'part-to-whole', categories: ['가', '나'], series: [{name: '값', values: [1, 2]}]};
  for (const option of [{grid: 'both'}, {labels: 'values'}, {density: 'compact'}, {responsive: 'scroll'}]) assert.ok(errorsOf({...donut, ...option}).some(error => error.code === 'CHART_OPTION'), JSON.stringify(option));
  assert.ok(errorsOf({...ok.funnel, grid: 'both'}).some(error => error.code === 'CHART_OPTION'));
  assert.ok(errorsOf({...ok.candlestick, labels: 'values'}).some(error => error.code === 'CHART_OPTION'));
  assert.ok(errorsOf({kind: 'line', dataType: 'time', categories: months, legend: 'none', series: [{name: 'a', values: [1, 2, 3, 4]}, {name: 'b', values: [1, 2, 3, 4]}]}).some(error => error.code === 'CHART_OPTION'), 'no legend for two series');
  assert.deepEqual(errorsOf({kind: 'line', dataType: 'time', categories: months, legend: 'none', series: [{name: 'a', values: [1, 2, 3, 4]}]}), []);
  assert.deepEqual(errorsOf({...donut, grid: 'none', legend: 'right'}), []);
});

test('histogram bins are deterministic, cover every observation and use round edges', () => {
  const samples = [1, 2, 2, 3, 3, 3, 4, 4, 5, 9, 12];
  const bins = histogramBins(samples);
  assert.deepEqual(bins, histogramBins([...samples]));
  assert.equal(bins.counts.reduce((sum, count) => sum + count, 0), samples.length);
  assert.equal(bins.edges.length, bins.counts.length + 1);
  assert.ok(bins.edges[0] <= 1 && bins.edges.at(-1) >= 12);
  assert.equal(histogramBins([5, 5, 5, 5, 5]), null, 'no distribution');
  const html = compile(page({...base, ...ok.histogram})).html;
  assert.equal((html.match(/class="ch-bar"/g) ?? []).length, bins.counts.length);
});

test('every diagnostic code the chart rules can emit has a hint, and the SVG label size invariant holds', () => {
  const emitted = new Set([...readFileSync(new URL('../src/catalog/chart-rules.mjs', import.meta.url), 'utf8').matchAll(/'(CHART_[A-Z_]+)'/g)].map(match => match[1]));
  for (const code of ['CHART_DATA_FIT', 'CHART_BASELINE', 'CHART_OHLC', 'CHART_WATERFALL', 'CHART_LABEL_OVERLAP', 'CHART_LABEL_MISSING', 'CHART_OPTION']) assert.ok(emitted.has(code), `${code} is emitted`);
  for (const code of emitted) assert.ok(typeof HINTS[code] === 'string' && HINTS[code].length > 20, `${code} has a hint`);
  assert.ok((CHART_FONT * CHART_MIN_RENDER_WIDTH) / CHART_W >= CHART_MIN_EFFECTIVE_FONT, 'labels stay at or above the SMALL_TEXT floor at the narrowest chart width');
});

test('a preset rejects unsuitable data with the same diagnostics as the validator and renders suitable data', () => {
  const funnel = renderChartPreset('chart-preset:marketing-conversion-funnel', {categories: ['노출', '클릭', '방문'], series: [{name: '방문자', values: [100, -5, 3]}]});
  assert.ok(funnel.errors.some(error => error.code === 'CHART_DATA_FIT'));
  const histogram = renderChartPreset('chart-preset:erp-lead-time-histogram', {series: [{name: '발주 건', samples: [4, 4, 4, 4, 4, 4]}]});
  assert.ok(histogram.errors.some(error => error.code === 'CHART_DATA_FIT'));
  const bar = renderChartPreset('chart-preset:sales-pipeline-value', {axis: {showX: 'yes', showY: 'yes', min: 10}});
  assert.ok(bar.errors.some(error => error.code === 'CHART_BASELINE'));
  assert.match(renderChartPreset('chart-preset:finance-price-candles'), /class="ch-body"/);
  assert.match(renderChartPreset('chart-preset:erp-budget-bridge'), /data-step="down"/);
  assert.deepEqual(chartDiagnostics({...base, ...ok.funnel}), []);
});
