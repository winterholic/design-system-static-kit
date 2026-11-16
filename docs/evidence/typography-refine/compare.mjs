// Before/after composites and the numeric table. node compare.mjs   (reads before/ and after/, writes compare/ and compare-table.md)
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';
const SAMPLES = ['saas-landing', 'admin-table', 'inbox', 'dashboard-overview', 'product-detail', 'blog-post', 'article', 'contact', 'survey', 'app-landing', 'luxury-brand', 'news-home'];
const dir = new URL('.', import.meta.url).pathname; mkdirSync(dir + 'compare', {recursive: true});
const b = await chromium.launch(), page = await b.newPage();
const uri = p => 'data:image/png;base64,' + readFileSync(p).toString('base64');
for (const id of SAMPLES) for (const w of [1440, 390]) {
  const sc = w > 600 ? 1 : 2, shown = w > 600 ? 700 : 390; // 1440 shown at ~half, 390 at its CSS width
  await page.setViewportSize({width: shown * 2 + 60, height: 800});
  await page.setContent(`<body style="margin:0;background:#fff;font:600 15px system-ui"><div style="display:flex;gap:20px;padding:10px"><figure style="margin:0"><figcaption style="padding:4px 0;color:#b00">before (2.2.0)</figcaption><img style="width:${shown}px;display:block;border:1px solid #ccc" src="${uri(dir + `before/shots/${id}-${w}.png`)}"></figure><figure style="margin:0"><figcaption style="padding:4px 0;color:#070">after (2.3.0)</figcaption><img style="width:${shown}px;display:block;border:1px solid #ccc" src="${uri(dir + `after/shots/${id}-${w}.png`)}"></figure></div>`);
  await page.waitForTimeout(100);
  await page.screenshot({path: dir + `compare/${id}-${w}.png`, fullPage: true});
}
await b.close();
const B = JSON.parse(readFileSync(dir + 'before/examples.json')), A = JSON.parse(readFileSync(dir + 'after/examples.json'));
const face = f => (f ?? []).map(x => x.face.replace(/_wdth.*/, '')).join('+');
const row = (r, k) => r?.[k] ? `${r[k].fontSize.toFixed(0)}px/${r[k].weight} ls${r[k].letterSpacingEm} lh${r[k].lineHeight} ${r[k].lines}줄` : '-';
let md = '| 예시 | 프리셋 | 폭 | 제목 전 | 제목 후 | 본문 전 | 본문 후 | 제목 한글 face 전→후 | 제목 라틴 face 전→후 |\n|---|---|---|---|---|---|---|---|---|\n';
for (const id of SAMPLES) for (const w of [1440, 390]) {
  const x = B.find(r => r.id === id && r.width === w), y = A.find(r => r.id === id && r.width === w);
  const ko = r => face(r.faces.title?.hangul), la = r => face(r.faces.title?.latin);
  md += `| ${id} | ${x.typography} | ${w} | ${row(x, 'title')} | ${row(y, 'title')} | ${row(x, 'body')} | ${row(y, 'body')} | ${ko(x)}${ko(x) === ko(y) ? '' : ' → ' + ko(y)} | ${la(x)}${la(x) === la(y) ? '' : ' → ' + la(y)} |\n`;
}
writeFileSync(dir + 'compare-table.md', md);
console.log('written', SAMPLES.length * 2, 'composites');
