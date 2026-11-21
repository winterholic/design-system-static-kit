import test from 'node:test';
import assert from 'node:assert/strict';
import {clearSaved, LEGACY_KEY, readStored, SCHEMA_VERSION, STORAGE_KEY, writeSaved} from './storage.ts';

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
