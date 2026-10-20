import {themes, themeCategories, palettes, paletteFamilies, nodeSpecs, nodeTypes, rules, axisBans, templateList, pageTypes, createBlueprint, layoutSlots, templates, limits} from '../catalog.mjs';
import {compile, validateBlueprint} from '../compiler.mjs';
import {escapeHTML as e} from '../render.mjs';
import {swatches, compactLikes} from './palette-picker.mjs';

const GROUPS = {structure: '구조', layout: '레이아웃', content: '콘텐츠', data: '데이터', form: '폼', feedback: '피드백·상태', media: '미디어', nav: '내비게이션'};
const REP = {work: 'dashboard-overview', brand: 'saas-landing', read: 'article', life: 'product-landing', institution: 'civic-service', app: 'app-landing'};
const representative = theme => (templateList.find(t => t.theme === theme.id) ?? templateList.find(t => t.id === REP[theme.category])).id;

/** 부품 하나를 들어 있는 최소 페이지로 만든다(부품 미리보기용). 만들 수 없는 부품은 null. */
function partBlueprint(type) {
  const spec = nodeSpecs[type];
  let node = spec.example ? structuredClone(spec.example) : null;
  if (!node) { const parent = nodeTypes.find(t => nodeSpecs[t].example && nodeSpecs[t].children?.includes(type)); node = parent ? structuredClone(nodeSpecs[parent].example.children?.find(c => c.type === type) ?? null) : null; }
  if (!node || type === 'page' || type === 'page-header') return null;
  const b = createBlueprint('about-team', 'workspace');
  b.tree = {type: 'page', children: [{type: 'page-header', title: spec.label}, node]};
  b.chrome.nav = b.chrome.nav.slice(0, 2);
  return validateBlueprint(b).valid ? b : null;
}

/** 썸네일: 보이는 순간에만 컴파일해 iframe(srcdoc)으로 넣는다. 1280px 화면을 카드 폭에 맞춰 줄인다. */
export function createThumbs() {
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      const el = entry.target, make = el._make;
      let blueprint; try { blueprint = make(); } catch { blueprint = null; }
      if (!blueprint) { el.classList.add('thumb-empty'); continue; }
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('tabindex', '-1'); frame.setAttribute('aria-hidden', 'true'); frame.loading = 'lazy';
      frame.srcdoc = compile(blueprint).html;
      frame.style.transform = `scale(${(el.clientWidth || 260) / 1280})`;
      el.append(frame);
    }
  }, {rootMargin: '240px'});
  return {observe: (el, make) => { el._make = make; io.observe(el); }, disconnect: () => io.disconnect()};
}

const TABS = [['templates', '템플릿'], ['themes', '테마'], ['palettes', '팔레트'], ['parts', '부품'], ['rules', '규칙']];

export function renderCatalog({root, tabsEl, countsEl, state, actions}) {
  const thumbs = createThumbs();
  countsEl.textContent = `템플릿 ${templateList.length} · 테마 ${Object.keys(themes).length} · 팔레트 ${Object.keys(palettes).length} · 부품 ${nodeTypes.length} · 페이지 유형 ${Object.keys(pageTypes).length}`;
  tabsEl.innerHTML = TABS.map(([id, label]) => `<button type="button" role="tab" id="cat-tab-${id}" aria-controls="catalog-body" aria-checked="false" aria-selected="false" data-tab="${id}">${label}</button>`).join('');
  const draw = () => {
    thumbs.disconnect();
    for (const b of tabsEl.querySelectorAll('button')) { const on = b.dataset.tab === state.tab; b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
    root.setAttribute('aria-labelledby', 'cat-tab-' + state.tab);
    ({templates: drawTemplates, themes: drawThemes, palettes: drawPalettes, parts: drawParts, rules: drawRules})[state.tab]();
  };
  const filters = (items, active, key) => `<div class="catalog-filters chips" role="group" aria-label="분류">${items.map(([id, label]) => `<button type="button" class="chip" data-${key}="${id}" aria-pressed="${id === active}">${e(label)}</button>`).join('')}</div>`;

  function drawTemplates() {
    const types = [['all', '전체'], ...Object.entries(pageTypes).filter(([id]) => templateList.some(t => t.pageType === id)).map(([id, p]) => [id, p.label])];
    root.innerHTML = filters(types, state.templateType, 'type') + `<div class="catalog-grid">${templateList.filter(t => state.templateType === 'all' || t.pageType === state.templateType).map(t => {
      const slots = layoutSlots(t.tree), count = slots.reduce((n, s) => n + s.options.length, 0);
      return `<article class="catalog-card"><div class="thumb" data-template="${t.id}" role="img" aria-label="${e(t.label)} 미리보기"></div><div class="body"><h3>${e(t.label)}</h3><span class="meta">${e(pageTypes[t.pageType].label)} · 기본 테마 ${e(themes[t.theme].name)}</span><p>${count ? `구성 변형 ${slots.length}곳 · 선택지 ${count}개` : '구성 변형 없음'}</p><div class="actions"><button type="button" class="button primary" data-use-template="${t.id}">이 템플릿으로 조립</button></div></div></article>`;
    }).join('')}</div>`;
    root.querySelectorAll('.thumb').forEach(el => thumbs.observe(el, () => createBlueprint(el.dataset.template)));
  }
  function drawThemes() {
    const cats = [['all', '전체'], ...Object.entries(themeCategories)];
    root.innerHTML = filters(cats, state.themeCategory, 'cat') + `<div class="catalog-grid">${Object.values(themes).filter(t => state.themeCategory === 'all' || t.category === state.themeCategory).map(t => `<article class="catalog-card"><div class="thumb" data-theme="${t.id}" role="img" aria-label="${e(t.name)} 미리보기"></div><div class="body"><h3>${e(t.name)}</h3><span class="meta">${e(themeCategories[t.category])} · 변형 ${t.variants.length} · 추천 팔레트 ${t.palettes.length}</span><p>${e(t.description)}</p>${swatches(palettes[t.palettes[0]])}<div class="chips">${t.variants.map(v => `<button type="button" class="chip" data-use-theme="${t.id}" data-variant="${v.id}" title="${e(v.description)}">${e(v.label)}</button>`).join('')}</div><div class="actions"><button type="button" class="button primary" data-use-theme="${t.id}">이 테마로 조립</button></div></div></article>`).join('')}</div>`;
    root.querySelectorAll('.thumb').forEach(el => thumbs.observe(el, () => createBlueprint(representative(themes[el.dataset.theme]), el.dataset.theme)));
  }
  function drawPalettes() {
    const fams = [['all', '전체'], ...Object.entries(paletteFamilies).map(([id, f]) => [id, f.label])];
    const list = Object.values(palettes).filter(p => state.paletteFamily === 'all' || p.family === state.paletteFamily).sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1));
    root.innerHTML = filters(fams, state.paletteFamily, 'fam') + `<div class="catalog-grid">${list.map(p => `<article class="catalog-card"><div class="body"><h3>${e(p.name)}</h3><span class="meta">${e(paletteFamilies[p.family].label)}${p.likes ? ` · ♥ ${compactLikes(p.likes)}` : ''}</span>${swatches(p).replace('<span class="swatches"', '<span class="swatches" style="height:44px"')}<p>${p.colors.join(' · ')}</p><div class="actions"><button type="button" class="button primary" data-use-palette="${p.id}">이 색으로 조립</button><a class="button" href="${p.source.url}" target="_blank" rel="noopener">Coolors ↗</a></div></div></article>`).join('')}</div>`;
  }
  function drawParts() {
    const groups = {}; for (const t of nodeTypes) (groups[nodeSpecs[t].group] ??= []).push(t);
    root.innerHTML = Object.entries(groups).map(([g, list]) => `<h2 class="catalog-sub">${GROUPS[g] ?? g} <small>${list.length}</small></h2><ul class="part-list">${list.map(t => `<li class="catalog-card"><div class="thumb" data-part="${t}" role="img" aria-label="${e(nodeSpecs[t].label)} 미리보기"></div><div class="body"><h3>${e(nodeSpecs[t].label)} <code>${t}</code></h3><p>${e(Object.entries(nodeSpecs[t].fields).filter(([, s]) => s.enum && s.enum.length <= 9).map(([k, s]) => `${k}: ${s.enum.join('/')}`).join(' · ') || '변형 없음')}</p></div></li>`).join('')}</ul>`).join('');
    root.querySelectorAll('.thumb').forEach(el => thumbs.observe(el, () => partBlueprint(el.dataset.part)));
  }
  function drawRules() {
    root.innerHTML = `<ul class="rule-list">${rules.map(r => `<li><b>${r.id}</b>${e(r.intent)}</li>`).join('')}${axisBans.map(b => `<li><b>${b.id}</b>${e(b.why)}</li>`).join('')}</ul><div class="catalog-note"><h3>어디까지 강제하나요?</h3><p>입력 문법·허용 간선·임의 속성·축 조합 금지·페이지 유형 계약·대비·생성 파일 일치를 검사합니다. 카탈로그와 검사기 자체를 수정할 권한까지 차단하지는 않습니다. 새로운 표현이 필요하면 근거와 반례를 남겨 카탈로그를 개정하세요.</p></div>`;
  }

  tabsEl.addEventListener('click', event => { const b = event.target.closest('button[data-tab]'); if (b) { state.tab = b.dataset.tab; draw(); } });
  tabsEl.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    const ids = TABS.map(t => t[0]), i = ids.indexOf(state.tab), next = ids[(i + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
    state.tab = next; draw(); tabsEl.querySelector(`[data-tab="${next}"]`).focus();
  });
  root.addEventListener('click', event => {
    const t = event.target.closest('[data-type],[data-cat],[data-fam],[data-use-template],[data-use-theme],[data-use-palette]'); if (!t) return;
    if (t.dataset.type) { state.templateType = t.dataset.type; draw(); }
    else if (t.dataset.cat) { state.themeCategory = t.dataset.cat; draw(); }
    else if (t.dataset.fam) { state.paletteFamily = t.dataset.fam; draw(); }
    else if (t.dataset.useTemplate) actions.useTemplate(t.dataset.useTemplate);
    else if (t.dataset.useTheme) actions.useTheme(t.dataset.useTheme, t.dataset.variant);
    else if (t.dataset.usePalette) actions.usePalette(t.dataset.usePalette);
  });
  return {draw};
}
