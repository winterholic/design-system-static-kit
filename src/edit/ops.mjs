/**
 * 문서 편집 연산. Studio·REST·MCP가 Blueprint를 바꾸는 유일한 경로다(ADR 0008).
 *
 * 모든 연산은 순수 함수 (doc, args) → {ok, doc, changes, errors, warnings, content}다.
 *   - 입력 doc은 변경하지 않는다. 성공하면 깊게 동결된 새 객체를, 실패하거나 바뀐 것이 없으면 입력 doc 그대로를 돌려준다.
 *     그래서 호출자는 이전 doc 참조를 쌓아 Undo/Redo를 만들 수 있다(changes가 비어 있으면 쌓지 않는다).
 *   - 결과는 공통 검증기(validateBlueprint)를 통과해야 한다. 통과하지 못하면 어떤 변경도 일어나지 않고 errors[{code, path, message, hint}]만 돌려준다.
 *   - 테마·팔레트·모드·구성 변형은 문서의 글·데이터를 건드리지 못한다. 연산 끝에서 지문(fingerprint.mjs)을 비교해 어긋나면 CONTENT_LOSS로 거부한다.
 *   - 연산은 Blueprint를 다시 생성하지 않는다. 템플릿 원본을 다시 적용하지도 않는다(replaceTemplate·resetDocument만 의도적으로 갈아엎는다).
 *
 * React·Next.js·DOM·Node 전용 모듈을 쓰지 않는다. 브라우저와 Node에서 같게 동작한다.
 */
import {themes, palettes, axes, styleAxes, templates, CATALOG_VERSION, composeBlueprint, repairAxes, navConflicts, applyLayoutChecked, layoutSlots, layoutSlotIds, migrateBlueprint} from '../catalog.mjs';
import {assessOption} from '../catalog/variant-contracts.mjs';
import {validateBlueprint} from '../validate.mjs';
// 검증기 오류 코드별 해결 방법(hint) 표는 서비스 계층의 한 모듈이 소유한다(ADR 0009, 결정 D1).
import {withHint} from '../service/errors.mjs';
import {contentFingerprint, contentDiff} from './fingerprint.mjs';

// ---------------------------------------------------------------- 공통 도구

const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const clone = x => structuredClone(x);

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

export function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObject(a) && isObject(b)) { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && deepEqual(a[k], b[k])); }
  return false;
}

/** 구조화 오류. 모든 오류는 코드·경로·메시지·해결 방법을 가진다. */
const err = (code, path, message, hint) => ({code, path, message, hint});

/** JSON 경로 조각 → 문자열: ['tree','children',1] → "$.tree.children[1]". */
export const pathString = segments => '$' + segments.map(s => (typeof s === 'number' ? `[${s}]` : '.' + s)).join('');

/**
 * 경로 해석. 두 가지 표기를 받는다.
 *   - 인덱스 배열 [1, 0]: tree의 children을 따라 내려간다(Studio의 선택 경로). []는 페이지 루트.
 *   - 문자열 "$.tree.children[1].items[0]", "$.chrome.nav[2]": 문서 루트부터의 JSON 경로.
 */
export function parsePath(path) {
  if (Array.isArray(path)) {
    if (!path.every(i => Number.isInteger(i) && i >= 0)) return {error: '인덱스 배열은 0 이상의 정수여야 합니다.'};
    return {segments: ['tree', ...path.flatMap(i => ['children', i])]};
  }
  if (typeof path !== 'string' || path[0] !== '$') return {error: '경로는 인덱스 배열이거나 "$"로 시작하는 문자열이어야 합니다.'};
  const segments = []; let rest = path.slice(1);
  const token = /^(?:\.([A-Za-z_][A-Za-z0-9_-]*)|\[(\d+)\])/;
  while (rest) {
    const m = token.exec(rest); if (!m) return {error: `경로를 읽을 수 없습니다: ${rest}`};
    const seg = m[1] ?? Number(m[2]);
    if (typeof seg === 'string' && FORBIDDEN_KEYS.has(seg)) return {error: `금지된 키: ${seg}`};
    segments.push(seg); rest = rest.slice(m[0].length);
  }
  return {segments};
}

function resolve(root, segments) {
  let value = root, parent = null;
  for (const seg of segments) {
    if (typeof seg === 'number' ? !Array.isArray(value) || seg >= value.length : !isObject(value) || !Object.hasOwn(value, seg)) return null;
    parent = value; value = value[seg];
  }
  return {value, parent, key: segments.at(-1)};
}

const argsError = (path, message, hint) => err('ARGS_INVALID', path, message, hint);
const failure = (doc, errors, warnings = []) => ({ok: false, doc, changes: [], errors, warnings, content: null});

// ---------------------------------------------------------------- 변경 기록

const CHANGE_LIMIT = 400;
/** 두 값의 구조 차이. 배열은 인덱스별로 비교한다. [{op:'add'|'remove'|'replace', path, before?, after?}]. */
export function diffDocs(before, after, path = '$', out = []) {
  if (out.length >= CHANGE_LIMIT || deepEqual(before, after)) return out;
  if (isObject(before) && isObject(after)) {
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const p = path + '.' + k;
      if (!Object.hasOwn(after, k)) out.push({op: 'remove', path: p, before: before[k]});
      else if (!Object.hasOwn(before, k)) out.push({op: 'add', path: p, after: after[k]});
      else diffDocs(before[k], after[k], p, out);
    }
  } else if (Array.isArray(before) && Array.isArray(after)) {
    // 길이가 다르면 앞뒤의 같은 항목을 먼저 걷어 내 중간 삽입·삭제 하나가 뒤 항목 전부의 변경으로 보이지 않게 한다.
    let head = 0, tail = 0;
    if (before.length !== after.length) {
      while (head < before.length && head < after.length && deepEqual(before[head], after[head])) head++;
      while (tail < before.length - head && tail < after.length - head && deepEqual(before.at(-1 - tail), after.at(-1 - tail))) tail++;
    }
    const b = before.slice(head, before.length - tail), a = after.slice(head, after.length - tail);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i >= a.length) out.push({op: 'remove', path: `${path}[${head + i}]`, before: b[i]});
      else if (i >= b.length) out.push({op: 'add', path: `${path}[${head + i}]`, after: a[i]});
      else diffDocs(b[i], a[i], `${path}[${head + i}]`, out);
    }
  } else out.push({op: 'replace', path, before, after});
  return out;
}

const warn = (code, path, message, extra = {}) => ({code, path, message, ...extra});
const fromRepair = r => r.code === 'SHELL_SUBSTITUTED'
  ? warn('SHELL_SUBSTITUTED', '$.shell', `내비를 그대로 보존하려고 셸을 ${r.from}에서 ${r.to}로 바꿨습니다.`, {from: r.from, to: r.to, hint: '다른 셸이 필요하면 내비 항목을 먼저 정리하세요.'})
  : warn('AXIS_REPAIRED', '$.' + r.axis, `${r.axis}: ${r.from} → ${r.to} (${r.rule === 'page-type' ? '페이지 유형 계약' : '금지 조합 ' + r.rule})`, {rule: r.rule, from: r.from, to: r.to});
const fromLayoutReport = r => r.code === 'DECORATION_DROPPED'
  ? warn(r.code, r.path, `히어로 변형이 쓰지 않는 장식 ${r.field}=${r.dropped}를 지웠습니다. 되돌리려면 Undo하세요.`, {field: r.field, dropped: r.dropped, grade: 'decoration'})
  : warn(r.code, r.path, `히어로 facts ${r.count}개를 ${r.to}의 지표 격자로 옮겼습니다.`, {to: r.to, count: r.count});

/**
 * 모든 연산의 마무리. 순서가 곧 보장이다: 검증 → 불변 조건 → 바뀐 것이 없는지 → 동결한 새 doc.
 * options.keep: 'exact'(name·chrome·tree가 글자 그대로 같아야 함) | 'content'(콘텐츠 지문이 같아야 함) | null.
 */
function finish(doc, draft, {warnings = [], keep = null, changes = null} = {}) {
  const verdict = validateBlueprint(draft);
  if (!verdict.valid) return failure(doc, verdict.errors.map(withHint), warnings);
  const base = doc ?? {}, before = contentFingerprint(base), after = contentFingerprint(draft);
  if (keep) {
    const diff = contentDiff(base, draft);
    const same = keep === 'exact' ? ['name', 'chrome', 'tree'].every(k => deepEqual(base[k], draft[k])) : !diff.missing.length && !diff.added.length;
    if (!same) {
      return failure(doc, [err('CONTENT_LOSS', '$.tree', `이 연산은 콘텐츠를 바꾸면 안 되는데 지문이 달라졌습니다(잃은 항목 ${diff.missing.length}개, 늘어난 항목 ${diff.added.length}개).`, '입력은 바뀌지 않았습니다. 재현 입력과 함께 Core 이슈로 남겨 주세요(코어의 불변 조건 위반).')], warnings);
    }
  }
  const content = {before, after, preserved: before.hash === after.hash};
  if (doc && deepEqual(doc, draft)) return {ok: true, doc, changes: [], errors: [], warnings: [...warnings, warn('NO_CHANGE', '$', '바뀐 것이 없습니다.')], content};
  return {ok: true, doc: deepFreeze(draft), changes: changes ?? diffDocs(base, draft), errors: [], warnings, content};
}

const notDoc = doc => (isObject(doc) ? null : failure(doc, [argsError('$', 'doc은 Blueprint 객체여야 합니다.', 'importBlueprint나 resetDocument로 문서를 먼저 만드세요.')]));
const notArgs = args => (isObject(args) ? null : [argsError('$args', 'args는 객체여야 합니다.', '예: {theme: "console"}')]);

// ---------------------------------------------------------------- 모양 연산(콘텐츠 불변)

const list = (items, n = 8) => items.slice(0, n).join(', ') + (items.length > n ? ` 외 ${items.length - n}개` : '');

/**
 * 테마를 바꾼다. 문서의 글·데이터·내비는 그대로 둔다(이름, chrome, tree가 글자 그대로 같아야 통과).
 * args: {theme, palette?: 'theme-default'(기본) | 'keep' | 팔레트 id, variant?: 테마 변형 id,
 *        axes?: 'theme'(기본, 테마 기본 축을 입힘) | 'keep'(축은 그대로, 테마 금지 값이면 거부),
 *        repair?: 'auto'(axes가 'theme'일 때 기본) | 'reject', navPolicy?: 'fit'(기본) | 'reject'}
 * 새 셸에 내비가 놓이지 않으면 'fit'은 내비를 보존하는 셸로 바꾸고(SHELL_SUBSTITUTED 경고), 그런 셸이 없으면 NAV_NO_SHELL로 거부한다. 내비를 자르지 않는다.
 */
export function setTheme(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const {theme: id, palette = 'theme-default', variant: variantId = null, axes: axesMode = 'theme'} = args;
  const repair = args.repair ?? (axesMode === 'theme' ? 'auto' : 'reject'), navPolicy = args.navPolicy ?? (repair === 'auto' ? 'fit' : 'reject');
  const errors = [];
  if (typeof id !== 'string' || !Object.hasOwn(themes, id)) errors.push(err('UNKNOWN_THEME', '$args.theme', `알 수 없는 테마: ${id}`, '허용 테마: ' + list(Object.keys(themes), 12)));
  if (!['theme', 'keep'].includes(axesMode)) errors.push(argsError('$args.axes', 'axes는 "theme" 또는 "keep"입니다.'));
  if (!['auto', 'reject'].includes(repair)) errors.push(argsError('$args.repair', 'repair는 "auto" 또는 "reject"입니다.'));
  if (!['fit', 'reject'].includes(navPolicy)) errors.push(argsError('$args.navPolicy', 'navPolicy는 "fit" 또는 "reject"입니다. 내비를 자르는 정책은 없습니다.'));
  const theme = errors.length ? null : themes[id];
  const variant = theme && variantId ? theme.variants.find(v => v.id === variantId) : null;
  if (theme && variantId && !variant) errors.push(err('UNKNOWN_THEME_VARIANT', '$args.variant', `${id} 테마에 없는 변형: ${variantId}`, '허용 변형: ' + list(theme.variants.map(v => v.id), 12)));
  const paletteId = palette === 'theme-default' ? theme?.palettes[0] : palette === 'keep' ? doc.palette : palette;
  if (theme && !Object.hasOwn(palettes, paletteId)) errors.push(err('UNKNOWN_PALETTE', '$args.palette', `알 수 없는 팔레트: ${paletteId}`, `"theme-default", "keep" 또는 팔레트 id. ${id} 테마의 팔레트: ${list(theme.palettes)}`));
  if (errors.length) return failure(doc, errors);

  const draft = clone(doc), report = [], warnings = [];
  draft.theme = id; draft.palette = paletteId;
  if (axesMode === 'theme') {
    const {mode: themeMode, ...style} = theme.defaults;
    Object.assign(draft, style, variant?.set ?? {});
    // 모드는 사용자의 화면 선택이라 유지한다. 테마가 금지하거나 변형이 모드를 정할 때만 바꾸고 알린다.
    const wanted = variant?.set?.mode ?? (theme.forbid.mode?.includes(doc.mode) ? themeMode : doc.mode);
    if (wanted !== doc.mode) warnings.push(warn('MODE_CHANGED', '$.mode', `${id} 테마가 mode=${doc.mode}를 허용하지 않아 ${wanted}로 바꿨습니다.`, {from: doc.mode, to: wanted}));
    draft.mode = wanted;
  }
  if (repair === 'auto') {
    repairAxes(draft, {report, nav: navPolicy === 'fit' ? 'fit' : 'keep'});
    warnings.push(...report.map(fromRepair));
    const stuck = navPolicy === 'fit' ? navConflicts(draft) : [];
    if (stuck.length) return failure(doc, [err('NAV_NO_SHELL', '$.chrome.nav', `내비를 보존하면서 놓을 수 있는 셸이 없습니다: ${stuck.map(c => c.message).join(' ')}`, '내비 항목 수·드롭다운 메뉴·그룹 라벨 중 하나를 정리한 뒤(updateNode·removeNode) 다시 시도하세요. 페이지 유형이 허용하는 셸만 후보입니다.')], warnings);
  }
  return finish(doc, draft, {warnings, keep: 'exact'});
}

/** 팔레트를 바꾼다. args: {palette}. 콘텐츠·축은 그대로다. */
export function setPalette(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  if (typeof args.palette !== 'string' || !Object.hasOwn(palettes, args.palette)) {
    const theme = themes[doc.theme];
    return failure(doc, [err('UNKNOWN_PALETTE', '$args.palette', `알 수 없는 팔레트: ${args.palette}`, theme ? `${doc.theme} 테마의 팔레트: ${list(theme.palettes)}. 전체 목록은 palettes의 키입니다.` : '팔레트 id는 palettes의 키입니다.')]);
  }
  const draft = clone(doc); draft.palette = args.palette;
  return finish(doc, draft, {keep: 'exact'});
}

/**
 * 모드와 스타일 축을 바꾼다. args: {mode?, axes?: {shell, density, …}, repair?: 'reject'(기본) | 'auto', navPolicy?: 'reject'(기본) | 'fit'}
 * 사용자가 직접 고른 값은 연산이 몰래 바꾸지 않는다. 금지 조합이면 거부하고(AXIS_BAN 등) 대안을 알려 주며, repair:'auto'를 줄 때만 대안 값을 적용한다.
 */
export function setAppearance(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const {mode, axes: picked = {}, repair = 'reject', navPolicy = 'reject'} = args, errors = [];
  if (!isObject(picked)) errors.push(argsError('$args.axes', 'axes는 {축: 값} 객체입니다.'));
  else for (const [k, v] of Object.entries(picked)) {
    if (!styleAxes.includes(k)) errors.push(err('UNKNOWN_AXIS', '$args.axes.' + k, `알 수 없는 축: ${k}`, '허용 축: ' + styleAxes.join(', ') + '. mode는 args.mode로 줍니다.'));
    else if (!axes[k].includes(v)) errors.push(err('ENUM', '$args.axes.' + k, `${k}=${v}는 카탈로그에 없습니다.`, `허용값: ${axes[k].join(', ')}`));
  }
  if (mode !== undefined && !axes.mode.includes(mode)) errors.push(err('ENUM', '$args.mode', `mode=${mode}는 카탈로그에 없습니다.`, `허용값: ${axes.mode.join(', ')}`));
  if (!['reject', 'auto'].includes(repair)) errors.push(argsError('$args.repair', 'repair는 "reject" 또는 "auto"입니다.'));
  if (!['reject', 'fit'].includes(navPolicy)) errors.push(argsError('$args.navPolicy', 'navPolicy는 "reject" 또는 "fit"입니다.'));
  if (errors.length) return failure(doc, errors);
  const draft = clone(doc), report = [];
  if (mode !== undefined) draft.mode = mode;
  Object.assign(draft, picked);
  if (repair === 'auto') repairAxes(draft, {report, nav: navPolicy === 'fit' ? 'fit' : 'keep'});
  return finish(doc, draft, {warnings: report.map(fromRepair), keep: 'exact'});
}

/**
 * 구성 변형을 현재 문서 트리에 적용한다(템플릿 원본을 다시 쓰지 않는다).
 * args: {slot, option} 또는 {choice: {슬롯: 옵션, …}}, contentPolicy?: 'reject'(기본) | 'relocate'
 * 변형이 콘텐츠를 둘 곳이 없으면(히어로 facts를 split·product로 바꿀 때) 'reject'는 거부하고 'relocate'는 히어로 아래 지표 격자로 옮긴다.
 * 결과의 콘텐츠 지문은 입력과 같아야 한다. 결과 계약(V01~V05) 위반은 거부하지 않고 quality 경고(VARIANT_CONTRACT)로 알린다(ADR 0006).
 */
export function setLayoutVariant(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const choice = isObject(args.choice) ? args.choice : typeof args.slot === 'string' && typeof args.option === 'string' ? {[args.slot]: args.option} : null;
  if (!choice || !Object.keys(choice).length) return failure(doc, [argsError('$args', 'slot과 option, 또는 choice가 필요합니다.', `slot 목록: ${layoutSlotIds.join(', ')}. 예: {slot: "cards", option: "outline"}`)]);
  const policy = args.contentPolicy ?? 'reject';
  if (!['reject', 'relocate'].includes(policy)) return failure(doc, [argsError('$args.contentPolicy', 'contentPolicy는 "reject" 또는 "relocate"입니다.')]);
  const tree = doc.tree?.children;
  if (!Array.isArray(tree)) return failure(doc, [err('ARGS_INVALID', '$.tree.children', 'doc.tree.children이 배열이 아닙니다.', '유효한 Blueprint만 연산할 수 있습니다.')]);
  const laid = applyLayoutChecked(tree, choice, doc.pageType, {contentPolicy: policy});
  if (laid.errors.length) {
    const available = layoutSlots(tree, doc.pageType).map(s => `${s.id}(${s.options.map(o => o.id).join('/')})`).join(', ');
    return failure(doc, laid.errors.map(e => (e.code === 'LAYOUT_NOT_APPLICABLE' ? {...e, hint: `${e.hint} 지금 고를 수 있는 구성: ${available || '없음'}`} : e)));
  }
  const draft = clone(doc); draft.tree.children = laid.tree;
  const warnings = laid.report.map(fromLayoutReport);
  // 편집 경로는 콘텐츠 보존을 강한 계약으로 보장한다(기본 거부, relocate는 이동). 지문이 같으면 V06(템플릿 추천 계층의 같은 규칙)은 이미 충족된 것이다.
  const contentPreserved = contentFingerprint({...doc, tree: {type: 'page', children: laid.tree}}).hash === contentFingerprint(doc).hash;
  for (const {slot, option} of laid.applied) {
    for (const f of assessOption({before: tree, after: laid.tree, slotId: slot, optionId: option, contentPreserved})) warnings.push(warn('VARIANT_CONTRACT', '$.layout.' + slot, `${f.id}: ${f.detail}`, {ruleId: f.id, claim: f.claim, slot, option, grade: 'quality', hint: '거부되지 않았습니다. 의도한 선택이면 그대로 두고, 아니면 Undo하세요.'}));
  }
  return finish(doc, draft, {warnings, keep: 'content'});
}

// ---------------------------------------------------------------- 내용 연산

const topRegion = segments => segments[0] === 'tree' || segments[0] === 'chrome';

/**
 * 노드(또는 chrome 객체)의 필드를 바꾼다. args: {path, set?: {필드: 값}, unset?: [필드]}
 * type과 children은 바꿀 수 없다(부품 교체·자식 편집은 insertNode·removeNode·moveNode). 경로 "$"는 name만 바꿀 수 있다.
 */
export function updateNode(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const {path, set = {}, unset = []} = args;
  const parsed = parsePath(path); if (parsed.error) return failure(doc, [err('PATH_INVALID', '$args.path', parsed.error, '예: [1, 0] 또는 "$.tree.children[1].children[0]", "$.chrome.nav[0]"')]);
  const {segments} = parsed;
  if (!isObject(set) || !Array.isArray(unset)) return failure(doc, [argsError('$args', 'set은 객체, unset은 문자열 배열입니다.')]);
  const target = resolve(doc, segments);
  const where = pathString(segments);
  if (!target || !isObject(target.value) || (segments.length && !topRegion(segments)) ) return failure(doc, [err('PATH_NOT_FOUND', where, `경로에 객체가 없습니다: ${where}`, '경로는 $.tree 또는 $.chrome 아래의 객체를 가리켜야 합니다. 현재 구조는 doc.tree를 확인하세요.')]);
  if (!segments.length) { // 문서 루트: name만
    const extra = [...Object.keys(set), ...unset].filter(k => k !== 'name');
    if (extra.length) return failure(doc, [err('PATH_INVALID', '$', `루트에서는 name만 바꿀 수 있습니다: ${extra.join(', ')}`, '테마·팔레트·축은 setTheme·setPalette·setAppearance를 쓰세요.')]);
  }
  if (segments.length === 1 && segments[0] === 'tree') return failure(doc, [err('PATH_INVALID', '$.tree', '페이지 루트는 필드가 없습니다.', '자식은 insertNode·removeNode·moveNode로 바꾸세요.')]);
  const keys = [...Object.keys(set), ...unset], errors = [];
  for (const k of keys) {
    if (FORBIDDEN_KEYS.has(k)) errors.push(err('PROTO_KEY', where + '.' + k, `금지된 키: ${k}`, '객체 프로토타입을 건드리는 키는 쓸 수 없습니다.'));
    else if (k === 'type') errors.push(err('NODE_TYPE_IMMUTABLE', where + '.type', '부품 type은 바꿀 수 없습니다.', '다른 부품으로 바꾸려면 removeNode 후 insertNode 하세요.'));
    else if (k === 'children') errors.push(err('CHILDREN_VIA_OPS', where + '.children', 'children은 updateNode로 바꿀 수 없습니다.', 'insertNode·removeNode·moveNode를 쓰세요.'));
    else if (typeof k !== 'string') errors.push(argsError('$args.unset', 'unset 항목은 문자열이어야 합니다.'));
  }
  if (errors.length) return failure(doc, errors);
  let payload; try { payload = clone(set); } catch { return failure(doc, [argsError('$args.set', 'JSON으로 표현할 수 없는 값이 있습니다.')]); }
  const draft = clone(doc), node = resolve(draft, segments).value;
  for (const [k, v] of Object.entries(payload)) Object.defineProperty(node, k, {value: v, enumerable: true, writable: true, configurable: true});
  for (const k of unset) delete node[k];
  return finish(doc, draft);
}

function checkContainer(doc, parentPath, key) {
  const parsed = parsePath(parentPath);
  if (parsed.error) return {errors: [err('PATH_INVALID', '$args.parent', parsed.error, '예: [] (페이지), [2] (최상위 세 번째 노드), "$.chrome"')]};
  const where = pathString(parsed.segments);
  if (typeof key !== 'string' || FORBIDDEN_KEYS.has(key)) return {errors: [argsError('$args.key', `key가 올바르지 않습니다: ${key}`)]};
  const target = resolve(doc, parsed.segments);
  if (!target || !isObject(target.value) || !topRegion(parsed.segments)) return {errors: [err('PATH_NOT_FOUND', where, `부모를 찾을 수 없습니다: ${where}`, '부모는 $.tree 또는 $.chrome 아래의 객체여야 합니다.')]};
  if (!Array.isArray(target.value[key])) return {errors: [err('PATH_NOT_FOUND', `${where}.${key}`, `${where}.${key}는 배열이 아닙니다.`, '삽입·삭제·이동은 배열 안에서만 합니다(기본 key는 "children").')]};
  return {segments: parsed.segments, where, key};
}

/**
 * 노드를 삽입한다. args: {parent: 경로, node, index?: 기본은 끝, key?: 'children'}
 * parent는 updateNode와 같은 경로 표기이고 key는 부모 객체의 배열 필드다(chrome.nav에 항목을 넣을 때는 parent:"$.chrome", key:"nav").
 */
export function insertNode(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const {parent = [], key = 'children', node} = args;
  const box = checkContainer(doc, parent, key); if (box.errors) return failure(doc, box.errors);
  const draft = clone(doc), array = resolve(draft, box.segments).value[key];
  const index = args.index ?? array.length;
  if (!Number.isInteger(index) || index < 0 || index > array.length) return failure(doc, [err('INDEX_RANGE', '$args.index', `index는 0~${array.length}이어야 합니다.`, '끝에 넣으려면 index를 생략하세요.')]);
  if (node === undefined) return failure(doc, [argsError('$args.node', 'node가 필요합니다.')]);
  let item; try { item = clone(node); } catch { return failure(doc, [argsError('$args.node', 'JSON으로 표현할 수 없는 값이 있습니다.')]); }
  array.splice(index, 0, item);
  const at = pathString([...box.segments, key, index]);
  return finish(doc, draft, {changes: [{op: 'insert', path: at, after: item}]});
}

/** 노드를 지운다. args: {path}. 배열 안의 항목(자식, 내비 항목 등)만 지울 수 있다. 이것은 사용자가 요청한 명시적 삭제이며 Undo로 되돌린다. */
export function removeNode(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const parsed = parsePath(args.path); if (parsed.error) return failure(doc, [err('PATH_INVALID', '$args.path', parsed.error)]);
  const {segments} = parsed, where = pathString(segments), last = segments.at(-1);
  const target = resolve(doc, segments);
  if (!target || !topRegion(segments)) return failure(doc, [err('PATH_NOT_FOUND', where, `경로에 노드가 없습니다: ${where}`, '현재 구조는 doc.tree를 확인하세요.')]);
  if (typeof last !== 'number') return failure(doc, [err('PATH_INVALID', where, '배열 안의 항목만 지울 수 있습니다.', '필드 하나를 지우려면 updateNode의 unset을 쓰세요.')]);
  const draft = clone(doc), array = resolve(draft, segments.slice(0, -1)).value;
  const [removed] = array.splice(last, 1);
  return finish(doc, draft, {changes: [{op: 'remove', path: where, before: removed}]});
}

/**
 * 노드를 옮긴다. args: {path, to: {parent: 경로, index?: 기본은 끝, key?: 'children'}}
 * index는 대상 배열에서 노드를 뺀 뒤의 위치다. 자기 자신이나 자기 자손 안으로는 옮길 수 없다. 콘텐츠 지문은 그대로여야 한다.
 */
export function moveNode(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const parsed = parsePath(args.path); if (parsed.error) return failure(doc, [err('PATH_INVALID', '$args.path', parsed.error)]);
  const {segments} = parsed, from = pathString(segments);
  if (!resolve(doc, segments) || typeof segments.at(-1) !== 'number' || !topRegion(segments)) return failure(doc, [err('PATH_NOT_FOUND', from, `옮길 노드가 없습니다: ${from}`, '배열 안의 노드 경로를 주세요.')]);
  if (!isObject(args.to)) return failure(doc, [argsError('$args.to', 'to: {parent, index?}가 필요합니다.')]);
  const key = args.to.key ?? 'children', box = checkContainer(doc, args.to.parent ?? [], key); if (box.errors) return failure(doc, box.errors);
  const own = [...segments];
  if (own.every((s, i) => box.segments[i] === s) && box.segments.length >= own.length) return failure(doc, [err('MOVE_INTO_SELF', box.where, '노드를 자기 자신이나 자기 자손 안으로 옮길 수 없습니다.', '다른 부모를 고르세요.')]);
  const draft = clone(doc);
  const targetArray = resolve(draft, box.segments).value[key];       // 빼기 전에 대상 배열 참조를 잡아 두므로 같은 배열 안의 이동도 인덱스가 밀리지 않는다
  const sourceArray = resolve(draft, segments.slice(0, -1)).value;
  const [node] = sourceArray.splice(segments.at(-1), 1);
  const index = args.to.index ?? targetArray.length;
  if (!Number.isInteger(index) || index < 0 || index > targetArray.length) return failure(doc, [err('INDEX_RANGE', '$args.to.index', `index는 0~${targetArray.length}이어야 합니다(노드를 뺀 뒤 기준).`, '끝으로 옮기려면 index를 생략하세요.')]);
  targetArray.splice(index, 0, node);
  const to = pathString([...box.segments, key, index]);
  return finish(doc, draft, {keep: 'content', changes: from === to ? [] : [{op: 'move', path: to, from, to}]});
}

// ---------------------------------------------------------------- 문서를 통째로 바꾸는 연산(명시적)

/** 현재 콘텐츠를 잃는 교체는 discard:true 없이는 하지 않는다. 호출자(Studio 확인 창, API 클라이언트)가 의식하고 요청하게 한다. */
function discardGuard(doc, draft, args) {
  const lost = contentDiff(doc, draft).missing;
  if (!lost.length || args.discard === true) return {lost, error: null};
  return {lost, error: err('DISCARD_REQUIRED', '$', `현재 문서의 콘텐츠 ${lost.length}개 항목이 새 문서에 없습니다(예: ${list(lost, 3)}).`, '의도한 교체라면 discard:true를 함께 주세요. 결과는 불변이므로 이전 doc 참조로 Undo할 수 있습니다.')};
}
const discardWarning = lost => warn('CONTENT_REPLACED', '$', `이전 문서의 콘텐츠 ${lost.length}개 항목을 새 문서로 교체했습니다.`, {discarded: lost.length});
const composeErrors = r => r.errors.map(e => ({...e, hint: e.hint}));

/**
 * 다른 템플릿의 구조로 갈아끼운다. 현재 테마·팔레트·모드·축은 유지한다(keepAppearance:false면 템플릿의 테마를 입힌다).
 * args: {template, discard?, keepAppearance?: true, theme?, contentPolicy?}. 현재 콘텐츠를 잃으면 discard:true가 필요하다.
 */
export function replaceTemplate(doc, args = {}) {
  const bad = notDoc(doc); if (bad) return bad;
  const bad2 = notArgs(args); if (bad2) return failure(doc, bad2);
  const {template: id, keepAppearance = true, theme} = args;
  if (typeof id !== 'string' || !Object.hasOwn(templates, id)) return failure(doc, [err('UNKNOWN_TEMPLATE', '$args.template', `알 수 없는 템플릿: ${id}`, '템플릿 id는 templates의 키입니다(npm run kit -- templates).')]);
  const fresh = composeBlueprint(id, keepAppearance ? doc.theme : theme, keepAppearance ? doc.palette : undefined, {lossless: true, contentPolicy: args.contentPolicy});
  if (fresh.errors.length) return failure(doc, composeErrors(fresh));
  const draft = fresh.blueprint, warnings = fresh.report.map(r => (r.code === 'CONTENT_RELOCATED' || r.code === 'DECORATION_DROPPED' ? fromLayoutReport(r) : fromRepair(r)));
  if (keepAppearance) {
    const report = [];
    draft.catalogVersion = doc.catalogVersion; draft.mode = doc.mode;
    for (const k of styleAxes) draft[k] = doc[k];
    repairAxes(draft, {report, nav: 'fit'});
    warnings.length = 0; warnings.push(...report.map(fromRepair));
  }
  const guard = discardGuard(doc, draft, args); if (guard.error) return failure(doc, [guard.error], warnings);
  if (guard.lost.length) warnings.push(discardWarning(guard.lost));
  return finish(doc, draft, {warnings});
}

/**
 * 외부 Blueprint를 문서로 들여온다. args: {blueprint: 객체 또는 JSON 문자열, upgrade?: false, discard?}
 * 1.0 문서는 변환하되 콘텐츠를 잃으면 거부한다(IMPORT_LOSSY). 지원하는 옛 catalogVersion은 upgrade:true일 때만 올린다(2.x 출력은 버전에 고정되어 있다).
 * doc이 null이면 빈 상태에서 시작한다.
 */
export function importBlueprint(doc, args = {}) {
  const bad2 = notArgs(args); if (bad2) return failure(doc ?? null, bad2);
  let source = args.blueprint;
  if (typeof source === 'string') { try { source = JSON.parse(source); } catch (e) { return failure(doc ?? null, [err('IMPORT_INVALID', '$args.blueprint', 'JSON을 읽을 수 없습니다: ' + e.message, 'Blueprint JSON 본문을 그대로 주세요.')]); } }
  if (!isObject(source)) return failure(doc ?? null, [err('IMPORT_INVALID', '$args.blueprint', 'Blueprint 객체가 필요합니다.', 'npm run kit -- init으로 만든 JSON 형식입니다.')]);
  let draft; try { draft = clone(source); } catch { return failure(doc ?? null, [err('IMPORT_INVALID', '$args.blueprint', 'JSON으로 표현할 수 없는 값이 있습니다.')]); }
  const warnings = [];
  const upgradeable = draft.version === '1.0' || (args.upgrade === true && draft.catalogVersion !== CATALOG_VERSION);
  if (upgradeable) {
    let migrated; try { migrated = migrateBlueprint(draft); } catch (e) { return failure(doc ?? null, [err('IMPORT_VERSION', '$args.blueprint.version', e.message, '지원하는 Blueprint 2.0(catalog 2.1.0 이상) 또는 1.0만 들여올 수 있습니다.')]); }
    const lost = contentDiff(draft, migrated).missing;
    if (lost.length) return failure(doc ?? null, [err('IMPORT_LOSSY', '$args.blueprint', `변환하면 콘텐츠 ${lost.length}개 항목이 사라집니다(예: ${list(lost, 3)}).`, '원본에서 내비 항목 수·드롭다운·그룹을 현재 셸이 받는 범위로 맞춘 뒤 다시 들여오세요.')]);
    draft = migrated;
  } else if (draft.catalogVersion !== CATALOG_VERSION && typeof draft.catalogVersion === 'string') {
    warnings.push(warn('CATALOG_LEGACY', '$.catalogVersion', `catalogVersion ${draft.catalogVersion} 문서입니다. 출력은 그 버전 규약에 고정됩니다.`, {hint: 'upgrade:true로 현재 버전에 올릴 수 있습니다(콘텐츠는 그대로이고 새 규칙이 적용됩니다).'}));
  }
  if (doc) {
    const guard = discardGuard(doc, draft, args); if (guard.error) return failure(doc, [guard.error], warnings);
    if (guard.lost.length) warnings.push(discardWarning(guard.lost));
  }
  return finish(doc, draft, {warnings, changes: [{op: 'replace', path: '$', after: '(imported)'}]});
}

/**
 * 템플릿에서 새 문서를 만든다. args: {template?: 'dashboard-overview', theme?, palette?, themeVariant?, typography?, layout?, contentPolicy?, discard?}
 * 합성은 내비를 자르지 않는다(놓이는 셸로 옮기거나 거부). doc이 null이면 빈 상태에서 시작한다.
 */
export function resetDocument(doc, args = {}) {
  const bad2 = notArgs(args); if (bad2) return failure(doc ?? null, bad2);
  const {template = 'dashboard-overview', theme, palette, themeVariant, typography, layout} = args;
  if (typeof template !== 'string' || !Object.hasOwn(templates, template)) return failure(doc ?? null, [err('UNKNOWN_TEMPLATE', '$args.template', `알 수 없는 템플릿: ${template}`, '템플릿 id는 templates의 키입니다.')]);
  if (theme !== undefined && !Object.hasOwn(themes, theme)) return failure(doc ?? null, [err('UNKNOWN_THEME', '$args.theme', `알 수 없는 테마: ${theme}`, '허용 테마: ' + list(Object.keys(themes), 12))]);
  if (palette !== undefined && !Object.hasOwn(palettes, palette)) return failure(doc ?? null, [err('UNKNOWN_PALETTE', '$args.palette', `알 수 없는 팔레트: ${palette}`, '팔레트 id는 palettes의 키입니다.')]);
  let fresh;
  try { fresh = composeBlueprint(template, theme, palette, {themeVariant, typography, layout, lossless: true, contentPolicy: args.contentPolicy}); }
  catch (e) { return failure(doc ?? null, [err('ARGS_INVALID', '$args', e.message, '변형·서체 id는 카탈로그의 값이어야 합니다.')]); }
  if (fresh.errors.length) return failure(doc ?? null, composeErrors(fresh));
  const draft = fresh.blueprint, warnings = fresh.report.map(r => (r.code === 'CONTENT_RELOCATED' || r.code === 'DECORATION_DROPPED' ? fromLayoutReport(r) : fromRepair(r)));
  if (doc) {
    const guard = discardGuard(doc, draft, args); if (guard.error) return failure(doc, [guard.error], warnings);
    if (guard.lost.length) warnings.push(discardWarning(guard.lost));
  }
  return finish(doc, draft, {warnings, changes: [{op: 'replace', path: '$', after: '(reset)'}]});
}

// ---------------------------------------------------------------- 레지스트리

export const OPS = Object.freeze({setTheme, setPalette, setAppearance, setLayoutVariant, updateNode, insertNode, removeNode, moveNode, replaceTemplate, importBlueprint, resetDocument});
export const opNames = Object.freeze(Object.keys(OPS));

/** 이름으로 연산을 실행한다(REST·MCP 진입점). 알 수 없는 연산은 UNKNOWN_OP 오류다. */
export function applyOp(doc, name, args = {}) {
  if (typeof name !== 'string' || !Object.hasOwn(OPS, name)) return failure(doc ?? null, [err('UNKNOWN_OP', '$op', `알 수 없는 연산: ${name}`, '허용 연산: ' + opNames.join(', '))]);
  return OPS[name](doc, args);
}
