/** Layout primitives (6차). docs/layout.md is generated from this file.
 *  Parts do not choose their own column counts or widths. A flow (grid of equal items) asks the container how wide it is and takes the
 *  column count from a table that never leaves a single orphan on the last row. The renderer only writes `data-flow`, `data-n` and `data-cap`;
 *  the CSS below is generated from `FLOW`, so the rule lives in one place and the unit tests can prove it for every item count. */

/** 컨테이너 폭(px)마다 허용하는 최대 열 수. 칸 폭이 약 240px 아래로 내려가지 않는 경계다(2열 504, 3열 768, 4열 1032: 칸 240 + 간격 24). */
export const FLOW = {
  minCell: 240, gap: 24,
  bands: [0, 504, 768, 1032],
  /** 지표·미디어 카드처럼 작게 접어도 읽히는 항목은 가장 좁은 폭에서도 2열을 허용한다. */
  denseFloor: 2,
  maxItems: 12,
};

/** Layout revision. Catalog 2.1.0–2.3.0 blueprints keep revision 1 byte for byte (pinned in docs/evidence/layout-refine/legacy-2-3-hashes.json);
 *  2.4.0 and later use revision 2: fixed-count grids (hero facts, photo menu) are flows, titles fit their column, wrap follows the role, form fields pair up. */
export const LEGACY_LAYOUT_VERSIONS = Object.freeze(['2.1.0', '2.2.0', '2.3.0']);
export const layoutRev = b => (!b?.catalogVersion || LEGACY_LAYOUT_VERSIONS.includes(b.catalogVersion) ? 1 : 2);

/** 칸이 작아 FLOW.minCell(240)을 쓸 수 없는 흐름의 예산. 열 수 선택 알고리즘은 그대로이고 밴드만 바뀐다(`flowBreakpoints`).
 *  gap은 그 부품이 실제로 쓰는 간격 토큰 값이어야 한다: 밴드는 이 값으로 계산되고 CSS gap은 토큰이 정한다. */
export const FLOW_BUDGETS = {
  fact: {minCell: 72, use: '히어로 수치(값 한 줄 + 라벨). 3개면 세 칸이 들어갈 때만 3열, 아니면 한 열이다(2+1 없음).'},
  photo: {minCell: 180, use: '사진 메뉴 카드(4:3 사진 + 이름·가격).'},
  stat: {minCell: 120, use: '프로필 수치(값 + 라벨, 칸마다 왼쪽 구분선).'},
  choice: {minCell: 200, use: '라디오 선택지 카드.'},
};

/** n개 항목을 maxCols열 이하에서 놓을 때 고를 열 수. 마지막 줄이 가득 차면 0점, 한 칸만 남으면 100점, 두 칸 이상이면 1점이고, 열이 많을수록 조금 낫다(같은 점수면 더 많은 열).
 *  span이 켜진 흐름은 2열에서 마지막 한 칸이 줄 전체를 쓰는 것을 고아로 보지 않는다(글 카드의 의도한 마무리). */
export function bestCols(n, maxCols, {span = false} = {}) {
  const cap = Math.max(1, Math.min(maxCols, n));
  let best = 1, bestScore = Infinity;
  for (let c = cap; c >= 1; c--) {
    const last = n % c || c;
    const spans = span && c === 2 && last === 1;
    const orphan = c > 1 && n > c && last === 1 && !spans;
    const score = (orphan ? 100 : last === c ? 0 : spans ? 1.2 : 1) + (cap - c) * 0.2 + (c === 1 && n > 1 ? 1.5 : 0);
    if (score < bestScore - 1e-9) { best = c; bestScore = score; }
  }
  return best;
}

/** 폭 구간별 열 수 목록: bands[i] 이상 폭에서 쓰는 열 수. */
export function flowColumns(n, cap, {dense = false, span = false} = {}) {
  return FLOW.bands.map((_, i) => {
    const room = i === 0 && dense ? FLOW.denseFloor : Math.min(i + 1, 4);
    return bestCols(n, Math.min(cap, room), {span});
  });
}

/** 주어진 항목 수·상한으로 어떤 폭에서도 마지막 줄에 한 칸만 남는지 검사한다(시험이 쓴다). */
export function flowOrphans(n, cap, opts = {}) {
  return flowColumns(n, cap, opts).map((c, i) => ({band: FLOW.bands[i], cols: c, orphan: c > 1 && n > c && (n % c) === 1 && !(opts.span && c === 2)})).filter(x => x.orphan);
}

/** 컨테이너 쿼리 CSS. 대상은 `[data-flow]`이고 그 부모가 `kit` 이름의 컨테이너가 된다. */
/** 렌더된 본문에서 실제로 쓰인 흐름 규칙의 키(`종류|상한|항목 수`)를 모은다. 쓰이지 않은 규칙까지 모든 페이지에 싣지 않기 위한 것이다(전체 규칙은 약 13KB). */
export function flowUsage(html) {
  const used = new Set();
  for (const [tag] of html.matchAll(/<[a-z][^>]*\sdata-flow(?=[\s>])[^>]*>/g)) {
    const n = tag.match(/data-n="(\d+)"/)?.[1], cap = tag.match(/data-cap="(\d)"/)?.[1];
    if (!n || !cap) continue;
    const kind = /\sdata-dense(?=[\s>])/.test(tag) ? 'dense' : /\sdata-span(?=[\s>])/.test(tag) ? 'span' : 'plain';
    const min = tag.match(/data-flow-min="(\d+)"/)?.[1], gap = tag.match(/data-flow-gap="(\d+)"/)?.[1];
    used.add(`${kind}|${cap}|${n}` + (min && gap ? `|${min}|${gap}` : ''));
  }
  return used;
}

/** Content budgets change the bands, not the orphan-free column selection algorithm. */
export function flowBreakpoints(minCell = FLOW.minCell, gap = FLOW.gap) {
  return [0, 2 * minCell + gap, 3 * minCell + 2 * gap, 4 * minCell + 3 * gap];
}

/** used가 있으면 그 키의 규칙만 낸다(없으면 전부: 시험·문서용). */
export function flowCSS(used = null) {
  const out = ['/* layout flows (src/layout.mjs): columns come from the container width and the item count, never from the viewport */',
    ':has(>[data-flow],>.kit-bento,>.kit-section-head){container:kit/inline-size}',
    '.kit-section:has(>.kit-section-inner>.kit-faq[data-layout=split]){container:kit/inline-size}'];
  const KINDS = [['plain', {}, ':not([data-span]):not([data-dense])'], ['span', {span: true}, '[data-span]'], ['dense', {dense: true, span: true}, '[data-dense]']];
  for (const [kindName, opts, kindSel] of KINDS) for (const cap of [2, 3, 4]) for (let n = 2; n <= FLOW.maxItems; n++) {
    if (used && !used.has(kindName + '|' + cap + '|' + n)) continue;
    const cols = flowColumns(n, cap, opts);
    const sel = `[data-flow][data-n="${n}"][data-cap="${cap}"]${kindSel}`;
    // 홀수 개를 2열로 놓으면 마지막 항목이 한 줄을 다 쓴다(고아가 아니라 의도한 마무리).
    const spans = c => opts.span && c === 2 && n % 2 === 1;
    let prev = null, prevSpan = false;
    cols.forEach((c, i) => {
      if (c === prev && spans(c) === prevSpan) return;
      const extra = spans(c) ? `${sel}>:last-child{grid-column:1/-1}` : prevSpan ? `${sel}>:last-child{grid-column:auto}` : '';
      const rule = `${sel}{grid-template-columns:repeat(${c},minmax(0,1fr))}${extra}`;
      out.push(i === 0 ? rule : `@container kit (min-width:${FLOW.bands[i]}px){${rule}}`);
      prev = c; prevSpan = spans(c);
    });
  }
  for (const key of used ?? []) {
    const [kind, capText, nText, minText, gapText] = key.split('|');
    if (!minText) continue;
    const cap = Number(capText), n = Number(nText), minCell = Number(minText), gap = Number(gapText);
    const [, opts, kindSel] = KINDS.find(([name]) => name === kind);
    const cols = flowColumns(n, cap, opts), bands = flowBreakpoints(minCell, gap);
    const sel = `[data-flow][data-n="${n}"][data-cap="${cap}"]${kindSel}[data-flow-min="${minCell}"][data-flow-gap="${gap}"]`;
    let prev = null, prevSpan = false;
    cols.forEach((c, i) => {
      const span = opts.span && c === 2 && n % 2 === 1;
      if (c === prev && span === prevSpan) return;
      const extra = span ? `${sel}>:last-child{grid-column:1/-1}` : prevSpan ? `${sel}>:last-child{grid-column:auto}` : '';
      const rule = `${sel}{grid-template-columns:repeat(${c},minmax(0,1fr))}${extra}`;
      out.push(i === 0 ? rule : `@container kit (min-width:${bands[i]}px){${rule}}`);
      prev = c; prevSpan = span;
    });
  }
  // 항목이 13개 이상인 흐름은 이 규칙의 대상 밖이라 표지를 달지 않는다.
  out.push('[data-flow]{display:grid}[data-flow]>*{min-width:0}');
  return out.join('\n');
}

/** 시각 요소(그림·차트·미디어 카드)가 있는 칸. 이런 칸만 2×2로 키운다: 글만 있는 칸을 키우면 위가 텅 빈다(진단 EMPTY_CELL). */
export const isVisualCell = c => c.type === 'media' || c.type === 'chart' || (c.type === 'card' && !!(c.visual || c.variant === 'media'));

/** 짧은 칸: 내용이 숫자 하나나 막대 하나(지표·진행률)라 자연 높이가 125~155px 정도인 칸. 이 칸이 긴 칸(카드·인용)과 한 줄에 놓이면 줄 높이를 긴 칸이 정해 위아래가 빈다(진단 C3, Q07). */
export const isShortCell = c => c.type === 'metric' || c.type === 'progress';

/** 벤토 배치 표. 4열 격자에서 칸마다 가로 칸 수(span). 큰 칸(F)은 2×2이고 항상 첫 칸이다.
 *  F 뒤 m칸: 2→[2,2] · 3→[1,1,2] · 4→[1,1,1,1] · 5→[1,1,1,1,4]. 큰 칸이 없으면 3→[1,1,2] · 4→[2,2,2,2] · 5→[2,2,1,1,2] · 6→[2,2,1,1,1,1]. 모든 줄이 4열을 채운다. */
const BENTO_AFTER_FEATURE = {2: [2, 2], 3: [1, 1, 2], 4: [1, 1, 1, 1], 5: [1, 1, 1, 1, 4]};
const BENTO_FLAT = {3: [1, 1, 2], 4: [2, 2, 2, 2], 5: [2, 2, 1, 1, 2], 6: [2, 2, 1, 1, 1, 1]};
const BENTO_SPAN = {feature: 2, two: 2, one: 1, full: 4};
/** 4열 모드는 컨테이너가 이 폭 이상일 때다(`.kit-bento` 규칙의 1179px 경계). 큰 칸이 줄 높이를 따르는 규칙도 이 폭에서만 켜진다. */
export const BENTO = {wide: 1180, minVisual: 180};

/** 계획의 줄 묶음. cols=4: 4열 자동 배치(큰 칸은 첫 두 줄의 왼쪽 반을 쓴다, 큰 칸 자신은 줄에 넣지 않는다). cols=2: 한 칸짜리 둘이 한 줄, 나머지는 한 줄 전체. */
export function bentoRows(plan, cols = 4) {
  const rows = [];
  if (cols === 4) {
    const free = plan[0]?.cell === 'feature' ? [2, 2] : [];
    let r = 0;
    for (const p of plan) {
      if (p.cell === 'feature') continue;
      const span = BENTO_SPAN[p.cell];
      while ((free[r] ??= 4) < span) r++;
      free[r] -= span; (rows[r] ??= []).push(p);
    }
    return rows.filter(Boolean);
  }
  let open = null;
  for (const p of plan) {
    if (p.cell === 'feature') continue;
    if (p.cell === 'one' && !p.tail) { if (open) { open.push(p); open = null; } else rows.push(open = [p]); }
    else { rows.push([p]); open = null; }
  }
  return rows;
}
/** 짧은 칸과 긴 칸이 한 줄에 섞인 줄의 수. 그런 줄은 짧은 칸이 긴 칸 높이로 늘어난다. */
export const bentoMixedRows = (children, plan, cols = 4) => bentoRows(plan, cols).filter(row => new Set(row.map(p => isShortCell(children[p.index]))).size > 1).length;

/** 칸 크기는 표가 정하고, 어떤 내용이 어느 자리에 앉는지는 높이 등급이 정한다: 같은 줄에는 같은 등급(짧은 칸끼리, 긴 칸끼리)을 앉힌다.
 *  섞인 줄이 가장 적은 순열 중 작성 순서에서 가장 덜 움직인 것을 고른다(4열·2열 줄을 모두 센다). 이미 섞인 줄이 없으면 그대로다.
 *  이 규칙은 리비전 2부터다: 리비전 1 출력은 작성 순서를 유지한다(`pair` 옵션). */
function pairByHeight(children, plan) {
  const head = plan[0]?.cell === 'feature' ? 1 : 0, slots = plan.slice(head), rest = slots.map(p => p.index);
  const cost = ord => { const placed = [...plan.slice(0, head), ...ord.map((index, i) => ({...slots[i], index}))]; return bentoMixedRows(children, placed, 4) + bentoMixedRows(children, placed, 2); };
  if (rest.length < 2 || rest.length > 7 || cost(rest) === 0) return plan;
  let best = rest, bestCost = cost(rest), bestMove = 0;
  const walk = (left, ord) => {
    if (!left.length) {
      const c = cost(ord), move = ord.reduce((sum, index, k) => sum + Math.abs(rest.indexOf(index) - k), 0);
      if (c < bestCost || (c === bestCost && move < bestMove)) { best = ord; bestCost = c; bestMove = move; }
      return;
    }
    left.forEach((index, i) => walk(left.filter((_, k) => k !== i), [...ord, index]));
  };
  walk(rest, []);
  return [...plan.slice(0, head), ...best.map((index, i) => ({...slots[i], index}))];
}

export function bentoPlan(children, {pair = false} = {}) {
  const f = children.findIndex(isVisualCell);
  const order = children.map((_, i) => i);
  if (f > 0) { order.splice(f, 1); order.unshift(f); }
  const spans = f >= 0 ? ['F', ...(BENTO_AFTER_FEATURE[children.length - 1] ?? [])] : (BENTO_FLAT[children.length] ?? []);
  // 2열 모드(컨테이너 720px 미만)에서 1칸짜리가 홀수 개면 마지막 1칸이 줄 전체를 쓴다.
  const ones = spans.map((x, i) => x === 1 ? i : -1).filter(i => i >= 0);
  const tail = ones.length % 2 === 1 ? ones.at(-1) : -1;
  const plan = order.map((index, i) => ({index, cell: spans[i] === 'F' ? 'feature' : spans[i] === 1 ? 'one' : spans[i] === 2 ? 'two' : 'full', tail: i === tail}));
  return pair ? pairByHeight(children, plan) : plan;
}

// ---------- CSS lint ----------
/** `repeat(N,…)`·`repeat(auto-fit,…)`로 같은 크기 칸을 늘어놓는 격자는 흐름(flow) 원시 요소의 일이다. 아래 선택자만 직접 선언할 수 있고, 나머지 부품은 흐름 표지(data-flow)를 쓴다. */

/** 흐름의 기본값(CSS 미지원 환경의 대체값). 흐름 표지가 붙으면 `[data-flow][data-n=…]` 규칙이 이 선언을 덮는다. */
export const FLOW_FALLBACKS = [
  '.kit-grid', '.kit-plans', '.kit-features', '.kit-gallery', '.kit-steps[data-layout=horizontal]', '.kit-team', '.kit-menu[data-layout=grid]', '.kit-bento',
];

/** 고정 개수 구조 틀. 항목 수가 구조로 정해져 있어 흐름을 쓰지 않는 격자다. 틀마다 `proof`(tests/layout.test.mjs의 FRAME_PROOFS 키)가 있어야 하고,
 *  그 증명이 "어떤 폭에서도 마지막 줄에 한 칸만 남지 않는다"를 실제로 계산한다. 증명 없이 목록에 더하지 못한다(진단 공통 원인 1: `.kit-hero-facts`는 항목이 3개로 정해져 있어도 2+1이 났다). */
export const FIXED_FRAMES = [
  {selector: '.kit-split', proof: 'two-cells', why: '글과 시각 요소 두 칸이 구조다(자식 노드 2개). 한 열 또는 2열이라 한 칸만 남는 줄이 없다.'},
  {selector: '.kit-mega-panel', proof: 'mega-span', why: '드롭다운 패널은 항목이 3~9개(전체 보기 1 + 하위 2~8)라 홀수일 수 있다. 2열에서 홀수면 마지막 칸이 줄 전체를 쓴다(리비전 2).'},
  {selector: '.kit-form', proof: 'form-pairs', why: '2열 폼은 렌더러가 짝 없는 반폭 필드를 전폭으로 올린다(`pairFields`).'},
  {selector: '.kit-hero[data-design-kind=hero]', proof: 'two-cells', why: '히어로는 글 칸과 시각 칸 두 칸이다.'},
];

/** 리비전 1(카탈로그 2.1.0~2.3.0)의 출력에만 남은 직접 선언. 출력이 바이트 단위로 고정돼 있어 지울 수 없고, 리비전 2는 `refineLayout`이 이 선언을 제거한다. */
export const REV1_GRIDS = ['.kit-hero-facts', '.kit-menu[data-layout=photo]', '.kit-profile-stats', '.kit-choice'];

/** 이 목록은 호환을 위한 이름이다(원시 소스 CSS를 린트할 때 쓰는 전체 허용 목록). */
export const EQUAL_COLUMNS_OK = [...FLOW_FALLBACKS, ...FIXED_FRAMES.map(f => f.selector), ...REV1_GRIDS];

/** CSS 텍스트에서 허용 목록 밖의 반복 격자 선언을 찾는다. [{selector, value}]. strict면 리비전 1 전용 선언도 허용하지 않는다(리비전 2의 완성된 스타일시트용). */
export function lintLayout(css, {strict = false} = {}) {
  const ok = strict ? [...FLOW_FALLBACKS, ...FIXED_FRAMES.map(f => f.selector)] : EQUAL_COLUMNS_OK;
  const out = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim().replace(/\s+/g, ' ');
    if (sel.startsWith('@') || sel.startsWith('/*')) continue;
    for (const decl of body.split(/;(?![^(]*\))/)) {
      const i = decl.indexOf(':'); if (i < 0) continue;
      if (decl.slice(0, i).trim() !== 'grid-template-columns') continue;
      const value = decl.slice(i + 1).replace(/!important/, '').trim();
      if (!/^repeat\(/.test(value)) continue;
      if (/data-flow/.test(sel) || ok.some(s => sel.includes(s))) continue;
      out.push({selector: sel.slice(0, 80), value: value.slice(0, 60)});
    }
  }
  return out;
}

/** 리비전 2 전용 CSS 편집. [원본 조각, 대체]. 원본 조각은 소스 CSS에 정확히 한 번 있어야 하고(시험이 확인한다), 없으면 조용히 건너뛰지 않고 오류다.
 *  열 수를 직접 정하던 선언을 지우고(열 수는 흐름 표지가 정한다) 간격을 spacing 역할로 바꾸며, 텍스트 행을 나열(cluster) 원시 요소로 만든다. */
export const REV2_EDITS = [
  ['.kit-hero-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:var(--kit-gap);', '.kit-hero-facts{display:grid;gap:var(--kit-sp-item);'],
  ['.kit-menu[data-layout=photo] ul{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:var(--kit-gap)}', '.kit-menu[data-layout=photo] ul{gap:var(--kit-gap)}'],
  ['.kit-profile-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin:', '.kit-profile-stats{display:grid;margin:'],
  ['.kit-choice:has(input[type=radio]){display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:var(--kit-sp-near)}', '.kit-choice:has(input[type=radio]){display:grid;gap:var(--kit-sp-near)}'],
  ['.kit-menu-row{display:flex;align-items:baseline;gap:4px;width:100%}', '.kit-menu-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px;width:100%}'],
];

/** 2열 폼에서 한 줄 전체를 쓰는 필드 종류(CSS: textarea 필드와 선택 묶음). 그 밖의 필드는 반폭이다. */
export const FULL_WIDTH_FIELDS = ['textarea', 'radio', 'checkbox', 'switch'];
/** 2열 폼에서 짝이 없는 반폭 필드의 인덱스 집합. 전폭 필드가 줄을 끊으므로, 반폭 필드가 홀수 개로 끝나는 구간의 마지막 필드가 혼자 남는다.
 *  이런 필드는 전폭으로 올린다(진단 B5: 반폭 "주소"가 혼자 놓이고 오른쪽 절반이 빔). 필드 순서는 바꾸지 않는다. */
export function loneFields(fields) {
  const lone = new Set();
  let pending = -1;
  fields.forEach((f, i) => {
    if (FULL_WIDTH_FIELDS.includes(f.type)) { if (pending >= 0) lone.add(pending); pending = -1; }
    else if (pending >= 0) pending = -1;
    else pending = i;
  });
  if (pending >= 0) lone.add(pending);
  return lone;
}

/** 같은 행의 이웃이 더 커서 늘어난 칸의 남는 높이를 어디서 흡수하는가(진단 A4: 도넛 카드가 막대 카드 높이로 늘어나 아래 42%가 빔).
 *  본문(body)이 남는 높이를 받아 내용을 세로 가운데에 두고, 보조 줄(foot, 예: "데이터 표 보기")은 칸 아래에 붙는다. 칸 높이는 줄이지 않는다. */
export const STRETCH_ABSORB = [
  {cell: '.kit-chart', body: '.kit-chart-body', foot: '.kit-chart-data'},
];

/** 4열 벤토의 2×2 큰 칸: 시각 부분(그림 상자·카드 그림·차트 면)이 자기 비율로 높이를 만들지 않고, 작은 칸이 정한 두 줄 높이를 받아 채운다.
 *  큰 칸의 고유 높이(그림 비율)가 줄 높이를 정하면 작은 칸이 그 높이로 늘어나 60% 넘게 비었다(진단 C3). 한 줄짜리 큰 칸(2열·1열)은 자기 비율을 그대로 쓴다. */
export function bentoFeatureCSS() {
  const f = '.kit-bento-cell[data-cell=feature]', fill = `:is(.kit-art-box,.kit-card:not([data-variant=horizontal])>.kit-card-media)`;
  return `@container kit (min-width:${BENTO.wide}px){${f} .kit-media{display:flex;flex-direction:column}${f} .kit-card:not([data-variant=horizontal]) .kit-card-body{flex:none}${f} .kit-chart-body{flex:1 1 0;min-height:0}`
    + `${f} ${fill}{flex:1 1 0;min-height:${BENTO.minVisual}px;position:relative;aspect-ratio:auto!important}${f} .kit-chart-plot{align-self:stretch;position:relative;min-height:${BENTO.minVisual}px}`
    + `${f} :is(.kit-art-box,.kit-card-media,.kit-chart-plot)>svg{position:absolute;inset:0;width:100%;height:100%}}`;
}

/** 리비전 2에서 스타일시트 끝에 더하는 레이아웃 규약 CSS. used가 있으면 쓰는 부품의 규칙만 낸다(없으면 전부: 시험·문서용). */
export function layoutContractCSS(used = null) {
  return [
    '/* layout contract rev 2 (src/layout.mjs) */',
    '.kit-form[data-variant=two-column] .kit-field[data-span=full]{grid-column:1/-1}',
    '.kit-mega-panel li:last-child:nth-child(odd){grid-column:1/-1}',
    ...STRETCH_ABSORB.map(({cell, body, foot}) => `[data-flow]>${cell} ${body}{flex:1 1 auto;align-content:center}[data-flow]>${cell} ${foot}{margin-top:auto}`),
    ...(!used || used.has('bento') ? [bentoFeatureCSS()] : []),
  ].join('\n');
}

/** 리비전 2의 스타일시트 변환. 사용된 부품의 CSS만 들어 있으므로 원본 조각이 없는 편집은 건너뛴다(전체 소스에서의 존재는 시험이 증명한다). */
export function refineLayout(css) {
  let out = css;
  for (const [from, to] of REV2_EDITS) out = out.split(from).join(to);
  return out;
}

export const PRIMITIVES = [
  {id: 'stack', name: '쌓기', use: '세로로 쌓는 묶음. 간격은 spacing 역할(tight·near·item·head·gap)로만 정한다.', css: '.kit-section-inner, .kit-form, .kit-card-body …'},
  {id: 'cluster', name: '나열', use: '가로로 나열하고 넘치면 줄바꿈하는 묶음(버튼 줄, 칩, 태그).', css: '.kit-actions, .kit-tags …'},
  {id: 'flow', name: '격자 흐름', use: '같은 크기 항목의 격자. 열 수는 컨테이너 폭과 항목 수가 정한다(마지막 줄에 한 칸만 남기지 않는다).', css: '[data-flow] (이 파일이 생성)'},
  {id: 'container', name: '컨테이너', use: '콘텐츠 폭(--kit-max)과 좌우 여백(--kit-gutter)을 정한다. 읽기 폭은 측정 역할로만 제한한다.', css: '.kit-main, [data-measure]'},
  {id: 'split', name: '2분할', use: '글과 시각 요소를 나란히. 좁은 폭에서는 한 열로 접힌다.', css: '.kit-split, .kit-aside'},
  {id: 'bento', name: '벤토', use: '크기가 다른 칸의 격자. 칸의 크기는 내용이 정한다(시각 요소가 있는 칸만 2×2).', css: '.kit-bento'},
];

export function layoutMarkdown() {
  const rows = [];
  for (const cap of [2, 3, 4]) for (let n = 2; n <= 9; n++) rows.push(`| ${cap} | ${n} | ${flowColumns(n, cap).join(' → ')} |`);
  return `# 레이아웃 원시 요소 (Layout Primitives)

> 이 문서는 \`src/layout.mjs\`에서 생성됩니다(\`npm run docs\`). 손으로 고치지 않습니다.

부품은 자기 열 수와 너비를 정하지 않는다. 부품은 **원시 요소**(아래 표) 중 하나를 고르고, 값은 토큰과 컨테이너가 정한다.

| 원시 요소 | 하는 일 | 쓰는 곳 |
|---|---|---|
${PRIMITIVES.map(p => `| ${p.name}(${p.id}) | ${p.use} | ${p.css} |`).join('\n')}

## 격자 흐름: 마지막 줄에 한 칸만 남기지 않는다

실측(6차 진단)에서 조합의 28.5%가 같은 크기 카드의 마지막 줄에 한 칸만 남았다. 원인은 열 수를 부품이 고정하고(\`two\`·\`three\`) 뷰포트 미디어 쿼리로만 줄였기 때문이다. 사이드바나 2분할 안에서는 뷰포트가 넓어도 칸은 좁다.

규칙:

1. 열 수의 상한은 컨테이너 폭이 정한다: ${FLOW.bands.map((b, i) => `${b}px~ ${i + 1}열`).join(', ')}(칸 ${FLOW.minCell}px 이상).
2. 그 안에서 열 수는 항목 수가 정한다. 마지막 줄이 가득 차면 0점, 한 칸만 남으면 100점, 그 밖에는 1점이며 열이 많을수록 조금 낫다(\`bestCols\`).
3. 지표·미디어 카드처럼 작게 접어도 읽히는 항목(\`data-dense\`)은 가장 좁은 폭에서 2열을 허용한다.
4. 항목이 ${FLOW.maxItems}개를 넘는 흐름은 이 규칙의 대상이 아니다.

예(상한 \`cap\`, 항목 수 \`n\`, 폭 구간별 열 수 ${FLOW.bands.join('·')}px):

| cap | n | 열 수 |
|---|---|---|
${rows.join('\n')}

## 고정 개수 격자도 같은 규칙을 따른다(리비전 2, 카탈로그 2.4.0)

진단(2026-11-21)에서 전 조합 4,955개 중 1,173개가 320·768px에서 심각 지적을 받았고 그중 1,152개가 히어로 수치 3개의 2+1이었다. 원인은 \`.kit-hero-facts\`가 "항목 수가 정해진 구조 틀"로 예외 목록에 있어 흐름 밖에서 \`auto-fit\`으로 열 수를 정했기 때문이다. 항목이 3개로 정해져 있어도 폭에 따라 2열이 되면 한 칸이 남는다.

- 히어로 수치·사진 메뉴·프로필 수치·라디오 선택지는 흐름 표지를 단다. 열 수 선택은 그대로이고 칸 최소폭만 예산(\`FLOW_BUDGETS\`)으로 낮춘다: ${Object.entries(FLOW_BUDGETS).map(([k, v]) => `${k} ${v.minCell}px`).join(' · ')}. 간격은 그 부품이 쓰는 spacing 토큰의 실제 값을 밴드에 넘긴다.
- 예외 목록(\`EQUAL_COLUMNS_OK\`)은 두 갈래로 나뉜다. 흐름의 대체값(\`FLOW_FALLBACKS\`), 그리고 고정 개수 구조 틀(\`FIXED_FRAMES\`)이다. 틀은 \`proof\`가 있어야 하고 시험이 "마지막 줄에 한 칸만 남지 않음"을 계산으로 증명한다. 증거 없이 더하지 못한다.
- 리비전 1(2.1.0~2.3.0)의 출력은 바이트 단위로 고정이라 옛 선언이 남는다(\`REV1_GRIDS\`). 리비전 2는 \`refineLayout\`이 그 선언을 제거한다(\`REV2_EDITS\`).
- 2열 폼은 짝 없는 반폭 필드를 전폭으로 올린다(\`loneFields\`). 같은 행의 칸이 늘어나면 본문이 남는 높이를 흡수한다(\`STRETCH_ABSORB\`). 메뉴 줄은 나열(cluster)이라 넘치지 않고 줄바꿈한다.
- 품질 게이트(\`e2e/quality.spec.mjs\`)의 폭은 1440·768·390·320이다.

FIXED_FRAMES:

| 선택자 | 증명 | 이유 |
|---|---|---|
${FIXED_FRAMES.map(f => `| \`${f.selector}\` | ${f.proof} | ${f.why} |`).join('\n')}

## 강제 지점

| 지점 | 무엇을 막나 | 파일 |
|---|---|---|
| 생성 CSS | 항목 수·폭 조합마다 한 칸만 남는 열 수 | \`flowCSS\`, \`tests/layout.test.mjs\` |
| 구성 변형 | 항목 수와 맞지 않는 열 수 옵션(3개를 2열로) | \`src/catalog/variants.mjs\` \`fits\` |
| 렌더 실측 | 실제 화면의 고아 줄 | \`scripts/design-qa/layout-probe.mjs\` \`GRID_ORPHAN\` |
`;
}
