import {defineContract, resolveProps, ContractError, sizeCSS, baseStyles, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {renderButton} from './button.mjs';

/** Tooltip: 외형(반전·표면)·모양·크기(글자와 안쪽 여백·최대 폭)·기능(트리거 종류·역할·배치·지연)·상태(숨김·표시)를 따로 둔다.
 *  WCAG 1.4.13: Escape로 닫히고(dismissible), 포인터를 말풍선 위로 옮겨도 유지되며(hoverable), 닫기 전까지 유지된다(persistent). */
export const tooltipContract = defineContract({
  id: 'component:tooltip', label: 'Tooltip',
  inputFields: ['id', 'triggerLabel', 'content', 'icon', 'triggerDisabled', 'href', 'actions', 'html', 'force'],
  axes: {
    appearance: ['inverse', 'surface'], shape: SHAPES, size: SIZES,
    trigger: ['text', 'icon'], purpose: ['description', 'name'], placement: ['top', 'bottom', 'start', 'end'], delay: ['none', 'short'],
    state: ['hidden', 'visible'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['trigger', 'purpose', 'placement', 'delay'], state: ['state']},
  defaults: {appearance: 'inverse', shape: 'soft', size: 'medium', trigger: 'text', purpose: 'description', placement: 'top', delay: 'short', state: 'hidden'},
  states: ['hidden', 'visible', 'hover', 'focus'],
  transitions: [
    {from: 'hidden', to: 'visible', trigger: 'trigger focus (immediate) | pointer enter (after delay)'}, {from: 'visible', to: 'hidden', trigger: 'Escape | blur | pointer leave after a short grace'},
    {from: 'visible', to: 'hover', trigger: 'pointer moves onto the tooltip (stays visible)'}, {from: 'hidden', to: 'focus', trigger: 'Tab to the trigger'},
  ],
  forbidden: [
    {id: 'TOOLTIP_NAME_TEXT_TRIGGER', when: {purpose: 'name', trigger: 'text'}, why: '글자가 있는 트리거는 이미 이름이 있다: 툴팁이 이름이 되는 것은 글자 없는 아이콘 트리거뿐이다'},
    {id: 'TOOLTIP_NAME_DELAY', when: {purpose: 'name', delay: 'short'}, why: '아이콘의 이름을 알려 주는 툴팁이 지연되면 마우스 사용자는 그동안 이름 없는 버튼을 본다'},
  ],
  unsupported: ['interactive content (links, buttons, forms)', 'rich HTML', 'tooltip on non-focusable or disabled elements', 'click-to-open popover (use a dialog or disclosure)'],
  pairs: [
    ['--kit-surface', '--kit-text', 7, 'inverse'], ['--kit-text', '--kit-surface', 7, 'surface'], ['--kit-focus', '--kit-surface', 3, 'trigger focus ring'],
  ],
});

/** 내용 계약: 툴팁은 짧은 일반 글만 담는다. 이 규칙들은 축이 아니라 내용에 대한 것이다. */
export const tooltipContentRules = Object.freeze([
  {id: 'TOOLTIP_INTERACTIVE', why: '툴팁은 포인터를 옮기면 사라지고 터치에서 열리지 않으므로 링크·버튼·입력 같은 상호작용 내용을 담을 수 없다'},
  {id: 'TOOLTIP_LENGTH', why: '툴팁은 한두 줄 보조 설명이다: 120자를 넘으면 문서나 대화상자에 둔다'},
  {id: 'TOOLTIP_PILL_LONG', why: 'pill 모양은 한 줄 라벨용이다: 24자를 넘으면 모서리가 글을 자른다'},
  {id: 'TOOLTIP_DISABLED_TRIGGER', why: '비활성 트리거는 포커스를 받지 못해 키보드 사용자에게 툴팁이 나오지 않는다'},
]);
export const TOOLTIP_MAX = Object.freeze({compact: 5, small: 6, medium: 7, large: 8});
export const TOOLTIP_DELAY_MS = 400;

export function renderTooltip(input) {
  const {id, triggerLabel, content, icon: iconName = 'help-circle', triggerDisabled = false, href, actions, html, force = ''} = input ?? {};
  const p = resolveProps(tooltipContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Tooltip requires a lowercase kebab-case id');
  if (typeof content !== 'string' || !content.trim()) throw new TypeError('Tooltip requires text content');
  if (href !== undefined || actions !== undefined || html !== undefined || /[<>]|\]\(/.test(content)) throw new ContractError(tooltipContract, [tooltipContentRules[0]]);
  if ([...content].length > 120) throw new ContractError(tooltipContract, [tooltipContentRules[1]]);
  if (p.shape === 'pill' && [...content].length > 24) throw new ContractError(tooltipContract, [tooltipContentRules[2]]);
  if (triggerDisabled) throw new ContractError(tooltipContract, [tooltipContentRules[3]]);
  if (!String(triggerLabel ?? '').trim()) throw new TypeError('Tooltip requires a triggerLabel');
  if (force && !['hover', 'focus'].includes(force)) throw new TypeError('Invalid force preview (trigger button)');
  const tip = `${id}-tip`, naming = p.purpose === 'name';
  const trigger = p.trigger === 'icon'
    ? renderButton({content: 'icon-only', icon: iconName, appearance: 'ghost', tone: 'neutral', size: 'medium', force, ...(naming ? {labelledBy: tip} : {ariaLabel: triggerLabel, describedBy: tip})})
    : renderButton({label: triggerLabel, appearance: 'outline', tone: 'neutral', size: 'medium', force, describedBy: tip});
  const visible = p.state === 'visible';
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  return `<span class="kit-ctl-tooltip" data-ctl="tooltip" id="${e(id)}" ${attrs}><span class="kit-ctl-tooltip-anchor">${trigger}<span role="tooltip" class="kit-ctl-tooltip-bubble" id="${tip}"${visible ? '' : ' hidden'}>${e(content)}</span></span></span>`;
}

/** 브라우저에서 붙는 동작. 열림은 포커스 즉시·호버는 지연 후이고, 닫힘은 Escape·포커스 이탈·포인터 이탈(짧은 유예 안에 말풍선으로 옮기면 유지)이다. 화면을 벗어나면 반대편으로 뒤집고 가로로 밀어 넣는다. */
export function attachTooltip(root, {delayMs = 400} = {}) {
  const doc = root.ownerDocument, view = doc.defaultView, trigger = root.querySelector('button'), bubble = root.querySelector('[role="tooltip"]');
  if (!trigger || !bubble) throw new TypeError('Tooltip root is incomplete');
  const home = root.dataset.placement, wait = root.dataset.delay === 'short' ? delayMs : 0, opposite = {top: 'bottom', bottom: 'top', start: 'end', end: 'start'};
  let showTimer = 0, hideTimer = 0;
  const fits = (side, r) => (side === 'top' ? r.top >= 0 : side === 'bottom' ? r.bottom <= view.innerHeight : side === 'start' ? r.left >= 0 : r.right <= view.innerWidth);
  const place = () => {
    root.style.setProperty('--tip-shift', '0px');
    const order = [home, opposite[home], 'top', 'bottom'].filter((side, i, all) => all.indexOf(side) === i);
    let chosen = home;
    for (const side of order) { root.dataset.placement = side; chosen = side; if (fits(side, bubble.getBoundingClientRect())) break; }
    const after = bubble.getBoundingClientRect(), w = view.innerWidth, pad = 8;
    if (chosen === 'top' || chosen === 'bottom') root.style.setProperty('--tip-shift', (after.left < pad ? pad - after.left : after.right > w - pad ? w - pad - after.right : 0) + 'px');
  };
  const reveal = () => { bubble.hidden = false; root.dataset.state = 'visible'; place(); };
  const hide = () => { view.clearTimeout(showTimer); view.clearTimeout(hideTimer); bubble.hidden = true; root.dataset.state = 'hidden'; };
  const show = immediate => { view.clearTimeout(hideTimer); view.clearTimeout(showTimer); if (immediate || !wait) reveal(); else showTimer = view.setTimeout(reveal, wait); };
  trigger.addEventListener('focus', () => show(true));
  root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(false); });
  root.addEventListener('pointerleave', () => { view.clearTimeout(showTimer); view.clearTimeout(hideTimer); hideTimer = view.setTimeout(hide, 150); });
  root.addEventListener('focusout', event => { if (!event.relatedTarget || !root.contains(event.relatedTarget)) hide(); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && !bubble.hidden) { event.stopPropagation(); hide(); } });
  if (!bubble.hidden) place();
  return {show: () => show(true), hide};
}
export const tooltipRuntime = attachTooltip.toString();

export const tooltipStyles = `${baseStyles}${sizeCSS('.kit-ctl-tooltip')}
.kit-ctl-tooltip{display:inline-block;font-size:var(--ctl-font)}
.kit-ctl-tooltip-anchor{position:relative;display:inline-flex}
.kit-ctl-tooltip-bubble{position:absolute;z-index:30;box-sizing:border-box;width:max-content;max-width:min(calc(var(--kit-control) * var(--t-max,7)),calc(100vw - 2 * var(--kit-sp-near)));padding:var(--ctl-gap) calc(var(--ctl-gap) * 2);border-radius:var(--kit-radius);font-size:var(--ctl-font);font-weight:500;line-height:1.4;text-align:start;word-break:keep-all;overflow-wrap:anywhere;pointer-events:auto}
.kit-ctl-tooltip[data-size=compact]{--t-max:${TOOLTIP_MAX.compact}}.kit-ctl-tooltip[data-size=small]{--t-max:${TOOLTIP_MAX.small}}.kit-ctl-tooltip[data-size=medium]{--t-max:${TOOLTIP_MAX.medium}}.kit-ctl-tooltip[data-size=large]{--t-max:${TOOLTIP_MAX.large}}
.kit-ctl-tooltip-bubble[hidden]{display:none}
.kit-ctl-tooltip[data-shape=square] .kit-ctl-tooltip-bubble{border-radius:0}.kit-ctl-tooltip[data-shape=pill] .kit-ctl-tooltip-bubble{border-radius:999px;white-space:nowrap}
.kit-ctl-tooltip[data-appearance=inverse] .kit-ctl-tooltip-bubble{background:var(--kit-text);color:var(--kit-surface)}
.kit-ctl-tooltip[data-appearance=surface] .kit-ctl-tooltip-bubble{background:var(--kit-surface);color:var(--kit-text);border:1px solid var(--kit-border);box-shadow:var(--kit-shadow-hover)}
.kit-ctl-tooltip-bubble::before{content:"";position:absolute}
.kit-ctl-tooltip[data-placement=top] .kit-ctl-tooltip-bubble{inset-block-end:calc(100% + var(--kit-sp-near));inset-inline-start:50%;transform:translateX(calc(-50% + var(--tip-shift,0px)))}
.kit-ctl-tooltip[data-placement=bottom] .kit-ctl-tooltip-bubble{inset-block-start:calc(100% + var(--kit-sp-near));inset-inline-start:50%;transform:translateX(calc(-50% + var(--tip-shift,0px)))}
.kit-ctl-tooltip[data-placement=start] .kit-ctl-tooltip-bubble{inset-inline-end:calc(100% + var(--kit-sp-near));inset-block-start:50%;transform:translateY(-50%)}
.kit-ctl-tooltip[data-placement=end] .kit-ctl-tooltip-bubble{inset-inline-start:calc(100% + var(--kit-sp-near));inset-block-start:50%;transform:translateY(-50%)}
.kit-ctl-tooltip[data-placement=top] .kit-ctl-tooltip-bubble::before{inset:100% 0 auto;height:var(--kit-sp-near)}.kit-ctl-tooltip[data-placement=bottom] .kit-ctl-tooltip-bubble::before{inset:auto 0 100%;height:var(--kit-sp-near)}
.kit-ctl-tooltip[data-placement=start] .kit-ctl-tooltip-bubble::before{inset:0 auto 0 100%;width:var(--kit-sp-near)}.kit-ctl-tooltip[data-placement=end] .kit-ctl-tooltip-bubble::before{inset:0 100% 0 auto;width:var(--kit-sp-near)}
@media(prefers-reduced-motion:no-preference){.kit-ctl-tooltip-bubble:not([hidden]){animation:kit-ctl-tip var(--kit-dur,150ms) ease-out}@keyframes kit-ctl-tip{from{opacity:0}}}`.replace(/\n/g, '');

export const tooltipExamples = Object.freeze([
  {id: 'ex-tip-text', triggerLabel: '저장 위치', content: '내 문서 폴더에 저장됩니다.'},
  {id: 'ex-tip-name', triggerLabel: '도움말', trigger: 'icon', purpose: 'name', delay: 'none', placement: 'bottom', appearance: 'surface', content: '도움말 열기'},
  {id: 'ex-tip-pill', triggerLabel: '단축키', shape: 'pill', placement: 'end', content: '⌘ + S'},
]);

export const tooltipMaterial = componentMaterial(tooltipContract, {
  category: 'interaction-state', module: 'src/materials/tooltip.mjs', renderExport: 'renderTooltip', key: 'tooltip', styles: tooltipStyles, examples: tooltipExamples.map(x => ({...x})),
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: '말풍선 폭은 min(컨트롤 높이 × 배수, 100vw − 여백)이다. 화면 밖으로 나가면 반대편으로 뒤집히고 가로로 밀려 들어온다.'},
  a11y: {rules: ['R05'], role: 'tooltip + aria-describedby (purpose=name uses aria-labelledby on an icon-only trigger)', keyboard: 'focus shows immediately, Escape dismisses, blur hides; the tooltip stays while the pointer is over it'},
  validation: {rules: ['R05'], codes: [...tooltipContentRules.map(r => r.id), ...tooltipContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:38'], ext: {group: 'feedback', required: ['id', 'triggerLabel', 'content']}, dependencies: ['component:button-control'],
  tags: ['forbidden:TOOLTIP_INTERACTIVE', 'forbidden:TOOLTIP_DISABLED_TRIGGER'],
});
