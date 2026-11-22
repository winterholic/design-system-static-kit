// 재현 증거 스크린샷: 같은 컨트롤을 바꾸기 전/후 미리보기를 찍고 PNG 바이트 해시를 비교한다.
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const OUT = new URL('../before/', import.meta.url).pathname;
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10);
const browser = await chromium.launch();

async function scenario(name, url, steps) {
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  await page.goto(BASE + url, {waitUntil: 'networkidle'});
  await page.waitForSelector('[data-testid="preview-frame"]'); await page.waitForTimeout(800);
  const shot = async tag => { const f = `${OUT}repro-${name}-${tag}.d1440.png`; await page.locator('[data-testid="preview-frame"]').screenshot({path: f}); return f; };
  const a = await shot('before');
  for (const s of steps) { await page.locator('#' + s[0]).click(); await page.getByRole('listbox').locator(`[role="option"][data-value="${s[1]}"]`).click(); await page.waitForTimeout(900); }
  const b = await shot('after');
  const doc = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('winterholic-static-kit.studio.v1')).doc; return {theme: d.theme, palette: d.palette, colorPalette: d.colorPalette, typeRoles: d.typeRoles, profile: d.profile}; });
  console.log(name.padEnd(22), JSON.stringify(doc), 'PNG 해시 before/after =', sha(a), sha(b), sha(a) === sha(b) ? '동일(화면 그대로)' : '다름(화면 바뀜)');
  await page.close();
}
await scenario('profile-260', '/studio?template=saas-landing&catalogVersion=2.6.0&tab=design', [['material-profile', 'saas-landing']]);
await scenario('palette-legacy', '/studio?template=saas-landing&tab=design', [['d-palette', 'pearl']]);
await browser.close();
