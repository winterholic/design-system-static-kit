/** Shared component contract registry and §6.2 A action renderers.
 *
 * Keep the schema in this family-owned module. New families can import
 * defineComponentContract/validateComponentContracts without editing the
 * central family index; registration is discovered from the owned family
 * modules by the platform entry point.
 */
import {BASE_COMPONENTS} from '../data/base-components.mjs';
import {CARD_FAMILIES} from './card.mjs';
import {BUTTON_FAMILIES} from './button.mjs';
import {NAVIGATION_FAMILIES} from './navigation.mjs';
import {FORM_FAMILIES} from './form.mjs';
import {TABLE_FAMILIES} from './table.mjs';
import {FEEDBACK_FAMILIES} from './feedback.mjs';
import {renderButton} from '../../materials/button.mjs';
import {COMPONENT_CLASSIFICATION} from './inventory.mjs';
import {ACTION_CSS, ACTION_RUNTIME, withButtonAttrs, menuTriggerAttrs, renderMenuPanel} from './action.mjs';
import {COMMERCE_SPECS, COMMERCE_COMPONENTS, COMMERCE_COMPONENT_BY_ID, renderCommerceComponent, COMMERCE_COMPONENT_CSS, COMMERCE_COMPONENT_RUNTIME, COMMERCE_CONTRACTS} from './commerce.mjs';
import {LAYOUT_COMPONENTS, LAYOUT_CSS, LAYOUT_RUNTIME, renderLayoutComponent} from './layout.mjs';

export {COMMERCE_SPECS, COMMERCE_COMPONENTS, COMMERCE_COMPONENT_BY_ID, renderCommerceComponent, COMMERCE_COMPONENT_CSS, COMMERCE_COMPONENT_RUNTIME, COMMERCE_CONTRACTS};
export {LAYOUT_COMPONENTS, LAYOUT_CSS, LAYOUT_RUNTIME, renderLayoutComponent};

export const COMPONENT_LAYERS = Object.freeze(['Primitive', 'Base', 'Purpose', 'Composite', 'Page Section']);
export const COMPONENT_CONTRACT_FIELDS = Object.freeze([
  'id', 'version', 'componentType', 'layer', 'purpose', 'contexts', 'structure', 'slots', 'props', 'content',
  'appearance', 'sizes', 'density', 'states', 'transitions', 'events', 'tokens', 'parents', 'children',
  'responsive', 'accessibility', 'forbidden', 'examples', 'usage', 'renderer', 'blueprint', 'tests', 'unsupported',
]);

/** Style-only axis values do not create a second component type. */
export function countDistinctComponentTypes(components) {
  return new Set(components.map(item => item.componentType ?? item.id)).size;
}

export function defineComponentContract(spec) {
  return Object.freeze({version: '1.0.0', componentType: spec.id, contexts: ['any'], structure: 'single root', slots: [], props: {},
    content: {label: {type: 'string', required: true}}, appearance: ['default'], sizes: ['md'], density: ['comfortable'],
    states: ['default'], transitions: [], events: [], tokens: [], parents: ['slot:main'], children: [],
    responsive: {strategy: 'fluid', breakpoints: ['sm', 'md', 'lg'], behavior: 'wrap without horizontal overflow'},
    accessibility: {role: 'semantic HTML', keyboard: ['Tab', 'Enter', 'Space'], requirements: []},
    forbidden: [], examples: [], usage: 'Use where the component purpose applies.',
    renderer: {module: 'src/platform/families/contracts.mjs', export: 'renderActionComponent'},
    blueprint: {field: 'materials.purposes', id: null}, tests: [], unsupported: {}, ...spec});
}

/**
 * A 계열 목적 패밀리가 어느 컴포넌트 종류의 구현인지. 같은 종류를 가리키는 계약(독립 시연 `component:*`와 목적 패밀리)은
 * countDistinctComponentTypes에서 한 종류로 센다. 목적 패밀리가 새 종류를 만들지 않는 경우(아이콘·토글·로딩·복사·닫기·FAB)는 button-control이다.
 */
const PURPOSE_COMPONENT_TYPE = Object.freeze({
  'purpose:button.icon': 'button-control', 'purpose:button.toggle': 'button-control', 'purpose:button.loading': 'button-control',
  'purpose:button.fab': 'button-control', 'purpose:button.copy': 'button-control', 'purpose:button.close': 'button-control',
  'purpose:button.split': 'split-button', 'purpose:button.menu': 'menu-button',
});

const normalizeBase = m => defineComponentContract({id: m.id, componentType: m.id.slice('base-component:'.length), layer: 'Base', purpose: m.label,
  contexts: ['any'], structure: `base material ${m.id}`, slots: ['content'], props: {sourceContract: m.contract},
  content: {label: {type: 'string', required: false}}, appearance: ['default'], sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
  states: ['default', 'hover', 'focus', 'active', 'disabled'], tokens: [], parents: ['slot:main', 'slot:header', 'slot:footer'],
  children: [], renderer: m.render, blueprint: {field: 'components', id: m.id}, tests: ['tests/platform-family-base.test.mjs'],
  unsupported: {states: [{value: 'loading', reason: '상태 지원은 해당 기반 재료의 source contract에 한정한다.'}]} });
const normalizePurpose = f => defineComponentContract({id: f.id, componentType: PURPOSE_COMPONENT_TYPE[f.id] ?? f.id, layer: 'Purpose', purpose: f.purpose,
  contexts: f.contexts, structure: f.label, slots: Object.keys(f.content), props: {...f.variants, ...f.props},
  content: f.content, appearance: ['family visual recipe'], sizes: ['small', 'medium', 'large'], density: ['compact', 'comfortable', 'spacious'],
  states: f.states, transitions: f.interactions, events: f.interactions, tokens: f.tokens ?? [], parents: f.parents,
  children: f.children, responsive: f.responsive, accessibility: f.a11y, forbidden: f.forbidden,
  examples: [f.example], usage: f.purpose, renderer: f.entry, blueprint: {field: 'materials.purposes', id: f.id},
  tests: ['tests/platform-family-purpose.test.mjs'], unsupported: {states: []} });

export const COMPONENT_CONTRACTS = Object.freeze([
  ...BASE_COMPONENTS.map(normalizeBase),
  ...[...CARD_FAMILIES, ...BUTTON_FAMILIES, ...NAVIGATION_FAMILIES, ...FORM_FAMILIES, ...TABLE_FAMILIES, ...FEEDBACK_FAMILIES].map(normalizePurpose),
]);

export function validateComponentContracts(contracts = ALL_COMPONENT_CONTRACTS) {
  const errors = [], seen = new Set();
  contracts.forEach((c, index) => {
    const root = `$[${index}]`;
    for (const key of COMPONENT_CONTRACT_FIELDS) if (!Object.hasOwn(c, key)) errors.push({path: `${root}.${key}`, message: `required field ${key}`});
    if (seen.has(c.id)) errors.push({path: `${root}.id`, message: `duplicate component id ${c.id}`});
    seen.add(c.id);
    if (!COMPONENT_LAYERS.includes(c.layer)) errors.push({path: `${root}.layer`, message: `invalid layer ${c.layer}`});
    for (const key of ['contexts', 'slots', 'states', 'events', 'tokens', 'parents', 'children', 'forbidden', 'examples', 'tests']) {
      if (!Array.isArray(c[key])) errors.push({path: `${root}.${key}`, message: `${key} must be an array`});
    }
    for (const key of ['props', 'content', 'responsive', 'accessibility', 'renderer', 'blueprint', 'unsupported']) {
      if (!c[key] || typeof c[key] !== 'object' || Array.isArray(c[key])) errors.push({path: `${root}.${key}`, message: `${key} must be an object`});
    }
    if (typeof c.componentType !== 'string' || !c.componentType) errors.push({path: `${root}.componentType`, message: 'componentType must be a non-empty string'});
    for (const [axis, entries] of Object.entries(c.unsupported ?? {})) {
      if (!Array.isArray(entries)) { errors.push({path: `${root}.unsupported.${axis}`, message: 'unsupported entries must be an array of {value, reason}'}); continue; }
      entries.forEach((entry, n) => {
        if (!entry?.reason?.trim()) errors.push({path: `${root}.unsupported.${axis}[${n}].reason`, message: 'unsupported values need a reason'});
      });
    }
    if (typeof c.renderer?.module !== 'string' || typeof c.renderer?.export !== 'string') errors.push({path: `${root}.renderer`, message: 'renderer module/export required'});
    if (typeof c.blueprint?.field !== 'string') errors.push({path: `${root}.blueprint`, message: 'blueprint connection required'});
  });
  return errors;
}

const SIZE_MAP = Object.freeze({xs: 'compact', sm: 'small', md: 'medium', lg: 'large', xl: 'large'});
const APPEARANCE_MAP = Object.freeze({solid: 'solid', outline: 'outline', soft: 'soft', ghost: 'ghost', link: 'link', elevated: 'solid', destructive: 'solid'});

/**
 * §6.2 A 12항목. materialId는 이 항목을 실제로 구현하는 등록 재료이고, blueprint는 그 재료를 Blueprint 2.7.0에서 쓰는 방법이다.
 *   purposes  materials.purposes에 목적 패밀리 id를 적고 트리에 표지 노드(metric, label `platform-purpose-<번호>`)를 둔다
 *   node      트리 노드 하나(부품 type과 축 값)로 쓴다. 구형 부품은 materials 없이 2.6.0 이하에서도 컴파일된다
 * 독립 시연(`actions` 입력과 renderActionComponent)은 시각 패밀리를 고르지 않는 기본 외형이고, Blueprint 재료는 시각 패밀리를 따른다.
 */
const NODE = (type, axes = {}) => ({field: 'tree', node: type, axes});
const PURPOSE = id => ({field: 'materials.purposes', purpose: id});
const ACTION_SPECS = [
  ['component:button', 'Button', 'a-01-button', 'button-control', 'base-component:button-control', NODE('button-control')],
  ['component:icon-button', 'Icon Button', 'a-02-icon-button', 'button-control', 'purpose:button.icon', PURPOSE('purpose:button.icon')],
  ['component:link-button', 'Link Button', 'a-03-link-button', 'button-control', 'base-component:button-control', NODE('button-control', {appearance: 'link'})],
  ['component:toggle-button', 'Toggle Button', 'a-04-toggle-button', 'button-control', 'purpose:button.toggle', PURPOSE('purpose:button.toggle')],
  ['component:split-button', 'Split Button', 'a-05-split-button', 'split-button', 'purpose:button.split', PURPOSE('purpose:button.split')],
  ['component:menu-button', 'Menu Button', 'a-06-menu-button', 'menu-button', 'purpose:button.menu', PURPOSE('purpose:button.menu')],
  ['component:floating-action-button', 'Floating Action Button', 'a-07-floating-action-button', 'button-control', 'purpose:button.fab', PURPOSE('purpose:button.fab')],
  ['component:button-group', 'Button Group', 'a-08-button-group', 'button-group', 'component:actions', NODE('actions')],
  ['component:segmented-control', 'Segmented Control', 'a-09-segmented-control', 'tabs-control', 'base-component:tabs-control', NODE('tabs-control', {appearance: 'segmented'})],
  ['component:copy-button', 'Copy Button', 'a-10-copy-button', 'button-control', 'purpose:button.copy', PURPOSE('purpose:button.copy')],
  ['component:close-button', 'Close Button', 'a-11-close-button', 'button-control', 'purpose:button.close', PURPOSE('purpose:button.close')],
  ['component:loading-action-button', 'Loading Action Button', 'a-12-loading-action-button', 'button-control', 'purpose:button.loading', PURPOSE('purpose:button.loading')],
];
const LAYER_OF = Object.freeze({independent: 'Base', variant: 'Purpose', composite: 'Composite'});

const escAttr = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const SAFE = /^[a-z][a-z0-9-]*$/;
const slug = id => id.slice('component:'.length);
/** data-component-appearance는 실제로 그려진 외형을 말해야 CSS 훅이 맞는다(link-button은 link, FAB은 기본 elevated). */
const shownAppearance = (id, p) => (id === 'component:link-button' ? 'link' : p.appearance ?? (id === 'component:floating-action-button' ? 'elevated' : 'solid'));
const coreButton = (p, extra = {}) => renderButton({label: p.label ?? 'Action', id: p.id, ariaLabel: p.ariaLabel,
  icon: p.icon ?? 'plus', content: p.content ?? 'text', appearance: APPEARANCE_MAP[p.appearance] ?? 'solid',
  size: SIZE_MAP[p.size] ?? 'medium', state: p.state === 'selected' ? 'pressed' : p.state ?? 'default',
  behavior: p.behavior ?? 'action', tone: p.appearance === 'destructive' ? 'danger' : p.tone ?? 'action', ...extra});
/** 단일 선택이므로 selected가 여럿이어도 첫 번째만 눌린다. 없으면 첫 항목이다. */
const selectedIndex = all => { const i = all.findIndex(x => x.selected && x.state !== 'disabled'); return i >= 0 ? i : all.findIndex(x => x.state !== 'disabled'); };
const listOf = (p, fallback) => (Array.isArray(p.items) && p.items.length ? p.items : fallback);
const itemProps = item => ({label: item.label, ariaLabel: item.ariaLabel, icon: item.icon, size: item.size, appearance: item.appearance, state: item.state, content: item.content, tone: item.tone});
/** 마크업 id는 호출자가 주지 않으면 컴포넌트 종류에서 정한다(서비스는 요청 순서대로 id를 준다). */
function idsOf(id, p) {
  const base = p.id ?? `kit-${slug(id)}`;
  if (!SAFE.test(base)) throw new TypeError('id must be lowercase kebab-case');
  return {base, menu: `${base}-menu`};
}
const SIZES = Object.freeze(['xs', 'sm', 'md', 'lg', 'xl']);
const APPEARANCES = Object.freeze(Object.keys(APPEARANCE_MAP));
const STATES = Object.freeze(['default', 'loading', 'disabled', 'selected']);
/** 허용 값 밖은 기본값으로 바꾸지 않고 거부한다(속성에 들어가는 값이라 검증 없이 쓰지 않는다). */
function checkProps(id, p) {
  if (p.size !== undefined && !SIZES.includes(p.size)) throw new TypeError(`size는 ${SIZES.join('·')} 중 하나입니다: ${String(p.size)}`);
  if (p.appearance !== undefined && !APPEARANCES.includes(p.appearance)) throw new TypeError(`appearance는 ${APPEARANCES.join('·')} 중 하나입니다: ${String(p.appearance)}`);
  if (p.state !== undefined && !STATES.includes(p.state)) throw new TypeError(`state는 ${STATES.join('·')} 중 하나입니다(hover·active·focus는 사용자 조작이 만드는 상태라 입력이 아닙니다): ${String(p.state)}`);
  if (id === 'component:copy-button' && typeof p.text !== 'string') throw new TypeError('복사할 값(text)이 필요합니다');
}
function renderByKind(id, p) {
  checkProps(id, p);
  const attrs = `data-component="${id}" data-component-size="${escAttr(p.size ?? 'md')}" data-component-appearance="${escAttr(shownAppearance(id, p))}"`;
  const mark = html => withButtonAttrs(html, attrs);
  const {base, menu} = idsOf(id, p);
  switch (id) {
    case 'component:button': return mark(coreButton(p));
    case 'component:icon-button': return mark(coreButton({...p, content: 'icon-only', ariaLabel: p.ariaLabel ?? p.label}));
    case 'component:link-button': return mark(coreButton({...p, appearance: 'link'}));
    case 'component:toggle-button': return mark(coreButton({...p, behavior: 'toggle', state: p.selected ? 'pressed' : p.state ?? 'default'}));
    case 'component:split-button': {
      const label = p.menuLabel ?? `${p.label ?? 'Actions'} 옵션`;
      const main = mark(coreButton({...p, id: `${base}-main`}));
      const caret = withButtonAttrs(mark(coreButton({...p, id: `${base}-caret`, content: 'icon-only', icon: 'chevron-down', ariaLabel: label, state: p.state === 'loading' ? 'disabled' : p.state})), menuTriggerAttrs(menu));
      return `<span class="pf-menu" data-action-menu><span class="pf-split" role="group" aria-label="${escAttr(p.label ?? 'Actions')}">${main}${caret}</span>${renderMenuPanel({id: menu, label, items: p.items})}</span>`;
    }
    case 'component:menu-button': {
      const trigger = withButtonAttrs(mark(coreButton({...p, id: base, content: 'icon-end', icon: 'chevron-down'})), menuTriggerAttrs(menu));
      return `<span class="pf-menu" data-action-menu>${trigger}${renderMenuPanel({id: menu, label: p.label ?? 'Actions', items: p.items})}</span>`;
    }
    case 'component:floating-action-button': return mark(coreButton({...p, content: p.label && p.extended ? 'icon-start' : 'icon-only', ariaLabel: p.ariaLabel ?? p.label, appearance: p.appearance ?? 'elevated'}));
    case 'component:button-group': return `<span class="kit-action-group" role="group" aria-label="${escAttr(p.label ?? 'Actions')}">${listOf(p, [{label: p.label ?? 'Action'}]).map((item, i) => mark(coreButton({...itemProps(item), id: `${base}-${i}`, size: item.size ?? p.size, appearance: item.appearance ?? p.appearance}))).join('')}</span>`;
    case 'component:segmented-control': return `<span class="kit-action-segmented" role="group" aria-label="${escAttr(p.label ?? 'Options')}" data-action-segmented>${listOf(p, [{label: p.label ?? 'Option'}]).map((item, i, all) => mark(coreButton({...itemProps(item), id: `${base}-${i}`, size: item.size ?? p.size, behavior: 'toggle', state: item.state === 'disabled' ? 'disabled' : i === selectedIndex(all) ? 'pressed' : 'default'}))).join('')}</span>`;
    case 'component:copy-button': return withButtonAttrs(mark(coreButton({...p, icon: p.icon ?? 'copy', content: p.content ?? 'icon-start'})), `data-copy-text="${escAttr(p.text)}"${p.copiedLabel ? ` data-copied-label="${escAttr(p.copiedLabel)}"` : ''}`);
    case 'component:close-button': {
      const btn = withButtonAttrs(mark(coreButton({...p, label: '', content: 'icon-only', ariaLabel: p.ariaLabel ?? p.label ?? '닫기', icon: p.icon ?? 'x'})), 'data-action-dismiss');
      return p.message ? `<div class="pf-dismissible" data-dismissible><p>${escAttr(p.message)}</p>${btn}</div>` : btn;
    }
    case 'component:loading-action-button': return mark(coreButton({...p, content: p.content ?? 'icon-start', state: p.state === 'default' ? 'loading' : p.state ?? 'loading'}));
    default: throw new TypeError(`Unknown action component: ${id}`);
  }
}

export const ACTION_COMPONENTS = Object.freeze(ACTION_SPECS.map(([id, label, key, componentType, materialId, blueprint]) => {
  const classification = COMPONENT_CLASSIFICATION[key];
  if (!classification) throw new Error(`분류표에 없는 요구 항목: ${key}`);
  return Object.freeze({
    id, label, requirementId: `req:comp:${key}`, classification, componentType, materialId, blueprint, layer: LAYER_OF[classification],
    version: '1.0.0', render: props => renderByKind(id, props ?? {}),
  });
}));
/** 렌더러가 실제로 거부하는 조합(base-component:button-control 계약의 BTN_*). 키는 다른 계약과 같이 `why`다. */
const forbiddenOf = id => [
  ...(id === 'component:toggle-button' ? [{id: 'ACTION_TOGGLE_LOADING', when: {state: 'loading'}, why: 'pressed and busy are mutually exclusive (BTN_TOGGLE_LOADING)'}, {id: 'ACTION_TOGGLE_LINK', when: {appearance: 'link'}, why: 'a link look would show the pressed state by colour alone (BTN_TOGGLE_LINK)'}] : []),
  ...(id === 'component:icon-button' || id === 'component:floating-action-button' ? [{id: 'ACTION_ICON_LINK', when: {appearance: 'link'}, why: 'an icon-only link does not read as a button (BTN_LINK_ICON_ONLY)'}] : []),
  ...(id === 'component:link-button' ? [{id: 'ACTION_LINK_LOADING', when: {state: 'loading'}, why: 'a link look has no container for the spinner (BTN_LOADING_NO_SLOT)'}] : []),
];
const withSelected = id => id === 'component:toggle-button' || id === 'component:segmented-control';
const menuLike = id => id === 'component:split-button' || id === 'component:menu-button';
export const ALL_COMPONENT_CONTRACTS = Object.freeze([...COMPONENT_CONTRACTS, ...ACTION_COMPONENTS.map(item => defineComponentContract({
  id: item.id, componentType: item.componentType, layer: item.layer, purpose: item.label, contexts: ['any'], structure: item.classification,
  slots: item.classification === 'composite' ? ['primary', 'secondary'] : ['label', 'leadingIcon', 'trailingIcon'],
  props: {appearance: ['solid', 'outline', 'soft', 'ghost', 'link', 'elevated', 'destructive'], size: ['xs', 'sm', 'md', 'lg', 'xl'], state: ['default', 'disabled', 'loading', ...(withSelected(item.id) ? ['selected'] : [])],
    ...(menuLike(item.id) ? {items: 'array of {label, value?} (2~8)'} : {})},
  content: {label: {type: 'string', required: true}, icon: {type: 'icon-id', required: false}, ...(menuLike(item.id) ? {items: {type: 'array', required: true}} : {}), ...(item.id === 'component:copy-button' ? {text: {type: 'string', required: true}} : {})},
  appearance: ['solid', 'outline', 'soft', 'ghost', 'link', 'elevated', 'destructive'], sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
  states: ['default', 'hover', 'active', 'focus', 'disabled', 'loading', ...(withSelected(item.id) ? ['selected'] : [])],
  transitions: ['default→hover', 'hover→active', 'default→focus', 'default→disabled', 'default→loading'],
  events: ['click', 'focus', 'blur', ...(menuLike(item.id) ? ['kit-menu-select'] : []), ...(item.id === 'component:close-button' ? ['kit-dismiss'] : [])],
  tokens: ['--kit-action', '--kit-danger', '--kit-focus', '--kit-control-disabled-bg', '--kit-control-disabled-fg'],
  parents: ['slot:main', 'slot:header', 'slot:footer'], children: item.classification === 'composite' ? ['component:button'] : [],
  responsive: {strategy: 'wrap and constrain width', breakpoints: ['640px', '768px'], behavior: 'labels wrap; target remains at least 44px on touch screens'},
  accessibility: {role: item.id === 'component:segmented-control' ? 'group of toggle buttons (one pressed)' : menuLike(item.id) ? 'button with aria-haspopup=menu controlling a role=menu' : 'button', keyboard: menuLike(item.id) ? ['Tab', 'Enter', 'Space', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'] : ['Tab', 'Enter', 'Space'], requirements: ['icon-only requires accessible name', 'disabled and loading activation is blocked']},
  forbidden: forbiddenOf(item.id),
  examples: [{label: '저장', appearance: 'solid', size: 'md'}], usage: `${item.label} when ${item.label.toLowerCase()} is the intended action.`,
  renderer: {module: 'src/platform/families/contracts.mjs', export: 'renderActionComponent'},
  blueprint: {...item.blueprint, id: item.materialId}, tests: ['tests/platform-family-contract.test.mjs', 'tests/platform-action-blueprint.test.mjs'],
  unsupported: item.id === 'component:floating-action-button' ? {position: [{value: 'fixed', reason: '뷰포트 모서리 고정과 safe-area는 페이지 배치가 정한다. 컴포넌트는 흐름 안에 놓인다.'}]} : {},
})), ...COMMERCE_CONTRACTS, ...LAYOUT_COMPONENTS.map(item => defineComponentContract({
  id: item.id, componentType: item.componentType, layer: item.layer, purpose: item.label, contexts: ['any'], structure: item.classification,
  slots: item.id === 'component:resizable-panel' ? ['first', 'second'] : ['content'],
  props: item.id === 'component:resizable-panel' ? {direction: ['horizontal', 'vertical'], value: 'number (15~85)'} : {items: 'array'},
  content: {label: {type: 'string', required: false}},
  appearance: ['default'], sizes: ['md'], density: ['comfortable'], states: ['default'], transitions: [],
  events: item.id === 'component:resizable-panel' ? ['kit-panel-resize'] : [],
  tokens: ['--kit-surface', '--kit-text', '--kit-border', '--kit-focus', '--kit-radius'],
  parents: ['slot:main', 'slot:container'], children: [],
  responsive: {strategy: 'fluid', breakpoints: ['640px', '768px', '1024px'], behavior: 'fluid container and wrap'},
  accessibility: item.id === 'component:resizable-panel' ? {role: 'separator with aria-valuenow', keyboard: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'], requirements: ['aria-valuenow reflects panel size percentage', 'separator is focusable']} : {role: 'region', keyboard: [], requirements: []},
  forbidden: [], examples: [{label: item.label}], usage: `${item.label} for layout structure and composition.`,
  renderer: {module: 'src/platform/families/layout.mjs', export: 'renderLayoutComponent'},
  blueprint: {...item.blueprint, id: item.materialId},
  tests: ['tests/platform-layout-blueprint.test.mjs', 'tests/platform-layout-resizable.test.mjs'],
  unsupported: {},
}))]);
export const LAYOUT_COMPONENT_BY_ID = new Map(LAYOUT_COMPONENTS.map(item => [item.id, item]));
export const ACTION_COMPONENT_BY_ID = new Map(ACTION_COMPONENTS.map(item => [item.id, item]));
export function renderActionComponent(id, props = {}) {
  const item = ACTION_COMPONENT_BY_ID.get(id);
  if (!item) throw new TypeError(`Unknown action component: ${id}`);
  return item.render(props);
}

/** 독립 시연 CSS: 메뉴·분할·닫기 구조(ACTION_CSS)와 크기·외형 훅. 파괴적 색은 tone=danger 버튼이 이미 정하므로 따로 덮지 않는다(대비 검사는 button-control 계약이 한다). */
export const ACTION_COMPONENT_CSS = ACTION_CSS + `.kit-action-group,.kit-action-segmented{display:inline-flex;align-items:stretch;gap:0}.kit-action-group .kit-ctl-button,.kit-action-segmented .kit-ctl-button{min-height:44px}.kit-ctl-button[data-component-appearance="elevated"]{box-shadow:0 3px 9px color-mix(in srgb,var(--kit-text) 20%,transparent)}.kit-ctl-button[data-component-size="xs"]{min-height:28px}.kit-ctl-button[data-component-size="sm"]{min-height:36px}.kit-ctl-button[data-component-size="md"]{min-height:44px}.kit-ctl-button[data-component-size="lg"]{min-height:48px}.kit-ctl-button[data-component-size="xl"]{min-height:56px}.kit-action-segmented [aria-pressed="true"]{box-shadow:inset 0 0 0 2px currentColor}@media(max-width:640px){.kit-ctl-button[data-component-size]{min-height:44px}.kit-action-group,.kit-action-segmented,.pf-split{flex-wrap:wrap;max-width:100%}}.kit-ctl-button[data-component="component:floating-action-button"][data-component-size]{border-radius:999px;min-inline-size:56px;min-block-size:56px}`;
/** 독립 시연이 쓰는 런타임(메뉴 열기, 복사, 닫기, 단일 선택). 목적 패밀리가 쓰는 것과 같은 문자열이다. */
export const ACTION_COMPONENT_RUNTIME = ACTION_RUNTIME;
