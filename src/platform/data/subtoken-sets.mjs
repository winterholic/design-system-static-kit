/**
 * 서브토큰 세트(색 작업 소유). 팔레트 원색 자리 → 색 역할의 분배 규칙이다. 원색 값을 갖지 않으므로 여러 팔레트에 재사용한다.
 * 역할 순서가 계산 순서다: 배경 역할을 먼저 두고, 글자 역할은 대비 기준(min.against)으로 앞의 배경을 가리킨다.
 */
import {definePlatformMaterial} from '../contract.mjs';

const ALL = ['brand', 'neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const r = (from, light, dark, against, ratio) => (against ? {from, light, dark, min: {against, ratio}} : {from, light, dark});
const FG_BG = ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'];

/** 표준: 중립색 바탕, 브랜드는 액션·링크·초점에만. static-kit 2.6.0 그래프(src/color-tokens.mjs getMode)와 같은 분배 원칙. */
const standard = {
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '50', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '50', FG_BG, 7), muted: r('neutral', '700', '300', FG_BG, 4.5), border: r('neutral', '200', '700'), rule: r('neutral', '500', '500', ['surface'], 3),
  action: r('brand', '700', '400', ['canvas', 'surface'], 4.5), onAction: {on: 'action', min: 4.5}, link: r('brand', '700', '300', ['canvas', 'surface', 'cardHover', 'cardActive'], 4.5), focus: r('brand', '600', '300', ['canvas', 'surface'], 3),
  accent: r('accent', '700', '300'), onAccent: {on: 'accent', min: 4.5},
  success: r('success', '700', '300', ['surface'], 4.5), warning: r('warning', '800', '300', ['surface'], 4.5), danger: r('danger', '700', '300', ['surface', 'dangerSoft'], 4.5), info: r('info', '700', '300', ['surface'], 4.5),
  disabledFg: r('neutral', '500', '400', ['disabledBg'], 3),
};

/** 틴트: 바탕과 표면 상태를 브랜드 명도 단계로 칠하고 경계도 브랜드 쪽으로 둔다. 같은 팔레트에서 더 브랜드색이 도는 화면. */
const tinted = {
  ...standard,
  canvas: r('brand', '50', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '100', '800'), sunken: r('brand', '100', '950'),
  cardHover: r('brand', '50', '800'), cardActive: r('brand', '100', '700'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '50', FG_BG, 7), muted: r('neutral', '700', '300', FG_BG, 4.5), border: r('brand', '200', '700'), rule: r('brand', '400', '500', ['surface'], 3),
  action: r('brand', '600', '300', ['canvas', 'surface'], 4.5),
};
// 펼친 뒤 덮어쓴 키는 원래 위치에 남으므로 순서를 표준과 같게 다시 맞춘다(계산 순서 = 키 순서).
const ordered = rules => Object.fromEntries(Object.keys(standard).map(k => [k, rules[k]]));

export const SUBTOKEN_SETS = Object.freeze([
  definePlatformMaterial({id: 'subtoken-set:standard', kind: 'subtoken-set', label: '표준 분배', needs: ALL, modes: ['light', 'dark'], roles: standard,
    quality: {status: 'implemented', evidence: []}, tags: ['neutral-surface'], reuses: ['color-token:semantic.action']}),
  definePlatformMaterial({id: 'subtoken-set:tinted', kind: 'subtoken-set', label: '틴트 분배', needs: ALL, modes: ['light', 'dark'], roles: ordered(tinted),
    quality: {status: 'implemented', evidence: []}, tags: ['brand-surface']}),
]);
