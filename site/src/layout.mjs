import {escapeHTML} from './escape-html.mjs';
import {TOKEN} from './spacing.mjs';

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

// ---------- 강조 칸(카탈로그 2.5.0, EX-2) ----------
/** 강조 카드가 있는 격자의 폭 구간별 열 수. 강조 칸은 첫 칸이고 2칸을 쓰므로 n개 항목은 n+1칸이다. 열이 하나뿐인 구간은 1(강조 칸도 한 칸 폭)이다. */
export function featuredColumns(n, cap) {
  return FLOW.bands.map((_, i) => bestCols(n + 1, Math.min(cap, Math.min(i + 1, 4))));
}
/** 강조 칸이 첫 칸일 때 자동 배치가 만드는 실제 줄들. 줄마다 [차지한 칸 수]. 구멍(빈칸)과 한 칸만 남은 마지막 줄을 시험이 센다. */
export function featuredRows(n, cols) {
  const rows = []; let free = 0;
  for (let i = 0; i < n; i++) {
    const span = i === 0 && cols >= 2 ? 2 : 1;
    if (free < span) { rows.push([]); free = cols; }
    rows.at(-1).push(span); free -= span;
  }
  return rows;
}
/** 강조 격자의 구간별 고아 검사(시험이 쓴다): 마지막 줄에 한 칸만 남거나 강조 칸이 줄을 못 채우면 목록에 든다. */
export function featuredOrphans(n, cap) {
  return featuredColumns(n, cap).flatMap((cols, i) => {
    const rows = featuredRows(n, cols), last = rows.at(-1), used = last.reduce((a, b) => a + b, 0);
    const bad = [];
    if (cols >= 2 && rows.length > 1 && last.length === 1 && last[0] === 1 && used === 1) bad.push('lone-last-cell');
    if (cols >= 2 && rows[0].reduce((a, b) => a + b, 0) !== cols && rows.length > 1) bad.push('first-row-hole');
    return bad.map(kind => ({band: FLOW.bands[i], cols, kind}));
  });
}
/** 렌더된 본문에서 강조 격자의 규칙 키(`상한|항목 수|칸 최소폭|gap`)를 모은다. */
export function featuredUsage(html) {
  const used = new Set();
  for (const [tag] of html.matchAll(/<[a-z][^>]*\sdata-flow-featured(?=[\s>])[^>]*>/g)) {
    const n = tag.match(/data-n="(\d+)"/)?.[1], cap = tag.match(/data-cap="(\d)"/)?.[1], min = tag.match(/data-flow-min="(\d+)"/)?.[1], gap = tag.match(/data-flow-gap="(\d+)"/)?.[1];
    if (n && cap && min && gap) used.add(`${cap}|${n}|${min}|${gap}`);
  }
  return used;
}
/** 강조 격자 CSS. 흐름(`flowCSS`)과 같은 컨테이너 쿼리 구조다: 열 수는 컨테이너 폭과 항목 수가 정하고, 강조 칸은 열이 둘 이상인 구간에서만 두 칸을 쓴다.
 *  뷰포트 641px 미만에서는 한 열이다(`.kit-grid:has(>.kit-card .kit-card-foot){…!important}` 같은 모바일 한 열 규칙과 어긋나 암시적 열이 생기지 않게 한다). */
export function featuredCSS(used) {
  const out = ['/* featured grids (src/layout.mjs featuredColumns): the first card takes two cells; columns come from the container width and n+1 cells */',
    ':has(>[data-flow-featured]){container:kit/inline-size}', '.kit-grid[data-flow-featured]{display:grid;grid-template-columns:minmax(0,1fr)}[data-flow-featured]>*{min-width:0}'];
  for (const key of [...used].sort()) {
    const [cap, n, min, gap] = key.split('|').map(Number), cols = featuredColumns(n, cap), bands = flowBreakpoints(min, gap);
    const sel = `[data-flow-featured][data-n="${n}"][data-cap="${cap}"][data-flow-min="${min}"][data-flow-gap="${gap}"]`;
    let prev = 1;
    cols.forEach((c, i) => {
      if (i === 0 || c === prev) return;
      out.push(`@media(min-width:641px){@container kit (min-width:${bands[i]}px){${sel}{grid-template-columns:repeat(${c},minmax(0,1fr))}${sel}>[data-featured]{grid-column:span 2}}}`);
      prev = c;
    });
  }
  return out.join('\n');
}

/** 시각 요소(그림·차트·미디어 카드)가 있는 칸. 이런 칸만 2×2로 키운다: 글만 있는 칸을 키우면 위가 텅 빈다(진단 EMPTY_CELL). */
export const isVisualCell = c => c.type === 'media' || c.type === 'chart' || (c.type === 'card' && !!(c.visual || c.variant === 'media'));

/** 짧은 칸: 내용이 숫자 하나나 막대 하나(지표·진행률)라 자연 높이가 125~155px 정도인 칸. 이 칸이 긴 칸(카드·인용)과 한 줄에 놓이면 줄 높이를 긴 칸이 정해 위아래가 빈다(진단 C3, Q07). */
export const isShortCell = c => c.type === 'metric' || c.type === 'progress';

/** 벤토 배치 표. 4열 격자에서 칸마다 가로 칸 수(span). 큰 칸(F)은 2×2이고 항상 첫 칸이다.
 *  F 뒤 m칸: 2→[2,2] · 3→[1,1,2] · 4→[1,1,1,1] · 5→[1,1,1,1,4]. 큰 칸이 없으면 3→[1,1,2] · 4→[2,2,2,2] · 5→[2,2,1,1,2] · 6→[2,2,1,1,1,1]. 모든 줄이 4열을 채운다. */
export const BENTO_AFTER_FEATURE = {2: [2, 2], 3: [1, 1, 2], 4: [1, 1, 1, 1], 5: [1, 1, 1, 1, 4]};
export const BENTO_FLAT = {3: [1, 1, 2], 4: [2, 2, 2, 2], 5: [2, 2, 1, 1, 2], 6: [2, 2, 1, 1, 1, 1]};
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

/** 흐름 안 도넛 카드의 링 크기. 링은 범례 옆에 남는 폭을 쓴다(min~max px). 범례(기본 칸 160px)가 아래로 접히지 않는 범위라서, 카드가 넓을 때만 커진다.
 *  이웃이 더 큰 카드 행에서 링이 200px에 머물러 카드 아래가 비던 것(진단 A4, Q04: 142px)을 줄인다. 좁은 카드(범례가 아래로 접히는 폭)는 그대로다. */
export const DONUT = {min: 200, max: 340, legend: 160};
export const donutFitCSS = () => '[data-flow]>.kit-chart[data-kind=donut] .kit-chart-body{container-type:inline-size}'
  + `[data-flow]>.kit-chart[data-kind=donut] .ch-donut{flex:0 0 clamp(${DONUT.min}px,calc(100cqw - var(--kit-sp-head) - ${DONUT.legend}px),${DONUT.max}px);max-width:none}`;

/** 리비전 2에서 스타일시트 끝에 더하는 레이아웃 규약 CSS. used가 있으면 쓰는 부품의 규칙만 낸다(없으면 전부: 시험·문서용). */
export function layoutContractCSS(used = null) {
  return [
    '/* layout contract rev 2 (src/layout.mjs) */',
    '.kit-form[data-variant=two-column] .kit-field[data-span=full]{grid-column:1/-1}',
    '.kit-mega-panel li:last-child:nth-child(odd){grid-column:1/-1}',
    ...STRETCH_ABSORB.map(({cell, body, foot}) => `[data-flow]>${cell} ${body}{flex:1 1 auto;align-content:center}[data-flow]>${cell} ${foot}{margin-top:auto}`),
    ...(!used || used.has('chart') ? [donutFitCSS()] : []),
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

## 벤토 높이 균형(리비전 2, 카탈로그 2.4.0)

진단(2026-11-21 C3)에서 \`product-landing\`의 벤토 낮은 칸 빈 비율이 최대 0.69, \`saas-landing\`이 0.63이었다(Q07 한도 0.6). 줄 높이를 정하는 것이 작은 칸의 내용이 아니라 2×2 큰 칸의 그림 비율과 이웃한 긴 칸이었기 때문이다.

- 칸 크기(\`span\`)는 표가 정한다. 어떤 내용이 어느 자리에 앉는지는 **높이 등급**이 정한다: 짧은 칸(\`isShortCell\`: 지표·진행률)끼리, 긴 칸끼리 한 줄에 앉힌다(\`bentoPlan\`의 \`pair\` 옵션, \`bentoRows\`가 4열·2열 줄을 계산한다). 섞인 줄이 가장 적은 순열 중 작성 순서에서 가장 덜 움직인 것을 고른다. 이미 섞인 줄이 없으면 순서를 바꾸지 않는다.
- 4열 벤토(컨테이너 ${BENTO.wide}px 이상)의 큰 칸은 시각 부분(그림 상자·카드 그림·차트 면)이 자기 비율로 높이를 만들지 않고, 작은 칸이 정한 두 줄 높이를 받아 채운다(\`bentoFeatureCSS\`, 최소 ${BENTO.minVisual}px). 한 줄짜리 큰 칸(2열·1열)은 자기 비율을 쓴다.
- 짝을 지을 수 없는 구성(짧은 칸이 하나뿐인 4칸)은 섞인 줄이 남고, 페이지 규칙 P04가 그 줄 수를 \`PAGE_BENTO_SPARSE\`로 보고한다.
- 리비전 1(2.1.0~2.3.0)은 작성 순서와 옛 CSS를 그대로 유지한다.
- 흐름 안 도넛 카드의 링은 범례 옆에 남는 폭(${DONUT.min}~${DONUT.max}px)을 쓴다(\`donutFitCSS\`). 좁은 카드는 그대로다.

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

// ---------- 레이아웃 패턴 24종 (REQUEST §9.2, 계약 0.8.0 `layout` 재료) ----------
// 기존 출력(위 흐름·벤토·린트)은 그대로 두고, 아래는 `layout:*` 재료(src/platform/data/layouts.mjs)를 HTML·CSS로 컴파일하는 함수만 더한다.
// 레이아웃은 슬롯 계약과 폭 구간(bands)별 배치 표만 갖고, 칸의 크기·열 수는 이 함수가 컨테이너 쿼리로 낸다. 부품은 칸 안에 들어가고 자기 폭을 정하지 않는다.

/** 레이아웃 컨테이너 폭 구간(px). 뷰포트가 아니라 `.kit-lay` 컨테이너의 폭이다: 320·768·1024·1440 뷰포트가 각각 xs·sm·md·lg에 들어간다(페이지 좌우 여백 포함). */
export const LAYOUT_BANDS = Object.freeze([0, 560, 880, 1180]);
export const LAYOUT_BAND_NAMES = Object.freeze(['xs', 'sm', 'md', 'lg']);
export const LAYOUT_TAGS = Object.freeze(['div', 'aside', 'header', 'footer']);
export const LAYOUT_FLOW_MODES = Object.freeze(['stack', 'grid', 'columns', 'row', 'bento']);
export const LAYOUT_LENGTH_POLICIES = Object.freeze(['wrap', 'scroll-x', 'cap']);
/** 트랙 하나의 최소 폭 해석에 쓰는 값: 비율 칸(fr)은 레이아웃이 선언한 `minCol`, 범위 칸은 최솟값(rem). */
const REM = 16;

/** 영역 표 문자열 'a b | c d'를 행×열 배열로. `_`는 의도한 빈 칸(여백)이다. */
export const parseAreas = text => String(text).split('|').map(row => row.trim().split(/\s+/).filter(Boolean));
/** 폭 구간 하나의 트랙 목록을 CSS로. 숫자 n은 `minmax(0,nfr)`, [최소, 최대](rem)는 `minmax(Arem,Brem)`, 문자열은 그대로다. */
export const trackCSS = t => (typeof t === 'number' ? `minmax(0,${t}fr)` : Array.isArray(t) ? `minmax(${t[0]}rem,${t[1]}rem)` : String(t));
/** 트랙의 최소 폭(px). 비율 칸은 minCol. */
export const trackMin = (t, minCol) => (typeof t === 'number' ? minCol : Array.isArray(t) ? t[0] * REM : /^(\d+(?:\.\d+)?)rem$/.test(t) ? parseFloat(t) * REM : 0);

/** 칸 사이 간격: 밀도 3종 모두에서 쓰는 가장 큰 gap 토큰 값(spacing SPACE.spacious.gap=32). 폭 구간의 최소 폭 검증에 쓴다. */
export const LAYOUT_MAX_GAP = 32;

/** 한 폭 구간의 배치 후보: 슬롯 이름 → 영역 표에서의 위치. [{name, rows:[min,max], cols:[min,max]}] */
export function areaBoxes(areas) {
  const boxes = new Map();
  areas.forEach((row, r) => row.forEach((name, c) => {
    if (name === '_') return;
    const b = boxes.get(name) ?? {name, rows: [r, r], cols: [c, c]};
    b.rows = [Math.min(b.rows[0], r), Math.max(b.rows[1], r)]; b.cols = [Math.min(b.cols[0], c), Math.max(b.cols[1], c)];
    boxes.set(name, b);
  }));
  return [...boxes.values()];
}

/** 영역이 사각형이 아니거나(ㄱ자) 같은 이름이 떨어져 있으면 CSS grid가 무효로 만든다. 문제가 있는 이름 목록. */
export function brokenAreas(areas) {
  return areaBoxes(areas).filter(b => {
    for (let r = b.rows[0]; r <= b.rows[1]; r++) for (let c = b.cols[0]; c <= b.cols[1]; c++) if (areas[r][c] !== b.name) return true;
    return false;
  }).map(b => b.name);
}

/** 읽기 순서: 영역 표에서 슬롯이 처음 나타나는 순서(행 우선, 같은 행은 왼쪽부터). DOM 순서와 다르면 시각 순서가 바뀐 것이다. */
export const visualOrder = areas => areaBoxes(areas).sort((a, b) => a.rows[0] - b.rows[0] || a.cols[0] - b.cols[0]).map(b => b.name);

/** 비어 있는 선택 슬롯을 뺀 구간 표. 빈 슬롯이 있던 행·열에 채워진 슬롯이 하나도 없으면 트랙과 함께 지운다(의도한 여백 `_`만 있는 행·열은 그대로다). */
export function bandForFilled(band, present) {
  const holds = n => n !== '_' && n !== '.';
  let areas = parseAreas(band.areas).map(row => row.map(n => (n === '_' || present.has(n) ? n : '.')));
  areas = areas.filter(row => !(row.includes('.') && !row.some(holds)));
  const keep = (band.columns).map((_, c) => { const col = areas.map(row => row[c]); return !(col.includes('.') && !col.some(holds)); });
  areas = areas.map(row => row.filter((_, c) => keep[c]));
  return {areas, tracks: band.columns.filter((_, c) => keep[c])};
}

const gapVar = key => `var(${TOKEN[key] ?? TOKEN.gap})`;
const slugOf = id => id.slice(id.indexOf(':') + 1);

/** 흐름이 있는 슬롯(반복 항목)의 폭 구간별 규칙. n은 이 컴파일에서 슬롯에 들어간 항목 수. */
function flowRules(layout, slot, n, bi, sel) {
  const flow = slot.flow ?? {mode: 'stack'};
  const cap = flow.caps?.[bi] ?? 1, base = `${sel}[data-slot="${slot.name}"][data-count="${n}"]`;
  const gap = gapVar(layout.density.itemGap);
  // 폭 구간 규칙은 앞 구간 위에 쌓이므로(컨테이너 쿼리는 min-width) 구간마다 같은 속성을 모두 다시 적는다: 앞 구간의 값이 남아 새는 일이 없다.
  switch (flow.mode) {
    case 'grid': return `${base}{display:grid;grid-template-columns:repeat(${bestCols(n, cap)},minmax(0,1fr));gap:${gap}}`;
    case 'columns': return `${base}{display:block;column-count:${Math.max(1, Math.min(cap, n))};column-gap:${gap}}`;
    // 행(row): cap 1은 세로로 쌓고(칸 폭을 채움) 2는 가로로 나열하며 넘치면 줄바꿈한다(항목 자기 폭). 항목 폭을 나누지 않는 것은 버튼 묶음의 최소 폭이 슬롯보다 클 때 넘치지 않게 하려는 것이다.
    case 'row': return `${base}{display:flex;flex-direction:${cap > 1 ? 'row' : 'column'};flex-wrap:wrap;gap:${gapVar('near')};align-items:${cap > 1 ? 'center' : 'stretch'}}`
      + `${base}>.kit-lay-item{flex:0 1 auto;min-width:0}`;
    case 'bento': {
      const wide = cap >= 4, span = Math.min(2, cap);
      return `${base}{display:grid;grid-template-columns:repeat(${cap},minmax(0,1fr));gap:${gap};grid-auto-flow:row dense}`
        + `${base}>[data-tile=feature]{grid-column:span ${span};grid-row:${wide ? 'span 2' : 'auto'}}${base}>[data-tile=two]{grid-column:span ${span}}${base}>[data-tile=full]{grid-column:1/-1}`
        + `${base}>[data-tile=one]{grid-column:span 1}${base}>[data-tile=one][data-tail]{grid-column:${wide ? 'span 1' : '1/-1'}}`;
    }
    default: return `${base}{display:flex;flex-direction:column;gap:${gap}}`;
  }
}

/** 슬롯 한 개가 한 폭 구간에서 갖는 선언 표(속성 → 값). 구간마다 이 표를 만들어 앞 구간과 견준다. */
function slotDecls(slot, band, bi) {
  const d = {'grid-area': slot.name};
  const st = (slot.sticky ?? []).find(x => bi >= x.from && (x.until === undefined || bi < x.until));
  if (st) {
    d.position = 'sticky'; d[st.edge] = st.edge === 'bottom' ? '0' : gapVar('gap'); d['align-self'] = 'start';
    if (st.edge === 'bottom') Object.assign(d, {'z-index': '1', background: 'var(--kit-surface)', 'border-top': '1px solid var(--kit-border)', padding: 'var(--kit-sp-near) var(--kit-sp-item)'});
  }
  // 앞 슬롯의 아래쪽에 겹쳐 올라오는 패널(media-hero): 불투명한 표면 배경과 안쪽 여백으로 글 대비를 시각에 맡기지 않는다.
  if (band.pull?.[slot.name]) Object.assign(d, {'margin-top': `-${band.pull[slot.name]}rem`, position: 'relative', 'z-index': '1', background: 'var(--kit-surface)', padding: 'var(--kit-inset)', border: '1px solid var(--kit-border)'});
  if (band.stretch?.includes(slot.name)) d['align-self'] = 'stretch';
  if (band.start?.includes(slot.name)) d['align-self'] = 'start';
  if (slot.length === 'cap' && bi >= (slot.capFrom ?? 1)) Object.assign(d, {'max-height': 'min(70vh,40rem)', overflow: 'auto'});
  return d;
}
/** 앞 구간의 선언이 다음 구간에 없을 때 쓰는 되돌림 값(CSS 초기값). */
const SLOT_RESET = Object.freeze({position: 'static', top: 'auto', bottom: 'auto', 'align-self': 'auto', 'z-index': 'auto', background: 'none', 'border-top': '0', border: '0', padding: '0', 'margin-top': '0', 'max-height': 'none', overflow: 'visible'});

/** 한 레이아웃의 CSS. counts: {슬롯 이름: 항목 수}, present: 채워진 슬롯 이름 집합. 같은 입력이면 같은 바이트다. */
export function layoutCSS(layout, {counts = {}, present = new Set(layout.slots.map(s => s.name))} = {}) {
  const slug = slugOf(layout.id), sel = `.kit-lay[data-layout="${slug}"]`, grid = `${sel}>.kit-lay-grid`;
  const out = [`/* ${layout.id} (src/layout.mjs layoutCSS) */`, `${sel}{container:lay/inline-size}`];
  const gap = gapVar(layout.density.gap);
  out.push(`${grid}{display:grid;gap:${gap};min-width:0}`);
  LAYOUT_BANDS.forEach((from, bi) => {
    const band = layout.bands[bi], {areas, tracks} = bandForFilled(band, present);
    const names = new Set(areas.flat());
    const rules = [`${grid}{grid-template-columns:${tracks.map(trackCSS).join(' ')};grid-template-areas:${areas.map(r => `"${r.join(' ')}"`).join(' ')};justify-content:${band.align ?? 'normal'}}`];
    for (const slot of layout.slots) {
      if (!present.has(slot.name) || !names.has(slot.name)) continue;
      // 앞 구간과 달라진 선언만 쓰되, 앞 구간에 있던 선언이 이 구간에 없으면 되돌림 값(SLOT_RESET)을 쓴다.
      const now = slotDecls(slot, band, bi), before = bi === 0 ? {} : slotDecls(slot, layout.bands[bi - 1], bi - 1);
      const own = Object.keys({...before, ...now}).filter(k => (now[k] ?? SLOT_RESET[k]) !== (before[k] ?? (bi === 0 ? undefined : SLOT_RESET[k]))).map(k => `${k}:${now[k] ?? SLOT_RESET[k]}`);
      if (bi === 0 || own.length) rules.push(`${grid}>[data-slot="${slot.name}"]{${own.join(';')}}`);
      if (counts[slot.name] !== undefined) rules.push(flowRules(layout, slot, counts[slot.name], bi, grid + '>'));
    }
    out.push(bi === 0 ? rules.join('\n') : `@container lay (min-width:${from}px){\n${rules.join('\n')}\n}`);
  });
  const base = [`${grid}>[data-slot]{min-width:0;overflow-wrap:anywhere}`, `${grid} [data-slot] :is(img,svg,video,canvas){max-width:100%}`, `${grid}>[data-slot] .kit-lay-item{min-width:0}`];
  // 격자·벤토의 칸은 줄 높이를 채운다: 같은 줄의 이웃이 더 길어도 칸 아래가 비지 않게 칸 안의 카드가 남는 높이를 받는다(벽돌 배치는 자연 높이를 유지한다).
  if (layout.slots.some(s => ['grid', 'bento'].includes(s.flow?.mode))) base.push(...['grid', 'bento'].map(m => `${grid} [data-slot][data-flow=${m}]>.kit-lay-item{display:flex}${grid} [data-slot][data-flow=${m}]>.kit-lay-item>.pf{flex:1 1 auto;display:flex;flex-direction:column}${grid} [data-slot][data-flow=${m}]>.kit-lay-item>.pf>:first-child:last-child{flex:1 1 auto}`));
  if (layout.slots.some(s => s.flow?.mode === 'columns')) base.push(`${grid} [data-slot][data-flow=columns]>.kit-lay-item{break-inside:avoid;margin-bottom:${gapVar(layout.density.itemGap)}}`);
  for (const slot of layout.slots) if (slot.length === 'scroll-x') base.push(`${grid}>[data-slot="${slot.name}"]{overflow-x:auto}`);
  out.push(...base);
  return out.join('\n');
}

/** 채움(fills)이 슬롯 계약을 지키는지. fills: [{slot, html, purpose?, layout?}] (purpose는 `purpose:*`, 중첩 레이아웃이면 layout은 `layout:*`). */
export function validateFills(layout, fills, {depth = 0} = {}) {
  const out = [], err = (code, path, message) => out.push({code, path, message});
  const bySlot = new Map(layout.slots.map(s => [s.name, []]));
  fills.forEach((f, i) => {
    if (!bySlot.has(f?.slot)) { err('L_SLOT_UNKNOWN', `$.fills[${i}].slot`, `${layout.id}에 없는 슬롯: ${f?.slot}`); return; }
    if (typeof f.html !== 'string' || !f.html) { err('L_FILL_HTML', `$.fills[${i}].html`, '채움은 렌더된 HTML 문자열이어야 합니다'); return; }
    bySlot.get(f.slot).push({f, i});
  });
  for (const slot of layout.slots) {
    const list = bySlot.get(slot.name);
    if (slot.required && !list.length) err('L_SLOT_REQUIRED', `$.fills`, `필수 슬롯이 비었습니다: ${slot.name}`);
    if (list.length && list.length < slot.min) err('L_SLOT_MIN', `$.fills`, `${slot.name} 슬롯은 항목이 ${slot.min}개 이상이어야 합니다(현재 ${list.length})`);
    if (list.length > slot.max) err('L_SLOT_MAX', `$.fills`, `${slot.name} 슬롯은 항목이 ${slot.max}개 이하여야 합니다(현재 ${list.length})`);
    for (const {f, i} of list) {
      const kind = f.layout ?? f.purpose;
      const group = kind?.startsWith('purpose:') ? `group:${kind.slice('purpose:'.length).split('.')[0]}` : null;
      if (!kind || !(slot.accepts.includes(kind) || (group && slot.accepts.includes(group)))) err('L_SLOT_ACCEPTS', `$.fills[${i}]`, `${slot.name} 슬롯은 ${slot.accepts.join(', ')}만 받습니다(받은 값: ${kind ?? '없음'})`);
      if (f.layout) {
        if (!layout.nesting.allow.includes(f.layout)) err('L_NEST_FORBIDDEN', `$.fills[${i}]`, `${layout.id}는 ${f.layout}를 안에 둘 수 없습니다(허용: ${layout.nesting.allow.join(', ') || '없음'})`);
        if (depth + 1 >= layout.nesting.maxDepth) err('L_NEST_DEPTH', `$.fills[${i}]`, `${layout.id}의 중첩 깊이 한도(${layout.nesting.maxDepth})를 넘습니다`);
      }
    }
  }
  return out;
}

/** 슬롯 항목에 붙는 벤토 칸 크기 표지. 큰 칸은 시각 요소가 있는 첫 칸이다. */
function tileOf(n) {
  const plan = bentoPlan(Array.from({length: n}, (_, i) => ({type: 'card', visual: i === 0})));
  return plan.map(p => ({tile: p.cell, tail: p.tail}));
}

/**
 * 레이아웃 컴파일. layout은 `layout:*` 재료 기록, fills는 렌더된 조각 목록, opts: {density?}.
 * 반환: {ok, html, css, diagnostics, manifest}. 계약 위반이면 ok:false이고 html·css는 null이다(조용히 고치지 않는다).
 * DOM 순서는 슬롯 계약의 순서다. 폭이 넓어질 때의 재배치는 CSS grid-template-areas가 하고 DOM은 바뀌지 않는다.
 */
export function compileLayout(layout, fills, {density = layout.density.default} = {}) {
  const diagnostics = validateFills(layout, fills);
  if (!layout.density.allowed.includes(density)) diagnostics.push({code: 'L_DENSITY', path: '$.density', message: `${layout.id}는 ${density} 밀도를 받지 않습니다(허용: ${layout.density.allowed.join('·')})`});
  if (diagnostics.length) return {ok: false, html: null, css: null, diagnostics, manifest: null};
  const counts = {}, present = new Set();
  for (const f of fills) { counts[f.slot] = (counts[f.slot] ?? 0) + 1; present.add(f.slot); }
  const parts = layout.slots.filter(s => present.has(s.name)).map(slot => {
    const mine = fills.filter(f => f.slot === slot.name), n = mine.length;
    const tiles = slot.flow?.mode === 'bento' ? tileOf(n) : null;
    const items = mine.map((f, i) => `<div class="kit-lay-item" data-i="${i}"${tiles ? ` data-tile="${tiles[i].tile}"${tiles[i].tail ? ' data-tail' : ''}` : ''}>${f.html}</div>`).join('');
    const label = slot.tag === 'aside' ? ` aria-label="${escapeHTML(slot.label)}"` : '';
    return `<${slot.tag}${label} class="kit-lay-slot" data-slot="${slot.name}" data-count="${n}" data-flow="${slot.flow?.mode ?? 'stack'}">${items}</${slot.tag}>`;
  });
  const html = `<div class="kit-lay" data-layout="${slugOf(layout.id)}" data-density="${density}"><div class="kit-lay-grid">${parts.join('')}</div></div>`;
  const css = layoutCSS(layout, {counts, present});
  return {ok: true, html, css, diagnostics: [], manifest: {layout: layout.id, density, slots: layout.slots.filter(s => present.has(s.name)).map(s => ({name: s.name, count: counts[s.name]})), bands: LAYOUT_BAND_NAMES.map((name, i) => ({band: name, from: LAYOUT_BANDS[i], areas: bandForFilled(layout.bands[i], present).areas.map(r => r.join(' '))}))}};
}

/** 레이아웃 재료 기록의 구조 검사(데이터 파일이 등록 때 부른다). 폭 구간·영역·최소 폭·순서 선언의 일관성을 본다. [{code, path, message}] */
export function validateLayoutSpec(layout) {
  const out = [], err = (code, path, message) => out.push({code, path, message});
  const names = layout.slots.map(s => s.name);
  if (new Set(names).size !== names.length) err('P_LAYOUT_SLOT', '$.slots', '슬롯 이름이 겹칩니다');
  if (!layout.slots.some(s => s.required)) err('P_LAYOUT_SLOT', '$.slots', '필수 슬롯이 하나도 없습니다');
  layout.slots.forEach((s, i) => {
    const p = `$.slots[${i}]`;
    if (!/^[a-z][a-z0-9-]*$/.test(s.name)) err('P_LAYOUT_SLOT', p, `슬롯 이름은 kebab-case입니다: ${s.name}`);
    if (!LAYOUT_TAGS.includes(s.tag)) err('P_LAYOUT_SLOT', `${p}.tag`, `태그는 ${LAYOUT_TAGS.join('·')}입니다`);
    if (s.tag === 'aside' && !s.label) err('P_LAYOUT_SLOT', `${p}.label`, 'aside 슬롯은 landmark 이름(label)이 필요합니다');
    if (!Array.isArray(s.accepts) || !s.accepts.length || s.accepts.some(a => !/^(group:[a-z]+|purpose:[a-z]+\.[a-z]+|layout:[a-z0-9-]+)$/.test(a))) err('P_LAYOUT_ACCEPTS', `${p}.accepts`, '허용 콘텐츠는 group:<묶음>·purpose:<id>·layout:<id> 목록입니다');
    if (!Number.isInteger(s.min) || !Number.isInteger(s.max) || s.min < (s.required ? 1 : 0) || s.max < Math.max(s.min, 1)) err('P_LAYOUT_COUNT', p, `항목 수는 필수면 min≥1, max≥min입니다(min ${s.min}, max ${s.max})`);
    if (s.flow && !LAYOUT_FLOW_MODES.includes(s.flow.mode)) err('P_LAYOUT_FLOW', `${p}.flow.mode`, `흐름은 ${LAYOUT_FLOW_MODES.join('·')}입니다`);
    if (s.flow?.mode === 'row' && !(s.flow.caps ?? []).every(c => c === 1 || c === 2)) err('P_LAYOUT_FLOW', `${p}.flow.caps`, 'row 흐름의 caps는 1(세로)과 2(가로 나열)뿐입니다');
    if (s.flow && s.flow.mode !== 'stack' && !(Array.isArray(s.flow.caps) && s.flow.caps.length === LAYOUT_BANDS.length)) err('P_LAYOUT_FLOW', `${p}.flow.caps`, `caps는 폭 구간 수(${LAYOUT_BANDS.length})만큼 필요합니다`);
    if (s.flow?.mode === 'bento' && (s.min < 3 || s.max > 6)) err('P_LAYOUT_FLOW', p, '벤토 슬롯은 항목 3~6개입니다(BENTO 배치 표의 범위)');
    if (s.length !== undefined && !LAYOUT_LENGTH_POLICIES.includes(s.length)) err('P_LAYOUT_LENGTH', `${p}.length`, `길이 대응은 ${LAYOUT_LENGTH_POLICIES.join('·')}입니다`);
  });
  if (!Array.isArray(layout.bands) || layout.bands.length !== LAYOUT_BANDS.length) { err('P_LAYOUT_BANDS', '$.bands', `폭 구간은 ${LAYOUT_BANDS.length}개(${LAYOUT_BAND_NAMES.join('·')})입니다`); return out; }
  const declared = new Set(layout.reorders ?? []);
  let prevOrder = null;
  layout.bands.forEach((b, i) => {
    const p = `$.bands[${i}]`, areas = parseAreas(b.areas);
    if (!areas.length || areas.some(r => r.length !== b.columns.length)) { err('P_LAYOUT_AREAS', p, `영역 표의 열 수(${areas.map(r => r.length).join('/')})가 트랙 수(${b.columns.length})와 다릅니다`); return; }
    const used = new Set(areas.flat().filter(n => n !== '_'));
    for (const n of used) if (!names.includes(n)) err('P_LAYOUT_AREAS', p, `영역 표에 없는 슬롯 이름: ${n}`);
    for (const n of names) if (!used.has(n)) err('P_LAYOUT_AREAS', p, `슬롯 ${n}이 ${LAYOUT_BAND_NAMES[i]} 구간 표에 없습니다(내용을 숨기지 않는다)`);
    const broken = brokenAreas(areas);
    if (broken.length) err('P_LAYOUT_AREAS', p, `영역이 사각형이 아닙니다: ${broken.join(', ')}`);
    // 최소 폭: 이 구간이 시작하는 컨테이너 폭에서 트랙의 최소 폭 합과 간격이 들어가야 한다(들어가지 않으면 가로 넘침).
    const need = b.columns.reduce((a, t) => a + trackMin(t, layout.minCol), 0) + LAYOUT_MAX_GAP * (b.columns.length - 1);
    if (need > LAYOUT_BANDS[i] && i > 0) err('P_LAYOUT_MINWIDTH', p, `${LAYOUT_BAND_NAMES[i]} 구간(${LAYOUT_BANDS[i]}px)에 트랙 최소 폭 ${need}px이 들어가지 않습니다`);
    if (i === 0 && need > layout.minContent) err('P_LAYOUT_MINWIDTH', p, `xs 구간의 트랙 최소 폭 ${need}px이 minContent(${layout.minContent}px)보다 큽니다`);
    // 읽기 순서: DOM은 슬롯 선언 순서. 시각 순서가 달라지는 구간은 reorders에 선언해야 한다.
    const order = visualOrder(areas), same = order.length === names.length && order.every((n, k) => n === names[k]);
    if (!same && !declared.has(LAYOUT_BAND_NAMES[i])) err('P_LAYOUT_ORDER', p, `${LAYOUT_BAND_NAMES[i]} 구간의 시각 순서(${order.join('>')})가 DOM 순서(${names.join('>')})와 다른데 reorders에 선언하지 않았습니다`);
    if (same && declared.has(LAYOUT_BAND_NAMES[i])) err('P_LAYOUT_ORDER', p, `${LAYOUT_BAND_NAMES[i]} 구간은 순서가 같은데 reorders에 선언했습니다`);
    prevOrder = order;
  });
  void prevOrder;
  if (layout.minContent < 240 || layout.minContent > 360) err('P_LAYOUT_MINWIDTH', '$.minContent', '최소 콘텐츠 폭은 240~360px입니다(320px 화면의 콘텐츠 영역)');
  return out;
}
