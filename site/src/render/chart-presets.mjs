import {chartPresetMaterials} from '../materials/chart-presets.mjs';
import {renderChart} from './chart.mjs';
import {chartDiagnostics, levelsOf, seriesField, niceStep, tickPlan, fitText, textWidth} from '../catalog/chart-rules.mjs';
import {num, seg, txt, xText, marker, DASH, gridOf, pickLabels, legendItems, fmtTick} from './chart-kit.mjs';

const byId = new Map(chartPresetMaterials.map(material => [material.id, material]));
const EXTENDED_KINDS = new Set(chartPresetMaterials.filter(m => !['bar', 'bars-h', 'stacked-bar', 'line', 'area', 'donut', 'scatter', 'heatmap', 'waterfall', 'funnel', 'sparkline', 'candlestick', 'ohlc', 'histogram'].includes(m.ext.chartKind)).map(m => m.ext.chartKind));
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const finite = value => typeof value === 'number' && Number.isFinite(value);
const zeroBaseline = new Set(['bar', 'bars-h', 'grouped-bar', 'stacked-bar', 'normalized-stacked-bar', 'area', 'stacked-area', 'histogram', 'waterfall', 'treemap', 'bullet', 'combination', 'progress-chart']);
const percentTotals = new Set(['pie', 'donut']);
const pointKinds = new Set(['scatter', 'bubble']);
const categoryFree = new Set(['scatter', 'bubble', 'histogram']);
// 렌더러가 첫 계열만 그리는 형태: 둘째 계열을 받으면 값이 조용히 사라지므로 입력에서 거부한다.
const singleSeries = new Set(['pie', 'treemap', 'gauge', 'bullet', 'progress-chart']);
// 값 축 범위(axis.min·max)를 그대로 쓰는 선형 형태: 범위가 데이터를 잘라내면 선이 그림 밖으로 나간다.
const axisClipKinds = new Set(['multi-line', 'step-line']);
const sum = values => values.reduce((total, value) => total + value, 0);

/** Public, per-kind data contract validation used before either SVG path renders. */
export function validateChartPresetData(kind, chart) {
  const errors = [], add = (code, message) => errors.push({code, message});
  const material = chartPresetMaterials.find(m => m.ext.chartKind === kind);
  if (!material) return [{code: 'CHART_KIND', message: `지원하지 않는 차트 유형: ${kind}`}];
  if (!chart || typeof chart !== 'object' || Array.isArray(chart)) return [{code: 'CHART_SHAPE', message: '차트 데이터는 객체여야 합니다.'}];
    const {minimumSeries = 1} = material.ext.options.dataSchema;
  const series = Array.isArray(chart.series) ? chart.series : [];
  const categories = Array.isArray(chart.categories) ? chart.categories : [];
  if (series.length < minimumSeries) add('CHART_SHAPE', `${kind}은 계열 ${minimumSeries}개 이상이 필요합니다.`);
  if (kind === 'sparkline' && series.length !== 1) add('CHART_SHAPE', 'sparkline은 계열 하나만 허용합니다.');
  if (singleSeries.has(kind) && series.length > 1) add('CHART_SHAPE', `${kind}은 계열 하나만 그립니다. 둘째 계열의 값이 사라지므로 거부합니다.`);
  if (kind === 'radar' && categories.length < 3) add('CHART_SHAPE', 'radar는 축 3개 이상이 필요합니다.');
  if ((kind === 'multi-line' || kind === 'step-line') && new Set(categories).size !== categories.length) add('CHART_SHAPE', `${kind}의 범주 라벨은 서로 달라야 점을 구별할 수 있습니다.`);
  if (!categoryFree.has(kind) && (!categories.length || categories.some(label => typeof label !== 'string' || !label.trim()))) add('CHART_SHAPE', `${kind}은 비어 있지 않은 범주 라벨이 필요합니다.`);
  if (kind === 'calendar-heatmap' && categories.length !== 7) add('CHART_SHAPE', 'calendar-heatmap은 월요일부터 일요일까지 7개 요일이 필요합니다.');
  if (kind === 'gauge' && categories.length !== 1) add('CHART_SHAPE', 'gauge는 값 하나에 대응하는 범주 하나가 필요합니다.');
  if (kind === 'bullet' && categories.length !== 1) add('CHART_SHAPE', 'bullet은 목표와 비교할 지표 하나가 필요합니다.');
  if (kind === 'box-plot' && categories.length !== series.length) add('CHART_SHAPE', 'box-plot은 계열마다 범주 하나가 필요합니다.');
  if (!pointKinds.has(kind) && kind !== 'box-plot' && kind !== 'candlestick' && kind !== 'ohlc' && kind !== 'histogram') {
    for (const [i, item] of series.entries()) {
      if (!Array.isArray(item?.values) || item.values.length !== categories.length) add('CHART_SHAPE', `계열 ${i + 1}은 범주와 길이가 같은 values 배열이 필요합니다.`);
      else if (item.values.some(value => !finite(value))) add('CHART_VALUE', `계열 ${i + 1}은 유한한 숫자만 가질 수 있습니다.`);
    }
  }
  if (kind === 'box-plot') for (const [i, item] of series.entries()) {
    const q = item?.quartiles;
    if (!q || !['min', 'q1', 'median', 'q3', 'max'].every(key => finite(q[key]))) { add('CHART_SHAPE', `계열 ${i + 1}은 min·q1·median·q3·max 숫자가 필요합니다.`); continue; }
    if (!(q.min <= q.q1 && q.q1 <= q.median && q.median <= q.q3 && q.q3 <= q.max)) add('CHART_ORDER', `계열 ${i + 1}의 five-number summary 순서가 잘못되었습니다.`);
  }
  if (pointKinds.has(kind)) for (const [i, item] of series.entries()) {
    if (!Array.isArray(item?.points) || !item.points.length || item.points.some(point => !finite(point?.x) || !finite(point?.y) || kind === 'bubble' && (!finite(point?.size) || point.size <= 0))) add('CHART_SHAPE', `${kind} 계열 ${i + 1}의 점 좌표${kind === 'bubble' ? '와 양수 size' : ''}가 필요합니다.`);
  }
  if (kind === 'histogram' && series.some(item => !Array.isArray(item?.samples) || item.samples.length < 2 || item.samples.some(value => !finite(value)))) add('CHART_SHAPE', 'histogram은 유한한 표본 두 개 이상이 필요합니다.');
  if (kind === 'candlestick' || kind === 'ohlc') for (const [i, item] of series.entries()) {
    const candles = item?.candles;
    if (!Array.isArray(candles) || candles.length !== categories.length || candles.some(c => !['open', 'high', 'low', 'close'].every(key => finite(c?.[key])))) add('CHART_SHAPE', `${kind} 계열 ${i + 1}에 범주별 OHLC 값이 필요합니다.`);
    else if (candles.some(c => c.low > Math.min(c.open, c.close) || c.high < Math.max(c.open, c.close) || c.low > c.high)) add('CHART_ORDER', `${kind}의 각 캔들은 low ≤ open·close ≤ high여야 합니다.`);
  }
  if (kind === 'calendar-heatmap' && series.some(item => !Array.isArray(item.values) || item.values.length !== 7)) add('CHART_SHAPE', 'calendar-heatmap의 각 주는 7일의 값이 필요합니다.');
  if (['grouped-bar', 'normalized-stacked-bar', 'stacked-bar', 'stacked-area', 'pie', 'treemap', 'radar', 'progress-chart', 'calendar-heatmap', 'heatmap'].includes(kind) && series.some(item => item.values?.some(value => value < 0))) add('CHART_DOMAIN', `${kind}은 음수 값을 허용하지 않습니다.`);
  if (percentTotals.has(kind) && series.length === 1 && series[0]?.values?.length && Math.abs(sum(series[0].values) - 100) > 1e-6) add('CHART_TOTAL', `${kind}의 비중 합계는 100%여야 합니다.`);
  if (kind === 'normalized-stacked-bar' && categories.some((_, i) => Math.abs(sum(series.map(item => item.values?.[i] ?? 0)) - 100) > 1e-6)) add('CHART_TOTAL', '100% 누적 막대는 모든 범주의 계열 합계가 100%여야 합니다.');
  if (kind === 'treemap' && series[0]?.values && sum(series[0].values) <= 0) add('CHART_TOTAL', 'treemap은 양수 면적 합계가 필요합니다.');
  if (kind === 'funnel' && series.some(item => item.values?.some((value, i) => i > 0 && value > item.values[i - 1]))) add('CHART_ORDER', 'funnel 단계 값은 앞 단계보다 커질 수 없습니다.');
  if (kind === 'waterfall' && series[0]?.roles && series[0]?.values) {
    let running = 0;
    for (const [i, value] of series[0].values.entries()) {
      if (series[0].roles[i] === 'total') {
        if (i > 0 && Math.abs(value - running) > 1e-6 * Math.max(1, Math.abs(running))) { add('CHART_TOTAL', 'waterfall의 total은 앞 단계 누계와 같아야 합니다.'); break; }
        running = value;
      } else running += value;
    }
  }
  if (['gauge', 'progress-chart'].includes(kind) && series.some(item => item.values?.some(value => value < 0 || value > 100))) add('CHART_DOMAIN', `${kind} 값은 0~100 범위여야 합니다.`);
  if (kind === 'bullet' && !finite(series[0]?.target)) add('CHART_SHAPE', 'bullet은 비교 기준 target 숫자가 필요합니다.');
  if (kind === 'bullet' && finite(series[0]?.target) && (series[0].target < 0 || series[0].target > 100 || series[0].values?.[0] > 100 || series[0].values?.[0] < 0)) add('CHART_DOMAIN', 'bullet 실적과 목표는 0~100 범위여야 합니다.');
  if (kind === 'combination' && (!series.some(item => item.mark === 'bar') || !series.some(item => item.mark === 'line'))) add('CHART_SHAPE', 'combination은 bar와 line 계열을 모두 가져야 합니다.');
  if (kind === 'radar' && series.some(item => item.values?.some(value => value < 0 || value > 100))) add('CHART_DOMAIN', 'radar 값은 공통 0~100 척도여야 합니다.');
  if (zeroBaseline.has(kind) && chart.axis && finite(chart.axis.min) && chart.axis.min !== 0) add('CHART_BASELINE', `${kind}의 값 길이·면적 축은 0에서 시작해야 합니다.`);
  if ((zeroBaseline.has(kind) || axisClipKinds.has(kind)) && chart.axis && finite(chart.axis.max)) {
    // 누적 면적은 계열 값의 합이 그려지는 높이다. 개별 값만 보면 합이 축 최댓값을 넘어도 통과한다.
    const values = kind === 'stacked-area' ? categories.map((_, i) => sum(series.map(item => item.values?.[i] ?? 0))) : series.flatMap(item => Array.isArray(item.values) ? item.values : []);
    if (values.some(value => value > chart.axis.max)) add('CHART_AXIS', '축 최댓값이 입력 값을 잘라냅니다.');
  }
  if (axisClipKinds.has(kind) && chart.axis && finite(chart.axis.min) && series.some(item => Array.isArray(item.values) && item.values.some(value => value < chart.axis.min))) add('CHART_AXIS', '축 최솟값이 입력 값을 잘라냅니다.');
  if (axisClipKinds.has(kind) && chart.axis && finite(chart.axis.min) && finite(chart.axis.max) && chart.axis.min >= chart.axis.max) add('CHART_AXIS', '축 범위는 min보다 max가 커야 합니다.');
  return errors;
}

/**
 * 2.6.0 compiler seam: resolve an id to the existing chart node contract, then pass it through
 * validateBlueprint/compile. No catalog-version gate or shared version table changes here.
 */
export function resolveChartPreset(id, data = {}) {
  const material = byId.get(id);
  if (!material) return {errors: [{code: 'CHART_PRESET', message: `알 수 없는 차트 프리셋: ${id}`} ]};
  const example = structuredClone(material.examples[0]);
  const chart = {...example, ...structuredClone(data), kind: material.ext.chartKind};
  if (data.series) chart.series = structuredClone(data.series);
  if (data.categories) chart.categories = [...data.categories];
  chart.axis = chart.axis ?? {showX: material.ext.axes.x === 'omitted' ? 'no' : 'yes', showY: material.ext.axes.y === 'omitted' ? 'no' : 'yes'};
  chart.xLabel = chart.xLabel ?? material.ext.labels.x;
  chart.yLabel = chart.yLabel ?? material.ext.labels.y;
  chart.unit = chart.unit ?? material.ext.unit;
  return chart;
}

function checkData(n) {
  const errors = [], err = (code, message) => errors.push({code, message});
  const series = Array.isArray(n.series) ? n.series : [], field = seriesField(n.kind), ownShape = ['candlestick', 'ohlc', 'histogram'].includes(n.kind);
  if (!series.length) err('CHART_SHAPE', '차트 계열이 하나 이상 필요합니다.');
  if (n.kind !== 'scatter' && !ownShape && (!Array.isArray(n.categories) || n.categories.length < 2)) err('CHART_SHAPE', '범주 2개 이상이 필요합니다.');
  series.forEach((s, i) => {
    const raw = s?.[field] ?? [], values = field === 'points' ? raw.flatMap(p => [p?.x, p?.y]) : field === 'candles' ? raw.flatMap(c => [c?.open, c?.high, c?.low, c?.close]) : raw;
    if (!values.length) err('CHART_SHAPE', `계열 ${i + 1}의 데이터가 비었습니다.`);
    if (values.some(value => !Number.isFinite(value))) err('CHART_VALUE', `계열 ${i + 1}에 유한하지 않은 값이 있습니다.`);
    if (field === 'values' && s.values?.length !== n.categories?.length) err('CHART_SHAPE', `계열 ${i + 1}의 값과 범주 개수가 다릅니다.`);
  });
  if (n.axis && Number.isFinite(n.axis.min) && Number.isFinite(n.axis.max) && n.axis.min >= n.axis.max) err('CHART_AXIS', '축 범위는 min보다 max가 커야 합니다.');
  if (n.kind === 'stacked-bar' && series.some(s => s.values?.some(value => value < 0))) err('CHART_SHAPE', 'stacked-bar는 음이 아닌 값만 지원합니다.');
  if (n.kind === 'donut' && (series.length !== 1 || series[0]?.values?.some(value => value < 0) || series[0]?.values?.reduce((sum, value) => sum + value, 0) <= 0)) err('CHART_SHAPE', 'donut은 음이 아닌 값의 계열 하나와 양수 합계가 필요합니다.');
  if (n.kind === 'sparkline' && series.length !== 1) err('CHART_SHAPE', 'sparkline은 계열 하나만 허용합니다.');
  if (n.axis && n.kind !== 'scatter') {
    const levels = levelsOf(n);
    if (Number.isFinite(n.axis.min) && levels.some(value => value < n.axis.min)) err('CHART_AXIS', '축 최솟값이 데이터보다 커서 값이 잘립니다.');
    if (Number.isFinite(n.axis.max) && levels.some(value => value > n.axis.max)) err('CHART_AXIS', '축 최댓값이 데이터보다 작아 값이 잘립니다.');
  }
  if (n.kind === 'scatter' && n.axis) {
    const points = series.flatMap(s => s.points ?? []);
    if (Number.isFinite(n.axis.xMin) && Number.isFinite(n.axis.xMax) && n.axis.xMin >= n.axis.xMax || Number.isFinite(n.axis.yMin) && Number.isFinite(n.axis.yMax) && n.axis.yMin >= n.axis.yMax) err('CHART_AXIS', '축 범위는 최솟값보다 최댓값이 커야 합니다.');
    if (Number.isFinite(n.axis.xMin) && points.some(p => p.x < n.axis.xMin) || Number.isFinite(n.axis.xMax) && points.some(p => p.x > n.axis.xMax) || Number.isFinite(n.axis.yMin) && points.some(p => p.y < n.axis.yMin) || Number.isFinite(n.axis.yMax) && points.some(p => p.y > n.axis.yMax)) err('CHART_AXIS', '축 범위가 데이터 점을 잘라냅니다.');
  }
  if (!errors.length) for (const d of chartDiagnostics(n)) err(d.code, d.message);
  return errors;
}

/**
 * 플랫폼 색 역할(src/platform/color.mjs의 차트 변수)을 읽게 바꾸는 형태와 필요한 변수. 렌더러가 내는 범주형 한 색(`--kit-chart1`)과 투명도 단계를
 * 형태가 뜻하는 색 역할로 옮긴다: 히트맵은 순차 7단계, 폭포의 증가·감소는 발산 양 끝, 도넛은 범주형 6색(렌더러는 5색에서 되돌아간다).
 * 변수가 없으면 쓰지 않는다(변수 없는 화면에서 색이 사라지지 않게 호출자가 `chartColorRoleVars`로 확인한다).
 */
export const CHART_COLOR_ROLE_VARS = Object.freeze({
  heatmap: Object.freeze(Array.from({length: 7}, (_, i) => `--kit-seq${i + 1}`)),
  waterfall: Object.freeze(['--kit-div2', '--kit-div6']),
  donut: Object.freeze(['--kit-chart6']),
});
export const chartColorRoleVars = kind => CHART_COLOR_ROLE_VARS[kind] ?? [];

/** 렌더러 출력의 색 참조만 바꾼다(구조·글·숫자는 그대로). 해당 형태가 아니면 입력을 그대로 돌려준다. */
export function applyChartColorRoles(html, kind) {
  if (kind === 'heatmap') {
    // 셀과 범례 칸의 투명도 .16~1.00(렌더러의 ramp)을 순차 1~7단계로 옮긴다.
    const step = op => Math.min(7, Math.max(1, Math.round(1 + 6 * ((Number(op) - .16) / .84))));
    return html.replace(/fill:var\(--kit-chart1\);fill-opacity:([\d.]+)/g, (_, op) => `fill:var(--kit-seq${step(op)})`)
      .replace(/background:var\(--kit-chart1\);opacity:([\d.]+)/g, (_, op) => `background:var(--kit-seq${step(op)})`);
  }
  if (kind === 'waterfall') return html.replaceAll('var(--kit-chart1)', 'var(--kit-div6)').replaceAll('var(--kit-chart3)', 'var(--kit-div2)');
  if (kind === 'donut') {
    let slice = 0, swatch = 0;
    return html.replace(/(class="ch-slice" style="fill:var\(--kit-chart)\d\)/g, (_, a) => `${a}${(slice++ % 6) + 1})`)
      .replace(/(<i style="background:var\(--kit-chart)\d\)/g, (_, a) => `${a}${(swatch++ % 6) + 1})`);
  }
  return html;
}

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const COLOR = i => `var(--kit-chart${(i % 6) + 1})`;
const swatchOf = i => `background:${COLOR(i)}`;

/** 값 눈금. zero가 참이면 0을 포함하고, axis.min·max가 있으면 그 값을 쓴다(검증이 잘림을 이미 막았다). */
function niceScale(values, {zero = true, axis = {}, intervals = 4} = {}) {
  let lo = values.length ? Math.min(...values) : 0, hi = values.length ? Math.max(...values) : 1;
  if (zero) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  if (finite(axis.min)) lo = axis.min;
  if (finite(axis.max)) hi = axis.max;
  if (!(hi > lo)) hi = lo + 1;
  const step = niceStep((hi - lo) / intervals);
  const tlo = finite(axis.min) ? axis.min : Math.floor(lo / step + 1e-9) * step, thi = finite(axis.max) ? axis.max : Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];
  for (let v = tlo; v <= thi + step * 1e-6 && ticks.length < 9; v += step) ticks.push(Math.round(v * 1e9) / 1e9);
  return {lo: tlo, hi: thi, span: (thi - tlo) || 1, ticks};
}

/** 값 라벨 위치만 정한다. 어느 값에 달지는 labels 옵션(values·extremes·last)이 정한다. */
function tagValues(out, n, items) {
  const picked = pickLabels(items.map(item => item.v), n.labels ?? 'none');
  items.forEach((item, i) => { if (picked.has(i)) out.push(txt(item.x, item.y, fmtTick(item.v), {anchor: 'middle', cls: 'ch-v'})); });
}

/** 범주 x 값 y 축 틀: 격자, 눈금 라벨, 기준선, 범주 라벨. 라벨이 칸보다 길면 tickPlan이 건너뛰거나 줄인다(전체 이름은 데이터 표에 있다). */
function cartesianFrame(n, {H, scale, labels, right = 12, rightTicks = null}) {
  const showX = n.axis?.showX !== 'no', showY = n.axis?.showY !== 'no', grid = gridOf(n);
  const tickW = Math.max(0, ...scale.ticks.map(t => textWidth(fmtTick(t))));
  const g = {W: 360, H, left: showY ? clamp(tickW + 16, 40, 80) : 12, right, top: 18, bottom: showX ? 34 : 12};
  g.pw = g.W - g.left - g.right; g.ph = H - g.top - g.bottom; g.slot = g.pw / Math.max(1, labels.length);
  g.X = i => g.left + g.slot * (i + .5);
  g.Y = v => g.top + g.ph - ((v - scale.lo) / scale.span) * g.ph;
  const out = [];
  for (const tick of scale.ticks) {
    if (grid === 'horizontal' || grid === 'both') out.push(seg(g.left, g.Y(tick), g.left + g.pw, g.Y(tick)));
    if (showY) out.push(txt(g.left - 7, g.Y(tick) + 4.5, fmtTick(tick), {anchor: 'end'}));
  }
  if (grid === 'vertical' || grid === 'both') for (let i = 0; i <= labels.length; i++) out.push(seg(g.left + g.slot * i, g.top, g.left + g.slot * i, g.top + g.ph));
  out.push(seg(g.left, g.Y(scale.lo < 0 && scale.hi > 0 ? 0 : scale.lo), g.left + g.pw, g.Y(scale.lo < 0 && scale.hi > 0 ? 0 : scale.lo), 'ch-axis'));
  if (showX) { const plan = tickPlan(labels, g.slot); labels.forEach((_, i) => { if (plan.shown[i] !== null) out.push(xText(g, g.X(i), plan.shown[i], H - 10)); }); }
  if (rightTicks) for (const tick of rightTicks.ticks) out.push(txt(g.left + g.pw + 7, g.top + g.ph - ((tick - rightTicks.lo) / rightTicks.span) * g.ph + 4.5, fmtTick(tick), {anchor: 'start'}));
  return {g, out};
}

const seriesLegend = (series, suffix = () => '') => legendItems(series.map((item, i) => [swatchOf(i), `${item.name}${suffix(item)}`]));

/** 확장 형태 SVG. 모든 형태가 축·범례·값 표기 중 그 형태에 맞는 것을 SVG 안(또는 옆 범례)에 직접 그린다. 상호작용 없이도 읽혀야 하므로 title 툴팁에만 기대지 않는다. */
function renderExtendedChart(n, id) {
  const cats = n.categories ?? [], series = n.series ?? [], unit = n.unit ?? '';
  const compact = n.density === 'compact', mode = n.legend ?? 'auto';
  const out = []; let H = compact ? 180 : 220, W = 360, viewBox = null, legend = '', svgClass = '';
  const stacked = n.kind === 'stacked-area' ? cats.map((_, i) => sum(series.map(item => item.values[i]))) : null;
  switch (n.kind) {
    case 'grouped-bar': case 'normalized-stacked-bar': {
      const normalized = n.kind === 'normalized-stacked-bar';
      const scale = normalized ? {lo: 0, hi: 100, span: 100, ticks: [0, 25, 50, 75, 100]} : niceScale(series.flatMap(item => item.values), {axis: n.axis});
      const {g, out: frame} = cartesianFrame(n, {H, scale, labels: cats});
      out.push(...frame);
      const bw = normalized ? g.slot * .64 : Math.min(24, g.slot * .72 / series.length), tags = [];
      cats.forEach((label, ci) => {
        let running = 0;
        series.forEach((item, si) => {
          const value = item.values[ci], h = Math.max(1, value / scale.span * g.ph);
          const bx = normalized ? g.left + ci * g.slot + (g.slot - bw) / 2 : g.X(ci) + (si - (series.length - 1) / 2) * bw - bw / 2;
          const by = normalized ? g.Y(running + value) : g.Y(value);
          out.push(`<rect data-series="${si}" x="${num(bx)}" y="${num(by)}" width="${num(bw)}" height="${num(h)}" rx="2" class="ch-bar" style="fill:${COLOR(si)}"><title>${escape(label)} · ${escape(item.name)}: ${value}${unit ? ` ${escape(unit)}` : ''}</title></rect>`);
          if (normalized) running += value; else tags.push({v: value, x: bx + bw / 2, y: by - 4});
        });
      });
      if (!normalized) tagValues(out, n, tags);
      legend = seriesLegend(series); break;
    }
    case 'multi-line': case 'step-line': {
      const scale = niceScale(series.flatMap(item => item.values), {axis: n.axis});
      const {g, out: frame} = cartesianFrame(n, {H, scale, labels: cats});
      out.push(...frame);
      series.forEach((item, si) => {
        const pts = item.values.map((value, i) => [g.X(i), g.Y(value)]);
        const path = n.kind === 'step-line' ? pts.flatMap((p, i) => i ? [[p[0], pts[i - 1][1]], p] : [p]) : pts;
        out.push(`<path data-series="${si}" d="${path.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:${COLOR(si)}"${DASH[si] ? ` stroke-dasharray="${DASH[si]}"` : ''}/>`);
        pts.forEach((p, i) => out.push(`<g class="ch-point" style="color:${COLOR(si)}"><title>${escape(cats[i])} · ${escape(item.name)}: ${item.values[i]}${unit ? ` ${escape(unit)}` : ''}</title>${marker(si, p[0], p[1], (si % 6) + 1)}</g>`));
        if (series.length === 1 || n.labels === 'last') tagValues(out, n, pts.map((p, i) => ({v: item.values[i], x: p[0], y: p[1] - 8})));
      });
      legend = series.length > 1 ? seriesLegend(series) : ''; break;
    }
    case 'stacked-area': {
      const scale = niceScale(stacked, {axis: n.axis});
      const {g, out: frame} = cartesianFrame(n, {H, scale, labels: cats});
      out.push(...frame);
      let below = cats.map(() => 0);
      series.forEach((item, si) => {
        const next = below.map((value, i) => value + item.values[i]);
        const upper = next.map((value, i) => `${num(g.X(i))},${num(g.Y(value))}`), lower = below.map((value, i) => `${num(g.X(i))},${num(g.Y(value))}`).reverse();
        below = next;
        out.push(`<polygon data-series="${si}" points="${[...upper, ...lower].join(' ')}" fill="${COLOR(si)}" fill-opacity=".72" stroke="${COLOR(si)}" stroke-width="1.5"><title>${escape(item.name)}</title></polygon>`);
      });
      legend = seriesLegend(series); break;
    }
    case 'pie': {
      W = 240; H = 240; viewBox = '0 0 240 240'; svgClass = 'ch-donut';
      const values = series[0].values, cx = 120, cy = 120, r = 100;
      let angle = -Math.PI / 2;
      values.forEach((value, i) => {
        const span = value / 100 * 2 * Math.PI, next = angle + span, mid = angle + span / 2;
        const point = (a, radius = r) => `${num(cx + radius * Math.cos(a))} ${num(cy + radius * Math.sin(a))}`;
        const d = value >= 100 - 1e-9 ? `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx - .01} ${cy - r}Z` : `M${cx} ${cy}L${point(angle)}A${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${point(next)}Z`;
        out.push(`<path data-slice="${i}" d="${d}" class="ch-slice" style="fill:${COLOR(i)}"><title>${escape(cats[i])} ${value}%</title></path>`);
        if (value >= 7) out.push(`<text x="${num(cx + r * .62 * Math.cos(mid))}" y="${num(cy + r * .62 * Math.sin(mid) + 4.5)}" text-anchor="middle" class="ch-v" style="fill:var(--kit-surface)">${fmtTick(value)}%</text>`);
        angle = next;
      });
      legend = `<ul class="kit-legend">${cats.map((c, i) => `<li><i style="${swatchOf(i)}" aria-hidden="true"></i>${escape(c)} <b>${fmtTick(values[i])}%</b></li>`).join('')}</ul>`; break;
    }
    case 'bubble': {
      const pts = series.flatMap(item => item.points), sx = niceScale(pts.map(p => p.x), {axis: {}}), sy = niceScale(pts.map(p => p.y), {axis: {}}), sizeMax = Math.max(...pts.map(p => p.size));
      const showX = n.axis?.showX !== 'no', showY = n.axis?.showY !== 'no', grid = gridOf(n);
      const g = {left: showY ? clamp(Math.max(...sy.ticks.map(t => textWidth(fmtTick(t)))) + 16, 40, 80) : 12, right: 22, top: 22, bottom: showX ? 34 : 12};
      g.pw = W - g.left - g.right; g.ph = H - g.top - g.bottom;
      const X = v => g.left + (v - sx.lo) / sx.span * g.pw, Y = v => g.top + g.ph - (v - sy.lo) / sy.span * g.ph;
      for (const tick of sy.ticks) { if (grid === 'horizontal' || grid === 'both') out.push(seg(g.left, Y(tick), g.left + g.pw, Y(tick))); if (showY) out.push(txt(g.left - 7, Y(tick) + 4.5, fmtTick(tick), {anchor: 'end'})); }
      for (const tick of sx.ticks) { if (grid === 'vertical' || grid === 'both') out.push(seg(X(tick), g.top, X(tick), g.top + g.ph)); if (showX) out.push(xText({W}, X(tick), fmtTick(tick), H - 10)); }
      out.push(seg(g.left, g.top + g.ph, g.left + g.pw, g.top + g.ph, 'ch-axis'));
      // 버블 면적이 size에 비례한다(반지름은 √size). 반지름에 상수를 더하면 크기 비가 면적 비로 읽히지 않는다.
      series.forEach((item, si) => item.points.forEach(point => out.push(`<circle data-bubble-size="${point.size}" cx="${num(X(point.x))}" cy="${num(Y(point.y))}" r="${num(Math.max(2, 16 * Math.sqrt(point.size / sizeMax)))}" fill="${COLOR(si)}" fill-opacity=".7" stroke="${COLOR(si)}"><title>${escape(item.name)}: ${point.x}, ${point.y}; size ${point.size}</title></circle>`)));
      legend = legendItems([...(series.length > 1 ? series.map((item, i) => [swatchOf(i), item.name]) : []), ['background:transparent;border:2px solid var(--kit-muted);border-radius:50%', `원 면적 = 크기${unit ? `(${unit})` : ''}`]]); break;
    }
    case 'treemap': {
      const items = series[0].values.map((value, i) => ({value, i})).filter(item => item.value > 0).sort((a, b) => b.value - a.value || a.i - b.i), total = sum(items.map(item => item.value));
      H = compact ? 170 : 200;
      // squarify: 짧은 변을 따라 줄을 채우다 가장 정사각형에 가까운 비율이 나빠지면 줄을 닫는다. 면적은 값에 정확히 비례한다.
      const box = {x: 12, y: 10, w: W - 24, h: H - 20}, scale = box.w * box.h / total, cells = [];
      let rest = items.slice(), area = {...box};
      const worst = (row, side) => { const s = sum(row.map(item => item.value)) * scale; return Math.max(...row.map(item => Math.max(side * side * item.value * scale / (s * s), s * s / (side * side * item.value * scale)))); };
      while (rest.length) {
        const side = Math.min(area.w, area.h); let row = [rest[0]], k = 1;
        while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) row.push(rest[k++]);
        const rowArea = sum(row.map(item => item.value)) * scale, thick = rowArea / side;
        let cursor = 0;
        for (const item of row) {
          const len = item.value * scale / thick;
          cells.push(area.w >= area.h ? {...item, x: area.x, y: area.y + cursor, w: thick, h: len} : {...item, x: area.x + cursor, y: area.y, w: len, h: thick});
          cursor += len;
        }
        area = area.w >= area.h ? {x: area.x + thick, y: area.y, w: area.w - thick, h: area.h} : {x: area.x, y: area.y + thick, w: area.w, h: area.h - thick};
        rest = rest.slice(row.length);
      }
      for (const c of cells) {
        out.push(`<rect data-cell="${c.i}" x="${num(c.x)}" y="${num(c.y)}" width="${num(Math.max(1, c.w - 2))}" height="${num(Math.max(1, c.h - 2))}" rx="3" class="ch-slice" style="fill:${COLOR(c.i)}"><title>${escape(cats[c.i])}: ${c.value}${unit ? ` ${escape(unit)}` : ''} (${Math.round(c.value / total * 100)}%)</title></rect>`);
        if (c.w >= 46 && c.h >= 34) out.push(`<text x="${num(c.x + 8)}" y="${num(c.y + 18)}" class="ch-v" style="fill:var(--kit-surface)">${escape(fitText(cats[c.i], c.w - 18))}</text><text x="${num(c.x + 8)}" y="${num(c.y + 34)}" class="ch-v" style="fill:var(--kit-surface)">${fmtTick(c.value)}${unit ? ` ${escape(unit)}` : ''}</text>`);
      }
      legend = `<ul class="kit-legend">${series[0].values.map((value, i) => `<li><i style="${swatchOf(i)}" aria-hidden="true"></i>${escape(cats[i])} <b>${fmtTick(value)}${unit ? ` ${escape(unit)}` : ''}</b></li>`).join('')}</ul>`; break;
    }
    case 'radar': {
      H = 250; const cx = 180, cy = 128, radius = 88, angleAt = i => -Math.PI / 2 + i * 2 * Math.PI / cats.length;
      const at = (i, r) => [cx + r * Math.cos(angleAt(i)), cy + r * Math.sin(angleAt(i))];
      for (const ring of [.25, .5, .75, 1]) out.push(`<polygon points="${cats.map((_, i) => at(i, radius * ring).map(num).join(',')).join(' ')}" fill="none" class="ch-grid"/>`);
      cats.forEach((label, i) => { const [x, y] = at(i, radius); out.push(seg(cx, cy, x, y)); });
      for (const ring of [.5, 1]) out.push(txt(cx + 4, cy - radius * ring + 12, String(ring * 100), {anchor: 'start'}));
      cats.forEach((label, i) => { const [x, y] = at(i, radius + 14), cos = Math.cos(angleAt(i)); out.push(txt(x, y + 4.5, fitText(label, 80), {anchor: Math.abs(cos) < .3 ? 'middle' : cos > 0 ? 'start' : 'end'})); });
      series.forEach((item, si) => {
        const pts = item.values.map((value, i) => at(i, radius * value / 100));
        out.push(`<polygon data-series="${si}" points="${pts.map(p => p.map(num).join(',')).join(' ')}" fill="${COLOR(si)}" fill-opacity=".22" stroke="${COLOR(si)}" stroke-width="2"/>`);
        pts.forEach((p, i) => out.push(`<g class="ch-point" style="color:${COLOR(si)}"><title>${escape(cats[i])} · ${escape(item.name)}: ${item.values[i]}${unit ? ` ${escape(unit)}` : ''}</title>${marker(si, p[0], p[1], (si % 6) + 1)}</g>`));
      });
      legend = seriesLegend(series); break;
    }
    case 'gauge': {
      H = 176; const value = series[0].values[0], cx = 180, cy = 140, r = 108, angle = Math.PI + value / 100 * Math.PI;
      const ex = cx + r * Math.cos(angle), ey = cy + r * Math.sin(angle);
      out.push(`<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="var(--kit-border)" stroke-width="22"/>`,
        value > 0 ? `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${num(ex)} ${num(ey)}" fill="none" stroke="${COLOR(0)}" stroke-width="22"/>` : '',
        `<line x1="${cx}" y1="${cy}" x2="${num(cx + 84 * Math.cos(angle))}" y2="${num(cy + 84 * Math.sin(angle))}" stroke="var(--kit-text)" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="7" fill="var(--kit-text)"/>`,
        txt(cx - r, cy + 22, '0'), txt(cx + r, cy + 22, '100'),
        `<text x="${cx}" y="${cy + 26}" text-anchor="middle" class="ch-big">${fmtTick(value)}${escape(unit)}</text>`); break;
    }
    case 'bullet': {
      H = 112; const value = series[0].values[0], target = series[0].target, left = 24, pw = W - 48, X = v => left + pw * v / 100;
      out.push(txt(left, 18, `${cats[0]} · 실적 ${fmtTick(value)}${unit} · 목표 ${fmtTick(target)}${unit}`, {anchor: 'start', cls: 'ch-v'}),
        `<rect x="${left}" y="34" width="${pw}" height="26" rx="4" fill="var(--kit-border)"/>`,
        `<rect data-series="0" x="${left}" y="34" width="${num(pw * value / 100)}" height="26" rx="4" fill="${COLOR(0)}"><title>실적 ${value}${unit}</title></rect>`,
        `<line x1="${num(X(target))}" y1="28" x2="${num(X(target))}" y2="66" stroke="var(--kit-text)" stroke-width="4"><title>목표 ${target}${unit}</title></line>`);
      for (const tick of [0, 25, 50, 75, 100]) out.push(seg(X(tick), 62, X(tick), 68, 'ch-axis'), xText({W}, X(tick), String(tick), 84));
      legend = legendItems([[swatchOf(0), series[0].name], ['background:var(--kit-text);width:4px', '목표']]); break;
    }
    case 'box-plot': {
      const rows = series.length, rowH = 44, left = clamp(Math.max(...cats.map(c => textWidth(c))) + 16, 44, 90), pw = W - left - 18, top = 12;
      H = top + rows * rowH + 34;
      const scale = niceScale(series.flatMap(item => Object.values(item.quartiles)), {zero: false}), X = v => left + (v - scale.lo) / scale.span * pw, grid = gridOf(n);
      for (const tick of scale.ticks) { if (grid !== 'none') out.push(seg(X(tick), top, X(tick), top + rows * rowH)); out.push(xText({W}, X(tick), fmtTick(tick), H - 10)); }
      if (scale.lo < 0 && scale.hi > 0) out.push(seg(X(0), top, X(0), top + rows * rowH, 'ch-axis'));
      out.push(seg(left, top + rows * rowH, left + pw, top + rows * rowH, 'ch-axis'));
      series.forEach((item, i) => {
        const q = item.quartiles, cy = top + rowH * (i + .5), t = `<title>${escape(cats[i])}: min ${q.min} · q1 ${q.q1} · median ${q.median} · q3 ${q.q3} · max ${q.max}</title>`;
        out.push(txt(left - 8, cy + 4.5, fitText(cats[i], left - 12), {anchor: 'end'}),
          `<g data-series="${i}">${t}<line x1="${num(X(q.min))}" y1="${cy}" x2="${num(X(q.max))}" y2="${cy}" stroke="${COLOR(i)}" stroke-width="2"/><line x1="${num(X(q.min))}" y1="${cy - 8}" x2="${num(X(q.min))}" y2="${cy + 8}" stroke="${COLOR(i)}" stroke-width="2"/><line x1="${num(X(q.max))}" y1="${cy - 8}" x2="${num(X(q.max))}" y2="${cy + 8}" stroke="${COLOR(i)}" stroke-width="2"/><rect x="${num(X(q.q1))}" y="${cy - 14}" width="${num(Math.max(2, X(q.q3) - X(q.q1)))}" height="28" fill="${COLOR(i)}" fill-opacity=".35" stroke="${COLOR(i)}" stroke-width="2"/><line x1="${num(X(q.median))}" y1="${cy - 14}" x2="${num(X(q.median))}" y2="${cy + 14}" stroke="var(--kit-text)" stroke-width="3"/></g>`);
        if (n.labels === 'values') out.push(txt(X(q.median), cy - 18, fmtTick(q.median), {cls: 'ch-v'}));
      });
      legend = legendItems([['background:var(--kit-text);width:4px', '중앙값'], ['background:var(--kit-muted);opacity:.4', '1사분위~3사분위'], ['background:var(--kit-muted);height:2px', '최솟값~최댓값']]); break;
    }
    case 'combination': {
      const bars = series.filter(item => item.mark === 'bar'), lines = series.filter(item => item.mark === 'line');
      const left = niceScale(bars.flatMap(item => item.values), {axis: n.axis}), right = niceScale(lines.flatMap(item => item.values));
      const rightW = Math.max(...right.ticks.map(t => textWidth(fmtTick(t)))) + 14;
      const {g, out: frame} = cartesianFrame(n, {H, scale: left, labels: cats, right: clamp(rightW + 6, 30, 60), rightTicks: right});
      out.push(...frame);
      const bw = Math.min(26, g.slot * .6 / Math.max(1, bars.length)), tags = [];
      series.forEach((item, si) => {
        if (item.mark === 'bar') {
          const bi = bars.indexOf(item);
          item.values.forEach((value, i) => { const bx = g.X(i) + (bi - (bars.length - 1) / 2) * bw - bw / 2; out.push(`<rect data-series="${si}" x="${num(bx)}" y="${num(g.Y(value))}" width="${num(bw)}" height="${num(Math.max(1, g.Y(left.lo) - g.Y(value)))}" rx="2" class="ch-bar" style="fill:${COLOR(si)}"><title>${escape(cats[i])} · ${escape(item.name)}: ${value}</title></rect>`); tags.push({v: value, x: bx + bw / 2, y: g.Y(value) - 4}); });
        }
      });
      tagValues(out, n, tags);
      series.forEach((item, si) => {
        if (item.mark !== 'line') return;
        const pts = item.values.map((value, i) => [g.X(i), g.top + g.ph - (value - right.lo) / right.span * g.ph]);
        out.push(`<path data-series="${si}" d="${pts.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:${COLOR(si)}"/>`);
        pts.forEach((p, i) => out.push(`<g class="ch-point" style="color:${COLOR(si)}"><title>${escape(cats[i])} · ${escape(item.name)}: ${item.values[i]}</title>${marker(1, p[0], p[1], (si % 6) + 1)}</g>`));
      });
      legend = seriesLegend(series, item => item.mark === 'line' ? ' (선 · 오른쪽 축)' : ' (막대 · 왼쪽 축)'); break;
    }
    case 'calendar-heatmap': {
      const hi = Math.max(1, ...series.flatMap(item => item.values)), left = clamp(Math.max(...series.map(item => textWidth(String(item.name)))) + 14, 36, 80), top = 24, cell = (W - left - 12) / 7, rowH = 28;
      H = top + series.length * rowH + 6;
      cats.forEach((label, day) => out.push(txt(left + cell * (day + .5), 15, label)));
      series.forEach((item, week) => {
        out.push(txt(left - 8, top + week * rowH + 15, fitText(String(item.name), left - 12), {anchor: 'end'}));
        item.values.forEach((value, day) => {
          out.push(`<rect data-cell="${week}-${day}" x="${num(left + day * cell + 1)}" y="${num(top + week * rowH)}" width="${num(cell - 2)}" height="${rowH - 6}" rx="3" fill="${COLOR(0)}" fill-opacity="${(.12 + .88 * value / hi).toFixed(2)}"><title>${escape(item.name)} ${escape(cats[day])}: ${value}${unit ? ` ${escape(unit)}` : ''}</title></rect>`);
          if (n.labels === 'values') out.push(txt(left + cell * (day + .5), top + week * rowH + 15, fmtTick(value), {cls: 'ch-vh'}));
        });
      });
      legend = `<ul class="kit-legend" aria-label="색 진하기 값 범위">${[0, .25, .5, .75, 1].map(f => `<li><i style="background:${COLOR(0)};opacity:${(.12 + .88 * f).toFixed(2)}" aria-hidden="true"></i>${fmtTick(Math.round(hi * f * 10) / 10)}${unit ? ` ${escape(unit)}` : ''}</li>`).join('')}</ul>`; break;
    }
    case 'progress-chart': {
      const rowH = 36, left = 8, labelW = clamp(Math.max(...cats.map(c => textWidth(c))) + 8, 40, 96), trackX = left + labelW, trackW = W - trackX - 52;
      H = 14 + cats.length * rowH;
      series[0].values.forEach((value, i) => {
        const y = 10 + i * rowH;
        out.push(txt(left, y + 14, fitText(cats[i], labelW - 6), {anchor: 'start', cls: 'ch-v'}),
          `<rect x="${trackX}" y="${y}" width="${trackW}" height="18" rx="9" fill="var(--kit-border)"/>`,
          value > 0 ? `<rect data-series="${i}" x="${trackX}" y="${y}" width="${num(Math.max(18, trackW * value / 100))}" height="18" rx="9" fill="${COLOR(i)}"><title>${escape(cats[i])}: ${value}%</title></rect>` : '',
          txt(W - 6, y + 14, `${fmtTick(value)}%`, {anchor: 'end', cls: 'ch-v'}));
      }); break;
    }
    default: return null;
  }
  const title = escape(n.title), description = escape(`${n.caption} · ${n.series.map(item => item.name).join(', ')} · ${n.unit ?? ''}`);
  const svg = `<svg${svgClass ? ` class="${svgClass}"` : ''} viewBox="${viewBox ?? `0 0 ${W} ${H}`}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false" data-renderer-kind="${n.kind}"><title id="${id}-t">${title}</title><desc id="${id}-d">${description}</desc>${out.join('')}</svg>`;
  const shownLegend = mode === 'none' ? '' : legend, position = !shownLegend ? 'none' : mode === 'right' ? 'right' : 'bottom';
  const rows = n.kind === 'box-plot' ? series.map((item, i) => `<tr><th scope="row">${escape(cats[i])}</th><td>${['min', 'q1', 'median', 'q3', 'max'].map(key => `${key} ${item.quartiles[key]}`).join(' · ')}</td></tr>`)
    : pointKinds.has(n.kind) ? series.flatMap(item => item.points.map(point => `<tr><th scope="row">${escape(item.name)}</th><td>x ${point.x}, y ${point.y}${n.kind === 'bubble' ? `, 크기 ${point.size}` : ''}</td></tr>`))
      : series.flatMap(item => item.values?.map((value, i) => `<tr><th scope="row">${escape(cats[i])}</th><td>${escape(item.name)}${item.mark ? ` (${item.mark === 'line' ? '선' : '막대'})` : ''}: ${value}${n.kind === 'pie' ? '%' : n.unit ? ` ${escape(n.unit)}` : ''}</td></tr>`) ?? []);
  if (n.kind === 'bullet') rows.push(`<tr><th scope="row">${escape(cats[0])}</th><td>목표: ${series[0].target}${n.unit ? ` ${escape(n.unit)}` : ''}</td></tr>`);
  const table = `<details class="kit-chart-data"><summary>데이터 표 보기</summary><table><thead><tr><th scope="col">${escape(n.xLabel ?? '항목')}</th><th scope="col">${escape(n.yLabel ?? '값')}</th></tr></thead><tbody>${rows.join('')}</tbody></table></details>`;
  return `<figure class="kit-chart" data-kind="${n.kind}" data-chart="2.6" data-type="${escape(n.dataType)}" data-grid="${gridOf(n)}" data-labels="${n.labels ?? 'none'}" data-legend="${position}" data-density="${n.density ?? 'comfortable'}" data-responsive="fit"><figcaption><strong>${title}</strong><span>${escape(n.caption)} · 단위 ${escape(n.unit ?? '')}</span></figcaption><div class="kit-chart-body">${svg}${shownLegend}</div>${table}</figure>`;
}

/**
 * Render by preset id with supplied data. Invalid values are returned as explicit diagnostics.
 * options.colorRoles: true이면 applyChartColorRoles를 적용한다. 기본(false)은 2.4.0~2.6.0 출력과 바이트가 같다.
 */
export function renderChartPreset(id, data = {}, {colorRoles = false} = {}) {
  const chart = resolveChartPreset(id, data);
  if (chart.errors) return chart;
  if (EXTENDED_KINDS.has(chart.kind)) {
    const contractErrors = validateChartPresetData(chart.kind, chart);
    if (contractErrors.length) return {errors: contractErrors};
    const html = renderExtendedChart(chart, `preset-${id.replace(/[^a-z0-9-]/gi, '-')}`);
    return colorRoles ? applyChartColorRoles(html, chart.kind) : html;
  }
  const errors = checkData(chart);
  if (errors.length) return {errors};
  const contractErrors = validateChartPresetData(chart.kind, chart);
  if (contractErrors.length) return {errors: contractErrors};
  const html = renderChart(chart, `preset-${id.replace(/[^a-z0-9-]/gi, '-')}`);
  return colorRoles ? applyChartColorRoles(html, chart.kind) : html;
}
