/**
 * 스타일 맥락(테마·기타 재료 작업 소유). 테마 54개를 "값을 정하는 묶음"에서 "추천 순위를 정하는 맥락"으로 옮긴다(ADR 0012 §3).
 * 테마의 축 기본값은 첫 선호로, 단일 축 금지(forbid)는 그대로 금지로 옮긴다. 테마의 팔레트 목록(Coolors, 권리 미확인)은 옮기지 않는다.
 */
import {themes} from '../../catalog/index.mjs';
import {definePlatformMaterial} from '../contract.mjs';

const SHAPE_AXES = ['radius', 'elevation', 'motion'];

/** 테마 하나 → 스타일 맥락 기록. contexts는 호출자가 준다(테마에는 페이지 유형 목록이 없다). */
export function styleContextFromTheme(themeId, {contexts = ['any'], extraPreferences = {}} = {}) {
  const t = themes[themeId];
  if (!t) throw new RangeError(`unknown theme: ${themeId}`);
  const axisPreferences = Object.fromEntries(SHAPE_AXES.map(a => [a, [...new Set([t.defaults[a], ...(extraPreferences[a] ?? [])])]]));
  const forbid = Object.fromEntries(SHAPE_AXES.filter(a => t.forbid[a]).map(a => [a, [...t.forbid[a]]]));
  return definePlatformMaterial({
    id: `style-context:${themeId}`, kind: 'style-context', label: t.name, contexts, axisPreferences, forbid, mood: [t.category],
    quality: {status: 'implemented', evidence: []}, reuses: [`theme:${themeId}`],
  });
}

/** 테마·기타 재료 작업이 소유하는 계산 관계 목록. */
export const STYLE_CHECKS = Object.freeze([]);

export const STYLE_CONTEXTS = Object.freeze([
  styleContextFromTheme('workspace', {contexts: ['dashboard', 'data', 'listing', 'settings'], extraPreferences: {radius: ['subtle'], elevation: ['soft']}}),
]);
