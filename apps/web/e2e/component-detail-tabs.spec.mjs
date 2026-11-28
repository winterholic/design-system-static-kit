import {test, expect} from '@playwright/test';

const counters = async request => (await (await request.get('/api/dev/perf-counters')).json()).counters;

test('상세는 활성 탭만 만들고 탭 전환으로 페이지 컴파일을 반복하지 않는다', async ({page, request}) => {
  await request.post('/api/dev/perf-counters');
  await page.goto('/components/button-control?tab=tokens');
  await expect(page.getByRole('tab', {name: 'Tokens'})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').getByText('--kit-action', {exact: true})).toBeVisible();
  await expect(page.locator('iframe[title$="기본 컴파일 결과"]')).toHaveCount(0);
  await expect(page.getByText('Blueprint · blueprint.json')).toHaveCount(0);

  const before = await counters(request);
  await page.getByRole('tab', {name: 'Composition'}).click();
  await expect(page.getByRole('tab', {name: 'Composition'})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('허용 부모')).toBeVisible();
  const after = await counters(request);
  expect(after.total).toBe(before.total);

  await page.goBack();
  await expect(page.getByRole('tab', {name: 'Tokens'})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Blueprint · blueprint.json')).toHaveCount(0);
});

test('탭과 Playground 선택이 URL에 남고 브라우저 뒤로 가기로 복원된다', async ({page}) => {
  await page.goto('/components/button-control');
  await page.getByRole('tab', {name: 'Playground'}).click();
  await page.getByLabel('크기').selectOption('large');
  await expect(page).toHaveURL(/tab=playground/);
  await expect(page).toHaveURL(/size=large/);
  await page.goBack();
  await expect(page.getByLabel('크기')).toHaveValue('medium');
});
