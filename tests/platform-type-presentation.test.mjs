import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents, getPlatformMaterial, getTypographySpecimen, listPlatformMaterials} from '../src/service/index.mjs';

test('typography specimen data comes from the selected Core type system and exposes its 27 computed roles', () => {
  const catalog = listPlatformMaterials({kind: 'type-system', limit: 100});
  assert.equal(catalog.value.items.length, 41);
  const specimen = getTypographySpecimen({id: 'type-system:doc-essay'});
  assert.equal(specimen.ok, true);
  assert.equal(specimen.value.id, 'type-system:doc-essay');
  assert.equal(specimen.value.facePairing.label, '세리프 제목 + 세리프 본문');
  assert.equal(specimen.value.density, 'spacious');
  assert.equal(Object.keys(specimen.value.roles).length, 27);
  assert.ok(specimen.value.roles['display-xl'].fontFamily);
  assert.ok(specimen.value.roles['caption'].size);
  const all = catalog.value.items.map(item => getTypographySpecimen({id: item.id}));
  assert.ok(all.every(result => result.ok && Object.keys(result.value.roles).length === 27));
  assert.equal(new Set(all.map(result => result.value.family)).size, 10);
  assert.deepEqual(new Set(all.map(result => result.value.density)), new Set(['compact', 'comfortable', 'spacious']));
});

test('typography specimen lookup rejects IDs outside the type-system registry', () => {
  const result = getTypographySpecimen({id: 'palette:static-kit'});
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'TYPE_SPECIMEN_KIND');
  assert.equal(getTypographySpecimen({id: 'type-system:doc-essay', compile: true}).errors[0].code, 'BAD_REQUEST');
});

test('type system button, filter input, and table specimen are the Core standalone export', () => {
  const items = ['purpose:button.primary', 'purpose:form.filter', 'purpose:table.business'].map(id => {
    const material = getPlatformMaterial({id}).value;
    return {purpose: id, visual: 'family:quiet', ...material.example};
  });
  const result = assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', typeSystem: 'type-system:tech-erp', items});
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.value.manifest.selection.typeSystem, 'type-system:tech-erp');
  assert.match(result.value.html, /data-purpose="button\.primary"/);
  assert.match(result.value.html, /data-purpose="form\.filter"/);
  assert.match(result.value.html, /data-purpose="table\.business"/);
  assert.match(result.value.css, /--kit-type-table-cell-font/);
  assert.ok(result.value.standalone.includes(result.value.html));
});
