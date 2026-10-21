import {templateList, templates, themes, palettes, pageTypes, layoutOptionsOf, applyLayout, layoutSlotIds, createBlueprint, repairAxes, concepts, axes} from './catalog.mjs';
import {compile, validateBlueprint} from './compiler.mjs';
import {EXPERIMENTAL} from './combo-grades.mjs';
import {TYPE} from './typography.mjs';

/**
 * 템플릿 × 구성 변형 조합 전체 목록. 파일로 미리 만들지 않고 카탈로그에서 그 자리에서 계산한다.
 * 한 조합 = 템플릿 하나 + 슬롯마다 {기본 | 옵션 하나}의 곱. 번호는 이 목록의 순서(1부터)이며 카탈로그가 바뀌면 달라질 수 있으므로,
 * 공유·기록에는 항상 안정적인 id(`템플릿~슬롯:옵션~슬롯:옵션`, 기본 구성은 템플릿 id만)를 쓴다.
 */
let cache = null;

export function enumerateCombos() {
  if (cache) return cache;
  const list = [], firstOf = new Map();
  for (const t of templateList) {
    const slots = layoutOptionsOf(t.id);
    let sets = [{}];
    // 슬롯 순서대로 곱한다. 앞 슬롯이 바깥 루프라 같은 앞 선택끼리 붙어 나온다.
    for (const slot of slots) sets = sets.flatMap(c => [c, ...slot.options.map(o => ({...c, [slot.id]: o.id}))]);
    for (const layout of sets) {
      const picks = slots.filter(s => layout[s.id]).map(s => ({slot: s.id, slotLabel: s.label, option: layout[s.id], optionLabel: s.options.find(o => o.id === layout[s.id]).label}));
      const id = comboId(t.id, layout);
      // 진단(scripts/design-qa/diagnose.mjs)에서 A 등급이 아니었던 조합은 '실험'이다. 갤러리는 기본으로 숨기고 표시를 붙인다.
      const combo = {n: list.length + 1, id, templateId: t.id, template: t.label, pageType: t.pageType, layout, picks, changed: picks.length, sameAs: null, experimental: EXPERIMENTAL[id] ?? null};
      // 앞 슬롯의 변경이 뒤 슬롯의 조건을 없애면 서로 다른 선택이 같은 화면이 된다. 숨기지 않고 표시만 한다.
      const signature = t.id + JSON.stringify(applyLayout(t.tree, layout, t.pageType));
      if (firstOf.has(signature)) combo.sameAs = firstOf.get(signature); else firstOf.set(signature, combo.n);
      list.push(combo);
    }
  }
  return cache = list;
}

export function comboId(templateId, layout = {}) {
  const order = layoutSlotIds.filter(s => layout[s] && layout[s] !== 'default');
  return [templateId, ...order.map(s => `${s}:${layout[s]}`)].join('~');
}

/** id 문자열을 조합으로 풀이한다. 목록에 없는 id는 null. */
export function findCombo(id) {
  if (!id) return null;
  if (!findCombo.index) findCombo.index = new Map(enumerateCombos().map(c => [c.id, c]));
  return findCombo.index.get(id) ?? null;
}

/** 보기 설정: 모두 null이면 템플릿의 기본 테마·팔레트·모드 그대로다. concept·look은 컨셉의 시각 언어(테마+서체), type은 서체 프리셋만 따로 고른 것이다. */
export const EMPTY_VIEW = Object.freeze({theme: null, tv: null, pal: null, mode: null, concept: null, look: null, type: null});

export function normalizeView(view = {}) {
  const theme = themes[view.theme] ? view.theme : null;
  const tv = theme && themes[theme].variants.some(v => v.id === view.tv) ? view.tv : null;
  const concept = concepts[view.concept] ? view.concept : null;
  const look = concept && concepts[concept].looks.some(l => l.id === view.look) ? view.look : null;
  return {theme, tv, pal: palettes[view.pal] ? view.pal : null, mode: view.mode === 'light' || view.mode === 'dark' ? view.mode : null, concept, look, type: axes.typography.includes(view.type) ? view.type : null};
}

/** 컨셉의 look을 풀어 쓴 실제 보기. 사용자가 따로 고른 테마·서체는 look보다 우선한다(서체는 테마와 독립이다). */
export function resolveView(view = EMPTY_VIEW) {
  const v = normalizeView(view);
  if (!v.concept) return {theme: v.theme, tv: v.tv, pal: v.pal, mode: v.mode, type: v.type};
  const l = concepts[v.concept].looks.find(x => x.id === v.look) ?? concepts[v.concept].looks[0];
  return {theme: v.theme ?? l.theme, tv: v.theme ? v.tv : (v.tv ?? l.themeVariant ?? null), pal: v.pal, mode: v.mode, type: v.type ?? l.typography};
}

/** 이 조합이 쓰는 테마가 모드를 금지하면(네온·녹턴·게임의 라이트) 덮어쓰지 않고 그 이유를 notes에 담는다. */
export function comboBlueprint(combo, view = EMPTY_VIEW, notes = []) {
  const v = resolveView(view);
  const b = createBlueprint(combo.templateId, v.theme ?? undefined, v.pal ?? undefined, {themeVariant: v.tv ?? undefined, layout: combo.layout, typography: v.type ?? undefined});
  if (v.mode && v.mode !== b.mode) {
    const theme = themes[b.theme];
    if (theme.forbid.mode?.includes(v.mode)) notes.push(theme.name + ' 테마는 ' + (v.mode === 'dark' ? '다크' : '라이트') + '를 쓰지 않아 기본 모드로 보입니다.');
    else { b.mode = v.mode; repairAxes(b); }
  }
  if (v.type && b.typography !== v.type) notes.push((TYPE[v.type]?.label ?? v.type) + ' 서체는 이 조합의 다른 축과 부딪혀 ' + (TYPE[b.typography]?.label ?? b.typography) + '(으)로 보입니다.');
  return b;
}

/** 조합 하나를 한 번에 컴파일한다. 실패해도 던지지 않고 이유를 돌려준다. */
export function renderCombo(combo, view = EMPTY_VIEW) {
  try {
    const notes = [], blueprint = comboBlueprint(combo, view, notes), check = validateBlueprint(blueprint);
    if (!check.valid) return {ok: false, error: '규칙 위반: ' + check.errors.slice(0, 3).map(x => x.message ?? x.code).join(' / '), blueprint, notes};
    return {ok: true, html: compile(blueprint).html, blueprint, notes};
  } catch (error) { return {ok: false, error: error.message}; }
}

/** URLSearchParams는 ~ : 까지 퍼센트 인코딩해 id가 읽기 어려워진다. 둘 다 쿼리에서 그대로 써도 되는 문자라 되돌린다. */
export const prettyQuery = q => q.replace(/%7E/g, '~').replace(/%3A/g, ':').replace(/%2C/g, ',');

export const viewQuery = (id, view = EMPTY_VIEW) => {
  const v = normalizeView(view), q = new URLSearchParams();
  if (id) q.set('c', id);
  for (const k of ['concept', 'look', 'theme', 'tv', 'pal', 'type', 'mode']) if (v[k]) q.set(k, v[k]);
  return prettyQuery(q.toString());
};

export function viewFromQuery(params) {
  return normalizeView({theme: params.get('theme'), tv: params.get('tv'), pal: params.get('pal'), mode: params.get('mode'), concept: params.get('concept'), look: params.get('look'), type: params.get('type')});
}

/** 슬롯별 필터 선택지와 개수. 화면의 필터 UI가 쓴다. */
export function facets(list = enumerateCombos()) {
  const slots = new Map();
  for (const slotId of layoutSlotIds) slots.set(slotId, {id: slotId, label: null, options: new Map(), fixed: 0});
  for (const c of list) {
    for (const p of c.picks) { const s = slots.get(p.slot); s.label ??= p.slotLabel; const o = s.options.get(p.option) ?? {id: p.option, label: p.optionLabel, count: 0}; o.count++; s.options.set(p.option, o); }
  }
  return [...slots.values()].filter(s => s.label).map(s => ({id: s.id, label: s.label, options: [...s.options.values()]}));
}

/**
 * 필터·검색·정렬. query는 공백으로 나눈 모든 낱말이 번호·id·템플릿 이름·유형·슬롯/옵션 이름 어디에든 있어야 한다.
 * slots: {슬롯id: 옵션id | 'default'}('default'는 그 슬롯을 바꾸지 않은 조합).
 */
export function filterCombos({query = '', pageType = '', template = '', slots = {}, hideSame = false, only = null, concept = '', experimental = true, sort = 'default', seed = 1} = {}, list = enumerateCombos()) {
  const words = query.toLowerCase().replace(/#/g, '').split(/\s+/).filter(Boolean);
  const wanted = Object.entries(slots).filter(([, v]) => v);
  let out = list.filter(c => {
    if (pageType && c.pageType !== pageType) return false;
    if (template && c.templateId !== template) return false;
    if (hideSame && c.sameAs) return false;
    if (concept && concepts[concept] && !concepts[concept].templates.includes(c.templateId)) return false;
    if (!experimental && c.experimental) return false;
    if (only && !only.has(c.id)) return false;
    for (const [slot, option] of wanted) if (option === 'default' ? c.layout[slot] : c.layout[slot] !== option) return false;
    if (words.length) {
      const hay = c.haystack ??= [c.n, String(c.n).padStart(4, '0'), c.id, c.template, pageTypes[c.pageType].label, ...c.picks.flatMap(p => [p.slot, p.slotLabel, p.option, p.optionLabel])].join(' ').toLowerCase();
      if (!words.every(w => hay.includes(w))) return false;
    }
    return true;
  });
  if (sort === 'changed') out = [...out].sort((a, b) => b.changed - a.changed || a.n - b.n);
  else if (sort === 'shuffle') out = shuffled(out, seed);
  return out;
}

/** 시드가 같으면 같은 순서가 나오는 섞기(mulberry32). 새로고침해도 목록이 유지된다. */
export function shuffled(list, seed = 1) {
  let a = seed >>> 0; const rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export const comboTitle = c => c.picks.length ? c.picks.map(p => `${p.slotLabel} ${p.optionLabel}`).join(' · ') : '기본 구성';
export const pad = n => String(n).padStart(4, '0');

/** 사용자가 표시한 "이상한 조합" 목록을 붙여넣을 수 있는 글로 만든다. 다음 품질 개선의 입력이다. */
export function flagsToText(entries, {origin = '', catalogVersion = ''} = {}) {
  const lines = [`# 이상한 조합 ${entries.length}건 (카탈로그 ${catalogVersion})`, ''];
  for (const f of entries) {
    const combo = findCombo(f.c), v = normalizeView(f);
    const view = [v.concept && `컨셉 ${concepts[v.concept].label}${v.look ? ' · ' + concepts[v.concept].looks.find(l => l.id === v.look).label : ''}`, v.type && `서체 ${TYPE[v.type].label}`, v.theme && `테마 ${themes[v.theme].name}`, v.tv && `테마 변형 ${themes[v.theme].variants.find(x => x.id === v.tv).label}`, v.pal && `팔레트 ${palettes[v.pal].name}`, v.mode && (v.mode === 'dark' ? '다크' : '라이트')].filter(Boolean).join(' · ') || '기본 테마·팔레트';
    lines.push(`- #${combo ? pad(combo.n) : '????'} ${f.c}`, `  ${combo ? combo.template + ' · ' + comboTitle(combo) : '목록에 없는 id(카탈로그가 바뀌었을 수 있음)'} / ${view}`);
    if (f.note) lines.push(`  메모: ${f.note}`);
    lines.push(`  ${origin}combos/?${viewQuery(f.c, f)}`);
  }
  return lines.join('\n') + '\n';
}
