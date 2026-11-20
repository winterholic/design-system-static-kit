import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {axes, createBlueprint, repairAxes, templateList, CATALOG_VERSION, migrateBlueprint} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {TYPE, TYPE_R2, TYPE_IDS, STACKS, HANGUL, typeRev, typeSpec, roleSizes, refineTracking, lintType} from '../src/typography.mjs';

// Contract for the Hangul-first typography revision (catalog 2.3.0). Every number here is backed by a measurement in
// docs/evidence/typography-refine/ (ink gaps in tracking-gap.json, faces and digit heights in before/stacks.json).
const read = p => JSON.parse(readFileSync(new URL('../docs/evidence/typography-refine/' + p, import.meta.url)));
const num = (css, name) => parseFloat(new RegExp(`--kit-${name}:(-?[\\d.]+)`).exec(css)?.[1]);
const maxPx = (css, role) => { const v = new RegExp(`--kit-t-${role}:([^;]+);`).exec(css)[1]; return parseFloat([...v.matchAll(/([\d.]+)px/g)].pop()[1]); };
const sample = (typography, scale = 'balanced', id = 'saas-landing') => { const b = createBlueprint(id); b.typography = typography; b.scale = scale; repairAxes(b); return compile(b).css; };
const eachPreset = fn => { for (const typography of axes.typography) for (const scale of axes.scale) fn(typography, scale, sample(typography, scale)); };

test('Hangul title tracking: syllables must not touch (display/title ≥ -0.02em, heading ≥ -0.015em, card title ≥ -0.01em)', () => {
  eachPreset((p, s, css) => {
    assert.ok(num(css, 'tr-display') >= -.02, `${p}/${s} display ${num(css, 'tr-display')}`);
    assert.ok(num(css, 'tr-title') >= -.02, `${p}/${s} title ${num(css, 'tr-title')}`);
    assert.ok(num(css, 'tr-heading') >= -.015, `${p}/${s} heading ${num(css, 'tr-heading')}`);
    assert.ok(num(css, 'tr-sub') >= -.01, `${p}/${s} sub ${num(css, 'tr-sub')}`);
  });
});

test('Hangul has no case: label tracking stays at or below 0.06em so Korean eyebrows are not spaced apart', () => {
  eachPreset((p, s, css) => assert.ok(num(css, 'tr-label') <= .06 && num(css, 'tr-label') >= 0, `${p} label ${num(css, 'tr-label')}`));
});

test('heading leading floors: a two-line Hangul title keeps a visible band (display ≥ 1.2, title ≥ 1.25, heading ≥ 1.3, card title ≥ 1.35), body 1.55 to 1.8', () => {
  eachPreset((p, s, css) => {
    assert.ok(num(css, 'lh-display') >= 1.2, `${p} display ${num(css, 'lh-display')}`);
    assert.ok(num(css, 'lh-title') >= 1.25, `${p} title ${num(css, 'lh-title')}`);
    assert.ok(num(css, 'lh-heading') >= 1.3, `${p} heading ${num(css, 'lh-heading')}`);
    assert.ok(num(css, 'lh-sub') >= 1.35, `${p} sub ${num(css, 'lh-sub')}`);
    assert.ok(num(css, 'line') >= 1.55 && num(css, 'line') <= 1.8, `${p} body ${num(css, 'line')}`);
  });
});

test('size ceilings: a Hangul syllable fills about 0.91em, so display ≤ 80px, title ≤ 64px, heading ≤ 40px under every preset and scale', () => {
  eachPreset((p, s, css) => {
    assert.ok(maxPx(css, 'display') <= 80, `${p}/${s} display ${maxPx(css, 'display')}`);
    assert.ok(maxPx(css, 'title') <= 64, `${p}/${s} title ${maxPx(css, 'title')}`);
    assert.ok(maxPx(css, 'heading') <= 40, `${p}/${s} heading ${maxPx(css, 'heading')}`);
  });
});

test('face pairing: the first Latin face of every stack in use has lining digits and a Hangul/x-height ratio within 1.95 (measured)', () => {
  const metrics = Object.fromEntries(read('before/stacks.json').map(s => [s.stack, s]));
  const heads = new Set();
  for (const p of axes.typography) { const css = sample(p); for (const v of ['heading', 'font']) heads.add(new RegExp(`--kit-${v}:([^;]+);`).exec(css)[1]); }
  for (const stack of heads) {
    const first = stack.split(',')[0].replace(/"/g, '');
    assert.notEqual(first, 'Georgia', `${stack}: Georgia digits are old-style (measured digit/cap 0.75, spread 19/100em) and clash with Hangul`);
    assert.notEqual(first, 'Baskerville', `${stack}: Baskerville x-height pairs at 2.08, above 1.95 with a Hangul face`);
  }
  // every stack that revision 2 can resolve to, other than the two that it replaces
  for (const id of new Set(TYPE_IDS.flatMap(p => [TYPE_R2[p].head, TYPE_R2[p].text]))) assert.ok(!['georgia', 'baskerville'].includes(id), `${id} is replaced in revision 2`);
  for (const m of Object.values(metrics)) if (/^(iowan|charter|didone|slab)$/.test(m.stack)) assert.ok(m.hangulToXHeight <= 1.95 && m.digitToCap >= .95, m.stack);
});

test('single-weight Hangul serif cannot be bolder than its synthetic bold: serif-Hangul heading weight stays ≤ 700', () => {
  for (const p of axes.typography) for (const weight of axes.weight) {
    const b = createBlueprint('article'); b.typography = p; b.weight = weight; repairAxes(b);
    const css = compile(b).css, head = /--kit-heading:([^;]+);/.exec(css)[1];
    if (/AppleMyungjo/.test(head)) assert.ok(num(css, 'hw') <= 700, `${p}/${weight} heading weight ${num(css, 'hw')} over a single-weight Hangul face`);
  }
});

test('catalog 2.4.0 is the current version; 2.2.0 and 2.1.0 inputs keep their previous typography byte for byte', () => {
  assert.equal(CATALOG_VERSION, '2.4.0');
  const {hashes} = read('legacy-2-2-hashes.json'), {blueprints} = read('legacy-2-2-blueprints.json');
  assert.equal(Object.keys(hashes).length, templateList.length);
  for (const [id, hash] of Object.entries(hashes)) {
    const b = structuredClone(blueprints[id]);
    assert.equal(b.catalogVersion, '2.2.0');
    assert.equal(createHash('sha256').update(JSON.stringify(compile(b))).digest('hex'), hash, id);
  }
});

test('the refinement is reachable only through the version: migrating 2.2 to 2.3 changes catalogVersion and the type variables, nothing else', () => {
  const old = structuredClone(read('legacy-2-2-blueprints.json').blueprints['saas-landing']);
  const next = migrateBlueprint(old);
  assert.equal(next.catalogVersion, '2.4.0');
  assert.deepEqual({...next, catalogVersion: '2.2.0'}, old);
  assert.ok(validateBlueprint(next).valid);
  const a = compile(old).css, b = compile(next).css;
  assert.notEqual(num(a, 'tr-display'), num(b, 'tr-display'), 'sans display tracking is -0.035em in 2.2 and -0.02em in 2.3');
  assert.equal(num(a, 'tr-display'), -.035);
});

test('component rules that carried their own tracking literal are clamped in 2.3.0 and untouched for numerals', () => {
  const css = compile(createBlueprint('dashboard-overview')).css, legacy = compile(structuredClone(read('legacy-2-2-blueprints.json').blueprints['dashboard-overview'])).css;
  const literals = c => [...c.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, sel, body]) => [...body.matchAll(/letter-spacing:(-?[\d.]+)em/g)].map(m => [sel.trim(), +m[1]]));
  assert.ok(literals(legacy).some(([, v]) => v <= -.03), 'proof of scan: the 2.2.0 stylesheet has literals below -0.03em');
  for (const [sel, v] of literals(css)) if (!/kit-(price|metric|hero-facts|profile-stats|empty-code|card-price|summary-line|logos|art|stars|score)|\[data-t=/.test(sel)) assert.ok(v >= -.02 && v <= .06, `${sel} ${v}`);
  assert.equal(refineTracking('.kit-cta h2{letter-spacing:-.035em}'), '.kit-cta h2{letter-spacing:-.02em}');
  assert.equal(refineTracking('.kit-metric>dd{letter-spacing:-.035em}'), '.kit-metric>dd{letter-spacing:-.035em}');
  assert.equal(refineTracking('[data-shell=masthead] .kit-dateline{letter-spacing:.14em}'), '[data-shell=masthead] .kit-dateline{letter-spacing:.06em}');
});

test('revision resolution: only 2.1.0, 2.2.0 and version-less callers get the original table; 2.3.0 gets the refined table of the same 18 presets', () => {
  assert.equal(typeRev({catalogVersion: '2.1.0'}), 1); assert.equal(typeRev({catalogVersion: '2.2.0'}), 1); assert.equal(typeRev({typography: 'sans'}), 1); assert.equal(typeRev({catalogVersion: '2.3.0'}), 2);
  assert.deepEqual(Object.keys(TYPE_R2), Object.keys(TYPE));
  assert.equal(typeSpec({catalogVersion: '2.2.0', typography: 'sans'}), TYPE.sans);
  assert.equal(typeSpec({catalogVersion: '2.3.0', typography: 'sans'}), TYPE_R2.sans);
  assert.equal(TYPE.sans.track.display, -.035, 'the original table is not edited');
  for (const p of Object.values(TYPE_R2)) {
    assert.ok(p.ratio <= HANGUL.ratioMax && p.lh.display <= p.lh.title && p.lh.title <= p.lh.heading && p.lh.heading <= p.lh.sub && p.lh.sub <= p.lh.body, p.id);
    assert.ok(STACKS[p.head] && STACKS[p.text] && /AppleSDGothicNeo|Apple SD Gothic Neo|AppleMyungjo|D2Coding/.test(STACKS[p.head] + STACKS[p.text]), p.id);
  }
  assert.equal(TYPE_R2.newsroom.head, 'news'); assert.equal(TYPE_R2.literary.head, 'palatino');
});

test('revision 2 keeps the role order and lints clean for every preset and scale', () => {
  for (const typography of TYPE_IDS) for (const scale of axes.scale) {
    const z = roleSizes({typography, scale, catalogVersion: '2.3.0'});
    assert.ok(z.sub.max < z.heading.min && z.heading.min < z.title.min && z.title.max < z.display.max + 1, `${typography}/${scale}`);
    assert.ok(z.app.max > z.heading.max * .8 && z.app.max <= HANGUL.caps.app, `${typography}/${scale} app ${z.app.max}`);
  }
  for (const id of ['saas-landing', 'article', 'news-home']) assert.deepEqual(lintType(compile(createBlueprint(id)).css), []);
});

test('the manifest names the typography revision for 2.3.0 pages and omits it for pinned versions', () => {
  assert.equal(compile(createBlueprint('signup')).manifest.design.typography.revision, 2);
  assert.equal(compile(structuredClone(read('legacy-2-2-blueprints.json').blueprints.signup)).manifest.design.typography, undefined);
});

test('swapping a serif stack never raises the heading weight floor: refined weight equals the original, only capped at 700 for single-weight Hangul serifs', () => {
  for (const typography of TYPE_IDS) for (const weight of axes.weight) {
    const b = createBlueprint('article'); b.typography = typography; b.weight = weight; repairAxes(b);
    const old = compile({...b, catalogVersion: '2.2.0'}).css, now = compile(b).css;
    const serif = /AppleMyungjo/.test(/--kit-heading:([^;]+);/.exec(now)[1]);
    assert.equal(num(now, 'hw'), serif ? Math.min(num(old, 'hw'), 700) : num(old, 'hw'), `${typography}/${weight}`);
  }
});
