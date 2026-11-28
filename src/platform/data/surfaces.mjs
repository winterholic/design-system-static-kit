/**
 * 표면 프리셋(테마·기타 재료 작업 소유, ADR 0012 §3). 카드·패널·팝업이 쓰는 반경·경계·그림자의 단계 묶음이다.
 *
 * 표면 재료는 `base`(카드·패널) → `raised`(호버·메뉴) → `overlay`(모달·팝오버) 세 단계를 가진다. 단계마다 반경, 깊이(경계+그림자), 채움 색 역할을 정한다.
 * 값은 새로 정하지 않는다: 반경은 `RADIUS`, 깊이는 `ELEVATION`(src/styles/base.mjs의 축 값 표)에서 이름으로 읽고, 안쪽 여백은 간격 계약의 토큰(src/spacing.mjs)만 쓴다.
 * 색은 색 역할 변수(COLOR_ROLES)만 읽으므로 어떤 팔레트×서브토큰 세트에도 쓴다.
 *
 * 이 파일은 표면·모션·배경·미디어·상태·간격·아이콘 재료가 함께 쓰는 정의 도우미도 둔다.
 * 각 의미 검사와 플랫폼 레지스트리 필드는 src/platform/contract.mjs 및 이 파일의 STYLE_MATERIAL_SPECS에 맞춘다.
 */
import {RADIUS, ELEVATION} from '../../styles/base.mjs';
import {COMMON_FIELDS, COLOR_ROLES, ID_PATTERN, LICENSES, QUALITY, validateEdge, definePlatformMaterial} from '../contract.mjs';

/** 계약에 아직 없는 재료 종류. 순서는 문서 표 순서다. */
export const STYLE_MATERIAL_KINDS = Object.freeze(['surface', 'motion', 'background', 'media', 'state-pattern', 'spacing', 'icon']);

/**
 * 종류별 필드(계약 KIND_SPECS와 같은 type 문법).
 *   axes  이 재료가 구현하는 스타일 축 값(스타일 맥락의 축 선호와 맞춰 순위를 낸다). 공통
 *   uses  재료가 쓰는 축 값 전부. 스타일 맥락이 금지한 값을 하나라도 쓰면 후보에서 뺀다(차단)
 */
export const STYLE_MATERIAL_SPECS = Object.freeze({
  surface: Object.freeze({axes: 'object', uses: 'object', levels: 'object', pairs: 'array', facets: 'array'}),
  motion: Object.freeze({axes: 'object', uses: 'object', duration: 'object', easing: 'object', lift: 'string', enterY: 'string', transitions: 'array', keyframes: 'array', patterns: 'array'}),
  background: Object.freeze({axes: 'object', uses: 'object', page: 'object', deco: 'object', stops: 'array', pairs: 'array'}),
  media: Object.freeze({axes: 'object', uses: 'object', icon: 'object', tile: 'object', photo: 'object', caption: 'string', pairs: 'array'}),
  'state-pattern': Object.freeze({axes: 'object', uses: 'object', state: 'string', layout: 'string', role: 'string', live: 'string', busy: 'boolean', icon: 'string', tone: 'string', parts: 'array', pairs: 'array'}),
  spacing: Object.freeze({density: 'string', tokens: 'object', roles: 'object', axes: 'object', uses: 'object'}),
  icon: Object.freeze({area: 'string', symbols: 'array', viewBox: 'string', size: 'number', minSize: 'number', strokeWidth: 'number', alignment: 'string', family: 'string', uses: 'object'}),
});

const TYPE_OF = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const fits = (spec, v) => { const opt = spec.endsWith('?'), t = opt ? spec.slice(0, -1) : spec; return (opt && v === null) || TYPE_OF(v) === t; };
const FILL_ROLES = ['surface', 'soft', 'canvas'];

/** 빈 필드를 채운 스타일 재료. 종류별 필드는 호출자가 채운다. */
export const defineStyleMaterial = input => definePlatformMaterial(input);

/** 재료 한 장의 모양 검사(공통 필드·종류별 필드·관계·품질). 종류별 의미 검사는 각 데이터 파일의 validate*가 더한다. */
export function validateStyleMaterialShape(m) {
  const out = [], err = (code, path, message) => out.push({code, path, message});
  if (TYPE_OF(m) !== 'object') return [{code: 'P_SHAPE', path: '$', message: '재료는 객체여야 합니다'}];
  const spec = STYLE_MATERIAL_SPECS[m.kind];
  if (!spec) return [{code: 'P_KIND', path: '$.kind', message: `모르는 스타일 재료 종류: ${m.kind}. 허용: ${STYLE_MATERIAL_KINDS.join(', ')}`}];
  const fields = {...COMMON_FIELDS, ...spec};
  for (const k of Object.keys(m)) if (!Object.hasOwn(fields, k)) err('P_FIELD', `$.${k}`, `${m.kind}에 없는 필드: ${k}`);
  for (const [k, t] of Object.entries(fields)) {
    if (!Object.hasOwn(m, k)) err('P_FIELD', `$.${k}`, `필수 필드 없음: ${k}`);
    else if (!fits(t, m[k])) err('P_TYPE', `$.${k}`, `${k}는 ${t}여야 합니다`);
  }
  if (out.length) return out;
  const idm = ID_PATTERN.exec(m.id);
  if (!idm || idm[1] !== m.kind) err('P_ID', '$.id', `id는 \`${m.kind}:<name>\`입니다: ${m.id}`);
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) err('P_VERSION', '$.version', 'version은 semver입니다');
  if (!LICENSES.includes(m.source.license)) err('P_LICENSE', '$.source.license', `라이선스는 ${LICENSES.join('·')}만 등록합니다`);
  if (!QUALITY.includes(m.quality.status)) err('P_QUALITY', '$.quality.status', `품질은 ${QUALITY.join('·')} 중 하나입니다`);
  if (m.quality.status === 'verified' && !m.quality.evidence?.some(x => /^tests\/[\w.-]+\.test\.mjs:\d+$/.test(x))) err('P_EVIDENCE', '$.quality.evidence', 'verified는 tests/<file>.test.mjs:<line> 근거가 필요합니다');
  if (!m.contexts.length) err('P_CONTEXTS', '$.contexts', '맥락(페이지 유형 또는 any)이 하나 이상 필요합니다');
  m.relations.forEach((e, i) => out.push(...validateEdge(e, `$.relations[${i}]`)));
  return out;
}

/** 재료의 대비 쌍 [전경 역할, 배경 역할, 최소 대비]가 역할 이름이고 값이 숫자인지. 실제 대비는 시험이 결합된 색으로 잰다. */
export function pairErrors(m) {
  const out = [];
  for (const [i, p] of (m.pairs ?? []).entries()) {
    if (!Array.isArray(p) || p.length !== 3 || !Object.hasOwn(COLOR_ROLES, p[0]) || !Object.hasOwn(COLOR_ROLES, p[1]) || typeof p[2] !== 'number') out.push({code: 'P_PAIR', path: `$.pairs[${i}]`, message: '대비 쌍은 [전경 역할, 배경 역할, 최소 대비]입니다'});
  }
  return out;
}

const lvl = (radius, elevation, fill = 'surface') => ({radius, elevation, fill});

/** 이 재료를 실패시킬 수 있는 테스트 줄을 달아 verified로 올린다(WBS 공통 규칙: 근거 없는 verified 금지). */
export const verifiedBy = evidence => m => ({...m, quality: {status: 'verified', evidence: [...evidence]}});
const EVIDENCE = ['tests/platform-style-materials.test.mjs:39'];

/** Selectable radius/border/elevation primitives; double borders are restricted to pricing and form surfaces. */
export const SURFACE_FACETS = Object.freeze([
  {id: 'sharp', radius: '0', border: 'none', elevation: 'flat'},
  {id: 'subtle', radius: '4px', border: 'none', elevation: 'flat'},
  {id: 'rounded', radius: '10px', border: 'standard', elevation: 'soft'},
  {id: 'large-rounded', radius: '28px', border: 'none', elevation: 'lifted'},
  {id: 'pill', radius: '999px', border: 'none', elevation: 'flat'},
  {id: 'mixed-radius', radius: '18px 18px 4px 4px', border: 'standard', elevation: 'soft'},
  {id: 'hairline-border', radius: '4px', border: 'hairline', elevation: 'flat'},
  {id: 'standard-border', radius: '10px', border: 'standard', elevation: 'flat'},
  {id: 'strong-border', radius: '4px', border: 'strong', elevation: 'outline'},
  {id: 'double-border', radius: '4px', border: 'double', elevation: 'flat', contexts: ['form', 'pricing']},
  {id: 'flat-surface', radius: '10px', border: 'none', elevation: 'flat'},
  {id: 'subtle-elevation', radius: '10px', border: 'hairline', elevation: 'soft'},
  {id: 'medium-elevation', radius: '10px', border: 'none', elevation: 'lifted'},
  {id: 'deep-elevation', radius: '10px', border: 'none', elevation: 'deep'},
  {id: 'hard-offset', radius: '0', border: 'strong', elevation: 'hard'},
  {id: 'glow', radius: '18px', border: 'none', elevation: 'glow'},
  {id: 'inset', radius: '10px', border: 'hairline', elevation: 'inset'},
].map(Object.freeze));

/**
 * 깊이 단계 중 축 값 표(ELEVATION)에 없는 두 칸. 표 자체를 바꾸면 2.1~2.4 고정 출력이 변하므로 facet에서만 쓴다.
 * deep은 lifted(medium)보다 번짐과 오프셋이 뚜렷이 커서 Medium/Deep Elevation이 같은 그림자가 되지 않게 한다.
 */
export const FACET_SHADOW = Object.freeze({
  inset: 'inset 0 2px 6px var(--kit-shade)',
  deep: '0 4px 8px var(--kit-shade),0 32px 64px -16px var(--kit-shade)',
});

/**
 * 표면 프리셋 5개. 서로 눈에 띄게 다르다: 단계 9칸(3단계 × 반경·깊이·채움) 중 3칸 이상 달라야 한다(시험이 쌍마다 센다).
 * 모양 → 쓰임: hairline은 표·목록 중심 업무 화면, soft-layered는 일반 제품, hard-offset은 포스터형, glow-glass는 어두운 면 위 강조, tonal-sheet는 읽기·문서.
 */
export const SURFACES = Object.freeze([
  defineStyleMaterial({
    id: 'surface:hairline-panel', kind: 'surface', label: '헤어라인 패널', contexts: ['any'], tags: ['outline', 'dense', 'work'],
    axes: {radius: 'subtle', elevation: 'outline'}, uses: {radius: ['subtle', 'soft'], elevation: ['outline', 'soft']},
    levels: {base: lvl('subtle', 'outline'), raised: lvl('subtle', 'outline'), overlay: lvl('soft', 'soft')},
    pairs: [['text', 'surface', 4.5], ['muted', 'surface', 4.5]], reuses: ['axis:elevation', 'axis:radius'],
  }),
  defineStyleMaterial({
    id: 'surface:soft-layered', kind: 'surface', label: '부드러운 겹침', contexts: ['any'], tags: ['shadow', 'product'],
    axes: {radius: 'soft', elevation: 'soft'}, uses: {radius: ['soft', 'round'], elevation: ['soft', 'lifted']},
    levels: {base: lvl('soft', 'soft'), raised: lvl('soft', 'lifted'), overlay: lvl('round', 'lifted')},
    pairs: [['text', 'surface', 4.5], ['muted', 'surface', 4.5]], reuses: ['axis:elevation', 'axis:radius'],
  }),
  defineStyleMaterial({
    id: 'surface:hard-offset', kind: 'surface', label: '굵은 윤곽과 오프셋', contexts: ['landing', 'portfolio', 'blog', 'commerce', 'pricing', 'general'], tags: ['hard', 'poster', 'brand'],
    axes: {radius: 'square', elevation: 'hard'}, uses: {radius: ['square'], elevation: ['hard']},
    levels: {base: lvl('square', 'hard'), raised: lvl('square', 'hard'), overlay: lvl('square', 'hard', 'canvas')},
    pairs: [['text', 'surface', 4.5], ['text', 'canvas', 4.5]], reuses: ['axis:elevation', 'axis:radius'],
  }),
  defineStyleMaterial({
    id: 'surface:glow-glass', kind: 'surface', label: '브랜드 글로우', contexts: ['landing', 'pricing', 'dashboard', 'portfolio', 'community', 'listing'], tags: ['glow', 'dark', 'brand'],
    axes: {radius: 'round', elevation: 'glow'}, uses: {radius: ['round'], elevation: ['glow']},
    levels: {base: lvl('round', 'glow'), raised: lvl('round', 'glow'), overlay: lvl('round', 'glow')},
    pairs: [['text', 'surface', 4.5], ['muted', 'surface', 4.5]], reuses: ['axis:elevation', 'axis:radius'],
  }),
  defineStyleMaterial({
    id: 'surface:tonal-sheet', kind: 'surface', label: '톤 시트(경계·그림자 없음)', contexts: ['any'], tags: ['flat', 'tonal', 'read'],
    axes: {radius: 'soft', elevation: 'flat'}, uses: {radius: ['soft', 'square'], elevation: ['flat', 'outline']},
    levels: {base: lvl('soft', 'flat', 'soft'), raised: lvl('soft', 'flat', 'surface'), overlay: lvl('square', 'outline', 'surface')},
    pairs: [['text', 'soft', 4.5], ['text', 'surface', 4.5], ['muted', 'soft', 4.5]], reuses: ['axis:elevation', 'axis:radius'],
  }),
].map(verifiedBy(EVIDENCE)).map(m => ({...m, facets: SURFACE_FACETS})));

/** 표면 종류의 의미 검사: 반경·깊이 이름이 값 표에 있고, uses가 단계에서 쓴 값을 모두 덮는다. */
export function validateSurface(m) {
  const out = [...validateStyleMaterialShape(m), ...pairErrors(m)];
  if (out.length) return out;
  const err = (code, path, message) => out.push({code, path, message});
  if (m.facets.length !== SURFACE_FACETS.length || m.facets.some((f, i) => f.id !== SURFACE_FACETS[i].id)) err('P_SURFACE_FACETS', '$.facets', '17개 표면 primitive를 REQUEST 순서대로 모두 제공해야 합니다');
  for (const [i, f] of m.facets.entries()) {
    if (!/^(?:0|\d+px|\d+px \d+px \d+px \d+px)$/.test(f.radius)) err('P_SURFACE_FACET_RADIUS', `$.facets[${i}].radius`, 'radius는 격자 기반 px 모서리 값이어야 합니다');
    if (!['none', 'hairline', 'standard', 'strong', 'double'].includes(f.border)) err('P_SURFACE_FACET_BORDER', `$.facets[${i}].border`, '알 수 없는 테두리 단계입니다');
    if (!Object.hasOwn(FACET_SHADOW, f.elevation) && !Object.hasOwn(ELEVATION, f.elevation)) err('P_SURFACE_FACET_ELEVATION', `$.facets[${i}].elevation`, '알 수 없는 깊이 단계입니다');
    if (f.border === 'double' && JSON.stringify(f.contexts) !== JSON.stringify(['form', 'pricing'])) err('P_SURFACE_DOUBLE_CONTEXT', `$.facets[${i}].contexts`, '이중 테두리는 form·pricing 맥락에만 허용합니다');
  }
  for (const level of ['base', 'raised', 'overlay']) {
    const l = m.levels[level];
    if (!l) { err('P_SURFACE_LEVEL', `$.levels.${level}`, `단계 ${level}이 없습니다`); continue; }
    if (!Object.hasOwn(RADIUS, l.radius)) err('P_SURFACE_RADIUS', `$.levels.${level}.radius`, `모르는 반경: ${l.radius}`);
    if (!Object.hasOwn(ELEVATION, l.elevation)) err('P_SURFACE_ELEVATION', `$.levels.${level}.elevation`, `모르는 깊이: ${l.elevation}`);
    if (!FILL_ROLES.includes(l.fill)) err('P_SURFACE_FILL', `$.levels.${level}.fill`, `채움 역할은 ${FILL_ROLES.join('·')}입니다`);
    if (!(m.uses.radius ?? []).includes(l.radius) || !(m.uses.elevation ?? []).includes(l.elevation)) err('P_SURFACE_USES', `$.uses`, `uses가 ${level} 단계의 값(${l.radius}, ${l.elevation})을 덮지 않습니다`);
  }
  if (m.levels.base && (m.axes.radius !== m.levels.base.radius || m.axes.elevation !== m.levels.base.elevation)) err('P_SURFACE_AXES', '$.axes', 'axes는 base 단계의 반경·깊이입니다');
  return out;
}

const name = m => m.id.slice(m.kind.length + 1);

/** 표면 프리셋 CSS. `[data-surface="<이름>"] .kit-surface[data-level]`에 범위를 둔다(한 화면에 표면 프리셋이 여럿이어도 서로 덮지 않는다). */
export function surfaceCSS(m) {
  const sel = `[data-surface="${name(m)}"]`;
  const rules = Object.entries(m.levels).map(([level, l]) => {
    const el = ELEVATION[l.elevation];
    return `${sel} .kit-surface[data-level="${level}"]{background:var(${COLOR_ROLES[l.fill]});color:var(--kit-text);border:${el.border};border-radius:${RADIUS[l.radius]}px;box-shadow:${el.shadow};padding:var(--kit-inset);transition:box-shadow var(--kit-dur) var(--kit-ease),transform var(--kit-dur) var(--kit-ease)}`;
  });
  const hover = ELEVATION[m.levels.raised.elevation].hover;
  rules.push(`${sel} .kit-surface[data-level="raised"]:hover{box-shadow:${hover}}`);
  const borders = {none: '0', hairline: '1px solid var(--kit-border)', standard: '1px solid var(--kit-rule)', strong: '2px solid var(--kit-text)', double: '3px double var(--kit-border)'};
  for (const f of m.facets) {
    const shadow = FACET_SHADOW[f.elevation] ?? ELEVATION[f.elevation].shadow;
    const context = f.contexts ? `:is(${f.contexts.map(c => `[data-context="${c}"]`).join(',')}) ` : '';
    // `.kit-surface[data-level]`(단계 규칙)과 함께 달려도 facet이 이기도록 명시도를 한 단계 높인다.
    rules.push(`${context}${sel} :is([data-surface-facet="${f.id}"],.kit-surface[data-level][data-surface-facet="${f.id}"]){border-radius:${f.radius};border:${borders[f.border]};box-shadow:${shadow};padding:var(--kit-inset)}`);
  }
  rules.push(`${sel}.kit-facet-demo{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--kit-gap)}`);
  rules.push(`${sel} .kit-surface :is(h3,p){margin:0}${sel} .kit-surface h3+p{margin-top:var(--kit-sp-near)}`);
  return rules.join('\n');
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** 표면 프리셋 마크업: 세 단계 표면 각각에 제목과 본문 한 줄. */
export function renderSurfaceSample(m, {title = '표면', body = '경계와 그림자가 단계를 나눕니다.'} = {}) {
  const level = {base: '기본', raised: '떠오름', overlay: '겹침'};
  return `<div class="kit-surface-demo" data-surface="${name(m)}">${Object.keys(m.levels).map(l => `<section class="kit-surface" data-level="${l}"><h3>${escapeHTML(title)} · ${level[l]}</h3><p>${escapeHTML(body)}</p></section>`).join('')}</div>`;
}

/** 표면 facet 17개의 샘플 마크업. 이중 테두리는 form·pricing 맥락에서만 열리므로 맥락 래퍼를 둔다. */
export function renderSurfaceFacetSample(m, {context = 'form'} = {}) {
  return `<div data-context="${context}"><div class="kit-surface-demo kit-facet-demo" data-surface="${name(m)}">${m.facets.map(f => `<section class="kit-surface" data-level="base" data-surface-facet="${f.id}"><h3>${f.id}</h3><p>${f.radius} · ${f.border} · ${f.elevation}</p></section>`).join('')}</div></div>`;
}
