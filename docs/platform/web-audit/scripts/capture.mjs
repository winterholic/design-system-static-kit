// 웹 감사용 스크린샷. 사용: BASE=http://127.0.0.1:4421 OUT=<dir> node capture.mjs
// 페이지마다 데스크톱 1440, 모바일 390 두 장을 전체 높이로 찍는다. 코드는 읽기만 하고 서버 상태를 바꾸지 않는다.
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const OUT = process.env.OUT ?? new URL('../before/', import.meta.url).pathname;
mkdirSync(OUT, {recursive: true});

const PAGES = [
  ['home', '/'],
  ['materials', '/materials'],
  ['materials-color', '/materials/color'],
  ['materials-typography', '/materials/typography'],
  ['materials-foundations', '/materials/foundations'],
  ['materials-foundations-radius', '/materials/foundations/radius'],
  ['components', '/components'],
  ['components-hero', '/components/hero'],
  ['components-data-table', '/components/data-table'],
  ['components-button-control', '/components/button-control'],
  ['explore', '/explore'],
  ['explore-detail', '/explore/saas-landing~theme_aurora~variant_clean-saas'],
  ['studio-start', '/studio'],
  ['studio-doc', '/studio?template=saas-landing', {waitFor: '[data-testid="preview-frame"]'}],
  ['studio-design-tab', '/studio?template=saas-landing&tab=design', {waitFor: '[data-testid="preview-frame"]'}],
  ['studio-preview-pane', '/studio?template=saas-landing&pane=preview', {waitFor: '[data-testid="preview-frame"]'}],
  ['docs', '/docs'],
  ['docs-getting-started', '/docs/getting-started'],
  ['integrations', '/integrations'],
  ['integrations-rest-api', '/integrations/rest-api'],
  ['integrations-mcp', '/integrations/mcp'],
];
const VIEWPORTS = [['d1440', {width: 1440, height: 900}], ['m390', {width: 390, height: 844}]];

const browser = await chromium.launch();
for (const [vname, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, isMobile: vname === 'm390'});
  for (const [name, path, opt] of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + path, {waitUntil: 'networkidle'});
    if (opt?.waitFor) await page.waitForSelector(opt.waitFor, {state: 'attached', timeout: 20000});
    await page.waitForTimeout(600);
    const file = join(OUT, `${name}.${vname}.png`);
    await page.screenshot({path: file, fullPage: true});
    console.log('saved', file);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
