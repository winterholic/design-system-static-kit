import {e, num} from './util.mjs';
import {renderLegacyChart} from './chart-legacy.mjs';

/** SVG charts. Series use both color and shape/dash; every figure also ships an HTML data table. */
const W = 360, H = 240, M = {l: 48, r: 14, t: 18, b: 38};
const DASH = ['', '6 4', '2 3'];
const short = (s, n) => [...s].length > n ? [...s].slice(0, n).join('') + '…' : s;
export function niceMax(v) { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
const group = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmt = (v, unit) => `${Number.isInteger(v) ? group(v) : String(Math.round(v * 100) / 100)}${unit ? ` ${unit}` : ''}`;
const fmtTick = v => Number.isInteger(v) ? group(v) : String(Math.round(v * 10) / 10);
const marker = (i, x, y, c) => i % 3 === 0 ? `<circle cx="${num(x)}" cy="${num(y)}" r="3.5" class="ch-m" style="fill:var(--kit-chart${c})"/>`
  : i % 3 === 1 ? `<rect x="${num(x - 3.2)}" y="${num(y - 3.2)}" width="6.4" height="6.4" class="ch-m" style="fill:var(--kit-chart${c})"/>`
    : `<path d="M${num(x)} ${num(y - 4.4)}L${num(x + 4.4)} ${num(y)}L${num(x)} ${num(y + 4.4)}L${num(x - 4.4)} ${num(y)}Z" class="ch-m" style="fill:var(--kit-chart${c})"/>`;

const valuesOf = n => n.kind === 'scatter' ? (n.series ?? []).flatMap(s => (s.points ?? []).flatMap(p => [p.x, p.y]))
  : n.kind === 'stacked-bar' ? (n.categories ?? []).map((_, i) => (n.series ?? []).reduce((sum, s) => sum + (s.values?.[i] ?? 0), 0))
    : (n.series ?? []).flatMap(s => s.values ?? []);
function scale(n) {
  const values = valuesOf(n), lo = Number.isFinite(n.axis?.min) ? n.axis.min : Math.min(0, ...values);
  const hi = Number.isFinite(n.axis?.max) ? n.axis.max : niceMax(Math.max(...values, 0));
  return {lo, hi, span: hi - lo || 1};
}
function chartAxes(out, {left, top, pw, ph, lo, hi, showX, showY, horizontal = false}) {
  const span = hi - lo || 1;
  const X = v => left + ((v - lo) / span) * pw, Y = v => top + ph - ((v - lo) / span) * ph;
  const ticks = [0, 1, 2, 3, 4].map(i => lo + (span * i) / 4);
  if (showY) for (const tick of ticks) {
    if (horizontal) out.push(`<path d="M${num(X(tick))} ${top}V${top + ph}" class="ch-grid"/><text x="${num(X(tick))}" y="${H - 8}" text-anchor="middle" class="ch-t">${fmtTick(tick)}</text>`);
    else out.push(`<path d="M${left} ${num(Y(tick))}H${left + pw}" class="ch-grid"/><text x="${left - 7}" y="${num(Y(tick) + 4)}" text-anchor="end" class="ch-t">${fmtTick(tick)}</text>`);
  }
  return {X, Y};
}
function cartesian(n) {
  const values = valuesOf(n), horizontal = n.kind === 'bars-h', scatter = n.kind === 'scatter';
  const spark = n.kind === 'sparkline', heat = n.kind === 'heatmap';
  const left = spark ? 8 : heat ? 68 : horizontal ? 90 : M.l, top = spark ? 14 : M.t;
  const right = 8, bottom = spark ? 8 : heat ? 34 : M.b;
  const pw = W - left - right, ph = H - top - bottom, out = [];
  const bounds = scale(n), showX = !spark && n.axis?.showX !== 'no', showY = !spark && n.axis?.showY !== 'no';
  const {lo, hi} = bounds;
  const {X, Y} = scatter ? (() => {
    const xs = n.series.flatMap(s => s.points.map(p => p.x)), ys = n.series.flatMap(s => s.points.map(p => p.y));
    const xlo = Number.isFinite(n.axis?.xMin) ? n.axis.xMin : Math.min(...xs), xhi = Number.isFinite(n.axis?.xMax) ? n.axis.xMax : Math.max(...xs);
    const ylo = Number.isFinite(n.axis?.yMin) ? n.axis.yMin : Math.min(...ys), yhi = Number.isFinite(n.axis?.yMax) ? n.axis.yMax : Math.max(...ys);
    const xspan = xhi - xlo || 1, yspan = yhi - ylo || 1;
    for (let i = 0; i <= 4; i++) {
      const xv = xlo + (xspan * i) / 4, yv = ylo + (yspan * i) / 4;
      if (showX) out.push(`<path d="M${num(left + (pw * i) / 4)} ${top}V${top + ph}" class="ch-grid"/><text x="${num(left + (pw * i) / 4)}" y="${H - 8}" text-anchor="middle" class="ch-t">${fmtTick(xv)}</text>`);
      if (showY) out.push(`<path d="M${left} ${num(top + ph - (ph * i) / 4)}H${left + pw}" class="ch-grid"/><text x="${left - 7}" y="${num(top + ph - (ph * i) / 4 + 4)}" text-anchor="end" class="ch-t">${fmtTick(yv)}</text>`);
    }
    return {X: v => left + ((v - xlo) / xspan) * pw, Y: v => top + ph - ((v - ylo) / yspan) * ph};
  })() : chartAxes(out, {...bounds, left, top, pw, ph, showX: showX && !heat, showY: showY && !heat, horizontal});
  if (spark) {
    const vals = n.series[0].values, min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const pts = vals.map((v, i) => [left + (pw * i) / (vals.length - 1), top + ph - ((v - min) / range) * ph]);
    out.push(`<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:var(--kit-chart1)"/>`);
    out.push(`<circle cx="${num(pts.at(-1)[0])}" cy="${num(pts.at(-1)[1])}" r="4" class="ch-m" style="fill:var(--kit-chart1)"/>`);
  } else if (heat) {
    const rows = n.series.length, cols = n.categories.length, cellW = pw / cols, cellH = ph / rows;
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
    n.categories.forEach((category, col) => out.push(`<text x="${num(left + cellW * (col + .5))}" y="${H - 8}" text-anchor="middle" class="ch-t">${e(short(category, Math.min(6, Math.max(1, Math.floor(cellW / 11)))) )}</text>`));
    n.series.forEach((series, row) => out.push(`<text x="${left - 6}" y="${num(top + cellH * (row + .5) + 4)}" text-anchor="end" class="ch-t">${e(short(series.name, 2))}</text>`));
    n.series.forEach((series, row) => series.values.forEach((v, col) => {
      const step = Math.min(4, Math.floor(((v - min) / range) * 5));
      out.push(`<rect x="${num(left + col * cellW + 1)}" y="${num(top + row * cellH + 1)}" width="${num(Math.max(0, cellW - 2))}" height="${num(Math.max(0, cellH - 2))}" rx="3" style="fill:var(--kit-chart${step + 1})"><title>${e(series.name)} · ${e(n.categories[col])}: ${fmt(v, n.unit)}</title></rect>`);
    }));
  } else if (scatter) {
    n.series.forEach((series, si) => series.points.forEach((p, i) => out.push(`<g class="ch-point" style="color:var(--kit-chart${si + 1})"><title>${e(series.name)} ${i + 1}: ${fmt(p.x, n.xLabel || '')}, ${fmt(p.y, n.unit)}</title>${marker(si, X(p.x), Y(p.y), si + 1)}</g>`)));
  } else {
    const cats = n.categories.length, step = pw / cats;
    if (showX) n.categories.forEach((category, i) => out.push(`<text x="${num(left + step * (i + .5))}" y="${H - 8}" text-anchor="middle" class="ch-t">${e(short(category, horizontal ? 5 : Math.min(6, Math.max(1, Math.floor(step / 11)))))}</text>`));
    if (n.kind === 'bar' || n.kind === 'stacked-bar' || horizontal) {
      const row = ph / cats, bw = horizontal ? Math.min(22, (row * .68) / n.series.length) : Math.min(30, (step * .72) / n.series.length);
      n.series.forEach((series, si) => series.values.forEach((v, i) => {
        const stacked = n.kind === 'stacked-bar';
        const before = stacked ? n.series.slice(0, si).reduce((sum, item) => sum + item.values[i], 0) : 0;
        if (horizontal) {
          const value = stacked ? before + v : v, start = stacked ? before : Math.min(0, value);
          const y = top + row * (i + .5) - (bw * (stacked ? 1 : n.series.length)) / 2 + (stacked ? 0 : si * bw);
          out.push(`<rect x="${num(X(start))}" y="${num(y)}" width="${num(Math.max(1, X(value) - X(start)))}" height="${num(bw - 1)}" rx="2" class="ch-bar" style="fill:var(--kit-chart${si + 1})"/>`);
        } else {
          const x = left + step * (i + .5) - (bw * (stacked ? 1 : n.series.length)) / 2 + (stacked ? 0 : si * bw);
          const y0 = Y(stacked ? before + v : Math.max(v, 0)), baseline = Y(stacked ? before : 0);
          out.push(`<rect x="${num(x)}" y="${num(y0)}" width="${num(Math.max(1, bw - 1))}" height="${num(Math.max(1, baseline - y0))}" rx="2" class="ch-bar" style="fill:var(--kit-chart${si + 1})"/>`);
        }
      }));
    } else n.series.forEach((series, si) => {
      const pts = series.values.map((v, i) => [left + step * (i + .5), Y(v)]);
      if (n.kind === 'area') out.push(`<path d="M${num(pts[0][0])} ${num(Y(0))}${pts.map(p => `L${num(p[0])} ${num(p[1])}`).join('')}L${num(pts.at(-1)[0])} ${num(Y(0))}Z" class="ch-area" style="fill:var(--kit-chart${si + 1})"/>`);
      out.push(`<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:var(--kit-chart${si + 1})"${DASH[si] ? ` stroke-dasharray="${DASH[si]}"` : ''}/>`);
      pts.forEach(p => out.push(marker(si, p[0], p[1], si + 1)));
    });
  }
  return out.join('');
}

function donut(n) {
  const vals = n.series[0].values, total = vals.reduce((a, b) => a + b, 0), cx = 120, cy = 120, r = 82, r2 = 50;
  let a0 = -Math.PI / 2;
  const slices = vals.map((v, i) => {
    const a1 = a0 + (v / total) * Math.PI * 2 - (vals.length > 1 ? .02 : 0), large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, ang) => `${num(cx + rad * Math.cos(ang))} ${num(cy + rad * Math.sin(ang))}`;
    const d = v === total ? `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx - .01} ${cy - r}L${cx - .01} ${cy - r2}A${r2} ${r2} 0 1 0 ${cx} ${cy - r2}Z` : `M${p(r, a0)}A${r} ${r} 0 ${large} 1 ${p(r, a1)}L${p(r2, a1)}A${r2} ${r2} 0 ${large} 0 ${p(r2, a0)}Z`;
    a0 += (v / total) * Math.PI * 2;
    return `<path d="${d}" class="ch-slice" style="fill:var(--kit-chart${(i % 5) + 1})"/>`;
  });
  return `<svg class="ch-donut" viewBox="0 0 240 240" role="img" aria-labelledby="__ID__-t __ID__-d" focusable="false"><title id="__ID__-t">${e(n.title)}</title><desc id="__ID__-d">${e(summary(n))}</desc>${slices.join('')}<text x="120" y="116" text-anchor="middle" class="ch-big">${fmtTick(total)}</text><text x="120" y="136" text-anchor="middle" class="ch-t">합계</text></svg>`;
}

function summary(n) {
  if (n.kind === 'scatter') return `${n.caption} ` + n.series.map(s => `${s.name}: ` + s.points.map(p => `(${p.x}, ${p.y})`).join(', ')).join(' / ');
  return `${n.caption} ` + n.series.map(s => `${s.name}: ` + n.categories.map((category, i) => `${category} ${fmt(s.values[i], n.unit)}`).join(', ')).join(' / ');
}
function tableFor(n) {
  if (n.kind === 'scatter') return `<table><caption>${e(n.title)} 데이터</caption><thead><tr><th scope="col">계열</th><th scope="col">${e(n.xLabel || 'X')}</th><th scope="col">${e(n.yLabel || 'Y')}</th></tr></thead><tbody>${n.series.flatMap(s => s.points.map(p => `<tr><th scope="row">${e(s.name)}</th><td>${fmt(p.x, n.xLabel || '')}</td><td>${fmt(p.y, n.unit)}</td></tr>`)).join('')}</tbody></table>`;
  return `<table><caption>${e(n.title)} 데이터</caption><thead><tr><th scope="col">구분</th>${n.series.map(s => `<th scope="col">${e(s.name)}</th>`).join('')}</tr></thead><tbody>${n.categories.map((category, i) => `<tr><th scope="row">${e(category)}</th>${n.series.map(s => `<td>${fmt(s.values[i], n.unit)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function renderChart(n, id, {fillAssignedWidth = false} = {}) {
  // Keep the established 2.4.0/2.5.0 SVG bytes unchanged unless a chart opts into the new axis contract.
  if (['bar', 'bars-h', 'line', 'area', 'donut'].includes(n.kind) && !n.axis && !n.xLabel && !n.yLabel) return renderLegacyChart(n, id, {fillAssignedWidth});
  let svg, legend = '';
  const spark = n.kind === 'sparkline', axisOmitted = spark || n.axis?.showX === 'no' || n.axis?.showY === 'no';
  if (n.kind === 'donut') {
    svg = donut(n).replaceAll('__ID__', id);
    const total = n.series[0].values.reduce((a, b) => a + b, 0);
    legend = `<ul class="kit-legend">${n.categories.map((c, i) => `<li><i style="background:var(--kit-chart${(i % 5) + 1})" aria-hidden="true"></i>${e(c)} <b>${fmt(n.series[0].values[i], n.unit)}</b> <span>(${Math.round((n.series[0].values[i] / total) * 100)}%)</span></li>`).join('')}</ul>`;
  } else {
    svg = `<svg viewBox="0 0 ${W} ${H}"${fillAssignedWidth ? ' preserveAspectRatio="none"' : ''} data-axis="${axisOmitted ? 'omitted-intentionally' : 'shown'}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false"><title id="${id}-t">${e(n.title)}</title><desc id="${id}-d">${e(summary(n))}</desc>${cartesian(n)}</svg>`;
    if (fillAssignedWidth) svg = `<div class="kit-chart-plot">${svg}</div>`;
    if (n.kind === 'heatmap') {
      const values = valuesOf(n), min = Math.min(...values), max = Math.max(...values);
      legend = `<ul class="kit-legend" aria-label="색상 값 범위">${Array.from({length: 5}, (_, i) => `<li><i style="background:var(--kit-chart${i + 1})" aria-hidden="true"></i>${fmt(min + ((max - min) * i) / 4, n.unit)}</li>`).join('')}</ul>`;
    } else if (!spark && n.kind !== 'heatmap' && n.series.length > 1) legend = `<ul class="kit-legend">${n.series.map((s, i) => `<li><i style="background:var(--kit-chart${i + 1})" aria-hidden="true"></i>${e(s.name)}</li>`).join('')}</ul>`;
  }
  return `<figure class="kit-chart" data-kind="${n.kind}"><figcaption><strong>${e(n.title)}</strong><span>${e(n.caption)}${n.unit ? ` · 단위 ${e(n.unit)}` : ''}</span></figcaption><div class="kit-chart-body">${svg}${legend}</div><details class="kit-chart-data"><summary>데이터 표 보기</summary>${tableFor(n)}</details></figure>`;
}
