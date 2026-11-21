import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';

const entry = resolve(import.meta.dirname, '../src/edit/index.mjs');
const IMPORT = /(?:^|\n)\s*(?:import|export)\s[^'"\n]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** 편집 계층이 (추이적으로) 끌어오는 모든 소스 파일. 웹 파일과 apps/는 포함되면 안 된다. */
function closure(file, seen = new Map()) {
  if (seen.has(file)) return seen;
  const text = readFileSync(file, 'utf8'); seen.set(file, text);
  for (const m of text.matchAll(IMPORT)) {
    const spec = m[1] ?? m[2];
    if (spec.startsWith('.')) closure(resolve(dirname(file), spec), seen);
    else seen.set('external:' + spec + ' ← ' + file, '');
  }
  return seen;
}

test('portability: the edit layer and everything it imports use only relative modules (no React, Next.js, Node built-ins or packages)', () => {
  const files = closure(entry);
  const externals = [...files.keys()].filter(k => k.startsWith('external:'));
  assert.deepEqual(externals, [], 'bare or node: imports in the Core closure');
  const sources = [...files.keys()].filter(k => !k.startsWith('external:'));
  assert.ok(sources.length > 20 && sources.some(f => f.endsWith('src/edit/ops.mjs')));
  for (const f of sources) assert.ok(!/\/(workbench|combos)[^/]*\.mjs$|\/apps\//.test(f), 'web file pulled into Core: ' + f);
});

test('portability: no DOM or Node globals are touched by the edit layer sources', () => {
  for (const name of ['ops.mjs', 'fingerprint.mjs', 'contracts.mjs', 'index.mjs']) {
    const text = readFileSync(resolve(import.meta.dirname, '../src/edit', name), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(text, /\b(?:window|document|navigator|process|Buffer|globalThis\.(?:window|document))\.|\blocalStorage\b|\brequire\(|__dirname|import\.meta\.(?:dirname|url)/, name);
  }
});

test('portability: the edit layer needs only structuredClone, TextEncoder and BigInt, which every browser has', async () => {
  const {composeBlueprint} = await import('../src/catalog.mjs');
  const {setTheme, setLayoutVariant, checkSequence} = await import('../src/edit/index.mjs');
  const doc = composeBlueprint('saas-landing', undefined, undefined, {lossless: true}).blueprint;
  // 구조적 복제·TextEncoder·BigInt만 쓴다: 브라우저가 가진 기능이다.
  for (const api of ['structuredClone', 'TextEncoder', 'BigInt']) assert.equal(typeof globalThis[api], 'function', api);
  assert.ok(setTheme(doc, {theme: 'console'}).ok && setLayoutVariant(doc, {slot: 'cards', option: 'filled'}).ok);
  assert.ok(checkSequence(doc, [{op: 'setPalette', args: {palette: doc.palette}}]).ok);
});
