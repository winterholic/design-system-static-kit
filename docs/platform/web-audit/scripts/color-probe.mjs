// 색 토큰(compile 결과 tokens) 해시로 본다: (A) 2.6.0 문서에서 테마를 바꾸면 palette 필드와 실제 색이 같이 바뀌는가, (B) 구 문서에서 palette=pearl 로 바꾼 뒤 역할 타이포를 고르면 색이 어떻게 되는가.
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const sha = s => createHash('sha256').update(JSON.stringify(s) ?? '').digest('hex').slice(0, 10);
const browser = await chromium.launch();
async function tokensOf(doc) {
  const r = await fetch(BASE + '/api/v1/compile', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({blueprint: doc, include: ['tokens']})});
  const j = await r.json(); return j.ok ? j.value.tokens : null;
}
async function run(label, url, steps) {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  await page.goto(BASE + url, {waitUntil: 'networkidle'}); await page.waitForSelector('[data-testid="preview-frame"]'); await page.waitForTimeout(700);
  const read = async () => { await page.waitForTimeout(800); return page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.studio.v1')).doc); };
  const show = async (tag, d) => console.log(label.padEnd(26), tag.padEnd(26), `theme=${d.theme} palette=${d.palette} v=${d.catalogVersion} colorPalette=${d.colorPalette ?? '-'}`, '색 토큰 해시=' + sha(await tokensOf(d)));
  await show('시작', await read());
  for (const [id, value] of steps) { await page.locator('#' + id).click(); await page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`).click(); await show(`${id}=${value}`, await read()); }
  await page.close();
}
await run('A: 2.6.0 테마 변경', '/studio?template=saas-landing&catalogVersion=2.6.0&tab=design', [['d-theme-select', 'aurora'], ['d-theme-select', 'neon']]);
await run('B: 구 문서 palette→타이포', '/studio?template=saas-landing&tab=design', [['d-palette', 'pearl'], ['material-type-roles', 'erp']]);
await run('C: 구 문서 테마 변경', '/studio?template=saas-landing&tab=design', [['d-theme-select', 'aurora']]);
await browser.close();
