import {templates, concepts, recipes, recipeRules, layoutOptionsOf, assessLayout, createBlueprint} from './catalog.mjs';
import {compile, validateBlueprint} from './compiler.mjs';
import {roleSizes} from './typography.mjs';
import {niceMax} from './render/chart.mjs';

/**
 * Design Recipe 선택 경로(docs/recipes.md, ADR 0007). 같은 입력이면 항상 같은 조합과 같은 근거를 돌려준다(난수·시간·브라우저 없음).
 * 레시피는 조합을 지우거나 금지하지 않는다. 여기서 하는 일은 "기본 추천을 어떤 순서로 찾는가"뿐이고, 결과로 나온 선택은
 * 평범한 {템플릿, 구성 변형, 보기 설정}이라 갤러리·조립기에서 다른 조합과 똑같이 열린다.
 */

const walk = (nodes, fn) => { for (const n of nodes ?? []) { fn(n); walk(n.children, fn); } };
const find = (nodes, type) => { const out = []; walk(nodes, n => { if (n.type === type) out.push(n); }); return out; };
const COLS = {two: 2, three: 3, four: 4};
const ruleById = Object.fromEntries(recipeRules.map(r => [r.id, r]));

/** CSS 크기 문자열(`clamp(lo px, slope vw, hi px)` 또는 `N px`)을 뷰포트 폭에서 px로 푼다. */
export function sizeAt(css, width) {
  const fluid = /^clamp\(([\d.]+)px,([\d.]+)vw,([\d.]+)px\)$/.exec(css);
  if (fluid) return Math.min(Number(fluid[3]), Math.max(Number(fluid[1]), Number(fluid[2]) * width / 100));
  const fixed = /^([\d.]+)px$/.exec(css);
  if (fixed) return Number(fixed[1]);
  throw new Error('Unsupported size: ' + css);
}

/** 검사 종류는 이 표 한 곳에 닫혀 있다. (규칙 인자, 맥락) → 위반이면 사유 문자열, 통과면 null. 맥락: {blueprint, recipe}. */
const CHECKS = {
  'hero-visual': ({visuals}, {blueprint}) => {
    const hero = find(blueprint.tree.children, 'hero')[0];
    if (!hero) return '히어로가 없다';
    return visuals.includes(hero.visual) ? null : `히어로 시각 요소가 ${hero.visual ?? '없음'}이다(제품 시각 요소: ${visuals.join('·')})`;
  },
  'title-hierarchy': ({ratio, width}, {blueprint}) => {
    const hero = find(blueprint.tree.children, 'hero')[0];
    if (!hero) return '히어로가 없다';
    const sizes = roleSizes(blueprint), role = hero.variant === 'cover' ? 'poster' : 'display';
    const big = sizeAt(sizes[role].css, width), small = sizeAt(sizes.heading.css, width), got = big / small;
    return got >= ratio ? null : `히어로 제목 ${Math.round(big)}px 대 섹션 제목 ${Math.round(small)}px = ${got.toFixed(2)}배(< ${ratio}배, ${width}px 기준)`;
  },
  'axis-fit': (_, {blueprint, recipe}) => {
    const bad = Object.entries(recipe.fit).filter(([axis, allowed]) => !allowed.includes(blueprint[axis])).map(([axis]) => `${axis}=${blueprint[axis]}`);
    return bad.length ? `레시피 범위 밖의 축 값: ${bad.join(', ')}` : null;
  },
  'kpi-one-row': ({maxItems}, {blueprint}) => {
    const bad = find(blueprint.tree.children, 'grid').find(g => g.children.length >= 2 && g.children.length <= maxItems && g.children.every(c => c.type === 'metric') && COLS[g.columns] < g.children.length);
    return bad ? `지표 ${bad.children.length}개가 ${COLS[bad.columns]}열이라 두 줄로 꺾인다` : null;
  },
  'chart-fill': ({min, soloWidths}, {blueprint}) => {
    const charts = find(blueprint.tree.children, 'chart').filter(c => c.kind !== 'donut');
    const low = charts.map(c => { const hi = Math.max(...c.series.flatMap(s => s.values), 0); return {c, fill: hi / niceMax(hi)}; }).find(x => x.fill < min);
    if (low) return `차트 "${low.c.title}"의 데이터 최댓값이 축 최댓값의 ${Math.round(low.fill * 100)}%다(< ${Math.round(min * 100)}%)`;
    // 페이지 바로 아래의 단독 차트는 넓은 폭 전체로 늘어난다(preserveAspectRatio none). 브라우저 측정 Q08이 hr-people 2.13배, dashboard-analytics 2.46배로 확인했다.
    const solo = soloWidths.includes(blueprint.width) ? blueprint.tree.children.find(n => n.type === 'chart' && n.kind !== 'donut') : null;
    return solo ? `차트 "${solo.title}"이 ${blueprint.width} 폭에서 페이지 바로 아래에 혼자 놓여 가로로 늘어난다` : null;
  },
  'left-axis': (_, {blueprint}) => {
    const top = blueprint.tree.children, bad = top.filter(n => ['page-header', 'section'].includes(n.type) && n.align === 'center');
    return bad.length ? `가운데 정렬 ${bad.map(n => n.type).join('·')}이 있다(정렬선이 둘로 갈린다)` : null;
  },
};
export const recipeCheckKinds = Object.freeze(Object.keys(CHECKS));

/** 페이지 규칙 결정 중 레시피가 "남아 있으면 안 되는 결함"으로 읽는 것. P02(시각 요소 없는 히어로 보정)는 보정이 필요했다는 사실 자체가 위반이다. */
const PAGE_RULE_RESIDUE = {P01: d => d.code === 'PAGE_DUP_VISUAL', P02: () => true};

const lookOf = ({concept, look}) => {
  const l = concepts[concept]?.looks.find(x => x.id === look);
  if (!l) throw new Error('Unknown look: ' + concept + '/' + look);
  return l;
};
const lookLabel = look => look ? `${look.concept}/${look.look}` : '템플릿 기본';
const layoutLabel = layout => Object.entries(layout).map(([s, o]) => `${s}:${o}`).join(' ') || '기본 구성';

/** 레시피 한 건이 템플릿에 대해 후보(구성 변형 선택, 컨셉 look)를 적용한 Blueprint. 갤러리의 comboBlueprint와 같은 호출이다. */
export function recipeBlueprint(templateId, layout = {}, look = null) {
  const l = look ? lookOf(look) : null;
  return createBlueprint(templateId, l?.theme, undefined, {themeVariant: l?.themeVariant, layout, typography: l?.typography});
}

/** 후보 하나를 레시피의 규칙에 대조한다: {failures:[{rule,detail}], passes:[rule], pageRules:[id]}. */
function evaluate(recipe, templateId, layout, look) {
  const t = templates[templateId], blueprint = recipeBlueprint(templateId, layout, look);
  const failures = [], passes = [];
  const fail = (rule, detail) => failures.push({rule, detail});
  // 구성 변형 결과 계약 V01~V05: 레시피가 고르는 조합은 기본 추천(recommended)이어야 한다. 규칙 목록에 없는 V도 어기면 탈락이다.
  for (const f of assessLayout(t.tree, layout, t.pageType, {templateId}).findings) fail(f.rule, `${f.slot}:${f.option} — ${f.detail}`);
  const checked = validateBlueprint(blueprint);
  if (!checked.valid) fail('R01', '검증 실패: ' + checked.errors.slice(0, 2).map(e => e.message ?? e.code).join(' / '));
  const pageRules = [];
  if (checked.valid) {
    const decisions = compile(blueprint).manifest.design?.page?.decisions ?? [];
    pageRules.push(...new Set(decisions.map(d => d.rule)));
    for (const id of recipe.rules.filter(r => PAGE_RULE_RESIDUE[r])) {
      const hit = decisions.find(d => d.rule === id && PAGE_RULE_RESIDUE[id](d));
      if (hit) fail(id, hit.reason ?? hit.code);
    }
  }
  const exempted = [];
  for (const id of recipe.rules.filter(r => ruleById[r]?.mode === 'select')) {
    const reason = recipe.exempt[templateId]?.[id];
    if (reason) { exempted.push({rule: id, reason}); continue; }
    const rule = ruleById[id], {kind, ...params} = rule.check, detail = CHECKS[kind](params, {blueprint, recipe});
    if (detail) fail(id, detail);
  }
  const failed = new Set(failures.map(f => f.rule));
  for (const id of recipe.rules) if (!failed.has(id) && !exempted.some(x => x.rule === id)) passes.push(id);
  return {blueprint, failures, passes, pageRules, exempted};
}

/** 임의의 조합({구성 변형, look})이 레시피 규칙을 지키는지: 갤러리·시험이 "왜 이 조합은 레시피 추천이 아닌가"를 설명하는 데 쓴다. 조합을 막지 않는다. */
export function evaluateRecipe(recipeId, templateId, layout = {}, look = null) {
  const recipe = recipes[recipeId];
  if (!recipe) throw new Error('Unknown recipe: ' + recipeId);
  const {failures, passes, pageRules, exempted} = evaluate(recipe, templateId, layout, look);
  return {failures, passes, pageRules, exempted};
}

/** select 규칙 하나를 Blueprint에 대조한다(위반 사유 또는 null). 축 값을 직접 바꿔 본 시험과 "피할 조합" 근거 확인용. */
export function recipeCheck(recipeId, ruleId, blueprint) {
  const recipe = recipes[recipeId], rule = ruleById[ruleId];
  if (!recipe || rule?.mode !== 'select') throw new Error('Not a select rule: ' + ruleId);
  const {kind, ...params} = rule.check;
  return CHECKS[kind](params, {blueprint, recipe});
}

/** 템플릿에서 레시피가 시도하는 후보를 선호 순서로 만든다: 템플릿 기본 look이 먼저, 레시피 look이 그 뒤. 구성 변형은 슬롯 선언 순서의 곱, 'default'가 먼저. */
function candidatesOf(recipe, templateId) {
  const slots = layoutOptionsOf(templateId), have = new Map(slots.map(s => [s.id, new Set(s.options.map(o => o.id))]));
  let layouts = [{}];
  for (const [slot, order] of Object.entries(recipe.layout)) {
    const options = order.filter(o => o === 'default' || have.get(slot)?.has(o));
    layouts = layouts.flatMap(l => options.map(o => o === 'default' ? l : {...l, [slot]: o}));
  }
  return [null, ...recipe.looks].flatMap(look => layouts.map(layout => ({layout, look})));
}

const cache = new Map();
/**
 * 입력 {recipe, templateId?}에 대한 권장 조합. templateId가 없으면 레시피의 권장 템플릿 순서대로 규칙을 모두 지키는 첫 템플릿을 고른다.
 * 어떤 후보도 모든 규칙을 지키지 못하면 실패한 규칙이 가장 적은 후보(같으면 선호 순서가 앞선 것)를 돌려주고 `unmet`에 이유를 남긴다.
 *
 * 결과: {recipeId, templateId, layout, view, satisfied, applied, avoided, unmet, exempted, measured, pageRules, trace}
 *  - satisfied: 적용 대상 선택 규칙에 실패가 없다는 뜻이다.
 *  - exempted: 이 템플릿에서 사유와 함께 면제한 select 규칙 [{rule, reason}](데이터의 `exempt`).
 *  - view: null(템플릿 기본 테마) 또는 {concept, look}. 갤러리·조립기의 보기 설정에 그대로 넣는다.
 *  - applied: 선택이 지킨 규칙 [{rule, claim}], avoided: 피한 규칙 [{rule, what, why}], measured: 브라우저 측정이 판정하는 규칙 ID.
 *  - pageRules: 선택 결과에 페이지 규칙(P01~P04)이 낸 결정 ID. 레시피가 해소하지 못하고 보고만 하는 것(P04)도 여기 나온다.
 *  - trace: 선택에 이르기까지 탈락한 후보와 실패 규칙(시도 순서).
 */
export function selectRecipe({recipe: recipeId, templateId = null} = {}) {
  const recipe = recipes[recipeId];
  if (!recipe) throw new Error('Unknown recipe: ' + recipeId);
  if (templateId && !recipe.templates.includes(templateId)) throw new Error(`Template ${templateId} is not covered by recipe ${recipeId}`);
  const key = recipeId + '|' + (templateId ?? '');
  if (cache.has(key)) return cache.get(key);
  const ids = templateId ? [templateId] : recipe.templates;
  let best = null;
  for (const id of ids) {
    const tried = [];
    for (const c of candidatesOf(recipe, id)) {
      const r = evaluate(recipe, id, c.layout, c.look);
      if (!r.failures.length) { best = {id, c, r, tried, satisfied: true}; break; }
      tried.push({layout: c.layout, look: c.look, failed: r.failures.map(f => f.rule), failures: r.failures});
      if (!best || (!best.satisfied && id === best.id && r.failures.length < best.r.failures.length)) best = {id, c, r, tried, satisfied: false};
    }
    if (best?.satisfied || templateId) break;
    // 템플릿을 정하지 않았는데 모든 후보가 실패하면 다음 권장 템플릿을 본다. 끝까지 없으면 마지막 후보 중 가장 덜 나쁜 것.
  }
  const {id, c, r, tried} = best;
  const avoided = [];
  const t = templates[id], have = new Map(layoutOptionsOf(id).map(s => [s.id, new Set(s.options.map(o => o.id))]));
  const defaults = recipeBlueprint(id, {}, null);
  for (const a of recipe.avoid) {
    // 선택한 옵션 자체는 피한 것이 아니다(같은 옵션이 수치 없는 템플릿에서는 선택되고 수치 있는 템플릿에서는 V06으로 걸러진다).
    const present = a.slot ? have.get(a.slot)?.has(a.option) && c.layout[a.slot] !== a.option : defaults[a.axis] === a.value;
    const what = a.slot ? `${a.slot}:${a.option}` : `${a.axis}=${a.value}`;
    if (present) avoided.push({rule: a.rule, what, why: a.why});
  }
  for (const f of tried.flatMap(x => x.failures)) if (!avoided.some(a => a.rule === f.rule)) avoided.push({rule: f.rule, what: '탈락 후보', why: f.detail});
  const out = {
    recipeId, templateId: id, layout: c.layout, view: c.look ? {concept: c.look.concept, look: c.look.look} : null,
    satisfied: best.satisfied,
    applied: r.passes.filter(p => !(ruleById[p]?.mode === 'measure')).map(p => ({rule: p, claim: ruleById[p]?.claim ?? null})),
    avoided, unmet: r.failures, exempted: r.exempted,
    measured: recipe.rules.filter(p => ruleById[p]?.mode === 'measure'),
    pageRules: r.pageRules,
    trace: tried.map(x => ({layout: layoutLabel(x.layout), look: lookLabel(x.look), failed: x.failed})),
  };
  cache.set(key, out);
  return out;
}

/** 템플릿을 다루는 레시피 id. 어떤 레시피에도 없으면 null(기본 추천 경로가 레시피 없이 그대로 동작한다). */
export const recipeOfTemplate = templateId => Object.keys(recipes).find(id => recipes[id].templates.includes(templateId)) ?? null;

/** 레시피가 다루는 템플릿마다 하나씩: 갤러리·조립기가 "레시피 추천"으로 표시하는 선택 목록. */
export function recipePicks() {
  return Object.entries(recipes).flatMap(([recipeId, recipe]) => recipe.templates.map(templateId => selectRecipe({recipe: recipeId, templateId})));
}

/** 템플릿 하나의 레시피 추천(없으면 null). */
export const recipePickOf = templateId => { const r = recipeOfTemplate(templateId); return r ? selectRecipe({recipe: r, templateId}) : null; };
