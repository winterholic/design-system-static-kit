import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, pageTypeIds, axes} from '../src/catalog/index.mjs';
import {createPlatform, recommend, assemblePlatform, MINIMAL_REQUEST, definePlatformMaterial, validateEdge} from '../src/platform/index.mjs';
import {
  STYLE_CONTEXT_DETAILS, STYLE_CHECKS, styleContextFromTheme, deriveStyleRelations, recommendWithReason, hueOf,
} from '../src/platform/data/style-contexts.mjs';

const env = createPlatform();
const THEME_IDS = Object.keys(themes);
const KINDS = ['palette', 'subtoken-set', 'type-system', 'family'];
const record = id => env.registry.get(`style-context:${id}`);

test('all 54 themes are registered as style contexts built by styleContextFromTheme, and the Coolors palettes do not come along', () => {
  assert.equal(THEME_IDS.length, 54);
  assert.deepEqual(env.registry.list('style-context').map(m => m.id), THEME_IDS.map(id => `style-context:${id}`).sort());
  for (const id of THEME_IDS) {
    const t = themes[id], rec = record(id), again = styleContextFromTheme(id, {contexts: rec.contexts, extraPreferences: {}});
    assert.deepEqual(rec.reuses, [`theme:${id}`]);
    assert.equal(rec.label, t.name);
    for (const axis of ['radius', 'elevation', 'motion', 'density', 'shell', 'width', 'icon', 'backdrop', 'ornament', 'scale']) assert.equal(rec.axisPreferences[axis][0], t.defaults[axis], `${id}.${axis}: the theme default is the first preference`);
    assert.deepEqual(rec.forbid, t.forbid, `${id}: every single-axis ban (shape, backdrop, ornament, mode) is carried over as a ban`);
    assert.deepEqual(again.axisPreferences.radius, [t.defaults.radius], 'the factory alone keeps only the default when no secondary preference is given');
    const json = JSON.stringify(rec);
    for (const p of t.palettes) assert.ok(!json.includes(`"${p}"`), `${id}: Coolors palette ${p} is not copied`);
    assert.equal(rec.source.license, 'internal');
  }
  assert.ok(env.registry.list('palette').every(p => !/coolors/i.test(p.id + p.source.origin)), 'no unverified palette is registered');
});

test('each style context carries purpose, page types, bans, spacing/radius/shadow/motion tendency, media/icon style and layout/navigation preference', () => {
  for (const id of THEME_IDS) {
    const rec = record(id), d = STYLE_CONTEXT_DETAILS[id], t = themes[id];
    assert.ok(d.use.length > 1, `${id}: purpose`);
    assert.ok(rec.contexts.length >= 2 && rec.contexts.every(c => pageTypeIds.includes(c)), `${id}: page types ${rec.contexts}`);
    assert.deepEqual(d.pageTypes, rec.contexts);
    assert.ok(d.pageTypeReason.length > 3);
    assert.deepEqual(d.forbid.axes, t.forbid);
    for (const c of d.forbid.combos) assert.ok(/^X\d\d$/.test(c.id) && c.why && Object.keys(c.flip).length, `${id}: combination ban ${c.id} has an axis flip and a reason`);
    assert.ok(axes.density.includes(d.tendencies.spacing.density) && d.tendencies.spacing.gap > 0 && d.tendencies.spacing.control >= 40, `${id}: spacing`);
    assert.ok(d.tendencies.radius.px >= 0 && d.tendencies.shadow.shadow && d.tendencies.motion.duration, `${id}: radius/shadow/motion`);
    assert.ok(axes.icon.includes(d.media.icon) && axes.backdrop.includes(d.media.backdrop) && axes.ornament.includes(d.media.ornament), `${id}: media/icon`);
    assert.ok(axes.shell.includes(d.layout.shell) && d.layout.navLimit >= 2 && d.layout.shellLabel && d.layout.widthPx >= 760, `${id}: layout/navigation`);
    assert.ok(rec.mood.length >= 2 && rec.mood[0] === t.category, `${id}: mood is computed from the axes`);
  }
  // 금지 조합은 테마 기본값에서 한 축만 바꿔서 실제로 걸리는 것만 센다.
  const neon = STYLE_CONTEXT_DETAILS.neon.forbid.combos.map(c => c.id);
  assert.ok(neon.includes('X05') === false, 'neon already forbids light mode, so X05 (glow × light) is not repeated as a live combination');
  assert.ok(STYLE_CONTEXT_DETAILS.workspace.forbid.combos.some(c => c.id === 'X05' && c.flip.elevation?.includes('glow')), 'workspace: switching to glow in light mode hits X05');
});

test('relations from a style context to palette, subtoken set, type system and family exist for every context, with a reason', () => {
  assert.deepEqual(env.registry.check(), [], 'every relation target is registered');
  for (const id of THEME_IDS) {
    const rec = record(id);
    for (const e of rec.relations) {
      assert.deepEqual(validateEdge(e), [], `${id} → ${e.to}`);
      assert.ok(['prefers', 'avoids', 'forbids'].includes(e.type) && e.reason.length > 8);
    }
    for (const kind of KINDS) assert.ok(rec.relations.some(e => env.registry.get(e.to).kind === kind), `${id} has a relation to ${kind}`);
  }
  const rel = (id, to, type) => record(id).relations.find(e => e.to === to && (!type || e.type === type));
  assert.ok(hueOf('#3157D5') >= 220 && hueOf('#3157D5') <= 232, 'static-kit brand is blue');
  assert.equal(rel('trust', 'palette:static-kit').priority, 40, 'blue fintech context prefers the blue palette');
  assert.equal(rel('garden', 'palette:static-kit', 'avoids').priority, 25, 'green context avoids the blue palette');
  assert.equal(rel('aurora', 'subtoken-set:tinted').priority, 30, 'gradient backdrop prefers the brand-surface distribution');
  assert.equal(rel('ledger', 'subtoken-set:standard').priority, 30);
  assert.equal(rel('ledger', 'subtoken-set:tinted', 'avoids').priority, 15, 'dense plain themes avoid the tinted distribution');
  assert.equal(rel('editorial', 'type-system:tech-erp', 'avoids').priority, 20, 'reading context avoids the ERP role scale');
  assert.deepEqual(record('insight').relations.filter(e => e.to === 'type-system:tech-erp').map(e => e.priority).sort((a, b) => a - b), [15, 25], 'dense work context: same sans group (15) and the ERP role scale first (25)');
});

test('relation rules read the registered materials only, so later palettes, type systems and families are covered without editing this file', () => {
  const pool = {
    palettes: [definePlatformMaterial({id: 'palette:t-green', kind: 'palette', label: '숲', tone: 'mid', seeds: {brand: '#2F6B3A', neutral: '#5E6359'}})],
    subtokenSets: [], typeSystems: [definePlatformMaterial({id: 'type-system:t-serif', kind: 'type-system', label: '세리프 문서', facePairing: 'type-preset:editorial', roleScale: 'type-role-preset:document', numerals: 'proportional'})],
    families: [definePlatformMaterial({id: 'family:t-hard', kind: 'family', label: '굵은', members: {}, shape: {radius: 'square', elevation: 'hard', motion: 'subtle'}, density: 'comfortable', states: []})],
  };
  const get = (theme, to) => deriveStyleRelations(theme, ['landing'], pool).filter(e => e.to === to);
  assert.equal(get('garden', 'palette:t-green')[0].type, 'prefers', 'a green palette is preferred by the green context');
  assert.equal(get('trust', 'palette:t-green')[0].type, 'avoids', 'and avoided by the blue one');
  assert.equal(get('paper', 'type-system:t-serif').map(e => e.priority).sort().join(), '25,40', 'same face (paper uses editorial) and the expected role scale both count');
  assert.equal(get('ledger', 'type-system:t-serif').some(e => e.type === 'avoids'), true);
  assert.ok(get('neon', 'family:t-hard').some(e => e.type === 'forbids' && e.priority === 100), 'neon bans elevation hard, so the hard family is forbidden');
  assert.ok(!get('brutalist', 'family:t-hard').some(e => e.type === 'forbids'), 'brutalist allows it');
  assert.deepEqual(deriveStyleRelations('neon', ['landing'], pool), deriveStyleRelations('neon', ['landing'], pool), 'deterministic');
});

test('recommend() returns at least one result for every style context, or a reason it is blocked', () => {
  let ranked = 0, explained = 0;
  for (const id of THEME_IDS) {
    const rec = record(id), mode = themes[id].defaults.mode === 'dark' ? 'dark' : 'light';
    for (const context of rec.contexts) for (const kind of KINDS) {
      const selected = kind === 'subtoken-set' ? ['palette:static-kit'] : [];
      const r = recommendWithReason(env.registry, env.graph, {kind, context, mode, styleContext: rec.id, selected});
      assert.ok(r.ok || r.reasons.length > 0, `${id}/${context}/${kind}: neither a result nor a reason`);
      for (const x of r.reasons) assert.ok(x.code && x.reason, `${id}/${context}/${kind}: reason has a code and a text`);
      if (r.ok) ranked++; else explained++;
      if (kind === 'palette' || kind === 'subtoken-set') assert.ok(r.ranked.length > 0, `${id}/${context}/${kind}: contexts-any materials always rank`);
    }
  }
  assert.ok(ranked > 0 && ranked + explained === THEME_IDS.reduce((n, id) => n + record(id).contexts.length * KINDS.length, 0));
  // 원본 recommend()도 같은 후보를 그대로 낸다: 감싸개는 순위를 바꾸지 않는다.
  const direct = recommend(env.registry, env.graph, {kind: 'family', context: 'dashboard', mode: 'light', styleContext: 'style-context:ledger'});
  const wrapped = recommendWithReason(env.registry, env.graph, {kind: 'family', context: 'dashboard', mode: 'light', styleContext: 'style-context:ledger'});
  assert.deepEqual(wrapped.ranked, direct.ranked);
  assert.ok(direct.ranked.length >= 1);
});

test('an empty recommendation says why: no candidate for the context, or a ban from the style context', () => {
  const none = recommendWithReason(env.registry, env.graph, {kind: 'family', context: 'landing', mode: 'dark', styleContext: 'style-context:neon'});
  assert.equal(none.ok, false);
  assert.equal(none.reasons[0].code, 'P_RECOMMEND_NO_CANDIDATE');
  assert.match(none.reasons[0].reason, /landing/);
  // 테마 금지 모드: neon은 light 금지라 모든 서브토큰 세트가 막힌다.
  const light = recommend(env.registry, env.graph, {kind: 'subtoken-set', context: 'landing', mode: 'light', styleContext: 'style-context:neon', selected: ['palette:static-kit']});
  assert.deepEqual(light.ranked, []);
  assert.ok(light.blocked.length === 2 && light.blocked.every(b => b.blocked.some(x => x.code === 'P_CHECK_STYLE_MODE')));
  assert.match(light.blocked[0].blocked.find(x => x.code === 'P_CHECK_STYLE_MODE').reason, /light/);
  const dark = recommend(env.registry, env.graph, {kind: 'subtoken-set', context: 'landing', mode: 'dark', styleContext: 'style-context:neon', selected: ['palette:static-kit']});
  assert.equal(dark.ranked[0].id, 'subtoken-set:tinted', 'the gradient backdrop context ranks the brand-surface distribution first');
  assert.ok(dark.ranked[0].reasons.some(r => r.from === 'style-context:neon'));
  // 스타일 맥락이 금지한 모양의 패밀리는 순위에서 빠진다(기존 recommend 규칙이 만든 이유를 보존).
  const strict = definePlatformMaterial({id: 'style-context:no-outline', kind: 'style-context', label: 'no outline', axisPreferences: {elevation: ['soft']}, forbid: {elevation: ['outline']}, mood: []});
  const e2 = createPlatform({records: [strict]});
  const blocked = recommendWithReason(e2.registry, e2.graph, {kind: 'family', context: 'dashboard', styleContext: 'style-context:no-outline'});
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reasons[0].code, 'P_REL_STYLE_FORBID');
});

test('the style-mode check stops a banned mode in assembly and leaves the allowed mode alone', () => {
  assert.deepEqual(STYLE_CHECKS.map(c => c.id), ['style-mode']);
  const req = (patch = {}) => ({...structuredClone(MINIMAL_REQUEST), context: 'listing', styleContext: 'style-context:nocturne', ...patch});
  const light = assemblePlatform(req({mode: 'light'}), env);
  assert.equal(light.ok, false);
  const empty = light.diagnostics.find(d => d.code === 'P_SELECT_EMPTY');
  assert.ok(empty.blocked.every(b => b.blocked.some(x => x.code === 'P_CHECK_STYLE_MODE')), 'recommendation: every set is blocked, and the reason says the mode is banned');
  const forced = assemblePlatform(req({mode: 'light', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard'}), env);
  assert.equal(forced.ok, false);
  assert.ok(forced.diagnostics.some(d => d.code === 'P_CHECK_STYLE_MODE' && /녹턴/.test(d.message) && /light/.test(d.message)), JSON.stringify(forced.diagnostics));
  assert.equal(forced.stage, 'checkCombination', 'an explicit request is not replaced by another value; the combination check rejects it');
  const dark = assemblePlatform(req({mode: 'dark'}), env);
  assert.equal(dark.ok, true, JSON.stringify(dark.diagnostics));
  assert.equal(dark.value.manifest.selection.styleContext, 'style-context:nocturne');
  assert.ok(dark.decisions.find(d => d.slot === 'subtokenSet').reasons.some(r => r.from === 'style-context:nocturne'), 'the style context is part of the recommendation reasons');
  assert.equal(JSON.stringify(assemblePlatform(req({mode: 'dark'}), env)), JSON.stringify(dark), 'deterministic');
});

test('the workspace context keeps the minimal assembly result', () => {
  const r = assemblePlatform(structuredClone(MINIMAL_REQUEST), env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.deepEqual(r.value.manifest.selection.families, {'base-component:card-surface': 'family:quiet'});
  assert.deepEqual(record('workspace').axisPreferences.radius, ['soft', 'subtle']);
  assert.deepEqual(record('workspace').axisPreferences.elevation, ['outline', 'soft']);
});
