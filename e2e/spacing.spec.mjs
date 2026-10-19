import {test, expect} from '@playwright/test';
import {templateList, createBlueprint, themes} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {spacingProbe, PROBE_OPTIONS} from '../scripts/design-qa/spacing-probe.mjs';

const DENSITIES = ['compact', 'comfortable', 'spacious'];

test('spacing contract: 61 templates × 3 densities × phone/desktop measure clean (no off-scale, title gaps, proximity, edge, control findings)', async ({page}) => {
  test.setTimeout(600000);
  const problems = [], scanned = {};
  let skipped = 0;
  for (const t of templateList) for (const density of DENSITIES) {
    const b = createBlueprint(t.id); b.density = density;
    // 축 금지(예: 28px 반경 × compact 밀도, X07)에 걸리는 조합은 애초에 생성되지 않는다. 걸린 개수를 세어 두고, 대부분은 검사됐는지 마지막에 확인한다.
    if (!validateBlueprint(b).valid) { skipped++; continue; }
    const html = compile(b).html;
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 900});
      await page.setContent(html, {waitUntil: 'load'});
      const r = await page.evaluate(spacingProbe, PROBE_OPTIONS);
      for (const [k, v] of Object.entries(r.scanned)) scanned[k] = (scanned[k] ?? 0) + v;
      for (const f of r.findings.slice(0, 5)) problems.push(`${t.id}/${density}@${width} ${f.code} ${f.at} ${f.detail}`);
    }
  }
  expect(problems).toEqual([]);
  expect(skipped, `금지 조합으로 건너뛴 수 ${skipped}/${templateList.length * DENSITIES.length}`).toBeLessThan(templateList.length * DENSITIES.length * 0.2);
  // proof of scan: a check that measured nothing is not a pass
  for (const k of ['head', 'pair', 'proximity', 'edge', 'scale', 'ctrl']) expect(scanned[k], `check ${k} scanned something`).toBeGreaterThan(50);
});

test('spacing contract under other themes: every template wears 4 rotating themes (density, shell and radius come from the theme) and still measures clean', async ({page}) => {
  test.setTimeout(600000);
  const ids = Object.keys(themes), problems = [];
  let pages = 0;
  for (const [i, t] of templateList.entries()) for (const k of [0, 1, 2, 3]) {
    const theme = ids[(i * 7 + k * 11 + 3) % ids.length], b = createBlueprint(t.id, theme);
    if (!validateBlueprint(b).valid) continue;
    const html = compile(b).html;
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 900}); await page.setContent(html, {waitUntil: 'load'});
      const r = await page.evaluate(spacingProbe, PROBE_OPTIONS); pages++;
      for (const f of r.findings.slice(0, 3)) problems.push(`${t.id}@${theme}@${width} ${f.code} ${f.at} ${f.detail}`);
    }
  }
  expect(problems).toEqual([]);
  expect(pages, 'pages measured').toBeGreaterThan(400);
});

test('spacing probe negative controls: every defect class is reported on a deliberately wrong page', async ({page}) => {
  const bad = `<!doctype html><html lang="ko"><body style="margin:0;font:16px/1.5 system-ui;width:600px">
<main>
<section class="kit-list" style="margin:0 0 40px"><h2 style="margin:0 0 56px">제목과 본문이 먼 목록</h2><ul style="margin:0;padding:0"><li>항목</li></ul></section>
<dl class="kit-metric" style="display:flex;flex-direction:column;gap:28px;margin:0 0 40px"><dt>라벨</dt><dd style="margin:0">값</dd></dl>
<div style="display:flex;flex-direction:column;margin:0 0 40px"><div style="display:flex;flex-direction:column;gap:32px"><p style="margin:0">안쪽 하나</p><p style="margin:0">안쪽 둘</p></div><div style="height:4px"></div><div><p style="margin:0">이웃</p></div></div>
<div style="background:#eee;padding:2px;margin:0 0 40px;width:300px;height:80px">가장자리에 붙은 글자</div>
<div style="padding:13px 7px;margin:0 0 40px">격자 밖 값</div>
<div class="kit-field"><input style="padding:12px 14px;width:200px"></div>
<section class="kit-list"><h2 style="margin:0">고아 제목</h2></section>
</main></body></html>`;
  await page.setViewportSize({width: 800, height: 900});
  await page.setContent(bad, {waitUntil: 'load'});
  const r = await page.evaluate(spacingProbe, PROBE_OPTIONS);
  const codes = new Set(r.findings.map(f => f.code));
  for (const code of ['HEAD_GAP', 'PAIR_GAP', 'PROXIMITY', 'EDGE', 'OFF_SCALE', 'CTRL_PAD', 'HEAD_ORPHAN']) expect(codes, code).toContain(code);
});
