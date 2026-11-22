/**
 * 기반 컴포넌트(컴포넌트 패밀리 작업 소유). 2.6.0 컨트롤 10종의 계약·렌더러·CSS를 그대로 붙인다. 구현을 복사하지 않는다.
 * 계약은 모두 defineContract 결과다(Select·Table은 selectControlContract·tableControlContract, 감사 2.4 E).
 * dependencies는 기존 재료(ADR 0011)의 의존 목록을 그대로 읽는다. 패밀리가 이 컴포넌트를 구성원으로 가지려면 의존하는 컴포넌트도 구성원이어야 한다(family-requires).
 */
import {buttonContract, renderButton, buttonStyles, buttonMaterial} from '../../materials/button.mjs';
import {inputContract, renderInput, inputStyles, inputMaterial} from '../../materials/input.mjs';
import {cardContract, renderCard, cardStyles, cardMaterial} from '../../materials/card.mjs';
import {navigationContract, renderNavigation, navigationStyles, navigationMaterial} from '../../materials/navigation.mjs';
import {modalContract, renderModal, modalStyles, modalMaterial} from '../../materials/modal.mjs';
import {tabsContract, renderTabs, tabsStyles, tabsMaterial} from '../../materials/tabs.mjs';
import {tooltipContract, renderTooltip, tooltipStyles, tooltipMaterial} from '../../materials/tooltip.mjs';
import {feedbackContract, renderFeedback, feedbackStyles, feedbackMaterial} from '../../materials/feedback.mjs';
import {selectControlContract, renderSelectControl, selectStyles, selectMaterial} from '../../materials/select.mjs';
import {tableControlContract, renderDataTable, tableStyles, tableMaterial} from '../../materials/table.mjs';
import {definePlatformMaterial} from '../contract.mjs';

const SPECS = [
  {contract: buttonContract, render: renderButton, styles: buttonStyles, material: buttonMaterial, renderExport: 'renderButton', stylesExport: 'buttonStyles', module: 'button', label: 'Button', tags: ['action']},
  {contract: inputContract, render: renderInput, styles: inputStyles, material: inputMaterial, renderExport: 'renderInput', stylesExport: 'inputStyles', module: 'input', label: 'Input', tags: ['form']},
  {contract: cardContract, render: renderCard, styles: cardStyles, material: cardMaterial, renderExport: 'renderCard', stylesExport: 'cardStyles', module: 'card', label: 'Card', tags: ['content']},
  {contract: navigationContract, render: renderNavigation, styles: navigationStyles, material: navigationMaterial, renderExport: 'renderNavigation', stylesExport: 'navigationStyles', module: 'navigation', label: 'Navigation', tags: ['navigation']},
  {contract: modalContract, render: renderModal, styles: modalStyles, material: modalMaterial, renderExport: 'renderModal', stylesExport: 'modalStyles', module: 'modal', label: 'Modal', tags: ['overlay']},
  {contract: tabsContract, render: renderTabs, styles: tabsStyles, material: tabsMaterial, renderExport: 'renderTabs', stylesExport: 'tabsStyles', module: 'tabs', label: 'Tabs', tags: ['navigation']},
  {contract: tooltipContract, render: renderTooltip, styles: tooltipStyles, material: tooltipMaterial, renderExport: 'renderTooltip', stylesExport: 'tooltipStyles', module: 'tooltip', label: 'Tooltip', tags: ['overlay']},
  {contract: feedbackContract, render: renderFeedback, styles: feedbackStyles, material: feedbackMaterial, renderExport: 'renderFeedback', stylesExport: 'feedbackStyles', module: 'feedback', label: 'Feedback', tags: ['feedback']},
  {contract: selectControlContract, render: renderSelectControl, styles: selectStyles, material: selectMaterial, renderExport: 'renderSelectControl', stylesExport: 'selectStyles', module: 'select', label: 'Select', tags: ['form']},
  {contract: tableControlContract, render: renderDataTable, styles: tableStyles, material: tableMaterial, renderExport: 'renderDataTable', stylesExport: 'tableStyles', module: 'table', label: 'Table', tags: ['data']},
];

/** 기존 재료 id(`component:x`) → 기반 컴포넌트 id(`base-component:x`). */
export const baseIdOf = componentId => `base-component:${componentId.slice('component:'.length)}`;

export const BASE_COMPONENTS = Object.freeze(SPECS.map(s => definePlatformMaterial({
  id: baseIdOf(s.contract.id), kind: 'base-component', label: s.label, contract: s.contract.id, tags: s.tags,
  render: {module: `src/materials/${s.module}.mjs`, export: s.renderExport}, styles: {module: `src/materials/${s.module}.mjs`, export: s.stylesExport},
  dependencies: [...s.material.dependencies],
  quality: {status: 'implemented', evidence: []}, reuses: [s.contract.id],
})));

/** id → 실제 구현. registry.kind('base-component').implement(id, impl)로 붙인다. */
export const BASE_IMPLEMENTATIONS = Object.freeze(Object.fromEntries(SPECS.map(s => [baseIdOf(s.contract.id), Object.freeze({contract: s.contract, render: s.render, styles: s.styles})])));
