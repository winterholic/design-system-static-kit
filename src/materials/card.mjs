import {defineContract, resolveProps, sizeCSS, baseStyles, focusRing, hover, active, componentMaterial, e, SIZES, SAFE_ID} from './control-kit.mjs';
import {renderButton} from './button.mjs';
import {icon} from '../render/icon.mjs';

/** Card: 외형(표면 처리)·모양·크기(안쪽 여백과 글자)·기능(전체가 누를 수 있는가, 미디어, 하단 동작)·상태를 따로 둔다. */
export const cardContract = defineContract({
  id: 'component:card-surface', label: 'Card',
  inputFields: ['id', 'title', 'body', 'meta', 'href', 'mediaIcon', 'actions', 'message', 'force'],
  axes: {
    appearance: ['outline', 'filled', 'elevated', 'flat'], shape: ['square', 'soft', 'round'], size: SIZES,
    behavior: ['static', 'link', 'selectable'], media: ['none', 'top', 'start'], footer: ['none', 'actions'],
    state: ['default', 'selected', 'loading', 'error', 'disabled'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['behavior', 'media', 'footer'], state: ['state']},
  defaults: {appearance: 'outline', shape: 'soft', size: 'medium', behavior: 'static', media: 'none', footer: 'none', state: 'default'},
  states: ['default', 'hover', 'focus', 'active', 'selected', 'loading', 'error', 'disabled'],
  transitions: [
    {from: 'default', to: 'hover', trigger: 'pointer enter (link, selectable)'}, {from: 'default', to: 'focus', trigger: 'Tab to the card hit target'},
    {from: 'hover', to: 'active', trigger: 'pointer down'}, {from: 'default', to: 'selected', trigger: 'click | Space/Enter on selectable'}, {from: 'selected', to: 'default', trigger: 'click | Space/Enter on selectable'},
  ],
  forbidden: [
    {id: 'CARD_SELECTED_NOT_SELECTABLE', when: {state: 'selected', behavior: ['static', 'link']}, why: 'selected는 selectable 카드만 가진다: 눌러도 바뀌지 않는 카드가 선택된 모양이면 안 된다'},
    {id: 'CARD_FLAT_SELECTABLE', when: {appearance: 'flat', behavior: 'selectable'}, why: 'flat에는 표면이 없어 선택 테두리가 허공에 떠 보인다'},
    {id: 'CARD_FLAT_SHAPE', when: {appearance: 'flat', shape: ['square', 'round']}, why: 'flat에는 표면이 없어 모서리 모양이 보이지 않으므로 기본 모양 하나만 둔다'},
    {id: 'CARD_NESTED_INTERACTIVE', when: {behavior: ['link', 'selectable'], footer: 'actions'}, why: '카드 전체가 링크·버튼인데 안에 또 버튼을 두면 중첩 인터랙티브가 되어 키보드와 스크린 리더가 어느 쪽인지 가를 수 없다'},
    {id: 'CARD_INERT_ACTIONS', when: {state: ['loading', 'disabled'], footer: 'actions'}, why: '로딩·비활성 카드의 하단 동작은 누를 수 없는데 보이기만 한다'},
    {id: 'CARD_DISABLED_STATIC', when: {state: 'disabled', behavior: 'static'}, why: '누를 수 없는 카드에는 끌 동작이 없다: 비활성은 link·selectable에서만 뜻이 있다'},
    {id: 'CARD_START_COMPACT', when: {media: 'start', size: 'compact'}, why: 'compact의 안쪽 여백에서는 가로 미디어 칸과 글 칸이 나란히 서지 못한다'},
  ],
  unsupported: ['drag handle', 'expandable body', 'image media (icon tile only)'],
  pairs: [
    ['--kit-text', '--kit-surface', 7, 'title'], ['--kit-muted', '--kit-surface', 4.5, 'body'], ['--kit-muted', '--kit-card-hover', 4.5, 'body hover'], ['--kit-muted', '--kit-card-active', 4.5, 'body active/filled'],
    ['--kit-danger', '--kit-danger-soft', 4.5, 'error message'], ['--kit-link', '--kit-surface', 4.5, 'link title'], ['--kit-action', '--kit-surface', 3, 'selected ring'], ['--kit-focus', '--kit-surface', 3, 'focus ring'],
    ['--kit-control-disabled-fg', '--kit-control-disabled-bg', 3, 'disabled'],
  ],
});

export function renderCard(input) {
  const {id, title, body = '', meta = '', href = '#', mediaIcon = 'sparkles', actions = [], message = '', force = ''} = input ?? {};
  const p = resolveProps(cardContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Card requires a lowercase kebab-case id');
  if (!String(title ?? '').trim()) throw new TypeError('Card requires a title');
  if (p.state === 'error' && !String(message).trim()) throw new TypeError('CARD_ERROR_MESSAGE: error state needs a message');
  if (p.footer === 'actions' && !(Array.isArray(actions) && actions.length >= 1 && actions.length <= 2)) throw new TypeError('CARD_ACTIONS: footer actions need one or two actions');
  if (p.footer === 'none' && actions.length) throw new TypeError('CARD_ACTIONS: actions need footer=actions');
  if (force && !['hover', 'focus', 'active'].includes(force)) throw new TypeError('Invalid force preview');
  const inert = p.state === 'loading' || p.state === 'disabled';
  const label = e(title);
  const hit = p.behavior === 'link' ? (inert ? `<span class="kit-ctl-card-hit" role="link" aria-disabled="true">${label}</span>` : `<a class="kit-ctl-card-hit" href="${e(href)}">${label}</a>`)
    : p.behavior === 'selectable' ? `<button type="button" class="kit-ctl-card-hit" aria-pressed="${p.state === 'selected'}"${inert ? ' aria-disabled="true" disabled' : ''}>${label}</button>` : label;
  const skeleton = '<span class="kit-ctl-skel" aria-hidden="true"></span><span class="kit-ctl-skel" data-short aria-hidden="true"></span>';
  const text = p.state === 'loading' ? `${skeleton}<span class="kit-ctl-sr" role="status">불러오는 중입니다.</span>` : `${meta ? `<p class="kit-ctl-card-meta">${e(meta)}</p>` : ''}<h3 class="kit-ctl-card-title">${hit}</h3>${body ? `<p class="kit-ctl-card-text">${e(body)}</p>` : ''}${p.state === 'error' ? `<p class="kit-ctl-card-error">${icon('alert-circle')}<span>${e(message)}</span></p>` : ''}`;
  const foot = p.footer === 'actions' ? `<div class="kit-ctl-card-footer">${actions.map((a, i) => renderButton({appearance: i ? 'ghost' : 'soft', tone: 'action', ...a, size: p.size, content: 'text', behavior: 'action', shape: 'soft', state: 'default'})).join('')}</div>` : '';
  const mark = p.media === 'none' ? '' : `<div class="kit-ctl-card-media" aria-hidden="true">${icon(mediaIcon)}</div>`;
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  return `<article class="kit-ctl-card" data-ctl="card" id="${e(id)}" ${attrs}${force ? ` data-force="${force}"` : ''}${p.state === 'loading' ? ' aria-busy="true"' : ''}>${mark}<div class="kit-ctl-card-body">${text}${foot}</div>${p.behavior === 'selectable' ? `<span class="kit-ctl-card-check" aria-hidden="true">${icon('check')}</span>` : ''}</article>`;
}

/** selectable 카드의 선택 전환. 카드 전체를 덮는 단일 버튼이 aria-pressed를 갖고, Space·Enter는 네이티브 버튼이 처리한다. */
export function attachCard(root, {onSelect} = {}) {
  const hit = root.querySelector('button.kit-ctl-card-hit');
  if (!hit) return {toggle: () => {}};
  const set = on => { hit.setAttribute('aria-pressed', String(on)); root.dataset.state = on ? 'selected' : 'default'; };
  hit.addEventListener('click', () => { const on = hit.getAttribute('aria-pressed') !== 'true'; set(on); if (typeof onSelect === 'function') onSelect({id: root.id, selected: on}); });
  return {toggle: () => hit.click()};
}
export const cardRuntime = "function attachCard(root, {onSelect} = {}) {\n  const hit = root.querySelector('button.kit-ctl-card-hit');\n  if (!hit) return {toggle: () => {}};\n  const set = on => { hit.setAttribute('aria-pressed', String(on)); root.dataset.state = on ? 'selected' : 'default'; };\n  hit.addEventListener('click', () => { const on = hit.getAttribute('aria-pressed') !== 'true'; set(on); if (typeof onSelect === 'function') onSelect({id: root.id, selected: on}); });\n  return {toggle: () => hit.click()};\n}";

export const cardStyles = `${baseStyles}${sizeCSS('.kit-ctl-card')}
.kit-ctl-card{position:relative;display:flex;align-items:flex-start;gap:var(--ctl-px);box-sizing:border-box;min-width:0;padding:var(--ctl-px);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font-size:var(--ctl-font);transition:background-color var(--kit-dur,150ms),box-shadow var(--kit-dur,150ms),transform var(--kit-dur,150ms)}
.kit-ctl-card[data-shape=square]{border-radius:0}.kit-ctl-card[data-shape=round]{border-radius:calc(var(--kit-radius) * 1.8)}
.kit-ctl-card[data-media=top]{flex-direction:column}
.kit-ctl-card[data-appearance=filled]{background:var(--kit-card-hover);border-color:transparent}
.kit-ctl-card[data-appearance=elevated]{border-color:transparent;box-shadow:var(--kit-shadow-hover)}
.kit-ctl-card[data-appearance=flat]{border-color:transparent;background:transparent}
.kit-ctl-card-media{display:grid;place-items:center;flex:none;box-sizing:content-box;width:calc(var(--ctl-icon) * 2);height:calc(var(--ctl-icon) * 2);border-radius:calc(var(--kit-radius) * .6);background:var(--kit-soft);color:var(--kit-link)}
.kit-ctl-card .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon);flex:none}
.kit-ctl-card-body{display:grid;gap:var(--kit-sp-near);min-width:0;flex:1}
.kit-ctl-card-title{margin:0;font-size:var(--kit-t-sub);line-height:1.3;font-weight:700;word-break:keep-all;overflow-wrap:anywhere}
.kit-ctl-card-text{margin:0;color:var(--kit-muted);word-break:keep-all;overflow-wrap:anywhere}.kit-ctl-card-meta{margin:0;color:var(--kit-muted);font-size:var(--kit-t-caption)}
.kit-ctl-card-footer{display:flex;flex-wrap:wrap;gap:var(--kit-sp-near);margin-top:var(--kit-sp-near)}
.kit-ctl-card-hit{display:inline;padding:0;border:0;background:none;color:inherit;font:inherit;font-weight:inherit;text-align:start;text-decoration:none;cursor:pointer}
.kit-ctl-card-hit::after{content:"";position:absolute;inset:0;border-radius:inherit}
.kit-ctl-card[data-behavior=link] .kit-ctl-card-hit{color:var(--kit-link)}
.kit-ctl-card[data-behavior=link] .kit-ctl-card-hit:is(:hover,:focus-visible){text-decoration:underline;text-underline-offset:.2em}
.kit-ctl-card:is([data-behavior=link],[data-behavior=selectable])${hover}:not([data-state=disabled]):not([data-state=loading]){background:var(--kit-card-hover);transform:translateY(var(--kit-lift,0px));box-shadow:inset 0 0 0 1px var(--kit-border)}
.kit-ctl-card[data-appearance=elevated]:is([data-behavior=link],[data-behavior=selectable])${hover}{box-shadow:var(--kit-shadow-hover),inset 0 0 0 1px var(--kit-border)}
.kit-ctl-card:is([data-behavior=link],[data-behavior=selectable])${active}:not([data-state=disabled]):not([data-state=loading]){background:var(--kit-card-active);transform:translateY(1px)}
.kit-ctl-card:has(.kit-ctl-card-hit:focus-visible),.kit-ctl-card[data-force=focus]{outline:3px solid var(--kit-focus);outline-offset:2px}
.kit-ctl-card .kit-ctl-card-hit:focus-visible{outline:0}
.kit-ctl-card-check{display:none;position:absolute;inset:var(--kit-sp-near) var(--kit-sp-near) auto auto;place-items:center;width:calc(var(--ctl-icon) + 4px);height:calc(var(--ctl-icon) + 4px);border-radius:50%;background:var(--kit-action);color:var(--kit-onAction)}
.kit-ctl-card[data-state=selected] .kit-ctl-card-check{display:grid}.kit-ctl-card[data-state=selected]{border-color:var(--kit-action);box-shadow:inset 0 0 0 1px var(--kit-action);background:var(--kit-card-active)}
.kit-ctl-card[data-state=error]{background:var(--kit-danger-soft);border-color:var(--kit-danger)}
.kit-ctl-card-error{display:flex;gap:var(--kit-sp-tight);margin:0;color:var(--kit-danger);font-weight:600;font-size:var(--kit-t-small)}.kit-ctl-card-error .kit-icon{margin-top:2px}
.kit-ctl-card[data-state=loading]{background:var(--kit-surface)}
.kit-ctl-skel{display:block;height:var(--kit-sp-item);border-radius:var(--kit-sp-tight);background:var(--kit-card-active);animation:kit-ctl-pulse 1.4s ease-in-out infinite}.kit-ctl-skel[data-short]{width:60%}.kit-ctl-card-body>.kit-ctl-skel{margin-block:var(--kit-sp-tight)}
@keyframes kit-ctl-pulse{50%{opacity:.45}}@media(prefers-reduced-motion:reduce){.kit-ctl-skel{animation:none}}
.kit-ctl-card[data-state=disabled]{background:var(--kit-control-disabled-bg);color:var(--kit-control-disabled-fg);border-color:var(--kit-control-disabled-bg);box-shadow:none;border-style:dashed}
.kit-ctl-card[data-state=disabled] :is(.kit-ctl-card-text,.kit-ctl-card-meta,.kit-ctl-card-hit,.kit-ctl-card-media){color:var(--kit-control-disabled-fg)}.kit-ctl-card[data-state=disabled] .kit-ctl-card-media{background:transparent}.kit-ctl-card[data-state=disabled] .kit-ctl-card-hit{cursor:not-allowed}
@media(max-width:640px){.kit-ctl-card[data-media=start]{flex-direction:column}}`.replace(/\n/g, '');

export const cardExamples = Object.freeze([
  {id: 'ex-plain', title: '프로젝트 개요', body: '이번 분기에 진행하는 세 가지 일을 한곳에 모았습니다.', meta: '업데이트 2026-11-22'},
  {id: 'ex-link', title: '디자인 시스템 문서', body: '재료 계약과 색 토큰 읽기 API를 확인하세요.', behavior: 'link', href: '#docs', media: 'start', mediaIcon: 'book', appearance: 'elevated'},
  {id: 'ex-pick', title: '스타터 플랜', body: '개인과 작은 팀을 위한 기본 구성입니다.', behavior: 'selectable', media: 'top', mediaIcon: 'zap'},
  {id: 'ex-act', title: '새 알림', body: '댓글 두 개가 도착했습니다.', footer: 'actions', actions: [{label: '열기'}, {label: '나중에'}], appearance: 'filled'},
]);

export const cardMaterial = componentMaterial(cardContract, {
  module: 'src/materials/card.mjs', renderExport: 'renderCard', key: 'card-surface', styles: cardStyles, examples: cardExamples.map(x => structuredClone(x)),
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: '640px 이하에서 가로 미디어 카드는 세로로 쌓인다. 글은 keep-all과 overflow-wrap으로 넘치지 않는다.'},
  a11y: {rules: ['R05', 'R18'], role: 'article; link card = stretched link; selectable card = toggle button (aria-pressed)', keyboard: 'Tab to the single hit target; Enter follows the link; Space/Enter toggles a selectable card'},
  validation: {rules: ['R18'], codes: ['CARD_ERROR_MESSAGE', 'CARD_ACTIONS', ...cardContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:22'], ext: {group: 'content', required: ['id', 'title']}, dependencies: ['component:button-control'],
});
