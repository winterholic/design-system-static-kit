import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileBlueprint, getComponentSpec} from '../src/service/index.mjs';
import * as edit from '../src/edit/index.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {renderCard, cardExamples} from '../src/materials/card.mjs';
import {renderDataTable} from '../src/materials/table.mjs';

/**
 * REQUEST §6.2 F 카드(22)·G 데이터 표시(20) 42행이 이름의 뜻대로 렌더되는지 본다.
 * 어느 재료가 어느 행을 맡는지는 MATERIAL-COVERAGE.json의 요구 레코드에서 읽고, 행 이름은 REQUEST.md에서 읽는다.
 */
const root = new URL('..', import.meta.url);
const coverage = JSON.parse(readFileSync(new URL('docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', root), 'utf8'));
const request = readFileSync(new URL('docs/dev/catalog-platform-upgrade/REQUEST.md', root), 'utf8');
const sectionNames = letter => { const start = request.indexOf(`\n### ${letter}. `), body = request.slice(start + 1, request.indexOf('\n### ', start + 5)); return body.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim()); };
const reqs = coverage.requirements.filter(r => /^req:comp:[fg]-/.test(r.id));
const byName = new Map(reqs.map(r => [r.name, r]));

const env = platformEnv();
const purpose = (id, over = {}) => {
  const family = getPurposeFamily(id), result = renderPurposeFamily(env, id, {visual: 'family:quiet', ...family.example, ...over, id: `req-${id.split('.').at(-1)}`});
  assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.errors)}`);
  return result.html;
};
const nodeDoc = node => {
  let doc = edit.resetDocument(null, {template: 'about-team', theme: 'workspace'}).doc;
  doc = edit.insertNode(doc, {parent: [], node, index: doc.tree.children.length}).doc;
  for (let i = doc.tree.children.length - 2; i >= 1; i--) doc = edit.removeNode(doc, {path: [i]}).doc;
  return doc;
};
const legacy = (type, patch = {}, wrap = null) => {
  const spec = getComponentSpec({type});
  assert.equal(spec.ok, true, type);
  const node = {...spec.value.example, ...patch};
  const out = compileBlueprint(nodeDoc(wrap ? wrap(node) : node), {include: ['html']});
  assert.equal(out.ok, true, `${type}: ${JSON.stringify(out.errors)}`);
  const html = out.value.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  return html.match(/<main[\s\S]*<\/main>/)[0];
};
const templatePage = name => { const made = edit.resetDocument(null, {template: name}); assert.equal(made.ok, true, name); return compileBlueprint(made.doc, {include: ['html']}).value.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''); };
const count = (html, re) => (html.match(re) ?? []).length;
const COLUMNS = [{id: 'name', label: '이름'}, {id: 'value', label: '값', kind: 'number'}], ROWS = [{id: 'a', name: 'API', value: 12}, {id: 'b', name: 'Web', value: 4}];
const table = extra => renderDataTable({id: 'req-table', columns: COLUMNS, rows: ROWS, ...extra});
const card = extra => renderCard({...cardExamples[0], id: 'req-card', ...extra});

const MEANING = {
  'Basic Card': () => { const h = card(); assert.match(h, /<article class="kit-ctl-card"/); assert.match(h, /<h3 class="kit-ctl-card-title">프로젝트 개요<\/h3>/); assert.equal(count(h, /<a |<button/g), 0, 'a plain card has no stop'); },
  'Feature Card': () => { const h = purpose('purpose:card.feature'); assert.match(h, /<article/); assert.ok(count(h, /<h3/g) >= 1); },
  'KPI Card': () => { const h = purpose('purpose:card.kpi', {variant: {layout: 'stacked', trend: 'none'}}); assert.match(h, /class="pf-kpi-value"/); assert.match(h, /data-dir="up"/); assert.match(h, /<span class="kit-ctl-sr">증가 <\/span>/, 'the direction is also text'); },
  'Statistic Card': () => { const h = legacy('metric'); assert.match(h, /<dl[^>]*class="kit-metric"/); assert.match(h, /<dt>[^<]+<\/dt><dd data-vl="\d+">\d+<\/dd>/); },
  'Metric Trend Card': () => { const h = purpose('purpose:card.kpi'), plain = purpose('purpose:card.kpi', {variant: {layout: 'stacked', trend: 'none'}}); assert.match(h, /data-kind="sparkline"/); assert.doesNotMatch(plain, /data-kind="sparkline"/); assert.notEqual(h, plain); assert.match(h, /<summary>데이터 표 보기<\/summary>/, 'the trend has a data table'); assert.equal(count(h, /<tbody>[\s\S]*?<\/tbody>/g) && count(h, /<tr><th scope="row">/g), 7); },
  'Product Card': () => { const h = purpose('purpose:card.product'); assert.match(h, /pf-card/); assert.match(h, /₩|원/); },
  'Product Comparison Card': () => { const h = purpose('purpose:card.comparison'); assert.equal(count(h, /<h4>/g), 2); assert.match(h, /role="group" aria-label="요금제 비교"/); assert.ok(h.indexOf('기본') < h.indexOf('팀')); },
  'Profile Card': () => { const h = purpose('purpose:card.profile'); assert.match(h, /<article/); },
  'Team Member Card': () => { const h = legacy('team'); assert.match(h, /class="kit-team"/); assert.ok(count(h, /<strong>/g) >= 2, 'one name per member'); },
  'Article Card': () => { const h = purpose('purpose:card.article'); assert.match(h, /<article/); },
  'Media Card': () => { const h = templatePage('saas-landing'); assert.match(h, /<article[^>]*class="kit-card" data-variant="media"><div class="kit-card-media"[^>]*>[\s\S]*?<\/div><div class="kit-card-body"><h3[^>]*>[^<]+<\/h3>/, 'the media variant puts the picture before the body'); },
  'Pricing Card': () => { const h = purpose('purpose:card.pricing'); assert.match(h, /pf-card|pf-pricing/); },
  'Plan Card': () => { const h = templatePage('saas-landing'); assert.ok(count(h, /<article[^>]*class="kit-plan"/g) >= 2); const plan = h.match(/<article[^>]*class="kit-plan"[\s\S]*?<\/article>/)[0]; assert.match(plan, /<h3[^>]*>[^<]+<\/h3><p class="kit-price"/); assert.match(plan, /<ul><li>/); assert.match(plan, /<a class="kit-button"/); },
  'Notification Card': () => { const h = purpose('purpose:card.notification'); assert.match(h, /data-unread="true"/); assert.match(h, /읽지 않음/); assert.doesNotMatch(h, /role="(status|alert)"|aria-live/, 'static state is text, not a live region'); },
  'Activity Card': () => { const h = purpose('purpose:card.activity'); assert.match(h, /<ol>/); assert.equal(count(h, /<li class="pf-card-row">/g), 2); assert.ok(h.indexOf('민지') < h.indexOf('도윤')); },
  'Settings Card': () => { const h = purpose('purpose:form.settings', {variant: {layout: 'cards'}}); assert.match(h, /data-layout="cards"|pf-settings/); },
  'Integration Card': () => { const h = purpose('purpose:card.integration'); assert.match(h, /<h3[^>]*>Slack<\/h3>/); assert.match(h, /data-status-label>연결됨</); assert.doesNotMatch(h, /role="status"/); },
  'Review Card': () => { const h = purpose('purpose:card.review'); assert.match(h, /role="img" aria-label="별점 4.5점 \/ 5점">★★★★☆</); assert.match(h, /<blockquote>/); },
  'Testimonial Card': () => { const h = legacy('quote'); assert.match(h, /<figure[^>]*class="kit-quote"><blockquote>/); assert.match(h, /<figcaption>/); },
  'Interactive Selection Card': () => { const h = purpose('purpose:card.selection'); assert.match(h, /<button type="button" class="kit-ctl-card-hit pf-card-hit" aria-pressed="false">월간 결제<\/button>/); assert.match(h, /data-selected="false"/); assert.match(h, /data-selected-label/); const on = purpose('purpose:card.selection', {props: {behavior: 'selectable', state: 'selected'}}); assert.match(on, /aria-pressed="true"/); assert.match(on, /data-selected="true"/); },
  'Dashboard Widget Card': () => { const h = purpose('purpose:card.dashboard-widget'); assert.match(h, /class="pf-num pf-card-widget-value">1,284/); assert.equal(count(h, /<div class="pf-card-row"><dt/g), 2); },
  'Financial Asset Card': () => { const h = purpose('purpose:card.financial-asset'); assert.match(h, /<span class="kit-ctl-sr">상승 <\/span>\+1\.4%/); assert.match(h, /005930/); const down = purpose('purpose:card.financial-asset', {content: {...getPurposeFamily('purpose:card.financial-asset').example.content, direction: 'down', change: '-1.4%'}}); assert.match(down, /하락/); },
  'Basic Table': () => { const h = table(); assert.match(h, /<table/); assert.equal(count(h, /<th scope="col"/g), 2); assert.equal(count(h, /<tr data-row=/g), 2); },
  'Data Table': () => { const h = purpose('purpose:table.business'); assert.match(h, /<table/); assert.match(h, /<caption|aria-label/); },
  'Sortable Table': () => { const h = table({sortable: true}), plain = table(); assert.match(h, /<button type="button" data-sort="name">/); assert.doesNotMatch(plain, /data-sort=/); },
  'Filterable Table': () => { const h = purpose('purpose:table.filterable'); assert.match(h, /<input type="search"[^>]*data-table-filter[^>]*aria-controls="req-filterable-table"/); assert.match(h, /<section class="kit-data-table" data-table-filterable id="req-filterable-table"/, 'the table keeps its base class, so its sort wiring and styles stay'); assert.match(h, /data-filter-count role="status" aria-live="polite"/); assert.match(h, /<p data-filter-empty hidden>/); },
  'Selectable Table': () => { const h = table({selectable: true}), plain = table(); assert.match(h, /type="checkbox"/); assert.doesNotMatch(plain, /type="checkbox"/); },
  'Expandable Row Table': () => { const h = purpose('purpose:table.expandable'); assert.equal(count(h, /<details data-row-expand>/g), 2); assert.match(h, /<summary aria-expanded="false" aria-controls="req-expandable-detail-0">/); assert.match(h, /id="req-expandable-detail-0"/); },
  'Grouped Table': () => { const h = purpose('purpose:table.grouped'); assert.equal(count(h, /<tbody>/g), 2, 'one tbody per group'); assert.equal(count(h, /<th scope="rowgroup" colspan="3">/g), 2); assert.ok(h.indexOf('진행 중</th>') < h.indexOf('카탈로그') && h.indexOf('완료</th>') > h.indexOf('서비스')); },
  'Dense Table': () => { const h = purpose('purpose:table.dense'); assert.match(h, /<table/); assert.match(h, /data-density="compact"/); },
  'Description List': () => { const h = legacy('properties'); assert.match(h, /<dl>(<div><dt>[^<]+<\/dt><dd>[^<]+<\/dd><\/div>)+<\/dl>/); },
  List: () => { const h = legacy('list'); assert.match(h, /<ul><li>/); assert.match(h, /class="kit-list"/); },
  'List Item': () => { const h = legacy('list'); assert.match(h, /<li><div><strong>[^<]+<\/strong><p>/, 'an item is a title, a line of text and a badge inside the list'); },
  'Tree View': () => { const h = purpose('purpose:table.tree'); assert.match(h, /<ul class="pf-tree" role="tree" aria-label="프로젝트">/); assert.equal(count(h, /role="treeitem"/g), 5); assert.equal(count(h, /tabindex="0"/g), 1, 'roving tabindex starts with one stop'); assert.equal(count(h, /aria-expanded="false" aria-controls=/g), 2); assert.equal(count(h, /<ul role="group"[^>]* hidden>/g), 2); },
  Kanban: () => { const h = legacy('kanban'); assert.match(h, /<div class="kit-kanban" role="group" aria-label="칸반 보드" tabindex="0">/); assert.ok(count(h, /class="kit-lane"/g) >= 2); assert.match(h, /<article class="kit-task">/); },
  Timeline: () => { const h = legacy('timeline'); assert.match(h, /class="kit-timeline" data-variant="line"/); assert.ok(count(h, /<li data-status=/g) >= 2); assert.match(h, /<time>/); },
  'Activity Feed': () => { const log = legacy('timeline', {variant: 'log'}), line = legacy('timeline'); assert.match(log, /data-variant="log"/); assert.match(log, /class="kit-rel-meta"/); assert.notEqual(log, line); },
  'Master-detail': () => { const h = legacy('master-detail'); assert.match(h, /<ul class="kit-md-list"><li aria-current="true"/); assert.match(h, /<article class="kit-md-detail"><h3>/); },
  'Key-value Inspector': () => { const h = purpose('purpose:table.inspector'); assert.match(h, /<dl class="pf-inspector"><dt>requestId<\/dt><dd>req_01JABCD<\/dd>/); assert.equal(count(h, /<dt>/g), 3); },
  'Log Viewer': () => { const h = purpose('purpose:table.log-viewer'); assert.equal(count(h, /<th scope="col"/g), 3); assert.equal(count(h, /<tr data-row=/g), 2); assert.match(h, /pf-log-message/); assert.match(h, /ERROR/); },
  'Code Block': () => { const h = legacy('code'); assert.match(h, /<pre tabindex="0"><code>/); assert.match(h, /data-copy aria-label="[^"]+ 코드 복사"/); assert.match(h, /data-copy-status/); },
  'Diff Viewer': () => { const h = purpose('purpose:table.diff'); assert.equal(count(h, /<ol>/g), 2); assert.equal(count(h, /data-change="removed"/g), 2); assert.equal(count(h, /data-change="added"/g), 2); assert.match(h, /aria-label="이전"/); assert.match(h, /aria-label="이후"/); assert.ok(h.indexOf('timeout: 10') < h.indexOf('timeout: 30')); },
};

test('§6.2 F·G names in REQUEST.md equal the coverage requirements (22 + 20 = 42; F direct 19 variant 3, G direct 16 variant 3 part-of 1)', () => {
  const expected = [...sectionNames('F'), ...sectionNames('G')];
  assert.equal(expected.length, 42);
  assert.deepEqual([...reqs.map(r => r.name)].sort(), [...expected].sort());
  const tally = letter => Object.fromEntries(['direct', 'variant', 'part-of', 'schema', 'missing'].map(k => [k, reqs.filter(r => r.id.startsWith(`req:comp:${letter}-`) && r.coverage === k).length]));
  assert.deepEqual(tally('f'), {direct: 19, variant: 3, 'part-of': 0, schema: 0, missing: 0});
  assert.deepEqual(tally('g'), {direct: 16, variant: 3, 'part-of': 1, schema: 0, missing: 0});
  assert.deepEqual(Object.keys(MEANING).sort(), [...expected].sort(), 'every row has a meaning check');
});

for (const name of Object.keys(MEANING)) {
  test(`§6.2 ${name}: the row renders what its name means`, () => {
    const req = byName.get(name);
    assert.ok(req && req.materialIds.length >= 1 && req.coverage !== 'missing', `${name} is covered`);
    MEANING[name]();
  });
}

test('§6.2 variant rows differ from their base render in the axis the record names', () => {
  const recorded = Object.fromEntries(reqs.filter(r => r.coverage === 'variant').map(r => [r.name, r.variant]));
  assert.deepEqual(recorded, {'Metric Trend Card': {trend: 'spark'}, 'Media Card': {variant: 'media'}, 'Settings Card': {layout: 'cards'}, 'Sortable Table': {sortable: true}, 'Selectable Table': {selectable: true}, 'Activity Feed': {variant: 'log'}});
  assert.notEqual(table({sortable: true}), table());
  assert.notEqual(table({selectable: true}), table());
  assert.notEqual(purpose('purpose:form.settings', {variant: {layout: 'cards'}}), purpose('purpose:form.settings'));
});
