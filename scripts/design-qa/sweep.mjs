// 전수 가로 넘침 점검: test-lab 3,380 사례를 390/1280px로 열어 scrollWidth > clientWidth 인 것을 센다.
// 사용: node scripts/design-qa/sweep.mjs [--base http://127.0.0.1:4173] [--limit N] [--font "Nanum Gothic"]
// --font: 모든 글꼴을 더 넓은 폰트로 바꿔 검사한다. CI(Linux)는 시스템 폰트 폭이 달라 macOS에서 안 보이던 넘침이 나기 때문이다.
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
const base = opt('--base') ?? 'http://127.0.0.1:4173';
const limit = Number(opt('--limit') ?? Infinity);
const font = opt('--font');
const manifest = JSON.parse(await readFile(resolve(import.meta.dirname, '../../site/test-lab/manifest.json'), 'utf8'));
const cases = manifest.cases.slice(0, limit);
const browser = await chromium.launch();
const problems = [];
for (const width of [390, 1280]) {
  const ctx = await browser.newContext({viewport: {width, height: 900}});
  const page = await ctx.newPage();
  for (const c of cases) {
    await page.goto(`${base}/site/test-lab/${c.file}`, {waitUntil: 'domcontentloaded'});
    if (font) await page.addStyleTag({content: `*{font-family:'${font}' !important}`});
    const o = await page.evaluate(() => ({sw: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth), cw: document.documentElement.clientWidth}));
    if (o.sw > o.cw + 1) problems.push(`${c.id}@${width} ${o.sw}>${o.cw}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`SWEEP: ${cases.length} cases × 2 widths, overflow=${problems.length}`);
for (const p of problems.slice(0, 40)) console.log(' ', p);
process.exitCode = problems.length ? 1 : 0;
