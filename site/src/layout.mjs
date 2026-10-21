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
  for (const [, n, cap, kind] of html.matchAll(/data-flow data-n="(\d+)" data-cap="(\d)"( data-dense| data-span)?/g)) used.add((kind ? kind.trim().slice(5) : 'plain') + '|' + cap + '|' + n);
  return used;
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
  // 항목이 13개 이상인 흐름은 이 규칙의 대상 밖이라 표지를 달지 않는다.
  out.push('[data-flow]{display:grid}[data-flow]>*{min-width:0}');
  return out.join('\n');
}

/** 시각 요소(그림·차트·미디어 카드)가 있는 칸. 이런 칸만 2×2로 키운다: 글만 있는 칸을 키우면 위가 텅 빈다(진단 EMPTY_CELL). */
export const isVisualCell = c => c.type === 'media' || c.type === 'chart' || (c.type === 'card' && !!(c.visual || c.variant === 'media'));

/** 벤토 배치 표. 4열 격자에서 칸마다 가로 칸 수(span). 큰 칸(F)은 2×2이고 항상 첫 칸이다.
 *  F 뒤 m칸: 2→[2,2] · 3→[1,1,2] · 4→[1,1,1,1] · 5→[1,1,1,1,4]. 큰 칸이 없으면 3→[1,1,2] · 4→[2,2,2,2] · 5→[2,2,1,1,2] · 6→[2,2,1,1,1,1]. 모든 줄이 4열을 채운다. */
const BENTO_AFTER_FEATURE = {2: [2, 2], 3: [1, 1, 2], 4: [1, 1, 1, 1], 5: [1, 1, 1, 1, 4]};
const BENTO_FLAT = {3: [1, 1, 2], 4: [2, 2, 2, 2], 5: [2, 2, 1, 1, 2], 6: [2, 2, 1, 1, 1, 1]};
export function bentoPlan(children) {
  const f = children.findIndex(isVisualCell);
  const order = children.map((_, i) => i);
  if (f > 0) { order.splice(f, 1); order.unshift(f); }
  const spans = f >= 0 ? ['F', ...(BENTO_AFTER_FEATURE[children.length - 1] ?? [])] : (BENTO_FLAT[children.length] ?? []);
  // 2열 모드(컨테이너 720px 미만)에서 1칸짜리가 홀수 개면 마지막 1칸이 줄 전체를 쓴다.
  const ones = spans.map((x, i) => x === 1 ? i : -1).filter(i => i >= 0);
  const tail = ones.length % 2 === 1 ? ones.at(-1) : -1;
  return order.map((index, i) => ({index, cell: spans[i] === 'F' ? 'feature' : spans[i] === 1 ? 'one' : spans[i] === 2 ? 'two' : 'full', tail: i === tail}));
}

// ---------- CSS lint ----------
/** `repeat(N,…)`·`repeat(auto-fit,…)`로 같은 크기 칸을 늘어놓는 격자는 흐름(flow) 원시 요소의 일이다. 아래 선택자만 직접 선언할 수 있고, 나머지 부품은 흐름 표지(data-flow)를 쓴다.
 *  앞쪽은 흐름의 기본값(CSS 미지원 환경의 대체값)이고, 뒤쪽은 항목 수가 정해져 있는 구조 틀(폼 필드·메가메뉴·히어로 수치·달력 …)이다. */
export const EQUAL_COLUMNS_OK = [
  '.kit-grid', '.kit-plans', '.kit-features', '.kit-gallery', '.kit-steps[data-layout=horizontal]', '.kit-team', '.kit-menu', '.kit-bento', '.kit-split',
  '.kit-profile-stats', '.kit-hero-facts', '.kit-mega-panel', '.kit-form', '.kit-choice', '.kit-calendar', '.kit-cal-',
];
/** CSS 텍스트에서 허용 목록 밖의 반복 격자 선언을 찾는다. [{selector, value}] */
export function lintLayout(css) {
  const out = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim().replace(/\s+/g, ' ');
    if (sel.startsWith('@') || sel.startsWith('/*')) continue;
    for (const decl of body.split(/;(?![^(]*\))/)) {
      const i = decl.indexOf(':'); if (i < 0) continue;
      if (decl.slice(0, i).trim() !== 'grid-template-columns') continue;
      const value = decl.slice(i + 1).replace(/!important/, '').trim();
      if (!/^repeat\(/.test(value)) continue;
      if (/data-flow/.test(sel) || EQUAL_COLUMNS_OK.some(s => sel.includes(s))) continue;
      out.push({selector: sel.slice(0, 80), value: value.slice(0, 60)});
    }
  }
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

## 강제 지점

| 지점 | 무엇을 막나 | 파일 |
|---|---|---|
| 생성 CSS | 항목 수·폭 조합마다 한 칸만 남는 열 수 | \`flowCSS\`, \`tests/layout.test.mjs\` |
| 구성 변형 | 항목 수와 맞지 않는 열 수 옵션(3개를 2열로) | \`src/catalog/variants.mjs\` \`fits\` |
| 렌더 실측 | 실제 화면의 고아 줄 | \`scripts/design-qa/layout-probe.mjs\` \`GRID_ORPHAN\` |
`;
}
