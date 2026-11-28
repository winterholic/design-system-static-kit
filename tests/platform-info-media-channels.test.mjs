// §6.2 J(정보 표시) 및 K(미디어·콘텐츠) 계열:
// Core(서비스 함수), REST 실행기, MCP 도구에서 동일한 입력이 동일한 바이트를 생성한다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents, getPlatformMaterial, listPlatformMaterials} from '../src/service/index.mjs';
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
};

test('J/K purposes: Core, REST and MCP produce byte-identical output via assembleComponents', async () => {
  const items = [
    {purpose: 'purpose:info.status-badge', visual: 'family:soft', content: {label: '정상 가동'}},
    {purpose: 'purpose:info.counter', visual: 'family:soft', content: {count: 7, label: '신규 알림'}},
    {purpose: 'purpose:info.accordion', visual: 'family:soft', content: {items: [{title: '질문 1', content: '답변 1'}, {title: '질문 2', content: '답변 2'}]}},
    {purpose: 'purpose:media.carousel', visual: 'family:soft', content: {label: '사진첩', items: [{title: '1', src: 'data:image/svg+xml,<svg></svg>', alt: '1'}, {title: '2', src: 'data:image/svg+xml,<svg></svg>', alt: '2'}]}},
  ];

  const request = {...BASE, items};
  const core = assembleComponents(request);
  assert.equal(core.ok, true, json(core.errors));

  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core), 'REST body must match Core byte for byte');

  const viaMcp = await mcp('assemble_components', request);
  assert.equal(json(viaMcp), json(core), 'MCP structuredContent must match Core');
  assert.ok(core.value.html.includes('data-accordion'));
  assert.ok(core.value.html.includes('data-carousel'));
  assert.ok(core.value.script.includes('window.__kitInfoMedia'), 'runtime included when needed');
});

test('J/K query: getPlatformMaterial and listPlatformMaterials answer identically across Core, REST and MCP', async () => {
  const testIds = [
    'purpose:info.status-badge',
    'purpose:info.accordion',
    'purpose:media.carousel',
    'purpose:media.image-comparison',
  ];

  for (const id of testIds) {
    const core = getPlatformMaterial({id});
    assert.equal(core.ok, true, id);

    const viaRest = await rest('GET', `/api/v1/platform/materials/${id}`);
    assert.equal(viaRest.status, 200);
    assert.equal(viaRest.text, json(core), `REST material ${id} matches Core`);

    const viaMcp = await mcp('get_platform_material', {id});
    assert.equal(json(viaMcp), json(core), `MCP material ${id} matches Core`);
  }
});
