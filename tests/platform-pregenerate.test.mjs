import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {
  assembleComponents, assembleDesign, compileBlueprint, getPlatformMaterial, listCatalog,
} from '../src/service/index.mjs';
import {PLATFORM_KINDS} from '../src/platform/contract.mjs';
import {resetDocument, setAppearance} from '../src/edit/index.mjs';
import {templateList} from '../src/catalog.mjs';
import {CATALOG_VERSION, ENGINE_VERSION, previewKeyOf} from '../apps/web/lib/api/preview-keys.mjs';
import {curatedDesignRefs} from '../apps/web/lib/api/preview-recipes.mjs';
import {toPreviewSvg} from '../apps/web/lib/api/preview-svg.mjs';
import {formatDesignId, parseDesignId, resetArgs} from '../apps/web/features/explore/id.ts';
import {PLATFORM_CASES} from '../apps/web/features/platform/cases.ts';
import {allPlatformMaterials, caseRequest, purposeRequest, typeRequest} from '../scripts/lib/preview-requests.mjs';

const site = resolve(import.meta.dirname, '../site');
const json = path => JSON.parse(readFileSync(join(site, path), 'utf8'));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 32);
const previews = json('previews/previews-data.json');
const index = json('catalog-index.json');
const svgOf = key => readFileSync(join(site, 'previews', `${key}.svg`), 'utf8');
const byKind = kind => Object.entries(previews.items).filter(([, v]) => v.kind === kind);

// 독립 검사: SVG 는 <img> 로 쓰이면 XML 로 읽힌다. 태그 짝, 속성 중복·따옴표, doctype 금지, 엔티티를 직접 확인한다(변환기 코드와 공유하지 않는다).
function assertWellFormed(xml, label) {
  assert.ok(!/<!doctype/i.test(xml), `${label}: doctype 이 있다`);
  const stack = [];
  const tag = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]*>/g;
  let m; let last = 0;
  const text = s => { assert.ok(!/<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(s), `${label}: 텍스트에 잘못된 < 또는 & : ${s.slice(0, 40)}`); };
  while ((m = tag.exec(xml))) {
    text(xml.slice(last, m.index)); last = tag.lastIndex;
    if (m[0].startsWith('<![CDATA[') || m[0].startsWith('<!--')) continue;
    assert.ok(m[2], `${label}: 읽을 수 없는 태그 ${m[0].slice(0, 60)}`);
    const names = [...m[3].matchAll(/\s+([^\s=>/]+)\s*=/g)].map(x => x[1]);
    assert.equal(new Set(names).size, names.length, `${label}: <${m[2]}> 속성 중복 ${names}`);
    for (const v of m[3].matchAll(/=\s*"([^"]*)"/g)) assert.ok(!/<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(v[1]), `${label}: 속성 값에 잘못된 문자 ${v[1].slice(0, 40)}`);
    if (m[1]) assert.equal(stack.pop(), m[2], `${label}: </${m[2]}> 짝이 맞지 않는다`);
    else if (!m[4]) stack.push(m[2]);
  }
  text(xml.slice(last));
  assert.deepEqual(stack, [], `${label}: 닫히지 않은 요소`);
}

test('사전 생성 목록이 현재 엔진·카탈로그 버전의 것이다(오래된 키가 남지 않는다)', () => {
  assert.equal(previews.schemaVersion, 'previews/1.0');
  assert.equal(previews.engineVersion, ENGINE_VERSION);
  assert.equal(previews.catalogVersion, CATALOG_VERSION);
  assert.equal(previews.totalPreviews, Object.keys(previews.items).length);
  const files = readdirSync(join(site, 'previews')).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)).sort();
  assert.deepEqual(files, Object.keys(previews.items).sort(), '목록에 없는 파일이나 파일 없는 항목이 있다');
});

test('모든 미리보기 파일은 XML 로 올바르다(<img> 로 열린다)', () => {
  for (const [key, item] of Object.entries(previews.items)) {
    assert.match(key, /^[0-9a-f]{32}$/);
    assert.equal(item.path, `/previews/${key}.svg`);
    assertWellFormed(svgOf(key), `${item.kind}:${item.id}`);
  }
});

test('Explore 대표 미리보기는 Core 컴파일 결과와 바이트까지 같고, 파일 이름은 그 요청의 캐시 키다', () => {
  const refs = curatedDesignRefs().map(r => r.ref);
  const items = byKind('explore');
  assert.equal(items.length, refs.length, '웹 목록의 대표 디자인 수와 같다(전수 조합이 아니다)');
  assert.ok(items.length < templateList.length * 4, '템플릿당 기본 1 + 테마 조합 몇 개만 만든다');
  for (const ref of refs) {
    const id = formatDesignId(ref);
    assert.deepEqual(parseDesignId(id), ref, `${id}: designId 왕복`);
    // 서비스 진입점을 직접 호출한다(웹 레시피를 거치지 않는다).
    const made = resetDocument(null, resetArgs(ref));
    assert.ok(made.ok, id);
    let doc = made.doc;
    if (ref.mode) { const moded = setAppearance(doc, {mode: ref.mode}); assert.ok(moded.ok, id); doc = moded.doc; }
    const compiled = compileBlueprint(doc, {include: ['html']});
    assert.ok(compiled.ok, id);
    const key = previewKeyOf({kind: 'design', ref, width: 1280});
    assert.ok(previews.items[key], `${id}: 목록에 없다`);
    assert.equal(previews.items[key].htmlHash, sha(compiled.value.html), `${id}: 원본 HTML 해시`);
    assert.equal(svgOf(key), toPreviewSvg(compiled.value.html, {width: 1280, height: 800, title: previews.items[key].title}), `${id}: SVG 가 Core HTML 에서 나온 것과 다르다`);
  }
});
test('플랫폼 사례, 목적 패밀리, 타이포그래피 미리보기도 서비스 출력과 바이트까지 같다', () => {
  for (const k of PLATFORM_CASES) {
    const request = caseRequest(k);
    const r = assembleDesign(request, {include: ['standalone']});
    assert.ok(r.ok, k.id);
    const key = previewKeyOf({kind: 'assemble', request, width: 1280});
    assert.equal(svgOf(key), toPreviewSvg(r.value.candidates[0].value.standalone, {width: 1280, height: 800, title: previews.items[key].title}), k.id);
  }
  const purposes = byKind('purpose-family');
  assert.ok(purposes.length > 0);
  for (const row of allPlatformMaterials('purpose-family')) {
    const f = getPlatformMaterial({id: row.id}).value;
    const request = purposeRequest(f);
    const key = previewKeyOf({kind: 'components', request, width: 480});
    if (!previews.items[key]) { assert.ok(previews.skipped.some(s => s.key === key), `${row.id}: 목록에도 건너뜀 목록에도 없다`); continue; }
    const r = assembleComponents(request, {include: ['standalone']});
    assert.ok(r.ok, row.id);
    assert.equal(svgOf(key), toPreviewSvg(r.value.standalone, {width: 480, height: 360, title: previews.items[key].title}), row.id);
  }
  for (const row of allPlatformMaterials('type-system')) {
    const request = typeRequest(row.id);
    const key = previewKeyOf({kind: 'assemble', request, width: 1280});
    const r = assembleDesign(request, {include: ['standalone']});
    if (!r.ok) { assert.equal(previews.items[key], undefined, `${row.id}: 조립이 거부되는 요청에 미리보기가 있다`); assert.ok(previews.skipped.some(s => s.key === key && s.reason), `${row.id}: 사유가 없다`); continue; }
    assert.equal(svgOf(key), toPreviewSvg(r.value.candidates[0].value.standalone, {width: 1280, height: 800, title: previews.items[key].title}), row.id);
  }
});

test('타이포그래피는 기본 보기(라이트·문서 샘플·1280)만 사전 생성한다. 다른 샘플·모드·폭은 선택 시 컴파일한다', () => {
  const types = byKind('type-system');
  const systems = allPlatformMaterials('type-system');
  assert.ok(types.length > 0 && types.length <= systems.length, '시스템당 최대 1개');
  for (const [, item] of types) assert.equal(item.width, 1280);
  const dark = previewKeyOf({kind: 'assemble', request: {...typeRequest(systems[0].id), mode: 'dark'}, width: 1280});
  assert.equal(previews.items[dark], undefined);
});

test('공개 레지스트리에서 인덱스가 자동으로 만들어진다: 종류별 항목 수 = 레지스트리 항목 수', () => {
  for (const kind of PLATFORM_KINDS) {
    assert.equal(index.materials.filter(m => m.kind === kind).length, allPlatformMaterials(kind).length, kind);
  }
  const components = listCatalog({kind: 'components', filter: {catalogVersion: '2.6.0'}, limit: 200}).value.items.filter(c => c.type !== 'page');
  assert.equal(index.materials.filter(m => m.kind === 'component').length, components.length);
  // 대상이 되는 모든 부품·패밀리·타이포 시스템은 미리보기를 얻거나 건너뛴 사유를 가진다
  const withPreview = new Set(Object.values(previews.items).flatMap(v => v.ids));
  for (const row of allPlatformMaterials('type-system')) assert.ok(withPreview.has(`type-system:${row.id}`) || previews.skipped.some(s => s.kind === 'type-system' && s.id === row.id), row.id);
  for (const row of allPlatformMaterials('purpose-family')) assert.ok(withPreview.has(`purpose-family:${row.id}`) || previews.skipped.some(s => s.kind === 'purpose-family' && s.id === row.id), row.id);
});

test('권리를 확인하지 못한 팔레트(Coolors 427종)는 공개 인덱스에 없다', () => {
  const registered = new Set(allPlatformMaterials('palette').map(p => p.id));
  for (const m of index.materials.filter(m => m.kind === 'palette')) assert.ok(registered.has(m.id), m.id);
  assert.ok(index.materials.filter(m => m.kind === 'palette').length < 100);
});

test('catalog-index.json 은 LightCatalogIndex 계약을 따른다(CONTRACTS §4)', () => {
  assert.equal(index.schemaVersion, 'catalog-index/1.0');
  assert.equal(index.catalogVersion, CATALOG_VERSION);
  assert.ok(!('generatedAt' in index), '시각을 싣지 않는다(바이트 재현성)');
  assert.equal(index.contentHash, sha(JSON.stringify({categories: index.categories, materials: index.materials})));
  for (const cat of index.categories) {
    assert.equal(cat.itemCount, index.materials.filter(m => m.category === cat.id).length, cat.id);
    const chunk = json(`catalog-chunks/${cat.id}.json`);
    assert.deepEqual(chunk.materials, index.materials.filter(m => m.category === cat.id), `chunk ${cat.id}`);
  }
  for (const m of index.materials) {
    assert.ok(m.id && m.kind && m.category && m.label, m.id);
    assert.ok(Array.isArray(m.contexts) && Array.isArray(m.tags), m.id);
    assert.ok(m.previewUrl === null || (/^\/previews\/[0-9a-f]{32}\.svg$/.test(m.previewUrl) && existsSync(join(site, m.previewUrl))), `${m.id}: previewUrl`);
    assert.ok(typeof m.variantsCount === 'number' && typeof m.statesCount === 'number', m.id);
    assert.ok(['implemented', 'verified'].includes(m.qualityStatus), m.id);
    assert.ok(['internal', 'MIT', 'facts-only'].includes(m.license), `${m.id}: ${m.license}`);
  }
  const search = json('search-index.json');
  assert.equal(search.length, index.materials.length);
});
