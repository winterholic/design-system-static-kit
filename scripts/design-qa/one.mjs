// 한 장 스크린샷: node scripts/design-qa/one.mjs <template> <theme|-> <width> <out.png> [--maxh 2400] [--mode dark] [--sel ".css"]
import {chromium} from '@playwright/test';
import {compile} from '../../src/compiler.mjs';
import {createBlueprint} from '../../src/catalog.mjs';
const [tpl, theme, width, out, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : null; };
const b = createBlueprint(tpl, theme === '-' ? undefined : theme);
if (opt('--mode')) b.mode = opt('--mode');
if (opt('--palette')) b.palette = opt('--palette');
const br = await chromium.launch(), ctx = await br.newContext({viewport: {width: Number(width), height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
await page.setContent(compile(b).html, {waitUntil: 'load'});
const h = await page.evaluate(() => document.documentElement.scrollHeight);
const sel = opt('--sel');
if (sel) { const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.screenshot({path: out}); }
else await page.screenshot({path: out, fullPage: true, clip: {x: 0, y: Number(opt('--y') ?? 0), width: Number(width), height: Math.min(h - Number(opt('--y') ?? 0), Number(opt('--maxh') ?? 2400))}});
console.log(out, 'h=' + h);
await br.close();
