import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleComponents, assembleDesign, compileBlueprint, getPlatformMaterial, listPlatformMaterials} from '../src/service/index.mjs';
import {mcpConnect, rest} from './channel-support.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';

let client;
before(async () => { client = await mcpConnect('modern'); });
after(async () => { await client.close(); });
const json = x => JSON.stringify(x);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
const IDS = [
  'purpose:navigation.collapsible-sidebar', 'purpose:navigation.drawer', 'purpose:navigation.command-menu', 'purpose:navigation.context-menu',
  'purpose:overlay.drawer', 'purpose:overlay.popover', 'purpose:overlay.dropdown-menu', 'purpose:overlay.contextual-help',
  'purpose:feedback.callout', 'purpose:feedback.circular-progress', 'purpose:feedback.loading-overlay', 'purpose:feedback.status-indicator',
];
const BASE = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp'};
const page = () => assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: 'A', value: '1'}, {label: 'B', value: '2'}, {label: 'C', value: '3'}]}}, {include: ['blueprint']}).value.candidates[0].value.blueprint;

test('E/H/I material records and assembly output match across Core, REST and MCP', async () => {
  for (const id of IDS) {
    const family = getPurposeFamily(id), request = {...BASE, items: [{purpose: id, visual: 'family:quiet', ...family.example}]};
    const core = assembleComponents(request);
    assert.equal(core.ok, true, `${id}: ${json(core.errors)}`);
    const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
    assert.equal(viaRest.text, json(core), `${id}: REST matches Core bytes`);
    assert.equal(json(await mcp('assemble_components', request)), json(core), `${id}: MCP matches Core`);
    assert.ok(core.value.standalone.includes(core.value.script), `${id}: standalone carries its runtime or empty runtime`);
    const material = getPlatformMaterial({id});
    assert.equal(material.ok, true, `${id} registry query`);
    assert.equal(json(await mcp('get_platform_material', {id})), json(material));
    assert.equal((await rest('GET', `/api/v1/platform/materials/${id}`)).text, json(material));
  }
  const query = {kind: 'purpose-family', query: 'navigation', limit: 100};
  const listed = listPlatformMaterials(query);
  assert.equal(json(await mcp('list_platform_materials', query)), json(listed));
  assert.equal((await rest('GET', '/api/v1/platform/materials?kind=purpose-family&query=navigation&limit=100')).text, json(listed));
});

test('E/H/I Blueprint compile and recompile return identical Core, REST and MCP bytes', async () => {
  const options = {include: ['html', 'css', 'manifest']};
  for (const [n, id] of IDS.entries()) {
    const family = getPurposeFamily(id), bp = structuredClone(page());
    bp.materials.purposes = [0, 1].map(i => ({id, visual: 'family:quiet', uid: `channel-ehi-${n}-${i}`, variant: family.example.variant, props: family.example.props, content: family.example.content}));
    const grid = bp.tree.children.find(x => x.type === 'grid');
    grid.children = [0, 1].map(i => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
    const core = compileBlueprint(bp, {...options, hash: {algorithm: 'sha256', digest: sha256}});
    assert.equal(core.ok, true, `${id}: ${json(core.errors)}`);
    assert.deepEqual(compileBlueprint(structuredClone(bp), {...options, hash: {algorithm: 'sha256', digest: sha256}}), core, `${id}: deterministic round trip`);
    const viaRest = await rest('POST', '/api/v1/compile', {body: {blueprint: bp, ...options}});
    assert.equal(viaRest.text, json(core), `${id}: REST matches Core`);
    assert.equal(json(await mcp('compile_design', {blueprint: bp, ...options, html: 'full'})), json(core), `${id}: MCP matches Core`);
  }
});
