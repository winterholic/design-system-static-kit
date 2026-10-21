// 조합 전수에 배치 프로브를 돌려 JSONL로 남긴다.
// 사용: node scripts/design-qa/combo-probe.mjs <out.jsonl> <width> [--limit N] [--theme id] [--workers 6] [--template id] [--skip-same]
import {chromium} from '@playwright/test';
import {createWriteStream} from 'node:fs';
import {enumerateCombos, renderCombo} from '../../src/combos.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';

const [outFile, width, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : d; };
const limit = Number(opt('--limit', 1e9)), workers = Number(opt('--workers', 6)), theme = opt('--theme', null), template = opt('--template', null);
import {themes} from '../../src/catalog.mjs';
// --themes all: 조합마다 모든 테마 / --themes N: 조합마다 N개를 돌려가며 / --defaults: 기본 구성(슬롯을 바꾸지 않은 것)만
const themeIds = Object.keys(themes), themeMode = opt('--themes', null);
const base = enumerateCombos().filter(c => !c.sameAs && (!template || c.templateId === template) && (!rest.includes('--defaults') || !c.changed)).slice(0, limit);
const list = base.flatMap((c, i) => themeMode === 'all' ? themeIds.map(t => ({c, theme: t})) : themeMode ? Array.from({length: Number(themeMode)}, (_, k) => ({c, theme: themeIds[(i * 7 + k * 13 + 3) % themeIds.length]})) : [{c, theme}]);
const out = createWriteStream(outFile);
const br = await chromium.launch();
let next = 0, done = 0;
const run = async () => {
  const ctx = await br.newContext({viewport: {width: Number(width), height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
  for (;;) {
    const job = list[next++]; if (!job) break;
    const c = job.c, r = renderCombo(c, job.theme ? {theme: job.theme} : undefined);
    if (!r.ok) { out.write(JSON.stringify({id: c.id, theme: job.theme, error: r.error}) + '\n'); continue; }
    await page.setContent(r.html, {waitUntil: 'load'});
    const data = await page.evaluate(layoutProbe, LAYOUT_OPTIONS);
    out.write(JSON.stringify({id: c.id, tpl: c.templateId, theme: r.blueprint.theme, ...data}) + '\n');
    if (++done % 500 === 0) console.log(done, '/', list.length);
  }
  await ctx.close();
};
await Promise.all(Array.from({length: workers}, run));
out.end();
await br.close();
console.log('done', done);
