import {test} from 'node:test';
import assert from 'node:assert/strict';
import {explainDecisions, compileBlueprint} from '../src/service/index.mjs';
import {createBlueprint, templateList, compositionRules, pageRules, themes, axisBans, styleAxes} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

const manifestOf = bp => compile(bp).manifest;
const reasonOf = id => compositionRules.find(r => r.id === id)?.reason;

test('every decision comes from the compiler\'s manifest: same paths, node types, rules and winning values, for every template', () => {
  let count = 0;
  for (const t of templateList) {
    const bp = createBlueprint(t.id), m = manifestOf(bp), r = explainDecisions({blueprint: bp});
    assert.equal(r.ok, true, t.id);
    const source = m.design?.decisions ?? [];
    assert.deepEqual(r.value.decisions.map(d => [d.path, d.nodeType, d.rules]), source.map(d => [d.path, d.type, d.applied]), t.id);
    r.value.decisions.forEach((d, i) => {
      for (const [field, value] of Object.entries(source[i].values)) assert.deepEqual(d.winner[field], {value, rule: source[i].sources[field]}, `${t.id} ${d.path} ${field}`);
      assert.equal(Object.keys(d.winner).length, Object.keys(source[i].values).length);
      count++;
    });
  }
  assert.ok(count > 500, 'decisions checked: ' + count);
});

test('why and source are quoted from rule definitions or from the manifest, never composed from nothing', () => {
  for (const t of templateList) {
    const bp = createBlueprint(t.id), m = manifestOf(bp), r = explainDecisions({blueprint: bp});
    (m.design?.decisions ?? []).forEach((d, i) => {
      const out = r.value.decisions[i];
      const expected = d.applied.length ? d.applied.map(id => `${id}: ${reasonOf(id)}`).join(' ') : d.coverage.reason;
      assert.equal(out.why, expected, `${t.id} ${d.path}`);
      assert.ok(out.why.length > 0);
      for (const id of d.applied) assert.ok(reasonOf(id), `${id} has a catalog reason`);
      assert.equal(out.source, d.applied.length ? d.applied.map(id => `src/catalog/composition.mjs#${id}`).join(', ') : 'manifest.design.decisions');
    });
  }
});

test('a manifest handed in is explained as written: the answer follows the manifest, not a recomputation', () => {
  const bp = createBlueprint('saas-landing'), m = structuredClone(manifestOf(bp));
  const same = explainDecisions({manifest: m}, {level: 'full'});
  assert.deepEqual(same, explainDecisions({blueprint: bp}, {level: 'full'}), 'blueprint and its own manifest give identical answers');
  m.design.decisions[0].values.role = 'edited-in-manifest'; m.design.decisions[0].sources.role = 'C99';
  const tampered = explainDecisions({manifest: m});
  assert.deepEqual(tampered.value.decisions[0].winner.role, {value: 'edited-in-manifest', rule: 'C99'});
  m.contrast = m.contrast.slice(0, 3); assert.equal(explainDecisions({manifest: m}).value.contrast.pairs, 3);
});

test('summary leaves facts out, full adds facts, coverage and inherited records', () => {
  const bp = createBlueprint('dashboard-overview'), m = manifestOf(bp);
  const summary = explainDecisions({blueprint: bp}).value, full = explainDecisions({blueprint: bp}, {level: 'full'}).value;
  assert.equal(summary.decisions[0].facts, undefined); assert.equal(summary.inherited, undefined);
  assert.deepEqual(full.decisions[0].facts, m.design.decisions[0].facts); assert.deepEqual(full.decisions[0].coverage, m.design.decisions[0].coverage);
  assert.deepEqual(full.inherited, m.design.inherited);
  assert.deepEqual(explainDecisions({blueprint: bp}, {level: 'summary'}).value, summary);
});

test('opts.path and opts.rule narrow the decisions', () => {
  const bp = createBlueprint('saas-landing'), m = manifestOf(bp);
  const one = explainDecisions({blueprint: bp}, {path: '$.tree.children[0]'}).value.decisions;
  assert.deepEqual(one.map(d => d.path), ['$.tree.children[0]']);
  const sub = explainDecisions({blueprint: bp}, {path: '$.tree.children[3]'}).value.decisions;
  assert.ok(sub.length >= 2 && sub.every(d => d.path === '$.tree.children[3]' || d.path.startsWith('$.tree.children[3].')));
  assert.equal(explainDecisions({blueprint: bp}, {path: '$.tree.children[1]'}).value.decisions.some(d => d.path.startsWith('$.tree.children[10]')), false, 'children[1] must not match children[10]');
  const c03 = explainDecisions({blueprint: bp}, {rule: 'C03'}).value.decisions;
  assert.ok(c03.length > 0 && c03.every(d => d.nodeType === 'section' && d.rules.includes('C03')));
  assert.equal(c03.length, m.design.decisions.filter(d => d.applied.includes('C03')).length);
  assert.deepEqual(explainDecisions({blueprint: bp}, {rule: 'C03', path: '$.tree.children[0]'}).value.decisions, []);
  assert.deepEqual(explainDecisions({blueprint: bp}, {rule: 'ZZ99'}).value.decisions, []);
});

test('page rule history is passed through with the rule source; a template that triggers it is covered', () => {
  let seen = 0;
  for (const t of templateList) {
    const bp = createBlueprint(t.id), m = manifestOf(bp), r = explainDecisions({blueprint: bp});
    assert.deepEqual(r.value.page?.facts, m.design?.page?.facts, t.id);
    assert.deepEqual((r.value.page?.decisions ?? []).map(({source, ...d}) => d), m.design?.page?.decisions ?? [], t.id);
    for (const d of r.value.page?.decisions ?? []) { assert.equal(d.source, pageRules.find(p => p.id === d.rule).source); seen++; }
  }
  assert.ok(seen >= 3, 'page decisions seen: ' + seen);
  const sparse = templateList.map(t => createBlueprint(t.id)).find(bp => manifestOf(bp).design?.page?.decisions?.length);
  const only = explainDecisions({blueprint: sparse}, {rule: manifestOf(sparse).design.page.decisions[0].rule}).value.page.decisions;
  assert.ok(only.length >= 1 && only.every(d => d.rule === manifestOf(sparse).design.page.decisions[0].rule));
});

test('axes list each axis value with the bans that constrain it and the theme\'s own forbidden values', () => {
  const bp = createBlueprint('saas-landing', 'civic'), r = explainDecisions({blueprint: bp}).value;
  assert.deepEqual(r.axes.map(a => a.axis), ['mode', ...styleAxes]);
  for (const a of r.axes) {
    assert.equal(a.value, a.axis === 'mode' ? bp.mode : bp[a.axis]);
    assert.deepEqual(a.bans, axisBans.filter(b => b.uses.includes(a.axis)).map(b => b.id));
    assert.deepEqual(a.themeForbids, themes.civic.forbid[a.axis] ?? []);
  }
  assert.deepEqual(r.axes.find(a => a.axis === 'elevation').themeForbids, ['glow', 'lifted', 'hard']);
  assert.ok(r.axes.find(a => a.axis === 'elevation').bans.includes('X05'));
});

test('contrast summary: pair count, the body-text minimum and the tightest pair come from manifest.contrast', () => {
  for (const id of ['saas-landing', 'login', 'article']) {
    const bp = createBlueprint(id), m = manifestOf(bp), c = explainDecisions({blueprint: bp}).value.contrast;
    assert.equal(c.pairs, m.contrast.length);
    assert.equal(c.minimumBody, m.contrast.find(p => p.name === 'text/canvas').minimum);
    const margin = p => p.ratio / p.minimum;
    assert.ok(m.contrast.every(p => margin(c.tightest) <= margin(p)), 'tightest has the smallest margin');
    assert.ok(m.contrast.some(p => JSON.stringify(p) === JSON.stringify(c.tightest)), 'tightest is a real pair');
    assert.ok(c.tightest.ratio >= c.tightest.minimum, 'the compiler only returns documents that pass the gate');
  }
  const none = structuredClone(manifestOf(createBlueprint('login'))); none.contrast = [];
  assert.deepEqual(explainDecisions({manifest: none}).value.contrast, {minimumBody: null, pairs: 0, tightest: null});
});

test('legacy catalog 2.3.0 documents keep their pinned composition: no page rules, composition 1.2.0', () => {
  const bp = createBlueprint('saas-landing'); bp.catalogVersion = '2.3.0';
  const compiled = compileBlueprint(bp, {include: ['manifest']});
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  const r = explainDecisions({blueprint: bp});
  assert.equal(r.ok, true); assert.equal(r.value.page, null);
  assert.equal(r.value.decisions.length, compiled.value.manifest.design.decisions.length);
});

test('an invalid blueprint is explained by its errors, not by a guess; warnings of the compile ride along', () => {
  const bad = createBlueprint('saas-landing'); bad.tree.children[1].style = 'x';
  const r = explainDecisions({blueprint: bad});
  assert.equal(r.ok, false); assert.ok(r.errors.some(e => e.code === 'UNKNOWN_KEY' && e.hint));
  const withWarning = templateList.map(t => createBlueprint(t.id)).find(bp => compileBlueprint(bp).warnings.length);
  assert.ok(withWarning, 'a template with a page-rule warning exists');
  assert.deepEqual(explainDecisions({blueprint: withWarning}).warnings, compileBlueprint(withWarning).warnings);
});

test('wrong arguments are rejected with named paths', () => {
  const bp = createBlueprint('login'), m = manifestOf(bp);
  const cases = [
    [undefined, undefined, '$args.subject'], [{}, undefined, '$args.subject'], [{blueprint: bp, manifest: m}, undefined, '$args.subject'], [{blueprint: bp, extra: 1}, undefined, '$args.subject.extra'],
    [{manifest: 5}, undefined, '$args.subject.manifest'], [{manifest: {}}, undefined, '$args.subject.manifest.catalogVersion'], [{manifest: {...m, axes: null}}, undefined, '$args.subject.manifest.axes'],
    [{blueprint: bp}, {path: 'tree'}, '$args.opts.path'], [{blueprint: bp}, {rule: ''}, '$args.opts.rule'], [{blueprint: bp}, {level: 'deep'}, '$args.opts.level'], [{blueprint: bp}, {nope: 1}, '$args.opts.nope'], [{blueprint: bp}, 'x', '$args.opts'],
  ];
  for (const [subject, opts, path] of cases) {
    const r = explainDecisions(subject, opts); assert.equal(r.ok, false, path); assert.equal(r.errors[0].code, 'BAD_REQUEST'); assert.equal(r.errors[0].path, path); assert.ok(r.errors[0].hint);
  }
});
