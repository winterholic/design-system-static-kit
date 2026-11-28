import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBlueprint} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {chartOptions, chartDiagnostics, CHART_FORM_KINDS} from '../src/catalog/chart-rules.mjs';
import {catalogRegistry} from '../src/materials/index.mjs';
import {chartPresetMaterials, distinctnessViolations, signatureDifferences, PRESET_AXES} from '../src/materials/chart-presets.mjs';
import {PROFILES} from '../src/profiles/data.mjs';
import {renderChartEvidence, EVIDENCE_PATH} from '../scripts/materials/chart-presets-evidence.mjs';
import {renderChartPreset, validateChartPresetData} from '../src/render/chart-presets.mjs';
import {CHART_KIND_DATA_TYPES} from '../src/platform/data/charts.mjs';

const chartPage = chart => {
  const blueprint = createBlueprint('dashboard-overview');
  blueprint.catalogVersion = '2.6.0';
  blueprint.pageType = 'general';
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '차트'}, chart]};
  return blueprint;
};
const figureAttrs = html => Object.fromEntries([...html.match(/<figure[^>]*class="kit-chart"[^>]*>/)[0].matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));

test('chart presets: about thirty verified presets across ERP, finance, analytics, marketing and mobile, keeping every earlier id', () => {
  const ids = chartPresetMaterials.map(material => material.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.ok(chartPresetMaterials.length >= 29, `${chartPresetMaterials.length} presets cover the required chart forms`);
  for (const earlier of ['erp-quarterly-revenue', 'finance-monthly-close', 'analytics-cohort-scatter', 'marketing-channel-share', 'mobile-sparkline', 'operations-activity-heatmap', 'sales-pipeline-value', 'campaign-weekly-growth']) assert.ok(ids.includes(`chart-preset:${earlier}`), earlier);
  const domains = new Set(chartPresetMaterials.map(material => material.ext.domain));
  assert.deepEqual([...domains].sort(), ['analytics', 'erp', 'finance', 'marketing', 'mobile']);
  for (const domain of domains) assert.ok(chartPresetMaterials.filter(material => material.ext.domain === domain).length >= 4, `${domain} has at least four presets`);
  const kinds = new Set(chartPresetMaterials.map(material => material.ext.chartKind));
  assert.equal(kinds.size, 29, 'coverage counts unique chart forms, independently of preset count');
  assert.deepEqual([...kinds].sort(), Object.keys(CHART_KIND_DATA_TYPES).sort());
  const registry = catalogRegistry();
  assert.deepEqual(registry.check(), []);
  assert.equal(registry.filter({kind: 'chart-preset', preset: true, minQuality: 'verified'}).length, chartPresetMaterials.length);
});

test('chart presets differ visibly: same-form presets differ in at least two of grid, labels, legend, density, responsive, axes, series, data type', () => {
  assert.deepEqual(distinctnessViolations(chartPresetMaterials), []);
  // a color-only clone has the same signature and is rejected; one changed option is still too little; two are enough
  const [base] = chartPresetMaterials;
  const colorOnly = {...base, id: 'chart-preset:erp-quarterly-revenue-teal', label: '색만 다른 복제', examples: [{...base.examples[0], title: '색만 다른 복제'}], ext: {...base.ext, palette: 'teal'}};
  assert.deepEqual(distinctnessViolations([base, colorOnly]), [{a: base.id, b: colorOnly.id, differ: []}]);
  const withSignature = signature => ({...colorOnly, ext: {...colorOnly.ext, signature: {...base.ext.signature, ...signature}}});
  assert.equal(distinctnessViolations([base, withSignature({density: 'compact'})]).length, 1, 'one difference is not enough');
  assert.deepEqual(distinctnessViolations([base, withSignature({density: 'compact', grid: 'none'})]), []);
  assert.deepEqual(signatureDifferences(base, withSignature({grid: 'none'})), ['grid']);
});

test('native preset options reach compiler markup; every extended form reaches its own SVG renderer', () => {
  const skeleton = html => html.match(/<figure[^>]*class="kit-chart".*?<\/figure>/s)[0].replace(/ style="[^"]*"/g, '').replace(/>[^<]+</g, '><').replace(/[-\d.]+/g, '#').replace(/<title[^>]*>.*?<\/title>/g, '');
  const rendered = new Map();
  const native = new Set(['bar', 'bars-h', 'line', 'area', 'donut', 'stacked-bar', 'scatter', 'heatmap', 'sparkline', 'candlestick', 'ohlc', 'waterfall', 'funnel', 'histogram']);
  for (const material of chartPresetMaterials) {
    if (native.has(material.ext.chartKind)) {
      const html = compile(chartPage(structuredClone(material.examples[0]))).html, attrs = figureAttrs(html), options = chartOptions(material.examples[0]);
      assert.deepEqual({grid: attrs.grid, labels: attrs.labels, legend: attrs.legend, density: attrs.density, responsive: attrs.responsive}, {grid: options.grid, labels: options.labels, legend: options.legend, density: options.density, responsive: options.responsive}, material.id);
      assert.deepEqual(Object.fromEntries(PRESET_AXES.map(key => [key, material.ext.options[key]])), Object.fromEntries(PRESET_AXES.map(key => [key, options[key]])), `${material.id} stored options`);
      rendered.set(material.id, skeleton(html));
    } else {
      const html = renderChartPreset(material.id);
      assert.equal(typeof html, 'string', material.id);
      assert.match(html, new RegExp(`data-renderer-kind="${material.ext.chartKind}"`), material.id);
      assert.match(html, /<svg[^>]+viewBox=/, material.id);
      assert.match(html, /<table[ >]/, material.id);
    }
  }
  const bySkeleton = Map.groupBy([...rendered], ([, shape]) => shape);
  const clones = [...bySkeleton.values()].filter(group => group.length > 1).map(group => group.map(([id]) => id));
  assert.deepEqual(clones, [], 'no two presets render to the same structure once text, numbers and colors are removed');
});

test('native chart presets compile deterministically; extended chart data validate and render deterministically', () => {
  for (const material of chartPresetMaterials) {
    const chart = material.examples[0];
    if (['bar', 'bars-h', 'line', 'area', 'donut', 'stacked-bar', 'scatter', 'heatmap', 'sparkline', 'candlestick', 'ohlc', 'waterfall', 'funnel', 'histogram'].includes(material.ext.chartKind)) {
      assert.deepEqual(chartDiagnostics(chart), [], `${material.id} has no static chart diagnostics`);
      assert.deepEqual(validateBlueprint(chartPage(structuredClone(chart))).errors, [], material.id);
      assert.equal(compile(chartPage(structuredClone(chart))).html, compile(chartPage(structuredClone(chart))).html, `${material.id} is deterministic`);
      for (const version of ['2.4.0', '2.5.0']) assert.equal(validateBlueprint({...chartPage(structuredClone(chart)), catalogVersion: version}).valid, false, `${material.id} at ${version}`);
    } else {
      assert.deepEqual(validateChartPresetData(material.ext.chartKind, chart), [], `${material.id} schema`);
      assert.equal(renderChartPreset(material.id), renderChartPreset(material.id), `${material.id} deterministic SVG`);
    }
  }
});

test('every chart preset id that a design profile references is a registered preset', () => {
  const ids = new Set(chartPresetMaterials.map(material => material.id));
  const referenced = Object.entries(PROFILES).flatMap(([name, profile]) => profile.charts.presets.map(id => [name, id]));
  assert.ok(referenced.length >= 6, 'the profiles still name chart presets');
  for (const [name, id] of referenced) assert.ok(ids.has(id), `${name} references ${id}`);
});

test('the chart preset evidence page is the byte-for-byte output of the generator and shows every preset', () => {
  const html = renderChartEvidence();
  assert.equal(html, renderChartEvidence(), 'generator is deterministic');
  assert.equal(readFileSync(EVIDENCE_PATH, 'utf8'), html, 'docs/evidence/materials/chart-presets.html is stale: run node scripts/materials/chart-presets-evidence.mjs');
  assert.equal((html.match(/<figure[^>]*class="kit-chart"/g) ?? []).length, chartPresetMaterials.length);
  for (const material of chartPresetMaterials) assert.ok(html.includes(`<strong>${material.label}</strong>`), material.id);
});

// ---------------------------------------------------------------------------------------------------------------------
// TASK-TRE-02 독립 검증: 같은 데이터를 다른 형태로 그렸을 때 SVG 구조가 실제로 다른지, 값이 길이·면적·각도로 정확히 옮겨지는지,
// 접근성 표가 데이터와 같은지, 광고한 왜곡 방지 규칙마다 실제 렌더 경로가 입력을 거부하는지를 렌더 결과에서 직접 읽는다.
// ---------------------------------------------------------------------------------------------------------------------
const byKindOf = new Map(chartPresetMaterials.map(material => [material.ext.chartKind, material]));
const presetOf = kind => byKindOf.get(kind);
const draw = (kind, data) => { const out = renderChartPreset(presetOf(kind).id, data); assert.equal(typeof out, 'string', `${kind}: ${JSON.stringify(out.errors ?? out)}`); return out; };
const svgOf = html => html.match(/<svg[\s\S]*?<\/svg>/)[0];
const attrsOf = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const tagsOf = (svg, name) => [...svg.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(m => attrsOf(m[0]));
const rectsOf = svg => tagsOf(svg, 'rect').filter(a => a.class === 'ch-bar' || a['data-series'] !== undefined).map(a => ({...a, x: +a.x, y: +a.y, w: +a.width, h: +a.height}));
const numbersOf = d => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => +m[0]);
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);
const twoSeries = {categories: ['1월', '2월', '3월', '4월'], series: [{name: '가', values: [30, 50, 40, 60]}, {name: '나', values: [20, 10, 25, 5]}]};
const pctSeries = {categories: ['영업', '개발', '운영'], series: [{name: '가', values: [60, 50, 40]}, {name: '나', values: [40, 50, 60]}]};

test('same-data chart pairs draw structurally different SVG, not renamed copies', () => {
  const one = {categories: twoSeries.categories, series: [twoSeries.series[0]]};
  // 선 ↔ 면적: 면적만 채움 경로가 있다.
  assert.ok(!svgOf(draw('line', one)).includes('ch-area') && svgOf(draw('area', one)).includes('ch-area'));
  // 도넛 ↔ 파이: 파이는 중심에서 시작하는 부채꼴이고 가운데 합계 글자가 없다. 도넛은 안쪽 호가 있다.
  const pieData = {categories: ['가', '나', '다'], series: [{name: '비중', values: [50, 30, 20]}]};
  const pie = svgOf(draw('pie', pieData)), donut = svgOf(draw('donut', pieData));
  assert.ok(tagsOf(pie, 'path').filter(a => a['data-slice'] !== undefined).every(a => a.d.startsWith('M120 120L')), 'pie slices are wedges from the center');
  assert.ok(!donut.includes('M120 120L') && donut.includes('합계') && !pie.includes('합계'));
  // 누적 ↔ 그룹 ↔ 100% 누적 막대
  const groupedRects = rectsOf(svgOf(draw('grouped-bar', pctSeries))), stackedRects = rectsOf(svgOf(draw('stacked-bar', pctSeries))), normRects = rectsOf(svgOf(draw('normalized-stacked-bar', pctSeries)));
  for (const ci of [0, 1, 2]) {
    const [a, b] = [groupedRects[ci * 2], groupedRects[ci * 2 + 1]];
    near(a.y + a.h, b.y + b.h, .11, 'grouped bars of one category share the baseline');
    assert.notEqual(a.x, b.x, 'grouped bars sit side by side');
    const [s1, s2] = [stackedRects.filter(r => r.fill?.includes('chart1') || r.style?.includes('chart1'))[ci], stackedRects.filter(r => r.style?.includes('chart2'))[ci]];
    near(s2.y + s2.h, s1.y, 1.5, 'stacked: the second segment rests on the first');
    const [n1, n2] = [normRects[ci * 2], normRects[ci * 2 + 1]];
    near(n2.y + n2.h, n1.y, .11, '100% stacked: the second segment rests on the first');
  }
  assert.ok(new Set(normRects.filter((_, i) => i % 2 === 1).map(r => r.y)).size === 1, '100% stacked columns all reach the same top');
  // 선 ↔ 다중선 ↔ 계단선: 계단선은 모든 선분이 수평이나 수직이고, 다중선은 기울어진 선분이 있다.
  const segments = d => { const p = numbersOf(d); const pts = []; for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]); return pts.slice(1).map((q, i) => [pts[i], q]); };
  const step = tagsOf(svgOf(draw('step-line', twoSeries)), 'path').filter(a => a['data-series'] !== undefined), multi = tagsOf(svgOf(draw('multi-line', twoSeries)), 'path').filter(a => a['data-series'] !== undefined);
  assert.equal(step.length, 2); assert.equal(multi.length, 2);
  assert.ok(step.every(a => segments(a.d).every(([p, q]) => p[0] === q[0] || p[1] === q[1])), 'every step-line segment is axis aligned');
  assert.ok(multi.every(a => segments(a.d).some(([p, q]) => p[0] !== q[0] && p[1] !== q[1])), 'multi-line has slanted segments');
  // 면적 ↔ 누적 면적: 위 계열의 아래 경계가 아래 계열의 위 경계와 같다.
  const polys = tagsOf(svgOf(draw('stacked-area', twoSeries)), 'polygon').filter(a => a['data-series'] !== undefined).map(a => numbersOf(a.points));
  assert.equal(polys.length, 2);
  const pairs = list => list.map((_, i) => [list[i * 2], list[i * 2 + 1]]).slice(0, list.length / 2), upper1 = pairs(polys[0]).slice(0, 4), lower2 = pairs(polys[1]).slice(4);
  upper1.forEach(([x, y], i) => { near(lower2[3 - i][0], x, .11, 'stacked-area x'); near(lower2[3 - i][1], y, .11, 'the second area starts where the first ends'); });
  // 캔들 ↔ OHLC: 몸통 사각형(캔들)과 눈금 선(OHLC)
  const candle = svgOf(draw('candlestick')), ohlc = svgOf(draw('ohlc'));
  assert.ok(candle.includes('ch-body') && !candle.includes('ch-ohlc') && ohlc.includes('ch-ohlc') && !ohlc.includes('ch-body'));
  // 산점도 ↔ 버블: 버블 반지름은 크기에 따라 다르고 산점도 표식은 모두 같다.
  const radii = tagsOf(svgOf(draw('bubble')), 'circle').filter(a => a['data-bubble-size']).map(a => +a.r);
  assert.ok(new Set(radii).size === radii.length && radii.length === 3);
  // 막대 ↔ 가로 막대: 세로 막대는 높이가, 가로 막대는 너비가 값에 따라 달라진다.
  const bar = rectsOf(svgOf(draw('bar'))), barsH = rectsOf(svgOf(draw('bars-h')));
  assert.ok(new Set(bar.map(r => r.h)).size > 1 && new Set(bar.map(r => r.w)).size === 1);
  assert.ok(new Set(barsH.map(r => r.w)).size > 1 && new Set(barsH.map(r => r.h)).size === 1);
  // 스파크라인 ↔ 선: 스파크라인은 눈금 글자가 없다.
  assert.ok(!/<text[^>]*class="ch-t"/.test(svgOf(draw('sparkline'))) && /<text[^>]*class="ch-t"/.test(svgOf(draw('line'))));
  // 히트맵 ↔ 달력 히트맵
  assert.ok(svgOf(draw('heatmap')).includes('ch-cell') && !svgOf(draw('calendar-heatmap')).includes('ch-cell') && svgOf(draw('calendar-heatmap')).includes('data-cell'));
});

test('extended forms encode values as length, area or angle in proportion to the data', () => {
  // 그룹 막대: 높이 비 = 값 비
  const grouped = rectsOf(svgOf(draw('grouped-bar', {categories: ['가', '나'], series: [{name: 'a', values: [40, 80]}, {name: 'b', values: [20, 10]}]})));
  near(grouped[2].h / grouped[0].h, 2, .02, 'grouped 80:40'); near(grouped[0].h / grouped[1].h, 2, .02, 'grouped 40:20'); near(grouped[1].h / grouped[3].h, 2, .02, 'grouped 20:10');
  // 눈금에 고정: 막대 꼭대기는 그 값의 눈금선 높이에 있다(비율만 맞고 전체가 줄어든 그림을 잡는다).
  const groupedSvg = svgOf(draw('grouped-bar', {categories: ['가', '나'], series: [{name: 'a', values: [40, 80]}, {name: 'b', values: [20, 10]}]}));
  const tickY = label => +groupedSvg.match(new RegExp(`<text x="[\\d.]+" y="([\\d.]+)"[^>]*>${label}</text>`))[1] - 4.5;
  near(grouped[2].y, tickY(80), .11, 'bar of 80 reaches the 80 tick'); near(grouped[0].y, tickY(40), .11, 'bar of 40 reaches the 40 tick'); near(grouped[0].y + grouped[0].h, tickY(0), .11, 'bars stand on the 0 tick');
  // 100% 누적: 구간 높이 비 = 값 비
  const norm = rectsOf(svgOf(draw('normalized-stacked-bar', {categories: ['가', '나'], series: [{name: 'a', values: [25, 50]}, {name: 'b', values: [75, 50]}]})));
  near(norm[1].h / norm[0].h, 3, .02, 'normalized 75:25'); near(norm[2].h, norm[3].h, .02, 'normalized 50:50');
  // 버블: 면적 비 = 크기 비(반지름 비 = √크기 비)
  const bubbles = tagsOf(svgOf(draw('bubble', {series: [{name: 's', points: [{x: 1, y: 1, size: 10}, {x: 2, y: 2, size: 40}, {x: 3, y: 3, size: 90}]}]})), 'circle').filter(a => a['data-bubble-size']).map(a => +a.r);
  near(bubbles[1] / bubbles[0], 2, .02, 'bubble r 40:10'); near(bubbles[2] / bubbles[0], 3, .02, 'bubble r 90:10');
  // 파이: 호의 각도 = 값 × 3.6°
  const slices = tagsOf(svgOf(draw('pie', {categories: ['가', '나', '다'], series: [{name: 's', values: [50, 30, 20]}]})), 'path').filter(a => a['data-slice'] !== undefined);
  const angleOf = d => { const n = numbersOf(d), [x1, y1, x2, y2] = [n[2], n[3], n[9], n[10]]; const a = Math.atan2(y1 - 120, x1 - 120), b = Math.atan2(y2 - 120, x2 - 120); return ((b - a) / Math.PI * 180 + 360) % 360; };
  slices.forEach((slice, i) => near(angleOf(slice.d), [50, 30, 20][i] * 3.6, .5, `pie slice ${i}`));
  // 트리맵: 면적 비 = 값 비
  const cells = tagsOf(svgOf(draw('treemap', {categories: ['가', '나', '다', '라'], series: [{name: 's', values: [400, 300, 200, 100]}]})), 'rect').filter(a => a['data-cell'] !== undefined).map(a => ({i: +a['data-cell'], area: (+a.width + 2) * (+a.height + 2)}));
  assert.equal(cells.length, 4);
  const unit = cells.find(c => c.i === 3).area / 100;
  for (const c of cells) near(c.area / unit, [400, 300, 200, 100][c.i], 2, `treemap cell ${c.i}`);
  // 레이더: 꼭짓점 반지름 비 = 값 비, 게이지: 바늘 각도, 진행·불릿: 막대 길이 비
  const radar = tagsOf(svgOf(draw('radar', {categories: ['a', 'b', 'c', 'd'], series: [{name: 's', values: [100, 50, 25, 75]}]})), 'polygon').find(a => a['data-series'] === '0');
  const pts = numbersOf(radar.points), dist = i => Math.hypot(pts[i * 2] - 180, pts[i * 2 + 1] - 128);
  [100, 50, 25, 75].forEach((value, i) => near(dist(i) / dist(0), value / 100, .01, `radar vertex ${i}`));
  const needle = value => { const line = tagsOf(svgOf(draw('gauge', {series: [{name: 's', values: [value]}]})), 'line')[0]; return Math.atan2(+line.y2 - +line.y1, +line.x2 - +line.x1) / Math.PI * 180; };
  near(needle(25), -135, .1, 'gauge 25'); near(needle(50), -90, .1, 'gauge 50'); near(needle(100), 0, .1, 'gauge 100');
  const progress = rectsOf(svgOf(draw('progress-chart', {categories: ['a', 'b', 'c'], series: [{name: 's', values: [100, 50, 25]}]})));
  near(progress[1].w / progress[0].w, .5, .01, 'progress 50:100'); near(progress[2].w / progress[0].w, .25, .01, 'progress 25:100');
  const bulletSvg = svgOf(draw('bullet', {series: [{name: 's', values: [40], target: 80}]})), bullet = tagsOf(bulletSvg, 'rect'), targetLine = tagsOf(bulletSvg, 'line').find(a => a['stroke-width'] === '4');
  const track = bullet.find(a => a.fill === 'var(--kit-border)'), actual = bullet.find(a => a['data-series'] === '0');
  near(+actual.width / +track.width, .4, .01, 'bullet value'); near((+targetLine.x1 - +track.x) / +track.width, .8, .01, 'bullet target');
  // 박스 플롯: 눈금 위치가 값에 선형이다.
  const box = tagsOf(svgOf(draw('box-plot', {categories: ['a'], series: [{name: 'a', quartiles: {min: 0, q1: 10, median: 20, q3: 40, max: 100}}]})), 'line').filter(a => a['stroke-width'] === '2' || a['stroke-width'] === '3');
  const median = box.find(a => a['stroke-width'] === '3'), whisker = box.filter(a => a['stroke-width'] === '2' && a.y1 === a.y2)[0];
  near((+median.x1 - +whisker.x1) / (+whisker.x2 - +whisker.x1), .2, .005, 'box median position');
});

test('the accessible data table of every chart type carries exactly the numbers the preset was drawn from', () => {
  for (const [kind, material] of byKindOf) {
    const data = material.examples[0], html = renderChartPreset(material.id), table = html.match(/<table[\s\S]*?<\/table>/)?.[0];
    assert.ok(table, `${kind} has a table`);
    const cells = [...table.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m => m[1]);
    const shown = cells.map(text => text.includes(': ') ? text.slice(text.indexOf(': ') + 2) : text).flatMap(text => [...text.replaceAll(',', '').matchAll(/(?<![A-Za-z\d.])\d+(?:\.\d+)?/g)].map(m => +m[0])).sort((a, b) => a - b);
    const expected = (data.series ?? []).flatMap(item => item.values ?? item.points?.flatMap(p => [p.x, p.y, ...(kind === 'bubble' ? [p.size] : [])]) ?? item.candles?.flatMap(c => [c.open, c.high, c.low, c.close]) ?? (item.quartiles ? ['min', 'q1', 'median', 'q3', 'max'].map(key => item.quartiles[key]) : [])).map(Math.abs);
    if (kind === 'bullet') expected.push(data.series[0].target);
    if (kind === 'histogram') { const counts = cells.map(text => Number.parseInt(text, 10)); assert.equal(counts.reduce((a, b) => a + b, 0), data.series[0].samples.length, 'histogram table counts add up to the samples'); continue; }
    const pool = [...shown];
    for (const value of expected) { const at = pool.indexOf(value); assert.ok(at >= 0, `${kind}: table lacks ${value}`); pool.splice(at, 1); }
    if (!['waterfall', 'funnel', 'heatmap', 'stacked-bar', 'line', 'area', 'bar', 'bars-h', 'scatter', 'donut', 'sparkline', 'candlestick', 'ohlc'].includes(kind)) assert.equal(shown.length, expected.length, `${kind}: the extended table adds no numbers beyond the data`);
    for (const label of data.categories ?? []) assert.ok(table.includes(`>${label}<`), `${kind}: table row label ${label}`);
  }
});

test('extended SVG draws its own axes, legend and labels instead of leaning on hover titles', () => {
  const textsOf = svg => [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
  for (const kind of ['grouped-bar', 'normalized-stacked-bar', 'multi-line', 'step-line', 'stacked-area', 'combination']) {
    const html = draw(kind), texts = textsOf(svgOf(html)), data = presetOf(kind).examples[0];
    for (const label of data.categories) assert.ok(texts.includes(label), `${kind} labels category ${label}`);
    assert.ok(texts.filter(text => /^\d+(\.\d+)?$/.test(text)).length >= 3, `${kind} has value-axis ticks`);
    if (data.series.length > 1) for (const item of data.series) assert.ok(html.includes(`</i>${item.name}`), `${kind} legend names ${item.name}`);
  }
  for (const kind of ['pie', 'treemap']) {
    const html = draw(kind);
    for (const label of presetOf(kind).examples[0].categories) assert.ok(html.includes(`</i>${label}`), `${kind} legend names ${label}`);
  }
  assert.ok(textsOf(svgOf(draw('radar'))).includes('품질'), 'radar labels its axes');
  assert.ok(textsOf(svgOf(draw('calendar-heatmap'))).includes('월') && textsOf(svgOf(draw('calendar-heatmap'))).includes('1주'), 'calendar heatmap labels days and weeks');
  assert.ok(textsOf(svgOf(draw('box-plot'))).includes('주식형'), 'box plot names each box');
  assert.ok(textsOf(svgOf(draw('gauge'))).includes('62점') && textsOf(svgOf(draw('gauge'))).includes('100'), 'gauge prints its value and scale end');
});

test('every distortion rule a preset advertises is enforced by the real render path with the intended error code', () => {
  const FIXTURES = {
    'finite-values': [['line', c => { c.series[0].values[0] = NaN; }, 'CHART_VALUE'], ['donut', c => { c.series[0].values[0] = Infinity; }, 'CHART_VALUE'], ['scatter', c => { c.series[0].points[0].y = NaN; }, 'CHART_VALUE'], ['candlestick', c => { c.series[0].candles[0].low = NaN; }, 'CHART_VALUE'], ['ohlc', c => { c.series[0].candles[0].high = NaN; }, 'CHART_VALUE']],
    nonnegative: [['stacked-bar', c => { c.series[0].values[0] = -1; }, 'CHART_SHAPE'], ['donut', c => { c.series[0].values = [120, -20, 0]; }, 'CHART_SHAPE'], ['heatmap', c => { c.series[0].values[0] = -1; }, 'CHART_DOMAIN'], ['grouped-bar', c => { c.series[0].values[0] = -1; }, 'CHART_DOMAIN'], ['normalized-stacked-bar', c => { c.series[0].values[0] = 120; c.series[1].values[0] = -20; c.series[2].values[0] = 0; }, 'CHART_DOMAIN'], ['stacked-area', c => { c.series[0].values[0] = -1; }, 'CHART_DOMAIN'], ['pie', c => { c.series[0].values = [120, -20, 0, 0]; }, 'CHART_DOMAIN'], ['treemap', c => { c.series[0].values = [500, -100, 100, 100]; }, 'CHART_DOMAIN'], ['bullet', c => { c.series[0].values = [-20]; }, 'CHART_DOMAIN'], ['calendar-heatmap', c => { c.series[0].values[0] = -1; }, 'CHART_DOMAIN']],
    'zero-baseline': [...['stacked-bar', 'bar', 'area', 'waterfall', 'bars-h', 'histogram', 'grouped-bar', 'stacked-area'].map(kind => [kind, c => { c.axis = {...c.axis, min: 1}; }, null])],
    'total-100': [['donut', c => { c.series[0].values[0] += 1; }, 'CHART_TOTAL'], ['pie', c => { c.series[0].values[0] += 1; }, 'CHART_TOTAL']],
    'exactly-one-series': [['sparkline', c => { c.series.push(structuredClone(c.series[0])); }, 'CHART_SHAPE']],
    'non-increasing-stages': [['funnel', c => { c.series[0].values[1] = c.series[0].values[0] + 1; }, null]],
    'unique-categories': [['multi-line', c => { c.categories[1] = c.categories[0]; }, 'CHART_SHAPE'], ['step-line', c => { c.categories[1] = c.categories[0]; }, 'CHART_SHAPE']],
    'axis-covers-data': [['multi-line', c => { c.axis = {...c.axis, max: 10}; }, 'CHART_AXIS'], ['multi-line', c => { c.axis = {...c.axis, min: 10}; }, 'CHART_AXIS'], ['step-line', c => { c.axis = {...c.axis, min: 3}; }, 'CHART_AXIS']],
    'each-category-total-100': [['normalized-stacked-bar', c => { c.series[0].values[0] += 1; }, 'CHART_TOTAL']],
    'finite-coordinates': [['bubble', c => { c.series[0].points[0].x = Infinity; }, 'CHART_SHAPE']],
    'positive-size': [['bubble', c => { c.series[0].points[0].size = 0; }, 'CHART_SHAPE'], ['bubble', c => { c.series[0].points[0].size = -3; }, 'CHART_SHAPE']],
    'positive-total': [['treemap', c => { c.series[0].values.fill(0); }, 'CHART_TOTAL']],
    'single-series': ['pie', 'treemap', 'gauge', 'bullet', 'progress-chart'].map(kind => [kind, c => { c.series.push(structuredClone(c.series[0])); }, 'CHART_SHAPE']),
    'at-least-three-axes': [['radar', c => { c.categories = ['a', 'b']; c.series.forEach(item => { item.values = [50, 60]; }); }, 'CHART_SHAPE']],
    'shared-scale-0-100': [['radar', c => { c.series[0].values[0] = 101; }, 'CHART_DOMAIN']],
    'domain-0-100': [['gauge', c => { c.series[0].values[0] = 101; }, 'CHART_DOMAIN'], ['progress-chart', c => { c.series[0].values[0] = -1; }, 'CHART_DOMAIN']],
    'required-target-in-domain': [['bullet', c => { delete c.series[0].target; }, 'CHART_SHAPE'], ['bullet', c => { c.series[0].target = 101; }, 'CHART_DOMAIN']],
    'ordered-five-number-summary': [['box-plot', c => { c.series[0].quartiles.median = c.series[0].quartiles.q3 + 1; }, 'CHART_ORDER']],
    'bar-and-line-series': [['combination', c => { c.series.forEach(item => { item.mark = 'bar'; }); }, 'CHART_SHAPE']],
    'zero-baseline-for-bars': [['combination', c => { c.axis = {...c.axis, min: 10}; }, 'CHART_BASELINE']],
    'complete-week-grid': [['calendar-heatmap', c => { c.categories.pop(); }, 'CHART_SHAPE'], ['calendar-heatmap', c => { c.series[0].values.pop(); c.categories = c.categories.slice(0, 7); }, 'CHART_SHAPE']],
    'low-le-open-close-le-high': [['candlestick', c => { c.series[0].candles[0].open = c.series[0].candles[0].high + 1; }, 'CHART_OHLC'], ['ohlc', c => { c.series[0].candles[0].low = c.series[0].candles[0].high + 1; }, 'CHART_OHLC']],
    'totals-match-running-sum': [['waterfall', c => { c.series[0].values[c.series[0].values.length - 1] += 5; }, null]],
  };
  const advertised = new Set(chartPresetMaterials.flatMap(material => material.ext.options.distortionRules.map(rule => rule.rule)));
  assert.deepEqual([...advertised].filter(rule => !FIXTURES[rule]), [], 'every advertised rule has a rejecting fixture');
  for (const [rule, cases] of Object.entries(FIXTURES)) {
    const owners = new Set(chartPresetMaterials.filter(material => material.ext.options.distortionRules.some(r => r.rule === rule)).map(material => material.ext.chartKind));
    for (const [kind, mutate, code] of cases) {
      assert.ok(owners.has(kind), `${rule} is advertised by ${kind}`);
      const chart = structuredClone(presetOf(kind).examples[0]);
      mutate(chart);
      const out = renderChartPreset(presetOf(kind).id, {series: chart.series, categories: chart.categories, axis: chart.axis});
      assert.equal(typeof out, 'object', `${rule}/${kind} must be rejected, not rendered`);
      assert.ok(out.errors.length > 0 && (code === null || out.errors.some(error => error.code === code)), `${rule}/${kind}: got ${out.errors.map(error => error.code)}, wanted ${code}`);
    }
  }
  // 누적 면적의 축 최댓값은 합계 기준이다: 개별 값이 아니라 쌓인 높이가 잘리면 거부한다.
  const area = structuredClone(presetOf('stacked-area').examples[0]);
  assert.ok(renderChartPreset(presetOf('stacked-area').id, {series: area.series, categories: area.categories, axis: {max: 60}}).errors?.some(error => error.code === 'CHART_AXIS'));
  assert.equal(typeof renderChartPreset(presetOf('stacked-area').id, {series: area.series, categories: area.categories, axis: {max: 80}}), 'string');
  // 값이 같고 규칙을 지키는 입력은 거부되지 않는다(거부가 항상 참이 아니다).
  for (const material of chartPresetMaterials) assert.equal(typeof renderChartPreset(material.id), 'string', material.id);
});

test('script-looking category text is escaped in extended SVG and table', () => {
  const html = draw('grouped-bar', {categories: ['<script>alert(1)</script>', 'b', 'c'], series: presetOf('grouped-bar').examples[0].series});
  assert.ok(!html.includes('<script>') && html.includes('&lt;script&gt;'));
});
