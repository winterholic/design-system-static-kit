import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleDesign, compileBlueprint} from '../src/service/index.mjs';
import {PURPOSE_FAMILIES, getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {EHI_RUNTIME} from '../src/platform/families/action.mjs';

const EXPECTED = [
  'purpose:navigation.collapsible-sidebar',
  'purpose:navigation.drawer',
  'purpose:navigation.command-menu',
  'purpose:navigation.context-menu',
  'purpose:overlay.drawer',
  'purpose:overlay.popover',
  'purpose:overlay.dropdown-menu',
  'purpose:overlay.contextual-help',
  'purpose:feedback.callout',
  'purpose:feedback.circular-progress',
  'purpose:feedback.loading-overlay',
  'purpose:feedback.status-indicator',
];
const BASE = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: 'A', value: '1'}, {label: 'B', value: '2'}, {label: 'C', value: '3'}]}}, {include: ['blueprint']}).value.candidates[0].value.blueprint;

test('E/H/I interaction runtime is valid executable JavaScript', () => {
  assert.doesNotThrow(() => new Function(EHI_RUNTIME));
});

test('E/H/I formerly missing requirements are registered as independent purpose materials', () => {
  const registered = new Set(PURPOSE_FAMILIES.map(x => x.id));
  for (const id of EXPECTED) assert.ok(registered.has(id), `${id} is registered`);
});

test('E/H/I purpose examples render escaped content and declare live keyboard/focus behavior', () => {
  const env = platformEnv();
  for (const id of EXPECTED) {
    const family = getPurposeFamily(id);
    assert.ok(family, id);
    assert.ok(family.a11y?.keyboard && family.interactions?.length, `${id} declares interaction contract`);
    const result = renderPurposeFamily(env, id, {visual: 'family:quiet', ...family.example, id: `test-${id.split('.').at(-1)}`});
    assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.errors)}`);
    assert.ok(result.html.includes('data-purpose='), id);
    assert.ok(!result.html.includes('<script'), `${id} cannot turn user text into markup`);
    assert.deepEqual([...result.bases].sort(), [...family.bases].sort(), `${id} renders every base declared by its material contract`);
    const controls = [...result.html.matchAll(/aria-controls="([^"]+)"/g)].map(x => x[1]);
    for (const target of controls) assert.ok(result.html.includes(`id="${target}"`), `${id}: aria-controls ${target} resolves`);
  }
  for (const id of ['purpose:navigation.command-menu', 'purpose:navigation.context-menu', 'purpose:overlay.dropdown-menu']) {
    const result = renderPurposeFamily(env, id, {visual: 'family:quiet', ...getPurposeFamily(id).example, id: `menu-${id.split('.').at(-1)}`});
    assert.match(result.html, /role="menu"[\s\S]*role="menuitem"/, `${id} exposes valid menu/menuitem roles`);
  }
});

test('E/H/I renderer escapes hostile values and progress values are visible in the drawn track', () => {
  const env = platformEnv();
  const family = getPurposeFamily('purpose:overlay.popover');
  const result = renderPurposeFamily(env, family.id, {visual: 'family:quiet', ...family.example, id: 'safe-popover', content: {label: '<img src=x onerror=alert(1)>', description: 'hello $& <script>'}});
  assert.equal(result.ok, true);
  assert.ok(result.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!result.html.includes('<img') && !result.html.includes('<script>'));
  const progress = getPurposeFamily('purpose:feedback.circular-progress');
  const rendered = renderPurposeFamily(env, progress.id, {visual: 'family:quiet', ...progress.example, id: 'progress', content: {label: '업로드', value: 73}});
  assert.equal(rendered.ok, true);
  assert.match(rendered.html, /background:conic-gradient\(var\(--kit-action\) 73%,var\(--kit-soft\) 0\)/);
  const status = getPurposeFamily('purpose:feedback.status-indicator');
  const unknownTone = renderPurposeFamily(env, status.id, {visual: 'family:quiet', ...status.example, id: 'status', content: {label: '상태', tone: '<script>'}});
  assert.equal(unknownTone.ok, true);
  assert.ok(unknownTone.html.includes('data-tone="neutral"'));
  assert.ok(unknownTone.html.includes('data-tone="info"'), 'the rendered feedback base uses the safe visual fallback too');
});

test('E/H/I purpose Blueprint compiles the real renderer, records material IDs, and emits runtime only when needed', () => {
  const env = platformEnv();
  for (const id of EXPECTED) {
    const family = getPurposeFamily(id), bp = structuredClone(BASE);
    bp.materials.purposes = [0, 1].map(i => ({id, visual: 'family:quiet', uid: `ehi-${id.split('.').at(-1)}-${i}`, variant: family.example.variant, props: family.example.props, content: family.example.content}));
    const grid = bp.tree.children.find(n => n.type === 'grid');
    grid.columns = 'two';
    grid.children = [0, 1].map(i => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
    const first = compileBlueprint(bp, {include: ['html', 'css', 'manifest']}), again = compileBlueprint(structuredClone(bp), {include: ['html', 'css', 'manifest']});
    assert.equal(first.ok, true, `${id}: ${JSON.stringify(first.errors)}`);
    assert.deepEqual(again, first, `${id} is deterministic`);
    const markup = renderPurposeFamily(env, id, {visual: 'family:quiet', ...family.example, id: `ehi-${id.split('.').at(-1)}-0`});
    assert.ok(first.value.html.includes(markup.html), `${id} compiles the direct Core renderer`);
    assert.ok(first.value.css.includes('.ehi'), `${id} consumes its CSS`);
    assert.ok(first.value.css.includes('@media(prefers-reduced-motion:reduce)'));
    assert.ok(first.value.css.includes('.ehi-status[data-tone=success] .ehi-dot'), `${id} receives feedback tone styling from tokens`);
    assert.deepEqual(first.value.manifest.platform.materials.purposes.map(x => x.id), [id, id]);
    const generatedIds = [...first.value.html.matchAll(/aria-controls="([^"]+)"/g)].map(x => x[1]);
    assert.equal(new Set(generatedIds).size, generatedIds.length, `${id}: generated ids are unique`);
    for (const target of generatedIds) assert.ok(first.value.html.includes(`id="${target}"`), `${id}: generated control target ${target} exists`);
    const allIds = [...first.value.html.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]);
    assert.equal(new Set(allIds).size, allIds.length, `${id}: all emitted ids stay unique across repeated instances`);
    const needsRuntime = ['purpose:overlay.popover', 'purpose:overlay.drawer', 'purpose:overlay.dropdown-menu', 'purpose:overlay.contextual-help', 'purpose:navigation.drawer', 'purpose:navigation.command-menu', 'purpose:navigation.context-menu', 'purpose:navigation.collapsible-sidebar'].includes(id);
    assert.equal(first.value.html.includes('window.__kitEhi'), needsRuntime, `${id} runtime is emitted exactly when needed`);
  }
});
