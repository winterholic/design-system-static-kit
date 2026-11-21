import {expect, test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const STORAGE_KEY = 'winterholic-static-kit.studio.v1';

async function downloadBytes(page, label) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', {name: label}).click();
  const download = await pending;
  return {download, bytes: await readFile(await download.path())};
}

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

test('WB-06: preview data-theme is temporary and exports stay byte-identical across device and scale', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();

  const baselineJson = await downloadBytes(page, 'JSON 내보내기');
  const baselineHtml = await downloadBytes(page, 'HTML 내보내기');
  expect(JSON.parse(baselineJson.bytes.toString('utf8')).mode).toBe('light');
  expect(baselineHtml.bytes.toString('utf8')).toContain('<html lang="ko" data-theme="light"');

  const previewRoot = page.frameLocator('[data-testid="preview-frame"]').locator('html');
  await page.getByRole('button', {name: '다크로 보기'}).click();
  await expect(page.getByText(/미리보기에서만 다크로 보는 중/)).toBeVisible();
  await expect(previewRoot).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', {name: '모바일 390'}).click();
  await page.getByRole('button', {name: '100%'}).click();
  const darkViewJson = await downloadBytes(page, 'JSON 내보내기');
  const darkViewHtml = await downloadBytes(page, 'HTML 내보내기');
  expect(darkViewJson.bytes).toEqual(baselineJson.bytes);
  expect(darkViewHtml.bytes).toEqual(baselineHtml.bytes);

  await page.getByRole('button', {name: '문서 설정대로'}).click();
  await expect(previewRoot).toHaveAttribute('data-theme', 'light');
  await page.getByRole('tab', {name: '디자인'}).click();
  await expect(page.getByRole('radio', {name: '라이트'})).toHaveAttribute('aria-checked', 'true');
  await expect(previewRoot).toHaveAttribute('data-theme', 'light');

  const documentHtml = await downloadBytes(page, 'HTML 내보내기');
  expect(await page.locator('[data-testid="preview-frame"]').getAttribute('srcdoc')).toBe(documentHtml.bytes.toString('utf8'));
});

test('WB-04/WB-05: invalid JSON reports Core diagnostics without changing the document; valid import clears stale source state across reload', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('현재 문서 유지');
  await page.locator('#f-title').press('Tab');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.doc?.tree?.children?.[0]?.title, STORAGE_KEY)).toBe('현재 문서 유지');
  const beforeInvalidImport = await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    return {doc: saved.doc, origin: saved.origin, picked: saved.picked, selection: saved.selection, modified: saved.modified};
  }, STORAGE_KEY);

  await page.getByRole('button', {name: 'JSON 가져오기'}).click();
  await page.locator('#import-text').fill('{}');
  await page.getByRole('button', {name: '가져오기', exact: true}).click();
  const importErrors = page.getByTestId('import-errors');
  await expect(importErrors).toContainText('REQUIRED');
  await expect(importErrors).toContainText('$.version');
  await expect(importErrors).toContainText('필수 속성을 채우세요.');
  await expect.poll(() => page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    return {doc: saved.doc, origin: saved.origin, picked: saved.picked, selection: saved.selection, modified: saved.modified};
  }, STORAGE_KEY)).toEqual(beforeInvalidImport);
  await page.getByRole('button', {name: '취소', exact: true}).click();
  await expect(page.getByRole('treeitem', {name: /페이지 제목 현재 문서 유지/})).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#f-title')).toHaveValue('현재 문서 유지');

  const importText = await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    const doc = structuredClone(saved.doc);
    doc.name = '가져온 작업 문서';
    doc.tree.children[0].title = '가져온 제목';
    return JSON.stringify(doc);
  }, STORAGE_KEY);
  await page.getByRole('button', {name: 'JSON 가져오기'}).click();
  await page.locator('#import-text').fill(importText);
  await page.getByRole('button', {name: '가져오기', exact: true}).click();
  await expect(page.getByRole('dialog', {name: '가져온 JSON으로 바꿀까요?'})).toBeVisible();
  await page.getByRole('button', {name: '가져와서 바꾸기'}).click();

  await expect(page.getByRole('treeitem', {name: /페이지 가져온 작업 문서/})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('treeitem', {name: /페이지 제목 가져온 제목/})).toBeVisible();
  const documentStatus = page.getByRole('toolbar', {name: '문서 도구'}).getByRole('status');
  await expect(documentStatus).toContainText('가져온 문서');
  await expect.poll(() => page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    return saved ? {origin: saved.origin, selection: saved.selection, modified: saved.modified, title: saved.doc?.tree?.children?.[0]?.title} : null;
  }, STORAGE_KEY)).toEqual({origin: null, selection: [], modified: false, title: '가져온 제목'});

  await page.reload();
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect(page.getByRole('treeitem', {name: /페이지 가져온 작업 문서/})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('treeitem', {name: /페이지 제목 가져온 제목/})).toBeVisible();
  await expect(documentStatus).toContainText('가져온 문서');
  const restoredExport = await downloadBytes(page, 'JSON 내보내기');
  expect(restoredExport.download.suggestedFilename()).toBe('studio-document-blueprint.json');
  expect(JSON.parse(restoredExport.bytes.toString('utf8')).tree.children[0].title).toBe('가져온 제목');

  await page.getByRole('button', {name: '템플릿 바꾸기'}).click();
  await page.getByRole('radio', {name: /saas-landing/}).check();
  await page.getByRole('button', {name: '이 템플릿으로 바꾸기'}).click();
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect(page.getByTestId('op-error')).toHaveCount(0);
});

test('WB-08: rejected deletion preserves the required node, document, and selection atomically', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();

  for (const label of [/^표 최근 작업$/, /^본문\+보조 영역 활동 요약$/]) {
    await page.getByRole('treeitem', {name: label}).click();
    await page.getByRole('button', {name: '삭제'}).click();
  }
  const requiredGrid = page.getByRole('treeitem', {name: /^그리드$/});
  await requiredGrid.click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.doc?.tree?.children?.map(node => node.type), STORAGE_KEY)).toEqual(['page-header', 'grid']);
  const before = await downloadBytes(page, 'JSON 내보내기');

  await page.getByRole('button', {name: '삭제'}).click();
  const failure = page.getByTestId('op-error');
  await expect(failure).toContainText('PAGE_REQUIRE');
  await expect(failure).toContainText('$.tree');
  await expect(failure).toContainText('이 페이지 유형이 요구하는 부품을 추가하세요');
  await expect(failure).toContainText('대시보드 페이지에는');
  await expect(requiredGrid).toHaveAttribute('aria-selected', 'true');
  const after = await downloadBytes(page, 'JSON 내보내기');
  expect(after.bytes).toEqual(before.bytes);
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
  await page.getByRole('button', {name: '취소', exact: true}).click();
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

// ---- 출시 감사: URL 시작 인자와 저장된 작업 -------------------------------------------------
// 수정 여부(modified)만 보면 "가져온 문서"는 편집 전까지 false라서, 주소의 ?template= 가 사용자의 가져온 작업을 예고 없이 덮어썼다.
const importedTitle = '가져온 작업 제목';
const savedSummary = (page) => page.evaluate(key => {
  const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
  return saved ? {origin: saved.origin, modified: saved.modified, title: saved.doc?.tree?.children?.[0]?.title} : null;
}, STORAGE_KEY);

async function seedImportedDocument(page) {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect.poll(() => savedSummary(page)).not.toBeNull();
  const text = await page.evaluate(([key, title]) => {
    const doc = JSON.parse(localStorage.getItem(key)).doc;
    doc.name = '가져온 작업 문서';
    doc.tree.children[0].title = title;
    return JSON.stringify(doc);
  }, [STORAGE_KEY, importedTitle]);
  await page.getByRole('button', {name: 'JSON 가져오기'}).click();
  await page.locator('#import-text').fill(text);
  await page.getByRole('button', {name: '가져오기', exact: true}).click();
  await expect.poll(() => savedSummary(page)).toEqual({origin: null, modified: false, title: importedTitle});
}

test('URL 시작 인자는 가져온 문서(수정 전)를 확인 없이 덮어쓰지 않고, 이어서 작업하면 문서와 저장값이 그대로다', async ({page}) => {
  await seedImportedDocument(page);

  await page.goto('/studio?template=saas-landing');
  const dialog = page.getByRole('dialog', {name: '작업 중인 문서가 있습니다'});
  await expect(dialog).toBeVisible();
  expect(page.url()).toContain('template=saas-landing');
  await dialog.getByRole('button', {name: '이어서 작업'}).click();

  await expect(dialog).toBeHidden();
  await expect.poll(() => new URL(page.url()).search).toBe('');
  await expect(page.getByRole('toolbar', {name: '문서 도구'}).getByRole('status')).toContainText('가져온 문서');
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await expect(page.locator('#f-title')).toHaveValue(importedTitle);
  await page.waitForTimeout(600);
  expect(await savedSummary(page)).toEqual({origin: null, modified: false, title: importedTitle});
});

test('URL 시작 인자를 확인하면 덮어쓰고, 실행 취소로 가져온 문서를 되살린다', async ({page}) => {
  await seedImportedDocument(page);

  await page.goto('/studio?template=saas-landing');
  const dialog = page.getByRole('dialog', {name: '작업 중인 문서가 있습니다'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: '새로 열기 (덮어쓰기)'}).click();
  await expect.poll(() => savedSummary(page).then(s => s?.origin?.template)).toBe('saas-landing');

  await page.getByRole('button', {name: '실행 취소'}).click();
  await expect.poll(() => savedSummary(page)).toEqual({origin: null, modified: false, title: importedTitle});
});

test('수정하지 않은 템플릿 문서는 URL 시작 인자로 바로 바뀐다(주소 계약 유지)', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect.poll(() => savedSummary(page).then(s => s?.origin?.template)).toBe('dashboard-overview');

  await page.goto('/studio?template=saas-landing');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => savedSummary(page).then(s => s?.origin?.template)).toBe('saas-landing');
  await expect.poll(() => new URL(page.url()).search).toBe('');
});

test('수정한 문서는 URL 시작 인자 앞에서 확인을 받는다', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('수정한 제목');
  await page.locator('#f-title').press('Tab');
  await expect.poll(() => savedSummary(page).then(s => s?.title)).toBe('수정한 제목');

  await page.goto('/studio?template=saas-landing');
  await expect(page.getByRole('dialog', {name: '작업 중인 문서가 있습니다'})).toBeVisible();
});

test('수정한 문서의 템플릿 교체는 확인을 받고, 실행 취소·다시 실행이 작업과 미리보기 설정을 따로 다룬다', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('내가 쓴 제목');
  await page.locator('#f-title').press('Tab');
  await expect.poll(() => savedSummary(page).then(s => s?.title)).toBe('내가 쓴 제목');

  await page.getByRole('button', {name: '모바일 390'}).click();
  await page.getByRole('button', {name: '다크로 보기'}).click();
  const previewRoot = page.frameLocator('[data-testid="preview-frame"]').locator('html');
  await expect(previewRoot).toHaveAttribute('data-theme', 'dark');

  const pickSaas = async () => {
    await page.getByRole('button', {name: '템플릿 바꾸기'}).click();
    await page.getByRole('radio', {name: /saas-landing/}).check();
    await page.getByRole('button', {name: '이 템플릿으로 바꾸기'}).click();
  };
  const confirm = page.getByRole('dialog', {name: '템플릿을 바꿀까요?'});
  await pickSaas();
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', {name: '취소', exact: true}).click();
  expect((await savedSummary(page)).title).toBe('내가 쓴 제목');

  await pickSaas();
  await confirm.getByRole('button', {name: '템플릿 바꾸기'}).click();
  await expect.poll(() => savedSummary(page).then(s => s?.origin?.template)).toBe('saas-landing');

  await page.getByRole('button', {name: '실행 취소'}).click();
  await expect.poll(() => savedSummary(page)).toMatchObject({title: '내가 쓴 제목', modified: true});
  await expect(previewRoot).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', {name: '다시 실행'}).click();
  await expect.poll(() => savedSummary(page).then(s => s?.origin?.template)).toBe('saas-landing');
  await expect(previewRoot).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => savedSummary(page).then(s => s?.title)).toBe('내가 쓴 제목');
  await expect(page.getByRole('button', {name: '모바일 390'})).toHaveAttribute('aria-pressed', 'true');
});
