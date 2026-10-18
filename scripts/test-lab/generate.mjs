#!/usr/bin/env node
/** Test-lab generator: deterministic, resumable case generation for wide combination verification.
 *
 *  Usage:
 *    node scripts/test-lab/generate.mjs [--out site/test-lab] [--shard k/n] [--only a|b|c|d] [--force] [--verify]
 *
 *  Sets (seed 20261018, mulberry32):
 *    A: every template x every theme (2440) — preserves the audit matrix as real pages.
 *    B: every palette x light/dark/auto on a rotating template (<=480 valid pages).
 *    C: pairwise axis tuples from the audit greedy suite (450) on about-team.
 *    D: boundary/stress: data states, max-length KO/EN, long URL/numbers, error pages in
 *       dark mode, single-axis sweeps, ban-adjacent allowed pairs, must-reject negatives.
 *
 *  Committed outputs are deterministic (no wall-clock timestamps inside files).
 *  Run metadata goes to stdout and to gitignored `run.json` next to the outputs.
 */
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, stat, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {themes, palettes, axes, styleAxes, axisBans, templateList, templates, createBlueprint, repairAxes, pageTypes} from '../../src/catalog.mjs';
import {compile, validateBlueprint} from '../../src/compiler.mjs';

export const TEST_LAB_SEED = 20261018;
export const GENERATOR_VERSION = '1.0.0';

const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sha256 = s => createHash('sha256').update(s).digest('hex');

const args = {};
{ const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > 0) args[a.slice(2, eq)] = a.slice(eq + 1);
    else if (i + 1 < raw.length && !raw[i + 1].startsWith('--')) args[a.slice(2)] = raw[++i];
    else args[a.slice(2)] = true;
  } }
const OUT = resolve(fileURLToPath(new URL('../..', import.meta.url)), args.out ?? 'site/test-lab');
const CASES = join(OUT, 'cases');

function commitSha() { try { return execSync('git rev-parse HEAD', {cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8'}).trim(); } catch { return 'unknown'; } }

/** Full ordered case plan (no I/O). Each entry: {id, set, make() -> blueprint|null, note, viewports}. */
export function planCases() {
  const cases = [];
  // ---- A: template x theme ----
  for (const t of templateList) for (const th of Object.values(themes)) {
    cases.push({id: `a-${t.id}--${th.id}`, set: 'matrix', template: t.id, theme: th.id,
      make: () => createBlueprint(t.id, th.id), note: 'template×theme 전수', viewports: [390, 768, 1280]});
  }
  // ---- B: palette x mode on rotating template ----
  const plist = Object.values(palettes);
  plist.forEach((p, i) => {
    for (const mode of ['light', 'dark', 'auto']) {
      const tpl = templateList[(i * 7) % templateList.length];
      cases.push({id: `b-${p.id}--${mode}`, set: 'palette-mode', template: tpl.id, theme: p.theme, palette: p.id, mode,
        make: () => { const b = createBlueprint(tpl.id, themes[p.theme].id, p.id); b.mode = mode; repairAxes(b);
          const r = validateBlueprint(b);
          return r.valid ? b : {rejected: true, codes: r.errors.map(e => e.code)}; }, note: `팔레트×모드 (${tpl.id} 회전)`, viewports: [390, 1280]});
    }
  });
  // ---- C: pairwise suite (same greedy algorithm and seed as scripts/audit.mjs) ----
  for (const [i, a] of pairwiseSuite().entries()) {
    cases.push({id: `c-${String(i).padStart(3, '0')}`, set: 'pairwise', template: 'about-team', theme: a.theme,
      make: () => { const th = themes[a.theme], b = createBlueprint('about-team', th.id, th.palettes[i % th.palettes.length]);
        Object.assign(b, Object.fromEntries(['mode', ...styleAxes].map(k => [k, a[k]])));
        b.chrome.nav = b.chrome.nav.slice(0, 2);
        return validateBlueprint(b).valid ? b : null; }, note: '쌍별 커버링 튜플', viewports: [390, 1280], axes: a});
  }
  // ---- D: boundary / stress ----
  for (const d of stressCases()) cases.push(d);
  return cases;
}

function pairwiseSuite() {
  const rnd = mulberry(TEST_LAB_SEED), pick = l => l[Math.floor(rnd() * l.length)];
  const axisKeys = ['theme', 'mode', ...styleAxes];
  const valuesOf = k => k === 'theme' ? Object.keys(themes) : axes[k];
  const allowedTuple = a => !axisBans.some(b => b.bad(a)) && !Object.entries(themes[a.theme].forbid).some(([k, v]) => v.includes(a[k]));
  const pairKey = (i, vi, j, vj) => `${axisKeys[i]}=${vi}|${axisKeys[j]}=${vj}`;
  const allowedPairs = new Set();
  for (let i = 0; i < axisKeys.length; i++) for (let j = i + 1; j < axisKeys.length; j++) for (const vi of valuesOf(axisKeys[i])) for (const vj of valuesOf(axisKeys[j])) {
    const probe = {[axisKeys[i]]: vi, [axisKeys[j]]: vj};
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
  return suite;
}

/** Walk every node in a blueprint tree. */
function walk(node, fn) { if (!node || typeof node !== 'object') return; fn(node); for (const c of node.children ?? []) walk(c, fn); }

/** Set table/list data states. Returns mutated node count. empty=true clears rows/items first. */
function setDataStates(b, state, empty) {
  let n = 0;
  walk(b.tree, x => {
    if (x.type === 'table' && Array.isArray(x.rows)) { if (empty) x.rows = []; x.state = state; n++; }
    if (x.type === 'list' && Array.isArray(x.items)) { if (empty) x.items = []; x.state = state; n++; }
  });
  return n;
}

function firstHero(b) { let h = null; walk(b.tree, x => { if (!h && x.type === 'hero') h = x; }); return h; }
function firstHeader(b) { let h = null; walk(b.tree, x => { if (!h && x.type === 'page-header') h = x; }); return h; }

const KO = '가나다라마바사아자차카타파하한글긴제목경계값확인용반복문장입니다';
const ko = n => KO.repeat(Math.ceil(n / KO.length)).slice(0, n);

/** Boundary and stress cases. Each make() returns a blueprint or null (skipped with reason). */
export function stressCases() {
  const D = [];
  const add = (id, template, theme, note, viewports, fn) => D.push({id: `d-${id}`, set: 'stress', template, theme, note, viewports, make: () => {
    const b = createBlueprint(template, theme); fn(b); repairAxes(b);
    const r = validateBlueprint(b);
    if (!r.valid) { console.error(`STRESS-INVALID d-${id}: ` + JSON.stringify(r.errors[0])); return null; }
    return b;
  }});
  // data states with data kept + emptied
  for (const tpl of ['dashboard-overview', 'admin-table']) {
    for (const s of ['loading', 'empty', 'error', 'partial', 'forbidden']) {
      add(`state-${tpl}-${s}`, tpl, undefined, `table/list state=${s} (데이터 유지)`, [360, 390, 768, 1280, 1600],
        b => { if (!setDataStates(b, s, false)) throw new Error('no data nodes'); });
    }
    for (const s of ['empty', 'loading', 'error']) {
      add(`state-${tpl}-${s}-cleared`, tpl, undefined, `table/list state=${s} (행·항목 비움)`, [360, 390, 1280],
        b => { if (!setDataStates(b, s, true)) throw new Error('no data nodes'); });
    }
  }
  // max-length Korean strings (schema boundary, still valid)
  add('long-ko', 'saas-landing', undefined, '히어로 제목 160자·본문 700자 한글 경계값', [360, 390, 768, 1280], b => {
    const h = firstHero(b), p = firstHeader(b);
    h.title = ko(160); h.body = ko(700); p.title = ko(80); p.description = ko(120);
  });
  // English + unbroken token + long https URL (chrome action label max 24)
  add('long-en', 'saas-landing', undefined, '영문 + 68자 무구분 토큰 + 긴 URL', [360, 390, 768, 1280], b => {
    const h = firstHero(b);
    h.title = 'SupercalifragilisticexpialidociousDesignSystemsThatScaleBeyondExpectations';
    h.body = 'This English variant stresses word breaking, contrast on latin glyphs, and line lengths. '.repeat(8).slice(0, 700);
    b.chrome.action = {label: 'Start free trial today', href: 'https://example.com/' + 'a'.repeat(160)};
  });
  // long numbers
  add('long-num', 'dashboard-overview', undefined, '18자리 지표·40자 숫자 셀', [360, 390, 768, 1280], b => {
    walk(b.tree, x => {
      if (x.type === 'metric' && typeof x.value === 'string') x.value = '9,876,543,210,123,456건';
      if (x.type === 'table' && Array.isArray(x.rows)) x.rows = x.rows.map(r => r.map(c => typeof c === 'string' && /[0-9,%,.]/.test(c) ? '1234567890123456789012345678901234567890' : c));
    });
  });
  // English article at body limit
  add('long-en-article', 'article', undefined, '영문 본문 1200자', [360, 390, 768], b => {
    walk(b.tree, x => { if (x.type === 'prose' && typeof x.body === 'string' && x.body.length > 200) x.body = ('Longform English reading stress. '.repeat(40)).slice(0, 1200); });
  });
  // error pages in dark mode
  for (const tpl of ['not-found', 'server-error', 'forbidden', 'maintenance', 'offline']) {
    add(`dark-${tpl}`, tpl, undefined, '오류 페이지 dark 모드', [360, 390, 768, 1280], b => { b.mode = 'dark'; });
  }
  // first theme (catalog order, deterministic) that keeps the requested axis value valid
  const sweepTheme = (assign) => Object.values(themes).find(th => {
    try {
      const probe = createBlueprint('about-team', th.id); Object.assign(probe, assign); repairAxes(probe);
      if (Object.entries(assign).some(([k, v]) => probe[k] !== v)) return false;
      return validateBlueprint(probe).valid;
    } catch { return false; }
  })?.id;
  // single-axis sweeps on about-team (general page type allows every shell)
  const sweep = (axis, values) => values.forEach(v => {
    const theme = sweepTheme({[axis]: v});
    if (!theme) { console.error(`SWEEP-NO-THEME ${axis}=${v}`); return; }
    add(`axis-${axis}-${v}`, 'about-team', theme, `단일축 스위프 ${axis}=${v} (테마 ${theme})`, [390, 1280], b => { b[axis] = v; });
  });
  sweep('shell', axes.shell); sweep('width', axes.width); sweep('typography', axes.typography);
  sweep('density', axes.density); sweep('radius', axes.radius); sweep('control', axes.control);
  sweep('elevation', axes.elevation); sweep('motion', axes.motion); sweep('icon', axes.icon);
  sweep('ornament', axes.ornament); sweep('backdrop', axes.backdrop); sweep('scale', axes.scale);
  sweep('weight', axes.weight); sweep('footer', axes.footer);
  for (const m of ['dark', 'auto']) add(`mode-saas-${m}`, 'saas-landing', undefined, `모드 스위프 mode=${m}`, [390, 1280], b => { b.mode = m; });
  // ban-adjacent allowed pairs (must stay valid: documents the boundary from the allowed side)
  const near = {glow_dark: {elevation: 'glow', mode: 'dark'}, glow_auto: {elevation: 'glow', mode: 'auto'},
    compact_sidebar: {density: 'compact', shell: 'sidebar'}, bubble_comfy: {radius: 'bubble', density: 'comfortable'},
    lively_soft: {motion: 'lively', elevation: 'soft'}, fine_comfy: {icon: 'line-fine', density: 'comfortable'},
    dots_plain: {ornament: 'dots', backdrop: 'plain'}, hard_plain: {elevation: 'hard', backdrop: 'plain'},
    full_sidebar: {width: 'full', shell: 'sidebar'}, narrow_topbar: {width: 'narrow', shell: 'topbar'}};
  for (const [k, ax] of Object.entries(near)) {
    const theme = sweepTheme(ax);
    if (!theme) { console.error(`NEARBAN-NO-THEME ${k}`); continue; }
    add(`nearban-${k}`, 'about-team', theme, `금지 경계 허용 쌍 ${JSON.stringify(ax)} (테마 ${theme})`, [390, 1280], b => Object.assign(b, ax));
  }
  return D;
}

/** Inputs that MUST be rejected. A listed input that validates is a rule hole (defect). */
export function negativeCases() {
  const N = [];
  const add = (id, expect, fn) => N.push({id: `n-${id}`, expect, fn});
  const tab2 = () => ({type: 'tab', label: '탭', children: [{type: 'prose', title: '본문', body: '내용'}]});
  add('over-title', 'STRING', b => { firstHeader(b).title = ko(161); });
  add('http-link', 'URL', b => { firstHeader(b).actions = [{label: '외부 문서', href: 'http://example.com/문서', variant: 'secondary'}]; });
  add('vague-label', 'LINK_LABEL', b => { b.chrome.nav = [{label: '여기', href: '#main', icon: 'home'}]; });
  add('unknown-theme', 'ENUM', b => { b.theme = 'no-such-theme'; });
  add('ban-compact-dock', 'AXIS_BAN', b => { b.density = 'compact'; b.shell = 'dock'; });
  add('dup-field-id', 'DUPLICATE_ID', b => {
    b.tree.children.push({type: 'form', title: '중복 필드', fields: [
      {id: 'same-id', label: '이름', type: 'text'}, {id: 'same-id', label: '별명', type: 'text'}], submitLabel: '보내기'});
  });
  add('nested-tabs', 'NESTED_TABS', b => {
    b.tree.children.push({type: 'tabs', children: [{...tab2(), children: [{type: 'tabs', children: [tab2(), tab2()]}]}, tab2()]});
  });
  add('table-width', 'TABLE_WIDTH', b => {
    b.tree.children.push({type: 'table', title: '깨진 표', caption: '열과 셀이 다름', columns: ['A', 'B'], rows: [['a1', 'b1', 'c1']], state: 'ready'});
  });
  add('double-primary', 'PRIMARY_ACTION', b => {
    const h = firstHero(createBlueprint('saas-landing'));
    b.tree.children.splice(1, 0, {...structuredClone(h), secondaryAction: {...structuredClone(h.action), variant: 'primary'}});
  });
  add('anchor-missing', 'ANCHOR_MISSING', b => { b.chrome.nav = [{label: '없는앵커', href: '#no-such-anchor', icon: 'home'}]; });
  add('double-hero', 'SINGLE_HERO', b => {
    const h = firstHero(createBlueprint('saas-landing'));
    b.tree.children.splice(1, 0, structuredClone(h), structuredClone(h));
  });
  add('palette-mismatch', 'PALETTE_THEME', b => {
    const other = Object.values(palettes).find(p => !themes[b.theme].palettes.includes(p.id));
    b.palette = other.id;
  });
  add('unknown-key', 'UNKNOWN_KEY', b => { firstHeader(b).style = 'color:red'; });
  add('empty-ready-table', 'STATE_DATA', b => {
    b.tree.children.push({type: 'table', title: '빈 표', caption: 'ready인데 행 없음', columns: ['A'], rows: [], state: 'ready'});
  });
  return N;
}

/* ---------------- runner ---------------- */

function parseShard(s) { const m = /^(\d+)\/(\d+)$/.exec(s ?? ''); return m ? {k: +m[1] - 1, n: +m[2]} : null; }

async function main() {
  const t0 = Date.now();
  const shard = parseShard(args.shard);
  const only = args.only ? String(args.only).split(',') : null;
  const force = args.force === true || args['force'] === '';
  const verifyOnly = args.verify === true || args['verify'] === '';
  await mkdir(CASES, {recursive: true});
  let plan = planCases();
  if (only) plan = plan.filter(c => only.includes(c.set));
  if (shard) plan = plan.filter((_, i) => i % shard.n === shard.k);
  console.log(`PLAN: ${plan.length} cases (seed ${TEST_LAB_SEED}, generator ${GENERATOR_VERSION})`);

  // negatives: must be rejected with the expected code
  const negatives = [];
  for (const n of negativeCases()) {
    const b = createBlueprint('about-team');
    try { n.fn(b); } catch (e) { negatives.push({id: n.id, expect: n.expect, rejected: true, codes: ['MUTATION_ERROR'], note: String(e.message)}); continue; }
    const r = validateBlueprint(b);
    const codes = r.errors.map(e => e.code);
    negatives.push({id: n.id, expect: n.expect, rejected: !r.valid, codes,
      expectFound: codes.includes(n.expect), hole: r.valid});
  }
  const holes = negatives.filter(n => !n.rejected);
  const badFixtures = negatives.filter(n => n.rejected && !n.expectFound);

  // positives, pass 1: build every blueprint and hash its output (no writes yet)
  let invalid = 0;
  const ruleRejected = [], built = [];
  for (const [i, c] of plan.entries()) {
    let blueprint;
    try { blueprint = c.make(); } catch (e) { console.error(`MAKE-ERROR ${c.id}: ${e.message}`); invalid++; continue; }
    if (blueprint?.rejected) { ruleRejected.push({id: c.id, set: c.set, codes: blueprint.codes}); continue; }
    if (!blueprint) {
      if (c.set === 'pairwise' || c.set === 'matrix') { console.error(`UNEXPECTED-NULL ${c.id}`); invalid++; continue; }
      ruleRejected.push({id: c.id, set: c.set, codes: []}); continue;
    }
    const r = validateBlueprint(blueprint);
    if (!r.valid) { console.error(`INVALID ${c.id}: ` + JSON.stringify(r.errors[0])); invalid++; continue; }
    let out;
    try { out = compile(blueprint); } catch (e) { console.error(`COMPILE-ERROR ${c.id}: ${e.message}`); invalid++; continue; }
    built.push({c, blueprint, html: out.html, hash: sha256(out.html)});
    if ((i + 1) % 500 === 0) console.log(`  ... ${i + 1}/${plan.length}`);
  }
  // pass 2: canonical choice per sha is order-independent: lowest set rank, then lowest id
  const idRank = id => ({a: 0, b: 1, c: 2, d: 3}[id[0]] ?? 9);
  const bySha = new Map();
  for (const b of built) { if (!bySha.has(b.hash)) bySha.set(b.hash, []); bySha.get(b.hash).push(b); }
  const canonical = [], duplicates = [];
  for (const group of bySha.values()) {
    group.sort((x, y) => idRank(x.c.id) - idRank(y.c.id) || (x.c.id < y.c.id ? -1 : 1));
    canonical.push(group[0]);
    for (const d of group.slice(1)) duplicates.push({id: d.c.id, set: d.c.set, duplicateOf: group[0].c.id});
  }
  canonical.sort((x, y) => x.c.id < y.c.id ? -1 : 1);
  duplicates.sort((x, y) => x.id < y.id ? -1 : 1);
  const manifestPath0 = join(OUT, 'manifest.json');
  const prev0 = await readFile(manifestPath0, 'utf8').then(t => JSON.parse(t)).catch(() => null);
  const prevById = new Map((prev0?.cases ?? []).map(e => [e.id, e]));
  if (verifyOnly) {
    let checked = 0;
    for (const b of canonical) {
      const ref = prevById.get(b.c.id);
      if (!ref || ref.sha256 !== b.hash) { console.error(`MISMATCH ${b.c.id}`); invalid++; } else checked++;
    }
    for (const d of duplicates) {
      const ref = prevById.get(d.duplicateOf);
      const got = built.find(b => b.c.id === d.id);
      if (!ref || !got || ref.sha256 !== got.hash) { console.error(`MISMATCH ${d.id}`); invalid++; } else checked++;
    }
    const wantSkipped = new Set((prev0?.skipped ?? []).map(s => s.id));
    const gotSkipped = new Set(ruleRejected.map(s => s.id));
    const sameSkip = wantSkipped.size === gotSkipped.size && [...wantSkipped].every(id => gotSkipped.has(id));
    const wantDups = new Map((prev0?.duplicates ?? []).map(d => [d.id, d.duplicateOf]));
    const sameDups = wantDups.size === duplicates.length && duplicates.every(d => wantDups.get(d.id) === d.duplicateOf);
    console.log(`VERIFY: checked=${checked} mismatches=${invalid} skipped-set-match=${sameSkip} dups-match=${sameDups}`);
    if (!sameSkip || !sameDups || invalid) process.exitCode = 1;
    return;
  }
  // pass 3: write canonical pages, remove dup dirs, collect entries
  let written = 0, skipped = 0, bytes = 0;
  const entries = [];
  for (const b of canonical) {
    const dir = join(CASES, b.c.id), file = join(dir, 'index.html');
    const exists = !force && await stat(file).then(s => s.isFile()).catch(() => false);
    if (exists) { skipped++; }
    else { await mkdir(dir, {recursive: true}); await writeFile(file, b.html); written++; }
    bytes += b.html.length;
    entries.push({id: b.c.id, set: b.c.set, template: b.c.template, theme: b.blueprint.theme, palette: b.blueprint.palette,
      mode: b.blueprint.mode, pageType: b.blueprint.pageType,
      axes: Object.fromEntries(['shell', ...styleAxes].map(k => [k, b.blueprint[k]])),
      viewports: b.c.viewports, note: b.c.note, file: `cases/${b.c.id}/index.html`, sha256: b.hash, bytes: b.html.length});
  }
  for (const d of duplicates) await rm(join(CASES, d.id), {recursive: true, force: true});

  // merge manifest (resume-safe) + deterministic coverage
  const manifestPath = join(OUT, 'manifest.json');
  const prev = prev0;
  const merged = new Map((prev?.cases ?? []).map(e => [e.id, e]));
  for (const e of entries) merged.set(e.id, e);
  for (const d of duplicates) merged.delete(d.id);
  const allCases = [...merged.values()].sort((a, b) => a.id < b.id ? -1 : 1);
  const coverage = {themes: {}, templates: {}, palettes: {}, modes: {}, pageTypes: {}, sets: {}, axes: {}};
  for (const k of ['shell', ...styleAxes]) coverage.axes[k] = {};
  for (const e of allCases) {
    const bump = (o, k) => o[k] = (o[k] ?? 0) + 1;
    bump(coverage.themes, e.theme); bump(coverage.templates, e.template); bump(coverage.palettes, e.palette);
    bump(coverage.modes, e.mode); bump(coverage.pageTypes, e.pageType); bump(coverage.sets, e.set);
    for (const [k, v] of Object.entries(e.axes)) bump(coverage.axes[k], v);
  }
  const uncovered = {themes: [], templates: [], palettes: [], modes: [], axes: {}};
  for (const id of Object.keys(themes)) if (!coverage.themes[id]) uncovered.themes.push(id);
  for (const t of templateList) if (!coverage.templates[t.id]) uncovered.templates.push(t.id);
  for (const id of Object.keys(palettes)) if (!coverage.palettes[id]) uncovered.palettes.push(id);
  for (const m of axes.mode) if (!coverage.modes[m]) uncovered.modes.push(m);
  for (const k of ['shell', ...styleAxes]) uncovered.axes[k] = axes[k].filter(v => !coverage.axes[k][v]);
  const prevSkipped = new Map((prev?.skipped ?? []).map(s => [s.id, s]));
  for (const s of ruleRejected) prevSkipped.set(s.id, s);
  const dupList = duplicates;
  // NOTE: no commit SHA or timestamps in committed files — CI rebuilds and diffs byte-for-byte.
  // Run identity (commit, time) goes to stdout and the delivery report only.
  const manifest = {generator: GENERATOR_VERSION, seed: TEST_LAB_SEED, catalogVersion: '2.0.0',
    cases: allCases, duplicates: dupList, skipped: [...prevSkipped.values()].sort((a, b) => a.id < b.id ? -1 : 1), negatives, coverage, uncovered,
    totals: {cases: allCases.length, matrix: allCases.filter(e => e.set === 'matrix').length,
      paletteMode: allCases.filter(e => e.set === 'palette-mode').length, pairwise: allCases.filter(e => e.set === 'pairwise').length,
      stress: allCases.filter(e => e.set === 'stress').length, negativeRejected: negatives.filter(n => n.rejected).length,
      ruleHoles: holes.map(h => h.id)}};
  await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  await writeFile(join(OUT, 'coverage.json'), JSON.stringify({generator: GENERATOR_VERSION, seed: TEST_LAB_SEED, coverage, uncovered, totals: manifest.totals}, null, 1) + '\n');
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`DONE: commit=${commitSha()} written=${written} skipped=${skipped} invalid=${invalid} ruleRejected=${ruleRejected.length} dups=${duplicates.length} total=${allCases.length} bytes=${(bytes / 1048576).toFixed(1)}MiB manifest-cases=${manifest.totals.cases} negatives=${negatives.length} holes=${holes.length} ${secs}s`);
  if (holes.length) { console.error('RULE-HOLES: ' + holes.map(h => h.id).join(',')); process.exitCode = 1; }
  if (badFixtures.length) { console.error('BAD-FIXTURES (expected code missing): ' + badFixtures.map(n => `${n.id} expect=${n.expect} got=[${n.codes.join(',')}]`).join('; ')); process.exitCode = 1; }
  if (invalid) process.exitCode = 1;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) await main();

