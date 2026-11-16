import test from 'node:test';
import assert from 'node:assert/strict';
import {compile} from '../src/compiler.mjs';
import {createBlueprint} from '../src/catalog.mjs';

const tables = node => [
  ...(node.type === 'table' ? [node] : []),
  ...(node.children ?? []).flatMap(tables),
];

test('compiled contextual tables carry the content budget into their manifest, cells and scroll region', () => {
  for (const id of ['docs-reference', 'api-reference', 'admin-table', 'sales-dashboard']) {
    const input = createBlueprint(id), before = structuredClone(input);
    const result = compile(input);
    const decisions = result.manifest.design.decisions.filter(d => d.type === 'table');
    assert.ok(decisions.length, `${id}: missing table decision`);
    for (const decision of decisions) {
      assert.ok(decision.table?.minimumWidth > 320, `${id}: missing readable table budget`);
      assert.equal(decision.table.policy, 'table-content-1');
      assert.ok(result.html.includes(`<table data-table-min="${decision.table.minimumWidth}">`), id);
      assert.ok(result.css.includes(`[data-table-min="${decision.table.minimumWidth}"]{min-width:${decision.table.minimumWidth}px}`), id);
      assert.match(result.html, /class="kit-table-scroll" tabindex="0" role="region"/, id);
      for (const column of decision.table.columns) {
        assert.ok(result.html.includes(`data-column-min="${column.minWidth}" data-column-align="${column.align}" data-column-wrap="${column.wrap}"`), id);
      }
    }
    assert.deepEqual(input, before, `${id}: input changed`);
  }
});

test('the table renderer applies quantitative alignment without reordering or rewriting source cells', () => {
  const input = createBlueprint('docs-reference');
  const node = tables(input.tree)[0];
  node.columns = ['요청 ID', '합계', '설명'];
  node.rows = [['A-001', '39,000원', '요청 값을 확인한 뒤 결제합니다'], ['A-002', '128,000원', '배송 전 수령 주소를 확인합니다']];
  const result = compile(input);
  const table = result.html.match(/<table data-table-min="\d+">[\s\S]*?<\/table>/)?.[0];
  assert.ok(table, 'renderer did not emit a contextual table');
  const header = [...table.matchAll(/<th scope="col"([^>]*)>([^<]*)<\/th>/g)];
  assert.deepEqual(header.map(x => x[2]), node.columns);
  assert.match(header[0][1], /data-column-align="start"/);
  assert.match(header[1][1], /data-column-align="end"/);
  assert.match(header[2][1], /data-column-wrap="words"/);
  for (const row of node.rows) for (const value of row) assert.ok(table.includes(`>${value}</`), value);
  assert.match(result.css, /\[data-column-align=end\]\{text-align:end\}/);
  assert.match(result.css, /\[data-column-wrap=nowrap\]\{white-space:nowrap\}/);
});

test('legacy tables keep their original renderer and do not acquire contextual table metadata', () => {
  const input = createBlueprint('admin-table');
  input.catalogVersion = '2.1.0';
  const result = compile(input);
  assert.equal(result.manifest.design, undefined);
  assert.ok(result.html.includes('<table><caption>'));
  assert.ok(!result.html.includes('data-table-min'));
  assert.ok(!result.html.includes('data-column-min'));
});
