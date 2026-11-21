// 카탈로그 2.4.0 입력의 출력을 바이트 단위로 고정한다(카탈로그 2.5.0 도입 전 코드 기준, ADR 0010).
// 사용: node docs/evidence/expression/pin-legacy.mjs <baseline-commit>   (2.5.0 변경 전 코드에서만 실행한다)
// 고정 대상: 템플릿 기본 Blueprint 85개 + 표현력 실험 사례 15개(docs/dev/expressiveness/cases/*.json, 직접 작성한 2.4.0 Blueprint).
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {templateList, createBlueprint, CATALOG_VERSION} from '../../../src/catalog.mjs';
import {compile} from '../../../src/compiler.mjs';
const baseline = process.argv[2];
if (CATALOG_VERSION !== '2.4.0' || !baseline) throw new Error('2.4.0 코드에서 기준 커밋과 함께 실행한다');
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const blueprints = {}, hashes = {}, cases = {}, caseHashes = {};
for (const t of templateList) {
  const b = createBlueprint(t.id ?? t);
  blueprints[t.id ?? t] = b;
  hashes[t.id ?? t] = sha(compile(structuredClone(b)));
}
const dir = new URL('../../dev/expressiveness/cases/', import.meta.url);
for (const f of readdirSync(dir).filter(f => /^\d\d-.*\.json$/.test(f) && !f.includes('results')).sort()) {
  const b = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  if (b.catalogVersion !== '2.4.0') throw new Error(f + ' is not 2.4.0');
  cases[f.slice(0, -5)] = b;
  caseHashes[f.slice(0, -5)] = sha(compile(structuredClone(b)));
}
const here = new URL('.', import.meta.url);
writeFileSync(new URL('legacy-2-4-blueprints.json', here), JSON.stringify({catalogVersion: '2.4.0', baseline, blueprints, cases}));
writeFileSync(new URL('legacy-2-4-hashes.json', here), JSON.stringify({catalogVersion: '2.4.0', baseline, hashes, cases: caseHashes}, null, 1));
console.log('pinned templates', Object.keys(hashes).length, 'cases', Object.keys(caseHashes).length);
