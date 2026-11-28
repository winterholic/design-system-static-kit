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

test('Playground 기본 선택은 컴파일된 미리보기 하나를 만들고 변형 축 이름과 예시 콘텐츠가 충돌하지 않는다', async ({page}) => {
  // button-control 의 재료 변형 축 이름이 content 라서, 같은 이름의 자유 텍스트 선택이 Core 변형 검증에 걸렸었다.
  await page.goto('/components/button-control?tab=playground');
  await expect(page.locator('iframe[title="button-control 컴파일 미리보기"]')).toHaveCount(1);
  await expect(page.getByText('렌더되지 않았습니다')).toHaveCount(0);
  await page.getByLabel('예시 콘텐츠').fill('결제하기');
  await page.getByLabel('예시 콘텐츠').blur();
  await expect(page).toHaveURL(/exampleText=/);
  const frame = page.frameLocator('iframe[title="button-control 컴파일 미리보기"]');
  await expect(frame.getByText('결제하기')).toBeVisible();
});

test('탭은 방향키로 포커스를 옮기고 Enter 로 열며 aria-controls 가 실제 패널을 가리킨다', async ({page}) => {
  await page.goto('/components/button-control');
  const overview = page.getByRole('tab', {name: 'Overview'});
  await expect(overview).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('tab', {name: 'Variants'})).toHaveAttribute('tabindex', '-1');
  await expect(overview).toHaveAttribute('aria-controls', 'panel-overview');
  await expect(page.locator('#panel-overview[role="tabpanel"]')).toHaveCount(1);
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', {name: 'Variants'})).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', {name: 'Composition'})).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(overview).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', {name: 'Variants'})).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/tab=variants/);
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
});

test('시각 패밀리 선택은 실제 출력을 바꾸고 Code 는 같은 선택의 내보내기와 같다', async ({page, request}) => {
  const query = family => `palette=palette%3Astatic-kit&subtokenSet=subtoken-set%3Astandard&typeSystem=type-system%3Amkt-launch&density=comfortable&mode=light&viewport=1280&visualFamily=family%3A${family}`;
  const soft = await (await request.get(`/components/button-control/render?${query('soft')}`)).text();
  const bold = await (await request.get(`/components/button-control/render?${query('bold')}`)).text();
  expect(bold).not.toBe(soft);

  await page.goto('/components/button-control?tab=code&visualFamily=family%3Abold');
  await expect(page.getByText('Blueprint · blueprint.json')).toBeVisible();
  const selection = {palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', visualFamily: 'family:bold', typeSystem: 'type-system:mkt-launch', density: 'comfortable', mode: 'light'};
  await expect(page.getByLabel('컴파일 Blueprint JSON').first()).toContainText('family:bold');
  const files = (await (await request.get(`/components/button-control/export?selection=${encodeURIComponent(JSON.stringify({...selection, size: 'medium', appearance: 'solid', state: 'default', viewport: '1280'}))}`)).json()).files;
  expect(JSON.parse(files['blueprint.json']).family).toBe('family:bold');
});
