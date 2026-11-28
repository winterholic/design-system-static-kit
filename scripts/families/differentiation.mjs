/**
 * 시각 패밀리 쌍별 차별화 측정(REQUEST §7 마지막 문단, §12.3).
 *   node scripts/families/differentiation.mjs [--json out.json] [--md out.md] [--min 8]
 * 같은 컴포넌트 묶음(버튼·카드·입력·내비게이션·표·피드백)을 12개 시각 패밀리로 같은 조립 경로(assembleFamilies)에서 렌더하고,
 * Chromium의 computed style에서 색 속성을 뺀 값(모서리·테두리·그림자·표면 투명도·간격·크기·글자 형태·모션·아이콘 선·상태)을 요소 단위로 견준다.
 * 색 자체(color, background-color의 RGB, border-color, outline-color, box-shadow의 색)는 어느 패밀리에서도 같은 토큰이므로 세지 않는다.
 * 요소는 같은 항목(purpose)의 DOM 순서로 짝짓는다. 한 패밀리가 항목을 거부해 빠지면 그 항목은 짝에서 뺀다(excluded로 보고).
 */
import {writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {makeEnv, VISUALS} from './pages.mjs'; // pages.mjs가 platform/index.mjs를 먼저 불러야 순환 import가 풀린다
import {assembleFamilies, checkPurposeCombination, getPurposeFamily} from '../../src/platform/families/index.mjs';

/** 장면 = 같은 컴포넌트를 12개 패밀리로 그리는 한 묶음. 항목은 패밀리마다 같은 콘텐츠·변형이다. */
export const SCENES = {
  button: {context: 'dashboard', items: [
    {purpose: 'purpose:button.primary', variant: {layout: 'pair', align: 'start'}, content: {label: '저장', secondaryLabel: '취소'}},
    {purpose: 'purpose:button.secondary', variant: {layout: 'row', tier: 'secondary'}, content: {items: [{label: '내보내기', icon: 'arrow-right'}, {label: '공유'}]}},
  ]},
  card: {context: 'dashboard', items: [
    {purpose: 'purpose:card.kpi', variant: {layout: 'stacked', trend: 'none'}, content: {label: '월 매출', value: '1,284만', unit: '원', delta: '+12%', deltaDirection: 'up', caption: '전월 대비'}},
    {purpose: 'purpose:card.profile'}, {purpose: 'purpose:card.status'},
  ]},
  'card-listing': {context: 'listing', items: [
    {purpose: 'purpose:card.product', variant: {layout: 'vertical', cta: 'button'}, props: {behavior: 'static'}, content: {title: '텀블러', price: '₩24,000', mediaIcon: 'coffee', ctaLabel: '담기'}},
  ]},
  input: {context: 'dashboard', items: [{purpose: 'purpose:form.search'}, {purpose: 'purpose:form.filter'}, {purpose: 'purpose:form.auth'}]},
  navigation: {context: 'dashboard', items: [{purpose: 'purpose:navigation.tabs'}, {purpose: 'purpose:navigation.topbar'}]},
  table: {context: 'dashboard', items: [{purpose: 'purpose:table.business'}]},
  feedback: {context: 'dashboard', items: [{purpose: 'purpose:feedback.confirm'}, {purpose: 'purpose:feedback.error'}]},
};

/** 속성 묶음. 한 묶음에서 하나라도 다르면 그 묶음이 다른 것이다. 색 속성은 어디에도 없다. */
export const CATEGORIES = {
  shape: ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
  border: ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-bottom-style', 'border-left-style', 'outline-width', 'outline-style', 'outline-offset'],
  shadow: ['box-shadow'],
  surface: ['bg-alpha', 'bg-image', 'backdrop-filter', 'opacity'],
  space: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'row-gap', 'column-gap'],
  size: ['height', 'width'],
  type: ['font-size', 'font-weight', 'letter-spacing', 'text-transform', 'line-height', 'font-style', 'text-decoration-line', 'text-align'],
  motion: ['transition-duration', 'transition-property'],
  icon: ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'icon-fill'],
  layout: ['display', 'flex-direction', 'justify-content', 'align-items', 'position', 'border-collapse'],
};
const CAT_OF = Object.fromEntries(Object.entries(CATEGORIES).flatMap(([c, ps]) => ps.map(p => [p, c])));

/** 브라우저 안에서 도는 함수. 외부 이름을 쓰지 않는다. */
function snapshotInPage({props, stateProbe}) {
  const alpha = v => { const m = /rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/.exec(v); if (!m) return v === 'transparent' ? '0' : '1'; const parts = (m[1] ?? m[2]).split(/[\s,/]+/).filter(Boolean); const a = parts.length === 4 ? parts[3] : '1'; return String(Math.round(parseFloat(a) * 100) / 100); };
  const stripColor = v => v.replace(/rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8}\b/gi, 'C');
  const out = {};
  for (const root of document.querySelectorAll('.pf[data-purpose]')) {
    const list = [];
    const all = [root, ...root.querySelectorAll('*')].filter(el => !['SCRIPT', 'STYLE', 'PATH', 'CIRCLE', 'LINE', 'RECT', 'POLYLINE', 'G'].includes(el.tagName.toUpperCase()));
    for (const el of all) {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (cs.display === 'none') continue;
      const rec = {k: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : ''}`};
      for (const p of props) {
        if (p === 'bg-alpha') rec[p] = alpha(cs.backgroundColor);
        else if (p === 'bg-image') rec[p] = cs.backgroundImage === 'none' ? 'none' : stripColor(cs.backgroundImage);
        else if (p === 'height') rec[p] = String(Math.round(r.height * 2) / 2);
        else if (p === 'width') rec[p] = el.tagName.toLowerCase() === 'svg' ? String(Math.round(r.width * 2) / 2) : '';
        else if (p === 'box-shadow') rec[p] = stripColor(cs.boxShadow);
        else if (p === 'stroke-width' || p === 'stroke-linecap' || p === 'stroke-linejoin' || p === 'icon-fill') rec[p] = '';
        else rec[p] = cs.getPropertyValue(p);
      }
      if (el.tagName.toLowerCase() === 'svg') {
        const path = el.querySelector('path');
        if (path) { const pc = getComputedStyle(path); rec['stroke-width'] = pc.strokeWidth; rec['stroke-linecap'] = pc.strokeLinecap; rec['stroke-linejoin'] = pc.strokeLinejoin; rec['icon-fill'] = path.classList.contains('c') ? alpha(pc.fill) : 'none'; }
      }
      list.push(rec);
    }
    out[root.dataset.purpose + '#' + [...document.querySelectorAll('.pf[data-purpose]')].filter(n => n.dataset.purpose === root.dataset.purpose).indexOf(root)] = list;
  }
  return out;
}

/** 상태 표현: 첫 버튼/링크에 hover·focus를 주고 transform·그림자·윤곽선을 읽는다(색 제외). */
async function stateProbe(page) {
  const sel = 'button, a[href], [role=tab]';
  const el = page.locator(`.pf ${sel}`).first();
  if (!(await el.count())) return null;
  const read = () => el.evaluate(n => { const cs = getComputedStyle(n); const strip = v => v.replace(/rgba?\([^)]*\)|color\([^)]*\)/g, 'C'); return {transform: cs.transform, 'box-shadow': strip(cs.boxShadow), 'outline-width': cs.outlineWidth, 'outline-style': cs.outlineStyle, 'outline-offset': cs.outlineOffset, 'transition-duration': cs.transitionDuration}; });
  await el.hover(); await page.waitForTimeout(450);
  const hover = await read();
  await page.mouse.move(0, 0); await el.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(450);
  const focus = await read();
  return {hover, focus};
}

export function sceneItems(env, scene, visual) {
  const excluded = [];
  const items = [];
  SCENES[scene].items.forEach((it, i) => {
    const fam = getPurposeFamily(it.purpose);
    if (!fam) { excluded.push(`${it.purpose}(unknown)`); return; }
    const example = {variant: it.variant ?? fam.example.variant, props: it.props ?? fam.example.props, content: it.content ?? fam.example.content};
    const ok = checkPurposeCombination(fam, {visual, ...example}).ok;
    if (!ok) { excluded.push(it.purpose); return; }
    items.push({id: `${it.purpose.slice('purpose:'.length).replace('.', '-')}-${i}`, purpose: it.purpose, visual, ...example});
  });
  return {items, excluded};
}

export function sceneHtml(env, scene, visual, {mode = 'light', density = 'comfortable'} = {}) {
  const {context} = SCENES[scene];
  const {items, excluded} = sceneItems(env, scene, visual);
  const r = assembleFamilies(env, {context, mode, density, items});
  if (!r.ok) throw new Error(`${scene}/${visual}: ${JSON.stringify(r.diagnostics.slice(0, 2))}`);
  const css = `${r.value.css}\nbody{margin:0;padding:12px}.kit-platform{grid-template-columns:minmax(0,1fr);align-items:start}.pf{padding:var(--kit-sp-near);border:1px dashed #0000}`;
  const html = `<!doctype html><html lang="ko" data-mode="${mode}"><head><meta charset="utf-8"><style>${css}</style></head><body><main>${r.value.html}</main></body></html>`;
  return {html, excluded, items};
}

export async function measureDifferentiation({width = 1280, scenes = Object.keys(SCENES)} = {}) {
  const env = makeEnv();
  const props = Object.values(CATEGORIES).flat();
  const browser = await chromium.launch();
  const data = {};
  const excluded = {};
  try {
    for (const scene of scenes) {
      data[scene] = {}; excluded[scene] = {};
      for (const v of VISUALS) {
        const {html, excluded: ex} = sceneHtml(env, scene, v);
        excluded[scene][v] = ex;
        const page = await browser.newPage({viewport: {width, height: 900}});
        await page.setContent(html, {waitUntil: 'load'});
        const snap = await page.evaluate(snapshotInPage, {props});
        const states = scene === 'button' || scene === 'navigation' ? await stateProbe(page) : null;
        data[scene][v] = {snap, states};
        await page.close();
      }
    }
  } finally { await browser.close(); }
  return {data, excluded};
}

/** 한 장면에서 두 패밀리의 차이: {cells, byCategory:{cat: 다른 (요소,속성) 칸 수}, props:Set} */
export function diffScene(a, b) {
  const byCategory = Object.fromEntries(Object.keys(CATEGORIES).map(c => [c, 0]));
  const propsDiffering = new Set();
  let cells = 0, structural = 0;
  for (const key of Object.keys(a.snap)) {
    if (!(key in b.snap)) continue;
    const la = a.snap[key], lb = b.snap[key];
    if (la.length !== lb.length) structural++;
    const n = Math.min(la.length, lb.length);
    for (let i = 0; i < n; i++) {
      for (const p of Object.keys(CAT_OF)) {
        if (la[i][p] !== lb[i][p]) { byCategory[CAT_OF[p]]++; propsDiffering.add(p); cells++; }
      }
    }
  }
  // 상태 표현(hover·focus)
  let stateCells = 0;
  if (a.states && b.states) for (const phase of ['hover', 'focus']) for (const p of Object.keys(a.states[phase])) if (a.states[phase][p] !== b.states[phase][p]) { stateCells++; propsDiffering.add(`${phase}:${p}`); }
  return {cells, stateCells, structural, byCategory, props: propsDiffering};
}

export function pairTable(result) {
  const rows = [];
  for (let i = 0; i < VISUALS.length; i++) for (let j = i + 1; j < VISUALS.length; j++) {
    const a = VISUALS[i], b = VISUALS[j];
    const perScene = {}; let cells = 0, stateCells = 0; const props = new Set(); const cats = new Set();
    for (const scene of Object.keys(result.data)) {
      const d = diffScene(result.data[scene][a], result.data[scene][b]);
      perScene[scene] = d.cells + d.stateCells; cells += d.cells; stateCells += d.stateCells;
      d.props.forEach(p => props.add(p));
      for (const [c, n] of Object.entries(d.byCategory)) if (n) cats.add(c);
    }
    rows.push({a: a.slice(7), b: b.slice(7), cells, stateCells, distinctProps: props.size, categories: cats.size, perScene, props: [...props].sort(), cats: [...cats]});
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
  const min = Number(arg('--min') ?? 0);
  const result = await measureDifferentiation();
  const rows = pairTable(result);
  const ranked = [...rows].sort((x, y) => x.distinctProps - y.distinctProps || x.cells - y.cells);
  const lines = ['| 쌍 | 다른 속성 종류 | 다른 묶음(10) | 다른 칸(요소×속성) | 상태 칸 | 장면별(button/card/card-listing/input/nav/table/feedback) |', '|---|---:|---:|---:|---:|---|'];
  for (const r of ranked) lines.push(`| ${r.a} × ${r.b} | ${r.distinctProps} | ${r.categories} | ${r.cells} | ${r.stateCells} | ${Object.values(r.perScene).join(' / ')} |`);
  const md = lines.join('\n');
  console.log(md);
  console.log(`\npairs=${rows.length} minDistinctProps=${ranked[0].distinctProps} (${ranked[0].a}×${ranked[0].b}) minCells=${Math.min(...rows.map(r => r.cells))}`);
  const exSummary = Object.entries(result.excluded).flatMap(([s, m]) => Object.entries(m).filter(([, e]) => e.length).map(([v, e]) => `${s}/${v.slice(7)}: ${e.join(',')}`));
  if (exSummary.length) console.log('excluded:', exSummary.join(' | '));
  if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify({rows, excluded: result.excluded}, null, 1));
  if (arg('--md')) writeFileSync(arg('--md'), md + '\n');
  if (min && ranked[0].distinctProps < min) { console.error(`FAIL: 가장 비슷한 쌍의 속성 종류 ${ranked[0].distinctProps} < ${min}`); process.exit(1); }
}
