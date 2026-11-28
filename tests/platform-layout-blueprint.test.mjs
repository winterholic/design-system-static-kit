// §6.2 L 5항목의 Blueprint 왕복과 재료 질의. Blueprint를 입력으로 컴파일하면 Core가 낸 마크업이
// 그대로 나오고, 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileBlueprint, validateBlueprint, getComponentSpec, listPlatformMaterials, getPlatformMaterial, getMaterial} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {LAYOUT_COMPONENTS, LAYOUT_COMPONENT_BY_ID, ALL_COMPONENT_CONTRACTS, renderLayoutComponent} from '../src/platform/families/contracts.mjs';
import {layoutRuntimeFor} from '../src/platform/families/layout.mjs';
import {assembleSpecimen} from '../src/platform/layouts.mjs';
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
    expect: /data-variant="centered"/,
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

test('§6.2 L: every covered row has a material with a passing rendered-output probe', () => {
  const manifest = JSON.parse(readFileSync(new URL('../docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', import.meta.url), 'utf8'));
  const materials = new Map(manifest.materials.map(material => [material.id, material]));
  const rows = manifest.requirements.filter(row => row.section === '§6.2 L');
  assert.equal(rows.length, 14, 'REQUEST §6.2 L has 14 rows');
  assert.deepEqual(rows.filter(row => row.coverage === 'missing').map(row => row.name).sort(), ['Container', 'Resizable Panel', 'Stack'], 'only rows without a semantically matching material remain missing');
  for (const row of rows) {
    if (row.coverage === 'missing') {
      assert.deepEqual(row.materialIds, [], `${row.name}: missing rows do not claim a material`);
      continue;
    }
    assert.ok(row.materialIds.length, `${row.name}: covered rows have a material`);
    for (const id of row.materialIds) {
      const material = materials.get(id);
      assert.ok(material, `${row.name}: ${id} exists in Manifest`);
      assert.equal(material.evidence?.probe?.ran, true, `${row.name}: ${id} ran a rendered-output probe`);
      assert.equal(material.evidence?.probe?.ok, true, `${row.name}: ${id} rendered into output`);
      assert.ok(material.evidence?.outputHash, `${row.name}: ${id} has output evidence`);
    }
  }
});

test('the four reused E3 layout mappings render their named layout behavior', () => {
  const cases = [
    ['layout:equal-grid', ['data-layout="equal-grid"', 'data-flow="grid"'], ['grid-template-columns']],
    ['layout:centered-hero', ['data-layout="centered-hero"'], ['justify-content:center']],
    ['layout:sticky-action-layout', ['data-layout="sticky-action-layout"'], ['position:sticky', 'bottom:0']],
    ['layout:master-detail', ['data-layout="master-detail"'], ['max-height:min(70vh,40rem)', 'overflow:auto']],
  ];
  for (const [id, htmlFragments, cssFragments] of cases) {
    const output = assembleSpecimen(env, id);
    assert.equal(output.ok, true, `${id} assembles from its registered E3 material`);
    for (const fragment of htmlFragments) assert.ok(output.value.html.includes(fragment), `${id} HTML contains ${fragment}`);
    for (const fragment of cssFragments) assert.ok(output.value.css.includes(fragment), `${id} CSS contains ${fragment}`);
  }
});

test('L renderers consume declared values, escape user content, and include runtime only for resizable panels', () => {
  const contracts = new Map(ALL_COMPONENT_CONTRACTS.map(contract => [contract.id, contract]));
  const declaredProps = {
    'component:responsive-grid': ['items'],
    'component:center': ['content', 'label'],
    'component:sticky-region': ['content', 'label'],
    'component:scroll-area': ['content', 'label'],
    'component:resizable-panel': ['direction', 'first', 'label', 'left', 'right', 'second', 'value'],
  };
  for (const [id, expected] of Object.entries(declaredProps)) {
    assert.deepEqual(Object.keys(contracts.get(id).props).sort(), expected, `${id} contract lists exactly the renderer inputs`);
    assert.deepEqual(Object.keys(contracts.get(id).content), [], `${id} does not declare a separate content object the renderer never reads`);
  }
  const cases = [
    ['component:responsive-grid', {items: ['<b>grid</b>']}, ['data-component="component:responsive-grid"', '&lt;b&gt;grid&lt;/b&gt;']],
    ['component:center', {content: '<b>center</b>'}, ['data-component="component:center"', '&lt;b&gt;center&lt;/b&gt;']],
    ['component:sticky-region', {content: '<b>sticky</b>'}, ['data-component="component:sticky-region"', '&lt;b&gt;sticky&lt;/b&gt;']],
    ['component:scroll-area', {content: '<b>scroll</b>'}, ['data-component="component:scroll-area"', '&lt;b&gt;scroll&lt;/b&gt;']],
    ['component:resizable-panel', {id: 'panel" onfocus="x', direction: 'vertical', value: 35, first: '<b>first</b>', second: '<b>second</b>', label: '<b>resize</b>'}, ['data-component="component:resizable-panel"', 'data-direction="vertical"', 'aria-valuenow="35"', 'aria-orientation="horizontal"', 'flex:0 0 35%', 'flex:0 0 65%', '&lt;b&gt;first&lt;/b&gt;', '&lt;b&gt;second&lt;/b&gt;', 'aria-label="&lt;b&gt;resize&lt;/b&gt;"', 'id="panel&quot; onfocus=&quot;x"']],
  ];
  for (const [id, props, expected] of cases) {
    const html = renderLayoutComponent(id, props);
    for (const fragment of expected) assert.ok(html.includes(fragment), `${id} renders ${fragment}`);
    assert.ok(!html.includes('<b>'), `${id} escapes user HTML`);
  }
  assert.match(renderLayoutComponent('component:resizable-panel'), /data-resizable-handle/);
  for (const id of ['component:center', 'component:sticky-region', 'component:scroll-area']) {
    assert.ok(renderLayoutComponent(id, {label: `${id} label`}).includes(`${id} label`), `${id} reads the declared label fallback`);
  }
  const aliases = renderLayoutComponent('component:resizable-panel', {left: 'left alias', right: 'right alias'});
  assert.ok(aliases.includes('left alias') && aliases.includes('right alias'), 'resizable panel reads its left/right aliases');
  assert.equal(layoutRuntimeFor(['component:center']), '', 'non-interactive layouts do not receive the resize runtime');
  assert.match(layoutRuntimeFor(['component:resizable-panel']), /kit-panel-resize/);
  assert.throws(() => renderLayoutComponent('component:resizable-panel', {value: 'not-a-number'}), /finite number/i);
  assert.throws(() => renderLayoutComponent('component:resizable-panel', {direction: 'diagonal'}), /direction.*horizontal.*vertical/i);
});
