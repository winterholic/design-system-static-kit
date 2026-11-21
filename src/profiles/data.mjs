/**
 * 디자인 프로파일과 레이아웃 패턴(카탈로그 2.6.0). 데이터만 둔다: 검사는 check.mjs, 재료 등록은 registry.mjs, 조립은 assemble.mjs.
 *
 * 프로파일은 "어떤 재료·프리셋·밀도를 함께 쓸 수 있는가"를 정하는 닫힌 규칙 묶음이다. 값은 모두 기존 카탈로그의 id(부품 type, 축 값,
 * 테마 id, 템플릿 id)와 재료 id 문자열이다. 임의 CSS·px·색 값은 어디에도 없다.
 *
 * 이 파일은 아무것도 import하지 않는다. 검증기(src/validate.mjs)와 스키마(src/catalog/index.mjs)가 읽어도 순환이 생기지 않게 하기 위해서다.
 * 차트 프리셋·Select·데이터 테이블 재료는 다른 작업이 통합 중이라 id 문자열로만 적는다. 등록되지 않은 id는 registry.mjs가
 * 허용 목록에서 빼고 `pending`으로 보고한다(조립·검사가 존재하지 않는 재료를 고르지 않는다).
 */

export const PROFILE_SINCE = '2.6.0';

/** 정보 밀도. 같은 화면 넓이에 놓는 정보의 양이고, 허용 density 축 값으로 풀린다. */
export const INFO_DENSITY = Object.freeze(['high', 'medium', 'low']);

/**
 * 좁은 화면(720px 이하) 대체 전략. 각 전략은 이미 있는 CSS·렌더러 동작이다. marker는 그 동작을 만드는 소스 조각이고
 * tests/profiles.test.mjs가 module 안에 그대로 있는지 확인한다(근거 없는 반응형 주장을 막는다).
 */
export const NARROW_STRATEGIES = Object.freeze({
  'sidebar-to-header': Object.freeze({module: 'src/styles/shells.mjs', marker: '[data-shell=sidebar]{display:block;background:none}', what: '사이드바가 본문 위 머리 줄로 바뀐다'}),
  'nav-scroll': Object.freeze({module: 'src/styles/shells.mjs', marker: '.kit-nav:not([data-mega]) ul{-webkit-mask-image', what: '가로 내비가 끝을 흐린 가로 스크롤이 된다'}),
  'dock-tabs': Object.freeze({module: 'src/styles/shells.mjs', marker: '[data-shell=dock] .kit-body{padding-bottom:calc(72px + env(safe-area-inset-bottom))}', what: '하단 탭바가 유지되고 본문이 탭바 높이만큼 비켜 선다'}),
  'aside-stack': Object.freeze({module: 'src/styles/chunks.mjs', marker: '@media(max-width:900px){.kit-aside,.kit-aside[data-side=start]', what: '보조 칸이 본문 아래로 쌓인다'}),
  'grid-reflow': Object.freeze({module: 'src/styles/chunks.mjs', marker: '@media(max-width:1000px){.kit-grid[data-columns=three],.kit-grid[data-columns=four]', what: '3·4열 격자가 2열, 다시 1열로 줄어든다'}),
  'table-scroll': Object.freeze({module: 'src/render/nodes.mjs', marker: '<div class="kit-table-scroll" tabindex="0" role="region"', what: '표가 키보드로 닿는 가로 스크롤 영역 안에 남는다(열을 숨기지 않는다)'}),
  'chart-data-table': Object.freeze({module: 'src/render/chart.mjs', marker: '<details', what: '차트 아래 펼칠 수 있는 데이터 표가 전체 값을 보존한다'}),
  'none': Object.freeze({module: null, marker: null, what: '해당 부품을 쓰지 않는다'}),
});

/**
 * 프로파일 규칙. 검사기(check.mjs)가 내는 코드마다 하나다. 카탈로그의 `rules`(R01~R20)·`expressionRules`(R21~R22)는
 * manifest와 카탈로그 snapshot에 박혀 있어 늘리지 않고, 이 목록은 프로파일 모듈에만 있다.
 */
export const PROFILE_RULES = Object.freeze([
  {id: 'PF01', code: 'PROFILE_PAGE_TYPE', intent: '프로파일이 다루는 페이지 유형만 쓴다.'},
  {id: 'PF02', code: 'PROFILE_THEME', intent: '프로파일이 고른 테마(완성 프리셋)만 쓴다.'},
  {id: 'PF03', code: 'PROFILE_DENSITY', intent: '정보 밀도에 맞는 density 값만 쓴다.'},
  {id: 'PF04', code: 'PROFILE_TYPOGRAPHY', intent: '역할형 타이포 프리셋과 같은 엔진 계열의 서체 프리셋만 쓴다.'},
  {id: 'PF05', code: 'PROFILE_SHELL', intent: '머리·사이드바 구조가 프로파일의 셸 목록 안에 있다.'},
  {id: 'PF06', code: 'PROFILE_AXIS', intent: '폭·모서리·깊이·모션·스케일·배경·장식 축이 프로파일 허용값 안에 있다.'},
  {id: 'PF07', code: 'PROFILE_MODE', intent: '색 모드가 프로파일 허용값 안에 있다.'},
  {id: 'PF08', code: 'PROFILE_COLOR', intent: '프로파일은 2.6.0 계층 색 토큰(colorPalette)으로만 칠한다.'},
  {id: 'PF09', code: 'PROFILE_COMPONENT', intent: '허용 부품 목록 밖의 부품을 쓰지 않는다.'},
  {id: 'PF10', code: 'PROFILE_TABLE', intent: '표 행 밀도·변형·열 수가 프로파일 표 규칙 안에 있다.'},
  {id: 'PF11', code: 'PROFILE_CHART', intent: '차트 형태와 페이지당 차트 수가 프로파일 허용 범위 안에 있다.'},
  {id: 'PF12', code: 'PROFILE_QUALITY', intent: '최상위 구역 수와 내비 항목 수가 품질 기준 안에 있다.'},
  {id: 'PF13', code: 'PROFILE_FIELD', intent: '부품 변형 값(폼 배치·격자 열·히어로 변형·구역 바탕)이 프로파일 허용값 안에 있다.'},
].map(Object.freeze));

/** 모든 프로파일이 허용하는 페이지 골격 부품. 각 프로파일은 여기에 자기 부품을 더한다. */
const BASE = ['page', 'page-header', 'section', 'actions', 'notice', 'divider', 'links', 'empty-state', 'skeleton', 'breadcrumb'];
const list = (...xs) => Object.freeze([...new Set(xs.flat())].sort());

/**
 * 프로파일 7개. 필드:
 *   contexts            다루는 페이지 유형
 *   density             {info: INFO_DENSITY, allowed: density 축 값, default}
 *   type                {rolePreset: type-role-preset id, typography: 허용 서체 프리셋, default}
 *   controlSize         {allowed: 컨트롤 크기(src/materials/typography.mjs CONTROL_SIZES), default}
 *   tableRows           {density: 표가 있을 때 허용 density, variants: table.variant, maxColumns}. 표를 쓰지 않으면 빈 목록과 0
 *   chrome              {header, sidebar, shells: 허용 셸(첫 값이 기본), footer: 허용 푸터}
 *   components          허용 부품 type(component:<type>로 등록 확인)
 *   pendingComponents   통합 중인 부품 재료 id. 등록되어 있을 때만 허용 목록에 든다
 *   substitutes         금지 부품 → 대신 쓸 허용 부품(진단의 대안)
 *   patterns            허용 레이아웃 패턴 id(pattern:<id>)
 *   charts              {kinds: chart.kind 허용값, max: 페이지당 차트 수, presets: chart-preset 재료 id}
 *   themes              허용 테마 id(첫 값이 기본)
 *   axes                그 밖의 축 허용값(첫 값이 기본)
 *   color               {palettes: colorPalette 허용값, modes: 허용 모드(첫 값이 기본)}
 *   fields              부품 필드 허용값 {'type.field': [값…]}
 *   narrow              {maxWidth, navigation, aside, grid, table, chart}: NARROW_STRATEGIES 이름
 *   quality             {minMaterial: 참조 재료의 최소 품질, maxTopLevel: 최상위 구역 수, maxNav: 내비 항목 수}
 */
export const PROFILES = Object.freeze({
  erp: {
    label: 'ERP 업무 화면', contexts: ['listing', 'dashboard', 'data', 'settings'],
    density: {info: 'high', allowed: ['compact', 'comfortable'], default: 'compact'},
    type: {rolePreset: 'type-role-preset:erp', typography: ['sans', 'tech', 'mono'], default: 'sans'},
    controlSize: {allowed: ['compact', 'small', 'medium'], default: 'small'},
    tableRows: {density: ['compact', 'comfortable'], variants: ['plain', 'striped', 'bordered'], maxColumns: 8},
    chrome: {header: 'utility-bar', sidebar: 'fixed-groups', shells: ['sidebar', 'rail', 'stacked'], footer: ['minimal', 'simple']},
    components: list(BASE, 'filter-bar', 'table', 'pagination', 'list', 'master-detail', 'kanban', 'lane', 'task', 'grid', 'aside', 'metric', 'chart', 'progress', 'tabs', 'tab', 'form', 'properties', 'timeline', 'tags', 'stepper', 'code'),
    pendingComponents: ['component:data-table', 'component:select-control'],
    substitutes: {hero: 'page-header', pricing: 'table', gallery: 'table', 'logo-cloud': 'tags', quote: 'notice', cta: 'actions'},
    patterns: ['pattern:erp-workspace', 'pattern:dashboard-grid', 'pattern:admin-settings'],
    charts: {kinds: ['bar', 'bars-h', 'line', 'area'], max: 4, presets: ['chart-preset:erp-quarterly-revenue', 'chart-preset:operations-activity-heatmap', 'chart-preset:sales-pipeline-value']},
    themes: ['ledger', 'workspace', 'enterprise', 'console', 'precision', 'insight'],
    axes: {width: ['full', 'wide'], radius: ['subtle', 'square', 'soft'], elevation: ['outline', 'flat', 'soft'], motion: ['none', 'subtle'], scale: ['tight', 'balanced'], backdrop: ['plain', 'grid', 'tint'], ornament: ['none', 'lines', 'geometric']},
    color: {palettes: ['static-kit'], modes: ['light', 'dark', 'auto']},
    fields: {'form.variant': ['stacked', 'two-column', 'inline'], 'grid.columns': ['two', 'three', 'four'], 'section.surface': ['plain', 'flat']},
    narrow: {maxWidth: 720, navigation: 'sidebar-to-header', aside: 'aside-stack', grid: 'grid-reflow', table: 'table-scroll', chart: 'chart-data-table'},
    quality: {minMaterial: 'implemented', maxTopLevel: 8, maxNav: 8},
  },
  finance: {
    label: '금융 대시보드', contexts: ['dashboard', 'data', 'listing', 'settings'],
    density: {info: 'high', allowed: ['comfortable', 'compact'], default: 'comfortable'},
    type: {rolePreset: 'type-role-preset:dashboard', typography: ['sans', 'tech'], default: 'sans'},
    controlSize: {allowed: ['small', 'medium'], default: 'medium'},
    tableRows: {density: ['comfortable', 'compact'], variants: ['plain', 'striped', 'bordered'], maxColumns: 6},
    chrome: {header: 'topbar', sidebar: 'none', shells: ['topbar', 'sidebar', 'stacked'], footer: ['columns', 'simple', 'minimal']},
    components: list(BASE, 'grid', 'aside', 'metric', 'chart', 'table', 'list', 'progress', 'filter-bar', 'pagination', 'tabs', 'tab', 'form', 'properties', 'timeline'),
    pendingComponents: ['component:data-table', 'component:select-control'],
    substitutes: {hero: 'page-header', kanban: 'table', gallery: 'table', quote: 'notice', cta: 'actions', code: 'properties'},
    patterns: ['pattern:dashboard-grid', 'pattern:erp-workspace', 'pattern:admin-settings'],
    charts: {kinds: ['line', 'area', 'bar', 'bars-h', 'donut'], max: 3, presets: ['chart-preset:finance-monthly-close', 'chart-preset:sales-pipeline-value']},
    themes: ['bank', 'trust', 'ledger', 'enterprise', 'workspace'],
    axes: {width: ['standard', 'wide', 'full'], radius: ['soft', 'subtle', 'square'], elevation: ['soft', 'outline', 'flat'], motion: ['subtle', 'none'], scale: ['balanced', 'tight'], backdrop: ['plain'], ornament: ['none']},
    color: {palettes: ['static-kit'], modes: ['light', 'auto']},
    fields: {'form.variant': ['stacked', 'two-column'], 'grid.columns': ['two', 'three', 'four'], 'section.surface': ['plain', 'flat']},
    narrow: {maxWidth: 720, navigation: 'nav-scroll', aside: 'aside-stack', grid: 'grid-reflow', table: 'table-scroll', chart: 'chart-data-table'},
    quality: {minMaterial: 'implemented', maxTopLevel: 7, maxNav: 6},
  },
  commerce: {
    label: '커머스', contexts: ['commerce', 'listing'],
    density: {info: 'medium', allowed: ['comfortable', 'spacious'], default: 'comfortable'},
    type: {rolePreset: 'type-role-preset:marketing', typography: ['sans', 'humanist', 'geometric', 'rounded'], default: 'sans'},
    controlSize: {allowed: ['medium', 'large'], default: 'large'},
    tableRows: {density: ['comfortable'], variants: ['plain', 'striped'], maxColumns: 5},
    chrome: {header: 'stacked-categories', sidebar: 'none', shells: ['stacked', 'topbar', 'centered'], footer: ['columns', 'simple']},
    components: list(BASE, 'grid', 'aside', 'split', 'card', 'gallery', 'media', 'buy-box', 'summary', 'reviews', 'stepper', 'form', 'pagination', 'filter-bar', 'tabs', 'tab', 'faq', 'list', 'timeline', 'tags', 'reel', 'menu', 'properties', 'table', 'prose'),
    pendingComponents: ['component:select-control'],
    substitutes: {kanban: 'grid', chart: 'summary', code: 'properties', 'master-detail': 'split', hero: 'page-header'},
    patterns: ['pattern:commerce-listing', 'pattern:commerce-detail', 'pattern:commerce-checkout'],
    charts: {kinds: [], max: 0, presets: []},
    themes: ['commerce', 'realty', 'stay', 'garden', 'cafe'],
    axes: {width: ['wide', 'standard'], radius: ['soft', 'subtle', 'round'], elevation: ['outline', 'soft', 'lifted', 'flat'], motion: ['subtle', 'none'], scale: ['balanced'], backdrop: ['plain', 'tint'], ornament: ['none', 'organic', 'dots', 'geometric']},
    color: {palettes: ['static-kit'], modes: ['light', 'dark', 'auto']},
    fields: {'form.variant': ['stacked', 'two-column'], 'grid.columns': ['two', 'three', 'four'], 'section.surface': ['plain', 'tint', 'flat']},
    narrow: {maxWidth: 720, navigation: 'nav-scroll', aside: 'aside-stack', grid: 'grid-reflow', table: 'table-scroll', chart: 'none'},
    quality: {minMaterial: 'implemented', maxTopLevel: 6, maxNav: 8},
  },
  'saas-landing': {
    label: 'SaaS 랜딩', contexts: ['landing', 'pricing'],
    density: {info: 'low', allowed: ['comfortable', 'spacious'], default: 'comfortable'},
    type: {rolePreset: 'type-role-preset:marketing', typography: ['sans', 'geometric', 'grotesk', 'tech'], default: 'sans'},
    controlSize: {allowed: ['medium', 'large'], default: 'large'},
    tableRows: {density: [], variants: [], maxColumns: 0},
    chrome: {header: 'topbar', sidebar: 'none', shells: ['topbar', 'stacked', 'centered'], footer: ['columns', 'simple']},
    components: list(BASE, 'hero', 'logo-cloud', 'bento', 'steps', 'grid', 'card', 'metric', 'feature-list', 'quote', 'pricing', 'plan', 'faq', 'cta', 'media', 'chart', 'prose', 'progress'),
    pendingComponents: [],
    substitutes: {table: 'feature-list', kanban: 'steps', 'filter-bar': 'actions', pagination: 'actions', form: 'cta', code: 'feature-list'},
    patterns: ['pattern:marketing-landing'],
    charts: {kinds: ['bar', 'line', 'area'], max: 1, presets: ['chart-preset:campaign-weekly-growth', 'chart-preset:marketing-channel-share']},
    themes: ['trust', 'devtool', 'aurora', 'solar', 'neon'],
    axes: {width: ['standard', 'wide'], radius: ['soft', 'round', 'subtle'], elevation: ['soft', 'outline', 'lifted', 'glow', 'flat'], motion: ['subtle', 'lively', 'none'], scale: ['balanced', 'dramatic'], backdrop: ['plain', 'tint', 'gradient', 'grid'], ornament: ['geometric', 'none', 'organic', 'lines']},
    color: {palettes: ['static-kit'], modes: ['light', 'dark', 'auto']},
    fields: {'hero.variant': ['default', 'product', 'split'], 'grid.columns': ['two', 'three', 'four'], 'section.surface': ['plain', 'tint', 'flat', 'inverse']},
    narrow: {maxWidth: 720, navigation: 'nav-scroll', aside: 'aside-stack', grid: 'grid-reflow', table: 'none', chart: 'chart-data-table'},
    quality: {minMaterial: 'implemented', maxTopLevel: 10, maxNav: 5},
  },
  editorial: {
    label: '에디토리얼', contexts: ['article', 'blog'],
    density: {info: 'low', allowed: ['spacious', 'comfortable'], default: 'spacious'},
    type: {rolePreset: 'type-role-preset:document', typography: ['serif', 'editorial', 'literary', 'humanist', 'newsroom', 'bookish'], default: 'serif'},
    controlSize: {allowed: ['small', 'medium'], default: 'medium'},
    tableRows: {density: ['comfortable', 'spacious'], variants: ['plain'], maxColumns: 4},
    chrome: {header: 'centered-masthead', sidebar: 'none', shells: ['editorial', 'centered', 'masthead', 'stacked'], footer: ['simple', 'minimal']},
    components: list(BASE, 'prose', 'media', 'quote', 'list', 'card', 'grid', 'reel', 'toc', 'aside', 'properties', 'table', 'chart', 'tags', 'pagination', 'timeline'),
    pendingComponents: [],
    substitutes: {hero: 'media', kanban: 'list', 'filter-bar': 'tags', pricing: 'prose', cta: 'links', form: 'links'},
    patterns: ['pattern:editorial-article'],
    charts: {kinds: ['bar', 'line', 'bars-h'], max: 2, presets: []},
    themes: ['editorial', 'paper', 'journal', 'academic'],
    axes: {width: ['standard', 'narrow'], radius: ['square', 'subtle', 'soft'], elevation: ['flat', 'outline'], motion: ['none', 'subtle'], scale: ['balanced', 'dramatic'], backdrop: ['plain', 'tint'], ornament: ['lines', 'none', 'organic']},
    color: {palettes: ['static-kit'], modes: ['light', 'dark', 'auto']},
    fields: {'section.surface': ['plain', 'flat'], 'grid.columns': ['two', 'three']},
    narrow: {maxWidth: 720, navigation: 'nav-scroll', aside: 'aside-stack', grid: 'grid-reflow', table: 'table-scroll', chart: 'chart-data-table'},
    quality: {minMaterial: 'implemented', maxTopLevel: 8, maxNav: 5},
  },
  docs: {
    label: '문서·레퍼런스', contexts: ['docs'],
    density: {info: 'medium', allowed: ['comfortable', 'compact'], default: 'comfortable'},
    type: {rolePreset: 'type-role-preset:document', typography: ['tech', 'sans', 'editorial', 'mono'], default: 'tech'},
    controlSize: {allowed: ['small', 'medium'], default: 'medium'},
    tableRows: {density: ['comfortable', 'compact'], variants: ['plain', 'bordered', 'striped'], maxColumns: 6},
    chrome: {header: 'utility-bar', sidebar: 'fixed-groups', shells: ['sidebar', 'stacked', 'topbar'], footer: ['simple', 'minimal', 'columns']},
    components: list(BASE, 'aside', 'toc', 'prose', 'code', 'steps', 'faq', 'properties', 'table', 'timeline', 'list', 'tabs', 'tab', 'tags', 'pagination', 'card', 'grid', 'media'),
    pendingComponents: ['component:data-table'],
    substitutes: {hero: 'page-header', chart: 'table', kanban: 'list', pricing: 'table', gallery: 'list', cta: 'links', 'buy-box': 'links'},
    patterns: ['pattern:docs-reference'],
    charts: {kinds: [], max: 0, presets: []},
    themes: ['manual', 'devtool', 'civic'],
    axes: {width: ['wide', 'standard'], radius: ['subtle', 'square', 'soft'], elevation: ['outline', 'flat'], motion: ['none', 'subtle'], scale: ['tight', 'balanced'], backdrop: ['plain', 'grid'], ornament: ['none', 'lines']},
    color: {palettes: ['static-kit'], modes: ['light', 'dark', 'auto']},
    fields: {'section.surface': ['plain', 'flat'], 'grid.columns': ['two', 'three']},
    narrow: {maxWidth: 720, navigation: 'sidebar-to-header', aside: 'aside-stack', grid: 'grid-reflow', table: 'table-scroll', chart: 'none'},
    quality: {minMaterial: 'implemented', maxTopLevel: 6, maxNav: 8},
  },
  'mobile-app': {
    label: '모바일 앱', contexts: ['listing', 'settings', 'auth', 'form'],
    density: {info: 'medium', allowed: ['comfortable', 'spacious'], default: 'comfortable'},
    type: {rolePreset: 'type-role-preset:dashboard', typography: ['sans', 'rounded', 'humanist'], default: 'sans'},
    controlSize: {allowed: ['large', 'medium'], default: 'large'},
    tableRows: {density: [], variants: [], maxColumns: 0},
    chrome: {header: 'compact-title', sidebar: 'none', shells: ['dock', 'minimal'], footer: ['minimal']},
    components: list(BASE, 'filter-bar', 'list', 'timeline', 'faq', 'cta', 'card', 'form', 'stepper', 'tabs', 'tab', 'metric', 'chart', 'progress', 'properties', 'tags', 'media'),
    pendingComponents: ['component:select-control'],
    substitutes: {table: 'list', grid: 'list', aside: 'section', split: 'section', kanban: 'list', 'master-detail': 'list', bento: 'list', calendar: 'list', pagination: 'actions', toc: 'links'},
    patterns: ['pattern:mobile-navigation', 'pattern:mobile-form'],
    charts: {kinds: ['line', 'bar'], max: 1, presets: ['chart-preset:mobile-sparkline']},
    themes: ['clarity', 'pocket'],
    axes: {width: ['narrow', 'standard'], radius: ['round', 'soft', 'bubble'], elevation: ['soft', 'outline', 'flat'], motion: ['subtle', 'none', 'lively'], scale: ['balanced'], backdrop: ['plain', 'tint'], ornament: ['none', 'organic']},
    color: {palettes: ['static-kit'], modes: ['light', 'dark', 'auto']},
    fields: {'form.variant': ['stacked'], 'section.surface': ['plain', 'flat']},
    narrow: {maxWidth: 720, navigation: 'dock-tabs', aside: 'none', grid: 'none', table: 'none', chart: 'chart-data-table'},
    quality: {minMaterial: 'implemented', maxTopLevel: 6, maxNav: 5},
  },
});
export const PROFILE_IDS = Object.freeze(Object.keys(PROFILES));
/** 프로파일이 제한하는 일반 축. 서체·밀도·셸·모드는 따로 검사한다. */
export const PROFILE_AXES = Object.freeze(['width', 'radius', 'elevation', 'motion', 'scale', 'backdrop', 'ornament']);

/**
 * 레이아웃 패턴 11개. 기존 템플릿 하나를 뼈대로 쓰고 최상위 구역을 슬롯으로 나눈다.
 *   template   뼈대 템플릿(src/catalog/templates.mjs). pageType은 그 템플릿의 것이다
 *   slots      [{id, accepts: 허용 부품 type, min, max, from: 템플릿 최상위 자식 번호(기본 내용)}]. 슬롯 순서가 곧 화면 순서다
 *   shells     허용 셸(첫 값이 기본). widths: 허용 폭(첫 값이 기본)
 *   primitives 재사용하는 배치 원형(layout-primitive), recipe: 재사용하는 디자인 레시피(없으면 null)
 *   maxTopLevel 최상위 구역 수 상한
 */
export const PATTERNS = Object.freeze({
  'erp-workspace': {label: 'ERP 사이드바·상단바·작업 영역', template: 'admin-table', recipe: null, primitives: ['stack', 'cluster'],
    shells: ['sidebar', 'rail', 'stacked'], widths: ['full', 'wide'], maxTopLevel: 5,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'toolbar', accepts: ['filter-bar', 'actions', 'tags'], min: 0, max: 1, from: [1]},
      {id: 'work', accepts: ['table', 'list', 'master-detail', 'kanban', 'grid', 'aside'], min: 1, max: 2, from: [2]},
      {id: 'footer', accepts: ['pagination', 'notice'], min: 0, max: 1, from: [3]},
    ]},
  'dashboard-grid': {label: '대시보드 그리드', template: 'dashboard-overview', recipe: 'ops-dashboard', primitives: ['flow', 'split'],
    shells: ['sidebar', 'rail', 'topbar', 'stacked'], widths: ['wide', 'full', 'standard'], maxTopLevel: 6,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'kpis', accepts: ['grid'], min: 1, max: 1, from: [1]},
      {id: 'insights', accepts: ['aside', 'grid', 'chart', 'split'], min: 0, max: 2, from: [2]},
      {id: 'detail', accepts: ['table', 'list'], min: 0, max: 1, from: [3]},
    ]},
  'admin-settings': {label: '관리 화면(설정)', template: 'settings', recipe: null, primitives: ['stack', 'container'],
    shells: ['sidebar', 'stacked', 'topbar', 'rail'], widths: ['wide', 'standard', 'full'], maxTopLevel: 4,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'panels', accepts: ['tabs', 'form', 'list', 'properties', 'section'], min: 1, max: 2, from: [1]},
      {id: 'status', accepts: ['notice'], min: 0, max: 1, from: [2]},
    ]},
  'commerce-listing': {label: '커머스 목록', template: 'product-listing', recipe: null, primitives: ['flow', 'split'],
    shells: ['stacked', 'topbar', 'centered'], widths: ['wide', 'standard'], maxTopLevel: 4,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'catalog', accepts: ['aside', 'grid', 'filter-bar'], min: 1, max: 2, from: [1]},
      {id: 'footer', accepts: ['pagination'], min: 0, max: 1, from: [2]},
    ]},
  'commerce-detail': {label: '커머스 상세', template: 'product-detail', recipe: null, primitives: ['split', 'stack'],
    shells: ['stacked', 'topbar', 'centered'], widths: ['wide', 'standard'], maxTopLevel: 4,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'purchase', accepts: ['split'], min: 1, max: 1, from: [1]},
      {id: 'info', accepts: ['tabs', 'section', 'reviews', 'faq'], min: 0, max: 2, from: [2]},
    ]},
  'commerce-checkout': {label: '커머스 결제', template: 'checkout', recipe: null, primitives: ['split', 'stack'],
    shells: ['stacked', 'topbar', 'centered'], widths: ['wide', 'standard'], maxTopLevel: 4,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'progress', accepts: ['stepper'], min: 0, max: 1, from: [1]},
      {id: 'payment', accepts: ['aside'], min: 1, max: 1, from: [2]},
    ]},
  'marketing-landing': {label: '마케팅 히어로·섹션', template: 'saas-landing', recipe: 'saas-landing', primitives: ['bento', 'flow', 'container'],
    shells: ['topbar', 'stacked', 'centered'], widths: ['standard', 'wide'], maxTopLevel: 10,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'hero', accepts: ['hero'], min: 1, max: 1, from: [1]},
      {id: 'sections', accepts: ['section', 'logo-cloud', 'grid', 'quote', 'faq'], min: 1, max: 7, from: [2, 3, 4, 5, 6, 7]},
      {id: 'closing', accepts: ['cta'], min: 0, max: 1, from: [8]},
    ]},
  'editorial-article': {label: '에디토리얼 글', template: 'article', recipe: 'content-page', primitives: ['stack', 'container'],
    shells: ['editorial', 'centered', 'masthead', 'stacked'], widths: ['standard', 'narrow'], maxTopLevel: 8,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'lead', accepts: ['media'], min: 0, max: 1, from: [1]},
      {id: 'body', accepts: ['prose', 'section', 'quote', 'list'], min: 1, max: 5, from: [2, 3]},
      {id: 'aside', accepts: ['notice'], min: 0, max: 1, from: [4]},
    ]},
  'docs-reference': {label: '문서 레퍼런스', template: 'docs-reference', recipe: 'content-page', primitives: ['split', 'stack'],
    shells: ['sidebar', 'stacked', 'topbar'], widths: ['wide', 'standard'], maxTopLevel: 4,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'body', accepts: ['aside', 'section', 'prose'], min: 1, max: 3, from: [1]},
    ]},
  'mobile-navigation': {label: '모바일 탐색', template: 'event-schedule', recipe: null, primitives: ['stack', 'cluster'],
    shells: ['dock'], widths: ['narrow', 'standard'], maxTopLevel: 5,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'filter', accepts: ['filter-bar'], min: 0, max: 1, from: [1]},
      {id: 'items', accepts: ['list', 'timeline', 'links', 'faq', 'card'], min: 1, max: 3, from: [2, 3]},
      {id: 'action', accepts: ['actions'], min: 0, max: 1, from: []},
    ]},
  'mobile-form': {label: '모바일 폼', template: 'signup', recipe: null, primitives: ['stack', 'container'],
    shells: ['minimal'], widths: ['narrow', 'standard'], maxTopLevel: 4,
    slots: [
      {id: 'header', accepts: ['page-header'], min: 1, max: 1, from: [0]},
      {id: 'form', accepts: ['form'], min: 1, max: 1, from: [1]},
      {id: 'help', accepts: ['notice', 'links', 'actions'], min: 0, max: 2, from: [2]},
    ]},
});
export const PATTERN_IDS = Object.freeze(Object.keys(PATTERNS));

/** 프로파일 기본 패턴: 목록의 첫 값. */
export const defaultPattern = profileId => PROFILES[profileId].patterns[0].slice('pattern:'.length);
