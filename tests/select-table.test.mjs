import test from 'node:test';
import assert from 'node:assert/strict';
import {selectContract, renderSelect, selectRuntime} from '../src/materials/select.mjs';
import {tableContract, renderDataTable, tableRuntime, attachTable, tableStyles} from '../src/materials/table.mjs';
import {catalogRegistry} from '../src/materials/index.mjs';

test('Select contract names legal variants, states, tokens, and unsupported combinations', () => {
  assert.deepEqual(selectContract.variants.mode, ['single', 'multiple']);
  assert.ok(selectContract.variants.search.includes('async'));
  assert.ok(selectContract.states.includes('loading') && selectContract.states.includes('error'));
  assert.ok(selectContract.forbidden.includes('multiple + async'));
  assert.ok(selectContract.tokens.includes('--kit-action'));
  const html = renderSelect({id:'region', label:'지역', options:[{value:'kr',label:'한국',group:'아시아'}]});
  assert.match(html, /role="combobox"/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /한국/);
  assert.match(html, /role="group" aria-label="아시아"/);
  assert.match(renderSelect({id:'off',label:'사용 안 함',options:[],disabled:true}), /data-state="disabled"/);
  assert.match(renderSelect({id:'wait',label:'불러오기',options:[],state:'loading'}), /aria-busy="true"/);
});

test('Select runtime implements keyboard selection, escape close, and focus return without network access', () => {
  for (const token of ['ArrowDown', 'ArrowUp', 'Escape', 'aria-activedescendant', 'focus()', 'onOptionsRequest']) assert.ok(selectRuntime.includes(token), token);
  assert.doesNotMatch(selectRuntime, /fetch\s*\(/);
  assert.doesNotMatch(selectRuntime, /\bvalidOptions\b/);
});

test('Table contract and renderer preserve column, row, state, and responsive contracts', () => {
  assert.deepEqual(tableContract.variants.density, ['compact', 'comfortable', 'spacious']);
  assert.ok(tableContract.states.includes('empty') && tableContract.states.includes('error'));
  const html = renderDataTable({id:'people', columns:[{id:'name',label:'이름'}, {id:'team',label:'팀'}], rows:[{name:'민지',team:'디자인'}], selectable:true, sortable:true});
  assert.match(html, /role="grid"/);
  assert.match(html, /aria-sort=/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /민지/);
  assert.throws(() => renderDataTable({id:'x', columns:[{id:'bad id',label:'x'}, {id:'y',label:'Y'}], rows:[]}), /column/i);
  assert.throws(() => renderDataTable({id:'x', columns:[{id:'x',label:'X'},{id:'y',label:'Y'}], rows:[{x:'ok',y:'ok',extra:'no'}]}), /row/i);
});

test('Table runtime toggles sort and row selection; both renderers represent async states', () => {
  for (const token of ['aria-sort', 'aria-selected', 'sortChange', 'selectionChange']) assert.ok(tableRuntime.includes(token), token);
  const columns=[{id:'x',label:'X'}, {id:'y',label:'Y'}];
  assert.match(renderDataTable({id:'t',columns,rows:[],state:'loading'}), /aria-busy="true"/);
  assert.match(renderDataTable({id:'t',columns,rows:[],state:'error',message:'실패'}), /실패/);
});

test('select all updates row states without treating the header checkbox as a row', () => {
  const listeners = {}, selected = [];
  const rows = ['a', 'b'].map(id => ({checked: false, dataset: {selectRow: id}, closest: () => ({setAttribute: (name, value) => { rowsState[id] = value; }})}));
  const rowsState = {};
  const root = {addEventListener: (name, fn) => { listeners[name] = fn; }, querySelectorAll: selector => selector === '[data-select-row]' ? rows : selector === '[data-select-row]:checked' ? rows.filter(x => x.checked) : []};
  attachTable(root, {selectionChange: event => selected.push(event.selected)});
  listeners.change({target: {checked: true, matches: selector => selector === '[data-select-all]'}});
  assert.deepEqual(rows.map(row => row.checked), [true, true]);
  assert.deepEqual(rowsState, {a: 'true', b: 'true'});
  assert.deepEqual(selected, [['a', 'b']]);
});

test('table sort handler ignores controls detached from a header row', () => {
  let click;
  const root = {addEventListener: (name, fn) => { if (name === 'click') click = fn; }, querySelector: () => null, querySelectorAll: () => []};
  attachTable(root);
  assert.doesNotThrow(() => click({target: {closest: () => ({getAttribute: () => 'none', closest: () => null})}}));
});

test('priority table hides all selected columns below their declared breakpoint without labeling selection cells', () => {
  assert.match(tableStyles, /max-width:640px[^}]*data-hide-below=\\?"800px/);
  assert.match(tableStyles, /max-width:640px[^}]*data-hide-below=\\?"900px/);
  assert.match(tableStyles, /:has\(\[data-select-row\]\):before\{content:none\}/);
});

test('Select and Table materials are registered with 2.6.0 contracts and compiled output baselines remain available', () => {
  const registry = catalogRegistry();
  assert.equal(registry.get('component:select-control').since, '2.6.0');
  assert.equal(registry.get('component:data-table').since, '2.6.0');
  assert.equal(registry.get('component:select-control').quality.status, 'verified');
  assert.equal(registry.get('component:data-table').quality.status, 'verified');
  assert.ok(registry.get('component:select-control').tokens.length);
  assert.ok(registry.get('component:data-table').examples.length);
});
