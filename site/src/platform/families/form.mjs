/**
 * Form 목적 패밀리 5종(컴포넌트 패밀리 작업 소유): 검색, 인증, 설정, 필터, 입력 그룹.
 *
 * 입력 칸·선택·버튼·알림 하나하나의 계약·상태·접근성·런타임(attachInput·attachSelect·attachButton)은 기반 컴포넌트가 소유한다.
 * 이 파일은 "무엇을 어떻게 묶어 놓는가"(폼 셸, 행 그리드, 한 줄 정렬, 애드온 결합, 반응형 재배치)만 가진다.
 * 같은 줄의 입력·선택·버튼은 같은 size라 높이가 같다. 선택(select)은 기반 CSS의 크기 체계가 입력과 달라 폼 안에서 높이·글자·외형을 입력에 맞춘다(--pf-ctl-h).
 */
import {icon} from '../../render/icon.mjs';
import {definePurposeFamily, e} from './kit.mjs';

const INPUT = 'base-component:input-control', SELECT = 'base-component:select-control', BUTTON = 'base-component:button-control', FEEDBACK = 'base-component:feedback-message';
const SIZES = ['small', 'medium', 'large'];
const SELECT_SIZE = {small: 'sm', medium: 'md', large: 'lg'};
const FORM_PARENTS = ['slot:main', 'slot:aside', 'slot:grid-item'];

/** 기반 버튼은 type=button만 낸다. 제출 버튼은 렌더된 첫 button 태그의 type만 submit으로 바꾼다(그 밖의 마크업·속성은 그대로). */
const submit = html => html.replace('type="button"', 'type="submit"');
/** 입력 칸의 외형(outline·filled·underline)은 시각 패밀리가 고정하므로, 폼 안의 선택·애드온이 맞추도록 읽어 둔다. */
const appearanceOf = ctx => ctx.resolve(INPUT, {}).appearance;
const formAttrs = (ctx, size, extra = '') => `data-size="${size}" data-appearance="${appearanceOf(ctx)}"${extra}`;

const input = (ctx, id, f, size, extra = {}) => ctx.base(INPUT, {props: {size, kind: f.kind ?? 'text', ...extra.props}, content: {id, label: f.label, ...(f.hint ? {hint: f.hint} : {}), ...(f.placeholder ? {placeholder: f.placeholder} : {}), ...(f.value ? {value: f.value} : {}), ...(f.required ? {required: true} : {}), ...extra.content}});
const select = (ctx, id, f, size) => ctx.base(SELECT, {props: {size: SELECT_SIZE[size]}, content: {id, label: f.label, options: f.options, ...(f.value ? {value: f.value} : {}), ...(f.placeholder ? {placeholder: f.placeholder} : {}), ...(f.required ? {required: true} : {})}});
const num = v => `<span class="pf-num">${e(v)}</span>`;

const INPUT_STATES = ['default', 'hover', 'focus', 'error', 'disabled'];
const TEXT_PAIRS = [['--kit-text', '--kit-surface', 7, 'form title'], ['--kit-text', '--kit-card-hover', 7, 'form title on filled'], ['--kit-muted', '--kit-surface', 4.5, 'description'], ['--kit-muted', '--kit-card-hover', 4.5, 'description on filled']];

// 공통 CSS(sharedCss): 폼 크기 변수, 선택을 입력과 같은 높이·글자·외형으로 맞추는 규칙, 폼 머리, 숫자, 패널 표면.
const SHARED = `.pf-form{--pf-ctl-h:var(--kit-control);--pf-ctl-px:var(--kit-inset);--pf-ctl-font:var(--kit-t-label);min-width:0;font-family:var(--kit-font);color:var(--kit-text)}.pf-form[data-size=small]{--pf-ctl-h:calc(var(--kit-control) - 8px);--pf-ctl-px:var(--kit-sp-item)}.pf-form[data-size=large]{--pf-ctl-h:calc(var(--kit-control) + 8px);--pf-ctl-px:var(--kit-sp-inset-l);--pf-ctl-font:var(--kit-t-body)}.pf-form .kit-select-label{color:var(--kit-muted);font-size:var(--kit-t-label)}.pf-form .kit-select{gap:var(--kit-sp-tight)}.pf-form .kit-select .kit-select-trigger{box-sizing:border-box;height:var(--pf-ctl-h);min-height:0;padding:0 var(--pf-ctl-px);border-color:var(--kit-control-border);background:var(--kit-control-bg);color:var(--kit-control-fg);font-size:var(--pf-ctl-font);overflow:hidden;white-space:nowrap}.pf-form .kit-select .kit-select-trigger::after{content:'' / '';flex:none;width:.45em;height:.45em;margin-inline-start:var(--kit-sp-near);border:solid currentColor;border-width:0 2px 2px 0;transform:translateY(-25%) rotate(45deg)}.pf-form .kit-select .kit-select-trigger[aria-expanded=true]::after{transform:translateY(25%) rotate(-135deg)}.pf-form .kit-select .kit-select-trigger:hover{border-color:var(--kit-control-hover-border)}.pf-form[data-appearance=filled] .kit-select .kit-select-trigger{border-color:transparent;border-bottom-color:var(--kit-control-border);background:var(--kit-card-active)}.pf-form[data-appearance=underline] .kit-select .kit-select-trigger{padding-inline:0;border-width:0 0 2px;border-radius:0;background:transparent}.pf-form .kit-ctl-button-host{max-width:100%}.pf-form-head{display:grid;gap:var(--kit-sp-tight);min-width:0}.pf-form-head :is(h2,h3){margin:0;color:var(--kit-text);font-family:var(--kit-heading);font-weight:var(--pf-title-weight);line-height:1.25;word-break:keep-all;overflow-wrap:anywhere}.pf-form-head h2{font-size:var(--kit-t-heading)}.pf-form-head h3{font-size:max(16px,var(--kit-t-sub))}.pf-form-head p{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small);word-break:keep-all;overflow-wrap:anywhere}.pf-fields{display:grid;gap:var(--kit-sp-item);min-width:0}.pf-num{white-space:nowrap;font-variant-numeric:tabular-nums}.pf-panel{box-sizing:border-box;border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-surface);box-shadow:var(--kit-shadow)}[data-family=editorial] .pf-panel{border-radius:0;border-block:var(--pf-rule)}.pf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}`;

/* ---------- 검색 ---------- */
export const formSearch = definePurposeFamily({
  id: 'purpose:form.search', group: 'form', sharedCss: SHARED, label: '검색 폼',
  purpose: '검색어 하나(필요하면 범위 선택)를 받아 제출한다. 머리줄과 목록 위에서 쓰며 inline은 한 줄, stacked는 세로로 쌓는다.',
  contexts: ['any'], bases: [INPUT, BUTTON, SELECT], children: [INPUT, BUTTON, SELECT],
  entry: {module: 'src/platform/families/form.mjs', export: 'renderFormSearch'},
  variants: {layout: ['inline', 'stacked'], scope: ['none', 'select']}, props: {size: SIZES, state: ['default', 'disabled']},
  defaults: {layout: 'inline', scope: 'none', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string (검색 칸 이름)'}, placeholder: {type: 'string'}, value: {type: 'string'}, buttonLabel: {type: 'string'}, scopeLabel: {type: 'string'}, scopeOptions: {type: '{value, label}[] (scope=select)'}, scopeValue: {type: 'string'}, action: {type: 'url'}},
  forbidden: [],
  needs: {}, states: INPUT_STATES,
  interactions: [
    {on: 'Enter·검색 버튼 click', behavior: 'role=search 폼을 제출한다(네이티브 submit, 범위 선택은 hidden input으로 함께 전달)'},
    {on: '지우기 버튼·Escape', behavior: '입력값을 지우고 포커스를 칸에 돌려준다', runtime: 'attachInput'},
    {on: 'scope 선택 click·ArrowDown·Enter', behavior: '범위 목록 열기, 방향키·Enter·Escape', runtime: 'attachSelect'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'inline은 [범위 | 검색 칸 | 버튼] 한 줄이고 640px 이하에서 범위 선택이 윗줄로 올라간다(검색 칸과 버튼은 한 줄 유지). stacked는 어느 폭에서도 세로 한 열이고 버튼은 전체 폭이다.'},
  a11y: {role: 'search (form)', keyboard: 'Tab 순서는 범위 → 검색 칸 → (지우기) → 검색 버튼, Enter로 제출', conditions: ['inline은 칸 이름을 시각적으로만 숨기고(.pf-sr) 접근 가능한 이름은 유지한다', '검색 칸·선택·버튼은 같은 size라 같은 줄에서 높이가 같다', '검색어 지우기 버튼은 접근 가능한 이름을 가진다(기반 입력)']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'search label'], ['--kit-muted', '--kit-canvas', 4.5, 'search label on canvas']],
  parents: ['slot:header', 'slot:main', 'slot:aside'],
  example: {variant: {layout: 'inline', scope: 'select'}, props: {size: 'medium'}, content: {label: '사이트 검색', placeholder: '검색어를 입력하세요', buttonLabel: '검색', scopeLabel: '범위', scopeValue: 'all', scopeOptions: [{value: 'all', label: '전체'}, {value: 'docs', label: '문서'}, {value: 'blog', label: '블로그'}]}},
  render(ctx) { return renderFormSearch(ctx); },
  css: `.pf-search{display:grid;gap:var(--kit-sp-near);align-items:start}.pf-search>*{min-width:0}.pf-search[data-layout=inline]{display:flex;flex-wrap:wrap;align-items:flex-end}.pf-search[data-layout=inline] .pf-search-field{flex:1 1 14rem}.pf-search[data-layout=inline] .pf-search-scope{flex:0 1 11rem;min-width:7rem}.pf-search[data-layout=inline] .kit-ctl-button-host{flex:none}.pf-search[data-layout=stacked]{grid-template-columns:minmax(0,1fr)}.pf-search[data-layout=inline] :is(.kit-ctl-input-label,.kit-select-label){position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.pf-search .kit-ctl-button-host{display:flex}.pf-search[data-layout=stacked] .kit-ctl-button{width:100%}.pf-search .kit-ctl-button{white-space:nowrap}.pf-search[data-layout=stacked] .kit-ctl-input .kit-ctl-input-box{height:44px}.pf-search[data-layout=stacked] .kit-ctl-input input{min-height:42px}.pf-search[data-layout=stacked] .kit-select .kit-select-trigger{height:44px}.pf-search[data-layout=stacked] .kit-ctl-button{min-height:44px}`,
});
export function renderFormSearch(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = p.size, disabled = p.state === 'disabled';
  if (v.scope === 'select' && (!Array.isArray(c.scopeOptions) || c.scopeOptions.length < 2)) throw new TypeError('범위 선택(scope=select)에는 scopeOptions 2개 이상이 필요합니다');
  const scope = v.scope === 'select' ? `<div class="pf-search-scope">${select(ctx, ctx.uid('scope'), {label: c.scopeLabel ?? '검색 범위', options: c.scopeOptions, value: c.scopeValue}, size)}</div>` : '';
  const field = `<div class="pf-search-field">${input(ctx, ctx.uid('query'), {label: c.label, placeholder: c.placeholder, value: c.value}, size, {props: {kind: 'search', state: p.state}})}</div>`;
  const button = submit(ctx.button('primary', {props: {size, state: disabled ? 'disabled' : 'default', content: 'icon-start'}, content: {label: c.buttonLabel ?? '검색', icon: 'search'}}));
  return `<form class="pf-form pf-search" role="search" action="${e(c.action ?? '#')}" method="get" aria-label="${e(c.label)}" data-layout="${v.layout}" data-scope="${v.scope}" ${formAttrs(ctx, size)}>${scope}${field}${button}</form>`;
}

/* ---------- 인증 ---------- */
const AUTH_COPY = {
  login: {title: '로그인', submit: '로그인', links: [{label: '비밀번호를 잊으셨나요?', href: '#reset'}, {label: '계정 만들기', href: '#signup'}], error: '이메일 또는 비밀번호가 올바르지 않습니다.', field: '비밀번호를 다시 확인해 주세요.'},
  signup: {title: '계정 만들기', submit: '가입하기', links: [{label: '이미 계정이 있나요? 로그인', href: '#login'}], error: '가입을 완료하지 못했습니다.', field: '이미 사용 중인 이메일입니다.'},
};
export const formAuth = definePurposeFamily({
  id: 'purpose:form.auth', group: 'form', sharedCss: SHARED, label: '인증 폼',
  purpose: '로그인 또는 가입 정보를 받는다. 제목, 입력 2~3개, 오류 안내, 전체 폭 제출 버튼, 보조 링크 순서로 쌓여 가운데에 놓인다.',
  contexts: ['auth', 'landing', 'commerce', 'any'], bases: [INPUT, BUTTON, FEEDBACK], children: [INPUT, BUTTON, FEEDBACK],
  entry: {module: 'src/platform/families/form.mjs', export: 'renderFormAuth'},
  variants: {mode: ['login', 'signup'], error: ['none', 'shown']}, props: {size: SIZES},
  defaults: {mode: 'login', error: 'none', size: 'medium'},
  content: {title: {type: 'string'}, description: {type: 'string'}, submitLabel: {type: 'string'}, errorMessage: {type: 'string (error=shown, 폼 위 요약)'}, fieldMessage: {type: 'string (error=shown, 문제 칸 아래 안내)'}, links: {type: '{label, href}[] (1~2)'}, action: {type: 'url'}},
  forbidden: [],
  needs: {}, states: [...INPUT_STATES, 'error-summary'],
  interactions: [
    {on: 'Enter·제출 버튼 click', behavior: '폼을 제출한다(네이티브 submit)'},
    {on: '비밀번호 표시 버튼 click', behavior: 'aria-pressed로 비밀번호를 보이고 숨긴다', runtime: 'attachInput'},
    {on: 'blur', behavior: '네이티브 제약 검사로 칸별 오류를 표시한다(required·type=email)', runtime: 'attachInput'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '폭이 26rem 이내인 한 열이라 좁은 화면에서는 컨테이너 폭으로 줄어든다. 보조 링크는 줄바꿈된다.'},
  a11y: {role: 'form (aria-labelledby 제목)', keyboard: 'Tab 순서는 입력 → 제출 → 보조 링크', conditions: ['오류 요약은 role=alert이고 문제 칸에는 aria-invalid와 칸별 메시지가 있다', '모든 칸에 보이는 라벨(자리 표시자는 라벨을 대신하지 못한다)', '보조 링크는 터치 44px 이상', '제출 버튼은 전체 폭']},
  pairs: [...TEXT_PAIRS, ['--kit-link', '--kit-surface', 4.5, 'auth link'], ['--kit-link', '--kit-card-hover', 4.5, 'auth link on filled']],
  parents: ['slot:main'],
  example: {variant: {mode: 'login', error: 'shown'}, props: {size: 'medium'}, content: {description: '계정 정보로 대시보드에 들어갑니다.'}},
  render(ctx) { return renderFormAuth(ctx); },
  css: `.pf-auth{display:grid;gap:var(--kit-sp-head);width:100%;max-width:26rem;margin-inline:auto;padding:calc(var(--pf-pad) * 1.5)}.pf-auth.pf-panel{background:var(--kit-surface)}[data-family=editorial] .pf-auth.pf-panel{background:transparent}.pf-auth .kit-ctl-button-host{display:flex;width:100%}.pf-auth .kit-ctl-button{width:100%}.pf-auth .kit-ctl-feedback-text{flex:0 1 auto}.pf-auth-links{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 var(--kit-gap)}.pf-auth-links a{display:inline-flex;align-items:center;min-height:44px;color:var(--kit-link);font-size:var(--kit-t-small);text-underline-offset:.2em;word-break:keep-all;overflow-wrap:anywhere}.pf-auth-links a:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}`,
});
export function renderFormAuth(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = p.size, copy = AUTH_COPY[v.mode], hid = ctx.uid('title');
  const shown = v.error === 'shown';
  const errorOn = v.mode === 'login' ? 'password' : 'email';
  const fields = [
    ...(v.mode === 'signup' ? [{key: 'name', label: '이름', kind: 'text', placeholder: '홍길동'}] : []),
    {key: 'email', label: '이메일', kind: 'email', placeholder: 'name@example.com'},
    {key: 'password', label: '비밀번호', kind: 'password', hint: v.mode === 'signup' ? '8자 이상으로 입력하세요.' : ''},
  ].map(f => input(ctx, ctx.uid(f.key), f, size, {props: {state: shown && f.key === errorOn ? 'error' : 'default'}, content: {required: true, ...(shown && f.key === errorOn ? {message: c.fieldMessage ?? copy.field} : {})}})).join('');
  const summary = shown ? ctx.base(FEEDBACK, {props: {placement: 'inline', tone: 'danger', size}, content: {id: ctx.uid('error'), message: c.errorMessage ?? copy.error}}) : '';
  const links = (c.links ?? copy.links).slice(0, 2).map(l => `<a href="${e(l.href)}">${e(l.label)}</a>`).join('');
  const head = `<header class="pf-form-head"><h2 id="${e(hid)}">${e(c.title ?? copy.title)}</h2>${c.description ? `<p>${e(c.description)}</p>` : ''}</header>`;
  const button = submit(ctx.button('primary', {props: {size}, content: {label: c.submitLabel ?? copy.submit}}));
  return `<form class="pf-form pf-auth pf-panel" action="${e(c.action ?? '#')}" method="post" aria-labelledby="${e(hid)}" data-mode="${v.mode}" ${formAttrs(ctx, size)}>${head}${summary}<div class="pf-fields">${fields}</div>${button}<div class="pf-auth-links">${links}</div></form>`;
}

/* ---------- 설정 ---------- */
export const formSettings = definePurposeFamily({
  id: 'purpose:form.settings', group: 'form', sharedCss: SHARED, label: '설정 폼',
  purpose: '계정·알림 같은 설정을 구역별로 나눠 바꾼다. 구역 제목·설명이 왼쪽, 컨트롤이 오른쪽에 놓이는 행으로 읽히고 맨 아래에서 저장·취소한다.',
  contexts: ['settings', 'dashboard'], bases: [INPUT, SELECT, BUTTON], children: [INPUT, SELECT, BUTTON],
  entry: {module: 'src/platform/families/form.mjs', export: 'renderFormSettings'},
  variants: {layout: ['rows', 'cards']}, props: {size: SIZES},
  defaults: {layout: 'rows', size: 'medium'},
  content: {title: {required: true, type: 'string'}, description: {type: 'string'}, sections: {required: true, type: '{title, description?, fields: {type: input|select, label, kind?, value?, hint?, placeholder?, options?}[] (1~4)}[] (1~6)'}, saveLabel: {type: 'string'}, cancelLabel: {type: 'string'}, action: {type: 'url'}},
  forbidden: [],
  needs: {}, states: INPUT_STATES,
  interactions: [
    {on: '저장 버튼 click·Enter', behavior: '폼을 제출한다(네이티브 submit, 선택 값은 hidden input으로 전달)'},
    {on: 'blur', behavior: '입력 칸의 네이티브 제약 검사 결과를 칸 아래에 표시한다', runtime: 'attachInput'},
    {on: 'select click·방향키', behavior: '선택 목록 열기·이동·확정', runtime: 'attachSelect'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'rows는 [설명 1fr | 컨트롤 2fr] 두 열이고 640px 이하에서 한 열(설명 위, 컨트롤 아래)로 쌓인다. cards는 항상 한 열이다. 저장·취소는 640px 이하에서 전체 폭으로 쌓이고 저장이 위에 온다.'},
  a11y: {role: 'form > group(구역)', keyboard: 'Tab 순서는 구역 순서대로 컨트롤, 마지막에 저장 → 취소', conditions: ['구역은 role=group이고 제목·설명과 aria-labelledby·aria-describedby로 연결된다', '모든 칸에 보이는 라벨', '입력·선택·버튼은 같은 size라 높이가 같다', '구역 제목과 컨트롤 사이 간격은 구역마다 같다']},
  pairs: [...TEXT_PAIRS, ['--kit-text', '--kit-canvas', 7, 'row title on canvas'], ['--kit-muted', '--kit-canvas', 4.5, 'row description on canvas']],
  parents: ['slot:main'],
  example: {variant: {layout: 'rows'}, props: {size: 'medium'}, content: {title: '계정 설정', description: '프로필과 알림 방식을 바꿉니다.', saveLabel: '저장', cancelLabel: '취소', sections: [
    {title: '프로필', description: '다른 사용자에게 보이는 이름과 연락처입니다.', fields: [{type: 'input', label: '이름', value: '김민지', required: true}, {type: 'input', label: '이메일', kind: 'email', value: 'minji@example.com', hint: '알림은 이 주소로 갑니다.'}]},
    {title: '지역과 언어', description: '날짜와 통화 표시 형식에 쓰입니다.', fields: [{type: 'select', label: '언어', value: 'ko', options: [{value: 'ko', label: '한국어'}, {value: 'en', label: 'English'}]}, {type: 'select', label: '시간대', value: 'seoul', options: [{value: 'seoul', label: '서울 (UTC+9)'}, {value: 'utc', label: 'UTC'}]}]},
  ]}},
  render(ctx) { return renderFormSettings(ctx); },
  css: `.pf-settings{display:grid;gap:var(--kit-gap)}.pf-set-list{display:grid;gap:0}.pf-set-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:var(--kit-sp-head) var(--kit-gap);padding-block:var(--kit-gap);border-block-end:var(--pf-rule)}.pf-set-row .pf-form-head{align-content:start}.pf-set-controls{display:grid;gap:var(--kit-sp-item);max-width:28rem;min-width:0}.pf-settings[data-layout=cards] .pf-set-list{gap:var(--kit-sp-head)}.pf-settings[data-layout=cards] .pf-set-row{grid-template-columns:minmax(0,1fr);padding:var(--pf-pad);border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-surface);box-shadow:var(--kit-shadow)}.pf-settings[data-layout=cards] .pf-set-row{background:var(--kit-surface)}[data-family=editorial] .pf-settings[data-layout=cards] .pf-set-row{border-radius:0;border-block-start:var(--pf-rule);background:transparent}.pf-set-foot{display:flex;justify-content:flex-end;gap:var(--pf-gap)}.pf-set-foot .kit-ctl-button{white-space:nowrap}@media(max-width:640px){.pf-set-row{grid-template-columns:minmax(0,1fr)}.pf-set-controls{max-width:none}.pf-set-foot{flex-direction:column;align-items:stretch}.pf-set-foot .kit-ctl-button-host{display:flex}.pf-set-foot .kit-ctl-button{width:100%}}`,
});
export function renderFormSettings(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = p.size, hid = ctx.uid('title');
  if (!Array.isArray(c.sections) || c.sections.length < 1 || c.sections.length > 6) throw new TypeError('설정 구역(sections)은 1~6개입니다');
  const rows = c.sections.map((s, i) => {
    if (!Array.isArray(s.fields) || s.fields.length < 1 || s.fields.length > 4) throw new TypeError('설정 구역의 컨트롤은 1~4개입니다');
    const sid = ctx.uid(`section-${i + 1}`), did = `${sid}-desc`;
    const controls = s.fields.map((f, j) => {
      const fid = ctx.uid(`s${i + 1}f${j + 1}`);
      if (f.type === 'select') return select(ctx, fid, f, size);
      if (f.type === 'input') return input(ctx, fid, f, size);
      throw new TypeError(`설정 컨트롤 type은 input 또는 select입니다: ${f.type}`);
    }).join('');
    return `<div class="pf-set-row" role="group" aria-labelledby="${e(sid)}"${s.description ? ` aria-describedby="${e(did)}"` : ''}><div class="pf-form-head"><h3 id="${e(sid)}">${e(s.title)}</h3>${s.description ? `<p id="${e(did)}">${e(s.description)}</p>` : ''}</div><div class="pf-set-controls">${controls}</div></div>`;
  }).join('');
  // Tab 순서 계약은 저장 → 취소다. 화면에서 읽히는 순서와 같아야 하므로 저장이 먼저 놓인다.
  const foot = `<div class="pf-set-foot">${submit(ctx.button('primary', {props: {size}, content: {label: c.saveLabel ?? '저장'}}))}${ctx.button('secondary', {props: {size}, content: {label: c.cancelLabel ?? '취소'}})}</div>`;
  const head = `<header class="pf-form-head"><h2 id="${e(hid)}">${e(c.title)}</h2>${c.description ? `<p>${e(c.description)}</p>` : ''}</header>`;
  return `<form class="pf-form pf-settings" action="${e(c.action ?? '#')}" method="post" aria-labelledby="${e(hid)}" data-layout="${v.layout}" ${formAttrs(ctx, size)}>${head}<div class="pf-set-list">${rows}</div>${foot}</form>`;
}

/* ---------- 필터 ---------- */
export const formFilter = definePurposeFamily({
  id: 'purpose:form.filter', group: 'form', sharedCss: SHARED, label: '필터 폼',
  purpose: '목록·표를 좁히는 조건을 선택 여러 개와 토글 칩으로 고르고 적용·초기화한다. 적용된 조건 수와 결과 건수를 안내한다.',
  contexts: ['dashboard', 'data', 'listing', 'commerce'], bases: [SELECT, BUTTON], children: [SELECT, BUTTON],
  entry: {module: 'src/platform/families/form.mjs', export: 'renderFormFilter'},
  variants: {layout: ['bar', 'panel'], chips: ['none', 'toggles']}, props: {size: SIZES},
  defaults: {layout: 'bar', chips: 'none', size: 'medium'},
  content: {label: {required: true, type: 'string (폼 이름·패널 제목)'}, fields: {required: true, type: '{label, options, value?, placeholder?}[] (1~4)'}, chips: {type: '{label, pressed?}[] (chips=toggles, 1~6)'}, chipsLabel: {type: 'string'}, applyLabel: {type: 'string'}, resetLabel: {type: 'string'}, appliedCount: {type: 'number'}, resultCount: {type: 'number'}, action: {type: 'url'}},
  forbidden: [],
  needs: {}, states: ['default', 'hover', 'focus', 'pressed', 'open'],
  interactions: [
    {on: '선택 click·방향키·Enter', behavior: '조건 목록 열기·이동·확정', runtime: 'attachSelect'},
    {on: '칩 click·Space·Enter', behavior: 'aria-pressed 전환(복수 선택)', runtime: 'attachButton'},
    {on: '적용 버튼 click', behavior: '폼을 제출한다(네이티브 submit, 선택 값은 hidden input으로 전달)'},
    {on: '초기화 버튼 click', behavior: '앱이 onPress 콜백으로 조건을 비운다(선택 칸의 표시 문구는 앱이 갱신한다)', runtime: 'attachButton'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'bar는 한 줄(줄바꿈 허용)이고 640px 이하에서 선택이 한 열, 적용·초기화는 전체 폭 두 칸이 된다. panel은 선택을 격자(최소 12rem 칸)로 놓고 칩·버튼을 아래 줄에 둔다.'},
  a11y: {role: 'form(aria-label) > group(칩)', keyboard: 'Tab 순서는 선택 → 칩 → 적용 → 초기화', conditions: ['적용 건수 안내는 role=status(aria-live polite)', '칩 그룹은 role=group과 이름을 가진다', '칩의 눌림은 aria-pressed(색만이 아니라 기반 버튼의 테두리 변화)', '선택·칩·버튼은 같은 size라 같은 줄에서 높이가 같다']},
  pairs: [...TEXT_PAIRS, ['--kit-muted', '--kit-canvas', 4.5, 'status on canvas'], ['--kit-text', '--kit-canvas', 7, 'status number on canvas']],
  parents: ['slot:main', 'slot:header'],
  example: {variant: {layout: 'bar', chips: 'toggles'}, props: {size: 'medium'}, content: {label: '주문 필터', appliedCount: 2, resultCount: 128, applyLabel: '적용', resetLabel: '초기화', chipsLabel: '빠른 조건', fields: [
    {label: '상태', value: 'all', options: [{value: 'all', label: '전체'}, {value: 'paid', label: '결제 완료'}, {value: 'ship', label: '배송 중'}]},
    {label: '기간', value: '30', options: [{value: '7', label: '최근 7일'}, {value: '30', label: '최근 30일'}, {value: '90', label: '최근 90일'}]},
  ], chips: [{label: '무료 배송', pressed: true}, {label: '반품 가능'}, {label: '미확인'}]}},
  render(ctx) { return renderFormFilter(ctx); },
  css: `.pf-filter{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--kit-sp-item) var(--kit-sp-item)}.pf-filter-fields{display:contents}.pf-filter-fields>*{flex:1 1 11rem;min-width:0;max-width:16rem}.pf-chips{display:flex;flex-wrap:wrap;gap:var(--kit-sp-near);min-width:0}.pf-filter-actions{display:flex;gap:var(--kit-sp-near);margin-inline-start:auto}.pf-filter-actions .kit-ctl-button,.pf-chips .kit-ctl-button{white-space:nowrap}.pf-filter-status{flex:1 0 100%;margin:0;color:var(--kit-muted);font-size:var(--kit-t-small)}.pf-filter-status .pf-num{color:var(--kit-text);font-weight:700}.pf-filter[data-layout=panel]{display:grid;gap:var(--kit-sp-head);padding:var(--pf-pad)}.pf-filter[data-layout=panel] .pf-filter-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:var(--kit-sp-item)}.pf-filter[data-layout=panel] .pf-filter-fields>*{max-width:none}.pf-filter[data-layout=panel] .pf-filter-foot{display:flex;flex-wrap:wrap;align-items:center;gap:var(--kit-sp-item);padding-top:var(--kit-sp-item);border-top:var(--pf-rule)}.pf-filter[data-layout=panel] .pf-filter-actions{margin-inline-start:auto}@media(max-width:640px){.pf-filter-fields>*{flex-basis:100%;max-width:none}.pf-filter-actions{flex:1 0 100%;margin:0}.pf-filter-actions .kit-ctl-button-host{display:flex;flex:1 1 0}.pf-filter-actions .kit-ctl-button{width:100%}}`,
});
export function renderFormFilter(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = p.size, hid = ctx.uid('title');
  if (!Array.isArray(c.fields) || c.fields.length < 1 || c.fields.length > 4) throw new TypeError('필터 선택은 1~4개입니다');
  const fields = `<div class="pf-filter-fields">${c.fields.map((f, i) => select(ctx, ctx.uid(`f${i + 1}`), f, size)).join('')}</div>`;
  let chips = '';
  if (v.chips === 'toggles') {
    if (!Array.isArray(c.chips) || c.chips.length < 1 || c.chips.length > 6) throw new TypeError('필터 칩은 1~6개입니다');
    chips = `<div class="pf-chips" role="group" aria-label="${e(c.chipsLabel ?? '빠른 조건')}">${c.chips.map(ch => ctx.button('secondary', {props: {size, behavior: 'toggle', state: ch.pressed ? 'pressed' : 'default'}, content: {label: ch.label}})).join('')}</div>`;
  }
  // Tab 순서 계약은 적용 → 초기화다. 화면에서 읽히는 순서와 같아야 하므로 적용이 먼저 놓인다.
  const actions = `<div class="pf-filter-actions">${submit(ctx.button('primary', {props: {size}, content: {label: c.applyLabel ?? '적용'}}))}${ctx.button('secondary', {props: {size}, content: {label: c.resetLabel ?? '초기화'}})}</div>`;
  const applied = c.appliedCount ?? 0;
  const status = `<p class="pf-filter-status" role="status" aria-live="polite">${applied > 0 ? `필터 ${num(`${applied}개`)} 적용` : '적용된 필터 없음'}${typeof c.resultCount === 'number' ? ` · 결과 ${num(`${c.resultCount.toLocaleString('ko-KR')}건`)}` : ''}</p>`;
  const common = `action="${e(c.action ?? '#')}" method="get" data-layout="${v.layout}" data-size="${size}"`;
  if (v.layout === 'panel') return `<form class="pf-form pf-filter pf-panel" ${common} aria-labelledby="${e(hid)}"><header class="pf-form-head"><h3 id="${e(hid)}">${e(c.label)}</h3></header>${fields}<div class="pf-filter-foot">${chips}${actions}</div>${status}</form>`;
  return `<form class="pf-form pf-filter" ${common} aria-label="${e(c.label)}">${fields}${chips}${actions}${status}</form>`;
}

/* ---------- 입력 그룹 ---------- */
export const formGroup = definePurposeFamily({
  id: 'purpose:form.group', group: 'form', sharedCss: SHARED, label: '입력 그룹',
  purpose: '입력 칸 앞이나 뒤에 단위·주소 같은 애드온 또는 제출 버튼을 한 테두리로 이어 하나의 컨트롤처럼 보인다. 도메인·금액·구독 입력에서 쓴다.',
  contexts: ['any'], bases: [INPUT, BUTTON], children: [INPUT, BUTTON],
  entry: {module: 'src/platform/families/form.mjs', export: 'renderFormGroup'},
  variants: {addon: ['prefix', 'suffix', 'button']}, props: {size: SIZES, kind: ['text', 'email', 'number'], state: ['default', 'error', 'disabled']},
  defaults: {addon: 'prefix', size: 'medium', kind: 'text', state: 'default'},
  content: {label: {required: true, type: 'string'}, placeholder: {type: 'string'}, value: {type: 'string'}, hint: {type: 'string'}, message: {type: 'string (state=error 필수)'}, addonText: {type: 'string (prefix·suffix)'}, addonIcon: {type: 'icon-name (prefix·suffix, 글자 대신)'}, buttonLabel: {type: 'string (addon=button 필수)'}, buttonIcon: {type: 'icon-name'}, name: {type: 'string'}},
  forbidden: [
    {id: 'GROUP_EDITORIAL', when: {visual: 'editorial'}, why: 'editorial의 입력 외형은 underline이라 칸의 상자가 없어 애드온·버튼을 같은 테두리로 이을 수 없다'},
  ],
  needs: {}, states: INPUT_STATES,
  interactions: [
    {on: '입력 포커스', behavior: '칸 테두리가 포커스 색으로 바뀌고 윤곽선이 이어 붙은 조각 위에 놓인다'},
    {on: 'addon=button 버튼 click', behavior: '앱이 onPress 콜백으로 처리한다', runtime: 'attachButton'},
    {on: 'blur', behavior: '네이티브 제약 검사 결과를 그룹 아래에 표시한다', runtime: 'attachInput'},
  ],
  responsive: {strategy: 'fluid', breakpoints: [], behavior: '입력 칸이 남는 폭을 채우고(min-width:0) 애드온·버튼은 글자 폭만 차지한다. 애드온 글자는 줄바꿈하지 않는다.'},
  a11y: {role: 'group(aria-labelledby 라벨)', keyboard: 'Tab으로 입력 → 버튼', conditions: ['라벨은 그룹과 입력에 모두 연결된다(그룹 aria-labelledby, 입력 label for)', '애드온 글자는 입력의 aria-describedby에 연결되어 "https:// " 같은 문맥이 읽힌다', '아이콘 애드온은 장식(aria-hidden)', '입력·애드온·버튼은 같은 size라 높이가 같다']},
  pairs: [['--kit-muted', '--kit-card-active', 4.5, 'addon text'], ['--kit-control-disabled-fg', '--kit-control-disabled-bg', 3, 'disabled addon']],
  parents: FORM_PARENTS,
  example: {variant: {addon: 'button'}, props: {size: 'medium', kind: 'email'}, content: {label: '뉴스레터 구독', placeholder: 'name@example.com', hint: '한 달에 두 번, 스팸 없이 보냅니다.', buttonLabel: '구독'}},
  render(ctx) { return renderFormGroup(ctx); },
  css: `.pf-group{--pf-radius:var(--kit-radius);max-width:32rem;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:stretch}.pf-group[data-shape=square]{--pf-radius:0px}.pf-group[data-shape=pill]{--pf-radius:999px}.pf-group .kit-ctl-input{display:contents}.pf-group .kit-ctl-input-label{grid-column:1/-1;grid-row:1;margin-bottom:var(--kit-sp-tight)}.pf-group .kit-ctl-input-box{grid-column:2;grid-row:2;min-width:0}.pf-group .kit-ctl-input-hint{grid-column:1/-1;grid-row:3;margin-top:var(--kit-sp-tight)}.pf-group .kit-ctl-input-message{grid-column:1/-1;grid-row:4;margin-top:var(--kit-sp-tight)}.pf-group .kit-ctl-input-box:focus-within{position:relative;z-index:1}.pf-addon{grid-row:2;display:inline-flex;align-items:center;gap:var(--kit-sp-near);box-sizing:border-box;min-height:var(--pf-ctl-h);padding-inline:var(--kit-sp-item);border:1px solid var(--kit-control-border);background:var(--kit-card-active);color:var(--kit-muted);font-size:var(--pf-ctl-font);font-weight:600;white-space:nowrap}.pf-addon .kit-icon{width:18px;height:18px;flex:none}.pf-group[data-appearance=filled] .pf-addon{border-color:transparent;border-bottom-color:var(--kit-control-border)}.pf-group[data-state=error] .pf-addon{border-color:var(--kit-control-error)}.pf-group[data-state=disabled] .pf-addon{border-color:var(--kit-control-disabled-bg);background:var(--kit-control-disabled-bg);color:var(--kit-control-disabled-fg)}.pf-group .kit-ctl-input-box,.pf-group .pf-addon,.pf-group .kit-ctl-button{border-radius:0}.pf-group[data-addon=prefix] .pf-addon{grid-column:1;border-start-start-radius:var(--pf-radius);border-end-start-radius:var(--pf-radius)}.pf-group[data-addon=prefix] .kit-ctl-input-box{margin-inline-start:-1px;padding-inline-start:var(--kit-sp-item);border-start-end-radius:var(--pf-radius);border-end-end-radius:var(--pf-radius)}.pf-group[data-addon=suffix] .pf-addon{grid-column:3;margin-inline-start:-1px;border-start-end-radius:var(--pf-radius);border-end-end-radius:var(--pf-radius)}.pf-group[data-addon=suffix] .kit-ctl-input-box{padding-inline-end:var(--kit-sp-item);border-start-start-radius:var(--pf-radius);border-end-start-radius:var(--pf-radius)}.pf-group[data-addon=button] .kit-ctl-input-box{padding-inline-end:var(--kit-sp-item);border-start-start-radius:var(--pf-radius);border-end-start-radius:var(--pf-radius)}.pf-group[data-addon=button] .kit-ctl-button-host{grid-column:3;grid-row:2;display:flex;margin-inline-start:-1px}.pf-group[data-addon=button] .kit-ctl-button{height:100%;white-space:nowrap;border-start-end-radius:var(--pf-radius);border-end-end-radius:var(--pf-radius)}`,
});
export function renderFormGroup(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = p.size, id = ctx.uid('field'), aid = `${id}-addon`, disabled = p.state === 'disabled';
  if (v.addon !== 'button' && !c.addonText && !c.addonIcon) throw new TypeError('애드온(prefix·suffix)에는 addonText 또는 addonIcon이 필요합니다');
  if (v.addon === 'button' && !c.buttonLabel) throw new TypeError('버튼 그룹(addon=button)에는 buttonLabel이 필요합니다');
  const hasText = v.addon !== 'button' && Boolean(c.addonText);
  const addon = v.addon === 'button' ? '' : `<span class="pf-addon" id="${e(aid)}"${hasText ? '' : ' aria-hidden="true"'}>${c.addonIcon ? icon(c.addonIcon) : ''}${hasText ? `<span>${e(c.addonText)}</span>` : ''}</span>`;
  let field = input(ctx, id, {label: c.label, hint: c.hint, placeholder: c.placeholder, value: c.value}, size, {props: {kind: p.kind, state: p.state}, content: {...(c.name ? {name: c.name} : {}), ...(c.message ? {message: c.message} : {})}});
  // 라벨에 id를 달아 그룹 이름과 연결하고, 텍스트 애드온은 입력의 설명(aria-describedby) 맨 앞에 잇는다.
  field = field.replace('class="kit-ctl-input-label" for=', `class="kit-ctl-input-label" id="${e(id)}-label" for=`);
  if (hasText) field = field.replace('aria-describedby="', `aria-describedby="${e(aid)} `);
  const button = v.addon === 'button' ? ctx.button('primary', {props: {size, state: disabled ? 'disabled' : 'default', content: c.buttonIcon ? 'icon-start' : 'text'}, content: {label: c.buttonLabel, ...(c.buttonIcon ? {icon: c.buttonIcon} : {})}}) : '';
  const shape = ctx.resolve(INPUT, {}).shape;
  return `<div class="pf-form pf-group" role="group" aria-labelledby="${e(id)}-label" data-addon="${v.addon}" data-state="${p.state}" data-shape="${shape}" ${formAttrs(ctx, size)}>${v.addon === 'prefix' ? addon : ''}${field}${v.addon === 'suffix' ? addon : ''}${button}</div>`;
}

export const FORM_FAMILIES = Object.freeze([formSearch, formAuth, formSettings, formFilter, formGroup]);
