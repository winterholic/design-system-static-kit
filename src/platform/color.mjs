/**
 * 팔레트 × 서브토큰 세트 결합(ADR 0012 §1). 팔레트는 원색만, 서브토큰 세트는 역할 분배 규칙만 가진다.
 * 같은 세트를 여러 팔레트에, 같은 팔레트를 여러 세트에 쓸 수 있다(다대다). 결합이 대비 게이트를 통과하는지는 계산 관계(paletteSubtokenCheck)로 판정한다.
 *
 * 램프와 대비 보정은 2.6.0 색 토큰 엔진(src/color-tokens.mjs)의 함수를 그대로 쓴다. 이 파일은 색 계산식을 새로 두지 않는다.
 */
import {colorRamp, readableColor, colorContrast} from '../color-tokens.mjs';
import {COLOR_ROLES} from './contract.mjs';
import {defineCheck} from './relations.mjs';

const WHITE = '#FFFFFF';

/**
 * bindColor(palette, subtokenSet, mode) → {ok, roles: {역할: hex}, vars: {'--kit-*': hex}, report: [{role, against, ratio, minimum}], error?}
 * mode: 'light' | 'dark'. 실패(필요한 원색 없음·대비 불가)는 던지지 않고 ok:false와 error로 돌려준다.
 */
export function bindColor(palette, subtokenSet, mode = 'light') {
  const missing = subtokenSet.needs.filter(s => !Object.hasOwn(palette.seeds, s));
  if (missing.length) return {ok: false, roles: null, vars: null, report: [], error: {code: 'P_COLOR_SLOT', message: `${palette.id}에 ${missing.join(', ')} 원색이 없습니다(${subtokenSet.id}가 필요)`}};
  if (!subtokenSet.modes.includes(mode)) return {ok: false, roles: null, vars: null, report: [], error: {code: 'P_COLOR_MODE', message: `${subtokenSet.id}는 ${mode} 모드를 내지 않습니다`}};
  const ramps = Object.fromEntries(subtokenSet.needs.map(s => [s, colorRamp(palette.seeds[s])]));
  const roles = {}, report = [];
  try {
    for (const [role, rule] of Object.entries(subtokenSet.roles)) {
      if (rule.from !== undefined) {
        const base = ramps[rule.from][rule[mode]];
        const against = (rule.min?.against ?? []).map(a => roles[a]);
        roles[role] = rule.min ? readableColor(base, against, rule.min.ratio) : base;
        for (const a of rule.min?.against ?? []) report.push({role, against: a, ratio: Math.floor(colorContrast(roles[role], roles[a]) * 1e4) / 1e4, minimum: rule.min.ratio});
      } else {
        const bg = roles[rule.on], ink = ramps.neutral['950'];
        roles[role] = colorContrast(WHITE, bg) >= rule.min ? WHITE : colorContrast(ink, bg) >= rule.min ? ink : null;
        if (!roles[role]) throw new Error(`COLOR_CONTRAST: no text color reaches ${rule.min}:1 on ${rule.on}`);
        report.push({role, against: rule.on, ratio: Math.floor(colorContrast(roles[role], bg) * 1e4) / 1e4, minimum: rule.min});
      }
    }
  } catch (e) {
    return {ok: false, roles: null, vars: null, report, error: {code: 'P_COLOR_CONTRAST', message: `${palette.id} × ${subtokenSet.id} (${mode}): ${e.message}`}};
  }
  const vars = Object.fromEntries(Object.entries(roles).map(([r, v]) => [COLOR_ROLES[r], v]));
  return {ok: report.every(x => x.ratio >= x.minimum), roles, vars, report};
}

/** 계산 관계: 팔레트와 서브토큰 세트가 세트의 모든 모드에서 결합·대비를 통과하는가. */
export const paletteSubtokenCheck = defineCheck({
  id: 'palette-subtoken', kinds: ['palette', 'subtoken-set'], reason: '세트의 모든 모드에서 필요한 원색이 있고 대비 게이트를 통과한다',
  run(palette, set, ctx) {
    const modes = ctx.mode ? [ctx.mode] : set.modes;
    for (const mode of modes) { const r = bindColor(palette, set, mode); if (!r.ok) return {ok: false, reason: r.error?.message ?? `${mode} 대비 미달`}; }
    return {ok: true};
  },
});

/** 색 작업이 소유하는 계산 관계 목록. createPlatform이 이 배열을 그대로 읽는다(다른 작업 파일을 고치지 않고 검사를 더하게). */
export const COLOR_CHECKS = Object.freeze([paletteSubtokenCheck]);
