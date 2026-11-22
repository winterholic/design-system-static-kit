import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPlatform, definePlatformMaterial, memberCombinations} from '../src/platform/index.mjs';
import {familyRequiresCheck} from '../src/platform/family.mjs';
import {baseIdOf} from '../src/platform/data/base-components.mjs';
import {VISUAL_LANGUAGES} from '../src/platform/families/visual.mjs';
import {defineContract} from '../src/materials/control-kit.mjs';
import {selectContract, selectControlContract, renderSelect, renderSelectControl, selectStyles, selectPlatformPatch, selectMaterial} from '../src/materials/select.mjs';
import {tableContract, tableControlContract, renderDataTable, tableStyles, tableMaterial} from '../src/materials/table.mjs';
import * as button from '../src/materials/button.mjs';
import * as input from '../src/materials/input.mjs';
import * as card from '../src/materials/card.mjs';
import * as navigation from '../src/materials/navigation.mjs';
import * as modal from '../src/materials/modal.mjs';
import * as tabs from '../src/materials/tabs.mjs';
import * as tooltip from '../src/materials/tooltip.mjs';
import * as feedback from '../src/materials/feedback.mjs';

const env = createPlatform();
const BASES = ['button-control', 'input-control', 'card-surface', 'navigation-menu', 'modal-dialog', 'tabs-control', 'tooltip', 'feedback-message', 'select-control', 'data-table'].map(x => `base-component:${x}`);

test('the ten 2.6.0 controls are registered as base components that reuse the existing contract, renderer and CSS', () => {
  assert.deepEqual(env.registry.list('base-component').map(b => b.id).sort(), [...BASES].sort());
  const pairs = {'base-component:button-control': [button.buttonContract, button.renderButton, button.buttonStyles], 'base-component:input-control': [input.inputContract, input.renderInput, input.inputStyles],
    'base-component:card-surface': [card.cardContract, card.renderCard, card.cardStyles], 'base-component:navigation-menu': [navigation.navigationContract, navigation.renderNavigation, navigation.navigationStyles],
    'base-component:modal-dialog': [modal.modalContract, modal.renderModal, modal.modalStyles], 'base-component:tabs-control': [tabs.tabsContract, tabs.renderTabs, tabs.tabsStyles],
    'base-component:tooltip': [tooltip.tooltipContract, tooltip.renderTooltip, tooltip.tooltipStyles], 'base-component:feedback-message': [feedback.feedbackContract, feedback.renderFeedback, feedback.feedbackStyles],
    'base-component:select-control': [selectControlContract, renderSelectControl, selectStyles], 'base-component:data-table': [tableControlContract, renderDataTable, tableStyles]};
  for (const [id, [contract, render, styles]] of Object.entries(pairs)) {
    const impl = env.registry.kind('base-component').implementation(id);
    assert.equal(impl.contract, contract, `${id} contract is the shared object, not a copy`);
    assert.equal(impl.render, render, `${id} render`);
    if (id === 'base-component:select-control') { assert.equal(impl.styles, styles + selectPlatformPatch, 'Select adds only the platform contrast patch after the pinned string'); assert.ok(impl.styles.startsWith(styles)); }
    else assert.equal(impl.styles, styles, `${id} styles are the same string`);
    assert.equal(env.registry.get(id).contract, contract.id);
  }
  assert.deepEqual(env.registry.check(), []);
});

test('Select and Table contracts are defineContract contracts that agree with the pinned 2.6.0 contracts', () => {
  for (const [control, legacy] of [[selectControlContract, selectContract], [tableControlContract, tableContract]]) {
    assert.equal(control.id, legacy.id);
    assert.deepEqual(control.axes, legacy.variants, `${legacy.id} axes are the 2.6.0 variants`);
    assert.deepEqual({...control.defaults}, {...legacy.defaults, ...(legacy === tableContract ? {state: 'ready'} : {})});
    assert.deepEqual([...control.states], [...legacy.states]);
    assert.deepEqual([...control.unsupported], [...legacy.unsupported]);
    assert.ok(control.pairs.length > 0 && control.concepts.state?.length && control.concepts.size?.length && control.concepts.function?.length, 'concepts and contrast pairs are data');
  }
  assert.deepEqual(selectControlContract.forbidden.map(r => r.id), ['SELECT_MULTI_ASYNC']);
  assert.throws(() => renderSelect({id: 'x', label: 'x', options: [], mode: 'multiple', search: 'async'}), /multiple \+ async/, 'the renderer enforces the same rule the contract declares');
  assert.deepEqual(tableControlContract.forbidden.map(r => r.id), ['TABLE_NO_ROWS_SORT', 'TABLE_NO_ROWS_SELECT']);
  // 필수 개념을 줄이는 것은 명시한 컨트롤만 가능하다. 기본 계약은 다섯 개념 전부를 요구한다.
  const base = {id: 'component:t', label: 't', axes: {size: ['a'], state: ['a']}, concepts: {size: ['size'], state: ['state']}, defaults: {size: 'a', state: 'a'}, forbidden: [], states: ['a'], transitions: []};
  assert.throws(() => defineContract(base), /concept appearance has no attribute/);
  assert.doesNotThrow(() => defineContract({...base, required: ['size', 'state']}));
  // Select는 disabled가 state 값이므로 렌더 입력(disabled 불리언)으로 옮긴 진입점이 renderSelect와 같은 출력을 낸다.
  const ex = {id: 'region', label: '지역', options: [{value: 'kr', label: '한국'}]};
  assert.equal(renderSelectControl({...ex, state: 'disabled'}), renderSelect({...ex, state: 'ready', disabled: true}));
  assert.equal(renderSelectControl({...ex}), renderSelect({...ex}));
});

const sha = s => createHash('sha256').update(s).digest('hex');
const PINNED = {
  button: 'ded81afe37e39157bc62e39b016214ea894aa0d0db79d2c957aa2a586fa4a0e6', input: '874a408e902a917d3747e6037b7d05408e2cb416aa16a86d2ad1ef4cecc7b8b1', card: '83cbdc09569a1619bb4e42edacea38391c065669bb7f9edee6f55b7298d21927',
  navigation: '5b401c365293889e20bb134ad7649a5a81d8a632a2b915f158654de962c535f9', modal: '44634dbd86e3ede2ec4303bf2d221566b9e0049afcd95ecae2769f4c2ad68c26', tabs: '4f4f63f5880a2159b2b217511451c6bdf2a9995110bc52744ae76912e66232fc',
  tooltip: '1fb2d2a005c7e7caecae3e18bcad7bb9826ee36a8eb2a133b38f4e24f325157c', feedback: '081a190cdcf43d82ac8c700389ec05e846521eece76f630ddc5113b805d2e199',
  select: 'f99f04c221b26db9e4b37c2477f672d725f8ecdb97d1a6fe34f4aebf6a50db40', table: 'a30a8f1d186b90d415f8ef84b0222c2cd470a1554f55e588956a065913fe70c8',
};
test('existing control output is byte-identical to the commit before the base-component work (renders, CSS, contract and material records)', () => {
  const rows = {
    button: [button.buttonExamples, button.renderButton, button.buttonStyles, button.buttonMaterial, button.buttonContract], input: [input.inputExamples, input.renderInput, input.inputStyles, input.inputMaterial, input.inputContract],
    card: [card.cardExamples, card.renderCard, card.cardStyles, card.cardMaterial, card.cardContract], navigation: [navigation.navigationExamples, navigation.renderNavigation, navigation.navigationStyles, navigation.navigationMaterial, navigation.navigationContract],
    modal: [modal.modalExamples, modal.renderModal, modal.modalStyles, modal.modalMaterial, modal.modalContract], tabs: [tabs.tabsExamples, tabs.renderTabs, tabs.tabsStyles, tabs.tabsMaterial, tabs.tabsContract],
    tooltip: [tooltip.tooltipExamples, tooltip.renderTooltip, tooltip.tooltipStyles, tooltip.tooltipMaterial, tooltip.tooltipContract], feedback: [feedback.feedbackExamples, feedback.renderFeedback, feedback.feedbackStyles, feedback.feedbackMaterial, feedback.feedbackContract],
    select: [selectMaterial.examples.map(x => ({mode: 'multiple', search: 'local', ...x})), renderSelect, selectStyles, selectMaterial, selectContract], table: [tableMaterial.examples.map(x => ({...x, sortable: true, selectable: true})), renderDataTable, tableStyles, tableMaterial, tableContract],
  };
  for (const [name, [examples, render, styles, material, contract]] of Object.entries(rows)) assert.equal(sha(JSON.stringify({renders: examples.map(x => render(x)), styles, material, contract})), PINNED[name], name);
});

test('visual families: at least three, each covering at least four base components, and every family × base passes family-member and family-requires', () => {
  const families = env.registry.list('family');
  assert.ok(families.length >= 3);
  assert.deepEqual(families.map(f => f.id).sort(), Object.keys(VISUAL_LANGUAGES).sort(), 'every visual family has visual metrics and vice versa');
  let checked = 0;
  for (const f of families) {
    const covered = Object.keys(f.members);
    assert.ok(covered.length >= 4, `${f.id} covers ${covered.length}`);
    for (const b of BASES) {
      const rs = env.graph.runChecks(f.id, b, {});
      assert.deepEqual(rs.map(r => r.check).sort(), ['family-member', 'family-requires'], `${f.id} × ${b} runs both checks`);
      assert.ok(rs.every(r => r.ok), `${f.id} × ${b}: ${rs.filter(r => !r.ok).map(r => r.reason)}`);
      const ev = env.graph.evaluate([f.id, b], {});
      assert.equal(ev.ok, true, `${f.id} × ${b}: ${JSON.stringify(ev.violations)}`);
      checked++;
    }
  }
  assert.equal(checked, families.length * BASES.length);
});

test('family-requires: a family cannot cover Card without covering Button, which Card renders its footer actions with', () => {
  const quiet = env.registry.get('family:quiet');
  const members = {...quiet.members}; delete members['base-component:button-control'];
  const broken = definePlatformMaterial({...structuredClone(quiet), id: 'family:no-button', members, relations: []});
  const e2 = createPlatform({records: [broken]});
  const [r] = e2.graph.runChecks('family:no-button', 'base-component:card-surface', {}).filter(x => x.check === 'family-requires');
  assert.equal(r.ok, false);
  assert.match(r.reason, /button-control/);
  assert.equal(e2.graph.evaluate(['family:no-button', 'base-component:card-surface'], {}).violations.some(v => v.code === 'P_CHECK_FAMILY_REQUIRES'), true);
  assert.equal(familyRequiresCheck.run(broken, e2.registry.get('base-component:button-control'), {}, e2.registry).ok, true, 'a base without dependencies has nothing to require');
  assert.equal(baseIdOf('component:card-surface'), 'base-component:card-surface');
});

test('open axes keep a legal combination count per family member, and the locked axes are what makes the families differ', () => {
  const card = env.registry.kind('base-component').implementation('base-component:card-surface').contract;
  const counts = Object.fromEntries(env.registry.list('family').map(f => [f.id, memberCombinations(card, f.members['base-component:card-surface'])]));
  for (const [id, c] of Object.entries(counts)) assert.ok(c.legal > 0 && c.legal < c.total, `${id} ${JSON.stringify(c)}`);
  const sig = f => JSON.stringify(Object.entries(f.members).map(([b, m]) => [b, m.preset]));
  const sigs = env.registry.list('family').map(sig);
  assert.equal(new Set(sigs).size, sigs.length, 'no two visual families fix the same axes');
  const radii = new Set(env.registry.list('family').map(f => f.shape.radius));
  assert.ok(radii.size >= 3, 'shape language differs too');
});
