import {defineContract, resolveProps, sizeCSS, baseStyles, focusRing, hover, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {icon} from '../render/icon.mjs';

/** Input: 외형(경계 처리)·모양·크기·기능(종류와 접두 아이콘)·상태를 따로 둔다. 상태는 색 외에 아이콘·메시지·점선·aria로도 구분한다. */
export const inputContract = defineContract({
  id: 'component:input-control', label: 'Input',
  inputFields: ['id', 'label', 'hint', 'message', 'placeholder', 'value', 'required', 'name', 'icon', 'force'],
  axes: {
    appearance: ['outline', 'filled', 'underline', 'ghost'], shape: SHAPES, size: SIZES,
    kind: ['text', 'email', 'password', 'search', 'number', 'multiline'], affix: ['none', 'icon'],
    state: ['default', 'error', 'readonly', 'disabled'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['kind', 'affix'], state: ['state']},
  defaults: {appearance: 'outline', shape: 'soft', size: 'medium', kind: 'text', affix: 'none', state: 'default'},
  states: ['default', 'hover', 'focus', 'active', 'error', 'readonly', 'disabled'],
  transitions: [
    {from: 'default', to: 'hover', trigger: 'pointer enter'}, {from: 'default', to: 'focus', trigger: 'Tab | click (focus-visible)'}, {from: 'focus', to: 'active', trigger: 'typing'},
    {from: 'active', to: 'error', trigger: 'blur or input with checkValidity() false'}, {from: 'error', to: 'default', trigger: 'input with checkValidity() true'},
  ],
  forbidden: [
    {id: 'INPUT_UNDERLINE_SHAPE', when: {appearance: 'underline', shape: ['square', 'pill']}, why: 'underline에는 상자가 없어 모서리 모양이 보이지 않으므로 기본 모양 하나만 둔다'},
    {id: 'INPUT_MULTILINE_PILL', when: {kind: 'multiline', shape: 'pill'}, why: '여러 줄 칸에 999px 모서리를 주면 긴 글이 곡선 모서리에 잘린다'},
    {id: 'INPUT_MULTILINE_COMPACT', when: {kind: 'multiline', size: 'compact'}, why: 'compact 높이는 한 줄 기준이라 여러 줄 칸의 최소 두 줄을 담지 못한다'},
    {id: 'INPUT_MULTILINE_AFFIX', when: {kind: 'multiline', affix: 'icon'}, why: '접두 아이콘이 여러 줄 칸의 세로 중간에 떠 첫 줄과 어긋난다'},
    {id: 'INPUT_PASSWORD_READONLY', when: {kind: 'password', state: 'readonly'}, why: '읽기 전용 비밀번호는 표시 전환이 값을 노출하는 통로가 되고 얻는 것이 없다'},
    {id: 'INPUT_SEARCH_READONLY', when: {kind: 'search', state: 'readonly'}, why: '읽기 전용 검색에는 지우기 동작이 없어 칸이 아무 일도 하지 못한다'},
    {id: 'INPUT_SEARCH_AFFIX', when: {kind: 'search', affix: 'icon'}, why: 'search는 돋보기 아이콘을 이미 접두 자리에 갖는다'},
  ],
  unsupported: ['masked input', 'input groups with attached buttons', 'tag input'],
  pairs: [
    ['--kit-control-fg', '--kit-control-bg', 4.5, 'text on outline'], ['--kit-control-fg', '--kit-card-active', 4.5, 'text on filled'], ['--kit-muted', '--kit-control-bg', 4.5, 'label·hint·placeholder'],
    ['--kit-muted', '--kit-card-active', 4.5, 'placeholder on filled'], ['--kit-danger', '--kit-surface', 4.5, 'error message'], ['--kit-control-error', '--kit-surface', 3, 'error border'],
    ['--kit-control-hover-border', '--kit-surface', 3, 'hover border'], ['--kit-control-active-border', '--kit-surface', 3, 'focus border'], ['--kit-control-disabled-fg', '--kit-control-disabled-bg', 3, 'disabled'], ['--kit-focus', '--kit-surface', 3, 'focus ring'],
  ],
});

const TYPE = {text: 'text', email: 'email', password: 'password', search: 'search', number: 'number'};
export function renderInput(input) {
  const {id, label, hint = '', message = '', placeholder = '', value = '', required = false, name = id, icon: iconName = 'search', force = ''} = input ?? {};
  const p = resolveProps(inputContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Input requires a lowercase kebab-case id');
  if (!String(label ?? '').trim()) throw new TypeError('INPUT_LABEL: a placeholder never replaces the label');
  if (p.state === 'error' && !String(message).trim()) throw new TypeError('INPUT_ERROR_MESSAGE: error state needs a message that says what to fix');
  if (force && !['hover', 'focus'].includes(force)) throw new TypeError('Invalid force preview');
  const describedBy = [hint && `${id}-hint`, `${id}-message`].filter(Boolean).join(' ');
  const common = `id="${e(id)}" name="${e(name)}" placeholder="${e(placeholder)}" aria-describedby="${describedBy}"${required ? ' required aria-required="true"' : ''}${p.state === 'error' ? ' aria-invalid="true"' : ''}${p.state === 'readonly' ? ' readonly' : ''}${p.state === 'disabled' ? ' disabled' : ''}`;
  const control = p.kind === 'multiline' ? `<textarea ${common} rows="3">${e(value)}</textarea>` : `<input ${common} type="${TYPE[p.kind]}"${p.kind === 'number' ? ' inputmode="decimal"' : ''}${p.kind === 'search' ? ' enterkeyhint="search"' : ''} value="${e(value)}">`;
  const lead = p.kind === 'search' ? icon('search') : p.affix === 'icon' ? icon(iconName) : '';
  const tail = p.kind === 'password' ? `<button type="button" class="kit-ctl-input-action" data-reveal aria-pressed="false" aria-label="비밀번호 표시"${p.state === 'disabled' ? ' disabled' : ''}>${icon('eye')}</button>`
    : p.kind === 'search' ? `<button type="button" class="kit-ctl-input-action" data-clear aria-label="검색어 지우기"${value ? '' : ' hidden'}${p.state === 'disabled' ? ' disabled' : ''}>${icon('x')}</button>` : '';
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  return `<div class="kit-ctl-input" data-ctl="input" ${attrs}${force ? ` data-force="${force}"` : ''}><label class="kit-ctl-input-label" for="${e(id)}">${e(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label><div class="kit-ctl-input-box">${lead ? `<span class="kit-ctl-input-lead">${lead}</span>` : ''}${control}${tail}</div>${hint ? `<p class="kit-ctl-input-hint" id="${e(id)}-hint">${e(hint)}</p>` : ''}<p class="kit-ctl-input-message" id="${e(id)}-message" aria-live="polite">${p.state === 'error' ? `${icon('alert-circle')}<span>${e(message)}</span>` : ''}</p></div>`;
}

/** 브라우저에서 붙는 동작: 비밀번호 표시 전환(aria-pressed), 검색 지우기와 포커스 복귀, 네이티브 제약 검사로 error 전환, 여러 줄 자동 높이. */
export function attachInput(root, {onChange} = {}) {
  const field = root.querySelector('input,textarea'), message = root.querySelector('.kit-ctl-input-message'), clear = root.querySelector('[data-clear]'), reveal = root.querySelector('[data-reveal]');
  if (!field || !message) throw new TypeError('Input root is incomplete');
  const doc = root.ownerDocument;
  let touched = root.dataset.state === 'error';
  const fit = () => { if (root.dataset.kind === 'multiline') { field.style.height = 'auto'; field.style.height = field.scrollHeight + 'px'; } };
  const sync = () => { if (clear) clear.hidden = !field.value; };
  const validate = () => {
    if (field.readOnly || field.disabled) return;
    const ok = field.checkValidity(), text = field.dataset.errorMessage || field.validationMessage;
    root.dataset.state = ok ? 'default' : 'error';
    if (ok) field.removeAttribute('aria-invalid'); else field.setAttribute('aria-invalid', 'true');
    message.replaceChildren();
    if (!ok) { const span = doc.createElement('span'); span.textContent = text; message.append(span); }
  };
  field.addEventListener('input', () => { sync(); fit(); if (touched) validate(); if (typeof onChange === 'function') onChange({id: field.id, value: field.value}); });
  field.addEventListener('blur', () => { touched = true; validate(); });
  field.addEventListener('keydown', event => { if (event.key === 'Escape' && clear && field.value) { event.preventDefault(); field.value = ''; sync(); field.dispatchEvent(new doc.defaultView.Event('input', {bubbles: true})); } });
  if (clear) clear.addEventListener('click', () => { field.value = ''; sync(); field.dispatchEvent(new doc.defaultView.Event('input', {bubbles: true})); field.focus(); });
  if (reveal) reveal.addEventListener('click', () => {
    const on = reveal.getAttribute('aria-pressed') !== 'true';
    reveal.setAttribute('aria-pressed', String(on)); reveal.setAttribute('aria-label', on ? '비밀번호 숨기기' : '비밀번호 표시'); field.type = on ? 'text' : 'password';
  });
  sync(); fit();
  return {validate, focus: () => field.focus()};
}
export const inputRuntime = "function attachInput(root, {onChange} = {}) {\n  const field = root.querySelector('input,textarea'), message = root.querySelector('.kit-ctl-input-message'), clear = root.querySelector('[data-clear]'), reveal = root.querySelector('[data-reveal]');\n  if (!field || !message) throw new TypeError('Input root is incomplete');\n  const doc = root.ownerDocument;\n  let touched = root.dataset.state === 'error';\n  const fit = () => { if (root.dataset.kind === 'multiline') { field.style.height = 'auto'; field.style.height = field.scrollHeight + 'px'; } };\n  const sync = () => { if (clear) clear.hidden = !field.value; };\n  const validate = () => {\n    if (field.readOnly || field.disabled) return;\n    const ok = field.checkValidity(), text = field.dataset.errorMessage || field.validationMessage;\n    root.dataset.state = ok ? 'default' : 'error';\n    if (ok) field.removeAttribute('aria-invalid'); else field.setAttribute('aria-invalid', 'true');\n    message.replaceChildren();\n    if (!ok) { const span = doc.createElement('span'); span.textContent = text; message.append(span); }\n  };\n  field.addEventListener('input', () => { sync(); fit(); if (touched) validate(); if (typeof onChange === 'function') onChange({id: field.id, value: field.value}); });\n  field.addEventListener('blur', () => { touched = true; validate(); });\n  field.addEventListener('keydown', event => { if (event.key === 'Escape' && clear && field.value) { event.preventDefault(); field.value = ''; sync(); field.dispatchEvent(new doc.defaultView.Event('input', {bubbles: true})); } });\n  if (clear) clear.addEventListener('click', () => { field.value = ''; sync(); field.dispatchEvent(new doc.defaultView.Event('input', {bubbles: true})); field.focus(); });\n  if (reveal) reveal.addEventListener('click', () => {\n    const on = reveal.getAttribute('aria-pressed') !== 'true';\n    reveal.setAttribute('aria-pressed', String(on)); reveal.setAttribute('aria-label', on ? '비밀번호 숨기기' : '비밀번호 표시'); field.type = on ? 'text' : 'password';\n  });\n  sync(); fit();\n  return {validate, focus: () => field.focus()};\n}";

export const inputStyles = `${baseStyles}${sizeCSS('.kit-ctl-input')}
.kit-ctl-input{display:grid;gap:var(--kit-sp-tight);min-width:0;color:var(--kit-control-fg);font-size:var(--ctl-font)}
.kit-ctl-input-label{color:var(--kit-muted);font-size:var(--kit-t-label);font-weight:600}
.kit-ctl-input-box{display:flex;align-items:center;gap:var(--ctl-gap);box-sizing:border-box;min-height:var(--ctl-h);padding-inline:var(--ctl-px);border:1px solid var(--kit-control-border);border-radius:var(--kit-radius);background:var(--kit-control-bg);transition:border-color var(--kit-dur,150ms),box-shadow var(--kit-dur,150ms)}
.kit-ctl-input[data-shape=square] .kit-ctl-input-box{border-radius:0}.kit-ctl-input[data-shape=pill] .kit-ctl-input-box{border-radius:999px}
.kit-ctl-input :is(input,textarea){flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:var(--ctl-font);padding:0;min-height:calc(var(--ctl-h) - 2px)}
.kit-ctl-input textarea{min-height:calc(var(--ctl-h) * 2);padding-block:var(--kit-sp-near);resize:vertical;max-height:calc(var(--ctl-h) * 6);line-height:1.5}
.kit-ctl-input[data-kind=multiline] .kit-ctl-input-box{align-items:stretch}
.kit-ctl-input ::placeholder{color:var(--kit-muted);opacity:1}
.kit-ctl-input .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon);flex:none}.kit-ctl-input-lead{display:inline-flex;color:var(--kit-muted)}
.kit-ctl-input-action{display:inline-grid;place-items:center;flex:none;width:var(--ctl-icon);height:var(--ctl-icon);padding:0;box-sizing:content-box;border:0;border-radius:var(--kit-radius);background:transparent;color:var(--kit-muted);cursor:pointer}
.kit-ctl-input-action[hidden]{display:none}
.kit-ctl-input[data-appearance=filled] .kit-ctl-input-box{background:var(--kit-card-active);border-color:transparent;border-bottom-color:var(--kit-control-border)}
.kit-ctl-input[data-appearance=underline] .kit-ctl-input-box{padding-inline:0;border-width:0 0 2px;border-radius:0;background:transparent;border-color:var(--kit-control-border)}
.kit-ctl-input[data-appearance=ghost] .kit-ctl-input-box{border-color:transparent;background:transparent}
.kit-ctl-input[data-appearance=ghost] .kit-ctl-input-box:hover{border-color:var(--kit-control-border)}
.kit-ctl-input .kit-ctl-input-box${hover}:not(:has(:disabled)){border-color:var(--kit-control-hover-border)}
.kit-ctl-input[data-appearance=filled] .kit-ctl-input-box${hover}:not(:has(:disabled)){border-color:transparent;border-bottom-color:var(--kit-control-hover-border)}
.kit-ctl-input .kit-ctl-input-box:focus-within{border-color:var(--kit-control-active-border);outline:3px solid var(--kit-focus);outline-offset:2px}
.kit-ctl-input[data-force=focus] .kit-ctl-input-box{border-color:var(--kit-control-active-border);outline:3px solid var(--kit-focus);outline-offset:2px}
.kit-ctl-input[data-force=hover] .kit-ctl-input-box{border-color:var(--kit-control-hover-border)}
.kit-ctl-input-hint,.kit-ctl-input-message{margin:0;font-size:var(--kit-t-small);color:var(--kit-muted)}
.kit-ctl-input-message:empty{display:none}.kit-ctl-input-message{display:flex;align-items:flex-start;gap:var(--kit-sp-tight);color:var(--kit-danger);font-weight:600}.kit-ctl-input-message .kit-icon{width:1.1em;height:1.1em;margin-top:2px}
.kit-ctl-input[data-state=error] .kit-ctl-input-box,.kit-ctl-input[data-state=error][data-appearance] .kit-ctl-input-box{border-color:var(--kit-control-error);box-shadow:inset 0 0 0 1px var(--kit-control-error)}
.kit-ctl-input[data-state=error][data-appearance=underline] .kit-ctl-input-box{box-shadow:0 2px 0 0 var(--kit-control-error)}
.kit-ctl-input[data-state=readonly] .kit-ctl-input-box{border-style:dashed;background:var(--kit-card-hover)}
.kit-ctl-input[data-state=readonly][data-appearance=underline] .kit-ctl-input-box{background:transparent}
.kit-ctl-input[data-state=disabled] .kit-ctl-input-box{background:var(--kit-control-disabled-bg);color:var(--kit-control-disabled-fg);border-color:var(--kit-control-disabled-bg);cursor:not-allowed}
.kit-ctl-input[data-state=disabled] :is(input,textarea,.kit-ctl-input-lead,.kit-ctl-input-action){color:var(--kit-control-disabled-fg);cursor:not-allowed}
.kit-ctl-input[data-state=disabled][data-appearance=underline] .kit-ctl-input-box,.kit-ctl-input[data-state=disabled][data-appearance=ghost] .kit-ctl-input-box{background:transparent}
${focusRing('.kit-ctl-input-action', '0')}`.replace(/\n/g, '');

export const inputExamples = Object.freeze([
  {id: 'ex-name', label: '이름', placeholder: '홍길동', hint: '실명을 입력하세요.', required: true}, {id: 'ex-mail', label: '이메일', kind: 'email', appearance: 'filled', placeholder: 'name@example.com'},
  {id: 'ex-pass', label: '비밀번호', kind: 'password', appearance: 'underline', value: 'secret-pass'}, {id: 'ex-find', label: '검색', kind: 'search', shape: 'pill', placeholder: '검색어', value: '디자인'},
  {id: 'ex-note', label: '메모', kind: 'multiline', appearance: 'ghost', placeholder: '여러 줄 입력'}, {id: 'ex-bad', label: '전화번호', state: 'error', message: '숫자만 입력하세요.', value: '010-abc'},
]);

export const inputMaterial = componentMaterial(inputContract, {
  module: 'src/materials/input.mjs', renderExport: 'renderInput', key: 'input-control', styles: inputStyles, examples: inputExamples.map(x => ({...x})),
  responsive: {strategy: 'fluid', note: '칸은 컨테이너 폭을 채우고 min-width:0이라 좁은 화면에서도 가로 넘침이 없다.'},
  a11y: {rules: ['R05', 'R16'], role: 'textbox | searchbox, label for/id, aria-describedby, aria-invalid', keyboard: 'Escape clears search; password reveal and search clear are buttons'},
  validation: {rules: ['R16'], codes: ['INPUT_LABEL', 'INPUT_ERROR_MESSAGE', ...inputContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:18'], ext: {group: 'form', required: ['id', 'label']},
});
