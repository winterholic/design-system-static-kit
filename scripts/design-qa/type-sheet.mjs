// 타이포그래피 프리셋 전수를 한 템플릿에 입혀 촬영한다. 사용: node scripts/design-qa/type-sheet.mjs <outDir> <template> <width> <cropH> [theme] [scale]
// 산출물은 outDir(.qa 아래)에 두고 contact-sheets.mjs로 대조표를 만든다.
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createBlueprint, repairAxes} from '../../src/catalog.mjs';
import {compile, validateBlueprint} from '../../src/compiler.mjs';
import {TYPE_IDS} from '../../src/typography.mjs';

const [outDir, template, width, cropH, theme, scale] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const br = await chromium.launch(), page = await br.newPage({viewport: {width: Number(width), height: 900}, reducedMotion: 'reduce'});
for (const id of TYPE_IDS) {
  const b = createBlueprint(template, theme && theme !== '-' ? theme : undefined);
  b.typography = id;
  if (scale) b.scale = scale;
  repairAxes(b);
  const check = validateBlueprint(b);
  if (!check.valid) { console.log('SKIP', id, check.errors[0]?.code); continue; }
  await page.setContent(compile(b).html, {waitUntil: 'load'});
  await page.screenshot({path: outDir + '/' + id + '-' + width + '.png', clip: {x: 0, y: 0, width: Number(width), height: Number(cropH)}});
}
await br.close();
console.log('done');
