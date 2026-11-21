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
