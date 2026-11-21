// Core import 경계 시험 (03-interfaces.md 3.3절). apps/web 은 src/ 내부를 직접 import 하지 않고
// 루트 패키지의 exports 진입점만 쓴다. 파일명이 .test.mjs 가 아니라서 루트 `node --test` 에는 걸리지 않는다.
// 실행: npm --workspace apps/web run test:boundary
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import test from 'node:test';

const web = import.meta.dirname;
const root = resolve(web, '../..');
const PKG = '@winterholic/design-system-static-kit';
const PUBLIC_ENTRIES = new Set(['service', 'edit']);
const SOURCE_DIRS = ['app', 'shell', 'lib'];

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}
const sources = SOURCE_DIRS.flatMap(d => walk(join(web, d))).filter(f => /\.(tsx?|mjs|jsx?)$/.test(f));
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(['"])([^'"]+)\1/gm;
const specifiers = file => [...readFileSync(file, 'utf8').matchAll(IMPORT)].map(m => m[2]);

test('apps/web 소스를 찾았다', () => assert.ok(sources.length >= 20, `파일 ${sources.length}개`));

test('루트 패키지는 지정한 진입점만 import 한다', () => {
  const bad = [];
  for (const f of sources) {
    const rel = relative(web, f);
    for (const s of specifiers(f)) {
      if (s !== PKG && !s.startsWith(PKG + '/')) continue;
      const entry = s.slice(PKG.length + 1);
      if (!PUBLIC_ENTRIES.has(entry)) bad.push(`${rel}: ${s}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('src/ 를 상대 경로나 패키지 내부 경로로 직접 가리키지 않는다', () => {
  const bad = [];
  for (const f of sources) {
    for (const s of specifiers(f)) {
      const rel = relative(web, f);
      if (s.startsWith('.') && resolve(join(f, '..'), s).startsWith(root + '/') && !resolve(join(f, '..'), s).startsWith(web + '/')) bad.push(`${rel}: ${s} (apps/web 밖)`);
      if (/(^|\/)src\//.test(s) && !s.startsWith('@/')) bad.push(`${rel}: ${s}`);
      if (s.includes('/node_modules/') || /^@winterholic\/design-system-static-kit\/(src|scripts)/.test(s)) bad.push(`${rel}: ${s}`);
    }
  }
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
  const bad = srcFiles.flatMap(f => specifiers(f).filter(s => /^(react|react-dom|next)(\/|$)/.test(s) || s.includes('apps/web')).map(s => `${relative(root, f)}: ${s}`));
  assert.deepEqual(bad, []);
});
