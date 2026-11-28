/**
 * Button 목적 패밀리 7종(컴포넌트 패밀리 작업 소유): 기본, 보조, 강조, 파괴적, 아이콘, 로딩, 토글.
 *
 * 버튼 한 개의 외형·상태·접근성은 기반 컴포넌트 button-control이 소유한다. 이 파일은 "강조 단계가 다른 버튼을 어떻게 묶어 놓는가"(그룹 구조, 정렬, 안내 글, 크기 통일)만 가진다.
 * 단계별 외형(기본=solid, 보조=시각 언어의 secondary 등)은 시각 패밀리의 recipe가 정한다. 같은 그룹의 버튼은 항상 같은 size를 쓴다(크기 불일치 방지).
 */
import {icon} from '../../render/icon.mjs';
import {definePurposeFamily, e} from './kit.mjs';
import {ACTION_CSS, withButtonAttrs, menuTriggerAttrs, renderMenuPanel} from './action.mjs';

const BUTTON = 'base-component:button-control';
const SIZES = ['small', 'medium', 'large'];
const PARENTS = ['slot:main', 'slot:header', 'slot:footer', 'slot:aside', 'slot:grid-item'];
const BTN_STATES = ['default', 'hover', 'focus', 'active', 'loading', 'disabled'];

const SHARED = `.pf-actions{display:flex;flex-wrap:wrap;align-items:center;gap:var(--pf-gap);font-family:var(--kit-font)}.pf-actions[data-layout=stack]{flex-direction:column;align-items:stretch}.pf-actions[data-layout=stack] :is(.kit-ctl-button-host,.kit-ctl-button){width:100%}.pf-actions[data-layout=pair] .kit-ctl-button-host{flex:0 1 auto}.pf-actions[data-align=end]{justify-content:flex-end}.pf-helper{display:flex;gap:var(--kit-sp-near);align-items:flex-start;margin:0;color:var(--kit-muted);font-size:var(--kit-t-small);word-break:keep-all;overflow-wrap:anywhere}.pf-helper .kit-icon{flex:none;width:18px;height:18px;margin-top:1px}.pf-actions .kit-ctl-button{white-space:nowrap}.pf-actions .kit-ctl-button[data-appearance=link]{min-height:var(--ctl-h);padding-inline:var(--kit-sp-near)}.pf-destructive{display:grid;gap:var(--pf-gap)}@media(max-width:640px){.pf-actions[data-layout=pair]{flex-direction:column;align-items:stretch}.pf-actions[data-layout=pair] :is(.kit-ctl-button-host,.kit-ctl-button){width:100%}}`;

const sizeOf = ctx => ctx.props.size;

/* ---------- 기본 ---------- */
export const buttonPrimary = definePurposeFamily({
  id: 'purpose:button.primary', group: 'button', sharedCss: SHARED, label: '기본 버튼 묶음',
  purpose: '화면의 주 동작 하나(저장, 다음, 확인)를 맨 앞에 두고 취소 같은 보조 동작을 곁들인다. 폼 하단과 카드 하단에서 쓴다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonPrimary'},
  variants: {layout: ['single', 'pair', 'stack'], align: ['start', 'end']}, props: {size: SIZES, state: ['default', 'loading', 'disabled']},
  defaults: {layout: 'single', align: 'start', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string'}, secondaryLabel: {type: 'string'}, icon: {type: 'icon-name'}},
  forbidden: [
    {id: 'BTN_PRIMARY_STACK_END', when: {layout: 'stack', align: 'end'}, why: '세로로 쌓으면 버튼이 전체 폭이라 끝 정렬이 의미가 없다'},
  ],
  needs: {}, states: BTN_STATES,
  interactions: [{on: 'click·Enter·Space', behavior: '주 동작 실행(기반 버튼 attachButton)'}, {on: 'pair', behavior: '보조 버튼은 같은 크기·같은 높이의 보조 외형'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'pair는 640px 이하에서 세로로 쌓이고 주 동작이 위에 온다(DOM 순서 그대로 위에서 아래로). 버튼은 전체 폭이 된다.'},
  a11y: {role: 'group', keyboard: 'Tab 순서는 주 동작 → 보조 동작', conditions: ['버튼 이름은 동사로 시작', '그룹에는 aria-label이 없어도 되지만 폼 안에서는 폼 제목과 연결된다', '포커스 링 3:1 이상']},
  pairs: [['--kit-onAction', '--kit-action', 4.5, 'primary label']],
  parents: PARENTS, example: {variant: {layout: 'pair', align: 'end'}, props: {size: 'medium'}, content: {label: '저장', secondaryLabel: '취소'}},
  render(ctx) { return renderButtonPrimary(ctx); },
  css: ``,
});
export function renderButtonPrimary(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx);
  const main = ctx.button('primary', {props: {size, state: p.state, content: c.icon ? 'icon-end' : 'text'}, content: {label: c.label, ...(c.icon ? {icon: c.icon} : {})}});
  const sec = v.layout !== 'single' && c.secondaryLabel ? ctx.button('secondary', {props: {size}, content: {label: c.secondaryLabel}}) : '';
  // Tab 순서 계약은 주 동작 → 보조 동작이다. 화면에서 읽히는 순서와 같아야 하므로 pair도 주 동작이 먼저 놓인다(모바일은 위에서 아래로 같은 순서).
  return `<div class="pf-actions" role="group" data-layout="${v.layout}" data-align="${v.align}">${main}${sec}</div>`;
}

/* ---------- 보조 ---------- */
export const buttonSecondary = definePurposeFamily({
  id: 'purpose:button.secondary', group: 'button', sharedCss: SHARED, label: '보조 버튼 묶음',
  purpose: '주 동작 곁에 놓이는 낮은 강조 동작(내보내기, 더 보기, 필터 초기화)을 아이콘과 함께 한 줄로 늘어놓는다. 툴바와 카드 머리에서 쓴다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonSecondary'},
  variants: {layout: ['single', 'row'], tier: ['secondary', 'tertiary']}, props: {size: SIZES, state: ['default', 'disabled']},
  defaults: {layout: 'row', tier: 'secondary', size: 'medium', state: 'default'},
  content: {items: {required: true, type: '{label, icon?}[] (1~3)'}},
  forbidden: [
    {id: 'BTN_SECONDARY_SINGLE_TIER', when: {layout: 'single', tier: 'tertiary'}, why: '혼자 있는 3단계(링크·고스트) 버튼은 주변에 비교할 단계가 없어 버튼으로 읽히지 않는다(secondary를 쓴다)'},
  ],
  needs: {}, states: ['default', 'hover', 'focus', 'active', 'disabled'],
  interactions: [{on: 'click·Enter·Space', behavior: '각 버튼의 동작(기반 버튼)'}, {on: 'hover·focus', behavior: '외곽선·배경 변화'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'row는 줄바꿈된다(flex-wrap). 버튼 높이와 글자 크기는 모두 같다.'},
  a11y: {role: 'group', keyboard: 'Tab으로 차례대로', conditions: ['아이콘은 라벨 옆 장식', '비활성은 disabled 속성과 대비 3:1 표시']},
  pairs: [['--kit-text', '--kit-surface', 4.5, 'secondary outline label']],
  parents: PARENTS, example: {variant: {layout: 'row', tier: 'secondary'}, props: {size: 'medium'}, content: {items: [{label: '내보내기', icon: 'download'}, {label: '공유', icon: 'share'}]}},
  render(ctx) { return renderButtonSecondary(ctx); },
  css: ``,
});
export function renderButtonSecondary(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx);
  const items = (v.layout === 'single' ? c.items.slice(0, 1) : c.items.slice(0, 3));
  const html = items.map(it => ctx.button(v.tier, {props: {size, state: p.state, content: it.icon ? 'icon-start' : 'text'}, content: {label: it.label, ...(it.icon ? {icon: it.icon} : {})}})).join('');
  return `<div class="pf-actions" role="group" data-layout="${v.layout}">${html}</div>`;
}

/* ---------- 강조 ---------- */
export const buttonEmphasis = definePurposeFamily({
  id: 'purpose:button.emphasis', group: 'button', sharedCss: SHARED, label: '강조(CTA) 버튼',
  purpose: '페이지에서 가장 먼저 눌러야 할 동작 하나를 문구·보조 설명과 함께 크게 보인다. 랜딩 히어로와 구독 유도 영역에서 쓴다.',
  contexts: ['landing', 'marketing', 'commerce'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonEmphasis'},
  variants: {layout: ['inline', 'banner']}, props: {size: ['medium', 'large']},
  defaults: {layout: 'inline', size: 'large'},
  content: {label: {required: true, type: 'string'}, headline: {type: 'string'}, helper: {type: 'string'}, secondaryLabel: {type: 'string'}},
  forbidden: [
    {id: 'BTN_EMPHASIS_BANNER_MEDIUM', when: {layout: 'banner', size: 'medium'}, why: '배너형 CTA는 문구 줄과 같은 시각 무게가 필요해 large 버튼에서만 균형이 맞는다'},
  ],
  needs: {}, states: ['default', 'hover', 'focus', 'active'],
  interactions: [{on: 'click·Enter·Space', behavior: '핵심 동작 실행(기반 버튼)'}, {on: 'hover', behavior: '배경 한 단계 어둡게(action-hover)'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '배너는 640px 이하에서 문구 위, 버튼 아래로 쌓이고 버튼은 전체 폭이 된다.'},
  a11y: {role: 'group (+ banner는 section)', keyboard: 'Tab 순서는 강조 버튼 → 보조 링크', conditions: ['버튼 대비 4.5:1', '보조 설명은 aria-describedby로 버튼과 연결']},
  pairs: [['--kit-onAction', '--kit-action', 4.5, 'emphasis label'], ['--kit-text', '--kit-card-hover', 7, 'banner headline'], ['--kit-muted', '--kit-card-hover', 4.5, 'banner helper']],
  parents: ['slot:main', 'slot:header', 'slot:footer'], example: {variant: {layout: 'banner'}, props: {size: 'large'}, content: {headline: '디자인 시스템을 오늘 조립해 보세요', helper: '신용카드 없이 14일 무료', label: '무료로 시작', secondaryLabel: '데모 보기'}},
  render(ctx) { return renderButtonEmphasis(ctx); },
  css: `.pf-cta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--kit-sp-item) var(--kit-gap);padding:var(--pf-pad);border-radius:var(--kit-radius);background:var(--kit-card-hover);color:var(--kit-text)}.pf-cta-text{display:grid;gap:var(--kit-sp-tight);min-width:0;flex:1 1 16rem}.pf-cta-text h3{margin:0;font-family:var(--kit-heading);font-size:var(--kit-t-heading);font-weight:var(--pf-title-weight);line-height:1.25;word-break:keep-all;overflow-wrap:anywhere}.pf-cta-text p{margin:0;color:var(--kit-muted)}.pf-cta[data-layout=inline]{background:transparent;padding:0}.pf-cta .pf-actions{flex:0 0 auto}@media(max-width:640px){.pf-cta .pf-actions{width:100%;flex-direction:column;align-items:stretch}.pf-cta .pf-actions :is(.kit-ctl-button-host,.kit-ctl-button){width:100%}}`,
});
export function renderButtonEmphasis(ctx) {
  const {content: c, variant: v} = ctx, size = sizeOf(ctx), hid = ctx.uid('helper'), tid = ctx.uid('headline');
  const main = ctx.button('emphasis', {props: {size, content: 'icon-end'}, content: {label: c.label, icon: 'arrow-right', describedBy: c.helper ? hid : ''}});
  const sec = c.secondaryLabel ? ctx.button('tertiary', {props: {size}, content: {label: c.secondaryLabel}}) : '';
  const text = (c.headline || c.helper) ? `<div class="pf-cta-text">${c.headline ? `<h3 id="${e(tid)}">${e(c.headline)}</h3>` : ''}${c.helper ? `<p id="${e(hid)}">${e(c.helper)}</p>` : ''}</div>` : '';
  // 계약: banner는 section(제목이 이름). 제목이 없으면 이름 없는 section이 되므로 div로 둔다.
  const [open, close] = v.layout === 'banner' && c.headline ? [`<section class="pf-cta" data-layout="banner" aria-labelledby="${e(tid)}">`, '</section>'] : [`<div class="pf-cta" data-layout="${v.layout}">`, '</div>'];
  return `${open}${text}<div class="pf-actions" role="group">${main}${sec}</div>${close}`;
}

/* ---------- 파괴적 ---------- */
export const buttonDestructive = definePurposeFamily({
  id: 'purpose:button.destructive', group: 'button', sharedCss: SHARED, label: '파괴적 버튼 묶음',
  purpose: '되돌릴 수 없는 동작(삭제, 탈퇴, 초기화)을 취소와 함께 두고, 결과를 안내하는 글을 붙인다. 위험 동작은 주 동작보다 앞에 놓지 않는다.',
  contexts: ['settings', 'dashboard', 'data'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonDestructive'},
  variants: {guard: ['note', 'none'], layout: ['pair', 'stack']}, props: {size: SIZES, state: ['default', 'loading', 'disabled']},
  defaults: {guard: 'note', layout: 'pair', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string'}, cancelLabel: {type: 'string'}, note: {type: 'string'}},
  forbidden: [
    {id: 'BTN_DESTRUCTIVE_NO_NOTE_STACK', when: {guard: 'none', layout: 'stack'}, why: '안내 글 없이 전체 폭으로 쌓은 위험 버튼은 실수로 누르기 쉽다'},
    {id: 'BTN_DESTRUCTIVE_LOADING_NOTE', when: {guard: 'note', state: 'disabled'}, why: '안내 글이 있는데 버튼이 비활성이면 왜 못 누르는지가 안내와 모순된다(disabled는 guard none에서만)'},
  ],
  needs: {}, states: BTN_STATES,
  interactions: [{on: 'click·Enter·Space', behavior: '위험 동작 실행(기반 버튼, tone=danger)'}, {on: 'loading', behavior: '진행 중에는 클릭 차단, 포커스 유지(aria-disabled)'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '640px 이하에서 세로로 쌓이고 취소가 위, 위험 버튼이 아래 전체 폭이다.'},
  a11y: {role: 'group', keyboard: 'Tab 순서는 취소 → 위험 동작(실수 방지)', conditions: ['위험 동작의 결과를 안내 글이 설명하고 aria-describedby로 연결', '위험 의미는 색만이 아니라 문구(삭제·영구)로 전달', '대비 4.5:1']},
  pairs: [['--kit-surface', '--kit-danger', 4.5, 'danger label'], ['--kit-danger', '--kit-surface', 4.5, 'danger outline'], ['--kit-muted', '--kit-surface', 4.5, 'note text']],
  parents: ['slot:main', 'slot:footer', 'slot:overlay'], example: {variant: {guard: 'note', layout: 'pair'}, props: {size: 'medium'}, content: {label: '프로젝트 삭제', cancelLabel: '취소', note: '삭제하면 파일 142개와 변경 이력이 영구히 사라집니다.'}},
  render(ctx) { return renderButtonDestructive(ctx); },
  css: ``,
});
export function renderButtonDestructive(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx), nid = ctx.uid('note');
  const danger = ctx.base(BUTTON, {props: {appearance: 'solid', tone: 'danger', size, state: p.state, content: 'icon-start'}, content: {label: c.label, icon: 'trash', ...(v.guard === 'note' && c.note ? {describedBy: nid} : {})}});
  const cancel = ctx.button('secondary', {props: {size}, content: {label: c.cancelLabel ?? '취소'}});
  const note = v.guard === 'note' && c.note ? `<p class="pf-helper" id="${e(nid)}">${icon('alert-triangle')}<span>${e(c.note)}</span></p>` : '';
  return `<div class="pf-destructive">${note}<div class="pf-actions" role="group" data-layout="${v.layout}" data-align="end">${cancel}${danger}</div></div>`;
}

/* ---------- 아이콘 ---------- */
export const buttonIcon = definePurposeFamily({
  id: 'purpose:button.icon', group: 'button', sharedCss: SHARED, label: '아이콘 버튼 툴바',
  purpose: '글자 없이 아이콘만으로 동작을 나열한다(복사, 편집, 더보기). 좁은 머리줄과 표 행 끝에서 쓰며, 모든 버튼은 접근 가능한 이름을 가진다.',
  contexts: ['dashboard', 'data', 'listing'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonIcon'},
  variants: {layout: ['toolbar', 'attached']}, props: {size: SIZES, state: ['default', 'disabled']},
  defaults: {layout: 'toolbar', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string (툴바 이름)'}, items: {required: true, type: '{icon, ariaLabel}[] (2~5)'}},
  forbidden: [],
  needs: {}, states: ['default', 'hover', 'focus', 'active', 'disabled'],
  interactions: [{on: 'click·Enter·Space', behavior: '각 아이콘 동작'}, {on: 'hover·focus', behavior: '배경 변화, 포커스 링'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '버튼은 정사각형 터치 영역(최소 44px 변)을 유지한다. 줄이 모자라면 줄바꿈한다.'},
  a11y: {role: 'toolbar', keyboard: 'Tab으로 차례대로(각 버튼이 탭 정지)', conditions: ['모든 아이콘 버튼에 aria-label(필수, BTN_ICON_NAME)', '툴바에 aria-label', '아이콘만으로 의미가 모호하면 Tooltip과 함께 쓴다']},
  pairs: [['--kit-text', '--kit-surface', 4.5, 'icon outline']],
  parents: ['slot:header', 'slot:main', 'slot:grid-item'], example: {variant: {layout: 'toolbar'}, props: {size: 'medium'}, content: {label: '문서 도구', items: [{icon: 'copy', ariaLabel: '복사'}, {icon: 'edit', ariaLabel: '편집'}, {icon: 'share', ariaLabel: '공유'}, {icon: 'more', ariaLabel: '더보기'}]}},
  render(ctx) { return renderButtonIcon(ctx); },
  css: `.pf-iconbar{display:inline-flex;flex-wrap:wrap;gap:var(--kit-sp-near)}.pf-iconbar[data-layout=attached]{gap:0}.pf-iconbar[data-layout=attached] .kit-ctl-button{border-radius:0}.pf-iconbar[data-layout=attached] .kit-ctl-button-host+.kit-ctl-button-host .kit-ctl-button{margin-inline-start:-1px}.pf-iconbar[data-layout=attached] .kit-ctl-button-host:first-child .kit-ctl-button{border-start-start-radius:var(--kit-radius);border-end-start-radius:var(--kit-radius)}.pf-iconbar[data-layout=attached] .kit-ctl-button-host:last-child .kit-ctl-button{border-start-end-radius:var(--kit-radius);border-end-end-radius:var(--kit-radius)}`,
});
export function renderButtonIcon(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx);
  if (!Array.isArray(c.items) || c.items.length < 2 || c.items.length > 5) throw new TypeError('아이콘 버튼 툴바는 2~5개입니다');
  const html = c.items.map(it => ctx.button('secondary', {props: {size, state: p.state, content: 'icon-only'}, content: {icon: it.icon, ariaLabel: it.ariaLabel}})).join('');
  return `<div class="pf-iconbar" role="toolbar" aria-label="${e(c.label)}" data-layout="${v.layout}">${html}</div>`;
}

/* ---------- 로딩 ---------- */
export const buttonLoading = definePurposeFamily({
  id: 'purpose:button.loading', group: 'button', sharedCss: SHARED, label: '로딩 버튼',
  purpose: '요청을 보내는 동안 버튼의 크기를 바꾸지 않고 진행 중임을 알린다. 저장·결제·업로드처럼 응답을 기다리는 동작에서 쓴다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonLoading'},
  variants: {phase: ['loading', 'idle', 'compare'], tier: ['primary', 'secondary']}, props: {size: SIZES},
  defaults: {phase: 'loading', tier: 'primary', size: 'medium'},
  content: {label: {required: true, type: 'string'}, loadingLabel: {type: 'string'}},
  forbidden: [],
  needs: {}, states: ['default', 'loading', 'hover', 'focus'],
  interactions: [{on: 'loading', behavior: '스피너가 시작 자리를 채우고 클릭만 막는다(aria-disabled). 포커스는 유지된다', runtime: 'attachButton'}, {on: 'compare', behavior: '대기와 로딩을 나란히 놓아 두 상태의 크기가 같음을 확인한다'}],
  responsive: {strategy: 'viewport', breakpoints: [], behavior: '라벨은 줄바꿈하지 않는다. 대기·로딩 버튼은 최소 폭(9em, 가로 여백이 넓은 패밀리는 여백 두 배 + 6em)을 같이 쓰고, compare는 같은 폭의 두 칸이라 상태가 바뀌어도 폭이 흔들리지 않는다.'},
  a11y: {role: 'button (aria-busy, aria-disabled)', keyboard: '로딩 중에도 포커스 유지, Enter·Space는 무시', conditions: ['진행 안내는 role=status 숨은 글(처리 중입니다)', '진행 중 라벨을 바꾸더라도 버튼 이름은 동작을 설명']},
  pairs: [['--kit-onAction', '--kit-action', 4.5, 'loading label']],
  parents: PARENTS, example: {variant: {phase: 'compare', tier: 'primary'}, props: {size: 'medium'}, content: {label: '결제하기', loadingLabel: '결제 중'}},
  render(ctx) { return renderButtonLoading(ctx); },
  css: `.pf-actions[data-phase] .kit-ctl-button{min-inline-size:max(9em,calc(var(--kit-inset) * 2 + 6em))}.pf-actions[data-phase=compare]{display:inline-grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}.pf-actions[data-phase=compare] :is(.kit-ctl-button-host,.kit-ctl-button){width:100%}`,
});
export function renderButtonLoading(ctx) {
  const {content: c, variant: v} = ctx, size = sizeOf(ctx);
  const one = (state, label) => ctx.button(v.tier, {props: {size, state}, content: {label}});
  const idle = one('default', c.label), busy = one('loading', c.loadingLabel ?? c.label);
  return `<div class="pf-actions" role="group" data-layout="row" data-phase="${v.phase}">${v.phase === 'compare' ? idle + busy : v.phase === 'idle' ? idle : busy}</div>`;
}

/* ---------- 토글 ---------- */
export const buttonToggle = definePurposeFamily({
  id: 'purpose:button.toggle', group: 'button', sharedCss: SHARED, label: '토글 버튼',
  purpose: '켜짐·꺼짐이 남는 선택(즐겨찾기, 보기 방식, 필터 칩)을 aria-pressed 버튼으로 보인다. 단일 토글과 여러 개를 묶은 그룹이 있다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonToggle'},
  variants: {layout: ['single', 'group']}, props: {size: SIZES, state: ['default', 'pressed', 'disabled']},
  defaults: {layout: 'single', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string (그룹 이름 또는 단일 라벨)'}, icon: {type: 'icon-name'}, items: {type: '{label, pressed?, icon?}[] (2~4, group)'}},
  forbidden: [
    {id: 'BTN_TOGGLE_GROUP_PRESSED', when: {layout: 'group', state: 'pressed'}, why: '그룹은 각 항목이 자기 pressed를 가지므로 그룹 전체의 상태를 정할 수 없다(items[].pressed로 준다)'},
  ],
  needs: {}, states: ['default', 'pressed', 'hover', 'focus', 'active', 'disabled'],
  interactions: [{on: 'click·Space·Enter', behavior: 'aria-pressed 전환, onPress 콜백', runtime: 'attachButton'}, {on: 'group', behavior: '항목이 독립 토글(복수 선택). 단일 선택 라디오와 다르다'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '그룹은 줄바꿈된다. 눌림 상태는 색만이 아니라 아이콘(check)과 aria-pressed로 전달한다.'},
  a11y: {role: 'button[aria-pressed] (group은 role=group + aria-label)', keyboard: 'Tab, Space·Enter로 전환', conditions: ['pressed 상태는 aria-pressed로 전달', '라벨은 상태가 바뀌어도 같다(상태를 라벨에 넣지 않는다)']},
  pairs: [['--kit-text', '--kit-card-active', 4.5, 'pressed label'], ['--kit-onAction', '--kit-action', 4.5, 'pressed solid']],
  parents: PARENTS, example: {variant: {layout: 'group'}, props: {size: 'medium'}, content: {label: '보기 방식', items: [{label: '목록', pressed: true, icon: 'list'}, {label: '격자', icon: 'grid'}, {label: '지도', icon: 'map-pin'}]}},
  render(ctx) { return renderButtonToggle(ctx); },
  css: ``,
});
export function renderButtonToggle(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx);
  const one = (label, pressed, ic) => ctx.button('secondary', {props: {size, behavior: 'toggle', state: pressed ? 'pressed' : p.state === 'disabled' ? 'disabled' : 'default', content: ic ? 'icon-start' : 'text'}, content: {label, ...(ic ? {icon: ic} : {})}});
  if (v.layout === 'single') return `<div class="pf-actions" role="group" aria-label="${e(c.label)}">${one(c.label, p.state === 'pressed', c.icon)}</div>`;
  if (!Array.isArray(c.items) || c.items.length < 2 || c.items.length > 4) throw new TypeError('토글 그룹은 항목이 2~4개입니다');
  return `<div class="pf-actions" role="group" aria-label="${e(c.label)}" data-layout="row">${c.items.map(it => one(it.label, Boolean(it.pressed), it.icon)).join('')}</div>`;
}

/* ---------- 분할 버튼 ---------- */
const MENU_ITEMS = {type: '{label, value?}[] (2~8)', required: true};
const MENU_EXAMPLE = [{label: 'PDF로 저장', value: 'pdf'}, {label: 'CSV로 저장', value: 'csv'}, {label: '링크 복사', value: 'link'}];
const MENU_STATES = ['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'expanded'];
const MENU_PAIRS = [['--kit-text', '--kit-surface', 4.5, 'menu item'], ['--kit-text', '--kit-card-hover', 4.5, 'menu item hover'], ['--kit-focus', '--kit-surface', 3, 'menu item focus ring']];
const menuRule = (id, who) => ({on: `${who} click·Enter·Space·ArrowDown`, behavior: '메뉴를 열고 첫 항목에 포커스를 둔다(aria-expanded=true)', runtime: id});
export const buttonSplit = definePurposeFamily({
  id: 'purpose:button.split', group: 'button', sharedCss: SHARED, label: '분할 버튼',
  purpose: '자주 쓰는 주 동작 하나와 같은 계열의 대안 동작(다른 형식으로 저장, 예약 전송)을 한 덩어리로 둔다. 주 동작은 바로 실행하고 화살표 버튼은 메뉴만 연다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonSplit'},
  variants: {tier: ['primary', 'secondary']}, props: {size: SIZES, state: ['default', 'loading', 'disabled']},
  defaults: {tier: 'primary', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string'}, menuLabel: {type: 'string (화살표 버튼의 접근 가능한 이름)'}, items: MENU_ITEMS},
  forbidden: [], needs: {}, states: MENU_STATES,
  interactions: [{on: '주 버튼 click·Enter·Space', behavior: '주 동작 실행(메뉴는 열리지 않는다)', runtime: 'attachButton'}, menuRule('actionRuntime', '화살표 버튼'), {on: 'Escape·바깥 클릭', behavior: '메뉴를 닫고 화살표 버튼으로 포커스를 돌려준다', runtime: 'actionRuntime'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '두 버튼은 붙어 있는 한 덩어리로 줄바꿈하지 않는다. 메뉴 패널은 12em 이상, 화면 폭의 90%를 넘지 않는다. 각 버튼은 44px 이상이다.'},
  a11y: {role: 'group (주 버튼 + button[aria-haspopup=menu])', keyboard: 'Tab 순서는 주 버튼 → 화살표 버튼, ArrowDown으로 메뉴를 열고 방향키·Home·End로 이동, Escape로 닫기', conditions: ['화살표 버튼은 aria-haspopup=menu와 aria-expanded', '화살표 버튼의 접근 가능한 이름', '메뉴는 role=menu이고 항목은 menuitem']},
  pairs: [['--kit-onAction', '--kit-action', 4.5, 'split label'], ...MENU_PAIRS],
  parents: PARENTS, example: {variant: {tier: 'primary'}, props: {size: 'medium'}, content: {label: '내보내기', menuLabel: '내보내기 형식 선택', items: MENU_EXAMPLE}},
  render(ctx) { return renderButtonSplit(ctx); },
  css: ACTION_CSS,
});
export function renderButtonSplit(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx), pid = ctx.uid('menu');
  const main = ctx.button(v.tier, {props: {size, state: p.state}, content: {label: c.label}});
  const caret = withButtonAttrs(ctx.button(v.tier, {props: {size, state: p.state === 'loading' ? 'disabled' : p.state, content: 'icon-only'}, content: {icon: 'chevron-down', ariaLabel: c.menuLabel ?? `${c.label} 옵션`}}), menuTriggerAttrs(pid));
  return `<div class="pf-menu" data-action-menu><div class="pf-split" role="group" aria-label="${e(c.label)}">${main}${caret}</div>${renderMenuPanel({id: pid, label: c.menuLabel ?? `${c.label} 옵션`, items: c.items})}</div>`;
}

/* ---------- 메뉴 버튼 ---------- */
export const buttonMenu = definePurposeFamily({
  id: 'purpose:button.menu', group: 'button', sharedCss: SHARED, label: '메뉴 버튼',
  purpose: '여러 동작을 하나의 버튼 뒤에 접어 둔다(더 보기, 정렬 기준, 작업 메뉴). 버튼 자체는 동작을 실행하지 않고 메뉴만 연다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonMenu'},
  variants: {tier: ['secondary', 'tertiary']}, props: {size: SIZES, state: ['default', 'disabled']},
  defaults: {tier: 'secondary', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string'}, items: MENU_ITEMS},
  forbidden: [], needs: {}, states: ['default', 'hover', 'focus', 'active', 'disabled', 'expanded'],
  interactions: [menuRule('actionRuntime', '버튼'), {on: '항목 click·Enter·Space', behavior: '메뉴를 닫고 트리거로 포커스를 돌려준 뒤 kit-menu-select 이벤트를 낸다', runtime: 'actionRuntime'}, {on: 'Escape·바깥 클릭·Tab', behavior: '메뉴를 닫는다', runtime: 'actionRuntime'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '트리거 라벨은 줄바꿈하지 않고 메뉴 패널이 화면 폭의 90%를 넘지 않는다. 항목은 44px 이상이다.'},
  a11y: {role: 'button[aria-haspopup=menu]', keyboard: 'Enter·Space·ArrowDown으로 열고 방향키·Home·End로 항목 이동, Escape로 닫고 트리거로 복귀', conditions: ['트리거는 aria-haspopup=menu와 aria-expanded와 aria-controls', '메뉴는 role=menu이고 항목은 menuitem', '닫을 때 포커스는 트리거로 돌아간다']},
  pairs: MENU_PAIRS,
  parents: PARENTS, example: {variant: {tier: 'secondary'}, props: {size: 'medium'}, content: {label: '더 보기', items: MENU_EXAMPLE}},
  render(ctx) { return renderButtonMenu(ctx); },
  css: ACTION_CSS,
});
export function renderButtonMenu(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx), pid = ctx.uid('menu');
  const trigger = withButtonAttrs(ctx.button(v.tier, {props: {size, state: p.state, content: 'icon-end'}, content: {label: c.label, icon: 'chevron-down'}}), menuTriggerAttrs(pid));
  return `<div class="pf-menu" data-action-menu>${trigger}${renderMenuPanel({id: pid, label: c.label, items: c.items})}</div>`;
}

/* ---------- 플로팅 액션 버튼 ---------- */
export const buttonFab = definePurposeFamily({
  id: 'purpose:button.fab', group: 'button', sharedCss: SHARED, label: '플로팅 액션 버튼',
  purpose: '화면에서 가장 중요한 단일 동작(새 글, 새 작업)을 떠 있는 원형 버튼으로 둔다. 아이콘만 있는 형태와 라벨을 더한 확장형이 있다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonFab'},
  variants: {extended: ['icon', 'extended']}, props: {size: ['medium', 'large'], state: ['default', 'loading', 'disabled']},
  defaults: {extended: 'icon', size: 'large', state: 'default'},
  content: {label: {required: true, type: 'string (접근 가능한 이름이자 확장형의 라벨)'}, icon: {type: 'icon-name'}},
  forbidden: [], needs: {}, states: BTN_STATES,
  interactions: [{on: 'click·Enter·Space', behavior: '화면의 주 동작 실행(기반 버튼 attachButton)', runtime: 'attachButton'}, {on: 'loading', behavior: '스피너가 아이콘 자리를 채우고 클릭만 막는다', runtime: 'attachButton'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '터치 영역은 56px 이상의 원형이다. 화면 모서리 고정(position)과 safe-area는 페이지 배치가 정하며 이 컴포넌트는 흐름 안에 놓인다.'},
  a11y: {role: 'button', keyboard: 'Tab, Enter·Space', conditions: ['아이콘만 있는 형태도 접근 가능한 이름', '원형 터치 영역 56px 이상', '떠 있는 그림자는 장식이며 포커스 링이 따로 보인다']},
  pairs: [['--kit-onAction', '--kit-action', 4.5, 'fab label']],
  parents: ['slot:main', 'slot:footer', 'slot:overlay', 'slot:grid-item'], example: {variant: {extended: 'icon'}, props: {size: 'large'}, content: {label: '새 작업 추가', icon: 'plus'}},
  render(ctx) { return renderButtonFab(ctx); },
  css: ACTION_CSS,
});
export function renderButtonFab(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx), ext = v.extended === 'extended';
  const btn = ctx.button('emphasis', {props: {size, state: p.state, content: ext ? 'icon-start' : 'icon-only'}, content: {label: c.label, icon: c.icon ?? 'plus', ...(ext ? {} : {ariaLabel: c.label})}});
  return `<div class="pf-fab" data-extended="${ext}">${btn}</div>`;
}

/* ---------- 복사 버튼 ---------- */
export const buttonCopy = definePurposeFamily({
  id: 'purpose:button.copy', group: 'button', sharedCss: SHARED, label: '복사 버튼',
  purpose: '값(링크, 코드, 계좌번호)을 클립보드로 복사하고 복사됐음을 말해 준다. 시각 변화가 아니라 읽어 주는 상태 문구로 결과를 전달한다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonCopy'},
  variants: {display: ['label', 'icon-only']}, props: {size: SIZES, state: ['default', 'disabled']},
  defaults: {display: 'label', size: 'medium', state: 'default'},
  content: {label: {required: true, type: 'string'}, text: {required: true, type: 'string (복사할 값)'}, copiedLabel: {type: 'string (복사 성공 안내)'}},
  forbidden: [], needs: {}, states: ['default', 'hover', 'focus', 'active', 'disabled', 'copied'],
  interactions: [{on: 'click·Enter·Space', behavior: '값을 클립보드로 복사하고 상태 문구(role=status)를 갱신한다. 클립보드를 쓸 수 없으면 실패 문구를 읽어 준다', runtime: 'actionRuntime'}, {on: 'disabled', behavior: '복사를 실행하지 않는다', runtime: 'actionRuntime'}],
  responsive: {strategy: 'viewport', breakpoints: [], behavior: '아이콘만 있는 형태도 터치 영역은 44px 이상이다. 라벨은 줄바꿈된다.'},
  a11y: {role: 'button', keyboard: 'Tab, Enter·Space', conditions: ['복사 결과는 role=status 안내로 전달', '아이콘만 있는 형태도 접근 가능한 이름', '복사할 값은 버튼 이름에 넣지 않는다']},
  pairs: [['--kit-text', '--kit-surface', 4.5, 'copy outline']],
  parents: PARENTS, example: {variant: {display: 'label'}, props: {size: 'medium'}, content: {label: '링크 복사', text: 'https://example.com/share/abc', copiedLabel: '링크를 복사했습니다.'}},
  render(ctx) { return renderButtonCopy(ctx); },
  css: ACTION_CSS,
});
export function renderButtonCopy(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx), only = v.display === 'icon-only';
  const btn = ctx.button('secondary', {props: {size, state: p.state, content: only ? 'icon-only' : 'icon-start'}, content: {label: c.label, icon: 'copy', ...(only ? {ariaLabel: c.label} : {})}});
  return `<div class="pf-actions" role="group" aria-label="${e(c.label)}">${withButtonAttrs(btn, `data-copy-text="${e(c.text)}"${c.copiedLabel ? ` data-copied-label="${e(c.copiedLabel)}"` : ''}`)}</div>`;
}

/* ---------- 닫기 버튼 ---------- */
export const buttonClose = definePurposeFamily({
  id: 'purpose:button.close', group: 'button', sharedCss: SHARED, label: '닫기 버튼',
  purpose: '배너·패널·알림처럼 사용자가 치울 수 있는 덩어리의 오른쪽 끝에 둔다. 닫기 버튼은 이름 있는 아이콘 버튼이며 가장 가까운 닫을 수 있는 영역을 숨긴다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/button.mjs', export: 'renderButtonClose'},
  variants: {layout: ['standalone', 'attached']}, props: {size: SIZES, state: ['default', 'disabled']},
  defaults: {layout: 'attached', size: 'medium', state: 'default'},
  content: {ariaLabel: {type: 'string (접근 가능한 이름, 기본 닫기)'}, message: {type: 'string (attached에서 닫을 영역의 내용)'}},
  forbidden: [
    {id: 'BTN_CLOSE_ATTACHED_DISABLED', when: {layout: 'attached', state: 'disabled'}, why: '닫을 수 없는 영역에 닫기 버튼을 붙이면 왜 못 닫는지 알 수 없다(attached는 항상 활성)'},
  ],
  needs: {}, states: ['default', 'hover', 'focus', 'active', 'disabled'],
  interactions: [{on: 'click·Enter·Space', behavior: 'attached는 가장 가까운 닫을 수 있는 영역을 숨기고 kit-dismiss 이벤트를 낸다. standalone은 이벤트만 낸다', runtime: 'actionRuntime'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '터치 영역은 44px 이상이다. attached는 내용이 길어도 닫기 버튼이 밀려나지 않고 내용이 줄바꿈된다.'},
  a11y: {role: 'button', keyboard: 'Tab, Enter·Space', conditions: ['아이콘만 있으므로 접근 가능한 이름', '닫힌 뒤 영역은 접근성 트리에서도 사라진다(hidden)', '터치 영역 44px 이상']},
  pairs: [['--kit-text', '--kit-surface', 4.5, 'close ghost'], ['--kit-text', '--kit-soft', 4.5, 'attached message']],
  parents: ['slot:main', 'slot:header', 'slot:footer', 'slot:overlay', 'slot:grid-item'], example: {variant: {layout: 'attached'}, props: {size: 'medium'}, content: {ariaLabel: '공지 닫기', message: '새 버전이 배포되었습니다. 변경 내용을 확인하세요.'}},
  render(ctx) { return renderButtonClose(ctx); },
  css: ACTION_CSS,
});
export function renderButtonClose(ctx) {
  const {content: c, variant: v, props: p} = ctx, size = sizeOf(ctx), name = c.ariaLabel ?? '닫기';
  // 아이콘만 있는 버튼은 link 외형을 가질 수 없다(BTN_LINK_ICON_ONLY). 3단계가 link인 시각 패밀리는 2단계 외형을 쓴다.
  const role = ctx.visual.recipe.tertiary === 'link' ? 'secondary' : 'tertiary';
  const btn = withButtonAttrs(ctx.button(role, {props: {size, state: p.state, content: 'icon-only'}, content: {icon: 'x', ariaLabel: name}}), 'data-action-dismiss');
  if (v.layout === 'standalone' || !c.message) return `<div class="pf-actions" role="group" aria-label="${e(name)}">${btn}</div>`;
  return `<div class="pf-dismissible" data-dismissible><p data-layout-role="desc">${e(c.message)}</p>${btn}</div>`;
}

export const BUTTON_FAMILIES = Object.freeze([buttonPrimary, buttonSecondary, buttonEmphasis, buttonDestructive, buttonIcon, buttonLoading, buttonToggle, buttonSplit, buttonMenu, buttonFab, buttonCopy, buttonClose]);
