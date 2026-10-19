/** Catalog 2.0: compiler, validator, UI, schema, and CLI all read this one contract. */
import {axes, axisDefs, axisOrder, styleAxes, axisBans, navLimits, iconShells, megaShells, MEGA_MAX} from './axes.mjs';
import {themes, themeCategories} from './themes.mjs';
import {palettes} from './palettes.mjs';
import {icons, iconNames} from './icons.mjs';
import {nodeSpecs, nodeTypes, requiredOf, chromeSpec, obj, en, str, mediaKinds, ratios, motifs} from './nodes.mjs';
import {pageTypes, pageTypeIds} from './pagetypes.mjs';
import {templates, templateList} from './templates.mjs';

export const CATALOG_VERSION = '2.0.0';
export const BLUEPRINT_VERSION = '2.0';
export const limits = Object.freeze({bytes: 196608, nodes: 200, depth: 7});
export {axes, axisDefs, axisOrder, styleAxes, axisBans, navLimits, iconShells, megaShells, MEGA_MAX, themes, themeCategories, palettes, icons, iconNames, nodeSpecs, nodeTypes, requiredOf, chromeSpec, pageTypes, pageTypeIds, templates, templateList, mediaKinds, ratios, motifs};

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
      version: {const: BLUEPRINT_VERSION}, catalogVersion: {const: CATALOG_VERSION}, name: str(80),
      theme: en(...Object.keys(themes)), palette: en(...Object.keys(palettes)), mode: en(...axes.mode), pageType: en(...pageTypeIds),
      ...style, chrome: chromeSpec, tree: {$ref: '#/$defs/page'},
    }, ['version', 'catalogVersion', 'name', 'theme', 'palette', 'mode', 'pageType', ...styleAxes, 'tree']),
    $defs: defs,
  };
}

/** Fix axis values that a ban or page type rejects, using each ban's declared `fix`. Used by composer/workbench; the validator never repairs. */
export function repairAxes(b) {
  const pt = pageTypes[b.pageType];
  for (let i = 0; i < 8; i++) {
    let changed = false;
    if (pt && !pt.shells.includes(b.shell)) { b.shell = pt.shells.includes('topbar') ? 'topbar' : pt.shells[0]; changed = true; }
    if (pt?.widths && !pt.widths.includes(b.width)) { b.width = pt.widths.at(-1); changed = true; }
    for (const ban of axisBans) if (ban.bad(b)) { Object.assign(b, ban.fix); changed = true; }
    if (!changed) break;
  }
  if (b.chrome?.nav && b.chrome.nav.length > navLimits[b.shell]) b.chrome.nav = b.chrome.nav.slice(0, navLimits[b.shell]);
  if (b.chrome?.nav && !megaShells.includes(b.shell)) for (const item of b.chrome.nav) delete item.mega;
  // Group labels need a vertical list; a template worn by a horizontal-shell theme keeps its items and drops the labels.
  if (b.chrome?.nav && !['sidebar', 'split'].includes(b.shell)) for (const item of b.chrome.nav) delete item.group;
  return b;
}

/** Compose a template with a theme: theme defaults, then the template's own axes (which win only when the page type needs them), then repair. */
export function createBlueprint(templateId = 'dashboard-overview', themeId, paletteId) {
  const t = templates[templateId];
  if (!Object.hasOwn(templates, templateId)) throw new Error('Unknown template: ' + templateId);
  const theme = themes[themeId ?? t.theme];
  if (!theme) throw new Error('Unknown theme: ' + themeId);
  const {mode, ...style} = theme.defaults;
  const b = {version: BLUEPRINT_VERSION, catalogVersion: CATALOG_VERSION, name: t.name, theme: theme.id, palette: paletteId ?? theme.palettes[0], mode, pageType: t.pageType, ...style};
  const pt = pageTypes[t.pageType], own = theme.id === t.theme;
  for (const [k, v] of Object.entries(t.axes)) if (own || (k === 'shell' && !pt.shells.includes(b.shell)) || (k === 'width' && pt.widths && !pt.widths.includes(b.width))) b[k] = v;
  b.chrome = structuredClone(t.chrome);
  b.tree = {type: 'page', children: structuredClone(t.tree)};
  return repairAxes(b);
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

export {layoutCoverage, contentCoverage, iconAliases} from './coverage.mjs';
