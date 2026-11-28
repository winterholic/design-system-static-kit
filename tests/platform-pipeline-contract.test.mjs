import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlatform, assemblePage, recommend, definePlatformMaterial, validatePlatformMaterial, PLATFORM_CONTRACT_VERSION, KIND_SPECS,
  bindColor, designOf, DEFAULT_DESIGN, SUBTOKEN_SET_DESIGNS, colorMatrix, proposeSubtokenSets, assignSeeds, paletteRamps,
} from '../src/platform/index.mjs';
import {typeErrorCode} from '../src/platform/pipeline.mjs';
import {rankTypeSystems, typeFit} from '../src/platform/type.mjs';

const env = createPlatform();
const clone = id => structuredClone(env.registry.get(id));
const thaw = m => JSON.parse(JSON.stringify(m));
const codes = errs => errs.map(e => e.code);

test('the contract version moves with every contract change (0.8.0: layout material kind)', () => {
  assert.equal(PLATFORM_CONTRACT_VERSION, '0.8.0');
  assert.ok(KIND_SPECS['axis-value']);
});

test('optional fields: records without them stay valid, records with them are type-checked', () => {
  const set = thaw(clone('subtoken-set:standard')), ctx = thaw(clone('style-context:workspace'));
  for (const f of ['states', 'components', 'charts']) delete set[f];
  for (const f of ['purpose', 'forbidCombos', 'tendencies', 'media', 'layout']) delete ctx[f];
  assert.deepEqual(validatePlatformMaterial(set), []);
  assert.deepEqual(validatePlatformMaterial(ctx), []);
  assert.deepEqual(validatePlatformMaterial({...set, states: {hover: 0.1}, components: {table: {head: 'sunken'}}, charts: {categorical: {tone: 'standard'}}}), []);
  assert.deepEqual(validatePlatformMaterial({...ctx, purpose: '업무', forbidCombos: [], tendencies: {}, media: {}, layout: {navLimit: 4}}), []);
  assert.deepEqual(codes(validatePlatformMaterial({...set, states: [1]})), ['P_TYPE']);
  assert.deepEqual(codes(validatePlatformMaterial({...ctx, layout: 'x'})), ['P_TYPE']);
  // required fields are still required
  const noNeeds = thaw(set); delete noNeeds.needs;
  assert.deepEqual(codes(validatePlatformMaterial(noNeeds)), ['P_FIELD']);
  // the registry accepts the extended records
  const withFields = definePlatformMaterial({...set, id: 'subtoken-set:extended-test', states: {hover: 0.1}});
  assert.doesNotThrow(() => createPlatform({records: [withFields]}));
});

test('RoleRule fixed: a literal color or a ramp step mixed with a color is accepted; malformed rules are rejected with their path', () => {
  const base = thaw(clone('subtoken-set:standard'));
  const withRule = rule => ({...base, id: 'subtoken-set:fixed-test', roles: {...base.roles, surface: rule}});
  assert.deepEqual(validatePlatformMaterial(withRule({fixed: '#FFFFFF'})), []);
  assert.deepEqual(validatePlatformMaterial(withRule({fixed: {from: 'neutral', step: '50', mix: {with: '#FFFFFF', ratio: 0.6}}})), []);
  assert.deepEqual(validatePlatformMaterial(withRule({fixed: {from: 'neutral', step: '50'}})), []);
  const bad = [
    [{fixed: '#ffffff'}, 'P_SUBTOKEN_RULE', '$.roles.surface.fixed'],
    [{fixed: 12}, 'P_SUBTOKEN_RULE', '$.roles.surface.fixed'],
    [{fixed: {from: 'nope', step: '50'}}, 'P_SUBTOKEN_NEED', '$.roles.surface.fixed.from'],
    [{fixed: {from: 'neutral', step: '55'}}, 'P_SUBTOKEN_STEP', '$.roles.surface.fixed.step'],
    [{fixed: {from: 'neutral', step: '50', mix: {with: '#FFFFFF', ratio: 2}}}, 'P_SUBTOKEN_RULE', '$.roles.surface.fixed'],
    [{fixed: '#FFFFFF', min: {against: ['text'], ratio: 4.5}}, 'P_SUBTOKEN_ORDER', '$.roles.surface.min.against'],
    [{}, 'P_SUBTOKEN_RULE', '$.roles.surface'],
  ];
  for (const [rule, code, path] of bad) {
    const e = validatePlatformMaterial(withRule(rule));
    assert.ok(e.some(x => x.code === code && x.path === path), `${JSON.stringify(rule)} → ${JSON.stringify(e)}`);
  }
});

test('recommend says why nothing is left when the context filter empties the pool (P_RECOMMEND_NO_CANDIDATE), without inventing a blocked material', () => {
  const none = recommend(env.registry, env.graph, {kind: 'type-system', context: 'no-such-context'});
  assert.deepEqual(none.ranked, []);
  assert.equal(none.blocked.length, 1);
  assert.equal(none.blocked[0].id, null);
  assert.equal(none.blocked[0].blocked[0].code, 'P_RECOMMEND_NO_CANDIDATE');
  assert.equal(none.blocked[0].blocked[0].with, 'no-such-context');
  assert.match(none.blocked[0].blocked[0].reason, /^no-such-context 맥락용 type-system 재료가 없습니다\(등록된 \d+개 재료의 맥락: .*dashboard.*landing/);
  // nothing registered at all is said differently
  const bare = createPlatform();
  const gone = recommend({...bare.registry, kind: () => ({filter: () => [], list: () => []})}, bare.graph, {kind: 'family', context: 'landing'});
  assert.match(gone.blocked[0].blocked[0].reason, /family 재료가 하나도 등록되지 않았습니다/);
  const some = recommend(env.registry, env.graph, {kind: 'type-system', context: 'dashboard'});
  assert.ok(some.ranked.length > 0);
  assert.ok(!some.blocked.some(b => b.id === null));
});

test('recommend reads the type fit table when asked (fit: true): type systems are ranked by context and density, with the table rows as reasons', () => {
  for (const [context, density] of [['dashboard', 'compact'], ['dashboard', 'spacious'], ['landing', 'comfortable'], ['article', 'comfortable'], ['commerce', 'comfortable']]) {
    const rec = recommend(env.registry, env.graph, {kind: 'type-system', context, density, fit: true});
    const want = rankTypeSystems(env.registry, {context, density}).ranked;
    assert.deepEqual(rec.ranked.map(r => [r.id, r.score]), want.map(r => [r.id, r.score]), `${context}/${density}`);
    for (const r of rec.ranked) assert.deepEqual(r.reasons.map(x => x.reason), typeFit(r.id, {context, density}).reasons.map(x => x.reason));
  }
  // off by default: the existing ranking (pinned by the typography tests) is unchanged, and carries no fit reasons
  const plain = recommend(env.registry, env.graph, {kind: 'type-system', context: 'dashboard', density: 'compact'});
  assert.ok(plain.ranked.every(r => r.reasons.every(x => !/적합|맥락/.test(x.reason)) || r.reasons.length === 0));
  const fitted = recommend(env.registry, env.graph, {kind: 'type-system', context: 'dashboard', density: 'compact', fit: true});
  assert.notDeepEqual(plain.ranked.map(r => r.score), fitted.ranked.map(r => r.score), 'the fit table changes the scores');
  assert.ok(rankTypeSystems(env.registry, {context: 'dashboard', density: 'compact'}).ranked.some(r => r.score !== 0), 'the table has an effect for dashboards');
  // the page pipeline uses the fit in the combination score and in the stated reasons of the type decision
  const r = assemblePage({purpose: 'work-dashboard', candidates: 1, content: {kpis: [{label: 'a', value: '1'}, {label: 'b', value: '2'}]}}, env);
  const decision = r.candidates[0].decisions.find(d => d.slot === 'typeSystem');
  const fit = typeFit(decision.id, {context: r.plan.context, mode: 'light', density: r.plan.axes.density});
  assert.ok(fit.reasons.every(x => decision.reasons.some(y => y.reason === x.reason)));
});

test('type errors keep one code family: every Hangul limit is P_CHECK_TYPE_HANGUL, hierarchy stays P_TYPE_HIERARCHY', () => {
  assert.equal(typeErrorCode('P_TYPE_HANGUL_WEIGHT'), 'P_CHECK_TYPE_HANGUL');
  assert.equal(typeErrorCode('P_TYPE_HANGUL_TRACKING'), 'P_CHECK_TYPE_HANGUL');
  assert.equal(typeErrorCode('P_CHECK_TYPE_HANGUL'), 'P_CHECK_TYPE_HANGUL');
  assert.equal(typeErrorCode('P_TYPE_HIERARCHY'), 'P_TYPE_HIERARCHY');
  assert.equal(typeErrorCode('P_TYPE_FACE'), 'P_TYPE_FACE');
});

test('the page stage reads the style context: axisPreferences shell·width·density and layout.navLimit shape the page', () => {
  const sc = definePlatformMaterial({
    id: 'style-context:pref-test', kind: 'style-context', label: '선호 시험', contexts: ['any'], mood: [], forbid: {},
    axisPreferences: {radius: ['soft'], shell: ['rail', 'topbar'], width: ['standard'], density: ['spacious']}, layout: {navLimit: 2},
  });
  const e = createPlatform({records: [sc]});
  const r = assemblePage({purpose: 'work-dashboard', styleContext: 'style-context:pref-test', candidates: 1, content: {kpis: [{label: 'a', value: '1'}, {label: 'b', value: '2'}]}}, e);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.deepEqual([r.plan.axes.shell, r.plan.axes.width, r.plan.axes.density], ['rail', 'standard', 'spacious']);
  assert.deepEqual([r.plan.axisSources.shell, r.plan.axisSources.width, r.plan.axisSources.density], ['style-context', 'style-context', 'style-context']);
  // an explicit request still wins
  assert.equal(assemblePage({purpose: 'work-dashboard', styleContext: 'style-context:pref-test', shell: 'topbar', candidates: 1, content: {}}, e).plan.axes.shell, 'topbar');
  // landing sections are replaced, so the nav is rebuilt from them and capped at the style context's navLimit
  const landing = assemblePage({purpose: 'saas-landing', styleContext: 'style-context:pref-test', candidates: 1, content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}], faq: [{question: 'q', answer: 'a'}, {question: 'q2', answer: 'a2'}], quotes: [{quote: 'x', author: 'y'}]}}, e);
  assert.equal(landing.ok, true, JSON.stringify(landing.diagnostics));
  const navLinks = [...landing.value.html.matchAll(/<nav class="kit-nav" aria-label="주요 메뉴">(.*?)<\/nav>/g)][0][1].match(/<li>/g).length;
  assert.ok(navLinks <= 2, `nav items ${navLinks}`);
});

test('set design is a record field: states, components and charts come from the record, and a set without them uses the default design', () => {
  for (const id of Object.keys(SUBTOKEN_SET_DESIGNS)) {
    const set = env.registry.get(id), d = SUBTOKEN_SET_DESIGNS[id];
    assert.deepEqual(set.states, {hover: d.hover, active: d.active, control: d.control}, id);
    assert.deepEqual(set.components, {table: d.table}, id);
    assert.deepEqual(set.charts, d.charts, id);
    assert.deepEqual(designOf(set), d, `${id}: the record reproduces the design table`);
  }
  const bare = thaw(clone('subtoken-set:standard')); for (const f of ['states', 'components', 'charts']) delete bare[f];
  assert.deepEqual(designOf(bare), DEFAULT_DESIGN);
  // the record, not a side table, drives the binding: a stronger hover on the record moves the action hover color
  const palette = env.registry.get('palette:static-kit'), std = env.registry.get('subtoken-set:standard');
  const strong = {...thaw(std), id: 'subtoken-set:strong-hover-test', states: {...thaw(std).states, hover: 0.4}};
  assert.notEqual(bindColor(palette, strong, 'light').states.actionHover, bindColor(palette, std, 'light').states.actionHover);
  // malformed design fields are rejected with their path
  const bad = [[{states: {hover: 2}}, '$.states.hover'], [{states: {control: {border: 'nope'}}}, '$.states.control.border'], [{components: {table: {head: 'zzz'}}}, '$.components.table.head'], [{charts: {sequential: 3}}, '$.charts.sequential']];
  for (const [patch, path] of bad) assert.ok(validatePlatformMaterial({...thaw(std), ...patch}).some(e => e.code === 'P_SUBTOKEN_DESIGN' && e.path === path), path);
});

test('fixed role rules are evaluated by bindColor: a literal white surface, a ramp step mixed toward white, and the contrast it reports', () => {
  const palette = env.registry.get('palette:static-kit'), std = thaw(clone('subtoken-set:standard'));
  const withRule = rule => ({...std, id: 'subtoken-set:fixed-test', roles: {...std.roles, surface: rule}});
  const literal = bindColor(palette, withRule({fixed: '#FFFFFF'}), 'light');
  assert.equal(literal.ok, true, JSON.stringify(literal.error));
  assert.equal(literal.roles.surface, '#FFFFFF');
  assert.equal(literal.vars['--kit-surface'], '#FFFFFF');
  assert.notEqual(bindColor(palette, std, 'light').roles.surface, '#FFFFFF', 'the standard set has no pure white surface (the reason for the request)');
  const mixed = bindColor(palette, withRule({fixed: {from: 'neutral', step: '50', mix: {with: '#FFFFFF', ratio: 0.5}}}), 'light');
  assert.equal(mixed.ok, true);
  const plain = bindColor(palette, withRule({fixed: {from: 'neutral', step: '50'}}), 'light');
  assert.equal(plain.roles.surface, bindColor(palette, std, 'light').roles.surface, 'step without mix is the ramp value');
  assert.notEqual(mixed.roles.surface, plain.roles.surface);
  // text still keeps its contrast on the new surface, and a fixed role with min is reported, not adjusted
  assert.ok(literal.report.filter(r => r.against === 'surface').every(r => r.ratio >= r.minimum));
  const gated = bindColor(palette, withRule({fixed: '#FFFFFF', min: {against: ['canvas'], ratio: 21}}), 'light');
  assert.equal(gated.ok, false);
  assert.equal(gated.roles.surface, '#FFFFFF', 'a fixed value is never nudged to pass');
  assert.ok(gated.report.some(r => r.role === 'surface' && r.against === 'canvas' && r.ratio < 21));
});

test('the color functions are exported from the platform entry point', () => {
  for (const f of [colorMatrix, proposeSubtokenSets, assignSeeds, paletteRamps]) assert.equal(typeof f, 'function');
  assert.equal(Object.keys(paletteRamps(env.registry.get('palette:static-kit'))).includes('brand'), true);
});

test('high-contrast and data-dense are dashboard sets, and the default set order still starts with standard', () => {
  for (const id of ['subtoken-set:high-contrast', 'subtoken-set:data-dense']) assert.ok(env.registry.get(id).contexts.includes('dashboard'), id);
  const order = recommend(env.registry, env.graph, {kind: 'subtoken-set', context: 'dashboard', mode: 'light', selected: ['palette:static-kit']}).ranked.map(r => r.id);
  assert.equal(order[0], 'subtoken-set:standard');
  for (const id of ['tinted', 'high-contrast', 'data-dense']) assert.ok(order.includes(`subtoken-set:${id}`), id);
});
