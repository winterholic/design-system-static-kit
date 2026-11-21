import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {catalogRegistry, CATEGORIES} from '../src/materials/index.mjs';

const run = () => execFileSync(process.execPath, ['scripts/materials/coverage.mjs'], {encoding: 'utf8'});

test('materials coverage output is byte deterministic and matches the checked-in machine report', () => {
  const first = run();
  const second = run();
  assert.equal(first, second);
  assert.equal(readFileSync('docs/evidence/materials/coverage.json', 'utf8'), first);
});

test('materials, attribute combinations, and complete presets remain separate registry counts', () => {
  const report = JSON.parse(run());
  const registry = catalogRegistry();
  const totals = report.totals;
  const registryCounts = registry.counts();
  assert.deepEqual(
    [totals.materials, totals.attributeCombinations, totals.completePresets],
    [registryCounts.materials, registryCounts.attributeCombinations, registryCounts.completePresets],
  );
  assert.ok(totals.materials !== totals.attributeCombinations);
  assert.ok(totals.materials !== totals.completePresets);
  assert.ok(totals.attributeCombinations !== totals.completePresets);
  assert.ok(totals.completePresets <= totals.materials);
});

test('every registry category appears once and category totals equal registry totals', () => {
  const report = JSON.parse(run());
  const registry = catalogRegistry();
  assert.deepEqual(report.categories.map(({id}) => id), [...CATEGORIES]);
  for (const key of ['materials', 'attributeCombinations', 'completePresets']) {
    assert.equal(report.categories.reduce((sum, category) => sum + category[key], 0), report.totals[key], key);
  }
  for (const status of ['missing', 'enum-only', 'implemented', 'verified']) {
    assert.equal(report.categories.reduce((sum, category) => sum + category.qualityCounts[status], 0), registry.counts().byQuality[status] ?? 0, status);
  }
  for (const category of report.categories) {
    assert.equal(Object.values(category.qualityCounts).reduce((sum, count) => sum + count, 0), category.materials, category.id);
  }
});

test('state and variant coverage is counted from declarations, while unsupported pass rates stay unconfirmed', () => {
  const report = JSON.parse(run());
  assert.ok(report.categories.some(category => category.verifiedCombinationCoverage.allowedCombinations > 0));
  assert.ok(report.categories.filter(category => category.verifiedCombinationCoverage.testedContracts > 0)
    .every(category => category.verifiedCombinationCoverage.evidence.length > 0));
  for (const category of report.categories) {
    assert.ok(category.variantCoverage.materialsWithVariants <= category.materials);
    assert.ok(category.stateCoverage.materialsWithStates <= category.materials);
    assert.equal(category.qualityInspection.passRate, null);
    assert.equal(category.qualityInspection.status, 'unconfirmed');
  }
});
