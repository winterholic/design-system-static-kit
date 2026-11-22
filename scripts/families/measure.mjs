/**
 * 목적 패밀리 브라우저 측정과 스크린샷(컴포넌트 패밀리 작업 소유).
 *   node scripts/families/measure.mjs [--out docs/platform/evidence/families] [--shots] [--groups card,button] [--modes light,dark] [--json]
 * 기존 scripts/layout-quality(layoutProbe·settleLayout·applyExemptions)를 그대로 쓰고, 카드 높이 불균형·제목-본문 패딩·숫자 줄바꿈·버튼 크기 불일치를 더 잰다.
 * 폭 390(모바일)과 1280(데스크톱). 훑은 대상이 0이면 통과가 아니라 "대상 없음"으로 센다.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {layoutProbe} from '../layout-quality/probe.mjs';
import {mergeOptions, settleLayout, applyExemptions} from '../layout-quality/run.mjs';
import {buildPage, makeEnv, GROUPS, VISUALS, groupScenarios} from './pages.mjs';

export const WIDTHS = {mobile: 390, desktop: 1280};

/** 이 패밀리가 쓰는 클래스를 probe의 역할 선택자에 더한다(probe는 kit-* 클래스를 기본으로 안다). */
export const PROBE_OPTIONS = {selectors: {
  control: 'button,[role=button],[role=tab],.kit-ctl-button,.kit-ctl-tab,.kit-ctl-nav-link,.pf-bottom a',
  value: '.pf-num,.pf-kpi-value,.pf-price-now,.pf-plan-price',
  label: '.pf-label,.pf-eyebrow,.eyebrow,.caption,small',
  scroll: '[data-layout-scroll],.kit-table-scroll,.kit-tablist,pre,[tabindex="0"]',
}};

/** 면제는 사유를 적는다(applyExemptions가 사유 없는 면제를 던진다). 패밀리 코드의 결함을 가리는 면제는 두지 않는다. */
export const EXEMPTIONS = [];

/** 브라우저 안에서 도는 측정. 외부 이름을 쓰지 않는다. */
export function familyMetrics() {
  const px = v => Math.round(parseFloat(v) * 10) / 10;
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const out = {};
  // 문서가 화면보다 넓어지는가(표 스크롤 영역 안의 넘침은 제외한다)
  const root = document.documentElement;
  out.overflowX = root.scrollWidth - root.clientWidth;
  // 카드 높이 불균형: 같은 줄(top이 2px 안)의 카드끼리 높이 차
  const cards = [...document.querySelectorAll('.pf-card')].filter(vis).map(el => ({el, r: el.getBoundingClientRect()}));
  const rows = [];
  for (const c of cards) { const row = rows.find(x => Math.abs(x.top - c.r.top) <= 2); if (row) row.items.push(c); else rows.push({top: c.r.top, items: [c]}); }
  const rowSpread = rows.filter(x => x.items.length > 1).map(x => px(Math.max(...x.items.map(i => i.r.height)) - Math.min(...x.items.map(i => i.r.height))));
  out.cards = {count: cards.length, rows: rows.filter(x => x.items.length > 1).length, maxHeightSpread: rowSpread.length ? Math.max(...rowSpread) : 0};
  // 제목-본문 패딩: 카드 안쪽 상·좌 여백이 같고 8px 이상, 제목과 다음 요소 사이 간격이 2~32px
  const padIssues = [];
  for (const {el} of cards) {
    const cs = getComputedStyle(el), top = px(cs.paddingTop), left = px(cs.paddingLeft);
    if (Math.abs(top - left) > 1 || top < 8) padIssues.push({id: el.id, kind: 'inset', top, left});
    const title = el.querySelector('.kit-ctl-card-title');
    const next = title?.nextElementSibling, column = getComputedStyle(el.querySelector('.pf-card-body')).flexDirection === 'column';
    // 제목과 다음 요소가 가로로 놓이는 배치(상태 줄·요금제 이름 줄·inline)는 세로 간격이 없으므로 재지 않는다.
    if (title && next && vis(next) && column && next.getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 1) { const gap = px(next.getBoundingClientRect().top - title.getBoundingClientRect().bottom); if (gap < 2 || gap > 32) padIssues.push({id: el.id, kind: 'title-body-gap', gap}); }
  }
  out.padding = {checked: cards.length, issues: padIssues};
  // 숫자 줄바꿈: 값 요소가 한 줄인가
  const nums = [...document.querySelectorAll('.pf-num')].filter(vis);
  const wrapped = nums.filter(n => { const lh = px(getComputedStyle(n).lineHeight) || px(getComputedStyle(n).fontSize) * 1.3; return n.getClientRects().length > 1 || n.getBoundingClientRect().height > lh * 1.6; }).map(n => n.textContent.slice(0, 24));
  out.numbers = {checked: nums.length, wrapped};
  // 버튼 크기 불일치: 같은 묶음 안 버튼의 높이 차(아이콘만 버튼의 폭은 높이와 같아야 한다)
  const groups = new Map();
  for (const b of document.querySelectorAll('.kit-ctl-button')) { if (!vis(b)) continue; const host = b.closest('.pf-actions,.pf-iconbar,.pf-fb-actions,.kit-ctl-modal-footer,.pf-foot,.pf-bottom,form,.pf-topbar-actions') ?? b.parentElement; (groups.get(host) ?? groups.set(host, []).get(host)).push(b); }
  const mismatch = [];
  for (const [host, bs] of groups) if (bs.length > 1) { const hs = bs.map(b => px(b.getBoundingClientRect().height)); if (Math.max(...hs) - Math.min(...hs) > 1) mismatch.push({host: host.className.slice(0, 40), heights: hs}); }
  out.buttons = {groups: [...groups.values()].filter(x => x.length > 1).length, total: [...groups.values()].flat().length, mismatch};
  const icon = [...document.querySelectorAll('.kit-ctl-button[data-content=icon-only]')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return Math.abs(r.width - r.height) > 1; }).length;
  out.buttons.iconNotSquare = icon;
  // 대기·로딩을 나란히 놓는 compare 묶음은 폭도 같아야 한다(상태가 바뀔 때 버튼이 흔들리지 않는다)
  out.buttons.compareWidthSpread = Math.max(0, ...[...document.querySelectorAll('.pf-actions[data-phase=compare]')].filter(vis).map(g => { const ws = [...g.querySelectorAll('.kit-ctl-button')].map(b => px(b.getBoundingClientRect().width)); return Math.max(...ws) - Math.min(...ws); }));
  // 겹침: 같은 줄에 놓인 버튼끼리, 버튼과 입력·선택 칸이 서로의 영역을 침범하지 않는다(입력 안의 지우기·보기 버튼은 .kit-ctl-button이 아니므로 제외된다)
  const overlaps = [], rects = [...document.querySelectorAll('.kit-ctl-button,.kit-ctl-input input,.kit-select-trigger')].filter(vis).map(el => ({el, r: el.getBoundingClientRect()}));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.el.contains(b.el) || b.el.contains(a.el) || (!a.el.matches('.kit-ctl-button') && !b.el.matches('.kit-ctl-button'))) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 2 && h > 2) overlaps.push({a: a.el.className.slice(0, 30), b: b.el.className.slice(0, 30), w: px(w), h: px(h)});
  }
  out.overlap = {checked: rects.length, found: overlaps.slice(0, 5)};
  // 터치 대상: 하단 바 항목
  const touch = [...document.querySelectorAll('.pf-bottom a,.pf-bottom button')].filter(vis).map(a => px(a.getBoundingClientRect().height));
  out.touch = {checked: touch.length, min: touch.length ? Math.min(...touch) : null};
  return out;
}

export function judge(m) {
  const fail = [];
  if (m.overflowX > 1) fail.push(`가로 넘침 ${m.overflowX}px`);
  if (m.cards.maxHeightSpread > 1) fail.push(`카드 높이 불균형 ${m.cards.maxHeightSpread}px`);
  if (m.padding.issues.length) fail.push(`카드 패딩 ${m.padding.issues.length}건`);
  if (m.numbers.wrapped.length) fail.push(`숫자 줄바꿈 ${m.numbers.wrapped.join(',')}`);
  if (m.buttons.mismatch.length) fail.push(`버튼 크기 불일치 ${m.buttons.mismatch.length}건`);
  if (m.buttons.compareWidthSpread > 1) fail.push(`대기·로딩 버튼 폭 차 ${m.buttons.compareWidthSpread}px`);
  if (m.buttons.iconNotSquare) fail.push(`아이콘 버튼 비정사각 ${m.buttons.iconNotSquare}건`);
  if (m.overlap.found.length) fail.push(`컨트롤 겹침 ${m.overlap.found.length}건`);
  if (m.touch.checked && m.touch.min < 44) fail.push(`터치 대상 ${m.touch.min}px`);
  return fail;
}

export async function measureAll({groups = GROUPS, modes = ['light'], shots = null, visuals = VISUALS, log = () => {}} = {}) {
  const env = makeEnv(), browser = await chromium.launch(), results = [];
  try {
    const ctx = await browser.newContext({locale: 'ko-KR', deviceScaleFactor: 1});
    const page = await ctx.newPage();
    for (const group of groups) for (const {context, density} of groupScenarios(group)) for (const visual of visuals) for (const mode of modes) {
      const built = buildPage(env, group, visual, {mode, context, density});
      if (!built.ok) { results.push({group, context, density, visual, mode, ok: false, reason: built.diagnostics.map(d => `${d.code}: ${d.message}`)}); log(`SKIP ${group} ${context}/${density} ${visual} ${mode}`); continue; }
      await page.setContent(built.html, {waitUntil: 'load'});
      for (const [name, width] of Object.entries(WIDTHS)) {
        await page.setViewportSize({width, height: 900});
        await settleLayout(page);
        const opts = mergeOptions(PROBE_OPTIONS);
        const probe = await page.evaluate(layoutProbe, opts);
        const findings = applyExemptions(probe.findings.map(f => ({...f, width, page: `${group}-${visual}`})), EXEMPTIONS, `${group}-${visual}`);
        const errors = findings.filter(f => f.severity === 'error' && !f.exempt);
        const metrics = await page.evaluate(familyMetrics);
        const fail = judge(metrics);
        if (shots && mode === 'light') await page.screenshot({path: resolve(shots, `${group}-${visual.slice('family:'.length)}-${name}.png`), fullPage: true});
        results.push({group, context, density, visual, mode, viewport: name, width, ok: !errors.length && !fail.length, probeErrors: errors.map(f => ({code: f.code, locator: f.locator, text: String(f.text ?? '').slice(0, 60), evidence: f.evidence})), probeCounts: probe.counts, scanned: probe.scanned, metrics, fail});
        log(`${group} ${context}/${density} ${visual} ${mode} ${name}: ${errors.length || fail.length ? 'FAIL' : 'ok'}`);
      }
    }
  } finally { await browser.close(); }
  return results;
}

export function summarize(results) {
  const rows = results.filter(r => r.viewport);
  const sum = (f) => rows.reduce((s, r) => s + f(r), 0);
  return {
    pages: rows.length, failed: rows.filter(r => !r.ok).length, skipped: results.filter(r => r.ok === false && !r.viewport).length,
    probeErrors: sum(r => r.probeErrors.length),
    cards: {checked: sum(r => r.metrics.cards.count), rowsCompared: sum(r => r.metrics.cards.rows), maxHeightSpread: Math.max(0, ...rows.map(r => r.metrics.cards.maxHeightSpread))},
    padding: {checked: sum(r => r.metrics.padding.checked), issues: sum(r => r.metrics.padding.issues.length)},
    numbers: {checked: sum(r => r.metrics.numbers.checked), wrapped: sum(r => r.metrics.numbers.wrapped.length)},
    buttons: {checked: sum(r => r.metrics.buttons.total), groupsCompared: sum(r => r.metrics.buttons.groups), mismatched: sum(r => r.metrics.buttons.mismatch.length)},
    overlap: {checked: sum(r => r.metrics.overlap.checked), found: sum(r => r.metrics.overlap.found.length)},
    overflowPages: rows.filter(r => r.metrics.overflowX > 1).length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
  const out = resolve(arg('--out', 'docs/platform/evidence/families'));
  const groups = arg('--groups', GROUPS.join(',')).split(','), modes = arg('--modes', 'light,dark').split(',');
  const shots = process.argv.includes('--shots') ? out : null;
  if (shots) mkdirSync(out, {recursive: true});
  const results = await measureAll({groups, modes, shots, log: m => console.error(m)});
  const summary = summarize(results);
  if (process.argv.includes('--json') || shots) { mkdirSync(out, {recursive: true}); writeFileSync(resolve(out, 'measurements.json'), JSON.stringify({summary, results}, null, 1) + '\n'); }
  console.log(JSON.stringify(summary));
  process.exitCode = summary.failed || summary.skipped ? 1 : 0;
}
