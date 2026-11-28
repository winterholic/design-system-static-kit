// Materials 화면: 값은 Core에서 읽은 것과 같아야 하고(복제 금지), 재료에서 Studio로 이어져야 한다.
import {expect, test} from '@playwright/test';
import {queryMaterials} from '@winterholic/design-system-static-kit/service';
import {optionStates, pick} from './helpers/select.mjs';

import * as service from '@winterholic/design-system-static-kit/service';
const PLATFORM_PALETTES = typeof service.listPlatformMaterials === 'function' ? service.listPlatformMaterials({kind: 'palette'}).value.items.map(i => i.id) : [];
const STORAGE_KEY = 'winterholic-static-kit.studio.v1';
// 화면이 읽는 것과 같은 ./service 질의에서 기대값을 얻는다. Core 계산과의 독립 대조는 tests/service-materials.test.mjs가 한다.
const color = queryMaterials({view: 'color'}).value;
const ACTION = {light: color.tokens.light['color-action'], dark: color.tokens.dark['color-action']};

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => { window.__copied = text; }}}); });
});

const savedDoc = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.doc ?? null, STORAGE_KEY);

test('상단 메뉴에 Materials가 있고 개요에서 세 화면으로 이어진다', async ({page}) => {
  await page.goto('/');
  await page.getByRole('navigation', {name: '주요 메뉴'}).getByRole('link', {name: 'Materials'}).click();
  await expect(page).toHaveURL(/\/materials$/);
  await expect(page.getByRole('heading', {level: 1})).toContainText('재료');
  for (const [name, path] of [['색 보기', '/materials/color'], ['타이포그래피 보기', '/materials/typography'], ['기초 재료 보기', '/materials/foundations']]) {
    await expect(page.getByRole('link', {name})).toHaveAttribute('href', path);
  }
  await expect(page.getByRole('navigation', {name: '주요 메뉴'}).getByRole('link', {name: 'Materials'})).toHaveAttribute('aria-current', 'page');
});

test.describe('색', () => {
  test('시드와 50–950 램프가 Core 값 그대로 나온다', async ({page}) => {
    await page.goto('/materials/color');
    const seeds = color.palette.seeds;
    const body = await page.locator('main').innerText();
    for (const hex of [seeds.brand, seeds.neutral, seeds.auxiliary, ...Object.values(seeds.status), ...seeds.chart]) expect(body, hex).toContain(hex);
    const brand = page.getByRole('region', {name: '브랜드'}).or(page.locator('section[aria-labelledby="ramp-brand"]'));
    const steps = await brand.locator('li').allInnerTexts();
    expect(steps.map(t => t.replace(/\s+/g, ' ').replace(' (시드)', '').trim())).toEqual(Object.entries(color.ramps.brand).map(([step, hex]) => `${step} ${hex}`));
    await expect(brand.locator('[data-seed="true"]')).toHaveCount(1);
  });

  test('토큰 전체를 검색하고 층·묶음으로 거른다', async ({page}) => {
    await page.goto('/materials/color');
    const status = page.getByRole('status').filter({hasText: '개 토큰'});
    await expect(status).toHaveText(/^257개 토큰/);
    const rows = page.getByTestId('token-list').locator('li[data-token]');
    await page.getByLabel('토큰 검색').fill('action-hover');
    await expect(rows.first()).toContainText('--kit-');
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(10);
    await page.getByLabel('토큰 검색').fill('zzz-없는-토큰');
    await expect(page.getByText('조건에 맞는 토큰이 없습니다.')).toBeVisible();
    await page.getByRole('button', {name: '검색 조건 지우기'}).click();
    await expect(status).toHaveText(/^257개 토큰/);
    await page.getByRole('button', {name: /^상태 색/}).click();
    await expect(status).toHaveText(/^13개 토큰/);
    await expect(page.getByRole('button', {name: /^상태 색/})).toHaveAttribute('aria-pressed', 'true');
    await pick(page, page.getByLabel('묶음'), 'state');
    await expect(status).toHaveText(/^13개 토큰/);
  });

  test('라이트·다크 값이 Core의 두 모드 계산과 같고 보기 전환이 된다', async ({page}) => {
    await page.goto('/materials/color');
    await page.getByLabel('토큰 검색').fill('--kit-color-action');
    const row = page.locator('li[data-token="color-token:semantic.action"]');
    await expect(row).toContainText(ACTION.light);
    await expect(row).toContainText(ACTION.dark);
    expect(ACTION.light).not.toBe(ACTION.dark);
    await page.getByRole('radio', {name: '다크', exact: true}).click();
    await expect(row).toContainText(ACTION.dark);
    await expect(row).not.toContainText(ACTION.light);
    await expect(page.locator('figure[data-mode="light"]')).toBeVisible();
    await expect(page.locator('figure[data-mode="dark"]')).toBeVisible();
  });

  test('토큰 값·변수 이름·var()를 복사한다', async ({page}) => {
    await page.goto('/materials/color');
    await page.getByLabel('토큰 검색').fill('--kit-color-action');
    const row = page.locator('li[data-token="color-token:semantic.action"]');
    await row.locator('summary').click();
    await row.getByRole('button', {name: '변수 이름'}).click();
    expect(await page.evaluate(() => window.__copied)).toBe('--kit-color-action');
    await row.getByRole('button', {name: 'var()'}).click();
    expect(await page.evaluate(() => window.__copied)).toBe('var(--kit-color-action)');
    await row.getByRole('button', {name: '다크 값'}).click();
    expect(await page.evaluate(() => window.__copied)).toBe(ACTION.dark);
  });

  test('CSS와 JSON 내보내기는 현재 필터 결과를 Core 값으로 담는다', async ({page}) => {
    await page.goto('/materials/color');
    await page.getByRole('button', {name: /^역할 색/}).click();
    const preview = page.getByTestId('export-preview');
    const css = await preview.innerText();
    expect(css).toContain(`--kit-color-action: ${ACTION.light};`);
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(`--kit-color-action: ${ACTION.dark};`);
    expect(css).not.toContain('--kit-palette-brand-500');
    await page.getByRole('radio', {name: 'JSON'}).click();
    const json = JSON.parse(await preview.innerText());
    expect(json.palette).toBe('static-kit');
    expect(json.tokens).toHaveLength(26);
    expect(json.tokens.find(t => t.cssName === '--kit-color-action')).toMatchObject({light: ACTION.light, dark: ACTION.dark});
    await page.getByRole('button', {name: '복사', exact: true}).click();
    expect(JSON.parse(await page.evaluate(() => window.__copied)).tokens).toHaveLength(26);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', {name: '.json 내려받기'}).click();
    expect((await pending).suggestedFilename()).toBe('static-kit-color-tokens.json');
    await page.getByRole('radio', {name: '토큰 전체'}).click();
    expect(JSON.parse(await preview.innerText()).tokens.length).toBeGreaterThan(200);
  });

  test('Coolors 팔레트 427개는 Materials 화면 어디에도 나오지 않는다', async ({page, request}) => {
    for (const path of ['/materials', '/materials/color', '/materials/typography', '/materials/foundations', '/materials/foundations/backdrop']) {
      const html = await (await request.get(path)).text();
      expect(html.toLowerCase(), path).not.toContain('coolors');
      // 조립 플랫폼의 자체 팔레트(license: internal)는 Materials 에 나온다. 레거시 카탈로그의 팔레트 id 는 나오지 않는다.
      for (const id of html.match(/palette:[a-z0-9-]+/g) ?? []) expect(PLATFORM_PALETTES, `${path} ${id}`).toContain(id);
    }
    await page.goto('/materials/color');
    // 토큰 목록은 static-kit 하나의 토큰만 담는다.
    await page.getByLabel('토큰 검색').fill('palette');
    const ids = await page.getByTestId('token-list').locator('li[data-token]').evaluateAll(n => n.map(x => x.dataset.token));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => id.startsWith('color-token:'))).toBe(true);
    expect(ids.filter(id => id.includes('palette.')).every(id => id.includes('palette.static-kit.'))).toBe(true);
  });

  test('Studio에서 사용하기: 색 토큰을 켠 문서로 열린다', async ({page}) => {
    await page.goto('/studio');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/materials/color');
    await page.getByRole('link', {name: 'Studio에서 사용하기'}).click();
    await expect(page).toHaveURL(/\/studio/);
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    await expect(page.getByTestId('op-error')).toHaveCount(0);
    await expect.poll(async () => (await savedDoc(page))?.colorPalette).toBe('static-kit');
    expect((await savedDoc(page)).catalogVersion).toBe('2.6.0');
  });
});

test.describe('타이포그래피', () => {
  test('카탈로그는 41개 시스템을 24개 이하로 나누고 선택한 Specimen에서 27개 Core 역할을 보여 준다', async ({page}) => {
    await page.goto('/materials/typography');
    await expect(page.getByTestId('type-catalog-count')).toContainText('41개 결과');
    await expect(page.getByTestId('type-catalog-grid').locator('> li')).toHaveCount(24);
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.goto('/materials/typography?system=doc-essay');
    await expect(page.getByTestId('type-role-list').locator('> li')).toHaveCount(27);
    await expect(page.getByTestId('type-specimen')).toContainText('日本語');
    await expect(page.getByTestId('type-specimen')).toContainText('₩128,000');
    await expect(page.getByTestId('type-specimen')).toContainText('currencyKRW');
    await expect(page.getByTestId('type-specimen').locator('[data-part="standalone"]')).toHaveAttribute('download', '');
  });

  test('옛 프리셋 주소는 새 Specimen으로 연결되고 Studio 링크에 플랫폼 타이포 시스템을 보존한다', async ({page}) => {
    await page.goto('/materials/typography?preset=marketing');
    await expect(page).toHaveURL(/system=mkt-launch/);
    await expect(page.getByTestId('type-specimen')).toContainText('제품 출시');
    const studio = page.getByRole('link', {name: '이 시스템으로 Studio 열기'});
    await expect(studio).toHaveAttribute('href', /\/studio\/assemble\?purpose=saas-landing&type=mkt-launch&step=swap/);
    await studio.click();
    await expect(page).toHaveURL(/\/studio\/assemble\?.*type=mkt-launch/);
    await expect(page.getByTestId('selection-summary')).toContainText('제품 출시');
    await expect(page.getByTestId('swap-preview')).toBeVisible();
  });
});

test.describe('기초 재료', () => {
  test('축 목록에서 상세로 가고 상세의 값마다 Studio 링크나 쓸 수 없는 이유가 있다', async ({page}) => {
    await page.goto('/materials/foundations');
    await expect(page.getByRole('heading', {name: /아이콘 \d+개/})).toBeVisible();
    await page.getByRole('link', {name: '모서리'}).click();
    await expect(page).toHaveURL(/foundations\/radius$/);
    await expect(page.locator('li[data-value]')).toHaveCount(5);
    await page.goto('/materials/foundations/shell');
    const unavailable = page.getByTestId('axis-unavailable');
    expect(await unavailable.count()).toBeGreaterThan(0);
    await expect(unavailable.first()).toContainText(/PAGE_SHELL|NAV_COUNT/);
    await page.goto('/materials/foundations/nope');
    expect((await page.request.get('/materials/foundations/nope')).status()).toBe(404);
  });

  test('Studio에서 사용하기: 모서리 값이 문서에 적용되고 디자인 탭에 직접 고른 값으로 보인다', async ({page}) => {
    await page.goto('/studio');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/materials/foundations/radius');
    await page.getByRole('link', {name: /Studio에서 사용하기 \(모서리 round\)/}).click();
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    await expect(page.getByTestId('op-error')).toHaveCount(0);
    await page.getByRole('tab', {name: '디자인'}).click();
    await expect(page.locator('#d-axis-radius')).toHaveAttribute('data-value', 'round');
    await expect(page.getByLabel(/모서리.*직접 고름/)).toBeVisible();
    // 같은 값이 Studio 선택 가능성 판정과 일치한다: Materials가 막은 값은 Studio에서도 비활성이다.
    await page.goto('/materials/foundations/shell');
    const blocked = await page.locator('li[data-value]').evaluateAll(rows => rows.filter(r => r.querySelector('[data-testid="axis-unavailable"]')).map(r => r.dataset.value));
    await page.goto('/studio');
    await page.getByRole('tab', {name: '디자인'}).click();
    const studio = await optionStates(page, page.locator('#d-axis-shell'));
    for (const value of blocked) expect(studio.find(o => o.value === value).disabled, value).toBe(true);
  });

  test('아이콘 격자는 Core의 아이콘 수와 같다', async ({page}) => {
    await page.goto('/materials/foundations');
    const heading = await page.getByRole('heading', {name: /아이콘 \d+개/}).innerText();
    const n = Number(/(\d+)/.exec(heading)[1]);
    expect(n).toBeGreaterThan(50);
    await expect(page.getByTestId('icon-grid').locator('> li')).toHaveCount(n);
  });
});
