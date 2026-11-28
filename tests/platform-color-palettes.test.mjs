import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PALETTES} from '../src/platform/data/palettes.mjs';
import {SUBTOKEN_SETS} from '../src/platform/data/subtoken-sets.mjs';
import {paletteRamps, checkPaletteDuplicates} from '../src/platform/color.mjs';
import {createPlatform, PALETTE_SLOTS, LICENSES} from '../src/platform/index.mjs';
import {colorContrast, COLOR_STEPS} from '../src/color-tokens.mjs';
import {palettes as coolors} from '../src/catalog.mjs';

const BASELINE_IDS = new Set(['palette:static-kit', 'palette:slate-neutral', 'palette:sunrise-warm', 'palette:ocean-cool', 'palette:forest-green', 'palette:clay-earth', 'palette:graphite-mono', 'palette:dusk-violet', 'palette:magenta-vivid']);
const NEW = PALETTES.filter(p => !BASELINE_IDS.has(p.id));
const brandL = hex => {
  const [r, g, b] = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
};

test('at least 200 project-owned palettes are registered, each with complete seeds and a rights record', () => {
  assert.ok(NEW.length >= 200, `new palettes: ${NEW.length}`);
  for (const p of PALETTES) {
    assert.ok(p.source && typeof p.source.origin === 'string' && p.source.origin.length > 8, `${p.id} rights origin`);
    assert.ok(LICENSES.includes(p.source.license), `${p.id} license ${p.source.license}`);
    for (const slot of ['brand', 'accent', 'neutral', 'success', 'warning', 'danger', 'info']) assert.match(p.seeds[slot] ?? '', /^#[0-9A-F]{6}$/, `${p.id}.${slot}`);
    assert.deepEqual(Object.keys(p.seeds).filter(k => !PALETTE_SLOTS.includes(k)), [], p.id);
  }
  const reg = createPlatform().registry;
  assert.deepEqual(reg.list('palette').map(p => p.id), PALETTES.map(p => p.id).sort(), 'all palettes reach the registry (including the license gate)');
});

test('10 palette groups each contain at least 20 entries and all group tags agree with their family', () => {
  const groups = ['neutral', 'blue-cyan', 'green-teal', 'warm', 'earth', 'purple-pink', 'pastel', 'vivid', 'luxury', 'multi-color'];
  for (const group of groups) {
    const entries = PALETTES.filter(p => p.tags.includes(`group:${group}`));
    assert.ok(entries.length >= 20, `${group}: ${entries.length}`);
    for (const p of entries.filter(p => !BASELINE_IDS.has(p.id))) assert.ok(p.tags.includes(`family:${group}`), `${p.id} family/group mismatch`);
  }
  assert.equal(new Set(PALETTES.flatMap(p => p.tags.filter(t => t.startsWith('group:')))).size, 10);
});

test('B1 tone classification follows the recorded OKLab brand-lightness rule', () => {
  for (const p of NEW) {
    const L = brandL(p.seeds.brand);
    const expected = L < 0.40 ? 'dark' : L > 0.56 ? 'bright' : 'mid';
    assert.equal(p.tone, expected, `${p.id} L=${L.toFixed(4)}`);
  }
});

test('every palette expands to an 11-step luminance ramp for every seed, darkening monotonically', () => {
  for (const p of PALETTES) {
    const ramps = paletteRamps(p);
    assert.deepEqual(Object.keys(ramps), Object.keys(p.seeds));
    for (const [slot, ramp] of Object.entries(ramps)) {
      assert.deepEqual(Object.keys(ramp), [...COLOR_STEPS], `${p.id}.${slot}`);
      const against = COLOR_STEPS.map(s => colorContrast(ramp[s], '#FFFFFF'));
      against.slice(1).forEach((v, i) => assert.ok(v > against[i], `${p.id}.${slot}: step ${COLOR_STEPS[i + 1]} is darker than ${COLOR_STEPS[i]}`));
    }
  }
});

test('rights: no seed equals a color of the legacy Coolors catalog, and palettes only record own origin', () => {
  const legacy = new Set(Object.values(coolors).flatMap(p => p.colors.map(c => c.toUpperCase())));
  assert.ok(legacy.size > 1000, 'the legacy catalog is loaded for the comparison');
  for (const p of NEW) {
    for (const [slot, hex] of Object.entries(p.seeds)) assert.ok(!legacy.has(hex), `${p.id}.${slot} ${hex} appears in the legacy catalog`);
    assert.match(p.source.origin, /자체 제작/);
    assert.ok(!p.tags.includes('coolors'));
  }
  assert.equal(PALETTES.filter(p => p.source.license !== 'internal').length, 0);
});

test('the 210 palette registry passes the documented OKLab duplicate thresholds', () => {
  const result = checkPaletteDuplicates(PALETTES);
  assert.equal(result.totalPairs, PALETTES.length * (PALETTES.length - 1) / 2);
  assert.equal(result.ok, true, JSON.stringify(result.duplicatePairs.slice(0, 5)));
});

test('palette preferences point at registered sets with a reason and the ids stay stable for the other workers', () => {
  const ids = new Set(SUBTOKEN_SETS.map(s => s.id));
  for (const p of PALETTES) for (const e of p.relations.filter(e => e.to.startsWith('subtoken-set:'))) {
    assert.ok(ids.has(e.to), `${p.id} → ${e.to}`);
    assert.ok(e.reason.length > 8);
  }
  for (const id of [
    'palette:static-kit', 'palette:slate-neutral', 'palette:sunrise-warm', 'palette:ocean-cool', 'palette:forest-green',
    'palette:clay-earth', 'palette:graphite-mono', 'palette:dusk-violet', 'palette:magenta-vivid',
  ]) assert.ok(PALETTES.some(p => p.id === id), `baseline palette ${id}`);
});
