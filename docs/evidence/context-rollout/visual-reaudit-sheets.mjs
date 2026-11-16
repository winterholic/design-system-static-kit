// Builds reading sheets: each tall full-page capture is cut into columns so one image fits a single review view.
// node docs/evidence/context-rollout/visual-reaudit-sheets.mjs
import {chromium} from 'playwright';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const dir = resolve(import.meta.dirname, 'visual-reaudit');
const receipt = JSON.parse(await readFile(resolve(dir, 'receipt.json'), 'utf8'));
const cfg = {1440: {scale: 0.6, colH: 1500, gap: 12}, 390: {scale: 0.8, colH: 1500, gap: 12}};
await mkdir(resolve(dir, 'sheets'), {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({deviceScaleFactor: 1});
for (const v of receipt.views) {
  const {scale, colH, gap} = cfg[v.width];
  const w = Math.round(v.width * scale), colOrig = colH / scale, cols = Math.ceil(v.height / colOrig);
  const cells = Array.from({length: cols}, (_, i) => `<div style="position:relative;width:${w}px;height:${Math.min(colH, Math.round((v.height - i * colOrig) * scale))}px;overflow:hidden;flex:none;outline:1px solid #f0f;"><img src="file://${resolve(dir, v.file)}" style="position:absolute;left:0;top:${-Math.round(i * colH)}px;width:${w}px;max-width:none"></div>`).join('');
  const label = `${v.name} @${v.width} (h=${v.height}, ${cols} col)`;
  await page.setViewportSize({width: cols * (w + gap) + 20, height: colH + 40});
  // about:blank cannot load file:// images, so the sheet is written next to them and opened by URL.
  await writeFile(resolve(dir, 'sheets', '_tmp.html'), `<body style="margin:0;background:#888"><div style="font:600 13px monospace;color:#fff;padding:4px 8px">${label}</div><div style="display:flex;gap:${gap}px;padding:0 10px;align-items:flex-start">${cells}</div>`);
  await page.goto('file://' + resolve(dir, 'sheets', '_tmp.html'));
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  await page.screenshot({path: resolve(dir, 'sheets', `${v.width}-${v.name}.png`), fullPage: true});
}
await browser.close();
console.log('sheets', receipt.views.length);
