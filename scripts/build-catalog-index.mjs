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
    const key = previewOf(kind, row.id);
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
