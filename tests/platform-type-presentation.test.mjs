import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleComponents, assembleDesign, getPlatformMaterial, getTypographySpecimen, listPlatformMaterials} from '../src/service/index.mjs';
import {SCENARIOS} from '../apps/web/features/platform/type-scenarios.mjs';

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

const allTypeSystems = () => listPlatformMaterials({kind: 'type-system', limit: 100}).value.items.map(item => item.id);

test('typography specimen offers the optional webfonts only for pairings that have them', () => {
  const off = getTypographySpecimen({id: 'type-system:work-insight'});
  assert.equal(off.value.webfont.available, true);
  assert.equal(off.value.webfont.active, false);
  assert.equal(off.value.webfont.css, '');
  assert.ok(!off.value.roles['heading-1'].fontFamily.includes('Pretendard'));
  const on = getTypographySpecimen({id: 'type-system:work-insight', webfonts: true});
  assert.equal(on.value.webfont.active, true);
  assert.match(on.value.webfont.css, /@font-face\{font-family:"Pretendard GOV";src:url\("\/fonts\/PretendardGOVVariable\.woff2"\)/);
  assert.ok(on.value.roles['heading-1'].fontFamily.startsWith('"Pretendard GOV"'));
  assert.deepEqual(on.value.webfont.families.map(family => family.license), ['OFL-1.1']);
  const none = getTypographySpecimen({id: 'type-system:work-console', webfonts: true});
  assert.deepEqual({available: none.value.webfont.available, active: none.value.webfont.active, css: none.value.webfont.css}, {available: false, active: false, css: ''});
  assert.equal(getTypographySpecimen({id: 'type-system:work-console', webfonts: 'yes'}).ok, false);
  assert.equal(new Set(allTypeSystems().filter(id => getTypographySpecimen({id}).value.webfont.available)).size, 12);
});

test('every type system declares tabular or proportional numerals that the specimen can apply', () => {
  const kinds = new Set(allTypeSystems().map(id => getTypographySpecimen({id}).value.numerals));
  assert.deepEqual(kinds, new Set(['tabular', 'proportional']));
});

test('every type system assembles a button and an input inside a context it declares; tables only where Core allows them', () => {
  const controls = {button: ['purpose:button.primary'], input: ['purpose:form.search', 'purpose:form.filter', 'purpose:form.input-kind'], table: ['purpose:table.business', 'purpose:table.dense']};
  const counts = {button: 0, input: 0, table: 0};
  for (const id of allTypeSystems()) {
    const contexts = getPlatformMaterial({id}).value.contexts;
    for (const [key, purposes] of Object.entries(controls)) {
      const ok = purposes.some(purpose => contexts.some(context => {
        const material = getPlatformMaterial({id: purpose}).value;
        return ['family:quiet', null].some(visual => assembleComponents({context, mode: 'light', density: 'comfortable', typeSystem: id, items: [{purpose, ...(visual ? {visual} : {}), ...material.example}]}).ok);
      }));
      if (ok) counts[key]++;
      else assert.equal(key, 'table', `${id}: ${key}는 허용 맥락(${contexts.join(',')}) 안에서 조립돼야 한다`);
    }
  }
  assert.deepEqual({button: counts.button, input: counts.input}, {button: 41, input: 41});
  assert.ok(counts.table >= 20 && counts.table < 41, `표는 dashboard·data·listing 맥락을 허용하는 시스템만 조립된다(${counts.table})`);
  // 옛 방식(세 컨트롤을 dashboard 맥락 하나로 묶기)은 대부분의 시스템을 거부했다.
  const bundle = ['purpose:button.primary', 'purpose:form.filter', 'purpose:table.business'].map(id => ({purpose: id, visual: 'family:quiet', ...getPlatformMaterial({id}).value.example}));
  const accepted = allTypeSystems().filter(id => assembleComponents({context: 'dashboard', mode: 'light', density: 'comfortable', typeSystem: id, items: bundle}).ok);
  assert.ok(accepted.length < 20, `묶음 요청은 ${accepted.length}개 시스템만 받는다`);
});

test('each of the five comparison contents is accepted by Core for at least four type systems', () => {
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    const accepted = allTypeSystems().filter(id => assembleDesign({purpose: scenario.purpose, content: scenario.content, typeSystem: id, mode: 'light', candidates: 1}).ok);
    assert.ok(accepted.length >= 4, `${key}: ${accepted.length}개 시스템만 이 콘텐츠를 받는다`);
  }
});
