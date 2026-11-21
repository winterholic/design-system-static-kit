// 접근성 시험(axe-core). 주요 화면을 390·1280px 에서 검사하고 serious·critical 위반이 0건이어야 통과한다.
// iframe 안(컴파일 결과물)은 화면 자체의 책임이 아니라서 아래 첫 묶음에서는 제외하고, 둘째 묶음에서 따로 측정해 보고만 한다.
import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

const PAGES = [
  {name: '홈', path: '/'},
  {name: 'Explore 목록', path: '/explore'},
  {name: 'Explore 상세', path: '/explore/saas-landing'},
  {name: 'Components 목록', path: '/components'},
  {name: 'Components hero', path: '/components/hero'},
  {name: 'Studio', path: '/studio?template=dashboard-overview', ready: '[data-phase="ready"]'},
  {name: 'Docs 시작하기', path: '/docs/getting-started'},
  {name: 'Integrations MCP', path: '/integrations/mcp'},
];
const WIDTHS = [390, 1280];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING = new Set(['serious', 'critical']);

const summarize = violations => violations.map(v =>
  `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}곳)\n` + v.nodes.slice(0, 4).map(n => `    - ${n.target.join(' ')}\n      ${n.html.slice(0, 160)}\n      ${(n.any[0] ?? n.all[0] ?? n.none[0])?.message ?? ''}`).join('\n')).join('\n');

for (const width of WIDTHS) {
  test.describe(`axe ${width}px`, () => {
    test.use({viewport: {width, height: 800}});
    for (const {name, path, ready} of PAGES) {
      test(`${name} (${path}): serious·critical 위반 0건`, async ({page}) => {
        await page.goto(path);
        if (ready) await expect(page.locator(ready)).toBeVisible();
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({page}).withTags(TAGS).exclude('iframe').analyze();
        const blocking = results.violations.filter(v => BLOCKING.has(v.impact));
        const minor = results.violations.filter(v => !BLOCKING.has(v.impact));
        if (minor.length) test.info().annotations.push({type: 'axe-minor', description: minor.map(v => `${v.impact}:${v.id}(${v.nodes.length})`).join(', ')});
        expect(blocking, `\n${summarize(blocking)}\n`).toEqual([]);
      });
    }
  });
}

// 컴파일 결과물은 iframe 으로 들어가는 별도 문서다. 같은 출처 주소를 직접 열어 측정하고 결과를 주석으로 남긴다(실패시키지 않는다).
test.describe('axe iframe 내부 컴파일 결과물 (보고용)', () => {
  for (const path of ['/explore/saas-landing/render', '/examples/saas-landing/', '/components/hero/render']) {
    for (const width of WIDTHS) {
      test(`${path} ${width}px`, async ({page}) => {
        await page.setViewportSize({width, height: 800});
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({page}).withTags(TAGS).analyze();
        const all = results.violations.map(v => `${v.impact}:${v.id}(${v.nodes.length})`).join(', ') || '위반 없음';
        console.log(`IFRAME-AXE ${path} ${width}px: ${all}`);
        test.info().annotations.push({type: 'axe-iframe', description: all});
        if (results.violations.length) test.info().attach('axe-violations.txt', {body: summarize(results.violations), contentType: 'text/plain'});
      });
    }
  }
});
