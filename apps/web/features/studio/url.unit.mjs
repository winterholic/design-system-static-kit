import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUrl, startUrl, viewUrl} from './url.ts';

test('Studio consumes the shared start query and preserves every requested design choice', () => {
  const request = {template: 'saas-landing', theme: 'ledger', variant: 'compact-ops', palette: 'blue-slate', mode: 'dark', layout: {hero: 'split', cards: 'outline'}};
  const parsed = parseUrl(startUrl(request).slice('/studio'.length));

  assert.deepEqual(parsed.start, request);
  assert.deepEqual(parsed.problems, []);
});

test('Materials hands axes and the internal color palette to Studio through the same start query', () => {
  const request = {axes: {radius: 'round', density: 'compact'}, colorPalette: 'static-kit'};
  const parsed = parseUrl(startUrl(request).slice('/studio'.length));
  assert.deepEqual(parsed.start, request);
  assert.deepEqual(parsed.problems, []);
  assert.equal(parseUrl('?axes=radius').problems[0]?.path, '$url.axes');
  assert.equal(parseUrl('?colorPalette=bad value').problems[0]?.path, '$url.colorPalette');
});

test('Studio view state has a stable URL contract and rejects malformed layout input', () => {
  assert.equal(viewUrl({tab: 'design', pane: 'preview', device: 390}), '/studio?tab=design&pane=preview&device=390');
  const parsed = parseUrl('?layout=hero:split,bad');
  assert.deepEqual(parsed.start, {});
  assert.equal(parsed.problems[0]?.path, '$url.layout');
});
