// 뒤로 가기에서 같은 주소가 겹치는 원인 좁히기: 동작마다 history.length 와 주소를 기록한다.
import {chromium} from '@playwright/test';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
const log = async label => console.log(label.padEnd(34), 'length=' + await page.evaluate(() => history.length), new URL(page.url()).pathname + new URL(page.url()).search);
await page.goto(BASE + '/', {waitUntil: 'networkidle'}); await log('홈');
await page.goto(BASE + '/studio?template=saas-landing&tab=design', {waitUntil: 'networkidle'}); await page.waitForTimeout(800); await log('Studio 디자인 탭 직접 진입');
const pickAny = async id => { await page.locator('#' + id).click(); await page.getByRole('listbox').locator('[role="option"]:not([aria-disabled="true"]):not([aria-selected="true"])').first().click(); await page.waitForTimeout(800); };
await pickAny('d-theme-select'); await log('테마 변경(문서 편집 1)');
await pickAny('d-axis-radius'); await log('반경 축 변경(문서 편집 2)');
await page.getByRole('button', {name: '다크로 보기'}).click(); await page.waitForTimeout(800); await log('미리보기 다크로 보기(뷰 상태)');
await page.getByRole('button', {name: '실행 취소'}).click(); await page.waitForTimeout(800); await log('실행 취소');
await page.getByRole('tab', {name: '검증'}).click(); await page.waitForTimeout(500); await log('검증 탭(push)');
await browser.close();
