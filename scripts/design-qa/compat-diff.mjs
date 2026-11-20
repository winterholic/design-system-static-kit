// 과거 카탈로그 호환의 독립 확인(2026-11-21). 고정 hash 파일을 쓰지 않고, 개선 전 커밋의 코드가 낸 출력과 현재 코드의 출력을 같은 입력에서 직접 대조한다.
// 두 단계: (1) 개선 전 코드가 있는 작업 트리에서 `gen`: 입력 Blueprint 묶음을 만들고 그 코드로 컴파일한 출력의 sha256을 저장한다.
//          (2) 현재 코드가 있는 작업 트리에서 `check`: 같은 입력을 컴파일해 sha256이 같은지 본다(오류도 문자열까지 대조).
// 입력: 85개 템플릿 기본 구성(개선 전 코드 생성) + 조합 4,955개(개선 전 코드 생성, 기본 보기) + 고정 보관된 2.1.0·2.2.0·2.3.0 Blueprint.
// 개선 전 코드로 만든 2.3.0 Blueprint는 catalogVersion 라벨을 2.2.0·2.1.0으로 바꾼 것도 같은 두 코드에 넣는다(버전 분기 대조).
// 사용: node compat-diff.mjs gen --root <개선 전 작업 트리> --out <파일>
//       node compat-diff.mjs check --root <현재 작업 트리> --in <파일>
//       node compat-diff.mjs control --root <현재 작업 트리> --in <파일>   (음성 대조)
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const args = process.argv.slice(2), mode = args[0];
const opt = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
const root = resolve(opt('--root') ?? '.');
const imp = p => import(pathToFileURL(resolve(root, p)).href);
const sha = s => createHash('sha256').update(s).digest('hex');
const {compile} = await imp('src/compiler.mjs');
const {CATALOG_VERSION} = await imp('src/catalog.mjs');

/** 입력 하나를 컴파일해 출력 전체·html·css·manifest 각각의 해시, 또는 오류 문자열을 돌려준다. */
function run(blueprint) {
  try {
    const out = compile(structuredClone(blueprint));
    return {all: sha(JSON.stringify(out)), html: sha(out.html), css: sha(out.css), manifest: sha(JSON.stringify(out.manifest))};
  } catch (e) { return {error: String(e.message).slice(0, 200)}; }
}

/** 저장한 입력 하나를 시험 입력들로 펼친다. 2.3.0으로 만든 입력은 버전 라벨만 2.2.0·2.1.0으로 바꾼 것도 같이 시험한다. */
function expand(key, b) {
  const list = [[key, b]];
  if (key.startsWith('default-2.3.0/') || key.startsWith('combo-2.3.0/')) for (const v of ['2.2.0', '2.1.0']) list.push([key.replace('2.3.0', 'relabel-' + v), {...b, catalogVersion: v}]);
  return list;
}

const readJson = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

if (mode === 'gen') {
  const {templateList, createBlueprint} = await imp('src/catalog.mjs');
  const {enumerateCombos, comboBlueprint} = await imp('src/combos.mjs');
  const inputs = {};
  // 고정 보관 입력(개선 전 저장소에 있던 파일에서 읽는다. 해시 파일은 읽지 않는다).
  for (const [tag, file] of [['pinned-2.1.0', 'docs/evidence/context/legacy-blueprints.json'], ['pinned-2.2.0', 'docs/evidence/typography-refine/legacy-2-2-blueprints.json']]) {
    const j = readJson(file);
    for (const [id, b] of Object.entries(j.blueprints)) inputs[`${tag}/${id}`] = b;
  }
  for (const t of templateList) inputs[`default-2.3.0/${t.id}`] = createBlueprint(t.id);
  for (const c of enumerateCombos()) inputs[`combo-2.3.0/${c.id}`] = comboBlueprint(c);
  const result = {meta: {root, catalogVersion: CATALOG_VERSION, count: 0}, blueprints: inputs, hashes: {}};
  for (const [k, b] of Object.entries(inputs)) for (const [kk, bb] of expand(k, b)) { result.hashes[kk] = run(bb); result.meta.count++; }
  writeFileSync(opt('--out'), JSON.stringify(result));
  const errors = Object.values(result.hashes).filter(h => h.error).length;
  console.log(`gen ${CATALOG_VERSION} inputs ${result.meta.count} errors ${errors}`);
} else if (mode === 'check') {
  const saved = JSON.parse(readFileSync(opt('--in'), 'utf8'));
  const groups = {};
  let mismatch = 0;
  for (const [k0, b0] of Object.entries(saved.blueprints)) for (const [k, b] of expand(k0, b0)) {
    const g = k.split('/')[0], h = run(b), o = saved.hashes[k];
    const same = JSON.stringify(h) === JSON.stringify(o);
    (groups[g] ??= {n: 0, same: 0, errors: 0});
    groups[g].n++; if (same) groups[g].same++; else { mismatch++; if (mismatch <= 5) console.log('DIFF', k, JSON.stringify(o).slice(0, 120), JSON.stringify(h).slice(0, 120)); }
    if (o.error) groups[g].errors++;
  }
  console.log(`check against ${saved.meta.catalogVersion} (${saved.meta.root}) with ${CATALOG_VERSION} (${root})`);
  for (const [g, v] of Object.entries(groups)) console.log(g.padEnd(24), `inputs ${v.n}, byte-identical ${v.same}, both-errored ${v.errors}`);
  console.log(`TOTAL inputs ${saved.meta.count} mismatches ${mismatch}`);
  process.exitCode = mismatch ? 1 : 0;
} else if (mode === 'control') {
  // 음성 대조: 같은 85개 템플릿 입력에 라벨만 현재 버전(2.4.0)으로 바꾸면 출력이 달라져야 한다. 안 달라지면 위 check가 차이를 못 보는 도구다.
  const saved = JSON.parse(readFileSync(opt('--in'), 'utf8'));
  let n = 0, diff = 0;
  for (const [k, b] of Object.entries(saved.blueprints)) {
    if (!k.startsWith('default-2.3.0/')) continue;
    n++; if (JSON.stringify(run({...b, catalogVersion: CATALOG_VERSION})) !== JSON.stringify(saved.hashes[k])) diff++;
  }
  console.log(`control: same ${n} templates labeled ${CATALOG_VERSION} -> differ ${diff}/${n}`);
  process.exitCode = diff === n ? 0 : 1;
} else { console.error('usage: gen|check|control'); process.exit(2); }
