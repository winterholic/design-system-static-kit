import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {bindType, differingDims, TYPE_27_ROLES} from '../src/platform/type.mjs';
import {ROLE_SCALES} from '../src/platform/data/type-materials.mjs';
import {MINIMAL_REQUEST, assemblePlatform} from '../src/platform/index.mjs';
import {assembleDesign, compileBlueprint} from '../src/service/index.mjs';

const env = createPlatform();
const systems = env.registry.list('type-system');
const designed = systems.filter(s => s.id !== 'type-system:tech-erp');
const PRE_EXISTING_IDS = [
  'type-system:tech-erp', 'type-system:work-console', 'type-system:work-insight',
  'type-system:doc-essay', 'type-system:doc-handbook', 'type-system:doc-newsroom',
  'type-system:mkt-brand', 'type-system:mkt-launch', 'type-system:mkt-atelier',
  'type-system:shop-catalog', 'type-system:shop-boutique', 'type-system:mobile-app',
  'type-system:mobile-reader', 'type-system:mobile-feed',
];

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

  const completeProfiles = new Set(systems.map(s => JSON.stringify(TYPE_27_ROLES.map(role => {
    const r = bound[s.id].roles27[role];
    return [r.fontFamily, r.sizePx.mobile, r.sizePx.desktop, r.weight, r.lineHeight, r.trackingEm];
  }))));
  assert.equal(completeProfiles.size, systems.length, 'font, size, weight, line-height and tracking profiles differ across every system');

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

test('compiled role CSS consumes all 27 role variables, including legacy tech-erp', () => {
  for (const id of ['type-system:tech-erp', 'type-system:work-console']) {
    const result = assemblePlatform({...structuredClone(MINIMAL_REQUEST), typeSystem: id}, env);
    assert.equal(result.ok, true, `${id} assembled: ${JSON.stringify(result.diagnostics)}`);
    const css = result.value.css;
    for (const role of TYPE_27_ROLES) {
      assert.ok(css.includes(`.kit-type-${role}{`), `${id} has a rendered CSS rule for ${role}`);
      assert.ok(css.includes(`font-size:var(--kit-type-${role}-size)`), `${id}/${role} consumes size`);
      assert.ok(css.includes(`font-weight:var(--kit-type-${role}-weight)`), `${id}/${role} consumes weight`);
      assert.ok(css.includes(`line-height:var(--kit-type-${role}-leading)`), `${id}/${role} consumes line-height`);
      assert.ok(css.includes(`letter-spacing:var(--kit-type-${role}-tracking)`), `${id}/${role} consumes tracking`);
      assert.ok(css.includes(`font-family:var(--kit-type-${role}-font)`), `${id}/${role} consumes font family`);
    }

    const assembled = assembleDesign({purpose: 'work-dashboard', candidates: 1, typeSystem: id});
    assert.equal(assembled.ok, true, `${id} service assembly: ${JSON.stringify(assembled.errors)}`);
    const blueprint = assembled.value.candidates[0].value.blueprint;
    const compiled = compileBlueprint(blueprint, {include: ['css']});
    assert.equal(compiled.ok, true, `${id} Blueprint compile: ${JSON.stringify(compiled.errors)}`);
    for (const role of TYPE_27_ROLES) {
      assert.ok(compiled.value.css.includes(`.kit-type-${role}{`), `${id} Blueprint compile renders ${role}`);
    }
  }
});

test('all 41 type systems are discoverable in platform registry', () => {
  for (const id of PRE_EXISTING_IDS) assert.ok(systems.some(s => s.id === id), `pre-existing ID ${id} is preserved`);
  for (const s of systems) {
    const found = env.registry.get(s.id);
    assert.ok(found, `registry.get(${s.id}) found`);
    assert.equal(found.kind, 'type-system');
  }
});
