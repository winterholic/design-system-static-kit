// Core import 경계 시험 (03-interfaces.md 3.3절). apps/web 은 src/ 내부를 직접 import 하지 않고
// 루트 패키지의 exports 진입점만 쓴다. 파일명이 .test.mjs 가 아니라서 루트 `node --test` 에는 걸리지 않는다.
// 실행: npm --workspace apps/web run test:boundary
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, resolve} from 'node:path';
import test from 'node:test';
import {analyzeCss, analyzeFile, analyzeSource, makeContext} from './scripts/boundary-lib.mjs';

const web = import.meta.dirname;
const root = resolve(web, '../..');
const PUBLIC_ENTRIES = new Set(['service', 'edit', 'materials', 'color-tokens']);
const IGNORED_DIRS = new Set(['node_modules', '.next', 'public', 'test-results', 'playwright-report']);

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}
function appSources(dir = web) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => {
    if (e.isDirectory()) return IGNORED_DIRS.has(e.name) ? [] : appSources(join(dir, e.name));
    return /\.(?:[cm]?[jt]sx?|css|scss|sass)$/.test(e.name) ? [join(dir, e.name)] : [];
  });
}
const sources = appSources().filter(f => !['boundary.check.mjs', 'boundary-lib.mjs', 'next-env.d.ts'].includes(f.split('/').at(-1)) && !relative(web, f).startsWith('e2e/'));

test('apps/web 소스를 찾았다', () => assert.ok(sources.length >= 20, `파일 ${sources.length}개`));

test('루트 패키지는 지정한 진입점만 import 한다', () => {
  const ctx = makeContext(web);
  const bad = sources.flatMap(f => analyzeSource(f, readFileSync(f, 'utf8'), ctx)).filter(line => line.includes('Core는 진입점'));
  assert.deepEqual(bad, []);
});

test('검사 범위가 앱 전체 소스와 CSS를 포함한다', () => {
  const rels = sources.map(f => relative(web, f));
  assert.ok(rels.some(f => f.startsWith('scripts/')));
  assert.ok(rels.some(f => f.startsWith('app/')));
  assert.ok(rels.some(f => f.endsWith('.css')));
  assert.ok(!rels.some(f => f.startsWith('public/')));
});

test('상대 경로, 디렉터리 별칭, type import와 dynamic import를 같은 경계로 검사한다', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'web-boundary-'));
  try {
    const fixtureWeb = join(fixture, 'apps', 'web');
    mkdirSync(join(fixtureWeb, 'app'), {recursive: true});
    mkdirSync(join(fixture, 'src', 'service'), {recursive: true});
    const ctx = {web: fixtureWeb, root: fixture, paths: {'@core/*': ['../../src/*']}, pathsBase: fixtureWeb, allowedPackages: new Set(), exportsMap: {'./service': './src/service/index.mjs', './edit': './src/edit/index.mjs'}};
    const source = join(fixtureWeb, 'app', 'probe.ts');
    const issues = analyzeSource(source, [
      "import '../../../src/service/index.mjs';",
      "type X = import('@core/service/types').Y;",
      "void import(`../src/${name}.mjs`);",
    ].join('\n'), ctx);
    assert.equal(issues.length, 3, issues.join('\n'));
  } finally { rmSync(fixture, {recursive: true, force: true}); }
});

test('CSS의 @import와 url() 의존성을 Core 경계에 맞춰 검사한다', () => {
  const file = join(web, 'app', 'globals.css');
  const issues = analyzeCss(file, '@import "../../../src/service/index.css";\n@use "../../../src/service/mixins";\n.x { background: url("../../../src/catalog/a.svg"); }', makeContext(web));
  assert.equal(issues.length, 3, issues.join('\n'));
});

test('Next server-only 표식과 단일 읽기 전용 QA 데이터만 외부 경계 예외다', () => {
  const ctx = makeContext(web);
  const marker = join(web, 'features/explore/designs.server.ts');
  const dataReader = join(web, 'features/explore/qa/combos.server.ts');
  assert.equal(analyzeSource(marker, "import 'server-only';", ctx).length, 0);
  assert.equal(analyzeSource(dataReader, "import diagnoses from '../../../../../docs/evidence/diagnosis-2.4.0.json';", ctx).length, 0);
  assert.equal(analyzeSource(dataReader, "import privateData from '../../../../../docs/private.json';", ctx).length, 1);
  assert.equal(analyzeSource(marker, "import 'not-a-dependency';", ctx).length, 1);
});

test('src/ 를 상대 경로나 패키지 내부 경로로 직접 가리키지 않는다', () => {
  const ctx = makeContext(web);
  const bad = sources.flatMap(f => analyzeFile(f, readFileSync(f, 'utf8'), ctx));
  assert.deepEqual(bad, []);
});

test('루트 package.json exports 는 허용 진입점과 일치한다', () => {
  const {exports: ex} = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(ex).sort(), [...PUBLIC_ENTRIES].map(k => './' + k).sort());
  for (const target of Object.values(ex)) assert.match(target, /^\.\/src\/.+\.mjs$/);
});

test('Core 를 부르는 코드에 React·Next 가 새어 들어가지 않는다(패키지 쪽 import 방향)', () => {
  // 반대 방향 검사: 루트 src/ 는 apps/web 을 모르고 react/next 를 import 하지 않는다.
  const srcFiles = walk(join(root, 'src')).filter(f => f.endsWith('.mjs'));
  const bad = srcFiles.flatMap(f => analyzeSource(f, readFileSync(f, 'utf8'), {web: root, root, paths: {}, pathsBase: root, allowedPackages: new Set(), exportsMap: {}}).filter(s => /React|Next|apps\/web/.test(s)));
  assert.deepEqual(bad, []);
});
