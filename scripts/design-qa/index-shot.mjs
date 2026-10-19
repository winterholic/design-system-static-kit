// test-lab 인덱스(대표 케이스 썸네일 포함) 스크린샷. 사용: node scripts/design-qa/index-shot.mjs <out.png> [--base URL] [--w 1280]
import {chromium} from '@playwright/test';
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
const base = opt('--base') ?? 'http://127.0.0.1:4173/site';
const w = Number(opt('--w') ?? 1280);
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: w, height: 900}});
await page.goto(`${base}/test-lab/`, {waitUntil: 'load'});
await page.evaluate(async () => { for (const f of document.querySelectorAll('iframe')) f.loading = 'eager'; window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 2500)); window.scrollTo(0, 0); });
await page.screenshot({path: args[0], clip: {x: 0, y: 0, width: w, height: 1500}, fullPage: true});
await browser.close();
