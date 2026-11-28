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

const COMMERCE_STATES = Object.freeze({
  'component:product-grid': ['default'],
  'component:product-detail-summary': ['default'],
  'component:product-variant-selector': ['default'],
  'component:quantity-selector': ['default', 'disabled', 'readonly'],
  'component:price-display': ['default', 'sold-out'],
  'component:discount-display': ['default', 'sale'],
  'component:cart-item': ['default', 'disabled'],
  'component:cart-summary': ['default'],
  'component:checkout-summary': ['default'],
  'component:order-status': ['default'],
  'component:review-summary': ['default'],
});
const COMMERCE_SIZES = Object.freeze({
  'component:product-grid': [],
  'component:product-detail-summary': [],
  'component:product-variant-selector': [],
  'component:quantity-selector': ['sm', 'md', 'lg'],
  'component:price-display': ['md'],
  'component:discount-display': ['md'],
  'component:cart-item': ['md'],
  'component:cart-summary': [],
  'component:checkout-summary': [],
  'component:order-status': [],
  'component:review-summary': [],
});
const ORDER_STATUSES = Object.freeze(['pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancelled']);

const requiredText = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name}은 필수 문자열입니다`);
};
const validRows = (value, name, fields) => {
  if (!Array.isArray(value)) throw new TypeError(`${name}는 배열이어야 합니다`);
  for (const [i, row] of value.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError(`${name}[${i}]는 객체여야 합니다`);
    for (const field of fields) requiredText(row[field], `${name}[${i}].${field}`);
  }
};

function checkCommerceProps(id, p) {
  const states = COMMERCE_STATES[id];
  if (!states) throw new TypeError(`Unknown commerce component: ${id}`);
  const sizes = COMMERCE_SIZES[id];
  if (p.size !== undefined && !sizes.includes(p.size)) throw new TypeError(`${id} size는 ${sizes.length ? sizes.join('·') : '지원하지 않음'}입니다: ${String(p.size)}`);
  if (p.state !== undefined && !states.includes(p.state)) throw new TypeError(`${id} state는 ${states.join('·')}만 지원합니다: ${String(p.state)}`);
  if (id === 'component:product-grid') {
    if (p.columns !== undefined && !['one', 'two', 'three', 'four'].includes(p.columns)) throw new TypeError('columns는 one·two·three·four 중 하나입니다');
    if (p.gap !== undefined && !['sm', 'md', 'lg'].includes(p.gap)) throw new TypeError('gap은 sm·md·lg 중 하나입니다');
    if (p.items !== undefined) validRows(p.items, 'items', ['title', 'price']);
  }
  if (id === 'component:discount-display' && p.variant !== undefined && !['badge', 'inline'].includes(p.variant)) throw new TypeError('variant는 badge·inline 중 하나입니다');
  if (id === 'component:product-detail-summary') {
    if (p.title !== undefined) requiredText(p.title, 'title');
    if (p.price !== undefined) requiredText(p.price, 'price');
  }
  if (id === 'component:product-variant-selector') {
    if (!Array.isArray(p.options) || p.options.length === 0) throw new TypeError('options는 1개 이상의 배열이어야 합니다');
    p.options.forEach((option, i) => {
      requiredText(option?.label, `options[${i}].label`);
      if (!Array.isArray(option?.choices) || option.choices.length === 0) throw new TypeError(`options[${i}].choices는 1개 이상이어야 합니다`);
      option.choices.forEach((choice, n) => requiredText(choice, `options[${i}].choices[${n}]`));
    });
  }
  if (id === 'component:quantity-selector') {
    const value = p.value ?? 1, min = p.min ?? 1, max = p.max ?? 99, step = p.step ?? 1;
    for (const [name, number] of [['value', value], ['min', min], ['max', max], ['step', step]]) {
      if (!Number.isSafeInteger(number)) throw new TypeError(`${name}은 안전한 정수여야 합니다`);
    }
    if (min < 1 || max < min || value < min || value > max || step < 1) throw new TypeError('value/min/max/step 수량 범위가 올바르지 않습니다');
  }
  if (id === 'component:price-display') {
    requiredText(p.price, 'price');
  }
  if (id === 'component:discount-display') {
    requiredText(p.rate, 'rate');
  }
  if (id === 'component:cart-item') {
    requiredText(p.title, 'title');
    requiredText(p.price, 'price');
    const quantity = p.quantity ?? 1, min = p.min ?? 1, max = p.max ?? 99;
    if (![quantity, min, max].every(Number.isSafeInteger) || min < 0 || quantity < min || quantity > max) throw new TypeError('quantity/min/max 수량 범위가 올바르지 않습니다');
  }
  if (id === 'component:order-status') {
    requiredText(p.orderNumber, 'orderNumber');
    requiredText(p.statusLabel, 'statusLabel');
    if (p.status !== undefined && !ORDER_STATUSES.includes(p.status)) throw new TypeError(`status는 ${ORDER_STATUSES.join('·')} 중 하나입니다`);
    if (p.steps !== undefined) {
      if (!Array.isArray(p.steps) || p.steps.length === 0) throw new TypeError('steps는 1개 이상의 배열이어야 합니다');
      p.steps.forEach((step, i) => requiredText(step, `steps[${i}]`));
    }
    if (p.currentStep !== undefined && (!Number.isSafeInteger(p.currentStep) || p.currentStep < 0 || p.currentStep >= (p.steps ?? ['1', '2', '3', '4', '5']).length)) throw new TypeError('currentStep은 steps 범위 안의 정수여야 합니다');
  }
  if (id === 'component:cart-summary' || id === 'component:checkout-summary') {
    if (p.items !== undefined) validRows(p.items, 'items', ['label', 'value']);
    if (p.total !== undefined) validRows([p.total], 'total', ['label', 'value']);
  }
  if (id === 'component:review-summary') {
    if (p.score !== undefined && (!Number.isFinite(Number(p.score)) || Number(p.score) < 0 || Number(p.score) > 5)) throw new TypeError('score는 0부터 5 사이여야 합니다');
    if (p.items !== undefined) {
      if (!Array.isArray(p.items)) throw new TypeError('items는 배열이어야 합니다');
      p.items.forEach((item, i) => {
        if (!Number.isFinite(Number(item?.rating)) || Number(item.rating) < 1 || Number(item.rating) > 5) throw new TypeError(`items[${i}].rating은 1부터 5 사이여야 합니다`);
        requiredText(item?.text, `items[${i}].text`);
        requiredText(item?.author, `items[${i}].author`);
      });
    }
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

  const inactive = disabled || readonly;
  const decDisabled = inactive || val <= min;
  const incDisabled = inactive || val >= max;

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
  return `<div class="kit-discount-display" data-component="component:discount-display" data-variant="${escAttr(variant)}" data-size="${escAttr(size)}" data-state="${escAttr(p.state ?? 'default')}">` +
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
    (removable ? `<button type="button" class="kit-cart-item-remove" data-action="cart-remove" aria-label="${escAttr(p.title)} 삭제"${state === 'disabled' ? ' disabled' : ''}>${icon('x')}</button>` : '') +
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

const text = required => ({type: 'string', required});
const content = Object.freeze({
  'component:product-grid': {items: {type: 'array<{title, price, ...}>', required: false}},
  'component:product-detail-summary': {title: text(false), price: text(false), note: text(false)},
  'component:product-variant-selector': {options: {type: 'array<{label, choices:string[]}>', required: true}},
  'component:quantity-selector': {},
  'component:price-display': {price: text(true), originalPrice: text(false), unit: text(false)},
  'component:discount-display': {rate: text(true), amount: text(false), badge: text(false)},
  'component:cart-item': {title: text(true), price: text(true), option: text(false)},
  'component:cart-summary': {items: {type: 'array<{label, value}>', required: false}, total: {type: '{label, value}', required: false}},
  'component:checkout-summary': {items: {type: 'array<{label, value}>', required: false}, total: {type: '{label, value}', required: false}},
  'component:order-status': {orderNumber: text(true), statusLabel: text(true), steps: {type: 'string[]', required: false}},
  'component:review-summary': {score: {type: 'number 0..5', required: false}, items: {type: 'array<{rating:1..5, text, author}>', required: false}},
});
const props = Object.freeze({
  'component:product-grid': {columns: ['one', 'two', 'three', 'four'], gap: ['sm', 'md', 'lg']},
  'component:product-detail-summary': {id: 'kebab-case id', actionLabel: text(false)},
  'component:product-variant-selector': {id: 'kebab-case id'},
  'component:quantity-selector': {value: 'integer', min: 'integer', max: 'integer', step: 'positive integer', id: 'kebab-case id', label: text(false)},
  'component:price-display': {state: ['default', 'sold-out'], size: ['md']},
  'component:discount-display': {state: ['default', 'sale'], variant: ['badge', 'inline'], size: ['md']},
  'component:cart-item': {quantity: 'integer', min: 'integer', max: 'integer', removable: 'boolean', id: 'kebab-case id', size: ['md'], state: ['default', 'disabled']},
  'component:cart-summary': {actionLabel: text(false)},
  'component:checkout-summary': {actionLabel: text(false)},
  'component:order-status': {status: ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancelled'], currentStep: 'integer'},
  'component:review-summary': {count: text(false)},
});
const tokenUsage = Object.freeze({
  'component:product-grid': ['--kit-sp-near', '--kit-sp-item', '--kit-sp-head', '--kit-radius', '--kit-surface', '--kit-surface-alt', '--kit-rule', '--kit-accent', '--kit-text', '--kit-t-body'],
  'component:product-detail-summary': ['--kit-text', '--kit-muted', '--kit-sp-near'],
  'component:product-variant-selector': ['--kit-text', '--kit-control-bg', '--kit-control-border', '--kit-focus'],
  'component:quantity-selector': ['--kit-control-border', '--kit-control-bg', '--kit-control-fg', '--kit-t-body', '--kit-focus'],
  'component:price-display': ['--kit-t-price', '--kit-t-small', '--kit-t-caption', '--kit-text', '--kit-muted'],
  'component:discount-display': ['--kit-danger', '--kit-accent', '--kit-t-price'],
  'component:cart-item': ['--kit-sp-item', '--kit-radius', '--kit-rule', '--kit-surface-alt', '--kit-text', '--kit-muted', '--kit-danger'],
  'component:cart-summary': ['--kit-text', '--kit-muted', '--kit-rule', '--kit-inset', '--kit-radius'],
  'component:checkout-summary': ['--kit-text', '--kit-muted', '--kit-rule', '--kit-inset', '--kit-radius'],
  'component:order-status': ['--kit-rule', '--kit-radius', '--kit-surface', '--kit-accent', '--kit-success', '--kit-text', '--kit-muted'],
  'component:review-summary': ['--kit-t-price', '--kit-text', '--kit-muted', '--kit-inset', '--kit-radius'],
});
const a11y = Object.freeze({
  'component:product-grid': {role: 'list of product articles', keyboard: ['Tab', 'Enter'], requirements: ['each product is a labelled article; price and title are visible text']},
  'component:product-detail-summary': {role: 'region', keyboard: ['Tab', 'Enter', 'Space'], requirements: ['radio options have fieldset and legend; purchase action has a text name']},
  'component:product-variant-selector': {role: 'group', keyboard: ['Tab', 'ArrowLeft', 'ArrowRight', 'Space'], requirements: ['each option group has a legend and native labelled radio inputs']},
  'component:quantity-selector': {role: 'group', keyboard: ['Tab', 'Enter', 'ArrowUp', 'ArrowDown'], requirements: ['decrease and increase buttons have names; number input has a name and min/max/step']},
  'component:price-display': {role: 'text', keyboard: [], requirements: ['current and original prices remain readable text; sold-out status has text']},
  'component:discount-display': {role: 'text', keyboard: [], requirements: ['discount rate, amount and badge remain readable text']},
  'component:cart-item': {role: 'article', keyboard: ['Tab', 'Enter', 'ArrowUp', 'ArrowDown'], requirements: ['quantity controls have names; remove button includes product name']},
  'component:cart-summary': {role: 'region', keyboard: ['Tab', 'Enter', 'Space'], requirements: ['amounts use a description list; action button has a text name']},
  'component:checkout-summary': {role: 'region', keyboard: ['Tab', 'Enter', 'Space'], requirements: ['amounts use a description list; action button has a text name']},
  'component:order-status': {role: 'region', keyboard: [], requirements: ['current order step uses aria-current=step; progress navigation has a name']},
  'component:review-summary': {role: 'region', keyboard: [], requirements: ['each star score exposes an accessible rating label; review body and author are text']},
});
const unsupportedStates = Object.freeze({
  'component:product-grid': ['loading', 'empty', 'error'],
  'component:product-detail-summary': ['loading', 'disabled', 'out-of-stock'],
  'component:product-variant-selector': ['disabled', 'unavailable'],
  'component:quantity-selector': ['loading', 'sold-out', 'out-of-stock'],
  'component:price-display': ['loading', 'error', 'sale'],
  'component:discount-display': ['loading', 'error', 'sold-out'],
  'component:cart-item': ['loading', 'sold-out', 'out-of-stock'],
  'component:cart-summary': ['loading', 'empty', 'error'],
  'component:checkout-summary': ['loading', 'empty', 'error'],
  'component:order-status': ['loading', 'error'],
  'component:review-summary': ['loading', 'empty', 'error'],
});
const STATE_REASON = '현재 독립 렌더러에는 해당 상태의 표현이 없어 요청을 거부한다.';
const unsupportedFeatures = Object.freeze({
  'component:product-grid': [{value: 'loading/empty/error visuals', reason: '독립 렌더러는 입력 items 또는 기본 표본만 그리며 로딩·빈·오류 화면을 그리지 않는다.'}],
  'component:product-detail-summary': [{value: 'unavailable inventory state', reason: '상품 재고와 주문 가능 여부는 거래 백엔드 범위라 여기서 계산하지 않는다.'}],
  'component:product-variant-selector': [{value: 'unavailable option choices', reason: '옵션 비활성화·재고 연결은 거래 백엔드 범위라 여기서 계산하지 않는다.'}],
  'component:quantity-selector': [{value: 'legacy Blueprint min/max/step and +/- controls', reason: '기존 input-control Blueprint는 value와 number kind만 표현한다. 완전한 min/max/step 및 증감 버튼은 assembleComponents의 commerce 슬롯에서 지원한다.'}],
  'component:price-display': [{value: 'numeric currency calculation and automatic sale state', reason: '가격은 전달받은 문자열로 표시하며 통화 계산이나 할인 자동 계산은 하지 않는다.'}],
  'component:discount-display': [{value: 'discount calculation from prices', reason: '할인율과 금액은 호출자가 전달한 텍스트를 표시하며 가격으로부터 계산하지 않는다.'}],
  'component:cart-item': [{value: 'legacy Blueprint quantity controls and removal', reason: '기존 summary Blueprint는 행·수량 제어·삭제 이벤트를 표현하지 않는다. 완전한 항목은 assembleComponents의 commerce 슬롯에서 지원한다.'}, {value: 'server-side cart mutation', reason: '삭제 이벤트만 내보내며 거래 백엔드 상태를 변경하지 않는다.'}],
  'component:cart-summary': [{value: 'shipping/tax/discount calculation', reason: '합계는 전달된 값만 표시하며 계산하지 않는다.'}],
  'component:checkout-summary': [{value: 'payment submission', reason: '결제 버튼은 화면 출력용이며 거래 백엔드에 연결되지 않는다.'}],
  'component:order-status': [{value: 'live shipment tracking', reason: '상태·배송 정보는 전달된 표본 문자열이며 외부 추적을 조회하지 않는다.'}],
  'component:review-summary': [{value: 'review submission and aggregation', reason: '평점과 리뷰는 전달된 표본 데이터이며 별도 집계·작성 동작은 없다.'}],
});

function makeCommerceContract(item) {
  return Object.freeze({
    id: item.id, version: '1.0.0', componentType: item.componentType, layer: item.layer, purpose: item.label,
    contexts: ['commerce', 'listing'], structure: item.classification,
    slots: item.classification === 'composite' ? ['primary', 'secondary'] : ['content'],
    props: props[item.id], content: content[item.id], appearance: ['default'], sizes: COMMERCE_SIZES[item.id],
    density: ['comfortable'], states: COMMERCE_STATES[item.id], transitions: item.id === 'component:cart-item' ? ['default→disabled'] : item.id === 'component:price-display' ? ['default→sold-out'] : item.id === 'component:discount-display' ? ['default→sale'] : [],
    events: item.id === 'component:quantity-selector' || item.id === 'component:cart-item' ? ['change', ...(item.id === 'component:cart-item' ? ['kit-cart-remove'] : [])] : [],
    tokens: tokenUsage[item.id], parents: ['slot:main', 'slot:aside'], children: [],
    responsive: {strategy: 'fluid and wrap', breakpoints: ['640px', '768px'], behavior: item.id === 'component:product-grid' ? 'single column at 640px and below' : 'content wraps without horizontal overflow'},
    accessibility: a11y[item.id], forbidden: [], examples: [{label: item.label}], usage: `${item.label} in commerce flows.`,
    renderer: {module: 'src/platform/families/commerce.mjs', export: 'renderCommerceComponent'}, blueprint: {...item.blueprint, id: item.materialId},
    tests: ['tests/platform-commerce-blueprint.test.mjs', 'tests/platform-service-commerce-channels.test.mjs'],
    unsupported: {states: unsupportedStates[item.id].map(value => ({value, reason: STATE_REASON})), features: unsupportedFeatures[item.id]},
  });
}

export const COMMERCE_CONTRACTS = Object.freeze(COMMERCE_COMPONENTS.map(makeCommerceContract));

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
.kit-product-grid[data-columns="one"]{grid-template-columns:repeat(1,1fr)}
.kit-product-grid[data-columns="two"]{grid-template-columns:repeat(2,1fr)}
.kit-product-grid[data-columns="three"]{grid-template-columns:repeat(3,1fr)}
.kit-product-grid[data-columns="four"]{grid-template-columns:repeat(4,1fr)}
.kit-product-grid[data-gap="sm"]{gap:var(--kit-sp-near,8px)}.kit-product-grid[data-gap="md"]{gap:var(--kit-sp-item,16px)}.kit-product-grid[data-gap="lg"]{gap:var(--kit-sp-head,24px)}
@media(max-width:640px){.kit-product-grid{grid-template-columns:repeat(1,1fr)!important}}
.kit-product-card{border:1px solid var(--kit-rule,#eee);border-radius:var(--kit-radius,6px);overflow:hidden;background:var(--kit-surface,#fff);display:flex;flex-direction:column}
.kit-product-card-media{position:relative;height:160px;background:var(--kit-surface-alt,#f8f8f8);display:flex;align-items:center;justify-content:center}
.kit-product-badge{position:absolute;top:8px;left:8px;background:var(--kit-accent,#e53e3e);color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:700}
.kit-product-card-body{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
.kit-product-card-title{margin:0;font-size:var(--kit-t-body,14px)}
.kit-product-card-rating{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--kit-muted,#666);margin:0}
.kit-discount-display[data-variant="inline"] .kit-discount-badge{padding:0;background:transparent;color:var(--kit-accent,#e53e3e)}
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
