import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePlatformMaterial, validateEdge, definePlatformMaterial, createPlatformRegistry, createRelationGraph, defineCheck, edgeApplies,
  COLOR_ROLE_NAMES, PlatformError,
} from '../src/platform/index.mjs';
import {SUBTOKEN_SETS} from '../src/platform/data/subtoken-sets.mjs';
import {PALETTES} from '../src/platform/data/palettes.mjs';

const codes = errors => errors.map(e => e.code);
const palette = (name, extra = {}) => definePlatformMaterial({id: `palette:${name}`, kind: 'palette', label: name, tone: 'mid', seeds: {brand: '#3157D5', neutral: '#596579'}, ...extra});

test('platform material contract: closed fields, kind-prefixed id, internal license only, verified needs test evidence', () => {
  assert.deepEqual(validatePlatformMaterial(palette('ok')), []);
  assert.ok(codes(validatePlatformMaterial({...palette('x'), css: 'a{}'})).includes('P_FIELD'), 'unknown field (escape hatch) is rejected');
  assert.ok(codes(validatePlatformMaterial({...palette('x'), id: 'subtoken-set:x'})).includes('P_ID'));
  assert.ok(codes(validatePlatformMaterial({...palette('x'), source: {origin: 'coolors', license: 'unverified'}})).includes('P_LICENSE'), 'rights-unverified material cannot be registered');
  assert.ok(codes(validatePlatformMaterial({...palette('x'), quality: {status: 'verified', evidence: []}})).includes('P_EVIDENCE'));
  assert.ok(codes(validatePlatformMaterial({...palette('x'), seeds: {brand: '#3157d5', neutral: '#596579'}})).includes('P_PALETTE_HEX'));
  assert.ok(codes(validatePlatformMaterial({...palette('x'), seeds: {neutral: '#596579'}})).includes('P_PALETTE_SLOT'));
  assert.ok(codes(validatePlatformMaterial({...palette('x'), kind: 'theme'})).includes('P_KIND'));
});

test('subtoken set contract: every color role once, rules reference earlier roles and declared palette slots', () => {
  const set = SUBTOKEN_SETS[0];
  assert.deepEqual(validatePlatformMaterial(set), []);
  assert.deepEqual(Object.keys(set.roles).sort(), [...COLOR_ROLE_NAMES].sort());
  const {text, ...withoutText} = set.roles;
  assert.ok(codes(validatePlatformMaterial({...set, roles: withoutText})).includes('P_SUBTOKEN_ROLE'));
  const early = {text, ...withoutText};
  assert.ok(codes(validatePlatformMaterial({...set, roles: early})).includes('P_SUBTOKEN_ORDER'), 'text measured against a role defined later');
  assert.ok(codes(validatePlatformMaterial({...set, needs: set.needs.filter(s => s !== 'accent')})).includes('P_SUBTOKEN_NEED'));
});

test('edge contract: closed fields, known type, 0..100 priority, reason required, conditions on known keys', () => {
  const ok = {type: 'prefers', to: 'palette:a', priority: 10, reason: 'why'};
  assert.deepEqual(validateEdge(ok), []);
  assert.ok(codes(validateEdge({...ok, type: 'likes'})).includes('P_EDGE_KIND'));
  assert.ok(codes(validateEdge({...ok, priority: 101})).includes('P_EDGE_PRIORITY'));
  assert.ok(codes(validateEdge({...ok, reason: ' '})).includes('P_EDGE_REASON'));
  assert.ok(codes(validateEdge({...ok, when: {theme: ['x']}})).includes('P_EDGE_WHEN'));
  assert.ok(codes(validateEdge({...ok, weight: 1})).includes('P_EDGE_FIELD'));
});

test('registry: per-kind slots, rejected material leaves registry unchanged, check finds dangling edges and missing implementations', () => {
  const reg = createPlatformRegistry();
  reg.kind('palette').register(palette('a', {relations: [{type: 'requires', to: 'subtoken-set:nope', priority: 0, reason: 'r'}]}));
  assert.throws(() => reg.kind('palette').register(palette('a')), PlatformError, 'duplicate id');
  assert.throws(() => reg.kind('subtoken-set').register(palette('b')), PlatformError, 'wrong kind slot');
  assert.throws(() => reg.kind('palette').register({...palette('c'), html: '<b>'}), PlatformError);
  assert.deepEqual(reg.list().map(m => m.id), ['palette:a']);
  assert.ok(Object.isFrozen(reg.get('palette:a').seeds));
  assert.deepEqual(codes(reg.check()), ['P_EDGE_DANGLING']);
  reg.kind('base-component').register(definePlatformMaterial({id: 'base-component:x', kind: 'base-component', label: 'x', contract: 'component:x', render: {}, styles: {}, dependencies: []}));
  assert.ok(codes(reg.check()).includes('P_IMPL_MISSING'));
  assert.throws(() => reg.kind('base-component').implement('base-component:x', {contract: {id: 'component:y'}, render: () => '', styles: ''}), PlatformError, 'implementation contract must match the record');
});

test('relation graph: conditions, requires, forbids, closed pairs and computed checks are separate verdicts', () => {
  const reg = createPlatformRegistry().registerAll([
    ...PALETTES, SUBTOKEN_SETS[0],
    palette('dark-only', {relations: [
      {type: 'forbids', to: 'subtoken-set:standard', priority: 0, reason: '어두운 모드에서만 쓴다', when: {mode: ['light']}},
      {type: 'requires', to: 'palette:static-kit', priority: 0, reason: '보조 팔레트다'},
      {type: 'avoids', to: 'subtoken-set:standard', priority: 5, reason: '대비가 낮다'},
    ]}),
  ]);
  const failing = defineCheck({id: 'always-no', kinds: ['palette', 'subtoken-set'], reason: '시험', run: () => ({ok: false, reason: '계산 결과 거부'})});
  const graph = createRelationGraph(reg, {checks: [failing]});
  assert.equal(edgeApplies({when: {mode: ['light']}}, {mode: 'dark'}), false);
  assert.equal(edgeApplies({when: {mode: ['light']}}, {}), false, 'a conditional edge does not apply when the context key is absent');
  assert.equal(edgeApplies({}, {}), true);

  const light = graph.evaluate(['palette:dark-only', 'subtoken-set:standard'], {mode: 'light'});
  assert.deepEqual(light.violations.map(v => v.code).sort(), ['P_CHECK_ALWAYS_NO', 'P_REL_FORBIDS', 'P_REL_REQUIRES']);
  const dark = graph.evaluate(['palette:dark-only', 'subtoken-set:standard', 'palette:static-kit'], {mode: 'dark'});
  assert.deepEqual(dark.violations.map(v => v.code).sort(), ['P_CHECK_ALWAYS_NO', 'P_CHECK_ALWAYS_NO']);
  const s = graph.score('subtoken-set:standard', ['palette:static-kit', 'palette:dark-only'], {mode: 'dark'});
  assert.equal(s.score, 20 - 5, 'prefers adds, avoids subtracts');
  assert.equal(s.blocked.length, 2, 'computed check blocks against both anchors');
});
