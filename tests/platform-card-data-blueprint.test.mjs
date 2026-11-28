// §6.2 F·G 15개 누락 항목은 목적 패밀리로 Blueprint에 연결되고 같은 Core 렌더를 낸다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleDesign, compileBlueprint, validateBlueprint, listPlatformMaterials, getPlatformMaterial} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {ALL_COMPONENT_CONTRACTS} from '../src/platform/families/contracts.mjs';
import {COMPONENT_CLASSIFICATION} from '../src/platform/families/inventory.mjs';
import {CARD_SELECTION_RUNTIME} from '../src/platform/families/card-extra.mjs';
import {renderChartPreset} from '../src/render/chart-presets.mjs';

const env = platformEnv();
const VISUAL = 'family:quiet';
test('KPI trend card delegates its sparkline and accessible data summary to the verified chart preset renderer', () => {
  const series = [3, 8, 5], categories = series.map((_, index) => String(index + 1));
  const expected = renderChartPreset('chart-preset:mobile-sparkline', {title: '이번 달 매출 추세', caption: '이번 달 매출 값 변화', xLabel: '순서', yLabel: '값', unit: '', labels: 'none', categories, series: [{name: '이번 달 매출 추세', values: series}]});
  assert.equal(typeof expected, 'string');
  const family = getPurposeFamily('purpose:card.kpi');
  const rendered = renderPurposeFamily(env, family.id, {
    visual: VISUAL, variant: {layout: 'stacked', trend: 'spark'}, props: family.example.props,
    content: {...family.example.content, label: '이번 달 매출', unit: '', series}, id: 'chart-card',
  });
  assert.equal(rendered.ok, true, JSON.stringify(rendered.errors));
  assert.ok(rendered.html.includes(expected), 'the card embeds the exact validated chart preset output');
});
const CASES = [
  ['req:comp:f-07-product-comparison-card', 'purpose:card.comparison'],
  ['req:comp:f-14-notification-card', 'purpose:card.notification'],
  ['req:comp:f-15-activity-card', 'purpose:card.activity'],
  ['req:comp:f-17-integration-card', 'purpose:card.integration'],
  ['req:comp:f-18-review-card', 'purpose:card.review'],
  ['req:comp:f-20-interactive-selection-card', 'purpose:card.selection'],
  ['req:comp:f-21-dashboard-widget-card', 'purpose:card.dashboard-widget'],
  ['req:comp:f-22-financial-asset-card', 'purpose:card.financial-asset'],
  ['req:comp:g-04-filterable-table', 'purpose:table.filterable'],
  ['req:comp:g-06-expandable-row-table', 'purpose:table.expandable'],
  ['req:comp:g-07-grouped-table', 'purpose:table.grouped'],
  ['req:comp:g-12-tree-view', 'purpose:table.tree'],
  ['req:comp:g-17-key-value-inspector', 'purpose:table.inspector'],
  ['req:comp:g-18-log-viewer', 'purpose:table.log-viewer'],
  ['req:comp:g-20-diff-viewer', 'purpose:table.diff'],
];

function blueprintFor(id, content, uid = 'd3-item') {
  const base = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: '기본', value: '0'}, {label: '보조', value: '1'}]}}, {include: ['blueprint']});
  assert.equal(base.ok, true, JSON.stringify(base.errors));
  const b = structuredClone(base.value.candidates[0].value.blueprint);
  const family = getPurposeFamily(id);
  b.materials.purposes = [uid, `${uid}-second`].map(itemUid => ({id, visual: VISUAL, uid: itemUid, variant: family.example.variant, props: family.example.props, content}));
  const grid = b.tree.children.find(n => n.type === 'grid');
  grid.columns = 'two';
  grid.children = [{type: 'metric', label: 'platform-purpose-0', value: '0'}, {type: 'metric', label: 'platform-purpose-1', value: '0'}];
  return b;
}

test('F·G: all missing §6.2 requirements have their inventory layer and executable Blueprint material', async () => {
  for (const [requirementId, id] of CASES) {
    const f = getPurposeFamily(id);
    assert.ok(f, `${requirementId} resolves to ${id}`);
    const renderer = await import(new URL(`../${f.entry.module}`, import.meta.url));
    assert.equal(typeof renderer[f.entry.export], 'function', `${id} registry entry resolves to its renderer`);
    assert.equal(f.id, id);
    const contract = ALL_COMPONENT_CONTRACTS.find(c => c.id === id);
    assert.ok(contract, `${id} has a registered component contract`);
    const key = requirementId.slice('req:comp:'.length), classification = COMPONENT_CLASSIFICATION[key];
    assert.ok(classification, `${requirementId} is classified`);
    assert.equal(contract.componentType, key, `${id} counts under its inventory requirement`);
    assert.equal(contract.layer, classification === 'composite' ? 'Composite' : 'Purpose', `${id} follows its inventory layer`);
    const rendered = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: f.example.props, content: f.example.content, id: 'direct'});
    assert.equal(rendered.ok, true, `${id}: ${JSON.stringify(rendered.errors)}`);
    assert.ok(rendered.html.length > 0);
    const bp = blueprintFor(id, f.example.content);
    assert.equal(validateBlueprint(bp).ok, true, `${id} Blueprint validates: ${JSON.stringify(validateBlueprint(bp).errors)}`);
    const first = compileBlueprint(bp, {include: ['html', 'css', 'tokens', 'manifest']});
    assert.equal(first.ok, true, `${id}: ${JSON.stringify(first.errors)}`);
    const second = compileBlueprint(structuredClone(bp), {include: ['html', 'css', 'tokens', 'manifest']});
    assert.deepEqual(second, first, `${id} compilation is deterministic`);
    assert.ok(first.value.html.includes(renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: f.example.props, content: f.example.content, id: 'd3-item'}).html), `${id} Blueprint emits Core markup`);
    assert.deepEqual(first.value.manifest.platform.materials.purposes.map(x => x.id), [id, id]);
    assert.equal(getPlatformMaterial({id}).ok, true, `${id} is queryable through the registry`);
    assert.ok(listPlatformMaterials({kind: 'purpose-family', query: id.split(':')[1], limit: 100}).value.items.some(x => x.id === id));
  }
});

test('F·G: the declared state inputs drive loading, empty and error output', () => {
  for (const [, id] of CASES.filter(([req]) => req.startsWith('req:comp:f-'))) {
    const f = getPurposeFamily(id);
    const loading = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: {...f.example.props, state: 'loading'}, content: f.example.content, id: 'state-loading'});
    assert.equal(loading.ok, true, `${id}: ${JSON.stringify(loading.errors)}`);
    assert.match(loading.html, /aria-busy="true"[\s\S]*role="status"/);
    const empty = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: {...f.example.props, state: 'empty'}, content: f.example.content, id: 'state-empty'});
    assert.equal(empty.ok, true, `${id}: ${JSON.stringify(empty.errors)}`);
    assert.match(empty.html, /role="status"/);
    const error = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: {...f.example.props, state: 'error'}, content: {...f.example.content, message: '요청 실패'}, id: 'state-error'});
    assert.equal(error.ok, true, `${id}: ${JSON.stringify(error.errors)}`);
    assert.match(error.html, /role="alert"/);
    assert.match(error.html, /요청 실패/);
  }
  for (const [, id] of CASES.filter(([req]) => req.startsWith('req:comp:g-'))) {
    const f = getPurposeFamily(id);
    const request = {visual: VISUAL, variant: f.example.variant, props: {...f.example.props, state: 'loading'}, content: f.example.content, id: 'table-loading'};
    const loading = renderPurposeFamily(env, id, request);
    assert.equal(loading.ok, true, `${id}: ${JSON.stringify(loading.errors)}`);
    assert.match(loading.html, /aria-busy="true"/);
    const empty = renderPurposeFamily(env, id, {...request, props: {...f.example.props, state: 'empty'}});
    assert.equal(empty.ok, true, `${id} empty: ${JSON.stringify(empty.errors)}`);
    assert.match(empty.html, /data-state="empty"[\s\S]*role="status"/);
    const error = renderPurposeFamily(env, id, {...request, props: {...f.example.props, state: 'error'}, content: {...f.example.content, message: '데이터 오류'}});
    assert.equal(error.ok, true, `${id}: ${JSON.stringify(error.errors)}`);
    assert.match(error.html, /role="alert"/);
  }
});

test('F·G: user strings stay escaped and table/card state markers correspond to rendered behavior', () => {
  for (const [, id] of CASES) {
    const f = getPurposeFamily(id);
    assert.ok(f, `${id} registered`);
    const inject = (value, key = '') => { if (typeof value === 'string') return ['direction', 'href', 'id', 'parent'].includes(key) ? value : '<img src=x onerror=alert(1)>'; if (Array.isArray(value)) return value.map(item => inject(item)); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([child, item]) => [child, inject(item, child)])); return value; };
    const hostile = inject(f.example.content);
    const changed = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: f.example.props, content: hostile, id: 'safe-id'});
    assert.equal(changed.ok, true, `${id}: ${JSON.stringify(changed.errors)}`);
    assert.doesNotMatch(changed.html, /<img\s/);
    assert.match(changed.html, /&lt;img/);
    assert.equal((changed.html.match(/\bid="safe-id(?:-[^"]*)?"/g) ?? []).length, new Set((changed.html.match(/\bid="safe-id(?:-[^"]*)?"/g) ?? [])).size, `${id} ids are unique`);
  }
  const selection = getPurposeFamily('purpose:card.selection');
  const selectionHtml = renderPurposeFamily(env, selection.id, {visual: VISUAL, variant: selection.example.variant, props: selection.example.props, content: selection.example.content, id: 'selection-test'}).html;
  assert.match(selectionHtml, /class="[^"]*pf-card-selection/);
  assert.match(selectionHtml, /data-selected="false"/);
  assert.match(CARD_SELECTION_RUNTIME, /\.pf-card-selection \.pf-card-hit/);
  assert.match(CARD_SELECTION_RUNTIME, /article\.setAttribute\('data-selected'/);
  const filter = getPurposeFamily('purpose:table.filterable');
  assert.ok(filter, 'filterable table exists');
  const rendered = renderPurposeFamily(env, filter.id, {visual: VISUAL, variant: filter.example.variant, props: filter.example.props, content: filter.example.content, id: 'filter-test'});
  assert.match(rendered.html, /<input[^>]+type="search"/);
  assert.match(rendered.html, /data-table-filter/);
  const tree = getPurposeFamily('purpose:table.tree');
  assert.ok(tree, 'tree view exists');
  const treeHtml = renderPurposeFamily(env, tree.id, {visual: VISUAL, variant: tree.example.variant, props: tree.example.props, content: tree.example.content, id: 'tree-test'}).html;
  assert.match(treeHtml, /role="tree"/);
  assert.match(treeHtml, /aria-expanded="(?:true|false)"/);
  const expandable = getPurposeFamily('purpose:table.expandable');
  assert.ok(expandable, 'expandable rows exist');
  const expandableHtml = renderPurposeFamily(env, expandable.id, {visual: VISUAL, variant: expandable.example.variant, props: expandable.example.props, content: expandable.example.content, id: 'expand-test'}).html;
  assert.match(expandableHtml, /aria-expanded="(?:true|false)"/);
  assert.match(expandableHtml, /data-row-expand/);
});
