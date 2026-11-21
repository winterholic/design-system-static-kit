/**
 * 재료 한 장의 검사(validateMaterial)와 등록된 전체의 참조 검사(validateGraph).
 * 오류는 {code, path, message}. 보정하지 않는다: 값을 고치거나 기본값을 넣지 않고 거부만 한다.
 */
import {FIELDS, CATEGORIES, CONTEXTS, QUALITY, RESPONSIVE, LICENSES, ID_PATTERN, SEMVER, MATERIAL_CATALOG_VERSION, qualityRank, isCompletePreset} from './contract.mjs';
import {VERSION_ORDER} from '../catalog/expression.mjs';

/** 재료가 선언할 수 있는 since. 계획된 2.6.0까지. */
export const MATERIAL_VERSIONS = Object.freeze([...VERSION_ORDER, ...(VERSION_ORDER.includes(MATERIAL_CATALOG_VERSION) ? [] : [MATERIAL_CATALOG_VERSION])]);

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function typeOk(value, type) {
  const nullable = type.endsWith('?'), base = nullable ? type.slice(0, -1) : type;
  if (value === null) return nullable;
  if (base === 'any') return value !== undefined;
  if (base === 'array') return Array.isArray(value);
  if (base === 'object') return isObj(value);
  return typeof value === base;
}

/**
 * kind: 이 재료의 종류 정의(contract.defineKind). 레지스트리가 넘긴다.
 * 결과: 오류 배열. 비면 통과.
 */
export function validateMaterial(m, kind) {
  const errors = [], err = (code, path, message) => errors.push({code, path, message});
  if (!isObj(m)) return [{code: 'M_TYPE', path: '$', message: '재료는 객체여야 합니다.'}];
  for (const [field, type] of Object.entries(FIELDS)) {
    if (!Object.hasOwn(m, field)) err('M_REQUIRED', '$.' + field, `필수 필드 ${field}가 없습니다(값이 없으면 null·빈 값으로 둡니다).`);
    else if (!typeOk(m[field], type)) err('M_TYPE', '$.' + field, `${field}는 ${type}이어야 합니다.`);
  }
  for (const field of Object.keys(m)) if (!Object.hasOwn(FIELDS, field)) err('M_UNKNOWN_KEY', '$.' + field, `알 수 없는 필드 ${field}. 종류별 값은 ext에 둡니다.`);
  if (errors.length) return errors;

  const idMatch = ID_PATTERN.exec(m.id);
  if (!idMatch) err('M_ID', '$.id', `id는 <kind>:<name> 형식이어야 합니다: ${m.id}`);
  else if (idMatch[1] !== m.kind) err('M_ID', '$.id', `id 접두사(${idMatch[1]})가 kind(${m.kind})와 다릅니다.`);
  if (!SEMVER.test(m.version)) err('M_VERSION', '$.version', `version은 semver(x.y.z)여야 합니다: ${m.version}`);
  if (!MATERIAL_VERSIONS.includes(m.since)) err('M_SINCE', '$.since', `since는 ${MATERIAL_VERSIONS.join(', ')} 중 하나여야 합니다.`);
  if (!kind) err('M_KIND', '$.kind', `등록되지 않은 종류: ${m.kind}`);
  if (!CATEGORIES.includes(m.category)) err('M_ENUM', '$.category', `알 수 없는 분류: ${m.category}`);
  else if (kind?.categories && !kind.categories.includes(m.category)) err('M_CATEGORY', '$.category', `${m.kind}는 ${kind.categories.join('·')} 분류만 씁니다.`);
  if (!m.contexts.length) err('M_CONTEXT', '$.contexts', '맥락이 하나 이상 필요합니다(모두면 any).');
  m.contexts.forEach((c, i) => { if (!CONTEXTS.includes(c)) err('M_CONTEXT', `$.contexts[${i}]`, `알 수 없는 맥락: ${c}`); });

  // 기본값과 속성: 기본값은 선언된 속성의 값 중 하나다.
  for (const [attr, values] of Object.entries(m.variants)) {
    if (!Array.isArray(values) || !values.length) err('M_VARIANTS', `$.variants.${attr}`, '속성 값은 비어 있지 않은 배열이어야 합니다.');
    else if (new Set(values.map(v => JSON.stringify(v))).size !== values.length) err('M_VARIANTS', `$.variants.${attr}`, '속성 값이 중복됩니다.');
  }
  for (const [attr, value] of Object.entries(m.defaults)) {
    const values = m.variants[attr];
    if (!Object.hasOwn(m.variants, attr)) err('M_DEFAULT', `$.defaults.${attr}`, `기본값 ${attr}가 variants에 없습니다.`);
    else if (Array.isArray(values) && !values.some(v => JSON.stringify(v) === JSON.stringify(value))) err('M_DEFAULT', `$.defaults.${attr}`, `기본값 ${JSON.stringify(value)}가 허용 값에 없습니다.`);
  }

  if (!Array.isArray(m.structure.parents)) err('M_STRUCTURE', '$.structure.parents', 'parents는 배열이어야 합니다.');
  const ch = m.structure.children;
  if (ch !== null) {
    if (!isObj(ch) || !Array.isArray(ch.allowed)) err('M_STRUCTURE', '$.structure.children', 'children은 null 또는 {allowed, min, max}입니다.');
    else if (!(Number.isInteger(ch.min) && Number.isInteger(ch.max) && ch.min >= 0 && ch.min <= ch.max)) err('M_STRUCTURE', '$.structure.children', 'children의 min ≤ max 정수여야 합니다.');
  }

  if (!Array.isArray(m.states.values) || !Array.isArray(m.states.transitions)) err('M_STATES', '$.states', 'states는 {values: [], transitions: []}입니다.');
  else m.states.transitions.forEach((t, i) => {
    const path = `$.states.transitions[${i}]`;
    if (!isObj(t)) {
      err('M_STATES', path, '전이 항목은 {from, to, trigger} 객체여야 합니다.');
      return;
    }
    if (!m.states.values.includes(t.from) || !m.states.values.includes(t.to)) err('M_STATES', path, `전이 ${t.from}→${t.to}의 상태가 values에 없습니다.`);
    if (typeof t.trigger !== 'string' || !t.trigger) err('M_STATES', path + '.trigger', '전이에는 trigger가 필요합니다.');
  });
  if (!RESPONSIVE.includes(m.responsive.strategy)) err('M_ENUM', '$.responsive.strategy', `반응형 전략은 ${RESPONSIVE.join(', ')} 중 하나입니다.`);
  if (!Array.isArray(m.a11y.rules)) err('M_A11Y', '$.a11y.rules', 'a11y.rules는 배열입니다.');
  if (!Array.isArray(m.validation.rules) || !Array.isArray(m.validation.codes)) err('M_VALIDATION', '$.validation', 'validation은 {rules: [], codes: []}입니다.');

  // 품질 주장은 근거와 묶인다.
  const q = m.quality;
  if (!QUALITY.includes(q.status)) err('M_ENUM', '$.quality.status', `품질 상태는 ${QUALITY.join(', ')} 중 하나입니다.`);
  else {
    if (!Array.isArray(q.evidence)) err('M_QUALITY', '$.quality.evidence', 'evidence는 배열입니다.');
    else if (q.status === 'verified' && !q.evidence.some(e => /^tests\/[^:]+:\d+$/.test(e))) err('M_QUALITY', '$.quality.evidence', 'verified는 tests/<파일>:<줄> 근거가 하나 이상 필요합니다.');
    if (q.status === 'missing' && m.render !== null) err('M_QUALITY', '$.render', 'missing 재료는 render가 null이어야 합니다.');
    if (qualityRank(q.status) >= qualityRank('implemented') && m.render === null) err('M_QUALITY', '$.render', `${q.status} 재료는 구현 진입점(render)이 필요합니다.`);
  }
  if (m.render !== null && !(typeof m.render.module === 'string' && /^src\/.+\.mjs$/.test(m.render.module) && typeof m.render.export === 'string')) err('M_RENDER', '$.render', 'render는 {module: src/….mjs, export, key?}입니다.');

  // 출처: 외부 자료는 URL과 판정이 있어야 한다.
  const s = m.source;
  if (!LICENSES.includes(s.license)) err('M_ENUM', '$.source.license', `라이선스 판정은 ${LICENSES.join(', ')} 중 하나입니다.`);
  if (s.origin !== 'internal') {
    if (typeof s.url !== 'string' || !/^https:\/\//.test(s.url)) err('M_SOURCE', '$.source.url', '외부 출처는 https URL이 필요합니다.');
    if (typeof s.verdict !== 'string' || !s.verdict) err('M_SOURCE', '$.source.verdict', '외부 출처는 사용 판정(verdict)이 필요합니다.');
  }
  if (s.license === 'unverified' && s.origin === 'internal') err('M_SOURCE', '$.source.license', '내부 재료는 unverified일 수 없습니다.');

  if (kind) {
    for (const [field, type] of Object.entries(kind.ext)) {
      if (!Object.hasOwn(m.ext, field)) err('M_EXT', '$.ext.' + field, `${kind.id}의 필드 ${field}가 없습니다.`);
      else if (!typeOk(m.ext[field], type)) err('M_EXT', '$.ext.' + field, `${field}는 ${type}이어야 합니다.`);
    }
    for (const field of Object.keys(m.ext)) if (!Object.hasOwn(kind.ext, field)) err('M_EXT', '$.ext.' + field, `${kind.id}에 없는 필드: ${field}`);
    if (m.preset && !kind.presetCapable) err('M_PRESET', '$.preset', `${kind.id}는 프리셋이 될 수 없습니다(속성 조합은 프리셋이 아닙니다).`);
    if (m.preset && kind.presetCapable && !isCompletePreset(m, kind)) err('M_PRESET', '$.preset', '완성 프리셋은 모든 속성에 기본값이 있고 구현 이상 품질이어야 합니다.');
  }
  return errors;
}

/** 등록된 재료끼리의 참조: 의존·부모·자식 id가 실제로 있는가. byId: Map<id, material>. */
export function validateGraph(byId) {
  const errors = [];
  for (const m of byId.values()) {
    const check = (id, path) => { if (!byId.has(id)) errors.push({code: 'M_REFERENCE', path: `${m.id}${path}`, message: `없는 재료를 가리킵니다: ${id}`}); };
    m.dependencies.forEach((d, i) => check(d, `.dependencies[${i}]`));
    m.structure.parents.forEach((d, i) => check(d, `.structure.parents[${i}]`));
    m.structure.children?.allowed.forEach((d, i) => check(d, `.structure.children.allowed[${i}]`));
  }
  return errors;
}
