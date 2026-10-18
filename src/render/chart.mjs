import {e, num} from './util.mjs';

/** Charts are plain SVG built from numbers; colors are token variables, series are also told apart by dash style and marker shape. */
const W = 360, H = 240, M = {l: 38, r: 12, t: 14, b: 28};
const DASH = ['', '6 4', '2 3'];
const short = (s, n) => [...s].length > n ? [...s].slice(0, n).join('') + '…' : s;
function niceMax(v) { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
const group = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmt = (v, unit) => `${Number.isInteger(v) ? group(v) : String(Math.round(v * 100) / 100)}${unit ?? ''}`;
const fmtTick = v => Number.isInteger(v) ? group(v) : String(Math.round(v * 10) / 10);
const marker = (i, x, y, c) => i === 0 ? `<circle cx="${num(x)}" cy="${num(y)}" r="3.5" class="ch-m" style="fill:var(--kit-chart${c})"/>`
  : i === 1 ? `<rect x="${num(x - 3.2)}" y="${num(y - 3.2)}" width="6.4" height="6.4" class="ch-m" style="fill:var(--kit-chart${c})"/>`
    : `<path d="M${num(x)} ${num(y - 4.4)}L${num(x + 4.4)} ${num(y)}L${num(x)} ${num(y + 4.4)}L${num(x - 4.4)} ${num(y)}Z" class="ch-m" style="fill:var(--kit-chart${c})"/>`;

function cartesian(n) {
  const all = n.series.flatMap(s => s.values), lo = Math.min(0, ...all), hi = niceMax(Math.max(...all, 0)), span = (hi - lo) || 1;
  const horizontal = n.kind === 'bars-h', left = horizontal ? 74 : M.l;
  const pw = W - left - M.r, ph = H - M.t - M.b, cats = n.categories.length, out = [];
  const X = i => left + (pw * (i + .5)) / cats, Y = v => M.t + ph - ((v - lo) / span) * ph;
  const ticks = [0, 1, 2, 3, 4].map(i => lo + (span * i) / 4);
  if (!horizontal) {
    for (const t of ticks) out.push(`<path d="M${left} ${num(Y(t))}H${W - M.r}" class="ch-grid"/><text x="${left - 6}" y="${num(Y(t) + 4)}" text-anchor="end" class="ch-t">${fmtTick(t)}</text>`);
    n.categories.forEach((c, i) => out.push(`<text x="${num(X(i))}" y="${H - 8}" text-anchor="middle" class="ch-t">${e(short(c, 4))}</text>`));
  }
  if (n.kind === 'bar') {
    const group = pw / cats, bw = Math.min(30, (group * .72) / n.series.length);
    n.series.forEach((s, si) => s.values.forEach((v, i) => {
      const x = X(i) - (bw * n.series.length) / 2 + si * bw, y0 = Y(Math.max(v, 0)), h = Math.abs(Y(v) - Y(0));
      out.push(`<rect x="${num(x)}" y="${num(y0)}" width="${num(bw - 1)}" height="${num(Math.max(h, 1))}" rx="2" class="ch-bar" style="fill:var(--kit-chart${si + 1})"/>`);
      if (n.series.length === 1 && cats <= 6) out.push(`<text x="${num(x + bw / 2)}" y="${num(y0 - 4)}" text-anchor="middle" class="ch-v">${fmtTick(v)}</text>`);
    }));
  } else if (horizontal) {
    const row = ph / cats, bh = Math.min(22, (row * .7) / n.series.length), Xv = v => left + ((v - lo) / span) * pw;
    for (const t of ticks) out.push(`<path d="M${num(Xv(t))} ${M.t}V${M.t + ph}" class="ch-grid"/><text x="${num(Xv(t))}" y="${H - 8}" text-anchor="middle" class="ch-t">${fmtTick(t)}</text>`);
    n.categories.forEach((c, i) => out.push(`<text x="${left - 6}" y="${num(M.t + row * (i + .5) + 4)}" text-anchor="end" class="ch-t">${e(short(c, 6))}</text>`));
    n.series.forEach((s, si) => s.values.forEach((v, i) => {
      const y = M.t + row * (i + .5) - (bh * n.series.length) / 2 + si * bh;
      out.push(`<rect x="${num(Math.min(Xv(0), Xv(v)))}" y="${num(y)}" width="${num(Math.max(Math.abs(Xv(v) - Xv(0)), 1))}" height="${num(bh - 1)}" rx="2" class="ch-bar" style="fill:var(--kit-chart${si + 1})"/>`);
      if (n.series.length === 1) out.push(`<text x="${num(Math.max(Xv(v), Xv(0)) + 4)}" y="${num(y + bh / 2 + 4)}" class="ch-v">${fmtTick(v)}</text>`);
    }));
  } else {
    n.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [X(i), Y(v)]);
      if (n.kind === 'area') out.push(`<path d="M${num(pts[0][0])} ${num(Y(0))}${pts.map(p => `L${num(p[0])} ${num(p[1])}`).join('')}L${num(pts.at(-1)[0])} ${num(Y(0))}Z" class="ch-area" style="fill:var(--kit-chart${si + 1})"/>`);
      out.push(`<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:var(--kit-chart${si + 1})"${DASH[si] ? ` stroke-dasharray="${DASH[si]}"` : ''}/>`);
      pts.forEach(p => out.push(marker(si, p[0], p[1], si + 1)));
      if (n.series.length === 1) pts.forEach((p, i) => { if (cats <= 7) out.push(`<text x="${num(p[0])}" y="${num(p[1] - 8)}" text-anchor="middle" class="ch-v">${fmtTick(s.values[i])}</text>`); });
    });
  }
  return out.join('');
}

function donut(n) {
  const vals = n.series[0].values, total = vals.reduce((a, b) => a + b, 0) || 1, cx = 120, cy = 120, r = 82, r2 = 50;
  let a0 = -Math.PI / 2;
  const slices = vals.map((v, i) => {
    const a1 = a0 + (v / total) * Math.PI * 2 - (vals.length > 1 ? .02 : 0), large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, ang) => `${num(cx + rad * Math.cos(ang))} ${num(cy + rad * Math.sin(ang))}`;
    const d = v === total ? `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx - .01} ${cy - r}L${cx - .01} ${cy - r2}A${r2} ${r2} 0 1 0 ${cx} ${cy - r2}Z` : `M${p(r, a0)}A${r} ${r} 0 ${large} 1 ${p(r, a1)}L${p(r2, a1)}A${r2} ${r2} 0 ${large} 0 ${p(r2, a0)}Z`;
    a0 += (v / total) * Math.PI * 2;
    return `<path d="${d}" class="ch-slice" style="fill:var(--kit-chart${(i % 5) + 1})"/>`;
  });
  return {svg: `<svg class="ch-donut" viewBox="0 0 240 240" role="img" aria-labelledby="__ID__-t __ID__-d" focusable="false"><title id="__ID__-t">${e(n.title)}</title><desc id="__ID__-d">${e(summary(n))}</desc>${slices.join('')}<text x="120" y="116" text-anchor="middle" class="ch-big">${fmtTick(total)}${e(n.unit ?? '')}</text><text x="120" y="136" text-anchor="middle" class="ch-t">합계</text></svg>`, total};
}

const summary = n => n.kind === 'donut'
  ? `${n.caption} ` + n.categories.map((c, i) => `${c} ${fmt(n.series[0].values[i], n.unit)}`).join(', ')
  : `${n.caption} ` + n.series.map(s => `${s.name}: ` + n.categories.map((c, i) => `${c} ${fmt(s.values[i], n.unit)}`).join(', ')).join(' / ');

export function renderChart(n, id) {
  let svg, legend = '';
  if (n.kind === 'donut') {
    svg = donut(n).svg.replaceAll('__ID__', id);
    const total = n.series[0].values.reduce((a, b) => a + b, 0) || 1;
    legend = `<ul class="kit-legend">${n.categories.map((c, i) => `<li><i style="background:var(--kit-chart${(i % 5) + 1})" aria-hidden="true"></i>${e(c)} <b>${fmt(n.series[0].values[i], n.unit)}</b> <span>(${Math.round((n.series[0].values[i] / total) * 100)}%)</span></li>`).join('')}</ul>`;
  } else {
    svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false"><title id="${id}-t">${e(n.title)}</title><desc id="${id}-d">${e(summary(n))}</desc>${cartesian(n)}</svg>`;
    if (n.series.length > 1) legend = `<ul class="kit-legend">${n.series.map((s, i) => `<li><i style="background:var(--kit-chart${i + 1})" aria-hidden="true"></i>${e(s.name)}</li>`).join('')}</ul>`;
  }
  const head = ['', ...(n.kind === 'donut' ? [n.series[0].name] : n.series.map(s => s.name))];
  const table = `<table><caption>${e(n.title)} 데이터</caption><thead><tr><th scope="col">구분</th>${head.slice(1).map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${n.categories.map((c, i) => `<tr><th scope="row">${e(c)}</th>${(n.kind === 'donut' ? [n.series[0]] : n.series).map(s => `<td>${fmt(s.values[i], n.unit)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<figure class="kit-chart" data-kind="${n.kind}"><figcaption><strong>${e(n.title)}</strong><span>${e(n.caption)}</span></figcaption><div class="kit-chart-body">${svg}${legend}</div><details class="kit-chart-data"><summary>데이터 표 보기</summary>${table}</details></figure>`;
}
