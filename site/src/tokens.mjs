import {palettes} from './catalog.mjs';

const rgb = hex => { if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Expected six digit hex color'); return hex.slice(1).match(/../g).map(n => parseInt(n, 16)); };
const hex = values => '#' + values.map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
export const mix = (a, b, t) => hex(rgb(a).map((x, i) => x * (1 - t) + rgb(b)[i] * t));
const luminance = h => rgb(h).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function hue(h) {
  const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return {h: 0, s: 0};
  const l = (mx + mn) / 2, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return {h: hh * 60, s};
}
const hueDistance = (a, b) => { const d = Math.abs(hue(a).h - hue(b).h); return Math.min(d, 360 - d); };

const INK = '#10151C';
// Decisions keep a 1e-6 margin so last-bit Math.pow differences between platforms can never flip a chosen color.
const EPS = 1e-6;
/** Move `seed` toward black (light) or white (dark) until it passes `minimum` against every background. */
function ensure(seed, bgs, minimum, dark) {
  for (let i = 0; i <= 100; i++) { const color = mix(seed, dark ? '#FFFFFF' : '#000000', i / 100); if (bgs.every(bg => contrast(color, bg) >= minimum + EPS)) return color; }
  throw new Error('No contrast-safe token mapping for ' + seed);
}
/** A fill that carries 4.5:1 text in white or ink: keep it if it already does, else take the smaller move. */
function ensureFill(color) {
  const ok = c => Math.max(contrast(c, '#FFFFFF'), contrast(c, INK)) >= 4.5 + EPS;
  if (ok(color)) return color;
  for (let i = 1; i <= 100; i++) for (const target of ['#000000', '#FFFFFF']) { const c = mix(color, target, i / 100); if (ok(c)) return c; }
  throw new Error('No fill-safe mapping for ' + color);
}
const onFill = c => contrast('#FFFFFF', c) >= 4.5 + EPS ? '#FFFFFF' : INK;
const samples = (a, b) => Array.from({length: 11}, (_, i) => mix(a, b, i / 10));

export function resolveTokens(b, modeOverride) {
  const p = palettes[b.palette]; if (!p) throw new Error('Unknown palette');
  const mode = modeOverride ?? (b.mode === 'auto' ? 'light' : b.mode), dark = mode === 'dark';
  const ordered = [...p.colors].sort((x, y) => luminance(x) - luminance(y));
  const darkest = ordered[0], lightest = ordered.at(-1), seed = p.colors[p.brand];
  const canvas = dark ? mix(darkest, '#11151C', .8) : mix(lightest, '#FFFFFF', .87);
  const surface = dark ? mix(darkest, '#252B34', .9) : '#FFFFFF';
  const soft = dark ? mix(seed, surface, .94) : mix(seed, '#FFFFFF', .93);
  const sunken = dark ? mix(canvas, '#000000', .22) : mix(canvas, '#000000', .035);
  // Second hue: the saturated swatch farthest in hue from the brand seed; falls back to the swatch farthest in lightness.
  const vivid = p.colors.filter(c => hue(c).s > .2 && c !== seed);
  const accentRaw = (vivid.length ? vivid : p.colors.filter(c => c !== seed)).reduce((best, c) => (hueDistance(c, seed) + Math.abs(luminance(c) - luminance(seed))) > (hueDistance(best, seed) + Math.abs(luminance(best) - luminance(seed))) ? c : best);
  const accentSoft = dark ? mix(accentRaw, surface, .9) : mix(accentRaw, '#FFFFFF', .9);
  const backgrounds = [canvas, surface, soft, sunken, accentSoft];
  const action = ensure(seed, backgrounds, 4.5, dark);
  const actionHover = mix(action, dark ? '#FFFFFF' : '#000000', .12);
  const accent = ensureFill(accentRaw);
  const text = ensure(dark ? '#F3F5F7' : '#182029', backgrounds, 7, dark);
  const muted = ensure(dark ? '#ACB6C3' : '#586476', backgrounds, 4.5, dark);
  // Chart colors: brand, accent, then the remaining swatches by hue distance, each 3:1 against surface and canvas.
  const rest = p.colors.filter(c => c !== seed && c !== accentRaw && hue(c).s > .15).sort((x, y) => (hueDistance(y, seed) + hueDistance(y, accentRaw)) - (hueDistance(x, seed) + hueDistance(x, accentRaw)));
  const chartSeeds = [seed, accentRaw, ...rest, mix(seed, accentRaw, .5), mix(seed, INK, .4), mix(accentRaw, INK, .4)].slice(0, 5);
  const chart = chartSeeds.map(c => ensure(c, [canvas, surface], 3, dark));
  const tokens = {
    canvas, surface, soft, sunken, accentSoft, text, muted, action, onAction: onFill(action), actionHover, onActionHover: onFill(actionHover), link: action,
    focus: ensure(seed, backgrounds, 3, dark), rule: ensure(dark ? '#788798' : '#78818E', [canvas, surface, sunken], 3, dark), border: dark ? '#45505E' : '#DDE2E7',
    success: ensure('#18714C', backgrounds, 4.5, dark), warning: ensure('#946000', backgrounds, 4.5, dark), danger: ensure('#B83543', backgrounds, 4.5, dark), info: ensure('#2A63C9', backgrounds, 4.5, dark),
    accent, onAccent: onFill(accent), accentInk: ensure(accentRaw, backgrounds, 4.5, dark),
    chart1: chart[0], chart2: chart[1], chart3: chart[2], chart4: chart[3], chart5: chart[4],
  };
  const report = [], pair = (name, fg, bg, minimum) => report.push({name, foreground: fg, background: bg, ratio: contrast(fg, bg), minimum});
  const bgNames = ['canvas', 'surface', 'soft', 'sunken', 'accentSoft'];
  for (const key of ['text', 'muted', 'link', 'success', 'warning', 'danger', 'info', 'accentInk']) for (const bg of bgNames) pair(`${key}/${bg}`, tokens[key], tokens[bg], key === 'text' ? 7 : 4.5);
  for (const bg of bgNames) pair(`focus/${bg}`, tokens.focus, tokens[bg], 3);
  pair('onActionHover/actionHover', tokens.onActionHover, actionHover, 4.5); pair('onAction/action', tokens.onAction, action, 4.5); pair('onAccent/accent', tokens.onAccent, accent, 4.5);
  for (const bg of ['canvas', 'surface', 'sunken']) pair(`rule/${bg}`, tokens.rule, tokens[bg], 3);
  for (let i = 0; i < 5; i++) for (const bg of ['canvas', 'surface']) pair(`chart${i + 1}/${bg}`, chart[i], tokens[bg], 3);
  // Gradient backdrops: text roles are checked on 11 samples of each wash.
  samples(canvas, soft).forEach((g, i) => { pair(`text/washA@${i}`, text, g, 7); pair(`muted/washA@${i}`, muted, g, 4.5); });
  samples(soft, accentSoft).forEach((g, i) => { pair(`text/washB@${i}`, text, g, 7); pair(`muted/washB@${i}`, muted, g, 4.5); });
  return {tokens, report, provenance: {source: p.source, original: p.colors, brandSeed: seed, accentSeed: accentRaw, action, accent, adjusted: seed !== action, method: 'sRGB mixing toward white (dark mode) or black (light mode) until every used background passes; original swatches preserved'}};
}

/** Token sets a blueprint needs: one for light/dark, both for auto. */
export function resolveAll(b) {
  const modes = b.mode === 'auto' ? ['light', 'dark'] : [b.mode];
  return Object.fromEntries(modes.map(m => [m, resolveTokens(b, m)]));
}

// Conservative artifact precision avoids platform-level last-bit drift; never used for acceptance gates.
export const serializableContrast = report => report.map(pair => ({...pair, ratio: Math.floor(pair.ratio * 1e8) / 1e8}));
