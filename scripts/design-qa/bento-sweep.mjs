// 벤토를 가진 모든 템플릿 × 셸 10종 × 폭 4개에서 벤토 빈 비율(Q07)과 레이아웃·간격·글줄 프로브 지적을 잰다(2026-11-21 진단 C3 회귀 확인).
// 같은 스크립트를 수정 전 트리와 수정 후 트리에서 돌려 JSON 둘을 `--compare`로 대조한다.
// 사용: node scripts/design-qa/bento-sweep.mjs <out.json> [--widths 390,768,1440,1920]
//       node scripts/design-qa/bento-sweep.mjs --compare <before.json> <after.json>
import {chromium} from '@playwright/test';
import {writeFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createBlueprint, templateList, axes} from '../../src/catalog.mjs';
import {compile, validateBlueprint} from '../../src/compiler.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';
import {CLAIMS} from './quality-claims.mjs';

const args = process.argv.slice(2);
if (args[0] === '--compare') {
  const [before, after] = args.slice(1).map(f => JSON.parse(readFileSync(resolve(f), 'utf8')).pages);
  const worse = [], better = [], codes = {before: {}, after: {}};
  for (const key of Object.keys(after)) {
    const a = after[key], b = before[key]; if (!b) continue;
    for (const f of b.findings) codes.before[f] = (codes.before[f] ?? 0) + 1;
    for (const f of a.findings) codes.after[f] = (codes.after[f] ?? 0) + 1;
    const added = a.findings.filter(f => !b.findings.includes(f));
    if (added.length || (a.bento?.worstEmpty ?? 0) > (b.bento?.worstEmpty ?? 0) + 0.005) worse.push({key, added, worstEmpty: [b.bento?.worstEmpty, a.bento?.worstEmpty]});
    if ((a.bento?.worstEmpty ?? 0) < (b.bento?.worstEmpty ?? 0) - 0.005) better.push({key, worstEmpty: [b.bento?.worstEmpty, a.bento?.worstEmpty]});
  }
  console.log(JSON.stringify({pages: Object.keys(after).length, worse, betterCount: better.length, over60: {before: Object.values(before).filter(p => (p.bento?.worstEmpty ?? 0) > 0.6).length, after: Object.values(after).filter(p => (p.bento?.worstEmpty ?? 0) > 0.6).length}, findingCodes: codes}, null, 1));
  process.exit(0);
}
const out = args[0], widths = (args.includes('--widths') ? args[args.indexOf('--widths') + 1] : '390,768,1440,1920').split(',').map(Number);
const walk = (nodes, fn) => { for (const n of nodes ?? []) { fn(n); walk(n.children, fn); } };
const withBento = templateList.map(t => t.id).filter(id => { let has = false; walk(createBlueprint(id).tree.children, n => { if (n.type === 'bento') has = true; }); return has; });
const q07 = CLAIMS.find(c => c.id === 'Q07').fn;
const br = await chromium.launch(), pages = {};
for (const id of withBento) for (const shell of axes.shell) {
  const b = createBlueprint(id); b.shell = shell;
  if (!validateBlueprint(b).valid) continue;
  const html = compile(b).html;
  for (const w of widths) {
    const page = await (await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'})).newPage();
    await page.setContent(html, {waitUntil: 'load'});
    const found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings];
    pages[`${id}|${shell}|${w}`] = {bento: await page.evaluate(q07), findings: found.filter(f => !(f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at))).map(f => `${f.code} ${f.at}`)};
    await page.context().close();
  }
}
await br.close();
writeFileSync(resolve(out), JSON.stringify({templates: withBento, widths, pages}, null, 0));
console.log(`${withBento.join(', ')}: ${Object.keys(pages).length} pages → ${out}`);
