import {readFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';

const designId = 'saas-landing~palette_pearl~mode_dark~hero_product';

test('복합 Explore 디자인을 실제 Studio 링크로 열고 다운로드·문서 미리보기가 산출물과 같다', async ({page, request}, testInfo) => {
  const blueprintResponse = await request.get(`/explore/${designId}/blueprint.json`);
  const htmlResponse = await request.get(`/explore/${designId}/render`);
  expect(blueprintResponse.status()).toBe(200);
  expect(htmlResponse.status()).toBe(200);
  const blueprint = await blueprintResponse.json();
  const html = await htmlResponse.text();
  expect(blueprint.palette).toBe('pearl');
  expect(blueprint.mode).toBe('dark');
  expect(blueprint.tree.children.find(node => node.type === 'hero')?.variant).toBe('product');

  await page.goto(`/explore/${designId}`);
  // 시작 상태는 링크의 주소 인자로 전달되고, Studio 는 이를 한 번 쓴 뒤 주소에서 지운다(features/studio/url.ts).
  // 클릭 뒤 주소는 Core 로딩 속도에 따라 순간만 보이므로 경합이 생긴다. 인자는 클릭 전 href 로 확인하고, 클릭 뒤에는 적용된 상태와 소비된 주소를 확인한다.
  const open = page.getByRole('link', {name: 'Studio에서 열기'});
  await expect(open).toHaveAttribute('href', '/studio?template=saas-landing&palette=pearl&mode=dark&layout=hero:product');
  await open.click();
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect(page).toHaveURL(/\/studio$/);
  await page.getByRole('tab', {name: '디자인'}).click();
  await expect(page.getByRole('radio', {name: '다크'})).toHaveAttribute('aria-checked', 'true');

  const frame = page.getByTestId('preview-frame');
  await expect(frame).toHaveAttribute('srcdoc', /data-theme="dark"/);
  expect(await frame.evaluate(element => element.srcdoc)).toBe(html);

  const jsonDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'JSON 내보내기'}).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe('saas-landing-blueprint.json');
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).toBeTruthy();
  expect(await readFile(jsonPath, 'utf8')).toBe(JSON.stringify(blueprint, null, 2) + '\n');

  const htmlDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'HTML 내보내기'}).click();
  const htmlDownload = await htmlDownloadPromise;
  expect(htmlDownload.suggestedFilename()).toBe('saas-landing.html');
  const htmlPath = await htmlDownload.path();
  expect(htmlPath).toBeTruthy();
  expect(await readFile(htmlPath, 'utf8')).toBe(html);
});
