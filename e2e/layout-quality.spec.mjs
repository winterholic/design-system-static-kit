import {test, expect} from '@playwright/test';
import {readFileSync, readdirSync} from 'node:fs';
import {FIXTURE_DIR, runFixture, judgeCases} from '../scripts/layout-quality/fixture-harness.mjs';
import {checkHtml, summarize} from '../scripts/layout-quality/run.mjs';

// 레이아웃 검사기(B단계) 시험. 나쁜 케이스는 반드시 잡히고(거짓 음성 방지) 좋은 케이스는 통과해야 한다(거짓 양성 방지).
// 케이스는 픽스처 HTML의 section#id[data-expect]에서 읽는다. 기대값은 진단 코드(쉼표 구분) 또는 none.
// 픽스처의 글줄 수는 Chromium과 한글 글꼴에 의존한다(기존 text.spec.mjs와 같은 전제).
const FIXTURES = [
  {file: 'wrap-cases.html', widths: [1280, 1600]},
  {file: 'clip-cases.html', widths: [1280, 1600]},
  {file: 'overflow-bad.html', widths: [360]},
  {file: 'overflow-good.html', widths: [360]},
  {file: 'bar-good.html', widths: [1280, 1600]},
  {file: 'bar-bad-y.html', widths: [1280, 1600]},
  {file: 'bar-bad-x.html', widths: [1280, 1600]},
];
const casesOf = file => [...readFileSync(`${FIXTURE_DIR}/${file}`, 'utf8').matchAll(/id="([^"]+)"[^>]*data-expect="([^"]+)"/g)].map(m => ({id: m[1], expect: m[2]}));

for (const {file, widths} of FIXTURES) {
  test.describe(`fixture ${file}`, () => {
    test.describe.configure({mode: 'serial'});
    let run;
    test.beforeAll(async ({browser}) => {
      const page = await browser.newPage();
      run = await runFixture(page, file, {widths});
      await page.close();
    });
    const cases = casesOf(file);
    test('픽스처에 케이스가 있고 검사기가 글·요소를 실제로 훑었다', () => {
      expect(cases.length, '케이스 수').toBeGreaterThan(0);
      expect(run.cases.length, '페이지 안의 케이스 수').toBe(cases.length);
      for (const r of run.results) expect(Object.values(r.scanned).reduce((a, b) => a + b, 0), `${r.width}px 훑은 수`).toBeGreaterThan(0);
    });
    for (const c of cases) {
      test(`${c.expect === 'none' ? 'good' : 'bad'} ${c.id}${c.expect === 'none' ? '' : ' → ' + c.expect}`, () => {
        // 모든 폭에서 같은 판정이어야 한다.
        for (const w of widths) {
          const only = run.findings.filter(f => f.width === w);
          const j = judgeCases(run.cases, only).find(x => x.id === c.id);
          expect(j.ok, `${w}px ${j.detail}`).toBe(true);
        }
      });
    }
  });
}

test.describe('role 판정과 면제', () => {
  const stage = body => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;font:16px/1.6 -apple-system,"Apple SD Gothic Neo",sans-serif;word-break:keep-all}.s{width:960px;margin-left:16px}</style></head><body><main><div class="s">${body}</div></main></body></html>`;
  const heading = attrs => `<h1 ${attrs} style="font-size:32px;line-height:1.2;max-width:20ch">고르면, 대비 검사를 통과한 HTML이 나오는 디자인 컴파일러</h1>`;

  test('data-layout-role이 추론한 역할을 바꾼다: 같은 글이 heading이면 잡히고 body이면 읽기 폭 규칙만 본다', async ({page}) => {
    const body = `<div ${'' }><p id="a" data-layout-role="heading" style="font-size:32px;line-height:1.2;max-width:20ch">고르면, 대비 검사를 통과한 HTML이 나오는 디자인 컴파일러</p></div>`;
    const asHeading = await checkHtml(page, stage(body), {widths: [1280]});
    expect(asHeading[0].findings.map(f => f.code)).toContain('HEADING_EARLY_WRAP');
    const asBody = await checkHtml(page, stage(body.replace('data-layout-role="heading"', 'data-layout-role="body"')), {widths: [1280]});
    expect(asBody[0].findings.map(f => f.code)).not.toContain('HEADING_EARLY_WRAP');
    expect(asBody[0].roles.body).toBeGreaterThan(0);
  });

  test('data-layout-exempt는 사유가 있을 때만 면제하고, 면제된 발견은 통과 판정에서 빠진다', async ({page}) => {
    const withReason = await checkHtml(page, stage(heading('data-layout-exempt="HEADING_EARLY_WRAP,HEADING_ORPHAN: 포스터형 좁은 제목을 의도함"')), {widths: [1280]});
    const f = withReason[0].findings.find(x => x.code === 'HEADING_EARLY_WRAP');
    expect(f.exempt).toContain('의도');
    expect(summarize(withReason).pass).toBe(true);
    const noReason = await checkHtml(page, stage(heading('data-layout-exempt="HEADING_EARLY_WRAP"')), {widths: [1280]});
    expect(noReason[0].findings.find(x => x.code === 'HEADING_EARLY_WRAP').exempt).toBeUndefined();
    expect(summarize(noReason).pass).toBe(false);
  });

  test('발견마다 코드·심각도·위치·실측 근거·대안이 들어 있다', async ({page}) => {
    const [r] = await checkHtml(page, stage(heading('id="t"')), {widths: [1280]});
    const f = r.findings.find(x => x.code === 'HEADING_EARLY_WRAP');
    expect(f).toMatchObject({code: 'HEADING_EARLY_WRAP', severity: 'error', role: 'heading'});
    expect(f.locator).toMatch(/h1#t|#t/);
    for (const k of ['lines', 'linesIfUnconstrained', 'containerWidth', 'availableWidth', 'chWidth', 'measureCh']) expect(f.evidence, k).toHaveProperty(k);
    expect(f.evidence.lines).toBeGreaterThan(f.evidence.linesIfUnconstrained);
    expect(f.suggestion.length).toBeGreaterThan(10);
  });
});

test('픽스처 목록이 디렉터리와 일치한다(시험에 안 걸린 픽스처가 없다)', () => {
  const files = readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.html')).sort();
  expect(files).toEqual(FIXTURES.map(f => f.file).sort());
});

// 차트 프리셋 증거 페이지(docs/evidence/materials/chart-presets.html): 모든 프리셋이 360·1280px에서 검사기 오류 0이어야 한다.
// 페이지는 scripts/materials/chart-presets-evidence.mjs가 결정적으로 만든다(tests/chart-presets-distinct.test.mjs가 재생성 결과와 바이트가 같음을 확인).
test('차트 프리셋 증거 페이지는 360·1280px에서 오류 0이고 SVG 글자를 실제로 쟀다', async ({page}) => {
  const {readFileSync} = await import('node:fs');
  const html = readFileSync(new URL('../docs/evidence/materials/chart-presets.html', import.meta.url), 'utf8');
  const results = await checkHtml(page, html, {widths: [360, 1280], label: 'chart-presets.html'});
  const sum = summarize(results);
  const errors = results.flatMap(r => r.findings).filter(f => !f.exempt && f.severity === 'error').map(f => `${f.width}px ${f.code} ${f.locator} ${JSON.stringify(f.evidence)}`);
  expect(errors, errors.join('\n')).toEqual([]);
  expect(sum.pass).toBe(true);
  for (const r of results) {
    expect(r.scanned.svg, `${r.width}px에서 훑은 SVG`).toBeGreaterThanOrEqual(25);
    expect(r.scanned.svgText, `${r.width}px에서 훑은 SVG 글자`).toBeGreaterThan(200);
  }
});
