import {test, expect} from '@playwright/test';
import {buildPage, makeEnv} from '../scripts/families/pages.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

const env = makeEnv();
const VISUAL = 'family:quiet';
async function open(page, id, patch = {}) {
  const f = getPurposeFamily(id), item = {purpose: id, visual: VISUAL, variant: f.example.variant, props: f.example.props, content: f.example.content, ...patch};
  const context = f.contexts.includes('dashboard') ? 'dashboard' : f.contexts[0];
  const built = buildPage(env, f.group, VISUAL, {items: [item], runtime: true, context});
  expect(built.ok, JSON.stringify(built.diagnostics)).toBe(true);
  await page.goto('about:blank');
  await page.setContent(built.html);
}

test('F·G data patterns work by keyboard or pointer and stay inside phone width', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await open(page, 'purpose:card.selection');
  const selection = page.locator('.pf-card-selection button[aria-pressed]');
  await expect(selection).toHaveAttribute('aria-pressed', 'false');
  await selection.focus(); await page.keyboard.press('Space');
  await expect(selection).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card-selection')).toHaveAttribute('data-selected', 'true');

  await open(page, 'purpose:table.filterable');
  const rows = page.locator('[data-table-filterable] tbody tr[data-row]');
  await page.locator('[data-table-filter]').fill('Worker');
  await expect(rows.filter({hasText: 'Worker'})).toBeVisible();
  await expect(rows.filter({hasText: 'API Gateway'})).toBeHidden();
  await expect(page.locator('[data-filter-count]')).toContainText('1개');

  await open(page, 'purpose:table.expandable');
  const summary = page.locator('details[data-row-expand] summary').first();
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded', 'true');

  await open(page, 'purpose:table.tree');
  const root = page.locator('[role=treeitem][aria-level="1"]').first();
  await root.focus(); await page.keyboard.press('ArrowRight');
  await expect(root).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[role=group]').first()).toBeVisible();

  const geometry = await page.evaluate(() => ({page: document.documentElement.scrollWidth - document.documentElement.clientWidth, component: document.querySelector('.pf')?.scrollWidth - document.querySelector('.pf')?.clientWidth}));
  expect(geometry.page).toBeLessThanOrEqual(1);
  expect(geometry.component).toBeLessThanOrEqual(1);
});
