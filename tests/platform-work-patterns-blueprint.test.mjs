import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {assembleComponents} from '../src/service/index.mjs';
import {assembleDesign, compileBlueprint} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';
import {renderPurposeFamily} from '../src/platform/families/index.mjs';
import {ALL_COMPONENT_CONTRACTS} from '../src/platform/families/contracts.mjs';
import {COMPONENT_CLASSIFICATION} from '../src/platform/families/inventory.mjs';

const IDS = [
  'purpose:work.filter-toolbar', 'purpose:work.search-toolbar', 'purpose:work.bulk-action-toolbar',
  'purpose:work.data-summary', 'purpose:work.dashboard-kpi-grid', 'purpose:work.approval-panel',
  'purpose:work.audit-log', 'purpose:work.permission-matrix', 'purpose:work.status-management',
  'purpose:work.settings-form', 'purpose:work.search-result-list', 'purpose:work.user-management-table',
  'purpose:work.task-list', 'purpose:work.workflow-steps', 'purpose:work.comment-thread',
];
const env = platformEnv();
const VISUAL = 'family:quiet';

test('M 업무 패턴 15개가 각자 독립된 purpose 재료로 등록된다', () => {
  assert.equal(typeof assembleComponents, 'function');
  for (const id of IDS) {
    const family = getPurposeFamily(id);
    assert.ok(family, `${id}가 purpose registry에 등록되어야 한다`);
    assert.equal(family.id, id);
    assert.ok(family.bases.length > 0, `${id}는 조합하는 기반 부품을 선언해야 한다`);
    assert.ok(family.entry.module.endsWith('/work-patterns.mjs'));
  }
});

test('M 각 선언 prop은 출력에 반영되고 사용자 문자열은 escape되며 잘못된 값은 거부된다', () => {
  for (const id of IDS) {
    const family = getPurposeFamily(id);
    const request = {visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content, id: `work-${id.split('.').at(-1)}`};
    const base = renderPurposeFamily(env, id, request);
    assert.equal(base.ok, true, `${id}: ${JSON.stringify(base.errors)}`);
    assert.ok(base.html.includes(`data-work-pattern="${id}"`));
    assert.ok(base.html.includes(`data-layout="${family.example.variant.layout}"`));
    assert.ok(base.html.includes(`data-density="${family.example.props.density}"`));
    assert.ok(base.html.includes(`data-state="${family.example.props.state}"`));
    const changed = renderPurposeFamily(env, id, {...request, variant: {layout: 'stacked'}, props: {density: 'compact', state: 'empty'}});
    assert.equal(changed.ok, true, `${id}: ${JSON.stringify(changed.errors)}`);
    assert.ok(changed.html.includes('data-layout="stacked"'));
    assert.ok(changed.html.includes('data-density="compact"'));
    assert.ok(changed.html.includes('role="status"'));
    const hostile = renderPurposeFamily(env, id, {...request, content: {...family.example.content, title: '<img src=x onerror=alert(1)>'}});
    assert.equal(hostile.ok, true, `${id}: ${JSON.stringify(hostile.errors)}`);
    assert.doesNotMatch(hostile.html, /<img\s/);
    assert.match(hostile.html, /&lt;img/);
    const invalid = renderPurposeFamily(env, id, {...request, props: {...family.example.props, density: 'ultra'}});
    assert.equal(invalid.ok, false, `${id} rejects unsupported density`);
    assert.ok(invalid.errors.length);
    const contract = ALL_COMPONENT_CONTRACTS.find(item => item.id === id);
    assert.equal(contract?.layer, 'Composite');
    const key = `m-${String(IDS.indexOf(id) + 1).padStart(2, '0')}-${id.split('.').at(-1)}`;
    assert.equal(COMPONENT_CLASSIFICATION[key], 'composite');
  }
  const permission = getPurposeFamily('purpose:work.permission-matrix');
  const badPermissions = renderPurposeFamily(env, permission.id, {visual: VISUAL, variant: permission.example.variant, props: permission.example.props, content: {...permission.example.content, permissions: [{label: '설정 편집', grants: 'allow'}]}, id: 'bad-permissions'});
  assert.equal(badPermissions.ok, false, 'matrix with a missing role grant is refused');
  const results = getPurposeFamily('purpose:work.search-result-list');
  const badLink = renderPurposeFamily(env, results.id, {visual: VISUAL, variant: results.example.variant, props: results.example.props, content: {...results.example.content, results: [{title: 'unsafe', summary: 'unsafe link', href: 'javascript:alert(1)'}]}, id: 'unsafe-link'});
  assert.equal(badLink.ok, false, 'unsafe URL schemes are refused');
});

test('M 15개를 Blueprint에 넣고 직렬화 왕복 컴파일해 같은 실제 HTML을 만든다', () => {
  const source = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: '기본', value: '0'}, {label: '보조', value: '0'}]}}, {include: ['blueprint']});
  assert.equal(source.ok, true, JSON.stringify(source.errors));
  for (const [i, id] of IDS.entries()) {
    const blueprint = structuredClone(source.value.candidates[0].value.blueprint);
    const family = getPurposeFamily(id);
    blueprint.materials.purposes = [0, 1].map(n => ({id, uid: `work-blueprint-${i}-${n}`, visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content}));
    const grid = blueprint.tree.children.find(node => node.type === 'grid');
    grid.columns = 'two';
    grid.children = [0, 1].map(n => ({type: 'metric', label: `platform-purpose-${n}`, value: '0'}));
    const options = {include: ['html', 'css', 'tokens', 'manifest']};
    const first = compileBlueprint(blueprint, options);
    assert.equal(first.ok, true, `${id}: ${JSON.stringify(first.errors)}`);
    const second = compileBlueprint(JSON.parse(JSON.stringify(blueprint)), options);
    assert.deepEqual(second, first, `${id} is deterministic after JSON serialization`);
    assert.ok(first.value.html.includes(`data-work-pattern="${id}"`), `${id} survives Blueprint compilation`);
  }
});

test('M Core 조립은 duplicate purpose uid를 거부한다', () => {
  const family = getPurposeFamily(IDS[0]);
  const item = {purpose: family.id, visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content, id: 'same-work-id'};
  const result = assembleComponents({context: 'dashboard', items: [item, item]});
  assert.equal(result.ok, false);
  assert.match(JSON.stringify(result.errors), /id가 겹칩니다|duplicate/i);
});

test('M search and task runtime work in a non-browser delegated-event harness', () => {
  const family = getPurposeFamily('purpose:work.task-list');
  const result = assembleComponents({context: 'dashboard', items: [{purpose: family.id, visual: VISUAL, variant: family.example.variant, props: family.example.props, content: {...family.example.content, tasks: [
    {id: 'one', title: '배포 확인', assignee: '민지', due: '오늘', done: false},
    {id: 'two', title: '문서 갱신', assignee: '도윤', due: '내일', done: true},
  ]}}]});
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const listeners = {};
  const document = {addEventListener: (name, fn) => {listeners[name] = fn;}, querySelectorAll: () => []};
  vm.runInNewContext(result.value.script, {window: {}, document});
  const count = {textContent: ''};
  const tasks = [{checked: false}, {checked: true}];
  const root = {querySelectorAll: selector => selector === '[data-work-task]' ? tasks : [], querySelector: selector => selector === '[data-work-task-count]' ? count : null};
  tasks[0].closest = selector => selector === '[data-work-task]' ? tasks[0] : selector === '.pf-work' ? root : null;
  listeners.change({target: {closest: selector => selector === '[data-work-task]' ? tasks[0] : null}});
  assert.equal(count.textContent, '1 / 2개 완료');
  tasks[0].checked = true;
  listeners.change({target: {closest: selector => selector === '[data-work-task]' ? tasks[0] : null}});
  assert.equal(count.textContent, '2 / 2개 완료');

  const searchRows = [{textContent: '권한 정책 변경', hidden: false}, {textContent: '배포 상태', hidden: false}];
  const empty = {hidden: true};
  const searchRoot = {querySelectorAll: selector => selector === '[data-work-row]' ? searchRows : [], querySelector: selector => selector === '[data-work-search-empty]' ? empty : null};
  const searchInput = {value: '배포', closest: selector => selector === '.pf-work' ? searchRoot : null};
  listeners.input({target: {closest: selector => selector === '[data-work-search]' ? searchInput : null}});
  assert.deepEqual(searchRows.map(row => row.hidden), [true, false]);
  assert.equal(empty.hidden, true);
});
