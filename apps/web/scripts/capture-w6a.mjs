// W6-a 스크린샷: Chromium 390폭(모바일)과 1280폭(데스크톱)으로 개편한 화면과 Studio 수정 동작을 남긴다.
// 실행: BASE=http://127.0.0.1:4421 node apps/web/scripts/capture-w6a.mjs  (먼저 `next start -p 4421` 로 서버를 띄운다)
// 결과: docs/platform/web-audit/after-w6a/<이름>.d1280.png, <이름>.m390.png (전체 높이)
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';

const base = process.env.BASE ?? 'http://127.0.0.1:4421';
const out = resolve(import.meta.dirname, '../../../docs/platform/web-audit/after-w6a');
mkdirSync(out, {recursive: true});
const SIZES = [{tag: 'd1280', width: 1280, height: 900}, {tag: 'm390', width: 390, height: 844}];

// Thumb 은 화면 근처에 올 때만 iframe 을 만든다. 전체 높이 캡처에서 빈 상자가 되지 않게 항상 보이는 것으로 취급한다.
const alwaysVisible = () => {
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{isIntersecting: true, target: el}]); }
    unobserve() {}
    disconnect() {}
  };
};

const browser = await chromium.launch();
// 살아 있는 썸네일 iframe 이 모두 본문을 그릴 때까지 기다린다(전체 높이 캡처에서 빈 상자가 남지 않게).
const framesPainted = page => page.waitForFunction(() => [...document.querySelectorAll('main iframe')].every(f => { try { return f.contentDocument?.body?.children.length > 0; } catch { return false; } }), null, {timeout: 15000}).catch(() => {});
// 화면 밖 iframe 은 스크롤해서 지나가야 그려진다. 끝까지 훑은 뒤 맨 위로 돌아와 찍는다.
const sweep = async page => {
  const [height, view] = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
  for (let y = 0; y < height; y += view * 0.8) { await page.evaluate(top => scrollTo(0, top), y); await page.waitForTimeout(160); }
  await page.evaluate(() => scrollTo(0, 0));
};
// 화면 밖 iframe 은 전체 높이 캡처에서 그려지지 않는다. 뷰포트를 문서 높이만큼 키워 모두 화면 안에 둔 채 찍고 되돌린다.
const shot = async (page, name, tag) => {
  await sweep(page);
  const size = page.viewportSize();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({width: size.width, height: Math.min(height, 12000)});
  await framesPainted(page);
  await page.waitForTimeout(900);
  await page.screenshot({path: `${out}/${name}.${tag}.png`, fullPage: true});
  await page.setViewportSize(size);
  console.log('shot', `${name}.${tag}`);
};
const ready = page => page.locator('[data-phase="ready"]').waitFor();
const pickValue = async (page, selector, value) => { await page.locator(selector).click(); await page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`).click(); };

for (const {tag, width, height} of SIZES) {
  const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write']});
  await context.addInitScript(alwaysVisible);
  const page = await context.newPage();

  // 골격: Home, Explore(목록·상세), Docs 세 갈래
  for (const [name, path] of [['home', '/'], ['explore', '/explore'], ['explore-detail', '/explore/saas-landing~palette_pearl~mode_dark~hero_product'], ['docs', '/docs'], ['docs-guide-principles', '/docs/guide/principles'], ['docs-integrations', '/docs/integrations']]) {
    await page.goto(base + path);
    await page.waitForLoadState('networkidle');
    await shot(page, name, tag);
  }
  if (width < 720) {
    await page.goto(base + '/');
    await page.getByRole('button', {name: /메뉴/}).click();
    await shot(page, 'nav-open', tag);
  }

  // Studio 시작과 작업 화면(디자인 탭)
  await page.goto(base + '/studio');
  await page.evaluate(() => localStorage.clear());
  await page.goto(base + '/studio');
  await page.getByRole('heading', {name: '무엇으로 시작할까요?'}).waitFor();
  await shot(page, 'studio-start', tag);

  await page.goto(base + '/studio?template=saas-landing');
  await ready(page);
  if (width < 720) await page.getByRole('button', {name: '편집', exact: true}).click().catch(() => {});
  await page.getByRole('tab', {name: '디자인'}).click();

  // (1) 편집해도 history 길이가 늘지 않는다. 실제 숫자를 화면에 적어 둔다.
  const before = await page.evaluate(() => history.length);
  await pickValue(page, '#d-theme-select', 'console');
  await page.getByRole('radio', {name: /^다크/}).click();
  await page.getByRole('radio', {name: /^라이트/}).click();
  await page.getByRole('radio', {name: /^다크/}).click();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => history.length);
  await page.evaluate(([b, a]) => { const el = document.createElement('p'); el.setAttribute('data-evidence', 'history'); el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:6px 10px;background:#14161a;color:#fff;font:12px/1.4 system-ui'; el.textContent = `편집 4회 전후 history.length: ${b} → ${a}`; document.body.append(el); }, [before, after]);
  await shot(page, 'studio-edit-history', tag);
  await page.locator('[data-evidence="history"]').evaluate(el => el.remove());

  // (2) 공유 URL: 같은 주소를 저장소가 비어 있는 다른 브라우저에서 연다
  await page.getByRole('tab', {name: '구조·내용'}).click();
  let last = '';
  for (let i = 0; i < 20; i++) { const now = page.url(); if (now === last && now.includes('#d=')) break; last = now; await page.waitForTimeout(400); }
  const url = page.url();
  const other = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1});
  const second = await other.newPage();
  await second.goto(url);
  await ready(second);
  await second.waitForTimeout(800);
  await shot(second, 'studio-shared-link-opened', tag);
  await other.close();

  // (3) 새로고침 뒤에도 실행 취소가 켜져 있다
  await page.reload();
  await ready(page);
  await page.waitForTimeout(600);
  await shot(page, 'studio-undo-after-reload', tag);

  // (4) 구 문서에서 역할 타이포를 고르면 영향 요약이 먼저 뜬다
  const old = await context.newPage();
  await old.goto(base + '/studio');
  await old.evaluate(() => localStorage.clear());
  await old.goto(base + '/studio?template=saas-landing');
  await ready(old);
  if (width < 720) await old.getByRole('button', {name: '편집', exact: true}).click().catch(() => {});
  await old.getByRole('tab', {name: '디자인'}).click();
  await pickValue(old, '#d-palette', 'pearl');
  await old.waitForTimeout(500);
  await pickValue(old, '#material-type-roles', 'erp');
  await old.getByTestId('impact-dialog').waitFor();
  await shot(old, 'studio-impact-dialog', tag);

  // (5) 작업이 있는 브라우저에서 공유 링크를 열면 덮어쓰기 전에 묻는다
  await old.getByRole('dialog').getByRole('button', {name: '취소'}).click();
  await old.goto(base + '/explore');
  await old.goto(url);
  await old.getByRole('dialog').waitFor();
  await shot(old, 'studio-shared-link-confirm', tag);
  await context.close();
}

await browser.close();
