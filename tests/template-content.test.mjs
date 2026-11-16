import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
const nodes=n=>[n,...(n.children??[]).flatMap(nodes)];
test('authored visual examples use subject content and data rather than unrelated UI mockups', () => {
  const product=nodes(createBlueprint('product-landing').tree);
  assert.ok(product.some(n=>n.type==='media'&&n.kind==='photo'&&n.motif==='orb'));
  assert.ok(!product.some(n=>n.type==='media'&&n.kind==='diagram'));
  const realty=nodes(createBlueprint('realty-detail').tree).find(n=>n.type==='gallery');
  assert.ok(!realty.items.some(n=>n.kind==='diagram'));
  const research=nodes(createBlueprint('research-paper').tree);
  assert.ok(!research.some(n=>n.type==='media'&&n.kind==='chart'));
  const chart=research.find(n=>n.type==='chart');
  const table=research.find(n=>n.type==='table');
  assert.deepEqual(chart.categories,table.rows.map(row=>row[0]));
  assert.deepEqual(chart.series[0].values,table.rows.map(row=>Number(row[1])));
  for(const id of ['bank-product','devtool-landing']) {
    const hero=nodes(createBlueprint(id).tree).find(n=>n.type==='hero');
    assert.equal(hero.visual,undefined,id);
  }
  for(const id of ['bank-product','devtool-landing','product-landing','realty-detail','research-paper']) assert.doesNotThrow(()=>compile(createBlueprint(id)),id);
});
