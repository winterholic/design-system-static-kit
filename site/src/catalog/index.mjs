/** Catalog 2.0: compiler, validator, UI, schema, and CLI all read this one contract. */
import {axes, axisDefs, axisOrder, styleAxes, axisBans, navLimits, iconShells, megaShells, MEGA_MAX} from './axes.mjs';
import {themes, themeCategories} from './themes.mjs';
import {palettes, paletteFamilies} from './palettes.mjs';
import {icons, iconNames} from './icons.mjs';
import {nodeSpecs, nodeTypes, requiredOf, chromeSpec, obj, en, str, mediaKinds, ratios, motifs} from './nodes.mjs';
import {pageTypes, pageTypeIds} from './pagetypes.mjs';
import {templates, templateList} from './templates.mjs';
import {layoutSlots, applyLayout, applyLayoutChecked, assessLayout, layoutSlotIds} from './variants.mjs';
import {variantContracts, variantCheckKinds, DIRECT_CONTRACTS, assessBlueprintContracts} from './variant-contracts.mjs';
import {NEUTRAL_OPTIONS as neutralOptions, EFFECTS_META as neutralMeta} from './variant-effects.mjs';
import {concepts, conceptIds, conceptsOfTemplate} from './concepts.mjs';
import {EXPRESSION_SINCE, SINCE_FIELDS, TOP_LEVEL_SINCE_FIELDS, PROFILE_SINCE_FIELD, atLeast, expressionApplies, VERSION_ORDER, expressionRules, since} from './expression.mjs';
import {recipes, recipeRules, recipeIds} from './recipes.mjs';
export {compositionRules, compositionCoverage, pageRules, PAGE_RULE_LEGACY_VERSIONS, COMPOSITION_VERSION} from './composition.mjs';

/** 기본 생성·조립 버전(템플릿·갤러리·조합이 만드는 Blueprint의 catalogVersion). 2.5.0은 명시적으로 고르는 버전이고 기본 승격은 ADR 0010이 미룬 결정이다. */
export const CATALOG_VERSION = '2.4.0';
export const SUPPORTED_CATALOG_VERSIONS = Object.freeze(['2.1.0', '2.2.0', '2.3.0', CATALOG_VERSION]);
/** 표현력 확장(2.5.0)을 더한 버전. 검증기·스키마는 이 목록을 받아들이고, `kit migrate --to 2.5.0`이 옮긴다. */
export const EXPRESSION_CATALOG_VERSION = EXPRESSION_SINCE;
export const ACCEPTED_CATALOG_VERSIONS = Object.freeze([...SUPPORTED_CATALOG_VERSIONS, EXPRESSION_CATALOG_VERSION, '2.6.0']);
export const BLUEPRINT_VERSION = '2.0';
export const limits = Object.freeze({bytes: 196608, nodes: 200, depth: 7});
export {recipes, recipeRules, recipeIds};
export {DIRECT_CONTRACTS, assessBlueprintContracts};
export {SINCE_FIELDS, TOP_LEVEL_SINCE_FIELDS, PROFILE_SINCE_FIELD, atLeast, expressionApplies, VERSION_ORDER, expressionRules};
export {layoutSlots, applyLayout, applyLayoutChecked, assessLayout, layoutSlotIds, variantContracts, variantCheckKinds, neutralOptions, neutralMeta, concepts, conceptIds, conceptsOfTemplate};
export {axes, axisDefs, axisOrder, styleAxes, axisBans, navLimits, iconShells, megaShells, MEGA_MAX, themes, themeCategories, palettes, paletteFamilies, icons, iconNames, nodeSpecs, nodeTypes, requiredOf, chromeSpec, pageTypes, pageTypeIds, templates, templateList, mediaKinds, ratios, motifs};

export const rules = [
  {id: 'R01', intent: '허용된 속성·값(variant 포함)만. 알 수 없는 키와 범위 밖 값은 실패.', codes: ['UNKNOWN_KEY', 'ENUM', 'STRING', 'NUMBER'], source: 'ADR 0001'},
  {id: 'R02', intent: '허용 간선·자식 수·깊이·노드 수로 위계 유지.', codes: ['CHILD_TYPE', 'ARRAY_LENGTH', 'DEPTH', 'NODE_LIMIT'], source: 'frontend-design / spacing-layout'},
  {id: 'R03', intent: '페이지 첫 위치에 h1 하나, 이후 제목 단계는 구조에서 계산되어 건너뛰지 않음.', codes: ['PAGE_HEADER'], source: 'winterholic-base/docs/12-page-patterns.md'},
  {id: 'R04', intent: '한 액션 그룹(액션 묶음·히어로·CTA·페이지 제목)에 주 액션 하나.', codes: ['PRIMARY_ACTION'], source: 'frontend-design'},
  {id: 'R05', intent: '모든 팔레트×모드×역할 쌍: 본문·보조·링크·상태색 4.5:1, 본문 7:1, 포커스·구조선·차트색·그라데이션 위 글자까지 검사.', codes: ['audit'], source: 'WCAG 2.2 SC 1.4.3, 1.4.11'},
  {id: 'R06', intent: '데이터 부품은 로딩·빈·오류·부분 성공·권한 없음 상태를 가지며 ready·partial에는 실제 데이터가 있어야 함.', codes: ['STATE_DATA'], source: 'ttakkari/docs/10-states-feedback.md'},
  {id: 'R07', intent: '텍스트 이스케이프·HTTPS 또는 선언된 앵커 링크·고정 런타임, 임의 HTML/CSS 불가.', codes: ['URL'], source: 'compiler input boundary'},
  {id: 'R08', intent: '입력·카탈로그·산출물 일치 검사, 버전 불일치 거부, 생성물 수동 수정 거부.', codes: ['VERSION', 'CATALOG_VERSION', 'check'], source: 'winterholic-design-system token source governance'},
  {id: 'R09', intent: '축 조합 금지(X01~X11): 접근성·가독성·구조상 함께 쓸 수 없는 값.', codes: ['AXIS_BAN'], source: 'docs/design.md §축 조합'},
  {id: 'R10', intent: '테마가 금지한 축 값(예: 시빅의 글로우·그라데이션) 거부.', codes: ['THEME_FORBID'], source: 'docs/design.md §테마'},
  {id: 'R11', intent: '페이지 유형 계약: 필수 부품·금지 부품·허용 셸/폭·최대 노드·상태 페이지 구성.', codes: ['PAGE_REQUIRE', 'PAGE_FORBID', 'PAGE_ALLOW', 'PAGE_MAX', 'PAGE_SHELL', 'PAGE_WIDTH', 'PAGE_SECOND'], source: 'winterholic-base/docs/12-page-patterns.md'},
  {id: 'R12', intent: '내비 구조: 셸별 항목 수 상한과 아이콘 필수(레일·하단 탭), 드롭다운 메뉴는 가로 셸에서 최대 2개, 푸터 링크 조건.', codes: ['NAV_COUNT', 'NAV_ICON', 'FOOTER_LINKS', 'NAV_MEGA', 'NAV_GROUP'], source: 'Material/HIG 하단 탭 3~5개, 접근성 아이콘+라벨'},
  {id: 'R13', intent: '페이지당 히어로 하나, 요금제 추천 하나, 탭·칸반의 중첩 금지.', codes: ['SINGLE_HERO', 'FEATURED_PLAN', 'NESTED_TABS', 'HERO_POSITION'], source: 'frontend-design'},
  {id: 'R14', intent: '의미 있는 이미지 대체 텍스트 필수, 모호한 링크 라벨 금지.', codes: ['LINK_LABEL', 'STRING'], source: 'WCAG 2.2 SC 1.1.1, 2.4.4'},
  {id: 'R15', intent: '데이터 일관성: 표 열 폭, 차트 계열 길이·값, 달력 날짜, 지표 추세 쌍, 진행 목록 선택값.', codes: ['TABLE_WIDTH', 'CHART_SHAPE', 'CALENDAR_DAY', 'METRIC_TREND', 'SELECTED_RANGE', 'STEPPER_RANGE', 'PAGINATION_RANGE'], source: 'winterholic-base/docs/11-data-viz.md'},
  {id: 'R16', intent: '폼 접근성: 필드 id 유일, select·radio 선택지 계약, options 오용 금지.', codes: ['DUPLICATE_ID', 'SELECT_OPTIONS', 'FIELD_OPTIONS'], source: 'WCAG 2.2 SC 1.3.1, 3.3.2'},
  {id: 'R17', intent: '앵커 링크는 같은 페이지에 선언된 anchor만, 목차는 anchor 있는 섹션 2개 이상.', codes: ['ANCHOR_MISSING', 'ANCHOR_DUPLICATE', 'TOC_EMPTY'], source: 'compiler input boundary'},
  {id: 'R18', intent: '변형 조건: 미디어 카드는 visual, 링크 카드는 액션, 오류성 상태 화면은 액션 필수.', codes: ['VARIANT_REQUIRES', 'HERO_VISUAL'], source: 'winterholic-base/docs/07-states-feedback.md'},
  {id: 'R19', intent: 'auto 모드는 밝은/어두운 두 토큰 세트를 모두 검증하고 prefers-contrast·forced-colors를 따름.', codes: ['audit'], source: 'winterholic-base/docs/09-dark-mode.md'},
  {id: 'R20', intent: '간격 계약(S01~S10): 간격은 밀도 토큰과 4px 격자 값만 쓰고, 색 섹션 중첩·섹션 3단 중첩처럼 안쪽 여백이 겹치는 구성은 거부.', codes: ['SURFACE_NEST', 'SECTION_DEPTH'], source: 'docs/spacing.md'},
];

const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
[axes, axisDefs, themes, palettes, icons, nodeSpecs, pageTypes, templates, rules].forEach(freeze);

export function blueprintSchema() {
  const defs = {};
  for (const [type, spec] of Object.entries(nodeSpecs)) {
    const properties = {type: {const: type}, ...spec.fields};
    if (spec.children) properties.children = {type: 'array', minItems: spec.min, maxItems: spec.max, items: {oneOf: spec.children.map(x => ({$ref: '#/$defs/' + x}))}};
    defs[type] = obj(properties, requiredOf(spec));
  }
  const style = Object.fromEntries(styleAxes.map(k => [k, en(...axes[k])]));
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Static Kit Blueprint ' + BLUEPRINT_VERSION,
    ...obj({
      version: {const: BLUEPRINT_VERSION}, catalogVersion: en(...ACCEPTED_CATALOG_VERSIONS), name: str(80),
      theme: en(...Object.keys(themes)), palette: en(...Object.keys(palettes)), colorPalette: since(en(...TOP_LEVEL_SINCE_FIELDS.find(x=>x.field==='colorPalette').values), '2.6.0부터 내부에서 정의된 색상 팔레트만 선택할 수 있습니다. 임의 색상 문자열은 허용하지 않습니다.', '2.6.0'), profile: since(en(...PROFILE_SINCE_FIELD.values), '2.6.0부터 디자인 프로파일(src/profiles)을 고릅니다. 프로파일이 허용하지 않는 부품·프리셋·밀도 조합은 PROFILE_* 진단으로 거부됩니다.', PROFILE_SINCE_FIELD.since), mode: en(...axes.mode), pageType: en(...pageTypeIds),
      ...style, chrome: chromeSpec, tree: {$ref: '#/$defs/page'},
    }, ['version', 'catalogVersion', 'name', 'theme', 'palette', 'mode', 'pageType', ...styleAxes, 'tree']),
    $defs: defs,
  };
}

const NAV_GROUP_SHELLS = ['sidebar', 'split'];
const NAV_POLICIES = Object.freeze(['drop', 'fit', 'keep']);
/** 같은 가로 막대를 쓰는 셸부터, 그다음 세로·특수 셸 순으로 대체 셸을 고른다. */
const SHELL_PREFERENCE = ['topbar', 'stacked', 'centered', 'editorial', 'masthead', 'sidebar', 'split', 'rail', 'dock', 'minimal'];

/**
 * chrome.nav가 셸에 놓일 수 있는지 본다(검증기 NAV_COUNT·NAV_MEGA·NAV_GROUP·NAV_ICON과 같은 조건). 충돌 목록 [{code, fixableByShell, message}].
 * fixableByShell:false는 어떤 셸로도 풀리지 않는 충돌(드롭다운 메뉴가 MEGA_MAX를 넘음)이다.
 */
export function navConflicts(b, shell = b.shell) {
  const nav = Array.isArray(b.chrome?.nav) ? b.chrome.nav : [], out = [];
  if (navLimits[shell] && nav.length > navLimits[shell]) out.push({code: 'NAV_COUNT', fixableByShell: true, message: `${shell} 셸의 내비 항목은 최대 ${navLimits[shell]}개인데 ${nav.length}개입니다.`});
  const megas = nav.filter(i => i.mega);
  if (megas.length && !megaShells.includes(shell)) out.push({code: 'NAV_MEGA', fixableByShell: true, message: `${shell} 셸은 드롭다운 메뉴(mega) ${megas.length}개를 보여 줄 수 없습니다.`});
  if (megas.length > MEGA_MAX) out.push({code: 'NAV_MEGA', fixableByShell: false, message: `드롭다운 메뉴는 최대 ${MEGA_MAX}개인데 ${megas.length}개입니다.`});
  if (nav.some(i => i.group) && !NAV_GROUP_SHELLS.includes(shell)) out.push({code: 'NAV_GROUP', fixableByShell: true, message: `${shell} 셸은 내비 그룹 라벨을 보여 줄 수 없습니다(sidebar·split 전용).`});
  if (iconShells.includes(shell) && nav.some(i => !i.icon)) out.push({code: 'NAV_ICON', fixableByShell: true, message: `${shell} 셸은 모든 내비 항목에 icon이 필요합니다.`});
  return out;
}

const axisProblems = b => {
  const pt = pageTypes[b.pageType], out = [];
  if (pt && !pt.shells.includes(b.shell)) out.push('shell');
  if (pt?.widths && !pt.widths.includes(b.width)) out.push('width');
  for (const ban of axisBans) if (ban.bad(b)) out.push(ban.id);
  return out;
};

/** 축 값만 고친다(셸·폭·금지 조합). 바뀐 축은 note({code:'AXIS_REPAIRED', axis, from, to, rule})로 알린다. 내용은 건드리지 않는다. */
function repairAxisValues(b, note) {
  const pt = pageTypes[b.pageType], set = (axis, to, rule) => { if (b[axis] !== to) note({code: 'AXIS_REPAIRED', axis, from: b[axis], to, rule}); b[axis] = to; };
  for (let i = 0; i < 8; i++) {
    let changed = false;
    if (pt && !pt.shells.includes(b.shell)) { set('shell', pt.shells.includes('topbar') ? 'topbar' : pt.shells[0], 'page-type'); changed = true; }
    if (pt?.widths && !pt.widths.includes(b.width)) { set('width', pt.widths.at(-1), 'page-type'); changed = true; }
    for (const ban of axisBans) if (ban.bad(b)) { for (const [axis, to] of Object.entries(ban.fix)) set(axis, to, ban.id); changed = true; }
    if (!changed) break;
  }
}

/**
 * 내비가 놓이지 않는 셸이면 내비를 그대로 두고 놓이는 셸로 바꾼다(페이지 유형·테마 금지·축 금지를 지키는 후보 중 선호 순서).
 * 고른 셸은 note({code:'SHELL_SUBSTITUTED'})로 알린다. 놓일 셸이 없으면 아무것도 바꾸지 않고 false를 돌려준다(검증기가 거부한다).
 */
function fitShellToNav(b, note) {
  if (!navConflicts(b).length) return true;
  const pt = pageTypes[b.pageType], theme = themes[b.theme];
  const pool = SHELL_PREFERENCE.filter(s => axes.shell.includes(s) && (!pt || pt.shells.includes(s)) && !theme?.forbid?.shell?.includes(s));
  for (const shell of pool) {
    if (navConflicts(b, shell).length) continue;
    const trial = {...b, shell}, trace = [];
    repairAxisValues(trial, r => trace.push(r));
    if (trial.shell !== shell || axisProblems(trial).length || navConflicts(trial).length) continue;
    note({code: 'SHELL_SUBSTITUTED', axis: 'shell', from: b.shell, to: shell, rule: 'nav-fit'});
    Object.assign(b, {shell});
    repairAxisValues(b, note);
    return true;
  }
  return false;
}

/**
 * Fix axis values that a ban or page type rejects, using each ban's declared `fix`. Used by composer/workbench; the validator never repairs.
 * options.nav는 내비가 셸에 놓이지 않을 때의 정책이다.
 *   'drop'(기본, 호환): 항목을 자르고 mega·group을 지운다. 템플릿을 다른 테마에 입히는 합성 경로와 2.x 출력 hash가 이 동작에 고정되어 있다.
 *   'fit': 내비를 보존하고 놓이는 셸로 바꾼다. 놓일 셸이 없으면 내비를 그대로 두어 검증기가 NAV_* 오류로 거부한다.
 *   'keep': 내비를 건드리지 않는다.
 * 그 밖의 값은 b를 건드리기 전에 예외(`error.errors[0].code === 'REPAIR_NAV_POLICY'`)로 거부한다.
 * options.report 배열을 주면 바뀐 축과 삭제한 항목이 구조화된 기록(code·path·dropped…)으로 쌓인다. 'drop'은 report 없이도 동작하지만 편집 연산(src/edit)은 쓰지 않는다.
 */
export function repairAxes(b, {nav = 'drop', report = null} = {}) {
  // 오타가 레거시 삭제 경로로 흘러 내비를 자르지 않도록, b를 건드리기 전에 정책 값을 닫힌 집합으로 검사한다.
  if (!NAV_POLICIES.includes(nav)) {
    const error = new Error(`repairAxes: unknown nav policy ${JSON.stringify(nav)}`);
    error.errors = [{code: 'REPAIR_NAV_POLICY', path: '$args.nav', message: `알 수 없는 nav 정책: ${JSON.stringify(nav)}`, hint: `허용값: ${NAV_POLICIES.map(x => `'${x}'`).join(', ')} 또는 옵션 생략(= 'drop').`}];
    throw error;
  }
  const note = r => { report?.push(r); };
  repairAxisValues(b, note);
  if (!b.chrome?.nav) return b;
  if (nav === 'fit') { fitShellToNav(b, note); return b; }
  if (nav === 'keep') return b;
  if (b.chrome.nav.length > navLimits[b.shell]) { const dropped = b.chrome.nav.slice(navLimits[b.shell]); b.chrome.nav = b.chrome.nav.slice(0, navLimits[b.shell]); note({code: 'NAV_TRUNCATED', path: '$.chrome.nav', limit: navLimits[b.shell], dropped}); }
  if (!megaShells.includes(b.shell)) b.chrome.nav.forEach((item, i) => { if (item.mega) { note({code: 'NAV_MEGA_DROPPED', path: `$.chrome.nav[${i}].mega`, dropped: item.mega}); delete item.mega; } });
  // Group labels need a vertical list; a template worn by a horizontal-shell theme keeps its items and drops the labels.
  if (!NAV_GROUP_SHELLS.includes(b.shell)) b.chrome.nav.forEach((item, i) => { if (item.group) { note({code: 'NAV_GROUP_DROPPED', path: `$.chrome.nav[${i}].group`, dropped: item.group}); delete item.group; } });
  return b;
}

/** 템플릿 하나에서 실제로 고를 수 있는 구성 변형(슬롯과 옵션). */
export const layoutOptionsOf = templateId => layoutSlots(templates[templateId].tree, templates[templateId].pageType, {templateId});

/**
 * Compose a template with a theme: theme defaults, then the template's own axes (which win only when the page type needs them), then repair.
 * options.typography: 서체 프리셋 id(테마 기본 서체를 덮어씀), options.themeVariant: 테마 변형 id(축 값 묶음), options.layout: {슬롯: 옵션} 구성 변형. 둘 다 결과 Blueprint에는 흔적 없이 축·트리 값으로만 남는다.
 */
export function createBlueprint(...args) { return composeBlueprint(...args).blueprint; }

/**
 * createBlueprint와 같은 합성이되, 합성이 바꾸거나 지운 것(repairAxes·applyLayout 기록)을 함께 돌려준다: {blueprint, report, errors}.
 * options.lossless:true는 아무것도 지우지 않는 합성이다(내비는 놓이는 셸로 옮기고, 히어로 facts는 options.contentPolicy에 따라 거부·이동).
 * 지울 수밖에 없으면 blueprint가 null이고 errors에 이유가 담긴다. 기본(false)은 2.x 출력 hash가 고정된 합성이다.
 */
export function composeBlueprint(templateId = 'dashboard-overview', themeId, paletteId, options = {}) {
  const t = templates[templateId];
  if (!Object.hasOwn(templates, templateId)) throw new Error('Unknown template: ' + templateId);
  const theme = themes[themeId ?? t.theme];
  if (!theme) throw new Error('Unknown theme: ' + themeId);
  const {mode, ...style} = theme.defaults;
  const variant = options.themeVariant ? theme.variants.find(v => v.id === options.themeVariant) : null;
  if (options.themeVariant && !variant) throw new Error('Unknown theme variant: ' + theme.id + '/' + options.themeVariant);
  const b = {version: BLUEPRINT_VERSION, catalogVersion: CATALOG_VERSION, name: t.name, theme: theme.id, palette: paletteId ?? theme.palettes[0], mode, pageType: t.pageType, ...style, ...(variant?.set ?? {})};
  const pt = pageTypes[t.pageType], own = theme.id === t.theme;
  for (const [k, v] of Object.entries(t.axes)) if ((own && !(variant && k in variant.set)) || (k === 'shell' && !pt.shells.includes(b.shell)) || (k === 'width' && pt.widths && !pt.widths.includes(b.width))) b[k] = v;
  // 서체 프리셋은 테마와 독립이다: 컨셉의 look이나 사용자가 고른 프리셋이 테마 기본값을 덮어쓴다.
  if (options.typography) { if (!axes.typography.includes(options.typography)) throw new Error('Unknown typography: ' + options.typography); b.typography = options.typography; }
  b.chrome = structuredClone(t.chrome);
  const report = [];
  if (options.lossless) {
    const laid = applyLayoutChecked(t.tree, options.layout, t.pageType, {contentPolicy: options.contentPolicy});
    if (laid.errors.length) return {blueprint: null, report, errors: laid.errors};
    report.push(...laid.report);
    b.tree = {type: 'page', children: laid.tree};
    return {blueprint: repairAxes(b, {report, nav: 'fit'}), report, errors: []};
  }
  b.tree = {type: 'page', children: applyLayout(t.tree, options.layout, t.pageType, {report})};
  return {blueprint: repairAxes(b, {report}), report, errors: []};
}

/** v1 blueprints (catalog 1.x) get the new required fields with conservative defaults; nothing else is rewritten. */
export function migrateV1(old) {
  const theme = themes[old.theme];
  if (!theme) throw new Error('Unknown theme in v1 blueprint: ' + old.theme);
  const b = {version: BLUEPRINT_VERSION, catalogVersion: CATALOG_VERSION, name: old.name, theme: old.theme, palette: old.palette, mode: old.mode, pageType: 'general', ...theme.defaults};
  for (const k of ['shell', 'typography', 'density', 'radius']) if (old[k]) b[k] = old[k];
  b.mode = old.mode;
  b.tree = structuredClone(old.tree);
  return repairAxes(b);
}

/** Explicit adoption of the contextual policy. Content and selected axes are never repaired for 2.x input. */
export function migrateBlueprint(old, target = CATALOG_VERSION) {
  if (!ACCEPTED_CATALOG_VERSIONS.includes(target)) throw new Error('Unsupported target catalog version: ' + target);
  if (old.version === '1.0') { const b = migrateV1(old); return target === CATALOG_VERSION ? b : {...b, catalogVersion: target}; }
  if (old.version !== BLUEPRINT_VERSION || !ACCEPTED_CATALOG_VERSIONS.includes(old.catalogVersion)) throw new Error('Unsupported source blueprint/catalog version');
  // 내려 쓰지 않는다: 2.5.0 문서를 기본 버전(2.4.0)으로 "올리면" 새 필드가 거부되므로, 이미 목표 이상이면 그대로 둔다.
  return {...structuredClone(old), catalogVersion: VERSION_ORDER.indexOf(old.catalogVersion) > VERSION_ORDER.indexOf(target) ? old.catalogVersion : target};
}

export {layoutCoverage, contentCoverage, iconAliases} from './coverage.mjs';
