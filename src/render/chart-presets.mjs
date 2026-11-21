import {chartPresetMaterials} from '../materials/chart-presets.mjs';
import {renderChart} from './chart.mjs';

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
  const series = Array.isArray(n.series) ? n.series : [];
  if (!series.length) err('CHART_SHAPE', '차트 계열이 하나 이상 필요합니다.');
  if (n.kind !== 'scatter' && (!Array.isArray(n.categories) || n.categories.length < 2)) err('CHART_SHAPE', '범주 2개 이상이 필요합니다.');
  series.forEach((s, i) => {
    const values = n.kind === 'scatter' ? (s.points ?? []).flatMap(p => [p.x, p.y]) : s.values ?? [];
    if (!values.length) err('CHART_SHAPE', `계열 ${i + 1}의 데이터가 비었습니다.`);
    if (values.some(value => !Number.isFinite(value))) err('CHART_VALUE', `계열 ${i + 1}에 유한하지 않은 값이 있습니다.`);
    if (n.kind !== 'scatter' && s.values?.length !== n.categories.length) err('CHART_SHAPE', `계열 ${i + 1}의 값과 범주 개수가 다릅니다.`);
  });
  if (n.axis && Number.isFinite(n.axis.min) && Number.isFinite(n.axis.max) && n.axis.min >= n.axis.max) err('CHART_AXIS', '축 범위는 min보다 max가 커야 합니다.');
  if (n.kind === 'stacked-bar' && series.some(s => s.values?.some(value => value < 0))) err('CHART_SHAPE', 'stacked-bar는 음이 아닌 값만 지원합니다.');
  if (n.kind === 'donut' && (series.length !== 1 || series[0]?.values?.some(value => value < 0) || series[0]?.values?.reduce((sum, value) => sum + value, 0) <= 0)) err('CHART_SHAPE', 'donut은 음이 아닌 값의 계열 하나와 양수 합계가 필요합니다.');
  if (n.kind === 'sparkline' && series.length !== 1) err('CHART_SHAPE', 'sparkline은 계열 하나만 허용합니다.');
  if (n.axis && n.kind !== 'scatter' && Number.isFinite(n.axis.min) && series.some(s => s.values?.some(value => value < n.axis.min))) err('CHART_AXIS', '축 최솟값이 데이터보다 커서 값이 잘립니다.');
  if (n.axis && n.kind !== 'scatter' && Number.isFinite(n.axis.max)) {
    const displayed = n.kind === 'stacked-bar' ? n.categories.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0)) : series.flatMap(s => s.values ?? []);
    if (displayed.some(value => value > n.axis.max)) err('CHART_AXIS', '축 최댓값이 데이터보다 작아 값이 잘립니다.');
  }
  if (n.kind === 'scatter' && n.axis) {
    const points = series.flatMap(s => s.points ?? []);
    if (Number.isFinite(n.axis.xMin) && Number.isFinite(n.axis.xMax) && n.axis.xMin >= n.axis.xMax || Number.isFinite(n.axis.yMin) && Number.isFinite(n.axis.yMax) && n.axis.yMin >= n.axis.yMax) err('CHART_AXIS', '축 범위는 최솟값보다 최댓값이 커야 합니다.');
    if (Number.isFinite(n.axis.xMin) && points.some(p => p.x < n.axis.xMin) || Number.isFinite(n.axis.xMax) && points.some(p => p.x > n.axis.xMax) || Number.isFinite(n.axis.yMin) && points.some(p => p.y < n.axis.yMin) || Number.isFinite(n.axis.yMax) && points.some(p => p.y > n.axis.yMax)) err('CHART_AXIS', '축 범위가 데이터 점을 잘라냅니다.');
  }
  return errors;
}

/** Render by preset id with supplied data. Invalid values are returned as explicit diagnostics. */
export function renderChartPreset(id, data = {}) {
  const chart = resolveChartPreset(id, data);
  if (chart.errors) return chart;
  const errors = checkData(chart);
  if (errors.length) return {errors};
  return renderChart(chart, `preset-${id.replace(/[^a-z0-9-]/gi, '-')}`);
}
