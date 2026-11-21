/**
 * 재료 계약(ADR 0011). 엔진이 조립하는 모든 디자인 재료가 같은 모양의 기록 하나를 가진다.
 * AI·사용자는 재료 id·프리셋·콘텐츠·구조만 고르고, 엔진은 이 기록으로 조립·검증한다.
 *
 * 이 파일은 데이터만 둔다. 검사는 validate.mjs, 등록·조회는 registry.mjs, 기존 카탈로그 연결은 adapters.mjs.
 * 새 종류(kind)는 defineKind + 레지스트리의 addKind로 더한다. 공통 필드는 바꾸지 않고 종류별 필드는 `ext`에 둔다.
 */
import {pageTypeIds} from '../catalog/pagetypes.mjs';

/** 계약 자체의 버전. 공통 필드를 바꾸면 올린다. 재료 하나의 버전(material.version)과 다르다. */
export const MATERIAL_CONTRACT_VERSION = '1.0.0';

/** 재료 계약을 처음 출력에 반영할 카탈로그 버전(ADR 0011). 아직 ACCEPTED_CATALOG_VERSIONS에 없다: 문법이 생기기 전에는 받지 않는다. */
export const MATERIAL_CATALOG_VERSION = '2.6.0';

/** 감사(docs/materials/audit.md)의 10분류 + 페이지·프로필. */
export const CATEGORIES = Object.freeze([
  'color', 'typography', 'spacing', 'shape', 'icon-media', 'layout-navigation',
  'form-data-feedback', 'chart', 'section-recipe', 'interaction-state',
  'page', 'profile',
]);

/** 사용 맥락 = 페이지 유형. 'any'는 모든 유형. */
export const CONTEXTS = Object.freeze(['any', ...pageTypeIds]);

/**
 * 품질 상태. 순서가 곧 등급이다.
 *   missing     자리만 있다(render 없음). 조립에 쓰지 않는다.
 *   enum-only   스키마·enum 값은 있으나 구분되는 구현이 없거나 확인되지 않았다.
 *   implemented 렌더러·CSS 구현이 있다.
 *   verified    구현 + 그 동작을 실패시킬 수 있는 테스트가 있다(evidence에 file:line).
 */
export const QUALITY = Object.freeze(['missing', 'enum-only', 'implemented', 'verified']);
export const qualityRank = status => QUALITY.indexOf(status);

/** 반응형 전략. unspecified는 아직 기록하지 않았다는 뜻이고 감사에서 결손으로 센다. */
export const RESPONSIVE = Object.freeze(['container', 'viewport', 'fluid', 'fixed', 'none', 'unspecified']);

/** 출처 라이선스 판정. unverified는 재사용 조건을 확인하지 못한 외부 자료다. */
export const LICENSES = Object.freeze(['MIT', 'internal', 'facts-only', 'unverified']);

/**
 * 공통 필드. type은 validate.mjs의 작은 검사기가 읽는다: string·number·boolean·array·object·any, `?`는 null 허용.
 * 모든 재료가 모든 필드를 가진다. 값이 없으면 null이나 빈 값으로 둔다(필드를 빼지 않는다).
 */
export const FIELDS = Object.freeze({
  id: 'string',            // `<kind>:<name>`
  version: 'string',       // 재료 자체의 semver
  kind: 'string',
  category: 'string',
  label: 'string',
  since: 'string',         // 처음 쓸 수 있는 카탈로그 버전
  contexts: 'array',       // CONTEXTS 부분집합
  render: 'object?',       // {module, export, key}. 구현 진입점. missing이면 null
  defaults: 'object',      // {속성: 기본값}
  variants: 'object',      // {속성: [값…]}. 조합 수는 이 곱이다
  tokens: 'array',         // 읽는 CSS 변수(--kit-*) 또는 토큰 이름
  dependencies: 'array',   // 다른 재료 id
  structure: 'object',     // {parents: [id], children: {allowed: [id], min, max} | null}
  states: 'object',        // {values: [...], transitions: [{from, to, trigger}]}
  responsive: 'object',    // {strategy, breakpoints?, note?}
  a11y: 'object',          // {rules: [R##], role?, keyboard?, contrast?}
  validation: 'object',    // {rules: [R##], codes: [오류 코드]}
  examples: 'array',       // 그대로 조립 가능한 입력 조각
  quality: 'object',       // {status, evidence: ['file:line']}
  source: 'object',        // {origin, license, url?, observed?, evidence?, verdict?}
  preset: 'boolean',       // 완성 프리셋인가(아래 isCompletePreset)
  tags: 'array',
  ext: 'object',           // 종류별 필드
});

/**
 * 종류 정의. ext: {필드: type}. categories: 이 종류가 쓸 수 있는 분류(null이면 전부).
 * presetCapable: 완성 프리셋이 될 수 있는 종류인가. 속성 조합만 가진 종류는 false다.
 * 새 종류는 레지스트리의 addKind(defineKind({...}))로 더한다. 전역 상태를 바꾸지 않는다.
 */
export function defineKind({id, label, ext = {}, categories = null, presetCapable = false}) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('kind id: ' + id);
  for (const c of categories ?? []) if (!CATEGORIES.includes(c)) throw new Error(`kind ${id}: unknown category ${c}`);
  return Object.freeze({id, label, ext: Object.freeze({...ext}), categories: categories && Object.freeze([...categories]), presetCapable});
}
export const BUILTIN_KINDS = Object.freeze([
  defineKind({id: 'component', label: '부품', ext: {nodeType: 'string', group: 'string', fields: 'array', required: 'array'}}),
  defineKind({id: 'palette', label: '팔레트(원색 묶음)', categories: ['color'], ext: {colors: 'array', brand: 'number', family: 'string', tone: 'string'}}),
  defineKind({id: 'axis', label: '스타일 축', ext: {axis: 'string', table: 'object?', bans: 'array'}}),
  defineKind({id: 'type-preset', label: '서체 프리셋', categories: ['typography'], presetCapable: true, ext: {head: 'string', text: 'string', ratio: 'number'}}),
  defineKind({id: 'theme', label: '테마(디자인 프로필)', categories: ['profile'], presetCapable: true, ext: {palettes: 'array', forbid: 'object', variants: 'array', covers: 'array'}}),
  defineKind({id: 'page-type', label: '페이지 유형', categories: ['page'], ext: {require: 'array', forbid: 'array', allow: 'array?', shells: 'array', widths: 'array?'}}),
  defineKind({id: 'template', label: '페이지 템플릿', categories: ['page'], presetCapable: true, ext: {pageType: 'string', theme: 'string', nodeCount: 'number'}}),
  defineKind({id: 'recipe', label: '디자인 레시피', categories: ['section-recipe'], ext: {pageTypes: 'array', templates: 'array', rules: 'array'}}),
  defineKind({id: 'layout-primitive', label: '배치 원형', categories: ['layout-navigation'], ext: {css: 'string'}}),
  defineKind({id: 'icon', label: '아이콘', categories: ['icon-media'], ext: {aliases: 'array'}}),
  // 후속 단계용 종류. 지금은 재료가 없고 계약만 있다.
  defineKind({id: 'color-token', label: '계층 색 토큰', categories: ['color'], ext: {layer: 'string', role: 'string', light: 'string?', dark: 'string?'}}),
  defineKind({id: 'chart-preset', label: '차트 프리셋', categories: ['chart'], presetCapable: true, ext: {chartKind: 'string', series: 'object', axes: 'object?'}}),
  defineKind({id: 'pattern', label: '레이아웃 패턴', categories: ['layout-navigation', 'section-recipe'], presetCapable: true, ext: {slots: 'array'}}),
]);

/** id는 `<kind>:<name>`. name은 소문자·숫자·하이픈·점. */
export const ID_PATTERN = /^([a-z][a-z0-9-]*):([a-z0-9][a-z0-9.-]*)$/;
export const SEMVER = /^\d+\.\d+\.\d+$/;
export const materialId = (kind, name) => `${kind}:${name}`;

/** 조합 수 = 각 속성 값 개수의 곱. 속성이 없으면 1. 조합은 프리셋이 아니다. */
export const combinationsOf = m => Object.values(m.variants ?? {}).reduce((n, values) => n * Math.max(values.length, 1), 1);

/**
 * 완성 프리셋: 고르면 더 정할 것이 없는 재료.
 * 프리셋 가능 종류 + preset:true + 모든 속성에 기본값 + 구현 이상 품질.
 */
export function isCompletePreset(m, kind) {
  if (!kind?.presetCapable || m.preset !== true) return false;
  if (qualityRank(m.quality?.status) < qualityRank('implemented')) return false;
  return Object.keys(m.variants ?? {}).every(k => Object.hasOwn(m.defaults ?? {}, k));
}

/** 빈 필드를 채운 재료 한 장. adapters와 후속 작업자가 같은 기본값을 쓰게 한다. */
export function defineMaterial(input) {
  return {
    version: '1.0.0', since: '2.1.0', contexts: ['any'], render: null, defaults: {}, variants: {}, tokens: [], dependencies: [],
    structure: {parents: [], children: null}, states: {values: [], transitions: []}, responsive: {strategy: 'unspecified'},
    a11y: {rules: []}, validation: {rules: [], codes: []}, examples: [], quality: {status: 'missing', evidence: []},
    source: {origin: 'internal', license: 'MIT'}, preset: false, tags: [], ext: {},
    ...input,
  };
}
