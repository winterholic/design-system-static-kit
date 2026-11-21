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
