// 서비스·REST·MCP가 같은 요청에 같은 결과를 내는지 본다(ADR 0009, 0012 §9.6). 채널마다 조립 로직을 따로 두지 않는다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {
  assembleDesign, assembleBlueprint, listMaterials, getMaterial, listPlatformMaterials, getPlatformMaterial, recommendMaterials, checkCompatibility, proposeSubtokenSets, assembleComponents, listEditOps, applyEdit,
  listCatalog, getSchema, getComponentSpec, compileBlueprint, validateBlueprint,
} from '../src/service/index.mjs';
import {createBlueprint} from '../src/catalog/index.mjs';
import {mcpConnect, rest, root, OPERATIONS} from './channel-support.mjs';
import {buildOpenApi} from '../apps/web/lib/api/openapi.mjs';
import {TOOLS} from '../apps/web/lib/api/mcp.mjs';

let client;
before(async () => { client = await mcpConnect('modern'); });
after(async () => { await client.close(); });

const json = x => JSON.stringify(x);
const sha256 = x => createHash('sha256').update(x).digest('hex');
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
const INCLUDE = ['html', 'css', 'tokens', 'manifest', 'blueprint'];
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));
const REQUESTS = [
  // 채널 결과를 비교하는 검증은 선택 단계를 고정해 도구의 10초 제한 안에서 조립 바이트를 비교한다.
  {purpose: 'work-dashboard', candidates: 1, palette: 'palette:forest-green', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:work-insight', families: ['family:editorial'], content: {title: '운영 현황', kpis: kpis(4), table: {title: '작업', columns: ['작업', '담당'], rows: [['a', 'b']]}}},
  {purpose: 'saas-landing', candidates: 1, content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}]}},
  {purpose: 'editorial-docs', candidates: 1, content: {title: '글', sections: [{title: '하나', body: '본문'}]}},
  {purpose: 'commerce', candidates: 1, content: {products: [{title: '가', price: '1원'}, {title: '나', price: '2원'}]}},
];

test('assemble: the service, POST /api/v1/assemble and the assemble_design tool answer with the same bytes for every purpose', async () => {
  for (const request of REQUESTS) {
    const viaService = assembleDesign(request, {include: INCLUDE});
    assert.equal(viaService.ok, true, JSON.stringify(viaService.errors));
    const viaRest = await rest('POST', '/api/v1/assemble', {body: {...request, include: INCLUDE}});
    const viaMcp = await mcp('assemble_design', {...request, include: INCLUDE});
    assert.equal(viaRest.status, 200);
    assert.equal(viaRest.text, json(viaService), `${request.purpose}: REST`);
    assert.equal(json(viaMcp), json(viaService), `${request.purpose}: MCP`);
  }
});

test('assemble: the default work dashboard returns the unchanged three-candidate result through REST and MCP', async () => {
  const request = {purpose: 'work-dashboard', content: {title: '업무 현황', kpis: [{label: '완료', value: '7'}, {label: '남음', value: '3'}, {label: '대기', value: '2'}], table: {title: '일정', columns: ['업무', '담당'], rows: [['문서', '운영']]}}};
  const viaMcp = await mcp('assemble_design', request);
  assert.equal(viaMcp.ok, true, JSON.stringify(viaMcp.errors));

  const viaService = assembleDesign(request);
  const viaRest = await rest('POST', '/api/v1/assemble', {body: request});
  assert.equal(viaRest.status, 200);
  assert.equal(viaService.value.candidates.length, 3);
  assert.equal(viaRest.text, json(viaService));
  assert.equal(viaMcp.value.candidates.length, 3);
  assert.equal(viaMcp.value.selected, viaService.value.selected);
  assert.deepEqual(viaMcp.value.candidates.map(({id, rank, score, adjustedScore, selection, decisions, relations, quality, warnings, reasons, fingerprint}) => ({id, rank, score, adjustedScore, selection, decisions, relations, quality, warnings, reasons, fingerprint})), viaService.value.candidates.map(({id, rank, score, adjustedScore, selection, decisions, relations, quality, warnings, reasons, fingerprint}) => ({id, rank, score, adjustedScore, selection, decisions, relations, quality, warnings, reasons, fingerprint})));
  assert.deepEqual(viaMcp.value.blocked, viaService.value.blocked);
  assert.deepEqual(viaMcp.value.comparison, viaService.value.comparison);
  assert.deepEqual(viaMcp.value.plan, viaService.value.plan);
  assert.deepEqual(viaMcp.value.decisions, viaService.value.decisions);
  const viaMcpBlueprint = await mcp('assemble_design', {...request, include: ['blueprint']});
  assert.equal(viaMcpBlueprint.ok, true, JSON.stringify(viaMcpBlueprint.errors));
  assert.deepEqual(viaMcpBlueprint.value.candidates.map(c => c.value.blueprint), viaService.value.candidates.map(c => c.value.blueprint));
  assert.equal(sha256(json(viaService)), '98e01ab08f0f96e0c1df752abaf719ad0dde74ada242cd23dbf2fec944416cba');
});

test('assemble: failures are the same diagnostics on every channel (REST answers 422 or 400, MCP isError)', async () => {
  const bad = {purpose: 'work-dashboard', html: '<b>x</b>'};
  const viaService = assembleDesign(bad);
  const viaRest = await rest('POST', '/api/v1/assemble', {body: bad});
  const call = await client.callTool({name: 'assemble_design', arguments: bad});
  assert.equal(viaService.ok, false);
  assert.ok([400, 422].includes(viaRest.status), String(viaRest.status));
  assert.equal(viaRest.text, json(viaService));
  assert.equal(call.isError, true);
  assert.equal(json(call.structuredContent), json(viaService));
  const unknown = {purpose: 'blog'};
  assert.equal((await rest('POST', '/api/v1/assemble', {body: unknown})).text, json(assembleDesign(unknown)));
  // an unknown top-level key never reaches the service as a silent option
  const stray = await rest('POST', '/api/v1/assemble', {body: {purpose: 'work-dashboard', css: 'a{}'}});
  assert.equal(stray.json.ok, false);
  assert.equal(stray.text, json(assembleDesign({purpose: 'work-dashboard', css: 'a{}'})));
  assert.equal(stray.json.errors[0].path, '$.css');
  const empty = await rest('POST', '/api/v1/assemble', {body: {}});
  assert.equal(empty.text, json(assembleDesign({})), 'a missing purpose is the service diagnostic, not a channel one');
});

test('assemble: the stored 2.7.0 Blueprint compiles to the same bytes through the service, REST and MCP', async () => {
  const bp = assembleDesign(REQUESTS[0], {include: ['blueprint', 'standalone', 'css']}).value.candidates[0];
  const opts = {include: ['html', 'css']};
  const viaService = compileBlueprint(bp.value.blueprint, opts);
  const viaRest = await rest('POST', '/api/v1/compile', {body: {blueprint: bp.value.blueprint, ...opts}});
  const viaMcp = await mcp('compile_design', {blueprint: bp.value.blueprint, ...opts, html: 'full'});
  assert.equal(viaService.value.html, bp.value.standalone);
  assert.equal(viaRest.text, json(viaService));
  assert.equal(json(viaMcp), json(viaService));
  assert.equal(json((await rest('POST', '/api/v1/validate', {body: {blueprint: bp.value.blueprint}})).json), json(validateBlueprint(bp.value.blueprint)));
});

test('materials: listMaterials, getMaterial, the platform queries, recommend and compatibility match on every channel', async () => {
  const cases = [
    ['GET', '/api/v1/materials?kind=chart-preset&fields=label&limit=5', 'list_materials', {kind: 'chart-preset', fields: ['label'], limit: 5}, () => listMaterials({kind: 'chart-preset', fields: ['label'], limit: 5})],
    ['GET', '/api/v1/materials?preset=true&limit=3', 'list_materials', {preset: true, limit: 3}, () => listMaterials({preset: true, limit: 3})],
    ['GET', '/api/v1/materials/component:select-control', 'get_material', {id: 'component:select-control'}, () => getMaterial({id: 'component:select-control'})],
    ['GET', '/api/v1/materials/nope:x', 'get_material', {id: 'nope:x'}, () => getMaterial({id: 'nope:x'})],
    ['GET', '/api/v1/platform/materials?kind=palette&limit=4', 'list_platform_materials', {kind: 'palette', limit: 4}, () => listPlatformMaterials({kind: 'palette', limit: 4})],
    ['GET', '/api/v1/platform/materials/family:quiet', 'get_platform_material', {id: 'family:quiet'}, () => getPlatformMaterial({id: 'family:quiet'})],
    ['POST', '/api/v1/recommend', 'recommend_materials', {kind: 'palette', context: 'dashboard', mode: 'light'}, () => recommendMaterials({kind: 'palette', context: 'dashboard', mode: 'light'}), {kind: 'palette', context: 'dashboard', mode: 'light'}],
    ['POST', '/api/v1/compatibility', 'check_compatibility', {ids: ['palette:static-kit', 'subtoken-set:standard'], mode: 'light'}, () => checkCompatibility({ids: ['palette:static-kit', 'subtoken-set:standard'], mode: 'light'}), {ids: ['palette:static-kit', 'subtoken-set:standard'], mode: 'light'}],
    ['POST', '/api/v1/compatibility', 'check_compatibility', {ids: ['axis-value:density.compact', 'axis-value:shell.dock']}, () => checkCompatibility({ids: ['axis-value:density.compact', 'axis-value:shell.dock']}), {ids: ['axis-value:density.compact', 'axis-value:shell.dock']}],
    ['GET', '/api/v1/edit/ops', 'list_edit_ops', {}, () => listEditOps()],
  ];
  for (const [method, path, tool, args, service, body] of cases) {
    const expected = json(service());
    const r = await rest(method, path, body === undefined ? {} : {body});
    assert.equal(r.text, expected, `REST ${method} ${path}`);
    assert.equal(json(await mcp(tool, args)), expected, `MCP ${tool}`);
  }
  const bp = createBlueprint('saas-landing'), edit = {blueprint: bp, steps: [{op: 'setTheme', args: {theme: 'trust'}}]};
  assert.equal((await rest('POST', '/api/v1/edit', {body: edit})).text, json(applyEdit(edit)));
  assert.equal(json(await mcp('apply_edit', edit)), json(applyEdit(edit)));
  const badEdit = {blueprint: bp, steps: [{op: 'setTheme', args: {theme: 'nope'}}]};
  assert.equal((await rest('POST', '/api/v1/edit', {body: badEdit})).text, json(applyEdit(badEdit)));
  const profile = {profile: 'erp'};
  assert.equal((await rest('POST', '/api/v1/assemble-blueprint', {body: profile})).text, json(assembleBlueprint(profile)));
  assert.equal(json(await mcp('assemble_blueprint', profile)), json(assembleBlueprint(profile)));
});

test('purpose-family records are discoverable and recommendable through the service, REST and MCP', async () => {
  const listed = listPlatformMaterials({kind: 'purpose-family', limit: 100, fields: ['label', 'contexts', 'source', 'reuses']});
  assert.equal(listed.ok, true);
  assert.equal(listed.value.total, 32);
  assert.equal(listed.value.items.length, 32);
  assert.ok(listed.value.items.every(x => x.id.startsWith('purpose:')));
  const summary = listPlatformMaterials({kind: 'purpose-family', limit: 100});
  assert.ok(summary.value.items.every(x => x.purpose && x.group && x.bases.length));
  const visualFields = listPlatformMaterials({kind: 'purpose-family', limit: 1, fields: ['visual']});
  assert.deepEqual(new Set(Object.keys(visualFields.value.items[0].visual)), new Set(['family:bold', 'family:editorial', 'family:quiet', 'family:soft']));
  const ids = listed.value.items.map(x => x.id);
  const id = 'purpose:card.kpi';
  const detail = getPlatformMaterial({id});
  assert.equal(detail.ok, true);
  assert.equal(detail.value.kind, 'purpose-family');
  assert.ok(detail.value.bases.includes('base-component:card-surface'));
  assert.ok(detail.value.visual);
  assert.ok(detail.value.edges.from.some(x => x.type === 'requires'));
  const recommendation = recommendMaterials({kind: 'purpose-family', context: 'dashboard', density: 'comfortable', styleContext: 'style-context:workspace'});
  assert.equal(recommendation.ok, true);
  assert.ok(recommendation.value.ranked.some(x => x.id === id));
  const compatibilityIds = [id, 'family:quiet', 'base-component:card-surface'];
  const compatibility = checkCompatibility({ids: compatibilityIds});
  assert.equal(compatibility.ok, true);
  assert.equal(compatibility.value.ok, true);

  const viaRest = await rest('GET', '/api/v1/platform/materials?kind=purpose-family&limit=100&fields=label%2Ccontexts%2Csource%2Creuses');
  assert.equal(viaRest.text, json(listed));
  assert.equal((await rest('GET', `/api/v1/platform/materials/${id}`)).text, json(detail));
  assert.equal((await rest('POST', '/api/v1/recommend', {body: {kind: 'purpose-family', context: 'dashboard', density: 'comfortable', styleContext: 'style-context:workspace'}})).text, json(recommendation));
  assert.equal((await rest('POST', '/api/v1/compatibility', {body: {ids: compatibilityIds}})).text, json(compatibility));
  assert.equal(json(await mcp('list_platform_materials', {kind: 'purpose-family', limit: 100, fields: ['label', 'contexts', 'source', 'reuses']})), json(listed));
  assert.equal(json(await mcp('get_platform_material', {id})), json(detail));
  assert.equal(json(await mcp('recommend_materials', {kind: 'purpose-family', context: 'dashboard', density: 'comfortable', styleContext: 'style-context:workspace'})), json(recommendation));
  assert.equal(json(await mcp('check_compatibility', {ids: compatibilityIds})), json(compatibility));
  assert.equal(ids.length, 32);
});

test('user seed proposals and purpose-family assembly keep Core, REST and MCP byte-identical', async () => {
  const seeds = ['#D2501E', '#6F625A', '#0D6E8E'];
  const proposal = proposeSubtokenSets({seeds});
  assert.equal(proposal.ok, true);
  assert.equal((await rest('POST', '/api/v1/platform/propose-subtoken-sets', {body: {seeds}})).text, json(proposal));
  assert.equal(json(await mcp('propose_subtoken_sets', {seeds})), json(proposal));
  const badSeeds = {seeds: ['#FFFFFF', '#FFFFFF', '#000000']};
  assert.equal((await rest('POST', '/api/v1/platform/propose-subtoken-sets', {body: badSeeds})).text, json(proposeSubtokenSets(badSeeds)));
  assert.equal(json(await mcp('propose_subtoken_sets', badSeeds)), json(proposeSubtokenSets(badSeeds)));

  const request = {context: 'dashboard', mode: 'light', density: 'comfortable', seeds, subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:work-insight', items: [{purpose: 'purpose:button.toggle', visual: 'family:soft', variant: {layout: 'single'}, props: {state: 'pressed'}, content: {label: '알림'}}]};
  const assembled = assembleComponents(request);
  assert.equal(assembled.ok, true, json(assembled.errors));
  assert.equal((await rest('POST', '/api/v1/platform/assemble-components', {body: request})).text, json(assembled));
  assert.equal(json(await mcp('assemble_components', request)), json(assembled));
});

test('X01 keeps bottom navigation and compact density blocked in recommendations and compatibility', async () => {
  const purpose = 'purpose:navigation.bottom', density = 'axis-value:density.compact';
  const rec = recommendMaterials({kind: 'purpose-family', context: 'dashboard', density: 'compact', selected: [density]});
  assert.ok(rec.value.blocked.some(x => x.id === purpose && x.blocked.some(b => b.reason.startsWith('X01:'))));
  const compatibility = checkCompatibility({ids: [purpose, 'family:quiet', 'base-component:navigation-menu', density], context: 'dashboard', density: 'compact'});
  assert.equal(compatibility.value.ok, false);
  assert.ok(compatibility.value.violations.some(x => x.reason.startsWith('X01:')));
});

test('D3: catalogVersion is forwarded as the service takes it; a version the service supports is never refused by a channel', async () => {
  const fields = 'type&fields=type&limit=200';
  const at26 = json(listCatalog({kind: 'components', filter: {catalogVersion: '2.6.0'}, fields: ['type'], limit: 200}));
  const at24 = json(listCatalog({kind: 'components', fields: ['type'], limit: 200}));
  assert.notEqual(at26, at24, 'the 2.6.0 component list differs from the default list');
  const rest26 = await rest('GET', '/api/v1/catalog?kind=components&fields=type&limit=200&catalogVersion=2.6.0');
  assert.equal(rest26.status, 200);
  assert.equal(rest26.text, at26, 'REST 2.6.0 components');
  assert.equal(json(await mcp('list_design_system', {kind: 'components', fields: ['type'], limit: 200, catalogVersion: '2.6.0'})), at26, 'MCP 2.6.0 components');
  assert.equal((await rest('GET', '/api/v1/components?fields=type&limit=200&catalogVersion=2.6.0')).text, at26);
  assert.equal((await rest('GET', '/api/v1/catalog?kind=components&fields=type&limit=200')).text, at24, 'default stays the default');
  // components/{id} and the schema also take the version
  const spec26 = json(getComponentSpec({type: 'data-table', catalogVersion: '2.6.0'}));
  assert.equal((await rest('GET', '/api/v1/components/data-table?catalogVersion=2.6.0')).text, spec26);
  assert.equal(json(await mcp('get_component_spec', {type: 'data-table', catalogVersion: '2.6.0'})), spec26);
  assert.equal((await rest('GET', '/api/v1/components/data-table')).json.ok, false, 'without the version the 2.6.0 part is unknown');
  const schema27 = json(getSchema({target: 'blueprint', catalogVersion: '2.7.0'}));
  assert.equal((await rest('GET', '/api/v1/schema?target=blueprint&catalogVersion=2.7.0')).text, schema27);
  assert.equal(json(await mcp('get_design_schema', {target: 'blueprint', catalogVersion: '2.7.0'})), schema27);
  // version-independent reads answer the same with any supported version
  const themes = json(listCatalog({kind: 'themes', fields: ['id'], limit: 5}));
  for (const v of ['2.4.0', '2.5.0', '2.6.0', '2.7.0']) assert.equal((await rest('GET', `/api/v1/catalog?kind=themes&fields=id&limit=5&catalogVersion=${v}`)).text, themes, v);
  // unsupported versions are still refused by the service's own check
  const nine = await rest('GET', '/api/v1/catalog?kind=themes&catalogVersion=9.9.9');
  assert.equal(nine.status, 400);
  assert.equal(nine.json.errors[0].code, 'UNSUPPORTED_VERSION');
  // rights: the external palette list stays refused for every version except the server default (R1)
  assert.equal((await rest('GET', '/api/v1/catalog?kind=palettes&limit=2&catalogVersion=2.6.0')).json.errors[0].code, 'CATALOG_VERSION');
  // validate and compile read the document's own version; the expected version still has to match it
  const doc = assembleDesign(REQUESTS[0], {include: ['blueprint']}).value.candidates[0].value.blueprint;
  assert.equal((await rest('POST', '/api/v1/validate', {body: {blueprint: doc, catalogVersion: '2.7.0'}})).json.ok, true);
  assert.equal((await rest('POST', '/api/v1/validate', {body: {blueprint: doc, catalogVersion: '2.6.0'}})).json.errors[0].code, 'CATALOG_VERSION');
});

test('D3: every operation of the table has a route file and an OpenAPI entry, and every service function the channels expose has a tool', () => {
  const doc = buildOpenApi();
  for (const op of OPERATIONS) {
    assert.ok(doc.paths[op.path]?.[op.method.toLowerCase()]?.operationId === op.id, `${op.id} in OpenAPI`);
    const dir = resolve(root, 'apps/web/app', op.path.slice(1).replace(/\{id\}/, '[id]'));
    assert.ok(existsSync(resolve(dir, 'route.ts')), `${op.path} has a route`);
  }
  for (const id of ['assembleDesign', 'assembleBlueprint', 'listMaterials', 'getMaterial', 'listPlatformMaterials', 'getPlatformMaterial', 'recommendMaterials', 'checkCompatibility', 'listEditOps', 'applyEdit']) assert.ok(OPERATIONS.some(o => o.id === id), id);
  assert.equal(doc.paths['/api/v1/assemble'].post.requestBody.content['application/json'].schema.required[0], 'purpose');
  assert.deepEqual(TOOLS.map(t => t.name).slice(6), ['assemble_design', 'assemble_blueprint', 'list_materials', 'get_material', 'list_platform_materials', 'get_platform_material', 'propose_subtoken_sets', 'assemble_components', 'recommend_materials', 'check_compatibility', 'list_edit_ops', 'apply_edit']);
  for (const t of TOOLS) assert.ok(t.description.length > 40 && t.output && t.input, t.name);
});

test('rate cost, input size and method rules apply to the new paths like the old ones', async () => {
  const wrong = await rest('GET', '/api/v1/assemble');
  assert.equal(wrong.status, 405);
  assert.equal(wrong.headers.get('allow'), 'POST');
  assert.equal((await rest('POST', '/api/v1/materials', {body: {}})).status, 405);
  const noBody = await rest('POST', '/api/v1/assemble', {raw: '{'});
  assert.equal(noBody.status, 400);
  assert.equal((await rest('POST', '/api/v1/recommend', {body: {kind: 'palette', nope: 1}})).json.errors[0].path, '$args.nope');
});
