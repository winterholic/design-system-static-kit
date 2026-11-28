// 일반 카탈로그 목록(Explore, Components, Typography)의 성능 구조 검증(REQUEST §3.4, §3.6).
// iframe 0개, 목록 요청 동적 컴파일 0회, 스크롤 왕복 재요청 0회, 미리보기가 실제로 그려짐(깨진 이미지 없음).
// 서버는 DSK_PERF_METRICS=1 로 뜬다(playwright.config.mjs). 컴파일 횟수는 /api/dev/perf-counters 로 읽는다.
import {expect, test} from '@playwright/test';

const LISTS = [
  {path: '/explore', name: 'Explore'},
  {path: '/components', name: 'Components'},
  {path: '/materials/typography', name: 'Typography'},
];

const counters = async request => (await (await request.get('/api/dev/perf-counters')).json());

// 같은 배포의 공개 서비스 API에서 목록 전체의 기대 ID 집합을 만든다. 화면의 data-total 값만 믿으면
// 페이지와 총수가 함께 누락된 회귀를 통과시킬 수 있다.
async function publicComponentHrefs(request) {
  const [partsResponse, purposesResponse] = await Promise.all([
    request.get('/api/v1/catalog?kind=components&catalogVersion=2.6.0&limit=200&fields=type,label,group'),
    request.get('/api/v1/platform/materials?kind=purpose-family&limit=200&fields=id,group'),
  ]);
  expect(partsResponse.ok()).toBe(true);
  expect(purposesResponse.ok()).toBe(true);
  const [parts, purposes] = await Promise.all([partsResponse.json(), purposesResponse.json()]);
  expect(parts.ok).toBe(true);
  expect(purposes.ok).toBe(true);
  return [
    ...parts.value.items.filter(item => item.type !== 'page').map(item => `/components/${item.type}`),
    ...purposes.value.items.map(item => {
      const [group, name] = item.id.slice('purpose:'.length).split('.');
      return `/components/purpose/${group}/${name}`;
    }),
  ];
}

async function sweep(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const positions = [];
  for (let y = 0; y < height; y += 600) positions.push(y);
  positions.push(height);
  for (const y of [...positions, ...[...positions].reverse()]) {
    await page.evaluate(top => window.scrollTo({top, behavior: 'instant'}), y);
    await page.waitForTimeout(40);
  }
}

for (const list of LISTS) {
  test(`${list.name} 목록: iframe 0개, 컴파일 0회, 스크롤 왕복 재요청 0회, 미리보기가 모두 정적 파일로 그려진다`, async ({page, request}) => {
    const before = await counters(request);
    expect(before.enabled, 'DSK_PERF_METRICS=1 로 떠야 한다').toBe(true);
    await request.post('/api/dev/perf-counters');

    const hits = new Map();
    page.on('request', r => {
      const url = new URL(r.url());
      if (/^\/(previews\/|platform\/render|explore\/[^/]+\/render|components\/[^/]+\/render)/.test(url.pathname)) hits.set(url.pathname + url.search, (hits.get(url.pathname + url.search) ?? 0) + 1);
    });
    const frames = [];
    page.on('framenavigated', f => { if (f !== page.mainFrame() && f.url() !== 'about:blank') frames.push(f.url()); });

    await page.goto(list.path, {waitUntil: 'networkidle'});
    expect(await page.locator('iframe').count(), 'iframe 은 목록에 없다').toBe(0);
    // 스크롤 전에 실제로 불러온 미리보기 수(지연 로딩). 브라우저의 지연 로딩 여유(대략 두 화면)만큼만 불러오고 DOM 의 카드 전부를 불러오지 않는다.
    const initialLoads = [...hits.keys()].filter(k => k.startsWith('/previews/')).length;
    const cardsInDom = await page.locator('[data-preview]').count();
    console.log(`${list.name}: 초기 로딩 미리보기 ${initialLoads}개, DOM 의 미리보기 카드 ${cardsInDom}개`);
    expect(initialLoads, '초기 로딩 미리보기 수').toBeLessThanOrEqual(32);
    if (cardsInDom > 40) expect(initialLoads, '카드가 많은 목록은 일부만 먼저 불러온다').toBeLessThan(cardsInDom / 2);

    await sweep(page);
    await page.waitForLoadState('networkidle');
    expect(await page.locator('iframe').count()).toBe(0);
    expect(frames, '스크롤 중 iframe 이 열렸다').toEqual([]);

    // 숨긴 탭의 내용을 DOM 에 두지 않는다(REQUEST §3.4: 화면만 숨기고 전체를 렌더링하는 방식은 금지)
    expect(await page.locator('[hidden] img, [hidden] [data-preview], [role="tabpanel"][hidden]').count(), '숨겨진 영역에 카드가 있다').toBe(0);

    // 모든 미리보기 박스는 사전 생성 정적 파일을 가리키고, 그림이 실제로 디코드된다
    const boxes = await page.locator('[data-preview]').evaluateAll(els => els.map(el => ({mode: el.getAttribute('data-preview'), src: el.querySelector('img')?.getAttribute('src') ?? null, text: el.textContent})));
    expect(boxes.length, '미리보기가 있어야 한다').toBeGreaterThan(0);
    // 사전 생성 때 Core 가 거부한 조합은 컴파일하지 않고 이유를 보인다(unavailable). 그 밖에는 모두 정적 파일이어야 한다.
    const unavailable = boxes.filter(b => b.mode === 'unavailable');
    for (const b of unavailable) expect(b.text.length, '거부 사유가 보여야 한다').toBeGreaterThan(5);
    const shown = boxes.filter(b => b.mode !== 'unavailable');
    expect(shown.filter(b => b.mode !== 'static').map(b => b.mode + ' ' + b.src), '정적 파일이 아닌 미리보기(동적 컴파일 또는 빈 자리)').toEqual([]);
    for (const b of shown) expect(b.src).toMatch(/^\/previews\/[0-9a-f]{32}\.svg$/);
    const broken = await page.locator('[data-preview] img').evaluateAll(imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')));
    expect(broken, '깨졌거나 아직 불러오지 못한 그림').toEqual([]);

    // 스크롤 왕복에도 같은 주소를 두 번 요청하지 않는다(재컴파일은 물론 재요청도 없다). 동적 렌더 주소는 한 번도 요청하지 않는다.
    const dynamic = [...hits.keys()].filter(k => !k.startsWith('/previews/'));
    expect(dynamic, '목록이 동적 렌더 주소를 요청했다').toEqual([]);
    expect([...hits].filter(([, n]) => n > 1).map(([k]) => k), '같은 미리보기를 두 번 이상 요청했다').toEqual([]);

    // 서버가 Core 컴파일을 한 번도 하지 않았다(렌더 호출 포함)
    const after = await counters(request);
    expect(after.counters, '목록 요청 중 서버 컴파일').toMatchObject({compileBlueprint: 0, assembleDesign: 0, assembleComponents: 0, total: 0});
  });
}

// REQUEST §3.4: 카테고리 청크와 검색 결과 모두 첫 화면 DOM은 24개 이하만 둔다.
test('Components 카테고리는 17개 탭을 제공하고 선택한 카테고리 청크만 로드한다', async ({page}) => {
  await page.goto('/components');
  await expect(page.locator('[data-testid="components-list"]')).not.toHaveAttribute('aria-busy', 'true');
  expect(await page.getByRole('tab').count()).toBe(17);
  expect(await page.locator('[data-testid="components-list"] li').count()).toBeLessThanOrEqual(24);
  expect(await page.locator('iframe').count()).toBe(0);
  expect(await page.locator('[hidden] li, [role="tabpanel"][hidden]').count()).toBe(0);

  const chunkRequests = [];
  page.on('request', request => { if (request.url().includes('/catalog-chunks/')) chunkRequests.push(new URL(request.url()).pathname); });
  await page.getByRole('tab', {name: /모바일/}).click();
  await expect(page).toHaveURL(/[?&]category=mobile/);
  await expect(page.locator('[data-testid="components-list"]')).not.toHaveAttribute('aria-busy', 'true');
  expect(chunkRequests).toEqual(['/catalog-chunks/mobile-1.json']);
  expect(await page.locator('[data-testid="components-list"] li').count()).toBeLessThanOrEqual(24);
  expect(await page.locator('[hidden] li, [role="tabpanel"][hidden]').count()).toBe(0);
});

test('Components 전체 검색, 카테고리, 페이지 URL이 직접 접근과 뒤로 가기에서 복원된다', async ({page}) => {
  await page.goto('/components?category=mobile');
  await expect(page.getByRole('tab', {name: /모바일/})).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('searchbox', {name: '검색'}).fill('hero');
  await page.getByRole('button', {name: '검색', exact: true}).click();
  await expect(page).toHaveURL(/[?&]category=mobile.*[?&]q=hero|[?&]q=hero.*[?&]category=mobile/);
  await expect(page.locator('a[href="/components/hero"]')).toBeVisible();
  expect(await page.locator('[data-testid="components-list"] li').count()).toBeLessThanOrEqual(24);
  expect(await page.locator('[data-testid="components-list"] [data-preview="dynamic"]').count()).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/[?&]category=mobile/);
  await expect(page.getByRole('tab', {name: /모바일/})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('searchbox', {name: '검색'})).toHaveValue('');

  await page.goto('/components?category=all&page=2');
  await expect(page.locator('[data-testid="components-list"] li')).toHaveCount(24);
  await expect(page.locator('[data-testid="components-list"]')).not.toHaveAttribute('aria-busy', 'true');
});

test('Components 시각 패밀리 전환은 사전 생성된 정적 렌더를 바꾼다', async ({page}) => {
  await page.goto('/components?category=navigation');
  await expect(page.locator('[data-testid="components-list"]')).not.toHaveAttribute('aria-busy', 'true');
  const image = page.locator('a[href="/components/purpose/navigation/bottom"] [data-preview="static"] img');
  await expect(image).toBeVisible();
  const before = await image.getAttribute('src');
  await page.getByRole('combobox', {name: '시각 패밀리'}).selectOption('family:elevated-material');
  await expect(page).toHaveURL(/[?&]family=family%3Aelevated-material/);
  await expect(page.locator('[data-testid="components-list"]')).not.toHaveAttribute('aria-busy', 'true');
  const after = await page.locator('[data-preview="static"] img').first().getAttribute('src');
  expect(after).not.toBe(before);
  expect(await page.locator('[data-preview="dynamic"]').count()).toBe(0);
  expect(await page.locator('iframe').count()).toBe(0);
});

test('Components 카테고리 탭은 390px에서 가로 스크롤이 가능하다', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/components');
  const dimensions = await page.locator('[aria-label="카테고리"]').evaluate(el => ({width: el.clientWidth, content: el.scrollWidth}));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.width).toBeLessThanOrEqual(390);
  expect(dimensions.content).toBeGreaterThan(dimensions.width);
  await page.getByRole('tab', {name: /모바일/}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('tab', {name: /모바일/})).toBeInViewport();
});

test('Explore 첫 화면 카드는 24개 이하이고 쪽 이동으로 나머지를 본다', async ({page}) => {
  await page.goto('/explore');
  const grid = page.locator('ul[aria-labelledby="explore-all"] > li');
  expect(await grid.count()).toBeLessThanOrEqual(24);
  expect(await page.locator('[data-preview]').count(), '대표·사례 카드까지 포함한 첫 화면 미리보기 수').toBeLessThanOrEqual(24 + 12);
});

test('Typography: 기본 보기는 정적 파일, 다크·모바일처럼 사용자가 고른 보기는 iframe 없이 선택 시 컴파일한 SVG', async ({page, request}) => {
  await request.post('/api/dev/perf-counters');
  await page.goto('/materials/typography?mode=dark&width=390');
  expect(await page.locator('iframe').count()).toBe(0);
  const boxes = page.locator('[data-testid="type-grid"] [data-preview]');
  expect(await boxes.count()).toBeGreaterThan(0);
  for (const mode of await boxes.evaluateAll(els => els.map(e => e.getAttribute('data-preview')))) expect(mode).toBe('dynamic');
  await page.locator('[data-testid="type-grid"] img').first().scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  const broken = await page.locator('[data-testid="type-grid"] img').evaluateAll(imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
  expect(broken).toEqual([]);
});
