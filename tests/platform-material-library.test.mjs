import test from 'node:test';
import assert from 'node:assert/strict';
import {listAllMaterials} from '../apps/web/features/platform/material-library.mjs';

test('reads every registry page for an open material kind', () => {
  const calls = [];
  const result = listAllMaterials((query) => {
    calls.push(query);
    const offset = query.cursor ? Number(query.cursor.slice(1)) : 0;
    const all = Array.from({length: 451}, (_, i) => ({id: `palette:p${i}`}));
    const items = all.slice(offset, offset + query.limit);
    const nextCursor = offset + query.limit < all.length ? `o${offset + query.limit}` : null;
    return {ok: true, value: {items, nextCursor, total: all.length}};
  }, 'palette');
  assert.equal(result.length, 451);
  assert.deepEqual(calls.map(q => q.cursor ?? null), [null, 'o200', 'o400']);
  assert.ok(calls.every(q => q.kind === 'palette' && q.limit === 200));
});

test('fails closed when a registry page fails instead of returning a partial choice list', () => {
  const result = listAllMaterials(query => query.cursor ? {ok: false, errors: [{message: 'registry unavailable'}]} : {ok: true, value: {items: [{id: 'layout:one'}], nextCursor: 'o200', total: 201}}, 'layout');
  assert.deepEqual(result, []);
});
