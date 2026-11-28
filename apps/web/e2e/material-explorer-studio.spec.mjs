import {expect, test} from '@playwright/test';

test('Explore 재료 비교는 레지스트리 축을 URL로 복원하고 두 Core 결과만 비교한다', async ({page}) => {
  await page.goto('/explore/materials?purpose=work-dashboard&style=work-console&palette=slate-neutral&set=standard&type=work-console&family=soft&compare=palette&left=palette:ocean-cool&right=palette:forest-green');
  await expect(page.getByRole('heading', {name: '재료 조합 비교'})).toBeVisible();
  await expect(page.getByRole('combobox', {name: '페이지 목적'})).toHaveValue('work-dashboard');
  await expect(page.getByRole('combobox', {name: '디자인 맥락'})).toHaveValue('work-console');
  await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).toHaveValue('palette:ocean-cool');
  await expect(page.getByRole('combobox', {name: '오른쪽 재료'})).toHaveValue('palette:forest-green');
  await expect(page.getByRole('heading', {name: '팔레트 계열 비교'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).toHaveValue('palette:ocean-cool');
  await expect(page.getByRole('combobox', {name: '오른쪽 재료'})).toHaveValue('palette:forest-green');
});

test('Studio 재료 선택은 단계 탭 전환과 새로고침 뒤에도 Core 입력으로 남는다', async ({page}) => {
  await page.goto('/studio/assemble?purpose=work-dashboard&step=swap&palette=slate-neutral&set=standard&type=work-console&family=soft&layout=dashboard-grid&component=data-table&state=loading-skeleton&surface=hairline-panel&motion=still&background=blueprint-grid-lines&media=square-tech&density=compact');
  await expect(page.getByLabel('레이아웃')).toHaveAttribute('data-value', 'dashboard-grid');
  await expect(page.getByLabel('컴포넌트')).toHaveAttribute('data-value', 'data-table');
  await expect(page.getByLabel('상태 패턴')).toHaveAttribute('data-value', 'loading-skeleton');
  await page.getByRole('link', {name: '6. 내보내기'}).click();
  await expect(page).toHaveURL(/layout=dashboard-grid/);
  await expect(page).toHaveURL(/component=data-table/);
  await expect(page).toHaveURL(/state=loading-skeleton/);
  await page.reload();
  await expect(page.getByRole('heading', {name: '코드로 가져가기'})).toBeVisible();
  await page.getByRole('link', {name: '재료 다시 바꾸기'}).click();
  await expect(page.getByLabel('레이아웃')).toHaveAttribute('data-value', 'dashboard-grid');
  await expect(page.getByLabel('컴포넌트')).toHaveAttribute('data-value', 'data-table');
});

test('Core 조립 필드가 없는 아이콘 영역 재료는 이유를 보여 주고 선택을 막는다', async ({page}) => {
  await page.goto('/studio/assemble?step=swap');
  await page.getByRole('combobox', {name: '아이콘 영역'}).click();
  const disabled = page.getByRole('option', {name: /아이콘/}).first();
  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  await expect(disabled).toHaveAttribute('title', /아이콘 영역 선택 필드가 없어/);
});

test('Explore 시각화 비교는 같은 데이터가 든 두 등록 chart preset을 복원한다', async ({page}) => {
  await page.goto('/explore/materials?compare=chart&left=chart-preset:marketing-channel-roas&right=chart-preset:finance-yield-curve');
  await expect(page.getByRole('heading', {name: '시각화 비교'})).toBeVisible();
  await expect(page.locator('iframe[title*="같은 데이터 차트 미리보기"]')).toHaveCount(2);
  await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).toHaveValue('chart-preset:marketing-channel-roas');
  await expect(page.getByRole('combobox', {name: '오른쪽 재료'})).toHaveValue('chart-preset:finance-yield-curve');
});
