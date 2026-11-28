// §6.2 L Resizable Panel 키보드(방향키·Home·End) 및 min/max 크기 제약 실제 브라우저 동작 검증.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';

const BASE = {
  context: 'dashboard', mode: 'light', density: 'comfortable',
  palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp',
  items: [{purpose: 'purpose:button.primary', visual: 'family:soft', content: {label: '테스트'}}],
};

test('resizable panel: keyboard navigation and min/max constraints work in real Chromium browser', async () => {
  const assembly = assembleComponents({
    ...BASE,
    layouts: [
      {component: 'component:resizable-panel', props: {id: 'panel-h', direction: 'horizontal', value: 50, first: '좌측', second: '우측', label: '수평 분할'}},
      {component: 'component:resizable-panel', props: {id: 'panel-v', direction: 'vertical', value: 50, first: '상단', second: '하단', label: '수직 분할'}},
    ],
  });
  assert.equal(assembly.ok, true, JSON.stringify(assembly.errors));

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(assembly.value.standalone);

    // 1. 수평 분할 패널 핸들 조작
    const handleH = page.locator('#panel-h [data-resizable-handle]');
    await handleH.focus();

    // 초기값 50%
    assert.equal(await handleH.getAttribute('aria-valuenow'), '50');
    assert.equal(await handleH.getAttribute('aria-valuemin'), '15');
    assert.equal(await handleH.getAttribute('aria-valuemax'), '85');

    // ArrowLeft: 50 -> 45
    await page.keyboard.press('ArrowLeft');
    assert.equal(await handleH.getAttribute('aria-valuenow'), '45');
    assert.equal(await page.locator('#panel-h .kit-panel-first').evaluate(el => el.style.flex), '0 0 45%');
    assert.equal(await page.locator('#panel-h .kit-panel-second').evaluate(el => el.style.flex), '0 0 55%');

    // ArrowRight 2회: 45 -> 50 -> 55
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await handleH.getAttribute('aria-valuenow'), '55');

    // Home: 최소 15%로 즉시 이동
    await page.keyboard.press('Home');
    assert.equal(await handleH.getAttribute('aria-valuenow'), '15');
    assert.equal(await page.locator('#panel-h .kit-panel-first').evaluate(el => el.style.flex), '0 0 15%');

    // 최소 상태에서 ArrowLeft를 더 눌러도 15% 아래로 내려가지 않음 (min clamp)
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await handleH.getAttribute('aria-valuenow'), '15');

    // End: 최대 85%로 즉시 이동
    await page.keyboard.press('End');
    assert.equal(await handleH.getAttribute('aria-valuenow'), '85');
    assert.equal(await page.locator('#panel-h .kit-panel-first').evaluate(el => el.style.flex), '0 0 85%');

    // 최대 상태에서 ArrowRight를 더 눌러도 85% 위로 올라가지 않음 (max clamp)
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await handleH.getAttribute('aria-valuenow'), '85');

    // 2. 수직 분할 패널 조작 (ArrowUp / ArrowDown)
    const handleV = page.locator('#panel-v [data-resizable-handle]');
    await handleV.focus();
    assert.equal(await handleV.getAttribute('aria-valuenow'), '50');

    // ArrowUp: 50 -> 45
    await page.keyboard.press('ArrowUp');
    assert.equal(await handleV.getAttribute('aria-valuenow'), '45');

    // ArrowDown 2회: 45 -> 50 -> 55
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    assert.equal(await handleV.getAttribute('aria-valuenow'), '55');

    // 3. 커스텀 이벤트 kit-panel-resize 수신 확인
    const resizeReceived = await page.evaluate(() => {
      return new Promise(resolve => {
        const handle = document.querySelector('#panel-h [data-resizable-handle]');
        handle.addEventListener('kit-panel-resize', ev => {
          resolve(ev.detail);
        }, {once: true});
        handle.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
      });
    });
    assert.ok(resizeReceived);
    assert.equal(typeof resizeReceived.value, 'number');
  } finally {
    await browser.close();
  }
});
