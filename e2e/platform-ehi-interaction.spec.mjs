import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

/**
 * §6.4 Modal/Drawer/Popover·Navigation·Feedback 계약을 Chromium에서 실제로 조작해 확인한다.
 * 항목은 id와 content를 덮어써 쓸 수 있고, 뒤쪽에 포커스 가능한 단추를 하나 붙여 "포커스를 가두지 않음"을 볼 수 있게 한다.
 */
const BASE = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp'};
const page_html = (items, {tall = false} = {}) => {
  const result = assembleComponents({...BASE, items: items.map(x => typeof x === 'string' ? {purpose: x, visual: 'family:quiet', ...getPurposeFamily(x).example} : {visual: 'family:quiet', ...getPurposeFamily(x.purpose).example, ...x})});
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value.standalone.replace('<script>', `${tall ? '<div style="block-size:3000px" aria-hidden="true"></div>' : ''}<button id="after" type="button" style="position:fixed;inset-block-end:8px;inset-inline-end:8px;min-block-size:44px;min-inline-size:44px">뒤</button><script>`);
};
const inDialog = (page, selector) => page.evaluate(sel => { const d = document.querySelector(sel); return Boolean(d && d.contains(document.activeElement)); }, selector);
const overflow = page => page.evaluate(() => document.documentElement.style.overflow);
const WIDTHS = [390, 1280];

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({viewport: {width, height: 700}});

    for (const id of ['purpose:overlay.drawer', 'purpose:navigation.drawer']) {
      test(`${id}: opens with the keyboard, keeps Tab inside, locks page scroll, closes by Escape, backdrop and close button, and returns focus`, async ({page}) => {
        await page.setContent(page_html([id], {tall: true}));
        const trigger = page.locator('[data-ehi-trigger]'), dialog = page.getByRole('dialog');
        await expect(dialog).toBeHidden();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(dialog).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(await dialog.getAttribute('aria-label')).toBeTruthy();
        expect(await inDialog(page, '[role=dialog]'), 'focus moves into the dialog on open').toBe(true);
        expect(await overflow(page)).toBe('hidden');
        await page.mouse.move(width / 2, 300);
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => scrollY), 'background does not scroll while the modal is open').toBe(0);
        const stops = await dialog.locator('button,a[href],input').count();
        for (let i = 0; i < stops + 2; i++) { await page.keyboard.press('Tab'); expect(await inDialog(page, '[role=dialog]'), `Tab ${i + 1} stays in the dialog`).toBe(true); }
        for (let i = 0; i < stops + 2; i++) { await page.keyboard.press('Shift+Tab'); expect(await inDialog(page, '[role=dialog]'), `Shift+Tab ${i + 1} stays in the dialog`).toBe(true); }
        const box = await dialog.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5); expect(box.y + box.height).toBeLessThanOrEqual(700.5);
        for (const control of await dialog.locator('button,a[href]').all()) { const r = await control.boundingBox(); expect(r.width, 'touch target width').toBeGreaterThanOrEqual(44); expect(r.height, 'touch target height').toBeGreaterThanOrEqual(44); }
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(await overflow(page)).toBe('');
        // 두 번째 열기: 바깥(배경) 눌러 닫기
        await trigger.click();
        await expect(dialog).toBeVisible();
        await page.mouse.click(3, 3);
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
        expect(await overflow(page)).toBe('');
        // 세 번째 열기: 닫기 단추
        await trigger.click();
        await page.locator('[data-ehi-close]').click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
        expect(await overflow(page)).toBe('');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      });
    }

    test('purpose:navigation.drawer: choosing a link closes the drawer, releases scroll lock and the link is aria-current when reopened', async ({page}) => {
      await page.setContent(page_html(['purpose:navigation.drawer'], {tall: true}));
      const trigger = page.locator('[data-ehi-trigger]'), dialog = page.getByRole('dialog');
      await trigger.click();
      const links = dialog.getByRole('link');
      await expect(links).toHaveCount(2);
      for (const link of await links.all()) { const r = await link.boundingBox(); expect(r.height, 'nav link touch height').toBeGreaterThanOrEqual(44); }
      await links.nth(1).click();
      await expect(dialog).toBeHidden();
      expect(await overflow(page)).toBe('');
      await trigger.click();
      await expect(dialog.getByRole('link').nth(1)).toHaveAttribute('aria-current', 'page');
      await expect(dialog.getByRole('link').nth(0)).not.toHaveAttribute('aria-current', 'page');
    });

    test('purpose:overlay.popover: anchored, non-modal, does not trap focus or lock scroll, closes by Escape and by an outside click without stealing focus', async ({page}) => {
      await page.setContent(page_html(['purpose:overlay.popover'], {tall: true}));
      const trigger = page.locator('[data-ehi-trigger]'), pop = page.getByRole('dialog');
      await trigger.focus();
      await page.keyboard.press('Space');
      await expect(pop).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(await pop.getAttribute('aria-modal')).not.toBe('true');
      expect(await overflow(page)).toBe('');
      const t = await trigger.boundingBox(), p = await pop.boundingBox();
      expect(p.y, 'popover sits right below its trigger').toBeGreaterThanOrEqual(t.y + t.height - 1);
      expect(p.y, 'popover sits right below its trigger').toBeLessThanOrEqual(t.y + t.height + 24);
      expect(p.x).toBeGreaterThanOrEqual(-0.5); expect(p.x + p.width).toBeLessThanOrEqual(width + 0.5);
      // 트리거가 눌릴 수 있어야 한다: 배경 막(scrim)이 트리거를 덮지 않는다.
      expect(await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return Boolean(el && el.closest('[data-ehi-trigger]')); }, [t.x + t.width / 2, t.y + t.height / 2])).toBe(true);
      expect(await inDialog(page, '[role=dialog]')).toBe(true);
      for (let i = 0; i < 3 && await page.evaluate(() => document.activeElement.id) !== 'after'; i++) await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement.id), 'Tab leaves the non-modal popover').toBe('after');
      await expect(pop, 'a non-modal popover stays open while focus moves on').toBeVisible();
      await trigger.focus();
      await page.keyboard.press('Escape');
      await expect(pop).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(pop).toBeVisible();
      await page.locator('#after').click();
      await expect(pop).toBeHidden();
      await expect(page.locator('#after'), 'an outside click keeps focus on what was clicked').toBeFocused();
    });

    for (const id of ['purpose:overlay.dropdown-menu', 'purpose:navigation.command-menu', 'purpose:navigation.context-menu']) {
      test(`${id}: menu keyboard contract (arrows wrap, Home/End, Escape, Tab, outside click, item choice) and the panel overlays instead of pushing content`, async ({page}) => {
        const items = [{label: '내보내기'}, {label: '복사', disabled: true}, {label: '이동'}, {label: '삭제'}];
        await page.setContent(page_html([{purpose: id, content: {label: '명령', items}}]));
        const trigger = page.locator('[data-ehi-trigger]'), menu = page.getByRole('menu'), after = page.locator('#after');
        const afterBefore = await after.boundingBox();
        await trigger.click();
        await expect(menu).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const afterOpen = await after.boundingBox();
        expect(afterOpen.y, 'opening the menu does not push the following content').toBe(afterBefore.y);
        const entries = menu.locator('[data-ehi-item]:not([disabled])');
        if (id.includes('command')) { await expect(page.locator('[data-ehi-filter]')).toBeFocused(); await page.keyboard.press('ArrowDown'); }
        else await expect(entries.nth(0)).toBeFocused();
        await expect(entries.nth(0)).toBeFocused();
        await page.keyboard.press('ArrowDown'); await expect(entries.nth(1), 'disabled item is skipped').toBeFocused();
        await page.keyboard.press('ArrowDown'); await expect(entries.nth(2)).toBeFocused();
        await page.keyboard.press('ArrowDown'); await expect(entries.nth(0), 'ArrowDown wraps').toBeFocused();
        if (id.includes('command')) { await page.keyboard.press('ArrowUp'); await expect(page.locator('[data-ehi-filter]'), 'ArrowUp from the first match returns to the search box').toBeFocused(); await page.keyboard.press('ArrowUp'); await expect(entries.nth(2), 'ArrowUp from the box wraps to the last match').toBeFocused(); }
        else { await page.keyboard.press('ArrowUp'); await expect(entries.nth(2), 'ArrowUp wraps').toBeFocused(); }
        await page.keyboard.press('Home'); await expect(entries.nth(0)).toBeFocused();
        await page.keyboard.press('End'); await expect(entries.nth(2)).toBeFocused();
        for (const control of await menu.locator('[data-ehi-item]:not([disabled])').all()) { const r = await control.boundingBox(); expect(r.height, 'menu item touch height').toBeGreaterThanOrEqual(44); }
        const r = await page.getByRole(id.includes('command') ? 'dialog' : 'menu').boundingBox();
        expect(r.x).toBeGreaterThanOrEqual(-0.5); expect(r.x + r.width).toBeLessThanOrEqual(width + 0.5);
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
        // Tab은 메뉴를 닫고 다음 요소로 간다(APG).
        await trigger.click(); await expect(menu).toBeVisible();
        await page.keyboard.press('Tab');
        await expect(menu).toBeHidden();
        // 바깥 클릭: 닫히고 포커스는 누른 곳으로 간다.
        await trigger.click(); await expect(menu).toBeVisible();
        await after.click();
        await expect(menu).toBeHidden(); await expect(after).toBeFocused();
        // 항목 선택: 닫히고 포커스는 트리거로 돌아온다.
        await trigger.click();
        await menu.locator('[data-ehi-item]:not([disabled])').nth(2).click();
        await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      });
    }

    test('purpose:navigation.command-menu: the filter narrows the list, reports when nothing matches, and ArrowDown from the filter reaches the first visible match', async ({page}) => {
      await page.setContent(page_html([{purpose: 'purpose:navigation.command-menu', content: {label: '명령', items: [{label: '내보내기'}, {label: '복사'}, {label: '붙여넣기'}]}}]));
      await page.locator('[data-ehi-trigger]').click();
      const filter = page.locator('[data-ehi-filter]'), items = page.locator('[data-ehi-item]');
      await filter.fill('복');
      await expect(items.filter({visible: true})).toHaveText(['복사']);
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      await filter.fill('없는명령');
      await expect(items.filter({visible: true})).toHaveCount(0);
      await expect(page.locator('[data-ehi-empty]')).toBeVisible();
      await filter.fill('');
      await expect(items.filter({visible: true})).toHaveCount(3);
      await expect(page.locator('[data-ehi-empty]')).toBeHidden();
      // 라벨과 입력은 겹치지 않는다
      const label = await page.locator('label:has([data-ehi-filter])').boundingBox(), input = await filter.boundingBox();
      expect(input.height).toBeGreaterThanOrEqual(44);
      expect(input.x + input.width).toBeLessThanOrEqual(width + 0.5);
      expect(label.width).toBeGreaterThan(0);
    });

    test('purpose:navigation.context-menu: right-click opens it at the trigger, ContextMenu key and Enter also open it', async ({page}) => {
      await page.setContent(page_html(['purpose:navigation.context-menu']));
      const trigger = page.locator('[data-ehi-trigger]'), menu = page.getByRole('menu');
      await trigger.click({button: 'right'});
      await expect(menu).toBeVisible();
      await expect(menu.locator('[data-ehi-item]').first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
      await page.keyboard.press('ContextMenu');
      await expect(menu).toBeVisible();
    });

    test('purpose:overlay.contextual-help: focus shows the tooltip, Escape dismisses it, Tab moves on without pulling focus back, and the pointer can reach the text', async ({page}) => {
      await page.setContent(page_html(['purpose:overlay.contextual-help']));
      const trigger = page.locator('[data-ehi-tooltip-trigger]'), tip = page.locator('[data-ehi-tooltip]'), after = page.locator('#after');
      await expect(tip).toBeHidden();
      await trigger.focus();
      await expect(tip).toBeVisible();
      expect(await trigger.getAttribute('aria-describedby')).toBe(await tip.getAttribute('id'));
      await page.keyboard.press('Escape');
      await expect(tip).toBeHidden();
      await expect(trigger, 'Escape keeps focus where it is').toBeFocused();
      await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      await expect(tip).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(after, 'Tab moves to the next control').toBeFocused();
      await expect(tip).toBeHidden();
      await trigger.hover();
      await expect(tip, 'hover shows the help').toBeVisible();
      await tip.hover();
      await expect(tip, 'the pointer can move onto the help text').toBeVisible();
      await page.mouse.move(width - 5, 600);
      await expect(tip).toBeHidden();
      // 오른쪽 가장자리에 붙은 도움말도 화면 안에 머문다.
      await page.locator('.ehi-anchor').evaluate(el => { el.parentElement.style.textAlign = 'right'; el.parentElement.style.paddingInlineEnd = '0'; });
      await trigger.hover();
      await expect(tip).toBeVisible();
      const box = await tip.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
    });

    test('purpose:navigation.collapsible-sidebar: toggles with Enter and Space, keeps aria-expanded true to the DOM, Escape returns focus, and the link choice is aria-current', async ({page}) => {
      await page.setContent(page_html(['purpose:navigation.collapsible-sidebar']));
      const trigger = page.locator('[data-ehi-trigger]'), panel = page.locator('#' + (await page.locator('[data-ehi-trigger]').getAttribute('aria-controls')));
      await expect(panel).toBeHidden();
      await trigger.focus(); await page.keyboard.press('Enter');
      await expect(panel).toBeVisible(); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      for (const link of await panel.getByRole('link').all()) { const r = await link.boundingBox(); expect(r.height, 'link touch height').toBeGreaterThanOrEqual(44); }
      await page.keyboard.press('Tab');
      await expect(panel.getByRole('link').first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden(); await expect(trigger).toBeFocused(); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('Space');
      await expect(panel).toBeVisible();
      await panel.getByRole('link').nth(1).click();
      await expect(panel.getByRole('link').nth(1)).toHaveAttribute('aria-current', 'page');
      await expect(panel.getByRole('link').nth(0)).not.toHaveAttribute('aria-current', 'page');
      await trigger.click();
      await expect(panel).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });

    test('feedback families: live regions exist before their text changes, errors are assertive alerts, progress values match what is drawn, the loading overlay stays inside its box', async ({page}) => {
      await page.setContent(page_html([
        'purpose:feedback.status-indicator',
        {purpose: 'purpose:feedback.callout', id: 'callout-error', content: {label: '오류', description: '저장하지 못했습니다.', tone: 'error'}},
        {purpose: 'purpose:feedback.callout', id: 'callout-info'},
        {purpose: 'purpose:feedback.circular-progress', id: 'progress-known', content: {label: '업로드', value: 40}},
        {purpose: 'purpose:feedback.circular-progress', id: 'progress-unknown', content: {label: '준비'}},
        'purpose:feedback.loading-overlay',
      ]));
      const status = page.locator('.ehi-status[role=status]');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      const handle = await status.elementHandle();
      await status.evaluate(el => { el.lastElementChild.textContent = '동기화 실패'; });
      expect(await handle.evaluate(el => el.isConnected && el.getAttribute('aria-live')), 'the same live region node receives the new text').toBe('polite');
      // callout은 본문 흐름의 정적 note다: 알림 영역(role=status·alert)을 만들지 않는다.
      await expect(page.locator('.ehi-callout[role=note]')).toHaveCount(2);
      await expect(page.locator('.ehi-callout [role=status],.ehi-callout [role=alert],.ehi-callout [aria-live]')).toHaveCount(0);
      await expect(page.locator('.ehi-callout[data-tone=error] .kit-ctl-sr')).toHaveText('오류: ');
      const bars = page.getByRole('progressbar');
      const determinate = bars.filter({has: page.locator('xpath=self::*[@aria-valuenow]')});
      await expect(determinate).toHaveAttribute('aria-valuenow', '40');
      await expect(determinate).toHaveText('40%');
      await expect(page.locator('[role=progressbar]:not([aria-valuenow])')).toHaveCount(1);
      // 원 안의 숫자는 채워진 쪽 위에서도 읽혀야 한다: 숫자 칸의 배경은 채움색이 아니다.
      const textBg = await page.locator('.ehi-circle').evaluate(el => { const c = getComputedStyle(el, '::before'); return c.content !== 'none' ? c.backgroundColor : null; });
      expect(textBg, 'the number sits on its own surface disc, not on the fill').not.toBeNull();
      const overlay = page.locator('[data-ehi-loading]');
      const box = await overlay.boundingBox(), vp = page.viewportSize();
      expect(box.width * box.height, 'a loading overlay covers its region, not the whole viewport').toBeLessThan(vp.width * vp.height * 0.8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const probe = await page.evaluate(() => { const el = document.elementFromPoint(5, 5); return el && el.closest('[data-ehi-loading]') ? 'covered' : 'free'; });
      expect(probe, 'the loading overlay does not blanket the rest of the page').toBe('free');
    });
  });
}
