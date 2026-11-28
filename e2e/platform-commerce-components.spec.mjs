import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';

// §6.2 N 계열의 브라우저 검증.
// 390px(모바일)과 1280px(데스크톱)에서 수량 조절기 증감, min/max 경계,
// 장바구니 품목 삭제(dismiss), 라디오 옵션 선택을 본다.
const assembly = assembleComponents({
  context: 'commerce', mode: 'light', density: 'comfortable',
  palette: 'palette:static-kit', subtokenSet: 'subtoken-set:commerce-vivid', typeSystem: 'type-system:shop-catalog',
  items: [{purpose: 'purpose:card.product', visual: 'family:soft', content: {title: '상품', price: '30,000원'}}],
  commerce: [
    {component: 'component:quantity-selector', props: {id: 'qty-1', value: 2, min: 1, max: 4}},
    {component: 'component:cart-item', props: {id: 'cart-item-1', title: '무선 마우스', price: '45,000원', quantity: 1}},
    {component: 'component:product-variant-selector', props: {id: 'pvs-1', options: [{label: '색상', choices: ['블랙', '화이트']}]}},
    {component: 'component:price-display', props: {price: '45,000원', originalPrice: '55,000원'}},
    {component: 'component:discount-display', props: {rate: '18%', badge: '특가'}},
    {component: 'component:order-status', props: {orderNumber: 'ORD-1234', statusLabel: '배송중'}},
  ],
});

test.describe('standalone `commerce` output', () => {
  test('quantity selector increase/decrease, boundary disabled toggle, and cart item remove work in browser', async ({page}) => {
    expect(assembly.ok, JSON.stringify(assembly.errors)).toBe(true);

    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 860});
      await page.goto('about:blank');
      await page.setContent(assembly.value.standalone);

      // 1. 수량 조절기: 초기값 2 -> 증가 클릭 -> 3 -> 4(max) -> 증가 버튼 disabled
      const host = page.locator('#qty-1').locator('..');
      const input = host.locator('.kit-qty-input');
      const incBtn = host.locator('[data-action="increase"]');
      const decBtn = host.locator('[data-action="decrease"]');

      // 실제 N 루트 마크업을 집는다. 이름·내용이 비슷한 다른 컴포넌트로 통과하지 않게 한다.
      await expect(page.locator('[data-component="component:quantity-selector"]')).toHaveCount(2); // 독립 조절기 + Cart Item 내 조절기
      await expect(page.locator('[data-component="component:cart-item"]')).toHaveCount(1);
      await expect(page.locator('[data-component="component:product-variant-selector"]')).toHaveCount(1);
      await expect(page.locator('[data-component="component:price-display"]')).toHaveCount(1);
      await expect(page.locator('[data-component="component:discount-display"]')).toHaveCount(1);
      await expect(page.locator('[data-component="component:order-status"]')).toHaveCount(1);

      await expect(input).toHaveValue('2');
      await input.focus();
      await input.press('ArrowUp');
      await expect(input).toHaveValue('3');
      await input.press('ArrowDown');
      await expect(input).toHaveValue('2');
      await incBtn.click();
      await expect(input).toHaveValue('3');
      await incBtn.click();
      await expect(input).toHaveValue('4');
      await expect(incBtn).toBeDisabled();

      // 감소 클릭 -> 3 -> 2 -> 1(min) -> 감소 버튼 disabled
      await decBtn.click();
      await expect(input).toHaveValue('3');
      await decBtn.click();
      await expect(input).toHaveValue('2');
      await decBtn.click();
      await expect(input).toHaveValue('1');
      await expect(decBtn).toBeDisabled();

      // 2. 장바구니 품목 삭제: 삭제 버튼 클릭 시 품목 숨김(hidden)
      const cartItem = page.locator('#cart-item-1');
      await expect(cartItem).toBeVisible();
      const rmBtn = cartItem.locator('[data-action="cart-remove"]');
      await page.evaluate(() => {
        window.__commerceRemoveEvent = null;
        document.addEventListener('kit-cart-remove', event => { window.__commerceRemoveEvent = event.detail; }, {once: true});
      });
      await rmBtn.click();
      await expect(cartItem).toBeHidden();
      await expect.poll(() => page.evaluate(() => window.__commerceRemoveEvent)).toEqual({id: 'cart-item-1'});

      // 3. 옵션 선택: 첫 번째(블랙) checked -> 두 번째(화이트) 클릭 -> 화이트 checked
      const optBlack = page.locator('input[value="블랙"]');
      const optWhite = page.locator('input[value="화이트"]');
      await expect(optBlack).toBeChecked();
      await expect(optWhite).not.toBeChecked();
      await optWhite.check();
      await expect(optWhite).toBeChecked();
      await expect(optBlack).not.toBeChecked();
    }
  });
});
