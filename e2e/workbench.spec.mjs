import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {themes, palettes, createBlueprint} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
const frame = page => page.frameLocator('#preview-frame');
async function loaded(page) { await page.goto('/'); await expect(page.locator('#valid-status')).toContainText('검증 통과'); await expect(frame(page).locator('h1')).toBeVisible(); }
const bodyFits = async locator => locator.evaluate(el => ({viewport: el.clientWidth, scroll: el.scrollWidth}));
const toRgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(x => parseInt(x, 16)).join(', ') + ')';

test('all 40 themes × 160 palettes × light/dark: real computed colors, no errors', async ({page}) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); await loaded(page);
  let checked = 0, forbidden = 0;
  for (const t of Object.values(themes)) {
    await page.locator('#theme').selectOption(t.id);
    await expect(page.locator('#theme-description')).toHaveText(t.description);
    for (const p of t.palettes) {
      await page.locator(`label.palette-option:has(input[value="${p}"])`).click();
      for (const mode of ['light', 'dark']) {
        const probe = createBlueprint('dashboard-overview', t.id, p); probe.mode = mode;
        if (!validateBlueprint(probe).valid) { // a theme forbid or axis ban (e.g. glow in light) must reject it visibly instead of rendering it
          await page.locator(`label.mode-option:has(input[value=${mode}])`).click(); await expect(page.locator('#errors')).toContainText(/THEME_FORBID|AXIS_BAN/); forbidden++;
          await page.locator(`label.mode-option:has(input[value=${mode === 'light' ? 'dark' : 'light'}])`).click(); await expect(page.locator('#errors')).toBeHidden(); continue;
        }
        await page.locator(`label.mode-option:has(input[value=${mode}])`).click();
        await expect(frame(page).locator('html')).toHaveAttribute('data-theme', mode);
        const actual = await frame(page).locator('body').evaluate(el => ({text: getComputedStyle(el).color}));
        const b = createBlueprint('dashboard-overview', t.id, p); b.mode = mode;
        expect(actual.text).toBe(toRgb(compile(b).tokens[mode].text));
        const canvas = await frame(page).locator('.kit-card, .kit-metric').first().evaluate(el => getComputedStyle(el).backgroundColor);
        expect(canvas).toBe(toRgb(compile(b).tokens[mode].surface));
        await expect(page.locator('#errors')).toBeHidden(); checked++;
      }
    }
  }
  expect(checked + forbidden).toBe(320); expect(errors).toEqual([]);
});

test('keyboard selection and persistence survive reload', async ({page}) => {
  await loaded(page);
  await page.locator('#theme').selectOption('dining'); await expect(page.locator('#selection-summary')).toContainText('다이닝');
  await page.locator('input[name=palette]').nth(1).focus(); await page.keyboard.press('ArrowDown');
  await page.reload(); await expect(page.locator('#theme')).toHaveValue('dining');
});

test('strict JSON errors block exports, keep valid preview, and recover', async ({page}) => {
  await loaded(page); const original = await frame(page).locator('h1').textContent();
  await page.locator('#node-editor').fill(JSON.stringify({type: 'page', style: 'color:red', children: []})); await page.locator('#apply-node').click();
  await expect(page.locator('#errors')).toContainText('UNKNOWN_KEY'); await expect(page.locator('#download-html')).toBeDisabled(); await expect(page.locator('#download-json')).toBeDisabled(); await expect(frame(page).locator('h1')).toHaveText(original);
  await page.locator('#reset').click(); await expect(page.locator('#errors')).toBeHidden(); await expect(page.locator('#download-html')).toBeEnabled();
  await page.locator('#add-node').selectOption('notice'); await page.locator('#add').click(); await expect(frame(page).getByText('알려드릴 내용입니다.')).toBeVisible();
  await page.locator('#move-up').click(); await expect(page.locator('#selected-node')).toHaveText('알림'); await page.locator('#remove-node').click(); await expect(frame(page).getByText('알려드릴 내용입니다.')).toHaveCount(0);
  await page.locator('#tree button[data-path="3"]').click();
  const node = JSON.parse(await page.locator('#node-editor').inputValue()); node.state = 'error'; await page.locator('#node-editor').fill(JSON.stringify(node)); await page.locator('#apply-node').click(); await expect(frame(page).getByRole('alert')).toContainText('불러오지 못했습니다.');
  const wait = page.waitForEvent('download'); await page.locator('#download-html').click(); const file = await wait; const content = await readFile(await file.path(), 'utf8'); expect(content).toContain('data-state="error"'); expect(content).toContain('Content-Security-Policy');
});

test('forbidden axis combinations are rejected with the rule, and auto-fix resolves them', async ({page}) => {
  await loaded(page);
  await page.locator('#axis-density').selectOption('compact'); await expect(page.locator('#errors')).toBeHidden();
  await page.locator('#axis-shell').selectOption('dock');
  await expect(page.locator('#errors')).toContainText('AXIS_BAN'); await expect(page.locator('#errors')).toContainText('X01'); await expect(page.locator('#download-html')).toBeDisabled();
  await page.locator('#auto-fix').click(); await expect(page.locator('#errors')).toBeHidden(); await expect(page.locator('#axis-density')).not.toHaveValue('compact');
  await page.locator('#theme').selectOption('civic'); await page.locator('#axis-backdrop').selectOption('gradient'); await expect(page.locator('#errors')).toContainText('THEME_FORBID');
});

test('every template, every shell: workbench renders without overflow at desktop and phone widths', async ({page}) => {
  test.setTimeout(240000);
  await loaded(page);
  const options = await page.locator('#template option').evaluateAll(els => els.map(e => e.value));
  expect(options.length).toBeGreaterThanOrEqual(60);
  for (const id of options.slice(0, 24)) {
    await page.locator('#template').selectOption(id); await expect(page.locator('#valid-status')).toContainText('검증 통과');
    const sizes = await bodyFits(frame(page).locator('body')); expect(sizes.scroll, id).toBeLessThanOrEqual(sizes.viewport + 1);
  }
  await page.locator('#template').selectOption('saas-landing');
  for (const shell of ['sidebar', 'topbar', 'editorial', 'split', 'rail', 'centered', 'stacked', 'dock', 'minimal', 'masthead']) {
    await page.locator('#axis-density').selectOption('comfortable'); await page.locator('#axis-width').selectOption('wide'); await page.locator('#axis-footer').selectOption('simple');
    await page.locator('#axis-shell').selectOption(shell);
    if (await page.locator('#errors').isVisible()) await page.locator('#auto-fix').click();
    await expect(frame(page).locator('.kit-shell')).toHaveAttribute('data-shell', /./);
    const sizes = await bodyFits(frame(page).locator('body')); expect(sizes.scroll, shell).toBeLessThanOrEqual(sizes.viewport + 1);
  }
  for (const width of [390, 768, 1600]) {
    await page.setViewportSize({width, height: 900});
    if (width === 390) await page.locator('.mobile-tabs button[data-panel=preview]').click();
    const outer = await bodyFits(page.locator('body')), inner = await bodyFits(frame(page).locator('body'));
    expect(outer.scroll).toBeLessThanOrEqual(outer.viewport + 1); expect(inner.scroll).toBeLessThanOrEqual(inner.viewport + 1);
    if (width === 390) { await page.locator('.mobile-tabs button[data-panel=structure]').click(); await expect(page.locator('#node-editor')).toBeVisible(); await page.locator('.mobile-tabs button[data-panel=choices]').click(); await expect(page.locator('#template')).toBeVisible(); }
  }
});

test('demo form validates locally and never sends user input over the network', async ({page}) => {
  const requests = []; await loaded(page); await page.locator('#template').selectOption('contact');
  page.on('request', request => { if (!request.url().startsWith('data:')) requests.push(request.url()); });
  const f = frame(page); await f.locator('button[type=submit]').click(); await expect(f.locator('.kit-form-status')).toHaveText('');
  await f.locator('#field-name').fill('김다선'); await f.locator('#field-email').fill('hello@example.com'); await f.locator('#field-topic').selectOption({label: '예약 변경'}); await f.locator('#field-body').fill('규칙 안에서 다양한 디자인을 조립합니다.'); await f.locator('#field-agree').check(); await f.locator('button[type=submit]').click();
  await expect(f.locator('.kit-form-status')).toContainText('저장하지 않았습니다'); expect(requests).toEqual([]);
});

test('catalog tab lists all themes and parts, and choosing a theme returns to the builder', async ({page}) => {
  await loaded(page); await page.locator('#catalog-tab').click();
  await expect(page.locator('.catalog-card')).toHaveCount(40); await expect(page.locator('#parts-grid li')).toHaveCount(55); await expect(page.locator('#catalog-counts')).toContainText('160개 팔레트');
  await page.locator('[data-choose-theme=editorial]').click(); await expect(page.locator('#theme')).toHaveValue('editorial');
});
