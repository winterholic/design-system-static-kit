import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlatform, createPlatformRegistry, assemblePage, definePlatformMaterial, PLATFORM_KINDS, KIND_SPECS, STYLE_MATERIAL_KINDS, STATE_KINDS,
  checkStyleMaterials, rankStyleMaterials, assembleStyleMaterials, surfaceScopeCSS, STYLE_VALIDATORS, materialAxisIds,
} from '../src/platform/index.mjs';
import {rankStyleMaterials as rankWrapped, assembleStyleMaterials as assembleWrapped, STYLE_MATERIALS, STYLE_CONTEXTS} from '../src/platform/data/style-contexts.mjs';
import {SURFACES} from '../src/platform/data/surfaces.mjs';

const env = createPlatform();
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));
const dash = (content = {}, extra = {}) => assemblePage({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: kpis(4), ...content}, ...extra}, env);
const rows = [['작업 1', '담당 1', '진행'], ['작업 2', '담당 2', '완료']];
const table = extra => ({title: '작업', columns: ['작업', '담당', '상태'], rows, ...extra});
const codes = r => r.diagnostics.map(d => d.code);
const shell = html => html.match(/<div class="kit-shell"[^>]*>/)[0];

test('the five style material kinds are platform kinds, registered with their data and checked by the registry', () => {
  assert.deepEqual(STYLE_MATERIAL_KINDS, ['surface', 'motion', 'background', 'media', 'state-pattern']);
  for (const k of STYLE_MATERIAL_KINDS) {
    assert.ok(PLATFORM_KINDS.includes(k) && KIND_SPECS[k], k);
    assert.deepEqual(env.registry.list(k).map(m => m.id), STYLE_MATERIALS[k].map(m => m.id).sort(), `${k} registered one for one`);
    assert.ok(typeof STYLE_VALIDATORS[k] === 'function');
  }
  assert.deepEqual(checkStyleMaterials(env.registry), []);
  assert.deepEqual(env.registry.check(), []);
  // the semantic validator runs on registration, not only the shape check
  const surface = structuredClone(SURFACES[0]);
  const bad = definePlatformMaterial({...JSON.parse(JSON.stringify(surface)), id: 'surface:bad-radius-test', levels: {...surface.levels, base: {radius: 'huge', elevation: 'outline', fill: 'surface'}}});
  assert.throws(() => createPlatform({records: [bad]}), /P_SURFACE_RADIUS/);
  assert.throws(() => createPlatformRegistry().kind('surface').register({...bad, levels: 3}), /P_TYPE/);
  assert.throws(() => createPlatformRegistry({validators: STYLE_VALIDATORS}).kind('surface').register(bad), /P_SURFACE_RADIUS/, 'the registry runs the kind validator on registration');
  assert.doesNotThrow(() => createPlatformRegistry().kind('surface').register(bad), 'without validators only the contract shape is checked');
  // no free kinds: a state pattern cannot be registered in the surface slot
  assert.throws(() => env.registry.kind('surface').register(env.registry.get('motion:calm')), /P_KIND/);
});

test('ranking and assembly of style materials run on the registry: same answers for the data wrapper and the full platform registry', () => {
  for (const sc of STYLE_CONTEXTS) for (const kind of STYLE_MATERIAL_KINDS) {
    const a = rankStyleMaterials(env.registry, sc.id, {kind}), b = rankWrapped(sc.id, {kind});
    assert.deepEqual(a.ranked.map(r => [r.id, r.score]), b.ranked.map(r => [r.id, r.score]), `${sc.id}/${kind}`);
    assert.deepEqual(a.blocked.map(x => x.id).sort(), b.blocked.map(x => x.id).sort(), `${sc.id}/${kind} blocked`);
  }
  const req = {styleContext: 'style-context:ledger', context: 'dashboard'};
  const viaRegistry = assembleStyleMaterials(env.registry, req), viaWrapper = assembleWrapped(req), viaOption = assembleWrapped(req, {registry: env.registry});
  assert.equal(viaRegistry.ok, true, JSON.stringify(viaRegistry.diagnostics));
  assert.equal(JSON.stringify(viaRegistry), JSON.stringify(viaWrapper));
  assert.equal(JSON.stringify(viaRegistry), JSON.stringify(viaOption));
  assert.throws(() => rankStyleMaterials(env.registry, 'style-context:nope', {kind: 'surface'}), RangeError);
  assert.throws(() => rankStyleMaterials(env.registry, 'style-context:ledger', {kind: 'palette'}), RangeError);
  // the registry recommend path blocks a surface a style context bans, with the style ban code
  const brutalist = rankStyleMaterials(env.registry, 'style-context:brutalist', {kind: 'surface'});
  assert.deepEqual(brutalist.ranked.map(r => r.id), ['surface:hard-offset']);
  assert.ok(brutalist.blocked.every(b => b.blocked.some(x => x.code === 'P_REL_STYLE_FORBID')));
  // material axes become axis values, so axis bans reach them
  assert.deepEqual(materialAxisIds(env.registry.get('state-pattern:error-banner')), [], 'a state pattern density hint never becomes an axis ban');
  assert.deepEqual(materialAxisIds(env.registry.get('surface:hard-offset')), ['axis-value:elevation.hard', 'axis-value:radius.square']);
});

test('a style context with no candidate for the page context says why through recommend (P_RECOMMEND_NO_CANDIDATE)', () => {
  const only = SURFACES.find(m => m.id === 'surface:glow-glass');
  const small = createPlatformRegistry().registerAll([STYLE_CONTEXTS.find(c => c.id === 'style-context:workspace'), only]);
  const none = rankStyleMaterials(small, 'style-context:workspace', {kind: 'surface', context: 'form'});
  assert.deepEqual(none.ranked, []);
  assert.equal(none.reasons[0].code, 'P_RECOMMEND_NO_CANDIDATE');
  assert.match(none.reasons[0].reason, /form 맥락용 surface 재료가 없습니다\(등록된 1개 재료의 맥락: .*dashboard/);
  assert.equal(rankStyleMaterials(small, 'style-context:workspace', {kind: 'surface', context: 'dashboard'}).ranked.length, 1);
});

test('selected surface, motion, background and media show up in the page: scope attributes on the shell and their CSS', () => {
  const r = dash({}, {mode: 'dark', surface: 'surface:glow-glass', motion: 'motion:snappy', background: 'background:blueprint-grid-lines', media: 'media:square-tech'});
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  const tag = shell(r.value.html);
  for (const a of ['data-surface="glow-glass"', 'data-motion="snappy"', 'data-bg="blueprint-grid-lines"', 'data-media="square-tech"']) assert.ok(tag.includes(a), a);
  assert.ok(r.value.css.includes(surfaceScopeCSS(env.registry.get('surface:glow-glass'))), 'the surface becomes the variables the legacy parts read');
  assert.match(r.value.css, /\[data-surface="glow-glass"\]\{--kit-radius:18px;--kit-card-border:[^;]+;--kit-shadow:[^;]+;--kit-shadow-hover:/);
  assert.ok(r.value.css.includes('[data-motion="snappy"]{') && r.value.css.includes('[data-bg="blueprint-grid-lines"]{') && r.value.css.includes('[data-media="square-tech"]{'));
  assert.deepEqual(r.value.manifest.platform.styleMaterials, {surface: 'surface:glow-glass', motion: 'motion:snappy', background: 'background:blueprint-grid-lines', media: 'media:square-tech', states: []});
  for (const slot of ['surface', 'motion', 'background', 'media']) assert.ok(r.decisions.some(d => d.slot === `style.${slot}` && d.source === 'intent'), slot);
  // a different surface changes the output, not only the manifest
  const other = dash({}, {mode: 'dark', surface: 'surface:soft-layered', motion: 'motion:snappy', background: 'background:blueprint-grid-lines', media: 'media:square-tech'});
  assert.notEqual(other.value.css, r.value.css);
  assert.notEqual(shell(other.value.html), tag);
  assert.ok(other.value.css.includes(surfaceScopeCSS(env.registry.get('surface:soft-layered'))));
  // the deco element for a decorated background sits inside the shell
  const deco = dash({}, {background: 'background:blueprint-grid-lines'});
  assert.match(deco.value.html, /<div class="kit-shell"[^>]*><span class="kit-deco" aria-hidden="true"><\/span>/);
  assert.doesNotMatch(dash({}, {background: 'background:plain-canvas'}).value.html, /kit-deco/);
});

test('without a request the style materials follow the style context and the page axes, with reasons', () => {
  const ledger = dash({}, {styleContext: 'style-context:ledger'});
  assert.equal(ledger.ok, true, JSON.stringify(ledger.diagnostics));
  assert.equal(ledger.plan.style.surface, 'surface:hairline-panel');
  const decision = ledger.decisions.find(d => d.slot === 'style.surface');
  assert.equal(decision.source, 'recommend');
  assert.ok(decision.reasons.some(x => x.type === 'axis-preference' || x.type === 'page-axis'));
  const brutal = assemblePage({purpose: 'saas-landing', styleContext: 'style-context:brutalist', candidates: 1, content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}]}}, env);
  assert.equal(brutal.ok, true, JSON.stringify(brutal.diagnostics));
  assert.equal(brutal.plan.style.surface, 'surface:hard-offset', 'brutalist bans every other elevation');
  assert.ok(brutal.value.css.includes(surfaceScopeCSS(env.registry.get('surface:hard-offset'))));
  assert.notEqual(shell(brutal.value.html), shell(ledger.value.html));
  assert.equal(JSON.stringify(dash({}, {styleContext: 'style-context:ledger'})), JSON.stringify(ledger), 'deterministic');
});

test('explicit style materials are checked: unknown ids, wrong kinds, wrong contexts and style-context bans are refused with the reason', () => {
  const r1 = dash({}, {surface: 'surface:nope'});
  assert.equal(r1.diagnostics[0].code, 'P_ATTR_UNKNOWN');
  assert.ok(r1.diagnostics[0].alternatives.includes('surface:hairline-panel'));
  assert.equal(dash({}, {surface: 'motion:calm'}).diagnostics[0].code, 'P_ATTR_KIND');
  const wrongContext = assemblePage({purpose: 'saas-landing', motion: 'motion:snappy', content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}]}}, env);
  assert.equal(wrongContext.diagnostics[0].code, 'P_ATTR_CONTEXT', 'snappy is a dashboard/data/listing motion');
  const banned = dash({}, {mode: 'dark', styleContext: 'style-context:ledger', surface: 'surface:glow-glass'});
  assert.equal(banned.ok, false);
  assert.equal(banned.stage, 'exploreCandidates');
  assert.equal(banned.diagnostics[0].code, 'P_REL_STYLE_FORBID');
  assert.match(banned.diagnostics[0].message, /elevation=glow/);
  const light = dash({}, {styleContext: 'style-context:ledger', surface: 'surface:glow-glass'});
  assert.equal(light.diagnostics[0].code, 'P_REL_FORBIDS', 'in light mode the axis ban X05 already refuses glow');
  assert.match(light.diagnostics[0].message, /X05/);
  assert.equal(assemblePage({purpose: 'work-dashboard', background: 5}, env).diagnostics[0].code, 'P_REQUEST');
});

test('a surface and a background that the axis bans forbid together are never combined: X04 blocks the pair at evaluation', () => {
  // hard-offset carries elevation=hard; soft-gradient-organic carries backdrop=gradient (X04: hard offset shadows need a solid backdrop)
  const r = assemblePage({purpose: 'saas-landing', candidates: 2, surface: 'surface:hard-offset', background: 'background:soft-gradient-organic', content: {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}]}}, env);
  assert.equal(r.ok, false);
  assert.ok(r.diagnostics.some(d => d.code === 'P_REL_FORBIDS' && /X04/.test(d.message)), JSON.stringify(r.diagnostics));
});

test('state patterns replace the data region when the data is empty, loading or failed, and success/error banners sit under the page header', () => {
  const empty = dash({table: table({rows: []})});
  assert.equal(empty.ok, true, JSON.stringify(empty.diagnostics));
  assert.doesNotMatch(empty.value.html, /<table/);
  assert.match(empty.value.html, /<section class="kit-state" data-pattern="[a-z-]+" data-state="empty" role="status"/);
  assert.equal(empty.plan.states.length, 1);
  assert.equal(empty.plan.style.states[0].kind, 'empty');
  assert.ok(empty.value.css.includes(`[data-pattern="${empty.plan.style.states[0].id.split(':')[1]}"]`), 'only the used pattern ships its CSS');
  assert.ok(empty.decisions.some(d => d.slot === 'layout.table.state'));
  // the text comes from the request and is escaped
  const texted = dash({table: table({rows: [], stateText: {title: '<b>없음</b>', body: '새로 만드세요', action: {label: '새 작업', href: '#new'}}})});
  assert.match(texted.value.html, /&lt;b&gt;없음&lt;\/b&gt;/);
  assert.ok(texted.value.html.includes('href="#new"') && texted.value.html.includes('새 작업'));
  // loading and error come from their own patterns and announce themselves
  const loading = dash({table: table({state: 'loading'})}), error = dash({table: table({state: 'error'})});
  assert.match(loading.value.html, /data-state="loading"[^>]*aria-busy="true"/);
  assert.match(error.value.html, /data-state="error" role="alert"/);
  assert.notEqual(loading.plan.style.states[0].id, error.plan.style.states[0].id);
  for (const r of [empty, loading, error]) assert.ok(['block', 'inline'].includes(env.registry.get(r.plan.style.states[0].id).layout), 'a data region takes a block or inline pattern, never a banner or toast');
  // a compact page matches the banner pattern best, but a data region still gets a block or inline one; the status line takes banner, toast or block
  const compact = dash({table: table({state: 'error'}), status: {state: 'error'}}, {density: 'compact'});
  assert.equal(compact.ok, true, JSON.stringify(compact.diagnostics));
  const [region, line] = compact.plan.style.states.map(x => env.registry.get(x.id).layout);
  assert.ok(['block', 'inline'].includes(region), `region ${region}`);
  assert.ok(['banner', 'toast', 'block'].includes(line), `status ${line}`);
  assert.equal(line, 'banner', 'the status line on a compact page is the banner');
  // a chart alone may be in a failed state; with other charts or a list it cannot
  const chart = dash({charts: [{preset: 'chart-preset:erp-quarterly-revenue', state: 'error'}]});
  assert.equal(chart.ok, true, JSON.stringify(chart.diagnostics));
  assert.doesNotMatch(chart.value.html, /class="kit-chart"/);
  assert.match(chart.value.html, /data-state="error"/);
  const twoCharts = dash({charts: [{preset: 'chart-preset:erp-quarterly-revenue', state: 'error'}, {preset: 'chart-preset:sales-pipeline-value'}]});
  assert.equal(twoCharts.diagnostics[0].code, 'P_PAGE_CONTENT');
  // status: below the header, banner-like layouts only
  const status = dash({status: {state: 'success', title: '저장했습니다'}});
  assert.equal(status.ok, true, JSON.stringify(status.diagnostics));
  assert.ok(status.value.html.indexOf('class="kit-page-header') < status.value.html.indexOf('data-state="success"'));
  assert.ok(status.value.html.indexOf('data-state="success"') < status.value.html.indexOf('data-purpose="card.kpi"'));
  const layout = env.registry.get(status.plan.style.states[0].id).layout;
  assert.ok(['banner', 'toast', 'block'].includes(layout));
  const err = dash({status: {state: 'error', title: '동기화에 실패했습니다'}});
  assert.match(err.value.html, /data-state="error" role="alert"/);
});

test('state requests are checked: unknown state, wrong state kind, a layout that does not fit the place, and stray text keys', () => {
  assert.equal(assemblePage({purpose: 'work-dashboard', states: {nope: 'state-pattern:error-panel'}}, env).diagnostics[0].code, 'P_REQUEST_KEY');
  assert.equal(dash({table: table({state: 'error'})}, {states: {error: 'state-pattern:empty-inline'}}).diagnostics[0].code, 'P_ATTR_KIND');
  const layout = dash({table: table({state: 'error'})}, {states: {error: 'state-pattern:error-banner'}});
  assert.equal(layout.diagnostics[0].code, 'P_PAGE_STATE_LAYOUT');
  assert.deepEqual(layout.diagnostics[0].alternatives, ['block', 'inline']);
  const okExplicit = dash({table: table({state: 'error'})}, {states: {error: 'state-pattern:error-panel'}});
  assert.equal(okExplicit.ok, true, JSON.stringify(okExplicit.diagnostics));
  assert.equal(okExplicit.plan.style.states[0].id, 'state-pattern:error-panel');
  assert.equal(okExplicit.decisions.find(d => d.slot.startsWith('style.state')).source, 'intent');
  assert.equal(dash({table: table({state: 'weird'})}).diagnostics[0].code, 'P_PAGE_CONTENT');
  assert.equal(dash({table: table({rows: [], stateText: {css: 'x'}})}).diagnostics[0].code, 'P_PAGE_CONTENT');
  assert.equal(dash({status: {state: 'busy'}}).diagnostics[0].code, 'P_PAGE_CONTENT');
  assert.deepEqual(STATE_KINDS, ['empty', 'loading', 'error', 'success']);
});

test('the pages with style materials still read only defined variables and keep the contrast pairs of every used material', () => {
  for (const purpose of ['work-dashboard', 'saas-landing', 'editorial-docs', 'commerce']) {
    const content = {'work-dashboard': {kpis: kpis(3), table: table({rows: []}), status: {state: 'success'}}, 'saas-landing': {features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}], status: {state: 'error'}}, 'editorial-docs': {title: '글', sections: [{title: '하나', body: '본문'}], status: {state: 'success'}}, commerce: {products: [{title: 'a', price: '1원'}, {title: 'b', price: '2원'}], status: {state: 'success'}}}[purpose];
    const r = assemblePage({purpose, candidates: 3, content}, env);
    assert.equal(r.ok, true, `${purpose}: ${JSON.stringify(r.diagnostics)}`);
    for (const c of r.candidates) {
      assert.equal(c.quality.tokens.ok, true, `${purpose}: ${JSON.stringify(c.quality.tokens.missing)}`);
      const pairs = c.value.manifest.platform.contrast.styleMaterials;
      assert.ok(pairs.length > 0 && pairs.every(p => p.ok), `${purpose}: ${JSON.stringify(pairs.filter(p => !p.ok))}`);
      assert.deepEqual(c.value.manifest.platform.styleMaterials, r.value.manifest.platform.styleMaterials, 'all candidates share the style material selection');
    }
  }
});
