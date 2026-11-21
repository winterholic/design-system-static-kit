import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint, migrateBlueprint, blueprintSchema, ACCEPTED_CATALOG_VERSIONS, CATALOG_VERSION, VERSION_ORDER, TOP_LEVEL_SINCE_FIELDS, palettes} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {resolveColorTokens, colorPaletteOptions, COLOR_COMPONENT_CONTRACT, COLOR_STATES} from '../src/color-tokens.mjs';
import {catalogRegistry} from '../src/materials/index.mjs';

const base = () => ({...migrateBlueprint(createBlueprint('saas-landing'), '2.6.0'), colorPalette: 'static-kit'});

test('2.6.0 is opt-in and does not change the creation default', () => {
  assert.deepEqual([...VERSION_ORDER], ['2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0']);
  assert.ok(ACCEPTED_CATALOG_VERSIONS.includes('2.6.0'));
  assert.equal(CATALOG_VERSION, '2.4.0');
  assert.equal(createBlueprint('saas-landing').catalogVersion, '2.4.0');
  assert.equal(blueprintSchema().properties.colorPalette.enum.join(','), 'static-kit');
  assert.equal(blueprintSchema().properties.colorPalette['x-since'], '2.6.0');
  assert.deepEqual(TOP_LEVEL_SINCE_FIELDS, [{field:'colorPalette',values:['static-kit'],since:'2.6.0'}]);
  const old = {...migrateBlueprint(createBlueprint('saas-landing'), '2.5.0'), colorPalette: 'static-kit'};
  assert.ok(validateBlueprint(old).errors.some(e => e.path === '$.colorPalette' && e.code === 'VERSION_FIELD'));
});

test('static-kit palette seeds expand to a closed four-layer reference graph and three luminance ramps', () => {
  const result = resolveColorTokens({palette: 'static-kit', mode: 'light'});
  assert.deepEqual(Object.keys(result.layers), ['primitive', 'semantic', 'state', 'component']);
  assert.deepEqual(Object.keys(result.ramps), ['brand', 'neutral', 'auxiliary', 'status', 'chart']);
  const checkRamp = ramp => assert.deepEqual(Object.keys(ramp), ['50','100','200','300','400','500','600','700','800','900','950']);
  for (const key of ['brand','neutral','auxiliary']) checkRamp(result.ramps[key]);
  for (const ramp of Object.values(result.ramps.status)) checkRamp(ramp);
  for (const ramp of result.ramps.chart) checkRamp(ramp);
  assert.ok(result.seeds.brand && result.seeds.neutral && result.seeds.auxiliary && result.seeds.status && result.seeds.chart);
  for (const [id, ref] of Object.entries(result.references)) assert.ok(result.values[ref], `${id} references ${ref}`);
  assert.ok(result.report.length > 0 && result.report.every(x => x.ratio >= x.minimum));
  assert.throws(() => resolveColorTokens({palette: '#ff0000', mode: 'light'}), /COLOR_PALETTE/);
  assert.throws(() => resolveColorTokens({palette: 'unknown', mode: 'light'}), /COLOR_PALETTE/);
});

test('the same graph resolves light, dark and auto and exposes component consumption/state contracts', () => {
  const light = resolveColorTokens({palette: 'static-kit', mode: 'light'});
  const dark = resolveColorTokens({palette: 'static-kit', mode: 'dark'});
  const auto = resolveColorTokens({palette: 'static-kit', mode: 'auto'});
  assert.deepEqual(Object.keys(auto.modes), ['light', 'dark']);
  assert.ok(Object.values(auto.modes).every(x => x.report.every(pair => pair.ratio >= pair.minimum)));
  assert.notEqual(light.tokens.surface, dark.tokens.surface);
  assert.deepEqual(Object.keys(COLOR_COMPONENT_CONTRACT), ['button', 'input', 'select', 'card', 'table', 'chart']);
  for (const component of Object.values(COLOR_COMPONENT_CONTRACT)) assert.ok(component.states.includes('default') && component.tokens.length);
  assert.deepEqual(COLOR_STATES, ['default', 'hover', 'active', 'disabled', 'error', 'focus']);
  assert.deepEqual(colorPaletteOptions().map(x => x.id), ['static-kit']);
  assert.ok(Object.keys(palettes).length > 1, 'legacy Coolors inputs remain in the source catalog');
});

test('2.6.0 compiles real CSS use sites with internally resolved colors and deterministic output', () => {
  const b = base();
  const first = compile(b), second = compile(structuredClone(b));
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.manifest.catalogVersion, '2.6.0');
  assert.match(first.css, /--kit-action-hover:/);
  assert.match(first.css, /\.kit-button:disabled/);
  assert.match(first.css, /\.kit-field :is\(input,select,textarea\):focus-visible/);
  assert.ok(first.manifest.colorTokens.references && first.manifest.colorTokens.contrast.length);
  assert.ok(first.manifest.colorTokens.usedTokens.some(t => t.id === 'color-token:component.button.action-hover' && t.cssName === '--kit-action-hover'));
  for(const token of first.manifest.colorTokens.usedTokens) assert.match(first.css,new RegExp(token.cssName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+':'));
  assert.ok(!JSON.stringify(first).includes('#ff0000'));
  const invalid = {...b, colorPalette: '#ff0000'};
  assert.ok(validateBlueprint(invalid).errors.some(e => e.path === '$.colorPalette'));
});

test('2.4.0 to 2.6.0 migration is opt-in, preserves all other input, and compiles with internal colors', () => {
  const old = createBlueprint('saas-landing'), upgraded = migrateBlueprint(old, '2.6.0');
  assert.deepEqual({...upgraded, catalogVersion: old.catalogVersion}, old);
  assert.equal(upgraded.catalogVersion, '2.6.0');
  const result = compile({...upgraded, colorPalette:'static-kit'});
  assert.equal(result.manifest.catalogVersion, '2.6.0');
  assert.ok(result.css.includes('--kit-color-canvas:'));
  assert.ok(result.css.includes('--kit-state-action-hover:'));
  assert.equal(migrateBlueprint(upgraded, '2.5.0').catalogVersion, '2.6.0', 'migration never downgrades');
});

test('2.6.0 color tokens are registered with CSS names and actual usage', () => {
  const r = catalogRegistry();
  const materials = r.byKind('color-token');
  assert.ok(materials.length > 0);
  assert.ok(materials.some(m => m.tokens.includes('--kit-action-hover')));
  assert.ok(materials.some(m => m.tokens.includes('--kit-control-error')));
  assert.ok(materials.some(m => m.id === 'color-token:palette.static-kit.brand.50'));
  assert.ok(materials.some(m => m.id === 'color-token:state.action-hover'));
  assert.deepEqual(r.check(), []);
});
