// 호환 게이트의 트리 해시 계산식(00-baseline.md 4.2절). 호환 시험과 문서 값이 이 한 곳을 쓴다.
//
//   sha256( 파일마다 `<하위 경로 기준 상대 경로>\0<파일 내용 sha256 hex>\n` 을 이어 붙인 문자열 )
//
// - 경로는 `site/` 가 아니라 해시를 내는 하위 디렉터리(예: examples) 기준이다. `examples/saas-landing/index.html` 은 `saas-landing/index.html`.
// - 순서는 디렉터리를 깊이 우선으로 내려가며 각 디렉터리의 항목을 이름의 코드 단위 순서로 정렬한 순서다.
//   전체 경로 문자열을 정렬한 순서와 다르다(`catalog/` 폴더가 `catalog.mjs` 파일보다 앞). src/·test-lab/·site 전체에서 갈린다.
// - 제외 접두사(`examples/themes/`)는 `site/` 기준 경로로 판정한다.
// 이 식으로 b303f17c1 의 00-baseline.md 4.2절 값 8개와 `site/` 전체 값이 모두 재현된다. 처음 검증에서 어긋난 것은 경로 기준과 순서를 잘못 짐작했기 때문이다.
//
// 사용: node scripts/tree-hash.mjs <site 루트> <하위 경로> [제외할 접두사]
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

const sha = buf => createHash('sha256').update(buf).digest('hex');
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const walk = (dir, rel = '') => readdirSync(dir, {withFileTypes: true}).sort(byName)
  .flatMap(e => (e.isDirectory() ? walk(join(dir, e.name), `${rel}${e.name}/`) : [`${rel}${e.name}`]));

/** @returns {{count: number, hash: string}} */
export function treeHash(siteRoot, sub, excludePrefix) {
  const root = join(resolve(siteRoot), sub);
  const prefix = sub === '.' ? '' : sub + '/';
  const files = walk(root).filter(f => !(excludePrefix && (prefix + f).startsWith(excludePrefix)));
  const h = createHash('sha256');
  for (const f of files) h.update(`${f}\0${sha(readFileSync(join(root, f)))}\n`);
  return {count: files.length, hash: h.digest('hex')};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [root, sub, exclude] = process.argv.slice(2);
  const r = treeHash(root, sub, exclude);
  console.log(`${sub}\t${r.count}\t${r.hash.slice(0, 16)}\t${r.hash}`);
}
