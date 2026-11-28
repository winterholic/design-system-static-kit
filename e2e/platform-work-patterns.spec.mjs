import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {WORK_PATTERN_FAMILIES} from '../src/platform/families/work-patterns.mjs';

const assembled = family => assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', items: [{purpose: family.id, visual: 'family:quiet', variant: family.example.variant, props: family.example.props, content: family.example.content}]});

test('M work pattern output stays inside the viewport at mobile and desktop widths', async ({page}) => {
  for (const family of WORK_PATTERN_FAMILIES) {
    const result = assembled(family);
    expect(result.ok, `${family.id}: ${JSON.stringify(result.errors)}`).toBe(true);
    await page.setContent(result.value.standalone);
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 900});
      const measured = await page.evaluate(() => ({body: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, root: document.querySelector('.pf-work')?.getBoundingClientRect().width}));
      expect(measured.scroll, `${family.id} at ${width}px`).toBeLessThanOrEqual(measured.body);
      expect(measured.root, `${family.id} root is visible at ${width}px`).toBeGreaterThan(0);
    }
  }
});

test('search results hide non-matching rows and task completion announces updated counts', async ({page}) => {
  const search = WORK_PATTERN_FAMILIES.find(f => f.id === 'purpose:work.search-result-list');
  const task = WORK_PATTERN_FAMILIES.find(f => f.id === 'purpose:work.task-list');
  const result = assembleComponents({context: 'dashboard', items: [
    {purpose: search.id, visual: 'family:quiet', variant: search.example.variant, props: search.example.props, content: {...search.example.content, results: [
      {title: '권한 정책', summary: '프로젝트 역할 관리', href: '/permissions'},
      {title: '배포 상태', summary: '릴리스 진행 현황', href: '/deployments'},
    ]}},
    {purpose: task.id, visual: 'family:quiet', variant: task.example.variant, props: task.example.props, content: {...task.example.content, tasks: [
      {id: 'review', title: '요청 검토', assignee: '민지', due: '오늘', done: false},
    ]}},
  ]});
  expect(result.ok, JSON.stringify(result.errors)).toBe(true);
  await page.setContent(result.value.standalone);
  const searchRoot = page.locator('[data-work-pattern="purpose:work.search-result-list"]');
  await searchRoot.locator('[data-work-search]').fill('배포');
  await expect(searchRoot.locator('[data-work-row]:visible')).toHaveCount(1);
  const taskRoot = page.locator('[data-work-pattern="purpose:work.task-list"]');
  await taskRoot.locator('[data-work-task]').check();
  await expect(taskRoot.locator('[data-work-task-count]')).toHaveText('1 / 1개 완료');
});


// ---- M 독립 검증(Chromium): 행별 조작, 390·1280 터치 44px·글자 크기, 접근성 역할 ----
import AxeBuilder from '@axe-core/playwright';

const fam = slug => WORK_PATTERN_FAMILIES.find(f => f.id === `purpose:work.${slug}`);
const item = (slug, over = {}, props = {}) => ({purpose: fam(slug).id, visual: 'family:quiet', variant: fam(slug).example.variant, props: {...fam(slug).example.props, ...props}, content: {...fam(slug).example.content, ...over}});
const standalone = items => {
  const r = assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', items});
  expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  return r.value.standalone;
};
// 런타임은 문서마다 한 번만 붙는다. 같은 page에 setContent를 반복하면 이전 문서의 전역이 남아 런타임이 조용히 실패하므로 새 문서로 연다.
async function open(page, items, width = 1280) {
  await page.setViewportSize({width, height: 900});
  await page.goto('about:blank');
  await page.setContent(standalone(items));
}

for (const width of [390, 1280]) {
  test(`M 15행 ${width}px: 조작 요소는 44px 이상이고 글자는 12px 이상이며 가로 넘침이 없다`, async ({page}) => {
    for (const family of WORK_PATTERN_FAMILIES) {
      await open(page, [{purpose: family.id, visual: 'family:quiet', variant: family.example.variant, props: family.example.props, content: family.example.content}], width);
      const found = await page.evaluate(() => {
        const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const root = document.querySelector('.pf-work');
        const target = el => { const box = el.getBoundingClientRect(); const label = el.type === 'checkbox' ? (el.labels?.[0] ?? el.closest('label')) : null; const lb = label?.getBoundingClientRect(); return {w: Math.max(box.width, lb?.width ?? 0), h: Math.max(box.height, lb?.height ?? 0)}; };
        const small = [...root.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea')].filter(visible).map(el => ({el: `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || el.labels?.[0]?.textContent || '').trim().slice(0, 12)}`, ...target(el)})).filter(x => x.h < 44 || x.w < 44);
        const tiny = [...root.querySelectorAll('*')].filter(el => visible(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(el => ({size: parseFloat(getComputedStyle(el).fontSize), text: el.textContent.trim().slice(0, 12)})).filter(x => x.size < 12);
        return {small, tiny, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
      });
      expect(found.small, `${family.id} @${width}: 44px 미만 조작 요소`).toEqual([]);
      expect(found.tiny, `${family.id} @${width}: 12px 미만 글자`).toEqual([]);
      expect(found.overflow, `${family.id} @${width}: 가로 넘침`).toBeLessThanOrEqual(0);
    }
  });
}

test('M 15행: axe가 역할 오용·이름 없는 컨트롤·중복 랜드마크·색 대비를 잡지 않는다', async ({browser}) => {
  for (const family of WORK_PATTERN_FAMILIES) {
    const context = await browser.newContext({viewport: {width: 390, height: 900}});
    const page = await context.newPage();
    await page.setContent(standalone([{purpose: family.id, visual: 'family:quiet', variant: family.example.variant, props: family.example.props, content: family.example.content}]));
    const result = await new AxeBuilder({page}).withRules(['landmark-unique', 'aria-allowed-role', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'label', 'button-name', 'link-name', 'select-name', 'color-contrast', 'scrollable-region-focusable', 'duplicate-id', 'duplicate-id-aria', 'th-has-data-cells', 'td-headers-attr', 'target-size']).analyze();
    expect(result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), family.id).toEqual([]);
    await context.close();
  }
});

test('Filter Toolbar: 필터 버튼이 눌림 상태를 바꾸고 변경 이벤트를 낸다', async ({page}) => {
  await open(page, [item('filter-toolbar')]);
  const buttons = page.locator('[data-work-filter]');
  expect(await buttons.evaluateAll(els => els.map(el => el.getAttribute('aria-pressed')))).toEqual(['true', 'false']);
  await page.evaluate(() => { window.__filters = []; document.addEventListener('kit-work-filter', event => window.__filters.push(event.detail)); });
  await buttons.nth(1).focus();
  await page.keyboard.press('Enter');
  expect(await buttons.evaluateAll(els => els.map(el => el.getAttribute('aria-pressed')))).toEqual(['true', 'true']);
  await page.locator('[data-work-search]').fill('kim');
  const events = await page.evaluate(() => window.__filters);
  expect(events.at(-1).query).toBe('kim');
  expect(events.at(-1).filters).toHaveLength(2);
  expect(await page.locator('[data-work-filter-bar]').getAttribute('role'), '텍스트 입력을 품은 묶음은 toolbar가 아니라 group이다').toBe('group');
});

test('Search Toolbar: 검색 폼이 Enter와 버튼으로 제출되고 상태를 알린다', async ({page}) => {
  await open(page, [item('search-toolbar')]);
  await page.evaluate(() => { window.__searches = []; document.addEventListener('kit-work-search', event => window.__searches.push(event.detail)); });
  const form = page.locator('form[role="search"]');
  await expect(form).toHaveCount(1);
  await page.locator('[data-work-search]').fill('권한');
  await page.keyboard.press('Enter');
  expect((await page.evaluate(() => window.__searches)).at(-1)).toMatchObject({query: '권한'});
  await expect(page.locator('[data-work-search-result]')).toContainText('권한');
  await page.locator('[data-work-submit]').click();
  expect(await page.evaluate(() => window.__searches.length)).toBe(2);
  expect(await page.locator('[data-work-submit]').getAttribute('type')).toBe('submit');
});

test('Bulk Action Toolbar: 사용자 표의 선택을 따라 개수와 동작 활성 상태가 바뀌고 화살표로 이동한다', async ({page}) => {
  await open(page, [item('bulk-action-toolbar', {selectedCount: 0}), item('user-management-table')]);
  const bar = page.locator('[data-work-bulk]');
  await expect(bar.locator('[data-work-selected-count]')).toHaveText('0개 선택');
  expect(await bar.locator('[data-work-action]').evaluateAll(els => els.map(el => el.disabled))).toEqual([true, true]);
  await page.locator('[data-work-select]').first().check();
  await expect(bar.locator('[data-work-selected-count]')).toHaveText('1개 선택');
  expect(await bar.locator('[data-work-action]').evaluateAll(els => els.map(el => el.disabled))).toEqual([false, false]);
  await page.evaluate(() => { window.__bulk = []; document.addEventListener('kit-work-bulk-action', event => window.__bulk.push(event.detail)); });
  await bar.locator('[data-work-action]').first().focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.activeElement.textContent.trim())).toBe('삭제');
  await page.keyboard.press('Home');
  expect(await page.evaluate(() => document.activeElement.textContent.trim())).toBe('보관');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__bulk)).toEqual([{action: expect.any(String), count: 1}]);
  await page.locator('[data-work-select]').first().uncheck();
  expect(await bar.locator('[data-work-action]').evaluateAll(els => els.map(el => el.disabled))).toEqual([true, true]);
});

test('Approval Panel: 결정 결과는 미리 있던 상태 영역에 쓰이고 포커스가 그 영역으로 옮겨진다', async ({page}) => {
  await open(page, [item('approval-panel')]);
  const result = page.locator('[data-work-decision-result]');
  expect(await result.evaluate(el => ({hidden: el.hidden, live: el.getAttribute('aria-live'), role: el.getAttribute('role')}))).toEqual({hidden: false, live: 'polite', role: 'status'});
  await page.locator('[data-work-decision="rejected"]').click();
  await expect(result).toHaveText('반려했습니다.');
  expect(await page.evaluate(() => document.activeElement === document.querySelector('[data-work-decision-result]'))).toBe(true);
  expect(await page.locator('[data-work-decision]').evaluateAll(els => els.every(el => el.disabled))).toBe(true);
});

test('Settings Form·Status Management·Comment Thread: 제출 버튼이 폼을 제출한다(Enter 포함)', async ({page}) => {
  await open(page, [item('settings-form')]);
  await page.locator('[data-work-settings] input').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-work-settings-result]')).toContainText('설정을 확인했습니다');
  await open(page, [item('status-management')]);
  await page.locator('[data-work-submit]').click();
  await expect(page.locator('[data-work-status-result]')).toContainText('상태를 확인했습니다');
  await open(page, [item('comment-thread')]);
  await page.locator('[data-work-submit]').click();
  await expect(page.locator('[data-work-comment-result]'), '빈 댓글은 브라우저 검증이 막는다').toHaveText('');
  await page.locator('textarea').fill('확인했습니다');
  await page.locator('[data-work-submit]').click();
  await expect(page.locator('[data-work-comment-result]')).toContainText('내용을 확인했습니다');
});

test('User Management Table·Search Result List: 전체 선택과 결과 없음 안내가 키보드로 동작하고 상태 영역은 숨김이 아니다', async ({page}) => {
  await open(page, [item('user-management-table')]);
  expect(await page.locator('td [role="status"]').count(), '행마다 status 역할을 두지 않는다').toBe(0);
  await page.locator('[data-work-select-all]').focus();
  await page.keyboard.press('Space');
  const total = await page.locator('[data-work-select]').count();
  await expect(page.locator('[data-work-selected-count]')).toHaveText(`${total}개 선택`);
  await open(page, [item('search-result-list')]);
  const empty = page.locator('[data-work-search-empty]');
  expect(await empty.evaluate(el => el.hidden)).toBe(false);
  await page.locator('[data-work-search]').fill('zzzz-없는-검색어');
  await expect(empty).toHaveText('검색 결과가 없습니다.');
  await page.locator('[data-work-search]').fill('');
  await expect(empty).toHaveText('');
});

test('Permission Matrix·Audit Log·Workflow Steps·Data Summary·KPI Grid: 표 관계와 현재 단계가 출력에 나온다', async ({page}) => {
  await open(page, [item('permission-matrix')]);
  const grid = await page.evaluate(() => ({cols: document.querySelectorAll('thead th[scope="col"]').length, rows: document.querySelectorAll('tbody th[scope="row"]').length, boxes: document.querySelectorAll('input[type=checkbox][data-work-permission]').length, named: [...document.querySelectorAll('input[data-work-permission]')].every(el => el.labels?.[0]?.textContent.trim().length > 2)}));
  expect(grid.boxes).toBe((grid.cols - 1) * grid.rows);
  expect(grid.named).toBe(true);
  await open(page, [item('audit-log')]);
  expect(await page.locator('table thead th[scope="col"]').count()).toBe(4);
  await open(page, [item('workflow-steps')]);
  expect(await page.locator('li[aria-current="step"]').count()).toBe(1);
  await open(page, [item('data-summary')]);
  expect(await page.locator('dl dt').count()).toBe(await page.locator('dl dd').count());
  await open(page, [item('dashboard-kpi-grid')]);
  expect(await page.locator('article h3').count()).toBeGreaterThan(1);
});

test('M 상태: loading·empty·error는 본문 대신 알림 영역 하나를 보인다', async ({page}) => {
  for (const [state, role] of [['loading', 'status'], ['empty', 'status'], ['error', 'alert']]) {
    await open(page, [item('data-summary', {}, {state})]);
    expect(await page.locator('.pf-work-body > [role]').evaluateAll(els => els.map(el => el.getAttribute('role')))).toEqual([role]);
    expect(await page.locator('.pf-work-body dl').count()).toBe(0);
  }
});
