/**
 * 목적 패밀리 계약(컴포넌트 패밀리 작업 소유).
 *
 * 두 축을 분리한다.
 *   목적 패밀리(purpose family)  무엇을 위한 구조인가: KPI 카드, 사이드바, 고밀도 표, 확인 대화상자 …  마크업 구조와 배치가 다르다.
 *   시각 패밀리(family:*)         어떤 시각 언어인가: quiet, soft, bold, editorial.  src/platform/data/families.mjs
 * 둘은 서로의 값을 소유하지 않고 곱으로 조합한다. 개별로는 유효하나 함께 쓰면 안 되는 쌍은 `checkPurposeCombination`이 이유와 함께 거부한다.
 *
 * 기반 컴포넌트(src/materials)와의 책임 나눔(중복 구현 방지)
 *   기반 컴포넌트  계약 축, 상태 전이, 접근성 속성, 런타임(attach*), 셸 CSS. 목적 패밀리는 이것을 복사하지 않고 `ctx.base()`로 렌더해 쓴다.
 *   목적 패밀리    기반 컴포넌트를 어떤 구조와 배치로 묶는가(슬롯, 그리드, 반응형 재배치)와 그 구조에만 필요한 마크업·CSS.
 *
 * 기반 컴포넌트로 표현되지 않는 안쪽 구조(KPI 값, 가격, 상태 칩, 표 셀 등)는 목적 패밀리가 직접 마크업하고, 기반 컴포넌트의 data 속성과 런타임이 읽는 모양을 지킨다.
 */
import {escapeHTML} from '../../escape-html.mjs';
import {varsOf} from '../../materials/control-kit.mjs';
import {VISUAL_KEYS, VISUAL_LANGUAGES, visualMismatch, FAMILY_SCOPE_CSS} from './visual.mjs';

export const e = escapeHTML;
export const PURPOSE_GROUPS = Object.freeze(['card', 'button', 'navigation', 'overlay', 'form', 'table', 'feedback', 'info', 'media']);
export const PURPOSE_ID = /^purpose:([a-z]+)\.([a-z][a-z0-9-]*)$/;

/** 필수 필드와 모양. 이 목록이 "패밀리가 반드시 갖는 정보"다(ADR 0012 §4의 확장). */
export const PURPOSE_FIELDS = Object.freeze({
  id: 'string', group: 'string', label: 'string',
  purpose: 'string',          // 목적·맥락: 무엇을 위한 구조인가
  contexts: 'array',          // 어울리는 페이지 유형
  bases: 'array',             // 구성하는 기반 컴포넌트 id(실제 렌더에 쓰인다)
  entry: 'object',            // 렌더 진입점 {module, export}
  variants: 'object',         // 변형 축 {축: [값]} (목적 패밀리가 소유하는 구조 변형)
  props: 'object',            // 호출자가 여는 기반 컴포넌트 축 {축: [허용 값]}(좁힌 값)
  defaults: 'object',         // variants·props 기본값
  content: 'object',          // 콘텐츠 입력 {필드: {required?, type}}
  forbidden: 'array',         // [{id, when: {축: 값|[값]}, why}] 허용되지 않는 조합. when에는 `visual`(quiet·soft·bold·editorial)도 쓴다
  needs: 'object',            // {visual: 시각 언어가 지켜야 할 측정 조건}
  states: 'array',            // 보장하는 상태
  interactions: 'array',      // [{on, behavior, runtime?}] 실제 상호작용
  responsive: 'object',       // {strategy, breakpoints, behavior}
  a11y: 'object',             // {role, keyboard, rules, conditions}
  pairs: 'array',             // 이 패밀리가 직접 쓰는 색 쌍 [fg, bg, 최소 대비, 쓰임]
  parents: 'array',           // 허용 부모(슬롯)
  children: 'array',          // 허용 자식(기반 컴포넌트 id)
  example: 'object',          // 컴파일 가능한 예시 {variant, props, content}
  verification: 'object',     // 검증 결과 {status, evidence, measured}
});

const TYPE_OF = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const asArray = v => [v].flat();

/** 목적 패밀리 한 건을 만든다. css는 이 패밀리가 소유하는 구조 CSS, render는 (ctx) → HTML 문자열. */
export function definePurposeFamily(spec) {
  const {css = '', sharedCss = '', render, ...rest} = spec;
  const record = {version: '1.0.0', forbidden: [], needs: {}, pairs: [], interactions: [], verification: {status: 'implemented', evidence: [], measured: null}, ...rest};
  return Object.freeze({...record, css, sharedCss, render, tokens: Object.freeze(varsOf(sharedCss + css))});
}

/** 모양 검사. [{code, path, message}] */
export function validatePurposeFamily(f, {baseIds = null} = {}) {
  const out = [], err = (code, path, message) => out.push({code, path, message});
  for (const [k, t] of Object.entries(PURPOSE_FIELDS)) {
    if (!Object.hasOwn(f, k)) err('P_PURPOSE_FIELD', `$.${k}`, `필수 필드 없음: ${k}`);
    else if (TYPE_OF(f[k]) !== t) err('P_PURPOSE_TYPE', `$.${k}`, `${k}는 ${t}여야 합니다`);
  }
  if (typeof f.render !== 'function') err('P_PURPOSE_FIELD', '$.render', 'render 함수가 없습니다');
  if (typeof f.css !== 'string' || typeof f.sharedCss !== 'string') err('P_PURPOSE_FIELD', '$.css', 'css 문자열이 없습니다');
  if (out.length) return out;
  const m = PURPOSE_ID.exec(f.id);
  if (!m || m[1] !== f.group || !PURPOSE_GROUPS.includes(f.group)) err('P_PURPOSE_ID', '$.id', `id는 purpose:<group>.<name>이고 group은 ${PURPOSE_GROUPS.join('·')}입니다: ${f.id}`);
  if (!f.purpose.trim()) err('P_PURPOSE_PURPOSE', '$.purpose', '목적·맥락 설명이 비어 있습니다');
  if (!f.bases.length) err('P_PURPOSE_BASES', '$.bases', '구성하는 기반 컴포넌트가 하나 이상 있어야 합니다');
  if (baseIds) for (const b of [...f.bases, ...f.children]) if (!baseIds.includes(b)) err('P_PURPOSE_BASE', '$.bases', `등록되지 않은 기반 컴포넌트: ${b}`);
  for (const b of f.bases) if (!f.children.includes(b)) err('P_PURPOSE_CHILDREN', '$.children', `bases의 ${b}는 허용 자식에도 있어야 합니다`);
  if (typeof f.entry.module !== 'string' || typeof f.entry.export !== 'string') err('P_PURPOSE_ENTRY', '$.entry', 'entry는 {module, export}입니다');
  for (const [a, vs] of Object.entries({...f.variants, ...f.props})) {
    if (!Array.isArray(vs) || !vs.length) err('P_PURPOSE_AXIS', `$.variants.${a}`, `${a}의 허용 값이 비었습니다`);
    else if (!Object.hasOwn(f.defaults, a) || !vs.includes(f.defaults[a])) err('P_PURPOSE_DEFAULT', `$.defaults.${a}`, `${a} 기본값이 허용 값 안에 없습니다`);
  }
  for (const k of Object.keys(f.defaults)) if (!Object.hasOwn(f.variants, k) && !Object.hasOwn(f.props, k)) err('P_PURPOSE_DEFAULT', `$.defaults.${k}`, `축이 아닌 기본값: ${k}`);
  for (const k of Object.keys(f.variants)) if (Object.hasOwn(f.props, k)) err('P_PURPOSE_AXIS', `$.variants.${k}`, `${k}는 변형이면서 기반 축일 수 없습니다`);
  const axes = {...f.variants, ...f.props, visual: VISUAL_KEYS};
  const ids = new Set();
  for (const r of f.forbidden) {
    if (!r.id || !r.why || ids.has(r.id)) err('P_PURPOSE_FORBIDDEN', '$.forbidden', `금지 규칙에는 고유 id와 이유가 필요합니다: ${r.id}`);
    ids.add(r.id);
    for (const [a, v] of Object.entries(r.when ?? {})) for (const x of asArray(v)) if (!axes[a]?.includes(x)) err('P_PURPOSE_FORBIDDEN', `$.forbidden.${r.id}`, `${a}=${x}는 이 패밀리의 값이 아닙니다`);
  }
  for (const [name, spec] of Object.entries(f.content)) if (typeof spec.type !== 'string') err('P_PURPOSE_CONTENT', `$.content.${name}`, 'content 필드에는 type이 필요합니다');
  if (!f.states.length || !f.interactions.length) err('P_PURPOSE_STATES', '$.states', '상태와 상호작용을 적어야 합니다');
  for (const k of ['strategy', 'breakpoints', 'behavior']) if (f.responsive[k] === undefined) err('P_PURPOSE_RESPONSIVE', `$.responsive.${k}`, `반응형에는 ${k}가 필요합니다`);
  for (const k of ['role', 'keyboard', 'conditions']) if (f.a11y[k] === undefined) err('P_PURPOSE_A11Y', `$.a11y.${k}`, `접근성에는 ${k}가 필요합니다`);
  for (const k of ['variant', 'props', 'content']) if (f.example[k] === undefined) err('P_PURPOSE_EXAMPLE', `$.example.${k}`, `예시에는 ${k}가 필요합니다`);
  if (!f.parents.length) err('P_PURPOSE_PARENTS', '$.parents', '허용 부모가 비었습니다');
  return out;
}

/**
 * 개별 값 유효성(P_PURPOSE_VARIANT·P_PURPOSE_PROP·P_PURPOSE_CONTENT)과 조합 유효성(P_PURPOSE_COMBO·P_PURPOSE_VISUAL)을 따로 보고한다.
 * request: {visual: 'family:quiet'…, variant?, props?, content?}. 반환 {ok, errors: [{code, id?, message}], resolved: {variant, props, visual}}.
 */
export function checkPurposeCombination(family, {visual, variant = {}, props = {}, content = {}} = {}, {visuals = VISUAL_LANGUAGES} = {}) {
  const errors = [];
  const language = visuals[visual];
  if (!language) errors.push({code: 'P_PURPOSE_VISUAL_UNKNOWN', message: `시각 패밀리 ${visual}가 없습니다(허용: ${Object.keys(visuals).join(', ')})`});
  for (const [a, v] of Object.entries(variant)) {
    if (!Object.hasOwn(family.variants, a)) errors.push({code: 'P_PURPOSE_VARIANT', message: `${a}는 ${family.id}의 변형 축이 아닙니다(허용: ${Object.keys(family.variants).join(', ') || '없음'})`});
    else if (!family.variants[a].includes(v)) errors.push({code: 'P_PURPOSE_VARIANT', message: `${a}=${v}는 허용 값이 아닙니다(${family.variants[a].join('·')})`});
  }
  for (const [a, v] of Object.entries(props)) {
    if (!Object.hasOwn(family.props, a)) errors.push({code: 'P_PURPOSE_PROP', message: `${a}는 ${family.id}가 여는 기반 축이 아닙니다(허용: ${Object.keys(family.props).join(', ') || '없음'})`});
    else if (!family.props[a].includes(v)) errors.push({code: 'P_PURPOSE_PROP', message: `${a}=${v}는 허용 값이 아닙니다(${family.props[a].join('·')})`});
  }
  for (const k of Object.keys(content)) if (!Object.hasOwn(family.content, k)) errors.push({code: 'P_PURPOSE_CONTENT', message: `${k}는 ${family.id}의 콘텐츠 필드가 아닙니다(허용: ${Object.keys(family.content).join(', ')})`});
  for (const [k, s] of Object.entries(family.content)) if (s.required && (content[k] === undefined || content[k] === '' || (Array.isArray(content[k]) && !content[k].length))) errors.push({code: 'P_PURPOSE_CONTENT', message: `필수 콘텐츠 없음: ${k}`});
  const resolved = {variant: {}, props: {}, visual};
  for (const a of Object.keys(family.variants)) resolved.variant[a] = variant[a] ?? family.defaults[a];
  for (const a of Object.keys(family.props)) resolved.props[a] = props[a] ?? family.defaults[a];
  if (errors.length) return {ok: false, errors, resolved};
  const merged = {...resolved.variant, ...resolved.props, visual: language.key};
  for (const r of family.forbidden) if (Object.entries(r.when).every(([a, v]) => asArray(v).includes(merged[a]))) errors.push({code: 'P_PURPOSE_COMBO', id: r.id, message: `${r.id}: ${r.why}`});
  for (const why of visualMismatch(family.needs.visual, language)) errors.push({code: 'P_PURPOSE_VISUAL', message: `${family.id} × ${visual}: ${why}`});
  return {ok: !errors.length, errors, resolved};
}

/** 아이콘 SVG 규칙. 기반 컴포넌트 CSS는 `.kit-icon`을 읽기만 하고 정의하지 않는다(정의는 src/styles/base.mjs의 컴파일 CSS). 조립 출력에 같은 규칙을 둔다. 어긋나지 않는 것은 테스트가 본다.
 * 뒤에 붙는 FAMILY_SCOPE_CSS는 시각 패밀리 범위에서 포커스 링·라벨 글자 형태·표면 계층 그림자·표 셀 여백·유리 질감을 읽는 규칙이다(visual.mjs). 아이콘과 같은 시각 언어 CSS라 같은 곳에서 낸다. */
export const ICON_CSS = '.kit-icon{width:1.25em;height:1.25em;flex:none;vertical-align:-.22em}.kit-icon path{fill:none;stroke:currentColor;stroke-width:var(--kit-icon-sw);stroke-linecap:var(--kit-icon-cap);stroke-linejoin:var(--kit-icon-join)}.kit-icon path.c{fill:var(--kit-icon-fill)}' + FAMILY_SCOPE_CSS;
export const sel = (...names) => names.join(',');
