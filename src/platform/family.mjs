/**
 * 기반 컴포넌트와 디자인 패밀리(ADR 0012 §4).
 *
 * - 기반 컴포넌트(base-component): 동작·구조·접근성·상태·금지 조합을 가진 기존 구현(src/materials/*.mjs의 defineContract 계약 + render + styles).
 *   패밀리는 이것을 고치지 않고 재사용한다.
 * - 패밀리(family): 여러 기반 컴포넌트에 같은 시각 언어를 입히는 묶음. 구성원마다 고정 축(preset)과 호출자에게 여는 축(open)을 정하고,
 *   모양(shape: radius·elevation·motion)은 기존 축 값 표(src/styles/base.mjs)에서 읽는다. 색과 서체는 소유하지 않는다(서브토큰 세트·타이포 시스템 몫).
 */
import {RADIUS, ELEVATION, MOTION} from '../styles/base.mjs';
import {violations, colorOf} from '../materials/control-kit.mjs';
import {colorContrast} from '../color-tokens.mjs';
import {defineCheck} from './relations.mjs';
import {VISUAL_LANGUAGES} from './families/visual.mjs';
import {baseIdOf} from './data/base-components.mjs';

/** 열린 축 값의 모든 조합을 preset과 합쳐 계약 금지 조합을 센다. 기본값은 계약 defaults. */
export function memberCombinations(contract, member) {
  const open = member.open ?? [], base = {...contract.defaults, ...member.preset};
  let legal = 0, total = 0;
  const walk = (i, props) => {
    if (i === open.length) { total++; if (!violations(contract, props).length) legal++; return; }
    for (const v of contract.axes[open[i]]) walk(i + 1, {...props, [open[i]]: v});
  };
  walk(0, base);
  return {legal, total};
}

/** 구성원 한 명의 계약 적합성. [{code, message}] */
export function memberErrors(contract, member) {
  const out = [];
  for (const [a, v] of Object.entries(member.preset ?? {})) {
    if (!Object.hasOwn(contract.axes, a)) out.push({code: 'P_FAMILY_AXIS', message: `${contract.id}에 없는 축: ${a}`});
    else if (!contract.axes[a].includes(v)) out.push({code: 'P_FAMILY_VALUE', message: `${contract.id}.${a}=${v}는 계약 값이 아닙니다`});
  }
  for (const a of member.open ?? []) {
    if (!Object.hasOwn(contract.axes, a)) out.push({code: 'P_FAMILY_AXIS', message: `${contract.id}에 없는 열린 축: ${a}`});
    if (Object.hasOwn(member.preset ?? {}, a)) out.push({code: 'P_FAMILY_OPEN', message: `${a}는 고정 축이면서 열린 축일 수 없습니다`});
  }
  if (!out.length) {
    const hit = violations(contract, {...contract.defaults, ...member.preset});
    if (hit.length) out.push({code: 'P_FAMILY_PRESET', message: `고정 값이 계약 금지 조합에 걸립니다: ${hit.map(r => r.id).join(', ')}`});
    else if (memberCombinations(contract, member).legal === 0) out.push({code: 'P_FAMILY_EMPTY', message: '열린 축에 허용 조합이 없습니다'});
  }
  return out;
}

/** 계산 관계: 패밀리가 이 기반 컴포넌트를 구성원으로 갖고, 고정·열린 축이 계약 안에 있는가. family·base-component는 닫힌 쌍이라 이 검사가 호환 근거다. */
export const familyMemberCheck = defineCheck({
  id: 'family-member', kinds: ['family', 'base-component'], reason: '패밀리 구성원이고 고정·열린 축이 기반 계약의 허용 조합 안에 있다',
  run(family, base, ctx, registry) {
    const member = family.members[base.id];
    if (!member) return {ok: false, reason: `${family.id}는 ${base.id}를 구성원으로 갖지 않습니다`};
    const impl = registry.kind('base-component').implementation(base.id);
    if (!impl) return {ok: false, reason: `${base.id} 구현이 없습니다`};
    const errs = memberErrors(impl.contract, member);
    return errs.length ? {ok: false, reason: errs.map(e => e.message).join('; ')} : {ok: true, detail: memberCombinations(impl.contract, member)};
  },
});

/**
 * 계산 관계: 구성원 기반 컴포넌트가 다른 기반 컴포넌트에 의존하면(Card의 footer actions → Button) 패밀리가 그 컴포넌트도 구성원으로 갖는다.
 * 의존 목록은 기반 컴포넌트 기록의 dependencies(기존 재료 id)다. 패밀리가 구성원이 아니면 family-member가 보고하므로 여기서는 통과시킨다.
 */
export const familyRequiresCheck = defineCheck({
  id: 'family-requires', kinds: ['family', 'base-component'], reason: '기반 컴포넌트가 의존하는 컴포넌트를 패밀리가 모두 구성원으로 갖는다',
  run(family, base, ctx, registry) {
    if (!family.members[base.id]) return {ok: true};
    const missing = base.dependencies.map(baseIdOf).filter(id => registry.has(id) && !family.members[id]);
    return missing.length ? {ok: false, reason: `${base.id}는 ${missing.join(', ')}에 의존하는데 ${family.id}에 구성원이 없습니다`} : {ok: true, detail: {requires: base.dependencies.map(baseIdOf)}};
  },
});

/** 컴포넌트 패밀리 작업이 소유하는 계산 관계 목록. */
export const FAMILY_CHECKS = Object.freeze([familyMemberCheck, familyRequiresCheck]);

/**
 * 컨트롤 CSS가 읽지만 색 역할 목록(COLOR_ROLES)에 없는 변수를 역할에서 파생한다. 값은 CSS 식이라 모드(light·dark)와 팔레트를 따라간다.
 * 호버·눌림은 글자색 반대쪽(text)으로 섞는다: 액션 위 글자(onAction)와의 대비가 올라가는 방향이다.
 * 같은 식의 hex 값은 deriveControlColors가 계산해 contrastPairs가 검사한다.
 */
export const CONTROL_ALIAS_VARS = Object.freeze({
  '--kit-control-bg': 'var(--kit-surface)', '--kit-control-fg': 'var(--kit-text)', '--kit-control-border': 'var(--kit-rule)',
  '--kit-control-hover-border': 'var(--kit-muted)', '--kit-control-active-border': 'var(--kit-action)', '--kit-control-error': 'var(--kit-danger)',
  '--kit-action-hover': 'color-mix(in srgb,var(--kit-action) 88%,var(--kit-text))', '--kit-action-active': 'color-mix(in srgb,var(--kit-action) 76%,var(--kit-text))', '--kit-onActionHover': 'var(--kit-onAction)',
});

/** 패밀리 범위 변수 = 모양(기존 축 값 표) + 컨트롤 파생 색 + 시각 언어 변수(--pf-*). 모두 [data-family] 범위에만 놓인다. */
export function familyShapeVars(family) {
  const {radius, elevation, motion = 'subtle'} = family.shape;
  return {'--kit-radius': `${RADIUS[radius]}px`, '--kit-shadow': ELEVATION[elevation].shadow, '--kit-shadow-hover': ELEVATION[elevation].hover, '--kit-dur': MOTION[motion].dur, '--kit-lift': MOTION[motion].lift, ...CONTROL_ALIAS_VARS, ...(VISUAL_LANGUAGES[family.id]?.vars ?? {})};
}

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, pct, b) => '#' + hexRgb(a).map((v, i) => Math.round(v * pct / 100 + hexRgb(b)[i] * (100 - pct) / 100).toString(16).padStart(2, '0')).join('').toUpperCase();
/** CONTROL_ALIAS_VARS의 hex 값(역할 색 → 파생 색). 대비 검사용. */
export function deriveControlColors(colorVars) {
  const g = n => colorVars[n];
  if (!g('--kit-surface') || !g('--kit-action') || !g('--kit-text')) return {};
  return {
    '--kit-control-bg': g('--kit-surface'), '--kit-control-fg': g('--kit-text'), '--kit-control-border': g('--kit-rule'), '--kit-control-hover-border': g('--kit-muted'),
    '--kit-control-active-border': g('--kit-action'), '--kit-control-error': g('--kit-danger'),
    '--kit-action-hover': mixHex(g('--kit-action'), 88, g('--kit-text')), '--kit-action-active': mixHex(g('--kit-action'), 76, g('--kit-text')), '--kit-onActionHover': g('--kit-onAction'),
  };
}

/**
 * 구성원 축 값 확정(렌더하지 않는다). request.props의 개별 값을 검사하고(고정 축 → P_ATTR_LOCKED, 계약 밖 축 → P_ATTR_AXIS, 값 → P_ATTR_VALUE),
 * 고정 축과 합친 결과가 계약 금지 조합이면 P_REL_CONTRACT로 거부한다. 반환: {ok, props(고정+호출자), full(계약 기본값 포함), errors, impl}
 */
export function resolveMember(registry, family, baseId, {props = {}} = {}) {
  const member = family.members[baseId], impl = registry.kind('base-component').implementation(baseId);
  if (!member || !impl) return {ok: false, props: null, full: null, impl: null, errors: [{code: 'P_ATTR_MEMBER', message: `${family.id}에 ${baseId} 구성원이 없습니다`}]};
  const errors = [];
  for (const [a, v] of Object.entries(props)) {
    if (Object.hasOwn(member.preset ?? {}, a)) errors.push({code: 'P_ATTR_LOCKED', message: `${a}는 ${family.id}가 ${member.preset[a]}로 고정합니다`});
    else if (!(member.open ?? []).includes(a)) errors.push({code: 'P_ATTR_AXIS', message: `${a}는 ${family.id}의 ${baseId} 구성원이 여는 축이 아닙니다(열린 축: ${(member.open ?? []).join(', ') || '없음'})`});
    else if (!impl.contract.axes[a].includes(v)) errors.push({code: 'P_ATTR_VALUE', message: `${a}=${v}는 ${impl.contract.id} 값이 아닙니다`});
  }
  if (errors.length) return {ok: false, props: null, full: null, impl, errors};
  const merged = {...member.preset, ...props}, full = {...impl.contract.defaults, ...merged};
  const hit = violations(impl.contract, full);
  if (hit.length) return {ok: false, props: null, full: null, impl, errors: hit.map(r => ({code: 'P_REL_CONTRACT', message: `${r.id}: ${r.why}`}))};
  return {ok: true, props: merged, full, impl, errors: []};
}

/**
 * 구성원 렌더. request: {props?: {열린 축: 값}, content: {입력 필드}}.
 * 고정 축을 호출자가 바꾸려 하면 P_ATTR_LOCKED, 계약 밖 축이면 P_ATTR_AXIS로 거부한다(개별 속성 유효성).
 * 반환: {ok, html, props, errors}
 */
export function renderMember(registry, family, baseId, {props = {}, content = {}} = {}) {
  const r = resolveMember(registry, family, baseId, {props});
  const errors = [...r.errors];
  if (r.impl) for (const k of Object.keys(content)) if (Object.hasOwn(r.impl.contract.axes, k)) errors.push({code: 'P_ATTR_AXIS', message: `축 ${k}는 content가 아니라 props로 줍니다`});
  if (errors.length) return {ok: false, html: null, props: null, errors};
  try { return {ok: true, html: r.impl.render({...content, ...r.props}), props: r.props, errors: []}; }
  catch (e) { return {ok: false, html: null, props: null, errors: [{code: 'P_RENDER', message: e.message}]}; }
}

/** 기반 계약의 대비 쌍(contract.pairs: [전경 변수, 배경 변수, 최소, 쓰임])을 결합된 색 값으로 검사한다. */
export function contrastPairs(contract, colorVars) {
  const all = {...colorVars, ...deriveControlColors(colorVars)};
  const tokens = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.replace(/^--kit-/, ''), v]));
  // colorOf는 `--kit-name`과 `mix(--kit-a N%, --kit-b)`(CSS color-mix in srgb와 같은 식)를 풀고, 값이 없으면 던진다.
  const hex = ref => { try { return colorOf(tokens, ref); } catch { return null; } };
  return (contract.pairs ?? []).map(([fg, bg, minimum, use]) => {
    const a = hex(fg), b = hex(bg);
    const ratio = a && b ? Math.floor(colorContrast(a, b) * 1e4) / 1e4 : null;
    return {fg, bg, minimum, use, ratio, ok: ratio !== null && ratio >= minimum};
  });
}

/** CSS가 기본값 없이 읽는 변수 목록(var(--x) — var(--x, 기본) 제외). 출력 :root가 이것을 모두 덮는지 검사하는 데 쓴다. */
export const requiredVars = css => [...new Set([...css.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map(m => m[1]))].sort();
