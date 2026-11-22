import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {
  PROFILES, PROFILE_IDS, PATTERNS, PATTERN_IDS, PROFILE_RULES, PROFILE_AXES, NARROW_STRATEGIES, INFO_DENSITY,
  checkProfile, designRegistry, pendingMaterials, profileIntegrity, assemble, PROFILE_KIND,
} from '../src/profiles/index.mjs';
import {PROFILE_EVIDENCE, PATTERN_EVIDENCE} from '../src/profiles/registry.mjs';
import {createRegistry, catalogRegistry} from '../src/materials/index.mjs';
import {axes, nodeTypes, createBlueprint, migrateBlueprint, blueprintSchema, TOP_LEVEL_SINCE_FIELDS} from '../src/catalog.mjs';
import {validateBlueprint} from '../src/validate.mjs';
import {validateBlueprint as serviceValidate, HINTS, catalogSnapshot} from '../src/service/index.mjs';
import {compile} from '../src/compiler.mjs';
import {catalogWithoutIntegrating, fakeChartPreset} from './profiles-support.mjs';

const root = resolve(import.meta.dirname, '..');
const read = f => readFileSync(resolve(root, f), 'utf8');
const registry = designRegistry();
/** 프로파일 기본 조립 결과. 각 검사는 이 정상 Blueprint에서 값 하나만 바꾼다. */
const base = id => assemble(id).blueprint;
const codes = list => list.map(d => d.code);
const FIELDS = ['contexts', 'density', 'type', 'controlSize', 'tableRows', 'chrome', 'components', 'pendingComponents', 'substitutes', 'patterns', 'charts', 'themes', 'axes', 'color', 'fields', 'narrow', 'quality'];

test('profiles: seven profiles are data with every machine-readable field and register as profile materials whose references resolve', () => {
  assert.deepEqual(PROFILE_IDS, ['erp', 'finance', 'commerce', 'saas-landing', 'editorial', 'docs', 'mobile-app']);
  for (const id of PROFILE_IDS) {
    const p = PROFILES[id];
    assert.deepEqual(Object.keys(p).filter(k => k !== 'label').sort(), [...FIELDS].sort(), id);
    assert.ok(INFO_DENSITY.includes(p.density.info), id);
    assert.ok(p.type.rolePreset.startsWith('type-role-preset:') && registry.has(p.type.rolePreset), id);
    assert.ok(p.controlSize.allowed.includes(p.controlSize.default), id);
    assert.ok(Array.isArray(p.tableRows.variants) && Number.isInteger(p.tableRows.maxColumns), id);
    assert.ok(p.chrome.shells.length && p.chrome.header && p.chrome.sidebar, id);
    assert.ok(p.color.palettes.includes('static-kit') && p.color.modes.length, id);
    const m = registry.get('profile:' + id);
    assert.ok(m, id);
    assert.equal(m.kind, 'profile'); assert.equal(m.category, 'profile'); assert.equal(m.since, '2.6.0');
    assert.ok(registry.isPreset(m), `${id} is a complete preset`);
    for (const dep of m.dependencies) assert.ok(registry.has(dep), `${id} → ${dep}`);
    for (const c of m.ext.components) assert.ok(registry.has(c), `${id} allows registered ${c}`);
  }
  assert.deepEqual(registry.check(), []);
  assert.deepEqual(profileIntegrity(registry), []);
  assert.equal(registry.counts().byKind.profile, 7);
  // catalogRegistry() 자체는 그대로다(패턴 0개 계약을 바꾸지 않는다).
  assert.equal(catalogRegistry().byKind('pattern').length, 0);
});

test('patterns: eleven layout patterns reuse a template, primitives and recipes, and carry slots with allowed components and limits', () => {
  assert.equal(PATTERN_IDS.length, 11);
  for (const want of ['erp-workspace', 'dashboard-grid', 'commerce-listing', 'commerce-detail', 'commerce-checkout', 'marketing-landing', 'docs-reference', 'admin-settings', 'mobile-navigation', 'mobile-form']) assert.ok(PATTERN_IDS.includes(want), want);
  for (const id of PATTERN_IDS) {
    const m = registry.get('pattern:' + id), pt = PATTERNS[id];
    assert.ok(m && registry.isPreset(m), id);
    assert.ok(m.dependencies.includes('template:' + pt.template), id);
    assert.ok(m.dependencies.some(d => d.startsWith('layout-primitive:')), id);
    if (pt.recipe) assert.ok(m.dependencies.includes('recipe:' + pt.recipe), id);
    for (const s of m.ext.slots) {
      assert.ok(s.accepts.length && s.min <= s.max, `${id}.${s.id}`);
      for (const c of s.materials) assert.ok(registry.has(c), `${id}.${s.id} → ${c}`);
    }
    assert.ok(m.structure.children.max <= pt.maxTopLevel, id);
  }
});

test('profile integrity rejects a profile whose references or relations break', () => {
  // 존재하지 않는 패턴을 가리키면 참조 검사가, 품질 하한을 넘는 재료를 가리키면 프로파일 무결성이 거부한다.
  const r = designRegistry();
  const m = structuredClone(r.get('profile:erp'));
  const broken = createRegistry({kinds: [...r.kinds()]});
  for (const x of r.list()) if (x.id !== 'profile:erp') broken.register(structuredClone(x));
  broken.register({...m, dependencies: [...m.dependencies, 'pattern:nope']});
  assert.ok(broken.check().some(e => e.code === 'M_REFERENCE' && e.message.includes('pattern:nope')));
  const weak = createRegistry({kinds: [...r.kinds()]});
  for (const x of r.list()) weak.register(x.id === 'component:table' ? {...structuredClone(x), quality: {status: 'enum-only', evidence: []}, render: null} : structuredClone(x));
  assert.ok(profileIntegrity(weak).some(e => e.code === 'M_PROFILE_QUALITY' && e.message.includes('component:table')));
  assert.ok(PROFILE_KIND.presetCapable);
});

test('quality evidence of profile and pattern materials points at real tests', () => {
  for (const ref of [...PROFILE_EVIDENCE, ...PATTERN_EVIDENCE]) {
    const [file, line] = ref.split(':');
    assert.match(read(file).split('\n')[+line - 1], /^test\(/, ref);
  }
});

test('narrow-screen strategies point at CSS or renderer code that exists', () => {
  for (const [name, s] of Object.entries(NARROW_STRATEGIES)) if (s.module) assert.ok(read(s.module).includes(s.marker), `${name}: ${s.module}`);
  for (const id of PROFILE_IDS) for (const [k, v] of Object.entries(PROFILES[id].narrow)) if (k !== 'maxWidth') assert.ok(NARROW_STRATEGIES[v], `${id}.${k}`);
});

test('pending materials (chart presets, Select, data table) stay out of the allow list until they are registered', () => {
  const without = designRegistry({base: catalogWithoutIntegrating()}), pending = pendingMaterials(without);
  assert.ok(pending.erp.includes('chart-preset:erp-quarterly-revenue') && pending.erp.includes('component:data-table'));
  assert.deepEqual(without.get('profile:erp').ext.charts.presets, []);
  assert.ok(!without.get('profile:erp').ext.components.includes('component:data-table'));
  // 같은 id가 등록된 레지스트리에서는 허용 목록으로 옮겨 간다.
  const pre = catalogWithoutIntegrating();
  pre.register(fakeChartPreset(pre, 'chart-preset:erp-quarterly-revenue'));
  const r = designRegistry({base: pre});
  assert.deepEqual(r.get('profile:erp').ext.charts.presets, ['chart-preset:erp-quarterly-revenue']);
  assert.ok(!r.get('profile:erp').ext.pending.includes('chart-preset:erp-quarterly-revenue'));
  assert.ok(r.get('profile:erp').dependencies.includes('chart-preset:erp-quarterly-revenue'));
  // 기본 레지스트리의 대기 목록은 실제로 없는 id만 담는다.
  for (const ids of Object.values(pendingMaterials(registry))) for (const id of ids) assert.ok(!registry.has(id), id);
});

test('Blueprint 2.6.0 accepts profile behind a version gate; older versions and unknown ids are rejected', () => {
  const s = blueprintSchema().properties.profile;
  assert.deepEqual(s.enum, PROFILE_IDS); assert.equal(s['x-since'], '2.6.0');
  assert.deepEqual(TOP_LEVEL_SINCE_FIELDS.map(f => f.field), ['colorPalette', 'typeRoles', 'controlSize'], 'profile stays out of the top-level since list');
  const old = {...migrateBlueprint(createBlueprint('admin-table'), '2.5.0'), profile: 'erp'};
  assert.ok(validateBlueprint(old).errors.some(e => e.path === '$.profile' && e.code === 'VERSION_FIELD'));
  const unknown = {...base('erp'), profile: 'banking'};
  assert.ok(validateBlueprint(unknown).errors.some(e => e.path === '$.profile' && e.code === 'ENUM'));
  for (const id of PROFILE_IDS) assert.deepEqual(validateBlueprint(base(id)).errors, [], id);
});

test('profile diagnostics carry code, path, severity, reason and an alternative; the service keeps rule, fix and a hint', () => {
  const b = {...base('mobile-app'), density: 'compact'};
  const [d] = checkProfile(b).filter(x => x.code === 'PROFILE_DENSITY');
  assert.deepEqual(Object.keys(d).sort(), ['alternatives', 'code', 'fix', 'message', 'path', 'reason', 'rule', 'severity']);
  assert.equal(d.path, '$.density'); assert.equal(d.severity, 'error'); assert.equal(d.rule, 'PF03');
  assert.deepEqual(d.fix, {density: 'comfortable'}); assert.deepEqual(d.alternatives, ['comfortable', 'spacious']);
  assert.ok(d.reason.includes('정보 밀도'));
  const r = serviceValidate(b);
  assert.equal(r.ok, false);
  const s = r.errors.find(e => e.code === 'PROFILE_DENSITY');
  assert.equal(s.rule, 'PF03'); assert.deepEqual(s.fix, {density: 'comfortable'}); assert.equal(s.hint, HINTS.PROFILE_DENSITY);
  assert.ok(s.message.includes('근거:') && s.message.includes('대안:'));
});

test('every new diagnostic code has a hint and every profile rule has one code', () => {
  for (const r of PROFILE_RULES) assert.ok(HINTS[r.code], r.code);
  assert.equal(new Set(PROFILE_RULES.map(r => r.code)).size, PROFILE_RULES.length);
  const emitted = new Set([...read('src/profiles/check.mjs').matchAll(/'(PROFILE_[A-Z_]+)'/g), ...read('src/profiles/assemble.mjs').matchAll(/'(ASSEMBLE_[A-Z_]+)'/g)].map(m => m[1]));
  assert.ok(emitted.size >= 19, [...emitted].join(','));
  for (const code of emitted) assert.ok(HINTS[code], code);
});

// ---- 정상 조합 통과와 금지 조합 거부를 같은 오라클로 대조한다(오탐·미탐) ----

test('axis oracle: every catalog value of every profile-limited axis is flagged exactly when the profile does not allow it', () => {
  const limited = {density: p => p.density.allowed, typography: p => p.type.typography, shell: p => p.chrome.shells, mode: p => p.color.modes, footer: p => p.chrome.footer, ...Object.fromEntries(PROFILE_AXES.map(a => [a, p => p.axes[a]]))};
  const CODE = {density: 'PROFILE_DENSITY', typography: 'PROFILE_TYPOGRAPHY', shell: 'PROFILE_SHELL', mode: 'PROFILE_MODE'};
  let pass = 0, fail = 0;
  for (const id of PROFILE_IDS) {
    const p = PROFILES[id], b0 = base(id);
    for (const [axis, allowedOf] of Object.entries(limited)) for (const value of axes[axis]) {
      const hits = checkProfile({...b0, [axis]: value}).filter(d => d.path === '$.' + axis && d.code === (CODE[axis] ?? 'PROFILE_AXIS'));
      const allowed = allowedOf(p).includes(value);
      assert.equal(hits.length, allowed ? 0 : 1, `${id}: ${axis}=${value} allowed=${allowed}`);
      allowed ? pass++ : fail++;
    }
  }
  assert.ok(pass > 100 && fail > 100, `${pass} allowed, ${fail} rejected`);
});

test('component oracle: each node type is flagged exactly when the profile does not allow it, with the declared substitute as the fix', () => {
  for (const id of PROFILE_IDS) {
    const p = PROFILES[id], b0 = base(id);
    for (const type of nodeTypes.filter(t => t !== 'page')) {
      const b = {...b0, tree: {type: 'page', children: [...b0.tree.children, {type}]}};
      const hits = checkProfile(b).filter(d => d.code === 'PROFILE_COMPONENT');
      assert.equal(hits.length, p.components.includes(type) ? 0 : 1, `${id}: ${type}`);
      if (hits.length && p.substitutes[type]) assert.deepEqual(hits[0].fix, {type: p.substitutes[type]});
    }
  }
});

test('theme, page type, color, table, chart, field and quality rules reject their forbidden cases and pass the allowed ones', () => {
  const only = (b, code) => codes(checkProfile(b)).filter(c => c === code).length;
  for (const id of PROFILE_IDS) {
    const p = PROFILES[id], b0 = base(id);
    assert.deepEqual(checkProfile(b0), [], `${id} default passes`);
    for (const theme of p.themes) assert.equal(only({...b0, theme}, 'PROFILE_THEME'), 0, `${id} ${theme}`);
    assert.equal(only({...b0, theme: 'kids'}, 'PROFILE_THEME'), 1, id);
    for (const pageType of p.contexts) assert.equal(only({...b0, pageType}, 'PROFILE_PAGE_TYPE'), 0);
    assert.equal(only({...b0, pageType: 'portfolio'}, 'PROFILE_PAGE_TYPE'), 1, id);
    const {colorPalette, ...noColor} = b0;
    assert.equal(colorPalette, 'static-kit');
    assert.equal(only(noColor, 'PROFILE_COLOR'), 1, id);
  }
  const erp = base('erp'), table = erp.tree.children.find(n => n.type === 'table');
  const withTable = patch => ({...erp, tree: {type: 'page', children: erp.tree.children.map(n => (n === table ? {...n, ...patch} : n))}});
  assert.equal(only(withTable({variant: 'striped'}), 'PROFILE_TABLE'), 0);
  const ed = base('editorial');
  const edTable = {...ed, tree: {type: 'page', children: [...ed.tree.children, {type: 'table', title: '표', caption: '표', columns: ['a', 'b'], rows: [['1', '2']], variant: 'striped'}]}};
  assert.ok(checkProfile(edTable).some(d => d.code === 'PROFILE_TABLE' && d.path.endsWith('.variant')));
  const wide = {...edTable, tree: {type: 'page', children: [...ed.tree.children, {type: 'table', title: '표', caption: '표', columns: ['a', 'b', 'c', 'd', 'e'], rows: []}]}};
  assert.ok(checkProfile(wide).some(d => d.code === 'PROFILE_TABLE' && d.path.endsWith('.columns')));
  assert.equal(only({...erp, density: 'comfortable'}, 'PROFILE_TABLE'), 0);
  const chart = kind => ({type: 'chart', title: '추이', caption: '월별', kind, categories: ['1월', '2월'], series: [{name: 'a', values: [1, 2]}]});
  const fin = base('finance'), withCharts = list => ({...fin, tree: {type: 'page', children: [...fin.tree.children, ...list]}});
  assert.equal(only(withCharts([chart('donut')]), 'PROFILE_CHART'), 0);
  assert.equal(only({...erp, tree: {type: 'page', children: [...erp.tree.children, chart('donut')]}}, 'PROFILE_CHART'), 1);
  const finCharts = JSON.stringify(fin.tree).match(/"type":"chart"/g)?.length ?? 0;
  assert.equal(only(withCharts(Array.from({length: 3 - finCharts}, () => chart('line'))), 'PROFILE_CHART'), 0);
  assert.equal(only(withCharts(Array.from({length: 4 - finCharts}, () => chart('line'))), 'PROFILE_CHART'), 1);
  const mob = base('mobile-app'), form = {type: 'form', title: '가입', submitLabel: '가입하기', fields: [{id: 'email', label: '이메일', kind: 'email'}]};
  assert.equal(only({...mob, tree: {type: 'page', children: [...mob.tree.children, {...form, variant: 'stacked'}]}}, 'PROFILE_FIELD'), 0);
  assert.equal(only({...mob, tree: {type: 'page', children: [...mob.tree.children, {...form, variant: 'two-column'}]}}, 'PROFILE_FIELD'), 1);
  const nav = n => Array.from({length: n}, (_, i) => ({label: `메뉴 ${i + 1}`, href: '#main', icon: 'home'}));
  assert.equal(only({...mob, chrome: {...mob.chrome, nav: nav(5)}}, 'PROFILE_QUALITY'), 0);
  assert.equal(only({...mob, chrome: {...mob.chrome, nav: nav(6)}}, 'PROFILE_QUALITY'), 1);
  const many = n => ({...mob, tree: {type: 'page', children: [mob.tree.children[0], ...Array.from({length: n - 1}, () => ({type: 'divider'}))]}});
  assert.equal(only(many(6), 'PROFILE_QUALITY'), 0);
  assert.equal(only(many(7), 'PROFILE_QUALITY'), 1);
});

// ---- Blueprint로 임의 디자인을 주입하는 경로가 없다 ----

test('no injection path: arbitrary CSS, px or color values and unregistered component implementations are rejected as diagnostics', () => {
  const b0 = base('erp');
  const attempts = [
    [{...b0, css: 'body{color:red}'}, '$.css', 'UNKNOWN_KEY'],
    [{...b0, style: {color: '#f00'}}, '$.style', 'UNKNOWN_KEY'],
    [{...b0, className: 'my-brand'}, '$.className', 'UNKNOWN_KEY'],
    [{...b0, density: '12px'}, '$.density', 'ENUM'],
    [{...b0, radius: '7px'}, '$.radius', 'ENUM'],
    [{...b0, width: 'calc(100% - 10px)'}, '$.width', 'ENUM'],
    [{...b0, colorPalette: '#ff0000'}, '$.colorPalette', 'ENUM'],
    [{...b0, palette: 'rgb(1,2,3)'}, '$.palette', 'ENUM'],
    [{...b0, profile: {density: 'compact', css: 'x'}}, '$.profile', 'ENUM'],
    [{...b0, typography: 'Comic Sans MS'}, '$.typography', 'ENUM'],
    [{...b0, tree: {type: 'page', children: [...b0.tree.children, {type: 'custom-widget', html: '<div onclick=alert(1)>'}]}}, '$.tree.children[4].type', 'NODE_TYPE'],
    [{...b0, tree: {type: 'page', children: [{...b0.tree.children[0], style: 'color:red'}, ...b0.tree.children.slice(1)]}}, '$.tree.children[0].style', 'UNKNOWN_KEY'],
    [{...b0, tree: {type: 'page', children: [...b0.tree.children, {type: 'hero', title: 'x'}]}}, '$.tree.children[4].type', 'PROFILE_COMPONENT'],
  ];
  for (const [b, path, code] of attempts) {
    const r = validateBlueprint(b);
    assert.equal(r.valid, false, path);
    assert.ok(r.errors.some(e => e.path === path && e.code === code), `${path} ${code}: ${JSON.stringify(r.errors.slice(0, 3))}`);
    assert.throws(() => compile(b), /Invalid blueprint/);
  }
  // 텍스트로 들어온 마크업은 글자로 출력된다(코드로 실행되지 않는다).
  const html = compile({...b0, name: '<script>alert(1)</script>'}).html;
  assert.ok(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'));
});

test('profile is a constraint, not a style source: compiling with and without it gives the same HTML and CSS', () => {
  for (const id of ['erp', 'saas-landing', 'mobile-app']) {
    const b = base(id), {profile, ...without} = b;
    const a = compile(b), c = compile(without);
    assert.equal(a.html, c.html, id); assert.equal(a.css, c.css, id);
  }
});

test('catalog snapshot and Blueprint output of 2.4.0 and 2.5.0 do not change or mention profiles', () => {
  const snap = JSON.stringify(catalogSnapshot());
  // 기준 커밋 14914b80d(feat/material-platform)의 catalogSnapshot() sha256. 프로파일 규칙은 snapshot의 rules·expressionRules에 들어가지 않는다.
  assert.equal(createHash('sha256').update(snap).digest('hex'), '343972dd86fa42a7d9ac9bf8e6e910c340c5b769156c6e8f5241658a8928de25');
  assert.ok(!snap.includes('PROFILE_') && !snap.includes('pattern:'));
  for (const v of ['2.4.0', '2.5.0']) assert.equal(compile(migrateBlueprint(createBlueprint('admin-table'), v)).manifest.blueprint.profile, undefined);
});
