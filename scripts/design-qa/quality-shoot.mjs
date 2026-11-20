// 품질 진단 표본 렌더러(2026-11-21). 표본 목록(JSON)의 조합을 320·390·768·1440px에서 실제 Chromium으로 렌더해 PNG와 DOM 실측을 저장한다.
// 같은 목록으로 개선 전(before)·후(after)를 나란히 찍기 위한 도구다. 코드를 고친 뒤 --phase after로 다시 돌리면 같은 파일명으로 after/ 아래에 저장된다.
// 사용: node scripts/design-qa/quality-shoot.mjs [--phase before|after] [--samples <json>] [--only S01,S07] [--widths 320,390,768,1440] [--no-probes]
// 산출: docs/evidence/quality-2026-11-21/<phase>/<키>__<조합id>__w<폭>.png, 같은 폴더의 ../measure-<phase>.json
// 저장소 크기: 전체 페이지 PNG는 폭마다 상한 높이까지만 저장한다(CAP). 실제 문서 높이는 measure에 남고 잘렸는지(clipped)도 기록한다.
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {findCombo, renderCombo} from '../../src/combos.mjs';
import {CATALOG_VERSION} from '../../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';
import {pageMetrics} from './quality-metrics.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const root = resolve(import.meta.dirname, '../..');
const base = resolve(root, 'docs/evidence/quality-2026-11-21');
const phase = opt('--phase', 'before');
const samplesFile = resolve(root, opt('--samples', 'docs/evidence/quality-2026-11-21/samples.json'));
const widths = opt('--widths', '320,390,768,1440').split(',').map(Number);
const only = opt('--only', null)?.split(',');
const probes = !args.includes('--no-probes');
/** 폭별 저장 높이 상한(px). 저장소가 무거워지지 않게 상단 위주로 저장한다. 문서가 더 짧으면 전체가 저장된다. */
const CAP = {320: 3600, 390: 3600, 768: 3000, 1440: 2600};
const outDir = resolve(base, phase);
mkdirSync(outDir, {recursive: true});
// before·after는 동시 작업자가 같은 파일명을 쓰므로 그대로 두고, 다른 이름의 단계(예: after-variants)는 자기 폴더 안에 측정 JSON도 둔다.
const jsonDir = ['before', 'after'].includes(phase) ? base : outDir;

const {samples} = JSON.parse(readFileSync(samplesFile, 'utf8'));
const safe = s => s.replace(/~/g, '+').replace(/:/g, '-');
const stem = s => `${s.key}__${safe(s.combo)}${viewTag(s.view)}`;
const TAGS = {concept: 'co', look: 'lk', theme: 'th', tv: 'tv', pal: 'pa', type: 'ty', mode: 'mo'};
function viewTag(v = {}) { const t = Object.keys(TAGS).filter(k => v[k]).map(k => `${TAGS[k]}-${v[k]}`); return t.length ? '@' + t.join('@') : ''; }

const br = await chromium.launch();
const prior = only && existsSync(resolve(jsonDir, `measure-${phase}.json`)) ? JSON.parse(readFileSync(resolve(jsonDir, `measure-${phase}.json`), 'utf8')) : null;
const measure = {meta: {phase, date: new Date().toISOString().slice(0, 10), catalogVersion: CATALOG_VERSION, widths, cap: CAP, browser: 'chromium ' + br.version(), platform: process.platform}, samples: prior?.samples ?? {}};
const chosen = samples.filter(s => !only || only.includes(s.key));
for (const s of chosen) {
  const combo = findCombo(s.combo);
  if (!combo) { console.error('조합 없음:', s.key, s.combo); process.exitCode = 1; continue; }
  const r = renderCombo(combo, s.view);
  if (!r.ok) { console.error('렌더 실패:', s.key, r.error); process.exitCode = 1; continue; }
  const entry = measure.samples[s.key] = {combo: s.combo, view: s.view ?? {}, group: s.group, kind: s.kind, stem: stem(s), notes: r.notes, widths: {}};
  for (const w of widths) {
    const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
    await page.setContent(r.html, {waitUntil: 'load'});
    const m = await page.evaluate(pageMetrics);
    const height = Math.min(m.docH, CAP[w] ?? 3000), file = `${stem(s)}__w${w}.png`;
    await page.screenshot({path: resolve(outDir, file), fullPage: true, clip: {x: 0, y: 0, width: w, height}});
    const rec = {file: `${phase}/${file}`, docH: m.docH, clipped: m.docH > height, metrics: m};
    if (probes) {
      const found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings];
      rec.findings = found.filter(f => !(f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at))).map(f => ({code: f.code, at: f.at, detail: String(f.detail).slice(0, 160)}));
    }
    entry.widths[w] = rec;
    await ctx.close();
  }
  console.log(s.key, s.combo, Object.values(entry.widths).map(x => (x.findings?.length ?? '-') + (x.clipped ? '↧' : '')).join(' / '));
}
await br.close();
writeFileSync(resolve(jsonDir, `measure-${phase}.json`), JSON.stringify(measure));
console.log('done', chosen.length, 'samples ×', widths.length, 'widths →', outDir);
