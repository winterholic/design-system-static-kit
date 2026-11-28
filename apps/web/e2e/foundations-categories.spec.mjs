import {test, expect} from '@playwright/test';

const categories = ['Spacing', 'Density', 'Radius', 'Border', 'Elevation', 'Surface', 'Background', 'Motion', 'Icon', 'Layout', 'Chart'];

for (const width of [390, 1280]) {
  test.describe(`Foundations categories at ${width}px`, () => {
    test.use({viewport: {width, height: width === 390 ? 844 : 900}});

    test('URL selection restores through browser history and only the selected category panel is rendered', async ({page}) => {
      await page.goto('/materials/foundations?category=spacing');
      await expect(page.locator('[data-category-panel]')).toHaveCount(1);
      await expect(page.locator('[data-category-panel]')).toHaveAttribute('data-category-panel', 'spacing');
      const tabs = page.locator('[data-foundation-category]');
      await expect(tabs).toHaveCount(11);
      for (const label of categories) await expect(page.getByRole('link', {name: label, exact: true})).toBeVisible();

      await page.getByRole('link', {name: 'Motion', exact: true}).click();
      await expect(page).toHaveURL(/category=motion/);
      await expect(page.locator('[data-category-panel]')).toHaveCount(1);
      await expect(page.locator('[data-category-panel]')).toHaveAttribute('data-category-panel', 'motion');
      await page.goBack();
      await expect(page).toHaveURL(/category=spacing/);
      await expect(page.locator('[data-category-panel]')).toHaveAttribute('data-category-panel', 'spacing');

      if (width === 390) {
        const boxes = await tabs.evaluateAll(nodes => nodes.map(node => ({height: node.getBoundingClientRect().height, right: node.getBoundingClientRect().right})));
        expect(boxes.every(box => box.height >= 44 && box.right <= 390)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });

    test('all categories show real definitions, and Layout and Chart link to detail pages', async ({page}) => {
      for (const category of categories) {
        await page.goto(`/materials/foundations?category=${category.toLowerCase()}`);
        await expect(page.locator('[data-category-panel]')).toHaveCount(1);
        await expect(page.locator('[data-category-panel] h2')).toBeVisible();
        await expect(page.locator('[data-category-panel] li, [data-category-panel] tbody tr').first()).toBeVisible();
      }
      await page.goto('/materials/foundations?category=layout');
      await expect(page.getByRole('link', {name: /상세 렌더·토큰·구성 보기/}).first()).toHaveAttribute('href', /\/components\/layout%3A/);
      await page.goto('/materials/foundations?category=chart');
      await expect(page.locator('[data-category-panel] [class*="chartSample"] svg').first()).toBeVisible();
      await expect(page.getByRole('link', {name: /차트 설정·데이터·토큰 상세 보기/}).first()).toHaveAttribute('href', /\/components\/chart-preset%3A/);
    });

    test('Motion previews a live transition with reduced-motion support and Icon shows rights', async ({page}) => {
      await page.goto('/materials/foundations?category=motion');
      const live = page.locator('[class*="motionDemo"] button');
      await expect(live).toBeVisible();
      await expect(live).toHaveCSS('transition-duration', /\d+(\.\d+)?ms/);
      await page.emulateMedia({reducedMotion: 'reduce'});
      await expect(live).toHaveCSS('transition-duration', '0s');
      await expect(live).toHaveCSS('transform', 'none');
      await page.goto('/materials/foundations?category=icon');
      await expect(page.locator('[data-category-panel] svg').first()).toBeVisible();
      await expect(page.getByText(/in-repository-original · internal/).first()).toBeVisible();
    });
  });
}
