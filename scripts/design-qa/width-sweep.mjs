// 전 조합 폭 스윕(2026-11-21 품질 진단). 6차 전수 진단(diagnose.mjs)은 1440·390만 쟀다. 이 도구는 같은 세 프로브를 다른 폭(기본 320·768)에서 돌려 폭에 따라 숨어 있던 위반을 찾는다.
// 사용: node scripts/design-qa/width-sweep.mjs [--widths 320,768] [--workers 4] [--limit N] [--ids-from <이전 스윕 JSON>] [--out docs/evidence/quality-2026-11-21/sweep-320-768.json]
// --ids-from: 이전 스윕에서 지적이 있던 조합만 다시 잰다(수정 중 빠른 확인용. 전체 수치는 이 옵션 없이 돌려야 한다).
// 산출: {조합 id: {폭: {코드: {n, at, d}}}} - 지적이 있는 조합만. 4,955조합 × 2폭에 약 25분.
import {chromium} from '@playwright/test';
import {writeFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {enumerateCombos, renderCombo} from '../../src/combos.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const widths = opt('--widths', '320,768').split(',').map(Number), workers = Number(opt('--workers', 4));
const out = resolve(import.meta.dirname, '../..', opt('--out', 'docs/evidence/quality-2026-11-21/sweep-320-768.json'));
const idsFrom = opt('--ids-from', null), only = idsFrom ? new Set(Object.keys(JSON.parse(readFileSync(resolve(import.meta.dirname, '../..', idsFrom), 'utf8')))) : null;
const limit = Number(opt('--limit', 1e9)), list = enumerateCombos().filter(c => !c.sameAs && (!only || only.has(c.id))).slice(0, limit), res = {};
let next = 0;
const br = await chromium.launch();
const run = async () => {
  const pages = await Promise.all(widths.map(async w => { const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}); return {w, page: await ctx.newPage()}; }));
  for (;;) {
    const c = list[next++]; if (!c) break;
    const r = renderCombo(c); if (!r.ok) continue;
    const e = {};
    for (const {w, page} of pages) {
      await page.setContent(r.html, {waitUntil: 'load'});
      const found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings].filter(f => !(f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at)));
      const codes = {};
      for (const f of found) { codes[f.code] ??= {n: 0, at: f.at, d: String(f.detail).slice(0, 100)}; codes[f.code].n++; }
      if (Object.keys(codes).length) e[w] = codes;
    }
    if (Object.keys(e).length) res[c.id] = e;
    if (next % 500 === 0) console.log(next, '/', list.length);
  }
};
await Promise.all(Array.from({length: workers}, run));
await br.close();
writeFileSync(out, JSON.stringify(res));
console.log('done', Object.keys(res).length, 'combos with findings of', list.length);
