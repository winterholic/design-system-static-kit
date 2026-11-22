import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents, proposeSubtokenSets, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';

const seedSet = ['#D2501E', '#6F625A', '#0D6E8E'];
const demoRequest = {
  context: 'dashboard', mode: 'light', density: 'comfortable',
  seeds: seedSet, subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:work-insight',
  items: [{purpose: 'purpose:button.toggle', visual: 'family:soft', variant: {layout: 'single'}, props: {size: 'medium', state: 'pressed'}, content: {label: '알림'}}],
};

test('proposeSubtokenSets wraps valid and rejected user-seed proposals without storing a palette', () => {
  const r = proposeSubtokenSets({seeds: seedSet});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.value.palette.id, 'palette:user-seeds');
  assert.ok(r.value.candidates.length > 0);
  assert.ok(Array.isArray(r.value.rejected));
  assert.deepEqual(proposeSubtokenSets({seeds: ['#fff']}).errors[0].code, 'P_SEEDS_COUNT');
  assert.deepEqual(proposeSubtokenSets({seeds: ['#FFFFFF', '#FFFFFF', '#000000']}).errors[0].code, 'P_SEEDS_DUPLICATE');
  assert.equal(proposeSubtokenSets({seeds: ['red', '#000000', '#FFFFFF']}).errors[0].code, 'P_SEEDS_HEX');
  const blocked = proposeSubtokenSets({seeds: ['#101010', '#181818', '#202020']});
  assert.equal(blocked.ok, true);
  assert.equal(blocked.value.candidates.length, 0);
  assert.ok(blocked.value.rejected.every(x => x.reasons.length > 0));
  assert.equal(assembleComponents({...demoRequest, seeds: ['#101010', '#181818', '#202020']}).errors[0].code, 'P_CHECK_CONTRAST');
  assert.ok(!listPlatformMaterials({kind: 'palette'}).value.items.some(x => x.id === 'palette:user-seeds'));
  assert.equal(getPlatformMaterial({id: 'palette:user-seeds'}).errors[0].code, 'UNKNOWN_MATERIAL');
});

test('purpose-family assembly and standalone demo use the same rendered bytes, chosen axes and manifest', async () => {
  const first = assembleComponents(demoRequest);
  assert.equal(first.ok, true, JSON.stringify(first.errors));
  const second = assembleComponents(structuredClone(demoRequest));
  assert.equal(second.ok, true);
  const {html, css, script, standalone, manifest} = first.value;
  assert.ok(html.includes('data-purpose="button.toggle"'));
  assert.ok(html.includes('aria-pressed="true"'), 'toggle state is real accessible markup');
  assert.ok(css.includes('--kit-action:'));
  assert.ok(script.includes('aria-pressed'), 'the existing button runtime carries the toggle interaction');
  assert.ok(script.includes('function attachButton'), 'the existing control runtime is included for the purpose base component');
  assert.ok(standalone.startsWith('<!doctype html>'));
  assert.ok(standalone.includes(`<style>\n${css}</style>`));
  assert.ok(standalone.includes(`${html}<script>${script}</script>`));
  assert.deepEqual(manifest.families.purposes, ['purpose:button.toggle']);
  assert.deepEqual(manifest.purposeItems[0].variant, {layout: 'single'});
  assert.equal(manifest.selection.palette, 'palette:user-seeds');
  assert.equal(manifest.selection.subtokenSet, 'subtoken-set:standard');
  assert.deepEqual(manifest.userPalette, {id: 'palette:user-seeds', seeds: {brand: '#D2501E', neutral: '#6F625A', accent: '#0D6E8E', success: '#1F7A45', warning: '#916308', danger: '#AB2B36', info: '#2B60AB'}});
  assert.equal(JSON.stringify(first), JSON.stringify(second), 'the same request yields byte-identical assembly and demo');
  const [{assembleFamilies}, {createPlatform}, {platformEnv}] = await Promise.all([
    import('../src/platform/families/index.mjs'), import('../src/platform/examples/minimal.mjs'), import('../src/platform/compile.mjs'),
  ]);
  const palette = platformEnv().registry.get('palette:static-kit');
  const env = createPlatform({records: [{...palette, id: 'palette:user-seeds', seeds: manifest.userPalette.seeds, relations: [], source: {origin: 'test request', license: 'internal'}, reuses: []}]});
  const {seeds: _discard, ...engineRequest} = demoRequest;
  const direct = assembleFamilies(env, {...engineRequest, palette: 'palette:user-seeds'});
  assert.equal(direct.ok, true, JSON.stringify(direct.diagnostics));
  assert.equal(html, direct.value.html, 'service demo uses the registered family assembly HTML bytes');
  assert.equal(css, direct.value.css, 'service demo uses the registered family assembly CSS bytes');
});

test('purpose-family assembly reports Core diagnostics for an invalid visual/state and rejects unknown request keys', () => {
  const bad = assembleComponents({...demoRequest, items: [{...demoRequest.items[0], visual: 'family:missing'}]});
  assert.equal(bad.ok, false);
  assert.ok(['P_PURPOSE_VISUAL_UNKNOWN', 'P_PURPOSE_VISUAL'].includes(bad.errors[0].code));
  const stray = assembleComponents({...demoRequest, html: '<b>no</b>'});
  assert.equal(stray.ok, false);
  assert.equal(stray.errors[0].code, 'BAD_REQUEST');
});
