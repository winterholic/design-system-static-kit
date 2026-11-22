/**
 * 조립 플랫폼 계약(ADR 0012). 병렬 작업자(색·타이포·컴포넌트 패밀리·스타일 맥락·조립 엔진)가 공유하는 재료 모양과 관계 모양이다.
 *
 * - 재료 종류별 필드는 KIND_SPECS에 있다. 공통 필드(COMMON_FIELDS)는 모든 종류가 가진다.
 * - 관계(edge)는 재료 기록의 `relations`에 선언한다(선언한 쪽이 소유한다). 계산으로만 알 수 있는 호환성은 check(relations.mjs)로 둔다.
 * - 이 파일은 데이터와 검사만 둔다. 등록은 registry.mjs, 관계 조회는 relations.mjs, 추천은 recommend.mjs, 조립 단계는 pipeline.mjs.
 *
 * 기존 재료 계약(src/materials/contract.mjs, ADR 0011)과의 관계: ADR 0011 레지스트리는 "무엇이 등록됐는가"를 세는 목록이고,
 * 이 계약은 "무엇을 무엇과 함께 조립할 수 있는가"를 정한다. 기존 재료는 id로 참조해 재사용한다(예: `type-preset:tech`, `component:card-surface`).
 * 필드를 바꾸면 PLATFORM_CONTRACT_VERSION을 올리고 ADR 0012를 개정한다.
 */

export const PLATFORM_CONTRACT_VERSION = '0.3.0';

/** 플랫폼 재료 종류. 순서는 조립 파이프라인이 고르는 순서다. */
export const PLATFORM_KINDS = Object.freeze(['style-context', 'palette', 'subtoken-set', 'type-system', 'base-component', 'family', 'axis-value']);

/** 색 역할. 서브토큰 세트가 이 이름마다 값을 하나씩 만든다. css는 기존 컴파일 CSS가 읽는 변수 이름이다(부품 CSS를 고치지 않고 재사용하기 위해). */
export const COLOR_ROLES = Object.freeze({
  canvas: '--kit-canvas', surface: '--kit-surface', soft: '--kit-soft', sunken: '--kit-sunken',
  text: '--kit-text', muted: '--kit-muted', border: '--kit-border', rule: '--kit-rule',
  action: '--kit-action', onAction: '--kit-onAction', link: '--kit-link', focus: '--kit-focus',
  accent: '--kit-accent', onAccent: '--kit-onAccent',
  success: '--kit-success', warning: '--kit-warning', danger: '--kit-danger', info: '--kit-info',
  dangerSoft: '--kit-danger-soft', cardHover: '--kit-card-hover', cardActive: '--kit-card-active',
  disabledBg: '--kit-control-disabled-bg', disabledFg: '--kit-control-disabled-fg',
});
export const COLOR_ROLE_NAMES = Object.freeze(Object.keys(COLOR_ROLES));

/** 팔레트가 낼 수 있는 원색 자리. 서브토큰 세트는 이 자리 이름으로만 원색을 참조한다. */
export const PALETTE_SLOTS = Object.freeze(['brand', 'neutral', 'accent', 'success', 'warning', 'danger', 'info']);

/** 타이포 역할. 타이포 시스템이 역할마다 크기·굵기·행간·자간을 낸다. css는 기존 엔진 변수(--kit-t-*)다. */
export const TYPE_ROLES = Object.freeze({
  display: ['--kit-t-title', '--kit-t-app'], heading: ['--kit-t-heading'], sub: ['--kit-t-sub'], body: ['--kit-t-body'],
  small: ['--kit-t-small'], label: ['--kit-t-label'], caption: ['--kit-t-caption'], numeric: ['--kit-t-stat', '--kit-t-price'],
});
export const TYPE_ROLE_NAMES = Object.freeze(Object.keys(TYPE_ROLES));

/** 관계 종류. ADR 0012 §5. */
export const EDGE_TYPES = Object.freeze({
  requires: '고르면 상대도 있어야 한다(의존)',
  forbids: '함께 쓸 수 없다(금지, 양방향으로 읽는다)',
  prefers: '함께 쓰면 좋다(우선순위 가산)',
  avoids: '쓸 수는 있으나 피한다(우선순위 감산)',
  compatible: '호환을 명시한다(닫힌 종류 쌍에서 필요)',
});
/** 관계 조건에 쓸 수 있는 키. 조건은 모두 AND이고 값 목록은 OR이다. */
export const EDGE_CONDITION_KEYS = Object.freeze(['mode', 'context', 'density']);
/** 닫힌 종류 쌍: 이 쌍은 compatible 관계(선언 또는 계산)가 있어야만 함께 조립한다. 나머지 쌍은 forbids가 없으면 열려 있다. */
export const CLOSED_PAIRS = Object.freeze([['family', 'base-component']]);

export const LICENSES = Object.freeze(['internal', 'MIT']);
export const QUALITY = Object.freeze(['draft', 'implemented', 'verified']);

/** 모든 플랫폼 재료가 가지는 필드. type 문법은 validate 함수가 읽는다: string·number·boolean·array·object. 끝에 `?`가 붙은 필드는 선택이다(없어도 되고 null이어도 된다, 0.3.0). */
export const COMMON_FIELDS = Object.freeze({
  id: 'string', kind: 'string', version: 'string', label: 'string',
  contexts: 'array',     // 페이지 유형 또는 'any'
  tags: 'array',
  relations: 'array',    // 이 재료에서 나가는 관계(Edge)
  quality: 'object',     // {status: QUALITY, evidence: ['tests/<file>:<line>']}
  source: 'object',      // {origin, license: LICENSES}
  reuses: 'array',       // 재사용하는 기존 재료 id(ADR 0011 레지스트리). 감사·이행 추적용
});

/**
 * 종류별 필드. 값 모양은 ADR 0012 §1~§4에 적는다.
 *   palette        seeds: {PALETTE_SLOTS: '#RRGGBB'}. 원색만 둔다. 역할(배경·글자·액션)은 정하지 않는다
 *   subtoken-set   needs: 쓰는 팔레트 자리. roles: {COLOR_ROLES: RoleRule}. 여러 팔레트에 재사용한다
 *   type-system    facePairing: 기존 type-preset id, roleScale: 기존 type-role-preset id, numerals
 *   style-context  axisPreferences: {축: [선호 순서]}, forbid: {축: [값]}. 팔레트·서체를 소유하지 않고 추천 우선순위만 준다
 *   base-component contract: 기존 컴포넌트 계약 id, render·styles: 기존 구현 모듈 진입점. 동작·구조·접근성·상태를 소유한다
 *   family         members: {base-component id: FamilyMember}, shape: {radius, elevation}, density. 시각 언어를 소유한다
 *   axis-value     axis: 스타일 축 이름, value: 그 축의 값. 페이지 축 값(셸·폭·밀도 등)이 관계(forbids)의 대상이 되게 하는 재료다(0.2.0, src/platform/axes.mjs)
 */
export const KIND_SPECS = Object.freeze({
  palette: Object.freeze({seeds: 'object', tone: 'string'}),
  // states·components·charts는 선택 필드다(0.3.0): 상호작용 상태, 컴포넌트 의미 토큰, 차트 색 역할의 파생 설계. 없으면 결합 엔진의 기본 설계를 쓴다.
  'subtoken-set': Object.freeze({needs: 'array', roles: 'object', modes: 'array', states: 'object?', components: 'object?', charts: 'object?'}),
  'type-system': Object.freeze({facePairing: 'string', roleScale: 'string', numerals: 'string'}),
  // purpose·forbidCombos·tendencies·media·layout은 선택 필드다(0.3.0). layout.navLimit와 axisPreferences.shell·width·density는 페이지 단계가 읽는다.
  'style-context': Object.freeze({axisPreferences: 'object', forbid: 'object', mood: 'array', purpose: 'string?', forbidCombos: 'array?', tendencies: 'object?', media: 'object?', layout: 'object?'}),
  'base-component': Object.freeze({contract: 'string', render: 'object', styles: 'object', dependencies: 'array'}),
  family: Object.freeze({members: 'object', shape: 'object', density: 'string', states: 'array'}),
  'axis-value': Object.freeze({axis: 'string', value: 'string'}),
});

/** 축 값 재료 id. `axis-value:<축>.<값>`. 스타일 축 값은 기존 카탈로그(src/catalog/axes.mjs)의 값 이름 그대로다. */
export const axisValueId = (axis, value) => `axis-value:${axis}.${value}`;

/**
 * 서브토큰 역할 규칙(RoleRule). 둘 중 하나다.
 *   {from: PALETTE_SLOT, light: step, dark: step, min?: {against: [role…], ratio}}   팔레트 자리의 램프 단계. min이 있으면 대비를 맞출 때까지 보정한다
 *   {on: role, min: number}                                                           그 역할 위에 놓이는 글자: 흰색 또는 램프 950 중 대비가 맞는 쪽
 *   {fixed: '#RRGGBB' | {from: PALETTE_SLOT, step, mix: {with: '#RRGGBB', ratio: 0~1}}, min?: {against, ratio}}   고정값(0.3.0): 흰 표면처럼 팔레트와 무관한 값, 또는 램프 단계를 어떤 색과 비율로 섞은 값. 계산은 결합 엔진(color.mjs) 몫
 * against에 적은 역할은 같은 세트에서 먼저 정의되어야 한다(순서 = 계산 순서).
 */
export const STEPS = Object.freeze(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']);

/**
 * 패밀리 구성원(FamilyMember): {preset: {축: 값}, open: [호출자가 고를 수 있는 축], needs: {tokens: ['--kit-*'], typeRoles: [TYPE_ROLE]}}.
 * preset과 open에 적은 축은 기반 컴포넌트 계약의 축이어야 하고, preset 값과 open 축의 모든 값 조합은 계약의 금지 조합 검사를 받는다.
 */
export const FAMILY_MEMBER_FIELDS = Object.freeze(['preset', 'open', 'needs']);

/** 관계(Edge) 하나. from은 선언한 재료 id로 채워진다. */
export const EDGE_FIELDS = Object.freeze({type: 'string', to: 'string', priority: 'number', reason: 'string', when: 'object?', evidence: 'string?'});

const TYPE_OF = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const fits = (spec, v) => { const opt = spec.endsWith('?'), t = opt ? spec.slice(0, -1) : spec; return (opt && v === null) || TYPE_OF(v) === t; };
export const ID_PATTERN = /^([a-z][a-z0-9-]*):([a-z0-9][a-z0-9.-]*)$/;
const HEX = /^#[0-9A-F]{6}$/;

/** 관계 하나 검사. 오류 목록을 돌려준다(빈 배열이면 통과). */
export function validateEdge(edge, path = '$') {
  const out = [], err = (code, p, message) => out.push({code, path: p, message});
  if (TYPE_OF(edge) !== 'object') return [{code: 'P_EDGE', path, message: '관계는 객체여야 합니다'}];
  for (const k of Object.keys(edge)) if (!Object.hasOwn(EDGE_FIELDS, k)) err('P_EDGE_FIELD', `${path}.${k}`, `모르는 관계 필드: ${k}`);
  for (const [k, spec] of Object.entries(EDGE_FIELDS)) if (!spec.endsWith('?') && !Object.hasOwn(edge, k)) err('P_EDGE_FIELD', `${path}.${k}`, `필수 관계 필드 없음: ${k}`);
  else if (Object.hasOwn(edge, k) && !fits(spec, edge[k])) err('P_EDGE_TYPE', `${path}.${k}`, `${k}는 ${spec}여야 합니다`);
  if (!Object.hasOwn(EDGE_TYPES, edge.type)) err('P_EDGE_KIND', `${path}.type`, `관계 종류는 ${Object.keys(EDGE_TYPES).join('·')} 중 하나입니다`);
  if (typeof edge.to === 'string' && !ID_PATTERN.test(edge.to)) err('P_EDGE_TO', `${path}.to`, `대상은 재료 id입니다: ${edge.to}`);
  if (typeof edge.priority === 'number' && !(Number.isInteger(edge.priority) && edge.priority >= 0 && edge.priority <= 100)) err('P_EDGE_PRIORITY', `${path}.priority`, '우선순위는 0~100 정수입니다');
  if (typeof edge.reason === 'string' && !edge.reason.trim()) err('P_EDGE_REASON', `${path}.reason`, '관계에는 이유가 필요합니다');
  for (const [k, v] of Object.entries(edge.when ?? {})) {
    if (!EDGE_CONDITION_KEYS.includes(k)) err('P_EDGE_WHEN', `${path}.when.${k}`, `조건 키는 ${EDGE_CONDITION_KEYS.join('·')}입니다`);
    else if (!Array.isArray(v) || !v.length || v.some(x => typeof x !== 'string')) err('P_EDGE_WHEN', `${path}.when.${k}`, '조건 값은 문자열 배열입니다');
  }
  return out;
}

/** 재료 한 장 검사(필드 모양과 종류별 규칙). 참조 무결성은 레지스트리가 등록 뒤에 본다. */
export function validatePlatformMaterial(m) {
  const out = [], err = (code, p, message) => out.push({code, path: p, message});
  if (TYPE_OF(m) !== 'object') return [{code: 'P_SHAPE', path: '$', message: '재료는 객체여야 합니다'}];
  const spec = KIND_SPECS[m.kind];
  if (!spec) return [{code: 'P_KIND', path: '$.kind', message: `모르는 종류: ${m.kind}. 허용: ${PLATFORM_KINDS.join(', ')}`}];
  const fields = {...COMMON_FIELDS, ...spec};
  for (const k of Object.keys(m)) if (!Object.hasOwn(fields, k)) err('P_FIELD', `$.${k}`, `${m.kind}에 없는 필드: ${k}`);
  for (const [k, t] of Object.entries(fields)) {
    if (!Object.hasOwn(m, k)) { if (!t.endsWith('?')) err('P_FIELD', `$.${k}`, `필수 필드 없음: ${k}`); }
    else if (!fits(t, m[k])) err('P_TYPE', `$.${k}`, `${k}는 ${t}여야 합니다`);
  }
  if (out.length) return out;
  const idm = ID_PATTERN.exec(m.id);
  if (!idm || idm[1] !== m.kind) err('P_ID', '$.id', `id는 \`${m.kind}:<name>\`입니다: ${m.id}`);
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) err('P_VERSION', '$.version', 'version은 semver입니다');
  if (!LICENSES.includes(m.source.license)) err('P_LICENSE', '$.source.license', `라이선스는 ${LICENSES.join('·')}만 등록합니다(권리 미확인 자료는 등록하지 않는다)`);
  if (!QUALITY.includes(m.quality.status)) err('P_QUALITY', '$.quality.status', `품질은 ${QUALITY.join('·')} 중 하나입니다`);
  if (m.quality.status === 'verified' && !m.quality.evidence?.some(x => /^tests\/[\w.-]+\.test\.mjs:\d+$/.test(x))) err('P_EVIDENCE', '$.quality.evidence', 'verified는 tests/<file>.test.mjs:<line> 근거가 필요합니다');
  m.relations.forEach((e, i) => out.push(...validateEdge(e, `$.relations[${i}]`)));
  if (m.kind === 'palette') {
    for (const s of Object.keys(m.seeds)) if (!PALETTE_SLOTS.includes(s)) err('P_PALETTE_SLOT', `$.seeds.${s}`, `팔레트 자리는 ${PALETTE_SLOTS.join('·')}입니다`);
    for (const [s, v] of Object.entries(m.seeds)) if (!HEX.test(v)) err('P_PALETTE_HEX', `$.seeds.${s}`, '원색은 대문자 #RRGGBB입니다');
    for (const s of ['brand', 'neutral']) if (!Object.hasOwn(m.seeds, s)) err('P_PALETTE_SLOT', `$.seeds.${s}`, `팔레트는 ${s} 원색이 있어야 합니다`);
  }
  if (m.kind === 'subtoken-set') {
    for (const s of m.needs) if (!PALETTE_SLOTS.includes(s)) err('P_SUBTOKEN_NEED', '$.needs', `모르는 팔레트 자리: ${s}`);
    const defined = new Set();
    for (const [role, rule] of Object.entries(m.roles)) {
      const p = `$.roles.${role}`;
      if (!COLOR_ROLE_NAMES.includes(role)) { err('P_SUBTOKEN_ROLE', p, `모르는 색 역할: ${role}`); continue; }
      if (rule.from !== undefined) {
        if (!m.needs.includes(rule.from)) err('P_SUBTOKEN_NEED', `${p}.from`, `needs에 없는 팔레트 자리: ${rule.from}`);
        for (const md of ['light', 'dark']) if (!STEPS.includes(rule[md])) err('P_SUBTOKEN_STEP', `${p}.${md}`, `램프 단계는 ${STEPS.join('·')}입니다`);
        for (const a of rule.min?.against ?? []) if (!defined.has(a)) err('P_SUBTOKEN_ORDER', `${p}.min.against`, `${a}는 이 역할보다 먼저 정의해야 합니다`);
      } else if (rule.fixed !== undefined) {
        const f = rule.fixed, bad = msg => err('P_SUBTOKEN_RULE', `${p}.fixed`, msg);
        if (typeof f === 'string') { if (!HEX.test(f)) bad('고정값은 대문자 #RRGGBB입니다'); }
        else if (TYPE_OF(f) === 'object') {
          if (!m.needs.includes(f.from)) err('P_SUBTOKEN_NEED', `${p}.fixed.from`, `needs에 없는 팔레트 자리: ${f.from}`);
          if (!STEPS.includes(f.step)) err('P_SUBTOKEN_STEP', `${p}.fixed.step`, `램프 단계는 ${STEPS.join('·')}입니다`);
          if (f.mix !== undefined && !(TYPE_OF(f.mix) === 'object' && HEX.test(f.mix.with) && typeof f.mix.ratio === 'number' && f.mix.ratio >= 0 && f.mix.ratio <= 1)) bad('mix는 {with: 대문자 #RRGGBB, ratio: 0~1}입니다');
        } else bad('fixed는 #RRGGBB 문자열 또는 {from, step, mix?} 객체입니다');
        for (const a of rule.min?.against ?? []) if (!defined.has(a)) err('P_SUBTOKEN_ORDER', `${p}.min.against`, `${a}는 이 역할보다 먼저 정의해야 합니다`);
      } else if (rule.on !== undefined) {
        if (!defined.has(rule.on)) err('P_SUBTOKEN_ORDER', `${p}.on`, `${rule.on}는 이 역할보다 먼저 정의해야 합니다`);
        if (typeof rule.min !== 'number') err('P_SUBTOKEN_RULE', `${p}.min`, 'on 규칙은 숫자 min(대비)이 필요합니다');
      } else err('P_SUBTOKEN_RULE', p, '역할 규칙은 from·on·fixed 중 하나입니다');
      defined.add(role);
    }
    for (const role of COLOR_ROLE_NAMES) if (!Object.hasOwn(m.roles, role)) err('P_SUBTOKEN_ROLE', `$.roles.${role}`, `색 역할 ${role}이 없습니다(세트는 모든 역할을 낸다)`);
  }
  if (m.kind === 'family') {
    for (const [base, member] of Object.entries(m.members)) {
      if (!ID_PATTERN.test(base) || !base.startsWith('base-component:')) err('P_FAMILY_MEMBER', `$.members.${base}`, '구성원 키는 base-component id입니다');
      for (const k of Object.keys(member)) if (!FAMILY_MEMBER_FIELDS.includes(k)) err('P_FAMILY_MEMBER', `$.members.${base}.${k}`, `모르는 구성원 필드: ${k}`);
      for (const t of member.needs?.typeRoles ?? []) if (!TYPE_ROLE_NAMES.includes(t)) err('P_FAMILY_TYPE', `$.members.${base}.needs.typeRoles`, `모르는 타이포 역할: ${t}`);
    }
  }
  return out;
}

/** 빈 필드를 채운 재료. 종류별 필드는 호출자가 채운다. */
export const definePlatformMaterial = input => ({
  version: '0.1.0', contexts: ['any'], tags: [], relations: [], quality: {status: 'draft', evidence: []},
  source: {origin: 'internal', license: 'internal'}, reuses: [], ...input,
});
