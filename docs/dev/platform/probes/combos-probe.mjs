// 조합 갤러리(combos/index.html + src/combos/app.mjs) 결함 재현 프로브. 소스를 고치지 않고 실제 Chromium으로 조작한다.
// 실행: PORT=4201 node scripts/serve.mjs & BASE=http://127.0.0.1:4201/ node docs/dev/platform/probes/combos-probe.mjs
import {chromium} from 'playwright';
const BASE = (process.env.BASE ?? 'http://127.0.0.1:4201/') + 'combos/';
const browser = await chromium.launch();
const out = {};
async function open(url = BASE, viewport = {width: 1280, height: 900}) {
  const ctx = await browser.newContext({viewport});
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(url); await page.waitForSelector('html[data-ready="true"]');
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  return page;
}
const q = page => new URL(page.url()).search;
const histLen = page => page.evaluate(() => history.length);
const controls = page => page.evaluate(() => ({
  q: document.getElementById('q').value, type: document.getElementById('f-type').value, template: document.getElementById('f-template').value,
  sort: document.getElementById('f-sort').value, size: document.getElementById('f-size').value,
  same: document.getElementById('f-same').checked, flagged: document.getElementById('f-flagged').checked, tall: document.getElementById('f-tall').checked,
  exp: document.getElementById('f-exp').checked, rec: document.getElementById('f-rec').checked, concept: document.getElementById('f-concept').value,
  slots: [...document.querySelectorAll('#slot-filters select')].map(s => s.value).filter(Boolean),
  viewTheme: document.getElementById('g-theme').value, viewPal: document.getElementById('g-pal').value, viewMode: document.querySelector('#g-mode [aria-checked="true"]')?.dataset.mode,
  result: document.getElementById('result-line').textContent,
}));

// C1 필터 초기화
{
  const page = await open();
  await page.fill('#q', '히어로'); await page.waitForTimeout(300);
  await page.selectOption('#f-type', {index: 2});
  await page.selectOption('#f-sort', 'changed');
  await page.selectOption('#f-size', '96');
  await page.check('#f-same'); await page.check('#f-rec'); await page.check('#f-exp'); await page.check('#f-tall');
  await page.selectOption('#f-concept', {index: 1});
  const firstSlot = page.locator('#slot-filters select').first(); await firstSlot.selectOption({index: 2});
  await page.selectOption('#g-theme', {index: 2});
  await page.click('#g-mode [data-mode="dark"]');
  const before = await controls(page), urlBefore = q(page);
  await page.click('#clear-filters'); await page.waitForTimeout(300);
  out.C1 = {before, urlBefore, after: await controls(page), urlAfter: q(page), errors: page.errors};
  // 다시 불러오면 남은 값이 URL에서 복원되는가(남은 값이 정말 상태에도 있는지)
  await page.reload(); await page.waitForSelector('html[data-ready="true"]');
  out.C1.afterReload = await controls(page);
  await page.context().close();
}

// C1b 현재 쪽 번호·필터 초기화 후 쪽
{
  const page = await open(BASE + '?p=3');
  const a = await page.textContent('#result-line');
  await page.click('#clear-filters'); await page.waitForTimeout(200);
  out.C1b = {startOnPage3: a, afterClear: await page.textContent('#result-line'), url: q(page)};
  await page.context().close();
}

// C2 URL·history
{
  const page = await open();
  const h0 = await histLen(page), u0 = q(page);
  await page.selectOption('#f-type', {index: 2}); await page.fill('#q', '히어로'); await page.waitForTimeout(300);
  const afterFilters = {url: q(page), hist: await histLen(page), pushed: (await histLen(page)) - h0};
  await page.click('#pager-top [data-page="2"], #pager-top [aria-label="다음 쪽"]').catch(() => {});
  const afterPage = {url: q(page), hist: await histLen(page)};
  // 확대 보기
  await page.click('.combo-card .thumb-hit >> nth=0');
  await page.waitForSelector('#viewer[open]');
  const opened = {url: q(page), hist: await histLen(page)};
  await page.click('#v-next'); await page.click('#v-next'); await page.click('#v-next');
  const stepped = {url: q(page), hist: await histLen(page)};
  await page.goBack(); await page.waitForTimeout(300);
  const back1 = {url: q(page), viewerOpen: await page.$eval('#viewer', e => e.open), filters: await controls(page)};
  await page.goForward(); await page.waitForTimeout(300);
  const fwd = {url: q(page), viewerOpen: await page.$eval('#viewer', e => e.open)};
  await page.click('#v-close'); await page.waitForTimeout(300);
  const closed = {url: q(page), viewerOpen: await page.$eval('#viewer', e => e.open), hist: await histLen(page)};
  await page.goBack(); await page.waitForTimeout(300);
  const back2 = {url: page.url(), viewerOpen: await page.evaluate(() => document.getElementById('viewer')?.open ?? 'no-page')};
  out.C2 = {initial: {url: u0, hist: h0}, afterFilters, afterPage, opened, stepped, back1, fwd, closed, backAfterClose: back2, errors: page.errors};
  await page.context().close();
}

// C2b 필터를 바꾼 뒤 뒤로 가기는 필터를 되돌리는가
{
  const page = await open(BASE + '?pt=landing');
  const a = await controls(page);
  await page.selectOption('#f-sort', 'changed'); await page.waitForTimeout(150);
  await page.selectOption('#f-size', '24'); await page.waitForTimeout(150);
  const changed = {url: q(page), controls: await controls(page)};
  await page.goBack().catch(() => {}); await page.waitForTimeout(500);
  out.C2b = {start: a.type + '/' + a.sort + '/' + a.size, changed: changed.controls.sort + '/' + changed.controls.size, afterBackUrl: page.url()};
  await page.context().close();
}

// C2c 공유 링크로 들어와 확대 보기에서 뒤로 가기, 새로고침 후 뒤로 가기
{
  const page = await open(BASE + '?c=saas-landing');
  const opened = {viewerOpen: await page.$eval('#viewer', e => e.open), url: q(page), hist: await histLen(page)};
  await page.reload(); await page.waitForSelector('html[data-ready="true"]'); await page.waitForTimeout(300);
  const reloaded = {viewerOpen: await page.$eval('#viewer', e => e.open), url: q(page), hist: await histLen(page)};
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const esc = {viewerOpen: await page.$eval('#viewer', e => e.open), url: q(page), hist: await histLen(page)};
  out.C2c = {opened, reloaded, afterEscape: esc, errors: page.errors};
  await page.context().close();
}

// C2d 보기 설정(테마)을 바꾼 뒤 이상함 목록에서 열기 / 뒤로 가기 시 보기 설정
{
  const page = await open();
  await page.selectOption('#g-theme', {index: 3});
  const themeSet = q(page);
  await page.click('.combo-card .thumb-hit >> nth=0'); await page.waitForSelector('#viewer[open]');
  await page.selectOption('#v-theme', {index: 5}); await page.waitForTimeout(200);
  const inViewer = q(page);
  await page.goBack(); await page.waitForTimeout(300);
  out.C2d = {themeSet, inViewer, afterBack: q(page), galleryThemeSelect: await page.inputValue('#g-theme'), gridUsesNewView: null};
  await page.context().close();
}

// C2e 확대 보기에서 고른 보기 설정은 닫으면 사라지는가(갤러리와 같은 상태를 공유한다고 설명됨)
{
  const page = await open();
  await page.selectOption('#g-theme', {index: 3});
  const galleryBefore = await page.inputValue('#g-theme');
  await page.click('.combo-card .thumb-hit >> nth=0'); await page.waitForSelector('#viewer[open]');
  await page.selectOption('#v-theme', {index: 5}); await page.waitForTimeout(200);
  const viewerTheme = await page.inputValue('#v-theme'), galleryWhileOpen = await page.inputValue('#g-theme');
  await page.click('#v-close'); await page.waitForTimeout(400);
  out.C2e = {galleryBefore, viewerTheme, galleryWhileOpen, galleryAfterClose: await page.inputValue('#g-theme'), urlAfterClose: q(page)};
  await page.context().close();
}

// C2f 공유 링크를 새로고침하면 history 항목이 늘어나는가: 뒤로 가기를 몇 번 눌러야 나가는가
{
  const page = await open(BASE + '?c=saas-landing');
  await page.reload(); await page.waitForSelector('html[data-ready="true"]'); await page.waitForTimeout(300);
  await page.reload(); await page.waitForSelector('html[data-ready="true"]'); await page.waitForTimeout(300);
  const steps = [];
  for (let i = 0; i < 6; i++) {
    await page.goBack().catch(() => {}); await page.waitForTimeout(300);
    const url = page.url();
    steps.push(url.startsWith('about:') ? 'about:blank' : url.replace(BASE, '') || '(list)');
    if (url.startsWith('about:')) break;
  }
  out.C2f = {backSteps: steps};
  await page.context().close();
}

// C3 390px 개요
{
  const page = await open(BASE, {width: 390, height: 800});
  out.C3 = {overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), errors: page.errors};
  await page.context().close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
