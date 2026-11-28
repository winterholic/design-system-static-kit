/** §6.2 G 데이터 표시: 표 기반 패턴과 트리·검사기·로그·diff 패턴. */
import {definePurposeFamily, e} from './kit.mjs';

const TABLE = 'base-component:data-table';
const CARD = 'base-component:card-surface';
const PARENTS = ['slot:main', 'slot:grid-item'];
const STATES = ['ready', 'partial', 'empty', 'loading', 'error'];
const TABLE_CSS = `.pf-data-view{min-width:0;max-width:100%;color:var(--kit-text);font-family:var(--kit-font)}.pf-data-view h3{margin:0 0 var(--kit-sp-near);font:var(--pf-title-weight) max(16px,var(--kit-t-sub))/1.25 var(--kit-heading);overflow-wrap:anywhere}.pf-data-view p{margin:0;overflow-wrap:anywhere}.pf-data-view label{display:grid;gap:var(--kit-sp-tight);min-width:0;color:var(--kit-muted)}.pf-data-view input[type=search]{box-sizing:border-box;min-height:44px;max-width:100%;padding:var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font:inherit}.pf-data-view :is(button,summary,input):focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.pf-data-view .pf-live{min-height:1.5em;color:var(--kit-muted)}.pf-data-view [data-filter-empty]{padding:var(--kit-sp-item);color:var(--kit-muted)}.pf-data-view .kit-table-scroll{max-width:100%}.pf-data-view .pf-group-row th{padding:var(--kit-sp-near);background:var(--kit-soft);color:var(--kit-text);text-align:start}.pf-data-view details summary{min-height:44px;display:flex;align-items:center;cursor:pointer}.pf-tree{padding:0;list-style:none}.pf-tree ul{margin-inline-start:1.25rem;padding-inline-start:.75rem;border-inline-start:1px solid var(--kit-border);list-style:none}.pf-tree li{margin-block:var(--kit-sp-tight)}.pf-tree [role=treeitem]{min-height:44px;max-width:100%;padding:var(--kit-sp-tight) var(--kit-sp-near);border:0;border-radius:var(--kit-radius);background:transparent;color:var(--kit-text);font:inherit;text-align:start;overflow-wrap:anywhere;cursor:pointer}.pf-tree [role=treeitem][aria-expanded=true]{font-weight:650}.pf-tree [role=treeitem][aria-expanded]::before{content:"\\25B8";display:inline-block;margin-inline-end:.4em}.pf-tree [role=treeitem][aria-expanded=true]::before{transform:rotate(90deg)}.pf-inspector{display:grid;grid-template-columns:minmax(8rem,.7fr) minmax(0,1.3fr);gap:0 var(--kit-sp-item)}.pf-inspector dt,.pf-inspector dd{min-width:0;margin:0;padding-block:var(--kit-sp-near);border-block-end:1px solid var(--kit-border);overflow-wrap:anywhere}.pf-inspector dt{color:var(--kit-muted)}.pf-log-message{white-space:normal;overflow-wrap:anywhere}.pf-diff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--kit-sp-item)}.pf-diff section{min-width:0;overflow:hidden}.pf-diff h4{margin:0;padding:var(--kit-sp-near);font-size:max(16px,var(--kit-t-sub));color:var(--kit-text);background:var(--kit-soft)}.pf-diff ol{margin:0;padding:var(--kit-sp-near) var(--kit-sp-near) var(--kit-sp-near) 3em;overflow-wrap:anywhere;white-space:pre-wrap;font:var(--kit-t-small)/1.5 var(--kit-mono);font-variant-numeric:tabular-nums}.pf-diff li{padding-inline-start:var(--kit-sp-near);overflow-wrap:anywhere}.pf-diff [data-change=added]{border-inline-start:3px solid var(--kit-muted)}.pf-diff [data-change=removed]{border-inline-start:3px solid var(--kit-muted)}@media(max-width:640px){.pf-inspector{grid-template-columns:minmax(0,1fr)}.pf-inspector dt{border:0;padding-block-end:0}.pf-inspector dd{padding-block-start:var(--kit-sp-tight)}.pf-diff{grid-template-columns:minmax(0,1fr)}}`;
const TABLE_PAIRS = [['--kit-text', '--kit-surface', 7, 'data values'], ['--kit-muted', '--kit-surface', 4.5, 'data labels'], ['--kit-focus', '--kit-surface', 3, 'keyboard focus']];
const MESSAGE = {message: {type: 'string'}};

function family({id, requirementId: _requirementId, label, purpose, content, example, render, bases = [TABLE], componentType: _componentType = null, interactions = [], role = 'table', keyboard = 'Tab visits native controls; Enter or Space activates buttons and disclosures', css = '', exportName = null}) {
  return definePurposeFamily({id, group: 'table', sharedCss: TABLE_CSS, label, purpose,
    contexts: ['dashboard', 'data', 'admin'], bases, children: bases,
    entry: {module: 'src/platform/families/data-display.mjs', export: exportName ?? `render${id.split(':')[1].split('.').map(x => x.replace(/(^|-)(\w)/g, (_, a, b) => b.toUpperCase())).join('')}`},
    variants: {}, props: {density: ['compact', 'comfortable', 'spacious'], state: STATES}, defaults: {density: 'comfortable', state: 'ready'},
    content: {...MESSAGE, ...content}, forbidden: [], needs: {}, states: STATES,
    interactions: [{on: 'empty/loading/error', behavior: 'table base renders status text and aria-busy or role=alert'}, ...interactions],
    responsive: {strategy: 'container and viewport', breakpoints: ['640px', '800px'], behavior: 'tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap.'},
    a11y: {role, keyboard, conditions: ['table headers label data columns', 'filtering or disclosure behavior is exposed in rendered markup', 'responsive data remains readable without page overflow']},
    pairs: TABLE_PAIRS, parents: PARENTS, example, render, css,
  });
}

function dataTable(ctx, {columns, rows, sortable = true, selectable = false, label, responsive = 'priority'}) {
  const html = ctx.base(TABLE, {props: {density: ctx.props.density, state: ctx.props.state, sortable, selectable, responsive}, content: {id: ctx.uid('table'), columns, rows, message: ctx.content.message ?? '', selected: ctx.content.selected ?? [], label}});
  return html.replace('aria-label="데이터 표"', `aria-label="${e(label ?? '데이터 표')}"`);
}
function tableFrame(ctx, title, before, table, after = '') {
  const state = ctx.props.state;
  if (state === 'loading' || state === 'empty' || state === 'error') {
    const message = state === 'loading' ? '불러오는 중입니다.' : state === 'empty' ? (ctx.content.emptyMessage ?? '표시할 데이터가 없습니다.') : (ctx.content.message ?? '데이터를 불러오지 못했습니다.');
    return `<section class="pf-data-view" data-display="${e(ctx.id)}" data-state="${e(state)}"${state === 'loading' ? ' aria-busy="true"' : ''}><h3 id="${e(ctx.uid('title'))}">${e(title)}</h3><p role="${state === 'error' ? 'alert' : 'status'}">${e(message)}</p></section>`;
  }
  return `<section class="pf-data-view" data-display="${e(ctx.id)}"><h3 id="${e(ctx.uid('title'))}">${e(title)}</h3>${before}${table}${after}</section>`;
}
const FILTER_COLUMNS = [{id: 'name', label: '이름'}, {id: 'value', label: '값', kind: 'number'}];

export const tableFilterable = family({id: 'purpose:table.filterable', exportName: 'renderFilterable', requirementId: 'req:comp:g-04-filterable-table', label: '필터 표', purpose: '열 기준을 안내하는 검색 입력으로 행을 즉시 좁히고 일치 건수를 읽게 한다.',
  content: {title: {required: true, type: 'string'}, filterLabel: {type: 'string'}, columns: {required: true, type: 'table columns'}, rows: {required: true, type: 'scalar rows'}, selected: {type: 'string[]'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '서비스 현황', columns: FILTER_COLUMNS, rows: [{id: 'api', name: 'API Gateway', value: 12}, {id: 'worker', name: 'Worker', value: 4}]}},
  render(ctx) { const c = ctx.content, id = ctx.uid('filter'), rows = ctx.props.state === 'empty' ? [] : c.rows; const html = dataTable(ctx, {columns: c.columns, rows, label: c.title, sortable: ['ready', 'partial'].includes(ctx.props.state)}); const marked = html.replace('<section class="kit-data-table"', '<section class="kit-data-table" data-table-filterable'); const before = `<label for="${e(id)}">${e(c.filterLabel ?? '표 행 필터')}<input type="search" id="${e(id)}" data-table-filter aria-controls="${e(ctx.uid('table'))}" autocomplete="off"></label>`; return tableFrame(ctx, c.title, before, marked, `<p class="pf-live" data-filter-count role="status" aria-live="polite"></p><p data-filter-empty hidden>검색 결과가 없습니다.</p>`); },
  interactions: [{on: 'search input', behavior: '대소문자 구분 없이 행 전체 텍스트를 필터링하고 건수·빈 결과 문구를 갱신한다', runtime: 'cardDataRuntimeFor'}],
  role: 'region containing a labelled data table and search field', keyboard: 'Tab to search and sortable headers; typing filters rows and the live region announces the result count',
});

export const tableExpandable = family({id: 'purpose:table.expandable', exportName: 'renderExpandable', requirementId: 'req:comp:g-06-expandable-row-table', label: '행 확장 표', purpose: '각 행의 상세 내용을 네이티브 disclosure로 펼쳐 본다.',
  content: {title: {required: true, type: 'string'}, rows: {required: true, type: 'array<{id,name,value,details}>'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '배포 기록', rows: [{id: 'd1', name: 'web', value: '성공', details: '빌드 8초, 검증 31초'}, {id: 'd2', name: 'api', value: '대기', details: '배포 슬롯 확보 대기'}]}},
  render(ctx) { const c = ctx.content, sourceRows = ctx.props.state === 'empty' ? [] : c.rows, rows = sourceRows.map((r, i) => ({id: r.id ?? `row-${i + 1}`, name: r.name, value: r.value, details: `__D3_ROW_DETAILS_${i}__`})); let html = dataTable(ctx, {columns: [{id: 'name', label: '이름'}, {id: 'value', label: '상태'}, {id: 'details', label: '상세'}], rows, sortable: false, label: c.title}); sourceRows.forEach((row, i) => { const marker = `__D3_ROW_DETAILS_${i}__`, panel = ctx.uid(`detail-${i}`); html = html.replace(new RegExp(`<td([^>]*>)${marker}<\\/td>`), `<td$1<details data-row-expand><summary aria-expanded="false" aria-controls="${e(panel)}">상세 보기</summary><div id="${e(panel)}">${e(row.details)}</div></details></td>`); }); return tableFrame(ctx, c.title, '', html); },
  interactions: [{on: 'details summary click·Enter·Space', behavior: 'native disclosure opens the row detail and aria-expanded follows open state', runtime: 'cardDataRuntimeFor'}],
  keyboard: 'Tab to each summary; Enter or Space toggles its associated detail',
});

export const tableGrouped = family({id: 'purpose:table.grouped', exportName: 'renderGrouped', requirementId: 'req:comp:g-07-grouped-table', label: '그룹 표', purpose: '행을 같은 범주의 묶음으로 나누고 그룹 제목을 표 구조에서 읽게 한다.',
  content: {title: {required: true, type: 'string'}, rows: {required: true, type: 'array<{id,group,name,value}>'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '작업', rows: [{id: '1', group: '진행 중', name: '카탈로그', value: '검토'}, {id: '2', group: '진행 중', name: '서비스', value: '구현'}, {id: '3', group: '완료', name: '요청 분석', value: '완료'}]}},
  render(ctx) { const c = ctx.content, sourceRows = ctx.props.state === 'empty' ? [] : c.rows, rows = sourceRows.map((r, i) => ({id: r.id ?? `row-${i + 1}`, group: r.group, name: r.name, value: r.value})); let html = dataTable(ctx, {columns: [{id: 'group', label: '그룹'}, {id: 'name', label: '이름'}, {id: 'value', label: '상태'}], rows, sortable: false, label: c.title}); const groups = rows.map(r => r.group), groupOf = row => groups[Number(row.match(/data-row="(\d+)"/)[1])];
    // 그룹마다 tbody 하나: scope=rowgroup 머리글은 자기 tbody의 행만 묶는다(한 tbody에 여럿 두면 뒤 그룹 행까지 앞 머리글이 묶는다).
    html = html.replace(/<tbody>([\s\S]*?)<\/tbody>/, (all, inner) => { const parts = inner.match(/<tr data-row="\d+"[\s\S]*?<\/tr>/g) ?? []; if (!parts.length) return all; let out = ''; parts.forEach((row, n) => { const group = groupOf(row); if (n === 0 || group !== groupOf(parts[n - 1])) out += `${n ? '</tbody>' : ''}<tbody><tr class="pf-group-row"><th scope="rowgroup" colspan="3">${e(group)}</th></tr>`; out += row; }); return `${out}</tbody>`; }); return tableFrame(ctx, c.title, '', html); },
  role: 'table with rowgroup heading rows', keyboard: 'Tab to the scroll region; table content follows reading order',
});


function cardState(ctx, title) {
  const state = ctx.props.state;
  if (!['loading', 'empty', 'error'].includes(state)) return null;
  const message = state === 'loading' ? '불러오는 중입니다.' : state === 'empty' ? (ctx.content.emptyMessage ?? '표시할 데이터가 없습니다.') : (ctx.content.message ?? '데이터를 불러오지 못했습니다.');
  const p = ctx.resolve(CARD, {size: 'medium', behavior: 'static', media: 'none', state: 'default'});
  const attrs = Object.entries(p).filter(([k]) => k !== 'state').map(([k, v]) => `data-${e(k)}="${e(v)}"`).join(' ');
  return `<article class="kit-ctl-card pf-data-view" data-ctl="card" data-state="${e(state)}" id="${e(ctx.id)}" ${attrs}${state === 'loading' ? ' aria-busy="true"' : ''}><div class="kit-ctl-card-body"><h3>${e(title)}</h3><p role="${state === 'error' ? 'alert' : 'status'}">${e(message)}</p></div></article>`;
}

function treeNodes(items, uid) {
  if (!Array.isArray(items) || !items.length) throw new TypeError('Tree items must be a non-empty flat array');
  const ids = new Set(items.map(item => item.id));
  if (ids.size !== items.length || items.some(item => !item.id || (item.parent && !ids.has(item.parent)))) throw new TypeError('Tree item ids must be unique and parent ids must exist');
  const childrenOf = parent => items.filter(item => (item.parent ?? '') === parent);
  let visited = 0;
  const render = (nodes, depth, path) => nodes.map((item, index) => {
    visited += 1;
    const children = childrenOf(item.id), hasChildren = children.length > 0;
    const branch = `${path}-${index}`, id = uid(`tree-${branch}`), label = e(item.label);
    return `<li role="none"><button type="button" id="${e(id)}" role="treeitem" aria-level="${depth + 1}" tabindex="${depth === 0 && index === 0 ? '0' : '-1'}"${hasChildren ? ` aria-expanded="false" aria-controls="${e(id)}-group"` : ''}>${label}</button>${hasChildren ? `<ul role="group" id="${e(id)}-group" hidden>${render(children, depth + 1, branch)}</ul>` : ''}</li>`;
  }).join('');
  const html = render(childrenOf(''), 0, 'tree');
  if (visited !== items.length) throw new TypeError('Tree items must form an acyclic tree reachable from a root');
  return html;
}

export const tableTree = family({id: 'purpose:table.tree', exportName: 'renderTree', requirementId: 'req:comp:g-12-tree-view', label: '트리 보기', purpose: '계층형 항목을 펼치고 접으며 방향키로 이동한다.', bases: [CARD],
  content: {title: {required: true, type: 'string'}, items: {required: true, type: 'flat array<{id,parent?,label}>'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '프로젝트', items: [{id: 'frontend', label: 'Frontend'}, {id: 'components', parent: 'frontend', label: 'Components'}, {id: 'pages', parent: 'frontend', label: 'Pages'}, {id: 'backend', label: 'Backend'}, {id: 'api', parent: 'backend', label: 'API'}]}},
  render(ctx) { const c = ctx.content; const state = cardState(ctx, c.title); if (state) return state; const p = ctx.resolve(CARD, {size: 'medium', behavior: 'static', media: 'none', state: 'default'}); const attrs = Object.entries(p).map(([k, v]) => `data-${e(k)}="${e(v)}"`).join(' '); const tree = `<ul class="pf-tree" role="tree" aria-label="${e(c.title)}">${treeNodes(c.items, ctx.uid)}</ul>`; return `<article class="kit-ctl-card pf-data-view" data-ctl="card" id="${e(ctx.id)}" ${attrs}><div class="kit-ctl-card-body"><h3 id="${e(ctx.uid('title'))}">${e(c.title)}</h3>${tree}</div></article>`; },
  interactions: [{on: 'ArrowUp·ArrowDown·Home·End', behavior: 'roving focus moves between visible treeitems'}, {on: 'ArrowRight·ArrowLeft·Enter·Space', behavior: 'expand, collapse, or activate the focused treeitem', runtime: 'cardDataRuntimeFor'}],
  role: 'tree with labelled treeitems and nested groups', keyboard: 'Tab enters the tree once; arrow keys move, expand, and collapse; Home and End move to visible bounds',
});

export const tableInspector = family({id: 'purpose:table.inspector', exportName: 'renderInspector', requirementId: 'req:comp:g-17-key-value-inspector', label: '키·값 검사기', purpose: '레코드의 필드 이름과 값을 쌍으로 나열하고 긴 값을 줄바꿈한다.', bases: [CARD], componentType: 'key-value-inspector',
  content: {title: {required: true, type: 'string'}, items: {required: true, type: 'array<{key,value}>'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '요청 정보', items: [{key: 'requestId', value: 'req_01JABCD'}, {key: 'source', value: 'mobile-client'}, {key: 'details', value: '한 줄보다 긴 진단 값은 모바일에서도 읽을 수 있도록 줄바꿈됩니다.'}]}},
  render(ctx) { const c = ctx.content; const state = cardState(ctx, c.title); if (state) return state; const p = ctx.resolve(CARD, {size: 'medium', behavior: 'static', media: 'none', state: 'default'}); const attrs = Object.entries(p).map(([k, v]) => `data-${e(k)}="${e(v)}"`).join(' '); return `<article class="kit-ctl-card pf-data-view" data-ctl="card" id="${e(ctx.id)}" ${attrs}><div class="kit-ctl-card-body"><h3>${e(c.title)}</h3><dl class="pf-inspector">${c.items.map(x => `<dt>${e(x.key)}</dt><dd>${e(x.value)}</dd>`).join('')}</dl></div></article>`; },
  role: 'article containing a definition list', keyboard: 'read-only definition list has no extra Tab stops',
});

const LOG_COLUMNS = [{id: 'time', label: '시각'}, {id: 'level', label: '수준'}, {id: 'message', label: '메시지'}];
export const tableLogViewer = family({id: 'purpose:table.log-viewer', exportName: 'renderLogViewer', requirementId: 'req:comp:g-18-log-viewer', label: '로그 보기', purpose: '시각·심각도·메시지를 열로 나눠 긴 로그 문장을 읽는다.', componentType: 'log-viewer',
  content: {title: {required: true, type: 'string'}, rows: {required: true, type: 'array<{id,time,level,message}>'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '최근 로그', rows: [{id: 'l1', time: '10:42:01', level: 'INFO', message: '작업이 시작되었습니다.'}, {id: 'l2', time: '10:42:08', level: 'ERROR', message: '업스트림 응답 시간 초과: 재시도 횟수 3회 초과'}]}},
  render(ctx) { const c = ctx.content, sourceRows = ctx.props.state === 'empty' ? [] : c.rows, rows = sourceRows.map((r, i) => ({id: r.id ?? `log-${i + 1}`, ...r})); const html = dataTable(ctx, {columns: LOG_COLUMNS.map(x => ({...x, sortable: x.id !== 'message'})), rows, sortable: ['ready', 'partial'].includes(ctx.props.state), label: c.title}); return tableFrame(ctx, c.title, '', html.replace(/data-column="message"/g, 'data-column="message" class="pf-log-message"')); },
  role: 'region containing a labelled log table', keyboard: 'Tab to sortable headers; Enter or Space changes sort direction',
});

export const tableDiff = family({id: 'purpose:table.diff', exportName: 'renderDiff', requirementId: 'req:comp:g-20-diff-viewer', label: '변경 비교 보기', purpose: '이전·이후 텍스트를 나란히 비교하고 모바일에서는 위아래로 쌓는다.', bases: [CARD], componentType: 'diff-viewer',
  content: {title: {required: true, type: 'string'}, beforeLabel: {type: 'string'}, afterLabel: {type: 'string'}, before: {required: true, type: 'string'}, after: {required: true, type: 'string'}, message: {type: 'string'}, emptyMessage: {type: 'string'}},
  example: {variant: {}, props: {}, content: {title: '설정 변경', beforeLabel: '이전', afterLabel: '이후', before: 'timeout: 10\nretries: 2', after: 'timeout: 30\nretries: 2'}},
  render(ctx) { const c = ctx.content; const state = cardState(ctx, c.title); if (state) return state; const p = ctx.resolve(CARD, {size: 'medium', behavior: 'static', media: 'none', state: 'default'}), attrs = Object.entries(p).map(([k, v]) => `data-${e(k)}="${e(v)}"`).join(' '), list = (text, change) => `<ol>${String(text).split('\n').map(line => `<li data-change="${change}">${e(line) || '&nbsp;'}</li>`).join('')}</ol>`; return `<article class="kit-ctl-card pf-data-view" data-ctl="card" id="${e(ctx.id)}" ${attrs}><div class="kit-ctl-card-body"><h3>${e(c.title)}</h3><div class="pf-diff"><section aria-label="${e(c.beforeLabel ?? '이전')}"><h4>${e(c.beforeLabel ?? '이전')}</h4>${list(c.before, 'removed')}</section><section aria-label="${e(c.afterLabel ?? '이후')}"><h4>${e(c.afterLabel ?? '이후')}</h4>${list(c.after, 'added')}</section></div></div></article>`; },
  role: 'article with two labelled, line-numbered code lists', keyboard: 'read-only comparison has no extra Tab stops',
});

export const DATA_DISPLAY_FAMILIES = Object.freeze([tableFilterable, tableExpandable, tableGrouped, tableTree, tableInspector, tableLogViewer, tableDiff]);

export const DATA_DISPLAY_RUNTIME_IDS = Object.freeze(['purpose:table.filterable', 'purpose:table.expandable', 'purpose:table.tree']);
export const DATA_DISPLAY_RUNTIME = `(function(){if(window.__kitDataDisplay)return;window.__kitDataDisplay=true;document.addEventListener('input',function(e){var input=e.target.closest('[data-table-filter]');if(!input)return;var root=input.closest('.pf-data-view');if(!root)return;var table=root.querySelector('[data-table-filterable]');if(!table)return;var rows=[...table.querySelectorAll('tbody tr[data-row]')],q=input.value.trim().toLocaleLowerCase();var visible=0;rows.forEach(function(row){var show=row.textContent.toLocaleLowerCase().includes(q);row.hidden=!show;if(show)visible++;});var count=root.querySelector('[data-filter-count]'),empty=root.querySelector('[data-filter-empty]');if(count)count.textContent=visible+'개 행 표시';if(empty)empty.hidden=visible!==0;});document.addEventListener('toggle',function(e){var detail=e.target;if(detail.matches('details[data-row-expand]')){var summary=detail.querySelector('summary');if(summary)summary.setAttribute('aria-expanded',String(detail.open));}},true);document.addEventListener('click',function(e){var item=e.target.closest('[role=treeitem]');if(!item)return;var group=item.parentElement.querySelector(':scope > [role=group]');if(group){var open=item.getAttribute('aria-expanded')!=='true';item.setAttribute('aria-expanded',String(open));group.hidden=!open;}});document.addEventListener('keydown',function(e){var item=e.target.closest('[role=treeitem]');if(!item)return;var tree=item.closest('[role=tree]'),all=[...tree.querySelectorAll('[role=treeitem]')].filter(function(x){return !x.closest('[role=group][hidden]');}),i=all.indexOf(item),next=null,group=item.parentElement.querySelector(':scope > [role=group]');if(e.key==='ArrowDown')next=all[Math.min(all.length-1,i+1)];if(e.key==='ArrowUp')next=all[Math.max(0,i-1)];if(e.key==='Home')next=all[0];if(e.key==='End')next=all.at(-1);if(e.key==='ArrowRight'&&group&&group.hidden){item.click();e.preventDefault();return;}if(e.key==='ArrowRight'&&group&&!group.hidden)next=group.querySelector('[role=treeitem]');if(e.key==='ArrowLeft'&&group&&!group.hidden){item.click();e.preventDefault();return;}if(e.key==='ArrowLeft'){var parent=item.closest('[role=group]')?.parentElement.querySelector(':scope > [role=treeitem]');if(parent)next=parent;}if(next){e.preventDefault();all.forEach(function(x){x.tabIndex=-1;});next.tabIndex=0;next.focus();}});})();`;
export const dataDisplayRuntimeFor = ids => ids.some(id => DATA_DISPLAY_RUNTIME_IDS.includes(id)) ? DATA_DISPLAY_RUNTIME : '';

export const renderFilterable = ctx => tableFilterable.render(ctx);
export const renderExpandable = ctx => tableExpandable.render(ctx);
export const renderGrouped = ctx => tableGrouped.render(ctx);
export const renderTree = ctx => tableTree.render(ctx);
export const renderInspector = ctx => tableInspector.render(ctx);
export const renderLogViewer = ctx => tableLogViewer.render(ctx);
export const renderDiff = ctx => tableDiff.render(ctx);
