import test from 'node:test';
import assert from 'node:assert/strict';
import {isDisposable, mayOverwriteStored} from './protect.ts';

const doc = {name: 'x'};
const template = {doc, origin: {template: 'dashboard-overview', layout: {}, themeVariant: null, palette: null}, picked: {}, modified: false};

test('버려도 되는 문서는 수정하지 않았고 템플릿에서 만들었고 직접 고른 축이 없는 문서뿐이다', () => {
  assert.equal(isDisposable(template), true);
  assert.equal(isDisposable({...template, doc: null}), true);
  assert.equal(isDisposable({...template, modified: true}), false);
  assert.equal(isDisposable({...template, origin: null}), false, '가져온 문서');
  assert.equal(isDisposable({...template, picked: {density: 'compact'}}), false);
});

test('자동 저장은 자기가 읽었거나 쓴 기록, 또는 버려도 되는 기록만 덮어쓴다', () => {
  const protectedWork = {...template, modified: true};
  assert.equal(mayOverwriteStored('t1', null), true, '기록이 없으면 쓴다');
  assert.equal(mayOverwriteStored('t1', {savedAt: 't1', work: protectedWork}), true, '이 세션이 쓴 기록');
  assert.equal(mayOverwriteStored('t1', {savedAt: 't2', work: protectedWork}), false, '다른 탭의 작업');
  assert.equal(mayOverwriteStored('t1', {savedAt: 't2', work: {...template, origin: null}}), false, '다른 탭이 가져온 문서');
  assert.equal(mayOverwriteStored('t1', {savedAt: 't2', work: template}), true, '다른 탭의 기록이 수정 전 템플릿 문서');
  assert.equal(mayOverwriteStored('t1', {savedAt: 't2', work: null}), false, '읽을 수 없는 기록은 보존한다');
  assert.equal(mayOverwriteStored(null, {savedAt: 't2', work: protectedWork}), false, '이 세션이 아무것도 읽거나 쓰지 않았다');
});
