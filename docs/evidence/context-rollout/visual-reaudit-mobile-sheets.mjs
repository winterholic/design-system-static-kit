// Packs several 390px full-page captures side by side (labelled) so a reviewer can read them in few views.
// node docs/evidence/context-rollout/visual-reaudit-mobile-sheets.mjs
import {chromium} from 'playwright';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const dir = resolve(import.meta.dirname, 'visual-reaudit');
const receipt = JSON.parse(await readFile(resolve(dir, 'receipt.json'), 'utf8'));
const plan = JSON.parse(await readFile(resolve(dir, 'mobile-plan.json'), 'utf8'));
const byName = Object.fromEntries(receipt.views.filter(v => v.width === 390).map(v => [v.name, v]));
const scale = 0.7, colH = 1700, gap = 10, w = Math.round(390 * scale), per = colH / scale;
await mkdir(resolve(dir, 'sheets-mobile'), {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [i, names] of plan.entries()) {
  let totalCols = 0;
  const groups = names.map(name => {
    const v = byName[name], cols = Math.ceil(v.height / per);
    totalCols += cols;
    const cells = Array.from({length: cols}, (_, k) => `<div style="position:relative;width:${w}px;height:${Math.min(colH, Math.round((v.height - k * per) * scale))}px;overflow:hidden;flex:none;outline:1px solid #f0f"><img src="file://${resolve(dir, v.file)}" style="position:absolute;left:0;top:${-Math.round(k * colH)}px;width:${w}px;max-width:none"></div>`).join('');
    return `<div><div style="font:600 12px monospace;color:#fff;padding:2px 0">${name} (h=${v.height})</div><div style="display:flex;gap:4px;align-items:flex-start">${cells}</div></div>`;
  }).join('');
  await writeFile(resolve(dir, 'sheets-mobile', '_tmp.html'), `<body style="margin:0;background:#888"><div style="display:flex;gap:${gap + 8}px;padding:6px;align-items:flex-start">${groups}</div>`);
  await page.setViewportSize({width: totalCols * (w + 4) + names.length * (gap + 8) + 20, height: colH + 40});
  await page.goto('file://' + resolve(dir, 'sheets-mobile', '_tmp.html'));
  await page.waitForFunction(() => [...document.images].every(im => im.complete));
  await page.screenshot({path: resolve(dir, 'sheets-mobile', `m${String(i + 1).padStart(2, '0')}.png`), fullPage: true});
}
await browser.close();
console.log('mobile sheets', plan.length);
