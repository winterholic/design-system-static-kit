// W6-b 스크린샷: Chromium 390폭(모바일)과 1280폭(데스크톱)으로 Materials·Components·Studio 조립·Explore 사례를 남긴다.
// 실행: BASE=http://127.0.0.1:4421 node apps/web/scripts/capture-w6b.mjs  (먼저 `next start -p 4421` 로 서버를 띄운다)
// 결과: docs/platform/web-audit/after-w6b/<이름>.d1280.png, <이름>.m390.png (전체 높이)
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';

const base = process.env.BASE ?? 'http://127.0.0.1:4421';
const out = resolve(import.meta.dirname, '../../../docs/platform/web-audit/after-w6b');
mkdirSync(out, {recursive: true});
const SIZES = [{tag: 'd1280', width: 1280, height: 900}, {tag: 'm390', width: 390, height: 844}];

// Thumb 은 화면 근처에 올 때만 iframe 을 만든다. 전체 높이 캡처에서 빈 상자가 되지 않게 항상 보이는 것으로 취급한다.
const alwaysVisible = () => {
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{isIntersecting: true, target: el}]); }
    unobserve() {}
    disconnect() {}
  };
};

const browser = await chromium.launch();
// 살아 있는 썸네일 iframe 이 모두 본문을 그릴 때까지 기다린다(전체 높이 캡처에서 빈 상자가 남지 않게).
const framesPainted = page => page.waitForFunction(() => [...document.querySelectorAll('main iframe')].every(f => { try { return f.contentDocument?.body?.children.length > 0; } catch { return false; } }), null, {timeout: 15000}).catch(() => {});
// 화면 밖 iframe 은 스크롤해서 지나가야 그려진다. 끝까지 훑은 뒤 맨 위로 돌아와 찍는다.
const sweep = async page => {
  const [height, view] = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
  for (let y = 0; y < height; y += view * 0.8) { await page.evaluate(top => scrollTo(0, top), y); await page.waitForTimeout(160); }
  await page.evaluate(() => scrollTo(0, 0));
};
// 화면 밖 iframe 은 전체 높이 캡처에서 그려지지 않는다. 뷰포트를 문서 높이만큼 키워 모두 화면 안에 둔 채 찍고 되돌린다.
const shot = async (page, name, tag) => {
  await sweep(page);
  const size = page.viewportSize();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({width: size.width, height: Math.min(height, 12000)});
  await framesPainted(page);
  await page.waitForTimeout(900);
  await page.screenshot({path: `${out}/${name}.${tag}.png`, fullPage: true});
  await page.setViewportSize(size);
  console.log('shot', `${name}.${tag}`);
};
const ready = page => page.locator('[data-phase="ready"]').waitFor();
const pickValue = async (page, selector, value) => { await page.locator(selector).click(); await page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`).click(); };


const PAGES = [
  ['materials-palettes', '/materials/palettes'],
  ['materials-palette-light', '/materials/palettes/ocean-cool'],
  ['materials-palette-dark', '/materials/palettes/ocean-cool?mode=dark'],
  ['materials-palette-rejected', '/materials/palettes/graphite-mono'],
  ['materials-palette-custom', '/materials/palettes/custom?seeds=%230D6E8E%20%238A8F99%20%23E8A100%20%232E8B57%20%23C0392B%20%233B6FD6'],
  ['materials-typography-compare', '/materials/typography?with=doc-essay,doc-handbook,work-console&sample=doc#compare'],
  ['materials-typography-compare-mobile', '/materials/typography?with=doc-essay,doc-handbook&sample=doc&width=390#compare'],
  ['materials-styles', '/materials/styles'],
  ['materials-other-surface', '/materials/styles?kind=surface#other'],
  ['materials-other-state', '/materials/styles?kind=state-pattern#other'],
  ['components', '/components'],
  ['components-card-pricing', '/components/purpose/card/pricing?visual=bold'],
  ['components-card-adjusted', '/components/purpose/card/pricing?visual=bold&p_state=selected'],
  ['components-card-mobile', '/components/purpose/card/pricing?visual=editorial&device=390&mode=dark'],
  ['assemble-purpose', '/studio/assemble'],
  ['assemble-direction', '/studio/assemble?purpose=work-dashboard&step=direction'],
  ['assemble-compare', '/studio/assemble?purpose=work-dashboard&style=bank&step=compare'],
  ['assemble-swap', '/studio/assemble?purpose=work-dashboard&style=bank&palette=forest-green&set=data-dense&type=work-console&step=swap'],
  ['assemble-content', '/studio/assemble?purpose=work-dashboard&style=bank&palette=forest-green&set=data-dense&type=work-console&c_title=%EC%9A%B0%EB%A6%AC%20%ED%8C%80%20%EC%9A%B4%EC%98%81%20%ED%98%84%ED%99%A9&step=content'],
  ['assemble-impact', '/studio/assemble?purpose=work-dashboard&c_title=%EC%9A%B0%EB%A6%AC%20%ED%8C%80%20%EC%9A%B4%EC%98%81%20%ED%98%84%ED%99%A9&pending=editorial-docs'],
  ['assemble-export', '/studio/assemble?purpose=commerce&palette=magenta-vivid&set=commerce-vivid&type=shop-catalog&family=bold&step=export'],
  ['assemble-component-handoff', '/studio/assemble?purpose=saas-landing&component=card-surface&cvisual=bold&ctitle=%EA%B0%80%EA%B2%A9%20%EC%B9%B4%EB%93%9C&step=compare'],
  ['explore-platform-cases', '/explore'],
];

for (const {tag, width, height} of SIZES) {
  const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1});
  await context.addInitScript(alwaysVisible);
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(base + path);
    await page.waitForLoadState('networkidle');
    await shot(page, name, tag);
  }
  await context.close();
}
await browser.close();
