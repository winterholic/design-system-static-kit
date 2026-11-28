/**
 * §6.2 A(버튼·액션) 계열이 함께 쓰는 마크업 조각, 런타임, CSS.
 *
 * 버튼 한 개의 외형·상태·접근성은 기반 컴포넌트 button-control이 소유한다. 이 파일은 버튼만으로는 표현되지 않는 구조
 * (메뉴 패널, 복사 피드백, 닫기 대상, 단일 선택 묶음)만 가진다. 목적 패밀리(button.mjs)와 독립 시연(contracts.mjs)이 같은 조각을 쓴다.
 *
 * 런타임은 문서 단위 위임 핸들러 한 벌이다. 쓴 출력에만 붙고(actionRuntimeFor), 쓰지 않은 출력의 바이트는 바뀌지 않는다.
 */
import {escapeHTML} from '../../escape-html.mjs';
import {INFO_MEDIA_RUNTIME_IDS, INFO_MEDIA_RUNTIME} from './info-media.mjs';

const e = escapeHTML;

/** 첫 번째 `<button `에 속성을 더한다. 기반 버튼 마크업은 항상 이 모양으로 시작한다. */
export function withButtonAttrs(html, attrs) {
  if (!html.includes('<button ')) throw new TypeError('button markup expected');
  // 함수형 치환: attrs에 사용자 값의 `$$`·`$&`가 있어도 치환 패턴으로 해석되지 않는다.
  return html.replace('<button ', () => `<button ${attrs} `);
}

/** 메뉴 트리거에 붙는 속성. 패널 id는 같은 메뉴의 renderMenuPanel과 같아야 한다. */
export const menuTriggerAttrs = panelId => `aria-haspopup="menu" aria-expanded="false" aria-controls="${e(panelId)}" data-action-menu-trigger`;

/** 메뉴 패널. 처음에는 hidden이고 런타임이 연다. 항목은 roving focus라 tabindex=-1이다. */
export function renderMenuPanel({id, label, items}) {
  if (!Array.isArray(items) || items.length < 2 || items.length > 8 || items.some(x => typeof x?.label !== 'string' || !x.label.trim())) throw new TypeError('메뉴 항목은 label이 있는 2~8개입니다');
  return `<div class="pf-menu-panel" role="menu" id="${e(id)}" aria-label="${e(label)}" hidden>${items.map(x => `<button type="button" class="pf-menu-item" role="menuitem" tabindex="-1"${x.value === undefined ? '' : ` data-value="${e(x.value)}"`}>${e(x.label)}</button>`).join('')}</div>`;
}

export const ACTION_RUNTIME = `(function(){
if(window.__kitAction)return;window.__kitAction=true;
var q=function(r,s){return Array.prototype.slice.call(r.querySelectorAll(s))};
var blocked=function(b){return b.disabled||b.getAttribute('aria-disabled')==='true'};
var say=function(b,t){var h=b.closest('[data-ctl=button]'),s=h&&h.querySelector('[role=status]');if(s)s.textContent=t};
var setMenu=function(tr,open,focus){var h=tr.closest('[data-action-menu]'),p=(h&&h.querySelector('[role=menu]'))||document.getElementById(tr.getAttribute('aria-controls'));if(!p)return;tr.setAttribute('aria-expanded',String(open));p.hidden=!open;if(open&&focus){var i=p.querySelector('[role=menuitem]');if(i)i.focus()}};
var closeAll=function(except){q(document,'[data-action-menu-trigger][aria-expanded=true]').forEach(function(t){if(t!==except)setMenu(t,false)})};
document.addEventListener('click',function(ev){
var t=ev.target,tr=t.closest('[data-action-menu-trigger]');
if(tr){if(blocked(tr))return;var open=tr.getAttribute('aria-expanded')!=='true';closeAll(tr);setMenu(tr,open,open);return}
var item=t.closest('[role=menuitem]');
if(item){var host=item.closest('[data-action-menu]'),own=host&&host.querySelector('[data-action-menu-trigger]');if(own){setMenu(own,false);own.focus();own.dispatchEvent(new CustomEvent('kit-menu-select',{bubbles:true,detail:{label:item.textContent,value:item.getAttribute('data-value')}}))}return}
if(t.closest('[role=menu]'))return;
closeAll();
var cp=t.closest('[data-copy-text]');
if(cp&&!blocked(cp)){var ok=cp.getAttribute('data-copied-label')||'복사했습니다.',no='복사하지 못했습니다.';if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(cp.getAttribute('data-copy-text')).then(function(){say(cp,ok)},function(){say(cp,no)});else say(cp,no);return}
var dm=t.closest('[data-action-dismiss]');
if(dm&&!blocked(dm)){var box=dm.closest('[data-dismissible]');if(box)box.hidden=true;dm.dispatchEvent(new CustomEvent('kit-dismiss',{bubbles:true}));return}
var sg=t.closest('[data-action-segmented] button[aria-pressed]');
if(sg&&!blocked(sg)){q(sg.closest('[data-action-segmented]'),'button[aria-pressed]').forEach(function(b){var on=b===sg,h=b.closest('[data-ctl=button]');b.setAttribute('aria-pressed',String(on));b.dataset.state=on?'pressed':'default';if(h)h.dataset.state=b.dataset.state})}
});
document.addEventListener('keydown',function(ev){
var tr=ev.target.closest&&ev.target.closest('[data-action-menu-trigger]');
if(tr&&(ev.key==='ArrowDown'||ev.key==='ArrowUp')&&!blocked(tr)){ev.preventDefault();closeAll(tr);setMenu(tr,true,true);return}
var p=ev.target.closest&&ev.target.closest('[role=menu]');if(!p)return;
var items=q(p,'[role=menuitem]'),i=items.indexOf(document.activeElement),host=p.closest('[data-action-menu]'),own=host&&host.querySelector('[data-action-menu-trigger]');
if(!own||!items.length)return;
var go=function(n){ev.preventDefault();items[n].focus()};
if(ev.key==='Escape'){ev.preventDefault();setMenu(own,false);own.focus()}
else if(ev.key==='ArrowDown')go((i+1)%items.length);
else if(ev.key==='ArrowUp')go((i-1+items.length)%items.length);
else if(ev.key==='Home')go(0);
else if(ev.key==='End')go(items.length-1);
else if(ev.key==='Tab')setMenu(own,false)
});
})();`;

export const ACTION_CSS = `.pf-menu{position:relative;display:inline-block}.pf-menu-panel{position:absolute;inset-block-start:calc(100% + 4px);inset-inline-start:0;z-index:20;display:grid;min-inline-size:12em;max-inline-size:min(20em,90vw);padding:var(--kit-sp-near);background:var(--kit-surface);color:var(--kit-text);border:1px solid var(--kit-border);border-radius:var(--kit-radius);box-shadow:0 6px 18px color-mix(in srgb,var(--kit-text) 18%,transparent)}.pf-menu-panel[hidden]{display:none}.pf-menu-item{display:block;inline-size:100%;min-block-size:44px;padding:0 var(--kit-sp-item);background:transparent;color:inherit;border:0;border-radius:var(--kit-radius);font:inherit;text-align:start;cursor:pointer}.pf-menu-item:hover,.pf-menu-item:focus-visible{background:var(--kit-card-hover)}.pf-menu-item:focus-visible{outline:2px solid var(--kit-focus);outline-offset:-2px}.pf-split{display:inline-flex;align-items:stretch}.pf-split>.kit-ctl-button-host+.kit-ctl-button-host .kit-ctl-button{margin-inline-start:-1px;border-start-start-radius:0;border-end-start-radius:0}.pf-split>.kit-ctl-button-host:first-child .kit-ctl-button{border-start-end-radius:0;border-end-end-radius:0}.pf-fab .kit-ctl-button{border-radius:999px;min-inline-size:56px;min-block-size:56px;box-shadow:0 4px 12px color-mix(in srgb,var(--kit-text) 28%,transparent)}.pf-fab[data-extended=true] .kit-ctl-button{padding-inline:var(--kit-sp-item)}.pf-dismissible{display:flex;align-items:center;justify-content:space-between;gap:var(--kit-sp-item);padding:var(--kit-sp-near) var(--kit-sp-item);background:var(--kit-soft);color:var(--kit-text);border:1px solid var(--kit-border);border-radius:var(--kit-radius)}.pf-dismissible[hidden]{display:none}.pf-dismissible p{margin:0}@media(max-width:640px){.pf-menu-panel{inline-size:max-content}}.pf-split .kit-ctl-button,.pf-menu>.kit-ctl-button-host .kit-ctl-button,.pf-actions .kit-ctl-button[data-copy-text],.pf-actions .kit-ctl-button[data-action-dismiss],.pf-dismissible .kit-ctl-button{min-block-size:44px;min-inline-size:44px}`;

/** 런타임이 필요한 목적 패밀리 id. 목적 패밀리 record는 필드가 닫혀 있어 런타임은 레코드 밖에서 관리한다. */
export const EHI_RUNTIME_IDS = Object.freeze([
  'purpose:navigation.collapsible-sidebar', 'purpose:navigation.drawer', 'purpose:navigation.command-menu', 'purpose:navigation.context-menu',
  'purpose:overlay.drawer', 'purpose:overlay.popover', 'purpose:overlay.dropdown-menu', 'purpose:overlay.contextual-help',
]);
export const PURPOSE_RUNTIME_IDS = Object.freeze(['purpose:button.split', 'purpose:button.menu', 'purpose:button.copy', 'purpose:button.close', ...INFO_MEDIA_RUNTIME_IDS, ...EHI_RUNTIME_IDS]);

/**
 * E/H/I purpose markup runtime. 한 문서에 한 벌이며 위임 핸들러만 쓴다.
 * 모달(data-focus-trap): 포커스 진입·가둠·복귀, 배경 스크롤 잠금, Escape·배경 클릭·닫기 단추, 링크를 고르면 닫힘.
 * 비모달(팝오버·메뉴): 바깥 클릭은 닫되 포커스는 누른 곳에 둔다. 메뉴는 방향키·Home·End, Tab은 닫고 다음으로 넘긴다.
 * 도움말(tooltip): 포커스·hover로 보이고 Escape로 포커스 이동 없이 닫히며 포인터가 설명 위로 옮겨도 유지된다.
 * 떠 있는 패널(.ehi-float)은 열릴 때 화면 안으로 밀거나 위로 뒤집는다.
 */
export const EHI_RUNTIME = `(function(){
if(window.__kitEhi)return;window.__kitEhi=true;
var d=document,html=d.documentElement,locks=0,saved='',timer=0;
var all=function(r,s){return Array.prototype.slice.call(r.querySelectorAll(s))};
var FOCUSABLE='button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';
var rootOf=function(n){return n&&n.closest?n.closest('[data-ehi-root]'):null};
var triggerOf=function(r){return r.querySelector('[data-ehi-trigger]')};
var tipOf=function(r){return r.querySelector('[data-ehi-tooltip]')};
var panelOf=function(r){var t=triggerOf(r),id=t&&t.getAttribute('aria-controls');return (id&&d.getElementById(id))||tipOf(r)};
var isOpen=function(r){var p=panelOf(r);return !!p&&!p.hidden};
var isModal=function(r){return r.hasAttribute('data-focus-trap')};
var items=function(r){var p=panelOf(r);return p?all(p,'[data-ehi-item]:not([disabled]):not([hidden])'):[]};
var lock=function(){if(!locks++){saved=html.style.overflow;html.style.overflow='hidden'}};
var unlock=function(){if(locks>0&&!--locks){html.style.overflow=saved;saved=''}};
var place=function(p,r){if(!p.classList.contains('ehi-float'))return;p.style.transform='';p.removeAttribute('data-flip');var a=r.getBoundingClientRect(),b=p.getBoundingClientRect(),vw=html.clientWidth,vh=html.clientHeight,dx=0;if(b.bottom>vh-8&&a.top-b.height-4>=8)p.setAttribute('data-flip','up');b=p.getBoundingClientRect();if(b.right>vw-8)dx=vw-8-b.right;if(b.left+dx<8)dx=8-b.left;if(dx)p.style.transform='translateX('+Math.round(dx)+'px)'};
var close=function(r,restore){var p=panelOf(r),t=triggerOf(r);if(!p||p.hidden)return;p.hidden=true;p.style.transform='';if(!tipOf(r)&&t)t.setAttribute('aria-expanded','false');if(isModal(r))unlock();if(restore&&t)t.focus()};
var closeOthers=function(r){all(d,'[data-ehi-root]').forEach(function(o){if(o!==r&&!o.contains(r)&&!r.contains(o)&&!o.hasAttribute('data-ehi-persist')&&!tipOf(o)&&isOpen(o))close(o,false)})};
var open=function(r,last){var t=triggerOf(r),p=panelOf(r);if(!t||!p||!p.hidden)return;closeOthers(r);p.hidden=false;t.setAttribute('aria-expanded','true');if(isModal(r))lock();place(p,r);if(r.hasAttribute('data-ehi-persist'))return;var box=p.matches('[role=dialog]')?p:p.querySelector('[role=dialog]'),first;if(box&&isModal(r))first=box.querySelector(FOCUSABLE)||box;else if(p.querySelector('[data-ehi-filter]')&&!last)first=p.querySelector('[data-ehi-filter]');else if(items(r).length)first=last?items(r).pop():items(r)[0];else if(box)first=box.querySelector(FOCUSABLE)||box;if(first)first.focus()};
var showTip=function(r){clearTimeout(timer);var p=tipOf(r);if(p&&p.hidden){p.hidden=false;place(p,r)}};
var hideTip=function(r){var p=tipOf(r);if(p){p.hidden=true;p.style.transform=''}};
var tipRoot=function(n){var r=rootOf(n);return r&&tipOf(r)?r:null};
d.addEventListener('click',function(ev){var t=ev.target;if(!t.closest)return;var trig=t.closest('[data-ehi-trigger]');if(trig){var r=rootOf(trig);if(trig.disabled||!r)return;if(tipOf(r)){showTip(r);return}if(isOpen(r))close(r,true);else open(r);return}
var x=t.closest('[data-ehi-close]');if(x){var xr=rootOf(x);if(xr)close(xr,true);return}
var back=t.closest('[data-ehi-backdrop]');if(back&&t===back){var br=rootOf(back);if(br)close(br,true);return}
var item=t.closest('[data-ehi-item]');if(item&&!item.disabled){var ir=rootOf(item);if(ir){ir.dispatchEvent(new CustomEvent('ehi:select',{bubbles:true,detail:{label:item.textContent}}));close(ir,true)}return}
var link=t.closest('a[href]'),lr=link&&rootOf(link);if(lr&&isModal(lr)&&isOpen(lr)){close(lr,true);return}
all(d,'[data-ehi-root]').forEach(function(o){if(!o.contains(t)&&!isModal(o)&&!o.hasAttribute('data-ehi-persist')&&!tipOf(o)&&isOpen(o))close(o,false)})});
d.addEventListener('keydown',function(ev){var k=ev.key,t=ev.target,r=rootOf(t);
if(k==='Escape'){var opened=all(d,'[data-ehi-root]').filter(isOpen),pick=(r&&isOpen(r)&&r)||opened.filter(function(o){return !o.hasAttribute('data-ehi-persist')}).pop()||opened.pop();if(pick){ev.preventDefault();close(pick,!tipOf(pick))}return}
var modal=all(d,'[data-focus-trap]').filter(isOpen).pop();
if(k==='Tab'&&modal){var box=modal.querySelector('[role=dialog]'),fs=all(box,FOCUSABLE),a=d.activeElement;if(!fs.length){ev.preventDefault();box.focus();return}var first=fs[0],last=fs[fs.length-1];if(ev.shiftKey&&(a===first||a===box||!box.contains(a))){ev.preventDefault();last.focus()}else if(!ev.shiftKey&&(a===last||!box.contains(a))){ev.preventDefault();first.focus()}return}
if(!r)return;
if(t===triggerOf(r)&&r.hasAttribute('data-ehi-menu-root')&&!isOpen(r)){if(k==='ArrowDown'||k==='ArrowUp'||(r.querySelector('[data-ehi-context-trigger]')&&(k==='ContextMenu'||(k==='F10'&&ev.shiftKey)))){ev.preventDefault();open(r,k==='ArrowUp')}return}
var menu=t.closest('[role=menu],[data-ehi-filter]')&&isOpen(r);if(!menu)return;
var list=items(r),i=list.indexOf(d.activeElement),f=r.querySelector('[data-ehi-filter]'),n;
if(k==='Tab'){close(r,true);return}
if(k==='ArrowDown')n=i<0?0:(i+1)%list.length;else if(k==='ArrowUp'){if(f&&i===0){ev.preventDefault();f.focus();return}n=i<0?list.length-1:(i-1+list.length)%list.length}else if(t!==f&&k==='Home')n=0;else if(t!==f&&k==='End')n=list.length-1;
if(n!==undefined&&list.length){ev.preventDefault();list[n].focus()}});
d.addEventListener('input',function(ev){var f=ev.target.closest&&ev.target.closest('[data-ehi-filter]');if(!f)return;var r=rootOf(f),p=panelOf(r),term=f.value.trim().toLocaleLowerCase(),shown=0;all(p,'[data-ehi-item]').forEach(function(x){var m=!term||x.textContent.toLocaleLowerCase().indexOf(term)>=0;x.hidden=!m;if(m)shown++});var empty=p.querySelector('[data-ehi-empty]');if(empty)empty.textContent=shown?'':empty.getAttribute('data-ehi-empty')});
d.addEventListener('contextmenu',function(ev){var tr=ev.target.closest&&ev.target.closest('[data-ehi-context-trigger]');if(tr){ev.preventDefault();var r=rootOf(tr);if(r&&!isOpen(r))open(r)}});
d.addEventListener('focusin',function(ev){var tr=ev.target.closest&&ev.target.closest('[data-ehi-tooltip-trigger]');if(tr)showTip(rootOf(tr));var modal=all(d,'[data-focus-trap]').filter(isOpen).pop();if(modal){var box=modal.querySelector('[role=dialog]');if(box&&!box.contains(ev.target)){var fs=all(box,FOCUSABLE);(fs[0]||box).focus()}}});
d.addEventListener('focusout',function(ev){var tr=ev.target.closest&&ev.target.closest('[data-ehi-tooltip-trigger]');if(tr)hideTip(rootOf(tr))});
d.addEventListener('mouseover',function(ev){var r=tipRoot(ev.target);if(r)showTip(r)});
d.addEventListener('mouseout',function(ev){var r=tipRoot(ev.target);if(!r||(ev.relatedTarget&&r.contains(ev.relatedTarget)))return;clearTimeout(timer);timer=setTimeout(function(){if(!r.contains(d.activeElement))hideTip(r)},150)});
})();`;

/** 출력에 쓰인 목적 패밀리가 요구하는 런타임. 쓰인 것이 없으면 빈 문자열이라 기존 출력은 그대로다. */
export const actionRuntimeFor = ids => {
  const used = [...ids];
  const parts = [];
  if (used.some(id => ['purpose:button.split', 'purpose:button.menu', 'purpose:button.copy', 'purpose:button.close'].includes(id))) {
    parts.push(ACTION_RUNTIME);
  }
  if (used.some(id => INFO_MEDIA_RUNTIME_IDS.includes(id))) {
    parts.push(INFO_MEDIA_RUNTIME);
  }
  if (used.some(id => EHI_RUNTIME_IDS.includes(id))) {
    parts.push(EHI_RUNTIME);
  }
  return parts.join('\n');
};
