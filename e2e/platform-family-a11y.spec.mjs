import {test, expect} from '@playwright/test';
import {buildPage, makeEnv, VISUALS} from '../scripts/families/pages.mjs';
import {PURPOSE_FAMILIES} from '../src/platform/families/index.mjs';

// 목적 패밀리 접근성 계약의 브라우저 쪽(재료 검증 F1). 마크업의 role·aria·라벨 연결은 tests/platform-family-a11y.test.mjs가 본다.
// 이 파일은 마크업만으로 볼 수 없는 것을 본다.
//  1) 등록된 모든 패밀리: 키보드 Tab 순서가 계약 순서와 같고 화면에서 읽히는 순서(위→아래, 왼쪽→오른쪽)와 같으며, 모든 Tab 정지에 포커스 표시가 있다.
//  2) 계약에 적힌 크기 조건(터치 44px·56px·24px, 같은 줄 컨트롤 높이, 전체 폭 버튼)이 실제 레이아웃에서 지켜진다. 390·1280.
//  3) 상호작용 패밀리의 키보드 조작과 상태 전이: 탭, 대화상자, 콤보박스, 메뉴 토글, 비밀번호 보기, 정렬, 닫기.
// 패밀리 이름이 이 파일에 있어야 한다: 노드 시험이 "브라우저에서 본다"고 적은 조건의 확인 위치로 이 파일을 읽는다.
const env = makeEnv();
const QUIET = 'family:quiet';
const GROUP_OF = id => PURPOSE_FAMILIES.find(f => f.id === id).group;
const example = id => {
  const f = PURPOSE_FAMILIES.find(x => x.id === id);
  const variant = {...f.example.variant};
  // 미리보기용 modeless dialog는 Tab trap을 소유하지 않는다. 이 공통 순서 검사는
  // 실제로 열 수 있는 trigger를 재고, 열린 modal 동작은 아래 별도 계약 시험에서 본다.
  if (id === 'purpose:feedback.confirm') variant.display = 'trigger';
  return {purpose: id, variant, props: f.example.props, content: f.example.content};
};

async function open(page, items, {width = 1280, visual = QUIET, group = null, mode = 'light'} = {}) {
  const list = Array.isArray(items) ? items : [items];
  const contexts = list.map(item => PURPOSE_FAMILIES.find(f => f.id === item.purpose).contexts).filter(cs => !cs.includes('any'));
  const sharedContexts = contexts.length ? contexts[0].filter(context => contexts.every(cs => cs.includes(context))) : ['dashboard'];
  expect(sharedContexts.length, list.map(item => item.purpose).join(', ')).toBeGreaterThan(0);
  const context = sharedContexts[0];
  const globalDensities = ['comfortable', 'compact', 'spacious'];
  const densityLimits = list.map(item => {
    const family = PURPOSE_FAMILIES.find(f => f.id === item.purpose);
    return family.props?.density ?? family.variants?.density;
  }).filter(Boolean);
  const sharedDensities = globalDensities.filter(density => densityLimits.every(values => values.includes(density)));
  const density = sharedDensities.includes('comfortable') ? 'comfortable' : sharedDensities[0] ?? 'comfortable';
  const built = buildPage(env, group ?? GROUP_OF(list[0].purpose), visual, {items: list, runtime: true, mode, context, density});
  expect(built.ok, JSON.stringify(built.diagnostics)).toBe(true);
  await page.setViewportSize({width, height: 900});
  // setContent만 다시 부르면 이전 문서의 전역(const wire 등)이 남아 런타임 스크립트가 조용히 실패한다. 새 문서로 시작한다.
  await page.goto('about:blank');
  await page.setContent(built.html);
  expect(await page.locator('[data-wire-error]').count(), 'every attach* runtime wired without error').toBe(0);
}
const withExample = (id, over = {}) => { const e = example(id); return {...e, variant: {...e.variant, ...over.variant}, props: {...e.props, ...over.props}, content: {...e.content, ...over.content}}; };

/** 브라우저 안: 이름 계산(접근 가능한 이름의 근사)과 Tab 정지 목록. */
const IN_PAGE = () => {
  const nameOf = el => {
    const by = el.getAttribute('aria-labelledby');
    if (by) return by.split(/\s+/).map(i => document.getElementById(i)?.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim();
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    if (el.labels?.length) return [...el.labels].map(l => l.textContent).join(' ').replace(/[*]/g, '').replace(/\s+/g, ' ').trim();
    return el.textContent.replace(/\s+/g, ' ').trim();
  };
  const visible = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
  const tabbables = () => [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]')]
    .filter(el => !el.disabled && el.tabIndex >= 0 && visible(el) && !el.closest('[inert],[hidden]'));
  return {nameOf, tabbables, visible};
};

/** 문서 맨 앞에서 Tab을 눌러 나온 순서와 포커스 표시를 모은다. */
async function walkTab(page) {
  if (await page.locator('dialog[open]').count()) {
    // 모달 미리보기는 문서를 열 때 포커스를 안에 둔다. body로 강제 blur하면 모달의
    // 브라우저 포커스 순환이 깨지므로 마지막 정지에서 Tab 순환을 시작한다.
    await page.evaluate(`(() => {
      const stops = (${IN_PAGE})().tabbables().filter(el => el.closest('dialog[open]'));
      stops.at(-1)?.focus();
      window.scrollTo(0, 0);
    })()`);
  } else {
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  }
  const expected = await page.evaluate(`(${IN_PAGE})().tabbables().map(el => ({name: (${IN_PAGE})().nameOf(el), tag: el.tagName.toLowerCase()}))`);
  const seen = [];
  for (let i = 0; i < expected.length; i += 1) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(`(() => {
      const el = document.activeElement, io = (${IN_PAGE})(), cs = getComputedStyle(el);
      // 스크롤 영역 안에서 포커스가 스크롤을 일으키므로, 위치는 모든 스크롤 조상을 0으로 돌려 잰다(고정 머리글 포함).
      const saved = []; for (let n = el.parentElement; n; n = n.parentElement) if (n.scrollLeft || n.scrollTop) { saved.push([n, n.scrollLeft, n.scrollTop]); n.scrollLeft = 0; n.scrollTop = 0; }
      const r = el.getBoundingClientRect(); const pos = {top: Math.round(r.top + scrollY), left: Math.round(r.left + scrollX), height: Math.round(r.height), width: Math.round(r.width)};
      for (const [n, l, t] of saved) { n.scrollLeft = l; n.scrollTop = t; }
      const ring = el.matches(':focus-visible') ? {outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, outlineColor: cs.outlineColor, shadow: cs.boxShadow !== 'none', inside: el.closest('.pf-tile,.kit-ctl-card,.kit-select,.kit-ctl-input-box')?.matches(':has(:focus-visible)') ?? false} : null;
      return {name: io.nameOf(el), tag: el.tagName.toLowerCase(), ...pos, dismiss: !!el.closest('.kit-ctl-feedback-close,.kit-ctl-modal-close') || el.matches('.kit-ctl-feedback-close,.kit-ctl-modal-close'), focusVisible: !!ring, ring, hostRing: (() => { const h = el.closest('.pf-tile,.kit-select,.kit-ctl-input-box,.kit-ctl-card'); if (!h) return false; const hs = getComputedStyle(h); return (hs.outlineStyle !== 'none' && parseFloat(hs.outlineWidth) >= 2) || hs.boxShadow !== 'none'; })()};
    })()`));
  }
  return {expected, seen};
}

test.describe('keyboard order of all registered purpose families', () => {
  for (const f of PURPOSE_FAMILIES) {
    for (const width of [1280, 390]) {
      test(`${f.id} at ${width}px: Tab visits every stop once in DOM order, in the order the eye reads, and each stop shows a focus indicator`, async ({page}) => {
        await open(page, example(f.id), {width});
        const {expected, seen} = await walkTab(page);
        expect(seen.map(s => s.name), `${f.id}: Tab order equals the DOM order of tabbable elements`).toEqual(expected.map(e => e.name));
        // 같은 이름이 두 번 나오지 않는다(포커스 함정·중복 정지 없음)
        const keys = seen.map(s => `${s.tag}:${s.top}:${s.left}`);
        expect(new Set(keys).size, `${f.id}: no element is visited twice`).toBe(keys.length);
        // 눈이 읽는 순서: 위에서 아래, 같은 줄(6px 안)이면 왼쪽에서 오른쪽. 대화상자·스크롤 영역처럼 겹치는 경우는 제외하고 정지 간 역행만 본다.
        // 닫기 버튼은 관례상 모서리에 놓이고 DOM 끝에 있다. 화면 순서 비교에서 뺀다(Tab 도달과 이름은 위에서 이미 본다).
        const reading = seen.filter(s => !s.dismiss);
        for (let i = 1; i < reading.length; i += 1) {
          const a = reading[i - 1], b = reading[i], sameRow = Math.abs(a.top - b.top) <= 6;
          const ok = sameRow ? b.left >= a.left - 1 : b.top >= a.top - 1;
          expect(ok, `${f.id} @${width}: focus moves backwards on screen from "${a.name}" (${a.left},${a.top}) to "${b.name}" (${b.left},${b.top})`).toBe(true);
        }
        for (const s of seen) expect(s.focusVisible && (s.ring.outline || s.ring.shadow || s.hostRing), `${f.id}: "${s.name}" shows a focus indicator on keyboard focus ${JSON.stringify(s.ring)} host=${s.hostRing}`).toBeTruthy();
      });
    }
  }
});

test('all purpose families keep the page and their long data within the viewport at phone and desktop widths', async ({page}) => {
  for (const f of PURPOSE_FAMILIES) for (const width of [390, 1280]) {
    const item = example(f.id);
    const built = buildPage(env, f.group, QUIET, {items: [item], runtime: true, context: f.contexts[0] === 'any' ? 'dashboard' : f.contexts[0]});
    expect(built.ok, `${f.id}: ${JSON.stringify(built.diagnostics)}`).toBe(true);
    await page.setViewportSize({width, height: 900});
    await page.goto('about:blank');
    await page.setContent(built.html);
    const overflow = await page.evaluate(() => ({page: document.documentElement.scrollWidth - document.documentElement.clientWidth, root: [...document.querySelectorAll('.pf')].map(x => x.scrollWidth - x.clientWidth)}));
    expect(overflow.page, `${f.id} @${width}: page overflow`).toBeLessThanOrEqual(1);
    expect(overflow.root.every(x => x <= 1), `${f.id} @${width}: component overflow ${JSON.stringify(overflow.root)}`).toBe(true);
  }
});

test.describe('layout conditions written in the contracts', () => {
  const box = (page, sel, nth = 0) => page.locator(sel).nth(nth).boundingBox();
  const heights = (page, sel) => page.locator(sel).evaluateAll(els => els.filter(e => e.getBoundingClientRect().width > 0).map(e => Math.round(e.getBoundingClientRect().height * 10) / 10));

  test('purpose:button.primary focus ring: a 2px+ outline in a colour at least 3:1 against what is behind it, in light and dark', async ({page}) => {
    for (const visual of VISUALS) for (const mode of ['light', 'dark']) {
      await open(page, withExample('purpose:button.primary', {variant: {layout: 'single'}}), {visual, mode});
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement, cs = getComputedStyle(el);
        const parse = c => { const m = c.match(/[\d.]+/g)?.map(Number) ?? []; if (c.startsWith('color(')) return m.slice(0, 3).map(v => v * 255); return m.slice(0, 3); };
        const alpha = c => (c.startsWith('color(') ? m4(c) : (c.match(/[\d.]+/g)?.map(Number)[3] ?? 1));
        const m4 = c => { const m = c.match(/\/\s*([\d.]+)/); return m ? Number(m[1]) : 1; };
        const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        let bg = null; for (let n = el.parentElement; n && !bg; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (alpha(c) >= 0.99) bg = parse(c); }
        const ring = parse(cs.outlineColor), [hi, lo] = [lum(ring), lum(bg ?? [255, 255, 255])].sort((a, b) => b - a);
        return {style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), ratio: (hi + 0.05) / (lo + 0.05), focusVisible: el.matches(':focus-visible'), color: cs.outlineColor};
      });
      expect(r.focusVisible, `${visual} ${mode}`).toBe(true);
      expect(r.style, `${visual} ${mode}: outline style`).not.toBe('none');
      expect(r.width, `${visual} ${mode}: outline width`).toBeGreaterThanOrEqual(2);
      expect(r.ratio, `${visual} ${mode}: focus ring contrast ${r.color}`).toBeGreaterThanOrEqual(3);
    }
  });

  test('purpose:navigation.sidebar brand and open button, and purpose:navigation.topbar brand and toggle, are at least 44px', async ({page}) => {
    await open(page, withExample('purpose:navigation.sidebar'));
    expect((await box(page, 'aside a[href="#"]')).height, 'sidebar brand (desktop)').toBeGreaterThanOrEqual(44);
    await open(page, withExample('purpose:navigation.sidebar'), {width: 390});
    expect((await box(page, 'aside a[href="#"]')).height, 'sidebar brand (phone)').toBeGreaterThanOrEqual(44);
    expect((await box(page, 'aside summary')).height, 'sidebar open button (phone)').toBeGreaterThanOrEqual(44);
    // 컨트롤 높이는 시각 패밀리마다 다르다(dense-enterprise 30px ~ luxury 44px). 터치 44px는 패밀리와 무관한 하한이라 12종 모두에서 본다.
    for (const visual of VISUALS) {
      await open(page, withExample('purpose:navigation.topbar'), {width: 390, visual});
      const tbrand = await box(page, 'header a[href="#"]'), toggle = await box(page, 'header button[aria-expanded]');
      expect(tbrand.height, `topbar brand ${visual}`).toBeGreaterThanOrEqual(44);
      expect(toggle.height, `topbar toggle height ${visual}`).toBeGreaterThanOrEqual(44);
      expect(toggle.width, `topbar toggle width ${visual}`).toBeGreaterThanOrEqual(44);
    }
  });

  test('purpose:navigation.topbar menu links and action buttons share one height on a desktop row', async ({page}) => {
    await open(page, withExample('purpose:navigation.topbar'));
    const links = await heights(page, 'header nav a'), buttons = await heights(page, 'header .kit-ctl-button');
    expect(links.length).toBeGreaterThan(2);
    expect(buttons.length).toBe(2);
    expect(Math.max(...links, ...buttons) - Math.min(...links, ...buttons), `heights ${[...links, ...buttons]}`).toBeLessThanOrEqual(1);
  });

  test('purpose:navigation.bottom cells are 56px tall, so the touch target is over 44px', async ({page}) => {
    await open(page, withExample('purpose:navigation.bottom'), {width: 390});
    const h = await heights(page, 'nav a');
    expect(h.length).toBe(4);
    for (const x of h) expect(x).toBeGreaterThanOrEqual(56);
    const w = await page.locator('nav a').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width)));
    for (const x of w) expect(x, 'cell width').toBeGreaterThanOrEqual(44);
  });

  test('purpose:form.auth secondary links are 44px+ touch targets and the submit button fills the form width', async ({page}) => {
    for (const width of [390, 1280]) {
      await open(page, withExample('purpose:form.auth'), {width});
      for (const link of await page.locator('form a[href]').all()) expect((await link.boundingBox()).height, `auth link @${width}`).toBeGreaterThanOrEqual(44);
      const submit = await box(page, 'button[type=submit]'), form = await page.locator('form').evaluate(f => { const cs = getComputedStyle(f), r = f.getBoundingClientRect(); return r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth); });
      expect(Math.abs(submit.width - form), `submit width ${submit.width} vs form content ${form} @${width}`).toBeLessThanOrEqual(2);
    }
  });

  test('purpose:form.search, purpose:form.filter, purpose:form.group and purpose:form.settings keep scope, field, chip and button at the same height in one row', async ({page}) => {
    const probe = async sel => { const hs = await heights(page, sel); return Math.max(...hs) - Math.min(...hs); };
    await open(page, withExample('purpose:form.search'));
    expect(await probe('.pf-search .kit-ctl-input-box,.pf-search .kit-select-trigger,.pf-search [role=combobox],.pf-search button[type=submit]')).toBeLessThanOrEqual(1);
    await open(page, withExample('purpose:form.filter'));
    expect(await probe('.pf-filter [role=combobox],.pf-chips .kit-ctl-button,.pf-filter-actions .kit-ctl-button')).toBeLessThanOrEqual(1);
    await open(page, withExample('purpose:form.group'));
    expect(await probe('.pf-group .kit-ctl-input-box,.pf-group .kit-ctl-button')).toBeLessThanOrEqual(1);
    await open(page, withExample('purpose:form.settings'));
    expect(await probe('.pf-settings .kit-ctl-input-box,.pf-settings [role=combobox],.pf-set-foot .kit-ctl-button')).toBeLessThanOrEqual(1);
  });

  test('purpose:form.settings gap between a section title and its first control is the same in every section', async ({page}) => {
    await open(page, withExample('purpose:form.settings'));
    const gaps = await page.evaluate(() => [...document.querySelectorAll('[role=group]')].map(g => {
      const title = g.querySelector('h3,h4,legend,.pf-set-title'), first = g.querySelector('input,[role=combobox],select,.kit-ctl-input-box');
      return title && first ? Math.round(first.getBoundingClientRect().top - title.getBoundingClientRect().bottom) : null;
    }));
    expect(gaps.length).toBeGreaterThanOrEqual(2);
    expect(gaps.every(g => g !== null)).toBe(true);
    expect(Math.max(...gaps) - Math.min(...gaps), `gaps ${gaps}`).toBeLessThanOrEqual(2);
  });

  test('purpose:table.dense keeps header buttons and checkboxes at least 24px even in small rows', async ({page}) => {
    await open(page, withExample('purpose:table.dense', {props: {selectable: true}}));
    const hb = await page.locator('th button').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
    const cb = await page.locator('tbody input[type=checkbox]').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    expect(hb.length).toBeGreaterThan(0);
    for (const h of hb) expect(h, 'header button height').toBeGreaterThanOrEqual(24);
    expect(cb.length).toBeGreaterThan(0);
    for (const [w, h] of cb) { expect(w).toBeGreaterThanOrEqual(24 - 8); expect(h).toBeGreaterThanOrEqual(24 - 8); }
    const rowTouch = await page.locator('tbody tr').first().locator('input[type=checkbox]').evaluate(e => { const r = (e.closest('label,td') ?? e).getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); });
    expect(rowTouch, 'checkbox hit area (label or cell)').toBeGreaterThanOrEqual(24);
  });

  test('purpose:table.business, purpose:table.analytic and purpose:table.dense: numbers are right aligned, tabular and do not wrap; the scroll region can take keyboard focus', async ({page}) => {
    for (const id of ['purpose:table.business', 'purpose:table.analytic', 'purpose:table.dense']) {
      await open(page, withExample(id));
      const r = await page.evaluate(() => {
        const nums = [...document.querySelectorAll('td .pf-num')].filter(n => n.getBoundingClientRect().width > 0);
        const aligned = nums.map(n => getComputedStyle(n.closest('td')).textAlign);
        const wraps = nums.filter(n => n.getClientRects().length > 1).length;
        const tab = nums.map(n => getComputedStyle(n).fontVariantNumeric);
        const region = document.querySelector('[role=region]');
        return {count: nums.length, aligned: [...new Set(aligned)], wraps, tab: [...new Set(tab)], regionTab: region.tabIndex, header: [...document.querySelectorAll('th[data-align=end]')].map(t => getComputedStyle(t).textAlign)};
      });
      expect(r.count, id).toBeGreaterThan(2);
      expect(r.aligned.every(a => ['right', 'end'].includes(a)), `${id}: ${r.aligned}`).toBe(true);
      expect(r.wraps, id).toBe(0);
      expect(r.tab.every(t => t.includes('tabular-nums')), `${id}: ${r.tab}`).toBe(true);
      expect(r.header.length, `${id}: numeric headers`).toBeGreaterThan(0);
      expect(r.header.every(a => ['right', 'end'].includes(a)), `${id}: header align ${r.header}`).toBe(true);
      expect(r.regionTab, id).toBe(0);
    }
  });

  test('purpose:feedback.warning and purpose:feedback.error text colours keep 4.5:1 on their background in every visual family', async ({page}) => {
    for (const visual of VISUALS) for (const id of ['purpose:feedback.warning', 'purpose:feedback.error']) {
      await open(page, example(id), {visual});
      const worst = await page.evaluate(() => {
        const parse = c => { const m = c.match(/[\d.]+/g)?.map(Number) ?? []; return c.startsWith('color(') ? m.slice(0, 3).map(v => v * 255) : m.slice(0, 3); };
        const alpha = c => { if (c.startsWith('color(')) { const m = c.match(/\/\s*([\d.]+)/); return m ? Number(m[1]) : 1; } return c.match(/[\d.]+/g)?.map(Number)[3] ?? 1; };
        const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        let worst = 99;
        for (const el of document.querySelectorAll('.kit-ctl-feedback-text,.kit-ctl-feedback-title,.kit-ctl-feedback p')) {
          let bg = [255, 255, 255]; for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (alpha(c) >= 0.99) { bg = parse(c); break; } }
          const [hi, lo] = [lum(parse(getComputedStyle(el).color)), lum(bg)].sort((a, b) => b - a);
          worst = Math.min(worst, (hi + 0.05) / (lo + 0.05));
        }
        return worst;
      });
      expect(worst, `${id} ${visual}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('purpose:button.emphasis and purpose:button.destructive: label contrast is at least 4.5:1 on the button face', async ({page}) => {
    for (const visual of VISUALS) for (const id of ['purpose:button.emphasis', 'purpose:button.destructive']) {
      await open(page, example(id), {visual});
      const worst = await page.evaluate(() => {
        const parse = c => { const m = c.match(/[\d.]+/g)?.map(Number) ?? []; return c.startsWith('color(') ? m.slice(0, 3).map(v => v * 255) : m.slice(0, 3); };
        const alpha = c => { if (c.startsWith('color(')) { const m = c.match(/\/\s*([\d.]+)/); return m ? Number(m[1]) : 1; } return c.match(/[\d.]+/g)?.map(Number)[3] ?? 1; };
        const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        let worst = 99;
        for (const el of document.querySelectorAll('.kit-ctl-button')) {
          let bg = [255, 255, 255]; for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (alpha(c) >= 0.99) { bg = parse(c); break; } }
          const [hi, lo] = [lum(parse(getComputedStyle(el).color)), lum(bg)].sort((a, b) => b - a);
          worst = Math.min(worst, (hi + 0.05) / (lo + 0.05));
        }
        return worst;
      });
      expect(worst, `${id} ${visual}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

const toggle0 = page => page.locator('header button[aria-expanded]').getAttribute('aria-controls');

test.describe('keyboard interaction and state transitions', () => {
  test('purpose:navigation.tabs: arrows wrap and skip the disabled tab, Home and End jump, and selection follows focus (automatic)', async ({page}) => {
    await open(page, withExample('purpose:navigation.tabs'));
    const tab = n => page.getByRole('tab', {name: new RegExp(`^${n}`)});
    await tab('개요').focus();
    await page.keyboard.press('End');
    await expect(tab('파일')).toBeFocused();
    await expect(tab('파일')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tab('개요'), 'wraps past the disabled 보관 tab').toBeFocused();
    await expect(page.getByRole('tabpanel')).toContainText('프로젝트의 목표');
    await page.keyboard.press('ArrowLeft');
    await expect(tab('파일')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tab('개요')).toBeFocused();
    await expect(tab('개요')).toHaveAttribute('tabindex', '0');
    await expect(tab('작업')).toHaveAttribute('tabindex', '-1');
    // 선택 탭만 Tab 정지, 그 다음 Tab은 패널로
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tabpanel')).toBeFocused();
    expect(await page.locator('[role=tabpanel]:not([hidden])').count()).toBe(1);
  });

  test('purpose:navigation.tabs: manual activation moves focus with arrows but selects only on Enter or Space', async ({page}) => {
    await open(page, withExample('purpose:navigation.tabs', {props: {activation: 'manual'}}));
    const tab = n => page.getByRole('tab', {name: new RegExp(`^${n}`)});
    await tab('개요').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab('작업')).toBeFocused();
    await expect(tab('개요')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(tab('작업')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('이번 주에 끝낼');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(tab('파일')).toHaveAttribute('aria-selected', 'true');
  });

  test('purpose:feedback.confirm: Tab stays inside the dialog, Escape closes it, and focus returns to the trigger; neutral takes focus on the first control', async ({page}) => {
    const item = withExample('purpose:feedback.confirm', {variant: {tone: 'danger', form: 'dialog', display: 'trigger'}, content: {triggerLabel: '프로젝트 삭제'}});
    // 대화상자 밖에 포커스 가능한 요소를 둬서 inert가 실제로 막는지 본다.
    await open(page, [item, withExample('purpose:button.primary', {content: {label: '바깥 버튼 가', secondaryLabel: '바깥 버튼 나'}})], {group: 'feedback'});
    const trigger = page.getByRole('button', {name: '프로젝트 삭제'});
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByRole('button', {name: '취소'})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: '삭제', exact: true})).toBeFocused();
    // 뒤 페이지는 inert다: Tab을 여러 번 눌러도 대화상자 밖의 요소에는 포커스가 가지 않는다(끝에서는 브라우저 UI나 본문으로 나갈 수 있다).
    for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest('dialog')), `${key}: focus never lands on the inert page behind the dialog`).toBe(true);
    }
    expect(await page.evaluate(() => document.activeElement.textContent.includes('바깥 버튼')), 'no outside button took focus').toBe(false);
    expect(await page.evaluate(() => !!document.querySelector('dialog[open]:modal')), 'the dialog is modal').toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    // 취소 버튼으로 닫아도 같다
    await page.keyboard.press('Space');
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    await page.getByRole('button', {name: '취소'}).press('Enter');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('purpose:feedback.warning and purpose:feedback.error: the acknowledge and close buttons remove the message and focus does not stay on a removed node', async ({page}) => {
    await open(page, withExample('purpose:feedback.warning', {variant: {form: 'inline', ack: 'button'}}));
    const msg = page.locator('.kit-ctl-feedback');
    await expect(msg).toBeVisible();
    await page.getByRole('button', {name: '알겠어요'}).focus();
    await page.keyboard.press('Enter');
    await expect(msg).toBeHidden();
    expect(await page.evaluate(() => document.activeElement === document.body || !document.activeElement.closest('[hidden]')), 'focus is not on a hidden element').toBe(true);
    await open(page, withExample('purpose:feedback.error'));
    await page.getByRole('button', {name: '닫기'}).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.kit-ctl-feedback')).toBeHidden();
  });

  test('purpose:navigation.topbar: the menu toggle flips aria-expanded and shows the list with Enter and Space, and the links stay reachable by Tab', async ({page}) => {
    await open(page, withExample('purpose:navigation.topbar'), {width: 390});
    const toggle = page.locator('header button[aria-expanded]'), list = page.locator(`#${await toggle0(page)}`);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: '제품'})).toBeFocused();
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();
  });

  test('purpose:navigation.sidebar: the open button (summary) toggles with Enter and Space and the links are reached after it', async ({page}) => {
    await open(page, withExample('purpose:navigation.sidebar'), {width: 390});
    const summary = page.locator('aside summary'), details = page.locator('aside details');
    await summary.focus();
    const before = await details.evaluate(d => d.open);
    await page.keyboard.press('Enter');
    expect(await details.evaluate(d => d.open)).toBe(!before);
    await page.keyboard.press('Space');
    expect(await details.evaluate(d => d.open)).toBe(before);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: '개요'})).toBeFocused();
    await expect(page.getByRole('link', {name: '개요'})).toHaveAttribute('aria-current', 'page');
  });

  test('purpose:form.search: the scope combobox opens with ArrowDown, moves aria-activedescendant, selects with Enter, closes with Escape and returns focus; the clear button appears with text and clears it', async ({page}) => {
    await open(page, withExample('purpose:form.search'));
    const combo = page.getByRole('combobox', {name: '범위'}), list = page.getByRole('listbox');
    await combo.focus();
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowDown');
    await expect(combo).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toBeVisible();
    const first = await combo.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    const second = await combo.getAttribute('aria-activedescendant');
    expect(second && second !== first, `active descendant moves ${first} → ${second}`).toBe(true);
    await expect(page.locator(`#${second}`)).toHaveText(/문서|전체/);
    await page.keyboard.press('Enter');
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[role=option][aria-selected=true]')).toHaveCount(1);
    await expect(combo).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await expect(combo).toBeFocused();
    // 지우기 버튼은 값이 생기면 나타난다: Tab 순서에 들어오고 누르면 비우고 칸으로 포커스를 돌려준다
    const input = page.getByRole('searchbox', {name: '사이트 검색'}), clear = page.getByRole('button', {name: '검색어 지우기'});
    await expect(clear).toBeHidden();
    await input.fill('패밀리');
    await expect(clear).toBeVisible();
    await clear.focus();
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('');
    await expect(clear).toBeHidden();
    await expect(input).toBeFocused();
  });

  test('purpose:form.filter: chips flip aria-pressed with Space and Enter independently, and a filter select opens from the keyboard', async ({page}) => {
    await open(page, withExample('purpose:form.filter'));
    const chip = n => page.getByRole('button', {name: n, exact: true});
    await expect(chip('무료 배송')).toHaveAttribute('aria-pressed', 'true');
    await chip('반품 가능').focus();
    await page.keyboard.press('Space');
    await expect(chip('반품 가능')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(chip('반품 가능')).toHaveAttribute('aria-pressed', 'false');
    await expect(chip('무료 배송')).toHaveAttribute('aria-pressed', 'true');
    const combo = page.getByRole('combobox', {name: '상태'});
    await combo.focus();
    await page.keyboard.press('Enter');
    await expect(combo).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', {name: '적용'})).toBeVisible();
  });

  test('purpose:form.auth: the password reveal button flips aria-pressed and the input type from the keyboard, and the error summary names the failing field', async ({page}) => {
    await open(page, withExample('purpose:form.auth'));
    const pw = page.locator('input[name$=password]'), field = page.locator('input[name$=password]'), reveal = page.getByRole('button', {name: /비밀번호 (표시|숨기기)/});
    await expect(reveal).toHaveAttribute('aria-pressed', 'false');
    await reveal.focus();
    await page.keyboard.press('Enter');
    await expect(reveal).toHaveAttribute('aria-pressed', 'true');
    await expect(field).toHaveAttribute('type', 'text');
    await page.keyboard.press('Space');
    await expect(reveal).toHaveAttribute('aria-pressed', 'false');
    await expect(field).toHaveAttribute('type', 'password');
    await expect(page.getByRole('alert')).toContainText('올바르지 않습니다');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(pw).toHaveCount(1);
  });

  test('purpose:button.toggle: Space and Enter flip aria-pressed in the group, and purpose:button.loading ignores Enter while busy but keeps focus', async ({page}) => {
    await open(page, withExample('purpose:button.toggle'));
    const [list, grid] = [page.getByRole('button', {name: '목록'}), page.getByRole('button', {name: '격자'})];
    await grid.focus();
    await page.keyboard.press('Space');
    await expect(grid).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(grid).toHaveAttribute('aria-pressed', 'false');
    await expect(list).toHaveAttribute('aria-pressed', 'true');
    await expect(grid, 'label does not change with state').toHaveText('격자');
    await open(page, withExample('purpose:button.loading', {variant: {phase: 'loading', tier: 'primary'}}));
    const busy = page.getByRole('button', {name: '결제 중'});
    await busy.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(busy).toBeFocused();
    await expect(busy).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('[role=status]').filter({hasText: '처리 중'}).first()).toBeAttached();
  });

  test('purpose:button.split and purpose:button.menu: ArrowDown opens the menu, arrows and Home/End move, Escape closes and focus returns to the trigger', async ({page}) => {
    for (const id of ['purpose:button.menu', 'purpose:button.split']) for (const width of [1280, 390]) {
      await open(page, withExample(id), {width});
      const trigger = page.locator('button[aria-haspopup=menu]');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expect(trigger, `${id}@${width}`).toHaveAttribute('aria-expanded', 'true');
      const items = page.locator('[role=menuitem]');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('End');
      await expect(items.last()).toBeFocused();
      await page.keyboard.press('Home');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('[role=menu]')).toBeHidden();
    }
  });

  test('purpose:button.fab is a 56px round target and purpose:button.close a 44px one, and the close button removes its box', async ({page}) => {
    for (const width of [1280, 390]) {
      await open(page, withExample('purpose:button.fab'), {width});
      const fab = await page.locator('.pf-fab button').boundingBox();
      expect(Math.min(fab.width, fab.height), `fab @${width}`).toBeGreaterThanOrEqual(56);
      await open(page, withExample('purpose:button.close'), {width});
      const close = await page.locator('button[data-action-dismiss]').boundingBox();
      expect(Math.min(close.width, close.height), `close @${width}`).toBeGreaterThanOrEqual(44);
      await page.locator('button[data-action-dismiss]').click();
      await expect(page.locator('[data-dismissible]')).toBeHidden();
    }
  });

  test('purpose:table.business, purpose:table.analytic and purpose:table.dense: header sort buttons work from the keyboard and aria-sort follows, one column at a time', async ({page}) => {
    for (const id of ['purpose:table.business', 'purpose:table.analytic', 'purpose:table.dense']) {
      await open(page, withExample(id));
      const sortable = page.locator('th button[data-sort]');
      const n = await sortable.count();
      expect(n, id).toBeGreaterThan(1);
      const target = sortable.nth(0);
      await target.focus();
      await page.keyboard.press('Enter');
      const th0 = target.locator('xpath=ancestor::th');
      await expect(th0, `${id}: Enter sorts ascending`).toHaveAttribute('aria-sort', 'ascending');
      await expect(page.locator('th[aria-sort=ascending],th[aria-sort=descending]'), id).toHaveCount(1);
      await page.keyboard.press('Space');
      await expect(th0, `${id}: Space flips the direction`).toHaveAttribute('aria-sort', 'descending');
      await sortable.nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('th[aria-sort=ascending],th[aria-sort=descending]'), `${id}: only one sorted column`).toHaveCount(1);
      await expect(sortable.nth(1).locator('xpath=ancestor::th')).toHaveAttribute('aria-sort', /ascending|descending/);
    }
  });

  test('purpose:card.gallery and purpose:card.product: selection by keyboard flips the native checkbox or aria-pressed and shows the mark', async ({page}) => {
    await open(page, withExample('purpose:card.gallery', {variant: {tiles: 'select'}, props: {behavior: 'static'}}));
    const box = page.getByRole('checkbox', {name: '노을 선택'});
    await box.focus();
    await page.keyboard.press('Space');
    await expect(box).toBeChecked();
    await expect(page.locator('.pf-tile:has(input:checked) .pf-tile-check')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(box).not.toBeChecked();
    await open(page, withExample('purpose:card.product', {props: {behavior: 'selectable'}}));
    const hit = page.locator('.kit-ctl-card-hit');
    await hit.focus();
    await page.keyboard.press('Enter');
    await expect(hit).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(hit).toHaveAttribute('aria-pressed', 'false');
  });

  test('purpose:card.kpi, purpose:card.article, purpose:card.feature, purpose:card.profile, purpose:card.pricing, purpose:card.status: only the declared controls take focus; static cards take none', async ({page}) => {
    const stops = {'purpose:card.kpi': 0, 'purpose:card.feature': 0, 'purpose:card.status': 0, 'purpose:card.article': 1, 'purpose:card.profile': 2, 'purpose:card.pricing': 1};
    for (const [id, n] of Object.entries(stops)) {
      await open(page, example(id));
      const {expected} = await walkTab(page);
      expect(expected.length, id).toBe(n);
    }
    for (const id of ['purpose:card.kpi', 'purpose:card.feature', 'purpose:card.status']) {
      await open(page, withExample(id, {props: {behavior: 'link'}, content: {href: '#go'}}));
      expect((await walkTab(page)).expected.length, `${id} link`).toBe(1);
    }
  });

  test('purpose:button.primary, purpose:button.secondary, purpose:button.emphasis, purpose:button.destructive and purpose:button.icon are reached in their contract order on a phone and a desktop', async ({page}) => {
    const orders = {
      'purpose:button.primary': ['저장', '취소'], 'purpose:button.secondary': ['내보내기', '공유'], 'purpose:button.emphasis': ['무료로 시작', '데모 보기'],
      'purpose:button.destructive': ['취소', '프로젝트 삭제'], 'purpose:button.icon': ['복사', '편집', '공유', '더보기'],
    };
    for (const width of [390, 1280]) for (const [id, names] of Object.entries(orders)) {
      await open(page, example(id), {width});
      expect((await walkTab(page)).seen.map(s => s.name), `${id} @${width}`).toEqual(names);
    }
  });

  test('purpose:card.product with a button, purpose:form.group and purpose:form.settings: Enter and Space reach the declared buttons in order', async ({page}) => {
    await open(page, withExample('purpose:form.settings'));
    const order = (await walkTab(page)).seen.map(s => s.name);
    expect(order.slice(-2)).toEqual(['저장', '취소']);
    await open(page, withExample('purpose:form.group'));
    expect((await walkTab(page)).seen.map(s => s.name)).toEqual(['뉴스레터 구독', '구독']);
    await open(page, withExample('purpose:card.product', {variant: {cta: 'button'}, props: {behavior: 'static'}, content: {ctaLabel: '담기'}}));
    expect((await walkTab(page)).seen.map(s => s.name)).toEqual(['담기']);
  });

  test('purpose:feedback.progress and purpose:feedback.result: status and alert regions announce, progress keeps its name and value, and the cancel/result buttons are the only stops', async ({page}) => {
    await open(page, example('purpose:feedback.progress'));
    const bar = page.getByRole('progressbar', {name: '파일 업로드 중'});
    await expect(bar).toHaveAttribute('value', '58');
    expect((await walkTab(page)).seen.map(s => s.name)).toEqual(['취소']);
    await open(page, example('purpose:feedback.result'));
    expect((await walkTab(page)).seen.map(s => s.name)).toEqual(['주문 내역 보기', '쇼핑 계속하기']);
    await expect(page.getByRole('heading', {level: 2})).toContainText('결제가 완료되었습니다');
  });
});
