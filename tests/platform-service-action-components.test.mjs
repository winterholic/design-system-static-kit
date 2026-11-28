import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents} from '../src/service/index.mjs';
import {buildOpenApi} from '../apps/web/lib/api/openapi.mjs';
import {TOOLS} from '../apps/web/lib/api/mcp.mjs';

const base = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '계속'}}]};

test('service assembly returns action HTML, CSS, manifest metadata and standalone export', () => {
  const r = assembleComponents({...base, actions: [{component: 'component:button', props: {label: '길게 이어지는 확인 문구', appearance: 'elevated', size: 'xl'}}, {component: 'component:close-button', props: {ariaLabel: '닫기'}}]});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.match(r.value.html, /길게 이어지는 확인 문구/);
  assert.match(r.value.html, /aria-label="닫기"/);
  assert.match(r.value.css, /data-component-size=/);
  assert.deepEqual(r.value.manifest.actionItems.map(x => x.component), ['component:button', 'component:close-button']);
  assert.ok(r.value.standalone.includes(r.value.html));
});

test('service rejects an unregistered action component instead of rendering arbitrary markup', () => {
  const r = assembleComponents({...base, actions: [{component: 'component:script', props: {label: 'x'}}]});
  assert.equal(r.ok, false);
  assert.match(r.errors[0].path, /actions\[0\]\.component/);
});

test('all twelve A entries render from the shared service boundary', () => {
  const ids = ['button', 'icon-button', 'link-button', 'toggle-button', 'split-button', 'menu-button', 'floating-action-button', 'button-group', 'segmented-control', 'copy-button', 'close-button', 'loading-action-button'].map(name => `component:${name}`);
  const r = assembleComponents({...base, actions: ids.map(component => ({component, props: {label: 'Action', ariaLabel: 'Action', icon: 'plus'}}))});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.value.manifest.actionItems.length, 12);
  for (const id of ids) assert.ok(r.value.html.includes(`data-component="${id}"`), id);
});

test('REST/OpenAPI and MCP schemas expose the registered actions input', () => {
  const spec = buildOpenApi();
  const actions = spec.paths['/api/v1/platform/assemble-components'].post.requestBody.content['application/json'].schema.properties.actions;
  assert.equal(actions.maxItems, 12);
  assert.ok(actions.items.properties.component.enum.includes('component:copy-button'));
  const mcpActions = TOOLS.find(tool => tool.name === 'assemble_components').input.shape.actions;
  assert.ok(mcpActions, 'MCP schema accepts actions');
});
