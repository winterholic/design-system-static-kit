/** §6.2 M 업무 패턴. 기존 입력·버튼·표·카드 기반 재료를 묶는 복합 목적 패밀리. */
import {definePurposeFamily, e} from './kit.mjs';

const CARD = 'base-component:card-surface';
const BUTTON = 'base-component:button-control';
const INPUT = 'base-component:input-control';
const TABLE = 'base-component:data-table';
const PARENTS = ['slot:main', 'slot:aside'];
const CSS = `.pf-work{min-width:0;display:grid;gap:var(--kit-sp-item);padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text)}.pf-work h2,.pf-work h3,.pf-work p,.pf-work ul,.pf-work ol,.pf-work dl{margin:0}.pf-work-head{display:flex;align-items:center;justify-content:space-between;gap:var(--kit-sp-item);flex-wrap:wrap}.pf-work-body{min-width:0;display:grid;gap:var(--kit-sp-near)}.pf-work[data-layout=stacked]{align-content:start}.pf-work[data-density=compact]{gap:var(--kit-sp-tight);padding:var(--kit-sp-near)}.pf-work[data-density=spacious]{gap:var(--kit-sp-section-m);padding:var(--kit-sp-section-m)}.pf-work-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));gap:var(--kit-sp-item)}.pf-work-row{min-width:0;display:flex;align-items:center;gap:var(--kit-sp-near);padding:var(--kit-sp-near);border-block-end:1px solid var(--kit-border)}.pf-work-muted{color:var(--kit-muted);overflow-wrap:anywhere}.pf-work table{width:100%;border-collapse:collapse}.pf-work th,.pf-work td{padding:var(--kit-sp-near);border-block-end:1px solid var(--kit-border);text-align:start;vertical-align:top;overflow-wrap:anywhere}.pf-work [role=toolbar]{display:flex;align-items:center;gap:var(--kit-sp-near);flex-wrap:wrap}.pf-work [role=group]{display:flex;align-items:center;gap:var(--kit-sp-near);flex-wrap:wrap}.pf-work [role=status],.pf-work [role=alert]{overflow-wrap:anywhere}.pf-work :focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}@media(max-width:640px){.pf-work-grid{grid-template-columns:minmax(0,1fr)}.pf-work table{display:block;overflow-x:auto;max-width:100%}.pf-work-row{align-items:flex-start;flex-wrap:wrap}}`;
const PAIRS = [['--kit-text', '--kit-surface', 7, 'work pattern content'], ['--kit-muted', '--kit-surface', 4.5, 'work pattern secondary text']];
const esc = value => e(String(value ?? ''));
const requiredText = (v, key) => { if (typeof v !== 'string' || !v.trim()) throw new TypeError(`${key}은 비어 있지 않은 문자열이어야 합니다`); };
const rows = (v, key, fields, min = 1, max = 30) => {
  if (!Array.isArray(v) || v.length < min || v.length > max) throw new TypeError(`${key}는 ${min}~${max}개 배열이어야 합니다`);
  v.forEach((row, i) => { if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError(`${key}[${i}]는 객체여야 합니다`); fields.forEach(field => { if (field.endsWith('?')) return; requiredText(row[field], `${key}[${i}].${field}`); }); });
};
const safeHref = value => { requiredText(value, 'href'); if (!/^(?:https?:\/\/|\/|#)[^\s]*$/i.test(value)) throw new TypeError('href는 http(s), 절대 경로 또는 # 링크여야 합니다'); return esc(value); };
const button = (ctx, label, attrs = '') => ctx.base(BUTTON, {props: {appearance: 'soft', size: 'small'}, content: {label}}).replace('<button ', `<button ${attrs} `);
const input = (ctx, {label, placeholder = '', value = '', kind = 'search', id = ctx.uid('query'), attrs = ''}) => ctx.base(INPUT, {props: {size: 'medium', kind}, content: {id, label, placeholder, value}}).replace('<input ', `<input ${attrs} `);
const table = (ctx, label, columns, body) => ctx.base(TABLE, {props: {density: ctx.props.density, sortable: false, selectable: false, responsive: 'scroll', state: 'ready'}, content: {id: ctx.uid('table'), label, columns: columns.map((name, i) => ({id: `col-${i}`, label: name, sortable: false})), rows: body, selected: []}});
const cardAttrs = ctx => {
  const values = ctx.resolve(CARD, {size: 'medium', behavior: 'static', media: 'none', state: 'default'});
  return Object.entries(values).map(([key, value]) => `data-${esc(key)}="${esc(value)}"`).join(' ');
};

function filterToolbar(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); requiredText(c.queryLabel, 'queryLabel'); rows(c.filters, 'filters', ['label', 'value'], 1, 12);
  return `<div role="toolbar" aria-label="${esc(c.title)}">${input(ctx, {label: c.queryLabel, attrs: 'data-work-search'})}<div role="group" aria-label="${esc(c.title)} 필터">${c.filters.map((f, i) => button(ctx, f.label, `data-work-filter="${esc(f.value)}" aria-pressed="${i === 0}"`)).join('')}</div></div>`;
}
function searchToolbar(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.scopes, 'scopes', ['label', 'value'], 1, 8);
  return `<div role="search" aria-label="${esc(c.title)}"><div class="pf-work-head">${input(ctx, {label: c.queryLabel ?? '검색어', placeholder: c.placeholder ?? '검색', attrs: 'data-work-search'})}<label>${esc(c.scopeLabel ?? '범위')}<select aria-label="${esc(c.scopeLabel ?? '범위')}" data-work-scope>${c.scopes.map((s, i) => `<option value="${esc(s.value)}"${i === 0 ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>${button(ctx, c.submitLabel ?? '검색', 'data-work-submit')}</div></div>`;
}
function bulkToolbar(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); if (!Number.isSafeInteger(c.selectedCount) || c.selectedCount < 0) throw new TypeError('selectedCount는 0 이상의 정수여야 합니다'); rows(c.actions, 'actions', ['label', 'action'], 1, 6);
  return `<div role="toolbar" aria-label="${esc(c.title)}"><span data-work-selected-count role="status">${c.selectedCount}개 선택</span><div role="group" aria-label="선택 항목 동작">${c.actions.map(a => button(ctx, a.label, `data-work-action="${esc(a.action)}"${c.selectedCount ? '' : ' disabled'}`)).join('')}</div></div>`;
}
function dataSummary(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.metrics, 'metrics', ['label', 'value', 'change?'], 1, 8);
  return `<dl class="pf-work-grid" aria-label="${esc(c.title)}">${c.metrics.map(m => `<div class="pf-work-row" ${cardAttrs(ctx)}><dt>${esc(m.label)}</dt><dd><strong>${esc(m.value)}</strong>${m.change ? `<span class="pf-work-muted"> ${esc(m.change)}</span>` : ''}</dd></div>`).join('')}</dl>`;
}
function dashboardKpi(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.metrics, 'metrics', ['label', 'value', 'trend?'], 1, 8);
  return `<div class="pf-work-grid" role="group" aria-label="${esc(c.title)}">${c.metrics.map(m => `<article ${cardAttrs(ctx)}><h3>${esc(m.label)}</h3><p><strong>${esc(m.value)}</strong></p><p class="pf-work-muted">${esc(m.trend ?? '변화 정보 없음')}</p></article>`).join('')}</div>`;
}
function approvalPanel(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); requiredText(c.requester, 'requester'); requiredText(c.summary, 'summary'); requiredText(c.submittedAt, 'submittedAt');
  return `<article ${cardAttrs(ctx)}><h3>${esc(c.requester)}</h3><p>${esc(c.summary)}</p><time>${esc(c.submittedAt)}</time><div role="group" aria-label="승인 결정">${button(ctx, c.rejectLabel ?? '반려', 'data-work-decision="rejected"')}${button(ctx, c.approveLabel ?? '승인', 'data-work-decision="approved"')}</div><p data-work-decision-result role="status" hidden></p></article>`;
}
function auditLog(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.events, 'events', ['actor', 'action', 'time', 'detail?'], 1, 30);
  const body = c.events.map((x, i) => ({'col-0': x.actor, 'col-1': x.action, 'col-2': x.time, 'col-3': x.detail ?? `event-${i}`}));
  return `<div role="region" aria-label="${esc(c.title)}">${table(ctx, c.title, ['작업자', '변경', '시각', '상세'], body)}</div>`;
}
function permissionMatrix(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.roles, 'roles', ['label', 'id'], 1, 8); rows(c.permissions, 'permissions', ['label', 'grants'], 1, 30);
  const permissionRows = c.permissions.map(p => ({...p, grants: p.grants.split(',').map(value => { if (!['allow', 'deny'].includes(value)) throw new TypeError('grants 값은 allow 또는 deny여야 합니다'); return value === 'allow'; })}));
  if (permissionRows.some(p => p.grants.length !== c.roles.length)) throw new TypeError('permissions.grants는 역할마다 allow/deny 값 하나여야 합니다');
  const head = `<thead><tr><th scope="col">권한</th>${c.roles.map(r => `<th scope="col">${esc(r.label)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${permissionRows.map((p, row) => `<tr><th scope="row">${esc(p.label)}</th>${p.grants.map((granted, col) => { const id = ctx.uid(`permission-${row}-${col}`); return `<td><input type="checkbox" id="${esc(id)}" data-work-permission${granted ? ' checked' : ''}><label for="${esc(id)}" class="kit-ctl-sr">${esc(c.roles[col].label)} ${esc(p.label)}</label></td>`; }).join('')}</tr>`).join('')}</tbody>`;
  return `<div ${cardAttrs(ctx)}><div role="region" aria-label="${esc(c.title)}"><table><caption>${esc(c.title)}</caption>${head}${body}</table></div></div>`;
}
function statusManagement(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.statuses, 'statuses', ['label', 'value'], 1, 12); requiredText(c.currentStatus, 'currentStatus');
  if (!c.statuses.some(x => x.value === c.currentStatus)) throw new TypeError('currentStatus는 statuses 값 중 하나여야 합니다');
  return `<form data-work-status-form><label>${esc(c.statusLabel ?? '상태')}<select name="status" data-work-status>${c.statuses.map(s => `<option value="${esc(s.value)}"${s.value === c.currentStatus ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>${button(ctx, c.saveLabel ?? '상태 저장', 'data-work-submit')}</form><p data-work-status-result role="status" aria-live="polite"></p>`;
}
function settingsForm(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.fields, 'fields', ['id', 'label', 'value', 'kind?'], 1, 20);
  return `<form data-work-settings>${c.fields.map(f => input(ctx, {id: ctx.uid(`setting-${f.id}`), label: f.label, value: f.value, kind: f.kind ?? 'text', attrs: `name="${esc(f.id)}"`})).join('')}${button(ctx, c.saveLabel ?? '변경 저장', 'data-work-submit')}<p data-work-settings-result role="status" aria-live="polite"></p></form>`;
}
function searchResults(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.results, 'results', ['title', 'summary', 'href', 'meta?'], 0, 30);
  return `<div role="search" aria-label="${esc(c.queryLabel ?? '검색 결과 필터')}">${input(ctx, {label: c.queryLabel ?? '결과 내 검색', attrs: 'data-work-search'})}</div><ul aria-label="${esc(c.title)}">${c.results.map(r => `<li class="pf-work-row" data-work-row><a href="${safeHref(r.href)}">${esc(r.title)}</a><p>${esc(r.summary)}</p><span class="pf-work-muted">${esc(r.meta ?? '')}</span></li>`).join('')}</ul><p data-work-search-empty role="status" hidden>검색 결과가 없습니다.</p>`;
}
function userTable(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.users, 'users', ['name', 'email', 'role', 'status'], 0, 100);
  return `<div ${cardAttrs(ctx)}><div role="region" aria-label="${esc(c.title)}"><table><caption>${esc(c.title)}</caption><thead><tr><th scope="col"><input type="checkbox" data-work-select-all aria-label="모든 사용자 선택"></th><th scope="col">이름</th><th scope="col">이메일</th><th scope="col">역할</th><th scope="col">상태</th></tr></thead><tbody>${c.users.map((u, i) => `<tr data-work-row><td><input type="checkbox" data-work-select aria-label="${esc(u.name)} 선택" value="${i}"></td><th scope="row">${esc(u.name)}</th><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td><span role="status">${esc(u.status)}</span></td></tr>`).join('')}</tbody></table><p data-work-selected-count role="status">0개 선택</p></div></div>`;
}
function taskList(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.tasks, 'tasks', ['id', 'title', 'assignee', 'due'], 0, 100);
  if (c.tasks.some(t => typeof t.done !== 'boolean') || new Set(c.tasks.map(t => t.id)).size !== c.tasks.length) throw new TypeError('tasks.done은 boolean이며 id는 고유해야 합니다');
  return `<div ${cardAttrs(ctx)}><ul aria-label="${esc(c.title)}">${c.tasks.map(t => { const id = ctx.uid(`task-${t.id}`); return `<li class="pf-work-row" data-work-row><input id="${esc(id)}" type="checkbox" data-work-task${t.done ? ' checked' : ''}><label for="${esc(id)}">${esc(t.title)}</label><span class="pf-work-muted">${esc(t.assignee)} · ${esc(t.due)}</span></li>`; }).join('')}</ul><p data-work-task-count role="status" aria-live="polite"></p></div>`;
}
function workflowSteps(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.steps, 'steps', ['label', 'description?'], 1, 12);
  if (!Number.isSafeInteger(c.currentIndex) || c.currentIndex < 0 || c.currentIndex >= c.steps.length) throw new TypeError('currentIndex는 steps 범위 안의 정수여야 합니다');
  return `<div ${cardAttrs(ctx)}><nav aria-label="${esc(c.title)}"><ol class="pf-work-grid">${c.steps.map((s, i) => `<li aria-current="${i === c.currentIndex ? 'step' : 'false'}"><span>${esc(s.label)}</span>${s.description ? `<p>${esc(s.description)}</p>` : ''}</li>`).join('')}</ol></nav></div>`;
}
function commentThread(ctx) {
  const c = ctx.content; requiredText(c.title, 'title'); rows(c.comments, 'comments', ['author', 'text', 'time'], 0, 50);
  const id = ctx.uid('comment');
  return `<div ${cardAttrs(ctx)}><section aria-label="${esc(c.title)}"><ol>${c.comments.map(x => `<li class="pf-work-row"><article><h3>${esc(x.author)}</h3><p>${esc(x.text)}</p><time>${esc(x.time)}</time></article></li>`).join('')}</ol><form data-work-comment><label for="${esc(id)}">${esc(c.composerLabel ?? '댓글 추가')}</label><textarea id="${esc(id)}" name="comment" required></textarea>${button(ctx, c.submitLabel ?? '댓글 등록', 'data-work-submit')}<p data-work-comment-result role="status" aria-live="polite"></p></form></section></div>`;
}

const DEFINITIONS = [
  ['filter-toolbar', 'Filter Toolbar', '필터 조건을 검색어와 토글 가능한 필터 묶음으로 좁힌다.', {title: {required: true, type: 'string'}, queryLabel: {required: true, type: 'string'}, filters: {required: true, type: 'array<{label,value}>'}}, {title: '사용자 필터', queryLabel: '사용자 검색', filters: [{label: '전체', value: 'all'}, {label: '활성', value: 'active'}]}, filterToolbar, ['검색 입력과 필터 버튼은 독립된 Tab 정지점이다.']],
  ['search-toolbar', 'Search Toolbar', '검색어·범위·실행 동작을 한 search landmark에 묶는다.', {title: {required: true, type: 'string'}, queryLabel: {type: 'string'}, placeholder: {type: 'string'}, scopeLabel: {type: 'string'}, scopes: {required: true, type: 'array<{label,value}>'}}, {title: '작업 검색', placeholder: '제목이나 담당자', scopes: [{label: '모든 항목', value: 'all'}, {label: '내 항목', value: 'mine'}]}, searchToolbar, ['범위 select와 검색 입력은 네이티브 키보드 동작을 따른다.']],
  ['bulk-action-toolbar', 'Bulk Action Toolbar', '선택 수와 선택 대상에 적용할 일괄 동작을 묶는다.', {title: {required: true, type: 'string'}, selectedCount: {required: true, type: 'number'}, actions: {required: true, type: 'array<{label,action}>'}}, {title: '선택 항목', selectedCount: 2, actions: [{label: '보관', action: 'archive'}, {label: '삭제', action: 'delete'}]}, bulkToolbar, ['비활성 동작은 선택 수가 0일 때 실행할 수 없다.']],
  ['data-summary', 'Data Summary', '합계와 변동 값을 정의 목록으로 요약한다.', {title: {required: true, type: 'string'}, metrics: {required: true, type: 'array<{label,value,change?}>'}}, {title: '이번 달 요약', metrics: [{label: '처리 건수', value: '1,284', change: '+8%'}, {label: '평균 시간', value: '2.4일'}]}, dataSummary, ['정의 목록의 레이블과 값은 읽기 순서로 연결된다.']],
  ['dashboard-kpi-grid', 'Dashboard KPI Grid', '서로 다른 핵심 지표 카드를 반응형 격자로 배치한다.', {title: {required: true, type: 'string'}, metrics: {required: true, type: 'array<{label,value,trend?}>'}}, {title: '운영 지표', metrics: [{label: '처리 대기', value: '18건', trend: '전주 대비 -4'}, {label: 'SLA 준수', value: '96.8%', trend: '목표 초과'}]}, dashboardKpi, ['각 지표는 제목과 수치가 있는 독립 article이다.']],
  ['approval-panel', 'Approval Panel', '요청자·요청 내용·시각과 승인 또는 반려 동작을 제시한다.', {title: {required: true, type: 'string'}, requester: {required: true, type: 'string'}, summary: {required: true, type: 'string'}, submittedAt: {required: true, type: 'string'}, approveLabel: {type: 'string'}, rejectLabel: {type: 'string'}}, {title: '접근 권한 요청', requester: '김민지', summary: '재무 보고서 편집 권한을 요청했습니다.', submittedAt: '2026-11-28'}, approvalPanel, ['승인·반려는 이름을 가진 버튼이며 결과는 status 영역에 표시된다.']],
  ['audit-log', 'Audit Log', '행위자·변경 내용·시각을 표의 헤더 관계로 기록한다.', {title: {required: true, type: 'string'}, events: {required: true, type: 'array<{actor,action,time,detail?}>'}}, {title: '변경 이력', events: [{actor: '이서준', action: '역할 변경', time: '10:42', detail: 'Viewer → Editor'}]}, auditLog, ['표 캡션과 열 머리글이 각 감사 기록의 문맥을 제공한다.']],
  ['permission-matrix', 'Permission Matrix', '역할별 권한을 행과 열이 명시된 체크박스 표로 편집한다.', {title: {required: true, type: 'string'}, roles: {required: true, type: 'array<{id,label}>'}, permissions: {required: true, type: 'array<{label,grants:comma-separated allow/deny values}>'}}, {title: '프로젝트 권한', roles: [{id: 'admin', label: '관리자'}, {id: 'member', label: '구성원'}], permissions: [{label: '설정 편집', grants: 'allow,deny'}]}, permissionMatrix, ['각 체크박스는 역할과 권한 이름을 접근 가능한 이름으로 가진다.']],
  ['status-management', 'Status Management', '현재 상태와 허용된 전이 목록을 선택해 저장한다.', {title: {required: true, type: 'string'}, statusLabel: {type: 'string'}, currentStatus: {required: true, type: 'string'}, statuses: {required: true, type: 'array<{label,value}>'}}, {title: '배포 상태', currentStatus: 'review', statuses: [{label: '검토 중', value: 'review'}, {label: '승인', value: 'approved'}]}, statusManagement, ['현재 상태가 선택값으로 표시되고 저장 결과는 live status로 알린다.']],
  ['settings-form', 'Settings Form', '레이블·현재 값을 가진 설정 입력과 저장 동작을 묶는다.', {title: {required: true, type: 'string'}, fields: {required: true, type: 'array<{id,label,value,kind?}>'}}, {title: '알림 설정', fields: [{id: 'digest', label: '요약 주기', value: '매일'}, {id: 'channel', label: '알림 채널', value: '#operations'}]}, settingsForm, ['각 입력은 연결된 label을 가지며 저장 안내는 live status로 표시한다.']],
  ['search-result-list', 'Search Result List', '검색 결과를 링크·요약·부가 정보로 읽고 검색어로 좁힌다.', {title: {required: true, type: 'string'}, queryLabel: {type: 'string'}, results: {required: true, type: 'array<{title,summary,href,meta?}>'}}, {title: '검색 결과', results: [{title: '권한 정책 변경', summary: '프로젝트 접근 수준을 변경합니다.', href: '/docs/permissions', meta: '문서 · 2026-11-28'}]}, searchResults, ['각 결과 제목은 탐색 가능한 링크이고 필터 결과는 읽기 순서를 유지한다.']],
  ['user-management-table', 'User Management Table', '사용자 선택과 이름·이메일·역할·상태를 데이터 표로 관리한다.', {title: {required: true, type: 'string'}, users: {required: true, type: 'array<{name,email,role,status}>'}}, {title: '사용자 관리', users: [{name: '박도윤', email: 'doyun@example.test', role: '관리자', status: '활성'}]}, userTable, ['표의 각 행은 사용자 이름을 행 머리글로 사용하고 선택 제어는 라벨을 가진다.']],
  ['task-list', 'Task List', '작업 완료 여부·담당자·기한을 할 일 목록으로 묶는다.', {title: {required: true, type: 'string'}, tasks: {required: true, type: 'array<{id,title,assignee,due,done}>'}}, {title: '오늘의 작업', tasks: [{id: 'review', title: '변경 검토', assignee: '김민지', due: '오늘', done: false}]}, taskList, ['각 작업 완료 체크는 작업 제목 label과 연결되고 완료 건수는 live status로 알린다.']],
  ['workflow-steps', 'Workflow Steps', '진행 단계와 현재 단계를 읽기 순서의 목록으로 표현한다.', {title: {required: true, type: 'string'}, currentIndex: {required: true, type: 'number'}, steps: {required: true, type: 'array<{label,description?}>'}}, {title: '요청 처리 단계', currentIndex: 1, steps: [{label: '접수', description: '요청을 확인합니다.'}, {label: '검토', description: '담당자가 검토합니다.'}, {label: '완료'}]}, workflowSteps, ['단계 목록은 progressbar 역할을 오용하지 않고 aria-current=step으로 현재 위치를 알린다.']],
  ['comment-thread', 'Comment Thread', '작성자·본문·시각의 댓글을 시간순으로 나열하고 새 댓글 입력을 제공한다.', {title: {required: true, type: 'string'}, comments: {required: true, type: 'array<{author,text,time}>'}}, {title: '검토 의견', comments: [{author: '정하람', text: '표의 모바일 열 우선순위를 확인했습니다.', time: '09:32'}]}, commentThread, ['댓글 작성 입력은 이름이 있고 제출 후 안내 영역은 live status로 남는다.']],
];

const makeFamily = ([slug, label, purpose, content, example, render, conditions]) => {
  const id = `purpose:work.${slug}`;
  const bases = ({'filter-toolbar': [INPUT, BUTTON], 'search-toolbar': [INPUT, BUTTON], 'bulk-action-toolbar': [BUTTON], 'data-summary': [CARD], 'dashboard-kpi-grid': [CARD], 'approval-panel': [CARD, BUTTON], 'audit-log': [TABLE], 'permission-matrix': [CARD], 'status-management': [BUTTON], 'settings-form': [INPUT, BUTTON], 'search-result-list': [INPUT], 'user-management-table': [CARD], 'task-list': [CARD], 'workflow-steps': [CARD], 'comment-thread': [CARD, BUTTON]})[slug];
  return definePurposeFamily({id, group: 'work', label, purpose, contexts: ['dashboard', 'data', 'admin'], bases, children: bases,
    entry: {module: 'src/platform/families/work-patterns.mjs', export: 'renderWorkPattern'},
    variants: {layout: ['inline', 'stacked']}, props: {density: ['compact', 'comfortable', 'spacious'], state: ['ready', 'loading', 'empty', 'error']},
    defaults: {layout: 'inline', density: 'comfortable', state: 'ready'}, content, forbidden: [], needs: {}, states: ['ready', 'loading', 'empty', 'error'],
    interactions: [{on: 'native controls', behavior: conditions.join(' ')}], responsive: {strategy: 'fluid grid and contained tables', breakpoints: ['640px'], behavior: 'grid collapses to one column and tables scroll inside the pattern boundary.'},
    a11y: {role: 'section labelled by its heading', keyboard: 'Native form controls and links use their platform keyboard behavior.', conditions: ['semantic heading and table relationships', ...conditions]},
    pairs: PAIRS, parents: PARENTS, example: {variant: {layout: 'inline'}, props: {density: 'comfortable', state: 'ready'}, content: example},
    render(ctx) {
      const titleId = ctx.uid('title');
      const root = `class="pf-work pf-work-${esc(slug)}" data-work-pattern="${esc(id)}" data-layout="${esc(ctx.variant.layout)}" data-density="${esc(ctx.props.density)}" data-state="${esc(ctx.props.state)}"`;
      let inner = render(ctx);
      if (ctx.props.state !== 'ready') {
        const stateText = {loading: '불러오는 중입니다.', empty: '표시할 데이터가 없습니다.', error: '데이터를 불러오지 못했습니다.'}[ctx.props.state];
        inner = `<p role="${ctx.props.state === 'error' ? 'alert' : 'status'}">${esc(stateText)}</p>`;
      }
      return `<section ${root} aria-labelledby="${esc(titleId)}"><header class="pf-work-head"><h2 id="${esc(titleId)}">${esc(ctx.content.title)}</h2></header><div class="pf-work-body">${inner}</div></section>`;
    }, css: CSS,
  });
};

export const WORK_PATTERN_FAMILIES = Object.freeze(DEFINITIONS.map(makeFamily));
export const WORK_PATTERN_IDS = Object.freeze(WORK_PATTERN_FAMILIES.map(f => f.id));
export const WORK_PATTERN_REQUIREMENT_IDS = Object.freeze(DEFINITIONS.map((spec, index) => `req:comp:m-${String(index + 1).padStart(2, '0')}-${spec[0]}`));
export const WORK_PATTERN_RUNTIME = `(function(){
if(window.__kitWorkPatterns)return;window.__kitWorkPatterns=true;
function count(root){var all=[...root.querySelectorAll('[data-work-task]')],done=all.filter(function(x){return x.checked}).length,out=root.querySelector('[data-work-task-count]');if(out)out.textContent=done+' / '+all.length+'개 완료'}
document.querySelectorAll('.pf-work[data-work-pattern="purpose:work.task-list"]').forEach(count);
document.addEventListener('input',function(event){var input=event.target.closest('[data-work-search]');if(!input)return;var root=input.closest('.pf-work');if(!root)return;var q=input.value.trim().toLocaleLowerCase(),rows=[...root.querySelectorAll('[data-work-row]')],visible=0;rows.forEach(function(row){var show=row.textContent.toLocaleLowerCase().includes(q);row.hidden=!show;if(show)visible++});var empty=root.querySelector('[data-work-search-empty]');if(empty)empty.hidden=visible!==0});
document.addEventListener('change',function(event){var task=event.target.closest('[data-work-task]');if(task){var root=task.closest('.pf-work');if(root)count(root)}var select=event.target.closest('[data-work-select],[data-work-select-all]');if(select){var table=select.closest('.pf-work'),all=table?[...table.querySelectorAll('[data-work-select]')]:[];if(select.hasAttribute('data-work-select-all'))all.forEach(function(x){x.checked=select.checked});var checked=all.filter(function(x){return x.checked}).length,output=table&&table.querySelector('[data-work-selected-count]');if(output)output.textContent=checked+'개 선택'}});
document.addEventListener('click',function(event){var decision=event.target.closest('[data-work-decision]');if(!decision)return;var root=decision.closest('.pf-work'),out=root&&root.querySelector('[data-work-decision-result]');if(!out)return;out.hidden=false;out.textContent=decision.getAttribute('data-work-decision')==='approved'?'승인했습니다.':'반려했습니다.';root.querySelectorAll('[data-work-decision]').forEach(function(button){button.disabled=true})});
document.addEventListener('submit',function(event){var form=event.target.closest('[data-work-settings],[data-work-status-form],[data-work-comment]');if(!form)return;event.preventDefault();var root=form.closest('.pf-work'),out=root&&(root.querySelector('[data-work-settings-result]')||root.querySelector('[data-work-status-result]')||root.querySelector('[data-work-comment-result]'));if(!out)return;out.textContent=form.hasAttribute('data-work-comment')?'내용을 확인했습니다. 댓글 게시에는 서버 연결이 필요합니다.':form.hasAttribute('data-work-status-form')?'상태를 확인했습니다. 저장에는 서버 연결이 필요합니다.':'설정을 확인했습니다. 저장에는 서버 연결이 필요합니다.'});
})();`;
const RUNTIME_IDS = new Set(['purpose:work.search-result-list', 'purpose:work.task-list', 'purpose:work.user-management-table', 'purpose:work.approval-panel', 'purpose:work.settings-form', 'purpose:work.status-management', 'purpose:work.comment-thread']);
export const workPatternRuntimeFor = ids => ids.some(id => RUNTIME_IDS.has(id)) ? WORK_PATTERN_RUNTIME : '';

