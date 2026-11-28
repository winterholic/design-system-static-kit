import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

const VISUAL = 'family:quiet';
const assemble = id => {
  const family = getPurposeFamily(id);
  return assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', items: [{purpose: id, visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content, id: `e2e-${id.split('.').at(-1)}`} ]});
};

// setContent는 window를 새로 만들지 않아 런타임의 한 번 실행 플래그(window.__kit*)가 남는다. 런타임이 필요한 장면은 about:blank를 거쳐 새 window에 싣는다.
const fresh = async (page, html) => { await page.goto('about:blank'); await page.setContent(html); };
const item = (id, variant = {}, extra = {}) => { const family = getPurposeFamily(id); return {purpose: id, visual: VISUAL, variant: {...family.example.variant, ...variant}, props: family.example.props, content: family.example.content, id: `e2e-${id.split('.').at(-1)}`, ...extra}; };
const standalone = items => { const result = assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', items}); expect(result.ok, JSON.stringify(result.errors)).toBe(true); return result.value.standalone; };

test('O mobile outputs stay within 390px and 1280px viewports with safe-area touch targets', async ({page}) => {
  for (const id of ['purpose:mobile.list-cell', 'purpose:mobile.sticky-action', 'purpose:mobile.safe-area', 'purpose:navigation.bottom']) {
    const family = getPurposeFamily(id);
    const request = id.startsWith('purpose:mobile.') ? assemble(id) : assembleComponents({context: 'dashboard', items: [{purpose: id, visual: VISUAL, variant: {position: 'sticky'}, props: family.example.props, content: family.example.content, id: `e2e-${id.split('.').at(-1)}`} ]});
    expect(request.ok, `${id}: ${JSON.stringify(request.errors)}`).toBe(true);
    await fresh(page, request.value.standalone);
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 844});
      if (id === 'purpose:mobile.sticky-action') {
        await page.evaluate(() => {
          const region = document.querySelector('.pf-mobile-sticky');
          const content = document.createElement('main');
          content.style.minHeight = '1200px';
          content.innerHTML = '<p data-flow-end>본문 끝</p>';
          region.before(content);
        });
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      }
      const measured = await page.evaluate(() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, targetHeights: [...document.querySelectorAll('.pf-mobile button,[data-ctl="navigation"] a,[role="search"] input')].map(x => x.getBoundingClientRect().height), sticky: document.querySelector('.pf-mobile-sticky') && getComputedStyle(document.querySelector('.pf-mobile-sticky')).position}));
      expect(measured.scroll, `${id} horizontal overflow at ${width}px`).toBeLessThanOrEqual(measured.client);
      expect(measured.targetHeights.every(height => height >= 44), `${id} touch target under 44px at ${width}px: ${measured.targetHeights}`).toBe(true);
      if (id === 'purpose:mobile.sticky-action') {
        expect(measured.sticky).toBe('sticky');
        const flow = await page.evaluate(() => ({end: document.querySelector('[data-flow-end]').getBoundingClientRect().bottom, action: document.querySelector('.pf-mobile-sticky').getBoundingClientRect().top}));
        expect(flow.end, `sticky action covers the body at ${width}px`).toBeLessThanOrEqual(flow.action);
      }
      if (id === 'purpose:mobile.safe-area') {
        const inset = await page.evaluate(() => {
          const region = document.querySelector('.pf-mobile-safe'), target = region.querySelector('button');
          const box = region.getBoundingClientRect(), tap = target.getBoundingClientRect(), style = getComputedStyle(region);
          return {top: tap.top - box.top, bottom: box.bottom - tap.bottom, safeTop: parseFloat(style.paddingTop), safeBottom: parseFloat(style.paddingBottom)};
        });
        expect(inset.top, `safe-area top inset is empty at ${width}px`).toBeGreaterThanOrEqual(inset.safeTop);
        expect(inset.bottom, `safe-area bottom inset is empty at ${width}px`).toBeGreaterThanOrEqual(inset.safeBottom);
      }
    }
  }
});

test('Action Sheet, Full-screen Dialog and Mobile Filter Panel trap focus, close on Escape and restore focus', async ({page}) => {
  for (const id of ['purpose:mobile.action-sheet', 'purpose:mobile.full-screen-dialog', 'purpose:mobile.filter-panel']) {
    const result = assemble(id);
    expect(result.ok, `${id}: ${JSON.stringify(result.errors)}`).toBe(true);
    await fresh(page, result.value.standalone);
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 844});
      const root = page.locator(`[data-purpose="${id.slice('purpose:'.length)}"]`);
      const trigger = root.locator('[data-mobile-open]');
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = root.locator('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('open', '');
      await expect(dialog.locator(':focus')).toHaveCount(1);
      const buttonHeights = await dialog.locator('button').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().height)); // 검색 칸의 지우기 버튼은 값이 생기기 전까지 hidden이다
      expect(buttonHeights.every(height => height >= 44 && height <= 64), `${id} button geometry at ${width}px: ${buttonHeights}`).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(dialog).toBeVisible();
      if (id.endsWith('filter-panel')) {
        const input = dialog.locator('[data-mobile-filter-search]');
        await input.fill('활성'); // 검색은 사용자에게 보이는 라벨(활성)과 맞춘다. 값(active)은 화면에 없다.
        await expect(dialog.locator('[data-mobile-option]:visible')).toHaveCount(1);
        await expect(dialog.locator('[data-mobile-option]:visible')).toContainText('활성');
        await expect(dialog.locator('[data-mobile-filter-count]')).toContainText('1개');
        await input.fill('없는 조건');
        await expect(dialog.locator('[data-mobile-option]:visible')).toHaveCount(0);
        await expect(dialog.locator('[data-mobile-filter-count]')).toContainText('0개');
        await input.fill('');
        await expect(dialog.locator('[data-mobile-option]:visible')).toHaveCount(2);
      } else if (id.endsWith('action-sheet')) {
        await dialog.locator('[data-mobile-action="share"]').click();
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
        continue;
      }
      await dialog.locator('[data-mobile-close]').last().click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
  }
});

test('mobile search and navigation keep their declared input and current-location state at both widths', async ({page}) => {
  const nav = getPurposeFamily('purpose:navigation.bottom');
  const navResult = assembleComponents({context: 'dashboard', items: [{purpose: nav.id, visual: VISUAL, variant: {position: 'sticky'}, props: nav.example.props, content: nav.example.content}]});
  expect(navResult.ok, JSON.stringify(navResult.errors)).toBe(true);
  const search = getPurposeFamily('purpose:form.search');
  const searchResult = assembleComponents({context: 'dashboard', items: [{purpose: search.id, visual: VISUAL, variant: {layout: 'stacked'}, props: search.example.props, content: search.example.content}]});
  expect(searchResult.ok, JSON.stringify(searchResult.errors)).toBe(true);
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 844});
    await fresh(page, navResult.value.standalone);
    const navigation = page.locator('[data-purpose="navigation.bottom"]');
    const destination = navigation.getByRole('link', {name: '검색'});
    await destination.click();
    await expect(destination).toHaveAttribute('aria-current', 'page');
    await fresh(page, searchResult.value.standalone);
    const form = page.getByRole('search');
    const input = form.locator('input[type="search"]');
    await input.fill('모바일 조건');
    await expect(input).toHaveValue('모바일 조건');
    await expect(form.getByRole('button', {name: '검색', exact: true})).toBeEnabled();
    const widthCheck = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(widthCheck, `search overflow at ${width}px`).toBe(true);
  }
});

// 아래는 독립 브라우저 검증에서 찾은 결함의 회귀 시험이다(VERIFICATION §35).

test('overlays keep Tab and Shift+Tab inside the dialog instead of leaving for the document or browser UI', async ({page}) => {
  for (const id of ['purpose:mobile.action-sheet', 'purpose:mobile.full-screen-dialog', 'purpose:mobile.filter-panel']) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 844});
      await fresh(page, standalone([item(id)]));
      const dialog = page.locator('dialog');
      await page.locator('[data-mobile-open]').click();
      await expect(dialog).toBeVisible();
      const outside = () => page.evaluate(() => !document.querySelector('dialog').contains(document.activeElement));
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < 9; i++) {
          await page.keyboard.press(key);
          expect(await outside(), `${id} ${key} #${i + 1} left the dialog at ${width}px`).toBe(false);
        }
      }
      // 끝에서 한 칸 더 가면 반대쪽 끝으로 돈다.
      const labels = await dialog.evaluate(node => [...node.querySelectorAll('button,input')].filter(x => !x.closest('[hidden]')).map(x => x.getAttribute('data-mobile-action') ?? x.getAttribute('aria-label') ?? x.type));
      await dialog.locator('button,input').last().focus();
      await page.keyboard.press('Tab');
      await expect(dialog.locator('button,input').first(), `${id} wraps to first from ${labels.at(-1)}`).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.locator('button,input').last()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-mobile-open]')).toBeFocused();
    }
  }
});

test('Mobile Search stacked keeps 44px touch targets and a single column, and differs from inline', async ({page}) => {
  const id = 'purpose:form.search';
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 844});
    const measure = async layout => {
      await fresh(page, standalone([item(id, {layout, scope: 'select'}, {props: {size: 'medium'}})]));
      return page.evaluate(() => {
        const box = node => node.getBoundingClientRect();
        const form = document.querySelector('[role="search"]');
        const controls = [...form.querySelectorAll('.kit-select-trigger,.kit-ctl-input-box,input[type="search"],button[type="submit"]')].map(node => ({tag: node.className || node.tagName, height: box(node).height, top: box(node).top}));
        const submit = box(form.querySelector('button[type="submit"]')), field = box(form.querySelector('.kit-ctl-input-box'));
        return {controls, submitWidth: submit.width, fieldWidth: field.width, sameRow: Math.abs(submit.top - field.top) < 4, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
      });
    };
    const stacked = await measure('stacked');
    expect(stacked.overflow, `stacked overflow at ${width}px`).toBeLessThanOrEqual(0);
    for (const control of stacked.controls) expect(control.height, `${JSON.stringify(control)} under 44px at ${width}px`).toBeGreaterThanOrEqual(44 - 2 /* 입력 칸 안쪽 input은 테두리 2px를 뺀 42px */);
    expect(stacked.controls.filter(x => x.height >= 44).length, 'every visible box is at least 44px').toBeGreaterThanOrEqual(3);
    expect(stacked.sameRow, `stacked button must sit below the field at ${width}px`).toBe(false);
    expect(stacked.submitWidth).toBeGreaterThan(stacked.fieldWidth - 1);
    const inline = await measure('inline');
    if (width === 1280) expect(inline.sameRow, 'inline keeps field and button on one row on wide screens').toBe(true);
    expect(JSON.stringify(inline), 'layout axis changes the rendered geometry').not.toBe(JSON.stringify(stacked));
  }
});

test('Mobile List Cell is one row, and accessory and density change what is drawn', async ({page}) => {
  const id = 'purpose:mobile.list-cell';
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 844});
    const read = async variant => {
      await fresh(page, standalone([item(id, variant)]));
      return page.evaluate(() => {
        const cell = document.querySelector('.pf-mobile-list'), copy = cell.querySelector('.pf-mobile-cell-copy'), button = cell.querySelector('button');
        const c = copy.getBoundingClientRect(), b = button.getBoundingClientRect(), r = cell.getBoundingClientRect();
        return {rowHeight: r.height, copyLeftOfButton: c.right <= b.left + 1, verticalOverlap: Math.min(c.bottom, b.bottom) - Math.max(c.top, b.top), buttonHeight: b.height, chevron: getComputedStyle(button, '::after').content, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
      });
    };
    const base = await read({accessory: 'chevron', density: 'comfortable'});
    expect(base.copyLeftOfButton, `title block and action are on separate lines at ${width}px`).toBe(true);
    expect(base.verticalOverlap, 'copy and action share the row').toBeGreaterThan(0);
    expect(base.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(base.overflow).toBeLessThanOrEqual(0);
    const none = await read({accessory: 'none', density: 'comfortable'});
    expect(base.chevron, 'chevron accessory draws a glyph').not.toBe(none.chevron);
    expect(none.chevron === 'none' || none.chevron === 'normal', `accessory none draws nothing: ${none.chevron}`).toBe(true);
    const compact = await read({accessory: 'chevron', density: 'compact'});
    expect(compact.rowHeight, 'compact density is shorter').toBeLessThan(base.rowHeight);
    expect(compact.buttonHeight).toBeGreaterThanOrEqual(44);
  }
});

test('sticky Bottom Navigation and Sticky Bottom Action stay pinned while scrolling, static does not, and the two never overlap', async ({page}) => {
  const tall = '<div id="tall" style="height:2400px">본문</div>';
  const pin = () => page.evaluate(() => { const rect = selector => { const node = document.querySelector(selector); return node && node.getBoundingClientRect(); }; return {nav: rect('.pf-bottom'), action: rect('.pf-mobile-sticky'), vh: innerHeight}; });
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 844});
    for (const position of ['static', 'sticky']) {
      await fresh(page, standalone([item('purpose:navigation.bottom', {position})]));
      await page.evaluate(html => document.querySelector('.kit-platform').insertAdjacentHTML('afterbegin', html), tall);
      await page.evaluate(() => scrollTo(0, 400));
      const after = await pin();
      if (position === 'sticky') expect(Math.round(after.nav.bottom), `Mobile Tab Bar (sticky) leaves the viewport at ${width}px`).toBe(after.vh);
      else expect(after.nav.bottom, 'static bar scrolls with the page').toBeGreaterThan(after.vh);
    }
    await fresh(page, standalone([item('purpose:mobile.sticky-action'), item('purpose:navigation.bottom', {position: 'sticky'})]));
    await page.evaluate(html => document.querySelector('.kit-platform').insertAdjacentHTML('afterbegin', html), tall);
    for (const y of [0, 400, 100000]) {
      await page.evaluate(top => scrollTo(0, top), y);
      const {nav, action} = await pin();
      expect(action.bottom, `sticky action (${action.top}-${action.bottom}) overlaps the bottom bar (${nav.top}-${nav.bottom}) at scroll ${y}, ${width}px`).toBeLessThanOrEqual(nav.top + 0.5);
      if (y === 400) expect(Math.round(nav.bottom)).toBe(844);
    }
    await page.evaluate(() => scrollTo(0, 400));
    const heights = await page.evaluate(() => [...document.querySelectorAll('.pf-mobile-sticky button,.pf-bottom a')].map(x => x.getBoundingClientRect().height));
    expect(heights.every(h => h >= 44), `touch targets ${heights}`).toBe(true);
    // 가린 곳 없이 눌린다: 중앙 점의 최상위 요소가 자기 자신이다.
    const hit = await page.evaluate(() => { const b = document.querySelector('.pf-mobile-sticky button').getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!top.closest('.pf-mobile-sticky'); });
    expect(hit, 'the sticky action button is covered by another element').toBe(true);
  }
});

test('Mobile Header collapses behind a 44px toggle at 390px, opens, closes on Escape and returns focus', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await fresh(page, standalone([item('purpose:navigation.topbar')]));
  const toggle = page.locator('[data-purpose="navigation.topbar"] [aria-expanded]').first();
  await expect(toggle).toBeVisible();
  expect((await toggle.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const links = await page.locator('[data-purpose="navigation.topbar"] nav a').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(links.every(height => height >= 44), `opened menu links under 44px: ${links}`).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('Bottom Navigation moves aria-current on every click and Enter, and Tab / Shift+Tab walk the links in order', async ({page}) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 844});
    for (const position of ['static', 'sticky']) {
      await fresh(page, standalone([item('purpose:navigation.bottom', {position})]));
      const links = page.locator('[data-purpose="navigation.bottom"] a');
      const count = await links.count();
      const state = () => links.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-current') ?? ''));
      for (let i = 0; i < count; i++) {
        await links.nth(i).click();
        expect(await state(), `click #${i} at ${width}px`).toEqual(Array.from({length: count}, (_, j) => j === i ? 'page' : ''));
      }
      await links.nth(1).focus();
      await page.keyboard.press('Enter');
      expect((await state()).indexOf('page')).toBe(1);
      await links.first().focus();
      for (let i = 1; i < count; i++) { await page.keyboard.press('Tab'); await expect(links.nth(i)).toBeFocused(); }
      for (let i = count - 2; i >= 0; i--) { await page.keyboard.press('Shift+Tab'); await expect(links.nth(i)).toBeFocused(); }
    }
  }
});
