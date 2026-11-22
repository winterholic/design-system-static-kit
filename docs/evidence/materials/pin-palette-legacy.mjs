// 2.4.0·2.5.0 팔레트 응답과 출력을 바이트 단위로 고정한다(R1 권리 조치가 이 응답을 바꾸지 않는다는 근거).
// 사용: node docs/evidence/materials/pin-palette-legacy.mjs <baseline-commit>   (권리 조치 전 코드에서만 실행한다)
// 고정 대상: ① listCatalog({kind:'palettes'}) 전 필드 전 쪽 ② 팔레트 7개마다 하나씩 고른 표본 × 2.4.0·2.5.0 컴파일 결과(html·css·tokens·manifest)
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {palettes, createBlueprint, migrateBlueprint} from '../../../src/catalog.mjs';
import {listCatalog} from '../../../src/service/index.mjs';
import {compile} from '../../../src/compiler.mjs';
const baseline = process.argv[2];
if (!baseline) throw new Error('기준 커밋과 함께 실행한다');
const sha = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const FIELDS = ['id', 'name', 'label', 'theme', 'colors', 'brand', 'likes', 'family', 'tone', 'source'];
const rows = [];
for (let cursor; ;) {
  const r = listCatalog({kind: 'palettes', fields: FIELDS, limit: 200, ...(cursor ? {cursor} : {})});
  rows.push(...r.value.items);
  if (!(cursor = r.value.nextCursor)) break;
}
const ids = Object.keys(palettes), sample = ids.filter((_, i) => i % 7 === 0);
const compiled = {};
for (const version of ['2.4.0', '2.5.0']) {
  compiled[version] = {};
  for (const id of sample) {
    const b = migrateBlueprint(createBlueprint('saas-landing', undefined, id), version);
    try { compiled[version][id] = sha(compile(b)); } catch (e) { compiled[version][id] = 'ERR ' + String(e.message).split('\n')[0].slice(0, 80); }
  }
}
writeFileSync(new URL('pinned-palette-legacy.json', import.meta.url), JSON.stringify({baseline, catalog: {count: rows.length, sha256: sha(rows)}, sample, compiled}, null, 1) + '\n');
console.log('pinned palettes', rows.length, 'sample', sample.length);
