import test from 'node:test';
import {register} from 'node:module';
import assert from 'node:assert/strict';
register('../apps/web/features/studio/node-ts-loader.mjs', import.meta.url);
import {listPlatformMaterials, getPlatformMaterial, assembleDesign} from '../src/service/index.mjs';
import {CHART_SAMPLE, withChartPreset} from '../apps/web/features/platform/chart-compare.mjs';
import {listAllMaterials, LAYOUT_PAGE_PATTERN, patternOfLayout} from '../apps/web/features/platform/material-library.mjs';
const {readState, requestOf, writeState, withMaterialChoice} = await import('../apps/web/features/platform/assemble-state.ts');

test('studio URL keeps selected layout, component, and foundation materials and sends them to Core', () => {
  const original = {
    purpose: 'work-dashboard', step: 'swap', layout: 'dashboard-grid', component: 'data-table',
    surface: 'hairline-panel', motion: 'still', background: 'blueprint-grid-lines', media: 'square-tech',
    state: 'loading-skeleton', density: 'compact', shell: 'sidebar', width: 'wide', palette: 'ocean-cool',
    set: 'standard', type: 'work-console', family: 'soft', mode: 'dark', content: {title: '운영 현황'},
  };
  const href = writeState(original);
  const state = readState(new URLSearchParams(href.split('?')[1]));
  const request = requestOf(state);
  assert.equal(state.layout, original.layout);
  assert.equal(state.component, original.component);
  assert.equal(state.state, original.state);
  assert.equal(request.pattern, 'dashboard-grid');
  assert.deepEqual(request.states, {loading: 'state-pattern:loading-skeleton'});
  assert.equal(request.components[0].base, 'base-component:data-table');
  assert.equal(request.surface, 'surface:hairline-panel');
  assert.equal(request.motion, 'motion:still');
  assert.equal(request.background, 'background:blueprint-grid-lines');
  assert.equal(request.media, 'media:square-tech');
  assert.equal(request.density, 'compact');
  const spacingChoice = requestOf(withMaterialChoice(state, 'spacing', 'spacing:spacious'));
  assert.equal(spacingChoice.density, 'spacious');
  assert.deepEqual(request.content, {title: '운영 현황'});
  const nextTab = readState(new URLSearchParams(writeState({...state, step: 'export'}).split('?')[1]));
  assert.equal(nextTab.layout, original.layout);
  assert.equal(nextTab.component, original.component);
  assert.equal(nextTab.state, original.state);
  assert.equal(requestOf(nextTab).pattern, 'dashboard-grid');
});

test('an Explore comparison changes exactly one registered material axis in the Core request', () => {
  const state = readState(new URLSearchParams('purpose=saas-landing&palette=ocean-cool&set=standard&type=mkt-launch&family=soft&layout=split-hero'));
  const changed = withMaterialChoice(state, 'palette', 'palette:dusk-violet');
  const request = requestOf(changed);
  assert.equal(request.palette, 'palette:dusk-violet');
  assert.equal(request.subtokenSet, 'subtoken-set:standard');
  assert.equal(request.pattern, 'split-hero');
});

test('a layout choice reaches Core as a page pattern that assembleDesign accepts', () => {
  const request = requestOf(readState(new URLSearchParams('purpose=work-dashboard&layout=dashboard-grid')));
  assert.equal(request.pattern, 'dashboard-grid');
  const out = assembleDesign({...request, candidates: 1});
  assert.equal(out.ok, true, JSON.stringify(out.errors));
  assert.match(JSON.stringify(out.value.decisions), /"slot":"layout\.pattern","id":"dashboard-grid","source":"intent"/);
  // 예전 표기(layout: 접두)는 Core 가 거부했다. 이 시험이 되돌려지면 다시 거부된다.
  const old = assembleDesign({purpose: 'work-dashboard', candidates: 1, pattern: 'layout:dashboard-grid'});
  assert.equal(old.ok, false);
});

test('the layout→page pattern table equals the registry (layouts that reuse pattern:*)', () => {
  const listed = listPlatformMaterials({kind: 'layout', limit: 200}).value.items;
  const fromRegistry = Object.fromEntries(listed.flatMap(item => {
    const pattern = (getPlatformMaterial({id: item.id}).value.reuses ?? []).find(r => r.startsWith('pattern:'));
    return pattern ? [[item.id.slice('layout:'.length), pattern.slice('pattern:'.length)]] : [];
  }));
  assert.deepEqual(LAYOUT_PAGE_PATTERN, fromRegistry);
  assert.equal(patternOfLayout('bento'), 'bento');
});

test('chart comparison puts the identical data into two registered presets that Core assembles', () => {
  const base = {purpose: 'work-dashboard', candidates: 1};
  const bar = withChartPreset(base, 'chart-preset:marketing-channel-roas');
  const line = withChartPreset(base, 'chart-preset:analytics-traffic-lines');
  assert.notEqual(bar.content.charts[0].preset, line.content.charts[0].preset);
  assert.deepEqual(bar.content.charts[0].categories, line.content.charts[0].categories);
  assert.deepEqual(bar.content.charts[0].series, line.content.charts[0].series);
  assert.deepEqual(bar.content.charts[0].series, CHART_SAMPLE.series);
  const htmls = [bar, line].map(request => {
    const out = assembleDesign(request);
    assert.equal(out.ok, true, JSON.stringify(out.errors));
    return out.value.candidates[0].value.html;
  });
  for (const html of htmls) assert.ok(html.includes(CHART_SAMPLE.title) && html.includes('22'), 'both charts show the same data');
  assert.notEqual(htmls[0], htmls[1], 'the visualization differs');
});

test('platform materials fetches every registry page rather than only the default first page', () => {
  const listAll = kind => listAllMaterials(query => listPlatformMaterials(query), kind);
  const total = kind => listPlatformMaterials({kind, limit: 200}).value.total;
  const palette = listAll('palette');
  assert.equal(palette.length, total('palette'));
  for (const kind of ['layout', 'base-component', 'surface', 'motion', 'background', 'media', 'state-pattern', 'spacing']) {
    assert.equal(listAll(kind).length, total(kind), kind);
  }
});
