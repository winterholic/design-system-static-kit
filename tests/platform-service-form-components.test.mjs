import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents, assembleDesign, compileBlueprint, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {mcpConnect, rest} from './channel-support.mjs';

let client;
before(async () => { client = await mcpConnect('modern'); });
after(async () => { await client.close(); });

const json = value => JSON.stringify(value);
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
const BASE = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp'};
const IDS = ['currency','otp','tags','file','upload','grouped-select','radio','radio-group','radio-card','checkbox','checkbox-group','switch','slider','range-slider','rating','color','date','date-range','time','datetime','month','week','schedule'].map(x => `purpose:form.${x}`);
const items = IDS.map((purpose, i) => {
  const family = getPurposeFamily(purpose);
  return {purpose, visual: 'family:quiet', id: `form-${i}`, variant: family.example.variant, props: family.example.props, content: family.example.content};
});

test('B/C/D purpose controls: Core, REST and MCP assemble identical output for every direct material', async () => {
  for (let start = 0; start < items.length; start += 8) {
    const request = {...BASE, items: items.slice(start, start + 8)};
    const core = assembleComponents(request);
    assert.equal(core.ok, true, json(core.errors));
    const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
    assert.equal(viaRest.status, 200, viaRest.text);
    assert.equal(viaRest.text, json(core), 'REST returns the exact Core envelope');
    assert.equal(json(await mcp('assemble_components', request)), json(core), 'MCP returns the exact Core envelope');
    for (const item of request.items) assert.ok(core.value.html.includes(`data-purpose="${item.purpose.slice('purpose:'.length)}"`), `${item.purpose} renders through each channel`);
    assert.ok(core.value.script && core.value.standalone.includes(core.value.script));
    assert.match(core.value.script, /data-tags-widget/, '2.7 opt-in output carries the form behavior runtime');
  }
});

test('B/C/D purpose controls: Blueprint compilation matches Core markup and is byte deterministic', () => {
  const env = platformEnv();
  const dashboard = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: '하나', value: '1'}, {label: '둘', value: '2'}, {label: '셋', value: '3'}]}}, {include: ['blueprint']});
  assert.equal(dashboard.ok, true, json(dashboard.errors));
  const bp = structuredClone(dashboard.value.candidates[0].value.blueprint);
  const chosen = ['purpose:form.date-range', 'purpose:form.checkbox-group', 'purpose:form.grouped-select'];
  bp.materials.purposes = chosen.map((id, i) => { const f = getPurposeFamily(id); return {id, visual: 'family:quiet', uid: `form-${i}`, variant: f.example.variant, props: f.example.props, content: f.example.content}; });
  const grid = bp.tree.children.find(n => n.type === 'grid');
  grid.columns = 'three';
  grid.children = chosen.map((_, i) => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
  const options = {include: ['html', 'css', 'tokens', 'manifest']};
  const first = compileBlueprint(bp, options);
  const second = compileBlueprint(structuredClone(bp), options);
  assert.equal(first.ok, true, json(first.errors));
  assert.deepEqual(second, first, 'identical Blueprint inputs return identical bytes');
  for (let i = 0; i < chosen.length; i++) {
    const p = bp.materials.purposes[i];
    const core = renderPurposeFamily(env, p.id, {visual: p.visual, id: p.uid, variant: p.variant, props: p.props, content: p.content});
    assert.equal(core.ok, true, json(core.errors));
    assert.ok(first.value.html.includes(core.html), `${p.id} Blueprint output contains the Core-rendered markup`);
  }
});

test('B/C/D purpose controls: Registry list and get match REST and MCP', async () => {
  const query = {kind: 'purpose-family', query: 'form', limit: 100};
  const core = listPlatformMaterials(query);
  const viaRest = await rest('GET', '/api/v1/platform/materials?kind=purpose-family&query=form&limit=100');
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core));
  assert.equal(json(await mcp('list_platform_materials', query)), json(core));
  for (const id of IDS) {
    assert.equal(json(await mcp('get_platform_material', {id})), json(getPlatformMaterial({id})), id);
    assert.equal((await rest('GET', `/api/v1/platform/materials/${id}`)).text, json(getPlatformMaterial({id})), id);
  }
});
