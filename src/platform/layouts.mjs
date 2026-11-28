/**
 * 레이아웃 재료의 관계·조립(계약 0.8.0). 데이터는 data/layouts.mjs, 컴파일은 src/layout.mjs(compileLayout)다.
 *
 *   LAYOUT_CHECKS                          관계 그래프의 계산 관계: layout-slot-fit(레이아웃 × 목적 패밀리), layout-axis(레이아웃 × 폭·밀도 축 값)
 *   assembleLayout(env, request)           슬롯 채움을 목적 패밀리로 렌더하고 관계 그래프를 거쳐 레이아웃 HTML·CSS를 낸다
 *   layoutSpecimen(env, layout, options)   슬롯 계약을 모두 채우는 실제 목적 패밀리 목록(전시·실측·프로브용). 손으로 쓴 HTML이 아니다
 *
 * 칸의 내용은 renderPurposeFamily가 낸다. 이 파일은 마크업을 쓰지 않는다.
 */
import {defineCheck} from './relations.mjs';
import {axisDefs} from '../catalog/axes.mjs';
import {axisIds} from './axes.mjs';
import {layoutAccepts} from './data/layouts.mjs';
import {PURPOSE_FAMILIES, getPurposeFamily, renderPurposeFamily, assembleFamilies} from './families/index.mjs';
import {compileLayout, LAYOUT_BANDS, LAYOUT_BAND_NAMES} from '../layout.mjs';

/** 페이지 좌우 여백(px)의 합. 폭 축 값(콘텐츠 폭)에서 컨테이너 폭을 가늠할 때 뺀다(--kit-gutter 24px × 2). */
export const PAGE_GUTTER_TOTAL = 48;

/** 폭 축 값 → 컨테이너가 도달하는 가장 넓은 구간의 번호(0=xs). */
export function reachedBand(widthValue) {
  const px = parseInt(axisDefs.width.values[widthValue], 10);
  const container = px - PAGE_GUTTER_TOTAL;
  return LAYOUT_BANDS.reduce((best, from, i) => (container >= from ? i : best), 0);
}

export const layoutSlotFitCheck = defineCheck({
  id: 'layout-slot-fit', kinds: ['layout', 'purpose-family'], reason: '목적 패밀리가 레이아웃 슬롯 하나의 허용 콘텐츠에 들고 페이지 맥락이 맞는다',
  run(layout, purpose, ctx = {}) {
    const slots = layoutAccepts(layout, purpose.id);
    if (!slots.length) return {ok: false, reason: `${purpose.id}를 받는 슬롯이 ${layout.id}에 없습니다(슬롯 허용: ${layout.slots.map(s => `${s.name}=${s.accepts.join('|')}`).join('; ')})`};
    if (ctx.context && !layout.contexts.includes('any') && !layout.contexts.includes(ctx.context)) return {ok: false, reason: `${layout.id}는 ${ctx.context} 페이지용이 아닙니다(어울리는 페이지 유형: ${layout.contexts.join(', ')})`};
    return {ok: true, detail: {slots}};
  },
});

export const layoutAxisCheck = defineCheck({
  id: 'layout-axis', kinds: ['layout', 'axis-value'], reason: '페이지 폭 축이 레이아웃의 핵심 배치 구간까지 열리고 밀도가 허용 범위 안이다',
  run(layout, axis) {
    if (axis.axis === 'density') return layout.density.allowed.includes(axis.value) ? {ok: true, detail: {density: axis.value}} : {ok: false, reason: `${layout.id}는 ${axis.value} 밀도를 받지 않습니다(허용: ${layout.density.allowed.join('·')})`};
    if (axis.axis !== 'width') return {ok: true};
    const reached = reachedBand(axis.value), need = LAYOUT_BAND_NAMES.indexOf(layout.needsBand);
    if (reached >= need) return {ok: true, detail: {reached: LAYOUT_BAND_NAMES[reached], needs: layout.needsBand}};
    const px = parseInt(axisDefs.width.values[axis.value], 10);
    return {ok: false, reason: `${layout.id}의 핵심 배치는 ${layout.needsBand} 구간(컨테이너 ${LAYOUT_BANDS[need]}px 이상)에서 열리는데 width=${axis.value}(${px}px)의 컨테이너는 약 ${px - PAGE_GUTTER_TOTAL}px라 ${LAYOUT_BAND_NAMES[reached]} 구간까지만 열립니다`};
  },
});

export const LAYOUT_CHECKS = Object.freeze([layoutSlotFitCheck, layoutAxisCheck]);

const SLOT_ITEMS = {grid: 6, columns: 8, bento: 5};
/** 슬롯을 채울 항목 수: 반복 흐름은 열 수가 폭마다 달라지는 값, 그 밖의 슬롯은 최소 수(여러 개 받는 슬롯은 2개)다. */
const specimenCount = slot => Math.max(slot.min, Math.min(slot.max, SLOT_ITEMS[slot.flow?.mode] ?? (slot.max > 1 ? Math.min(slot.max, slot.min > 1 ? slot.min : 2) : 1)));
const accepted = slot => PURPOSE_FAMILIES.filter(f => slot.accepts.includes(f.id) || slot.accepts.includes(`group:${f.group}`));

/** 자유 문장 필드(제목·본문·설명 등)에만 길게 이어지는 단어를 붙인다(콘텐츠 길이 대응 시험). 숫자·가격·상태 라벨·아이콘 이름 같은 한 줄 값은 부품 계약의 몫이라 건드리지 않는다. */
export const PROSE_KEYS = Object.freeze(['title', 'body', 'description', 'excerpt', 'message', 'detail', 'note', 'helper', 'headline', 'caption', 'hint']);
const stretch = (v, key = '') => (typeof v === 'string' ? (PROSE_KEYS.includes(key) ? `${v} ${'긴단어'.repeat(14)}` : v) : Array.isArray(v) ? v.map(x => stretch(x, key)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stretch(x, k)])) : v);

/**
 * 슬롯 계약을 모두 채우는 항목 목록: [{slot, purpose, variant, props, content}]. 선택 슬롯도 채운다.
 * 슬롯 허용 콘텐츠에 드는 목적 패밀리를 돌려 가며 쓰고, 시각 패밀리가 거부하는 항목은 건너뛴다. options: {visual, density, context, stress}
 */
export function layoutSpecimen(env, layout, {visual = 'family:quiet', density = layout.density.default, context = layout.contexts.find(c => c !== 'any') ?? 'general', stress = false} = {}) {
  const items = [];
  for (const slot of layout.slots) {
    const n = specimenCount(slot);
    const pool = accepted(slot).filter(f => {
      const densityValues = f.props?.density ?? f.variants?.density;
      // 관계 그래프가 이 밀도에서 금지하는 항목(예: compact 밀도의 하단 내비게이션)은 표본에서 뺀다.
      const banned = env.graph.evaluate([f.id, ...f.bases, ...axisIds({density})], {context, mode: 'light', density}).violations.some(v => v.code === 'P_REL_FORBIDS');
      return !banned && (!densityValues || densityValues.includes(density)) && renderPurposeFamily(env, f.id, {visual, variant: f.example.variant, props: f.example.props, content: f.example.content}).ok;
    });
    if (!pool.length) continue;
    // 같은 묶음 안에서 순서를 고정한다: 예시 높이가 서로 다른 항목이 번갈아 나오도록 id 순으로 돌린다.
    const order = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < n; i++) {
      const f = order[i % order.length];
      items.push({slot: slot.name, purpose: f.id, variant: f.example.variant, props: f.example.props, content: stress && f.group !== 'button' ? stretch(f.example.content) : f.example.content});
    }
  }
  return items;
}

/** 최상위 규칙(블록) 단위로 같은 문자열을 한 번만 남긴다. 중괄호 깊이로 자르므로 @media·@container 안의 규칙은 한 덩어리다. */
export function dedupeRules(css) {
  const seen = new Set(), out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { const rule = css.slice(start, i + 1).trim(); start = i + 1; if (rule && !seen.has(rule)) { seen.add(rule); out.push(rule); } } }
    else if (ch === '/' && css[i + 1] === '*' && depth === 0) { const end = css.indexOf('*/', i + 2); const c = css.slice(i, end + 2); i = end + 1; start = i + 1; if (!seen.has(c)) { seen.add(c); out.push(c); } }
  }
  const tail = css.slice(start).trim();
  if (tail && !seen.has(tail)) out.push(tail);
  return out.join('\n');
}

const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});
const KEYS = ['layout', 'fills', 'density', 'mode', 'visual', 'context', 'width', 'styleContext', 'palette', 'subtokenSet', 'typeSystem'];

/**
 * 레이아웃 조립. request: {layout, fills: [{slot, purpose, variant?, props?, content?}], density?, mode?, visual?, context?, width?}
 * 1) 슬롯 계약(필수·허용 콘텐츠·항목 수)  2) 관계 그래프(layout × 목적 패밀리 × 폭·밀도 축)  3) 목적 패밀리 렌더(assembleFamilies가 토큰·접근성 대비도 확인)  4) compileLayout.
 * 반환: {ok, value: {html, css, tokens, manifest}, diagnostics}. 거부는 이유를 diagnostics에 싣고 값을 바꿔 통과시키지 않는다.
 */
export function assembleLayout(env, request) {
  const fail = diagnostics => ({ok: false, value: null, diagnostics});
  if (request === null || typeof request !== 'object' || Array.isArray(request)) return fail([diag('P_REQUEST', '$', '요청은 객체여야 합니다')]);
  const diagnostics = Object.keys(request).filter(k => !KEYS.includes(k)).map(k => diag('P_REQUEST_KEY', `$.${k}`, `지원하지 않는 키: ${k}. 임의 CSS 경로는 없습니다`, {alternatives: KEYS}));
  const layout = env.registry.get(request.layout);
  if (!layout || layout.kind !== 'layout') diagnostics.push(diag('P_ATTR_UNKNOWN', '$.layout', `등록되지 않은 레이아웃: ${request.layout}`, {alternatives: env.registry.list('layout').map(m => m.id)}));
  if (!Array.isArray(request.fills) || !request.fills.length) diagnostics.push(diag('P_REQUEST_FILLS', '$.fills', 'fills(슬롯 채움)가 필요합니다'));
  if (diagnostics.length) return fail(diagnostics);
  const density = request.density ?? layout.density.default, mode = request.mode ?? 'light', visual = request.visual ?? 'family:quiet';
  const context = request.context ?? layout.contexts.find(c => c !== 'any') ?? 'general';
  const items = request.fills.map((f, i) => ({...f, id: `${f.slot}-${i}`.replace(/[^a-z0-9-]/g, '-'), visual}));
  const unknown = items.filter(f => !getPurposeFamily(f.purpose));
  for (const f of unknown) diagnostics.push(diag('P_ATTR_UNKNOWN', `$.fills[${items.indexOf(f)}].purpose`, `등록되지 않은 목적 패밀리: ${f.purpose}`));
  if (diagnostics.length) return fail(diagnostics);

  // 관계 그래프: 레이아웃 × 쓰인 목적 패밀리 × 폭·밀도 축. 닫힌 쌍(layout, purpose-family)은 계산 관계가 통과해야 한다.
  const purposes = [...new Set(items.map(f => f.purpose))].sort();
  const ids = [layout.id, ...purposes, ...axisIds({density, ...(request.width ? {width: request.width} : {})})];
  const relations = env.graph.evaluate(ids, {context, mode, density});
  // 목적 패밀리가 자기 기반 부품을 요구하는 관계(P_REL_REQUIRES)와 축 값끼리의 금지는 assembleFamilies와 페이지 조립이 본다. 여기서는 레이아웃이 걸린 위반만 낸다.
  for (const v of relations.violations.filter(x => x.from === layout.id || x.to === layout.id)) diagnostics.push(diag(v.code, '$.fills', v.reason, {from: v.from, to: v.to}));
  if (diagnostics.length) return fail(diagnostics);

  const rendered = [];
  for (const [i, f] of items.entries()) {
    const r = renderPurposeFamily(env, f.purpose, f);
    if (!r.ok) { for (const e of r.errors) diagnostics.push(diag(e.code, `$.fills[${i}]`, e.message)); continue; }
    rendered.push({slot: f.slot, purpose: f.purpose, html: r.html});
  }
  if (diagnostics.length) return fail(diagnostics);
  const compiled = compileLayout(layout, rendered, {density});
  if (!compiled.ok) return fail(compiled.diagnostics.map(d => diag(d.code, d.path, d.message)));
  // 목적 패밀리는 자기가 어울리는 페이지 유형 안에서만 조립된다(assembleFamilies의 맥락 검사). 한 레이아웃은 여러 유형의 부품을 담을 수 있으므로 맥락별로 나눠 조립하고 CSS를 합친다.
  const contextOf = f => { const c = getPurposeFamily(f.purpose).contexts; return c.includes('any') || c.includes(context) ? context : c[0]; };
  const groups = new Map();
  for (const f of items) { const c = contextOf(f); groups.set(c, [...(groups.get(c) ?? []), f]); }
  const parts = [];
  for (const [c, list] of groups) {
    const r = assembleFamilies(env, {context: c, mode, density, items: list.map(({slot, ...rest}) => rest), ...(request.styleContext ? {styleContext: request.styleContext} : {}), ...(request.palette ? {palette: request.palette} : {}), ...(request.subtokenSet ? {subtokenSet: request.subtokenSet} : {}), ...(request.typeSystem ? {typeSystem: request.typeSystem} : {})});
    if (!r.ok) return fail(r.diagnostics);
    parts.push(r.value);
  }
  const base = {value: {css: dedupeRules(parts.map(p => p.css).join('\n')), tokens: parts[0].tokens, manifest: {...parts[0].manifest, families: {purposes: [...new Set(parts.flatMap(p => p.manifest.families.purposes))].sort(), visuals: [...new Set(parts.flatMap(p => p.manifest.families.visuals))].sort(), bases: [...new Set(parts.flatMap(p => p.manifest.families.bases))].sort()}}}};
  const html = `<div class="kit-lay-page" data-mode="${mode}">${compiled.html}</div>`;
  const css = `${base.value.css}\n.kit-lay-page{padding:var(--kit-inset);box-sizing:border-box}@media(max-width:640px){.kit-lay-page{padding:var(--kit-sp-item)}}\n${compiled.css}`;
  return {ok: true, value: {html, css, tokens: base.value.tokens, manifest: {...base.value.manifest, layout: {...compiled.manifest, relations: {checks: relations.checks.length, applied: relations.applied.length}, context, mode}}}, diagnostics: []};
}

/** 레이아웃 재료 하나의 표본 조립(전시·프로브·실측이 같은 입력을 쓴다). */
export const assembleSpecimen = (env, layoutId, options = {}) => {
  const layout = env.registry.get(layoutId);
  const fills = layoutSpecimen(env, layout, options);
  return {fills, ...assembleLayout(env, {layout: layoutId, fills, density: options.density, mode: options.mode, visual: options.visual, context: options.context, width: options.width})};
};
