import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalJson,
  computeCacheKey,
  LRUCache,
  StudioCompileManager,
  studioCompileCache,
} from './compiler.ts';

test('canonicalJson sorts keys recursively and produces deterministic strings', () => {
  const obj1 = { b: 2, a: 1, c: { y: 'two', x: 'one' } };
  const obj2 = { c: { x: 'one', y: 'two' }, a: 1, b: 2 };
  assert.equal(canonicalJson(obj1), canonicalJson(obj2));
  assert.equal(canonicalJson(obj1), '{"a":1,"b":2,"c":{"x":"one","y":"two"}}');
});

test('computeCacheKey includes compilerVersion, catalogVersion, mode, and returns 32-char hex', () => {
  const doc = {
    version: '1.0',
    theme: 'console',
    catalogVersion: '2.6.0',
    palette: 'slate-neutral',
    tree: { type: 'page', children: [] },
  };
  const key1 = computeCacheKey('2.0.0', '2.6.0', doc, 'light');
  const key2 = computeCacheKey('2.0.0', '2.6.0', doc, 'dark');
  const key3 = computeCacheKey('2.1.0', '2.6.0', doc, 'light');
  const key4 = computeCacheKey('2.0.0', '2.7.0', doc, 'light');

  assert.equal(typeof key1, 'string');
  assert.equal(key1.length, 32);
  assert.notEqual(key1, key2, 'different mode should have different key');
  assert.notEqual(key1, key3, 'different compilerVersion should have different key');
  assert.notEqual(key1, key4, 'different catalogVersion should have different key');
});

test('LRUCache enforces size limit and eviction policy', () => {
  const cache = new LRUCache(3);
  cache.set('k1', 'v1');
  cache.set('k2', 'v2');
  cache.set('k3', 'v3');

  assert.equal(cache.size, 3);
  assert.equal(cache.get('k1'), 'v1'); // k1 accessed, order becomes k2, k3, k1

  // Insert k4, should evict k2
  cache.set('k4', 'v4');
  assert.equal(cache.size, 3);
  assert.equal(cache.has('k2'), false, 'k2 should be evicted');
  assert.equal(cache.has('k1'), true, 'k1 should remain');
  assert.equal(cache.has('k3'), true, 'k3 should remain');
  assert.equal(cache.has('k4'), true, 'k4 should remain');
});

test('StudioCompileManager debounces rapid edits and compiles only once for settling input', async () => {
  let compileCalls = 0;
  const mockCore = {
    service: {
      compileBlueprint(bp) {
        compileCalls++;
        return { ok: true, value: { html: `<div>${bp.palette}</div>` }, warnings: [] };
      },
    },
  };

  const manager = new StudioCompileManager(mockCore, { debounceMs: 50 });
  const results = [];

  const doc1 = { theme: 'console', catalogVersion: '2.6.0', palette: 'p1' };
  const doc2 = { theme: 'console', catalogVersion: '2.6.0', palette: 'p2' };
  const doc3 = { theme: 'console', catalogVersion: '2.6.0', palette: 'p3' };

  // Rapidly schedule 3 compiles
  manager.schedule(doc1, 'light', res => results.push({ id: 1, res }));
  manager.schedule(doc2, 'light', res => results.push({ id: 2, res }));
  manager.schedule(doc3, 'light', res => results.push({ id: 3, res }));

  // Wait for debounce timer to fire
  await new Promise(r => setTimeout(r, 80));

  assert.equal(compileCalls, 1, 'Only the final settled input should compile');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 3);
  assert.equal(results[0].res.ok, true);
  assert.equal(results[0].res.html, '<div>p3</div>');
});

test('StudioCompileManager reuses cached result for identical normalized input without recompiling', async () => {
  let compileCalls = 0;
  const mockCore = {
    service: {
      compileBlueprint(bp) {
        compileCalls++;
        return { ok: true, value: { html: `<div>${bp.palette}</div>` }, warnings: [] };
      },
    },
  };

  const manager = new StudioCompileManager(mockCore, { debounceMs: 10 });
  const docA = { theme: 'console', catalogVersion: '2.6.0', palette: 'pA' };

  // First compile
  let resultA1 = null;
  manager.schedule(docA, 'light', res => { resultA1 = res; });
  await new Promise(r => setTimeout(r, 30));

  assert.equal(compileCalls, 1);
  assert.equal(resultA1?.html, '<div>pA</div>');

  // Second compile with same document (normalized input)
  let resultA2 = null;
  manager.schedule({ ...docA }, 'light', res => { resultA2 = res; });
  await new Promise(r => setTimeout(r, 30));

  assert.equal(compileCalls, 1, 'Same normalized input should hit cache and NOT recompile');
  assert.equal(resultA2?.html, '<div>pA</div>');
});

test('StudioCompileManager ignores slow stale responses arriving out of order', async () => {
  const dispatched = [];
  const manager = new StudioCompileManager(null, { debounceMs: 0 });

  // Simulate two async compilations where request 1 is slow and finishes AFTER request 2
  const p1 = new Promise(resolve => {
    setTimeout(() => {
      resolve({ ok: true, html: 'HTML_1', warnings: [] });
    }, 60);
  });

  const p2 = new Promise(resolve => {
    setTimeout(() => {
      resolve({ ok: true, html: 'HTML_2', warnings: [] });
    }, 20);
  });

  manager.executeCustom(p1, res => dispatched.push({ req: 1, res }));
  manager.executeCustom(p2, res => dispatched.push({ req: 2, res }));

  // Wait for both to complete
  await new Promise(r => setTimeout(r, 100));

  // Request 2 should have dispatched first (at ~20ms).
  // When Request 1 finishes (at ~60ms), it is older (req 1 < req 2) and MUST be ignored.
  assert.equal(dispatched.length, 1, 'Stale response from request 1 must be dropped');
  assert.equal(dispatched[0].req, 2);
  assert.equal(dispatched[0].res.html, 'HTML_2');
});
