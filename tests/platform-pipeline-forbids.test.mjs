import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform, assemblePage, assemblePlatform, recommend, banPairs, buildAxisValues, withStyleForbids, styleForbidRelations, axisIds, materialAxisIds, definePlatformMaterial, PLATFORM_KINDS} from '../src/platform/index.mjs';
import {axes, axisBans} from '../src/catalog/axes.mjs';
import {themes} from '../src/catalog/themes.mjs';
import {createFixturePlatform} from './platform-pipeline-fixtures.mjs';

const env = createFixturePlatform();
const ctxOf = themeId => env.registry.get(`style-context:${themeId}`);
const forbidsBetween = (a, b) => env.graph.between(a, b).filter(e => e.type === 'forbids');
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));

test('axis-value is a platform kind and every axis value is registered once', () => {
  assert.ok(PLATFORM_KINDS.includes('axis-value'));
  const values = env.registry.list('axis-value');
  assert.equal(values.length, Object.values(axes).reduce((n, v) => n + v.length, 0));
  assert.equal(new Set(values.map(v => v.id)).size, values.length);
  assert.deepEqual(env.registry.check(), [], 'every forbids target is registered');
});

test('axis bans X01~X11 became forbids relations: for every value pair the predicate and the relation agree', () => {
  assert.equal(axisBans.length, 11);
  let predicateHits = 0;
  for (const ban of axisBans) {
    const [x, y] = ban.uses;
    for (const vx of axes[x]) for (const vy of axes[y]) {
      const bad = ban.bad({[x]: vx, [y]: vy}), edges = forbidsBetween(`axis-value:${x}.${vx}`, `axis-value:${y}.${vy}`).filter(e => e.reason.startsWith(`${ban.id}:`));
      assert.equal(edges.length > 0, bad, `${ban.id} ${x}=${vx} × ${y}=${vy}`);
      if (bad) { predicateHits++; assert.ok(edges[0].reason.includes(ban.why), 'the explanation is the original `why` sentence'); assert.equal(edges[0].priority, 100); }
    }
  }
  assert.equal(predicateHits, banPairs().length);
  const all = buildAxisValues().flatMap(v => v.relations);
  assert.equal(all.length, predicateHits, 'no relation without a predicate hit');
  assert.ok(all.every(e => e.type === 'forbids' && /^X\d\d: /.test(e.reason) && e.evidence));
});

test('theme forbid became forbids relations on every registered style context, including axes a record may not carry', () => {
  let checked = 0;
  for (const id of Object.keys(themes)) {
    const sc = ctxOf(id), edges = sc.relations.filter(e => e.type === 'forbids' && e.to.startsWith('axis-value:'));
    const want = Object.entries(themes[id].forbid).flatMap(([axis, vs]) => vs.map(v => `axis-value:${axis}.${v}`)).sort();
    assert.deepEqual([...new Set(edges.map(e => e.to))].sort(), want, id);
    for (const e of edges) { assert.match(e.reason, /를 금지한다\(테마 forbid\)/); checked++; }
  }
  assert.ok(checked > 40);
  // a record that carries only some axes still gets every theme ban: the original theme is read through `reuses`
  const partial = definePlatformMaterial({id: 'style-context:partial-test', kind: 'style-context', label: '부분', axisPreferences: {radius: ['soft']}, forbid: {elevation: ['glow']}, mood: [], reuses: ['theme:civic']});
  const full = withStyleForbids(partial);
  assert.deepEqual(full.relations.map(e => e.to).sort(), ['axis-value:backdrop.gradient', 'axis-value:backdrop.grid', 'axis-value:elevation.glow', 'axis-value:elevation.hard', 'axis-value:elevation.lifted', 'axis-value:mode.auto', 'axis-value:motion.lively']);
  assert.equal(withStyleForbids(full).relations.length, full.relations.length, 'idempotent');
  assert.equal(styleForbidRelations(partial).length, full.relations.length);
  // a record without the theme link keeps only its own bans
  assert.deepEqual(styleForbidRelations({...partial, reuses: []}).map(e => e.to), ['axis-value:elevation.glow']);
});

test('valid values with a forbidden combination: a theme that forbids a mode rejects it with the theme named', () => {
  const content = {features: [{title: '하나', body: '둘'}, {title: '셋', body: '넷'}]};
  const light = assemblePage({purpose: 'saas-landing', styleContext: 'style-context:neon', mode: 'light', content}, env);
  assert.equal(light.ok, false);
  assert.equal(light.stage, 'planPage', 'the plan already holds the requested mode and the style context');
  assert.equal(light.diagnostics[0].code, 'P_REL_FORBIDS');
  assert.match(light.diagnostics[0].message, /style-context:neon × axis-value:mode\.light: .*는 mode=light를 금지한다\(테마 forbid\)/);
  assert.match(light.diagnostics[0].message, /요구한 값끼리의 충돌이라 다른 값으로 바꾸지 않는다/);
  // each value alone is fine
  const dark = assemblePage({purpose: 'saas-landing', styleContext: 'style-context:neon', mode: 'dark', content}, env);
  assert.equal(dark.ok, true, JSON.stringify(dark.diagnostics));
  assert.equal(assemblePage({purpose: 'saas-landing', mode: 'light', content}, env).ok, true);
});

test('a request that did not name the axis is moved by the rule, and the move is a recorded decision; a requested axis is never moved', () => {
  const r = assemblePage({purpose: 'editorial-docs', density: 'compact', candidates: 1, content: {title: '글', lead: '리드', sections: [{title: '하나', body: '본문'}]}}, env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(r.plan.axes.density, 'compact', 'the requested density stays');
  assert.equal(r.plan.axes.icon, 'line', 'the theme default line-fine is not allowed with compact (X09)');
  assert.equal(r.plan.axisSources.icon, 'X09');
  const note = r.decisions.find(d => d.slot === 'layout.icon');
  assert.match(note.reason, /^X09: .*→ icon을 line-fine에서 line로 바꾼다\(요구하지 않은 값이라/);
});

test('family shape is evaluated as axis values: X04 and X05 block a family and say why', () => {
  const cardReq = (extra = {}) => ({purpose: 'work-dashboard', candidates: 6, content: {kpis: kpis(3)}, components: [{base: 'base-component:card-surface', content: {id: 'a', title: 'A', body: 'a'}}, {base: 'base-component:card-surface', content: {id: 'b', title: 'B', body: 'b'}}], ...extra});
  // X05: glow elevation × light mode
  const light = assemblePage(cardReq({families: ['family:glow-test'], mode: 'light'}), env);
  assert.equal(light.ok, false);
  assert.equal(light.diagnostics[0].code, 'P_REL_FORBIDS');
  assert.match(light.diagnostics[0].message, /X05: 글로우는 밝은 바탕에서 보이지 않아/);
  assert.match(light.diagnostics[0].message, /axis-value:elevation\.glow × axis-value:mode\.light|axis-value:mode\.light × axis-value:elevation\.glow/);
  assert.equal(assemblePage(cardReq({families: ['family:glow-test'], mode: 'dark'}), env).ok, true, 'the same family is fine in dark mode');
  // recommend skips the family for the same reason instead of ranking it
  const rec = recommend(env.registry, env.graph, {kind: 'family', context: 'dashboard', mode: 'light', selected: ['base-component:card-surface', ...axisIds({mode: 'light'})]});
  const blocked = rec.blocked.find(b => b.id === 'family:glow-test');
  assert.ok(blocked, 'blocked, not ranked');
  assert.equal(blocked.blocked[0].code, 'P_REL_FORBIDS');
  assert.ok(!rec.ranked.some(r => r.id === 'family:glow-test'));
  // X04: hard elevation × gradient backdrop (aurora's default backdrop)
  const hard = assemblePage(cardReq({families: ['family:hard-test'], styleContext: 'style-context:aurora', mode: 'dark'}), env);
  assert.equal(hard.ok, false);
  assert.ok(hard.diagnostics.some(d => /X04: 굵은 오프셋 그림자는 단색 바탕에서만/.test(d.message)), JSON.stringify(hard.diagnostics));
  assert.equal(materialAxisIds(env.registry.get('family:hard-test')).includes('axis-value:elevation.hard'), true);
});

test('the older single-page pipeline sees the same relations (assemblePlatform rejects glow in light mode)', () => {
  const base = {context: 'dashboard', components: [{base: 'base-component:card-surface', family: 'family:glow-test', content: {id: 'a', title: 'A', body: 'a'}}]};
  const light = assemblePlatform({...base, mode: 'light'}, env);
  assert.equal(light.ok, false);
  assert.equal(light.stage, 'checkCombination');
  assert.ok(light.diagnostics.some(d => d.code === 'P_REL_FORBIDS' && /X05/.test(d.message)), JSON.stringify(light.diagnostics));
  assert.equal(assemblePlatform({...base, mode: 'dark'}, env).ok, true);
});
