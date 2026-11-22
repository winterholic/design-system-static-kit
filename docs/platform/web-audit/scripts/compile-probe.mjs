// Core 단계 분리 실험: 같은 문서에서 필드 하나씩만 바꿔 /api/v1/compile 결과의 html·css 해시를 비교한다.
// 사용: BASE=http://127.0.0.1:4421 node compile-probe.mjs
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const sha = s => createHash('sha256').update(s ?? '').digest('hex').slice(0, 10);

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(BASE + '/studio?template=saas-landing&catalogVersion=2.6.0&tab=design', {waitUntil: 'networkidle'});
await page.waitForSelector('[data-testid="preview-frame"]');
await page.waitForTimeout(600);
const base = await page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.studio.v1')).doc);
await browser.close();

async function compile(doc) {
  const r = await fetch(BASE + '/api/v1/compile', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({blueprint: doc, include: ['html', 'css', 'tokens']})});
  const j = await r.json();
  if (!j.ok) return {status: r.status, error: j.errors?.[0]?.code + ' ' + j.errors?.[0]?.message};
  return {html: sha(j.value.html), css: sha(j.value.css), tokens: sha(JSON.stringify(j.value.tokens)), htmlLen: j.value.html.length};
}
const cases = [
  ['기준(2.6.0 trust)', {}],
  ['profile=saas-landing', {profile: 'saas-landing'}],
  ['profile=saas-landing + typeRoles=erp', {profile: 'saas-landing', typeRoles: 'erp'}],
  ['typeRoles=erp', {typeRoles: 'erp'}],
  ['typeRoles=marketing', {typeRoles: 'marketing'}],
  ['palette=pearl (colorPalette=static-kit 유지)', {palette: 'pearl'}],
  ['palette=ocean (colorPalette=static-kit 유지)', {palette: 'ocean'}],
  ['theme=aurora', {theme: 'aurora'}],
  ['mode=dark', {mode: 'dark'}],
];
console.log('base doc keys:', Object.keys(base).join(','));
for (const [label, patch] of cases) console.log(label.padEnd(48), JSON.stringify(await compile({...base, ...patch})));
