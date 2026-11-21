// 대표 폭에서 요소 겹침·가림·가로 스크롤 가능 여부를 좌표로 측정한다.
import {chromium} from 'playwright';
const ROOT = process.env.BASE ?? 'http://127.0.0.1:4201/';
const browser = await chromium.launch();
const out = {};
const box = async (page, sel) => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return {left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), scrollW: e.scrollWidth, clientW: e.clientWidth, overflowX: getComputedStyle(e).overflowX}; });

// L1 조립기 1280: 구조·JSON 패널이 미리보기를 덮는가
for (const w of [1280, 1100, 1024, 768]) {
  const ctx = await browser.newContext({viewport: {width: w, height: 800}}); const page = await ctx.newPage();
  await page.goto(ROOT); await page.waitForSelector('#workspace:not([hidden])');
  const closed = {preview: await box(page, '.preview.pane'), shell: await box(page, '#frame-shell')};
  const toggle = page.locator('#toggle-structure');
  if (await toggle.isVisible()) { await toggle.click(); await page.waitForTimeout(500); }
  const opened = {preview: await box(page, '.preview.pane'), shell: await box(page, '#frame-shell'), structure: await box(page, '#structure-pane')};
  out['L1_' + w] = {closed, opened, structureCoversPreviewPx: Math.max(0, opened.preview.right - opened.structure.left), structureDisplay: await page.$eval('#structure-pane', e => getComputedStyle(e).position)};
  await ctx.close();
}

// L2 조립기 390: 상단 메뉴가 잘리는가
{
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}}); const page = await ctx.newPage();
  await page.goto(ROOT); await page.waitForSelector('#workspace:not([hidden])');
  out.L2 = {nav: await box(page, '.app-header nav'), links: await page.$$eval('.app-header nav > *', l => l.map(a => ({t: a.textContent.trim().slice(0, 8), right: Math.round(a.getBoundingClientRect().right)}))), viewport: 390};
  await ctx.close();
}

// L3 조합 갤러리 확대 보기 390: 도구 줄이 잘리는가
{
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}}); const page = await ctx.newPage();
  await page.goto(ROOT + 'combos/'); await page.waitForSelector('html[data-ready="true"]');
  await page.click('.combo-card .thumb-hit >> nth=0'); await page.waitForSelector('#viewer[open]');
  const rows = await page.$$eval('#viewer-bar > *, #viewer-bar *', els => els.filter(e => { const r = e.getBoundingClientRect(); return e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && r.width > 0; }).map(e => ({id: e.id, cls: e.className, scrollW: e.scrollWidth, clientW: e.clientWidth, overflowX: getComputedStyle(e).overflowX})));
  const buttons = await page.$$eval('#viewer-bar button', l => l.map(b => ({t: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 8), left: Math.round(b.getBoundingClientRect().left), right: Math.round(b.getBoundingClientRect().right), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height)})));
  out.L3 = {scrollables: rows, buttons, viewport: 390};
  await ctx.close();
}

// L4 터치 대상 크기(44px 미만) — 390 갤러리 목록의 주요 컨트롤
{
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}}); const page = await ctx.newPage();
  await page.goto(ROOT + 'combos/'); await page.waitForSelector('html[data-ready="true"]');
  const small = await page.$$eval('button, select, input, a.nav-link', els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44) && !e.closest('[hidden]') && !e.closest('details:not([open])'); }).map(e => ({tag: e.tagName, id: e.id, text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 12), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height)})).slice(0, 25));
  out.L4 = {count: small.length, sample: small};
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await browser.close();
