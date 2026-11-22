/**
 * 관계 그래프(ADR 0012 §5). 재료 사이의 호환 여부·우선순위·이유·조건·금지·의존을 한곳에서 읽는다.
 *
 * 관계는 두 가지다.
 *   선언 관계(edge)  재료 기록의 relations에 적는다. {type, to, priority, reason, when?, evidence?}
 *   계산 관계(check) 값을 계산해야 알 수 있는 호환성. defineCheck로 정의하고 그래프에 넘긴다(예: 팔레트×서브토큰 대비 게이트)
 *
 * 개별 속성 유효성(id가 등록됐는가, 값이 계약 축 안인가)은 레지스트리·파이프라인 1~3단계가 보고,
 * 조합 유효성(함께 쓸 수 있는가)은 이 파일의 evaluate가 본다. 두 결과는 진단 코드 접두로 구분한다(P_ATTR_* / P_REL_*·P_CHECK_*).
 */
import {CLOSED_PAIRS} from './contract.mjs';

/** 계산 관계. kinds: [종류A, 종류B]. run(a, b, ctx, registry) → {ok, reason, detail?}. 순수 함수여야 한다. */
export function defineCheck({id, kinds, reason, run}) {
  if (!/^[a-z][a-z0-9-]*$/.test(id) || !Array.isArray(kinds) || kinds.length !== 2 || typeof run !== 'function' || !reason) throw new Error('defineCheck: id, kinds[2], reason, run required');
  return Object.freeze({id, kinds: Object.freeze([...kinds]), reason, run});
}

/** 조건은 모두 AND, 값 목록은 OR. 맥락에 그 키가 없으면 조건부 관계는 적용하지 않는다. */
export const edgeApplies = (edge, ctx = {}) => Object.entries(edge.when ?? {}).every(([k, values]) => ctx[k] !== undefined && values.includes(ctx[k]));

const MAX_CACHED_CHECKS = 4096;

export function createRelationGraph(registry, {checks = []} = {}) {
  const all = registry.list().flatMap(m => m.relations.map(e => Object.freeze({from: m.id, ...e})));
  const byFrom = new Map(), byTo = new Map(), byPair = new Map();
  const add = (map, key, edge) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(edge);
  };
  for (const e of all) {
    add(byFrom, e.from, e);
    add(byTo, e.to, e);
    add(byPair, JSON.stringify([e.from, e.to].sort()), e);
  }
  const checkCache = new Map();
  const kindOf = id => registry.get(id)?.kind ?? null;
  const graph = {
    checks: () => [...checks],
    edges: () => [...all],
    /** id에서 나가는 관계. type을 주면 그 종류만. */
    from: (id, {type, ctx} = {}) => (byFrom.get(id) ?? []).filter(e => (!type || e.type === type) && (!ctx || edgeApplies(e, ctx))),
    /** id로 들어오는 관계. */
    to: (id, {type, ctx} = {}) => (byTo.get(id) ?? []).filter(e => (!type || e.type === type) && (!ctx || edgeApplies(e, ctx))),
    /** 두 재료 사이의 관계(양방향). ctx를 주면 조건이 맞는 것만. */
    between: (a, b, ctx) => (byPair.get(JSON.stringify([a, b].sort())) ?? []).filter(e => !ctx || edgeApplies(e, ctx)),

    /** 계산 관계 실행. 두 재료의 종류 쌍에 맞는 check만 돈다. [{check, a, b, ok, reason, detail}] */
    runChecks(a, b, ctx = {}) {
      const cacheKey = JSON.stringify([a, b, ctx]);
      const cached = checkCache.get(cacheKey);
      if (cached) return cached.map(r => ({...r, detail: r.detail === null ? null : structuredClone(r.detail)}));
      const ma = registry.get(a), mb = registry.get(b);
      if (!ma || !mb) return [];
      const result = checks.flatMap(c => {
        const [ka, kb] = c.kinds;
        const pair = ma.kind === ka && mb.kind === kb ? [ma, mb] : ma.kind === kb && mb.kind === ka ? [mb, ma] : null;
        if (!pair) return [];
        const r = c.run(pair[0], pair[1], ctx, registry);
        return [{check: c.id, a: pair[0].id, b: pair[1].id, ok: r.ok, reason: r.ok ? c.reason : r.reason, detail: r.detail ?? null}];
      });
      if (checkCache.size >= MAX_CACHED_CHECKS) checkCache.delete(checkCache.keys().next().value);
      checkCache.set(cacheKey, result);
      return result.map(r => ({...r, detail: r.detail === null ? null : structuredClone(r.detail)}));
    },

    /**
     * 후보 하나를 이미 고른 재료들에 비춰 점수 매긴다(추천용).
     * 반환: {id, score, reasons: [{from, type, priority, reason}], blocked: [{code, reason, with}]}
     */
    score(candidate, selectedIds, ctx = {}) {
      let score = 0; const reasons = [], blocked = [];
      for (const s of selectedIds) {
        for (const e of graph.between(candidate, s, ctx)) {
          if (e.type === 'prefers') { score += e.priority; reasons.push({from: e.from, to: e.to, type: e.type, priority: e.priority, reason: e.reason}); }
          if (e.type === 'avoids') { score -= e.priority; reasons.push({from: e.from, to: e.to, type: e.type, priority: -e.priority, reason: e.reason}); }
          if (e.type === 'forbids') blocked.push({code: 'P_REL_FORBIDS', with: s, reason: e.reason});
        }
        for (const r of graph.runChecks(candidate, s, ctx)) if (!r.ok) blocked.push({code: 'P_CHECK_' + r.check.toUpperCase().replace(/-/g, '_'), with: s, reason: r.reason});
      }
      return {id: candidate, score, reasons, blocked};
    },

    /**
     * 고른 재료 묶음 전체의 조합 유효성. ids: 재료 id 목록.
     * 반환: {ok, violations: [{code, from, to, reason}], applied: [edge], checks: [check 결과]}
     */
    evaluate(ids, ctx = {}) {
      const set = [...new Set(ids)].sort(), violations = [], applied = [], results = [];
      for (const id of set) for (const e of graph.from(id, {ctx})) {
        if (e.type === 'requires') { applied.push(e); if (!set.includes(e.to)) violations.push({code: 'P_REL_REQUIRES', from: id, to: e.to, reason: e.reason}); }
      }
      for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) {
        const [a, b] = [set[i], set[j]];
        const edges = graph.between(a, b, ctx);
        applied.push(...edges.filter(e => e.type !== 'requires'));
        for (const e of edges) if (e.type === 'forbids') violations.push({code: 'P_REL_FORBIDS', from: e.from, to: e.to, reason: e.reason});
        const rs = graph.runChecks(a, b, ctx);
        results.push(...rs);
        for (const r of rs) if (!r.ok) violations.push({code: 'P_CHECK_' + r.check.toUpperCase().replace(/-/g, '_'), from: r.a, to: r.b, reason: r.reason});
        const closed = CLOSED_PAIRS.some(([x, y]) => (kindOf(a) === x && kindOf(b) === y) || (kindOf(a) === y && kindOf(b) === x));
        if (closed && !edges.some(e => e.type === 'compatible') && !rs.some(r => r.ok)) violations.push({code: 'P_REL_CLOSED', from: a, to: b, reason: `${kindOf(a)}·${kindOf(b)} 쌍은 호환 관계(선언 또는 계산)가 있어야 함께 쓴다`});
      }
      return {ok: violations.length === 0, violations, applied, checks: results};
    },
  };
  return graph;
}
