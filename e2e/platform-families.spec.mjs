import {test, expect} from '@playwright/test';
import {measureAll, summarize, familyMetrics, judge} from '../scripts/families/measure.mjs';
import {buildPage, makeEnv, GROUPS, VISUALS, groupScenarios} from '../scripts/families/pages.mjs';

// 목적 패밀리의 브라우저 시험(ADR 0012 §4 확장, docs/platform/families.md).
//  1) 묶음 × 시각 패밀리 × 모드 × (모바일 390, 데스크톱 1280) 전부에서 기존 layout-quality 검사기와 패밀리 측정이 통과한다.
//  2) 측정이 실제로 문제를 잡는다(일부러 깨뜨린 CSS에서 실패). 통과만 보는 측정은 근거가 되지 않는다.
//  3) 패밀리가 약속한 상호작용이 실제 DOM에서 동작한다.
const env = makeEnv();
const QUIET = 'family:quiet';

test('every group × visual family × mode × viewport passes layout-quality and the family measurements', async () => {
  test.setTimeout(600000);
  const results = await measureAll({groups: GROUPS, modes: ['light', 'dark']});
  const summary = summarize(results);
  const bad = results.filter(r => !r.ok && !r.viewport).map(r => `${r.group} ${r.context}/${r.density} ${r.visual} ${r.mode}: ${r.reason}`).concat(results.filter(r => r.viewport && !r.ok).map(r => `${r.group} ${r.context}/${r.density} ${r.visual} ${r.mode} ${r.viewport}: ${r.fail.join(', ')} ${r.probeErrors.map(e => e.code).join(',')}`));
  expect(bad, bad.join('\n')).toEqual([]);
  const scenarioCount = GROUPS.reduce((count, group) => count + groupScenarios(group).length, 0);
  expect(summary.pages).toBe(scenarioCount * VISUALS.length * 2 * 2);
  expect(summary.overlap.checked).toBeGreaterThan(100);
  // 훑은 대상이 0이면 통과가 아니다
  expect(summary.cards.checked).toBeGreaterThan(100);
  expect(summary.cards.rowsCompared).toBeGreaterThan(10);
  expect(summary.numbers.checked).toBeGreaterThan(100);
  expect(summary.buttons.groupsCompared).toBeGreaterThan(50);
});

test.describe('the measurements fail on deliberately broken CSS', () => {
  async function metricsWith(page, group, extraCss, items, context = 'dashboard') {
    const built = buildPage(env, group, QUIET, {items, context});
    expect(built.ok, JSON.stringify(built.diagnostics)).toBe(true);
    await page.setViewportSize({width: 1280, height: 900});
    await page.setContent(built.html.replace('</style>', `${extraCss}</style>`));
    return page.evaluate(familyMetrics);
  }
  const twoCards = [
    {purpose: 'purpose:card.product', variant: {layout: 'vertical', cta: 'none'}, props: {behavior: 'link'}, content: {title: '짧은 상품', price: '₩3', mediaIcon: 'bag', href: '#a'}},
    {purpose: 'purpose:card.pricing', variant: {emphasis: 'standard'}, content: {plan: '긴 상품 이름', price: '₩24,000', period: '월', description: '같은 줄의 카드는 높이가 같아야 합니다.', features: ['배송 포함', '반품 가능'], ctaLabel: '시작하기'}},
  ];
  test('card height imbalance', async ({page}) => {
    expect(judge(await metricsWith(page, 'card', '', twoCards, 'commerce'))).toEqual([]);
    const m = await metricsWith(page, 'card', '.kit-platform{align-items:start}.pf-card{height:auto}', twoCards, 'commerce');
    expect(m.cards.maxHeightSpread).toBeGreaterThan(1);
    expect(judge(m).join()).toMatch(/카드 높이 불균형/);
  });
  test('number wrapping', async ({page}) => {
    const kpi = [{purpose: 'purpose:card.kpi', variant: {layout: 'stacked', trend: 'none'}, content: {label: '누적', value: '1,284,330,000'}}];
    expect(judge(await metricsWith(page, 'card', '', kpi))).toEqual([]);
    const m = await metricsWith(page, 'card', '.pf-num{white-space:normal;display:inline-block;width:4ch;overflow-wrap:anywhere}', kpi);
    expect(m.numbers.wrapped.length).toBeGreaterThan(0);
  });
  test('card inset and title-body gap', async ({page}) => {
    const m = await metricsWithLeftPad(page);
    expect(m.padding.issues.length).toBeGreaterThan(0);
  });
  async function metricsWithLeftPad(page) { return metricsWith(page, 'card', '.pf-card{padding-left:2px!important}', twoCards, 'commerce'); }
  test('control overlap', async ({page}) => {
    const search = [{purpose: 'purpose:form.search', variant: {layout: 'inline', scope: 'none'}, content: {label: '검색', placeholder: '검색어를 입력하세요'}}];
    expect(judge(await metricsWith(page, 'form', '', search))).toEqual([]);
    const m = await metricsWith(page, 'form', '.pf-search[data-layout=inline] .pf-search-field{margin-right:-80px;position:relative;z-index:1}', search);
    expect(m.overlap.found.length).toBeGreaterThan(0);
  });
  test('button size mismatch', async ({page}) => {
    const pair = [{purpose: 'purpose:button.primary', variant: {layout: 'pair', align: 'start'}, content: {label: '저장', secondaryLabel: '취소'}}];
    expect(judge(await metricsWith(page, 'button', '', pair))).toEqual([]);
    const m = await metricsWith(page, 'button', '.pf-actions .kit-ctl-button[data-appearance=outline]{min-height:72px!important}', pair);
    expect(m.buttons.mismatch.length).toBeGreaterThan(0);
  });
});

test.describe('interactions the families promise', () => {
  async function open(page, group, items, width = 1280, visual = QUIET, context = 'dashboard') {
    const built = buildPage(env, group, visual, {items, runtime: true, context});
    expect(built.ok, JSON.stringify(built.diagnostics)).toBe(true);
    await page.setViewportSize({width, height: 900});
    await page.setContent(built.html);
    expect(await page.locator('[data-wire-error]').count(), 'every attach* runtime wired without error').toBe(0);
  }
  test('selectable product card toggles aria-pressed and shows the check', async ({page}) => {
    await open(page, 'card', [{purpose: 'purpose:card.product', variant: {layout: 'vertical', cta: 'none'}, props: {behavior: 'selectable'}, content: {title: '텀블러', price: '₩24,000', mediaIcon: 'coffee'}}], 1280, QUIET, 'commerce');
    const hit = page.locator('.kit-ctl-card-hit');
    await expect(hit).toHaveAttribute('aria-pressed', 'false');
    await hit.click();
    await expect(hit).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.kit-ctl-card')).toHaveAttribute('data-state', 'selected');
    await expect(page.locator('.kit-ctl-card-check')).toBeVisible();
    await hit.press('Space');
    await expect(hit).toHaveAttribute('aria-pressed', 'false');
  });
  test('gallery tiles select with the native checkbox and show a check mark', async ({page}) => {
    await open(page, 'card', [{purpose: 'purpose:card.gallery', variant: {layout: 'grid', tiles: 'select'}, content: {title: '앨범', items: [{label: '해변', icon: 'droplet'}, {label: '숲길', icon: 'leaf'}, {label: '노을', icon: 'sun'}]}}], 1280, QUIET, 'listing');
    const box = page.getByRole('checkbox', {name: '숲길 선택'});
    await expect(box).not.toBeChecked();
    await box.check();
    await expect(box).toBeChecked();
    await expect(page.locator('.pf-tile:has(input:checked) .pf-tile-check')).toBeVisible();
  });
  test('toggle group items flip independently', async ({page}) => {
    await open(page, 'button', [{purpose: 'purpose:button.toggle', variant: {layout: 'group'}, content: {label: '보기 방식', items: [{label: '목록', pressed: true, icon: 'list'}, {label: '격자', icon: 'grid'}, {label: '지도', icon: 'map-pin'}]}}]);
    const [a, b] = [page.getByRole('button', {name: '목록'}), page.getByRole('button', {name: '격자'})];
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await a.click();
    await expect(a).toHaveAttribute('aria-pressed', 'false');
  });
  test('loading button keeps focus and ignores clicks (aria-disabled, not disabled)', async ({page}) => {
    await open(page, 'button', [{purpose: 'purpose:button.loading', variant: {phase: 'loading', tier: 'primary'}, content: {label: '결제하기', loadingLabel: '결제 중'}}]);
    const b = page.getByRole('button', {name: '결제 중'});
    await expect(b).toHaveAttribute('aria-busy', 'true');
    await expect(b).toHaveAttribute('aria-disabled', 'true');
    await b.focus();
    await expect(b).toBeFocused();
  });
  test('confirm dialog (trigger) opens as a modal, takes focus on Cancel for danger, and Escape returns focus to the trigger', async ({page}) => {
    await open(page, 'feedback', [{purpose: 'purpose:feedback.confirm', variant: {tone: 'danger', form: 'dialog', display: 'trigger'}, content: {title: '프로젝트를 삭제할까요?', description: '영구히 사라집니다.', confirmLabel: '삭제', cancelLabel: '취소', triggerLabel: '프로젝트 삭제'}}]);
    const trigger = page.getByRole('button', {name: '프로젝트 삭제'});
    await trigger.click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    await expect(page.getByRole('button', {name: '취소'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
  test('error banner dismisses and moves focus out of the removed message', async ({page}) => {
    await open(page, 'feedback', [{purpose: 'purpose:feedback.error', variant: {form: 'banner', retry: 'button'}, content: {title: '저장하지 못했습니다', message: '네트워크 연결을 확인하세요.', retryLabel: '다시 시도'}}]);
    await page.getByRole('button', {name: '닫기'}).click();
    await expect(page.locator('.kit-ctl-feedback')).toBeHidden();
  });
  test('business table sorts by header button and selects rows with attachTable', async ({page}) => {
    await open(page, 'table', [{purpose: 'purpose:table.business', variant: {toolbar: 'none'}, props: {sortable: true, selectable: true}, content: {title: '주문', columns: [{id: 'no', label: '번호', sortable: true}, {id: 'amount', label: '금액', sortable: true}], rows: [{id: 'r1', no: 'B-2', amount: '300'}, {id: 'r2', no: 'A-1', amount: '100'}, {id: 'r3', no: 'C-3', amount: '200'}]}}]);
    const first = () => page.locator('tbody tr').first().locator('td[data-column=no]').innerText();
    expect(await first()).toBe('B-2');
    await page.locator('[data-sort=no]').click();
    await expect(page.locator('th[aria-sort=ascending]')).toHaveCount(1);
    expect(await first()).toBe('A-1');
    await page.locator('[data-sort=no]').click();
    await expect(page.locator('th[aria-sort=descending]')).toHaveCount(1);
    expect(await first()).toBe('C-3');
    await page.locator('[data-select-all]').check();
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(3);
    await page.locator('[data-select-row]').first().uncheck();
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(2);
  });
  test('tabs move selection with the arrow keys and show the matching panel', async ({page}) => {
    await open(page, 'navigation', [{purpose: 'purpose:navigation.tabs', variant: {layout: 'top', counts: 'none'}, content: {title: '현황', tabs: [{id: 'a', label: '개요', content: '개요 패널'}, {id: 'b', label: '작업', content: '작업 패널'}, {id: 'c', label: '파일', content: '파일 패널'}]}}]);
    const [a, b] = [page.getByRole('tab', {name: /개요/}), page.getByRole('tab', {name: /작업/})];
    await a.focus();
    await page.keyboard.press('ArrowRight');
    await expect(b).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('작업 패널');
  });
  const carouselItems = [{purpose: 'purpose:media.carousel', content: {label: '제품 사진', items: [{src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '첫째', title: '제품 1'}, {src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '둘째', title: '제품 2'}, {src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '셋째', title: '제품 3'}]}}];
  for (const width of [390, 1280]) {
    test(`carousel at ${width}px: the track is a real scroll region, the buttons and a swipe both move it, and the counter follows`, async ({page}) => {
      await open(page, 'media', carouselItems, width, QUIET, 'landing');
      const track = page.locator('.pf-carousel-track'), counter = page.locator('.pf-carousel-counter');
      expect(await track.evaluate(el => getComputedStyle(el).overflowX), 'off-screen slides are scrolled, not clipped').toBe('auto');
      expect(await track.evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(true);
      await expect(counter).toHaveText('1 / 3');
      await page.locator('[data-carousel-next]').click();
      await expect(counter).toHaveText('2 / 3');
      await expect.poll(() => track.evaluate(el => Math.round(el.scrollLeft))).toBeGreaterThan(width / 2);
      await page.locator('[data-carousel-prev]').click();
      await expect(counter).toHaveText('1 / 3');
      await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeLessThan(2);
      await track.evaluate(el => { el.scrollTo({left: el.querySelectorAll('.pf-carousel-slide')[2].offsetLeft, behavior: 'instant'}); });
      await expect(counter, 'a swipe moves the counter too').toHaveText('3 / 3');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'the hidden slides do not widen the page').toBe(true);
    });
    test(`responsive image at ${width}px: the caption sits below the ratio box and is not clipped`, async ({page}) => {
      await open(page, 'media', [{purpose: 'purpose:media.responsive-image', content: {src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '풍경', caption: '멋진 풍경'}}], width, QUIET, 'landing');
      const box = await page.locator('.pf-responsive-image').boundingBox(), caption = await page.locator('.pf-image-caption').boundingBox();
      expect(caption.y, 'caption starts below the image box').toBeGreaterThanOrEqual(box.y + box.height - 0.5);
      expect(await page.locator('.pf-image-caption').evaluate(el => el.closest('.pf-responsive-image') === null)).toBe(true);
    });
  }
});
