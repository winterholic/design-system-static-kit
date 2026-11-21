import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nodeSpecs, themes, palettes, axes, styleAxes, templates, layoutSlots} from '../src/catalog.mjs';
import {applyOp, partExample, partTypes, insertableParts, addPlacements, themeChoices, themeVariantChoices, paletteChoices, modeChoices, axisChoices, layoutChoices, contentFingerprint} from '../src/edit/index.mjs';

const fresh = template => { const r = applyOp(null, 'resetDocument', {template}); assert.ok(r.ok, template + JSON.stringify(r.errors)); return r.doc; };
const nodeAt = (doc, path) => path.reduce((n, i) => n.children[i], doc.tree);

/** 모든 템플릿에서 부품 type마다 처음 만나는 (문서, 경로)를 모은다. 페이지 루트 포함. 선택할 수 있는 모든 노드 type이 부모 자리에 한 번씩 나오게 한다. */
function oneOfEachType() {
  const seen = new Map();
  for (const id of Object.keys(templates)) {
    const doc = fresh(id);
    const walk = (node, path) => {
      const type = node.type ?? 'page';
      if (!seen.has(type)) seen.set(type, {doc, path, template: id});
      (node.children ?? []).forEach((c, i) => walk(c, [...path, i]));
    };
    walk(doc.tree, []);
  }
  return seen;
}

/** 독립 판정: 도우미를 거치지 않고 실제 insertNode 연산을 직접 부른다. */
function oracle(doc, parent, index) {
  const accepted = new Set();
  for (const type of Object.keys(nodeSpecs)) {
    if (type === 'page') continue;
    const node = partExample(type);
    if (!node) continue;
    const r = applyOp(doc, 'insertNode', {parent, node, ...(index === undefined ? {} : {index})});
    if (r.ok) accepted.add(type);
  }
  return accepted;
}

test('partExample: every insertable part has a node of its own type, and callers cannot mutate the shared example', () => {
  assert.equal(partExample('page'), null);
  assert.equal(partExample('no-such-part'), null);
  for (const type of partTypes) {
    const node = partExample(type);
    assert.ok(node, `${type} has no insertion example`);
    assert.equal(node.type, type);
  }
  // example이 null인 부품은 부모 부품의 example 안에서 가져온다.
  for (const type of ['tab', 'lane', 'task', 'plan']) assert.equal(nodeSpecs[type].example ?? null, null, type + ' now has its own example; the fallback may be dropped');
  const a = partExample('hero'); a.title = 'mutated';
  assert.notEqual(partExample('hero').title, 'mutated');
});

test('insertableParts agrees with the real insertNode operation for every node type, in every container, inside and after', () => {
  const seen = oneOfEachType();
  assert.ok(seen.size >= 50, 'every node type appears in at least one template: ' + seen.size);
  let compared = 0;
  for (const [type, {doc, path, template}] of seen) {
    const where = `${template}:${type}@${JSON.stringify(path)}`;
    const {inside, after} = addPlacements(doc, path);
    const insideTypes = new Set(inside.accepted.map(a => a.type));
    assert.deepEqual([...insideTypes].sort(), [...oracle(doc, path)].sort(), 'inside ' + where);
    // 판정의 양쪽이 모두 한 부품도 빠짐없이 나뉜다: 받은 것 + 거절한 것 = 후보 전체
    assert.equal(inside.accepted.length + inside.rejected.length, partTypes.length, where);
    if (path.length) {
      const parent = path.slice(0, -1), index = path.at(-1) + 1;
      assert.deepEqual([...new Set(after.accepted.map(a => a.type))].sort(), [...oracle(doc, parent, index)].sort(), 'after ' + where);
    } else assert.deepEqual(after.accepted, [], 'page root has no siblings');
    compared++;
  }
  assert.ok(compared >= 50);
});

test('insertableParts: accepted parts really insert without errors, rejected ones carry the operation\'s own diagnostics, and the input is untouched', () => {
  const doc = fresh('dashboard-overview'), before = JSON.stringify(doc);
  for (const {parent, index} of [{parent: []}, {parent: [], index: 1}, {parent: [1]}, {parent: [1], index: 0}, {parent: [0]}, {parent: [1, 0]}]) {
    const res = insertableParts(doc, {parent, index});
    assert.equal(res.ok, true);
    for (const {type} of res.accepted) {
      const r = applyOp(doc, 'insertNode', {parent, node: partExample(type), ...(index === undefined ? {} : {index})});
      assert.ok(r.ok, `${type} was offered but rejected: ${JSON.stringify(r.errors)}`);
    }
    for (const {type, errors} of res.rejected) {
      assert.ok(errors.length && errors.every(e => e.code && e.path && e.message && e.hint), type + ' rejection lacks a precise diagnostic');
    }
  }
  assert.equal(JSON.stringify(doc), before);
  // 알려진 경우: page-header 안에는 아무것도 못 넣고, 그리드 안에는 지표·카드류만 들어가며, 탭 안에는 탭 패널이 들어간다.
  assert.deepEqual(insertableParts(doc, {parent: [0]}).accepted, []);
  const grid = insertableParts(doc, {parent: [1]}).accepted.map(a => a.type);
  assert.ok(grid.includes('metric') && !grid.includes('hero') && !grid.includes('grid'), grid.join());
  const tabsDoc = fresh('settings');
  const tabsAccepted = insertableParts(tabsDoc, {parent: [1]}).accepted.map(a => a.type);
  assert.equal(nodeAt(tabsDoc, [1]).type, 'tabs');
  assert.deepEqual(tabsAccepted, nodeAt(tabsDoc, [1]).children.length < nodeSpecs.tabs.max ? ['tab'] : []);
});

test('insertableParts: respects child-count limits and page rules the operations enforce', () => {
  let doc = fresh('dashboard-overview');
  const idx = doc.tree.children.findIndex(n => n.type === 'grid');
  const grid = doc.tree.children[idx];
  // 최대 자식 수까지 채운 그리드는 더 받지 않는다.
  let full = doc;
  for (let i = grid.children.length; i < nodeSpecs.grid.max; i++) {
    const r = applyOp(full, 'insertNode', {parent: [idx], node: partExample('metric')});
    assert.ok(r.ok, JSON.stringify(r.errors)); full = r.doc;
  }
  assert.deepEqual(insertableParts(full, {parent: [idx]}).accepted, []);
  assert.ok(insertableParts(doc, {parent: [idx]}).accepted.length > 0);
  // 페이지 규칙: 히어로는 한 번만, 첫머리에만. 대시보드 페이지는 히어로를 금지한다.
  assert.ok(!insertableParts(doc, {parent: []}).accepted.some(a => a.type === 'hero'));
  const landing = fresh('saas-landing');
  assert.ok(!insertableParts(landing, {parent: []}).accepted.some(a => a.type === 'hero'), 'single hero');
});

test('insertableParts: malformed input yields an empty, explained answer instead of throwing', () => {
  const doc = fresh('dashboard-overview');
  for (const bad of [[99], [-1], 'tree', {}]) {
    const r = insertableParts(doc, {parent: bad});
    assert.equal(r.accepted.length, 0, JSON.stringify(bad));
  }
  assert.equal(insertableParts(null, {parent: []}).accepted.length, 0);
  assert.equal(insertableParts(doc, {parent: [], index: 999}).accepted.length, 0);
});

test('design choices agree with the real appearance operations for theme, variant, palette, mode, axis and layout', () => {
  let conflicts = 0, relocates = 0;
  for (const id of ['dashboard-overview', 'saas-landing', 'article', 'agency-home', 'settings']) {
    const doc = fresh(id);
    for (const c of themeChoices(doc)) assert.equal(c.ok, applyOp(doc, 'setTheme', {theme: c.id, palette: 'keep'}).ok, `theme ${c.id}@${id}`);
    for (const c of themeVariantChoices(doc)) assert.equal(c.ok, applyOp(doc, 'setTheme', {theme: doc.theme, palette: 'keep', ...(c.id ? {variant: c.id} : {})}).ok, `variant ${c.id}@${id}`);
    const ps = paletteChoices(doc);
    assert.equal(ps.length, Object.keys(palettes).length);
    for (const c of ps.filter((_, i) => i % 9 === 0)) assert.equal(c.ok, applyOp(doc, 'setPalette', {palette: c.id}).ok, `palette ${c.id}@${id}`);
    for (const c of modeChoices(doc)) assert.equal(c.ok, applyOp(doc, 'setAppearance', {mode: c.id}).ok, `mode ${c.id}@${id}`);
    const ax = axisChoices(doc);
    assert.deepEqual(Object.keys(ax), styleAxes);
    for (const axis of styleAxes) {
      assert.deepEqual(ax[axis].map(c => c.id), axes[axis]);
      for (const c of ax[axis]) {
        const r = applyOp(doc, 'setAppearance', {axes: {[axis]: c.id}});
        assert.equal(c.ok, r.ok, `${axis}=${c.id}@${id}`);
        if (!c.ok) { conflicts++; assert.ok(c.errors.length && c.errors.every(e => e.code && e.message && e.hint), `${axis}=${c.id} reason`); }
      }
    }
    const slots = layoutSlots(doc.tree.children, doc.pageType, {templateId: id});
    const lay = layoutChoices(doc, slots);
    for (const slot of slots) for (const c of lay[slot.id]) {
      const plain = applyOp(doc, 'setLayoutVariant', {slot: slot.id, option: c.id});
      assert.equal(c.ok, plain.ok, `layout ${slot.id}=${c.id}@${id}`);
      if (!c.ok) assert.equal(c.relocate, applyOp(doc, 'setLayoutVariant', {slot: slot.id, option: c.id, contentPolicy: 'relocate'}).ok);
      if (c.relocate) relocates++;
    }
  }
  assert.ok(conflicts > 0, 'the fixtures contain at least one conflicting axis choice, otherwise this test proves nothing');
  assert.ok(relocates > 0, 'agency-home hero split/product are rejected as content-dropping but accepted with relocate');
});

test('design choices: a conflicting combination is flagged before selection, and applying every ok choice leaves the content fingerprint intact', () => {
  // 모든 템플릿에서 실제로 충돌하는 선택이 존재한다(탐사: AXIS_BAN·PAGE_SHELL·THEME_FORBID·NAV_COUNT·LAYOUT_WOULD_DROP_CONTENT).
  const codes = new Set();
  for (const id of Object.keys(templates)) {
    const doc = fresh(id), hash = contentFingerprint(doc).hash;
    for (const [axis, list] of Object.entries(axisChoices(doc))) for (const c of list) {
      if (c.ok) { const r = applyOp(doc, 'setAppearance', {axes: {[axis]: c.id}}); assert.ok(r.ok); assert.equal(contentFingerprint(r.doc).hash, hash); }
      else c.errors.forEach(e => codes.add(e.code));
    }
    for (const c of modeChoices(doc)) if (!c.ok) c.errors.forEach(e => codes.add(e.code));
  }
  assert.ok(codes.has('AXIS_BAN') || codes.has('PAGE_SHELL') || codes.has('THEME_FORBID'), [...codes].join());
});

test('choices never mutate the document and answer a non-object doc with all-disabled lists', () => {
  const doc = fresh('saas-landing'), before = JSON.stringify(doc);
  themeChoices(doc); themeVariantChoices(doc); paletteChoices(doc); modeChoices(doc); axisChoices(doc);
  layoutChoices(doc, layoutSlots(doc.tree.children, doc.pageType, {templateId: 'saas-landing'}));
  assert.equal(JSON.stringify(doc), before);
  assert.ok(themeChoices(null).every(c => !c.ok));
  assert.deepEqual(themeVariantChoices(null), []);
  assert.ok(Object.keys(themes).length === themeChoices(doc).length);
});
