// Studio 동작 시험: URL 상태, 새로고침, 뒤로 가기, 저장·복구, 다른 탭 충돌, undo/redo. 결과를 JSON 줄로 낸다.
// 사용: BASE=http://127.0.0.1:4421 node studio-behavior.mjs
import {chromium} from '@playwright/test';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const KEY = 'winterholic-static-kit.studio.v1';
const browser = await chromium.launch();
const results = [];
const rec = (id, observed, extra = {}) => { results.push({id, observed, ...extra}); console.log(JSON.stringify({id, observed, ...extra})); };

const open = async (ctx, url) => {
  const page = await ctx.newPage();
  await page.goto(BASE + url, {waitUntil: 'networkidle'});
  await page.waitForTimeout(500);
  return page;
};
const stored = page => page.evaluate(k => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }, KEY);
const pick = async (page, id, value) => { await page.locator('#' + id).click(); await page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`).click(); await page.waitForTimeout(500); };
const pickAny = async (page, id) => { await page.locator('#' + id).click(); const o = page.getByRole('listbox').locator('[role="option"]:not([aria-disabled="true"]):not([aria-selected="true"])').first(); const v = await o.getAttribute('data-value'); await o.click(); await page.waitForTimeout(500); return v; };
const urlOf = page => { const u = new URL(page.url()); return u.pathname + u.search; };
const undoState = async page => ({undo: await page.getByRole('button', {name: '실행 취소'}).isEnabled(), redo: await page.getByRole('button', {name: '다시 실행'}).isEnabled()});
const theme = async page => (await stored(page))?.doc?.theme;

// ---- 1. URL 상태
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await open(ctx, '/studio?template=saas-landing');
  rec('url.start-arg-consumed', `주소 ${urlOf(page)} (시작 인자 template 이 지워짐)`);
  await page.getByRole('tab', {name: '디자인'}).click();
  rec('url.tab-push', urlOf(page));
  await pick(page, 'd-theme-select', 'aurora');
  rec('url.theme-change', `주소 ${urlOf(page)} / 저장 doc.theme=${await theme(page)}`);
  await page.getByRole('button', {name: '모바일 390'}).click();
  rec('url.device-replace', urlOf(page));
  await page.getByRole('button', {name: '다크로 보기'}).click();
  rec('url.scheme-not-in-url', urlOf(page));
  const h = await page.evaluate(() => history.length);
  rec('url.history-length-after-edit', `history.length=${h}`);

  // ---- 2. 새로고침
  await page.getByRole('button', {name: '맞춤'}).click();
  await page.reload({waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  rec('reload.keeps-doc', `theme=${await theme(page)} / 주소 ${urlOf(page)} / 탭 선택=${await page.getByRole('tab', {selected: true}).textContent()} / 기기 폭=${await page.getByTestId('preview').getAttribute('data-device')}`);
  rec('reload.undo-stack', JSON.stringify(await undoState(page)), {note: 'undo/redo 기록은 메모리에만 있다'});
  rec('reload.scheme-reset', `scheme 버튼 눌림=${await page.getByRole('button', {name: '문서 설정대로'}).getAttribute('aria-pressed')}`);

  // ---- 3. 뒤로 가기
  await page.getByRole('tab', {name: '검증'}).click();
  await page.getByRole('tab', {name: '구조·내용'}).click();
  const before = urlOf(page);
  await page.evaluate(() => history.back()); await page.waitForTimeout(500);
  rec('back.tab-history', `${before} → 뒤로 → ${urlOf(page)} / 선택 탭=${await page.getByRole('tab', {selected: true}).textContent()} / theme 그대로=${await theme(page)}`);
  await ctx.close();
}

// ---- 3b. 뒤로 가기: Explore 에서 Studio 로 온 뒤 편집하고 여러 번 뒤로
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await open(ctx, '/explore/saas-landing~theme_aurora~variant_clean-saas');
  await page.getByRole('link', {name: 'Studio에서 열기'}).click();
  await page.waitForSelector('[data-testid="preview-frame"]', {state: 'attached'}); await page.waitForTimeout(600);
  const trail = [`Studio 도착 ${urlOf(page)}`];
  await page.getByRole('tab', {name: '디자인'}).click();
  await pick(page, 'd-theme-select', 'workspace');
  trail.push(`디자인 탭+테마 변경 ${urlOf(page)}`);
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => history.back()); await page.waitForTimeout(1500);
    const doc = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null')?.doc?.theme ?? null, KEY);
    trail.push(`뒤로 ${i}회 ${urlOf(page)} (저장 theme=${doc}, 화면 h1=${(await page.locator('h1, h2').first().textContent())?.trim()})`);
  }
  rec('back.trail', trail.join(' | '));
  await ctx.close();
}

// ---- 4. 시작 인자가 작업 중 문서를 덮어쓰는가
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  let page = await open(ctx, '/studio?template=saas-landing');
  await page.getByRole('tab', {name: '디자인'}).click();
  await pick(page, 'd-theme-select', 'aurora');
  await page.goto(BASE + '/studio?template=app-landing', {waitUntil: 'networkidle'}); await page.waitForTimeout(700);
  const dlg = page.getByRole('dialog');
  rec('overwrite.confirm-dialog', `열림=${await dlg.isVisible()} / 문구="${(await dlg.locator('p').first().textContent())?.trim()}"`, {note: '영향(어떤 필드가 바뀌는지)은 표시하지 않고 요청 인자만 나열'});
  rec('overwrite.dialog-has-diff', `대화상자 표/목록 수=${await dlg.locator('table, ul, li').count()}`);
  await ctx.close();
}

// ---- 5. undo/redo
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await open(ctx, '/studio?template=saas-landing');
  await page.getByRole('tab', {name: '디자인'}).click();
  const t0 = await theme(page);
  await pick(page, 'd-theme-select', 'aurora');
  const axisValue = await pickAny(page, 'd-axis-radius');
  rec('undo.axis-picked', `radius=${axisValue}`);
  rec('undo.button-state', JSON.stringify(await undoState(page)));
  await page.getByRole('button', {name: '실행 취소'}).click(); await page.waitForTimeout(500);
  const afterUndo1 = await stored(page);
  await page.getByRole('button', {name: '실행 취소'}).click(); await page.waitForTimeout(500);
  rec('undo.two-steps', `시작 theme=${t0} → 두 번 실행 취소 후 theme=${await theme(page)}, picked=${JSON.stringify((await stored(page)).picked)}`);
  await page.keyboard.press('Control+Shift+Z'); await page.waitForTimeout(500);
  rec('redo.keyboard', `theme=${await theme(page)}`);
  await page.keyboard.press('Control+Z'); await page.waitForTimeout(500);
  rec('undo.keyboard', `theme=${await theme(page)}`);
  // 되돌리기가 저장에 반영되는가
  rec('undo.persisted', `저장 doc.theme=${await theme(page)} (화면과 일치 여부는 위 값과 비교)`);
  // 새 편집이 redo 를 지우는가
  await pick(page, 'd-theme-select', 'workspace');
  rec('redo.cleared-by-new-edit', JSON.stringify(await undoState(page)));
  // 입력 칸 안 Ctrl+Z 는 브라우저 기본
  await page.getByRole('tab', {name: '구조·내용'}).click();
  const name = page.locator('input').filter({hasText: ''}).first();
  rec('undo.after-reload-lost', '새로고침 후 undo 기록은 reload.undo-stack 항목과 같다');
  await ctx.close();
}

// ---- 6. 저장·복구
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  let page = await open(ctx, '/studio?template=saas-landing');
  await page.getByRole('tab', {name: '디자인'}).click();
  await pick(page, 'd-theme-select', 'aurora');
  rec('save.status-text', (await page.locator('[role="status"]').first().textContent())?.trim());
  // 손상
  await page.evaluate(k => localStorage.setItem(k, '{broken'), KEY);
  await page.reload({waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  rec('recover.corrupt-json', `배너="${(await page.locator('#recovery-title').textContent().catch(() => null))}" / 원본 내보내기 버튼=${await page.getByRole('button', {name: '원본 JSON 내보내기'}).count()} / 저장값 유지=${await page.evaluate(k => localStorage.getItem(k), KEY)}`);
  await page.getByRole('button', {name: '저장값 초기화'}).click(); await page.waitForTimeout(400);
  rec('recover.reset', `저장값=${await page.evaluate(k => localStorage.getItem(k), KEY)} / 화면=${(await page.locator('h2').first().textContent())?.trim()}`);
  // 스키마 불일치
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({schema: 99, doc: {}})), KEY);
  await page.reload({waitUntil: 'networkidle'}); await page.waitForTimeout(600);
  rec('recover.schema-mismatch', (await page.locator('#recovery-title ~ p').first().textContent().catch(() => '배너 없음'))?.trim());
  await ctx.close();
}
// ---- 7. 두 탭 충돌
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const a = await open(ctx, '/studio?template=saas-landing');
  await a.getByRole('tab', {name: '디자인'}).click();
  await pick(a, 'd-theme-select', 'aurora'); // 사용자 편집(수정됨)
  const b = await open(ctx, '/studio');
  await b.getByRole('tab', {name: '디자인'}).click();
  await pick(b, 'd-theme-select', 'workspace');
  await a.bringToFront();
  await pickAny(a, 'd-axis-radius');
  await a.waitForTimeout(600);
  rec('save.two-tabs-conflict', `A 탭 배너=${await a.locator('#conflict-title').count() ? '다른 탭에서 저장한 작업이 있어 자동 저장을 멈췄습니다' : '없음'} / 저장된 theme=${await theme(a)}`);
  await ctx.close();
}
// ---- 8. 공유 불가 / 새 프로필
{
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await open(ctx, '/studio?template=saas-landing');
  await page.getByRole('tab', {name: '디자인'}).click();
  await pick(page, 'd-theme-select', 'aurora');
  const url = page.url();
  const other = await browser.newContext({viewport: {width: 1440, height: 900}});
  const p2 = await open(other, new URL(url).pathname + new URL(url).search);
  rec('share.url-in-other-browser', `주소 ${new URL(url).pathname + new URL(url).search} 를 새 브라우저에서 열면: ${(await p2.locator('h2').first().textContent())?.trim()}`);
  await ctx.close(); await other.close();
}
await browser.close();
