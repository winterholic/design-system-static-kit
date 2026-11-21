import {rules, expressionRules, axisBans, themes} from '../catalog.mjs';
import {validateBlueprint as coreValidate} from '../validate.mjs';
import {withHint} from './errors.mjs';
import {ok, fail, guard, isPlain, checkKeys, badRequest} from './envelope.mjs';
import {checkExpectedVersion} from './versions.mjs';

const ruleOfCode = code => [...rules, ...expressionRules].find(r => r.codes.includes(code))?.id;

/**
 * 검증기 오류 하나를 Diagnostic으로 바꾼다. 코드·경로·메시지는 그대로 두고 hint와 규칙 ID를 붙인다.
 * AXIS_BAN과 THEME_FORBID는 메시지 문장 속에만 있던 대안을 기계가 읽는 fix로도 준다.
 */
export function annotate(error, blueprint) {
  const d = withHint(error);
  const rule = ruleOfCode(error.code);
  if (error.code === 'AXIS_BAN') {
    const ban = axisBans.find(b => error.message.startsWith(b.id + ' ·'));
    if (ban) { d.rule = ban.id; d.fix = {...ban.fix}; }
  } else if (error.code === 'THEME_FORBID') {
    const axis = String(error.path).slice(2), theme = themes[blueprint?.theme];
    const alt = theme?.defaults?.[axis];
    d.rule = rule;
    if (alt !== undefined && !(theme.forbid?.[axis] ?? []).includes(alt)) d.fix = {[axis]: alt};
  } else if (rule) d.rule = rule;
  // 프로파일 진단(src/profiles/check.mjs)은 규칙 ID와 대안 값을 오류에 직접 싣는다.
  else if (typeof error.rule === 'string') { d.rule = error.rule; if (error.fix) d.fix = {...error.fix}; }
  return d;
}

/** 요청 옵션을 읽는다. 모양이 틀리면 [null, 오류]를 돌려준다. */
export function readOpts(opts, allowed, blueprint) {
  if (opts === undefined) return [{}, null];
  if (!isPlain(opts)) return [null, badRequest('$args.opts', 'opts는 객체여야 합니다.', `허용 키: ${allowed.join(', ')}`)];
  return [opts, checkKeys(opts, allowed, '$args.opts') ?? checkExpectedVersion(opts.catalogVersion, blueprint)];
}

/** 입력 Blueprint가 카탈로그 규칙을 모두 지키는지 본다. 채널과 상관없이 같은 검증기(src/validate.mjs)를 한 번 거친다. */
export function validateBlueprint(blueprint, opts) {
  return guard(() => {
    const [, bad] = readOpts(opts, ['catalogVersion'], blueprint);
    if (bad) return fail([bad]);
    const verdict = coreValidate(blueprint);
    const warnings = (verdict.warnings ?? []).map(w => ({...annotate(w, blueprint), severity: w.severity, contract: w.contract}));
    return verdict.valid ? ok({valid: true}, warnings) : fail(verdict.errors.map(e => annotate(e, blueprint)), warnings);
  });
}
