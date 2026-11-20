// 진단 문서의 결함마다 붙은 "측정 가능한 조건"을 실제 브라우저에서 잰다(2026-11-21 품질 진단).
// 각 청구(claim)는 ① 대상(표본 키 또는 조합 id)과 폭, ② 페이지 안에서 값을 재는 함수(또는 Blueprint 값을 재는 함수), ③ 통과 조건(test)으로 이뤄진다.
// 개선 전 코드에서는 대상 표본이 pass:false여야 하고(진단이 사실임), 개선 후에는 pass:true가 되어야 한다. 이 파일의 조건이 곧 재현 테스트의 초안이다.
// 사용: node scripts/design-qa/quality-claims.mjs [--phase before|after] [--only Q01,Q02]
// 산출: docs/evidence/quality-2026-11-21/claims-<phase>.json
import {chromium} from '@playwright/test';
import {writeFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {findCombo, renderCombo, comboBlueprint} from '../../src/combos.mjs';
import {CATALOG_VERSION} from '../../src/catalog.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const phase = opt('--phase', 'before'), only = opt('--only', null)?.split(',');
const base = resolve(import.meta.dirname, '../../docs/evidence/quality-2026-11-21');
const samples = Object.fromEntries(JSON.parse(readFileSync(resolve(base, 'samples.json'), 'utf8')).samples.map(s => [s.key, s]));

// ---- 페이지 안에서 도는 측정 함수(직렬화되므로 외부 값을 쓰지 않는다) ----
const heroFacts = () => {
  const d = document.querySelector('.kit-hero-facts'); if (!d) return null;
  const cols = getComputedStyle(d).gridTemplateColumns.split(' ').length, n = d.children.length;
  return {items: n, cols, orphan: n >= 3 && cols >= 2 && n % cols === 1};
};
const menuRows = () => {
  const rows = [...document.querySelectorAll('.kit-menu-row')]; if (!rows.length) return null;
  const vw = document.documentElement.clientWidth;
  return {rows: rows.length, maxOverflow: Math.max(...rows.map(r => r.scrollWidth - r.clientWidth)), maxRight: Math.round(Math.max(...[...document.querySelectorAll('.kit-menu-price')].map(p => p.getBoundingClientRect().right))), vw};
};
const menuGrid = () => {
  const out = [...document.querySelectorAll('.kit-menu ul')].map(u => { const cols = getComputedStyle(u).gridTemplateColumns.split(' ').filter(x => x !== 'none').length, n = u.children.length; return {items: n, cols, orphan: cols >= 2 && n > cols && n % cols === 1}; });
  return out.length ? {lists: out, orphan: out.some(x => x.orphan)} : null;
};
const chartStretch = () => {
  const cards = [...document.querySelectorAll('.kit-grid > *')].filter(c => c.matches('figure.kit-chart') || c.querySelector('figure.kit-chart')); if (cards.length < 2) return null;
  const rows = cards.map(c => { const r = c.getBoundingClientRect(); const kids = [...c.querySelectorAll('*')].filter(k => (k.tagName === 'svg' || (k.children.length === 0 && !k.closest('svg'))) && !k.closest('details:not([open]),.kit-sr,[hidden]') && k.getBoundingClientRect().height > 1); const bottom = Math.max(...kids.map(k => k.getBoundingClientRect().bottom)); return {h: Math.round(r.height), emptyBelow: Math.round(r.bottom - bottom)}; });
  const worst = rows.reduce((a, b) => b.emptyBelow > a.emptyBelow ? b : a);
  return {cards: rows.length, worstEmpty: worst.emptyBelow, worstRatio: Math.round(worst.emptyBelow / worst.h * 100) / 100};
};
const emptyTitle = () => {
  const h = document.querySelector('.kit-empty h2'); if (!h) return null;
  const r = h.getBoundingClientRect(), lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.2;
  return {px: parseFloat(getComputedStyle(h).fontSize), lines: Math.round(r.height / lh), colWidth: Math.round(r.width)};
};
const heroEmptyRight = () => {
  const h = document.querySelector('.kit-hero'); if (!h) return null;
  const copy = h.querySelector('.kit-hero-copy'), cr = copy.getBoundingClientRect();
  let right = cr.left; const w = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) { if (!t.textContent.trim()) continue; const range = document.createRange(); range.selectNodeContents(t); for (const r of range.getClientRects()) if (r.width > 1) right = Math.max(right, r.right); }
  const hv = !!h.querySelector('.kit-hero-visual'), region = document.querySelector('.kit-main').getBoundingClientRect();
  return {variant: h.dataset.variant, visual: hv, titlePx: parseFloat(getComputedStyle(h.querySelector('h1,h2')).fontSize), textRight: Math.round(right), mainWidth: Math.round(region.width), emptyRightRatio: Math.round((1 - (right - region.left) / region.width) * 100) / 100};
};
const bentoEmpty = () => {
  const b = document.querySelector('.kit-bento'); if (!b) return null;
  const cells = [...b.children].map(c => { const r = c.getBoundingClientRect(); const kids = [...c.querySelectorAll('*')].filter(k => k.children.length === 0 && k.getBoundingClientRect().height > 2); if (!kids.length) return null; const top = Math.min(...kids.map(k => k.getBoundingClientRect().top)), bot = Math.max(...kids.map(k => k.getBoundingClientRect().bottom)); return {h: Math.round(r.height), w: Math.round(r.width), empty: Math.round((1 - (bot - top) / r.height) * 100) / 100}; }).filter(Boolean);
  const small = cells.filter(c => c.h <= 400);
  return {cols: getComputedStyle(b).gridTemplateColumns.split(' ').length, cells: cells.length, smallCells: small.length, worstEmpty: Math.max(...small.map(c => c.empty), 0), meanEmpty: Math.round(small.reduce((s, c) => s + c.empty, 0) / (small.length || 1) * 100) / 100};
};
const chartDomain = () => {
  const fig = [...document.querySelectorAll('figure.kit-chart')].find(f => f.querySelector('rect.ch-bar') && f.getBoundingClientRect().width > 1000); if (!fig) return null;
  const svg = fig.querySelector('.kit-chart-plot svg'), vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
  const labels = [...fig.querySelectorAll('text')].map(t => parseFloat(t.textContent)).filter(x => !Number.isNaN(x));
  const ticks = labels.slice(0, 5), values = labels.slice(5);
  return {aspectDistortion: Math.round((r.width / r.height) / (vb.width / vb.height) * 100) / 100, axisMax: Math.max(...ticks), dataMax: Math.max(...values), fill: Math.round(Math.max(...values) / Math.max(...ticks) * 100) / 100};
};
const formOrphan = () => {
  const f = document.querySelector('.kit-form-fields'); if (!f) return null;
  const cols = getComputedStyle(f).gridTemplateColumns.split(' ').length, fw = f.getBoundingClientRect().width;
  const rows = {}; for (const c of f.children) { const r = c.getBoundingClientRect(); (rows[Math.round(r.top / 10)] ??= []).push(r.width / fw); }
  const lone = Object.values(rows).filter(r => cols > 1 && r.length === 1 && r[0] < 0.6).length;
  return {cols, rows: Object.keys(rows).length, loneHalfRows: lone};
};
const deadBand = () => {
  const f = document.querySelector('.kit-hero-facts'), hero = document.querySelector('.kit-hero'); if (!f || !hero) return null;
  const next = hero.nextElementSibling, head = next?.querySelector('h2,h3'); if (!head) return null;
  return {factsToNextHeading: Math.round(head.getBoundingClientRect().top - f.getBoundingClientRect().bottom)};
};
const kpiGrid = () => {
  const g = [...document.querySelectorAll('.kit-grid')].find(x => x.children.length >= 3 && [...x.children].every(c => c.dataset.designKind === 'metric')); if (!g) return null;
  const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length, cell = g.children[0].getBoundingClientRect();
  const chart = document.querySelector('figure.kit-chart'), rows = new Set([...g.children].map(c => Math.round(c.getBoundingClientRect().top))).size;
  return {items: g.children.length, cols, rows, cellW: Math.round(cell.width), firstChartTop: chart ? Math.round(chart.getBoundingClientRect().top + scrollY) : null, docH: document.documentElement.scrollHeight};
};
const alignSplit = () => {
  const al = el => { const a = getComputedStyle(el).textAlign; return a === 'left' || a === 'start' ? 'start' : a; };
  const secs = [...document.querySelectorAll('main .kit-section')].filter(s => !s.parentElement.closest('.kit-section')).map(s => {
    const head = s.querySelector('.kit-section-head h2, h2'); if (!head) return null;
    const body = [...s.querySelectorAll('p, li, dt, h3, h4')].find(e => !e.closest('.kit-section-head') && e.textContent.trim().length > 8 && e.getBoundingClientRect().width > 0);
    return head && body ? {head: al(head), body: al(body)} : null;
  }).filter(Boolean);
  const ph = document.querySelector('.kit-page-header'), main = document.querySelector('main');
  const intro = ph && getComputedStyle(ph).display !== 'none' && ph.getBoundingClientRect().height > 4 ? (() => { const t = ph.querySelector('h1'), b = [...main.querySelectorAll('.kit-prose p, .kit-section p, p')].find(e => !ph.contains(e) && e.textContent.trim().length > 20); return t && b ? {head: al(t), body: al(b)} : null; })() : null;
  const all = [...secs, ...(intro ? [intro] : [])];
  return {pairs: all.length, mismatched: all.filter(x => x.head !== x.body).length, sections: secs.filter(x => x.head !== x.body).length, intro: intro ? intro.head !== intro.body : null};
};
const artDup = () => {
  const norm = s => s.innerHTML.replace(/id="[^"]*"/g, '').replace(/url\(#[^)]*\)/g, '').replace(/href="#[^"]*"/g, '');
  const arts = [...document.querySelectorAll('svg.kit-art')].filter(s => s.getBoundingClientRect().width > 200 && s.getBoundingClientRect().height > 120);
  const groups = {}; for (const s of arts) (groups[norm(s)] ??= []).push(s.closest('.kit-hero') ? 'hero' : s.closest('.kit-bento') ? 'bento' : 'other');
  const dup = Object.values(groups).filter(g => g.length > 1);
  return {largeArts: arts.length, duplicateGroups: dup.length, places: dup.flat()};
};
const themeShape = () => {
  const h = document.querySelector('.kit-hero'), sh = document.querySelector('.kit-shell'), b = document.querySelector('.kit-bento');
  return {shell: sh.dataset.shell, mainWidth: Math.round(document.querySelector('.kit-main').getBoundingClientRect().width), heroTitlePx: h ? parseFloat(getComputedStyle(h.querySelector('h1,h2')).fontSize) : null, heroLines: h ? Math.round(h.querySelector('h1,h2').getBoundingClientRect().height / (parseFloat(getComputedStyle(h.querySelector('h1,h2')).lineHeight) || 1)) : null, bentoCols: b ? getComputedStyle(b).gridTemplateColumns.split(' ').length : null, docH: document.documentElement.scrollHeight};
};
const tabBar = () => {
  const t = document.querySelector('.kit-tablist'); if (!t) return null;
  const last = t.lastElementChild.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  return {scrollable: t.scrollWidth > t.clientWidth, lastRight: Math.round(last.right), vw, cutOffByViewport: last.right > vw - 8 && t.scrollWidth <= t.clientWidth + 8};
};

// ---- Blueprint 수준 측정 ----
const walk = (nodes, fn) => { for (const n of nodes ?? []) { fn(n); walk(n.children, fn); } };
const heroOf = b => { let h = null; walk(b.tree.children ?? [], n => { if (n.type === 'hero') h = n; }); return h; };
const heroVisual = b => { const h = heroOf(b); return h ? {variant: h.variant, visual: h.visual ?? null, motif: h.motif ?? null} : null; };
const cardStyles = b => { const c = {}; walk(b.tree.children ?? [], n => { if (n.type === 'card') { const v = n.variant ?? 'basic'; c[v] = (c[v] ?? 0) + 1; } }); return c; };

const FACT_FAMILY = ['agency-home', 'wedding-invite', 'game-launch', 'luxury-brand', 'campaign-poster', 'hanji-journey', 'museum-home', 'campaign-donate', 'waitlist'];
/** 청구 목록. id는 docs/quality-diagnosis-2026-11-21.md의 측정 조건 번호와 같다. */
export const CLAIMS = [
  {id: 'Q01', what: '히어로 수치(dl.kit-hero-facts)가 3개 이상일 때 마지막 줄에 한 칸만 남지 않는다', fn: heroFacts, targets: [{sample: 'S07', widths: [320, 390, 768, 1440]}, ...FACT_FAMILY.slice(1).map(id => ({combo: id, widths: [320]}))], test: v => v === null || !v.orphan},
  {id: 'Q02', what: '메뉴 줄(.kit-menu-row)은 가로로 넘치지 않는다(scrollWidth ≤ clientWidth)', fn: menuRows, targets: [{sample: 'S23', widths: [320, 390]}], test: v => v === null || v.maxOverflow <= 1},
  {id: 'Q03', what: '메뉴 목록 격자는 3개를 2열에 놓아 마지막 줄을 비우지 않는다', fn: menuGrid, targets: [{sample: 'S23', widths: [768, 1440]}], test: v => v === null || !v.orphan},
  {id: 'Q04', what: '같은 격자 안 차트 카드의 아래 빈 공간이 96px 미만이거나 상자 높이의 38% 미만', fn: chartStretch, targets: [{sample: 'S12', widths: [768, 1440]}], test: v => v === null || v.worstEmpty < 96 || v.worstRatio < 0.38},
  {id: 'Q05', what: '상태 화면 제목(.kit-empty h2)은 320px에서 2줄 이하', fn: emptyTitle, targets: [{sample: 'S27', widths: [320, 390]}], test: v => v === null || v.lines <= 2},
  {id: 'Q06', what: '시각 요소가 없는 split 히어로의 글줄 오른쪽 빈 영역이 콘텐츠 폭의 45% 미만', fn: heroEmptyRight, targets: [{sample: 'S05', widths: [1440]}, {sample: 'S33', widths: [1440]}, {sample: 'S01', widths: [1440]}], test: v => v === null || v.visual || v.emptyRightRatio < 0.45},
  {id: 'Q07', what: '벤토의 낮은 칸(높이 400px 이하) 중 내용 비율 40% 미만(빈 비율 60% 초과)인 칸이 없다', fn: bentoEmpty, targets: [{sample: 'S06', widths: [1440]}, {sample: 'S01', widths: [1440]}], test: v => v === null || v.worstEmpty <= 0.6},
  {id: 'Q08', what: '막대 차트의 데이터 최댓값이 축 최댓값의 60% 이상이고 SVG 가로세로 왜곡이 1.5배 이하', fn: chartDomain, targets: [{sample: 'S15', widths: [1440]}], test: v => v === null || (v.fill >= 0.6 && v.aspectDistortion <= 1.5)},
  {id: 'Q09', what: '폼 필드 격자에서 반폭 필드 혼자 한 줄을 차지하는 행이 없다', fn: formOrphan, targets: [{sample: 'S17', widths: [1440]}], test: v => v === null || v.loneHalfRows === 0},
  {id: 'Q10', what: '히어로 수치 아래 다음 섹션 제목까지의 죽은 간격이 160px 이하', fn: deadBand, targets: [{sample: 'S07', widths: [320, 768, 1440]}], test: v => v === null || v.factsToNextHeading <= 160},
  {id: 'Q11', what: 'KPI가 4개 이하이고 콘텐츠 폭이 1100px 이상이면 KPI 격자는 한 줄(rows=1)이다(열 수 변형이 핵심 지표를 아래로 밀지 않는다)', fn: kpiGrid, targets: [{sample: 'S10', widths: [1440]}, {sample: 'S11', widths: [1440]}], test: v => v === null || v.items > 4 || v.rows === 1},
  {id: 'Q12', what: '섹션·머리말의 정렬 축이 하나(머리말 정렬 ≠ 본문 정렬인 쌍이 0)', fn: alignSplit, targets: [{sample: 'S01', widths: [1440]}, {sample: 'S30', widths: [1440]}, {sample: 'S32', widths: [1440]}, {sample: 'S34', widths: [1440]}, {sample: 'S09', widths: [1440]}], test: v => v === null || v.mismatched === 0},
  {id: 'Q13', what: '한 페이지에 같은 큰 일러스트(200×120px 이상)가 두 번 나오지 않는다', fn: artDup, targets: [{sample: 'S01', widths: [1440, 390]}, {sample: 'S06', widths: [1440]}], test: v => v === null || v.duplicateGroups === 0},
  {id: 'Q14', what: '같은 Blueprint의 히어로 변형 전환 후에도 제품 시각 요소(visual)가 유지된다', node: heroVisual, targets: [{sample: 'S01'}, {sample: 'S02'}, {sample: 'S03'}], test: (v, ctx) => v === null || v.visual === ctx.baseline?.visual || ctx.isBaseline},
  {id: 'Q15', what: '카드 스타일 일괄 변경이 페이지 카드의 75% 이상을 실제로 바꾼다(바뀐 카드 수 / 전체 카드 수)', node: cardStyles, targets: [{sample: 'S01'}, {sample: 'S04'}], test: (v, ctx) => { if (ctx.isBaseline) return true; const total = Object.values(v).reduce((a, b) => a + b, 0), same = Object.keys(v).reduce((n, k) => n + Math.min(v[k], ctx.baseline?.[k] ?? 0), 0); return (total - same) / total >= 0.75; }},
  {id: 'Q16', what: '같은 템플릿을 다른 테마로 바꿔도 히어로 제목이 같은 줄 수·내비 셸이 유지된다(또는 변화가 의도된 축으로 기록된다)', fn: themeShape, targets: [{sample: 'S01', widths: [1440]}, {sample: 'S08', widths: [1440]}, {sample: 'S09', widths: [1440]}, {sample: 'S10', widths: [1440]}, {sample: 'S13', widths: [1440]}], test: () => null, informational: true},
  {id: 'Q17', what: '탭 목록의 마지막 탭이 가로 스크롤 없이 화면 가장자리에 8px 이내로 잘리지 않는다(EDGE 오탐 대조용)', fn: tabBar, targets: [{sample: 'S21', widths: [320]}, {sample: 'S20', widths: [320]}], test: v => v === null || !v.cutOffByViewport},
];

// 이 파일은 e2e/layout-common.spec.mjs가 CLAIMS를 가져다 쓰므로, 직접 실행할 때만 브라우저를 띄운다.
const main = async () => {
  const br = await chromium.launch();
  const out = {meta: {phase, date: new Date().toISOString().slice(0, 10), catalogVersion: CATALOG_VERSION, browser: 'chromium ' + br.version()}, claims: {}};
  for (const claim of CLAIMS.filter(c => !only || only.includes(c.id))) {
    const rec = out.claims[claim.id] = {what: claim.what, results: []};
    for (const t of claim.targets) {
      const s = t.sample ? samples[t.sample] : {combo: t.combo, view: {}};
      const combo = findCombo(s.combo); if (!combo) { rec.results.push({target: t.sample ?? t.combo, error: 'no combo'}); continue; }
      const label = t.sample ?? t.combo;
      if (claim.node) {
        const v = claim.node(comboBlueprint(combo, s.view));
        const baseKey = s.pair ?? null;
        const baseline = baseKey ? claim.node(comboBlueprint(findCombo(samples[baseKey].combo), samples[baseKey].view)) : null;
        rec.results.push({target: label, combo: s.combo, values: v, baseline, pass: claim.test(v, {baseline, isBaseline: !baseKey})});
        continue;
      }
      const r = renderCombo(combo, s.view); if (!r.ok) { rec.results.push({target: label, error: r.error}); continue; }
      for (const w of t.widths) {
        const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
        await page.setContent(r.html, {waitUntil: 'load'});
        const v = await page.evaluate(claim.fn);
        rec.results.push({target: label, combo: s.combo, width: w, values: v, pass: claim.test(v)});
        await ctx.close();
      }
    }
  }
  await br.close();
  writeFileSync(resolve(base, `claims-${phase}.json`), JSON.stringify(out, null, 1));
  for (const [id, c] of Object.entries(out.claims)) console.log(id, c.results.map(r => `${r.target}${r.width ? '@' + r.width : ''}:${r.pass === undefined ? 'err' : r.pass}`).join(' '));
};
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
