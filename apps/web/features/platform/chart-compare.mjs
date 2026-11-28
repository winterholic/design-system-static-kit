// Three chart forms share one fixed sample so the Explore comparison changes visualization only.
export const CHART_SAMPLE = Object.freeze({
  title: '월별 매출', caption: '같은 데이터 · 백만 원', unit: '백만 원', xLabel: '월', yLabel: '매출',
  categories: Object.freeze(['1월', '2월', '3월', '4월']),
  series: Object.freeze([{name: '매출', values: Object.freeze([12, 18, 15, 22])}]),
});
export const COMPARABLE_CHART_KINDS = Object.freeze(new Set(['bar', 'line', 'area']));

export function chartNodeOf(material) {
  const kind = material?.ext?.chartKind;
  if (!COMPARABLE_CHART_KINDS.has(kind)) return null;
  const example = material.examples?.[0] ?? {};
  return {
    type: 'chart', ...CHART_SAMPLE, kind,
    ...(example.axis ? {axis: example.axis} : {}),
    ...(example.grid ? {grid: example.grid} : {}),
    ...(example.labels ? {labels: example.labels} : {}),
    ...(example.legend ? {legend: example.legend} : {}),
  };
}
