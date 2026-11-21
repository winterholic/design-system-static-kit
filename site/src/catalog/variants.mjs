/**
 * 구성 변형(layout slots): 같은 템플릿을 다른 짜임으로 쓰는 선택지.
 * 슬롯마다 고를 수 있는 옵션이 있고, 옵션은 템플릿 트리를 순수 함수로 고쳐 돌려준다. 새 속성이나 스타일을 만들지 않고
 * 카탈로그가 이미 허용한 값(히어로 변형, 카드 변형, 섹션 표면 …)만 바꾸므로 결과는 평소와 같은 검증을 통과해야 한다.
 * 슬롯은 "바꿀 대상이 있고 바꾸면 달라지는 경우"에만 템플릿에 나타난다(layoutSlots).
 */
import {assessOption} from './variant-contracts.mjs';

/**
 * 옵션이 값을 지울 수 있는지에 대한 맥락. 옵션 함수는 (tree, ctx)를 받는다.
 *   LEGACY(기본): 템플릿 합성 경로. 변형이 허용하지 않는 히어로 필드를 지운다(2.x 출력 hash가 이 동작에 고정). 지운 것은 ctx.report에 기록된다.
 *   편집 경로(applyLayoutChecked): 콘텐츠는 지우지 않는다. 히어로 facts는 거부하거나 지표 격자로 옮기고, 장식(visual·motif)만 지우며 기록한다.
 */
const LEGACY = Object.freeze({lossy: true});
/** 옵션이 콘텐츠를 둘 곳이 없어 적용을 거부할 때 던진다(편집 경로에서만). */
class LayoutRefusal extends Error { constructor(detail) { super(detail.message); this.detail = detail; } }
/** n개를 cols열에 놓았을 때 마지막 줄이 가득 차거나 두 칸 이상이어야 한다. */
const fitsColumns = (n, cols) => n >= cols && (n % cols === 0 || n % cols >= 2);
const walk = (nodes, fn, parent = null) => { for (const n of nodes) { fn(n, parent); if (n.children) walk(n.children, fn, n); } };
const find = (nodes, type) => { const out = []; walk(nodes, n => { if (n.type === type) out.push(n); }); return out; };
const topSections = tree => tree.filter(n => n.type === 'section');

/** 가운데 정렬 머리말이 어울리는 페이지 유형. 본문이 왼쪽 정렬인 앱·문서·데이터 화면에서는 제목만 가운데 서서 정렬선이 둘로 갈린다. */
const CENTERED_OK = ['landing', 'portfolio', 'pricing', 'article', 'blog', 'form', 'general'];
const MARKETING_PAGES = ['landing', 'pricing', 'portfolio', 'general'];
const HERO_FEEL = {
  split: {label: '좌우 분할', description: '글과 시각 요소를 나란히'},
  product: {label: '제품 목업', description: '제품 화면을 크게 보여 주는 구도'},
  centered: {label: '가운데 정렬', description: '한 줄 약속을 가운데에 모으는 구도'},
  statement: {label: '큰 문장', description: '큰 제목 한 덩어리로 시작'},
  cover: {label: '커버', description: '화면 폭을 채우는 표지형'},
};
const FACTS_VARIANTS = ['statement', 'cover', 'centered'], VISUAL_VARIANTS = ['split', 'product'];
const COLUMN_WORD = {2: 'two', 3: 'three', 4: 'four'};
/**
 * 히어로 변형을 바꾼다. 변형이 허용하지 않는 필드는 성격이 다르다.
 *   장식: visual·motif(그림 종류). 다른 변형에서는 그릴 곳이 없으므로 지우고 기록한다.
 *   콘텐츠: facts(값과 라벨 글). 지우지 않는다. 편집 경로는 거부하거나(contentPolicy 'reject') 히어로 바로 아래 지표 격자로 옮긴다('relocate').
 *     facts는 검증기가 split·product에서 거부하므로 문서에 그대로 둘 수 없다(검증 완화 없음).
 */
const setHero = variant => (tree, ctx = LEGACY) => {
  const [hero] = find(tree, 'hero'); if (!hero || hero.variant === variant) return false;
  const at = tree.indexOf(hero), path = `$.tree.children[${at}]`, note = r => ctx.report?.push(r);
  const keepsVisual = VISUAL_VARIANTS.includes(variant), keepsFacts = FACTS_VARIANTS.includes(variant);
  if (hero.facts && !keepsFacts && !ctx.lossy) {
    if (ctx.contentPolicy !== 'relocate' || at < 0) throw new LayoutRefusal({code: 'LAYOUT_WOULD_DROP_CONTENT', path: path + '.facts', message: `히어로를 ${variant}로 바꾸면 facts ${hero.facts.length}개(${hero.facts.map(f => f.value + ' ' + f.label).join(' · ')})를 둘 곳이 없습니다.`, hint: "contentPolicy:'relocate'로 facts를 히어로 아래 지표 격자로 옮기거나, updateNode로 facts를 먼저 정리하세요."});
    tree.splice(at + 1, 0, {type: 'grid', columns: COLUMN_WORD[hero.facts.length], children: hero.facts.map(f => ({type: 'metric', label: f.label, value: f.value}))});
    note({code: 'CONTENT_RELOCATED', path: path + '.facts', to: `$.tree.children[${at + 1}]`, count: hero.facts.length});
    delete hero.facts;
  }
  hero.variant = variant;
  if (!keepsVisual) for (const field of ['visual', 'motif']) if (hero[field] !== undefined) { note({code: 'DECORATION_DROPPED', path: `${path}.${field}`, field, dropped: hero[field], kind: 'decoration'}); delete hero[field]; }
  if (keepsVisual && !hero.visual) hero.visual = variant === 'product' ? 'device' : 'ornament';
  if (!keepsFacts && hero.facts) { note({code: 'CONTENT_DROPPED', path: path + '.facts', field: 'facts', dropped: hero.facts, kind: 'content'}); delete hero.facts; }
  return true;
};

const cycle = (type, field, values, {skip = () => false} = {}) => value => tree => {
  let changed = false;
  for (const n of find(tree, type)) if (!skip(n) && (n[field] ?? values[0]) !== value) { n[field] = value; changed = true; }
  return changed;
};

const cardsAs = variant => tree => {
  let changed = false;
  for (const n of find(tree, 'card')) if ((n.variant ?? 'basic') === 'basic') { n.variant = variant; changed = true; }
  return changed;
};

const SLOTS = [
  {id: 'hero', label: '히어로', when: tree => find(tree, 'hero').length === 1,
    options: Object.entries(HERO_FEEL).map(([id, o]) => ({id, ...o, apply: setHero(id)}))},
  {id: 'intro', label: '페이지 머리말', pages: CENTERED_OK, when: tree => { const h = tree.find(n => n.type === 'page-header'); return !!h && !h.stats && h.align !== 'center'; },
    options: [{id: 'center', label: '가운데 정렬', description: '제목을 가운데에 놓는 머리말', apply: tree => { const h = tree.find(n => n.type === 'page-header'); if (!h || h.stats) return false; h.align = 'center'; return true; }}]},
  {id: 'features', label: '기능 배열', when: tree => find(tree, 'bento').length > 0,
    options: [
      // 지표·인용·진행률이 섞인 벤토를 같은 높이 격자에 넣으면 짧은 칸 아래가 텅 빈다(6차 진단 EMPTY_CELL 80%). 같은 종류의 카드만 격자로 바꾼다.
      {id: 'grid', label: '균등 격자', description: '벤토 칸을 같은 크기의 격자로', apply: tree => {
        let changed = false;
        walk(tree, (n, parent) => {
          if (n.type !== 'bento' || !parent?.children || !n.children.every(c => c.type === 'card')) return;
          const withArt = n.children.filter(c => c.visual).length; if (withArt && withArt < n.children.length) return;
          n.type = 'grid'; n.columns = n.children.length === 4 ? 'two' : 'three'; changed = true;
        });
        return changed;
      }},
      {id: 'reel', label: '가로 줄', description: '카드를 가로로 넘겨 보는 줄', apply: tree => {
        let changed = false;
        walk(tree, (n, parent) => { if (n.type === 'bento' && parent?.children && n.children.every(c => c.type === 'card') && n.children.length >= 3) { n.type = 'reel'; delete n.columns; changed = true; } });
        return changed;
      }},
    ]},
  {id: 'columns', label: '격자 열 수', when: tree => find(tree, 'grid').some(g => g.children.length >= 2),
    // 항목 수와 맞지 않는 열 수(3개를 2열, 5개를 4열)는 마지막 줄에 한 칸만 남기므로 고르지 못하게 한다(src/layout.mjs).
    options: ['two', 'three', 'four'].map(c => ({id: c, label: {two: '2열', three: '3열', four: '4열'}[c], description: {two: '넓고 여유 있게', three: '균형 잡힌 3열', four: '촘촘하게'}[c], apply: cycle('grid', 'columns', ['two', 'three', 'four'], {skip: g => !fitsColumns(g.children.length, {two: 2, three: 3, four: 4}[c])})(c)}))},
  {id: 'cards', label: '카드 스타일', when: tree => find(tree, 'card').some(c => (c.variant ?? 'basic') === 'basic'),
    options: [{id: 'outline', label: '굵은 테두리', description: '테두리로 구분하는 카드', apply: cardsAs('outline')}, {id: 'filled', label: '색면', description: '바탕색으로 구분하는 카드', apply: cardsAs('filled')}]},
  {id: 'data', label: '표·목록', when: tree => find(tree, 'table').length + find(tree, 'list').length > 0,
    options: [
      {id: 'striped', label: '줄무늬', description: '줄무늬 표와 구분선 목록', apply: tree => { let c = false; for (const t of find(tree, 'table')) if ((t.variant ?? 'plain') !== 'striped') { t.variant = 'striped'; c = true; } for (const l of find(tree, 'list')) if ((l.variant ?? 'divided') !== 'divided') { l.variant = 'divided'; c = true; } return c; }},
      {id: 'bordered', label: '칸 나눔', description: '칸이 보이는 표와 카드 목록', apply: tree => { let c = false; for (const t of find(tree, 'table')) if (t.variant !== 'bordered') { t.variant = 'bordered'; c = true; } for (const l of find(tree, 'list')) if (l.variant !== 'card') { l.variant = 'card'; c = true; } return c; }},
    ]},
  {id: 'rhythm', label: '구역 리듬', when: tree => topSections(tree).length >= 3,
    options: [
      {id: 'banded', label: '띠 구분', description: '한 구역씩 건너 색을 입혀 리듬을 만듭니다', apply: tree => {
        let c = false; topSections(tree).forEach((s, i) => { if (i % 2 === 1 && (s.surface ?? 'plain') === 'plain' && !find(s.children, 'section').some(x => (x.surface ?? 'plain') !== 'plain')) { s.surface = 'tint'; c = true; } });
        return c;
      }},
      {id: 'open', label: '모두 열린 면', description: '색 구역 없이 한 면으로 이어 읽습니다', apply: tree => { let c = false; for (const s of topSections(tree)) if ((s.surface ?? 'plain') !== 'plain') { s.surface = 'plain'; c = true; } return c; }},
    ]},
  {id: 'order', label: '순서', when: tree => { const i = tree.findIndex(n => n.type === 'hero' || n.type === 'page-header'); return proofIndex(tree) > i + 2; },
    options: [{id: 'proof-first', label: '신뢰 먼저', description: '후기·고객사를 앞으로 당깁니다', apply: tree => {
      const from = proofIndex(tree), at = tree.findIndex(n => n.type === 'hero') >= 0 ? 2 : 1;
      if (from <= at) return false; const [node] = tree.splice(from, 1); tree.splice(at, 0, node); return true;
    }}]},
  {id: 'split', label: '좌우 배치', when: tree => find(tree, 'split').length + find(tree, 'aside').length > 0,
    options: [{id: 'mirror', label: '좌우 바꿈', description: '2분할·보조 영역의 방향을 뒤집습니다', apply: tree => {
      let c = false;
      for (const s of find(tree, 'split')) { s.reverse = s.reverse === 'reverse' ? 'normal' : 'reverse'; c = true; }
      for (const a of find(tree, 'aside')) { a.side = a.side === 'start' ? 'end' : 'start'; c = true; }
      return c;
    }}]},
  {id: 'tabs', label: '탭 모양', when: tree => find(tree, 'tabs').length > 0,
    options: ['underline', 'pill', 'boxed'].map(v => ({id: v, label: {underline: '밑줄', pill: '알약', boxed: '상자'}[v], description: {underline: '가벼운 밑줄 탭', pill: '채운 알약 탭', boxed: '상자형 탭'}[v], apply: cycle('tabs', 'variant', ['underline', 'pill', 'boxed'])(v)}))},
  {id: 'steps', label: '단계 방향', when: tree => find(tree, 'steps').length > 0,
    options: ['vertical', 'horizontal', 'cards'].map(v => ({id: v, label: {vertical: '세로', horizontal: '가로', cards: '카드'}[v], description: {vertical: '위에서 아래로 따라가기', horizontal: '왼쪽에서 오른쪽으로 따라가기', cards: '단계마다 카드 한 장'}[v], pages: v === 'cards' ? MARKETING_PAGES : undefined, apply: cycle('steps', 'layout', ['vertical', 'horizontal', 'cards'])(v)}))},
  {id: 'timeline', label: '타임라인 모양', when: tree => find(tree, 'timeline').length > 0,
    options: ['line', 'rail', 'log', 'release'].map(v => ({id: v, label: {line: '점과 선', rail: '넓은 레일', log: '로그', release: '릴리스 노트'}[v], description: {line: '점을 잇는 세로선', rail: '왼쪽 레일에 날짜', log: '시각이 앞에 오는 한 줄 기록', release: '버전별 변경 묶음'}[v],
      apply: tree => { let c = false; for (const t of find(tree, 'timeline')) { if ((t.variant ?? 'line') === v) continue; const plain = t.items.every(x => !('changes' in x) && !('date' in x)); if (v === 'release' && plain) continue; if (v !== 'release' && !plain) continue; t.variant = v; c = true; } return c; }}))},
  {id: 'notice', label: '알림 모양', when: tree => find(tree, 'notice').length > 0,
    options: ['banner', 'toast'].map(v => ({id: v, label: v === 'banner' ? '배너' : '떠 있는 카드', description: v === 'banner' ? '폭을 채우는 띠' : '모서리에 띄운 알림', apply: cycle('notice', 'variant', ['inline', 'banner', 'toast'])(v)}))},
  {id: 'tags', label: '태그 모양', when: tree => find(tree, 'tags').length > 0,
    options: ['badges', 'outline'].map(v => ({id: v, label: v === 'badges' ? '배지' : '윤곽', description: v === 'badges' ? '작은 채움 배지' : '테두리만 있는 태그', apply: cycle('tags', 'variant', ['chips', 'badges', 'outline'])(v)}))},
  {id: 'gallery', label: '갤러리 배열', when: tree => find(tree, 'gallery').length > 0,
    options: ['grid', 'masonry', 'showcase'].map(v => ({id: v, label: {grid: '균일 격자', masonry: '벽돌', showcase: '쇼케이스'}[v], description: {grid: '같은 크기로 정렬', masonry: '높이가 다른 벽돌 쌓기', showcase: '하나를 크게, 나머지를 작게'}[v], apply: cycle('gallery', 'layout', ['grid', 'masonry', 'showcase'])(v)}))},
  {id: 'menu', label: '메뉴판 배열', when: tree => find(tree, 'menu').length > 0,
    options: ['leader', 'grid', 'plain'].map(v => ({id: v, label: {leader: '점선 가격', grid: '2열 격자', plain: '단순 목록'}[v], description: {leader: '이름과 가격을 점선으로 잇기', grid: '카드처럼 나눈 2열', plain: '장식 없는 목록'}[v], apply: cycle('menu', 'layout', ['leader', 'grid', 'plain'])(v)}))},
  {id: 'heads', label: '섹션 머리말', pages: MARKETING_PAGES, when: tree => topSections(tree).length >= 2 && topSections(tree).some(x => x.title),
    options: [{id: 'center', label: '가운데 정렬', description: '섹션 제목과 설명을 가운데에 모읍니다', apply: tree => { let c = false; for (const x of topSections(tree)) if (x.align !== 'center') { x.align = 'center'; c = true; } return c; }}]},
  {id: 'faq', label: '질문 배치', pages: MARKETING_PAGES, when: tree => find(tree, 'faq').length > 0,
    options: [{id: 'split', label: '좌우 분할', description: '제목은 왼쪽에 두고 질문 목록을 오른쪽에 둡니다', apply: tree => {
      let c = false; walk(tree, (n, parent) => { if (n.type === 'faq' && parent?.type === 'section' && n.layout !== 'split') { n.layout = 'split'; parent.align = 'start'; c = true; } }); return c;
    }}]},
];

function proofIndex(tree) {
  return tree.findIndex(n => n.type === 'logo-cloud' || (n.type === 'section' && n.children.some(c => c.type === 'quote' || c.type === 'reviews' || (c.type === 'grid' && c.children.some(x => x.type === 'quote')))));
}

/** 옵션 하나를 새 복사본에 적용해 바뀐 트리를 돌려준다. 바뀌지 않으면 null. */
function tryOption(tree, slot, option, pageType, ctx = LEGACY) {
  // 페이지 유형에 맞지 않는 구성은 만들지 않는다: 대시보드·문서·설정 화면의 가운데 정렬 머리말처럼, 6차 진단에서 조합 절반을 차지하던 어색한 구성을 없앤다.
  const pages = option.pages ?? slot.pages;
  if (pageType && pages && !pages.includes(pageType)) return null;
  const copy = structuredClone(tree);
  if (!slot.when(copy)) return null;
  return option.apply(copy, ctx) ? copy : null;
}

/** tryOption과 같되 null인 이유를 돌려준다: 'PAGE_TYPE'(이 페이지 유형에서 쓰지 않는 옵션) | 'NOT_PRESENT'(바꿀 대상이 없음) | 'NO_CHANGE'(이미 그 상태). */
function tryOptionDetailed(tree, slot, option, pageType, ctx) {
  const pages = option.pages ?? slot.pages;
  if (pageType && pages && !pages.includes(pageType)) return {reason: 'PAGE_TYPE'};
  const copy = structuredClone(tree);
  if (!slot.when(copy)) return {reason: 'NOT_PRESENT'};
  return option.apply(copy, ctx) ? {tree: copy} : {reason: 'NO_CHANGE'};
}

/**
 * 템플릿 트리에서 실제로 선택지가 있는 슬롯: [{id, label, options:[{id,label,description,recommended,rules}]}].
 * `rules`는 결과 계약(variant-contracts.mjs)을 어긴 사유 [{id, claim, detail}], `recommended`는 `rules`가 비었는지다. 옵션은 지우지 않는다.
 * ctx.templateId가 있으면 렌더 지문 계약(V05)도 본다. ctx.neutral로 측정 데이터를 바꿔 끼울 수 있다(시험용).
 */
export function layoutSlots(tree, pageType, ctx = {}) {
  return SLOTS.map(slot => ({id: slot.id, label: slot.label, options: slot.options.flatMap(o => {
    const after = tryOption(tree, slot, o, pageType); if (!after) return [];
    const rules = assessOption({before: tree, after, slotId: slot.id, optionId: o.id, templateId: ctx.templateId, ...(ctx.neutral ? {neutral: ctx.neutral} : {})});
    return [{id: o.id, label: o.label, description: o.description, recommended: !rules.length, rules}];
  })})).filter(s => s.options.length);
}

/** {slot: option} 선택의 추천 여부와 근거. 옵션마다 템플릿 기본 트리에 단독 적용한 결과를 계약에 대조한다. 적용되지 않는 선택은 건너뛴다. */
export function assessLayout(tree, choice = {}, pageType, ctx = {}) {
  const findings = [];
  for (const [slotId, optionId] of Object.entries(choice)) {
    if (!optionId || optionId === 'default') continue;
    const slot = SLOTS.find(s => s.id === slotId), option = slot?.options.find(o => o.id === optionId);
    if (!slot || !option) throw new Error('Unknown layout choice: ' + slotId + '=' + optionId);
    const after = tryOption(tree, slot, option, pageType); if (!after) continue;
    for (const r of assessOption({before: tree, after, slotId, optionId, templateId: ctx.templateId, ...(ctx.neutral ? {neutral: ctx.neutral} : {})})) findings.push({slot: slotId, option: optionId, rule: r.id, claim: r.claim, detail: r.detail});
  }
  return {recommended: findings.length === 0, findings};
}

const unknownChoice = (slotId, optionId) => !SLOTS.find(s => s.id === slotId)?.options.some(o => o.id === optionId);

/**
 * {slot: option} 선택을 슬롯 순서대로 적용한다. 알 수 없는 선택은 오류, 바뀌지 않는 선택은 건너뛴다.
 * 템플릿 합성 경로(LEGACY)다: 히어로 변형이 허용하지 않는 필드는 지운다. options.report를 주면 지운 것이 기록된다.
 * 이미 편집한 문서에는 applyLayoutChecked를 쓴다.
 */
export function applyLayout(tree, choice = {}, pageType, {report} = {}) {
  let out = structuredClone(tree);
  for (const [slotId, optionId] of Object.entries(choice)) {
    if (!optionId || optionId === 'default') continue;
    if (unknownChoice(slotId, optionId)) throw new Error('Unknown layout choice: ' + slotId + '=' + optionId);
  }
  const ctx = report ? {lossy: true, report} : LEGACY;
  for (const slot of SLOTS) {
    const optionId = choice[slot.id]; if (!optionId || optionId === 'default') continue;
    const next = tryOption(out, slot, slot.options.find(o => o.id === optionId), pageType, ctx);
    if (next) out = next;
  }
  return out;
}

const REFUSAL_REASONS = {
  PAGE_TYPE: (slot, option, pageType) => ({code: 'LAYOUT_NOT_APPLICABLE', message: `${pageType} 페이지에서는 ${slot}=${option} 구성을 쓰지 않습니다.`, hint: '이 페이지 유형에 허용된 구성은 layoutSlots(tree, pageType)로 확인하세요.'}),
  NOT_PRESENT: (slot, option) => ({code: 'LAYOUT_NOT_APPLICABLE', message: `현재 문서에는 ${slot}=${option}을 적용할 대상이 없습니다.`, hint: '현재 트리에서 선택할 수 있는 구성은 layoutSlots(tree, pageType)로 확인하세요.'}),
};

/**
 * 현재 문서 트리에 {slot: option} 선택을 적용한다(템플릿 원본을 다시 쓰지 않는다). 모두 적용되거나 하나도 적용되지 않는다.
 * options.contentPolicy: 변형이 콘텐츠를 둘 곳이 없을 때 'reject'(기본) | 'relocate'.
 * 결과: {tree, applied:[{slot, option}], unchanged:[{slot, option}], report:[{code, path, …}], errors:[{code, path, message, hint}]}. errors가 있으면 tree는 입력의 복사본이다.
 */
export function applyLayoutChecked(tree, choice = {}, pageType, {contentPolicy = 'reject'} = {}) {
  const errors = [], applied = [], unchanged = [], report = [];
  for (const [slotId, optionId] of Object.entries(choice)) {
    if (!optionId || optionId === 'default') continue;
    if (unknownChoice(slotId, optionId)) errors.push({code: 'LAYOUT_UNKNOWN', path: '$.layout.' + slotId, message: `알 수 없는 구성: ${slotId}=${optionId}`, hint: '허용된 슬롯: ' + layoutSlotIds.join(', ') + '. 옵션 id는 layoutSlots()가 돌려줍니다.'});
  }
  let out = structuredClone(tree);
  if (errors.length) return {tree: out, applied, unchanged, report, errors};
  const ctx = {lossy: false, contentPolicy, report};
  for (const slot of SLOTS) {
    const optionId = choice[slot.id]; if (!optionId || optionId === 'default') continue;
    const option = slot.options.find(o => o.id === optionId);
    try {
      const r = tryOptionDetailed(out, slot, option, pageType, ctx);
      if (r.tree) { out = r.tree; applied.push({slot: slot.id, option: optionId}); }
      else if (r.reason === 'NO_CHANGE') unchanged.push({slot: slot.id, option: optionId});
      else errors.push({path: '$.layout.' + slot.id, ...REFUSAL_REASONS[r.reason](slot.id, optionId, pageType)});
    } catch (e) {
      if (!(e instanceof LayoutRefusal)) throw e;
      errors.push(e.detail);
    }
  }
  return errors.length ? {tree: structuredClone(tree), applied: [], unchanged: [], report: [], errors} : {tree: out, applied, unchanged, report, errors};
}

export const layoutSlotIds = SLOTS.map(s => s.id);
