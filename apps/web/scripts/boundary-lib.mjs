// Core import 경계 분석기 (03-interfaces.md 3.3절). apps/web 의 모든 소스가 Core(src/)를 루트 패키지의
// exports 진입점(`service`, `edit`, `materials`, `color-tokens`)으로만 쓰는지 판정한다. 시험(boundary.check.mjs)과 빌드 후 검사가 같이 쓴다.
//
// 판정 방식: 문자열 매칭이 아니라 TypeScript 구문 트리로 import 위치를 모으고, 지정자를 실제 파일 경로로 풀어서 위치로 판단한다.
//  - 상대 경로, tsconfig `paths` 별칭(`@/…`), 대소문자 변형, symlink, `public/` 사본은 모두 풀린 경로로 판정한다.
//  - 동적 import·require·require.resolve·import.meta.resolve·new URL(…, import.meta.url)의 인자가 문자열 리터럴이 아니면 위반이다.
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {builtinModules} from 'node:module';
import {dirname, join, relative, resolve, sep} from 'node:path';
import ts from 'typescript';

export const PKG = '@winterholic/design-system-static-kit';
// materials·color-tokens 는 읽기 전용 재료 조회 진입점이다(Materials 화면이 서버에서만 읽는다).
export const PUBLIC_ENTRIES = ['service', 'edit', 'materials', 'color-tokens'];

/** 판정에 쓰는 환경. 시험이 가상 파일을 분석할 수 있게 주입 가능하다. */
export function makeContext(web, overrides = {}) {
  const root = resolve(web, '../..');
  const tsconfig = ts.readConfigFile(join(web, 'tsconfig.json'), ts.sys.readFile).config ?? {};
  const webPkg = JSON.parse(readFileSync(join(web, 'package.json'), 'utf8'));
  const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const allowedPackages = new Set([...Object.keys(webPkg.dependencies ?? {}), ...Object.keys(webPkg.devDependencies ?? {}), ...Object.keys(rootPkg.devDependencies ?? {}), 'server-only']);
  allowedPackages.delete(PKG);
  return {
    web, root,
    paths: tsconfig.compilerOptions?.paths ?? {},
    pathsBase: tsconfig.compilerOptions?.baseUrl ? resolve(web, tsconfig.compilerOptions.baseUrl) : web,
    allowedPackages,
    // QA만 읽는 단일 근거 파일. 다른 docs/ 파일이나 저장소 외부 경로는 계속 거부한다.
    allowedExternalDataFiles: new Set([resolve(root, 'docs/evidence/diagnosis-2.4.0.json')]),
    exportsMap: rootPkg.exports ?? {},
    ...overrides,
  };
}

const lower = p => p.toLowerCase();
const inside = (p, dir) => lower(p) === lower(dir) || lower(p).startsWith(lower(dir) + sep);

/** 존재하면 symlink를 푼 실제 경로(대소문자도 파일 시스템 표기), 없으면 어휘적 경로. */
function real(p) {
  try { return realpathSync.native(p); } catch { return p; }
}

/** 지정자 하나를 판정한다. 위반이면 사유 문자열, 괜찮으면 null. */
export function judgeSpecifier(spec, fromFile, ctx) {
  const {web, root} = ctx;
  if (spec.startsWith('node:') || builtinModules.includes(spec)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(spec)) return `URL·프로토콜 지정자는 허용하지 않는다: ${spec}`;
  if (spec.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(spec)) return `절대 경로 지정자는 허용하지 않는다: ${spec}`;

  const candidates = [];
  if (spec.startsWith('.')) candidates.push(resolve(dirname(fromFile), spec));
  else {
    // tsconfig paths: 가장 긴 접두사 패턴을 먼저 본다.
    let aliased = false;
    for (const [pattern, targets] of Object.entries(ctx.paths).sort((a, b) => b[0].length - a[0].length)) {
      const star = pattern.indexOf('*');
      const [pre, post] = star < 0 ? [pattern, ''] : [pattern.slice(0, star), pattern.slice(star + 1)];
      if (star < 0 ? spec !== pattern : !(spec.startsWith(pre) && spec.endsWith(post) && spec.length >= pre.length + post.length)) continue;
      const mid = star < 0 ? '' : spec.slice(pre.length, spec.length - post.length);
      for (const t of targets) candidates.push(resolve(ctx.pathsBase, t.replace('*', mid)));
      aliased = true;
      break;
    }
    if (!aliased) {
      const parts = spec.split('/');
      const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (name === PKG) {
        const sub = './' + parts.slice(spec.startsWith('@') ? 2 : 1).join('/');
        const entry = sub === './' ? null : sub.slice(2);
        if (!entry || !PUBLIC_ENTRIES.includes(entry) || !Object.hasOwn(ctx.exportsMap, sub)) return `Core는 진입점 ${PUBLIC_ENTRIES.map(e => `${PKG}/${e}`).join(', ')}만 import할 수 있다: ${spec}`;
        return null;
      }
      return ctx.allowedPackages.has(name) ? null : `선언되지 않은 패키지: ${spec} (apps/web/package.json 에 없다)`;
    }
  }

  for (const c of candidates) {
    const forms = [c, real(c)];
    for (const p of forms) {
      if (ctx.allowedExternalDataFiles?.has(resolve(p))) continue;
      if (inside(p, join(root, 'src'))) return `Core 내부 파일을 직접 가리킨다: ${spec} → ${relative(root, p)}`;
      if (inside(p, join(web, 'public'))) return `public/ 사본을 가리킨다: ${spec}`;
      if (inside(p, join(web, '.next')) || inside(p, join(web, 'node_modules'))) return `빌드 산출물·node_modules 를 직접 가리킨다: ${spec}`;
      if (inside(p, join(root, 'node_modules'))) return `node_modules 를 경로로 직접 가리킨다: ${spec}`;
      if (!inside(p, web)) return `apps/web 밖을 가리킨다: ${spec} → ${relative(root, p)}`;
    }
  }
  return null;
}

const kindOf = file => (/\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : /\.[cm]?tsx?$/.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
const isLiteral = n => !!n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));
const isImportMetaUrl = n => !!n && ts.isPropertyAccessExpression(n) && n.name.text === 'url' && ts.isMetaProperty(n.expression) && n.expression.keywordToken === ts.SyntaxKind.ImportKeyword;

// 런타임 문자열이 Core 사본 경로를 가리키는 경우(fetch('/src/x.mjs') 등)
const RUNTIME_SRC_LITERAL = /(^|[\\/])(src|site|public\/src)[\\/][\w./-]*\.m?js\b/i;

/** @returns {string[]} 위반 목록(`file:line 사유`). 깨끗하면 빈 배열 */
export function analyzeSource(file, text, ctx, {checkRuntimeLiterals = true} = {}) {
  const out = [];
  const rel = relative(ctx.web, file);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file));
  const at = n => `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const check = (node, spec) => { const why = judgeSpecifier(spec, file, ctx); if (why) out.push(`${at(node)} ${why}`); };
  const needLiteral = (node, arg, what) => {
    if (!arg) { out.push(`${at(node)} ${what}의 인자가 없다`); return; }
    if (!isLiteral(arg)) { out.push(`${at(node)} ${what}의 인자가 문자열 리터럴이 아니다(경계를 정적으로 검사할 수 없다)`); return; }
    check(node, arg.text);
  };

  const info = ts.preProcessFile(text, true, true);
  for (const r of [...info.referencedFiles, ...info.typeReferenceDirectives]) {
    if (r.fileName.startsWith('.') || r.fileName.startsWith('/')) { const why = judgeSpecifier(r.fileName, file, ctx); if (why) out.push(`${rel}:${sf.getLineAndCharacterOfPosition(r.pos).line + 1} ${why}`); }
  }

  const skipLiteral = new Set();
  (function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) { skipLiteral.add(node.moduleSpecifier); check(node, node.moduleSpecifier.text); }
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      skipLiteral.add(node.moduleReference.expression);
      needLiteral(node, node.moduleReference.expression, 'import = require');
    } else if (ts.isImportTypeNode(node)) {
      const lit = ts.isLiteralTypeNode(node.argument) ? node.argument.literal : null;
      if (lit && isLiteral(lit)) { skipLiteral.add(lit); check(node, lit.text); } else out.push(`${at(node)} import() 타입의 인자가 문자열 리터럴이 아니다`);
    } else if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (e.kind === ts.SyntaxKind.ImportKeyword) { if (isLiteral(node.arguments[0])) skipLiteral.add(node.arguments[0]); needLiteral(node, node.arguments[0], '동적 import()'); }
      else if (ts.isIdentifier(e) && e.text === 'require') { if (isLiteral(node.arguments[0])) skipLiteral.add(node.arguments[0]); needLiteral(node, node.arguments[0], 'require()'); }
      else if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'require' && e.name.text === 'resolve') { if (isLiteral(node.arguments[0])) skipLiteral.add(node.arguments[0]); needLiteral(node, node.arguments[0], 'require.resolve()'); }
      else if (ts.isPropertyAccessExpression(e) && ts.isMetaProperty(e.expression) && e.name.text === 'resolve') { if (isLiteral(node.arguments[0])) skipLiteral.add(node.arguments[0]); needLiteral(node, node.arguments[0], 'import.meta.resolve()'); }
      else if (ts.isIdentifier(e) && e.text === 'createRequire') out.push(`${at(node)} createRequire 는 정적 검사를 우회하므로 쓰지 않는다`);
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && isImportMetaUrl(node.arguments?.[1])) {
      const a = node.arguments[0];
      if (!isLiteral(a)) out.push(`${at(node)} new URL(…, import.meta.url)의 인자가 문자열 리터럴이 아니다`);
      else { skipLiteral.add(a); const why = judgeSpecifier(a.text.startsWith('.') ? a.text : './' + a.text, file, ctx); if (why) out.push(`${at(node)} ${why}`); }
    } else if (checkRuntimeLiterals && isLiteral(node) && !skipLiteral.has(node) && RUNTIME_SRC_LITERAL.test(node.text)) {
      out.push(`${at(node)} 문자열이 Core·정적 사본 경로를 가리킨다: ${JSON.stringify(node.text.slice(0, 80))}`);
    }
    ts.forEachChild(node, visit);
  })(sf);
  return out;
}

/** CSS: @import 와 상대 경로 url() 을 같은 규칙으로 판정한다. 절대 웹 경로(/…), data:, #fragment 는 정적 파일 참조라 제외하되 /src/ 는 막는다. */
export function analyzeCss(file, text, ctx) {
  const out = [], rel = relative(ctx.web, file);
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const re = /@(?:import|use|forward)\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1|url\(\s*(['"]?)([^'")]+)\3\s*\)/g;
  for (const m of clean.matchAll(re)) {
    const spec = (m[2] ?? m[4]).trim();
    const line = clean.slice(0, m.index).split('\n').length;
    if (/^(data:|#|https?:|\/\/)/.test(spec)) continue;
    if (spec.startsWith('/')) { if (/^\/(src|site)\//i.test(spec)) out.push(`${rel}:${line} CSS가 Core 정적 사본을 가리킨다: ${spec}`); continue; }
    const why = judgeSpecifier(spec.startsWith('.') ? spec : spec.startsWith('~') ? spec.slice(1) : './' + spec, file, ctx);
    if (why) out.push(`${rel}:${line} ${why}`);
  }
  return out;
}

export const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|css|scss|sass)$/;
export const IGNORED_DIRS = new Set(['node_modules', '.next', 'public', 'test-results', 'playwright-report']);

export function analyzeFile(file, text, ctx, opts) {
  return /\.(?:css|scss|sass)$/.test(file) ? analyzeCss(file, text, ctx) : analyzeSource(file, text, ctx, opts);
}

export {existsSync};
