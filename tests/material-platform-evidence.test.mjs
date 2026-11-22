import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildEvidenceCases} from '../scripts/material-platform-evidence/build.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');

test('public assembly builds four product contexts with selected materials and byte-stable output', () => {
  const first = buildEvidenceCases();
  const second = buildEvidenceCases();
  assert.deepEqual(first.map(x => x.id), ['erp', 'commerce', 'saas', 'analytics']);
  assert.deepEqual(first.map(x => x.profile), ['erp', 'commerce', 'saas-landing', 'finance']);

  for (let i = 0; i < first.length; i++) {
    const row = first[i];
    assert.ok(row.blueprint.profile);
    assert.ok(row.materials.profile && row.materials.pattern && row.materials.template && row.materials.theme);
    assert.ok(row.html.startsWith('<!doctype html>'));
    assert.ok(row.css.length > 0);
    assert.equal(digest(row.html), digest(second[i].html), row.id);
    assert.equal(digest(row.css), digest(second[i].css), row.id);
    assert.equal(JSON.stringify(row.blueprint), JSON.stringify(second[i].blueprint), row.id);
  }
  assert.ok(first.find(x => x.id === 'analytics').materials.chartPresets.length > 0);
});

test('2.6.0 material layouts reserve card text, give proof headings hierarchy, and keep chart labels readable', () => {
  const rows = buildEvidenceCases();
  for (const row of rows) assert.equal(row.blueprint.catalogVersion, '2.6.0');
  const commerce = rows.find(x => x.id === 'commerce').css;
  const saas = rows.find(x => x.id === 'saas').css;
  const analytics = rows.find(x => x.id === 'analytics').css;
  assert.match(commerce, /\.kit-card\[data-product=yes\]\{overflow:visible\}/);
  assert.match(commerce, /\.kit-card\[data-product=yes\] \.kit-card-body\{flex:1 0 auto\}/);
  assert.match(saas, /\.kit-logos :is\(h2,h3,h4\)\{font-size:var\(--kit-t-body-l\);color:var\(--kit-text\)\}/);
  assert.match(analytics, /\.kit-chart :is\(\.ch-t,\.ch-v,\.ch-vh\)\{font-size:13px\}/);
});

test('legacy false-positive and miss controls are reproducible scanner inputs, with the known fixture signatures', async () => {
  const {buildLegacyControlCases} = await import('../scripts/material-platform-evidence/legacy-controls.mjs');
  const cases = buildLegacyControlCases();
  assert.deepEqual(cases.map(x => x.id), ['legacy-s21', 'legacy-s06']);
  assert.equal(cases[0].width, 320);
  assert.equal(cases[1].width, 1440);
  assert.ok(cases[0].html.includes('kit-tablist'));
  assert.ok(cases[1].html.includes('preserveAspectRatio="xMidYMid slice"'));
});
