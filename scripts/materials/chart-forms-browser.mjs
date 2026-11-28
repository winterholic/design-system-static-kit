/**
 * §9.1 차트 29유형의 Chromium 렌더 검사(TASK-TRE-02 독립 검증).
 *   PLAYWRIGHT_BROWSERS_PATH=... node scripts/materials/chart-forms-browser.mjs [--shots docs/dev/catalog-platform-upgrade/screens/charts] [--json out.json]
 * 유형마다 대표 프리셋(재료 목록의 첫 번째) 하나만 그린다. 모든 조합을 이미지로 만들지 않는다.
 * 390px·1280px에서 문서 가로 스크롤, figure 밖으로 나가는 요소, 크기 0인 SVG를 세고,
 * 유형별 figure 스크린샷의 바이트 해시가 서로 다른지(육안 구분의 기계적 하한) 확인한다.
 */
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {renderChartEvidence} from './chart-presets-evidence.mjs';
import {chartPresetMaterials} from '../../src/materials/chart-presets.mjs';
import {renderChartPreset} from '../../src/render/chart-presets.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const shotDir = arg('--shots'), jsonOut = arg('--json');
const WIDTHS = [390, 1280];

const representatives = [...new Map(chartPresetMaterials.map(m => [m.ext.chartKind, m])).values()];
const head = renderChartEvidence().match(/<head>[\s\S]*<\/head>/)[0];
const page = `<!doctype html><html lang="ko">${head}<body><main>${representatives.map(m => `<section data-preset="${m.id}" data-kind="${m.ext.chartKind}">${renderChartPreset(m.id)}</section>`).join('\n')}</main></body></html>`;

/** 브라우저 안에서 도는 함수: 외부 이름을 쓰지 않는다. */
function measure() {
  const vw = document.documentElement.clientWidth;
  const out = {docOverflow: document.documentElement.scrollWidth - vw, sections: {}};
  for (const sec of document.querySelectorAll('section[data-preset]')) {
    const fig = sec.querySelector('figure.kit-chart'), fr = fig.getBoundingClientRect(), svg = fig.querySelector('svg'), sr = svg.getBoundingClientRect();
    const scroller = svg.closest('[tabindex],[class*=scroll]');
    let spill = 0;
    for (const el of fig.querySelectorAll('svg, svg *, table, details')) {
      if (el.closest('details:not([open])') && el.tagName.toLowerCase() !== 'details') continue;
      if (scroller && scroller.contains(el) && scroller !== el) continue; // 허용된 내부 가로 스크롤
      const r = el.getBoundingClientRect();
      if (r.width && r.right > fr.right + 1) spill++;
    }
    const kids = [...svg.querySelectorAll('rect,path,circle,line,polygon,polyline')].map(e => e.getBoundingClientRect()).filter(r => r.width || r.height);
    out.sections[sec.dataset.kind] = {figureW: Math.round(fr.width), svgW: Math.round(sr.width), svgH: Math.round(sr.height), spill, marks: svg.querySelectorAll('rect,path,circle,line,polygon,polyline').length, texts: svg.querySelectorAll('text').length, visibleMarks: kids.length, figureRight: Math.round(fr.right), vw, scroller: !!scroller};
  }
  return out;
}

const browser = await chromium.launch();
const report = {};
for (const width of WIDTHS) {
  const ctx = await browser.newContext({viewport: {width, height: 900}, deviceScaleFactor: 1});
  const p = await ctx.newPage();
  await p.setContent(page, {waitUntil: 'load'});
  const m = await p.evaluate(measure);
  const hashes = {};
  for (const kind of Object.keys(m.sections)) {
    const buf = await p.locator(`section[data-kind="${kind}"] svg`).first().screenshot();
    hashes[kind] = createHash('sha256').update(buf).digest('hex').slice(0, 12);
    if (shotDir && width === 1280) { mkdirSync(shotDir, {recursive: true}); writeFileSync(resolve(shotDir, `${kind}.png`), await p.locator(`section[data-kind="${kind}"] figure`).first().screenshot()); }
    if (shotDir && width === 390) { mkdirSync(shotDir, {recursive: true}); writeFileSync(resolve(shotDir, `${kind}@390.png`), await p.locator(`section[data-kind="${kind}"] figure`).first().screenshot()); }
  }
  if (shotDir) await p.screenshot({path: resolve(shotDir, `_all@${width}.png`), fullPage: true});
  report[width] = {docOverflow: m.docOverflow, kinds: Object.keys(m.sections).length, distinctSvgImages: new Set(Object.values(hashes)).size, spills: Object.entries(m.sections).filter(([, s]) => s.spill).map(([k, s]) => `${k}:${s.spill}`), zero: Object.entries(m.sections).filter(([, s]) => !s.svgW || !s.svgH || !s.visibleMarks).map(([k]) => k), sections: m.sections, hashes};
  await ctx.close();
}
await browser.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 1));
for (const w of WIDTHS) { const r = report[w]; console.log(`${w}px kinds=${r.kinds} docOverflow=${r.docOverflow} distinctSvgImages=${r.distinctSvgImages} spills=[${r.spills}] zeroSized=[${r.zero}]`); }
process.exit(WIDTHS.every(w => report[w].docOverflow <= 0 && report[w].kinds === 29 && report[w].distinctSvgImages === 29 && !report[w].spills.length && !report[w].zero.length) ? 0 : 1);
