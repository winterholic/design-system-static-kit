/**
 * 편집 연산 서비스(ADR 0009, 0012 §9.6 D3): 편집 계층(src/edit)의 연산을 같은 봉투로 REST·MCP·Studio에 연다. 채널은 연산을 직접 부르지 않고 이 함수를 부른다.
 *
 *   listEditOps()                       허용 연산 이름과 호출 모양
 *   applyEdit({blueprint, steps})       steps: [{op, args?}]를 차례로 적용한다. 하나라도 실패하면 아무것도 적용하지 않는다(문서는 그대로).
 *                                       성공 value: {blueprint: 편집된 문서, changes: 연산마다 바뀐 항목, steps}. 실패 errors: 연산이 낸 {code, path, message, hint}
 * 입력 문서는 바뀌지 않는다. 결과 문서는 검증하지 않는다(validateBlueprint로 확인한다): 연산이 내는 오류는 연산 안의 규칙(허용 값, 위치)이다.
 */
import {opNames, applySequence} from '../edit/index.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';
import {withHint} from './errors.mjs';

export const MAX_STEPS = 50;

export function listEditOps() {
  return guard(() => ok({ops: [...opNames], call: {blueprint: 'Blueprint JSON', steps: '[{op, args?}] (최대 ' + MAX_STEPS + '개)'}, note: '연산별 args의 검사는 각 연산이 하고 실패하면 errors에 code·path·message·hint가 있다. 스키마: getSchema({target: "edit-ops"}).'}));
}

export function applyEdit(request) {
  return guard(() => {
    if (!isPlain(request)) return fail([badRequest('$args', '요청은 {blueprint, steps} 객체여야 합니다.', '예: {blueprint: {...}, steps: [{op: "setTheme", args: {theme: "trust"}}]}')]);
    const bad = checkKeys(request, ['blueprint', 'steps'], '$args');
    if (bad) return fail([bad]);
    if (!isPlain(request.blueprint)) return fail([badRequest('$args.blueprint', 'blueprint는 Blueprint 객체여야 합니다.')]);
    const {steps} = request;
    if (!Array.isArray(steps) || !steps.length || steps.length > MAX_STEPS) return fail([badRequest('$args.steps', `steps는 연산 1~${MAX_STEPS}개의 배열이어야 합니다.`, `연산 이름은 listEditOps()가 알려 줍니다: ${opNames.join(', ')}`)]);
    for (const [i, st] of steps.entries()) {
      if (!isPlain(st) || typeof st.op !== 'string') return fail([badRequest(`$args.steps[${i}]`, '각 단계는 {op, args?} 객체여야 합니다.', `op는 ${opNames.join(', ')} 중 하나입니다.`)]);
      const extra = checkKeys(st, ['op', 'args'], `$args.steps[${i}]`);
      if (extra) return fail([extra]);
      if (st.args !== undefined && !isPlain(st.args)) return fail([badRequest(`$args.steps[${i}].args`, 'args는 객체여야 합니다.')]);
    }
    const run = applySequence(structuredClone(request.blueprint), steps);
    if (!run.ok) return fail(run.errors.map(e => withHint({...e, path: e.path?.startsWith('$') ? e.path : `$args.steps[${run.failedAt}]`})));
    const warnings = run.results.flatMap(r => r.warnings ?? []).map(w => withHint(w));
    return ok(jsonClone({blueprint: run.doc, changes: run.results.map(r => r.changes ?? []), steps: steps.length}), warnings);
  });
}
