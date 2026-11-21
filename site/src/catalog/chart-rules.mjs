/**
 * 2.6.0 차트 규칙의 단일 출처. 검증기(src/validate.mjs)와 SVG 렌더러(src/render/chart.mjs, chart-forms.mjs)가 같은 계산을 쓴다.
 * 눈금 라벨 자르기·간격·값 라벨 폭을 두 곳에서 따로 계산하면 "검증은 통과했는데 그림은 겹친다"가 생기기 때문이다.
 * DOM·node:*·렌더러를 가져오지 않는다(브라우저와 Node에서 같게 동작).
 */

/** 그림 좌표계. viewBox 폭 360은 .kit-chart svg의 flex-basis 280px에서 0.78배까지 줄어든다: 13px 글자는 10.1px로 보이고 SMALL_TEXT 하한(10px)을 지킨다. */
export const CHART_W = 360, CHART_W_SCROLL = 600, CHART_FONT = 13;
export const CHART_MIN_RENDER_WIDTH = 280, CHART_MIN_EFFECTIVE_FONT = 10;

export const CHART_FORM_KINDS = Object.freeze(['candlestick', 'ohlc', 'waterfall', 'funnel', 'histogram']);
export const CHART_DATA_TYPES = Object.freeze(['time', 'category', 'part-to-whole', 'process', 'distribution', 'relationship']);
export const CHART_GRIDS = Object.freeze(['horizontal', 'vertical', 'both', 'none']);
export const CHART_LABELS = Object.freeze(['none', 'values', 'extremes', 'last']);
export const CHART_LEGENDS = Object.freeze(['auto', 'bottom', 'right', 'none']);
export const CHART_DENSITIES = Object.freeze(['comfortable', 'compact']);
export const CHART_RESPONSIVE = Object.freeze(['fit', 'scroll']);

/** 형태별로 정직하게 보여줄 수 있는 데이터 유형. dataType을 적은 차트만 이 표로 판정한다. */
export const KIND_DATA_TYPES = Object.freeze({
  bar: ['time', 'category', 'part-to-whole', 'process'],
  'bars-h': ['category', 'part-to-whole', 'process'],
  'stacked-bar': ['time', 'category', 'part-to-whole'],
  line: ['time'], area: ['time'], sparkline: ['time'],
  donut: ['category', 'part-to-whole'],
  heatmap: ['time', 'category'],
  scatter: ['relationship'],
  candlestick: ['time'], ohlc: ['time'],
  waterfall: ['time', 'category', 'part-to-whole'],
  funnel: ['process'],
  histogram: ['distribution'],
});
const DATA_TYPE_NAME = {time: '시계열', category: '범주', 'part-to-whole': '구성비', process: '단계 흐름', distribution: '분포', relationship: '두 값의 관계'};
const fitKinds = type => Object.entries(KIND_DATA_TYPES).filter(([, types]) => types.includes(type)).map(([kind]) => kind);

/** 값 하나가 막대 길이·면적으로 읽히는 형태: 축이 0에서 시작하지 않으면 길이 비율이 거짓이 된다. */
export const BASELINE_KINDS = Object.freeze(['bar', 'bars-h', 'stacked-bar', 'area', 'histogram', 'waterfall']);
/** series 항목에서 데이터를 담는 필드. 나머지 필드는 그 형태에서 받지 않는다. */
export const SERIES_FIELD = Object.freeze({scatter: 'points', candlestick: 'candles', ohlc: 'candles', histogram: 'samples'});
export const seriesField = kind => SERIES_FIELD[kind] ?? 'values';

const GRID_KINDS = ['bar', 'bars-h', 'stacked-bar', 'line', 'area', 'scatter', 'histogram', 'candlestick', 'ohlc', 'waterfall'];
const LABEL_MODES = {
  bar: ['values', 'extremes'], 'bars-h': ['values', 'extremes'], 'stacked-bar': ['values', 'extremes'], line: ['values', 'extremes', 'last'], area: ['values', 'extremes', 'last'],
  sparkline: ['last'], heatmap: ['values'], histogram: ['values', 'extremes'], waterfall: ['values'], funnel: ['values'],
};
const COMPACT_KINDS = ['bar', 'bars-h', 'stacked-bar', 'line', 'area', 'scatter', 'sparkline', 'heatmap', 'histogram', 'candlestick', 'ohlc', 'waterfall', 'funnel'];
const SCROLL_KINDS = ['bar', 'stacked-bar', 'line', 'area', 'scatter', 'heatmap', 'histogram', 'candlestick', 'ohlc', 'waterfall'];

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const r9 = v => Math.round(v * 1e9) / 1e9;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- 글자 폭 추정(글꼴 없이): 한글·CJK는 1em, 숫자 .58em, 대문자 .68em, 소문자 .55em ----------
export function textWidth(s, size = CHART_FONT) {
  let w = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    w += c >= 0x1100 ? 1 : ch === ',' || ch === '.' ? .32 : ch === ' ' ? .3 : /[0-9]/.test(ch) ? .58 : /[A-Z]/.test(ch) ? .68 : /[a-z]/.test(ch) ? .55 : .6;
  }
  return w * size;
}
export function fitText(s, maxWidth) {
  if (textWidth(s) <= maxWidth) return s;
  const chars = [...s], ellipsis = textWidth('…');
  let out = '';
  for (const ch of chars) { if (textWidth(out + ch) + ellipsis > maxWidth) break; out += ch; }
  return (out || chars[0]) + '…';
}

export const group = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtTick = v => Number.isInteger(v) ? group(v) : String(Math.round(v * 10) / 10);
export const fmt = (v, unit) => `${Number.isInteger(v) ? group(v) : String(Math.round(v * 100) / 100)}${unit ? ` ${unit}` : ''}`;
const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtTick(Math.abs(v));
export const signedTick = signed;

export function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

/**
 * 눈금 라벨 계획. slot은 라벨 하나에 주어진 가로 폭(px). 글이 slot에 안 들어가면 먼저 눈금을 건너뛰고(stride),
 * 그래도 길면 줄임표로 자른다. 자른 뒤 서로 다른 이름이 같은 글자가 되면 ambiguous다(전체 이름은 데이터 표에 남는다).
 * truncate:false는 숫자 눈금용이다: 숫자를 자르면 값이 바뀌므로 건너뛰기만 한다.
 */
export function tickPlan(labels, slot, {truncate = true} = {}) {
  const budget = s => Math.max(0, slot * s - 6);
  const build = stride => {
    const shown = labels.map((label, i) => i % stride !== 0 ? null : truncate ? fitText(label, budget(stride)) : label);
    const visible = labels.filter((_, i) => i % stride === 0);
    return {stride, shown, ambiguous: truncate && new Set(shown.filter(x => x !== null)).size < new Set(visible).size, truncated: shown.some((t, i) => t !== null && t !== labels[i])};
  };
  if (!truncate) {
    const need = Math.max(0, ...labels.map(label => textWidth(label)));
    let stride = 1;
    while (stride < labels.length && budget(stride) < need) stride++;
    return build(stride);
  }
  // 모든 막대에 이름을 달 수 있으면(줄임표 허용) 그것이 먼저이고, 잘린 이름이 서로 같아지면 건너뛰기(최대 3칸)를 시도한다.
  const minimum = textWidth('가…');
  let last = build(1);
  for (let stride = 1; stride <= Math.min(3, labels.length); stride++) {
    last = build(stride);
    if (budget(stride) >= minimum && !last.ambiguous) return last;
  }
  return build(Math.min(3, labels.length));
}

const TIME_LABEL = [
  /^(\d{4}\s?년\s?)?\d{1,2}\s?월$/, /^(\d{4}\s?년\s?)?[1-4]\s?분기$/, /^\d{4}\s?년$/, /^\d{4}\s?Q[1-4]$/i, /^Q[1-4]$/i, /^\d{1,2}\s?주(차)?$/, /^W\d{1,2}$/i,
  /^\d{4}[-./]\d{1,2}([-./]\d{1,2})?$/, /^\d{1,2}[/.]\d{1,2}$/, /^\d{1,2}\s?일$/, /^[월화수목금토일](요일)?$/, /^\d{1,2}(:\d{2}|\s?시)$/,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*$/i, /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*$/i,
];
export const isTimeLabel = label => typeof label === 'string' && TIME_LABEL.some(pattern => pattern.test(label.trim()));

// ---------- 데이터 모델 ----------
const seriesList = n => (Array.isArray(n.series) ? n.series : []).filter(isObj);
const arr = v => (Array.isArray(v) ? v : []);

/** 워터폴: roles가 total인 막대는 누적 합계. 첫 칸의 total은 시작값이고, 그 뒤 total은 앞까지의 누적과 같아야 한다. */
export function waterfallSteps(values, roles) {
  let run = 0;
  return arr(values).map((v, i) => {
    const total = arr(roles)[i] === 'total';
    if (total) {
      const start = 0, expected = i === 0 ? v : run, mismatch = i > 0 && Math.abs(v - run) > 1e-6 * Math.max(1, Math.abs(run));
      run = v;
      return {i, total, start, end: v, delta: v, expected, mismatch};
    }
    const start = run; run = r9(run + v);
    return {i, total, start, end: run, delta: v, expected: run, mismatch: false};
  });
}

/** 히스토그램 구간. 모서리가 1·2·2.5·5의 거듭제곱 배수가 되도록 구간 수가 목표(bins)에 가장 가까운 폭을 고른다. 마지막 구간은 오른쪽을 포함한다. */
export function histogramBins(samples, target) {
  const v = arr(samples).filter(isNum), n = v.length;
  if (n < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v);
  if (!(hi > lo)) return null;
  const k = Number.isInteger(target) ? target : clamp(Math.ceil(Math.log2(n)) + 1, 4, 8);
  let best = null;
  for (let p = -4; p <= 7; p++) for (const m of [1, 2, 2.5, 5]) {
    const w = r9(m * 10 ** p), start = r9(Math.floor(lo / w + 1e-9) * w), count = Math.max(1, Math.ceil((hi - start) / w - 1e-9));
    if (count < 3 || count > 12) continue;
    const score = Math.abs(count - k) * 10 - Math.log10(w);
    if (!best || score < best.score) best = {w, start, count, score};
  }
  if (!best) { const w = (hi - lo) / k; best = {w, start: lo, count: k}; }
  const edges = Array.from({length: best.count + 1}, (_, i) => r9(best.start + best.w * i));
  const counts = new Array(best.count).fill(0);
  for (const x of v) counts[Math.min(best.count - 1, Math.max(0, Math.floor((x - best.start) / best.w + 1e-9)))]++;
  return {edges, counts, width: best.w, total: n};
}

/** 축 범위를 정하는 화면 값. stacked-bar는 막대 합계, waterfall은 누적선, candlestick·ohlc는 저가·고가, histogram은 빈도. */
export function levelsOf(n) {
  const S = seriesList(n);
  switch (n.kind) {
    case 'scatter': return S.flatMap(s => arr(s.points).flatMap(p => (isObj(p) ? [p.x, p.y] : [])));
    case 'stacked-bar': return arr(n.categories).map((_, i) => S.reduce((sum, s) => sum + (isNum(arr(s.values)[i]) ? s.values[i] : 0), 0));
    case 'candlestick': case 'ohlc': return arr(S[0]?.candles).flatMap(c => (isObj(c) ? [c.low, c.high] : []));
    case 'waterfall': return [0, ...waterfallSteps(S[0]?.values, S[0]?.roles).flatMap(s => [s.start, s.end])];
    case 'histogram': return histogramBins(S[0]?.samples, n.bins)?.counts ?? [];
    default: return S.flatMap(s => arr(s.values));
  }
}

const catCount = n => n.kind === 'histogram' ? (histogramBins(seriesList(n)[0]?.samples, n.bins)?.counts.length ?? 0) : arr(n.categories).length;

/** 값 축 범위와 눈금. 막대·면적·히스토그램·워터폴은 0을 포함하고, 캔들·OHLC는 데이터 범위에 맞춘다. */
export function valueScale(n) {
  const values = levelsOf(n).filter(isNum), compact = n.density === 'compact', intervals = compact ? 2 : 4;
  const free = n.kind === 'candlestick' || n.kind === 'ohlc';
  const dmin = values.length ? Math.min(...values) : 0, dmax = values.length ? Math.max(...values) : 1;
  let lo = free ? dmin : Math.min(0, dmin), hi = free ? dmax : Math.max(0, dmax);
  const axis = isObj(n.axis) ? n.axis : {};
  if (isNum(axis.min)) lo = axis.min;
  if (isNum(axis.max)) hi = axis.max;
  if (!(hi > lo)) hi = lo + 1;
  const step = niceStep((hi - lo) / intervals);
  const tlo = isNum(axis.min) ? axis.min : r9(Math.floor(lo / step + 1e-9) * step), thi = isNum(axis.max) ? axis.max : r9(Math.ceil(hi / step - 1e-9) * step);
  const ticks = [];
  for (let v = tlo; v <= thi + step * 1e-6 && ticks.length < 9; v = r9(v + step)) ticks.push(v);
  if (ticks.at(-1) < thi - step * .2) ticks.push(thi);
  return {lo: tlo, hi: thi, span: (thi - tlo) || 1, ticks, step};
}

/** 그림 상자와 여백. 여백은 눈금 글자 폭에서 나온다(고정 48px이 아니다). */
export function geometry(n) {
  const k = n.kind, W = n.responsive === 'scroll' ? CHART_W_SCROLL : CHART_W, compact = n.density === 'compact';
  const showX = n.axis?.showX !== 'no', showY = n.axis?.showY !== 'no', labelled = n.labels && n.labels !== 'none';
  const g = {W, H: compact ? 176 : 240, left: 12, right: 12, top: labelled ? 22 : 16, bottom: showX ? 38 : 14, k};
  const names = arr(n.categories).filter(c => typeof c === 'string'), S = seriesList(n);
  const tickW = () => Math.max(0, ...valueScale(n).ticks.map(t => textWidth(fmtTick(t))));
  if (k === 'sparkline') Object.assign(g, {H: compact ? 72 : 104, left: 8, right: 12, top: 18, bottom: 10});
  else if (k === 'funnel') {
    const rows = Math.max(1, names.length), valueW = Math.max(0, ...arr(S[0]?.values).map(v => textWidth(`${fmtTick(v)} (100%)`)));
    Object.assign(g, {left: clamp(Math.max(0, ...names.map(c => textWidth(c))) + 16, 56, 112), right: clamp(valueW + 8, 70, 104), top: 8, bottom: 8});
    g.H = g.top + g.bottom + rows * (compact ? 28 : 36);
  } else if (k === 'bars-h') {
    g.left = clamp(Math.max(0, ...names.map(c => textWidth(c))) + 16, 56, 118);
    g.right = labelled ? clamp(Math.max(0, ...S.flatMap(s => arr(s.values)).map(v => textWidth(fmtTick(v)))) + 10, 28, 64) : 14;
    g.top = 10; g.bottom = showY ? 34 : 12;
  } else if (k === 'heatmap') {
    g.left = clamp(Math.max(0, ...S.map(s => textWidth(String(s.name ?? '')))) + 12, 36, 84); g.top = 10; g.bottom = showX ? 38 : 12;
  } else if (k === 'scatter') {
    g.left = showY ? clamp(tickW() + 16, 40, 80) : 12; g.right = 18;
  } else g.left = showY ? clamp(tickW() + 16, 40, 80) : 12;
  g.pw = W - g.left - g.right; g.ph = g.H - g.top - g.bottom;
  g.cats = catCount(n); g.slot = g.cats ? g.pw / g.cats : g.pw;
  return g;
}
export const barWidth = (g, nSeries) => Math.min(30, (g.slot * .72) / Math.max(1, nSeries));

// ---------- 값 라벨 ----------
/** 값 라벨 텍스트와 이웃 라벨 사이 가로 간격. 렌더러는 같은 계산을 쓰고, 검증기는 폭이 간격을 넘으면 CHART_LABEL_OVERLAP으로 거부한다. */
export function valueLabelLayout(n, g = geometry(n)) {
  const S = seriesList(n), k = n.kind, all = S.flatMap(s => arr(s.values)).filter(isNum);
  switch (k) {
    case 'bar': return {texts: all.map(fmtTick), spacing: S.length > 1 ? barWidth(g, S.length) : g.slot};
    case 'stacked-bar': return {texts: levelsOf(n).map(fmtTick), spacing: g.slot};
    case 'line': case 'area': return {texts: all.map(fmtTick), spacing: g.slot, singleSeriesOnly: true};
    case 'bars-h': { const row = g.ph / Math.max(1, g.cats); return {texts: all.map(fmtTick), vertical: true, spacing: S.length > 1 ? (row * .68) / S.length : row}; }
    case 'histogram': return {texts: levelsOf(n).map(fmtTick), spacing: g.slot};
    case 'waterfall': return {texts: waterfallSteps(S[0]?.values, S[0]?.roles).map(s => (s.total ? fmtTick(s.end) : signed(s.delta))), spacing: g.slot};
    case 'heatmap': return {texts: all.map(fmtTick), spacing: g.pw / Math.max(1, g.cats), cell: true, rowHeight: g.ph / Math.max(1, S.length)};
    default: return null;
  }
}

// ---------- 진단 ----------
/** 2.6.0 차트의 형태별 데이터 모델·적합성·축 왜곡·라벨 진단. [{field, code, message}]: field는 차트 경로 뒤에 붙는다. */
export function chartDiagnostics(n) {
  const out = [], add = (field, code, message) => out.push({field, code, message});
  const kind = n.kind, S = Array.isArray(n.series) ? n.series : [], cats = arr(n.categories).filter(c => typeof c === 'string');
  const known = Object.hasOwn(KIND_DATA_TYPES, kind);
  if (!known) return out;

  // 1) 데이터 유형 적합성
  if (n.dataType) {
    if (!KIND_DATA_TYPES[kind].includes(n.dataType)) add('.dataType', 'CHART_DATA_FIT', `${kind} 차트는 ${DATA_TYPE_NAME[n.dataType] ?? n.dataType} 데이터에 맞지 않습니다. 이 데이터에 맞는 형태: ${fitKinds(n.dataType).join(', ')}`);
  } else if ((kind === 'donut' || kind === 'funnel') && cats.length >= 2 && cats.every(isTimeLabel)) {
    add('.kind', 'CHART_DATA_FIT', `범주가 모두 날짜·기간이라 시계열입니다. ${kind}은 시간 순서를 보여주지 못합니다. line, area, bar를 쓰세요.`);
  }

  // 2) 이 형태가 받지 않는 데이터 필드
  const own = seriesField(kind);
  S.forEach((s, i) => {
    if (!isObj(s)) return;
    for (const field of ['points', 'candles', 'samples']) if (field !== own && Object.hasOwn(s, field)) add(`.series[${i}].${field}`, 'CHART_SHAPE', `${kind} 차트는 ${field}를 받지 않습니다(${own}를 쓰세요).`);
    if (kind !== 'waterfall' && Object.hasOwn(s, 'roles')) add(`.series[${i}].roles`, 'CHART_SHAPE', 'roles는 waterfall에서만 씁니다.');
    if (own !== 'values' && Object.hasOwn(s, 'values')) add(`.series[${i}].values`, 'CHART_SHAPE', `${kind} 차트는 values 대신 ${own}를 사용합니다.`);
  });
  if (kind !== 'heatmap' && S.length > 3) add('.series', 'CHART_SHAPE', '계열은 3개 이하입니다(heatmap의 행만 8개까지).');
  const first = isObj(S[0]) ? S[0] : {};
  const single = (what) => { if (S.length !== 1) add('.series', 'CHART_SHAPE', `${kind}은 ${what}`); };

  // 3) 형태별 데이터 모델
  if (kind === 'candlestick' || kind === 'ohlc') {
    single('계열 하나만 허용합니다(시세 한 종목).');
    const candles = arr(first.candles);
    if (cats.length < 2) add('.categories', 'CHART_SHAPE', `${kind}은 날짜 범주 2개 이상이 필요합니다.`);
    if (!Array.isArray(first.candles) || candles.length !== cats.length) add('.series[0].candles', 'CHART_SHAPE', 'candles의 개수는 categories와 같아야 합니다.');
    candles.forEach((c, i) => {
      const path = `.series[0].candles[${i}]`;
      if (!isObj(c) || !['open', 'high', 'low', 'close'].every(key => isNum(c[key]))) { add(path, 'CHART_OHLC', 'candle은 open·high·low·close 네 값이 모두 유한한 숫자여야 합니다.'); return; }
      const label = cats[i] ?? `${i + 1}번째`;
      if (c.high < Math.max(c.open, c.close)) add(path + '.high', 'CHART_OHLC', `${label}: 고가(high ${c.high})는 시가·종가의 최댓값(${Math.max(c.open, c.close)}) 이상이어야 합니다.`);
      if (c.low > Math.min(c.open, c.close)) add(path + '.low', 'CHART_OHLC', `${label}: 저가(low ${c.low})는 시가·종가의 최솟값(${Math.min(c.open, c.close)}) 이하여야 합니다.`);
    });
  } else if (kind === 'histogram') {
    single('계열 하나만 허용합니다.');
    const samples = arr(first.samples);
    if (Array.isArray(n.categories)) add('.categories', 'CHART_SHAPE', 'histogram은 categories를 받지 않습니다(구간은 samples에서 계산합니다).');
    if (!Array.isArray(first.samples) || samples.length < 5) add('.series[0].samples', 'CHART_SHAPE', 'histogram은 관측값 samples가 5개 이상 필요합니다.');
    else if (samples.every(isNum) && new Set(samples).size < 2) add('.series[0].samples', 'CHART_DATA_FIT', '관측값이 모두 같은 값 하나라 분포가 없습니다. 히스토그램은 서로 다른 값이 2개 이상 필요합니다. 값 하나는 지표(metric)로 보여주세요.');
    if (n.bins !== undefined && !(Number.isInteger(n.bins) && n.bins >= 3 && n.bins <= 12)) add('.bins', 'CHART_SHAPE', 'bins는 3~12 사이 정수입니다.');
  } else if (kind === 'waterfall') {
    single('계열 하나만 허용합니다.');
    const values = arr(first.values), roles = first.roles;
    if (roles !== undefined) {
      if (!Array.isArray(roles) || roles.length !== values.length || roles.some(role => !['delta', 'total'].includes(role))) add('.series[0].roles', 'CHART_SHAPE', 'roles는 values와 같은 길이의 delta·total 목록이어야 합니다.');
      else if (values.every(isNum)) for (const step of waterfallSteps(values, roles)) if (step.mismatch) add(`.series[0].values[${step.i}]`, 'CHART_WATERFALL', `${cats[step.i] ?? `${step.i + 1}번째`}: 합계 막대 값(${step.end})이 앞까지의 누적(${step.expected})과 다릅니다.`);
    }
    if (!roles || !Array.isArray(roles) || !roles.includes('total')) add('.series[0].roles', 'CHART_WATERFALL', 'waterfall은 시작 또는 끝 합계(role: total)가 하나 이상 있어야 증감이 어디서 어디로 가는지 읽힙니다.');
  } else if (kind === 'funnel') {
    single('계열 하나만 허용합니다(단계별 건수).');
    const values = arr(first.values).filter(isNum);
    if (values.some(v => v < 0)) add('.series[0].values', 'CHART_DATA_FIT', '음수 값이 있는 데이터는 퍼널로 보여줄 수 없습니다(단계 건수는 0 이상). 증감이면 waterfall, 비교면 bar를 쓰세요.');
    else if (values.length && values[0] <= 0) add('.series[0].values', 'CHART_DATA_FIT', '퍼널의 첫 단계 값은 0보다 커야 비율을 계산합니다.');
    else values.forEach((v, i) => { if (i > 0 && v > values[i - 1]) add(`.series[0].values[${i}]`, 'CHART_DATA_FIT', `${cats[i] ?? `${i + 1}번째`} 단계(${v})가 앞 단계(${values[i - 1]})보다 큽니다. 퍼널은 단계마다 줄어드는 데이터입니다. 단계가 아닌 비교는 bar를 쓰세요.`); });
  }

  // 4) 축 왜곡: 길이·면적이 값을 뜻하는 형태는 0을 포함해야 한다
  if (BASELINE_KINDS.includes(kind) && isObj(n.axis) && (isNum(n.axis.min) && n.axis.min > 0 || isNum(n.axis.max) && n.axis.max < 0)) {
    add('.axis', 'CHART_BASELINE', `${kind}은 막대 길이·면적이 값을 뜻하므로 축이 0을 포함해야 합니다(axis.min ${n.axis.min ?? '없음'}, max ${n.axis.max ?? '없음'}). 변화량을 크게 보이려면 line으로 바꾸세요.`);
  }

  // 5) 이 형태가 지원하지 않는 표현 옵션: 보이지 않는 옵션으로 프리셋이 서로 달라 보이게 하지 않는다
  const unsupported = (field, ok, hint) => { if (n[field] !== undefined && !ok) add('.' + field, 'CHART_OPTION', `${kind} 차트는 ${field}=${n[field]}를 지원하지 않습니다. ${hint}`); };
  unsupported('grid', n.grid === 'none' || GRID_KINDS.includes(kind), '격자를 지우세요(축 없는 형태).');
  unsupported('labels', n.labels === 'none' || LABEL_MODES[kind]?.includes(n.labels), `값 라벨 모드: ${(LABEL_MODES[kind] ?? ['none']).join(', ')}`);
  unsupported('density', n.density === 'comfortable' || COMPACT_KINDS.includes(kind), '밀도 옵션을 지우세요.');
  unsupported('responsive', n.responsive === 'fit' || SCROLL_KINDS.includes(kind), '가로 스크롤은 범주 축이 있는 형태에서만 씁니다.');
  if (n.legend === 'none' && (S.length > 1 || kind === 'donut' || kind === 'heatmap' || kind === 'candlestick' || kind === 'ohlc' || kind === 'waterfall')) add('.legend', 'CHART_OPTION', '이 차트는 범례가 있어야 색·모양을 읽을 수 있습니다. legend none은 계열 하나짜리 단순 차트에서만 씁니다.');
  if (out.length) return out;

  // 6) 값이 읽히는가: 축 라벨도 값 라벨도 없으면 숫자를 읽을 방법이 데이터 표뿐이다
  if (n.axis?.showY === 'no' && (!n.labels || n.labels === 'none') && !['donut', 'sparkline', 'heatmap', 'funnel', 'histogram', 'scatter'].includes(kind)) add('.axis.showY', 'CHART_LABEL_MISSING', '값 축 라벨을 숨기면서 값 라벨도 없어 크기를 읽을 수 없습니다. labels를 values로 하거나 showY를 yes로 두세요.');
  if (out.length) return out;

  // 7) 라벨 겹침: 렌더러와 같은 계산(geometry·tickPlan·valueLabelLayout)
  let g;
  try { g = geometry(n); } catch { return out; }
  if (n.axis?.showX !== 'no' && ['bar', 'stacked-bar', 'line', 'area', 'waterfall', 'candlestick', 'ohlc', 'heatmap'].includes(kind) && cats.length) {
    const plan = tickPlan(cats, kind === 'heatmap' ? g.pw / cats.length : g.slot);
    if (plan.ambiguous) add('.categories', 'CHART_LABEL_OVERLAP', `범주 이름 앞부분이 같아 눈금 라벨이 잘려 서로 구분되지 않습니다(예: ${plan.shown.find(Boolean)}). 앞 글자가 다른 짧은 이름을 쓰거나 bars-h·가로 스크롤(responsive: scroll)을 쓰세요.`);
  }
  if (n.labels && n.labels !== 'none') {
    const layout = valueLabelLayout(n, g);
    if (layout) {
      if (layout.singleSeriesOnly && S.length > 1 && n.labels === 'values') add('.labels', 'CHART_LABEL_OVERLAP', '계열이 둘 이상인 선·면적 차트의 값 라벨은 서로 겹칩니다. labels를 extremes나 last로 하세요.');
      const widest = Math.max(0, ...layout.texts.map(text => textWidth(text))) + 4;
      if (n.labels === 'values' && !(layout.singleSeriesOnly && S.length > 1)) {
        if (layout.vertical ? layout.spacing < CHART_FONT : widest > layout.spacing) add('.labels', 'CHART_LABEL_OVERLAP', `값 라벨(가장 긴 것 ${Math.round(widest)}px)이 칸 간격(${Math.round(layout.spacing)}px)보다 넓어 겹칩니다. 범주를 줄이거나 labels를 extremes로 하거나 responsive: scroll을 쓰세요.`);
        else if (layout.cell && layout.rowHeight < CHART_FONT + 2) add('.labels', 'CHART_LABEL_OVERLAP', `히트맵 행 높이(${Math.round(layout.rowHeight)}px)가 값 라벨보다 낮습니다. 행을 줄이거나 density를 comfortable로 하세요.`);
      }
    }
  }
  return out;
}

/**
 * 화면에 실제로 적용되는 표현 옵션(기본값 포함). 프리셋의 구별성 서명과 렌더러의 data-* 속성이 같은 값을 쓰는지 테스트가 대조한다.
 * 축이 없는 형태(도넛·스파크라인·히트맵·퍼널)의 격자는 항상 none이다.
 */
export function chartOptions(n) {
  const k = n.kind, S = Array.isArray(n.series) ? n.series : [], showX = n.axis?.showX !== 'no', showY = n.axis?.showY !== 'no';
  const gridless = ['donut', 'sparkline', 'heatmap', 'funnel'].includes(k), legendMode = n.legend ?? 'auto';
  const listed = k === 'donut' || k === 'heatmap' || CHART_FORM_KINDS.includes(k) && k !== 'funnel' && k !== 'histogram';
  const legend = legendMode === 'none' ? 'none' : legendMode === 'right' ? 'right' : legendMode === 'bottom' ? 'bottom' : listed || (k !== 'sparkline' && S.length > 1) ? 'bottom' : 'none';
  return {
    grid: gridless ? 'none' : n.grid ?? (k === 'scatter' ? 'both' : k === 'bars-h' ? 'vertical' : 'horizontal'),
    labels: n.labels ?? 'none', legend, density: n.density ?? 'comfortable',
    responsive: n.responsive === 'scroll' && SCROLL_KINDS.includes(k) ? 'scroll' : 'fit',
    axes: k === 'donut' || k === 'sparkline' || k === 'funnel' ? 'omitted' : `${showX ? 'x' : ''}${showY ? 'y' : ''}` || 'none',
    series: S.length, dataType: n.dataType ?? 'unspecified',
  };
}
