import {expect, test} from '@playwright/test';

const STORAGE_KEY = 'winterholic-static-kit.studio.v1';

test.beforeEach(async ({page}) => {
  await page.goto('/studio');
  await page.evaluate(() => localStorage.clear());
});

test('WB-02/WB-03: theme and layout edits preserve authored content', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('스튜디오 보존 확인');
  await page.locator('#f-title').press('Tab');
  await expect(page.getByText('수정됨')).toBeVisible();

  await page.getByRole('tab', {name: '디자인'}).click();
  await page.locator('#d-theme-select').selectOption('console');
  const layout = page.locator('select[id^="d-layout-"]').first();
  if (await layout.count()) {
    const options = await layout.locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean));
    if (options.length) await layout.selectOption(options.at(-1));
  }
  await page.getByRole('tab', {name: '구조·내용'}).click();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await expect(page.locator('#f-title')).toHaveValue('스튜디오 보존 확인');
});

test('WB-06: preview color mode is separate from document mode and both exports', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('button', {name: '다크로 보기'}).click();
  await expect(page.getByText(/미리보기에서만 다크로 보는 중/)).toBeVisible();
  await page.getByRole('tab', {name: '디자인'}).click();
  await expect(page.getByRole('radio', {name: '라이트'})).toHaveAttribute('aria-checked', 'true');

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'JSON 내보내기'}).click();
  const jsonFile = await jsonDownload;
  const jsonPath = await jsonFile.path();
  const {readFile} = await import('node:fs/promises');
  const exported = JSON.parse(await readFile(jsonPath, 'utf8'));
  expect(exported.mode).toBe('light');

  const htmlDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'HTML 내보내기'}).click();
  const htmlFile = await htmlDownload;
  const htmlPath = await htmlFile.path();
  const html = await readFile(htmlPath, 'utf8');
  expect(html).toContain('data-mode="light"');
  expect(await page.locator('[data-testid="preview-frame"]').getAttribute('srcdoc')).toBe(html);
});

test('modified work is saved, restored, and protected by overwrite confirmation', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('저장 복원 왕복');
  await page.locator('#f-title').press('Tab');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.doc?.tree?.children?.[0]?.title, STORAGE_KEY)).toBe('저장 복원 왕복');

  await page.reload();
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await expect(page.locator('#f-title')).toHaveValue('저장 복원 왕복');
  await page.getByRole('button', {name: '초기화'}).click();
  await expect(page.getByRole('dialog', {name: '초기화할까요?'})).toBeVisible();
  await page.getByRole('button', {name: '취소'}).click();
  await expect(page.locator('#f-title')).toHaveValue('저장 복원 왕복');
});

test('corrupt save remains recoverable when storage clearing fails', async ({page}) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, '{broken-json');
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) {
      if (name === key) throw new DOMException('storage is locked', 'SecurityError');
      return remove.call(this, name);
    };
  }, STORAGE_KEY);
  await page.goto('/studio');
  const recovery = page.getByRole('alert', {name: '저장된 작업을 읽을 수 없어 자동 저장을 멈췄습니다'});
  await expect(recovery).toBeVisible();
  await page.getByRole('button', {name: '저장값 초기화'}).click();
  await expect(recovery).toBeVisible();
  await expect(page.getByText(/초기화하지 못했습니다/)).toBeVisible();
});

test('mobile panel controls and keyboard tree selection stay usable at 390px', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect(page.locator('[data-testid="preview"]')).toBeHidden();
  await page.getByRole('button', {name: '미리보기'}).click();
  await expect(page.locator('[data-testid="preview"]')).toBeVisible();
  await page.getByRole('button', {name: '편집'}).click();
  await expect(page.locator('[data-testid="preview"]')).toBeHidden();
  const root = page.getByRole('treeitem', {name: '페이지 워크스페이스'});
  await root.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('treeitem', {name: /페이지 제목/})).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
