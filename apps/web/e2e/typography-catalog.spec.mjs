import {expect, test} from '@playwright/test';

const noHorizontalOverflow = async page => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, '가로 넘침이 없어야 한다').toBeLessThanOrEqual(0);
};

for (const width of [390, 1280]) {
  test(`타이포 카탈로그·검색·비교·Specimen ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await page.goto('/materials/typography');
    await expect(page.getByTestId('type-catalog-count')).toContainText('41개 결과');
    await expect(page.getByTestId('type-catalog-grid').locator('> li')).toHaveCount(24);
    await noHorizontalOverflow(page);

    await page.goto('/materials/typography?with=tech-erp&scenario=erp');
    await page.getByRole('link', {name: '다음'}).click();
    await expect(page).toHaveURL(/page=2.*with=tech-erp|with=tech-erp.*page=2/);
    await expect(page.getByTestId('type-catalog-count')).toContainText('2/2쪽');
    await page.goto('/materials/typography');

    await page.getByRole('searchbox', {name: '검색'}).fill('finance');
    await page.getByLabel('계열').selectOption('finance');
    await page.getByRole('button', {name: '필터 적용'}).click();
    await expect(page).toHaveURL(/q=finance.*family=finance|family=finance.*q=finance/);
    await expect(page.getByTestId('type-catalog-count')).toContainText('4개 결과');

    await page.goto('/materials/typography?with=tech-erp,work-console,work-insight,work-finance-banking&scenario=erp');
    await expect(page.getByTestId('type-compare')).toContainText('4/4개 선택');
    await expect(page.getByRole('button', {name: /네 개 선택 한도/}).first()).toBeDisabled();
    await expect(page.locator('[data-testid="type-grid"] li[data-system]')).toHaveCount(4);
    await page.getByRole('group', {name: '비교할 콘텐츠'}).getByRole('link', {name: '커머스'}).click();
    await expect(page).toHaveURL(/scenario=commerce/);
    await expect(page.locator('[data-testid="type-grid"] li[data-system]')).toHaveCount(4);
    await noHorizontalOverflow(page);

    await page.goto('/materials/typography?system=doc-essay');
    await expect(page.getByTestId('type-role-list').locator('[data-role]')).toHaveCount(27);
    await expect(page.getByTestId('type-specimen')).toContainText('굵기 700');
    await expect(page.getByTestId('type-specimen')).toContainText('日本語');
    await expect(page.getByTestId('type-specimen').locator('[data-part="standalone"]')).toHaveAttribute('download', '');
    await noHorizontalOverflow(page);
  });
}

test('비교 선택은 push 상태를 써서 뒤로 가기와 앞으로 가기로 복원한다', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/materials/typography');
  await page.getByRole('link', {name: '비교에 추가'}).first().click();
  await expect(page).toHaveURL(/with=/);
  const selectedUrl = page.url();
  await page.goBack();
  await expect(page).not.toHaveURL(/with=/);
  await page.goForward();
  await expect(page).toHaveURL(selectedUrl);
  await expect(page.getByTestId('type-compare')).toContainText('1/4개 선택');
});
