// 보안 시험: 응답 헤더, Studio 미리보기 iframe 의 sandbox, REST·MCP 의 413·429 거부.
import {expect, test} from '@playwright/test';

const PAGES = ['/', '/explore', '/explore/saas-landing', '/components/hero', '/studio', '/docs/getting-started', '/integrations/mcp', '/explore/saas-landing/render', '/examples/saas-landing/', '/api/v1/openapi.json'];

for (const path of PAGES) {
  test(`보안 헤더: ${path}`, async ({request}) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const h = response.headers();
    // 라우트가 이미 nosniff 를 싣는 API 도 설정 헤더와 겹쳐 값이 두 번 나오지 않아야 한다.
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(h['content-security-policy']).toContain("object-src 'none'");
    expect(h['x-frame-options']).toBe('SAMEORIGIN');
    expect(h['permissions-policy']).toContain('camera=()');
    expect(h['x-powered-by']).toBeUndefined();
  });
}

test('Studio 미리보기 iframe 은 빈 sandbox 라서 스크립트·같은 출처 권한이 없다', async ({page}) => {
  await page.goto('/studio?template=dashboard-overview');
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  const frame = page.locator('[data-testid="preview-frame"]');
  await expect(frame).toHaveAttribute('sandbox', '');
  // 정확히 빈 값이어야 한다. 토큰이 하나라도 붙으면(allow-scripts, allow-same-origin 등) 권한이 열린다.
  expect(await frame.evaluate(el => el.sandbox.length)).toBe(0);
});

test('Explore 미리보기 iframe 은 같은 출처 render 주소만 쓴다', async ({page, baseURL}) => {
  await page.goto('/explore/saas-landing');
  const frame = page.locator('iframe[title]').first();
  await expect(frame).toBeVisible();
  const src = await frame.getAttribute('src');
  expect(new URL(src, baseURL).origin).toBe(new URL(baseURL).origin);
});

const OVERSIZED = 'x'.repeat(600 * 1024); // 본문 상한(512KiB)보다 크다.

test('REST: 상한을 넘는 본문은 413 PAYLOAD_TOO_LARGE 로 거부한다', async ({request}) => {
  for (const path of ['/api/v1/validate', '/api/v1/compile']) {
    const response = await request.post(path, {data: {blueprint: {title: OVERSIZED}}});
    expect(response.status(), path).toBe(413);
    expect(await response.json()).toMatchObject({ok: false, errors: [expect.objectContaining({code: 'PAYLOAD_TOO_LARGE'})]});
  }
});

test('REST: 호출 제한을 넘으면 429 RATE_LIMITED 와 Retry-After 를 준다', async ({request}) => {
  // 호출자 키는 x-forwarded-for 의 첫 값이라 시험마다 고유 키를 써서 다른 시험의 한도를 쓰지 않는다.
  const headers = {'x-forwarded-for': '203.0.113.' + (1 + Math.floor(Math.random() * 250))};
  let limited = null;
  for (let i = 0; i < 130 && !limited; i++) {
    const response = await request.post('/api/v1/validate', {headers, data: {blueprint: {}}});
    if (response.status() === 429) limited = response;
    else expect(response.status()).toBe(422);
  }
  expect(limited, '한도 안에서 429 가 나오지 않았다').not.toBeNull();
  expect(Number(limited.headers()['retry-after'])).toBeGreaterThanOrEqual(1);
  expect(limited.headers()['cache-control']).toBe('no-store');
  expect(await limited.json()).toMatchObject({ok: false, errors: [expect.objectContaining({code: 'RATE_LIMITED'})]});
  // 다른 호출자는 영향을 받지 않는다.
  const other = await request.post('/api/v1/validate', {headers: {'x-forwarded-for': '198.51.100.7'}, data: {blueprint: {}}});
  expect(other.status()).toBe(422);
});

test('MCP: 상한을 넘는 본문은 413 으로 거부한다', async ({request}) => {
  const response = await request.post('/api/mcp', {
    headers: {'content-type': 'application/json', accept: 'application/json, text/event-stream'},
    data: {jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name: 'validate_blueprint', arguments: {blueprint: {title: OVERSIZED}}}},
  });
  expect(response.status()).toBe(413);
  expect(await response.json()).toMatchObject({error: {data: {code: 'PAYLOAD_TOO_LARGE'}}});
});

const INTERNALS = /\/Users\/|node_modules|\.next\/|file:\/\/|at \S+ \(|\.m?[jt]sx?:\d+/;

test('REST·MCP 오류 응답은 구조화된 봉투이고 내부 경로·스택을 싣지 않는다', async ({request}) => {
  const bad = [
    ['GET', '/api/v1/components/..%2F..%2Fpackage.json'],
    ['GET', '/api/v1/catalog?kind=../../etc/passwd'],
    ['POST', '/api/v1/validate', '{bad'],
    ['POST', '/api/v1/compile', '{"blueprint":' + '['.repeat(100_000) + ']'.repeat(100_000) + '}'],
  ];
  for (const [method, path, body] of bad) {
    const response = await request.fetch(path, {method, headers: {'content-type': 'application/json'}, data: body === undefined ? undefined : Buffer.from(body), maxRedirects: 0});
    const text = await response.text();
    expect([400, 404, 422], `${method} ${path.slice(0, 40)}`).toContain(response.status());
    expect(response.headers()['content-type'], path.slice(0, 40)).toContain('application/json');
    expect(JSON.parse(text), path.slice(0, 40)).toMatchObject({ok: false, errors: [expect.objectContaining({code: expect.any(String), path: expect.any(String), hint: expect.any(String)})]});
    expect(text, path.slice(0, 40)).not.toMatch(INTERNALS);
  }
  const mcp = await request.post('/api/mcp', {
    headers: {'content-type': 'application/json', accept: 'application/json, text/event-stream'},
    data: Buffer.from('{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"compile_design","arguments":{"blueprint":' + '{"a":'.repeat(40_000) + '1' + '}'.repeat(40_000) + '}}}'),
  });
  expect(await mcp.text()).not.toMatch(INTERNALS);
});

test('MCP: 다른 출처(Origin)의 호출은 403 으로 거부한다', async ({request}) => {
  const response = await request.post('/api/mcp', {
    headers: {'content-type': 'application/json', accept: 'application/json, text/event-stream', origin: 'https://evil.example'},
    data: {jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name: 'validate_blueprint', arguments: {blueprint: {}}}},
  });
  expect(response.status()).toBe(403);
});
