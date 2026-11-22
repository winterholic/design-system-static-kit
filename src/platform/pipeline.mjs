/**
 * 규칙 기반 조립 파이프라인(ADR 0012 §6). AI가 HTML·CSS를 만들지 않는다. 모든 출력은 등록 재료의 기존 구현과 값 표에서 온다.
 *
 *   1 normalizeRequest    요청 모양 검사(닫힌 키)                         → {intent}
 *   2 resolveStyleContext 스타일 맥락 확정                                → {styleContext}
 *   3 selectMaterials     팔레트·서브토큰·타이포·패밀리 선택(요구 or 추천 1순위) → {selection}     개별 속성 유효성: P_ATTR_*
 *   4 checkCombination    관계·계산 검사                                  → {relations}      조합 유효성: P_REL_*·P_CHECK_*
 *   5 bindTokens          색·서체·모양·간격 값 결합                         → {bound}
 *   6 composeComponents   intent.components를 실제 렌더해 삽입               → {items}
 *   7 emit                CSS·HTML·manifest 작성, 변수 누락 검사              → {output}
 *
 * 각 단계는 (state, env) → state' 순수 함수다. 진단이 error면 다음 단계로 가지 않는다. 같은 입력은 같은 바이트를 낸다.
 * env: {registry: createPlatformRegistry() 결과, graph: createRelationGraph() 결과}
 */
import {spaceVars} from '../spacing.mjs';
import {sizeCSS} from '../materials/control-size.mjs';
import {PLATFORM_CONTRACT_VERSION} from './contract.mjs';
import {recommend} from './recommend.mjs';
import {bindColor} from './color.mjs';
import {bindType} from './type.mjs';
import {familyShapeVars, renderMember, contrastPairs, requiredVars} from './family.mjs';
import {escapeHTML} from '../escape-html.mjs';

export const REQUEST_KEYS = Object.freeze(['context', 'mode', 'density', 'styleContext', 'palette', 'subtokenSet', 'typeSystem', 'families', 'components']);
export const COMPONENT_KEYS = Object.freeze(['base', 'family', 'props', 'content']);
export const MODES = Object.freeze(['light', 'dark']);
export const DENSITIES = Object.freeze(['compact', 'comfortable', 'spacious']);
export const STAGES = Object.freeze(['normalizeRequest', 'resolveStyleContext', 'selectMaterials', 'checkCombination', 'bindTokens', 'composeComponents', 'emit']);

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});
const failed = state => state.diagnostics.some(d => d.severity === 'error');

/** 1단계. request → {intent}. 모르는 키는 거부하고 바꾸지 않는다. */
export function normalizeRequest(request) {
  const diagnostics = [];
  if (!plain(request)) return {intent: null, diagnostics: [diag('P_REQUEST', '$', '요청은 객체여야 합니다')], decisions: []};
  for (const k of Object.keys(request)) if (!REQUEST_KEYS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.${k}`, `지원하지 않는 키: ${k}. 임의 CSS·HTML 경로는 없습니다`, {alternatives: REQUEST_KEYS}));
  if (typeof request.context !== 'string') diagnostics.push(diag('P_REQUEST_CONTEXT', '$.context', 'context(페이지 유형)가 필요합니다'));
  const mode = request.mode ?? 'light', density = request.density ?? 'comfortable';
  if (!MODES.includes(mode)) diagnostics.push(diag('P_ATTR_MODE', '$.mode', `mode는 ${MODES.join('·')}입니다`));
  if (!DENSITIES.includes(density)) diagnostics.push(diag('P_ATTR_DENSITY', '$.density', `density는 ${DENSITIES.join('·')}입니다`));
  const components = request.components ?? [];
  if (!Array.isArray(components)) diagnostics.push(diag('P_REQUEST_COMPONENTS', '$.components', 'components는 배열입니다'));
  else components.forEach((c, i) => {
    if (!plain(c) || typeof c.base !== 'string') { diagnostics.push(diag('P_REQUEST_COMPONENTS', `$.components[${i}]`, '{base, family?, props?, content} 객체여야 합니다')); return; }
    for (const k of Object.keys(c)) if (!COMPONENT_KEYS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.components[${i}].${k}`, `지원하지 않는 키: ${k}`, {alternatives: COMPONENT_KEYS}));
  });
  const families = request.families ?? [];
  if (!Array.isArray(families)) diagnostics.push(diag('P_REQUEST_FAMILIES', '$.families', 'families는 패밀리 id 배열입니다'));
  const intent = {context: request.context, mode, density, styleContext: request.styleContext ?? null, palette: request.palette ?? null, subtokenSet: request.subtokenSet ?? null, typeSystem: request.typeSystem ?? null, families: Array.isArray(families) ? [...families] : [], components: Array.isArray(components) ? structuredClone(components) : []};
  return {intent, diagnostics, decisions: []};
}

/** 요구한 id의 개별 속성 유효성: 등록됐는가, 종류가 맞는가, 맥락에 맞는가. */
function attr(env, id, kind, path, context) {
  const m = env.registry.get(id);
  if (!m) return diag('P_ATTR_UNKNOWN', path, `등록되지 않은 재료: ${id}`, {alternatives: env.registry.kind(kind).list().map(x => x.id)});
  if (m.kind !== kind) return diag('P_ATTR_KIND', path, `${id}는 ${kind}가 아니라 ${m.kind}입니다`);
  if (!m.contexts.includes('any') && !m.contexts.includes(context)) return diag('P_ATTR_CONTEXT', path, `${id}는 ${context} 맥락용이 아닙니다(${m.contexts.join(', ')})`);
  return null;
}

/** 2단계. 스타일 맥락은 요구했을 때만 쓴다(없으면 null). 스타일 맥락은 값을 정하지 않고 추천 순위만 바꾼다. */
export function resolveStyleContext(state, env) {
  const {intent} = state, diagnostics = [...state.diagnostics];
  if (intent.styleContext) { const d = attr(env, intent.styleContext, 'style-context', '$.styleContext', intent.context); if (d) diagnostics.push(d); }
  return {...state, diagnostics, styleContext: intent.styleContext};
}

/** 3단계. 요구가 있으면 검사해 그대로 쓰고, 없으면 recommend()의 1순위를 쓴다. 고른 이유를 decisions에 남긴다. */
export function selectMaterials(state, env) {
  const {intent} = state, diagnostics = [...state.diagnostics], decisions = [...state.decisions];
  const selection = {styleContext: state.styleContext, palette: null, subtokenSet: null, typeSystem: null, families: {}};
  const ctx = {context: intent.context, mode: intent.mode, density: intent.density, styleContext: state.styleContext};
  const choose = (key, kind, anchors) => {
    if (intent[key]) {
      const d = attr(env, intent[key], kind, `$.${key}`, intent.context);
      if (d) { diagnostics.push(d); return null; }
      decisions.push({slot: key, id: intent[key], source: 'intent'});
      return intent[key];
    }
    const rec = recommend(env.registry, env.graph, {kind, ...ctx, selected: anchors});
    if (!rec.ranked.length) { diagnostics.push(diag('P_SELECT_EMPTY', `$.${key}`, `${kind} 후보가 없습니다`, {blocked: rec.blocked})); return null; }
    decisions.push({slot: key, id: rec.ranked[0].id, source: 'recommend', score: rec.ranked[0].score, reasons: rec.ranked[0].reasons});
    return rec.ranked[0].id;
  };
  selection.palette = choose('palette', 'palette', []);
  selection.subtokenSet = choose('subtokenSet', 'subtoken-set', [selection.palette].filter(Boolean));
  selection.typeSystem = choose('typeSystem', 'type-system', []);
  intent.families.forEach((f, i) => { const d = attr(env, f, 'family', `$.families[${i}]`, intent.context); if (d) diagnostics.push(d); });
  intent.components.forEach((c, i) => {
    const d = attr(env, c.base, 'base-component', `$.components[${i}].base`, intent.context);
    if (d) { diagnostics.push(d); return; }
    if (c.family) { const df = attr(env, c.family, 'family', `$.components[${i}].family`, intent.context); if (df) { diagnostics.push(df); return; } selection.families[c.base] ??= c.family; return; }
    if (selection.families[c.base]) return;
    const given = intent.families.find(f => env.registry.get(f)?.members?.[c.base]);
    if (given) { selection.families[c.base] = given; decisions.push({slot: `family(${c.base})`, id: given, source: 'intent'}); return; }
    const anchors = [selection.subtokenSet, selection.typeSystem, c.base].filter(Boolean);
    const rec = recommend(env.registry, env.graph, {kind: 'family', ...ctx, selected: anchors});
    const pick = rec.ranked.find(r => env.registry.get(r.id).members[c.base]);
    if (!pick) { diagnostics.push(diag('P_SELECT_EMPTY', `$.components[${i}]`, `${c.base}를 구성원으로 가진 패밀리 후보가 없습니다`, {blocked: rec.blocked})); return; }
    selection.families[c.base] = pick.id;
    decisions.push({slot: `family(${c.base})`, id: pick.id, source: 'recommend', score: pick.score, reasons: pick.reasons});
  });
  return {...state, diagnostics, decisions, selection};
}

/** 4단계. 고른 묶음의 조합 유효성. 관계 그래프 + 타이포 시스템 내부 검사(서체 짝 × 역할 체계). */
export function checkCombination(state, env) {
  const {selection, intent} = state, diagnostics = [...state.diagnostics];
  // 패밀리는 자기 구성원(기반 컴포넌트)과만 짝지어 본다. 다른 패밀리의 기반 컴포넌트와 묶으면 닫힌 쌍 위반으로 잘못 읽힌다.
  const core = [selection.styleContext, selection.palette, selection.subtokenSet, selection.typeSystem].filter(Boolean);
  const groups = Object.entries(selection.families).map(([base, family]) => [...core, family, base]);
  const ctx = {context: intent.context, mode: intent.mode, density: intent.density};
  const runs = (groups.length ? groups : [core]).map(ids => env.graph.evaluate(ids, ctx));
  const key = x => JSON.stringify(x);
  const uniq = xs => [...new Map(xs.map(x => [key(x), x])).values()];
  const relations = {ok: runs.every(r => r.ok), violations: uniq(runs.flatMap(r => r.violations)), applied: uniq(runs.flatMap(r => r.applied)), checks: uniq(runs.flatMap(r => r.checks))};
  for (const v of relations.violations) diagnostics.push(diag(v.code, '$selection', `${v.from} × ${v.to}: ${v.reason}`));
  const ts = env.registry.get(selection.typeSystem);
  const type = ts ? bindType(ts) : null;
  for (const e of type?.errors ?? []) diagnostics.push(diag(e.code === 'P_TYPE_HANGUL_WEIGHT' ? 'P_CHECK_TYPE_HANGUL' : e.code, '$.typeSystem', e.message));
  return {...state, diagnostics, relations};
}

/** 5단계. 값 결합. 패밀리 모양 변수는 패밀리 범위([data-family])에만 둔다(패밀리가 여럿이어도 서로 덮지 않게). */
export function bindTokens(state, env) {
  const {selection, intent} = state, diagnostics = [...state.diagnostics];
  const color = bindColor(env.registry.get(selection.palette), env.registry.get(selection.subtokenSet), intent.mode);
  if (!color.ok) diagnostics.push(diag(color.error?.code ?? 'P_COLOR_CONTRAST', '$selection', color.error?.message ?? '대비 미달'));
  const type = bindType(env.registry.get(selection.typeSystem));
  const families = Object.fromEntries([...new Set(Object.values(selection.families))].sort().map(id => [id, familyShapeVars(env.registry.get(id))]));
  const spacing = Object.fromEntries(spaceVars(intent.density).split(';').map(d => d.split(':')));
  const shade = {'--kit-shade': 'color-mix(in srgb,var(--kit-text) 14%,transparent)'};
  return {...state, diagnostics, bound: {color, type, families, root: {...(color.vars ?? {}), ...shade, ...(type.vars ?? {}), ...spacing}}};
}

/** 6단계. intent.components를 패밀리 구성원으로 실제 렌더한다. 기반 계약의 대비 쌍을 결합된 색으로 검사한다. */
export function composeComponents(state, env) {
  const {intent, selection, bound} = state, diagnostics = [...state.diagnostics], items = [];
  intent.components.forEach((c, i) => {
    const familyId = selection.families[c.base], family = env.registry.get(familyId);
    const r = renderMember(env.registry, family, c.base, {props: c.props ?? {}, content: c.content ?? {}});
    if (!r.ok) { for (const e of r.errors) diagnostics.push(diag(e.code, `$.components[${i}]`, e.message)); return; }
    const pairs = contrastPairs(env.registry.kind('base-component').implementation(c.base).contract, bound.color.vars ?? {});
    for (const p of pairs.filter(x => !x.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', `$.components[${i}]`, `${p.use}: ${p.fg} on ${p.bg} ${p.ratio}:1 < ${p.minimum}:1`));
    items.push({base: c.base, family: familyId, props: r.props, html: r.html, contrast: pairs});
  });
  return {...state, diagnostics, items};
}

const declBlock = (selector, vars) => `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;

/** 7단계. CSS = :root 값 + 패밀리 범위 값 + 쓰인 기반 컴포넌트 CSS. 출력 CSS가 기본값 없이 읽는 변수가 모두 정의됐는지 검사한다. */
export function emit(state, env) {
  const {bound, items, selection, intent} = state, diagnostics = [...state.diagnostics];
  const bases = [...new Set(items.map(x => x.base))].sort();
  const impls = bases.map(b => env.registry.kind('base-component').implementation(b));
  const css = [
    `/* platform ${PLATFORM_CONTRACT_VERSION}: ${selection.palette} × ${selection.subtokenSet} · ${selection.typeSystem} (${intent.mode}, ${intent.density}) */`,
    declBlock(':root', bound.root),
    `body{margin:0;background:var(--kit-canvas);color:var(--kit-text);font-family:var(--kit-font);line-height:var(--kit-line)}`,
    ...Object.entries(bound.families).map(([id, vars]) => declBlock(`[data-family="${id.slice('family:'.length)}"]`, vars)),
    `.kit-platform{display:grid;gap:var(--kit-gap);padding:var(--kit-inset)}`,
    ...impls.map(x => x.styles),
  ].join('\n');
  const html = `<div class="kit-platform" data-mode="${intent.mode}">${items.map(x => `<div data-family="${escapeHTML(x.family.slice('family:'.length))}" data-base="${escapeHTML(x.base.slice('base-component:'.length))}">${x.html}</div>`).join('')}</div>`;
  const defined = new Set([...css.matchAll(/(--[A-Za-z0-9-]+):/g)].map(m => m[1]));
  const missing = requiredVars(css).filter(v => !defined.has(v));
  for (const v of missing) diagnostics.push(diag('P_TOKEN_MISSING', '$output.css', `${v}를 읽지만 어느 재료도 값을 주지 않습니다`));
  const reuses = [...new Set([selection.styleContext, selection.palette, selection.subtokenSet, selection.typeSystem, ...bases, ...Object.values(selection.families)].flatMap(id => env.registry.get(id)?.reuses ?? []))].sort();
  const manifest = {
    platformContract: PLATFORM_CONTRACT_VERSION, request: {context: intent.context, mode: intent.mode, density: intent.density},
    selection, decisions: state.decisions, relations: {applied: state.relations.applied, checks: state.relations.checks},
    contrast: {roles: bound.color.report, components: items.map(x => ({base: x.base, pairs: x.contrast}))}, reuses,
  };
  return {...state, diagnostics, output: {css, html, tokens: bound.root, manifest}};
}

/**
 * assemblePlatform(request, env) → {ok, value: {css, html, tokens, manifest} | null, diagnostics, decisions, stage}
 * stage: 마지막으로 돈 단계 이름(실패 위치).
 */
export function assemblePlatform(request, env) {
  let state = {...normalizeRequest(request)}, stage = STAGES[0];
  const steps = [resolveStyleContext, selectMaterials, checkCombination, bindTokens, composeComponents, emit];
  for (let i = 0; i < steps.length && !failed(state); i++) { stage = STAGES[i + 1]; state = steps[i](state, env); }
  const ok = !failed(state);
  return {ok, value: ok ? state.output : null, diagnostics: state.diagnostics, decisions: state.decisions ?? [], stage};
}
