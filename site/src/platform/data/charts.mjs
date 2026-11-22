/**
 * 차트 프리셋 29개의 맥락·형태 관계와 플랫폼 조립(테마·기타 재료 작업 소유).
 *
 * 차트 프리셋은 ADR 0011 재료(`chart-preset:*`, src/materials/chart-presets.mjs)다. 렌더러(src/render/chart*.mjs)와 프리셋 데이터는 바꾸지 않는다(2.4.0~2.6.0 출력 해시 고정).
 * 이 파일은 그 위에 관계 층을 둔다.
 *   - 형태(form) ↔ 데이터 유형: 기존 표 KIND_DATA_TYPES를 그대로 쓴다. 같은 데이터 유형을 그리는 다른 형태가 대안(alternatives)이다.
 *   - 형태 ↔ 페이지 유형: FORM_CONTEXTS. 형태마다 읽을 수 있는 페이지 유형과, 거부할 때 이유를 둔다.
 *   - 스타일 맥락 ↔ 프리셋: 밀도·격자·값 라벨 옵션이 스타일 맥락의 성향과 맞는 정도로 순위를 낸다(rankChartPresets).
 *   - 프로필 ↔ 프리셋: 프로필이 허용한 형태(`charts.kinds`) 밖의 프리셋은 이유와 대안과 함께 거부한다(assembleChartPreset의 profile 인자).
 *
 * 색: 플랫폼 색 역할(`--kit-chart1~6`, `--kit-seq1~7`, `--kit-div1~7`)을 읽는 형태는 히트맵(순차), 폭포(발산 양 끝), 도넛(범주형 6색)이다. `colorRoles`를 켜면 렌더러 출력의 색 참조만 바꾼다.
 * 조립(assembleChartPreset)은 AI가 SVG를 만들지 않는다: 같은 프리셋 렌더러(renderChartPreset)가 낸 그림과 데이터 표를 그대로 돌려주고, 안 되는 조합은 코드가 있는 진단으로 거부한다.
 */
import {chartPresetMaterials} from '../../materials/chart-presets.mjs';
import {renderChartPreset, chartColorRoleVars} from '../../render/chart-presets.mjs';
import {KIND_DATA_TYPES} from '../../catalog/chart-rules.mjs';
import {pageTypes, pageTypeIds} from '../../catalog/index.mjs';
import {chunks} from '../../styles/chunks.mjs';
import {chartExtensionCSS} from '../../styles/chart-extension.mjs';
import {PROFILES} from '../../profiles/data.mjs';

export const CHART_FORM_GROUPS = Object.freeze({
  comparison: ['bar', 'bars-h'], composition: ['stacked-bar', 'donut', 'waterfall'], trend: ['line', 'area', 'sparkline'],
  distribution: ['histogram', 'heatmap'], relationship: ['scatter'], process: ['funnel'], market: ['candlestick', 'ohlc'],
});
export const groupOfForm = form => Object.entries(CHART_FORM_GROUPS).find(([, forms]) => forms.includes(form))?.[0] ?? null;

const WORK = ['dashboard', 'data', 'general'], LIST = ['listing', 'community', 'settings'], READ = ['article', 'blog', 'docs'], MARKET = ['landing', 'pricing', 'commerce', 'portfolio'], INPUT = ['form', 'auth', 'error'];
const ALL_BUT_INPUT = [...WORK, ...LIST, ...READ, ...MARKET];

/** 형태별로 읽을 수 있는 페이지 유형. 목록 밖의 유형은 거부하고 reason에 이유를 둔다(형태 × 유형 군). */
export const FORM_CONTEXTS = Object.freeze({
  bar: ALL_BUT_INPUT, 'bars-h': ALL_BUT_INPUT, line: ALL_BUT_INPUT, area: ALL_BUT_INPUT, donut: ALL_BUT_INPUT,
  sparkline: [...WORK, ...LIST, ...MARKET],
  'stacked-bar': [...WORK, 'listing', 'community', ...READ],
  heatmap: WORK,
  scatter: [...WORK, 'article', 'docs'], histogram: [...WORK, 'article', 'docs'], waterfall: [...WORK, 'article', 'docs'],
  funnel: [...WORK, 'landing', 'pricing', 'commerce'],
  candlestick: [...WORK, 'listing'], ohlc: [...WORK, 'listing'],
});

const FORM_REASON = {
  sparkline: {read: '축이 없는 추세선은 글 속 근거로 읽히지 않는다(값과 단위를 본문이 설명해야 한다)'},
  'stacked-bar': {market: '누적 막대는 범례와 축을 해석해야 해 짧게 훑는 마케팅 페이지에 맞지 않는다', other: '누적 막대는 구성 비교에 쓸 만한 데이터 양과 폭이 있는 화면에서만 읽힌다'},
  heatmap: {other: '열×행 격자 라벨이 있어야 값을 읽는다. 폭이 좁거나 훑는 화면에서는 라벨이 잘리거나 겹친다'},
  scatter: {other: '두 값의 관계는 축을 읽을 수 있는 분석·설명 화면에서만 의미가 있다'},
  histogram: {other: '분포는 구간 라벨과 관측 수를 읽을 수 있는 분석·설명 화면에서만 의미가 있다'},
  waterfall: {other: '증감이 합계로 이어지는 과정은 기준·합계를 읽을 수 있는 분석·설명 화면에서만 읽힌다'},
  funnel: {other: '단계별 전환율은 제품·마케팅 현황을 보는 화면의 맥락이다'},
  candlestick: {other: '시세(시가·고가·저가·종가) 형태는 읽는 법을 가정할 수 있는 업무·시세 화면에서만 쓴다'},
  ohlc: {other: '시세(시가·고가·저가·종가) 형태는 읽는 법을 가정할 수 있는 업무·시세 화면에서만 쓴다'},
};
const contextGroup = c => (INPUT.includes(c) ? 'input' : READ.includes(c) ? 'read' : MARKET.includes(c) ? 'market' : LIST.includes(c) ? 'list' : 'work');
const INPUT_REASON = 'form·auth·error 페이지는 입력과 복구에 집중하므로 차트를 두지 않는다';

/** 형태 × 페이지 유형 판정. {ok, code?, reason?}. */
export function chartContextVerdict(form, context) {
  if (!pageTypeIds.includes(context)) return {ok: false, code: 'P_CHART_CONTEXT', reason: `모르는 페이지 유형: ${context}`};
  const allowed = FORM_CONTEXTS[form];
  if (!allowed) return {ok: false, code: 'P_CHART_FORM', reason: `플랫폼이 모르는 차트 형태: ${form}`};
  if (allowed.includes(context)) {
    const type = pageTypes[context];
    if (type.allow && !type.allow.includes('chart')) return {ok: false, code: 'P_CHART_PAGETYPE', reason: `${context} 페이지 유형은 ${type.allow.join(', ')}만 허용해 chart를 받지 않는다`};
    if (type.forbid?.includes('chart')) return {ok: false, code: 'P_CHART_PAGETYPE', reason: `${context} 페이지 유형은 chart를 금지한다`};
    return {ok: true};
  }
  const g = contextGroup(context);
  const reason = g === 'input' ? INPUT_REASON : FORM_REASON[form]?.[g] ?? FORM_REASON[form]?.other ?? `${form}은 ${context} 페이지 유형에서 읽기 어렵다`;
  return {ok: false, code: 'P_CHART_CONTEXT', reason: `${reason} (${form} 허용: ${allowed.join(', ')})`};
}

/** 프리셋 한 개의 관계 기록. 프리셋 재료에서 읽은 값 + 형태 규칙에서 계산한 값이다(손으로 따로 적지 않는다). */
function relationOf(m) {
  const form = m.ext.chartKind, dataType = m.ext.dataType, group = groupOfForm(form);
  const allowed = new Set([...FORM_CONTEXTS[form], ...m.contexts]);
  const alternatives = chartPresetMaterials.filter(o => o.id !== m.id && o.ext.chartKind !== form && KIND_DATA_TYPES[o.ext.chartKind].includes(dataType))
    .sort((a, b) => (groupOfForm(b.ext.chartKind) === group) - (groupOfForm(a.ext.chartKind) === group) || a.id.localeCompare(b.id)).map(o => o.id);
  return Object.freeze({
    id: m.id, form, group, domain: m.ext.domain, dataType, primaryContexts: [...m.contexts], allowedContexts: pageTypeIds.filter(c => allowed.has(c)),
    options: {grid: m.ext.options.grid, labels: m.ext.options.labels, legend: m.ext.options.legend, density: m.ext.options.density, responsive: m.ext.options.responsive},
    axesOmitted: m.ext.axes.x === 'omitted', alternatives,
  });
}
export const CHART_PRESET_RELATIONS = Object.freeze(chartPresetMaterials.map(relationOf));
const REL_BY_ID = new Map(CHART_PRESET_RELATIONS.map(r => [r.id, r]));
export const chartRelationOf = id => REL_BY_ID.get(id) ?? null;

/** 스타일 맥락의 성향 → 차트 옵션 선호. [{option, value, priority, reason}]. 결정적이다. */
export function chartTendency(styleContext) {
  const p = styleContext.axisPreferences, first = a => p[a]?.[0], out = [];
  if (first('density') === 'compact') out.push({option: 'density', value: 'compact', priority: 20, reason: `${styleContext.label}는 밀도 compact를 선호해 촘촘한 차트가 맞는다`});
  else out.push({option: 'density', value: 'comfortable', priority: 10, reason: `${styleContext.label}는 밀도 ${first('density')}를 선호해 여유 있는 차트가 맞는다`});
  if (first('backdrop') === 'grid' || first('ornament') === 'lines') out.push({option: 'grid', value: 'both', priority: 15, reason: `${styleContext.label}는 구조를 드러내는 격자·선 바탕이라 가로세로 격자가 맞는다`});
  else if (['glow', 'hard', 'lifted'].includes(first('elevation'))) out.push({option: 'grid', value: 'none', priority: 15, reason: `${styleContext.label}는 깊이·윤곽이 강해 차트 격자를 줄이는 쪽이 맞는다`});
  else out.push({option: 'grid', value: 'horizontal', priority: 10, reason: `${styleContext.label}는 절제된 깊이라 가로 격자만 두는 쪽이 맞는다`});
  const read = styleContext.mood.includes('read') || styleContext.tags.includes('read');
  if (read) out.push({option: 'labels', value: 'extremes', priority: 10, reason: `${styleContext.label}는 읽기 맥락이라 값 라벨을 극값에만 둔다`});
  else if (first('density') === 'compact') out.push({option: 'labels', value: 'values', priority: 10, reason: `${styleContext.label}는 촘촘한 판독 맥락이라 값 라벨을 모두 보인다`});
  return out;
}

/**
 * 스타일 맥락·페이지 유형·프로필에 맞는 차트 프리셋 순위. 결정적이다(동점은 id 순).
 * request: {context, profile?: {kinds}, dataType?}. 반환: {ranked: [{id, score, reasons}], blocked: [{id, code, reason, alternatives}], reasons}
 */
export function rankChartPresets(styleContext, {context, profile = null, dataType = null} = {}) {
  const tendency = chartTendency(styleContext), ranked = [], blocked = [];
  for (const rel of CHART_PRESET_RELATIONS) {
    if (dataType && rel.dataType !== dataType) continue;
    const verdict = chartContextVerdict(rel.form, context);
    if (!verdict.ok) { blocked.push({id: rel.id, code: verdict.code, reason: verdict.reason, alternatives: []}); continue; }
    if (profile && !profile.kinds.includes(rel.form)) { blocked.push({id: rel.id, code: 'P_CHART_PROFILE_KIND', reason: `프로필이 허용한 차트 형태(${profile.kinds.join(', ') || '없음'})에 ${rel.form}이 없다`, alternatives: rel.alternatives.filter(a => profile.kinds.includes(chartRelationOf(a).form))}); continue; }
    const reasons = tendency.filter(t => rel.options[t.option] === t.value).map(t => ({from: styleContext.id, to: rel.id, type: 'prefers', priority: t.priority, reason: t.reason}));
    if (rel.primaryContexts.includes(context)) reasons.push({from: rel.id, to: styleContext.id, type: 'prefers', priority: 30, reason: `${rel.id}의 기본 페이지 유형이 ${context}이다`});
    ranked.push({id: rel.id, score: reasons.reduce((a, r) => a + r.priority, 0), reasons});
  }
  ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const reasons = ranked.length ? [] : blocked.length ? blocked.map(b => ({code: b.code, id: b.id, reason: b.reason})) : [{code: 'P_RECOMMEND_NO_CANDIDATE', id: null, reason: `${context} 페이지 유형에 맞는 차트 프리셋이 없다`}];
  return {ranked, blocked, reasons};
}

const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});

/**
 * 차트 프리셋 조립. request: {preset, context, profile?: {kinds}, data?: {categories, series, ...}, tokens?: {'--kit-*': 값}, colorRoles?: boolean}
 * 반환: {ok, html, css, requires, missing, colorRoles, relation, diagnostics}
 *   html     렌더러가 낸 그림과 데이터 표(같은 입력은 같은 바이트)
 *   css      차트 부품 CSS(src/styles의 차트 조각 + 2.6.0 확장). 플랫폼 :root가 값을 주는 변수만 읽는 것이 아니므로 requires를 함께 낸다
 *   requires 출력(html+css)이 기본값 없이 읽는 `--kit-*` 변수. tokens를 주면 값이 없는 것을 missing에 남긴다
 *   colorRoles 히트맵·폭포·도넛이 순차·발산·범주형 6색 변수를 읽게 바꿨는가. 생략하면 tokens가 그 변수를 모두 줄 때만 켠다. 켜지 않은 html은 렌더러 출력과 바이트가 같다
 * 거부 코드: P_CHART_PRESET(없는 프리셋) · P_CHART_CONTEXT·P_CHART_PAGETYPE(페이지 유형) · P_CHART_PROFILE_KIND(프로필 형태) · P_CHART_RENDER(데이터가 렌더 규칙에 걸림)
 */
export function assembleChartPreset(request) {
  const fail = diagnostics => ({ok: false, html: null, css: null, requires: [], missing: [], colorRoles: false, relation: null, diagnostics});
  if (request === null || typeof request !== 'object' || Array.isArray(request)) return fail([diag('P_REQUEST', '$', '요청은 객체여야 합니다')]);
  const allowed = ['preset', 'context', 'profile', 'data', 'tokens', 'colorRoles'];
  const keys = Object.keys(request).filter(k => !allowed.includes(k));
  if (keys.length) return fail(keys.map(k => diag('P_REQUEST_KEY', `$.${k}`, `지원하지 않는 키: ${k}. 임의 SVG·CSS 경로는 없습니다`, {alternatives: allowed})));
  const rel = chartRelationOf(request.preset);
  if (!rel) return fail([diag('P_CHART_PRESET', '$.preset', `등록되지 않은 차트 프리셋: ${request.preset}`, {alternatives: CHART_PRESET_RELATIONS.map(r => r.id)})]);
  const verdict = chartContextVerdict(rel.form, request.context);
  if (!verdict.ok) return {...fail([diag(verdict.code, '$.context', `${rel.id}(${rel.form}) × ${request.context}: ${verdict.reason}`, {alternatives: CHART_PRESET_RELATIONS.filter(r => chartContextVerdict(r.form, request.context).ok && r.dataType === rel.dataType).map(r => r.id)})]), relation: rel};
  if (request.profile && !request.profile.kinds?.includes(rel.form)) {
    const alternatives = rel.alternatives.filter(a => request.profile.kinds.includes(chartRelationOf(a).form) && chartContextVerdict(chartRelationOf(a).form, request.context).ok);
    return {...fail([diag('P_CHART_PROFILE_KIND', '$.profile', `${rel.id}의 형태 ${rel.form}은 프로필이 허용한 차트 형태(${request.profile.kinds.join(', ') || '없음'})가 아닙니다`, {alternatives})]), relation: rel};
  }
  // 색 역할: true면 항상, 생략하면 tokens가 그 형태의 변수를 모두 줄 때만(변수 없는 화면에서 색이 사라지지 않게), false면 쓰지 않는다. 쓰지 않은 출력은 렌더러 출력 그대로다.
  const roleVars = chartColorRoleVars(rel.form);
  const colorRoles = request.colorRoles === true ? roleVars.length > 0 : request.colorRoles === false || !request.tokens ? false : roleVars.length > 0 && roleVars.every(v => Object.hasOwn(request.tokens, v));
  const html = renderChartPreset(request.preset, request.data ?? {}, {colorRoles});
  if (typeof html !== 'string') return {...fail((html.errors ?? []).map(e => diag('P_CHART_RENDER', '$.data', `${e.code}: ${e.message}`))), relation: rel};
  const css = `${chunks.chart.trim()}\n${chartExtensionCSS().trim()}`;
  const requires = [...new Set([...(html + css).matchAll(/var\((--kit-[A-Za-z0-9-]+)\)/g)].map(m => m[1]))].sort();
  const missing = request.tokens ? requires.filter(v => !Object.hasOwn(request.tokens, v)) : [];
  return {ok: true, html, css, requires, missing, colorRoles, relation: rel, diagnostics: []};
}

/** 프로필 `charts.presets`에 적힌 프리셋 목록(프로필 id → 프리셋 id[]). 프로필 데이터는 읽기만 한다. */
export const PROFILE_LISTED_PRESETS = Object.freeze(Object.fromEntries(Object.entries(PROFILES).map(([id, p]) => [id, [...p.charts.presets]])));

/**
 * 프로필에 적힌 프리셋 하나가 플랫폼 경로에서 어떻게 되는지. 프로필의 페이지 유형(`contexts`)마다 판정한다.
 *   byContext   프로필 형태 제한 없이 페이지 유형 규칙만 적용(플랫폼 조립)
 *   byProfile   프로필의 charts.kinds까지 적용. 형태가 목록 밖이면 P_CHART_PROFILE_KIND와 대안으로 거부
 * 반환: {profile, preset, form, kinds, byContext: {유형: {ok, code?}}, byProfile: {...}, alternatives}
 */
export function profileChartVerdict(profileId, presetId) {
  const p = PROFILES[profileId], rel = chartRelationOf(presetId);
  const run = (context, profile) => { const r = assembleChartPreset({preset: presetId, context, profile}); return {ok: r.ok, code: r.diagnostics[0]?.code ?? null, message: r.diagnostics[0]?.message ?? null, alternatives: r.diagnostics[0]?.alternatives ?? []}; };
  const profile = {kinds: p.charts.kinds};
  return {
    profile: profileId, preset: presetId, form: rel.form, kinds: [...p.charts.kinds],
    byContext: Object.fromEntries(p.contexts.map(c => [c, run(c, null)])), byProfile: Object.fromEntries(p.contexts.map(c => [c, run(c, profile)])),
    alternatives: rel.alternatives.filter(a => p.charts.kinds.includes(chartRelationOf(a).form)),
  };
}
