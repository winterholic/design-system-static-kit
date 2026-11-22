/**
 * 축 값 재료와 금지 관계(ADR 0012 §5, 계약 0.2.0). 기존 규칙을 `forbids` 관계로 옮긴다.
 *
 * - 축 조합 금지 X01~X11(src/catalog/axes.mjs `axisBans`)은 술어(predicate)다. 두 축의 모든 값 쌍에 술어를 돌려 걸리는 쌍마다
 *   `axis-value:<축>.<값>` 사이에 forbids 관계를 만든다. 이유(reason)는 기존 `why` 문장 그대로이고 규칙 id를 앞에 붙인다.
 * - 테마 금지(`themes[id].forbid`)는 그 테마에서 온 스타일 맥락이 해당 축 값에 대해 선언하는 forbids 관계가 된다.
 *   테마 원본을 읽으므로 스타일 맥락 기록이 모양 축만 옮겼더라도 ornament·backdrop·mode 금지가 빠지지 않는다.
 * - 개별 값은 유효해도 조합이 금지인 경우는 조립에서 `P_REL_FORBIDS`로 나오고, 어느 규칙이 어떤 출처의 값(요구·템플릿 기본·패밀리 모양)에 걸렸는지 설명한다.
 *
 * 이 파일은 계산만 한다. 규칙 원본은 카탈로그에 그대로 있고 2.1~2.6 출력은 바뀌지 않는다.
 */
import {axes, axisBans} from '../catalog/axes.mjs';
import {themes} from '../catalog/themes.mjs';
import {definePlatformMaterial, axisValueId} from './contract.mjs';

/** 두 축의 모든 값 쌍 중 금지 술어에 걸리는 것. [{ban, a: [축, 값], b: [축, 값]}] — 결정적(축 순서, 값 순서). */
export function banPairs() {
  const out = [];
  for (const ban of axisBans) {
    const [x, y] = ban.uses;
    for (const vx of axes[x]) for (const vy of axes[y]) if (ban.bad({[x]: vx, [y]: vy})) out.push({ban, a: [x, vx], b: [y, vy]});
  }
  return out;
}

/** 축 값 재료 전체. 금지 관계는 걸리는 쌍의 앞 값(축 순서가 앞선 쪽)이 선언한다(양방향으로 읽으므로 한 번이면 충분하다). */
export function buildAxisValues() {
  const edges = new Map();
  for (const {ban, a, b} of banPairs()) {
    const from = axisValueId(...a), to = axisValueId(...b);
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from).push({type: 'forbids', to, priority: 100, reason: `${ban.id}: ${ban.why}`, evidence: `${ban.id} ${ban.source}`});
  }
  return Object.freeze(Object.entries(axes).flatMap(([axis, values]) => values.map(value => definePlatformMaterial({
    id: axisValueId(axis, value), kind: 'axis-value', label: `${axis}=${value}`, axis, value,
    relations: edges.get(axisValueId(axis, value)) ?? [], tags: ['axis', axis],
    quality: {status: 'implemented', evidence: []}, reuses: [`axis:${axis}`],
  }))));
}

/** 스타일 맥락이 금지하는 축 값 → forbids 관계. 기록의 forbid와 원본 테마의 forbid를 합친다(중복 제거). */
export function styleForbidRelations(context) {
  const forbid = {};
  const theme = context.reuses.map(r => /^theme:(.+)$/.exec(r)?.[1]).filter(Boolean).map(id => themes[id]).find(Boolean);
  for (const src of [theme?.forbid ?? {}, context.forbid ?? {}]) for (const [axis, values] of Object.entries(src)) forbid[axis] = [...new Set([...(forbid[axis] ?? []), ...values])];
  const out = [];
  for (const [axis, values] of Object.entries(forbid)) {
    if (!axes[axis]) continue;
    for (const v of values) if (axes[axis].includes(v)) out.push({type: 'forbids', to: axisValueId(axis, v), priority: 100, reason: `${context.label}는 ${axis}=${v}를 금지한다(테마 forbid)`, evidence: `theme-forbid ${context.id}`});
  }
  return out;
}

/** 스타일 맥락 기록에 금지 관계를 더한 사본. 이미 같은 관계가 있으면 더하지 않는다(멱등). */
export function withStyleForbids(context) {
  if (context.kind !== 'style-context') return context;
  const have = new Set(context.relations.map(e => `${e.type}|${e.to}`));
  const added = styleForbidRelations(context).filter(e => !have.has(`${e.type}|${e.to}`));
  return added.length ? {...context, relations: [...context.relations, ...added]} : context;
}

/** {축: 값} → 축 값 재료 id 목록(정렬). 알 수 없는 축·값은 건너뛴다(개별 속성 유효성은 계획 단계가 보고한다). */
export const axisIds = values => Object.entries(values).filter(([a, v]) => axes[a]?.includes(v)).map(([a, v]) => axisValueId(a, v)).sort();

const SHAPE_AXES = ['radius', 'elevation', 'motion'];

/**
 * 재료가 가진 축 값 id(상태 패턴의 density는 어울리는 밀도의 힌트라 축 금지를 걸지 않는다: 순위에서만 읽는다).
 *  패밀리는 모양(radius·elevation·motion), 타이포 시스템은 서체 짝의 typography 값이다.
 * 이 id들이 관계 평가에 함께 들어가므로 "패밀리 모양 × 요구한 배경"처럼 재료 밖의 조합도 forbids에 걸린다.
 */
export function materialAxisIds(m) {
  if (!m) return [];
  if (m.kind === 'family') return axisIds(Object.fromEntries(SHAPE_AXES.filter(a => m.shape?.[a] !== undefined).map(a => [a, m.shape[a]])));
  if (['surface', 'motion', 'background', 'media'].includes(m.kind)) return axisIds(m.axes ?? {});
  if (m.kind === 'type-system') { const face = /^type-preset:(.+)$/.exec(m.facePairing ?? '')?.[1]; return face ? axisIds({typography: face}) : []; }
  return [];
}
