import test from 'node:test';
import assert from 'node:assert/strict';
import {flagIdentity, toggleFlag, flagsToText} from '../apps/web/features/explore/qa/combos-flags.mjs';

const id = 'saas-landing~faq:split';
const original = {c: id, theme: 'aurora', mode: 'dark', note: '메뉴가 겹침', at: '2026-11-20T12:00:00.000Z'};
const otherView = {c: id, theme: 'console', mode: 'light', note: '표가 좁음', at: '2026-11-20T13:00:00.000Z'};

test('same combo under different views is independently added and removed without changing existing records', () => {
  const initial = [original, otherView];
  const added = toggleFlag(initial, id, {theme: 'aurora', mode: 'light'}, '2026-11-21T00:00:00.000Z');
  assert.equal(added.length, 3);
  assert.deepEqual(added.slice(0, 2), initial);
  assert.equal(added[2].c, id);
  assert.equal(added[2].theme, 'aurora');
  assert.equal(added[2].mode, 'light');
  const removed = toggleFlag(added, id, {theme: 'console', mode: 'light'});
  assert.deepEqual(removed, [original, added[2]]);
  assert.equal(flagIdentity(removed[0]), flagIdentity(original));
});

test('flag text export retains each record view, note, timestamp, and reopenable URL', () => {
  const text = flagsToText([original, otherView], 'https://example.test');
  assert.match(text, /메뉴가 겹침/);
  assert.match(text, /2026-11-20T12:00:00\.000Z/);
  assert.match(text, /theme=aurora.*mode=dark/);
  assert.match(text, /theme=console.*mode=light/);
  assert.match(text, /https:\/\/example\.test\/dev\/qa\/combos\?c=saas-landing%7Efaq%3Asplit/);
});
