/**
 * 구성 변형의 결과 계약. 변형 함수(variants.mjs)는 값을 치환할 뿐이라 바뀐 뒤 화면의 의미(시각 요소 유지, 형제 전체 변경, 한 줄 KPI,
 * 한 정렬축)를 보지 못했다(docs/quality-diagnosis-2026-11-21.md 원인 2). 계약은 "옵션 적용 전후 트리"를 입력으로 받아 위반 사유를 돌려주는
 * 작은 검사의 이름표와 인자다. 검사 종류는 아래 CHECKS 한 곳에 닫혀 있고 자유 표현식·사용자 입력은 받지 않는다.
 *
 * 효과는 하나뿐이다: `not-recommended`. 옵션을 지우지 않는다. 위반한 옵션은 목록에 남고(조합 id·URL·표본 보존), 기본 추천과 갤러리의 기본 목록에서만
 * 빠진다(`recommended:false`, 조합은 `experimental`). 명시적으로 고르면 예전 그대로 적용된다.
 */
import {NEUTRAL_OPTIONS} from './variant-effects.mjs';

const walk = (nodes, fn) => { for (const n of nodes ?? []) { fn(n); walk(n.children, fn); } };
const find = (tree, type) => { const out = []; walk(tree, n => { if (n.type === type) out.push(n); }); return out; };
const topSections = tree => tree.filter(n => n.type === 'section');
const COLS = {two: 2, three: 3, four: 4};

/** 스스로 가운데 정렬로 그려지는 부품(src/styles: .kit-logos·.kit-empty). 가운데 머리말 아래에서 정렬축이 갈리지 않는 유일한 본문이다. */
const SELF_CENTERED = new Set(['logo-cloud', 'empty-state']);
const centeredBody = node => (node.children ?? []).length > 0 && node.children.every(c => SELF_CENTERED.has(c.type) || (c.type === 'section' && c.align === 'center' && centeredBody(c)));

/** 검사: (인자, 전후 트리, 맥락) → 위반이면 사유 문자열, 통과면 null. */
const CHECKS = {
  /** 전에 있던 필드가 후에도 있다. */
  'keeps-field': ({node, field}, {before, after}) => {
    const b = find(before, node)[0], a = find(after, node)[0];
    return b?.[field] && !a?.[field] ? `${node}.${field}=${Array.isArray(b[field]) ? b[field].length + '개 항목' : b[field]}가 사라진다` : null;
  },
  /** 같은 종류 노드 중 variant가 실제로 바뀐 비율이 min 이상이다(전체 변경을 기대하게 하는 옵션은 형제를 빠뜨리지 않는다). */
  'changed-ratio': ({node, field, fallback, min}, {before, after}) => {
    const a = find(before, node), b = find(after, node);
    if (!a.length || a.length !== b.length) return null;
    const changed = a.filter((n, i) => (n[field] ?? fallback) !== (b[i][field] ?? fallback)).length, ratio = changed / a.length;
    return ratio < min ? `${node} ${a.length}개 중 ${changed}개만 바뀐다(${Math.round(ratio * 100)}% < ${Math.round(min * 100)}%)` : null;
  },
  /** 지표만 든 짧은 격자(maxItems 이하)는 한 줄에 놓인다. 열 수가 줄어 두 줄이 되면 위반이다. */
  'single-row': ({maxItems}, {before, after}) => {
    const a = find(before, 'grid'), b = find(after, 'grid');
    if (a.length !== b.length) return null;
    const hit = b.findIndex((g, i) => g.children.length >= 2 && g.children.length <= maxItems && g.children.every(c => c.type === 'metric') && g.columns !== a[i].columns && COLS[g.columns] < g.children.length);
    return hit < 0 ? null : `지표 ${b[hit].children.length}개가 ${COLS[b[hit].columns]}열이 되어 ${Math.ceil(b[hit].children.length / COLS[b[hit].columns])}줄로 꺾인다`;
  },
  /** 새로 가운데가 된 머리말 아래 본문이 가운데 정렬로 따라오지 못하면 정렬축이 둘로 갈린다. */
  'one-axis': (_, {before, after}) => {
    const sectionsBefore = topSections(before), sectionsAfter = topSections(after);
    const bad = sectionsAfter.filter((s, i) => s.align === 'center' && sectionsBefore[i]?.align !== 'center' && !centeredBody(s)).length;
    if (bad) return `머리말 ${bad}곳만 가운데로 바뀌고 본문은 왼쪽 정렬이다`;
    const hb = before.find(n => n.type === 'page-header'), ha = after.find(n => n.type === 'page-header');
    // 히어로·상태 화면 바로 위의 페이지 제목은 렌더러가 접어 숨긴다(src/render/nodes.mjs leadOf). 보이지 않는 정렬은 정렬선을 가르지 않는다.
    const folded = ['hero', 'empty-state'].includes(after[after.indexOf(ha) + 1]?.type);
    if (ha?.align === 'center' && hb?.align !== 'center' && !folded) {
      const next = after.find(n => n !== ha);
      const aligned = !next || (next.type === 'hero' && next.variant === 'centered') || SELF_CENTERED.has(next.type) || (next.type === 'section' && next.align === 'center' && centeredBody(next));
      if (!aligned) return `페이지 제목만 가운데로 바뀌고 첫 본문(${next.type})은 왼쪽 정렬이다`;
    }
    return null;
  },
  /** 브라우저로 잰 렌더 지문이 적용 전후 같다(scripts/design-qa/variant-effects.mjs가 만든 src/catalog/variant-effects.mjs). */
  'visible-effect': (_, {key, neutral}) => {
    const m = neutral[key];
    return m ? `렌더 결과가 ${m.widths.join('·')}px에서 기본 구성과 같다` : null;
  },
};
export const variantCheckKinds = Object.freeze(Object.keys(CHECKS));

export const variantContracts = [
  {id: 'V01', claim: 'Q14', slots: ['hero'], check: {kind: 'keeps-field', node: 'hero', field: 'visual'}, effect: 'not-recommended',
    why: '히어로 형태를 바꾸며 제품 시각 요소(visual)를 지우면 첫 화면에서 제품 증명이 사라지고 SaaS와 무관한 장식이 남는다(진단 B1, 1,314개 조합).',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B1'},
  {id: 'V02', claim: 'Q15', slots: ['cards'], check: {kind: 'changed-ratio', node: 'card', field: 'variant', fallback: 'basic', min: 0.75}, effect: 'not-recommended',
    why: '카드 스타일 일괄 변경이 카드의 75% 미만만 바꾸면 사용자가 기대한 "일괄"이 템플릿 데이터에 따라 반쪽만 적용된다(진단 B2, 488개 조합).',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B2'},
  {id: 'V03', claim: 'Q11', slots: ['columns'], check: {kind: 'single-row', maxItems: 4}, effect: 'not-recommended',
    why: '핵심 지표 4개 이하는 한 줄에 읽혀야 한다. 열 수 변형이 이를 두 줄로 꺾으면 첫 차트가 아래로 밀린다(진단 B3).',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B3'},
  {id: 'V04', claim: 'Q12', slots: ['heads', 'intro'], check: {kind: 'one-axis'}, effect: 'not-recommended',
    why: '머리말만 가운데로 옮기고 본문이 왼쪽에 남으면 한 페이지에 정렬선이 둘이 된다(진단 B4). 본문이 스스로 가운데 정렬인 부품만 든 구역은 통과한다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B4'},
  {id: 'V05', claim: null, slots: '*', check: {kind: 'visible-effect'}, effect: 'not-recommended',
    why: '적용 전후 렌더 지문(요소 위치·크기·색)이 같으면 사용자에게는 고를 이유가 없는 옵션이다. 지우지 않고 추천에서만 뺀다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 6절 원인 2 추가 후보'},
  {id: 'V06', claim: null, slots: ['hero'], check: {kind: 'keeps-field', node: 'hero', field: 'facts'}, effect: 'not-recommended',
    why: '히어로 형태를 split·product로 바꾸면 setHero가 히어로 수치(facts)를 지워 사용자 문구가 사라진다(waitlist: 대기 중인 사람·평균 초대 시간·베타 만족도). 디자인 변경이 콘텐츠 손실이 되어서는 안 된다. 수치를 가질 수 있는 형태(statement·cover·centered)로의 변경은 통과한다.',
    source: 'docs/recipes.md 5.4절'},
];

const covers = (contract, slotId) => contract.slots === '*' || contract.slots.includes(slotId);

/** 옵션 하나를 적용한 결과(after)가 계약을 어기는지 본다. 위반 목록: [{id, claim, detail}]. */
export function assessOption({before, after, slotId, optionId, templateId = null, neutral = NEUTRAL_OPTIONS}) {
  const key = templateId ? `${templateId}~${slotId}:${optionId}` : null;
  const findings = [];
  for (const c of variantContracts) {
    if (!covers(c, slotId) || (c.check.kind === 'visible-effect' && !key)) continue;
    const {kind, ...params} = c.check, detail = CHECKS[kind](params, {before, after, key, neutral});
    if (detail) findings.push({id: c.id, claim: c.claim, detail});
  }
  return findings;
}
