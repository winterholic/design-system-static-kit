/**
 * 선택 가능성 판정. "이 문서에서 이 선택을 하면 연산이 받아들이는가"를 연산 자체로 답한다.
 *
 * UI(Studio)와 호출자는 자식 수 한도, 부모·자식 계약, 페이지 규칙, 금지 조합, 구성 호환을 따로 복제하지 않는다.
 * 후보 하나마다 실제 연산(insertNode, setTheme, setPalette, setAppearance, setLayoutVariant)을 입력 doc 사본에 적용해 보고
 * 결과(ok, errors)를 돌려준다. 연산은 입력을 바꾸지 않으므로 이 함수들도 순수하다. 규칙이 바뀌어도 이 파일은 바뀔 이유가 없다.
 *
 * 돌려주는 errors는 연산이 거부할 때 내는 구조화 오류 그대로이고, 사용자가 고를 수 없는 이유를 보여 줄 때 쓴다.
 */
import {nodeSpecs, themes, palettes, axes, styleAxes} from '../catalog.mjs';
import {nodeSpecAt, nodeTypesAt, nodeTypeKnown} from '../catalog/node-extensions.mjs';
import {insertNode, setTheme, setPalette, setAppearance, setLayoutVariant, parsePath} from './ops.mjs';

const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const verdict = r => ({ok: r.ok, errors: r.ok ? [] : r.errors});

// ---------------------------------------------------------------- 부품 추가

/**
 * 부품 type 하나를 삽입할 때 쓰는 기본 노드. spec.example이 없는 부품(tab, lane, task, plan)은 다른 부품의 example 안에 든 같은 type의 첫 노드를 쓴다.
 * version은 카탈로그 버전이다. 생략하면(2.5.0 이하와 같다) 기본 부품만 알고, 2.6.0에서만 열리는 확장 부품(select-control, data-table)은 version이 2.6.0 이상일 때 돌려준다.
 */
const examples = new Map();
function findNested(node, type) {
  if (!isObject(node)) return null;
  if (node.type === type) return node;
  for (const child of node.children ?? []) { const hit = findNested(child, type); if (hit) return hit; }
  return null;
}
export function partExample(type, version) {
  if (typeof type !== 'string' || type === 'page' || !nodeTypeKnown(type, version)) return null;
  const key = `${type}@${Object.hasOwn(nodeSpecs, type) ? '' : version}`;
  if (!examples.has(key)) {
    let found = nodeSpecAt(type, version).example ?? null;
    if (!found) for (const spec of Object.values(nodeSpecs)) { found = findNested(spec.example, type); if (found) break; }
    examples.set(key, found);
  }
  const found = examples.get(key);
  return found ? structuredClone(found) : null;
}

/** 삽입 후보가 될 수 있는 기본 부품 type 목록(카탈로그 순서, 2.5.0 이하와 같다). 페이지 루트는 후보가 아니다. 버전이 있는 문서의 후보는 `partTypesAt`. */
export const partTypes = Object.freeze(Object.keys(nodeSpecs).filter(t => t !== 'page'));
/** 카탈로그 버전이 받아들이는 삽입 후보. 2.6.0 문서에는 기본 부품 뒤에 확장 부품이 붙고, 2.4.0·2.5.0 문서는 `partTypes`와 같다. */
export const partTypesAt = version => Object.freeze(nodeTypesAt(version).filter(t => t !== 'page'));

/** 위치 하나(부모 경로, index)에 삽입할 수 있는 부품과 없는 부품. 경로 표기와 index 의미는 insertNode와 같다(index 생략은 끝). 후보는 doc.catalogVersion이 정한다. */
export function insertableParts(doc, args = {}) {
  const {parent = [], index} = args;
  const parsed = parsePath(parent);
  const version = isObject(doc) ? doc.catalogVersion : undefined, candidates = partTypesAt(version);
  const none = reason => ({ok: false, parent, index: index ?? null, accepted: [], rejected: candidates.map(type => ({type, errors: [reason]})), reason});
  if (parsed.error || !isObject(doc)) return none({code: 'PATH_INVALID', path: '$args.parent', message: parsed.error ?? 'doc은 Blueprint 객체여야 합니다.', hint: '예: [] (페이지) 또는 [1] (최상위 두 번째 노드)'});
  const accepted = [], rejected = [];
  for (const type of candidates) {
    const node = partExample(type, version);
    if (!node) { rejected.push({type, errors: [{code: 'NO_EXAMPLE', path: '$args.node', message: `${type}에는 삽입할 기본 노드가 없습니다.`, hint: '이 부품은 부모 부품을 추가할 때 함께 들어갑니다.'}]}); continue; }
    const r = insertNode(doc, {parent, node, ...(index === undefined ? {} : {index})});
    if (r.ok) { const spec = nodeSpecAt(type, version); accepted.push({type, label: spec.label, group: spec.group}); }
    else rejected.push({type, errors: r.errors});
  }
  return {ok: true, parent, index: index ?? null, accepted, rejected, reason: null};
}

/**
 * 선택한 노드 기준 두 위치의 삽입 후보. inside는 선택한 노드의 마지막 자식으로, after는 선택한 노드 바로 뒤 형제로 넣는다.
 * 페이지 루트([])에는 after가 없다(형제가 없으므로 accepted가 비어 있다).
 */
export function addPlacements(doc, path = []) {
  const inside = insertableParts(doc, {parent: path});
  const after = path.length ? insertableParts(doc, {parent: path.slice(0, -1), index: path.at(-1) + 1}) : {ok: false, parent: [], index: null, accepted: [], rejected: [], reason: null};
  return {inside, after};
}

// ---------------------------------------------------------------- 디자인 선택

const objectDoc = doc => isObject(doc);
const all = (doc, ids, run) => ids.map(id => ({id, ...(objectDoc(doc) ? verdict(run(id)) : {ok: false, errors: []})}));

/** 테마 선택. 현재 팔레트·내비를 그대로 두고 setTheme이 받아들이는 테마만 ok다(palette 기본은 'keep'). */
export const themeChoices = (doc, {palette = 'keep'} = {}) => all(doc, Object.keys(themes), theme => setTheme(doc, {theme, palette}));

/** 현재 테마의 변형 선택. [{id, ok, errors}]. id가 null인 항목은 "기본"(변형 없음)이다. */
export function themeVariantChoices(doc, {palette = 'keep'} = {}) {
  const theme = objectDoc(doc) ? themes[doc.theme] : null;
  if (!theme) return [];
  return [null, ...theme.variants.map(v => v.id)].map(id => ({id, ...verdict(setTheme(doc, {theme: doc.theme, palette, ...(id ? {variant: id} : {})}))}));
}

/** 팔레트 선택. setPalette가 받아들이는 팔레트만 ok다. */
export const paletteChoices = doc => all(doc, Object.keys(palettes), palette => setPalette(doc, {palette}));

/** 문서 색 모드 선택. */
export const modeChoices = doc => all(doc, axes.mode, mode => setAppearance(doc, {mode}));

/** 스타일 축 선택. {축: [{id: 값, ok, errors}]}. 현재 값은 변화 없음으로 ok다. */
export const axisChoices = doc => Object.fromEntries(styleAxes.map(axis => [axis, all(doc, axes[axis], value => setAppearance(doc, {axes: {[axis]: value}}))]));

/**
 * 구성 변형 선택. slots는 [{id, options: [{id}]}]. 결과는 {슬롯: [{id, ok, relocate, errors}]}.
 * ok는 콘텐츠를 그대로 두고 적용할 수 있다는 뜻이다. 히어로 facts처럼 둘 곳이 없어 거부되지만 relocate 정책으로는 받아들여지는 선택은
 * ok가 false이고 relocate가 true다(호출자가 옮김을 알리고 적용할 수 있다).
 */
export function layoutChoices(doc, slots = []) {
  return Object.fromEntries(slots.map(slot => [slot.id, slot.options.map(option => {
    if (!objectDoc(doc)) return {id: option.id, ok: false, relocate: false, errors: []};
    const args = {slot: slot.id, option: option.id};
    const plain = setLayoutVariant(doc, args);
    if (plain.ok) return {id: option.id, ok: true, relocate: false, errors: []};
    const moved = setLayoutVariant(doc, {...args, contentPolicy: 'relocate'});
    return {id: option.id, ok: false, relocate: moved.ok, errors: plain.errors};
  })]));
}
