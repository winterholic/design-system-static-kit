#!/usr/bin/env node
/**
 * scripts/generate-material-coverage.mjs
 *
 * Material Coverage Manifest 생성기 (Phase 0 감사, P0-AUDIT 재검증판).
 * REQUEST.md §1.2, §2.1, §2.2, §6.2, §4.4, §5.2, §7, §9.1, §9.2 준수.
 *
 * 원칙: 숫자와 판정은 이 파일에 적지 않는다. 모두 현재 코드와 서비스 호출에서 계산한다.
 *   - 요구 목록(§4.4 §5.2 §6.2 §7 §9.1 §9.2)과 §2.1 기준표는 REQUEST.md를 읽어 온다. 이 파일에 항목 수를 적지 않으므로 문서와 어긋날 수 없고,
 *     매핑 표가 REQUEST.md에 없는 항목이나 레지스트리에 없는 재료·변형 값을 가리키면 생성이 실패한다.
 *   - 재료는 src/platform, src/materials, src/profiles 레지스트리에서 읽는다.
 *   - 렌더·조립 여부는 서비스 함수(assembleDesign, assembleComponents, compileBlueprint, edit 연산)를 실제로 호출해 본다.
 *   - 웹 카탈로그 노출은 apps/web 라우트 파일이 부르는 서비스 질의를 같은 인자로 다시 불러 계산하고, 라우트 파일에 그 호출이 있는지 확인한다.
 *   - 테스트 근거는 레지스트리 기록의 quality.evidence 참조를 읽어 파일과 줄 번호가 실제로 있는지 확인한 것만 쓴다.
 *   - 계산이 비싼 값(구형 템플릿 조합 컴파일)은 baseline.json에서 읽고, 출처와 신선도 검사를 manifest.provenance에 함께 적는다.
 *   - 같은 입력이면 바이트 단위로 같은 출력(시각·난수·절대경로를 싣지 않는다).
 *
 *   node scripts/generate-material-coverage.mjs          MATERIAL-COVERAGE.json을 쓴다
 *   node scripts/generate-material-coverage.mjs --check  파일을 쓰지 않고 저장본과 바이트가 같은지만 본다(다르면 exit 1)
 */

import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

import {createPlatform, PURPOSES, PLATFORM_CONTRACT_VERSION, baseIsPlaceable} from '../src/platform/index.mjs';
import {assembleSpecimen} from '../src/platform/layouts.mjs';
import {designRegistry} from '../src/profiles/registry.mjs';
import {PROFILES, PATTERNS} from '../src/profiles/data.mjs';
import {assemble as assembleProfile} from '../src/profiles/assemble.mjs';
import {compile as compileDocument} from '../src/compiler.mjs';
import {templates, themes, pageTypes, ACCEPTED_CATALOG_VERSIONS} from '../src/catalog/index.mjs';
import {LEGACY_VARIANT_MAP} from '../src/platform/families/legacy-map.mjs';
import * as service from '../src/service/index.mjs';
import * as edit from '../src/edit/index.mjs';
import {platformSection} from './platform/platform-baseline.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'docs/dev/catalog-platform-upgrade';
const OUT_FILE = resolve(ROOT, DIR, 'MATERIAL-COVERAGE.json');
const BASELINE_PATH = 'docs/evidence/platform/baseline.json';
const REQUEST_PATH = `${DIR}/REQUEST.md`;
const CHECK = process.argv.includes('--check');

const read = path => readFileSync(resolve(ROOT, path), 'utf8');
const exists = path => existsSync(resolve(ROOT, path));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 16);
const sortKeys = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const uniq = xs => [...new Set(xs)];
const linesOf = (() => { const cache = new Map(); return path => { if (!cache.has(path)) cache.set(path, exists(path) ? read(path).split('\n').length : 0); return cache.get(path); }; })();

// -----------------------------------------------------------------------------
// 1. 레지스트리: 플랫폼 + 디자인(카탈로그) 재료 전수
// -----------------------------------------------------------------------------

const platformEnv = createPlatform();
const desRegistry = designRegistry();

/** id → {record, registry, kind}. 플랫폼 종류와 카탈로그 종류의 id 접두사는 겹치지 않는다(겹치면 생성 실패). */
const entities = new Map();
for (const kind of platformEnv.registry.kinds()) {
  for (const record of platformEnv.registry.list(kind)) entities.set(record.id, {record, registry: 'platform', kind});
}
for (const record of desRegistry.list()) {
  if (entities.has(record.id)) throw new Error(`재료 id가 두 레지스트리에 있습니다: ${record.id}`);
  entities.set(record.id, {record, registry: 'design', kind: record.kind});
}
const ofKind = kind => [...entities.values()].filter(e => e.kind === kind).map(e => e.record);
const kindCount = kind => ofKind(kind).length;
const need = id => { const e = entities.get(id); if (!e) throw new Error(`요구 매핑이 가리키는 재료가 레지스트리에 없습니다: ${id}`); return e; };

// -----------------------------------------------------------------------------
// 2. 요구 목록: REQUEST.md에서 읽는다
// -----------------------------------------------------------------------------

const REQUEST = read(REQUEST_PATH).split('\n');
const lineIndex = re => { const i = REQUEST.findIndex(l => re.test(l)); if (i < 0) throw new Error(`REQUEST.md에서 ${re} 를 찾지 못했습니다.`); return i; };
const slice = (from, to) => REQUEST.slice(lineIndex(from), lineIndex(to));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cells = line => line.split('|').slice(1, -1).map(c => c.trim());
const tableRows = lines => lines.filter(l => l.startsWith('|') && !/^\|\s*-/.test(l)).map(cells).slice(1);
/** 제목 아래 첫 불릿 목록(연속한 `- ` 줄)만 읽는다. */
function firstBullets(lines) {
  const out = []; let started = false;
  for (const l of lines) {
    const m = l.match(/^- (.+)$/);
    if (m) { started = true; out.push(m[1].trim()); } else if (started && l.trim() !== '') break;
  }
  return out;
}

/** §6.2: A~O 소절별 불릿. 같은 이름이 다른 소절에 있어도 소절 문자와 순번으로 구분하는 별개 요구다. */
const COMPONENT_REQS = [];
{
  let letter = null, n = 0;
  for (const l of slice(/^## 6\.2 /, /^## 6\.3 /)) {
    const h = l.match(/^### ([A-O])\. (.+)$/);
    if (h) { letter = h[1]; n = 0; continue; }
    const b = l.match(/^- (.+)$/);
    if (b && letter) COMPONENT_REQS.push({key: `${letter}/${b[1].trim()}`, section: `§6.2 ${letter}`, group: letter, name: b[1].trim(), reqId: `req:comp:${letter.toLowerCase()}-${String(++n).padStart(2, '0')}-${slug(b[1])}`});
  }
}
const SUBTOKEN_REQS = tableRows(slice(/^## 4\.4 /, /^## 4\.5 /)).map(([name], i) => ({key: `sub/${name}`, section: '§4.4', name, reqId: `req:subtoken:${String(i + 1).padStart(2, '0')}-${slug(name)}`}));
const TYPE_REQS = tableRows(slice(/^## 5\.2 /, /^## 5\.3 /)).flatMap(([group, names]) => names.split(',').map(s => s.trim()).map(name => ({group, name})))
  .map((r, i) => ({key: `type/${r.name}`, section: `§5.2 (${r.group})`, name: r.name, reqId: `req:type:${String(i + 1).padStart(2, '0')}-${slug(r.name)}`}));
const FAMILY_REQS = tableRows(slice(/^# 7\. /, /^# 8\. /)).map(([name], i) => ({key: `fam/${name}`, section: '§7', name, reqId: `req:family:${String(i + 1).padStart(2, '0')}-${slug(name)}`}));
const CHART_REQS = firstBullets(slice(/^## 9\.1 /, /^## 9\.2 /)).map((name, i) => ({key: `chart/${name}`, section: '§9.1', name, reqId: `req:chart:${String(i + 1).padStart(2, '0')}-${slug(name)}`}));
const LAYOUT_REQS = firstBullets(slice(/^## 9\.2 /, /^## 9\.3 /)).map((name, i) => ({key: `lay/${name}`, section: '§9.2', name, reqId: `req:layout:${String(i + 1).padStart(2, '0')}-${slug(name)}`}));
const ALL_REQS = [...COMPONENT_REQS, ...SUBTOKEN_REQS, ...TYPE_REQS, ...FAMILY_REQS, ...CHART_REQS, ...LAYOUT_REQS];
if (new Set(ALL_REQS.map(r => r.reqId)).size !== ALL_REQS.length) throw new Error('요구 id가 겹칩니다.');
const REQUEST_COUNTS = {components: COMPONENT_REQS.length, subtokenSets: SUBTOKEN_REQS.length, typeSystems: TYPE_REQS.length, families: FAMILY_REQS.length, charts: CHART_REQS.length, layouts: LAYOUT_REQS.length};

/** §2.1 기존 분석 기준표 */
const BASELINE_TABLE = tableRows(slice(/^## 2\.1 /, /^## 2\.2 /)).filter(r => /^\d+$/.test(r[1] ?? '')).map(([material, n]) => ({material, previousBaseline: Number(n)}));

// -----------------------------------------------------------------------------
// 3. 요구 ↔ 재료 매핑 (판단은 사람이 적고, 재료 id·변형 값은 생성 때마다 레지스트리와 대조한다)
// -----------------------------------------------------------------------------
// D(id...)                          그 재료가 요구 항목을 그대로 구현한다.
// V(id, 근거기록, {축: 값})           재료 하나의 변형 값으로 구현한다. 근거기록의 variants[축]에 값이 실제로 있어야 한다.
// S(id, 노드타입, 스키마경로, 값)       구형 노드의 스키마 열거값으로 구현한다. getComponentSpec의 스키마에 값이 실제로 있어야 한다.
// P(id, 이유)                       다른 재료의 구성 요소로만 존재한다(별도 재료가 아님).
// 항목이 아래 표에 없으면 missing이다(조용히 가까운 재료로 바꾸지 않는다).
const D = (...ids) => ({how: 'direct', ids});
const V = (id, via, variant, note) => ({how: 'variant', ids: [id], via, variant, note});
const S = (id, type, path, value, note) => ({how: 'schema', ids: [id], type, path, value, note});
const P = (id, note) => ({how: 'part-of', ids: [id], note});
const CHART = (chartKind, minSeries = 1) => ({how: 'chart-kind', chartKind, minSeries});

const BTN = 'component:button-control', INP = 'component:input-control', SEL = 'component:select-control', TAB = 'component:tabs-control', MOD = 'component:modal-dialog', FBM = 'component:feedback-message', TBL = 'component:data-table';
const COVERAGE = {
  'A/Button': D('base-component:button-control'),
  'A/Icon Button': D('purpose:button.icon'),
  'A/Link Button': V('base-component:button-control', BTN, {appearance: 'link'}),
  'A/Toggle Button': D('purpose:button.toggle'),
  'A/Split Button': D('purpose:button.split'),
  'A/Menu Button': D('purpose:button.menu'),
  'A/Floating Action Button': D('purpose:button.fab'),
  'A/Button Group': D('component:actions'),
  'A/Copy Button': D('purpose:button.copy'),
  'A/Close Button': D('purpose:button.close'),
  'A/Segmented Control': V('base-component:tabs-control', TAB, {appearance: 'segmented'}),
  'A/Loading Action Button': D('purpose:button.loading'),
  'B/Text Input': D('base-component:input-control'),
  'B/Textarea': V('base-component:input-control', INP, {kind: 'multiline'}),
  'B/Search Input': D('purpose:form.search'),
  'B/Password Input': V('base-component:input-control', INP, {kind: 'password'}),
  'B/Number Input': V('base-component:input-control', INP, {kind: 'number'}),
  'B/Email Input': V('base-component:input-control', INP, {kind: 'email'}),
  'B/Phone Input': S('component:form', 'form', 'fields.items.properties.type.enum', 'tel'),
  'B/URL Input': S('component:form', 'form', 'fields.items.properties.type.enum', 'url'),
  'B/Input Group': D('purpose:form.group'),
  'C/Select': D('base-component:select-control'),
  'C/Searchable Select': V('base-component:select-control', SEL, {search: 'local'}),
  'C/Combobox': V('base-component:select-control', SEL, {search: 'async'}, 'Select 렌더러는 role=combobox+listbox이고 async 검색은 옵션을 요청하는 콤보박스다'),
  'C/Multi-select': V('base-component:select-control', SEL, {mode: 'multiple'}),
  'C/Radio': S('component:form', 'form', 'fields.items.properties.type.enum', 'radio', 'radio 필드는 options(2개 이상)를 받으므로 항상 라디오 묶음으로 렌더된다'),
  'C/Radio Group': S('component:form', 'form', 'fields.items.properties.type.enum', 'radio'),
  'C/Checkbox': S('component:form', 'form', 'fields.items.properties.type.enum', 'checkbox'),
  'C/Switch': S('component:form', 'form', 'fields.items.properties.type.enum', 'switch'),
  'D/Calendar': D('component:calendar'),
  'D/Date Picker': S('component:form', 'form', 'fields.items.properties.type.enum', 'date', '브라우저 기본 date 입력이다. 달력 팝업 컴포넌트가 아니다'),
  'E/Navbar': D('base-component:navigation-menu'),
  'E/Sidebar': D('purpose:navigation.sidebar'),
  'E/Breadcrumb': D('component:breadcrumb'),
  'E/Tabs': D('base-component:tabs-control'),
  'E/Vertical Tabs': V('base-component:tabs-control', TAB, {orientation: 'vertical'}),
  'E/Underline Tabs': V('base-component:tabs-control', TAB, {appearance: 'underline'}),
  'E/Stepper': D('component:stepper'),
  'E/Pagination': D('component:pagination'),
  'E/Bottom Navigation': D('purpose:navigation.bottom'),
  'E/Table of Contents': D('component:toc'),
  'F/Basic Card': D('base-component:card-surface'),
  'F/Feature Card': D('purpose:card.feature'),
  'F/KPI Card': D('purpose:card.kpi'),
  'F/Statistic Card': D('component:metric'),
  'F/Metric Trend Card': V('purpose:card.kpi', 'purpose:card.kpi', {trend: 'spark'}),
  'F/Product Card': D('purpose:card.product'),
  'F/Profile Card': D('purpose:card.profile'),
  'F/Team Member Card': D('component:team'),
  'F/Article Card': D('purpose:card.article'),
  'F/Media Card': V('component:card', 'component:card', {variant: 'media'}),
  'F/Pricing Card': D('purpose:card.pricing'),
  'F/Plan Card': D('component:plan'),
  'F/Settings Card': V('purpose:form.settings', 'purpose:form.settings', {layout: 'cards'}),
  'F/Testimonial Card': D('component:quote'),
  'G/Basic Table': D('base-component:data-table'),
  'G/Data Table': D('purpose:table.business'),
  'G/Sortable Table': V('base-component:data-table', TBL, {sortable: true}),
  'G/Selectable Table': V('base-component:data-table', TBL, {selectable: true}),
  'G/Dense Table': D('purpose:table.dense'),
  'G/Description List': D('component:properties'),
  'G/List': D('component:list'),
  'G/List Item': P('component:list', 'list 노드의 items 구조로만 존재한다'),
  'G/Kanban': D('component:kanban'),
  'G/Timeline': D('component:timeline'),
  'G/Activity Feed': V('component:timeline', 'component:timeline', {variant: 'log'}),
  'G/Master-detail': D('component:master-detail'),
  'G/Code Block': D('component:code'),
  'H/Modal': D('base-component:modal-dialog'),
  'H/Alert Dialog': V('base-component:modal-dialog', MOD, {role: 'alertdialog'}),
  'H/Confirmation Dialog': D('purpose:feedback.confirm'),
  'H/Bottom Sheet': V('base-component:modal-dialog', MOD, {placement: 'bottom'}),
  'H/Tooltip': D('base-component:tooltip'),
  'I/Alert': D('base-component:feedback-message'),
  'I/Banner': V('base-component:feedback-message', FBM, {placement: 'banner'}),
  'I/Toast': V('base-component:feedback-message', FBM, {placement: 'toast'}),
  'I/Snackbar': V('base-component:feedback-message', FBM, {placement: 'toast', action: 'button'}),
  'I/Inline Error': D('purpose:feedback.error'),
  'I/Empty State': D('state-pattern:empty-illustrated', 'state-pattern:empty-inline', 'component:empty-state'),
  'I/Error State': D('state-pattern:error-panel', 'state-pattern:error-banner'),
  'I/Success State': D('state-pattern:success-confirmation', 'state-pattern:success-toast', 'purpose:feedback.result'),
  'I/Skeleton': D('state-pattern:loading-skeleton', 'component:skeleton'),
  'I/Spinner': D('state-pattern:loading-spinner'),
  'I/Linear Progress': D('purpose:feedback.progress', 'component:progress'),
  'I/Step Progress': V('purpose:feedback.progress', 'purpose:feedback.progress', {kind: 'steps'}),
  'J/Badge': V('component:tags', 'component:tags', {variant: 'badges'}),
  'J/Chip': V('component:tags', 'component:tags', {variant: 'chips'}),
  'J/Filter Chip': V('purpose:form.filter', 'purpose:form.filter', {chips: 'toggles'}),
  'J/Tag': D('component:tags'),
  'J/Divider': D('component:divider'),
  'K/Image': V('component:media', 'component:media', {kind: 'photo'}),
  'K/Media Frame': D(...ofKind('media').map(r => r.id)),
  'K/Gallery': D('component:gallery'),
  'K/Video Frame': V('component:media', 'component:media', {kind: 'video'}),
  'K/Quote': D('component:quote'),
  'K/Rich Text Content': D('component:prose'),
  'L/Stack': D('layout-primitive:stack'),
  'L/Cluster': D('layout-primitive:cluster'),
  'L/Grid': D('component:grid'),
  'L/Split': D('layout-primitive:split', 'component:split'),
  'L/Bento': D('layout-primitive:bento', 'component:bento'),
  'L/Container': D('layout-primitive:container'),
  'L/Section': D('component:section'),
  'L/Sidebar Layout': D('component:aside'),
  'L/Master-detail Layout': D('component:master-detail'),
  'M/Filter Toolbar': D('purpose:form.filter'),
  'M/Search Toolbar': D('component:filter-bar', 'purpose:form.search'),
  'M/Bulk Action Toolbar': V('purpose:table.business', 'purpose:table.business', {toolbar: 'bulk'}),
  'M/Settings Form': D('purpose:form.settings'),
  'M/Workflow Steps': D('component:steps'),
  'N/Product Detail Summary': D('component:buy-box'),
  'N/Product Variant Selector': P('component:buy-box', 'buy-box의 options(라벨+선택지)로만 존재한다'),
  'N/Cart Summary': D('component:summary'),
  'N/Checkout Summary': D('component:summary'),
  'N/Review Summary': D('component:reviews'),
  'O/Mobile Header': D('purpose:navigation.topbar'),
  'O/Bottom Navigation': D('purpose:navigation.bottom'),
  'sub/Standard Neutral': D('subtoken-set:standard'),
  'sub/Brand Tinted': D('subtoken-set:tinted'),
  'sub/High Contrast': D('subtoken-set:high-contrast'),
  'sub/Premium Dark': D('subtoken-set:premium-dark'),
  'sub/Editorial Paper': D('subtoken-set:editorial-warm'),
  'sub/ERP Dense': D('subtoken-set:data-dense'),
  'sub/Commerce Vivid': D('subtoken-set:commerce-vivid'),
  'type/Dense ERP': D('type-system:tech-erp'),
  'type/Newspaper': D('type-system:doc-newsroom'),
  'type/Long-form Essay': D('type-system:doc-essay'),
  'type/Reference': D('type-system:doc-handbook'),
  'type/Bold Display': D('type-system:mkt-brand'),
  'type/Startup Launch': D('type-system:mkt-launch'),
  'type/Premium Launch': D('type-system:mkt-atelier'),
  'type/Catalog': D('type-system:shop-catalog'),
  'type/Fashion': D('type-system:shop-boutique'),
  'type/Native-like': D('type-system:mobile-app'),
  'fam/Minimal Flat': D('family:quiet'),
  'fam/Soft Rounded': D('family:soft'),
  'fam/Outline Precise': D('family:outline-precise'),
  'fam/Corporate Formal': D('family:corporate-formal'),
  'fam/Dense Enterprise': D('family:dense-enterprise'),
  'fam/Elevated Material': D('family:elevated-material'),
  'fam/Tonal Layered': D('family:tonal-layered'),
  'fam/Editorial': D('family:editorial'),
  'fam/Glass': D('family:glass'),
  'fam/Brutalist': D('family:bold'),
  'fam/Luxury': D('family:luxury'),
  'fam/Expressive': D('family:expressive'),
  'chart/Vertical Bar': CHART('bar'),
  'chart/Horizontal Bar': CHART('bars-h'),
  'chart/Grouped Bar': CHART('grouped-bar', 2),
  'chart/Stacked Bar': CHART('stacked-bar'),
  'chart/100% Stacked Bar': CHART('normalized-stacked-bar', 2),
  'chart/Line': CHART('line'),
  'chart/Multi-line': CHART('multi-line', 2),
  'chart/Step Line': CHART('step-line'),
  'chart/Area': CHART('area'),
  'chart/Stacked Area': CHART('stacked-area', 2),
  'chart/Pie': CHART('pie'),
  'chart/Donut': CHART('donut'),
  'chart/Scatter': CHART('scatter'),
  'chart/Bubble': CHART('bubble'),
  'chart/Heatmap': CHART('heatmap'),
  'chart/Treemap': CHART('treemap'),
  'chart/Radar': CHART('radar'),
  'chart/Waterfall': CHART('waterfall'),
  'chart/Funnel': CHART('funnel'),
  'chart/Gauge': CHART('gauge'),
  'chart/Bullet': CHART('bullet'),
  'chart/Sparkline': CHART('sparkline'),
  'chart/Candlestick': CHART('candlestick'),
  'chart/OHLC': CHART('ohlc'),
  'chart/Histogram': CHART('histogram'),
  'chart/Box Plot': CHART('box-plot'),
  'chart/Combination Chart': CHART('combination', 2),
  'chart/Calendar Heatmap': CHART('calendar-heatmap'),
  'chart/Progress Chart': CHART('progress-chart'),
  // §9.2 레이아웃 24종: 각 항목이 자기 `layout:*` 재료로 직접 구현된다(src/platform/data/layouts.mjs). 구형 component:grid·hero 변형 등은 L/ 항목이 그대로 맵한다.
  'lay/Single Column': D('layout:single-column'),
  'lay/Two Column': D('layout:two-column'),
  'lay/Three Column': D('layout:three-column'),
  'lay/Equal Grid': D('layout:equal-grid'),
  'lay/Asymmetric Grid': D('layout:asymmetric-grid'),
  'lay/Masonry': D('layout:masonry'),
  'lay/Bento': D('layout:bento'),
  'lay/Sidebar Main': D('layout:sidebar-main'),
  'lay/Double Sidebar': D('layout:double-sidebar'),
  'lay/Master-detail': D('layout:master-detail'),
  'lay/Dashboard Grid': D('layout:dashboard-grid'),
  'lay/KPI Strip': D('layout:kpi-strip'),
  'lay/Editorial Layout': D('layout:editorial-layout'),
  'lay/Split Hero': D('layout:split-hero'),
  'lay/Centered Hero': D('layout:centered-hero'),
  'lay/Media Hero': D('layout:media-hero'),
  'lay/Product Detail Layout': D('layout:product-detail-layout'),
  'lay/Commerce Grid': D('layout:commerce-grid'),
  'lay/Settings Layout': D('layout:settings-layout'),
  'lay/Documentation Layout': D('layout:documentation-layout'),
  'lay/Mobile Stack': D('layout:mobile-stack'),
  'lay/Sticky Action Layout': D('layout:sticky-action-layout'),
  'lay/Form Layout': D('layout:form-layout'),
  'lay/Multi-step Form': D('layout:multi-step-form'),
};
for (const key of Object.keys(COVERAGE)) {
  if (!ALL_REQS.some(r => r.key === key)) throw new Error(`REQUEST.md에 없는 요구 항목을 매핑했습니다: ${key}`);
}

/** 변형 값이 근거 기록에 실제로 있는지, 스키마 열거값에 실제로 있는지 확인한다. */
const schemaCache = new Map();
function specSchema(type) {
  if (!schemaCache.has(type)) { const r = service.getComponentSpec({type}); schemaCache.set(type, r.ok ? r.value.fields : null); }
  return schemaCache.get(type);
}
function resolveCoverage(req) {
  const spec = COVERAGE[req.key];
  if (!spec) return {how: 'missing', ids: [], note: null};
  if (spec.how === 'chart-kind') {
    const ids = ofKind('chart-preset').filter(p => p.ext.chartKind === spec.chartKind && p.ext.series.maximum >= spec.minSeries).map(p => p.id).sort();
    return ids.length ? {how: 'direct', ids, note: `ext.chartKind=${spec.chartKind}${spec.minSeries > 1 ? `, 계열 ${spec.minSeries}개 이상` : ''}인 프리셋 ${ids.length}개`} : {how: 'missing', ids: [], note: null};
  }
  for (const id of spec.ids) need(id);
  if (spec.how === 'variant') {
    const rec = need(spec.via).record;
    for (const [axis, value] of Object.entries(spec.variant)) {
      if (!rec.variants?.[axis]?.includes(value)) throw new Error(`${req.key}: ${spec.via}.variants.${axis}에 ${JSON.stringify(value)}가 없습니다.`);
    }
    return {how: 'variant', ids: spec.ids, via: spec.via, variant: spec.variant, note: spec.note ?? null};
  }
  if (spec.how === 'schema') {
    let node = specSchema(spec.type);
    for (const part of spec.path.split('.')) node = node?.[part];
    if (!Array.isArray(node) || !node.includes(spec.value)) throw new Error(`${req.key}: ${spec.type} 스키마 ${spec.path}에 ${spec.value}가 없습니다.`);
    return {how: 'schema', ids: spec.ids, schema: {type: spec.type, path: spec.path, value: spec.value}, note: spec.note ?? null};
  }
  return {how: spec.how, ids: spec.ids, note: spec.note ?? null};
}

// -----------------------------------------------------------------------------
// 4. 근거 검증: 정의 위치, 테스트 참조, 웹 라우트
// -----------------------------------------------------------------------------

/** 종류별 정의 위치. 파일과 심볼이 실제로 있어야 definitionPath로 쓴다. */
const DEFINITION = {
  palette: {platform: ['src/platform/data/palettes.mjs', 'PALETTES'], design: ['src/catalog/palettes.mjs', 'palettes']},
  'subtoken-set': ['src/platform/data/subtoken-sets.mjs', 'SUBTOKEN_SETS'],
  'type-system': ['src/platform/data/type-systems.mjs', 'TYPE_SYSTEMS'],
  family: ['src/platform/data/families.mjs', 'FAMILIES'],
  'base-component': ['src/platform/data/base-components.mjs', 'BASE_COMPONENTS'],
  'style-context': ['src/platform/data/style-contexts.mjs', 'STYLE_CONTEXTS'],
  surface: ['src/platform/data/surfaces.mjs', 'SURFACES'],
  motion: ['src/platform/data/motion.mjs', 'MOTIONS'],
  background: ['src/platform/data/backgrounds.mjs', 'BACKGROUNDS'],
  media: ['src/platform/data/media.mjs', 'MEDIA'],
  'state-pattern': ['src/platform/data/states.mjs', 'STATE_PATTERNS'],
  'axis-value': ['src/platform/axes.mjs', 'axisIds'],
  layout: ['src/platform/data/layouts.mjs', 'LAYOUTS'],
  'chart-preset': ['src/materials/chart-presets.mjs', 'chartPresetMaterials'],
  icon: ['src/catalog/icons.mjs', 'icons'],
  template: ['src/catalog/templates.mjs', 'templates'],
  theme: ['src/catalog/themes.mjs', 'themes'],
  axis: ['src/catalog/axes.mjs', 'axes'],
  component: ['src/catalog/nodes.mjs', 'nodeSpecs'],
  'color-token': ['src/color-tokens.mjs', 'resolveColorTokens'],
  'type-preset': ['src/typography.mjs', 'typeVars'],
  'type-role-preset': ['src/materials/typography.mjs', 'renderMaterialTypeCSS'],
  'layout-primitive': ['src/layout.mjs', 'layoutContractCSS'],
  'page-type': ['src/catalog/pagetypes.mjs', 'pageTypes'],
  recipe: ['src/catalog/recipes.mjs', 'recipes'],
  pattern: ['src/profiles/data.mjs', 'PATTERNS'],
  profile: ['src/profiles/data.mjs', 'PROFILES'],
};
function definitionOf(record, kind) {
  let spec = DEFINITION[kind];
  if (kind === 'palette') spec = DEFINITION.palette[record.source?.origin === 'internal' ? 'platform' : 'design'];
  if (kind === 'purpose-family') spec = [`src/platform/families/${record.group}.mjs`, 'purposeFamily'];
  if (kind === 'purpose-family') {
    const file = spec[0];
    return exists(file) ? `${file}` : null;
  }
  if (!spec) return null;
  const [file, symbol] = spec;
  return exists(file) && new RegExp(`\\b${symbol}\\b`).test(read(file)) ? `${file}#${symbol}` : null;
}

/** 'tests/x.test.mjs:12' 참조가 실제 파일의 실제 줄을 가리키는지. 유효한 것만 근거로 센다. */
const validRef = ref => { const m = String(ref).match(/^(tests\/[\w./-]+):(\d+)$/); return !!m && exists(m[1]) && Number(m[2]) >= 1 && Number(m[2]) <= linesOf(m[1]); };

/** 웹 라우트 근거: 파일이 있고, 그 파일이 부르는 질의 토큰이 실제로 들어 있는지 확인한다. */
const surfaceProof = new Map();
function proveSurface(id, files, needs) {
  const missing = files.filter(f => !exists(f));
  const text = files.filter(exists).map(read).join('\n');
  const absent = needs.filter(n => !text.includes(n));
  surfaceProof.set(id, {files, proven: missing.length === 0 && absent.length === 0, ...(missing.length ? {missingFiles: missing} : {}), ...(absent.length ? {missingTokens: absent} : {})});
  return missing.length === 0 && absent.length === 0;
}

const ok = r => r && r.ok;
const platformList = kind => { const r = service.listPlatformMaterials({kind, limit: 200}); return ok(r) ? r.value.items.map(x => x.id) : []; };
const catalogRows = (kind, extra = {}) => {
  const out = [];
  for (let cursor; ;) {
    const r = service.listCatalog({kind, limit: 200, ...extra, ...(cursor ? {cursor} : {})});
    if (!ok(r)) break;
    out.push(...r.value.items);
    if (!r.value.nextCursor) break;
    cursor = r.value.nextCursor;
  }
  return out;
};

/** 목적 패밀리 상세가 시각 패밀리로 바꿔 보여 주는 값. 라우트 파일의 VISUALS 상수에서 읽는다. */
const VISUALS = (read('apps/web/features/platform/component-view.server.ts').match(/export const VISUALS = \[([^\]]+)\]/)?.[1] ?? '').split(',').map(x => x.replace(/['"\s]/g, '')).filter(Boolean);

// 웹 Explore가 보여 주는 대표 디자인(apps/web/features/explore/designs.server.ts curatedDesigns와 같은 규칙)에서 실제로 쓰는 테마·팔레트를 얻는다.
function exploreDesigns() {
  const THEMED_PER_TEMPLATE = 2;
  const concepts = catalogRows('concepts', {fields: ['id', 'label', 'templates', 'looks']});
  const refs = [];
  for (const t of catalogRows('templates', {fields: ['id', 'theme']})) {
    refs.push({template: t.id});
    const mine = concepts.filter(c => c.templates.includes(t.id));
    const taken = new Set([`${t.theme}|`]);
    let added = 0;
    for (let round = 0; added < THEMED_PER_TEMPLATE; round++) {
      let progressed = false;
      for (const c of mine) {
        const look = c.looks[round];
        if (!look) continue;
        progressed = true;
        const key = `${look.theme}|${look.themeVariant ?? ''}`;
        if (taken.has(key) || added >= THEMED_PER_TEMPLATE) continue;
        taken.add(key); added++;
        refs.push({template: t.id, theme: look.theme});
      }
      if (!progressed) break;
    }
    if (t.id === 'saas-landing') refs.push({template: 'saas-landing', palette: 'pearl'});
  }
  const used = {templates: new Set(), themes: new Set(), palettes: new Set()};
  for (const ref of refs) {
    const made = edit.resetDocument(null, ref);
    if (!made.ok) continue;
    used.templates.add(`template:${ref.template}`);
    used.themes.add(`theme:${made.doc.theme}`);
    used.palettes.add(`palette:${made.doc.palette}`);
  }
  return used;
}

/** 라우트별 노출 재료. ids()는 라우트가 부르는 서비스 질의를 같은 인자로 불러 계산한다. */
function buildSurfaces() {
  const component2_6 = catalogRows('components', {filter: {catalogVersion: '2.6.0'}, fields: ['type']}).map(r => `component:${r.type}`);
  const purposeIds = platformList('purpose-family');
  const colorView = service.queryMaterials({view: 'color'});
  const typeView = service.queryMaterials({view: 'typography'});
  const foundations = service.queryMaterials({view: 'foundations'});
  const foundationAxes = ok(foundations) ? foundations.value.axes.map(a => a.id) : [];
  const explore = exploreDesigns();
  const baseDoc = edit.importBlueprint(null, {blueprint: {...edit.resetDocument(null, {template: 'about-team'}).doc, catalogVersion: '2.6.0'}});
  const studioParts = new Set();
  if (baseDoc.ok) {
    const paths = [[], ...baseDoc.doc.tree.children.map((_, i) => [i])];
    for (const path of paths) { const r = edit.addPlacements(baseDoc.doc, path); for (const side of ['inside', 'after']) for (const a of r[side]?.accepted ?? []) studioParts.add(`component:${a.type}`); }
  }
  // 루트에서 놓을 수 없는 부품(칸반 열, 탭 패널 등)은 그 부품을 실제로 담고 있는 템플릿 문서에서 부모 안에 놓을 수 있는지 본다.
  for (const id of component2_6.filter(c => !studioParts.has(c) && c !== 'component:page')) {
    const type = id.slice('component:'.length);
    for (const templateId of Object.keys(templates)) {
      const made = edit.resetDocument(null, {template: templateId});
      if (!made.ok) continue;
      const at = (nodes, trail) => { for (const [i, n] of (nodes ?? []).entries()) { if (n.type === type) return [...trail, i]; const deeper = at(n.children, [...trail, i]); if (deeper) return deeper; } return null; };
      const found = at(made.doc.tree.children, []);
      if (!found) continue;
      const r = edit.addPlacements(made.doc, found.slice(0, -1));
      if (['inside', 'after'].some(side => r[side]?.accepted?.some(a => a.type === type))) studioParts.add(id);
      break;
    }
  }
  // Studio 조립 화면(/studio/assemble): 목적 패밀리 상세에서 넘어오는 기반 컴포넌트는 카드 계열(children에 card-surface)뿐이다.
  const handoffFamilies = purposeIds.filter(id => { const f = platformEnv.registry.get(id); return f.children?.some(c => c.endsWith('card-surface')); });
  const handoffOk = handoffFamilies.filter(id => ok(service.assembleDesign({purpose: 'saas-landing', candidates: 1, components: [1, 2, 3].map(n => ({base: 'base-component:card-surface', family: 'family:soft', content: {id: `c${n}`, title: `${id} ${n}`, body: '내용'}}))}, {include: ['html']})));
  // 방향 단계(DirectionStep)는 목적마다 추천 순서 앞쪽 6개 스타일 맥락만 보여 준다.
  const directionStyles = new Set();
  for (const purpose of Object.keys(PURPOSES)) {
    const context = ({'saas-landing': 'landing', 'work-dashboard': 'dashboard', 'editorial-docs': 'article', commerce: 'commerce'})[purpose];
    const r = service.recommendMaterials({kind: 'style-context', context});
    if (ok(r)) r.value.ranked.slice(0, 6).forEach(x => directionStyles.add(x.id));
  }
  const axisValueIds = axisId => ofKind('axis-value').filter(a => a.axis === axisId).map(a => a.id);
  const studioAxes = catalogRows('axes', {fields: ['axis', 'values']}).filter(a => a.axis !== 'mode');
  const defs = [
    {id: 'web:/components', role: 'catalog', files: ['apps/web/app/components/page.tsx', 'apps/web/features/components/spec.server.ts'], needs: ['componentRows', 'purposeFamilies', "type !== 'page'"], ids: () => [...component2_6.filter(id => id !== 'component:page'), ...purposeIds]},
    {id: 'web:/components/[componentId]', role: 'detail', files: ['apps/web/app/components/[componentId]/page.tsx'], needs: ['generateStaticParams', 'componentRows'], ids: () => component2_6},
    {id: 'web:/components/purpose/[group]/[name]', role: 'detail', files: ['apps/web/app/components/purpose/[group]/[name]/page.tsx'], needs: ['purposeFamilies', 'purpose:${group}.${name}'], ids: () => purposeIds},
    {id: 'web:/materials/palettes', role: 'catalog', files: ['apps/web/app/materials/palettes/page.tsx'], needs: ["materials('palette')"], ids: () => platformList('palette')},
    {id: 'web:/materials/palettes/[paletteId]', role: 'detail', files: ['apps/web/app/materials/palettes/[paletteId]/page.tsx'], needs: ["materials('subtoken-set')"], ids: () => [...platformList('palette'), ...platformList('subtoken-set')]},
    {id: 'web:/materials/color', role: 'catalog', files: ['apps/web/app/materials/color/page.tsx', 'apps/web/features/materials/materials.server.ts'], needs: ['colorView', "material<any>('color')"], ids: () => (ok(colorView) ? colorView.value.materials.map(m => m.id) : [])},
    {id: 'web:/materials/typography', role: 'catalog', files: ['apps/web/app/materials/typography/page.tsx', 'apps/web/features/platform/TypeCompare.tsx'], needs: ['typeView', "materials('type-system')"], ids: () => [...(ok(typeView) ? typeView.value.presets.map(p => `type-role-preset:${p.id}`) : []), ...platformList('type-system')]},
    {id: 'web:/materials/styles', role: 'catalog', files: ['apps/web/app/materials/styles/page.tsx'], needs: ["materials('style-context')", 'OTHER_KINDS', 'materials(kind)'], ids: () => ['style-context', 'surface', 'motion', 'background', 'media', 'state-pattern'].flatMap(platformList)},
    {id: 'web:/materials/foundations', role: 'catalog', files: ['apps/web/app/materials/foundations/page.tsx', 'apps/web/features/materials/materials.server.ts'], needs: ['foundationAxes', 'iconRows', 'layoutPrimitives', "listCatalog({kind: 'icons'"], ids: () => [...foundationAxes, ...catalogRows('icons', {fields: ['id']}).map(r => `icon:${r.id}`), ...(ok(foundations) ? foundations.value.layoutPrimitives.map(m => m.id) : [])]},
    {id: 'web:/materials/foundations/[axis]', role: 'detail', files: ['apps/web/app/materials/foundations/[axis]/page.tsx'], needs: ['foundationAxes', 'generateStaticParams'], ids: () => [...foundationAxes, ...foundationAxes.flatMap(a => axisValueIds(a.slice('axis:'.length)))]},
    {id: 'web:/explore', role: 'catalog', files: ['apps/web/features/explore/designs.server.ts', 'apps/web/app/explore/page.tsx'], needs: ['curatedDesigns', "rows('templates'"], ids: () => [...explore.templates, ...explore.themes, ...explore.palettes]},
    {id: 'web:/explore/[designId]', role: 'detail', files: ['apps/web/app/explore/[designId]/page.tsx'], needs: ['findDesign'], ids: () => [...explore.templates]},
    {id: 'web:/studio', role: 'studio', files: ['apps/web/features/studio/components/DesignPanel.tsx', 'apps/web/features/studio/catalog.ts', 'apps/web/features/studio/components/Dialogs.tsx'], needs: ['catalog.themes', 'catalog.palettes', 'catalog.axes', 'getTypePresets', 'catalog?.templates'],
      ids: () => [...catalogRows('templates', {fields: ['id']}).map(r => `template:${r.id}`), ...catalogRows('themes', {fields: ['id']}).map(r => `theme:${r.id}`), ...catalogRows('palettes', {fields: ['id']}).map(r => `palette:${r.id}`),
        ...studioAxes.map(a => `axis:${a.axis}`), ...studioAxes.flatMap(a => a.values.map(v => `axis-value:${a.axis}.${v}`)), ...studioAxes.filter(a => a.axis === 'typography').flatMap(a => a.values.map(v => `type-preset:${v}`)),
        ...(ok(service.getTypePresets()) ? service.getTypePresets().value.presets.map(p => `type-role-preset:${p.id}`) : [])]},
    {id: 'web:/studio#insert-parts', role: 'studio', files: ['apps/web/features/studio/components/StructurePanel.tsx'], needs: ['addPlacements'], ids: () => [...studioParts]},
    {id: 'web:/studio/assemble#swap', role: 'studio', files: ['apps/web/app/studio/assemble/page.tsx'], needs: ["materials('palette')", "materials('subtoken-set')", "materials('type-system')", "materials('family')", "materials('surface')", "materials('motion')", "materials('background')", "materials('media')", "materials('axis-value')"],
      ids: () => [...['palette', 'subtoken-set', 'type-system', 'family', 'surface', 'motion', 'background', 'media'].flatMap(platformList), ...ofKind('axis-value').filter(a => ['shell', 'width', 'density'].includes(a.axis)).map(a => a.id)].filter(probeOk)},
    {id: 'web:/studio/assemble#direction', role: 'studio', files: ['apps/web/app/studio/assemble/page.tsx'], needs: ["recommend({kind: 'style-context'", 'slice(0, 6)'], ids: () => [...directionStyles].filter(probeOk)},
    {id: 'web:/studio/assemble#state-patterns', role: 'studio', files: ['apps/web/app/materials/styles/page.tsx', 'apps/web/features/platform/assemble-state.ts'], needs: ['spat', 'state-pattern'], ids: () => platformList('state-pattern').filter(probeOk)},
    {id: 'web:/materials/styles#studio-link', role: 'studio', files: ['apps/web/app/materials/styles/page.tsx'], needs: ['Studio에서 쓰기', 'probe.ok', 'writeState'], ids: () => ['style-context', 'surface', 'motion', 'background', 'media'].flatMap(platformList).filter(probeOk)},
    {id: 'web:/components/purpose/[group]/[name]#visual-families', role: 'catalog', files: ['apps/web/app/components/purpose/[group]/[name]/page.tsx', 'apps/web/features/platform/component-view.server.ts'], needs: ['VISUALS', 'visualOk'], ids: () => (VISUALS.map(v => `family:${v}`))},
    {id: 'web:/studio/assemble#component-handoff', role: 'studio', files: ['apps/web/app/components/purpose/[group]/[name]/page.tsx', 'apps/web/features/platform/assemble-state.ts'], needs: ["endsWith('card-surface')", 'component: shortId(baseId)'], ids: () => [...handoffOk, 'base-component:card-surface']},
  ];
  return defs.map(d => ({...d, proven: proveSurface(d.id, d.files, d.needs)})).map(d => ({...d, set: new Set(d.proven ? d.ids() : [])}));
}

// -----------------------------------------------------------------------------
// 5. 실제 호출 프로브: 렌더 가능·조립 가능·출력 해시
// -----------------------------------------------------------------------------

const PURPOSE_IDS = Object.keys(PURPOSES);
const STATE_SLOTS = ['empty', 'loading', 'error', 'success'];

/** 플랫폼 재료 하나를 고른 요청으로 실제 조립한다. 목적을 차례로 시험해 처음 받아들여지는 요청을 기록한다. */
function platformRequest(rec, kind) {
  const id = rec.id;
  switch (kind) {
    case 'palette': return {palette: id};
    case 'subtoken-set': return {subtokenSet: id};
    case 'type-system': return {typeSystem: id};
    case 'style-context': return {styleContext: id};
    case 'surface': case 'motion': case 'background': case 'media': return {[kind]: id};
    case 'state-pattern': {
      // 상태 패턴은 그 상태가 화면에 나타날 때만 출력에 닿는다. 표가 그 상태에 있는 내용으로 요청한다(success는 표 상태에 없어 기준 출력과 같다).
      const slot = (rec.tags ?? []).find(t => STATE_SLOTS.includes(t));
      const table = {title: '작업', columns: ['작업', '담당', '상태'], rows: [['작업 1', '담당 1', '진행']], ...(slot === 'empty' ? {rows: []} : {}), ...(slot === 'loading' || slot === 'error' ? {state: slot} : {})};
      return slot ? {states: {[slot]: id}, content: {table}} : null;
    }
    case 'family': return {components: [1, 2, 3].map(n => ({base: 'base-component:card-surface', family: id, content: {id: `c${n}`, title: `카드 ${n}`, body: '내용'}}))};
    case 'axis-value': return ['shell', 'width', 'density', 'mode'].includes(rec.axis) ? {[rec.axis]: rec.value} : null;
    default: return null;
  }
}
function assembleProbe(rec, kind) {
  const request = platformRequest(rec, kind);
  if (!request) return {method: 'assembleDesign', ran: false, ok: false, reason: '이 종류는 assembleDesign 요청 키로 직접 고를 수 없다'};
  let last = null;
  // 맥락(목적)과 모드 때문에 거부되는 재료가 있다(예: dark 전용 스타일). 모든 목적 × 모드에서 거부될 때만 실패로 본다.
  // 상태 패턴은 표가 있는 업무 대시보드에서만 상태 내용이 출력에 닿으므로 그 목적을 먼저 시험한다.
  const purposes = kind === 'state-pattern' ? ['work-dashboard', ...PURPOSE_IDS.filter(p => p !== 'work-dashboard')] : PURPOSE_IDS;
  for (const mode of ['light', 'dark']) for (const purpose of purposes) {
    const r = service.assembleDesign({purpose, mode, candidates: 1, ...request}, {include: ['html', 'css', 'manifest', 'blueprint']});
    if (!ok(r)) { last = r.errors?.[0]?.message ?? 'assembleDesign 실패'; continue; }
    const c = r.value.candidates[0];
    const manifest = JSON.stringify(c.value.manifest), blueprint = JSON.stringify(c.value.blueprint.materials ?? {});
    // 상태 패턴: 그 상태를 일으키는 내용을 빼고 정상 표로 조립한 출력과 같으면 그 상태가 화면에 나타나지 않으므로 고른 효과가 없다.
    let noEffect = false;
    if (kind === 'state-pattern') {
      const normal = service.assembleDesign({purpose, mode, candidates: 1, content: {table: {title: '작업', columns: ['작업', '담당', '상태'], rows: [['작업 1', '담당 1', '진행']]}}}, {include: ['html', 'css']});
      noEffect = ok(normal) && sha(normal.value.candidates[0].value.html + normal.value.candidates[0].value.css) === sha(c.value.html + c.value.css);
    }
    return {
      method: 'assembleDesign', ran: true, ok: true, purpose, mode, noEffect,
      qualityOk: Boolean(c.quality?.ok), blueprintHasId: blueprint.includes(rec.id), manifestHasId: manifest.includes(rec.id),
      htmlBytes: c.value.html.length, cssBytes: c.value.css.length, outputHash: sha(c.value.html + c.value.css), axes: Object.fromEntries(AXIS_FIELDS.map(a => [a, c.value.blueprint[a]])),
    };
  }
  return {method: 'assembleDesign', ran: true, ok: false, reason: last};
}
const AXIS_FIELDS = ['shell', 'typography', 'density', 'radius', 'control', 'elevation', 'motion', 'icon', 'ornament', 'backdrop', 'width', 'scale', 'weight', 'footer', 'mode'];

/** 레이아웃: 슬롯 계약을 모두 채운 표본(실제 목적 패밀리 렌더)을 assembleLayout으로 조립한다. 관계 그래프(layout × 목적 패밀리 × 밀도)를 거친 결과만 렌더로 센다. */
function layoutProbe(rec) {
  const r = assembleSpecimen(platformEnv, rec.id);
  if (!r.ok) return {method: 'assembleLayout(specimen)', ran: true, ok: false, reason: r.diagnostics[0]?.message ?? 'assembleLayout 실패'};
  const manifest = JSON.stringify(r.value.manifest);
  // 배치가 출력에 실제로 반영됐는가: 컴파일 CSS에 이 레이아웃의 선택자와 모든 폭 구간의 영역 표가 있어야 한다.
  const effective = r.value.css.includes(`.kit-lay[data-layout="${rec.id.slice('layout:'.length)}"]`) && rec.bands.every(b => r.value.css.includes('grid-template-areas'));
  return {method: 'assembleLayout(specimen)', ran: true, ok: true, noEffect: !effective, qualityOk: r.diagnostics.length === 0, blueprintHasId: false, manifestHasId: manifest.includes(rec.id), htmlBytes: r.value.html.length, cssBytes: r.value.css.length, outputHash: sha(r.value.html + r.value.css)};
}

/** 목적 패밀리: 웹 상세 화면과 같은 방식으로 assembleComponents를 부른다. */
function purposeProbe(rec) {
  const context = rec.contexts[0] === 'any' ? 'general' : rec.contexts[0];
  let last = null;
  // 웹 상세 화면은 시각 패밀리 칩을 바꿔 가며 보여 준다. 패밀리와 충돌하는 조합(예: 고밀도 표 × soft)이 있어도 한 패밀리에서 조립되면 렌더 가능이다.
  for (const visual of VISUALS.map(v => `family:${v}`)) {
    const r = service.assembleComponents({context, mode: 'light', items: [{purpose: rec.id, visual, variant: rec.example.variant, props: rec.example.props, content: rec.example.content}]});
    if (!ok(r)) { last = r.errors?.[0]?.message; continue; }
    return {method: 'assembleComponents', ran: true, ok: true, visual, qualityOk: true, htmlBytes: r.value.html.length, cssBytes: r.value.css.length, outputHash: sha(r.value.html + r.value.css), manifestHasId: JSON.stringify(r.value.manifest).includes(rec.id), blueprintHasId: null};
  }
  return {method: 'assembleComponents', ran: true, ok: false, reason: last};
}

// 구형 부품·차트·템플릿 등: 웹 /components/[componentId] 와 Studio가 쓰는 edit 연산·compileBlueprint로 실제 컴파일한다.
const BASE_DOC = {template: 'about-team', theme: 'workspace'};
const compileHtml = doc => { const r = service.compileBlueprint(doc, {include: ['html', 'css']}); return ok(r) ? r.value : null; };
function isolatedDoc(rec, node) {
  const made = edit.resetDocument(null, BASE_DOC);
  if (!made.ok) return null;
  let doc = made.doc;
  if (rec.since === '2.6.0') {
    const up = edit.importBlueprint(null, {blueprint: {...doc, catalogVersion: '2.6.0'}});
    if (!up.ok) return null;
    doc = up.doc;
  }
  const at = rec.id === 'component:hero' ? 1 : doc.tree.children.length;
  const ins = edit.insertNode(doc, {parent: [], node, index: at});
  if (!ins.ok) return null;
  doc = ins.doc;
  for (let i = doc.tree.children.length - 1; i >= 1; i--) {
    if (i === at) continue;
    const rm = edit.removeNode(doc, {path: [i]});
    if (!rm.ok) return null;
    doc = rm.doc;
  }
  return doc;
}
const firstTemplateUsing = (() => {
  const cache = new Map();
  return type => {
    if (cache.has(type)) return cache.get(type);
    const has = nodes => !!nodes?.some(n => n.type === type || has(n.children));
    let found = null;
    for (const t of Object.keys(templates)) { const made = edit.resetDocument(null, {template: t}); if (made.ok && has(made.doc.tree.children)) { found = t; break; } }
    cache.set(type, found);
    return found;
  };
})();
function componentProbe(rec) {
  const type = rec.id.slice('component:'.length);
  const spec = service.getComponentSpec({type, ...(rec.since === '2.6.0' ? {catalogVersion: '2.6.0'} : {})});
  if (!ok(spec)) return {method: 'compileBlueprint', ran: true, ok: false, reason: 'getComponentSpec 실패'};
  if (type === 'page') {
    const made = edit.resetDocument(null, BASE_DOC);
    const out = made.ok && compileHtml(made.doc);
    return out ? {method: 'compileBlueprint(every document root)', ran: true, ok: true, qualityOk: true, htmlBytes: out.html.length, cssBytes: out.css.length, outputHash: sha(out.html + out.css), blueprintHasId: true, manifestHasId: null} : {method: 'compileBlueprint', ran: true, ok: false, reason: '컴파일 실패'};
  }
  if (spec.value.example) {
    const node = rec.since === '2.6.0' ? {...spec.value.example, ...rec.defaults} : spec.value.example;
    for (const key of ['sortable', 'selectable']) if (typeof node[key] === 'boolean') node[key] = node[key] ? 'yes' : 'no';
    if (type === 'data-table' && !['ready', 'partial'].includes(node.state)) node.rows = [];
    const doc = isolatedDoc(rec, node);
    const out = doc && compileHtml(doc);
    if (out) return {method: 'compileBlueprint(isolated)', ran: true, ok: true, qualityOk: true, htmlBytes: out.html.length, cssBytes: out.css.length, outputHash: sha(out.html + out.css), blueprintHasId: true, manifestHasId: null};
  }
  const t = firstTemplateUsing(type);
  const made = t && edit.resetDocument(null, {template: t});
  const out = made?.ok && compileHtml(made.doc);
  return out ? {method: `compileBlueprint(template:${t})`, ran: true, ok: true, qualityOk: true, htmlBytes: out.html.length, cssBytes: out.css.length, outputHash: sha(out.html + out.css), blueprintHasId: true, manifestHasId: null}
    : {method: 'compileBlueprint', ran: true, ok: false, reason: '단독 예제도, 이 부품을 쓰는 템플릿도 컴파일되지 않는다'};
}
/** 프로파일 조립 경로(src/profiles/assemble.mjs)로 패턴 하나를 실제로 조립하고 컴파일한다. 값은 프로파일이 허용한 첫 값이다. */
function profileProbe(profileId, patternId) {
  const p = PROFILES[profileId], pattern = PATTERNS[patternId.slice('pattern:'.length)], pt = pageTypes[templates[pattern.template].pageType];
  const shells = pattern.shells.filter(x => p.chrome.shells.includes(x)), widths = pattern.widths.filter(w => p.axes.width.includes(w) && (!pt.widths || pt.widths.includes(w)));
  const r = assembleProfile(profileId, {pattern: patternId, theme: p.themes[0], density: p.density.allowed[0], mode: p.color.modes[0], typography: p.type.typography[0], controlSize: p.controlSize.allowed[0], shell: shells[0], width: widths[0]});
  const method = `assemble(${profileId}, {pattern: ${patternId}})+compile`;
  if (!r.ok) return {method, ran: true, ok: false, reason: r.diagnostics.find(d => d.severity === 'error')?.message ?? 'assemble 실패'};
  let out;
  try { out = compileDocument(r.blueprint); } catch (e) { return {method, ran: true, ok: false, reason: `compile 실패: ${String(e.message).split('\n')[0]}`}; }
  return {method, ran: true, ok: true, qualityOk: true, htmlBytes: out.html.length, cssBytes: out.css.length, outputHash: sha(out.html + out.css), blueprintHasId: true, manifestHasId: null};
}
function legacyProbe(rec, kind) {
  const done = (out, method) => out ? {method, ran: true, ok: true, qualityOk: true, htmlBytes: out.html.length, cssBytes: out.css.length, outputHash: sha(out.html + out.css), blueprintHasId: true, manifestHasId: null} : {method, ran: true, ok: false, reason: '컴파일 실패'};
  const short = rec.id.slice(rec.id.indexOf(':') + 1);
  switch (kind) {
    case 'component': return componentProbe(rec);
    case 'chart-preset': {
      if (rec.ext?.options?.dataSchema) {
        const chart = renderChartPreset(rec.id);
        if (typeof chart !== 'string' || !chart.includes('<svg') || !chart.includes('<table')) return {method: 'renderChartPreset(SVG + accessible table)', ran: true, ok: false, reason: chart?.errors?.[0]?.message ?? 'SVG 또는 요약 테이블이 비어 있다'};
        return {method: 'renderChartPreset(SVG + accessible table)', ran: true, ok: true, qualityOk: true, htmlBytes: chart.length, cssBytes: 0, outputHash: sha(chart), blueprintHasId: null, manifestHasId: null};
      }
      const doc = isolatedDoc(rec, rec.examples[0]);
      return done(doc && compileHtml(doc), 'compileBlueprint(isolated chart node)');
    }
    case 'template': { const m = edit.resetDocument(null, {template: short}); return done(m.ok && compileHtml(m.doc), 'resetDocument+compileBlueprint'); }
    case 'theme': { const m = edit.resetDocument(null, {template: BASE_DOC.template, theme: short}); return done(m.ok && compileHtml(m.doc), 'resetDocument(theme)+compileBlueprint'); }
    case 'palette': { const m = edit.resetDocument(null, {template: BASE_DOC.template, theme: BASE_DOC.theme}); const s = m.ok && edit.setPalette(m.doc, {palette: short}); return done(s?.ok && compileHtml(s.doc), 'setPalette+compileBlueprint'); }
    case 'type-preset': { const m = edit.resetDocument(null, BASE_DOC); const s = m.ok && edit.setAppearance(m.doc, {axes: {typography: short}}); return done(s?.ok && compileHtml(s.doc), 'setAppearance(typography)+compileBlueprint'); }
    case 'axis': {
      const values = rec.variants?.value ?? [];
      const outs = values.map(v => { const m = edit.resetDocument(null, BASE_DOC); if (!m.ok) return null; const s = short === 'mode' ? edit.setAppearance(m.doc, {mode: v}) : edit.setAppearance(m.doc, {axes: {[short]: v}}); return s.ok ? compileHtml(s.doc) : null; });
      const passed = outs.filter(Boolean);
      return passed.length === values.length && passed.length ? {method: 'setAppearance(all values)+compileBlueprint', ran: true, ok: true, qualityOk: true, htmlBytes: passed[0].html.length, cssBytes: passed[0].css.length, outputHash: sha(passed.map(o => o.html + o.css).join('')), blueprintHasId: true, manifestHasId: null}
        : {method: 'setAppearance(all values)+compileBlueprint', ran: true, ok: false, reason: `${passed.length}/${values.length}개 값만 컴파일됨`};
    }
    case 'type-role-preset': {
      const m = edit.resetDocument(null, BASE_DOC);
      const up = m.ok && edit.importBlueprint(null, {blueprint: {...m.doc, catalogVersion: '2.6.0', typeRoles: short}, upgrade: true});
      return done(up?.ok && compileHtml(up.doc), 'importBlueprint(typeRoles)+compileBlueprint');
    }
    case 'color-token': { const r = service.getMaterial({id: rec.id}); return r.ok ? {method: 'getMaterial(resolveColorTokens)', ran: true, ok: true, qualityOk: true, htmlBytes: 0, cssBytes: 0, outputHash: sha(JSON.stringify(r.value.ext)), blueprintHasId: null, manifestHasId: null} : {method: 'getMaterial', ran: true, ok: false, reason: 'getMaterial 실패'}; }
    case 'icon': {
      const made = edit.resetDocument(null, BASE_DOC);
      const out = made.ok && compileHtml(made.doc);
      return {method: 'render/util.icon()', ran: true, ok: iconRenders(short), qualityOk: true, htmlBytes: 0, cssBytes: 0, outputHash: iconRenders(short) ? sha(String(iconModule.icon(short))) : null, blueprintHasId: Boolean(out), manifestHasId: null};
    }
    case 'layout-primitive': {
      // ext.css는 이 원형이 쓰는 선택자 목록이다. 그 선택자가 이 원형을 쓰는 패턴 템플릿들의 컴파일 출력(합집합)에 전부 있어야 렌더되는 것으로 본다.
      const tokens = [...String(rec.ext.css).matchAll(/\.[a-z][\w-]*|\[[a-z-]+(?:=[^\]]+)?\]/g)].map(m => m[0].replace(/^\[([a-z-]+).*\]$/, '$1'));
      const used = uniq(Object.values(PATTERNS).filter(p => p.primitives.includes(short)).map(p => p.template));
      let text = '', bytes = 0;
      for (const template of used) { const made = edit.resetDocument(null, {template}); const out = made.ok && compileHtml(made.doc); if (out) { text += out.css + out.html; bytes += out.html.length + out.css.length; } }
      const missing = tokens.filter(t => !text.includes(t));
      return tokens.length && !missing.length
        ? {method: `selectors in compileBlueprint(templates of ${used.length} patterns)`, ran: true, ok: true, qualityOk: true, htmlBytes: bytes, cssBytes: bytes, outputHash: sha(tokens.join(',')), blueprintHasId: true, manifestHasId: null}
        : {method: 'selectors in compileBlueprint(pattern templates)', ran: true, ok: false, reason: `출력에 없는 선택자: ${missing.join(' ') || '(선택자 없음)'}`};
    }
    case 'page-type': {
      const t = Object.entries(templates).find(([, tpl]) => tpl.pageType === short)?.[0];
      const m = t && edit.resetDocument(null, {template: t});
      return done(m?.ok && compileHtml(m.doc), `template:${t} 컴파일`);
    }
    case 'recipe': return {method: 'selectRecipe', ran: false, ok: false, reason: '레시피를 단독으로 렌더하는 서비스 진입점이 없다'};
    case 'pattern': {
      const profile = Object.keys(PROFILES).find(p => PROFILES[p].patterns.includes(rec.id));
      return profile ? profileProbe(profile, rec.id) : {method: 'assemble(profile, {pattern})', ran: true, ok: false, reason: '어느 프로파일도 이 패턴을 쓰지 않는다'};
    }
    case 'profile': return profileProbe(short, PROFILES[short].patterns[0]);
    default: return {method: null, ran: false, ok: false, reason: '이 종류의 렌더 프로브가 없다'};
  }
}
const iconModule = await import('../src/render/util.mjs');
const iconRenders = name => { try { return String(iconModule.icon(name)).includes('<svg'); } catch { return false; } };

function probeOf(entity) {
  const {record, registry, kind} = entity;
  if (registry === 'platform') {
    if (kind === 'purpose-family') return purposeProbe(record);
    if (kind === 'base-component') {
      const contract = entities.get(record.contract);
      const p = contract ? componentProbe(contract.record) : {method: 'compileBlueprint', ran: false, ok: false, reason: '계약 기록 없음'};
      return {...p, method: `${p.method} via ${record.contract}`, placeable: baseIsPlaceable(record.id)};
    }
    if (kind === 'layout') return layoutProbe(record);
    return assembleProbe(record, kind);
  }
  return legacyProbe(record, kind);
}

// -----------------------------------------------------------------------------
// 6. 모든 재료 실행: 프로브 → 노출 → 상태 사다리
// -----------------------------------------------------------------------------

const probes = new Map();
for (const [id, entity] of entities) probes.set(id, probeOf(entity));
const probeOk = id => probes.get(id)?.ok === true;
// 요청 키가 없는 축 값(radius·elevation 등)은 스타일 맥락 조립이 Blueprint에서 실제로 고른 값이면 조립 경로가 있는 것이다.
const reachedAxisValues = new Map();
for (const [id, p] of [...probes].sort(([a], [b]) => (a < b ? -1 : 1))) for (const [axis, value] of Object.entries(p.axes ?? {})) {
  const key = `axis-value:${axis}.${value}`;
  if (value && !reachedAxisValues.has(key)) reachedAxisValues.set(key, {via: id, htmlBytes: p.htmlBytes, cssBytes: p.cssBytes, purpose: p.purpose, mode: p.mode, qualityOk: p.qualityOk});
}
for (const [id, entity] of entities) {
  const p = probes.get(id);
  if (entity.kind !== 'axis-value' || p.ok || p.ran) continue;
  const hit = reachedAxisValues.get(id);
  if (hit) probes.set(id, {method: `assembleDesign(${hit.via}의 Blueprint가 고른 축 값)`, ran: true, ok: true, purpose: hit.purpose, mode: hit.mode, qualityOk: hit.qualityOk, htmlBytes: hit.htmlBytes, cssBytes: hit.cssBytes, outputHash: null, blueprintHasId: true, manifestHasId: null, noEffect: false});
}
const surfaces = buildSurfaces();
/** 기반 컴포넌트는 id로 웹에 오르지 않는다. 같은 구현을 공유하는 계약 컴포넌트(component:*-control)가 노출되는 라우트를 그대로 쓰고 via에 적는다. */
const exposureId = id => { const e = entities.get(id); return e?.kind === 'base-component' && entities.has(e.record.contract) ? e.record.contract : id; };
const surfacesOf = (id, role) => { const key = exposureId(id); return surfaces.filter(s => s.role === role && (s.set.has(id) || s.set.has(key))).map(s => s.id).sort(); };
const restOps = new Set([...read('apps/web/lib/api/operations.mjs').matchAll(/id:\s*['"]([a-zA-Z0-9_-]+)['"]/g)].map(m => m[1]));
const mcpTools = new Set([...read('apps/web/lib/api/mcp.mjs').matchAll(/name:\s*['"]([a-zA-Z0-9_-]+)['"]/g)].map(m => m[1]));
const channelProof = {
  platform: restOps.has('getPlatformMaterial') && mcpTools.has('get_platform_material'),
  design: restOps.has('getMaterial') && mcpTools.has('get_material'),
  components: restOps.has('assembleComponents') && mcpTools.has('assemble_components'),
};
const DERIVED_KINDS = new Set(['color-token']);
const STATUS = ['missing', 'metadata-only', 'defined', 'renderable', 'catalog-visible', 'assemblable', 'verified'];

const atLeast = (version, since) => version.localeCompare(since, 'en', {numeric: true}) >= 0;
function versionsOf(entity) {
  const {record, registry} = entity;
  if (registry === 'platform') return {supported: ['2.7.0'], introducedIn: null, materialVersion: record.version, note: '플랫폼 조립(Blueprint 2.7.0 materials opt-in)에서만 선택된다'};
  const since = record.since ?? '2.1.0';
  return {supported: [...ACCEPTED_CATALOG_VERSIONS].filter(v => atLeast(v, since)), introducedIn: since, materialVersion: record.version};
}

function legacyRelations(id, record) {
  const rows = LEGACY_VARIANT_MAP.filter(r => r.to && (r.to.base === id || r.to.purpose === id));
  const out = [];
  if (rows.length) out.push({relationType: 'replaces-legacy-node', legacyIds: uniq(rows.map(r => r.node)).map(n => (entities.has(`component:${n}`) ? `component:${n}` : `shell:${n}`)), mappedValues: rows.length, source: 'src/platform/families/legacy-map.mjs LEGACY_VARIANT_MAP'});
  if (id.startsWith('component:')) {
    const node = id.slice('component:'.length);
    const to = LEGACY_VARIANT_MAP.filter(r => r.node === node && r.to);
    if (to.length) out.push({relationType: 'superseded-by-platform', replacedBy: uniq(to.map(r => r.to.base ?? r.to.purpose)), mappedValues: to.length, unmappedValues: LEGACY_VARIANT_MAP.filter(r => r.node === node && !r.to).length, source: 'src/platform/families/legacy-map.mjs LEGACY_VARIANT_MAP'});
  }
  for (const target of record.reuses ?? []) if (entities.has(target)) out.push({relationType: 'reuses', targetId: target, source: 'record.reuses'});
  if (id.startsWith('base-component:') && entities.has(record.contract)) out.push({relationType: 'shares-contract', targetId: record.contract, source: 'record.contract'});
  return out.length ? out : null;
}

// 같은 종류·같은 요청 맥락(목적·모드·시각 패밀리) 안에서 출력 해시가 같은 재료를 찾는다. 출력이 같으면 독립 재료가 아니다(§1.2).
const groupKeyOf = id => { const p = probes.get(id); return `${entities.get(id).kind}|${p.purpose ?? ''}|${p.mode ?? ''}|${p.visual ?? ''}`; };
const groups = new Map();
for (const id of probes.keys()) if (probes.get(id).outputHash) groups.set(groupKeyOf(id), [...(groups.get(groupKeyOf(id)) ?? []), id]);
const duplicatesOf = id => (probes.get(id).outputHash ? (groups.get(groupKeyOf(id)) ?? []).filter(o => o !== id && probes.get(o).outputHash === probes.get(id).outputHash).sort() : []);
/** 같은 그룹의 다른 재료와 출력이 전부 같으면 CSS·토큰을 실제로 쓰는 것으로 보지 않는다. */
const hasObservableEffect = id => {
  const peers = groups.get(groupKeyOf(id)) ?? [];
  return peers.length <= 1 || duplicatesOf(id).length < peers.length - 1;
};

const records = [];
for (const [id, entity] of [...entities.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  const {record, registry, kind} = entity;
  const probe = probes.get(id);
  const rights = record.source?.license ?? 'internal';
  // 기반 컴포넌트는 구현과 계약을 계약 컴포넌트와 공유하므로 품질 근거도 그 기록에서 읽는다.
  const qualityRecord = kind === 'base-component' && entities.has(record.contract) ? entities.get(record.contract).record : record;
  const evidenceRefs = qualityRecord.quality?.evidence ?? [];
  const validEvidence = evidenceRefs.filter(validRef);
  const invalidEvidence = evidenceRefs.filter(r => !validRef(r));
  const catalogSurfaces = surfacesOf(id, 'catalog'), detailSurfaces = surfacesOf(id, 'detail'), studioSurfaces = surfacesOf(id, 'studio');
  let rendererEntry = null;
  if (record.render?.module) rendererEntry = `${record.render.module}#${record.render.export}`;
  if (kind === 'purpose-family' && record.entry) rendererEntry = `${record.entry.module}#${record.entry.export}`;
  const channel = registry === 'platform' ? service.getPlatformMaterial({id}) : service.getMaterial({id});
  const restAndMcpAvailable = ok(channel) && (registry === 'platform' ? channelProof.platform : channelProof.design);
  const defPath = definitionOf(record, kind);
  // 목적·시각 패밀리의 states는 배열이고(Array.prototype.values 함수와 구분해야 한다), 카탈로그 재료의 states는 {values, transitions}다.
  const states = Array.isArray(record.states) ? record.states : Array.isArray(record.states?.values) ? record.states.values : [];
  const rendered = probe.ok === true;
  const exportReflected = rendered && [probe.htmlBytes, probe.cssBytes].some(n => n > 0);
  const effective = probe.noEffect !== true;
  const hasA11y = Boolean(record.a11y && (record.a11y.rules?.length || record.a11y.role)) || (registry === 'platform' && probe.qualityOk === true);
  const hasResponsive = Boolean(record.responsive?.strategy) || (registry === 'platform' && rendered);
  const a11yAndResponsiveTested = hasA11y && hasResponsive && probe.qualityOk === true && (validEvidence.length > 0 || registry === 'platform');

  // 상태 사다리(누적): 앞 단계가 거짓이면 그 위 단계로 올리지 않는다. 막힌 첫 단계를 blockedBy에 적는다.
  let status, blockedBy = null;
  if (rights === 'unverified') { status = 'metadata-only'; blockedBy = 'rights-unverified'; }
  else if (!defPath && !rendererEntry) { status = 'metadata-only'; blockedBy = 'no-definition'; }
  else if (!rendered) { status = 'defined'; blockedBy = probe.ran ? 'render-probe-failed' : 'no-render-probe'; }
  else if (!effective) { status = 'defined'; blockedBy = 'no-observable-output'; }
  else if (catalogSurfaces.length === 0 && detailSurfaces.length === 0) { status = 'renderable'; blockedBy = 'not-in-web-catalog'; }
  else if (studioSurfaces.length === 0) { status = 'catalog-visible'; blockedBy = 'no-studio-choice'; }
  else {
    const verifiedByTest = qualityRecord.quality?.status === 'verified' && validEvidence.length > 0 && invalidEvidence.length === 0;
    const verifiedByAssembly = registry === 'platform' && probe.qualityOk === true && /^assemble(Design|Components)/.test(probe.method ?? '');
    if (verifiedByTest || verifiedByAssembly) status = 'verified'; else { status = 'assemblable'; blockedBy = 'no-verification-evidence'; }
  }

  records.push({
    id, name: record.label ?? id, kind, registry, category: record.category ?? record.group ?? null,
    requirementIds: [],
    status, blockedBy,
    supportedVersions: versionsOf(entity),
    definitionPath: defPath,
    rendererConnected: Boolean(rendererEntry) || rendered,
    rendererEntry,
    usesTokensAndCss: exportReflected && effective && hasObservableEffect(id),
    supportedVariantsAndStates: {variants: sortKeys(record.variants ?? {}), states},
    catalogVisible: catalogSurfaces.length > 0 || detailSurfaces.length > 0,
    catalogSurfaces: uniq([...catalogSurfaces, ...detailSurfaces]).sort(),
    ...(exposureId(id) !== id ? {catalogVia: exposureId(id)} : {}),
    detailPageExists: detailSurfaces.length > 0,
    detailSurfaces,
    studioAssemblable: studioSurfaces.length > 0,
    studioSurfaces,
    restAndMcpAvailable,
    blueprintExpressible: probe.blueprintHasId === true || probe.manifestHasId === true,
    exportReflected,
    a11yAndResponsiveTested,
    qualityVerdict: {status: qualityRecord.quality?.status ?? null, evidenceRefs: validEvidence, invalidEvidenceRefs: invalidEvidence, liveProbe: rendered ? 'passed' : probe.ran ? 'failed' : 'not-run'},
    rightsAndLicense: rights,
    legacyDuplicateRelation: legacyRelations(id, record),
    evidence: {
      definition: defPath, renderer: rendererEntry,
      probe: {method: probe.method, ran: probe.ran, ok: probe.ok, ...(probe.purpose ? {purpose: probe.purpose, mode: probe.mode} : {}), ...(probe.visual ? {visual: probe.visual} : {}), ...(probe.reason ? {reason: probe.reason} : {}), ...(probe.qualityOk !== undefined ? {qualityOk: probe.qualityOk} : {})},
      outputHash: probe.outputHash ?? null, duplicateOutputOf: duplicatesOf(id),
    },
  });
}
// 요구 항목 → 재료 연결
const requirements = ALL_REQS.map(req => {
  const cov = resolveCoverage(req);
  const mats = cov.ids.map(id => records.find(r => r.id === id)).filter(Boolean);
  for (const m of mats) m.requirementIds.push(req.reqId);
  const rank = s => STATUS.indexOf(s);
  const status = cov.how === 'missing' ? 'missing' : STATUS[Math.max(...mats.map(m => rank(m.status)))];
  return {
    id: req.reqId, section: req.section, name: req.name, coverage: cov.how, status, materialIds: cov.ids,
    ...(cov.via ? {viaRecord: cov.via} : {}), ...(cov.variant ? {variant: cov.variant} : {}), ...(cov.schema ? {schema: cov.schema} : {}), ...(cov.note ? {note: cov.note} : {}),
  };
});
for (const r of records) r.requirementIds.sort();

// -----------------------------------------------------------------------------
// 7. 집계: 등록 수 / 실질 재료 수 / 조합 가능 수 / 실제 조립 검증 수 / 고유 출력 수
// -----------------------------------------------------------------------------

const statusDistribution = Object.fromEntries(STATUS.map(s => [s, 0]));
for (const r of records) statusDistribution[r.status]++;
const reqStatusDistribution = Object.fromEntries(STATUS.map(s => [s, 0]));
for (const q of requirements) reqStatusDistribution[q.status]++;

// 플랫폼 팔레트(자체 시드)와 Coolors 레거시 팔레트는 같은 kind이지만 별개 집합이라 집계에서 나눈다.
const summaryKind = r => (r.kind === 'palette' && r.registry === 'design' ? 'legacy-palette' : r.kind);
const kindsInManifest = uniq(records.map(summaryKind)).sort();
const byKind = {};
for (const kind of kindsInManifest) {
  const rs = records.filter(r => summaryKind(r) === kind);
  const hashes = new Map();
  for (const r of rs) { const h = r.evidence.outputHash, p = r.evidence.probe; if (h) hashes.set([p.purpose, p.mode, p.visual, h].join('|'), 1); }
  const independent = !DERIVED_KINDS.has(kind);
  byKind[kind] = {
    registered: rs.length,
    actualMaterial: independent ? rs.filter(r => STATUS.indexOf(r.status) >= STATUS.indexOf('renderable')).length : 0,
    assemblableVerified: rs.filter(r => r.status === 'verified').length,
    distinctOutputs: hashes.size,
    byStatus: Object.fromEntries(STATUS.filter(s => rs.some(r => r.status === s)).map(s => [s, rs.filter(r => r.status === s).length])),
    ...(independent ? {} : {note: '한 팔레트를 resolveColorTokens 한 함수가 펼친 값이라 독립 재료로 세지 않는다(scripts/platform/baseline.mjs DERIVED_KINDS)'}),
  };
}

const platformBaseline = JSON.parse(read(BASELINE_PATH));
const livePlatform = platformSection();
const legacyAttempted = (() => {
  let n = 0;
  for (const p of Object.values(PROFILES)) for (const pid of p.patterns) {
    const pattern = PATTERNS[pid.slice(8)], pt = pageTypes[templates[pattern.template].pageType];
    const shells = pattern.shells.filter(s => p.chrome.shells.includes(s));
    const widths = pattern.widths.filter(w => p.axes.width.includes(w) && (!pt.widths || pt.widths.includes(w)));
    n += p.themes.length * p.density.allowed.length * p.color.modes.length * p.type.typography.length * p.controlSize.allowed.length * shells.length * widths.length;
  }
  return n;
})();
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const comparisonSpecs = {
  '신규 플랫폼 팔레트': () => ofKind('palette').filter(r => entities.get(r.id).registry === 'platform').length,
  '서브토큰 세트': () => kindCount('subtoken-set'),
  '신규 타이포 시스템': () => kindCount('type-system'),
  '기존 타이포 프리셋': () => kindCount('type-preset'),
  '기존 역할형 타이포 프리셋': () => kindCount('type-role-preset'),
  '기반 컴포넌트': () => kindCount('base-component'),
  '목적별 컴포넌트': () => kindCount('purpose-family'),
  '시각 패밀리': () => kindCount('family'),
  '기존 구조 부품': () => kindCount('component'),
  '차트 프리셋': () => kindCount('chart-preset'),
  '아이콘': () => kindCount('icon'),
  '템플릿': () => kindCount('template'),
};
const comparisonTable = BASELINE_TABLE.map(row => {
  const measure = comparisonSpecs[row.material];
  if (!measure) throw new Error(`§2.1 표의 "${row.material}" 항목을 측정하는 코드가 없습니다.`);
  const currentMeasured = measure();
  return {material: row.material, previousBaseline: row.previousBaseline, currentMeasured, delta: currentMeasured - row.previousBaseline, status: currentMeasured === row.previousBaseline ? 'match' : 'drift', measuredBy: 'live registry count'};
});
for (const key of Object.keys(comparisonSpecs)) if (!BASELINE_TABLE.some(r => r.material === key)) throw new Error(`측정 코드는 있으나 REQUEST.md §2.1 표에 없는 항목: ${key}`);

const baselineFresh = {
  platformSectionEqualsBaseline: sameJson(livePlatform, platformBaseline.platform),
  legacyAttemptedEqualsBaseline: legacyAttempted === platformBaseline.combinations.attempted,
  registeredEqualsBaseline: sameJson(livePlatform.registered, platformBaseline.platform.registered),
};

const combinations = {
  note: '조합 가능 수는 재료 수가 아니다. 재료를 서로 곱해 평가한 조립 경우의 수이며 byKind의 재료 집계와 합산하지 않는다.',
  platform: {
    assemblableCombinations: livePlatform.assemblable.assemblable, attemptedCombinations: livePlatform.assemblable.attempted,
    verifiedAssemblies: livePlatform.verified.verified, attemptedAssemblies: livePlatform.verified.attempted, distinctVerifiedOutputs: livePlatform.verified.distinctOutputs,
    distinctColorTokenSets: livePlatform.distinct.colorTokenSets, distinctFacePairs: livePlatform.distinct.facePairs, distinctVisualFamilies: livePlatform.distinct.families,
    verifiedPurposeFamiliesInPages: livePlatform.distinct.purposeFamilies.verified,
    method: 'scripts/platform/platform-baseline.mjs platformSection() 직접 호출(렌더 없이 관계 평가, 대표 페이지는 assemblePage로 조립·품질 검사)',
  },
  legacyTemplates: {
    attemptedCombinations: legacyAttempted, assembledCombinations: platformBaseline.combinations.assembled, compiledCombinations: platformBaseline.combinations.compiled, distinctCompiledOutputs: platformBaseline.combinations.distinctCompiledOutputs,
    method: `attemptedCombinations는 PROFILES·PATTERNS 데이터로 이 실행에서 다시 센 값. 나머지는 ${BASELINE_PATH}#combinations(scripts/platform/baseline.mjs combosSection, 컴파일 16000여 회라 비싸서 파일에서 읽음)`,
  },
};

const manifest = {
  manifestVersion: '2.0.0',
  contractVersion: PLATFORM_CONTRACT_VERSION,
  generatedBy: 'scripts/generate-material-coverage.mjs',
  provenance: {
    requirementsSource: {file: REQUEST_PATH, counts: REQUEST_COUNTS, total: ALL_REQS.length},
    registries: {platform: platformEnv.registry.kinds().map(k => `${k}:${kindCount(k)}`).join(' '), design: uniq([...entities.values()].filter(e => e.registry === 'design').map(e => e.kind)).sort().map(k => `${k}:${kindCount(k)}`).join(' ')},
    liveProbes: 'service.assembleDesign / assembleComponents / compileBlueprint / getMaterial / getPlatformMaterial 와 src/edit 연산을 재료마다 실제로 호출한 결과',
    webSurfaces: Object.fromEntries(surfaces.map(s => [s.id, {role: s.role, ...surfaceProof.get(s.id), materials: s.set.size}]).map(([k, v]) => [k, v])),
    channelProof,
    expensiveValues: {
      'combinations.legacyTemplates.assembled/compiled/distinctCompiledOutputs': {source: `${BASELINE_PATH}#combinations`, generator: 'scripts/platform/baseline.mjs', live: false},
      freshness: baselineFresh,
    },
    ladder: '누적 사다리. defined(정의·권리 통과, 실제 호출 실패 또는 프로브 없음) → renderable(서비스 호출로 실제 출력) → catalog-visible(웹 카탈로그 라우트가 이 재료를 렌더) → assemblable(Studio가 선택지를 제공) → verified(유효한 테스트 참조 또는 실제 조립 품질 검사 통과). metadata-only는 권리 미확인 또는 정의 없음. blockedBy가 막힌 첫 단계다.',
  },
  summary: {
    requirements: {
      total: requirements.length,
      fulfilled: requirements.filter(q => q.coverage !== 'missing').length,
      missing: requirements.filter(q => q.coverage === 'missing').length,
      coverageRate: Number((requirements.filter(q => q.coverage !== 'missing').length / requirements.length).toFixed(4)),
      byCoverage: Object.fromEntries(['direct', 'variant', 'schema', 'part-of', 'missing'].map(h => [h, requirements.filter(q => q.coverage === h).length])),
      statusDistribution: reqStatusDistribution,
      breakdown: Object.fromEntries(Object.entries({components: COMPONENT_REQS, subtokenSets: SUBTOKEN_REQS, typeSystems: TYPE_REQS, families: FAMILY_REQS, charts: CHART_REQS, layouts: LAYOUT_REQS}).map(([k, reqs]) => {
        const qs = requirements.filter(q => reqs.some(r => r.reqId === q.id));
        return [k, {total: qs.length, missing: qs.filter(q => q.coverage === 'missing').length, direct: qs.filter(q => q.coverage === 'direct').length, variant: qs.filter(q => q.coverage === 'variant').length, schema: qs.filter(q => q.coverage === 'schema').length, partOf: qs.filter(q => q.coverage === 'part-of').length}];
      })),
      duplicateNames: (() => { const names = {}; for (const r of ALL_REQS) (names[r.name] ??= []).push(r.reqId); return Object.fromEntries(Object.entries(names).filter(([, ids]) => ids.length > 1)); })(),
    },
    materials: {totalRecords: records.length, statusDistribution, registeredByRegistry: {platform: records.filter(r => r.registry === 'platform').length, design: records.filter(r => r.registry === 'design').length}},
    byKind,
    combinations,
    comparisonTable,
  },
  requirements,
  materials: records,
};

const text = JSON.stringify(manifest, null, 2) + '\n';
if (CHECK) {
  const saved = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : '';
  if (saved !== text) { console.error(`MANIFEST DRIFT: ${DIR}/MATERIAL-COVERAGE.json 이 현재 코드와 다릅니다. npm run coverage:materials 로 다시 만드세요.`); process.exit(1); }
  console.log(`MANIFEST MATCH ${DIR}/MATERIAL-COVERAGE.json (${records.length} materials, ${requirements.length} requirements)`);
} else {
  mkdirSync(dirname(OUT_FILE), {recursive: true});
  writeFileSync(OUT_FILE, text);
  console.log(`Material Coverage Manifest written: ${DIR}/MATERIAL-COVERAGE.json`);
  console.log(`Materials: ${records.length}, Requirements: ${requirements.length}, Missing requirements: ${manifest.summary.requirements.missing}`);
}
