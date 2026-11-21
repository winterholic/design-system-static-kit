import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** 컴포넌트 재료 8종의 실제 동작을 증거 페이지(docs/evidence/materials/components.html)에서 Chromium으로 확인한다.
 *  페이지는 `npm run` 없이 scripts/materials/components-evidence.mjs가 만든 파일이며 file:// 로 연다. 390px(휴대폰)과 1280px(데스크톱) 모두에서 돈다. */
const page_url = pathToFileURL(resolve(import.meta.dirname, '../docs/evidence/materials/components.html')).href;
const shots = resolve(import.meta.dirname, '../docs/evidence/materials/screenshots');
const SECTIONS = ['c-button', 'c-input', 'c-card', 'c-navigation', 'c-modal', 'c-tabs', 'c-tooltip', 'c-feedback', 'playground'];

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({viewport: {width, height: 900}});
    test.beforeEach(async ({page}) => { await page.goto(page_url); });

    test('page has no horizontal overflow, no console errors, and every material section is present', async ({page}) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.reload();
      const m = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}));
      expect(m.sw).toBeLessThanOrEqual(m.cw);
      for (const id of SECTIONS) await expect(page.locator('#' + id)).toHaveCount(1);
      expect(errors).toEqual([]);
      mkdirSync(shots, {recursive: true});
      for (const id of SECTIONS) await page.locator('#' + id).screenshot({path: resolve(shots, `${id.replace(/^c-/, '')}-${width}.png`)});
    });

    test('every rule row on the page was rejected by the renderer and every contrast pair passes', async ({page}) => {
      expect(await page.locator('[data-rejected=false]').count()).toBe(0);
      expect(await page.locator('[data-rejected=true]').count()).toBeGreaterThan(40);
      expect(await page.locator('[data-pass=false]').count()).toBe(0);
    });

    test('Button: loading keeps focus and ignores activation; toggle follows Space; disabled leaves the tab order', async ({page}) => {
      const loading = page.locator('#pg-btn-loading');
      await expect(loading).toHaveAttribute('aria-busy', 'true');
      await expect(loading).toHaveAttribute('aria-disabled', 'true');
      expect(await loading.evaluate(el => el.disabled)).toBe(false); // aria-disabled만 있고 네이티브 disabled는 아니라 포커스를 받는다
      await loading.focus(); await expect(loading).toBeFocused();
      await page.keyboard.press('Enter'); await expect(loading).toBeFocused();
      const toggle = page.locator('#pg-btn-toggle');
      await toggle.focus(); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.keyboard.press('Space'); await expect(toggle).toHaveAttribute('aria-pressed', 'true'); await expect(toggle).toHaveAttribute('data-state', 'pressed');
      await page.keyboard.press('Space'); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('#pg-btn-off')).toBeDisabled();
      const outcome = await page.evaluate(() => {
        const result = {};
        const ghost = window.kitControls['pg-btn-text-ghost'], plain = window.kitControls['pg-btn-ghost'];
        try { ghost.setLoading(true); result.ghost = 'allowed'; } catch (e) { result.ghost = e.message.split(':')[0]; }
        plain.setLoading(true); result.icon = document.getElementById('pg-btn-ghost').getAttribute('aria-busy');
        plain.setLoading(false); result.iconAfter = document.getElementById('pg-btn-ghost').getAttribute('aria-busy');
        return result;
      });
      expect(outcome).toEqual({ghost: 'BTN_LOADING_NO_SLOT', icon: 'true', iconAfter: 'false'});
    });

    test('Input: password reveal toggles type and aria-pressed; search clear returns focus; blur validates natively', async ({page}) => {
      const pass = page.locator('#pg-input-pass'), reveal = page.locator('#pg-input-pass').locator('xpath=ancestor::div[@data-ctl="input"]').locator('[data-reveal]');
      await expect(pass).toHaveAttribute('type', 'password');
      await reveal.click(); await expect(pass).toHaveAttribute('type', 'text'); await expect(reveal).toHaveAttribute('aria-pressed', 'true');
      await reveal.click(); await expect(pass).toHaveAttribute('type', 'password');
      const find = page.locator('#pg-input-find'), clear = page.locator('#pg-input-find').locator('xpath=ancestor::div[@data-ctl="input"]').locator('[data-clear]');
      await expect(clear).toBeVisible(); await clear.click();
      await expect(find).toHaveValue(''); await expect(find).toBeFocused(); await expect(clear).toBeHidden();
      await find.fill('abc'); await find.press('Escape'); await expect(find).toHaveValue('');
      const mail = page.locator('#pg-input-req'), root = mail.locator('xpath=ancestor::div[@data-ctl="input"]');
      await mail.focus(); await mail.blur();
      await expect(mail).toHaveAttribute('aria-invalid', 'true'); await expect(root).toHaveAttribute('data-state', 'error');
      await expect(root.locator('.kit-ctl-input-message')).not.toBeEmpty();
      await mail.fill('a@b.co'); await expect(mail).not.toHaveAttribute('aria-invalid', 'true'); await expect(root).toHaveAttribute('data-state', 'default');
    });

    test('Card: selectable toggles aria-pressed with Space; link card exposes one focus stop; no nested interactive', async ({page}) => {
      const pick = page.locator('#pg-card-pick button.kit-ctl-card-hit');
      await pick.focus(); await page.keyboard.press('Space');
      await expect(pick).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('#pg-card-pick')).toHaveAttribute('data-state', 'selected');
      await expect(page.locator('#pg-card-pick .kit-ctl-card-check')).toBeVisible();
      await page.keyboard.press('Enter'); await expect(pick).toHaveAttribute('aria-pressed', 'false');
      expect(await page.locator('#pg-card-link a, #pg-card-link button').count()).toBe(1);
      expect(await page.locator('article[data-behavior=link] button, article[data-behavior=selectable] button:not(.kit-ctl-card-hit), article[data-behavior=link] a:not(.kit-ctl-card-hit)').count()).toBe(0);
    });

    test('Navigation: collapse toggles aria-expanded on narrow screens, Escape returns focus; submenu opens with ArrowDown; aria-current follows clicks', async ({page}) => {
      const fold = page.locator('#pg-nav-fold'), toggle = fold.locator('.kit-ctl-nav-toggle'), list = fold.locator('.kit-ctl-nav-list');
      if (width <= 640) {
        await expect(toggle).toBeVisible(); await expect(list).toBeHidden();
        await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await expect(list).toBeVisible();
        await fold.locator('a').nth(1).focus(); await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(toggle).toBeFocused(); await expect(list).toBeHidden();
      } else { await expect(toggle).toBeHidden(); await expect(list).toBeVisible(); }
      const side = page.locator('#pg-nav-side'), sub = side.locator('.kit-ctl-nav-sub-toggle'), panel = side.locator('.kit-ctl-nav-sub');
      await sub.focus(); await page.keyboard.press('ArrowDown');
      await expect(sub).toHaveAttribute('aria-expanded', 'true'); await expect(panel.locator('a').first()).toBeFocused();
      await page.keyboard.press('ArrowDown'); await expect(panel.locator('a').nth(1)).toBeFocused();
      await page.keyboard.press('Escape'); await expect(sub).toHaveAttribute('aria-expanded', 'false'); await expect(sub).toBeFocused();
      await side.locator('a', {hasText: '설정'}).click();
      await expect(side.locator('[aria-current=page]')).toHaveCount(1); await expect(side.locator('[aria-current=page]')).toHaveText('설정');
    });

    test('Tabs: automatic follows focus, manual needs Enter/Space, disabled tabs are skipped, roving tabindex keeps one tab stop', async ({page}) => {
      const auto = page.locator('#pg-tabs-auto'), tabs = auto.locator('[role=tab]');
      await tabs.nth(0).focus(); await page.keyboard.press('ArrowRight');
      await expect(tabs.nth(2)).toBeFocused(); await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect(auto.locator('[role=tabpanel]:not([hidden])')).toHaveText('파일 패널');
      expect(await auto.locator('[role=tab][tabindex="0"]').count()).toBe(1);
      await page.keyboard.press('End'); await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('ArrowRight'); await expect(tabs.nth(0)).toBeFocused();
      const manual = page.locator('#pg-tabs-manual'), mt = manual.locator('[role=tab]');
      await mt.nth(0).focus(); await page.keyboard.press('ArrowRight');
      await expect(mt.nth(1)).toBeFocused(); await expect(mt.nth(1)).toHaveAttribute('aria-selected', 'false'); await expect(mt.nth(0)).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('Enter'); await expect(mt.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(manual.locator('[role=tabpanel]:not([hidden])')).toHaveText('주 패널');
    });

    test('Modal: showModal moves focus in and makes the page inert; Escape closes and returns focus; alertdialog starts on cancel and ignores backdrop; busy blocks Escape', async ({page}) => {
      const root = page.locator('#pg-modal-form'), trigger = root.locator('.kit-ctl-modal-trigger button'), dialog = root.locator('dialog');
      await trigger.click(); await expect(dialog).toHaveJSProperty('open', true); await expect(root).toHaveAttribute('data-state', 'open');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#pg-modal-name')).toBeFocused();
      // 네이티브 모달: Tab이 한 바퀴 돌면 브라우저 UI(body)로 나갈 수는 있어도 배경 페이지 요소가 포커스를 받지는 않는다.
      for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => { const a = document.activeElement; return a === document.body || !!a.closest('#pg-modal-form dialog'); })).toBe(true); }
      expect(await page.evaluate(() => { document.getElementById('pg-btn-toggle').focus(); return document.activeElement === document.getElementById('pg-btn-toggle'); })).toBe(false);
      expect(await page.evaluate(() => document.querySelector('#pg-modal-form dialog').matches(':modal'))).toBe(true);
      await page.keyboard.press('Escape'); await expect(dialog).toHaveJSProperty('open', false); await expect(trigger).toBeFocused(); await expect(root).toHaveAttribute('data-state', 'closed');
      await trigger.click();
      await page.evaluate(() => window.kitControls['pg-modal-form'].setBusy(true));
      await expect(root).toHaveAttribute('data-state', 'busy'); await page.keyboard.press('Escape'); await expect(dialog).toHaveJSProperty('open', true);
      await page.evaluate(() => window.kitControls['pg-modal-form'].setError('저장하지 못했습니다.'));
      await expect(dialog.locator('[role=alert]')).toHaveText('저장하지 못했습니다.'); await expect(root).toHaveAttribute('data-state', 'error');
      await dialog.locator('[data-modal-action=cancel]').click(); await expect(dialog).toHaveJSProperty('open', false);
      const alertRoot = page.locator('#pg-modal-alert'), alert = alertRoot.locator('dialog');
      await alertRoot.locator('.kit-ctl-modal-trigger button').click();
      await expect(alert).toHaveJSProperty('open', true); await expect(alert.locator('[data-modal-action=cancel]')).toBeFocused();
      await expect(alert.locator('[data-close]')).toHaveCount(0);
      await alert.click({position: {x: 2, y: 2}, force: true}); await expect(alert).toHaveJSProperty('open', true);
      await page.keyboard.press('Escape'); await expect(alert).toHaveJSProperty('open', false);
      const sheetRoot = page.locator('#pg-modal-sheet'), sheet = sheetRoot.locator('dialog');
      await sheetRoot.locator('.kit-ctl-modal-trigger button').click(); await expect(sheet).toHaveJSProperty('open', true);
      const box = await sheet.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(width - 1);
      await page.mouse.click(width / 2, 4); await expect(sheet).toHaveJSProperty('open', false);
    });

    test('Tooltip: focus shows at once, Escape dismisses, hover shows after the delay and stays while the pointer is on it, edge placement stays in the viewport', async ({page}) => {
      const root = page.locator('#pg-tip-name'), button = root.locator('button'), bubble = root.locator('[role=tooltip]');
      await expect(button).toHaveAttribute('aria-labelledby', 'pg-tip-name-tip');
      await expect(bubble).toBeHidden(); await button.focus(); await expect(bubble).toBeVisible(); await expect(root).toHaveAttribute('data-state', 'visible');
      await page.keyboard.press('Escape'); await expect(bubble).toBeHidden();
      const hover = page.locator('#pg-tip-hover'), hb = hover.locator('button'), hbubble = hover.locator('[role=tooltip]');
      await expect(hb).toHaveAttribute('aria-describedby', 'pg-tip-hover-tip');
      await hb.hover(); await expect(hbubble).toBeVisible();
      await hbubble.hover(); await page.waitForTimeout(400); await expect(hbubble).toBeVisible();
      await page.mouse.move(2, 2); await expect(hbubble).toBeHidden();
      const edge = page.locator('#pg-tip-edge'); await edge.locator('button').focus();
      const r = await edge.locator('[role=tooltip]').boundingBox(); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(width + 0.5);
    });

    test('Feedback: dismiss hides and moves focus out of the removed message; a timed toast pauses on hover and then dismisses; roles follow tone', async ({page}) => {
      const msg = page.locator('#pg-fb-dismiss');
      await msg.locator('[data-dismiss]').focus(); await page.keyboard.press('Enter');
      await expect(msg).toBeHidden(); expect(await page.evaluate(() => document.activeElement && document.activeElement.tagName !== 'BODY')).toBe(true);
      const toast = page.locator('#pg-fb-toast');
      await page.clock.install(); await page.reload();
      await expect(toast).toBeVisible(); await toast.hover();
      await page.clock.runFor(9000); await expect(toast).toBeVisible();
      await page.mouse.move(2, 2); await page.clock.runFor(9000); await expect(toast).toBeHidden();
      await expect(page.locator('[data-component="component:feedback-message"] [data-tone=danger][role=alert]').first()).toBeVisible();
      await expect(page.locator('[data-component="component:feedback-message"] [data-tone=info]').first()).toHaveAttribute('role', 'status');
    });
  });
}
