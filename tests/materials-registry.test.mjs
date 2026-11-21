import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  catalogRegistry, createRegistry, defineMaterial, defineKind, MaterialError, BUILTIN_KINDS, FIELDS, CATEGORIES, QUALITY,
  chartPresetMaterials, selectMaterial, tableMaterial, controlMaterials,
  MATERIAL_CATALOG_VERSION, combinationsOf, validateMaterial, PALETTE_SOURCE_VERDICT, PALETTE_ROLES, MATERIAL_TYPE_PRESETS,
} from '../src/materials/index.mjs';
import {nodeTypes, nodeSpecs, themes, palettes, templates, pageTypeIds, recipeIds, iconNames, axes, styleAxes, ACCEPTED_CATALOG_VERSIONS, CATALOG_VERSION, VERSION_ORDER} from '../src/catalog.mjs';
import {TYPE} from '../src/typography.mjs';
import {PRIMITIVES} from '../src/layout.mjs';
import {compile} from '../src/compiler.mjs';
import {resolveTokens} from '../src/tokens.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const codes = fn => { try { fn(); } catch (e) { assert.ok(e instanceof MaterialError, e.message); return e.errors.map(x => x.code); } assert.fail('expected MaterialError'); };
const registry = catalogRegistry();

/** 시험용 최소 재료. 구현이 있는 부품 한 장. */
const sample = (patch = {}) => defineMaterial({
  id: 'component:sample', kind: 'component', category: 'form-data-feedback', label: '시험 부품',
  render: {module: 'src/render/nodes.mjs', export: 'makeRenderer', key: 'sample'},
  quality: {status: 'implemented', evidence: []},
  ext: {nodeType: 'sample', group: 'data', fields: [], required: []},
  ...patch,
});

test('materials: every existing node, axis, type preset, theme, palette, page type, template, recipe, layout primitive and icon is registered', () => {
  const c = registry.counts();
  assert.deepEqual(c.byKind, {
    axis: 1 + styleAxes.length, 'chart-preset': chartPresetMaterials.length, component: nodeTypes.length + [selectMaterial, tableMaterial].length + controlMaterials.length, icon: iconNames.length, 'layout-primitive': PRIMITIVES.length, 'page-type': pageTypeIds.length,
    palette: Object.keys(palettes).length, 'color-token': registry.byKind('color-token').length, recipe: recipeIds.length, template: Object.keys(templates).length, theme: Object.keys(themes).length, 'type-preset': Object.keys(TYPE).length, 'type-role-preset': Object.keys(MATERIAL_TYPE_PRESETS).length,
  });
  assert.equal(c.materials, Object.values(c.byKind).reduce((a, b) => a + b, 0));
  for (const type of nodeTypes) assert.ok(registry.has('component:' + type), type);
  assert.deepEqual(registry.check(), []);
  for (const m of registry.list()) assert.deepEqual(validateMaterial(m, registry.kind(m.kind)), [], m.id);
});

test('materials: material count, attribute combinations and complete presets are three different numbers', () => {
  const c = registry.counts();
  assert.equal(c.attributeCombinations, registry.list().reduce((n, m) => n + combinationsOf(m), 0));
  assert.equal(c.completePresets, registry.list().filter(m => registry.isPreset(m)).length);
  assert.ok(c.attributeCombinations > c.materials && c.materials > c.completePresets && c.completePresets > 0, JSON.stringify(c));
  // 완성 프리셋은 서체 프리셋·역할 서체·테마·템플릿·차트뿐이다. 속성이 많은 부품(히어로·표…)은 조합을 늘려도 프리셋이 아니다.
  assert.equal(c.completePresets, Object.keys(TYPE).length + Object.keys(MATERIAL_TYPE_PRESETS).length + Object.keys(themes).length + Object.keys(templates).length + chartPresetMaterials.length);
  assert.equal(registry.filter({kind: 'component', preset: true}).length, 0);
  assert.ok(combinationsOf(registry.get('component:hero')) > 1);
});

test('materials: combinations are not reported as presets (a 3×4 component adds 12 combinations and 0 presets)', () => {
  const r = createRegistry();
  r.register(sample({variants: {variant: ['a', 'b', 'c'], state: ['ready', 'loading', 'empty', 'error']}, defaults: {variant: 'a', state: 'ready'}}));
  assert.deepEqual([r.counts().materials, r.counts().attributeCombinations, r.counts().completePresets], [1, 12, 0]);
  // 같은 모양을 프리셋이라고 주장하면 등록이 거부된다.
  assert.deepEqual(codes(() => createRegistry().register(sample({preset: true}))), ['M_PRESET']);
  // 프리셋 가능 종류라도 기본값이 빈 속성이 있으면 완성 프리셋이 아니다.
  const theme = registry.get('theme:workspace');
  assert.ok(registry.isPreset(theme));
  assert.deepEqual(codes(() => createRegistry().register({...structuredClone(theme), id: 'theme:open', defaults: {variant: 'base'}})), ['M_PRESET']);
  // 완성 프리셋 하나는 조합 수와 무관하게 1개다.
  const t = createRegistry().register({...structuredClone(theme), dependencies: []});
  assert.equal(t.counts().completePresets, 1);
  assert.equal(t.counts().attributeCombinations, combinationsOf(theme));
});

test('materials: the validator rejects each broken contract with its own code', async t => {
  const reg = () => createRegistry();
  const {render, ...noRender} = sample();
  assert.deepEqual(codes(() => reg().register(noRender)), ['M_REQUIRED']);
  assert.deepEqual(codes(() => reg().register(sample({extra: 1}))), ['M_UNKNOWN_KEY']);
  assert.deepEqual(codes(() => reg().register(sample({id: 'theme:sample'}))), ['M_ID']);
  assert.deepEqual(codes(() => reg().register(sample({version: '1.0'}))), ['M_VERSION']);
  assert.deepEqual(codes(() => reg().register(sample({since: '3.0.0'}))), ['M_SINCE']);
  assert.deepEqual(codes(() => reg().register(sample({kind: 'widget', id: 'widget:x'}))), ['M_KIND']);
  assert.deepEqual(codes(() => reg().register(sample({category: 'palette'}))), ['M_ENUM']);
  assert.deepEqual(codes(() => reg().register(sample({contexts: ['kiosk']}))), ['M_CONTEXT']);
  assert.deepEqual(codes(() => reg().register(sample({variants: {tone: ['a']}, defaults: {tone: 'b'}}))), ['M_DEFAULT']);
  await t.test('variant sets are diagnosed before checking defaults', checkVariantSets);
  assert.deepEqual(codes(() => reg().register(sample({structure: {parents: [], children: {allowed: [], min: 3, max: 1}}}))), ['M_STRUCTURE']);
  await t.test('malformed state transitions are diagnosed at the entry path', checkTransitions);
  assert.deepEqual(codes(() => reg().register(sample({quality: {status: 'verified', evidence: ['docs/x.md']}}))), ['M_QUALITY']);
  assert.deepEqual(codes(() => reg().register(sample({quality: {status: 'missing', evidence: []}}))), ['M_QUALITY']);
  assert.deepEqual(codes(() => reg().register(sample({render: null}))), ['M_QUALITY']);
  assert.deepEqual(codes(() => reg().register(sample({source: {origin: 'coolors', license: 'unverified', url: 'https://example.com'}}))), ['M_SOURCE']);
  assert.deepEqual(codes(() => reg().register(sample({source: {origin: 'internal', license: 'unverified'}}))), ['M_SOURCE']);
  assert.deepEqual(codes(() => reg().register(sample({ext: {nodeType: 'sample', group: 'data', fields: []}}))), ['M_EXT']);
  assert.deepEqual(codes(() => reg().register(sample({ext: {nodeType: 'sample', group: 'data', fields: [], required: [], colour: 'red'}}))), ['M_EXT']);
  assert.deepEqual(codes(() => reg().register(defineMaterial({...sample(), id: 'palette:x', kind: 'palette', ext: {colors: [], brand: 0, family: 'x', tone: 'x'}}))), ['M_CATEGORY']);
  assert.deepEqual(codes(() => reg().register(sample()).register(sample())), ['M_DUPLICATE']);
  // 등록된 재료는 얼어 있고 원본과 분리되어 있다.
  const input = sample(), r = reg().register(input);
  input.label = '바뀜';
  assert.equal(r.get('component:sample').label, '시험 부품');
  assert.throws(() => { r.get('component:sample').label = 'x'; });
  // 참조는 전체를 등록한 뒤 검사한다.
  const g = reg().register(sample({dependencies: ['component:none'], structure: {parents: ['component:page'], children: null}}));
  assert.deepEqual(g.check().map(e => e.code), ['M_REFERENCE', 'M_REFERENCE']);
});

test('materials: lookup, search and filter by kind, category, context, quality and tag', () => {
  assert.equal(registry.get('component:table').ext.nodeType, 'table');
  assert.equal(registry.get('component:nope'), null);
  assert.deepEqual(registry.search('chart', {kind: 'component'}).map(m => m.id), ['component:chart']);
  assert.ok(registry.search('표').some(m => m.id === 'component:table'));
  const blue = registry.search('blue', {kind: 'palette'});
  assert.ok(blue.length > 0 && blue.every(m => [m.id, m.label, ...m.tags].join(' ').toLowerCase().includes('blue')));
  assert.deepEqual(registry.search('ocean no-such-word'), []);
  // auth 맥락은 allow 목록 안의 부품만 받는다.
  const auth = registry.filter({kind: 'component', context: 'auth'}).map(m => m.ext.nodeType);
  assert.ok(auth.includes('form') && !auth.includes('hero') && !auth.includes('chart'));
  assert.ok(!registry.byContext('dashboard').some(m => m.id === 'component:hero'));
  assert.ok(registry.byContext('landing').some(m => m.id === 'component:hero'));
  assert.deepEqual([...new Set(registry.byKind('template').map(m => m.kind))], ['template']);
  assert.ok(registry.filter({category: 'chart'}).every(m => m.category === 'chart'));
  assert.ok(registry.filter({minQuality: 'verified'}).every(m => m.quality.status === 'verified'));
  assert.equal(registry.filter({tag: 'theme'}).length, Object.keys(themes).length);
  assert.throws(() => registry.filter({minQuality: 'great'}), MaterialError);
  assert.throws(() => registry.filter({category: 'misc'}), MaterialError);
});

test('materials: new kinds extend the registry without touching the common contract', () => {
  const r = createRegistry();
  assert.throws(() => r.addKind(BUILTIN_KINDS[0]), MaterialError);
  r.addKind(defineKind({id: 'select', label: '선택 상자', categories: ['form-data-feedback'], ext: {multiple: 'boolean', searchable: 'boolean'}}));
  r.register(defineMaterial({
    id: 'select:basic', kind: 'select', category: 'form-data-feedback', label: '기본 선택', render: null,
    variants: {size: ['sm', 'md']}, states: {values: ['closed', 'open'], transitions: [{from: 'closed', to: 'open', trigger: 'click | Enter | Space'}]},
    ext: {multiple: false, searchable: false},
  }));
  assert.equal(r.counts().byQuality.missing, 1);
  assert.throws(() => defineKind({id: 'x', label: 'x', categories: ['nope']}));
  // 색 토큰과 차트 프리셋은 등록되며, 패턴만 계약이 선행한다.
  assert.ok(registry.kind('color-token') && registry.byKind('color-token').length > 0);
  assert.ok(registry.kind('pattern')); assert.equal(registry.byKind('pattern').length, 0);
  assert.ok(registry.byKind('chart-preset').length >= 6);
});

test('materials: adapters keep catalog facts (children, parents, enums, contexts, CSS tokens)', () => {
  const tabs = registry.get('component:tabs');
  assert.deepEqual(tabs.structure.children, {allowed: ['component:tab'], min: nodeSpecs.tabs.min, max: nodeSpecs.tabs.max});
  assert.ok(registry.get('component:tab').structure.parents.includes('component:tabs'));
  assert.deepEqual(registry.get('component:chart').variants.kind, nodeSpecs.chart.fields.kind.enum);
  assert.deepEqual(registry.get('component:table').states.values, ['ready', 'loading', 'empty', 'error', 'partial', 'forbidden']);
  assert.ok(registry.get('component:table').tokens.every(t => t.startsWith('--kit-')) && registry.get('component:table').tokens.length > 0);
  for (const id of ['component:select-control', 'component:data-table']) {
    const material = registry.get(id);
    assert.equal(material.since, '2.6.0');
    assert.ok(material.tokens.every(t => t.startsWith('--kit-')) && material.tokens.length > 0);
  }
  assert.deepEqual(registry.get('axis:radius').variants.value, axes.radius);
  assert.deepEqual(registry.get('palette:ocean').tokens, Object.keys(resolveTokens({palette: 'ocean', mode: 'light'}).tokens));
  assert.equal(PALETTE_ROLES.length, 27);
  assert.ok(registry.get('theme:workspace').dependencies.every(d => registry.has(d)));
  // 부품마다 렌더러에 같은 이름의 진입점이 있다.
  const renderer = read('src/render/nodes.mjs');
  for (const type of nodeTypes) { const key = type === 'tab' ? 'tabs' : type; assert.ok(renderer.includes(`R.${key} =`) || renderer.includes(`R['${key}'] =`), type); }
  assert.match(read('src/materials/select.mjs'), /export function renderSelect/);
  assert.match(read('src/materials/table.mjs'), /export function renderDataTable/);
});

test('materials: every evidence file:line points at a test() that exists', () => {
  const seen = new Set(registry.list().flatMap(m => m.quality.evidence));
  assert.ok(seen.size > 5);
  for (const ref of seen) {
    const [file, line] = ref.split(':');
    assert.match(read(file).split('\n')[Number(line) - 1] ?? '', /^test\(/, ref);
  }
});

test('materials: palette provenance is Coolors only, license unverified, with the audit verdict on every palette', () => {
  const list = registry.byKind('palette');
  assertPaletteAudit(list);
  for (const m of list) {
    assert.equal(new URL(m.source.url).host, 'coolors.co', m.id);
    assert.equal(m.source.license, 'unverified');
    assert.equal(m.source.verdict, PALETTE_SOURCE_VERDICT);
    assert.ok(['docs/evidence/coolors-palettes.json', 'docs/evidence/coolors-popular-2026-10-20.json'].includes(m.source.evidence), m.id);
  }
  assert.ok(registry.list().filter(m => m.kind !== 'palette').every(m => m.source.origin === 'internal' && m.source.license === 'MIT'));
});

test('materials: registering the catalog changes neither the catalog nor any 2.4.0/2.5.0 compiled output', () => {
  const before = sha([nodeSpecs, themes, palettes, templates]);
  catalogRegistry();
  assert.equal(sha([nodeSpecs, themes, palettes, templates]), before);
  // 컴파일 경로는 재료 레지스트리·어댑터를 읽지 않는다. 2.6.0 연결 뒤에는 필요한 렌더·스타일 모듈만 직접 읽는다.
  const RENDER_REUSE = ['select', 'table', 'typography', 'button', 'input', 'card', 'navigation', 'modal', 'tabs', 'tooltip', 'feedback'];
  for (const f of ['src/compiler.mjs', 'src/validate.mjs', 'src/render/nodes.mjs', 'src/render/index.mjs', 'src/styles/index.mjs', 'src/service/index.mjs', 'src/edit/index.mjs']) {
    const imported = [...read(f).matchAll(/^\s*import .*from ['"]([^'"]*materials\/[^'"]*)['"]/gm)].map(m => m[1].replace(/^.*materials\//, '').replace(/\.mjs$/, ''));
    assert.ok(imported.every(name => RENDER_REUSE.includes(name)), `${f} imports ${imported.join(',')}`);
  }
  const legacy = JSON.parse(read('docs/evidence/expression/legacy-2-4-hashes.json')), legacyIn = JSON.parse(read('docs/evidence/expression/legacy-2-4-blueprints.json'));
  for (const [id, h] of Object.entries(legacy.hashes)) assert.equal(sha(compile(structuredClone(legacyIn.blueprints[id]))), h, '2.4.0 ' + id);
  const pinned = JSON.parse(read('docs/evidence/materials/pinned-2-5-hashes.json')), pinnedIn = JSON.parse(read('docs/evidence/materials/pinned-2-5-blueprints.json'));
  assert.equal(Object.keys(pinned.hashes).length, Object.keys(templates).length);
  for (const [id, h] of Object.entries(pinned.hashes)) { const b = structuredClone(pinnedIn.blueprints[id]); assert.equal(b.catalogVersion, '2.5.0'); assert.equal(sha(compile(b)), h, '2.5.0 ' + id); }
});

test('materials: 2.6.0 is active opt-in; existing versions and the default stay as they are (ADR 0011)', () => {
  assert.equal(MATERIAL_CATALOG_VERSION, '2.6.0');
  assert.equal(CATALOG_VERSION, '2.4.0');
  assert.deepEqual([...VERSION_ORDER], ['2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0']);
  assert.ok(ACCEPTED_CATALOG_VERSIONS.includes(MATERIAL_CATALOG_VERSION));
  assert.ok(read('docs/adr/0011-materials-contract.md').includes('2.6.0'));
});

test('materials: the contract exposes the fields later workers must fill', () => {
  for (const f of ['id', 'version', 'kind', 'category', 'contexts', 'render', 'defaults', 'variants', 'tokens', 'dependencies', 'structure', 'states', 'responsive', 'a11y', 'validation', 'examples', 'quality', 'source']) assert.ok(Object.hasOwn(FIELDS, f), f);
  assert.equal(CATEGORIES.length, 12);
  assert.deepEqual([...QUALITY], ['missing', 'enum-only', 'implemented', 'verified']);
});

function checkVariantSets() {
  assert.deepEqual(codes(() => createRegistry().register(sample({variants: {tone: []}}))), ['M_VARIANTS']);
  // 기본값 조회가 잘못된 집합에서 .some을 호출하던 회귀를 확인한다.
  for (const values of [3, null]) {
    const material = sample({variants: {tone: values}, defaults: {tone: 'a'}});
    assertRegistrationDiagnostic(material, 'M_VARIANTS', '$.variants.tone');
  }
}

function checkTransitions() {
  const invalidTarget = sample({states: {values: ['a'], transitions: [{from: 'a', to: 'b', trigger: 'x'}]}});
  assert.deepEqual(codes(() => createRegistry().register(invalidTarget)), ['M_STATES']);
  // null의 from을 읽던 회귀와 원시값의 항목 경로를 확인한다.
  const material = sample({states: {values: ['a'], transitions: [null, 'a', 0, false]}});
  assertRegistrationDiagnostic(material, 'M_STATES', ...material.states.transitions.map((_, i) => `$.states.transitions[${i}]`));
}

function assertRegistrationDiagnostic(material, code, ...paths) {
  const r = createRegistry();
  const expected = paths.map(path => [code, path]);
  let diagnostics;
  assert.doesNotThrow(() => { diagnostics = validateMaterial(material, r.kind(material.kind)); });
  assert.deepEqual(diagnostics.map(e => [e.code, e.path]), expected);
  assert.throws(() => r.register(material), error => {
    assert.ok(error instanceof MaterialError);
    assert.deepEqual(error.errors, diagnostics);
    return true;
  });
  assert.ok(!r.has(material.id));
}

function assertPaletteAudit(list) {
  assert.equal(Object.keys(palettes).length, 427);
  assert.equal(list.length, Object.keys(palettes).length);
  for (const m of list) {
    assert.equal(m.source.origin, 'coolors', m.id);
    assert.match(m.source.verdict, /별도 권리 허락 미확인/, m.id);
    assert.match(m.source.verdict, /신규 노출·내보내기·수집에 부적합/, m.id);
  }
}
