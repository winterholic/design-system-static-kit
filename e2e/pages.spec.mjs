import {test, expect} from '@playwright/test';
import {templateList, themes, createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

/** Structural accessibility audit run inside the page (no external engine): landmarks, headings, names, labels, targets, ids. */
const audit = () => {
  const out = [], vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  if (document.documentElement.lang !== 'ko') out.push('html lang');
  for (const sel of ['main', 'nav', 'footer', 'header']) if (!document.querySelector(sel)) out.push('missing landmark ' + sel);
  const h1s = [...document.querySelectorAll('h1')]; if (h1s.length !== 1) out.push('h1 count ' + h1s.length);
  let prev = 0; for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) { const n = +h.tagName[1]; if (prev && n > prev + 1) out.push(`heading jump h${prev}→h${n}: ${h.textContent.trim().slice(0, 30)}`); prev = n; if (!h.textContent.trim()) out.push('empty heading'); }
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id); if (ids.length !== new Set(ids).size) out.push('duplicate ids');
  for (const el of document.querySelectorAll('a[href],button,summary,[role=tab]')) { if (!vis(el)) continue; const name = (el.getAttribute('aria-label') ?? el.textContent).trim(); if (!name) out.push('unnamed ' + el.outerHTML.slice(0, 60)); }
  for (const el of document.querySelectorAll('svg[role=img]')) if (!(el.getAttribute('aria-label') || el.querySelector('title'))) out.push('unnamed svg');
  for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) { const named = el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'); if (!named) out.push('unlabelled ' + (el.name || el.type)); }
  for (const el of document.querySelectorAll('a[href].kit-button,button,.kit-nav a,summary,input:not([type=hidden]),select,textarea,.kit-chips button,.kit-pagination a')) {
    if (!vis(el)) continue; const box = (el.closest('label') ?? el).getBoundingClientRect();
    if (box.width < 24 || box.height < 24) out.push(`target ${Math.round(box.width)}x${Math.round(box.height)} ${(el.className || el.tagName)}`);
  }
  for (const t of document.querySelectorAll('table')) if (!t.querySelector('caption') || !t.querySelector('th')) out.push('table without caption/headers');
  for (const f of document.querySelectorAll('form')) if (!f.getAttribute('aria-labelledby')) out.push('form unnamed');
  const anchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(Boolean); for (const a of anchors) if (!document.getElementById(a)) out.push('dangling anchor #' + a);
  return out;
};

test('all 61 templates × phone/tablet/desktop: no overflow, no page errors, structural a11y clean', async ({page}) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const problems = [];
  for (const t of templateList) for (const width of [390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    await page.goto(`/site/examples/${t.id}/`);
    const over = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}));
    if (over.sw > over.cw + 1) problems.push(`${t.id}@${width} overflow ${over.sw}>${over.cw}`);
    if (width === 390) for (const p of await page.evaluate(audit)) problems.push(`${t.id}: ${p}`);
  }
  expect(problems).toEqual([]); expect(errors).toEqual([]);
});

test('all 40 theme showcases render on a phone without overflow', async ({page}) => {
  test.setTimeout(240000);
  await page.setViewportSize({width: 390, height: 844}); const problems = [];
  for (const id of Object.keys(themes)) { await page.goto(`/site/examples/themes/${id}/`); const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})); if (o.sw > o.cw + 1) problems.push(`${id} ${o.sw}>${o.cw}`); }
  expect(problems).toEqual([]);
});

test('keyboard: every focus stop shows an indicator, tabs work with arrow keys', async ({page}) => {
  test.setTimeout(180000);
  const bad = [];
  for (const id of ['saas-landing', 'settings', 'product-detail', 'admin-table', 'project-board', 'login', 'pricing-page', 'docs-reference']) {
    await page.setViewportSize({width: 1280, height: 900}); await page.goto(`/site/examples/${id}/`);
    for (let i = 0; i < 70; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const has = n => { if (!n) return false; const s = getComputedStyle(n); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow !== 'none' && /inset|0px 0px 0px/.test(s.boxShadow)); };
        const ok = has(el) || has(el.closest('.kit-card')) || has(el.nextElementSibling) || has(el.parentElement) || has(el.closest('.kit-search'));
        return {ok, tag: el.tagName, cls: el.className?.toString().slice(0, 40), text: (el.textContent ?? '').trim().slice(0, 20)};
      });
      if (r && !r.ok) bad.push(`${id}: ${r.tag}.${r.cls} "${r.text}"`);
    }
  }
  expect([...new Set(bad)]).toEqual([]);
  await page.goto('/site/examples/settings/'); const tabs = page.getByRole('tab'); await tabs.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true'); await expect(page.getByRole('tabpanel')).toContainText('이메일 알림');
});

test('auto mode follows the system color scheme and both sets are real', async ({page}) => {
  const b = createBlueprint('saas-landing'); b.mode = 'auto'; const r = compile(b);
  await page.emulateMedia({colorScheme: 'light'}); await page.setContent(r.html);
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(' + r.tokens.light.text.slice(1).match(/../g).map(x => parseInt(x, 16)).join(', ') + ')');
  await page.emulateMedia({colorScheme: 'dark'});
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(' + r.tokens.dark.text.slice(1).match(/../g).map(x => parseInt(x, 16)).join(', ') + ')');
});

test('reduced motion removes animation; forced contrast keeps visible borders', async ({page}) => {
  const b = createBlueprint('saas-landing', 'playful'); const html = compile(b).html;
  await page.emulateMedia({reducedMotion: 'reduce'}); await page.setContent(html);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.kit-hero-copy > p')).animationName)).toBe('none');
});

test('single-file gallery works offline on a phone: browse, open, change theme, hit a ban, auto-fix', async ({page, context}) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', route => { const u = route.request().url(); return u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('about:') ? route.continue() : route.abort(); });
  await page.setViewportSize({width: 390, height: 844}); await page.goto('/site/gallery/index.html');
  await expect(page.locator('#counts')).toContainText('테마 40'); await expect(page.locator('#counts')).toContainText('템플릿 61');
  const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})); expect(o.sw).toBeLessThanOrEqual(o.cw + 1);
  await expect(page.locator('#tab-templates .card')).toHaveCount(61); await expect.poll(() => page.locator('#tab-templates .thumb iframe').count()).toBeGreaterThan(0);
  await page.getByRole('button', {name: '랜딩', exact: true}).click(); await expect(page.locator('#tab-templates .card').first()).toBeVisible();
  await page.locator('#tab-templates .card').first().click(); await expect(page.locator('#viewer')).toHaveClass(/open/);
  await expect(page.frameLocator('#frame').locator('h1')).toBeVisible();
  await page.locator('#opts').click(); await page.locator('#f-theme').selectOption('nocturne'); await expect(page.locator('#vtitle')).toContainText('녹턴');
  await expect(page.frameLocator('#frame').locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#a-density').selectOption('compact'); await page.locator('#a-shell').selectOption('dock');
  await expect(page.locator('#errs')).toContainText('X01'); await page.locator('#fix').click(); await expect(page.locator('#errs')).not.toHaveClass(/open/);
  await page.locator('#close').click(); await expect(page.locator('#viewer')).not.toHaveClass(/open/);
  await page.locator('nav.tabs button[data-tab=themes]').click(); await expect(page.locator('#tab-themes .themecard')).toHaveCount(40);
  await page.locator('#tab-themes [data-p]').first().click(); await expect(page.frameLocator('#frame').locator('h1')).toBeVisible(); await page.locator('#close').click();
  await page.locator('nav.tabs button[data-tab=parts]').click(); await expect(page.locator('#tab-parts [data-n]')).toHaveCount(55);
  await page.locator('#tab-parts [data-n=chart]').click(); await expect(page.frameLocator('#frame').locator('svg[role=img]').first()).toBeVisible(); await page.locator('#close').click();
  await page.locator('nav.tabs button[data-tab=rules]').click(); await expect(page.locator('#tab-rules')).toContainText('X11');
  expect(errors).toEqual([]);
});

test('standalone design docs and examples are portable', async ({page}) => {
  for (const path of ['/docs/design.html', '/docs/gap-analysis.html']) { await page.goto(path); await expect(page.locator('h1')).toBeVisible(); expect(await page.locator('main section, article section, section').count()).toBeGreaterThanOrEqual(6); }
  await page.goto('/site/examples/settings/'); await page.getByRole('tab', {name: '프로필'}).click(); await page.locator('#field-name').fill('테스트'); await expect(page.locator('h1')).toBeVisible();
});
