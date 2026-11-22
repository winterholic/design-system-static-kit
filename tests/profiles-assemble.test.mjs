import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assemble, designRegistry, PROFILES, PROFILE_IDS, PATTERNS, INTENT_KEYS} from '../src/profiles/index.mjs';
import {catalogWithoutIntegrating, fakeChartPreset, fakeMaterial} from './profiles-support.mjs';
import {validateBlueprint} from '../src/validate.mjs';
import {validateBlueprint as serviceValidate, assembleBlueprint, compileBlueprint, getSchema, HINTS} from '../src/service/index.mjs';
import {compile} from '../src/compiler.mjs';

const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const codes = r => r.diagnostics.map(d => d.code);
/** 실패 결과의 공통 모양: Blueprint 없이 진단만 있고, 모든 진단에 근거·힌트가 있다. */
function rejected(r, code, path) {
  assert.equal(r.ok, false);
  assert.equal(r.blueprint, null, 'no partial or substituted blueprint');
  const d = r.diagnostics.find(x => x.code === code && (!path || x.path === path));
  assert.ok(d, `${code} ${path ?? ''}: ${JSON.stringify(r.diagnostics)}`);
  assert.equal(d.severity, 'error'); assert.ok(d.reason && d.message); assert.equal(d.hint, HINTS[code]);
  return d;
}

test('assemble: every profile × pattern × theme builds a valid 2.6.0 Blueprint from profile defaults that compiles', () => {
  let n = 0;
  for (const id of PROFILE_IDS) for (const pattern of PROFILES[id].patterns) for (const theme of PROFILES[id].themes) {
    const r = assemble(id, {pattern, theme});
    assert.equal(r.ok, true, `${id} ${pattern} ${theme}: ${JSON.stringify(r.diagnostics.slice(0, 3))}`);
    const b = r.blueprint;
    assert.equal(b.catalogVersion, '2.6.0'); assert.equal(b.profile, id); assert.equal(b.colorPalette, 'static-kit');
    assert.deepEqual(validateBlueprint(b).errors, []);
    assert.equal(serviceValidate(b).ok, true);
    assert.equal(r.materials.pattern, pattern); assert.equal(r.materials.typeRole, PROFILES[id].type.rolePreset);
    assert.equal(r.materials.controlSize, PROFILES[id].controlSize.default);
    n++;
  }
  assert.ok(n >= 50, String(n));
  for (const id of PROFILE_IDS) { const {html, manifest} = compile(assemble(id).blueprint); assert.ok(html.startsWith('<!doctype html>')); assert.equal(manifest.blueprint.profile, id); }
});

test('assemble is deterministic: the same input gives the same bytes, also through a fresh registry', () => {
  const input = ['commerce', {pattern: 'pattern:commerce-checkout', theme: 'garden', mode: 'auto'}, {name: '주문 결제'}];
  const a = JSON.stringify(assemble(...input)), b = JSON.stringify(assemble(...input));
  assert.equal(a, b);
  assert.equal(JSON.stringify(assemble(...input, {registry: designRegistry()})), a);
  assert.equal(sha(assemble('erp').blueprint), sha(assemble('erp', {}, {}).blueprint));
  assert.equal(sha(compile(assemble('erp').blueprint).html), sha(compile(assemble('erp').blueprint).html));
});

test('requested chart presets shape default chart targets and profile role typography reaches public compiled CSS and manifest', () => {
  const request = {profile: 'finance', intent: {pattern: 'dashboard-grid', chartPresets: ['finance-monthly-close']}};
  const assembled = assembleBlueprint(request);
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors));
  const {blueprint} = assembled.value;
  const chart = blueprint.tree.children[2].children.find(node => node.type === 'chart');
  assert.equal(chart.kind, 'line');
  assert.equal(chart.unit, '억 원');
  assert.deepEqual(chart.categories, ['1월', '2월', '3월', '4월']);
  assert.deepEqual(chart.series.map(series => series.name), ['예수금', '운용액']);
  assert.equal(chart.grid, 'both');
  assert.equal(blueprint.typeRoles, 'dashboard');

  const compiled = compileBlueprint(blueprint, {include: ['html', 'css', 'manifest']});
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  assert.match(compiled.value.css, /Role typography \(catalog 2\.6\.0 typeRoles: dashboard/);
  assert.equal(compiled.value.manifest.typeRoles.preset, 'dashboard');
  assert.match(compiled.value.html, /data-chart="2\.6"/);

  const plain = assembleBlueprint({profile: 'finance', intent: {pattern: 'dashboard-grid'}});
  assert.equal(plain.ok, true);
  assert.equal(plain.value.blueprint.tree.children[2].children.find(node => node.type === 'chart').kind, 'bar');
  assert.equal(JSON.stringify(assembled), JSON.stringify(assembleBlueprint(request)));
});

test('controlSize is a closed 2.6.0 Blueprint choice that changes compiled CSS consumed by default controls', () => {
  const small = assemble('erp', {controlSize: 'small'});
  const medium = assemble('erp', {controlSize: 'medium'});
  assert.equal(small.ok, true, JSON.stringify(small.diagnostics));
  assert.equal(medium.ok, true, JSON.stringify(medium.diagnostics));
  assert.equal(small.blueprint.controlSize, 'small');
  assert.equal(small.materials.controlSize, 'small');
  assert.equal(assemble('erp').blueprint.controlSize, PROFILES.erp.controlSize.default);

  const smallCompiled = compileBlueprint(small.blueprint, {include: ['html', 'css', 'manifest']});
  const mediumCompiled = compileBlueprint(medium.blueprint, {include: ['html', 'css', 'manifest']});
  assert.equal(smallCompiled.ok, true, JSON.stringify(smallCompiled.errors));
  assert.equal(mediumCompiled.ok, true, JSON.stringify(mediumCompiled.errors));
  assert.notEqual(smallCompiled.value.css, mediumCompiled.value.css);
  assert.match(smallCompiled.value.html, /class="kit-button/);
  assert.match(smallCompiled.value.css, /\.kit-button:not\(\[data-size\]\)/);
  assert.match(smallCompiled.value.css, /--ctl-h:calc\(var\(--kit-control\) - 8px\)/);
  assert.match(mediumCompiled.value.css, /--ctl-h:var\(--kit-control\)/);
  assert.doesNotMatch(smallCompiled.value.css, /\.kit-button\[data-size=/, 'explicit component sizes stay on their own selector path');
  assert.equal(JSON.stringify(assemble('erp', {controlSize: 'small'})), JSON.stringify(small));
  assert.equal(compile(small.blueprint).css, compile(small.blueprint).css);
});

test('controlSize defaults remain optional in 2.6.0 and reject unknown or pre-2.6.0 values structurally', () => {
  const base = assemble('erp').blueprint;
  const withoutField = {...base}; delete withoutField.controlSize;
  const legacyCSS = compile(withoutField).css;
  assert.doesNotMatch(legacyCSS, /\.kit-button:not\(\[data-size\]\)/, 'omitting the optional field preserves the pre-feature control CSS path');
  rejected(assemble('erp', {controlSize: 'xl'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.controlSize');
  assert.ok(validateBlueprint({...base, controlSize: 'xl'}).errors.some(d => d.code === 'ENUM' && d.path === '$.controlSize'));
  for (const version of ['2.4.0', '2.5.0']) {
    assert.ok(validateBlueprint({...base, catalogVersion: version, controlSize: 'small'}).errors.some(d => d.code === 'VERSION_FIELD' && d.path === '$.controlSize'), version);
  }
  const injected = assemble('erp', {controlSize: 'small', css: '.kit-button{height:1px}'});
  assert.equal(injected.ok, false);
  assert.equal(injected.blueprint, null);
  assert.ok(injected.diagnostics.some(d => d.code === 'ASSEMBLE_UNSUPPORTED' && d.path === '$args.intent.css'));
});

test('chart presets do not overwrite user slot charts and reject ambiguous or over-capacity targets', () => {
  const userChart = {type: 'chart', title: '내 잔액', caption: '직접 입력', kind: 'area', categories: ['1월', '2월'], series: [{name: '내 데이터', values: [5, 8]}]};
  const request = {profile: 'finance', intent: {pattern: 'dashboard-grid', chartPresets: ['finance-monthly-close']}, content: {slots: {insights: [userChart]}}};
  const userOnly = assemble('finance', {pattern: 'dashboard-grid'}, {slots: {insights: [userChart]}});
  assert.equal(userOnly.ok, true, JSON.stringify(userOnly.diagnostics));
  assert.deepEqual(userOnly.blueprint.tree.children[2], userChart);
  const assembled = assembleBlueprint(request);
  assert.equal(assembled.ok, false);
  assert.ok(assembled.errors.some(error => error.code === 'ASSEMBLE_CHART_PRESET' && error.path === '$args.intent.chartPresets[0]'));
  assert.deepEqual(request.content.slots.insights[0], userChart);

  const three = assemble('finance', {pattern: 'dashboard-grid', chartPresets: ['finance-monthly-close', 'finance-monthly-close', 'finance-monthly-close']});
  assert.equal(three.ok, false);
  assert.ok(three.diagnostics.some(d => d.code === 'ASSEMBLE_CHART_PRESET'));
  rejected(assemble('finance', {pattern: 'erp-workspace', chartPresets: ['finance-monthly-close']}), 'ASSEMBLE_CHART_PRESET', '$args.intent.chartPresets[0]');
  rejected(assemble('erp', {pattern: 'dashboard-grid', chartPresets: ['erp-quarterly-revenue']}), 'ASSEMBLE_CHART_PRESET', '$args.intent.chartPresets[0]');
});

test('requests the profile does not support are not substituted: diagnostics with alternatives, no Blueprint', () => {
  const pat = rejected(assemble('erp', {pattern: 'marketing-landing'}), 'ASSEMBLE_PATTERN', '$args.intent.pattern');
  assert.deepEqual(pat.alternatives, PROFILES.erp.patterns);
  const den = rejected(assemble('mobile-app', {density: 'compact'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.density');
  assert.deepEqual(den.alternatives, ['comfortable', 'spacious']);
  rejected(assemble('finance', {mode: 'dark'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.mode');
  rejected(assemble('docs', {theme: 'neon'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.theme');
  rejected(assemble('editorial', {typography: 'mono'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.typography');
  rejected(assemble('erp', {shell: 'topbar'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.shell');
  rejected(assemble('erp', {controlSize: 'large'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.controlSize');
  const comp = rejected(assemble('mobile-app', {components: ['table']}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.components[0]');
  assert.deepEqual(comp.alternatives, ['list']);
  rejected(assemble('nope'), 'ASSEMBLE_UNSUPPORTED', '$args.profile');
  // 통합 중인 재료는 "없다"가 아니라 "아직 등록되지 않았다"로 구분해 알린다.
  const without = {registry: designRegistry({base: catalogWithoutIntegrating()})};
  const pend = rejected(assemble('erp', {chartPresets: ['erp-quarterly-revenue']}, {}, without), 'ASSEMBLE_PENDING', '$args.intent.chartPresets[0]');
  assert.deepEqual(pend.alternatives, PROFILES.erp.charts.kinds);
  rejected(assemble('erp', {components: ['component:data-table']}, {}, without), 'ASSEMBLE_PENDING', '$args.intent.components[0]');
  rejected(assemble('commerce', {chartPresets: ['erp-quarterly-revenue']}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.chartPresets[0]');
  // 허용된 요구는 그대로 반영된다(오탐 없음).
  const ok = assemble('erp', {density: 'comfortable', shell: 'rail', controlSize: 'compact', components: ['table', 'kanban']});
  assert.equal(ok.ok, true); assert.equal(ok.blueprint.density, 'comfortable'); assert.equal(ok.blueprint.shell, 'rail'); assert.equal(ok.materials.controlSize, 'compact');
});

test('assemble has no injection path: unknown intent and content keys (css, style, className, html, px, colors) are diagnostics', () => {
  for (const key of ['css', 'style', 'className', 'html', 'color', 'fontSize', 'spacing']) {
    const d = rejected(assemble('saas-landing', {[key]: key === 'color' ? '#ff0000' : '12px'}), 'ASSEMBLE_UNSUPPORTED', `$args.intent.${key}`);
    assert.deepEqual(d.alternatives, INTENT_KEYS);
  }
  rejected(assemble('saas-landing', {}, {css: 'body{}'}), 'ASSEMBLE_UNSUPPORTED', '$args.content.css');
  rejected(assemble('saas-landing', {density: '12px'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.density');
  rejected(assemble('saas-landing', {theme: {css: 'x'}}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.theme');
  rejected(assemble('saas-landing', {components: ['my-widget']}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.components[0]');
  const node = rejected(assemble('saas-landing', {}, {slots: {closing: [{type: 'custom-widget', html: '<b>x</b>'}]}}), 'ASSEMBLE_CONTENT', '$args.content.slots.closing[0]');
  assert.deepEqual(node.alternatives, ['cta']);
  // 슬롯이 받는 부품이어도 알 수 없는 속성은 검증기가 거부한다.
  const r = assemble('saas-landing', {}, {slots: {closing: [{type: 'cta', title: '시작하기', action: {label: '무료로 시작', href: '#main', variant: 'primary'}, style: 'color:red'}]}});
  rejected(r, 'ASSEMBLE_INVALID', '$');
  assert.ok(r.diagnostics.some(d => d.code === 'UNKNOWN_KEY' && d.path.endsWith('.style')));
});

test('content fills pattern slots within their limits; wrong slots, counts and types are rejected', () => {
  const cta = {type: 'cta', title: '오늘 시작하세요', action: {label: '무료로 시작하기', href: '#main', variant: 'primary'}};
  const ok = assemble('saas-landing', {}, {name: '제품 소개', slots: {closing: [cta]}});
  assert.equal(ok.ok, true, JSON.stringify(ok.diagnostics));
  assert.deepEqual(ok.blueprint.tree.children.at(-1), cta); assert.equal(ok.blueprint.name, '제품 소개');
  const empty = assemble('saas-landing', {}, {slots: {closing: []}});
  assert.equal(empty.ok, true); assert.notEqual(empty.blueprint.tree.children.at(-1).type, 'cta');
  rejected(assemble('saas-landing', {}, {slots: {sidebar: [cta]}}), 'ASSEMBLE_SLOT', '$args.content.slots.sidebar');
  rejected(assemble('saas-landing', {}, {slots: {closing: [cta, cta]}}), 'ASSEMBLE_SLOT', '$args.content.slots.closing');
  rejected(assemble('saas-landing', {}, {slots: {hero: []}}), 'ASSEMBLE_SLOT', '$args.content.slots.hero');
  rejected(assemble('mobile-app', {}, {slots: {items: [{type: 'table', title: 't', caption: 'c', columns: ['a', 'b'], rows: []}]}}), 'ASSEMBLE_CONTENT', '$args.content.slots.items[0]');
  // 슬롯과 프로파일이 함께 허용해야 한다: erp-workspace의 work 슬롯은 kanban을 받고 erp는 허용, finance는 금지.
  const work = PATTERNS['erp-workspace'].slots.find(s => s.id === 'work');
  assert.ok(work.accepts.includes('kanban'));
  const kanban = {type: 'kanban', children: [{type: 'lane', title: '대기', children: [{type: 'task', title: '검토'}]}, {type: 'lane', title: '완료', children: [{type: 'task', title: '승인'}]}]};
  assert.equal(assemble('erp', {pattern: 'erp-workspace'}, {slots: {work: [kanban]}}).ok, true);
  rejected(assemble('finance', {pattern: 'erp-workspace'}, {slots: {work: [kanban]}}), 'ASSEMBLE_CONTENT', '$args.content.slots.work[0]');
});

test('defaults the profile chooses are recorded as decisions; conflicts with a requested value are refused instead', () => {
  // aurora 테마의 glow 깊이는 light 모드에서 X05 금지 조합이다. 깊이는 요구하지 않았으므로 프로파일 안의 대안으로 정하고 기록한다.
  const r = assemble('saas-landing', {theme: 'aurora', mode: 'light'});
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.ok(r.decisions.some(d => d.axis === 'elevation' && d.from === 'glow' && d.source === 'X05'), JSON.stringify(r.decisions));
  assert.ok(r.decisions.some(d => d.axis === 'mode' && d.source === 'intent'));
  // neon 테마는 light 모드를 금지한다. 모드는 요구한 값이므로 바꾸지 않고 거부한다.
  rejected(assemble('saas-landing', {theme: 'neon', mode: 'light'}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.mode');
});

test('registered selections pass the pending gate but chart application still requires a compatible resolver target', () => {
  const pre = catalogWithoutIntegrating();
  pre.register(fakeChartPreset(pre, 'chart-preset:erp-quarterly-revenue'));
  pre.register(fakeMaterial(pre, 'component', 'component:data-table', 'form-data-feedback'));
  const registry = designRegistry({base: pre});
  const r = assemble('erp', {pattern: 'dashboard-grid', chartPresets: ['erp-quarterly-revenue'], components: ['component:data-table']}, {}, {registry});
  assert.equal(r.ok, false);
  assert.ok(!codes(r).includes('ASSEMBLE_PENDING'));
  assert.ok(codes(r).includes('ASSEMBLE_CHART_PRESET'), JSON.stringify(r.diagnostics));
  const component = assemble('erp', {components: ['component:data-table']}, {}, {registry});
  assert.equal(component.ok, true, JSON.stringify(component.diagnostics));
  assert.ok(!component.materials.pending.includes('component:data-table'));
  assert.ok(!JSON.stringify(component.blueprint.tree).includes('data-table'), 'component selection does not materialize a node');
  rejected(assemble('erp', {chartPresets: ['erp-quarterly-revenue', 'erp-quarterly-revenue', 'erp-quarterly-revenue', 'erp-quarterly-revenue', 'erp-quarterly-revenue']}, {}, {registry}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.chartPresets');
});

test('the service exposes assembly as assembleBlueprint with the standard envelope and Diagnostic shape, and never throws', () => {
  const props = Object.keys(getSchema({target: 'diagnostic'}).value.properties);
  const shape = r => {
    assert.deepEqual(Object.keys(r), r.ok ? ['ok', 'value', 'warnings', 'catalogVersion', 'contractVersion'] : ['ok', 'errors', 'warnings', 'catalogVersion', 'contractVersion']);
    for (const d of [...(r.errors ?? []), ...r.warnings]) {
      assert.ok(d.code && d.path.startsWith('$') && d.message && d.hint, JSON.stringify(d));
      for (const k of Object.keys(d)) assert.ok(props.includes(k), k);
      if (d.severity) assert.ok(['info', 'warning'].includes(d.severity));
    }
    return r;
  };
  const good = shape(assembleBlueprint({profile: 'commerce', intent: {pattern: 'commerce-detail'}}));
  assert.equal(good.ok, true);
  assert.deepEqual(Object.keys(good.value), ['blueprint', 'decisions', 'materials']);
  assert.equal(JSON.stringify(good.value.blueprint), JSON.stringify(assemble('commerce', {pattern: 'commerce-detail'}).blueprint));
  assert.equal(serviceValidate(good.value.blueprint).ok, true);
  assert.equal(JSON.stringify(assembleBlueprint({profile: 'commerce', intent: {pattern: 'commerce-detail'}})), JSON.stringify(good));
  const den = shape(assembleBlueprint({profile: 'mobile-app', intent: {density: 'compact'}}));
  assert.equal(den.ok, false);
  assert.ok(den.errors[0].code === 'ASSEMBLE_UNSUPPORTED' && den.errors[0].message.includes('대안: comfortable, spacious'));
  const inv = shape(assembleBlueprint({profile: 'saas-landing', content: {slots: {closing: [{type: 'cta', title: '시작', action: {label: '무료로 시작', href: '#main', variant: 'primary'}, style: 'color:red'}]}}}));
  assert.ok(inv.errors.some(e => e.code === 'UNKNOWN_KEY'));
  assert.equal(shape(assembleBlueprint({profile: 'erp', css: 'x'})).errors[0].path, '$args.css');
  const cyc = {}; cyc.self = cyc;
  for (const input of [undefined, null, 0, 'erp', [], cyc, {profile: 5}, {profile: 'erp', intent: cyc}, {profile: 'erp', content: {slots: {work: [cyc]}}}, {profile: 'erp', intent: []}, 1n]) {
    let r; assert.doesNotThrow(() => { r = assembleBlueprint(input); }, String(typeof input));
    assert.equal(shape(r).ok, false);
  }
});
