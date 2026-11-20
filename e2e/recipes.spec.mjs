import {test, expect} from '@playwright/test';
import {renderCombo, findCombo, comboId, enumerateCombos, filterCombos, EMPTY_VIEW} from '../src/combos.mjs';
import {recipePicks, recipePickOf} from '../src/recipes.mjs';
import {recipes, concepts, templates} from '../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from '../scripts/design-qa/layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from '../scripts/design-qa/spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from '../scripts/design-qa/text-probe.mjs';
import {SEVERE} from '../scripts/design-qa/diagnose-meta.mjs';
import {CLAIMS} from '../scripts/design-qa/quality-claims.mjs';

// Design Recipe(docs/recipes.md). 선택 함수가 고른 조합이 실제 Chromium에서 4개 폭의 심각 프로브 지적 0, 레시피 측정 규칙(RC07~RC09)과 위계(RC02)를 지키는지 잰다.
const WIDTHS = [320, 390, 768, 1440];
const picks = recipePicks().filter(p => p.satisfied); // 규칙을 못 지키는 선택(hr-people RC05)은 추천이 아니다. 아래 시험이 따로 그 이유를 확인한다.
const viewOf = p => p.view ? {...EMPTY_VIEW, ...p.view} : EMPTY_VIEW;
const claim = id => CLAIMS.find(c => c.id === id);

test('every recipe pick has zero severe probe findings at 320, 390, 768 and 1440px, and satisfies the measured rules', async ({page}) => {
  test.setTimeout(300000);
  const problems = [], seen = {ORPHAN_LINE: 0, BIG_NARROW: 0};
  for (const p of picks) {
    const r = renderCombo(findCombo(comboId(p.templateId, p.layout)), viewOf(p));
    expect(r.ok, p.templateId + ' ' + r.error).toBe(true);
    for (const width of WIDTHS) {
      await page.setViewportSize({width, height: 900}); await page.setContent(r.html, {waitUntil: 'load'});
      const found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings]
        .filter(f => !(f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at)));
      for (const f of found) {
        // RC08(끝줄 고아)·RC09(320px 제목 하한)는 레시피가 측정으로 요구하는 규칙이라 심각 등급과 별개로 0이어야 한다.
        if (SEVERE.has(f.code) || f.code === 'ORPHAN_LINE') problems.push(`${p.recipeId}/${p.templateId}@${width} ${f.code} ${f.at} ${f.detail}`);
        if (f.code in seen) seen[f.code]++;
      }
      // Q04(RC07): 같은 격자 안 차트 카드의 아래 빈 공간.
      if (p.recipeId === 'ops-dashboard' && width >= 768) { const v = await page.evaluate(claim('Q04').fn); if (v) expect(claim('Q04').test(v), `${p.templateId}@${width} Q04 ${JSON.stringify(v)}`).toBe(true); }
      // Q12(RC06): 머리말과 본문의 정렬이 한 축.
      if (p.recipeId === 'content-page' && width === 1440) { const v = await page.evaluate(claim('Q12').fn); expect(v.mismatched, `${p.templateId} Q12 ${JSON.stringify(v)}`).toBe(0); }
    }
  }
  expect(problems).toEqual([]);
});

test('Q08: the template the recipe refuses (hr-people, full-width solo bar chart) really fails the browser measure; the ones it keeps pass or have no wide chart', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  const verdict = async id => { await page.setContent(renderCombo(findCombo(id)).html, {waitUntil: 'load'}); const v = await page.evaluate(claim('Q08').fn); return v === null ? 'none' : claim('Q08').test(v); };
  expect(await verdict('hr-people')).toBe(false);
  expect(await verdict('dashboard-analytics')).toBe(false);
  for (const id of ['dashboard-overview', 'sales-dashboard', 'finance-overview']) expect(['none', true], id).toContain(await verdict(id));
});

test('RC02: the SaaS pick has a hero title at least 1.6x the section title at 1440px and a product visual in the first view', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  for (const p of picks.filter(x => x.recipeId === 'saas-landing' && templates[x.templateId].tree.some(n => n.type === 'section'))) {
    const r = renderCombo(findCombo(comboId(p.templateId, p.layout)), viewOf(p));
    await page.setContent(r.html, {waitUntil: 'load'});
    const m = await page.evaluate(() => {
      const hero = document.querySelector('main .kit-hero'), h = hero.querySelector('h1,h2');
      const sec = [...document.querySelectorAll('main .kit-section h2')].find(x => !x.closest('.kit-hero') && x.getBoundingClientRect().width > 0);
      const v = hero.querySelector('.kit-hero-visual');
      return {hero: parseFloat(getComputedStyle(h).fontSize), section: sec ? parseFloat(getComputedStyle(sec).fontSize) : null, visualTop: v ? v.getBoundingClientRect().top : null};
    });
    if (m.section) expect(m.hero / m.section, `${p.templateId} ${JSON.stringify(m)}`).toBeGreaterThanOrEqual(1.6);
    expect(m.visualTop, p.templateId + ' hero visual').not.toBeNull(); expect(m.visualTop).toBeLessThan(900);
  }
});

test('gallery: recipe picks lead the default order, carry a badge with their rule ids, and every other combo stays listed and selectable', async ({page}) => {
  await page.goto('/combos/?exp=1');
  await page.waitForSelector('html[data-ready]');
  const model = filterCombos({});
  const ids = await page.locator('#grid .combo-card').evaluateAll(cards => cards.map(c => c.dataset.id));
  expect(ids.slice(0, 14)).toEqual(model.slice(0, 14).map(c => c.id));
  expect(model.slice(0, 14).every(c => c.recipe)).toBe(true);
  await expect(page.locator('#grid .combo-card .badge.rec')).toHaveCount(14);
  expect(await page.locator('#grid .combo-card .badge.rec').first().getAttribute('title')).toMatch(/레시피 추천 · 지킨 규칙 .*RC0\d/);
  const waitlistCard = page.locator('#grid .combo-card[data-id="waitlist"]');
  await expect(waitlistCard).toContainText('RC01 면제');
  await expect(waitlistCard).toContainText(recipePickOf('waitlist').exempted[0].reason);
  // 추천만 보기, 템플릿 순으로 되돌리기
  await page.locator('#f-rec').check();
  await expect(page.locator('#result-line')).toContainText('개 중 14개');
  await page.locator('#f-rec').uncheck();
  await page.locator('#f-sort').selectOption('template');
  const byTemplate = await page.locator('#grid .combo-card').evaluateAll(cards => cards.map(c => c.dataset.id));
  expect(byTemplate).toEqual(filterCombos({sort: 'template'}).slice(0, byTemplate.length).map(c => c.id));
  // 레시피가 피한 조합도 그대로 목록에 있고 열린다.
  await page.locator('#q').fill('saas-landing~hero:statement');
  await expect.poll(async () => (await page.locator('#grid .combo-card').evaluateAll(cards => cards.map(c => c.dataset.id))).every(id => id.startsWith('saas-landing~hero:statement'))).toBe(true);
  await expect(page.locator('#grid .combo-card').first()).toHaveAttribute('data-id', 'saas-landing~hero:statement');
  await page.locator('#grid .thumb-hit').first().click();
  await expect(page.locator('#viewer')).toBeVisible();
});

test('gallery viewer: a recipe pick with its own look offers to apply that look', async ({page}) => {
  await page.goto('/combos/?exp=1&c=devtool-landing~hero:product');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#v-recipe')).toBeVisible();
  await expect(page.locator('#v-status')).toContainText('SaaS 랜딩 레시피 추천');
  await page.locator('#v-recipe').click();
  await expect.poll(() => page.url()).toMatch(/concept=saas/);
  expect(page.url()).toMatch(/look=trust/);
  const exemptions = page.locator('#v-recipe-exemptions');
  await expect(exemptions).toBeHidden();
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/combos/?c=waitlist');
  await expect(exemptions).toBeVisible();
  await expect(exemptions).toContainText('RC01 면제');
  await expect(exemptions).toContainText(recipePickOf('waitlist').exempted[0].reason);
  expect(await exemptions.evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('workbench: a template with a recipe shows it with its rules, and one click applies the pick while other choices stay open', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#valid-status')).toContainText('검증 통과');
  await expect(page.locator('#recipe-field')).toBeVisible(); // 시작 템플릿 dashboard-overview에도 레시피가 있다.
  await expect(page.locator('#recipe-text')).toContainText('업무 대시보드');
  await page.locator('#template').selectOption('devtool-landing');
  await expect(page.locator('#recipe-field')).toBeVisible();
  await expect(page.locator('#recipe-text')).toContainText('SaaS 랜딩');
  await expect(page.locator('#recipe-rules')).toContainText('RC01');
  await page.locator('#apply-recipe').click();
  await expect(page.locator('#apply-recipe')).toHaveAttribute('aria-pressed', 'true');
  const pick = recipePickOf('devtool-landing'), look = concepts[pick.view.concept].looks.find(l => l.id === pick.view.look);
  const b = JSON.parse(await page.locator('#blueprint-editor').inputValue());
  expect(b.theme).toBe(look.theme);
  expect(JSON.stringify(b.tree)).toContain('"visual":"device"');
  await expect(page.locator('#errors')).toBeHidden();
  // 다른 선택은 열려 있다: 히어로를 직접 바꿀 수 있다.
  await page.locator('#layout-slots [data-slot=hero][data-option=statement]').click();
  await expect(page.locator('#preview-frame').contentFrame().locator('.kit-hero')).toHaveAttribute('data-variant', 'statement');
  await expect(page.locator('#errors')).toBeHidden();
  // 규칙을 못 지키는 템플릿은 추천하지 않고 이유만 보인다. 템플릿 자체는 그대로 고를 수 있다.
  await page.locator('#template').selectOption('hr-people');
  await expect(page.locator('#recipe-text')).toContainText('추천하지 않습니다');
  await expect(page.locator('#recipe-rules')).toContainText('RC05');
  await expect(page.locator('#apply-recipe')).toBeHidden();
  await expect(page.locator('#errors')).toBeHidden();
  // waitlist: 기본이 정당해 레시피 추천이 기본 그대로다(RC01 면제). 적용해도 히어로 수치 3개가 남는다.
  await page.locator('#template').selectOption('waitlist');
  await expect(page.locator('#recipe-text')).toContainText('기본 구성');
  await expect(page.locator('#recipe-rules')).toContainText('RC01 면제');
  await expect(page.locator('#recipe-rules')).toContainText(recipePickOf('waitlist').exempted[0].reason);
  await page.locator('#apply-recipe').click();
  await expect(page.locator('#preview-frame').contentFrame().locator('.kit-hero-facts > *')).toHaveCount(3);
  await page.locator('#template').selectOption('devtool-landing');
  await expect(page.locator('#recipe-rules')).not.toContainText('RC01 면제');
  await page.locator('#template').selectOption('checkout');
  await expect(page.locator('#recipe-field')).toBeHidden();
});
