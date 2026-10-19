// 촬영본(.qa/<label>/<id>-<w>.png) 여러 장을 한 장에 모은 대조표를 만든다. 산출물은 .qa/ 또는 지정 폴더.
// 사용: node scripts/design-qa/sheet.mjs <out.png> <width:390|1280> <cell px> <crop px> <label>:<id> ...
import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';

const [out, w, cell, crop, ...items] = process.argv.slice(2);
const qa = resolve(import.meta.dirname, '../../.qa');
const cells = items.map(it => { const [label, id, cap] = it.split(':'); return `<figure><figcaption>${cap ?? `${label} · ${id}`}</figcaption><div style="height:${crop}px;width:${cell}px;overflow:hidden;box-shadow:0 1px 6px #0003"><img src="${pathToFileURL(resolve(qa, label, `${id}-${w}.png`))}" style="width:${cell}px;display:block"></div></figure>`; });
const html = `<body style="margin:0;background:#e5e7eb;font:600 13px system-ui;color:#111"><div style="display:flex;flex-wrap:wrap;gap:14px;padding:14px;width:max-content;max-width:${(Number(cell) + 14) * 4 + 14}px">${cells.join('')}</div><style>figure{margin:0}figcaption{padding:0 0 5px}</style></body>`;
const tmp = resolve(qa, '_sheet.html');
await writeFile(tmp, html);
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1700, height: 900}});
await p.goto(pathToFileURL(tmp).href, {waitUntil: 'load'});
await p.screenshot({path: out, fullPage: true});
await b.close();
console.log('SHEET', out, items.length);
