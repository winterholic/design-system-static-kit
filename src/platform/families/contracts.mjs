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

export const COMPONENT_LAYERS = Object.freeze(['Primitive', 'Base', 'Purpose', 'Composite', 'Page Section']);
export const COMPONENT_CONTRACT_FIELDS = Object.freeze([
  'id', 'version', 'layer', 'purpose', 'contexts', 'structure', 'slots', 'props', 'content',
  'appearance', 'sizes', 'density', 'states', 'transitions', 'events', 'tokens', 'parents', 'children',
  'responsive', 'accessibility', 'forbidden', 'examples', 'usage', 'renderer', 'blueprint', 'tests', 'unsupported',
]);

/** Style-only axis values do not create a second component type. */
export function countDistinctComponentTypes(components) {
  return new Set(components.map(item => item.componentType ?? item.id)).size;
}

export function defineComponentContract(spec) {
  return Object.freeze({version: '1.0.0', contexts: ['any'], structure: 'single root', slots: [], props: {},
    content: {label: {type: 'string', required: true}}, appearance: ['default'], sizes: ['md'], density: ['comfortable'],
    states: ['default'], transitions: [], events: [], tokens: [], parents: ['slot:main'], children: [],
    responsive: {strategy: 'fluid', breakpoints: ['sm', 'md', 'lg'], behavior: 'wrap without horizontal overflow'},
    accessibility: {role: 'semantic HTML', keyboard: ['Tab', 'Enter', 'Space'], requirements: []},
    forbidden: [], examples: [], usage: 'Use where the component purpose applies.',
    renderer: {module: 'src/platform/families/contracts.mjs', export: 'renderActionComponent'},
    blueprint: {field: 'materials.purposes', id: null}, tests: [], unsupported: {}, ...spec});
}

const normalizeBase = m => defineComponentContract({id: m.id, layer: 'Base', purpose: m.label,
  contexts: ['any'], structure: `base material ${m.id}`, slots: ['content'], props: {sourceContract: m.contract},
  content: {label: {type: 'string', required: false}}, appearance: ['default'], sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
  states: ['default', 'hover', 'focus', 'active', 'disabled'], tokens: [], parents: ['slot:main', 'slot:header', 'slot:footer'],
  children: [], renderer: m.render, blueprint: {field: 'components', id: m.id}, tests: ['tests/platform-family-base.test.mjs'],
  unsupported: {states: [{value: 'loading', reason: '상태 지원은 해당 기반 재료의 source contract에 한정한다.'}]} });
const normalizePurpose = f => defineComponentContract({id: f.id, layer: 'Purpose', purpose: f.purpose,
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
    for (const [axis, entries] of Object.entries(c.unsupported ?? {})) if (Array.isArray(entries)) entries.forEach((entry, n) => {
      if (!entry?.reason?.trim()) errors.push({path: `${root}.unsupported.${axis}[${n}].reason`, message: 'unsupported values need a reason'});
    });
    if (typeof c.renderer?.module !== 'string' || typeof c.renderer?.export !== 'string') errors.push({path: `${root}.renderer`, message: 'renderer module/export required'});
    if (typeof c.blueprint?.field !== 'string') errors.push({path: `${root}.blueprint`, message: 'blueprint connection required'});
  });
  return errors;
}

const SIZE_MAP = Object.freeze({xs: 'compact', sm: 'small', md: 'medium', lg: 'large', xl: 'large'});
const APPEARANCE_MAP = Object.freeze({solid: 'solid', outline: 'outline', soft: 'soft', ghost: 'ghost', link: 'link', elevated: 'solid', destructive: 'solid'});
const ACTION_SPECS = [
  ['component:button', 'Button', 'req:comp:a-01-button', 'independent', 'button-control'],
  ['component:icon-button', 'Icon Button', 'req:comp:a-02-icon-button', 'variant', 'button-control'],
  ['component:link-button', 'Link Button', 'req:comp:a-03-link-button', 'variant', 'button-control'],
  ['component:toggle-button', 'Toggle Button', 'req:comp:a-04-toggle-button', 'variant', 'button-control'],
  ['component:split-button', 'Split Button', 'req:comp:a-05-split-button', 'composite', 'split-button'],
  ['component:menu-button', 'Menu Button', 'req:comp:a-06-menu-button', 'composite', 'menu-button'],
  ['component:floating-action-button', 'Floating Action Button', 'req:comp:a-07-floating-action-button', 'variant', 'button-control'],
  ['component:button-group', 'Button Group', 'req:comp:a-08-button-group', 'composite', 'button-group'],
  ['component:segmented-control', 'Segmented Control', 'req:comp:a-09-segmented-control', 'variant', 'tabs-control'],
  ['component:copy-button', 'Copy Button', 'req:comp:a-10-copy-button', 'variant', 'button-control'],
  ['component:close-button', 'Close Button', 'req:comp:a-11-close-button', 'variant', 'button-control'],
  ['component:loading-action-button', 'Loading Action Button', 'req:comp:a-12-loading-action-button', 'variant', 'button-control'],
];
const escAttr = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const coreButton = (p, extra = '') => renderButton({label: p.label ?? 'Action', id: p.id, ariaLabel: p.ariaLabel,
  icon: p.icon ?? 'plus', content: p.content ?? 'text', appearance: APPEARANCE_MAP[p.appearance] ?? 'solid',
  size: SIZE_MAP[p.size] ?? 'medium', state: p.state === 'selected' ? 'pressed' : p.state ?? 'default',
  behavior: p.behavior ?? 'action', tone: p.appearance === 'destructive' ? 'danger' : p.tone ?? 'action', ...extra});
function renderByKind(id, p) {
  const data = html => html.replace('<button ', `<button data-component="${id}" data-component-size="${p.size ?? 'md'}" data-component-appearance="${p.appearance ?? 'solid'}" `);
  switch (id) {
    case 'component:button': return data(coreButton(p));
    case 'component:icon-button': return data(coreButton({...p, content: 'icon-only', ariaLabel: p.ariaLabel ?? p.label}));
    case 'component:link-button': return data(coreButton({...p, appearance: 'link'}));
    case 'component:toggle-button': return data(coreButton({...p, behavior: 'toggle', state: p.selected ? 'pressed' : p.state ?? 'default'}));
    case 'component:split-button': return `<span class="kit-action-split" role="group" aria-label="${escAttr(p.label ?? 'Actions')}">${data(coreButton({...p, id: p.id ? `${p.id}-main` : undefined}))}<button type="button" class="kit-ctl-button" data-component="${id}" data-component-size="${p.size ?? 'md'}" data-component-appearance="${p.appearance ?? 'solid'}" aria-label="More actions" aria-haspopup="menu" aria-expanded="false">▾</button></span>`;
    case 'component:menu-button': return `<button type="button" class="kit-ctl-button" data-component="${id}" data-component-size="${p.size ?? 'md'}" data-component-appearance="${p.appearance ?? 'solid'}" aria-haspopup="menu" aria-expanded="false">${escAttr(p.label ?? 'Actions')}</button>`;
    case 'component:floating-action-button': return data(coreButton({...p, content: 'icon-only', ariaLabel: p.ariaLabel ?? p.label, appearance: p.appearance ?? 'elevated'}));
    case 'component:button-group': return `<span class="kit-action-group" role="group" aria-label="${escAttr(p.label ?? 'Actions')}">${(p.items ?? [{label: p.label ?? 'Action'}]).map(item => data(coreButton(item))).join('')}</span>`;
    case 'component:segmented-control': return `<span class="kit-action-segmented" role="group" aria-label="${escAttr(p.label ?? 'Options')}">${(p.items ?? [{label: p.label ?? 'Option'}]).map((item, i) => data(coreButton({...item, behavior: 'toggle', state: item.selected || (!p.items && i === 0) ? 'pressed' : 'default'}))).join('')}</span>`;
    case 'component:copy-button': return data(coreButton({...p, icon: p.icon ?? 'copy', 'data-copy-text': p.text ?? p.label ?? ''})).replace('<button ', `<button data-copy-text="${escAttr(p.text ?? p.label ?? '')}" `);
    case 'component:close-button': return data(coreButton({...p, label: '', content: 'icon-only', ariaLabel: p.ariaLabel ?? p.label ?? 'Close', icon: p.icon ?? 'x'}));
    case 'component:loading-action-button': return data(coreButton({...p, content: p.content ?? 'icon-start', state: p.state === 'default' ? 'loading' : p.state ?? 'loading'}));
    default: throw new TypeError(`Unknown action component: ${id}`);
  }
}

export const ACTION_COMPONENTS = Object.freeze(ACTION_SPECS.map(([id, label, requirementId, classification, componentType]) => Object.freeze({
  id, label, requirementId, classification, componentType, layer: classification === 'composite' ? 'Composite' : classification === 'independent' ? 'Base' : 'Purpose',
  version: '1.0.0', render: props => renderByKind(id, props ?? {}),
})));
export const ALL_COMPONENT_CONTRACTS = Object.freeze([...COMPONENT_CONTRACTS, ...ACTION_COMPONENTS.map(item => defineComponentContract({
  id: item.id, layer: item.layer, purpose: item.label, contexts: ['any'], structure: item.classification,
  slots: item.classification === 'composite' ? ['primary', 'secondary'] : ['label', 'leadingIcon', 'trailingIcon'],
  props: {appearance: ['solid', 'outline', 'soft', 'ghost', 'link', 'elevated', 'destructive'], size: ['xs', 'sm', 'md', 'lg', 'xl'], state: ['default', 'hover', 'active', 'focus', 'disabled', 'loading', ...(item.id === 'component:toggle-button' || item.id === 'component:segmented-control' ? ['selected'] : [])]},
  content: {label: {type: 'string', required: true}, icon: {type: 'icon-id', required: false}},
  appearance: ['solid', 'outline', 'soft', 'ghost', 'link', 'elevated', 'destructive'], sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
  states: ['default', 'hover', 'active', 'focus', 'disabled', 'loading', ...(item.id === 'component:toggle-button' || item.id === 'component:segmented-control' ? ['selected'] : [])],
  transitions: ['default→hover', 'hover→active', 'default→focus', 'default→disabled', 'default→loading'],
  events: ['click', 'focus', 'blur'], tokens: ['--kit-action', '--kit-danger', '--kit-focus', '--kit-control-disabled-bg', '--kit-control-disabled-fg'],
  parents: ['slot:main', 'slot:header', 'slot:footer'], children: item.classification === 'composite' ? ['component:button'] : [],
  responsive: {strategy: 'wrap and constrain width', breakpoints: ['640px', '768px'], behavior: 'labels wrap; target remains at least 44px on touch screens'},
  accessibility: {role: item.id === 'component:segmented-control' ? 'group of toggle buttons' : 'button', keyboard: ['Tab', 'Enter', 'Space'], requirements: ['icon-only requires accessible name', 'disabled and loading activation is blocked']},
  forbidden: item.id === 'component:toggle-button' ? [{id: 'ACTION_TOGGLE_LOADING', when: {state: 'loading'}, reason: 'pressed and busy are mutually exclusive'}] : [],
  examples: [{label: '저장', appearance: 'solid', size: 'md'}], usage: `${item.label} when ${item.label.toLowerCase()} is the intended action.`,
  renderer: {module: 'src/platform/families/contracts.mjs', export: 'renderActionComponent'},
  blueprint: {field: 'materials.actions', id: item.id}, tests: ['tests/platform-family-contract.test.mjs'], unsupported: {},
}))]);
export const ACTION_COMPONENT_BY_ID = new Map(ACTION_COMPONENTS.map(item => [item.id, item]));
export function renderActionComponent(id, props = {}) {
  const item = ACTION_COMPONENT_BY_ID.get(id);
  if (!item) throw new TypeError(`Unknown action component: ${id}`);
  return item.render(props);
}

export const ACTION_COMPONENT_CSS = `.kit-action-split,.kit-action-group,.kit-action-segmented{display:inline-flex;align-items:stretch;gap:0}.kit-action-split .kit-ctl-button,.kit-action-group .kit-ctl-button,.kit-action-segmented .kit-ctl-button{min-height:44px}.kit-ctl-button[data-component-appearance="elevated"]{box-shadow:0 3px 9px color-mix(in srgb,var(--kit-text) 20%,transparent)}.kit-ctl-button[data-component-appearance="destructive"]{background:var(--kit-danger);color:var(--kit-on-danger,#fff)}.kit-ctl-button[data-component-size="xs"]{min-height:28px}.kit-ctl-button[data-component-size="sm"]{min-height:36px}.kit-ctl-button[data-component-size="md"]{min-height:44px}.kit-ctl-button[data-component-size="lg"]{min-height:48px}.kit-ctl-button[data-component-size="xl"]{min-height:56px}.kit-action-segmented [aria-pressed="true"]{box-shadow:inset 0 0 0 2px currentColor}@media(max-width:640px){.kit-ctl-button[data-component-size]{min-height:44px}.kit-action-split,.kit-action-group,.kit-action-segmented{flex-wrap:wrap;max-width:100%}}`;
