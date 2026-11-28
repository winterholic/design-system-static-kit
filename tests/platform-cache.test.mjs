import test from 'node:test';
import assert from 'node:assert/strict';
import {computePreviewCacheKey, canonicalize, LruCache} from '../apps/web/lib/api/cache.mjs';

test('canonicalize sorts keys recursively and trims strings', () => {
  const a = {z: ' bar ', a: 1, nested: {b: 2, a: ' foo '}};
  const b = {nested: {a: 'foo', b: 2}, a: 1, z: 'bar'};
  assert.equal(canonicalize(a), canonicalize(b));
  assert.equal(canonicalize(a), '{"a":1,"nested":{"a":"foo","b":2},"z":"bar"}');
});

test('computePreviewCacheKey produces deterministic 32-character SHA-256 hash', () => {
  const req = {purpose: 'saas-landing', mode: 'light', palette: 'ocean-cool'};
  const key1 = computePreviewCacheKey({
    compilerVersion: '2.0.0',
    catalogVersion: '2.6.0',
    materialId: 'palette:ocean-cool',
    materialVersion: '1.0.0',
    request: req,
    mode: 'light',
    viewportWidth: 1280,
  });

  const key2 = computePreviewCacheKey({
    compilerVersion: '2.0.0',
    catalogVersion: '2.6.0',
    materialId: 'palette:ocean-cool',
    materialVersion: '1.0.0',
    request: {mode: 'light', palette: 'ocean-cool', purpose: 'saas-landing'}, // different key order
    mode: 'light',
    viewportWidth: 1280,
  });

  assert.equal(key1.length, 32);
  assert.match(key1, /^[0-9a-f]{32}$/);
  assert.equal(key1, key2);

  // Different mode yields different key
  const keyDark = computePreviewCacheKey({
    compilerVersion: '2.0.0',
    catalogVersion: '2.6.0',
    materialId: 'palette:ocean-cool',
    materialVersion: '1.0.0',
    request: req,
    mode: 'dark',
    viewportWidth: 1280,
  });
  assert.notEqual(key1, keyDark);

  // Different viewport yields different key
  const key390 = computePreviewCacheKey({
    compilerVersion: '2.0.0',
    catalogVersion: '2.6.0',
    materialId: 'palette:ocean-cool',
    materialVersion: '1.0.0',
    request: req,
    mode: 'light',
    viewportWidth: 390,
  });
  assert.notEqual(key1, key390);
});

test('LruCache respects size cap and evicts least recently used items', () => {
  const cache = new LruCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.size, 3);
  assert.equal(cache.get('a'), 1); // access 'a', making 'b' oldest

  cache.set('d', 4); // evicts 'b'
  assert.equal(cache.size, 3);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('c'), true);
  assert.equal(cache.has('d'), true);
});
