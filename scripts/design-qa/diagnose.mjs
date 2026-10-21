// 전수 진단(6차 A). 조합마다 데스크톱 1440·모바일 390 × (기본 테마 + 돌려 쓰는 테마 N개)를 렌더해 세 프로브(간격·글줄·배치)의 지적을 모으고 등급을 매긴다.
// 사용: node scripts/design-qa/diagnose.mjs <out.json> [--themes 1] [--workers 4] [--limit N] [--template id]
// 등급: A 그대로(지적 0) · B 손질(경미한 지적만) · C 재설계(심각한 지적이 한 번이라도). 심각도 표는 SEVERE.
import {chromium} from '@playwright/test';
import {writeFileSync, readFileSync} from 'node:fs';
import {enumerateCombos, renderCombo} from '../../src/combos.mjs';
import {themes} from '../../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';

import {SEVERE, grade} from './diagnose-meta.mjs';

const [outFile, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : d; };
const extraThemes = Number(opt('--themes', 1)), workers = Number(opt('--workers', 4)), limit = Number(opt('--limit', 1e9)), only = opt('--template', null);
const WIDTHS = [1440, 390];
const themeIds = Object.keys(themes);
// --ids-file: 지정한 조합만 다시 재고 --merge한 기존 결과에 덮어쓴다(한 규칙만 고쳤을 때 전수를 다시 돌리지 않기 위한 것).
const idsFile = opt('--ids-file', null), mergeFile = opt('--merge', null);
const wanted = idsFile ? new Set(readFileSync(idsFile, 'utf8').trim().split(/\s+/)) : null;
const universe = enumerateCombos().filter(c => !c.sameAs && (!only || c.templateId === only)).slice(0, limit), position = new Map(universe.map((c, i) => [c.id, i]));
const combos = universe.filter(c => !wanted || wanted.has(c.id));
const jobs = combos.flatMap(c => { const i = position.get(c.id); return [null, ...Array.from({length: extraThemes}, (_, k) => themeIds[(i * 7 + k * 13 + 3) % themeIds.length])].map(theme => ({c, theme})); });

const result = mergeFile ? JSON.parse(readFileSync(mergeFile, 'utf8')).combos : {};
for (const c of combos) delete result[c.id];
// 히어로 시각 요소(제품 목업)는 오른쪽 가장자리로 일부러 번지고 컨테이너가 잘라 낸다(문서 가로 넘침 없음). 요소 단위 OVERFLOW_X에서 뺀다.
const bleed = f => f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at);
let next = 0, done = 0;
const br = await chromium.launch();
const run = async () => {
  const pages = await Promise.all(WIDTHS.map(async w => { const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}); return {w, ctx, page: await ctx.newPage()}; }));
  for (;;) {
    const job = jobs[next++]; if (!job) break;
    const r = renderCombo(job.c, job.theme ? {theme: job.theme} : undefined);
    const entry = result[job.c.id] ??= {tpl: job.c.templateId, views: 0, codes: {}, where: {}};
    if (!r.ok) { entry.error = r.error; continue; }
    for (const {w, page} of pages) {
      await page.setContent(r.html, {waitUntil: 'load'});
      const found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings];
      entry.views++;
      for (const f of found.filter(f => !bleed(f))) { entry.codes[f.code] = (entry.codes[f.code] ?? 0) + 1; (entry.where[f.code] ??= f.at + ' ' + f.detail + ' @' + w + (job.theme ? ' ' + job.theme : '')); }
    }
    if (++done % 400 === 0) console.log(done, '/', jobs.length);
  }
  await Promise.all(pages.map(p => p.ctx.close()));
};
await Promise.all(Array.from({length: workers}, run));
await br.close();
for (const e of Object.values(result)) { e.grade = grade(e.codes); for (const k of Object.keys(e.where)) e.where[k] = e.where[k].slice(0, 140); }
const summary = {A: 0, B: 0, C: 0};
for (const e of Object.values(result)) summary[e.grade]++;
writeFileSync(outFile, JSON.stringify({meta: {label: opt('--label', 'working tree'), date: new Date().toISOString().slice(0, 10), combos: Object.keys(result).length, views: Object.values(result).reduce((n, e) => n + e.views, 0), widths: WIDTHS, extraThemes, summary}, combos: result}));
console.log('done', combos.length, 'combos', jobs.length * WIDTHS.length, 'views', JSON.stringify(summary));
