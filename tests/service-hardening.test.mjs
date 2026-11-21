import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listCatalog, getSchema, getComponentSpec, validateBlueprint, compileBlueprint, explainDecisions} from '../src/service/index.mjs';
import {createBlueprint} from '../src/catalog.mjs';

const bp = createBlueprint('saas-landing');
const manifest = compileBlueprint(bp, {include: ['manifest']}).value.manifest;
const mutated = f => { const m = structuredClone(manifest); f(m); return m; };
const ENGINE_TEXT = /Cannot read|is not a function|is not iterable|undefined|TypeError|Unexpected|not defined|null \(reading/;

test('explainDecisions({manifest}): a malformed manifest is BAD_REQUEST with the offending path, never INTERNAL and never an engine sentence', () => {
  const cases = [
    [m => { m.design.decisions = {}; }, '$args.subject.manifest.design.decisions'],
    [m => { m.design.decisions = [null]; }, '$args.subject.manifest.design.decisions[0]'],
    [m => { m.design.decisions[2].applied = 'C02'; }, '$args.subject.manifest.design.decisions[2].applied'],
    [m => { m.design.decisions[0].applied = ['C01', 7]; }, '$args.subject.manifest.design.decisions[0].applied'],
    [m => { delete m.design.decisions[0].applied; }, '$args.subject.manifest.design.decisions[0].applied'],
    [m => { m.design.decisions[1].path = 5; }, '$args.subject.manifest.design.decisions[1].path'],
    [m => { m.design.decisions[1].type = null; }, '$args.subject.manifest.design.decisions[1].type'],
    [m => { m.design.decisions[0].values = 'x'; }, '$args.subject.manifest.design.decisions[0].values'],
    [m => { m.design.decisions[0].sources = []; }, '$args.subject.manifest.design.decisions[0].sources'],
    [m => { m.design.decisions[0].coverage = 3; }, '$args.subject.manifest.design.decisions[0].coverage'],
    [m => { m.design.decisions[0].coverage.reason = {}; }, '$args.subject.manifest.design.decisions[0].coverage.reason'],
    [m => { m.design.inherited = 'x'; }, '$args.subject.manifest.design.inherited'],
    [m => { m.design.inherited = [1]; }, '$args.subject.manifest.design.inherited[0]'],
    [m => { m.design = null; }, '$args.subject.manifest.design'],
    [m => { m.design = []; }, '$args.subject.manifest.design'],
    [m => { m.design.page = null; }, '$args.subject.manifest.design.page'],
    [m => { m.design.page.decisions = 'x'; }, '$args.subject.manifest.design.page.decisions'],
    [m => { m.design.page.decisions = [{path: '$.tree'}]; }, '$args.subject.manifest.design.page.decisions[0].rule'],
    [m => { m.design.page.facts = 1; }, '$args.subject.manifest.design.page.facts'],
    [m => { m.contrast = 'x'; }, '$args.subject.manifest.contrast'],
    [m => { m.contrast[3] = null; }, '$args.subject.manifest.contrast[3]'],
    [m => { m.contrast[0].ratio = '14'; }, '$args.subject.manifest.contrast[0].ratio'],
    [m => { m.contrast[0].ratio = null; }, '$args.subject.manifest.contrast[0].ratio'],
    [m => { m.contrast[0].minimum = 0; }, '$args.subject.manifest.contrast[0].minimum'],
    [m => { m.contrast[0].name = 1; }, '$args.subject.manifest.contrast[0].name'],
    [m => { m.axes = []; }, '$args.subject.manifest.axes'],
    [m => { delete m.mode; }, '$args.subject.manifest.mode'],
    [m => { m.theme = 5; }, '$args.subject.manifest.theme'],
    [m => { delete m.catalogVersion; }, '$args.subject.manifest.catalogVersion'],
  ];
  assert.equal(explainDecisions({manifest}).ok, true, 'precondition: the pristine manifest is accepted');
  for (const [mutate, path] of cases) {
    for (const opts of [undefined, {level: 'full'}, {rule: 'C01'}, {path: '$.tree'}]) {
      const r = explainDecisions({manifest: mutated(mutate)}, opts);
      assert.equal(r.ok, false, path); assert.equal(r.errors[0].code, 'BAD_REQUEST', path + ' ' + JSON.stringify(r.errors[0])); assert.equal(r.errors[0].path, path);
      assert.doesNotMatch(JSON.stringify(r), ENGINE_TEXT, path); assert.ok(r.errors[0].hint);
    }
  }
  const cyclic = structuredClone(manifest); cyclic.self = cyclic;
  assert.equal(explainDecisions({manifest: cyclic}).errors[0].code, 'BAD_REQUEST');
  const thrower = structuredClone(manifest); Object.defineProperty(thrower, 'boom', {enumerable: true, get() { throw new Error('getter exploded'); }});
  const t = explainDecisions({manifest: thrower}); assert.equal(t.errors[0].code, 'BAD_REQUEST'); assert.doesNotMatch(JSON.stringify(t), /exploded/);
});

test('explainDecisions({manifest}): odd but well-formed manifests do not reach the engine (prototype-named axes, unknown theme)', () => {
  const m = mutated(x => { x.axes = JSON.parse('{"constructor": "x", "__proto__": "y", "toString": "z"}'); x.theme = 'no-such-theme'; });
  const r = explainDecisions({manifest: m});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.value.axes.map(a => a.themeForbids), r.value.axes.map(() => []));
  const known = explainDecisions({manifest: mutated(x => { x.axes = JSON.parse('{"constructor": "x", "toString": "z"}'); })});
  assert.equal(known.ok, true, JSON.stringify(known.errors)); assert.ok(known.value.axes.some(a => a.axis === 'constructor') && known.value.axes.every(a => Array.isArray(a.themeForbids)));
  assert.equal(explainDecisions({manifest: mutated(x => { x.theme = 'constructor'; })}).ok, true);
});

test('explainDecisions: the rule filter matches a rule id exactly, never a prefix or a letter of it', () => {
  const ids = explainDecisions({manifest}, {level: 'full'}).value.decisions.flatMap(d => d.rules);
  assert.ok(ids.includes('C03'));
  for (const partial of ['C0', 'C', '0', '3', 'c03', 'C03 ', 'C033']) assert.deepEqual(explainDecisions({manifest}, {rule: partial}).value.decisions, [], partial);
  assert.ok(explainDecisions({manifest}, {rule: 'C03'}).value.decisions.length > 0);
  // a string where the array belongs is refused instead of being split into letters
  const asString = mutated(x => { x.design.decisions[0].applied = 'C02'; });
  assert.equal(explainDecisions({manifest: asString}, {rule: 'C0'}).ok, false);
  // page rule ids are exact too
  const withPage = mutated(x => { x.design.page.decisions = [{rule: 'P01', path: '$.tree.children[0]', reason: 'r'}]; });
  assert.equal(explainDecisions({manifest: withPage}, {rule: 'P0'}).value.page.decisions.length, 0);
  assert.equal(explainDecisions({manifest: withPage}, {rule: 'P01'}).value.page.decisions.length, 1);
});

// ---- null 규칙: 생략(undefined)은 기본값, null은 어떤 선택 인자에서든 BAD_REQUEST. 문서 인자(blueprint)는 데이터라서 null이 검증기의 OBJECT 오류다.
const CASES = [
  // [이름, 호출(값) → 결과, 기대 path, 기대 code]
  ...['filter', 'query', 'fields', 'limit', 'cursor'].map(k => [`listCatalog ${k}`, v => listCatalog({kind: 'templates', [k]: v}), `$args.${k}`, 'BAD_REQUEST']),
  ['listCatalog kind', v => listCatalog({kind: v}), '$args.kind', 'UNKNOWN_KIND'],
  ['listCatalog filter.pageType', v => listCatalog({kind: 'templates', filter: {pageType: v}}), '$args.filter.pageType', 'BAD_REQUEST'],
  ['listCatalog args', v => listCatalog(v), '$args', 'BAD_REQUEST'],
  ['getSchema target', v => getSchema({target: v}), '$args.target', 'BAD_REQUEST'],
  ['getSchema type', v => getSchema({target: 'component', type: v}), '$args.type', 'BAD_REQUEST'],
  ['getSchema type(blueprint)', v => getSchema({target: 'blueprint', type: v}), '$args.type', 'BAD_REQUEST'],
  ['getSchema fields', v => getSchema({target: 'blueprint', fields: v}), '$args.fields', 'BAD_REQUEST'],
  ['getSchema args', v => getSchema(v), '$args', 'BAD_REQUEST'],
  ['getComponentSpec type', v => getComponentSpec({type: v}), '$args.type', 'BAD_REQUEST'],
  ['getComponentSpec fields', v => getComponentSpec({type: 'hero', fields: v}), '$args.fields', 'BAD_REQUEST'],
  ['getComponentSpec args', v => getComponentSpec(v), '$args', 'BAD_REQUEST'],
  ['validate opts', v => validateBlueprint(bp, v), '$args.opts', 'BAD_REQUEST'],
  ['validate opts.catalogVersion', v => validateBlueprint(bp, {catalogVersion: v}), '$args.opts.catalogVersion', 'BAD_REQUEST'],
  ['compile opts', v => compileBlueprint(bp, v), '$args.opts', 'BAD_REQUEST'],
  ...['include', 'html', 'maxBytes', 'hash', 'catalogVersion'].map(k => [`compile opts.${k}`, v => compileBlueprint(bp, {[k]: v}), `$args.opts.${k}`, 'BAD_REQUEST']),
  ['explain opts', v => explainDecisions({blueprint: bp}, v), '$args.opts', 'BAD_REQUEST'],
  ...['path', 'rule', 'level'].map(k => [`explain opts.${k}`, v => explainDecisions({blueprint: bp}, {[k]: v}), `$args.opts.${k}`, 'BAD_REQUEST']),
  ['explain subject', v => explainDecisions(v), '$args.subject', 'BAD_REQUEST'],
  ['explain subject.manifest', v => explainDecisions({manifest: v}), '$args.subject.manifest', 'BAD_REQUEST'],
];

test('one null rule: null is refused with the argument\'s path in every service function, omitting it uses the default', () => {
  assert.ok(CASES.length >= 30);
  for (const [name, call, path, code] of CASES) {
    const r = call(null);
    assert.equal(r.ok, false, `${name}: null was accepted`);
    assert.equal(r.errors[0].code, code, name); assert.equal(r.errors[0].path, path, name); assert.ok(r.errors[0].hint, name);
  }
  // listCatalog({filter: null}) must not quietly return the unfiltered list
  assert.equal(listCatalog({kind: 'templates', filter: null}).ok, false);
});

test('omitting an optional argument (undefined) is the default, identical to not passing it', () => {
  assert.deepEqual(listCatalog({kind: 'templates', filter: undefined, query: undefined, limit: undefined, fields: undefined, cursor: undefined}), listCatalog({kind: 'templates'}));
  assert.deepEqual(getSchema({target: 'chrome', fields: undefined, type: undefined}), getSchema({target: 'chrome'}));
  assert.deepEqual(getComponentSpec({type: 'hero', fields: undefined}), getComponentSpec({type: 'hero'}));
  assert.deepEqual(validateBlueprint(bp, undefined), validateBlueprint(bp));
  assert.deepEqual(validateBlueprint(bp, {catalogVersion: undefined}), validateBlueprint(bp));
  assert.deepEqual(compileBlueprint(bp, {include: undefined, html: undefined, maxBytes: undefined, hash: undefined, catalogVersion: undefined}), compileBlueprint(bp));
  assert.deepEqual(explainDecisions({blueprint: bp}, {path: undefined, rule: undefined, level: undefined}), explainDecisions({blueprint: bp}));
  assert.deepEqual(explainDecisions({blueprint: bp}, undefined), explainDecisions({blueprint: bp}));
});

test('documents are data, not options: a null blueprint is the validator\'s OBJECT error with path $', () => {
  for (const r of [validateBlueprint(null), compileBlueprint(null), explainDecisions({blueprint: null})]) { assert.equal(r.ok, false); assert.deepEqual([r.errors[0].code, r.errors[0].path], ['OBJECT', '$']); }
});
