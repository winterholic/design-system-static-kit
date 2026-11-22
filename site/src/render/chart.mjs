import {e, num, fmt, fmtTick, DASH, marker, seg, txt, xText, gridOf, legendOf, categoryAxis, valueAxisY, pickLabels, legendItems, swatch} from './chart-kit.mjs';
import {renderLegacyChart, niceMax} from './chart-legacy.mjs';
import {FORMS, formLegend, formSummary, formTable} from './chart-forms.mjs';
import {geometry, valueScale, barWidth, tickPlan, fitText, levelsOf, CHART_FORM_KINDS} from '../catalog/chart-rules.mjs';

/** SVG charts. Series use both color and shape/dash; every figure also ships an HTML data table. */
/** niceMax는 구형 렌더러(chart-legacy.mjs)가 정의한 것을 그대로 쓴다. 같은 함수를 두 곳에 두면 한쪽만 고쳐져 두 렌더러의 눈금이 어긋난다. */
export {niceMax};

/** 2.6.0: 값 라벨. 위치만 정하고 겹침 여부는 chartDiagnostics가 같은 간격 계산으로 이미 걸렀다. */
function valueLabels(out, n, items) {
  const picked = pickLabels(items.map(item => item.v), n.labels ?? 'none');
  items.forEach((item, i) => { if (picked.has(i)) out.push(txt(item.x, item.y, fmtTick(item.v), {anchor: item.anchor ?? 'middle', cls: 'ch-v'})); });
}

function cartesian(n) {
  const g = geometry(n), kind = n.kind, out = [], grid = gridOf(n), showX = n.axis?.showX !== 'no', showY = n.axis?.showY !== 'no';
  const {left, top, pw, ph} = g;
  if (FORMS[kind]) { FORMS[kind].plot(n, g, out); return {inner: out.join(''), g}; }
  if (kind === 'sparkline') {
    const vals = n.series[0].values, min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const pts = vals.map((v, i) => [left + (pw * i) / (vals.length - 1), top + ph - ((v - min) / range) * ph]);
    out.push(`<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:var(--kit-chart1)"/>`);
    out.push(`<circle cx="${num(pts.at(-1)[0])}" cy="${num(pts.at(-1)[1])}" r="4" class="ch-m" style="fill:var(--kit-chart1)"/>`);
    if (n.labels === 'last') out.push(txt(pts.at(-1)[0] - 8, Math.max(13, pts.at(-1)[1] - 8), fmt(vals.at(-1), n.unit), {anchor: 'end', cls: 'ch-v'}));
    return {inner: out.join(''), g};
  }
  if (kind === 'scatter') {
    const xs = n.series.flatMap(s => s.points.map(p => p.x)), ys = n.series.flatMap(s => s.points.map(p => p.y));
    const xlo = Number.isFinite(n.axis?.xMin) ? n.axis.xMin : Math.min(...xs), xhi = Number.isFinite(n.axis?.xMax) ? n.axis.xMax : Math.max(...xs);
    const ylo = Number.isFinite(n.axis?.yMin) ? n.axis.yMin : Math.min(...ys), yhi = Number.isFinite(n.axis?.yMax) ? n.axis.yMax : Math.max(...ys);
    const xspan = xhi - xlo || 1, yspan = yhi - ylo || 1, X = v => left + ((v - xlo) / xspan) * pw, Y = v => top + ph - ((v - ylo) / yspan) * ph;
    const xTicks = Array.from({length: 5}, (_, i) => xlo + (xspan * i) / 4), plan = tickPlan(xTicks.map(fmtTick), pw / 4, {truncate: false});
    for (let i = 0; i <= 4; i++) {
      const yv = ylo + (yspan * i) / 4;
      if (grid === 'vertical' || grid === 'both') out.push(seg(left + (pw * i) / 4, top, left + (pw * i) / 4, top + ph));
      if (grid === 'horizontal' || grid === 'both') out.push(seg(left, top + ph - (ph * i) / 4, left + pw, top + ph - (ph * i) / 4));
      if (showX && plan.shown[i] !== null) out.push(xText(g, left + (pw * i) / 4, plan.shown[i], g.H - 10));
      if (showY) out.push(txt(left - 7, top + ph - (ph * i) / 4 + 4.5, fmtTick(yv), {anchor: 'end'}));
    }
    out.push(seg(left, top + ph, left + pw, top + ph, 'ch-axis'));
    n.series.forEach((series, si) => series.points.forEach((p, i) => out.push(`<g class="ch-point" style="color:var(--kit-chart${si + 1})"><title>${e(series.name)} ${i + 1}: ${fmt(p.x, n.xLabel || '')}, ${fmt(p.y, n.unit)}</title>${marker(si, X(p.x), Y(p.y), si + 1)}</g>`)));
    return {inner: out.join(''), g};
  }
  if (kind === 'heatmap') {
    const rows = n.series.length, cols = n.categories.length, cellW = pw / cols, cellH = ph / rows, values = levelsOf(n);
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1, plan = tickPlan(n.categories, cellW);
    const ramp = v => (.16 + .84 * ((v - min) / range)).toFixed(2);
    if (showX) n.categories.forEach((_, col) => { if (plan.shown[col] !== null) out.push(txt(left + cellW * (col + .5), g.H - 10, plan.shown[col])); });
    n.series.forEach((series, row) => out.push(txt(left - 6, top + cellH * (row + .5) + 4.5, fitText(series.name, left - 10), {anchor: 'end'})));
    n.series.forEach((series, row) => series.values.forEach((v, col) => {
      out.push(`<rect x="${num(left + col * cellW + 1)}" y="${num(top + row * cellH + 1)}" width="${num(Math.max(0, cellW - 2))}" height="${num(Math.max(0, cellH - 2))}" rx="3" class="ch-cell" style="fill:var(--kit-chart1);fill-opacity:${ramp(v)}"><title>${e(series.name)} · ${e(n.categories[col])}: ${fmt(v, n.unit)}</title></rect>`);
      if (n.labels === 'values') out.push(txt(left + cellW * (col + .5), top + cellH * (row + .5) + 4.5, fmtTick(v), {cls: 'ch-vh'}));
    }));
    return {inner: out.join(''), g};
  }
  const horizontal = kind === 'bars-h', stacked = kind === 'stacked-bar', bars = kind === 'bar' || stacked || horizontal, sc = valueScale(n), cats = n.categories.length;
  if (horizontal) {
    const X = v => left + ((v - sc.lo) / sc.span) * pw, row = ph / cats, bw = Math.min(22, (row * .68) / n.series.length);
    for (const tick of sc.ticks) {
      if (grid === 'vertical' || grid === 'both') out.push(seg(X(tick), top, X(tick), top + ph));
      if (showY) out.push(txt(X(tick), g.H - 10, fmtTick(tick)));
    }
    if (grid === 'horizontal' || grid === 'both') for (let i = 0; i <= cats; i++) out.push(seg(left, top + row * i, left + pw, top + row * i));
    out.push(seg(X(Math.max(sc.lo, Math.min(0, sc.hi))), top, X(Math.max(sc.lo, Math.min(0, sc.hi))), top + ph, 'ch-axis'));
    if (showX) n.categories.forEach((c, i) => out.push(txt(left - 8, top + row * (i + .5) + 4.5, fitText(c, left - 10), {anchor: 'end'})));
    const labels = [];
    n.series.forEach((series, si) => series.values.forEach((v, i) => {
      const y = top + row * (i + .5) - (bw * n.series.length) / 2 + si * bw, x0 = X(Math.min(0, v)), x1 = X(Math.max(0, v));
      out.push(`<rect x="${num(x0)}" y="${num(y)}" width="${num(Math.max(1, x1 - x0))}" height="${num(bw - 1)}" rx="2" class="ch-bar" style="fill:var(--kit-chart${si + 1})"><title>${e(series.name)} · ${e(n.categories[i])}: ${fmt(v, n.unit)}</title></rect>`);
      labels.push({v, x: v >= 0 ? x1 + 5 : x0 - 5, y: y + bw / 2 + 4, anchor: v >= 0 ? 'start' : 'end'});
    }));
    valueLabels(out, n, labels);
    return {inner: out.join(''), g};
  }
  // 세로 값 축: bar·stacked-bar·line·area
  const X = i => left + g.slot * (i + .5);
  const Y = valueAxisY(out, n, g, sc, {grid, show: showY});
  categoryAxis(out, n, g, {labels: n.categories, at: X, grid, show: showX});
  const labels = [], base0 = Math.max(sc.lo, Math.min(0, sc.hi));
  if (bars) {
    const bw = barWidth(g, stacked ? 1 : n.series.length);
    n.series.forEach((series, si) => series.values.forEach((v, i) => {
      const before = stacked ? n.series.slice(0, si).reduce((sum, item) => sum + item.values[i], 0) : 0;
      const x = X(i) - (bw * (stacked ? 1 : n.series.length)) / 2 + (stacked ? 0 : si * bw);
      const from = stacked ? before : base0, to = stacked ? before + v : v, y = Math.min(Y(from), Y(to)), h = Math.abs(Y(from) - Y(to));
      out.push(`<rect x="${num(x)}" y="${num(y)}" width="${num(Math.max(1, bw - 1))}" height="${num(Math.max(1, h))}" rx="2" class="ch-bar" style="fill:var(--kit-chart${si + 1})"><title>${e(series.name)} · ${e(n.categories[i])}: ${fmt(v, n.unit)}</title></rect>`);
      if (!stacked) labels.push({v, x: x + bw / 2, y: v < 0 ? y + h + 14 : y - 5});
    }));
    if (stacked) levelsOf(n).forEach((total, i) => labels.push({v: total, x: X(i), y: Y(total) - 5}));
    valueLabels(out, n, labels);
  } else {
    n.series.forEach((series, si) => {
      const pts = series.values.map((v, i) => [X(i), Y(v)]);
      if (kind === 'area') out.push(`<path d="M${num(pts[0][0])} ${num(Y(base0))}${pts.map(p => `L${num(p[0])} ${num(p[1])}`).join('')}L${num(pts.at(-1)[0])} ${num(Y(base0))}Z" class="ch-area" style="fill:var(--kit-chart${si + 1})"/>`);
      out.push(`<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`).join('')}" class="ch-line" style="stroke:var(--kit-chart${si + 1})"${DASH[si] ? ` stroke-dasharray="${DASH[si]}"` : ''}/>`);
      pts.forEach(p => out.push(marker(si, p[0], p[1], si + 1)));
      valueLabels(out, n, pts.map((p, i) => ({v: series.values[i], x: p[0], y: p[1] - 9, anchor: p[0] + 16 > g.W ? 'end' : 'middle'})));
    });
  }
  return {inner: out.join(''), g};
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
  if (CHART_FORM_KINDS.includes(n.kind)) return formSummary(n);
  if (n.kind === 'scatter') return `${n.caption} ` + n.series.map(s => `${s.name}: ` + s.points.map(p => `(${p.x}, ${p.y})`).join(', ')).join(' / ');
  return `${n.caption} ` + n.series.map(s => `${s.name}: ` + n.categories.map((category, i) => `${category} ${fmt(s.values[i], n.unit)}`).join(', ')).join(' / ');
}
function tableFor(n) {
  if (CHART_FORM_KINDS.includes(n.kind)) return formTable(n);
  if (n.kind === 'scatter') return `<table><caption>${e(n.title)} 데이터</caption><thead><tr><th scope="col">계열</th><th scope="col">${e(n.xLabel || 'X')}</th><th scope="col">${e(n.yLabel || 'Y')}</th></tr></thead><tbody>${n.series.flatMap(s => s.points.map(p => `<tr><th scope="row">${e(s.name)}</th><td>${fmt(p.x, n.xLabel || '')}</td><td>${fmt(p.y, n.unit)}</td></tr>`)).join('')}</tbody></table>`;
  return `<table><caption>${e(n.title)} 데이터</caption><thead><tr><th scope="col">구분</th>${n.series.map(s => `<th scope="col">${e(s.name)}</th>`).join('')}</tr></thead><tbody>${n.categories.map((category, i) => `<tr><th scope="row">${e(category)}</th>${n.series.map(s => `<td>${fmt(s.values[i], n.unit)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** 범례: legend 옵션(auto·bottom·right·none)과 형태별 기본 범례. 반환의 position은 CSS가 쓰는 data-legend 값이다. */
function legendFor(n) {
  const legend = legendParts(n);
  return legend.html ? legend : {html: '', position: 'none'};
}
function legendParts(n) {
  const mode = legendOf(n);
  if (mode === 'none') return {html: '', position: 'none'};
  const position = mode === 'right' ? 'right' : 'bottom';
  if (n.kind === 'donut') {
    const total = n.series[0].values.reduce((a, b) => a + b, 0);
    return {position, html: `<ul class="kit-legend">${n.categories.map((c, i) => `<li><i style="background:var(--kit-chart${(i % 5) + 1})" aria-hidden="true"></i>${e(c)} <b>${fmt(n.series[0].values[i], n.unit)}</b> <span>(${Math.round((n.series[0].values[i] / total) * 100)}%)</span></li>`).join('')}</ul>`};
  }
  if (n.kind === 'heatmap') {
    const values = levelsOf(n), min = Math.min(...values), max = Math.max(...values);
    return {position, html: `<ul class="kit-legend" aria-label="색 진하기 값 범위">${Array.from({length: 5}, (_, i) => `<li><i style="background:var(--kit-chart1);opacity:${(.16 + .84 * (i / 4)).toFixed(2)}" aria-hidden="true"></i>${fmt(max - min >= 8 ? Math.round(min + ((max - min) * i) / 4) : Math.round((min + ((max - min) * i) / 4) * 10) / 10, n.unit)}</li>`).join('')}</ul>`};
  }
  if (CHART_FORM_KINDS.includes(n.kind)) return {position, html: formLegend(n)};
  if (n.kind === 'sparkline') return {position, html: mode === 'auto' ? '' : legendItems([[swatch(1), n.series[0].name]])};
  if (n.series.length > 1 || mode !== 'auto') return {position, html: legendItems(n.series.map((s, i) => [swatch(i + 1), s.name]))};
  return {html: '', position: 'none'};
}

export function renderChart(n, id, {fillAssignedWidth = false} = {}) {
  // Keep the established 2.4.0/2.5.0 SVG bytes unchanged unless a chart opts into the new axis contract.
  if (['bar', 'bars-h', 'line', 'area', 'donut'].includes(n.kind) && !n.axis && !n.xLabel && !n.yLabel && !['dataType', 'grid', 'labels', 'legend', 'density', 'responsive'].some(key => n[key] !== undefined)) return renderLegacyChart(n, id, {fillAssignedWidth});
  let svg;
  const spark = n.kind === 'sparkline', axisOmitted = spark || n.axis?.showX === 'no' || n.axis?.showY === 'no', scroll = n.responsive === 'scroll' && n.kind !== 'donut';
  if (n.kind === 'donut') svg = donut(n).replaceAll('__ID__', id);
  else {
    const {inner, g} = cartesian(n);
    svg = `<svg viewBox="0 0 ${g.W} ${g.H}"${fillAssignedWidth && !scroll ? ' preserveAspectRatio="none"' : ''} data-axis="${axisOmitted ? 'omitted-intentionally' : 'shown'}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false"><title id="${id}-t">${e(n.title)}</title><desc id="${id}-d">${e(summary(n))}</desc>${inner}</svg>`;
    if (scroll) svg = `<div class="kit-chart-scroll" data-layout-scroll tabindex="0" role="group" aria-label="${e(n.title)} 차트, 가로로 스크롤">${svg}</div>`;
    else if (fillAssignedWidth) svg = `<div class="kit-chart-plot">${svg}</div>`;
  }
  const legend = legendFor(n);
  const resolved = {grid: ['donut', 'sparkline', 'heatmap', 'funnel'].includes(n.kind) ? 'none' : gridOf(n), labels: n.labels ?? 'none', legend: legend.position, density: n.density ?? 'comfortable', responsive: scroll ? 'scroll' : 'fit'};
  const attrs = ` data-chart="2.6"${n.dataType ? ` data-type="${n.dataType}"` : ''} data-grid="${resolved.grid}" data-labels="${resolved.labels}" data-legend="${resolved.legend}" data-density="${resolved.density}" data-responsive="${resolved.responsive}"`;
  return `<figure class="kit-chart" data-kind="${n.kind}"${attrs}><figcaption><strong>${e(n.title)}</strong><span>${e(n.caption)}${n.unit ? ` · 단위 ${e(n.unit)}` : ''}</span></figcaption><div class="kit-chart-body">${svg}${legend.html}</div><details class="kit-chart-data"><summary>데이터 표 보기</summary>${tableFor(n)}</details></figure>`;
}
