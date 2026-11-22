import test from 'node:test';
import assert from 'node:assert/strict';
import {clearSaved, LEGACY_KEY, peekSaved, readStored, SCHEMA_VERSION, STORAGE_KEY, writeSaved} from './storage.ts';

function storage(values = new Map(), overrides = {}) {
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    ...overrides,
  };
}

test('saved Studio documents are versioned and round-trip through the dedicated key', () => {
  const values = new Map();
  globalThis.window = {localStorage: storage(values)};
  const saved = writeSaved({doc: {version: '2.0'}, origin: null, picked: {}, selection: [], modified: false});

  assert.equal(saved.ok, true);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).schema, SCHEMA_VERSION);
  assert.equal(readStored().kind, 'saved');
});

test('legacy key is read without deleting its original value', () => {
  const values = new Map([[LEGACY_KEY, JSON.stringify({blueprint: {version: '2.0'}, sel: {templateId: 'stale'}})]]);
  globalThis.window = {localStorage: storage(values)};

  const loaded = readStored();

  assert.equal(loaded.kind, 'legacy');
  assert.deepEqual(loaded.blueprint, {version: '2.0'});
  assert.ok(values.has(LEGACY_KEY));
});

test('clearSaved reports failure when the browser refuses to clear a corrupt save', () => {
  globalThis.window = {localStorage: storage(new Map(), {removeItem() { throw new DOMException('locked', 'SecurityError'); }})};

  assert.equal(clearSaved(), false);
});

test('storage read preserves malformed saved text for recovery export', () => {
  globalThis.window = {localStorage: storage(new Map([[STORAGE_KEY, '{broken']]))};
  const loaded = readStored();

  assert.equal(loaded.kind, 'corrupt');
  assert.equal(loaded.raw, '{broken');
});

test('peekSaved summarises the stored record so autosave can see another tab\'s work before overwriting it', () => {
  const values = new Map();
  globalThis.window = {localStorage: storage(values)};
  assert.equal(peekSaved(), null);

  const origin = {template: 'dashboard-overview', layout: {}, themeVariant: null, palette: null};
  const saved = writeSaved({doc: {version: '2.0'}, origin, picked: {}, selection: [], modified: true});
  const peek = peekSaved();
  assert.equal(peek.savedAt, saved.savedAt);
  assert.deepEqual(peek.work, {doc: {version: '2.0'}, origin, picked: {}, modified: true});

  values.set(STORAGE_KEY, '{broken');
  assert.deepEqual(peekSaved(), {savedAt: null, work: null});
  values.set(STORAGE_KEY, JSON.stringify({schema: 99, savedAt: 'x', doc: {}}));
  assert.deepEqual(peekSaved(), {savedAt: 'x', work: null});
});

test('실행 취소 기록은 문서와 함께 저장되고 같은 기준 문서 참조로 복원된다', async () => {
  const {parseSaved, packHistory} = await import('./storage.ts');
  const baseline = {name: 'base', tree: {type: 'page', children: []}};
  const mk = (n, extra = {}) => ({doc: {name: 'd' + n, tree: {type: 'page', children: []}}, origin: null, picked: {}, selection: [n], modified: true, baseline, at: n, ...extra});
  const live = {undo: [mk(1), mk(2, {coalesceKey: 'k'})], redo: [mk(3)], baseline};
  const values = new Map();
  globalThis.window = {localStorage: storage(values)};
  assert.equal(writeSaved({doc: {name: 'now'}, origin: null, picked: {}, selection: [], modified: true}, live).ok, true);
  const saved = JSON.parse(values.get(STORAGE_KEY));
  assert.equal(saved.history.baselines.length, 1, '같은 기준 문서는 표에 한 번만');
  const parsed = parseSaved(saved);
  assert.deepEqual(parsed.history.undo.map(e => e.doc.name), ['d1', 'd2']);
  assert.equal(parsed.history.undo[1].coalesceKey, 'k');
  assert.equal(parsed.history.redo[0].doc.name, 'd3');
  assert.equal(parsed.history.undo[0].baseline, parsed.history.baseline, '복원 뒤에도 같은 객체를 가리킨다');
  assert.deepEqual(packHistory({undo: [], redo: [], baseline: null}), {undo: [], redo: [], baselines: [], baseline: null});
});

test('실행 취소 기록은 단계 수와 크기 상한 안에서 최근 단계부터 남는다', async () => {
  const {packHistory, HISTORY_MAX_ENTRIES, HISTORY_BUDGET} = await import('./storage.ts');
  const entry = (n, size) => ({doc: {name: 'd' + n, pad: 'x'.repeat(size)}, origin: null, picked: {}, selection: [], modified: true, baseline: null, at: n});
  const many = Array.from({length: HISTORY_MAX_ENTRIES + 30}, (_, n) => entry(n, 10));
  const packed = packHistory({undo: many, redo: [], baseline: null});
  assert.equal(packed.undo.length, HISTORY_MAX_ENTRIES);
  assert.equal(packed.undo.at(-1).doc.name, 'd' + (many.length - 1), '가장 최근 단계가 남는다');
  const big = Array.from({length: 10}, (_, n) => entry(n, Math.floor(HISTORY_BUDGET / 4)));
  const bounded = packHistory({undo: big, redo: [], baseline: null});
  assert.ok(bounded.undo.length >= 1 && bounded.undo.length < big.length);
  assert.equal(bounded.undo.at(-1).doc.name, 'd9');
});

test('저장 공간이 모자라 기록이 안 들어가면 문서만이라도 저장한다', async () => {
  const values = new Map();
  let calls = 0;
  globalThis.window = {localStorage: storage(values, {setItem: (key, value) => { calls++; if (JSON.parse(value).history) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } values.set(key, String(value)); }})};
  const r = writeSaved({doc: {name: 'keep'}, origin: null, picked: {}, selection: [], modified: true}, {undo: [{doc: {name: 'old'}, origin: null, picked: {}, selection: [], modified: true, baseline: null, at: 1}], redo: [], baseline: null});
  assert.equal(r.ok, true);
  assert.equal(calls, 2);
  const saved = JSON.parse(values.get(STORAGE_KEY));
  assert.equal(saved.doc.name, 'keep');
  assert.equal(saved.history, undefined);
});

test('읽을 수 없는 기록 칸이 있으면 그보다 오래된 칸은 버리고 최근 칸만 남긴다', async () => {
  const {parseSaved} = await import('./storage.ts');
  const good = n => ({doc: {name: 'd' + n}, origin: null, picked: {}, selection: [], modified: true, baseline: null, at: n});
  const parsed = parseSaved({schema: SCHEMA_VERSION, doc: {name: 'now'}, origin: null, picked: {}, selection: [], modified: false, history: {undo: [good(1), {doc: 'broken'}, good(3)], redo: [], baselines: [], baseline: null}});
  assert.deepEqual(parsed.history.undo.map(e => e.doc.name), ['d3']);
  const badHistory = parseSaved({schema: SCHEMA_VERSION, doc: {name: 'now'}, history: 'nope'});
  assert.equal(badHistory.history, null);
  assert.ok(badHistory.problems.some(p => p.includes('실행 취소 기록')));
});
