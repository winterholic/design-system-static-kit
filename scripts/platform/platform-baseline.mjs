/**
 * 플랫폼 구간 기준선(docs/platform/wbs.md 공통 규칙 "성과 보고"). 등록 수량이 아니라 조립해 본 결과로 센다.
 *
 *   실제 조립 가능 조합  (목적 패턴 × 셸 × 폭 × 밀도 × 모드) × (팔레트 × 세트 × 타이포 × 패밀리) 중 관계 평가·색 결합·서체 한도를 통과하는 수.
 *                         렌더 없이 계산한다(축 금지 X01 등은 forbids 관계로 평가).
 *   검증된 조합          실제로 assemblePage로 조립해 품질 검사(대비·변수 누락·서체 한도·페이지 검증기)를 통과한 요청 수와 서로 다른 출력 수.
 *                         재료 조합(팔레트·세트·타이포·패밀리 × 모드)마다 패턴 대표 콘텐츠로 한 번씩, 그리고 레이아웃 축(셸·폭·밀도)은 1순위 재료 조합으로 펼쳐 센다.
 *   고유 색 토큰 집합 수, 고유 서체 짝 수, 고유 패밀리 수
 *
 * 결과는 결정적이다(시각·난수·git revision 없음). 다른 작업자의 재료가 main에 들어오면 다시 측정해 baseline.json을 갱신한다.
 */
import {createHash} from 'node:crypto';
import {createPlatform, assemblePage, bindColor, bindType, axisIds, materialAxisIds, PURPOSES, PLATFORM_CONTRACT_VERSION} from '../../src/platform/index.mjs';
import {PATTERNS} from '../../src/profiles/data.mjs';
import {templates, pageTypes, axes} from '../../src/catalog/index.mjs';

const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const sortObj = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const MODES = ['light', 'dark'];
/** 패턴별 대표 콘텐츠. 데이터 양이 배치에 닿도록 패턴마다 다른 구조를 쓴다. */
const rows = n => Array.from({length: n}, (_, i) => [`작업 ${i + 1}`, `담당 ${i % 5}`, ['진행', '완료', '대기'][i % 3]]);
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i), trend: i % 2 ? 'down' : 'up', delta: `+${i}`, detail: '지난주 대비'}));
const card = (id, title) => ({base: 'base-component:card-surface', content: {id, title, body: `${title} 요약`}});
export const REPRESENTATIVE = Object.freeze({
  'dashboard-grid': {purpose: 'work-dashboard', components: [card('summary-a', '요약 A'), card('summary-b', '요약 B')], content: {title: '운영 현황', kpis: kpis(4), charts: [{preset: 'chart-preset:erp-quarterly-revenue'}], table: {title: '작업', columns: ['작업', '담당', '상태'], rows: rows(8)}}},
  'erp-workspace': {purpose: 'work-dashboard', components: [card('note-a', '메모 A'), card('note-b', '메모 B')], content: {title: '작업 목록', kpis: kpis(4), table: {title: '작업', columns: ['작업', '담당', '상태'], rows: rows(30)}}},
  'marketing-landing': {purpose: 'saas-landing', content: {hero: {title: '제품을 빠르게', body: '설명', action: {label: '시작'}}, features: Array.from({length: 6}, (_, i) => ({title: `기능 ${i + 1}`, body: `설명 ${i + 1}`})), faq: [{question: '질문 1', answer: '답 1'}, {question: '질문 2', answer: '답 2'}], cta: {title: '지금 시작', action: {label: '무료로 시작'}}}},
  'editorial-article': {purpose: 'editorial-docs', content: {title: '글 제목', lead: '리드 문단', sections: [{title: '첫째', body: '본문 하나'}, {title: '둘째', body: '본문 둘'}, {title: '셋째', body: '본문 셋'}]}},
  'docs-reference': {purpose: 'editorial-docs', content: {title: '문서', sections: Array.from({length: 6}, (_, i) => ({title: `항목 ${i + 1}`, body: `설명 ${i + 1}`}))}},
  'commerce-listing': {purpose: 'commerce', content: {title: '상품', products: Array.from({length: 8}, (_, i) => ({title: `상품 ${i + 1}`, price: `${(i + 1) * 1000}원`, meta: '분류'}))}},
});

/** 패밀리 구성원을 쓰는 패턴만 패밀리 축을 곱한다(요청 컴포넌트가 있거나 랜딩의 기능 카드가 자동 승격되는 경우). */
const patternsOf = only => Object.entries(REPRESENTATIVE).filter(([pattern]) => !only || only.includes(pattern)).map(([pattern, r]) => ({pattern, components: [], ...r, usesFamily: Boolean(r.components?.length) || r.purpose === 'saas-landing'}));

/** 패턴이 허용하는 셸·폭·밀도(구형 페이지 유형 제한 포함). */
function layoutAxes(patternId) {
  const p = PATTERNS[patternId], tpl = templates[p.template], pt = pageTypes[tpl.pageType];
  return {pageType: tpl.pageType, shells: p.shells.filter(s => pt.shells.includes(s)), widths: p.widths.filter(w => !pt.widths || pt.widths.includes(w)), densities: [...axes.density]};
}

/** env와 only(패턴 id 목록)는 시험용이다. 기준선은 기본값(등록된 전체 재료, 모든 대표 패턴)으로 잰다. */
export function platformSection({env = createPlatform(), only = null} = {}) {
  const reg = env.registry;
  const list = k => reg.list(k);
  const palettes = list('palette'), sets = list('subtoken-set'), types = list('type-system'), families = list('family'), contexts = list('style-context');

  // ---- 색 토큰 집합·서체 짝: 결합이 통과하는 것만 센다 ----
  const colorOk = new Map(), colorSets = {light: new Set(), dark: new Set()}, colorFailures = {};
  for (const p of palettes) for (const s of sets) for (const mode of MODES) {
    const r = bindColor(p, s, mode), key = `${p.id}|${s.id}|${mode}`;
    colorOk.set(key, r.ok);
    if (r.ok) colorSets[mode].add(hash(r.vars)); else { const why = r.error?.code ?? 'P_COLOR_CONTRAST'; colorFailures[why] = (colorFailures[why] ?? 0) + 1; }
  }
  const facePairs = new Set(), typeOk = new Map();
  for (const t of types) { const r = bindType(t); typeOk.set(t.id, r.ok); if (r.ok) facePairs.add(hash([r.vars['--kit-heading'], r.vars['--kit-font']])); }

  // ---- 실제 조립 가능 조합(렌더 없이) ----
  const base = 'base-component:card-surface';
  const familiesFor = ctx => families.filter(f => f.contexts.includes('any') || f.contexts.includes(ctx));
  const perPattern = {};
  let assemblable = 0, attempted = 0;
  const layoutRelOk = new Map();
  const layoutOk = (ctx, a, axisIdsOfMaterials) => {
    const k = JSON.stringify([a, axisIdsOfMaterials]);
    if (!layoutRelOk.has(k)) layoutRelOk.set(k, env.graph.evaluate([...axisIds(a), ...axisIdsOfMaterials], {context: ctx, mode: a.mode, density: a.density}).ok);
    return layoutRelOk.get(k);
  };
  for (const {pattern, purpose, usesFamily} of patternsOf(only)) {
    const L = layoutAxes(pattern), ctx = L.pageType;
    const ts = types.filter(t => (t.contexts.includes('any') || t.contexts.includes(ctx)) && typeOk.get(t.id));
    const fs = usesFamily ? familiesFor(ctx).filter(f => f.members[base]) : [];
    const famChoices = fs.length ? fs : [null];
    let n = 0, tried = 0;
    const openSets = sets.filter(x => x.contexts.includes('any') || x.contexts.includes(ctx)), openTypes = types.filter(t => t.contexts.includes('any') || t.contexts.includes(ctx));
    // 시도한 수: 걸러 내기 전의 전체 곱(모드 × 레이아웃 × 팔레트 × 세트 × 타이포 × 패밀리). 통과한 수와 비교해 얼마나 막혔는지 보인다.
    tried += MODES.length * L.shells.length * L.widths.length * L.densities.length * palettes.length * openSets.length * openTypes.length * famChoices.length;
    for (const mode of MODES) {
      const tuples = [];
      for (const p of palettes) for (const s of sets) if ((s.contexts.includes('any') || s.contexts.includes(ctx)) && colorOk.get(`${p.id}|${s.id}|${mode}`)) for (const t of ts) for (const f of famChoices) {
        // 관계 평가: 재료 사이(금지·계산 관계)는 레이아웃과 무관하다
        const ids = [p.id, s.id, t.id, ...(f ? [f.id, base] : [])];
        if (env.graph.evaluate(ids, {context: ctx, mode}).ok) tuples.push({t, f});
      }
      for (const shell of L.shells) for (const width of L.widths) for (const density of L.densities) {
        const a = {shell, width, density, mode};
        for (const tup of tuples) { if (layoutOk(ctx, a, [...materialAxisIds(tup.t), ...(tup.f ? materialAxisIds(tup.f) : [])])) n++; }
      }
    }
    perPattern[pattern] = {purpose, assemblable: n, layoutAxes: {shells: L.shells.length, widths: L.widths.length, densities: L.densities.length}};
    assemblable += n; attempted += tried;
  }

  // ---- 검증된 조합: 실제 조립 ----
  const outputs = new Set(), verifiedColor = {light: new Set(), dark: new Set()}, verifiedFaces = new Set(), verifiedFamilies = new Set(), failures = {};
  let verified = 0, verifyAttempted = 0;
  const run = (request, ctxLabel) => {
    verifyAttempted++;
    const r = assemblePage(request, env);
    if (!r.ok) { const code = r.diagnostics.find(d => d.severity === 'error')?.code ?? 'UNKNOWN'; failures[code] = (failures[code] ?? 0) + 1; return null; }
    const c = r.candidates[0];
    if (!c.quality.ok) { failures[`QUALITY:${ctxLabel}`] = (failures[`QUALITY:${ctxLabel}`] ?? 0) + 1; return null; }
    verified++;
    outputs.add(c.fingerprint.output); verifiedColor[request.mode ?? 'light'].add(c.fingerprint.color); verifiedFaces.add(c.fingerprint.face);
    for (const f of Object.values(c.selection.families)) verifiedFamilies.add(f);
    return r;
  };
  const verifiedPerPattern = {};
  for (const {pattern, purpose, content, components, usesFamily} of patternsOf(only)) {
    const L = layoutAxes(pattern), ctx = L.pageType;
    const ts = types.filter(t => (t.contexts.includes('any') || t.contexts.includes(ctx)) && typeOk.get(t.id));
    const fs = usesFamily ? familiesFor(ctx).filter(f => f.members[base]) : [];
    let vp = 0;
    const before = verified;
    for (const mode of MODES) for (const p of palettes) for (const s of sets) for (const t of ts) for (const f of (fs.length ? fs : [null])) {
      if (!(s.contexts.includes('any') || s.contexts.includes(ctx)) || !colorOk.get(`${p.id}|${s.id}|${mode}`)) continue;
      run({purpose, pattern, mode, palette: p.id, subtokenSet: s.id, typeSystem: t.id, ...(f ? {families: [f.id]} : {}), candidates: 1, components, content}, 'materials');
    }
    // 레이아웃 축: 1순위 재료 조합으로 셸·폭·밀도를 펼친다
    const top = assemblePage({purpose, pattern, components, content, candidates: 1}, env);
    if (top.ok) for (const shell of L.shells) for (const width of L.widths) for (const density of L.densities) run({purpose, pattern, shell, width, density, ...selectionRequest(top.candidates[0].selection), candidates: 1, components, content}, 'layout');
    vp = verified - before;
    verifiedPerPattern[pattern] = vp;
  }
  for (const k of Object.keys(perPattern)) perPattern[k].verified = verifiedPerPattern[k] ?? 0;

  // ---- 스타일 재료: 재료마다 그것을 명시한 요청이 실제로 조립·검증되어 출력에 쓰이는가(light로 안 되면 dark로) ----
  const styleKinds = ['surface', 'motion', 'background', 'media'], STATUS_LAYOUTS = ['banner', 'toast', 'block'];
  const styleStats = Object.fromEntries([...styleKinds, 'state-pattern'].map(k => [k, {registered: list(k).length, attempted: 0, verified: 0, usedInOutput: 0}]));
  const styleOutputs = new Set();
  const usedIn = (kind, m, r) => (kind === 'state-pattern' ? r.value.html.includes(`data-pattern="${m.id.split(':')[1]}"`) : r.value.html.includes(`data-${{surface: 'surface', motion: 'motion', background: 'bg', media: 'media'}[kind]}="${m.id.split(':')[1]}"`));
  for (const {pattern, purpose, content, components} of patternsOf(only)) {
    const ctx = layoutAxes(pattern).pageType, open = m => m.contexts.includes('any') || m.contexts.includes(ctx);
    const top = assemblePage({purpose, pattern, components, content, candidates: 1}, env);
    if (!top.ok) continue;
    const fixed = {purpose, pattern, ...selectionRequest(top.candidates[0].selection), candidates: 1, components};
    const tryOne = (kind, m, request, extraContent = {}) => {
      styleStats[kind].attempted++;
      for (const mode of MODES) {
        const r = assemblePage({...fixed, mode, ...request, content: {...content, ...extraContent}}, env);
        if (!r.ok || !r.candidates[0].quality.ok) continue;
        styleStats[kind].verified++; styleOutputs.add(r.candidates[0].fingerprint.output);
        if (usedIn(kind, m, r)) styleStats[kind].usedInOutput++;
        return;
      }
    };
    for (const kind of styleKinds) for (const m of list(kind).filter(open)) tryOne(kind, m, {[kind]: m.id});
    for (const m of list('state-pattern').filter(open)) {
      if (STATUS_LAYOUTS.includes(m.layout)) tryOne('state-pattern', m, {states: {[m.state]: m.id}}, {status: {state: m.state}});
      else if (purpose === 'work-dashboard' && m.state !== 'success') tryOne('state-pattern', m, {states: {[m.state]: m.id}}, {table: {...content.table, rows: m.state === 'empty' ? [] : content.table.rows, state: m.state}});
    }
  }

  const registered = {palette: palettes.length, subtokenSet: sets.length, typeSystem: types.length, baseComponent: list('base-component').length, family: families.length, styleContext: contexts.length, axisValue: list('axis-value').length};
  return {
    contractVersion: PLATFORM_CONTRACT_VERSION, registered,
    assemblable: {attempted, assemblable, perPattern: sortObj(perPattern), note: '(패턴 × 셸 × 폭 × 밀도 × 모드) × (팔레트 × 세트 × 타이포 × 패밀리) 중 관계·색·서체 평가를 통과한 수. 렌더하지 않고 계산한다'},
    verified: {attempted: verifyAttempted, verified, distinctOutputs: outputs.size, failures: sortObj(failures), note: '실제 assemblePage로 조립해 품질 검사를 통과한 요청 수(재료 조합 × 모드 × 패턴, 그리고 레이아웃 축 펼침)'},
    distinct: {
      colorTokenSets: {light: colorSets.light.size, dark: colorSets.dark.size}, facePairs: facePairs.size, families: families.length,
      styleMaterials: {...styleStats, distinctOutputs: styleOutputs.size},
      verifiedColorTokenSets: {light: verifiedColor.light.size, dark: verifiedColor.dark.size}, verifiedFacePairs: verifiedFaces.size, verifiedFamilies: verifiedFamilies.size,
    },
    colorGateFailures: sortObj(colorFailures),
  };
}
const selectionRequest = sel => ({palette: sel.palette, subtokenSet: sel.subtokenSet, typeSystem: sel.typeSystem, families: Object.values(sel.families)});
