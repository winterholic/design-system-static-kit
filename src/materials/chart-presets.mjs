import {defineMaterial} from './contract.mjs';

const axis = (x, y, legend = 'bottom') => ({x, y, range: 'data-with-zero', legend});
const labels = (x, y) => ({title: 'required', caption: 'required', x, y, truncateVisualAt: 6, dataTableKeepsFullText: true});
const caption = (kind, x, y) => kind === 'donut' ? `${x} 구성 · 값은 ${y}`
  : kind === 'sparkline' ? `${x} 순 ${y} 추이 · 상세 축 표시는 생략`
    : `Y축 ${y} · X축 ${x}`;
const preset = ({name, label, context, chartKind, categories, series, unit, x, y, legend, example, responsive = 'fluid'}) => defineMaterial({
  id: `chart-preset:${name}`, kind: 'chart-preset', category: 'chart', label, since: '2.6.0', contexts: [context],
  render: {module: 'src/render/chart-presets.mjs', export: 'renderChartPreset', key: `chart-preset:${name}`},
  defaults: {scale: 'standard'}, variants: {scale: ['standard']},
  tokens: ['--kit-chart1', '--kit-chart2', '--kit-chart3', '--kit-chart4', '--kit-chart5', '--kit-border', '--kit-muted', '--kit-text'],
  responsive: {strategy: responsive, breakpoints: {narrow: 560}, note: 'SVG scales to its container; long labels remain in the HTML data table.'},
  a11y: {rules: ['R05', 'R15'], role: 'img with title, summary and expandable data table', keyboard: 'native details/summary', alternative: 'HTML table preserves complete labels and values'},
  validation: {rules: ['R15'], codes: ['CHART_SHAPE', 'CHART_AXIS', 'NUMBER']},
  examples: [{type: 'chart', title: label, caption: caption(chartKind, x, y), kind: chartKind, unit, xLabel: x, yLabel: y, axis: {showX: 'yes', showY: 'yes'}, ...(categories.length ? {categories} : {}), series}],
  quality: {status: 'verified', evidence: ['tests/chart-presets.test.mjs:51']},
  source: {origin: 'internal', license: 'MIT'}, preset: true,
  tags: ['chart', context, chartKind],
  ext: {chartKind, series: {minimum: series.length, maximum: series.length, labels: series.map(item => item.name)}, axes: axis(['donut', 'sparkline'].includes(chartKind) ? 'omitted' : x, ['donut', 'sparkline'].includes(chartKind) ? 'omitted' : y, legend), unit, labels: labels(x, y)},
});

/** Purposeful presets vary data model, chart form and information hierarchy, not just colors. */
export const chartPresetMaterials = Object.freeze([
  preset({name: 'erp-quarterly-revenue', label: 'ERP 분기 매출 누적', context: 'dashboard', chartKind: 'stacked-bar', unit: '백만 원', x: '분기', y: '매출', categories: ['1분기', '2분기', '3분기'], series: [{name: '제품', values: [42, 48, 53]}, {name: '서비스', values: [24, 29, 31]}]}),
  preset({name: 'finance-monthly-close', label: '금융 월말 잔액 추이', context: 'dashboard', chartKind: 'line', unit: '억 원', x: '월', y: '잔액', categories: ['1월', '2월', '3월', '4월'], series: [{name: '예수금', values: [32, 35, 33, 39]}, {name: '운용액', values: [20, 22, 24, 27]}]}),
  preset({name: 'analytics-cohort-scatter', label: '분석 전환율 분포', context: 'dashboard', chartKind: 'scatter', unit: '%', x: '방문 횟수', y: '전환율', categories: [], series: [{name: '사용자 표본', points: [{x: 1, y: 2}, {x: 2, y: 5}, {x: 4, y: 7}, {x: 7, y: 9}]}]}),
  preset({name: 'marketing-channel-share', label: '마케팅 채널 비중', context: 'dashboard', chartKind: 'donut', unit: '%', x: '채널', y: '전환', legend: 'right', categories: ['검색', '메일', '추천'], series: [{name: '전환', values: [48, 31, 21]}]}),
  preset({name: 'mobile-sparkline', label: '모바일 주간 요청량', context: 'dashboard', chartKind: 'sparkline', unit: '건', x: '요일', y: '요청량', legend: 'omitted-single-series', categories: ['월', '화', '수', '목', '금'], series: [{name: '요청', values: [8, 12, 10, 16, 14]}]}),
  preset({name: 'operations-activity-heatmap', label: '운영 시간대별 활동', context: 'dashboard', chartKind: 'heatmap', unit: '회', x: '시간', y: '요일', legend: 'color-scale-in-data-table', categories: ['09시', '12시', '15시'], series: [{name: '월', values: [3, 8, 5]}, {name: '화', values: [4, 6, 9]}, {name: '수', values: [2, 5, 7]}]}),
  preset({name: 'sales-pipeline-value', label: '영업 단계별 금액', context: 'dashboard', chartKind: 'bar', unit: '백만 원', x: '단계', y: '예상 금액', categories: ['발굴', '제안', '협의'], series: [{name: '예상', values: [18, 26, 21]}]}),
  preset({name: 'campaign-weekly-growth', label: '캠페인 주간 유입', context: 'dashboard', chartKind: 'area', unit: '명', x: '주차', y: '방문자', categories: ['1주', '2주', '3주', '4주', '5주', '6주', '7주', '8주'], series: [{name: '방문자', values: [120, 175, 160, 220, 210, 265, 248, 310]}]}),
]);
