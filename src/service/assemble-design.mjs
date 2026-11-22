/**
 * assembleDesign(request, opts): 플랫폼 페이지 조립을 서비스 함수 하나로 공개한다(ADR 0012 §7.3, §9.6). REST(POST /api/v1/assemble), MCP(assemble_design), Studio가 이 함수를 부른다.
 * 채널마다 조립 로직을 두지 않는다. 같은 요청에 같은 바이트가 나온다(결정적).
 *
 * request: 목적·콘텐츠 요청(src/platform/page-content.mjs PAGE_REQUEST_KEYS). 핵심 키:
 *   purpose(필수: saas-landing | work-dashboard | editorial-docs | commerce), content, components, pattern, shell·width·density·mode,
 *   styleContext·palette·subtokenSet·typeSystem·families·surface·motion·background·media·states, candidates(1~8, 기본 3)
 * opts.include: 후보마다 value에 넣을 항목. html·css·tokens·manifest·blueprint(기본), script·standalone(선택). sizes는 항상 있다.
 *
 * 성공 value: {selected, candidates, blocked, comparison, plan, decisions}
 *   candidates[]  {id, rank, score, adjustedScore, selection, decisions, relations, quality, warnings, reasons, fingerprint, value: {html, css, tokens, manifest, blueprint, sizes}}
 *   blueprint     Blueprint 2.7.0(materials 포함). compileBlueprint로 다시 컴파일하면 같은 html·css·tokens가 나온다
 * 실패: errors에 이유(code·path·message·hint, 대안은 fix.alternatives), warnings에 막힌 후보와 재료의 이유(severity info)를 싣는다.
 */
import {assemblePage} from '../platform/page.mjs';
import {platformEnv} from '../platform/compile.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest, utf8Bytes} from './envelope.mjs';
import {diagnostic, hintFor} from './errors.mjs';
import {PAGE_REQUEST_KEYS} from '../platform/page-content.mjs';

const INCLUDE = ['html', 'css', 'tokens', 'manifest', 'blueprint', 'script', 'standalone'];
const DEFAULT_INCLUDE = ['html', 'css', 'tokens', 'manifest', 'blueprint'];
const MAX_BLOCKED = 40;

const toDiagnostic = d => diagnostic(d.code, d.path ?? '$', d.message, hintFor(d.code), {rule: d.rule, fix: d.alternatives?.length ? {alternatives: d.alternatives} : undefined, severity: d.severity === 'error' || d.severity === undefined ? undefined : d.severity});

/** 막힌 재료·조합 하나를 경고(info) 진단으로. 이유 전체가 message에 들어가고, 어느 재료인지는 path가 아니라 message가 말한다. */
function blockedDiagnostics(blocked) {
  const out = [];
  for (const b of blocked) for (const x of b.blocked) {
    if (out.length >= MAX_BLOCKED) return out;
    const who = b.combination ? `조합 ${[b.combination.palette, b.combination.subtokenSet, b.combination.typeSystem, ...Object.values(b.combination.families)].filter(Boolean).join(' · ')}` : `${b.kind} ${b.id ?? '(후보 없음)'}`;
    out.push(diagnostic(x.code, '$blocked', `${who}: ${x.reason}`, hintFor(x.code), {severity: 'info'}));
  }
  return out;
}

function readOpts(opts) {
  if (opts === undefined) return [{include: new Set(DEFAULT_INCLUDE)}, null];
  if (!isPlain(opts)) return [null, badRequest('$args.opts', 'opts는 객체여야 합니다.', '예: {include: ["html", "css", "manifest"]}')];
  const bad = checkKeys(opts, ['include'], '$args.opts');
  if (bad) return [null, bad];
  const include = opts.include ?? DEFAULT_INCLUDE;
  if (!Array.isArray(include) || include.some(x => !INCLUDE.includes(x))) return [null, badRequest('$args.opts.include', 'include는 허용된 이름의 배열이어야 합니다.', `허용값: ${INCLUDE.join(', ')}`)];
  return [{include: new Set(include)}, null];
}

export function assembleDesign(request, opts) {
  return guard(() => {
    const [o, bad] = readOpts(opts);
    if (bad) return fail([bad]);
    if (!isPlain(request)) return fail([badRequest('$args', '요청은 {purpose, content, ...} 객체여야 합니다.', `허용 키: ${PAGE_REQUEST_KEYS.join(', ')}`)]);
    const r = assemblePage(request, platformEnv());
    if (!r.ok) return fail(r.diagnostics.map(toDiagnostic), blockedDiagnostics(r.blocked));
    const candidates = r.candidates.map(c => {
      const {value, ...rest} = c;
      const picked = {sizes: {html: utf8Bytes(value.html), css: utf8Bytes(value.css)}};
      for (const k of o.include) picked[k] = value[k];
      return {...rest, warnings: c.warnings.map(toDiagnostic), value: picked};
    });
    return ok(jsonClone({selected: r.selected, candidates, blocked: r.blocked, comparison: r.comparison, plan: r.plan, decisions: r.decisions}), r.diagnostics.map(toDiagnostic));
  });
}
