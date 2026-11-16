import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveTableDesign} from '../src/table-design.mjs';

const design = (density = 'comfortable') => ({
  type: 'table',
  facts: {type: 'table', density},
  values: {role: 'table', cellSpace: 'item'},
});

const table = (columns, rows = []) => ({type: 'table', columns, rows});

test('derives stable minimum readable widths and scroll requirement from existing table metadata', () => {
  const input = table(['이름', '타입', '기본값', '설명'], [
    ['limit', '정수', '20', '한 번에 가져올 개수(최대 100)'],
    ['cursor', '문자열', '없음', '다음 페이지를 가리키는 값'],
  ]);
  const result = deriveTableDesign(input, design(), {availableWidth: 340});

  assert.equal(result.columns.length, 4);
  assert.ok(result.columns[3].minWidth > result.columns[0].minWidth);
  assert.equal(result.columns[3].wrap, 'words');
  assert.equal(result.minimumWidth, result.columns.reduce((sum, column) => sum + column.minWidth, 0));
  assert.equal(result.readableWidth, result.minimumWidth);
  assert.equal(result.scroll.required, true);
  assert.equal(result.scroll.overflow, 'auto');
  assert.equal(result.padding.inline, 12);
  assert.equal(result.padding.block, 8);
});

test('aligns strongly typed quantitative values without using header labels', () => {
  const input = table(['첫째', '둘째', '셋째'], [
    ['A-10231', '39,000원', '10:12'],
    ['A-10230', '128,000원', '09:48'],
  ]);
  const result = deriveTableDesign(input, design());

  assert.deepEqual(result.columns.map(column => column.align), ['start', 'end', 'start']);
  assert.deepEqual(result.columns.map(column => column.wrap), ['nowrap', 'nowrap', 'nowrap']);
});

test('aligns Korean condensed monetary quantities in the real sales dashboard table', async () => {
  const {createBlueprint} = await import('../src/catalog.mjs');
  const walk = node => [
    ...(node.type === 'table' ? [node] : []),
    ...(node.children ?? []).flatMap(walk),
  ];
  const sales = createBlueprint('sales-dashboard');
  const input = walk(sales.tree).find(candidate => candidate.columns.includes('예상 금액'));
  const amountIndex = input.columns.indexOf('예상 금액');
  const amounts = input.rows.map(row => row[amountIndex]);

  assert.deepEqual(amounts, ['4.2억', '3.1억', '2.8억', '1.9억', '1.4억']);
  assert.equal(deriveTableDesign(input, design()).columns[amountIndex].align, 'end');

  const condensed = table(['축약 금액', '원화 금액', '순수 숫자 ID'], [
    ['1,200만', '2조원', '123456'],
    ['5천', '₩3.1억', '654321'],
  ]);
  assert.deepEqual(
    deriveTableDesign(condensed, design()).columns.map(column => column.align),
    ['end', 'end', 'start'],
  );
});

test('does not treat identifiers, phone numbers, versions, dates, mixed values or prose as numbers', () => {
  const input = table(['수량', '전화번호', '버전', '간단 버전', '날짜', '숫자 ID', '일반 문구', '혼합', '설명'], [
    ['010-1234-5678', '010-4567-8901', '2.4.0', '2.4', '2026-10-14', '123456', '제2차 배송', '128,000원', '결제 후 발급된 요청 값을 다시 확인해 주세요'],
    ['010-2345-6789', '010-5678-9012', '2.3.1', '2.3', '2026-11-16', '654321', '2단계 검토 완료', '없음', '배송 전 주소와 수령 가능 시간을 확인합니다'],
  ]);
  // Exercise valid shapes: Blueprint tables allow at most eight columns.
  for (const indices of [[0, 1, 2, 3, 4, 5, 6, 7], [0, 8]]) {
    const subset = table(indices.map(i => input.columns[i]), input.rows.map(row => indices.map(i => row[i])));
    const result = deriveTableDesign(subset, design());
    assert.deepEqual(result.columns.map(column => column.align), indices.map(() => 'start'));
    assert.equal(result.columns[0].wrap, 'nowrap');
    assert.equal(result.columns.at(-1).wrap, indices.at(-1) === 8 ? 'words' : 'nowrap');
  }
});

test('supports 2, 4 and 6 columns while preserving every source label and cell', () => {
  for (const count of [2, 4, 6]) {
    const columns = Array.from({length: count}, (_, index) => `열 ${index + 1}`);
    const rows = [Array.from({length: count}, (_, index) => `값 ${index + 1}`)];
    const input = table(columns, rows);
    const before = structuredClone(input);
    const result = deriveTableDesign(input, design());

    assert.equal(result.columns.length, count);
    assert.deepEqual(input, before);
    assert.equal(result.minimumWidth, result.columns.reduce((sum, column) => sum + column.minWidth, 0));
  }
});

test('uses deterministic density spacing and preserves useful width for empty tables', () => {
  const input = table(['ID', '설명']);
  const compact = deriveTableDesign(input, design('compact'));
  const comfortable = deriveTableDesign(input, design('comfortable'));
  const spacious = deriveTableDesign(input, design('spacious'));

  assert.deepEqual(compact.padding, {inline: 12, block: 8});
  assert.deepEqual(comfortable.padding, {inline: 12, block: 8});
  assert.deepEqual(spacious.padding, {inline: 16, block: 8});
  assert.deepEqual(compact.columns.map(column => column.align), ['start', 'start']);
  assert.deepEqual(compact, deriveTableDesign(input, design('compact')));
  assert.ok(compact.minimumWidth > 0);
  assert.equal(deriveTableDesign(input, design(), {availableWidth: 1000}).scroll.required, false);
});

test('rejects unsupported types and inconsistent table shapes instead of inventing widths', () => {
  assert.throws(() => deriveTableDesign({type: 'list', columns: [], rows: []}, design()), /table/);
  assert.throws(() => deriveTableDesign(table(['A', 'B'], [['only one']]), design()), /column/);
  assert.throws(() => deriveTableDesign(table(['only one']), design()), /2/);
});
