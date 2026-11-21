import {expect, test} from '@playwright/test';

test('홈과 Explore 필터는 URL에 남고 뒤로 가기·새로고침에서 복원된다', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name: /디자인 컴파일러/})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Explore 둘러보기'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Studio에서 만들기'})).toBeVisible();
  await page.goto('/explore');
  await page.getByLabel('페이지 유형').selectOption({index: 1});
  await expect(page).toHaveURL(/type=/);
  const selected = await page.getByLabel('페이지 유형').inputValue();
  const design = page.locator('a[href^="/explore/"]:not([href="/explore/combos"])').first();
  if (await design.count()) { await design.click(); await page.goBack(); }
  await expect(page.getByLabel('페이지 유형')).toHaveValue(selected);
  await page.reload();
  await expect(page.getByLabel('페이지 유형')).toHaveValue(selected);
  await page.getByRole('button', {name: '초기화'}).click();
  await expect(page).toHaveURL(/\/explore$/);
});

test('Explore 상세는 컴파일 바이트와 Blueprint 및 Studio 계약을 제공하고 존재하지 않는 ID는 404', async ({page, request}) => {
  await page.goto('/explore');
  const card = page.locator('a[href^="/explore/"]:not([href="/explore/combos"])').first();
  const href = await card.getAttribute('href');
  const detail = await request.get(href);
  const html = await request.get(`${href}/render`);
  const blueprint = await request.get(`${href}/blueprint.json`);
  expect(detail.status()).toBe(200);
  expect(html.status()).toBe(200);
  expect(blueprint.status()).toBe(200);
  await page.goto(href);
  await expect(page.getByRole('link', {name: 'Studio에서 열기'})).toHaveAttribute('href', /\/studio\?template=/);
  const studioUrl = new URL(await page.getByRole('link', {name: 'Studio에서 열기'}).getAttribute('href'), 'http://localhost');
  expect(studioUrl.searchParams.get('template')).toBe(href.split('/').at(-1).split('~')[0]);
  await expect(page.getByRole('link', {name: /전체 화면/})).toBeVisible();
  expect((await request.get('/explore/not-a-design')).status()).toBe(404);
});

test('Components는 실제 명세를 보여 주고 잘못된 부품 ID는 404', async ({page, request}) => {
  await page.goto('/components');
  await page.getByRole('link', {name: /hero/}).first().click();
  await expect(page.getByRole('heading', {name: '히어로'})).toBeVisible();
  await expect(page.getByRole('heading', {name: '허용 속성'})).toBeVisible();
  await expect(page.getByRole('heading', {name: '놓을 수 있는 자리'})).toBeVisible();
  await expect(page.getByRole('table').getByRole('row').nth(1)).toBeVisible();
  await expect(page.locator('iframe[title*="렌더 결과"]')).toBeVisible();
  expect((await request.get('/components/not-a-component')).status()).toBe(404);
});

test('내부 조합 탐색기는 유지되고 /combos 는 쿼리를 보존하는 307로 이동한다', async ({page, request}) => {
  const query = 'c=saas-landing&theme=aurora&q=%ED%95%9C%EA%B8%80&exp=1&ps=24&p=2';
  const redirect = await request.get(`/combos/?${query}`, {maxRedirects: 0});
  expect(redirect.status()).toBe(307);
  expect(redirect.headers().location).toBe(`/dev/qa/combos?${query}`);
  const response = await page.goto('/dev/qa/combos');
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', {name: /전체 조합/})).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByLabel('조합 검색')).toBeVisible();
  await expect(page.getByLabel('페이지 유형')).toBeVisible();
  await expect(page.getByLabel('쪽 크기')).toBeVisible();
});
