import {test} from 'node:test';
import assert from 'node:assert/strict';
import {templates, composeBlueprint, variantContracts, layoutSlots} from '../src/catalog.mjs';
import {assessOption} from '../src/catalog/variant-contracts.mjs';
import {checkDocument, applySequence, checkSequence, GRADES, updateNode, setLayoutVariant} from '../src/edit/index.mjs';

const doc = id => composeBlueprint(id, undefined, undefined, {lossless: true}).blueprint;
const grades = list => [...new Set(list.map(e => e.grade))];

test('grades: strong contracts are errors, context-quality rules are warnings, diagnostics are info', () => {
  assert.deepEqual(GRADES, {strong: 'error', quality: 'warning', diagnostic: 'info'});
  const r = checkDocument(doc('saas-landing'));
  assert.equal(r.ok, true); assert.equal(r.level, 'pass'); assert.deepEqual(r.errors, []);
  assert.deepEqual(grades(r.diagnostics), ['diagnostic']); assert.ok(r.diagnostics.every(d => d.severity === 'info'));
  assert.ok(r.diagnostics.some(d => d.code === 'COMPOSITION') && r.diagnostics.some(d => d.code === 'FINGERPRINT'));
});

test('strong: data loss against the starting document, schema, accessibility and required structure each fail with their own category', () => {
  const base = doc('article');
  const lost = structuredClone(base); lost.tree.children[0].title = '다른 제목';
  const data = checkDocument(lost, {base});
  assert.equal(data.ok, false); assert.equal(data.level, 'fail');
  assert.deepEqual(data.errors.map(e => [e.category, e.code, e.grade, e.severity]).slice(0, 2), [['data', 'CONTENT_LOSS', 'strong', 'error'], ['data', 'CONTENT_DRIFT', 'strong', 'error']]);
  const schema = structuredClone(base); schema.css = 'x';
  assert.deepEqual(checkDocument(schema).errors.map(e => [e.category, e.code]), [['schema', 'UNKNOWN_KEY']]);
  const a11y = structuredClone(base); a11y.chrome.action = {label: '여기', href: '#main'};
  assert.ok(checkDocument(a11y).errors.some(e => e.category === 'a11y' && e.code === 'LINK_LABEL'));
  const structure = structuredClone(base); structure.tree.children.shift();
  assert.ok(checkDocument(structure).errors.some(e => e.category === 'structure' && e.code === 'PAGE_HEADER'));
  const failing = checkDocument(structure);
  assert.deepEqual(failing.warnings, []); assert.deepEqual(failing.diagnostics.map(d => d.code), ['FINGERPRINT'], 'an invalid document is not compiled');
});

test('quality: variant result contracts and residual page rules are warnings that do not make the document fail', () => {
  const base = doc('saas-landing');
  const r = checkSequence(base, [{op: 'setLayoutVariant', args: {slot: 'hero', option: 'centered'}}, {op: 'setLayoutVariant', args: {slot: 'cards', option: 'outline'}}]);
  assert.equal(r.applied, true); assert.equal(r.ok, true); assert.equal(r.level, 'quality');
  assert.deepEqual(r.errors, []);
  const w = r.warnings.find(x => x.code === 'VARIANT_CONTRACT');
  assert.ok(w && w.grade === 'quality' && w.severity === 'warning' && w.ruleId === 'V01' && variantContracts.some(c => c.id === w.ruleId));
  assert.equal(r.content.preserved, true);
  const sparse = checkDocument(doc('devtool-landing'));
  assert.ok(sparse.warnings.some(x => x.code === 'PAGE_BENTO_SPARSE' && x.category === 'page-rule' && x.ruleId === 'P04'));
  assert.equal(sparse.ok, true);
  assert.ok(checkDocument(doc('product-landing')).diagnostics.some(d => d.ruleId === 'P03'), 'applied page decisions are diagnostics');
});

test('sequences: all-or-nothing, and the integrated check sees losses that a single step would not (cumulative drift)', () => {
  const base = doc('agency-home');
  const failing = applySequence(base, [{op: 'setLayoutVariant', args: {slot: 'cards', option: 'outline'}}, {op: 'setLayoutVariant', args: {slot: 'hero', option: 'split'}}, {op: 'setPalette', args: {palette: 'x'}}]);
  assert.equal(failing.ok, false); assert.equal(failing.failedAt, 1); assert.equal(failing.doc, base); assert.equal(failing.errors[0].code, 'LAYOUT_WOULD_DROP_CONTENT');
  const bad = checkSequence(base, [{op: 'setTheme', args: {theme: 'console'}}, {op: 'explode'}]);
  assert.equal(bad.ok, false); assert.equal(bad.applied, false); assert.equal(bad.failedAt, 1); assert.equal(bad.errors[0].code, 'UNKNOWN_OP');
  const ok = checkSequence(base, [{op: 'setTheme', args: {theme: 'console'}}, {op: 'setLayoutVariant', args: {slot: 'hero', option: 'split', contentPolicy: 'relocate'}}]);
  assert.equal(ok.ok, true); assert.equal(ok.content.preserved, true);
  // 편집 연산이 끼면 콘텐츠가 바뀌는 것이 정상이므로, 모양 연산만 거친 구간을 base로 잡을 때 보존이 계약이다.
  const edited = updateNode(base, {path: [0], set: {title: '고침'}}).doc;
  const drift = checkDocument(edited, {base});
  assert.equal(drift.ok, false); assert.ok(drift.errors.some(e => e.code === 'CONTENT_LOSS'));
  assert.equal(setLayoutVariant(edited, {slot: 'cards', option: 'filled'}).content.preserved, true);
});

test('V06 and the edit-layer hero facts policy are one rule: V06 flags exactly the options the edit layer refuses, and relocation (content kept) is not a V06 finding', () => {
  let flagged = 0;
  for (const id of Object.keys(templates)) {
    const d = doc(id), hero = layoutSlots(d.tree.children, d.pageType).find(s => s.id === 'hero');
    for (const o of hero?.options ?? []) {
      const v06 = o.rules.some(r => r.id === 'V06'), plain = setLayoutVariant(d, {slot: 'hero', option: o.id});
      assert.equal(v06, !plain.ok && plain.errors[0].code === 'LAYOUT_WOULD_DROP_CONTENT', `${id} hero=${o.id}`);
      if (!v06) continue;
      flagged++;
      const moved = setLayoutVariant(d, {slot: 'hero', option: o.id, contentPolicy: 'relocate'});
      assert.ok(moved.ok && moved.content.preserved);
      assert.ok(!moved.warnings.some(w => w.ruleId === 'V06'), `${id} hero=${o.id}: facts were relocated, not lost`);
      assert.equal(checkSequence(d, [{op: 'setLayoutVariant', args: {slot: 'hero', option: o.id, contentPolicy: 'relocate'}}]).warnings.some(w => w.ruleId === 'V06'), false);
    }
  }
  assert.ok(flagged >= 10, 'V06 options exercised: ' + flagged);
  // 카탈로그 계층의 동작은 그대로다: 지문 증명이 없으면 V06은 기존대로 걸린다.
  const d = doc('agency-home'), tree = d.tree.children, after = structuredClone(tree); delete after[1].facts; after[1].variant = 'split';
  assert.deepEqual(assessOption({before: tree, after, slotId: 'hero', optionId: 'split'}).map(f => f.id), ['V06']);
  assert.deepEqual(assessOption({before: tree, after, slotId: 'hero', optionId: 'split', contentPreserved: true}).map(f => f.id), []);
  assert.deepEqual(assessOption({before: tree, after, slotId: 'hero', optionId: 'split', contentPreserved: false}).map(f => f.id), ['V06']);
});
