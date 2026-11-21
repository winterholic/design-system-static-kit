// Materials 화면 360·1280px 캡처(증거: docs/evidence/materials-site/). 서버가 떠 있어야 한다.
// 실행: BASE=http://127.0.0.1:4330 node scripts/capture-materials.mjs [출력 폴더]
import {mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {chromium} from '@playwright/test';

const base = process.env.BASE ?? 'http://127.0.0.1:4310';
const out = resolve(process.argv[2] ?? join(import.meta.dirname, '../../../docs/evidence/materials-site'));
mkdirSync(out, {recursive: true});

const PAGES = [
  ['materials', '/materials'],
  ['color', '/materials/color'],
  ['typography', '/materials/typography'],
  ['foundations', '/materials/foundations'],
  ['foundations-radius', '/materials/foundations/radius'],
  ['ui-components', '/dev/ui'],
];
const browser = await chromium.launch();
for (const width of [360, 1280]) {
  const page = await browser.newPage({viewport: {width, height: 900}});
  for (const [name, path] of PAGES) {
    await page.goto(base + path, {waitUntil: 'networkidle'});
    await page.screenshot({path: join(out, `${name}-${width}.png`), fullPage: true});
  }
  // 열린 Select(popover·시트) 상태
  await page.goto(base + '/dev/ui', {waitUntil: 'networkidle'});
  await page.locator('#ui-fruit').scrollIntoViewIfNeeded();
  await page.locator('#ui-fruit').click();
  await page.keyboard.press('ArrowDown');
  await page.screenshot({path: join(out, `select-open-${width}.png`)});
  await page.close();
}
await browser.close();
console.log('saved to', out);
