// §6.2 L 계열: 같은 입력이 Core(서비스 함수), REST 실행기, MCP 도구에서 같은 바이트를 낸다.
// REST·MCP는 어댑터라서 조립 로직을 따로 두지 않는다. 이 시험은 실제 어댑터 코드(operations.mjs, mcp.mjs)를 같은 프로세스에서 실행한다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleComponents, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';
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
  'responsive-grid',
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
const REQUEST = {...BASE, layouts: ALL_LAYOUTS.map(component => ({component, props: PROPS}))};

test('layouts: Core, POST /api/v1/platform/assemble-components and assemble_components tool return identical bytes for all 5 L components', async () => {
  const core = assembleComponents(REQUEST);
  assert.equal(core.ok, true, json(core.errors));
  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: REQUEST});
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core), 'REST body is the Core envelope, byte for byte');
  assert.equal(json(await mcp('assemble_components', REQUEST)), json(core), 'MCP structured content is the Core envelope');

  for (const id of ALL_LAYOUTS) {
    assert.ok(core.value.html.includes(`data-component="${id}"`), `${id} reaches output through every channel`);
  }
  assert.equal(core.value.manifest.layoutItems.length, 5);
  assert.ok(core.value.standalone.includes(core.value.script) && core.value.script.includes('window.__kitLayout'), 'standalone export carries the layout runtime');
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
