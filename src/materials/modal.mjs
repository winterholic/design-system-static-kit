import {defineContract, resolveProps, ContractError, sizeCSS, baseStyles, focusRing, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {renderButton} from './button.mjs';
import {renderInput} from './input.mjs';
import {icon} from '../render/icon.mjs';

/** Modal: 외형(패널 표면)·모양·크기(폭과 안쪽 여백)·기능(역할·배치·하단 동작)·상태(닫힘·열림·처리 중·오류)를 따로 둔다. 네이티브 `<dialog>`와 showModal을 쓴다. */
export const modalContract = defineContract({
  id: 'component:modal-dialog', label: 'Modal',
  inputFields: ['id', 'title', 'description', 'body', 'actions', 'triggerLabel', 'message', 'preview'],
  axes: {
    appearance: ['elevated', 'outline', 'filled'], shape: ['square', 'soft', 'round'], size: SIZES,
    role: ['dialog', 'alertdialog'], placement: ['center', 'bottom'], footer: ['actions', 'none'],
    state: ['closed', 'open', 'busy', 'error'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['role', 'placement', 'footer'], state: ['state']},
  defaults: {appearance: 'elevated', shape: 'soft', size: 'medium', role: 'dialog', placement: 'center', footer: 'actions', state: 'closed'},
  states: ['closed', 'open', 'busy', 'error', 'focus'],
  transitions: [
    {from: 'closed', to: 'open', trigger: 'trigger click (showModal; focus moves into the dialog; the page behind becomes inert)'},
    {from: 'open', to: 'closed', trigger: 'Escape | close button | cancel action | backdrop click (dialog only); focus returns to the trigger'},
    {from: 'open', to: 'busy', trigger: 'setBusy(true): confirm aria-busy; Escape and backdrop are ignored'}, {from: 'busy', to: 'open', trigger: 'setBusy(false)'},
    {from: 'busy', to: 'error', trigger: 'setError(message)'}, {from: 'error', to: 'open', trigger: 'setError(null) | retry'},
  ],
  forbidden: [
    {id: 'MODAL_ALERT_NO_ACTIONS', when: {role: 'alertdialog', footer: 'none'}, why: 'alertdialog는 사용자가 명시적으로 고르게 하는 대화상자라 선택 동작(확인·취소)이 반드시 있어야 한다'},
    {id: 'MODAL_STATE_NO_FOOTER', when: {state: ['busy', 'error'], footer: 'none'}, why: '처리 중 표시와 다시 시도는 하단 동작 버튼에 붙는다: 동작이 없으면 busy·error를 보일 곳이 없다'},
    {id: 'MODAL_SHEET_SIZE', when: {placement: 'bottom', size: ['compact', 'small', 'large']}, why: '아래 시트는 화면 폭을 채우므로 크기가 폭에 영향을 주지 못해 같은 그림이 중복된다: medium 하나만 둔다'},
  ],
  unsupported: ['modal inside modal', 'non-modal (popover) dialogs', 'free-form HTML body (typed text and input slots only)', 'side drawer'],
  pairs: [
    ['--kit-text', '--kit-surface', 7, 'title and body on panel'], ['--kit-muted', '--kit-surface', 4.5, 'description'], ['--kit-text', '--kit-card-hover', 7, 'filled panel'], ['--kit-muted', '--kit-card-hover', 4.5, 'filled description'],
    ['--kit-danger', '--kit-surface', 4.5, 'error message'], ['--kit-focus', '--kit-surface', 3, 'focus ring'],
  ],
});

/** 내용 계약: Modal의 본문은 정해진 칸(text·input)뿐이다. 다른 대화상자를 본문에 넣는 모양은 축 조합이 아니라 내용이라 별도로 거부한다. */
export const modalContentRules = Object.freeze([
  {id: 'MODAL_NESTED', why: '모달 안에 모달을 둘 수 없다: 두 번째 showModal이 첫 번째의 포커스 복귀 지점을 깨고 Escape가 어느 쪽을 닫는지 모호하다'},
  {id: 'MODAL_CONTENT', why: '본문 칸(slot)은 text와 input뿐이다: 자유 HTML은 포커스 순서와 중첩 검사를 우회한다'},
]);
/** 폭은 컨트롤 높이 토큰의 배수라 밀도와 함께 변한다. 안쪽 여백은 CONTROL_SIZES의 pad 토큰에 항목 간격(item)을 더한다. */
export const MODAL_WIDTH = Object.freeze({compact: 8, small: 10, medium: 12, large: 16});

export function renderModal(input) {
  const {id, title, description = '', body = [], actions = [], triggerLabel = '열기', message = '', preview = false} = input ?? {};
  const p = resolveProps(modalContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Modal requires a lowercase kebab-case id');
  if (!String(title ?? '').trim()) throw new TypeError('MODAL_TITLE: a dialog needs a title (aria-labelledby)');
  if (!Array.isArray(body)) throw new TypeError('MODAL_CONTENT: body is a list of text and input slots');
  for (const item of body) {
    if (item?.slot === 'modal' || item?.slot === 'dialog') throw new ContractError(modalContract, [modalContentRules[0]]);
    if (!item || !['text', 'input'].includes(item.slot)) throw new ContractError(modalContract, [modalContentRules[1]]);
  }
  if (p.footer === 'actions' && !(Array.isArray(actions) && actions.length >= 1 && actions.length <= 3)) throw new TypeError('MODAL_ACTIONS: footer actions need one to three actions');
  if (p.footer === 'none' && actions.length) throw new TypeError('MODAL_ACTIONS: actions need footer=actions');
  if (p.role === 'alertdialog' && !actions.some(a => a.role === 'cancel')) throw new TypeError('MODAL_ALERT_CANCEL: an alertdialog needs a cancel action that takes initial focus');
  if (p.state === 'error' && !String(message).trim()) throw new TypeError('MODAL_ERROR_MESSAGE: error state needs a message');
  const busy = p.state === 'busy';
  const act = (a, i) => {
    if (!a || !String(a.label ?? '').trim() || !['confirm', 'cancel', 'other'].includes(a.role ?? 'other')) throw new TypeError('MODAL_ACTIONS: an action needs a label and a role of confirm, cancel or other');
    const confirm = a.role === 'confirm';
    const button = renderButton({label: a.label, size: p.size, appearance: confirm ? 'solid' : a.role === 'cancel' ? 'outline' : 'ghost', tone: confirm && p.role === 'alertdialog' ? 'danger' : confirm ? 'action' : 'neutral', state: confirm && busy ? 'loading' : 'default'});
    const marked = button.replace('<button ', `<button data-modal-action="${a.role ?? 'other'}"${a.role === 'cancel' && p.role === 'alertdialog' ? ' autofocus' : ''} `);
    return marked;
  };
  const fields = body.map(({slot, ...item}) => slot === 'text' ? `<p class="kit-ctl-modal-text">${e(item.text)}</p>` : renderInput({...item, size: p.size})).join('');
  const hasField = body.some(item => item.slot === 'input');
  const heading = `<h2 class="kit-ctl-modal-title" id="${e(id)}-title" tabindex="-1"${!hasField && p.role === 'dialog' ? ' autofocus' : ''}>${e(title)}</h2>`;
  const close = p.role === 'dialog' ? `<button type="button" class="kit-ctl-modal-close" data-close aria-label="닫기">${icon('x')}</button>` : '';
  const footer = p.footer === 'actions' ? `<footer class="kit-ctl-modal-footer">${actions.map(act).join('')}</footer>` : '';
  const err = p.state === 'error' ? `<p class="kit-ctl-modal-error" role="alert">${icon('alert-circle')}<span>${e(message)}</span></p>` : '';
  const dialogAttrs = `id="${e(id)}-dialog" class="kit-ctl-modal-dialog" aria-labelledby="${e(id)}-title"${description ? ` aria-describedby="${e(id)}-desc"` : ''}${p.role === 'alertdialog' ? ' role="alertdialog"' : ''}${busy ? ' aria-busy="true"' : ''}${preview ? ' open' : ''}`;
  const panel = `<div class="kit-ctl-modal-panel"><header class="kit-ctl-modal-head">${heading}${close}</header>${description ? `<p class="kit-ctl-modal-text" id="${e(id)}-desc">${e(description)}</p>` : ''}${fields}${err}${footer}</div>`;
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  const trigger = preview ? '' : `<span class="kit-ctl-modal-trigger">${renderButton({label: triggerLabel, size: p.size, appearance: p.role === 'alertdialog' ? 'soft' : 'solid', tone: p.role === 'alertdialog' ? 'danger' : 'action'})}</span>`;
  return `<div class="kit-ctl-modal" data-ctl="modal" id="${e(id)}" ${attrs}${preview ? ' data-preview' : ''}>${trigger}<dialog ${dialogAttrs}>${panel}</dialog></div>`;
}

/** 브라우저에서 붙는 동작. 열면 showModal로 뒤 페이지를 inert로 만들고 포커스를 넣으며, 닫으면 연 요소로 되돌린다. busy 동안은 Escape·배경 클릭이 닫지 못한다. */
export function attachModal(root, {onConfirm, onClose} = {}) {
  const doc = root.ownerDocument, dialog = root.querySelector('dialog'), trigger = root.querySelector('.kit-ctl-modal-trigger button');
  if (!dialog) throw new TypeError('Modal root is incomplete');
  if (root.parentElement && root.parentElement.closest('dialog')) throw new RangeError('MODAL_NESTED: a modal cannot open inside another modal');
  let opener = trigger, prevOverflow = '';
  const confirmButton = () => dialog.querySelector('[data-modal-action="confirm"]');
  const setState = state => { root.dataset.state = state; };
  const open = () => {
    if (dialog.open) return;
    opener = doc.activeElement || trigger;
    prevOverflow = doc.documentElement.style.overflow; doc.documentElement.style.overflow = 'hidden';
    dialog.showModal(); setState(root.dataset.state === 'busy' || root.dataset.state === 'error' ? root.dataset.state : 'open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    // 첫 포커스: alertdialog는 취소 버튼(autofocus), 입력이 있으면 첫 입력, 없으면 제목. 닫기 버튼이 먼저 잡히는 것을 막는다.
    if (dialog.getAttribute('role') !== 'alertdialog') { const first = dialog.querySelector('input,textarea,select') || dialog.querySelector('.kit-ctl-modal-title'); if (first) first.focus(); }
  };
  const close = () => { if (dialog.open) dialog.close(); };
  const setBusy = on => {
    const button = confirmButton();
    dialog.setAttribute('aria-busy', String(on)); setState(on ? 'busy' : 'open');
    if (button) { button.setAttribute('aria-busy', String(on)); if (on) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled'); button.dataset.state = on ? 'loading' : 'default'; if (button.parentElement) button.parentElement.dataset.state = button.dataset.state; }
  };
  const setError = text => {
    const old = dialog.querySelector('.kit-ctl-modal-error'); if (old) old.remove();
    if (text == null) { setState('open'); return; }
    const p = doc.createElement('p'), span = doc.createElement('span');
    p.className = 'kit-ctl-modal-error'; p.setAttribute('role', 'alert'); span.textContent = text; p.append(span);
    const footer = dialog.querySelector('.kit-ctl-modal-footer'); footer.parentElement.insertBefore(p, footer);
    setBusy(false); setState('error');
  };
  if (trigger) { trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-controls', dialog.id); trigger.setAttribute('aria-expanded', 'false'); trigger.addEventListener('click', open); }
  dialog.addEventListener('cancel', event => { if (dialog.getAttribute('aria-busy') === 'true') event.preventDefault(); });
  dialog.addEventListener('click', event => {
    if (event.target === dialog && dialog.getAttribute('aria-busy') !== 'true' && dialog.getAttribute('role') !== 'alertdialog') close();
    const control = event.target.closest('[data-close],[data-modal-action]');
    if (!control || control.getAttribute('aria-disabled') === 'true') return;
    if (control.dataset.modalAction === 'confirm') { if (typeof onConfirm === 'function') onConfirm({setBusy, setError, close}); else close(); }
    else if (control.dataset.close !== undefined || control.dataset.modalAction === 'cancel') close();
  });
  dialog.addEventListener('close', () => {
    doc.documentElement.style.overflow = prevOverflow; setState('closed');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (opener && opener.focus) opener.focus();
    if (typeof onClose === 'function') onClose({id: root.id});
  });
  if (root.dataset.state === 'open') open();
  return {open, close, setBusy, setError};
}
export const modalRuntime = "function attachModal(root, {onConfirm, onClose} = {}) {\n  const doc = root.ownerDocument, dialog = root.querySelector('dialog'), trigger = root.querySelector('.kit-ctl-modal-trigger button');\n  if (!dialog) throw new TypeError('Modal root is incomplete');\n  if (root.parentElement && root.parentElement.closest('dialog')) throw new RangeError('MODAL_NESTED: a modal cannot open inside another modal');\n  let opener = trigger, prevOverflow = '';\n  const confirmButton = () => dialog.querySelector('[data-modal-action=\"confirm\"]');\n  const setState = state => { root.dataset.state = state; };\n  const open = () => {\n    if (dialog.open) return;\n    opener = doc.activeElement || trigger;\n    prevOverflow = doc.documentElement.style.overflow; doc.documentElement.style.overflow = 'hidden';\n    dialog.showModal(); setState(root.dataset.state === 'busy' || root.dataset.state === 'error' ? root.dataset.state : 'open');\n    if (trigger) trigger.setAttribute('aria-expanded', 'true');\n    // 첫 포커스: alertdialog는 취소 버튼(autofocus), 입력이 있으면 첫 입력, 없으면 제목. 닫기 버튼이 먼저 잡히는 것을 막는다.\n    if (dialog.getAttribute('role') !== 'alertdialog') { const first = dialog.querySelector('input,textarea,select') || dialog.querySelector('.kit-ctl-modal-title'); if (first) first.focus(); }\n  };\n  const close = () => { if (dialog.open) dialog.close(); };\n  const setBusy = on => {\n    const button = confirmButton();\n    dialog.setAttribute('aria-busy', String(on)); setState(on ? 'busy' : 'open');\n    if (button) { button.setAttribute('aria-busy', String(on)); if (on) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled'); button.dataset.state = on ? 'loading' : 'default'; if (button.parentElement) button.parentElement.dataset.state = button.dataset.state; }\n  };\n  const setError = text => {\n    const old = dialog.querySelector('.kit-ctl-modal-error'); if (old) old.remove();\n    if (text == null) { setState('open'); return; }\n    const p = doc.createElement('p'), span = doc.createElement('span');\n    p.className = 'kit-ctl-modal-error'; p.setAttribute('role', 'alert'); span.textContent = text; p.append(span);\n    const footer = dialog.querySelector('.kit-ctl-modal-footer'); footer.parentElement.insertBefore(p, footer);\n    setBusy(false); setState('error');\n  };\n  if (trigger) { trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-controls', dialog.id); trigger.setAttribute('aria-expanded', 'false'); trigger.addEventListener('click', open); }\n  dialog.addEventListener('cancel', event => { if (dialog.getAttribute('aria-busy') === 'true') event.preventDefault(); });\n  dialog.addEventListener('click', event => {\n    if (event.target === dialog && dialog.getAttribute('aria-busy') !== 'true' && dialog.getAttribute('role') !== 'alertdialog') close();\n    const control = event.target.closest('[data-close],[data-modal-action]');\n    if (!control || control.getAttribute('aria-disabled') === 'true') return;\n    if (control.dataset.modalAction === 'confirm') { if (typeof onConfirm === 'function') onConfirm({setBusy, setError, close}); else close(); }\n    else if (control.dataset.close !== undefined || control.dataset.modalAction === 'cancel') close();\n  });\n  dialog.addEventListener('close', () => {\n    doc.documentElement.style.overflow = prevOverflow; setState('closed');\n    if (trigger) trigger.setAttribute('aria-expanded', 'false');\n    if (opener && opener.focus) opener.focus();\n    if (typeof onClose === 'function') onClose({id: root.id});\n  });\n  if (root.dataset.state === 'open') open();\n  return {open, close, setBusy, setError};\n}";

export const modalStyles = `${baseStyles}${sizeCSS('.kit-ctl-modal')}
.kit-ctl-modal{display:inline-block;font-size:var(--ctl-font)}
.kit-ctl-modal-dialog{box-sizing:border-box;width:min(calc(100vw - 2 * var(--kit-sp-item)),calc(var(--kit-control) * var(--m-w,12)));max-width:none;max-height:calc(100dvh - 2 * var(--kit-sp-item));margin:auto;padding:0;border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);overflow:auto;overscroll-behavior:contain}
.kit-ctl-modal[data-size=compact]{--m-w:${MODAL_WIDTH.compact}}.kit-ctl-modal[data-size=small]{--m-w:${MODAL_WIDTH.small}}.kit-ctl-modal[data-size=medium]{--m-w:${MODAL_WIDTH.medium}}.kit-ctl-modal[data-size=large]{--m-w:${MODAL_WIDTH.large}}
.kit-ctl-modal-dialog::backdrop{background:var(--kit-shade)}
.kit-ctl-modal[data-shape=square] .kit-ctl-modal-dialog{border-radius:0}.kit-ctl-modal[data-shape=round] .kit-ctl-modal-dialog{border-radius:calc(var(--kit-radius) * 1.8)}
.kit-ctl-modal[data-appearance=elevated] .kit-ctl-modal-dialog{border-color:transparent;box-shadow:var(--kit-shadow-hover)}
.kit-ctl-modal[data-appearance=filled] .kit-ctl-modal-dialog{background:var(--kit-card-hover)}
.kit-ctl-modal[data-placement=bottom] .kit-ctl-modal-dialog{width:100%;margin:auto 0 0;max-height:85dvh;border-end-start-radius:0;border-end-end-radius:0}
.kit-ctl-modal-panel{display:grid;gap:var(--kit-sp-item);padding:calc(var(--ctl-px) + var(--kit-sp-item))}
.kit-ctl-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--ctl-gap)}
.kit-ctl-modal-title{margin:0;font-size:var(--kit-t-sub);line-height:1.3;font-weight:700;word-break:keep-all;overflow-wrap:anywhere}.kit-ctl-modal-title:focus{outline:0}
.kit-ctl-modal-text{margin:0;color:var(--kit-muted);word-break:keep-all;overflow-wrap:anywhere}
.kit-ctl-modal-close{display:inline-grid;place-items:center;flex:none;width:calc(var(--ctl-icon) + var(--kit-sp-near));height:calc(var(--ctl-icon) + var(--kit-sp-near));padding:0;border:0;border-radius:var(--kit-radius);background:transparent;color:var(--kit-muted);cursor:pointer}
.kit-ctl-modal-close:hover{background:var(--kit-card-active);color:var(--kit-text)}${focusRing('.kit-ctl-modal-close', '0')}
.kit-ctl-modal .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon);flex:none}
.kit-ctl-modal-footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:var(--kit-sp-near);margin-top:var(--kit-sp-near)}
.kit-ctl-modal-error{display:flex;gap:var(--kit-sp-tight);margin:0;color:var(--kit-danger);font-weight:600;font-size:var(--kit-t-small)}
.kit-ctl-modal[data-state=busy] .kit-ctl-modal-footer button:not([data-modal-action=confirm]){opacity:1}
.kit-ctl-modal[data-preview]{display:grid;padding:var(--kit-sp-item);background:var(--kit-shade);border-radius:var(--kit-radius)}.kit-ctl-modal[data-preview] .kit-ctl-modal-dialog{position:static;display:block;width:min(100%,calc(var(--kit-control) * var(--m-w,12)));margin:0 auto;max-height:none}.kit-ctl-modal[data-preview][data-placement=bottom] .kit-ctl-modal-dialog{margin:0}
@media(max-width:640px){.kit-ctl-modal-footer{flex-direction:column-reverse}.kit-ctl-modal-footer .kit-ctl-button-host,.kit-ctl-modal-footer .kit-ctl-button{width:100%}}`.replace(/\n/g, '');

export const modalExamples = Object.freeze([
  {id: 'ex-modal-form', title: '새 프로젝트', description: '이름을 정하면 바로 시작합니다.', triggerLabel: '새 프로젝트', body: [{slot: 'input', id: 'ex-modal-name', label: '프로젝트 이름', placeholder: '예: 가을 캠페인', required: true}], actions: [{label: '취소', role: 'cancel'}, {label: '만들기', role: 'confirm'}]},
  {id: 'ex-modal-alert', title: '프로젝트를 삭제할까요?', description: '삭제하면 복구할 수 없습니다.', triggerLabel: '삭제', role: 'alertdialog', size: 'small', appearance: 'outline', actions: [{label: '취소', role: 'cancel'}, {label: '삭제', role: 'confirm'}]},
  {id: 'ex-modal-sheet', title: '필터', description: '결과를 좁힙니다.', triggerLabel: '필터 열기', placement: 'bottom', body: [{slot: 'text', text: '기간과 상태를 고를 수 있습니다.'}], actions: [{label: '닫기', role: 'cancel'}, {label: '적용', role: 'confirm'}]},
]);

export const modalMaterial = componentMaterial(modalContract, {
  category: 'layout-navigation', module: 'src/materials/modal.mjs', renderExport: 'renderModal', key: 'modal-dialog', styles: modalStyles, examples: modalExamples.map(x => structuredClone(x)),
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: '폭은 min(100vw − 여백, 컨트롤 높이 × 배수)다. 640px 이하에서는 하단 동작이 세로로 쌓여 전폭이 된다. bottom 배치는 화면 폭을 채운다.'},
  a11y: {rules: ['R05', 'R19'], role: 'dialog | alertdialog (aria-labelledby, aria-describedby, native modal inertness)', keyboard: 'Escape closes (ignored while busy); focus enters the dialog and returns to the opener; alertdialog starts on the cancel action'},
  validation: {rules: ['R05'], codes: ['MODAL_TITLE', 'MODAL_CONTENT', 'MODAL_ACTIONS', 'MODAL_ALERT_CANCEL', 'MODAL_ERROR_MESSAGE', ...modalContentRules.map(r => r.id), ...modalContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:30'], ext: {group: 'feedback', required: ['id', 'title']}, dependencies: ['component:button-control', 'component:input-control'],
  tags: ['forbidden:MODAL_NESTED'],
});
