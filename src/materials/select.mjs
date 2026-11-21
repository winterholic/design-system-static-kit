import {defineMaterial} from './contract.mjs';
import {escapeHTML as e} from '../render/util.mjs';

export const selectContract = Object.freeze({
  id: 'component:select-control', version: '1.0.0', since: '2.6.0',
  variants: Object.freeze({mode: ['single', 'multiple'], search: ['none', 'local', 'async'], size: ['sm', 'md', 'lg'], shape: ['soft', 'square', 'pill'], state: ['ready', 'loading', 'error', 'disabled'], maxMenuHeight: [192, 240, 288, 360]}),
  defaults: Object.freeze({mode: 'single', search: 'none', size: 'md', shape: 'soft', state: 'ready', maxMenuHeight: 288}),
  states: Object.freeze(['idle', 'hover', 'focus', 'open', 'disabled', 'loading', 'error']),
  forbidden: Object.freeze(['multiple + async', 'disabled + loading', 'disabled + error']),
  tokens: Object.freeze(['--kit-action', '--kit-surface', '--kit-soft', '--kit-text', '--kit-muted', '--kit-border', '--kit-focus', '--kit-danger', '--kit-radius', '--kit-control', '--kit-shadow-hover', '--kit-t-small', '--kit-sp-tight', '--kit-sp-near', '--kit-sp-item']),
  unsupported: Object.freeze(['virtualized options', 'tag creation', 'select-all']),
});

export const selectMaterial = defineMaterial({
  id: selectContract.id, kind: 'component', category: 'form-data-feedback', label: 'Select', since: '2.6.0',
  render: {module: 'src/materials/select.mjs', export: 'renderSelect', key: 'select-control'},
  variants: selectContract.variants,
  defaults: selectContract.defaults, tokens: selectContract.tokens,
  states: {values: selectContract.states, transitions: [
    {from: 'idle', to: 'open', trigger: 'click | ArrowDown | Enter | Space'},
    {from: 'open', to: 'idle', trigger: 'Escape | Tab | outside click | selection'},
    {from: 'open', to: 'loading', trigger: 'async query'},
    {from: 'loading', to: 'open', trigger: 'options resolved'},
    {from: 'loading', to: 'error', trigger: 'options rejected'},
  ]},
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: '좁은 화면에서 메뉴는 화면 너비 안에 제한되고 옵션 목록 높이는 계약값을 따른다.'},
  a11y: {rules: ['R05', 'R16'], role: 'combobox + listbox', keyboard: 'ArrowUp/ArrowDown/Home/End/Enter/Space/Escape/Tab'},
  validation: {rules: ['R16'], codes: ['SELECT_OPTIONS']},
  examples: [{id: 'region', label: '지역', options: [{value: 'kr', label: '한국'}]}],
  quality: {status: 'verified', evidence: ['tests/select-table.test.mjs:7']},
  tags: ['form', 'select-control', ...selectContract.forbidden.map(x => `forbidden:${x}`), ...selectContract.unsupported.map(x => `unsupported:${x}`)],
  ext: {nodeType: 'select-control', group: 'form', fields: ['mode', 'search', 'size', 'shape', 'state', 'maxMenuHeight'], required: ['id', 'label', 'options']},
});

const validOptions = options => Array.isArray(options) && options.every(o => o && typeof o.value === 'string' && typeof o.label === 'string' && (o.group === undefined || typeof o.group === 'string'));
function optionsMarkup(options, selected, id) {
  let output = '', activeGroup = null, grouped = false;
  for (const [i, option] of options.entries()) {
    if (option.group && option.group !== activeGroup) {
      activeGroup = option.group; grouped = true;
      output += `<li role="group" aria-label="${e(activeGroup)}"><span class="kit-select-group-label" aria-hidden="true">${e(activeGroup)}</span><ul role="presentation">`;
    } else if (!option.group) activeGroup = null;
    output += `<li id="${e(id)}-option-${i}" role="option" data-value="${e(option.value)}" aria-selected="${selected.includes(option.value)}" aria-disabled="${Boolean(option.disabled)}">${e(option.label)}</li>`;
    const next = options[i + 1];
    if (option.group && next?.group !== option.group) output += '</ul></li>';
  }
  return {html: output, grouped};
}
export function renderSelect({id, label, options = [], value = null, values = [], mode = 'single', search = 'none', size = 'md', shape = 'soft', disabled = false, state = 'ready', required = false, placeholder = '선택해 주세요', maxMenuHeight = 288, message = ''}) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '') || !validOptions(options)) throw new TypeError('Select requires a safe id and {value,label} options');
  if (!['single', 'multiple'].includes(mode) || !['none', 'local', 'async'].includes(search)) throw new TypeError('Unsupported Select combination');
  if (!selectContract.variants.size.includes(size) || !selectContract.variants.shape.includes(shape) || ![192, 240, 288, 360].includes(maxMenuHeight)) throw new TypeError('Invalid Select size, shape, or menu height');
  if (mode === 'multiple' && search === 'async') throw new RangeError('multiple + async is not supported');
  if (disabled && ['loading', 'error'].includes(state)) throw new RangeError('disabled + loading/error is not supported');
  if (!['ready', 'loading', 'error'].includes(state)) throw new TypeError('Invalid Select state');
  const selected = mode === 'multiple' ? values : value == null ? [] : [value];
  const {html: optionsHTML, grouped} = optionsMarkup(options, selected, id);
  const searchBox = search === 'none' ? '' : `<input class="kit-select-search" type="search" role="searchbox" aria-label="${e(label)} 검색" autocomplete="off"${search === 'async' ? ' data-async-search' : ''}>`;
  const status = state === 'loading' ? '불러오는 중입니다.' : state === 'error' ? (message || '옵션을 불러오지 못했습니다.') : '';
  return `<div class="kit-select" data-mode="${mode}" data-search="${search}" data-size="${size}" data-shape="${shape}" data-state="${disabled ? 'disabled' : state}" data-menu-height="${maxMenuHeight}"><span class="kit-select-label" id="${e(id)}-label">${e(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</span><button id="${e(id)}" class="kit-select-trigger" type="button" role="combobox" aria-labelledby="${e(id)}-label" aria-haspopup="listbox" aria-expanded="false" aria-controls="${e(id)}-listbox" aria-activedescendant=""${required ? ' aria-required="true"' : ''}${disabled ? ' disabled aria-disabled="true"' : ''}>${e(selected.map(v => options.find(o => o.value === v)?.label).filter(Boolean).join(', ') || placeholder)}</button><div class="kit-select-menu" hidden>${searchBox}<ul id="${e(id)}-listbox" role="listbox" aria-labelledby="${e(id)}-label"${mode === 'multiple' ? ' aria-multiselectable="true"' : ''}${grouped ? ' data-grouped="true"' : ''} aria-busy="${state === 'loading'}">${optionsHTML}</ul><p role="status" aria-live="polite">${e(status)}</p></div><input type="hidden" name="${e(id)}" value="${e(selected.join(','))}"></div>`;
}

/** Attach behavior to a rendered Select. Async mode only calls the injected options provider. */
export function attachSelect(root, {onOptionsRequest} = {}) {
  const trigger = root.querySelector('[role="combobox"]'), menu = root.querySelector('.kit-select-menu'), list = root.querySelector('[role="listbox"]'), status = root.querySelector('[role="status"]'), search = root.querySelector('[data-async-search]');
  const validResult = value => Array.isArray(value) && value.every(o => o && typeof o.value === 'string' && typeof o.label === 'string' && (o.group === undefined || typeof o.group === 'string'));
  if (!trigger || !menu || !list) throw new TypeError('Select root is incomplete');
  const options = () => [...list.querySelectorAll('[role="option"]')].filter(o => o.getAttribute('aria-disabled') !== 'true' && !o.hidden);
  const close = (returnFocus = true) => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-activedescendant'); root.dataset.state = 'idle'; if (returnFocus) trigger.focus(); };
  const open = () => { if (trigger.disabled) return; menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); root.dataset.state = 'open'; if (search) search.focus(); else { trigger.focus(); activate(0); } };
  const activate = item => { const items = options(); if (!items.length) return; const next = items[Math.max(0, Math.min(items.length - 1, item))]; trigger.setAttribute('aria-activedescendant', next.id); items.forEach(o => o.dataset.active = String(o === next)); next.scrollIntoView?.({block: 'nearest'}); };
  let active = -1;
  trigger.addEventListener('click', () => menu.hidden ? open() : close(false));
  trigger.addEventListener('keydown', ev => { if (['ArrowDown', 'Enter', ' '].includes(ev.key)) { ev.preventDefault(); if (menu.hidden) open(); else activate(active = Math.min(active + 1, options().length - 1)); } });
  root.addEventListener('keydown', ev => {
    if (menu.hidden) return;
    const items = options();
    if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'Tab') close(false);
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); active = ev.key === 'Home' ? 0 : ev.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, active + (ev.key === 'ArrowDown' ? 1 : -1))); activate(active); }
    else if (ev.key === 'Enter' || ev.key === ' ') { const selected = items.find(o => o.id === trigger.getAttribute('aria-activedescendant')); if (selected) { selected.click(); ev.preventDefault(); } }
  });
  list.addEventListener('click', ev => { const option = ev.target.closest('[role="option"]'); if (!option || option.getAttribute('aria-disabled') === 'true') return; const multi = root.dataset.mode === 'multiple'; option.setAttribute('aria-selected', String(multi ? option.getAttribute('aria-selected') !== 'true' : true)); const chosen = [...list.querySelectorAll('[role="option"][aria-selected=true]')]; root.querySelector('input[type="hidden"]').value = chosen.map(o => o.dataset.value).join(','); if (!multi) { trigger.textContent = option.textContent; close(); } else { trigger.textContent = chosen.map(o => o.textContent).join(', ') || '선택해 주세요'; } });
  if (root.dataset.search === 'local' && root.querySelector('[role="searchbox"]')) root.querySelector('[role="searchbox"]').addEventListener('input', ev => options().forEach(o => { o.hidden = !o.textContent.toLocaleLowerCase().includes(ev.target.value.toLocaleLowerCase()); }));
  if (search && typeof onOptionsRequest === 'function') {
    let seq = 0, controller;
    search.addEventListener('input', async () => {
      const current = ++seq; controller?.abort(); controller = new AbortController(); root.dataset.state = 'loading'; list.setAttribute('aria-busy', 'true'); status.textContent = '불러오는 중입니다.';
      try { const result = await onOptionsRequest({query: search.value, signal: controller.signal}); if (current !== seq) return; if (!validResult(result)) throw new TypeError('onOptionsRequest must return {value,label,group?} options'); const fragment = document.createDocumentFragment(); let group = null, listTarget = fragment; result.forEach((o, i) => { if (o.group && o.group !== group) { group = o.group; const wrapper = document.createElement('li'), nested = document.createElement('ul'); wrapper.setAttribute('role', 'group'); wrapper.setAttribute('aria-label', group); nested.setAttribute('role', 'presentation'); wrapper.append(nested); fragment.append(wrapper); listTarget = nested; } else if (!o.group) { group = null; listTarget = fragment; } const li = document.createElement('li'); li.id = `${trigger.id}-option-${i}`; li.dataset.value = o.value; li.textContent = o.label; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false'); listTarget.append(li); }); list.replaceChildren(fragment); root.dataset.state = 'open'; status.textContent = result.length ? '' : '검색 결과가 없습니다.';
      } catch (error) { if (current !== seq || error?.name === 'AbortError') return; root.dataset.state = 'error'; status.textContent = '옵션을 불러오지 못했습니다.'; }
      finally { if (current === seq) list.setAttribute('aria-busy', 'false'); }
    });
  }
  document.addEventListener('pointerdown', ev => { if (!root.contains(ev.target) && !menu.hidden) close(false); });
  return {open, close};
}

export const selectRuntime = attachSelect.toString();
export const selectStyles = `.kit-select{position:relative;display:grid;gap:var(--kit-sp-near);min-width:0;color:var(--kit-text)}.kit-select-label{font-size:var(--kit-t-small);font-weight:600}.kit-select-trigger{display:flex;align-items:center;justify-content:space-between;min-height:var(--kit-control);width:100%;padding:var(--kit-sp-near) var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:inherit;text-align:left;font:inherit;cursor:pointer}.kit-select[data-size=sm] .kit-select-trigger{min-height:36px}.kit-select[data-size=lg] .kit-select-trigger{min-height:52px}.kit-select[data-shape=square] .kit-select-trigger,.kit-select[data-shape=square] .kit-select-menu{border-radius:0}.kit-select[data-shape=pill] .kit-select-trigger{border-radius:999px}.kit-select-trigger:hover{border-color:var(--kit-action)}.kit-select-trigger:focus-visible,.kit-select-search:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.kit-select-trigger:disabled{opacity:.55;cursor:not-allowed}.kit-select-menu{position:absolute;z-index:20;inset:100% 0 auto;min-width:100%;max-width:100vw;margin-top:var(--kit-sp-tight);padding:6px;border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);box-shadow:var(--kit-shadow-hover)}.kit-select-menu[hidden]{display:none}.kit-select-menu ul{overflow:auto;list-style:none;margin:0;padding:0}.kit-select[data-menu-height="192"] .kit-select-menu ul{max-height:min(192px,45vh)}.kit-select[data-menu-height="240"] .kit-select-menu ul{max-height:min(240px,45vh)}.kit-select[data-menu-height="288"] .kit-select-menu ul{max-height:min(288px,45vh)}.kit-select[data-menu-height="360"] .kit-select-menu ul{max-height:min(360px,45vh)}.kit-select-menu [role=group]{margin:2px 0}.kit-select-group-label{display:block;padding:6px 10px;color:var(--kit-muted);font-size:var(--kit-t-small);font-weight:600}.kit-select-menu [role=option]{padding:var(--kit-sp-near) var(--kit-sp-tight);border-radius:calc(var(--kit-radius) * .6);cursor:pointer}.kit-select-menu [role=option][data-active=true],.kit-select-menu [role=option][aria-selected=true]{background:var(--kit-soft);color:var(--kit-action)}.kit-select-menu [role=option][aria-disabled=true]{opacity:.5;cursor:not-allowed}.kit-select[data-state=error] .kit-select-menu [role=status]{color:var(--kit-danger)}.kit-select-menu [role=status]:empty{display:none}.kit-select-search{width:100%;min-height:var(--kit-control);padding:var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:calc(var(--kit-radius) * .6);background:var(--kit-surface);color:inherit;font:inherit}@media(max-width:640px){.kit-select-menu{max-width:100vw}}`;
