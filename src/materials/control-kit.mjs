/** 2.6.0 컴포넌트 재료(Button·Input·Card·Navigation·Modal·Tabs·Tooltip·Feedback)가 함께 쓰는 계약 도구.
 *
 *  - 속성은 개념별로 나눠 둔다: 외형(appearance)·모양(shape)·크기(size)·기능(function)·상태(state)·맥락(context). 하나가 다른 하나를 대신하지 않는다.
 *  - 금지 조합은 데이터(`forbidden`)로 선언하고, 렌더러·테스트·증거 페이지가 같은 목록을 읽는다.
 *  - 크기별 높이·좌우 패딩·간격·글자 역할·아이콘은 `CONTROL_SIZES`(typography.mjs)와 `SPACE` 토큰 이름(spacing.mjs)에서 읽는다. 이 파일은 px 값을 새로 정하지 않는다.
 *  - Core 파일이다: DOM 전역을 읽지 않는다(tests/core-boundary.test.mjs). 브라우저에서 도는 코드는 각 재료의 `attach*` 함수 하나이고, 문자열로 직렬화되므로 바깥 이름을 참조하지 않는다. */
import {defineMaterial} from './contract.mjs';
import {escapeHTML} from '../escape-html.mjs';
export {SIZES, sizeVars, sizeCSS, defaultControlSizeCSS} from './control-size.mjs';

export const e = escapeHTML;
export const SHAPES = Object.freeze(['square', 'soft', 'pill']);
export const CONCEPTS = Object.freeze(['appearance', 'shape', 'size', 'function', 'state', 'context']);
export const SAFE_ID = /^[a-z][a-z0-9-]*$/;

export class ContractError extends RangeError {
  constructor(contract, rules) {
    super(`${contract.id}: ${rules.map(r => `${r.id} (${r.why})`).join('; ')}`);
    this.name = 'ContractError'; this.code = rules[0].id; this.rules = rules;
  }
}

/** `axes`: 속성별 허용 값. `concepts`: 개념 → 속성 이름 목록(모든 속성이 정확히 한 개념에 속한다). `forbidden`: [{id, when: {속성: 값|값[]}, why}] — when의 모든 조건이 맞으면 거부. */
export function defineContract({id, label, axes, concepts, defaults, forbidden, states, transitions, inputFields = [], unsupported = [], pairs = [], tokenMap = {}}) {
  const attrs = Object.keys(axes), claimed = Object.values(concepts).flat();
  if (inputFields.some(f => typeof f !== 'string' || attrs.includes(f)) || new Set(inputFields).size !== inputFields.length) throw new Error(`${id}: inputFields must be unique names outside axes`);
  for (const c of Object.keys(concepts)) if (!CONCEPTS.includes(c)) throw new Error(`${id}: unknown concept ${c}`);
  for (const c of ['appearance', 'shape', 'size', 'function', 'state']) if (!concepts[c]?.length) throw new Error(`${id}: concept ${c} has no attribute`);
  if (claimed.length !== new Set(claimed).size || claimed.length !== attrs.length || attrs.some(a => !claimed.includes(a))) throw new Error(`${id}: every attribute belongs to exactly one concept`);
  for (const a of attrs) if (!Object.hasOwn(defaults, a) || !axes[a].includes(defaults[a])) throw new Error(`${id}: default for ${a}`);
  const seen = new Set();
  for (const r of forbidden) {
    if (seen.has(r.id) || !r.why) throw new Error(`${id}: forbidden rule ${r.id} needs a unique id and a why`);
    seen.add(r.id);
    for (const [a, v] of Object.entries(r.when)) for (const x of [v].flat()) if (!axes[a]?.includes(x)) throw new Error(`${id}: ${r.id} names ${a}=${x}, which is not a variant`);
  }
  for (const s of states) if (!s) throw new Error(`${id}: empty state`);
  return Object.freeze({
    id, label, version: '1.0.0', since: '2.6.0',
    axes: Object.freeze(Object.fromEntries(attrs.map(a => [a, Object.freeze([...axes[a]])]))),
    concepts: Object.freeze(Object.fromEntries(Object.entries(concepts).map(([c, v]) => [c, Object.freeze([...v])]))),
    defaults: Object.freeze({...defaults}), forbidden: Object.freeze(forbidden.map(r => Object.freeze({...r}))),
    states: Object.freeze([...states]), transitions: Object.freeze(transitions.map(t => Object.freeze({...t}))), inputFields: Object.freeze([...inputFields]), unsupported: Object.freeze([...unsupported]),
    pairs: Object.freeze(pairs.map(p => Object.freeze([...p]))), tokenMap: Object.freeze({...tokenMap}),
  });
}

const matches = (rule, props) => Object.entries(rule.when).every(([a, v]) => [v].flat().includes(props[a]));
export const violations = (contract, props) => contract.forbidden.filter(r => matches(r, props));

/** 속성 값 검사 + 기본값 채움. 모르는 속성·허용 밖의 값은 TypeError. 금지 조합은 ContractError. */
export function resolveProps(contract, input = {}) {
  for (const key of Object.keys(input ?? {})) if (!Object.hasOwn(contract.axes, key) && !contract.inputFields.includes(key)) throw new TypeError(`${contract.id}: unknown attribute ${key}`);
  const out = {};
  for (const a of Object.keys(contract.axes)) {
    const v = input[a] ?? contract.defaults[a];
    if (!contract.axes[a].includes(v)) throw new TypeError(`${contract.id}: ${a}=${JSON.stringify(v)} is not one of ${contract.axes[a].join(', ')}`);
    out[a] = v;
  }
  const hit = violations(contract, out);
  if (hit.length) throw new ContractError(contract, hit);
  return out;
}

/** 속성 값의 곱 전체(조합 수와 같은 집합). 금지 조합도 포함한다. */
export function* allCombinations(contract) {
  const names = Object.keys(contract.axes), pick = {};
  function* walk(i) {
    if (i === names.length) { yield {...pick}; return; }
    for (const v of contract.axes[names[i]]) { pick[names[i]] = v; yield* walk(i + 1); }
  }
  yield* walk(0);
}
export const legalCombinations = contract => [...allCombinations(contract)].filter(p => !violations(contract, p).length);
/** raw = `combinationsOf`가 세는 값, legal = 금지 조합을 뺀 값. 레지스트리의 속성 조합 수는 raw다. */
export function combinationStats(contract) {
  const all = [...allCombinations(contract)], legal = all.filter(p => !violations(contract, p).length);
  const perRule = Object.fromEntries(contract.forbidden.map(r => [r.id, all.filter(p => matches(r, p)).length]));
  return {raw: all.length, legal: legal.length, rejected: all.length - legal.length, perRule};
}
/** 허용 값 중 `keep`만 빼고 전부: 금지 조건을 "keep이 아니면"으로 쓸 때. */
export const except = (contract, attr, ...keep) => contract.axes[attr].filter(v => !keep.includes(v));

/** 모든 컴포넌트가 같은 방식으로 쓰는 조각: 스크린 리더 전용 글, 로딩 스피너, 포커스 링, 동작 줄이기. 스피너는 색이 아니라 회전과 부분 호(ring)로 진행을 보인다. */
export const baseStyles = `.kit-ctl-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.kit-ctl-spinner{display:inline-block;flex:none;width:var(--ctl-icon);height:var(--ctl-icon);border:2px solid currentColor;border-inline-end-color:transparent;border-radius:50%;animation:kit-ctl-spin var(--kit-dur,150ms) linear infinite;animation-duration:900ms}@keyframes kit-ctl-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.kit-ctl-spinner{animation:none;border-inline-end-color:currentColor;border-style:dotted}}`;
export const focusRing = (selector, offset = '2px') => `${selector}:is(:focus-visible,[data-force=focus]){outline:3px solid var(--kit-focus);outline-offset:${offset}}`;
/** 증거 페이지에서만 쓰는 미리보기: `data-force`는 :hover·:active·:focus-visible을 정지 화면에서 보이려는 속성이며 상태 변수가 아니다. */
export const hover = ':is(:hover,[data-force=hover])', active = ':is(:active,[data-force=active])';

/** CSS 문자열이 읽는 `--kit-*` 변수 목록(재료의 tokens). */
export const varsOf = css => [...new Set([...css.matchAll(/var\((--kit-[A-Za-z0-9-]+)/g)].map(m => m[1]))].sort();

/** 재료 한 장. 속성은 contract.axes가 그대로 variants다. */
export function componentMaterial(contract, {category = 'form-data-feedback', module, renderExport, key, styles, examples, a11y, responsive, validation, evidence, tags = [], ext, contexts = ['any'], dependencies = []}) {
  return defineMaterial({
    id: contract.id, kind: 'component', category, label: contract.label, since: contract.since, version: contract.version, contexts,
    render: {module, export: renderExport, key},
    variants: contract.axes, defaults: contract.defaults, tokens: varsOf(styles), dependencies,
    states: {values: contract.states, transitions: contract.transitions},
    responsive, a11y, validation, examples, quality: {status: 'verified', evidence},
    tags: [...tags, ...Object.entries(contract.concepts).map(([c, attrs]) => `${c}:${attrs.join('+')}`), ...contract.forbidden.map(r => `forbidden:${r.id}`), ...contract.unsupported.map(x => `unsupported:${x}`)],
    ext: {nodeType: contract.id.split(':')[1], group: ext.group, fields: Object.keys(contract.axes), required: ext.required},
  });
}

/** 대비 계산. 재료의 `pairs`([전경 변수, 배경 변수 또는 mix(…), 최소 대비, 이름])를 라이트·다크 토큰 값으로 풀어 검사한다. */
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const channel = v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; };
const luminance = hex => { const [r, g, b] = rgb(hex).map(channel); return .2126 * r + .7152 * g + .0722 * b; };
export const contrastRatio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mixHex = (a, pct, b) => '#' + rgb(a).map((v, i) => Math.round(v * pct / 100 + rgb(b)[i] * (100 - pct) / 100).toString(16).padStart(2, '0')).join('').toUpperCase();
/** `tokens`는 resolveColorTokens().tokens(키는 --kit- 뒤 이름). ref는 `--kit-name` 또는 `mix(--kit-a 10%, --kit-b)`(CSS color-mix in srgb와 같은 식). */
export function colorOf(tokens, ref) {
  const m = /^mix\((--kit-[A-Za-z-]+) (\d+)%, (--kit-[A-Za-z-]+)\)$/.exec(ref);
  const get = name => { const v = tokens[name.replace(/^--kit-/, '')]; if (!/^#[0-9A-Fa-f]{6}$/.test(v ?? '')) throw new Error(`no hex token for ${name}`); return v; };
  return m ? mixHex(get(m[1]), Number(m[2]), get(m[3])) : get(ref);
}
export const pairRatio = (tokens, [fg, bg]) => contrastRatio(colorOf(tokens, fg), colorOf(tokens, bg));
