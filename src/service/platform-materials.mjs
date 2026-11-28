/**
 * 플랫폼 재료 질의·추천·호환성 조회(ADR 0012 §9.6). 조립(assembleDesign)이 쓰는 같은 레지스트리와 관계 그래프를 읽기 전용으로 연다.
 *
 *   listPlatformMaterials({kind?, context?, tag?, query?, fields?, limit?, cursor?})  등록된 플랫폼 재료 목록(요약)과 종류별 개수
 *   getPlatformMaterial({id})                                                        재료 한 장의 전체 기록과 나가고 들어오는 관계(근거 포함)
 *   recommendMaterials({kind, context?, mode?, density?, styleContext?, selected?, fit?})  후보를 점수 순으로(ranked)와 막힌 후보와 이유(blocked)
 *   checkCompatibility({ids, context?, mode?, density?})                             재료 묶음의 호환성: ok, 위반(code·reason), 적용된 관계, 계산 관계 결과
 *
 * 구형 재료 질의(listMaterials·getMaterial, src/service/materials.mjs)는 2.6.0 카탈로그 재료 1,066개를 다루고 이 함수들은 조립 플랫폼 재료(팔레트·세트·서체·패밀리·스타일 재료·축 값)를 다룬다.
 * 던지지 않는 같은 봉투를 돌려준다.
 */
import {PLATFORM_KINDS} from '../platform/contract.mjs';
import {recommend} from '../platform/recommend.mjs';
import {platformEnv} from '../platform/compile.mjs';
import {assembleSpecimen} from '../platform/layouts.mjs';
import {bindType} from '../platform/type.mjs';
import {FACE_PAIRINGS, ROLE_SCALES, resolveRoleScale} from '../platform/data/type-materials.mjs';
import {MATERIAL_TYPE_PRESETS} from '../materials/typography.mjs';
import {TYPE_R2} from '../typography.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';
import {diagnostic} from './errors.mjs';

const LIMIT_DEFAULT = 50, LIMIT_MAX = 200;
const SUMMARY = ['id', 'kind', 'group', 'label', 'purpose', 'contexts', 'bases', 'tags', 'quality'];
const ALL = ['id', 'kind', 'group', 'label', 'purpose', 'version', 'contexts', 'bases', 'children', 'entry', 'visual', 'variants', 'props', 'defaults', 'content', 'forbidden', 'needs', 'states', 'interactions', 'responsive', 'a11y', 'pairs', 'parents', 'example', 'verification', 'css', 'sharedCss', 'tags', 'quality', 'source', 'reuses', 'relations', 'pattern', 'purposes', 'container', 'minContent', 'minCol', 'density', 'slots', 'bands', 'reorders', 'needsBand', 'rules', 'length', 'nesting'];
const list = xs => xs.join(', ');
const MODES = ['light', 'dark'], DENSITIES = ['compact', 'comfortable', 'spacious'];

const summaryOf = (m, fields) => Object.fromEntries(fields.map(f => [f, f === 'quality' ? m.quality.status : m[f]]));
const unknown = (path, id, kind) => diagnostic('UNKNOWN_MATERIAL', path, `등록되지 않은 플랫폼 재료: ${String(id)}`, `listPlatformMaterials${kind ? `({kind: "${kind}"})` : ''}로 id를 조회하세요.`);

export function listPlatformMaterials(q = {}) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {kind: "palette"}')]);
    const badKey = checkKeys(q, ['kind', 'context', 'tag', 'query', 'fields', 'limit', 'cursor'], '$args');
    if (badKey) return fail([badKey]);
    if (q.kind !== undefined && (typeof q.kind !== 'string' || !PLATFORM_KINDS.includes(q.kind))) return fail([badRequest('$args.kind', `알 수 없는 kind: ${String(q.kind)}`, `허용값: ${list(PLATFORM_KINDS)}`)]);
    for (const k of ['context', 'tag', 'query']) if (q[k] !== undefined && (typeof q[k] !== 'string' || !q[k])) return fail([badRequest(`$args.${k}`, `${k}는 비지 않은 문자열이어야 합니다.`)]);
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
    const {registry} = platformEnv();
    const words = (q.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const matched = (q.kind ? registry.list(q.kind) : registry.list()).filter(m => (!q.context || m.contexts.includes('any') || m.contexts.includes(q.context)) && (!q.tag || m.tags.includes(q.tag))
      && words.every(w => `${m.id} ${m.label} ${m.tags.join(' ')}`.toLowerCase().includes(w)));
    const byKind = {};
    for (const m of matched) byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
    const page = matched.slice(offset, offset + limit);
    return ok(jsonClone({items: page.map(m => summaryOf(m, fields)), total: matched.length, nextCursor: offset + limit < matched.length ? 'o' + (offset + limit) : null, byKind}));
  });
}

export function getPlatformMaterial(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {id: "palette:static-kit"}')]);
    const badKey = checkKeys(q, ['id'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.id !== 'string' || !q.id) return fail([badRequest('$args.id', 'id가 필요합니다.', 'listPlatformMaterials로 재료 id를 조회하세요.')]);
    const {registry, graph} = platformEnv(), m = registry.get(q.id);
    if (!m) return fail([unknown('$args.id', q.id)]);
    const {render, styles, ...record} = m;
    return ok(jsonClone({...record, ...(render ? {render} : {}), ...(styles ? {styles} : {}), edges: {from: graph.from(m.id), to: graph.to(m.id)}}));
  });
}

/** 선택한 타이포 시스템 하나의 Specimen 표시 자료. 레지스트리 정의만 읽고 컴파일하지 않는다. */
export function getTypographySpecimen(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.')]);
    const badKey = checkKeys(q, ['id'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.id !== 'string' || !q.id) return fail([badRequest('$args.id', '타이포 시스템 id가 필요합니다.')]);
    const {registry} = platformEnv(), material = registry.get(q.id);
    if (!material || material.kind !== 'type-system') return fail([diagnostic('TYPE_SPECIMEN_KIND', '$args.id', `타이포 시스템이 아닙니다: ${q.id}`, 'type-system 재료 id를 지정하세요.')]);
    const binding = bindType(material);
    if (!binding.ok) return fail(binding.errors.map(error => diagnostic(error.code, '$args.id', error.message)));
    const faceId = material.facePairing;
    const face = FACE_PAIRINGS[faceId];
    const legacyFace = TYPE_R2[faceId?.replace(/^type-preset:/, '')];
    const scale = ROLE_SCALES[material.roleScale] ?? resolveRoleScale(material.roleScale);
    const legacyScale = MATERIAL_TYPE_PRESETS[material.roleScale?.replace(/^type-role-preset:/, '')];
    return ok(jsonClone({
      id: material.id,
      label: material.label,
      contexts: material.contexts,
      family: material.tags?.find(tag => ['general-product', 'enterprise', 'finance', 'developer', 'marketing', 'editorial', 'commerce', 'mobile', 'education', 'experimental'].includes(tag)) ?? material.tags?.[0] ?? 'general-product',
      facePairing: {id: faceId, label: face?.label ?? legacyFace?.label ?? faceId},
      roleScale: {id: material.roleScale, label: scale?.label ?? legacyScale?.label ?? material.roleScale},
      density: scale?.density ?? legacyScale?.density ?? 'comfortable',
      numerals: material.numerals,
      roles: binding.roles27,
    }));
  });
}

const ctxOf = (q, path) => {
  for (const [k, allowed] of [['mode', MODES], ['density', DENSITIES]]) if (q[k] !== undefined && !allowed.includes(q[k])) return badRequest(`${path}.${k}`, `${k}는 ${list(allowed)} 중 하나입니다.`);
  if (q.context !== undefined && (typeof q.context !== 'string' || !q.context)) return badRequest(`${path}.context`, 'context는 페이지 유형 문자열입니다.', 'listCatalog({kind:"pageTypes"})의 id입니다.');
  return null;
};
const idList = (value, path, registry) => {
  if (!Array.isArray(value)) return badRequest(path, '재료 id 문자열의 배열이어야 합니다.');
  const i = value.findIndex(x => typeof x !== 'string' || !registry.has(x));
  return i >= 0 ? unknown(`${path}[${i}]`, value[i]) : null;
};

export function recommendMaterials(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {kind: "palette", context: "dashboard"}')]);
    const badKey = checkKeys(q, ['kind', 'context', 'mode', 'density', 'styleContext', 'selected', 'fit'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.kind !== 'string' || !PLATFORM_KINDS.includes(q.kind)) return fail([badRequest('$args.kind', `알 수 없는 kind: ${String(q.kind)}`, `허용값: ${list(PLATFORM_KINDS)}`)]);
    const bad = ctxOf(q, '$args');
    if (bad) return fail([bad]);
    const {registry, graph} = platformEnv();
    if (q.styleContext !== undefined && (typeof q.styleContext !== 'string' || registry.get(q.styleContext)?.kind !== 'style-context')) return fail([unknown('$args.styleContext', q.styleContext, 'style-context')]);
    if (q.selected !== undefined) { const e = idList(q.selected, '$args.selected', registry); if (e) return fail([e]); }
    if (q.fit !== undefined && typeof q.fit !== 'boolean') return fail([badRequest('$args.fit', 'fit은 true 또는 false입니다.')]);
    const r = recommend(registry, graph, {kind: q.kind, context: q.context, mode: q.mode, density: q.density, styleContext: q.styleContext ?? null, selected: q.selected ?? [], fit: q.fit ?? false});
    return ok(jsonClone(r));
  });
}

export function checkCompatibility(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', '예: {ids: ["palette:static-kit", "subtoken-set:standard"]}')]);
    const badKey = checkKeys(q, ['ids', 'context', 'mode', 'density'], '$args');
    if (badKey) return fail([badKey]);
    const {registry, graph} = platformEnv();
    const e = idList(q.ids, '$args.ids', registry);
    if (e) return fail([e]);
    if (q.ids.length < 2) return fail([badRequest('$args.ids', '호환성은 재료 둘 이상으로 확인합니다.')]);
    const bad = ctxOf(q, '$args');
    if (bad) return fail([bad]);
    const r = graph.evaluate(q.ids, {...(q.context ? {context: q.context} : {}), ...(q.mode ? {mode: q.mode} : {}), ...(q.density ? {density: q.density} : {})});
    return ok(jsonClone(r));
  });
}

/** 레이아웃 재료 하나의 표본 조립(apps/web 컴포넌트 상세 내보내기 등이 호출). */
export function assembleLayoutSpecimen(layoutId, options = {}) {
  return assembleSpecimen(platformEnv(), layoutId, options);
}

