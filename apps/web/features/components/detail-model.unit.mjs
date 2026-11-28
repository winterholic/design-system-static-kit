import test from 'node:test';
import assert from 'node:assert/strict';
import {DETAIL_TABS, buildTabs, visibleSlice, readDetailUrl, writeDetailUrl, exportedSources, createCompileCache} from './detail-model.mjs';

const view = overrides => ({
  type: 'button', material: {states: {values: ['default', 'disabled']}, variants: {size: ['sm', 'md'], appearance: ['solid', 'outline']}, defaults: {size: 'md', appearance: 'solid'}, tokens: ['color.action'], blueprint: {node: 'button'}},
  variantGroups: [{name: 'size', values: ['sm', 'md']}], fields: [], parents: ['toolbar'], children: null,
  related: [{type: 'icon-button'}], example: {type: 'button'}, ...overrides,
});

test('탭은 상세 레지스트리 재료가 있을 때만 표시하고 순서를 고정한다', () => {
  assert.deepEqual(buildTabs(view()).map(x => x.id), DETAIL_TABS.map(x => x.id));
  assert.deepEqual(buildTabs(view({material: {...view().material, states: {values: []}, variants: {}, tokens: []}, variantGroups: [], children: null, parents: [], related: []})).map(x => x.id), ['overview', 'playground', 'code', 'accessibility']);
});

test('변형 비교는 요청한 창만 DOM용 데이터로 돌려준다', () => {
  const items = Array.from({length: 80}, (_, i) => i);
  assert.deepEqual(visibleSlice(items, 3, 4), {items: [12, 13, 14, 15], start: 12, end: 16, total: 80});
  assert.deepEqual(visibleSlice(items, 99, 4).items, [76, 77, 78, 79]);
});

test('상세 URL은 컴포넌트·탭·Playground 선택을 왕복한다', () => {
  const state = {component: 'button', tab: 'playground', axes: {palette: 'blue-slate', density: 'compact', state: 'disabled'}};
  const url = writeDetailUrl(state);
  assert.deepEqual(readDetailUrl(new URLSearchParams(url)), state);
  assert.deepEqual(readDetailUrl(new URLSearchParams('tab=missing&palette=bad')), {component: null, tab: 'overview', axes: {palette: 'bad'}});
});

test('Code source는 exporter 바이트를 그대로 반환한다', () => {
  const result = {html: '<button>확인</button>\n', css: ':root{--a:1}\n', tokens: '{"a":1}\n', blueprint: '{"node":"button"}\n'};
  assert.deepEqual(exportedSources(result), {html: result.html, css: result.css, tokens: result.tokens, blueprint: result.blueprint});
  const files = {'index.html': result.html, 'tokens.css': result.css, 'tokens.json': result.tokens, 'blueprint.json': result.blueprint};
  assert.deepEqual(exportedSources(files), {html: files['index.html'], css: files['tokens.css'], tokens: files['tokens.json'], blueprint: files['blueprint.json']});
});

test('동적 컴파일 캐시는 계약 버전을 키에 넣고 최대 크기를 지킨다', () => {
  const cache = createCompileCache(2, {platform: 'p1', contract: 'c1'});
  cache.set('a', 1); cache.set('b', 2); cache.set('c', 3);
  assert.equal(cache.size, 2);
  assert.equal(cache.has('a'), false);
  assert.notEqual(cache.key('same'), createCompileCache(2, {platform: 'p2', contract: 'c1'}).key('same'));
});
