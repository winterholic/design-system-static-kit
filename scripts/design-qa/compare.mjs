// 전/후 나란히 비교 이미지를 만든다. 입력: .qa/<before>/<id>-<w>.png 와 .qa/<after>/<id>-<w>.png
// 사용: node scripts/design-qa/compare.mjs <beforeLabel> <afterLabel> <outDir>
import {chromium} from '@playwright/test';
import {mkdir, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [beforeLabel, afterLabel, outDir] = process.argv.slice(2);
const qa = resolve(import.meta.dirname, '../../.qa');
await mkdir(outDir, {recursive: true});
const files = (await readdir(resolve(qa, beforeLabel))).filter(f => f.endsWith('.png'));
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1400, height: 900}});
for (const f of files) {
  const w = Number(f.match(/-(\d+)\.png$/)[1]);
  const shown = w === 390 ? 390 : 640;
  const html = `<body style="margin:0;background:#e5e7eb;font:600 15px system-ui;color:#111"><div style="display:flex;gap:24px;padding:20px;align-items:flex-start;width:max-content">
    ${[['Before (이전)', beforeLabel], ['After (이후)', afterLabel]].map(([t, l]) => `<figure style="margin:0"><figcaption style="padding:0 0 8px">${t} · ${f.replace('.png', '')}</figcaption><img src="${pathToFileURL(resolve(qa, l, f))}" style="width:${shown}px;display:block;box-shadow:0 2px 10px #0003"></figure>`).join('')}</div></body>`;
  const tmp = resolve(qa, '_cmp.html');
  await writeFile(tmp, html);
  await page.goto(pathToFileURL(tmp).href, {waitUntil: 'load'});
  await page.screenshot({path: resolve(outDir, f.replace('.png', '-compare.png')), fullPage: true});
}
await browser.close();
console.log(`COMPARE: ${files.length} images → ${outDir}`);
