import {assembleComponents, assembleLayoutSpecimen, chartPresetMaterials, compileBlueprint, CONTRACT_VERSION, getMaterial, getPlatformMaterial, LAYOUT_COMPONENTS, listMaterials, listPlatformMaterials, PATTERNS, PLATFORM_CONTRACT_VERSION, renderChartPreset} from '@winterholic/design-system-static-kit/service';
import {resetDocument} from '@winterholic/design-system-static-kit/edit';
import {LruCache} from '../../lib/api/cache.mjs';

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const CHART = 'chart-preset:', LAYOUT = 'layout:', LAYOUT_COMPONENT = 'component:', PRIMITIVE = 'layout-primitive:';
const detailCache = new LruCache(128);
const exportCache = new LruCache(64);
const success = result => result?.ok === true;
const unpack = result => result?.value;
const reasonOf = result => result?.errors?.map(item => item.message).join(' ') ?? result?.diagnostics?.map(item => item.message).join(' ') ?? '재료를 검증된 경로로 렌더하지 못했습니다.';
const pretty = value => `${JSON.stringify(value, null, 2)}\n`;

const chartCSS = (() => {
  const made = resetDocument(null, {template: 'dashboard-overview'});
  const blueprint = structuredClone(made.doc);
  blueprint.catalogVersion = '2.6.0'; blueprint.shell = 'minimal'; blueprint.pageType = 'general';
  blueprint.chrome.nav = blueprint.chrome.nav.slice(0, 2);
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '기준', description: '기준'}, {type: 'chart', title: '기준', caption: '기준', kind: 'bar', grid: 'horizontal', unit: '건', categories: ['A', 'B'], series: [{name: '표본', values: [2, 3]}]}]};
  return compileBlueprint(blueprint, {include: ['css']}).value.css;
})();

const chartRows = chartPresetMaterials.map(item => ({type: item.id, kind: 'chart-preset', label: item.label}));
const layoutRows = (unpack(listPlatformMaterials({kind: 'layout', limit: 200, fields: ['id', 'label']}) ?? {})?.items ?? [])
  .map(item => ({type: item.id, kind: 'layout', label: item.label}));
const layoutComponentRows = LAYOUT_COMPONENTS.map(item => ({type: item.id, kind: 'layout-component', label: item.label}));
const primitiveRows = (unpack(listMaterials({kind: 'layout-primitive', limit: 200, fields: ['id', 'label']}) ?? {})?.items ?? [])
  .map(item => ({type: item.id, kind: 'layout-primitive', label: item.label}));

const rows = [...chartRows, ...layoutRows, ...layoutComponentRows, ...primitiveRows];
const rowById = new Map(rows.map(row => [row.type, row]));

export function catalogDetailRows() { return rows.map(row => ({...row})); }

// 레이아웃은 허용 밀도가 재료마다 다르다. 받지 않는 값은 고르기 전에 비활성화하고 Core와 같은 사유를 보인다.
const densityOption = (row, value, allowed) => allowed && !allowed.includes(value)
  ? {value, label: value, ok: false, reason: `${row.type}는 ${value} 밀도를 받지 않습니다(허용: ${allowed.join('·')})`}
  : {value, label: value, ok: true};

const baseView = (row, material, detail) => {
  const completeMaterial = {
    ...material, defaults: material?.defaults ?? {}, variants: material?.variants ?? {}, states: material?.states ?? {values: [], transitions: []},
    tokens: material?.tokens ?? [], a11y: material?.a11y ?? {}, purposeContracts: material?.purposeContracts ?? [],
    quality: typeof material?.quality === 'string' ? {status: material.quality, evidence: []} : material?.quality ?? {status: 'implemented', evidence: []},
  };
  return ({
  type: row.type, label: row.label, group: row.kind, groupLabel: ({'chart-preset': '차트', layout: '레이아웃', 'layout-component': '레이아웃 부품', 'layout-primitive': '배치 원형'})[row.kind],
  fields: [], children: detail.composition?.children?.length ? {allowed: detail.composition.children, min: detail.composition.childMin ?? 0, max: detail.composition.childMax ?? detail.composition.children.length} : null,
  parents: [], pageTypes: {requiredBy: [], forbiddenIn: []}, example: detail.example ?? null,
  variants: detail.variants ?? [], variantGroups: detail.variantGroups ?? [], material: completeMaterial, detail: {...detail, kind: row.kind},
  related: (detail.composition?.related ?? []).map(type => ({type, label: type})),
  playgroundAxes: detail.axes ?? [], playground: {
    base: null,
    defaults: {palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', visualFamily: 'family:soft', typeSystem: 'type-system:mkt-launch', density: detail.defaults?.density ?? 'comfortable', mode: detail.defaults?.mode ?? 'light'},
    axes: {palette: [], subtokenSet: [], visualFamily: [], typeSystem: [], density: ['compact', 'comfortable', 'spacious'].map(value => densityOption(row, value, detail.densityAllowed)), mode: ['light', 'dark'].map(value => ({value, label: value, ok: true}))},
  }, limitations: [],
});
};

function detailData(row) {
  const cacheKey = `${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}/${row.type}`;
  if (detailCache.has(cacheKey)) return detailCache.get(cacheKey);
  let view = null;
  if (row.kind === 'chart-preset') {
    const material = unpack(getMaterial({id: row.type}));
    // 밀도 옵션은 차트 종류마다 받는 값이 다르다(donut 은 어느 값도 받지 않는다). Core 가 렌더하는 밀도만 축으로 연다.
    const densities = material ? ['compact', 'comfortable', 'spacious'].filter(value => typeof renderChartPreset(row.type, {...material.examples?.[0], density: value}) === 'string') : [];
    if (material) view = baseView(row, material, {
      tabs: ['overview', ...(densities.length > 1 ? ['playground'] : []), 'tokens', 'code', 'accessibility'], axes: densities.length > 1 ? ['density'] : [], densityAllowed: densities,
      defaults: {density: material.examples?.[0]?.density ?? 'comfortable'},
      example: material.examples?.[0] ?? null,
      tokens: material.tokens ?? [],
    });
  } else if (row.kind === 'layout') {
    const material = unpack(getPlatformMaterial({id: row.type}));
    if (material) view = baseView(row, material, {
      tabs: ['overview', 'playground', 'code', 'composition'], axes: ['density', 'mode'], densityAllowed: material.density?.allowed,
      defaults: {density: material.density?.default ?? 'comfortable', mode: 'light'},
      example: {layout: row.type}, tokens: material.tokens ?? [],
      composition: {
        children: [...new Set(material.slots?.flatMap(slot => slot.accepts ?? []) ?? [])],
        childMin: material.slots?.reduce((sum, slot) => sum + slot.min, 0), childMax: material.slots?.reduce((sum, slot) => sum + slot.max, 0),
        slots: material.slots?.map(slot => `${slot.name} (${slot.min}–${slot.max})`) ?? [], related: [],
      },
    });
  } else if (row.kind === 'layout-component') {
    const component = LAYOUT_COMPONENTS.find(item => item.id === row.type);
    // 자기 자신만 가리키는 관계는 조합 정보가 아니다. 다른 재료나 노드를 가리킬 때만 Composition 탭을 연다.
    const related = [...new Set([component?.materialId, component?.blueprint?.component ?? component?.blueprint?.node ?? component?.blueprint?.kind].filter(Boolean))].filter(id => id !== row.type);
    if (component) view = baseView(row, {id: row.type, kind: row.kind, category: 'layout', version: component.version, since: '1.0.0', contexts: ['dashboard'], quality: {status: 'verified'}, preset: false, defaults: {}, variants: {}, states: {values: [], transitions: []}, responsive: {strategy: 'responsive'}, tokens: [], tags: ['layout'], a11y: {}, structure: {}, validation: {}, purposeContracts: [], blueprint: component.blueprint}, {
      tabs: ['overview', 'code', ...(related.length ? ['composition'] : [])], axes: [], example: component.blueprint,
      tokens: [], composition: related.length ? {children: [], related} : null,
    });
  } else if (row.kind === 'layout-primitive') {
    const material = unpack(getMaterial({id: row.type}));
    if (material) view = baseView(row, material, {tabs: ['overview', 'code', ...(material.a11y?.rules?.length || material.a11y?.role || material.a11y?.keyboard ? ['accessibility'] : [])], axes: [], example: material.blueprint ?? null, tokens: material.tokens ?? []});
  }
  detailCache.set(cacheKey, view);
  return view;
}

export function catalogDetailView(type) {
  let id = type;
  try { id = decodeURIComponent(type); } catch { /* malformed route ids remain unknown */ }
  const row = rowById.get(id);
  return row ? detailData(row) : null;
}

const standalone = ({title, mode, css, html, script = '', version = PLATFORM_CONTRACT_VERSION}) =>
  `<!doctype html>\n<html lang="ko" data-theme="${mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'"><meta name="color-scheme" content="${mode}"><meta name="generator" content="Static Kit platform ${version}"><title>${escapeHTML(title)}</title><style>\n${css}</style></head><body>${html}${script ? `<script>${script}</script>` : ''}</body></html>\n`;

function chartExport(view, selection) {
  const density = selection.density ?? view.playground.defaults.density;
  if (!['compact', 'comfortable', 'spacious'].includes(density)) return {ok: false, reason: `지원하지 않는 차트 밀도입니다: ${density}`};
  const chart = renderChartPreset(view.type, {...view.example, density});
  if (typeof chart !== 'string') return {ok: false, reason: chart.errors?.map(item => item.message).join(' ') ?? '차트 재료를 검증하지 못했습니다.'};
  const html = standalone({title: view.label, mode: 'light', css: `${chartCSS}\n.kit-chart{max-width:none;margin:0}`, html: chart});
  const blueprint = {schema: 'dsk-chart-preset/1', preset: view.type, density, data: {...view.example, density}};
  const files = {'index.html': html, 'tokens.css': `${chartCSS}\n.kit-chart{max-width:none;margin:0}\n`, 'tokens.json': pretty({tokens: view.detail.tokens}), 'blueprint.json': pretty(blueprint)};
  return {ok: true, files, previewHtml: html, mode: 'platform'};
}

function layoutExport(view, selection) {
  const {density = view.playground.defaults.density, mode = view.playground.defaults.mode} = selection;
  if (!['compact', 'comfortable', 'spacious'].includes(density) || !['light', 'dark'].includes(mode)) return {ok: false, reason: '레이아웃의 밀도 또는 모드 선택이 계약에 없습니다.'};
  const assembled = assembleLayoutSpecimen(view.type, {density, mode, stable: true});
  if (!assembled.ok) return {ok: false, reason: reasonOf(assembled)};
  const value = assembled.value;
  const html = standalone({title: view.label, mode, css: value.css, html: value.html});
  const blueprint = {schema: 'dsk-layout-specimen/1', layout: view.type, density, mode, fills: assembled.fills};
  const files = {'index.html': html, 'tokens.css': `${value.css}\n`, 'tokens.json': pretty(value.tokens), 'blueprint.json': pretty(blueprint)};
  return {ok: true, files, previewHtml: html, manifest: value.manifest, mode: 'platform'};
}

function layoutComponentExport(view) {
  const request = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '표본 버튼'}}], layouts: [{component: view.type, props: {}}]};
  const result = assembleComponents(request, {include: ['standalone']});
  if (!success(result)) return {ok: false, reason: reasonOf(result)};
  const value = unpack(result);
  const files = {'index.html': value.standalone, 'tokens.css': `${value.css}\n`, 'tokens.json': pretty(value.manifest.selection), 'blueprint.json': pretty(request)};
  return {ok: true, files, previewHtml: value.standalone, manifest: value.manifest, mode: 'platform'};
}

function primitiveExport(view) {
  const short = view.type.slice(PRIMITIVE.length);
  const pattern = Object.values(PATTERNS).find(item => item.primitives.includes(short));
  if (!pattern) return {ok: false, reason: '이 배치 원형을 포함하는 카탈로그 패턴이 없습니다.'};
  const made = resetDocument(null, {template: pattern.template});
  if (!made.ok) return {ok: false, reason: made.errors?.[0]?.message ?? '패턴 Blueprint를 구성하지 못했습니다.'};
  const compiled = compileBlueprint(made.doc, {include: ['files']});
  if (!success(compiled)) return {ok: false, reason: reasonOf(compiled)};
  const files = unpack(compiled).files;
  return {ok: true, files, previewHtml: files['index.html'], manifest: unpack(compiled).manifest, mode: 'platform'};
}

export function exportCatalogDetail(view, selection = {}) {
  if (!view?.detail || !selection || typeof selection !== 'object' || Array.isArray(selection)) return {ok: false, reason: '상세 재료 선택이 올바르지 않습니다.'};
  const unsupported = Object.keys(selection).find(axis => !view.playgroundAxes.includes(axis));
  if (unsupported) return {ok: false, reason: `이 재료는 ${unsupported} 축을 받지 않습니다.`};
  const key = `${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}/${view.type}:${JSON.stringify(Object.fromEntries(Object.entries(selection).sort(([a], [b]) => a.localeCompare(b))))}`;
  if (exportCache.has(key)) return exportCache.get(key);
  const result = view.detail.kind === 'chart-preset' ? chartExport(view, selection)
    : view.detail.kind === 'layout' ? layoutExport(view, selection)
      : view.detail.kind === 'layout-component' ? layoutComponentExport(view)
        : primitiveExport(view);
  exportCache.set(key, result);
  return result;
}
