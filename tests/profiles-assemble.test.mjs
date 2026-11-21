import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assemble, designRegistry, PROFILES, PROFILE_IDS, PATTERNS, INTENT_KEYS} from '../src/profiles/index.mjs';
import {catalogWithoutIntegrating, fakeChartPreset} from './profiles-support.mjs';
import {defineMaterial} from '../src/materials/index.mjs';
import {validateBlueprint} from '../src/validate.mjs';
import {validateBlueprint as serviceValidate, HINTS} from '../src/service/index.mjs';
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

test('materials registered later (chart presets, data table) widen what assemble accepts without code changes', () => {
  const pre = catalogWithoutIntegrating();
  pre.register(fakeChartPreset('chart-preset:erp-quarterly-revenue'));
  pre.register(defineMaterial({id: 'component:data-table', kind: 'component', category: 'form-data-feedback', label: 'fake', since: '2.6.0', render: {module: 'src/render/nodes.mjs', export: 'makeRenderer'}, quality: {status: 'implemented', evidence: []}, ext: {nodeType: 'data-table', group: 'data', fields: [], required: []}}));
  const registry = designRegistry({base: pre});
  const r = assemble('erp', {chartPresets: ['erp-quarterly-revenue'], components: ['component:data-table']}, {}, {registry});
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.deepEqual(r.materials.chartPresets, ['chart-preset:erp-quarterly-revenue']);
  assert.ok(!r.materials.pending.includes('component:data-table'));
  rejected(assemble('erp', {chartPresets: ['erp-quarterly-revenue', 'erp-quarterly-revenue', 'erp-quarterly-revenue', 'erp-quarterly-revenue', 'erp-quarterly-revenue']}, {}, {registry}), 'ASSEMBLE_UNSUPPORTED', '$args.intent.chartPresets');
});
