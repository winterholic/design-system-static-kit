import {compile} from '../compiler.mjs';
import {resolveAll} from '../tokens.mjs';
import {diagnostic, hintFor, QUALITY_PAGE_CODES} from './errors.mjs';
import {ok, fail, guard, isPlain, jsonClone, pretty, utf8Bytes, badRequest} from './envelope.mjs';
import {annotate, readOpts} from './validate.mjs';

const INCLUDE = ['html', 'css', 'tokens', 'manifest', 'files'];
const DEFAULT_INCLUDE = ['html', 'css', 'tokens', 'manifest'];
const HTML_MODES = ['full', 'summary', 'omit'];
const OPT_KEYS = ['include', 'html', 'maxBytes', 'hash', 'catalogVersion'];
/** CLI가 쓰는 관리 파일 다섯 개의 이름과 순서. integrity는 manifest.json을 뺀 앞의 네 개에 대해 계산한다. */
const HASHED_FILES = ['index.html', 'tokens.css', 'tokens.json', 'blueprint.json'];

const countNodes = n => 1 + (Array.isArray(n?.children) ? n.children.reduce((s, c) => s + countNodes(c), 0) : 0);

/** 대비 게이트 실패를 구조화한다. 컴파일러는 메시지만 던지므로, 같은 토큰 계산을 다시 해 실패한 쌍을 찾는다. */
export function contrastDiagnostics(blueprint, resolve = resolveAll) {
  const failing = [];
  try {
    for (const [mode, r] of Object.entries(resolve(structuredClone(blueprint)))) for (const p of r.report) if (p.ratio < p.minimum) failing.push({mode, ...p});
  } catch { /* 아래의 일반 오류로 대신한다 */ }
  if (!failing.length) return [diagnostic('CONTRAST_GATE', '$.palette', '대비 게이트를 통과하지 못했습니다.')];
  return failing.slice(0, 10).map(p => diagnostic('CONTRAST_GATE', '$.palette', `${blueprint.palette} 팔레트의 ${p.mode} 모드에서 ${p.name} 대비가 ${p.ratio.toFixed(2)}:1로 기준 ${p.minimum}:1보다 낮습니다.`));
}

/** compile()이 던진 예외를 Diagnostic 목록으로 바꾼다. 검증 실패는 error.errors, 대비 게이트는 메시지, 나머지는 INTERNAL이다. */
export function compileErrors(e, blueprint, resolve) {
  if (Array.isArray(e?.errors)) return e.errors.map(x => annotate(x, blueprint));
  if (e?.message === 'Contrast gate failed') return contrastDiagnostics(blueprint, resolve);
  return [diagnostic('INTERNAL', '$', '내부 오류로 컴파일하지 못했습니다: ' + String(e?.message ?? e).split('\n')[0].slice(0, 200))];
}

function readCompileOpts(opts, blueprint) {
  const [o, bad] = readOpts(opts, OPT_KEYS, blueprint);
  if (bad) return [null, bad];
  const include = o.include === undefined ? DEFAULT_INCLUDE : o.include;
  if (!Array.isArray(include) || include.some(x => !INCLUDE.includes(x))) return [null, badRequest('$args.opts.include', 'include는 허용된 이름의 배열이어야 합니다.', `허용값: ${INCLUDE.join(', ')}`)];
  const html = o.html === undefined ? 'full' : o.html;
  if (!HTML_MODES.includes(html)) return [null, badRequest('$args.opts.html', `html 모드가 올바르지 않습니다: ${String(html)}`, `허용값: ${HTML_MODES.join(', ')}`)];
  if (o.maxBytes !== undefined && !(Number.isInteger(o.maxBytes) && o.maxBytes > 0)) return [null, badRequest('$args.opts.maxBytes', 'maxBytes는 양의 정수여야 합니다.', '본문 텍스트 하나당 허용할 UTF-8 바이트 수입니다.')];
  if (o.hash !== undefined && !(isPlain(o.hash) && typeof o.hash.algorithm === 'string' && o.hash.algorithm && typeof o.hash.digest === 'function')) {
    return [null, badRequest('$args.opts.hash', 'hash는 {algorithm: string, digest: (text) => string} 형태여야 합니다.', 'integrity는 호출자가 해시 함수를 넣을 때만 채워집니다.')];
  }
  return [{include: new Set(include), html, maxBytes: o.maxBytes, hash: o.hash}, null];
}

/**
 * Blueprint를 컴파일한다(src/compiler.mjs를 한 번 감싼다). 입력은 바뀌지 않는다.
 *
 * opts.include: 결과에 넣을 항목. 기본 html·css·tokens·manifest. 'files'는 CLI의 관리 파일 다섯 개(index.html, tokens.css, tokens.json, blueprint.json, manifest.json)를 같은 바이트로 낸다.
 * opts.html: 'full'(기본) | 'summary'(htmlSummary만) | 'omit'(html 없음). 크기가 큰 응답을 줄이는 모드다.
 * opts.maxBytes: 본문 텍스트(html·css·files 항목) 하나가 이 크기를 넘으면 싣지 않고 OUTPUT_OMITTED 경고를 남긴다. 크기는 value.sizes에 항상 있다.
 * opts.hash: {algorithm, digest(text) => string}. 있을 때만 manifest.integrity를 채운다(D6). digest는 동기 함수여야 한다.
 *
 * 컴파일이 실패하면 ok:false에 구조화된 오류만 돌려준다. 내용을 고쳐서 성공시키지 않는다.
 */
export function compileBlueprint(blueprint, opts) {
  return guard(() => {
    const [o, bad] = readCompileOpts(opts, blueprint);
    if (bad) return fail([bad]);
    let r;
    try { r = compile(blueprint); } catch (e) { return fail(compileErrors(e, blueprint)); }
    const tokensText = pretty(r.tokens), blueprintText = pretty(blueprint);
    const files = {'index.html': r.html, 'tokens.css': r.css, 'tokens.json': tokensText, 'blueprint.json': blueprintText};
    let manifest = jsonClone(r.manifest);
    if (o.hash) {
      const digests = {};
      for (const name of HASHED_FILES) {
        const d = o.hash.digest(files[name]);
        if (typeof d !== 'string' || !d) return fail([badRequest('$args.opts.hash.digest', 'digest 함수가 문자열을 돌려주지 않았습니다.', 'digest는 문자열을 동기로 돌려줘야 합니다. 비동기 해시(WebCrypto)는 value.files로 호출자가 계산하세요.')]);
        digests[name] = d;
      }
      manifest = {...manifest, integrity: {algorithm: o.hash.algorithm, files: digests}};
    }
    files['manifest.json'] = pretty(manifest);

    const warnings = (manifest.design?.page?.decisions ?? []).filter(d => QUALITY_PAGE_CODES.includes(d.code))
      .map(d => diagnostic(d.code, d.path ?? '$.tree', `${d.rule}: ${d.reason}`, hintFor(d.code), {rule: d.rule}));
    const omit = (path, bytes) => warnings.push(diagnostic('OUTPUT_OMITTED', path, `${path}가 ${bytes}바이트라서 maxBytes(${o.maxBytes})를 넘어 싣지 않았습니다.`));
    const fits = (path, text) => { const bytes = utf8Bytes(text); if (o.maxBytes === undefined || bytes <= o.maxBytes) return true; omit(path, bytes); return false; };

    const value = {sizes: {html: utf8Bytes(r.html), css: utf8Bytes(r.css)}};
    if (o.include.has('html')) {
      const asFull = o.html === 'full' && fits('$.html', r.html);
      if (asFull) value.html = r.html;
      else if (o.html !== 'omit') value.htmlSummary = {bytes: value.sizes.html, title: blueprint.name, nodeCount: countNodes(blueprint.tree)};
    }
    if (o.include.has('css') && fits('$.css', r.css)) value.css = r.css;
    if (o.include.has('tokens')) value.tokens = jsonClone(r.tokens);
    if (o.include.has('manifest')) value.manifest = manifest;
    if (o.include.has('files')) value.files = Object.fromEntries(Object.entries(files).filter(([name, text]) => fits(`$.files['${name}']`, text)));
    return ok(value, warnings);
  });
}
