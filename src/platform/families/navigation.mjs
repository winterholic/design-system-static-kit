/**
 * Navigation 목적 패밀리 4종(컴포넌트 패밀리 작업 소유): 사이드바, 상단 메뉴, 탭, 모바일 하단 바.
 *
 * 메뉴 한 줄의 외형(현재 위치 표시)·모양·상태·접근성·런타임(attachNavigation·attachTabs)은 기반 컴포넌트가 소유한다.
 * 시각 패밀리가 appearance·shape를 고정하므로 이 파일은 props로 바꾸지 않는다. 이 파일은 "메뉴를 어떤 셸에 어떻게 배치하는가"(브랜드 머리, 접힘, 우측 동작, 하단 재배치)만 가진다.
 * 같은 줄에 놓이는 메뉴와 버튼은 같은 size를 쓴다(높이 불균형 방지).
 */
import {icon} from '../../render/icon.mjs';
import {definePurposeFamily, e} from './kit.mjs';

const NAV = 'base-component:navigation-menu', TABS = 'base-component:tabs-control', BUTTON = 'base-component:button-control';
const SIZES = ['small', 'medium', 'large'];
const ICONS = ['none', 'start'];

const brand = c => `<a class="pf-brand" href="${e(c.brandHref ?? '#')}"><span class="pf-brand-mark">${icon(c.brandIcon ?? 'sparkles')}</span><span class="pf-brand-name">${e(c.brand)}</span></a>`;
const BRAND = {brand: {required: true, type: 'string'}, brandIcon: {type: 'icon-name'}, brandHref: {type: 'url'}};
const ITEMS = {label: {required: true, type: 'string (메뉴 접근 가능한 이름)'}, items: {required: true, type: '{label, href, icon?, current?, disabled?}[] (2~8)'}};
const NAV_STATES = ['default', 'hover', 'focus', 'active', 'current', 'disabled'];
const NAV_PAIRS = [['--kit-text', '--kit-surface', 7, 'brand'], ['--kit-text', '--kit-card-hover', 7, 'brand on filled'], ['--kit-onAction', '--kit-action', 4.5, 'brand mark']];

// 공통 CSS(sharedCss): 브랜드 머리는 사이드바와 상단 메뉴가 같은 모양을 쓴다.
const SHARED = `.pf-brand{display:inline-flex;align-items:center;gap:var(--kit-sp-near);min-width:0;min-height:44px;color:var(--kit-text);font-family:var(--kit-heading);font-size:var(--kit-t-sub);font-weight:var(--pf-title-weight);line-height:1.2;text-decoration:none;word-break:keep-all;overflow-wrap:anywhere}.pf-brand-mark{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:calc(var(--kit-radius) * .6);background:var(--kit-action);color:var(--kit-onAction)}.pf-brand-mark .kit-icon{width:20px;height:20px}.pf-brand:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.pf-bar-surface{box-sizing:border-box;border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-surface);box-shadow:var(--kit-shadow);color:var(--kit-text);font-family:var(--kit-font)}[data-family=editorial] .pf-bar-surface{border-radius:0;border-block-end:var(--pf-rule)}[data-family=editorial] .pf-sidebar{border-block-end:0;border-inline-end:var(--pf-rule)}@media(max-width:640px){[data-family=editorial] .pf-sidebar{border-inline-end:0;border-block-end:var(--pf-rule)}}@media(max-width:640px){.pf :is(.kit-ctl-nav-link,.kit-ctl-tab,.kit-ctl-button){min-block-size:44px}.pf .kit-ctl-tab{min-inline-size:44px}}`;

/* ---------- 사이드바 ---------- */
export const navigationSidebar = definePurposeFamily({
  id: 'purpose:navigation.sidebar', group: 'navigation', sharedCss: SHARED, label: '사이드바',
  purpose: '서비스의 주요 구역을 세로 목록으로 늘어놓고 현재 위치를 보인다. 대시보드·관리 화면의 왼쪽 고정 영역에서 쓰며 640px 이하에서는 머리만 남기고 접힌다.',
  contexts: ['dashboard', 'data', 'settings'], bases: [NAV], children: [NAV],
  entry: {module: 'src/platform/families/navigation.mjs', export: 'renderNavigationSidebar'},
  variants: {density: ['default', 'compact'], footer: ['none', 'links']}, props: {size: SIZES, icons: ICONS},
  defaults: {density: 'default', footer: 'none', size: 'medium', icons: 'none'},
  content: {...BRAND, ...ITEMS, sectionTitle: {type: 'string'}, footerLabel: {type: 'string (보조 메뉴 이름)'}, footerItems: {type: '{label, href, icon?}[] (footer=links, 2~8)'}},
  forbidden: [
  ],
  needs: {}, states: NAV_STATES,
  interactions: [
    {on: 'link click', behavior: '쪽 안 링크면 현재 위치(aria-current)가 눌린 항목으로 옮겨진다', runtime: 'attachNavigation'},
    {on: '≤640px summary click·Enter·Space', behavior: '접힌 메뉴 영역을 연다(네이티브 details/summary, 스크립트 없음). 641px 이상에서는 항상 펼쳐져 있다'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '641px 이상은 폭 18rem 이내의 세로 목록이다. 640px 이하는 전체 폭 머리줄(브랜드 + 메뉴 열기 버튼)만 보이고 메뉴는 details 안에 접힌다. ::details-content를 모르는 브라우저는 모든 폭에서 열기 버튼이 보인다.'},
  a11y: {role: 'complementary > navigation', keyboard: 'Tab으로 링크를 차례대로, 접힌 상태의 열기 버튼은 Enter·Space', conditions: ['현재 위치는 aria-current=page(색만이 아니라 기반 메뉴의 굵기·표시)', '터치 대상은 브랜드·열기 버튼 44px 이상', '메뉴 이름(aria-label)이 필수', '아이콘은 장식(aria-hidden)']},
  pairs: [...NAV_PAIRS, ['--kit-muted', '--kit-surface', 4.5, 'section title'], ['--kit-muted', '--kit-card-hover', 4.5, 'section title on filled']],
  parents: ['slot:aside', 'slot:main'],
  example: {variant: {density: 'default', footer: 'links'}, props: {size: 'medium', icons: 'start'}, content: {brand: '디자인 키트', brandIcon: 'sparkles', label: '주요 메뉴', sectionTitle: '워크스페이스', items: [{label: '개요', href: '#overview', icon: 'home', current: true}, {label: '프로젝트', href: '#projects', icon: 'folder'}, {label: '팀', href: '#team', icon: 'users'}, {label: '리포트', href: '#reports', icon: 'chart'}], footerLabel: '보조 메뉴', footerItems: [{label: '설정', href: '#settings', icon: 'settings'}, {label: '도움말', href: '#help', icon: 'help-circle'}]}},
  render(ctx) { return renderNavigationSidebar(ctx); },
  css: `.pf-sidebar{position:relative;display:grid;gap:var(--kit-sp-head);width:100%;max-width:18rem;padding:var(--pf-pad)}.pf-sidebar[data-density=compact]{gap:var(--kit-sp-near);padding:var(--kit-sp-item)}.pf-side-head{display:flex;align-items:center;min-height:44px;min-width:0}.pf-side-body{display:grid;gap:var(--kit-sp-near);min-width:0}.pf-sidebar[data-density=compact] .kit-ctl-nav-list{gap:0}.pf-side-title{margin:0;color:var(--kit-muted);font-size:var(--kit-t-label);font-weight:600;text-transform:var(--pf-label-case);letter-spacing:var(--pf-label-track);word-break:keep-all;overflow-wrap:anywhere}.pf-side-foot{display:grid;gap:var(--kit-sp-near);margin-top:var(--kit-sp-near);padding-top:var(--kit-sp-near);border-top:var(--pf-rule)}.pf-side-fold{min-width:0}.pf-side-fold>summary{display:flex;align-items:center;gap:var(--kit-sp-near);box-sizing:border-box;min-height:44px;padding-inline:var(--kit-sp-item);border:1px solid var(--kit-control-border);border-radius:var(--kit-radius);color:var(--kit-text);font-size:var(--kit-t-label);font-weight:600;list-style:none;cursor:pointer}.pf-side-fold>summary::-webkit-details-marker{display:none}.pf-side-fold>summary:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.pf-side-fold>summary .kit-icon{width:18px;height:18px;flex:none}.pf-side-fold>summary .pf-side-close{display:none}.pf-side-fold[open]>summary .pf-side-open{display:none}.pf-side-fold[open]>summary .pf-side-close{display:inline-flex}.pf-side-fold[open]>summary{margin-bottom:var(--kit-sp-near)}@supports selector(::details-content){@media(min-width:641px){.pf-side-fold>summary{display:none}.pf-side-fold::details-content{content-visibility:visible;display:block}}}@media(max-width:640px){.pf-sidebar{max-width:none;gap:0}.pf-side-fold[open]{margin-top:var(--kit-sp-near)}.pf-side-fold>summary{position:absolute;inset-block-start:var(--pf-pad);inset-inline-end:var(--pf-pad)}.pf-sidebar[data-density=compact] .pf-side-fold>summary{inset-block-start:var(--kit-sp-item);inset-inline-end:var(--kit-sp-item)}.pf-side-fold[open]>summary{margin-bottom:0}.pf-side-fold:not([open])>*:not(summary){display:none}}`,
});
export function renderNavigationSidebar(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  const nav = (suffix, label, items) => ctx.base(NAV, {props: {orientation: 'vertical', size: p.size, icons: p.icons}, content: {id: ctx.uid(suffix), label, items}});
  const foot = v.footer === 'links' ? `<div class="pf-side-foot">${nav('foot', c.footerLabel ?? '보조 메뉴', c.footerItems)}</div>` : '';
  const title = c.sectionTitle ? `<p class="pf-side-title">${e(c.sectionTitle)}</p>` : '';
  return `<aside class="pf-sidebar pf-bar-surface" data-density="${v.density}" aria-label="${e(c.brand)} 사이드바"><div class="pf-side-head">${brand(c)}</div><details class="pf-side-fold"><summary><span class="pf-side-open">${icon('menu')}</span><span class="pf-side-close">${icon('x')}</span><span>메뉴</span></summary><div class="pf-side-body">${title}${nav('menu', c.label, c.items)}${foot}</div></details></aside>`;
}

/* ---------- 상단 메뉴 ---------- */
export const navigationTopbar = definePurposeFamily({
  id: 'purpose:navigation.topbar', group: 'navigation', sharedCss: SHARED, label: '상단 메뉴',
  purpose: '브랜드, 가로 메뉴, 우측 주요 동작(로그인·시작하기)을 한 줄 머리로 묶는다. 랜딩·콘텐츠·대시보드 페이지 맨 위에서 쓰며 640px 이하에서는 메뉴가 토글 뒤로 접힌다.',
  contexts: ['any'], bases: [NAV, BUTTON], children: [NAV, BUTTON],
  entry: {module: 'src/platform/families/navigation.mjs', export: 'renderNavigationTopbar'},
  variants: {actions: ['none', 'buttons'], sticky: ['static', 'sticky']}, props: {size: ['small', 'medium'], icons: ICONS},
  defaults: {actions: 'buttons', sticky: 'static', size: 'medium', icons: 'none'},
  content: {...BRAND, ...ITEMS, actions: {type: '{label, tier?: primary|secondary}[] (actions=buttons, 1~2)'}},
  forbidden: [
    {id: 'TOPBAR_STICKY_TRANSPARENT', when: {sticky: 'sticky', visual: 'editorial'}, why: '본문 위에 고정되는 바는 불투명한 면이 필요한데 editorial의 면은 투명해(opaqueSurface false) 아래로 지나가는 본문이 비친다'},
  ],
  needs: {}, states: NAV_STATES,
  interactions: [
    {on: '≤640px toggle click·Enter·Space', behavior: '메뉴 목록을 머리 아래 패널로 열고 닫는다(aria-expanded)', runtime: 'attachNavigation'},
    {on: 'Escape·바깥 클릭·링크 클릭', behavior: '열린 메뉴를 닫고 Escape는 토글로 포커스를 돌려준다', runtime: 'attachNavigation'},
    {on: 'link click', behavior: '쪽 안 링크면 aria-current가 옮겨진다', runtime: 'attachNavigation'},
    {on: 'sticky', behavior: 'sticky 변형은 스크롤해도 화면 위에 남는다(position:sticky)'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '641px 이상은 브랜드 | 메뉴 | 우측 동작이 한 줄이다. 640px 이하는 브랜드 + 메뉴 토글이 첫 줄, 동작 버튼이 둘째 줄(같은 너비)이고 메뉴 목록은 머리 아래 패널로 열린다.'},
  a11y: {role: 'banner > navigation', keyboard: 'Tab 순서는 브랜드 → 메뉴(또는 토글) → 동작 버튼', conditions: ['토글은 aria-expanded·aria-controls', '현재 위치 aria-current=page', '메뉴와 버튼은 같은 size라 같은 줄에서 높이가 같다', '터치 대상 44px 이상(브랜드·토글)']},
  pairs: [...NAV_PAIRS, ['--kit-onAction', '--kit-action', 4.5, 'primary action label'], ['--kit-text', '--kit-canvas', 7, 'brand on canvas']],
  parents: ['slot:header'],
  example: {variant: {actions: 'buttons', sticky: 'static'}, props: {size: 'medium', icons: 'none'}, content: {brand: '디자인 키트', brandIcon: 'sparkles', label: '사이트 메뉴', items: [{label: '제품', href: '#product', icon: 'grid', current: true}, {label: '요금', href: '#pricing', icon: 'tag'}, {label: '문서', href: '#docs', icon: 'book'}, {label: '블로그', href: '#blog', icon: 'message'}], actions: [{label: '시작하기', tier: 'primary'}, {label: '로그인', tier: 'secondary'}]}},
  render(ctx) { return renderNavigationTopbar(ctx); },
  css: `.pf-topbar{position:relative;display:flex;align-items:center;gap:var(--kit-sp-item) var(--kit-gap);width:100%;padding:var(--kit-sp-near) var(--pf-pad)}.pf-topbar[data-sticky=sticky]{position:sticky;top:0;z-index:30}.pf-topbar .kit-ctl-nav{position:static;flex:1 1 auto;min-width:0}.pf-top-actions{display:flex;flex:none;align-items:center;gap:var(--kit-sp-near);margin-inline-start:auto}.pf-top-actions .kit-ctl-button{white-space:nowrap}@media(max-width:640px){.pf-topbar{flex-wrap:wrap;padding-inline:var(--kit-sp-item)}.pf-topbar .pf-brand{flex:1 1 auto}.pf-topbar .kit-ctl-nav{flex:0 0 auto}.pf-topbar .kit-ctl-nav-toggle{min-height:44px;min-width:44px}.pf-topbar .kit-ctl-nav-list{position:absolute;z-index:40;inset:100% 0 auto;margin:var(--kit-sp-tight) 0 0;padding:var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);box-shadow:var(--kit-shadow-hover)}.pf-top-actions{flex:1 0 100%;margin:0}.pf-top-actions .kit-ctl-button-host{flex:1 1 0}.pf-top-actions .kit-ctl-button{width:100%}}`,
});
export function renderNavigationTopbar(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  const menu = ctx.base(NAV, {props: {orientation: 'horizontal', overflow: 'collapse', size: p.size, icons: p.icons}, content: {id: ctx.uid('menu'), label: c.label, items: c.items}});
  let actions = '';
  if (v.actions === 'buttons') {
    if (!Array.isArray(c.actions) || c.actions.length < 1 || c.actions.length > 2) throw new TypeError('상단 메뉴의 우측 동작은 1~2개입니다');
    actions = `<div class="pf-top-actions">${c.actions.map((a, i) => ctx.button(a.tier ?? (i === 0 ? 'primary' : 'secondary'), {props: {size: p.size}, content: {label: a.label}})).join('')}</div>`;
  }
  return `<header class="pf-topbar pf-bar-surface" data-sticky="${v.sticky}">${brand(c)}${menu}${actions}</header>`;
}

/* ---------- 탭 ---------- */
export const navigationTabs = definePurposeFamily({
  id: 'purpose:navigation.tabs', group: 'navigation', sharedCss: SHARED, label: '탭',
  purpose: '같은 대상의 관점(개요·작업·파일)을 한 자리에서 바꿔 보여 준다. 패널 머리(제목·설명)와 탭별 개수 배지를 곁들여 상세 화면과 설정 화면에서 쓴다.',
  contexts: ['dashboard', 'data', 'settings', 'content'], bases: [TABS], children: [TABS],
  entry: {module: 'src/platform/families/navigation.mjs', export: 'renderNavigationTabs'},
  variants: {layout: ['top', 'side'], counts: ['none', 'badge']}, props: {size: SIZES, activation: ['automatic', 'manual'], icons: ICONS, state: ['ready', 'loading']},
  defaults: {layout: 'top', counts: 'none', size: 'medium', activation: 'automatic', icons: 'none', state: 'ready'},
  content: {title: {required: true, type: 'string (패널 머리 제목)'}, description: {type: 'string'}, label: {type: 'string (탭 목록 이름, 기본은 title)'}, selected: {type: 'tab id'}, tabs: {required: true, type: '{id, label, content, icon?, count?: number, disabled?}[] (2~6)'}},
  forbidden: [
    {id: 'TABS_SIDE_SEGMENTED', when: {layout: 'side', visual: 'bold'}, why: 'bold 시각 패밀리는 탭 외형을 segmented로 고정하는데 segmented는 세로로 세우면 트랙이 칸 목록처럼 읽힌다(TABS_SEGMENTED_VERTICAL)'},
  ],
  needs: {}, states: ['ready', 'loading', 'selected', 'unselected', 'hover', 'focus', 'active', 'disabled'],
  interactions: [
    {on: 'click', behavior: '눌린 탭이 선택되고 해당 패널만 보인다', runtime: 'attachTabs'},
    {on: 'ArrowLeft·ArrowRight(side는 ArrowUp·ArrowDown)·Home·End', behavior: '탭 사이 포커스 이동(roving tabindex), automatic은 포커스가 곧 선택, manual은 Enter·Space로 선택', runtime: 'attachTabs'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'side는 640px 이하에서 가로 줄로 눕고 그 줄 안에서만 스크롤한다. 탭 목록이 폭을 넘으면 목록 안에서만 가로 스크롤하고 쪽은 넘치지 않는다.'},
  a11y: {role: 'tablist > tab + tabpanel', keyboard: 'Tab으로 선택된 탭에 진입, 방향키로 이동, Home·End, 비활성 탭은 건너뛴다', conditions: ['선택은 aria-selected(색만이 아니라 기반 탭의 표시 방식)', '개수 배지는 숫자 글자이고 숨은 글 "개"가 붙는다', '패널 머리 제목이 탭 목록의 이름이 된다', 'loading은 패널 aria-busy와 role=status']},
  pairs: [['--kit-text', '--kit-surface', 7, 'panel head title'], ['--kit-text', '--kit-card-hover', 7, 'panel head title on filled'], ['--kit-muted', '--kit-surface', 4.5, 'panel head description'], ['--kit-muted', '--kit-card-hover', 4.5, 'panel head description on filled'], ['--kit-text', '--kit-card-active', 4.5, 'count badge']],
  parents: ['slot:main', 'slot:grid-item'],
  example: {variant: {layout: 'top', counts: 'badge'}, props: {size: 'medium'}, content: {title: '프로젝트 현황', description: '이번 분기 진행 중인 프로젝트를 관점별로 봅니다.', selected: 'overview', tabs: [{id: 'overview', label: '개요', icon: 'home', content: '프로젝트의 목표와 현재 상태를 요약합니다.', count: 4}, {id: 'tasks', label: '작업', icon: 'check-circle', content: '이번 주에 끝낼 작업 목록입니다.', count: 12}, {id: 'files', label: '파일', icon: 'file', content: '공유된 파일 스물세 개가 있습니다.', count: 23}, {id: 'archive', label: '보관', icon: 'folder', content: '보관된 항목입니다.', disabled: true}]}},
  render(ctx) { return renderNavigationTabs(ctx); },
  css: `.pf-tabs{display:grid;gap:var(--kit-sp-head);min-width:0;font-family:var(--kit-font)}.pf-tabs-head{display:grid;gap:var(--kit-sp-tight);min-width:0}.pf-tabs-head h3{margin:0;color:var(--kit-text);font-family:var(--kit-heading);font-size:var(--kit-t-heading);font-weight:var(--pf-title-weight);line-height:1.25;word-break:keep-all;overflow-wrap:anywhere}.pf-tabs-head p{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small);word-break:keep-all;overflow-wrap:anywhere}.pf-tabs .kit-ctl-tabs{min-width:0}.pf-tabs .kit-ctl-tabs[data-orientation=horizontal] .kit-ctl-tablist{max-width:100%;overflow-x:auto;scrollbar-width:thin}.pf-tabs .kit-ctl-panels{min-width:0;padding:var(--pf-pad);border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-surface);box-shadow:var(--kit-shadow)}[data-family=editorial] .pf-tabs .kit-ctl-panels{padding-inline:0;border-radius:0}.pf-count{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:1.75em;min-height:1.5em;padding-inline:var(--kit-sp-near);border-radius:999px;background:var(--kit-card-active);color:var(--kit-text);font-size:max(12px,var(--kit-t-caption));font-weight:700;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums}@media(max-width:640px){.pf-tabs .kit-ctl-tablist .kit-ctl-tab{padding-inline:var(--kit-sp-near)}}`,
});
export function renderNavigationTabs(ctx) {
  const {content: c, variant: v, props: p} = ctx, tid = ctx.uid('heading');
  if (!Array.isArray(c.tabs)) throw new TypeError('탭 목록(tabs)이 필요합니다');
  let html = ctx.base(TABS, {props: {orientation: v.layout === 'side' ? 'vertical' : 'horizontal', size: p.size, activation: p.activation, icons: p.icons, state: p.state}, content: {id: ctx.uid('tabs'), label: c.label ?? c.title, tabs: c.tabs.map(({count, ...t}) => t), ...(c.selected ? {selected: c.selected} : {})}});
  // 기반 탭의 라벨은 글자만 받으므로, 개수 배지는 렌더된 탭 버튼 끝에 붙인다(버튼의 data-tab·aria-* 속성은 그대로라 attachTabs와 호환).
  if (v.counts === 'badge') for (const t of c.tabs) {
    if (typeof t.count !== 'number') continue;
    html = html.replace(new RegExp(`(data-tab="${t.id.replace(/[^a-z0-9-]/g, '')}"[^>]*>[\\s\\S]*?)(</button>)`), `$1<span class="pf-count">${t.count}<span class="kit-ctl-sr">개</span></span>$2`);
  }
  const head = `<header class="pf-tabs-head"><h3 id="${e(tid)}">${e(c.title)}</h3>${c.description ? `<p>${e(c.description)}</p>` : ''}</header>`;
  return `<section class="pf-tabs" aria-labelledby="${e(tid)}">${head}${html}</section>`;
}

/* ---------- 모바일 하단 바 ---------- */
export const navigationBottom = definePurposeFamily({
  id: 'purpose:navigation.bottom', group: 'navigation', sharedCss: SHARED, label: '모바일 하단 바',
  purpose: '모바일 화면 맨 아래에서 주요 3~5개 구역을 아이콘 위·라벨 아래 칸으로 바꿔 누르게 한다. 엄지가 닿는 자리라 항목마다 44px 이상의 터치 칸을 갖는다.',
  contexts: ['dashboard', 'commerce', 'content', 'listing'], bases: [NAV], children: [NAV],
  entry: {module: 'src/platform/families/navigation.mjs', export: 'renderNavigationBottom'},
  variants: {position: ['static', 'sticky']}, props: {size: ['small', 'medium']},
  defaults: {position: 'static', size: 'medium'},
  content: {label: ITEMS.label, items: {required: true, type: '{label, href, icon(필수), current?}[] (3~5)'}},
  forbidden: [],
  needs: {visual: {opaqueSurface: true}}, states: NAV_STATES,
  interactions: [
    {on: 'link click', behavior: '쪽 안 링크면 aria-current가 눌린 칸으로 옮겨진다', runtime: 'attachNavigation'},
    {on: 'sticky', behavior: 'sticky 변형은 스크롤해도 본문 아래에 붙어 있다(position:sticky; bottom:0)'},
  ],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '640px 이하는 전체 폭 바이고 모서리가 없다. 641px 이상은 32rem 폭의 정적 바로 가운데에 놓인다. 칸은 균등 폭이며 라벨은 줄바꿈된다. 하단 안전 영역(safe-area)만큼 아래 여백이 더해진다.'},
  a11y: {role: 'navigation', keyboard: 'Tab으로 칸을 차례대로', conditions: ['모든 칸에 아이콘과 라벨(아이콘만으로 구분하지 않는다)', '칸 높이 56px(터치 44px 이상)', '현재 위치 aria-current=page', '바깥 셸은 landmark를 만들지 않고 기반 메뉴가 navigation을 맡는다']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'bottom item'], ['--kit-muted', '--kit-card-hover', 4.5, 'bottom item on filled']],
  parents: ['slot:footer'],
  example: {variant: {position: 'static'}, props: {size: 'medium'}, content: {label: '하단 메뉴', items: [{label: '홈', href: '#home', icon: 'home', current: true}, {label: '검색', href: '#search', icon: 'search'}, {label: '알림', href: '#alerts', icon: 'bell'}, {label: '내 정보', href: '#me', icon: 'user'}]}},
  render(ctx) { return renderNavigationBottom(ctx); },
  css: `.pf-bottom{width:100%;padding:var(--kit-sp-tight) var(--kit-sp-near);padding-block-end:max(var(--kit-sp-tight),env(safe-area-inset-bottom))}@media(min-width:641px){.pf-bottom{max-width:32rem;margin-inline:auto}}.pf-bottom[data-sticky]{position:sticky;bottom:0;z-index:30}.pf-bottom .kit-ctl-nav-list{flex-wrap:nowrap;gap:0}.pf-bottom .kit-ctl-nav-item{flex:1 1 0;min-width:0}.pf-bottom .kit-ctl-nav-link{flex-direction:column;justify-content:center;gap:var(--kit-sp-tight);min-height:56px;padding-inline:var(--kit-sp-tight);font-size:max(12px,var(--kit-t-caption));line-height:1.2;text-align:center;white-space:normal;word-break:keep-all;overflow-wrap:anywhere}.pf-bottom .kit-ctl-nav[data-appearance=underline] .kit-ctl-nav-link{border-bottom-width:0;border-top-width:2px}@media(max-width:640px){.pf-bottom{border-radius:0}}`,
});
export function renderNavigationBottom(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!Array.isArray(c.items) || c.items.length < 3 || c.items.length > 5) throw new TypeError('하단 바는 항목이 3~5개입니다');
  const menu = ctx.base(NAV, {props: {orientation: 'horizontal', overflow: 'none', icons: 'start', size: p.size}, content: {id: ctx.uid('menu'), label: c.label, items: c.items}});
  return `<div class="pf-bottom pf-bar-surface"${v.position === 'sticky' ? ' data-sticky' : ''}>${menu}</div>`;
}

export const NAVIGATION_FAMILIES = Object.freeze([navigationSidebar, navigationTopbar, navigationTabs, navigationBottom]);
