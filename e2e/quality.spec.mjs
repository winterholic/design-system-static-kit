import {test, expect} from '@playwright/test';
import {enumerateCombos, renderCombo, shuffled} from '../src/combos.mjs';
import {themes} from '../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from '../scripts/design-qa/layout-probe.mjs';
import {SEVERE} from '../scripts/design-qa/diagnose-meta.mjs';

// 품질 게이트(6차 E). 갤러리에서 '실험'이 아닌 조합은 배치 실측(layout-probe)의 심각한 지적이 0이어야 한다.
// 전수 진단은 scripts/design-qa/diagnose.mjs가 로컬에서 하고(수십 분), CI는 고정 시드 표본으로 같은 규칙을 다시 잰다.
// macOS 폰트로 얻은 등급이 Linux 폰트에서도 유지되는지가 이 시험의 두 번째 목적이다(5차에서 줄바꿈 차이로 CI가 한 번 깨졌다).
const LAYOUT_SEVERE = ['EMPTY_CELL', 'BIG_NARROW', 'HIER_INVERT', 'TIGHT_ROW', 'GRID_ORPHAN', 'EDGE_VIEW'];

test('layout probe negative controls: every defect class is reported on a deliberately wrong page', async ({page}) => {
  const bad = `<!doctype html><html lang="ko"><body style="margin:0;font:16px/1.5 system-ui;word-break:keep-all">
<main style="padding:0 0 0 4px">
<h1 style="font-size:20px;margin:0">작은 페이지 제목</h1>
<section class="kit-section" style="background:#ddd;height:300px;padding:20px 0 0"><div class="kit-section-inner"><header class="kit-section-head"><h2 style="font-size:40px;margin:0">큰 섹션 머리말</h2></header></div></section>
<div style="width:300px;height:400px;border:1px solid #888;padding:24px;margin:24px 0"><p style="margin:0">위쪽에만 있는 글</p></div>
<ul style="list-style:none;padding:0;margin:0 0 24px"><li style="width:300px;background:#eee;padding:2px;height:24px">붙은 줄</li></ul>
<p style="width:1100px;font-size:13px;margin:0 0 24px">${'한 줄이 너무 길어서 읽기 어려운 본문입니다 '.repeat(14)}</p>
<h2 style="font-size:40px;width:150px;margin:0 0 24px">좁은 칸에 접히는 큰 글자입니다</h2>
<div style="display:grid;grid-template-columns:repeat(2,200px);gap:8px"><div style="height:60px;background:#eee">1</div><div style="height:60px;background:#eee">2</div><div style="height:60px;background:#eee">3</div></div>
</main></body></html>`;
  await page.setViewportSize({width: 390, height: 900});
  await page.setContent(bad, {waitUntil: 'load'});
  const r = await page.evaluate(layoutProbe, LAYOUT_OPTIONS), codes = new Set(r.findings.map(f => f.code));
  for (const code of ['EMPTY_CELL', 'TIGHT_ROW', 'MEASURE', 'BIG_NARROW', 'HIER_INVERT', 'GRID_ORPHAN', 'BAND_ASYM', 'EDGE_VIEW']) expect(codes, code + ' in ' + [...codes].join(',')).toContain(code);
  for (const k of ['grid', 'empty', 'row', 'measure', 'big', 'hier', 'band', 'edge']) expect(r.scanned[k], 'scanned ' + k).toBeGreaterThan(0);
});

test('quality gate: a seeded sample of stable combinations has no severe layout finding at 1440 and 390 under two themes', async ({page}) => {
  test.setTimeout(600000);
  const all = enumerateCombos().filter(c => !c.sameAs && !c.experimental);
  const defaults = all.filter(c => !c.changed), rest = shuffled(all.filter(c => c.changed), 20261021).slice(0, 160);
  const sample = [...defaults, ...rest], ids = Object.keys(themes), problems = [], scanned = {};
  let views = 0;
  for (const [i, c] of sample.entries()) for (const theme of [null, ids[(i * 7 + 3) % ids.length]]) {
    const r = renderCombo(c, theme ? {theme} : undefined);
    expect(r.ok, c.id + ' ' + r.error).toBe(true);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 900}); await page.setContent(r.html, {waitUntil: 'load'}); views++;
      const probe = await page.evaluate(layoutProbe, LAYOUT_OPTIONS);
      for (const [k, v] of Object.entries(probe.scanned)) scanned[k] = (scanned[k] ?? 0) + v;
      for (const f of probe.findings) if (LAYOUT_SEVERE.includes(f.code) && problems.length < 30) problems.push(`${c.id}@${theme ?? 'default'}@${width} ${f.code} ${f.at} ${f.detail}`);
    }
  }
  expect(problems).toEqual([]);
  expect(views).toBeGreaterThan(900);
  for (const k of ['grid', 'empty', 'row', 'measure', 'big', 'hier']) expect(scanned[k], `check ${k} scanned something`).toBeGreaterThan(100);
  expect(LAYOUT_SEVERE.every(c => SEVERE.has(c))).toBe(true);
});
