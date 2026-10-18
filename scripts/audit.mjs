import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {themes, palettes, axes, styleAxes, axisBans, nodeTypes, nodeSpecs, templateList, createBlueprint, repairAxes, pageTypes, limits} from '../src/catalog.mjs';
import {compile, validateBlueprint, resolveTokens} from '../src/compiler.mjs';
import {serializableContrast} from '../src/tokens.mjs';

const t0 = Date.now();
const evidence = JSON.parse(await readFile(new URL('../docs/evidence/coolors-palettes.json', import.meta.url), 'utf8'));
const observed = new Set(evidence.palettes.map(p => p.colors.join('-')));
for (const p of Object.values(palettes)) assert.ok(observed.has(p.colors.join('-')), 'Palette missing in rendered Coolors evidence: ' + p.id);
for (const t of Object.values(themes)) assert.ok(t.palettes.length >= 3, 'Theme needs 3+ palette candidates: ' + t.id);
assert.equal(new Set(Object.values(themes).flatMap(t => t.palettes)).size, Object.keys(palettes).length, 'Every palette belongs to exactly one theme');

// ---- 1. contrast: every palette × mode × role pair ----
let pairs = 0, modes = 0; const contrastRows = []; let tightest = {margin: Infinity};
for (const p of Object.values(palettes)) for (const mode of ['light', 'dark']) {
  const r = resolveTokens({palette: p.id, mode}, mode); modes++;
  let min = {margin: Infinity};
  for (const pair of serializableContrast(r.report)) {
    assert.ok(pair.ratio >= pair.minimum, `${p.id}/${mode}: ${pair.name} ${pair.ratio} < ${pair.minimum}`);
    pairs++; const margin = pair.ratio / pair.minimum; if (margin < min.margin) min = {margin, name: pair.name, ratio: pair.ratio, minimum: pair.minimum};
  }
  contrastRows.push({palette: p.id, theme: p.theme, mode, pairs: r.report.length, tightest: {name: min.name, ratio: min.ratio, minimum: min.minimum}, adjusted: r.provenance.adjusted});
  if (min.margin < tightest.margin) tightest = {palette: p.id, mode, ...min};
}

// ---- 2. every node example is valid, compiles, and matches its declared spec ----
let examples = 0;
const base = createBlueprint('about-team');
for (const type of nodeTypes) {
  const ex = nodeSpecs[type].example;
  if (ex === null) continue;
  const b = structuredClone(base); b.pageType = 'general';
  const filler = {type: 'prose', title: '본문', body: '내용'};
  b.tree = {type: 'page', children: type === 'page-header' ? [structuredClone(ex), filler] : [{type: 'page-header', title: nodeSpecs[type].label}, structuredClone(ex)]};
  if (type === 'toc') b.tree.children.push({type: 'section', title: 'A', anchor: 'a', children: [filler]}, {type: 'section', title: 'B', anchor: 'b', children: [filler]});
  const r = validateBlueprint(b); assert.ok(r.valid, `example for ${type}: ` + JSON.stringify(r.errors)); compile(b); examples++;
}

// ---- 3. template × theme matrix with each theme's default palette, plus each palette on a rotating template ----
let matrix = 0;
for (const t of templateList) for (const th of Object.values(themes)) { const b = createBlueprint(t.id, th.id); const r = validateBlueprint(b); assert.ok(r.valid, `${t.id} × ${th.id}: ` + JSON.stringify(r.errors[0])); compile(b); matrix++; }
let palettePages = 0;
for (const [i, p] of Object.values(palettes).entries()) for (const mode of ['light', 'dark', 'auto']) {
  const th = themes[p.theme], tpl = templateList[(i * 7) % templateList.length];
  const b = createBlueprint(tpl.id, th.id, p.id); b.mode = mode; repairAxes(b);
  const r = validateBlueprint(b); if (!r.valid) { assert.ok(r.errors.every(e => ['THEME_FORBID', 'AXIS_BAN'].includes(e.code)), JSON.stringify(r.errors)); continue; }
  compile(b); palettePages++;
}

// ---- 4. axis bans: predicates read only declared axes, fixes resolve their own ban ----
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rnd = mulberry(20261018);
const pick = list => list[Math.floor(rnd() * list.length)];
const randomAxes = () => Object.fromEntries(['mode', ...styleAxes].map(k => [k, pick(axes[k])]));
for (const ban of axisBans) {
  for (let i = 0; i < 300; i++) {
    const a = randomAxes(), read = new Set();
    ban.bad(new Proxy(a, {get: (o, k) => { if (typeof k === 'string') read.add(k); return o[k]; }}));
    for (const k of read) assert.ok(ban.uses.includes(k), `${ban.id} reads undeclared axis ${k}`);
    if (ban.bad(a)) { const fixed = {...a, ...ban.fix}; assert.equal(ban.bad(fixed), false, `${ban.id} fix does not resolve itself`); for (const [k, v] of Object.entries(ban.fix)) assert.ok(axes[k].includes(v), `${ban.id} fix value invalid`); }
  }
}

// ---- 5. pairwise axis coverage (theme × all style axes) ----
const axisKeys = ['theme', 'mode', ...styleAxes];
const valuesOf = k => k === 'theme' ? Object.keys(themes) : axes[k];
const allowedTuple = a => !axisBans.some(b => b.bad(a)) && !Object.entries(themes[a.theme].forbid).some(([k, v]) => v.includes(a[k]));
const pairKey = (i, vi, j, vj) => `${axisKeys[i]}=${vi}|${axisKeys[j]}=${vj}`;
const allowedPairs = new Set();
for (let i = 0; i < axisKeys.length; i++) for (let j = i + 1; j < axisKeys.length; j++) for (const vi of valuesOf(axisKeys[i])) for (const vj of valuesOf(axisKeys[j])) {
  const probe = {[axisKeys[i]]: vi, [axisKeys[j]]: vj};
  // a pair is allowed when no ban/forbid decided by these two values alone already rejects it
  const theme = probe.theme ? themes[probe.theme] : null;
  let ok = true;
  for (const ban of axisBans) if (ban.uses.every(u => u in probe) && ban.bad(probe)) ok = false;
  if (theme) for (const [k, v] of Object.entries(theme.forbid)) if (k in probe && v.includes(probe[k])) ok = false;
  if (ok) allowedPairs.add(pairKey(i, vi, j, vj));
}
const tuplePairs = a => { const out = []; for (let i = 0; i < axisKeys.length; i++) for (let j = i + 1; j < axisKeys.length; j++) out.push(pairKey(i, a[axisKeys[i]], j, a[axisKeys[j]])); return out; };
const randomValid = (fixed = {}) => { for (let n = 0; n < 4000; n++) { const a = {...Object.fromEntries(axisKeys.map(k => [k, pick(valuesOf(k))])), ...fixed}; if (allowedTuple(a)) return a; } return null; };
const covered = new Set(), suite = [];
while (covered.size < allowedPairs.size) {
  let best = null, gain = 0;
  for (let n = 0; n < 60; n++) { const a = randomValid(); if (!a) continue; const g = tuplePairs(a).filter(k => allowedPairs.has(k) && !covered.has(k)).length; if (g > gain) { gain = g; best = a; } }
  if (!best || gain === 0) {
    const missing = [...allowedPairs].find(k => !covered.has(k)); if (!missing) break;
    const fixed = Object.fromEntries(missing.split('|').map(s => { const [k, v] = s.split('='); return [k, v]; }));
    const a = randomValid(fixed); if (!a) { covered.add(missing); allowedPairs.delete(missing); continue; }
    best = a;
  }
  suite.push(best); tuplePairs(best).forEach(k => covered.add(k));
}
let pairwiseCompiled = 0;
for (const a of suite) {
  const th = themes[a.theme], b = createBlueprint('about-team', th.id, pick(th.palettes));
  Object.assign(b, Object.fromEntries(['mode', ...styleAxes].map(k => [k, a[k]])));
  b.chrome.nav = b.chrome.nav.slice(0, 2); // fits every shell; nav limits are a content rule, not an axis rule
  const r = validateBlueprint(b); assert.ok(r.valid, 'pairwise tuple rejected: ' + JSON.stringify(a) + JSON.stringify(r.errors[0]));
  compile(b); pairwiseCompiled++;
}

// ---- 6. palette × mode × shell factorial (raw validation shows what the rules reject) ----
let factorial = 0, factorialRejected = {}, factorialCompiled = 0;
for (const p of Object.values(palettes)) for (const mode of axes.mode) for (const shell of axes.shell) {
  factorial++;
  const b = createBlueprint('about-team', p.theme, p.id); Object.assign(b, {mode, shell});
  const raw = validateBlueprint(b);
  if (!raw.valid) for (const e of raw.errors) { assert.ok(['THEME_FORBID', 'AXIS_BAN', 'NAV_COUNT', 'NAV_ICON', 'FOOTER_LINKS'].includes(e.code), 'unexpected rejection ' + e.code); factorialRejected[e.code] = (factorialRejected[e.code] ?? 0) + 1; }
  repairAxes(b); if (b.shell !== shell) b.shell = shell; b.chrome.nav = b.chrome.nav.slice(0, 2); b.chrome.nav.forEach((n, i) => { n.icon ??= ['home', 'info'][i]; });
  const r = validateBlueprint(b); if (r.valid) { compile(b); factorialCompiled++; } else assert.ok(r.errors.every(e => ['THEME_FORBID', 'AXIS_BAN', 'PAGE_SHELL'].includes(e.code)), JSON.stringify(r.errors));
}

// ---- 7. size of the allowed space, factored by the axes each rule couples ----
function countAllowed() {
  let total = 0n;
  for (const th of Object.values(themes)) {
    const keys = ['mode', ...styleAxes], vals = Object.fromEntries(keys.map(k => [k, axes[k].filter(v => !(th.forbid[k] ?? []).includes(v))]));
    const parent = Object.fromEntries(keys.map(k => [k, k])), find = k => parent[k] === k ? k : (parent[k] = find(parent[k]));
    for (const b of axisBans) for (const u of b.uses.slice(1)) parent[find(u)] = find(b.uses[0]);
    const comps = {}; for (const k of keys) (comps[find(k)] ??= []).push(k);
    let n = 1n;
    for (const members of Object.values(comps)) {
      const rules = axisBans.filter(b => members.includes(b.uses[0])); let c = 0n;
      const rec = (i, cur) => { if (i === members.length) { if (!rules.some(b => b.bad(cur))) c++; return; } for (const v of vals[members[i]]) { cur[members[i]] = v; rec(i + 1, cur); } };
      rec(0, {}); n *= c;
    }
    total += n * BigInt(th.palettes.length);
  }
  return total;
}
const allowed = countAllowed();

await mkdir(new URL('../docs/evidence', import.meta.url), {recursive: true});
const summary = {catalogVersion: '2.0.0', palettes: Object.keys(palettes).length, modes, pairs, tightest: {palette: tightest.palette, mode: tightest.mode, name: tightest.name, ratio: tightest.ratio, minimum: tightest.minimum}, results: contrastRows};
await writeFile(new URL('../docs/evidence/contrast.json', import.meta.url), JSON.stringify(summary, null, 1) + '\n');
const coverage = {themes: Object.keys(themes).length, templates: templateList.length, nodeTypes: nodeTypes.length, examples, matrixCompiled: matrix, palettePagesCompiled: palettePages, allowedPairs: allowedPairs.size, pairwiseSuite: suite.length, pairwiseCompiled, factorial, factorialCompiled, factorialRejected, allowedCombinations: allowed.toString(), limits};
await writeFile(new URL('../docs/evidence/coverage.json', import.meta.url), JSON.stringify(coverage, null, 1) + '\n');
console.log(`AUDIT: ${Object.keys(palettes).length} palettes match rendered Coolors evidence (${evidence.palettes.length} observed); ${modes} color modes, ${pairs} used contrast pairs pass (tightest ${tightest.name} ${tightest.ratio.toFixed(2)}:${tightest.minimum} on ${tightest.palette}/${tightest.mode}).`);
console.log(`CATALOG: ${Object.keys(themes).length} themes, ${Object.keys(palettes).length} palettes, ${templateList.length} templates, ${nodeTypes.length} node types (${examples} examples compile), ${Object.keys(pageTypes).length} page types, ${axisBans.length} axis bans.`);
console.log(`MATRIX: ${matrix} template×theme pages + ${palettePages} palette×mode pages compile; ${pairwiseCompiled} pairwise tuples cover ${allowedPairs.size} allowed axis-value pairs; ${factorialCompiled}/${factorial} palette×mode×shell compile (${JSON.stringify(factorialRejected)} rejected before repair).`);
console.log(`SPACE: ${allowed.toLocaleString('en-US')} rule-allowed axis×palette combinations (factored count). ${((Date.now() - t0) / 1000).toFixed(1)}s`);
