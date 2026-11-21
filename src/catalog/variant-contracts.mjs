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

/** 사용자가 쓴 글·데이터라서 보존 여부로 판정하는 필드(V06). 장식(visual)은 여기 넣지 않는다. */
const CONTENT_FIELDS = new Set(['facts']);

/**
 * 옵션 하나를 적용한 결과(after)가 계약을 어기는지 본다. 위반 목록: [{id, claim, detail}].
 * contentPreserved:true는 호출자가 콘텐츠 지문으로 "글·데이터를 하나도 잃지 않았다"를 이미 증명했다는 뜻이다(src/edit의 relocate 경로).
 * 그러면 콘텐츠 필드의 keeps-field 계약(V06)은 필드가 다른 자리로 옮겨졌을 뿐이므로 걸리지 않는다. 기본값 false는 기존 동작 그대로다.
 */
export function assessOption({before, after, slotId, optionId, templateId = null, neutral = NEUTRAL_OPTIONS, contentPreserved = false}) {
  const key = templateId ? `${templateId}~${slotId}:${optionId}` : null;
  const findings = [];
  for (const c of variantContracts) {
    if (!covers(c, slotId) || (c.check.kind === 'visible-effect' && !key)) continue;
    if (contentPreserved && c.check.kind === 'keeps-field' && CONTENT_FIELDS.has(c.check.field)) continue;
    const {kind, ...params} = c.check, detail = CHECKS[kind](params, {before, after, key, neutral});
    if (detail) findings.push({id: c.id, claim: c.claim, detail});
  }
  return findings;
}

/**
 * 직접 작성한 Blueprint에 적용하는 계약(카탈로그 2.5.0, ADR 0010). 변형 계약(V01~V06)은 "적용 전후 트리"를 비교하므로 템플릿 조립 경로에만 닿았고
 * 사람·AI가 쓴 Blueprint에는 하한이 없었다(표현력 실험 R5). 정적 Blueprint에서 다시 물을 수 있는 것만 옮긴다.
 *
 * 등급은 보고서 5.2절 분류를 따른다. 데이터 보존(V06)은 오류이고, 측정된 품질 결함(V03·V04)은 경고, 취향(V01·V02)은 진단(info)이다.
 * V05(렌더 지문)는 추천 품질 메타라 정적 Blueprint에 의미가 없고, V02는 "카드의 75%를 바꾸는가"가 아니라 "한 격자의 카드 모양이 섞였는가"로만 옮겨진다.
 * 경고는 거부하지 않는다: 의도한 선택일 수 있고, 출력은 그대로다.
 */
export const DIRECT_CONTRACTS = Object.freeze([
  {id: 'V06', severity: 'error', via: 'VARIANT_REQUIRES', note: '히어로 수치(facts)는 split·product 히어로에 둘 수 없다. 이미 검증기가 거부한다(hero.facts). 2.5.0은 메시지에 계약 번호를 단다.'},
  {id: 'V03', severity: 'warning', code: 'CONTRACT_V03', note: '지표 4개 이하만 든 격자가 열이 모자라 두 줄로 꺾인다.'},
  {id: 'V04', severity: 'warning', code: 'CONTRACT_V04', note: '가운데 정렬 머리말 바로 아래 본문이 왼쪽 정렬의 글(prose·list·faq·steps)이다.'},
  {id: 'V01', severity: 'info', code: 'CONTRACT_V01', note: 'split·product 히어로에 visual이 없어 컴파일러가 centered로 그린다(P02).'},
  {id: 'V02', severity: 'info', code: 'CONTRACT_V02', note: '한 격자의 카드 variant가 섞여 있다(한 모양이 75% 미만).'},
].map(Object.freeze));

/** 가운데 머리말 아래에서 왼쪽 정렬로 읽히는 글 부품. 카드·지표 격자는 상자라 정렬선이 둘로 갈리지 않는다. */
const TEXT_BODY = new Set(['prose', 'list', 'faq', 'steps']);

/** 트리 전체를 훑어 [{id, severity, code, path, message}]를 돌려준다. 오류 등급은 여기서 내지 않는다(V06은 노드 검사가 이미 낸다). */
export function assessBlueprintContracts(root) {
  const out = [], push = (id, path, message) => { const c = DIRECT_CONTRACTS.find(x => x.id === id); out.push({id, severity: c.severity, code: c.code, path, message}); };
  const A = Array.isArray, plain = x => x !== null && typeof x === 'object' && !A(x);
  const kids = n => (plain(n) && A(n.children) ? n.children.filter(plain) : []);
  (function walk(n, path) {
    if (!plain(n)) return;
    if (n.type === 'hero' && ['split', 'product'].includes(n.variant) && !n.visual) push('V01', path, `${n.variant} 히어로에 visual이 없어 centered 텍스트형으로 그려집니다. 의도한 모양이면 variant를 centered·statement로 선언하세요.`);
    if (n.type === 'grid' && A(n.children) && n.children.length >= 2 && n.children.length <= 4 && n.children.every(c => plain(c) && c.type === 'metric') && COLS[n.columns] < n.children.length)
      push('V03', path, `지표 ${n.children.length}개가 ${COLS[n.columns]}열이라 ${Math.ceil(n.children.length / COLS[n.columns])}줄로 꺾입니다. 4개 이하의 핵심 지표는 한 줄에 읽히게 columns를 ${n.children.length === 2 ? 'two' : n.children.length === 3 ? 'three' : 'four'}로 하세요.`);
    if (n.type === 'grid' && A(n.children)) {
      const cards = n.children.filter(c => plain(c) && c.type === 'card');
      if (cards.length >= 3) {
        const shares = {}; for (const c of cards) shares[c.variant ?? 'basic'] = (shares[c.variant ?? 'basic'] ?? 0) + 1;
        if (Math.max(...Object.values(shares)) / cards.length < 0.75) push('V02', path, `카드 ${cards.length}개의 variant가 ${Object.keys(shares).join('·')}로 섞여 있습니다. 한 격자의 카드는 한 모양이 읽기 쉽습니다.`);
      }
    }
    kids(n).forEach((c, i) => walk(c, `${path}.children[${n.children.indexOf(c)}]`));
  })(root, '$.tree');
  // V04: 가운데 머리말 아래 본문이 글이면 정렬선이 둘이다. 히어로·상태 화면 바로 위에서 접히는 페이지 제목은 보이지 않으므로 제외한다(렌더러 leadOf).
  const top = kids(root);
  top.forEach(n => {
    const at = `$.tree.children[${root.children.indexOf(n)}]`;
    if (n.type === 'section' && n.align === 'center') { const first = kids(n)[0]; if (first && TEXT_BODY.has(first.type)) push('V04', at, `머리말은 가운데인데 첫 본문(${first.type})은 왼쪽 정렬로 읽힙니다. 섹션 align을 start로 하거나 본문을 가운데로 읽히는 부품(logo-cloud·empty-state)으로 하세요.`); }
    if (n.type === 'page-header' && n.align === 'center') {
      const next = top[top.indexOf(n) + 1];
      if (next && !['hero', 'empty-state'].includes(next.type) && (TEXT_BODY.has(next.type) || (next.type === 'section' && next.align !== 'center' && TEXT_BODY.has(kids(next)[0]?.type)))) push('V04', at, `페이지 제목은 가운데인데 첫 본문(${next.type})은 왼쪽 정렬로 읽힙니다.`);
    }
  });
  return out;
}
