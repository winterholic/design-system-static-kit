// §6.2 A 계열: 같은 입력이 Core(서비스 함수), REST 실행기, MCP 도구에서 같은 바이트를 낸다.
// REST·MCP는 어댑터라서 조립 로직을 따로 두지 않는다. 이 시험은 실제 어댑터 코드(operations.mjs, mcp.mjs)를 같은 프로세스에서 실행한다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleComponents, assembleDesign, compileBlueprint, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';
import {mcpConnect, rest} from './channel-support.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

let client;
before(async () => { client = await mcpConnect('modern'); });
after(async () => { await client.close(); });

const json = x => JSON.stringify(x);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
const BASE = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '계속'}}]};
const ALL = ['button', 'icon-button', 'link-button', 'toggle-button', 'split-button', 'menu-button', 'floating-action-button', 'button-group', 'segmented-control', 'copy-button', 'close-button', 'loading-action-button'].map(name => `component:${name}`);
const PROPS = {label: '내보내기', ariaLabel: '내보내기', icon: 'plus', text: 'copy-me', copiedLabel: '복사했습니다.', items: [{label: 'PDF', value: 'pdf'}, {label: 'CSV', value: 'csv'}]};
const REQUEST = {...BASE, actions: ALL.map(component => ({component, props: PROPS}))};

test('actions: Core, POST /api/v1/platform/assemble-components and the assemble_components tool return identical bytes for all twelve A components', async () => {
  const core = assembleComponents(REQUEST);
  assert.equal(core.ok, true, json(core.errors));
  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: REQUEST});
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core), 'REST body is the Core envelope, byte for byte');
  assert.equal(json(await mcp('assemble_components', REQUEST)), json(core), 'MCP structured content is the Core envelope');
  for (const id of ALL) assert.ok(core.value.html.includes(`data-component="${id}"`), `${id} reaches the output through every channel`);
  assert.equal(core.value.manifest.actionItems.length, 12);
  assert.ok(core.value.standalone.includes(core.value.script) && core.value.script.includes('window.__kitAction'), 'the standalone export carries the runtime');
});

test('actions: a different input changes the output through every channel (the channels do not ignore the actions argument)', async () => {
  const none = assembleComponents(BASE), some = assembleComponents({...BASE, actions: [{component: 'component:copy-button', props: {label: '복사', text: 'x'}}]});
  assert.notEqual(json(none), json(some));
  assert.ok(!none.value.html.includes('data-copy-text'));
  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: {...BASE, actions: [{component: 'component:copy-button', props: {label: '복사', text: 'x'}}]}});
  assert.ok(viaRest.json.value.html.includes('data-copy-text="x"'), 'REST renders the requested action');
  const viaMcp = await mcp('assemble_components', {...BASE, actions: [{component: 'component:copy-button', props: {label: '복사', text: 'x'}}]});
  assert.ok(viaMcp.value.html.includes('data-copy-text="x"'), 'MCP renders the requested action');
  assert.equal(viaRest.text, json(some));
});

test('actions: input the service rejects is the same diagnostic everywhere (unregistered component, menu without items)', async () => {
  const cases = [
    {...BASE, actions: [{component: 'component:script', props: {label: 'x'}}]},
    {...BASE, actions: [{component: 'component:menu-button', props: {label: '메뉴'}}]},
  ];
  for (const request of cases) {
    const core = assembleComponents(request);
    assert.equal(core.ok, false);
    const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
    assert.equal(viaRest.status, 400);
    assert.deepEqual(viaRest.json.errors.map(e => [e.code, e.path]), core.errors.map(e => [e.code, e.path]), 'REST reports the Core diagnostics');
    const call = await client.callTool({name: 'assemble_components', arguments: request});
    assert.equal(call.isError, true);
    assert.deepEqual(call.structuredContent.errors.map(e => [e.code, e.path]), core.errors.map(e => [e.code, e.path]), 'MCP reports the Core diagnostics');
  }
});

test('actions: input outside the channel schema is refused by REST and MCP before it reaches the service (13 actions)', async () => {
  const request = {...BASE, actions: Array.from({length: 13}, () => ({component: 'component:button', props: {label: 'a'}}))};
  assert.equal(assembleComponents(request).ok, false, 'Core refuses it too');
  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
  assert.ok(viaRest.status >= 400 && viaRest.status < 500, `REST status ${viaRest.status}`);
  const call = await client.callTool({name: 'assemble_components', arguments: request});
  assert.equal(call.isError, true, 'MCP rejects the 13th action');
});

test('A purposes: the items input renders the same bytes on every channel, and the Blueprint compiles the same way through POST /api/v1/compile and compile_design', async () => {
  const items = [
    {purpose: 'purpose:button.split', visual: 'family:quiet', content: {label: '내보내기', items: [{label: 'PDF'}, {label: 'CSV'}]}},
    {purpose: 'purpose:button.copy', visual: 'family:bold', content: {label: '복사', text: 'abc'}},
    {purpose: 'purpose:button.close', visual: 'family:editorial', content: {message: '닫을 수 있는 안내'}},
    {purpose: 'purpose:button.fab', visual: 'family:soft', content: {label: '추가', icon: 'plus'}},
  ];
  const core = assembleComponents({...BASE, items});
  assert.equal(core.ok, true, json(core.errors));
  assert.equal((await rest('POST', '/api/v1/platform/assemble-components', {body: {...BASE, items}})).text, json(core));
  assert.equal(json(await mcp('assemble_components', {...BASE, items})), json(core));

  // Blueprint 왕복: 조립이 만든 대시보드 Blueprint의 목적 패밀리 칸을 A 계열로 바꿔 세 경로로 컴파일한다.
  const kpis = Array.from({length: 3}, (_, i) => ({label: `지표 ${i + 1}`, value: String(i)}));
  const bp = structuredClone(assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis}}, {include: ['blueprint']}).value.candidates[0].value.blueprint);
  bp.materials.purposes = ['purpose:button.split', 'purpose:button.menu', 'purpose:button.copy'].map((id, i) => ({id, visual: 'family:quiet', uid: `a-${i}`, variant: getPurposeFamily(id).example.variant, props: getPurposeFamily(id).example.props, content: getPurposeFamily(id).example.content}));
  const opts = {include: ['html', 'css', 'tokens', 'manifest']};
  // REST와 MCP 어댑터는 manifest.integrity를 채우려고 sha256을 넘긴다. Core 호출도 같은 해시 함수를 넘겨야 같은 봉투가 된다.
  const direct = compileBlueprint(bp, {...opts, hash: {algorithm: 'sha256', digest: sha256}});
  assert.equal(direct.ok, true, json(direct.errors));
  const viaRest = await rest('POST', '/api/v1/compile', {body: {blueprint: bp, ...opts}});
  assert.equal(viaRest.text, json(direct), 'REST compile equals Core compile');
  assert.equal(json(await mcp('compile_design', {blueprint: bp, ...opts, html: 'full'})), json(direct), 'MCP compile equals Core compile');
  assert.ok(direct.value.html.includes('window.__kitAction'));
});

test('A registry query: list_platform_materials and get_platform_material answer like the Core for the A families', async () => {
  const query = {kind: 'purpose-family', query: 'button', limit: 100};
  const core = listPlatformMaterials(query);
  assert.equal(core.value.total, 12);
  const viaRest = await rest('GET', '/api/v1/platform/materials?kind=purpose-family&query=button&limit=100');
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core), 'REST list equals the Core list');
  assert.equal(json(await mcp('list_platform_materials', query)), json(core));
  for (const id of ['purpose:button.split', 'purpose:button.menu', 'purpose:button.fab', 'purpose:button.copy', 'purpose:button.close']) {
    assert.equal(json(await mcp('get_platform_material', {id})), json(getPlatformMaterial({id})), id);
    assert.equal((await rest('GET', `/api/v1/platform/materials/${id}`)).text, json(getPlatformMaterial({id})), id);
  }
});
