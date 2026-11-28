import {test} from 'node:test';
import assert from 'node:assert/strict';
import {platformEnv} from '../src/platform/compile.mjs';
import {PURPOSE_FAMILIES, getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {assembleComponents, assembleDesign, compileBlueprint} from '../src/service/index.mjs';

const env = platformEnv();
const VISUAL = 'family:quiet';
const IDS = [
  'purpose:mobile.action-sheet', 'purpose:mobile.list-cell',
  'purpose:mobile.full-screen-dialog', 'purpose:mobile.filter-panel',
  'purpose:mobile.sticky-action', 'purpose:mobile.safe-area',
];

test('O composite mobile patterns are registered with truthful component contracts', () => {
  for (const id of IDS) {
    const family = getPurposeFamily(id);
    assert.ok(family, `${id} is registered`);
    assert.ok(family.bases.length, `${id} declares reused bases`);
    assert.equal(family.entry.module, 'src/platform/families/mobile.mjs');
    const result = renderPurposeFamily(env, id, {
      visual: VISUAL, variant: family.example.variant, props: family.example.props,
      content: family.example.content, id: `test-${id.split('.').at(-1)}`,
    });
    assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.errors)}`);
    assert.match(result.html, /data-purpose="mobile\./);
    assert.ok(result.bases.length, `${id} output uses its declared base component`);
  }
  assert.equal(PURPOSE_FAMILIES.filter(x => x.group === 'mobile').length, IDS.length);
});

test('O mobile patterns reflect props, escape hostile content, and refuse unsupported values', () => {
  const cell = getPurposeFamily('purpose:mobile.list-cell');
  const request = {visual: VISUAL, variant: cell.example.variant, props: cell.example.props, content: cell.example.content, id: 'mobile-cell'};
  const normal = renderPurposeFamily(env, cell.id, request);
  const changed = renderPurposeFamily(env, cell.id, {...request, variant: {...request.variant, density: 'compact'}});
  assert.equal(normal.ok, true);
  assert.equal(changed.ok, true);
  assert.notEqual(changed.html, normal.html);
  const propChanged = renderPurposeFamily(env, cell.id, {...request, props: {...request.props, size: 'small'}});
  assert.equal(propChanged.ok, true);
  assert.notEqual(propChanged.html, normal.html, 'declared button size changes its actual output');
  const hostile = renderPurposeFamily(env, cell.id, {...request, content: {...request.content, title: '<img src=x onerror=alert(1)>'}});
  assert.equal(hostile.ok, true);
  assert.doesNotMatch(hostile.html, /<img\s/);
  assert.match(hostile.html, /&lt;img/);
  const invalid = renderPurposeFamily(env, cell.id, {...request, variant: {...request.variant, density: 'ultra'}});
  assert.equal(invalid.ok, false);
});

test('O mobile patterns assemble through Core and survive deterministic Blueprint JSON round-trips', () => {
  for (const id of IDS) {
    const family = getPurposeFamily(id);
    const item = {purpose: id, visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content, id: `mobile-${id.split('.').at(-1)}`};
    const assembled = assembleComponents({context: 'dashboard', items: [item]});
    assert.equal(assembled.ok, true, `${id}: ${JSON.stringify(assembled.errors)}`);
    assert.match(assembled.value.html, /data-purpose="mobile\./);
    if (id.includes('action-sheet') || id.includes('full-screen-dialog') || id.includes('filter-panel')) assert.match(assembled.value.script, /__kitMobileDialog/);

    const source = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: '완료', value: '1'}, {label: '대기', value: '2'}]}}, {include: ['blueprint']});
    assert.equal(source.ok, true, JSON.stringify(source.errors));
    const blueprint = structuredClone(source.value.candidates[0].value.blueprint);
    blueprint.materials.purposes = [0, 1].map(n => ({id, uid: `${item.id}-${n}`, visual: item.visual, variant: item.variant, props: item.props, content: item.content}));
    const grid = blueprint.tree.children.find(node => node.type === 'grid');
    grid.columns = 'two';
    grid.children = [0, 1].map(n => ({type: 'metric', label: `platform-purpose-${n}`, value: '0'}));
    const compiled = compileBlueprint(blueprint, {include: ['html', 'css', 'tokens', 'manifest']});
    assert.equal(compiled.ok, true, `${id}: ${JSON.stringify(compiled.errors)}`);
    const repeated = compileBlueprint(JSON.parse(JSON.stringify(blueprint)), {include: ['html', 'css', 'tokens', 'manifest']});
    assert.deepEqual(repeated, compiled);
    assert.match(compiled.value.html, /data-purpose="mobile\./);
  }
});

test('O mobile overlays expose native dialog keyboard semantics and safe-area layout reserves flow space', () => {
  for (const id of ['purpose:mobile.action-sheet', 'purpose:mobile.full-screen-dialog', 'purpose:mobile.filter-panel']) {
    const family = getPurposeFamily(id);
    const result = renderPurposeFamily(env, id, {visual: VISUAL, variant: family.example.variant, props: family.example.props, content: family.example.content, id: id.split('.').at(-1)});
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.match(result.html, /<dialog\b/);
    assert.match(result.html, /data-mobile-open/);
    assert.match(result.html, /data-mobile-close/);
    assert.match(family.css, /env\(safe-area-inset/);
  }
  const safe = getPurposeFamily('purpose:mobile.safe-area');
  const result = renderPurposeFamily(env, safe.id, {visual: VISUAL, variant: safe.example.variant, props: safe.example.props, content: safe.example.content, id: 'safe-area'});
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(safe.css, /padding-block-end:[^;}]*env\(safe-area-inset-bottom\)/);
  assert.match(safe.css, /padding-block-start:[^;}]*env\(safe-area-inset-top\)/);
});
