// 폴더의 PNG를 한 장에 모은 대조표로 만든다. 사용: node scripts/design-qa/contact-sheets.mjs <dir> <suffix> <cols> <perSheet> <cellW> <cropH> <outPrefix>
// 예: contact-sheets.mjs .qa/r6/def1440 -1440.png 4 8 420 900 .qa/r6/sheet1440
import {chromium} from '@playwright/test';
import {readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [dir, suffix, cols, per, cellW, cropH, outPrefix] = process.argv.slice(2);
const files = readdirSync(dir).filter(f => f.endsWith(suffix)).sort();
const br = await chromium.launch();
const page = await br.newPage({viewport: {width: (Number(cellW) + 16) * Number(cols) + 16, height: 800}});
let sheet = 0;
for (let i = 0; i < files.length; i += Number(per)) {
  const slice = files.slice(i, i + Number(per));
  const cells = slice.map(f => '<figure><figcaption>' + f.replace(suffix, '') + '</figcaption><div class="c"><img src="' + pathToFileURL(resolve(dir, f)).href + '"></div></figure>').join('');
  const html = '<body style="margin:0;background:#d4d4d8;font:600 12px system-ui;color:#111"><div style="display:grid;grid-template-columns:repeat(' + cols + ',' + cellW + 'px);gap:16px;padding:16px">' + cells + '</div><style>figure{margin:0}figcaption{margin-bottom:4px}.c{height:' + cropH + 'px;overflow:hidden;background:#fff;box-shadow:0 1px 6px #0004}img{width:' + cellW + 'px;display:block}</style></body>';
  const tmp = resolve(dir, '_sheet.html');
  writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, {waitUntil: 'load'});
  await page.screenshot({path: outPrefix + '-' + String(++sheet).padStart(2, '0') + '.png', fullPage: true});
}
await br.close();
console.log('sheets', sheet, 'files', files.length);
