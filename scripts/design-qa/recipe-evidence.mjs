// Design Recipe 증거(2026-11-21): 같은 템플릿(=같은 콘텐츠)을 "기본 자동 조립"과 "Recipe 조립"으로 나란히 320·390·768·1440px에서 실제 Chromium으로 렌더해
// 스크린샷과 DOM 실측(프로브 지적, 구조 등급, 레시피별 측정 조건)을 저장한다. 직접 눈으로 본 것과 수치로만 확인한 것의 구분은 docs/recipes.md에 따로 적는다.
//   기본 자동 조립 = createBlueprint(템플릿 id)의 기본 구성(템플릿 기본 테마, 구성 변형 없음). Recipe 조립 = selectRecipe({recipe, templateId})의 선택.
// 사용: node scripts/design-qa/recipe-evidence.mjs [--cases docs/evidence/recipes/cases.json] [--matrix] [--no-shots] [--only R1,R2] [--out docs/evidence/recipes]
//   --matrix  레시피가 다루는 모든 (레시피, 템플릿) 선택을 4폭에서 재고 PNG 없이 picks-matrix.json만 만든다(구조 등급 A·심각 지적 0 확인용).
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {findCombo, renderCombo, comboId, EMPTY_VIEW} from '../../src/combos.mjs';
import {selectRecipe, recipePicks} from '../../src/recipes.mjs';
import {CATALOG_VERSION} from '../../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';
import {pageMetrics} from './quality-metrics.mjs';
import {CLAIMS} from './quality-claims.mjs';
import {SEVERE, grade} from './diagnose-meta.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const root = resolve(import.meta.dirname, '../..');
const outDir = resolve(root, opt('--out', 'docs/evidence/recipes'));
const casesFile = resolve(root, opt('--cases', 'docs/evidence/recipes/cases.json'));
const matrix = args.includes('--matrix'), shots = !args.includes('--no-shots') && !matrix, only = opt('--only', null)?.split(',');
const WIDTHS = [320, 390, 768, 1440];
/** 폭별 저장 높이 상한(px). 저장소가 무거워지지 않게 상단 위주로 저장한다. 실제 문서 높이와 잘림은 JSON의 docH·clipped. */
const CAP = {320: 3600, 390: 3600, 768: 3000, 1440: 2600};
/** 레시피 유형별로 읽는 측정 조건(quality-claims.mjs의 id). 값이 null이면 그 화면에 해당 요소가 없다는 뜻이다. */
const CLAIM_IDS = {'saas-landing': ['Q06', 'Q13'], 'ops-dashboard': ['Q04', 'Q08', 'Q11'], 'content-page': ['Q12']};
const claimById = Object.fromEntries(CLAIMS.map(c => [c.id, c]));
/** 청구가 의미 있는 폭만 잰다(quality-claims.mjs의 targets 폭 합집합). 예: Q11 KPI 한 줄은 콘텐츠 폭 1100px 이상인 1440px에서만 판정한다. */
const claimWidths = c => new Set(c.targets.flatMap(t => t.widths ?? WIDTHS));

/** 히어로 제목과 첫 섹션 제목의 실제 글자 크기(RC02의 브라우저 쪽 값). */
const heroRatio = () => {
  const hero = document.querySelector('main .kit-hero'); if (!hero) return null;
  const h = hero.querySelector('h1,h2'), sec = [...document.querySelectorAll('main .kit-section h2')].find(x => !x.closest('.kit-hero') && x.getBoundingClientRect().width > 0);
  if (!h || !sec) return {heroPx: h ? parseFloat(getComputedStyle(h).fontSize) : null, sectionPx: null, ratio: null};
  const a = parseFloat(getComputedStyle(h).fontSize), b = parseFloat(getComputedStyle(sec).fontSize);
  return {heroPx: a, sectionPx: b, ratio: Math.round(a / b * 100) / 100};
};

const defaultVariant = templateId => ({label: '기본 자동 조립', combo: findCombo(templateId), view: EMPTY_VIEW});
const recipeVariant = pick => ({label: 'Recipe 조립', combo: findCombo(comboId(pick.templateId, pick.layout)), view: pick.view ? {...EMPTY_VIEW, ...pick.view} : EMPTY_VIEW});

const br = await chromium.launch();
async function measure(variant, recipeId, key, vname, withShots = shots) {
  const r = renderCombo(variant.combo, variant.view);
  if (!r.ok) return {error: r.error};
  const out = {comboId: variant.combo.id, view: variant.view, widths: {}};
  for (const w of WIDTHS) {
    const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
    await page.setContent(r.html, {waitUntil: 'load'});
    const m = await page.evaluate(pageMetrics), found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings]
      .filter(f => !(f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at)));
    const codes = {}; for (const f of found) codes[f.code] = (codes[f.code] ?? 0) + 1;
    const rec = {docH: m.docH, scrollW: m.scrollW, h1Visible: m.h1Visible, hero: m.hero ? {variant: m.hero.variant, titlePx: m.hero.titlePx, titleLines: m.hero.titleLines, vhRatio: m.hero.vhRatio, visual: m.hero.visual} : null,
      codes, severe: found.filter(f => SEVERE.has(f.code)).length, grade: grade(codes), findings: found.map(f => ({code: f.code, at: f.at, detail: String(f.detail).slice(0, 140)})), claims: {}};
    if (recipeId === 'saas-landing') rec.heroRatio = await page.evaluate(heroRatio);
    for (const id of CLAIM_IDS[recipeId] ?? []) { const c = claimById[id]; if (!c?.fn || !claimWidths(c).has(w)) continue; const v = await page.evaluate(c.fn); rec.claims[id] = {values: v, pass: c.test(v)}; }
    if (withShots) {
      const file = `${key}__${vname}__w${w}.png`, height = Math.min(m.docH, CAP[w]);
      await page.screenshot({path: resolve(outDir, file), fullPage: true, clip: {x: 0, y: 0, width: w, height}});
      rec.file = file; rec.clipped = m.docH > height;
    }
    out.widths[w] = rec; await ctx.close();
  }
  // 등급은 폭 4개 중 가장 나쁜 것이다(diagnose.mjs는 1440·390만 본다).
  out.grade = 'ABC'[Math.max(...Object.values(out.widths).map(x => 'ABC'.indexOf(x.grade)))];
  out.severeTotal = Object.values(out.widths).reduce((a, x) => a + x.severe, 0);
  return out;
}

mkdirSync(outDir, {recursive: true});
const meta = {date: new Date().toISOString().slice(0, 10), catalogVersion: CATALOG_VERSION, widths: WIDTHS, browser: 'chromium ' + br.version(), platform: process.platform};
if (matrix) {
  const result = {};
  for (const p of recipePicks()) {
    const id = `${p.recipeId}/${p.templateId}`, v = await measure(recipeVariant(p), p.recipeId, id, 'recipe');
    result[id] = {recipeId: p.recipeId, templateId: p.templateId, comboId: v.comboId, view: v.view, layout: p.layout, satisfied: p.satisfied, grade: v.grade, severeTotal: v.severeTotal, bySeverity: Object.fromEntries(WIDTHS.map(w => [w, v.widths[w].severe])), codes: Object.fromEntries(WIDTHS.map(w => [w, v.widths[w].codes]))};
    console.log(id.padEnd(34), v.comboId.padEnd(30), 'grade', v.grade, 'severe', WIDTHS.map(w => v.widths[w].severe).join('/'), JSON.stringify(Object.fromEntries(WIDTHS.map(w => [w, v.widths[w].codes]))));
  }
  writeFileSync(resolve(outDir, 'picks-matrix.json'), JSON.stringify({meta, picks: result}, null, 1));
} else {
  const {cases} = JSON.parse(readFileSync(casesFile, 'utf8'));
  const result = {};
  for (const c of cases.filter(c => !only || only.includes(c.key))) {
    // recipe가 null이면 레시피 대상이 아닌 템플릿(예: waitlist)이다. Recipe 조립 = 기본 조립이고 이전 선택(former)과만 비교한다.
    const pick = c.recipe ? selectRecipe({recipe: c.recipe, templateId: c.templateId}) : {templateId: c.templateId, layout: {}, view: null, applied: [], avoided: [], pageRules: [], satisfied: null};
    // former: 이전 선택(예: V06 이전의 waitlist~hero:product)을 같은 폭에서 함께 재서 바뀐 선택과 나란히 본다.
    const formerV = c.former ? await measure({label: '이전 Recipe 선택', combo: findCombo(c.former), view: EMPTY_VIEW}, c.recipe, c.key, 'former', shots && c.shots !== false) : null;
    const base = await measure(defaultVariant(c.templateId), c.recipe, c.key, 'default', shots && c.shots !== false), rec = await measure(recipeVariant(pick), c.recipe, c.key, 'recipe', shots && c.shots !== false);
    result[c.key] = {recipe: c.recipe, templateId: c.templateId, note: c.note ?? null, pick: {layout: pick.layout, view: pick.view, comboId: rec.comboId, applied: pick.applied.map(a => a.rule), avoided: pick.avoided.map(a => a.rule), pageRules: pick.pageRules, satisfied: pick.satisfied},
      former: formerV ? {...formerV} : undefined,
      identical: base.comboId === rec.comboId && JSON.stringify(base.view) === JSON.stringify(rec.view), default: base, recipe: rec};
    const line = v => `${v.comboId} grade ${v.grade} severe ${WIDTHS.map(w => v.widths[w].severe).join('/')} docH ${WIDTHS.map(w => v.widths[w].docH).join('/')}`;
    console.log(c.key, c.templateId, result[c.key].identical ? '(레시피 = 기본)' : '', '\n  기본  ', line(base), '\n  레시피', line(rec));
  }
  writeFileSync(resolve(outDir, 'measure.json'), JSON.stringify({meta, cases: result}, null, 1));
}
await br.close();
console.log('done →', outDir);
