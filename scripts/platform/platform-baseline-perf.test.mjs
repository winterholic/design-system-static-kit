import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelationGraph, defineCheck} from '../../src/platform/relations.mjs';
import {countAttemptedCombinations, createRelationEvaluator} from './platform-baseline.mjs';

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
