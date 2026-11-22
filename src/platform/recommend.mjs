/**
 * 추천(ADR 0012 §6). 이미 고른 재료와 맥락에 비춰 한 종류의 후보를 점수 순으로 돌려준다. 결정적이다(동점은 id 순).
 *
 * 점수 = 선언 관계(prefers +priority, avoids −priority) + 스타일 맥락의 축 선호 일치.
 * forbids 관계나 계산 관계(check)에 걸린 후보는 순위에서 빼고 blocked에 이유와 함께 남긴다. 추천은 고른 값을 바꾸지 않는다.
 * 파이프라인의 selectMaterials 단계가 같은 함수를 부르므로 "추천 1순위"와 "요구가 없을 때 조립되는 값"이 같다.
 */

/** 스타일 맥락의 축 선호(axisPreferences: {축: [선호 순서]})와 패밀리 모양이 맞으면 앞 순위일수록 큰 가산. */
export const AXIS_PREFERENCE_WEIGHT = 10;

function styleAxisBonus(candidate, styleContext) {
  if (!styleContext || candidate.kind !== 'family') return [];
  const out = [];
  for (const [axis, order] of Object.entries(styleContext.axisPreferences)) {
    const v = candidate.shape?.[axis];
    const i = order.indexOf(v);
    if (i >= 0) out.push({from: styleContext.id, to: candidate.id, type: 'axis-preference', priority: AXIS_PREFERENCE_WEIGHT * (order.length - i), reason: `${styleContext.label}는 ${axis}=${v}를 ${i + 1}순위로 선호한다`});
    if (styleContext.forbid[axis]?.includes(v)) out.push({blocked: true, reason: `${styleContext.label}는 ${axis}=${v}를 금지한다`});
  }
  return out;
}

/**
 * request: {kind, context?, mode?, density?, styleContext?: id, selected?: [id]}
 * 반환: {kind, ranked: [{id, score, reasons}], blocked: [{id, blocked: [{code, reason, with}]}]}
 */
export function recommend(registry, graph, {kind, context, mode, density, styleContext = null, selected = []} = {}) {
  const ctx = Object.fromEntries(Object.entries({context, mode, density}).filter(([, v]) => v !== undefined));
  const sc = styleContext ? registry.get(styleContext) : null;
  const anchors = [...selected, ...(sc ? [sc.id] : [])];
  const scored = registry.kind(kind).filter({context}).map(m => {
    const s = graph.score(m.id, anchors, ctx);
    for (const b of styleAxisBonus(m, sc)) {
      if (b.blocked) s.blocked.push({code: 'P_REL_STYLE_FORBID', with: sc.id, reason: b.reason});
      else { s.score += b.priority; s.reasons.push(b); }
    }
    return s;
  });
  const ranked = scored.filter(s => !s.blocked.length).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map(({id, score, reasons}) => ({id, score, reasons}));
  const blocked = scored.filter(s => s.blocked.length).map(({id, blocked}) => ({id, blocked}));
  return {kind, ranked, blocked};
}
