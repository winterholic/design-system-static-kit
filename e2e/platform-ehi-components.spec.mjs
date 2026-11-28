import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

const make = purpose => {
  const family = getPurposeFamily(purpose);
  const request = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', items: [{purpose, visual: 'family:quiet', ...family.example}]};
  const result = assembleComponents(request);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value.standalone;
};

test('E/H/I overlay runtime opens, traps focus, locks scroll, closes with Escape and restores focus at 390px and 1280px', async ({page}) => {
  await page.setContent(make('purpose:overlay.drawer'));
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 800});
    const trigger = page.locator('[data-ehi-trigger]');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.locator('html').evaluate(x => x.style.overflow)).toBe('hidden');
    const close = page.locator('[data-ehi-close]');
    await close.focus();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.locator('html').evaluate(x => x.style.overflow)).toBe('');
  }
});

test('E command/context menus support roving arrow keys, filtering and right-click, while tooltip exposes its described text', async ({page}) => {
  const family = getPurposeFamily('purpose:navigation.command-menu');
  const command = {...family.example, content: {label: '명령', items: [{label: '내보내기'}, {label: '복사'}]}};
  const request = {context: 'dashboard', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', items: [
    {purpose: 'purpose:navigation.command-menu', visual: 'family:quiet', ...command},
    {purpose: 'purpose:navigation.context-menu', visual: 'family:quiet', ...getPurposeFamily('purpose:navigation.context-menu').example},
    {purpose: 'purpose:overlay.contextual-help', visual: 'family:quiet', ...getPurposeFamily('purpose:overlay.contextual-help').example},
  ]};
  const result = assembleComponents(request);
  expect(result.ok, JSON.stringify(result.errors)).toBe(true);
  await page.setContent(result.value.standalone);
  const triggers = page.locator('[data-ehi-trigger]');
  await triggers.nth(0).click();
  const menu = page.getByRole('menu').nth(0), filter = page.locator('[data-ehi-filter]');
  const first = menu.locator('[data-ehi-item]').nth(0), second = menu.locator('[data-ehi-item]').nth(1);
  await expect(filter).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(second).toBeFocused();
  await page.locator('[data-ehi-filter]').fill('복사');
  await expect(first).toBeHidden();
  await expect(second).toBeVisible();
  await page.keyboard.press('Escape');
  await triggers.nth(1).click({button: 'right'});
  await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  const help = page.locator('[data-ehi-tooltip-trigger]');
  await help.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  expect(await help.getAttribute('aria-describedby')).toBe(await page.getByRole('tooltip').getAttribute('id'));
});
