/**
 * 페이지 단위 조립 파이프라인(ADR 0012 §6 확장, 계약 0.2.0). `assemblePage(request, env)`는 요청 하나에 복수 후보를 낸다.
 *
 *   1 normalizePage       목적·콘텐츠 요청 모양 검사(닫힌 키)                  → intent                       P_REQUEST*·P_PAGE_PURPOSE
 *   2 planPage            패턴·슬롯·페이지 축 결정, 콘텐츠·컴포넌트 배치         → plan                         P_PAGE_*·P_ATTR_*
 *   3 exploreCandidates   팔레트·세트·타이포·패밀리 조합 탐색(추천 순위의 빔)    → combos, blocked              P_SELECT_EMPTY
 *   4 evaluateCandidates  관계·계산 관계(축 금지 X01 등 포함) 평가              → 통과 조합, 막힌 조합          P_REL_*·P_CHECK_*
 *   5 assembleCandidates  코드 조립: 구형 노드 렌더러 + 플랫폼 토큰·패밀리      → 후보별 css·html
 *   6 verifyCandidates    검증: 대비·변수 누락·서체 한도·페이지 검증기          → 후보별 quality
 *   7 compareCandidates   순위·추천 이유·후보 간 차이                          → candidates[], comparison
 *
 * 같은 입력은 같은 결과다(시간·난수 없음, 정렬은 점수 내림차순 후 id 순). AI가 HTML·CSS를 만들지 않는다: 출력은 등록 재료의 구현과 구형 렌더러에서만 나온다.
 * 구형 렌더러(src/render, src/styles)는 읽기만 하고 고치지 않는다. 플랫폼 색은 구형 CSS가 읽는 변수 이름(--kit-*)으로 같은 자리에 들어간다.
 */
import {validateBlueprint} from '../validate.mjs';
import {renderTree, formRuntime, controlRuntime, escapeHTML} from '../render.mjs';
import {planComposition, auditPage} from '../composition.mjs';
import {stylesheet} from '../styles.mjs';
import {mix} from '../tokens.mjs';
import {colorRamp, readableColor, colorContrast} from '../color-tokens.mjs';
import {axes} from '../catalog/axes.mjs';
import {navLimits} from '../catalog/axes.mjs';
import {PLATFORM_CONTRACT_VERSION} from './contract.mjs';
import {recommend, axisPreference} from './recommend.mjs';
import {bindColor} from './color.mjs';
import {bindType} from './type.mjs';
import {familyShapeVars, renderMember, contrastPairs, requiredVars} from './family.mjs';
import {attr, diag, typeErrorCode} from './pipeline.mjs';
import {typeFit} from './type.mjs';
import {axisIds, materialAxisIds} from './axes.mjs';
import {normalizePageRequest, planPage, pageAxisIds, nodeTypeOfBase, PAGE_CATALOG_VERSION} from './page-content.mjs';
import {STATE_KINDS} from './style-materials.mjs';
import {getPurposeFamily, renderPurposeFamily, checkPurposeCombination, VISUAL_LANGUAGES} from './families/index.mjs';
import {renderPlatformBlueprint, platformManifest, evaluateMaterials, legacyTokens, walk, styleMaterialIds} from './render.mjs';
export {legacyTokens, styleMaterialIds};
import {PLATFORM_CATALOG_VERSION} from '../catalog/expression.mjs';
import {renderState} from './data/states.mjs';
import {themes} from '../catalog/themes.mjs';
import {AXIS_PREFERENCE_WEIGHT} from './recommend.mjs';

export const PAGE_STAGES = Object.freeze(['normalizePage', 'planPage', 'exploreCandidates', 'evaluateCandidates', 'assembleCandidates', 'verifyCandidates', 'compareCandidates']);
/** 종류별로 조합에 넣는 후보 수(추천 순위 앞쪽). 조합 수는 이 값들의 곱을 넘지 않는다. */
export const BEAM = Object.freeze({palette: 4, subtokenSet: 3, typeSystem: 3, family: 2});
/** 조립을 시도하는 조합 수의 상한(요청 후보 수의 배수). 막힌 조합은 이유와 함께 blocked에 남는다. */
const ATTEMPT_FACTOR = 4;
/** 이미 고른 후보와 같은 재료(팔레트·세트·타이포·패밀리 묶음) 하나마다 점수에서 깎는 값. 1순위는 항상 최고 점수다. */
export const DIVERSITY_PENALTY = 8;

const key = x => JSON.stringify(x);
const uniq = xs => [...new Map(xs.map(x => [key(x), x])).values()];
/** 코어는 Node 내장을 읽지 않는다(tests/core-boundary.test.mjs). 짧은 결정적 문자열 해시(cyrb53, 14자리 16진수): 후보 id와 출력 지문에 쓴다. */
function hash(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
const failed = diagnostics => diagnostics.some(d => d.severity === 'error');
const COUNT_CODE = c => c.code;

// ---------------------------------------------------------------------------------------------------------------------
// 스타일 재료 선택(표면·모션·배경·미디어·상태 패턴): 한 요청에 하나씩, 상태 화면은 자리마다 하나씩

/** 상태 화면이 놓이는 자리의 배치 요건: 표·목록·차트 자리는 block·inline, 페이지 머리 아래 안내는 banner·toast·block. */
export const STATE_LAYOUTS = Object.freeze({region: ['block', 'inline'], status: ['banner', 'toast', 'block']});
const STYLE_KINDS = [['surface', 'surface'], ['motion', 'motion'], ['background', 'background'], ['media', 'media']];

/**
 * selectStyleMaterials(plan, intent, env) → {selection: {surface, motion, background, media, states: [{index, kind, usage, id}]}, decisions, blocked, diagnostics}
 * 요구한 재료는 검사해 그대로 쓴다(없는 id·종류·맥락·스타일 금지는 거부). 요구가 없으면 추천 순위(스타일 맥락의 축 선호와 금지 포함)에서 고르되,
 * 순위 안에서 페이지의 축(요청 > 스타일 맥락 > 테마 기본값)과 재료가 구현하는 축이 같을수록 앞에 둔다. 페이지 축 값과 금지 관계인 재료는 순위에서 빠진다.
 */
export function selectStyleMaterials(plan, intent, env) {
  const diagnostics = [], decisions = [], blocked = [];
  const selection = {surface: null, motion: null, background: null, media: null, states: []};
  const ctx = {context: plan.context, mode: plan.axes.mode, density: plan.axes.density};
  const anchors = [...(intent.styleContext ? [intent.styleContext] : []), ...pageAxisIds(plan)];
  const target = {...themes[plan.theme].defaults, ...plan.axes};
  const match = m => Object.entries(m.axes).filter(([a, v]) => target[a] === v).map(([a, v]) => ({from: plan.theme, to: m.id, type: 'page-axis', priority: AXIS_PREFERENCE_WEIGHT * (a === 'backdrop' ? 2 : 1), reason: `페이지의 ${a}=${v}와 같은 값을 구현한다`}));
  const pick = (slot, kind, path, given, {state = null, layouts = null} = {}) => {
    if (given) {
      const d = attr(env, given, kind, path, plan.context);
      if (d) { diagnostics.push(d); return null; }
      const m = env.registry.get(given);
      if (state && m.state !== state) { diagnostics.push(diag('P_ATTR_KIND', path, `${given}는 ${state} 상태 패턴이 아니라 ${m.state}입니다`)); return null; }
      if (layouts && !layouts.includes(m.layout)) { diagnostics.push(diag('P_PAGE_STATE_LAYOUT', path, `${given}의 배치(${m.layout})는 이 자리에 맞지 않습니다(맞는 배치: ${layouts.join('·')})`, {alternatives: layouts})); return null; }
      const s = env.graph.score(given, anchors, ctx);
      if (s.blocked.length) { blocked.push({kind, id: given, blocked: s.blocked, source: 'intent'}); diagnostics.push(diag(s.blocked[0].code, path, `${given}: ${s.blocked.map(x => x.reason).join('; ')}`)); return null; }
      if (intent.styleContext) { const rec = recommend(env.registry, env.graph, {kind, ...ctx, styleContext: intent.styleContext, selected: pageAxisIds(plan)}); const hit = rec.blocked.find(b => b.id === given); if (hit) { diagnostics.push(diag(hit.blocked[0].code, path, `${given}: ${hit.blocked.map(x => x.reason).join('; ')}`)); return null; } }
      decisions.push({slot, id: given, source: 'intent', score: 0, reasons: []});
      return given;
    }
    const rec = recommend(env.registry, env.graph, {kind, ...ctx, styleContext: intent.styleContext, selected: pageAxisIds(plan)});
    for (const b of rec.blocked) if (b.id !== null && (!state || env.registry.get(b.id).state === state)) blocked.push({kind, id: b.id, blocked: b.blocked, source: 'recommend'});
    const pool = rec.ranked.filter(r => (!state || env.registry.get(r.id).state === state) && (!layouts || layouts.includes(env.registry.get(r.id).layout)))
      .map(r => { const extra = match(env.registry.get(r.id)); return {...r, score: r.score + extra.reduce((n, x) => n + x.priority, 0), reasons: [...r.reasons, ...extra]}; })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (!pool.length) { diagnostics.push(diag('P_SELECT_EMPTY', path, `${plan.context} 맥락의 ${kind}${state ? `(${state}${layouts ? `, 배치 ${layouts.join('·')}` : ''})` : ''} 후보가 없습니다`, {blocked: rec.blocked})); return null; }
    decisions.push({slot, id: pool[0].id, source: 'recommend', score: pool[0].score, reasons: pool[0].reasons});
    return pool[0].id;
  };
  for (const [slot, kind] of STYLE_KINDS) selection[slot] = pick(`style.${slot}`, kind, `$.${slot}`, intent[slot]);
  for (const st of plan.states) {
    const id = pick(`style.state(${st.index}:${st.kind})`, 'state-pattern', `$.states.${st.kind}`, intent.states[st.kind], {state: st.kind, layouts: STATE_LAYOUTS[st.usage]});
    selection.states.push({index: st.index, kind: st.kind, usage: st.usage, id});
  }
  return {selection, decisions, blocked: uniq(blocked), diagnostics: uniq(diagnostics)};
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. 탐색

/** 요구한 재료는 검사해 그대로 쓰고(다른 값으로 바꾸지 않는다), 없으면 추천 순위의 앞쪽을 쓴다. */
function listKind(env, intent, plan, {slot, kind, requested, selected, limit, blocked, diagnostics, viable = null, attrErrors = []}) {
  const ctx = {context: plan.context, mode: plan.axes.mode, density: plan.axes.density, styleContext: intent.styleContext};
  if (requested) {
    const d = attr(env, requested, kind, `$.${slot}`, plan.context);
    if (d) { diagnostics.push(d); attrErrors.push(d); return []; }
    const s = env.graph.score(requested, [...selected, ...(intent.styleContext ? [intent.styleContext] : [])], ctx);
    if (s.blocked.length) { blocked.push({kind, id: requested, blocked: s.blocked, source: 'intent'}); return []; }
    return [{id: requested, score: s.score, reasons: s.reasons, source: 'intent'}];
  }
  const rec = recommend(env.registry, env.graph, {kind, ...ctx, selected, fit: true});
  for (const b of rec.blocked) blocked.push({kind, id: b.id, blocked: b.blocked, source: 'recommend'});
  // 재료 하나만으로 알 수 있는 막힘(서체 짝 × 역할 체계의 한글 한도, 어느 세트와도 대비를 못 맞추는 팔레트)은 빔을 자르기 전에 걸러 낸다.
  const ranked = viable ? rec.ranked.filter(r => { const why = viable(r.id); if (why) blocked.push({kind, id: r.id, blocked: why, source: 'recommend'}); return !why; }) : rec.ranked;
  if (!ranked.length) diagnostics.push(diag('P_SELECT_EMPTY', `$.${slot}`, `${plan.context} 맥락의 ${kind} 후보가 없습니다`, {blocked: rec.blocked}));
  return ranked.slice(0, limit).map(r => ({...r, source: 'recommend'}));
}

/** 요청한 목적 패밀리 id(중복 없음, 정렬). */
const purposeIds = plan => [...new Set(plan.components.filter(c => c.purpose).map(c => c.purpose))].sort();

/** 이 페이지가 쓰는 기반 컴포넌트. 자동 승격 후보는 맥락에 패밀리가 있을 때만 쓴다(없으면 구형 노드). */
function basesOf(plan, env) {
  const hasFamily = base => env.registry.kind('family').filter({context: plan.context}).some(f => f.members[base]);
  const requested = plan.components.filter(c => !c.auto && !c.purpose).map(c => c.base);
  const auto = plan.components.filter(c => c.auto).map(c => c.base).filter(hasFamily);
  return [...new Set([...requested, ...auto])].sort();
}

/** 조합 후보. 순서는 결정적이다(종류별 추천 순위 × 빔). */
export function exploreCandidates(plan, intent, env) {
  const diagnostics = [], blocked = [], combos = [], attrErrors = [];
  const axisAnchors = pageAxisIds(plan);
  const bases = basesOf(plan, env);
  const sets = env.registry.kind('subtoken-set').filter({context: plan.context});
  const palettes = listKind(env, intent, plan, {slot: 'palette', kind: 'palette', requested: intent.palette, selected: axisAnchors, limit: BEAM.palette, blocked, diagnostics, attrErrors, viable: id => {
    const reasons = sets.map(set => env.graph.runChecks(id, set.id, {mode: plan.axes.mode}).find(r => !r.ok));
    return reasons.length && reasons.every(Boolean) ? [{code: 'P_CHECK_PALETTE_SUBTOKEN', with: sets.map(x => x.id).join(', '), reason: `어느 서브토큰 세트와도 결합하지 못한다: ${reasons[0].reason}`}] : null;
  }});
  for (const palette of palettes) {
    const setPicks = listKind(env, intent, plan, {slot: 'subtokenSet', kind: 'subtoken-set', requested: intent.subtokenSet, selected: [palette.id, ...axisAnchors], limit: BEAM.subtokenSet, blocked, diagnostics: [], attrErrors});
    for (const set of setPicks) {
      const types = listKind(env, intent, plan, {slot: 'typeSystem', kind: 'type-system', requested: intent.typeSystem, selected: [palette.id, set.id, ...axisAnchors], limit: BEAM.typeSystem, blocked, diagnostics: [], attrErrors, viable: id => {
        const errors = bindType(env.registry.get(id)).errors ?? [];
        return errors.length ? errors.map(e => ({code: typeErrorCode(e.code), with: id, reason: e.message})) : null;
      }});
      for (const type of types) {
        let famOptions = [{}];
        // 시각 패밀리를 고르는 자리: 기반 컴포넌트마다 하나, 목적 패밀리(purpose:*)마다 하나. 목적 패밀리는 자기 기반 컴포넌트를 모두 가진 시각 패밀리만 받고, 요청한 변형·열린 축·콘텐츠로 렌더 검사를 통과해야 한다.
        const slots = [...bases.map(base => ({key: base, bases: [base], purpose: null})), ...purposeIds(plan).map(id => ({key: id, bases: getPurposeFamily(id).bases, purpose: getPurposeFamily(id)}))];
        for (const slot of slots) {
          const comps = plan.components.filter(c => (slot.purpose ? c.purpose === slot.key : c.base === slot.key && !c.purpose));
          const given = comps.find(c => c.family)?.family ?? intent.families.find(f => slot.bases.every(b => env.registry.get(f)?.members?.[b]) && (!slot.purpose || VISUAL_LANGUAGES[f]));
          const anchors = [set.id, type.id, ...slot.bases, palette.id, ...axisAnchors];
          const fits = fam => slot.bases.every(b => fam.members[b]) && (!slot.purpose || (VISUAL_LANGUAGES[fam.id] && comps.every(c => checkPurposeCombination(slot.purpose, {visual: fam.id, variant: c.variant, props: c.props, content: c.content}).ok)));
          const why = fam => (slot.purpose ? comps.flatMap(c => checkPurposeCombination(slot.purpose, {visual: fam.id, variant: c.variant, props: c.props, content: c.content}).errors) : []);
          const options = given
            ? listKind(env, intent, plan, {slot: `family(${slot.key})`, kind: 'family', requested: given, selected: anchors, limit: 1, blocked, diagnostics: [], attrErrors})
            : (() => {
              const ctx = {context: plan.context, mode: plan.axes.mode, density: plan.axes.density, styleContext: intent.styleContext};
              const rec = recommend(env.registry, env.graph, {kind: 'family', ...ctx, selected: anchors});
              for (const b of rec.blocked) if (slot.bases.every(x => env.registry.get(b.id).members[x])) blocked.push({kind: 'family', id: b.id, blocked: b.blocked, base: slot.key, source: 'recommend'});
              for (const r of rec.ranked) { const fam = env.registry.get(r.id); if (slot.bases.every(x => fam.members[x]) && !fits(fam)) blocked.push({kind: 'family', id: r.id, blocked: why(fam).map(e => ({code: e.code, with: slot.key, reason: e.message})), base: slot.key, source: 'recommend'}); }
              return rec.ranked.filter(r => fits(env.registry.get(r.id))).slice(0, BEAM.family).map(r => ({...r, source: 'recommend'}));
            })();
          if (!options.length) { diagnostics.push(diag('P_SELECT_EMPTY', `$.components`, `${slot.key}를 구성원으로 가진 패밀리 후보가 없습니다(맥락 ${plan.context})`, {blocked: blocked.filter(b => b.base === slot.key)})); famOptions = []; break; }
          famOptions = famOptions.flatMap(o => options.map(f => ({...o, [slot.key]: f})));
        }
        for (const fam of famOptions) combos.push({palette, subtokenSet: set, typeSystem: type, families: fam});
      }
    }
  }
  return {combos, blocked: uniqBlocked(blocked), diagnostics: uniq(attrErrors.length ? attrErrors : diagnostics)};
}
const uniqBlocked = list => uniq(list).sort((a, b) => a.kind.localeCompare(b.kind) || String(a.id).localeCompare(String(b.id)) || key(a.blocked).localeCompare(key(b.blocked)));

// ---------------------------------------------------------------------------------------------------------------------
// 4. 평가

/** 점수 순으로 하나씩 고르되, 이미 고른 후보와 같은 재료를 많이 공유하면 감점한다(결정적: 동점이면 앞선 쪽). */
export function diversify(passing) {
  const out = [], rest = [...passing];
  const shared = (a, b) => ['palette', 'subtokenSet', 'typeSystem'].filter(k => a.selection[k] === b.selection[k]).length + (key(a.selection.families) === key(b.selection.families) ? 1 : 0);
  while (rest.length) {
    let best = 0, bestAdj = -Infinity;
    rest.forEach((c, i) => { const adj = c.score - DIVERSITY_PENALTY * Math.max(0, ...out.map(o => shared(c, o))); if (adj > bestAdj) { bestAdj = adj; best = i; } });
    const [c] = rest.splice(best, 1);
    out.push({...c, adjusted: c.score - DIVERSITY_PENALTY * Math.max(0, ...out.map(o => shared(c, o)))});
  }
  return out;
}

const selectionOf = (combo, intent) => ({styleContext: intent.styleContext, palette: combo.palette.id, subtokenSet: combo.subtokenSet.id, typeSystem: combo.typeSystem.id, families: Object.fromEntries(Object.entries(combo.families).map(([b, f]) => [b, f.id]))});

/** 조합 전체의 관계 평가. 축 값(페이지 축·패밀리 모양·서체 짝)도 같이 평가되어 X01 등이 forbids로 걸린다. */
export function evaluateCombo(plan, intent, env, combo) {
  const sel = selectionOf(combo, intent), reg = env.registry;
  const ctx = {context: plan.context, mode: plan.axes.mode, density: plan.axes.density};
  const relations = evaluateMaterials(env, {context: plan.context, axes: plan.axes, selection: sel, styleIds: styleMaterialIds(plan.style)});
  const sc = sel.styleContext ? reg.get(sel.styleContext) : null;
  let score = 0;
  for (const e of relations.applied) score += e.type === 'prefers' ? e.priority : e.type === 'avoids' ? -e.priority : 0;
  for (const f of Object.values(sel.families)) for (const b of sc ? axisPreference(reg.get(f), sc) : []) score += b.priority;
  score += typeFit(sel.typeSystem, ctx).score;
  return {selection: sel, relations, score};
}

/** 후보별 추천 이유: 고른 재료마다 다른 재료·요구와의 관계. */
function decisionsOf(plan, intent, env, combo, sel) {
  const reg = env.registry, ctx = {context: plan.context, mode: plan.axes.mode, density: plan.axes.density};
  const anchors = [sel.styleContext, ...pageAxisIds(plan)].filter(Boolean);
  const picks = [['palette', combo.palette], ['subtokenSet', combo.subtokenSet], ['typeSystem', combo.typeSystem], ...Object.entries(combo.families).map(([b, f]) => [`family(${b})`, f])];
  const ids = picks.map(([, p]) => p.id);
  return picks.map(([slot, p]) => {
    const others = [...ids.filter(x => x !== p.id), ...anchors];
    const s = env.graph.score(p.id, others, ctx);
    const reasons = [...s.reasons];
    if (reg.get(p.id).kind === 'type-system') reasons.push(...typeFit(p.id, ctx).reasons);
    const sc = sel.styleContext ? reg.get(sel.styleContext) : null;
    if (sc && reg.get(p.id).kind === 'family') reasons.push(...axisPreference(reg.get(p.id), sc));
    return {slot, id: p.id, source: p.source, score: reasons.reduce((n, r) => n + r.priority, 0), reasons};
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. 조립

/** 계획의 노드 트리에서 컴포넌트 마커를 후보의 노드로 바꾼다. 요청 컴포넌트는 패밀리 구성원 검사를 거친다(renderMember). */
function instantiate(plan, intent, env, combo, diagnostics) {
  const sel = selectionOf(combo, intent), reg = env.registry, resolved = new Map();
  const tagOrder = [];
  const purposes = [];
  plan.components.forEach((c, i) => {
    if (c.purpose) {
      // 목적 패밀리: 시각 패밀리(후보가 고른다)로 렌더해 보고(검사), 트리에는 표지 노드를 둔다. 렌더는 컴파일과 조립이 같은 함수로 한다(render.mjs).
      const visual = sel.families[c.purpose];
      const r = renderPurposeFamily(env, c.purpose, {visual, variant: c.variant, props: c.props, content: c.content ?? {}, id: c.id});
      if (!r.ok) { for (const e of r.errors) diagnostics.push(diag(e.code, `$.components[${c.requestIndex}]`, e.message)); resolved.set(i, null); return; }
      purposes.push({id: c.purpose, visual, ...(c.variant ? {variant: c.variant} : {}), ...(c.props ? {props: c.props} : {}), ...(c.id ? {uid: c.id} : {}), content: structuredClone(c.content ?? {})});
      resolved.set(i, {type: 'metric', label: `platform-purpose-${purposes.length - 1}`, value: '0'});
      return;
    }
    const familyId = sel.families[c.base];
    if (!familyId) { resolved.set(i, c.legacy ? clone(c.legacy) : null); return; }
    const family = reg.get(familyId), member = family.members[c.base];
    const r = renderMember(reg, family, c.base, {props: c.props ?? {}, content: c.content ?? {}});
    if (!r.ok) { for (const e of r.errors) diagnostics.push(diag(e.code, c.auto ? `$.content` : `$.components[${c.requestIndex}]`, e.message)); resolved.set(i, null); return; }
    resolved.set(i, {type: nodeTypeOfBase(c.base), ...member.preset, ...r.props, ...c.content, __family: familyId});
  });
  if (failed(diagnostics)) return {children: [], tagOrder: [], purposes: []};
  const build = nodes => nodes.map(n => {
    if (n.$component !== undefined) return clone(resolved.get(n.$component));
    if (Array.isArray(n.children)) return {...n, children: build(n.children)};
    return n;
  });
  const children = plan.slots.flatMap(s => build(s.nodes));
  walk(children, n => { if (n.__family) { tagOrder.push(n.__family); } });
  walk(children, n => { delete n.__family; });
  return {children, tagOrder, purposes};
}
const clone = x => structuredClone(x);

/** 조립 결과를 Blueprint 2.7.0의 materials로 옮긴다(id만). 상태 화면 표지의 번호가 states의 위치다. */
function materialsOf(plan, sel, purposes) {
  const m = {palette: sel.palette, subtokenSet: sel.subtokenSet, typeSystem: sel.typeSystem};
  if (sel.styleContext) m.styleContext = sel.styleContext;
  const baseFamilies = Object.fromEntries(Object.entries(sel.families).filter(([k]) => k.startsWith('base-component:')));
  if (Object.keys(baseFamilies).length) m.families = baseFamilies;
  if (purposes.length) m.purposes = purposes;
  for (const k of ['surface', 'motion', 'background', 'media']) if (plan.style[k]) m[k] = plan.style[k];
  if (plan.states.length) m.states = plan.states.map(st => ({id: plan.style.states.find(x => x.index === st.index).id, ...structuredClone(st.input)}));
  return m;
}

function blueprintFor(plan, intent, env, sel, children, purposes) {
  const b = clone(plan.blueprint);
  b.catalogVersion = PLATFORM_CATALOG_VERSION;
  b.mode = plan.axes.mode;
  for (const a of ['shell', 'width', 'density', 'scale', 'backdrop', 'ornament', 'footer', 'icon', 'weight', 'control']) b[a] = plan.axes[a];
  const face = /^type-preset:(.+)$/.exec(env.registry.get(sel.typeSystem).facePairing)?.[1];
  if (face && axes.typography.includes(face)) b.typography = face;
  if (intent.content.name !== undefined) b.name = intent.content.name;
  if (intent.content.nav !== undefined) b.chrome = {...b.chrome, nav: clone(intent.content.nav)};
  b.tree = {type: 'page', children};
  if (intent.content.nav === undefined) fitNav(b, plan.navLimit);
  b.materials = materialsOf(plan, sel, purposes);
  return b;
}

/**
 * 템플릿 뼈대의 내비는 뼈대 구역의 앵커를 가리킨다. 콘텐츠가 구역을 바꿨으면 없는 앵커를 가리키는 항목이 생기므로,
 * 최상위 구역(제목이 있는 것)에서 내비를 다시 만든다. 요청한 nav는 건드리지 않는다.
 */
function fitNav(b, navLimit) {
  // 셸이 정해진 뒤 내비가 그 셸에서 쓸 수 있는 모양인지: 그룹 라벨은 세로 목록(sidebar·split)에서만, 항목 수는 셸 상한 안에서만 읽힌다(R12).
  if (b.chrome?.nav && !['sidebar', 'split'].includes(b.shell) && b.chrome.nav.some(a => a.group)) b.chrome = {...b.chrome, nav: b.chrome.nav.map(({group, ...a}) => a)};
  const cap = Math.min(navLimits[b.shell] ?? 6, navLimit ?? Infinity);
  if (b.chrome?.nav?.length > cap) b.chrome = {...b.chrome, nav: b.chrome.nav.slice(0, cap)};
  const anchors = new Set(), tops = b.tree.children.filter(n => n.type === 'section' && n.title);
  walk(b.tree.children, n => { if (n.type === 'section' && n.anchor) anchors.add(n.anchor); });
  const nav = b.chrome?.nav ?? [];
  const dangling = nav.some(a => typeof a.href === 'string' && a.href.startsWith('#') && a.href !== '#main' && !anchors.has(a.href.slice(1)));
  if (!dangling) return;
  const limit = Math.min(navLimits[b.shell] ?? 6, navLimit ?? Infinity);
  tops.slice(0, limit).forEach((n, i) => { n.anchor = n.anchor ?? `sec-${i + 1}`; });
  const items = tops.slice(0, limit).map(n => ({label: n.title.slice(0, 20), href: `#${n.anchor}`}));
  b.chrome = {...b.chrome, nav: items.length ? items : [{label: '개요', href: '#main'}]};
  if (b.chrome.footerLinks) b.chrome.footerLinks = b.footer === 'columns' ? [{label: '맨 위로', href: '#main'}] : undefined;
  if (!b.chrome.footerLinks) delete b.chrome.footerLinks;
}

/** 후보 하나의 코드 조립과 검증. 반환: {ok, value, blueprint, quality, diagnostics}. value.blueprint가 Blueprint 2.7.0이고 컴파일하면 같은 html·css·tokens가 나온다. */
export function assembleCombo(plan, intent, env, combo, evaluated) {
  const diagnostics = [], sel = evaluated.selection, reg = env.registry;
  const {children, purposes} = instantiate(plan, intent, env, combo, diagnostics);
  if (failed(diagnostics)) return {ok: false, value: null, diagnostics, quality: null};
  const b = blueprintFor(plan, intent, env, sel, children, purposes);
  const r = renderPlatformBlueprint(b, env, {evaluated: evaluated.relations});
  diagnostics.push(...r.diagnostics);
  if (!r.parts) return {ok: false, value: null, diagnostics, quality: r.quality};
  const base = platformManifest(b, {...r, reuses: [...r.reuses, `template:${plan.template}`, `theme:${plan.theme}`]});
  const manifest = {
    ...base, platformContract: PLATFORM_CONTRACT_VERSION,
    request: {purpose: plan.purpose, pattern: plan.pattern, mode: plan.axes.mode},
    page: {pattern: plan.pattern, template: plan.template, pageType: plan.pageType, axes: plan.axes, axisSources: plan.axisSources, slots: plan.slots.map(s => ({id: s.id, source: s.source, nodes: s.nodes.length}))},
    relations: {applied: evaluated.relations.applied, checks: evaluated.relations.checks},
  };
  return {ok: r.ok && !failed(diagnostics), colorVars: r.colorVars, blueprint: b, value: {...r.parts, manifest, blueprint: b}, quality: r.quality, diagnostics};
}

// ---------------------------------------------------------------------------------------------------------------------
// 7. 비교

const AXES_OF = c => ({palette: c.selection.palette, subtokenSet: c.selection.subtokenSet, typeSystem: c.selection.typeSystem, families: c.selection.families});
const differs = (a, b) => ['palette', 'subtokenSet', 'typeSystem', 'families'].filter(k => key(AXES_OF(a)[k]) !== key(AXES_OF(b)[k]));

/** 후보 간 비교: 1순위와 각 후보의 차이(바뀐 재료 종류, 점수 차이, 1순위가 앞서는 근거). */
export function compareCandidates(candidates) {
  const top = candidates[0];
  const rows = candidates.map(c => ({rank: c.rank, id: c.id, selection: AXES_OF(c), score: c.score}));
  const against = candidates.slice(1).map(c => {
    const d = differs(top, c);
    const reasonsOf = x => x.decisions.flatMap(dd => dd.reasons.map(r => ({id: dd.id, priority: r.priority, reason: r.reason})));
    const gain = reasonsOf(top).filter(r => !reasonsOf(c).some(o => o.reason === r.reason)).sort((a, b) => b.priority - a.priority || a.reason.localeCompare(b.reason)).slice(0, 3);
    return {rank: c.rank, id: c.id, differs: d, scoreDelta: top.score - c.score, topAdvantages: gain,
      summary: `${d.join('·') || '없음'}이(가) 다르다. 1순위 ${top.score}점, 이 후보 ${c.score}점${gain.length ? `. 1순위만 가진 근거: ${gain.map(g => g.reason).join(' / ')}` : ' (관계 근거 없이 점수가 같다)'}${c.adjustedScore < c.score ? `. 1순위와 같은 재료를 공유해 순위 계산에서 ${c.score - c.adjustedScore}점 깎였다` : ''}`};
  });
  return {axes: ['palette', 'subtokenSet', 'typeSystem', 'families'], rows, against, distinctColorSets: new Set(candidates.map(c => c.fingerprint.color)).size, distinctFacePairs: new Set(candidates.map(c => c.fingerprint.face)).size};
}

/** 출력의 지문: 색 토큰 집합(팔레트 × 세트 × 모드가 낸 색 변수만), 서체 짝(제목·본문 스택), 전체 출력. 후보가 실제로 다른지와 기준선의 고유 수를 센다. */
const fingerprintOf = (value, colorVars) => {
  const decl = name => [...value.css.matchAll(new RegExp(`--kit-${name}:([^;}]+)`, 'g'))].at(-1)?.[1] ?? null;
  return {color: hash(key(Object.fromEntries(Object.entries(colorVars).sort(([a], [b]) => a.localeCompare(b))))), face: hash(key([decl('heading'), decl('font')])), output: hash(value.css + value.html)};
};

// ---------------------------------------------------------------------------------------------------------------------
// 전체

const stageFail = (stage, diagnostics, extra = {}) => ({ok: false, stage, value: null, selected: null, candidates: [], blocked: [], comparison: null, plan: null, diagnostics, decisions: [], ...extra});

/**
 * assemblePage(request, env) → {ok, stage, value, selected, candidates, blocked, comparison, plan, diagnostics, decisions}
 *   candidates[]  {id, rank, score, selection, decisions: [{slot, id, source, score, reasons}], relations, quality, value, reasons, fingerprint}
 *   blocked[]     {kind, id, blocked: [{code, reason, with}]} 단일 재료가 막힌 경우 또는 {combination, blocked} 조합이 막힌 경우
 *   value         selected(1순위) 후보의 {css, html, script, standalone, tokens, manifest}
 * 실패하면 stage가 마지막으로 돈 단계이고 diagnostics에 이유가 있다. 후보가 하나도 없으면 blocked에 모든 후보의 이유가 남는다.
 */
export function assemblePage(request, env) {
  const norm = normalizePageRequest(request);
  if (failed(norm.diagnostics)) return stageFail(PAGE_STAGES[0], norm.diagnostics);
  const intent = norm.intent;

  // 요구한 재료 id의 개별 속성 유효성: 등록됐는가, 종류가 맞는가(맥락은 패턴이 정해진 뒤 본다)
  const attrDiag = [];
  if (intent.styleContext) { const d = attr(env, intent.styleContext, 'style-context', '$.styleContext', null); if (d) attrDiag.push(d); }
  intent.families.forEach((f, i) => { const d = attr(env, f, 'family', `$.families[${i}]`, null); if (d) attrDiag.push(d); });
  if (attrDiag.length) return stageFail(PAGE_STAGES[1], attrDiag);

  const planned = planPage(intent, env);
  if (!planned.plan) return stageFail(PAGE_STAGES[1], planned.diagnostics, {decisions: planned.decisions});
  const plan = planned.plan;
  const ctxDiag = [];
  if (intent.styleContext) { const d = attr(env, intent.styleContext, 'style-context', '$.styleContext', plan.context); if (d) ctxDiag.push(d); }
  intent.families.forEach((f, i) => { const d = attr(env, f, 'family', `$.families[${i}]`, plan.context); if (d) ctxDiag.push(d); });
  if (ctxDiag.length) return stageFail(PAGE_STAGES[1], ctxDiag, {plan: summarizePlan(plan), decisions: planned.decisions});

  // 스타일 재료(표면·모션·배경·미디어·상태 패턴) 선택. 모든 후보가 같은 선택을 쓴다(후보는 색·서체·패밀리가 갈린다).
  const style = selectStyleMaterials(plan, intent, env);
  if (style.diagnostics.length) return stageFail(PAGE_STAGES[2], style.diagnostics, {plan: summarizePlan(plan), blocked: style.blocked, decisions: planned.decisions});
  plan.style = style.selection;
  planned.decisions.push(...style.decisions);

  const ex = exploreCandidates(plan, intent, env);
  if (!ex.combos.length) return stageFail(PAGE_STAGES[2], ex.diagnostics.length ? ex.diagnostics : [diag('P_SELECT_EMPTY', '$', '조합 후보가 없습니다')], {plan: summarizePlan(plan), blocked: ex.blocked, decisions: planned.decisions});

  const evaluated = ex.combos.map(combo => ({combo, ...evaluateCombo(plan, intent, env, combo)}));
  const blocked = [...ex.blocked, ...style.blocked];
  for (const e of evaluated.filter(x => !x.relations.ok)) blocked.push({combination: e.selection, blocked: e.relations.violations.map(v => ({code: v.code, reason: v.reason, with: v.to === v.from ? v.from : `${v.from} × ${v.to}`}))});
  const passing = diversify(evaluated.filter(x => x.relations.ok).sort((a, b) => b.score - a.score || key(a.selection).localeCompare(key(b.selection))));
  if (!passing.length) {
    const first = evaluated[0].relations.violations;
    return stageFail(PAGE_STAGES[3], first.map(v => diag(v.code, '$selection', `${v.from} × ${v.to}: ${v.reason}`)), {plan: summarizePlan(plan), blocked, decisions: planned.decisions});
  }

  const candidates = [], seen = new Set(), limit = intent.candidates;
  for (const e of passing) {
    if (candidates.length >= limit) break;
    if (blocked.filter(b => b.combination).length > 64) break;
    const r = assembleCombo(plan, intent, env, e.combo, e);
    if (!r.ok) { blocked.push({combination: e.selection, blocked: r.diagnostics.map(d => ({code: d.code, reason: d.message, with: d.path})), stage: r.quality?.page?.valid === false ? PAGE_STAGES[5] : PAGE_STAGES[4]}); continue; }
    const fingerprint = fingerprintOf(r.value, r.colorVars);
    if (seen.has(fingerprint.output)) { blocked.push({combination: e.selection, blocked: [{code: 'P_CANDIDATE_DUPLICATE', reason: '같은 출력을 내는 다른 후보가 이미 있다', with: '$candidates'}]}); continue; }
    seen.add(fingerprint.output);
    const decisions = decisionsOf(plan, intent, env, e.combo, e.selection);
    candidates.push({id: `candidate:${hash(key(e.selection))}`, rank: candidates.length + 1, score: e.score, adjustedScore: e.adjusted, selection: e.selection, decisions, relations: {ok: true, violations: [], applied: e.relations.applied, checks: e.relations.checks}, quality: r.quality, value: r.value, warnings: r.diagnostics.filter(d => d.severity !== 'error'), fingerprint,
      reasons: [...new Set(decisions.flatMap(d => d.reasons.map(x => x.reason)))]});
  }
  if (!candidates.length) {
    const why = blocked.filter(b => b.combination).slice(0, 12).flatMap(b => b.blocked.map(x => diag(x.code, x.with ?? '$', x.reason)));
    return stageFail(PAGE_STAGES[4], why.length ? why : [diag('P_SELECT_EMPTY', '$', '조립 가능한 후보가 없습니다')], {plan: summarizePlan(plan), blocked, decisions: planned.decisions});
  }
  const comparison = compareCandidates(candidates);
  const selected = candidates[0];
  const decisions = [...planned.decisions, ...selected.decisions];
  return {ok: true, stage: PAGE_STAGES.at(-1), value: selected.value, selected: selected.id, candidates, blocked: uniq(blocked), comparison, plan: summarizePlan(plan), diagnostics: selected.warnings, decisions};
}

/** 계획의 직렬화 가능한 요약(노드 트리는 싣지 않는다). */
export function summarizePlan(plan) {
  return {purpose: plan.purpose, pattern: plan.pattern, template: plan.template, pageType: plan.pageType, context: plan.context, theme: plan.theme, axes: plan.axes, axisSources: plan.axisSources,
    slots: plan.slots.map(s => ({id: s.id, source: s.source, nodes: s.nodes.map(n => n.type ?? 'component'), reasons: s.reasons})), layout: plan.layout, style: plan.style ?? null, states: plan.states.map(({index, kind, usage, path}) => ({index, kind, usage, path})),
    components: plan.components.map(c => ({base: c.base, auto: c.auto, ...(c.purpose ? {purpose: c.purpose} : {}), ...(c.requestIndex !== undefined ? {requestIndex: c.requestIndex} : {})}))};
}
void COUNT_CODE;
void mix;
