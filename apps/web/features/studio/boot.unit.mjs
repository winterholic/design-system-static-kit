import test from 'node:test';
import assert from 'node:assert/strict';
import {computeBoot} from './boot.ts';
import {initialState, reducer} from './model.ts';
import {loadCore} from './core.ts';
import {parseUrl} from './url.ts';
import {SCHEMA_VERSION} from './storage.ts';

async function templateDoc(template = 'dashboard-overview') {
  await loadCore();
  const boot = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});
  return reducer(boot, {type: 'edit', intent: {kind: 'start', request: {template}}, at: 1});
}

const origin = {template: 'dashboard-overview', layout: {}, themeVariant: null, palette: null};
async function stored(patch) {
  const state = await templateDoc();
  const data = {schema: SCHEMA_VERSION, savedAt: '2026-11-21T00:00:00.000Z', doc: state.document.doc, origin, picked: {}, selection: [], modified: false, ...patch};
  return {doc: state.document.doc, loaded: {kind: 'saved', raw: JSON.stringify(data), data}};
}
const start = parseUrl('?template=saas-landing');

test('수정하지 않은 템플릿 문서는 URL 시작 인자가 바로 바꾼다', async () => {
  const {loaded} = await stored({});
  const boot = computeBoot(start, loaded);
  assert.equal(boot.view.dialog, null);
  assert.equal(boot.origin?.template, 'saas-landing');
});

test('Materials가 요청한 2.6.0 재료 시작 상태도 작업 중인 문서를 덮지 않고 기존 확인을 거친다', async () => {
  const {doc, loaded} = await stored({modified: true});
  const parsed = parseUrl('?catalogVersion=2.6.0&colorPalette=static-kit&typeRoles=marketing');
  const boot = computeBoot(parsed, loaded);
  assert.deepEqual(boot.doc, doc);
  assert.deepEqual(boot.view.dialog, {kind: 'confirm', action: {kind: 'start', request: {catalogVersion: '2.6.0', colorPalette: 'static-kit', typeRoles: 'marketing'}}});
});

for (const [name, patch] of [
  ['수정한 문서', {modified: true}],
  ['가져온 문서(출처 없음)', {origin: null}],
  ['이어받은 스타일 선택이 있는 문서', {picked: {density: 'compact'}}],
]) {
  test(`${name}는 URL 시작 인자를 적용하지 않고 확인을 요구한다`, async () => {
    const {doc, loaded} = await stored(patch);
    const boot = computeBoot(start, loaded);
    assert.deepEqual(boot.view.dialog, {kind: 'confirm', action: {kind: 'start', request: {template: 'saas-landing'}}});
    assert.deepEqual(boot.doc, doc);
    assert.equal(boot.origin?.template, patch.origin === null ? undefined : 'dashboard-overview');
  });
}

test('저장 문서가 없으면 URL 시작 인자를 확인 없이 연다', async () => {
  await loadCore();
  const boot = computeBoot(start, {kind: 'none'});
  assert.equal(boot.view.dialog, null);
  assert.equal(boot.origin?.template, 'saas-landing');
});

test('주소 시작 인자와 확인 대화상자는 같은 규칙을 쓴다: 대화상자가 필요한 문서는 needsConfirm도 참이다', async () => {
  const {needsConfirm} = await import('./model.ts');
  for (const patch of [{}, {modified: true}, {origin: null}, {picked: {density: 'compact'}}]) {
    const {loaded} = await stored(patch);
    const unrelated = computeBoot(parseUrl(''), loaded);
    const state = reducer(initialState, {type: 'boot', state: unrelated});
    const asked = computeBoot(start, loaded).view.dialog !== null;
    assert.equal(needsConfirm(state), asked, JSON.stringify(patch));
  }
});

// ---- 공유 링크(주소 해시)와 실행 취소 기록 복원
async function sharedPayload(patch = {}) {
  const state = await templateDoc('saas-landing');
  return {v: 1, doc: state.document.doc, origin: {template: 'saas-landing', layout: {}, themeVariant: null, palette: null}, picked: {}, modified: false, ...patch};
}
const noUrl = parseUrl('');

test('저장된 작업이 없으면 공유 링크의 작업을 그대로 연다(다른 브라우저)', async () => {
  const payload = await sharedPayload({modified: true, picked: {radius: 'round'}});
  const boot = computeBoot(noUrl, {kind: 'none'}, {shared: {ok: true, payload}});
  assert.equal(boot.phase, 'ready');
  assert.equal(boot.origin.template, 'saas-landing');
  assert.equal(boot.modified, true, '링크의 수정 여부가 이어진다');
  assert.deepEqual(boot.picked, {radius: 'round'});
  assert.deepEqual(boot.undo, []);
  assert.equal(boot.view.dialog, null);
});

test('저장된 작업이 손댄 문서면 링크가 덮어쓰기 전에 묻는다', async () => {
  const {loaded} = await stored({modified: true});
  const payload = await sharedPayload();
  const boot = computeBoot(noUrl, loaded, {shared: {ok: true, payload}});
  assert.equal(boot.view.dialog?.kind, 'confirm');
  assert.equal(boot.view.dialog.action.kind, 'shared');
  assert.equal(boot.origin.template, 'dashboard-overview', '확인 전에는 내 작업이 그대로다');
});

test('같은 작업을 가리키는 링크나 새로고침은 저장된 기록과 선택을 그대로 쓴다', async () => {
  const state = await templateDoc();
  const history = {undo: [{doc: state.document.doc, origin, picked: {}, selection: [], modified: false, baseline: 0, at: 1}], redo: [], baselines: [state.document.doc], baseline: 0};
  const {doc, loaded} = await stored({modified: true, selection: [0], history});
  const same = computeBoot(noUrl, loaded, {shared: {ok: true, payload: {v: 1, doc, origin, picked: {}, modified: true}}});
  assert.equal(same.view.dialog, null);
  assert.deepEqual(same.selection, [0]);
  assert.equal(same.undo.length, 1, '실행 취소 기록이 복원된다');
  const other = await sharedPayload();
  const reload = computeBoot(noUrl, loaded, {shared: {ok: true, payload: other}, sameSession: true});
  assert.equal(reload.view.dialog, null);
  assert.equal(reload.origin.template, 'dashboard-overview', '새로고침은 해시가 아니라 저장된 작업을 쓴다');
  assert.equal(reload.undo.length, 1);
});

test('버려도 되는 문서는 링크가 바로 바꾸고 옛 기록은 비운다', async () => {
  const {loaded} = await stored({});
  const payload = await sharedPayload();
  const boot = computeBoot(noUrl, loaded, {shared: {ok: true, payload}});
  assert.equal(boot.view.dialog, null);
  assert.equal(boot.origin.template, 'saas-landing');
  assert.deepEqual(boot.undo, []);
  assert.equal(boot.baseline, boot.doc);
});

test('읽을 수 없는 링크는 작업을 건드리지 않고 이유를 알린다', async () => {
  const {loaded} = await stored({modified: true});
  const boot = computeBoot(noUrl, loaded, {shared: {ok: false, reason: '공유 링크가 손상되어 읽을 수 없습니다.'}});
  assert.equal(boot.origin.template, 'dashboard-overview');
  assert.ok(boot.notices.some(n => n.level === 'error' && n.text.includes('손상')));
  const bad = await sharedPayload();
  bad.doc = {...bad.doc, catalogVersion: '9.9.9'};
  const invalid = computeBoot(noUrl, {kind: 'none'}, {shared: {ok: true, payload: bad}});
  assert.equal(invalid.phase, 'start');
  assert.ok(invalid.notices.some(n => n.text.includes('검증을 통과하지 못해')));
});

test('공유 링크 확인에서 열기를 고르면 작업이 바뀌고 실행 취소로 돌아온다', async () => {
  const mine = await templateDoc();
  const payload = await sharedPayload({modified: true});
  const opened = reducer(mine, {type: 'edit', intent: {kind: 'openShared', payload}, at: 5});
  assert.equal(opened.session.origin.template, 'saas-landing');
  assert.equal(opened.session.modified, true, '링크의 수정 여부가 이어져 버려도 되는 문서로 오인되지 않는다');
  const back = reducer(opened, {type: 'undo'});
  assert.equal(back.session.origin.template, 'dashboard-overview');
});
