import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {compileBlueprint, assembleDesign, assembleComponents} from '../src/service/index.mjs';
import {createBlueprint} from '../src/catalog.mjs';
import {resetDocument} from '../src/edit/index.mjs';

const root = resolve(import.meta.dirname, '..');
const site = join(root, 'site');

test('catalog-index.json conforms to LightCatalogIndex schema (§4)', () => {
  const indexPath = join(site, 'catalog-index.json');
  assert.ok(existsSync(indexPath), 'catalog-index.json must exist in site/');
  const data = JSON.parse(readFileSync(indexPath, 'utf8'));

  assert.equal(data.schemaVersion, 'catalog-index/1.0');
  assert.equal(data.catalogVersion, '2.6.0');
  assert.ok(Array.isArray(data.categories), 'categories must be an array');
  assert.ok(data.categories.length > 0, 'must have categories');
  assert.ok(Array.isArray(data.materials), 'materials must be an array');
  assert.ok(data.materials.length > 0, 'must have materials');

  for (const cat of data.categories) {
    assert.ok(cat.id, 'category has id');
    assert.ok(cat.label, 'category has label');
    assert.ok(typeof cat.itemCount === 'number', 'category has itemCount');
  }

  for (const mat of data.materials) {
    assert.ok(mat.id, 'material has id');
    assert.ok(mat.kind, 'material has kind');
    assert.ok(mat.category, 'material has category');
    assert.ok(mat.label, 'material has label');
    assert.ok(Array.isArray(mat.contexts), 'contexts is array');
    assert.ok(Array.isArray(mat.tags), 'tags is array');
    assert.ok(typeof mat.previewUrl === 'string' && mat.previewUrl.startsWith('/previews/'), 'previewUrl valid');
    assert.ok(typeof mat.variantsCount === 'number');
    assert.ok(typeof mat.statesCount === 'number');
    assert.ok(mat.qualityStatus === 'implemented' || mat.qualityStatus === 'verified');
    assert.ok(mat.license === 'internal' || mat.license === 'MIT');
  }
});

test('previews/previews-data.json exists and all preview files are present', () => {
  const dataPath = join(site, 'previews/previews-data.json');
  assert.ok(existsSync(dataPath), 'previews-data.json must exist');
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  assert.ok(data.items, 'items map must exist');

  for (const [key, item] of Object.entries(data.items)) {
    const svgFile = join(site, item.path.replace(/^\//, ''));
    assert.ok(existsSync(svgFile), `Preview SVG file must exist: ${item.path} (key: ${key})`);
  }
});

test('pre-generated preview HTML is byte-identical to fresh Core service output', () => {
  // 1. Explore saas-landing
  const exploreHtmlPath = join(site, 'previews/explore/saas-landing.html');
  assert.ok(existsSync(exploreHtmlPath), 'saas-landing.html must exist');
  const pregenExploreHtml = readFileSync(exploreHtmlPath, 'utf8');

  // Fresh compile of saas-landing
  const made = resetDocument(null, {template: 'saas-landing'});
  assert.ok(made.ok);
  const compiledExplore = compileBlueprint(made.doc, {include: ['html']});
  assert.ok(compiledExplore.ok);
  assert.equal(pregenExploreHtml, compiledExplore.value.html, 'Explore saas-landing pre-generated HTML must match Core output byte-for-byte');

  // 2. Platform Case saas-ocean
  const platformHtmlPath = join(site, 'previews/platform/saas-ocean.html');
  assert.ok(existsSync(platformHtmlPath), 'saas-ocean.html must exist');
  const pregenPlatformHtml = readFileSync(platformHtmlPath, 'utf8');

  const req = {
    purpose: 'saas-landing',
    palette: 'palette:ocean-cool',
    subtokenSet: 'subtoken-set:standard',
    typeSystem: 'type-system:mkt-launch',
    families: ['family:soft'],
    candidates: 1,
  };
  const assembled = assembleDesign(req, {include: ['standalone', 'html', 'css']});
  assert.ok(assembled.ok);
  assert.equal(pregenPlatformHtml, assembled.value.candidates[0].value.standalone, 'Platform case saas-ocean pre-generated HTML must match Core output byte-for-byte');
});
