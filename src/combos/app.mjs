import {themes, themeCategories, palettes, paletteFamilies, pageTypes, templateList, concepts, conceptIds, axes, CATALOG_VERSION} from '../catalog.mjs';
import {TYPE} from '../typography.mjs';
import {GRADES_META} from '../combo-grades.mjs';
import {escapeHTML as e} from '../render.mjs';
import {DEVICES, mountViewport} from '../workbench/viewport.mjs';
import {enumerateCombos, findCombo, renderCombo, facets, filterCombos, normalizeView, viewQuery, prettyQuery, viewFromQuery, comboTitle, pad, flagsToText, EMPTY_VIEW} from '../combos.mjs';

const $ = id => document.getElementById(id);
const FLAG_KEY = 'winterholic-static-kit.combo-flags.v1', DEVICE_KEY = 'winterholic-static-kit.combos.device';
const DEFAULT_SIZE = 48;
const fmt = n => n.toLocaleString('en-US');

const all = enumerateCombos();
const slotFacets = facets(all);
const state = {q: '', pt: '', t: '', slots: {}, sort: 'default', seed: 1, same: false, flagged: false, tall: false, exp: false, page: 1, size: DEFAULT_SIZE, view: {...EMPTY_VIEW}, open: null, device: null};
let list = all;

/* ---------- 이상함 표시(localStorage) ---------- */
let flags = [];
try { const raw = JSON.parse(localStorage.getItem(FLAG_KEY) ?? '[]'); if (Array.isArray(raw)) flags = raw.filter(f => f && typeof f.c === 'string'); } catch { flags = []; }
const flagKey = (id, view) => viewQuery(id, view);
const findFlag = (id, view = state.view) => flags.find(f => flagKey(f.c, f) === flagKey(id, view));
const saveFlags = () => { try { localStorage.setItem(FLAG_KEY, JSON.stringify(flags)); } catch { toast('저장하지 못했습니다(저장 공간이 막혀 있을 수 있습니다).'); } $('flag-count').textContent = String(flags.length); };
function toggleFlag(id) {
  const hit = findFlag(id);
  if (hit) flags = flags.filter(f => f !== hit);
  else flags.push({c: id, ...normalizeView(state.view), note: '', at: new Date().toISOString()});
  saveFlags(); return !hit;
}

/* ---------- 알림·복사 ---------- */
let toastTimer = 0;
/** 토스트는 popover(최상위 레이어)라서 전체 화면 <dialog> 위에도 보인다. */
function toast(text) {
  const el = $('toast'); el.textContent = text;
  try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch { el.classList.add('fallback-show'); }
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { try { el.hidePopover(); } catch { /* 이미 닫힘 */ } el.classList.remove('fallback-show'); }, 2200);
}
async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); return; } catch { /* 권한이 없으면 아래 대체 경로 */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove(); toast(ok ? done : '복사하지 못했습니다. 직접 선택해 복사하세요.');
}

/* ---------- URL ↔ 상태 ---------- */
function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get('q') ?? ''; state.pt = pageTypes[p.get('pt')] ? p.get('pt') : ''; state.t = templateList.some(t => t.id === p.get('t')) ? p.get('t') : '';
  state.slots = {};
  for (const part of (p.get('sl') ?? '').split(',')) { const [slot, option] = part.split(':'); const f = slotFacets.find(x => x.id === slot); if (f && (option === 'default' || f.options.some(o => o.id === option))) state.slots[slot] = option; }
  state.sort = ['changed', 'shuffle'].includes(p.get('sort')) ? p.get('sort') : 'default';
  state.seed = Number(p.get('seed')) || 1;
  state.same = p.get('same') === '1'; state.flagged = p.get('flagged') === '1'; state.tall = p.get('tall') === '1'; state.exp = p.get('exp') === '1';
  state.size = [24, 48, 96].includes(Number(p.get('ps'))) ? Number(p.get('ps')) : DEFAULT_SIZE;
  state.page = Math.max(1, Number(p.get('p')) || 1);
  state.view = viewFromQuery(p);
  state.open = findCombo(p.get('c'))?.id ?? null;
}
function buildQuery({withViewer = true} = {}) {
  const p = new URLSearchParams();
  if (withViewer && state.open) p.set('c', state.open);
  const v = normalizeView(state.view); for (const k of ['concept', 'look', 'theme', 'tv', 'pal', 'type', 'mode']) if (v[k]) p.set(k, v[k]);
  if (state.q.trim()) p.set('q', state.q.trim());
  if (state.pt) p.set('pt', state.pt); if (state.t) p.set('t', state.t);
  const sl = Object.entries(state.slots).filter(([, o]) => o).map(([s, o]) => `${s}:${o}`).join(','); if (sl) p.set('sl', sl);
  if (state.sort !== 'default') p.set('sort', state.sort); if (state.sort === 'shuffle') p.set('seed', String(state.seed));
  if (state.same) p.set('same', '1'); if (state.flagged) p.set('flagged', '1'); if (state.tall) p.set('tall', '1'); if (state.exp) p.set('exp', '1');
  if (state.size !== DEFAULT_SIZE) p.set('ps', String(state.size)); if (state.page > 1) p.set('p', String(state.page));
  return prettyQuery(p.toString());
}
const urlFor = opts => location.pathname + (buildQuery(opts) ? '?' + buildQuery(opts) : '');
const writeUrl = () => history.replaceState(history.state, '', urlFor());
/** 이 조합의 공유 주소(필터는 빼고 조합과 보기 설정만). */
const shareUrl = id => `${location.origin}${location.pathname}?${viewQuery(id, state.view)}`;
const rawUrl = id => new URL(`render.html?${viewQuery(id, state.view)}`, location.href).href;

/* ---------- 필터 ---------- */
function refilter({keepPage = false} = {}) {
  const only = state.flagged ? new Set(flags.map(f => f.c)) : null;
  list = filterCombos({query: state.q, pageType: state.pt, template: state.t, slots: state.slots, hideSame: state.same, only, concept: state.view.concept ?? '', experimental: state.exp, sort: state.sort, seed: state.seed}, all);
  const pages = Math.max(1, Math.ceil(list.length / state.size));
  state.page = keepPage ? Math.min(state.page, pages) : 1;
}

function drawFilters() {
  $('q').value = state.q;
  $('f-type').innerHTML = `<option value="">전체 (${Object.keys(pageTypes).length}종)</option>` + Object.entries(pageTypes).filter(([id]) => templateList.some(t => t.pageType === id)).map(([id, p]) => `<option value="${id}">${e(p.label)}</option>`).join('');
  drawTemplateOptions();
  $('f-type').value = state.pt; $('f-sort').value = state.sort; $('f-size').value = String(state.size);
  $('f-same').checked = state.same; $('f-flagged').checked = state.flagged; $('f-tall').checked = state.tall; $('f-exp').checked = state.exp;
  $('f-concept').innerHTML = '<option value="">전체 컨셉 (' + conceptIds.length + '개)</option>' + conceptIds.map(id => '<option value="' + id + '">' + e(concepts[id].label) + ' (' + concepts[id].templates.length + ')</option>').join('');
  $('f-concept').value = normalizeView(state.view).concept ?? '';
  $('slot-filters').innerHTML = slotFacets.map(f => `<label class="tool"><span>${e(f.label)}</span><select data-slot="${f.id}"><option value="">전체</option><option value="default">기본(바꾸지 않음)</option>${f.options.map(o => `<option value="${o.id}">${e(o.label)} (${fmt(o.count)})</option>`).join('')}</select></label>`).join('');
  for (const s of $('slot-filters').querySelectorAll('select')) s.value = state.slots[s.dataset.slot] ?? '';
  syncSummaries();
}
function drawTemplateOptions() {
  const rows = templateList.filter(t => !state.pt || t.pageType === state.pt);
  $('f-template').innerHTML = '<option value="">전체 (' + rows.length + '개)</option>' + rows.map(t => `<option value="${t.id}">${e(t.label)}</option>`).join('');
  $('f-template').value = rows.some(t => t.id === state.t) ? state.t : '';
  if ($('f-template').value !== state.t) state.t = '';
}
function syncSummaries() {
  const n = Object.values(state.slots).filter(Boolean).length;
  $('slot-active').textContent = n ? `${n}개 적용 중` : '';
  const v = normalizeView(state.view);
  $('view-summary').textContent = [v.concept && concepts[v.concept].label + (v.look ? ' · ' + concepts[v.concept].looks.find(l => l.id === v.look).label : ''), v.type && TYPE[v.type].label, v.theme && themes[v.theme].name, v.pal && palettes[v.pal].name, v.mode && (v.mode === 'dark' ? '다크' : '라이트')].filter(Boolean).join(' · ') || '템플릿 기본';
}

/* ---------- 보기 설정(테마·변형·팔레트·모드): 갤러리와 확대 보기가 같은 상태를 공유 ---------- */
function viewControlsHTML(p) {
  const cats = Object.entries(themeCategories).map(([id, label]) => `<optgroup label="${e(label)}">${Object.values(themes).filter(t => t.category === id).map(t => `<option value="${t.id}">${e(t.name)}</option>`).join('')}</optgroup>`).join('');
  const types = axes.typography.map(id => `<option value="${id}">${e(TYPE[id].label)}</option>`).join('');
  return `<label class="tool"><span>컨셉 look</span><select id="${p}-look"></select></label>
<label class="tool"><span>서체</span><select id="${p}-type"><option value="">컨셉·테마 기본</option>${types}</select></label>
<label class="tool"><span>테마</span><select id="${p}-theme"><option value="">템플릿 기본</option>${cats}</select></label>
<label class="tool"><span>테마 변형</span><select id="${p}-tv"></select></label>
<label class="tool"><span>팔레트</span><select id="${p}-pal"></select></label>
<div class="tool"><span>모드</span><div class="seg-group" role="radiogroup" aria-label="모드" id="${p}-mode"><button type="button" role="radio" data-mode="">기본</button><button type="button" role="radio" data-mode="light">라이트</button><button type="button" role="radio" data-mode="dark">다크</button></div></div>
<button type="button" class="text-button" data-view-reset>보기 초기화</button>`;
}
function paletteOptions(themeId) {
  const opt = p => `<option value="${p.id}">${e(p.name)}</option>`;
  const rec = themeId ? themes[themeId].palettes.map(id => palettes[id]) : [];
  const recIds = new Set(rec.map(p => p.id));
  const fam = Object.entries(paletteFamilies).map(([id, f]) => `<optgroup label="${e(f.label)}">${Object.values(palettes).filter(p => p.family === id && !recIds.has(p.id)).sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1)).map(opt).join('')}</optgroup>`).join('');
  return `<option value="">${themeId ? '테마 첫 추천색' : '템플릿 기본'}</option>${rec.length ? `<optgroup label="이 테마 추천">${rec.map(opt).join('')}</optgroup>` : ''}${fam}`;
}
let lastPaletteTheme;
function syncViewControls() {
  const v = normalizeView(state.view);
  for (const p of ['g', 'v']) {
    $(p + '-theme').value = v.theme ?? '';
    const lk = $(p + '-look'); lk.disabled = !v.concept;
    lk.innerHTML = v.concept ? '<option value="">첫 번째 look</option>' + concepts[v.concept].looks.map(l => `<option value="${l.id}">${e(l.label)}</option>`).join('') : '<option value="">(컨셉을 먼저)</option>';
    lk.value = v.look ?? ''; $(p + '-type').value = v.type ?? '';
    const tv = $(p + '-tv'); tv.disabled = !v.theme;
    tv.innerHTML = v.theme ? '<option value="">테마 기본 결</option>' + themes[v.theme].variants.map(x => `<option value="${x.id}">${e(x.label)}</option>`).join('') : '<option value="">(테마를 먼저)</option>';
    tv.value = v.tv ?? '';
    if (lastPaletteTheme !== (v.theme ?? '') || !$(p + '-pal').options.length) $(p + '-pal').innerHTML = paletteOptions(v.theme);
    $(p + '-pal').value = v.pal ?? '';
    for (const b of $(p + '-mode').querySelectorAll('button')) b.setAttribute('aria-checked', String((b.dataset.mode || '') === (v.mode ?? '')));
  }
  lastPaletteTheme = v.theme ?? '';
  syncSummaries();
}
function bindViewControls(p) {
  const set = patch => { state.view = normalizeView({...state.view, ...patch}); viewChanged(); };
  $(p + '-look').addEventListener('change', ev => set({look: ev.target.value || null}));
  $(p + '-type').addEventListener('change', ev => set({type: ev.target.value || null}));
  $(p + '-theme').addEventListener('change', ev => set({theme: ev.target.value || null, tv: null}));
  $(p + '-tv').addEventListener('change', ev => set({tv: ev.target.value || null}));
  $(p + '-pal').addEventListener('change', ev => set({pal: ev.target.value || null}));
  $(p + '-mode').addEventListener('click', ev => { const b = ev.target.closest('button[data-mode]'); if (b) set({mode: b.dataset.mode || null}); });
  $(p + '-theme').closest('.view-controls').querySelector('[data-view-reset]').addEventListener('click', () => { state.view = {...EMPTY_VIEW}; viewChanged(); });
}
function viewChanged() {
  syncViewControls(); $('f-concept').value = normalizeView(state.view).concept ?? ''; refilter(); writeUrl();
  drawGrid({keepScroll: true});
  if (state.open) renderViewer();
}

/* ---------- 썸네일: 보이는 것만, 하나씩, 동시 iframe 수 제한 ---------- */
const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const MAX_LIVE = coarse ? 8 : 24;
const thumbs = (() => {
  const live = new Map(), queue = [];
  let busy = false;
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      const el = en.target;
      if (en.isIntersecting) { if (!live.has(el) && !queue.includes(el)) queue.push(el); }
      else { release(el); const i = queue.indexOf(el); if (i >= 0) queue.splice(i, 1); }
    }
    pump();
  }, {rootMargin: '300px 0px'});
  function release(el) { const f = live.get(el); if (!f) return; f.remove(); live.delete(el); el.classList.remove('loaded'); }
  function pump() {
    if (busy || !queue.length || live.size >= MAX_LIVE) return;
    const el = queue.shift(); busy = true;
    const combo = findCombo(el.dataset.id), result = combo && renderCombo(combo, state.view);
    if (!result?.ok) { el.classList.add('failed'); el.querySelector('.ph').textContent = result?.error ?? '조합을 찾지 못함'; busy = false; return pump(); }
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts'); // 스크립트는 지우고 넣지만, 빈 sandbox는 Playwright 트레이스 스냅샷이 콘솔 오류를 내서 allow-scripts를 둔다(출처는 격리됨)
    frame.setAttribute('tabindex', '-1'); frame.setAttribute('aria-hidden', 'true'); frame.setAttribute('scrolling', 'no'); frame.title = '';
    let done = false; const next = () => { if (done) return; done = true; busy = false; el.classList.add('loaded'); pump(); };
    frame.addEventListener('load', next); setTimeout(next, 700);
    frame.srcdoc = result.html.replace(/<script>[\s\S]*?<\/script>/g, ''); live.set(el, frame); el.prepend(frame);
  }
  return {
    observe: el => io.observe(el),
    reset() { io.disconnect(); queue.length = 0; for (const el of [...live.keys()]) release(el); busy = false; },
    get live() { return live.size; },
  };
})();
function setThumbScale() {
  const first = $('grid').querySelector('.combo-thumb'); if (!first) return;
  $('grid').style.setProperty('--ts', String(first.clientWidth / 1280));
}

/* ---------- 목록 그리기 ---------- */
const badges = c => [c.sameAs && `<span class="badge" title="앞 조합과 같은 화면입니다(앞 슬롯의 변경이 뒤 슬롯의 조건을 없앰)">#${pad(c.sameAs)}과 같은 화면</span>`, c.changed >= 3 && `<span class="badge hot">${c.changed}곳 변경</span>`, c.experimental && `<span class="badge exp" title="진단에서 A 등급이 아니었습니다: ${e(c.experimental)}">실험</span>`].filter(Boolean).join('');
function cardHTML(c) {
  const flagged = !!findFlag(c.id);
  return `<article class="combo-card" data-id="${c.id}">
  <div class="combo-thumb" data-id="${c.id}"><span class="ph" aria-hidden="true">${e(c.template)}</span><button type="button" class="thumb-hit" data-open="${c.id}" aria-label="#${pad(c.n)} ${e(c.template)} ${e(comboTitle(c))} 크게 보기"></button></div>
  <div class="combo-body">
    <div class="combo-line"><span class="num">#${pad(c.n)}</span><h3>${e(c.template)}</h3></div>
    <p class="combo-sub">${e(comboTitle(c))}</p>
    <div class="combo-badges">${badges(c)}</div>
    <div class="combo-actions"><button type="button" class="chip-button" data-copy="${c.id}" title="${e(c.id)}">ID 복사</button><button type="button" class="chip-button flag-button" data-flag="${c.id}" aria-pressed="${flagged}">⚑ 이상함</button></div>
  </div></article>`;
}
function drawGrid({keepScroll = false} = {}) {
  const pages = Math.max(1, Math.ceil(list.length / state.size));
  state.page = Math.min(Math.max(1, state.page), pages);
  const slice = list.slice((state.page - 1) * state.size, state.page * state.size);
  thumbs.reset(); $('grid').dataset.tall = String(state.tall);
  const y = scrollY;
  $('grid').innerHTML = slice.length ? slice.map(cardHTML).join('') : '<p class="empty">조건에 맞는 조합이 없습니다. 필터를 줄여 보세요.</p>';
  setThumbScale();
  for (const el of $('grid').querySelectorAll('.combo-thumb')) thumbs.observe(el);
  $('result-line').textContent = `전체 ${fmt(all.length)}개 중 ${fmt(list.length)}개 · ${state.page} / ${fmt(pages)}쪽${list.length ? ` (#${pad(slice[0].n)}부터)` : ''}`;
  for (const id of ['pager-top', 'pager-bottom']) $(id).innerHTML = pagerHTML(pages);
  if (keepScroll) scrollTo(0, y);
}
function pagerHTML(pages) {
  const p = state.page, b = (label, to, off, aria) => `<button type="button" class="chip-button" data-page="${to}" ${off ? 'disabled' : ''} aria-label="${aria}">${label}</button>`;
  return b('«', 1, p === 1, '첫 쪽') + b('‹', p - 1, p === 1, '이전 쪽') + `<label class="page-jump"><span class="sr-only">쪽 번호</span><input type="number" min="1" max="${pages}" value="${p}" inputmode="numeric" data-page-input> / ${fmt(pages)}</label>` + b('›', p + 1, p === pages, '다음 쪽') + b('»', pages, p === pages, '마지막 쪽');
}
function goPage(n, {scroll = true} = {}) { state.page = n; drawGrid(); writeUrl(); if (scroll) $('result-line').scrollIntoView({block: 'start'}); }
function applyFilters({keepPage = false} = {}) { refilter({keepPage}); syncSummaries(); drawGrid(); writeUrl(); }

/* ---------- 확대 보기 ---------- */
const viewer = $('viewer');
let viewerPort = null;
const BRIDGE = `<script>(function(){var p=function(d){parent.postMessage({kitCombo:d},'*')};
addEventListener('keydown',function(e){if(e.altKey||e.ctrlKey||e.metaKey)return;var t=e.target;if(t&&(/INPUT|TEXTAREA|SELECT/.test(t.tagName)||t.isContentEditable))return;if(e.key==='ArrowLeft')p('prev');else if(e.key==='ArrowRight')p('next');});
var s=null;function scrollable(n){for(;n&&n.nodeType===1;n=n.parentElement){var o=getComputedStyle(n).overflowX;if((o==='auto'||o==='scroll')&&n.scrollWidth>n.clientWidth+1)return true}return false}
addEventListener('touchstart',function(e){if(e.touches.length!==1){s=null;return}var t=e.touches[0];s={x:t.clientX,y:t.clientY,t:Date.now(),h:scrollable(e.target)}},{passive:true});
addEventListener('touchend',function(e){var t=e.changedTouches[0];if(!s||s.h||!t)return;var dx=t.clientX-s.x,dy=t.clientY-s.y;if(Math.abs(dx)>innerWidth*.22&&Math.abs(dy)<Math.abs(dx)*.4&&Date.now()-s.t<700)p(dx<0?'next':'prev');s=null},{passive:true});})();</script>`;
const withBridge = html => html.includes('</body>') ? html.replace('</body>', BRIDGE + '</body>') : html + BRIDGE;

function deviceButtons() { return Object.entries(DEVICES).map(([id, d]) => `<button type="button" role="radio" aria-checked="${state.device === id}" data-device="${id}">${d.label}${d.width ? ` <small>${d.width}</small>` : ''}</button>`).join(''); }
/** iframe의 srcdoc을 바꾸면 브라우저가 iframe 안 이동을 세션 기록에 쌓아 뒤로 가기가 미리보기 안에서 맴돈다. 새 iframe으로 갈아 끼우면 쌓이지 않는다. */
function loadViewerFrame(html) {
  const frame = document.createElement('iframe');
  frame.id = 'v-frame'; frame.title = '조합 미리보기'; frame.setAttribute('sandbox', 'allow-scripts allow-forms'); frame.srcdoc = html;
  $('v-frame').replaceWith(frame);
}
function renderViewer() {
  const combo = findCombo(state.open); if (!combo) return;
  const result = renderCombo(combo, state.view);
  const pos = list.findIndex(c => c.id === combo.id);
  $('viewer-title').textContent = `#${pad(combo.n)} ${combo.template} · ${comboTitle(combo)}`;
  $('v-pos').textContent = `${fmt(combo.n)} / ${fmt(all.length)}${pos >= 0 && list.length !== all.length ? ` · 필터 ${fmt(pos + 1)}/${fmt(list.length)}` : ''}`;
  loadViewerFrame(result.ok ? withBridge(result.html) : `<p style="font:14px system-ui;padding:16px">조합을 만들지 못했습니다: ${e(result.error)}</p>`);
  const flag = findFlag(combo.id);
  $('v-flag').setAttribute('aria-pressed', String(!!flag)); $('note-field').hidden = !flag; $('v-note').value = flag?.note ?? '';
  $('v-devices').innerHTML = deviceButtons();
  const status = [result.ok ? null : '렌더 실패: ' + result.error, ...(result.notes ?? []), combo.sameAs ? `#${pad(combo.sameAs)}과 같은 화면` : null, combo.experimental ? '실험 구성: ' + combo.experimental : null, combo.id].filter(Boolean);
  $('v-status').dataset.base = status.join(' · '); $('v-status').textContent = status.join(' · ');
  viewerPort?.apply();
}
function step(dir) {
  const pool = list.some(c => c.id === state.open) ? list : all, i = pool.findIndex(c => c.id === state.open);
  const next = pool[(i + dir + pool.length) % pool.length]; if (!next) return;
  state.open = next.id; writeUrl(); renderViewer();
}
function openViewer(id) {
  if (!findCombo(id)) return;
  const was = viewer.open; state.open = id;
  // 열 때 기록을 하나 쌓아 두면 폰의 뒤로 가기가 확대 보기만 닫는다.
  if (!was) { history.pushState({viewer: true}, '', urlFor()); viewer.showModal(); } else writeUrl();
  renderViewer(); viewerPort?.apply();
  if (!was) $('v-close').focus({preventScroll: true});
}
const closeViewer = () => { if (viewer.open) viewer.close(); };
const randomOf = pool => pool[Math.floor(Math.random() * pool.length)];

function bindViewer() {
  $('v-prev').addEventListener('click', () => step(-1)); $('v-next').addEventListener('click', () => step(1));
  $('v-close').addEventListener('click', closeViewer);
  $('v-random').addEventListener('click', () => { const c = randomOf(list.length ? list : all); state.open = c.id; writeUrl(); renderViewer(); });
  $('v-flag').addEventListener('click', () => { const on = toggleFlag(state.open); toast(on ? '이상함으로 표시했습니다.' : '표시를 지웠습니다.'); renderViewer(); drawGrid({keepScroll: true}); if (state.flagged) applyFilters({keepPage: true}); });
  $('v-note').addEventListener('input', ev => { const f = findFlag(state.open); if (f) { f.note = ev.target.value.slice(0, 200); saveFlags(); } });
  $('v-copy-id').addEventListener('click', () => copy(state.open, 'ID를 복사했습니다: ' + state.open));
  $('v-copy-link').addEventListener('click', () => copy(shareUrl(state.open), '링크를 복사했습니다.'));
  $('v-window').addEventListener('click', () => { const w = window.open(rawUrl(state.open), '_blank', 'noopener'); if (!w) toast('새 창이 막혔습니다. 주소 표시줄의 팝업 허용을 확인하세요.'); });
  $('v-settings').addEventListener('click', () => { const on = $('viewer-tools').classList.toggle('open'); $('v-settings').setAttribute('aria-pressed', String(on)); viewerPort?.apply(); });
  $('v-devices').addEventListener('click', ev => { const b = ev.target.closest('[data-device]'); if (!b) return; state.device = b.dataset.device; try { localStorage.setItem(DEVICE_KEY, state.device); } catch { /* 저장 안 함 */ } $('v-devices').innerHTML = deviceButtons(); viewerPort.apply(); });
  viewer.addEventListener('close', () => { loadViewerFrame(''); state.open = null; if (history.state?.viewer) history.back(); else writeUrl(); });
  viewer.addEventListener('click', ev => { if (ev.target === viewer) closeViewer(); });
  // 키보드: 확대 보기가 열려 있고 입력 요소에 포커스가 없을 때만 좌우 이동
  document.addEventListener('keydown', ev => {
    if (!viewer.open || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); } else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
  });
  // iframe 안(키보드·스와이프)에서 온 이동 요청
  addEventListener('message', ev => {
    if (ev.source !== $('v-frame').contentWindow || !viewer.open) return;
    const d = ev.data?.kitCombo; if (d === 'prev') step(-1); else if (d === 'next') step(1);
  });
  // 막대 위 스와이프(iframe 밖). 폰에서 내용을 가로로 밀지 않고도 넘길 수 있다.
  let sx = null, sy = 0, st = 0;
  for (const el of [$('viewer-bar'), $('v-status')]) {
    el.addEventListener('touchstart', ev => { if (ev.touches.length === 1 && !ev.target.closest('input,select,textarea')) { sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; st = Date.now(); } else sx = null; }, {passive: true});
    el.addEventListener('touchend', ev => { if (sx == null) return; const t = ev.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null; if (Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) * .5 && Date.now() - st < 700) step(dx < 0 ? 1 : -1); }, {passive: true});
  }
  viewerPort = mountViewport({stage: $('v-stage'), shell: $('v-shell'), frame: $('v-frame'), getDevice: () => state.device, onChange: r => { const base = $('v-status').dataset.base ?? ''; $('v-status').textContent = `${base}${base ? ' · ' : ''}${r.device === 'fit' ? '맞춤' : DEVICES[r.device].label} ${Math.round(r.scale * 100)}%`; }});
}

/* ---------- 이상함 목록 대화상자 ---------- */
function drawFlags() {
  $('flag-count').textContent = String(flags.length);
  $('flags-list').innerHTML = flags.length ? flags.map((f, i) => {
    const c = findCombo(f.c), v = normalizeView(f);
    const view = [v.theme && themes[v.theme].name, v.pal && palettes[v.pal].name, v.mode && (v.mode === 'dark' ? '다크' : '라이트')].filter(Boolean).join(' · ') || '기본 테마·팔레트';
    return `<li><div><b>${c ? '#' + pad(c.n) + ' ' + e(c.template) : e(f.c)}</b><span>${c ? e(comboTitle(c)) : '목록에 없는 id'} · ${e(view)}</span>${f.note ? `<em>${e(f.note)}</em>` : ''}</div><div class="row"><button type="button" class="chip-button" data-flag-open="${i}">열기</button><button type="button" class="chip-button" data-flag-del="${i}" aria-label="삭제">삭제</button></div></li>`;
  }).join('') : '<li class="empty">아직 표시한 조합이 없습니다. 목록 카드나 확대 보기에서 “⚑ 이상함”을 눌러 보세요.</li>';
}
function bindFlags() {
  const dlg = $('flags-dialog');
  $('open-flags').addEventListener('click', () => { drawFlags(); $('flags-clear').textContent = '모두 지우기'; dlg.showModal(); });
  $('flags-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
  const text = () => flagsToText(flags, {origin: location.origin + location.pathname.replace(/combos\/(index\.html)?$/, ''), catalogVersion: CATALOG_VERSION});
  $('flags-copy').addEventListener('click', () => flags.length ? copy(text(), `${flags.length}건을 글로 복사했습니다.`) : toast('표시한 조합이 없습니다.'));
  $('flags-download').addEventListener('click', () => {
    if (!flags.length) return toast('표시한 조합이 없습니다.');
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text()], {type: 'text/plain;charset=utf-8'}));
    a.href = url; a.download = 'odd-combos.txt'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('flags-filter').addEventListener('click', () => { dlg.close(); state.flagged = true; $('f-flagged').checked = true; applyFilters(); });
  $('flags-clear').addEventListener('click', ev => {
    if (!flags.length) return;
    if (ev.target.dataset.armed !== '1') { ev.target.dataset.armed = '1'; ev.target.textContent = '정말 모두 지우기'; return; }
    ev.target.dataset.armed = ''; ev.target.textContent = '모두 지우기'; flags = []; saveFlags(); drawFlags(); if (state.flagged) applyFilters(); else drawGrid({keepScroll: true});
  });
  $('flags-list').addEventListener('click', ev => {
    const open = ev.target.closest('[data-flag-open]'), del = ev.target.closest('[data-flag-del]');
    if (open) { const f = flags[Number(open.dataset.flagOpen)]; if (!f) return; state.view = normalizeView(f); syncViewControls(); dlg.close(); drawGrid({keepScroll: true}); openViewer(f.c); }
    else if (del) { flags.splice(Number(del.dataset.flagDel), 1); saveFlags(); drawFlags(); if (state.flagged) applyFilters({keepPage: true}); else drawGrid({keepScroll: true}); }
  });
}

/* ---------- 필터 UI 이벤트 ---------- */
function bindFilters() {
  let timer = 0;
  $('q').addEventListener('input', ev => { state.q = ev.target.value; clearTimeout(timer); timer = setTimeout(() => applyFilters(), 180); });
  $('f-type').addEventListener('change', ev => { state.pt = ev.target.value; drawTemplateOptions(); applyFilters(); });
  $('f-template').addEventListener('change', ev => { state.t = ev.target.value; applyFilters(); });
  $('f-sort').addEventListener('change', ev => { state.sort = ev.target.value; if (state.sort === 'shuffle') state.seed = 1 + Math.floor(Math.random() * 1e6); applyFilters(); });
  $('f-size').addEventListener('change', ev => { state.size = Number(ev.target.value); applyFilters({keepPage: true}); });
  $('f-same').addEventListener('change', ev => { state.same = ev.target.checked; applyFilters(); });
  $('f-flagged').addEventListener('change', ev => { state.flagged = ev.target.checked; applyFilters(); });
  $('f-exp').addEventListener('change', ev => { state.exp = ev.target.checked; applyFilters(); });
  $('f-concept').addEventListener('change', ev => { state.view = normalizeView({...state.view, concept: ev.target.value || null, look: null}); viewChanged(); });
  $('f-tall').addEventListener('change', ev => { state.tall = ev.target.checked; writeUrl(); drawGrid({keepScroll: true}); });
  $('slot-filters').addEventListener('change', ev => { const s = ev.target.closest('select[data-slot]'); if (!s) return; if (s.value) state.slots[s.dataset.slot] = s.value; else delete state.slots[s.dataset.slot]; applyFilters(); });
  $('clear-filters').addEventListener('click', () => { Object.assign(state, {q: '', pt: '', t: '', slots: {}, sort: 'default', same: false, flagged: false, tall: false}); state.view = normalizeView({...state.view, concept: null, look: null}); syncViewControls(); drawFilters(); applyFilters(); });
  $('random-any').addEventListener('click', () => openViewer(randomOf(list.length ? list : all).id));
  for (const id of ['pager-top', 'pager-bottom']) {
    $(id).addEventListener('click', ev => { const b = ev.target.closest('[data-page]'); if (b && !b.disabled) goPage(Number(b.dataset.page)); });
    $(id).addEventListener('change', ev => { if (ev.target.matches('[data-page-input]')) goPage(Math.max(1, Number(ev.target.value) || 1)); });
  }
  $('grid').addEventListener('click', ev => {
    const open = ev.target.closest('[data-open]'), cp = ev.target.closest('[data-copy]'), fl = ev.target.closest('[data-flag]');
    if (open) openViewer(open.dataset.open);
    else if (cp) copy(cp.dataset.copy, 'ID를 복사했습니다: ' + cp.dataset.copy);
    else if (fl) { const on = toggleFlag(fl.dataset.flag); fl.setAttribute('aria-pressed', String(on)); toast(on ? '이상함으로 표시했습니다.' : '표시를 지웠습니다.'); if (state.flagged && !on) applyFilters({keepPage: true}); }
  });
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setThumbScale, 120); });
  addEventListener('popstate', () => {
    const wasOpen = viewer.open; readUrl(); syncViewControls(); drawFilters(); refilter({keepPage: true});
    if (state.open) { if (!wasOpen) viewer.showModal(); renderViewer(); } else if (wasOpen) viewer.close();
    drawGrid({keepScroll: true});
  });
}

function boot() {
  readUrl();
  try { const d = localStorage.getItem(DEVICE_KEY); if (d && DEVICES[d]) state.device = d; } catch { /* 저장된 폭 없음 */ }
  state.device ??= innerWidth < 700 ? 'fit' : 'desktop';
  $('total-count').textContent = fmt(all.length);
  const slots = slotFacets.length, options = slotFacets.reduce((n, f) => n + f.options.length, 0), same = all.filter(c => c.sameAs).length;
  const exp = all.filter(c => c.experimental).length;
  $('head-line').textContent = `템플릿 ${templateList.length}개 × 구성 변형(${slots}종 슬롯, 선택지 ${options}개)의 곱이고, 컨셉 ${conceptIds.length}개가 템플릿과 시각 언어(테마·서체)를 묶습니다. 파일로 만들어 두지 않고 브라우저에서 그 자리에서 컴파일합니다. 진단에서 A 등급이 아니었던 ${fmt(exp)}개는 “실험”으로 표시하고 기본으로 숨깁니다(${GRADES_META.date ?? '진단 전'} 기준). ${same ? fmt(same) + '개는 앞 조합과 결과 화면이 같습니다.' : ''}`;
  $('exp-count').textContent = '(' + fmt(exp) + ')';
  $('version').textContent = 'CATALOG ' + CATALOG_VERSION;
  $('view-gallery').innerHTML = viewControlsHTML('g'); $('view-viewer').innerHTML = viewControlsHTML('v');
  bindViewControls('g'); bindViewControls('v'); syncViewControls();
  drawFilters(); bindFilters(); bindViewer(); bindFlags();
  $('flag-count').textContent = String(flags.length);
  refilter({keepPage: true});
  $('boot-error').hidden = true; $('app').hidden = false;
  drawGrid();
  // 주소에 조합이 있으면(공유 링크) 목록 주소를 먼저 남기고 그 위에 확대 보기를 쌓는다.
  const first = state.open; state.open = null; writeUrl(); if (first) openViewer(first);
  viewerPort.apply();
  document.documentElement.dataset.ready = 'true';
}
try { boot(); } catch (error) { $('boot-error').hidden = false; $('boot-error').textContent = '전체 조합을 시작하지 못했습니다: ' + error.message; console.error(error); }
