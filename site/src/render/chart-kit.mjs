import {e, num} from './util.mjs';
import {fmt, fmtTick, tickPlan, textWidth, CHART_FONT} from '../catalog/chart-rules.mjs';
export {e, num, fmt, fmtTick};

/** 2.6.0 차트 그리기 도우미. 좌표·여백·눈금 계획은 src/catalog/chart-rules.mjs가 정하고, 여기서는 SVG 조각만 만든다. */
export const DASH = ['', '6 4', '2 3'];
export const marker = (i, x, y, c) => i % 3 === 0 ? `<circle cx="${num(x)}" cy="${num(y)}" r="3.5" class="ch-m" style="fill:var(--kit-chart${c})"/>`
  : i % 3 === 1 ? `<rect x="${num(x - 3.2)}" y="${num(y - 3.2)}" width="6.4" height="6.4" class="ch-m" style="fill:var(--kit-chart${c})"/>`
    : `<path d="M${num(x)} ${num(y - 4.4)}L${num(x + 4.4)} ${num(y)}L${num(x)} ${num(y + 4.4)}L${num(x - 4.4)} ${num(y)}Z" class="ch-m" style="fill:var(--kit-chart${c})"/>`;

export const seg = (x1, y1, x2, y2, cls = 'ch-grid') => `<path d="M${num(x1)} ${num(y1)}L${num(x2)} ${num(y2)}" class="${cls}"/>`;
export const txt = (x, y, text, {anchor = 'middle', cls = 'ch-t'} = {}) => `<text x="${num(x)}" y="${num(y)}" text-anchor="${anchor}" class="${cls}">${e(text)}</text>`;

/** 격자 모드의 기본값: 값 축에 수직인 선. 가로 막대의 값 축은 X라서 세로선이 기본이다. */
export const gridOf = n => n.grid ?? (n.kind === 'scatter' ? 'both' : n.kind === 'bars-h' ? 'vertical' : 'horizontal');
export const legendOf = n => n.legend ?? 'auto';

/** X축 글자: 그림 왼쪽·오른쪽 끝에서 잘리지 않게 끝 라벨은 안쪽으로 정렬한다. */
export function xText(g, x, text, y) {
  const half = textWidth(text) / 2;
  const anchor = x - half < 2 ? 'start' : x + half > g.W - 2 ? 'end' : 'middle';
  return txt(x, y, text, {anchor});
}

/** 범주 축(세로 값 축 차트): 라벨은 tickPlan, 세로 격자는 범주 경계. */
export function categoryAxis(out, n, g, {labels, at, grid, show}) {
  const plan = tickPlan(labels, g.slot);
  if (grid === 'vertical' || grid === 'both') for (let i = 0; i <= g.cats; i++) out.push(seg(g.left + g.slot * i, g.top, g.left + g.slot * i, g.top + g.ph));
  if (show) labels.forEach((_, i) => { if (plan.shown[i] !== null) out.push(xText(g, at(i), plan.shown[i], g.H - 10)); });
}

/** 값 축(세로): 가로 격자와 왼쪽 눈금 라벨, 그리고 기준선(0 또는 바닥). */
export function valueAxisY(out, n, g, sc, {grid, show, zero = true}) {
  const Y = v => g.top + g.ph - ((v - sc.lo) / sc.span) * g.ph;
  for (const tick of sc.ticks) {
    if (grid === 'horizontal' || grid === 'both') out.push(seg(g.left, Y(tick), g.left + g.pw, Y(tick)));
    if (show) out.push(txt(g.left - 7, Y(tick) + 4.5, fmtTick(tick), {anchor: 'end'}));
  }
  const base = zero && sc.lo < 0 && sc.hi > 0 ? 0 : sc.lo;
  out.push(seg(g.left, Y(base), g.left + g.pw, Y(base), 'ch-axis'));
  return Y;
}

/** 값 라벨 대상 인덱스: values는 전부, extremes는 최댓값과 최솟값, last는 마지막. */
export function pickLabels(values, mode) {
  if (mode === 'values') return new Set(values.map((_, i) => i));
  if (mode === 'last') return new Set(values.length ? [values.length - 1] : []);
  if (mode === 'extremes' && values.length) return new Set([values.indexOf(Math.max(...values)), values.indexOf(Math.min(...values))]);
  return new Set();
}

export const legendItems = items => `<ul class="kit-legend">${items.map(([style, label]) => `<li><i style="${style}" aria-hidden="true"></i>${e(label)}</li>`).join('')}</ul>`;
export const swatch = c => `background:var(--kit-chart${c})`;
export const hollow = c => `background:transparent;border:2px solid var(--kit-chart${c})`;
export {CHART_FONT};
