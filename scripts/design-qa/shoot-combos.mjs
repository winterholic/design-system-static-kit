// 조합 id 목록을 폭별로 촬영한다. 사용: node scripts/design-qa/shoot-combos.mjs <outDir> <widths,comma> <maxh> <id> [id...]
// id가 `@all-defaults`이면 템플릿 85개의 기본 구성. 산출물은 .qa/ 아래에 둔다(커밋하지 않음).
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {enumerateCombos, findCombo, renderCombo} from '../../src/combos.mjs';

const [outDir, widths, maxh, ...ids0] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
import {readFileSync} from 'node:fs';
const ids = ids0.flatMap(i => i.startsWith('@file:') ? readFileSync(i.slice(6), 'utf8').trim().split(/\s+/) : i === '@all-defaults' ? enumerateCombos().filter(c => !c.changed).map(c => c.id) : [i]);
const br = await chromium.launch();
for (const w of widths.split(',').map(Number)) {
  const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
  for (const id of ids) {
    const [cid, theme] = id.split('@');
    const r = renderCombo(findCombo(cid), theme ? {theme} : undefined);
    if (!r.ok) { console.log('FAIL', id, r.error); continue; }
    await page.setContent(r.html, {waitUntil: 'load'});
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const file = outDir + '/' + id.replace(/@/g, '_at_').replace(/[:~]/g, '_') + '-' + w + '.png';
    await page.screenshot({path: file, fullPage: true, clip: {x: 0, y: 0, width: w, height: Math.min(h, Number(maxh))}});
  }
  await ctx.close();
}
await br.close();
console.log('done', ids.length, 'ids');
