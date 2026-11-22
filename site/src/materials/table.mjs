import {defineMaterial} from './contract.mjs';
import {escapeHTML as e} from '../render/util.mjs';
import {deriveTableDesign} from '../table-design.mjs';

export const tableContract = Object.freeze({
  id: 'component:data-table', version: '1.0.0', since: '2.6.0',
  variants: Object.freeze({density: ['compact', 'comfortable', 'spacious'], sortable: [false, true], selectable: [false, true], responsive: ['scroll', 'priority'], state: ['ready', 'empty', 'loading', 'error', 'partial']}),
  defaults: Object.freeze({density: 'comfortable', state: 'ready', responsive: 'scroll', sortable: false, selectable: false}),
  states: Object.freeze(['ready', 'empty', 'loading', 'error', 'partial']),
  tokens: Object.freeze(['--kit-action', '--kit-surface', '--kit-text', '--kit-muted', '--kit-border', '--kit-focus', '--kit-soft', '--kit-danger', '--kit-radius', '--kit-t-small', '--kit-sp-tight', '--kit-sp-near', '--kit-sp-item']),
  unsupported: Object.freeze(['pagination', 'virtual scrolling', 'column resizing', 'editable cells', 'server sorting']),
});

export const tableMaterial = defineMaterial({
  id: tableContract.id, kind: 'component', category: 'form-data-feedback', label: '데이터 테이블', since: '2.6.0',
  render: {module: 'src/materials/table.mjs', export: 'renderDataTable', key: 'data-table'},
  variants: tableContract.variants, defaults: tableContract.defaults, tokens: tableContract.tokens,
  // The caller supplies state when rendering data; the runtime only handles sorting and selection.
  states: {values: tableContract.states, transitions: [
    {from: 'loading', to: 'ready', trigger: 'rows received'}, {from: 'loading', to: 'empty', trigger: 'empty result'}, {from: 'loading', to: 'error', trigger: 'request rejected'},
    {from: 'ready', to: 'partial', trigger: 'partial result'},
  ]},
  responsive: {strategy: 'container', breakpoints: ['640px', '800px', '900px'], note: 'scroll 모드는 기존 table-design 최소 읽기 폭을 유지하고 priority 모드는 열별 hideBelow 계약을 적용한다.'},
  a11y: {rules: ['R05', 'R06', 'R15'], role: 'table', keyboard: 'Tab moves between controls, Enter or Space sorts, Space toggles checkboxes'},
  validation: {rules: ['R06', 'R15'], codes: ['TABLE_COLUMNS', 'TABLE_ROWS']},
  examples: [{id: 'projects', columns: [{id: 'name', label: '프로젝트'}, {id: 'status', label: '상태'}], rows: [{name: 'Materials', status: '진행'}]}],
  quality: {status: 'verified', evidence: ['tests/select-table.test.mjs:28']},
  tags: ['data', 'data-table', 'layout:table-content-1', ...tableContract.unsupported.map(x => `unsupported:${x}`)],
  ext: {nodeType: 'data-table', group: 'data', fields: ['density', 'sortable', 'selectable', 'responsive', 'state'], required: ['id', 'columns', 'rows']},
});

function checkedColumns(columns) {
  if (!Array.isArray(columns) || columns.length < 2 || columns.length > 8) throw new TypeError('Table requires 2–8 columns');
  const ids = new Set();
  for (const c of columns) {
    if (!c || !/^[a-z][a-z0-9-]*$/.test(c.id ?? '') || typeof c.label !== 'string' || !c.label.trim() || ids.has(c.id)) throw new TypeError('Invalid or duplicate table column definition');
    ids.add(c.id);
    if (c.sortable !== undefined && typeof c.sortable !== 'boolean') throw new TypeError('Column sortable must be boolean');
    if (c.hideBelow !== undefined && !['640px', '800px', '900px'].includes(c.hideBelow)) throw new TypeError('Unsupported hideBelow breakpoint');
  }
  return ids;
}

export function renderDataTable({id, columns, rows, density = 'comfortable', state, message = '', selectable = false, sortable = false, responsive = 'scroll', selected = []}) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) throw new TypeError('Table requires a safe id');
  const ids = checkedColumns(columns);
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row) || [...ids].some(key => !Object.hasOwn(row, key)) || Object.keys(row).some(key => key !== 'id' && !ids.has(key)) || Object.values(row).some(v => v != null && !['string', 'number', 'boolean'].includes(typeof v)))) throw new TypeError('Every table row must provide only scalar values for defined columns');
  if (!['compact', 'comfortable', 'spacious'].includes(density)) throw new TypeError('Invalid table density');
  if (!['scroll', 'priority'].includes(responsive)) throw new TypeError('Invalid responsive column policy');
  const resolvedState = state ?? (rows.length ? 'ready' : 'empty');
  if (!tableContract.states.includes(resolvedState)) throw new TypeError('Invalid table state');
  if (resolvedState === 'ready' && !rows.length) throw new TypeError('ready table requires rows');
  if (resolvedState === 'empty' && rows.length) throw new TypeError('empty table cannot contain rows');
  const design = deriveTableDesign({type: 'table', columns: columns.map(c => c.label), rows: rows.map(row => columns.map(c => String(row[c.id] ?? '')))}, {facts: {density}, values: {cellSpace: 'item'}});
  const cells = (row, index) => columns.map((c, ci) => `<td data-column="${e(c.id)}" data-sort-value="${e(String(row[c.id] ?? ''))}" data-column-align="${design.columns[ci].align}" data-column-wrap="${design.columns[ci].wrap}"${c.hideBelow ? ` data-hide-below="${c.hideBelow}"` : ''} data-label="${e(c.label)}">${e(row[c.id] ?? '')}</td>`).join('');
  const selectHead = selectable ? `<th scope="col"><input type="checkbox" aria-label="모든 행 선택" data-select-all></th>` : '';
  const headers = columns.map(c => `<th scope="col"${c.hideBelow ? ` data-hide-below="${c.hideBelow}"` : ''}>${sortable && c.sortable !== false ? `<button type="button" data-sort="${e(c.id)}">${e(c.label)}</button>` : e(c.label)}</th>`).join('');
  const body = rows.map((row, i) => `<tr data-row="${i}"${selected.includes(String(row.id ?? i)) ? ' data-selected' : ''}>${selectable ? `<td><input type="checkbox" aria-label="${e(String(row[columns[0].id] ?? `행 ${i + 1}`))} 선택" data-select-row="${e(String(row.id ?? i))}"${selected.includes(String(row.id ?? i)) ? ' checked' : ''}></td>` : ''}${cells(row, i)}</tr>`).join('');
  const stateHTML = resolvedState === 'ready' || resolvedState === 'partial' ? '' : `<div class="kit-table-state" data-state="${resolvedState}" role="${resolvedState === 'error' ? 'alert' : 'status'}"${resolvedState === 'loading' ? ' aria-busy="true"' : ''}><strong>${resolvedState === 'loading' ? '불러오는 중입니다.' : resolvedState === 'empty' ? '표시할 항목이 없습니다.' : e(message || '데이터를 불러오지 못했습니다.')}</strong></div>`;
  const tableHTML = ['ready', 'partial'].includes(resolvedState) ? `<div class="kit-table-scroll" tabindex="0" role="region" aria-label="데이터 표"><table data-density="${density}" data-responsive="${responsive}" data-table-min="${design.minimumWidth}"><thead><tr>${selectHead}${headers}</tr></thead><tbody>${body}</tbody></table></div>` : '';
  return `<section class="kit-data-table" id="${e(id)}" data-density="${density}" data-responsive="${responsive}">${stateHTML}${tableHTML}</section>`;
}

export function attachTable(root, {sortChange, selectionChange} = {}) {
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-sort]');
    const header = button?.closest('th');
    if (!header) return;
    const table = header.closest('table');
    const body = table?.tBodies[0];
    if (!body) return;
    const next = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    table.querySelector('th[aria-sort]')?.removeAttribute('aria-sort');
    header.setAttribute('aria-sort', next);
    const index = header.cellIndex;
    const rows = [...body.rows];
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
    rows.sort((a, b) => collator.compare(a.cells[index]?.dataset.sortValue ?? '', b.cells[index]?.dataset.sortValue ?? '') * (next === 'ascending' ? 1 : -1));
    rows.forEach(row => body.append(row));
    sortChange?.({column: button.dataset.sort, direction: next});
  });
  root.addEventListener('change', event => {
    const all = event.target.matches('[data-select-all]'), row = event.target.matches('[data-select-row]');
    if (all) root.querySelectorAll('[data-select-row]').forEach(box => { box.checked = event.target.checked; box.closest('tr').toggleAttribute('data-selected', box.checked); });
    if (row) event.target.closest('tr').toggleAttribute('data-selected', event.target.checked);
    if (all || row) selectionChange?.({selected: [...root.querySelectorAll('[data-select-row]:checked')].map(box => box.dataset.selectRow)});
  });
}

export const tableRuntime = attachTable.toString();
export const tableStyles = `.kit-data-table{min-width:0;color:var(--kit-text)}.kit-table-scroll{max-width:100%;overflow:auto;overscroll-behavior-inline:contain;border:1px solid var(--kit-border);border-radius:var(--kit-radius)}.kit-data-table table{width:100%;border-collapse:collapse;table-layout:auto}.kit-data-table th,.kit-data-table td{padding:var(--kit-sp-near) var(--kit-sp-item);border-bottom:1px solid var(--kit-border);text-align:start}.kit-data-table thead th{position:sticky;top:0;background:var(--kit-surface);font-size:var(--kit-t-small);color:var(--kit-muted)}.kit-data-table tbody tr:hover{background:var(--kit-soft)}.kit-data-table tbody tr[data-selected]{background:var(--kit-table-selected,var(--kit-soft))}.kit-data-table td[data-column-align=end]{text-align:end;font-variant-numeric:tabular-nums}.kit-data-table [data-sort]{border:0;background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}.kit-data-table [data-sort]:focus-visible,.kit-data-table input:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.kit-data-table[data-density=compact] :is(th,td){padding-block:var(--kit-sp-tight)}.kit-data-table[data-density=spacious] :is(th,td){padding-block:var(--kit-sp-item)}.kit-table-state{padding:20px;color:var(--kit-muted)}.kit-table-state[data-state=error]{color:var(--kit-danger)}.kit-table-state[aria-busy=true]{opacity:.75}@media(max-width:640px){.kit-data-table[data-responsive=priority] [data-hide-below="640px"],.kit-data-table[data-responsive=priority] [data-hide-below="800px"],.kit-data-table[data-responsive=priority] [data-hide-below="900px"]{display:none}.kit-data-table[data-responsive=priority] td:before{content:attr(data-label) ': ';font-size:var(--kit-t-small);color:var(--kit-muted)}.kit-data-table[data-responsive=priority] td:has([data-select-row]):before{content:none}.kit-table-scroll{border-radius:calc(var(--kit-radius) * .7)}}@media(min-width:641px) and (max-width:800px){.kit-data-table[data-responsive=priority] [data-hide-below="800px"],.kit-data-table[data-responsive=priority] [data-hide-below="900px"]{display:none}}@media(min-width:641px) and (max-width:900px){.kit-data-table[data-responsive=priority] [data-hide-below="900px"]{display:none}}`;
