/**
 * 독립 타이포그래피 시스템(ADR 0012 §2). 타이포 시스템 = 서체 짝(facePairing) × 역할 크기 체계(roleScale).
 *
 * - 서체 짝은 기존 서체 프리셋 18개(src/typography.mjs TYPE_R2, `type-preset:<id>`)의 제목·본문 서체와 숫자 정렬을 쓴다.
 * - 역할 크기 체계는 역할형 프리셋 4개(src/materials/typography.mjs MATERIAL_TYPE_PRESETS, `type-role-preset:<id>`)의 크기·굵기·행간·자간을 쓴다.
 * - 현재 2.6.0 컴파일(renderRoleTypeCSS)은 역할형 프리셋이 서체까지 덮어써서 서체 축 선택이 사라진다(docs/platform/audit-2026-11.md Q2).
 *   여기서는 서체는 서체 짝에서만, 크기는 역할 체계에서만 가져와 두 축이 서로를 지우지 않게 한다.
 * - 한글 한도(HANGUL)는 엔진 값을 그대로 검사한다. 세리프 한글 서체는 굵기 한 벌이라 serifHangulWeightMax를 넘는 굵기는 거부한다.
 */
import {STACKS, TYPE_R2, HANGUL, ROLES} from '../typography.mjs';
import {MATERIAL_TYPE_PRESETS} from '../materials/typography.mjs';
import {TYPE_ROLES} from './contract.mjs';

const SERIF_STACKS = new Set(['iowan', 'georgia', 'charter', 'baskerville', 'didone', 'slab', 'news', 'palatino']);
const strip = (prefix, id) => (typeof id === 'string' && id.startsWith(prefix + ':') ? id.slice(prefix.length + 1) : null);

/** 타이포 작업이 소유하는 계산 관계 목록. 서체 짝 × 역할 체계 검사는 한 기록 안의 일이라 bindType 오류로 내고, 다른 종류와의 관계가 생기면 여기에 더한다. */
export const TYPE_CHECKS = Object.freeze([]);

/**
 * bindType(typeSystem) → {ok, vars: {'--kit-*': 값}, roles: {역할: {size, weight, lineHeight, trackingEm, fontFamily}}, errors: [{code, message}]}
 * 서체 짝·역할 체계 id가 기존 표에 없으면 ok:false.
 */
export function bindType(ts) {
  const errors = [];
  const faceId = strip('type-preset', ts.facePairing), scaleId = strip('type-role-preset', ts.roleScale);
  const face = TYPE_R2[faceId], scale = MATERIAL_TYPE_PRESETS[scaleId];
  if (!face) errors.push({code: 'P_TYPE_FACE', message: `모르는 서체 짝: ${ts.facePairing}`});
  if (!scale) errors.push({code: 'P_TYPE_SCALE', message: `모르는 역할 크기 체계: ${ts.roleScale}`});
  if (errors.length) return {ok: false, vars: null, roles: null, errors};
  const heading = STACKS[face.head], body = STACKS[face.text], serifHead = SERIF_STACKS.has(face.head);
  const r = scale.roles, px = face.body;
  const roles = {
    display: {...r.display, fontFamily: heading}, heading: {...r.heading, fontFamily: heading},
    sub: {size: `${Math.min(ROLES.sub.cap, Math.round(px * face.ratio))}px`, weight: r.heading.weight, lineHeight: face.lh.sub, trackingEm: face.track.sub, fontFamily: heading},
    body: {...r.body, fontFamily: body}, small: {size: `${ROLES.small.fixed(px)}px`, weight: r.body.weight, lineHeight: face.lh.body, trackingEm: 0, fontFamily: body},
    label: {...r.label, fontFamily: body}, caption: {...r.caption, fontFamily: body}, numeric: {...r.numeric, fontFamily: body},
  };
  if (serifHead) for (const role of ['display', 'heading', 'sub']) if (roles[role].weight > HANGUL.serifHangulWeightMax)
    errors.push({code: 'P_TYPE_HANGUL_WEIGHT', message: `${ts.facePairing}의 세리프 제목에 ${ts.roleScale}의 ${role} 굵기 ${roles[role].weight}는 한글 세리프 굵기 상한 ${HANGUL.serifHangulWeightMax}를 넘습니다`});
  const vars = {'--kit-heading': heading, '--kit-font': body, '--kit-mono': STACKS.mono, '--kit-hw': String(roles.heading.weight), '--kit-line': String(roles.body.lineHeight)};
  for (const [role, names] of Object.entries(TYPE_ROLES)) for (const n of names) vars[n] = roles[role].size;
  vars['--kit-nums'] = ts.numerals === 'tabular' || face.nums === 'tabular' ? 'tabular-nums' : 'proportional-nums';
  return {ok: errors.length === 0, vars, roles, errors};
}
