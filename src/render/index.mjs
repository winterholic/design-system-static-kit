import {makeRenderer} from './nodes.mjs';
import {renderShell} from './shell.mjs';
export {escapeHTML} from './util.mjs';

export function renderTree(b) {
  const {render} = makeRenderer(b);
  return renderShell(b, render(b.tree));
}

/** The only script a generated page runs. Fixed text, no user input, no network: demo form checks, ARIA tabs, filter chips. */
export const formRuntime = [
  "document.querySelectorAll('.kit-form').forEach(function(form){form.addEventListener('submit',function(event){event.preventDefault();var s=form.querySelector('[role=status]');if(form.reportValidity()){s.textContent='입력 형식을 확인했습니다. 데모이므로 저장하지 않았습니다.';}else{s.textContent='';}});});",
  "document.querySelectorAll('[data-tabs]').forEach(function(root){var tabs=[].slice.call(root.querySelectorAll('[role=tab]')),panels=[].slice.call(root.querySelectorAll('[role=tabpanel]'));function pick(i,focus){tabs.forEach(function(t,j){var on=i===j;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;panels[j].hidden=!on;});if(focus)tabs[i].focus();}tabs.forEach(function(t,i){t.addEventListener('click',function(){pick(i,false);});t.addEventListener('keydown',function(e){var n=tabs.length,k=e.key;if(k==='ArrowRight')pick((i+1)%n,true);else if(k==='ArrowLeft')pick((i+n-1)%n,true);else if(k==='Home')pick(0,true);else if(k==='End')pick(n-1,true);else return;e.preventDefault();});});});",
  "document.querySelectorAll('.kit-chips').forEach(function(g){var bs=[].slice.call(g.querySelectorAll('button'));bs.forEach(function(b){b.addEventListener('click',function(){bs.forEach(function(o){o.setAttribute('aria-pressed',o===b?'true':'false');});});});});",
].join('');
