import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleDesign, assembleBlueprint, compileBlueprint, validateBlueprint, explainDecisions, getSchema, listCatalog, CONTRACT_VERSION,
  listPlatformMaterials, getPlatformMaterial, recommendMaterials, checkCompatibility, listEditOps, applyEdit,
} from '../src/service/index.mjs';
import {createBlueprint, blueprintSchema, PLATFORM_CATALOG_VERSION, ACCEPTED_CATALOG_VERSIONS, BLUEPRINT_CATALOG_VERSIONS} from '../src/catalog/index.mjs';
import {migrateBlueprint} from '../src/catalog/index.mjs';

const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));
const DASH = {purpose: 'work-dashboard', candidates: 3, content: {title: '운영 현황', kpis: kpis(4), table: {title: '작업', columns: ['작업', '담당', '상태'], rows: [['a', 'b', 'c'], ['d', 'e', 'f']]}}};
const ALL = ['html', 'css', 'tokens', 'manifest', 'blueprint', 'script', 'standalone'];
const REQUESTS = {
  'work-dashboard': DASH,
  'saas-landing': {purpose: 'saas-landing', candidates: 2, content: {hero: {title: '제품을 빠르게', body: '소개', action: {label: '시작'}}, features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}, {title: 'C', body: 'c'}], status: {state: 'success', title: '저장했습니다'}}},
  'editorial-docs': {purpose: 'editorial-docs', candidates: 2, content: {title: '글', lead: '리드', sections: [{title: '하나', body: '본문'}]}},
  commerce: {purpose: 'commerce', candidates: 2, content: {title: '상품', products: [{title: '가', price: '1원', meta: '분류'}, {title: '나', price: '2원', meta: '분류'}]}},
};

test('assembleDesign answers in the service envelope and carries candidates with html, css, manifest, decisions and blocked', () => {
  const r = assembleDesign(DASH);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.match(r.contractVersion, /^1\.(?:[2-9]|\d{2,})\.\d+$/, 'service contract minor was raised for the new function');
  assert.equal(CONTRACT_VERSION, r.contractVersion);
  assert.deepEqual(Object.keys(r.value), ['selected', 'candidates', 'blocked', 'comparison', 'plan', 'decisions']);
  assert.equal(r.value.candidates.length, 3);
  assert.equal(r.value.selected, r.value.candidates[0].id);
  for (const c of r.value.candidates) {
    assert.deepEqual(Object.keys(c.value).sort(), ['blueprint', 'css', 'html', 'manifest', 'sizes', 'tokens']);
    assert.ok(c.value.html.includes('class="kit-shell"') && c.value.css.includes('--kit-canvas:'));
    assert.equal(c.value.sizes.html, new TextEncoder().encode(c.value.html).length);
    assert.ok(c.decisions.length >= 3 && c.decisions.every(d => Array.isArray(d.reasons)));
    assert.equal(c.relations.ok, true); assert.equal(c.quality.ok, true);
  }
  assert.ok(Array.isArray(r.value.blocked));
  assert.ok(r.value.decisions.some(d => d.slot.startsWith('layout.')));
  assert.equal(JSON.stringify(assembleDesign(structuredClone(DASH))), JSON.stringify(r), 'deterministic');
});

test('include picks what each candidate carries; script and standalone are opt-in; bad opts are BAD_REQUEST with the path', () => {
  const some = assembleDesign({...DASH, candidates: 1}, {include: ['manifest']});
  assert.deepEqual(Object.keys(some.value.candidates[0].value).sort(), ['manifest', 'sizes']);
  const all = assembleDesign({...DASH, candidates: 1}, {include: ALL});
  assert.match(all.value.candidates[0].value.standalone, /^<!doctype html>/);
  assert.ok(all.value.candidates[0].value.script.length > 100);
  for (const [opts, path] of [[{include: ['pdf']}, '$args.opts.include'], [{include: 'html'}, '$args.opts.include'], [{nope: 1}, '$args.opts.nope'], [3, '$args.opts']]) {
    const r = assembleDesign(DASH, opts);
    assert.equal(r.ok, false);
    assert.deepEqual([r.errors[0].code, r.errors[0].path], ['BAD_REQUEST', path]);
  }
  assert.equal(assembleDesign(null).errors[0].path, '$args');
  assert.equal(assembleDesign([]).errors[0].code, 'BAD_REQUEST');
});

test('failures carry code, path, message, hint and the alternatives as fix; the blocked reasons come back as info warnings', () => {
  const unknown = assembleDesign({purpose: 'blog'});
  assert.equal(unknown.ok, false);
  assert.deepEqual([unknown.errors[0].code, unknown.errors[0].path], ['P_PAGE_PURPOSE', '$.purpose']);
  assert.ok(unknown.errors[0].hint.length > 5);
  assert.deepEqual(unknown.errors[0].fix.alternatives, ['saas-landing', 'work-dashboard', 'editorial-docs', 'commerce']);
  const html = assembleDesign({purpose: 'work-dashboard', html: '<b>x</b>'});
  assert.equal(html.errors[0].code, 'P_REQUEST_KEY');
  const noSlot = assembleDesign({...DASH, components: [{base: 'base-component:card-surface', slot: 'header', content: {id: 'a', title: 'A', body: 'a'}}, {base: 'base-component:card-surface', content: {id: 'b', title: 'B', body: 'b'}}]});
  assert.equal(noSlot.errors[0].code, 'P_PAGE_SLOT');
  assert.ok(noSlot.errors[0].fix.alternatives.includes('insights'));
  // a requested material that cannot work: the failing reason is explained and the blocked entries are reported
  const light = assembleDesign({purpose: 'work-dashboard', mode: 'light', surface: 'surface:glow-glass', content: DASH.content});
  assert.equal(light.ok, false);
  assert.equal(light.errors[0].code, 'P_REL_FORBIDS');
  assert.match(light.errors[0].message, /X05/);
  for (const e of [...unknown.errors, ...light.errors]) assert.deepEqual(Object.keys(e).filter(k => ['code', 'path', 'message', 'hint'].includes(k)), ['code', 'path', 'message', 'hint']);
  const palette = assembleDesign({purpose: 'work-dashboard', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:premium-dark', content: DASH.content});
  assert.equal(palette.ok, false);
  assert.ok(palette.warnings.every(w => w.severity === 'info'));
});

test('every candidate of every purpose is stored as Blueprint 2.7.0 and compiles back to the same html, css and tokens', () => {
  for (const [purpose, request] of Object.entries(REQUESTS)) {
    const r = assembleDesign(request, {include: ALL});
    assert.equal(r.ok, true, `${purpose}: ${JSON.stringify(r.errors)}`);
    for (const c of r.value.candidates) {
      const bp = c.value.blueprint;
      assert.equal(bp.catalogVersion, PLATFORM_CATALOG_VERSION);
      assert.deepEqual(Object.keys(bp.materials).filter(k => ['palette', 'subtokenSet', 'typeSystem'].includes(k)), ['palette', 'subtokenSet', 'typeSystem']);
      const v = validateBlueprint(bp);
      assert.equal(v.ok, true, `${purpose}: ${JSON.stringify(v.errors)}`);
      assert.ok(v.warnings.some(w => w.code === 'PALETTE_IGNORED'), 'the legacy palette field is announced as unused');
      const k = compileBlueprint(bp, {include: ['html', 'css', 'tokens', 'manifest']});
      assert.equal(k.ok, true, `${purpose}: ${JSON.stringify(k.errors)}`);
      assert.equal(k.value.html, c.value.standalone, `${purpose} rank ${c.rank}: html`);
      assert.equal(k.value.css, c.value.css, `${purpose} rank ${c.rank}: css`);
      assert.deepEqual(k.value.tokens, c.value.tokens, `${purpose} rank ${c.rank}: tokens`);
      assert.equal(k.value.manifest.platform.materials.palette, bp.materials.palette);
      assert.equal(JSON.stringify(compileBlueprint(bp, {include: ['html', 'css']}).value), JSON.stringify(compileBlueprint(structuredClone(bp), {include: ['html', 'css']}).value), 'compile is deterministic');
    }
  }
});

test('Blueprint 2.7.0 gate: materials are refused below 2.7.0, cannot sit next to colorPalette, typeRoles or profile, and 2.7.0 without materials still compiles the old way', () => {
  const r = assembleDesign({...DASH, candidates: 1});
  const bp = r.value.candidates[0].value.blueprint;
  for (const version of ['2.4.0', '2.5.0', '2.6.0']) {
    const v = validateBlueprint({...bp, catalogVersion: version});
    assert.equal(v.ok, false, version);
    assert.ok(v.errors.some(e => e.code === 'VERSION_FIELD' && e.path === '$.materials'), `${version}: ${JSON.stringify(v.errors.slice(0, 3))}`);
    assert.equal(compileBlueprint({...bp, catalogVersion: version}).ok, false, version);
  }
  for (const [field, value] of [['colorPalette', 'static-kit'], ['typeRoles', 'erp'], ['profile', 'erp']]) {
    const v = validateBlueprint({...bp, [field]: value});
    assert.ok(v.errors.some(e => e.code === 'MATERIALS_CONFLICT' && e.path === `$.${field}`), field);
  }
  // 2.7.0 without materials is the 2.6.0 path: internal static-kit colors, the same engine
  const plain = createBlueprint('saas-landing');
  const at26 = compileBlueprint(migrateBlueprint(plain, '2.6.0'), {include: ['css']});
  const at27 = compileBlueprint({...migrateBlueprint(plain, '2.6.0'), catalogVersion: '2.7.0'}, {include: ['css']});
  assert.equal(at26.ok && at27.ok, true, JSON.stringify([at26.errors, at27.errors]));
  assert.equal(at27.value.css.replace('catalog 2.7.0', 'catalog 2.6.0'), at26.value.css, 'no materials: the old engine, byte for byte apart from the version comment');
  // the default schema and the pinned snapshot do not know 2.7.0; the 2.7.0 schema does
  assert.equal(ACCEPTED_CATALOG_VERSIONS.includes('2.7.0'), false);
  assert.deepEqual(BLUEPRINT_CATALOG_VERSIONS.at(-1), '2.7.0');
  assert.equal(blueprintSchema().properties.materials, undefined);
  assert.equal(getSchema({target: 'blueprint'}).value.properties.materials, undefined);
  const s = getSchema({target: 'blueprint', catalogVersion: '2.7.0'});
  assert.equal(s.ok, true);
  assert.equal(s.value.properties.materials['x-since'], '2.7.0');
  assert.equal(s.value.properties.materials['x-effect'], 'output');
  assert.equal(s.value.properties.profile['x-effect'], 'validation');
  assert.equal(s.value.properties.palette['x-effect'], 'none');
  assert.ok(s.value.properties.catalogVersion.enum.includes('2.7.0'));
  assert.equal(getSchema({target: 'blueprint', catalogVersion: '2.6.0'}).ok, false);
});

test('D1: changing only materials changes the 2.7.0 output; changing only profile or palette changes nothing (and says so)', () => {
  const r = assembleDesign({...DASH, candidates: 3});
  const [a, b] = r.value.candidates.map(c => c.value.blueprint);
  assert.notDeepEqual(a.materials, b.materials);
  const out = bp => compileBlueprint(bp, {include: ['html', 'css']}).value;
  assert.notEqual(out(a).css, out(b).css, 'a different selection is a different page');
  // swap one material at a time: each swap moves the output
  const swapped = (field, value) => out({...a, materials: {...a.materials, [field]: value}}).css;
  const base = out(a).css;
  const otherPalette = r.value.candidates.map(c => c.value.blueprint.materials.palette).find(p => p !== a.materials.palette);
  if (otherPalette) assert.notEqual(swapped('palette', otherPalette), base, 'palette');
  assert.notEqual(swapped('surface', a.materials.surface === 'surface:soft-layered' ? 'surface:tonal-sheet' : 'surface:soft-layered'), base, 'surface');
  // the legacy palette field changes nothing
  assert.equal(out({...a, palette: a.palette === 'ocean' ? 'pearl' : 'ocean'}).css, base);
  // 2.6.0 profile: no output effect, announced as info by validate and by explain
  const doc = assembleBlueprint({profile: 'erp'}).value.blueprint;
  const v = validateBlueprint(doc);
  const info = v.warnings.find(w => w.code === 'PROFILE_NO_OUTPUT_EFFECT');
  assert.ok(info && info.severity === 'info', JSON.stringify(v.warnings));
  assert.match(info.message, /출력에는 영향이 없어/);
  assert.ok(info.hint.length > 10);
  const {profile: _p, ...withoutProfile} = doc;
  assert.equal(JSON.stringify(compileBlueprint(withoutProfile, {include: ['html', 'css']}).value), JSON.stringify(compileBlueprint(doc, {include: ['html', 'css']}).value), 'the profile is a validation constraint: the output does not move');
  const ex = explainDecisions({blueprint: doc});
  assert.equal(ex.ok, true, JSON.stringify(ex.errors));
  assert.ok(ex.value.effects.some(e => e.field === 'profile' && e.effect === 'validation'));
  const exMaterials = explainDecisions({blueprint: a});
  assert.equal(exMaterials.ok, true, JSON.stringify(exMaterials.errors));
  assert.ok(exMaterials.value.effects.some(e => e.field === 'materials' && e.effect === 'output') && exMaterials.value.effects.some(e => e.field === 'palette' && e.effect === 'none'));
  assert.equal(exMaterials.value.contrast.pairs > 0, true);
});

test('D2: a 2.6.0 document whose palette is ignored because colorPalette decides the color gets PALETTE_IGNORED; documents without colorPalette and the pinned results are untouched', () => {
  const base = migrateBlueprint(createBlueprint('saas-landing'), '2.6.0');
  const without = validateBlueprint(base);
  assert.equal(without.warnings.some(w => w.code === 'PALETTE_IGNORED'), false, 'no colorPalette chosen: no warning (the default result is unchanged)');
  const withPalette = validateBlueprint({...base, colorPalette: 'static-kit'});
  const w = withPalette.warnings.find(x => x.code === 'PALETTE_IGNORED');
  assert.ok(w && w.path === '$.palette' && w.severity === 'warning', JSON.stringify(withPalette.warnings));
  assert.match(w.message, /colorPalette\(static-kit\)/);
  assert.equal(validateBlueprint({...base, colorPalette: 'static-kit'}).ok, true);
  // compile output is the same bytes with or without the warning (it is a diagnostic only)
  const a = compileBlueprint({...base, colorPalette: 'static-kit', palette: 'ocean'}, {include: ['html', 'css']});
  const b = compileBlueprint({...base, colorPalette: 'static-kit', palette: 'pearl'}, {include: ['html', 'css']});
  assert.equal(a.ok && b.ok, true);
  assert.equal(JSON.stringify(a.value), JSON.stringify(b.value), 'palette is ignored: the output does not move');
});

test('materials that do not resolve are compile errors with the material path and a hint', () => {
  const bp = assembleDesign({...DASH, candidates: 1}).value.candidates[0].value.blueprint;
  const compile = patch => compileBlueprint({...bp, materials: {...bp.materials, ...patch}});
  const unknown = compile({palette: 'palette:nope'});
  assert.deepEqual([unknown.ok, unknown.errors[0].code, unknown.errors[0].path], [false, 'MATERIALS_UNKNOWN', '$.materials.palette']);
  assert.ok(unknown.errors[0].hint.length > 5);
  assert.equal(compile({palette: 'subtoken-set:standard'}).errors[0].code, 'MATERIALS_KIND');
  assert.equal(compile({palette: 'not an id'}).errors[0].code, 'PATTERN');
  assert.equal(compile({typeSystem: 'type-system:mkt-launch', surface: 'surface:glow-glass'}).ok, false);
  const forbidden = compileBlueprint({...bp, mode: 'light', materials: {...bp.materials, surface: 'surface:glow-glass'}});
  assert.equal(forbidden.errors[0].code, 'MATERIALS_INCOMPATIBLE');
  assert.match(forbidden.errors[0].message, /X05/);
  const stateless = compileBlueprint({...bp, materials: {...bp.materials, states: [{id: 'state-pattern:empty-inline'}]}});
  assert.equal(stateless.errors[0].code, 'MATERIALS_STATE');
});

test('platform queries: list, get, recommend and check compatibility read the same registry and graph as assembly', () => {
  const list = listPlatformMaterials({kind: 'palette', limit: 3});
  assert.equal(list.ok, true);
  assert.equal(list.value.items.length, 3);
  assert.ok(list.value.total >= 9 && list.value.nextCursor === 'o3');
  assert.deepEqual(Object.keys(list.value.items[0]), ['id', 'kind', 'label', 'contexts', 'tags', 'quality']);
  const page2 = listPlatformMaterials({kind: 'palette', limit: 3, cursor: list.value.nextCursor});
  assert.notEqual(page2.value.items[0].id, list.value.items[0].id);
  assert.ok(listPlatformMaterials({}).value.byKind['state-pattern'] >= 8);
  assert.ok(listPlatformMaterials({kind: 'family', context: 'landing'}).value.items.every(m => m.contexts.includes('landing') || m.contexts.includes('any')));
  assert.deepEqual(listPlatformMaterials({query: 'static-kit', fields: ['label']}).value.items.map(m => m.id).includes('palette:static-kit'), true);
  const got = getPlatformMaterial({id: 'family:quiet'});
  assert.equal(got.ok, true);
  assert.equal(got.value.kind, 'family');
  assert.ok(got.value.edges.from.length > 0 && got.value.edges.from.every(e => e.reason));
  assert.ok(getPlatformMaterial({id: 'base-component:card-surface'}).value.render.export);
  assert.equal(getPlatformMaterial({id: 'family:nope'}).errors[0].code, 'UNKNOWN_MATERIAL');
  for (const bad of [{kind: 'nope'}, {fields: ['x']}, {limit: 0}, {cursor: 'z'}, {nope: 1}, {kind: 'palette', query: ''}]) assert.equal(listPlatformMaterials(bad).ok, false, JSON.stringify(bad));
  const rec = recommendMaterials({kind: 'palette', context: 'dashboard', mode: 'light'});
  assert.equal(rec.ok, true);
  assert.ok(rec.value.ranked.length > 3 && rec.value.ranked.every(r => typeof r.score === 'number'));
  const styled = recommendMaterials({kind: 'surface', context: 'dashboard', styleContext: 'style-context:ledger', mode: 'dark'});
  assert.ok(!styled.value.ranked.some(r => r.id === 'surface:glow-glass'), 'ledger bans glow');
  assert.ok(styled.value.blocked.some(b => b.id === 'surface:glow-glass'));
  assert.equal(recommendMaterials({kind: 'palette', mode: 'noon'}).errors[0].path, '$args.mode');
  assert.equal(recommendMaterials({kind: 'surface', styleContext: 'palette:static-kit'}).errors[0].code, 'UNKNOWN_MATERIAL');
  assert.equal(recommendMaterials({kind: 'surface', selected: ['x:y']}).errors[0].path, '$args.selected[0]');
  const ok = checkCompatibility({ids: ['palette:static-kit', 'subtoken-set:standard'], mode: 'light'});
  assert.equal(ok.value.ok, true);
  assert.ok(ok.value.checks.some(c => c.check === 'palette-subtoken' && c.ok));
  const bad = checkCompatibility({ids: ['axis-value:density.compact', 'axis-value:shell.dock']});
  assert.equal(bad.value.ok, false);
  assert.equal(bad.value.violations[0].code, 'P_REL_FORBIDS');
  assert.match(bad.value.violations[0].reason, /X01/);
  assert.equal(checkCompatibility({ids: ['palette:static-kit']}).errors[0].path, '$args.ids');
  assert.equal(checkCompatibility({ids: ['palette:static-kit', 'nope:x']}).errors[0].path, '$args.ids[1]');
});

test('edit service: operations apply in order, all or nothing, and never mutate the input document', () => {
  const ops = listEditOps();
  assert.ok(ops.value.ops.includes('setTheme') && ops.value.ops.includes('insertNode'));
  const bp = createBlueprint('saas-landing'), before = JSON.stringify(bp);
  const r = applyEdit({blueprint: bp, steps: [{op: 'setTheme', args: {theme: 'trust'}}]});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.value.blueprint.theme, 'trust');
  assert.equal(JSON.stringify(bp), before);
  assert.equal(validateBlueprint(r.value.blueprint).ok, true);
  const bad = applyEdit({blueprint: bp, steps: [{op: 'setTheme', args: {theme: 'trust'}}, {op: 'setTheme', args: {theme: 'nope'}}]});
  assert.equal(bad.ok, false);
  assert.equal(bad.errors[0].code, 'UNKNOWN_THEME');
  assert.ok(bad.errors[0].hint);
  for (const [req, path] of [[{blueprint: bp, steps: []}, '$args.steps'], [{blueprint: bp}, '$args.steps'], [{steps: [{op: 'x'}]}, '$args.blueprint'], [{blueprint: bp, steps: [{}]}, '$args.steps[0]'], [{blueprint: bp, steps: [{op: 'setTheme', extra: 1}]}, '$args.steps[0].extra'], [{blueprint: bp, steps: [{op: 'setTheme', args: 3}]}, '$args.steps[0].args']]) {
    const e = applyEdit(req);
    assert.deepEqual([e.ok, e.errors[0].path], [false, path], JSON.stringify(req).slice(0, 80));
  }
  assert.equal(applyEdit({blueprint: bp, steps: [{op: 'zzz'}]}).errors[0].code, 'UNKNOWN_OP');
  assert.equal(applyEdit({blueprint: bp, steps: Array(51).fill({op: 'setTheme', args: {theme: 'trust'}})}).errors[0].path, '$args.steps');
});

test('listCatalog and getSchema accept 2.7.0 as a version without changing the default answers', () => {
  const comps = listCatalog({kind: 'components', filter: {catalogVersion: '2.7.0'}, fields: ['type'], limit: 200});
  assert.equal(comps.ok, true, JSON.stringify(comps.errors));
  const at26 = listCatalog({kind: 'components', filter: {catalogVersion: '2.6.0'}, fields: ['type'], limit: 200});
  assert.deepEqual(comps.value.items, at26.value.items);
  assert.equal(listCatalog({kind: 'components', filter: {catalogVersion: '2.8.0'}}).ok, false);
});
