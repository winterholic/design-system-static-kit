// 브라우저 레이아웃 검사(B단계): 공개 페이지 전체를 360·768·1280·1600px에서 역할 기반으로 잰다.
// 검사기 자체와 픽스처 증명은 루트 e2e/layout-quality.spec.mjs, 규칙 설명은 docs/layout-quality.md.
import {expect, test} from '@playwright/test';
import {checkPage, checkUrls, discoverPaths, formatReport, summarize, DEFAULT_WIDTHS} from '../../../scripts/layout-quality/run.mjs';
import {EXEMPTIONS} from './layout-quality.exemptions.mjs';

// 공개 목록 페이지에서 한 단계 아래 링크를 따라가 페이지 집합을 만든다(문서·컴포넌트·Explore 상세 포함). 내부 QA(/dev)·API·정적 산출물 경로는 제외한다.
const SEEDS = ['/', '/explore', '/explore?page=2', '/components', '/docs', '/integrations', '/studio'];

test('공개 페이지 전체가 4개 폭에서 줄바꿈·잘림·넘침·상단 바 정렬 검사를 통과한다(면제는 사유 있는 것만)', async ({page, baseURL, browser}) => {
  test.setTimeout(900_000);
  const paths = await discoverPaths(page, baseURL, SEEDS);
  expect(paths.length, '검사한 공개 페이지 수').toBeGreaterThan(100);
  const results = await checkUrls(browser, paths.map(p => new URL(p, baseURL).href), {widths: DEFAULT_WIDTHS, exemptions: EXEMPTIONS});
  const sum = summarize(results, {failOn: 'warn'});
  console.log(`layout-quality: pages=${paths.length} widths=${DEFAULT_WIDTHS} ${JSON.stringify({bySeverity: sum.bySeverity, exempt: sum.exempt, scanned: sum.scanned})}`);
  const active = results.map(r => ({...r, findings: r.findings.filter(f => !f.exempt && f.severity !== 'info')}));
  expect(formatReport(active), '미면제 발견').toBe('');
  expect(sum.pass).toBe(true);
  // 대상이 없어서 통과한 것이 아니다.
  expect(sum.scanned.text).toBeGreaterThan(10_000);
  expect(sum.scanned.wrap).toBeGreaterThan(1_000);
  expect(sum.scanned.bar).toBeGreaterThan(100);
});

test.describe('홈 제목·리드·규약 영역', () => {
  test('수정 전에 잡히던 폭 상한 문제가 4개 폭 모두에서 없다', async ({page}) => {
    await page.goto('/');
    const results = await checkPage(page, {widths: DEFAULT_WIDTHS, label: '/', exemptions: EXEMPTIONS});
    const bad = results.flatMap(r => r.findings).filter(f => !f.exempt && /^(HEADING|LEAD|DESC|SHORT_TEXT|BODY|LABEL|CONTROL|BAR|CLIP|OVERFLOW)/.test(f.code));
    expect(formatReport([{findings: bad}])).toBe('');
    for (const r of results) {
      expect(r.roles.heading, `${r.width}px heading 역할을 훑음`).toBeGreaterThan(0);
      expect(r.roles.lead, `${r.width}px lead`).toBeGreaterThanOrEqual(1);
      expect(r.roles.desc, `${r.width}px 규약 설명(dd)`).toBeGreaterThanOrEqual(4);
    }
  });

  test('1280px에서 제목·리드·규약 설명이 사용 가능한 폭을 쓴다(줄이 폭 상한 때문에 접히지 않는다)', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/');
    const box = async sel => page.locator(sel).first().evaluate(el => { const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect(); return r.width / p.width; });
    expect(await box('h1.page-title')).toBeGreaterThan(0.95);
    expect(await box('p.page-lead')).toBeGreaterThan(0.95);
    expect(await page.locator('dl').first().evaluate(el => el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width)).toBeGreaterThan(0.9);
  });
});
