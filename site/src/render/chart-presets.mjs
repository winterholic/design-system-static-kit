import {chartPresetMaterials} from '../materials/chart-presets.mjs';
import {renderChart} from './chart.mjs';
import {chartDiagnostics, levelsOf, seriesField} from '../catalog/chart-rules.mjs';

const byId = new Map(chartPresetMaterials.map(material => [material.id, material]));
const EXTENDED_KINDS = new Set(chartPresetMaterials.filter(m => !['bar', 'bars-h', 'stacked-bar', 'line', 'area', 'donut', 'scatter', 'heatmap', 'waterfall', 'funnel', 'sparkline', 'candlestick', 'ohlc', 'histogram'].includes(m.ext.chartKind)).map(m => m.ext.chartKind));
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const finite = value => typeof value === 'number' && Number.isFinite(value);
const zeroBaseline = new Set(['bar', 'bars-h', 'grouped-bar', 'stacked-bar', 'normalized-stacked-bar', 'area', 'stacked-area', 'histogram', 'waterfall', 'treemap', 'bullet', 'combination', 'progress-chart']);
const percentTotals = new Set(['pie', 'donut']);
const pointKinds = new Set(['scatter', 'bubble']);
const categoryFree = new Set(['scatter', 'bubble', 'histogram']);
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
  if (['grouped-bar', 'normalized-stacked-bar', 'stacked-bar', 'stacked-area', 'treemap', 'radar', 'progress-chart', 'calendar-heatmap', 'heatmap'].includes(kind) && series.some(item => item.values?.some(value => value < 0))) add('CHART_DOMAIN', `${kind}은 음수 값을 허용하지 않습니다.`);
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
  if (kind === 'bullet' && finite(series[0]?.target) && (series[0].target < 0 || series[0].target > 100 || series[0].values?.[0] > 100)) add('CHART_DOMAIN', 'bullet 실적과 목표는 0~100 범위여야 합니다.');
  if (kind === 'combination' && (!series.some(item => item.mark === 'bar') || !series.some(item => item.mark === 'line'))) add('CHART_SHAPE', 'combination은 bar와 line 계열을 모두 가져야 합니다.');
  if (kind === 'radar' && series.some(item => item.values?.some(value => value < 0 || value > 100))) add('CHART_DOMAIN', 'radar 값은 공통 0~100 척도여야 합니다.');
  if (zeroBaseline.has(kind) && chart.axis && finite(chart.axis.min) && chart.axis.min !== 0) add('CHART_BASELINE', `${kind}의 값 길이·면적 축은 0에서 시작해야 합니다.`);
  if (zeroBaseline.has(kind) && chart.axis && finite(chart.axis.max)) {
    const values = series.flatMap(item => Array.isArray(item.values) ? item.values : []);
    if (values.some(value => value > chart.axis.max)) add('CHART_AXIS', '축 최댓값이 입력 값을 잘라냅니다.');
  }
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

function renderExtendedChart(n, id) {
  const W = 360, H = 180, left = 32, top = 12, pw = 312, ph = 132, cats = n.categories ?? [], series = n.series ?? [];
  const colors = i => `var(--kit-chart${(i % 6) + 1})`;
  const values = n.kind === 'box-plot' ? series.flatMap(item => Object.values(item.quartiles)) : series.flatMap(item => item.values ?? item.points?.map(point => point.y) ?? []);
  const max = Math.max(1, ...(n.kind === 'stacked-area' ? cats.map((_, i) => sum(series.map(item => item.values[i]))) : values));
  const min = Math.min(0, ...values);
  const y = value => top + ph - ((value - min) / ((max - min) || 1)) * ph;
  const x = i => left + (cats.length <= 1 ? pw / 2 : (i / (cats.length - 1)) * pw);
  let marks = '';
  switch (n.kind) {
    case 'grouped-bar': case 'normalized-stacked-bar': {
      const each = pw / cats.length, bw = Math.min(24, each * .72 / series.length);
      marks = cats.map((_, ci) => {
        const total = sum(series.map(item => item.values[ci])); let running = 0;
        return series.map((item, si) => {
          const value = n.kind === 'normalized-stacked-bar' ? item.values[ci] : item.values[ci];
          const h = n.kind === 'normalized-stacked-bar' ? value * ph / 100 : value / max * ph;
          const bx = n.kind === 'normalized-stacked-bar' ? left + ci * each + each * .18 : left + ci * each + each / 2 + (si - (series.length - 1) / 2) * bw - bw / 2;
          const by = n.kind === 'normalized-stacked-bar' ? top + ph - (running + value) * ph / 100 : y(value);
          running += n.kind === 'normalized-stacked-bar' ? value : 0;
          return `<rect data-series="${si}" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(n.kind === 'normalized-stacked-bar' ? each * .64 : bw).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" fill="${colors(si)}"><title>${escape(cats[ci])}: ${value}${n.unit ? ` ${escape(n.unit)}` : ''}</title></rect>`;
        }).join('');
      }).join(''); break;
    }
    case 'multi-line': case 'step-line': {
      marks = series.map((item, si) => {
        const pts = item.values.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`);
        const points = n.kind === 'step-line' ? pts.flatMap((point, i) => i ? [`${pts[i].split(',')[0]},${pts[i - 1].split(',')[1]}`, point] : [point]) : pts;
        const line = n.kind === 'step-line' ? `<path d="M${points.join(' L')}" fill="none" stroke="${colors(si)}" stroke-width="3"/>` : `<polyline points="${points.join(' ')}" fill="none" stroke="${colors(si)}" stroke-width="3"/>`;
        return `${line}${pts.map(point => `<circle cx="${point.split(',')[0]}" cy="${point.split(',')[1]}" r="3" fill="${colors(si)}"/>`).join('')}`;
      }).join(''); break;
    }
    case 'stacked-area': {
      let below = cats.map(() => 0);
      marks = series.map((item, si) => {
        const next = below.map((value, i) => value + item.values[i]);
        const upper = next.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`);
        const lower = below.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).reverse();
        below = next;
        return `<polygon points="${[...upper, ...lower].join(' ')}" fill="${colors(si)}" fill-opacity=".72" stroke="${colors(si)}"/>`;
      }).join(''); break;
    }
    case 'pie': {
      let angle = -Math.PI / 2;
      marks = cats.map((label, i) => {
        const next = angle + (series[0].values[i] / 100) * 2 * Math.PI, x1 = 180 + 70 * Math.cos(angle), y1 = 86 + 70 * Math.sin(angle), x2 = 180 + 70 * Math.cos(next), y2 = 86 + 70 * Math.sin(next), large = next - angle > Math.PI ? 1 : 0;
        const path = `<path data-slice="${i}" d="M180 86 L${x1.toFixed(2)} ${y1.toFixed(2)} A70 70 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${colors(i)}"><title>${escape(label)} ${series[0].values[i]}%</title></path>`;
        angle = next; return path;
      }).join(''); break;
    }
    case 'bubble': {
      const pts = series.flatMap(item => item.points), xmax = Math.max(1, ...pts.map(p => p.x)), ymax = Math.max(1, ...pts.map(p => p.y));
      marks = series.flatMap((item, si) => item.points.map(point => `<circle data-bubble-size="${point.size}" cx="${(left + point.x / xmax * pw).toFixed(1)}" cy="${(top + ph - point.y / ymax * ph).toFixed(1)}" r="${(3 + Math.sqrt(point.size) * 1.7).toFixed(1)}" fill="${colors(si)}" fill-opacity=".7"><title>${escape(item.name)}: ${point.x}, ${point.y}; size ${point.size}</title></circle>`)).join(''); break;
    }
    case 'treemap': {
      const values = series[0].values, total = sum(values); let cursor = left;
      marks = values.map((value, i) => { const width = pw * value / total, rect = `<rect x="${cursor.toFixed(1)}" y="${top}" width="${Math.max(1, width - 2).toFixed(1)}" height="${ph}" rx="2" fill="${colors(i)}"><title>${escape(cats[i])}: ${value}</title></rect><text x="${(cursor + 5).toFixed(1)}" y="${top + 18}" fill="var(--kit-text)">${escape(cats[i])}</text>`; cursor += width; return rect; }).join(''); break;
    }
    case 'radar': {
      const cx = 180, cy = 84, radius = 66, angleAt = i => -Math.PI / 2 + i * 2 * Math.PI / cats.length;
      const rings = [1 / 3, 2 / 3, 1].map(r => `<polygon points="${cats.map((_, i) => `${(cx + radius * r * Math.cos(angleAt(i))).toFixed(1)},${(cy + radius * r * Math.sin(angleAt(i))).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--kit-border)"/>`).join('');
      marks = rings + series.map((item, si) => `<polygon points="${item.values.map((value, i) => `${(cx + radius * value / 100 * Math.cos(angleAt(i))).toFixed(1)},${(cy + radius * value / 100 * Math.sin(angleAt(i))).toFixed(1)}`).join(' ')}" fill="${colors(si)}" fill-opacity=".25" stroke="${colors(si)}" stroke-width="2"/>`).join(''); break;
    }
    case 'gauge': {
      const value = series[0].values[0], angle = Math.PI + value / 100 * Math.PI;
      marks = `<path d="M72 124 A108 108 0 0 1 288 124" fill="none" stroke="var(--kit-border)" stroke-width="22"/><path d="M72 124 A108 108 0 0 1 ${(180 + 108 * Math.cos(angle)).toFixed(1)} ${(124 + 108 * Math.sin(angle)).toFixed(1)}" fill="none" stroke="${colors(0)}" stroke-width="22"/><line x1="180" y1="124" x2="${(180 + 72 * Math.cos(angle)).toFixed(1)}" y2="${(124 + 72 * Math.sin(angle)).toFixed(1)}" stroke="var(--kit-text)" stroke-width="4"/><circle cx="180" cy="124" r="7" fill="var(--kit-text)"/><text x="180" y="90" text-anchor="middle">${value}${escape(n.unit)}</text>`; break;
    }
    case 'bullet': {
      const value = series[0].values[0], target = series[0].target;
      marks = `<rect x="${left}" y="48" width="${pw}" height="46" rx="4" fill="var(--kit-border)"/><rect x="${left}" y="48" width="${(pw * .55).toFixed(1)}" height="46" fill="var(--kit-muted)" opacity=".28"/><rect x="${left}" y="48" width="${(pw * value / 100).toFixed(1)}" height="46" rx="4" fill="${colors(0)}"/><line x1="${(left + pw * target / 100).toFixed(1)}" y1="40" x2="${(left + pw * target / 100).toFixed(1)}" y2="102" stroke="var(--kit-text)" stroke-width="4"/><text x="${left}" y="120">실적 ${value}% · 목표 ${target}%</text>`; break;
    }
    case 'box-plot': {
      marks = series.map((item, i) => { const q = item.quartiles, scale = v => left + (v - min) / (max - min || 1) * pw, cy = 34 + i * 54; return `<line x1="${scale(q.min)}" y1="${cy}" x2="${scale(q.max)}" y2="${cy}" stroke="${colors(i)}" stroke-width="2"/><line x1="${scale(q.min)}" y1="${cy - 9}" x2="${scale(q.min)}" y2="${cy + 9}" stroke="${colors(i)}"/><line x1="${scale(q.max)}" y1="${cy - 9}" x2="${scale(q.max)}" y2="${cy + 9}" stroke="${colors(i)}"/><rect x="${scale(q.q1)}" y="${cy - 15}" width="${Math.max(2, scale(q.q3) - scale(q.q1))}" height="30" fill="${colors(i)}" fill-opacity=".35" stroke="${colors(i)}"/><line x1="${scale(q.median)}" y1="${cy - 15}" x2="${scale(q.median)}" y2="${cy + 15}" stroke="var(--kit-text)" stroke-width="3"/>`}).join(''); break;
    }
    case 'combination': {
      marks = series.map((item, si) => item.mark === 'line' ? `<polyline points="${item.values.map((value, i) => `${x(i).toFixed(1)},${(top + ph - value / Math.max(...item.values) * ph).toFixed(1)}`).join(' ')}" fill="none" stroke="${colors(si)}" stroke-width="3"/>` : item.values.map((value, i) => `<rect x="${(x(i) - 9).toFixed(1)}" y="${y(value).toFixed(1)}" width="18" height="${Math.max(1, top + ph - y(value)).toFixed(1)}" fill="${colors(si)}"/>`).join('')).join(''); break;
    }
    case 'calendar-heatmap': {
      const vals = series.flatMap(item => item.values), hi = Math.max(1, ...vals);
      marks = series.flatMap((item, week) => item.values.map((value, day) => `<rect x="${(left + day * 43).toFixed(1)}" y="${(top + week * 28).toFixed(1)}" width="36" height="22" rx="3" fill="${colors(0)}" fill-opacity="${(.12 + .88 * value / hi).toFixed(2)}"><title>${escape(item.name)} ${escape(cats[day])}: ${value}</title></rect>`)).join(''); break;
    }
    case 'progress-chart': {
      marks = series[0].values.map((value, i) => { const yy = top + 10 + i * 38; return `<text x="${left}" y="${yy + 13}">${escape(cats[i])}</text><rect x="${left + 80}" y="${yy}" width="${pw - 80}" height="18" rx="9" fill="var(--kit-border)"/><rect x="${left + 80}" y="${yy}" width="${((pw - 80) * value / 100).toFixed(1)}" height="18" rx="9" fill="${colors(i)}"/><text x="${W - 36}" y="${yy + 14}" text-anchor="end">${value}%</text>`; }).join(''); break;
    }
    default: return null;
  }
  const title = escape(n.title), description = escape(`${n.caption} · ${n.series.map(item => item.name).join(', ')} · ${n.unit ?? ''}`);
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false" data-renderer-kind="${n.kind}"><title id="${id}-t">${title}</title><desc id="${id}-d">${description}</desc>${marks}</svg>`;
  const rows = n.kind === 'box-plot' ? series.map((item, i) => `<tr><th scope="row">${escape(cats[i])}</th><td>${['min', 'q1', 'median', 'q3', 'max'].map(key => `${key} ${item.quartiles[key]}`).join(' · ')}</td></tr>`)
    : pointKinds.has(n.kind) ? series.flatMap(item => item.points.map(point => `<tr><th scope="row">${escape(item.name)}</th><td>x ${point.x}, y ${point.y}${n.kind === 'bubble' ? `, 크기 ${point.size}` : ''}</td></tr>`))
      : n.kind === 'candlestick' || n.kind === 'ohlc' ? series.flatMap(item => item.candles.map((candle, i) => `<tr><th scope="row">${escape(cats[i])}</th><td>시가 ${candle.open} · 고가 ${candle.high} · 저가 ${candle.low} · 종가 ${candle.close}</td></tr>`))
        : series.flatMap(item => item.values?.map((value, i) => `<tr><th scope="row">${escape(cats[i])}</th><td>${escape(item.name)}: ${value}${n.unit ? ` ${escape(n.unit)}` : ''}</td></tr>`) ?? []);
  const table = `<details class="kit-chart-data"><summary>데이터 표 보기</summary><table><thead><tr><th scope="col">${escape(n.xLabel ?? '항목')}</th><th scope="col">${escape(n.yLabel ?? '값')}</th></tr></thead><tbody>${rows.join('')}</tbody></table></details>`;
  return `<figure class="kit-chart" data-kind="${n.kind}" data-chart="2.6" data-type="${escape(n.dataType)}" data-responsive="fit"><figcaption><strong>${title}</strong><span>${escape(n.caption)} · 단위 ${escape(n.unit ?? '')}</span></figcaption><div class="kit-chart-body">${svg}</div>${table}</figure>`;
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
