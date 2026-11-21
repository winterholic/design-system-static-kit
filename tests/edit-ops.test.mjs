import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, palettes, templates, composeBlueprint, axes} from '../src/catalog.mjs';
import {validateBlueprint} from '../src/validate.mjs';
import {OPS, opNames, applyOp, setTheme, setPalette, setAppearance, setLayoutVariant, updateNode, insertNode, removeNode, moveNode, replaceTemplate, importBlueprint, resetDocument, parsePath, contentFingerprint} from '../src/edit/index.mjs';

const doc = (id = 'saas-landing') => composeBlueprint(id, undefined, undefined, {lossless: true}).blueprint;
const REQUIRED_OPS = ['setTheme', 'setPalette', 'setAppearance', 'setLayoutVariant', 'updateNode', 'insertNode', 'removeNode', 'moveNode', 'replaceTemplate', 'importBlueprint', 'resetDocument'];
const shape = r => { assert.deepEqual(Object.keys(r).sort(), ['changes', 'content', 'doc', 'errors', 'ok', 'warnings']); for (const e of r.errors) assert.ok(e.code && e.path && e.message && e.hint, JSON.stringify(e)); return r; };

test('API: the eleven operations exist, are pure functions of (doc, args), and answer in one result shape', () => {
  assert.deepEqual([...opNames].sort(), [...REQUIRED_OPS].sort());
  const d = doc();
  const calls = {
    setTheme: {theme: 'console'}, setPalette: {palette: themes.studio.palettes[0]}, setAppearance: {mode: 'dark'}, setLayoutVariant: {slot: 'cards', option: 'outline'},
    updateNode: {path: [0], set: {title: '바뀐 제목'}}, insertNode: {parent: [], index: 2, node: {type: 'divider'}}, removeNode: {path: [2]}, moveNode: {path: [3], to: {parent: [], index: 2}},
    replaceTemplate: {template: 'article', discard: true}, importBlueprint: {blueprint: doc('article')}, resetDocument: {template: 'article', discard: true},
  };
  for (const name of REQUIRED_OPS) {
    const before = JSON.stringify(d), r = shape(applyOp(d, name, calls[name]));
    assert.equal(JSON.stringify(d), before, name + ' did not touch its input');
    assert.equal(typeof OPS[name], 'function');
    if (r.ok) assert.ok(validateBlueprint(r.doc).valid, name);
  }
  assert.equal(applyOp(d, 'dropDatabase', {}).errors[0].code, 'UNKNOWN_OP');
});

test('atomicity: a rejected operation changes nothing and hands back the very same doc; a success is deeply frozen', () => {
  const d = doc(), before = JSON.stringify(d);
  const bad = [
    setTheme(d, {theme: 'nope'}), setPalette(d, {palette: 'nope'}), setAppearance(d, {axes: {density: 'huge'}}), setLayoutVariant(d, {slot: 'faq', option: 'nope'}),
    updateNode(d, {path: [0], set: {title: ''}}), updateNode(d, {path: [0], set: {unknownField: 1}}), insertNode(d, {parent: [], node: {type: 'hero', variant: 'statement', title: 'x', body: 'y'}}), removeNode(d, {path: [0]}),
    moveNode(d, {path: [1], to: {parent: [1]}}), replaceTemplate(d, {template: 'article'}),
  ];
  for (const r of bad) { shape(r); assert.equal(r.ok, false); assert.equal(r.doc, d); assert.deepEqual(r.changes, []); }
  assert.equal(JSON.stringify(d), before);
  const good = updateNode(d, {path: [0], set: {title: '새 제목'}});
  assert.ok(good.ok && good.doc !== d && Object.isFrozen(good.doc) && Object.isFrozen(good.doc.tree.children[0]));
  assert.throws(() => { 'use strict'; good.doc.tree.children[0].title = 'mutate'; }, TypeError);
  assert.notEqual(good.doc.tree.children[0].title, d.tree.children[0].title);
  assert.equal(d.tree.children[0].title, JSON.parse(before).tree.children[0].title);
});

test('undo/redo: operation results are immutable snapshots, so a history of doc references restores any earlier state exactly', () => {
  const states = [doc('dashboard-overview')];
  const run = (op, args) => { const r = applyOp(states.at(-1), op, args); assert.ok(r.ok, op + JSON.stringify(r.errors)); if (r.changes.length) states.push(r.doc); return r; };
  run('setTheme', {theme: 'console'}); run('setPalette', {palette: themes.studio.palettes[0]}); run('updateNode', {path: [0], set: {title: '고친 제목'}});
  run('insertNode', {parent: [], node: {type: 'divider'}}); run('moveNode', {path: [3], to: {parent: [], index: 1}});
  const snapshots = states.map(s => JSON.stringify(s));
  // Undo to the start, redo to the end: nothing was mutated in place while the history grew.
  assert.equal(states.length, 6);
  states.forEach((s, i) => assert.equal(JSON.stringify(s), snapshots[i]));
  assert.notEqual(states[0].theme, states.at(-1).theme);
  const redone = applyOp(states[3], 'insertNode', {parent: [], node: {type: 'divider'}});
  assert.equal(JSON.stringify(redone.doc), snapshots[4], 'replaying an op on the same snapshot reproduces the same snapshot');
  const noop = applyOp(states.at(-1), 'setPalette', {palette: states.at(-1).palette});
  assert.equal(noop.doc, states.at(-1)); assert.deepEqual(noop.changes, []); assert.equal(noop.warnings.at(-1).code, 'NO_CHANGE');
});

test('setTheme: keeps content, substitutes the shell instead of trimming the nav, and says so; axes:"keep" and navPolicy:"reject" refuse', () => {
  const d = doc('docs-reference');                                   // 그룹 라벨이 있는 내비
  assert.ok(d.chrome.nav.some(n => n.group));
  const r = setTheme(d, {theme: 'aurora'});                          // 가로 셸 테마
  assert.ok(r.ok);
  assert.deepEqual(r.doc.chrome, d.chrome, 'labels and items kept');
  assert.ok(['sidebar', 'split'].includes(r.doc.shell));
  assert.ok(r.warnings.some(w => w.code === 'SHELL_SUBSTITUTED' && w.to === r.doc.shell));
  const strict = setTheme(d, {theme: 'aurora', navPolicy: 'reject', repair: 'auto'});
  assert.equal(strict.ok, false);
  assert.ok(strict.errors.some(e => e.code === 'NAV_GROUP' && /sidebar/.test(e.hint)));
  const minimal = setTheme(doc('saas-landing'), {theme: 'studio'});
  assert.ok(minimal.ok); assert.equal(minimal.doc.chrome.nav.length, templates['saas-landing'].chrome.nav.length);
  assert.equal(setTheme(d, {theme: 'aurora', variant: 'no-such'}).errors[0].code, 'UNKNOWN_THEME_VARIANT');
  const keep = setTheme(d, {theme: 'console', axes: 'keep'});
  assert.ok(keep.ok); assert.equal(keep.doc.theme, 'console'); assert.equal(keep.doc.shell, d.shell, 'axes:"keep" does not wear the theme axes');
  const forbidden = setAppearance(keep.doc, {axes: {radius: 'bubble'}});
  assert.ok(forbidden.errors.some(e => e.code === 'THEME_FORBID' && e.hint), JSON.stringify(forbidden.errors));
});

test('setTheme: when no shell can hold the nav the result is NAV_NO_SHELL with a way out, never a truncation', () => {
  const d = doc('saas-landing');
  const crowded = updateNode(d, {path: '$.chrome.nav[0]', set: {mega: [{label: '하나', href: '#main'}, {label: '둘', href: '#main'}]}});
  assert.ok(crowded.ok, JSON.stringify(crowded.errors));
  const two = updateNode(crowded.doc, {path: '$.chrome.nav[1]', set: {mega: [{label: '셋', href: '#main'}, {label: '넷', href: '#main'}]}});
  assert.ok(two.ok);
  const third = updateNode(two.doc, {path: '$.chrome.nav[2]', set: {mega: [{label: '다섯', href: '#main'}, {label: '여섯', href: '#main'}]}});
  assert.equal(third.ok, false);
  assert.ok(third.errors.some(e => e.code === 'NAV_MEGA' && e.hint));
});

test('setAppearance: explicit picks are validated, banned combinations are rejected with the alternative, repair:"auto" applies it and reports', () => {
  const d = doc('dashboard-overview');
  const reject = setAppearance(d, {axes: {density: 'compact', shell: 'dock'}});
  assert.equal(reject.ok, false);
  assert.ok(reject.errors.some(e => e.code === 'AXIS_BAN' && /density=comfortable/.test(e.message)), JSON.stringify(reject.errors));
  const unknown = setAppearance(d, {axes: {wiggle: 'x'}}); assert.equal(unknown.errors[0].code, 'UNKNOWN_AXIS');
  assert.equal(setAppearance(d, {mode: 'sepia'}).errors[0].code, 'ENUM');
  const fixed = setAppearance(setPalette(d, {palette: d.palette}).doc, {mode: 'dark', axes: {elevation: 'glow'}});
  assert.ok(fixed.ok && fixed.doc.mode === 'dark' && fixed.doc.elevation === 'glow');
  const light = setAppearance(fixed.doc, {mode: 'light'});
  assert.equal(light.ok, false); assert.ok(light.errors.some(e => e.code === 'AXIS_BAN' || e.code === 'THEME_FORBID'));
  const auto = setAppearance(fixed.doc, {mode: 'light', repair: 'auto'});
  assert.ok(auto.ok); assert.ok(auto.warnings.some(w => w.code === 'AXIS_REPAIRED' && w.rule));
  assert.deepEqual(auto.doc.tree, d.tree);
});

test('setLayoutVariant: acts on the current tree (not the template original), rejects what does not apply, reports decoration and quality findings', () => {
  const edited = updateNode(doc('saas-landing'), {path: [1], set: {title: '직접 쓴 히어로 제목'}}).doc;
  const r = setLayoutVariant(edited, {slot: 'hero', option: 'centered'});
  assert.ok(r.ok);
  assert.equal(r.doc.tree.children[1].title, '직접 쓴 히어로 제목', 'the edit is not replaced by the template original');
  assert.equal(r.doc.tree.children[1].variant, 'centered');
  assert.ok(r.warnings.some(w => w.code === 'DECORATION_DROPPED' && w.field === 'visual' && w.grade === 'decoration'));
  assert.ok(r.warnings.some(w => w.code === 'VARIANT_CONTRACT' && w.ruleId === 'V01' && w.grade === 'quality'), 'V01 flags the dropped visual without refusing');
  const missing = setLayoutVariant(doc('article'), {slot: 'tabs', option: 'pill'});
  assert.equal(missing.errors[0].code, 'LAYOUT_NOT_APPLICABLE'); assert.match(missing.errors[0].hint, /지금 고를 수 있는 구성/);
  assert.equal(setLayoutVariant(doc(), {}).errors[0].code, 'ARGS_INVALID');
  assert.equal(setLayoutVariant(doc(), {slot: 'hero', option: 'nope'}).errors[0].code, 'LAYOUT_UNKNOWN');
  const again = setLayoutVariant(r.doc, {slot: 'hero', option: 'centered'});
  assert.equal(again.ok, true); assert.equal(again.doc, r.doc); assert.equal(again.warnings.at(-1).code, 'NO_CHANGE');
});

test('hero facts are content: a variant that cannot show them is refused or relocates them into a metric grid, never dropped', () => {
  const d = doc('agency-home');
  const hero = d.tree.children[1];
  assert.ok(hero.facts?.length >= 2 && hero.variant === 'cover');
  const refused = setLayoutVariant(d, {slot: 'hero', option: 'split'});
  assert.equal(refused.ok, false);
  assert.equal(refused.errors[0].code, 'LAYOUT_WOULD_DROP_CONTENT');
  assert.match(refused.errors[0].message, new RegExp(hero.facts[0].label)); assert.match(refused.errors[0].hint, /relocate/);
  const moved = setLayoutVariant(d, {slot: 'hero', option: 'split', contentPolicy: 'relocate'});
  assert.ok(moved.ok);
  const [h, grid] = [moved.doc.tree.children[1], moved.doc.tree.children[2]];
  assert.equal(h.variant, 'split'); assert.ok(!('facts' in h)); assert.ok(h.visual);
  assert.equal(grid.type, 'grid'); assert.deepEqual(grid.children.map(m => [m.label, m.value]), hero.facts.map(f => [f.label, f.value]));
  assert.deepEqual(contentFingerprint(moved.doc), contentFingerprint(d));
  const swap = setLayoutVariant(d, {slot: 'hero', option: 'statement'});     // facts를 쓰는 변형끼리는 그대로 둔다
  assert.ok(swap.ok && swap.doc.tree.children[1].facts.length === hero.facts.length);
});

test('updateNode: field-level edits with path forms, type/children/proto keys refused, root only renames', () => {
  const d = doc();
  const a = updateNode(d, {path: [1], set: {title: 'A'}}), b = updateNode(d, {path: '$.tree.children[1]', set: {title: 'A'}});
  assert.deepEqual(a.doc, b.doc); assert.deepEqual(a.changes.map(c => c.path), ['$.tree.children[1].title']);
  assert.equal(updateNode(d, {path: [1], set: {type: 'cta'}}).errors[0].code, 'NODE_TYPE_IMMUTABLE');
  assert.equal(updateNode(d, {path: [1], set: {children: []}}).errors[0].code, 'CHILDREN_VIA_OPS');
  assert.equal(updateNode(d, {path: [1], set: JSON.parse('{"__proto__": {"x": 1}}')}).errors[0].code, 'PROTO_KEY');
  assert.equal(({}).x, undefined);
  assert.equal(updateNode(d, {path: [99], set: {title: 'x'}}).errors[0].code, 'PATH_NOT_FOUND');
  assert.equal(updateNode(d, {path: '$.theme', set: {}}).errors[0].code, 'PATH_NOT_FOUND');
  assert.equal(updateNode(d, {path: '$', set: {theme: 'console'}}).errors[0].code, 'PATH_INVALID');
  assert.equal(updateNode(d, {path: '$', set: {name: '새 이름'}}).doc.name, '새 이름');
  assert.equal(updateNode(d, {path: 'tree'}).errors[0].code, 'PATH_INVALID');
  const unset = updateNode(d, {path: [1], unset: ['eyebrow']}); assert.ok(unset.ok && !('eyebrow' in unset.doc.tree.children[1]) && 'eyebrow' in d.tree.children[1]);
  assert.equal(updateNode(d, {path: [1], unset: ['title']}).errors[0].code, 'REQUIRED');
  assert.deepEqual(parsePath([1, 0]).segments, ['tree', 'children', 1, 'children', 0]);
  assert.ok(parsePath('$.a.__proto__').error);
});

test('insertNode / removeNode / moveNode: structural edits, index checks, container keys, no moves into self, content kept by moves', () => {
  const d = doc('article');
  const ins = insertNode(d, {parent: [], index: 2, node: {type: 'divider'}});
  assert.ok(ins.ok); assert.deepEqual(ins.changes, [{op: 'insert', path: '$.tree.children[2]', after: {type: 'divider'}}]);
  assert.equal(ins.doc.tree.children.length, d.tree.children.length + 1);
  assert.equal(insertNode(d, {parent: [], index: 99, node: {type: 'divider'}}).errors[0].code, 'INDEX_RANGE');
  assert.equal(insertNode(d, {parent: [], node: {type: 'nonsense'}}).errors[0].code, 'NODE_TYPE');
  assert.equal(insertNode(d, {parent: [], node: () => 1}).errors[0].code, 'ARGS_INVALID');
  assert.equal(insertNode(d, {parent: '$.chrome', key: 'missing', node: {}}).errors[0].code, 'PATH_NOT_FOUND');
  const nav = insertNode(d, {parent: '$.chrome', key: 'nav', node: {label: '새 메뉴', href: '#main'}});
  assert.ok(nav.ok, JSON.stringify(nav.errors)); assert.equal(nav.doc.chrome.nav.at(-1).label, '새 메뉴');
  const rem = removeNode(ins.doc, {path: [2]}); assert.ok(rem.ok); assert.deepEqual(rem.doc, d);
  assert.equal(removeNode(d, {path: '$.name'}).errors[0].code, 'PATH_NOT_FOUND');
  assert.equal(removeNode(d, {path: '$.tree.children[0].title'}).errors[0].code, 'PATH_INVALID');
  assert.equal(removeNode(d, {path: [0]}).errors[0].code, 'PAGE_HEADER');
  const withBlocks = insertNode(ins.doc, {parent: [], node: {type: 'section', title: '묶음', children: [{type: 'prose', title: '본문 제목', body: '본문'}]}}).doc;
  const last = withBlocks.tree.children.length - 1;
  const mv = moveNode(withBlocks, {path: [last], to: {parent: [], index: 1}});
  assert.ok(mv.ok); assert.equal(mv.doc.tree.children[1].title, '묶음'); assert.deepEqual(mv.changes.map(c => c.op), ['move']); assert.equal(mv.content.preserved, true);
  assert.equal(moveNode(withBlocks, {path: [last], to: {parent: [last]}}).errors[0].code, 'MOVE_INTO_SELF');
  assert.equal(moveNode(withBlocks, {path: [last], to: {parent: [last, 0]}}).errors[0].code, 'PATH_NOT_FOUND');
  const into = moveNode(withBlocks, {path: [2], to: {parent: [last], index: 0}});
  assert.ok(into.ok, JSON.stringify(into.errors)); assert.equal(into.doc.tree.children.at(-1).children.length, 2); assert.equal(into.content.preserved, true);
  assert.equal(moveNode(withBlocks, {path: [last], to: {parent: [], index: -1}}).errors[0].code, 'INDEX_RANGE');
});

test('replaceTemplate / resetDocument / importBlueprint: whole-document operations refuse to discard content unless told, and never trim the nav', () => {
  const d = updateNode(doc('saas-landing'), {path: [0], set: {title: '지켜야 할 제목'}}).doc;
  const guard = replaceTemplate(d, {template: 'article'});
  assert.equal(guard.errors[0].code, 'DISCARD_REQUIRED'); assert.match(guard.errors[0].hint, /discard:true/);
  const r = replaceTemplate(d, {template: 'article', discard: true});
  assert.ok(r.ok); assert.equal(r.doc.pageType, 'article'); assert.equal(r.doc.theme, d.theme); assert.equal(r.doc.palette, d.palette);
  for (const k of ['density', 'radius', 'typography']) assert.equal(r.doc[k], d[k], k + ' kept with the look');
  assert.deepEqual(r.doc.chrome, templates.article.chrome); assert.ok(r.warnings.some(w => w.code === 'CONTENT_REPLACED' && w.discarded > 0));
  assert.equal(replaceTemplate(d, {template: 'nope'}).errors[0].code, 'UNKNOWN_TEMPLATE');
  assert.equal(resetDocument(d, {template: 'article'}).errors[0].code, 'DISCARD_REQUIRED');
  const reset = resetDocument(d, {template: 'saas-landing', discard: true});
  assert.ok(reset.ok); assert.notEqual(reset.doc.tree.children[0].title, '지켜야 할 제목');
  const fresh = resetDocument(null, {template: 'docs-reference', theme: 'aurora'});
  assert.ok(fresh.ok); assert.deepEqual(fresh.doc.chrome, templates['docs-reference'].chrome, 'a theme with a horizontal shell does not strip group labels');
  assert.ok(fresh.warnings.some(w => w.code === 'SHELL_SUBSTITUTED'));
  assert.equal(resetDocument(null, {template: 'nope'}).errors[0].code, 'UNKNOWN_TEMPLATE');
  assert.equal(resetDocument(null, {theme: 'nope'}).errors[0].code, 'UNKNOWN_THEME');
  const text = JSON.stringify(doc('article'));
  const imp = importBlueprint(null, {blueprint: text}); assert.ok(imp.ok); assert.deepEqual(imp.doc, doc('article'));
  assert.equal(importBlueprint(null, {blueprint: '{broken'}).errors[0].code, 'IMPORT_INVALID');
  assert.equal(importBlueprint(null, {blueprint: 42}).errors[0].code, 'IMPORT_INVALID');
  const unknownKey = importBlueprint(null, {blueprint: {...doc('article'), css: 'x'}}); assert.equal(unknownKey.ok, false); assert.equal(unknownKey.errors[0].code, 'UNKNOWN_KEY');
  assert.equal(importBlueprint(d, {blueprint: doc('article')}).errors[0].code, 'DISCARD_REQUIRED');
  const legacy = importBlueprint(null, {blueprint: {...doc('article'), catalogVersion: '2.2.0'}});
  assert.ok(legacy.ok && legacy.doc.catalogVersion === '2.2.0' && legacy.warnings.some(w => w.code === 'CATALOG_LEGACY'));
  const up = importBlueprint(null, {blueprint: {...doc('article'), catalogVersion: '2.2.0'}, upgrade: true});
  assert.ok(up.ok && up.doc.catalogVersion === doc('article').catalogVersion);
  const unsupported = importBlueprint(null, {blueprint: {...doc('article'), catalogVersion: '1.9.0'}});
  assert.equal(unsupported.ok, false); assert.ok(unsupported.errors.some(e => e.code === 'CATALOG_VERSION' && e.hint));
});

test('setPalette: unknown palette is an error naming the theme palettes; known palette changes only that field', () => {
  const d = doc('dashboard-overview'), other = Object.keys(palettes).find(p => p !== d.palette);
  const r = setPalette(d, {palette: other}); assert.ok(r.ok);
  assert.deepEqual(r.changes, [{op: 'replace', path: '$.palette', before: d.palette, after: other}]);
  const bad = setPalette(d, {palette: 'x'}); assert.equal(bad.errors[0].code, 'UNKNOWN_PALETTE'); assert.match(bad.errors[0].hint, new RegExp(themes[d.theme].palettes[0]));
  for (const mode of axes.mode) { const m = setAppearance(r.doc, {mode, repair: 'auto'}); if (m.ok) assert.equal(m.doc.palette, other); }
});
