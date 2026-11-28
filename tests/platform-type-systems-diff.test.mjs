import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {bindType, differingDims} from '../src/platform/type.mjs';
import {ROLE_SCALES} from '../src/platform/data/type-materials.mjs';
import {MINIMAL_REQUEST, assemblePlatform} from '../src/platform/index.mjs';

const env = createPlatform();
const systems = env.registry.list('type-system');
const designed = systems.filter(s => s.id !== 'type-system:tech-erp');

test('all 10 families from REQUEST §5.2 have at least 4 registered systems (total 41)', () => {
  assert.equal(systems.length, 41);

  const FAMILIES = [
    'general-product', 'enterprise', 'finance', 'developer',
    'marketing', 'editorial', 'commerce', 'mobile',
    'education', 'experimental'
  ];

  for (const fam of FAMILIES) {
    const famSystems = systems.filter(s => s.tags.includes(fam));
    assert.ok(famSystems.length >= 4, `family ${fam} has ${famSystems.length} systems (expected >= 4)`);
  }
});

test('every system has a unique (heading, body) font stack pair and unique scale profile', () => {
  const bound = Object.fromEntries(systems.map(s => [s.id, bindType(s)]));

  // 1. Unique (heading, font) pairs
  const fontPairs = new Map();
  for (const s of systems) {
    const v = bound[s.id].vars;
    const key = `${v['--kit-heading']}\0${v['--kit-font']}`;
    assert.ok(!fontPairs.has(key), `${s.id} font pair duplicates ${fontPairs.get(key)}`);
    fontPairs.set(key, s.id);
  }
  assert.equal(fontPairs.size, 41);

  // 2. Unique size tuples
  const sizeTuples = new Set(systems.map(s =>
    ['--kit-t-title', '--kit-t-heading', '--kit-t-sub', '--kit-t-body', '--kit-t-small', '--kit-t-label', '--kit-t-caption', '--kit-t-stat']
      .map(k => bound[s.id].vars[k]).join('|')
  ));
  assert.equal(sizeTuples.size, 41, 'all 41 size tuples are different');

  // 3. Unique rhythm tuples
  const rhythmTuples = new Set(systems.map(s =>
    ['--kit-line', '--kit-lh-heading', '--kit-lh-title', '--kit-tr-title', '--kit-tr-heading', '--kit-tr-label', '--kit-hw']
      .map(k => bound[s.id].vars[k]).join('|')
  ));
  assert.equal(rhythmTuples.size, 41, 'all 41 rhythm tuples are different');
});

test('differingDims separates every designed system pair by at least 3 dimensions', () => {
  for (let i = 0; i < designed.length; i++) {
    for (let j = i + 1; j < designed.length; j++) {
      const a = designed[i], b = designed[j];
      const diff = differingDims(ROLE_SCALES[a.roleScale], ROLE_SCALES[b.roleScale]);
      assert.ok(diff >= 3, `${a.id} vs ${b.id} differ in only ${diff} dims (< 3)`);
    }
  }
});

test('changing type system changes compiled CSS variables', () => {
  const r1 = assemblePlatform({...structuredClone(MINIMAL_REQUEST), typeSystem: 'type-system:work-console'}, env);
  const r2 = assemblePlatform({...structuredClone(MINIMAL_REQUEST), typeSystem: 'type-system:work-insight'}, env);

  assert.equal(r1.ok, true, 'r1 assembled');
  assert.equal(r2.ok, true, 'r2 assembled');

  const css1 = r1.value.css;
  const css2 = r2.value.css;

  assert.notEqual(css1, css2, 'different type systems produce different CSS output');
  assert.ok(css1.includes('--kit-heading:'), 'css1 has --kit-heading');
  assert.ok(css2.includes('--kit-heading:'), 'css2 has --kit-heading');
});

test('all 41 type systems are discoverable in platform registry', () => {
  for (const s of systems) {
    const found = env.registry.get(s.id);
    assert.ok(found, `registry.get(${s.id}) found`);
    assert.equal(found.kind, 'type-system');
  }
});
