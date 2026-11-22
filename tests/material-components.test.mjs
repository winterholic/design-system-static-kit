import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogRegistry, buttonContract, inputContract, cardContract, navigationContract,
  modalContract, tabsContract, tooltipContract, feedbackContract, ContractError,
  resolveProps, allCombinations, violations, CONTROL_SIZES,
  buttonStyles, inputStyles, cardStyles, navigationStyles, modalStyles, tabsStyles,
  tooltipStyles, feedbackStyles,
} from '../src/materials/index.mjs';

const contracts = [buttonContract, inputContract, cardContract, navigationContract, modalContract, tabsContract, tooltipContract, feedbackContract];
const styles = [buttonStyles, inputStyles, cardStyles, navigationStyles, modalStyles, tabsStyles, tooltipStyles, feedbackStyles];

test('Button component material is registered and exposes its contract', () => {
  assertMaterial(buttonContract, 'component:button-control', buttonStyles);
});

test('Input component material is registered and exposes its contract', () => {
  assertMaterial(inputContract, 'component:input-control', inputStyles);
});

test('Card component material is registered and exposes its contract', () => {
  assertMaterial(cardContract, 'component:card-surface', cardStyles);
});

test('Navigation component material is registered and exposes its contract', () => {
  assertMaterial(navigationContract, 'component:navigation-menu', navigationStyles);
});

test('Modal component material is registered and exposes its contract', () => {
  assertMaterial(modalContract, 'component:modal-dialog', modalStyles);
});

test('Tabs component material is registered and exposes its contract', () => {
  assertMaterial(tabsContract, 'component:tabs-control', tabsStyles);
});

test('Tooltip component material is registered and exposes its contract', () => {
  assertMaterial(tooltipContract, 'component:tooltip', tooltipStyles);
});

test('Feedback component material is registered and exposes its contract', () => {
  assertMaterial(feedbackContract, 'component:feedback-message', feedbackStyles);
});

test('component contracts reject unknown attributes instead of silently ignoring them', () => {
  for (const contract of contracts) assert.throws(() => resolveProps(contract, {notAnAxis: true}), /unknown attribute/);
});

test('component contracts partition appearance, shape, size, function, state, and context and reject every forbidden combination', () => {
  for (const contract of contracts) {
    const claimed = Object.values(contract.concepts).flat();
    assert.deepEqual([...claimed].sort(), Object.keys(contract.axes).sort(), contract.id);
    for (const props of allCombinations(contract)) {
      if (violations(contract, props).length) assert.throws(() => resolveProps(contract, props), ContractError, contract.id);
      else assert.deepEqual(resolveProps(contract, props), props, contract.id);
    }
  }
});

test('component sizes reuse CONTROL_SIZES rather than defining independent size values', () => {
  for (const css of styles) for (const size of Object.keys(CONTROL_SIZES)) assert.ok(css.includes(`[data-size=${size}]`), size);
});

function assertMaterial(contract, id, css) {
  const material = catalogRegistry().get(id);
  assert.ok(material, id);
  assert.equal(material.since, '2.6.0');
  assert.deepEqual(material.variants, contract.axes);
  assert.deepEqual(material.defaults, contract.defaults);
  assert.ok(material.tokens.length > 0);
  assert.ok(['--kit-surface', '--kit-text', '--kit-danger', '--kit-border'].some(token => css.includes(`var(${token})`)), 'component color tokens are reused');
}
