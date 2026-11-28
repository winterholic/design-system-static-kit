// §6.2 L 5항목의 Blueprint 왕복과 재료 질의. Blueprint를 입력으로 컴파일하면 Core가 낸 마크업이
// 그대로 나오고, 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileBlueprint, validateBlueprint, getComponentSpec, listPlatformMaterials, getPlatformMaterial, getMaterial} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {LAYOUT_COMPONENTS, LAYOUT_COMPONENT_BY_ID, renderLayoutComponent} from '../src/platform/families/contracts.mjs';
import * as edit from '../src/edit/index.mjs';

const env = platformEnv();

const compile = b => {
  const r = compileBlueprint(b, {include: ['html', 'css', 'tokens', 'manifest']});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.value;
};

/** 구형 부품 노드를 넣은 문서. generate-material-coverage.mjs의 isolatedDoc과 같은 방법이다. */
function nodeDoc(node, since = '2.6.0') {
  const made = edit.resetDocument(null, {template: 'about-team', theme: 'workspace'});
  assert.equal(made.ok, true);
  let doc = made.doc;
  if (since === '2.6.0') {
    const up = edit.importBlueprint(null, {blueprint: {...doc, catalogVersion: '2.6.0'}});
    assert.equal(up.ok, true);
    doc = up.doc;
  }
  const index = node.type === 'hero' ? 1 : doc.tree.children.length;
  const ins = edit.insertNode(doc, {parent: [], node, index});
  assert.equal(ins.ok, true, JSON.stringify(ins.errors));
  return ins.doc;
}

const LAYOUT_CASES = {
  'component:responsive-grid': {
    node: {type: 'grid', columns: 'three', children: [{type: 'card', title: '카드 1', body: '본문 1'}, {type: 'card', title: '카드 2', body: '본문 2'}]},
    since: '2.4.0',
    expect: /class="kit-grid"/,
  },
  'component:center': {
    node: {type: 'hero', variant: 'centered', title: '가운데 히어로', body: '본문 내용'},
    since: '2.4.0',
    expect: /hero--centered|data-variant="centered"/,
  },
  'component:sticky-region': {
    node: {type: 'actions', items: [{label: '고정 동작', href: '#main', variant: 'primary'}]},
    since: '2.4.0',
    expect: /고정 동작/,
  },
  'component:scroll-area': {
    node: {type: 'master-detail', title: '받은 메시지', items: [{title: '디자인 리뷰', preview: '내일 오후 2시에 만나요.', state: 'unread'}, {title: '배포 안내', preview: '배포가 완료되었습니다.'}], selected: 0, detail: {title: '디자인 리뷰', meta: '김다선 · 오늘', body: '내일 오후 2시에 디자인 리뷰를 진행합니다.'}},
    since: '2.4.0',
    expect: /class="kit-md"/,
  },
  'component:resizable-panel': {
    node: {type: 'split', ratio: 'even', children: [{type: 'prose', title: '패널 1', body: '왼쪽 내용'}, {type: 'prose', title: '패널 2', body: '오른쪽 내용'}]},
    since: '2.4.0',
    expect: /class="kit-split"/,
  },
};

test('L components: 5 layout components are registered with proper contracts and match specifications', () => {
  assert.equal(LAYOUT_COMPONENTS.length, 5);
  const ids = LAYOUT_COMPONENTS.map(c => c.id).sort();
  assert.deepEqual(ids, [
    'component:center',
    'component:resizable-panel',
    'component:responsive-grid',
    'component:scroll-area',
    'component:sticky-region',
  ]);

  for (const item of LAYOUT_COMPONENTS) {
    assert.ok(LAYOUT_COMPONENT_BY_ID.has(item.id));
    assert.ok(item.requirementId.startsWith('req:comp:l-'));
    assert.ok(item.componentType);
    assert.ok(item.materialId);
    assert.ok(item.blueprint);
  }
});

test('L nodes: layout parts compile from a Blueprint and the same Blueprint gives the same bytes (determinism)', () => {
  for (const item of LAYOUT_COMPONENTS) {
    const {node, since, expect} = LAYOUT_CASES[item.id];
    assert.equal(item.blueprint.node, node.type, `${item.id}: the contract names the node type it uses`);
    const doc = nodeDoc(node, since);
    const first = compile(doc), second = compile(structuredClone(doc));
    assert.deepEqual(second, first, `${item.id}: byte-for-byte determinism`);
    assert.ok(expect.test(first.html), `${item.id}: expected pattern ${expect}`);
    assert.equal(getComponentSpec({type: node.type, ...(since === '2.6.0' ? {catalogVersion: '2.6.0'} : {})}).ok, true, `${item.id}: spec exists in component catalog`);
  }
});

test('L registry query: layout materials are queried consistently via listPlatformMaterials and getPlatformMaterial/getMaterial', () => {
  for (const item of LAYOUT_COMPONENTS) {
    const res = item.materialId.startsWith('layout:')
      ? getPlatformMaterial({id: item.materialId})
      : getMaterial({id: item.materialId});
    assert.equal(res.ok, true, `${item.materialId} query`);
    assert.equal(res.value.id, item.materialId);
  }
  const layoutList = listPlatformMaterials({kind: 'layout', limit: 50});
  assert.equal(layoutList.ok, true);
  assert.equal(layoutList.value.total, 24);
});
