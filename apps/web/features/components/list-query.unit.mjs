import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_SIZE, filterItems, groupKey, paginate, readQuery, runsOf, writeQuery} from './list-query.ts';

const item = (kind, group, id, words = id) => ({kind, group, id, words});
const items = [
  ...Array.from({length: 32}, (_, i) => item('purpose', i < 8 ? 'card' : 'form', `purpose:${i < 8 ? 'card' : 'form'}.n${i}`, `n${i} 목적 컴포넌트`)),
  ...Array.from({length: 60}, (_, i) => item('part', i < 30 ? 'layout' : 'content', `part${i}`, `부품 part${i} hero`.replace('hero', i === 59 ? 'hero' : 'x'))),
];

test('쪽 하나는 24개 이하이고 전체 92개를 쪽으로 모두 만난다', () => {
  assert.equal(PAGE_SIZE, 24);
  const seen = [];
  for (let page = 1; ; page++) {
    const view = paginate(items, page);
    assert.ok(view.items.length <= 24);
    seen.push(...view.items.map(x => x.id));
    if (page >= view.pages) { assert.equal(view.pages, 4); break; }
  }
  assert.deepEqual(seen, items.map(x => x.id));
});

test('범위를 벗어난 쪽은 마지막 쪽으로 읽는다', () => {
  assert.equal(paginate(items, 99).page, 4);
  assert.deepEqual(paginate([], 1), {items: [], page: 1, pages: 1, total: 0, from: 0, to: 0});
});

test('검색은 첫 쪽에 없는 카드까지 전체 목록에서 찾는다', () => {
  const firstPage = new Set(paginate(items, 1).items.map(x => x.id));
  const found = filterItems(items, {q: 'HERO', group: '', page: 1});
  assert.deepEqual(found.map(x => x.id), ['part59']);
  assert.ok(!firstPage.has('part59'), '숨은 카드다');
  assert.deepEqual(filterItems(items, {q: 'hero 없는말', group: '', page: 1}), [], '모든 낱말이 맞아야 한다');
});

test('분류 필터는 kind:group 으로 같은 이름의 다른 종류를 구분한다', () => {
  const mixed = [item('purpose', 'form', 'a'), item('part', 'form', 'b')];
  assert.deepEqual(filterItems(mixed, {q: '', group: groupKey('purpose', 'form'), page: 1}).map(x => x.id), ['a']);
  assert.deepEqual(filterItems(mixed, {q: '', group: groupKey('part', 'form'), page: 1}).map(x => x.id), ['b']);
});

test('쿼리 읽기·쓰기: 알 수 없는 분류와 잘못된 쪽은 기본값, 기본값은 쓰지 않는다', () => {
  const read = obj => readQuery({get: k => obj[k] ?? null}, ['purpose:card']);
  assert.deepEqual(read({q: '  버튼  ', group: 'purpose:card', page: '3'}), {q: '버튼', group: 'purpose:card', page: 3});
  assert.deepEqual(read({group: 'nope', page: '-2'}), {q: '', group: '', page: 1});
  assert.deepEqual(read({page: 'abc'}), {q: '', group: '', page: 1});
  assert.equal(writeQuery({q: '', group: '', page: 1}), '');
  assert.equal(writeQuery({q: '버튼', group: 'purpose:card', page: 2}), 'q=%EB%B2%84%ED%8A%BC&group=purpose%3Acard&page=2');
});

test('분류 구간 묶기는 이어지는 같은 분류만 한 구간으로 묶는다', () => {
  const runs = runsOf(items.slice(6, 12));
  assert.deepEqual(runs.map(r => [r.kind, r.group, r.items.length]), [['purpose', 'card', 2], ['purpose', 'form', 4]]);
});
