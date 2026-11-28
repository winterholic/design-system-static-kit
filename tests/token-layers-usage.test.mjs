import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  SEMANTIC_TOKEN_ROLES,
  STATE_TOKEN_NAMES,
  DATAVIZ_TOKEN_ROLES,
  COMPONENT_TOKEN_CONTRACTS,
  resolveTokenLayers,
  validateTokenUsage
} from '../src/color-tokens.mjs';
import {createPlatform} from '../src/platform/index.mjs';

test('5 token layers are explicitly defined and managed', () => {
  // 1. Primitive: 11 steps
  const env = createPlatform();
  const palette = env.registry.get('palette:static-kit');
  assert.ok(palette && palette.seeds);

  // 2. Semantic 22 roles (§4.5)
  assert.equal(SEMANTIC_TOKEN_ROLES.length, 22, `Expected 22 semantic roles, got ${SEMANTIC_TOKEN_ROLES.length}`);
  const expectedSemantic = [
    'canvas', 'surface', 'raised', 'sunken', 'overlay', 'inverse',
    'text-primary', 'text-secondary', 'text-muted', 'text-disabled',
    'border-subtle', 'border-default', 'border-strong',
    'action-primary', 'action-secondary', 'link', 'focus', 'accent',
    'success', 'warning', 'danger', 'info'
  ];
  for (const s of expectedSemantic) {
    assert.ok(SEMANTIC_TOKEN_ROLES.includes(s), `Missing semantic role: ${s}`);
  }

  // 3. State 9 types (§4.5)
  assert.equal(STATE_TOKEN_NAMES.length, 9, `Expected 9 state types, got ${STATE_TOKEN_NAMES.length}`);
  const expectedStates = [
    'default', 'hover', 'active', 'focus', 'selected', 'disabled', 'readonly', 'error', 'loading'
  ];
  for (const st of expectedStates) {
    assert.ok(STATE_TOKEN_NAMES.includes(st), `Missing state: ${st}`);
  }

  // 4. DataViz 8 types (§4.5)
  assert.equal(DATAVIZ_TOKEN_ROLES.length, 8, `Expected 8 dataviz categories, got ${DATAVIZ_TOKEN_ROLES.length}`);
  const expectedDataViz = [
    'categorical', 'sequential', 'diverging', 'up-down', 'highlight', 'grid', 'axis-label', 'missing'
  ];
  for (const dv of expectedDataViz) {
    assert.ok(DATAVIZ_TOKEN_ROLES.includes(dv), `Missing dataviz category: ${dv}`);
  }

  // 5. Component Contracts for UI components
  const requiredComponents = [
    'button', 'input', 'select', 'checkbox', 'radio', 'switch',
    'tabs', 'badge', 'chip', 'card', 'table', 'tooltip', 'popover', 'modal', 'drawer', 'toast'
  ];
  for (const comp of requiredComponents) {
    assert.ok(COMPONENT_TOKEN_CONTRACTS[comp], `Missing component contract: ${comp}`);
    assert.ok(COMPONENT_TOKEN_CONTRACTS[comp].tokens.length > 0, `Component ${comp} must declare consumed tokens`);
  }
});

test('token usage check: no declared component tokens are unused', () => {
  const check = validateTokenUsage();
  assert.equal(check.ok, true, `Unused tokens found: ${JSON.stringify(check.unused)}`);
  assert.equal(check.unused.length, 0);
});
