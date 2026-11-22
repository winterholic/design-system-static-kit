import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindColor, assemblePage, createPlatform, diversify, DIVERSITY_PENALTY, PAGE_STAGES, BEAM} from '../src/platform/index.mjs';
import {createFixturePlatform} from './platform-pipeline-fixtures.mjs';
import {colorContrast} from '../src/color-tokens.mjs';

const env = createPlatform(), fx = createFixturePlatform();
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));
const card = (id, title) => ({base: 'base-component:card-surface', content: {id, title, body: `${title} 본문`}});
const REQ = {purpose: 'work-dashboard', content: {title: '운영 현황', kpis: kpis(4)}, components: [card('a', '가'), card('b', '나')]};
const sig = c => JSON.stringify([c.selection.palette, c.selection.subtokenSet, c.selection.typeSystem, c.selection.families]);

test('one request yields several candidates that differ in palette, set, typography or family, each with its checks and reasons', () => {
  const r = assemblePage({...REQ, candidates: 4}, env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(r.stage, PAGE_STAGES.at(-1));
  assert.ok(r.candidates.length >= 3, `got ${r.candidates.length}`);
  assert.equal(new Set(r.candidates.map(sig)).size, r.candidates.length, 'candidate combinations are distinct');
  assert.equal(new Set(r.candidates.map(c => c.fingerprint.output)).size, r.candidates.length, 'candidate outputs are distinct');
  assert.equal(new Set(r.candidates.map(c => c.selection.palette)).size > 1, true, 'not all candidates share one palette');
  assert.equal(r.selected, r.candidates[0].id);
  assert.equal(JSON.stringify(r.value), JSON.stringify(r.candidates[0].value), 'the top candidate is the default assembly');
  assert.deepEqual(r.candidates.map(c => c.rank), r.candidates.map((_, i) => i + 1));
  for (const c of r.candidates) {
    // compatibility result per candidate
    assert.equal(c.relations.ok, true);
    assert.ok(c.relations.checks.some(x => x.check === 'palette-subtoken' && x.ok), 'the palette × set contrast gate was evaluated');
    assert.ok(c.relations.checks.some(x => x.check === 'family-member' && x.ok), 'the family × base component fit was evaluated');
    // basic quality checks per candidate
    assert.equal(c.quality.ok, true, JSON.stringify(c.quality));
    assert.equal(c.quality.contrast.ok && c.quality.tokens.ok && c.quality.type.ok && c.quality.page.valid, true);
    // decisions with reasons
    assert.deepEqual(c.decisions.map(d => d.slot), ['palette', 'subtokenSet', 'typeSystem', 'family(base-component:card-surface)']);
    for (const d of c.decisions) { assert.ok(['recommend', 'intent'].includes(d.source)); assert.ok(Array.isArray(d.reasons)); assert.equal(d.score, d.reasons.reduce((n, x) => n + x.priority, 0)); }
    assert.ok(c.reasons.every(x => typeof x === 'string' && x.length));
  }
  assert.ok(r.candidates[0].decisions.some(d => d.reasons.length), 'the recommended top candidate carries at least one stated relation as its reason');
  assert.ok(r.candidates[0].score >= r.candidates[1].score, 'rank 1 has the best score');
  // each candidate really renders differently: distinct color token sets
  assert.ok(r.comparison.distinctColorSets >= 2);
});

test('the comparison states what differs between candidates and why rank 1 leads', () => {
  const r = assemblePage({...REQ, candidates: 3}, env);
  assert.equal(r.comparison.rows.length, r.candidates.length);
  assert.equal(r.comparison.against.length, r.candidates.length - 1);
  for (const a of r.comparison.against) {
    assert.ok(a.differs.length >= 1, 'every other candidate differs in at least one material kind');
    assert.ok(a.differs.every(k => ['palette', 'subtokenSet', 'typeSystem', 'families'].includes(k)));
    assert.equal(typeof a.scoreDelta, 'number');
    assert.match(a.summary, /다르다\. 1순위 \d+점, 이 후보 \d+점/);
  }
});

test('the same input gives the same result, byte for byte, in any call order', () => {
  const a = JSON.stringify(assemblePage(REQ, env));
  assemblePage({purpose: 'saas-landing', content: {}}, env);
  const b = JSON.stringify(assemblePage(structuredClone(REQ), createPlatform()));
  assert.equal(a, b);
  const reordered = {components: REQ.components, content: {kpis: REQ.content.kpis, title: REQ.content.title}, purpose: REQ.purpose};
  assert.equal(JSON.stringify(assemblePage(reordered, env).candidates.map(c => c.id)), JSON.stringify(JSON.parse(a).candidates.map(c => c.id)), 'key order of the request does not change the ranking');
});

test('requested materials are kept as given and recorded as intent; candidates then differ only in the open materials', () => {
  const r = assemblePage({...REQ, palette: 'palette:static-kit', candidates: 3}, env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.ok(r.candidates.every(c => c.selection.palette === 'palette:static-kit'));
  assert.ok(r.candidates.every(c => c.decisions[0].source === 'intent'));
  const full = assemblePage({...REQ, palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', families: ['family:quiet']}, env);
  assert.equal(full.candidates.length, 1, 'everything fixed → one candidate');
  assert.deepEqual(full.candidates[0].selection, {styleContext: null, palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', families: {'base-component:card-surface': 'family:quiet'}});
  assert.ok(full.candidates[0].decisions.every(d => d.source === 'intent'));
  const unknown = assemblePage({...REQ, palette: 'palette:nope'}, env);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.diagnostics[0].code, 'P_ATTR_UNKNOWN');
  assert.ok(unknown.diagnostics[0].alternatives.includes('palette:static-kit'));
  const wrongKind = assemblePage({...REQ, palette: 'family:quiet'}, env);
  assert.equal(wrongKind.diagnostics[0].code, 'P_ATTR_KIND');
  const noFamily = assemblePage({...REQ, families: ['family:nope']}, env);
  assert.equal(noFamily.diagnostics[0].code, 'P_ATTR_UNKNOWN');
});

test('blocked candidates come back with the code and reason; a palette no set can render and a Hangul-limit type system never become candidates', () => {
  const r = assemblePage({purpose: 'saas-landing', candidates: BEAM.palette + 4, content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}]}}, fx);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  const byId = id => r.blocked.filter(b => b.id === id);
  const pale = byId('palette:pale-test');
  assert.equal(pale.length, 1);
  assert.equal(pale[0].kind, 'palette');
  assert.equal(pale[0].blocked[0].code, 'P_CHECK_PALETTE_SUBTOKEN');
  assert.match(pale[0].blocked[0].reason, /어느 서브토큰 세트와도 결합하지 못한다/);
  const serif = byId('type-system:serif-heavy-test');
  assert.ok(serif.length >= 1);
  assert.equal(serif[0].blocked[0].code, 'P_CHECK_TYPE_HANGUL');
  assert.match(serif[0].blocked[0].reason, /한글 세리프 굵기 상한 700/);
  for (const c of r.candidates) {
    assert.notEqual(c.selection.palette, 'palette:pale-test');
    assert.notEqual(c.selection.typeSystem, 'type-system:serif-heavy-test');
  }
});

test('a requested material that cannot work is refused at the stage that found it, with the reason', () => {
  const type = assemblePage({purpose: 'saas-landing', typeSystem: 'type-system:serif-heavy-test', content: {}}, fx);
  assert.equal(type.ok, false);
  assert.equal(type.stage, 'evaluateCandidates');
  assert.equal(type.diagnostics[0].code, 'P_CHECK_TYPE_HANGUL');
  assert.ok(type.blocked.some(b => b.combination && b.blocked[0].code === 'P_CHECK_TYPE_HANGUL'), 'the blocked combination is listed');
  const pale = assemblePage({purpose: 'work-dashboard', palette: 'palette:pale-test', content: {kpis: kpis(3)}}, fx);
  assert.equal(pale.ok, false);
  assert.ok(['exploreCandidates', 'evaluateCandidates'].includes(pale.stage));
  assert.equal(pale.diagnostics[0].code, 'P_SELECT_EMPTY');
  assert.ok(pale.blocked.some(b => b.kind === 'subtoken-set' && b.blocked.some(x => x.code === 'P_CHECK_PALETTE_SUBTOKEN' && x.with === 'palette:pale-test')), 'every set is blocked for the requested palette, with the contrast reason');
  const ctx = assemblePage({purpose: 'work-dashboard', typeSystem: 'type-system:mkt-launch', content: {kpis: kpis(3)}}, env);
  assert.equal(ctx.diagnostics[0].code, 'P_ATTR_CONTEXT', 'a marketing type system is not a dashboard context');
  assert.match(ctx.diagnostics[0].message, /dashboard 맥락용이 아닙니다/);
});

test('the candidate limit is honoured and the loop stops when combinations run out', () => {
  assert.equal(assemblePage({...REQ, candidates: 1}, env).candidates.length, 1);
  assert.equal(assemblePage({...REQ, candidates: 2}, env).candidates.length, 2);
  const fixed = assemblePage({...REQ, palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', families: ['family:quiet'], candidates: 8}, env);
  assert.equal(fixed.candidates.length, 1);
});

test('a page without family components still varies palette, set and typography', () => {
  const r = assemblePage({purpose: 'editorial-docs', candidates: 3, content: {title: '글', lead: '리드', sections: [{title: '하나', body: '본문'}]}}, env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.deepEqual(r.candidates.map(c => c.selection.families), r.candidates.map(() => ({})));
  assert.ok(new Set(r.candidates.map(sig)).size === r.candidates.length);
  assert.ok(new Set(r.candidates.map(c => c.fingerprint.face)).size >= 1);
});

test('ranking keeps the best score first and pushes near-duplicates of it back so later candidates really differ', () => {
  const mk = (palette, set, type, score) => ({score, selection: {palette, subtokenSet: set, typeSystem: type, families: {}}});
  const sorted = [mk('p1', 's1', 't1', 40), mk('p1', 's1', 't2', 40), mk('p1', 's1', 't3', 39), mk('p2', 's2', 't1', 36)];
  const out = diversify(sorted);
  assert.deepEqual(out[0].selection, sorted[0].selection, 'rank 1 is the best score');
  assert.deepEqual(out.map(c => c.selection.palette), ['p1', 'p2', 'p1', 'p1'], 'a candidate sharing only the typography and the empty family bundle with rank 1 comes second, ahead of higher-scored near-duplicates');
  assert.equal(out[1].adjusted, 36 - DIVERSITY_PENALTY * 2, 'typography and the family bundle are shared with rank 1');
  assert.equal(JSON.stringify(diversify(sorted)), JSON.stringify(out), 'deterministic');
  // equal scores keep their sorted order
  const ties = diversify([mk('a', 'x', 'y', 10), mk('b', 'z', 'w', 10)]);
  assert.deepEqual(ties.map(c => c.selection.palette), ['a', 'b']);
});

test('a color pair whose derived page tokens miss the contrast floor is blocked with the failing pair named, never silently dropped', () => {
  // accent ink on the accent wash is a token pair the page CSS reads. The color gate checks roles, so the page pipeline checks this derived pair itself.
  const pairs = [];
  for (const mode of ['light', 'dark']) for (const p of env.registry.list('palette')) for (const set of env.registry.list('subtoken-set').filter(x => x.contexts.includes('any') || x.contexts.includes('dashboard'))) {
    const c = bindColor(p, set, mode);
    if (c.ok && colorContrast(c.vars['--kit-accentInk'], c.vars['--kit-accentSoft']) < 4.5) pairs.push({palette: p.id, subtokenSet: set.id, mode});
  }
  const request = {purpose: 'work-dashboard', typeSystem: 'type-system:tech-erp', candidates: 1, content: {kpis: kpis(3)}};
  if (!pairs.length) { // the color work fixed every pair: then every pair must assemble
    assert.equal(assemblePage({...request, palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard'}, env).ok, true);
    return;
  }
  const r = assemblePage({...request, ...pairs[0]}, env);
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'assembleCandidates');
  assert.equal(r.diagnostics[0].code, 'P_CHECK_CONTRAST');
  assert.match(r.diagnostics[0].message, /파생 토큰 accentInk on accentSoft \d+\.\d+:1 < 4\.5:1/);
  const combo = r.blocked.find(b => b.combination);
  assert.equal(combo.blocked[0].code, 'P_CHECK_CONTRAST');
  assert.equal(combo.combination.palette, pairs[0].palette);
});
