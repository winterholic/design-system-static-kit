import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SUBTOKEN_SETS, SUBTOKEN_SET_DESIGNS} from '../src/platform/data/subtoken-sets.mjs';
import {PALETTES} from '../src/platform/data/palettes.mjs';
import {bindColor, colorMatrix} from '../src/platform/color.mjs';
import {COLOR_ROLES} from '../src/platform/contract.mjs';

const REQUIRED_25_IDS = [
  'subtoken-set:standard',
  'subtoken-set:tinted',
  'subtoken-set:editorial-warm',
  'subtoken-set:commerce-vivid',
  'subtoken-set:premium-dark',
  'subtoken-set:high-contrast',
  'subtoken-set:data-dense',
  'subtoken-set:brand-dominant',
  'subtoken-set:accent-dominant',
  'subtoken-set:soft-pastel',
  'subtoken-set:minimal-monochrome',
  'subtoken-set:premium-light',
  'subtoken-set:editorial-ink',
  'subtoken-set:corporate',
  'subtoken-set:finance-precision',
  'subtoken-set:analytics',
  'subtoken-set:developer-console',
  'subtoken-set:commerce-luxury',
  'subtoken-set:mobile-soft',
  'subtoken-set:social-expressive',
  'subtoken-set:wellness-calm',
  'subtoken-set:education-friendly',
  'subtoken-set:glass-compatible',
  'subtoken-set:brutalist-contrast',
  'subtoken-set:gradient-compatible',
];

test('25 subtoken sets are registered and cover all requirements from §4.4', () => {
  assert.equal(SUBTOKEN_SETS.length, 25, `Expected exactly 25 subtoken sets, got ${SUBTOKEN_SETS.length}`);
  const registeredIds = SUBTOKEN_SETS.map(s => s.id);
  for (const id of REQUIRED_25_IDS) {
    assert.ok(registeredIds.includes(id), `Missing required subtoken set: ${id}`);
    assert.ok(SUBTOKEN_SET_DESIGNS[id], `Missing derived design for ${id}`);
  }
});

test('each subtoken set has structured metadata and role allocation rules', () => {
  for (const set of SUBTOKEN_SETS) {
    assert.ok(set.roles, `${set.id} must define roles`);
    assert.ok(set.states, `${set.id} must define states`);
    assert.ok(set.components, `${set.id} must define components`);
    assert.ok(set.charts, `${set.id} must define charts`);
    assert.ok(set.contexts && set.contexts.length > 0, `${set.id} must define contexts`);
    assert.ok(set.weights, `${set.id} must define brand/accent/neutral weight distribution`);
    assert.ok(set.modes && set.modes.includes('light') && set.modes.includes('dark'), `${set.id} must support light and dark`);
  }
});

test('differentiation: no two subtoken sets produce the same semantic role tokens on any palette', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark']) {
      const tokenMaps = new Map();
      for (const set of SUBTOKEN_SETS) {
        const bound = bindColor(p, set, mode);
        if (!bound.ok) continue; // skip non-matching pairs for role differentiation comparison
        const tokenHash = JSON.stringify(bound.roles);
        assert.ok(
          !tokenMaps.has(tokenHash),
          `Palette ${p.id} mode ${mode}: ${set.id} produces identical role tokens to ${tokenMaps.get(tokenHash)}`
        );
        tokenMaps.set(tokenHash, set.id);
      }
    }
  }
});
