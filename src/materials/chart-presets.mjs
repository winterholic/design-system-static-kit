import {defineMaterial} from './contract.mjs';
import {chartOptions} from '../catalog/chart-rules.mjs';

/**
 * 차트 프리셋 재료(2.6.0). 프리셋은 "색만 바꾼 복제"가 아니라 형태·축·격자·값 라벨·범례·밀도·반응형 중 눈에 보이는 차이를 가진 완성 묶음이다.
 * 같은 형태의 두 프리셋은 `PRESET_AXES`에서 2곳 이상 달라야 한다(`distinctnessViolations`, tests/chart-presets-distinct.test.mjs).
 * 색은 서명에 넣지 않는다: 색만 다른 프리셋은 서명이 같아 실패한다.
 */
const EVIDENCE = ['tests/chart-presets.test.mjs:233', 'tests/chart-presets.test.mjs:271', 'tests/chart-presets-distinct.test.mjs:51', 'tests/chart-presets-forms.test.mjs:32'];
export const PRESET_AXES = Object.freeze(['grid', 'labels', 'legend', 'density', 'responsive', 'axes', 'series', 'dataType']);

const noAxisKinds = ['donut', 'pie', 'sparkline', 'funnel', 'treemap', 'radar', 'gauge', 'bullet', 'calendar-heatmap', 'progress-chart'];
const PRESET_DATA_SCHEMAS = Object.freeze({
  'grouped-bar': {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 2, valueType: 'finite-number', constraints: ['nonnegative', 'zero-baseline']},
  'normalized-stacked-bar': {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 2, valueType: 'finite-number', constraints: ['nonnegative', 'each-category-total-100']},
  'multi-line': {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 2, valueType: 'finite-number', constraints: ['ordered-categories']},
  'step-line': {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 1, valueType: 'finite-number', constraints: ['ordered-categories']},
  'stacked-area': {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 2, valueType: 'finite-number', constraints: ['nonnegative', 'zero-baseline']},
  pie: {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 1, valueType: 'finite-number', constraints: ['nonnegative', 'total-100']},
  bubble: {seriesField: 'points', categoryCount: 'none', minimumSeries: 1, valueType: '{x:number,y:number,size:number}', constraints: ['finite-coordinates', 'positive-size']},
  treemap: {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 1, valueType: 'finite-number', constraints: ['nonnegative', 'positive-total']},
  radar: {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 1, valueType: 'finite-number', constraints: ['shared-scale-0-100']},
  gauge: {seriesField: 'values', categoryCount: 'single', minimumSeries: 1, valueType: 'finite-number', constraints: ['domain-0-100']},
  bullet: {seriesField: 'values', categoryCount: 'single', minimumSeries: 1, valueType: 'finite-number', constraints: ['nonnegative', 'required-target-in-domain']},
  'box-plot': {seriesField: 'quartiles', categoryCount: 'series-length', minimumSeries: 1, valueType: '{min,q1,median,q3,max}', constraints: ['ordered-five-number-summary']},
  combination: {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 2, valueType: 'finite-number', constraints: ['bar-and-line-series', 'zero-baseline-for-bars']},
  'calendar-heatmap': {seriesField: 'values', categoryCount: 'weekdays', minimumSeries: 1, valueType: 'finite-number', constraints: ['complete-week-grid', 'nonnegative']},
  'progress-chart': {seriesField: 'values', categoryCount: 'series-length', minimumSeries: 1, valueType: 'finite-number', constraints: ['domain-0-100']},
});
const standardDataSchema = kind => PRESET_DATA_SCHEMAS[kind] ?? ({seriesField: ['scatter', 'bubble'].includes(kind) ? 'points' : ['candlestick', 'ohlc'].includes(kind) ? 'candles' : kind === 'histogram' ? 'samples' : 'values', categoryCount: ['scatter', 'histogram'].includes(kind) ? 'none' : 'series-length', minimumSeries: 1, valueType: 'finite-number', constraints: ['finite-values', ...(kind === 'donut' ? ['nonnegative', 'total-100'] : []), ...(['bar', 'bars-h', 'stacked-bar', 'area', 'histogram', 'waterfall'].includes(kind) ? ['zero-baseline'] : []), ...(kind === 'heatmap' ? ['nonnegative'] : []), ...(kind === 'funnel' ? ['non-increasing-stages'] : []), ...(kind === 'sparkline' ? ['exactly-one-series'] : [])]});
const distortionRules = kind => standardDataSchema(kind).constraints.map(rule => ({rule, enforcedBy: 'validateChartPresetData'}));
const captionOf = (kind, x, y) => kind === 'donut' ? `${x} 구성 · 값은 ${y}`
  : kind === 'sparkline' ? `${x} 순 ${y} 추이 · 상세 축 표시는 생략`
    : kind === 'funnel' ? `${x}별 ${y}와 첫 단계 대비 비율`
      : kind === 'histogram' ? `${y}의 분포: ${x}별 관측 수`
        : kind === 'candlestick' || kind === 'ohlc' ? `${x}별 시가·고가·저가·종가`
          : kind === 'waterfall' ? `${x} 증감이 합계로 이어지는 과정 · 값은 ${y}`
            : `Y축 ${y} · X축 ${x}`;

/** 한 프리셋의 예시 노드. 차트 옵션은 적은 것만 노드에 들어가 기본값은 렌더러가 채운다. */
const preset = ({name, label, domain, context = 'dashboard', kind, dataType, unit, x, y, categories = [], series, axis = {}, grid, labels, legend, density, responsive, bins, note}) => {
  const node = {
    type: 'chart', title: label, caption: note ?? captionOf(kind, x, y), kind, unit, xLabel: x, yLabel: y, dataType,
    axis: {showX: 'yes', showY: 'yes', ...axis},
    ...(grid ? {grid} : {}), ...(labels ? {labels} : {}), ...(legend ? {legend} : {}), ...(density ? {density} : {}), ...(responsive ? {responsive} : {}), ...(bins ? {bins} : {}),
    ...(categories.length ? {categories} : {}), series,
  };
  const options = {...chartOptions(node), dataSchema: standardDataSchema(kind), distortionRules: distortionRules(kind)}, omitted = noAxisKinds.includes(kind);
  return defineMaterial({
    id: `chart-preset:${name}`, kind: 'chart-preset', category: 'chart', label, since: '2.6.0', contexts: [context],
    render: {module: 'src/render/chart-presets.mjs', export: 'renderChartPreset', key: `chart-preset:${name}`},
    defaults: {scale: 'standard'}, variants: {scale: ['standard']},
    tokens: ['--kit-chart1', '--kit-chart2', '--kit-chart3', '--kit-chart4', '--kit-chart5', '--kit-border', '--kit-muted', '--kit-text'],
    responsive: {strategy: options.responsive === 'scroll' ? 'container' : 'fluid', breakpoints: {narrow: 560}, note: options.responsive === 'scroll' ? 'The 600px plot scrolls horizontally inside a focusable region; the HTML data table keeps every label.' : 'SVG scales to its container; long labels remain in the HTML data table.'},
    a11y: {rules: ['R05', 'R15'], role: 'img with title, summary and expandable data table', keyboard: options.responsive === 'scroll' ? 'scroll region is focusable (tabindex 0); details/summary for the table' : 'native details/summary', alternative: 'HTML table preserves complete labels and values'},
    validation: {rules: ['R15'], codes: ['CHART_SHAPE', 'CHART_AXIS', 'CHART_DATA_FIT', 'CHART_BASELINE', 'CHART_LABEL_OVERLAP', 'CHART_OPTION', 'NUMBER']},
    examples: [node],
    quality: {status: 'verified', evidence: EVIDENCE},
    source: {origin: 'internal', license: 'MIT'}, preset: true,
    tags: ['chart', domain, kind, context],
    ext: {
      chartKind: kind, domain, dataType, series: {minimum: series.length, maximum: series.length, labels: series.map(item => item.name)},
      axes: {x: omitted ? 'omitted' : x, y: omitted ? 'omitted' : y, range: kind === 'candlestick' || kind === 'ohlc' ? 'data-range' : axis.min !== undefined || axis.max !== undefined ? 'explicit' : 'data-with-zero', legend: options.legend},
      unit, labels: {title: 'required', caption: 'required', x, y, truncateVisualAt: 6, dataTableKeepsFullText: true},
      options, signature: Object.freeze(Object.fromEntries([['kind', kind], ...PRESET_AXES.map(key => [key, options[key]])])),
    },
  });
};

const candle = ([open, high, low, close]) => ({open, high, low, close});
const days = ['11/03', '11/04', '11/05', '11/06', '11/07', '11/10', '11/11', '11/12', '11/13', '11/14'];
const index = [[2480, 2502, 2470, 2495], [2495, 2510, 2481, 2488], [2488, 2492, 2455, 2460], [2460, 2488, 2452, 2481], [2481, 2520, 2478, 2515], [2515, 2536, 2509, 2530], [2530, 2541, 2501, 2508], [2508, 2519, 2490, 2514], [2514, 2552, 2511, 2547], [2547, 2558, 2526, 2531]];
const months = n => Array.from({length: n}, (_, i) => `${i + 1}월`);
const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

/** 도메인별 정의. 이름 순서가 곧 재료 목록 순서다(기존 8개 id는 그대로). */
export const chartPresetMaterials = Object.freeze([
  // ---- 기존 8개: 옵션을 명시해 서로 다른 모양으로 고정 ----
  preset({name: 'erp-quarterly-revenue', label: 'ERP 분기 매출 누적', domain: 'erp', kind: 'stacked-bar', dataType: 'time', unit: '백만 원', x: '분기', y: '매출', categories: ['1분기', '2분기', '3분기'], grid: 'horizontal', labels: 'values', legend: 'bottom', series: [{name: '제품', values: [42, 48, 53]}, {name: '서비스', values: [24, 29, 31]}]}),
  preset({name: 'finance-monthly-close', label: '금융 월말 잔액 추이', domain: 'finance', kind: 'line', dataType: 'time', unit: '억 원', x: '월', y: '잔액', categories: months(4), grid: 'both', labels: 'last', legend: 'bottom', series: [{name: '예수금', values: [32, 35, 33, 39]}, {name: '운용액', values: [20, 22, 24, 27]}]}),
  preset({name: 'analytics-cohort-scatter', label: '분석 전환율 분포', domain: 'analytics', kind: 'scatter', dataType: 'relationship', unit: '%', x: '방문 횟수', y: '전환율', grid: 'both', series: [{name: '사용자 표본', points: [{x: 1, y: 2}, {x: 2, y: 5}, {x: 4, y: 7}, {x: 7, y: 9}]}]}),
  preset({name: 'marketing-channel-share', label: '마케팅 채널 비중', domain: 'marketing', kind: 'donut', dataType: 'part-to-whole', unit: '%', x: '채널', y: '전환', legend: 'right', categories: ['검색', '메일', '추천'], series: [{name: '전환', values: [48, 31, 21]}]}),
  preset({name: 'mobile-sparkline', label: '모바일 주간 요청량', domain: 'mobile', kind: 'sparkline', dataType: 'time', unit: '건', x: '요일', y: '요청량', labels: 'last', legend: 'none', density: 'compact', categories: ['월', '화', '수', '목', '금'], series: [{name: '요청', values: [8, 12, 10, 16, 14]}]}),
  preset({name: 'operations-activity-heatmap', label: '운영 시간대별 활동', domain: 'erp', kind: 'heatmap', dataType: 'time', unit: '회', x: '시간', y: '요일', categories: ['09시', '12시', '15시'], series: [{name: '월', values: [3, 8, 5]}, {name: '화', values: [4, 6, 9]}, {name: '수', values: [2, 5, 7]}]}),
  preset({name: 'sales-pipeline-value', label: '영업 단계별 금액', domain: 'erp', kind: 'bar', dataType: 'process', unit: '백만 원', x: '단계', y: '예상 금액', categories: ['발굴', '제안', '협의'], grid: 'horizontal', labels: 'values', series: [{name: '예상', values: [18, 26, 21]}]}),
  preset({name: 'campaign-weekly-growth', label: '캠페인 주간 유입', domain: 'marketing', kind: 'area', dataType: 'time', unit: '명', x: '주차', y: '방문자', categories: ['1주', '2주', '3주', '4주', '5주', '6주', '7주', '8주'], grid: 'horizontal', labels: 'extremes', series: [{name: '방문자', values: [120, 175, 160, 220, 210, 265, 248, 310]}]}),

  // ---- ERP ----
  preset({name: 'erp-budget-bridge', label: 'ERP 예산 대비 실적 브리지', domain: 'erp', kind: 'waterfall', dataType: 'category', unit: '백만 원', x: '항목', y: '금액', categories: ['예산', '매출', '원가', '인건비', '기타', '실적'], grid: 'horizontal', labels: 'values', series: [{name: '예산 대비 실적', values: [1200, 180, -140, 60, -30, 1270], roles: ['total', 'delta', 'delta', 'delta', 'delta', 'total']}]}),
  preset({name: 'erp-inventory-aging', label: 'ERP 재고 연령 분포', domain: 'erp', context: 'data', kind: 'bars-h', dataType: 'category', unit: '백만 원', x: '연령', y: '재고 금액', categories: ['0~30일', '31~60일', '61~90일', '90일+'], grid: 'vertical', labels: 'values', series: [{name: '재고 금액', values: [820, 460, 210, 95]}]}),
  preset({name: 'erp-cost-breakdown', label: 'ERP 부서별 비용 구성', domain: 'erp', context: 'data', kind: 'stacked-bar', dataType: 'category', unit: '백만 원', x: '부서', y: '비용', categories: ['영업', '개발', '운영', '지원'], grid: 'both', legend: 'right', density: 'compact', series: [{name: '인건비', values: [64, 88, 41, 30]}, {name: '외주', values: [18, 52, 12, 6]}, {name: '기타', values: [9, 14, 11, 8]}]}),
  preset({name: 'erp-lead-time-histogram', label: 'ERP 발주 리드타임 분포', domain: 'erp', context: 'data', kind: 'histogram', dataType: 'distribution', unit: '일', x: '리드타임(일)', y: '발주 건수', grid: 'both', series: [{name: '발주 건', samples: [3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12, 12, 13, 14, 5, 6, 7, 8, 4, 9, 6, 7, 8]}]}),
  preset({name: 'erp-monthly-closing', label: 'ERP 월별 결산 소요 시간', domain: 'erp', context: 'data', kind: 'bar', dataType: 'time', unit: '시간', x: '월', y: '결산 소요', categories: months(12), grid: 'horizontal', labels: 'extremes', responsive: 'scroll', series: [{name: '결산 소요', values: [36, 30, 42, 28, 26, 40, 24, 22, 38, 27, 25, 46]}]}),

  // ---- 금융 ----
  preset({name: 'finance-price-candles', label: '금융 지수 일봉 캔들', domain: 'finance', kind: 'candlestick', dataType: 'time', unit: '포인트', x: '거래일', y: '지수', categories: days, grid: 'horizontal', series: [{name: '종합지수', candles: index.map(candle)}]}),
  preset({name: 'finance-price-ohlc', label: '금융 지수 OHLC 막대', domain: 'finance', kind: 'ohlc', dataType: 'time', unit: '포인트', x: '거래일', y: '지수', categories: days.slice(0, 8), grid: 'both', density: 'compact', legend: 'right', series: [{name: '종합지수', candles: index.slice(0, 8).map(candle)}]}),
  preset({name: 'finance-cashflow-waterfall', label: '금융 월간 현금흐름 폭포', domain: 'finance', kind: 'waterfall', dataType: 'time', unit: '억 원', x: '구분', y: '잔액', categories: ['기초', '입금', '지출', '투자', '기말'], grid: 'none', labels: 'values', legend: 'right', density: 'compact', series: [{name: '현금흐름', values: [500, 320, -210, -90, 520], roles: ['total', 'delta', 'delta', 'delta', 'total']}]}),
  preset({name: 'finance-yield-curve', label: '금융 국채 수익률 곡선', domain: 'finance', kind: 'line', dataType: 'time', unit: '%', x: '만기', y: '수익률', categories: ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '30Y'], axis: {showY: 'no', min: 2.5, max: 4}, grid: 'none', labels: 'values', series: [{name: '국채', values: [3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 3.9]}]}),
  preset({name: 'finance-risk-return-scatter', label: '금융 위험 대비 수익', domain: 'finance', kind: 'scatter', dataType: 'relationship', unit: '%', x: '변동성(%)', y: '수익률(%)', grid: 'horizontal', series: [{name: '주식형', points: [{x: 14, y: 9}, {x: 18, y: 12}, {x: 22, y: 13}, {x: 26, y: 17}]}, {name: '채권형', points: [{x: 3, y: 3}, {x: 5, y: 4}, {x: 7, y: 5}, {x: 9, y: 5}]}]}),
  preset({name: 'finance-drawdown-area', label: '금융 고점 대비 낙폭', domain: 'finance', kind: 'area', dataType: 'time', unit: '%', x: '월', y: '낙폭', categories: months(10), grid: 'none', labels: 'extremes', density: 'compact', series: [{name: '낙폭', values: [0, -1.2, -2.8, -2.1, -4.5, -3.9, -2.2, -1.1, -0.6, 0]}]}),

  // ---- 분석 ----
  preset({name: 'analytics-session-histogram', label: '분석 세션 길이 분포', domain: 'analytics', context: 'data', kind: 'histogram', dataType: 'distribution', unit: '분', x: '세션 길이(분)', y: '세션 수', grid: 'horizontal', labels: 'values', density: 'compact', bins: 7, series: [{name: '세션', samples: [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 16, 18, 19, 21, 22, 24, 26, 28, 30, 33, 36, 40, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 3, 5, 7, 2, 4, 6]}]}),
  preset({name: 'analytics-retention-heatmap', label: '분석 코호트 잔존율', domain: 'analytics', context: 'data', kind: 'heatmap', dataType: 'time', unit: '%', x: '경과 주', y: '가입 월', categories: ['1주', '2주', '3주', '4주', '5주', '6주'], labels: 'values', density: 'compact', series: [{name: '7월', values: [100, 62, 48, 41, 37, 35]}, {name: '8월', values: [100, 66, 51, 44, 40, 38]}, {name: '9월', values: [100, 70, 55, 47, 43, 41]}, {name: '10월', values: [100, 72, 58, 50, 46, 44]}, {name: '11월', values: [100, 75, 60, 52, 48, 46]}]}),
  preset({name: 'analytics-traffic-lines', label: '분석 요일별 유입 단계', domain: 'analytics', kind: 'line', dataType: 'time', unit: '건', x: '요일', y: '건수', categories: weekdays, grid: 'horizontal', legend: 'right', series: [{name: '유입', values: [420, 480, 510, 530, 560, 380, 340]}, {name: '가입', values: [90, 110, 120, 126, 134, 82, 70]}, {name: '구매', values: [28, 34, 40, 41, 46, 25, 21]}]}),
  preset({name: 'analytics-feature-adoption', label: '분석 기능 사용률 순위', domain: 'analytics', kind: 'bars-h', dataType: 'category', unit: '%', x: '기능', y: '사용률', categories: ['검색', '알림', '공유', '북마크', '리포트', '연동'], axis: {showY: 'no'}, grid: 'none', labels: 'values', density: 'compact', series: [{name: '사용률', values: [82, 67, 54, 41, 33, 18]}]}),
  preset({name: 'analytics-growth-bridge', label: '분석 월간 활성 사용자 증감', domain: 'analytics', kind: 'waterfall', dataType: 'time', unit: '천 명', x: '요인', y: '활성 사용자', categories: ['전월', '신규', '복귀', '추천', '이탈', '휴면', '환불', '당월'], grid: 'both', labels: 'values', responsive: 'scroll', series: [{name: '활성 사용자', values: [1200, 180, 60, 40, -90, -70, -20, 1300], roles: ['total', 'delta', 'delta', 'delta', 'delta', 'delta', 'delta', 'total']}]}),

  // ---- 마케팅 ----
  preset({name: 'marketing-channel-roas', label: '마케팅 채널별 광고비와 매출', domain: 'marketing', kind: 'bar', dataType: 'category', unit: '백만 원', x: '채널', y: '금액', categories: ['검색', '소셜', '메일', '제휴'], grid: 'horizontal', legend: 'bottom', series: [{name: '광고비', values: [32, 45, 12, 20]}, {name: '매출', values: [120, 98, 64, 70]}]}),
  preset({name: 'marketing-conversion-funnel', label: '마케팅 전환 퍼널', domain: 'marketing', kind: 'funnel', dataType: 'process', unit: '명', x: '단계', y: '방문자', categories: ['노출', '클릭', '방문', '가입', '구매'], labels: 'values', series: [{name: '방문자', values: [48000, 9600, 5800, 1900, 620]}]}),

  // ---- 모바일 ----
  preset({name: 'mobile-weekly-activity', label: '모바일 요일별 활동 시간', domain: 'mobile', context: 'listing', kind: 'bar', dataType: 'time', unit: '분', x: '요일', y: '활동 시간', categories: weekdays, axis: {showY: 'no'}, grid: 'none', labels: 'values', density: 'compact', series: [{name: '활동', values: [32, 45, 28, 60, 52, 18, 24]}]}),
  preset({name: 'mobile-balance-trend', label: '모바일 월별 잔액 추이', domain: 'mobile', context: 'listing', kind: 'line', dataType: 'time', unit: '만 원', x: '월', y: '잔액', categories: ['6월', '7월', '8월', '9월', '10월', '11월'], grid: 'none', labels: 'last', density: 'compact', series: [{name: '잔액', values: [120, 135, 128, 150, 162, 171]}]}),
  preset({name: 'mobile-stock-candles', label: '모바일 일봉 스크롤 캔들', domain: 'mobile', context: 'listing', kind: 'candlestick', dataType: 'time', unit: '포인트', x: '거래일', y: '지수', categories: ['10/28', '10/29', '10/30', '10/31', '11/03', '11/04', '11/05', '11/06', '11/07', '11/10', '11/11', '11/12'], grid: 'none', density: 'compact', responsive: 'scroll', series: [{name: '종합지수', candles: [[2441, 2468, 2430, 2462], [2462, 2475, 2449, 2453], [2453, 2471, 2444, 2466], [2466, 2489, 2461, 2480], ...index.slice(0, 8)].map(candle)}]}),
  // ---- §9.1 추가 개별 형태 ----
  preset({name: 'analytics-grouped-bar', label: '분석 채널별 전환 비교', domain: 'analytics', kind: 'grouped-bar', dataType: 'category', unit: '%', x: '채널', y: '전환율', categories: ['검색', '메일', '추천'], series: [{name: '신규', values: [42, 35, 51]}, {name: '재방문', values: [58, 49, 67]}]}),
  preset({name: 'erp-normalized-stack', label: 'ERP 부서별 예산 구성비', domain: 'erp', kind: 'normalized-stacked-bar', dataType: 'part-to-whole', unit: '%', x: '부서', y: '예산 구성', categories: ['영업', '개발', '운영'], series: [{name: '인건비', values: [50, 60, 40]}, {name: '운영비', values: [30, 25, 35]}, {name: '투자', values: [20, 15, 25]}]}),
  preset({name: 'analytics-multiline', label: '분석 유입·가입 다중 추이', domain: 'analytics', kind: 'multi-line', dataType: 'time', unit: '천 명', x: '월', y: '사용자', categories: ['1월', '2월', '3월', '4월'], series: [{name: '유입', values: [12, 15, 17, 21]}, {name: '가입', values: [3, 4, 5, 7]}]}),
  preset({name: 'finance-step-rate', label: '금융 기준금리 변경 단계', domain: 'finance', kind: 'step-line', dataType: 'time', unit: '%', x: '시점', y: '기준금리', categories: ['1월', '2월', '3월', '4월'], series: [{name: '기준금리', values: [2.5, 2.5, 3, 3.25]}]}),
  preset({name: 'analytics-stacked-area', label: '분석 사용자 구성 추이', domain: 'analytics', kind: 'stacked-area', dataType: 'time', unit: '천 명', x: '월', y: '사용자', categories: ['1월', '2월', '3월', '4월'], series: [{name: '무료', values: [40, 44, 48, 52]}, {name: '유료', values: [12, 15, 18, 22]}]}),
  preset({name: 'marketing-channel-pie', label: '마케팅 채널 점유 비율', domain: 'marketing', kind: 'pie', dataType: 'part-to-whole', unit: '%', x: '채널', y: '점유율', categories: ['검색', '메일', '추천', '직접'], series: [{name: '비율', values: [40, 25, 20, 15]}]}),
  preset({name: 'analytics-bubble-segments', label: '분석 고객군 규모와 가치', domain: 'analytics', kind: 'bubble', dataType: 'relationship', unit: '천 명', x: '활성도', y: '매출', series: [{name: '고객군', points: [{x: 2, y: 30, size: 12}, {x: 5, y: 55, size: 22}, {x: 8, y: 72, size: 34}]}]}),
  preset({name: 'erp-treemap-costs', label: 'ERP 부서별 비용 면적 구성', domain: 'erp', context: 'data', kind: 'treemap', dataType: 'part-to-whole', unit: '백만 원', x: '부서', y: '비용', categories: ['영업', '개발', '운영', '지원'], series: [{name: '비용', values: [420, 680, 350, 210]}]}),
  preset({name: 'analytics-radar-capability', label: '분석 업무 역량 프로필', domain: 'analytics', kind: 'radar', dataType: 'relationship', unit: '점', x: '역량', y: '점수', categories: ['품질', '속도', '안정성', '확장성', '비용'], series: [{name: '현재', values: [78, 65, 82, 70, 58]}, {name: '목표', values: [90, 80, 90, 85, 75]}]}),
  preset({name: 'finance-gauge-risk', label: '금융 포트폴리오 위험도', domain: 'finance', kind: 'gauge', dataType: 'relationship', unit: '점', x: '위험도', y: '점수', categories: ['위험도'], series: [{name: '현재 위험도', values: [62]}]}),
  preset({name: 'erp-bullet-target', label: 'ERP 목표 대비 실적', domain: 'erp', kind: 'bullet', dataType: 'category', unit: '%', x: '지표', y: '달성률', categories: ['분기 매출'], series: [{name: '실적', values: [78], target: 85}]}),
  preset({name: 'finance-box-volatility', label: '금융 자산 변동 구간', domain: 'finance', context: 'data', kind: 'box-plot', dataType: 'distribution', unit: '%', x: '자산', y: '수익률', categories: ['주식형', '채권형'], series: [{name: '주식형', quartiles: {min: -12, q1: -3, median: 4, q3: 11, max: 24}}, {name: '채권형', quartiles: {min: -5, q1: -1, median: 2, q3: 5, max: 10}}]}),
  preset({name: 'analytics-combination-volume', label: '분석 주문량과 전환율', domain: 'analytics', kind: 'combination', dataType: 'time', unit: '건 / %', x: '월', y: '주문량·전환율', categories: ['1월', '2월', '3월', '4월'], series: [{name: '주문량', values: [120, 150, 136, 190], mark: 'bar'}, {name: '전환율', values: [4, 5, 4.5, 6], mark: 'line'}]}),
  preset({name: 'erp-calendar-activity', label: 'ERP 일자별 작업량', domain: 'erp', context: 'data', kind: 'calendar-heatmap', dataType: 'time', unit: '건', x: '요일', y: '주차', categories: ['월', '화', '수', '목', '금', '토', '일'], series: [{name: '1주', values: [2, 5, 4, 7, 6, 1, 0]}, {name: '2주', values: [3, 4, 8, 6, 9, 2, 1]}, {name: '3주', values: [1, 6, 5, 8, 7, 0, 0]}, {name: '4주', values: [4, 7, 6, 9, 8, 3, 1]}]}),
  preset({name: 'erp-progress-completion', label: 'ERP 프로젝트 완료율', domain: 'erp', kind: 'progress-chart', dataType: 'process', unit: '%', x: '업무', y: '완료율', categories: ['설계', '구현', '검수'], series: [{name: '완료율', values: [100, 72, 38]}]}),
]);

/** 프리셋 서명: 형태와 PRESET_AXES 값. 색은 들어 있지 않다. */
export const presetSignature = material => material.ext.signature;
export const signatureDifferences = (a, b) => ['kind', ...PRESET_AXES].filter(key => presetSignature(a)[key] !== presetSignature(b)[key]);

/**
 * 구별성 위반 목록. 서로 다른 형태는 그 자체로 구별되고, 같은 형태의 두 프리셋은 PRESET_AXES에서 minimum곳 이상 달라야 한다.
 * 색·제목·데이터 값은 서명에 없으므로 그것만 다른 복제는 여기서 걸린다.
 */
export function distinctnessViolations(materials, minimum = 2) {
  const out = [];
  for (let i = 0; i < materials.length; i++) for (let j = i + 1; j < materials.length; j++) {
    const a = materials[i], b = materials[j];
    if (presetSignature(a).kind !== presetSignature(b).kind) continue;
    const differ = signatureDifferences(a, b).filter(key => key !== 'kind');
    if (differ.length < minimum) out.push({a: a.id, b: b.id, differ});
  }
  return out;
}
