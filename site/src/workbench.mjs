import {themes, themeCategories, palettes, nodeSpecs, nodeTypes, createBlueprint, repairAxes, templateList, pageTypes, axes, axisDefs, styleAxes, rules, axisBans, CATALOG_VERSION, limits} from './catalog.mjs';
import {compile, validateBlueprint} from './compiler.mjs';
import {escapeHTML as e} from './render.mjs';
const $ = id => document.getElementById(id);
const pretty = x => JSON.stringify(x, null, 2);
const storageKey = 'winterholic-static-kit.blueprint.v2';
let blueprint = createBlueprint('dashboard-overview'), compiled, selected = [], valid = true, templateId = 'dashboard-overview', lastDraft = null;
const getNode = (b, path) => path.reduce((n, index) => n?.children?.[index], b.tree);
const nodeName = n => n?.title ?? n?.label ?? n?.name ?? nodeSpecs[n?.type]?.label ?? '노드';
const swatches = p => `<span class="swatches" aria-label="${p.colors.join(', ')}">${p.colors.map(c => `<i style="background:${c}" aria-hidden="true"></i>`).join('')}</span>`;
const download = (filename, text, type) => { const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], {type})); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); $('save-status').textContent = filename + ' 다운로드를 요청했습니다.'; };

function showError(error) {
  valid = false; $('errors').hidden = false;
  const list = error.errors?.map(x => `${x.path}\n[${x.code}] ${x.message}`).join('\n\n') ?? error.message;
  $('errors-text').textContent = list;
  $('auto-fix').hidden = !error.errors?.some(x => ['AXIS_BAN', 'PAGE_SHELL', 'PAGE_WIDTH', 'NAV_COUNT'].includes(x.code));
  $('valid-status').textContent = '검증 오류 · 마지막 유효 결과를 표시합니다.';
  $('valid-status').style.color = 'var(--app-danger)';
  $('download-html').disabled = true; $('download-json').disabled = true;
}
function save() { try { localStorage.setItem(storageKey, pretty({blueprint, templateId})); $('save-status').textContent = '이 브라우저에 유효한 설계를 저장했습니다.'; } catch { $('save-status').textContent = '브라우저 저장을 사용할 수 없습니다. JSON으로 내려받으세요.'; } }

function renderChoices() {
  const byType = Object.entries(pageTypes).map(([id, p]) => `<optgroup label="${e(p.label)}">${templateList.filter(t => t.pageType === id).map(t => `<option value="${t.id}"${t.id === templateId ? ' selected' : ''}>${e(t.label)}</option>`).join('')}</optgroup>`).join('');
  $('template').innerHTML = byType;
  $('theme').innerHTML = Object.entries(themeCategories).map(([c, label]) => `<optgroup label="${e(label)}">${Object.values(themes).filter(t => t.category === c).map(t => `<option value="${t.id}"${t.id === blueprint.theme ? ' selected' : ''}>${e(t.name)}</option>`).join('')}</optgroup>`).join('');
  const t = themes[blueprint.theme];
  $('theme-description').textContent = t.description;
  $('palette-count').textContent = t.palettes.length + ' CANDIDATES';
  $('palette-options').innerHTML = t.palettes.map(id => { const p = palettes[id], checked = id === blueprint.palette; return `<label class="palette-option"><input type="radio" name="palette" value="${id}" ${checked ? 'checked' : ''}><span class="palette-label"><span>${e(p.name)}</span>${checked ? '<span class="palette-check" aria-hidden="true">✓</span>' : ''}</span>${swatches(p)}</label>`; }).join('');
  $('mode-options').innerHTML = axes.mode.map(m => `<label class="mode-option"><input type="radio" name="mode" value="${m}" ${m === blueprint.mode ? 'checked' : ''}><span>${axisDefs.mode.values[m].split('(')[0].trim()} · ${m}</span></label>`).join('');
  $('axis-controls').innerHTML = styleAxes.map(k => `<div class="field"><label for="axis-${k}">${e(axisDefs[k].label)}</label><select id="axis-${k}" data-axis="${k}">${axes[k].map(v => `<option value="${v}"${v === blueprint[k] ? ' selected' : ''}${(t.forbid[k] ?? []).includes(v) ? ' data-forbidden="true"' : ''}>${v} — ${e(axisDefs[k].values[v])}${(t.forbid[k] ?? []).includes(v) ? ' (테마 금지)' : ''}</option>`).join('')}</select></div>`).join('');
  $('project-name').value = blueprint.name;
  $('page-type').textContent = pageTypes[blueprint.pageType].label + ' · ' + pageTypes[blueprint.pageType].description;
  $('mode').setAttribute('aria-pressed', String(blueprint.mode === 'dark'));
  $('mode').textContent = blueprint.mode === 'dark' ? '라이트 보기' : '다크 보기';
  $('selection-summary').textContent = `${t.name} / ${palettes[blueprint.palette].name}`;
}
function renderTree() {
  if (!getNode(blueprint, selected)) selected = [];
  const isSelected = path => JSON.stringify(path) === JSON.stringify(selected);
  const node = (n, path) => `<li><button type="button" data-path="${path.join(',')}" class="${isSelected(path) ? 'selected' : ''}" aria-pressed="${isSelected(path)}"><span>${n.children ? '▱' : '◇'}</span><span>${e(nodeSpecs[n.type].label)}${n.type !== 'page' ? ' · ' + e(nodeName(n)).slice(0, 40) : ''}</span></button>${n.children ? `<ul>${n.children.map((c, i) => node(c, [...path, i])).join('')}</ul>` : ''}</li>`;
  $('tree').innerHTML = '<ul>' + node(blueprint.tree, []) + '</ul>';
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
  $('add-node').innerHTML = allowed.map(type => `<option value="${type}">${e(nodeSpecs[type].label)} · ${type}</option>`).join('');
  $('add').disabled = !allowed.length;
}
function renderTokens() {
  const p = palettes[blueprint.palette], prov = compiled.manifest.paletteProvenance;
  $('palette-source').href = p.source.url;
  $('palette-adjustment').textContent = `원색 ${prov.brandSeed} → 행동색 ${prov.action} · 보조색 ${prov.accentSeed}. ${prov.adjusted ? '실제 배경과의 대비를 위해 보정했습니다.' : '원색을 그대로 사용합니다.'} 전체 ${compiled.manifest.contrast.length}쌍 검사.`;
  const shown = compiled.tokens[blueprint.mode === 'auto' ? 'light' : blueprint.mode];
  $('tokens').innerHTML = Object.entries(shown).map(([key, color]) => `<div class="token-row"><i style="background:${color}"></i><span>${key}</span><span>${color}</span></div>`).join('');
  const min = Math.min(...compiled.manifest.contrast.filter(x => x.minimum === 4.5).map(x => x.ratio));
  $('contrast-status').textContent = `본문 대비 ≥ ${min.toFixed(2)}:1`;
}
function commit(next, {persist = true} = {}) {
  try {
    const focused = document.activeElement; const radioFocus = focused?.matches('input[type=radio]') ? {name: focused.name, value: focused.value} : null;
    const selectFocus = focused?.matches('select[data-axis]') ? focused.id : null;
    const result = compile(next); blueprint = structuredClone(next); compiled = result; valid = true; lastDraft = null;
    $('errors').hidden = true; $('download-html').disabled = false; $('download-json').disabled = false;
    $('valid-status').style.color = ''; $('valid-status').textContent = '● 트리 검증 통과';
    $('preview-frame').srcdoc = compiled.html;
    renderChoices(); renderTree(); renderTokens();
    if (radioFocus) document.querySelector(`input[name="${radioFocus.name}"][value="${radioFocus.value}"]`)?.focus({preventScroll: true});
    if (selectFocus) $(selectFocus)?.focus({preventScroll: true});
    $('blueprint-editor').value = pretty(blueprint);
    if (persist) save(); return true;
  } catch (error) { lastDraft = structuredClone(next); showError(error); return false; }
}
function mutate(fn) { const next = structuredClone(blueprint); fn(next); return commit(next); }
function parse(text) { if (new TextEncoder().encode(text).length > limits.bytes) throw new Error(`SIZE: 설계는 ${limits.bytes}바이트 이하입니다.`); return JSON.parse(text); }
/** Node factory: catalog examples are the only source of defaults, so "add" can never create an invalid shape. */
function makeNode(type) {
  const spec = nodeSpecs[type];
  if (spec.example) return structuredClone(spec.example);
  const parent = nodeTypes.find(t => nodeSpecs[t].example && nodeSpecs[t].children?.includes(type));
  return parent ? structuredClone(nodeSpecs[parent].example.children?.find(c => c.type === type) ?? null) : null;
}
function renderCatalog() {
  $('catalog-grid').innerHTML = Object.values(themes).map(t => `<article class="catalog-card"><h3>${e(t.name)} <small>${e(themeCategories[t.category])}</small></h3><p>${e(t.description)}</p>${t.palettes.map(id => { const p = palettes[id]; return `${swatches(p)}<div class="palette-caption"><span>${e(p.name)}</span><a href="${p.source.url}" target="_blank" rel="noopener">Coolors ↗</a></div>`; }).join('')}<button class="button secondary" data-choose-theme="${t.id}">이 방향으로 조립</button></article>`).join('');
  $('parts-grid').innerHTML = nodeTypes.map(t => `<li><b>${e(nodeSpecs[t].label)}</b> <code>${t}</code><span>${e(Object.entries(nodeSpecs[t].fields).filter(([, s]) => s.enum && s.enum.length <= 9).map(([k, s]) => `${k}: ${s.enum.join('/')}`).join(' · '))}</span></li>`).join('');
  $('rules-list').innerHTML = rules.map(r => `<li><b>${r.id}</b> ${e(r.intent)}</li>`).join('') + axisBans.map(b => `<li><b>${b.id}</b> ${e(b.why)}</li>`).join('');
  $('catalog-counts').textContent = `${Object.keys(themes).length}개 테마 · ${Object.keys(palettes).length}개 팔레트 · ${templateList.length}개 템플릿 · ${nodeTypes.length}개 부품 · ${Object.keys(pageTypes).length}개 페이지 유형 · ${styleAxes.length + 1}개 축`;
}
function showPage(which) { $('workspace').hidden = which !== 'builder'; $('catalog').hidden = which !== 'catalog'; for (const id of ['builder', 'catalog']) { $(id + '-tab').classList.toggle('active', which === id); $(id + '-tab').setAttribute('aria-pressed', String(which === id)); } }
function bind() {
  $('template').addEventListener('change', event => { selected = []; templateId = event.target.value; commit(createBlueprint(templateId, blueprint.theme)); });
  $('theme').addEventListener('change', event => { selected = []; commit(createBlueprint(templateId, event.target.value)); });
  $('palette-options').addEventListener('change', event => { if (event.target.name === 'palette') mutate(b => { b.palette = event.target.value; }); });
  $('mode-options').addEventListener('change', event => { if (event.target.name === 'mode') mutate(b => { b.mode = event.target.value; }); });
  $('axis-controls').addEventListener('change', event => { const key = event.target.dataset.axis; if (key) mutate(b => { b[key] = event.target.value; }); });
  $('project-name').addEventListener('change', event => mutate(b => { b.name = event.target.value; }));
  $('mode').addEventListener('click', () => mutate(b => { b.mode = b.mode === 'dark' ? 'light' : 'dark'; }));
  $('viewport').addEventListener('click', () => { const mobile = $('preview-frame').classList.toggle('mobile-preview'); $('viewport').setAttribute('aria-pressed', String(mobile)); $('viewport').textContent = mobile ? '너비 맞춤' : '390px 보기'; });
  $('reset').addEventListener('click', () => { selected = []; templateId = 'dashboard-overview'; commit(createBlueprint(templateId)); });
  $('auto-fix').addEventListener('click', () => { if (lastDraft) commit(repairAxes(structuredClone(lastDraft))); });
  $('tree').addEventListener('click', event => { const button = event.target.closest('button[data-path]'); if (!button) return; selected = button.dataset.path ? button.dataset.path.split(',').map(Number) : []; renderTree(); });
  $('apply-node').addEventListener('click', () => { try { const node = parse($('node-editor').value); mutate(b => { if (!selected.length) b.tree = node; else getNode(b, selected.slice(0, -1)).children[selected.at(-1)] = node; }); } catch (error) { showError(error); } });
  $('apply-blueprint').addEventListener('click', () => { try { const next = parse($('blueprint-editor').value); if (commit(next)) selected = []; } catch (error) { showError(error); } });
  $('add').addEventListener('click', () => { const n = getNode(blueprint, selected); mutate(b => { const path = nodeSpecs[n.type].children ? selected : selected.slice(0, -1), parent = getNode(b, path); parent.children.push(makeNode($('add-node').value)); selected = [...path, parent.children.length - 1]; }); });
  $('remove-node').addEventListener('click', () => { const path = [...selected]; if (!path.length || getNode(blueprint, path).type === 'page-header') return; mutate(b => getNode(b, path.slice(0, -1)).children.splice(path.at(-1), 1)); selected = path.slice(0, -1); renderTree(); });
  for (const [id, delta] of [['move-up', -1], ['move-down', 1]]) $(id).addEventListener('click', () => { if ($(id).disabled) return; const index = selected.at(-1); mutate(b => { const items = getNode(b, selected.slice(0, -1)).children;[items[index], items[index + delta]] = [items[index + delta], items[index]]; selected = [...selected.slice(0, -1), index + delta]; }); });
  $('download-json').addEventListener('click', () => { if (valid) download('blueprint.json', pretty(blueprint) + '\n', 'application/json'); });
  $('download-html').addEventListener('click', () => { if (valid) download('static-kit-page.html', compiled.html, 'text/html'); });
  for (const tab of document.querySelectorAll('.mobile-tabs button')) tab.addEventListener('click', () => { document.querySelector('.workbench').dataset.panel = tab.dataset.panel; for (const button of document.querySelectorAll('.mobile-tabs button')) button.setAttribute('aria-pressed', String(tab === button)); });
  $('builder-tab').addEventListener('click', () => showPage('builder')); $('catalog-tab').addEventListener('click', () => showPage('catalog'));
  $('catalog-grid').addEventListener('click', event => { const button = event.target.closest('[data-choose-theme]'); if (!button) return; selected = []; commit(createBlueprint(templateId, button.dataset.chooseTheme)); showPage('builder'); $('workspace').scrollIntoView({block: 'start'}); });
}
try {
  let note = '';
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) { const parsed = parse(stored); if (parsed.blueprint && validateBlueprint(parsed.blueprint).valid) { blueprint = parsed.blueprint; templateId = templateList.some(t => t.id === parsed.templateId) ? parsed.templateId : templateId; } else note = '저장된 설계가 현재 계약과 맞지 않아 기본 설계를 열었습니다. 저장값은 적용하지 않았습니다.'; }
  } catch { note = '저장된 설계를 읽지 못해 기본 설계를 열었습니다.'; }
  renderCatalog(); bind(); commit(blueprint, {persist: false}); $('boot-error').hidden = true; $('workspace').hidden = false; $('version').textContent = 'CATALOG ' + CATALOG_VERSION; if (note) $('save-status').textContent = note;
} catch (error) { $('boot-error').textContent = '조립기를 시작하지 못했습니다: ' + error.message; }
