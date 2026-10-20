import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {enumerateCombos, filterCombos, shuffled} from '../src/combos.mjs';
import {themes} from '../src/catalog.mjs';

const all = enumerateCombos();
const watch = page => { const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => m.type() === 'error' && errors.push('console: ' + m.text() + ' @' + JSON.stringify(m.location()))); return errors; };
const ready = async (page, url = '/combos/') => { await page.goto(url); await page.waitForSelector('html[data-ready=true]'); };
const idsOnPage = page => page.locator('#grid .combo-card').evaluateAll(cards => cards.map(c => c.dataset.id));

test('the gallery lists all 4,102 combinations with no console errors, and only a few iframes are alive', async ({page}) => {
  const errors = watch(page);
  await ready(page);
  await expect(page.locator('#total-count')).toHaveText('4,102');
  await expect(page.locator('#result-line')).toContainText('전체 4,102개 중 4,102개 · 1 / 86쪽');
  expect(await page.locator('#grid .combo-card').count()).toBe(48);
  await expect.poll(() => page.locator('#grid iframe').count(), {timeout: 15000}).toBeGreaterThan(3);
  // 끝까지 훑어도 살아 있는 iframe은 상한(데스크톱 24) 안이다.
  let peak = 0;
  for (let y = 0; y < 6000; y += 700) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(250); peak = Math.max(peak, await page.locator('#grid iframe').count()); }
  expect(peak).toBeLessThanOrEqual(24);
  expect(errors).toEqual([]);
});

test('every page of the list is reachable and together they cover all 4,102 ids exactly once', async ({page}) => {
  await ready(page, '/combos/?ps=96');
  const seen = new Set();
  for (let p = 1; p <= 43; p++) {
    for (const id of await idsOnPage(page)) seen.add(id);
    if (p < 43) await page.locator('#pager-bottom [aria-label="다음 쪽"]').click();
  }
  expect(seen.size).toBe(4102);
  expect([...seen].sort()).toEqual(all.map(c => c.id).sort());
  await expect(page.locator('#result-line')).toContainText('43 / 43쪽');
});

test('filters: template, slot, search, same-screen, sort and reset agree with the model', async ({page}) => {
  const errors = watch(page);
  await ready(page);
  const count = () => page.locator('#result-line').textContent().then(t => Number(t.match(/중 ([\d,]+)개/)[1].replace(/,/g, '')));
  await page.locator('#f-type').selectOption('landing');
  expect(await count()).toBe(filterCombos({pageType: 'landing'}).length);
  const template = 'saas-landing';
  await page.locator('#f-type').selectOption('');
  await page.locator('#f-template').selectOption(template);
  expect(await count()).toBe(filterCombos({template}).length);
  await page.locator('#slot-details > summary').click();
  await page.locator('#slot-filters select[data-slot=hero]').selectOption('product');
  expect(await count()).toBe(filterCombos({template, slots: {hero: 'product'}}).length);
  expect(await count()).toBeGreaterThan(0);
  for (const id of await idsOnPage(page)) expect(id).toContain('hero:product');
  await page.locator('#clear-filters').click();
  expect(await count()).toBe(4102);
  await page.locator('#q').fill('#0123');
  await expect(page.locator('#result-line')).toContainText('4,102개 중 1개');
  expect(await idsOnPage(page)).toEqual([all[122].id]);
  await page.locator('#q').fill('');
  await page.locator('#f-same').check();
  expect(await count()).toBe(all.filter(c => !c.sameAs).length);
  await page.locator('#f-same').uncheck();
  await page.locator('#f-sort').selectOption('changed');
  const first = (await idsOnPage(page))[0];
  expect(all.find(c => c.id === first).changed).toBe(Math.max(...all.map(c => c.changed)));
  await page.locator('#q').fill('zzzz-no-such-combo');
  await expect(page.locator('#grid .empty')).toBeVisible();
  expect(errors).toEqual([]);
  // 주소로 필터가 복원된다
  await ready(page, '/combos/?t=saas-landing&sl=hero:product&p=2&ps=24');
  expect(await count()).toBe(filterCombos({template: 'saas-landing', slots: {hero: 'product'}}).length);
  await expect(page.locator('#f-template')).toHaveValue('saas-landing');
});

test('a random sample of 40 combinations renders as full pages through the shareable render URL', async ({page}) => {
  test.setTimeout(240000);
  const errors = watch(page);
  const sample = shuffled(all, 20261020).slice(0, 40);
  for (const [i, c] of sample.entries()) {
    const theme = i % 2 ? '&theme=' + Object.keys(themes)[(i * 5) % Object.keys(themes).length] : '';
    await page.goto(`/combos/render.html?c=${c.id}${theme}`);
    await expect(page.locator('body')).toContainText(/\S/);
    expect(await page.title(), c.id).not.toBe('조합 보기 · Static Kit');
    expect(await page.locator('[class*="kit-"]').count(), c.id).toBeGreaterThan(5);
  }
  await page.goto('/combos/render.html?c=not-a-combo');
  await expect(page.locator('body')).toContainText('알 수 없는 조합');
  expect(errors).toEqual([]);
});

test('viewer: opens from a card with its own URL, steps with ← → and Esc, and honours the filtered order', async ({page}) => {
  const errors = watch(page);
  await ready(page);
  await page.locator('.thumb-hit').nth(2).click();
  await expect(page.locator('#viewer')).toHaveAttribute('open', '');
  expect(page.url()).toContain('c=' + all[2].id);
  await expect(page.locator('#v-pos')).toContainText('3 / 4,102');
  await expect(page.locator('#viewer-title')).toContainText('#0003');
  await expect.poll(() => page.frameLocator('#v-frame').locator('[class*="kit-"]').count()).toBeGreaterThan(5);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#v-pos')).toContainText('4 / 4,102');
  expect(page.url()).toContain('c=' + all[3].id);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#v-pos')).toContainText('2 / 4,102');
  // 키보드는 미리보기 안에 포커스가 있어도 먹는다
  await page.frameLocator('#v-frame').locator('body').click({position: {x: 5, y: 5}});
  await page.frameLocator('#v-frame').locator('body').press('ArrowRight');
  await expect(page.locator('#v-pos')).toContainText('3 / 4,102');
  await page.locator('#v-next').click();
  await expect(page.locator('#v-pos')).toContainText('4 / 4,102');
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).not.toHaveAttribute('open', '');
  await expect(page).not.toHaveURL(/[?&]c=/);
  expect(errors).toEqual([]);

  // 필터를 건 순서로 이동한다(필터 안의 위치 표시)
  await page.locator('#f-template').selectOption('saas-landing');
  const ids = filterCombos({template: 'saas-landing'}).map(c => c.id);
  await page.locator('.thumb-hit').nth(1).click();
  await expect(page.locator('#v-pos')).toContainText(`필터 2/${ids.length}`);
  await page.locator('#v-next').click();
  expect(page.url()).toContain('c=' + ids[2]);
  await page.keyboard.press('Escape');
});

test('viewer: a shared link opens the combination with its theme, mode and palette, and Back closes only the viewer', async ({page}) => {
  const errors = watch(page);
  const target = all.find(c => c.templateId === 'saas-landing' && c.changed === 2), theme = 'academic';
  await ready(page, `/combos/?c=${target.id}&theme=${theme}&mode=dark`);
  await expect(page.locator('#viewer')).toHaveAttribute('open', '');
  await expect(page.locator('#viewer-title')).toContainText('#' + String(target.n).padStart(4, '0'));
  await expect(page.locator('#v-theme')).toHaveValue(theme);
  await expect.poll(() => page.frameLocator('#v-frame').locator('html').getAttribute('data-theme')).toBe('dark');
  // 테마를 바꾸면 같은 조합이 다른 화면으로 다시 그려지고 주소가 따라간다
  const before = await page.locator('#v-frame').getAttribute('srcdoc');
  await page.locator('#v-theme').selectOption('editorial');
  await expect.poll(async () => (await page.locator('#v-frame').getAttribute('srcdoc')) !== before).toBe(true);
  expect(page.url()).toContain('theme=editorial'); expect(page.url()).toContain('c=' + target.id);
  await page.locator('#v-mode button[data-mode=""]').click();
  expect(page.url()).not.toContain('mode=');
  await page.goBack();
  await expect(page.locator('#viewer')).not.toHaveAttribute('open', '');
  await expect(page.locator('#total-count')).toHaveText('4,102');
  expect(errors).toEqual([]);
});

test('viewer: a theme that forbids the chosen mode keeps its own mode and says why', async ({page}) => {
  await ready(page, `/combos/?c=${all[0].id}&theme=nocturne&mode=light`);
  await expect(page.locator('#v-status')).toContainText('라이트를 쓰지 않아 기본 모드');
});

test('flags: mark, note, persist, filter, export as text, delete', async ({page}) => {
  const errors = watch(page);
  await ready(page);
  await page.evaluate(() => localStorage.removeItem('winterholic-static-kit.combo-flags.v1'));
  await ready(page);
  await page.locator('.combo-card').nth(1).locator('[data-flag]').click();
  await expect(page.locator('#flag-count')).toHaveText('1');
  await page.locator('.thumb-hit').nth(4).click();
  await page.locator('#v-flag').click();
  await expect(page.locator('#flag-count')).toHaveText('2');
  await expect(page.locator('#note-field')).toBeVisible();
  await page.locator('#v-note').fill('표가 가로로 넘침');
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/[?&]c=/);
  await page.reload(); await page.waitForSelector('html[data-ready=true]');
  await expect(page.locator('#flag-count')).toHaveText('2');
  await page.locator('#f-flagged').check();
  expect((await idsOnPage(page)).sort()).toEqual([all[1].id, all[4].id].sort());
  await page.locator('#open-flags').click();
  await expect(page.locator('#flags-list li')).toHaveCount(2);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#flags-download').click()]);
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('# 이상한 조합 2건');
  expect(text).toContain('#0002 ' + all[1].id); expect(text).toContain('#0005 ' + all[4].id);
  expect(text).toContain('메모: 표가 가로로 넘침');
  expect(text).toContain('/combos/?c=' + all[4].id);
  await page.locator('[data-flag-del="0"]').click();
  await expect(page.locator('#flags-list li')).toHaveCount(1);
  await page.locator('#flags-clear').click(); await page.locator('#flags-clear').click();
  await expect(page.locator('#flag-count')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('copy buttons put the stable id and the share link on the clipboard path (toast confirms)', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ready(page);
  await page.locator('.combo-card').nth(3).locator('[data-copy]').click();
  await expect(page.locator('#toast')).toContainText('ID를 복사했습니다');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(all[3].id);
  await page.locator('.thumb-hit').nth(3).click();
  await page.locator('#v-copy-link').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/combos/?c=' + all[3].id, page.url()).href);
});

test('the main menu of the workbench links to the gallery and the gallery links back', async ({page}) => {
  await page.goto('/');
  await page.getByRole('link', {name: '전체 조합'}).click();
  await expect(page).toHaveURL(/\/combos\/$/);
  await page.waitForSelector('html[data-ready=true]');
  await page.getByRole('link', {name: '카탈로그'}).click();
  await expect(page.locator('#catalog')).toBeVisible();
});

test.describe('phone', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  test('390px: one column, no horizontal overflow, viewer fits and swipes through the preview and the bar', async ({page}) => {
    const errors = watch(page);
    await ready(page);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    const cols = await page.locator('#grid').evaluate(g => getComputedStyle(g).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(1);
    await page.locator('.thumb-hit').first().scrollIntoViewIfNeeded();
    await page.locator('.thumb-hit').first().tap();
    await expect(page.locator('#viewer')).toHaveAttribute('open', '');
    expect(await overflow()).toBeLessThanOrEqual(0);
    const box = await page.locator('#v-shell').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(391);
    // 미리보기 안 스와이프 → 다음 조합
    const swipe = (el, from, to) => el.evaluate((node, [a, b]) => {
      const touch = (type, x) => { const t = new Touch({identifier: 1, target: node, clientX: x, clientY: 300}); return new TouchEvent(type, {touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true}); };
      node.dispatchEvent(touch('touchstart', a)); node.dispatchEvent(touch('touchend', b));
    }, [from, to]);
    await swipe(page.frameLocator('#v-frame').locator('body'), 330, 40);
    await expect(page.locator('#v-pos')).toContainText('2 / 4,102');
    await swipe(page.frameLocator('#v-frame').locator('body'), 40, 330);
    await expect(page.locator('#v-pos')).toContainText('1 / 4,102');
    // 막대 위 스와이프
    await swipe(page.locator('#viewer-bar'), 330, 40);
    await expect(page.locator('#v-pos')).toContainText('2 / 4,102');
    // 보기 설정은 접혀 있다가 열린다
    await expect(page.locator('#viewer-tools')).toBeHidden();
    await page.locator('#v-settings').tap();
    await expect(page.locator('#viewer-tools')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
});
