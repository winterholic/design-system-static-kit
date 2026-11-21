import {makeRenderer} from './nodes.mjs';
import {renderShell} from './shell.mjs';
import {selectRuntime} from '../materials/select.mjs';
import {tableRuntime} from '../materials/table.mjs';
import {buttonRuntime} from '../materials/button.mjs';
import {inputRuntime} from '../materials/input.mjs';
import {cardRuntime} from '../materials/card.mjs';
import {navigationRuntime} from '../materials/navigation.mjs';
import {modalRuntime} from '../materials/modal.mjs';
import {tabsRuntime} from '../materials/tabs.mjs';
import {tooltipRuntime} from '../materials/tooltip.mjs';
import {feedbackRuntime} from '../materials/feedback.mjs';
import {atLeast} from '../catalog/expression.mjs';
export {escapeHTML} from './util.mjs';

/** `report` (optional) receives the pictures placed on the page: [{place, kind, motif, key}] for the page rule P01. */
export function renderTree(b, design = null, report = null) {
  const {render, ctx} = makeRenderer(b, design);
  const html = renderShell(b, render(b.tree), design?.chrome);
  if (report) report.arts = ctx.arts;
  return html;
}

/** The only script a generated page runs. Fixed text, no user input, no network: demo form checks, ARIA tabs, filter chips. */
export const formRuntime = [
  "document.querySelectorAll('.kit-form').forEach(function(form){form.addEventListener('submit',function(event){event.preventDefault();var s=form.querySelector('[role=status]');if(form.reportValidity()){s.textContent='입력 형식을 확인했습니다. 데모이므로 저장하지 않았습니다.';}else{s.textContent='';}});});",
  "document.querySelectorAll('[data-tabs]').forEach(function(root){var tabs=[].slice.call(root.querySelectorAll('[role=tab]')),panels=[].slice.call(root.querySelectorAll('[role=tabpanel]'));function pick(i,focus){tabs.forEach(function(t,j){var on=i===j;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;panels[j].hidden=!on;});if(focus)tabs[i].focus();}tabs.forEach(function(t,i){t.addEventListener('click',function(){pick(i,false);});t.addEventListener('keydown',function(e){var n=tabs.length,k=e.key;if(k==='ArrowRight')pick((i+1)%n,true);else if(k==='ArrowLeft')pick((i+n-1)%n,true);else if(k==='Home')pick(0,true);else if(k==='End')pick(n-1,true);else return;e.preventDefault();});});});",
  "document.querySelectorAll('.kit-chips').forEach(function(g){var bs=[].slice.call(g.querySelectorAll('button'));bs.forEach(function(b){b.addEventListener('click',function(){bs.forEach(function(o){o.setAttribute('aria-pressed',o===b?'true':'false');});});});});",
  "document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var box=b.closest('.kit-code'),pre=box.querySelector('pre'),text=pre.innerText,st=box.querySelector('[data-copy-status]');function done(){b.setAttribute('data-done','true');if(st)st.textContent='코드를 복사했습니다.';setTimeout(function(){b.removeAttribute('data-done');if(st)st.textContent='';},1800);}function fallback(){var r=document.createRange();r.selectNodeContents(pre);var s=window.getSelection();s.removeAllRanges();s.addRange(r);try{if(document.execCommand('copy'))done();}catch(e){}s.removeAllRanges();}if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done,fallback);}else{fallback();}});});",
  "var megas=[].slice.call(document.querySelectorAll('.kit-mega'));megas.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)megas.forEach(function(o){if(o!==d)o.open=false;});});d.addEventListener('keydown',function(e){if(e.key==='Escape'){d.open=false;d.querySelector('summary').focus();}});});document.addEventListener('click',function(e){megas.forEach(function(d){if(d.open&&!d.contains(e.target))d.open=false;});});",
].join('');

/**
 * 카탈로그 2.6.0 컨트롤 재료의 고정 런타임(재료의 attachSelect·attachTable 소스 그대로). 쓴 노드가 있을 때만 formRuntime 뒤에 붙고,
 * provider는 주입하지 않으므로 네트워크를 쓰지 않는다. 2.5.0 이하와 컨트롤이 없는 문서는 빈 문자열이라 출력이 같다.
 */
export function controlRuntime(b) {
  if (!atLeast(b?.catalogVersion, '2.6.0')) return '';
  const used = new Set();
  const walk = n => { used.add(n.type); n.children?.forEach(walk); };
  walk(b.tree);
  const components = {
    'button-control': [buttonRuntime, 'button'], 'input-control': [inputRuntime, 'input'], 'card-surface': [cardRuntime, 'card'],
    'navigation-menu': [navigationRuntime, 'navigation'], 'modal-dialog': [modalRuntime, 'modal'], 'tabs-control': [tabsRuntime, 'tabs'],
    tooltip: [tooltipRuntime, 'tooltip'], 'feedback-message': [feedbackRuntime, 'feedback'],
  };
  const componentCode = [...used].filter(type => components[type]).map(type => {
    const [runtime, name] = components[type];
    return `;${runtime};document.querySelectorAll('[data-ctl=${name}]').forEach(function(r){attach${name[0].toUpperCase()}${name.slice(1)}(r);});`;
  }).join('');
  return (used.has('select-control') ? `;${selectRuntime};document.querySelectorAll('.kit-select').forEach(function(r){attachSelect(r);});` : '')
    + (used.has('data-table') ? `;${tableRuntime};document.querySelectorAll('.kit-data-table').forEach(function(r){attachTable(r);});` : '')
    + componentCode;
}
