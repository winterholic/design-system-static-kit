// 카탈로그 2.3.0 입력의 출력을 바이트 단위로 고정한다(레이아웃 리비전 2 도입 전 코드 기준).
// 사용: node docs/evidence/layout-refine/pin-legacy.mjs <baseline-commit>   (리비전 2 적용 전 코드에서만 실행한다)
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {templateList, createBlueprint, CATALOG_VERSION} from '../../../src/catalog.mjs';
import {compile} from '../../../src/compiler.mjs';
const baseline = process.argv[2];
if (CATALOG_VERSION !== '2.3.0' || !baseline) throw new Error('2.3.0 코드에서 기준 커밋과 함께 실행한다');
const blueprints = {}, hashes = {};
for (const t of templateList) {
  const b = createBlueprint(t.id ?? t);
  blueprints[t.id ?? t] = b;
  hashes[t.id ?? t] = createHash('sha256').update(JSON.stringify(compile(structuredClone(b)))).digest('hex');
}
const here = new URL('.', import.meta.url);
writeFileSync(new URL('legacy-2-3-blueprints.json', here), JSON.stringify({catalogVersion: '2.3.0', baseline, blueprints}));
writeFileSync(new URL('legacy-2-3-hashes.json', here), JSON.stringify({catalogVersion: '2.3.0', baseline, hashes}, null, 1));
console.log('pinned', Object.keys(hashes).length);
