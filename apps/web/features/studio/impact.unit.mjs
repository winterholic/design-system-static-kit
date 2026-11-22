import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeImpact, needsImpact} from './impact.ts';
import {initialState, reducer} from './model.ts';
import {core, loadCore} from './core.ts';

async function oldDoc(template = 'saas-landing') {
  await loadCore();
  let s = reducer(initialState, {type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: {}, notices: [], recovery: null, storage: {status: 'idle'}}});
  s = reducer(s, {type: 'edit', intent: {kind: 'start', request: {template}}, at: 1});
  s = reducer(s, {type: 'edit', intent: {kind: 'setPalette', palette: 'pearl'}, at: 2});
  return s;
}
const ctxOf = s => ({doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, selection: s.session.selection, baseline: s.session.baseline});

test('2.6.0 미만 문서가 재료를 고르거나 업그레이드할 때만 영향 요약이 필요하다', async () => {
  const s = await oldDoc();
  assert.equal(s.document.doc.catalogVersion, '2.4.0');
  assert.equal(needsImpact({kind: 'setMaterial', field: 'typeRoles', value: 'erp'}, s.document.doc), true);
  assert.equal(needsImpact({kind: 'upgrade260'}, s.document.doc), true);
  assert.equal(needsImpact({kind: 'setTheme', theme: 'console'}, s.document.doc), false);
  assert.equal(needsImpact({kind: 'setMaterial', field: 'typeRoles', value: 'erp'}, {...s.document.doc, catalogVersion: '2.6.0'}), false);
  assert.equal(needsImpact({kind: 'upgrade260'}, null), false);
});

test('역할 타이포 선택의 영향: 버전이 올라가고 색 토큰이 바뀌지만 글과 구조는 유지된다', async () => {
  const s = await oldDoc();
  const report = analyzeImpact(core(), ctxOf(s), {kind: 'setMaterial', field: 'typeRoles', value: 'erp'});
  assert.ok(report);
  assert.deepEqual(report.versionBump, {from: '2.4.0', to: '2.6.0'});
  assert.ok(report.changeCount >= 3, `바뀌는 값 ${report.changeCount}`);
  assert.ok(report.changed.some(c => c.label === '역할 타이포그래피'));
  assert.ok(report.changed.some(c => c.label === '문서 버전'));
  assert.ok(report.colorShifts.some(c => c.changed > 0), JSON.stringify(report.colorShifts));
  assert.equal(report.contentLoss, 0);
  assert.match(report.paletteNote, /pearl/);
  assert.equal(report.userEdits, 1, '직접 고른 팔레트 한 곳');
  // 미리 계산만 하고 문서는 건드리지 않는다.
  assert.equal(s.document.doc.catalogVersion, '2.4.0');
});

test('거부될 변경은 영향 요약을 만들지 않는다', async () => {
  const s = await oldDoc();
  assert.equal(analyzeImpact(core(), ctxOf(s), {kind: 'setMaterial', field: 'typeRoles', value: 'no-such-preset'}), null);
});
