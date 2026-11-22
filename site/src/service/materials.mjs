/**
 * 재료 읽기 질의(웹 Materials 화면·Studio가 쓴다): listMaterials, getMaterial, getColorTokens, getTypePresets.
 * 모두 읽기 전용이고, 던지지 않는 같은 결과 봉투(envelope.mjs)를 돌려준다. 재료 레지스트리는 처음 부를 때 한 번 만든다.
 *
 * 이 파일만 `src/materials/`의 레지스트리를 읽는다(src/service/index.mjs는 이 파일을 다시 내보낼 뿐이다).
 * 컴파일 경로(validate·compiler)는 레지스트리를 읽지 않는다. 그쪽은 재료의 렌더 코드와 색·타이포 값만 쓴다.
 */
import {catalogRegistry, MATERIAL_TYPE_PRESETS, CATEGORIES, CONTEXTS, QUALITY} from '../materials/index.mjs';
import {renderRoleTypeCSS, ROLE_TYPE_MAP} from '../materials/typography.mjs';
import {resolveColorTokens, colorPaletteOptions, COLOR_PALETTE_IDS, COLOR_COMPONENT_CONTRACT, colorTokenUsage} from '../color-tokens.mjs';
import {nodeSince, nodeTypeKnown} from '../catalog/node-extensions.mjs';
import {atLeast, CATALOG_VERSION} from '../catalog.mjs';
import {colorPaletteOf} from '../catalog/expression.mjs';
import {diagnostic} from './errors.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';

const has = (obj, key) => Object.hasOwn(obj, key);
const list = names => names.join(', ');
let cached = null;
const registry = () => (cached ??= catalogRegistry());

/**
 * 권리 미확인 재료 종류(docs/materials/audit.md §3). 레지스트리에는 2.4.0·2.5.0 호환 검증용으로 남아 있지만
 * 2.6.0 재료 조회(목록·상세·의존 목록)에는 싣지 않는다. 색은 color-token 재료(내부 팔레트 static-kit)로만 고른다.
 */
const isPublicKind = kind => kind !== 'palette';
const publicDependencies = dependencies => dependencies.filter(id => !id.startsWith('palette:'));
const WITHHELD_HINT = '권리를 확인하지 못한 외부 팔레트는 2.6.0 재료로 제공하지 않습니다. 색은 kind "color-token" 재료(colorPalette: "static-kit")로 고르세요.';

const LIMIT_DEFAULT = 50, LIMIT_MAX = 200;
const SUMMARY = ['id', 'kind', 'category', 'label', 'since', 'quality', 'preset'];
const ALL = ['id', 'kind', 'category', 'label', 'version', 'since', 'contexts', 'quality', 'preset', 'tags', 'dependencies', 'combinations', 'blueprint'];

/**
 * 재료가 Blueprint의 어느 자리로 고르는지. 조립에 쓸 수 있는 재료인지 웹이 한눈에 알게 한다.
 *   {node, since}       부품 노드로 넣는다(since가 null이면 모든 카탈로그 버전).
 *   {field, value, since} 최상위 필드 값으로 고른다.
 *   null                Blueprint에서 직접 고르는 자리가 없다.
 */
function blueprintSlot(m) {
  const key = m.id.slice(m.kind.length + 1);
  switch (m.kind) {
    case 'component': {
      const node = m.ext?.nodeType ?? key;
      const since = nodeSince(node);
      return nodeTypeKnown(node, since ?? CATALOG_VERSION) ? {node, since} : null;
    }
    case 'chart-preset': return {node: 'chart', kind: m.ext?.chartKind ?? null, since: '2.6.0', resolver: 'resolveChartPreset'};
    case 'color-token': return {field: 'colorPalette', value: 'static-kit', since: '2.6.0'};
    case 'type-role-preset': return {field: 'typeRoles', value: key, since: '2.6.0'};
    case 'type-preset': return {field: 'typography', value: key, since: null};
    case 'theme': return {field: 'theme', value: key, since: null};
    case 'page-type': return {field: 'pageType', value: key, since: null};
    case 'axis': return {field: key, value: null, since: null};
    default: return null;
  }
}

const row = m => ({
  id: m.id, kind: m.kind, category: m.category, label: m.label, version: m.version, since: m.since, contexts: m.contexts, quality: m.quality.status,
  preset: registry().isPreset(m), tags: m.tags, dependencies: publicDependencies(m.dependencies), combinations: registry().combinations(m), blueprint: blueprintSlot(m),
});

/**
 * 재료 목록.
 *   q.kind, q.category, q.context, q.minQuality, q.tag  레지스트리 필터(모두 AND)
 *   q.preset    true면 완성 프리셋만, false면 프리셋이 아닌 재료만
 *   q.since     그 카탈로그 버전에서 처음 열리는 재료만(예 "2.6.0")
 *   q.query     id·이름·태그 낱말 검색(모든 낱말 포함)
 *   q.fields    나갈 필드(식별 필드 id는 항상). 없으면 요약 필드
 *   q.limit(1..200, 기본 50), q.cursor(이전 응답의 nextCursor)
 * 결과: {items, total, nextCursor, byKind}. byKind는 조건에 맞는 재료의 종류별 수다.
 */
export function listMaterials(q = {}) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {kind: "chart-preset"}')]);
    const badKey = checkKeys(q, ['kind', 'category', 'context', 'minQuality', 'tag', 'preset', 'since', 'query', 'fields', 'limit', 'cursor'], '$args');
    if (badKey) return fail([badKey]);
    const reg = registry(), kinds = reg.kinds().map(k => k.id).filter(isPublicKind);
    const enumCheck = (name, allowed) => (q[name] !== undefined && (typeof q[name] !== 'string' || !allowed.includes(q[name]))
      ? fail([diagnostic('BAD_REQUEST', `$args.${name}`, `알 수 없는 ${name}: ${String(q[name])}`, `허용값: ${list(allowed)}`)]) : null);
    if (!isPublicKind(q.kind)) return fail([diagnostic('BAD_REQUEST', '$args.kind', `제공하지 않는 kind: ${q.kind}`, WITHHELD_HINT)]);
    const bad = enumCheck('kind', kinds) ?? enumCheck('category', CATEGORIES) ?? enumCheck('context', CONTEXTS) ?? enumCheck('minQuality', QUALITY);
    if (bad) return bad;
    if (q.tag !== undefined && (typeof q.tag !== 'string' || !q.tag)) return fail([badRequest('$args.tag', 'tag는 비지 않은 문자열이어야 합니다.')]);
    if (q.preset !== undefined && typeof q.preset !== 'boolean') return fail([badRequest('$args.preset', 'preset은 true 또는 false입니다.')]);
    if (q.since !== undefined && (typeof q.since !== 'string' || !q.since)) return fail([badRequest('$args.since', 'since는 카탈로그 버전 문자열입니다.', '예: "2.6.0"')]);
    if (q.query !== undefined && typeof q.query !== 'string') return fail([badRequest('$args.query', 'query는 문자열이어야 합니다.')]);
    let fields = SUMMARY;
    if (q.fields !== undefined) {
      if (!Array.isArray(q.fields) || !q.fields.length) return fail([badRequest('$args.fields', 'fields는 비지 않은 문자열 배열이어야 합니다.', `허용 필드: ${list(ALL)}`)]);
      const i = q.fields.findIndex(f => typeof f !== 'string' || !ALL.includes(f));
      if (i >= 0) return fail([badRequest(`$args.fields[${i}]`, `재료 목록에 없는 필드: ${String(q.fields[i])}`, `허용 필드: ${list(ALL)}`)]);
      fields = [...new Set(['id', ...q.fields])];
    }
    const limit = q.limit === undefined ? LIMIT_DEFAULT : q.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > LIMIT_MAX) return fail([badRequest('$args.limit', `limit은 1~${LIMIT_MAX}의 정수입니다.`)]);
    let offset = 0;
    if (q.cursor !== undefined) {
      const m = typeof q.cursor === 'string' ? /^o(\d{1,9})$/.exec(q.cursor) : null;
      if (!m) return fail([badRequest('$args.cursor', 'cursor는 이전 응답의 nextCursor 값이어야 합니다.')]);
      offset = Number(m[1]);
    }
    const criteria = {...(q.kind && {kind: q.kind}), ...(q.category && {category: q.category}), ...(q.context && {context: q.context}), ...(q.minQuality && {minQuality: q.minQuality}), ...(q.tag && {tag: q.tag}), ...(q.preset !== undefined && {preset: q.preset})};
    const matched = reg.search(q.query ?? '', criteria).filter(m => isPublicKind(m.kind) && (q.since === undefined || m.since === q.since));
    const byKind = {};
    for (const m of matched) byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
    const page = matched.slice(offset, offset + limit);
    return ok({items: jsonClone(page.map(m => { const r = row(m); return Object.fromEntries(fields.map(f => [f, r[f]])); })), total: matched.length, nextCursor: offset + limit < matched.length ? 'o' + (offset + limit) : null, byKind});
  });
}

/** 재료 한 장의 전체 기록. 목록의 필드에 더해 계약 전체(변형·기본값·상태·반응형·접근성·검증·예시·ext)와 Blueprint에서 고르는 자리(blueprint)를 낸다. */
export function getMaterial(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {id: "component:select-control"}')]);
    const badKey = checkKeys(q, ['id'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.id !== 'string' || !q.id) return fail([badRequest('$args.id', 'id가 필요합니다.', 'listMaterials로 재료 id를 조회하세요.')]);
    const m = registry().get(q.id);
    if (!m) return fail([diagnostic('UNKNOWN_MATERIAL', '$args.id', `등록되지 않은 재료: ${q.id}`)]);
    if (!isPublicKind(m.kind)) return fail([diagnostic('UNKNOWN_MATERIAL', '$args.id', `제공하지 않는 재료: ${q.id}`, WITHHELD_HINT)]);
    return ok(jsonClone({...m, dependencies: publicDependencies(m.dependencies), preset: registry().isPreset(m), combinations: registry().combinations(m), blueprint: blueprintSlot(m)}));
  });
}

const LAYERS = ['primitive', 'semantic', 'state', 'component'];
/**
 * 색 토큰 해석 결과(src/color-tokens.mjs resolveColorTokens). 값은 모두 내부 팔레트에서 계산되고 호출자는 색 값을 넣지 못한다.
 *   q.palette(기본 "static-kit"), q.mode("light"|"dark"|"auto", 기본 "light")
 *   q.blueprint  문서를 주면 그 문서의 colorPalette와 mode를 쓴다(palette·mode와 함께 쓸 수 없다. catalogVersion이 2.6.0 미만이면 거부).
 *   q.layer      계층 하나만(primitive|semantic|state|component). 계층의 값과 그 값에서 나가는 참조만 낸다.
 * 결과: {palette, mode, options, seeds, layers, references, tokens(CSS 변수 이름→값), report(대비), components(부품별 상태·변수 계약), usage}.
 */
export function getColorTokens(q = {}) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {palette: "static-kit", mode: "dark"}')]);
    const badKey = checkKeys(q, ['palette', 'mode', 'blueprint', 'layer'], '$args');
    if (badKey) return fail([badKey]);
    let palette = q.palette ?? 'static-kit', mode = q.mode ?? 'light';
    if (q.blueprint !== undefined) {
      if (q.palette !== undefined || q.mode !== undefined) return fail([badRequest('$args.blueprint', 'blueprint는 palette·mode와 함께 쓸 수 없습니다.', '문서의 값을 쓰려면 blueprint만 주세요.')]);
      const b = q.blueprint;
      if (!isPlain(b)) return fail([badRequest('$args.blueprint', 'blueprint는 객체여야 합니다.')]);
      palette = colorPaletteOf(b);
      if (palette === undefined) return fail([diagnostic('VERSION_FIELD', '$args.blueprint.colorPalette', '색 재료는 카탈로그 2.6.0부터 제공됩니다.', 'catalogVersion을 2.6.0으로 올린 뒤 다시 조회하세요.')]);
      mode = b.mode;
    }
    if (typeof palette !== 'string' || !COLOR_PALETTE_IDS.includes(palette)) return fail([diagnostic('UNKNOWN_COLOR_PALETTE', '$args.palette', `알 수 없는 색 팔레트: ${String(palette)}`, `허용값: ${list(COLOR_PALETTE_IDS)}`)]);
    if (!['light', 'dark', 'auto'].includes(mode)) return fail([diagnostic('BAD_REQUEST', '$args.mode', `알 수 없는 모드: ${String(mode)}`, '허용값: light, dark, auto')]);
    if (q.layer !== undefined && (typeof q.layer !== 'string' || !LAYERS.includes(q.layer))) return fail([badRequest('$args.layer', `알 수 없는 계층: ${String(q.layer)}`, `허용값: ${list(LAYERS)}`)]);
    const r = resolveColorTokens({palette, mode});
    const layers = q.layer ? {[q.layer]: r.layers[q.layer]} : r.layers;
    const prefix = q.layer ? q.layer + '.' : '';
    const references = Object.fromEntries(Object.entries(r.references).filter(([id]) => !q.layer || id.startsWith(prefix)));
    return ok(jsonClone({
      palette, mode, options: colorPaletteOptions(), seeds: r.seeds, layers, references, tokens: r.tokens, report: r.report,
      modes: Object.fromEntries(Object.entries(r.modes).map(([m, g]) => [m, {tokens: g.tokens, report: g.report}])),
      components: COLOR_COMPONENT_CONTRACT, usage: colorTokenUsage(),
    }));
  });
}

const presetView = (id, withCss) => {
  const p = MATERIAL_TYPE_PRESETS[id];
  return {
    id, label: p.label, context: p.context, density: p.density, space: p.space, engine: p.engine,
    roles: p.roles, controls: p.controls, appliesTo: ROLE_TYPE_MAP, blueprint: {field: 'typeRoles', value: id, since: '2.6.0'},
    ...(withCss ? {css: renderRoleTypeCSS(id)} : {}),
  };
};
/**
 * 역할 타이포그래피 프리셋(Blueprint의 typeRoles로 고른다).
 *   q.id        하나만. 주면 컴파일 산출물에 들어가는 CSS(css)도 함께 낸다.
 *   q.blueprint 문서를 주면 그 문서가 고른 프리셋 하나를 낸다(id와 함께 쓸 수 없다. typeRoles가 없으면 거부).
 * 결과: {presets: [{id, label, context, density, engine, roles, controls, appliesTo, blueprint}]}. appliesTo는 역할이 덮어쓰는 엔진 변수(--kit-t-*)다.
 */
export function getTypePresets(q = {}) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {id: "erp"}')]);
    const badKey = checkKeys(q, ['id', 'blueprint'], '$args');
    if (badKey) return fail([badKey]);
    let id = q.id;
    if (q.blueprint !== undefined) {
      if (q.id !== undefined) return fail([badRequest('$args.blueprint', 'blueprint는 id와 함께 쓸 수 없습니다.')]);
      if (!isPlain(q.blueprint)) return fail([badRequest('$args.blueprint', 'blueprint는 객체여야 합니다.')]);
      if (!atLeast(q.blueprint.catalogVersion, '2.6.0') || q.blueprint.typeRoles === undefined) return fail([diagnostic('VERSION_FIELD', '$args.blueprint.typeRoles', '이 문서는 2.6.0 역할 타이포그래피(typeRoles)를 고르지 않았습니다.', 'catalogVersion을 2.6.0으로 올리고 typeRoles를 고른 뒤 다시 조회하세요.')]);
      id = q.blueprint.typeRoles;
    }
    if (id !== undefined && (typeof id !== 'string' || !has(MATERIAL_TYPE_PRESETS, id))) return fail([diagnostic('UNKNOWN_TYPE_PRESET', q.blueprint !== undefined ? '$args.blueprint.typeRoles' : '$args.id', `알 수 없는 역할 타이포그래피 프리셋: ${String(id)}`, `허용값: ${list(Object.keys(MATERIAL_TYPE_PRESETS))}`)]);
    const ids = id === undefined ? Object.keys(MATERIAL_TYPE_PRESETS) : [id];
    return ok(jsonClone({presets: ids.map(i => presetView(i, id !== undefined))}));
  });
}
