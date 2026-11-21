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
  assert.ok(chartPresetMaterials.length >= 28 && chartPresetMaterials.length <= 36, `${chartPresetMaterials.length} presets`);
  for (const earlier of ['erp-quarterly-revenue', 'finance-monthly-close', 'analytics-cohort-scatter', 'marketing-channel-share', 'mobile-sparkline', 'operations-activity-heatmap', 'sales-pipeline-value', 'campaign-weekly-growth']) assert.ok(ids.includes(`chart-preset:${earlier}`), earlier);
  const domains = new Set(chartPresetMaterials.map(material => material.ext.domain));
  assert.deepEqual([...domains].sort(), ['analytics', 'erp', 'finance', 'marketing', 'mobile']);
  for (const domain of domains) assert.ok(chartPresetMaterials.filter(material => material.ext.domain === domain).length >= 4, `${domain} has at least four presets`);
  const kinds = new Set(chartPresetMaterials.map(material => material.ext.chartKind));
  for (const kind of [...CHART_FORM_KINDS, 'stacked-bar', 'scatter', 'heatmap', 'sparkline', 'bar', 'bars-h', 'line', 'area', 'donut']) assert.ok(kinds.has(kind), `${kind} has a preset`);
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

test('the preset signature is what the renderer draws: data-* attributes equal the resolved options and the markup differs between same-form presets', () => {
  const skeleton = html => html.match(/<figure[^>]*class="kit-chart".*?<\/figure>/s)[0].replace(/ style="[^"]*"/g, '').replace(/>[^<]+</g, '><').replace(/[-\d.]+/g, '#').replace(/<title[^>]*>.*?<\/title>/g, '');
  const rendered = new Map();
  for (const material of chartPresetMaterials) {
    const html = compile(chartPage(structuredClone(material.examples[0]))).html, attrs = figureAttrs(html), options = chartOptions(material.examples[0]);
    assert.deepEqual({grid: attrs.grid, labels: attrs.labels, legend: attrs.legend, density: attrs.density, responsive: attrs.responsive}, {grid: options.grid, labels: options.labels, legend: options.legend, density: options.density, responsive: options.responsive}, material.id);
    assert.deepEqual(Object.fromEntries(PRESET_AXES.map(key => [key, material.ext.options[key]])), Object.fromEntries(PRESET_AXES.map(key => [key, options[key]])), `${material.id} stored options`);
    rendered.set(material.id, skeleton(html));
  }
  const bySkeleton = Map.groupBy([...rendered], ([, shape]) => shape);
  const clones = [...bySkeleton.values()].filter(group => group.length > 1).map(group => group.map(([id]) => id));
  assert.deepEqual(clones, [], 'no two presets render to the same structure once text, numbers and colors are removed');
});

test('chart presets validate and compile deterministically on catalog 2.6.0 and are rejected before it', () => {
  for (const material of chartPresetMaterials) {
    const chart = material.examples[0];
    assert.deepEqual(chartDiagnostics(chart), [], `${material.id} has no static chart diagnostics`);
    assert.deepEqual(validateBlueprint(chartPage(structuredClone(chart))).errors, [], material.id);
    assert.equal(compile(chartPage(structuredClone(chart))).html, compile(chartPage(structuredClone(chart))).html, `${material.id} is deterministic`);
    for (const version of ['2.4.0', '2.5.0']) assert.equal(validateBlueprint({...chartPage(structuredClone(chart)), catalogVersion: version}).valid, false, `${material.id} at ${version}`);
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
