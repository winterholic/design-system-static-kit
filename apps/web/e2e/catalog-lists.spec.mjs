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
    // 스크롤 전에 실제로 불러온 미리보기 수(지연 로딩) = "초기에 로딩하는 카드" 수. REQUEST §3.4: 일반적으로 24개 이하.
    const initialLoads = [...hits.keys()].filter(k => k.startsWith('/previews/')).length;
    const cardsInDom = await page.locator('[data-preview]').count();
    console.log(`${list.name}: 초기 로딩 미리보기 ${initialLoads}개, DOM 의 미리보기 카드 ${cardsInDom}개`);
    expect(initialLoads, '초기 로딩 미리보기 수').toBeLessThanOrEqual(24);

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
