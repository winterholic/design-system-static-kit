import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, reducer} from './model.ts';
import {core, loadCore} from './core.ts';

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

test('undo and redo walk the same document history and a new edit drops the redo stack', async () => {
  let state = await ready();
  const start = state.document.doc;
  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '첫 이름'}, at: 2});
  const renamed = state.document.doc;
  state = reducer(state, {type: 'edit', intent: {kind: 'setTheme', theme: 'console'}, at: 3});
  const themed = state.document.doc;

  state = reducer(state, {type: 'undo'});
  assert.equal(state.document.doc, renamed);
  state = reducer(state, {type: 'undo'});
  assert.equal(state.document.doc, start);
  assert.equal(state.session.undo.length, 0);
  state = reducer(state, {type: 'redo'});
  state = reducer(state, {type: 'redo'});
  assert.equal(state.document.doc, themed);

  state = reducer(state, {type: 'undo'});
  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '다른 이름'}, at: 4});
  assert.equal(state.session.redo.length, 0);
});

test('template replacement is undoable and restores origin, modified flag and document together', async () => {
  let state = await ready();
  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '내 이름'}, at: 2});
  const authored = state.document.doc, origin = state.session.origin;
  assert.equal(state.session.modified, true);

  state = reducer(state, {type: 'edit', intent: {kind: 'replaceTemplate', template: 'saas-landing', keepAppearance: false}, at: 3});
  assert.equal(state.session.origin.template, 'saas-landing');
  assert.equal(state.session.modified, false);

  state = reducer(state, {type: 'undo'});
  assert.equal(state.document.doc, authored);
  assert.deepEqual(state.session.origin, origin);
  assert.equal(state.session.modified, true);
});

test('preview settings are independent of document edits, undo and redo', async () => {
  let state = await ready();
  state = reducer(state, {type: 'view', patch: {device: 390, scheme: 'dark', scaleMode: 'actual', pane: 'preview'}});
  const view = {device: state.view.device, scheme: state.view.scheme, scaleMode: state.view.scaleMode, pane: state.view.pane};
  const before = state.document.doc;

  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '보기 설정 독립'}, at: 2});
  state = reducer(state, {type: 'undo'});
  state = reducer(state, {type: 'redo'});
  assert.deepEqual({device: state.view.device, scheme: state.view.scheme, scaleMode: state.view.scaleMode, pane: state.view.pane}, view);
  assert.equal(state.document.doc.mode, before.mode);

  const doc = state.document.doc, undo = state.session.undo.length;
  state = reducer(state, {type: 'view', patch: {device: 1280, scheme: 'document'}});
  assert.equal(state.document.doc, doc);
  assert.equal(state.session.undo.length, undo);
});

// ---- 사용자 작업 보호: needsConfirm은 protect.ts의 한 규칙이다 -----------------------------------------
import {needsConfirm} from './model.ts';

async function imported(state) {
  const text = JSON.stringify({...state.document.doc, name: '가져온 작업'});
  return reducer(state, {type: 'edit', intent: {kind: 'import', text}, at: 10});
}

test('needsConfirm: 수정하지 않은 템플릿 문서는 확인 없이 바꾸고, 수정하면 확인을 받는다', async () => {
  let state = await ready();
  assert.equal(needsConfirm(state), false);
  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '내 이름'}, at: 2});
  assert.equal(needsConfirm(state), true);
});

test('needsConfirm: 가져온 문서는 수정하기 전에도 사용자의 작업이라 확인을 받는다(템플릿 바꾸기·초기화·다시 가져오기·URL 시작)', async () => {
  let state = await imported(await ready());
  assert.equal(state.session.origin, null);
  assert.equal(state.session.modified, false);
  assert.equal(needsConfirm(state), true);
  // 확인한 뒤 템플릿으로 바꾸면 다시 만들 수 있는 문서가 되어 확인이 필요 없다.
  const replaced = reducer(state, {type: 'edit', intent: {kind: 'replaceTemplate', template: 'saas-landing', keepAppearance: false}, at: 11});
  assert.equal(needsConfirm(replaced), false);
  const reset = reducer(state, {type: 'edit', intent: {kind: 'reset'}, at: 11});
  assert.equal(needsConfirm(reset), false);
  const started = reducer(state, {type: 'edit', intent: {kind: 'start', request: {template: 'saas-landing'}}, at: 11});
  assert.equal(needsConfirm(started), false);
});

test('needsConfirm: 실행 취소·다시 실행이 가져온 작업을 되살리면 다시 확인 대상이 된다', async () => {
  let state = await imported(await ready());
  state = reducer(state, {type: 'edit', intent: {kind: 'reset'}, at: 11});
  assert.equal(needsConfirm(state), false);
  state = reducer(state, {type: 'undo'});
  assert.equal(state.session.origin, null);
  assert.equal(needsConfirm(state), true);
  state = reducer(state, {type: 'redo'});
  assert.equal(needsConfirm(state), false);
  // 템플릿 문서를 고치고 실행 취소로 수정 전으로 돌아가면 확인이 필요 없다. 다시 실행하면 필요하다.
  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '고친 이름'}, at: 12});
  assert.equal(needsConfirm(state), true);
  state = reducer(state, {type: 'undo'});
  assert.equal(needsConfirm(state), false);
  state = reducer(state, {type: 'redo'});
  assert.equal(needsConfirm(state), true);
});

test('needsConfirm: 직접 고른 스타일 축이 있으면 확인 대상이다', async () => {
  let state = await ready();
  state = reducer(state, {type: 'edit', intent: {kind: 'setAxis', axis: 'density', value: 'compact'}, at: 2});
  assert.equal(needsConfirm(state), true);
  const wiped = {...state, session: {...state.session, modified: false}};
  assert.equal(needsConfirm(wiped), true, 'modified 표시만 내려도 picked가 남아 있으면 보호한다');
});

test('needsConfirm: 미리보기 설정과 선택 이동은 판정을 바꾸지 않는다', async () => {
  const base = await imported(await ready());
  let state = reducer(base, {type: 'view', patch: {device: 390, scheme: 'dark', scaleMode: 'actual', pane: 'preview', tab: 'design'}});
  state = reducer(state, {type: 'select', path: [0]});
  assert.equal(needsConfirm(state), true);
  const tmpl = await ready();
  const viewed = reducer(reducer(tmpl, {type: 'view', patch: {scheme: 'dark', device: 390}}), {type: 'select', path: [0]});
  assert.equal(needsConfirm(viewed), false);
  assert.equal(viewed.document.doc, tmpl.document.doc);
});

test('needsConfirm: 시작 화면(문서 없음)은 확인이 필요 없다', () => {
  assert.equal(needsConfirm(initialState), false);
});

test('start from Materials applies axes and the 2.6.0 color palette atomically, and a banned axis rejects the whole request', async () => {
  await loadCore();
  const fresh = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});

  const ok = reducer(fresh, {type: 'edit', intent: {kind: 'start', request: {axes: {radius: 'round'}, colorPalette: 'static-kit'}}, at: 1});
  assert.equal(ok.document.doc.radius, 'round');
  assert.equal(ok.document.doc.colorPalette, 'static-kit');
  assert.equal(ok.document.doc.catalogVersion, '2.6.0');
  assert.equal(ok.session.picked.radius, 'round');

  const bad = reducer(fresh, {type: 'edit', intent: {kind: 'start', request: {axes: {radius: 'no-such-value'}, colorPalette: 'static-kit'}}, at: 1});
  assert.equal(bad.document.doc, null);
  assert.equal(bad.session.error?.errors[0]?.code, 'ENUM');

  const unknown = reducer(fresh, {type: 'edit', intent: {kind: 'start', request: {colorPalette: 'not-a-palette'}}, at: 1});
  assert.equal(unknown.document.doc, null);
});

test('Studio can explicitly start a 2.6.0 document or assemble a Design Profile through Core', async () => {
  await loadCore();
  const fresh = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});
  const versioned = reducer(fresh, {type: 'edit', intent: {kind: 'start', request: {catalogVersion: '2.6.0'}}, at: 1});
  assert.equal(versioned.document.doc.catalogVersion, '2.6.0');

  const profiled = reducer(fresh, {type: 'edit', intent: {kind: 'start', request: {profile: 'erp'}}, at: 1});
  assert.equal(profiled.document.doc.catalogVersion, '2.6.0');
  assert.equal(profiled.document.doc.profile, 'erp');
  assert.equal(profiled.document.validity.ok, true);
  assert.equal(profiled.session.origin, null);
});

test('Components start inserts the registered 2.6.0 node with the selected material axes', async () => {
  let state = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});
  await loadCore();
  state = reducer(state, {type: 'edit', intent: {kind: 'start', request: {catalogVersion: '2.6.0', component: 'select-control', componentAxes: {mode: 'multiple', search: 'local', maxMenuHeight: '192'}}}, at: 1});
  const node = state.document.doc?.tree.children.find(child => child.type === 'select-control');
  assert.deepEqual({type: node?.type, mode: node?.mode, search: node?.search, maxMenuHeight: node?.maxMenuHeight}, {type: 'select-control', mode: 'multiple', search: 'local', maxMenuHeight: 192});
  const html = core().service.compileBlueprint(state.document.doc, {include: ['html']});
  assert.equal(html.ok, true);
  assert.match(html.value.html, /role="combobox"/);
  assert.equal(state.session.error, null);
  assert.equal(state.session.origin, null);
  assert.equal((await import('./model.ts')).needsConfirm(state), true);
});

test('Components map registered data-table boolean axes to the Core yes/no node fields', async () => {
  let state = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});
  await loadCore();
  state = reducer(state, {type: 'edit', intent: {kind: 'start', request: {catalogVersion: '2.6.0', component: 'data-table', componentAxes: {density: 'compact', sortable: 'true', selectable: 'true', responsive: 'scroll', state: 'ready'}}}, at: 1});
  const node = state.document.doc?.tree.children.find(child => child.type === 'data-table');
  assert.equal(node?.density, 'compact', JSON.stringify(state.session.error?.errors));
  assert.equal(node?.sortable, 'yes');
  assert.equal(node?.selectable, 'yes');
  const html = core().service.compileBlueprint(state.document.doc, {include: ['html']});
  assert.equal(html.ok, true);
  assert.match(html.value.html, /data-density="compact"/);
});

test('Components reject a forbidden selected variant combination with Core diagnostics', async () => {
  let state = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});
  await loadCore();
  state = reducer(state, {type: 'edit', intent: {kind: 'start', request: {catalogVersion: '2.6.0', component: 'select-control', componentAxes: {mode: 'multiple', search: 'async'}}}, at: 1});
  assert.equal(state.document.doc, null);
  assert.ok(state.session.error?.errors.length);
  assert.match(state.session.error.errors[0].code, /SELECT|VARIANT|COMBO/);
});

test('applying a 2.6.0 material upgrades the document without replacing its authored work and is undoable', async () => {
  let state = await ready();
  state = reducer(state, {type: 'edit', intent: {kind: 'rename', name: '작성 중인 화면'}, at: 2});
  state = reducer(state, {type: 'select', path: [0]});
  const authoredDoc = state.document.doc;
  const authoredVersion = authoredDoc.catalogVersion;
  const originBefore = state.session.origin;
  const originalHtml = core().service.compileBlueprint(authoredDoc, {include: ['html']}).value.html;
  state = reducer(state, {type: 'edit', intent: {kind: 'setMaterial', field: 'colorPalette', value: 'static-kit'}, at: 3});

  assert.equal(state.document.doc.catalogVersion, '2.6.0');
  assert.equal(state.document.doc.colorPalette, 'static-kit');
  assert.equal(state.document.doc.name, '작성 중인 화면');
  assert.deepEqual(state.document.doc.tree, authoredDoc.tree);
  assert.equal(state.document.doc.name, authoredDoc.name);
  assert.deepEqual(state.session.origin, originBefore);
  assert.deepEqual(state.session.selection, [0]);
  assert.equal(state.session.modified, true);
  const colorHtml = core().service.compileBlueprint(state.document.doc, {include: ['html']}).value.html;
  assert.notEqual(colorHtml, originalHtml, 'the selected color material reaches the compiled preview/export');

  state = reducer(state, {type: 'edit', intent: {kind: 'setMaterial', field: 'typeRoles', value: 'marketing'}, at: 4});
  assert.equal(state.document.doc.typeRoles, 'marketing');
  const roleHtml = core().service.compileBlueprint(state.document.doc, {include: ['html']}).value.html;
  assert.notEqual(roleHtml, colorHtml, 'the selected role typography reaches the compiled preview/export');

  const applied = state.document.doc;
  state = reducer(state, {type: 'undo'});
  assert.equal(state.document.doc.colorPalette, 'static-kit');
  assert.equal(state.document.doc.typeRoles, undefined);
  state = reducer(state, {type: 'redo'});
  assert.equal(state.document.doc, applied);
});

test('an incompatible 2.6.0 material is rejected with Core diagnostics and leaves the document unchanged', async () => {
  const state = await ready();
  const before = state.document.doc;

  const next = reducer(state, {type: 'edit', intent: {kind: 'setMaterial', field: 'profile', value: 'erp'}, at: 2});

  assert.equal(next.document.doc, before);
  assert.equal(next.session.undo.length, state.session.undo.length);
  assert.ok(next.session.error?.errors.length);
});

test('applying Materials after JSON import keeps the imported document protected through undo and redo', async () => {
  let state = await ready();
  const imported = {...state.document.doc, name: '가져온 화면', catalogVersion: '2.6.0', colorPalette: 'static-kit'};
  state = reducer(state, {type: 'edit', intent: {kind: 'import', text: JSON.stringify(imported)}, at: 2});
  const importedDoc = state.document.doc;
  assert.equal(state.session.origin, null);

  state = reducer(state, {type: 'edit', intent: {kind: 'setMaterial', field: 'typeRoles', value: 'marketing'}, at: 3});
  const materialDoc = state.document.doc;
  assert.equal(state.document.doc.name, '가져온 화면');
  assert.deepEqual(state.document.doc.tree, importedDoc.tree);
  assert.equal(state.session.origin, null);
  assert.equal(needsConfirm(state), true);

  state = reducer(state, {type: 'undo'});
  assert.equal(state.document.doc, importedDoc);
  assert.equal(state.session.origin, null);
  state = reducer(state, {type: 'redo'});
  assert.equal(state.document.doc, materialDoc);
  assert.equal(needsConfirm(state), true);
});
