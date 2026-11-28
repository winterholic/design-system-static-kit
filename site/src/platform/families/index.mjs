/**
 * 목적 패밀리 진입점(컴포넌트 패밀리 작업 소유). 조립 엔진(W5)의 페이지 단계가 슬롯에 놓을 때 읽는 시그니처가 여기 있다.
 *
 *   PURPOSE_FAMILY_IDS                         패밀리 id 목록(고정). `purpose:<group>.<name>`
 *   PURPOSE_FAMILIES / getPurposeFamily(id)    정의(목적·맥락, 진입점, 변형·기본값, 금지 조합, 상태, 반응형, 접근성, 토큰, 부모·자식, 예시, 검증)
 *   renderPurposeFamily(env, id, request)      → {ok, html, errors, resolved, bases}
 *       env      createPlatform() 결과({registry, graph})
 *       request  {visual: 'family:quiet'|…, variant?: {축: 값}, props?: {열린 기반 축: 값}, content: {필드}, id?: 'kebab-id'}
 *   assembleFamilies(env, request)             → {ok, value: {css, html, tokens, manifest} | null, diagnostics}
 *       request  {context, mode?, density?, styleContext?, palette?, subtokenSet?, typeSystem?, items: [{purpose, visual, variant?, props?, content, id?}]}
 *       색·서체 토큰은 플랫폼 파이프라인(assemblePlatform)이 정한 값을 그대로 쓰고, 이 함수는 패밀리 범위 변수와 CSS, 대비·변수 누락 검사를 더한다.
 *   combinationMatrix(env)                     목적 패밀리 × 시각 패밀리의 허용·거부(이유 포함) 표
 */
import {assemblePlatform, requiredVars} from '../index.mjs';
import {renderMember, resolveMember, familyShapeVars, contrastPairs} from '../family.mjs';
import {escapeHTML} from '../../escape-html.mjs';
import {VISUAL_LANGUAGES} from './visual.mjs';
import {axisIds} from '../axes.mjs';
import {checkPurposeCombination, validatePurposeFamily, ICON_CSS} from './kit.mjs';
import {CARD_FAMILIES} from './card.mjs';
import {BUTTON_FAMILIES} from './button.mjs';
import {NAVIGATION_FAMILIES} from './navigation.mjs';
import {FORM_FAMILIES} from './form.mjs';
import {TABLE_FAMILIES} from './table.mjs';
import {FEEDBACK_FAMILIES} from './feedback.mjs';
import {INFO_MEDIA_FAMILIES, INFO_FAMILIES, MEDIA_FAMILIES} from './info-media.mjs';
import {EHI_FAMILIES} from './ehi.mjs';

export {VISUAL_LANGUAGES, VISUAL_KEYS, visualMismatch} from './visual.mjs';
export {PURPOSE_GROUPS, definePurposeFamily, validatePurposeFamily, checkPurposeCombination, PURPOSE_FIELDS} from './kit.mjs';
export {COMPONENT_LAYERS, COMPONENT_CONTRACT_FIELDS, COMPONENT_CONTRACTS, ALL_COMPONENT_CONTRACTS, defineComponentContract, validateComponentContracts, countDistinctComponentTypes, ACTION_COMPONENTS, ACTION_COMPONENT_BY_ID, renderActionComponent, ACTION_COMPONENT_CSS, COMMERCE_SPECS, COMMERCE_COMPONENTS, COMMERCE_COMPONENT_BY_ID, renderCommerceComponent, COMMERCE_COMPONENT_CSS, COMMERCE_COMPONENT_RUNTIME, COMMERCE_CONTRACTS} from './contracts.mjs';
export {INFO_MEDIA_FAMILIES, INFO_FAMILIES, MEDIA_FAMILIES} from './info-media.mjs';

/** 목적 패밀리 id(고정 계약). 새 id를 더하는 것은 호환이지만 이름을 바꾸거나 지우는 것은 호환이 아니다. */
export const PURPOSE_FAMILY_IDS = Object.freeze([
  'purpose:card.kpi', 'purpose:card.product', 'purpose:card.article', 'purpose:card.feature', 'purpose:card.profile', 'purpose:card.pricing', 'purpose:card.status', 'purpose:card.gallery',
  'purpose:button.primary', 'purpose:button.secondary', 'purpose:button.emphasis', 'purpose:button.destructive', 'purpose:button.icon', 'purpose:button.loading', 'purpose:button.toggle', 'purpose:button.split', 'purpose:button.menu', 'purpose:button.fab', 'purpose:button.copy', 'purpose:button.close',
  'purpose:navigation.sidebar', 'purpose:navigation.topbar', 'purpose:navigation.tabs', 'purpose:navigation.bottom',
  'purpose:form.search', 'purpose:form.auth', 'purpose:form.settings', 'purpose:form.filter', 'purpose:form.group',
  'purpose:table.business', 'purpose:table.analytic', 'purpose:table.dense',
  'purpose:feedback.confirm', 'purpose:feedback.error', 'purpose:feedback.warning', 'purpose:feedback.progress', 'purpose:feedback.result',
  'purpose:info.status-badge', 'purpose:info.avatar', 'purpose:info.avatar-group', 'purpose:info.accordion', 'purpose:info.collapsible',
  'purpose:info.counter', 'purpose:info.notification-indicator', 'purpose:info.keyboard-shortcut', 'purpose:info.metadata-row', 'purpose:info.stat-comparison',
  'purpose:media.responsive-image', 'purpose:media.carousel', 'purpose:media.audio-player', 'purpose:media.file-preview', 'purpose:media.image-comparison', 'purpose:media.figure-caption',
  'purpose:navigation.collapsible-sidebar', 'purpose:navigation.drawer', 'purpose:navigation.command-menu', 'purpose:navigation.context-menu',
  'purpose:overlay.drawer', 'purpose:overlay.popover', 'purpose:overlay.dropdown-menu', 'purpose:overlay.contextual-help',
  'purpose:feedback.callout', 'purpose:feedback.circular-progress', 'purpose:feedback.loading-overlay', 'purpose:feedback.status-indicator',
]);

export const PURPOSE_FAMILIES = Object.freeze([...CARD_FAMILIES, ...BUTTON_FAMILIES, ...NAVIGATION_FAMILIES, ...FORM_FAMILIES, ...TABLE_FAMILIES, ...FEEDBACK_FAMILIES, ...INFO_MEDIA_FAMILIES, ...EHI_FAMILIES]);
const BY_ID = new Map(PURPOSE_FAMILIES.map(f => [f.id, f]));
export const getPurposeFamily = id => BY_ID.get(id) ?? null;
export const listPurposeFamilies = group => PURPOSE_FAMILIES.filter(f => !group || f.group === group);

/** 정의 전체 검사. 기반 컴포넌트 id는 레지스트리에서 읽는다. [{id, errors}] 중 오류가 있는 것만. */
export function validatePurposeFamilies(env) {
  const baseIds = env.registry.list('base-component').map(b => b.id), seen = new Set(), out = [];
  for (const f of PURPOSE_FAMILIES) {
    const errors = validatePurposeFamily(f, {baseIds});
    if (seen.has(f.id)) errors.push({code: 'P_DUPLICATE', path: '$.id', message: `중복 id: ${f.id}`});
    seen.add(f.id);
    if (errors.length) out.push({id: f.id, errors});
  }
  return out;
}

export class PurposeRenderError extends Error {
  constructor(errors) { super(errors.map(x => x.message).join('; ')); this.name = 'PurposeRenderError'; this.errors = errors; }
}

const SAFE = /^[a-z][a-z0-9-]*$/;
const slug = id => id.slice('purpose:'.length).replace('.', '-');

/** 기반 컴포넌트 마커: 렌더된 HTML에서 이 기반 컴포넌트가 실제로 쓰였는지 읽는다(허용 자식 검사). */
export const BASE_MARKERS = Object.freeze({
  'base-component:button-control': /data-ctl="button"/, 'base-component:input-control': /data-ctl="input"/, 'base-component:card-surface': /data-ctl="card"/,
  'base-component:navigation-menu': /data-ctl="navigation"/, 'base-component:modal-dialog': /data-ctl="modal"/, 'base-component:tabs-control': /data-ctl="tabs"/,
  'base-component:tooltip': /data-ctl="tooltip"/, 'base-component:feedback-message': /data-ctl="feedback"/, 'base-component:select-control': /class="kit-select"/, 'base-component:data-table': /class="kit-data-table"/,
});

/**
 * 한 패밀리를 한 시각 언어로 렌더한다. 개별 값이 틀리면 P_PURPOSE_VARIANT·PROP·CONTENT, 값은 맞지만 함께 쓸 수 없으면 P_PURPOSE_COMBO·VISUAL로 거부한다.
 * 기반 컴포넌트는 ctx.base로만 렌더한다: 시각 패밀리 구성원 규칙(고정 축 잠금, 열린 축, 금지 조합)이 그대로 적용된다.
 */
export function renderPurposeFamily(env, purposeId, request = {}) {
  const family = getPurposeFamily(purposeId);
  const fail = errors => ({ok: false, html: null, errors, resolved: null, bases: []});
  if (!family) return fail([{code: 'P_PURPOSE_UNKNOWN', message: `등록되지 않은 목적 패밀리: ${purposeId}`}]);
  const visualRecord = env.registry.get(request.visual);
  if (!visualRecord || visualRecord.kind !== 'family' || !VISUAL_LANGUAGES[request.visual]) return fail([{code: 'P_PURPOSE_VISUAL_UNKNOWN', message: `시각 패밀리가 아닙니다: ${request.visual}`}]);
  const uid = request.id ?? slug(purposeId);
  if (!SAFE.test(uid)) return fail([{code: 'P_PURPOSE_ID', message: 'id는 소문자 kebab-case입니다'}]);
  const {content = {}} = request;
  const checked = checkPurposeCombination(family, {visual: request.visual, variant: request.variant, props: request.props, content});
  if (!checked.ok) return {...fail(checked.errors), resolved: checked.resolved};
  const language = VISUAL_LANGUAGES[request.visual], bases = new Set();
  const ctx = {
    id: uid, variant: checked.resolved.variant, props: checked.resolved.props, content, visual: {id: request.visual, key: language.key, recipe: language.recipe, metrics: language.metrics},
    uid: suffix => `${uid}-${suffix}`,
    /** 기반 컴포넌트 한 개. props는 시각 패밀리가 연 축만 받는다. */
    base(baseId, {props = {}, content: input = {}} = {}) {
      if (!family.children.includes(baseId)) throw new PurposeRenderError([{code: 'P_PURPOSE_CHILD', message: `${family.id}는 ${baseId}를 자식으로 선언하지 않았습니다`}]);
      const r = renderMember(env.registry, visualRecord, baseId, {props, content: input});
      if (!r.ok) throw new PurposeRenderError(r.errors);
      bases.add(baseId);
      return r.html;
    },
    /** 기반 컴포넌트를 렌더하지 않고 축 값만 확정한다(구조가 다른 셸을 직접 마크업하되 기반 컴포넌트의 data 속성과 CSS를 쓰려는 목적 패밀리용). 반환은 계약 기본값을 포함한 전체 축 값. */
    resolve(baseId, props = {}) {
      if (!family.children.includes(baseId)) throw new PurposeRenderError([{code: 'P_PURPOSE_CHILD', message: `${family.id}는 ${baseId}를 자식으로 선언하지 않았습니다`}]);
      const r = resolveMember(env.registry, visualRecord, baseId, {props});
      if (!r.ok) throw new PurposeRenderError(r.errors);
      bases.add(baseId);
      return r.full;
    },
    /** 강조 단계(primary·secondary·emphasis·tertiary)에 맞는 버튼. 외형은 시각 언어의 recipe가 정한다. */
    button(role, {props = {}, content: input = {}} = {}) {
      const appearance = language.recipe[role];
      if (!appearance) throw new PurposeRenderError([{code: 'P_PURPOSE_RECIPE', message: `버튼 단계 ${role}가 없습니다`}]);
      return ctx.base('base-component:button-control', {props: {appearance, ...props}, content: input});
    },
  };
  try {
    const inner = family.render(ctx);
    const used = [...bases];
    const stray = Object.entries(BASE_MARKERS).filter(([id, re]) => re.test(inner) && !family.children.includes(id)).map(([id]) => id);
    if (stray.length) return fail([{code: 'P_PURPOSE_CHILD', message: `선언하지 않은 기반 컴포넌트가 출력에 있습니다: ${stray.join(', ')}`}]);
    const html = `<div class="pf pf-${slug(purposeId)}" data-family="${language.key}" data-purpose="${escapeHTML(purposeId.slice('purpose:'.length))}">${inner}</div>`;
    return {ok: true, html, errors: [], resolved: checked.resolved, bases: used};
  } catch (e) {
    if (e instanceof PurposeRenderError) return fail(e.errors);
    return fail([{code: 'P_RENDER', message: e.message}]);
  }
}

const declBlock = (selector, vars) => `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});

/** 공통 레이아웃 CSS: 패밀리 한 칸을 격자 셀로 쓸 때 쓰는 최소 규칙. 목적 패밀리 CSS는 각 정의가 소유한다. */
const PAGE_CSS = `.kit-platform{display:grid;gap:var(--kit-gap);padding:var(--kit-inset)}.pf{min-width:0;box-sizing:border-box}@media(max-width:640px){.kit-platform{padding:var(--kit-sp-item)}}${ICON_CSS}`;

/** options.definitions: 시험용으로 CSS·색 쌍을 바꿔 끼우는 {id → 정의} Map(렌더는 등록된 정의로 한다). 검사가 실제로 잡는지 보이는 데 쓴다. */
export function assembleFamilies(env, request, {definitions = new Map()} = {}) {
  const def = id => definitions.get(id) ?? getPurposeFamily(id);
  const items = request?.items ?? [];
  const {items: _drop, ...platformRequest} = request ?? {};
  const base = assemblePlatform({...platformRequest, components: []}, env);
  if (!base.ok) return {ok: false, value: null, diagnostics: base.diagnostics, stage: base.stage};
  const diagnostics = [], rendered = [];
  items.forEach((it, i) => {
    const r = renderPurposeFamily(env, it.purpose, it);
    if (!r.ok) { for (const e of r.errors) diagnostics.push(diag(e.code, `$.items[${i}]`, e.message)); return; }
    const ids = [it.purpose, it.visual, ...getPurposeFamily(it.purpose).bases, ...axisIds(request.density ? {density: request.density} : {})];
    const compatibility = env.graph.evaluate(ids, {context: request.context, mode: request.mode ?? 'light', density: request.density});
    if (!compatibility.ok) {
      for (const e of compatibility.violations) diagnostics.push(diag(e.code, `$.items[${i}]`, e.reason));
      return;
    }
    rendered.push({...it, html: r.html, bases: r.bases, resolved: r.resolved});
  });
  if (diagnostics.length) return {ok: false, value: null, diagnostics, stage: 'composeComponents'};
  const tokens = base.value.tokens;
  const usedBases = [...new Set(rendered.flatMap(x => x.bases))].sort();
  const usedPurposes = [...new Set(rendered.map(x => x.purpose))].sort();
  const usedVisuals = [...new Set(rendered.map(x => x.visual))].sort();
  const baseCss = usedBases.map(b => env.registry.kind('base-component').implementation(b).styles);
  const purposeCss = [...new Set(usedPurposes.map(p => def(p).sharedCss).filter(Boolean)), ...usedPurposes.map(p => def(p).css)];
  const css = [
    base.value.css, PAGE_CSS,
    ...usedVisuals.map(v => declBlock(`[data-family="${VISUAL_LANGUAGES[v].key}"]`, familyShapeVars(env.registry.get(v)))),
    ...[...new Set(baseCss)], ...purposeCss,
  ].join('\n');
  const html = `<div class="kit-platform" data-mode="${request.mode ?? 'light'}">${rendered.map(x => x.html).join('')}</div>`;
  const defined = new Set([...css.matchAll(/(--[A-Za-z0-9-]+):/g)].map(m => m[1]));
  for (const v of requiredVars(css).filter(v => !defined.has(v))) diagnostics.push(diag('P_TOKEN_MISSING', '$output.css', `${v}를 읽지만 어느 재료도 값을 주지 않습니다`));
  const contrast = [];
  for (const b of usedBases) {
    const pairs = contrastPairs(env.registry.kind('base-component').implementation(b).contract, tokens);
    contrast.push({owner: b, pairs});
  }
  for (const p of usedPurposes) {
    const own = def(p);
    contrast.push({owner: p, pairs: contrastPairs({pairs: own.pairs}, tokens)});
  }
  for (const c of contrast) for (const p of c.pairs.filter(x => !x.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', c.owner, `${p.use}: ${p.fg} on ${p.bg} ${p.ratio}:1 < ${p.minimum}:1`));
  const manifest = {...base.value.manifest, families: {purposes: usedPurposes, visuals: usedVisuals, bases: usedBases}, contrast: {...base.value.manifest.contrast, families: contrast}};
  const ok = !diagnostics.length;
  return {ok, value: ok ? {css, html, tokens, manifest} : null, diagnostics, stage: 'emit'};
}

/** 목적 패밀리 × 시각 패밀리: 허용인지, 거부면 이유. 예시(example)로 실제 렌더해 본 결과도 함께 낸다. */
export function combinationMatrix(env) {
  const visuals = env.registry.list('family').map(f => f.id);
  return PURPOSE_FAMILIES.map(f => ({
    purpose: f.id, cells: Object.fromEntries(visuals.map(v => {
      const c = checkPurposeCombination(f, {visual: v, variant: f.example.variant, props: f.example.props, content: f.example.content});
      return [v, c.ok ? {ok: true} : {ok: false, reasons: c.errors.map(x => ({code: x.code, message: x.message}))}];
    })),
  }));
}
