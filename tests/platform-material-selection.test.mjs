import test from 'node:test';
import {register} from 'node:module';
import assert from 'node:assert/strict';
register('../apps/web/features/studio/node-ts-loader.mjs', import.meta.url);
import {listPlatformMaterials} from '../src/service/index.mjs';
import {chartNodeOf} from '../apps/web/features/platform/chart-compare.mjs';
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
  assert.equal(request.pattern, 'layout:dashboard-grid');
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
  assert.equal(requestOf(nextTab).pattern, 'layout:dashboard-grid');
});

test('an Explore comparison changes exactly one registered material axis in the Core request', () => {
  const state = readState(new URLSearchParams('purpose=saas-landing&palette=ocean-cool&set=standard&type=mkt-launch&family=soft&layout=split-hero'));
  const changed = withMaterialChoice(state, 'palette', 'palette:dusk-violet');
  const request = requestOf(changed);
  assert.equal(request.palette, 'palette:dusk-violet');
  assert.equal(request.subtokenSet, 'subtoken-set:standard');
  assert.equal(request.pattern, 'layout:split-hero');
});

test('chart preset comparison uses identical data and the material registry visualization form', () => {
  const base = {ext: {chartKind: 'bar'}, examples: [{grid: 'horizontal', labels: 'values'}]};
  const bar = chartNodeOf(base);
  const line = chartNodeOf({...base, ext: {chartKind: 'line'}});
  assert.notEqual(bar.kind, line.kind);
  assert.deepEqual(bar.categories, line.categories);
  assert.deepEqual(bar.series, line.series);
  assert.equal(bar.grid, 'horizontal');
});

test('platform materials fetches every registry page rather than only the default first page', () => {
  const palette = listPlatformMaterials({kind: 'palette', limit: 200});
  assert.equal(palette.ok, true);
  assert.equal(palette.value.items.length, palette.value.total);
  for (const kind of ['layout', 'base-component', 'surface', 'motion', 'background', 'media', 'state-pattern', 'spacing']) {
    const result = listPlatformMaterials({kind, limit: 200});
    assert.equal(result.ok, true, kind);
    assert.equal(result.value.items.length, result.value.total, kind);
  }
});
