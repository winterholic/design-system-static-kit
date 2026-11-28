/**
 * Table 목적 패밀리 3종(컴포넌트 패밀리 작업 소유): 업무형, 분석형, 고밀도.
 *
 * 표의 뼈대(헤더·정렬 버튼·선택 체크박스·상태 안내·가로 스크롤 영역·우선순위 열)와 런타임(attachTable)은 기반 컴포넌트 data-table이 소유한다.
 * 기반 표는 셀에 글자만 받으므로, 이 파일은 기반이 렌더한 마크업의 셀 안쪽만 바꾼다(상태 칩, 숫자 형식, 증감, 막대, 점 상태).
 * data-sort·data-select-row·data-sort-value·data-select-all·th aria-sort 같은 attachTable이 읽는 속성은 건드리지 않는다.
 * 합계 행(tfoot)과 머리글 정렬 방향 속성은 기반 마크업의 알려진 자리(`</tbody></table>`, 머리글 순서)에 더한다.
 */
import {icon} from '../../render/icon.mjs';
import {definePurposeFamily, e} from './kit.mjs';

const TABLE = 'base-component:data-table', BUTTON = 'base-component:button-control';
const NO_ROWS = ['empty', 'loading', 'error'];
const STATES = ['ready', 'partial', 'empty', 'loading', 'error'];
const TABLE_PARENTS = ['slot:main', 'slot:grid-item'];
const TONE_ICON = {success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle', info: 'info', neutral: 'minus'};

const fmt = (v, d = 0) => Number(v).toLocaleString('ko-KR', {maximumFractionDigits: d});
/** 음수·소수도 기반 정렬(Intl.Collator numeric)이 크기순으로 읽도록 양수 정수 문자열로 옮긴다. */
const sortKey = v => String(Math.round((Number(v) + 1e9) * 100));

const toneOf = t => (Object.hasOwn(TONE_ICON, t) ? t : 'neutral');
const chip = (tone, text) => `<span class="pf-status" data-tone="${tone}">${icon(TONE_ICON[tone] ?? TONE_ICON.neutral)}<span>${e(text)}</span></span>`;
const dotStatus = (tone, text) => `<span class="pf-dotstatus"><span class="pf-dot" data-tone="${tone}" aria-hidden="true"></span><span>${e(text)}</span></span>`;
const numberText = (col, v) => `<span class="pf-num">${e(col.prefix ?? '')}${fmt(v, col.digits ?? 0)}${e(col.unit ?? '')}</span>`;
function deltaCell(v) {
  const n = Number(v), dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
  const [ic, word, sign] = dir === 'up' ? ['trending-up', '증가', '+'] : dir === 'down' ? ['trending-down', '감소', '−'] : ['minus', '변동 없음', ''];
  return `<span class="pf-delta" data-dir="${dir}">${icon(ic)}<span class="pf-sr">${word} </span><span class="pf-num">${sign}${fmt(Math.abs(n), 1)}%</span></span>`;
}
const barCell = (v, bars) => {
  const n = Math.max(0, Math.min(100, Number(v)));
  return bars ? `<span class="pf-bar-cell"><span class="pf-bar" aria-hidden="true"><span style="width:${n}%"></span></span><span class="pf-num">${fmt(n, 1)}%</span></span>` : `<span class="pf-num">${fmt(n, 1)}%</span>`;
};

/** 열 종류별 셀 안쪽. 반환 null이면 기반이 렌더한 글자를 그대로 둔다. */
function cellInner(col, raw, {tones = {}, status = 'chip', bars = false}) {
  if (col.kind === 'number') return numberText(col, raw);
  if (col.kind === 'delta') return deltaCell(raw);
  if (col.kind === 'bar') return barCell(raw, bars);
  if (col.kind === 'status') { const tone = toneOf(tones[raw]); return status === 'dot' ? dotStatus(tone, raw) : chip(tone, raw); }
  return null;
}
const ENDS = new Set(['number', 'delta', 'bar']);

/**
 * 기반 표를 렌더하고 셀·머리글·합계를 덧입힌다. rows가 보이지 않는 상태(empty·loading·error)면 기반에는 빈 행을 준다.
 * 초기 정렬(sort)은 행을 미리 정렬하고 머리글에 aria-sort를 단다. 이후 정렬은 attachTable이 한다.
 */
function renderTable(ctx, {c, density, kinds, state, sortable, selectable, responsive = 'scroll', cell, footer = '', label}) {
  const columns = c.columns;
  if (!Array.isArray(columns)) throw new TypeError('열(columns)이 필요합니다');
  for (const col of columns) if (col.kind && !kinds.includes(col.kind)) throw new TypeError(`${col.id}: 이 패밀리가 쓰는 열 종류는 ${kinds.join('·')}입니다(${col.kind})`);
  const shows = state === 'ready' || state === 'partial';
  const ids = (c.rows ?? []).map(r => r.id).filter(x => x !== undefined);
  if (new Set(ids).size !== ids.length) throw new TypeError('행 id는 고유해야 합니다(선택·정렬이 행 id로 행을 구분합니다)');
  let rows = shows ? [...(c.rows ?? [])] : [];
  const sort = c.sort && shows ? c.sort : null;
  if (sort) {
    const col = columns.find(x => x.id === sort.column);
    if (!col) throw new TypeError(`정렬 열이 없습니다: ${sort.column}`);
    const k = ENDS.has(col.kind) ? r => Number(r[col.id]) : r => String(r[col.id]);
    const dir = sort.direction === 'descending' ? -1 : 1, coll = new Intl.Collator('ko', {numeric: true});
    rows.sort((a, b) => (ENDS.has(col.kind) ? k(a) - k(b) : coll.compare(k(a), k(b))) * dir);
  }
  const rowKind = columns.map(x => ({id: x.id, label: x.label, ...(x.sortable === false ? {sortable: false} : {}), ...(x.hideBelow ? {hideBelow: x.hideBelow} : {})}));
  let html = ctx.base(TABLE, {props: {density, sortable, selectable, responsive, state}, content: {id: ctx.uid('grid'), columns: rowKind, rows, message: c.message ?? '', selected: c.selected ?? []}});
  const seen = {};
  html = html.replace(/<td data-column="([a-z][a-z0-9-]*)" data-sort-value="([^"]*)" data-column-align="([a-z]+)" data-column-wrap="([a-z]+)"([^>]*)>([\s\S]*?)<\/td>/g, (m, id, sv, al, wr, rest, inner) => {
    const col = columns.find(x => x.id === id), i = seen[id] = (seen[id] ?? -1) + 1;
    const next = cell(col, rows[i]?.[id]);
    if (next === null && !ENDS.has(col.kind)) return m;
    const sortValue = ENDS.has(col.kind) ? sortKey(rows[i][id]) : sv;
    return `<td data-column="${id}" data-sort-value="${sortValue}" data-column-align="${ENDS.has(col.kind) ? 'end' : al}" data-column-wrap="${wr}"${rest}>${next ?? inner}</td>`;
  });
  html = html.replace(/<thead>[\s\S]*?<\/thead>/, seg => {
    let i = -(selectable ? 1 : 0);
    return seg.replace(/<th scope="col"/g, m => {
      const col = columns[i++];
      if (!col) return m;
      return `${m}${ENDS.has(col.kind) ? ' data-align="end"' : ''}${sort && sort.column === col.id ? ` aria-sort="${sort.direction === 'descending' ? 'descending' : 'ascending'}"` : ''}`;
    });
  });
  html = html.replace('aria-label="데이터 표"', `aria-label="${e(label)}"`);
  if (footer && shows) html = html.replace('</tbody></table>', `</tbody>${footer}</table>`);
  return html;
}

const headOf = (c, id) => `<header class="pf-table-head"><h3 id="${e(id)}">${e(c.title)}</h3>${c.note ? `<p>${e(c.note)}</p>` : ''}</header>`;

const TABLE_STATES = ['ready', 'partial', 'empty', 'loading', 'error', 'sorted', 'selected', 'hover', 'focus'];
const TABLE_CONTENT = {title: {required: true, type: 'string (표 이름: 영역의 접근 가능한 이름이 된다)'}, note: {type: 'string'}, columns: {required: true, type: '{id, label, kind?, sortable?, hideBelow?}[] (2~8)'}, rows: {required: true, type: '{id?, [열 id]: 값}[] (ready·partial에서 1개 이상)'}, sort: {type: '{column, direction: ascending|descending} (초기 정렬)'}, message: {type: 'string (상태 안내 문구)'}};
const TABLE_PAIRS = [
  ['--kit-text', '--kit-surface', 7, 'table title'], ['--kit-text', '--kit-card-hover', 7, 'table title on filled'], ['--kit-text', '--kit-canvas', 7, 'table title on canvas'],
  ['--kit-muted', '--kit-surface', 4.5, 'header·note'], ['--kit-muted', '--kit-card-hover', 4.5, 'header·note on filled'], ['--kit-muted', '--kit-canvas', 4.5, 'header·note on canvas'],
  ['--kit-danger', '--kit-canvas', 4.5, 'error state on canvas'],
];
const TONE_PAIRS = [['--kit-success', '--kit-surface', 3, 'status icon success'], ['--kit-warning', '--kit-surface', 3, 'status icon warning'], ['--kit-danger', '--kit-surface', 3, 'status icon danger'], ['--kit-info', '--kit-surface', 3, 'status icon info'], ['--kit-muted', '--kit-surface', 3, 'status icon neutral']];
const BAND = 'mix(--kit-text 7%, --kit-surface)';
const DOT_PAIRS = ['success', 'warning', 'danger', 'info', 'muted'].map(t => [`--kit-${t}`, BAND, 3, `status dot ${t} on zebra`]);
const SORT_INTERACTION = {on: '머리글 버튼 click·Enter·Space', behavior: '그 열로 정렬하고 같은 버튼을 다시 누르면 방향이 바뀐다(머리글 aria-sort, 숫자 열은 크기순)', runtime: 'attachTable'};
const SELECT_INTERACTION = {on: '행 체크박스·전체 선택 change', behavior: '행 선택과 전체 선택을 전환한다(선택된 행은 data-selected 배경으로 표시)', runtime: 'attachTable'};
const NO_ROWS_RULES = (prefix, extra = []) => [
  {id: `${prefix}_NO_ROWS_SORT`, when: {state: NO_ROWS, sortable: true}, why: '행을 보이지 않는 상태(empty·loading·error)에서는 정렬할 대상이 없다(기반 계약 TABLE_NO_ROWS_SORT)'},
  ...extra,
];

// 공통 CSS(sharedCss): 표 머리·스크롤 영역의 시각 언어, 정렬 방향 표시, 숫자, 상태 칩과 점, 선택 행 배경.
const SHARED = `.pf-table{--pf-th-bg:var(--pf-surface);--pf-state-bg:var(--kit-surface);--pf-band:color-mix(in srgb,var(--kit-text) 7%,var(--kit-surface));display:grid;grid-template-columns:minmax(0,1fr);gap:var(--kit-sp-head) var(--kit-gap);min-width:0;font-family:var(--kit-font)}[data-family=editorial] .pf-table{--pf-th-bg:var(--kit-canvas);--pf-state-bg:var(--kit-canvas)}.pf-table-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--kit-sp-tight) var(--kit-sp-item);min-width:0}.pf-table-head h3,.pf-table-title{margin:0;color:var(--kit-text);font-family:var(--kit-heading);font-size:max(16px,var(--kit-t-sub));font-weight:var(--pf-title-weight);line-height:1.25;word-break:keep-all;overflow-wrap:anywhere}.pf-table-head p{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small);word-break:keep-all;overflow-wrap:anywhere}.pf-table .kit-data-table{min-width:0}.pf-table .kit-table-scroll:focus-visible{outline:3px solid var(--kit-focus);outline-offset:-3px}.pf-table .kit-table-scroll{position:relative;border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-th-bg);box-shadow:var(--kit-shadow)}[data-family=editorial] .pf-table .kit-table-scroll{border-radius:0;border-block:var(--pf-rule)}.pf-table .kit-data-table thead th{z-index:1;border-bottom:var(--pf-rule);background:var(--pf-th-bg);text-transform:var(--pf-label-case);letter-spacing:var(--pf-label-track);white-space:nowrap}.pf-table .kit-table-state{border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-state-bg)}.pf-table .kit-table-state{padding:var(--pf-pad)}.pf-table .kit-table-state+.kit-table-scroll{margin-top:var(--kit-sp-near)}.pf-table .kit-data-table :is(td,th){word-break:keep-all;overflow-wrap:break-word}.pf-table th[data-align=end]{text-align:end}.pf-table td[data-column-align=end]{white-space:nowrap}.pf-table .kit-data-table tbody tr:has([data-select-row]:checked){background:var(--kit-table-selected,var(--kit-soft))}.pf-table [data-sort]::after{content:'↕' / '';margin-inline-start:var(--kit-sp-tight);color:var(--kit-muted);font-weight:400}.pf-table th[aria-sort=ascending] [data-sort]::after{content:'↑' / '';color:var(--kit-text);font-weight:700}.pf-table th[aria-sort=descending] [data-sort]::after{content:'↓' / '';color:var(--kit-text);font-weight:700}.pf-table [data-sort]{min-height:24px;padding-inline:0}.pf-num{white-space:nowrap;font-variant-numeric:tabular-nums}.pf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}[data-tone=success]{--pf-tone:var(--kit-success)}[data-tone=warning]{--pf-tone:var(--kit-warning)}[data-tone=danger]{--pf-tone:var(--kit-danger)}[data-tone=info]{--pf-tone:var(--kit-info)}[data-tone=neutral]{--pf-tone:var(--kit-muted)}.pf-status{display:inline-flex;align-items:center;gap:var(--kit-sp-tight);padding:2px var(--kit-sp-near);border:1px solid var(--pf-tone);border-radius:calc(var(--kit-radius) * .6);color:var(--kit-text);font-size:var(--kit-t-caption);font-weight:600;line-height:1.4;white-space:nowrap}.pf-status .kit-icon{width:14px;height:14px;flex:none;color:var(--pf-tone)}.pf-dotstatus{display:inline-flex;align-items:center;gap:var(--kit-sp-near);white-space:nowrap}.pf-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--pf-tone)}`;

/* ---------- 업무형 ---------- */
export const tableBusiness = definePurposeFamily({
  id: 'purpose:table.business', group: 'table', sharedCss: SHARED, label: '업무형 표',
  purpose: '주문·결재·고객 같은 업무 목록을 선택(체크박스)·정렬(머리글 버튼)·상태 칩으로 다루는 표다. 툴바에 제목과 선택 건수, 선택 항목 일괄 동작을 둔다.',
  contexts: ['dashboard', 'data', 'listing'], bases: [TABLE, BUTTON], children: [TABLE, BUTTON],
  entry: {module: 'src/platform/families/table.mjs', export: 'renderTableBusiness'},
  variants: {toolbar: ['none', 'bulk']}, props: {density: ['comfortable', 'spacious'], state: STATES, sortable: [true, false], selectable: [true, false], responsive: ['scroll', 'priority']},
  defaults: {toolbar: 'bulk', density: 'comfortable', state: 'ready', sortable: true, selectable: true, responsive: 'scroll'},
  content: {...TABLE_CONTENT, tones: {type: '{상태 글자: success|warning|danger|info|neutral} (kind=status 열의 칩 색)'}, selected: {type: 'string[] (처음부터 선택된 행 id)'}, bulkActions: {type: '{label, tone?: danger}[] (toolbar=bulk, 1~3)'}},
  forbidden: [
    ...NO_ROWS_RULES('BUSINESS', [{id: 'BUSINESS_NO_ROWS_SELECT', when: {state: NO_ROWS, selectable: true}, why: '행을 보이지 않는 상태(empty·loading·error)에서는 선택할 대상이 없다(기반 계약 TABLE_NO_ROWS_SELECT)'}]),
    {id: 'BUSINESS_BULK_NO_SELECT', when: {toolbar: 'bulk', selectable: false}, why: '일괄 동작은 선택된 행이 대상이라, 체크박스가 없으면 동작을 적용할 대상을 정할 수 없다'},
  ],
  needs: {}, states: TABLE_STATES,
  interactions: [
    SORT_INTERACTION, SELECT_INTERACTION,
    {on: '행 선택 변경', behavior: '툴바의 선택 건수가 갱신되고 일괄 동작 버튼은 선택이 있을 때만 나타난다(CSS :has와 카운터, 스크립트 없음)'},
    {on: '일괄 동작 버튼 click', behavior: '앱이 onPress 콜백으로 선택된 행(attachTable의 selectionChange)에 적용한다', runtime: 'attachButton'},
  ],
  responsive: {strategy: 'container+viewport', breakpoints: ['640px', '800px'], behavior: '표는 .kit-table-scroll 안에서만 가로 스크롤한다. responsive=priority는 hideBelow가 지정된 열을 숨기고 640px 이하에서 셀에 열 이름을 함께 보인다. 툴바는 640px 이하에서 제목 → (건수·동작) 두 줄이 된다.'},
  a11y: {role: 'table(region 안, 영역 이름은 title)', keyboard: 'Tab으로 스크롤 영역·머리글 버튼·체크박스, Enter·Space로 정렬, Space로 선택', conditions: ['정렬 방향은 머리글 aria-sort와 화살표 글자로 전달한다', '상태는 색 + 글자 + 아이콘 칩이다(색만으로 전달하지 않는다)', '행 체크박스는 첫 열 값으로 이름이 붙는다("A-1042 선택")', '숫자 열은 오른쪽 정렬, tabular-nums, 줄바꿈하지 않는다']},
  pairs: [...TABLE_PAIRS, ...TONE_PAIRS, ['--kit-text', '--kit-surface', 7, 'status chip text'], ['--kit-text', '--kit-soft', 4.5, 'selected row']],
  parents: TABLE_PARENTS,
  example: {variant: {toolbar: 'bulk'}, props: {density: 'comfortable', state: 'ready', sortable: true, selectable: true, responsive: 'priority'}, content: {
    title: '최근 주문', selected: ['r-2'], sort: {column: 'amount', direction: 'descending'}, bulkActions: [{label: '송장 출력'}, {label: '주문 취소', tone: 'danger'}],
    tones: {'결제 완료': 'success', '배송 중': 'info', '결제 대기': 'warning', '환불 요청': 'danger'},
    columns: [{id: 'order', label: '주문 번호'}, {id: 'customer', label: '고객', hideBelow: '640px'}, {id: 'amount', label: '금액', kind: 'number', prefix: '₩'}, {id: 'status', label: '상태', kind: 'status'}, {id: 'date', label: '주문일', hideBelow: '800px'}],
    rows: [
      {id: 'r-1', order: 'A-1042', customer: '김민지', amount: 128000, status: '결제 완료', date: '2026-11-21'},
      {id: 'r-2', order: 'A-1043', customer: '이도윤', amount: 54000, status: '배송 중', date: '2026-11-21'},
      {id: 'r-3', order: 'A-1044', customer: '박서준', amount: 312500, status: '결제 대기', date: '2026-11-20'},
      {id: 'r-4', order: 'A-1045', customer: '최하은', amount: 89000, status: '환불 요청', date: '2026-11-19'},
      {id: 'r-5', order: 'A-1046', customer: '정우진', amount: 21900, status: '결제 완료', date: '2026-11-19'},
    ]}},
  render(ctx) { return renderTableBusiness(ctx); },
  css: `.pf-table-business[data-toolbar=bulk]{grid-template-columns:minmax(0,1fr) auto auto;align-items:center;counter-reset:pf-sel}.pf-table-business[data-toolbar=bulk]>.pf-table-title{grid-area:1/1}.pf-table-business[data-toolbar=bulk]>.pf-table-count{grid-area:1/2}.pf-table-business[data-toolbar=bulk]>.pf-bulk{grid-area:1/3}.pf-table-business[data-toolbar=bulk]>.kit-data-table{grid-area:2/1/3/-1}.pf-table-count{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small);font-variant-numeric:tabular-nums;white-space:nowrap}.pf-table-count::before{content:counter(pf-sel) '건 선택' / ''}.pf-table-business .kit-data-table tbody tr:has([data-select-row]:checked){counter-increment:pf-sel}.pf-bulk{display:flex;gap:var(--kit-sp-near)}.pf-bulk .kit-ctl-button{white-space:nowrap}.pf-table-business:not(:has([data-select-row]:checked)) .pf-bulk{visibility:hidden}@media(max-width:640px){.pf-table .kit-data-table[data-responsive=priority] td::before{display:block;white-space:nowrap;font-size:var(--kit-t-caption)}.pf-table .kit-data-table[data-responsive=priority] td{white-space:nowrap}.pf-table-business[data-toolbar=bulk]{grid-template-columns:minmax(0,1fr) auto}.pf-table-business[data-toolbar=bulk]>.pf-table-title{grid-area:1/1/2/-1}.pf-table-business[data-toolbar=bulk]>.pf-table-count{grid-area:2/1}.pf-table-business[data-toolbar=bulk]>.pf-bulk{grid-area:2/2}.pf-table-business[data-toolbar=bulk]>.kit-data-table{grid-area:3/1/4/-1}}@media(max-width:480px){.pf-table-business .kit-table-scroll table{min-width:46rem}.pf-table-business .kit-table-scroll td[data-column-wrap=words]{min-width:16rem;overflow-wrap:normal}}`,
});
export function renderTableBusiness(ctx) {
  const {content: c, variant: v, props: p} = ctx, tid = ctx.uid('title');
  const table = renderTable(ctx, {c, density: p.density, kinds: ['text', 'number', 'status'], state: p.state, sortable: p.sortable, selectable: p.selectable, responsive: p.responsive, label: c.title, cell: (col, raw) => cellInner(col, raw, {tones: c.tones, status: 'chip'})});
  if (v.toolbar !== 'bulk') return `<div class="pf-table pf-table-business" data-toolbar="none">${table}</div>`;
  if (!Array.isArray(c.bulkActions) || c.bulkActions.length < 1 || c.bulkActions.length > 3) throw new TypeError('일괄 동작(bulkActions)은 1~3개입니다');
  const bulk = c.bulkActions.map(a => (a.tone === 'danger'
    ? ctx.base(BUTTON, {props: {appearance: ctx.visual.recipe.secondary, tone: 'danger', size: 'small'}, content: {label: a.label}})
    : ctx.button('secondary', {props: {size: 'small'}, content: {label: a.label}}))).join('');
  // DOM 순서는 [제목, 일괄 동작, 표, 건수]다: CSS 카운터는 문서 순서로 세므로 건수가 표 뒤에 있어야 선택된 행을 센다. 화면에서는 grid-area로 툴바 줄에 놓는다.
  return `<div class="pf-table pf-table-business" data-toolbar="bulk"><h3 class="pf-table-title" id="${e(tid)}">${e(c.title)}</h3><div class="pf-bulk" role="group" aria-label="선택 항목 일괄 동작">${bulk}</div>${table}<p class="pf-table-count" aria-hidden="true"></p></div>`;
}

/* ---------- 분석형 ---------- */
export const tableAnalytic = definePurposeFamily({
  id: 'purpose:table.analytic', group: 'table', sharedCss: SHARED, label: '분석형 표',
  purpose: '채널·상품별 수치를 비교한다. 숫자 열은 오른쪽 정렬이고 전월 대비 증감(아이콘+부호+글자), 인라인 막대(값 글자 병기), 합계 행을 갖고 머리글은 스크롤해도 고정된다.',
  contexts: ['dashboard', 'data'], bases: [TABLE], children: [TABLE],
  entry: {module: 'src/platform/families/table.mjs', export: 'renderTableAnalytic'},
  variants: {summary: ['none', 'footer'], bars: ['none', 'inline']}, props: {density: ['comfortable', 'spacious'], state: STATES, sortable: [true, false]},
  defaults: {summary: 'footer', bars: 'inline', density: 'comfortable', state: 'ready', sortable: true},
  content: {...TABLE_CONTENT, totals: {type: '{열 id: 합계 값} (summary=footer)'}, totalLabel: {type: 'string (기본 합계)'}},
  forbidden: [
    ...NO_ROWS_RULES('ANALYTIC', [{id: 'ANALYTIC_NO_ROWS_SUMMARY', when: {state: NO_ROWS, summary: 'footer'}, why: '합계 행은 보이는 행을 합산한 값이라, 행을 보이지 않는 상태(empty·loading·error)에서는 합계만 남아 근거가 없다'}]),
  ],
  needs: {}, states: TABLE_STATES,
  interactions: [SORT_INTERACTION, {on: 'scroll', behavior: '표 영역을 세로로 스크롤해도 머리글이 위에 고정된다(position:sticky, 영역 최대 높이 22rem)'}],
  responsive: {strategy: 'container', breakpoints: ['640px'], behavior: '표는 .kit-table-scroll 안에서만 가로·세로로 스크롤한다. 숫자 열은 줄바꿈하지 않아 폭이 줄면 영역 안에서 스크롤된다.'},
  a11y: {role: 'table(region 안, 영역 이름은 title)', keyboard: 'Tab으로 스크롤 영역·머리글 버튼, Enter·Space로 정렬', conditions: ['증감은 아이콘 + 부호 + 글자이고 숨은 글(증가·감소)이 붙는다(색만으로 전달하지 않는다)', '막대는 장식(aria-hidden)이고 같은 값이 글자로 병기된다', '합계 행은 tfoot의 th scope=row 합계로 시작한다', '숫자 열 머리글도 오른쪽 정렬']},
  pairs: [...TABLE_PAIRS, ['--kit-success', '--kit-surface', 3, 'delta icon up'], ['--kit-danger', '--kit-surface', 3, 'delta icon down'], ['--kit-action', '--kit-sunken', 3, 'bar fill'], ['--kit-text', BAND, 4.5, 'summary row']],
  parents: TABLE_PARENTS,
  example: {variant: {summary: 'footer', bars: 'inline'}, props: {density: 'comfortable', state: 'ready', sortable: true}, content: {
    title: '채널별 매출', note: '단위: 원, 전월 대비', sort: {column: 'revenue', direction: 'descending'}, totals: {revenue: 14820000, orders: 4120, change: 5.2, share: 100},
    columns: [{id: 'channel', label: '채널'}, {id: 'revenue', label: '매출', kind: 'number', prefix: '₩'}, {id: 'orders', label: '주문', kind: 'number', unit: '건'}, {id: 'change', label: '전월 대비', kind: 'delta'}, {id: 'share', label: '비중', kind: 'bar'}],
    rows: [
      {channel: '자사몰', revenue: 6240000, orders: 1720, change: 12.4, share: 42.1},
      {channel: '앱', revenue: 4310000, orders: 1190, change: 8.9, share: 29.1},
      {channel: '마켓플레이스', revenue: 2580000, orders: 760, change: -3.1, share: 17.4},
      {channel: '오프라인', revenue: 1130000, orders: 310, change: 0, share: 7.6},
      {channel: '제휴', revenue: 560000, orders: 140, change: -9.6, share: 3.8},
    ]}},
  render(ctx) { return renderTableAnalytic(ctx); },
  css: `.pf-table-analytic .kit-table-scroll{max-height:22rem}.pf-bar-cell{display:flex;align-items:center;gap:var(--kit-sp-near);min-width:8rem}.pf-bar{flex:1 1 auto;min-width:3rem;height:8px;overflow:hidden;border-radius:999px;background:var(--kit-sunken)}.pf-bar>span{display:block;height:100%;background:var(--kit-action)}.pf-bar-cell .pf-num{flex:none;min-width:3.5em;text-align:end}.pf-delta{display:inline-flex;align-items:center;gap:var(--kit-sp-tight);white-space:nowrap}.pf-delta .kit-icon{width:16px;height:16px;flex:none}.pf-delta[data-dir=up] .kit-icon{color:var(--kit-success)}.pf-delta[data-dir=down] .kit-icon{color:var(--kit-danger)}.pf-table-analytic tfoot :is(th,td){border-top:var(--pf-rule);border-bottom:0;background:var(--pf-band);color:var(--kit-text);font-weight:700;text-align:start}.pf-table-analytic tfoot td[data-column-align=end]{text-align:end}`,
});
export function renderTableAnalytic(ctx) {
  const {content: c, variant: v, props: p} = ctx, hid = ctx.uid('title');
  const columns = c.columns ?? [];
  const bars = v.bars === 'inline';
  const footer = v.summary === 'footer' ? `<tfoot><tr>${columns.map((col, i) => {
    if (i === 0) return `<th scope="row" data-column="${e(col.id)}">${e(c.totalLabel ?? '합계')}</th>`;
    const raw = c.totals?.[col.id];
    const inner = raw === undefined ? '' : cellInner(col, raw, {bars: false}) ?? e(raw);
    return `<td data-column="${e(col.id)}" data-column-align="${ENDS.has(col.kind) ? 'end' : 'start'}">${inner}</td>`;
  }).join('')}</tr></tfoot>` : '';
  const table = renderTable(ctx, {c, density: p.density, kinds: ['text', 'number', 'delta', 'bar'], state: p.state, sortable: p.sortable, selectable: false, label: c.title, footer, cell: (col, raw) => cellInner(col, raw, {bars})});
  return `<div class="pf-table pf-table-analytic" data-summary="${v.summary}" data-bars="${v.bars}">${headOf(c, hid)}${table}</div>`;
}

/* ---------- 고밀도 ---------- */
export const tableDense = definePurposeFamily({
  id: 'purpose:table.dense', group: 'table', sharedCss: SHARED, label: '고밀도 표',
  purpose: '로그·재고·작업 큐처럼 한 화면에 행을 많이 보려는 표다. 셀 패딩을 최소로 줄이고 숫자는 모노·tabular-nums, 상태는 점 + 글자 약식으로 보인다. 줄무늬와 고정 머리를 켤 수 있다.',
  contexts: ['dashboard', 'data'], bases: [TABLE], children: [TABLE],
  entry: {module: 'src/platform/families/table.mjs', export: 'renderTableDense'},
  variants: {zebra: ['off', 'on'], stickyHead: ['off', 'on']}, props: {state: STATES, sortable: [true, false], selectable: [false, true]},
  defaults: {zebra: 'on', stickyHead: 'on', state: 'ready', sortable: true, selectable: false},
  content: {...TABLE_CONTENT, tones: {type: '{상태 글자: success|warning|danger|info|neutral} (kind=status 열의 점 색)'}, selected: {type: 'string[] (처음부터 선택된 행 id)'}},
  forbidden: [
    ...NO_ROWS_RULES('DENSE', [{id: 'DENSE_NO_ROWS_SELECT', when: {state: NO_ROWS, selectable: true}, why: '행을 보이지 않는 상태(empty·loading·error)에서는 선택할 대상이 없다(기반 계약 TABLE_NO_ROWS_SELECT)'}]),
  ],
  needs: {visual: {maxCellPadY: 8}}, states: TABLE_STATES,
  interactions: [SORT_INTERACTION, SELECT_INTERACTION, {on: 'scroll', behavior: 'stickyHead=on이면 표 영역(최대 높이 24rem)을 스크롤해도 머리글이 위에 고정된다(position:sticky)'}],
  responsive: {strategy: 'container', breakpoints: ['640px'], behavior: '표는 .kit-table-scroll 안에서만 가로·세로로 스크롤한다. 셀은 줄바꿈하지 않아 행 높이가 일정하다.'},
  a11y: {role: 'table(region 안, 영역 이름은 title)', keyboard: 'Tab으로 스크롤 영역·머리글 버튼·체크박스, Enter·Space로 정렬', conditions: ['상태는 점(색) + 글자라 색만으로 전달하지 않는다', '행 높이가 작아도 머리글 버튼과 체크박스는 24px 이상 터치 대상을 갖는다', '줄무늬 배경에서도 글자 대비 4.5:1', '숫자 열은 오른쪽 정렬, 모노, tabular-nums']},
  pairs: [...TABLE_PAIRS, ...TONE_PAIRS, ...DOT_PAIRS, ['--kit-text', BAND, 4.5, 'zebra row'], ['--kit-text', '--kit-soft', 4.5, 'selected row']],
  parents: TABLE_PARENTS,
  example: {variant: {zebra: 'on', stickyHead: 'on'}, props: {state: 'ready', sortable: true, selectable: false}, content: {
    title: '작업 큐', note: '최근 갱신순', tones: {'실행 중': 'info', '완료': 'success', '실패': 'danger', '대기': 'neutral'},
    columns: [{id: 'job', label: '작업'}, {id: 'status', label: '상태', kind: 'status'}, {id: 'duration', label: '소요', kind: 'number', unit: 'ms'}, {id: 'rows', label: '처리 행', kind: 'number'}, {id: 'node', label: '노드'}],
    rows: [
      {job: 'sync-orders', status: '완료', duration: 842, rows: 12840, node: 'w-01'},
      {job: 'sync-users', status: '실행 중', duration: 1290, rows: 4310, node: 'w-02'},
      {job: 'rebuild-index', status: '실패', duration: 30210, rows: 0, node: 'w-03'},
      {job: 'export-report', status: '대기', duration: 0, rows: 0, node: 'w-01'},
      {job: 'cleanup-temp', status: '완료', duration: 211, rows: 960, node: 'w-04'},
      {job: 'sync-stock', status: '완료', duration: 655, rows: 7720, node: 'w-02'},
      {job: 'send-digest', status: '완료', duration: 1904, rows: 2210, node: 'w-03'},
      {job: 'archive-logs', status: '실행 중', duration: 4410, rows: 51200, node: 'w-04'},
    ]}},
  render(ctx) { return renderTableDense(ctx); },
  css: `.pf-table-dense .kit-data-table{font-size:var(--kit-t-small)}.pf-table-dense .kit-data-table :is(th,td){padding:var(--kit-sp-tight) var(--kit-sp-near);line-height:1.35;white-space:nowrap}.pf-table-dense td[data-column-align=end]{font-family:var(--kit-mono)}.pf-table-dense input[type=checkbox]{width:16px;height:16px;margin:0}.pf-table-dense[data-sticky-head=on] .kit-table-scroll{max-height:24rem}.pf-table-dense[data-zebra=on] .kit-data-table tbody tr:nth-child(even){background:var(--pf-band)}.pf-table-dense[data-zebra=on] .kit-data-table tbody tr:nth-child(even):hover{background:var(--kit-soft)}.pf-table-dense[data-zebra=on] .kit-data-table tbody tr:has([data-select-row]:checked){background:var(--kit-table-selected,var(--kit-soft))}`,
});
export function renderTableDense(ctx) {
  const {content: c, variant: v, props: p} = ctx, hid = ctx.uid('title');
  const table = renderTable(ctx, {c, density: 'compact', kinds: ['text', 'number', 'status'], state: p.state, sortable: p.sortable, selectable: p.selectable, label: c.title, cell: (col, raw) => cellInner(col, raw, {tones: c.tones, status: 'dot'})});
  return `<div class="pf-table pf-table-dense" data-zebra="${v.zebra}" data-sticky-head="${v.stickyHead}">${headOf(c, hid)}${table}</div>`;
}

export const TABLE_FAMILIES = Object.freeze([tableBusiness, tableAnalytic, tableDense]);
