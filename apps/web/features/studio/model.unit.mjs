import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, reducer} from './model.ts';
import {loadCore} from './core.ts';

async function ready() {
  await loadCore();
  const state = reducer(initialState, {type: 'boot', state: {
    phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false,
    view: {}, notices: [], recovery: null, storage: {status: 'idle'},
  }});
  return reducer(state, {type: 'edit', intent: {kind: 'start', request: {template: 'dashboard-overview'}}, at: 1});
}

test('failed Core operation preserves document and selected node atomically', async () => {
  let state = await ready();
  state = reducer(state, {type: 'select', path: [0]});
  const doc = state.document.doc;
  const selection = state.session.selection;

  state = reducer(state, {type: 'edit', intent: {kind: 'setAxis', axis: 'unknown-axis', value: 'invalid'}, at: 2});

  assert.equal(state.document.doc, doc);
  assert.equal(state.session.selection, selection);
  assert.equal(state.session.error?.errors[0]?.path, '$args.axes.unknown-axis');
  assert.ok(state.session.error.errors[0].hint);
});

test('theme edit preserves authored content and undo restores the previous document', async () => {
  let state = await ready();
  const before = state.document.doc;

  state = reducer(state, {type: 'edit', intent: {kind: 'setTheme', theme: 'console'}, at: 2});

  assert.equal(state.document.doc.theme, 'console');
  assert.deepEqual(state.document.doc.tree, before.tree);
  assert.deepEqual(state.document.doc.chrome, before.chrome);
  state = reducer(state, {type: 'undo'});
  assert.equal(state.document.doc, before);
});

test('preview-only color scheme changes leave document mode unchanged', async () => {
  const state = await ready();
  const doc = state.document.doc;
  const viewed = reducer(state, {type: 'view', patch: {scheme: 'dark'}});

  assert.equal(viewed.document.doc, doc);
  assert.equal(viewed.document.doc.mode, doc.mode);
  assert.equal(viewed.view.scheme, 'dark');
});

test('failed recovery cleanup leaves corrupt data quarantined and reports the failure', () => {
  const state = reducer(initialState, {type: 'boot', state: {
    phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false,
    view: {}, notices: [], recovery: {raw: '{bad', reason: 'JSON 오류'}, storage: {status: 'idle'},
  }});

  const next = reducer(state, {type: 'recovered', cleared: false});

  assert.equal(next.session.recovery?.raw, '{bad');
  assert.equal(next.session.notices.at(-1)?.level, 'error');
  assert.match(next.session.notices.at(-1)?.text ?? '', /초기화하지 못했습니다/);
});
