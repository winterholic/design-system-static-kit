// §6.2 N 11항목의 Blueprint 왕복과 재료 질의 검증.
// Blueprint를 입력으로 컴파일하면 Core가 낸 마크업이 그대로 나오고, 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleDesign, compileBlueprint, validateBlueprint, getComponentSpec, getMaterial, getPlatformMaterial} from '../src/service/index.mjs';
import {COMMERCE_COMPONENTS, COMMERCE_CONTRACTS, COMMERCE_SPECS, renderCommerceComponent} from '../src/platform/families/contracts.mjs';
import {COMMERCE_COMPONENT_CSS} from '../src/platform/families/contracts.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';
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
    const platform = getPlatformMaterial({id: matId});
    const legacy = getMaterial({id: matId});
    const material = platform.ok ? platform.value : legacy.value;
    assert.ok(platform.ok || legacy.ok, `${item.id} -> ${matId} is queryable from the registry`);
    assert.equal(material.id, matId, `${item.id} resolves its exact declared material id`);
    if (item.blueprint.field === 'tree') {
      assert.ok(item.blueprint.node, `${item.id}: blueprint specifies node type`);
    } else {
      assert.ok(item.blueprint.purpose, `${item.id}: blueprint specifies purpose`);
    }
  }
});

test('N manifest rows carry live commerce assembly, changed-input and rejection evidence, not only an aliased material status', () => {
  const manifest = JSON.parse(readFileSync('docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', 'utf8'));
  const rows = manifest.requirements.filter(row => row.section === '§6.2 N');
  assert.equal(rows.length, 11);
  for (const row of rows) {
    assert.equal(row.commerceProbe?.ok, true, `${row.name}: the N commerce renderer was called`);
    assert.equal(row.commerceProbe?.inputChanged, true, `${row.name}: changed props change its actual output`);
    assert.equal(row.commerceProbe?.invalidRejected, true, `${row.name}: invalid props are refused`);
    assert.ok(row.commerceProbe?.outputHash, `${row.name}: output hash records the observed render`);
    assert.equal(row.commerceProbe?.materialId, row.materialIds[0], `${row.name}: probe records the exact declared material`);
    assert.ok(row.commerceProbe?.blueprintPath, `${row.name}: probe records the Blueprint connection separately`);
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

test('N contracts describe only the states, inputs, events, tokens and accessibility actually supported by each renderer', () => {
  const byId = new Map(COMMERCE_CONTRACTS.map(c => [c.id, c]));
  const contract = id => byId.get(id);

  assert.deepEqual(contract('component:quantity-selector').states, ['default', 'disabled', 'readonly']);
  assert.deepEqual(contract('component:price-display').states, ['default', 'sold-out']);
  assert.deepEqual(contract('component:discount-display').states, ['default', 'sale']);
  assert.deepEqual(contract('component:cart-item').states, ['default', 'disabled']);
  for (const id of ['component:product-grid', 'component:product-detail-summary', 'component:product-variant-selector', 'component:cart-summary', 'component:checkout-summary', 'component:order-status', 'component:review-summary']) {
    assert.deepEqual(contract(id).states, ['default'], `${id} does not claim unimplemented state rendering`);
  }

  assert.equal(contract('component:price-display').content.price.required, true);
  assert.equal(contract('component:discount-display').content.rate.required, true);
  assert.equal(contract('component:cart-item').content.title.required, true);
  assert.equal(contract('component:cart-item').content.price.required, true);
  assert.deepEqual(contract('component:quantity-selector').events, ['change']);
  assert.deepEqual(contract('component:cart-item').events, ['change', 'kit-cart-remove']);
  for (const c of COMMERCE_CONTRACTS) {
    assert.ok(Array.isArray(c.tokens) && c.tokens.length > 0, `${c.id} names tokens actually consumed by its styles`);
    assert.ok(c.accessibility.requirements.length > 0, `${c.id} has renderer-specific accessibility requirements`);
  }
});

test('N standalone render: every item has valid positive and negative required-input cases', () => {
  const valid = {
    'component:product-grid': {items: [{title: '유효 상품', price: '10,000원'}]},
    'component:product-detail-summary': {title: '상품 상세', price: '10,000원'},
    'component:product-variant-selector': {options: [{label: '색상', choices: ['검정', '흰색']}]},
    'component:quantity-selector': {value: 2, min: 1, max: 5, step: 1},
    'component:price-display': {price: '10,000원'},
    'component:discount-display': {rate: '10%'},
    'component:cart-item': {title: '장바구니 상품', price: '10,000원'},
    'component:cart-summary': {},
    'component:checkout-summary': {},
    'component:order-status': {orderNumber: 'ORD-1', statusLabel: '결제완료'},
    'component:review-summary': {},
  };
  const invalid = {
    'component:product-grid': {items: [{title: '가격 누락'}]},
    'component:product-detail-summary': {title: 12},
    'component:product-variant-selector': {options: [{label: '색상', choices: []}]},
    'component:quantity-selector': {value: 6, min: 1, max: 5},
    'component:price-display': {label: '가격 label만 있음'},
    'component:discount-display': {badge: '쿠폰'},
    'component:cart-item': {title: '가격 누락'},
    'component:cart-summary': {items: [{label: '배송비'}]},
    'component:checkout-summary': {total: {label: '합계'}},
    'component:order-status': {orderNumber: 'ORD-1'},
    'component:review-summary': {items: [{rating: 8, text: '잘못된 평점'}]},
  };
  const changed = {
    'component:product-grid': {items: [{title: '다른 상품', price: '12,000원'}]},
    'component:product-detail-summary': {title: '다른 상품 상세', price: '12,000원'},
    'component:product-variant-selector': {options: [{label: '색상', choices: ['초록', '노랑']}]},
    'component:quantity-selector': {value: 3, min: 1, max: 5, step: 1},
    'component:price-display': {price: '12,000원'},
    'component:discount-display': {rate: '15%'},
    'component:cart-item': {title: '다른 장바구니 상품', price: '12,000원', quantity: 2},
    'component:cart-summary': {total: {label: '새 합계', value: '12,000원'}},
    'component:checkout-summary': {total: {label: '새 결제 금액', value: '12,000원'}},
    'component:order-status': {orderNumber: 'ORD-2', statusLabel: '배송완료'},
    'component:review-summary': {score: '3.9', count: '새 리뷰 수'},
  };

  for (const item of COMMERCE_COMPONENTS) {
    assert.doesNotThrow(() => renderCommerceComponent(item.id, valid[item.id]), `${item.id} accepts its documented inputs`);
    assert.throws(() => renderCommerceComponent(item.id, invalid[item.id]), TypeError, `${item.id} rejects invalid inputs`);
    assert.notEqual(renderCommerceComponent(item.id, valid[item.id]), renderCommerceComponent(item.id, changed[item.id]), `${item.id} output reflects input changes`);
  }
});

test('N state rendering exposes declared controls and refuses state names without renderer support', () => {
  const readonly = renderCommerceComponent('component:quantity-selector', {state: 'readonly', value: 2, min: 1, max: 3});
  assert.match(readonly, /readonly/);
  assert.match(readonly, /data-action="increase"[^>]*disabled/);
  const disabledItem = renderCommerceComponent('component:cart-item', {state: 'disabled', title: '상품', price: '1,000원'});
  assert.match(disabledItem, /data-action="cart-remove"[^>]*disabled/);
  const soldOut = renderCommerceComponent('component:price-display', {state: 'sold-out', price: '1,000원'});
  assert.match(soldOut, /data-state="sold-out"[\s\S]*품절/);
  const sale = renderCommerceComponent('component:discount-display', {state: 'sale', rate: '10%'});
  assert.match(sale, /data-state="sale"/);
  for (const [id, state] of [['component:quantity-selector', 'sale'], ['component:price-display', 'loading'], ['component:discount-display', 'sold-out'], ['component:cart-item', 'loading'], ['component:review-summary', 'empty']]) {
    assert.throws(() => renderCommerceComponent(id, {state, ...(id === 'component:price-display' ? {price: '1,000원'} : {}), ...(id === 'component:discount-display' ? {rate: '10%'} : {}), ...(id === 'component:cart-item' ? {title: '상품', price: '1,000원'} : {})}), TypeError, `${id} rejects unsupported state ${state}`);
  }
});

test('N style and status inputs are closed enums whose values produce visible output differences', () => {
  const twoColumns = renderCommerceComponent('component:product-grid', {columns: 'two', gap: 'sm', items: [{title: 'A', price: '1원'}]});
  const fourColumns = renderCommerceComponent('component:product-grid', {columns: 'four', gap: 'lg', items: [{title: 'A', price: '1원'}]});
  assert.notEqual(twoColumns, fourColumns);
  assert.match(COMMERCE_COMPONENT_CSS, /data-columns="one"/);
  assert.match(COMMERCE_COMPONENT_CSS, /data-gap="sm"/);
  assert.match(COMMERCE_COMPONENT_CSS, /data-gap="lg"/);
  assert.match(renderCommerceComponent('component:order-status', {orderNumber: 'ORD-1', statusLabel: '배송중', status: 'shipping'}), /data-status="shipping"/);
  assert.throws(() => renderCommerceComponent('component:product-grid', {columns: 'five'}), TypeError);
  assert.throws(() => renderCommerceComponent('component:product-grid', {gap: 'huge'}), TypeError);
  assert.throws(() => renderCommerceComponent('component:quantity-selector', {size: 'xl'}), TypeError);
  assert.throws(() => renderCommerceComponent('component:price-display', {price: '1원', size: 'lg'}), TypeError);
  assert.throws(() => renderCommerceComponent('component:order-status', {orderNumber: 'ORD-1', statusLabel: '임의', status: 'unknown'}), TypeError);
});

test('N legacy Blueprint paths compile and export quantity, price, discount and cart row materials with changed content and rejection', () => {
  const cases = [
    {id: 'component:quantity-selector', node: {type: 'input-control', id: 'n-qty', label: '수량', value: '2', kind: 'number'}, since: '2.6.0', text: 'value="2"', changed: {value: '4'}, bad: n => { delete n.label; }},
    {id: 'component:price-display', node: {type: 'buy-box', title: '가격 표본', price: '10,000원', action: {label: '구매', href: '#main', variant: 'primary'}}, since: '2.4.0', text: '10,000원', changed: {price: '12,000원'}, bad: n => { delete n.price; }},
    {id: 'component:cart-item', node: {type: 'summary', title: '장바구니 항목', items: [{label: '수량 1 · 마우스', value: '10,000원'}], total: {label: '합계', value: '10,000원'}}, since: '2.4.0', text: '마우스', changed: {items: [{label: '수량 2 · 키보드', value: '12,000원'}]}, bad: n => { delete n.total; }},
  ];
  for (const c of cases) {
    const first = compile(nodeDoc(c.node, c.since));
    assert.ok(first.html.includes(c.text), `${c.id}: declared material renders from a Blueprint`);
    const second = compile(nodeDoc({...c.node, ...c.changed}, c.since));
    assert.notEqual(second.html, first.html, `${c.id}: Blueprint content changes output`);
    const invalidBlueprint = structuredClone(nodeDoc(c.node, c.since));
    c.bad(invalidBlueprint.tree.children.at(-1));
    assert.equal(compileBlueprint(invalidBlueprint, {include: ['html']}).ok, false, `${c.id}: invalid Blueprint is refused`);
  }

  const family = getPurposeFamily('purpose:card.product');
  const base = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '상점', kpis: [{label: '상품', value: '1'}, {label: '후기', value: '2'}, {label: '할인', value: '3'}]}}, {include: ['blueprint']});
  assert.equal(base.ok, true);
  const productBlueprint = (badge, price = '10,000원') => {
    const doc = structuredClone(base.value.candidates[0].value.blueprint);
    doc.materials.purposes = [0, 1, 2].map(i => ({id: family.id, visual: 'family:soft', uid: `commerce-discount-${i}`, variant: family.example.variant, props: family.example.props, content: {...family.example.content, title: `할인 상품 ${i + 1}`, price, badge}}));
    doc.tree.children[1].children = doc.tree.children[1].children.map((node, i) => ({...node, label: `platform-purpose-${i}`}));
    return doc;
  };
  const discount = compile(productBlueprint('15% 할인'));
  assert.match(discount.html, /15% 할인/);
  assert.match(discount.html, /할인 상품/);
  assert.notEqual(compile(productBlueprint('20% 할인', '12,000원')).html, discount.html);
  const invalid = productBlueprint('15% 할인');
  delete invalid.materials.purposes[0].content.price;
  assert.equal(compileBlueprint(invalid, {include: ['html']}).ok, false);
  assert.equal(COMMERCE_SPECS.length, 11);
});
