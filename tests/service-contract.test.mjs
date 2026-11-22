import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import * as service from '../src/service/index.mjs';
import {listCatalog, getSchema, getComponentSpec, validateBlueprint, compileBlueprint, explainDecisions, catalogSnapshot, CATALOG_KINDS, CONTRACT_VERSION, HINTS, DEFAULT_HINT} from '../src/service/index.mjs';
import {CATALOG_VERSION, createBlueprint, rules, nodeTypes, templateList, themes, palettes, axisBans, pageTypes, blueprintSchema} from '../src/catalog.mjs';
import {setTheme, setAppearance} from '../src/edit/index.mjs';
import {validateBlueprint as coreValidate} from '../src/validate.mjs';

const root = resolve(import.meta.dirname, '..');
const diagnosticFields = e => { for (const k of ['code', 'path', 'message', 'hint']) assert.ok(typeof e[k] === 'string' && e[k].length > 0, `${k} missing in ${JSON.stringify(e)}`); assert.match(e.code, /^[A-Z][A-Z0-9_]*$/); assert.match(e.path, /^\$/); };
const envelope = r => {
  assert.equal(r.catalogVersion, CATALOG_VERSION); assert.equal(r.contractVersion, CONTRACT_VERSION);
  assert.ok(Array.isArray(r.warnings)); r.warnings.forEach(diagnosticFields);
  if (r.ok) { assert.deepEqual(Object.keys(r), ['ok', 'value', 'warnings', 'catalogVersion', 'contractVersion']); }
  else { assert.deepEqual(Object.keys(r), ['ok', 'errors', 'warnings', 'catalogVersion', 'contractVersion']); assert.ok(r.errors.length > 0); r.errors.forEach(diagnosticFields); }
  JSON.stringify(r);
  return r;
};
const deepFrozenAnywhere = x => x !== null && typeof x === 'object' && (Object.isFrozen(x) || Object.values(x).some(deepFrozenAnywhere));

test('the service exposes the six functions of 03-interfaces 1.4 plus catalogSnapshot, assembleBlueprint (2.6.0 profiles) and the read-only queryMaterials, and nothing else callable', () => {
  const fns = Object.entries(service).filter(([, v]) => typeof v === 'function').map(([k]) => k).sort();
  assert.deepEqual(fns, ['applyEdit', 'assembleBlueprint', 'assembleDesign', 'catalogSnapshot', 'checkCompatibility', 'compileBlueprint', 'diagnostic', 'explainDecisions', 'getColorTokens', 'getComponentSpec', 'getMaterial', 'getPlatformMaterial', 'getSchema', 'getTypePresets', 'hintFor', 'listCatalog', 'listEditOps', 'listMaterials', 'listPlatformMaterials', 'queryMaterials', 'recommendMaterials', 'validateBlueprint', 'withHint']); // assembleDesign·플랫폼 재료 질의 4개는 src/service/assemble-design.mjs·platform-materials.mjs(계약 1.2.0, 추가만), getColorTokens·getMaterial·getTypePresets·listMaterials는 src/service/materials.mjs, queryMaterials는 Materials 화면용 src/service/materials-query.mjs
  assert.equal(CONTRACT_VERSION, '1.2.0');
});

test('every function returns the same envelope for success and for failure, carrying catalogVersion and contractVersion', () => {
  const bp = createBlueprint('saas-landing'), bad = {...bp, theme: 'nope'};
  for (const r of [listCatalog({kind: 'themes'}), getSchema({target: 'chrome'}), getComponentSpec({type: 'hero'}), validateBlueprint(bp), compileBlueprint(bp, {include: ['manifest']}), explainDecisions({blueprint: bp})]) assert.equal(envelope(r).ok, true);
  for (const r of [listCatalog({kind: 'x'}), getSchema({target: 'x'}), getComponentSpec({type: 'x'}), validateBlueprint(bad), compileBlueprint(bad), explainDecisions({blueprint: bad}), explainDecisions({})]) assert.equal(envelope(r).ok, false);
});

test('functions never throw on hostile input: they answer ok:false with a structured error', () => {
  const cyc = {}; cyc.self = cyc;
  const inputs = [undefined, null, 0, 'x', [], cyc, {__proto__: null}, () => 1, Symbol.iterator.description, {kind: 5}, {type: {}}, {target: []}, 1n];
  for (const input of inputs) {
    for (const fn of [listCatalog, getSchema, getComponentSpec, validateBlueprint, compileBlueprint, explainDecisions, service.listMaterials, service.getMaterial, service.getColorTokens, service.getTypePresets]) {
      let r; assert.doesNotThrow(() => { r = fn(input); }, `${fn.name}(${typeof input})`);
      envelope(r);
    }
  }
  assert.equal(validateBlueprint(createBlueprint('login'), 5).errors[0].code, 'BAD_REQUEST');
  assert.equal(compileBlueprint(createBlueprint('login'), {include: ['nope']}).errors[0].path, '$args.opts.include');
});

test('listCatalog: partial queries by kind, filter, query, fields and paging; never the whole catalog', () => {
  assert.deepEqual([...CATALOG_KINDS].sort(), ['axes', 'axisBans', 'components', 'concepts', 'icons', 'layoutSlots', 'pageTypes', 'palettes', 'recipes', 'rules', 'templates', 'themes']);
  const all = listCatalog({kind: 'templates', limit: 200}).value;
  assert.equal(all.total, templateList.length); assert.equal(all.items.length, templateList.length); assert.equal(all.nextCursor, null);
  assert.deepEqual(Object.keys(all.items[0]), ['id', 'label', 'pageType', 'theme', 'layoutSlotCount', 'recipe']);
  assert.deepEqual(all.items.map(t => t.id), templateList.map(t => t.id), 'catalog declaration order');
  // filter
  const landing = listCatalog({kind: 'templates', filter: {pageType: 'landing'}, limit: 200}).value;
  assert.ok(landing.total > 5 && landing.total < templateList.length && landing.items.every(t => t.pageType === 'landing'));
  assert.equal(landing.total, templateList.filter(t => t.pageType === 'landing').length);
  // fields: identifier always included, requested fields in the answer
  const slim = listCatalog({kind: 'palettes', filter: {family: 'blue'}, fields: ['colors'], limit: 3}).value;
  assert.deepEqual(Object.keys(slim.items[0]), ['id', 'colors']); assert.ok(slim.items.length === 3 && slim.total > 3);
  assert.deepEqual(Object.keys(listCatalog({kind: 'components', fields: ['optional']}).value.items[0]), ['type', 'optional']);
  // query: whitespace-separated AND over id/label/name
  const q = listCatalog({kind: 'templates', query: 'SaaS  landing'}).value;
  assert.ok(q.items.some(t => t.id === 'saas-landing')); assert.ok(q.items.every(t => /saas/i.test(t.id + t.label) && /landing/i.test(t.id + t.label)), 'every word must match (AND)');
  assert.equal(listCatalog({kind: 'templates', query: 'SAAS-LANDING'}).value.items[0].id, 'saas-landing', 'case-insensitive');
  assert.equal(listCatalog({kind: 'templates', query: 'zzzz-no-match'}).value.total, 0);
  // paging walks every row exactly once
  const seen = []; let cursor;
  for (let i = 0; i < 20; i++) { const p = listCatalog({kind: 'palettes', limit: 200, cursor}).value; seen.push(...p.items.map(x => x.id)); if (!(cursor = p.nextCursor)) break; }
  assert.deepEqual(seen, Object.keys(palettes)); assert.equal(new Set(seen).size, seen.length);
  // layoutSlots needs a template
  const slots = listCatalog({kind: 'layoutSlots', filter: {template: 'saas-landing'}}).value;
  assert.ok(slots.items.some(s => s.id === 'hero' && s.optionIds.includes('product')));
  assert.equal(listCatalog({kind: 'layoutSlots'}).errors[0].path, '$args.filter.template');
  // the default page of a big kind is much smaller than the catalog
  assert.ok(JSON.stringify(listCatalog({kind: 'palettes'})).length < 20_000);
  assert.ok(JSON.stringify(listCatalog({kind: 'palettes', limit: 200})).length < JSON.stringify(catalogSnapshot()).length / 10);
});

test('listCatalog: wrong arguments are named, with a hint that says what is allowed', () => {
  const cases = [
    [{kind: 'nope'}, 'UNKNOWN_KIND', '$args.kind'], [{}, 'UNKNOWN_KIND', '$args.kind'],
    [{kind: 'templates', filter: {colour: 'x'}}, 'BAD_REQUEST', '$args.filter.colour'], [{kind: 'templates', filter: {theme: 'nope'}}, 'UNKNOWN_THEME', '$args.filter.theme'],
    [{kind: 'recipes', filter: {template: 'nope'}}, 'UNKNOWN_TEMPLATE', '$args.filter.template'], [{kind: 'axisBans', filter: {axis: 'nope'}}, 'UNKNOWN_AXIS', '$args.filter.axis'],
    [{kind: 'templates', fields: ['secret']}, 'BAD_REQUEST', '$args.fields[0]'], [{kind: 'templates', fields: []}, 'BAD_REQUEST', '$args.fields'],
    [{kind: 'templates', limit: 0}, 'BAD_REQUEST', '$args.limit'], [{kind: 'templates', limit: 201}, 'BAD_REQUEST', '$args.limit'], [{kind: 'templates', limit: 1.5}, 'BAD_REQUEST', '$args.limit'],
    [{kind: 'templates', cursor: 'abc'}, 'BAD_REQUEST', '$args.cursor'], [{kind: 'templates', query: 5}, 'BAD_REQUEST', '$args.query'], [{kind: 'templates', extra: 1}, 'BAD_REQUEST', '$args.extra'],
  ];
  for (const [q, code, path] of cases) { const r = envelope(listCatalog(q)); assert.equal(r.errors[0].code, code, JSON.stringify(q)); assert.equal(r.errors[0].path, path, JSON.stringify(q)); }
  assert.match(listCatalog({kind: 'nope'}).errors[0].hint, /templates/);
  assert.match(listCatalog({kind: 'templates', fields: ['secret']}).errors[0].hint, /pageType/);
});

test('getSchema: blueprint, component, chrome, diagnostic and edit-ops, with partial blueprint schemas and the runtime-rules note', () => {
  const full = getSchema({target: 'blueprint'}).value;
  const {$defs, properties, required, ...rest} = blueprintSchema();
  assert.deepEqual({...full, 'x-runtimeRules': undefined}, {...rest, $defs, properties, required, 'x-runtimeRules': undefined}, 'blueprint = blueprintSchema()');
  assert.ok(full['x-runtimeRules'].some(x => /^R09: AXIS_BAN/.test(x)));
  assert.ok(full['x-runtimeRules'].some(x => /^R21:/.test(x)) && full['x-runtimeRules'].some(x => /^R22:/.test(x)));
  assert.equal(full['x-runtimeRules'].length, rules.length + 2);
  const part = getSchema({target: 'blueprint', fields: ['theme', 'mode']}).value;
  assert.deepEqual(Object.keys(part.properties), ['theme', 'mode']); assert.deepEqual(part.required, ['theme', 'mode']); assert.equal(part.$defs, undefined);
  assert.ok(JSON.stringify(part).length < 5_000 && JSON.stringify(full).length > 50_000);
  const withTree = getSchema({target: 'blueprint', fields: ['tree']}).value;
  assert.ok(withTree.$defs.page && withTree.$defs.hero);
  const hero = getSchema({target: 'component', type: 'hero'}).value;
  assert.equal(hero.properties.type.const, 'hero'); assert.ok(hero.properties.variant && hero.required.includes('title'));
  assert.deepEqual(Object.keys(getSchema({target: 'component', type: 'hero', fields: ['variant']}).value.properties), ['variant']);
  assert.ok(getSchema({target: 'chrome'}).value.properties.nav);
  const diag = getSchema({target: 'diagnostic'}).value; assert.deepEqual(diag.required, ['code', 'path', 'message', 'hint']);
  assert.ok(getSchema({target: 'edit-ops'}).value.items.properties.op.enum.includes('setTheme'));
  for (const [q, code, path] of [[{target: 'component'}, 'BAD_REQUEST', '$args.type'], [{target: 'component', type: 'nope'}, 'UNKNOWN_COMPONENT', '$args.type'], [{target: 'blueprint', type: 'hero'}, 'BAD_REQUEST', '$args.type'],
    [{target: 'blueprint', fields: ['nope']}, 'BAD_REQUEST', '$args.fields[0]'], [{target: 'diagnostic', fields: ['x']}, 'BAD_REQUEST', '$args.fields'], [{}, 'BAD_REQUEST', '$args.target']]) {
    const r = envelope(getSchema(q)); assert.equal(r.errors[0].code, code); assert.equal(r.errors[0].path, path);
  }
  // 반환값을 고쳐도 카탈로그나 다음 응답이 달라지지 않는다
  full.properties.theme.enum.length = 0; assert.ok(getSchema({target: 'blueprint'}).value.properties.theme.enum.length > 10);
});

test('getComponentSpec: spec for every component, derived only from the catalog, with partial field selection', () => {
  for (const type of nodeTypes) {
    const r = envelope(getComponentSpec({type})); assert.equal(r.ok, true, type);
    assert.deepEqual(Object.keys(r.value), ['type', 'label', 'group', 'fields', 'required', 'optional', 'children', 'example', 'pageTypes', 'rules']);
    assert.equal(r.value.type, type); assert.ok(r.value.required.includes('type'));
  }
  const hero = getComponentSpec({type: 'hero'}).value;
  assert.equal(hero.children, null); assert.deepEqual(hero.pageTypes.requiredBy, ['landing']); assert.ok(hero.pageTypes.forbiddenIn.includes('dashboard'));
  assert.ok(hero.rules.includes('C15') && hero.rules.includes('V01'));
  const section = getComponentSpec({type: 'section'}).value;
  assert.ok(section.children.allowed.includes('card') && section.children.min === 1 && section.children.max === 12);
  assert.deepEqual(Object.keys(getComponentSpec({type: 'hero', fields: ['rules', 'label']}).value), ['type', 'label', 'rules']);
  for (const [q, code, path] of [[{type: 'nope'}, 'UNKNOWN_COMPONENT', '$args.type'], [{}, 'BAD_REQUEST', '$args.type'], [{type: 'hero', fields: ['colour']}, 'BAD_REQUEST', '$args.fields[0]'], [{type: 'hero', fields: 'rules'}, 'BAD_REQUEST', '$args.fields']]) {
    const r = envelope(getComponentSpec(q)); assert.equal(r.errors[0].code, code); assert.equal(r.errors[0].path, path);
  }
  // 빠진 페이지 유형 계약(error 유형은 forbid 대신 allow)에도 던지지 않는다
  assert.equal(getComponentSpec({type: 'empty-state'}).ok, true);
});

test('results are fresh, unfrozen, JSON-serializable objects (the catalog itself is deeply frozen)', () => {
  const bp = createBlueprint('saas-landing');
  for (const r of [listCatalog({kind: 'themes', fields: ['defaults', 'forbid', 'variants']}), listCatalog({kind: 'layoutSlots', filter: {template: 'saas-landing'}, fields: ['options']}), listCatalog({kind: 'axes', fields: ['descriptions']}), getSchema({target: 'blueprint'}),
    getSchema({target: 'chrome'}), getComponentSpec({type: 'hero'}), compileBlueprint(bp), explainDecisions({blueprint: bp}, {level: 'full'})]) {
    assert.equal(deepFrozenAnywhere(r), false); assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
  }
  assert.equal(deepFrozenAnywhere(catalogSnapshot()), false);
  assert.ok(Object.isFrozen(themes.workspace), 'precondition: catalog objects are frozen');
});

test('same input, same output (no time, randomness or hidden state)', () => {
  const bp = createBlueprint('pricing-page');
  for (const call of [() => listCatalog({kind: 'palettes', limit: 20}), () => getSchema({target: 'blueprint'}), () => validateBlueprint(bp), () => compileBlueprint(bp), () => explainDecisions({blueprint: bp}, {level: 'full'})]) assert.deepEqual(call(), call());
});

test('validateBlueprint: valid documents pass; the input is never modified', () => {
  for (const t of templateList) {
    const bp = createBlueprint(t.id), before = JSON.stringify(bp);
    const r = validateBlueprint(bp); assert.deepEqual(r.value, {valid: true}, t.id); assert.equal(JSON.stringify(bp), before);
  }
});

test('validateBlueprint: errors are the validator\'s own, in the same order, with hint, rule and fix added', () => {
  const bp = createBlueprint('saas-landing'); bp.elevation = 'glow'; bp.mode = 'light'; bp.tree.children[1].style = 'x'; bp.theme = 'civic';
  const core = coreValidate(bp).errors, r = validateBlueprint(bp);
  assert.equal(r.ok, false); assert.deepEqual(r.errors.map(({code, path, message}) => ({code, path, message})), core.map(({code, path, message}) => ({code, path, message})));
  r.errors.forEach(diagnosticFields);
  const ban = r.errors.find(e => e.code === 'AXIS_BAN'), forbid = r.errors.find(e => e.code === 'THEME_FORBID'), unknown = r.errors.find(e => e.code === 'UNKNOWN_KEY');
  assert.deepEqual(ban.fix, {elevation: 'soft'}); assert.equal(ban.rule, 'X05');
  assert.deepEqual(forbid.fix, {elevation: themes.civic.defaults.elevation}); assert.equal(forbid.rule, 'R10');
  assert.equal(unknown.rule, 'R01'); assert.equal(unknown.hint, HINTS.UNKNOWN_KEY); assert.equal(unknown.fix, undefined);
  // 모든 금지 조합의 fix는 카탈로그의 fix와 같다 (메시지 문장을 파싱하지 않는다)
  for (const b of axisBans) assert.ok(b.fix && Object.keys(b.fix).length);
});

test('validateBlueprint: opts.catalogVersion pins the expected version', () => {
  const bp = createBlueprint('login');
  assert.equal(validateBlueprint(bp, {catalogVersion: CATALOG_VERSION}).ok, true);
  const unsupported = validateBlueprint(bp, {catalogVersion: '9.9.9'}); assert.equal(unsupported.errors[0].code, 'UNSUPPORTED_VERSION'); assert.match(unsupported.errors[0].hint, new RegExp(CATALOG_VERSION));
  const mismatch = validateBlueprint(bp, {catalogVersion: '2.3.0'}); assert.equal(mismatch.errors[0].code, 'CATALOG_VERSION'); assert.equal(mismatch.errors[0].path, '$.catalogVersion');
  assert.equal(validateBlueprint(bp, {nope: 1}).errors[0].path, '$args.opts.nope');
});

test('size, JSON and shape failures come back as structured errors too', () => {
  const huge = {...createBlueprint('login'), name: 'x'.repeat(300_000)};
  assert.equal(validateBlueprint(huge).errors[0].code, 'SIZE');
  const cyc = {}; cyc.cyc = cyc; assert.equal(validateBlueprint(cyc).errors[0].code, 'JSON');
  assert.equal(validateBlueprint([]).errors[0].code, 'OBJECT'); assert.equal(validateBlueprint(undefined).errors[0].code, 'OBJECT');
  const v1 = {...createBlueprint('login'), version: '1.0'}; assert.ok(validateBlueprint(v1).errors.some(e => e.code === 'VERSION' && e.hint));
});

test('one code→hint table: the edit layer and the service answer with the same hint for the same code (D1)', () => {
  const doc = createBlueprint('saas-landing');
  const keep = setTheme(doc, {theme: 'console', axes: 'keep'}); assert.equal(keep.ok, true);
  const edit = setAppearance(keep.doc, {axes: {radius: 'bubble'}});
  assert.equal(edit.ok, false, 'precondition: the edit is refused by the validator');
  const serviceErrors = validateBlueprint({...keep.doc, radius: 'bubble'}).errors;
  const shared = edit.errors.filter(e => serviceErrors.some(s => s.code === e.code));
  assert.ok(shared.some(e => e.code === 'THEME_FORBID'), 'both layers saw THEME_FORBID');
  for (const e of shared) assert.equal(e.hint, serviceErrors.find(s => s.code === e.code).hint, e.code);
  for (const e of [...edit.errors, ...serviceErrors]) assert.equal(e.hint, HINTS[e.code] ?? DEFAULT_HINT);
  // edit/ops.mjs does not keep a table of its own
  assert.doesNotMatch(readFileSync(resolve(root, 'src/edit/ops.mjs'), 'utf8'), /const HINTS|DEFAULT_HINT =/);
});

test('the code table covers every code the validator and compiler can emit and every rule code, with no empty hint', () => {
  const sources = ['src/validate.mjs', 'src/compiler.mjs', 'src/composition.mjs'].map(f => readFileSync(resolve(root, f), 'utf8')).join('\n');
  const emitted = new Set([...sources.matchAll(/error\([^)]*?'([A-Z][A-Z_]{2,})'/g)].map(m => m[1]));
  assert.ok(emitted.size > 50, 'validator codes found: ' + emitted.size);
  for (const code of emitted) assert.ok(Object.hasOwn(HINTS, code), `${code} has no hint`);
  for (const r of rules) for (const code of r.codes) if (!['audit', 'check'].includes(code)) assert.ok(Object.hasOwn(HINTS, code), `rule ${r.id} code ${code} has no hint`);
  for (const code of ['BAD_REQUEST', 'UNKNOWN_KIND', 'UNKNOWN_TEMPLATE', 'UNKNOWN_THEME', 'UNKNOWN_PALETTE', 'UNKNOWN_COMPONENT', 'UNKNOWN_AXIS', 'CONTRAST_GATE', 'UNSUPPORTED_VERSION', 'INTERNAL']) assert.ok(HINTS[code], code);
  for (const [code, hint] of Object.entries(HINTS)) { assert.match(code, /^[A-Z][A-Z0-9_]*$/); assert.ok(typeof hint === 'string' && hint.length > 8, code); }
});

test('catalogSnapshot() serializes to the exact bytes of site/v1/catalog.json', () => {
  const file = readFileSync(resolve(root, 'site/v1/catalog.json'), 'utf8');
  assert.equal(JSON.stringify(catalogSnapshot(), null, 2) + '\n', file);
});

test('compat: the catalog counts the service reports match the catalog', () => {
  assert.equal(listCatalog({kind: 'themes'}).value.total, Object.keys(themes).length);
  assert.equal(listCatalog({kind: 'palettes'}).value.total, Object.keys(palettes).length);
  assert.equal(listCatalog({kind: 'components'}).value.total, nodeTypes.length);
  assert.equal(listCatalog({kind: 'pageTypes'}).value.total, Object.keys(pageTypes).length);
  assert.equal(listCatalog({kind: 'axisBans'}).value.total, axisBans.length);
  assert.equal(listCatalog({kind: 'rules'}).value.total, rules.length);
});
