// 서로 다른 테마 10개를 시드 고정 난수로 뽑아 (템플릿·팔레트·모드도 무작위) 390/1280px로 촬영한다.
// 같은 시드면 같은 표본이 나오므로 보고서에 시드를 적어 재현할 수 있다. 산출물은 .qa/<label>/ (gitignore).
// 사용: node scripts/design-qa/random10.mjs <label> [seed=20261020] [count=10]
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compile, validateBlueprint} from '../../src/compiler.mjs';
import {createBlueprint, themes, templateList} from '../../src/catalog.mjs';

const [label = 'rand', seedArg = '20261020', countArg = '10'] = process.argv.slice(2);
let a = Number(seedArg) >>> 0;
const rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = list => list[Math.floor(rand() * list.length)];
const shuffled = [...Object.keys(themes)].map(k => [rand(), k]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const out = resolve(import.meta.dirname, '../../.qa', label);
await mkdir(out, {recursive: true});
const br = await chromium.launch();
const rows = [];
for (const theme of shuffled.slice(0, Number(countArg))) {
  const tpl = pick(templateList).id, palette = pick(themes[theme].palettes), mode = pick(['light', 'dark']);
  const b = createBlueprint(tpl, theme);
  b.palette = palette;
  const dark = {...b, mode: 'dark'};
  const useDark = mode === 'dark' && validateBlueprint(dark).valid;
  if (useDark) b.mode = 'dark';
  const html = compile(b).html, name = `${theme}__${tpl}`;
  await writeFile(`${out}/${name}.html`, html);
  rows.push({theme, template: tpl, palette, mode: b.mode});
  for (const w of [390, 1280]) {
    const ctx = await br.newContext({viewport: {width: w, height: w === 390 ? 844 : 800}, reducedMotion: 'reduce'});
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(`${out}/${name}.html`).href, {waitUntil: 'load'});
    const h = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({path: `${out}/${name}-${w}.png`, fullPage: true, clip: {x: 0, y: 0, width: w, height: Math.min(h, 2400)}});
    if (sw > w) console.log('OVERFLOW-X', name, w, sw);
    await ctx.close();
  }
}
await br.close();
await writeFile(`${out}/picks.json`, JSON.stringify({seed: Number(seedArg), rows}, null, 1));
console.log(JSON.stringify(rows));
