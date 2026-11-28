import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../../src/platform/index.mjs';
import {assemblePage} from '../../src/platform/page.mjs';
import {createRelationGraph, defineCheck} from '../../src/platform/relations.mjs';
import {assembleVerifiedPage, buildAllPairsCoveringSample, countAttemptedCombinations, createRelationEvaluator, mergePlatformSections, VERIFIED_FACTORS} from './platform-baseline.mjs';

test('prepared material assembly matches assemblePage output and quality', () => {
  const env = createPlatform(), request = {
    purpose: 'editorial-docs', pattern: 'docs-reference', palette: 'palette:clay-earth',
    subtokenSet: 'subtoken-set:developer-console', typeSystem: 'type-system:doc-dev-docs', candidates: 1,
  };
  const expected = assemblePage(request, env);
  const actual = assembleVerifiedPage(request, env, new Map());
  assert.equal(actual.ok, expected.ok);
  assert.deepEqual(actual.candidates[0].quality, expected.candidates[0].quality);
  assert.deepEqual(actual.candidates[0].selection, expected.candidates[0].selection);
  assert.deepEqual(actual.candidates[0].fingerprint, expected.candidates[0].fingerprint);
  assert.deepEqual(actual.candidates[0].value, expected.candidates[0].value);
});

test('parallel platform sections merge counters by sum and fingerprints by set union', () => {
  const make = (outputs, colors, faces, families, purposes, styleOutputs) => ({
    contractVersion: 'test', registered: {palette: 2},
    assemblable: {attempted: 10, assemblable: 8, perPattern: {p: {assemblable: 8, verified: outputs.length}}, note: 'same'},
    verified: {attempted: outputs.length, verified: outputs.length, distinctOutputs: new Set(outputs).size, failures: {}, note: 'same'},
    distinct: {
      colorTokenSets: {light: 1, dark: 0}, facePairs: 1, families: 2,
      styleMaterials: {...Object.fromEntries(['surface', 'motion', 'background', 'media', 'state-pattern'].map(kind => [kind, {registered: 1, attempted: 1, verified: 1, usedInOutput: 1, rejectedCases: []}])), distinctOutputs: new Set(styleOutputs).size},
      purposeFamilies: {verified: new Set(purposes).size, ids: [...new Set(purposes)].sort()},
      verifiedColorTokenSets: {light: new Set(colors).size, dark: 0}, verifiedFacePairs: new Set(faces).size, verifiedFamilies: new Set(families).size,
      note: 'same',
    },
    colorGateFailures: {P_COLOR_CONTRAST: 1},
    __mergeDetails: {
      attemptedByPattern: {p: 10}, assemblableByPattern: {p: 8},
      samplingByPattern: {p: {originalMaterialCombinations: 20, feasibleMaterialCombinations: 8, sampledMaterialCombinations: 4, coveredAllowedPairs: 16, layoutCombinations: 1}},
      outputs, lightColors: colors, darkColors: [], faces, families, purposes, styleOutputs,
    },
  });
  const merged = mergePlatformSections([
    make(['o1', 'o2'], ['c1'], ['f1'], ['v1'], ['p1'], ['s1']),
    make(['o2', 'o3'], ['c1', 'c2'], ['f2'], ['v1', 'v2'], ['p1', 'p2'], ['s1', 's2']),
  ]);
  assert.equal(merged.assemblable.attempted, 10);
  assert.equal(merged.assemblable.assemblable, 8);
  assert.equal(merged.verified.attempted, 4);
  assert.equal(merged.verified.verified, 4);
  assert.equal(merged.verified.distinctOutputs, 3);
  assert.deepEqual(merged.verified.sampling.byPattern.p, {originalMaterialCombinations: 20, feasibleMaterialCombinations: 8, sampledMaterialCombinations: 4, coveredAllowedPairs: 16, layoutCombinations: 2});
  assert.deepEqual(merged.distinct.verifiedColorTokenSets, {light: 2, dark: 0});
  assert.equal(merged.distinct.verifiedFacePairs, 2);
  assert.equal(merged.distinct.verifiedFamilies, 2);
  assert.deepEqual(merged.distinct.purposeFamilies, {verified: 2, ids: ['p1', 'p2']});
  assert.equal(merged.distinct.styleMaterials.surface.attempted, 2);
  assert.equal(merged.distinct.styleMaterials.distinctOutputs, 2);
});

test('factored relation evaluation preserves naive B1-scale assemblable counts', () => {
  const records = [];
  const base = {id: 'base-component:card-surface', kind: 'base-component', relations: []};
  records.push(base);
  const add = (kind, count, prefix, relationsFor = () => []) => {
    const result = Array.from({length: count}, (_, index) => {
      const id = `${prefix}:${index}`;
      const value = {id, kind, index, relations: relationsFor(index, id)};
      records.push(value);
      return value;
    });
    return result;
  };
  const palettes = add('palette', 210, 'palette');
  const sets = add('subtoken-set', 7, 'set', index => index % 3 === 0 ? [{type: 'forbids', to: 'palette:4', reason: 'fixture'}] : []);
  const types = add('type-system', 8, 'type');
  const families = add('family', 4, 'family', (_, id) => [{type: 'compatible', to: base.id, reason: 'fixture'}]);
  const registry = {
    list: () => records,
    get: id => records.find(record => record.id === id) ?? null,
  };
  const graph = createRelationGraph(registry, {
    checks: [defineCheck({
      id: 'fixture-palette-type', kinds: ['palette', 'type-system'], reason: 'fixture check',
      run: (palette, type) => ({ok: (palette.index + type.index) % 7 !== 0}),
    })],
  });
  const fastEvaluate = createRelationEvaluator(graph, registry);
  const context = {context: 'dashboard', mode: 'light'};
  const naiveAttempted = 2 * 4 * 3 * 2 * palettes.length * sets.length * types.length * families.length;
  const optimizedAttempted = countAttemptedCombinations({
    modes: 2, shells: 4, widths: 3, densities: 2,
    palettes: palettes.length, sets: sets.length, types: types.length, families: families.length,
  });
  let naive = 0;
  for (const palette of palettes) for (const set of sets) for (const type of types) for (const family of families) {
    if (graph.evaluate([palette.id, set.id, type.id, family.id, base.id], context).ok) naive++;
  }
  let optimized = 0;
  for (const palette of palettes) for (const set of sets) for (const type of types) for (const family of families) {
    if (fastEvaluate([palette.id, set.id, type.id, family.id, base.id], context)) optimized++;
  }
  assert.equal(optimizedAttempted, naiveAttempted);
  assert.equal(optimized, naive);
  assert.ok(optimized > 0 && optimized < palettes.length * sets.length * types.length * families.length);
});

test('relation check cache retains the repeated B1 palette-set pair working set', () => {
  const records = [];
  const add = (kind, count, prefix) => Array.from({length: count}, (_, index) => {
    const record = {id: `${prefix}:${index}`, kind, relations: []};
    records.push(record);
    return record;
  });
  const palettes = add('palette', 73, 'palette');
  const sets = add('subtoken-set', 73, 'set');
  const registry = {list: () => records, get: id => records.find(record => record.id === id) ?? null};
  let calls = 0;
  const graph = createRelationGraph(registry, {
    checks: [defineCheck({
      id: 'fixture-palette-set', kinds: ['palette', 'subtoken-set'], reason: 'fixture check',
      run: () => { calls++; return {ok: true}; },
    })],
  });
  for (const palette of palettes) for (const set of sets) graph.runChecks(palette.id, set.id, {mode: 'light'});
  const firstPassCalls = calls;
  for (const palette of palettes) for (const set of sets) graph.runChecks(palette.id, set.id, {mode: 'light'});
  assert.equal(firstPassCalls, palettes.length * sets.length);
  assert.equal(calls, firstPassCalls);
});

test('verified sample deterministically covers every feasible value and pair', () => {
  const candidates = [];
  for (const mode of ['dark', 'light']) for (const palette of ['palette:a', 'palette:b', 'palette:c']) {
    for (const subtokenSet of ['set:a', 'set:b']) for (const typeSystem of ['type:a', 'type:b']) for (const family of ['family:a', 'family:b']) {
      if (palette === 'palette:c' && subtokenSet === 'set:b') continue;
      if (mode === 'dark' && typeSystem === 'type:b' && family === 'family:a') continue;
      candidates.push({mode, palette, subtokenSet, typeSystem, family});
    }
  }
  const coverage = rows => {
    const values = Object.fromEntries(VERIFIED_FACTORS.map(factor => [factor, new Set()]));
    const pairs = new Set();
    for (const row of rows) {
      for (let i = 0; i < VERIFIED_FACTORS.length; i++) {
        const left = VERIFIED_FACTORS[i]; values[left].add(row[left]);
        for (let j = i + 1; j < VERIFIED_FACTORS.length; j++) {
          const right = VERIFIED_FACTORS[j];
          pairs.add(JSON.stringify([left, row[left], right, row[right]]));
        }
      }
    }
    return {values: Object.fromEntries(Object.entries(values).map(([key, set]) => [key, [...set].sort()])), pairs};
  };
  const first = buildAllPairsCoveringSample(candidates);
  const second = buildAllPairsCoveringSample(candidates);
  assert.deepEqual(first, second);
  assert.ok(first.rows.length < candidates.length);
  assert.deepEqual(coverage(first.rows).values, coverage(candidates).values);
  assert.deepEqual(coverage(first.rows).pairs, coverage(candidates).pairs);
  assert.notDeepEqual(coverage(first.rows.slice(1)).pairs, coverage(candidates).pairs);
});
