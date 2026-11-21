// 390·768·1280px 상단 내비 캡처. 서버가 떠 있어야 한다: BASE=http://127.0.0.1:4310 node scripts/capture-shell.mjs
import {mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {chromium} from '@playwright/test';

const base = process.env.BASE ?? 'http://127.0.0.1:4310';
const out = resolve(import.meta.dirname, '../../../docs/dev/platform/screens/shell');
mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const report = [];
for (const width of [390, 768, 1280]) {
  const page = await browser.newPage({viewport: {width, height: 800}});
  for (const [name, path] of [['home', '/'], ['explore', '/explore']]) {
    await page.goto(base + path, {waitUntil: 'networkidle'});
    const m = await page.evaluate(() => ({scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, headerHeight: document.querySelector('header').getBoundingClientRect().height}));
    report.push({width, path, ...m});
    await page.screenshot({path: join(out, `${name}-${width}.png`)});
    if (width < 720 && name === 'home') {
      await page.getByRole('button', {name: /메뉴/}).click();
      await page.screenshot({path: join(out, `${name}-${width}-menu-open.png`)});
    }
  }
  await page.close();
}
await browser.close();
console.table(report);
