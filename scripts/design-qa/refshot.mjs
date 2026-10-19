// 외부 레퍼런스 사이트를 비교 목적으로만 촬영한다(.qa/ref, gitignore). 코드·이미지·문구를 가져오지 않고 구도·밀도·타이포 수치만 읽는다.
// 사용: node scripts/design-qa/refshot.mjs <name>=<url> ...   (--maxh N)
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const args = process.argv.slice(2);
const mi = args.indexOf('--maxh'); const maxH = mi > -1 ? Number(args.splice(mi, 2)[1]) : 2600;
const out = resolve(import.meta.dirname, '../../.qa/ref');
await mkdir(out, {recursive: true});
const b = await chromium.launch();
for (const a of args) {
  const [name, url] = [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)];
  for (const w of [1280, 390]) {
    const ctx = await b.newContext({viewport: {width: w, height: w === 390 ? 844 : 800}, deviceScaleFactor: 1, locale: 'ko-KR', userAgent: w === 390 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined});
    const p = await ctx.newPage();
    try {
      await p.goto(url, {waitUntil: 'domcontentloaded', timeout: 25000});
      await p.waitForTimeout(2500);
      // 지연 로딩 이미지를 깨우기 위해 한 번 훑는다
      const h = await p.evaluate(async max => { for (let y = 0; y < Math.min(document.body.scrollHeight, max); y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); return document.documentElement.scrollHeight; }, maxH);
      await p.waitForTimeout(500);
      await p.screenshot({path: `${out}/${name}-${w}.png`, fullPage: true, clip: {x: 0, y: 0, width: w, height: Math.min(h, maxH)}});
      console.log('OK', name, w, h);
    } catch (e) { console.log('ERR', name, w, e.message.slice(0, 90)); }
    await ctx.close();
  }
}
await b.close();
