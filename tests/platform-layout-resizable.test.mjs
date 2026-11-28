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

// ---- D5b 독립 검증: 선언한 props가 실제 화면에 나타나는지(Chromium 계산 스타일·레이아웃 실측) ----
const assembleLayouts = layouts => {
  const r = assembleComponents({...BASE, layouts});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.value;
};

async function withPage(width, html, body) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport: {width, height: 800}});
    await page.setContent(html);
    await body(page);
  } finally {
    await browser.close();
  }
}

test('stack: gap and align props change the real layout, including the "gap" step', async () => {
  const layouts = ['tight', 'near', 'item', 'gap'].flatMap(gap => ['start', 'center', 'stretch'].map(align => ({component: 'component:stack', props: {id: `s-${gap}-${align}`, gap, align, items: ['가', '나']}})));
  await withPage(1000, assembleLayouts(layouts).standalone, async page => {
    const px = await page.evaluate(() => Object.fromEntries(['tight', 'near', 'item', 'gap'].map(t => [t, parseFloat(getComputedStyle(document.documentElement).getPropertyValue(t === 'gap' ? '--kit-gap' : `--kit-sp-${t}`))])));
    const rows = await page.evaluate(() => [...document.querySelectorAll('.kit-layout-stack')].map(s => {
      const [a, b] = [...s.children].map(x => x.getBoundingClientRect());
      return {id: s.id, measuredGap: b.top - a.bottom, width: a.width, alignItems: getComputedStyle(s).alignItems, hostWidth: s.getBoundingClientRect().width};
    }));
    assert.equal(rows.length, 12);
    assert.deepEqual(new Set(Object.values(px)).size, 4, 'the four gap tokens are four different distances');
    for (const r of rows) {
      const [, gap, align] = r.id.split('-');
      assert.equal(r.measuredGap, px[gap], `${r.id}: gap ${gap} must measure ${px[gap]}px (got ${r.measuredGap})`);
      assert.equal(r.alignItems, {start: 'flex-start', center: 'center', stretch: 'stretch'}[align], r.id);
      if (align === 'stretch') assert.equal(r.width, r.hostWidth, `${r.id}: stretch fills the stack`);
      else assert.ok(r.width < r.hostWidth / 2, `${r.id}: ${align} items shrink to content`);
    }
  });
  for (const [props, message] of [[{gap: 'huge'}, /Stack gap/], [{align: 'left'}, /Stack align/]]) {
    const refused = assembleComponents({...BASE, layouts: [{component: 'component:stack', props}]});
    assert.equal(refused.ok, false, JSON.stringify(props));
    assert.match(refused.errors[0].message, message);
  }
  assert.equal(assembleComponents({...BASE, layouts: [{component: 'component:container', props: {width: 'huge'}}]}).ok, false, 'an unknown container width is refused');
});

test('container: width steps cap the real width, full does not, and content is escaped', async () => {
  const widths = ['narrow', 'standard', 'wide', 'full'];
  const html = assembleLayouts(widths.map(w => ({component: 'component:container', props: {id: `c-${w}`, width: w, content: `<b>${w}</b>`}}))).standalone;
  await withPage(1800, html, async page => {
    const got = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.kit-layout-container')].map(c => [c.id.slice(2), {w: Math.round(c.getBoundingClientRect().width), html: c.innerHTML, centered: Math.round(c.getBoundingClientRect().left) === Math.round(document.documentElement.clientWidth - c.getBoundingClientRect().right)}])));
    assert.equal(new Set(widths.slice(0, 3).map(w => got[w].w)).size, 3, 'narrow < standard < wide');
    assert.ok(got.narrow.w < got.standard.w && got.standard.w < got.wide.w && got.wide.w < got.full.w, JSON.stringify(got));
    assert.equal(got.full.w, 1800 - (await page.evaluate(() => Math.round(document.body.getBoundingClientRect().left * 2))), 'full fills the page');
    for (const w of widths) assert.match(got[w].html, new RegExp(`^&lt;b&gt;${w}&lt;/b&gt;$`), `${w}: content is escaped text`);
    assert.ok(got.narrow.centered && got.standard.centered && got.wide.centered, 'capped containers are centered');
  });
});

test('resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility', async () => {
  const html = assembleLayouts([
    {component: 'component:resizable-panel', props: {id: 'ph', direction: 'horizontal', value: 50, first: 'L', second: 'R', label: '수평 분할'}},
    {component: 'component:resizable-panel', props: {id: 'pv', direction: 'vertical', value: 50, first: 'T', second: 'B', label: '수직 분할'}},
    {component: 'component:resizable-panel', props: {id: 'low', value: 1, label: '낮은 값'}},
  ]).standalone;
  await withPage(1000, html, async page => {
    const sizes = id => page.evaluate(id => {
      const h = document.getElementById(id), f = h.querySelector('.kit-panel-first').getBoundingClientRect(), s = h.querySelector('.kit-panel-second').getBoundingClientRect();
      return {f: [f.width, f.height], s: [s.width, s.height], overflowX: h.scrollWidth - h.clientWidth, overflowY: h.scrollHeight - h.clientHeight, handle: h.querySelector('[data-resizable-handle]').getBoundingClientRect().width};
    }, id);
    const near = (a, b, msg, tolerance = 2) => assert.ok(Math.abs(a - b) <= tolerance, `${msg}: ${a} vs ${b}`);

    // 초기 상태: 두 패널 비율의 합이 정확히 100%라 넘침이 없다
    const h0 = await sizes('ph');
    assert.equal(h0.overflowX, 0, 'second panel is not pushed out of the host');
    near(h0.f[0] + h0.s[0], 998, 'panels fill the host');
    assert.equal((await sizes('low')).f[0] > 0, true);
    assert.equal(await page.locator('#low [data-resizable-handle]').getAttribute('aria-valuenow'), '15', 'an out-of-range initial value is clamped to 15');

    // 포인터: 30% 지점으로 끌면 값과 실제 폭이 함께 바뀐다
    const handle = page.locator('#ph [data-resizable-handle]');
    const host = await page.locator('#ph').boundingBox();
    const dragTo = async (frac, locator = handle, vertical = false, hostBox = host) => {
      const b = await locator.boundingBox();
      const start = {x: b.x + (vertical ? 20 : 1), y: b.y + (vertical ? 1 : 20)};
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(vertical ? start.x : hostBox.x + hostBox.width * frac, vertical ? hostBox.y + hostBox.height * frac : start.y, {steps: 4});
      await page.mouse.up();
    };
    await dragTo(0.3);
    assert.equal(await handle.getAttribute('aria-valuenow'), '30');
    const h30 = await sizes('ph');
    near(h30.f[0] / (h30.f[0] + h30.s[0]), 0.3, 'first panel is 30% of the host', 0.01);
    // 끝까지 끌어도 15·85%에서 멈춘다
    await dragTo(0); assert.equal(await handle.getAttribute('aria-valuenow'), '15');
    near((await sizes('ph')).f[0] / 998, 0.15, 'min 15% in layout', 0.01);
    await dragTo(1); assert.equal(await handle.getAttribute('aria-valuenow'), '85');
    const hMax = await sizes('ph'); near(hMax.f[0] / 998, 0.85, 'max 85% in layout', 0.01); assert.equal(hMax.overflowX, 0);
    // 놓은 뒤에는 포인터가 움직여도 따라가지 않는다
    await page.mouse.move(host.x + 5, host.y + 40); assert.equal(await handle.getAttribute('aria-valuenow'), '85', 'dragging stops on pointerup');

    // 세로 방향: 값이 실제 높이 비율로 나타난다(포인터와 키보드 모두)
    const vh = page.locator('#pv [data-resizable-handle]'), vhost = await page.locator('#pv').boundingBox();
    const v0 = await sizes('pv'); near(v0.f[1], v0.s[1], 'vertical 50/50 splits the height'); assert.equal(v0.overflowY, 0);
    await dragTo(0.3, vh, true, vhost);
    assert.equal(await vh.getAttribute('aria-valuenow'), '30');
    const v30 = await sizes('pv'); near(v30.f[1] / (v30.f[1] + v30.s[1]), 0.3, 'vertical first panel is 30% of the height', 0.01);
    await vh.focus(); await page.keyboard.press('End');
    const vEnd = await sizes('pv'); near(vEnd.f[1] / (vEnd.f[1] + vEnd.s[1]), 0.85, 'End gives 85% of the height', 0.01);

    // 접근성: separator, 이름, 값 범위, 방향, 포커스, 조절 대상
    const a11y = await page.evaluate(() => [...document.querySelectorAll('[role=separator]')].slice(0, 2).map(e => ({name: e.getAttribute('aria-label'), orientation: e.getAttribute('aria-orientation'), min: e.getAttribute('aria-valuemin'), max: e.getAttribute('aria-valuemax'), tabIndex: e.tabIndex, controls: e.getAttribute('aria-controls'), target: document.getElementById(e.getAttribute('aria-controls'))?.className})));
    assert.deepEqual(a11y, [
      {name: '수평 분할', orientation: 'vertical', min: '15', max: '85', tabIndex: 0, controls: 'ph-first', target: 'kit-panel-first'},
      {name: '수직 분할', orientation: 'horizontal', min: '15', max: '85', tabIndex: 0, controls: 'pv-first', target: 'kit-panel-first'},
    ]);
    // 방향이 다른 화살표는 값을 바꾸지 않는다
    await handle.focus(); await page.keyboard.press('ArrowUp'); assert.equal(await handle.getAttribute('aria-valuenow'), '85');
  });
});

test('layout runtime is shipped only with pages that use a resizable panel', () => {
  const marker = '__kitLayout';
  assert.ok(assembleLayouts([{component: 'component:resizable-panel', props: {}}]).standalone.includes(marker));
  assert.ok(!assembleLayouts([{component: 'component:stack', props: {items: ['a']}}, {component: 'component:container', props: {content: 'c'}}, {component: 'component:center', props: {}}]).standalone.includes(marker), 'stack/container/center pages carry no panel runtime');
  assert.ok(!assembleComponents(BASE).value.standalone.includes(marker), 'a page without layouts carries no panel runtime');
});
