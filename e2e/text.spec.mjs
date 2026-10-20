import {test, expect} from '@playwright/test';
import {templateList, themes, createBlueprint} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from '../scripts/design-qa/text-probe.mjs';

// 줄바꿈·넘침 계약: 글줄 실측(scripts/design-qa/text-probe.mjs)이 템플릿 전수 × 회전 테마 × 4폭에서 아래 코드를 하나도 내지 않는다.
// 본문 끝줄 고아(ORPHAN_LINE)와 짧은 글줄 폭(MEASURE_SHORT)은 단어 단위 줄바꿈의 자연스러운 결과가 섞여 있어 건수만 기록하고 막지 않는다.
const STRICT = ['OVERFLOW_X', 'CLIP_TEXT', 'CTRL_WRAP', 'VALUE_WRAP', 'NARROW_COL', 'ORPHAN_HEADING'];
const ALLOWED = [
  // 인용문 한 줄(4줄 중 끝줄 77px)은 text-wrap:pretty 지원 여부에 따라 달라진다.
  /^ORPHAN_HEADING p /,
  // 후원 캠페인 같은 큰 히어로의 숫자 포함 제목: 칸 폭에 맞춰 줄이되 3줄까지는 허용(데스크톱 고정 폭에서 513px 칸).
  /^NARROW_COL h2 3줄 칸 폭 513px/,
];

test('text contract: every template under rotating themes keeps headings, controls, values and containers clean at 360/390/768/1280', async ({page}) => {
  test.setTimeout(900000);
  const ids = Object.keys(themes), problems = [], scanned = {}, soft = {};
  let pages = 0;
  for (const [i, t] of templateList.entries()) for (const theme of new Set([t.theme, ids[(i * 7 + 3) % ids.length]])) {
    const b = createBlueprint(t.id, theme);
    if (!validateBlueprint(b).valid) continue;
    const html = compile(b).html;
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({width, height: 900}); await page.setContent(html, {waitUntil: 'load'}); pages++;
      const r = await page.evaluate(textProbe, TEXT_PROBE_OPTIONS);
      for (const [k, v] of Object.entries(r.scanned)) scanned[k] = (scanned[k] ?? 0) + v;
      for (const f of r.findings) {
        if (!STRICT.includes(f.code)) { soft[f.code] = (soft[f.code] ?? 0) + 1; continue; }
        const line = `${f.code} ${f.at} ${f.detail}`;
        if (ALLOWED.some(re => re.test(line))) continue;
        if (problems.length < 40) problems.push(`${t.id}/${theme}@${width} ${line}`);
      }
    }
  }
  console.log('text probe soft findings (not enforced):', JSON.stringify(soft), 'pages', pages);
  expect(problems).toEqual([]);
  expect(pages).toBeGreaterThan(300);
  for (const k of ['orphan', 'ctrl', 'narrow', 'overflow', 'clip', 'value']) expect(scanned[k], `check ${k} scanned something`).toBeGreaterThan(200);
});

test('text probe negative controls: each defect class is reported on a deliberately wrong page', async ({page}) => {
  const bad = `<!doctype html><html lang="ko"><body style="margin:0;font:16px/1.5 system-ui;width:360px;word-break:keep-all">
<main>
<h2 style="font-size:40px;margin:0 0 24px;width:250px">한 줄을 가득 채우는 긴 제목<br>끝</h2>
<a class="kit-button" style="display:inline-block;width:70px;margin:0 0 24px">장바구니 담기 버튼</a>
<dl class="kit-metric"><dd style="font-size:30px;width:80px;margin:0 0 24px;overflow-wrap:anywhere">6,420,000그루</dd></dl>
<p style="width:60px;margin:0 0 24px">좁은 칸에 들어간 긴 문장이라 한 줄에 몇 글자만 들어갑니다</p>
<div style="width:200px;height:20px;overflow:hidden">잘려서 보이지 않는 아주 긴 한 줄의 글입니다 끝까지</div>
<div style="width:700px;height:20px">화면 오른쪽 밖으로 나가는 요소</div>
</main></body></html>`;
  await page.setViewportSize({width: 360, height: 900}); await page.setContent(bad, {waitUntil: 'load'});
  const r = await page.evaluate(textProbe, TEXT_PROBE_OPTIONS), codes = new Set(r.findings.map(f => f.code));
  for (const code of ['ORPHAN_HEADING', 'CTRL_WRAP', 'VALUE_WRAP', 'NARROW_COL', 'CLIP_TEXT', 'OVERFLOW_X']) expect(codes, code).toContain(code);
});
