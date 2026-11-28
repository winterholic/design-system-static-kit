// §6.2 207항목 분류표(독립·변형·복합)가 요구 목록, Manifest, 문서 표와 어긋나지 않는지 본다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPONENT_CLASSIFICATION, CLASSIFICATION_LABEL, classificationCounts} from '../src/platform/families/inventory.mjs';
import {inventoryMarkdown, renderDoc} from '../docs/platform/evidence/components/build.mjs';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json'));
const comps = manifest.requirements.filter(r => r.id.startsWith('req:comp:'));
const doc = read('docs/platform/components.md');

/** REQUEST.md §6.2의 `### X. 제목` 아래 `- 항목` 목록을 직접 읽는다(Manifest 생성기와 별개의 해석). */
function requestItems() {
  const text = read('docs/dev/catalog-platform-upgrade/REQUEST.md');
  const body = text.slice(text.indexOf('## 6.2 '), text.indexOf('## 6.3 '));
  const out = [];
  let letter = null;
  for (const line of body.split('\n')) {
    const h = /^### ([A-O])\. /.exec(line);
    if (h) { letter = h[1]; continue; }
    const b = /^- (.+?)\s*$/.exec(line);
    if (letter && b) out.push({letter, name: b[1]});
  }
  return out;
}

test('the classification table has exactly one entry per §6.2 requirement row, in the same order', () => {
  const items = requestItems();
  assert.ok(items.length > 0, 'REQUEST §6.2 has inventory rows');
  const keys = Object.keys(COMPONENT_CLASSIFICATION);
  assert.equal(keys.length, items.length);
  assert.deepEqual(keys.map(k => k[0].toUpperCase()), items.map(i => i.letter), 'letters follow the request order');
  // 항목 이름은 Manifest의 요구 행 이름(= REQUEST 그대로)과 같고, 키의 번호는 문자별 순번이다.
  assert.deepEqual(comps.map(r => r.id.slice('req:comp:'.length)), keys, 'Manifest requirement ids and the table agree');
  assert.deepEqual(comps.map(r => r.name), items.map(i => i.name));
  const perLetter = {};
  keys.forEach(k => { const l = k[0]; perLetter[l] = (perLetter[l] ?? 0) + 1; });
  keys.forEach((k, i) => assert.equal(Number(k.split('-')[1]), items.slice(0, i + 1).filter(x => x.letter === k[0].toUpperCase()).length, k));
});

test('classification values are the three the plan defines, and the counts match the table in the document', () => {
  assert.ok(Object.values(COMPONENT_CLASSIFICATION).every(v => ['independent', 'variant', 'composite'].includes(v)));
  const items = requestItems();
  const counts = classificationCounts();
  assert.equal(counts.independent + counts.variant + counts.composite, items.length);
  assert.match(doc, new RegExp(`집계: 독립 재료 ${counts.independent} · 변형 ${counts.variant} · 복합 패턴 ${counts.composite} = ${items.length}개 요구행`));
  const rows = [...doc.matchAll(/^\| `(req:comp:[^`]+)` \| (.+?) \| (독립 재료|변형|복합 패턴) \| (\S+) \| (\S+) \|/gm)];
  assert.equal(rows.length, items.length);
  for (const [, id, name, label, coverage, status] of rows) {
    const m = comps.find(r => r.id === id);
    assert.ok(m, id);
    assert.equal(label, CLASSIFICATION_LABEL[COMPONENT_CLASSIFICATION[id.slice('req:comp:'.length)]], `${id} label`);
    assert.equal(name, m.name, `${id} name`);
    assert.equal(coverage, m.coverage, `${id} coverage follows the Manifest`);
    assert.equal(status, m.status, `${id} status follows the Manifest`);
  }
  assert.equal(renderDoc(doc, manifest), doc, 'the document table is exactly what the generator writes (run docs/platform/evidence/components/build.mjs)');
});

test('the classification agrees with how the Manifest covers a row and with the layer examples of REQUEST §6.1', () => {
  // 구현 방식(Manifest)과 분류가 갈리는 행은 아래 §6.1 예시처럼 요구 문서가 구조를 밝힌 경우뿐이다.
  const SPLIT_BY_REQUEST = new Set(['m-03-bulk-action-toolbar']);
  for (const r of comps) {
    const key = r.id.slice('req:comp:'.length), cls = COMPONENT_CLASSIFICATION[key];
    if (r.coverage === 'variant' && !SPLIT_BY_REQUEST.has(key)) assert.equal(cls, 'variant', `${r.id}: covered as a value of another material`);
    if (r.coverage === 'part-of') assert.equal(cls, 'composite', `${r.id}: exists only inside another pattern`);
  }
  const text = read('docs/dev/catalog-platform-upgrade/REQUEST.md');
  assert.ok(text.includes('Card Surface → KPI Card → KPI Grid → Dashboard Summary Section') && text.includes('Button → Icon Button → Button Group → Bulk Action Toolbar'), 'the layer examples this test relies on are in REQUEST §6.1');
  assert.equal(COMPONENT_CLASSIFICATION['f-03-kpi-card'], 'independent');
  assert.equal(COMPONENT_CLASSIFICATION['m-05-dashboard-kpi-grid'], 'composite');
  assert.equal(COMPONENT_CLASSIFICATION['a-08-button-group'], 'composite');
  assert.equal(COMPONENT_CLASSIFICATION['m-03-bulk-action-toolbar'], 'composite');
  // 같은 입력 kind 값인 Email·Password·Number·Phone·URL은 같은 분류다.
  const kinds = ['b-04-password-input', 'b-05-number-input', 'b-07-email-input', 'b-08-phone-input', 'b-09-url-input'];
  assert.equal(new Set(kinds.map(k => COMPONENT_CLASSIFICATION[k])).size, 1, 'input kinds are variants of one input');
});

test('§6.2 A is fulfilled 12 of 12 in the Manifest, and every A row names a material that can be queried', () => {
  const a = comps.filter(r => r.id.startsWith('req:comp:a-'));
  assert.equal(a.length, 12);
  assert.deepEqual(a.filter(r => r.coverage === 'missing' || r.status === 'missing').map(r => r.id), [], 'no A row is missing');
  for (const r of a) assert.ok(r.materialIds.length >= 1, `${r.id} has a material`);
  assert.equal(inventoryMarkdown(manifest).split('\n').filter(l => l.startsWith('| `req:comp:a-')).length, 12);
});
