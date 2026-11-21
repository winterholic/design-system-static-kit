import 'server-only';
import {catalogSnapshot, compileBlueprint, listCatalog} from '@winterholic/design-system-static-kit/service';
import {checkDocument, resetDocument, setAppearance} from '@winterholic/design-system-static-kit/edit';
import type {ComboIndex, ComboLite, View} from './combos-state';
import diagnoses from '../../../../../docs/evidence/diagnosis-2.4.0.json';

// 내부 QA 탐색기용 서버 모듈. 템플릿 × 구성 변형의 곱을 공개 진입점(./service)만으로 다시 만든다.
// 조합 id 는 옛 갤러리의 id(`템플릿~슬롯:옵션~슬롯:옵션`)와 같아야 한다(이상함 표시가 저장한 id 를 그대로 읽는다).

type Row = Record<string, any>;
const items = (kind: string, fields: string[], filter?: Record<string, string>): Row[] => {
  const out: Row[] = [];
  for (let cursor: string | undefined; ;) {
    const r = listCatalog({kind, fields, ...(filter ? {filter} : {}), limit: 200, ...(cursor ? {cursor} : {})} as never) as {ok: boolean; value: {items: Row[]; nextCursor: string | null}};
    if (!r.ok) throw new Error(`listCatalog(${kind}) 실패`);
    out.push(...r.value.items);
    if (!r.value.nextCursor) return out;
    cursor = r.value.nextCursor;
  }
};

const comboId = (templateId: string, slots: string[], layout: Record<string, string>) => [templateId, ...slots.filter(s => layout[s]).map(s => `${s}:${layout[s]}`)].join('~');

/** 'a~hero:split~nav:top' → {template, layout}. 형식이 어긋나면 null. */
export function parseComboId(id: string): {template: string; layout: Record<string, string>} | null {
  const [template, ...rest] = id.split('~');
  if (!template) return null;
  const layout: Record<string, string> = {};
  for (const part of rest) {
    const cut = part.indexOf(':');
    if (cut <= 0) return null;
    layout[part.slice(0, cut)] = part.slice(cut + 1);
  }
  return {template, layout};
}

let cache: {index: ComboIndex; templates: Map<string, Row>} | null = null;

function build() {
  if (cache) return cache;
  const snapshot = catalogSnapshot() as {version: string; themeCategories: Record<string, string>; paletteFamilies: Record<string, {label: string}>; recipes: Record<string, {label: string}>; recipePicks: Row[]};
  const templates = items('templates', ['id', 'label', 'pageType']);
  const pageTypes = items('pageTypes', ['id', 'label']);
  const themes = items('themes', ['id', 'name', 'category', 'variants', 'palettes']);
  const palettes = items('palettes', ['id', 'name', 'family']);
  const concepts = items('concepts', ['id', 'label', 'templates', 'looks']);
  const axis = items('axes', ['axis', 'values', 'descriptions']).find(a => a.axis === 'typography')!;

  const recipeOf = new Map<string, NonNullable<ComboLite['r']>>();
  const slotsByTemplate = new Map<string, Row[]>();
  for (const t of templates) slotsByTemplate.set(t.id, items('layoutSlots', ['id', 'label', 'options'], {template: t.id}));
  for (const p of snapshot.recipePicks.filter(p => p.satisfied)) {
    const slots = (slotsByTemplate.get(p.templateId) ?? []).map(s => s.id);
    recipeOf.set(comboId(p.templateId, slots, p.layout), {l: snapshot.recipes[p.recipeId]?.label ?? p.recipeId, k: p.applied.map((a: Row) => a.rule), e: p.exempted.map((x: Row) => `${x.rule} 면제 · ${x.reason}`), ...(p.view ? {v: {concept: p.view.concept, look: p.view.look}} : {})});
  }

  const combos: ComboLite[] = [];
  const facet = new Map<string, {label: string; options: Map<string, {id: string; label: string; count: number}>}>();
  const firstOf = new Map<string, number>();
  templates.forEach((t, ti) => {
    const slots = slotsByTemplate.get(t.id)!;
    let sets: Record<string, string>[] = [{}];
    for (const slot of slots) sets = sets.flatMap(c => [c, ...slot.options.map((o: Row) => ({...c, [slot.id]: o.id}))]);
    const slotIds = slots.map(s => s.id);
    for (const layout of sets) {
      const picks = slots.filter(s => layout[s.id]).map(s => ({slot: s, option: s.options.find((o: Row) => o.id === layout[s.id])}));
      for (const {slot, option} of picks) {
        const f = facet.get(slot.id) ?? {label: slot.label, options: new Map()};
        const o = f.options.get(option.id) ?? {id: option.id, label: option.label, count: 0};
        o.count++; f.options.set(option.id, o); facet.set(slot.id, f);
      }
      const id = comboId(t.id, slotIds, layout);
      // 선택한 옵션이 구성 변형 결과 계약(V01~V05)을 어기면 '실험'이다. 지우지 않고 표시만 한다.
      const rules = picks.flatMap(({slot, option}) => (option.rules as Row[]).map(r => `${r.id}(${r.claim ?? '측정'}) ${slot.id}:${option.id} — ${r.detail}`));
      const made = resetDocument(null, {template: t.id, layout, contentPolicy: 'relocate'} as never);
      // 앞 슬롯의 변경이 뒤 슬롯의 조건을 없애면 서로 다른 선택이 같은 화면이 된다. 숨기지 않고 표시만 한다.
      const signature = made.ok ? t.id + JSON.stringify((made.doc as Row).tree) : id;
      const n = combos.length + 1;
      const lite: ComboLite = {id, t: ti, n, ch: picks.length};
      if (rules.length) lite.x = rules.join('\n');
      const diagnosis = (diagnoses.combos as Record<string, string | {g: 'A'|'B'|'C'; c: Record<string, number>}>)[id];
      if (diagnosis) {
        lite.grade = typeof diagnosis === 'string' ? diagnosis as 'A'|'B'|'C' : diagnosis.g;
        if (typeof diagnosis !== 'string') lite.gradeReasons = Object.entries(diagnosis.c).map(([code, count]) => `${code}${count > 1 ? ` ×${count}` : ''}`);
      }
      lite.exp = Boolean((lite.grade && lite.grade !== 'A') || rules.length);
      const rec = recipeOf.get(id); if (rec) lite.r = rec;
      if (firstOf.has(signature)) lite.s = firstOf.get(signature)!; else firstOf.set(signature, n);
      combos.push(lite);
    }
  });

  // 슬롯 표시 순서는 조합 id 의 순서(템플릿 안 슬롯 순서)를 따라 처음 나온 순으로 정한다.
  const index: ComboIndex = {
    catalogVersion: snapshot.version,
    templates: templates.map(t => ({id: t.id, label: t.label, pageType: t.pageType})),
    pageTypes: pageTypes.map(p => ({id: p.id, label: p.label})),
    slots: [...facet.entries()].map(([id, f]) => ({id, label: f.label, options: [...f.options.values()]})),
    concepts: concepts.map(c => ({id: c.id, label: c.label, templates: c.templates, looks: c.looks.map((l: Row) => ({id: l.id, label: l.label}))})),
    themes: themes.map(t => ({id: t.id, name: t.name, category: t.category, variants: t.variants.map((v: Row) => ({id: v.id, label: v.label})), palettes: t.palettes})),
    categories: Object.entries(snapshot.themeCategories).map(([id, label]) => ({id, label})),
    palettes: palettes.map(p => ({id: p.id, name: p.name, family: p.family})),
    families: Object.entries(snapshot.paletteFamilies).map(([id, f]) => ({id, label: f.label})),
    typography: (axis.values as string[]).map(id => ({id, label: String(axis.descriptions?.[id] ?? id).split(' — ')[0]})),
    combos,
  };
  return cache = {index, templates: new Map(templates.map(t => [t.id, t]))};
}

export const comboIndex = (): ComboIndex => build().index;

// ---------------------------------------------------------------- 렌더

const normalize = (view: Partial<View>, index: ComboIndex): View => {
  const theme = index.themes.find(t => t.id === view.theme) ? view.theme! : null;
  const concept = index.concepts.find(c => c.id === view.concept);
  return {
    theme,
    tv: theme && index.themes.find(t => t.id === theme)!.variants.some(v => v.id === view.tv) ? view.tv! : null,
    pal: index.palettes.some(p => p.id === view.pal) ? view.pal! : null,
    mode: view.mode === 'light' || view.mode === 'dark' ? view.mode : null,
    concept: concept ? concept.id : null,
    look: concept && concept.looks.some(l => l.id === view.look) ? view.look! : null,
    type: index.typography.some(x => x.id === view.type) ? view.type! : null,
  };
};

/** 컨셉의 look 을 풀어 쓴 실제 보기. 사용자가 따로 고른 테마·서체는 look 보다 우선한다. */
function resolveView(raw: Partial<View>, index: ComboIndex) {
  const v = normalize(raw, index);
  if (!v.concept) return {theme: v.theme, tv: v.tv, pal: v.pal, mode: v.mode, type: v.type};
  const concept = (items('concepts', ['id', 'looks']).find(c => c.id === v.concept) as Row).looks as Row[];
  const look = concept.find(l => l.id === v.look) ?? concept[0];
  return {theme: v.theme ?? look.theme, tv: v.theme ? v.tv : (v.tv ?? look.themeVariant ?? null), pal: v.pal, mode: v.mode, type: v.type ?? look.typography};
}

export type Made = {ok: true; doc: Row; base: Row; layout: Record<string, string>; notes: string[]} | {ok: false; error: string};

export function makeCombo(id: string, raw: Partial<View>): Made {
  const index = comboIndex();
  const parsed = parseComboId(id);
  if (!parsed || !index.combos.some(c => c.id === id)) return {ok: false, error: '알 수 없는 조합입니다.'};
  const v = resolveView(raw, index);
  const args = {template: parsed.template, ...(v.theme ? {theme: v.theme} : {}), ...(v.pal ? {palette: v.pal} : {}), ...(v.tv ? {themeVariant: v.tv} : {}), ...(v.type ? {typography: v.type} : {}), contentPolicy: 'relocate'};
  const made = resetDocument(null, {...args, layout: parsed.layout} as never);
  if (!made.ok) return {ok: false, error: made.errors[0].message};
  const base = resetDocument(null, args as never);
  const notes: string[] = (made.warnings as Row[]).map(w => w.message);
  let doc = made.doc as Row;
  if (v.mode && v.mode !== doc.mode) {
    const moded = setAppearance(doc, {mode: v.mode} as never);
    if (moded.ok) doc = moded.doc as Row;
    else notes.push(`${doc.theme} 테마는 ${v.mode === 'dark' ? '다크' : '라이트'}를 쓰지 않아 기본 모드로 보입니다.`);
  }
  if (v.type && doc.typography !== v.type) notes.push(`${v.type} 서체는 이 조합의 다른 축과 부딪혀 ${doc.typography}(으)로 보입니다.`);
  return {ok: true, doc, base: (base.ok ? base.doc : doc) as Row, layout: parsed.layout, notes};
}

export function renderCombo(id: string, raw: Partial<View>): {ok: true; html: string; notes: string[]} | {ok: false; error: string} {
  const made = makeCombo(id, raw);
  if (!made.ok) return made;
  const compiled = compileBlueprint(made.doc, {include: ['html']}) as {ok: boolean; value?: {html: string}; errors?: {message: string}[]};
  if (!compiled.ok) return {ok: false, error: `규칙 위반: ${(compiled.errors ?? []).slice(0, 3).map(e => e.message).join(' / ')}`};
  return {ok: true, html: compiled.value!.html, notes: made.notes};
}

/** 진단 등급(통과·품질 경고·실패). 구성 변형만 거친 문서이므로 시작 문서와의 콘텐츠 보존까지 본다. */
export function diagnoseCombo(id: string, raw: Partial<View>) {
  const made = makeCombo(id, raw);
  if (!made.ok) return {ok: false as const, error: made.error};
  const r = checkDocument(made.doc as never, {base: made.base as never, layout: made.layout} as never) as {level: string; errors: Row[]; warnings: Row[]};
  return {ok: true as const, level: r.level, errors: r.errors.map(e => `${e.code} ${e.message}`), warnings: r.warnings.map(w => `${w.code} ${w.message}`)};
}

export {normalize as normalizeView};
