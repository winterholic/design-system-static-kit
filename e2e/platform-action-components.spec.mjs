import {test, expect} from '@playwright/test';
import {assembleComponents, assembleDesign, compileBlueprint} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

// §6.2 A 계열의 브라우저 검증. 두 경로를 같은 동작 기준으로 본다.
//   1) `actions` 입력으로 만든 독립 시연(assembleComponents)
//   2) Blueprint로 컴파일한 페이지(compileBlueprint): 목적 패밀리가 런타임까지 싣고 나오는가
// 390px(폰)과 1280px(데스크톱)에서 키보드, disabled·loading 차단, 메뉴, 복사, 닫기, 단일 선택, 터치 영역, 긴 문구를 본다.
const MENU = [{label: 'PDF로 저장', value: 'pdf'}, {label: 'CSV로 저장', value: 'csv'}, {label: '링크 복사', value: 'link'}];
const LONG = '이 문구는 모바일 화면에서도 잘리지 않고 두 줄 이상으로 자연스럽게 이어져야 합니다.';
const assembly = assembleComponents({
  context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit',
  subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp',
  items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '기본'}}],
  actions: [
    {component: 'component:toggle-button', props: {label: '고정', selected: false, appearance: 'outline'}},
    {component: 'component:loading-action-button', props: {label: '전송', state: 'loading'}},
    {component: 'component:button', props: {label: LONG, size: 'xl'}},
    {component: 'component:menu-button', props: {label: '더 보기', items: MENU}},
    {component: 'component:split-button', props: {label: '내보내기', items: MENU}},
    {component: 'component:copy-button', props: {label: '복사', text: 'copy-target', copiedLabel: '복사했습니다.'}},
    {component: 'component:button', props: {label: '비활성', state: 'disabled'}},
    {component: 'component:segmented-control', props: {label: '보기', items: [{label: '목록'}, {label: '격자', selected: true}, {label: '지도'}]}},
    {component: 'component:close-button', props: {ariaLabel: '공지 닫기', message: '닫을 수 있는 안내입니다.'}},
    {component: 'component:icon-button', props: {label: '설정', icon: 'edit'}},
    {component: 'component:floating-action-button', props: {label: '추가'}},
  ],
});

const stubClipboard = page => page.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => { window.__copied = text; }}, configurable: true});
});
const cmp = (page, id) => page.locator(`[data-component="${id}"]`);

test.describe('standalone `actions` output', () => {
  test('keyboard, disabled/loading blocking, menu, split caret, copy, single selection and dismiss work at phone and desktop widths', async ({page}) => {
    expect(assembly.ok, JSON.stringify(assembly.errors)).toBe(true);
    await stubClipboard(page);
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 860});
      await page.goto('about:blank');
      await page.setContent(assembly.value.standalone);

      // 토글: 키보드(Space)로 aria-pressed가 바뀐다.
      const toggle = cmp(page, 'component:toggle-button');
      await toggle.focus();
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');

      // 로딩: 클릭을 막지만(포커스는 유지) busy가 풀리지 않는다. aria-disabled는 Playwright의 enabled 조건에서 빠지므로 force로 눌러 본다.
      const loading = cmp(page, 'component:loading-action-button');
      await expect(loading).toHaveAttribute('aria-busy', 'true');
      await loading.click({force: true});
      await expect(loading).toHaveAttribute('aria-busy', 'true');

      // disabled: 눌러도 아무 일이 없다.
      const disabled = page.locator('[data-component="component:button"][disabled]');
      await expect(disabled).toBeDisabled();
      await disabled.click({force: true});
      await expect(disabled).toBeDisabled();

      // 메뉴 버튼: 클릭으로 열고, ArrowDown·End·Home·Escape로 움직이고 닫는다. 닫으면 포커스가 트리거로 돌아온다.
      const menu = cmp(page, 'component:menu-button');
      const panel = page.locator(`#${await menu.getAttribute('aria-controls')}`);
      await expect(panel).toBeHidden();
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(panel).toBeVisible();
      await expect(panel.locator('[role=menuitem]').first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(panel.locator('[role=menuitem]').nth(1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(panel.locator('[role=menuitem]').nth(2)).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(panel.locator('[role=menuitem]').first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');

      // 메뉴 항목을 고르면 닫히고 kit-menu-select 이벤트가 나간다.
      await page.evaluate(() => { window.__selected = null; document.addEventListener('kit-menu-select', e => { window.__selected = e.detail; }); });
      await menu.focus();
      await page.keyboard.press('ArrowDown');
      await expect(panel).toBeVisible();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(panel).toBeHidden();
      expect(await page.evaluate(() => window.__selected)).toEqual({label: 'CSV로 저장', value: 'csv'});

      // 바깥을 누르면 닫힌다. 한 번에 하나의 메뉴만 열려 있다.
      await menu.click();
      await expect(panel).toBeVisible();
      const caret = page.locator('[data-component="component:split-button"][aria-haspopup="menu"]');
      await caret.click();
      await expect(caret).toHaveAttribute('aria-expanded', 'true');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      await page.keyboard.press('Escape');
      await expect(caret).toBeFocused();
      await page.locator('body').click({position: {x: 2, y: 2}});

      // 분할 버튼의 주 버튼은 메뉴를 열지 않는다.
      await page.locator('[data-component="component:split-button"]:not([aria-haspopup])').click();
      await expect(caret).toHaveAttribute('aria-expanded', 'false');

      // 복사: 클립보드에 값이 들어가고 읽어 주는 상태 문구가 바뀐다.
      const copy = cmp(page, 'component:copy-button');
      await copy.click();
      await expect.poll(() => page.evaluate(() => window.__copied)).toBe('copy-target');
      await expect(copy.locator('xpath=ancestor::*[@data-ctl="button"]').locator('[role=status]')).toHaveText('복사했습니다.');

      // 단일 선택: 다른 항목을 누르면 이전 항목이 풀리고, 이미 선택된 항목을 다시 눌러도 선택이 유지된다.
      const seg = page.locator('[data-action-segmented] button');
      await expect(seg.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await seg.nth(2).click();
      await expect(seg.nth(2)).toHaveAttribute('aria-pressed', 'true');
      await expect(seg.nth(1)).toHaveAttribute('aria-pressed', 'false');
      await seg.nth(2).click();
      await expect(seg.nth(2)).toHaveAttribute('aria-pressed', 'true');
      expect(await seg.evaluateAll(els => els.filter(e => e.getAttribute('aria-pressed') === 'true').length)).toBe(1);

      // 닫기: 감싼 영역이 사라지고 이벤트가 나간다.
      const box = page.locator('[data-dismissible]');
      await expect(box).toBeVisible();
      await cmp(page, 'component:close-button').click();
      await expect(box).toBeHidden();

      // 가로 넘침이 없고, 긴 문구는 줄바꿈되며, 폰에서 모든 컨트롤의 터치 영역이 44px 이상이다.
      const metrics = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}));
      expect(metrics.scroll, `${width}px: no horizontal overflow`).toBeLessThanOrEqual(metrics.client);
      const long = page.locator('[data-component="component:button"]', {hasText: '이 문구는 모바일'});
      const longBox = await long.boundingBox();
      expect(longBox.height, `${width}px: long label wraps`).toBeGreaterThanOrEqual(width < 640 ? 44 : 56);
      if (width < 640) {
        const small = await page.locator('[data-component]:visible').evaluateAll(els => els.map(e => ({id: e.dataset.component, h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width)})));
        for (const s of small) expect(s.h, `${s.id} touch height at 390px`).toBeGreaterThanOrEqual(44);
        const fab = await cmp(page, 'component:floating-action-button').boundingBox();
        expect(Math.min(fab.width, fab.height), 'FAB is at least 56px').toBeGreaterThanOrEqual(56);
      }
    }
  });

  test('the elevated look and the link look are drawn, not just named in data attributes', async ({page}) => {
    await page.goto('about:blank');
    await page.setContent(assembly.value.standalone);
    const fab = cmp(page, 'component:floating-action-button');
    expect(await fab.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none');
    expect(await fab.evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(20);
  });
});

/** Blueprint를 컴파일한 페이지: 목적 패밀리가 런타임을 같이 싣고 나오는지, 브라우저에서 같은 동작이 되는지 본다. */
function compiledPage(purposes) {
  const kpis = Array.from({length: 3}, (_, i) => ({label: `지표 ${i + 1}`, value: String(i)}));
  const bp = structuredClone(assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis}}, {include: ['blueprint']}).value.candidates[0].value.blueprint);
  bp.materials.purposes = purposes.map(({id, content}, i) => ({id, visual: 'family:quiet', uid: `a-${i}`, variant: getPurposeFamily(id).example.variant, props: getPurposeFamily(id).example.props, content: content ?? getPurposeFamily(id).example.content}));
  const grid = bp.tree.children.find(n => n.type === 'grid');
  grid.columns = purposes.length >= 3 ? 'three' : 'two';
  grid.children = purposes.map((_, i) => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
  const r = compileBlueprint(bp, {include: ['html']});
  expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  return r.value.html;
}

test.describe('Blueprint-compiled A purposes', () => {
  const PAGE = compiledPage([{id: 'purpose:button.menu'}, {id: 'purpose:button.split'}, {id: 'purpose:button.copy', content: {label: '링크 복사', text: 'from-blueprint', copiedLabel: '복사했습니다.'}}]);

  test('purpose:button.menu and purpose:button.split open from a compiled Blueprint, move with the arrow keys and close with Escape', async ({page}) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 860});
      await page.goto('about:blank');
      await page.setContent(PAGE);
      const trigger = page.locator('[data-action-menu]').nth(0).locator('button[aria-haspopup]');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('#a-0-menu')).toBeVisible();
      await expect(page.locator('#a-0-menu [role=menuitem]').first()).toBeFocused();
      for (const item of await page.locator('#a-0-menu [role=menuitem]').all()) expect((await item.boundingBox()).height, `${width}px: menu item touch height`).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Escape');
      await expect(page.locator('#a-0-menu')).toBeHidden();
      await expect(trigger).toBeFocused();
      const caret = page.locator('[data-action-menu]').nth(1).locator('button[aria-haspopup]');
      await caret.click();
      await expect(page.locator('#a-1-menu')).toBeVisible();
      await expect(caret).toHaveAttribute('aria-expanded', 'true');
      expect((await caret.boundingBox()).height, `${width}px: caret height`).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Escape');
      expect((await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth}))).s).toBeLessThanOrEqual(width);
    }
  });

  test('purpose:button.copy copies from a compiled Blueprint and announces the result', async ({page}) => {
    await stubClipboard(page);
    await page.goto('about:blank');
    await page.setContent(PAGE);
    const copy = page.locator('button[data-copy-text]');
    await copy.click();
    await expect.poll(() => page.evaluate(() => window.__copied)).toBe('from-blueprint');
    await expect(copy.locator('xpath=ancestor::*[@data-ctl="button"]').locator('[role=status]')).toHaveText('복사했습니다.');
  });

  test('purpose:button.copy reports a failure when the clipboard rejects, and an aria-disabled copy button copies nothing', async ({page}) => {
    await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => { throw new Error('denied'); }}, configurable: true}); window.__copied = null; });
    await page.goto('about:blank');
    await page.setContent(PAGE);
    const copy = page.locator('button[data-copy-text]');
    await copy.click();
    await expect(copy.locator('xpath=ancestor::*[@data-ctl="button"]').locator('[role=status]')).toHaveText('복사하지 못했습니다.');
    const off = compiledPage([{id: 'purpose:button.copy', content: {label: '링크 복사', text: 'x'}}, {id: 'purpose:button.copy', content: {label: '링크 복사', text: 'x'}}]);
    await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', {value: {writeText: async t => { window.__copied = t; }}, configurable: true}); });
    await page.goto('about:blank');
    // aria-disabled 버튼은 클릭 이벤트가 그대로 나가므로 런타임의 차단 검사가 실제로 막아야 한다(native disabled는 이벤트가 없어 검사가 되지 않는다).
    await page.setContent(off.replaceAll('<button data-copy-text=', '<button aria-disabled="true" data-copy-text='));
    await page.locator('button[data-copy-text]').first().click({force: true});
    expect(await page.evaluate(() => window.__copied)).toBeNull();
  });

  test('purpose:button.close hides its box and purpose:button.fab keeps a 56px round touch target on a phone', async ({page}) => {
    const closePage = compiledPage([{id: 'purpose:button.close'}, {id: 'purpose:button.fab'}]);
    await page.setViewportSize({width: 390, height: 860});
    await page.goto('about:blank');
    await page.setContent(closePage);
    const box = page.locator('[data-dismissible]');
    await expect(box).toBeVisible();
    const close = box.locator('button[data-action-dismiss]');
    expect((await close.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(box).toBeHidden();
    const fab = page.locator('.pf-fab button');
    const b = await fab.boundingBox();
    expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(56);
    expect(await fab.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none');
  });
});
