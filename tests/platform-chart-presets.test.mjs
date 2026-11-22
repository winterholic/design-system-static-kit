import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPlatform, bindColor, bindType} from '../src/platform/index.mjs';
import {pageTypeIds, themes} from '../src/catalog/index.mjs';
import {createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {spaceVars} from '../src/spacing.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';
import {niceMax as niceMax26} from '../src/render/chart.mjs';
import {niceMax as niceMaxLegacy, renderLegacyChart} from '../src/render/chart-legacy.mjs';
import {KIND_DATA_TYPES} from '../src/catalog/chart-rules.mjs';
import {assemble} from '../src/profiles/assemble.mjs';
import {PROFILES} from '../src/profiles/data.mjs';
import {STYLE_CONTEXTS} from '../src/platform/data/style-contexts.mjs';
import {
  CHART_PRESET_RELATIONS, CHART_FORM_GROUPS, FORM_CONTEXTS, chartRelationOf, chartContextVerdict, chartTendency, rankChartPresets, assembleChartPreset,
  PROFILE_LISTED_PRESETS, profileChartVerdict, groupOfForm,
} from '../src/platform/data/charts.mjs';

const sha = s => createHash('sha256').update(s).digest('hex');
const env = createPlatform();
const INPUT = ['form', 'auth', 'error'];

test('2.4.0 to 2.6.0 chart output is byte-identical: preset renders and compiled dashboards are pinned', () => {
  const all = chartPresetMaterials.map(m => m.id + '\n' + renderChartPreset(m.id)).join('\n---\n');
  assert.equal(sha(all), '7557476d913b6bbe961b6f5481e4ee42f9c8fb2da8365286dc95d31569b771eb', 'all 29 chart presets render the same bytes');
  // 눈금 상한(niceMax)이 값에 따라 달라지는 데이터로 구형 렌더러 출력을 직접 고정한다(대시보드 예시는 상한이 갈리는 값을 쓰지 않는다).
  const legacy = [['bar', [12, 28, 40]], ['bars-h', [1.2, 3.6, 4.2]], ['line', [130, 180, 230]], ['area', [7, 19, 23]]]
    .map(([kind, values], i) => renderLegacyChart({kind, title: 't', caption: 'c', unit: '건', categories: ['가', '나', '다'], series: [{name: 's', values}]}, `x${i}`)).join('\n');
  assert.equal(sha(legacy), '05813bfc8e7d25d3ec266d592d156d16979ca16a00569a11ed0fc833291d6e64', 'legacy axis charts render the same bytes');
  const pinned = {'2.4.0': 'b5ec7aadbe6ddc1d580ffb05d717170b55731b4766a61d0bc197903b4195204c', '2.5.0': '1a64e0b068ba743054b24419587bc0d8adf641022809a1ff0811844c3627e7bd', '2.6.0': '9d98ae6d050713a80fc7f7ccaea6e9f1ee896ee6d8e3d178b78b943494786d50'};
  for (const [version, hash] of Object.entries(pinned)) {
    const b = createBlueprint('dashboard-overview'); b.catalogVersion = version;
    const out = compile(b);
    assert.ok(out.html.includes('kit-chart'), `${version} dashboard has a chart`);
    assert.equal(sha(out.html + out.css), hash, `${version} compiled bytes`);
  }
});

test('all 29 chart presets have a context and form relation derived from the material and the form rules', () => {
  assert.equal(CHART_PRESET_RELATIONS.length, 29);
  assert.deepEqual(CHART_PRESET_RELATIONS.map(r => r.id), chartPresetMaterials.map(m => m.id));
  const forms = new Set(Object.values(CHART_FORM_GROUPS).flat());
  assert.deepEqual([...forms].sort(), Object.keys(KIND_DATA_TYPES).sort(), 'every chart form belongs to exactly one group');
  assert.deepEqual(Object.keys(FORM_CONTEXTS).sort(), Object.keys(KIND_DATA_TYPES).sort());
  for (const r of CHART_PRESET_RELATIONS) {
    assert.ok(KIND_DATA_TYPES[r.form].includes(r.dataType), `${r.id}: ${r.form} can show ${r.dataType}`);
    assert.equal(r.group, groupOfForm(r.form));
    assert.ok(r.primaryContexts.every(c => r.allowedContexts.includes(c)), `${r.id}: a preset's own page type is allowed`);
    assert.ok(r.allowedContexts.every(c => pageTypeIds.includes(c) && !INPUT.includes(c)), `${r.id}: input pages never take a chart`);
    for (const a of r.alternatives) {
      const o = chartRelationOf(a);
      assert.ok(o && o.id !== r.id && o.form !== r.form && KIND_DATA_TYPES[o.form].includes(r.dataType), `${r.id} → ${a}: another form for the same data type`);
    }
    assert.equal(r.axesOmitted, ['donut', 'sparkline', 'funnel'].includes(r.form));
  }
  assert.ok(Object.values(CHART_FORM_GROUPS).every(forms => forms.length >= 1));
  assert.ok(chartRelationOf('chart-preset:erp-quarterly-revenue').alternatives.length >= 1, 'a stacked bar can fall back to another form');
});

test('every rejected form × page type pair carries its reason, and the matrix has accepted and rejected cells', () => {
  let ok = 0, no = 0;
  for (const form of Object.keys(FORM_CONTEXTS)) for (const context of pageTypeIds) {
    const v = chartContextVerdict(form, context);
    if (v.ok) { ok++; assert.ok(FORM_CONTEXTS[form].includes(context)); } else { no++; assert.ok(v.code && v.reason.length > 10, `${form}×${context}`); }
  }
  assert.ok(ok > 60 && no > 40, `${ok} accepted, ${no} rejected`);
  assert.match(chartContextVerdict('heatmap', 'landing').reason, /격자 라벨/);
  assert.match(chartContextVerdict('bar', 'auth').reason, /입력과 복구/);
  assert.equal(chartContextVerdict('bar', 'auth').code, 'P_CHART_CONTEXT');
  assert.equal(chartContextVerdict('bar', 'nowhere').code, 'P_CHART_CONTEXT');
  assert.equal(chartContextVerdict('pie', 'dashboard').code, 'P_CHART_FORM');
});

test('the five profile-listed presets that never assembled are now assembled by the platform, or rejected with a stated reason', () => {
  // 구형 경로의 사실: 프로필 7개 목록 중 어느 패턴에서도 조립되지 않는 프리셋이 정확히 5개다.
  const listed = Object.entries(PROFILE_LISTED_PRESETS).flatMap(([profile, ids]) => ids.map(id => ({profile, id})));
  assert.equal(listed.length, 8, 'profile lists: 3 + 2 + 0 + 2 + 0 + 0 + 1 entries');
  const legacy = ({profile, id}) => PROFILES[profile].patterns.some(p => assemble(profile, {pattern: p, chartPresets: [id]}).ok);
  const never = [...new Set(listed.filter(x => !legacy(x)).map(x => x.id))].sort();
  assert.deepEqual(never, ['chart-preset:campaign-weekly-growth', 'chart-preset:erp-quarterly-revenue', 'chart-preset:marketing-channel-share', 'chart-preset:mobile-sparkline', 'chart-preset:operations-activity-heatmap']);
  // 프로필 형태 제한까지 적용했을 때의 결과. 5개 모두 조립되거나(assembled) 이유와 대안이 있는 거부(rejected)다.
  const expected = {
    'erp/chart-preset:erp-quarterly-revenue': 'rejected', 'erp/chart-preset:operations-activity-heatmap': 'rejected', 'saas-landing/chart-preset:marketing-channel-share': 'rejected',
    'mobile-app/chart-preset:mobile-sparkline': 'rejected', 'saas-landing/chart-preset:campaign-weekly-growth': 'assembled',
  };
  for (const id of never) for (const profile of listed.filter(x => x.id === id).map(x => x.profile)) {
    const v = profileChartVerdict(profile, id);
    const assembledPlain = Object.entries(v.byContext).filter(([, r]) => r.ok).map(([c]) => c);
    assert.ok(assembledPlain.length >= 1, `${profile}/${id}: assembled in at least one page type of the profile (${assembledPlain})`);
    for (const [c, r] of Object.entries(v.byContext)) if (!r.ok) assert.ok(r.code === 'P_CHART_CONTEXT' && r.message.length > 10, `${profile}/${id}/${c}: rejected with a reason`);
    const assembledWithProfile = Object.values(v.byProfile).some(r => r.ok);
    assert.equal(assembledWithProfile ? 'assembled' : 'rejected', expected[`${profile}/${id}`], `${profile}/${id}`);
    for (const [c, r] of Object.entries(v.byProfile)) {
      if (r.ok) continue;
      assert.ok(['P_CHART_PROFILE_KIND', 'P_CHART_CONTEXT'].includes(r.code) && r.message.length > 10, `${profile}/${id}/${c}: ${r.code}`);
      if (r.code === 'P_CHART_PROFILE_KIND') {
        assert.ok(r.message.includes(v.form) && r.alternatives.length >= 1, `${profile}/${id}/${c}: the profile's own chart kinds exclude ${v.form}; the rejection names alternatives`);
        for (const a of r.alternatives) assert.ok(PROFILES[profile].charts.kinds.includes(chartRelationOf(a).form), 'alternatives respect the profile');
      }
    }
  }
  // 이미 조립되던 3쌍은 두 경로 모두 통과한다.
  for (const id of ['chart-preset:sales-pipeline-value', 'chart-preset:finance-monthly-close']) for (const profile of ['erp', 'finance']) {
    if (!PROFILE_LISTED_PRESETS[profile].includes(id)) continue;
    const v = profileChartVerdict(profile, id);
    assert.ok(Object.values(v.byProfile).every(r => r.ok), `${profile}/${id}`);
  }
});

test('assembleChartPreset returns the renderer output as is, and says which tokens the output still needs', () => {
  const r = assembleChartPreset({preset: 'chart-preset:mobile-sparkline', context: 'listing'});
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(r.html, renderChartPreset('chart-preset:mobile-sparkline'), 'no SVG is generated here; the existing renderer output is returned byte for byte');
  assert.match(r.html, /data-axis="omitted-intentionally"/);
  assert.ok(r.css.includes('.kit-chart{') && r.css.includes('.kit-chart-scroll'));
  assert.ok(r.requires.includes('--kit-chart1') && r.requires.includes('--kit-text'));
  assert.equal(JSON.stringify(assembleChartPreset({preset: 'chart-preset:mobile-sparkline', context: 'listing'})), JSON.stringify(r), 'deterministic');
  const color = bindColor(env.registry.get('palette:static-kit'), env.registry.get('subtoken-set:standard'), 'light');
  const tokens = {...color.vars, ...bindType(env.registry.get('type-system:tech-erp')).vars, ...Object.fromEntries(spaceVars('comfortable').split(';').map(d => d.split(':')))};
  const withTokens = assembleChartPreset({preset: 'chart-preset:finance-price-candles', context: 'dashboard', tokens});
  assert.ok(withTokens.ok);
  assert.ok(withTokens.missing.every(v => /^--kit-(chart\d|t-[a-z-]+)$/.test(v)), `color roles and spacing tokens are all provided; only chart colors and type-scale variables may be missing: ${withTokens.missing}`);
  assert.ok(withTokens.missing.length <= withTokens.requires.length && withTokens.missing.every(v => withTokens.requires.includes(v)));
  const custom = assembleChartPreset({preset: 'chart-preset:erp-quarterly-revenue', context: 'data', data: {categories: ['1분기', '2분기'], series: [{name: '제품', values: [40, 50]}, {name: '서비스', values: [20, 30]}]}});
  assert.equal(custom.ok, true, JSON.stringify(custom.diagnostics));
  assert.match(custom.html, /2분기/);
  assert.equal(custom.relation.form, 'stacked-bar');
});

test('assembleChartPreset rejects with a code and a reason, and never invents markup', () => {
  const codes = req => assembleChartPreset(req).diagnostics.map(d => d.code);
  assert.deepEqual(codes({preset: 'chart-preset:operations-activity-heatmap', context: 'landing'}), ['P_CHART_CONTEXT']);
  const heat = assembleChartPreset({preset: 'chart-preset:operations-activity-heatmap', context: 'landing'});
  assert.equal(heat.ok, false);
  assert.equal(heat.html, null);
  assert.match(heat.diagnostics[0].message, /heatmap/);
  assert.deepEqual(codes({preset: 'chart-preset:nope', context: 'dashboard'}), ['P_CHART_PRESET']);
  assert.ok(assembleChartPreset({preset: 'chart-preset:nope', context: 'dashboard'}).diagnostics[0].alternatives.length === 29);
  assert.deepEqual(codes({preset: 'chart-preset:sales-pipeline-value', context: 'auth'}), ['P_CHART_CONTEXT']);
  assert.deepEqual(codes({preset: 'chart-preset:erp-quarterly-revenue', context: 'dashboard', profile: {kinds: ['bar']}}), ['P_CHART_PROFILE_KIND']);
  assert.deepEqual(codes({preset: 'chart-preset:erp-quarterly-revenue', context: 'dashboard', data: {categories: ['a', 'b'], series: [{name: 's', values: [1]}]}}), ['P_CHART_RENDER'], 'data the renderer rule rejects');
  assert.deepEqual(codes({preset: 'chart-preset:erp-quarterly-revenue', context: 'dashboard', svg: '<svg/>'}), ['P_REQUEST_KEY']);
  assert.deepEqual(codes(null), ['P_REQUEST']);
  const alt = assembleChartPreset({preset: 'chart-preset:erp-quarterly-revenue', context: 'dashboard', profile: {kinds: ['bar', 'line']}}).diagnostics[0].alternatives;
  assert.ok(alt.length >= 1 && alt.every(a => ['bar', 'line'].includes(chartRelationOf(a).form)));
});

test('style contexts rank chart presets, and an empty result carries the reason', () => {
  for (const sc of STYLE_CONTEXTS) for (const context of sc.contexts) {
    const r = rankChartPresets(sc, {context});
    assert.ok(r.ranked.length > 0 || r.reasons.length > 0, `${sc.id}/${context}`);
    if (INPUT.includes(context)) { assert.equal(r.ranked.length, 0); assert.ok(r.blocked.every(b => b.code === 'P_CHART_CONTEXT')); }
    else assert.ok(r.ranked.length > 0, `${sc.id}/${context}: some preset reads on this page type`);
  }
  const ledger = STYLE_CONTEXTS.find(s => s.id === 'style-context:ledger'), editorial = STYLE_CONTEXTS.find(s => s.id === 'style-context:editorial');
  assert.ok(chartTendency(ledger).some(t => t.option === 'density' && t.value === 'compact'));
  assert.ok(chartTendency(editorial).some(t => t.option === 'labels' && t.value === 'extremes'));
  for (const r of rankChartPresets(ledger, {context: 'dashboard'}).ranked) assert.equal(r.reasons.some(x => /밀도 compact/.test(x.reason)), chartRelationOf(r.id).options.density === 'compact', `${r.id}: the dense context credits exactly the compact presets`);
  const rank = (sc, id) => rankChartPresets(sc, {context: 'dashboard'}).ranked.find(r => r.id === id).score;
  assert.ok(rank(ledger, 'chart-preset:erp-cost-breakdown') > rank(editorial, 'chart-preset:erp-cost-breakdown'), 'the same compact preset scores higher in the dense context');
  const neon = STYLE_CONTEXTS.find(s => s.id === 'style-context:neon'), blocked = rankChartPresets(neon, {context: 'landing'}).blocked;
  assert.ok(blocked.some(b => b.id === 'chart-preset:operations-activity-heatmap' && b.code === 'P_CHART_CONTEXT'));
  const profile = rankChartPresets(ledger, {context: 'dashboard', profile: {kinds: ['bar']}});
  assert.ok(profile.ranked.every(r => chartRelationOf(r.id).form === 'bar') && profile.blocked.some(b => b.code === 'P_CHART_PROFILE_KIND' && b.alternatives !== undefined));
  assert.deepEqual(rankChartPresets(ledger, {context: 'dashboard'}), rankChartPresets(ledger, {context: 'dashboard'}), 'deterministic');
  assert.equal(rankChartPresets(ledger, {context: 'dashboard', dataType: 'distribution'}).ranked.every(r => chartRelationOf(r.id).dataType === 'distribution'), true);
});

test('all themes keep the chart relations independent of the Coolors palettes', () => {
  const json = JSON.stringify(CHART_PRESET_RELATIONS);
  for (const t of Object.values(themes)) for (const p of t.palettes) assert.ok(!json.includes(p));
});

test('niceMax is defined once: the 2.6.0 renderer re-exports the legacy function', () => {
  assert.equal(niceMax26, niceMaxLegacy);
  assert.deepEqual([0, -3, 0.7, 1, 1.2, 2.4, 5.5, 9.1, 130, 4999].map(niceMax26), [1, 1, 1, 1, 2, 5, 10, 10, 200, 5000]);
});
