import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';

const assembly = assembleComponents({
  context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit',
  subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp',
  items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '기본'}}],
  actions: [
    {component: 'component:toggle-button', props: {label: '고정', selected: false, appearance: 'outline'}},
    {component: 'component:loading-action-button', props: {label: '전송', state: 'loading'}},
    {component: 'component:button', props: {label: '이 문구는 모바일 화면에서도 잘리지 않고 두 줄 이상으로 자연스럽게 이어져야 합니다.', size: 'xl'}},
    {component: 'component:menu-button', props: {label: '더 보기'}},
    {component: 'component:copy-button', props: {label: '복사', text: 'copy-target'}},
    {component: 'component:button', props: {label: '비활성', state: 'disabled'}},
  ],
});

test('action controls preserve keyboard, disabled/loading, menu and copy behavior at phone and desktop widths', async ({page}) => {
  expect(assembly.ok, JSON.stringify(assembly.errors)).toBe(true);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => { window.__copied = text; }}}); });
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 860});
    await page.setContent(assembly.value.standalone);
    const toggle = page.locator('[data-component="component:toggle-button"]');
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const loading = page.locator('[data-component="component:loading-action-button"]');
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await loading.click();
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    const disabled = page.locator('[data-component="component:button"][disabled]');
    await expect(disabled).toBeDisabled();
    await disabled.click({force: true});
    const menu = page.locator('[data-component="component:menu-button"]');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.locator('[data-component="component:copy-button"]').click();
    await expect.poll(() => page.evaluate(() => window.__copied)).toBe('copy-target');
    const long = page.locator('[data-component="component:button"]', {hasText: '이 문구는 모바일'});
    const metrics = await long.evaluate(el => ({height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client);
    expect(metrics.height).toBeGreaterThanOrEqual(width < 640 ? 44 : 56);
  }
});
