import {test} from 'node:test';
import assert from 'node:assert/strict';
import {queryMaterials, MATERIAL_VIEWS} from '../src/service/index.mjs';
import {STATIC_COLOR_PALETTE, resolveColorTokens} from '../src/color-tokens.mjs';
import {MATERIAL_TYPE_PRESETS, MULTILINGUAL_TYPE_CORPUS, CONTROL_SIZES, renderMaterialTypeCSS, catalogRegistry} from '../src/materials/index.mjs';

const read = view => { const r = queryMaterials({view}); assert.equal(r.ok, true, view); return r.value; };

test('color view carries exactly what src/color-tokens.mjs computes (seeds, ramps, both modes, contrast report)', () => {
  const v = read('color');
  const light = resolveColorTokens({palette: 'static-kit', mode: 'light'}), dark = resolveColorTokens({palette: 'static-kit', mode: 'dark'});
  assert.deepEqual(v.palette.seeds, STATIC_COLOR_PALETTE.seeds);
  assert.deepEqual(v.ramps, light.ramps);
  assert.deepEqual(v.tokens.light, light.tokens);
  assert.deepEqual(v.tokens.dark, dark.tokens);
  assert.deepEqual(v.report.dark, dark.modes.dark.report);
  assert.equal(v.materials.length, catalogRegistry().byKind('color-token').length);
  assert.notEqual(v.tokens.light['color-action'], v.tokens.dark['color-action']);
});

test('typography view carries the role presets, corpus, control sizes and the preset CSS unchanged', () => {
  const v = read('typography');
  assert.deepEqual(v.presets, Object.values(MATERIAL_TYPE_PRESETS));
  assert.deepEqual(v.corpus, MULTILINGUAL_TYPE_CORPUS);
  assert.deepEqual(v.controlSizes, Object.keys(CONTROL_SIZES));
  for (const id of Object.keys(MATERIAL_TYPE_PRESETS)) assert.equal(v.css[id], renderMaterialTypeCSS(id), id);
});

test('foundations view lists every axis with its value table and the layout primitives', () => {
  const v = read('foundations');
  const reg = catalogRegistry();
  assert.deepEqual(v.axes.map(a => a.id), reg.byKind('axis').map(a => a.id));
  assert.deepEqual(v.axes.find(a => a.id === 'axis:radius').ext.table, reg.get('axis:radius').ext.table);
  assert.equal(v.layoutPrimitives.length, reg.byKind('layout-primitive').length);
});

test('no view exposes the Coolors palette materials (rights audit docs/materials/audit.md §3)', () => {
  const paletteIds = catalogRegistry().byKind('palette').map(p => p.id);
  assert.ok(paletteIds.length > 400);
  for (const view of MATERIAL_VIEWS) {
    const text = JSON.stringify(read(view));
    assert.equal(/coolors/i.test(text), false, view);
    assert.equal(/"palette:[a-z0-9.-]+"/.test(text), false, view);
    for (const id of paletteIds.slice(0, 50)) assert.equal(text.includes(`"${id}"`), false, `${view} ${id}`);
  }
});

test('results are plain JSON copies: callers can change them without touching the frozen Core tables', () => {
  const a = read('color');
  a.palette.seeds.brand = '#000000';
  a.ramps.brand['500'] = '#000000';
  assert.equal(read('color').palette.seeds.brand, STATIC_COLOR_PALETTE.seeds.brand);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});

test('queryMaterials never throws: hostile or unknown input answers ok:false with a structured error', () => {
  const cyc = {}; cyc.self = cyc;
  for (const input of [undefined, null, 0, 'x', [], cyc, () => 1, {view: 5}, {view: 'palettes'}, {view: 'color', extra: 1}, {__proto__: null}, 1n]) {
    let r; assert.doesNotThrow(() => { r = queryMaterials(input); }, typeof input);
    assert.equal(r.ok, false);
    assert.equal(typeof r.errors[0].code, 'string');
    assert.ok(r.errors[0].hint || r.errors[0].message);
  }
  assert.equal(queryMaterials({view: 'palettes'}).errors[0].path, '$args.view');
});
