// Full-page capture of the 85 default examples at 1440 and 390. Audit-only: reads production, writes under visual-reaudit/.
// node docs/evidence/context-rollout/visual-reaudit-capture.mjs [baseUrl]
import {chromium} from 'playwright';
import {readdir, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root = resolve(import.meta.dirname, '../../..');
const base = (process.argv[2] ?? 'https://design-system-static-kit.vercel.app').replace(/\/$/, '');
const out = resolve(import.meta.dirname, 'visual-reaudit');
const names = (await readdir(resolve(root, 'site/examples'), {withFileTypes: true})).filter(d => d.isDirectory() && d.name !== 'themes').map(d => d.name).sort();
const browser = await chromium.launch();
const receipt = {base, tool: 'playwright chromium ' + browser.version(), at: new Date().toISOString(), views: []};
for (const width of [1440, 390]) {
  await mkdir(resolve(out, String(width)), {recursive: true});
  const ctx = await browser.newContext({viewport: {width, height: width === 1440 ? 900 : 844}, deviceScaleFactor: 1, ...(width === 390 ? {isMobile: true, hasTouch: true} : {})});
  const page = await ctx.newPage();
  for (const name of names) {
    const res = await page.goto(`${base}/examples/${name}/`, {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({content: '*,*::before,*::after{animation:none!important;transition:none!important}'});
    const m = await page.evaluate(() => ({h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, iw: innerWidth, title: document.title}));
    const file = `${width}/${name}.png`;
    await page.screenshot({path: resolve(out, file), fullPage: true});
    receipt.views.push({name, width, status: res.status(), file, height: m.h, scrollWidth: m.sw, innerWidth: m.iw, title: m.title});
  }
  await ctx.close();
}
await browser.close();
await writeFile(resolve(out, 'receipt.json'), JSON.stringify(receipt, null, 1));
console.log(`views ${receipt.views.length}`);
