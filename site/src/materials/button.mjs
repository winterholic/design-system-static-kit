import {defineContract, resolveProps, violations, sizeCSS, baseStyles, focusRing, hover, active, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {icon} from '../render/icon.mjs';

/** Button: 외형(컨테이너 처리)·모양(모서리)·크기·기능(동작과 내용 배치)·상태·맥락(의도)을 따로 둔다. */
export const buttonContract = defineContract({
  id: 'component:button-control', label: 'Button',
  inputFields: ['label', 'id', 'icon', 'ariaLabel', 'force', 'describedBy', 'labelledBy'],
  axes: {
    appearance: ['solid', 'outline', 'soft', 'ghost', 'link'], shape: SHAPES, size: SIZES,
    behavior: ['action', 'toggle'], content: ['text', 'icon-start', 'icon-end', 'icon-only'],
    tone: ['action', 'neutral', 'danger'], state: ['default', 'pressed', 'loading', 'disabled'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['behavior', 'content'], state: ['state'], context: ['tone']},
  defaults: {appearance: 'solid', shape: 'soft', size: 'medium', behavior: 'action', content: 'text', tone: 'action', state: 'default'},
  states: ['default', 'hover', 'focus', 'active', 'pressed', 'loading', 'disabled'],
  transitions: [
    {from: 'default', to: 'hover', trigger: 'pointer enter'}, {from: 'hover', to: 'active', trigger: 'pointer down | Space/Enter down'},
    {from: 'default', to: 'focus', trigger: 'Tab (focus-visible)'}, {from: 'default', to: 'pressed', trigger: 'click on toggle'},
    {from: 'pressed', to: 'default', trigger: 'click on toggle'}, {from: 'default', to: 'loading', trigger: 'setLoading(true)'},
    {from: 'loading', to: 'default', trigger: 'setLoading(false)'}, {from: 'default', to: 'disabled', trigger: 'setDisabled(true)'},
  ],
  forbidden: [
    {id: 'BTN_LOADING_NO_SLOT', when: {appearance: ['ghost', 'link'], content: 'text', state: 'loading'}, why: 'ghost·link에는 스피너를 받을 컨테이너가 없어, 바꿔 넣을 아이콘이 없으면 글자 줄이 밀린다'},
    {id: 'BTN_LINK_ICON_ONLY', when: {appearance: 'link', content: 'icon-only'}, why: 'link는 글줄 안에서 읽히는 모양이라 글자 없는 아이콘만으로는 버튼으로 보이지 않는다'},
    {id: 'BTN_LINK_SHAPE', when: {appearance: 'link', shape: ['square', 'pill']}, why: 'link에는 컨테이너가 없어 모서리 모양이 보이지 않으므로 같은 그림이 중복된다'},
    {id: 'BTN_PRESSED_ACTION', when: {behavior: 'action', state: 'pressed'}, why: 'pressed는 toggle만 가진다: 한 번 누르고 끝나는 버튼에는 눌림 상태가 없다'},
    {id: 'BTN_TOGGLE_LOADING', when: {behavior: 'toggle', state: 'loading'}, why: 'toggle의 aria-pressed와 aria-busy가 동시에 의미를 가져 현재 값을 읽을 수 없다'},
    {id: 'BTN_TOGGLE_LINK', when: {behavior: 'toggle', appearance: 'link'}, why: 'link는 눌림을 색으로만 구분하게 되어 상태를 색만으로 전달한다'},
    {id: 'BTN_DISABLED_TONE', when: {state: 'disabled', tone: ['neutral', 'danger']}, why: 'disabled는 의도 색을 지우므로 tone마다 같은 그림이 중복된다: action 하나만 둔다'},
    {id: 'BTN_DANGER_LINK', when: {tone: 'danger', appearance: 'link'}, why: '되돌리기 어려운 동작은 컨테이너 없는 글줄 링크처럼 보이면 안 된다'},
  ],
  unsupported: ['split button', 'button group', 'anchor navigation (use link nodes)'],
  pairs: [
    ['--kit-onAction', '--kit-action', 4.5, 'solid action'], ['--kit-onActionHover', '--kit-action-hover', 4.5, 'solid action hover'], ['--kit-surface', '--kit-text', 4.5, 'solid neutral'],
    ['--kit-surface', '--kit-muted', 4.5, 'solid neutral hover'], ['--kit-surface', '--kit-danger', 4.5, 'solid danger'], ['--kit-link', '--kit-surface', 4.5, 'outline·ghost·link action'],
    ['--kit-danger', '--kit-surface', 4.5, 'outline·ghost danger'], ['--kit-text', '--kit-surface', 4.5, 'outline·ghost neutral'], ['--kit-link', '--kit-soft', 4.5, 'soft action'],
    ['--kit-danger', '--kit-danger-soft', 4.5, 'soft danger'], ['--kit-text', '--kit-card-active', 4.5, 'soft neutral'], ['--kit-control-disabled-fg', '--kit-control-disabled-bg', 3, 'disabled'], ['--kit-focus', '--kit-surface', 3, 'focus ring'],
  ],
});

export function renderButton(input) {
  const {label = '', id = '', icon: iconName = 'arrow-right', ariaLabel = '', force = '', describedBy = '', labelledBy = ''} = input ?? {};
  const p = resolveProps(buttonContract, input);
  if (id && !SAFE_ID.test(id)) throw new TypeError('Button id must be lowercase kebab-case');
  if (p.content === 'icon-only' ? !String(ariaLabel || labelledBy).trim() : !String(label).trim()) throw new TypeError(p.content === 'icon-only' ? 'BTN_ICON_NAME: an icon-only button needs ariaLabel or labelledBy' : 'Button requires a label');
  for (const v of [describedBy, labelledBy]) if (v && !SAFE_ID.test(v)) throw new TypeError('Button aria references must be ids');
  if (force && !['hover', 'focus', 'active'].includes(force)) throw new TypeError('Invalid force preview');
  const spinner = '<span class="kit-ctl-spinner" aria-hidden="true"></span>';
  const mark = icon(iconName), start = p.content === 'icon-start' || p.content === 'icon-only', end = p.content === 'icon-end';
  const slot = (where, hasIcon) => `<span class="kit-ctl-slot" data-slot="${where}"${hasIcon ? '' : ' data-spinner-only'}>${hasIcon ? mark : ''}${spinner}</span>`;
  const loadingAllowed = !violations(buttonContract, {...p, state: 'loading'}).length;
  const attrs = [`class="kit-ctl-button"`, id && `id="${e(id)}"`, 'type="button"', ...Object.entries(p).map(([k, v]) => `data-${k}="${v}"`), `data-loading-allowed="${loadingAllowed}"`,
    force && `data-force="${force}"`, p.behavior === 'toggle' && `aria-pressed="${p.state === 'pressed'}"`, p.state === 'loading' && 'aria-busy="true" aria-disabled="true"',
    p.state === 'disabled' && 'disabled', p.content === 'icon-only' && ariaLabel && `aria-label="${e(ariaLabel)}"`, describedBy && `aria-describedby="${describedBy}"`, labelledBy && `aria-labelledby="${labelledBy}"`].filter(Boolean).join(' ');
  const inner = p.content === 'icon-only' ? slot('start', true) : `${p.content === 'text' ? slot('start', false) : start ? slot('start', true) : ''}<span class="kit-ctl-label">${e(label)}</span>${end ? slot('end', true) : ''}`;
  return `<span class="kit-ctl-button-host" data-ctl="button" data-state="${p.state}"><button ${attrs}>${inner}</button><span class="kit-ctl-sr" role="status" aria-live="polite">${p.state === 'loading' ? '처리 중입니다.' : ''}</span></span>`;
}

/** 브라우저에서 붙는 동작. loading은 disabled가 아니라 aria-disabled라 포커스를 유지하고 클릭만 막는다. */
export function attachButton(root, {onPress} = {}) {
  const button = root.querySelector('button'), live = root.querySelector('[role="status"]');
  if (!button) throw new TypeError('Button root is incomplete');
  const refresh = () => {
    const state = button.disabled ? 'disabled' : button.getAttribute('aria-busy') === 'true' ? 'loading' : button.getAttribute('aria-pressed') === 'true' ? 'pressed' : 'default';
    root.dataset.state = state; button.dataset.state = state;
  };
  const setLoading = on => {
    if (on && button.dataset.loadingAllowed === 'false') throw new RangeError('BTN_LOADING_NO_SLOT: this appearance has no icon slot for a spinner');
    if (button.disabled) return;
    button.setAttribute('aria-busy', String(on));
    if (on) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled');
    if (live) live.textContent = on ? '처리 중입니다.' : '';
    refresh();
  };
  const setDisabled = on => { button.disabled = on; if (on) { button.removeAttribute('aria-busy'); button.removeAttribute('aria-disabled'); if (live) live.textContent = ''; } refresh(); };
  const setPressed = on => { if (button.dataset.behavior !== 'toggle') throw new RangeError('BTN_PRESSED_ACTION: only a toggle has a pressed state'); button.setAttribute('aria-pressed', String(on)); refresh(); };
  button.addEventListener('click', event => {
    if (button.getAttribute('aria-disabled') === 'true') { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (button.dataset.behavior === 'toggle') setPressed(button.getAttribute('aria-pressed') !== 'true');
    if (typeof onPress === 'function') onPress({id: button.id, pressed: button.getAttribute('aria-pressed') === 'true'});
  });
  return {setLoading, setDisabled, setPressed};
}
export const buttonRuntime = "function attachButton(root, {onPress} = {}) {\n  const button = root.querySelector('button'), live = root.querySelector('[role=\"status\"]');\n  if (!button) throw new TypeError('Button root is incomplete');\n  const refresh = () => {\n    const state = button.disabled ? 'disabled' : button.getAttribute('aria-busy') === 'true' ? 'loading' : button.getAttribute('aria-pressed') === 'true' ? 'pressed' : 'default';\n    root.dataset.state = state; button.dataset.state = state;\n  };\n  const setLoading = on => {\n    if (on && button.dataset.loadingAllowed === 'false') throw new RangeError('BTN_LOADING_NO_SLOT: this appearance has no icon slot for a spinner');\n    if (button.disabled) return;\n    button.setAttribute('aria-busy', String(on));\n    if (on) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled');\n    if (live) live.textContent = on ? '처리 중입니다.' : '';\n    refresh();\n  };\n  const setDisabled = on => { button.disabled = on; if (on) { button.removeAttribute('aria-busy'); button.removeAttribute('aria-disabled'); if (live) live.textContent = ''; } refresh(); };\n  const setPressed = on => { if (button.dataset.behavior !== 'toggle') throw new RangeError('BTN_PRESSED_ACTION: only a toggle has a pressed state'); button.setAttribute('aria-pressed', String(on)); refresh(); };\n  button.addEventListener('click', event => {\n    if (button.getAttribute('aria-disabled') === 'true') { event.preventDefault(); event.stopImmediatePropagation(); return; }\n    if (button.dataset.behavior === 'toggle') setPressed(button.getAttribute('aria-pressed') !== 'true');\n    if (typeof onPress === 'function') onPress({id: button.id, pressed: button.getAttribute('aria-pressed') === 'true'});\n  });\n  return {setLoading, setDisabled, setPressed};\n}";

const solid = `.kit-ctl-button[data-appearance=solid]{background:var(--b-solid-bg);color:var(--b-solid-fg);border-color:var(--b-solid-bg)}`;
export const buttonStyles = `${baseStyles}${sizeCSS('.kit-ctl-button')}
.kit-ctl-button-host{display:inline-flex;position:relative;max-width:100%}
.kit-ctl-button[data-tone=action]{--b-solid-bg:var(--kit-action);--b-solid-fg:var(--kit-onAction);--b-solid-hover:var(--kit-action-hover);--b-solid-hover-fg:var(--kit-onActionHover);--b-ink:var(--kit-link);--b-edge:var(--kit-action);--b-tint:var(--kit-soft)}
.kit-ctl-button[data-tone=neutral]{--b-solid-bg:var(--kit-text);--b-solid-fg:var(--kit-surface);--b-solid-hover:var(--kit-muted);--b-solid-hover-fg:var(--kit-surface);--b-ink:var(--kit-text);--b-edge:var(--kit-control-border);--b-tint:var(--kit-card-active)}
.kit-ctl-button[data-tone=danger]{--b-solid-bg:var(--kit-danger);--b-solid-fg:var(--kit-surface);--b-solid-hover:var(--kit-danger);--b-solid-hover-fg:var(--kit-surface);--b-ink:var(--kit-danger);--b-edge:var(--kit-danger);--b-tint:var(--kit-danger-soft)}
.kit-ctl-button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:var(--ctl-h);padding-inline:var(--ctl-px);gap:var(--ctl-gap);max-width:100%;border:1px solid transparent;border-radius:var(--kit-radius);background:transparent;color:var(--b-ink);font:inherit;font-size:var(--ctl-font);font-weight:var(--kit-bw,600);line-height:1.2;word-break:keep-all;cursor:pointer;text-align:center;transition:box-shadow var(--kit-dur,150ms),transform var(--kit-dur,150ms),background-color var(--kit-dur,150ms)}
.kit-ctl-button[data-shape=square]{border-radius:0}.kit-ctl-button[data-shape=pill]{border-radius:999px}
.kit-ctl-button .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon);flex:none}
.kit-ctl-slot{display:inline-flex;align-items:center;flex:none}.kit-ctl-slot .kit-ctl-spinner,.kit-ctl-button[data-state=loading] .kit-ctl-slot .kit-icon{display:none}.kit-ctl-button[data-state=loading] .kit-ctl-slot .kit-ctl-spinner{display:inline-block}.kit-ctl-slot[data-spinner-only]{display:none}.kit-ctl-button[data-state=loading] .kit-ctl-slot[data-spinner-only]{display:inline-flex}
.kit-ctl-button[data-content=icon-only]{width:var(--ctl-h);padding-inline:0}
${solid}
.kit-ctl-button[data-appearance=outline]{border-color:var(--b-edge)}
.kit-ctl-button[data-appearance=soft]{background:var(--b-tint)}
.kit-ctl-button[data-appearance=link]{min-height:0;padding:0;border-radius:var(--kit-radius);text-decoration:underline;text-underline-offset:.2em}
.kit-ctl-button[data-appearance=link][data-content=icon-start],.kit-ctl-button[data-appearance=link][data-content=icon-end]{width:auto}
.kit-ctl-button${hover}:not(:disabled):not([aria-disabled=true]){transform:translateY(var(--kit-lift,0px))}
.kit-ctl-button[data-appearance=solid]${hover}:not(:disabled):not([aria-disabled=true]){background:var(--b-solid-hover);color:var(--b-solid-hover-fg);box-shadow:inset 0 0 0 2px var(--kit-surface)}
.kit-ctl-button:not([data-appearance=solid])${hover}:not(:disabled):not([aria-disabled=true]){box-shadow:inset 0 0 0 1px currentColor}
.kit-ctl-button[data-appearance=outline]${hover}:not(:disabled):not([aria-disabled=true]){border-color:var(--kit-control-hover-border)}
.kit-ctl-button${active}:not(:disabled):not([aria-disabled=true]){transform:translateY(1px)}
.kit-ctl-button[data-appearance=solid]${active}:not(:disabled):not([aria-disabled=true]){background:var(--kit-action-active);box-shadow:inset 0 0 0 3px var(--kit-surface)}
.kit-ctl-button[data-appearance=solid][data-tone=neutral]${active},.kit-ctl-button[data-appearance=solid][data-tone=danger]${active}{background:var(--b-solid-bg)}
.kit-ctl-button:not([data-appearance=solid])${active}:not(:disabled):not([aria-disabled=true]){background:var(--b-tint);box-shadow:inset 0 0 0 2px currentColor}
.kit-ctl-button[aria-pressed=true]{box-shadow:inset 0 0 0 2px currentColor}.kit-ctl-button[aria-pressed=true]:not([data-appearance=solid]){background:var(--b-tint)}.kit-ctl-button[aria-pressed=true][data-appearance=solid]{box-shadow:inset 0 0 0 3px var(--kit-surface)}
${focusRing('.kit-ctl-button')}
.kit-ctl-button[aria-disabled=true]{cursor:progress}
.kit-ctl-button:disabled{background:var(--kit-control-disabled-bg);color:var(--kit-control-disabled-fg);border-color:var(--kit-control-disabled-bg);box-shadow:none;cursor:not-allowed}
.kit-ctl-button[data-appearance=ghost]:disabled,.kit-ctl-button[data-appearance=link]:disabled{background:transparent;border-color:transparent}
.kit-ctl-button[data-appearance=outline]:disabled{background:transparent;border-color:var(--kit-control-disabled-fg)}
@media(max-width:640px){.kit-ctl-button{max-width:100%}}`.replace(/\n/g, '');

export const buttonExamples = Object.freeze([
  {label: '저장'}, {label: '취소', appearance: 'outline', tone: 'neutral'}, {label: '삭제', appearance: 'soft', tone: 'danger'},
  {label: '더 보기', appearance: 'ghost', content: 'icon-end', icon: 'chevron-right'}, {label: '자세히', appearance: 'link', content: 'icon-end', icon: 'arrow-right'},
  {label: '즐겨찾기', behavior: 'toggle', appearance: 'outline', content: 'icon-start', icon: 'star'}, {ariaLabel: '검색', content: 'icon-only', icon: 'search', appearance: 'soft', tone: 'neutral'},
]);

export const buttonMaterial = componentMaterial(buttonContract, {
  module: 'src/materials/button.mjs', renderExport: 'renderButton', key: 'button-control', styles: buttonStyles, examples: buttonExamples.map(x => ({...x})),
  responsive: {strategy: 'fluid', note: '글자는 줄바꿈하지 않고 max-width:100% 안에서 줄어든다. 크기별 높이는 밀도 토큰에서 나온다.'},
  a11y: {rules: ['R05', 'R16'], role: 'button (aria-pressed for toggle, aria-busy + aria-disabled while loading)', keyboard: 'Enter/Space activate; loading keeps focus and ignores activation'},
  validation: {rules: ['R05'], codes: ['BTN_LOADING_NO_SLOT', 'BTN_ICON_NAME', ...buttonContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:14'], ext: {group: 'form', required: ['label']},
});
