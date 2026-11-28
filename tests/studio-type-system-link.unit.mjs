import test from 'node:test';
import assert from 'node:assert/strict';
import {studioForTypeSystem} from '../apps/web/features/materials/studio-link.ts';
import {readState, requestOf} from '../apps/web/features/platform/assemble-state.ts';
import {assembleDesign} from '../src/service/index.mjs';

test('a typography system link restores the selected material in the Core Blueprint and exported HTML', () => {
  const href = studioForTypeSystem('tech-erp', 'work-dashboard');
  const url = new URL(href, 'https://static-kit.local');
  const request = requestOf(readState(url.searchParams), 1);
  assert.equal(request?.typeSystem, 'type-system:tech-erp');

  const compiled = assembleDesign(request);
  assert.equal(compiled.ok, true);
  const selected = compiled.value.candidates[0].value;
  assert.equal(selected.blueprint.catalogVersion, '2.7.0');
  assert.equal(selected.blueprint.materials.typeSystem, 'type-system:tech-erp');
  assert.match(selected.css, /--kit-type-display-xl/);
  const alternate = assembleDesign({...request, typeSystem: 'type-system:work-console'});
  assert.equal(alternate.ok, true);
  assert.notEqual(selected.css, alternate.value.candidates[0].value.css);
});
