// F·G 목적 패밀리의 Registry·Core·REST·MCP 출력 계약.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleComponents, compileBlueprint, assembleDesign, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';
import {mcpConnect, rest} from './channel-support.mjs';

const CASES = [
  'purpose:card.comparison','purpose:card.notification','purpose:card.activity','purpose:card.integration','purpose:card.review','purpose:card.selection','purpose:card.dashboard-widget','purpose:card.financial-asset',
  'purpose:table.filterable','purpose:table.expandable','purpose:table.grouped','purpose:table.tree','purpose:table.inspector','purpose:table.log-viewer','purpose:table.diff',
];
const json = x => JSON.stringify(x);
const sha256 = x => createHash('sha256').update(x).digest('hex');
let client;
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
test('F·G channels expose identical registry material and assembled output via Core, REST and MCP', async t => {
  client = await mcpConnect('modern');
  t.after(() => client.close());
  for (const id of CASES) {
    const family = getPurposeFamily(id);
    const listed = listPlatformMaterials({kind: 'purpose-family', query: id.split(':')[1], limit: 100});
    const detail = getPlatformMaterial({id});
    assert.equal(listed.ok && listed.value.items.some(x => x.id === id), true, `${id} is listed`);
    assert.equal(detail.ok, true, `${id} has detail`);
    assert.equal((await rest('GET', `/api/v1/platform/materials/${id}`)).text, json(detail), `${id}: REST registry detail`);
    assert.equal(json(await mcp('get_platform_material', {id})), json(detail), `${id}: MCP registry detail`);
    const request = {context: 'dashboard', mode: 'light', density: 'comfortable', items: [{purpose: id, visual: 'family:quiet', variant: family.example.variant, props: family.example.props, content: family.example.content}]};
    const direct = assembleComponents(request);
    assert.equal(direct.ok, true, `${id}: ${json(direct.errors)}`);
    assert.equal(direct.value.script.includes('window.__kitCardSelection'), id === 'purpose:card.selection', `${id}: selection runtime follows the material`);
    assert.equal(direct.value.script.includes('window.__kitDataDisplay'), ['purpose:table.filterable','purpose:table.expandable','purpose:table.tree'].includes(id), `${id}: data display runtime follows the material`);
    assert.equal((await rest('POST', '/api/v1/platform/assemble-components', {body: request})).text, json(direct), `${id}: REST assembly`);
    assert.equal(json(await mcp('assemble_components', request)), json(direct), `${id}: MCP assembly`);
  }
});

test('F·G purpose materials compile deterministically through Core, REST and MCP Blueprint channels', async t => {
  client = await mcpConnect('modern');
  t.after(() => client.close());
  const base = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: '기본', value: '0'}, {label: '보조', value: '0'}]}}, {include: ['blueprint']});
  assert.equal(base.ok, true);
  for (const id of CASES) {
    const family = getPurposeFamily(id), bp = structuredClone(base.value.candidates[0].value.blueprint);
    bp.materials.purposes = [0, 1].map(i => ({id, visual: 'family:quiet', uid: `d3-${i}`, variant: family.example.variant, props: family.example.props, content: family.example.content}));
    const grid = bp.tree.children.find(n => n.type === 'grid'); grid.columns = 'two';
    grid.children = [0, 1].map(i => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
    const opts = {include: ['html', 'css', 'tokens', 'manifest']};
    const direct = compileBlueprint(bp, {...opts, hash: {algorithm: 'sha256', digest: sha256}});
    assert.equal(direct.ok, true, `${id}: ${json(direct.errors)}`);
    const restResult = await rest('POST', '/api/v1/compile', {body: {blueprint: bp, ...opts}});
    assert.equal(restResult.text, json(direct), `${id}: REST compile`);
    assert.equal(json(await mcp('compile_design', {blueprint: bp, ...opts, html: 'full'})), json(direct), `${id}: MCP compile`);
    assert.deepEqual(compileBlueprint(structuredClone(bp), {...opts, hash: {algorithm: 'sha256', digest: sha256}}), direct, `${id}: repeated output bytes`);
  }
});
