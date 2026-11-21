// 조립기(index.html + src/workbench.mjs) 결함 재현 프로브. 소스를 고치지 않고 실제 Chromium으로 조작해 관찰 값만 출력한다.
// 실행: PORT=4201 node scripts/serve.mjs & BASE=http://127.0.0.1:4201/ node docs/dev/platform/probes/workbench-probe.mjs
import {chromium} from 'playwright';
import {createBlueprint} from '../../../../src/catalog.mjs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4201/';
const browser = await chromium.launch();
const out = {};

async function open(viewport = {width: 1600, height: 1000}) {
  const ctx = await browser.newContext({viewport, acceptDownloads: true});
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(BASE); await page.waitForSelector('#workspace:not([hidden])');
  await page.evaluate(() => { document.querySelector('.raw-editor').open = true; });
  return page;
}
const bp = async page => JSON.parse(await page.inputValue('#blueprint-editor'));
const summary = page => page.textContent('#selection-summary');
async function editTitle(page, path, title) {
  await page.click(`#tree button[data-path="${path}"]`);
  const node = JSON.parse(await page.inputValue('#node-editor')); node.title = title;
  await page.fill('#node-editor', JSON.stringify(node)); await page.click('#apply-node');
}
const axis = (page, key, value) => page.locator(`label:has(input[data-axis="${key}"][value="${value}"])`).click();
const find = (b, title) => JSON.stringify(b.tree).includes(title);

// W1 상태 분산: 다시 불러오면 무엇이 남고 무엇이 사라지는가
{
  const page = await open();
  await page.click('#tree button[data-path="1"]');
  await page.click('#palette-families [data-family]:nth-child(3)');
  await page.fill('#palette-search', 'blue');
  await page.click('[data-device="tablet"]');
  await page.click('#catalog-tab');
  const before = {family: await page.$eval('#palette-families [aria-pressed="true"],#palette-families .active', e => e.textContent).catch(() => null), url: page.url()};
  await page.click('#builder-tab');
  await axis(page, 'density', 'spacious');
  const urlBefore = page.url();
  const storageKeys = await page.evaluate(() => Object.keys(localStorage));
  await page.reload(); await page.waitForSelector('#workspace:not([hidden])');
  out.W1 = {
    urlBefore, urlAfterReload: page.url(), storageKeys,
    selectedNodeAfterReload: await page.$$eval('#tree button.selected', l => l.map(x => x.textContent)),
    paletteSearchAfterReload: await page.inputValue('#palette-search'),
    activeTabAfterReload: await page.$eval('#builder-tab', e => e.getAttribute('aria-pressed')),
    deviceAfterReload: await page.$eval('[data-device][aria-checked="true"]', e => e.dataset.device),
    storedKeysInSavedBlueprint: await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('winterholic-static-kit.blueprint.v3')).sel)),
    errors: page.errors,
  };
  await page.context().close();
}

// W2 useTheme: 사용자가 고친 내용·축·이름이 테마를 바꾸면 남는가
{
  const page = await open();
  await page.fill('#project-name', '내 프로젝트'); await page.dispatchEvent('#project-name', 'change');
  await editTitle(page, 0, 'EDITED-TITLE');
  await axis(page, 'density', 'spacious');
  const b0 = await bp(page);
  await page.selectOption('#theme', 'botanical');
  const b1 = await bp(page);
  out.W2 = {before: {name: b0.name, titleEdited: find(b0, 'EDITED-TITLE'), density: b0.density, theme: b0.theme}, afterThemeChange: {name: b1.name, titleEdited: find(b1, 'EDITED-TITLE'), density: b1.density, theme: b1.theme}, errors: page.errors};
  // 같은 경로: 테마 변형 칩
  const page2 = page;
  await page2.selectOption('#theme', 'workspace');
  await editTitle(page2, 0, 'EDITED-2');
  const b2 = await bp(page2); const before = find(b2, 'EDITED-2');
  await page2.click('#theme-variants [data-variant="compact-ops"]');
  out.W2.variantChip = {titleKeptBefore: before, titleKeptAfter: find(await bp(page2), 'EDITED-2')};
  await page.context().close();
}

// W3 레이아웃 슬롯: 구성 변형을 고르면 템플릿 children을 다시 적용하는가
{
  const page = await open();
  await editTitle(page, 0, 'EDITED-TITLE');
  await page.click('#tree button[data-path="1"]');
  const grid = JSON.parse(await page.inputValue('#node-editor')); grid.children[0].label = 'EDITED-METRIC';
  await page.fill('#node-editor', JSON.stringify(grid)); await page.click('#apply-node');
  const b0 = await bp(page);
  const chip = page.locator('#layout-slots [data-slot][data-option]:not([data-option="default"])').first();
  const picked = await chip.getAttribute('data-slot') + ':' + await chip.getAttribute('data-option');
  await chip.click();
  const b1 = await bp(page);
  out.W3 = {picked, before: {title: find(b0, 'EDITED-TITLE'), metric: find(b0, 'EDITED-METRIC')}, after: {title: find(b1, 'EDITED-TITLE'), metric: find(b1, 'EDITED-METRIC')}, errors: page.errors};
  // 슬롯과 무관한 부분(차트·목록)이 템플릿 기본으로 돌아가는지: aside 안 목록 제목을 고치고 같은 슬롯 클릭
  await page.context().close();
}

// W4 sel 선수정 후 commit 실패
{
  const page = await open();
  await page.selectOption('#theme', 'workspace');
  await page.click('#theme-variants [data-variant="compact-ops"]');
  const imported = createBlueprint('dashboard-overview', 'ledger');
  await page.fill('#blueprint-editor', JSON.stringify(imported)); await page.click('#apply-blueprint');
  const afterImport = {theme: (await bp(page)).theme, variantChips: await page.$$eval('#theme-variants [aria-checked="true"]', l => l.length)};
  page.errors.length = 0;
  await page.selectOption('#template', 'saas-landing');
  const b = await bp(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download-json')]);
  out.W4 = {afterImport, afterTemplateChange: {selectShows: await page.inputValue('#template'), blueprintName: b.name, blueprintPageType: b.pageType, summary: await summary(page), downloadName: dl.suggestedFilename()}, errors: page.errors};
  page.errors.length = 0;
  const slotChip = page.locator('#layout-slots [data-slot][data-option]:not([data-option="default"])').first();
  await slotChip.click().catch(e => page.errors.push('click: ' + e.message.slice(0, 80)));
  out.W4.layoutChipAfterStaleVariant = {errors: [...page.errors]};
  // selected 변형: 필수 부품 삭제가 검증에 실패하면 선택 경로와 트리는?
  const p2 = await open();
  const types = await p2.$$eval('#tree > ul > li > ul > li > button', l => l.map(x => x.textContent));
  out.W4.treeTopLevel = types;
  let removed = null;
  for (let i = 3; i >= 1; i--) {
    await p2.click(`#tree button[data-path="${i}"]`);
    const label = await p2.textContent('#selected-node');
    await p2.click('#remove-node');
    const hidden = await p2.$eval('#errors', e => e.hidden);
    const b2 = await bp(p2);
    if (!hidden) { removed = {index: i, label, errorsText: (await p2.textContent('#errors-text')).slice(0, 200), treeStillHasNode: b2.tree.children.length, selectedAfterFail: await p2.$$eval('#tree button.selected', l => l.map(x => x.textContent)), validStatus: await p2.textContent('#valid-status')}; break; }
  }
  out.W4.removeRequired = removed;
  await p2.context().close(); await page.context().close();
}

// W5 JSON 가져오기 후 선택 상태 불일치
{
  const page = await open();
  const imported = createBlueprint('saas-landing', 'aurora');
  await page.fill('#blueprint-editor', JSON.stringify(imported)); await page.click('#apply-blueprint');
  const b = await bp(page);
  const state = async () => ({blueprintName: (await bp(page)).name, blueprintTheme: (await bp(page)).theme, blueprintPageType: (await bp(page)).pageType, templateSelect: await page.inputValue('#template'), summary: await summary(page), pageTypeText: await page.textContent('#page-type'), layoutSlots: await page.$$eval('#layout-slots .slot legend', l => l.map(x => x.textContent)), recipeShown: !(await page.$eval('#recipe-field', e => e.hidden))});
  out.W5 = {afterImport: await state()};
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download-json')]);
  out.W5.downloadName = dl.suggestedFilename();
  await page.reload(); await page.waitForSelector('#workspace:not([hidden])');
  out.W5.afterReload = await state();
  await page.context().close();
}

// W6 다크 보기가 문서의 mode를 바꾸는가
{
  const page = await open();
  await page.evaluate(() => 0);
  const stored0 = JSON.parse(await page.evaluate(() => localStorage.getItem('winterholic-static-kit.blueprint.v3')) ?? 'null');
  await page.click('#mode');
  const b1 = await bp(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download-json')]);
  const text = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8');
  const stored1 = JSON.parse(await page.evaluate(() => localStorage.getItem('winterholic-static-kit.blueprint.v3')));
  const frame = page.frameLocator('#preview-frame');
  const dataTheme = await page.evaluate(() => document.getElementById('preview-frame').srcdoc.match(/data-theme="(\w+)"/)[1]);
  await page.click('#mode');
  const b2 = await bp(page);
  // auto 문서
  await page.click('label:has(input[name="mode"][value="auto"])');
  const bAuto = await bp(page);
  await page.click('#mode'); const bAutoDark = await bp(page);
  await page.click('#mode'); const bAutoBack = await bp(page);
  out.W6 = {initialMode: stored0 && stored0.blueprint.mode, afterClickDark: b1.mode, buttonText: await page.textContent('#mode'), downloadedJsonMode: JSON.parse(text).mode, storedMode: stored1.blueprint.mode, previewDataTheme: dataTheme, afterClickBack: b2.mode, auto: {set: bAuto.mode, afterDark: bAutoDark.mode, afterRestore: bAutoBack.mode}, errors: page.errors};
  await page.context().close();
}

// W7 카탈로그·조립기 전환이 URL 라우팅인가
{
  const page = await open();
  const u0 = page.url();
  await page.click('#catalog-tab');
  const u1 = page.url(), hist = await page.evaluate(() => history.length);
  await page.goBack().catch(() => {});
  const afterBack = page.url();
  await page.goto(BASE + '#catalog'); await page.waitForSelector('#catalog:not([hidden])');
  const deep = {hashDeepLinkWorks: !(await page.$eval('#catalog', e => e.hidden))};
  await page.click('#builder-tab');
  const afterBuilder = page.url();
  await page.click('#catalog-tab');
  await page.click('#catalog-tabs [role="tab"]:nth-child(2)').catch(() => {});
  const u2 = page.url();
  const urlBeforeReload = page.url();
  await page.reload(); await page.waitForFunction(() => !document.getElementById('workspace').hidden || !document.getElementById('catalog').hidden);
  out.W7 = {initialUrl: u0, urlAfterCatalogTab: u1, historyLength: hist, urlAfterGoBack: afterBack, deep, urlAfterReturningToBuilder: afterBuilder, urlAfterCatalogSubtab: u2, urlBeforeReload, catalogVisibleAfterReload: !(await page.$eval('#catalog', e => e.hidden)), errors: page.errors};
  await page.context().close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
