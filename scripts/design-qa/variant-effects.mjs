// 구성 변형 옵션이 렌더 결과를 실제로 바꾸는지 잰다(변형 결과 계약 V05). 템플릿 기본 구성과 옵션 하나를 적용한 구성을 같은 폭에서 렌더해
// 모든 요소의 위치·크기·글자·색 지문을 비교하고, 모든 폭에서 지문이 같은 옵션을 "중립"으로 모은다.
// 사용: node scripts/design-qa/variant-effects.mjs [--widths 1440,390] [--workers 4] [--write] [--template id]
// --write: src/catalog/variant-effects.mjs를 쓴다(없으면 요약만 출력). 조합 단위가 아니라 템플릿 기본 구성 대비 단일 옵션 단위다.
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {templateList, createBlueprint, layoutOptionsOf, CATALOG_VERSION} from '../../src/catalog.mjs';
import {compile} from '../../src/compiler.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const widths = opt('--widths', '1440,390').split(',').map(Number), workers = Number(opt('--workers', 4)), only = opt('--template', null);

/** 페이지 안에서 도는 지문 함수. 보이는 요소마다 (위치·크기·글자·색)을 한 줄로 만들어 모두 이어 붙인다. */
const fingerprint = () => {
  const r = n => Math.round(n * 2) / 2, out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('script,style') || !el.getClientRects().length) continue; // 그려지지 않는 요소(display:none 하위 포함)는 지문에 넣지 않는다
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    out.push([el.tagName, el.getAttribute('class') ?? '', r(b.left), r(b.top + scrollY), r(b.width), r(b.height), cs.color, cs.backgroundColor, cs.borderTopWidth, cs.borderTopColor, cs.fontSize, cs.fontWeight, cs.textAlign, cs.opacity, (el.children.length ? '' : (el.textContent ?? '').trim().slice(0, 40))].join('|'));
  }
  return out.join('\n');
};

const jobs = [];
for (const t of templateList.filter(t => !only || t.id === only)) {
  jobs.push({t, key: null, layout: {}});
  for (const s of layoutOptionsOf(t.id)) for (const o of s.options) jobs.push({t, key: `${t.id}~${s.id}:${o.id}`, layout: {[s.id]: o.id}});
}
const prints = new Map();
let next = 0;
const br = await chromium.launch();
const run = async () => {
  const pages = await Promise.all(widths.map(async w => { const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}); return {w, ctx, page: await ctx.newPage()}; }));
  for (;;) {
    const job = jobs[next++]; if (!job) break;
    const html = compile(createBlueprint(job.t.id, undefined, undefined, {layout: job.layout})).html, fp = {};
    for (const {w, page} of pages) { await page.setContent(html, {waitUntil: 'load'}); fp[w] = await page.evaluate(fingerprint); }
    prints.set(job.key ?? job.t.id, fp);
  }
  await Promise.all(pages.map(p => p.ctx.close()));
};
await Promise.all(Array.from({length: workers}, run));
await br.close();

const neutral = {};
for (const j of jobs) if (j.key) { const base = prints.get(j.t.id), fp = prints.get(j.key); if (widths.every(w => fp[w] === base[w])) neutral[j.key] = {widths}; }
const options = jobs.filter(j => j.key).length;
console.log(`measured ${options} options on ${widths.join('/')}px: ${Object.keys(neutral).length} neutral`);
for (const k of Object.keys(neutral)) console.log(' ', k);
if (args.includes('--write')) {
  const commit = (() => { try { return execSync('git rev-parse --short HEAD', {encoding: 'utf8'}).trim(); } catch { return null; } })();
  const sorted = Object.fromEntries(Object.entries(neutral).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(new URL('../../src/catalog/variant-effects.mjs', import.meta.url), `/** 렌더 지문으로 잰 "적용 전후 차이 0" 옵션: {템플릿~슬롯:옵션: {widths}}. 생성 파일이므로 손으로 고치지 않는다(node scripts/design-qa/variant-effects.mjs --write). */
export const NEUTRAL_OPTIONS = ${JSON.stringify(sorted, null, 1).replace(/\n\s*/g, '\n ').replace(/^\{\n /, '{\n ')};
export const EFFECTS_META = ${JSON.stringify({date: new Date().toLocaleDateString('sv'), catalogVersion: CATALOG_VERSION, commit, options, widths})};
`);
  console.log('written');
}
