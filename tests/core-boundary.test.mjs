import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve, relative, dirname, join} from 'node:path';

/**
 * Core 경계(docs/dev/platform/03-interfaces.md 3.3절). Core는 src/에서 UI 모듈을 뺀 부분이고,
 * 브라우저와 Node 양쪽에서 같게 동작해야 한다. 그래서 react·next·node:*·패키지 import와 DOM·Node 전역을 쓰지 않는다.
 */
const SRC = resolve(import.meta.dirname, '../src');
const UI = ['workbench.mjs', 'workbench/catalog-view.mjs', 'workbench/viewport.mjs', 'combos/app.mjs', 'combos/render.mjs'];
// DOM·Node에만 있는 전역, 전역 객체 자체, 동적 코드 실행, 네트워크. 이 목록의 이름은 속성 접근(obj.name)이나 객체 키(name: …)가 아닌 식별자로 쓰면 위반이다.
const FORBIDDEN_GLOBALS = ['document', 'window', 'localStorage', 'sessionStorage', 'location', 'history', 'navigator', 'process', 'Buffer', 'require', '__dirname', '__filename',
  'globalThis', 'self', 'eval', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'indexedDB', 'crypto', 'performance'];
// Core는 같은 입력이면 같은 출력이어야 한다(시간·난수 금지)와 문자열을 코드로 바꾸지 않는다. 식별자 이름만으로는 잡히지 않는 형태.
const FORBIDDEN_PATTERNS = [
  [/(?<![.\w$])Date\s*\.\s*now\b/, 'Date.now'], [/(?<![.\w$])Math\s*\.\s*random\b/, 'Math.random'], [/new\s+Date\s*\(\s*\)/, 'new Date()'],
  [/(?<![.\w$])(?:new\s+)?Function\s*\(/, 'Function()'], [/\bimport\.meta\b/, 'import.meta'],
];
// src에는 .mjs(Core·UI 모듈)와 두 앱의 .css만 둔다. 다른 확장자의 소스는 아래 검사가 읽지 못하므로 들어오면 안 된다.
const ALLOWED_EXT = ['.mjs', '.css'];

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}
const files = walk(SRC).sort();
const all = files.filter(f => f.endsWith('.mjs'));
const core = all.filter(f => !UI.includes(relative(SRC, f)));

/**
 * 주석과 문자열·정규식 리터럴의 내용을 비운 코드만 남긴다. `${…}` 안의 식은 코드로 남긴다.
 * 생성 페이지용 브라우저 스크립트를 담은 문자열(render/index.mjs의 formRuntime)은 Core 코드가 아니므로 검사하지 않는다.
 */
export function codeOnly(text, keepStrings = false) {
  let out = '', i = 0, last = '';
  const templates = []; // 열린 `${` 깊이 스택
  let specTemplate = false; // 지금 읽는 템플릿이 import(`…`)·require(`…`)의 인자인가
  const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
  const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'of', 'in', 'delete', 'void', 'throw', 'new']);
  let word = '';
  const atSpecifier = (dynamicOnly = false) => (dynamicOnly ? /\b(?:import|require)\s*\(\s*$/ : /(?:\bfrom|\bimport|\b(?:import|require)\s*\()\s*$/).test(out);
  const skipString = quote => { i++; while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1; i++; };
  const skipTemplate = () => { // 현재 위치는 여는 ` 또는 닫힌 `}` 직후. 다음 ${ 또는 닫는 ` 까지 읽고 그 본문을 돌려준다.
    const from = i;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i] === '`') { const raw = text.slice(from, i); i++; return {done: true, raw}; }
      if (text[i] === '$' && text[i + 1] === '{') { const raw = text.slice(from, i); i += 2; templates.push(0); return {done: false, raw}; }
      i++;
    }
    return {done: true, raw: text.slice(from)};
  };
  // keepStrings에서는 모듈 지정자 자리의 문자열만 내용을 남긴다: from '…', import '…', import('…'), require('…'). 다른 문자열은 예제 코드일 수 있어 비운다.
  // 템플릿 리터럴은 import(`…`)·require(`…`) 인자일 때만 남긴다(보간이 있으면 정적으로 알 수 없는 import로 잡힌다).
  const emitTemplate = (open, t) => (keepStrings && (open === '' ? specTemplate : (specTemplate = atSpecifier(true))) ? open + t.raw + (t.done ? '`' : '${') : open === '`' ? '``' : '');
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2); i = i < 0 ? text.length : i + 2; continue; }
    if (c === '"' || c === "'") { const from = i; skipString(c); out += keepStrings && atSpecifier() ? text.slice(from, i) : '""'; last = '"'; word = ''; continue; }
    if (c === '`') { i++; out += emitTemplate('`', skipTemplate()); last = '`'; word = ''; continue; }
    if (templates.length && c === '{') templates[templates.length - 1]++;
    if (templates.length && c === '}') {
      if (templates[templates.length - 1] === 0) { templates.pop(); i++; out += keepStrings ? '}' + emitTemplate('', skipTemplate()) : (skipTemplate(), ''); last = '`'; word = ''; continue; }
      templates[templates.length - 1]--;
    }
    if (c === '/' && (REGEX_AFTER.has(last) || REGEX_WORDS.has(word))) {
      i++; let cls = false;
      while (i < text.length && (cls || text[i] !== '/')) { if (text[i] === '\\') i++; else if (text[i] === '[') cls = true; else if (text[i] === ']') cls = false; i++; }
      i++; while (/[a-z]/.test(text[i] ?? '')) i++;
      out += '/r/'; last = 'r'; word = ''; continue;
    }
    out += c;
    if (/[A-Za-z0-9_$]/.test(c)) { word += c; last = c; } else if (!/\s/.test(c)) { word = ''; last = c; } else if (word) { last = word.at(-1); }
    i++;
  }
  return out;
}

/** 주석·정규식은 비우고 따옴표 문자열과 템플릿 리터럴의 고정 부분은 남긴 코드. 모듈 지정자를 읽는 용도다. */
const codeMask = text => codeOnly(text, true);

/**
 * 모듈 지정자를 모두 뽑는다. 정적 import·export … from(공백·줄바꿈·따옴표 종류 무관), 부수효과 import, 동적 import(), require().
 * 동적 import()의 인자가 문자열·보간 없는 템플릿이 아니면 읽을 수 없으므로 `<non-literal dynamic import: …>` 표시를 돌려준다(위반으로 본다).
 */
export function specifiers(original) {
  const code = codeMask(original), found = [];
  for (const m of code.matchAll(/(?<![.\w$])(?:import|export)\b[^;'"`]*?\bfrom\s*(['"])([^'"]+)\1/g)) found.push(m[2]);
  for (const m of code.matchAll(/(?<![.\w$])import\s*(['"])([^'"]+)\1/g)) found.push(m[2]);
  for (const m of code.matchAll(/(?<![.\w$])import\s*\(\s*([^)]*)\)/g)) {
    const literal = /^(['"`])([^'"`$\\]*)\1$/.exec(m[1].trim());
    found.push(literal ? literal[2] : `<non-literal dynamic import: ${m[1].trim() || '(empty)'}>`);
  }
  for (const m of code.matchAll(/(?<![.\w$])require\s*\(\s*(['"`])([^'"`$]+)\1\s*\)/g)) found.push(m[2]);
  return found;
}

/** 금지 전역·패턴을 쓴 이름 목록. 속성 접근(obj.history, obj?.process)과 객체 키({history: 1})는 전역이 아니다. */
export function globalsUsed(code) {
  const hits = [];
  for (const name of FORBIDDEN_GLOBALS) {
    for (const m of code.matchAll(new RegExp(`(?<![.\\w$])${name.replace('$', '\\$')}(?![\\w$])`, 'g'))) {
      const before = code.slice(0, m.index).trimEnd().at(-1), after = code.slice(m.index + name.length).trimStart();
      if ((before === '{' || before === ',') && after[0] === ':' && after[1] !== ':') continue; // 객체 리터럴의 키
      hits.push(name); break;
    }
  }
  for (const [re, label] of FORBIDDEN_PATTERNS) if (re.test(code)) hits.push(label);
  return hits;
}

test('boundary scan is not vacuous: it covers the whole Core and skips exactly the UI modules', () => {
  assert.ok(core.length > 50, `Core files scanned: ${core.length}`);
  for (const f of UI) assert.ok(all.includes(resolve(SRC, f)), 'UI module list is stale: ' + f);
  for (const f of ['catalog/index.mjs', 'compiler.mjs', 'validate.mjs', 'edit/ops.mjs', 'service/index.mjs', 'workbench/axes.mjs', 'combos.mjs']) assert.ok(core.includes(resolve(SRC, f)), f + ' must be scanned');
  assert.ok(!core.some(f => UI.includes(relative(SRC, f))));
});

test('src holds only .mjs modules and the two apps\' .css files: no .js, .cjs, .ts or other source the scanner cannot read', () => {
  const stray = files.filter(f => !ALLOWED_EXT.some(ext => f.endsWith(ext))).map(f => relative(SRC, f));
  assert.deepEqual(stray, []);
});

test('Core imports no react, next, node:* or package, only relative .mjs modules inside src that are not UI modules', () => {
  const problems = [];
  for (const file of core) {
    const original = readFileSync(file, 'utf8');
    for (const spec of specifiers(original)) {
      const where = `${relative(SRC, file)} imports ${spec}`;
      if (spec.startsWith('<non-literal')) problems.push(where + ' (the module cannot be known statically)');
      else if (/^(?:react|react-dom|next)(?:\/|$)/.test(spec)) problems.push(where + ' (UI framework)');
      else if (spec.startsWith('node:')) problems.push(where + ' (Node built-in)');
      else if (!spec.startsWith('./') && !spec.startsWith('../')) problems.push(where + ' (package)');
      else {
        const target = resolve(dirname(file), spec), rel = relative(SRC, target);
        if (rel.startsWith('..')) problems.push(where + ' (outside src)');
        else if (!target.endsWith('.mjs')) problems.push(where + ' (not an .mjs module)');
        else if (UI.includes(rel)) problems.push(where + ' (UI module)');
        else if (!all.includes(target)) problems.push(where + ' (missing module)');
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('Core touches no DOM or Node global (document, window, localStorage, process, Buffer, import.meta ...)', () => {
  const problems = [];
  for (const file of core) {
    const code = codeOnly(readFileSync(file, 'utf8'));
    for (const g of globalsUsed(code)) problems.push(`${relative(SRC, file)} uses ${g}`);
  }
  assert.deepEqual(problems, []);
});

test('Core service layer reaches only the public Core: its transitive imports never include a UI module', () => {
  const seen = new Set();
  const visit = file => {
    if (seen.has(file)) return; seen.add(file);
    const original = readFileSync(file, 'utf8');
    for (const spec of specifiers(original)) if (spec.startsWith('.')) visit(resolve(dirname(file), spec));
  };
  visit(resolve(SRC, 'service/index.mjs')); visit(resolve(SRC, 'edit/index.mjs'));
  assert.ok(seen.size > 30);
  assert.deepEqual([...seen].filter(f => UI.includes(relative(SRC, f))), []);
});

// ---- 검사기 자체의 시험: 위반을 정말로 잡고, 정당한 코드는 잡지 않는다.
test('the scanner reads every import and export statement of every Core file (no statement hidden by a tokenizer slip)', () => {
  for (const file of core) {
    const original = readFileSync(file, 'utf8');
    const statements = [...original.matchAll(/^(?:import|export)\b[^;'"`]*\bfrom\s*['"]([^'"]+)['"]/gm)].map(m => m[1]);
    const seen = specifiers(original);
    for (const s of statements) assert.ok(seen.includes(s), `${relative(SRC, file)}: statement for ${s} not seen by the scanner`);
  }
});

test('the scanner catches violations and ignores strings, comments, property names and regex literals', () => {
  const bad = [
    ["import React from 'react';", 'react'], ["import {x} from 'node:fs';", 'node:fs'], ["import y from 'lodash';", 'lodash'], ["export * from 'next/server';", 'next/server'],
    ["const m = await import('node:crypto');", 'node:crypto'], ['const a = require("fs");', 'fs'], ["import './side.mjs';", './side.mjs'],
    // 공백 없는 형태, export-from, 템플릿 리터럴, 큰따옴표, 여러 줄
    ["import{a}from'node:fs';", 'node:fs'], ["export{a}from'react';", 'react'], ["export*from'next';", 'next'], ["import*as ns from'lodash';", 'lodash'], ['import x from"node:path";', 'node:path'],
    ['const m = await import(`node:fs`);', 'node:fs'], ['const m = import( "node:fs" );', 'node:fs'], ["import {\n  a,\n  b,\n} from\n  'react-dom';", 'react-dom'],
    ["import defaultThing, {a as b} from 'pkg/sub';", 'pkg/sub'], ["export {default} from 'react';", 'react'], ["export {default as X} from\n'react';", 'react'],
    ['const lazy = () => import(`node:${name}`);', '<non-literal dynamic import: `node:${name}`>'], ['const m = import(variable);', '<non-literal dynamic import: variable>'],
    ["const m = import('a' + b);", "<non-literal dynamic import: 'a' + b>"], ['import();', '<non-literal dynamic import: (empty)>'], ['const r = require(`fs`);', 'fs'],
  ];
  for (const [src, spec] of bad) assert.deepEqual(specifiers(src), [spec], src);
  for (const src of ['const d = document.title;', 'window.alert(1)', 'localStorage.getItem("k")', 'const p = process.env.X;', 'Buffer.from("x")', 'const u = import.meta.url;', 'if (typeof document !== "undefined") {}', 'const l = `${location.href}`;',
    // 전역 객체를 통한 접근, 삼항·case 안의 식별자(객체 키로 오인하지 않는다), 동적 코드, 시간·난수·네트워크
    'globalThis.process.env', 'const g = globalThis;', 'self.window', 'cond ? window : null', 'const v = cond ? process : null;', 'switch (x) { case process: break; }', 'label: { const w = x ? document : y; }',
    'eval("1")', 'const f = new Function("return 1");', 'Function("a", "return a")', 'const t = Date.now();', 'const t = Date . now();', 'const r = Math.random();', 'const d = new Date();', 'const n = performance.now();',
    'fetch("/x")', 'new XMLHttpRequest()', 'new WebSocket("wss://x")', 'crypto.getRandomValues(a)', 'indexedDB.open("x")', 'const a = {x: 1}; const b = cond ? {y: 1} : window;',
  ]) {
    assert.ok(globalsUsed(codeOnly(src)).length > 0, 'should flag: ' + src);
  }
  for (const src of [
    'const s = "document.title and process.env";', "const t = 'window';", '// document.write(1)', '/* localStorage */ const x = 1;', 'const r = `<script>document.querySelector("x")</script>`;',
    'const o = {history: 1, location: 2}; o.history; o?.process; item.location;', 'const re = /document|"window"/g; const q = a / b;', 'const f = `a${x ? "y" : `process`}b`;',
    'const d = new Date(2024, 0, 1); const u = Date.UTC(2024, 0, 1);', 'const o = {fetch: 1, eval: 2, self: 3, crypto: 4}; o.fetch(); x?.performance;', 'const s = "Date.now() Math.random() eval(x)";',
    'const o = {a: 1,\n  window: 2,\n  process: 3};', 'import x from "./y.mjs"; export {x} from "../z.mjs"; const m = import("./lazy.mjs");',
    // 예제 코드를 담은 문자열·템플릿 안의 import 문은 모듈 지정자가 아니다(src/catalog/templates.mjs)
    'const sample = "import x from \'@scope/pkg\'";', 'const sample = `import x from \'@scope/pkg\';\nconst y = require("fs");`;', 'const s = "import(\'node:fs\')";',
  ]) {
    assert.deepEqual(globalsUsed(codeOnly(src)), [], 'should not flag: ' + src);
    for (const spec of specifiers(src)) assert.match(spec, /^\./, 'should not flag an import in: ' + src);
  }
  // 생성 페이지용 문자열 속의 document.*는 예외다(render/index.mjs formRuntime).
  const runtime = readFileSync(resolve(SRC, 'render/index.mjs'), 'utf8');
  assert.match(runtime, /formRuntime/); assert.match(runtime, /document\./);
  assert.deepEqual(globalsUsed(codeOnly(runtime)), []);
});
