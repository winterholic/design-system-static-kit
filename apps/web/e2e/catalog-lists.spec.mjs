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
    // 타이포그래피 카탈로그의 카드는 그림이 아니라 Core 역할 값으로 그린 서체 견본이다. 그림(미리보기)은 비교·Specimen 에서 선택했을 때만 나온다(typography-catalog.spec.mjs 가 검증한다).
    if (list.path !== '/materials/typography') expect(boxes.length, '미리보기가 있어야 한다').toBeGreaterThan(0);
    else expect(boxes.length, '타이포그래피 목록은 선택 전에 그림을 읽지 않는다').toBe(0);
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

test('Typography: 41개 카탈로그는 첫 화면 24개, 목록에서 컴파일하지 않고 선택된 시스템만 비교 렌더한다', async ({page, request}) => {
  await request.post('/api/dev/perf-counters');
  await page.goto('/materials/typography?mode=dark&width=390');
  expect(await page.locator('iframe').count()).toBe(0);
  await expect(page.getByTestId('type-catalog-count')).toContainText('41개 결과');
  expect(await page.getByTestId('type-catalog-grid').locator('> li').count()).toBe(24);
  const beforeCompare = await counters(request);
  expect(beforeCompare.counters, '카탈로그 목록은 Core 컴파일하지 않는다').toMatchObject({assembleComponents: 0, assembleDesign: 0, total: 0});
  await page.goto('/materials/typography?mode=dark&width=390&with=tech-erp,work-console&scenario=erp');
  expect(await page.locator('[data-testid="type-grid"] li[data-system]').count()).toBe(2);
});

// ---- F1 독립 검증(Chromium): 17개 탭 전체, 공개 서비스 ID 포함, 390·1280 조작 ----
const LIST = '[data-testid="components-list"]';
const idle = page => expect(page.locator(LIST)).not.toHaveAttribute('aria-busy', 'true');
const noHorizontalOverflow = async (page, where) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${where}: 가로 넘침`).toBeLessThanOrEqual(0);
};

test('Components 17개 탭이 모두 비어 있지 않고 탭 숫자·카드·정적 미리보기가 서로 맞는다(차트 포함)', async ({page, request}) => {
  await request.post('/api/dev/perf-counters');
  await page.goto('/components');
  await idle(page);
  const tabs = await page.getByRole('tab').evaluateAll(els => els.map(el => ({id: el.id.replace('catalog-tab-', ''), badge: Number(el.querySelector('span')?.textContent)})));
  expect(tabs).toHaveLength(17);
  for (const tab of tabs) {
    await page.goto(tab.id === 'all' ? '/components' : `/components?category=${tab.id}`);
    await idle(page);
    const total = Number(await page.getByTestId('components-count').getAttribute('data-total'));
    expect(tab.badge, `${tab.id}: 탭 숫자가 0이다(재료가 있는 카테고리가 비어 보임)`).toBeGreaterThan(0);
    expect(total, `${tab.id}: 탭 숫자와 목록 총수`).toBe(tab.badge);
    const cards = await page.locator(`${LIST} li`).count();
    expect(cards, `${tab.id}: 카드 수`).toBe(Math.min(24, total));
    expect(await page.locator('iframe').count(), tab.id).toBe(0);
    expect(await page.locator(`${LIST} [data-preview="dynamic"]`).count(), tab.id).toBe(0);
    // 화면 밖 이미지는 lazy 라서 아직 요청 전이다. 즉시 요청하게 하고 디코드까지 기다려 깨진 파일을 센다.
    const broken = await page.locator(`${LIST} img`).evaluateAll(imgs => Promise.all(imgs.map(i => { i.loading = 'eager'; return i.decode().then(() => null, () => i.src); })).then(r => r.filter(Boolean)));
    expect(broken, `${tab.id}: 깨진 미리보기`).toEqual([]);
    const missing = await page.locator(`${LIST} [data-preview="unavailable"]`).count();
    expect(missing, `${tab.id}: 대표 렌더가 없는 카드는 단독 예제가 없는 구조 부품뿐이다`).toBeLessThanOrEqual(4);
  }
  expect(tabs.find(t => t.id === 'charts').badge).toBe(44);
  const after = await counters(request);
  expect(after.counters, '탭 순회 중 서버 컴파일').toMatchObject({compileBlueprint: 0, assembleDesign: 0, assembleComponents: 0, total: 0});
});

test('Components 전체 청크는 공개 서비스의 부품·목적 패밀리를 모두 담고 쪽마다 24개 이하이며 중복이 없다', async ({page, request}) => {
  const expected = await publicComponentHrefs(request);
  await page.goto('/components');
  await idle(page);
  const total = Number(await page.getByTestId('components-count').getAttribute('data-total'));
  const seen = [];
  for (let n = 1; n <= Math.ceil(total / 24); n++) {
    const chunk = await (await request.get(`/catalog-chunks/all-${n}.json`)).json();
    expect(chunk.materials.length, `all-${n}`).toBeLessThanOrEqual(24);
    seen.push(...chunk.materials.map(m => ({id: m.id, url: m.url})));
  }
  expect(seen).toHaveLength(total);
  expect(new Set(seen.map(m => m.id)).size, '전체 목록의 재료 id 중복').toBe(total);
  const urls = new Set(seen.map(m => m.url));
  expect(expected.filter(href => !urls.has(href)), '공개 서비스에 있지만 전체 목록에 없는 부품·목적 패밀리').toEqual([]);
  // 모든 카드의 상세 이동이 실제 페이지로 간다
  for (const url of urls) expect((await request.get(url)).status(), `${url} 상세 이동`).toBe(200);
});

for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 800}]) {
  test(`Components ${viewport.width}px: 검색·탭·카드·패밀리 전환·URL 복원·뒤로 가기와 가로 넘침·터치 44px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/components');
    await idle(page);
    await noHorizontalOverflow(page, '첫 화면');

    // 터치 목표: 탭, 검색 입력·버튼, 패밀리 선택, 쪽 이동
    const small = async () => page.evaluate(() => [...document.querySelectorAll('[role="tab"], .catalog form input, .catalog form button, .catalog form select, nav[aria-label="쪽 이동"] button')]
      .map(el => ({name: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20), h: Math.round(el.getBoundingClientRect().height)})).filter(x => x.h < 44));
    expect(await small(), '높이 44px 미만 조작 요소').toEqual([]);

    // 검색: 전체 재료를 찾고 결과에 분류를 보인다
    await page.getByRole('searchbox', {name: '검색'}).fill('bubble');
    await page.getByRole('button', {name: '검색', exact: true}).click();
    await expect(page).toHaveURL(/[?&]q=bubble/);
    await idle(page);
    const found = page.locator(`${LIST} li`);
    expect(await found.count()).toBeGreaterThan(0);
    await expect(page.locator(`${LIST} li`).filter({has: page.locator('[aria-label="관련 카테고리"]', {hasText: /^차트$/})}).first().locator('[aria-label="관련 카테고리"]')).toContainText('차트');
    const labels = await page.locator(`${LIST} [aria-label="관련 카테고리"]`).allTextContents();
    expect(labels.every(text => text.trim() && !text.includes('준비 중')), `검색 결과마다 분류가 보인다: ${labels.slice(0, 4)}`).toBe(true);
    await noHorizontalOverflow(page, '검색 결과');

    // 탭을 고르면 검색어가 풀리고 URL에 카테고리가 남는다
    await page.getByRole('tab', {name: /차트/}).click();
    await expect(page).toHaveURL(/[?&]category=charts/);
    await expect(page).not.toHaveURL(/q=/);
    await idle(page);
    expect(await page.locator(`${LIST} li`).count()).toBe(24);
    await expect(page.getByRole('tab', {name: /차트/})).toHaveAttribute('aria-selected', 'true');
    await noHorizontalOverflow(page, '차트 탭');

    // 쪽 이동과 시각 패밀리 전환
    await page.getByRole('button', {name: '다음'}).click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await idle(page);
    expect(await page.locator(`${LIST} li`).count()).toBe(20);
    await page.getByRole('combobox', {name: '시각 패밀리'}).selectOption('family:elevated-material');
    await expect(page).toHaveURL(/family=family%3Aelevated-material/);
    await idle(page);
    await noHorizontalOverflow(page, '패밀리 전환');

    // 뒤로 가기: 패밀리 → 쪽 → 탭 → 검색 순서로 상태가 돌아온다
    await page.goBack();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).not.toHaveURL(/family=/);
    await page.goBack();
    await expect(page).toHaveURL(/category=charts/);
    await expect(page).not.toHaveURL(/page=/);
    await idle(page);
    await page.goBack();
    await expect(page).toHaveURL(/[?&]q=bubble/);
    await expect(page.getByRole('searchbox', {name: '검색'})).toHaveValue('bubble');
    await page.reload();
    await idle(page);
    await expect(page.getByRole('searchbox', {name: '검색'})).toHaveValue('bubble');
    expect(await page.locator(`${LIST} li`).count()).toBeGreaterThan(0);

    // 카드 → 상세 이동 → 뒤로 가기로 목록 상태 복원
    await page.goto('/components?q=hero');
    await idle(page);
    await page.locator('a[href="/components/hero"]').first().click();
    await expect(page.getByRole('heading', {level: 1})).toContainText('히어로');
    await page.goBack();
    await expect(page).toHaveURL(/q=hero/);
    await idle(page);
    await expect(page.locator('a[href="/components/hero"]').first()).toBeVisible();
    await noHorizontalOverflow(page, '뒤로 가기 뒤');
  });
}
