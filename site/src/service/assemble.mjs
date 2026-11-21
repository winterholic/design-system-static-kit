/**
 * assembleBlueprint: 디자인 프로파일로 2.6.0 Blueprint를 조립하는 서비스 함수(src/profiles/assemble.mjs의 봉투판).
 * 프로파일·조립 API의 외부 공개 경로는 이 함수 하나다(패키지 공개 진입점은 ./service·./edit뿐).
 * 프로파일 정적 검사는 validateBlueprint가 profile이 있는 Blueprint에 이미 적용한다.
 *
 * 조립 진단의 근거(reason)와 대안(alternatives)은 Diagnostic 모양을 바꾸지 않도록 message 뒤에 붙이고, 기계가 읽는 대안 값은 fix에 싣는다.
 */
import {assemble} from '../profiles/assemble.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';
import {diagnostic} from './errors.mjs';

const KEYS = ['profile', 'intent', 'content'];

const toDiagnostic = d => diagnostic(d.code, d.path, d.reason && d.reason !== d.message ? `${d.message} 근거: ${d.reason}${d.alternatives.length ? ` 대안: ${d.alternatives.join(', ')}` : ''}` : d.message, d.hint, {fix: d.fix, severity: d.severity === 'error' ? null : d.severity});

/**
 * request: {profile, intent?, content?}. intent·content는 src/profiles/assemble.mjs의 INTENT_KEYS·CONTENT_KEYS를 따른다.
 * 성공 value: {blueprint, decisions, materials}. 지원하지 않는 요구는 다른 값으로 바꾸지 않고 ok:false와 ASSEMBLE_* 진단으로 돌려준다.
 */
export function assembleBlueprint(request) {
  return guard(() => {
    if (!isPlain(request)) return fail([badRequest('$args', '요청은 {profile, intent, content} 객체여야 합니다.', `허용 키: ${KEYS.join(', ')}`)]);
    const bad = checkKeys(request, KEYS, '$args');
    if (bad) return fail([bad]);
    if (typeof request.profile !== 'string') return fail([badRequest('$args.profile', 'profile은 프로파일 id 문자열이어야 합니다.', 'getSchema({target:"blueprint"})의 profile enum에서 고르세요.')]);
    const r = assemble(request.profile, request.intent ?? {}, request.content ?? {});
    const errors = r.diagnostics.filter(d => d.severity === 'error').map(toDiagnostic), warnings = r.diagnostics.filter(d => d.severity !== 'error').map(toDiagnostic);
    return r.ok ? ok(jsonClone({blueprint: r.blueprint, decisions: r.decisions, materials: r.materials}), warnings) : fail(errors, warnings);
  });
}
