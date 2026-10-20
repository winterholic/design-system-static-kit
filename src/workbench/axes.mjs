import {axes, axisDefs, axisBans, pageTypes, repairAxes} from '../catalog.mjs';

export const AXIS_GROUPS = [
  {id: 'layout', label: '배치', keys: ['shell', 'width', 'density', 'footer']},
  {id: 'type', label: '글자', keys: ['typography', 'scale', 'weight']},
  {id: 'shape', label: '모양과 깊이', keys: ['radius', 'control', 'elevation', 'icon']},
  {id: 'mood', label: '분위기', keys: ['motion', 'ornament', 'backdrop']},
];

/** 값이 적은 축은 분절 컨트롤로 보여 준다. 짧은 이름을 따로 둔다(전체 설명은 title로). */
export const SHORT = {
  density: {compact: '촘촘', comfortable: '보통', spacious: '여유'},
  control: {match: '카드 따름', pill: '알약', square: '직각'},
  motion: {none: '없음', subtle: '은은', lively: '생동'},
  backdrop: {plain: '단색', tint: '틴트', gradient: '그라데이션', grid: '격자'},
  width: {narrow: '760', standard: '1080', wide: '1280', full: '1600'},
  scale: {tight: '촘촘', balanced: '균형', dramatic: '극적'},
  weight: {regular: '가볍게', medium: '보통', bold: '굵게'},
  footer: {simple: '한 줄', columns: '열', minimal: '최소'},
  mode: {light: '밝게', dark: '어둡게', auto: '시스템'},
};
export const isSegmented = key => !!SHORT[key];

const plain = text => text.split('(')[0].trim();
export const valueLabel = (key, value) => plain(axisDefs[key].values[value]);

/**
 * 이 값을 지금 고를 수 있는가.
 *  blocked  테마·페이지 유형이 막은 값(고를 수 없음)
 *  conflict 다른 축과 부딪히는 값(고르면 부딪힌 축을 규칙의 대안으로 함께 바꿈)
 */
export function optionState(blueprint, theme, key, value) {
  const pt = pageTypes[blueprint.pageType], candidate = {...blueprint, [key]: value};
  if (theme.forbid[key]?.includes(value)) return {blocked: true, reason: `${theme.name} 테마는 이 값을 쓰지 않습니다.`};
  if (key === 'shell' && !pt.shells.includes(value)) return {blocked: true, reason: `${pt.label} 페이지에서는 쓸 수 없는 셸입니다.`};
  if (key === 'width' && pt.widths && !pt.widths.includes(value)) return {blocked: true, reason: `${pt.label} 페이지는 읽기 폭 이하만 허용합니다.`};
  const ban = axisBans.find(b => b.uses.includes(key) && b.bad(candidate));
  if (ban) return {conflict: ban, reason: `${ban.id} · ${ban.why}`};
  return {};
}

/** 사용자가 고른 값을 지키면서 부딪힌 다른 축만 규칙의 대안으로 바꾼다. 못 지키면 error를 돌려준다. */
export function chooseAxis(blueprint, key, value) {
  const next = structuredClone(blueprint), before = structuredClone(blueprint);
  next[key] = value;
  repairAxes(next);
  if (next[key] !== value) return {error: `${key}=${value}는 현재 조합에서 쓸 수 없습니다.`};
  const adjusted = Object.keys(next).filter(k => k !== key && k !== 'tree' && k !== 'chrome' && JSON.stringify(next[k]) !== JSON.stringify(before[k]));
  return {blueprint: next, adjusted};
}

export function axisOptions(key) { return axes[key]; }
