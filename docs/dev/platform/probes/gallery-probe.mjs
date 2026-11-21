// 단일 파일 갤러리(site/gallery/index.html, scripts/gallery.mjs 생성) 결함 재현 프로브.
// 실행: PORT=4201 node scripts/serve.mjs & BASE=http://127.0.0.1:4201/ node docs/dev/platform/probes/gallery-probe.mjs
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const BASE = (process.env.BASE ?? 'http://127.0.0.1:4201/') + 'site/gallery/index.html';
const browser = await chromium.launch();
const out = {};
async function open(viewport = {width: 390, height: 844}) {
  const ctx = await browser.newContext({viewport, acceptDownloads: true});
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(BASE); await page.waitForSelector('#tab-templates .card');
  return page;
}
const bpOf = async page => JSON.parse(await (async () => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlj')]); return readFile(await dl.path(), 'utf8'); })());
const htmlOf = async page => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]); return readFile(await dl.path(), 'utf8'); };
const openSettings = async page => { if (!(await page.$eval('#panel', e => e.classList.contains('open')))) await page.click('#opts'); };

// G1 개요: 390px 가로 넘침, 첫 화면
{
  const page = await open();
  out.G1 = {overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), cards: await page.$$eval('#tab-templates .card', l => l.length), errors: page.errors};
  await page.context().close();
}

// G2 보기에서 고친 축이 테마·템플릿·변형·구성 변경 때 남는가
{
  const page = await open();
  await page.click('#tab-templates .card >> nth=0'); await page.waitForSelector('#viewer.open');
  await openSettings(page);
  const before0 = await bpOf(page);
  const pick = (await page.$$eval('#a-density option', l => l.map(o => o.value))).find(v => v !== before0.density);
  await page.selectOption('#a-density', pick);
  const edited = await bpOf(page);
  await page.selectOption('#f-theme', {index: 4});
  const afterTheme = await bpOf(page);
  await page.selectOption('#a-density', pick);
  await page.selectOption('#f-var', {index: 1});
  const afterVariant = await bpOf(page);
  await page.selectOption('#a-density', pick);
  const tplOpts = await page.$$eval('#f-tpl option', l => l.map(o => o.value));
  await page.selectOption('#f-tpl', tplOpts[3]);
  const afterTemplate = await bpOf(page);
  out.G2 = {original: before0.density, edited: edited.density, afterThemeChange: afterTheme.density, afterVariantChange: afterVariant.density, afterTemplateChange: afterTemplate.density, errors: page.errors};
  await page.context().close();
}

// G3 금지 조합을 고르면 JSON과 HTML 내보내기가 서로 다른 상태를 내보내는가
{
  const page = await open();
  await page.click('nav.tabs button[data-tab="axes"]');
  await page.click('#tab-axes .pill[data-k="elevation"][data-v="glow"]');
  await page.waitForSelector('#viewer.open');
  const errsText = await page.$eval('#errs', e => ({open: e.classList.contains('open'), text: e.textContent.slice(0, 160)}));
  await openSettings(page);
  // saas-landing(trust 테마) + elevation=glow 는 X05 금지 조합이다. 미리보기는 마지막 유효 화면 그대로다.
  const bp = await bpOf(page), html = await htmlOf(page);
  const outHtmlElevation = html.match(/data-elevation="(\w+)"/)?.[1] ?? (html.includes('elevation:glow') ? 'glow' : null);
  out.G3 = {errorShown: errsText, jsonExportedElevation: bp.elevation, htmlExportedHasGlow: /glow/.test(html), htmlLength: html.length, errors: page.errors};
  await page.context().close();
}

// G4 구성 변형을 여러 슬롯에 동시에 고를 수 있는가
{
  const page = await open();
  await page.click('#tab-templates .card >> nth=0'); await page.waitForSelector('#viewer.open'); await openSettings(page);
  const groups = await page.$$eval('#f-lay optgroup', l => l.map(g => g.label));
  await page.selectOption('#f-lay', {index: 1});
  const first = await page.inputValue('#f-lay');
  const second = await page.$$eval('#f-lay option', l => l.map(o => o.value).filter(Boolean).find(v => v.split(':')[0] !== document.getElementById('f-lay').value.split(':')[0]));
  await page.selectOption('#f-lay', second);
  out.G4 = {slotGroups: groups, first, second, selectedNow: await page.inputValue('#f-lay'), canHoldTwoSlots: false, errors: page.errors};
  await page.context().close();
}

// G5 확대 보기와 탭이 history·URL에 남는가
{
  const page = await open();
  const u0 = page.url(), h0 = await page.evaluate(() => history.length);
  await page.click('nav.tabs button[data-tab="themes"]');
  const afterTab = {url: page.url(), hist: await page.evaluate(() => history.length)};
  await page.click('nav.tabs button[data-tab="templates"]');
  await page.click('#tab-templates .card >> nth=0'); await page.waitForSelector('#viewer.open');
  const afterOpen = {url: page.url(), hist: await page.evaluate(() => history.length)};
  await page.goBack().catch(() => {}); await page.waitForTimeout(300);
  out.G5 = {initial: {url: u0, hist: h0}, afterTab, afterOpen, afterBack: page.url(), errors: page.errors};
  await page.context().close();
}

// G6 단축키·접근성: Escape, 포커스 복귀
{
  const page = await open();
  await page.focus('#tab-templates .card >> nth=2');
  await page.keyboard.press('Enter'); await page.waitForSelector('#viewer.open');
  const focusInViewer = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const focusAfterClose = await page.evaluate(() => { const a = document.activeElement; return a?.className ? a.tagName + '.' + a.className : a?.tagName; });
  const focusedIndexCard = await page.evaluate(() => [...document.querySelectorAll('#tab-templates .card')].indexOf(document.activeElement));
  out.G6 = {focusInViewer, focusAfterClose, focusedIndexCard, errors: page.errors};
  await page.context().close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
