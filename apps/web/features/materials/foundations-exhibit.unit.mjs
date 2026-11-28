import test from 'node:test';
import assert from 'node:assert/strict';
import {FOUNDATION_CATEGORIES, backgroundDecoration, borderDeclaration, categoryDefinitionCount, categoryRows, layoutPreviewGrid} from './foundations-exhibit.mjs';
import {SPACING_MATERIALS, SPACING_ROLES} from '../../../../src/platform/data/spacing.mjs';
import {SURFACE_FACETS, SURFACES} from '../../../../src/platform/data/surfaces.mjs';
import {BACKGROUNDS} from '../../../../src/platform/data/backgrounds.mjs';
import {MOTION_PATTERNS, MOTIONS} from '../../../../src/platform/data/motion.mjs';
import {ICON_MATERIALS} from '../../../../src/platform/data/icons.mjs';
import {LAYOUTS} from '../../../../src/platform/data/layouts.mjs';
import {chartPresetMaterials} from '../../../../src/materials/chart-presets.mjs';

test('Foundations exhibits all eleven §9.8 categories in the requested order', () => {
  assert.deepEqual(FOUNDATION_CATEGORIES.map(({id}) => id), [
    'spacing', 'density', 'radius', 'border', 'elevation', 'surface', 'background', 'motion', 'icon', 'layout', 'chart',
  ]);
});

test('each category exposes its full supplied definitions and rejects unknown categories', () => {
  const data = Object.fromEntries(FOUNDATION_CATEGORIES.map(({id}) => [id, [{id: `${id}:one`}, {id: `${id}:two`}]]));
  for (const {id} of FOUNDATION_CATEGORIES) assert.equal(categoryRows(id, data).length, 2, id);
  assert.deepEqual(categoryRows('not-a-category', data), []);
});

test('Core source inventories cover every Foundations exhibit definition', () => {
  assert.equal(SPACING_ROLES.length, 9);
  assert.equal(SPACING_MATERIALS.length, 3);
  assert.equal(new Set(SURFACE_FACETS.map(item => item.border)).size, 5);
  assert.equal(new Set(SURFACE_FACETS.map(item => item.elevation)).size, 8);
  assert.equal(SURFACE_FACETS.length, 17);
  assert.equal(SURFACES.length, 5);
  assert.equal(BACKGROUNDS.length, 13);
  assert.equal(MOTIONS.length, 4);
  assert.equal(MOTION_PATTERNS.length, 15);
  assert.equal(ICON_MATERIALS.length, 16);
  assert.equal(LAYOUTS.length, 24);
  assert.equal(new Set(chartPresetMaterials.map(item => item.ext.chartKind)).size, 29);
});

test('border samples use valid Core values and Background retains image, mask and opacity declarations', () => {
  assert.equal(borderDeclaration('hairline'), '1px solid var(--color-line)');
  assert.equal(borderDeclaration('strong'), '2px solid var(--color-fg)');
  assert.equal(borderDeclaration('double'), '3px double var(--color-line)');
  const decoration = backgroundDecoration('background-image:radial-gradient(red,transparent);background-size:4px 4px;mask-image:linear-gradient(black,transparent);-webkit-mask-image:linear-gradient(black,transparent);opacity:.28', 12);
  assert.equal(decoration['--deco-background'], 'radial-gradient(red,transparent)');
  assert.equal(decoration['--deco-size'], '4px 4px');
  assert.equal(decoration['--deco-mask'], 'linear-gradient(black,transparent)');
  assert.equal(decoration['--deco-opacity'], '.28');
  assert.equal(decoration['--deco-blur'], 'blur(12px)');
  assert.equal(backgroundDecoration('background:radial-gradient(red,transparent)')['--deco-background'], 'radial-gradient(red,transparent)');
});

test('layout samples preserve Core area matrices and radius count includes facets', () => {
  const [single, three] = LAYOUTS.filter(item => ['layout:single-column', 'layout:three-column'].includes(item.id));
  assert.equal(layoutPreviewGrid(single, single.bands[0]).template, '"lead" "content" "aside"');
  assert.equal(layoutPreviewGrid(single).template, '". lead ." ". content aside"');
  assert.match(layoutPreviewGrid(single).columns, /minmax\(0, min\(44rem, 100%\)\)/);
  assert.match(layoutPreviewGrid(three).columns, /1fr 3fr 1fr/);
  assert.equal(layoutPreviewGrid(three).template, '"left center right"');
  assert.equal(categoryDefinitionCount('radius', {rows: Array(5), facets: Array(17)}), 22);
});
