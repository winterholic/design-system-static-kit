/** E·H·I 독립 재료: Navigation, Overlay, Feedback. 모든 출력은 패밀리 컴파일러의 실제 재료 토큰을 사용한다. */
import {definePurposeFamily, e} from './kit.mjs';

const NAV = 'base-component:navigation-menu';
const BUTTON = 'base-component:button-control';
const FEEDBACK = 'base-component:feedback-message';
const SHELL = `.ehi{box-sizing:border-box;max-inline-size:100%;min-inline-size:0;color:var(--kit-text);font:inherit;overflow-wrap:anywhere}.ehi [hidden]{display:none!important}.ehi button,.ehi input{font:inherit;color:inherit}.ehi button{min-inline-size:44px;min-block-size:44px;border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);cursor:pointer}.ehi button:focus-visible,.ehi a:focus-visible,.ehi input:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.ehi .kit-ctl-nav-link{box-sizing:border-box;min-block-size:44px}.ehi-panel{box-sizing:border-box;max-inline-size:min(36rem,calc(100vw - 2rem));max-block-size:min(80vh,48rem);overflow:auto;padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);box-shadow:var(--kit-shadow-hover)}.ehi-anchor{position:relative;display:inline-block;max-inline-size:100%}.ehi-float{position:absolute;z-index:30;inset-block-start:calc(100% + var(--kit-sp-tight));inset-inline-start:0;inline-size:max-content;min-inline-size:min(12rem,calc(100vw - 2rem));max-inline-size:min(22rem,calc(100vw - 2rem))}.ehi-float[data-flip=up]{inset-block-start:auto;inset-block-end:calc(100% + var(--kit-sp-tight))}.ehi-tip{min-inline-size:0;padding:var(--kit-sp-near) var(--kit-sp-item)}.ehi-overlay{position:fixed;z-index:100;inset:0;display:grid;place-items:center;padding:max(1rem,env(safe-area-inset-top)) max(1rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-left));background:color-mix(in srgb,var(--kit-text) 38%,transparent)}.ehi-overlay[data-placement=drawer]{place-items:stretch end}.ehi-overlay[data-placement=drawer] .ehi-dialog{inline-size:min(24rem,100%);block-size:100%;max-block-size:100%;border-radius:var(--kit-radius) 0 0 var(--kit-radius)}.ehi-dialog{inline-size:min(36rem,100%);max-block-size:100%;overflow:auto}.ehi-head{display:flex;align-items:start;justify-content:space-between;gap:var(--kit-sp-item)}.ehi-head h2,.ehi h3{margin:0;font-family:var(--kit-heading);font-size:var(--kit-t-heading);overflow-wrap:anywhere}.ehi-copy{white-space:pre-wrap;overflow-wrap:anywhere}.ehi-menu{display:grid;gap:2px;min-inline-size:12rem}.ehi-menu [role=menuitem]{display:flex;align-items:center;inline-size:100%;min-inline-size:44px;min-block-size:44px;padding-inline:var(--kit-sp-item);border:0;text-align:start;background:transparent}.ehi-menu [role=menuitem]:focus,.ehi-menu [role=menuitem]:hover{background:var(--kit-card-hover)}.ehi-menu [role=menuitem][disabled]{color:var(--kit-muted);cursor:not-allowed}.ehi-filter{display:grid;gap:var(--kit-sp-near);margin-block-end:var(--kit-sp-near)}.ehi-filter input{box-sizing:border-box;inline-size:100%;min-block-size:44px;padding-inline:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface)}.ehi-empty{margin:0;padding:var(--kit-sp-item);color:var(--kit-muted)}.ehi-empty:empty{display:none}.ehi-status{display:inline-flex;align-items:center;gap:var(--kit-sp-near);min-block-size:var(--kit-sp-item)}.ehi-dot{flex:none;inline-size:.75rem;block-size:.75rem;border-radius:50%;background:var(--kit-muted)}.ehi-callout{border-inline-start:4px solid var(--kit-info);border-radius:var(--kit-radius);background:var(--kit-soft)}.ehi-callout .kit-ctl-feedback{border:0;background:transparent}.ehi-spinner{inline-size:1.5rem;block-size:1.5rem;border:.18rem solid var(--kit-border);border-inline-start-color:var(--kit-action);border-radius:50%;animation:ehi-spin .8s linear infinite}.ehi-circle{position:relative;isolation:isolate;display:grid;place-items:center;inline-size:3.5rem;block-size:3.5rem;border-radius:50%;font-size:var(--kit-t-label);font-weight:700}.ehi-circle::before{content:"";position:absolute;z-index:-1;inset:.4rem;border-radius:50%;background:var(--kit-surface)}.ehi-progress{display:inline-grid;justify-items:center;gap:var(--kit-sp-near)}.ehi-progress-caption .kit-ctl-feedback{padding:0;border:0;background:transparent;box-shadow:none}.ehi-loading{position:relative;box-sizing:border-box;inline-size:100%;max-inline-size:36rem;min-block-size:8rem;overflow:hidden;border:1px solid var(--kit-border);border-radius:var(--kit-radius)}.ehi-loading-body{display:grid;gap:var(--kit-sp-near);padding:var(--kit-sp-item)}.ehi-loading-body span{block-size:.75rem;border-radius:var(--kit-radius);background:var(--kit-soft)}.ehi-loading-layer{position:absolute;inset:0;display:grid;place-items:center;padding:var(--kit-sp-item);background:color-mix(in srgb,var(--kit-surface) 72%,transparent)}@keyframes ehi-spin{to{transform:rotate(1turn)}}@media(prefers-reduced-motion:reduce){.ehi-spinner{animation:none;border-color:var(--kit-action)}}@media(max-width:640px){.ehi .kit-ctl-feedback-text{flex:0 1 auto}.ehi-overlay{place-items:end center;padding:0}.ehi-overlay[data-placement=drawer]{place-items:end center}.ehi-overlay[data-placement=drawer] .ehi-dialog,.ehi-dialog[data-mobile=sheet]{inline-size:100%;block-size:auto;max-block-size:min(88vh,100%);border-radius:var(--kit-radius) var(--kit-radius) 0 0}.ehi-sidebar{inline-size:100%;max-inline-size:none}}`;
const commonA11y = {keyboard: ['Tab', 'Enter', 'Space', 'Escape'], conditions: ['모든 조작 요소에 44px 이상 터치 영역', '긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음', '모션 감소 설정에서는 진행 장식 애니메이션을 정지']};
const TONE_CSS = `.ehi-callout[data-tone=success]{border-color:var(--kit-success)}.ehi-callout[data-tone=warning]{border-color:var(--kit-warning)}.ehi-callout[data-tone=error]{border-color:var(--kit-danger)}.ehi-status[data-tone=success] .ehi-dot{background:var(--kit-success)}.ehi-status[data-tone=warning] .ehi-dot{background:var(--kit-warning);border-radius:0;transform:rotate(45deg) scale(.85)}.ehi-status[data-tone=error] .ehi-dot{background:var(--kit-danger);border-radius:2px}.ehi-status[data-tone=info] .ehi-dot{background:var(--kit-info)}.ehi-status[data-tone=neutral] .ehi-dot{background:var(--kit-muted)}`;
const OPEN_CLOSE = {on: 'click·Enter·Space', behavior: '열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다', runtime: 'EHI_RUNTIME'};
const ESCAPE = {on: 'Escape', behavior: '열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다', runtime: 'EHI_RUNTIME'};
const OUTSIDE = {on: '바깥 클릭', behavior: '비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다', runtime: 'EHI_RUNTIME'};
const TRAP = {on: 'Tab', behavior: '모달 오버레이 안에서 포커스를 순환시키고, 배경 스크롤은 열린 동안 잠근다', runtime: 'EHI_RUNTIME'};
const MENU_KEYS = {on: 'ArrowDown·ArrowUp·Home·End·Tab', behavior: '비활성 항목을 건너뛰며 항목 사이를 옮기고, Tab은 메뉴를 닫고 다음 요소로 넘어간다', runtime: 'EHI_RUNTIME'};
const baseFamily = (id, label, purpose, example, overrides = {}) => definePurposeFamily({
  id, group: id.slice('purpose:'.length).split('.')[0], sharedCss: SHELL + TONE_CSS, label, purpose,
  contexts: ['any'], bases: overrides.bases ?? (id.startsWith('purpose:navigation.') ? [NAV, BUTTON] : id.startsWith('purpose:overlay.') ? [BUTTON] : [FEEDBACK]), children: overrides.bases ?? (id.startsWith('purpose:navigation.') ? [NAV, BUTTON] : id.startsWith('purpose:overlay.') ? [BUTTON] : [FEEDBACK]),
  entry: {module: 'src/platform/families/ehi.mjs', export: overrides.exportName ?? `render${label.replace(/[^A-Za-z0-9]+/g, '')}`},
  variants: overrides.variants ?? {}, props: {}, defaults: {}, content: overrides.content ?? {label: {required: true, type: 'string'}, description: {type: 'string'}},
  needs: {}, states: overrides.states ?? ['default'], interactions: overrides.interactions ?? [],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: overrides.responsive ?? '콘텐츠는 최대 뷰포트 너비를 넘기지 않고 긴 문구는 줄바꿈된다.'},
  a11y: {role: overrides.role ?? 'region', ...commonA11y, conditions: [...commonA11y.conditions, ...(overrides.conditions ?? [])]},
  pairs: [['--kit-text', '--kit-surface', 7, 'primary text'], ['--kit-muted', '--kit-surface', 4.5, 'secondary text'], ['--kit-onAction', '--kit-action', 4.5, 'action text']],
  parents: ['slot:main', 'slot:header', 'slot:aside'], example: {variant: {}, props: {}, content: {}, ...example},
  verification: {status: 'implemented', evidence: ['tests/platform-ehi-contract.test.mjs', 'e2e/platform-ehi-interaction.spec.mjs'], measured: null},
  render(ctx) { return overrides.render(ctx); }, css: overrides.css ?? '',
});
const baseButton = (ctx, label, attrs = '') => ctx.base(BUTTON, {content: {label}}).replace('<button ', `<button ${attrs} `);
const closeButton = ctx => baseButton(ctx, '닫기', 'data-ehi-close aria-label="닫기"');
/** live: 'polite'·'assertive'는 그 영역을 live region으로 낸다. null이면 역할 없는 정적 문구다(본문 흐름의 callout·진행 보조 문구). */
const baseFeedback = (ctx, {title, message, tone = 'info', state = 'visible', live = tone === 'danger' ? 'assertive' : 'polite'}) => {
  const html = ctx.base(FEEDBACK, {props: {tone, placement: 'inline', state, dismiss: 'none', action: 'none'}, content: {id: ctx.uid('feedback'), title, message}});
  return live === null ? html.replace(/ role="(status|alert)"/, '') : html.replace('role="status"', `role="status" aria-live="${live}"`).replace('role="alert"', `role="alert" aria-live="${live}"`);
};
const safeHref = value => /^(#[-\w:.]+|https:\/\/|http:\/\/|mailto:)/i.test(String(value ?? '')) ? String(value) : '#';
const navItems = items => {
  if (!Array.isArray(items) || items.length < 2 || items.length > 8 || items.some(x => typeof x?.label !== 'string' || !x.label.trim())) throw new TypeError('항목은 이름이 있는 2~8개 목록이어야 합니다');
  return items;
};
const itemList = (items, label) => {
  if (!Array.isArray(items) || items.length < 2 || items.length > 20 || items.some(x => typeof x?.label !== 'string' || !x.label.trim())) throw new TypeError('항목은 이름이 있는 2~20개 목록이어야 합니다');
  return `<div class="ehi-menu" role="menu" aria-label="${e(label)}">${items.map(x => `<button type="button" role="menuitem" tabindex="-1" data-ehi-item${x.disabled ? ' disabled aria-disabled="true"' : ''}>${e(x.label)}</button>`).join('')}</div>`;
};
const NAV_ITEMS_TYPE = '배열 {label,href,current?,disabled?}, 2~8개. current는 한 항목만 aria-current=page로 표시한다';
const NAV_EXAMPLE = [{label: '개요', href: '#overview', current: true}, {label: '설정', href: '#settings'}];

export const navigationCollapsibleSidebar = baseFamily('purpose:navigation.collapsible-sidebar', 'Collapsible Sidebar', '주요 내비게이션을 작은 화면에서 접고 펼치는 독립형 사이드바', {variant: {}, props: {}, content: {label: '주요 메뉴', items: NAV_EXAMPLE}}, {
  bases: [NAV, BUTTON], role: 'complementary > navigation', conditions: ['열림 상태에 aria-expanded·aria-controls가 실제 요소에 반영된다', '현재 위치 항목에 aria-current=page'],
  states: ['closed', 'open', 'focus', 'current'], interactions: [OPEN_CLOSE, ESCAPE],
  responsive: '열림 영역은 넓은 화면에서 18rem을 넘지 않고, 640px 이하에서는 전체 너비로 늘어난다.',
  content: {label: {required: true, type: 'string'}, items: {required: true, type: NAV_ITEMS_TYPE}},
  render: ctx => {
    const id = ctx.uid('nav'), c = ctx.content;
    const nav = ctx.base(NAV, {props: {orientation: 'vertical', size: 'medium', icons: 'none'}, content: {id: ctx.uid('links'), label: c.label, items: navItems(c.items).map(x => ({...x, href: safeHref(x.href)}))}});
    return `<aside class="ehi ehi-sidebar" data-ehi-root data-ehi-persist>${baseButton(ctx, '메뉴', `aria-expanded="false" aria-controls="${e(id)}" data-ehi-trigger`)}<div id="${e(id)}" class="ehi-panel" hidden>${nav}</div></aside>`;
  }, css: '.ehi-sidebar{display:grid;gap:var(--kit-sp-near);max-inline-size:18rem}',
});

const MODAL_STATES = ['closed', 'open', 'focus'];
const modalConditions = ['모달은 포커스를 내부에 가두고 닫을 때 호출 요소로 복귀', 'Escape·배경 클릭·닫기 단추로 닫힌다', '열려 있는 동안 배경 스크롤을 잠근다', '열림 상태에 aria-expanded·aria-controls가 일치'];
const overlaySpec = ({id, label, mobile = 'sheet', child, renderExtra = () => ''}) => baseFamily(id, label, `${label}는 콘텐츠를 주변 흐름 위에 표시하고 키보드로 닫을 수 있다.`, {variant: {}, props: {}, content: {label, description: `${label} 내용입니다.`, ...(child ? {items: NAV_EXAMPLE} : {})}}, {
  bases: [BUTTON, ...(child ? [child] : [])], role: 'dialog', states: MODAL_STATES, interactions: [OPEN_CLOSE, ESCAPE, OUTSIDE, TRAP],
  responsive: '넓은 화면에서는 오른쪽 가장자리의 패널, 640px 이하에서는 화면 아래의 시트로 열리고 내용이 길면 패널 안에서 스크롤한다.',
  content: {label: {required: true, type: 'string'}, description: {type: 'string'}, triggerLabel: {type: 'string'}, items: {required: Boolean(child), type: `navigation drawer용 ${NAV_ITEMS_TYPE}`}}, conditions: modalConditions,
  render: ctx => {
    const c = ctx.content, idBase = ctx.uid('overlay'), pane = `${idBase}-panel`, trigger = e(c.triggerLabel ?? `열기: ${c.label}`);
    return `<div class="ehi" data-ehi-root data-ehi-overlay data-focus-trap>${baseButton(ctx, trigger, `aria-haspopup="dialog" aria-expanded="false" aria-controls="${e(pane)}" data-ehi-trigger`)}<div class="ehi-overlay" id="${e(pane)}" data-ehi-backdrop data-placement="drawer" hidden><section class="ehi-panel ehi-dialog" role="dialog" aria-modal="true" aria-label="${e(c.label)}" data-mobile="${e(mobile)}" tabindex="-1"><header class="ehi-head"><h2>${e(c.label)}</h2>${closeButton(ctx)}</header>${c.description ? `<p class="ehi-copy">${e(c.description)}</p>` : ''}${renderExtra(ctx, pane)}</section></div></div>`;
  },
});
export const navigationDrawer = overlaySpec({id: 'purpose:navigation.drawer', label: 'Navigation Drawer', child: NAV, renderExtra: ctx => ctx.base(NAV, {props: {orientation: 'vertical', size: 'medium', icons: 'none'}, content: {id: ctx.uid('links'), label: ctx.content.label, items: navItems(ctx.content.items).map(x => ({...x, href: safeHref(x.href)}))}})});
export const overlayDrawer = overlaySpec({id: 'purpose:overlay.drawer', label: 'Drawer'});
export const overlayPopover = baseFamily('purpose:overlay.popover', 'Popover', 'Popover는 시작 요소 바로 아래에 붙어 보조 콘텐츠를 보여 주는 비모달 패널이다.', {variant: {}, props: {}, content: {label: 'Popover', description: 'Popover 내용입니다.'}}, {
  bases: [BUTTON], role: 'dialog', states: ['closed', 'open', 'focus'], interactions: [OPEN_CLOSE, ESCAPE, OUTSIDE],
  responsive: '패널은 시작 요소 아래에 열리고 화면 가장자리를 넘으면 안쪽으로 밀리며, 아래 공간이 없으면 위로 뒤집힌다.',
  content: {label: {required: true, type: 'string'}, description: {type: 'string'}, triggerLabel: {type: 'string'}}, conditions: ['팝오버는 비모달이며 포커스를 가두지 않고 배경 스크롤을 잠그지 않음', 'Escape·바깥 클릭·닫기 단추로 닫힌다', '열림 상태에 aria-expanded·aria-controls가 일치'],
  render: ctx => {
    const c = ctx.content, pane = `${ctx.uid('overlay')}-panel`;
    return `<div class="ehi ehi-anchor" data-ehi-root data-ehi-popover>${baseButton(ctx, e(c.triggerLabel ?? `열기: ${c.label}`), `aria-haspopup="dialog" aria-expanded="false" aria-controls="${e(pane)}" data-ehi-trigger`)}<section class="ehi-panel ehi-float" id="${e(pane)}" role="dialog" aria-modal="false" aria-label="${e(c.label)}" tabindex="-1" hidden><header class="ehi-head"><h2>${e(c.label)}</h2>${closeButton(ctx)}</header>${c.description ? `<p class="ehi-copy">${e(c.description)}</p>` : ''}</section></div>`;
  },
});
const MENU_CONTENT = {label: {required: true, type: 'string'}, items: {required: true, type: '배열 {label,disabled?}, 2~20개'}};
export const overlayDropdownMenu = baseFamily('purpose:overlay.dropdown-menu', 'Dropdown Menu', '선택 명령을 메뉴 항목으로 제공하는 키보드 내비게이션 팝업', {variant: {}, props: {}, content: {label: '파일 작업', items: [{label: '내보내기'}, {label: '복사'}]}}, {
  bases: [BUTTON], role: 'button > menu', states: ['closed', 'open', 'focus', 'disabled'], interactions: [OPEN_CLOSE, ESCAPE, OUTSIDE, MENU_KEYS],
  responsive: '메뉴는 시작 요소 아래에 겹쳐 열리고 화면 가장자리를 넘으면 안쪽으로 밀린다.', content: MENU_CONTENT, conditions: ['aria-expanded·aria-controls가 닫힌 메뉴와 연결된다', '항목을 고르면 메뉴가 닫히고 포커스가 시작 요소로 돌아온다'],
  render: ctx => {
    const c = ctx.content, id = ctx.uid('menu');
    return `<div class="ehi ehi-anchor" data-ehi-root data-ehi-menu-root>${baseButton(ctx, c.label, `aria-haspopup="menu" aria-expanded="false" aria-controls="${e(id)}" data-ehi-trigger`)}<div id="${e(id)}" class="ehi-panel ehi-float" hidden>${itemList(c.items, c.label)}</div></div>`;
  },
});
export const overlayContextualHelp = baseFamily('purpose:overlay.contextual-help', 'Contextual Help', '현재 입력이나 작업 맥락에 연결된 보조 설명', {variant: {}, props: {}, content: {label: '도움말', description: '이 항목의 설명입니다.'}}, {
  bases: [BUTTON], role: 'button > tooltip', states: ['hidden', 'shown', 'focus'], interactions: [{on: 'focus·hover', behavior: '보조 설명을 보이고, 포인터는 설명 위로 옮겨도 유지된다', runtime: 'EHI_RUNTIME'}, {on: 'Escape', behavior: '포커스를 옮기지 않고 보조 설명만 닫는다', runtime: 'EHI_RUNTIME'}, {on: 'blur·pointer leave', behavior: '포커스가 다른 요소로 가면 포커스를 되돌리지 않고 설명을 닫는다', runtime: 'EHI_RUNTIME'}],
  responsive: '설명은 시작 요소 아래에 떠 있고 화면 가장자리를 넘으면 안쪽으로 밀린다.',
  content: {label: {required: true, type: 'string'}, description: {required: true, type: 'string'}}, conditions: ['aria-describedby는 도움말 tooltip의 실제 id를 가리킨다', 'Escape로 설명만 닫을 수 있고 포인터가 설명 위에 있어도 유지된다'],
  render: ctx => {
    const c = ctx.content, id = ctx.uid('help');
    return `<span class="ehi ehi-anchor" data-ehi-root>${baseButton(ctx, c.label, `aria-describedby="${e(id)}" data-ehi-trigger data-ehi-tooltip-trigger`)}<span id="${e(id)}" role="tooltip" class="ehi-panel ehi-float ehi-tip" data-ehi-tooltip hidden>${e(c.description)}</span></span>`;
  },
});

const menuFamily = (id, label, mode) => baseFamily(id, label, `${label}는 항목 사이 방향키 이동과 Escape 닫기를 지원한다.`, {variant: {}, props: {}, content: {label, items: [{label: '첫 번째'}, {label: '두 번째'}]}}, {
  bases: [BUTTON], role: mode === 'command' ? 'button > dialog > menu' : 'button > menu', states: ['closed', 'open', 'focus', ...(mode === 'command' ? ['filtered', 'empty'] : [])],
  interactions: [OPEN_CLOSE, ESCAPE, OUTSIDE, MENU_KEYS, ...(mode === 'context' ? [{on: '오른쪽 클릭·ContextMenu 키·Shift+F10', behavior: '시작 요소에서 메뉴를 연다', runtime: 'EHI_RUNTIME'}] : []), ...(mode === 'command' ? [{on: '입력', behavior: '글자가 들어간 항목만 남기고, 맞는 항목이 없으면 안내 문구를 live region에 쓴다', runtime: 'EHI_RUNTIME'}] : [])],
  responsive: '메뉴는 시작 요소 아래에 겹쳐 열리고 화면 가장자리를 넘으면 안쪽으로 밀린다.', content: MENU_CONTENT,
  conditions: ['aria-expanded·aria-controls가 닫힌 메뉴와 연결된다', '항목을 고르면 메뉴가 닫히고 포커스가 시작 요소로 돌아온다', ...(mode === 'command' ? ['명령 검색 입력은 이름을 갖고 결과 항목을 거른다'] : [])],
  render: ctx => {
    const c = ctx.content, id = ctx.uid(mode);
    const body = mode === 'command'
      ? `<div id="${e(id)}" class="ehi-panel ehi-float" role="dialog" aria-label="${e(c.label)}" hidden><label class="ehi-filter">명령 검색<input type="search" data-ehi-filter aria-label="명령 검색" autocomplete="off"></label>${itemList(c.items, c.label)}<p class="ehi-empty" data-ehi-empty="일치하는 명령이 없습니다" role="status"></p></div>`
      : `<div id="${e(id)}" class="ehi-panel ehi-float" hidden>${itemList(c.items, c.label)}</div>`;
    return `<div class="ehi ehi-anchor" data-ehi-root data-ehi-menu-root>${baseButton(ctx, c.label, `aria-haspopup="${mode === 'command' ? 'dialog' : 'menu'}" aria-expanded="false" aria-controls="${e(id)}" data-ehi-trigger${mode === 'context' ? ' data-ehi-context-trigger' : ''}`)}${body}</div>`;
  },
});
export const navigationCommandMenu = menuFamily('purpose:navigation.command-menu', 'Command Menu', 'command');
export const navigationContextMenu = menuFamily('purpose:navigation.context-menu', 'Context Menu', 'context');

export const feedbackCallout = baseFamily('purpose:feedback.callout', 'Callout', '본문 흐름 안에서 맥락이 필요한 안내를 정적인 문구로 전달한다. 알림 영역(live region)이 아니라 읽는 순서에 놓이는 note다.', {variant: {}, props: {}, content: {label: '참고', description: '필요한 배경을 안내합니다.'}}, {
  role: 'note', states: ['info', 'success', 'warning', 'error'], interactions: [{on: 'Tab', behavior: '정적 문구라 포커스 정지점을 만들지 않는다'}],
  responsive: '문구는 본문 폭 안에서 줄바꿈되며 좁은 화면에서도 한 칸으로 읽힌다.',
  content: {label: {required: true, type: 'string'}, description: {required: true, type: 'string'}, tone: {type: 'info|success|warning|error'}}, conditions: ['live region이 아니다: 화면이 바뀔 때 알리지 않고 읽는 순서에 놓인다', '의미는 색뿐 아니라 숨은 접두 문구와 아이콘으로도 전달된다'],
  render: ctx => {
    const c = ctx.content, tone = ['info', 'success', 'warning', 'error'].includes(c.tone) ? c.tone : 'info', baseTone = tone === 'error' ? 'danger' : tone;
    return `<aside class="ehi ehi-callout" role="note" data-tone="${tone}">${baseFeedback(ctx, {title: c.label, message: c.description, tone: baseTone, live: null})}</aside>`;
  },
});
export const feedbackCircularProgress = baseFamily('purpose:feedback.circular-progress', 'Circular Progress', '작업 진행률을 원형 표시와 접근 가능한 값으로 함께 제공한다.', {variant: {}, props: {}, content: {label: '업로드', value: 40}}, {
  role: 'progressbar', states: ['determinate', 'indeterminate'], interactions: [{on: 'value 변경', behavior: '숫자·원 채움·aria-valuenow가 같은 값으로 함께 바뀐다(값이 없으면 진행 중 표시)'}],
  responsive: '원은 3.5rem 고정 크기이고 설명 문구는 원 아래에서 줄바꿈된다.',
  content: {label: {required: true, type: 'string'}, value: {type: '0~100 number; 생략 시 indeterminate'}}, conditions: ['progressbar 값은 그려진 진행량과 숫자가 같다', '원 안의 숫자는 채움색이 아니라 표면 위에 놓여 대비가 유지된다'],
  render: ctx => {
    const c = ctx.content, value = Number.isFinite(c.value) ? Math.max(0, Math.min(100, c.value)) : null;
    const progress = value === null
      ? `<span class="ehi-spinner" aria-hidden="true"></span><span role="progressbar" aria-label="${e(c.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="진행 중"></span>`
      : `<span class="ehi ehi-circle" style="background:conic-gradient(var(--kit-action) ${value}%,var(--kit-soft) 0)" role="progressbar" aria-label="${e(c.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">${value}%</span>`;
    const caption = baseFeedback(ctx, {title: c.label, message: value === null ? '진행 중' : `${value}% 완료`, live: null});
    return `<div class="ehi ehi-progress">${progress}<div class="ehi-progress-caption">${caption}</div></div>`;
  },
});
export const feedbackLoadingOverlay = baseFamily('purpose:feedback.loading-overlay', 'Loading Overlay', '한 영역 위에 진행 중 상태를 겹쳐 보이고 그 영역의 내용 조작을 막는다. 화면 전체를 덮지 않는다.', {variant: {}, props: {}, content: {label: '저장 중', description: '잠시 기다려 주세요.'}}, {
  role: 'status', states: ['loading'], interactions: [{on: '표시', behavior: '덮인 영역은 aria-busy=true가 되고 진행 문구가 live region으로 알려진다'}],
  responsive: '덮는 영역은 부모 폭을 따르고 36rem을 넘지 않는다.',
  content: {label: {required: true, type: 'string'}, description: {type: 'string'}}, conditions: ['덮는 영역은 aria-busy=true이고 가려진 내용은 보조기기에서 숨긴다', '진행 문구는 role=status live region이다', '화면 전체가 아니라 영역 안에만 겹친다'],
  render: ctx => {
    const c = ctx.content;
    return `<div class="ehi ehi-loading" data-ehi-loading-region aria-busy="true"><div class="ehi-loading-body" aria-hidden="true"><span></span><span></span><span></span></div><div class="ehi-loading-layer" data-ehi-loading>${baseFeedback(ctx, {title: c.label, message: c.description || c.label, state: 'pending'})}</div></div>`;
  },
});
export const feedbackStatusIndicator = baseFamily('purpose:feedback.status-indicator', 'Status Indicator', '상태를 점 모양·색·텍스트를 함께 사용해 전달한다.', {variant: {}, props: {}, content: {label: '동기화 완료', tone: 'success'}}, {
  role: 'status', states: ['success', 'warning', 'error', 'info', 'neutral'], interactions: [{on: '문구 변경', behavior: '같은 live region 노드의 문구가 바뀌면 보조기기가 알린다'}],
  responsive: '점과 문구는 한 줄로 놓이고 긴 문구는 줄바꿈된다.',
  content: {label: {required: true, type: 'string'}, tone: {type: 'success|warning|error|info|neutral'}}, conditions: ['상태 문구는 role=status aria-live=polite live region에 넣는다', '의미는 색뿐 아니라 점 모양(경고 마름모, 오류 사각)과 숨은 접두 문구로도 전달된다'],
  render: ctx => {
    const c = ctx.content, tone = ['success', 'warning', 'error', 'info', 'neutral'].includes(c.tone) ? c.tone : 'neutral', word = {success: '성공', warning: '주의', error: '오류', info: '안내', neutral: '상태'}[tone];
    ctx.resolve(FEEDBACK, {tone: tone === 'error' ? 'danger' : tone === 'neutral' ? 'info' : tone});
    return `<span class="ehi ehi-status" role="status" aria-live="polite" data-tone="${tone}"><span class="ehi-dot" aria-hidden="true"></span><span class="kit-ctl-sr">${word}: </span><span>${e(c.label)}</span></span>`;
  },
});

/** 목적 패밀리 레코드의 entry가 가리키는 렌더 진입점. 레코드의 render와 같은 함수다. */
export const renderCollapsibleSidebar = ctx => navigationCollapsibleSidebar.render(ctx);
export const renderNavigationDrawer = ctx => navigationDrawer.render(ctx);
export const renderCommandMenu = ctx => navigationCommandMenu.render(ctx);
export const renderContextMenu = ctx => navigationContextMenu.render(ctx);
export const renderDrawer = ctx => overlayDrawer.render(ctx);
export const renderPopover = ctx => overlayPopover.render(ctx);
export const renderDropdownMenu = ctx => overlayDropdownMenu.render(ctx);
export const renderContextualHelp = ctx => overlayContextualHelp.render(ctx);
export const renderCallout = ctx => feedbackCallout.render(ctx);
export const renderCircularProgress = ctx => feedbackCircularProgress.render(ctx);
export const renderLoadingOverlay = ctx => feedbackLoadingOverlay.render(ctx);
export const renderStatusIndicator = ctx => feedbackStatusIndicator.render(ctx);

export const EHI_FAMILIES = Object.freeze([navigationCollapsibleSidebar, navigationDrawer, navigationCommandMenu, navigationContextMenu, overlayDrawer, overlayPopover, overlayDropdownMenu, overlayContextualHelp, feedbackCallout, feedbackCircularProgress, feedbackLoadingOverlay, feedbackStatusIndicator]);
