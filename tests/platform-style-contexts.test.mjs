import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, pageTypeIds, axes} from '../src/catalog/index.mjs';
import {createPlatform, createPlatformRegistry, createRelationGraph, recommend, assemblePlatform, MINIMAL_REQUEST, definePlatformMaterial, validateEdge} from '../src/platform/index.mjs';
import {
  STYLE_CONTEXT_DETAILS, STYLE_CHECKS, STYLE_PICKS, STYLE_TYPE_PICKS, styleContextFromTheme, deriveStyleRelations, recommendWithReason, hueOf,
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
  assert.equal(rel('trust', 'palette:static-kit').priority, 70, 'blue fintech context: static-kit is the first pick');
  assert.equal(rel('garden', 'palette:forest-green').priority, 70, 'garden context: forest-green is the first pick');
  assert.equal(rel('garden', 'palette:static-kit', 'avoids').priority, 20, 'a palette outside the picks and far from the theme hue is avoided');
  assert.deepEqual(record('aurora').relations.filter(e => e.to === 'subtoken-set:tinted').map(e => e.priority).sort((a, b) => a - b), [30, 70], 'gradient backdrop (rule, 30) and the first-pick set (70)');
  assert.equal(rel('ledger', 'subtoken-set:standard').priority, 30);
  assert.equal(rel('ledger', 'subtoken-set:tinted', 'avoids').priority, 15, 'dense plain themes avoid the tinted distribution');
  assert.equal(rel('editorial', 'type-system:tech-erp', 'avoids').priority, 15, 'a reading context avoids the work-purpose type system');
  assert.deepEqual(record('insight').relations.filter(e => e.to === 'type-system:tech-erp').map(e => e.priority), [10], 'dense work context keeps the non-selected ERP option as a light preference');
});

test('each style context prefers at least two compatible W2 type-system ids and reuses systems across contexts', () => {
  const reuse = new Map();
  for (const id of THEME_IDS) {
    const rec = record(id);
    const pickedIds = STYLE_TYPE_PICKS[id];
    const picks = rec.relations.filter(edge => pickedIds.includes(edge.to) && edge.type === 'prefers');
    assert.ok(picks.length >= 2, `${id}: at least two preferred type-system candidates`);
    assert.deepEqual(picks.map(edge => edge.to), STYLE_TYPE_PICKS[id], `${id}: selected W2 ids are explicit and ordered`);
    assert.deepEqual(picks.map(edge => edge.priority), [15, 10], `${id}: shortlist stays a soft preference under W2 page relations`);
    for (const picked of picks) {
      assert.match(picked.to, /^type-system:(work-console|work-insight|doc-essay|doc-handbook|doc-newsroom|mkt-atelier|mkt-brand|mkt-launch|shop-boutique|shop-catalog|mobile-app|mobile-feed|mobile-reader|tech-erp)$/);
      assert.ok(rec.contexts.some(context => env.registry.get(picked.to).contexts.includes(context)), `${id}: ${picked.to} overlaps a page type`);
      assert.ok(picked.reason.length > 20 && /페이지 유형|용도|서체|밀도/.test(picked.reason), `${id}: ${picked.to} explains its fit`);
      reuse.set(picked.to, (reuse.get(picked.to) ?? 0) + 1);
    }
  }
  assert.ok([...reuse.values()].some(count => count >= 2), 'type systems are reused by multiple style contexts');
  assert.ok(reuse.size >= 10, 'the picks use multiple systems across the catalog');
});

test('type-system recommendations add page-conditioned W2 relations to the two curated style-context candidates', () => {
  const cases = [
    {
      context: 'listing', styleContext: 'style-context:workspace',
      expected: [['type-system:tech-erp', 80], ['type-system:work-console', 40], ['type-system:work-insight', 15]],
      sources: ['작업 공간 스타일의 기존 기본 짝', 'W2 운영 콘솔', 'W2 분석 보드'],
    },
    {
      context: 'dashboard', styleContext: 'style-context:devtool',
      expected: [['type-system:tech-erp', 65], ['type-system:work-console', 40], ['type-system:work-insight', 10]],
      sources: ['테마의 서체 축 기본값', '서체 짝(grotesk)', 'W2 분석 보드'],
    },
    {
      context: 'dashboard', styleContext: 'style-context:workspace',
      expected: [['type-system:tech-erp', 80], ['type-system:work-console', 40], ['type-system:work-insight', 40]],
      sources: ['작업 공간 스타일의 기존 기본 짝', 'W2 운영 콘솔', 'W2 분석 보드'],
    },
  ];
  for (const c of cases) {
    const result = recommend(env.registry, env.graph, {kind: 'type-system', context: c.context, styleContext: c.styleContext});
    assert.deepEqual(result.ranked.slice(0, 3).map(row => [row.id, row.score]), c.expected, `${c.styleContext}/${c.context}: actual additive rank`);
    for (const [i, row] of result.ranked.slice(0, 3).entries()) {
      assert.ok(row.reasons.some(reason => reason.reason.includes(c.sources[i])), `${row.id}: score has its expected relation evidence`);
    }
  }
  assert.deepEqual(STYLE_TYPE_PICKS.workspace.slice(0, 2), ['type-system:work-insight', 'type-system:work-console'], 'curated candidate order comes from W2 fit; actual page recommendation can rank tech-erp ahead of them');
});

test('relation rules read the registered materials only, so later palettes, type systems and families are covered without editing this file', () => {
  const pool = {
    palettes: [definePlatformMaterial({id: 'palette:t-green', kind: 'palette', label: '숲', tone: 'mid', seeds: {brand: '#2F6B3A', neutral: '#5E6359'}})],
    subtokenSets: [], typeSystems: [definePlatformMaterial({id: 'type-system:t-serif', kind: 'type-system', label: '세리프 문서', tags: ['document'], facePairing: 'type-preset:editorial', roleScale: 'type-role-preset:document', numerals: 'proportional'})],
    families: [definePlatformMaterial({id: 'family:t-hard', kind: 'family', label: '굵은', members: {}, shape: {radius: 'square', elevation: 'hard', motion: 'subtle'}, density: 'comfortable', states: []})],
  };
  const get = (theme, to) => deriveStyleRelations(theme, ['landing'], pool).filter(e => e.to === to);
  assert.equal(get('garden', 'palette:t-green')[0].type, 'prefers', 'a green palette is preferred by the green context');
  assert.equal(get('trust', 'palette:t-green')[0].type, 'avoids', 'and avoided by the blue one');
  assert.equal(get('paper', 'type-system:t-serif').map(e => e.priority).sort().join(), '25,40', 'same face (paper uses editorial) and the expected purpose both count');
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
  // 후보가 맥락에 하나도 맞지 않는 경우: 패밀리가 dashboard 전용인 작은 레지스트리로 만든다(main 재료가 늘어도 이 경우는 그대로 시험된다).
  const reg = createPlatformRegistry().registerAll([
    definePlatformMaterial({id: 'family:only-dashboard', kind: 'family', label: '대시보드 전용', contexts: ['dashboard'], members: {}, shape: {radius: 'soft', elevation: 'outline', motion: 'subtle'}, density: 'comfortable', states: []}),
    definePlatformMaterial({id: 'style-context:t', kind: 'style-context', label: '시험', axisPreferences: {}, forbid: {}, mood: []}),
  ]);
  const small = {registry: reg, graph: createRelationGraph(reg, {checks: []})};
  const none = recommendWithReason(small.registry, small.graph, {kind: 'family', context: 'landing', styleContext: 'style-context:t'});
  assert.equal(none.ok, false);
  assert.equal(none.reasons[0].code, 'P_RECOMMEND_NO_CANDIDATE');
  assert.match(none.reasons[0].reason, /landing/);
  assert.match(none.reasons[0].reason, /dashboard/, 'the reason lists the contexts that do have candidates');
  const empty = recommendWithReason(small.registry, small.graph, {kind: 'palette', context: 'landing'});
  assert.match(empty.reasons[0].reason, /하나도 등록되지 않았습니다/);
  // 테마 금지 모드: neon은 light 금지라 모든 서브토큰 세트가 막힌다.
  const sets = env.registry.kind('subtoken-set').filter({context: 'landing'}).length;
  const light = recommend(env.registry, env.graph, {kind: 'subtoken-set', context: 'landing', mode: 'light', styleContext: 'style-context:neon', selected: ['palette:static-kit']});
  assert.deepEqual(light.ranked, []);
  assert.ok(sets >= 2 && light.blocked.length === sets && light.blocked.every(b => b.blocked.some(x => x.code === 'P_CHECK_STYLE_MODE')), 'every set for the context is blocked by the banned mode');
  assert.match(light.blocked[0].blocked.find(x => x.code === 'P_CHECK_STYLE_MODE').reason, /light/);
  const dark = recommend(env.registry, env.graph, {kind: 'subtoken-set', context: 'landing', mode: 'dark', styleContext: 'style-context:neon', selected: ['palette:static-kit']});
  assert.ok(dark.ranked.length >= 2, 'the same sets rank in the allowed mode');
  const tinted = dark.ranked.find(r => r.id === 'subtoken-set:tinted');
  assert.ok(tinted.reasons.some(r => r.from === 'style-context:neon' && r.priority === 30), 'the gradient backdrop context credits the brand-surface distribution');
  // 스타일 맥락이 금지한 모양의 패밀리는 순위에서 빠진다(기존 recommend 규칙이 만든 이유를 보존).
  const strict = definePlatformMaterial({id: 'style-context:no-outline', kind: 'style-context', label: 'no outline', axisPreferences: {elevation: ['soft']}, forbid: {elevation: ['outline']}, mood: []});
  const e2 = createPlatform({records: [strict]});
  const blocked = recommendWithReason(e2.registry, e2.graph, {kind: 'family', context: 'dashboard', styleContext: 'style-context:no-outline'});
  assert.ok(blocked.blocked.some(b => b.id === 'family:quiet' && b.blocked.some(x => x.code === 'P_REL_STYLE_FORBID')), 'the outline family is removed with a reason');
  assert.ok(!blocked.ranked.some(r => r.id === 'family:quiet'));
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

test('the first palette and subtoken set of every style context are named by id, and the recommendation follows them without id-order ties', () => {
  assert.deepEqual(Object.keys(STYLE_PICKS).sort(), THEME_IDS.sort(), 'all 54 themes name their picks');
  const palettes = new Set(env.registry.list('palette').map(p => p.id.slice(8))), sets = new Set(env.registry.list('subtoken-set').map(p => p.id.slice(13)));
  for (const [id, p] of Object.entries(STYLE_PICKS)) {
    assert.ok(p.palette.every(x => palettes.has(x)) && p.subtokenSet.every(x => sets.has(x)), `${id}: picks exist in the registry`);
    assert.notEqual(p.palette[0], p.palette[1]); assert.notEqual(p.subtokenSet[0], p.subtokenSet[1]);
    const edges = record(id).relations;
    assert.equal(edges.find(e => e.to === `palette:${p.palette[0]}`).priority, 70);
    assert.equal(edges.find(e => e.to === `palette:${p.palette[1]}`).priority, 30);
    assert.match(edges.find(e => e.to === `palette:${p.palette[0]}`).reason, /1순위 팔레트/);
  }
  const firsts = new Set(Object.values(STYLE_PICKS).map(p => p.palette[0]));
  assert.ok(firsts.size >= 8, `first-pick palettes differ across themes (${firsts.size} of 9)`);
  let checked = 0;
  for (const id of THEME_IDS) {
    const rec = record(id), mode = themes[id].defaults.mode === 'dark' ? 'dark' : 'light';
    for (const context of rec.contexts) {
      const pal = recommend(env.registry, env.graph, {kind: 'palette', context, mode, styleContext: rec.id});
      assert.equal(pal.ranked[0].id, `palette:${STYLE_PICKS[id].palette[0]}`, `${id}/${context}: no anchor, the style context decides the palette`);
      assert.ok(pal.ranked[0].score > pal.ranked[1].score, `${id}/${context}: not decided by id order`);
      const set = recommend(env.registry, env.graph, {kind: 'subtoken-set', context, mode, styleContext: rec.id, selected: [pal.ranked[0].id]});
      if (set.ranked.length > 1) assert.ok(set.ranked[0].score > set.ranked[1].score, `${id}/${context}: set not decided by id order`);
      const wanted = STYLE_PICKS[id].subtokenSet.map(s => `subtoken-set:${s}`).find(s => set.ranked.some(r => r.id === s));
      if (wanted) assert.equal(set.ranked[0].id, wanted, `${id}/${context}: the best available named set ranks first`);
      checked++;
    }
  }
  assert.ok(checked >= 150);
  // 기본 조립도 같은 선택을 따른다: 앵커 없는 요청에서 스타일 맥락이 팔레트를 정한다.
  const r = assemblePlatform({...structuredClone(MINIMAL_REQUEST), context: 'listing', styleContext: 'style-context:stay'}, env);
  assert.equal(r.decisions.find(d => d.slot === 'palette').id, 'palette:ocean-cool');
  assert.ok(r.decisions.find(d => d.slot === 'palette').reasons.some(x => x.from === 'style-context:stay' && /1순위 팔레트/.test(x.reason)));
});
