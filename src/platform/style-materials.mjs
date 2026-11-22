/**
 * 스타일 재료 5종(표면·모션·배경·미디어·상태 패턴)을 레지스트리 위에서 다룬다(계약 0.5.0, 스타일 작업의 요청).
 *
 * 재료 기록은 data/{surfaces,motion,backgrounds,media,states}.mjs가 정의하고 createPlatform이 레지스트리에 등록한다. 이 파일은
 *   checkStyleMaterials(registry)        등록된 재료 전체의 종류별 의미 검사, id·관계·맥락 무결성
 *   rankStyleMaterials(registry, sc, req) 스타일 맥락 하나에 대한 순위(추천과 같은 recommend를 부른다)
 *   assembleStyleMaterials(registry, req) 요구 검사 + 1순위 선택 + 재료 CSS 묶음
 *   styleMaterialScope(...)               페이지 단계가 쓰는 선택 결과의 범위 속성·CSS
 * 를 낸다. 순위·검사의 규칙은 스타일 작업이 정한 것을 그대로 옮겼고 데이터 파일의 같은 이름 함수는 이 구현을 부르는 감싸개다.
 */
import {pageTypeIds} from '../catalog/index.mjs';
import {RADIUS, ELEVATION} from '../styles/base.mjs';
import {STYLE_MATERIAL_KINDS} from './contract.mjs';
import {recommend} from './recommend.mjs';
import {createRelationGraph} from './relations.mjs';
import {validateSurface, surfaceCSS} from './data/surfaces.mjs';
import {validateMotion, motionCSS} from './data/motion.mjs';
import {validateBackground, backgroundCSS} from './data/backgrounds.mjs';
import {validateMedia, mediaCSS} from './data/media.mjs';
import {validateStatePattern, stateCSS, STATE_KINDS} from './data/states.mjs';

export {STATE_KINDS};
/** 종류별 의미 검사. createPlatformRegistry({validators})가 등록할 때 부른다. */
export const STYLE_VALIDATORS = Object.freeze({surface: validateSurface, motion: validateMotion, background: validateBackground, media: validateMedia, 'state-pattern': validateStatePattern});
const SLOTS = [['surface', 'surface'], ['motion', 'motion'], ['background', 'background'], ['media', 'media']];
const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});
const nameOf = m => m.id.slice(m.kind.length + 1);

/** 등록된 스타일 재료 전체의 검사. [{code, path, message}]. 빈 배열이면 통과. */
export function checkStyleMaterials(registry) {
  const out = [];
  for (const kind of STYLE_MATERIAL_KINDS) for (const m of registry.list(kind)) {
    for (const e of STYLE_VALIDATORS[kind](m)) out.push({...e, path: `${m.id}${e.path.slice(1)}`});
    for (const [i, e] of m.relations.entries()) if (!registry.has(e.to)) out.push({code: 'P_EDGE_DANGLING', path: `${m.id}.relations[${i}].to`, message: `없는 대상: ${e.to}`});
    for (const c of m.contexts) if (c !== 'any' && !pageTypeIds.includes(c)) out.push({code: 'P_CONTEXTS', path: `${m.id}.contexts`, message: `모르는 페이지 유형: ${c}`});
  }
  return out;
}

const graphOf = registry => createRelationGraph(registry, {checks: []});

/**
 * 스타일 맥락 하나에 대해 한 종류의 스타일 재료를 순위 매긴다. 결정적이다(동점은 id 순).
 * request: {kind, context?, state?: empty|loading|error|success (state-pattern만), selected?: [id], mode?, density?}
 * 반환: {kind, ranked: [{id, score, reasons}], blocked: [{id, blocked: [{code, reason}]}], reasons: [빈 결과의 이유]}
 * 스타일 맥락이 금지한 축 값을 쓰는 재료는 순위에서 빼고 blocked에 남긴다(다른 값으로 바꾸지 않는다). selected에 페이지 축 값 재료를 주면 축 금지(X01 등)도 걸린다.
 */
export function rankStyleMaterials(registry, styleContext, {kind, context, state, selected = [], mode, density} = {}, {graph = graphOf(registry)} = {}) {
  const sc = typeof styleContext === 'string' ? registry.get(styleContext) : styleContext;
  if (!sc || sc.kind !== 'style-context') throw new RangeError(`unknown style context: ${styleContext}`);
  if (!STYLE_MATERIAL_KINDS.includes(kind)) throw new RangeError(`unknown style material kind: ${kind}`);
  const rec = recommend(registry, graph, {kind, context, mode, density, styleContext: sc.id, selected});
  const byState = x => !state || registry.get(x.id)?.state === state;
  const ranked = rec.ranked.filter(byState), blocked = rec.blocked.filter(b => b.id !== null && byState(b));
  const reasons = [];
  if (!ranked.length) {
    for (const b of blocked) for (const x of b.blocked) reasons.push({code: x.code, id: b.id, reason: x.reason});
    // recommend가 후보가 없는 이유(맥락 필터 뒤에 남은 재료 없음)를 직접 남겼으면 그 문장을 쓴다. 상태 필터로 비었으면 상태를 말한다.
    const none = rec.blocked.find(b => b.id === null)?.blocked[0];
    if (!blocked.length) reasons.push({code: 'P_RECOMMEND_NO_CANDIDATE', id: null, reason: none && !state ? none.reason : `${context ?? '전체'} 맥락${state ? `의 ${state} 상태` : ''}에 등록된 ${kind} 재료가 없습니다`});
  }
  return {kind, ranked, blocked, reasons};
}

/**
 * 스타일 재료 조립. request: {styleContext, context, surface?, motion?, background?, media?, states?: {empty?, loading?, error?, success?}} (값은 재료 id).
 * 요구가 있으면 검사해 그대로 쓰고(없는 id·종류·맥락 불일치·스타일 금지는 거부), 없으면 rankStyleMaterials의 1순위를 쓴다.
 * 반환: {ok, selection, decisions, diagnostics, css}. css는 모션 키프레임 → 표면 → 배경 → 미디어 → 상태 패턴 순서로 한 번씩 붙인다(결정적).
 */
export function assembleStyleMaterials(registry, request) {
  const diagnostics = [], decisions = [], selection = {surface: null, motion: null, background: null, media: null, states: {}};
  const fail = () => ({ok: false, selection, decisions, diagnostics, css: null});
  if (request === null || typeof request !== 'object' || Array.isArray(request)) return {...fail(), diagnostics: [diag('P_REQUEST', '$', '요청은 객체여야 합니다')]};
  const allowed = ['styleContext', 'context', 'surface', 'motion', 'background', 'media', 'states'];
  for (const k of Object.keys(request)) if (!allowed.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.${k}`, `지원하지 않는 키: ${k}. 임의 CSS 경로는 없습니다`, {alternatives: allowed}));
  const sc = typeof request.styleContext === 'string' ? registry.get(request.styleContext) : null;
  if (!sc || sc.kind !== 'style-context') diagnostics.push(diag('P_ATTR_UNKNOWN', '$.styleContext', `등록되지 않은 스타일 맥락: ${request.styleContext}`, {alternatives: registry.list('style-context').map(x => x.id)}));
  if (typeof request.context !== 'string') diagnostics.push(diag('P_REQUEST_CONTEXT', '$.context', 'context(페이지 유형)가 필요합니다'));
  if (diagnostics.length) return fail();
  const states = request.states ?? {};
  for (const k of Object.keys(states)) if (!STATE_KINDS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.states.${k}`, `상태는 ${STATE_KINDS.join('·')}입니다`, {alternatives: STATE_KINDS}));
  if (diagnostics.length) return fail();

  const graph = graphOf(registry);
  const choose = (slot, kind, path, given, state) => {
    if (given !== undefined && given !== null) {
      const m = registry.get(given);
      if (!m) { diagnostics.push(diag('P_ATTR_UNKNOWN', path, `등록되지 않은 재료: ${given}`, {alternatives: registry.list(kind).map(x => x.id)})); return null; }
      if (m.kind !== kind || (state && m.state !== state)) { diagnostics.push(diag('P_ATTR_KIND', path, `${given}는 ${state ? `${state} ` : ''}${kind}가 아니라 ${m.kind}${m.state ? `(${m.state})` : ''}입니다`)); return null; }
      if (!m.contexts.includes('any') && !m.contexts.includes(request.context)) { diagnostics.push(diag('P_ATTR_CONTEXT', path, `${given}는 ${request.context} 맥락용이 아닙니다(${m.contexts.join(', ')})`)); return null; }
      const hit = rankStyleMaterials(registry, sc, {kind, context: request.context, state}, {graph}).blocked.find(b => b.id === given);
      if (hit) { diagnostics.push(diag('P_REL_STYLE_FORBID', path, `${given}: ${hit.blocked.map(x => x.reason).join('; ')}`)); return null; }
      decisions.push({slot, id: given, source: 'request'});
      return given;
    }
    const rec = rankStyleMaterials(registry, sc, {kind, context: request.context, state}, {graph});
    if (!rec.ranked.length) { diagnostics.push(diag('P_SELECT_EMPTY', path, `${kind}${state ? `(${state})` : ''} 후보가 없습니다`, {blocked: rec.blocked, reasons: rec.reasons})); return null; }
    decisions.push({slot, id: rec.ranked[0].id, source: 'recommend', score: rec.ranked[0].score, reasons: rec.ranked[0].reasons});
    return rec.ranked[0].id;
  };
  for (const [slot, kind] of SLOTS) selection[slot] = choose(slot, kind, `$.${slot}`, request[slot]);
  for (const st of STATE_KINDS) selection.states[st] = choose(`state(${st})`, 'state-pattern', `$.states.${st}`, states[st], st);
  if (diagnostics.length) return fail();

  const g = id => registry.get(id);
  const parts = [motionCSS(g(selection.motion)), surfaceCSS(g(selection.surface)), backgroundCSS(g(selection.background)), mediaCSS(g(selection.media))];
  for (const st of STATE_KINDS) parts.push(stateCSS(g(selection.states[st])));
  return {ok: true, selection, decisions, diagnostics, css: parts.join('\n')};
}

// ---------------------------------------------------------------------------------------------------------------------
// 페이지에 입히기: 구형 페이지가 읽는 변수와 요소에 선택한 재료를 연결한다.

/**
 * 표면 재료 → 구형 부품이 읽는 변수. base 단계의 반경·경계·그림자, raised 단계의 hover 그림자.
 * 값은 축 값 표(RADIUS·ELEVATION)에서만 온다. 범위는 `[data-surface="<이름>"]`이다.
 */
export function surfaceScopeCSS(m) {
  const base = m.levels.base, raised = m.levels.raised;
  return `[data-surface="${nameOf(m)}"]{--kit-radius:${RADIUS[base.radius]}px;--kit-card-border:${ELEVATION[base.elevation].border};--kit-shadow:${ELEVATION[base.elevation].shadow};--kit-shadow-hover:${ELEVATION[raised.elevation].hover}}`;
}

/** 선택한 스타일 재료가 페이지에 내는 CSS. 순서는 모션 키프레임 → 표면 범위 → 배경 → 미디어 → 쓰인 상태 패턴(결정적). */
export function styleMaterialsCSS(registry, selection, usedStates = []) {
  const g = id => registry.get(id);
  const parts = [];
  if (selection.motion) parts.push(motionCSS(g(selection.motion)));
  if (selection.surface) parts.push(surfaceScopeCSS(g(selection.surface)));
  if (selection.background) parts.push(backgroundCSS(g(selection.background)));
  if (selection.media) parts.push(mediaCSS(g(selection.media)));
  for (const id of [...new Set(usedStates)].sort()) parts.push(stateCSS(g(id)));
  return parts.join('\n');
}

/** 선택한 재료의 범위 속성. 쇼 셸(.kit-shell)에 단다. 모션·표면·배경·미디어가 각자의 이름으로 범위를 연다. */
export function styleMaterialAttrs(selection) {
  const n = id => id.slice(id.indexOf(':') + 1);
  return [['data-surface', selection.surface], ['data-motion', selection.motion], ['data-bg', selection.background], ['data-media', selection.media]]
    .filter(([, id]) => id).map(([k, id]) => `${k}="${n(id)}"`).join(' ');
}
