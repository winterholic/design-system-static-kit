import {defineContract, resolveProps, sizeCSS, baseStyles, focusRing, hover, active, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {icon} from '../render/icon.mjs';

/** Navigation: 외형(현재 위치 표시 방식)·모양·크기·기능(방향·좁은 화면 처리·하위 메뉴·아이콘)·상태(메뉴 열림)를 따로 둔다. */
export const navigationContract = defineContract({
  id: 'component:navigation-menu', label: 'Navigation',
  inputFields: ['id', 'label', 'items', 'force'],
  axes: {
    appearance: ['underline', 'pill', 'block'], shape: SHAPES, size: SIZES,
    orientation: ['horizontal', 'vertical'], overflow: ['none', 'scroll', 'collapse'], submenu: ['none', 'disclosure'], icons: ['none', 'start'],
    state: ['closed', 'open'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['orientation', 'overflow', 'submenu', 'icons'], state: ['state']},
  defaults: {appearance: 'underline', shape: 'soft', size: 'medium', orientation: 'horizontal', overflow: 'none', submenu: 'none', icons: 'none', state: 'closed'},
  states: ['closed', 'open', 'hover', 'focus', 'active', 'current', 'disabled'],
  transitions: [
    {from: 'closed', to: 'open', trigger: 'toggle click | Enter/Space | ArrowDown on submenu toggle'}, {from: 'open', to: 'closed', trigger: 'Escape (focus returns to toggle) | outside pointerdown | Tab out | link click'},
    {from: 'closed', to: 'current', trigger: 'in-page link click sets aria-current=page'}, {from: 'closed', to: 'focus', trigger: 'Tab'}, {from: 'closed', to: 'hover', trigger: 'pointer enter'}, {from: 'hover', to: 'active', trigger: 'pointer down'},
  ],
  forbidden: [
    {id: 'NAV_UNDERLINE_SHAPE', when: {appearance: 'underline', shape: ['square', 'pill']}, why: 'underline에는 상자가 없어 모서리 모양이 보이지 않으므로 기본 모양 하나만 둔다'},
    {id: 'NAV_VERTICAL_OVERFLOW', when: {orientation: 'vertical', overflow: ['scroll', 'collapse']}, why: '세로 목록은 줄이 아래로 늘어나므로 가로 스크롤·접기가 풀어 줄 문제가 없다'},
    {id: 'NAV_SCROLL_SUBMENU', when: {overflow: 'scroll', submenu: 'disclosure'}, why: '가로 스크롤 상자가 펼친 하위 메뉴를 잘라 내 항목을 누를 수 없게 된다'},
    {id: 'NAV_OPEN_WITHOUT_COLLAPSE', when: {state: 'open', overflow: ['none', 'scroll']}, why: '열림은 접힌 메뉴(collapse)의 상태다: 접히지 않는 메뉴에는 열 것이 없다'},
    {id: 'NAV_BLOCK_SCROLL', when: {appearance: 'block', overflow: 'scroll'}, why: 'block은 칸 전체를 채우는 채움이라 스크롤 끝에서 잘린 칸이 현재 위치로 읽힌다'},
  ],
  unsupported: ['mega menu panels', 'nested submenus deeper than one level', 'breadcrumb (use component:breadcrumb)'],
  pairs: [
    ['--kit-muted', '--kit-surface', 4.5, 'item'], ['--kit-text', '--kit-card-hover', 7, 'item hover'], ['--kit-link', '--kit-surface', 4.5, 'current (underline)'], ['--kit-link', '--kit-soft', 4.5, 'current (pill)'],
    ['--kit-onAction', '--kit-action', 4.5, 'current (block)'], ['--kit-action', '--kit-surface', 3, 'indicator'], ['--kit-focus', '--kit-surface', 3, 'focus ring'], ['--kit-muted', '--kit-card-hover', 4.5, 'item hover (muted)'],
  ],
});

const checkItems = items => {
  if (!Array.isArray(items) || items.length < 2 || items.length > 8) throw new TypeError('NAV_ITEMS: navigation needs 2–8 items');
  let current = 0;
  for (const it of items) {
    if (!it || !String(it.label ?? '').trim()) throw new TypeError('NAV_ITEMS: every item needs a label');
    if (it.children) for (const c of it.children) { if (!c || !String(c.label ?? '').trim() || typeof c.href !== 'string' || c.children) throw new TypeError('NAV_SUBMENU: submenu items need label and href and cannot nest further'); if (c.current) current++; }
    else if (typeof it.href !== 'string' && !it.disabled) throw new TypeError('NAV_ITEMS: a link item needs href');
    if (it.current && it.disabled) throw new TypeError('NAV_CURRENT_DISABLED: the current page cannot be disabled');
    if (it.current) current++;
  }
  if (current > 1) throw new TypeError('NAV_CURRENT: at most one item is the current page');
};

export function renderNavigation(input) {
  const {id, label, items, force = ''} = input ?? {};
  const p = resolveProps(navigationContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Navigation requires a lowercase kebab-case id');
  if (!String(label ?? '').trim()) throw new TypeError('Navigation requires an accessible label');
  if (force && !['hover', 'focus', 'active'].includes(force)) throw new TypeError('Invalid force preview');
  checkItems(items);
  const hasSub = items.some(it => it.children);
  if (hasSub && p.submenu !== 'disclosure') throw new TypeError('NAV_SUBMENU: items with children need submenu=disclosure');
  if (!hasSub && p.submenu === 'disclosure') throw new TypeError('NAV_SUBMENU: submenu=disclosure needs an item with children');
  const lead = it => (p.icons === 'start' && it.icon ? icon(it.icon) : '');
  if (p.icons === 'start' && items.some(it => !it.icon)) throw new TypeError('NAV_ICONS: icons=start needs an icon on every top-level item');
  // force는 증거 페이지용 미리보기다: 현재 위치도 비활성도 아닌 첫 링크에 hover·focus 모양을 입힌다.
  let forced = force ? false : true;
  const forceAttr = it => (!forced && !it.current && !it.disabled && !it.children ? (forced = true, ` data-force="${force}"`) : '');
  const link = (it, extra = '') => it.disabled ? `<span class="kit-ctl-nav-link" role="link" aria-disabled="true"${extra}>${lead(it)}<span>${e(it.label)}</span></span>`
    : `<a class="kit-ctl-nav-link" href="${e(it.href)}"${it.current ? ' aria-current="page"' : ''}${extra}${forceAttr(it)}>${lead(it)}<span>${e(it.label)}</span></a>`;
  const li = (it, i) => {
    if (!it.children) return `<li class="kit-ctl-nav-item">${link(it)}</li>`;
    const within = it.children.some(c => c.current);
    return `<li class="kit-ctl-nav-item" data-sub${within ? ' data-current-within' : ''}><button type="button" class="kit-ctl-nav-link kit-ctl-nav-sub-toggle" aria-expanded="false" aria-controls="${e(id)}-sub-${i}">${lead(it)}<span>${e(it.label)}</span>${icon('chevron-down')}</button><ul class="kit-ctl-nav-sub" id="${e(id)}-sub-${i}" hidden>${it.children.map(c => `<li>${link(c)}</li>`).join('')}</ul></li>`;
  };
  const collapse = p.overflow === 'collapse';
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  const toggle = collapse ? `<button type="button" class="kit-ctl-nav-toggle" aria-expanded="${p.state === 'open'}" aria-controls="${e(id)}-list">${icon('menu')}<span>메뉴</span></button>` : '';
  return `<nav class="kit-ctl-nav" data-ctl="navigation" id="${e(id)}" aria-label="${e(label)}" ${attrs}>${toggle}<ul class="kit-ctl-nav-list" id="${e(id)}-list">${items.map(li).join('')}</ul></nav>`;
}

/** 브라우저에서 붙는 동작: 접힘 토글(aria-expanded), 하위 메뉴 disclosure, Escape·바깥 클릭·Tab 이탈로 닫고 포커스를 되돌린다, 쪽 안 링크의 aria-current. */
export function attachNavigation(root, {onNavigate} = {}) {
  const doc = root.ownerDocument, toggle = root.querySelector('.kit-ctl-nav-toggle');
  const subs = [...root.querySelectorAll('.kit-ctl-nav-sub-toggle')];
  const setMenu = on => { if (!toggle) return; toggle.setAttribute('aria-expanded', String(on)); root.dataset.state = on ? 'open' : 'closed'; };
  const setSub = (button, on) => { button.setAttribute('aria-expanded', String(on)); button.parentElement.querySelector('.kit-ctl-nav-sub').hidden = !on; };
  const closeSubs = except => subs.forEach(b => { if (b !== except) setSub(b, false); });
  if (toggle) toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  subs.forEach(button => {
    const panel = button.parentElement.querySelector('.kit-ctl-nav-sub'), links = () => [...panel.querySelectorAll('a.kit-ctl-nav-link')];
    button.addEventListener('click', () => { const on = button.getAttribute('aria-expanded') !== 'true'; closeSubs(button); setSub(button, on); });
    button.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); closeSubs(button); setSub(button, true); const first = links()[0]; if (first) first.focus(); } });
    panel.addEventListener('keydown', event => {
      const items = links(), at = items.indexOf(doc.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      else if (event.key === 'Home') { event.preventDefault(); items[0].focus(); } else if (event.key === 'End') { event.preventDefault(); items[items.length - 1].focus(); }
    });
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openSub = subs.find(b => b.getAttribute('aria-expanded') === 'true');
    if (openSub) { event.preventDefault(); setSub(openSub, false); openSub.focus(); }
    else if (toggle && toggle.getAttribute('aria-expanded') === 'true') { event.preventDefault(); setMenu(false); toggle.focus(); }
  });
  root.addEventListener('focusout', event => { if (event.relatedTarget && !root.contains(event.relatedTarget)) { closeSubs(null); setMenu(false); } });
  doc.addEventListener('pointerdown', event => { if (!root.contains(event.target)) { closeSubs(null); setMenu(false); } });
  root.addEventListener('click', event => {
    const link = event.target.closest('a.kit-ctl-nav-link');
    if (!link) return;
    if ((link.getAttribute('href') || '').startsWith('#')) {
      root.querySelectorAll('[aria-current]').forEach(x => x.removeAttribute('aria-current'));
      link.setAttribute('aria-current', 'page');
      root.querySelectorAll('[data-current-within]').forEach(x => x.removeAttribute('data-current-within'));
      const owner = link.closest('li[data-sub]'); if (owner) owner.setAttribute('data-current-within', '');
    }
    closeSubs(null); setMenu(false);
    if (typeof onNavigate === 'function') onNavigate({href: link.getAttribute('href')});
  });
  return {setMenu};
}
export const navigationRuntime = "function attachNavigation(root, {onNavigate} = {}) {\n  const doc = root.ownerDocument, toggle = root.querySelector('.kit-ctl-nav-toggle');\n  const subs = [...root.querySelectorAll('.kit-ctl-nav-sub-toggle')];\n  const setMenu = on => { if (!toggle) return; toggle.setAttribute('aria-expanded', String(on)); root.dataset.state = on ? 'open' : 'closed'; };\n  const setSub = (button, on) => { button.setAttribute('aria-expanded', String(on)); button.parentElement.querySelector('.kit-ctl-nav-sub').hidden = !on; };\n  const closeSubs = except => subs.forEach(b => { if (b !== except) setSub(b, false); });\n  if (toggle) toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));\n  subs.forEach(button => {\n    const panel = button.parentElement.querySelector('.kit-ctl-nav-sub'), links = () => [...panel.querySelectorAll('a.kit-ctl-nav-link')];\n    button.addEventListener('click', () => { const on = button.getAttribute('aria-expanded') !== 'true'; closeSubs(button); setSub(button, on); });\n    button.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); closeSubs(button); setSub(button, true); const first = links()[0]; if (first) first.focus(); } });\n    panel.addEventListener('keydown', event => {\n      const items = links(), at = items.indexOf(doc.activeElement);\n      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }\n      else if (event.key === 'Home') { event.preventDefault(); items[0].focus(); } else if (event.key === 'End') { event.preventDefault(); items[items.length - 1].focus(); }\n    });\n  });\n  root.addEventListener('keydown', event => {\n    if (event.key !== 'Escape') return;\n    const openSub = subs.find(b => b.getAttribute('aria-expanded') === 'true');\n    if (openSub) { event.preventDefault(); setSub(openSub, false); openSub.focus(); }\n    else if (toggle && toggle.getAttribute('aria-expanded') === 'true') { event.preventDefault(); setMenu(false); toggle.focus(); }\n  });\n  root.addEventListener('focusout', event => { if (event.relatedTarget && !root.contains(event.relatedTarget)) { closeSubs(null); setMenu(false); } });\n  doc.addEventListener('pointerdown', event => { if (!root.contains(event.target)) { closeSubs(null); setMenu(false); } });\n  root.addEventListener('click', event => {\n    const link = event.target.closest('a.kit-ctl-nav-link');\n    if (!link) return;\n    if ((link.getAttribute('href') || '').startsWith('#')) {\n      root.querySelectorAll('[aria-current]').forEach(x => x.removeAttribute('aria-current'));\n      link.setAttribute('aria-current', 'page');\n      root.querySelectorAll('[data-current-within]').forEach(x => x.removeAttribute('data-current-within'));\n      const owner = link.closest('li[data-sub]'); if (owner) owner.setAttribute('data-current-within', '');\n    }\n    closeSubs(null); setMenu(false);\n    if (typeof onNavigate === 'function') onNavigate({href: link.getAttribute('href')});\n  });\n  return {setMenu};\n}";

export const navigationStyles = `${baseStyles}${sizeCSS('.kit-ctl-nav')}
.kit-ctl-nav{position:relative;min-width:0;color:var(--kit-muted);font-size:var(--ctl-font)}
.kit-ctl-nav-list,.kit-ctl-nav-sub{display:flex;gap:var(--kit-sp-tight);margin:0;padding:0;list-style:none}
.kit-ctl-nav[data-orientation=vertical] .kit-ctl-nav-list{flex-direction:column}
.kit-ctl-nav[data-orientation=horizontal][data-overflow=none] .kit-ctl-nav-list{flex-wrap:wrap}
.kit-ctl-nav[data-overflow=scroll] .kit-ctl-nav-list{overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin;flex-wrap:nowrap}
.kit-ctl-nav-item{position:relative;flex:none}
.kit-ctl-nav-link{display:flex;align-items:center;gap:var(--ctl-gap);box-sizing:border-box;min-height:var(--ctl-h);padding-inline:var(--ctl-px);border:0 solid transparent;border-radius:var(--kit-radius);background:transparent;color:inherit;font:inherit;font-size:var(--ctl-font);font-weight:var(--kit-bw,600);text-decoration:none;white-space:nowrap;word-break:keep-all;cursor:pointer;width:100%}
.kit-ctl-nav[data-shape=square] .kit-ctl-nav-link{border-radius:0}.kit-ctl-nav[data-shape=pill] .kit-ctl-nav-link{border-radius:999px}
.kit-ctl-nav .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon);flex:none}
.kit-ctl-nav-sub-toggle .kit-icon:last-child{margin-inline-start:auto;transition:transform var(--kit-dur,150ms)}.kit-ctl-nav-sub-toggle[aria-expanded=true] .kit-icon:last-child{transform:rotate(180deg)}
.kit-ctl-nav[data-appearance=underline] .kit-ctl-nav-link{border-bottom-width:2px;border-radius:0}
.kit-ctl-nav[data-appearance=underline][data-orientation=vertical] .kit-ctl-nav-link{border-bottom-width:0;border-inline-start-width:3px}
.kit-ctl-nav-link:is([aria-current=page]):not(.kit-ctl-nav-sub-toggle),.kit-ctl-nav-item[data-current-within]>.kit-ctl-nav-link{color:var(--kit-link)}
.kit-ctl-nav[data-appearance=underline] .kit-ctl-nav-link:is([aria-current=page],.kit-ctl-nav-item[data-current-within]>*){border-color:var(--kit-action);font-weight:700}
.kit-ctl-nav[data-appearance=pill] .kit-ctl-nav-link:is([aria-current=page],.kit-ctl-nav-item[data-current-within]>*){background:var(--kit-soft);box-shadow:inset 0 0 0 1px currentColor}
.kit-ctl-nav[data-appearance=block] .kit-ctl-nav-link:is([aria-current=page],.kit-ctl-nav-item[data-current-within]>*){background:var(--kit-action);color:var(--kit-onAction);box-shadow:inset 0 0 0 2px var(--kit-surface)}
.kit-ctl-nav-link:not([aria-disabled=true])${hover}{color:var(--kit-text);background:var(--kit-card-hover);transform:translateY(var(--kit-lift,0px))}
.kit-ctl-nav[data-appearance=underline] .kit-ctl-nav-link:not([aria-disabled=true])${hover}{border-color:var(--kit-control-border)}
.kit-ctl-nav[data-appearance=underline] .kit-ctl-nav-link[aria-current=page]${hover}{border-color:var(--kit-action)}
.kit-ctl-nav[data-appearance=block] .kit-ctl-nav-link[aria-current=page]${hover}{background:var(--kit-action-hover);color:var(--kit-onActionHover)}
.kit-ctl-nav-link:not([aria-disabled=true])${active}{background:var(--kit-card-active);transform:translateY(1px)}
.kit-ctl-nav[data-appearance=block] .kit-ctl-nav-link[aria-current=page]${active}{background:var(--kit-action-active)}
${focusRing('.kit-ctl-nav-link', '-3px')}${focusRing('.kit-ctl-nav-toggle', '2px')}
.kit-ctl-nav-link[aria-disabled=true]{color:var(--kit-control-disabled-fg);cursor:not-allowed}
.kit-ctl-nav-sub{position:absolute;z-index:10;inset:100% auto auto 0;flex-direction:column;min-width:100%;margin-top:var(--kit-sp-tight);padding:var(--kit-sp-tight);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);box-shadow:var(--kit-shadow-hover)}
.kit-ctl-nav-sub[hidden]{display:none}.kit-ctl-nav[data-orientation=vertical] .kit-ctl-nav-sub{position:static;margin:var(--kit-sp-tight) 0 0 var(--ctl-px);padding:0;border:0;box-shadow:none;background:transparent}
.kit-ctl-nav-toggle{display:none;align-items:center;gap:var(--ctl-gap);min-height:var(--ctl-h);padding-inline:var(--ctl-px);border:1px solid var(--kit-control-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font:inherit;font-size:var(--ctl-font);font-weight:var(--kit-bw,600);cursor:pointer}
.kit-ctl-nav[data-shape=pill] .kit-ctl-nav-toggle{border-radius:999px}.kit-ctl-nav[data-shape=square] .kit-ctl-nav-toggle{border-radius:0}
@media(max-width:640px){.kit-ctl-nav[data-overflow=collapse] .kit-ctl-nav-toggle{display:inline-flex}.kit-ctl-nav[data-overflow=collapse][data-state=closed] .kit-ctl-nav-list{display:none}.kit-ctl-nav[data-overflow=collapse] .kit-ctl-nav-list{flex-direction:column;margin-top:var(--kit-sp-near)}.kit-ctl-nav[data-overflow=collapse] .kit-ctl-nav-sub{position:static;margin:var(--kit-sp-tight) 0 0 var(--ctl-px);padding:0;border:0;box-shadow:none;background:transparent}}`.replace(/\n/g, '');

export const navigationExamples = Object.freeze([
  {id: 'ex-nav-top', label: '주요 메뉴', items: [{label: '개요', href: '#overview', current: true}, {label: '문서', href: '#docs'}, {label: '가격', href: '#pricing'}, {label: '지원 종료', disabled: true}]},
  {id: 'ex-nav-pill', label: '설정 메뉴', appearance: 'pill', icons: 'start', items: [{label: '계정', href: '#account', icon: 'user', current: true}, {label: '알림', href: '#alerts', icon: 'bell'}, {label: '보안', href: '#security', icon: 'shield'}]},
  {id: 'ex-nav-side', label: '사이드 메뉴', appearance: 'block', orientation: 'vertical', submenu: 'disclosure', items: [{label: '홈', href: '#home', current: true}, {label: '리포트', children: [{label: '월간', href: '#monthly'}, {label: '분기', href: '#quarterly'}]}, {label: '설정', href: '#prefs'}]},
  {id: 'ex-nav-fold', label: '접히는 메뉴', overflow: 'collapse', items: [{label: '개요', href: '#f-overview', current: true}, {label: '기능', href: '#f-features'}, {label: '후기', href: '#f-reviews'}, {label: '문의', href: '#f-contact'}]},
]);

export const navigationMaterial = componentMaterial(navigationContract, {
  category: 'layout-navigation', module: 'src/materials/navigation.mjs', renderExport: 'renderNavigation', key: 'navigation-menu', styles: navigationStyles, examples: navigationExamples.map(x => structuredClone(x)),
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: 'overflow=collapse는 640px 이하에서 토글 버튼 뒤로 접히고, scroll은 가로 스크롤 상자 안에서 항목 폭을 유지한다.'},
  a11y: {rules: ['R05', 'R12', 'R14'], role: 'navigation > list of links; disclosure buttons use aria-expanded/aria-controls', keyboard: 'Tab through links; Enter/Space on toggles; ArrowDown/Up/Home/End inside a submenu; Escape closes and returns focus to its toggle'},
  validation: {rules: ['R12', 'R14'], codes: ['NAV_ITEMS', 'NAV_SUBMENU', 'NAV_ICONS', 'NAV_CURRENT', 'NAV_CURRENT_DISABLED', ...navigationContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:26'], ext: {group: 'nav', required: ['id', 'label', 'items']},
});
