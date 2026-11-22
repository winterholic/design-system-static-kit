import {defineContract, resolveProps, sizeCSS, baseStyles, focusRing, hover, active, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {icon} from '../render/icon.mjs';

/** Tabs: 외형(선택 표시 방식)·모양·크기·기능(방향·활성화 방식·넘침·아이콘)·상태(패널 로딩)를 따로 둔다. 키보드 규칙은 WAI-ARIA tabs 패턴을 따른다. */
export const tabsContract = defineContract({
  id: 'component:tabs-control', label: 'Tabs',
  inputFields: ['id', 'label', 'tabs', 'selected', 'force'],
  axes: {
    appearance: ['underline', 'pill', 'segmented'], shape: SHAPES, size: SIZES,
    orientation: ['horizontal', 'vertical'], activation: ['automatic', 'manual'], overflow: ['none', 'scroll'], icons: ['none', 'start'],
    state: ['ready', 'loading'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['orientation', 'activation', 'overflow', 'icons'], state: ['state']},
  defaults: {appearance: 'underline', shape: 'soft', size: 'medium', orientation: 'horizontal', activation: 'automatic', overflow: 'none', icons: 'none', state: 'ready'},
  states: ['ready', 'loading', 'selected', 'unselected', 'hover', 'focus', 'active', 'disabled'],
  transitions: [
    {from: 'unselected', to: 'selected', trigger: 'click | Enter/Space (manual) | Arrow/Home/End (automatic)'}, {from: 'selected', to: 'unselected', trigger: 'another tab selected'},
    {from: 'unselected', to: 'focus', trigger: 'Arrow/Home/End moves focus (roving tabindex)'}, {from: 'ready', to: 'loading', trigger: 'app sets panel aria-busy'}, {from: 'loading', to: 'ready', trigger: 'app clears panel aria-busy'},
    {from: 'unselected', to: 'hover', trigger: 'pointer enter'}, {from: 'hover', to: 'active', trigger: 'pointer down'},
  ],
  forbidden: [
    {id: 'TABS_UNDERLINE_SHAPE', when: {appearance: 'underline', shape: ['square', 'pill']}, why: 'underline에는 상자가 없어 모서리 모양이 보이지 않으므로 기본 모양 하나만 둔다'},
    {id: 'TABS_SEGMENTED_VERTICAL', when: {appearance: 'segmented', orientation: 'vertical'}, why: 'segmented는 가로 한 줄 트랙 안의 선택 표시라 세로로 세우면 트랙이 칸 목록처럼 읽힌다'},
    {id: 'TABS_SEGMENTED_SCROLL', when: {appearance: 'segmented', overflow: 'scroll'}, why: 'segmented 트랙을 스크롤하면 잘린 칸이 선택 칸으로 오해된다: 칸 수를 줄이거나 underline을 쓴다'},
    {id: 'TABS_VERTICAL_SCROLL', when: {orientation: 'vertical', overflow: 'scroll'}, why: '스크롤 넘침은 가로 목록용이다: 세로 탭은 줄이 아래로 늘어난다'},
  ],
  unsupported: ['closable tabs', 'draggable reordering', 'lazy panel fetch (app injects aria-busy)'],
  pairs: [
    ['--kit-muted', '--kit-surface', 4.5, 'tab'], ['--kit-text', '--kit-card-hover', 7, 'tab hover'], ['--kit-link', '--kit-surface', 4.5, 'selected (underline)'], ['--kit-link', '--kit-soft', 4.5, 'selected (pill)'],
    ['--kit-text', '--kit-surface', 7, 'selected (segmented)'], ['--kit-action', '--kit-surface', 3, 'indicator'], ['--kit-focus', '--kit-surface', 3, 'focus ring'], ['--kit-muted', '--kit-card-hover', 4.5, 'tab hover (muted)'],
  ],
});

export function renderTabs(input) {
  const {id, label, tabs, selected, force = ''} = input ?? {};
  const p = resolveProps(tabsContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Tabs requires a lowercase kebab-case id');
  if (!String(label ?? '').trim()) throw new TypeError('Tabs requires an accessible label');
  if (force && !['hover', 'focus', 'active'].includes(force)) throw new TypeError('Invalid force preview');
  if (!Array.isArray(tabs) || tabs.length < 2 || tabs.length > 6) throw new TypeError('TABS_COUNT: tabs need 2–6 entries');
  const ids = new Set();
  for (const t of tabs) {
    if (!t || !SAFE_ID.test(t.id ?? '') || ids.has(t.id) || !String(t.label ?? '').trim() || typeof t.content !== 'string') throw new TypeError('TABS_ENTRY: each tab needs a unique kebab-case id, a label and text content');
    ids.add(t.id);
    if (p.icons === 'start' && !t.icon) throw new TypeError('TABS_ICONS: icons=start needs an icon on every tab');
  }
  const current = selected ?? tabs.find(t => !t.disabled)?.id;
  const chosen = tabs.find(t => t.id === current);
  if (!chosen || chosen.disabled) throw new TypeError('TABS_SELECTED: the selected tab must exist and be enabled');
  const roving = chosen.id;
  let forced = force ? false : true; // 증거 페이지용: 선택도 비활성도 아닌 첫 탭에 hover·focus 모양을 입힌다.
  const forceAttr = t => (!forced && t.id !== current && !t.disabled ? (forced = true, ` data-force="${force}"`) : '');
  const tab = t => `<button type="button" role="tab" class="kit-ctl-tab" id="${e(id)}-tab-${t.id}" aria-controls="${e(id)}-panel-${t.id}" aria-selected="${t.id === current}" tabindex="${t.id === roving ? 0 : -1}"${t.disabled ? ' disabled' : ''} data-tab="${t.id}"${forceAttr(t)}>${p.icons === 'start' ? icon(t.icon) : ''}<span>${e(t.label)}</span></button>`;
  const loading = p.state === 'loading';
  const panel = t => `<div role="tabpanel" class="kit-ctl-panel" id="${e(id)}-panel-${t.id}" aria-labelledby="${e(id)}-tab-${t.id}" tabindex="0"${t.id === current ? '' : ' hidden'}${loading && t.id === current ? ' aria-busy="true"' : ''}>${loading && t.id === current ? '<span class="kit-ctl-skel" aria-hidden="true"></span><span class="kit-ctl-skel" data-short aria-hidden="true"></span><span class="kit-ctl-sr" role="status">불러오는 중입니다.</span>' : `<p>${e(t.content)}</p>`}</div>`;
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  return `<div class="kit-ctl-tabs" data-ctl="tabs" id="${e(id)}" ${attrs}><div class="kit-ctl-tablist" role="tablist" aria-label="${e(label)}" aria-orientation="${p.orientation}">${tabs.map(tab).join('')}</div><div class="kit-ctl-panels">${tabs.map(panel).join('')}</div></div>`;
}

/** 브라우저에서 붙는 동작: roving tabindex, 방향키·Home·End, automatic은 포커스가 곧 선택, manual은 Enter·Space로 선택. 비활성 탭은 건너뛴다. */
export function attachTabs(root, {onChange} = {}) {
  const doc = root.ownerDocument, list = root.querySelector('[role="tablist"]');
  const tabs = [...root.querySelectorAll('[role="tab"]')], panels = [...root.querySelectorAll('[role="tabpanel"]')];
  if (!list || !tabs.length || tabs.length !== panels.length) throw new TypeError('Tabs root is incomplete');
  const enabled = () => tabs.filter(t => !t.disabled);
  const select = (tab, focus) => {
    tabs.forEach((t, i) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; panels[i].hidden = !on; });
    if (focus) tab.focus();
    if (tab.scrollIntoView) tab.scrollIntoView({block: 'nearest', inline: 'nearest'});
    if (typeof onChange === 'function') onChange({id: tab.dataset.tab});
  };
  const move = (tab, auto) => { tabs.forEach(t => { t.tabIndex = -1; }); tab.tabIndex = 0; tab.focus(); if (auto) select(tab, false); };
  tabs.forEach(tab => tab.addEventListener('click', () => select(tab, false)));
  list.addEventListener('keydown', event => {
    const items = enabled(), at = items.indexOf(doc.activeElement);
    if (at < 0) return;
    const vertical = root.dataset.orientation === 'vertical', auto = root.dataset.activation === 'automatic';
    const next = vertical ? 'ArrowDown' : 'ArrowRight', prev = vertical ? 'ArrowUp' : 'ArrowLeft';
    let target = null;
    if (event.key === next) target = items[(at + 1) % items.length]; else if (event.key === prev) target = items[(at - 1 + items.length) % items.length];
    else if (event.key === 'Home') target = items[0]; else if (event.key === 'End') target = items[items.length - 1];
    else if (!auto && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(items[at], false); return; }
    if (target) { event.preventDefault(); move(target, auto); }
  });
  return {select: id => { const t = tabs.find(x => x.dataset.tab === id && !x.disabled); if (t) select(t, false); }};
}
export const tabsRuntime = "function attachTabs(root, {onChange} = {}) {\n  const doc = root.ownerDocument, list = root.querySelector('[role=\"tablist\"]');\n  const tabs = [...root.querySelectorAll('[role=\"tab\"]')], panels = [...root.querySelectorAll('[role=\"tabpanel\"]')];\n  if (!list || !tabs.length || tabs.length !== panels.length) throw new TypeError('Tabs root is incomplete');\n  const enabled = () => tabs.filter(t => !t.disabled);\n  const select = (tab, focus) => {\n    tabs.forEach((t, i) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; panels[i].hidden = !on; });\n    if (focus) tab.focus();\n    if (tab.scrollIntoView) tab.scrollIntoView({block: 'nearest', inline: 'nearest'});\n    if (typeof onChange === 'function') onChange({id: tab.dataset.tab});\n  };\n  const move = (tab, auto) => { tabs.forEach(t => { t.tabIndex = -1; }); tab.tabIndex = 0; tab.focus(); if (auto) select(tab, false); };\n  tabs.forEach(tab => tab.addEventListener('click', () => select(tab, false)));\n  list.addEventListener('keydown', event => {\n    const items = enabled(), at = items.indexOf(doc.activeElement);\n    if (at < 0) return;\n    const vertical = root.dataset.orientation === 'vertical', auto = root.dataset.activation === 'automatic';\n    const next = vertical ? 'ArrowDown' : 'ArrowRight', prev = vertical ? 'ArrowUp' : 'ArrowLeft';\n    let target = null;\n    if (event.key === next) target = items[(at + 1) % items.length]; else if (event.key === prev) target = items[(at - 1 + items.length) % items.length];\n    else if (event.key === 'Home') target = items[0]; else if (event.key === 'End') target = items[items.length - 1];\n    else if (!auto && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(items[at], false); return; }\n    if (target) { event.preventDefault(); move(target, auto); }\n  });\n  return {select: id => { const t = tabs.find(x => x.dataset.tab === id && !x.disabled); if (t) select(t, false); }};\n}";

export const tabsStyles = `${baseStyles}${sizeCSS('.kit-ctl-tabs')}
.kit-ctl-tabs{display:grid;gap:var(--kit-sp-item);min-width:0;font-size:var(--ctl-font);color:var(--kit-muted)}
.kit-ctl-tabs[data-orientation=vertical]{grid-template-columns:auto minmax(0,1fr);align-items:start}
.kit-ctl-tablist{display:flex;gap:var(--kit-sp-tight);min-width:0}
.kit-ctl-tabs[data-orientation=vertical] .kit-ctl-tablist{flex-direction:column}
.kit-ctl-tabs[data-overflow=scroll] .kit-ctl-tablist{overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin}
.kit-ctl-tabs[data-appearance=underline][data-orientation=horizontal] .kit-ctl-tablist{border-bottom:1px solid var(--kit-border)}
.kit-ctl-tabs[data-appearance=underline][data-orientation=vertical] .kit-ctl-tablist{border-inline-end:1px solid var(--kit-border)}
.kit-ctl-tabs[data-appearance=segmented] .kit-ctl-tablist{display:inline-flex;justify-self:start;max-width:100%;padding:var(--kit-sp-tight);border-radius:var(--kit-radius);background:var(--kit-card-active)}
.kit-ctl-tabs[data-appearance=segmented][data-shape=square] .kit-ctl-tablist{border-radius:0}.kit-ctl-tabs[data-appearance=segmented][data-shape=pill] .kit-ctl-tablist{border-radius:999px}
.kit-ctl-tab{display:inline-flex;align-items:center;gap:var(--ctl-gap);flex:none;box-sizing:border-box;min-height:var(--ctl-h);padding-inline:var(--ctl-px);border:0 solid transparent;border-radius:var(--kit-radius);background:transparent;color:inherit;font:inherit;font-size:var(--ctl-font);font-weight:var(--kit-bw,600);white-space:nowrap;word-break:keep-all;cursor:pointer}
.kit-ctl-tabs[data-shape=square] .kit-ctl-tab{border-radius:0}.kit-ctl-tabs[data-shape=pill] .kit-ctl-tab{border-radius:999px}
.kit-ctl-tabs .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon);flex:none}
.kit-ctl-tabs[data-appearance=underline] .kit-ctl-tab{border-radius:0;margin-bottom:-1px}
.kit-ctl-tabs[data-appearance=underline][data-orientation=horizontal] .kit-ctl-tab{border-bottom-width:3px}
.kit-ctl-tabs[data-appearance=underline][data-orientation=vertical] .kit-ctl-tab{border-inline-end-width:3px;margin:0 -1px 0 0;justify-content:flex-start}
.kit-ctl-tab[aria-selected=true]{color:var(--kit-link)}
.kit-ctl-tabs[data-appearance=underline] .kit-ctl-tab[aria-selected=true]{border-color:var(--kit-action)}
.kit-ctl-tabs[data-appearance=pill] .kit-ctl-tab[aria-selected=true]{background:var(--kit-soft);box-shadow:inset 0 0 0 1px currentColor}
.kit-ctl-tabs[data-appearance=segmented] .kit-ctl-tab[aria-selected=true]{background:var(--kit-surface);color:var(--kit-text);box-shadow:var(--kit-shadow-hover),inset 0 0 0 1px var(--kit-control-border)}
.kit-ctl-tab[aria-selected=false]:not(:disabled)${hover}{color:var(--kit-text);background:var(--kit-card-hover);transform:translateY(var(--kit-lift,0px))}
.kit-ctl-tabs[data-appearance=underline] .kit-ctl-tab[aria-selected=false]:not(:disabled)${hover}{border-color:var(--kit-control-border)}
.kit-ctl-tab:not(:disabled)${active}{background:var(--kit-card-active);transform:translateY(1px)}
${focusRing('.kit-ctl-tab', '-3px')}${focusRing('.kit-ctl-panel', '2px')}
.kit-ctl-tab:disabled{color:var(--kit-control-disabled-fg);cursor:not-allowed}
.kit-ctl-panel{min-width:0;color:var(--kit-text);border-radius:var(--kit-radius)}.kit-ctl-panel p{margin:0;word-break:keep-all;overflow-wrap:anywhere}.kit-ctl-panel[hidden]{display:none}
.kit-ctl-panel[aria-busy=true]{display:grid;gap:var(--kit-sp-near)}.kit-ctl-panel .kit-ctl-skel{display:block;height:var(--kit-sp-item);border-radius:var(--kit-sp-tight);background:var(--kit-card-active);animation:kit-ctl-pulse 1.4s ease-in-out infinite}.kit-ctl-panel .kit-ctl-skel[data-short]{width:60%}
@keyframes kit-ctl-pulse{50%{opacity:.45}}@media(prefers-reduced-motion:reduce){.kit-ctl-panel .kit-ctl-skel{animation:none}}
@media(max-width:640px){.kit-ctl-tabs[data-orientation=vertical]{grid-template-columns:minmax(0,1fr)}.kit-ctl-tabs[data-orientation=vertical] .kit-ctl-tablist{flex-direction:row;overflow-x:auto;border-inline-end:0;border-bottom:1px solid var(--kit-border)}}`.replace(/\n/g, '');

export const tabsExamples = Object.freeze([
  {id: 'ex-tabs-line', label: '프로젝트 보기', selected: 'overview', tabs: [{id: 'overview', label: '개요', content: '프로젝트의 목표와 현재 상태를 요약합니다.'}, {id: 'tasks', label: '작업', content: '이번 주에 끝낼 작업 목록입니다.'}, {id: 'files', label: '파일', content: '공유된 파일 열두 개가 있습니다.'}, {id: 'archive', label: '보관', content: '보관된 항목입니다.', disabled: true}]},
  {id: 'ex-tabs-seg', label: '기간', appearance: 'segmented', shape: 'pill', activation: 'manual', tabs: [{id: 'day', label: '일', content: '오늘 기준 지표입니다.'}, {id: 'week', label: '주', content: '이번 주 기준 지표입니다.'}, {id: 'month', label: '월', content: '이번 달 기준 지표입니다.'}]},
  {id: 'ex-tabs-side', label: '설정 구역', appearance: 'pill', orientation: 'vertical', icons: 'start', tabs: [{id: 'profile', label: '프로필', icon: 'user', content: '이름과 소개를 바꿉니다.'}, {id: 'notify', label: '알림', icon: 'bell', content: '알림 수신 방식을 고릅니다.'}, {id: 'safe', label: '보안', icon: 'shield', content: '비밀번호와 로그인 기기를 관리합니다.'}]},
]);

export const tabsMaterial = componentMaterial(tabsContract, {
  category: 'layout-navigation', module: 'src/materials/tabs.mjs', renderExport: 'renderTabs', key: 'tabs-control', styles: tabsStyles, examples: tabsExamples.map(x => structuredClone(x)),
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: '세로 탭은 640px 이하에서 가로 줄로 눕는다. scroll 넘침은 목록 안에서만 스크롤한다.'},
  a11y: {rules: ['R05', 'R13'], role: 'tablist > tab + tabpanel (aria-selected, aria-controls, aria-labelledby, roving tabindex)', keyboard: 'Arrow keys by orientation, Home/End; automatic activation follows focus, manual needs Enter/Space; disabled tabs are skipped'},
  validation: {rules: ['R13'], codes: ['TABS_COUNT', 'TABS_ENTRY', 'TABS_ICONS', 'TABS_SELECTED', ...tabsContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:34'], ext: {group: 'layout', required: ['id', 'label', 'tabs']},
});
