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
  assert.deepEqual(TOP_LEVEL_SINCE_FIELDS.filter(f => f.field === 'colorPalette'), [{field:'colorPalette',values:['static-kit'],since:'2.6.0'}]); // typeRoles joined the 2.6.0 gate (tests/wire-260.test.mjs)
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

// W1(platform color): 플랫폼 색 작업이 src/color-tokens.mjs에 내보내기만 더했다. static-kit 출력은 작업 전(f1bcc2582)과 바이트가 같다.
test('static-kit color output is byte-identical to the pre-platform baseline (f1bcc2582): resolved graphs, CSS, materials and a 2.6.0 compile', async () => {
  const {createHash} = await import('node:crypto');
  const {colorTokenCSS, colorTokenMaterials} = await import('../src/color-tokens.mjs');
  const sha = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
  const compiled = compile(base());
  assert.deepEqual({
    light: sha(resolveColorTokens({palette: 'static-kit', mode: 'light'})), dark: sha(resolveColorTokens({palette: 'static-kit', mode: 'dark'})), auto: sha(resolveColorTokens({palette: 'static-kit', mode: 'auto'})),
    css: sha(colorTokenCSS()), materials: sha(colorTokenMaterials()), compile: sha(typeof compiled === 'string' ? compiled : JSON.stringify(compiled)),
  }, {
    light: '6eb3dbb6a99db4f1ce0c027c18c955a5f1e7aa1a212416fc5e6d141cd44a97a5', dark: '3cf82f2619f50e52193841451d47bd44f6af38b365a2fa592894520ceebc4505', auto: '4f15573210064ed3169dad107e9a126fa5eb3a7dd470e47afcc2df75f82d371e',
    css: '0c8c2528d062fe4984e5dc6f2774eea3c2b0352555314d14d940b81f67996736', materials: '971fbf4312e66b29e1dfb37c2aceaf68c2ab48f468c916d70423db9f2736895e', compile: 'f137f817bc75dcd49652884ecd67dd0893937fbaafa8d261a13d161fbf8c3717',
  });
});
