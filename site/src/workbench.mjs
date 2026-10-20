import {themes, themeCategories, palettes, paletteFamilies, nodeSpecs, nodeTypes, createBlueprint, repairAxes, templateList, templates, pageTypes, axes, axisDefs, layoutSlots, CATALOG_VERSION, limits} from './catalog.mjs';
import {compile, validateBlueprint} from './compiler.mjs';
import {escapeHTML as e} from './render.mjs';
import {DEVICES, mountViewport, openInWindow} from './workbench/viewport.mjs';
import {AXIS_GROUPS, SHORT, isSegmented, valueLabel, optionState, chooseAxis} from './workbench/axes.mjs';
import {PAGE, listPalettes, paletteCard, familyChips, familyCounts} from './workbench/palette-picker.mjs';
import {renderCatalog} from './workbench/catalog-view.mjs';

const $ = id => document.getElementById(id);
const pretty = x => JSON.stringify(x, null, 2);
const storageKey = 'winterholic-static-kit.blueprint.v3', deviceKey = 'winterholic-static-kit.device';
const DEFAULT_TEMPLATE = 'dashboard-overview';
let blueprint = createBlueprint(DEFAULT_TEMPLATE), compiled, selected = [], valid = true, lastDraft = null;
const sel = {templateId: DEFAULT_TEMPLATE, layout: {}, themeVariant: null, paletteChosen: false};
const ui = {device: null, structureOpen: false, family: 'recommended', query: '', limit: PAGE};

const getNode = (b, path) => path.reduce((n, index) => n?.children?.[index], b.tree);
const nodeName = n => n?.title ?? n?.label ?? n?.name ?? nodeSpecs[n?.type]?.label ?? '노드';
const status = text => { $('save-status').textContent = text; };

/** 렌더 결과가 같으면 DOM을 건드리지 않아 포커스와 스크롤을 지킨다. */
function setHTML(el, html) { if (el._html === html) return; el._html = html; el.innerHTML = html; }
const keyOf = el => el?.dataset?.fk ?? (el?.id ? '#' + el.id : null);
function download(filename, text, type) {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], {type}));
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(filename + ' 다운로드를 요청했습니다.');
}

function showError(error) {
  valid = false; $('errors').hidden = false;
  const list = error.errors?.map(x => `${x.path}\n[${x.code}] ${x.message}`).join('\n\n') ?? error.message;
  $('errors-text').textContent = list;
  $('auto-fix').hidden = !error.errors?.some(x => ['AXIS_BAN', 'PAGE_SHELL', 'PAGE_WIDTH', 'NAV_COUNT'].includes(x.code));
  $('valid-status').textContent = '검증 오류 · 마지막 유효 결과를 표시합니다.';
  $('valid-status').style.color = 'var(--app-danger)';
  $('download-html').disabled = true; $('download-json').disabled = true;
  if (!ui.structureOpen && matchMedia('(min-width: 1024px)').matches) setStructure(true);
}
function save() {
  try { localStorage.setItem(storageKey, pretty({blueprint, sel})); status('이 브라우저에 유효한 설계를 저장했습니다.'); }
  catch { status('브라우저 저장을 사용할 수 없습니다. JSON으로 내려받으세요.'); }
}

// ---------- 선택 패널 ----------
function renderTemplate() {
  const byType = Object.entries(pageTypes).map(([id, p]) => `<optgroup label="${e(p.label)}">${templateList.filter(t => t.pageType === id).map(t => `<option value="${t.id}"${t.id === sel.templateId ? ' selected' : ''}>${e(t.label)}</option>`).join('')}</optgroup>`).join('');
  setHTML($('template'), byType);
  $('page-type').textContent = pageTypes[blueprint.pageType].label + ' · ' + pageTypes[blueprint.pageType].description;
  const slots = layoutSlots(templates[sel.templateId].tree);
  $('layout-field').hidden = !slots.length;
  setHTML($('layout-slots'), slots.map(slot => `<fieldset class="slot"><legend>${e(slot.label)}</legend><div class="chips" role="radiogroup" aria-label="${e(slot.label)}">${[{id: 'default', label: '기본', description: '템플릿 그대로'}, ...slot.options].map(o => `<button type="button" class="chip" role="radio" aria-checked="${(sel.layout[slot.id] ?? 'default') === o.id}" data-slot="${slot.id}" data-option="${o.id}" data-fk="slot:${slot.id}:${o.id}" title="${e(o.description ?? '')}">${e(o.label)}</button>`).join('')}</div></fieldset>`).join(''));
  $('project-name').value = blueprint.name;
}
function renderTheme() {
  const t = themes[blueprint.theme];
  setHTML($('theme'), Object.entries(themeCategories).map(([c, label]) => `<optgroup label="${e(label)}">${Object.values(themes).filter(x => x.category === c).map(x => `<option value="${x.id}"${x.id === blueprint.theme ? ' selected' : ''}>${e(x.name)}</option>`).join('')}</optgroup>`).join(''));
  $('theme-description').textContent = t.description;
  $('variant-field').hidden = !t.variants.length;
  setHTML($('theme-variants'), [{id: null, label: '기본', description: '테마의 기본 결'}, ...t.variants].map(v => `<button type="button" class="chip" role="radio" aria-checked="${(sel.themeVariant ?? null) === v.id}" data-variant="${v.id ?? ''}" data-fk="variant:${v.id ?? 'default'}" title="${e(v.description)}">${e(v.label)}</button>`).join(''));
}
function renderPalettes() {
  const t = themes[blueprint.theme], list = listPalettes({themeId: t.id, family: ui.family, query: ui.query, selected: blueprint.palette}), shown = list.slice(0, ui.limit);
  setHTML($('palette-families'), familyChips(ui.family, familyCounts(t.id)));
  setHTML($('palette-options'), shown.length ? shown.map(p => paletteCard(p, {checked: p.id === blueprint.palette, recommended: t.palettes.includes(p.id)})).join('') : '<p class="palette-empty">조건에 맞는 팔레트가 없습니다.</p>');
  $('palette-more').hidden = list.length <= ui.limit;
  $('palette-more').textContent = `더 보기 (${list.length - ui.limit}개 남음)`;
  $('palette-count').textContent = `${shown.length}/${list.length} · 전체 ${Object.keys(palettes).length}`;
}
function renderModes() {
  const t = themes[blueprint.theme];
  setHTML($('mode-options'), axes.mode.map(m => { const s = optionState(blueprint, t, 'mode', m); return `<label class="${s.blocked ? 'is-blocked' : ''}" title="${e(s.reason ?? axisDefs.mode.values[m])}"><input type="radio" name="mode" value="${m}" data-fk="mode:${m}" ${m === blueprint.mode ? 'checked' : ''} ${s.blocked ? 'disabled' : ''}><span>${SHORT.mode[m]}${s.conflict ? ' ·' : ''}</span></label>`; }).join(''));
  $('mode').setAttribute('aria-pressed', String(blueprint.mode === 'dark'));
  $('mode').textContent = blueprint.mode === 'dark' ? '라이트 보기' : '다크 보기';
  $('modal-mode').setAttribute('aria-pressed', String(blueprint.mode === 'dark'));
  $('modal-mode').textContent = blueprint.mode === 'dark' ? '라이트 보기' : '다크 보기';
}
function renderAxes() {
  const t = themes[blueprint.theme];
  let blockedCount = 0;
  const field = k => {
    const states = axes[k].map(v => [v, optionState(blueprint, t, k, v)]);
    blockedCount += states.filter(([, s]) => s.blocked).length;
    const label = e(axisDefs[k].label);
    if (isSegmented(k)) return `<div class="field axis"><span class="field-label" id="lab-${k}">${label}</span><div class="segmented" role="radiogroup" aria-labelledby="lab-${k}" id="axis-${k}">${states.map(([v, s]) => `<label class="${s.blocked ? 'is-blocked' : ''}" title="${e(s.reason ? s.reason : axisDefs[k].values[v])}"><input type="radio" name="axis-${k}" value="${v}" data-axis="${k}" data-fk="axis:${k}:${v}" ${v === blueprint[k] ? 'checked' : ''} ${s.blocked ? 'disabled' : ''}><span>${SHORT[k][v]}${s.conflict ? ' ·' : ''}</span></label>`).join('')}</div></div>`;
    return `<div class="field axis"><label for="axis-${k}">${label}</label><select id="axis-${k}" data-axis="${k}">${states.map(([v, s]) => `<option value="${v}"${v === blueprint[k] ? ' selected' : ''}${s.blocked ? ' disabled' : ''}>${e(v)} — ${e(axisDefs[k].values[v])}${s.blocked ? ' (사용 불가)' : s.conflict ? ' (다른 값 함께 조정)' : ''}</option>`).join('')}</select></div>`;
  };
  const open = new Set([...document.querySelectorAll('.axis-group[open]')].map(d => d.dataset.group));
  const first = !document.querySelector('.axis-group');
  setHTML($('axis-controls'), AXIS_GROUPS.map((g, i) => `<details class="axis-group" data-group="${g.id}" ${first ? (i < 2 ? 'open' : '') : open.has(g.id) ? 'open' : ''}><summary>${e(g.label)}</summary><div class="axes">${g.keys.map(field).join('')}</div></details>`).join(''));
  $('axis-count').textContent = blockedCount ? `막힌 값 ${blockedCount}` : '';
}
function renderSummary() {
  const t = themes[blueprint.theme], v = t.variants.find(x => x.id === sel.themeVariant);
  $('selection-summary').textContent = `${templates[sel.templateId].label} · ${t.name}${v ? ' (' + v.label + ')' : ''} · ${palettes[blueprint.palette].name}`;
  $('modal-title').textContent = `${blueprint.name} · ${t.name} · ${palettes[blueprint.palette].name}`;
}
function renderChoices() { renderTemplate(); renderTheme(); renderPalettes(); renderModes(); renderAxes(); renderSummary(); }

// ---------- 구조 패널 ----------
function renderTree() {
  if (!getNode(blueprint, selected)) selected = [];
  const isSelected = path => JSON.stringify(path) === JSON.stringify(selected);
  const node = (n, path) => `<li><button type="button" data-path="${path.join(',')}" class="${isSelected(path) ? 'selected' : ''}" aria-pressed="${isSelected(path)}"><span>${n.children ? '▱' : '◇'}</span><span>${e(nodeSpecs[n.type].label)}${n.type !== 'page' ? ' · ' + e(nodeName(n)).slice(0, 40) : ''}</span></button>${n.children ? `<ul>${n.children.map((c, i) => node(c, [...path, i])).join('')}</ul>` : ''}</li>`;
  setHTML($('tree'), '<ul>' + node(blueprint.tree, []) + '</ul>');
  renderNodeEditor();
}
function renderNodeEditor() {
  const n = getNode(blueprint, selected), root = selected.length === 0, header = n.type === 'page-header';
  $('selected-node').textContent = nodeSpecs[n.type].label;
  $('node-editor').value = pretty(n);
  $('remove-node').disabled = root || header;
  const siblings = root ? [] : getNode(blueprint, selected.slice(0, -1)).children, index = selected.at(-1);
  $('move-up').disabled = root || header || index === 0 || (selected.length === 1 && index === 1);
  $('move-down').disabled = root || header || index === siblings.length - 1;
  const parent = nodeSpecs[n.type].children ? n : root ? n : getNode(blueprint, selected.slice(0, -1));
  const allowed = nodeSpecs[parent.type].children?.filter(type => type !== 'page-header' && makeNode(type)) ?? [];
  setHTML($('add-node'), allowed.map(type => `<option value="${type}">${e(nodeSpecs[type].label)} · ${type}</option>`).join(''));
  $('add').disabled = !allowed.length;
}
function renderTokens() {
  const p = palettes[blueprint.palette], prov = compiled.manifest.paletteProvenance;
  $('palette-source').href = p.source.url;
  $('palette-adjustment').textContent = `원색 ${prov.brandSeed} → 행동색 ${prov.action} · 보조색 ${prov.accentSeed}. ${prov.adjusted ? '실제 배경과의 대비를 위해 보정했습니다.' : '원색을 그대로 사용합니다.'} 전체 ${compiled.manifest.contrast.length}쌍 검사.`;
  const shown = compiled.tokens[blueprint.mode === 'auto' ? 'light' : blueprint.mode];
  setHTML($('tokens'), Object.entries(shown).map(([key, color]) => `<div class="token-row"><i style="background:${color}"></i><span>${key}</span><span>${color}</span></div>`).join(''));
  const min = Math.min(...compiled.manifest.contrast.filter(x => x.minimum === 4.5).map(x => x.ratio));
  $('contrast-status').textContent = `본문 대비 ≥ ${min.toFixed(2)}:1`;
}
function setStructure(open) {
  ui.structureOpen = open;
  document.querySelector('.workbench').dataset.structure = open ? 'open' : 'closed';
  $('toggle-structure').setAttribute('aria-pressed', String(open));
  requestAnimationFrame(() => viewports.forEach(v => v.apply()));
}

// ---------- 확정 ----------
function commit(next, {persist = true} = {}) {
  try {
    const focusKey = keyOf(document.activeElement);
    const result = compile(next); blueprint = structuredClone(next); compiled = result; valid = true; lastDraft = null;
    $('errors').hidden = true; $('download-html').disabled = false; $('download-json').disabled = false;
    $('valid-status').style.color = ''; $('valid-status').textContent = '● 트리 검증 통과';
    pushPreview();
    renderChoices(); renderTree(); renderTokens();
    if (focusKey) (document.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`) ?? (focusKey.startsWith('#') ? document.querySelector(focusKey) : null))?.focus({preventScroll: true});
    $('blueprint-editor').value = pretty(blueprint);
    if (persist) save();
    return true;
  } catch (error) { lastDraft = structuredClone(next); showError(error); return false; }
}
function mutate(fn) { const next = structuredClone(blueprint); fn(next); return commit(next); }
const compose = (templateId, themeId, options = {}) => createBlueprint(templateId, themeId, sel.paletteChosen ? blueprint.palette : undefined, {themeVariant: sel.themeVariant, layout: sel.layout, ...options});
/** 템플릿을 바꿔도 지금 고른 테마·변형·팔레트는 그대로 입힌다. */
function useTemplate(id) { selected = []; sel.templateId = id; sel.layout = {}; commit(compose(id, blueprint.theme)); }
function useTheme(id, variant = null) { selected = []; sel.themeVariant = variant || null; commit(compose(sel.templateId, id)); }
function setAxis(key, value) {
  const s = optionState(blueprint, themes[blueprint.theme], key, value);
  if (s.blocked) { status(s.reason); renderChoices(); return; }
  const r = chooseAxis(blueprint, key, value);
  if (r.error) { status(r.error); renderChoices(); return; }
  if (commit(r.blueprint) && r.adjusted.length) status(`${s.conflict?.id ?? '규칙'}에 맞춰 ${r.adjusted.map(k => `${axisDefs[k]?.label ?? k}`).join('·')}도 함께 바꿨습니다.`);
}
function parse(text) { if (new TextEncoder().encode(text).length > limits.bytes) throw new Error(`SIZE: 설계는 ${limits.bytes}바이트 이하입니다.`); return JSON.parse(text); }
/** Node factory: catalog examples are the only source of defaults, so "add" can never create an invalid shape. */
function makeNode(type) {
  const spec = nodeSpecs[type];
  if (spec.example) return structuredClone(spec.example);
  const parent = nodeTypes.find(t => nodeSpecs[t].example && nodeSpecs[t].children?.includes(type));
  return parent ? structuredClone(nodeSpecs[parent].example.children?.find(c => c.type === type) ?? null) : null;
}

// ---------- 미리보기 ----------
const viewports = [];
const deviceButtons = () => Object.entries(DEVICES).map(([id, d]) => `<button type="button" role="radio" aria-checked="${ui.device === id}" data-device="${id}" data-fk="device:${id}">${d.label}${d.width ? ` <small>${d.width}</small>` : ''}</button>`).join('');
function renderDevices() { setHTML($('device-options'), deviceButtons()); setHTML($('modal-devices'), deviceButtons()); }
function pushPreview() {
  $('preview-frame').srcdoc = compiled.html;
  if ($('preview-modal').open) $('modal-frame').srcdoc = compiled.html;
}
function setDevice(id) { ui.device = id; try { localStorage.setItem(deviceKey, id); } catch { /* 저장 불가 */ } renderDevices(); viewports.forEach(v => v.apply()); }
function zoomText(r) { return (DEVICES[r.device].width ? DEVICES[r.device].width + 'px · ' : '') + Math.round(r.scale * 100) + '%'; }
function openModal() {
  const modal = $('preview-modal');
  if (modal.open) return;
  $('modal-frame').srcdoc = compiled.html;
  modal.showModal();
  requestAnimationFrame(() => viewports.forEach(v => v.apply()));
}
function openWindow() {
  if (!compiled) return;
  const ok = openInWindow(compiled.html);
  status(ok ? '새 창에서 열었습니다. 창 크기를 바꿔 반응형을 확인하세요.' : '브라우저가 새 창을 막았습니다. 팝업을 허용하거나 전체 화면 보기를 쓰세요.');
}

// ---------- 카탈로그 ----------
const catalogState = {tab: 'templates', templateType: 'all', themeCategory: 'all', paletteFamily: 'all'};
let catalogView = null;
function showPage(which) {
  $('workspace').hidden = which !== 'builder'; $('catalog').hidden = which !== 'catalog';
  for (const id of ['builder', 'catalog']) { $(id + '-tab').classList.toggle('active', which === id); $(id + '-tab').setAttribute('aria-pressed', String(which === id)); }
  if (which === 'catalog') catalogView.draw(); else requestAnimationFrame(() => viewports.forEach(v => v.apply()));
  window.scrollTo({top: 0});
}

function bind() {
  $('template').addEventListener('change', event => useTemplate(event.target.value));
  $('theme').addEventListener('change', event => useTheme(event.target.value, null));
  $('theme-variants').addEventListener('click', event => { const b = event.target.closest('[data-variant]'); if (b) { selected = []; sel.themeVariant = b.dataset.variant || null; commit(compose(sel.templateId, blueprint.theme)); } });
  $('layout-slots').addEventListener('click', event => {
    const b = event.target.closest('[data-slot]'); if (!b) return;
    const layout = {...sel.layout}; if (b.dataset.option === 'default') delete layout[b.dataset.slot]; else layout[b.dataset.slot] = b.dataset.option;
    sel.layout = layout; selected = [];
    mutate(next => { next.tree = {type: 'page', children: compose(sel.templateId, blueprint.theme).tree.children}; });
  });
  $('palette-options').addEventListener('change', event => { if (event.target.name === 'palette') { sel.paletteChosen = true; mutate(b => { b.palette = event.target.value; }); } });
  $('palette-families').addEventListener('click', event => { const b = event.target.closest('[data-family]'); if (b) { ui.family = b.dataset.family; ui.limit = PAGE; renderPalettes(); } });
  $('palette-search').addEventListener('input', event => { ui.query = event.target.value; ui.limit = PAGE; renderPalettes(); });
  $('palette-more').addEventListener('click', () => { ui.limit += PAGE; renderPalettes(); });
  $('mode-options').addEventListener('change', event => { if (event.target.name === 'mode') setAxis('mode', event.target.value); });
  $('axis-controls').addEventListener('change', event => { const key = event.target.dataset.axis; if (key) setAxis(key, event.target.value); });
  $('project-name').addEventListener('change', event => mutate(b => { b.name = event.target.value; }));
  for (const id of ['mode', 'modal-mode']) $(id).addEventListener('click', () => setAxis('mode', blueprint.mode === 'dark' ? 'light' : 'dark'));
  for (const id of ['device-options', 'modal-devices']) $(id).addEventListener('click', event => { const b = event.target.closest('[data-device]'); if (b) setDevice(b.dataset.device); });
  $('open-window').addEventListener('click', openWindow); $('modal-window').addEventListener('click', openWindow);
  $('open-modal').addEventListener('click', openModal); $('modal-close').addEventListener('click', () => $('preview-modal').close());
  $('preview-modal').addEventListener('close', () => { $('modal-frame').srcdoc = ''; $('open-modal').focus({preventScroll: true}); });
  $('preview-modal').addEventListener('click', event => { if (event.target === $('preview-modal')) $('preview-modal').close(); });
  $('toggle-structure').addEventListener('click', () => setStructure(!ui.structureOpen));
  $('reset').addEventListener('click', () => { selected = []; Object.assign(sel, {templateId: DEFAULT_TEMPLATE, layout: {}, themeVariant: null, paletteChosen: false}); ui.family = 'recommended'; ui.query = ''; $('palette-search').value = ''; commit(createBlueprint(DEFAULT_TEMPLATE)); });
  $('auto-fix').addEventListener('click', () => { if (lastDraft) commit(repairAxes(structuredClone(lastDraft))); });
  $('tree').addEventListener('click', event => { const button = event.target.closest('button[data-path]'); if (!button) return; selected = button.dataset.path ? button.dataset.path.split(',').map(Number) : []; renderTree(); });
  $('apply-node').addEventListener('click', () => { try { const node = parse($('node-editor').value); mutate(b => { if (!selected.length) b.tree = node; else getNode(b, selected.slice(0, -1)).children[selected.at(-1)] = node; }); } catch (error) { showError(error); } });
  $('apply-blueprint').addEventListener('click', () => { try { const next = parse($('blueprint-editor').value); if (commit(next)) selected = []; } catch (error) { showError(error); } });
  $('add').addEventListener('click', () => { const n = getNode(blueprint, selected); mutate(b => { const path = nodeSpecs[n.type].children ? selected : selected.slice(0, -1), parent = getNode(b, path); parent.children.push(makeNode($('add-node').value)); selected = [...path, parent.children.length - 1]; }); });
  $('remove-node').addEventListener('click', () => { const path = [...selected]; if (!path.length || getNode(blueprint, path).type === 'page-header') return; mutate(b => getNode(b, path.slice(0, -1)).children.splice(path.at(-1), 1)); selected = path.slice(0, -1); renderTree(); });
  for (const [id, delta] of [['move-up', -1], ['move-down', 1]]) $(id).addEventListener('click', () => { if ($(id).disabled) return; const index = selected.at(-1); mutate(b => { const items = getNode(b, selected.slice(0, -1)).children;[items[index], items[index + delta]] = [items[index + delta], items[index]]; selected = [...selected.slice(0, -1), index + delta]; }); });
  $('download-json').addEventListener('click', () => { if (valid) download(`${sel.templateId}-blueprint.json`, pretty(blueprint) + '\n', 'application/json'); });
  $('download-html').addEventListener('click', () => { if (valid) download(`${sel.templateId}-${blueprint.theme}.html`, compiled.html, 'text/html'); });
  for (const tab of document.querySelectorAll('.mobile-tabs button')) tab.addEventListener('click', () => { document.querySelector('.workbench').dataset.panel = tab.dataset.panel; for (const button of document.querySelectorAll('.mobile-tabs button')) button.setAttribute('aria-pressed', String(tab === button)); requestAnimationFrame(() => viewports.forEach(v => v.apply())); });
  $('builder-tab').addEventListener('click', () => showPage('builder')); $('catalog-tab').addEventListener('click', () => showPage('catalog'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && ui.structureOpen && !$('preview-modal').open && matchMedia('(min-width: 1024px) and (max-width: 1559px)').matches && !event.defaultPrevented) setStructure(false); });
}

function boot() {
  let note = '';
  try { const d = localStorage.getItem(deviceKey); if (d && DEVICES[d]) ui.device = d; } catch { /* 저장된 폭 없음 */ }
  ui.device ??= innerWidth < 700 ? 'phone' : innerWidth < 1100 ? 'fit' : 'desktop';
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parse(stored);
      if (parsed.blueprint && validateBlueprint(parsed.blueprint).valid && templates[parsed.sel?.templateId]) { blueprint = parsed.blueprint; Object.assign(sel, {themeVariant: null, layout: {}, paletteChosen: false}, parsed.sel); }
      else note = '저장된 설계가 현재 계약과 맞지 않아 기본 설계를 열었습니다. 저장값은 적용하지 않았습니다.';
    }
  } catch { note = '저장된 설계를 읽지 못해 기본 설계를 열었습니다.'; }
  $('catalog-line').textContent = `테마 ${Object.keys(themes).length} · 팔레트 ${Object.keys(palettes).length} · 템플릿 ${templateList.length} · 부품 ${nodeTypes.length}`;
  $('palette-search').value = '';
  catalogView = renderCatalog({root: $('catalog-body'), tabsEl: $('catalog-tabs'), countsEl: $('catalog-counts'), state: catalogState, actions: {
    useTemplate: id => { showPage('builder'); sel.paletteChosen = false; sel.themeVariant = null; selected = []; sel.templateId = id; sel.layout = {}; commit(createBlueprint(id)); },
    useTheme: (id, variant) => { showPage('builder'); selected = []; sel.themeVariant = variant || null; sel.paletteChosen = false; commit(createBlueprint(sel.templateId, id, undefined, {themeVariant: sel.themeVariant, layout: sel.layout})); },
    usePalette: id => { showPage('builder'); sel.paletteChosen = true; mutate(b => { b.palette = id; }); },
  }});
  renderDevices(); bind();
  $('boot-error').hidden = true; $('workspace').hidden = false;
  viewports.push(mountViewport({stage: $('preview-stage'), shell: $('frame-shell'), frame: $('preview-frame'), getDevice: () => ui.device, onChange: r => { $('zoom-status').textContent = zoomText(r); }}));
  viewports.push(mountViewport({stage: $('modal-stage'), shell: $('modal-shell'), frame: $('modal-frame'), getDevice: () => ui.device, onChange: r => { $('modal-status').textContent = `${blueprint.name} · ${zoomText(r)}`; }}));
  if (matchMedia('(min-width: 1560px)').matches && !localStorage.getItem('winterholic-static-kit.structure-closed')) setStructure(true);
  commit(blueprint, {persist: false});
  $('version').textContent = 'CATALOG ' + CATALOG_VERSION;
  if (note) status(note);
  viewports.forEach(v => v.apply());
  if (location.hash === '#catalog') showPage('catalog');
}
try { boot(); } catch (error) { $('boot-error').hidden = false; $('boot-error').textContent = '조립기를 시작하지 못했습니다: ' + error.message; console.error(error); }
