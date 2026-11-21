// 재료 계약(카탈로그 2.6.0 준비) 도입 전 코드에서 2.5.0 출력을 바이트 단위로 고정한다. 2.4.0은 docs/evidence/expression/legacy-2-4-*.json이 이미 고정한다.
// 사용: node docs/evidence/materials/pin-2-5.mjs <baseline-commit>   (src/materials 도입 전 코드에서만 실행한다)
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {templateList, createBlueprint, migrateBlueprint} from '../../../src/catalog.mjs';
import {compile} from '../../../src/compiler.mjs';
const baseline = process.argv[2];
if (!baseline) throw new Error('기준 커밋과 함께 실행한다');
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const blueprints = {}, hashes = {};
for (const t of templateList) {
  const id = t.id ?? t, b = migrateBlueprint(createBlueprint(id), '2.5.0');
  blueprints[id] = b;
  hashes[id] = sha(compile(structuredClone(b)));
}
const here = new URL('.', import.meta.url);
writeFileSync(new URL('pinned-2-5-blueprints.json', here), JSON.stringify({catalogVersion: '2.5.0', baseline, blueprints}));
writeFileSync(new URL('pinned-2-5-hashes.json', here), JSON.stringify({catalogVersion: '2.5.0', baseline, hashes}, null, 1));
console.log('pinned 2.5.0 templates', Object.keys(hashes).length);
