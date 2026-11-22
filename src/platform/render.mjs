/**
 * 플랫폼 Blueprint 렌더(계약 0.6.0). Blueprint 2.7.0의 `materials`가 고른 재료로 페이지를 렌더한다.
 * 페이지 조립(assembleCombo)과 컴파일(2.7.0 문서, src/compiler.mjs → src/platform/compile.mjs)이 같은 함수를 부르므로
 * assembleDesign 결과를 Blueprint로 저장하고 다시 컴파일하면 같은 html·css·tokens가 나온다.
 *
 *   renderPlatformBlueprint(b, env, {evaluated?}) → {ok, diagnostics, quality, parts: {html, css, script, standalone, tokens}, selection, style, color, derived, components, stylePairs, derivedPairs}
 *   evaluateMaterials(env, {context, axes, selection, styleIds}) → {relations, score-less 결과}
 *
 * 입력 Blueprint는 바꾸지 않는다. AI가 HTML·CSS를 만들지 않는다: 마크업은 구형 노드 렌더러, 패밀리 구성원 렌더러, 상태 패턴 렌더러에서만 나온다.
 */
import {validateBlueprint} from '../validate.mjs';
import {renderTree, formRuntime, controlRuntime, escapeHTML} from '../render.mjs';
import {planComposition, auditPage} from '../composition.mjs';
import {stylesheet} from '../styles.mjs';
import {mix} from '../tokens.mjs';
import {colorRamp, readableColor, colorContrast} from '../color-tokens.mjs';
import {STATE_MARK, PURPOSE_MARK} from '../catalog/materials-field.mjs';
import {BLUEPRINT_VERSION, styleAxes} from '../catalog/index.mjs';
import {PLATFORM_CONTRACT_VERSION} from './contract.mjs';
import {bindColor} from './color.mjs';
import {bindType} from './type.mjs';
import {familyShapeVars, contrastPairs, requiredVars} from './family.mjs';
import {axisIds, materialAxisIds} from './axes.mjs';
import {styleMaterialsCSS, styleMaterialAttrs} from './style-materials.mjs';
import {renderState} from './data/states.mjs';
import {typeErrorCode} from './pipeline.mjs';
import {getPurposeFamily, renderPurposeFamily, VISUAL_LANGUAGES} from './families/index.mjs';
import {ICON_CSS} from './families/kit.mjs';

const key = x => JSON.stringify(x);
const uniq = xs => [...new Map(xs.map(x => [key(x), x])).values()];
const failed = diagnostics => diagnostics.some(d => d.severity === 'error');
const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});
const clone = x => structuredClone(x);

const WHITE = '#FFFFFF';
const LEGACY_PREFIX = '--kit-';

/**
 * 구형 CSS가 읽지만 서브토큰 세트의 색 역할에 없는 토큰을 같은 팔레트에서 계산한다(구형 resolveTokens·getMode와 같은 식).
 * 세트가 이미 낸 값은 덮지 않는다(색 작업이 차트·hover 역할을 역할 규칙으로 옮기면 그 값이 쓰인다).
 */
export function legacyTokens(color, palette, mode) {
  const t = Object.fromEntries(Object.entries(color.vars).map(([k, v]) => [k.slice(LEGACY_PREFIX.length), v]));
  const dark = mode === 'dark', derived = [];
  const put = (name, value) => { if (t[name] === undefined) { t[name] = value; derived.push(name); } };
  const ink = colorRamp(palette.seeds.neutral)['950'];
  const onFill = bg => (colorContrast(WHITE, bg) >= colorContrast(ink, bg) ? WHITE : ink);
  put('accentSoft', dark ? mix(t.accent, t.surface, 0.9) : mix(t.accent, WHITE, 0.9));
  put('accentInk', readableColor(t.accent, [t.canvas, t.surface, t.soft, t.sunken, t.accentSoft], 4.5));
  put('actionHover', mix(t.action, dark ? WHITE : '#000000', 0.12));
  put('onActionHover', onFill(t.actionHover));
  put('action-hover', t.actionHover);
  put('action-active', mix(t.action, dark ? WHITE : '#000000', 0.2));
  const chartSlots = ['brand', 'accent', 'info', 'success', 'warning'].filter(s => palette.seeds[s]);
  chartSlots.forEach((slot, i) => put(`chart${i + 1}`, readableColor(colorRamp(palette.seeds[slot])[dark ? '400' : '600'], [t.surface], 3)));
  put('chart-grid', t.border);
  // 구형 폼·표 CSS가 읽는 컨트롤·표 토큰: 색 역할에서 같은 원칙으로 낸다(구형 color-tokens의 component 표와 같은 출처 역할).
  put('control-bg', t.surface); put('control-fg', t.text); put('control-border', t.border);
  put('control-hover-border', readableColor(t.action, [t.surface], 3)); put('control-active-border', t.focus); put('control-error', t.danger);
  put('table-head', mix(t.surface, t.text, 0.05)); put('table-hover', t['card-hover']); put('table-selected', t.soft);
  return {tokens: t, derived};
}

export const walk = (nodes, f) => nodes.forEach(n => { f(n); if (Array.isArray(n.children)) walk(n.children, f); });

/** 선택한 스타일 재료의 id 목록(상태 패턴 포함, 중복 없음). */
export const styleMaterialIds = style => [...new Set([style?.surface, style?.motion, style?.background, style?.media, ...(style?.states ?? []).map(x => x.id)].filter(Boolean))];

/** 페이지 축 값 재료 id(관계 평가용). axes는 {shell, width, density, mode, scale, backdrop, ornament, footer, icon}를 가진 객체(계획의 axes나 Blueprint)다. */
export const pageAxisIdsOf = axes => axisIds({shell: axes.shell, width: axes.width, density: axes.density, mode: axes.mode, scale: axes.scale, backdrop: axes.backdrop, ornament: axes.ornament, footer: axes.footer, icon: axes.icon});

/**
 * 재료 묶음의 관계 평가. selection: {styleContext, palette, subtokenSet, typeSystem, families}. 축 값(페이지 축·패밀리 모양·서체 짝·스타일 재료)도 같이 평가되어 X01 등이 forbids로 걸린다.
 * 반환: {ok, violations, applied, checks}. 한글 한도 같은 타이포 결합 오류도 violations에 들어간다.
 */
export function evaluateMaterials(env, {context, axes, selection: sel, styleIds = []}) {
  const reg = env.registry, ctx = {context, mode: axes.mode, density: axes.density};
  const typeSystem = reg.get(sel.typeSystem);
  const core = [sel.styleContext, sel.palette, sel.subtokenSet, sel.typeSystem, ...pageAxisIdsOf(axes), ...materialAxisIds(typeSystem), ...styleIds.flatMap(id => materialAxisIds(reg.get(id)))].filter(Boolean);
  // 목적 패밀리(purpose:*)는 자기 기반 컴포넌트마다 시각 패밀리와의 구성원 관계를 평가한다.
  const groups = Object.entries(sel.families).flatMap(([key, f]) => (key.startsWith('purpose:') ? getPurposeFamily(key)?.bases ?? [] : [key]).map(base => [...core, f, base, ...materialAxisIds(reg.get(f))]));
  const runs = (groups.length ? groups : [core]).map(ids => env.graph.evaluate(ids, ctx));
  const relations = {ok: runs.every(r => r.ok), violations: uniq(runs.flatMap(r => r.violations)), applied: uniq(runs.flatMap(r => r.applied)), checks: uniq(runs.flatMap(r => r.checks))};
  for (const e of bindType(typeSystem).errors ?? []) relations.violations.push({code: typeErrorCode(e.code), from: sel.typeSystem, to: sel.typeSystem, reason: e.message});
  relations.ok = relations.violations.length === 0;
  return relations;
}

/** 후보의 카드 구성원 노드는 렌더 순서대로 패밀리 범위 표시(data-family)를 단다. 범위 안에서만 패밀리 모양 변수가 적용된다. */
function tagFamilies(body, tagOrder) {
  let i = 0;
  const out = body.replace(/<article class="kit-ctl-card"/g, m => (i < tagOrder.length ? `${m} data-family="${escapeHTML(tagOrder[i++].slice('family:'.length))}"` : m));
  return {html: out, ok: i === tagOrder.length};
}

const declBlock = (selector, vars) => `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
const usesInverse = tree => /"surface":"inverse"|"tone":"inverse"/.test(JSON.stringify(tree));


const KIND_OF = {palette: 'palette', subtokenSet: 'subtoken-set', typeSystem: 'type-system', styleContext: 'style-context', surface: 'surface', motion: 'motion', background: 'background', media: 'media'};

/** materials가 가리키는 재료가 등록돼 있고 자리에 맞는 종류인가. 진단은 service가 내는 코드(MATERIALS_UNKNOWN·MATERIALS_KIND)다. */
function resolveMaterials(b, env) {
  const m = b.materials, reg = env.registry, diagnostics = [];
  const check = (id, kind, path) => {
    const rec = reg.get(id);
    if (!rec) diagnostics.push(diag('MATERIALS_UNKNOWN', path, `등록되지 않은 재료: ${id}`, {alternatives: reg.list(kind).map(x => x.id)}));
    else if (rec.kind !== kind) diagnostics.push(diag('MATERIALS_KIND', path, `${id}는 ${kind}가 아니라 ${rec.kind}입니다`));
  };
  for (const [field, kind] of Object.entries(KIND_OF)) if (m[field] !== undefined) check(m[field], kind, `$.materials.${field}`);
  for (const [base, family] of Object.entries(m.families ?? {})) {
    check(base, 'base-component', `$.materials.families.${base}`); check(family, 'family', `$.materials.families.${base}`);
    const rec = reg.get(family); if (rec?.kind === 'family' && !rec.members[base]) diagnostics.push(diag('MATERIALS_INCOMPATIBLE', `$.materials.families.${base}`, `${family}는 ${base}를 구성원으로 갖지 않습니다`));
  }
  (m.states ?? []).forEach((st, i) => check(st.id, 'state-pattern', `$.materials.states[${i}].id`));
  (m.purposes ?? []).forEach((p, i) => {
    if (!getPurposeFamily(p.id)) diagnostics.push(diag('MATERIALS_UNKNOWN', `$.materials.purposes[${i}].id`, `등록되지 않은 목적 패밀리: ${p.id}`));
    check(p.visual, 'family', `$.materials.purposes[${i}].visual`);
    if (reg.get(p.visual)?.kind === 'family' && !VISUAL_LANGUAGES[p.visual]) diagnostics.push(diag('MATERIALS_KIND', `$.materials.purposes[${i}].visual`, `${p.visual}는 목적 패밀리가 읽는 시각 패밀리가 아닙니다`));
  });
  return diagnostics;
}

export function renderPlatformBlueprint(b, env, {evaluated = null} = {}) {
  const diagnostics = [], reg = env.registry, m = b.materials;
  const stop = quality => ({ok: false, diagnostics, quality: quality ?? null, parts: null});
  if (!m || typeof m !== 'object') return stop() && {...stop(), diagnostics: [diag('MATERIALS_UNKNOWN', '$.materials', 'materials가 없습니다')]};
  diagnostics.push(...resolveMaterials(b, env));
  if (failed(diagnostics)) return stop();
  if (!['light', 'dark'].includes(b.mode)) return {...stop(), diagnostics: [diag('MATERIALS_INCOMPATIBLE', '$.mode', `플랫폼 조립은 mode light·dark만 렌더합니다(받은 값: ${b.mode})`)]};
  const sel = {styleContext: m.styleContext ?? null, palette: m.palette, subtokenSet: m.subtokenSet, typeSystem: m.typeSystem, families: {...(m.families ?? {}), ...Object.fromEntries((m.purposes ?? []).map(p => [p.id, p.visual]))}};
  const style = {surface: m.surface ?? null, motion: m.motion ?? null, background: m.background ?? null, media: m.media ?? null, states: (m.states ?? []).map((st, index) => ({index, id: st.id}))};
  const palette = reg.get(sel.palette), set = reg.get(sel.subtokenSet), typeSystem = reg.get(sel.typeSystem);
  const relations = evaluated ?? evaluateMaterials(env, {context: b.pageType, axes: b, selection: sel, styleIds: styleMaterialIds(style)});
  for (const v of evaluated ? [] : relations.violations) diagnostics.push(diag(v.code === 'P_CHECK_TYPE_HANGUL' ? v.code : 'MATERIALS_INCOMPATIBLE', '$.materials', `${v.from} × ${v.to}: ${v.reason}`, {relation: v.code}));
  if (failed(diagnostics)) return stop();

  const color = bindColor(palette, set, b.mode);
  if (!color.ok) return {...stop(), diagnostics: [diag(color.error?.code ?? 'P_COLOR_CONTRAST', '$.materials', color.error?.message ?? '대비 미달')]};
  const type = bindType(typeSystem, {legacyRoles: true});
  const {tokens, derived} = legacyTokens(color, palette, b.mode);

  const verdict = validateBlueprint(b);
  const page = {valid: verdict.valid, errors: verdict.errors.map(e => ({code: e.code, path: e.path, message: e.message})), warnings: (verdict.warnings ?? []).map(w => ({code: w.code, path: w.path, message: w.message}))};
  if (!verdict.valid) {
    for (const e of verdict.errors) diagnostics.push(diag('P_PAGE_INVALID', e.path, `${e.code}: ${e.message}`, {rule: e.code}));
    return stop({page});
  }
  // 트리의 상태 화면 표지(divider platform-state-N)와 materials.states가 일대일인가
  const marks = [];
  walk(b.tree.children, n => { const mm = n.type === 'divider' && typeof n.label === 'string' ? STATE_MARK.exec(n.label) : null; if (mm) marks.push(Number(mm[1])); });
  if (marks.length !== style.states.length || marks.some(i => i >= style.states.length) || new Set(marks).size !== marks.length) {
    diagnostics.push(diag('MATERIALS_STATE', '$.materials.states', `트리의 상태 화면 표지 ${marks.length}개와 materials.states ${style.states.length}개가 맞지 않습니다`));
    return stop({page});
  }
  const pmarks = [];
  walk(b.tree.children, n => { const mm = n.type === 'metric' && typeof n.label === 'string' ? PURPOSE_MARK.exec(n.label) : null; if (mm) pmarks.push(Number(mm[1])); });
  const purposes = m.purposes ?? [];
  if (pmarks.length !== purposes.length || pmarks.some(i => i >= purposes.length) || new Set(pmarks).size !== pmarks.length) {
    diagnostics.push(diag('MATERIALS_STATE', '$.materials.purposes', `트리의 목적 패밀리 표지 ${pmarks.length}개와 materials.purposes ${purposes.length}개가 맞지 않습니다`));
    return stop({page});
  }
  // 카드 구성원: 이 패밀리의 card-surface 노드는 렌더 순서대로 패밀리 범위 표시를 단다
  const cardFamily = (m.families ?? {})['base-component:card-surface'] ?? null, tagOrder = [];
  if (cardFamily) walk(b.tree.children, n => { if (n.type === 'card-surface') tagOrder.push(cardFamily); });

  let design, body, artLog = {};
  try { design = planComposition(b); body = renderTree(b, design, artLog); auditPage(design, artLog.arts); }
  catch (e) { diagnostics.push(diag('P_RENDER', '$.tree', e.message)); return stop({page}); }
  const usedStateIds = [];
  for (const st of style.states) {
    const marker = `<div class="kit-divider" role="separator"><span>platform-state-${st.index}</span></div>`;
    if (body.split(marker).length !== 2) { diagnostics.push(diag('P_RENDER', '$.tree', `상태 화면 자리(${st.index})를 렌더 결과에서 한 번 찾지 못했습니다`)); return stop({page}); }
    const {id: _id, ...input} = m.states[st.index];
    try { body = body.replace(marker, () => renderState(reg.get(st.id), {...input, level: 3})); }
    catch (e) { diagnostics.push(diag('P_RENDER', `$.materials.states[${st.index}]`, `상태 화면: ${e.message}`)); return stop({page}); }
    usedStateIds.push(st.id);
  }
  // 목적 패밀리 자리를 시각 패밀리로 렌더한 마크업으로 바꾼다(검사와 같은 함수). 쓰인 기반 컴포넌트와 패밀리 CSS를 모은다.
  const usedPurposes = [], usedBases = new Set();
  for (const [i, p] of purposes.entries()) {
    const label = `platform-purpose-${i}`;
    const re = new RegExp(`<dl[^>]*class="kit-metric"[^>]*><dt>${label}</dt><dd[^>]*>0</dd></dl>`, 'g');
    if ((body.match(re) ?? []).length !== 1) { diagnostics.push(diag('P_RENDER', '$.tree', `목적 패밀리 자리(${i})를 렌더 결과에서 한 번 찾지 못했습니다`)); return stop({page}); }
    const r = renderPurposeFamily(env, p.id, {visual: p.visual, variant: p.variant, props: p.props, content: p.content, id: p.uid});
    if (!r.ok) { for (const e of r.errors) diagnostics.push(diag(e.code, `$.materials.purposes[${i}]`, e.message)); return stop({page}); }
    body = body.replace(re, () => r.html);
    usedPurposes.push(p); r.bases.forEach(x => usedBases.add(x));
  }
  // 선택한 표면·모션·배경·미디어는 셸에 범위 속성으로 달고(배경 장식 요소 포함) 재료 CSS를 붙인다.
  const bg = style.background ? reg.get(style.background) : null;
  const attrs = styleMaterialAttrs(style);
  if (attrs) body = body.replace('<div class="kit-shell"', `<div class="kit-shell" ${attrs}`);
  if (bg && bg.deco.kind !== 'none') body = body.replace(/(<div class="kit-shell"[^>]*>)/, '$1<span class="kit-deco" aria-hidden="true"></span>');
  const tagged = tagFamilies(body, tagOrder);
  if (!tagged.ok) { diagnostics.push(diag('P_RENDER', '$.tree', '카드 구성원 수와 렌더된 카드 수가 다릅니다(패밀리 범위 표시를 달 수 없음)')); return stop({page}); }

  const sets = {[b.mode]: tokens};
  if (usesInverse(b.tree)) {
    const opp = b.mode === 'dark' ? 'light' : 'dark', oc = bindColor(palette, set, opp);
    sets.inverse = {[opp]: oc.ok ? legacyTokens(oc, palette, opp).tokens : tokens};
    if (!oc.ok) diagnostics.push(diag('P_COLOR_CONTRAST', '$.materials', `inverse 구역(${opp})의 색 결합 실패: ${oc.error?.message}`));
  }
  const families = [...new Set([...Object.values(sel.families)])].sort();
  const platformCss = [
    `/* platform ${PLATFORM_CONTRACT_VERSION} page: ${sel.palette} × ${sel.subtokenSet} · ${sel.typeSystem} (${b.mode}, ${b.density}) */`,
    declBlock(':root', type.vars ?? {}),
    ...families.map(id => declBlock(`[data-family="${id.slice('family:'.length)}"]`, familyShapeVars(reg.get(id)))),
  ].join('\n');
  const legacyCss = stylesheet(b, sets, tagged.html, design);
  const purposeCss = usedPurposes.length ? [
    '.pf{min-width:0;box-sizing:border-box}', ICON_CSS,
    ...[...usedBases].sort().map(x => reg.kind('base-component').implementation(x).styles).filter(x => !legacyCss.includes(x)),
    ...new Set(usedPurposes.map(p => getPurposeFamily(p.id).sharedCss).filter(Boolean)), ...new Set(usedPurposes.map(p => getPurposeFamily(p.id).css)),
  ].join('\n') + '\n' : '';
  const css = legacyCss + platformCss + '\n' + purposeCss + styleMaterialsCSS(reg, style, usedStateIds) + '\n';
  // 목적 패밀리가 쓴 기반 컴포넌트의 런타임도 낸다(트리에는 표지 노드뿐이라 쓰인 부품 type을 더해 같은 함수로 고른다).
  const script = formRuntime + controlRuntime({...b, tree: {type: 'page', children: [...b.tree.children, ...[...usedBases].sort().map(x => ({type: x.slice('base-component:'.length)}))]}});

  const defined = new Set([...css.matchAll(/(--[A-Za-z0-9-]+):/g)].map(x => x[1]));
  const missing = requiredVars(css).filter(v => !defined.has(v));
  for (const v of missing) diagnostics.push(diag('P_TOKEN_MISSING', '$output.css', `${v}를 읽지만 어느 재료도 값을 주지 않습니다`));
  const nodeTypes = new Set(); walk(b.tree.children, n => nodeTypes.add(n.type));
  let components = Object.entries(m.families ?? {}).filter(([base]) => nodeTypes.has(base.slice('base-component:'.length))).map(([base, family]) => {
    const pairs = contrastPairs(reg.kind('base-component').implementation(base).contract, color.vars);
    for (const p of pairs.filter(x => !x.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', '$.tree', `${p.use}: ${p.fg} on ${p.bg} ${p.ratio}:1 < ${p.minimum}:1`));
    return {base, family, pairs};
  });
  for (const p of usedPurposes) {
    const fam = getPurposeFamily(p.id), pairs = contrastPairs({pairs: fam.pairs}, color.vars);
    for (const x of pairs.filter(y => !y.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', '$.materials.purposes', `${p.id}: ${x.use}: ${x.fg} on ${x.bg} ${x.ratio}:1 < ${x.minimum}:1`));
    components.push({base: p.id, family: p.visual, pairs});
  }
  for (const x of [...usedBases].sort().filter(x => !components.some(c => c.base === x))) {
    const pairs = contrastPairs(reg.kind('base-component').implementation(x).contract, color.vars);
    for (const y of pairs.filter(z => !z.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', '$.materials.purposes', `${x}: ${y.use}: ${y.fg} on ${y.bg} ${y.ratio}:1 < ${y.minimum}:1`));
    components.push({base: x, family: null, pairs});
  }
  const stylePairs = styleMaterialIds(style).flatMap(id => (reg.get(id).pairs ?? []).map(([fg, bgRole, minimum]) => {
    const a = color.roles[fg], c2 = color.roles[bgRole], ratio = a && c2 ? Math.floor(colorContrast(a, c2) * 1e4) / 1e4 : null;
    return {material: id, fg, bg: bgRole, minimum, ratio, ok: ratio !== null && ratio >= minimum};
  }));
  for (const p of stylePairs.filter(x => !x.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', '$.materials', `${p.material}: ${p.fg} on ${p.bg} ${p.ratio}:1 < ${p.minimum}:1`));
  const derivedPairs = [['accentInk', 'accentSoft', 4.5], ['onActionHover', 'actionHover', 4.5], ['text', 'table-head', 7], ['text', 'table-hover', 7], ['text', 'table-selected', 7], ['control-fg', 'control-bg', 7]].map(([fg, bgName, minimum]) => ({fg, bg: bgName, minimum, ratio: Math.floor(colorContrast(tokens[fg], tokens[bgName]) * 1e4) / 1e4})).map(p => ({...p, ok: p.ratio >= p.minimum}));
  for (const p of derivedPairs.filter(x => !x.ok)) diagnostics.push(diag('P_CHECK_CONTRAST', '$.tokens', `파생 토큰 ${p.fg} on ${p.bg} ${p.ratio}:1 < ${p.minimum}:1`));
  const quality = {
    contrast: {ok: color.ok && components.every(c => c.pairs.every(p => p.ok)) && derivedPairs.every(p => p.ok) && stylePairs.every(p => p.ok), roles: color.report.length, failures: [...color.report.filter(r => r.ratio < r.minimum), ...derivedPairs.filter(p => !p.ok), ...stylePairs.filter(p => !p.ok)], derived: derivedPairs, styleMaterials: stylePairs},
    tokens: {ok: !missing.length, missing},
    type: {ok: type.ok, errors: type.errors ?? []},
    page,
  };
  quality.ok = quality.contrast.ok && quality.tokens.ok && quality.type.ok && quality.page.valid;
  const standalone = `<!doctype html>\n<html lang="ko" data-theme="${b.mode}" data-motion="${b.motion}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'"><meta name="color-scheme" content="${b.mode}"><meta name="generator" content="Static Kit platform ${PLATFORM_CONTRACT_VERSION}"><title>${escapeHTML(b.name)}</title><style>\n${css}</style></head><body>${tagged.html}<script>${script}</script></body></html>\n`;
  const tokenMap = {...Object.fromEntries(Object.entries(tokens).map(([k, v]) => [LEGACY_PREFIX + k, v])), ...type.vars};
  const reuses = [...new Set([sel.styleContext, sel.palette, sel.subtokenSet, sel.typeSystem, ...Object.keys(sel.families), ...Object.values(sel.families), ...styleMaterialIds(style)].filter(Boolean).flatMap(id => reg.get(id)?.reuses ?? []))].sort();
  return {
    ok: quality.ok && !failed(diagnostics), diagnostics, quality, selection: sel, style, color, colorVars: color.vars, derived, relations,
    components, stylePairs, derivedPairs, reuses,
    parts: {html: tagged.html, css, script, standalone, tokens: tokenMap},
  };
}

/**
 * 플랫폼 manifest. 구형 manifest와 같은 최상위 모양(catalogVersion, theme, mode, axes, contrast 배열, blueprint)을 가져 explainDecisions가 읽을 수 있고,
 * 플랫폼이 고른 재료·검사 결과는 `platform` 아래에 있다. 컴파일(2.7.0)과 조립 후보(assembleDesign)가 같은 함수로 만든다.
 */
export function platformManifest(b, r) {
  return {
    blueprintVersion: BLUEPRINT_VERSION, catalogVersion: b.catalogVersion, theme: b.theme, mode: b.mode, pageType: b.pageType,
    axes: Object.fromEntries(styleAxes.map(k => [k, b[k]])),
    contrast: r.color.report.map(x => ({mode: b.mode, name: `${x.role}/${x.against}`, ratio: x.ratio, minimum: x.minimum})),
    platform: {
      contract: PLATFORM_CONTRACT_VERSION, materials: b.materials, selection: r.selection, styleMaterials: r.style,
      contrast: {components: r.components, derived: r.derivedPairs, styleMaterials: r.stylePairs}, derivedTokens: r.derived, reuses: r.reuses,
    },
    blueprint: b,
  };
}
