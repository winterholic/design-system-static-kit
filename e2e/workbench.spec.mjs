import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {themes, palettes, templateList, pageTypes, createBlueprint, nodeTypes} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
const frame = page => page.frameLocator('#preview-frame');
async function loaded(page) { await page.goto('/'); await expect(page.locator('#valid-status')).toContainText('검증 통과'); await expect(frame(page).locator('h1')).toBeVisible(); }
const bodyFits = async locator => locator.evaluate(el => ({viewport: el.clientWidth, scroll: el.scrollWidth}));
const toRgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(x => parseInt(x, 16)).join(', ') + ')';
const pickAxis = (page, key, value) => page.locator(`#axis-${key} label:has(input[value="${value}"])`).click();

test('every theme × its first three recommended palettes × light/dark: real computed colors, no errors', async ({page}) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); await loaded(page);
  let checked = 0, blocked = 0;
  for (const t of Object.values(themes)) {
    await page.locator('#theme').selectOption(t.id);
    await expect(page.locator('#theme-description')).toHaveText(t.description);
    for (const p of t.palettes.slice(0, 3)) {
      await page.locator(`label.palette-option:has(input[value="${p}"])`).click();
      for (const mode of ['light', 'dark']) {
        const radio = page.locator(`#mode-options input[value=${mode}]`);
        // A theme that forbids the mode (neon/game: light) blocks it; a rule conflict (glow in light, X05) is resolved by changing the other axis.
        if (await radio.isDisabled()) { expect(themes[t.id].forbid.mode ?? [], `${t.id}/${mode} blocked only when the theme forbids it`).toContain(mode); blocked++; continue; }
        await page.locator(`#mode-options label:has(input[value=${mode}])`).click();
        await expect(frame(page).locator('html')).toHaveAttribute('data-theme', mode);
        await expect(page.locator('#errors')).toBeHidden();
        const b = JSON.parse(await page.locator('#blueprint-editor').inputValue());
        expect(b.palette).toBe(p); expect(b.mode).toBe(mode); expect(validateBlueprint(b).valid).toBe(true);
        const actual = await frame(page).locator('body').evaluate(el => getComputedStyle(el).color);
        expect(actual).toBe(toRgb(compile(b).tokens[mode].text));
        const surface = await frame(page).locator('.kit-card, .kit-metric').first().evaluate(el => getComputedStyle(el).backgroundColor);
        expect(surface).toBe(toRgb(compile(b).tokens[mode].surface));
        checked++;
      }
    }
  }
  expect(checked + blocked).toBe(Object.keys(themes).length * 3 * 2); expect(errors).toEqual([]);
});

test('palette picker: recommendations lead, family filters and search reach the whole library, any palette fits any theme', async ({page}) => {
  await loaded(page);
  const count = () => page.locator('#palette-options .palette-option').count();
  await expect(page.locator('#palette-options .palette-option').first().locator('input')).toHaveValue(themes.workspace.palettes[0]);
  expect(await count()).toBe(themes.workspace.palettes.length);
  await page.locator('#palette-families [data-family=all]').click();
  expect(await count()).toBe(24); await expect(page.locator('#palette-more')).toBeVisible();
  await page.locator('#palette-more').click(); expect(await count()).toBe(48);
  await page.locator('#palette-families [data-family=green]').click();
  const greens = Object.values(palettes).filter(p => p.family === 'green').length;
  expect(await count()).toBe(Math.min(24, greens));
  await page.locator('#palette-search').fill('forest');
  await expect(page.locator('#palette-options .palette-option:has(input[value=forest])')).toBeVisible();
  await page.locator('#palette-options .palette-option:has(input[value=forest])').click();
  await expect(page.locator('#selection-summary')).toContainText(/포레스트|Forest/i);
  await page.locator('#theme').selectOption('neon');
  await expect(page.locator('#valid-status')).toContainText('검증 통과');
  await expect(page.locator('#palette-options input:checked')).toHaveValue(/./);
  await expect(page.locator('#errors')).toBeHidden();
});

test('theme variants and layout variants reshape the page without leaving the catalog', async ({page}) => {
  await loaded(page);
  await page.locator('#template').selectOption('saas-landing');
  await expect(page.locator('#layout-slots .slot')).not.toHaveCount(0);
  const before = await frame(page).locator('.kit-hero').getAttribute('data-variant');
  await page.locator('#layout-slots [data-slot=hero]:not([aria-checked=true])').first().click();
  await expect(frame(page).locator('.kit-hero')).not.toHaveAttribute('data-variant', before);
  await page.locator('#layout-slots [data-slot=hero][data-option=default]').click();
  await expect(frame(page).locator('.kit-hero')).toHaveAttribute('data-variant', before);
  await page.locator('#theme').selectOption('workspace');
  const variants = themes.workspace.variants;
  await page.locator(`#theme-variants [data-variant="${variants[0].id}"]`).click();
  await expect(page.locator('#selection-summary')).toContainText(variants[0].label);
  await expect(page.locator(`#theme-variants [data-variant="${variants[0].id}"]`)).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#errors')).toBeHidden();
  await page.locator('#theme-variants [data-variant=""]').click();
  await expect(page.locator('#selection-summary')).not.toContainText(variants[0].label);
});

test('keyboard selection and persistence survive reload', async ({page}) => {
  await loaded(page);
  await page.locator('#theme').selectOption('dining'); await expect(page.locator('#selection-summary')).toContainText('다이닝');
  await page.locator('#layout-slots .chip').first().focus();
  await page.reload(); await expect(page.locator('#theme')).toHaveValue('dining');
  await expect(page.locator('#valid-status')).toContainText('검증 통과');
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

test('axis controls block theme-forbidden values, adjust rule conflicts for the user, and keep the chosen value', async ({page}) => {
  await loaded(page);
  await pickAxis(page, 'density', 'compact'); await expect(page.locator('#errors')).toBeHidden();
  await expect(page.locator('#axis-density input[value=compact]')).toBeChecked();
  await page.locator('#axis-shell').selectOption('dock');
  await expect(page.locator('#errors')).toBeHidden();
  await expect(page.locator('#axis-shell')).toHaveValue('dock');
  await expect(page.locator('#axis-density input[value=compact]')).not.toBeChecked();
  await expect(page.locator('#save-status')).toContainText('X01');
  await page.locator('#theme').selectOption('civic');
  await expect(page.locator('#axis-backdrop input[value=gradient]')).toBeDisabled();
  await expect(page.locator('#axis-backdrop label:has(input[value=gradient])')).toHaveAttribute('title', /civic|시빅|쓰지 않습니다/);
});

test('every template, every shell: workbench renders without overflow at desktop and phone widths', async ({page}) => {
  test.setTimeout(300000);
  await loaded(page);
  const options = await page.locator('#template option').evaluateAll(els => els.map(e => e.value));
  expect(options.length).toBe(templateList.length); expect(options.length).toBeGreaterThanOrEqual(85);
  for (const id of options.filter((_, i) => i % 2 === 0)) {
    await page.locator('#template').selectOption(id); await expect(page.locator('#valid-status')).toContainText('검증 통과');
    const sizes = await bodyFits(frame(page).locator('body')); expect(sizes.scroll, id).toBeLessThanOrEqual(sizes.viewport + 1);
  }
  await page.locator('#template').selectOption('saas-landing');
  for (const shell of ['sidebar', 'topbar', 'editorial', 'split', 'rail', 'centered', 'stacked', 'dock', 'minimal', 'masthead']) {
    await pickAxis(page, 'density', 'comfortable'); await pickAxis(page, 'width', 'wide'); await pickAxis(page, 'footer', 'simple');
    // saas-landing is a landing page: its page type forbids sidebar, rail and dock, and the select disables them instead of failing later.
    if (!pageTypes.landing.shells.includes(shell)) { await expect(page.locator(`#axis-shell option[value=${shell}]`)).toBeDisabled(); continue; }
    await page.locator('#axis-shell').selectOption(shell);
    await expect(page.locator('#errors')).toBeHidden();
    await expect(frame(page).locator('.kit-shell')).toHaveAttribute('data-shell', shell);
    const sizes = await bodyFits(frame(page).locator('body')); expect(sizes.scroll, shell).toBeLessThanOrEqual(sizes.viewport + 1);
  }
  for (const width of [390, 768, 1100, 1600]) {
    await page.setViewportSize({width, height: 900});
    if (width === 390) await page.locator('.mobile-tabs button[data-panel=preview]').click();
    const outer = await bodyFits(page.locator('body')), inner = await bodyFits(frame(page).locator('body'));
    expect(outer.scroll, 'page at ' + width).toBeLessThanOrEqual(outer.viewport + 1); expect(inner.scroll, 'frame at ' + width).toBeLessThanOrEqual(inner.viewport + 1);
    if (width === 390) { await page.locator('.mobile-tabs button[data-panel=structure]').click(); await expect(page.locator('#node-editor')).toBeVisible(); await page.locator('.mobile-tabs button[data-panel=choices]').click(); await expect(page.locator('#template')).toBeVisible(); }
  }
});

test('preview is never clipped: every device width scales into the stage at laptop, tablet and phone sizes', async ({page}) => {
  await loaded(page);
  for (const [width, height] of [[1100, 800], [1440, 900], [1920, 1080], [768, 900], [390, 844]]) {
    await page.setViewportSize({width, height});
    if (width < 1024) await page.locator('.mobile-tabs button[data-panel=preview]').click();
    for (const device of ['phone', 'tablet', 'desktop', 'fit']) {
      await page.locator(`#device-options [data-device=${device}]`).click();
      const geo = await page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const s = r('preview-stage'), f = r('frame-shell'); return {stageL: s.left, stageR: s.right, stageB: s.bottom, l: f.left, r: f.right, b: f.bottom, doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth}; });
      expect(geo.l, `${device}@${width} left`).toBeGreaterThanOrEqual(geo.stageL - 1); expect(geo.r, `${device}@${width} right`).toBeLessThanOrEqual(geo.stageR + 1);
      expect(geo.doc, `${device}@${width} document`).toBeLessThanOrEqual(geo.vw + 1);
      const zoom = await page.locator('#zoom-status').textContent(); expect(zoom).toMatch(/\d+%/);
    }
  }
  // desktop 1280 in a ~700px stage is scaled, not cropped: the page's hero is fully inside the frame
  await page.setViewportSize({width: 1100, height: 800}); await page.locator('#device-options [data-device=desktop]').click();
  const box = await frame(page).locator('.kit-shell').evaluate(el => ({w: el.getBoundingClientRect().width, sw: el.scrollWidth}));
  expect(box.sw).toBeLessThanOrEqual(box.w + 1);
});

test('preview opens in a full-screen modal and in a new window', async ({page}) => {
  await loaded(page);
  await page.locator('#open-modal').click();
  const modal = page.locator('#preview-modal'); await expect(modal).toBeVisible();
  const fits = await modal.evaluate(el => { const r = el.getBoundingClientRect(); return {w: r.width, h: r.height, vw: innerWidth, vh: innerHeight}; });
  expect(fits.w).toBeGreaterThanOrEqual(fits.vw - 1); expect(fits.h).toBeGreaterThanOrEqual(fits.vh - 1);
  await expect(page.frameLocator('#modal-frame').locator('h1')).toBeVisible();
  await page.locator('#modal-devices [data-device=phone]').click();
  await expect(page.locator('#modal-status')).toContainText('390px');
  await page.locator('#modal-mode').click(); await expect(page.frameLocator('#modal-frame').locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape'); await expect(modal).toBeHidden(); await expect(page.locator('#open-modal')).toBeFocused();
  await page.locator('#mode').click(); await expect(frame(page).locator('html')).toHaveAttribute('data-theme', 'light');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('#open-window').click()]);
  await popup.waitForLoadState('load'); await expect(popup.locator('h1').first()).toBeVisible();
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.setViewportSize({width: 420, height: 800});
  const over = await popup.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})); expect(over.sw).toBeLessThanOrEqual(over.cw + 1);
  await popup.close();
});

test('demo form validates locally and never sends user input over the network', async ({page}) => {
  const requests = []; await loaded(page); await page.locator('#template').selectOption('contact');
  page.on('request', request => { if (!request.url().startsWith('data:') && !request.url().startsWith('blob:')) requests.push(request.url()); });
  const f = frame(page); await f.locator('button[type=submit]').click(); await expect(f.locator('.kit-form-status')).toHaveText('');
  await f.locator('#field-name').fill('김다선'); await f.locator('#field-email').fill('hello@example.com'); await f.locator('#field-topic').selectOption({label: '예약 변경'}); await f.locator('#field-body').fill('규칙 안에서 다양한 디자인을 조립합니다.'); await f.locator('#field-agree').check(); await f.locator('button[type=submit]').click();
  await expect(f.locator('.kit-form-status')).toContainText('저장하지 않았습니다'); expect(requests).toEqual([]);
});

test('catalog tab shows real renders of every template, theme, palette and part, and starting from a card returns to the builder', async ({page}) => {
  await loaded(page); await page.locator('#catalog-tab').click();
  await expect(page.locator('#catalog-counts')).toContainText(`팔레트 ${Object.keys(palettes).length}`);
  await expect(page.locator('#catalog-body .catalog-card')).toHaveCount(templateList.length);
  await expect(page.locator('#catalog-body .thumb iframe').first()).toBeVisible({timeout: 15000});
  await page.locator('#catalog-body [data-type=dashboard]').click();
  await expect(page.locator('#catalog-body .catalog-card')).toHaveCount(templateList.filter(t => t.pageType === 'dashboard').length);
  await page.locator('#catalog-tabs [data-tab=themes]').click(); await expect(page.locator('#catalog-body .catalog-card')).toHaveCount(Object.keys(themes).length);
  await page.locator('#catalog-tabs [data-tab=palettes]').click(); await expect(page.locator('#catalog-body .catalog-card')).toHaveCount(Object.keys(palettes).length);
  await page.locator('#catalog-tabs [data-tab=parts]').click(); await expect(page.locator('#catalog-body .part-list li')).toHaveCount(nodeTypes.length);
  await page.locator('#catalog-tabs [data-tab=rules]').click(); await expect(page.locator('#catalog-body')).toContainText('X11');
  await page.locator('#catalog-tabs [data-tab=themes]').click();
  const variant = themes.editorial.variants[0];
  await page.locator(`#catalog-body [data-use-theme=editorial][data-variant="${variant.id}"]`).click();
  await expect(page.locator('#theme')).toHaveValue('editorial'); await expect(page.locator('#selection-summary')).toContainText(variant.label);
  await page.locator('#catalog-tab').click(); await page.locator('#catalog-tabs [data-tab=palettes]').click();
  await page.locator('#catalog-body [data-use-palette=forest]').click();
  await expect(page.locator('#palette-options input:checked')).toHaveValue('forest');
});

test('no comparison or retrospective pages are linked from the workbench', async ({page}) => {
  await loaded(page);
  const hrefs = await page.locator('a[href]').evaluateAll(els => els.map(a => a.getAttribute('href')));
  expect(hrefs.filter(h => /gap|격차|peer|compare/i.test(h))).toEqual([]);
  expect(await page.locator('body').innerText()).not.toMatch(/격차|동료/);
});
