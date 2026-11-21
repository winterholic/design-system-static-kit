import {test, expect} from '@playwright/test';
import {createBlueprint, migrateBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

// 카탈로그 2.5.0 표현력 확장(ADR 0010)의 브라우저 실측. R1~R4는 같은 입력을 2.4.0과 2.5.0으로 컴파일해 둘을 나란히 잰다(2.4.0에서 결함이 재현되고 2.5.0에서 사라진다).
const hero = extra => ({type: 'hero', variant: 'split', title: '히어로 제목', body: '본문 한 줄', visual: 'photo', motif: 'coast', ...extra});
const prose = (t = '글') => ({type: 'prose', title: t, body: '본문입니다. 본문입니다.'});
const sec = (children, extra) => ({type: 'section', title: '구역', children, ...extra});
const card = (i, extra) => ({type: 'card', title: '카드 ' + i, body: '짧은 설명입니다.', ...extra});
function make(children, patch = {}, version = '2.5.0') {
  const b = migrateBlueprint(createBlueprint('saas-landing'), version);
  b.pageType = 'general'; b.chrome.nav = b.chrome.nav.map(n => ({...n, href: '#main'}));
  b.tree.children = [{type: 'page-header', title: '제목'}, ...children];
  return Object.assign(b, patch);
}
async function open(page, blueprint, width = 1280) {
  await page.setViewportSize({width, height: 900});
  await page.setContent(compile(blueprint).html, {waitUntil: 'load'});
}
const both = (children, patch) => [make(children, patch, '2.4.0'), make(children, patch, '2.5.0')];
const box = (page, sel, n = 0) => page.locator(sel).nth(n).evaluate(e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; });

test('R1 a section right after the hero keeps its top padding when the page backdrop is not plain (2.4.0: 0px)', async ({page}) => {
  const kids = [hero(), sec([prose()])];
  for (const backdrop of ['tint', 'gradient']) {
    const [old, next] = both(kids, {backdrop, pageType: 'landing'});
    await open(page, old); const before = await page.locator('.kit-main>.kit-section').first().evaluate(e => getComputedStyle(e).paddingTop);
    await open(page, next); const after = await page.locator('.kit-main>.kit-section').first().evaluate(e => getComputedStyle(e).paddingTop);
    expect(before, backdrop + ' 2.4.0 reproduces the defect').toBe('0px');
    expect(parseFloat(after), backdrop + ' 2.5.0').toBeGreaterThanOrEqual(36);
  }
  const [, plain] = both(kids, {backdrop: 'plain', pageType: 'landing'});
  await open(page, plain);
  expect(await page.locator('.kit-main>.kit-section').first().evaluate(e => getComputedStyle(e).paddingTop), 'plain backdrop keeps P03').toBe('0px');
});

test('R2 an explicit plain surface is never painted soft on even positions (2.4.0 paints it)', async ({page}) => {
  const kids = [hero(), sec([prose()]), sec([prose()], {surface: 'plain'}), sec([prose()], {surface: 'plain'})];
  const [old, next] = both(kids, {pageType: 'landing'});
  const bg = async () => page.locator('.kit-main>.kit-section').evaluateAll(els => els.map(e => getComputedStyle(e).backgroundColor));
  await open(page, old); const before = await bg();
  await open(page, next); const after = await bg();
  expect(before[1], '2.4.0: the second (even) section is painted although it says plain').not.toBe('rgba(0, 0, 0, 0)');
  expect(after[1], '2.5.0').toBe('rgba(0, 0, 0, 0)');
  expect(after[0]).toBe(before[0]);
});

test('R3 a 3:4 device mock keeps its chips inside the picture and is no taller than 500px (2.4.0: clipped chips, ~800px)', async ({page}) => {
  const kids = [sec([{type: 'media', kind: 'device', ratio: '3:4', alt: '앱 화면'}])];
  const [old, next] = both(kids);
  const measure = async () => page.locator('.kit-art-box svg').first().evaluate(svg => {
    const s = svg.getBoundingClientRect(), box = svg.parentElement.getBoundingClientRect();
    const right = Math.max(...[...svg.querySelectorAll('rect')].map(r => r.getBoundingClientRect().right));
    return {overflow: Math.round(right - s.right), height: Math.round(box.height)};
  });
  await open(page, old); const before = await measure();
  await open(page, next); const after = await measure();
  expect(before.overflow, '2.4.0 clips chips beyond the right edge').toBeGreaterThan(20);
  expect(before.height).toBeGreaterThan(700);
  expect(after.overflow).toBeLessThanOrEqual(1);
  expect(after.height).toBeLessThanOrEqual(500);
});

test('R4 the big photo of a showcase gallery is 16:9, not a full-width square (2.4.0: ~1000px tall)', async ({page}) => {
  const kids = [sec([{type: 'gallery', layout: 'showcase', items: ['가', '나', '다', '라'].map(alt => ({kind: 'photo', alt}))}])];
  const [old, next] = both(kids);
  await open(page, old); const before = await box(page, '.kit-gallery[data-layout=showcase] li:first-child .kit-art-box');
  await open(page, next); const after = await box(page, '.kit-gallery[data-layout=showcase] li:first-child .kit-art-box');
  expect(before.h).toBeGreaterThan(900);
  expect(after.h).toBeLessThan(700);
  expect(Math.abs(after.w / after.h - 16 / 9)).toBeLessThan(0.02);
});

test('EX-1 hero.ratio sets the column widths (copy 60:40, visual 40:60) and folds to one column on narrow pages', async ({page}) => {
  for (const [ratio, expected] of [['copy', 0.6], ['visual', 0.4]]) {
    await open(page, make([hero({ratio})]));
    const c = await box(page, '.kit-hero-copy'), v = await box(page, '.kit-hero-visual');
    expect(Math.abs(c.w / (c.w + v.w) - expected), `${ratio}: ${c.w}/${v.w}`).toBeLessThan(0.03);
  }
  await open(page, make([hero({ratio: 'visual'})]), 390);
  const c = await box(page, '.kit-hero-copy'), v = await box(page, '.kit-hero-visual');
  expect(v.y).toBeGreaterThan(c.y + c.h - 1);
  await open(page, make([hero({variant: 'product', ratio: 'visual'})]));
  const pv = await box(page, '.kit-hero-visual'), pc = await box(page, '.kit-hero-copy');
  expect(pv.w).toBeGreaterThan(pc.w);
  expect(pv.x).toBeLessThan(pc.x);
});

test('EX-1 split.ratio dominant-start is about 70:30 on a wide container and 60:40 below it', async ({page}) => {
  const kids = [sec([{type: 'split', ratio: 'dominant-start', align: 'start', children: [{type: 'media', kind: 'photo', ratio: '4:3', alt: '사진'}, prose('캡션')]}])];
  await open(page, make(kids, {width: 'full'}), 1500);
  let a = await box(page, '.kit-split-cell', 0), b = await box(page, '.kit-split-cell', 1);
  expect(Math.abs(a.w / (a.w + b.w) - 0.7)).toBeLessThan(0.03);
  await open(page, make(kids), 900);
  a = await box(page, '.kit-split-cell', 0); b = await box(page, '.kit-split-cell', 1);
  expect(Math.abs(a.w / (a.w + b.w) - 0.6)).toBeLessThan(0.04);
  await open(page, make(kids), 390);
  a = await box(page, '.kit-split-cell', 0); b = await box(page, '.kit-split-cell', 1);
  expect(b.y).toBeGreaterThan(a.y);
});

test('EX-2 a featured card is two cells wide and no width leaves a lone last cell', async ({page}) => {
  const grid = n => [sec([{type: 'grid', columns: 'four', children: Array.from({length: n}, (_, i) => card(i + 1, i === 0 ? {featured: 'yes'} : {}))}])];
  await open(page, make(grid(3), {width: 'wide'}), 1440);
  const row = await page.locator('.kit-grid > *').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width)]; }));
  expect(new Set(row.map(r => r[1])).size, 'one row of 4 cells').toBe(1);
  expect(Math.abs(row[0][2] - (2 * row[1][2] + (row[1][0] - row[0][0] - row[0][2])))).toBeLessThan(3);
  for (const width of [390, 700, 900, 1100, 1440]) for (const n of [3, 4, 5, 6, 7]) {
    await open(page, make(grid(n), {width: 'wide'}), width);
    const cells = await page.locator('.kit-grid > *').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width)]; }));
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sw, `${n}@${width} overflows`).toBeLessThanOrEqual(0);
    const rows = Map.groupBy(cells, c => c[1]), last = [...rows.values()].at(-1);
    if (rows.size > 1) expect(last.length === 1 && last[0][2] < cells[1][2] * 1.3 && cells.length > 2 && [...rows.values()].some(r => r.length > 1), `${n}@${width} lone last cell ${JSON.stringify(cells)}`).toBe(false);
  }
});

test('EX-3 a pull quote has no box and a larger type than the boxed quote', async ({page}) => {
  const q = extra => ({type: 'quote', quote: '큰 인용문입니다. 풀쿼트는 상자 없이 큰 글자로 읽힙니다.', author: '저자', ...extra});
  await open(page, make([sec([q({variant: 'pull'})]), sec([q()])]));
  const s = await page.locator('.kit-quote').evaluateAll(els => els.map(e => { const c = getComputedStyle(e), b = getComputedStyle(e.querySelector('blockquote')); return {bg: c.backgroundColor, border: c.borderTopWidth, shadow: c.boxShadow, size: parseFloat(b.fontSize)}; }));
  expect(s[0].bg).toBe('rgba(0, 0, 0, 0)'); expect(s[0].border).toBe('0px'); expect(s[0].shadow).toBe('none');
  expect(s[0].size).toBeGreaterThan(s[1].size);
});

// 랜딩은 hero 가 필수(PAGE_REQUIRE)라 hero 없는 이 시험은 make()의 general 을 쓴다. 두 유형의 구역 스타일(BAND)은 같다. 구역마다 번갈아 깔리는 바탕색이 높이를 흔들지 않게 surface 를 plain 으로 고정한다.
test('EX-4 section.space loose is roomier and tight is tighter than normal; flat is never painted', async ({page}) => {
  const heights = async patch => { await open(page, make([sec([prose()], {surface: 'plain', ...patch.a}), sec([prose()], {surface: 'plain', ...patch.b}), sec([prose()], {surface: 'plain', ...patch.c})], {density: 'spacious'})); return page.locator('.kit-main>.kit-section').evaluateAll(els => els.map(e => e.getBoundingClientRect().height)); };
  const h = await heights({a: {space: 'tight'}, b: {}, c: {space: 'loose'}});
  expect(h[0]).toBeLessThan(h[1]); expect(h[2]).toBeGreaterThan(h[1]);
  expect(Math.round(h[2] - h[1])).toBe(52);
  await open(page, make([sec([prose()]), sec([prose()], {surface: 'flat'})]));
  expect(await page.locator('.kit-main>.kit-section').nth(1).evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});

test('EX-5 a bleed media spans the full width of the main grid on wide screens and the content width on phones', async ({page}) => {
  const kids = [{type: 'media', kind: 'photo', ratio: '21:9', alt: '전경', caption: '캡션', bleed: 'yes'}, sec([prose()])];
  await open(page, make(kids), 1280);
  const wide = await box(page, '.kit-media[data-bleed] .kit-art-box');
  expect(wide.x).toBeLessThanOrEqual(1); expect(wide.w).toBeGreaterThanOrEqual(1279);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await open(page, make(kids), 390);
  const phone = await box(page, '.kit-media[data-bleed] .kit-art-box');
  expect(phone.x).toBeGreaterThanOrEqual(15); expect(phone.w).toBeLessThanOrEqual(390 - 30);
});
