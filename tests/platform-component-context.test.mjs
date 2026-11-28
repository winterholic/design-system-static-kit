import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleComponentContext} from '../src/service/component-context.mjs';
import {checkCompatibility, listPlatformMaterials} from '../src/service/index.mjs';

const base = {
  context: 'general', base: 'base-component:button-control', family: 'family:soft',
  palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:mkt-launch',
  mode: 'light', density: 'comfortable', viewport: 1280,
  props: {appearance: 'solid', size: 'medium', state: 'default'}, content: {label: 'Save'},
};

const hash = result => createHash('sha256').update(JSON.stringify(result.files)).digest('hex');
const idsOf = request => [request.palette, request.subtokenSet, request.typeSystem, request.base, request.family,
  `axis-value:mode.${request.mode}`, `axis-value:density.${request.density}`].filter(Boolean);

test('Core component context: every Playground axis changes the exported render fingerprint', () => {
  const original = assembleComponentContext(base);
  assert.equal(original.ok, true, JSON.stringify(original.errors));
  const changes = [
    ['palette', listPlatformMaterials({kind: 'palette', limit: 200}).value.items.map(x => x.id)],
    ['subtokenSet', listPlatformMaterials({kind: 'subtoken-set', limit: 200}).value.items.map(x => x.id)],
    ['family', listPlatformMaterials({kind: 'family', limit: 200}).value.items.map(x => x.id)],
    ['typeSystem', listPlatformMaterials({kind: 'type-system', limit: 200}).value.items.map(x => x.id)],
  ];
  for (const [axis, values] of changes) {
    const next = values.find(value => {
      if (value === base[axis]) return false;
      const candidate = {...base, [axis]: value};
      const verdict = checkCompatibility({ids: idsOf(candidate), mode: candidate.mode, density: candidate.density});
      return verdict.ok && verdict.value.ok;
    });
    assert.ok(next, `${axis} has a compatible alternate`);
    const rendered = assembleComponentContext({...base, [axis]: next});
    assert.equal(rendered.ok, true, `${axis}: ${JSON.stringify(rendered.errors)}`);
    assert.notEqual(hash(rendered.value), hash(original.value), axis);
  }
  for (const [axis, value] of Object.entries({mode: 'dark', density: 'compact', viewport: 390})) {
    const rendered = assembleComponentContext({...base, [axis]: value});
    assert.equal(rendered.ok, true, `${axis}: ${JSON.stringify(rendered.errors)}`);
    assert.notEqual(hash(rendered.value), hash(original.value), axis);
  }
  for (const [key, value] of [['appearance', 'outline'], ['size', 'large'], ['state', 'disabled']]) {
    const rendered = assembleComponentContext({...base, props: {...base.props, [key]: value}});
    assert.equal(rendered.ok, true, `${key}: ${JSON.stringify(rendered.errors)}`);
    assert.notEqual(hash(rendered.value), hash(original.value), key);
  }
  const changedContent = assembleComponentContext({...base, content: {label: 'Continue'}});
  assert.equal(changedContent.ok, true, JSON.stringify(changedContent.errors));
  assert.notEqual(hash(changedContent.value), hash(original.value), 'content');
});

test('Core component context: incompatible graph choices report why and forced render is rejected', () => {
  const palettes = listPlatformMaterials({kind: 'palette', limit: 200}).value.items.map(x => x.id);
  const sets = listPlatformMaterials({kind: 'subtoken-set', limit: 200}).value.items.map(x => x.id);
  let blocked;
  for (const palette of palettes) {
    for (const subtokenSet of sets) {
      const candidate = {...base, palette, subtokenSet};
      const verdict = checkCompatibility({ids: idsOf(candidate), mode: candidate.mode, density: candidate.density});
      if (verdict.ok && !verdict.value.ok) { blocked = {candidate, verdict: verdict.value}; break; }
    }
    if (blocked) break;
  }
  assert.ok(blocked, 'registry contains an incompatible palette × subtoken set');
  assert.ok(blocked.verdict.violations[0]?.reason);
  const forced = assembleComponentContext(blocked.candidate);
  assert.equal(forced.ok, false);
  assert.ok(forced.errors.some(error => error.message.includes(blocked.verdict.violations[0].reason)));
  assert.equal(forced.value, undefined, 'a rejected combination has no render output');
});

test('Core component context: preview and Code exporter return the same bytes', () => {
  const rendered = assembleComponentContext(base);
  assert.equal(rendered.ok, true, JSON.stringify(rendered.errors));
  assert.deepEqual(Object.keys(rendered.value.files).sort(), ['blueprint.json', 'index.html', 'manifest.json', 'tokens.css', 'tokens.json']);
  assert.equal(rendered.value.files['index.html'], rendered.value.standalone);
  const {schema: _schema, ...replay} = JSON.parse(rendered.value.files['blueprint.json']);
  const repeated = assembleComponentContext(replay);
  assert.equal(repeated.ok, true, JSON.stringify(repeated.errors));
  assert.deepEqual(repeated.value.files, rendered.value.files);
});
