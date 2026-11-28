import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents, getPlatformMaterial, listPlatformMaterials} from '../src/service/index.mjs';
import {WORK_PATTERN_FAMILIES} from '../src/platform/families/work-patterns.mjs';
import {mcpConnect, rest} from './channel-support.mjs';

const json = value => JSON.stringify(value);

test('M work patterns resolve as exact materials and Core, REST and MCP produce identical assembled bytes', async t => {
  const client = await mcpConnect('modern');
  t.after(() => client.close());
  for (const family of WORK_PATTERN_FAMILIES) {
    const detail = getPlatformMaterial({id: family.id});
    assert.equal(detail.ok, true, `${family.id} exact detail query`);
    assert.equal(detail.value.id, family.id);
    const listed = listPlatformMaterials({kind: 'purpose-family', query: family.id.split(':')[1], limit: 100});
    assert.equal(listed.ok && listed.value.items.some(item => item.id === family.id), true, `${family.id} is listed`);
    assert.equal((await rest('GET', `/api/v1/platform/materials/${family.id}`)).text, json(detail), `${family.id}: REST material`);
    assert.equal(json((await client.callTool({name: 'get_platform_material', arguments: {id: family.id}})).structuredContent), json(detail), `${family.id}: MCP material`);
    const request = {context: 'dashboard', mode: 'light', density: 'comfortable', items: [{purpose: family.id, visual: 'family:quiet', variant: family.example.variant, props: family.example.props, content: family.example.content}]};
    const core = assembleComponents(request);
    assert.equal(core.ok, true, `${family.id}: ${JSON.stringify(core.errors)}`);
    assert.ok(core.value.html.includes(`data-work-pattern="${family.id}"`));
    assert.equal(core.value.script.includes('window.__kitWorkPatterns'), ['purpose:work.approval-panel', 'purpose:work.search-result-list', 'purpose:work.task-list', 'purpose:work.user-management-table', 'purpose:work.settings-form', 'purpose:work.status-management', 'purpose:work.comment-thread'].includes(family.id));
    assert.equal((await rest('POST', '/api/v1/platform/assemble-components', {body: request})).text, json(core), `${family.id}: REST assembly`);
    assert.equal(json((await client.callTool({name: 'assemble_components', arguments: request})).structuredContent), json(core), `${family.id}: MCP assembly`);
  }
});

