#!/usr/bin/env node
// 빌드 시점 사전 생성(REQUEST §3.2, CONTRACTS §4~§5).
//   site/previews/<캐시키>.svg   대표 미리보기. Core 서비스가 만든 완성 HTML 문서를 <img> 로 보일 수 있게 직렬화만 바꾼 것이다.
//   site/previews/previews-data.json   캐시 키 → 대상(kind, id), 원본 HTML 해시, 건너뛴 대상과 이유
//   site/catalog-index.json, site/catalog-chunks/<category>.json, site/search-index.json   경량 카탈로그 인덱스(LightCatalogIndex)
// 화면(HTML·CSS)은 직접 만들지 않는다. 대상 목록과 문서를 만드는 절차는 웹 화면이 쓰는 apps/web/lib/api/preview-recipes.mjs 를 그대로 쓰고,
// 어떤 재료·변형을 만들지는 레지스트리와 카탈로그를 읽어 정한다(재료가 늘면 인덱스와 미리보기가 같이 늘어난다).
// 전수 생성이 아니다: 대표 디자인 + 부품 기본 렌더 + 사례 + 목적 패밀리 기본 예시 + 타이포 시스템 기본 샘플(라이트·데스크톱)만 만든다.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {
  assembleComponents, assembleDesign, compileBlueprint, getComponentSpec, getMaterial, getPlatformMaterial,
} from '../src/service/index.mjs';
import {PLATFORM_KINDS} from '../src/platform/contract.mjs';
import {buildDesignDocument, catalogRows, curatedDesignRefs, renderComponentView} from '../apps/web/lib/api/preview-recipes.mjs';
import {toPreviewSvg} from '../apps/web/lib/api/preview-svg.mjs';
import {CATALOG_VERSION, ENGINE_VERSION, previewKeyOf} from '../apps/web/lib/api/preview-keys.mjs';
// 웹이 정한 데이터(사례 목록, 비교 샘플, designId 문법)를 복사하지 않고 그대로 읽는다. 세 파일은 외부 import 가 없는 순수 TS 다.
import {formatDesignId, resetArgs} from '../apps/web/features/explore/id.ts';
import {PLATFORM_CASES} from '../apps/web/features/platform/cases.ts';
import {SAMPLES} from '../apps/web/features/platform/samples.ts';
import {caseRequest, purposeRequest, typeRequest, allPlatformMaterials} from './lib/preview-requests.mjs';
import {CATALOG_CATEGORIES, classifyCatalogMaterial} from '../apps/web/features/components/catalog-model.mjs';
import {createPlatform, bindColor, bindType} from '../src/platform/index.mjs';
import {assembleSpecimen} from '../src/platform/layouts.mjs';
import {LAYOUT_COMPONENTS} from '../src/platform/families/layout.mjs';
import {designRegistry} from '../src/profiles/registry.mjs';
import {PATTERNS} from '../src/profiles/data.mjs';
import * as edit from '../src/edit/index.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';
import {createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {spaceVars} from '../src/spacing.mjs';
import {mediaCSS, renderMedia, MEDIA} from '../src/platform/data/media.mjs';
import {stateCSS, renderState, STATE_PATTERNS} from '../src/platform/data/states.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(root, 'site'));
const coverage = JSON.parse(await readFile(join(root, 'docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json'), 'utf8'));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 32);
const WIDE = {width: 1280, height: 800};

const previewsDir = join(out, 'previews');
const chunksDir = join(out, 'catalog-chunks');
await mkdir(previewsDir, {recursive: true});
await mkdir(chunksDir, {recursive: true});

const items = {};
const skipped = [];
// 웹의 probeDesign 과 같은 문구: 오류 메시지를 공백으로 이어 붙인다.
const errorText = r => (r.ok ? '후보가 없습니다' : r.errors.map(e => e.message).join(' '));
/** 대상 하나를 만든다. 같은 키가 이미 있으면(같은 요청이 두 곳에서 쓰인 경우) 파일을 다시 쓰지 않는다. */
async function emit({target, kind, id, title, html, size = WIDE}) {
  const key = previewKeyOf({...target, width: size.width});
  if (items[key]) { items[key].ids.push(`${kind}:${id}`); return key; }
  await writeFile(join(previewsDir, `${key}.svg`), toPreviewSvg(html, {...size, title}));
  items[key] = {kind, id, ids: [`${kind}:${id}`], path: `/previews/${key}.svg`, title, width: size.width, height: size.height, htmlHash: sha(html)};
  return key;
}
/** target 이 있으면 키를 함께 남긴다. 웹이 "이 요청은 사전 생성 때 조립이 거부됐다"를 다시 조립하지 않고 알 수 있다. */
const skip = (kind, id, reason, target) => skipped.push({kind, id, key: target ? previewKeyOf({...target, width: target.width ?? 1280}) : null, reason});

// 1. Explore 대표 디자인: 웹 목록(curatedDesigns)과 같은 refs·같은 문서·같은 compileBlueprint.
const templates = Object.fromEntries(catalogRows('templates', ['id', 'label']).map(t => [t.id, t]));
for (const {ref} of curatedDesignRefs()) {
  const id = formatDesignId(ref);
  const built = buildDesignDocument(ref, resetArgs);
  if (!built.ok) { skip('explore', id, built.errors[0]?.message ?? 'document'); continue; }
  const compiled = compileBlueprint(built.doc, {include: ['html']});
  if (!compiled.ok) { skip('explore', id, compiled.errors[0]?.message ?? 'compile'); continue; }
  await emit({target: {kind: 'design', ref}, kind: 'explore', id, title: `${templates[ref.template].label} 미리보기`, html: compiled.value.html});
}

// 2. 부품 기본 렌더: 웹 상세의 /components/<type>/render 와 같은 renderComponentView.
const componentRows = catalogRows('components', ['type', 'label', 'group', 'since'], {filter: {catalogVersion: '2.6.0'}});
const componentList = [];
for (const row of componentRows) {
  if (row.type === 'page') continue;
  const material = row.since ? (getMaterial({id: `component:${row.type}`}).value ?? null) : null;
  const spec = getComponentSpec({type: row.type, ...(row.since ? {catalogVersion: row.since} : {})});
  if (!spec.ok) { skip('component', row.type, spec.errors[0]?.message ?? 'spec'); continue; }
  componentList.push({row, material, spec: spec.value});
  if (!spec.value.example) continue; // 예제가 없는 부품은 목록 카드가 텍스트 카드다(웹 hasExample 과 같은 기준).
  const rendered = renderComponentView({type: row.type, material, example: spec.value.example ?? null, variantIds: spec.value.fields.variant?.enum ?? []});
  if (!rendered.ok) { skip('component', row.type, rendered.reason); continue; }
  await emit({target: {kind: 'component', type: row.type, version: material?.version}, kind: 'component', id: row.type, title: `${row.label} 렌더 결과`, html: rendered.html});
}

// 3. 플랫폼 사례: 웹 PLATFORM_CASES 의 state 를 웹 requestOf 와 같은 요청으로 옮긴다(tests/platform-pregenerate.test.mjs 가 둘이 같음을 확인).
for (const k of PLATFORM_CASES) {
  const request = caseRequest(k);
  const r = assembleDesign(request, {include: ['standalone']});
  if (!r.ok || !r.value.candidates[0]) { skip('platform', k.id, errorText(r), {kind: 'assemble', request}); continue; }
  await emit({target: {kind: 'assemble', request}, kind: 'platform', id: k.id, title: `${k.title} 미리보기`, html: r.value.candidates[0].value.standalone});
}

// 4. 목적 패밀리: 실제 Core 출력으로 기본 미리보기와 사용 가능한 모든 시각 패밀리 변형을 미리 만든다.
const purposeRows = allPlatformMaterials('purpose-family');
const visualFamilies = allPlatformMaterials('family');
const purposePreviewFamilies = new Map();
for (const row of purposeRows) {
  const f = getPlatformMaterial({id: row.id}).value;
  const previews = {};
  for (const visual of visualFamilies) {
    const request = purposeRequest(f);
    request.items[0].visual = visual.id;
    const r = assembleComponents(request, {include: ['standalone']});
    if (!r.ok) {
      if (visual.id === 'family:soft') skip('purpose-family', f.id, errorText(r), {kind: 'components', request, width: 480});
      continue;
    }
    const key = await emit({target: {kind: 'components', request, width: 480}, kind: 'purpose-family', id: f.id, title: `${f.label} ${visual.label}`, html: r.value.standalone, size: {width: 480, height: 360}});
    previews[visual.id] = `/previews/${key}.svg`;
  }
  purposePreviewFamilies.set(f.id, previews);
}

// 5. 타이포그래피: 웹 TypeCompare 의 기본 보기(문서 샘플, 라이트, 1280). 다른 샘플·모드·폭은 사용자가 고를 때 컴파일한다.
for (const row of allPlatformMaterials('type-system')) {
  const request = typeRequest(row.id);
  const r = assembleDesign(request, {include: ['standalone']});
  // 이 샘플의 맥락과 맞지 않는 시스템은 웹도 사유 문구만 보이고 미리보기를 요청하지 않는다.
  if (!r.ok || !r.value.candidates[0]) { skip('type-system', row.id, errorText(r), {kind: 'assemble', request}); continue; }
  await emit({target: {kind: 'assemble', request}, kind: 'type-system', id: row.id, title: `${row.label} ${SAMPLES.doc.label} 샘플`, html: r.value.candidates[0].value.standalone});
}

// 4b. 카탈로그 목록 카드가 쓰는 나머지 재료의 대표 렌더. 모두 실제 렌더러·조립기의 출력이고 손으로 만든 그림은 없다.
//   chart-preset      renderChartPreset(차트 SVG + 접근성 표) + 컴파일된 카탈로그 차트 CSS
//   layout            assembleSpecimen(슬롯을 채운 표본, 관계 그래프를 거친 조립)
//   layout-component  assembleComponents 의 layouts 경로(Core·REST·MCP 와 같은 출력)
//   media·state-pattern  재료 CSS + 재료 렌더러(스타일 재료 샘플과 같은 마크업)
const platformEnv = createPlatform();
const catalogVersionOf = id => getPlatformMaterial({id}).value?.version;
const doc = (css, body, pad = 16) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}\nbody{margin:0;padding:${pad}px;background:var(--kit-canvas,#fff);color:var(--kit-text,#111)}</style></head><body>${body}</body></html>`;
const chartCss = (() => {
  const blueprint = createBlueprint('dashboard-overview');
  blueprint.catalogVersion = '2.6.0'; blueprint.shell = 'minimal'; blueprint.pageType = 'general';
  blueprint.chrome.nav = blueprint.chrome.nav.slice(0, 2);
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '기준', description: '기준'}, {type: 'chart', title: '기준', caption: '기준', kind: 'bar', grid: 'horizontal', unit: '건', categories: ['A', 'B'], series: [{name: '표본', values: [2, 3]}]}]};
  return compile(blueprint).css;
})();
const designRows = designRegistry().list();
const chartPresets = designRows.filter(r => r.kind === 'chart-preset');
const layoutPrimitives = designRows.filter(r => r.kind === 'layout-primitive');
for (const preset of chartPresets) {
  const svg = renderChartPreset(preset.id);
  if (typeof svg !== 'string') { skip('chart-preset', preset.id, svg?.errors?.[0]?.message ?? '차트 렌더 실패'); continue; }
  await emit({target: {kind: 'material', id: preset.id, version: preset.version, width: 480}, kind: 'chart-preset', id: preset.id, title: `${preset.label} 차트`, html: doc(`${chartCss}\n.kit-chart{max-width:none;margin:0}`, svg), size: {width: 480, height: 470}});
}
for (const row of allPlatformMaterials('layout')) {
  const r = assembleSpecimen(platformEnv, row.id);
  if (!r.ok) { skip('layout', row.id, r.diagnostics[0]?.message ?? '표본 조립 실패'); continue; }
  await emit({target: {kind: 'material', id: row.id, version: catalogVersionOf(row.id)}, kind: 'layout', id: row.id, title: `${row.label} 레이아웃`, html: doc(r.value.css, r.value.html, 0)});
}
const BASE_COMPONENTS = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '기준 버튼'}}]};
for (const component of LAYOUT_COMPONENTS) {
  const request = {...BASE_COMPONENTS, layouts: [{component: component.id, props: {}}]};
  const r = assembleComponents(request, {include: ['standalone']});
  if (!r.ok) { skip('layout-component', component.id, errorText(r), {kind: 'components', request}); continue; }
  await emit({target: {kind: 'components', request, width: 480}, kind: 'layout-component', id: component.id, title: `${component.label} 렌더 결과`, html: r.value.standalone, size: {width: 480, height: 360}});
}
// 레이아웃 원형은 그 원형을 쓰는 첫 패턴 템플릿의 실제 컴파일 출력으로 보인다(coverage 프로브와 같은 근거).
for (const primitive of layoutPrimitives) {
  const short = primitive.id.slice('layout-primitive:'.length);
  if (Object.values(items).some(item => item.ids.some(id => id === `component:${short}` || id === `layout-component:component:${short}`))) continue;
  const template = Object.values(PATTERNS).find(p => p.primitives.includes(short))?.template;
  const made = template && edit.resetDocument(null, {template});
  const compiled = made?.ok && compileBlueprint(made.doc, {include: ['html']});
  if (!compiled?.ok) { skip('layout-primitive', primitive.id, template ? '템플릿 컴파일 실패' : '이 원형을 쓰는 패턴이 없습니다'); continue; }
  await emit({target: {kind: 'material', id: primitive.id, version: primitive.version, width: 1280}, kind: 'layout-primitive', id: primitive.id, title: `${primitive.label} 배치 원형`, html: compiled.value.html});
}
const sampleColor = bindColor(platformEnv.registry.get('palette:static-kit'), platformEnv.registry.get('subtoken-set:standard'), 'light');
const sampleRoot = `:root{${Object.entries({...sampleColor.vars, '--kit-shade': 'color-mix(in srgb,var(--kit-text) 14%,transparent)', ...bindType(platformEnv.registry.get('type-system:tech-erp')).vars}).map(([k, v]) => `${k}:${v}`).join(';')};${spaceVars('comfortable')}}*{box-sizing:border-box}`;
for (const m of MEDIA) await emit({target: {kind: 'material', id: m.id, version: m.version, width: 480}, kind: 'media', id: m.id, title: `${m.label} 미디어`, html: doc(`${sampleRoot}${mediaCSS(m)}`, renderMedia(m, {title: '대표 이미지', caption: '이미지 설명'}), 24), size: {width: 480, height: 360}});
for (const m of STATE_PATTERNS) await emit({target: {kind: 'material', id: m.id, version: m.version, width: 480}, kind: 'state-pattern', id: m.id, title: `${m.label} 상태 패턴`, html: doc(`${sampleRoot}${stateCSS(m)}`, `<div data-pattern="${m.id.slice(14)}">${renderState(m, {action: {label: '다시 시도', href: '#retry'}})}</div>`, 24), size: {width: 480, height: 360}});

const sortedKeys = Object.keys(items).sort();
await writeFile(join(previewsDir, 'previews-data.json'), JSON.stringify({
  schemaVersion: 'previews/1.0', engineVersion: ENGINE_VERSION, catalogVersion: CATALOG_VERSION,
  totalPreviews: sortedKeys.length, skipped,
  items: Object.fromEntries(sortedKeys.map(k => [k, items[k]])),
}, null, 2) + '\n');

// 6. 경량 카탈로그 인덱스: 부품(카탈로그)과 플랫폼 레지스트리의 모든 종류를 읽어 만든다. 재료를 등록하면 다음 빌드에 목록·검색에 나온다.
const previewOf = (kind, id) => sortedKeys.find(k => items[k].ids.includes(`${kind}:${id}`));
const GROUP_LABEL = {
  structure: '페이지 구조', layout: '배치', content: '내용', data: '데이터', form: '입력', feedback: '상태·피드백', media: '미디어', nav: '탐색',
  'style-context': '스타일 맥락', palette: '팔레트', 'subtoken-set': '서브토큰 세트', 'type-system': '타이포 시스템', 'base-component': '기반 컴포넌트',
  family: '시각 패밀리', 'purpose-family': '목적 패밀리', 'axis-value': '축 값', surface: '표면', motion: '모션', background: '배경', state: '상태 패턴', 'state-pattern': '상태 패턴',
};
const lightMaterials = [];
for (const {row, material} of componentList) {
  const key = previewOf('component', row.type);
  const id = `component:${row.type}`;
  lightMaterials.push({
    id, kind: 'component', category: row.group, label: row.label,
    contexts: material?.contexts ?? ['any'], tags: material?.tags ?? [], previewUrl: key ? `/previews/${key}.svg` : null,
    previewUrlsByFamily: {}, purpose: material?.purpose ?? material?.description ?? `${row.label}를 화면 구성에 사용합니다.`,
    url: `/components/${row.type}`,
    relatedCategories: classifyCatalogMaterial({...material, id, group: row.group, category: row.group, kind: 'component'}, coverage),
    variantsCount: material?.variants ? Object.keys(material.variants).length : 0,
    statesCount: material?.states?.values?.length ?? 0,
    qualityStatus: material?.quality?.status === 'verified' ? 'verified' : 'implemented',
    license: material?.source?.license ?? 'internal', url: `/components/${row.type}`,
  });
}
// 플랫폼 레지스트리의 공개 재료만 읽는다(권리 미확인 팔레트는 이 레지스트리에 들어올 수 없다. CONTRACTS §7).
const urlOf = (kind, d) => ({
  palette: `/materials/palettes/${d.id.split(':')[1]}`, 'type-system': `/materials/typography?with=${d.id.split(':')[1]}`,
  'purpose-family': `/components/purpose/${d.group}/${d.id.split('.')[1]}`, 'style-context': '/materials/styles',
}[kind] ?? '/materials');
for (const kind of PLATFORM_KINDS) {
  for (const row of allPlatformMaterials(kind)) {
    const d = getPlatformMaterial({id: row.id}).value;
    // 기반 컴포넌트는 자기가 계약을 공유하는 부품의 렌더를 그대로 보인다(같은 구현, 별도 그림을 만들지 않는다).
    const key = previewOf(kind, row.id) ?? (kind === 'base-component' && d.contract ? previewOf('component', d.contract.replace(/^component:/, '')) : undefined);
    lightMaterials.push({
      id: row.id, kind, category: kind, label: row.label, contexts: row.contexts ?? [], tags: row.tags ?? [], previewUrl: key ? `/previews/${key}.svg` : null,
      previewUrlsByFamily: purposePreviewFamilies.get(row.id) ?? {},
      purpose: d.purpose ?? d.description ?? row.label,
      relatedCategories: classifyCatalogMaterial({...d, id: row.id, kind, group: row.group, category: d.category ?? kind}, coverage),
      variantsCount: d.variants ? Object.keys(d.variants).length : (d.example?.variant ? 1 : 0),
      statesCount: d.states?.values?.length ?? 0,
      qualityStatus: d.quality?.status === 'verified' ? 'verified' : 'implemented',
      license: d.source?.license ?? 'internal', url: urlOf(kind, {...d, id: row.id}),
    });
  }
}

// 플랫폼·카탈로그 레지스트리 밖에서 등록되는 부품급 재료: 차트 프리셋(§9.1), 레이아웃 부품(§6.2 L), 레이아웃 원형. 빠지면 해당 탭이 비어 보인다.
const extraRow = (record, kind, fields) => {
  // 레이아웃 원형은 같은 이름의 구조 부품 렌더가 있으면 그것을 보인다(같은 CSS 원형을 쓰는 실제 출력).
  const key = previewOf(kind, record.id) ?? (kind === 'layout-primitive' ? previewOf('component', record.id.replace(/^layout-primitive:/, '')) ?? previewOf('layout-component', record.id.replace(/^layout-primitive:/, 'component:')) : undefined);
  return {
    id: record.id, kind, category: record.category ?? kind, label: record.label, contexts: record.contexts ?? ['any'], tags: record.tags ?? [],
    previewUrl: key ? `/previews/${key}.svg` : null, previewUrlsByFamily: {}, purpose: fields.purpose,
    relatedCategories: classifyCatalogMaterial({...record, kind}, coverage), variantsCount: fields.variantsCount ?? 0, statesCount: 0,
    qualityStatus: record.quality?.status === 'verified' ? 'verified' : 'implemented', license: record.source?.license ?? 'internal', url: '/materials',
  };
};
for (const preset of chartPresets) lightMaterials.push(extraRow(preset, 'chart-preset', {purpose: `${preset.label}: ${preset.ext.chartKind} 차트로 ${preset.ext.domain} 맥락의 데이터를 보여 줍니다.`}));
for (const component of LAYOUT_COMPONENTS) lightMaterials.push(extraRow({id: component.id, label: component.label, tags: ['layout', component.componentType], quality: {status: 'verified'}}, 'layout-component', {purpose: `${component.label} 레이아웃 부품: 화면 영역을 배치합니다.`}));
for (const primitive of layoutPrimitives) lightMaterials.push(extraRow(primitive, 'layout-primitive', {purpose: primitive.purpose ?? `${primitive.label} 배치 원형입니다.`}));

const summaries = lightMaterials.map(({url, relatedCategories, previewUrlsByFamily, purpose, ...summary}) => ({
  ...summary, url, purpose, relatedCategories, previewUrlsByFamily,
}));
const categories = CATALOG_CATEGORIES.map(({id, label}) => ({
  id, label,
  itemCount: id === 'all' ? summaries.length : summaries.filter(m => m.relatedCategories.includes(id)).length,
}));
// contentHash 는 본문(categories, materials)의 해시다. 시각을 싣지 않아 같은 코드면 같은 바이트가 나온다.
const body = {categories, materials: summaries};
await writeFile(join(out, 'catalog-index.json'), JSON.stringify({schemaVersion: 'catalog-index/1.0', catalogVersion: CATALOG_VERSION, contentHash: sha(JSON.stringify(body)), ...body}, null, 2) + '\n');
for (const cat of categories) {
  const rows = cat.id === 'all' ? summaries : summaries.filter(m => m.relatedCategories.includes(cat.id));
  const pages = Math.max(1, Math.ceil(rows.length / 24));
  for (let page = 1; page <= pages; page++) {
    await writeFile(join(chunksDir, `${cat.id}-${page}.json`), JSON.stringify({
      schemaVersion: 'catalog-index/1.0', category: cat.id, label: cat.label, itemCount: cat.itemCount, page, pages,
      materials: rows.slice((page - 1) * 24, page * 24),
    }, null, 2) + '\n');
  }
}
await writeFile(join(out, 'search-index.json'), JSON.stringify(lightMaterials.map(m => ({
  id: m.id, label: m.label, kind: m.kind, category: m.category, relatedCategories: m.relatedCategories,
  contexts: m.contexts, tags: m.tags, purpose: m.purpose, variantsCount: m.variantsCount, statesCount: m.statesCount,
  qualityStatus: m.qualityStatus, previewUrl: m.previewUrl, previewUrlsByFamily: m.previewUrlsByFamily, url: m.url,
})), null, 2) + '\n');

console.log(`Generated ${sortedKeys.length} previews (${skipped.length} skipped with reason), catalog-index.json (${lightMaterials.length} materials, ${categories.length} categories) → ${out}`);
