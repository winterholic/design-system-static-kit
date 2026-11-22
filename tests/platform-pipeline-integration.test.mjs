import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform, assemblePage, assembleFamilies, bindColor, bindType, diversify} from '../src/platform/index.mjs';
import {assembleChartPreset} from '../src/platform/data/charts.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {combinationMatrix, getPurposeFamily, PURPOSE_FAMILY_IDS} from '../src/platform/families/index.mjs';
import {spaceVars} from '../src/spacing.mjs';
import {assembleDesign, compileBlueprint} from '../src/service/index.mjs';

const env = createPlatform();
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));
const CONTENT = {title: '운영 현황', kpis: kpis(4), table: {title: '작업', columns: ['작업', '담당', '상태'], rows: [['a', 'b', 'c'], ['d', 'e', 'f']]}, status: {state: 'success', title: '저장했습니다'}};
const shellTag = html => html.match(/<div class="kit-shell"[^>]*>/)[0];

test('candidate diversity computes each family signature once while preserving ranked selection', () => {
  const serialized = new Map();
  const candidate = (id, score, palette, family) => ({id, score, selection: {
    palette, subtokenSet: 'set', typeSystem: 'type',
    families: {card: {toJSON() { serialized.set(id, (serialized.get(id) ?? 0) + 1); return family; }}},
  }});
  const candidates = [
    candidate('a', 100, 'p1', 'f1'),
    candidate('b', 99, 'p1', 'f1'),
    candidate('c', 90, 'p2', 'f2'),
    candidate('d', 80, 'p3', 'f3'),
  ];
  const result = diversify(candidates);
  assert.deepEqual(result.map(x => x.id), ['a', 'c', 'b', 'd']);
  assert.deepEqual(result.map(x => x.adjusted), [100, 74, 67, 64]);
  assert.deepEqual(Object.fromEntries(serialized), {a: 1, b: 1, c: 1, d: 1});
});

test('same request, only the style context changes: the CSS, the shell scope and the chosen visual materials change with it', () => {
  const run = styleContext => assemblePage({purpose: 'work-dashboard', mode: 'dark', candidates: 1, styleContext, content: CONTENT}, env);
  const ids = ['style-context:ledger', 'style-context:workspace', 'style-context:aurora', 'style-context:cloud', 'style-context:console'];
  const results = ids.map(id => ({id, r: run(id)}));
  for (const {id, r} of results) assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.diagnostics)}`);
  const css = results.map(x => x.r.value.css), shells = results.map(x => shellTag(x.r.value.html)), picks = results.map(x => JSON.stringify(x.r.plan.style));
  assert.equal(new Set(css).size, ids.length, 'every style context yields different CSS');
  assert.ok(new Set(shells).size >= 3, `the shell scope attributes differ across contexts: ${shells.join('\n')}`);
  assert.ok(new Set(picks).size >= 3, 'the style materials differ across contexts');
  // the same request without a style context is a fifth, different page, and each context's page keeps its own surface variables
  const none = assemblePage({purpose: 'work-dashboard', mode: 'dark', candidates: 1, content: CONTENT}, env);
  assert.ok(!css.includes(none.value.css));
  for (const {r} of results) {
    const surface = r.value.manifest.platform.styleMaterials.surface;
    assert.ok(r.value.css.includes(`[data-surface="${surface.split(':')[1]}"]{--kit-radius:`), surface);
    assert.ok(r.value.html.includes(`data-surface="${surface.split(':')[1]}"`));
  }
  // a context that bans a value never lets that value into the page: ledger bans glow, so no ledger candidate carries the glow surface
  const ledger = assemblePage({purpose: 'work-dashboard', mode: 'dark', candidates: 4, styleContext: 'style-context:ledger', content: CONTENT}, env);
  assert.ok(ledger.candidates.every(c => c.value.manifest.platform.styleMaterials.surface !== 'surface:glow-glass'));
});

test('purpose families are placed in the page: requested purposes render through the candidate visual family and reach the stored Blueprint', () => {
  const kpi = getPurposeFamily('purpose:card.kpi');
  const comps = [0, 1, 2].map(i => ({purpose: 'purpose:card.kpi', id: `kpi-${i}`, variant: kpi.example.variant, props: kpi.example.props, content: {...kpi.example.content, label: `지표 ${i}`}}));
  const r = assemblePage({purpose: 'work-dashboard', candidates: 3, content: {title: '운영', kpis: kpis(3)}, components: comps}, env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal((r.value.html.match(/data-purpose="card\.kpi"/g) ?? []).length, 3, 'three KPI cards from the purpose family');
  assert.ok(r.value.html.includes('지표 0') && r.value.html.includes('지표 2'));
  assert.ok(r.value.css.includes(kpi.css.slice(0, 80)), 'the purpose CSS ships with the page');
  const visuals = r.candidates.map(c => c.selection.families['purpose:card.kpi']);
  assert.equal(new Set(visuals).size, r.candidates.length, 'candidates differ in the visual family the purpose is drawn with');
  for (const c of r.candidates) {
    assert.match(c.value.html, new RegExp(`class="pf pf-card-kpi" data-family="${c.selection.families['purpose:card.kpi'].slice('family:'.length)}"`));
    assert.ok(c.value.manifest.platform.contrast.components.some(x => x.base === 'purpose:card.kpi' && x.pairs.length), 'purpose contrast pairs are checked');
    assert.deepEqual(c.value.blueprint.materials.purposes.map(p => p.visual), Array(3).fill(c.selection.families['purpose:card.kpi']));
    assert.equal(c.quality.ok, true, JSON.stringify(c.quality.tokens));
  }
  // the page and the stored Blueprint agree
  const viaService = assembleDesign({purpose: 'work-dashboard', candidates: 2, content: {title: '운영', kpis: kpis(3)}, components: comps}, {include: ['blueprint', 'standalone', 'css', 'tokens']});
  for (const c of viaService.value.candidates) {
    const k = compileBlueprint(c.value.blueprint, {include: ['html', 'css', 'tokens']});
    assert.equal(k.ok, true, JSON.stringify(k.errors));
    assert.equal(k.value.html, c.value.standalone);
    assert.equal(k.value.css, c.value.css);
    assert.match(c.value.blueprint.tree.children.map(n => JSON.stringify(n)).join(''), /platform-purpose-0/);
  }
});

test('purpose requests are checked: unknown ids, the wrong page type, values the family does not have, and visuals that cannot draw it', () => {
  const card = {purpose: 'purpose:card.kpi', content: getPurposeFamily('purpose:card.kpi').example.content};
  const dash = components => assemblePage({purpose: 'work-dashboard', candidates: 2, content: {title: '운영', kpis: kpis(3)}, components}, env);
  const two = c => [{...c, id: 'one'}, {...c, id: 'two'}]; // 격자는 2칸 이상이라 컴포넌트를 둘 준다
  const unknown = dash([{purpose: 'purpose:card.nope', content: {}}]);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.diagnostics[0].code, 'P_PAGE_COMPONENT');
  assert.deepEqual(unknown.diagnostics[0].alternatives, PURPOSE_FAMILY_IDS);
  const wrongPage = assemblePage({purpose: 'saas-landing', content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}]}, components: [card]}, env);
  assert.equal(wrongPage.ok, false);
  assert.match(wrongPage.diagnostics[0].message, /dashboard, data|페이지용이 아닙니다/);
  assert.equal(dash([{purpose: 'purpose:card.kpi', base: 'base-component:card-surface', content: {}}]).diagnostics[0].code, 'P_REQUEST_COMPONENTS', 'either base or purpose');
  const badVariant = dash(two({...card, variant: {layout: 'nope'}}));
  assert.equal(badVariant.ok, false);
  assert.ok(JSON.stringify(badVariant.blocked).includes('P_PURPOSE_VARIANT'), 'every visual is blocked with the variant reason');
  const missing = dash(two({purpose: 'purpose:card.kpi', content: {}}));
  assert.equal(missing.ok, false);
  assert.ok(JSON.stringify(missing.blocked).includes('P_PURPOSE_CONTENT'));
  // a pair the combination matrix rejects is refused with the family's reason, and the matrix and the page agree
  const matrix = combinationMatrix(env).flatMap(row => Object.entries(row.cells).filter(([, c]) => !c.ok).map(([visual, c]) => ({purpose: row.purpose, visual, c})));
  const rejected = matrix.find(x => getPurposeFamily(x.purpose).group === 'table' && getPurposeFamily(x.purpose).contexts.includes('dashboard'));
  assert.ok(rejected, 'the matrix rejects at least one table purpose × visual pair');
  {
    const f = getPurposeFamily(rejected.purpose);
    const r = dash([{purpose: rejected.purpose, family: rejected.visual, variant: f.example.variant, props: f.example.props, content: f.example.content}]); // 표는 상세 칸이 직접 받는다
    assert.equal(r.ok, false, `${rejected.purpose} × ${rejected.visual}`);
    assert.ok(JSON.stringify(r.blocked).includes(rejected.c.reasons[0].code), JSON.stringify(rejected.c.reasons));
  }
});

test('chart assembly has no undefined variable once the type tokens come with the legacy role sizes: all 29 presets under every type system', () => {
  const palette = env.registry.get('palette:static-kit'), color = bindColor(palette, env.registry.get('subtoken-set:standard'), 'light');
  const spacing = Object.fromEntries(spaceVars('comfortable').split(';').map(d => d.split(':')));
  let checked = 0;
  for (const ts of env.registry.list('type-system')) {
    const type = bindType(ts, {legacyRoles: true});
    assert.equal(type.ok, true, ts.id);
    const tokens = {...color.vars, ...type.vars, ...spacing};
    for (const m of chartPresetMaterials) {
      const r = assembleChartPreset({preset: m.id, context: m.contexts[0], tokens});
      assert.equal(r.ok, true, `${ts.id} ${m.id}: ${JSON.stringify(r.diagnostics)}`);
      assert.deepEqual(r.missing, [], `${ts.id} ${m.id}`);
      checked++;
    }
  }
  assert.ok(checked >= 29 * 14);
  // the default bindType keeps the pinned 2.6.0 variable set, so the old gap is still visible without the option
  const plain = bindType(env.registry.get('type-system:tech-erp'));
  const still = assembleChartPreset({preset: 'chart-preset:finance-price-candles', context: 'dashboard', tokens: {...color.vars, ...plain.vars, ...spacing}});
  assert.ok(still.missing.includes('--kit-t-micro'));
  assert.deepEqual(assembleChartPreset({preset: 'chart-preset:finance-price-candles', context: 'dashboard', tokens: {...color.vars, ...bindType(env.registry.get('type-system:tech-erp'), {legacyRoles: true}).vars, ...spacing}}).missing, []);
});

test('the page output of every purpose defines every variable its CSS reads, charts included', () => {
  for (const preset of chartPresetMaterials.slice(0, 29).map(m => m.id)) {
    const r = assemblePage({purpose: 'work-dashboard', candidates: 2, content: {title: 'x', kpis: kpis(2), charts: [{preset}]}}, env);
    assert.equal(r.ok, true, `${preset}: ${JSON.stringify(r.diagnostics)}`);
    for (const c of r.candidates) assert.deepEqual(c.quality.tokens.missing, [], `${preset} rank ${c.rank}`);
  }
});

test('page content promotes KPI, analytic and business tables, commerce and editorial cards, and feature cards to purpose families', () => {
  const cases = [
    [{purpose: 'work-dashboard', candidates: 1, content: {kpis: kpis(3)}}, 'purpose:card.kpi'],
    [{purpose: 'work-dashboard', candidates: 1, content: {table: {title: '분석', columns: ['채널', '매출'], rows: [['앱', '3']], kind: 'analytic'}}}, 'purpose:table.analytic'],
    [{purpose: 'work-dashboard', candidates: 1, content: {table: {title: '주문', columns: ['주문', '상태'], rows: [['A-1', '완료']], kind: 'business'}}}, 'purpose:table.business'],
    [{purpose: 'commerce', pattern: 'commerce-listing', candidates: 1, content: {products: [{title: 'A', price: '1원'}, {title: 'B', price: '2원'}]}}, 'purpose:card.product'],
    [{purpose: 'saas-landing', candidates: 1, content: {features: [{title: 'A', body: 'a', icon: 'shield'}, {title: 'B', body: 'b', icon: 'cart'}]}}, 'purpose:card.feature'],
    [{purpose: 'editorial-docs', pattern: 'editorial-article', families: ['family:soft'], candidates: 1, content: {sections: [{title: '기사 모음', body: '최근 글을 모았습니다.'}], articles: [{title: 'A', excerpt: '요약 내용'}, {title: 'B', excerpt: '다른 요약'}]}}, 'purpose:card.article'],
    [{purpose: 'saas-landing', candidates: 1, content: {pricing: [{plan: '기본', price: '1원', features: ['하나'], ctaLabel: '시작'}, {plan: '팀', price: '2원', features: ['둘'], ctaLabel: '시작'}]}}, 'purpose:card.pricing'],
  ];
  for (const [request, id] of cases) {
    const r = assemblePage(request, env);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.diagnostics)}`);
    assert.match(r.value.html, new RegExp(`data-purpose="${id.slice('purpose:'.length)}"`));
  }
});

test('explicit components override automatic purpose promotions and Blueprint recompilation preserves the exact page bytes', () => {
  const request = {purpose: 'work-dashboard', pattern: 'dashboard-grid', candidates: 1, content: {title: '운영', kpis: kpis(2)}, components: [
    {purpose: 'purpose:card.kpi', id: 'custom-kpi', slot: 'kpis', variant: {layout: 'inline'}, content: {...getPurposeFamily('purpose:card.kpi').example.content, label: '직접 요청'}},
    {purpose: 'purpose:card.kpi', id: 'custom-kpi-two', slot: 'kpis', variant: {layout: 'inline'}, content: {...getPurposeFamily('purpose:card.kpi').example.content, label: '두 번째 요청'}},
  ]};
  const r = assembleDesign(request, {include: ['blueprint', 'standalone', 'css']});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const candidate = r.value.candidates[0];
  assert.match(candidate.value.standalone, /data-purpose="card\.kpi"/);
  assert.match(candidate.value.standalone, /직접 요청/);
  assert.doesNotMatch(candidate.value.standalone, /이번 달 매출/);
  const compiled = compileBlueprint(candidate.value.blueprint, {include: ['html', 'css']});
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  assert.equal(compiled.value.html, candidate.value.standalone);
  assert.equal(compiled.value.css, candidate.value.css);
});

test('the purpose-family assembly entry applies the same X01 reason as recommendation and compatibility', () => {
  const f = getPurposeFamily('purpose:navigation.bottom');
  const result = assembleFamilies(env, {context: 'dashboard', mode: 'light', density: 'compact', styleContext: 'style-context:workspace', items: [
    {purpose: f.id, visual: 'family:quiet', variant: f.example.variant, props: f.example.props, content: f.example.content},
  ]});
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(x => x.code === 'P_REL_FORBIDS' && x.message.startsWith('X01:')));
});

test('boolean purpose props survive the Blueprint 2.7 schema and compile to the assembled table bytes', () => {
  const f = getPurposeFamily('purpose:table.business');
  const request = {purpose: 'work-dashboard', pattern: 'dashboard-grid', candidates: 1, components: [
    {purpose: f.id, slot: 'detail', variant: {toolbar: 'none'}, props: {sortable: false, selectable: false}, content: f.example.content},
  ]};
  const assembled = assembleDesign(request, {include: ['blueprint', 'standalone', 'css']});
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors));
  const candidate = assembled.value.candidates[0];
  assert.match(candidate.value.standalone, /data-purpose="table\.business"/);
  assert.equal(candidate.value.blueprint.materials.purposes[0].props.sortable, false);
  const compiled = compileBlueprint(candidate.value.blueprint, {include: ['html', 'css']});
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
  assert.equal(compiled.value.html, candidate.value.standalone);
  assert.equal(compiled.value.css, candidate.value.css);
});
