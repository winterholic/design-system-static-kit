// §6.2 A 12항목의 Blueprint 왕복과 재료 질의. Blueprint를 입력으로 컴파일하면 Core(renderPurposeFamily·renderButton)가 낸 마크업이
// 그대로 나오고, 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleDesign, compileBlueprint, validateBlueprint, getComponentSpec, listPlatformMaterials, getPlatformMaterial, recommendMaterials} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {ACTION_COMPONENTS} from '../src/platform/families/contracts.mjs';
import {PURPOSE_RUNTIME_IDS} from '../src/platform/families/action.mjs';
import * as edit from '../src/edit/index.mjs';

const env = platformEnv();
const VISUAL = 'family:quiet';
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));
/** 조립이 만든 대시보드 Blueprint. 격자 칸의 표지 노드(metric platform-purpose-N)가 materials.purposes와 일대일이다. */
const BASE = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: kpis(3)}}, {include: ['blueprint']}).value.candidates[0].value.blueprint;

/** 목적 패밀리 하나를 두 칸(uid a-0, a-1)으로 놓은 Blueprint. 같은 id의 마크업이 겹치지 않도록 uid를 따로 준다. */
function purposeBlueprint(id, {content, variant, props} = {}) {
  const f = getPurposeFamily(id), b = structuredClone(BASE);
  b.materials.purposes = [0, 1].map(i => ({id, visual: VISUAL, uid: `a-${i}`, variant: variant ?? f.example.variant, props: props ?? f.example.props, content: content ?? f.example.content}));
  const grid = b.tree.children.find(n => n.type === 'grid');
  grid.columns = 'two';
  grid.children = [0, 1].map(i => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
  return b;
}
const compile = b => { const r = compileBlueprint(b, {include: ['html', 'css', 'tokens', 'manifest']}); assert.equal(r.ok, true, JSON.stringify(r.errors)); return r.value; };
const core = (id, uid, over = {}) => { const f = getPurposeFamily(id); const r = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: f.example.props, content: f.example.content, id: uid, ...over}); assert.equal(r.ok, true, JSON.stringify(r.errors)); return r.html; };

const PURPOSE_ITEMS = ACTION_COMPONENTS.filter(a => a.blueprint.field === 'materials.purposes');
const NODE_ITEMS = ACTION_COMPONENTS.filter(a => a.blueprint.field === 'tree');

test('A purposes: the Blueprint compiles to the exact markup the Core renders, byte-identically on every run', () => {
  assert.deepEqual(PURPOSE_ITEMS.map(a => a.blueprint.purpose).sort(), ['purpose:button.close', 'purpose:button.copy', 'purpose:button.fab', 'purpose:button.icon', 'purpose:button.loading', 'purpose:button.menu', 'purpose:button.split', 'purpose:button.toggle']);
  for (const item of PURPOSE_ITEMS) {
    const id = item.blueprint.purpose, b = purposeBlueprint(id);
    assert.equal(validateBlueprint(b).ok, true, `${id}: the Blueprint is valid 2.7.0`);
    const first = compile(b), second = compile(structuredClone(b));
    assert.deepEqual(second, first, `${id}: same Blueprint, same bytes`);
    for (const uid of ['a-0', 'a-1']) assert.ok(first.html.includes(core(id, uid)), `${id}/${uid}: the page contains the Core markup`);
    assert.deepEqual(first.manifest.platform.materials.purposes.map(p => p.id), [id, id], `${id}: the manifest records the material`);
    assert.equal(first.html.includes('window.__kitAction'), PURPOSE_RUNTIME_IDS.includes(id), `${id}: the runtime ships exactly when the material needs it`);
  }
});

test('A purposes: the Blueprint content drives the output (a different label draws a different page)', () => {
  for (const id of ['purpose:button.split', 'purpose:button.copy', 'purpose:button.close', 'purpose:button.fab']) {
    const f = getPurposeFamily(id);
    const key = id === 'purpose:button.close' ? 'message' : 'label';
    const changed = {...f.example.content, [key]: '완전히 다른 문구'};
    const html = compile(purposeBlueprint(id, {content: changed})).html;
    assert.ok(html.includes('완전히 다른 문구'), id);
    assert.ok(html.includes(core(id, 'a-0', {content: changed})), `${id}: still the Core markup for the new content`);
  }
});

test('A purposes: a menu without items is refused with a diagnostic instead of drawing an empty popup', () => {
  for (const id of ['purpose:button.menu', 'purpose:button.split']) {
    const f = getPurposeFamily(id);
    const {items: _drop, ...noItems} = f.example.content;
    const r = compileBlueprint(purposeBlueprint(id, {content: noItems}), {include: ['html']});
    assert.equal(r.ok, false, id);
    assert.ok(r.errors.some(e => /items|항목|필수 콘텐츠/.test(e.message)), `${id}: ${JSON.stringify(r.errors)}`);
  }
  const unknown = purposeBlueprint('purpose:button.menu');
  unknown.materials.purposes[0].id = 'purpose:button.nope';
  const r = compileBlueprint(unknown, {include: ['html']});
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.code === 'MATERIALS_UNKNOWN'), JSON.stringify(r.errors));
});

/** 구형 부품 노드를 넣은 문서. generate-material-coverage.mjs의 isolatedDoc과 같은 방법이다(2.6.0 부품은 2.6.0 문서가 필요). */
function nodeDoc(node, since) {
  const made = edit.resetDocument(null, {template: 'about-team', theme: 'workspace'});
  assert.equal(made.ok, true);
  let doc = made.doc;
  if (since === '2.6.0') { const up = edit.importBlueprint(null, {blueprint: {...doc, catalogVersion: '2.6.0'}}); assert.equal(up.ok, true); doc = up.doc; }
  const ins = edit.insertNode(doc, {parent: [], node, index: doc.tree.children.length});
  assert.equal(ins.ok, true, JSON.stringify(ins.errors));
  return ins.doc;
}
const NODE_CASES = {
  'component:button': {node: {type: 'button-control', id: 'go', label: '이동'}, since: '2.6.0', expect: /<button class="kit-ctl-button" id="ctl-id-go"[^>]*data-appearance="solid"/},
  'component:link-button': {node: {type: 'button-control', id: 'go', label: '이동', appearance: 'link'}, since: '2.6.0', expect: /<button class="kit-ctl-button" id="ctl-id-go"[^>]*data-appearance="link"/},
  'component:segmented-control': {node: {type: 'tabs-control', id: 'view-tabs', label: '보기', appearance: 'segmented', selected: 'a', tabs: [{id: 'a', label: '목록', content: '목록 보기'}, {id: 'b', label: '격자', content: '격자 보기'}]}, since: '2.6.0', expect: /data-appearance="segmented"/},
  'component:button-group': {node: {type: 'actions', items: [{label: '저장', href: '#main', variant: 'primary'}, {label: '취소', href: '#main', variant: 'secondary'}]}, since: '2.4.0', expect: /저장[\s\S]*취소/},
};

test('A nodes: the legacy parts compile from a Blueprint and the same Blueprint gives the same bytes', () => {
  assert.deepEqual(NODE_ITEMS.map(a => a.id).sort(), Object.keys(NODE_CASES).sort());
  for (const item of NODE_ITEMS) {
    const {node, since, expect} = NODE_CASES[item.id];
    assert.equal(item.blueprint.node, node.type, `${item.id}: the contract names the node type it uses`);
    for (const [axis, value] of Object.entries(item.blueprint.axes)) assert.equal(node[axis], value, `${item.id}: ${axis}`);
    const doc = nodeDoc(node, since);
    const first = compile(doc), second = compile(structuredClone(doc));
    assert.deepEqual(second, first, item.id);
    assert.ok(expect.test(first.html), `${item.id}: expected ${expect}`);
    assert.equal(getComponentSpec({type: node.type, ...(since === '2.6.0' ? {catalogVersion: '2.6.0'} : {})}).ok, true, `${item.id}: the node type is in the component catalog`);
  }
});

test('A registry query: every A material is found by listPlatformMaterials/getPlatformMaterial with its contract, bases and example', () => {
  const listed = listPlatformMaterials({kind: 'purpose-family', query: 'button', limit: 100});
  assert.equal(listed.ok, true);
  const ids = listed.value.items.map(x => x.id);
  for (const item of PURPOSE_ITEMS) assert.ok(ids.includes(item.blueprint.purpose), `${item.blueprint.purpose} is listed`);
  assert.equal(listed.value.total, 12, 'seven earlier button families and the five A families');
  for (const id of ['purpose:button.split', 'purpose:button.menu', 'purpose:button.fab', 'purpose:button.copy', 'purpose:button.close']) {
    const got = getPlatformMaterial({id});
    assert.equal(got.ok, true, id);
    assert.equal(got.value.kind, 'purpose-family');
    assert.deepEqual(got.value.bases, ['base-component:button-control']);
    assert.ok(got.value.example.content && got.value.a11y.conditions.length >= 3, id);
    assert.ok(got.value.edges.from.some(e => e.type === 'requires' && e.to === 'base-component:button-control'), `${id}: requires the base button`);
    assert.equal(got.value.quality.status, 'implemented');
  }
  const ranked = recommendMaterials({kind: 'purpose-family', context: 'dashboard', density: 'comfortable'});
  assert.equal(ranked.ok, true);
  const rankedIds = [...ranked.value.ranked.map(x => x.id), ...ranked.value.blocked.map(x => x.id)];
  for (const id of ['purpose:button.split', 'purpose:button.menu', 'purpose:button.copy']) assert.ok(rankedIds.includes(id), `${id} is recommendable`);
});
