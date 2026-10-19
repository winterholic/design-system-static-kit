// 디자인 품질 점검용 스크린샷 도구. 산출물은 .qa/ 아래(gitignore)에만 쓴다.
// 사용: node scripts/design-qa/shoot.mjs <label> [--only a,b] [--base http://127.0.0.1:4173] [--maxh 2600]
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SAMPLES as BASE, EXTRA} from './samples.mjs';

const args = process.argv.slice(2);
const label = args[0] ?? 'now';
const opt = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
const base = opt('--base') ?? 'http://127.0.0.1:4173';
const only = opt('--only')?.split(',');
const SAMPLES = args.includes('--extra') ? EXTRA : BASE;
const maxH = Number(opt('--maxh') ?? 2600);
const out = resolve(import.meta.dirname, '../../.qa', label);
await mkdir(out, {recursive: true});
const browser = await chromium.launch();
for (const s of SAMPLES.filter(s => !only || only.includes(s.id))) {
  for (const w of [390, 1280]) {
    const ctx = await browser.newContext({viewport: {width: w, height: w === 390 ? 844 : 800}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    const page = await ctx.newPage();
    await page.goto(`${base}/${s.path}`, {waitUntil: 'load'});
    await page.waitForTimeout(150);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({path: `${out}/${s.id}-${w}.png`, fullPage: true, clip: {x: 0, y: 0, width: w, height: Math.min(h, maxH)}});
    console.log(s.id, w, `h=${h}`, sw > w ? `OVERFLOW-X ${sw}` : '');
    await ctx.close();
  }
}
await browser.close();
