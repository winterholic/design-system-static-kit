import {bundleSource} from './bundle.mjs';

const CSS = `
:root{--bg:#f4f6f8;--fg:#121820;--mut:#56606d;--card:#fff;--line:#d9dee4;--brand:#0a5a8a;--on:#fff;--soft:#e8f1f7;color-scheme:light dark}
@media(prefers-color-scheme:dark){:root{--bg:#10151c;--fg:#eef2f6;--mut:#a9b4c2;--card:#18202a;--line:#2d3744;--brand:#6bb8e8;--on:#0b1620;--soft:#1d2a38}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
header.top{padding:20px 16px 8px}header.top h1{margin:0;font-size:22px;letter-spacing:-.02em}header.top p{margin:6px 0 0;color:var(--mut);font-size:13px}
.counts{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0;list-style:none}.counts li{background:var(--soft);border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}
nav.tabs{position:sticky;top:0;z-index:5;display:flex;gap:2px;background:var(--bg);border-bottom:1px solid var(--line);padding:6px 8px;overflow-x:auto}
nav.tabs button{flex:none;min-height:44px;padding:0 14px;border:0;background:transparent;color:var(--mut);font:inherit;font-weight:700;border-radius:10px}nav.tabs button[aria-selected=true]{background:var(--brand);color:var(--on)}
main{padding:12px 12px 80px;max-width:1100px;margin:0 auto}.chips{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 12px}.chips button{min-height:36px;padding:0 12px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:999px;font:inherit;font-size:13px}.chips button[aria-pressed=true]{background:var(--brand);color:var(--on);border-color:var(--brand)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;text-align:left;padding:0;color:inherit;font:inherit;cursor:pointer}
.card:focus-visible,button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--brand);outline-offset:2px}.thumb{position:relative;height:150px;overflow:hidden;background:var(--soft);pointer-events:none}.thumb iframe{position:absolute;left:0;top:0;border:0;width:1280px;height:750px;transform-origin:0 0;background:#fff}.card .meta{padding:10px 12px}.card b{display:block;font-size:14px}.card span{color:var(--mut);font-size:12px}
.themecard{padding:14px;gap:8px}.sw{display:flex;gap:4px;flex-wrap:wrap}.sw i{display:flex;height:18px;border-radius:5px;overflow:hidden;width:92px;border:1px solid var(--line)}.sw i u{flex:1}.sw button{padding:0;border:0;background:none;cursor:pointer}.tags{display:flex;flex-wrap:wrap;gap:4px}.tags em{font-style:normal;font-size:11px;background:var(--soft);border-radius:6px;padding:1px 7px}
h2.sec{font-size:16px;margin:20px 0 8px}.list{display:grid;gap:8px}.row{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.row b{display:block}.row p{margin:2px 0 0;color:var(--mut);font-size:13px}.pill{display:inline-block;margin:3px 4px 0 0;padding:6px 12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:999px;font:inherit;font-size:13px;cursor:pointer}
#viewer{position:fixed;inset:0;z-index:20;background:var(--bg);display:none;flex-direction:column}#viewer.open{display:flex}.vbar{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line);background:var(--card)}.vbar b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.vbar button{min-height:44px;min-width:44px;padding:0 12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;font:inherit;font-weight:700}
.stage{flex:1;position:relative;overflow:hidden;background:#888}.stage iframe{border:0;background:#fff;width:100%;height:100%;display:block}.stage.wide iframe{width:1280px;transform-origin:0 0}
#panel{display:none;max-height:58vh;overflow:auto;padding:12px;background:var(--card);border-top:1px solid var(--line)}#panel.open{display:block}.field{display:grid;gap:3px;margin-bottom:10px}.field label{font-size:12px;color:var(--mut);font-weight:700}.field select{min-height:44px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);font:inherit;padding:0 10px;width:100%}.two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.modes{display:flex;gap:6px}.modes button{flex:1;min-height:44px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;font:inherit}.modes button[aria-pressed=true]{background:var(--brand);color:var(--on);border-color:var(--brand)}
#errs{display:none;margin:0 0 10px;padding:10px 12px;border-radius:10px;background:#fde8ea;color:#7a1220;font-size:13px;white-space:pre-wrap}#errs.open{display:block}#errs button{margin-top:8px;min-height:40px;padding:0 14px;border:0;border-radius:8px;background:#7a1220;color:#fff;font:inherit;font-weight:700}
.axgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.note{color:var(--mut);font-size:12px;margin:6px 0}
`;

const JS = String.raw`
const K = window.StaticKit, $ = (s, r = document) => r.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const themes = Object.values(K.themes), tpls = K.templateList, THEME_LABEL = Object.fromEntries(themes.map(t => [t.id, t.name]));
const REP = {work: 'dashboard-overview', brand: 'saas-landing', read: 'article', life: 'product-landing', institution: 'civic-service', app: 'app-landing'};
const repOf = t => (tpls.find(x => x.theme === t.id) ?? tpls.find(x => x.id === REP[t.category])).id;
const strip = p => '<i>' + K.palettes[p].colors.map(c => '<u style="background:' + c + '"></u>').join('') + '</i>';
let bp = null, lastHtml = '', tplId = 'saas-landing';

function preview(b) { const r = K.validateBlueprint(b); if (!r.valid) return {errors: r.errors}; return {html: K.compile(b).html}; }
function thumb(el, tpl) {
  const b = K.createBlueprint(tpl.id), p = preview(b); if (!p.html) return;
  const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts'); f.setAttribute('tabindex', '-1'); f.title = tpl.label + ' 미리보기'; f.srcdoc = p.html;
  const w = el.clientWidth || 200; f.style.transform = 'scale(' + (w / 1280) + ')'; el.appendChild(f);
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); thumb(e.target, tpls[+e.target.dataset.i]); } }), {rootMargin: '300px'});

function renderTemplates() {
  const types = ['전체', ...new Set(tpls.map(t => K.pageTypes[t.pageType].label))];
  let cur = '전체';
  const root = $('#tab-templates');
  const draw = () => {
    root.innerHTML = '<div class="chips" role="group" aria-label="페이지 유형">' + types.map(t => '<button type="button" aria-pressed="' + (t === cur) + '">' + esc(t) + '</button>').join('') + '</div><div class="grid">' + tpls.map((t, i) => (cur === '전체' || K.pageTypes[t.pageType].label === cur) ? '<button type="button" class="card" data-t="' + t.id + '"><div class="thumb" data-i="' + i + '"></div><div class="meta"><b>' + esc(t.label) + '</b><span>' + esc(K.pageTypes[t.pageType].label) + ' · ' + esc(THEME_LABEL[t.theme]) + '</span></div></button>' : '').join('') + '</div>';
    root.querySelectorAll('.thumb').forEach(el => io.observe(el));
    root.querySelectorAll('.chips button').forEach(b => b.onclick = () => { cur = b.textContent; draw(); });
    root.querySelectorAll('.card').forEach(b => b.onclick = () => openViewer(b.dataset.t));
  };
  draw();
}
function renderThemes() {
  const cats = K.themeCategories, root = $('#tab-themes');
  root.innerHTML = Object.entries(cats).map(([c, label]) => '<h2 class="sec">' + esc(label) + '</h2><div class="grid">' + themes.filter(t => t.category === c).map(t => '<div class="card themecard"><b>' + esc(t.name) + ' <span>' + t.id + '</span></b><span>' + esc(t.description) + '</span><div class="sw">' + t.palettes.map(p => '<button type="button" data-t="' + t.id + '" data-p="' + p + '" aria-label="' + esc(K.palettes[p].name) + ' 팔레트로 보기">' + strip(p) + '</button>').join('') + '</div><div class="tags">' + ['shell', 'typography', 'density', 'radius', 'elevation', 'mode'].map(k => '<em>' + t.defaults[k] + '</em>').join('') + '</div></div>').join('') + '</div>').join('');
  root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => openViewer(repOf(K.themes[b.dataset.t]), b.dataset.t, b.dataset.p));
}
function renderParts() {
  const root = $('#tab-parts'), groups = {};
  for (const t of K.nodeTypes) (groups[K.nodeSpecs[t].group] ??= []).push(t);
  const GL = {structure: '구조', layout: '레이아웃', content: '콘텐츠', data: '데이터', form: '폼', feedback: '피드백·상태', media: '미디어', nav: '내비게이션'};
  root.innerHTML = '<p class="note">부품 ' + K.nodeTypes.length + '종. 누르면 예시를 실제로 렌더링합니다.</p>' + Object.entries(groups).map(([g, list]) => '<h2 class="sec">' + (GL[g] ?? g) + ' · ' + list.length + '</h2><div class="list">' + list.map(t => '<button type="button" class="row card" data-n="' + t + '"><b>' + esc(K.nodeSpecs[t].label) + ' <span>' + t + '</span></b><p>' + Object.entries(K.nodeSpecs[t].fields).filter(([, s]) => s.enum && s.enum.length <= 9).map(([k, s]) => k + ': ' + s.enum.join('/')).join(' · ') + '</p></button>').join('') + '</div>').join('');
  root.querySelectorAll('[data-n]').forEach(b => b.onclick = () => openPart(b.dataset.n));
}
function renderAxes() {
  const root = $('#tab-axes');
  root.innerHTML = '<p class="note">축마다 값을 눌러 보세요. 금지 조합은 이유와 함께 거부됩니다.</p>' + K.axisOrder.map(k => '<h2 class="sec">' + esc(K.axisDefs[k].label) + ' <span class="note">' + k + '</span></h2><div>' + Object.entries(K.axisDefs[k].values).map(([v, d]) => '<button type="button" class="pill" data-k="' + k + '" data-v="' + v + '" title="' + esc(d) + '">' + v + '</button>').join('') + '</div><p class="note">' + Object.entries(K.axisDefs[k].values).map(([v, d]) => v + ' = ' + d).join(' · ') + '</p>').join('');
  root.querySelectorAll('.pill').forEach(b => b.onclick = () => { openViewer('saas-landing'); applyAxis(b.dataset.k, b.dataset.v); });
}
function renderRules() {
  const root = $('#tab-rules');
  root.innerHTML = '<h2 class="sec">규칙 ' + K.rules.length + '개</h2><div class="list">' + K.rules.map(r => '<div class="row"><b>' + r.id + '</b><p>' + esc(r.intent) + '</p><p>' + r.codes.join(', ') + '</p></div>').join('') + '</div><h2 class="sec">축 조합 금지 ' + K.axisBans.length + '개</h2><div class="list">' + K.axisBans.map(b => '<div class="row"><b>' + b.id + ' · ' + b.uses.join(' × ') + '</b><p>' + esc(b.why) + '</p><p>대안: ' + Object.entries(b.fix).map(([k, v]) => k + '=' + v).join(', ') + '</p></div>').join('') + '</div><h2 class="sec">페이지 유형 ' + Object.keys(K.pageTypes).length + '개</h2><div class="list">' + Object.entries(K.pageTypes).map(([id, p]) => '<div class="row"><b>' + esc(p.label) + ' <span>' + id + '</span></b><p>' + esc(p.description) + '</p><p>필수: ' + (p.require.length ? p.require.map(g => g.join('|')).join(' + ') : '없음') + (p.forbid && p.forbid.length ? ' · 금지: ' + p.forbid.join(', ') : '') + '</p></div>').join('') + '</div>';
}

// ---- viewer ----
const viewer = $('#viewer'), frame = $('#frame'), stage = $('#stage'), errs = $('#errs');
function fitWide() { if (!stage.classList.contains('wide')) { frame.style.transform = ''; frame.style.height = ''; return; } const s = stage.clientWidth / 1280; frame.style.transform = 'scale(' + s + ')'; frame.style.height = (stage.clientHeight / s) + 'px'; }
function show(b) {
  const p = preview(b);
  if (p.errors) { errs.innerHTML = esc(p.errors.slice(0, 6).map(e => e.path + ' [' + e.code + '] ' + e.message).join('\n')) + '<br><button type="button" id="fix">규칙에 맞게 자동 수정</button>'; errs.classList.add('open'); $('#fix').onclick = () => { K.repairAxes(bp); sync(); show(bp); }; return false; }
  errs.classList.remove('open'); lastHtml = p.html; frame.srcdoc = p.html; return true;
}
function opt(list, cur, label) { return list.map(v => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(label ? label(v) : v) + '</option>').join(''); }
function sync() {
  $('#f-tpl').innerHTML = opt(tpls.map(t => t.id), tplId, id => tpls.find(t => t.id === id).label);
  $('#f-theme').innerHTML = opt(themes.map(t => t.id), bp.theme, id => K.themes[id].name + ' · ' + K.themeCategories[K.themes[id].category]);
  $('#f-pal').innerHTML = opt(K.themes[bp.theme].palettes, bp.palette, id => K.palettes[id].name);
  document.querySelectorAll('#modes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === bp.mode)));
  $('#axgrid').innerHTML = K.styleAxes.map(k => '<div class="field"><label for="a-' + k + '">' + esc(K.axisDefs[k].label) + '</label><select id="a-' + k + '" data-k="' + k + '">' + opt(K.axes[k], bp[k], v => v + ' — ' + K.axisDefs[k].values[v]) + '</select></div>').join('');
  $('#axgrid').querySelectorAll('select').forEach(s => s.onchange = () => applyAxis(s.dataset.k, s.value));
  $('#vtitle').textContent = (tpls.find(t => t.id === tplId)?.label ?? bp.name) + ' · ' + K.themes[bp.theme].name;
}
function applyAxis(k, v) { bp[k] = v; sync(); show(bp); }
function openViewer(tid, themeId, paletteId) { tplId = tid; bp = K.createBlueprint(tid, themeId, paletteId); sync(); show(bp); viewer.classList.add('open'); document.body.style.overflow = 'hidden'; fitWide(); }
function openPart(type) {
  const spec = K.nodeSpecs[type], base = K.createBlueprint('about-team'); base.pageType = 'general';
  const filler = {type: 'prose', title: '본문', body: '내용'}, ex = structuredClone(spec.example ?? (type === 'plan' ? K.nodeSpecs.pricing.example.children[0] : null));
  if (!ex) { const parent = K.nodeTypes.find(t => K.nodeSpecs[t].example && K.nodeSpecs[t].children?.includes(type)); return openPart(parent); }
  base.tree = {type: 'page', children: type === 'page-header' ? [ex, filler] : [{type: 'page-header', title: spec.label, description: '부품 예시 · ' + type}, ex]};
  if (type === 'toc') base.tree.children.push({type: 'section', title: '첫째', anchor: 'a', children: [filler]}, {type: 'section', title: '둘째', anchor: 'b', children: [filler]});
  tplId = 'about-team'; bp = base; sync(); show(bp); $('#vtitle').textContent = spec.label + ' (' + type + ')'; viewer.classList.add('open'); document.body.style.overflow = 'hidden'; fitWide();
}
$('#close').onclick = () => { viewer.classList.remove('open'); document.body.style.overflow = ''; frame.srcdoc = ''; $('#panel').classList.remove('open'); };
$('#opts').onclick = () => { const p = $('#panel'); p.classList.toggle('open'); $('#opts').setAttribute('aria-expanded', String(p.classList.contains('open'))); };
$('#wide').onclick = () => { stage.classList.toggle('wide'); $('#wide').setAttribute('aria-pressed', String(stage.classList.contains('wide'))); fitWide(); };
$('#f-tpl').onchange = e => { tplId = e.target.value; bp = K.createBlueprint(tplId, bp.theme); sync(); show(bp); };
$('#f-theme').onchange = e => { bp = K.createBlueprint(tplId, e.target.value); sync(); show(bp); };
$('#f-pal').onchange = e => { bp.palette = e.target.value; show(bp); };
document.querySelectorAll('#modes button').forEach(b => b.onclick = () => { bp.mode = b.dataset.m; sync(); show(bp); });
$('#dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lastHtml], {type: 'text/html'})); a.download = (tplId || 'page') + '.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
$('#dlj').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(bp, null, 2)], {type: 'application/json'})); a.download = (tplId || 'page') + '.blueprint.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
addEventListener('resize', fitWide);
addEventListener('keydown', e => { if (e.key === 'Escape' && viewer.classList.contains('open')) $('#close').click(); });
document.querySelectorAll('nav.tabs button').forEach(b => b.onclick = () => { document.querySelectorAll('nav.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b))); document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== 'tab-' + b.dataset.tab); });
$('#counts').innerHTML = [['테마', themes.length], ['팔레트', Object.keys(K.palettes).length], ['템플릿', tpls.length], ['부품', K.nodeTypes.length], ['페이지 유형', Object.keys(K.pageTypes).length], ['축', K.axisOrder.length], ['아이콘', K.iconNames.length], ['규칙', K.rules.length + K.axisBans.length]].map(([a, n]) => '<li>' + a + ' ' + n + '</li>').join('');
renderTemplates(); renderThemes(); renderParts(); renderAxes(); renderRules();
`;

export async function buildGallery() {
  const bundle = (await bundleSource()).replaceAll('</script', '<\\/script');
  const js = JS.replaceAll('</script', '<\\/script');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="Static Kit gallery"><title>Static Kit 샘플 갤러리</title><style>${CSS}</style></head><body>
<header class="top"><h1>Static Kit 샘플 갤러리</h1><p>카탈로그 안의 값으로만 조립한 화면입니다. 파일 하나로 열리며 오프라인에서 동작합니다. 컴파일러가 이 파일 안에 들어 있어 테마·팔레트·모드·축을 바로 바꿔 볼 수 있습니다.</p><ul class="counts" id="counts"></ul></header>
<nav class="tabs" aria-label="갤러리 구역"><button type="button" aria-selected="true" data-tab="templates">템플릿</button><button type="button" aria-selected="false" data-tab="themes">테마·팔레트</button><button type="button" aria-selected="false" data-tab="parts">부품</button><button type="button" aria-selected="false" data-tab="axes">스타일 축</button><button type="button" aria-selected="false" data-tab="rules">규칙</button></nav>
<main><section id="tab-templates"></section><section id="tab-themes" hidden></section><section id="tab-parts" hidden></section><section id="tab-axes" hidden></section><section id="tab-rules" hidden></section></main>
<div id="viewer" role="dialog" aria-modal="true" aria-labelledby="vtitle"><div class="vbar"><button type="button" id="close" aria-label="닫기">←</button><b id="vtitle"></b><button type="button" id="wide" aria-pressed="false" aria-label="데스크톱 폭으로 보기">PC</button><button type="button" id="opts" aria-expanded="false" aria-controls="panel">설정</button></div><div class="stage" id="stage"><iframe id="frame" title="미리보기" sandbox="allow-scripts allow-forms"></iframe></div><div id="panel"><div id="errs" role="alert"></div><div class="field"><label for="f-tpl">템플릿</label><select id="f-tpl"></select></div><div class="two"><div class="field"><label for="f-theme">테마</label><select id="f-theme"></select></div><div class="field"><label for="f-pal">팔레트</label><select id="f-pal"></select></div></div><div class="field"><label id="ml">모드</label><div class="modes" id="modes" role="group" aria-labelledby="ml"><button type="button" data-m="light">밝게</button><button type="button" data-m="dark">어둡게</button><button type="button" data-m="auto">자동</button></div></div><div class="axgrid" id="axgrid"></div><div class="two"><button type="button" class="pill" id="dl">HTML 저장</button><button type="button" class="pill" id="dlj">Blueprint 저장</button></div></div></div>
<script>${bundle}</script><script>${js}</script></body></html>
`;
}
