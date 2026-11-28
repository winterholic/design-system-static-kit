/**
 * 레이아웃 24종 브라우저 실측(REQUEST §9.2, TASK-TRE-03).
 *   PLAYWRIGHT_BROWSERS_PATH=... node scripts/layouts/measure.mjs [--out docs/dev/catalog-platform-upgrade/screens/layouts] [--no-shots]
 * 레이아웃마다 슬롯 계약을 모두 채운 표본(layoutSpecimen: 실제 목적 패밀리 렌더)과 긴 콘텐츠 표본(stress)을 같은 조립 경로(assembleLayout)로 만들고
 * Chromium에서 320·360·480·640·768·1024·1280·1440px 뷰포트로 연다.
 *   1) 가로 스크롤: 문서 scrollWidth가 뷰포트를 넘는지, 스크롤 영역 밖에서 뷰포트 오른쪽을 벗어난 요소가 있는지
 *   2) 폭별 슬롯 위치: 슬롯·항목의 사각형을 컨테이너 기준 비율로 기록하고 행·열 순위(rank)로 바꾼 배치 서명을 만든다. 순위라서 단순 축소는 같은 서명이다
 *   3) 쌍별 구분: 레이아웃 276쌍의 서명을 이름 없이 견주어 폭 4개(320·768·1024·1440) 중 서로 다른 폭의 수를 센다
 * 결과는 measurements.json(근거)과 measurements.md(요약)이고, 대표 폭 스크린샷을 같은 폴더에 쓴다(전수 아님: 레이아웃마다 한 장).
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {createPlatform} from '../../src/platform/index.mjs';
import {assembleLayout, layoutSpecimen, layoutFingerprint} from '../../src/platform/layouts.mjs';
import {LAYOUT_BANDS, LAYOUT_BAND_NAMES} from '../../src/layout.mjs';

export const MAIN_WIDTHS = [320, 768, 1024, 1440];
export const ALL_WIDTHS = [320, 360, 480, 640, 768, 1024, 1280, 1440];
/** 필요한 핵심 구간(needsBand)에 처음 들어가는 대표 폭. 스크린샷은 레이아웃마다 이 폭 한 장이다. */
export const REPRESENTATIVE = {xs: 320, sm: 768, md: 1024, lg: 1440};
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** 브라우저 안에서 도는 함수(외부 이름을 쓰지 않는다). */
function measureInPage() {
  const root = document.querySelector('.kit-lay');
  const rr = root.getBoundingClientRect();
  const W = Math.round(rr.width);
  const rel = el => { const r = el.getBoundingClientRect(); return {left: +(r.left - rr.left).toFixed(1), top: +(r.top - rr.top).toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1)}; };
  const slots = [...root.querySelectorAll(':scope > .kit-lay-grid > [data-slot]')].map(el => {
    const cs = getComputedStyle(el);
    return {slot: el.dataset.slot, ...rel(el), count: Number(el.dataset.count), position: cs.position, overflowX: cs.overflowX, scrollable: el.scrollWidth > el.clientWidth + 1,
      items: [...el.querySelectorAll(':scope > .kit-lay-item')].map(rel)};
  });
  const clipsX = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  const vw = document.documentElement.clientWidth;
  const outside = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1 && !clipsX(el)) outside.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : ''}@${Math.round(r.right)}`);
  }
  const overlaps = [];
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    const a = slots[i], b = slots[j];
    const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left), h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    if (w > 1 && h > 1) overlaps.push({a: a.slot, b: b.slot, w: Math.round(w), h: Math.round(h)});
  }
  return {rootTop: rr.top + window.scrollY, viewport: vw, containerWidth: W, docOverflow: Math.max(0, document.documentElement.scrollWidth - vw), bodyOverflow: Math.max(0, document.body.scrollWidth - vw), outside: outside.slice(0, 6), outsideCount: outside.length, slots, overlaps};
}

/** 900px 높이 뷰포트의 맨 위에서 sticky 슬롯이 보이는가. 자연 위치가 접힌 선(900px) 아래인데 보이면 화면에 붙어 있는 것이다. */
function stickyInPage(list) {
  return list.map(({slot, top}) => { const el = document.querySelector(`.kit-lay-grid > [data-slot="${slot}"]`), r = el.getBoundingClientRect(); return {slot, naturalTop: Math.round(top), visibleAtTop: r.top < innerHeight && r.bottom > 0, pinnedBottom: Math.abs(r.bottom - innerHeight) <= 1}; });
}

/** 그 구간에서 앞 슬롯 위로 겹쳐 올라오도록 선언한 슬롯(band.pull): 이 슬롯이 낀 겹침은 의도한 것이다. */
const pulled = (layout, bi) => new Set(Object.keys(layout.bands[bi].pull ?? {}));
const bandOf = w => LAYOUT_BANDS.reduce((best, from, i) => (w >= from ? i : best), 0);
/** 행 순위: 같은 줄(상단 차이 6px 이내)을 한 순위로 묶는다. */
const ranks = (values, tol) => { const sorted = [...new Set(values.map(v => Math.round(v)))].sort((a, b) => a - b); const groups = []; for (const v of sorted) { if (groups.length && v - groups.at(-1).at(-1) <= tol) groups.at(-1).push(v); else groups.push([v]); } return v => groups.findIndex(g => g.some(x => Math.abs(x - Math.round(v)) <= tol)); };

/**
 * 배치 서명: 슬롯(DOM 순서)마다 [열 순위, 행 순위, 폭 비율(12분할), 항목 열 수·정렬 여부]. 이름은 넣지 않는다(이름만 다른 같은 배치를 잡기 위해).
 * 열 순위는 슬롯 왼쪽 가장자리를 12분할한 값으로 순위를 매긴다. 순위·비율이라서 같은 배치를 같은 비율로 줄이면 같은 서명이다.
 */
export function signatureOf(m) {
  const W = m.containerWidth, rowRank = ranks(m.slots.map(s => s.top), 6), colRank = ranks(m.slots.map(s => s.left), Math.max(6, W * 0.02));
  const slots = m.slots.map(s => {
    const itemLeft = ranks(s.items.map(i => i.left), 6), cols = new Set(s.items.map(i => itemLeft(i.left))).size;
    const aligned = isRowAligned(s.items);
    return [colRank(s.left), rowRank(s.top), Math.round(s.width / W * 12), cols, aligned ? 'r' : 'c', s.items.length > 1 ? s.items.length : 1];
  });
  return slots.map(x => x.join('.')).sort().join(' ');
}
/** 줄 정렬: 항목을 상단 순으로 묶었을 때 같은 줄의 항목들 높이가 같으면(격자) true. 벽돌 배치는 열마다 상단이 어긋난다. */
function isRowAligned(items) {
  const rows = new Map();
  for (const it of items) { const k = Math.round(it.top / 6); rows.set(k, (rows.get(k) ?? 0) + 1); }
  const widths = new Set(items.map(i => Math.round(i.left / 6)));
  // 열이 둘 이상인데 모든 항목의 상단이 줄 단위로 겹치지 않으면(줄마다 항목 수가 열 수보다 적다) 벽돌처럼 열별로 쌓인 것이다.
  const perRow = [...rows.values()];
  return widths.size === 1 || perRow.filter(n => n === widths.size).length >= Math.floor(items.length / widths.size);
}
/** 슬롯 이동 수: 인접한 두 폭 사이에 (열 순위, 행 순위, 항목 열 수)가 바뀐 슬롯 수. */
const moved = (a, b) => { const x = a.split(' '), y = b.split(' '); return x.length === y.length ? x.filter((t, i) => t !== y[i]).length : Math.max(x.length, y.length); };

export async function run({out = null, shots = true} = {}) {
  const env = createPlatform();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({deviceScaleFactor: 1});
  const page = await ctx.newPage();
  const layouts = env.registry.list('layout');
  const results = [];
  const wait = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const open = async html => { await page.setViewportSize({width: 1440, height: 900}); await page.setContent(html, {waitUntil: 'load'}); await wait(); };
  const standalone = (css, body, title) => `<!doctype html><html lang="ko" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}\nbody{margin:0;background:var(--kit-canvas);color:var(--kit-text)}.kit-lay-page{max-width:1280px;margin:0 auto}</style></head><body>${body}</body></html>`;
  for (const layout of layouts) {
    const entry = {id: layout.id, slug: layout.id.slice('layout:'.length), needsBand: layout.needsBand, variants: {}};
    for (const stress of [false, true]) {
      const fills = layoutSpecimen(env, layout, {stress});
      const r = assembleLayout(env, {layout: layout.id, fills});
      const name = stress ? 'stress' : 'specimen';
      if (!r.ok) { entry.variants[name] = {ok: false, diagnostics: r.diagnostics.map(d => `${d.code}: ${d.message}`)}; continue; }
      await open(standalone(r.value.css, r.value.html, layout.id));
      const perWidth = {};
      for (const width of ALL_WIDTHS) {
        // 배치 측정은 문서 전체가 들어가는 높이에서 한다: 아래에 붙는(sticky) 슬롯이 뷰포트 아래쪽으로 끌려와 다른 슬롯과 겹쳐 보이지 않게 한다.
        await page.setViewportSize({width, height: 6000}); await wait();
        const m = await page.evaluate(measureInPage);
        await page.setViewportSize({width, height: 900}); await wait();
        const sticky = await page.evaluate(stickyInPage, m.slots.filter(s => s.position === 'sticky').map(s => ({slot: s.slot, top: s.top + (m.rootTop ?? 0)})));
        perWidth[width] = {band: LAYOUT_BAND_NAMES[bandOf(m.containerWidth)], containerWidth: m.containerWidth, docOverflow: m.docOverflow, bodyOverflow: m.bodyOverflow, outsideCount: m.outsideCount, outside: m.outside,
          overlaps: m.overlaps.filter(o => !pulled(layout, bandOf(m.containerWidth)).has(o.a) && !pulled(layout, bandOf(m.containerWidth)).has(o.b)), declaredOverlaps: m.overlaps.length - m.overlaps.filter(o => !pulled(layout, bandOf(m.containerWidth)).has(o.a) && !pulled(layout, bandOf(m.containerWidth)).has(o.b)).length, sticky, signature: signatureOf(m), slots: m.slots.map(s => ({slot: s.slot, x: +(s.left / m.containerWidth).toFixed(3), y: Math.round(s.top), w: +(s.width / m.containerWidth).toFixed(3), h: Math.round(s.height), count: s.count, itemColumns: new Set(s.items.map(i => Math.round(i.left / 6))).size, position: s.position, scrollable: s.scrollable}))};
      }
      entry.variants[name] = {ok: true, fills: fills.length, layoutHash: layoutFingerprint(env, layout), outputHash: sha(r.value.html + r.value.css), htmlBytes: r.value.html.length, cssBytes: r.value.css.length, widths: perWidth};
      if (!stress && shots && out) {
        const width = REPRESENTATIVE[layout.needsBand];
        await page.setViewportSize({width, height: 900}); await wait();
        await page.screenshot({path: `${out}/${entry.slug}.png`, fullPage: true});
        entry.screenshot = {file: `${entry.slug}.png`, width, reason: `핵심 배치 구간 ${layout.needsBand}(컨테이너 ${LAYOUT_BANDS[LAYOUT_BAND_NAMES.indexOf(layout.needsBand)]}px 이상)에 처음 들어가는 뷰포트`};
      }
    }
    results.push(entry);
  }
  await browser.close();
  return {results, layouts: layouts.length};
}

/** 쌍별 비교: 폭 4개의 서명이 서로 다른 폭의 수. 이름 없는 서명이라 슬롯 이름만 다른 같은 배치는 0이다. */
export function pairwise(results) {
  const pairs = [];
  for (let i = 0; i < results.length; i++) for (let j = i + 1; j < results.length; j++) {
    const a = results[i].variants.specimen.widths, b = results[j].variants.specimen.widths;
    const differing = MAIN_WIDTHS.filter(w => a[w].signature !== b[w].signature);
    pairs.push({a: results[i].slug, b: results[j].slug, differingWidths: differing});
  }
  return pairs;
}

/** 레이아웃마다 폭이 바뀔 때 슬롯이 자리를 옮기는지: 인접한 주 폭 쌍에서 서명이 달라진 횟수와 이동한 슬롯 수. */
export function reflowOf(entry) {
  const w = entry.variants.specimen.widths, steps = [];
  for (let i = 1; i < MAIN_WIDTHS.length; i++) { const a = w[MAIN_WIDTHS[i - 1]].signature, b = w[MAIN_WIDTHS[i]].signature; steps.push({from: MAIN_WIDTHS[i - 1], to: MAIN_WIDTHS[i], changed: a !== b, movedSlots: a === b ? 0 : moved(a, b)}); }
  return {steps, changes: steps.filter(s => s.changed).length, distinctArrangements: new Set(MAIN_WIDTHS.map(x => w[x].signature)).size};
}

export function summarize({results}) {
  const pairs = pairwise(results);
  const rows = results.map(e => {
    const sv = e.variants.specimen, tv = e.variants.stress;
    const maxOverflow = Math.max(...[sv, tv].flatMap(v => v.ok ? ALL_WIDTHS.map(x => Math.max(v.widths[x].docOverflow, v.widths[x].bodyOverflow)) : [Infinity]));
    const outside = [sv, tv].flatMap(v => (v.ok ? ALL_WIDTHS.map(x => v.widths[x].outsideCount) : [Infinity])).reduce((a, b) => a + b, 0);
    const overlaps = ALL_WIDTHS.flatMap(x => sv.widths[x].overlaps).length;
    return {slug: e.slug, ok: sv.ok && tv.ok, maxOverflow, outside, overlaps, ...reflowOf(e)};
  });
  const minDistance = Math.min(...pairs.map(p => p.differingWidths.length));
  return {rows, pairs, minDistance, weakPairs: pairs.filter(p => p.differingWidths.length < 2)};
}

const md = (data, sum) => {
  const lines = ['# 레이아웃 24종 브라우저 실측', '', '> `node scripts/layouts/measure.mjs`가 생성한다(Chromium, 뷰포트 ' + ALL_WIDTHS.join('·') + 'px). 손으로 고치지 않는다.', '',
    '가로 스크롤은 표본과 긴 콘텐츠 표본에서 문서 `scrollWidth - 뷰포트`와 스크롤 영역 밖 요소의 오른쪽 이탈을 센다. 슬롯 위치 서명은 열·행 순위와 폭 비율이라 단순 축소는 같은 서명이다.', '',
    `- 레이아웃 ${data.layouts}종 × 폭 ${ALL_WIDTHS.length}개 × 표본 2종 측정, 가로 스크롤 최대 ${Math.max(...sum.rows.map(r => r.maxOverflow))}px, 스크롤 영역 밖 이탈 요소 ${sum.rows.reduce((a, r) => a + r.outside, 0)}개`,
    `- 쌍별 비교 ${sum.pairs.length}쌍: 폭 4개 중 서명이 다른 폭의 최소 ${sum.minDistance}개, 2개 미만인 쌍 ${sum.weakPairs.length}개`, '',
    '| 레이아웃 | 가로 스크롤(px) | 이탈 요소 | 구간 | 인접 폭 재배치(320→768→1024→1440) | 서로 다른 배치 수 | 대표 폭 |', '|---|---|---|---|---|---|---|'];
  for (const r of sum.rows) {
    const e = data.results.find(x => x.slug === r.slug), w = e.variants.specimen.widths;
    lines.push(`| ${r.slug} | ${r.maxOverflow} | ${r.outside} | ${MAIN_WIDTHS.map(x => w[x].band).join('→')} | ${r.steps.map(s => (s.changed ? `이동 ${s.movedSlots}` : '같음')).join(' · ')} | ${r.distinctArrangements} | ${e.screenshot?.width ?? '-'}px |`);
  }
  lines.push('', '## 쌍별 구분(서명이 다른 폭 수가 적은 쌍 15개)', '', '| 레이아웃 A | 레이아웃 B | 다른 폭 |', '|---|---|---|');
  for (const p of [...sum.pairs].sort((x, y) => x.differingWidths.length - y.differingWidths.length || x.a.localeCompare(y.a)).slice(0, 15)) lines.push(`| ${p.a} | ${p.b} | ${p.differingWidths.length} (${p.differingWidths.join('·')}) |`);
  return lines.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const out = arg('--out') ?? 'docs/dev/catalog-platform-upgrade/screens/layouts';
  mkdirSync(out, {recursive: true});
  const data = await run({out, shots: !args.includes('--no-shots')});
  const sum = summarize(data);
  writeFileSync(`${out}/measurements.json`, JSON.stringify({widths: ALL_WIDTHS, mainWidths: MAIN_WIDTHS, layouts: data.layouts, results: data.results, summary: {minPairDistance: sum.minDistance, weakPairs: sum.weakPairs, rows: sum.rows}}, null, 1) + '\n');
  writeFileSync(`${out}/measurements.md`, md(data, sum));
  for (const r of sum.rows) console.log(`${r.slug.padEnd(24)} overflow ${String(r.maxOverflow).padStart(3)} outside ${String(r.outside).padStart(2)} overlaps ${r.overlaps} reflow ${r.steps.map(s => (s.changed ? 'M' + s.movedSlots : '-')).join('/')} arrangements ${r.distinctArrangements}`);
  console.log(`pairs ${sum.pairs.length} minDistance ${sum.minDistance} weak ${sum.weakPairs.length}`);
  for (const p of sum.weakPairs) console.log(`  weak: ${p.a} ~ ${p.b} (${p.differingWidths.join(',') || 'none'})`);
}
