import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {bindType, hangulViolations, resolve27Roles, TYPE_27_ROLES, TYPE_ROLE_DEFINITIONS, FLOORS} from '../src/platform/type.mjs';
import {HANGUL} from '../src/typography.mjs';

const env = createPlatform();
const systems = env.registry.list('type-system');

test('27 typography roles are defined with category, wordBreak, lineBreak, lengthPolicy and placement', () => {
  assert.equal(TYPE_27_ROLES.length, 27);
  assert.deepEqual(Object.keys(TYPE_ROLE_DEFINITIONS).sort(), [...TYPE_27_ROLES].sort());

  const categories = new Set();
  for (const [role, def] of Object.entries(TYPE_ROLE_DEFINITIONS)) {
    assert.ok(def.label, `${role} has human label`);
    assert.ok(['display', 'heading', 'body', 'label', 'control', 'specialized'].includes(def.category), `${role} category: ${def.category}`);
    assert.ok(['keep-all', 'break-all'].includes(def.wordBreak), `${role} wordBreak: ${def.wordBreak}`);
    assert.ok(['strict', 'normal'].includes(def.lineBreak), `${role} lineBreak: ${def.lineBreak}`);
    assert.ok(def.lengthPolicy, `${role} has lengthPolicy`);
    assert.ok(def.recommendedPlacement, `${role} has recommendedPlacement`);
    categories.add(def.category);
  }
  assert.ok(categories.size >= 5);
});

test('every registered system (41 systems) resolves all 27 roles and produces CSS variables', () => {
  assert.equal(systems.length, 41);
  for (const s of systems) {
    const bound = bindType(s, {roles27Vars: true});
    assert.equal(bound.ok, true, `${s.id} bindType failed: ${JSON.stringify(bound.errors)}`);
    assert.ok(bound.roles27, `${s.id} has roles27`);
    assert.deepEqual(Object.keys(bound.roles27).sort(), [...TYPE_27_ROLES].sort(), `${s.id} 27 role keys`);

    for (const role of TYPE_27_ROLES) {
      const r = bound.roles27[role];
      assert.ok(r.sizePx.mobile > 0 && r.sizePx.desktop >= r.sizePx.mobile - 4, `${s.id}/${role} sizePx`);
      assert.ok(r.weight >= 400 && r.weight <= 800, `${s.id}/${role} weight: ${r.weight}`);
      assert.ok(r.lineHeight >= 1.10 && r.lineHeight <= 1.85, `${s.id}/${role} lineHeight: ${r.lineHeight}`);
      assert.ok(typeof r.trackingEm === 'number', `${s.id}/${role} trackingEm`);
      assert.ok(typeof r.fontFamily === 'string' && r.fontFamily.length > 0, `${s.id}/${role} fontFamily`);
      assert.ok(typeof r.serif === 'boolean', `${s.id}/${role} serif flag`);

      // CSS vars
      assert.ok(bound.vars[`--kit-type-${role}-size`], `${s.id} --kit-type-${role}-size`);
      assert.ok(bound.vars[`--kit-type-${role}-weight`], `${s.id} --kit-type-${role}-weight`);
      assert.ok(bound.vars[`--kit-type-${role}-leading`], `${s.id} --kit-type-${role}-leading`);
      assert.ok(bound.vars[`--kit-type-${role}-tracking`], `${s.id} --kit-type-${role}-tracking`);
    }
  }
});

test('every registered system passes 27-role Hangul limits without violations', () => {
  for (const s of systems) {
    const bound = bindType(s);
    const violations = hangulViolations(bound.roles27, s.id);
    assert.deepEqual(violations, [], `${s.id} has hangul violations: ${JSON.stringify(violations)}`);
  }
});

test('Hangul validation rejects each kind of violation on 27 roles (negative controls)', () => {
  const clean = bindType(systems.find(s => s.id === 'type-system:work-console')).roles27;
  const mutate = (fn) => {
    const copy = structuredClone(clean);
    fn(copy);
    return hangulViolations(copy);
  };

  // 1. Serif weight max (> 700)
  const v1 = mutate(r => { r['heading-1'].serif = true; r['heading-1'].weight = 800; });
  assert.ok(v1.some(e => e.code === 'P_TYPE_HANGUL_WEIGHT' && e.rule === 'serif-weight' && e.role === 'heading-1'), 'serif weight > 700 rejected');

  // 2. Sans heading weight floor (600)
  const v2 = mutate(r => { r['heading-2'].serif = false; r['heading-2'].weight = 500; });
  assert.ok(v2.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'sans-weight-floor' && e.role === 'heading-2'), 'sans heading weight < 600 rejected');

  // 3. Tracking floor on display-xl
  const v3 = mutate(r => { r['display-xl'].trackingEm = -0.05; });
  assert.ok(v3.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'tracking-floor' && e.role === 'display-xl'), 'display tracking floor rejected');

  // 4. Leading floor on display-lg
  const v4 = mutate(r => { r['display-lg'].lineHeight = 1.10; });
  assert.ok(v4.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'leading-floor' && e.role === 'display-lg'), 'display leading floor rejected');

  // 5. Size cap on display-xl
  const v5 = mutate(r => { r['display-xl'].sizePx = {mobile: 85, desktop: 90}; });
  assert.ok(v5.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'size-cap' && e.role === 'display-xl'), 'display size cap 72px rejected');

  // 6. Body leading band
  const v6a = mutate(r => { r['body-md'].lineHeight = 1.50; });
  assert.ok(v6a.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'body-leading' && e.role === 'body-md'), 'body leading < 1.55 rejected');
  const v6b = mutate(r => { r['body-lg'].lineHeight = 1.90; });
  assert.ok(v6b.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'body-leading' && e.role === 'body-lg'), 'body leading > 1.85 rejected');

  // 7. Label tracking cap
  const v7 = mutate(r => { r['label-sm'].trackingEm = 0.10; });
  assert.ok(v7.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'label-tracking' && e.role === 'label-sm'), 'label tracking > 0.08 rejected');

  // 8. Size floor on small / badge
  const v8 = mutate(r => { r['badge'].sizePx = {mobile: 10, desktop: 10}; });
  assert.ok(v8.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'size-floor' && e.role === 'badge'), 'badge size < 11px rejected');

  // 9. Leading floor on small / table-cell
  const v9 = mutate(r => { r['body-sm'].lineHeight = 1.30; });
  assert.ok(v9.some(e => e.code === 'P_CHECK_TYPE_HANGUL' && e.rule === 'leading-floor' && e.role === 'body-sm'), 'body-sm leading < 1.40 rejected');
});
