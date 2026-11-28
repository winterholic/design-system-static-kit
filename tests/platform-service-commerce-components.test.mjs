// §6.2 N 커머스 패턴의 서비스 조립 검증.
// assembleComponents의 commerce 인자로 전달된 컴포넌트들이 정상 렌더되고,
// Product Grid, Quantity Selector, Price Display, Discount Display, Cart Item, Order Status의 구조 및 값·입력 반영을 증명한다.
// Product Variant Selector의 part-of 경로가 필수 선택·상태를 실제로 지원하는지 확인한다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents} from '../src/service/index.mjs';
import {COMMERCE_SPECS} from '../src/platform/families/contracts.mjs';

const base = {
  context: 'commerce', mode: 'light', density: 'comfortable',
  palette: 'palette:static-kit', subtokenSet: 'subtoken-set:commerce-vivid', typeSystem: 'type-system:shop-catalog',
  items: [{purpose: 'purpose:card.product', visual: 'family:soft', content: {title: '기본 상품', price: '30,000원'}}],
};

test('service assembly returns commerce HTML, CSS, manifest metadata and standalone export', () => {
  const r = assembleComponents({
    ...base,
    commerce: [
      {component: 'component:quantity-selector', props: {value: 4, min: 1, max: 20}},
      {component: 'component:price-display', props: {price: '59,000원', originalPrice: '79,000원'}},
    ],
  });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.match(r.value.html, /value="4"/);
  assert.match(r.value.html, /59,000원/);
  assert.match(r.value.html, /79,000원/);
  assert.match(r.value.css, /kit-quantity-selector/);
  assert.deepEqual(r.value.manifest.commerceItems.map(x => x.component), ['component:quantity-selector', 'component:price-display']);
  assert.ok(r.value.standalone.includes(r.value.html));
  assert.ok(r.value.script.includes('window.__kitCommerce'));
});

test('all eleven N commerce entries render from the shared service boundary with unique ids and the commerce runtime', () => {
  const allIds = COMMERCE_SPECS.map(s => s[0]);
  const allProps = {
    'component:product-grid': {items: [{title: 'A', price: '10,000원'}, {title: 'B', price: '20,000원'}]},
    'component:product-detail-summary': {title: '노트북', price: '1,500,000원'},
    'component:product-variant-selector': {options: [{label: '색상', choices: ['스페이스 그레이', '실버']}]},
    'component:quantity-selector': {value: 2},
    'component:price-display': {price: '1,500,000원', originalPrice: '1,800,000원'},
    'component:discount-display': {rate: '17%', badge: '한정특가'},
    'component:cart-item': {title: '노트북', price: '1,500,000원', quantity: 1},
    'component:cart-summary': {title: '장바구니', items: [{label: '상품', value: '1,500,000원'}], total: {label: '합계', value: '1,500,000원'}},
    'component:checkout-summary': {title: '결제하기', items: [{label: '주문', value: '1,500,000원'}], total: {label: '합계', value: '1,500,000원'}},
    'component:order-status': {orderNumber: '20261128-999', statusLabel: '결제완료'},
    'component:review-summary': {score: '4.9', count: '99개', items: [{rating: 5, text: '최고예요', author: '유저'}]},
  };
  const r = assembleComponents({
    ...base,
    commerce: allIds.map(component => ({component, props: allProps[component]})),
  });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.value.manifest.commerceItems.length, 11);
  for (const id of allIds) assert.ok(r.value.html.includes(`data-component="${id}"`), id);
  assert.ok(r.value.script.includes('window.__kitCommerce'), 'runtime is shipped');
});

test('service rejects an unregistered commerce component instead of rendering arbitrary markup', () => {
  const r = assembleComponents({...base, commerce: [{component: 'component:invalid-commerce', props: {}}]});
  assert.equal(r.ok, false);
  assert.match(r.errors[0].path, /commerce\[0\]\.component/);
});

test('value and input changes drive the output for the 6 core components', () => {
  // 1. Product Grid: columns, gap, items 변경 시 출력 반영 증명
  const grid1 = assembleComponents({...base, commerce: [{component: 'component:product-grid', props: {columns: 'two', gap: 'sm', items: [{title: '특수제품X', price: '99,000원'}]}}]});
  const grid2 = assembleComponents({...base, commerce: [{component: 'component:product-grid', props: {columns: 'four', gap: 'lg', items: [{title: '특수제품Y', price: '199,000원'}]}}]});
  assert.ok(grid1.value.html.includes('data-columns="two"'));
  assert.ok(grid1.value.html.includes('data-gap="sm"'));
  assert.ok(grid1.value.html.includes('특수제품X'));
  assert.ok(grid2.value.html.includes('data-columns="four"'));
  assert.ok(grid2.value.html.includes('data-gap="lg"'));
  assert.ok(grid2.value.html.includes('특수제품Y'));
  assert.notEqual(grid1.value.html, grid2.value.html);

  // 2. Quantity Selector: value, min, max, state 변경 시 반영 증명
  const qs1 = assembleComponents({...base, commerce: [{component: 'component:quantity-selector', props: {value: 1, min: 1, max: 5}}]});
  const qs2 = assembleComponents({...base, commerce: [{component: 'component:quantity-selector', props: {value: 5, min: 1, max: 5, state: 'disabled'}}]});
  assert.ok(qs1.value.html.includes('value="1"'));
  // value === min일 때 감소 버튼 disabled
  assert.ok(qs1.value.html.includes('data-action="decrease" aria-label="수량 감소" disabled'));
  assert.ok(qs2.value.html.includes('value="5"'));
  assert.ok(qs2.value.html.includes('data-state="disabled"'));
  assert.notEqual(qs1.value.html, qs2.value.html);

  // 3. Price Display: price, originalPrice, unit, state 변경 시 반영 증명
  const pd1 = assembleComponents({...base, commerce: [{component: 'component:price-display', props: {price: '15,000원'}}]});
  const pd2 = assembleComponents({...base, commerce: [{component: 'component:price-display', props: {price: '12,000원', originalPrice: '20,000원', unit: '/박스', state: 'sale'}}]});
  assert.ok(pd1.value.html.includes('15,000원'));
  assert.ok(!pd1.value.html.includes('정가'));
  assert.ok(pd2.value.html.includes('12,000원'));
  assert.ok(pd2.value.html.includes('20,000원'));
  assert.ok(pd2.value.html.includes('/박스'));
  assert.ok(pd2.value.html.includes('data-state="sale"'));
  assert.notEqual(pd1.value.html, pd2.value.html);

  // 4. Discount Display: rate, amount, badge 변경 시 반영 증명
  const dd1 = assembleComponents({...base, commerce: [{component: 'component:discount-display', props: {rate: '15%'}}]});
  const dd2 = assembleComponents({...base, commerce: [{component: 'component:discount-display', props: {rate: '40%', amount: '20,000원 할인', badge: '블랙프라이데이'}}]});
  assert.ok(dd1.value.html.includes('15%'));
  assert.ok(!dd1.value.html.includes('블랙프라이데이'));
  assert.ok(dd2.value.html.includes('40%'));
  assert.ok(dd2.value.html.includes('20,000원 할인'));
  assert.ok(dd2.value.html.includes('블랙프라이데이'));
  assert.notEqual(dd1.value.html, dd2.value.html);

  // 5. Cart Item: title, option, quantity, price, removable 변경 시 반영 증명
  const ci1 = assembleComponents({...base, commerce: [{component: 'component:cart-item', props: {title: '아이템 1', price: '10,000원', quantity: 1, option: '옵션 A'}}]});
  const ci2 = assembleComponents({...base, commerce: [{component: 'component:cart-item', props: {title: '아이템 2', price: '20,000원', quantity: 3, removable: false, state: 'out-of-stock'}}]});
  assert.ok(ci1.value.html.includes('아이템 1'));
  assert.ok(ci1.value.html.includes('옵션 A'));
  assert.ok(ci1.value.html.includes('data-action="cart-remove"'));
  assert.ok(ci2.value.html.includes('아이템 2'));
  assert.ok(ci2.value.html.includes('data-state="out-of-stock"'));
  assert.ok(!ci2.value.html.includes('data-action="cart-remove"'));
  assert.notEqual(ci1.value.html, ci2.value.html);

  // 6. Order Status: orderNumber, status, statusLabel, steps, currentStep 변경 시 반영 증명
  const os1 = assembleComponents({...base, commerce: [{component: 'component:order-status', props: {orderNumber: 'ORD-001', status: 'preparing', statusLabel: '상품준비중', currentStep: 1}}]});
  const os2 = assembleComponents({...base, commerce: [{component: 'component:order-status', props: {orderNumber: 'ORD-002', status: 'delivered', statusLabel: '배송완료', currentStep: 4, delivery: {recipient: '홍길동', address: '서울시 강남구'}}}]});
  assert.ok(os1.value.html.includes('ORD-001'));
  assert.ok(os1.value.html.includes('상품준비중'));
  assert.ok(os2.value.html.includes('ORD-002'));
  assert.ok(os2.value.html.includes('배송완료'));
  assert.ok(os2.value.html.includes('홍길동'));
  assert.ok(os2.value.html.includes('서울시 강남구'));
  assert.notEqual(os1.value.html, os2.value.html);
});

test('Product Variant Selector part-of path ensures required selection and checked state', () => {
  const r = assembleComponents({
    ...base,
    commerce: [{
      component: 'component:product-variant-selector',
      props: {
        id: 'pvs-sample',
        options: [
          {label: '용량', choices: ['128GB', '256GB', '512GB']},
          {label: '색상', choices: ['스페이스 그레이', '스타라이트']},
        ],
      },
    }],
  });
  assert.equal(r.ok, true);
  // 첫 번째 choice는 반드시 checked되어 필수 선택 기본값이 설정됨
  assert.match(r.value.html, /name="pvs-sample-opt-0" value="128GB"[^>]*checked/);
  assert.match(r.value.html, /name="pvs-sample-opt-1" value="스페이스 그레이"[^>]*checked/);
  assert.match(r.value.html, /value="256GB"/);
  assert.match(r.value.html, /value="스타라이트"/);
});
