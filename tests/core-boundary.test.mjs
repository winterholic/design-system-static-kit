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
const FORBIDDEN_GLOBALS = ['document', 'window', 'localStorage', 'sessionStorage', 'location', 'history', 'navigator', 'process', 'Buffer', 'require', '__dirname', '__filename'];

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.mjs') ? [join(dir, e.name)] : []));
}
const all = walk(SRC).sort();
const core = all.filter(f => !UI.includes(relative(SRC, f)));

/**
 * 주석과 문자열·정규식 리터럴의 내용을 비운 코드만 남긴다. `${…}` 안의 식은 코드로 남긴다.
 * 생성 페이지용 브라우저 스크립트를 담은 문자열(render/index.mjs의 formRuntime)은 Core 코드가 아니므로 검사하지 않는다.
 */
export function codeOnly(text, keepStrings = false) {
  let out = '', i = 0, last = '';
  const templates = []; // 열린 `${` 깊이 스택
  const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
  const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'of', 'in', 'delete', 'void', 'throw', 'new']);
  let word = '';
  const skipString = quote => { i++; while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1; i++; };
  const skipTemplate = () => { // 현재 위치는 여는 ` 또는 닫힌 `}` 직후. 다음 ${ 또는 닫는 ` 까지 비운다.
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i] === '`') { i++; return true; }
      if (text[i] === '$' && text[i + 1] === '{') { i += 2; templates.push(0); return false; }
      i++;
    }
    return true;
  };
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2); i = i < 0 ? text.length : i + 2; continue; }
    if (c === '"' || c === "'") { const from = i; skipString(c); out += keepStrings ? text.slice(from, i) : '""'; last = '"'; word = ''; continue; }
    if (c === '`') { i++; skipTemplate(); out += '``'; last = '`'; word = ''; continue; }
    if (templates.length && c === '{') templates[templates.length - 1]++;
    if (templates.length && c === '}') {
      if (templates[templates.length - 1] === 0) { templates.pop(); i++; skipTemplate(); continue; }
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

/** 모듈 지정자를 모두 뽑는다(정적 import·export from, 부수효과 import, 동적 import(), require()). 코드 영역은 codeOnly로 확인한 원문에서 읽는다. */
function specifiers(original) {
  const re = /(?:^|[\s;}])(?:import|export)\s[^;'"`]*?\sfrom\s*['"]([^'"]+)['"]|(?:^|[\s;}])import\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...codeMask(original).matchAll(re)].map(m => m[1] ?? m[2] ?? m[3] ?? m[4]);
}

/** 주석·정규식·템플릿 본문은 비우고 따옴표 문자열은 남긴 코드. 지정자를 읽는 용도다. */
const codeMask = text => codeOnly(text, true);

function globalsUsed(code) {
  const hits = [];
  for (const name of FORBIDDEN_GLOBALS) {
    // 속성 접근(obj.history, obj?.process)과 객체 키(history: …)는 전역이 아니다.
    const re = new RegExp(`(?<![.\\w$])${name}(?![\\w$])(?!\\s*:(?!:))`, 'g');
    if (re.test(code)) hits.push(name);
  }
  if (/\bimport\.meta\b/.test(code)) hits.push('import.meta');
  return hits;
}

test('boundary scan is not vacuous: it covers the whole Core and skips exactly the UI modules', () => {
  assert.ok(core.length > 50, `Core files scanned: ${core.length}`);
  for (const f of UI) assert.ok(all.includes(resolve(SRC, f)), 'UI module list is stale: ' + f);
  for (const f of ['catalog/index.mjs', 'compiler.mjs', 'validate.mjs', 'edit/ops.mjs', 'service/index.mjs', 'workbench/axes.mjs', 'combos.mjs']) assert.ok(core.includes(resolve(SRC, f)), f + ' must be scanned');
  assert.ok(!core.some(f => UI.includes(relative(SRC, f))));
});

test('Core imports no react, next, node:* or package, only relative .mjs modules inside src that are not UI modules', () => {
  const problems = [];
  for (const file of core) {
    const original = readFileSync(file, 'utf8');
    for (const spec of specifiers(original)) {
      const where = `${relative(SRC, file)} imports ${spec}`;
      if (/^(?:react|react-dom|next)(?:\/|$)/.test(spec)) problems.push(where + ' (UI framework)');
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
    const statements = [...original.matchAll(/^(?:import|export)\b[^;]*?\sfrom\s*'([^']+)'/gm)].map(m => m[1]);
    const seen = specifiers(original).filter(s => s.startsWith('.') || /^(?:node:|react|next)/.test(s));
    for (const s of statements) assert.ok(seen.includes(s), `${relative(SRC, file)}: statement for ${s} not seen by the scanner`);
  }
});

test('the scanner catches violations and ignores strings, comments, property names and regex literals', () => {
  const bad = [
    ["import React from 'react';", 'react'], ["import {x} from 'node:fs';", 'node:fs'], ["import y from 'lodash';", 'lodash'], ["export * from 'next/server';", 'next/server'],
    ["const m = await import('node:crypto');", 'node:crypto'], ['const a = require("fs");', 'fs'], ["import './side.mjs';", './side.mjs'],
  ];
  for (const [src, spec] of bad) assert.deepEqual(specifiers(src), [spec], src);
  for (const src of ['const d = document.title;', 'window.alert(1)', 'localStorage.getItem("k")', 'const p = process.env.X;', 'Buffer.from("x")', 'const u = import.meta.url;', 'if (typeof document !== "undefined") {}', 'const l = `${location.href}`;']) {
    assert.ok(globalsUsed(codeOnly(src)).length > 0, 'should flag: ' + src);
  }
  for (const src of [
    'const s = "document.title and process.env";', "const t = 'window';", '// document.write(1)', '/* localStorage */ const x = 1;', 'const r = `<script>document.querySelector("x")</script>`;',
    'const o = {history: 1, location: 2}; o.history; o?.process; item.location;', 'const re = /document|"window"/g; const q = a / b;', 'const f = `a${x ? "y" : `process`}b`;',
  ]) assert.deepEqual(globalsUsed(codeOnly(src)), [], 'should not flag: ' + src);
  // 생성 페이지용 문자열 속의 document.*는 예외다(render/index.mjs formRuntime).
  const runtime = readFileSync(resolve(SRC, 'render/index.mjs'), 'utf8');
  assert.match(runtime, /formRuntime/); assert.match(runtime, /document\./);
  assert.deepEqual(globalsUsed(codeOnly(runtime)), []);
});
