/**
 * 구성 변형(layout slots): 같은 템플릿을 다른 짜임으로 쓰는 선택지.
 * 슬롯마다 고를 수 있는 옵션이 있고, 옵션은 템플릿 트리를 순수 함수로 고쳐 돌려준다. 새 속성이나 스타일을 만들지 않고
 * 카탈로그가 이미 허용한 값(히어로 변형, 카드 변형, 섹션 표면 …)만 바꾸므로 결과는 평소와 같은 검증을 통과해야 한다.
 * 슬롯은 "바꿀 대상이 있고 바꾸면 달라지는 경우"에만 템플릿에 나타난다(layoutSlots).
 */
const walk = (nodes, fn, parent = null) => { for (const n of nodes) { fn(n, parent); if (n.children) walk(n.children, fn, n); } };
const find = (nodes, type) => { const out = []; walk(nodes, n => { if (n.type === type) out.push(n); }); return out; };
const topSections = tree => tree.filter(n => n.type === 'section');

const HERO_FEEL = {
  split: {label: '좌우 분할', description: '글과 시각 요소를 나란히'},
  product: {label: '제품 목업', description: '제품 화면을 크게 보여 주는 구도'},
  centered: {label: '가운데 정렬', description: '한 줄 약속을 가운데에 모으는 구도'},
  statement: {label: '큰 문장', description: '큰 제목 한 덩어리로 시작'},
  cover: {label: '커버', description: '화면 폭을 채우는 표지형'},
};
/** 히어로 변형을 바꾸되 그 변형이 허용하지 않는 필드(visual·motif·facts)는 정리한다. */
const setHero = variant => tree => {
  const [hero] = find(tree, 'hero'); if (!hero || hero.variant === variant) return false;
  hero.variant = variant;
  if (!['split', 'product'].includes(variant)) { delete hero.visual; delete hero.motif; }
  else if (!hero.visual) hero.visual = variant === 'product' ? 'device' : 'ornament';
  if (!['statement', 'cover', 'centered'].includes(variant)) delete hero.facts;
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
  {id: 'intro', label: '페이지 머리말', when: tree => { const h = tree.find(n => n.type === 'page-header'); return !!h && !h.stats && h.align !== 'center'; },
    options: [{id: 'center', label: '가운데 정렬', description: '제목을 가운데에 놓는 머리말', apply: tree => { const h = tree.find(n => n.type === 'page-header'); if (!h || h.stats) return false; h.align = 'center'; return true; }}]},
  {id: 'features', label: '기능 배열', when: tree => find(tree, 'bento').length > 0,
    options: [
      {id: 'grid', label: '균등 격자', description: '벤토 칸을 같은 크기의 격자로', apply: tree => {
        let changed = false;
        walk(tree, (n, parent) => { if (n.type === 'bento' && parent?.children) { n.type = 'grid'; n.columns = n.children.length % 3 === 0 || n.children.length > 4 ? 'three' : 'two'; changed = true; } });
        return changed;
      }},
      {id: 'reel', label: '가로 줄', description: '카드를 가로로 넘겨 보는 줄', apply: tree => {
        let changed = false;
        walk(tree, (n, parent) => { if (n.type === 'bento' && parent?.children && n.children.every(c => c.type === 'card') && n.children.length >= 3) { n.type = 'reel'; delete n.columns; changed = true; } });
        return changed;
      }},
    ]},
  {id: 'columns', label: '격자 열 수', when: tree => find(tree, 'grid').some(g => g.children.length >= 2),
    options: ['two', 'three', 'four'].map(c => ({id: c, label: {two: '2열', three: '3열', four: '4열'}[c], description: {two: '넓고 여유 있게', three: '균형 잡힌 3열', four: '촘촘하게'}[c], apply: cycle('grid', 'columns', ['two', 'three', 'four'], {skip: g => g.children.length < (c === 'four' ? 4 : c === 'three' ? 3 : 2)})(c)}))},
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
    options: ['vertical', 'horizontal'].map(v => ({id: v, label: v === 'vertical' ? '세로' : '가로', description: v === 'vertical' ? '위에서 아래로 따라가기' : '왼쪽에서 오른쪽으로 따라가기', apply: cycle('steps', 'layout', ['vertical', 'horizontal'])(v)}))},
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
];

function proofIndex(tree) {
  return tree.findIndex(n => n.type === 'logo-cloud' || (n.type === 'section' && n.children.some(c => c.type === 'quote' || c.type === 'reviews' || (c.type === 'grid' && c.children.some(x => x.type === 'quote')))));
}

/** 옵션 하나를 새 복사본에 적용해 바뀐 트리를 돌려준다. 바뀌지 않으면 null. */
function tryOption(tree, slot, option) {
  const copy = structuredClone(tree);
  if (!slot.when(copy)) return null;
  return option.apply(copy) ? copy : null;
}

/** 템플릿 트리에서 실제로 선택지가 있는 슬롯: [{id, label, options:[{id,label,description}]}] */
export function layoutSlots(tree) {
  return SLOTS.map(slot => ({id: slot.id, label: slot.label, options: slot.options.filter(o => tryOption(tree, slot, o)).map(({id, label, description}) => ({id, label, description}))})).filter(s => s.options.length);
}

/** {slot: option} 선택을 슬롯 순서대로 적용한다. 알 수 없는 선택은 오류, 바뀌지 않는 선택은 건너뛴다. */
export function applyLayout(tree, choice = {}) {
  let out = structuredClone(tree);
  for (const [slotId, optionId] of Object.entries(choice)) {
    if (!optionId || optionId === 'default') continue;
    const slot = SLOTS.find(s => s.id === slotId), option = slot?.options.find(o => o.id === optionId);
    if (!slot || !option) throw new Error('Unknown layout choice: ' + slotId + '=' + optionId);
  }
  for (const slot of SLOTS) {
    const optionId = choice[slot.id]; if (!optionId || optionId === 'default') continue;
    const next = tryOption(out, slot, slot.options.find(o => o.id === optionId));
    if (next) out = next;
  }
  return out;
}

export const layoutSlotIds = SLOTS.map(s => s.id);
