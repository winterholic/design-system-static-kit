import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blueprintSchema, createBlueprint, migrateBlueprint, nodeSpecs} from '../src/catalog.mjs';
import {catalogSnapshot, getComponentSpec, getSchema, validateBlueprint} from '../src/service/index.mjs';

test('the service exposes the same accepted 2.5.0 grammar as the catalog and validator', () => {
  const fields = [
    ['hero', 'ratio'], ['split', 'ratio'], ['card', 'featured'], ['quote', 'variant'],
    ['section', 'surface'], ['section', 'space'], ['media', 'bleed'],
  ];
  const schema = blueprintSchema();
  const serviceSchema = getSchema({target: 'blueprint'});
  assert.equal(serviceSchema.ok, true, JSON.stringify(serviceSchema.errors));
  const {['x-runtimeRules']: runtimeRules, ...serviceSchemaValue} = serviceSchema.value;
  assert.equal(JSON.stringify(serviceSchemaValue), JSON.stringify(schema));
  assert.ok(runtimeRules.some(x => x.startsWith('R09:')));
  assert.ok(serviceSchema.value.properties.catalogVersion.enum.includes('2.5.0'));
  assert.ok(catalogSnapshot().acceptedCatalogVersions.includes('2.5.0'));
  assert.ok(catalogSnapshot().expressionRules.some(x => x.id === 'R21'));

  for (const [type, field] of fields) {
    const spec = getComponentSpec({type});
    assert.equal(spec.ok, true, type);
    assert.ok(spec.value.fields[field], `${type}.${field} in component spec`);
    assert.equal(spec.value.fields[field]['x-since'], '2.5.0');
    assert.ok(spec.value.rules.includes('R21'), `${type} exposes its expression runtime rule`);
    assert.ok(nodeSpecs[type].fields[field]);
  }
});

test('the service validates 2.5.0, returns direct contract diagnostics, and accepts an explicit expected version', () => {
  const b = migrateBlueprint(createBlueprint('saas-landing'), '2.5.0');
  const ok = validateBlueprint(b, {catalogVersion: '2.5.0'});
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, {valid: true});
  assert.ok(Array.isArray(ok.warnings));

  const featured = structuredClone(b);
  const findGrid = n => n?.type === 'grid' ? n : n?.children?.map(findGrid).find(Boolean);
  const grid = findGrid(featured.tree);
  assert.ok(grid, 'template fixture includes a grid');
  grid.columns = 'two';
  grid.children = [
    {type: 'metric', label: 'A', value: '1'}, {type: 'metric', label: 'B', value: '2'},
    {type: 'metric', label: 'C', value: '3'}, {type: 'metric', label: 'D', value: '4'},
  ];
  const r = validateBlueprint(featured);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some(w => w.code === 'CONTRACT_V03' && w.contract === 'V03' && w.severity === 'warning'));
  const old = validateBlueprint({...featured, catalogVersion: '2.4.0'});
  assert.equal(old.ok, true);
  assert.deepEqual(old.warnings, []);
});
