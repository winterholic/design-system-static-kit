import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPaletteDuplicates, DEDUPLICATION_THRESHOLDS, paletteDistance} from '../src/platform/color.mjs';

const base = {
  brand: '#2F6B9A', neutral: '#646B72', accent: '#C24B6A',
  success: '#2D7A50', warning: '#A46B00', danger: '#B83B43', info: '#3C65B5',
};
const palette = (id, seeds) => ({id: `palette:${id}`, seeds});

function shiftLightness(hex, offset) {
  const [r, g, b] = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s + offset;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bLab = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const lp = (L + 0.3963377774 * a + 0.2158037573 * bLab) ** 3;
  const mp = (L - 0.1055613458 * a - 0.0638541728 * bLab) ** 3;
  const sp = (L - 0.0894841775 * a - 1.2914855480 * bLab) ** 3;
  const srgb = [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.7076147010 * sp,
  ].map(c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  return `#${srgb.map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

test('palette dedupe rejects a permutation of brand, neutral, and accent', () => {
  const permuted = {...base, brand: base.accent, accent: base.neutral, neutral: base.brand};
  const result = checkPaletteDuplicates([palette('original', base), palette('permuted', permuted)]);
  assert.equal(result.ok, false);
  assert.equal(result.duplicatePairs[0].reason, 'permutation-or-identical-colors');
});

test('palette dedupe rejects a slight lightness-only variant without relaxing thresholds', () => {
  const shifted = Object.fromEntries(Object.entries(base).map(([slot, hex]) => [slot, shiftLightness(hex, 0.02)]));
  assert.equal(paletteDistance(palette('original', base), palette('lightness-shift', shifted)).isLightnessShift, true);
  const result = checkPaletteDuplicates([palette('original', base), palette('lightness-shift', shifted)]);
  assert.equal(result.ok, false);
  assert.equal(result.duplicatePairs[0].reason, 'lightness-shift-variation');
  assert.deepEqual(DEDUPLICATION_THRESHOLDS, {
    SET_DISTANCE_MIN: 0.040,
    SLOT_DISTANCE_MIN: 0.045,
    BRAND_ACCENT_PAIR_MIN: 0.035,
  });
});
