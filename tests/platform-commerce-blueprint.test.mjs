// §6.2 N 11항목의 Blueprint 왕복과 재료 질의 검증.
// Blueprint를 입력으로 컴파일하면 Core가 낸 마크업이 그대로 나오고, 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileBlueprint, validateBlueprint, getComponentSpec, getMaterial, getPlatformMaterial} from '../src/service/index.mjs';
import {COMMERCE_COMPONENTS, renderCommerceComponent} from '../src/platform/families/contracts.mjs';
import * as edit from '../src/edit/index.mjs';

const compile = b => {
  const r = compileBlueprint(b, {include: ['html', 'css', 'tokens', 'manifest']});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.value;
};

function nodeDoc(node, since) {
  const made = edit.resetDocument(null, {template: 'about-team', theme: 'workspace'});
  assert.equal(made.ok, true);
  let doc = made.doc;
  if (since === '2.6.0') {
    const up = edit.importBlueprint(null, {blueprint: {...doc, catalogVersion: '2.6.0'}});
    assert.equal(up.ok, true);
    doc = up.doc;
  }
  const ins = edit.insertNode(doc, {parent: [], node, index: doc.tree.children.length});
  assert.equal(ins.ok, true, JSON.stringify(ins.errors));
  return ins.doc;
}

test('N components: every commerce component contract connects to a queryable material', () => {
  assert.equal(COMMERCE_COMPONENTS.length, 11);
  for (const item of COMMERCE_COMPONENTS) {
    const matId = item.materialId;
    const res = getPlatformMaterial({id: matId}).ok || getMaterial({id: matId}).ok;
    assert.ok(res, `${item.id} -> ${matId} is queryable from the registry`);
    if (item.blueprint.field === 'tree') {
      assert.ok(item.blueprint.node, `${item.id}: blueprint specifies node type`);
    } else {
      assert.ok(item.blueprint.purpose, `${item.id}: blueprint specifies purpose`);
    }
  }
});

const NODE_COMMERCE_CASES = {
  'component:product-grid': {
    node: {
      type: 'grid', columns: 'three',
      children: [
        {type: 'card', title: '상품 1', body: '상품 1 상세 설명', price: '39,000원', badge: '신상품'},
        {type: 'card', title: '상품 2', body: '상품 2 상세 설명', price: '49,000원', listPrice: '59,000원'},
        {type: 'card', title: '상품 3', body: '상품 3 상세 설명', price: '29,000원'},
      ],
    },
    since: '2.4.0',
    expect: /class="kit-grid"[\s\S]*상품 1[\s\S]*39,000원/,
  },
  'component:product-detail-summary': {
    node: {
      type: 'buy-box', title: '무드램프 미니', price: '39,000원', badge: '베스트',
      options: [{label: '색상', choices: ['화이트', '민트']}],
      action: {label: '장바구니 담기', href: '#main', variant: 'primary'},
    },
    since: '2.4.0',
    expect: /class="kit-buybox"[\s\S]*무드램프 미니[\s\S]*39,000원/,
  },
  'component:product-variant-selector': {
    node: {
      type: 'buy-box', title: '옵션 상품', price: '20,000원',
      options: [{label: '사이즈', choices: ['S', 'M', 'L']}],
      action: {label: '구매', href: '#main', variant: 'primary'},
    },
    since: '2.4.0',
    expect: /<fieldset class="kit-options"><legend>사이즈<\/legend>[\s\S]*checked/,
  },
  'component:cart-summary': {
    node: {
      type: 'summary', title: '장바구니 요약',
      items: [{label: '상품금액', value: '39,000원'}, {label: '배송비', value: '무료'}],
      total: {label: '합계', value: '39,000원'},
      action: {label: '주문하기', href: '#main', variant: 'primary'},
    },
    since: '2.4.0',
    expect: /class="kit-summary"[\s\S]*장바구니 요약[\s\S]*39,000원/,
  },
  'component:checkout-summary': {
    node: {
      type: 'summary', title: '결제 요약',
      items: [{label: '주문금액', value: '50,000원'}, {label: '할인', value: '-5,000원'}],
      total: {label: '최종결제', value: '45,000원'},
      action: {label: '결제하기', href: '#main', variant: 'primary'},
    },
    since: '2.4.0',
    expect: /class="kit-summary"[\s\S]*결제 요약[\s\S]*45,000원/,
  },
  'component:order-status': {
    node: {
      type: 'steps', title: '주문 배송 상태',
      items: [
        {title: '주문완료', description: '2026.11.28 결제 확인'},
        {title: '배송중', description: 'CJ대한통운 123456789'},
      ],
    },
    since: '2.4.0',
    expect: /class="kit-steps"[\s\S]*주문 배송 상태[\s\S]*배송중/,
  },
  'component:review-summary': {
    node: {
      type: 'reviews', title: '구매 고객 후기', score: '4.7', count: '52개',
      items: [{rating: 5, text: '좋은 제품입니다', author: '구매자', date: '2026.11.25'}],
    },
    since: '2.4.0',
    expect: /class="kit-reviews"[\s\S]*4\.7[\s\S]*좋은 제품입니다/,
  },
};

test('N nodes: legacy commerce nodes compile from a Blueprint and identical input yields identical bytes', () => {
  for (const [id, c] of Object.entries(NODE_COMMERCE_CASES)) {
    const doc = nodeDoc(c.node, c.since);
    const first = compile(doc);
    const second = compile(structuredClone(doc));
    assert.deepEqual(second, first, `${id}: byte-identical compilation`);
    assert.ok(c.expect.test(first.html), `${id}: expected pattern in html`);
    assert.equal(getComponentSpec({type: c.node.type}).ok, true, `${id}: spec exists in component catalog`);
  }
});

test('N standalone render: renderCommerceComponent renders complete markup reflecting inputs and options', () => {
  const pvs = renderCommerceComponent('component:product-variant-selector', {
    options: [{label: '색상', choices: ['블랙', '레드', '블루']}],
  });
  assert.match(pvs, /<fieldset class="kit-options"/);
  assert.match(pvs, /value="블랙"[^>]*checked/);
  assert.match(pvs, /value="레드"/);

  const qs = renderCommerceComponent('component:quantity-selector', {value: 3, min: 1, max: 10});
  assert.match(qs, /class="kit-quantity-selector"/);
  assert.match(qs, /value="3"/);
  assert.match(qs, /min="1"/);
  assert.match(qs, /max="10"/);

  const pd = renderCommerceComponent('component:price-display', {price: '₩129,000', originalPrice: '₩159,000', unit: '/개'});
  assert.match(pd, /₩129,000/);
  assert.match(pd, /₩159,000/);
  assert.match(pd, /\/개/);

  const dd = renderCommerceComponent('component:discount-display', {rate: '20%', amount: '30,000원 할인', badge: '쿠폰'});
  assert.match(dd, /20%/);
  assert.match(dd, /30,000원 할인/);
  assert.match(dd, /쿠폰/);

  const ci = renderCommerceComponent('component:cart-item', {title: '무선 키보드', price: '79,000원', quantity: 2, option: '스위치: 갈축'});
  assert.match(ci, /무선 키보드/);
  assert.match(ci, /79,000원/);
  assert.match(ci, /스위치: 갈축/);
  assert.match(ci, /value="2"/);

  const os = renderCommerceComponent('component:order-status', {
    orderNumber: 'ORD-20261128', statusLabel: '배송출발', currentStep: 2,
    steps: ['주문접수', '결제완료', '배송출발', '배송완료'],
  });
  assert.match(os, /ORD-20261128/);
  assert.match(os, /배송출발/);
  assert.match(os, /aria-current="step"/);
});
