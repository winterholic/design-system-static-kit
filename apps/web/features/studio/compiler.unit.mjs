import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  LRUCache,
  StudioCompileManager,
  canonicalJson,
  candidateTrials,
  compileBlueprintWithCache,
  computeCacheKey,
  coreCompile,
  designChoices,
  engineVersionOf,
  explorationKey,
  materialIdsOf,
  sha256Hex,
  studioCompileCache,
  STYLE_AXIS_FIELDS,
} from './compiler.ts';
import {core as getCore, loadCore} from './core.ts';
import {loadCatalog, layoutSlotsOf} from './catalog.ts';
import {htmlText} from './export.ts';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha = text => createHash('sha256').update(text).digest('hex');

async function freshDoc(template = 'dashboard-overview', extra = {}) {
  await loadCore();
  const c = getCore();
  const base = c.edit.applyOp(null, 'resetDocument', {template}).doc;
  const r = c.edit.applyOp(base, 'importBlueprint', {blueprint: {...base, catalogVersion: '2.6.0', ...extra}, upgrade: true});
  assert.equal(r.ok, true, `${template} must accept ${JSON.stringify(extra)}: ${r.errors?.map(e => e.code).join(',')}`);
  return r.doc;
}

/** profile erp를 받는 템플릿(dashboard·listing·settings 계열). 다른 템플릿은 PROFILE_PAGE_TYPE으로 거부된다. */
const PROFILE_TEMPLATES = ['dashboard-overview', 'admin-table', 'settings'];

// ---- 해시와 캐시 키 ----------------------------------------------------------------------------------------------

test('canonicalJson sorts keys recursively and is deterministic', () => {
  assert.equal(canonicalJson({b: 2, a: 1, c: {y: 'two', x: 'one'}}), canonicalJson({c: {x: 'one', y: 'two'}, a: 1, b: 2}));
  assert.equal(canonicalJson({b: 2, a: [{z: 1, y: 2}]}), '{"a":[{"y":2,"z":1}],"b":2}');
});

test('sha256Hex equals node:crypto SHA-256 across padding boundaries and unicode', () => {
  const inputs = ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65), '한글 콘텐츠 🎨 ' + 'é'.repeat(100), JSON.stringify({k: 'v'.repeat(5000)})];
  for (const text of inputs) assert.equal(sha256Hex(text), sha(text), `len ${text.length}`);
});

test('computeCacheKey follows CONTRACTS §5.2 exactly (SHA-256 of the colon-joined parts, first 32 hex)', () => {
  const doc = {version: '2.0', catalogVersion: '2.6.0', theme: 'workspace', palette: 'slate', colorPalette: 'static-kit', mode: 'light', tree: {type: 'page', children: []}};
  const materialIds = ['theme:workspace@2.6.0', 'palette:slate@2.6.0', 'color-palette:static-kit@2.6.0'].sort().join(',');
  assert.equal(materialIdsOf(doc, '2.6.0'), materialIds);
  const expected = sha(`eng/1:2.6.0:${materialIds}:${canonicalJson(doc)}:light:default`).slice(0, 32);
  assert.equal(computeCacheKey('eng/1', '2.6.0', doc, 'light'), expected);
  assert.equal(computeCacheKey('eng/1', '2.6.0', doc, 'light', 390), sha(`eng/1:2.6.0:${materialIds}:${canonicalJson(doc)}:light:390`).slice(0, 32));
});

test('computeCacheKey changes with every §5.2 input and ignores object key order', () => {
  const doc = {catalogVersion: '2.6.0', theme: 'workspace', palette: 'slate', name: 'A', tree: {type: 'page', children: []}};
  const key = (over = {}) => computeCacheKey(over.engine ?? 'eng/1', over.catalog ?? '2.6.0', over.doc ?? doc, over.mode ?? 'light', over.vp);
  const base = key();
  assert.equal(base.length, 32);
  assert.equal(key({doc: {tree: doc.tree, name: 'A', palette: 'slate', theme: 'workspace', catalogVersion: '2.6.0'}}), base, 'key order must not matter');
  for (const [what, k] of Object.entries({
    engine: key({engine: 'eng/2'}), catalog: key({catalog: '2.7.0'}), material: key({doc: {...doc, palette: 'ink'}}),
    request: key({doc: {...doc, name: 'B'}}), whitespace: key({doc: {...doc, name: 'A '}}), mode: key({mode: 'dark'}), viewport: key({vp: 390}),
  })) assert.notEqual(k, base, `${what} must change the key`);
});

test('LRUCache enforces its size limit by evicting the least recently used entry', () => {
  const cache = new LRUCache(3);
  for (const k of ['k1', 'k2', 'k3']) cache.set(k, k);
  assert.equal(cache.get('k1'), 'k1');
  cache.set('k4', 'k4');
  assert.equal(cache.size, 3);
  assert.equal(cache.has('k2'), false, 'least recently used entry is evicted');
  assert.deepEqual(['k1', 'k3', 'k4'].map(k => cache.has(k)), [true, true, true]);
  for (let i = 0; i < 50; i++) cache.set('x' + i, i);
  assert.equal(cache.size, 3, 'never grows past the limit');
  assert.equal(studioCompileCache.maxSize, 100);
});

// ---- 컴파일 관리자: 실제 Core와 실제 schedule 경로 -----------------------------------------------------------------

test('debounce: ten edits within the window compile once, with the real Core, and match a direct compile', async () => {
  const doc0 = await freshDoc();
  const c = getCore();
  let compiles = 0;
  const manager = new StudioCompileManager(c, {debounceMs: 40, cache: new LRUCache(10), onCompile: () => compiles++});
  const delivered = [];
  const docs = Array.from({length: 10}, (_, i) => ({...doc0, name: `edit ${i}`}));
  for (const d of docs) { manager.schedule(d, 'document', (res, meta) => delivered.push({res, meta})); await sleep(5); }
  await sleep(150);
  assert.equal(compiles, 1, 'only the last settled document is compiled');
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].meta.fromCache, false);
  const direct = coreCompile(c)(docs[9], 'document');
  assert.equal(sha(delivered[0].res.html), sha(direct.html), 'same bytes as an uncached compile');
});

test('cache: identical normalized input is served without compiling, and a different input compiles', async () => {
  const doc0 = await freshDoc();
  const c = getCore();
  let compiles = 0;
  const manager = new StudioCompileManager(c, {debounceMs: 0, cache: new LRUCache(10), onCompile: () => compiles++});
  const run = (doc, scheme = 'document') => new Promise(resolve => manager.schedule(doc, scheme, (res, meta) => resolve({res, meta})));
  const first = await run(doc0);
  const again = await run(JSON.parse(JSON.stringify(doc0)));
  assert.equal(compiles, 1);
  assert.equal(again.meta.fromCache, true);
  assert.equal(again.res.html, first.res.html);
  await run(doc0, 'dark');
  assert.equal(compiles, 2, 'a different color scheme is a different key');
});

test('in-flight dedupe: the same key requested while compiling shares one compile', async () => {
  const doc0 = await freshDoc();
  let compiles = 0;
  const slow = async () => { compiles++; await sleep(40); return {ok: true, html: '<p>done</p>', warnings: []}; };
  const manager = new StudioCompileManager(null, {debounceMs: 0, compile: slow, engineVersion: 'test/1', cache: new LRUCache(10)});
  const delivered = [];
  manager.schedule(doc0, 'document', (res, meta) => delivered.push({res, meta, who: 'first'}));
  await sleep(5);
  manager.schedule({...doc0}, 'document', (res, meta) => delivered.push({res, meta, who: 'second'}));
  await sleep(120);
  assert.equal(compiles, 1, 'second request joins the in-flight compile');
  assert.deepEqual(delivered.map(d => [d.who, d.meta.fromCache]), [['second', true]], 'only the newest request is delivered and it did not compile');
});

test('stale responses: a slow older compile never overwrites a newer result (real schedule path)', async () => {
  const doc0 = await freshDoc();
  const delays = {'edit-1': 80, 'edit-2': 5};
  const compile = async doc => { await sleep(delays[doc.name]); return {ok: true, html: `<p>${doc.name}</p>`, warnings: []}; };
  const manager = new StudioCompileManager(null, {debounceMs: 0, compile, engineVersion: 'test/1', cache: new LRUCache(10)});
  const delivered = [];
  manager.schedule({...doc0, name: 'edit-1'}, 'document', res => delivered.push(res.html));
  await sleep(10);
  manager.schedule({...doc0, name: 'edit-2'}, 'document', res => delivered.push(res.html));
  await sleep(150);
  assert.deepEqual(delivered, ['<p>edit-2</p>']);
});

test('cancel drops both the pending debounce and an already running compile', async () => {
  const doc0 = await freshDoc();
  let compiles = 0;
  const compile = async () => { compiles++; await sleep(30); return {ok: true, html: '<p>x</p>', warnings: []}; };
  const manager = new StudioCompileManager(null, {debounceMs: 20, compile, engineVersion: 'test/1', cache: new LRUCache(10)});
  const delivered = [];
  manager.schedule(doc0, 'document', res => delivered.push(res));
  manager.cancel();
  await sleep(80);
  assert.equal(compiles, 0, 'debounced request never starts');
  const m2 = new StudioCompileManager(null, {debounceMs: 0, compile, engineVersion: 'test/1', cache: new LRUCache(10)});
  m2.schedule(doc0, 'document', res => delivered.push(res));
  await sleep(10);
  m2.cancel();
  await sleep(80);
  assert.equal(delivered.length, 0, 'running compile result is dropped after cancel');
});

test('a thrown compile becomes a diagnostic and is not cached', async () => {
  const doc0 = await freshDoc();
  let attempts = 0;
  const compile = () => { attempts++; if (attempts === 1) throw new Error('boom'); return {ok: true, html: '<p>ok</p>', warnings: []}; };
  const cache = new LRUCache(10);
  const manager = new StudioCompileManager(null, {debounceMs: 0, compile, engineVersion: 'test/1', cache});
  const run = () => new Promise(resolve => manager.schedule(doc0, 'document', res => resolve(res)));
  const first = await run();
  assert.equal(first.ok, false);
  assert.equal(first.errors[0].code, 'INTERNAL');
  assert.equal(cache.size, 0);
  assert.equal((await run()).ok, true);
});

test('preview and HTML export share one cache entry and export bytes equal an uncached compile', async () => {
  const doc0 = await freshDoc('saas-landing');
  const c = getCore();
  studioCompileCache.clear();
  let compiles = 0;
  const manager = new StudioCompileManager(c, {debounceMs: 0, onCompile: () => compiles++});
  const preview = await new Promise(resolve => manager.schedule(doc0, 'document', res => resolve(res)));
  assert.equal(compiles, 1);
  const exported = htmlText(c, doc0);
  assert.equal(compiles, 1, 'export reuses the preview compile');
  assert.equal(exported.ok, true);
  assert.equal(exported.html, preview.html);
  assert.equal(sha(exported.html), sha(coreCompile(c)(doc0, 'document').html), 'identical to an uncached compile');
  assert.equal(compileBlueprintWithCache(c, doc0, 'document').fromCache, true);
  assert.equal(engineVersionOf(c), `${c.service.PLATFORM_CONTRACT_VERSION}/${c.service.CONTRACT_VERSION}`);
});

test('엔진 버전은 공개 진입점의 PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION이고, 둘 중 하나가 바뀌면 캐시 키가 바뀐다 (CONTRACTS §5.2)', async () => {
  const c = await loadCore();
  const {PLATFORM_CONTRACT_VERSION: platform, CONTRACT_VERSION: service} = c.service;
  assert.match(platform, /^\d+\.\d+\.\d+$/);
  assert.equal(engineVersionOf(c), `${platform}/${service}`);
  const fake = (p, s) => ({service: {PLATFORM_CONTRACT_VERSION: p, CONTRACT_VERSION: s}});
  const doc = {version: '2.0', catalogVersion: '2.6.0', theme: 'workspace', palette: 'slate', mode: 'light', tree: {type: 'page', children: []}};
  const key = core => computeCacheKey(engineVersionOf(core), '2.6.0', doc, 'light');
  const base = key(fake('0.8.0', '1.3.0'));
  assert.equal(key(fake('0.8.0', '1.3.0')), base, '같은 버전이면 같은 키');
  assert.notEqual(key(fake('0.9.0', '1.3.0')), base, 'platform 계약 버전이 바뀌면 키가 바뀐다');
  assert.notEqual(key(fake('0.8.0', '1.4.0')), base, '서비스 계약 버전이 바뀌면 키가 바뀐다');
  assert.notEqual(key(fake(undefined, '1.3.0')), base, 'platform 계약 버전을 읽지 못하면 정상 버전의 키와 섞이지 않는다');
  // 매니저가 실제로 쓰는 키: 계약 버전이 다른 두 매니저는 같은 캐시를 공유해도 서로의 결과를 재사용하지 않는다.
  const cache = new LRUCache(10);
  let compiles = 0;
  const compile = () => { compiles++; return {ok: true, html: '<p>' + compiles + '</p>', warnings: []}; };
  const run = async version => {
    const m = new StudioCompileManager(null, {debounceMs: 0, compile, engineVersion: engineVersionOf(fake(version, '1.3.0')), cache});
    return new Promise(resolve => m.schedule(doc, 'document', resolve));
  };
  await run('0.8.0');
  await run('0.8.0');
  assert.equal(compiles, 1, '같은 계약 버전은 재사용');
  await run('0.9.0');
  assert.equal(compiles, 2, '계약 버전이 바뀌면 다시 컴파일');
});

// ---- 후보 탐색 재사용은 판정을 바꾸지 않는다 ------------------------------------------------------------------------

const ser = value => JSON.stringify(value, (_k, v) => (v instanceof Map ? [...v] : v));

/** 문서를 한 필드씩 모든 값으로 바꿔 본다. 키가 같은 문서끼리는 판정 결과가 같아야 하고, 키가 다르면 다시 판정한다. */
function* variantsOf(c, d0, {paletteStep = 1} = {}) {
  const catalog = loadCatalog(c);
  const types = c.service.getTypePresets().value.presets.map(x => x.id);
  const profiles = c.service.getSchema({target: 'blueprint', fields: ['profile']}).value.properties.profile.enum;
  const colors = c.service.getColorTokens().value.options.map(x => x.id);
  for (const [i, p] of catalog.palettes.entries()) {
    if (i % paletteStep) continue;
    const r = c.edit.applyOp(d0, 'setPalette', {palette: p.id});
    if (r.ok) yield {field: 'palette', name: `palette=${p.id}`, doc: r.doc};
  }
  for (const axis of catalog.axes) for (const v of axis.values) {
    const r = axis.axis === 'mode' ? c.edit.applyOp(d0, 'setAppearance', {mode: v}) : c.edit.applyOp(d0, 'setAppearance', {axes: {[axis.axis]: v}});
    if (r.ok) yield {field: axis.axis, name: `${axis.axis}=${v}`, doc: r.doc};
  }
  for (const [field, values] of [['typeRoles', types], ['profile', profiles], ['colorPalette', colors]]) {
    for (const v of ['', ...values]) {
      const doc = {...d0};
      if (v === '') delete doc[field]; else doc[field] = v;
      yield {field, name: `${field}=${v || '(none)'}`, doc};
    }
  }
}

test('exploration reuse is sound: whenever the key is equal, the Core verdicts are equal (real Core sweep)', async () => {
  await loadCore();
  const c = getCore();
  const catalog = loadCatalog(c);
  const types = c.service.getTypePresets().value.presets.map(x => x.id);
  const profiles = c.service.getSchema({target: 'blueprint', fields: ['profile']}).value.properties.profile.enum;
  const colors = c.service.getColorTokens().value.options.map(x => x.id);
  const trialGroups = {
    colorTrials: d => candidateTrials(c, d, 'colorPalette', colors, d.catalogVersion !== '2.6.0'),
    typeTrials: d => candidateTrials(c, d, 'typeRoles', types, true),
    profileTrials: d => candidateTrials(c, d, 'profile', profiles, true),
  };
  const slots = template => layoutSlotsOf(c, template).filter(s => s.options.length > 1);
  let reusedChecks = 0, recomputedChecks = 0;
  const seenKeyChange = new Set();
  for (const template of PROFILE_TEMPLATES) {
    const d0 = await freshDoc(template, {colorPalette: colors[0], typeRoles: types[0], profile: 'erp'});
    const ref = Object.fromEntries(Object.entries(trialGroups).map(([g, f]) => [g, ser(f(d0))]));
    for (const v of variantsOf(c, d0)) {
      for (const [group, f] of Object.entries(trialGroups)) {
        if (explorationKey(v.doc, group) === explorationKey(d0, group)) {
          reusedChecks++;
          assert.equal(ser(f(v.doc)), ref[group], `${template}: ${group} verdicts changed for ${v.name} although the key is equal`);
        } else {
          recomputedChecks++;
          if (ser(f(v.doc)) !== ref[group]) seenKeyChange.add(`${group}<-${v.field}`);
        }
      }
    }
    // 판정이 읽는 필드가 바뀌면 키도 바뀌어 다시 판정한다(생략하지 않는다).
    const docProfile = {...d0, profile: profiles[3]};
    for (const g of ['colorTrials', 'typeTrials']) assert.notEqual(explorationKey(docProfile, g), explorationKey(d0, g), `${g} must be re-run when profile changes`);
    assert.notEqual(explorationKey({...d0, mode: 'dark'}, 'profileTrials'), explorationKey(d0, 'profileTrials'));
    assert.notEqual(explorationKey({...d0, typography: 'mono'}, 'profileTrials'), explorationKey(d0, 'profileTrials'));
    assert.notEqual(explorationKey({...d0, colorPalette: undefined}, 'typeTrials'), explorationKey(d0, 'typeTrials'));
  }
  assert.ok(reusedChecks > 400, `the sweep must actually exercise reuse (${reusedChecks})`);
  assert.ok(recomputedChecks > 0);
  // 과거 구현이 틀렸던 지점: 이 필드들은 실제로 판정을 바꾼다. 키가 이를 반영하지 않으면 위 단언이 먼저 깨진다.
  for (const expected of ['colorTrials<-profile', 'typeTrials<-profile', 'profileTrials<-mode', 'profileTrials<-typography']) {
    assert.ok(seenKeyChange.has(expected), `expected the Core to change ${expected}`);
  }
  assert.equal(catalog.axes.some(a => a.axis === 'mode'), true);
});

test('design choices (palette/axis/mode/theme/layout verdicts): equal key means equal verdicts (real Core sweep)', async () => {
  await loadCore();
  const c = getCore();
  const catalog = loadCatalog(c);
  const types = c.service.getTypePresets().value.presets.map(x => x.id);
  let reused = 0;
  const changedBy = new Set();
  for (const template of PROFILE_TEMPLATES.slice(0, 2)) {
    const d0 = await freshDoc(template, {colorPalette: 'static-kit', typeRoles: types[0], profile: 'erp'});
    const slots = layoutSlotsOf(c, template).filter(s => s.options.length > 1);
    const ref = ser(designChoices(c, d0, 'keep', slots));
    for (const v of variantsOf(c, d0, {paletteStep: 40})) {
      const verdict = ser(designChoices(c, v.doc, 'keep', slots));
      if (explorationKey(v.doc, 'choices') === explorationKey(d0, 'choices')) {
        reused++;
        assert.equal(verdict, ref, `${template}: choices changed for ${v.name} although the key is equal`);
      } else if (verdict !== ref) changedBy.add(v.field);
    }
  }
  assert.ok(reused > 30, `the sweep must exercise reuse (${reused})`);
  // 판정을 실제로 바꾸는 필드는 키에 남아 있어야 한다(위 단언이 이를 강제한다). 대표 필드가 정말 바꾸는지도 확인한다.
  for (const field of ['profile', 'mode', 'shell']) assert.ok(changedBy.has(field), `${field} should change the choices (${[...changedBy]})`);
  assert.ok(STYLE_AXIS_FIELDS.every(f => catalog.axes.some(a => a.axis === f)), 'STYLE_AXIS_FIELDS lists real catalog axes');
  assert.ok(catalog.axes.filter(a => a.axis !== 'mode').every(a => STYLE_AXIS_FIELDS.includes(a.axis)), 'every catalog style axis is listed');
});
