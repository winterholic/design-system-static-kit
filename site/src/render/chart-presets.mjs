import {chartPresetMaterials} from '../materials/chart-presets.mjs';
import {renderChart} from './chart.mjs';
import {chartDiagnostics, levelsOf, seriesField} from '../catalog/chart-rules.mjs';

const byId = new Map(chartPresetMaterials.map(material => [material.id, material]));

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

/**
 * Render by preset id with supplied data. Invalid values are returned as explicit diagnostics.
 * options.colorRoles: true이면 applyChartColorRoles를 적용한다. 기본(false)은 2.4.0~2.6.0 출력과 바이트가 같다.
 */
export function renderChartPreset(id, data = {}, {colorRoles = false} = {}) {
  const chart = resolveChartPreset(id, data);
  if (chart.errors) return chart;
  const errors = checkData(chart);
  if (errors.length) return {errors};
  const html = renderChart(chart, `preset-${id.replace(/[^a-z0-9-]/gi, '-')}`);
  return colorRoles ? applyChartColorRoles(html, chart.kind) : html;
}
