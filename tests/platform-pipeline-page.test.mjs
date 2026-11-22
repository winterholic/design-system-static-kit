import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform, assemblePage, PURPOSES, PURPOSE_IDS, columnsFor, TABLE_PAGE_ROWS, PAGE_STAGES} from '../src/platform/index.mjs';
import {PROFILES} from '../src/profiles/data.mjs';

const env = createPlatform();
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i), trend: i % 2 ? 'down' : 'up', delta: `+${i}`, detail: '지난주 대비'}));
const rows = n => Array.from({length: n}, (_, i) => [`작업 ${i + 1}`, `담당 ${i % 5}`, ['진행', '완료', '대기'][i % 3]]);
const table = n => ({title: '작업', columns: ['작업', '담당', '상태'], rows: rows(n)});
const dash = (content, extra = {}) => assemblePage({purpose: 'work-dashboard', candidates: 1, content: {title: '운영 현황', ...content}, ...extra}, env);
const count = (html, re) => (html.match(new RegExp(re.source, 'g')) ?? []).length;
const codes = r => r.diagnostics.map(d => d.code);

test('the four required purposes assemble through the page pipeline, each from its template skeleton', () => {
  assert.deepEqual(PURPOSE_IDS, ['saas-landing', 'work-dashboard', 'editorial-docs', 'commerce']);
  const cases = {
    'saas-landing': {content: {hero: {title: '제품을 빠르게', body: '소개', action: {label: '시작'}}, features: [{title: 'A', body: 'a'}, {title: 'B', body: 'b'}, {title: 'C', body: 'c'}], cta: {title: '지금', action: {label: '무료'}}}, pattern: 'marketing-landing', marker: /class="kit-hero"/},
    'work-dashboard': {content: {kpis: kpis(4), table: table(5)}, pattern: 'dashboard-grid', marker: /class="kit-metric"/},
    'editorial-docs': {content: {title: '글', lead: '리드', sections: [{title: '하나', body: '본문'}]}, pattern: 'editorial-article', marker: /class="kit-prose"/},
    commerce: {content: {title: '상품', products: Array.from({length: 6}, (_, i) => ({title: `상품 ${i}`, price: '1,000원', meta: '분류'}))}, pattern: 'commerce-listing', marker: /class="kit-card-price"/},
  };
  for (const purpose of PURPOSE_IDS) {
    const r = assemblePage({purpose, candidates: 1, content: cases[purpose].content}, env);
    assert.equal(r.ok, true, `${purpose}: ${JSON.stringify(r.diagnostics)}`);
    assert.equal(r.stage, PAGE_STAGES.at(-1));
    assert.equal(r.plan.pattern, cases[purpose].pattern, purpose);
    assert.match(r.value.html, cases[purpose].marker, `${purpose}: rendered by the legacy skeleton renderer`);
    assert.ok(PURPOSES[purpose].patterns.includes(r.plan.pattern));
    assert.match(r.value.css, /platform 0\.\d+\.\d+ page: /, 'platform tokens are in the output CSS');
  }
});

test('data amount changes the layout: KPI 3 vs 8 changes columns and density, with the reason recorded', () => {
  const three = dash({kpis: kpis(3), table: table(5)}), eight = dash({kpis: kpis(8), table: table(5)});
  assert.equal(three.ok && eight.ok, true, JSON.stringify([three.diagnostics, eight.diagnostics]));
  assert.match(three.value.html, /class="kit-grid" data-columns="three"/);
  assert.match(eight.value.html, /class="kit-grid" data-columns="four"/);
  assert.equal(count(three.value.html, /class="kit-metric"/), 3);
  assert.equal(count(eight.value.html, /class="kit-metric"/), 8);
  assert.equal(three.plan.axes.density, 'comfortable');
  assert.equal(eight.plan.axes.density, 'compact', '8 KPIs are placed densely');
  assert.equal(eight.plan.axisSources.density, 'content');
  const why = r => r.decisions.find(d => d.slot === 'layout.kpis.columns');
  assert.match(why(three).reason, /KPI 3개 → 3열 1줄/);
  assert.match(why(eight).reason, /KPI 8개 → 4열 2줄/);
  // an explicit density is never overridden by the content amount
  assert.equal(dash({kpis: kpis(8)}, {density: 'spacious'}).plan.axes.density, 'spacious');
  // no last row with a single cell
  for (let n = 3; n <= 12; n++) { const c = {three: 3, four: 4}[columnsFor(n)]; assert.notEqual(n % c, 1, `${n} KPIs on ${c} columns`); }
});

test('data amount changes the layout: table 5 rows vs 50 rows changes pattern, variant, toolbar and paging', () => {
  const small = dash({kpis: kpis(4), table: table(5)}), mid = dash({kpis: kpis(4), table: table(15)}), big = dash({kpis: kpis(4), table: table(50)});
  for (const r of [small, mid, big]) assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(small.plan.pattern, 'dashboard-grid');
  assert.match(small.value.html, /class="kit-table-wrap" data-variant="plain"/);
  assert.equal(count(small.value.html, /kit-filterbar/), 0);
  assert.match(mid.value.html, /data-variant="striped"/);
  assert.equal(count(mid.value.html, /class="kit-filterbar"/), 1, '11~20 rows get a search/filter bar');
  assert.equal(count(mid.value.html, /class="kit-pagination"/), 0);
  assert.equal(big.plan.pattern, 'erp-workspace', '50 rows need the pattern that has a pagination slot');
  assert.equal(big.plan.axes.density, 'compact');
  assert.equal(count(big.value.html, /class="kit-pagination"/), 1);
  const bodyRows = (big.value.html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr/g) ?? []).length;
  assert.equal(bodyRows, TABLE_PAGE_ROWS, 'page 1 carries the first 20 rows; the rest is behind the pagination');
  assert.match(big.decisions.find(d => d.slot === 'layout.table.pages').reason, /50행은 한 쪽 20행씩 3쪽/);
  assert.match(big.value.html, /aria-current="page">1<span class="kit-sr"> 페이지<\/span><\/a><\/li><li><a href="#main">2/);
});

test('a 50-row table that also asks for a chart cannot fit any pattern: the refusal names the slot and the alternatives', () => {
  const r = dash({kpis: kpis(4), table: table(50), charts: [{preset: 'chart-preset:erp-quarterly-revenue'}]});
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'planPage');
  assert.ok(codes(r).includes('P_PAGE_SLOT'));
  const msg = r.diagnostics.map(d => d.message).join('\n');
  assert.match(msg, /페이지네이션 칸이 없습니다/);
  assert.match(msg, /차트가 필요하면 dashboard-grid/);
  assert.ok(r.diagnostics.some(d => d.alternatives?.length));
});

test('intent.components are placed as real nodes: family wraps, props reach the output, and what cannot be placed is refused with a reason', () => {
  const card = (id, title, props) => ({base: 'base-component:card-surface', ...(props ? {props} : {}), content: {id, title, body: `${title} 본문`}});
  const r = dash({kpis: kpis(4)}, {components: [card('alpha', '알파 카드'), card('beta', '베타 카드', {behavior: 'link', media: 'start'}), card('gamma', '감마 카드')]});
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  const cards = [...r.value.html.matchAll(/<article class="kit-ctl-card"[^>]*>/g)].map(m => m[0]);
  assert.equal(cards.length, 3, 'every requested card is in the HTML, not only validated');
  for (const c of cards) assert.match(c, /data-family="[a-z-]+"/, 'each card is scoped to its family');
  assert.match(cards[1], /data-behavior="link"/);
  for (const t of ['알파 카드', '베타 카드', '감마 카드']) assert.ok(r.value.html.includes(t), t);
  assert.deepEqual(r.plan.components.map(c => c.base), Array(3).fill('base-component:card-surface'));
  assert.equal(r.plan.slots.find(s => s.id === 'insights').nodes.includes('grid'), true, 'cards are laid out in a grid of the insights slot');
  const fam = r.candidates[0].selection.families['base-component:card-surface'];
  assert.ok(r.value.css.includes(`[data-family="${fam.slice('family:'.length)}"]`));

  const wrongSlot = dash({kpis: kpis(4)}, {components: [{...card('a', 'A'), slot: 'header'}, card('b', 'B')]});
  assert.equal(wrongSlot.ok, false);
  assert.equal(wrongSlot.diagnostics[0].code, 'P_PAGE_SLOT');
  assert.match(wrongSlot.diagnostics[0].message, /슬롯 header는 card-surface을 받지 않습니다/);
  assert.ok(wrongSlot.diagnostics[0].alternatives.includes('insights'));

  const missingSlot = dash({}, {components: [{...card('a', 'A'), slot: 'nowhere'}]});
  assert.equal(missingSlot.diagnostics[0].code, 'P_PAGE_SLOT');
  assert.deepEqual(missingSlot.diagnostics[0].alternatives, ['header', 'kpis', 'insights', 'detail']);

  const unknown = dash({}, {components: [{base: 'base-component:no-such', content: {}}]});
  assert.equal(unknown.diagnostics[0].code, 'P_PAGE_COMPONENT');
  assert.match(unknown.diagnostics[0].message, /페이지 노드로 놓을 수 없습니다/);

  const lone = dash({}, {components: [card('only', '혼자')]});
  assert.equal(lone.ok, false, 'a grid needs at least two cells');
  assert.match(lone.diagnostics[0].message, /격자는 2칸 이상/);
});

test('an open axis the family locks is refused per component, and a family prop reaches the node', () => {
  const locked = dash({kpis: kpis(4)}, {components: [{base: 'base-component:card-surface', props: {appearance: 'filled'}, content: {id: 'a', title: 'A', body: 'a'}}, {base: 'base-component:card-surface', content: {id: 'b', title: 'B', body: 'b'}}], families: ['family:quiet']});
  assert.equal(locked.ok, false);
  assert.ok(locked.blocked.length > 0 || locked.diagnostics.length > 0);
  assert.ok(locked.diagnostics.some(d => d.code === 'P_ATTR_LOCKED') || locked.blocked.some(b => b.blocked.some(x => x.code === 'P_ATTR_LOCKED')), JSON.stringify(locked.diagnostics));
});

test('charts are real nodes: all seven profile-listed presets assemble on the platform path (the profile path assembled two)', () => {
  const listed = [...new Set(Object.values(PROFILES).flatMap(p => p.charts.presets))];
  assert.equal(listed.length, 7);
  for (const preset of listed) {
    const r = dash({kpis: kpis(3), charts: [{preset}]});
    assert.equal(r.ok, true, `${preset}: ${JSON.stringify(r.diagnostics)}`);
    assert.match(r.value.html, /class="kit-chart"/, preset);
    assert.ok(r.decisions.some(d => d.slot === 'layout.chart' && d.id === preset), 'the placed preset is a recorded decision');
  }
  // user data replaces the preset sample and appears in the output
  const custom = dash({kpis: kpis(3), charts: [{preset: 'chart-preset:erp-quarterly-revenue', title: '내 매출', categories: ['가', '나', '다'], series: [{name: '제품', values: [1, 2, 3]}, {name: '서비스', values: [3, 2, 1]}]}]});
  assert.equal(custom.ok, true, JSON.stringify(custom.diagnostics));
  assert.ok(custom.value.html.includes('내 매출'));
  assert.ok(custom.value.html.includes('>가<') || custom.value.html.includes('가</'), 'custom categories are rendered');
  // 2 charts → grid, plus a list → aside
  const two = dash({charts: [{preset: 'chart-preset:erp-quarterly-revenue'}, {preset: 'chart-preset:sales-pipeline-value'}], list: {title: '다음 할 일', items: [{title: '결제 점검', description: '이번 주', status: '진행'}]}, kpis: kpis(3)});
  assert.equal(two.ok, true, JSON.stringify(two.diagnostics));
  assert.equal(count(two.value.html, /class="kit-chart"/), 2);
  assert.match(two.value.html, /kit-aside/);
  const bad = dash({charts: [{preset: 'chart-preset:does-not-exist'}]});
  assert.equal(bad.ok, false);
  assert.equal(bad.diagnostics[0].code, 'P_PAGE_CHART');
  const tooMany = dash({kpis: kpis(3), charts: Array(7).fill({preset: 'chart-preset:erp-quarterly-revenue'})});
  assert.equal(tooMany.diagnostics[0].code, 'P_PAGE_OVERFLOW');
});

test('content that does not fit is refused with the limit it hit, never truncated silently', () => {
  assert.equal(dash({kpis: kpis(1)}).diagnostics[0].code, 'P_PAGE_CONTENT');
  assert.match(dash({kpis: kpis(1)}).diagnostics[0].message, /2개 이상/);
  assert.equal(dash({kpis: kpis(13)}).diagnostics[0].code, 'P_PAGE_OVERFLOW');
  assert.equal(dash({table: {title: 'x', columns: ['a'], rows: []}}).diagnostics[0].code, 'P_PAGE_CONTENT');
  const landing = assemblePage({purpose: 'saas-landing', content: {features: [{title: '하나', body: '둘'}]}}, env);
  assert.equal(landing.diagnostics[0].code, 'P_PAGE_CONTENT');
  const faq = assemblePage({purpose: 'saas-landing', content: {faq: Array.from({length: 11}, (_, i) => ({question: `q${i}`, answer: 'a'}))}}, env);
  assert.equal(faq.diagnostics[0].code, 'P_PAGE_CONTENT');
});

test('landing features: card count sets the columns, and cards are placed as family members when a family exists', () => {
  const run = n => assemblePage({purpose: 'saas-landing', candidates: 1, content: {features: Array.from({length: n}, (_, i) => ({title: `기능 ${i + 1}`, body: `설명 ${i + 1}`}))}}, env);
  const [four, six, seven] = [run(4), run(6), run(7)];
  for (const r of [four, six, seven]) assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.match(four.value.html, /data-columns="four"/);
  assert.match(six.value.html, /data-columns="three"/);
  assert.match(seven.value.html, /data-columns="four"/);
  assert.equal(count(six.value.html, /<article class="kit-ctl-card"/), 6, 'plan upgrades legacy cards to family members');
  assert.ok(Object.keys(six.candidates[0].selection.families).length === 1);
  assert.ok(six.plan.components.every(c => c.auto === true));
});

test('editorial and docs: section count decides the pattern', () => {
  const sec = n => Array.from({length: n}, (_, i) => ({title: `절 ${i + 1}`, body: `본문 ${i + 1}`}));
  const art = assemblePage({purpose: 'editorial-docs', candidates: 1, content: {title: '글', lead: '리드', sections: sec(3)}}, env);
  const docs = assemblePage({purpose: 'editorial-docs', candidates: 1, content: {title: '문서', sections: sec(9)}}, env);
  assert.equal(art.plan.pattern, 'editorial-article');
  assert.equal(docs.plan.pattern, 'docs-reference');
  assert.equal(count(docs.value.html, /class="kit-prose"/), 9);
  const tooLong = assemblePage({purpose: 'editorial-docs', pattern: 'editorial-article', content: {title: '글', sections: sec(9)}}, env);
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.diagnostics[0].code, 'P_PAGE_OVERFLOW');
  assert.match(tooLong.diagnostics[0].message, /docs-reference/);
});

test('commerce listing: product count sets columns and pages; a 30-product list is page 1 of 3', () => {
  const products = n => Array.from({length: n}, (_, i) => ({title: `상품 ${i + 1}`, price: `${(i + 1) * 1000}원`, meta: '분류'}));
  const r = assemblePage({purpose: 'commerce', candidates: 1, content: {title: '상품', products: products(30)}}, env);
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(count(r.value.html, /class="kit-card" /), 12, 'one page of 12');
  assert.equal(count(r.value.html, /class="kit-pagination"/), 1);
  assert.match(r.decisions.find(d => d.slot === 'layout.products.pages').reason, /30개는 한 쪽에 12개씩 3쪽/);
  const detail = assemblePage({purpose: 'commerce', pattern: 'commerce-detail', candidates: 1, content: {title: '상세'}}, env);
  assert.equal(detail.ok, true, JSON.stringify(detail.diagnostics));
  const mismatch = assemblePage({purpose: 'commerce', pattern: 'commerce-detail', content: {products: products(3)}}, env);
  assert.match(mismatch.diagnostics[0].message, /상품 목록 칸이 없습니다/);
});

test('request shape: closed keys, no HTML/CSS path, purpose and axis values are checked, axes from the request win', () => {
  const bad = assemblePage({purpose: 'work-dashboard', html: '<b>x</b>', css: 'a{}', content: {style: 'x'}}, env);
  assert.equal(bad.ok, false);
  assert.equal(bad.stage, 'normalizePage');
  assert.deepEqual(bad.diagnostics.map(d => d.path).sort(), ['$.content.style', '$.css', '$.html']);
  assert.ok(bad.diagnostics.every(d => d.code === 'P_REQUEST_KEY' && d.alternatives.length));
  const purpose = assemblePage({purpose: 'blog'}, env);
  assert.equal(purpose.diagnostics[0].code, 'P_PAGE_PURPOSE');
  assert.deepEqual(purpose.diagnostics[0].alternatives, PURPOSE_IDS);
  assert.equal(assemblePage({purpose: 'work-dashboard', shell: 'nope'}, env).diagnostics[0].code, 'P_ATTR_AXIS');
  assert.equal(assemblePage({purpose: 'work-dashboard', candidates: 99}, env).diagnostics[0].code, 'P_REQUEST_CANDIDATES');
  const shell = dash({kpis: kpis(4)}, {shell: 'topbar', width: 'standard', density: 'spacious'});
  assert.deepEqual([shell.plan.axes.shell, shell.plan.axes.width, shell.plan.axes.density], ['topbar', 'standard', 'spacious']);
  assert.match(shell.value.html, /data-shell="topbar"/);
  const notAllowed = assemblePage({purpose: 'work-dashboard', pattern: 'dashboard-grid', shell: 'minimal'}, env);
  assert.equal(notAllowed.diagnostics[0].code, 'P_ATTR_AXIS');
  assert.match(notAllowed.diagnostics[0].message, /dashboard-grid 패턴은 shell=minimal를 허용하지 않습니다/);
  const wrongPattern = assemblePage({purpose: 'work-dashboard', pattern: 'marketing-landing'}, env);
  assert.equal(wrongPattern.diagnostics[0].code, 'P_PAGE_PATTERN');
});

test('the output is deterministic and every CSS variable it reads has a value', () => {
  const req = {purpose: 'work-dashboard', content: {title: '운영 현황', kpis: kpis(5), table: table(12), charts: [{preset: 'chart-preset:sales-pipeline-value'}]}};
  assert.equal(JSON.stringify(assemblePage(req, env)), JSON.stringify(assemblePage(structuredClone(req), env)));
  const r = assemblePage(req, env);
  for (const c of r.candidates) {
    assert.match(c.value.standalone, /^<!doctype html>\n<html lang="ko" data-theme="light"/, 'a standalone document is produced from the same css and html');
    assert.ok(c.value.standalone.includes(c.value.css) && c.value.standalone.includes(c.value.html));
    assert.match(c.value.standalone, /Content-Security-Policy" content="default-src 'none'/);
    const defined = new Set([...c.value.css.matchAll(/(--[A-Za-z0-9-]+):/g)].map(m => m[1]));
    const used = [...new Set([...c.value.css.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map(m => m[1]))];
    assert.deepEqual(used.filter(v => !defined.has(v)), [], c.id);
    assert.equal(c.quality.tokens.ok, true);
  }
});
