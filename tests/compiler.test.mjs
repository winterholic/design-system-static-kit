import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, palettes, axes, createBlueprint, templateList, CATALOG_VERSION} from '../src/catalog.mjs';
import {compile, validateBlueprint, resolveTokens, contrast} from '../src/compiler.mjs';
import {serializableContrast} from '../src/tokens.mjs';

const base = () => createBlueprint('dashboard-overview');
const clone = x => structuredClone(x);
const A = (label, variant = 'secondary', href = '#main') => ({label, href, variant});
function reject(mutator, code, from = base) {
  const b = from(); mutator(b);
  const result = validateBlueprint(b);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.code === code), `${code} not in ` + JSON.stringify(result.errors));
  assert.throws(() => compile(b), /Invalid blueprint/);
}
const withBody = (children, pageType = 'general', theme) => { const b = createBlueprint('about-team', theme); b.pageType = pageType; b.tree = {type: 'page', children: [{type: 'page-header', title: '제목'}, ...children]}; return b; };
const rejectBody = (children, code, pageType) => reject(() => {}, code, () => withBody(children, pageType));

test('all templates compile deterministically with manifest and CSP', () => {
  for (const t of templateList) {
    const b = createBlueprint(t.id), r = compile(b);
    assert.deepEqual(compile(clone(b)), r);
    assert.match(r.html, /<html lang="ko"/); assert.equal((r.html.match(/<h1[ >]/g) ?? []).length, 1, t.id);
    assert.match(r.html, /Content-Security-Policy/); assert.match(r.css, /prefers-reduced-motion/);
    assert.equal(r.manifest.catalogVersion, CATALOG_VERSION); assert.ok(r.manifest.contrast.length >= 100);
    const ids = [...r.html.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]); assert.equal(ids.length, new Set(ids).size, 'unique ids in ' + t.id);
  }
});

test('unknown templates and themes fail clearly', () => {
  assert.throws(() => createBlueprint('bogus'), /template/);
  assert.throws(() => createBlueprint('login', 'bogus'), /theme/);
});

test('contrast reference values', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#123456', '#123456'), 1);
  assert.throws(() => contrast('red', '#FFFFFF'), /hex/);
});

test('every palette in light and dark satisfies all used pairs (text, status, focus, chart, gradients, accent)', () => {
  for (const p of Object.values(palettes)) for (const mode of ['light', 'dark']) {
    const {report, tokens} = resolveTokens({palette: p.id, mode}, mode);
    assert.ok(report.length >= 100);
    for (const pair of report) assert.ok(pair.ratio >= pair.minimum, `${p.id}/${mode} ${pair.name} ${pair.ratio}`);
    assert.notEqual(tokens.canvas.toLowerCase(), '#000000');
    for (const k of ['accent', 'accentInk', 'sunken', 'chart1', 'chart5', 'info']) assert.ok(tokens[k], k);
  }
});

test('auto mode ships both token sets and verifies both', () => {
  const b = createBlueprint('saas-landing'); b.mode = 'auto'; const r = compile(b);
  assert.ok(r.tokens.light && r.tokens.dark); assert.match(r.css, /prefers-color-scheme:dark/); assert.match(r.css, /color-scheme:light dark/);
  assert.ok(r.manifest.contrast.some(p => p.mode === 'light') && r.manifest.contrast.some(p => p.mode === 'dark'));
  assert.ok(r.manifest.contrast.every(p => p.ratio >= p.minimum));
});

test('inverse sections and CTAs use the opposite mode\'s verified token set', () => {
  const b = withBody([{type: 'section', title: '반전', surface: 'inverse', children: [{type: 'card', title: '카드', body: '본문'}]}]);
  const r = compile(b); assert.match(r.css, /data-surface=inverse/); assert.ok(r.manifest.contrast.some(p => String(p.mode).includes('inverse')));
  assert.ok(r.manifest.contrast.every(p => p.ratio >= p.minimum));
  const c = withBody([{type: 'cta', tone: 'inverse', title: '반전 CTA', action: A('시작', 'primary')}]); assert.ok(compile(c).css.includes('data-tone=inverse'));
});

test('reject arbitrary top-level override and node CSS or raw HTML', () => {
  reject(b => { b.style = {color: 'red'}; }, 'UNKNOWN_KEY');
  for (const key of ['style', 'className', 'html', 'onClick']) reject(b => { b.tree.children[1][key] = 'evil'; }, 'UNKNOWN_KEY');
});
test('reject mismatched theme/palette, unknown enums, version locks, prototype ids', () => {
  assert.ok(validateBlueprint({...createBlueprint('saas-landing'), palette: 'forest'}).valid, 'palettes are independent of themes');
  reject(b => { b.density = '17px'; }, 'ENUM'); reject(b => { b.catalogVersion = '0.0.0'; }, 'CATALOG_VERSION'); reject(b => { b.version = '1.0'; }, 'VERSION');
  for (const id of ['__proto__', 'constructor', 'toString']) { reject(b => { b.theme = id; }, 'ENUM'); reject(b => { b.palette = id; }, 'ENUM'); }
  reject(b => { b.pageType = 'bogus'; }, 'ENUM');
});
test('reject unknown node type and illegal edges', () => {
  reject(b => { b.tree.children[1] = {type: 'script'}; }, 'NODE_TYPE');
  reject(b => { b.tree.children[1] = {type: 'grid', columns: 'two', children: [{type: 'prose', title: 'x', body: 'x'}, {type: 'prose', title: 'y', body: 'y'}]}; }, 'CHILD_TYPE');
  rejectBody([{type: 'section', title: 'S', children: [{type: 'hero', variant: 'statement', title: 'h', body: 'b'}]}], 'CHILD_TYPE');
  rejectBody([{type: 'tabs', children: [{type: 'tab', label: 'a', children: [{type: 'tabs', children: []}]}, {type: 'tab', label: 'b', children: [{type: 'prose', title: 'x', body: 'y'}]}]}], 'CHILD_TYPE');
});
test('require exactly one page header first', () => {
  reject(b => b.tree.children.shift(), 'PAGE_HEADER');
  reject(b => b.tree.children.push(clone(b.tree.children[0])), 'PAGE_HEADER');
});
test('data shape rules: table, chart, calendar, trend, selected ranges', () => {
  rejectBody([{type: 'table', title: '표', caption: '내용', columns: ['이름', '상태'], rows: [['한 칸']]}], 'TABLE_WIDTH');
  rejectBody([{type: 'chart', title: 'c', caption: 'c', kind: 'bar', categories: ['a', 'b'], series: [{name: 's', values: [1, 2, 3]}]}], 'CHART_SHAPE');
  rejectBody([{type: 'chart', title: 'c', caption: 'c', kind: 'donut', categories: ['a', 'b'], series: [{name: 's', values: [1, -2]}]}], 'CHART_SHAPE');
  rejectBody([{type: 'chart', title: 'c', caption: 'c', kind: 'donut', categories: ['a', 'b', 'c', 'd', 'e', 'f'], series: [{name: 's', values: [1, 2, 3, 4, 5, 6]}]}], 'CHART_SHAPE');
  rejectBody([{type: 'calendar', title: '달력', year: 2026, month: 2, events: [{day: 30, title: '없는 날'}]}], 'CALENDAR_DAY');
  rejectBody([{type: 'metric', label: 'm', value: '1', trend: 'up'}], 'METRIC_TREND');
  rejectBody([{type: 'filter-bar', placeholder: 'p', filters: ['a', 'b'], selected: 5}], 'SELECTED_RANGE');
  rejectBody([{type: 'stepper', steps: ['a', 'b'], current: 3}], 'STEPPER_RANGE');
  rejectBody([{type: 'pagination', pages: 3, current: 4}], 'PAGINATION_RANGE');
  rejectBody([{type: 'master-detail', title: 't', items: [{title: 'a', preview: 'p'}, {title: 'b', preview: 'p'}], selected: 4, detail: {title: 'd', body: 'b'}}], 'SELECTED_RANGE');
  rejectBody([{type: 'chart', title: 'c', caption: 'c', kind: 'bar', categories: ['a', 'b'], series: [{name: 's', values: [1, Number.NaN]}]}], 'NUMBER');
});
test('unsafe URLs, vague labels and missing anchors', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,evil', '//evil.com', 'https://a:b@example.com', 'https://example.com/\nx', '#Missing Anchor']) rejectBody([{type: 'actions', items: [A('링크', 'primary', href)]}], 'URL');
  rejectBody([{type: 'actions', items: [A('열기', 'primary', '#nowhere')]}], 'ANCHOR_MISSING');
  rejectBody([{type: 'actions', items: [A('여기', 'primary')]}], 'LINK_LABEL');
  rejectBody([{type: 'section', title: 'a', anchor: 'dup', children: [{type: 'prose', title: 'x', body: 'y'}]}, {type: 'section', title: 'b', anchor: 'dup', children: [{type: 'prose', title: 'x', body: 'y'}]}], 'ANCHOR_DUPLICATE');
  rejectBody([{type: 'toc'}], 'TOC_EMPTY');
  const ok = withBody([{type: 'section', title: 'a', anchor: 'one', children: [{type: 'prose', title: 'x', body: 'y'}]}, {type: 'actions', items: [A('첫 섹션으로', 'primary', '#one'), A('처음', 'secondary', '#main')]}, {type: 'actions', items: [A('열기', 'primary', 'https://example.com/path?q=1&v=2')]}]);
  assert.match(compile(ok).html, /q=1&amp;v=2/);
});
test('escape text, never markup', () => {
  const b = base(); b.name = '</title><script>alert(1)</script>'; b.tree.children[0].title = '<img src=x onerror=alert(1)>';
  const r = compile(b); assert.ok(!r.html.includes('<img src=x')); assert.match(r.html, /&lt;img/); assert.ok(!r.html.includes('</title><script>alert'));
  const c = withBody([{type: 'code', label: '<b>', language: 'html', code: '<script>alert(1)</script>'}]); assert.ok(!compile(c).html.includes('<script>alert(1)'));
});
test('forms: unique ids, option contracts, accessibility markup for every field type', () => {
  const f = (id, type, extra = {}) => ({id, label: id, type, ...extra});
  rejectBody([{type: 'form', title: '폼', submitLabel: 'ok', fields: [f('email', 'email'), f('email', 'text')]}], 'DUPLICATE_ID', 'form');
  rejectBody([{type: 'form', title: '폼', submitLabel: 'ok', fields: [f('kind', 'select')]}], 'SELECT_OPTIONS', 'form');
  rejectBody([{type: 'form', title: '폼', submitLabel: 'ok', fields: [f('kind', 'radio', {options: ['하나'] })]}], 'ARRAY_LENGTH', 'form');
  rejectBody([{type: 'form', title: '폼', submitLabel: 'ok', fields: [f('name', 'text', {options: ['a', 'b']})]}], 'FIELD_OPTIONS', 'form');
  const types = ['text', 'email', 'password', 'number', 'tel', 'url', 'date', 'search', 'textarea', 'select', 'checkbox', 'radio', 'switch'];
  const fields = types.map(t => f('f-' + t, t, ['select', 'radio'].includes(t) ? {options: ['가', '나']} : {help: '도움말'}));
  const html = compile(withBody([{type: 'form', title: '앞쪽', submitLabel: '확인', fields: fields.slice(0, 7)}, {type: 'form', title: '뒤쪽', submitLabel: '확인', fields: fields.slice(7)}], 'form')).html;
  for (const t of types) assert.match(html, new RegExp(`id="field-f-${t}"|name="f-${t}"`));
  assert.match(html, /role="switch"/); assert.match(html, /<fieldset class="kit-field kit-choice"><legend>/); assert.match(html, /aria-describedby="field-f-text-help"/);
});
test('state markup for data parts and ready-needs-data rule', () => {
  for (const state of ['loading', 'empty', 'error', 'partial', 'forbidden']) assert.match(compile(withBody([{type: 'list', title: '목록', state, items: [{title: '항목'}]}])).html, new RegExp(`data-state="${state}"`));
  rejectBody([{type: 'list', title: '목록', state: 'oops', items: []}], 'ENUM');
  rejectBody([{type: 'list', title: '목록', state: 'ready', items: []}], 'STATE_DATA');
  rejectBody([{type: 'table', title: '표', caption: '빈 표', columns: ['a', 'b'], rows: [], state: 'partial'}], 'STATE_DATA');
});
test('only one primary action per group, across every group-bearing part', () => {
  rejectBody([{type: 'actions', items: [A('A', 'primary'), A('B', 'primary')]}], 'PRIMARY_ACTION');
  rejectBody([{type: 'page-header', title: '둘째'}], 'PAGE_HEADER');
  rejectBody([{type: 'cta', title: 't', action: A('A', 'primary'), secondaryAction: A('B', 'primary')}], 'PRIMARY_ACTION');
  rejectBody([{type: 'pricing', children: [1, 2].map(i => ({type: 'plan', name: 'P' + i, price: '1', features: ['a', 'b'], action: A('선택' + i, 'primary')}))}], 'PRIMARY_ACTION');
  reject(b => { b.tree.children[0].actions = [A('A', 'primary'), A('B', 'primary')]; }, 'PRIMARY_ACTION');
});
test('structure rules: single hero at position 2, one featured plan, nested tabs, variants', () => {
  const hero = {type: 'hero', variant: 'statement', title: '히어로', body: '본문'};
  rejectBody([hero, hero], 'SINGLE_HERO', 'landing'); rejectBody([{type: 'prose', title: 'x', body: 'y'}, hero], 'HERO_POSITION', 'landing');
  rejectBody([{type: 'hero', variant: 'centered', title: 'h', body: 'b', visual: 'photo'}], 'HERO_VISUAL');
  const plan = (n, featured) => ({type: 'plan', name: n, price: '1', features: ['a', 'b'], action: A('선택' + n), ...(featured ? {featured: 'yes'} : {})});
  rejectBody([{type: 'pricing', children: [plan('a', true), plan('b', true)]}], 'FEATURED_PLAN', 'pricing');
  rejectBody([{type: 'card', title: 't', body: 'b', variant: 'media'}], 'VARIANT_REQUIRES'); rejectBody([{type: 'card', title: 't', body: 'b', variant: 'link'}], 'VARIANT_REQUIRES');
  rejectBody([{type: 'card', title: 't', body: 'b', visual: 'photo'}], 'VARIANT_REQUIRES');
  rejectBody([{type: 'empty-state', kind: 'error', title: 't', body: 'b'}], 'VARIANT_REQUIRES');
  rejectBody([{type: 'breadcrumb', items: [{label: '홈', href: '#main'}, {label: '현재', href: '#main'}]}], 'VARIANT_REQUIRES');
});
test('axis bans reject with ids and reasons; theme forbids reject their own values', () => {
  const r = id => { const b = createBlueprint('about-team'); return {b, ban: id}; };
  for (const [patch, id] of [[{shell: 'dock', density: 'compact'}, 'X01'], [{shell: 'sidebar', width: 'narrow'}, 'X02'], [{shell: 'centered', width: 'full'}, 'X03'], [{elevation: 'hard', backdrop: 'gradient'}, 'X04'], [{elevation: 'glow', mode: 'light'}, 'X05'], [{typography: 'mono', scale: 'dramatic'}, 'X06'], [{radius: 'bubble', density: 'compact'}, 'X07'], [{footer: 'columns', shell: 'minimal'}, 'X08'], [{icon: 'line-fine', density: 'compact'}, 'X09'], [{backdrop: 'grid', ornament: 'dots'}, 'X10'], [{motion: 'lively', elevation: 'flat'}, 'X11']]) {
    const b = createBlueprint('about-team', 'workspace'); Object.assign(b, patch);
    const res = validateBlueprint(b); assert.ok(res.errors.some(e => e.code === 'AXIS_BAN' && e.message.startsWith(id)), id + JSON.stringify(res.errors));
  }
  const civic = createBlueprint('policy', 'civic'); civic.backdrop = 'gradient'; assert.ok(validateBlueprint(civic).errors.some(e => e.code === 'THEME_FORBID'));
  const neon = createBlueprint('waitlist', 'neon'); neon.mode = 'light'; assert.ok(validateBlueprint(neon).errors.some(e => e.code === 'THEME_FORBID'));
});
test('page type contracts', () => {
  rejectBody([{type: 'prose', title: 'x', body: 'y'}], 'PAGE_REQUIRE', 'landing');
  rejectBody([{type: 'hero', variant: 'statement', title: 'h', body: 'b'}, {type: 'kanban', children: [{type: 'lane', title: 'a', children: []}, {type: 'lane', title: 'b', children: []}]}], 'PAGE_FORBID', 'landing');
  rejectBody([{type: 'prose', title: 'x', body: 'y'}, {type: 'form', title: 'f', submitLabel: 'ok', fields: [{id: 'a', label: 'a', type: 'text'}]}], 'PAGE_ALLOW', 'auth');
  rejectBody([{type: 'form', title: 'f', submitLabel: 'ok', fields: [{id: 'a', label: 'a', type: 'text'}]}, {type: 'notice', tone: 'info', title: '1', body: '1'}, {type: 'notice', tone: 'info', title: '2', body: '2'}, {type: 'notice', tone: 'info', title: '3', body: '3'}], 'PAGE_MAX', 'auth');
  rejectBody([{type: 'prose', title: 'x', body: 'y'}], 'PAGE_SECOND', 'error');
  rejectBody([{type: 'empty-state', kind: 'first-use', title: 't', body: 'b'}], 'PAGE_SECOND', 'error');
  const b = createBlueprint('login'); b.shell = 'sidebar'; b.width = 'narrow'; const res = validateBlueprint(b); assert.ok(res.errors.some(e => e.code === 'PAGE_SHELL')); assert.ok(res.errors.some(e => e.code === 'AXIS_BAN'));
  const w = createBlueprint('article'); w.width = 'wide'; assert.ok(validateBlueprint(w).errors.some(e => e.code === 'PAGE_WIDTH'));
});
test('navigation rules: counts, icons, footer links, per shell', () => {
  reject(b => { b.shell = 'minimal'; b.width = 'wide'; }, 'NAV_COUNT');
  reject(b => { b.shell = 'dock'; b.density = 'comfortable'; delete b.chrome.nav[0].icon; }, 'NAV_ICON');
  reject(b => { b.footer = 'columns'; delete b.chrome.footerLinks; }, 'FOOTER_LINKS');
  reject(b => { b.shell = 'topbar'; b.chrome.nav = Array.from({length: 7}, (_, i) => ({label: 'm' + i, href: '#main', icon: 'home'})); }, 'NAV_COUNT');
  reject(b => { b.chrome.nav[0].href = 'http://insecure.example'; }, 'URL');
});
test('reject excess depth, node count, missing and malformed inputs without crashing', () => {
  reject(b => { let n = b.tree; for (let i = 0; i < 9; i++) { const child = {type: 'section', title: '깊음', children: []}; n.children.push(child); n = child; } n.children.push({type: 'prose', title: '끝', body: '본문'}); }, 'DEPTH');
  reject(b => b.tree.children.push(...Array.from({length: 201}, () => ({type: 'prose', title: 'x', body: 'y'}))), 'NODE_LIMIT');
  for (const input of [null, [], {}, 'hi', {tree: null}]) { const r = validateBlueprint(input); assert.equal(r.valid, false); assert.ok(r.errors[0].path.startsWith('$')); }
  reject(b => { b.name = '   '; }, 'STRING');
  const b = base(); b.tree.children[0].title = undefined; assert.equal(validateBlueprint(b).valid, false);
});
test('artifact contrast diagnostics are conservative while gates use raw ratios', () => {
  const b = base(); Object.assign(b, {mode: 'dark', palette: 'pearl'}); const raw = resolveTokens(b, 'dark').report, emitted = compile(b).manifest.contrast;
  raw.forEach((pair, i) => assert.equal(emitted[i].ratio, Math.floor(pair.ratio * 1e8) / 1e8));
  assert.ok(emitted.every(p => p.ratio >= p.minimum)); assert.ok(serializableContrast(raw).length === raw.length);
});
test('compiler emits skip link, landmarks, labelled controls and keyboard-reachable scrollers', () => {
  const r = compile(createBlueprint('settings'));
  assert.match(r.html, /href="#main"/); assert.match(r.html, /<main class="kit-main" id="main" tabindex="-1">/); assert.match(r.html, /<nav class="kit-nav" aria-label="주요 메뉴">/); assert.match(r.html, /<footer/);
  assert.match(r.html, /role="tablist"/); assert.match(r.html, /<label for="field-name">/); assert.match(r.html, /role="status"/);
  const t = compile(createBlueprint('admin-table')).html; assert.match(t, /tabindex="0" role="region"/); assert.match(t, /<th scope="col">/);
  assert.match(compile(createBlueprint('project-board')).html, /role="group" aria-label="칸반 보드" tabindex="0"/);
});
test('charts expose text alternatives and a data table', () => {
  const html = compile(createBlueprint('dashboard-analytics')).html;
  assert.match(html, /<svg[^>]+role="img"[^>]+aria-labelledby/); assert.match(html, /<details class="kit-chart-data">/); assert.match(html, /<caption>[^<]+ 데이터<\/caption>/);
});
test('tabs, theme and mode attributes reach the document', () => {
  const b = createBlueprint('settings'); b.motion = 'lively'; const html = compile(b).html;
  assert.match(html, /data-motion="lively"/); assert.match(html, /<noscript><style>\.kit-tabpanel\[hidden\]/);
  for (const shell of axes.shell) { const x = createBlueprint('about-team'); x.shell = shell; x.chrome.nav = x.chrome.nav.slice(0, 2); repairBans(x); assert.match(compile(x).html, new RegExp(`data-shell="${shell}"`)); }
});
function repairBans(b) { b.density = 'comfortable'; b.width = 'wide'; b.footer = 'simple'; b.icon = 'line'; }
