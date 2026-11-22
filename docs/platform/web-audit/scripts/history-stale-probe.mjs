// 뒤로 가기가 미리보기 iframe 만 과거 내용으로 되돌리는가: 저장 문서(localStorage)의 theme 과, iframe 안에 실제로 그려진 html data-theme 이외의 지문(문서 해시)을 비교한다.
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 10);
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
await page.goto(BASE + '/studio?template=saas-landing&tab=design', {waitUntil: 'networkidle'}); await page.waitForTimeout(800);
const pickAny = async id => { await page.locator('#' + id).click(); await page.getByRole('listbox').locator('[role="option"]:not([aria-disabled="true"]):not([aria-selected="true"])').first().click(); await page.waitForTimeout(900); };
const state = async label => {
  const attr = await page.locator('[data-testid="preview-frame"]').getAttribute('srcdoc');
  const frame = page.frames().find(f => f !== page.mainFrame());
  const live = frame ? await frame.content() : '';
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.studio.v1')).doc);
  console.log(label.padEnd(30), `문서 theme=${saved.theme} radius=${saved.radius}`, `| srcdoc 속성 해시=${sha(attr)}`, `| iframe 실제 DOM 길이=${live.length}`, `| 속성 길이=${attr.length}`, `| url=${new URL(page.url()).search}`);
};
await state('시작');
await pickAny('d-theme-select'); await state('테마 변경');
await pickAny('d-axis-radius'); await state('반경 변경');
await page.evaluate(() => history.back()); await page.waitForTimeout(1200); await state('뒤로 1회');
await page.evaluate(() => history.back()); await page.waitForTimeout(1200); await state('뒤로 2회');
await browser.close();
