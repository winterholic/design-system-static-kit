import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExemptions, mergeOptions, groupFindings, summarize, formatReport} from '../scripts/layout-quality/run.mjs';
import {LAYOUT_OPTIONS} from '../scripts/layout-quality/probe.mjs';

// 브라우저 없이 확인하는 검사기 배선: 면제 규칙, 옵션 병합, 요약·보고 형식.
// 브라우저 측정 자체(역할 판정·줄바꿈·잘림)는 e2e/layout-quality.spec.mjs의 픽스처가 증명한다.
const f = (over = {}) => ({code: 'HEADING_EARLY_WRAP', severity: 'error', role: 'heading', page: 'http://x/', width: 1280, locator: '#main > h1', text: '제목', evidence: {lines: 2, linesIfUnconstrained: 1, containerWidth: 500, availableWidth: 1000, chWidth: 20, measureCh: 25}, suggestion: '폭 상한을 푼다', ...over});

test('면제는 사유가 없으면 거부한다', () => {
  assert.throws(() => applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP'}]), /reason/);
  assert.throws(() => applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP', reason: '  '}]), /reason/);
});

test('면제는 코드·페이지·위치·폭이 모두 맞을 때만 적용된다', () => {
  const ex = [{code: 'HEADING_EARLY_WRAP', page: '/studio', reason: '전폭 작업 화면'}];
  assert.equal(applyExemptions([f()], ex, 'http://x/studio')[0].exempted, true);
  assert.equal(applyExemptions([f()], ex, 'http://x/docs')[0].exempted, undefined, '다른 페이지는 면제하지 않는다');
  assert.equal(applyExemptions([f({code: 'LEAD_ORPHAN'})], ex, 'http://x/studio')[0].exempted, undefined, '다른 코드는 면제하지 않는다');
  assert.equal(applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP', locator: /nav/, reason: 'r'}], 'p')[0].exempted, undefined);
  assert.equal(applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP', width: 360, reason: 'r'}], 'p')[0].exempted, undefined);
});

test('요약: 면제는 통과 판정에서 빠지고 수는 따로 센다; failOn=warn이면 경고도 실패', () => {
  const results = [{page: 'p', width: 1280, scanned: {text: 3}, findings: [f({exempt: '사유'}), f({code: 'BODY_ORPHAN', severity: 'warn'}), f({code: 'SCROLL_REGION', severity: 'info'})]}];
  const s = summarize(results);
  assert.deepEqual([s.pass, s.exempt, s.bySeverity.warn, s.bySeverity.info], [true, 1, 1, 1]);
  assert.equal(summarize(results, {failOn: 'warn'}).pass, false);
  assert.equal(summarize([{page: 'p', width: 1, scanned: {}, findings: [f()]}]).pass, false);
});

test('폭별 발견을 같은 위치끼리 묶고, 보고에 코드·위치·실측·대안이 들어간다', () => {
  const results = [360, 768, 1280].map(width => ({page: 'http://x/', width, scanned: {}, findings: [f({width})]}));
  const g = groupFindings(results);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].widths, [360, 768, 1280]);
  const text = formatReport(results);
  for (const needle of ['ERROR HEADING_EARLY_WRAP', '@360/768/1280px', '#main > h1', 'linesIfUnconstrained=1', 'chWidth=20', 'fix  폭 상한을 푼다']) assert.match(text, new RegExp(needle.replace(/[>]/g, '\\>')));
});

test('옵션 병합은 기본 임계값을 보존하고 지정한 값만 덮는다', () => {
  const o = mergeOptions({thresholds: {heading: {maxLines: 4}}, selectors: {bar: '.top'}});
  assert.equal(o.thresholds.heading.maxLines, 4);
  assert.equal(o.thresholds.heading.orphanEm, LAYOUT_OPTIONS.thresholds.heading.orphanEm);
  assert.equal(o.selectors.bar, '.top');
  assert.equal(o.selectors.control, LAYOUT_OPTIONS.selectors.control);
  assert.equal(LAYOUT_OPTIONS.thresholds.heading.maxLines, 3, '기본값은 바뀌지 않는다');
});

test('기본 임계값은 카드의 읽기 폭 기준(45~80ch)을 그대로 담는다', () => {
  assert.deepEqual(LAYOUT_OPTIONS.thresholds.measure, {min: 45, max: 80});
});

test('SVG slice 크롭은 실제 잘린 양이 20% 이상인 의미 있는 그림만 경고로 보고한다', () => {
  assert.equal(LAYOUT_OPTIONS.thresholds.sliceCropPercent, 20);
});
