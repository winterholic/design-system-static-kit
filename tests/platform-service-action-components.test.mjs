import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily} from '../src/platform/index.mjs';
import {buildOpenApi} from '../apps/web/lib/api/openapi.mjs';
import {TOOLS} from '../apps/web/lib/api/mcp.mjs';

const getExample = id => getPurposeFamily(id).example.content;
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

const ALL_IDS = ['button', 'icon-button', 'link-button', 'toggle-button', 'split-button', 'menu-button', 'floating-action-button', 'button-group', 'segmented-control', 'copy-button', 'close-button', 'loading-action-button'].map(name => `component:${name}`);
const ALL_PROPS = {label: 'Action', ariaLabel: 'Action', icon: 'plus', text: '복사할 값', items: [{label: '하나'}, {label: '둘'}]};

test('all twelve A entries render from the shared service boundary with unique ids and the action runtime', () => {
  const r = assembleComponents({...base, actions: ALL_IDS.map(component => ({component, props: ALL_PROPS}))});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.value.manifest.actionItems.length, 12);
  for (const id of ALL_IDS) assert.ok(r.value.html.includes(`data-component="${id}"`), id);
  const domIds = [...r.value.html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(domIds).size, domIds.length, 'ids stay unique even when several actions share a component type');
  assert.ok(r.value.script.includes('window.__kitAction'), 'menus, copy, close and segmented selection have a runtime');
  assert.ok(r.value.standalone.includes(r.value.script));
});

test('a request without actions or action purposes ships no action runtime (existing output is unchanged)', () => {
  const r = assembleComponents(base);
  assert.equal(r.ok, true);
  assert.ok(!r.value.script.includes('__kitAction'));
  assert.ok(!r.value.css.includes('pf-menu'));
});

test('purpose items that need the runtime ship it without the actions input', () => {
  const r = assembleComponents({...base, items: [{purpose: 'purpose:button.menu', visual: 'family:quiet', content: {label: '더 보기', items: [{label: '하나'}, {label: '둘'}]}}]});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(r.value.script.includes('window.__kitAction'));
  assert.match(r.value.html, /data-action-menu-trigger/);
});

test('an action that cannot be drawn is a request error, not an internal error', () => {
  const r = assembleComponents({...base, actions: [{component: 'component:menu-button', props: {label: '메뉴'}}]});
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].code, 'BAD_REQUEST');
  assert.match(r.errors[0].message, /메뉴 항목/);
});

test('REST/OpenAPI and MCP schemas expose the registered actions input', () => {
  const spec = buildOpenApi();
  const actions = spec.paths['/api/v1/platform/assemble-components'].post.requestBody.content['application/json'].schema.properties.actions;
  assert.equal(actions.maxItems, 12);
  assert.ok(actions.items.properties.component.enum.includes('component:copy-button'));
  const mcpActions = TOOLS.find(tool => tool.name === 'assemble_components').input.shape.actions;
  assert.ok(mcpActions, 'MCP schema accepts actions');
});

test('actions alone still ship the base button runtime (toggle and loading blocking), whatever purpose items are in the request', () => {
  const r = assembleComponents({...base, items: [{purpose: 'purpose:card.status', visual: 'family:quiet', content: getExample('purpose:card.status')}], actions: [{component: 'component:toggle-button', props: {label: '고정'}}]});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(r.value.script.includes('attachButton'), 'attachButton is in the script');
  const without = assembleComponents({...base, items: [{purpose: 'purpose:card.status', visual: 'family:quiet', content: getExample('purpose:card.status')}]});
  assert.ok(!without.value.script.includes('attachButton'), 'a request with no buttons keeps the bytes it had');
});

test('actions are refused when the markup ids would collide, and when a value would reach an attribute unchecked', () => {
  const dup = assembleComponents({...base, actions: [{component: 'component:button', props: {label: 'a', id: 'same'}}, {component: 'component:menu-button', props: {label: 'b', id: 'same', items: [{label: 'x'}, {label: 'y'}]}}]});
  assert.equal(dup.ok, false);
  assert.match(dup.errors[0].path, /actions\[1\]\.props\.id/);
  const bad = assembleComponents({...base, actions: [{component: 'component:button', props: {label: 'a', size: 'md" onmouseover="x'}}]});
  assert.equal(bad.ok, false);
  assert.equal(bad.errors[0].code, 'BAD_REQUEST');
});
