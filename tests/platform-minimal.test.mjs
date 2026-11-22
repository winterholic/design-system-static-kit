import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlatform, MINIMAL_REQUEST, assemblePlatform, bindColor, bindType, recommend, definePlatformMaterial, memberCombinations, requiredVars, STAGES,
} from '../src/platform/index.mjs';
import {STACKS} from '../src/typography.mjs';
import {cardContract, cardStyles} from '../src/materials/card.mjs';

const env = createPlatform();
const codes = r => r.diagnostics.map(d => d.code);
const run = (patch = {}, e = env) => assemblePlatform({...structuredClone(MINIMAL_REQUEST), ...patch}, e);

test('minimal platform assembles end to end: every requested component is rendered by the family over the existing Card implementation', () => {
  const r = run();
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(r.stage, STAGES.at(-1));
  const cards = [...r.value.html.matchAll(/<article class="kit-ctl-card"[^>]*>/g)].map(m => m[0]);
  assert.equal(cards.length, MINIMAL_REQUEST.components.length, 'intent.components are inserted, not only validated');
  for (const c of cards) assert.match(c, /data-appearance="outline" data-shape="soft"/, 'family preset applied');
  assert.match(cards[1], /data-behavior="link" data-media="start"/, 'open axes from the request applied');
  assert.ok(r.value.css.includes(cardStyles), 'base component CSS is reused byte for byte');
  const defined = new Set([...r.value.css.matchAll(/(--[A-Za-z0-9-]+):/g)].map(m => m[1]));
  assert.deepEqual(requiredVars(r.value.css).filter(v => !defined.has(v)), [], 'every variable the CSS reads has a value');
  assert.deepEqual(r.value.manifest.selection, {styleContext: 'style-context:workspace', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp', families: {'base-component:card-surface': 'family:quiet'}});
  for (const id of ['component:card-surface', 'theme:workspace', 'type-preset:tech', 'type-role-preset:erp']) assert.ok(r.value.manifest.reuses.includes(id), id);
  assert.ok(r.value.manifest.contrast.components.every(c => c.pairs.every(p => p.ok)), 'Card contract contrast pairs pass on the bound colors');
  assert.equal(JSON.stringify(run()), JSON.stringify(r), 'deterministic');
  assert.doesNotMatch(r.value.html, /data-ctl="card"[^>]*>$/, 'no empty article');
  assert.equal(run({components: []}).value.html.includes('<article'), false);
});

test('palette × subtoken set is many-to-many: one palette under two sets, one set under two palettes', () => {
  const p = env.registry.get('palette:static-kit');
  const standard = env.registry.get('subtoken-set:standard'), tinted = env.registry.get('subtoken-set:tinted');
  for (const mode of ['light', 'dark']) {
    const a = bindColor(p, standard, mode), b = bindColor(p, tinted, mode);
    assert.ok(a.ok && b.ok, mode);
    assert.notEqual(a.roles.canvas, b.roles.canvas, `${mode}: the distribution, not the palette, decides the canvas`);
    assert.ok([...a.report, ...b.report].every(x => x.ratio >= x.minimum));
  }
  const forest = definePlatformMaterial({id: 'palette:forest-test', kind: 'palette', label: 'forest', tone: 'mid', seeds: {brand: '#2F6B3A', neutral: '#5E6359', accent: '#8A4B2A', success: '#1F6E43', warning: '#8C5A00', danger: '#A8323E', info: '#2F5FA8'}});
  const e2 = createPlatform({records: [forest]});
  const reused = bindColor(forest, standard, 'light');
  assert.ok(reused.ok);
  assert.notEqual(reused.roles.action, bindColor(p, standard, 'light').roles.action, 'same set, different palette, different values');
  const viaRequest = run({palette: 'palette:forest-test', subtokenSet: 'subtoken-set:tinted'}, e2);
  assert.equal(viaRequest.ok, true, JSON.stringify(viaRequest.diagnostics));
  assert.ok(viaRequest.value.css.includes(`--kit-action:${bindColor(forest, tinted, 'light').roles.action}`));
});

test('recommendation is the default assembly: rank, reasons and blocked candidates', () => {
  const rec = recommend(env.registry, env.graph, {kind: 'subtoken-set', context: 'dashboard', mode: 'light', selected: ['palette:static-kit']});
  assert.deepEqual(rec.ranked.map(x => x.id), ['subtoken-set:standard', 'subtoken-set:tinted']);
  assert.equal(rec.ranked[0].reasons[0].from, 'palette:static-kit');
  const picked = run().decisions.find(d => d.slot === 'subtokenSet');
  assert.deepEqual([picked.id, picked.source], ['subtoken-set:standard', 'recommend']);

  const noAccent = definePlatformMaterial({id: 'palette:no-accent', kind: 'palette', label: 'no accent', tone: 'mid', seeds: {brand: '#3157D5', neutral: '#596579'}});
  const e2 = createPlatform({records: [noAccent]});
  const blocked = recommend(e2.registry, e2.graph, {kind: 'subtoken-set', context: 'dashboard', mode: 'light', selected: ['palette:no-accent']});
  assert.equal(blocked.ranked.length, 0);
  assert.ok(blocked.blocked.every(b => b.blocked[0].code === 'P_CHECK_PALETTE_SUBTOKEN'));
  assert.ok(codes(run({palette: 'palette:no-accent', subtokenSet: 'subtoken-set:standard'}, e2)).includes('P_CHECK_PALETTE_SUBTOKEN'));

  const strict = definePlatformMaterial({id: 'style-context:no-soft', kind: 'style-context', label: 'no soft', axisPreferences: {radius: ['square']}, forbid: {radius: ['soft']}, mood: []});
  const e3 = createPlatform({records: [strict]});
  const r = run({styleContext: 'style-context:no-soft'}, e3);
  assert.equal(r.ok, false);
  assert.ok(codes(r).includes('P_SELECT_EMPTY'), 'a style-context ban removes the only Card family instead of substituting');
});

test('attribute validity and combination validity are reported separately', () => {
  const locked = run({components: [{base: 'base-component:card-surface', props: {appearance: 'filled'}, content: {id: 'a', title: 'A'}}]});
  assert.deepEqual(codes(locked), ['P_ATTR_LOCKED']);
  const unknown = run({palette: 'palette:coolors-ocean'});
  assert.deepEqual([codes(unknown)[0], unknown.stage], ['P_ATTR_UNKNOWN', 'selectMaterials']);
  const combo = run({components: [{base: 'base-component:card-surface', props: {state: 'selected'}, content: {id: 'a', title: 'A'}}]});
  assert.deepEqual(codes(combo), ['P_REL_CONTRACT'], 'each value is legal, the pair (static + selected) is not');
  assert.ok(codes(run({css: 'body{}'})).includes('P_REQUEST_KEY'), 'no raw CSS path');
  const {legal, total} = memberCombinations(cardContract, env.registry.get('family:quiet').members['base-component:card-surface']);
  assert.ok(legal > 0 && legal < total, `${legal}/${total}`);
});

test('type system keeps the face pairing and the role scale independent, and enforces the Hangul serif weight cap', () => {
  const mono = definePlatformMaterial({id: 'type-system:mono-erp', kind: 'type-system', label: 'mono × erp', facePairing: 'type-preset:mono', roleScale: 'type-role-preset:erp', numerals: 'tabular'});
  const bound = bindType(mono);
  assert.equal(bound.ok, true);
  assert.equal(bound.vars['--kit-heading'], STACKS.mono, 'the role scale does not overwrite the chosen heading face');
  assert.equal(bound.vars['--kit-t-heading'], bindType(env.registry.get('type-system:tech-erp')).vars['--kit-t-heading'], 'same role scale, same sizes');
  const serif = definePlatformMaterial({id: 'type-system:editorial-marketing', kind: 'type-system', label: 'x', facePairing: 'type-preset:editorial', roleScale: 'type-role-preset:marketing', numerals: 'proportional'});
  assert.equal(bindType(serif).errors[0].code, 'P_TYPE_HANGUL_WEIGHT');
  const e2 = createPlatform({records: [serif]});
  assert.ok(codes(run({typeSystem: 'type-system:editorial-marketing'}, e2)).includes('P_CHECK_TYPE_HANGUL'));
});

test('family × base component is a closed pair: compatible only through the family-member check or a declared compatible edge', async () => {
  const {createRelationGraph} = await import('../src/platform/index.mjs');
  const pair = ['family:quiet', 'base-component:card-surface'];
  assert.deepEqual(createRelationGraph(env.registry).evaluate(pair).violations.map(v => v.code), ['P_REL_CLOSED']);
  const withCheck = env.graph.evaluate(pair);
  assert.equal(withCheck.ok, true);
  assert.equal(withCheck.checks[0].check, 'family-member');
  assert.ok(withCheck.checks[0].detail.legal > 0);
});
