import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

/**
 * §6.2 F 카드·G 데이터 표시의 새 목적 패밀리를 서비스가 내는 standalone 출력(런타임 포함)에서 Chromium으로 조작한다.
 * 페이지 조립기(scripts/families/pages.mjs)의 런타임 묶음에는 데이터 표시·카드 선택 런타임이 없으므로 그 경로로는 동작을 볼 수 없다.
 */
const BASE = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp'};
const standalone = (id, over = {}) => {
  const family = getPurposeFamily(id);
  const result = assembleComponents({...BASE, items: [{purpose: id, visual: 'family:quiet', ...family.example, ...over}]});
  if (!result.ok) throw new Error(`${id}: ${JSON.stringify(result.errors)}`);
  return result.value.standalone;
};
// setContent는 window를 새로 만들지 않아 런타임의 한 번 실행 플래그(window.__kit*)가 남는다. 런타임이 필요한 장면은 about:blank를 거쳐 새 window에 싣는다.
const fresh = async (page, html) => { await page.goto('about:blank'); await page.setContent(html); };
const noOverflow = page => page.evaluate(() => ({page: document.documentElement.scrollWidth - document.documentElement.clientWidth, parts: [...document.querySelectorAll('.pf')].map(x => x.scrollWidth - x.clientWidth)}));

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({viewport: {width, height: 800}});

    test('purpose:card.selection: Space and Enter and a click toggle aria-pressed and data-selected together; disabled and selected states are honest', async ({page}) => {
      await fresh(page, standalone('purpose:card.selection'));
      const hit = page.locator('.pf-card-hit'), wrap = page.locator('.pf-card-selection'), card = page.locator('[data-ctl=card]');
      await expect(hit).toHaveAttribute('aria-pressed', 'false');
      await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('Tab');
      expect(await hit.evaluate(el => { const s = getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }), 'focus ring').toBe(true);
      await hit.focus();
      await page.keyboard.press('Space');
      await expect(hit).toHaveAttribute('aria-pressed', 'true');
      await expect(card, 'the card surface follows the button').toHaveAttribute('data-selected', 'true');
      await expect(wrap).toHaveAttribute('data-selected', 'true');
      await page.keyboard.press('Enter');
      await expect(hit).toHaveAttribute('aria-pressed', 'false');
      await expect(card).toHaveAttribute('data-selected', 'false');
      await hit.click();
      await expect(hit).toHaveAttribute('aria-pressed', 'true');
      const box = await hit.boundingBox();
      await fresh(page, standalone('purpose:card.selection'));
      await expect(page.locator('[data-selected-label]'), 'the selected label is not shown while nothing is selected').toBeHidden();
      await page.locator('.pf-card-extra p').first().click({force: true});
      await expect(page.locator('.pf-card-hit'), 'a click anywhere on the card selects it').toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-selected-label]')).toBeVisible();
      await page.locator('.pf-card-hit').click();
      expect(box.height, 'selection hit area').toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect((await noOverflow(page)).page).toBeLessThanOrEqual(1);
      // 초기 selected 상태
      await fresh(page, standalone('purpose:card.selection', {props: {behavior: 'selectable', state: 'selected'}}));
      await expect(page.locator('.pf-card-hit')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-ctl=card]')).toHaveAttribute('data-selected', 'true');
      // disabled: 포커스를 받지 않고 눌리지 않는다
      await fresh(page, standalone('purpose:card.selection', {props: {behavior: 'selectable', state: 'disabled'}}));
      await expect(page.locator('.pf-card-hit')).toBeDisabled();
      await expect(page.locator('.pf-card-hit')).toHaveAttribute('aria-pressed', 'false');
    });

    test('purpose:card.review: the stars are one named image, 4.5 does not draw five filled stars, the quote is not indented, nothing is a live region', async ({page}) => {
      await fresh(page, standalone('purpose:card.review'));
      const img = page.locator('[role=img]');
      await expect(img).toHaveAttribute('aria-label', '별점 4.5점 / 5점');
      await expect(img).toHaveText('★★★★☆');
      expect(await page.locator('blockquote').evaluate(el => getComputedStyle(el).marginInlineStart)).toBe('0px');
      expect(await page.locator('[role=status],[role=alert],[aria-live]').count()).toBe(0);
    });
    test('static notification and integration cards carry their state as text, not as live regions', async ({page}) => {
      for (const id of ['purpose:card.notification', 'purpose:card.integration']) { await fresh(page, standalone(id)); expect(await page.locator('[role=status],[role=alert],[aria-live]').count(), id).toBe(0); }
    });
    test('purpose:table.tree: collapsed branches show an expand marker that turns when open', async ({page}) => {
      await fresh(page, standalone('purpose:table.tree'));
      const root = page.locator('[role=treeitem]').first();
      expect(await root.evaluate(el => getComputedStyle(el, '::before').content)).not.toBe('none');
      const before = await root.evaluate(el => getComputedStyle(el, '::before').transform);
      await root.click();
      expect(await root.evaluate(el => getComputedStyle(el, '::before').transform)).not.toBe(before);
    });
    for (const id of ['purpose:card.comparison', 'purpose:card.notification', 'purpose:card.activity', 'purpose:card.integration', 'purpose:card.review', 'purpose:card.dashboard-widget', 'purpose:card.financial-asset']) {
      test(`${id}: static card has no tab stop, states render honestly, long text wraps, no overflow and no text under 16px headings`, async ({page}) => {
        const long = 'ㅤ'.repeat(0) + '아주긴내용'.repeat(40);
        await page.setContent(standalone(id));
        expect(await page.locator('a[href],button,input,[tabindex]').count(), 'a static card adds no tab stops').toBe(0);
        const heading = page.locator('h3').first();
        expect(await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
        for (const h4 of await page.locator('h4').all()) expect(await h4.evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 'sub heading size').toBeGreaterThanOrEqual(16);
        for (const state of ['loading', 'empty', 'error']) {
          await page.setContent(standalone(id, {props: {state}}));
          const card = page.locator('[data-ctl=card]');
          await expect(card).toHaveAttribute('data-state', state);
          if (state === 'loading') { await expect(card).toHaveAttribute('aria-busy', 'true'); await expect(card.locator('[role=status]')).toHaveCount(1); }
          if (state === 'empty') await expect(card.locator('[role=status]')).toHaveCount(1);
          if (state === 'error') await expect(card.locator('[role=alert]')).toHaveCount(1);
        }
        const family = getPurposeFamily(id), content = JSON.parse(JSON.stringify(family.example.content));
        for (const [k, v] of Object.entries(content)) if (typeof v === 'string' && !['unread'].includes(k) && !/^(up|down|flat)$/.test(v)) content[k] = long;
        await page.setContent(standalone(id, {content}));
        const o = await noOverflow(page);
        expect(o.page, 'page overflow with long text').toBeLessThanOrEqual(1);
        expect(o.parts.every(x => x <= 1), `component overflow ${JSON.stringify(o.parts)}`).toBe(true);
      });
    }

    test('purpose:table.filterable: typing narrows rows, the count is announced in a persistent live region, an empty result says so, clearing restores, headers sort with aria-sort', async ({page}) => {
      await fresh(page, standalone('purpose:table.filterable'));
      const filter = page.locator('[data-table-filter]'), rows = page.locator('tbody tr[data-row]'), count = page.locator('[data-filter-count]'), empty = page.locator('[data-filter-empty]');
      expect(await filter.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      await expect(count).toHaveAttribute('aria-live', 'polite');
      const live = await count.elementHandle();
      await filter.fill('worker');
      await expect(rows.filter({visible: true})).toHaveCount(1);
      await expect(count).toContainText('1');
      expect(await live.evaluate(el => el.isConnected), 'the live region node persists').toBe(true);
      await filter.fill('zzz');
      await expect(rows.filter({visible: true})).toHaveCount(0);
      await expect(empty).toBeVisible();
      await filter.fill('');
      await expect(rows.filter({visible: true})).toHaveCount(2);
      await expect(empty).toBeHidden();
      // 정렬: 헤더 단추를 키보드로
      const sort = page.locator('thead button').first();
      await sort.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('thead th[aria-sort]').first()).toHaveAttribute('aria-sort', /ascending|descending/);
      const o = await noOverflow(page);
      expect(o.page).toBeLessThanOrEqual(1);
    });

    test('purpose:table.filterable: sorting keeps the filter, and hidden rows stay hidden', async ({page}) => {
      await fresh(page, standalone('purpose:table.filterable'));
      await page.locator('[data-table-filter]').fill('api');
      await page.locator('thead button').nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('tbody tr[data-row]').filter({visible: true})).toHaveCount(1);
    });

    test('purpose:table.expandable: summary toggles by Enter and Space, aria-expanded follows, panels are reachable', async ({page}) => {
      await fresh(page, standalone('purpose:table.expandable'));
      const summaries = page.locator('details[data-row-expand] summary');
      const first = summaries.first();
      expect((await first.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await first.focus(); await page.keyboard.press('Enter');
      await expect(first).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('details[data-row-expand]').first().locator('div')).toBeVisible();
      await page.keyboard.press('Space');
      await expect(first).toHaveAttribute('aria-expanded', 'false');
      await summaries.nth(1).click();
      await expect(summaries.nth(1)).toHaveAttribute('aria-expanded', 'true');
      await expect(first, 'rows are independent').toHaveAttribute('aria-expanded', 'false');
      const id = await first.getAttribute('aria-controls');
      expect(await page.locator('#' + id).count(), 'aria-controls resolves').toBe(1);
      expect((await noOverflow(page)).page).toBeLessThanOrEqual(1);
    });

    test('purpose:table.grouped: group headings are real row-group headings in reading order, one per group', async ({page}) => {
      await page.setContent(standalone('purpose:table.grouped'));
      const heads = page.locator('tr.pf-group-row th[scope=rowgroup]');
      await expect(heads).toHaveText(['진행 중', '완료']);
      expect(await page.locator('tbody tr[data-row]').count()).toBe(3);
      expect(await page.locator('tbody').count(), 'one tbody per group, so a rowgroup heading labels only its own rows').toBe(2);
      expect(await page.locator('tbody').first().locator('tr[data-row]').count()).toBe(2);
      expect(await page.locator('tbody').last().locator('tr[data-row]').count()).toBe(1);
      expect((await noOverflow(page)).page).toBeLessThanOrEqual(1);
    });

    test('purpose:table.tree: roving tabindex, arrows expand/collapse/move, Home/End, one Tab stop', async ({page}) => {
      await fresh(page, standalone('purpose:table.tree'));
      const items = page.locator('[role=treeitem]');
      expect(await page.locator('[role=treeitem][tabindex="0"]').count(), 'one tab stop').toBe(1);
      const root = items.first();
      await root.focus();
      await page.keyboard.press('ArrowRight');
      await expect(root).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('ArrowRight');
      await expect(items.nth(1), 'ArrowRight on an open node enters it').toBeFocused();
      expect(await page.locator('[role=treeitem][tabindex="0"]').count(), 'tabindex 0 follows focus').toBe(1);
      await expect(items.nth(1)).toHaveAttribute('tabindex', '0');
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(2)).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(items.first(), 'ArrowLeft on a leaf goes to its parent').toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(root).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('End');
      await expect(items.filter({visible: true}).last()).toBeFocused();
      await page.keyboard.press('Home');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(root, 'Enter toggles').toHaveAttribute('aria-expanded', 'true');
      for (const item of await items.filter({visible: true}).all()) expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement.closest('[role=tree]')), 'Tab leaves the tree').toBeNull();
      expect((await noOverflow(page)).page).toBeLessThanOrEqual(1);
    });

    for (const id of ['purpose:table.inspector', 'purpose:table.log-viewer', 'purpose:table.diff']) {
      test(`${id}: long values wrap without overflow, headings are readable and states render`, async ({page}) => {
        const family = getPurposeFamily(id), content = JSON.parse(JSON.stringify(family.example.content)), long = '긴값'.repeat(60) + 'A'.repeat(120);
        for (const k of ['items', 'rows']) if (Array.isArray(content[k])) content[k] = content[k].map(row => Object.fromEntries(Object.entries(row).map(([a, b]) => [a, ['id', 'level', 'time', 'key'].includes(a) ? b : long])));
        if (content.before) { content.before = long; content.after = long + '!'; }
        await page.setContent(standalone(id, {content}));
        const o = await noOverflow(page);
        expect(o.page, 'page').toBeLessThanOrEqual(1);
        expect(o.parts.every(x => x <= 1), `component ${JSON.stringify(o.parts)}`).toBe(true);
        for (const h of await page.locator('h3,h4').all()) expect(await h.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
        for (const state of ['loading', 'empty', 'error']) {
          await page.setContent(standalone(id, {props: {state}}));
          await expect(page.locator(`[data-state=${state}]`)).toHaveCount(1);
          await expect(page.locator(state === 'error' ? '[role=alert]' : '[role=status]')).toHaveCount(1);
        }
      });
    }
  });
}
