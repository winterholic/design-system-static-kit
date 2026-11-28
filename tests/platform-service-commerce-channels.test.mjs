// §6.2 N 계열: 같은 입력이 Core(서비스 함수), REST 실행기, MCP 도구에서 같은 바이트를 낸다.
// REST·MCP는 어댑터라서 조립 로직을 따로 두지 않는다. 이 시험은 실제 어댑터 코드(operations.mjs, mcp.mjs)를 같은 프로세스에서 실행한다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents} from '../src/service/index.mjs';
import {mcpConnect, rest} from './channel-support.mjs';
import {COMMERCE_SPECS} from '../src/platform/families/contracts.mjs';

let client;
before(async () => { client = await mcpConnect('modern'); });
after(async () => { await client.close(); });

const json = x => JSON.stringify(x);
const mcp = async (name, args) => (await client.callTool({name, arguments: args})).structuredContent;
const BASE = {
  context: 'commerce', mode: 'light', density: 'comfortable',
  palette: 'palette:static-kit', subtokenSet: 'subtoken-set:commerce-vivid', typeSystem: 'type-system:shop-catalog',
  items: [{purpose: 'purpose:card.product', visual: 'family:soft', content: {title: '상품', price: '30,000원'}}],
};

const ALL_COMMERCE_IDS = COMMERCE_SPECS.map(s => s[0]);
const COMMERCE_PROPS = {
  'component:product-grid': {items: [{title: '헤드폰', price: '120,000원'}, {title: '스피커', price: '80,000원'}]},
  'component:product-detail-summary': {title: '노이즈캔슬링 헤드폰', price: '189,000원', options: [{label: '색상', choices: ['블랙', '실버']}]},
  'component:product-variant-selector': {options: [{label: '용량', choices: ['64GB', '128GB', '256GB']}]},
  'component:quantity-selector': {value: 3, min: 1, max: 10},
  'component:price-display': {price: '189,000원', originalPrice: '239,000원'},
  'component:discount-display': {rate: '21%', badge: '특가'},
  'component:cart-item': {title: '스마트워치', price: '250,000원', quantity: 1, option: '스트랩: 가죽'},
  'component:cart-summary': {title: '장바구니 요약', items: [{label: '상품금액', value: '250,000원'}, {label: '배송비', value: '무료'}], total: {label: '결제예정', value: '250,000원'}},
  'component:checkout-summary': {title: '주문서 요약', items: [{label: '주문금액', value: '250,000원'}], total: {label: '최종결제', value: '250,000원'}},
  'component:order-status': {orderNumber: 'ORD-20261128', statusLabel: '배송중'},
  'component:review-summary': {score: '4.9', count: '1,200개', items: [{rating: 5, text: '좋습니다', author: '박*수'}]},
};

const REQUEST = {
  ...BASE,
  commerce: ALL_COMMERCE_IDS.map(component => ({component, props: COMMERCE_PROPS[component]})),
};

test('commerce: Core, POST /api/v1/platform/assemble-components and the assemble_components tool return identical bytes for all eleven N components', async () => {
  const core = assembleComponents(REQUEST);
  assert.equal(core.ok, true, json(core.errors));
  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: REQUEST});
  assert.equal(viaRest.status, 200);
  assert.equal(viaRest.text, json(core), 'REST body is the Core envelope, byte for byte');
  assert.equal(json(await mcp('assemble_components', REQUEST)), json(core), 'MCP structured content is the Core envelope');

  for (const id of ALL_COMMERCE_IDS) {
    assert.ok(core.value.html.includes(`data-component="${id}"`), `${id} reaches the output through every channel`);
  }
  assert.equal(core.value.manifest.commerceItems.length, 11);
  assert.ok(core.value.standalone.includes(core.value.script) && core.value.script.includes('window.__kitCommerce'), 'the standalone export carries the commerce runtime');
});

test('commerce: a different input changes the output through every channel (channels do not ignore the commerce argument)', async () => {
  const none = assembleComponents(BASE);
  const some = assembleComponents({
    ...BASE,
    commerce: [{component: 'component:quantity-selector', props: {value: 7, min: 1, max: 20}}],
  });
  assert.notEqual(json(none), json(some));
  assert.ok(!none.value.html.includes('kit-quantity-selector'));

  const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {
    body: {...BASE, commerce: [{component: 'component:quantity-selector', props: {value: 7, min: 1, max: 20}}]},
  });
  assert.ok(viaRest.json.value.html.includes('value="7"'), 'REST renders the requested commerce component');
  const viaMcp = await mcp('assemble_components', {
    ...BASE, commerce: [{component: 'component:quantity-selector', props: {value: 7, min: 1, max: 20}}],
  });
  assert.ok(viaMcp.value.html.includes('value="7"'), 'MCP renders the requested commerce component');
  assert.equal(viaRest.text, json(some));
});

test('commerce: input the service rejects is the same diagnostic everywhere (unregistered component, 12 items exceeds max)', async () => {
  const cases = [
    {...BASE, commerce: [{component: 'component:unregistered-xyz', props: {label: 'x'}}]},
    {...BASE, commerce: Array.from({length: 12}, () => ({component: 'component:price-display', props: {price: '1,000원'}}))},
  ];
  for (const request of cases) {
    const core = assembleComponents(request);
    assert.equal(core.ok, false);
    const viaRest = await rest('POST', '/api/v1/platform/assemble-components', {body: request});
    assert.ok(viaRest.status >= 400 && viaRest.status < 500);
    const call = await client.callTool({name: 'assemble_components', arguments: request});
    assert.equal(call.isError, true);
  }
});
