// 03-interfaces.md 3.2절 스파이크 S2~S5 실측. 결과는 docs/dev/platform/04-web-spike.md 에 기록한다.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {expect, test} from '@playwright/test';

const site = resolve(import.meta.dirname, '../../../site');
const expectedHtml = readFileSync(join(site, 'examples/saas-landing/index.html'));
const expectedSha = createHash('sha256').update(expectedHtml).digest('hex');

test('S4 서버: 서버가 컴파일한 HTML이 site/examples/saas-landing/index.html 과 바이트 동일', async ({request}) => {
  const res = await request.get('/dev/spike/html');
  expect(res.status()).toBe(200);
  expect(Buffer.compare(await res.body(), expectedHtml)).toBe(0);
});

test('S4 서버 페이지의 sha256 과 ./edit 문서로 만든 sha256 이 파일과 같다', async ({page}) => {
  await page.goto('/dev/spike');
  const r = page.getByTestId('server-result');
  await expect(r).toHaveAttribute('data-sha256', expectedSha);
  await expect(r).toHaveAttribute('data-edit-sha256', expectedSha);
});

test('S2·S4 브라우저: 클라이언트 번들이 Node 폴리필 없이 컴파일하고 바이트 동일', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/dev/spike');
  // 폴리필 부재를 직접 확인: 브라우저에 Node 전역이 없다.
  expect(await page.evaluate(() => [typeof Buffer, typeof process === 'undefined' ? 'undefined' : typeof process.versions?.node])).toEqual(['undefined', 'undefined']);
  await page.getByRole('button', {name: '브라우저에서 컴파일'}).click();
  const r = page.getByTestId('client-result');
  await expect(r).toBeVisible();
  await expect(r).toHaveAttribute('data-error', '');
  await expect(r).toHaveAttribute('data-sha256', expectedSha);
  expect(errors).toEqual([]);
});

// S5: 카탈로그·컴파일러는 클릭 전에는 내려받지 않는다. 카탈로그 본문에만 있는 식별자로 청크를 구분한다.
const CATALOG_MARKER = 'AXIS_BAN';
test('S5 초기 JS에 카탈로그가 없고 컴파일 때만 청크가 내려온다', async ({page}) => {
  const seen = [];
  page.on('response', async res => {
    if (!res.url().endsWith('.js') && !res.url().includes('.js?')) return;
    const body = await res.text().catch(() => '');
    seen.push({url: new URL(res.url()).pathname, bytes: Buffer.byteLength(body), catalog: body.includes(CATALOG_MARKER)});
  });
  for (const path of ['/', '/explore', '/studio', '/dev/spike']) {
    await page.goto(path, {waitUntil: 'networkidle'});
  }
  const initial = seen.filter(s => s.catalog);
  expect(initial, '클릭 전 JS 에 카탈로그가 실렸다').toEqual([]);
  expect(seen.length).toBeGreaterThan(0);
  await page.getByRole('button', {name: '브라우저에서 컴파일'}).click();
  await expect(page.getByTestId('client-result')).toBeVisible();
  const lazy = seen.filter(s => s.catalog);
  expect(lazy.length).toBeGreaterThan(0);
  test.info().annotations.push({type: 'S5', description: JSON.stringify({initialJsBytes: seen.filter(s => !s.catalog).reduce((n, s) => n + s.bytes, 0), lazyCatalogChunks: lazy})});
});
