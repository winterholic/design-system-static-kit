// 전후 비교 스크린샷: 6차 이전 코드(git worktree)와 현재 코드로 같은 조합을 그려 좌우로 붙인다.
// 사용: node scripts/design-qa/before-after.mjs <baseWorktreeDir> <outDir>
// 이전 코드에 있던 조합이 지금은 만들어지지 않으면(적용 조건을 좁힌 것) 오른쪽에 같은 템플릿의 기본 구성을 보이고 그렇게 표시한다.
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [baseDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const before = await import(pathToFileURL(resolve(baseDir, 'src/combos.mjs')).href);
const after = await import(pathToFileURL(resolve(import.meta.dirname, '../../src/combos.mjs')).href);

const CASES = [
  {name: '01-좁은-칸의-큰-인용문(벤토)', id: 'product-landing', theme: 'paper', sel: '.kit-bento-cell:has(.kit-quote)', w: 1440, note: '인용문 26px이 150px 칸에 3줄로 박힘 → 칸 폭에 따라 18~26px, 벤토는 1180px 미만에서 2열'},
  {name: '02-텅-빈-큰-칸(벤토)', id: 'devtool-landing', theme: null, sel: '.kit-bento', w: 1440, note: '글만 있는 첫 칸이 2×2로 커져 위가 420px 비어 있음 → 시각 요소가 있는 칸만 2×2'},
  {name: '03-섞인-벤토를-균등-격자로', id: 'saas-landing~features:grid', theme: null, sel: '.kit-section:has(.kit-bento, .kit-grid)', w: 1440, note: '지표·인용·진행률이 같은 높이로 늘어나 칸 아래가 270px 비어 있음 → 같은 종류의 카드만 격자로 바꿀 수 있음'},
  {name: '04-마지막-줄에-한-칸(2열에-3개)', id: 'campaign-donate~columns:two', theme: null, sel: '.kit-grid >> nth=1', w: 1440, note: '지표 3개가 2열 격자에서 마지막 줄에 한 칸만 남음 → 항목 수와 맞지 않는 열 수는 고를 수 없음'},
  {name: '05-일정-목록의-안쪽-여백', id: 'calendar-view', theme: null, sel: '.kit-cal-agenda', w: 1440, note: '글자와 가장자리가 3px → 12px'},
  {name: '07-가운데-정렬-머리말이-앱-화면에', id: 'audit-log~intro:center', theme: null, sel: 'main', w: 1440, note: '제목만 가운데 서고 본문은 왼쪽(정렬선 둘) + 지표 3개가 2열 → 앱·문서·데이터 화면에서는 이 구성을 만들지 않음', maxH: 900},
];

const br = await chromium.launch();
async function shot(mod, c, suffix) {
  const combo = mod.findCombo(c.id) ?? mod.findCombo(c.id.split('~')[0]);
  const exact = !!mod.findCombo(c.id);
  const r = mod.renderCombo(combo, c.theme ? {theme: c.theme} : undefined);
  const ctx = await br.newContext({viewport: {width: c.w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
  await page.setContent(r.html, {waitUntil: 'load'});
  await page.addStyleTag({content: '.kit-header{position:static!important}'});
  const file = resolve(outDir, c.name + '-' + suffix + '.png');
  const loc = page.locator(c.sel).first();
  try { await loc.screenshot({path: file}); } catch { await page.screenshot({path: file, fullPage: true}); }
  await ctx.close();
  return {file, exact};
}
const rows = [];
for (const c of CASES) {
  const b = await shot(before, c, 'before'), a = await shot(after, c, 'after');
  rows.push({c, b, a});
}
const html = '<body style="margin:0;background:#e5e7eb;font:14px system-ui;color:#111">' + rows.map(({c, b, a}) =>
  '<section style="padding:20px 24px;border-bottom:1px solid #bbb"><h2 style="margin:0 0 4px;font-size:18px">' + c.name.replace(/-/g, ' ') + '</h2><p style="margin:0 0 12px;color:#444">' + c.note + '</p>'
  + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start"><figure style="margin:0"><figcaption style="font-weight:700;margin-bottom:6px;color:#b91c1c">6차 이전</figcaption><div style="max-height:' + (c.maxH ?? 700) + 'px;overflow:hidden;background:#fff;box-shadow:0 1px 6px #0004"><img src="' + pathToFileURL(b.file).href + '" style="width:100%;display:block"></div></figure>'
  + '<figure style="margin:0"><figcaption style="font-weight:700;margin-bottom:6px;color:#15803d">6차 이후' + (a.exact ? '' : ' (이 구성은 더 이상 만들어지지 않아 같은 템플릿의 기본 구성)') + '</figcaption><div style="max-height:' + (c.maxH ?? 700) + 'px;overflow:hidden;background:#fff;box-shadow:0 1px 6px #0004"><img src="' + pathToFileURL(a.file).href + '" style="width:100%;display:block"></div></figure></div></section>').join('') + '</body>';
const tmp = resolve(outDir, '_sheet.html');
writeFileSync(tmp, html);
const page = await br.newPage({viewport: {width: 1700, height: 900}});
await page.goto(pathToFileURL(tmp).href, {waitUntil: 'load'});
await page.screenshot({path: resolve(outDir, 'before-after-all.png'), fullPage: true});
await br.close();
console.log('done', rows.length, 'cases', rows.filter(r => !r.a.exact).length, 'replaced by default');
