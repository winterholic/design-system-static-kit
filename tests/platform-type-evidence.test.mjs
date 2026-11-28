import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {createPlatform} from '../src/platform/index.mjs';
import {bindType, effectiveFaces} from '../src/platform/type.mjs';
import {render, TABLES} from '../docs/platform/evidence/type/tables.mjs';

const dir = new URL('../docs/platform/evidence/type/', import.meta.url), env = createPlatform();
const systems = env.registry.list('type-system'), short = id => id.slice('type-system:'.length);
const json = f => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
const metrics = json('metrics.json'), measured = json('fonts-macos.json');
const doc = readFileSync(new URL('../docs/platform/typography.md', import.meta.url), 'utf8');

test('every system has a desktop and a mobile screenshot of the same Korean-English document and the same dashboard', () => {
  assert.ok(systems.length >= 10);
  for (const s of systems) for (const kind of ['doc', 'dash']) for (const vp of ['desktop', 'mobile']) {
    const f = new URL(`${short(s.id)}-${kind}-${vp}.png`, dir);
    assert.ok(existsSync(f), `${short(s.id)}-${kind}-${vp}.png`);
    const bytes = readFileSync(f);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.ok(statSync(f).size > 5000, 'not an empty render');
    assert.equal(bytes.readUInt32BE(16), vp === 'desktop' ? 1280 : 390, `${short(s.id)}-${kind}-${vp} width`);
  }
});

test('rendered samples have no horizontal overflow and no KPI number wider than its card, at 390px and 1280px', () => {
  assert.deepEqual(Object.keys(metrics).sort(), systems.map(s => short(s.id)).sort());
  for (const [id, m] of Object.entries(metrics)) for (const [k, v] of Object.entries(m)) {
    assert.equal(v.overflowX, false, `${id} ${k} page overflow`);
    if (k.startsWith('dash')) assert.equal(v.kpiOverflow, 0, `${id} ${k} KPI overflow`);
    assert.ok(v.titleLines <= 3, `${id} ${k} title wraps to ${v.titleLines} lines`);
  }
});

test('information density is measurably different: the console fits the same document in under 60% of the essay height', () => {
  const h = (id, k) => metrics[id][k].contentHeight;
  assert.ok(h('work-console', 'doc-desktop') < h('doc-essay', 'doc-desktop') * .6, `${h('work-console', 'doc-desktop')} vs ${h('doc-essay', 'doc-desktop')}`);
  assert.ok(h('work-console', 'doc-mobile') < h('mobile-reader', 'doc-mobile') * .6);
  assert.ok(h('work-console', 'dash-desktop') < h('mkt-brand', 'dash-desktop') * .65);
  assert.ok(new Set(Object.values(metrics).map(m => m['doc-desktop'].contentHeight)).size >= 12, 'document heights are nearly all different');
});

const NORMALIZE = {
  '.SF NS': 'SF Pro',
  'Seravek Medium': 'Seravek',
  'Avenir Next Condensed Demi Bold': 'Avenir Next Condensed',
  'Avenir Next Demi Bold': 'Avenir Next',
  'Avenir Next Medium': 'Avenir Next',
};
const norm = f => NORMALIZE[f] ?? f;
test('the Chromium-measured macOS fonts agree with effectiveFaces for the heading, body, label, numeric and code roles', () => {
  assert.match(measured.measuredOn, /^darwin/);
  const keyOf = {display: '--kit-heading', heading: '--kit-heading', body: '--kit-font', label: '--kit-font-ui', numeric: '--kit-font-num', code: '--kit-mono'};
  for (const s of systems) {
    const vars = bindType(s).vars, used = measured.fonts[short(s.id)];
    for (const [role, key] of Object.entries(keyOf)) {
      const want = effectiveFaces(vars[key] ?? vars['--kit-font'], 'macos'), got = used[role].map(f => norm(f.family));
      assert.ok(got.includes(want.latin), `${short(s.id)}/${role}: predicted Latin ${want.latin}, measured ${got}`);
      if (role !== 'numeric') assert.ok(got.includes(want.hangul), `${short(s.id)}/${role}: predicted Hangul ${want.hangul}, measured ${got}`);
    }
  }
});

test('docs/platform/typography.md tables are generated from the code and list every registered system', () => {
  assert.equal(render(doc), doc, 'run: node docs/platform/evidence/type/tables.mjs --write');
  for (const name of Object.keys(TABLES)) assert.ok(doc.includes(`<!-- type-table:${name} -->`), `table ${name} is in the document`);
  for (const s of systems) assert.ok(doc.includes(s.id), `${s.id} is in the document`);
  assert.ok(doc.includes('P_CHECK_TYPE_HANGUL') && doc.includes('role-scale:modular'));
});
