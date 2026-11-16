import test from 'node:test';
import assert from 'node:assert/strict';
import {compile} from '../src/compiler.mjs';
import {createBlueprint} from '../src/catalog.mjs';

const find=(n,type)=>n.type===type?n:(n.children??[]).map(x=>find(x,type)).find(Boolean);
test('implicit short sequences use content-sized flow while preserving every item and order', () => {
  for (const [id,type] of [['learning-course','steps'],['job-detail','steps'],['hanji-journey','timeline']]) {
    const b=createBlueprint(id), n=find(b.tree,type), before=structuredClone(b), r=compile(b);
    const d=r.manifest.design.decisions.find(x=>x.type===type);
    assert.equal(d.sequence?.policy,'sequence-content-1',id);
    assert.equal(d.sequence.mode,'adaptive',id);
    assert.ok(d.flow.minCell>=200&&d.flow.minCell<=320,id);
    assert.match(r.html,/data-sequence="adaptive"/);
    assert.match(r.html,/data-flow-min="\d+"/);
    const sequence=r.html.match(new RegExp('class="kit-'+type+'"[^>]*>[\\s\\S]*?<\\/section>'))?.[0];
    assert.match(sequence, /<ol data-flow /, `${id}: layout hints must reach the actual list`);
    for (const item of n.items) assert.ok(r.html.includes(item.title),id);
    assert.deepEqual(b,before);
  }
});
test('explicit vertical and line sequences and long narratives retain chronological rows', () => {
  for (const [id,type,key,value] of [['learning-course','steps','layout','vertical'],['hanji-journey','timeline','variant','line']]) {
    const b=createBlueprint(id);find(b.tree,type)[key]=value;
    const r=compile(b);
    assert.ok(!r.html.includes('data-sequence="adaptive"'));
  }
  const b=createBlueprint('hanji-journey');find(b.tree,'timeline').items[0].description='한글 설명을 충분히 길게 쓰면서 모든 세부 조건을 보존합니다. '.repeat(6);
  assert.ok(!compile(b).html.includes('data-sequence="adaptive"'));
});
