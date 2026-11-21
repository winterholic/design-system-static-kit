import {expect, test} from '@playwright/test';
import {optionStates, pick} from './helpers/select.mjs';

// Studio 정상 조작 규약: 화면이 고르게 해 주는 선택은 오류 없이 적용되고, 사용자 작업은 확인 없이 교체되지 않는다.
const STORAGE_KEY = 'winterholic-static-kit.studio.v1';

const summary = page => page.evaluate(key => {
  const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
  return saved ? {origin: saved.origin, modified: saved.modified, title: saved.doc?.tree?.children?.[0]?.title, name: saved.doc?.name} : null;
}, STORAGE_KEY);

async function openTemplate(page, template) {
  await page.goto(`/studio?template=${template}`);
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect.poll(() => summary(page)).not.toBeNull();
}

async function importDocument(page, {name, title}) {
  const text = await page.evaluate(([key, n, t]) => {
    const doc = JSON.parse(localStorage.getItem(key)).doc;
    doc.name = n;
    doc.tree.children[0].title = t;
    return JSON.stringify(doc);
  }, [STORAGE_KEY, name, title]);
  await page.getByRole('button', {name: 'JSON 가져오기'}).click();
  await page.locator('#import-text').fill(text);
  await page.getByRole('button', {name: '가져오기', exact: true}).click();
}

const selectedTitle = async page => {
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  return page.locator('#f-title').inputValue();
};

test.beforeEach(async ({page}) => {
  await page.goto('/studio');
  await page.evaluate(() => localStorage.clear());
});

// ---- 부품 추가: 실제로 받아들여지는 부품만 보인다 ----------------------------------------------

test('부품 추가: 안에 추가와 뒤에 추가가 따로 있고, 목록의 모든 부품이 오류 없이 들어간다', async ({page}) => {
  test.setTimeout(300_000); // 후보를 하나씩 실제로 넣어 본다.
  await openTemplate(page, 'dashboard-overview');
  const add = page.getByRole('group', {name: '부품 추가'});
  const inside = add.getByRole('group', {name: '선택한 노드 안에 추가'});
  const after = add.getByRole('group', {name: '선택한 노드 뒤에 추가'});
  await expect(inside).toBeVisible();
  await expect(after).toBeVisible();

  const targets = [/^그리드$/, /^페이지 제목/, /^페이지 워크스페이스$/];
  for (const target of targets) {
    await page.getByRole('treeitem', {name: target}).first().click();
    await expect(add).not.toContainText('여기엔 불가');
    for (const [where, group] of [['inside', inside], ['after', after]]) {
      const select = group.getByRole('combobox');
      const values = (await select.count()) ? (await optionStates(page, select)).map(o => o.value).filter(Boolean) : [];
      const disabled = await group.getByRole('button').first().isDisabled();
      if (!values.length) { expect(disabled, `${target} ${where}: 후보가 없으면 추가 버튼도 비활성`).toBe(true); continue; }
      // 후보마다 하나씩 실제로 넣어 보고 되돌린다(수가 많아도 전부 확인한다).
      for (const value of values) {
        await pick(page, select, value);
        await group.getByRole('button').first().click();
        await expect(page.getByTestId('op-error'), `${target} ${where} ${value}`).toHaveCount(0);
        await page.getByRole('button', {name: '실행 취소'}).click();
        await page.getByRole('treeitem', {name: target}).first().click();
      }
    }
  }
});

test('부품 추가: 선택한 노드가 받을 수 없는 자리에는 선택지가 없고 이유를 말해 준다', async ({page}) => {
  await openTemplate(page, 'dashboard-overview');
  await page.getByRole('treeitem', {name: /^페이지 제목/}).first().click();
  const inside = page.getByRole('group', {name: '선택한 노드 안에 추가'});
  await expect(inside.getByRole('combobox')).toHaveCount(0);
  await expect(inside).toContainText('추가할 수 있는 부품이 없습니다');
  await expect(inside.getByRole('button').first()).toBeDisabled();
  // 페이지 루트에는 뒤에 추가할 자리가 없다.
  await page.getByRole('treeitem', {name: /^페이지 워크스페이스$/}).click();
  await expect(page.getByRole('group', {name: '선택한 노드 뒤에 추가'}).getByRole('combobox')).toHaveCount(0);
});

// ---- 디자인: 충돌하는 선택은 고르기 전에 막는다 ---------------------------------------------------

async function designSelects(page) {
  await page.getByRole('tab', {name: '디자인'}).click();
  return page.locator('[role="tabpanel"] [role="combobox"]');
}

for (const template of ['dashboard-overview', 'agency-home']) {
  test(`디자인(${template}): 활성 선택지는 모두 오류 없이 적용되고, 충돌하는 선택지는 비활성이다`, async ({page}) => {
  test.setTimeout(300_000);
    await openTemplate(page, template);
    const selects = await designSelects(page);
    const count = await selects.count();
    expect(count).toBeGreaterThan(5);
    let disabledSeen = 0;
    for (let i = 0; i < count; i++) {
      const id = await selects.nth(i).getAttribute('id');
      const options = await optionStates(page, selects.nth(i));
      disabledSeen += options.filter(o => o.disabled).length;
      // 팔레트는 400개를 넘고 전부 같은 연산이라, 고르게 뽑은 몇 개만 눌러 본다. 나머지 선택지의 판정은 Core 단위 테스트가 전부 대조한다.
      const usable = options.filter(o => o.value && !o.disabled);
      const step = id === 'd-palette' ? Math.ceil(usable.length / 8) : 1;
      for (const option of usable.filter((_, k) => k % step === 0)) {
        // 앞서 고른 값 때문에 이 선택지가 지금은 충돌할 수 있다(선택지는 현재 조합 기준이다). 지금 활성인 것만 누른다.
        if (!await pick(page, page.locator(`#${id}`), option.value, {skipDisabled: true})) continue;
        await expect(page.getByTestId('op-error'), `${id}=${option.value}`).toHaveCount(0);
      }
    }
    if (template === 'dashboard-overview') expect(disabledSeen, '이 템플릿의 shell·elevation·width에는 충돌하는 값이 있다').toBeGreaterThan(0);
    // 버튼으로 고르는 테마 변형·문서 색 모드도 오류 없이 적용된다.
    for (const radio of await page.getByRole('radio').all()) {
      if (await radio.isDisabled()) continue;
      await radio.click();
      await expect(page.getByTestId('op-error')).toHaveCount(0);
    }
  });
}

test('디자인: 금지 조합인 값은 선택지에서 이유와 함께 비활성으로 보인다', async ({page}) => {
  await openTemplate(page, 'dashboard-overview');
  await designSelects(page);
  const shell = await optionStates(page, page.locator('#d-axis-shell'));
  const editorial = shell.find(o => o.value === 'editorial');
  expect(editorial.disabled).toBe(true);
  expect(editorial.label).toContain('PAGE_SHELL');
  expect(shell.find(o => o.value === 'sidebar').disabled).toBe(false);
});

test('디자인: 히어로 지표를 둘 곳이 없는 구성 변형은 콘텐츠를 옮긴다고 알리고, 고르면 오류 없이 적용된다', async ({page}) => {
  await openTemplate(page, 'agency-home');
  await designSelects(page);
  const hero = page.locator('#d-layout-hero');
  const split = (await optionStates(page, hero)).find(o => o.value === 'split');
  expect(split.disabled).toBe(false);
  expect(split.label).toContain('옮겨');
  await pick(page, hero, 'split');
  await expect(page.getByTestId('op-error')).toHaveCount(0);
  await expect(hero).toHaveAttribute('data-value', 'split');
});

test('JSON 직접 편집은 충돌하는 조합에 정확한 진단을 보여 주고 문서를 바꾸지 않는다', async ({page}) => {
  await openTemplate(page, 'dashboard-overview');
  const text = await page.evaluate(key => {
    const doc = JSON.parse(localStorage.getItem(key)).doc;
    doc.shell = 'editorial';
    return JSON.stringify(doc);
  }, STORAGE_KEY);
  const before = await summary(page);
  await page.getByRole('button', {name: 'JSON 가져오기'}).click();
  await page.locator('#import-text').fill(text);
  await page.getByRole('button', {name: '가져오기', exact: true}).click();
  const errors = page.getByTestId('import-errors');
  await expect(errors).toContainText('PAGE_SHELL');
  await expect(errors).toContainText('$.shell');
  await expect(errors).toContainText('해결:');
  expect(await summary(page)).toEqual(before);
});

// ---- 문서 보호: 가져온 작업은 수정 전이어도 확인 없이 교체되지 않는다 --------------------------------

test('가져온 문서(수정 전)는 템플릿 바꾸기·초기화·다시 가져오기 앞에서 확인을 받고, 취소하면 그대로다', async ({page}) => {
  await openTemplate(page, 'dashboard-overview');
  await importDocument(page, {name: '가져온 작업 문서', title: '가져온 제목'});
  await expect.poll(() => summary(page)).toMatchObject({origin: null, modified: false, title: '가져온 제목'});
  expect(await selectedTitle(page)).toBe('가져온 제목');

  // 템플릿 바꾸기
  await page.getByRole('button', {name: '템플릿 바꾸기'}).click();
  await page.getByRole('radio', {name: /saas-landing/}).check();
  await page.getByRole('button', {name: '이 템플릿으로 바꾸기'}).click();
  const replace = page.getByRole('dialog', {name: '템플릿을 바꿀까요?'});
  await expect(replace).toBeVisible();
  await replace.getByRole('button', {name: '취소', exact: true}).click();
  await expect.poll(() => summary(page)).toMatchObject({origin: null, title: '가져온 제목'});

  // 초기화
  await page.getByRole('button', {name: '초기화'}).click();
  const reset = page.getByRole('dialog', {name: '초기화할까요?'});
  await expect(reset).toBeVisible();
  await reset.getByRole('button', {name: '취소', exact: true}).click();
  expect(await selectedTitle(page)).toBe('가져온 제목');

  // 다시 가져오기
  await importDocument(page, {name: '다른 문서', title: '두 번째 제목'});
  const again = page.getByRole('dialog', {name: '가져온 JSON으로 바꿀까요?'});
  await expect(again).toBeVisible();
  await again.getByRole('button', {name: '취소', exact: true}).click();
  expect(await selectedTitle(page)).toBe('가져온 제목');
  await page.waitForTimeout(600);
  await expect.poll(() => summary(page)).toMatchObject({origin: null, title: '가져온 제목'});
});

test('실행 취소·다시 실행 뒤에도 같은 규칙이 적용된다(되살린 가져온 문서도 확인을 받는다)', async ({page}) => {
  await openTemplate(page, 'dashboard-overview');
  await importDocument(page, {name: '가져온 작업 문서', title: '가져온 제목'});
  await expect.poll(() => summary(page)).toMatchObject({origin: null, title: '가져온 제목'});

  // 확인하고 교체한 뒤 실행 취소하면 가져온 문서가 돌아오고, 그 문서를 다시 교체하려면 또 확인을 받는다.
  await page.getByRole('button', {name: '초기화'}).click();
  await page.getByRole('dialog', {name: '초기화할까요?'}).getByRole('button', {name: '초기화', exact: true}).click();
  await expect.poll(() => summary(page).then(s => s?.origin?.template)).toBe('dashboard-overview');
  await page.getByRole('button', {name: '실행 취소'}).click();
  await expect.poll(() => summary(page)).toMatchObject({origin: null, title: '가져온 제목'});
  await page.getByRole('button', {name: '초기화'}).click();
  await expect(page.getByRole('dialog', {name: '초기화할까요?'})).toBeVisible();
  await page.getByRole('button', {name: '취소', exact: true}).click();

  // 다시 실행은 교체된 상태로 가고, 수정 전 템플릿 문서는 확인 없이 바꿀 수 있다.
  await page.getByRole('button', {name: '다시 실행'}).click();
  await expect.poll(() => summary(page).then(s => s?.origin?.template)).toBe('dashboard-overview');
  await page.getByRole('button', {name: '초기화'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('미리보기 설정은 문서와 저장값, 확인 규칙에 영향을 주지 않는다', async ({page}) => {
  await openTemplate(page, 'dashboard-overview');
  await importDocument(page, {name: '가져온 작업 문서', title: '가져온 제목'});
  await expect.poll(() => summary(page)).toMatchObject({origin: null, title: '가져온 제목'});
  const before = await summary(page);
  await page.getByRole('button', {name: '모바일 390'}).click();
  await page.getByRole('button', {name: '다크로 보기'}).click();
  await page.waitForTimeout(500);
  expect(await summary(page)).toEqual(before);
  await page.getByRole('button', {name: '초기화'}).click();
  await expect(page.getByRole('dialog', {name: '초기화할까요?'})).toBeVisible();
});

test('자동 저장: 다른 탭이 저장한 작업을 오래된 탭이 덮어쓰지 않고, 이유와 선택지를 보여 준다', async ({page, context}) => {
  await openTemplate(page, 'dashboard-overview');
  const other = await context.newPage();
  await other.goto('/studio');
  await expect(other.locator('[data-phase="ready"]')).toBeVisible();
  await other.getByRole('treeitem', {name: /페이지 제목/}).click();
  await other.locator('#f-title').fill('다른 탭의 작업');
  await other.locator('#f-title').press('Tab');
  await expect.poll(() => summary(other).then(s => s?.title)).toBe('다른 탭의 작업');

  // 오래된 탭(바뀐 것이 없는 상태)이 화면을 떠나도 저장소의 최신 작업을 건드리지 않고, 알릴 일도 없다.
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(600);
  expect((await summary(page)).title).toBe('다른 탭의 작업');
  const banner = page.getByRole('alert', {name: '다른 탭에서 저장한 작업이 있어 자동 저장을 멈췄습니다'});
  await expect(banner).toHaveCount(0);

  // 오래된 탭에서 편집을 시작하면 저장하기 전에 충돌을 알리고 멈춘다. 저장된 작업은 그대로다.
  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('오래된 탭의 편집');
  await page.locator('#f-title').press('Tab');
  await expect(banner).toBeVisible();
  await page.waitForTimeout(600);
  expect((await summary(page)).title).toBe('다른 탭의 작업');

  await banner.getByRole('button', {name: '저장된 작업 불러오기'}).click();
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  expect(await selectedTitle(page)).toBe('다른 탭의 작업');
  await expect(page.getByRole('alert', {name: '다른 탭에서 저장한 작업이 있어 자동 저장을 멈췄습니다'})).toHaveCount(0);
  await other.close();
});

test('자동 저장: 이 탭을 직접 고른 경우에만 다른 탭의 작업을 덮어쓴다', async ({page, context}) => {
  await openTemplate(page, 'dashboard-overview');
  const other = await context.newPage();
  await other.goto('/studio');
  await expect(other.locator('[data-phase="ready"]')).toBeVisible();
  await other.getByRole('treeitem', {name: /페이지 제목/}).click();
  await other.locator('#f-title').fill('다른 탭의 작업');
  await other.locator('#f-title').press('Tab');
  await expect.poll(() => summary(other).then(s => s?.title)).toBe('다른 탭의 작업');

  await page.getByRole('treeitem', {name: /페이지 제목/}).click();
  await page.locator('#f-title').fill('이 탭의 작업');
  await page.locator('#f-title').press('Tab');
  const banner = page.getByRole('alert', {name: '다른 탭에서 저장한 작업이 있어 자동 저장을 멈췄습니다'});
  await expect(banner).toBeVisible();
  await page.waitForTimeout(600);
  expect((await summary(page)).title).toBe('다른 탭의 작업');
  await banner.getByRole('button', {name: '이 탭 내용으로 덮어쓰기'}).click();
  await expect.poll(() => summary(page).then(s => s?.title)).toBe('이 탭의 작업');
  await expect(banner).toHaveCount(0);
  await other.close();
});
