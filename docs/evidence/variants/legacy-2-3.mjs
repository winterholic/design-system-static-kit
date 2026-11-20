// 카탈로그 2.3.0 입력의 출력을 고정한다(카탈로그 2.4.0의 호환 창). 변경 전 코드(a0f28b279)에서 한 번 만든 파일을 시험이 대조한다.
// 사용: node docs/evidence/variants/legacy-2-3.mjs  (2.4.0 이전 코드에서만 다시 만든다. 지금 코드에서 돌리면 2.4.0 정책이 섞인 해시가 나와 호환 증거가 되지 않는다)
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {templateList, createBlueprint, CATALOG_VERSION} from '../../../src/catalog.mjs';
import {compile} from '../../../src/compiler.mjs';
if (CATALOG_VERSION !== '2.3.0') throw new Error('legacy fixture must be generated on catalog 2.3.0, got ' + CATALOG_VERSION);
const blueprints = {}, hashes = {};
for (const t of templateList) {
  const b = createBlueprint(t.id); blueprints[t.id] = b;
  hashes[t.id] = createHash('sha256').update(JSON.stringify(compile(structuredClone(b)))).digest('hex');
}
const here = new URL('./', import.meta.url).pathname;
writeFileSync(here + 'legacy-2-3-blueprints.json', JSON.stringify({catalogVersion: '2.3.0', commit: 'a0f28b279', blueprints}));
writeFileSync(here + 'legacy-2-3-hashes.json', JSON.stringify({catalogVersion: '2.3.0', commit: 'a0f28b279', hashes}, null, 1));
console.log('written', Object.keys(hashes).length);
