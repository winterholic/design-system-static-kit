/**
 * 독립 타이포그래피 시스템(ADR 0012 §2). 타이포 시스템 = 서체 짝(facePairing) × 역할 크기 체계(roleScale) × 숫자 정렬(numerals).
 *
 * - 서체 짝 id는 `face-pairing:<id>`(data/type-materials.mjs) 또는 구형 `type-preset:<id>`(src/typography.mjs TYPE_R2)다.
 * - 역할 크기 체계 id는 `role-scale:<id>`(맥락별 설계 13 · 구형 역할형 4 · 구형 모듈러 18, data/type-materials.mjs) 또는 구형 `type-role-preset:<id>`다.
 * - 현재 2.6.0 컴파일(renderRoleTypeCSS)은 역할형 프리셋이 서체까지 덮어써서 서체 축 선택이 사라진다(docs/platform/audit-2026-11.md Q2).
 *   여기서는 서체는 서체 짝에서만, 크기·굵기·행간·자간은 역할 체계에서만 가져와 두 축이 서로를 지우지 않게 한다. src/typography.mjs와 src/materials/typography.mjs는 읽기만 한다.
 * - 구형 둘의 조합(type-preset × type-role-preset)은 2.6.0 값을 그대로 낸다(`tech-erp`). 그 밖의 조합은 역할 9개를 모바일·데스크톱 px로 결합한다.
 * - 한글 한도는 엔진 HANGUL 값과 그 위에 얹은 플랫폼 한도(아래 FLOORS)로 검사한다. 걸리면 P_CHECK_TYPE_HANGUL로 거부한다.
 */
import {STACKS, TYPE_R2, HANGUL, ROLES} from '../typography.mjs';
import {MATERIAL_TYPE_PRESETS, clampBounds} from '../materials/typography.mjs';
import {TYPE_ROLES} from './contract.mjs';
import {FACE_PAIRINGS, SERIF_STACKS, SCALE_ROLES, WEBFONTS, WEBFONT_LOADING, PLATFORM_FONTS, HANGUL_FAMILIES, resolveRoleScale} from './data/type-materials.mjs';
import {TYPE_FIT} from './data/type-systems.mjs';

const strip = (prefix, id) => (typeof id === 'string' && id.startsWith(prefix + ':') ? id.slice(prefix.length + 1) : null);
const SERIF_STACK_VALUES = new Set([...SERIF_STACKS].map(n => STACKS[n]));
const SYSTEM_IDS = ['tabular', 'proportional'];

/** 타이포 작업이 소유하는 계산 관계 목록. 서체 짝 × 역할 체계 검사는 한 기록 안의 일이라 bindType 오류로 내고, 다른 종류와의 관계가 생기면 여기에 더한다. */
export const TYPE_CHECKS = Object.freeze([]);

// ---------- 크기 ----------
/** 모바일 폭(390px)에서 모바일 px, 데스크톱 폭(1280px)에서 데스크톱 px가 되는 선형 보간. 두 값이 같으면 고정 px. */
export const VIEWPORT = Object.freeze({mobile: 390, desktop: 1280});
const num = n => +n.toFixed(3);
export const fluidPx = (m, d) => (m === d ? `${num(d)}px` : `clamp(${num(m)}px,calc(${num(m)}px + ${num(d - m)} * (100vw - ${VIEWPORT.mobile}px) / ${VIEWPORT.desktop - VIEWPORT.mobile}),${num(d)}px)`);
/** 구형 크기 문자열('20px' 또는 'clamp(…rem,…vw,…rem)') → {mobile, desktop}. */
export function parseSize(size) {
  const px = /^([\d.]+)px$/.exec(size);
  if (px) return {mobile: +px[1], desktop: +px[1]};
  const b = clampBounds(size);
  return {mobile: b.min, desktop: b.max};
}

// ---------- 한글 한도 ----------
/**
 * 엔진 한도(HANGUL)에 플랫폼이 더한 한도. 엔진 값은 그대로 읽고, 엔진에 없는 역할(small·label·caption·code)만 잉크 높이로 정한다.
 * 한글 음절의 잉크 높이는 약 0.91em이라 행간 1.25면 줄 사이 흰 띠가 0.34em이다(src/typography.mjs HANGUL 주석). 이 띠를 하한으로 삼는다.
 * px 하한은 엔진이 본문 16px·label 13px·caption 12px를 고정 px로 두는 것(ROLES)보다 낮춘 값이다: 컴팩트 시스템이 본문 14px를 쓸 수 있게 한다. 한글 가독성 근거는 실측 전이라 확인 필요.
 */
export const FLOORS = Object.freeze({
  px: Object.freeze({body: 14, small: 12, label: 12, caption: 11, code: 12}),
  leading: Object.freeze({small: 1.4, caption: 1.35, label: 1.25, code: 1.4}),
  /** 산세리프 제목 굵기 바닥. 600 아래는 본문 대비 가늘어 보인다(src/typography.mjs typeVars 주석, 5차 실측). */
  sansHeadingWeight: 600,
  /** 제목 단 사이 최소 간격(px). 좁은 화면에서도 위계가 뒤집히지 않게 한다(엔진 ROLES minAfter와 같은 값). */
  gap: Object.freeze({headingOverSub: 3, displayOverHeading: 4}),
});
const BANDS = Object.freeze({
  display: {track: HANGUL.track.display, lh: HANGUL.leading.display, cap: HANGUL.caps.display},
  heading: {track: HANGUL.track.heading, lh: HANGUL.leading.heading, cap: HANGUL.caps.heading},
  sub: {track: HANGUL.track.sub, lh: HANGUL.leading.sub, cap: ROLES.sub.cap},
});

/**
 * 역할 객체({역할: {sizePx:{mobile,desktop}, weight, lineHeight, trackingEm, serif}}) → [{code, rule, role, message}].
 * 세리프 굵기는 P_TYPE_HANGUL_WEIGHT(파이프라인이 P_CHECK_TYPE_HANGUL로 옮긴다), 나머지는 처음부터 P_CHECK_TYPE_HANGUL이다.
 * 세리프 한글 서체(AppleMyungjo·Batang·Nanum Myeongjo)는 굵기가 한 벌이라 serifHangulWeightMax를 넘는 굵기는 라틴만 더 굵어진다.
 */
export function hangulViolations(roles, label = '') {
  const out = [], tag = label ? `${label}: ` : '';
  const at = (code, rule, role, message) => out.push({code, rule, role, message: tag + message});
  for (const name of SCALE_ROLES) {
    const r = roles[name]; if (!r) continue;
    if (r.serif && r.weight > HANGUL.serifHangulWeightMax) at('P_TYPE_HANGUL_WEIGHT', 'serif-weight', name, `세리프 ${name} 굵기 ${r.weight}는 한글 세리프 굵기 상한 ${HANGUL.serifHangulWeightMax}를 넘습니다`);
  }
  for (const name of ['display', 'heading', 'sub']) {
    const r = roles[name]; if (!r || r.serif || r.weight >= FLOORS.sansHeadingWeight) continue;
    at('P_CHECK_TYPE_HANGUL', 'sans-weight-floor', name, `산세리프 ${name} 굵기 ${r.weight}는 바닥 ${FLOORS.sansHeadingWeight} 아래라 본문보다 가늘어 보입니다`);
  }
  for (const [name, b] of Object.entries(BANDS)) {
    const r = roles[name]; if (!r) continue;
    if (r.trackingEm < b.track) at('P_CHECK_TYPE_HANGUL', 'tracking-floor', name, `${name} 자간 ${r.trackingEm}em가 한글 하한 ${b.track}em보다 좁습니다(굵은 한글 음절이 이웃과 닿습니다)`);
    if (r.lineHeight < b.lh) at('P_CHECK_TYPE_HANGUL', 'leading-floor', name, `${name} 행간 ${r.lineHeight}가 한글 하한 ${b.lh}보다 좁습니다`);
    const max = Math.max(r.sizePx.mobile, r.sizePx.desktop);
    if (max > b.cap) at('P_CHECK_TYPE_HANGUL', 'size-cap', name, `${name} 크기 ${max}px가 한글 상한 ${b.cap}px를 넘습니다`);
  }
  const body = roles.body;
  if (body && (body.lineHeight < HANGUL.body[0] || body.lineHeight > HANGUL.body[1])) at('P_CHECK_TYPE_HANGUL', 'body-leading', 'body', `본문 행간 ${body.lineHeight}가 한글 본문 범위 ${HANGUL.body.join('~')} 밖입니다`);
  if (roles.label && roles.label.trackingEm > HANGUL.labelMax) at('P_CHECK_TYPE_HANGUL', 'label-tracking', 'label', `라벨 자간 ${roles.label.trackingEm}em가 상한 ${HANGUL.labelMax}em를 넘습니다(한글에는 대소문자가 없어 넓은 자간은 음절만 떼어 놓습니다)`);
  for (const [name, floor] of Object.entries(FLOORS.px)) {
    const r = roles[name]; if (!r) continue;
    const min = Math.min(r.sizePx.mobile, r.sizePx.desktop);
    if (min < floor) at('P_CHECK_TYPE_HANGUL', 'size-floor', name, `${name} 크기 ${min}px가 플랫폼 하한 ${floor}px보다 작습니다`);
  }
  for (const [name, floor] of Object.entries(FLOORS.leading)) {
    const r = roles[name]; if (!r) continue;
    if (r.lineHeight < floor) at('P_CHECK_TYPE_HANGUL', 'leading-floor', name, `${name} 행간 ${r.lineHeight}가 한글 하한 ${floor}보다 좁습니다`);
  }
  return out;
}

/** 위계 불변식: 모바일·데스크톱 어느 쪽에서도 display > heading > sub 간격이 유지되고, 제목 단은 데스크톱에서 줄지 않는다. [{code:'P_TYPE_HIERARCHY', message}]. */
export function hierarchyViolations(roles, label = '') {
  const out = [], tag = label ? `${label}: ` : '', err = message => out.push({code: 'P_TYPE_HIERARCHY', message: tag + message});
  for (const vp of ['mobile', 'desktop']) {
    const d = roles.display.sizePx[vp], h = roles.heading.sizePx[vp], s = roles.sub.sizePx[vp], b = roles.body.sizePx[vp];
    if (d - h < FLOORS.gap.displayOverHeading) err(`${vp}: display ${d}px가 heading ${h}px보다 ${FLOORS.gap.displayOverHeading}px 이상 커야 합니다`);
    if (h - s < FLOORS.gap.headingOverSub) err(`${vp}: heading ${h}px가 sub ${s}px보다 ${FLOORS.gap.headingOverSub}px 이상 커야 합니다`);
    if (s <= b) err(`${vp}: sub ${s}px가 body ${b}px보다 커야 합니다`);
  }
  for (const n of ['display', 'heading', 'sub']) if (roles[n].sizePx.mobile > roles[n].sizePx.desktop) err(`${n}는 모바일(${roles[n].sizePx.mobile}px)이 데스크톱(${roles[n].sizePx.desktop}px)보다 클 수 없습니다`);
  return out;
}

/** 서체 짝 id → {id, head, text, ui, numeric, code, webfonts[]}. 구형 type-preset도 같은 모양으로 읽는다(ui·numeric은 본문 서체). */
export function resolveFace(id) {
  if (FACE_PAIRINGS[id]) return FACE_PAIRINGS[id];
  const legacy = TYPE_R2[strip('type-preset', id)];
  return legacy ? {id, head: legacy.head, text: legacy.text, ui: legacy.text, numeric: legacy.text, code: 'mono', webfonts: [], nums: legacy.nums} : null;
}

// ---------- 결합 ----------
const NUMS = {tabular: 'tabular-nums lining-nums', proportional: 'proportional-nums lining-nums'};

/** 웹폰트를 켰을 때 스택 맨 앞에 붙는 서체. 서체의 계열(sans·serif·mono)이 같은 역할에만 붙는다. */
function withWebfonts(stackValue, keys) {
  const cls = SERIF_STACK_VALUES.has(stackValue) ? 'serif' : stackValue === STACKS.mono ? 'mono' : 'sans';
  const lead = keys.map(k => WEBFONTS[k]).filter(w => w.class === cls).map(w => `"${w.family}"`);
  return lead.length ? `${lead.join(',')},${stackValue}` : stackValue;
}

/** 서체 짝의 웹폰트 @font-face. 서체 파일은 저장소에 없고 baseUrl 아래에 호스팅한다고 본다. 파일이 없으면 브라우저가 스택의 다음(시스템) 서체로 그린다. */
export function webfontCSS(faceId, {baseUrl = '/fonts'} = {}) {
  const f = resolveFace(faceId);
  return (f?.webfonts ?? []).map(k => {
    const w = WEBFONTS[k];
    return `@font-face{font-family:"${w.family}";src:url("${baseUrl}/${w.file}") format("woff2");font-weight:${w.weight};font-style:normal;font-display:${WEBFONT_LOADING.display};${w.unicodeRange ? `unicode-range:${w.unicodeRange};` : ''}}`;
  }).join('\n');
}
/** 서체 짝이 웹폰트를 쓸 때의 설명: 서체, 로딩 방식, 웹폰트가 없을 때 그려지는 스택. 웹폰트가 필요 없으면 null. */
export function webfontPlan(faceId) {
  const f = resolveFace(faceId);
  if (!f?.webfonts?.length) return null;
  return {required: false, loading: WEBFONT_LOADING, families: f.webfonts.map(k => ({...WEBFONTS[k]})), fallback: {heading: STACKS[f.head], body: STACKS[f.text], code: STACKS[f.code]}};
}

function bindResolved(ts, face, scale, {webfonts}) {
  const faceStack = n => STACKS[n];
  const keys = webfonts ? face.webfonts : [];
  const stacks = {heading: withWebfonts(faceStack(face.head), keys), body: withWebfonts(faceStack(face.text), keys), ui: withWebfonts(faceStack(face.ui), keys), numeric: withWebfonts(faceStack(face.numeric), keys), code: withWebfonts(faceStack(face.code), keys)};
  const familyOf = {display: 'heading', heading: 'heading', sub: 'heading', body: 'body', small: 'body', label: 'ui', caption: 'ui', numeric: 'numeric', code: 'code'};
  const roles = {};
  for (const name of SCALE_ROLES) {
    const s = scale.roles[name], plain = faceStack({heading: face.head, body: face.text, ui: face.ui, numeric: face.numeric, code: face.code}[familyOf[name]]);
    roles[name] = {size: fluidPx(s.sizePx.mobile, s.sizePx.desktop), sizePx: {...s.sizePx}, weight: s.weight, lineHeight: s.lineHeight, trackingEm: s.trackingEm, fontFamily: stacks[familyOf[name]], serif: SERIF_STACK_VALUES.has(plain), ...(s.case ? {case: s.case} : {})};
  }
  return roles;
}

/**
 * bindType(typeSystem, {webfonts: false}) → {ok, vars: {'--kit-*': 값}, roles: {역할: {size, sizePx, weight, lineHeight, trackingEm, fontFamily}}, errors: [{code, message, rule?, role?}], webfontCSS}
 * 서체 짝·역할 체계 id가 어느 표에도 없으면 ok:false. 한글 한도·위계를 어기면 errors에 담고 ok:false.
 * webfonts를 켜면 서체 짝이 가진 웹폰트를 스택 맨 앞에 붙이고 @font-face를 돌려준다. 기본(끔)은 시스템 서체만 쓰는 출력이다.
 */
export function bindType(ts, {webfonts = false} = {}) {
  const errors = [];
  const legacyFace = TYPE_R2[strip('type-preset', ts.facePairing)], legacyScale = MATERIAL_TYPE_PRESETS[strip('type-role-preset', ts.roleScale)];
  const face = resolveFace(ts.facePairing);
  const scale = legacyScale ? null : resolveRoleScale(ts.roleScale);
  if (!face) errors.push({code: 'P_TYPE_FACE', message: `모르는 서체 짝: ${ts.facePairing}`});
  if (!legacyScale && !scale) errors.push({code: 'P_TYPE_SCALE', message: `모르는 역할 크기 체계: ${ts.roleScale}`});
  if (legacyScale && !legacyFace && face) errors.push({code: 'P_TYPE_SCALE', message: `구형 역할형 ${ts.roleScale}는 구형 서체 프리셋과만 짝짓습니다. role-scale:${strip('type-role-preset', ts.roleScale)}를 쓰세요`});
  if (!SYSTEM_IDS.includes(ts.numerals)) errors.push({code: 'P_TYPE_NUMERALS', message: `숫자 정렬은 ${SYSTEM_IDS.join('·')}입니다: ${ts.numerals}`});
  if (errors.length) return {ok: false, vars: null, roles: null, errors, webfontCSS: ''};

  const label = `${ts.facePairing} × ${ts.roleScale}`;
  if (legacyFace && legacyScale) return bindLegacy(ts, legacyFace, legacyScale, label);

  const roles = bindResolved(ts, face, scale, {webfonts});
  errors.push(...hangulViolations(roles, label), ...hierarchyViolations(roles, label));
  const r = roles, app = {mobile: Math.min(r.display.sizePx.mobile, HANGUL.caps.app), desktop: Math.min(r.display.sizePx.desktop, HANGUL.caps.app)};
  const vars = {'--kit-heading': r.heading.fontFamily, '--kit-font': r.body.fontFamily, '--kit-mono': r.code.fontFamily, '--kit-hw': String(r.heading.weight), '--kit-line': String(r.body.lineHeight)};
  for (const [role, names] of Object.entries(TYPE_ROLES)) for (const n of names) vars[n] = r[role].size;
  // 앱 화면 제목(h1)은 엔진이 한글 상한 36px로 막는다(HANGUL.caps.app). display가 더 커도 앱 제목은 그 이하로 둔다.
  vars['--kit-t-app'] = fluidPx(app.mobile, app.desktop);
  Object.assign(vars, {
    '--kit-lh-title': String(r.display.lineHeight), '--kit-lh-display': String(r.display.lineHeight), '--kit-lh-heading': String(r.heading.lineHeight), '--kit-lh-sub': String(r.sub.lineHeight),
    '--kit-tr-title': `${r.display.trackingEm}em`, '--kit-tr-display': `${r.display.trackingEm}em`, '--kit-tr-heading': `${r.heading.trackingEm}em`, '--kit-tr-sub': `${r.sub.trackingEm}em`, '--kit-tr-label': `${r.label.trackingEm}em`,
    '--kit-case-label': r.label.case === 'upper' ? 'uppercase' : 'none',
    '--kit-nums': NUMS[ts.numerals === 'tabular' || scale.nums === 'tabular' ? 'tabular' : 'proportional'],
    '--kit-code-size': r.code.size, '--kit-code-lh': String(r.code.lineHeight), '--kit-font-ui': r.label.fontFamily, '--kit-font-num': r.numeric.fontFamily,
  });
  for (const name of SCALE_ROLES) Object.assign(vars, {
    [`--kit-type-${name}-size`]: r[name].size, [`--kit-type-${name}-weight`]: String(r[name].weight), [`--kit-type-${name}-leading`]: String(r[name].lineHeight), [`--kit-type-${name}-tracking`]: `${r[name].trackingEm}em`,
  });
  return {ok: errors.length === 0, vars, roles, errors, webfontCSS: webfonts ? webfontCSS(ts.facePairing) : ''};
}

/** 구형 type-preset × type-role-preset. 2.6.0 엔진과 같은 값을 낸다(이 값은 바뀌지 않는다). 한도 검사만 새 규칙으로 넓혔다. */
function bindLegacy(ts, face, scale, label) {
  const errors = [];
  const heading = STACKS[face.head], body = STACKS[face.text];
  const r = scale.roles, px = face.body;
  const roles = {
    display: {...r.display, fontFamily: heading}, heading: {...r.heading, fontFamily: heading},
    sub: {size: `${Math.min(ROLES.sub.cap, Math.round(px * face.ratio))}px`, weight: r.heading.weight, lineHeight: face.lh.sub, trackingEm: face.track.sub, fontFamily: heading},
    body: {...r.body, fontFamily: body}, small: {size: `${ROLES.small.fixed(px)}px`, weight: r.body.weight, lineHeight: face.lh.body, trackingEm: 0, fontFamily: body},
    label: {...r.label, fontFamily: body}, caption: {...r.caption, fontFamily: body}, numeric: {...r.numeric, fontFamily: body},
  };
  const checked = Object.fromEntries(Object.entries(roles).map(([n, x]) => [n, {sizePx: parseSize(x.size), weight: x.weight, lineHeight: x.lineHeight, trackingEm: x.trackingEm, serif: SERIF_STACK_VALUES.has(x.fontFamily)}]));
  // 위계 검사는 하지 않는다: 구형 역할형의 값(예: erp 모바일 heading 20px, sub 19px)은 2.6.0 출력으로 고정돼 있다.
  errors.push(...hangulViolations(checked, label));
  const vars = {'--kit-heading': heading, '--kit-font': body, '--kit-mono': STACKS.mono, '--kit-hw': String(roles.heading.weight), '--kit-line': String(roles.body.lineHeight)};
  for (const [role, names] of Object.entries(TYPE_ROLES)) for (const n of names) vars[n] = roles[role].size;
  vars['--kit-nums'] = ts.numerals === 'tabular' || face.nums === 'tabular' ? 'tabular-nums' : 'proportional-nums';
  return {ok: errors.length === 0, vars, roles, errors, webfontCSS: ''};
}

// ---------- 실제 대체 서체 ----------
/** 스택 문자열 → 서체 이름 배열(따옴표 제거, 소문자 아님). */
export const splitStack = stack => stack.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
const GENERIC = new Set(['sans-serif', 'serif', 'monospace']);
/**
 * 플랫폼에서 이 스택이 라틴·숫자와 한글을 실제로 어느 서체로 그리는지. {latin, hangul, hangulVia: 'stack'|'generic'}.
 * 스택 앞쪽에서 설치된 서체를 찾고, 한글은 한글 글리프를 가진 서체만 센다. 설치된 한글 서체가 없으면 일반 계열(generic)이 그린다.
 * 설치 목록은 PLATFORM_FONTS(macos만 측정, 나머지는 가정).
 */
const SYSTEM_UI = new Set(['system-ui', '-apple-system', 'blinkmacsystemfont']);
export function effectiveFaces(stack, platform) {
  const p = PLATFORM_FONTS[platform];
  if (!p) throw new RangeError(`unknown platform: ${platform}`);
  let latin = null, hangul = null, via = null;
  for (const fam of splitStack(stack)) {
    const k = fam.toLowerCase();
    if (GENERIC.has(k)) { latin ??= p.generics[k]; if (!hangul) { hangul = p.generics[k]; via = 'generic'; } continue; }
    const available = k === 'system-ui' || (SYSTEM_UI.has(k) ? p.appleSystem : p.installed.has(k));
    if (!available) continue;
    const name = SYSTEM_UI.has(k) ? p.systemUi : fam;
    latin ??= name;
    if (HANGUL_FAMILIES.has(k) && !hangul) { hangul = name; via = 'stack'; }
  }
  return {latin, hangul, hangulVia: via};
}

// ---------- 맥락 적합성 ----------
const whenApplies = (when, ctx) => Object.entries(when).every(([k, values]) => ctx[k] !== undefined && values.includes(ctx[k]));
/**
 * 시스템 하나가 맥락(context 페이지 유형, density, viewport)에 얼마나 맞는가. 점수 모양은 relations.score와 같다(prefers +, avoids −).
 * 반환: {id, score, reasons: [{from, type, priority, reason}]}. 표에 없는 id는 빈 결과.
 */
export function typeFit(id, ctx = {}) {
  const rows = TYPE_FIT[id] ?? [];
  const hit = rows.filter(row => whenApplies(row.when, ctx));
  return {id, score: hit.reduce((s, row) => s + (row.type === 'prefers' ? row.priority : -row.priority), 0), reasons: hit.map(row => ({from: id, type: row.type, priority: row.type === 'prefers' ? row.priority : -row.priority, reason: row.reason}))};
}
/** 등록된 타이포 시스템을 맥락에 맞는 순서로. 페이지 유형이 맞지 않는 것은 blocked로 뺀다. {ranked: [{id, score, reasons}], blocked: [{id, reason}]} */
export function rankTypeSystems(registry, ctx = {}) {
  const all = registry.kind('type-system').list(), ranked = [], blocked = [];
  for (const m of all) {
    if (ctx.context && !m.contexts.includes('any') && !m.contexts.includes(ctx.context)) { blocked.push({id: m.id, reason: `${ctx.context} 페이지 유형에 쓰는 시스템이 아닙니다(${m.contexts.join(', ')})`}); continue; }
    const f = typeFit(m.id, ctx);
    ranked.push({id: m.id, score: f.score, reasons: f.reasons});
  }
  ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {ranked, blocked};
}

// ---------- 시스템 요약(정보 밀도·위계·리듬) ----------
const R1 = n => Math.round(n * 100) / 100;
/** 체계의 위계·리듬·밀도 요약. 두 체계가 서체 이름만 다른지 가르는 데 쓴다. */
export function scaleProfile(scale) {
  const r = scale.roles, line = vp => R1(800 / (r.body.sizePx[vp] * r.body.lineHeight));
  return {
    displayOverBody: R1(r.display.sizePx.desktop / r.body.sizePx.desktop), headingOverBody: R1(r.heading.sizePx.desktop / r.body.sizePx.desktop), numericOverBody: R1(r.numeric.sizePx.desktop / r.body.sizePx.desktop),
    bodyLeading: r.body.lineHeight, headingLeading: r.heading.lineHeight, displayTracking: r.display.trackingEm, labelTracking: r.label.trackingEm,
    bodyLinesPer800: {mobile: line('mobile'), desktop: line('desktop')}, displayGrowth: R1(r.display.sizePx.desktop / r.display.sizePx.mobile), bodyPx: {...r.body.sizePx},
  };
}
