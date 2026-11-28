/**
 * §6.2 N(커머스 패턴) 11항목의 컴포넌트 계약, 단독 렌더러, 런타임, CSS.
 *
 * Product Grid, Product Detail Summary, Product Variant Selector, Quantity Selector,
 * Price Display, Discount Display, Cart Item, Cart Summary, Checkout Summary, Order Status, Review Summary
 * 11개 항목의 계약과 실제 렌더를 담당한다.
 *
 * 기존 렌더러(buy-box, summary, reviews, card.product, grid)를 최대한 활용하고,
 * 고유 동작·구조가 필요한 수량 조절·가격/할인 표시·장바구니 항목·주문 상태를 실제 렌더한다.
 */
import {escapeHTML} from '../../escape-html.mjs';
import {icon} from '../../render/icon.mjs';
import {COMPONENT_CLASSIFICATION} from './inventory.mjs';

const e = escapeHTML;
const escAttr = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const SAFE = /^[a-z][a-z0-9-]*$/;

const NODE = (type, axes = {}) => ({field: 'tree', node: type, axes});
const PURPOSE = id => ({field: 'materials.purposes', purpose: id});

/**
 * §6.2 N 11항목의 스펙 정의
 * [id, label, key, componentType, materialId, blueprint]
 */
export const COMMERCE_SPECS = [
  ['component:product-grid', 'Product Grid', 'n-01-product-grid', 'product-grid', 'component:grid', NODE('grid', {columns: 'three'})],
  ['component:product-detail-summary', 'Product Detail Summary', 'n-02-product-detail-summary', 'buy-box', 'component:buy-box', NODE('buy-box')],
  ['component:product-variant-selector', 'Product Variant Selector', 'n-03-product-variant-selector', 'buy-box', 'component:buy-box', NODE('buy-box')],
  ['component:quantity-selector', 'Quantity Selector', 'n-04-quantity-selector', 'quantity-selector', 'base-component:input-control', NODE('input-control', {kind: 'number'})],
  ['component:price-display', 'Price Display', 'n-05-price-display', 'price-display', 'component:buy-box', NODE('buy-box')],
  ['component:discount-display', 'Discount Display', 'n-06-discount-display', 'discount-display', 'purpose:card.product', PURPOSE('purpose:card.product')],
  ['component:cart-item', 'Cart Item', 'n-07-cart-item', 'cart-item', 'component:summary', NODE('summary')],
  ['component:cart-summary', 'Cart Summary', 'n-08-cart-summary', 'summary', 'component:summary', NODE('summary')],
  ['component:checkout-summary', 'Checkout Summary', 'n-09-checkout-summary', 'summary', 'component:summary', NODE('summary')],
  ['component:order-status', 'Order Status', 'n-10-order-status', 'order-status', 'component:steps', NODE('steps')],
  ['component:review-summary', 'Review Summary', 'n-11-review-summary', 'reviews', 'component:reviews', NODE('reviews')],
];

const LAYER_OF = Object.freeze({independent: 'Base', variant: 'Purpose', composite: 'Composite'});

const SIZES = Object.freeze(['sm', 'md', 'lg', 'xl']);
const STATES = Object.freeze(['default', 'disabled', 'readonly', 'sold-out', 'sale', 'loading', 'out-of-stock']);

function checkCommerceProps(id, p) {
  if (p.size !== undefined && !SIZES.includes(p.size)) {
    throw new TypeError(`size는 ${SIZES.join('·')} 중 하나입니다: ${String(p.size)}`);
  }
  if (p.state !== undefined && !STATES.includes(p.state)) {
    throw new TypeError(`state는 ${STATES.join('·')} 중 하나입니다: ${String(p.state)}`);
  }
  if (id === 'component:quantity-selector') {
    if (p.value !== undefined && typeof p.value !== 'number') throw new TypeError('value는 숫자여야 합니다');
  }
  if (id === 'component:price-display') {
    if (!p.price || typeof p.price !== 'string') throw new TypeError('price는 필수 문자열입니다');
  }
  if (id === 'component:discount-display') {
    if (!p.rate || typeof p.rate !== 'string') throw new TypeError('rate는 필수 문자열입니다');
  }
  if (id === 'component:cart-item') {
    if (!p.title || typeof p.title !== 'string') throw new TypeError('title은 필수 문자열입니다');
    if (!p.price || typeof p.price !== 'string') throw new TypeError('price는 필수 문자열입니다');
  }
  if (id === 'component:order-status') {
    if (!p.orderNumber || typeof p.orderNumber !== 'string') throw new TypeError('orderNumber는 필수 문자열입니다');
    if (!p.statusLabel || typeof p.statusLabel !== 'string') throw new TypeError('statusLabel은 필수 문자열입니다');
  }
  if (id === 'component:product-variant-selector') {
    if (!Array.isArray(p.options) || p.options.length === 0) throw new TypeError('options는 1개 이상의 배열이어야 합니다');
  }
}

/** 렌더러 함수들 */

function renderQuantitySelector(p) {
  const val = p.value ?? 1;
  const min = p.min ?? 1;
  const max = p.max ?? 99;
  const step = p.step ?? 1;
  const size = p.size ?? 'md';
  const disabled = p.state === 'disabled';
  const readonly = p.state === 'readonly';
  const id = p.id ?? 'kit-qty-input';
  const label = p.label ?? '수량 조절';

  const decDisabled = disabled || val <= min;
  const incDisabled = disabled || val >= max;

  return `<div class="kit-quantity-selector" data-component="component:quantity-selector" data-size="${escAttr(size)}"${p.state ? ` data-state="${escAttr(p.state)}"` : ''} role="group" aria-label="${escAttr(label)}">` +
    `<button type="button" class="kit-qty-btn" data-action="decrease" aria-label="수량 감소"${decDisabled ? ' disabled' : ''}>${icon('minus')}</button>` +
    `<input type="number" id="${escAttr(id)}" class="kit-qty-input" value="${val}" min="${min}" max="${max}" step="${step}" aria-label="${escAttr(label)}"${disabled ? ' disabled' : ''}${readonly ? ' readonly' : ''}>` +
    `<button type="button" class="kit-qty-btn" data-action="increase" aria-label="수량 증가"${incDisabled ? ' disabled' : ''}>${icon('plus')}</button>` +
    `</div>`;
}

function renderPriceDisplay(p) {
  const size = p.size ?? 'md';
  const state = p.state ?? 'default';
  return `<div class="kit-price-display" data-component="component:price-display" data-size="${escAttr(size)}" data-state="${escAttr(state)}">` +
    `<span class="kit-price-current">${e(p.price)}</span>` +
    (p.originalPrice ? `<s class="kit-price-original">${e(p.originalPrice)}<span class="kit-ctl-sr"> 정가</span></s>` : '') +
    (p.unit ? `<span class="kit-price-unit">${e(p.unit)}</span>` : '') +
    (state === 'sold-out' ? '<span class="kit-price-status">품절</span>' : '') +
    `</div>`;
}

function renderDiscountDisplay(p) {
  const variant = p.variant ?? 'badge';
  const size = p.size ?? 'md';
  return `<div class="kit-discount-display" data-component="component:discount-display" data-variant="${escAttr(variant)}" data-size="${escAttr(size)}">` +
    `<span class="kit-discount-rate">${e(p.rate)}</span>` +
    (p.amount ? `<span class="kit-discount-amount">${e(p.amount)}</span>` : '') +
    (p.badge ? `<span class="kit-discount-badge">${e(p.badge)}</span>` : '') +
    `</div>`;
}

function renderCartItem(p) {
  const qty = p.quantity ?? 1;
  const min = p.min ?? 1;
  const max = p.max ?? 99;
  const removable = p.removable !== false;
  const state = p.state ?? 'default';
  const id = p.id ?? 'cart-item-1';

  return `<article class="kit-cart-item" data-component="component:cart-item" id="${escAttr(id)}"${state !== 'default' ? ` data-state="${escAttr(state)}"` : ''}>` +
    `<div class="kit-cart-item-media" aria-hidden="true">${icon(p.mediaIcon ?? 'bag')}</div>` +
    `<div class="kit-cart-item-body">` +
    `<h4 class="kit-cart-item-title">${e(p.title)}</h4>` +
    (p.option ? `<p class="kit-cart-item-option">${e(p.option)}</p>` : '') +
    `<div class="kit-cart-item-controls">` +
    renderQuantitySelector({value: qty, min, max, size: 'sm', state: state === 'disabled' ? 'disabled' : 'default', id: `${id}-qty`}) +
    renderPriceDisplay({price: p.price, originalPrice: p.originalPrice, size: 'sm'}) +
    `</div>` +
    `</div>` +
    (removable ? `<button type="button" class="kit-cart-item-remove" data-action="cart-remove" aria-label="${escAttr(p.title)} 삭제">${icon('x')}</button>` : '') +
    `</article>`;
}

function renderProductGrid(p) {
  const columns = p.columns ?? 'three';
  const gap = p.gap ?? 'md';
  const items = Array.isArray(p.items) && p.items.length ? p.items : [
    {title: '상품 1', price: '₩39,000', badge: '신상품'},
    {title: '상품 2', price: '₩49,000', originalPrice: '₩59,000', badge: '-17%'},
    {title: '상품 3', price: '₩29,000'},
  ];

  const cardsHtml = items.map((item, i) => {
    return `<article class="kit-product-card" data-index="${i}">` +
      `<div class="kit-product-card-media" aria-hidden="true">${icon(item.mediaIcon ?? 'bag')}${item.badge ? `<span class="kit-product-badge">${e(item.badge)}</span>` : ''}</div>` +
      `<div class="kit-product-card-body">` +
      `<h4 class="kit-product-card-title">${e(item.title)}</h4>` +
      (item.rating ? `<p class="kit-product-card-rating">${icon('star')}<span>${Number(item.rating).toFixed(1)}</span>${item.reviews ? `<span>(${e(item.reviews)})</span>` : ''}</p>` : '') +
      `<p class="kit-price"><span class="kit-price-current">${e(item.price)}</span>${item.originalPrice ? `<s class="kit-price-original">${e(item.originalPrice)}</s>` : ''}</p>` +
      (item.ctaLabel ? `<button type="button" class="kit-button" data-variant="primary" data-size="sm">${e(item.ctaLabel)}</button>` : '') +
      `</div>` +
      `</article>`;
  }).join('');

  return `<div class="kit-product-grid" data-component="component:product-grid" data-columns="${escAttr(columns)}" data-gap="${escAttr(gap)}">${cardsHtml}</div>`;
}

function renderOrderStatus(p) {
  const orderNumber = p.orderNumber ?? '20261128-001';
  const status = p.status ?? 'shipping';
  const statusLabel = p.statusLabel ?? '배송중';
  const steps = Array.isArray(p.steps) && p.steps.length ? p.steps : ['주문접수', '결제완료', '상품준비', '배송중', '배송완료'];
  const current = typeof p.currentStep === 'number' ? p.currentStep : 3;

  const stepsHtml = steps.map((s, i) => {
    const isCurrent = i === current;
    const isDone = i < current;
    return `<li class="kit-order-step"${isCurrent ? ' aria-current="step"' : ''} data-done="${isDone}">` +
      `<span class="kit-order-step-n" aria-hidden="true">${isDone ? icon('check') : i + 1}</span>` +
      `<span class="kit-order-step-label">${e(s)}</span>` +
      (isDone ? '<span class="kit-ctl-sr"> 완료</span>' : '') +
      `</li>`;
  }).join('');

  const deliveryHtml = p.delivery ? `<div class="kit-order-section"><h4 class="kit-order-section-title">배송지 정보</h4><p class="kit-order-text">${e(p.delivery.recipient ?? '')} · ${e(p.delivery.address ?? '')}</p></div>` : '';
  const summaryHtml = p.summary ? `<div class="kit-order-section"><h4 class="kit-order-section-title">결제 금액</h4><p class="kit-order-text">${e(p.summary.totalPrice ?? '')} (${e(p.summary.paymentMethod ?? '신용카드')})</p></div>` : '';

  return `<section class="kit-order-status" data-component="component:order-status" data-status="${escAttr(status)}">` +
    `<div class="kit-order-head">` +
    `<div class="kit-order-meta"><span class="kit-order-number">주문번호 <strong>${e(orderNumber)}</strong></span>${p.orderDate ? `<span class="kit-order-date">${e(p.orderDate)}</span>` : ''}</div>` +
    `<span class="kit-order-badge" data-status="${escAttr(status)}">${e(statusLabel)}</span>` +
    `</div>` +
    `<nav class="kit-stepper" aria-label="주문 진행 단계"><ol class="kit-order-steps">${stepsHtml}</ol></nav>` +
    deliveryHtml + summaryHtml +
    `</section>`;
}

function renderProductDetailSummary(p) {
  const id = p.id ?? 'buy-box-1';
  const title = p.title ?? '상품명';
  const price = p.price ?? '39,000원';
  const options = Array.isArray(p.options) ? p.options : [{label: '옵션', choices: ['기본']}];

  const optsHtml = options.map((opt, oi) => {
    return `<fieldset class="kit-options"><legend>${e(opt.label)}</legend>` +
      opt.choices.map((c, ci) => `<label><input type="radio" name="${escAttr(id)}-opt-${oi}" value="${escAttr(c)}"${ci === 0 ? ' checked' : ''}><span>${e(c)}</span></label>`).join('') +
      `</fieldset>`;
  }).join('');

  return `<section class="kit-buybox" data-component="component:product-detail-summary" id="${escAttr(id)}">` +
    (p.badge ? `<span class="kit-badge" data-tone="brand">${e(p.badge)}</span>` : '') +
    `<h3 class="kit-buybox-title">${e(title)}</h3>` +
    `<p class="kit-price"><span class="kit-price-current">${e(price)}</span></p>` +
    (p.note ? `<p class="kit-muted">${e(p.note)}</p>` : '') +
    optsHtml +
    `<div class="kit-buybox-actions"><button type="button" class="kit-button" data-variant="primary">${e(p.actionLabel ?? '구매하기')}</button></div>` +
    `</section>`;
}

function renderProductVariantSelector(p) {
  const id = p.id ?? 'variant-sel-1';
  const options = Array.isArray(p.options) && p.options.length ? p.options : [{label: '색상', choices: ['블랙', '화이트', '실버']}];

  const optsHtml = options.map((opt, oi) => {
    return `<fieldset class="kit-options" data-option-group="${oi}"><legend>${e(opt.label)}</legend>` +
      opt.choices.map((c, ci) => `<label><input type="radio" name="${escAttr(id)}-opt-${oi}" value="${escAttr(c)}"${ci === 0 ? ' checked' : ''}><span>${e(c)}</span></label>`).join('') +
      `</fieldset>`;
  }).join('');

  return `<div class="kit-variant-selector" data-component="component:product-variant-selector" id="${escAttr(id)}">${optsHtml}</div>`;
}

function renderCartSummary(p) {
  const title = p.title ?? '장바구니 요약';
  const items = Array.isArray(p.items) && p.items.length ? p.items : [{label: '총 상품금액', value: '39,000원'}, {label: '배송비', value: '무료'}];
  const total = p.total ?? {label: '결제 예정 금액', value: '39,000원'};

  const itemsHtml = items.map(x => `<div><dt>${e(x.label)}</dt><dd>${e(x.value)}</dd></div>`).join('');

  return `<section class="kit-summary" data-component="component:cart-summary">` +
    `<h3>${e(title)}</h3>` +
    `<dl>${itemsHtml}<div class="kit-total"><dt>${e(total.label)}</dt><dd>${e(total.value)}</dd></div></dl>` +
    `<button type="button" class="kit-button" data-variant="primary">${e(p.actionLabel ?? '주문하기')}</button>` +
    `</section>`;
}

function renderCheckoutSummary(p) {
  const title = p.title ?? '결제 요약';
  const items = Array.isArray(p.items) && p.items.length ? p.items : [{label: '주문금액', value: '39,000원'}, {label: '할인금액', value: '-3,900원'}];
  const total = p.total ?? {label: '최종 결제 금액', value: '35,100원'};

  const itemsHtml = items.map(x => `<div><dt>${e(x.label)}</dt><dd>${e(x.value)}</dd></div>`).join('');

  return `<section class="kit-summary" data-component="component:checkout-summary">` +
    `<h3>${e(title)}</h3>` +
    `<dl>${itemsHtml}<div class="kit-total"><dt>${e(total.label)}</dt><dd>${e(total.value)}</dd></div></dl>` +
    `<button type="button" class="kit-button" data-variant="primary">${e(p.actionLabel ?? '결제하기')}</button>` +
    `</section>`;
}

function renderReviewSummary(p) {
  const score = p.score ?? '4.8';
  const count = p.count ?? '128개 리뷰';
  const items = Array.isArray(p.items) && p.items.length ? p.items : [
    {rating: 5, text: '배송 빠르고 품질 좋습니다.', author: '김*수', date: '2026.11.20'},
    {rating: 4, text: '가성비 만족합니다.', author: '이*진', date: '2026.11.18'},
  ];

  const itemsHtml = items.map(x => {
    return `<li>` +
      `<p class="kit-stars" role="img" aria-label="5점 만점에 ${x.rating}점">${icon('star').repeat(Number(x.rating) || 5)}</p>` +
      `<p>${e(x.text)}</p>` +
      `<p class="kit-muted">${e(x.author)}${x.date ? ` · ${e(x.date)}` : ''}</p>` +
      `</li>`;
  }).join('');

  return `<section class="kit-reviews" data-component="component:review-summary">` +
    `<h3>리뷰</h3>` +
    `<p class="kit-score"><strong>${e(score)}</strong> <span class="kit-muted">(${e(count)})</span></p>` +
    `<ul>${itemsHtml}</ul>` +
    `</section>`;
}

/** 메인 진입 렌더러 */
export function renderCommerceComponent(id, props = {}) {
  checkCommerceProps(id, props);
  switch (id) {
    case 'component:product-grid': return renderProductGrid(props);
    case 'component:product-detail-summary': return renderProductDetailSummary(props);
    case 'component:product-variant-selector': return renderProductVariantSelector(props);
    case 'component:quantity-selector': return renderQuantitySelector(props);
    case 'component:price-display': return renderPriceDisplay(props);
    case 'component:discount-display': return renderDiscountDisplay(props);
    case 'component:cart-item': return renderCartItem(props);
    case 'component:cart-summary': return renderCartSummary(props);
    case 'component:checkout-summary': return renderCheckoutSummary(props);
    case 'component:order-status': return renderOrderStatus(props);
    case 'component:review-summary': return renderReviewSummary(props);
    default: throw new TypeError(`Unknown commerce component: ${id}`);
  }
}

/** 계약 객체 목록 */
export const COMMERCE_COMPONENTS = Object.freeze(COMMERCE_SPECS.map(([id, label, key, componentType, materialId, blueprint]) => {
  const classification = COMPONENT_CLASSIFICATION[key];
  if (!classification) throw new Error(`분류표에 없는 요구 항목: ${key}`);
  return Object.freeze({
    id, label, requirementId: `req:comp:${key}`, classification, componentType, materialId, blueprint, layer: LAYER_OF[classification],
    version: '1.0.0', render: props => renderCommerceComponent(id, props ?? {}),
  });
}));

export const COMMERCE_COMPONENT_BY_ID = new Map(COMMERCE_COMPONENTS.map(item => [item.id, item]));

function makeCommerceContract(spec) {
  return Object.freeze({
    version: '1.0.0',
    componentType: spec.id,
    contexts: ['any'],
    structure: 'single root',
    slots: [],
    props: {},
    content: {},
    appearance: ['default'],
    sizes: ['md'],
    density: ['comfortable'],
    states: ['default'],
    transitions: [],
    events: [],
    tokens: [],
    parents: ['slot:main'],
    children: [],
    responsive: {strategy: 'fluid', breakpoints: ['768px'], behavior: 'fluid'},
    accessibility: {role: 'region', keyboard: [], requirements: []},
    forbidden: [],
    examples: [],
    usage: '',
    renderer: {module: 'src/platform/families/commerce.mjs', export: 'renderCommerceComponent'},
    blueprint: {field: 'materials.purposes'},
    tests: ['tests/platform-family-contract.test.mjs'],
    unsupported: {},
    ...spec,
  });
}

export const COMMERCE_CONTRACTS = Object.freeze(COMMERCE_COMPONENTS.map(item => makeCommerceContract({
  id: item.id, componentType: item.componentType, layer: item.layer, purpose: item.label, contexts: ['commerce', 'listing', 'any'],
  structure: item.classification,
  slots: item.classification === 'composite' ? ['primary', 'secondary'] : ['content'],
  props: {size: ['sm', 'md', 'lg', 'xl'], state: ['default', 'disabled', 'readonly', 'sold-out', 'sale', 'out-of-stock']},
  content: {label: {type: 'string', required: false}},
  appearance: ['default'], sizes: ['sm', 'md', 'lg', 'xl'],
  states: ['default', 'disabled', 'readonly', 'sold-out', 'sale', 'out-of-stock'],
  transitions: ['default→disabled', 'default→sale', 'default→sold-out'],
  events: ['click', 'change', 'kit-cart-remove'],
  tokens: ['--kit-text', '--kit-muted', '--kit-accent', '--kit-control-bg', '--kit-control-border'],
  parents: ['slot:main', 'slot:aside'], children: [],
  responsive: {strategy: 'fluid and wrap', breakpoints: ['640px', '768px'], behavior: 'grid columns collapse on narrow viewports'},
  accessibility: {role: 'region', keyboard: ['Tab', 'Enter', 'Space', 'ArrowUp', 'ArrowDown'], requirements: ['numeric input supports keyboard adjustments', 'price and discount carry accessible text']},
  forbidden: [],
  examples: [{label: item.label}],
  usage: `${item.label} in commerce flows.`,
  renderer: {module: 'src/platform/families/commerce.mjs', export: 'renderCommerceComponent'},
  blueprint: {...item.blueprint, id: item.materialId},
  tests: ['tests/platform-commerce-blueprint.test.mjs', 'tests/platform-service-commerce-channels.test.mjs'],
  unsupported: {},
})));

/** CSS 조각 */
export const COMMERCE_COMPONENT_CSS = `
.kit-quantity-selector{display:inline-flex;align-items:center;border:1px solid var(--kit-control-border,#ccc);border-radius:var(--kit-radius,4px);background:var(--kit-control-bg,#fff);overflow:hidden}
.kit-quantity-selector .kit-qty-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;background:transparent;color:var(--kit-control-fg,inherit);cursor:pointer;padding:0}
.kit-quantity-selector .kit-qty-btn:disabled{opacity:.4;cursor:not-allowed}
.kit-quantity-selector .kit-qty-input{width:48px;height:36px;border:0;border-inline:1px solid var(--kit-control-border,#ccc);text-align:center;font-size:var(--kit-t-body,14px);-moz-appearance:textfield}
.kit-quantity-selector .kit-qty-input::-webkit-outer-spin-button,.kit-quantity-selector .kit-qty-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.kit-quantity-selector[data-size="sm"]{height:28px}.kit-quantity-selector[data-size="sm"] .kit-qty-btn{width:28px;height:28px}.kit-quantity-selector[data-size="sm"] .kit-qty-input{width:36px;height:28px;font-size:12px}
.kit-quantity-selector[data-size="lg"]{height:44px}.kit-quantity-selector[data-size="lg"] .kit-qty-btn{width:44px;height:44px}.kit-quantity-selector[data-size="lg"] .kit-qty-input{width:56px;height:44px;font-size:16px}
.kit-price-display{display:inline-flex;align-items:baseline;gap:var(--kit-sp-near,6px);font-family:var(--kit-font,inherit)}
.kit-price-current{font-size:var(--kit-t-price,18px);font-weight:700;color:var(--kit-text,#111)}
.kit-price-original{font-size:var(--kit-t-small,13px);color:var(--kit-muted,#666);text-decoration:line-through}
.kit-price-unit{font-size:var(--kit-t-caption,12px);color:var(--kit-muted,#666)}
.kit-price-status{display:inline-block;padding:2px 6px;border-radius:2px;font-size:11px;background:var(--kit-muted,#eee);color:var(--kit-text,#333)}
.kit-discount-display{display:inline-flex;align-items:center;gap:4px}
.kit-discount-rate{font-weight:700;color:var(--kit-danger,#e53e3e);font-size:var(--kit-t-price,18px)}
.kit-discount-badge{padding:2px 6px;border-radius:4px;background:var(--kit-accent,#e53e3e);color:#fff;font-size:12px;font-weight:700}
.kit-cart-item{display:flex;align-items:center;gap:var(--kit-sp-item,12px);padding:var(--kit-sp-item,12px);border-bottom:1px solid var(--kit-rule,#eee)}
.kit-cart-item[hidden]{display:none!important}
.kit-cart-item-media{width:64px;height:64px;border-radius:var(--kit-radius,4px);background:var(--kit-surface-alt,#f5f5f5);display:flex;align-items:center;justify-content:center}
.kit-cart-item-body{flex:1;min-width:0}
.kit-cart-item-title{margin:0 0 4px;font-size:var(--kit-t-sub,15px);color:var(--kit-text,#111)}
.kit-cart-item-option{margin:0 0 8px;font-size:var(--kit-t-caption,12px);color:var(--kit-muted,#666)}
.kit-cart-item-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.kit-cart-item-remove{border:0;background:transparent;cursor:pointer;color:var(--kit-muted,#999);padding:4px}
.kit-cart-item-remove:hover{color:var(--kit-danger,#e53e3e)}
.kit-product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--kit-sp-item,16px)}
.kit-product-grid[data-columns="two"]{grid-template-columns:repeat(2,1fr)}
.kit-product-grid[data-columns="three"]{grid-template-columns:repeat(3,1fr)}
.kit-product-grid[data-columns="four"]{grid-template-columns:repeat(4,1fr)}
@media(max-width:640px){.kit-product-grid{grid-template-columns:repeat(1,1fr)!important}}
.kit-product-card{border:1px solid var(--kit-rule,#eee);border-radius:var(--kit-radius,6px);overflow:hidden;background:var(--kit-surface,#fff);display:flex;flex-direction:column}
.kit-product-card-media{position:relative;height:160px;background:var(--kit-surface-alt,#f8f8f8);display:flex;align-items:center;justify-content:center}
.kit-product-badge{position:absolute;top:8px;left:8px;background:var(--kit-accent,#e53e3e);color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:700}
.kit-product-card-body{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
.kit-product-card-title{margin:0;font-size:var(--kit-t-body,14px)}
.kit-product-card-rating{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--kit-muted,#666);margin:0}
.kit-order-status{border:1px solid var(--kit-rule,#eee);border-radius:var(--kit-radius,8px);padding:16px;background:var(--kit-surface,#fff)}
.kit-order-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--kit-rule,#eee);padding-bottom:12px;margin-bottom:16px}
.kit-order-badge{padding:4px 8px;border-radius:4px;font-size:12px;font-weight:700;background:var(--kit-accent-subtle,#e2e8f0);color:var(--kit-text,#333)}
.kit-order-steps{display:flex;list-style:none;padding:0;margin:16px 0;justify-content:space-between}
.kit-order-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;position:relative}
.kit-order-step-n{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--kit-surface-alt,#eee);color:var(--kit-muted,#666);font-size:12px;font-weight:700}
.kit-order-step[aria-current="step"] .kit-order-step-n{background:var(--kit-accent,#3182ce);color:#fff}
.kit-order-step[data-done="true"] .kit-order-step-n{background:var(--kit-success,#38a169);color:#fff}
.kit-order-step-label{font-size:12px;color:var(--kit-muted,#666)}
.kit-order-step[aria-current="step"] .kit-order-step-label{color:var(--kit-text,#111);font-weight:700}
.kit-order-section{margin-top:16px;padding-top:12px;border-top:1px dashed var(--kit-rule,#eee)}
.kit-order-section-title{margin:0 0 4px;font-size:13px;color:var(--kit-muted,#666)}
.kit-order-text{margin:0;font-size:14px;color:var(--kit-text,#111)}
`;

/** 런타임: 수량 조절기 증감, 장바구니 아이템 삭제 */
export const COMMERCE_COMPONENT_RUNTIME = `(function(){
if(window.__kitCommerce)return;window.__kitCommerce=true;
document.addEventListener('click',function(ev){
  var btn=ev.target.closest('[data-action="decrease"],[data-action="increase"]');
  if(btn&&!btn.disabled){
    var host=btn.closest('.kit-quantity-selector');
    if(!host)return;
    var inp=host.querySelector('.kit-qty-input');
    if(!inp||inp.disabled||inp.readOnly)return;
    var val=parseInt(inp.value,10)||1;
    var min=parseInt(inp.min,10)||1;
    var max=parseInt(inp.max,10)||99;
    var step=parseInt(inp.step,10)||1;
    var isInc=btn.getAttribute('data-action')==='increase';
    var next=isInc?(val+step):(val-step);
    if(next>=min&&next<=max){
      inp.value=next;
      var dec=host.querySelector('[data-action="decrease"]');
      var inc=host.querySelector('[data-action="increase"]');
      if(dec)dec.disabled=next<=min;
      if(inc)inc.disabled=next>=max;
      inp.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return;
  }
  var rmBtn=ev.target.closest('[data-action="cart-remove"]');
  if(rmBtn&&!rmBtn.disabled){
    var item=rmBtn.closest('.kit-cart-item');
    if(item){
      item.hidden=true;
      item.dispatchEvent(new CustomEvent('kit-cart-remove',{bubbles:true,detail:{id:item.id}}));
    }
  }
});
})();`;
