// §6.2 L 계열: 같은 입력이 Core(서비스 함수), REST 실행기, MCP 도구에서 같은 바이트를 낸다.
// REST·MCP는 어댑터라서 조립 로직을 따로 두지 않는다. 이 시험은 실제 어댑터 코드(operations.mjs, mcp.mjs)를 같은 프로세스에서 실행한다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleComponents, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';
import {LAYOUT_COMPONENT_BY_ID} from '../src/platform/families/contracts.mjs';
import {mcpConnect, rest} from './channel-support.mjs';

let client;
before(async () => { client = await mcpConnect('modern'); });
after(async () => { await client.close(); });

const json = x => JSON.stringify(x);
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
const BASE = {
  context: 'dashboard',
  mode: 'light',
  density: 'comfortable',
  palette: 'palette:static-kit',
  subtokenSet: 'subtoken-set:standard',
  typeSystem: 'type-system:tech-erp',
  items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '계속'}}],
};
const ALL_LAYOUTS = [
  'stack',
  'responsive-grid',
  'container',
  'center',
  'sticky-region',
  'scroll-area',
  'resizable-panel',
].map(name => `component:${name}`);

const PROPS = {
  label: '배치 영역',
  content: '테스트 콘텐츠',
  direction: 'horizontal',
  value: 40,
  first: '좌측 패널',
  second: '우측 패널',
  items: [{content: '항목 1'}, {content: '항목 2'}],
};
const layoutProps = component => component === 'component:stack' ? {gap: 'near', align: 'center', items: ['Stack 1', 'Stack 2']}
  : component === 'component:container' ? {width: 'narrow', content: 'Container content'}
    : component === 'component:resizable-panel' ? {direction: 'horizontal', value: 40, first: '좌측 패널', second: '우측 패널', label: '크기 조절'} : PROPS;
const REQUEST = {...BASE, layouts: ALL_LAYOUTS.map(component => ({component, props: layoutProps(component)}))};

test('layout Blueprint JSON round-trip preserves all three new L components and deterministic output', () => {
  const blueprint = {schema: 'platform-layout-blueprint/1', layouts: ['component:stack', 'component:container', 'component:resizable-panel'].map(component => ({component, props: layoutProps(component)}))};
  const restored = JSON.parse(JSON.stringify(blueprint));
  for (const component of restored.layouts) {
    const contract = LAYOUT_COMPONENT_BY_ID.get(component.component);
    assert.deepEqual(contract.blueprint, {field: 'layouts', component: component.component});
    assert.equal(contract.materialId, component.component);
  }
  const request = {...BASE, layouts: restored.layouts};
  const first = assembleComponents(request), second = assembleComponents({...BASE, layouts: JSON.parse(JSON.stringify(restored.layouts))});
  assert.equal(first.ok, true, json(first.errors));
  assert.deepEqual(second, first, 'round-tripped layout Blueprint yields the same full export');
  assert.deepEqual(first.value.manifest.layoutItems.map(item => item.component), blueprint.layouts.map(item => item.component));
  assert.ok(first.value.html.includes('data-gap="near"') && first.value.html.includes('data-width="narrow"') && first.value.html.includes('data-resizable-handle'));
});

test('layouts: Core, REST and MCP return identical bytes for all 7 registered L components', async () => {
  const core = assembleComponents(REQUEST);
  assert.equal(core.ok, true, json(core.errors));
  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: REQUEST});
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core), 'REST body is the Core envelope, byte for byte');
  assert.equal(json(await mcp('assemble_components', REQUEST)), json(core), 'MCP structured content is the Core envelope');

  for (const id of ALL_LAYOUTS) {
    assert.ok(core.value.html.includes(`data-component="${id}"`), `${id} reaches output through every channel`);
  }
  assert.equal(core.value.manifest.layoutItems.length, 7);
  assert.ok(core.value.html.includes('data-gap="near"'), 'Stack props reach the output');
  assert.ok(core.value.html.includes('data-width="narrow"'), 'Container props reach the output');
  assert.ok(core.value.html.includes('aria-valuenow="40"'), 'Resizable Panel props reach the output');
  assert.ok(core.value.script.includes('window.__kitLayout'), 'resizable panel adds the interaction runtime');
  assert.ok(core.value.standalone.includes(core.value.script), 'standalone export carries the script');
  const withoutLayouts = assembleComponents(BASE);
  assert.equal(withoutLayouts.value.script.includes('window.__kitLayout'), false, 'outputs without a resizable panel omit its runtime');
  const staticLayout = assembleComponents({...BASE, layouts: [{component: 'component:stack', props: {items: ['한 칸']}}]});
  assert.equal(staticLayout.value.script.includes('window.__kitLayout'), false, 'static layout components omit the resize runtime');
});

test('layouts: a different input changes output through every channel', async () => {
  const none = assembleComponents(BASE);
  const some = assembleComponents({...BASE, layouts: [{component: 'component:resizable-panel', props: {value: 30}}]});
  assert.notEqual(json(none), json(some));
  assert.ok(!none.value.html.includes('aria-valuenow'));

  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: {...BASE, layouts: [{component: 'component:resizable-panel', props: {value: 30}}]}});
  assert.ok(viaRest.json.value.html.includes('aria-valuenow="30"'), 'REST renders requested layout component');
  const viaMcp = await mcp('assemble_components', {...BASE, layouts: [{component: 'component:resizable-panel', props: {value: 30}}]});
  assert.ok(viaMcp.value.html.includes('aria-valuenow="30"'), 'MCP renders requested layout component');
  assert.equal(viaRest.text, json(some));
});

test('layouts: input the service rejects yields the same diagnostic everywhere (unregistered component, duplicate id)', async () => {
  const cases = [
    {...BASE, layouts: [{component: 'component:unknown-layout', props: {label: 'x'}}]},
    {...BASE, layouts: [{component: 'component:center', props: {id: 'same'}}, {component: 'component:center', props: {id: 'same'}}]},
    {...BASE, layouts: [{component: 'component:resizable-panel', props: {value: 'not-a-number'}}]},
    {...BASE, layouts: [{component: 'component:stack', props: {gap: 'huge'}}]},
    {...BASE, layouts: [{component: 'component:container', props: {width: 'viewport'}}]},
  ];
  for (const request of cases) {
    const core = assembleComponents(request);
    assert.equal(core.ok, false);
    const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
    assert.equal(viaRest.status, 400);
    assert.deepEqual(viaRest.json.errors.map(e => [e.code, e.path]), core.errors.map(e => [e.code, e.path]), 'REST reports Core diagnostics');
    const call = await client.callTool({name: 'assemble_components', arguments: request});
    assert.equal(call.isError, true);
    assert.deepEqual(call.structuredContent.errors.map(e => [e.code, e.path]), core.errors.map(e => [e.code, e.path]), 'MCP reports Core diagnostics');
  }
});
