// W6-a: 웹 골격 개편(Home·Explore·Docs 분리·내비)과 Studio 사용성 결함(history 증가, 공유 URL, 실행 취소 기록 저장, 조용한 2.6.0 승급)을 고정한다.
// 모든 시험은 Chromium 에서 돈다. 화면 폭 390과 1280 에서 같은 동작을 본다.
import {expect, test} from '@playwright/test';
import {pick} from './helpers/select.mjs';
import {toPreviewSvg} from '../lib/api/preview-svg.mjs';

const STORAGE_KEY = 'winterholic-static-kit.studio.v1';
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
const historyLength = page => page.evaluate(() => history.length);

async function openStudio(page, query = 'template=saas-landing') {
  await page.goto(`/studio?${query}`);
  await expect(page.locator('[data-phase="ready"]')).toBeVisible();
  await expect.poll(() => saved(page)).not.toBeNull();
}


test.beforeEach(async ({page}) => {
  await page.goto('/studio');
  await page.evaluate(() => localStorage.clear());
});

// ------------------------------------------------------------------ Home

for (const width of [390, 1280]) {
  test.describe(`Home ${width}px`, () => {
    test.use({viewport: {width, height: 800}});

    test('제품 가치와 완성 디자인이 중심이고 내부 규약·CLI는 메인에 없다', async ({page}) => {
      await page.goto('/');
      await expect(page.getByRole('heading', {level: 1})).toContainText('마음에 드는 디자인을 고르고');
      // 진입: 디자인, 재료, 부품, Studio
      for (const [name, href] of [['디자인 둘러보기', '/explore'], ['Studio에서 만들기', '/studio']]) await expect(page.getByRole('link', {name, exact: true})).toHaveAttribute('href', href);
      for (const href of ['/materials', '/components']) await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
      for (const heading of ['완성된 디자인 예시', '분위기로 둘러보기', '이렇게 조립됩니다', 'Studio에서 직접 만들어 보세요', '핵심 기능']) await expect(page.getByRole('heading', {name: heading})).toBeVisible();
      // 내부 검증 규약, CLI 명령, 에이전트 안내는 Docs 로 갔다.
      const text = await page.locator('main').innerText();
      for (const gone of ['npm run kit', '규약은 설명이 아니라 코드가 지킵니다', '허용된 값만', 'CLI · REST · MCP로 같은 검증을']) expect(text, gone).not.toContain(gone);
      await expect(page.getByRole('link', {name: '연동 보기'})).toHaveAttribute('href', '/docs/integrations');
    });

    test('예시 화면은 Core가 컴파일한 결과를 쓰고 하드코딩된 정적 산출물이 아니다', async ({page, request}) => {
      await page.goto('/');
      const shots = page.locator('main a[href^="/explore/"]');
      expect(await shots.count()).toBeGreaterThanOrEqual(10);
      await page.getByRole('heading', {name: '완성된 디자인 예시'}).scrollIntoViewIfNeeded();
      // 목록·카드의 예시는 iframe 이 아니라 빌드 시점에 Core 출력으로 만든 정적 SVG 이미지다(CONTRACTS §5.1).
      expect(await page.locator('iframe').count()).toBe(0);
      const imgs = page.locator('main [data-preview] img');
      await expect.poll(() => imgs.count()).toBeGreaterThan(1);
      for (const src of await imgs.evaluateAll(f => f.map(x => x.getAttribute('src')))) {
        expect(src).toMatch(/^\/previews\/[0-9a-f]{32}\.svg$/);
        expect(src).not.toContain('/examples/');
      }
      // 카드의 그림 = 같은 디자인의 render 주소가 지금 Core 로 컴파일해 돌려주는 문서를 직렬화한 것(바이트 동일). 하드코딩된 산출물이 아니다.
      const card = shots.first();
      const designId = (await card.getAttribute('href')).replace('/explore/', '');
      const staticSvg = await (await request.get(await card.locator('img').first().getAttribute('src'))).text();
      const res = await request.get(`/explore/${designId}/render`);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain('<html');
      const noLabel = svg => svg.replace(/ aria-label="[^"]*"/, ''); // 접근성 이름은 목록 데이터가 정한다. 문서 본문만 비교한다.
      expect(noLabel(staticSvg)).toBe(noLabel(toPreviewSvg(html)));
    });

    test('스타일 묶음 칩은 Explore 필터로 이어진다', async ({page}) => {
      await page.goto('/');
      const chip = page.getByRole('list', {name: '스타일 묶음'}).getByRole('link').first();
      const href = await chip.getAttribute('href');
      expect(href).toMatch(/^\/explore\?style=/);
      await chip.click();
      await expect(page).toHaveURL(/\/explore\?style=/);
      await expect(page.locator('main a[href^="/explore/"]').first()).toBeVisible();
    });
  });
}

// ------------------------------------------------------------------ Docs 분리

test.describe('Docs 분리와 옛 주소 보존', () => {
  const MOVED = [
    ['/integrations', '/docs/integrations'], ['/integrations/cli', '/docs/integrations/cli'], ['/integrations/rest-api', '/docs/integrations/rest-api'], ['/integrations/mcp', '/docs/integrations/mcp'],
    ['/docs/getting-started', '/docs/guide/getting-started'], ['/docs/blueprint', '/docs/core/blueprint'], ['/docs/components', '/docs/core/components'],
    ['/docs/composition', '/docs/core/composition'], ['/docs/tokens-themes', '/docs/core/tokens-themes'], ['/docs/limitations', '/docs/core/limitations'],
    ['/docs/cli', '/docs/integrations/cli'], ['/docs/rest', '/docs/integrations/rest-api'], ['/docs/mcp', '/docs/integrations/mcp'],
  ];

  test('옛 문서 주소는 308 로 새 주소에 닿고 쿼리와 끝 슬래시 변형도 보존한다', async ({request}) => {
    for (const [from, to] of MOVED) {
      const res = await request.get(from, {maxRedirects: 0});
      expect(res.status(), from).toBe(308);
      expect(new URL(res.headers().location, 'http://x').pathname, from).toBe(to);
      expect((await request.get(to)).status(), to).toBe(200);
    }
    const withQuery = await request.get('/integrations/cli?from=old', {maxRedirects: 0});
    expect(new URL(withQuery.headers().location, 'http://x').search).toBe('?from=old');
    expect((await request.get('/docs/getting-started/', {maxRedirects: 0})).status()).toBe(308);
    // 정적 문서 주소와 없는 문서는 그대로다.
    expect((await request.get('/docs/design.html')).status()).toBe(200);
    expect((await request.get('/docs/not-a-document')).status()).toBe(404);
    expect((await request.get('/docs/guide/not-a-document')).status()).toBe(404);
    expect((await request.get('/docs/core/getting-started')).status()).toBe(404);
  });

  test('홈에서 뺀 규약과 CLI 명령은 Docs 가이드에 있고 Docs 목록은 세 갈래다', async ({page}) => {
    await page.goto('/docs/guide/principles');
    for (const term of ['허용된 값만', '대비 검사', '맥락 규칙', '같은 입력, 같은 출력']) await expect(page.getByText(term, {exact: true})).toBeVisible();
    await expect(page.locator('pre')).toContainText('npm run kit -- validate my.json');
    await page.goto('/docs');
    for (const name of ['가이드', 'Core 레퍼런스', '연동']) await expect(page.getByRole('heading', {level: 2, name})).toBeVisible();
    await expect(page.getByRole('link', {name: 'REST API'})).toHaveAttribute('href', '/docs/integrations/rest-api');
    await page.goto('/docs/integrations');
    await expect(page.getByText(/지원하는 카탈로그 버전/)).toBeVisible();
  });
});

// ------------------------------------------------------------------ Explore

test.describe('Explore: 완성 조립 사례 중심', () => {
  test('카드는 사람이 읽는 조립 요약을 보이고 내부 값은 상세의 접힌 구성 값에만 있다', async ({page}) => {
    await page.goto('/explore');
    await expect(page.getByRole('heading', {level: 1})).toContainText('완성된 디자인');
    const featured = page.getByRole('region', {name: /같은 페이지, 다른 재료/});
    expect(await featured.locator('li').count()).toBeGreaterThanOrEqual(3);
    const list = await page.locator('main').innerText();
    expect(list).toMatch(/팔레트|모드/);
    expect(list).not.toMatch(/hero:product|variant_|palette_/);
    await page.goto('/explore/saas-landing~palette_pearl~mode_dark~hero_product');
    const details = page.locator('details', {hasText: '구성 값 자세히'});
    await expect(details).not.toHaveAttribute('open', '');
    await expect(page.getByText(/테마, .* 팔레트, 다크 모드를 적용했습니다/)).toBeVisible();
    await details.locator('summary').click();
    await expect(details).toContainText('hero:product');
  });
});

// ------------------------------------------------------------------ Studio: history

test.describe('Studio 편집은 history 항목을 늘리지 않는다', () => {
  for (const width of [390, 1280]) {
    test(`편집을 여러 번 해도 뒤로 가기가 이전 화면으로 간다 (${width}px)`, async ({page}) => {
      await page.setViewportSize({width, height: 900});
      await page.goto('/explore/saas-landing');
      await page.getByRole('link', {name: 'Studio에서 열기'}).click();
      await expect(page.locator('[data-phase="ready"]')).toBeVisible();
      await expect.poll(() => saved(page)).not.toBeNull();
      if (width < 720) await page.getByRole('button', {name: '편집', exact: true}).click().catch(() => {});
      await page.getByRole('tab', {name: '디자인'}).click();
      const afterTab = await historyLength(page);

      // 테마, 색 모드, 실행 취소: 모두 미리보기를 다시 만든다. 예전에는 하나마다 항목이 1개씩 늘었다.
      await pick(page, page.locator('#d-theme-select'), 'console');
      await page.getByRole('radio', {name: /^다크/}).click();
      await page.getByRole('radio', {name: /^라이트/}).click();
      await page.getByRole('button', {name: '실행 취소'}).click();
      await expect.poll(async () => (await saved(page)).doc.mode).toBe('dark');
      await expect(page.getByTestId('preview')).toHaveAttribute('data-swaps', /[2-9]|\d{2,}/);
      expect(await historyLength(page)).toBe(afterTab);

      // 뒤로 가기: 화면 상태로 쌓은 항목(좁은 화면은 편집 배치와 디자인 탭, 넓은 화면은 디자인 탭)만큼 돌아가면 Explore 상세다.
      // 편집이 항목을 쌓았다면 같은 횟수로는 닿지 못한다.
      // Explore 에서 Studio 로 온 항목 하나가 더 있다.
      const backs = (width < 720 ? 2 : 1) + 1;
      for (let i = 0; i < backs; i++) {
        expect(new URL(page.url()).pathname, `${i}번째 뒤로 가기 전`).toBe('/studio');
        await page.goBack();
      }
      await expect.poll(() => new URL(page.url()).pathname).toBe('/explore/saas-landing');
    });
  }

  test('편집 뒤에도 미리보기 iframe 이 새 문서를 보이고 srcdoc 이 문서와 같다', async ({page}) => {
    await openStudio(page);
    await page.getByRole('tab', {name: '디자인'}).click();
    const frameHtml = () => page.getByTestId('preview-frame').getAttribute('srcdoc');
    const before = await frameHtml();
    await page.getByRole('radio', {name: /^다크/}).click();
    await expect.poll(frameHtml).not.toBe(before);
    await expect(page.frameLocator('[data-testid="preview-frame"]').locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

// ------------------------------------------------------------------ Studio: 공유 URL

test.describe('Studio 작업은 주소에 담겨 다른 브라우저에서 열린다', () => {
  async function editWork(page) {
    await openStudio(page);
    await page.getByRole('treeitem', {name: /./}).first().click();
    await page.getByRole('tab', {name: '디자인'}).click();
    await pick(page, page.locator('#d-theme-select'), 'console');
    await page.getByRole('radio', {name: /^다크/}).click();
    await page.getByRole('tab', {name: '구조·내용'}).click();
    await expect(page.getByText('수정됨')).toBeVisible();
    await expect.poll(async () => (await saved(page)).doc.mode).toBe('dark');
    await urlSettled(page);
    expect(page.url()).toContain('#d=');
  }

  // 자동 동기화(250ms 뒤)가 끝나 주소가 더는 바뀌지 않을 때까지 기다린다.
  async function urlSettled(page) {
    let last = '';
    await expect.poll(async () => { const now = page.url(); const same = now === last && now.includes('#d='); last = now; await page.waitForTimeout(350); return same; }).toBe(true);
  }

  test('같은 주소를 저장소가 비어 있는 다른 브라우저에서 열면 같은 문서가 보인다', async ({page, browser}) => {
    await editWork(page);
    const url = page.url();
    const mine = await saved(page);
    expect(url).toMatch(/#d=z\./);
    // 문서는 주소에 담겼고 서버에는 가지 않는다.
    const other = await browser.newContext();
    try {
      const b = await other.newPage();
      await b.goto(url);
      await expect(b.locator('[data-phase="ready"]')).toBeVisible();
      await expect(b.getByTestId('preview')).toHaveAttribute('data-compiles', /[1-9]/);
      await expect(b.getByText('수정됨')).toBeVisible();
      await expect.poll(async () => (await saved(b))?.doc).toEqual(mine.doc);
      const theirs = await saved(b);
      expect(theirs.origin).toEqual(mine.origin);
      expect(theirs.doc.theme).toBe('console');
      expect(theirs.doc.mode).toBe('dark');
      await expect(b.frameLocator('[data-testid="preview-frame"]').locator('html')).toHaveAttribute('data-theme', 'dark');
      // 열린 뒤에도 주소는 그 작업을 가리킨다(복사해서 또 공유할 수 있다).
      expect(b.url()).toContain('#d=');
    } finally { await other.close(); }
  });

  test('화면 상태를 바꿔도 해시가 남고, 링크 복사는 현재 주소를 클립보드에 담는다', async ({page, context}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await editWork(page);
    await page.getByRole('tab', {name: '디자인'}).click();
    await expect(page).toHaveURL(/tab=design.*#d=|#d=.*/);
    expect(new URL(page.url()).hash).toMatch(/^#d=z\./);
    await page.getByRole('button', {name: '링크 복사'}).click();
    await expect(page.getByText(/링크를 복사했습니다/)).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  });

  test('새로고침은 해시가 아니라 저장된 작업과 실행 취소 기록을 그대로 쓴다', async ({page}) => {
    await editWork(page);
    await page.reload();
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await saved(page)).doc.theme).toBe('console');
  });

  test('이 브라우저에 작업이 있으면 링크가 덮어쓰기 전에 묻고, 내 작업 유지를 고르면 바뀌지 않는다', async ({page, browser}) => {
    await editWork(page);
    const link = page.url();
    const other = await browser.newContext();
    const b = await other.newPage();
    try {
      // 두 번째 브라우저에는 다른 작업이 있다.
      await b.goto('/studio?template=article');
      await expect(b.locator('[data-phase="ready"]')).toBeVisible();
      await b.getByRole('treeitem', {name: /./}).first().click();
      await b.getByRole('tab', {name: '디자인'}).click();
      await pick(b, b.locator('#d-theme-select'), 'aurora');
      await expect(b.getByText('수정됨')).toBeVisible();
      await expect.poll(async () => (await saved(b))?.doc?.theme).toBe('aurora');
      const mineBefore = await saved(b);

      await b.goto(link);
      const dialog = b.getByRole('dialog');
      await expect(dialog).toContainText('공유 링크의 작업으로 바꿀까요?');
      expect((await saved(b)).doc.theme, '확인 전에는 내 작업이 그대로').toBe('aurora');
      await dialog.getByRole('button', {name: '내 작업 유지'}).click();
      await expect(dialog).toHaveCount(0);
      expect((await saved(b)).doc.tree).toEqual(mineBefore.doc.tree);
      // 내 작업을 유지하면 주소의 해시도 내 작업으로 바뀐다.
      await expect.poll(() => b.url()).not.toBe(link);

      await b.goto(link);
      await b.getByRole('dialog').getByRole('button', {name: '링크의 작업 열기'}).click();
      await expect.poll(async () => (await saved(b)).doc.theme).toBe('console');
      // 열기도 실행 취소로 되돌릴 수 있다.
      await b.getByRole('button', {name: '실행 취소'}).click();
      await expect.poll(async () => (await saved(b)).doc.theme).toBe('aurora');
    } finally { await other.close(); }
  });

  test('열린 Studio 탭의 해시를 다른 링크로 바꾸면 새로고침 없이 묻고 연다', async ({page, browser}) => {
    await editWork(page);
    const other = await browser.newContext();
    const b = await other.newPage();
    try {
      await b.goto('/studio?template=article');
      await expect(b.locator('[data-phase="ready"]')).toBeVisible();
      await b.getByRole('tab', {name: '디자인'}).click();
      await pick(b, b.locator('#d-theme-select'), 'aurora');
      await expect.poll(async () => (await saved(b))?.doc?.theme).toBe('aurora');
      await urlSettled(b);
      const link = new URL(page.url()).hash;
      const reloads = await b.evaluate(() => performance.now());
      await b.evaluate(h => { location.hash = h; }, link);
      await expect(b.getByRole('dialog')).toContainText('공유 링크의 작업으로 바꿀까요?');
      expect(await b.evaluate(() => performance.now()), '새로고침 없이 같은 문서에서 열린다').toBeGreaterThan(reloads);
      await b.getByRole('dialog').getByRole('button', {name: '링크의 작업 열기'}).click();
      await expect.poll(async () => (await saved(b)).doc.theme).toBe('console');
    } finally { await other.close(); }
  });

  test('뒤로 가기로 옛 주소 항목에 돌아가도 링크 열기 확인이 뜨지 않고 해시는 현재 문서를 가리킨다', async ({page}) => {
    await editWork(page);
    await page.getByRole('tab', {name: '디자인'}).click();
    await page.getByRole('radio', {name: /^라이트/}).click();
    await expect.poll(async () => (await saved(page)).doc.mode).toBe('light');
    await page.goBack();
    await expect(page).toHaveURL(/\/studio(\?[^#]*)?#d=/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await urlSettled(page);
    const hashAfterBack = new URL(page.url()).hash;
    await page.reload();
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe(hashAfterBack);
    expect((await saved(page)).doc.mode).toBe('light');
  });

  test('링크 복사 직후 주소는 복사 순간의 작업을 담는다', async ({page, context}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openStudio(page);
    await page.getByRole('tab', {name: '디자인'}).click();
    await page.getByRole('radio', {name: /^다크/}).click();
    // 자동 동기화를 기다리지 않고 바로 복사한다.
    await page.getByRole('button', {name: '링크 복사'}).click();
    await expect(page.getByText(/링크를 복사했습니다/)).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(page.url());
    const other = await context.browser().newContext();
    try {
      const b = await other.newPage();
      await b.goto(copied);
      await expect.poll(async () => (await saved(b))?.doc?.mode).toBe('dark');
    } finally { await other.close(); }
  });

  test('손상된 링크는 작업을 건드리지 않고 이유를 알린다', async ({page}) => {
    await openStudio(page);
    const before = await saved(page);
    await page.goto('/explore');
    await page.goto('/studio#d=z.AAAA');
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    await expect(page.getByText(/공유 링크를 열지 못했습니다/)).toBeVisible();
    expect((await saved(page)).doc).toEqual(before.doc);
  });
});

// ------------------------------------------------------------------ Studio: 실행 취소 기록 저장

test.describe('새로고침 뒤에도 실행 취소가 된다', () => {
  test('편집 → 새로고침 → 실행 취소·다시 실행이 이어진다', async ({page}) => {
    await openStudio(page);
    await page.getByRole('tab', {name: '디자인'}).click();
    await pick(page, page.locator('#d-theme-select'), 'console');
    await page.getByRole('radio', {name: /^다크/}).click();
    await expect.poll(async () => (await saved(page)).history?.undo?.length).toBe(2);
    const original = (await saved(page)).history.undo[0].doc.theme;
    await page.reload();
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    const undo = page.getByRole('button', {name: '실행 취소'});
    await expect(undo).toBeEnabled();
    await page.getByRole('tab', {name: '디자인'}).click();
    await undo.click();
    await expect.poll(async () => (await saved(page)).doc.mode).not.toBe('dark');
    await expect(page.getByRole('button', {name: '다시 실행'})).toBeEnabled();
    await undo.click();
    await expect.poll(async () => (await saved(page)).doc.theme).toBe(original);
    await expect(undo).toBeDisabled();
    await page.getByRole('button', {name: '다시 실행'}).click();
    await expect.poll(async () => (await saved(page)).doc.theme).toBe('console');
  });

  test('저장 용량이 모자라도 문서는 저장되고 기록만 빠진다', async ({page}) => {
    await openStudio(page);
    await page.evaluate(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (typeof value === 'string' && value.includes('"history"') && value.includes('"undo":[{')) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
        return set.call(this, key, value);
      };
    });
    await page.getByRole('tab', {name: '디자인'}).click();
    await page.getByRole('radio', {name: /^다크/}).click();
    await expect.poll(async () => (await saved(page)).doc.mode).toBe('dark');
    expect((await saved(page)).history).toBeUndefined();
    await expect(page.getByText(/저장 실패/)).toHaveCount(0);
  });
});

// ------------------------------------------------------------------ Studio: 조용한 2.6.0 승급

test.describe('구 문서에서 2.6.0 재료를 고르면 영향을 먼저 보여 주고 확인받는다', () => {
  async function oldDocWithPearl(page) {
    await openStudio(page);
    await page.getByRole('tab', {name: '디자인'}).click();
    await pick(page, page.locator('#d-palette'), 'pearl');
    await expect.poll(async () => (await saved(page)).doc.palette).toBe('pearl');
    expect((await saved(page)).doc.catalogVersion).toBe('2.4.0');
  }

  test('취소하면 문서도 실행 취소 기록도 바뀌지 않는다', async ({page}) => {
    await oldDocWithPearl(page);
    const before = await saved(page);
    const undoBefore = before.history.undo.length;
    await page.locator('#material-type-roles').click();
    await page.getByRole('listbox').locator('[role="option"][data-value="erp"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('impact-version')).toHaveText('2.4.0 → 2.6.0');
    await expect(dialog.getByTestId('impact-colors')).toContainText(/색 \d+개 중 [1-9]\d*개 바뀜/);
    await expect(dialog.getByTestId('impact-palette-note')).toContainText('pearl');
    await expect(dialog.getByTestId('impact-edits')).toContainText('사라지는 콘텐츠 0개');
    // 확인 전에는 문서 버전도 팔레트 선택지도 그대로다.
    await expect(page.locator('#d-palette')).toBeVisible();
    await dialog.getByRole('button', {name: '취소'}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#d-palette')).toBeVisible();
    const after = await saved(page);
    expect(after.doc).toEqual(before.doc);
    expect(after.doc.catalogVersion).toBe('2.4.0');
    expect(after.history.undo.length).toBe(undoBefore);
    expect(after.doc.typeRoles).toBeUndefined();
  });

  test('적용하면 2.6.0 으로 올라가고 실행 취소로 이전 버전과 팔레트로 돌아온다', async ({page}) => {
    await oldDocWithPearl(page);
    const before = await saved(page);
    await page.locator('#material-type-roles').click();
    await page.getByRole('listbox').locator('[role="option"][data-value="erp"]').click();
    await page.getByRole('dialog').getByRole('button', {name: '적용'}).click();
    await expect.poll(async () => (await saved(page)).doc.catalogVersion).toBe('2.6.0');
    const upgraded = await saved(page);
    expect(upgraded.doc).toMatchObject({typeRoles: 'erp', colorPalette: 'static-kit'});
    expect(upgraded.doc.tree).toEqual(before.doc.tree);
    await expect(page.locator('#d-palette')).toHaveCount(0);
    await page.getByRole('button', {name: '실행 취소'}).click();
    await expect.poll(async () => (await saved(page)).doc.catalogVersion).toBe('2.4.0');
    expect((await saved(page)).doc.palette).toBe('pearl');
  });

  test('이미 2.6.0 인 문서의 재료 변경은 확인 없이 바로 적용된다', async ({page}) => {
    await openStudio(page, 'template=saas-landing&catalogVersion=2.6.0');
    await page.getByRole('tab', {name: '디자인'}).click();
    await page.locator('#material-type-roles').click();
    await page.getByRole('listbox').locator('[role="option"][data-value="erp"]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await saved(page)).doc.typeRoles).toBe('erp');
  });
});
