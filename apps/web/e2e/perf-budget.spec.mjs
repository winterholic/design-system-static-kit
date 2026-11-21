// 성능 예산: 주요 라우트의 첫 HTML 이 불러오는 JS 의 크기(gzip·원본)와, 카탈로그 전체(Core)가 초기 JS 에 없다는 것.
// 값은 2026-11-21 `next build`(Turbopack) 실측에 여유 15%를 더한 상한이다. 의도한 증가면 이 표를 함께 올린다.
import {expect, test} from '@playwright/test';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';

// gz·raw 는 실측(바이트), 예산은 실측×1.15 를 천 단위로 올린 값이다.
const ROUTES = [
  {path: '/', gz: 178_739, raw: 580_900, budgetGz: 206_000, budgetRaw: 669_000},
  {path: '/explore', gz: 179_894, raw: 584_270, budgetGz: 207_000, budgetRaw: 673_000},
  {path: '/explore/saas-landing', gz: 179_615, raw: 582_918, budgetGz: 207_000, budgetRaw: 671_000},
  {path: '/components', gz: 178_654, raw: 580_692, budgetGz: 206_000, budgetRaw: 669_000},
  {path: '/components/hero', gz: 179_231, raw: 582_152, budgetGz: 207_000, budgetRaw: 670_000},
  {path: '/studio', gz: 196_496, raw: 640_551, budgetGz: 227_000, budgetRaw: 737_000},
  {path: '/docs/getting-started', gz: 178_050, raw: 579_731, budgetGz: 205_000, budgetRaw: 667_000},
  {path: '/integrations/mcp', gz: 178_050, raw: 579_731, budgetGz: 205_000, budgetRaw: 667_000},
];

// Core 번들(카탈로그 전체)에만 있는 문자열. 이 CSS 주석은 src/styles/expression.mjs 가 내보낸다.
const CORE_MARKER = 'catalog 2.5.0 expression grammar';

const initialScripts = html => {
  const urls = new Set();
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+\.js[^"]*)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/<link[^>]*rel="preload"[^>]*as="script"[^>]*href="([^"]+)"/g)) urls.add(m[1]);
  return [...urls];
};

for (const route of ROUTES) {
  test(`초기 JS 예산: ${route.path}`, async ({request}) => {
    const page = await request.get(route.path);
    expect(page.status()).toBe(200);
    const urls = initialScripts(await page.text());
    expect(urls.length, '초기 스크립트를 찾지 못했다').toBeGreaterThan(0);
    let raw = 0, gz = 0;
    for (const url of urls) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      const body = await response.body();
      expect(body.toString('utf8'), `${url} 는 카탈로그 전체(Core)를 담으면 안 된다`).not.toContain(CORE_MARKER);
      raw += body.length; gz += gzipSync(body).length;
    }
    console.log(`JS ${route.path}: scripts=${urls.length} raw=${raw} gzip=${gz} (예산 raw=${route.budgetRaw} gzip=${route.budgetGz})`);
    expect(gz, `${route.path} gzip`).toBeLessThanOrEqual(route.budgetGz);
    expect(raw, `${route.path} raw`).toBeLessThanOrEqual(route.budgetRaw);
  });
}

test('Core 는 지연 로드되는 청크에만 있어서 시험의 표지가 낡지 않았다', async () => {
  const dir = join(import.meta.dirname, '..', '.next', 'static', 'chunks');
  let holders = 0;
  for (const name of await readdir(dir)) if (name.endsWith('.js') && (await readFile(join(dir, name), 'utf8')).includes(CORE_MARKER)) holders++;
  // 표지가 아무 청크에도 없으면 위 시험이 항상 통과해 버린다. 청크가 있어야 "초기 JS 에 없다"가 의미를 가진다.
  expect(holders, 'CORE_MARKER 를 가진 청크가 없다: 표지를 갱신해야 한다').toBeGreaterThan(0);
});
