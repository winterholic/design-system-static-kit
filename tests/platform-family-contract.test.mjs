import test from 'node:test';
import assert from 'node:assert/strict';
import {validateComponentContracts, ALL_COMPONENT_CONTRACTS, ACTION_COMPONENTS, countDistinctComponentTypes} from '../src/platform/families/contracts.mjs';

test('all existing base and purpose components carry complete layer contracts', () => {
  assert.equal(ALL_COMPONENT_CONTRACTS.length, 54);
  assert.deepEqual(validateComponentContracts(), []);
});

test('each §6.2 A action component has a renderer and canonical requirement link', () => {
  assert.equal(ACTION_COMPONENTS.length, 12);
  for (const item of ACTION_COMPONENTS) {
    assert.ok(item.render({label: '저장', ariaLabel: '저장', icon: 'plus'}).includes(`data-component="${item.id}"`), item.id);
    assert.ok(item.requirementId.startsWith('req:comp:a-'), item.id);
  }
});

test('contract validator explains unsupported states and rejects incomplete contracts', () => {
  const sample = ALL_COMPONENT_CONTRACTS[0];
  const invalid = {...sample, unsupported: {states: [{value: 'dragging'}]}};
  assert.ok(validateComponentContracts([invalid]).some(issue => issue.path === '$[0].unsupported.states[0].reason'));
});

test('button appearance, size and state changes affect rendered HTML or CSS hooks', () => {
  const button = ACTION_COMPONENTS.find(item => item.id === 'component:button');
  const solid = button.render({label: '확인', appearance: 'solid', size: 'md', state: 'default'});
  const ghost = button.render({label: '확인', appearance: 'ghost', size: 'md', state: 'default'});
  const large = button.render({label: '확인', appearance: 'solid', size: 'xl', state: 'default'});
  const disabled = button.render({label: '확인', appearance: 'solid', size: 'md', state: 'disabled'});
  assert.notEqual(solid, ghost);
  assert.notEqual(solid, large);
  assert.notEqual(solid, disabled);
});

test('color, size and density variants are not counted as new component types', () => {
  const base = ACTION_COMPONENTS[0];
  assert.equal(countDistinctComponentTypes([
    {...base, appearance: 'solid', size: 'sm', color: 'blue'},
    {...base, appearance: 'ghost', size: 'xl', color: 'red', density: 'compact'},
    ACTION_COMPONENTS.find(item => item.id === 'component:split-button'),
  ]), 2);
});
