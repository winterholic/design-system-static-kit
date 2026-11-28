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

