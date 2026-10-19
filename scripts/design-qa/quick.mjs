// 빌드 없이 템플릿을 바로 컴파일해 촬영한다(반복 개선용). 산출물은 .qa/<label>/ (gitignore).
// 사용: node scripts/design-qa/quick.mjs <label> <id|id@theme|id@theme@dark> ... [--maxh 3000] [--w 390,1280]
//  id@theme       : 템플릿을 다른 테마(첫 팔레트)로 입힌다
//  id@theme@dark  : 모드까지 지정
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compile} from '../../src/compiler.mjs';
import {createBlueprint} from '../../src/catalog.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args.splice(i, 2)[1] : d; };
const maxH = Number(opt('--maxh', 3000)), widths = String(opt('--w', '390,1280')).split(',').map(Number);
const [label, ...specs] = args;
const out = resolve(import.meta.dirname, '../../.qa', label);
await mkdir(out, {recursive: true});
const br = await chromium.launch();
for (const spec of specs) {
  const [id, theme, mode] = spec.split('@');
  const b = theme ? createBlueprint(id, theme) : createBlueprint(id);
  if (mode) b.mode = mode;
  const html = compile(b).html;
  const name = spec.replaceAll('@', '_');
  const file = resolve(out, `${name}.html`);
  await writeFile(file, html);
  for (const w of widths) {
    const ctx = await br.newContext({viewport: {width: w, height: w <= 480 ? 844 : 800}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href, {waitUntil: 'load'});
    await p.waitForTimeout(80);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({path: `${out}/${name}-${w}.png`, fullPage: true, clip: {x: 0, y: 0, width: w, height: Math.min(h, maxH)}});
    console.log(name, w, `h=${h}`, sw > w ? `OVERFLOW-X ${sw}` : '');
    await ctx.close();
  }
}
await br.close();
