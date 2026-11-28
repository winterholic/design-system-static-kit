import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

const VISUAL = 'family:quiet';
const assemble = id => {
  const family = getPurposeFamily(id);
  return assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', items: [{purpose: id, visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content, id: `e2e-${id.split('.').at(-1)}`} ]});
};

test('O mobile outputs stay within 390px and 1280px viewports with safe-area touch targets', async ({page}) => {
  for (const id of ['purpose:mobile.list-cell', 'purpose:mobile.sticky-action', 'purpose:mobile.safe-area', 'purpose:navigation.bottom']) {
    const family = getPurposeFamily(id);
    const request = id.startsWith('purpose:mobile.') ? assemble(id) : assembleComponents({context: 'dashboard', items: [{purpose: id, visual: VISUAL, variant: {position: 'sticky'}, props: family.example.props, content: family.example.content, id: `e2e-${id.split('.').at(-1)}`} ]});
    expect(request.ok, `${id}: ${JSON.stringify(request.errors)}`).toBe(true);
    await page.setContent(request.value.standalone);
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
    await page.setContent(result.value.standalone);
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
      const buttonHeights = await dialog.locator('button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      expect(buttonHeights.every(height => height >= 44 && height <= 64), `${id} button geometry at ${width}px: ${buttonHeights}`).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(dialog).toBeVisible();
      if (id.endsWith('filter-panel')) {
        const input = dialog.locator('[data-mobile-filter-search]');
        await input.fill('active');
        await expect(dialog.locator('[data-mobile-option]:visible')).toHaveCount(1);
        await expect(dialog.locator('[data-mobile-filter-count]')).toContainText('1개');
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
    await page.setContent(navResult.value.standalone);
    const navigation = page.locator('[data-purpose="navigation.bottom"]');
    const destination = navigation.getByRole('link', {name: '검색'});
    await destination.click();
    await expect(destination).toHaveAttribute('aria-current', 'page');
    await page.setContent(searchResult.value.standalone);
    const form = page.getByRole('search');
    const input = form.locator('input[type="search"]');
    await input.fill('모바일 조건');
    await expect(input).toHaveValue('모바일 조건');
    await expect(form.getByRole('button')).toBeEnabled();
    const widthCheck = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(widthCheck, `search overflow at ${width}px`).toBe(true);
  }
});
