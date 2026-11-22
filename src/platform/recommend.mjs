/**
 * 추천(ADR 0012 §6). 이미 고른 재료와 맥락에 비춰 한 종류의 후보를 점수 순으로 돌려준다. 결정적이다(동점은 id 순).
 *
 * 점수 = 선언 관계(prefers +priority, avoids −priority) + 스타일 맥락의 축 선호 일치.
 * forbids 관계나 계산 관계(check)에 걸린 후보는 순위에서 빼고 blocked에 이유와 함께 남긴다. 추천은 고른 값을 바꾸지 않는다.
 * 파이프라인의 selectMaterials 단계가 같은 함수를 부르므로 "추천 1순위"와 "요구가 없을 때 조립되는 값"이 같다.
 */

import {materialAxisIds} from './axes.mjs';
import {typeFit} from './type.mjs';

/** 스타일 맥락의 축 선호(axisPreferences: {축: [선호 순서]})와 패밀리 모양이 맞으면 앞 순위일수록 큰 가산. */
export const AXIS_PREFERENCE_WEIGHT = 10;

/** 스타일 재료 5종 중 축 값(axes)을 가진 재료. 패밀리의 shape와 같은 방식으로 스타일 맥락의 축 선호를 읽는다. */
const AXES_KINDS = ['surface', 'motion', 'background', 'media', 'state-pattern'];
/** 한 재료가 두 축을 구현할 때 더 크게 보이는 축의 배수. 배경은 페이지 바탕(backdrop)이 장식(ornament)보다 먼저 읽힌다. */
const AXIS_MULTIPLIER = {backdrop: 2};

function styleAxisBonus(candidate, styleContext) {
  const isFamily = candidate.kind === 'family';
  if (!styleContext || !(isFamily || AXES_KINDS.includes(candidate.kind))) return [];
  const shape = isFamily ? candidate.shape : candidate.axes;
  const out = [];
  for (const [axis, order] of Object.entries(styleContext.axisPreferences)) {
    const v = shape?.[axis];
    const i = order.indexOf(v);
    const weight = AXIS_PREFERENCE_WEIGHT * (isFamily ? 1 : AXIS_MULTIPLIER[axis] ?? 1);
    if (i >= 0) out.push({from: styleContext.id, to: candidate.id, type: 'axis-preference', priority: weight * (order.length - i), reason: `${styleContext.label}는 ${axis}=${v}를 ${i + 1}순위로 선호한다`});
    // 패밀리는 모양 값이 금지면 차단한다. 스타일 재료는 쓰는 값(uses) 전부를 본다(아래 usesBlock).
    if (isFamily && styleContext.forbid[axis]?.includes(v)) out.push({blocked: true, reason: `${styleContext.label}는 ${axis}=${v}를 금지한다`});
  }
  if (!isFamily) for (const [axis, values] of Object.entries(candidate.uses ?? {})) {
    const hit = values.filter(v => (styleContext.forbid[axis] ?? []).includes(v));
    if (hit.length) out.push({blocked: true, reason: `${styleContext.label}는 ${axis}=${hit.join('·')}를 금지한다(${candidate.label}가 쓴다)`});
  }
  return out;
}

/** 스타일 맥락의 축 선호 가산만(막힘 제외). 조합 점수가 추천과 같은 계산을 쓰게 한다. [{from, to, type, priority, reason}] */
export const axisPreference = (candidate, styleContext) => styleAxisBonus(candidate, styleContext).filter(b => !b.blocked);

/**
 * request: {kind, context?, mode?, density?, styleContext?: id, selected?: [id], fit?: boolean}
 * 반환: {kind, ranked: [{id, score, reasons}], blocked: [{id, blocked: [{code, reason, with}]}]}
 */
export function recommend(registry, graph, {kind, context, mode, density, styleContext = null, selected = [], fit = false} = {}) {
  const ctx = Object.fromEntries(Object.entries({context, mode, density}).filter(([, v]) => v !== undefined));
  const sc = styleContext ? registry.get(styleContext) : null;
  const anchors = [...selected, ...(sc ? [sc.id] : [])];
  const pool = registry.kind(kind).filter({context});
  const scored = pool.map(m => {
    const s = graph.score(m.id, anchors, ctx);
    if (kind === 'purpose-family') {
      const visualIds = selected.filter(id => registry.get(id)?.kind === 'family');
      const visuals = visualIds.length ? visualIds : registry.list('family').map(f => f.id);
      const densityValues = m.props?.density ?? m.variants?.density;
      if (density && densityValues && !densityValues.includes(density)) s.blocked.push({code: 'P_PURPOSE_DENSITY', with: `axis-value:density.${density}`, reason: `${m.id}는 ${density} 밀도를 받지 않습니다(허용: ${densityValues.join('·')})`});
      const fitting = visuals.filter(id => m.visual?.[id]?.allowed && m.bases.every(base => registry.get(id)?.members?.[base]));
      if (!fitting.length) {
        const reasons = visuals.flatMap(id => m.visual?.[id]?.reasons ?? []);
        s.blocked.push({code: 'P_CHECK_PURPOSE_FAMILY_VISUAL', with: visualIds[0] ?? m.id, reason: reasons[0] ?? `${m.id}를 그릴 호환 시각 패밀리가 없습니다`});
      } else {
        const visualScores = fitting.map(id => ({id, ...graph.score(id, [...anchors, ...m.bases], ctx)}));
        const best = visualScores.filter(x => !x.blocked.length).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[0];
        if (!best) {
          const reason = visualScores.flatMap(x => x.blocked).find(x => x.reason)?.reason ?? `${m.id}에 맞는 시각 패밀리가 ${context ?? '현재 맥락'}에서 호환되지 않습니다`;
          s.blocked.push({code: 'P_CHECK_PURPOSE_FAMILY_VISUAL', with: visualIds[0] ?? m.id, reason});
        } else {
          s.score += best.score;
          if (best.reasons.length) s.reasons.push(...best.reasons.map(r => ({...r, via: best.id, reason: `${best.id}를 통해: ${r.reason}`})));
        }
      }
    }
    // fit: true이면 타이포 시스템의 맥락(페이지 유형·밀도) 적합성 표(type.mjs typeFit)도 점수와 이유에 더한다(타이포 작업의 요청, 계약 0.3.0).
    // 기본은 꺼 둔다: 기존 순위를 고정한 시험(tests/platform-type.test.mjs 등)이 있어, 그 작업이 기대 순위를 옮긴 뒤 기본을 켠다. 페이지 파이프라인은 켠다.
    if (fit && kind === 'type-system') { const f = typeFit(m.id, ctx); s.score += f.score; s.reasons.push(...f.reasons); }
    // 재료가 가진 축 값(패밀리 모양·서체 짝)이 고른 재료·요구한 축 값과 금지 관계인지. 같은 쌍은 한 번만 적는다.
    // 스타일 맥락 기록의 forbid가 가진 모양 금지는 아래 styleAxisBonus가 옛 코드(P_REL_STYLE_FORBID)로 보고하므로 여기서 같은 사실을 다시 적지 않는다.
    const legacyBan = (axisId, a) => { const [axis, value] = axisId.slice('axis-value:'.length).split('.'); return a === sc?.id && sc.forbid[axis]?.includes(value); };
    for (const axisId of materialAxisIds(m)) for (const a of anchors) for (const e of graph.between(axisId, a, ctx)) {
      if (e.type === 'forbids' && !legacyBan(axisId, a) && !s.blocked.some(b => b.with === a && b.reason === e.reason)) s.blocked.push({code: 'P_REL_FORBIDS', with: a, reason: e.reason});
    }
    for (const b of styleAxisBonus(m, sc)) {
      if (b.blocked) s.blocked.push({code: 'P_REL_STYLE_FORBID', with: sc.id, reason: b.reason});
      else { s.score += b.priority; s.reasons.push(b); }
    }
    return s;
  });
  const ranked = scored.filter(s => !s.blocked.length).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map(({id, score, reasons}) => ({id, score, reasons}));
  const blocked = scored.filter(s => s.blocked.length).map(({id, blocked}) => ({id, blocked}));
  // 맥락 필터로 후보가 하나도 남지 않으면 이유를 남긴다(스타일 작업의 요청, 0.3.0). id는 null이다: 막힌 재료가 아니라 후보 자체가 없다.
  if (!pool.length) {
    const all = registry.kind(kind).list();
    const reason = all.length
      ? `${context ?? '전체'} 맥락용 ${kind} 재료가 없습니다(등록된 ${all.length}개 재료의 맥락: ${[...new Set(all.flatMap(m => m.contexts))].sort().join(', ')})`
      : `${kind} 재료가 하나도 등록되지 않았습니다`;
    blocked.push({id: null, blocked: [{code: 'P_RECOMMEND_NO_CANDIDATE', with: context ?? null, reason}]});
  }
  return {kind, ranked, blocked};
}
