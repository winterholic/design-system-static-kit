/**
 * Blueprint 2.7.0 컴파일(ADR 0012 §7.4, §9.6). `materials`가 있는 문서를 플랫폼 재료로 렌더한다: src/compiler.mjs의 compile()이 materials가 있으면 이 함수를 부른다.
 * 2.6.0 이하와 materials가 없는 2.7.0 문서는 기존 경로(고정 출력)를 그대로 지난다.
 *
 * 렌더는 assembleDesign이 쓰는 renderPlatformBlueprint와 같은 함수다. 그래서 assembleDesign이 돌려준 blueprint를 컴파일하면 candidate.value의 html(standalone)·css·tokens와 같은 바이트가 나온다.
 * 실패는 compile()의 계약대로 던진다: error.errors는 [{path, code, message}]다(서비스가 Diagnostic으로 옮긴다).
 */
import {validateBlueprint} from '../validate.mjs';
import {createPlatform} from './examples/minimal.mjs';
import {renderPlatformBlueprint, platformManifest} from './render.mjs';

let shared = null;
/** 컴파일이 쓰는 플랫폼(등록된 재료 전체). 처음 부를 때 한 번 만든다. */
export const platformEnv = () => (shared ??= createPlatform());

const invalid = errors => { const e = new Error('Invalid blueprint:\n' + errors.map(x => `${x.path} [${x.code}] ${x.message}`).join('\n')); e.errors = errors; return e; };

export function compilePlatformBlueprint(input, env = platformEnv()) {
  const verdict = validateBlueprint(input);
  if (!verdict.valid) throw invalid(verdict.errors);
  const b = structuredClone(input);
  const r = renderPlatformBlueprint(b, env);
  if (!r.ok) throw invalid(r.diagnostics.filter(d => d.severity === 'error').map(({path, code, message}) => ({path, code, message})));
  const manifest = platformManifest(b, r);
  return {html: r.parts.standalone, css: r.parts.css, tokens: r.parts.tokens, manifest};
}
