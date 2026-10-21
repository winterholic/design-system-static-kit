import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {enumerateCombos} from '../src/combos.mjs';
import {EXPERIMENTAL, GRADES_META} from '../src/combo-grades.mjs';
import {SEVERE, grade} from '../scripts/design-qa/diagnose-meta.mjs';

// 등급 파일은 전수 진단(scripts/design-qa/diagnose.mjs → grades.mjs)이 만든 증거다. 카탈로그를 바꾸고 다시 재지 않으면 이 시험이 실패해 낡은 등급이 남지 않게 한다.
const evidence = JSON.parse(await readFile(new URL('../docs/evidence/diagnosis-round6.json', import.meta.url), 'utf8'));

test('grade rule: A is clean, B has only minor findings, C has any severe finding', () => {
  assert.equal(grade({}), 'A');
  assert.equal(grade({MEASURE: 3, BAND_ASYM: 1}), 'B');
  assert.equal(grade({MEASURE: 3, EMPTY_CELL: 1}), 'C');
  for (const code of ['EMPTY_CELL', 'BIG_NARROW', 'HIER_INVERT', 'TIGHT_ROW', 'GRID_ORPHAN']) assert.ok(SEVERE.has(code), code);
  assert.ok(!SEVERE.has('MEASURE') && !SEVERE.has('BAND_ASYM'));
});

test('the committed diagnosis covers exactly the current catalog and the experimental list is its C grades', () => {
  const current = enumerateCombos().filter(c => !c.sameAs).map(c => c.id).sort(), graded = Object.keys(evidence.combos).sort();
  assert.deepEqual(graded, current, 'catalog and diagnosis differ: run node scripts/design-qa/diagnose.mjs and grades.mjs');
  const c = Object.entries(evidence.combos).filter(([, v]) => v !== 'A' && v.g === 'C').map(([id]) => id).sort();
  assert.deepEqual(Object.keys(EXPERIMENTAL).sort(), c);
  const summary = {A: 0, B: 0, C: 0}; for (const v of Object.values(evidence.combos)) summary[v === 'A' ? 'A' : v.g]++;
  assert.deepEqual(GRADES_META.summary, summary);
  assert.equal(GRADES_META.combos, current.length);
  for (const [id, v] of Object.entries(evidence.combos)) if (v !== 'A') assert.equal(grade(v.c), v.g, id);
});

test('quality floor: no severe finding survives in most of the catalog, and every experimental combo names why', () => {
  const total = Object.keys(evidence.combos).length, c = Object.keys(EXPERIMENTAL).length;
  assert.ok(c / total < 0.05, `${c}/${total} experimental: fix the cause instead of hiding combinations`);
  for (const reason of Object.values(EXPERIMENTAL)) assert.match(reason, /^C [A-Z_+]+$/);
  // 모든 템플릿의 기본 구성은 실험이 아니어야 한다: 기본 구성이 못생기면 숨길 것이 아니라 고쳐야 한다.
  const defaults = enumerateCombos().filter(c => !c.changed && c.experimental);
  assert.deepEqual(defaults.map(c => c.id), [], 'a template default is experimental');
});
