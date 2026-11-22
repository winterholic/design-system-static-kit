import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PALETTES} from '../src/platform/data/palettes.mjs';
import {SUBTOKEN_SETS} from '../src/platform/data/subtoken-sets.mjs';
import {paletteRamps, hueGap, CHROMATIC} from '../src/platform/color.mjs';
import {createPlatform, PALETTE_SLOTS, LICENSES} from '../src/platform/index.mjs';
import {colorContrast, COLOR_STEPS} from '../src/color-tokens.mjs';
import {palettes as coolors} from '../src/catalog.mjs';

const NEW = PALETTES.filter(p => p.id !== 'palette:static-kit');
const family = p => p.tags.find(t => t.startsWith('family:')).slice('family:'.length);
const hsl = hex => {
  const [r, g, b] = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  return {chroma: d, s: d ? d / (1 - Math.abs(mx + mn - 1)) : 0};
};

test('at least eight project-owned palettes are registered, each with a brand, a secondary and a neutral seed and only internal or MIT rights', () => {
  assert.ok(NEW.length >= 8, `new palettes: ${NEW.length}`);
  for (const p of PALETTES) {
    assert.ok(LICENSES.includes(p.source.license), `${p.id} license ${p.source.license}`);
    for (const slot of ['brand', 'accent', 'neutral', 'success', 'warning', 'danger', 'info']) assert.match(p.seeds[slot] ?? '', /^#[0-9A-F]{6}$/, `${p.id}.${slot}`);
    assert.deepEqual(Object.keys(p.seeds).filter(k => !PALETTE_SLOTS.includes(k)), [], p.id);
  }
  const reg = createPlatform().registry;
  assert.deepEqual(reg.list('palette').map(p => p.id), PALETTES.map(p => p.id).sort(), 'all palettes reach the registry (including the license gate)');
});

test('palette families do not overlap: brand hue or saturation differs, and the required families are present', () => {
  const fam = PALETTES.map(family);
  assert.equal(new Set(fam).size, fam.length, 'one palette per family');
  for (const need of ['neutral', 'warm', 'cool', 'green', 'earth', 'mono', 'vivid']) assert.ok(fam.includes(need), `family ${need}`);
  for (let i = 0; i < PALETTES.length; i++) for (let j = i + 1; j < PALETTES.length; j++) {
    const [a, b] = [PALETTES[i].seeds.brand, PALETTES[j].seeds.brand], [ha, hb] = [hsl(a), hsl(b)];
    const achromaticMismatch = (ha.chroma < CHROMATIC) !== (hb.chroma < CHROMATIC);
    const distinct = achromaticMismatch || hueGap(a, b) >= 25 || Math.abs(ha.s - hb.s) >= 0.3;
    assert.ok(distinct, `${PALETTES[i].id} (${a}) and ${PALETTES[j].id} (${b}) read as one family`);
  }
  const mono = PALETTES.find(p => family(p) === 'mono');
  assert.ok(hsl(mono.seeds.brand).chroma < CHROMATIC, 'mono brand is achromatic');
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

test('palette preferences point at registered sets with a reason and the ids stay stable for the other workers', () => {
  const ids = new Set(SUBTOKEN_SETS.map(s => s.id));
  for (const p of PALETTES) for (const e of p.relations.filter(e => e.to.startsWith('subtoken-set:'))) {
    assert.ok(ids.has(e.to), `${p.id} → ${e.to}`);
    assert.ok(e.reason.length > 8);
  }
  assert.deepEqual(PALETTES.map(p => p.id), [
    'palette:static-kit', 'palette:slate-neutral', 'palette:sunrise-warm', 'palette:ocean-cool', 'palette:forest-green',
    'palette:clay-earth', 'palette:graphite-mono', 'palette:dusk-violet', 'palette:magenta-vivid',
  ]);
});
