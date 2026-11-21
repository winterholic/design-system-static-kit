// 전환 전(before) 대표 화면 캡처: 390·768·1280 폭. 출력: docs/dev/platform/screens/before/<화면>-<폭>.png (뷰포트 크기, 접힌 부분 없음)
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const ROOT = process.env.BASE ?? 'http://127.0.0.1:4201/';
const OUT = new URL('../screens/before/', import.meta.url).pathname;
await mkdir(OUT, {recursive: true});
const sizes = [[390, 844], [768, 1024], [1280, 800]];
const browser = await chromium.launch();
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1});
  const shot = async (page, name) => { await page.waitForTimeout(900); await page.screenshot({path: `${OUT}${name}-${w}.png`}); };
  // 조립기: 선택 패널 → 미리보기 → 구조 → 카탈로그
  let page = await ctx.newPage(); await page.goto(ROOT); await page.waitForSelector('#workspace:not([hidden])');
  await shot(page, 'workbench-choices');
  if (w < 1024) { await page.click('.mobile-tabs [data-panel="preview"]'); await shot(page, 'workbench-preview'); await page.click('.mobile-tabs [data-panel="structure"]'); await shot(page, 'workbench-structure'); }
  else { await page.click('#toggle-structure').catch(() => {}); await shot(page, 'workbench-structure'); }
  await page.click('#catalog-tab'); await shot(page, 'workbench-catalog');
  // 조합 갤러리: 목록 → 확대 보기
  page = await ctx.newPage(); await page.goto(ROOT + 'combos/'); await page.waitForSelector('html[data-ready="true"]');
  await shot(page, 'combos-list');
  await page.click('.combo-card .thumb-hit >> nth=0'); await page.waitForSelector('#viewer[open]'); await shot(page, 'combos-viewer');
  // 단일 파일 갤러리: 목록 → 확대 보기 → 부품 탭
  page = await ctx.newPage(); await page.goto(ROOT + 'site/gallery/index.html'); await page.waitForSelector('#tab-templates .card');
  await shot(page, 'gallery-templates');
  await page.click('#tab-templates .card >> nth=0'); await page.waitForSelector('#viewer.open'); await shot(page, 'gallery-viewer');
  await ctx.close();
}
await browser.close();
console.log('saved to', OUT);
