import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUrl, startUrl, viewUrl} from './url.ts';
import {studioForColor, studioForPreset} from '../materials/studio-link.ts';

test('Studio consumes the shared start query and preserves every requested design choice', () => {
  const request = {template: 'saas-landing', theme: 'ledger', variant: 'compact-ops', palette: 'blue-slate', mode: 'dark', layout: {hero: 'split', cards: 'outline'}};
  const parsed = parseUrl(startUrl(request).slice('/studio'.length));

  assert.deepEqual(parsed.start, request);
  assert.deepEqual(parsed.problems, []);
});

test('Materials hands axes and the internal color palette to Studio through the same start query', () => {
  const request = {axes: {radius: 'round', density: 'compact'}, catalogVersion: '2.6.0', colorPalette: 'static-kit', typeRoles: 'marketing'};
  const parsed = parseUrl(startUrl(request).slice('/studio'.length));
  assert.deepEqual(parsed.start, request);
  assert.deepEqual(parsed.problems, []);
  assert.equal(parseUrl('?axes=radius').problems[0]?.path, '$url.axes');
  assert.equal(parseUrl('?colorPalette=bad value').problems[0]?.path, '$url.colorPalette');
});

test('Materials color and role type links explicitly request 2.6.0 document materials', () => {
  assert.deepEqual(parseUrl(studioForColor().slice('/studio'.length)).start, {catalogVersion: '2.6.0', colorPalette: 'static-kit'});
  assert.deepEqual(parseUrl(studioForPreset('marketing', 'saas-landing').slice('/studio'.length)).start, {template: 'saas-landing', catalogVersion: '2.6.0', typeRoles: 'marketing'});
});

test('Studio view state has a stable URL contract and rejects malformed layout input', () => {
  assert.equal(viewUrl({tab: 'design', pane: 'preview', device: 390}), '/studio?tab=design&pane=preview&device=390');
  const parsed = parseUrl('?layout=hero:split,bad');
  assert.deepEqual(parsed.start, {});
  assert.equal(parsed.problems[0]?.path, '$url.layout');
  assert.equal(parseUrl('?catalogVersion=2.5.0').problems[0]?.path, '$url.catalogVersion');
});
