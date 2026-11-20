import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {findCombo, renderCombo} from '../src/combos.mjs';
import {axes} from '../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from '../scripts/design-qa/layout-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from '../scripts/design-qa/text-probe.mjs';
import {CLAIMS} from '../scripts/design-qa/quality-claims.mjs';

// 진단(2026-11-21) 공통 원인 1·4·5·6·7의 재현 시험. 각 시험은 수정 전 코드에서 실패하고(docs/quality-diagnosis-2026-11-21.md 11절),
// 상위 규약(layout·typography·composition)을 고친 뒤 통과한다. 표본 목록은 진단과 같은 samples.json이다.
const samples = Object.fromEntries(JSON.parse(readFileSync(new URL('../docs/evidence/quality-2026-11-21/samples.json', import.meta.url), 'utf8')).samples.map(s => [s.key, s]));
const claim = id => CLAIMS.find(c => c.id === id);

async function load(page, combo, view, width) {
  const r = renderCombo(findCombo(combo), view);
  expect(r.ok, combo + ' ' + r.error).toBe(true);
  await page.setViewportSize({width, height: 900});
  await page.setContent(r.html, {waitUntil: 'load'});
}
async function measure(page, id, key, width) {
  await load(page, samples[key].combo, samples[key].view, width);
  const c = claim(id), v = await page.evaluate(c.fn);
  return {v, pass: c.test(v)};
}
const FACT_FAMILY = ['agency-home', 'wedding-invite', 'game-launch', 'luxury-brand', 'campaign-poster', 'hanji-journey', 'museum-home', 'campaign-donate', 'waitlist'];
const WIDTHS = [320, 390, 768, 1440];

test('cause 1: fixed-count hero facts never leave a lone last cell, in every fact template at four widths (Q01)', async ({page}) => {
  const bad = [];
  for (const id of FACT_FAMILY) for (const width of WIDTHS) {
    await load(page, id, undefined, width);
    const v = await page.evaluate(claim('Q01').fn);
    expect(v, `${id} has hero facts`).not.toBeNull();
    if (!claim('Q01').test(v)) bad.push(`${id}@${width} ${JSON.stringify(v)}`);
    const probe = await page.evaluate(layoutProbe, LAYOUT_OPTIONS);
    for (const f of probe.findings) if (f.code === 'GRID_ORPHAN') bad.push(`${id}@${width} ${f.code} ${f.at} ${f.detail}`);
  }
  expect(bad).toEqual([]);
});

test('cause 1: hero facts stay inside the hero copy and keep every value on one line at 320px', async ({page}) => {
  for (const id of FACT_FAMILY) {
    await load(page, id, undefined, 320);
    const r = await page.evaluate(() => {
      const d = document.querySelector('.kit-hero-facts'), box = d.getBoundingClientRect();
      return {over: [...d.querySelectorAll('dd')].filter(x => x.scrollWidth > x.clientWidth + 1 || x.getBoundingClientRect().right > box.right + 1).length, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth};
    });
    expect(r, id).toEqual({over: 0, docOver: 0});
  }
});

test('cause 1: menu list grids follow the flow invariant and menu rows do not overflow (Q02, Q03)', async ({page}) => {
  for (const width of [768, 1440]) expect(await measure(page, 'Q03', 'S23', width), 'Q03@' + width).toMatchObject({pass: true});
  for (const width of [320, 390]) expect(await measure(page, 'Q02', 'S23', width), 'Q02@' + width).toMatchObject({pass: true});
  for (const width of [320, 768]) {
    await load(page, 'menu-dining', undefined, width);
    const probe = await page.evaluate(layoutProbe, LAYOUT_OPTIONS);
    expect(probe.findings.filter(f => ['GRID_ORPHAN', 'EDGE_VIEW'].includes(f.code)).map(f => f.code + ' ' + f.at + ' ' + f.detail), 'menu-dining@' + width).toEqual([]);
  }
});

test('cause 4: a role floor never folds a title into a narrow column; every type preset on a status page and an article at 320px (Q05)', async ({page}) => {
  expect(await measure(page, 'Q05', 'S27', 320), 'Q05@320').toMatchObject({pass: true});
  const bad = [];
  for (const type of axes.typography) for (const id of ['offline', 'article', 'not-found']) {
    if (!findCombo(id)) continue;
    await load(page, id, {type}, 320);
    for (const f of (await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings) if (f.code === 'BIG_NARROW') bad.push(`${id}@${type} ${f.at} ${f.detail}`);
  }
  expect(bad).toEqual([]);
});

test('cause 5: cards that share a row of a grid do not leave a blank lower half (Q04)', async ({page}) => {
  for (const width of [768, 1440]) expect(await measure(page, 'Q04', 'S12', width), 'Q04@' + width).toMatchObject({pass: true});
  await load(page, 'sales-dashboard', undefined, 768);
  const probe = await page.evaluate(layoutProbe, LAYOUT_OPTIONS);
  expect(probe.findings.filter(f => f.code === 'EMPTY_CELL').map(f => f.at + ' ' + f.detail)).toEqual([]);
});

test('cause 6: a title-like line (strong) is balanced instead of leaving a one-word last line', async ({page}) => {
  const bad = [];
  for (const [id, widths] of [['hr-people', [320, 390, 768]], ['wine-list', [320]]]) for (const width of widths) {
    await load(page, id, undefined, width);
    for (const f of (await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings) if (f.code === 'ORPHAN_LINE' && /^strong/.test(f.at)) bad.push(`${id}@${width} ${f.at} ${f.detail}`);
  }
  expect(bad).toEqual([]);
});

test('cause 7: a half-width form field always has a partner in its row (Q09)', async ({page}) => {
  expect(await measure(page, 'Q09', 'S17', 1440), 'Q09@1440').toMatchObject({pass: true});
  expect(await measure(page, 'Q09', 'S17', 768), 'Q09@768').toMatchObject({pass: true});
});
