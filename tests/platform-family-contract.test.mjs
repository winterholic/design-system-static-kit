import test from 'node:test';
import assert from 'node:assert/strict';
import {validateComponentContracts, ALL_COMPONENT_CONTRACTS, COMPONENT_CONTRACTS, ACTION_COMPONENTS, ACTION_COMPONENT_BY_ID, countDistinctComponentTypes, renderActionComponent, COMPONENT_CONTRACT_FIELDS, COMMERCE_COMPONENTS, COMMERCE_COMPONENT_BY_ID, renderCommerceComponent} from '../src/platform/families/contracts.mjs';
import {COMPONENT_CLASSIFICATION} from '../src/platform/families/inventory.mjs';
import {PURPOSE_FAMILIES} from '../src/platform/index.mjs';
import {getPlatformMaterial, getMaterial} from '../src/service/index.mjs';

const MENU_ITEMS = [{label: '하나'}, {label: '둘'}, {label: '셋'}];
const propsFor = id => ({label: '저장', ariaLabel: '저장', icon: 'plus', text: '값', items: MENU_ITEMS, message: undefined, id: 'sample'});

test('all existing base and purpose components carry complete layer contracts', () => {
  // 기반 10 + 목적 패밀리 80(A·D3·EHI·J/K 포함) + A 독립 시연 12 + N 커머스 11 + L 독립 시연 5
  assert.equal(COMPONENT_CONTRACTS.length, 10 + PURPOSE_FAMILIES.length);
  assert.equal(PURPOSE_FAMILIES.length, 80);
  assert.equal(ALL_COMPONENT_CONTRACTS.length, 120);
  assert.deepEqual(validateComponentContracts(), []);
  for (const c of ALL_COMPONENT_CONTRACTS) for (const key of COMPONENT_CONTRACT_FIELDS) assert.ok(Object.hasOwn(c, key), `${c.id}.${key}`);
});

test('each §6.2 N commerce component has a renderer, a canonical requirement link and a classification from the inventory', () => {
  assert.equal(COMMERCE_COMPONENTS.length, 11);
  const sampleProps = {
    'component:product-grid': {items: [{title: '상품', price: '10,000원'}]},
    'component:product-detail-summary': {title: '상품명', price: '39,000원'},
    'component:product-variant-selector': {options: [{label: '색상', choices: ['블랙', '화이트']}]},
    'component:quantity-selector': {value: 2},
    'component:price-display': {price: '19,000원', originalPrice: '29,000원'},
    'component:discount-display': {rate: '25%', badge: '특가'},
    'component:cart-item': {title: '상품 A', price: '19,000원', quantity: 2},
    'component:cart-summary': {title: '장바구니 요약', items: [{label: '상품', value: '19,000원'}], total: {label: '합계', value: '19,000원'}},
    'component:checkout-summary': {title: '결제 요약', items: [{label: '주문', value: '19,000원'}], total: {label: '합계', value: '19,000원'}},
    'component:order-status': {orderNumber: '20261128-001', statusLabel: '배송중'},
    'component:review-summary': {score: '4.8', count: '10개', items: [{rating: 5, text: '좋아요', author: '고객'}]},
  };
  for (const item of COMMERCE_COMPONENTS) {
    const html = item.render(sampleProps[item.id] ?? {});
    assert.ok(html.includes(`data-component="${item.id}"`), item.id);
    assert.match(item.requirementId, /^req:comp:n-\d\d-/);
    assert.equal(COMPONENT_CLASSIFICATION[item.requirementId.slice('req:comp:'.length)], item.classification, `${item.id} follows the classification table`);
  }
});

test('every N contract names a registered material and a Blueprint way to use it', () => {
  for (const item of COMMERCE_COMPONENTS) {
    const contract = ALL_COMPONENT_CONTRACTS.find(c => c.id === item.id);
    assert.equal(contract.blueprint.id, item.materialId);
    const registered = getPlatformMaterial({id: item.materialId}).ok || getMaterial({id: item.materialId}).ok;
    assert.ok(registered, `${item.id} → ${item.materialId} is queryable from the registry`);
    if (item.blueprint.field === 'materials.purposes') {
      assert.equal(getPlatformMaterial({id: item.materialId}).value.kind, 'purpose-family', item.id);
      assert.equal(item.blueprint.purpose, item.materialId);
    } else {
      assert.equal(item.blueprint.field, 'tree');
      assert.ok(item.blueprint.node, item.id);
    }
  }
});

test('each §6.2 A action component has a renderer, a canonical requirement link and a classification from the inventory', () => {
  assert.equal(ACTION_COMPONENTS.length, 12);
  for (const item of ACTION_COMPONENTS) {
    const html = item.render(propsFor(item.id));
    assert.ok(html.includes(`data-component="${item.id}"`), item.id);
    assert.match(item.requirementId, /^req:comp:a-\d\d-/);
    assert.equal(COMPONENT_CLASSIFICATION[item.requirementId.slice('req:comp:'.length)], item.classification, `${item.id} follows the classification table`);
  }
});

test('every A contract names a registered material and a Blueprint way to use it', () => {
  const MENU_PURPOSES = new Set(['purpose:button.split', 'purpose:button.menu']);
  for (const item of ACTION_COMPONENTS) {
    const contract = ALL_COMPONENT_CONTRACTS.find(c => c.id === item.id);
    assert.equal(contract.blueprint.id, item.materialId);
    const registered = getPlatformMaterial({id: item.materialId}).ok || getMaterial({id: item.materialId}).ok;
    assert.ok(registered, `${item.id} → ${item.materialId} is queryable from the registry`);
    if (item.blueprint.field === 'materials.purposes') {
      assert.equal(getPlatformMaterial({id: item.materialId}).value.kind, 'purpose-family', item.id);
      assert.equal(item.blueprint.purpose, item.materialId);
    } else {
      assert.equal(item.blueprint.field, 'tree');
      assert.ok(item.blueprint.node, item.id);
    }
    assert.ok(MENU_PURPOSES.has(item.materialId) === ['component:split-button', 'component:menu-button'].includes(item.id));
  }
});

test('contract validator explains unsupported states and rejects incomplete contracts', () => {
  const sample = ALL_COMPONENT_CONTRACTS[0];
  const invalid = {...sample, unsupported: {states: [{value: 'dragging'}]}};
  assert.ok(validateComponentContracts([invalid]).some(issue => issue.path === '$[0].unsupported.states[0].reason'));
  assert.ok(validateComponentContracts([{...sample, unsupported: {states: 'dragging'}}]).some(issue => issue.path === '$[0].unsupported.states'), 'a non-array unsupported entry is not silently accepted');
  const {componentType: _drop, ...noType} = sample;
  assert.ok(validateComponentContracts([noType]).some(issue => issue.path === '$[0].componentType'));
  assert.ok(validateComponentContracts([sample, sample]).some(issue => /duplicate/.test(issue.message)));
});

test('button appearance, size and state changes affect rendered HTML or CSS hooks', () => {
  const button = ACTION_COMPONENT_BY_ID.get('component:button');
  const solid = button.render({label: '확인', appearance: 'solid', size: 'md', state: 'default'});
  const ghost = button.render({label: '확인', appearance: 'ghost', size: 'md', state: 'default'});
  const large = button.render({label: '확인', appearance: 'solid', size: 'xl', state: 'default'});
  const disabled = button.render({label: '확인', appearance: 'solid', size: 'md', state: 'disabled'});
  assert.notEqual(solid, ghost);
  assert.notEqual(solid, large);
  assert.notEqual(solid, disabled);
});

test('data-component-appearance states the appearance that is actually drawn (link button and floating action button)', () => {
  assert.match(renderActionComponent('component:link-button', {label: '이동'}), /data-component-appearance="link"[^>]*data-appearance="link"/);
  assert.match(renderActionComponent('component:link-button', {label: '이동', appearance: 'solid'}), /data-component-appearance="link"/, 'a link button stays a link whatever appearance the caller passes');
  assert.match(renderActionComponent('component:floating-action-button', {label: '추가'}), /data-component-appearance="elevated"/, 'the FAB default is the elevated look the CSS hook styles');
  assert.match(renderActionComponent('component:button', {label: '삭제', appearance: 'destructive'}), /data-tone="danger"/, 'destructive is the danger tone of the base button, not a separate colour override');
});

test('menu and split buttons own a real menu: aria-controls resolves to a hidden role=menu and the caret has its own name', () => {
  for (const id of ['component:menu-button', 'component:split-button']) {
    const html = renderActionComponent(id, {label: '내보내기', items: MENU_ITEMS, id: 'sample'});
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1];
    assert.ok(controls, id);
    assert.match(html, new RegExp(`<div class="pf-menu-panel" role="menu" id="${controls}"[^>]* hidden>`), id);
    assert.equal((html.match(/role="menuitem"/g) ?? []).length, 3, id);
    assert.match(html, /aria-haspopup="menu" aria-expanded="false"/, id);
  }
  assert.match(renderActionComponent('component:split-button', {label: '내보내기', items: MENU_ITEMS}), /aria-label="내보내기 옵션"/, 'the caret name comes from the label, not a hard-coded English phrase');
  assert.throws(() => renderActionComponent('component:menu-button', {label: '메뉴'}), /메뉴 항목/, 'a menu without items is refused instead of drawing an empty popup');
  assert.throws(() => renderActionComponent('component:split-button', {label: '메뉴', items: [{label: '하나'}]}), /2~8/);
});

test('segmented control starts with exactly one pressed segment and is wired for single selection', () => {
  const html = renderActionComponent('component:segmented-control', {label: '보기', id: 'view', items: [{label: '목록'}, {label: '격자', selected: true}, {label: '지도'}]});
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /data-action-segmented/);
  const pressed = /<button[^>]*id="(view-\d)"[^>]*aria-pressed="true"/.exec(html);
  assert.equal(pressed?.[1], 'view-1', 'the selected segment is the one that is pressed');
  const first = renderActionComponent('component:segmented-control', {label: '보기', items: [{label: '목록'}, {label: '격자'}]});
  assert.equal((first.match(/aria-pressed="true"/g) ?? []).length, 1, 'with no selected item the first one is pressed');
});

test('copy and close buttons carry the data hooks the runtime reads, and an icon-only close button keeps an accessible name', () => {
  assert.match(renderActionComponent('component:copy-button', {label: '복사', text: 'a"b', copiedLabel: '복사됨'}), /data-copy-text="a&quot;b" data-copied-label="복사됨"/);
  const close = renderActionComponent('component:close-button', {});
  assert.match(close, /data-action-dismiss/);
  assert.match(close, /aria-label="닫기"/);
  const boxed = renderActionComponent('component:close-button', {ariaLabel: '공지 닫기', message: '<b>안내</b>'});
  assert.match(boxed, /<div class="pf-dismissible" data-dismissible><p>&lt;b&gt;안내&lt;\/b&gt;<\/p>/, 'the message is escaped');
});

test('color, size and density variants are not counted as new component types', () => {
  const base = ACTION_COMPONENTS[0];
  assert.equal(countDistinctComponentTypes([
    {...base, appearance: 'solid', size: 'sm', color: 'blue'},
    {...base, appearance: 'ghost', size: 'xl', color: 'red', density: 'compact'},
    ACTION_COMPONENTS.find(item => item.id === 'component:split-button'),
  ]), 2);
});

test('the same component reached as an A demo and as a purpose family counts once', () => {
  const types = ALL_COMPONENT_CONTRACTS.map(c => c.componentType);
  assert.equal(types.filter(t => t === 'split-button').length, 2, 'purpose:button.split and component:split-button');
  assert.equal(types.filter(t => t === 'menu-button').length, 2);
  assert.ok(types.filter(t => t === 'button-control').length >= 9, 'icon, toggle, loading, FAB, copy, close, link, button and the base all describe button-control');
  // 기반·목적 패밀리·독립 시연·커머스·레이아웃을 componentType 기준으로 중복 제거한다.
  assert.equal(countDistinctComponentTypes(ALL_COMPONENT_CONTRACTS), 101);
});

// ---- 독립 검토(2026-11-28)에서 재현된 결함의 회귀 시험 ----
test('user values containing $ patterns reach the copy data attribute unchanged (no String.replace pattern expansion)', () => {
  for (const text of ['echo $$ and US$$5', "a$'b", 'x$&y', 'p$`q']) {
    const html = renderActionComponent('component:copy-button', {label: '복사', text});
    const m = /data-copy-text="([^"]*)"/.exec(html);
    assert.equal(m?.[1], text.replaceAll("'", '&#39;').replaceAll('&', '&amp;').replaceAll('&amp;#39;', '&#39;'), text);
    assert.equal((html.match(/<button /g) ?? []).length, 1, 'markup was not spliced');
  }
});

test('size, appearance and state outside the declared values are refused instead of reaching an attribute', () => {
  const inject = 'md" onmouseover="alert(1)';
  for (const id of ['component:button', 'component:button-group', 'component:menu-button']) {
    assert.throws(() => renderActionComponent(id, {label: 'a', items: MENU_ITEMS, size: inject}), /size는/, id);
    assert.throws(() => renderActionComponent(id, {label: 'a', items: MENU_ITEMS, appearance: inject}), /appearance는/, id);
  }
  assert.throws(() => renderActionComponent('component:button', {label: 'a', state: 'hover'}), /state는/, 'hover is not an input');
  assert.throws(() => renderActionComponent('component:copy-button', {label: '복사'}), /text/, 'the value to copy is required (the label is not a fallback)');
});

test('segmented control: several selected items press only the first, a disabled item stays disabled', () => {
  const html = renderActionComponent('component:segmented-control', {label: '보기', id: 'v', items: [{label: '하나', selected: true}, {label: '둘', selected: true}, {label: '셋', state: 'disabled'}]});
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /id="v-2"[^>]*disabled/);
});

test('contract forbidden entries use `why` like every other contract and name combinations the renderer really rejects', () => {
  for (const c of ALL_COMPONENT_CONTRACTS) for (const rule of c.forbidden) assert.ok(rule.why && !('reason' in rule), `${c.id}/${rule.id}`);
  assert.throws(() => renderActionComponent('component:icon-button', {label: '설정', appearance: 'link'}), /BTN_LINK_ICON_ONLY/);
  assert.throws(() => renderActionComponent('component:link-button', {label: '이동', state: 'loading'}), /BTN_LOADING_NO_SLOT/);
  assert.throws(() => renderActionComponent('component:toggle-button', {label: '고정', appearance: 'link'}), /BTN_TOGGLE_LINK/);
  const declared = id => ALL_COMPONENT_CONTRACTS.find(c => c.id === id).forbidden.map(r => r.id);
  assert.ok(declared('component:icon-button').includes('ACTION_ICON_LINK') && declared('component:link-button').includes('ACTION_LINK_LOADING') && declared('component:toggle-button').includes('ACTION_TOGGLE_LINK'));
  for (const c of ACTION_COMPONENTS) assert.ok(!ALL_COMPONENT_CONTRACTS.find(x => x.id === c.id).props.state.some(s => ['hover', 'active', 'focus'].includes(s)), `${c.id}: props.state lists only values a caller can set`);
});
