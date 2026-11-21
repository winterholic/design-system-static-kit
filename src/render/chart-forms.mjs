import {e, num, fmt, fmtTick, seg, txt, xText, gridOf, categoryAxis, valueAxisY, pickLabels, legendItems, swatch, hollow} from './chart-kit.mjs';
import {valueScale, waterfallSteps, histogramBins, tickPlan, fitText, signedTick} from '../catalog/chart-rules.mjs';

/** 2.6.0 새 차트 형태: candlestick·ohlc·waterfall·funnel·histogram. 데이터 모델 검증은 chartDiagnostics(src/catalog/chart-rules.mjs)가 한다. */
const pct = (v, base) => Math.round((v / base) * 100);
const dir = c => (c.close >= c.open ? 'up' : 'down');
const label = (x, y, text, anchor = 'middle', cls = 'ch-v') => txt(x, y, text, {anchor, cls});

function candles(n, g, out, ohlc) {
  const sc = valueScale(n), cats = n.categories, list = n.series[0].candles, grid = gridOf(n);
  const X = i => g.left + g.slot * (i + .5);
  const Y = valueAxisY(out, n, g, sc, {grid, show: n.axis?.showY !== 'no', zero: false});
  categoryAxis(out, n, g, {labels: cats, at: X, grid, show: n.axis?.showX !== 'no'});
  const bw = Math.min(18, g.slot * .56);
  list.forEach((c, i) => {
    const up = dir(c) === 'up', color = up ? 1 : 3, x = X(i), top = Y(Math.max(c.open, c.close)), bottom = Y(Math.min(c.open, c.close));
    if (ohlc) {
      out.push(`<path d="M${num(x)} ${num(Y(c.high))}V${num(Y(c.low))}M${num(x - bw / 2)} ${num(Y(c.open))}H${num(x)}M${num(x)} ${num(Y(c.close))}H${num(x + bw / 2)}" class="ch-ohlc" data-dir="${dir(c)}" style="stroke:var(--kit-chart${color})"><title>${e(cats[i])}: 시가 ${fmtTick(c.open)} 고가 ${fmtTick(c.high)} 저가 ${fmtTick(c.low)} 종가 ${fmtTick(c.close)}</title></path>`);
    } else {
      out.push(`<path d="M${num(x)} ${num(Y(c.high))}V${num(top)}M${num(x)} ${num(bottom)}V${num(Y(c.low))}" class="ch-wick" style="stroke:var(--kit-chart${color})"/>`);
      out.push(`<rect x="${num(x - bw / 2)}" y="${num(top)}" width="${num(bw)}" height="${num(Math.max(1.5, bottom - top))}" rx="1.5" class="ch-body" data-dir="${dir(c)}" style="${up ? `fill:var(--kit-surface);stroke:var(--kit-chart1)` : `fill:var(--kit-chart3);stroke:var(--kit-chart3)`}"><title>${e(cats[i])}: 시가 ${fmtTick(c.open)} 고가 ${fmtTick(c.high)} 저가 ${fmtTick(c.low)} 종가 ${fmtTick(c.close)}</title></rect>`);
    }
  });
}

function waterfall(n, g, out) {
  const s = n.series[0], steps = waterfallSteps(s.values, s.roles), cats = n.categories, sc = valueScale(n), grid = gridOf(n);
  const X = i => g.left + g.slot * (i + .5), bw = Math.min(30, g.slot * .72);
  const Y = valueAxisY(out, n, g, sc, {grid, show: n.axis?.showY !== 'no'});
  categoryAxis(out, n, g, {labels: cats, at: X, grid, show: n.axis?.showX !== 'no'});
  const shown = n.labels === 'values';
  steps.forEach((step, i) => {
    const lo = Math.min(step.start, step.end), hi = Math.max(step.start, step.end), x = X(i);
    const kind = step.total ? 'total' : step.delta >= 0 ? 'up' : 'down', color = kind === 'total' ? 'var(--kit-muted)' : kind === 'up' ? 'var(--kit-chart1)' : 'var(--kit-chart3)';
    if (i < steps.length - 1) out.push(seg(x + bw / 2, Y(step.end), X(i + 1) - bw / 2, Y(step.end), 'ch-conn'));
    out.push(`<rect x="${num(x - bw / 2)}" y="${num(Y(hi))}" width="${num(bw)}" height="${num(Math.max(1.5, Y(lo) - Y(hi)))}" rx="2" class="ch-bar" data-step="${kind}" style="fill:${color}"><title>${e(cats[i])}: ${step.total ? `합계 ${fmt(step.end, n.unit)}` : `${signedTick(step.delta)}${n.unit ? ` ${e(n.unit)}` : ''} → 누적 ${fmt(step.end, n.unit)}`}</title></rect>`);
    if (shown) out.push(step.total || step.delta >= 0 ? label(x, Y(hi) - 5, step.total ? fmtTick(step.end) : signedTick(step.delta)) : label(x, Y(lo) + 14, signedTick(step.delta)));
  });
}

function funnel(n, g, out) {
  const values = n.series[0].values, cats = n.categories, rows = values.length, rowH = (g.H - g.top - g.bottom) / rows, base = values[0], full = g.pw;
  const edge = i => (values[i] / base) * full;
  values.forEach((v, i) => {
    const w = Math.max(2, edge(i)), x = g.left + (full - w) / 2, y = g.top + rowH * i + rowH * .17, h = rowH * .66, cy = g.top + rowH * i + rowH / 2 + 4.5;
    if (i < rows - 1) {
      const next = Math.max(2, edge(i + 1)), y2 = g.top + rowH * (i + 1) + rowH * .17;
      out.push(`<path d="M${num(x)} ${num(y + h)}L${num(x + w)} ${num(y + h)}L${num(g.left + (full + next) / 2)} ${num(y2)}L${num(g.left + (full - next) / 2)} ${num(y2)}Z" class="ch-flow" style="fill:var(--kit-chart1)"/>`);
    }
    out.push(`<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="2" class="ch-bar" style="fill:var(--kit-chart1)"><title>${e(cats[i])}: ${fmt(v, n.unit)} (첫 단계의 ${pct(v, base)}%)</title></rect>`);
    out.push(txt(g.left - 8, cy, fitText(cats[i], g.left - 10), {anchor: 'end'}));
    if (n.labels === 'values') out.push(txt(g.W - g.right + 8, cy, `${fmtTick(v)} (${pct(v, base)}%)`, {anchor: 'start', cls: 'ch-v'}));
  });
}

function histogram(n, g, out) {
  const bins = histogramBins(n.series[0].samples, n.bins), sc = valueScale(n), grid = gridOf(n), bw = g.pw / bins.counts.length;
  const Y = valueAxisY(out, n, g, sc, {grid, show: n.axis?.showY !== 'no'});
  if (grid === 'vertical' || grid === 'both') bins.edges.forEach((_, i) => out.push(seg(g.left + bw * i, g.top, g.left + bw * i, g.top + g.ph)));
  const picked = pickLabels(bins.counts, n.labels ?? 'none');
  bins.counts.forEach((c, i) => {
    const x = g.left + bw * i, y = Y(c);
    out.push(`<rect x="${num(x + .5)}" y="${num(y)}" width="${num(Math.max(1, bw - 1))}" height="${num(Math.max(c ? 1.5 : 0, Y(0) - y))}" class="ch-bar" style="fill:var(--kit-chart1)"><title>${fmtTick(bins.edges[i])} 이상 ${fmtTick(bins.edges[i + 1])}${i === bins.counts.length - 1 ? ' 이하' : ' 미만'}: ${fmt(c, '건')}</title></rect>`);
    if (picked.has(i)) out.push(label(x + bw / 2, y - 5, fmtTick(c)));
  });
  if (n.axis?.showX !== 'no') {
    const plan = tickPlan(bins.edges.map(fmtTick), bw, {truncate: false});
    bins.edges.forEach((edge, i) => { if (plan.shown[i] !== null) out.push(xText(g, g.left + bw * i, plan.shown[i], g.H - 10)); });
  }
}

export const FORMS = {
  candlestick: {plot: (n, g, out) => candles(n, g, out, false)},
  ohlc: {plot: (n, g, out) => candles(n, g, out, true)},
  waterfall: {plot: waterfall},
  funnel: {plot: funnel},
  histogram: {plot: histogram},
};

export function formLegend(n) {
  if (n.legend === 'none') return '';
  if (n.kind === 'candlestick') return legendItems([[hollow(1), '상승 (종가 ≥ 시가, 속 빈 몸통)'], [swatch(3), '하락 (종가 < 시가, 채운 몸통)']]);
  if (n.kind === 'ohlc') return legendItems([[swatch(1), '상승 (오른쪽 눈금이 위)'], [swatch(3), '하락 (오른쪽 눈금이 아래)']]);
  if (n.kind === 'waterfall') return legendItems([[swatch(1), '증가'], [swatch(3), '감소'], ['background:var(--kit-muted)', '합계']]);
  return n.legend === 'bottom' || n.legend === 'right' ? legendItems([[swatch(1), n.series[0].name]]) : '';
}

export function formSummary(n) {
  const s = n.series[0], cats = n.categories ?? [];
  if (n.kind === 'candlestick' || n.kind === 'ohlc') return `${n.caption} ${s.name}: ` + s.candles.map((c, i) => `${cats[i]} 시가 ${c.open} 고가 ${c.high} 저가 ${c.low} 종가 ${c.close}`).join(', ');
  if (n.kind === 'waterfall') return `${n.caption} ${s.name}: ` + waterfallSteps(s.values, s.roles).map(st => `${cats[st.i]} ${st.total ? `합계 ${fmt(st.end, n.unit)}` : `${signedTick(st.delta)}`}`).join(', ');
  if (n.kind === 'funnel') return `${n.caption} ${s.name}: ` + s.values.map((v, i) => `${cats[i]} ${fmt(v, n.unit)}(${pct(v, s.values[0])}%)`).join(', ');
  const bins = histogramBins(s.samples, n.bins);
  return `${n.caption} 관측 ${s.samples.length}건: ` + bins.counts.map((c, i) => `${fmtTick(bins.edges[i])}~${fmtTick(bins.edges[i + 1])} ${c}건`).join(', ');
}

export function formTable(n) {
  const s = n.series[0], cats = n.categories ?? [], head = cols => `<thead><tr>${cols.map(c => `<th scope="col">${e(c)}</th>`).join('')}</tr></thead>`;
  const wrap = (cols, rows) => `<table><caption>${e(n.title)} 데이터</caption>${head(cols)}<tbody>${rows.join('')}</tbody></table>`;
  const row = (name, cells) => `<tr><th scope="row">${e(name)}</th>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  if (n.kind === 'candlestick' || n.kind === 'ohlc') return wrap(['날짜', '시가', '고가', '저가', '종가', '방향'], s.candles.map((c, i) => row(cats[i], [c.open, c.high, c.low, c.close].map(v => fmtTick(v)).concat(c.close >= c.open ? '상승' : '하락'))));
  if (n.kind === 'waterfall') return wrap(['구분', '증감·합계', '누적'], waterfallSteps(s.values, s.roles).map(st => row(cats[st.i], [st.total ? `합계 ${fmt(st.end, n.unit)}` : `${signedTick(st.delta)}${n.unit ? ` ${e(n.unit)}` : ''}`, fmt(st.end, n.unit)])));
  if (n.kind === 'funnel') return wrap(['단계', s.name, '첫 단계 대비', '앞 단계 대비'], s.values.map((v, i) => row(cats[i], [fmt(v, n.unit), `${pct(v, s.values[0])}%`, i ? `${pct(v, s.values[i - 1])}%` : '-'])));
  const bins = histogramBins(s.samples, n.bins);
  return wrap(['구간', '관측 수'], bins.counts.map((c, i) => row(`${fmtTick(bins.edges[i])} 이상 ${fmtTick(bins.edges[i + 1])}${i === bins.counts.length - 1 ? ' 이하' : ' 미만'}`, [fmt(c, '건')])));
}
