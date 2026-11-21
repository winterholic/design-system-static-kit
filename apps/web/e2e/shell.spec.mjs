// 공통 레이아웃·내비게이션·라우트 골격 시험. 390·768·1280px에서 가로 넘침과 메뉴 동작을 본다.
import {expect, test} from '@playwright/test';

const WIDTHS = [390, 768, 1280];
const NAV = ['Explore', 'Components', 'Docs', 'Integrations', 'Studio'];
const ROUTES = ['/', '/explore', '/explore/saas-landing', '/explore/combos', '/components', '/components/hero', '/studio', '/docs', '/docs/getting-started', '/docs/a/b',
  '/integrations', '/integrations/cli', '/integrations/rest-api', '/integrations/mcp', '/dev/qa'];

const overflow = page => page.evaluate(() => ({scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth}));

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({viewport: {width, height: 800}});

    test('상단 내비가 가로로 넘치지 않고 모든 항목에 닿을 수 있다', async ({page}) => {
      await page.goto('/');
      const o = await overflow(page);
      expect(o.scroll).toBeLessThanOrEqual(o.width);
      const bar = page.locator('header');
      const box = await bar.boundingBox();
      expect(box.width).toBeLessThanOrEqual(width);
      if (width < 720) {
        await expect(page.getByRole('button', {name: /메뉴/})).toBeVisible();
        await expect(page.getByRole('navigation', {name: '주요 메뉴'})).toBeHidden();
        await page.getByRole('button', {name: /메뉴/}).click();
      } else {
        await expect(page.getByRole('button', {name: /메뉴/})).toBeHidden();
      }
      const nav = page.getByRole('navigation', {name: '주요 메뉴'});
      await expect(nav.getByRole('link')).toHaveText(NAV);
      for (const link of await nav.getByRole('link').all()) {
        const b = await link.boundingBox();
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(width);
        if (width < 720) expect(b.height).toBeGreaterThanOrEqual(44);
      }
      const o2 = await overflow(page);
      expect(o2.scroll).toBeLessThanOrEqual(o2.width);
    });

    test('모든 라우트 골격이 가로 넘침 없이 열린다', async ({page}) => {
      for (const path of ROUTES) {
        const res = await page.goto(path);
        expect(res.status(), path).toBe(200);
        await expect(page.locator('h1').first(), path).toBeVisible();
        const o = await overflow(page);
        expect(o.scroll, `${path} 가로 넘침`).toBeLessThanOrEqual(o.width);
      }
    });
  });
}

test.describe('모바일 메뉴 접근성', () => {
  test.use({viewport: {width: 390, height: 800}});

  test('키보드로 열고 Esc로 닫으면 초점이 버튼으로 돌아온다', async ({page}) => {
    await page.goto('/studio');
    const toggle = page.getByRole('button', {name: /메뉴/});
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const nav = page.getByRole('navigation', {name: '주요 메뉴'});
    await expect(nav.getByRole('link', {name: 'Explore'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('열린 동안 Tab은 버튼과 메뉴 링크 안에서만 돈다', async ({page}) => {
    await page.goto('/');
    await page.getByRole('button', {name: /메뉴/}).click();
    const names = [];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      names.push(await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/^메뉴.*/, '메뉴')));
    }
    expect(new Set(names)).toEqual(new Set(['Components', 'Docs', 'Integrations', 'Studio', '메뉴', 'Explore']));
    // 거꾸로 돌아도 같은 고리 안이다(footer 의 GitHub 링크로 빠지지 않는다).
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.activeElement?.closest('header') !== null)).toBe(true);
    }
  });

  test('항목을 누르면 이동하고 메뉴가 닫힌다, 바깥을 누르면 닫힌다', async ({page}) => {
    await page.goto('/');
    await page.getByRole('button', {name: /메뉴/}).click();
    await page.getByRole('navigation', {name: '주요 메뉴'}).getByRole('link', {name: 'Docs'}).click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole('navigation', {name: '주요 메뉴'})).toBeHidden();
    await page.getByRole('button', {name: /메뉴/}).click();
    await page.mouse.click(200, 700);
    await expect(page.getByRole('button', {name: /메뉴/})).toHaveAttribute('aria-expanded', 'false');
  });

  test('열린 채 폭을 넓히면 데스크톱 내비로 바뀌고 aria-expanded가 닫힌다', async ({page}) => {
    await page.goto('/');
    await page.getByRole('button', {name: /메뉴/}).click();
    await page.setViewportSize({width: 1000, height: 800});
    await expect(page.getByRole('button', {name: /메뉴/})).toBeHidden();
    await expect(page.getByRole('navigation', {name: '주요 메뉴'}).getByRole('link')).toHaveCount(5);
  });
});

test.describe('데스크톱 내비와 푸터', () => {
  test('현재 위치가 aria-current로 표시된다', async ({page}) => {
    await page.goto('/explore/saas-landing');
    const nav = page.getByRole('navigation', {name: '주요 메뉴'});
    await expect(nav.getByRole('link', {name: 'Explore'})).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', {name: 'Studio'})).not.toHaveAttribute('aria-current', 'page');
  });

  test('내부 설계서·진단·test-lab 링크가 상단 내비에 없다', async ({page}) => {
    await page.goto('/');
    const hrefs = await page.locator('header a').evaluateAll(a => a.map(x => x.getAttribute('href')));
    expect(hrefs.sort()).toEqual(['/', '/components', '/docs', '/explore', '/integrations', '/studio']);
  });

  test('푸터에 GitHub 링크가 있다', async ({page}) => {
    await page.goto('/');
    const link = page.locator('footer').getByRole('link', {name: 'GitHub'});
    await expect(link).toHaveAttribute('href', 'https://github.com/winterholic/design-system-static-kit');
  });

  test('로고는 홈으로 간다', async ({page}) => {
    await page.goto('/studio');
    await page.getByRole('link', {name: 'Static Kit'}).first().click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('/#catalog 호환', () => {
  test('/#catalog 로 열면 /explore 로 replace 되고 history 에 남지 않는다', async ({page}) => {
    await page.goto('/studio');
    await page.goto('/#catalog');
    await expect(page).toHaveURL(/\/explore$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/studio$/);
  });

  test('해시가 없거나 다르면 홈에 머문다', async ({page}) => {
    await page.goto('/#other');
    await expect(page).toHaveURL(/\/#other$/);
    await expect(page.locator('h1')).toContainText('고르면');
  });
});

test('홈의 미리보기는 컴파일된 예제(iframe)를 불러온다', async ({page}) => {
  await page.goto('/');
  const frame = page.frameLocator('iframe[title*="saas-landing"]');
  await expect(frame.locator('body')).not.toBeEmpty();
  await expect(frame.locator('html')).toHaveAttribute('data-theme', /light|dark|auto/);
});
