// Studio 반영 실험: 컨트롤을 바꿀 때마다 (1) 저장된 문서 필드, (2) 미리보기 iframe srcdoc의 해시와 길이, (3) srcdoc 안의 주요 색 변수를 기록한다.
// 사용: BASE=http://127.0.0.1:4421 node studio-probe.mjs > probe.json
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 10);
const browser = await chromium.launch();

async function snap(page, label) {
  await page.waitForTimeout(700); // 편집 → 60ms 디바운스 컴파일 → 250ms 저장
  const html = await page.locator('[data-testid="preview-frame"]').getAttribute('srcdoc');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.studio.v1') ?? 'null'));
  const d = saved?.doc ?? {};
  const vars = {};
  for (const name of ['--color-primary', '--color-accent', '--color-bg', '--color-surface', '--primary', '--accent', '--bg']) {
    const m = new RegExp(name.replace(/[-]/g, '\\-') + ':\\s*([^;]+);').exec(html ?? '');
    if (m) vars[name] = m[1].trim();
  }
  return {label, doc: {theme: d.theme, palette: d.palette, mode: d.mode, catalogVersion: d.catalogVersion, colorPalette: d.colorPalette, typeRoles: d.typeRoles, profile: d.profile}, htmlHash: sha(html ?? ''), htmlLen: (html ?? '').length, vars};
}
async function pick(page, id, value) {
  const trigger = page.locator('#' + id);
  await trigger.click();
  const opt = page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`);
  if (!(await opt.count())) { await page.keyboard.press('Escape'); return {skipped: 'no option ' + value}; }
  if ((await opt.getAttribute('aria-disabled')) === 'true') { await page.keyboard.press('Escape'); return {skipped: 'disabled ' + value}; }
  await opt.click();
  return {ok: true};
}
async function options(page, id) {
  await page.locator('#' + id).click();
  const o = await page.getByRole('listbox').getByRole('option').evaluateAll(ns => ns.map(n => ({v: n.dataset.value, dis: n.getAttribute('aria-disabled') === 'true'})));
  await page.keyboard.press('Escape');
  return o;
}

const out = {};
for (const [name, url] of [['legacy', '/studio?template=saas-landing&tab=design'], ['v260', '/studio?template=saas-landing&catalogVersion=2.6.0&tab=design']]) {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  await page.goto(BASE + url, {waitUntil: 'networkidle'});
  await page.waitForSelector('[data-testid="preview-frame"]');
  const steps = [await snap(page, 'start')];
  const opts = {};
  for (const id of ['d-theme-select', 'd-palette', 'material-color', 'material-type-roles', 'material-profile']) {
    if (await page.locator('#' + id).count()) opts[id] = await options(page, id);
  }
  out[name] = {options: opts, steps};
  const plan = name === 'legacy'
    ? [['d-palette', 'pearl'], ['d-palette', 'serene-blue'], ['material-type-roles', 'marketing'], ['material-color', 'static-kit'], ['material-profile', null], ['d-theme-select', 'aurora']]
    : [['material-type-roles', 'marketing'], ['material-type-roles', 'erp'], ['material-profile', null], ['d-theme-select', 'aurora'], ['material-color', 'static-kit']];
  for (let [id, value] of plan) {
    if (value === null) { const list = (opts[id] ?? []).filter(o => o.v && !o.dis); value = list[0]?.v; if (!value) { steps.push({label: `${id}: 선택 가능한 값 없음`}); continue; } }
    const r = await pick(page, id, value);
    steps.push({action: `${id}=${value}`, result: r, ...(await snap(page, `${id}=${value}`))});
  }
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
