/**
 * 페이지 계획(ADR 0012 §6 확장, 계약 0.2.0): 목적과 콘텐츠 구조를 받아 레이아웃 패턴·슬롯을 고르고, 콘텐츠를 슬롯에 놓는다.
 *
 * - 뼈대는 구형 템플릿이다. 패턴(src/profiles/data.mjs PATTERNS)이 템플릿 하나와 슬롯을 정하고, 콘텐츠가 없는 필수 슬롯은 템플릿의 내용이 들어간다.
 * - 데이터 양이 배치를 바꾼다: KPI 개수 → 격자 열 수와 밀도, 표 행 수 → 표 종류·변형·툴바, 차트 개수 → 슬롯 구성, 카드 개수 → 열 수.
 * - 요청한 것을 넣지 못하면 다른 것으로 바꾸지 않고 이유(P_PAGE_*)와 대안을 낸다.
 * - AI가 HTML·CSS를 만들지 않는다. 노드는 등록된 노드 문법의 필드만 채우고, 렌더는 기존 렌더러가 한다(page.mjs).
 *
 * 이 파일은 계산만 한다(시간·난수·전역 상태 없음). 같은 입력은 같은 계획을 낸다.
 */
import {createBlueprint, templates, pageTypes, themes, navLimits, axes} from '../catalog/index.mjs';
import {nodeSpecAt} from '../catalog/node-extensions.mjs';
import {resolveChartPreset} from '../render/chart-presets.mjs';
import {PATTERNS} from '../profiles/data.mjs';
import {axisIds} from './axes.mjs';
import {axisBans} from '../catalog/axes.mjs';
import {STATE_KINDS} from './data/states.mjs';

export const PAGE_REQUEST_KEYS = Object.freeze(['purpose', 'pattern', 'shell', 'width', 'density', 'mode', 'styleContext', 'palette', 'subtokenSet', 'typeSystem', 'families', 'components', 'content', 'candidates', 'surface', 'motion', 'background', 'media', 'states']);
export const PAGE_COMPONENT_KEYS = Object.freeze(['base', 'family', 'props', 'content', 'slot']);
export const PAGE_CONTENT_KEYS = Object.freeze(['name', 'nav', 'title', 'description', 'actions', 'kpis', 'charts', 'table', 'list', 'hero', 'features', 'featuresTitle', 'quotes', 'faq', 'cta', 'lead', 'sections', 'notice', 'products', 'productsTitle', 'status']);
export const MAX_CANDIDATES = 8;
/** 표가 이 행 수를 넘으면 쪽 단위로 나눠 첫 쪽만 놓고 페이지네이션을 둔다(구형 table·data-table 노드는 최대 40행). */
export const TABLE_PAGE_ROWS = 20;
/** 표가 이 행 수를 넘으면 검색·필터 줄을 둔다. */
export const TABLE_TOOLBAR_ROWS = 10;
export const PAGE_CATALOG_VERSION = '2.6.0';
const GRID_MAX = 12, PRODUCTS_PER_PAGE = 12;

/** 페이지 목적. patterns는 선호 순서가 아니라 후보 목록이다(데이터 양과 요청이 순서를 정한다). */
export const PURPOSES = Object.freeze({
  'saas-landing': {label: 'SaaS 랜딩', patterns: ['marketing-landing'], density: 'comfortable'},
  'work-dashboard': {label: '업무 대시보드', patterns: ['dashboard-grid', 'erp-workspace'], density: 'comfortable'},
  'editorial-docs': {label: '에디토리얼·문서', patterns: ['editorial-article', 'docs-reference'], density: 'comfortable'},
  commerce: {label: '커머스', patterns: ['commerce-listing', 'commerce-detail', 'commerce-checkout'], density: 'comfortable'},
});
export const PURPOSE_IDS = Object.freeze(Object.keys(PURPOSES));

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});
const clone = x => structuredClone(x);
const strip = (prefix, id) => (typeof id === 'string' && id.startsWith(prefix) ? id.slice(prefix.length) : id);
const canHold = (parent, child) => Boolean(nodeSpecAt(parent, PAGE_CATALOG_VERSION)?.children?.includes(child));
const placeLikeOf = type => nodeSpecAt(type, PAGE_CATALOG_VERSION)?.placeLike ?? type;

/** 격자 열 수. 마지막 줄에 한 칸만 남지 않게 하고, 빈 칸이 가장 적은 열 수를 고른다(같으면 넓은 열). 2개 이하는 2열. */
export function columnsFor(n) {
  if (n <= 2) return 'two';
  if (n === 3) return 'three';
  const fits = [4, 3].filter(c => n % c !== 1).map(c => ({c, gap: (c - (n % c)) % c}));
  const best = fits.sort((a, b) => a.gap - b.gap || b.c - a.c)[0] ?? {c: 3};
  return {3: 'three', 4: 'four'}[best.c];
}
const COLUMN_COUNT = {two: 2, three: 3, four: 4};
const chartColumnsFor = n => (n === 2 || n === 4 ? 'two' : 'three');
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined).map(k => [k, obj[k]]));

/** 1단계 보조: 요청 모양 검사(닫힌 키). 개별 값의 의미(id가 등록됐는가 등)는 계획·선택 단계가 본다. */
export function normalizePageRequest(request) {
  const diagnostics = [];
  if (!plain(request)) return {intent: null, diagnostics: [diag('P_REQUEST', '$', '요청은 객체여야 합니다')]};
  for (const k of Object.keys(request)) if (!PAGE_REQUEST_KEYS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.${k}`, `지원하지 않는 키: ${k}. 임의 CSS·HTML 경로는 없습니다`, {alternatives: PAGE_REQUEST_KEYS}));
  if (typeof request.purpose !== 'string' || !PURPOSE_IDS.includes(request.purpose)) diagnostics.push(diag('P_PAGE_PURPOSE', '$.purpose', `목적은 ${PURPOSE_IDS.join('·')} 중 하나입니다(받은 값: ${JSON.stringify(request.purpose) ?? 'undefined'})`, {alternatives: PURPOSE_IDS}));
  const content = request.content ?? {};
  if (!plain(content)) diagnostics.push(diag('P_REQUEST_CONTENT', '$.content', 'content는 객체여야 합니다', {alternatives: PAGE_CONTENT_KEYS}));
  else for (const k of Object.keys(content)) if (!PAGE_CONTENT_KEYS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.content.${k}`, `지원하지 않는 콘텐츠 키: ${k}`, {alternatives: PAGE_CONTENT_KEYS}));
  const components = request.components ?? [];
  if (!Array.isArray(components)) diagnostics.push(diag('P_REQUEST_COMPONENTS', '$.components', 'components는 배열입니다'));
  else components.forEach((c, i) => {
    if (!plain(c) || typeof c.base !== 'string') { diagnostics.push(diag('P_REQUEST_COMPONENTS', `$.components[${i}]`, '{base, family?, props?, content, slot?} 객체여야 합니다')); return; }
    for (const k of Object.keys(c)) if (!PAGE_COMPONENT_KEYS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.components[${i}].${k}`, `지원하지 않는 키: ${k}`, {alternatives: PAGE_COMPONENT_KEYS}));
  });
  const families = request.families ?? [];
  if (!Array.isArray(families)) diagnostics.push(diag('P_REQUEST_FAMILIES', '$.families', 'families는 패밀리 id 배열입니다'));
  const reqStates = request.states ?? {};
  if (!plain(reqStates)) diagnostics.push(diag('P_REQUEST_STATES', '$.states', 'states는 {empty?, loading?, error?, success?: 상태 패턴 id} 객체입니다'));
  else for (const [k, v] of Object.entries(reqStates)) {
    if (!STATE_KINDS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.states.${k}`, `상태는 ${STATE_KINDS.join('·')}입니다`, {alternatives: STATE_KINDS}));
    else if (typeof v !== 'string') diagnostics.push(diag('P_REQUEST_STATES', `$.states.${k}`, '상태 패턴 id 문자열입니다'));
  }
  const limit = request.candidates ?? 3;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CANDIDATES) diagnostics.push(diag('P_REQUEST_CANDIDATES', '$.candidates', `candidates는 1~${MAX_CANDIDATES} 정수입니다`));
  const mode = request.mode ?? 'light';
  if (!['light', 'dark'].includes(mode)) diagnostics.push(diag('P_ATTR_MODE', '$.mode', 'mode는 light·dark입니다'));
  for (const [key, list] of [['shell', axes.shell], ['width', axes.width], ['density', axes.density]]) {
    if (request[key] !== undefined && !list.includes(request[key])) diagnostics.push(diag('P_ATTR_AXIS', `$.${key}`, `${key}는 ${list.join('·')} 중 하나입니다(받은 값: ${JSON.stringify(request[key])})`, {alternatives: list}));
  }
  for (const key of ['pattern', 'styleContext', 'palette', 'subtokenSet', 'typeSystem', 'surface', 'motion', 'background', 'media']) if (request[key] !== undefined && typeof request[key] !== 'string') diagnostics.push(diag('P_REQUEST', `$.${key}`, `${key}는 문자열입니다`));
  const intent = {
    purpose: request.purpose, pattern: request.pattern ?? null, shell: request.shell ?? null, width: request.width ?? null, density: request.density ?? null, mode,
    styleContext: request.styleContext ?? null, palette: request.palette ?? null, subtokenSet: request.subtokenSet ?? null, typeSystem: request.typeSystem ?? null,
    families: Array.isArray(families) ? [...families] : [], components: Array.isArray(components) ? clone(components) : [], surface: request.surface ?? null, motion: request.motion ?? null, background: request.background ?? null, media: request.media ?? null, states: plain(reqStates) ? {...reqStates} : {}, content: plain(content) ? clone(content) : {}, candidates: Number.isInteger(limit) ? limit : 3,
  };
  return {intent, diagnostics};
}

// ---------------------------------------------------------------------------------------------------------------------
// 슬롯에 놓는 콘텐츠 → 노드

const ACTION_KEYS = ['label', 'href', 'variant'];
const action = a => ({href: '#main', variant: 'primary', ...pick(a, ACTION_KEYS)});

/** 계획 작성 중 쓰는 도구. fail은 진단을 모으고, note는 레이아웃 결정(왜 이 배치인가)을 남긴다. */
function makeCtx(intent, patternId, skeleton, env) {
  const pattern = PATTERNS[patternId], diagnostics = [], layout = [], unplaced = [];
  const slots = pattern.slots.map(s => ({id: s.id, accepts: s.accepts, min: s.min, max: s.max, nodes: [], source: null, reasons: []}));
  const ctx = {
    intent, pattern, patternId, skeleton, env, slots, diagnostics, layout, unplaced, content: intent.content, auto: [],
    slot: id => slots.find(s => s.id === id),
    fail: (code, path, message, alternatives = []) => diagnostics.push(diag(code, path, message, alternatives.length ? {alternatives} : {})),
    note: (rule, value, reason) => layout.push({rule, value, reason}),
    put(id, nodes, source, reason) { const s = ctx.slot(id); if (!s) return false; s.nodes.push(...nodes); s.source = s.source ?? source; if (reason) s.reasons.push(reason); return true; },
    states: [],
    /** 상태 화면 자리(계획 0.5.0): 구형 divider 노드가 렌더 뒤에 상태 패턴의 마크업으로 바뀐다. usage는 region(표·목록·차트 자리) 또는 status(페이지 머리 아래 안내). */
    stateNode(kind, usage, input, path) {
      const index = ctx.states.length;
      ctx.states.push({index, kind, usage, input: {...input}, path});
      return {type: 'divider', label: `platform-state-${index}`};
    },
    /** 자동 승격 후보를 더하고 컴포넌트 번호(요청 컴포넌트 뒤)를 돌려준다. */
    addAuto: spec => intent.components.length + ctx.auto.push(spec) - 1,
    skeletonOf: id => pattern.slots.find(s => s.id === id).from.map(i => clone(skeleton[i])),
  };
  return ctx;
}

function pageHeader(ctx) {
  const base = clone(ctx.skeleton[0]), c = ctx.content;
  if (c.title !== undefined) base.title = c.title;
  if (c.description !== undefined) base.description = c.description;
  if (c.actions !== undefined) base.actions = c.actions.map(action);
  return base;
}

const STATE_INPUT_KEYS = ['title', 'body', 'action', 'details'];
/** 상태 화면의 글: stateText의 title·body·action({label, href?})·details만 받는다. 그 밖의 키는 거부한다. */
function stateText(ctx, spec, path) {
  const t = spec?.stateText ?? {};
  if (!plain(t)) { ctx.fail('P_PAGE_CONTENT', `${path}.stateText`, 'stateText는 {title?, body?, action?, details?} 객체입니다'); return {}; }
  for (const k of Object.keys(t)) if (!STATE_INPUT_KEYS.includes(k)) ctx.fail('P_PAGE_CONTENT', `${path}.stateText.${k}`, `지원하지 않는 키: ${k}`, STATE_INPUT_KEYS);
  return t;
}
const REGION_STATES = ['empty', 'loading', 'error'];
/** 표·목록·차트의 상태. 명시한 state가 없고 데이터가 비었으면 empty. ready면 null. */
function regionState(ctx, spec, path, empty) {
  const st = spec.state ?? (empty ? 'empty' : 'ready');
  if (st === 'ready') return null;
  if (!REGION_STATES.includes(st)) { ctx.fail('P_PAGE_CONTENT', `${path}.state`, `state는 ready·${REGION_STATES.join('·')}입니다(받은 값: ${JSON.stringify(st)})`, ['ready', ...REGION_STATES]); return null; }
  return st;
}

const metricNode = k => ({type: 'metric', ...pick(k, ['label', 'value', 'detail', 'trend', 'delta'])});

/** 필수 슬롯에 콘텐츠가 없으면 템플릿 뼈대의 내용을 넣는다(출처 skeleton으로 남는다). */
function fillSkeletonFor(ctx, ids) {
  for (const id of ids) {
    const s = ctx.slot(id);
    if (s && !s.nodes.length && s.min > 0) ctx.put(id, ctx.skeletonOf(id), 'skeleton', '콘텐츠가 없어 템플릿 뼈대의 내용을 쓴다');
  }
}

function chartNode(ctx, spec, i) {
  const path = `$.content.charts[${i}]`;
  if (!plain(spec)) { ctx.fail('P_PAGE_CHART', path, '차트는 {preset?, kind?, title?, caption?, unit?, categories?, series?} 객체입니다'); return null; }
  const id = spec.preset ? (spec.preset.startsWith('chart-preset:') ? spec.preset : `chart-preset:${spec.preset}`) : null;
  const data = pick(spec, ['title', 'caption', 'unit', 'categories', 'series']);
  let node;
  if (id) {
    node = resolveChartPreset(id, data);
    if (node.errors) { ctx.fail('P_PAGE_CHART', path, node.errors.map(e => e.message).join(' ')); return null; }
    ctx.note('chart', id, `차트 프리셋 ${id}(${node.kind})를 그대로 배치한다. 프로파일 차트 형태 제한은 이 경로에 없다`);
  } else {
    node = {type: 'chart', kind: spec.kind ?? 'bar', ...data};
    for (const f of ['title', 'categories', 'series']) if (node[f] === undefined) { ctx.fail('P_PAGE_CHART', path, `프리셋 없이 차트를 놓으려면 title·kind·categories·series가 필요합니다(${f} 없음)`); return null; }
  }
  return node;
}

// ---- 업무 대시보드 --------------------------------------------------------------------------------------------------
function fillDashboard(ctx) {
  const c = ctx.content, hasWork = ctx.patternId === 'erp-workspace';
  ctx.put('header', [pageHeader(ctx)], c.title !== undefined || c.description !== undefined || c.actions !== undefined ? 'content' : 'skeleton');
  let kpis = null;
  if (c.kpis !== undefined) {
    if (!Array.isArray(c.kpis) || c.kpis.length < 2) ctx.fail('P_PAGE_CONTENT', '$.content.kpis', `KPI는 2개 이상 ${GRID_MAX}개 이하의 배열입니다(격자의 최소 칸 수가 2). 받은 개수: ${Array.isArray(c.kpis) ? c.kpis.length : '배열 아님'}`);
    else if (c.kpis.length > GRID_MAX) ctx.fail('P_PAGE_OVERFLOW', '$.content.kpis', `KPI ${c.kpis.length}개는 한 격자(최대 ${GRID_MAX}칸)에 담을 수 없습니다. 지표를 줄이거나 표로 옮기세요`);
    else {
      const columns = columnsFor(c.kpis.length), rows = Math.ceil(c.kpis.length / COLUMN_COUNT[columns]);
      kpis = {type: 'grid', columns, children: c.kpis.map(metricNode)};
      ctx.note('kpis.columns', columns, `KPI ${c.kpis.length}개 → ${COLUMN_COUNT[columns]}열 ${rows}줄(마지막 줄에 한 칸만 남지 않게)`);
    }
  }
  // 표: 행 수가 표 변형·툴바·밀도·쪽 나눔을 정한다
  let table = null, toolbar = null, paging = null;
  if (c.table !== undefined) {
    const t = c.table;
    if (!plain(t) || !Array.isArray(t.columns) || !Array.isArray(t.rows) || t.columns.length < 2 || t.columns.length > 8) ctx.fail('P_PAGE_CONTENT', '$.content.table', '표는 {title, columns: 2~8개, rows: [[…]]} 입니다');
    else if (regionState(ctx, t, '$.content.table', t.rows.length === 0)) {
      const st = regionState(ctx, t, '$.content.table', t.rows.length === 0);
      table = ctx.stateNode(st, 'region', stateText(ctx, t, '$.content.table'), '$.content.table');
      ctx.note('table.state', st, `표가 ${st} 상태라 표 자리에 ${st} 상태 패턴을 둔다(툴바·페이지네이션은 두지 않는다)`);
    } else {
      const n = t.rows.length, paged = n > TABLE_PAGE_ROWS, shown = paged ? t.rows.slice(0, TABLE_PAGE_ROWS) : t.rows, title = t.title ?? '표';
      table = {type: 'table', title, caption: t.caption ?? `${title} ${n}행${paged ? `(1쪽 ${shown.length}행 표시)` : ''}`, columns: t.columns.map(String), rows: shown.map(r => r.map(String)), variant: n <= TABLE_TOOLBAR_ROWS ? 'plain' : 'striped'};
      ctx.note('table.variant', table.variant, n <= TABLE_TOOLBAR_ROWS ? `표 ${n}행은 한눈에 읽히므로 plain` : `표 ${n}행은 줄을 따라 읽도록 striped`);
      if (n > TABLE_TOOLBAR_ROWS) {
        const last = t.columns.length - 1, values = [...new Set(t.rows.map(r => String(r[last] ?? '')).filter(Boolean))].sort().slice(0, 4);
        toolbar = {type: 'filter-bar', placeholder: `${title} 검색`, filters: ['전체', ...(values.length ? values : ['최근'])].slice(0, 5), selected: 0};
        ctx.note('table.toolbar', 'filter-bar', `표 ${n}행은 찾고 거를 수 있도록 검색·필터 줄을 둔다`);
      }
      if (paged) {
        const pages = Math.ceil(n / TABLE_PAGE_ROWS);
        if (pages > 50) ctx.fail('P_PAGE_OVERFLOW', '$.content.table', `표 ${n}행은 ${pages}쪽이 되어 페이지네이션 상한(50쪽)을 넘습니다. 행을 ${TABLE_PAGE_ROWS * 50}개 이하로 줄이세요`);
        paging = {type: 'pagination', pages, current: 1};
        ctx.note('table.pages', String(pages), `표 ${n}행은 한 쪽 ${TABLE_PAGE_ROWS}행씩 ${pages}쪽이다. 이 화면은 1쪽(${shown.length}행)이고 쪽 이동은 페이지네이션이 맡는다`);
      }
    }
  }
  const charts = (c.charts ?? []).map((s, i) => {
    const st = plain(s) && s.state !== undefined ? regionState(ctx, s, `$.content.charts[${i}]`, false) : null;
    if (!st) return chartNode(ctx, s, i);
    if (c.charts.length !== 1 || c.list !== undefined) { ctx.fail('P_PAGE_CONTENT', `$.content.charts[${i}].state`, '차트의 상태 화면은 차트가 하나이고 목록이 없을 때 단독 배치로만 둡니다(격자·보조 영역 안에는 상태 화면을 넣을 수 없습니다)'); return null; }
    ctx.note('chart.state', st, `차트가 ${st} 상태라 차트 자리에 ${st} 상태 패턴을 둔다`);
    return ctx.stateNode(st, 'region', stateText(ctx, s, `$.content.charts[${i}]`), `$.content.charts[${i}]`);
  });
  if (c.charts !== undefined && !Array.isArray(c.charts)) ctx.fail('P_PAGE_CHART', '$.content.charts', 'charts는 배열입니다');
  const listState = c.list !== undefined ? regionState(ctx, c.list, '$.content.list', !(c.list.items?.length)) : null;
  if (listState && charts.filter(Boolean).length) ctx.fail('P_PAGE_CONTENT', '$.content.list.state', '목록의 상태 화면은 차트가 없을 때 단독 배치로만 둡니다(보조 영역 안에는 상태 화면을 넣을 수 없습니다)');
  const list = c.list === undefined ? null : listState ? ctx.stateNode(listState, 'region', stateText(ctx, c.list, '$.content.list'), '$.content.list') : {type: 'list', title: c.list.title ?? '목록', items: c.list.items, variant: 'card'};

  if (!hasWork) {
    if (kpis) ctx.put('kpis', [kpis], 'content'); else fillSkeletonFor(ctx, ['kpis']);
    // 인사이트 칸: 차트 1개는 그대로, 2개 이상은 격자. 목록이 함께 있으면 본문+보조 영역으로 묶는다.
    const goodCharts = charts.filter(Boolean);
    if (goodCharts.length > 6) ctx.fail('P_PAGE_OVERFLOW', '$.content.charts', `차트 ${goodCharts.length}개는 인사이트 칸에 담을 수 없습니다(최대 6개). 차트를 줄이세요`);
    else if (goodCharts.length) {
      const main = goodCharts.length === 1 ? goodCharts[0] : {type: 'grid', columns: chartColumnsFor(goodCharts.length), children: goodCharts};
      if (goodCharts.length > 1) ctx.note('charts.columns', main.columns, `차트 ${goodCharts.length}개 → ${COLUMN_COUNT[main.columns]}열 격자`);
      if (list) { ctx.put('insights', [{type: 'aside', side: 'end', label: list.title, size: 'narrow', children: [main, list]}], 'content'); ctx.note('insights', 'aside', '차트와 목록이 함께 있어 본문+보조 영역으로 묶는다'); }
      else ctx.put('insights', [main], 'content');
    } else if (list && !table) ctx.put('detail', [list], 'content', '표가 없어 목록을 상세 칸에 둔다');
    else if (list) ctx.unplaced.push({what: '$.content.list', reason: '인사이트 칸은 차트가 있을 때만 목록을 보조 영역으로 받고, 상세 칸은 표가 이미 차지했습니다. 차트를 함께 주거나 표를 빼세요', alternatives: ['content.charts와 함께 list', 'content.table 제거']});
    if (paging) { ctx.fail('P_PAGE_SLOT', '$.content.table', `표 ${c.table.rows.length}행은 쪽 단위(${TABLE_PAGE_ROWS}행)로 나눠야 하는데 dashboard-grid에는 페이지네이션 칸이 없습니다. 표를 ${TABLE_PAGE_ROWS}행 이하로 줄이거나 차트 없이 erp-workspace 패턴을 쓰세요`, ['content.table.rows ≤ 20', 'pattern: erp-workspace']); return; }
    if (table && toolbar) ctx.note('pattern.toolbar', 'none', 'dashboard-grid에는 툴바 칸이 없어 검색·필터 줄은 표 바로 위에 둔다');
    if (table) ctx.put('detail', [...(toolbar ? [toolbar] : []), table], 'content');
    fillSkeletonFor(ctx, ['insights']);
  } else {
    if (toolbar) ctx.put('toolbar', [toolbar], 'content');
    if (paging) ctx.put('footer', [paging], 'content');
    const work = [...(kpis ? [kpis] : []), ...(table ? [table] : []), ...(!table && list ? [list] : [])];
    if (work.length) ctx.put('work', work, 'content'); else fillSkeletonFor(ctx, ['work']);
    if (charts.filter(Boolean).length) ctx.unplaced.push({what: '$.content.charts', reason: 'erp-workspace의 작업 칸은 표·목록·격자·보조 영역만 최대 2개 받고, KPI와 표가 이미 차지했습니다. 차트가 필요하면 dashboard-grid 패턴을 쓰세요', alternatives: ['pattern: dashboard-grid']});
    if (table && !ctx.slot('toolbar').nodes.length && c.table?.rows?.length > TABLE_TOOLBAR_ROWS) ctx.note('toolbar', 'missing', '툴바 칸이 비었다');
    if (kpis && list && table) ctx.unplaced.push({what: '$.content.list', reason: '작업 칸이 KPI 격자와 표로 가득 찼습니다', alternatives: ['list 제거']});
  }
  fillSkeletonFor(ctx, ['header']);
}

/** 페이지 머리 아래 상태 안내(content.status: {state, title?, body?, action?}). 모든 목적이 같은 방식으로 받는다. */
function fillStatus(ctx) {
  const st = ctx.content.status;
  if (st === undefined) return;
  if (!plain(st) || !STATE_KINDS.includes(st.state)) { ctx.fail('P_PAGE_CONTENT', '$.content.status', `status는 {state: ${STATE_KINDS.join('·')}, title?, body?, action?} 입니다`, STATE_KINDS); return; }
  for (const k of Object.keys(st)) if (k !== 'state' && !STATE_INPUT_KEYS.includes(k)) ctx.fail('P_PAGE_CONTENT', `$.content.status.${k}`, `지원하지 않는 키: ${k}`, STATE_INPUT_KEYS);
  // 랜딩은 히어로가 page-header 바로 다음이어야 하므로(HERO_POSITION) 히어로 뒤에 둔다. 나머지는 페이지 머리 바로 아래다.
  const host = ctx.slot(ctx.intent.purpose === 'saas-landing' ? 'hero' : 'header');
  if (host) host.nodes.push(ctx.stateNode(st.state, 'status', pick(st, STATE_INPUT_KEYS), '$.content.status'));
}

// ---- SaaS 랜딩 -----------------------------------------------------------------------------------------------------
function fillLanding(ctx) {
  const c = ctx.content;
  ctx.put('header', [pageHeader(ctx)], c.title !== undefined || c.description !== undefined || c.actions !== undefined ? 'content' : 'skeleton');
  if (c.hero !== undefined) {
    const h = c.hero;
    if (!plain(h) || typeof h.title !== 'string') ctx.fail('P_PAGE_CONTENT', '$.content.hero', 'hero는 {title, body?, eyebrow?, action?, secondaryAction?, variant?} 입니다');
    else ctx.put('hero', [{type: 'hero', variant: h.variant ?? 'centered', ...pick(h, ['eyebrow', 'title', 'body']), ...(h.action ? {action: action(h.action)} : {}), ...(h.secondaryAction ? {secondaryAction: action({variant: 'secondary', ...h.secondaryAction})} : {})}], 'content');
  } else fillSkeletonFor(ctx, ['hero']);
  const sections = [];
  if (c.features !== undefined) {
    const f = c.features;
    if (!Array.isArray(f) || f.length < 2) ctx.fail('P_PAGE_CONTENT', '$.content.features', `기능은 2개 이상의 배열입니다(격자의 최소 칸 수가 2). 받은 개수: ${Array.isArray(f) ? f.length : '배열 아님'}`);
    else {
      const slotMax = ctx.slot('sections').max, per = GRID_MAX, chunks = [];
      for (let i = 0; i < f.length; i += per) chunks.push(f.slice(i, i + per));
      if (chunks.at(-1).length === 1 && chunks.length > 1) chunks.at(-2).length > 2 && chunks.at(-1).unshift(chunks.at(-2).pop());
      chunks.forEach((chunk, ci) => {
        const columns = columnsFor(chunk.length);
        // 구형 card 노드 대신 등록된 card-surface 패밀리 구성원으로 놓을 수 있으면 놓는다(page.mjs가 패밀리가 있을 때만 표시를 살린다).
        const children = chunk.map((x, i) => ({$component: ctx.addAuto({base: 'base-component:card-surface', content: {id: `feature-${ci * per + i + 1}`, title: x.title, body: x.body, ...(x.href ? {href: x.href} : {})}, legacy: {type: 'card', title: x.title, body: x.body, variant: 'outline', ...(x.icon ? {icon: x.icon} : {})}})}));
        sections.push({type: 'section', title: ci === 0 ? c.featuresTitle ?? '핵심 기능' : `${c.featuresTitle ?? '핵심 기능'} ${ci + 1}`, children: [{type: 'grid', columns, children}]});
        ctx.note(`features[${ci}].columns`, columns, `기능 ${chunk.length}개 → ${COLUMN_COUNT[columns]}열 ${Math.ceil(chunk.length / COLUMN_COUNT[columns])}줄`);
      });
      if (sections.length > slotMax) ctx.fail('P_PAGE_OVERFLOW', '$.content.features', `기능 ${f.length}개는 구역 ${sections.length}개가 필요하지만 이 패턴의 구역 칸은 최대 ${slotMax}개입니다`);
    }
  }
  if (c.quotes !== undefined) {
    const q = c.quotes;
    if (!Array.isArray(q) || !q.length) ctx.fail('P_PAGE_CONTENT', '$.content.quotes', 'quotes는 비어 있지 않은 배열입니다');
    else {
      const nodes = q.map(x => ({type: 'quote', ...pick(x, ['quote', 'author', 'role'])}));
      sections.push(nodes.length === 1 ? nodes[0] : {type: 'grid', columns: nodes.length === 2 ? 'two' : 'three', children: nodes.slice(0, GRID_MAX)});
    }
  }
  if (c.faq !== undefined) {
    if (!Array.isArray(c.faq) || c.faq.length < 2 || c.faq.length > 10) ctx.fail('P_PAGE_CONTENT', '$.content.faq', `자주 묻는 질문은 2~10개입니다(받은 개수: ${Array.isArray(c.faq) ? c.faq.length : '배열 아님'})`);
    else sections.push({type: 'faq', title: '자주 묻는 질문', layout: c.faq.length > 4 ? 'split' : 'stack', items: c.faq.map(x => pick(x, ['question', 'answer']))});
  }
  if (sections.length) ctx.put('sections', sections, 'content'); else fillSkeletonFor(ctx, ['sections']);
  if (c.cta !== undefined) {
    if (!plain(c.cta) || typeof c.cta.title !== 'string') ctx.fail('P_PAGE_CONTENT', '$.content.cta', 'cta는 {title, body?, action} 입니다');
    else ctx.put('closing', [{type: 'cta', tone: 'brand', ...pick(c.cta, ['title', 'body']), action: action(c.cta.action ?? {label: '시작하기'})}], 'content');
  }
}

// ---- 에디토리얼·문서 -------------------------------------------------------------------------------------------------
function fillEditorial(ctx) {
  const c = ctx.content, docs = ctx.patternId === 'docs-reference';
  ctx.put('header', [pageHeader(ctx)], c.title !== undefined || c.description !== undefined ? 'content' : 'skeleton');
  const secs = c.sections;
  if (secs !== undefined && (!Array.isArray(secs) || !secs.length || secs.some(s => !plain(s) || typeof s.title !== 'string' || typeof s.body !== 'string'))) { ctx.fail('P_PAGE_CONTENT', '$.content.sections', 'sections는 {title, body} 배열입니다'); return; }
  const lead = c.lead !== undefined ? {type: 'prose', title: '개요', body: c.lead, variant: 'lead'} : null;
  const prose = s => ({type: 'prose', title: s.title, body: s.body});
  if (!docs) {
    const nodes = [];
    if (lead) nodes.push(lead);
    (secs ?? []).forEach((s, i) => nodes.push(prose(s, i)));
    if (nodes.length) {
      const slotMax = ctx.slot('body').max;
      if (nodes.length > slotMax) ctx.fail('P_PAGE_OVERFLOW', '$.content.sections', `본문 구역 ${nodes.length}개(리드 포함)는 에디토리얼 패턴의 본문 칸(최대 ${slotMax}개)을 넘습니다. 문서 패턴(docs-reference)이 더 많은 구역을 받습니다`);
      else { ctx.put('body', nodes, 'content'); ctx.note('body.sections', String(nodes.length), `본문 ${nodes.length}개를 제목 있는 글(prose)로 차례로 놓는다`); }
    } else fillSkeletonFor(ctx, ['body', 'lead']);
    if (c.notice) ctx.put('aside', [{type: 'notice', tone: 'info', variant: 'inline', ...pick(c.notice, ['title', 'body', 'tone'])}], 'content');
  } else {
    // 문서: 본문 한 구역 안에 항목을 쌓는다(구역 하나는 자식을 최대 12개 받는다)
    const items = [...(lead ? [lead] : []), ...(secs ?? []).map(prose)];
    if (items.length) {
      const per = 12, groups = [];
      for (let i = 0; i < items.length; i += per) groups.push(items.slice(i, i + per));
      if (groups.length > ctx.slot('body').max) ctx.fail('P_PAGE_OVERFLOW', '$.content.sections', `문서 구역 ${items.length}개는 본문 칸(구역 ${ctx.slot('body').max}개 × ${per}항목)을 넘습니다`);
      else { ctx.put('body', groups.map((g, gi) => ({type: 'section', title: gi === 0 ? c.title ?? '문서' : `${c.title ?? '문서'} ${gi + 1}`, children: g})), 'content'); ctx.note('body.sections', String(items.length), `문서 항목 ${items.length}개를 구역 ${groups.length}개에 쌓는다`); }
    } else fillSkeletonFor(ctx, ['body']);
  }
}

// ---- 커머스 -------------------------------------------------------------------------------------------------------
function fillCommerce(ctx) {
  const c = ctx.content, listing = ctx.patternId === 'commerce-listing';
  ctx.put('header', [pageHeader(ctx)], c.title !== undefined || c.description !== undefined ? 'content' : 'skeleton');
  if (!listing) {
    if (c.products !== undefined) ctx.unplaced.push({what: '$.content.products', reason: `${ctx.patternId} 패턴은 상품 목록 칸이 없습니다(상품 목록은 commerce-listing)`, alternatives: ['pattern: commerce-listing']});
    fillSkeletonFor(ctx, ctx.pattern.slots.map(s => s.id).filter(id => id !== 'header'));
    return;
  }
  if (c.products !== undefined) {
    const p = c.products;
    if (!Array.isArray(p) || p.length < 2) { ctx.fail('P_PAGE_CONTENT', '$.content.products', `상품은 2개 이상의 배열입니다(격자의 최소 칸 수가 2). 받은 개수: ${Array.isArray(p) ? p.length : '배열 아님'}`); return; }
    const shown = p.slice(0, PRODUCTS_PER_PAGE), pages = Math.ceil(p.length / PRODUCTS_PER_PAGE), columns = columnsFor(shown.length);
    const cards = shown.map(x => ({type: 'card', variant: 'media', visual: x.visual ?? 'photo', ratio: '1:1', body: x.body ?? x.meta ?? x.title, ...pick(x, ['title', 'meta', 'badge', 'price', 'listPrice', 'rating', 'reviews', 'motif'])}));
    ctx.put('catalog', [{type: 'grid', columns, children: cards}], 'content');
    ctx.note('products.columns', columns, `상품 ${shown.length}개 → ${COLUMN_COUNT[columns]}열 ${Math.ceil(shown.length / COLUMN_COUNT[columns])}줄`);
    if (pages > 1) {
      ctx.put('footer', [{type: 'pagination', pages, current: 1}], 'content');
      ctx.note('products.pages', String(pages), `상품 ${p.length}개는 한 쪽에 ${PRODUCTS_PER_PAGE}개씩 ${pages}쪽이다. 이 화면은 1쪽(${shown.length}개)이고 나머지는 페이지네이션이 가리킨다`);
    }
  } else fillSkeletonFor(ctx, ['catalog']);
  fillSkeletonFor(ctx, ['catalog']);
}

const FILLERS = {'work-dashboard': fillDashboard, 'saas-landing': fillLanding, 'editorial-docs': fillEditorial, commerce: fillCommerce};
const fillContent = ctx => { FILLERS[ctx.intent.purpose](ctx); fillStatus(ctx); };

/** 어떤 패턴이 이 콘텐츠에 맞는가: 선호 순서. 요청한 패턴이 있으면 그것만. */
function patternOrder(intent) {
  const purpose = PURPOSES[intent.purpose], c = intent.content;
  if (intent.pattern) return [strip('pattern:', intent.pattern)];
  const rows = c.table?.rows?.length ?? 0, secs = c.sections?.length ?? 0;
  if (intent.purpose === 'work-dashboard') return rows > TABLE_PAGE_ROWS || (rows > TABLE_TOOLBAR_ROWS && !(c.charts?.length)) ? ['erp-workspace', 'dashboard-grid'] : ['dashboard-grid', 'erp-workspace'];
  if (intent.purpose === 'editorial-docs') return secs > 4 ? ['docs-reference', 'editorial-article'] : ['editorial-article', 'docs-reference'];
  return purpose.patterns;
}

// ---- 컴포넌트 배치 ----------------------------------------------------------------------------------------------------
/** 기반 컴포넌트가 페이지 노드로 쓰이는 type: id 끝이 2.6.0 노드 이름(card-surface 등)이다. */
export const nodeTypeOfBase = id => strip('base-component:', id);
export const baseIsPlaceable = id => Boolean(nodeSpecAt(nodeTypeOfBase(id), PAGE_CATALOG_VERSION)?.placeLike);

/** 슬롯이 이 노드를 직접 받는가, 격자로 받는가. */
function slotFit(slot, type) {
  const like = placeLikeOf(type);
  if (slot.accepts.includes(type) || slot.accepts.includes(like)) return 'direct';
  if (slot.accepts.includes('grid') && canHold('grid', type)) return 'grid';
  return null;
}

/** 요청한 컴포넌트와 자동 승격 대상을 슬롯에 놓는다. 마커 {$component: 번호}가 격자 자식으로 들어가고 후보마다 노드로 바뀐다. */
function placeComponents(ctx, requested) {
  const items = requested.map((c, i) => ({c, i, path: `$.components[${i}]`}));
  const groups = new Map();
  for (const it of items) {
    const type = nodeTypeOfBase(it.c.base);
    if (!baseIsPlaceable(it.c.base)) { ctx.fail('P_PAGE_COMPONENT', `${it.path}.base`, `${it.c.base}는 페이지 노드로 놓을 수 없습니다(노드 문법에 없는 컴포넌트). 놓을 수 있는 컴포넌트: ${placeableBases(ctx).join(', ')}`, placeableBases(ctx)); continue; }
    const fits = ctx.slots.filter(s => s.id !== 'header' && slotFit(s, type));
    let slot;
    if (it.c.slot !== undefined) {
      slot = ctx.slot(it.c.slot);
      if (!slot) { ctx.fail('P_PAGE_SLOT', `${it.path}.slot`, `패턴 ${ctx.patternId}에 슬롯 ${it.c.slot}가 없습니다`, ctx.slots.map(s => s.id)); continue; }
      if (!slotFit(slot, type)) { ctx.fail('P_PAGE_SLOT', `${it.path}.slot`, `슬롯 ${slot.id}는 ${type}을 받지 않습니다(받는 부품: ${slot.accepts.join(', ')}). ${type}를 받는 슬롯: ${fits.map(s => s.id).join(', ') || '없음'}`, fits.map(s => s.id)); continue; }
    } else {
      slot = fits.at(-1);
      if (!slot) { ctx.fail('P_PAGE_SLOT', `${it.path}.base`, `패턴 ${ctx.patternId}에는 ${type}을 받는 슬롯이 없습니다`, ctx.pattern.slots.map(s => s.id)); continue; }
    }
    if (!groups.has(slot.id)) groups.set(slot.id, []);
    groups.get(slot.id).push({...it, type});
  }
  for (const [slotId, list] of groups) {
    const slot = ctx.slot(slotId), marker = n => ({$component: n});
    const fit = slotFit(slot, list[0].type);
    const lists = list.map(it => marker(it.i));
    if (fit === 'direct') {
      if (slot.nodes.length + lists.length > slot.max) { ctx.fail('P_PAGE_SLOT', `$.components`, `슬롯 ${slot.id}는 노드 ${slot.max}개까지입니다(${slot.nodes.length + lists.length}개)`, []); continue; }
      slot.nodes.push(...lists); slot.source = slot.source ?? 'component'; continue;
    }
    // 격자로 받는다: 슬롯에 이미 격자가 있으면 칸을 더하고, 없으면 새 격자를 만든다(격자는 2칸 이상).
    const host = slot.nodes.find(n => n.type === 'grid' && canHold('grid', list[0].type));
    if (host) {
      if (host.children.length + lists.length > GRID_MAX) { ctx.fail('P_PAGE_OVERFLOW', '$.components', `슬롯 ${slot.id}의 격자는 ${GRID_MAX}칸까지입니다(${host.children.length + lists.length}칸)`); continue; }
      host.children.push(...lists); host.columns = columnsFor(host.children.length);
      ctx.note(`${slot.id}.columns`, host.columns, `컴포넌트 ${lists.length}개를 ${slot.id}의 격자에 합쳐 ${host.children.length}칸 → ${COLUMN_COUNT[host.columns]}열`);
    } else if (lists.length >= 2) {
      if (slot.nodes.length + 1 > slot.max) { ctx.fail('P_PAGE_SLOT', '$.components', `슬롯 ${slot.id}는 노드 ${slot.max}개까지입니다`, []); continue; }
      const columns = columnsFor(lists.length);
      slot.nodes.push({type: 'grid', columns, children: lists}); slot.source = slot.source ?? 'component';
      ctx.note(`${slot.id}.columns`, columns, `컴포넌트 ${lists.length}개 → ${COLUMN_COUNT[columns]}열 격자`);
    } else {
      const other = ctx.slots.find(s => s.nodes.some(n => n.type === 'grid' && canHold('grid', list[0].type) && n.children.length < GRID_MAX));
      ctx.fail('P_PAGE_SLOT', `$.components[${list[0].i}]`, `슬롯 ${slot.id}는 격자로만 ${list[0].type}을 받고 격자는 2칸 이상이어야 합니다. 컴포넌트를 둘 이상 주거나${other ? `, 격자가 이미 있는 슬롯(${other.id})을 slot으로 지정하세요` : ', 격자를 만들 다른 콘텐츠와 함께 주세요'}`, other ? [other.id] : []);
    }
  }
}
const placeableBases = ctx => [...new Set(ctx.env.registry.kind('base-component').list().map(b => b.id).filter(baseIsPlaceable))];

// ---------------------------------------------------------------------------------------------------------------------
// 계획

/**
 * 계획 작성: {plan, diagnostics}. plan.slots의 노드는 구형 노드 문법이고, 격자 자식에 컴포넌트 마커({$component: 번호})가 들어 있다.
 * plan.components: 요청 컴포넌트(번호 = 요청 순서)와 자동 승격 후보(번호가 그 뒤). 자동 승격은 패밀리가 있을 때만 후보마다 card-surface로 바뀐다.
 */
export function planPage(intent, env) {
  const purpose = PURPOSES[intent.purpose], diagnostics = [], decisions = [];
  const attempts = [];
  for (const patternId of patternOrder(intent)) {
    if (!purpose.patterns.includes(patternId)) { diagnostics.push(diag('P_PAGE_PATTERN', '$.pattern', `${intent.purpose} 목적은 패턴 ${patternId}을 쓰지 않습니다`, {alternatives: purpose.patterns})); return {plan: null, diagnostics, decisions}; }
    const pattern = PATTERNS[patternId], tpl = templates[pattern.template];
    const sc = intent.styleContext ? env.registry.get(intent.styleContext) : null;
    const themeId = (sc?.reuses ?? []).map(r => /^theme:(.+)$/.exec(r)?.[1]).find(t => t && themes[t]) ?? tpl.theme;
    const bp = createBlueprint(pattern.template, themeId);
    const ctx = makeCtx(intent, patternId, bp.tree.children, env);
    fillContent(ctx);
    const req = intent.components.map((c, i) => ({...c, requestIndex: i}));
    const autoStart = req.length;
    placeComponents(ctx, req);
    attempts.push({patternId, pattern, tpl, themeId, bp, ctx, autoStart, failures: ctx.diagnostics.length + ctx.unplaced.length});
    if (!ctx.diagnostics.length && !ctx.unplaced.length) break;
  }
  const best = attempts.reduce((a, b) => (b.failures < a.failures ? b : a));
  const {ctx, patternId, pattern, tpl, themeId, bp} = best;
  // 어느 패턴도 다 놓지 못하면 패턴마다의 이유를 모두 낸다(한 패턴의 이유만 보이면 다른 패턴으로 바꿔 보라는 안내가 사라진다).
  if (best.failures > 0 && attempts.length > 1) {
    for (const a of attempts) {
      diagnostics.push(...a.ctx.diagnostics.map(d => ({...d, pattern: a.patternId, message: `[${a.patternId}] ${d.message}`})));
      for (const u of a.ctx.unplaced) diagnostics.push(diag('P_PAGE_SLOT', u.what, `[${a.patternId}] ${u.reason}`, {pattern: a.patternId, alternatives: u.alternatives ?? []}));
    }
    return {plan: null, diagnostics, decisions};
  }
  if (attempts.length > 1) decisions.push({slot: 'layout.pattern', id: patternId, source: 'content', reason: attempts.map(a => `${a.patternId}: ${a.failures ? `놓지 못한 것 ${a.failures}건` : '모두 놓음'}`).join(' / ')});
  else decisions.push({slot: 'layout.pattern', id: patternId, source: intent.pattern ? 'intent' : 'content', reason: `${purpose.label}의 ${pattern.label} 패턴`});
  diagnostics.push(...ctx.diagnostics);
  for (const u of ctx.unplaced) diagnostics.push(diag('P_PAGE_SLOT', u.what, u.reason, {alternatives: u.alternatives ?? []}));
  if (diagnostics.length) return {plan: null, diagnostics, decisions};

  // ---- 페이지 축: 요청 > 콘텐츠 > 스타일 맥락(테마) 기본값 > 패턴 기본값 ----
  const pageType = pageTypes[tpl.pageType], theme = themes[themeId];
  const shells = pattern.shells.filter(s => pageType.shells.includes(s)), widths = pattern.widths.filter(w => !pageType.widths || pageType.widths.includes(w));
  const axesOut = {}, sources = {};
  const choose = (axis, allowed, requested, fallbacks) => {
    if (requested) { if (!allowed.includes(requested)) diagnostics.push(diag('P_ATTR_AXIS', `$.${axis}`, `${patternId} 패턴은 ${axis}=${requested}를 허용하지 않습니다(허용: ${allowed.join('·')})`, {alternatives: allowed})); axesOut[axis] = requested; sources[axis] = 'intent'; return; }
    for (const [value, source] of fallbacks) if (value && allowed.includes(value)) { axesOut[axis] = value; sources[axis] = source; return; }
    axesOut[axis] = allowed[0]; sources[axis] = 'pattern';
  };
  // 스타일 맥락의 축 선호(axisPreferences.shell·width·density, 앞 값이 우선)를 먼저 읽고, 없으면 원본 테마의 기본값을 읽는다.
  const sc = intent.styleContext ? env.registry.get(intent.styleContext) : null;
  const prefs = axis => (sc?.axisPreferences?.[axis] ?? []).map(v => [v, 'style-context']);
  choose('shell', shells, intent.shell, [...prefs('shell'), [theme.defaults.shell, 'style-context']]);
  choose('width', widths, intent.width, [...prefs('width'), [theme.defaults.width, 'style-context']]);
  const dense = (c => (c.kpis?.length ?? 0) >= 7 || (c.table?.rows?.length ?? 0) > TABLE_TOOLBAR_ROWS)(intent.content);
  choose('density', axes.density, intent.density, [[intent.purpose === 'work-dashboard' && dense ? 'compact' : null, 'content'], ...prefs('density'), [theme.defaults.density, 'style-context'], [purpose.density, 'purpose']]);
  axesOut.mode = intent.mode; sources.mode = intent.mode === 'light' && !intent.styleContext ? 'default' : 'intent';
  for (const a of ['scale', 'backdrop', 'ornament', 'footer', 'icon', 'weight', 'control']) { axesOut[a] = theme.defaults[a]; sources[a] = 'style-context'; }
  if (diagnostics.length) return {plan: null, diagnostics, decisions};
  const fixes = resolveAxisConflicts({axesOut, sources, allowed: {shell: shells, width: widths, density: axes.density}, intent, env, context: tpl.pageType});
  if (fixes.errors.length) return {plan: null, diagnostics: fixes.errors, decisions};
  for (const a of ['shell', 'width', 'density']) decisions.push({slot: `layout.${a}`, id: axesOut[a], source: sources[a], reason: fixes.notes[a] ?? axisReason(a, axesOut[a], sources[a], intent, theme)});
  for (const a of Object.keys(fixes.notes)) if (!['shell', 'width', 'density'].includes(a)) decisions.push({slot: `layout.${a}`, id: axesOut[a], source: sources[a], reason: fixes.notes[a]});
  for (const l of ctx.layout) decisions.push({slot: `layout.${l.rule}`, id: String(l.value), source: 'content', reason: l.reason});

  // 컴포넌트 목록: 요청 컴포넌트(번호 = 요청 순서)와 그 뒤의 자동 승격 후보
  const components = [...intent.components.map((c, i) => ({...c, auto: false, requestIndex: i})), ...ctx.auto.map(a => ({...a, auto: true}))];
  const slots = ctx.slots.map(s => ({id: s.id, source: s.source ?? 'empty', reasons: s.reasons, nodes: s.nodes}));
  return {plan: {purpose: intent.purpose, pattern: patternId, template: pattern.template, pageType: tpl.pageType, context: tpl.pageType, theme: themeId, navLimit: Math.min(navLimits[axesOut.shell] ?? 6, sc?.layout?.navLimit ?? Infinity), blueprint: bp, states: ctx.states, axes: axesOut, axisSources: sources, slots, components, layout: ctx.layout, shells, widths}, diagnostics, decisions};
}

const ruleIdOf = reason => /^(X\d\d):/.exec(reason)?.[1] ?? null;
const parseAxisId = id => { const m = /^axis-value:([a-z]+)\.(.+)$/.exec(id); return m ? [m[1], m[2]] : null; };
/** 요구한 축은 바꾸지 않는다. 요구하지 않은 축이 금지 조합(X01 등)에 걸리면 같은 규칙의 대안 값으로 옮기고 이유를 남긴다. 둘 다 요구한 값이면 설명과 함께 거부한다. */
function resolveAxisConflicts({axesOut, sources, allowed, intent, env, context}) {
  const errors = [], notes = {};
  const idsOf = () => [...(intent.styleContext ? [intent.styleContext] : []), ...pageAxisIds({axes: axesOut})];
  const ctx = () => ({context, mode: axesOut.mode, density: axesOut.density});
  const canChange = axis => axis !== 'mode' && sources[axis] !== 'intent';
  const pool = axis => allowed[axis] ?? axes[axis];
  for (let round = 0; round < 6; round++) {
    const ev = env.graph.evaluate(idsOf(), ctx());
    const v = ev.violations.find(x => x.code === 'P_REL_FORBIDS');
    if (!v) break;
    const involved = [v.from, v.to].map(parseAxisId).filter(Boolean);
    const rule = ruleIdOf(v.reason), ban = axisBans.find(b => b.id === rule);
    const order = [...(ban ? Object.keys(ban.fix) : []), ...involved.map(([a]) => a)].filter((a, i, all) => canChange(a) && all.indexOf(a) === i);
    let moved = false;
    for (const axis of order) {
      const current = axesOut[axis];
      const trials = [...(ban?.fix[axis] ? [ban.fix[axis]] : []), ...pool(axis)].filter((x, i, all) => x !== current && pool(axis).includes(x) && all.indexOf(x) === i);
      const ok = trials.find(value => { const before = axesOut[axis]; axesOut[axis] = value; const clean = !env.graph.evaluate(idsOf(), ctx()).violations.some(y => y.code === 'P_REL_FORBIDS' && y.reason === v.reason); axesOut[axis] = before; return clean; });
      if (ok === undefined) continue;
      axesOut[axis] = ok; sources[axis] = rule ?? 'relation'; notes[axis] = `${v.reason} → ${axis}을 ${current}에서 ${ok}로 바꾼다(요구하지 않은 값이라 규칙이 허용하는 대안으로 정한다)`; moved = true; break;
    }
    if (!moved) { errors.push(diag('P_REL_FORBIDS', '$selection', `${v.from} × ${v.to}: ${v.reason} (요구한 값끼리의 충돌이라 다른 값으로 바꾸지 않는다)`, {rule, alternatives: order.length ? [] : involved.map(([a, x]) => `${a}≠${x}`)})); break; }
  }
  return {errors, notes};
}

function axisReason(axis, value, source, intent, theme) {
  if (source === 'intent') return `요청한 ${axis}=${value}`;
  if (source === 'content') return `콘텐츠 양이 많아 ${axis}=${value}로 촘촘하게 놓는다`;
  if (source === 'style-context') return `스타일 맥락(테마 ${theme.id})의 기본 ${axis}=${value}`;
  if (source === 'purpose') return `${PURPOSES[intent.purpose].label}의 기본 ${axis}=${value}`;
  return `패턴의 기본 ${axis}=${value}`;
}

/** 페이지 축 id 목록(관계 평가용). */
export const pageAxisIds = plan => axisIds({shell: plan.axes.shell, width: plan.axes.width, density: plan.axes.density, mode: plan.axes.mode, scale: plan.axes.scale, backdrop: plan.axes.backdrop, ornament: plan.axes.ornament, footer: plan.axes.footer, icon: plan.axes.icon});
export const navLimit = shell => navLimits[shell];
