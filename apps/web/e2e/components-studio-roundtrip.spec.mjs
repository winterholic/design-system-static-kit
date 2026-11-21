import {expect, test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('Components opens the selected registered material in Studio, preserves work, previews and exports it', async ({page}) => {
  await page.goto('/components/select-control');

  for (const [axis, value] of [['mode', 'multiple'], ['search', 'local'], ['maxMenuHeight', '192']]) {
    await page.getByRole('combobox', {name: axis}).click();
    await page.getByRole('option', {name: value, exact: true}).click();
  }

  const studioLink = page.getByRole('link', {name: '선택한 부품을 Studio에서 열기'});
  const href = await studioLink.getAttribute('href');
  expect(href).toContain('component=select-control');
  expect(href).toContain('componentAxes=mode%3Amultiple%2Csearch%3Alocal%2Csize%3Amd%2Cshape%3Asoft%2Cstate%3Aready%2CmaxMenuHeight%3A192');
  await studioLink.click();

  const preview = page.frameLocator('[data-testid="preview-frame"]');
  await expect(preview.locator('.kit-select')).toHaveAttribute('data-mode', 'multiple');
  await expect(preview.locator('.kit-select')).toHaveAttribute('data-search', 'local');
  await expect(preview.locator('.kit-select')).toHaveAttribute('data-menu-height', '192');
  await expect(page.getByRole('treeitem').filter({hasText: '선택 상자'})).toBeVisible();
  await page.getByRole('treeitem').filter({hasText: '선택 상자'}).click();
  await expect(page.getByRole('combobox', {name: 'maxMenuHeight'})).toContainText('192');

  await page.locator('[data-field="id"]').fill('region-edited');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.studio.v1') || '{}').modified)).toBe(true);
  await page.goto(href);
  await expect(page.getByRole('dialog')).toContainText('작업 중인 문서가 있습니다');
  await expect(page.locator('[data-field="id"]')).toHaveValue('region-edited');
  await page.getByRole('button', {name: '이어서 작업'}).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'HTML 내보내기'}).click();
  const download = await downloadPromise;
  const html = await readFile(await download.path(), 'utf8');
  expect(html).toContain('data-mode="multiple"');
  expect(html).toContain('data-search="local"');
  expect(html).toContain('data-menu-height="192"');
  expect(html).toContain('region-edited');
});
