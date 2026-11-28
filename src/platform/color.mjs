/**
 * 팔레트 × 서브토큰 세트 결합(ADR 0012 §1). 팔레트는 원색만, 서브토큰 세트는 역할 분배 규칙만 가진다.
 * 같은 세트를 여러 팔레트에, 같은 팔레트를 여러 세트에 쓸 수 있다(다대다). 결합이 대비 게이트를 통과하는지는 계산 관계(paletteSubtokenCheck)로 판정한다.
 *
 * 램프와 대비 보정은 2.6.0 색 토큰 엔진(src/color-tokens.mjs)의 함수를 그대로 쓴다. 색 역할 23개의 계산식은 새로 두지 않는다.
 *
 * bindColor는 역할 23개 위에 세 가지 파생을 더해 "실제 렌더 토큰"까지 낸다(설계는 data/subtoken-sets.mjs의 SUBTOKEN_SET_DESIGNS).
 *   상태·상호작용   주/보조 액션 hover·active, 입력 경계(hover·active·error), 표 머리글·hover·선택
 *   컴포넌트 의미   button.primary.* · button.secondary.* · control.* · card.* · table.* (기존 2.6.0 컴포넌트 계약의 변수 이름을 그대로 쓴다)
 *   차트 색 역할    범주형 6, 순차 7, 발산 7. 범주형은 팔레트 시드의 색상각에서, 순차·발산은 램프 단계에서 나온다
 * 파생도 같은 대비 게이트에 올린다. 하나라도 하한에 못 미치면 그 팔레트 × 세트 쌍은 호환이 아니다.
 */
import {colorRamp, readableColor, colorContrast, colorMix} from '../color-tokens.mjs';
import {COLOR_ROLES, PALETTE_SLOTS} from './contract.mjs';
import {defineCheck} from './relations.mjs';
import {SUBTOKEN_SETS, DEFAULT_DESIGN} from './data/subtoken-sets.mjs';
import {PALETTES} from './data/palettes.mjs';

const WHITE = '#FFFFFF';
const floor4 = x => Math.floor(x * 1e4) / 1e4;

// ---- 색 수학(차트 색 선택과 사용자 팔레트 분류용). 램프·대비 보정 규칙은 color-tokens.mjs 것을 쓴다 ----
const toRgb = h => h.slice(1).match(/../g).map(x => parseInt(x, 16));
const toHex = a => '#' + a.map(x => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('').toUpperCase();
const chromaOf = h => { const c = toRgb(h); return (Math.max(...c) - Math.min(...c)) / 255; };
export const CHROMATIC = 0.15;
const isChromatic = h => chromaOf(h) >= CHROMATIC;
function toHsl(h) {
  const [r, g, b] = toRgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (!d) return {h: 0, s: 0, l};
  const s = d / (1 - Math.abs(2 * l - 1)), hh = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return {h: hh * 60, s, l};
}
function fromHsl({h, s, l}) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
export const hueGap = (a, b) => { const d = Math.abs(toHsl(a).h - toHsl(b).h); return Math.min(d, 360 - d); };
/** 색상각을 deg만큼 돌리고 채도를 하한 이상으로, 명도는 중간대로 맞춘다(단계 선택은 램프가 한다). */
const rotate = (seed, deg, minS) => { const {h, s, l} = toHsl(seed); return fromHsl({h: (h + deg + 360) % 360, s: Math.max(s, minS), l: Math.min(.6, Math.max(.3, l))}); };
function toLab(hex) {
  const [r, g, b] = toRgb(hex).map(v => v / 255).map(v => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4));
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((.4124564 * r + .3575761 * g + .1804375 * b) / .95047), y = f(.2126729 * r + .7151522 * g + .072175 * b), z = f((.0193339 * r + .119192 * g + .9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
/** CIE76 색차. 범주형 차트 색이 서로 얼마나 다른지 잰다. */
export const deltaE = (a, b) => Math.hypot(...toLab(a).map((v, i) => v - toLab(b)[i]));

/** 세트 기록의 파생 설계 필드(states·components·charts)를 하나로. 없는 부분은 DEFAULT_DESIGN(계약 0.4.0: 기록 필드가 원본). */
export function designOf(set) {
  const st = set.states ?? {}, d = DEFAULT_DESIGN;
  return {
    hover: st.hover ?? d.hover, active: st.active ?? d.active, control: {...d.control, ...st.control}, table: {...d.table, ...set.components?.table},
    charts: {categorical: {...d.charts.categorical, ...set.charts?.categorical}, sequential: {...d.charts.sequential, ...set.charts?.sequential}, diverging: {...d.charts.diverging, ...set.charts?.diverging}},
  };
}

// ---- 역할 23개 결합 ----
function bindRoles(palette, subtokenSet, mode) {
  const ramps = Object.fromEntries(subtokenSet.needs.map(s => [s, colorRamp(palette.seeds[s])]));
  const roles = {}, report = [];
  for (const [role, rule] of Object.entries(subtokenSet.roles)) {
    if (rule.fixed !== undefined) {
      // 고정 규칙(계약 0.3.0): 팔레트와 무관한 리터럴, 또는 램프 단계를 어떤 색과 비율로 섞은 값. 보정하지 않고 min만 보고한다.
      const f = rule.fixed;
      roles[role] = typeof f === 'string' ? f : f.mix ? colorMix(ramps[f.from][f.step], f.mix.with, f.mix.ratio) : ramps[f.from][f.step];
      for (const a of rule.min?.against ?? []) report.push({role, against: a, ratio: floor4(colorContrast(roles[role], roles[a])), minimum: rule.min.ratio});
    } else if (rule.from !== undefined) {
      const base = ramps[rule.from][rule[mode]];
      const against = (rule.min?.against ?? []).map(a => roles[a]);
      try { roles[role] = rule.min ? readableColor(base, against, rule.min.ratio) : base; } catch {
        throw new Error(`COLOR_CONTRAST: ${role}는 ${rule.min.against.join('·')} 위에서 ${rule.min.ratio}:1을 동시에 맞출 수 없습니다(${rule.from} 램프를 밝게·어둡게 모두 보정해도 불가)`);
      }
      for (const a of rule.min?.against ?? []) report.push({role, against: a, ratio: floor4(colorContrast(roles[role], roles[a])), minimum: rule.min.ratio});
    } else {
      const bg = roles[rule.on], ink = ramps.neutral['950'];
      roles[role] = colorContrast(WHITE, bg) >= rule.min ? WHITE : colorContrast(ink, bg) >= rule.min ? ink : null;
      if (!roles[role]) throw new Error(`COLOR_CONTRAST: no text color reaches ${rule.min}:1 on ${rule.on}`);
      report.push({role, against: rule.on, ratio: floor4(colorContrast(roles[role], bg)), minimum: rule.min});
    }
  }
  return {roles, report, ramps};
}

// ---- 상태·상호작용·컴포넌트 의미 토큰 ----
function deriveStates(roles, design, mode, onMin, {contrast}) {
  const toward = mode === 'dark' ? WHITE : '#000000';
  const s = {};
  s.actionHover = colorMix(roles.action, toward, design.hover); s.actionActive = colorMix(roles.action, toward, design.active);
  s.onActionHover = readableColor(roles.onAction, s.actionHover, 4.5); s.onActionActive = readableColor(roles.onAction, s.actionActive, 4.5);
  s.accentHover = colorMix(roles.accent, toward, design.hover); s.accentActive = colorMix(roles.accent, toward, design.active);
  s.onAccentHover = readableColor(roles.onAccent, s.accentHover, 4.5); s.onAccentActive = readableColor(roles.onAccent, s.accentActive, 4.5);
  const border = readableColor(roles[design.control.border], [roles.surface, roles.canvas], design.control.min);
  Object.assign(s, {
    controlBg: roles.surface, controlFg: roles.text, controlBorder: border, controlHoverBorder: readableColor(roles.action, roles.surface, design.control.min),
    controlActiveBorder: roles.focus, controlError: roles.danger,
    tableHead: roles[design.table.head], tableHover: roles[design.table.hover], tableSelected: roles[design.table.selected],
    accentSoft: roles.soft, accentInk: roles.accent, chartGrid: roles.border,
  });
  // 파생이 새로 만든 쌍과, 역할 규칙이 검사하지 않던 상호작용 쌍을 같은 게이트에 올린다.
  // 글자 하한은 세트가 onAction·onAccent에 건 값을 따른다(고대비는 hover·active 위에서도 7:1).
  for (const [fg, bg, min] of [['onActionHover', 'actionHover', onMin.action], ['onActionActive', 'actionActive', onMin.action], ['onAccentHover', 'accentHover', onMin.accent], ['onAccentActive', 'accentActive', onMin.accent]]) contrast(fg, bg, s[fg], s[bg], min);
  for (const k of ['tableHead', 'tableHover', 'tableSelected']) contrast('text', k, roles.text, s[k], 4.5);
  // accentInk(보조색 글자)는 accentSoft(강조 띠) 위에 놓인다. 역할 규칙이 accent를 surface 위에서만 보정하면 이 쌍이 4.5:1을 밑돈다(페이지 품질 검사가 막는 쪽).
  contrast('accentInk', 'accentSoft', s.accentInk, s.accentSoft, 4.5);
  contrast('controlBorder', 'surface', s.controlBorder, roles.surface, design.control.min); contrast('controlHoverBorder', 'surface', s.controlHoverBorder, roles.surface, design.control.min);
  // 표 셀의 초점 고리는 안쪽(outline-offset:-2px)에 그려져 표 머리글·hover·선택 면 위에 놓인다.
  for (const k of ['tableHead', 'tableHover', 'tableSelected']) contrast('focus', k, roles.focus, s[k], 3);
  return s;
}

function deriveComponents(roles, s) {
  return {
    'button.primary.default': {bg: roles.action, fg: roles.onAction}, 'button.primary.hover': {bg: s.actionHover, fg: s.onActionHover}, 'button.primary.active': {bg: s.actionActive, fg: s.onActionActive},
    'button.primary.focus': {ring: roles.focus}, 'button.primary.disabled': {bg: roles.disabledBg, fg: roles.disabledFg},
    'button.secondary.default': {bg: roles.accent, fg: roles.onAccent}, 'button.secondary.hover': {bg: s.accentHover, fg: s.onAccentHover}, 'button.secondary.active': {bg: s.accentActive, fg: s.onAccentActive},
    'button.secondary.disabled': {bg: roles.disabledBg, fg: roles.disabledFg},
    'control.default': {bg: s.controlBg, fg: s.controlFg, border: s.controlBorder}, 'control.hover': {border: s.controlHoverBorder}, 'control.active': {border: s.controlActiveBorder},
    'control.error': {border: s.controlError}, 'control.focus': {ring: roles.focus}, 'control.disabled': {bg: roles.disabledBg, fg: roles.disabledFg},
    'card.default': {bg: roles.surface, border: roles.border}, 'card.hover': {bg: roles.cardHover}, 'card.active': {bg: roles.cardActive}, 'card.error': {bg: roles.dangerSoft}, 'card.focus': {ring: roles.focus},
    'table.default': {bg: roles.surface, head: s.tableHead}, 'table.hover': {bg: s.tableHover}, 'table.active': {bg: s.tableSelected}, 'table.error': {bg: roles.dangerSoft}, 'table.focus': {ring: roles.focus},
  };
}

// ---- 차트 색 역할 ----
export const CATEGORICAL_COUNT = 6, SEQUENTIAL_STEPS = 7, DIVERGING_STEPS = 7;
/** tone → [라이트 단계, 다크 단계]. 램프 단계에서 시작해 면 대비를 맞출 때까지 보정한다. */
export const CHART_TONES = Object.freeze({standard: ['600', '300'], vivid: ['500', '400'], soft: ['400', '300'], deep: ['700', '400']});
const SEQ_LIGHT = ['200', '300', '400', '500', '600', '700', '800'], SEQ_DARK = [...SEQ_LIGHT].reverse();
const DIV_ARM = {light: ['700', '500', '300'], dark: ['300', '500', '600']}, DIV_MID = {light: '200', dark: '700'};
/** 순차·발산 이웃 단계의 CIE76 색차 하한. 명암비는 어두운 쪽에서 단계 차이를 과소평가해 색차로 잰다. */
const ADJACENT_MIN = 6;
const stepDistance = colors => floor4(Math.min(...colors.slice(1).map((x, i) => deltaE(x, colors[i]))));
const keyOf = (slot, deg) => (deg ? `${slot}${deg > 0 ? '+' : ''}${deg}` : slot);

function categorical(seeds, d, mode, bgs) {
  const step = CHART_TONES[d.tone][mode === 'dark' ? 1 : 0];
  const leads = d.lead.filter(k => seeds[k]);
  const lively = leads.filter(k => isChromatic(seeds[k]));
  // 앞자리 팔레트색이 모두 무채색이면(모노 팔레트) 상태색의 색상각을 앵커로 쓴다. 그렇지 않으면 팔레트의 색상각만 쓴다.
  const anchors = lively.length ? lively : ['info', 'warning'].filter(k => seeds[k]);
  const pool = [];
  for (const k of [lively.length ? lively[0] : leads[0]].filter(Boolean)) pool.push({key: k, seed: seeds[k]});
  for (const k of lively.slice(1)) pool.push({key: k, seed: seeds[k]});
  if (!lively.length) for (const k of anchors) pool.push({key: k, seed: seeds[k]});
  for (const k of anchors) for (const deg of [60, 120, 180, 240, 300]) pool.push({key: keyOf(k, deg), seed: rotate(seeds[k], deg, d.chroma)});
  const colored = pool.map(c => ({...c, color: readableColor(colorRamp(c.seed)[step], bgs, d.minContrast)}));
  const chosen = [colored[0]];
  while (chosen.length < CATEGORICAL_COUNT && chosen.length < colored.length) {
    const rest = colored.filter(c => !chosen.includes(c));
    let best = null, bestDist = -1;
    for (const c of rest) { const dist = Math.min(...chosen.map(x => deltaE(x.color, c.color))); if (dist > bestDist + 1e-9) { best = c; bestDist = dist; } }
    chosen.push(best);
  }
  return chosen;
}

function sequential(seeds, d, mode) {
  // 무채색 시드(모노 팔레트의 brand·accent)의 램프는 명도가 한쪽에 몰려 단계가 구분되지 않는다. 그때는 neutral 램프를 쓴다.
  const wanted = seeds[d.from] ? d.from : 'brand', slot = isChromatic(seeds[wanted]) ? wanted : 'neutral', ramp = colorRamp(seeds[slot]);
  return {slot, colors: (mode === 'dark' ? SEQ_DARK : SEQ_LIGHT).map(st => ramp[st])};
}

function diverging(seeds, d, mode) {
  const slotsOf = list => list.filter(k => seeds[k] && isChromatic(seeds[k]));
  let pair = null;
  for (const l of slotsOf(d.low)) { for (const h of slotsOf(d.high)) if (l !== h && hueGap(seeds[l], seeds[h]) >= 60) { pair = [l, h]; break; } if (pair) break; }
  if (!pair) return null;
  const lo = colorRamp(seeds[pair[0]]), hi = colorRamp(seeds[pair[1]]), mid = colorRamp(seeds.neutral)[DIV_MID[mode]], arm = DIV_ARM[mode];
  return {low: pair[0], high: pair[1], colors: [...arm.map(st => lo[st]), mid, ...[...arm].reverse().map(st => hi[st])]};
}

function deriveCharts(seeds, design, mode, roles, {contrast, raw}) {
  const c = design.charts, bgs = [roles.surface, roles.canvas], out = {};
  const cat = categorical(seeds, c.categorical, mode, bgs);
  out.categorical = cat.map(x => x.color); out.categoricalSources = cat.map(x => x.key);
  cat.forEach((x, i) => contrast(`chart${i + 1}`, 'surface', x.color, roles.surface, c.categorical.minContrast));
  let minDist = Infinity;
  for (let i = 0; i < cat.length; i++) for (let j = i + 1; j < cat.length; j++) minDist = Math.min(minDist, deltaE(cat[i].color, cat[j].color));
  raw('chart-categorical', 'pairwise ΔE76', floor4(minDist), c.categorical.minDistinct, 'distance');
  const seq = sequential(seeds, c.sequential, mode);
  out.sequential = seq.colors; out.sequentialSource = seq.slot;
  contrast('chart-sequential-high', 'surface', seq.colors.at(-1), roles.surface, c.sequential.minContrast);
  raw('chart-sequential-step', 'adjacent ΔE76', stepDistance(seq.colors), ADJACENT_MIN, 'step');
  const div = diverging(seeds, c.diverging, mode);
  if (!div) { raw('chart-diverging', 'two hues ≥60° apart', 0, 60, 'hue'); out.diverging = null; return out; }
  out.diverging = div.colors; out.divergingSources = {low: div.low, high: div.high};
  raw('chart-diverging', 'two hues ≥60° apart', floor4(hueGap(seeds[div.low], seeds[div.high])), 60, 'hue');
  for (const end of [div.colors[0], div.colors.at(-1)]) contrast('chart-diverging-end', 'surface', end, roles.surface, c.diverging.minContrast);
  raw('chart-diverging-mid', 'surface ΔE76', floor4(deltaE(div.colors[3], roles.surface)), ADJACENT_MIN, 'step');
  const arms = [div.colors.slice(0, 4), div.colors.slice(3)];
  raw('chart-diverging-step', 'adjacent ΔE76', Math.min(...arms.map(stepDistance)), ADJACENT_MIN, 'step');
  return out;
}

const cssName = {
  actionHover: ['--kit-action-hover', '--kit-actionHover'], actionActive: ['--kit-action-active', '--kit-actionActive'], onActionHover: ['--kit-onActionHover'], onActionActive: ['--kit-onActionActive'],
  accentHover: ['--kit-accent-hover'], accentActive: ['--kit-accent-active'], onAccentHover: ['--kit-onAccentHover'], onAccentActive: ['--kit-onAccentActive'],
  controlBg: ['--kit-control-bg'], controlFg: ['--kit-control-fg'], controlBorder: ['--kit-control-border'], controlHoverBorder: ['--kit-control-hover-border'],
  controlActiveBorder: ['--kit-control-active-border'], controlError: ['--kit-control-error'],
  tableHead: ['--kit-table-head'], tableHover: ['--kit-table-hover'], tableSelected: ['--kit-table-selected'], accentSoft: ['--kit-accentSoft'], accentInk: ['--kit-accentInk'], chartGrid: ['--kit-chart-grid'],
};

/**
 * bindColor(palette, subtokenSet, mode) → {ok, roles, vars, states, components, charts, report, error?}
 *   roles       색 역할 23개 {역할: hex}
 *   vars        렌더 변수 {'--kit-*': hex}: 역할 + 상태·상호작용 + 입력·표 + 차트(--kit-chart1~6, --kit-seq1~7, --kit-div1~7)
 *   states      파생 상태 값 {actionHover, onActionHover, controlBorder, tableHead, …}
 *   components  컴포넌트 의미 토큰 {'button.primary.hover': {bg, fg}, …}
 *   charts      {categorical: [6], sequential: [7], diverging: [7]|null, categoricalSources, sequentialSource, divergingSources}
 *   report      [{role, against, ratio, minimum, kind?}]. kind가 없으면 대비. ratio ≥ minimum이어야 통과
 * mode: 'light' | 'dark'. 실패(필요한 원색 없음·대비 불가·차트 게이트 미달)는 던지지 않고 ok:false와 error로 돌려준다.
 */
export function bindColor(palette, subtokenSet, mode = 'light') {
  const missing = subtokenSet.needs.filter(s => !Object.hasOwn(palette.seeds, s));
  if (missing.length) return {ok: false, roles: null, vars: null, report: [], error: {code: 'P_COLOR_SLOT', message: `${palette.id}에 ${missing.join(', ')} 원색이 없습니다(${subtokenSet.id}가 필요)`}};
  if (!subtokenSet.modes.includes(mode)) return {ok: false, roles: null, vars: null, report: [], error: {code: 'P_COLOR_MODE', message: `${subtokenSet.id}는 ${mode} 모드를 내지 않습니다`}};
  let roles, report;
  try { ({roles, report} = bindRoles(palette, subtokenSet, mode)); } catch (e) {
    return {ok: false, roles: null, vars: null, report: [], error: {code: 'P_COLOR_CONTRAST', message: `${palette.id} × ${subtokenSet.id} (${mode}): ${e.message}`}};
  }
  const design = designOf(subtokenSet);
  const gates = {
    contrast: (role, against, fg, bg, minimum) => report.push({role, against, ratio: floor4(colorContrast(fg, bg)), minimum}),
    raw: (role, against, ratio, minimum, kind) => report.push({role, against, ratio, minimum, kind}),
  };
  let states, charts, components;
  try {
    states = deriveStates(roles, design, mode, {action: subtokenSet.roles.onAction.min, accent: subtokenSet.roles.onAccent.min}, gates); components = deriveComponents(roles, states);
    charts = deriveCharts(palette.seeds, design, mode, roles, gates);
  } catch (e) {
    return {ok: false, roles, vars: null, report, error: {code: 'P_COLOR_CONTRAST', message: `${palette.id} × ${subtokenSet.id} (${mode}): ${e.message}`}};
  }
  const vars = Object.fromEntries(Object.entries(roles).map(([r, v]) => [COLOR_ROLES[r], v]));
  for (const [k, names] of Object.entries(cssName)) for (const n of names) vars[n] = states[k];
  charts.categorical.forEach((v, i) => { vars[`--kit-chart${i + 1}`] = v; });
  charts.sequential.forEach((v, i) => { vars[`--kit-seq${i + 1}`] = v; });
  charts.diverging?.forEach((v, i) => { vars[`--kit-div${i + 1}`] = v; });
  const failed = report.filter(x => x.ratio < x.minimum);
  const chartKinds = new Set(['distance', 'step', 'hue']);
  const error = failed.length ? {
    code: failed.some(x => chartKinds.has(x.kind) || x.role.startsWith('chart')) && !failed.some(x => !x.role.startsWith('chart') && !chartKinds.has(x.kind)) ? 'P_COLOR_CHART' : 'P_COLOR_CONTRAST',
    message: `${palette.id} × ${subtokenSet.id} (${mode}): ` + failed.slice(0, 3).map(x => `${x.role} vs ${x.against} ${x.ratio}${x.kind === 'hue' ? '°' : ':1'} < ${x.minimum}${x.kind === 'hue' ? '°' : ':1'}`).join(', ') + (failed.length > 3 ? ` 외 ${failed.length - 3}건` : ''),
    failed,
  } : undefined;
  return {ok: !failed.length, roles, vars, states, components, charts, report, ...(error ? {error} : {})};
}

/** 팔레트 원색 램프(50~950). 램프는 2.6.0 엔진의 colorRamp가 시드에서 계산한다. */
export const paletteRamps = palette => Object.fromEntries(Object.entries(palette.seeds).map(([slot, seed]) => [slot, colorRamp(seed)]));

/** 계산 관계: 팔레트와 서브토큰 세트가 세트의 모든 모드에서 결합·대비를 통과하는가. */
export const paletteSubtokenCheck = defineCheck({
  id: 'palette-subtoken', kinds: ['palette', 'subtoken-set'], reason: '세트의 모든 모드에서 필요한 원색이 있고 대비 게이트를 통과한다',
  run(palette, set, ctx) {
    const modes = ctx.mode ? [ctx.mode] : set.modes;
    for (const mode of modes) { const r = bindColor(palette, set, mode); if (!r.ok) return {ok: false, reason: r.error?.message ?? `${mode} 대비 미달`}; }
    return {ok: true};
  },
});

/** 색 작업이 소유하는 계산 관계 목록. createPlatform이 이 배열을 그대로 읽는다(다른 작업 파일을 고치지 않고 검사를 더하게). */
export const COLOR_CHECKS = Object.freeze([paletteSubtokenCheck]);

/**
 * 팔레트 × 세트 판정 행렬. [{palette, set, ok, reasons: [{mode, code, message}]}]. 세트의 모든 모드를 본다.
 * palettes·sets는 등록 기록 배열이다(레지스트리가 아니라 data 파일 그대로 넘겨도 된다).
 */
export function colorMatrix(palettes, sets) {
  return palettes.flatMap(p => sets.map(s => {
    const reasons = [];
    for (const mode of s.modes) { const r = bindColor(p, s, mode); if (!r.ok) reasons.push({mode, code: r.error.code, message: r.error.message}); }
    return {palette: p.id, set: s.id, ok: !reasons.length, reasons};
  }));
}

// ---- 사용자 팔레트(hex 시드 3~6개) → 세트 후보와 거부 이유. 저장·등록·재배포하지 않는다 ----
const HEX_IN = /^#?[0-9a-f]{6}$/i;
const STATUS_HUE = {success: 145, warning: 40, danger: 355, info: 215};
const STATUS_DEFAULT = {success: {h: 145, s: .6, l: .3}, warning: {h: 40, s: .9, l: .3}, danger: {h: 355, s: .6, l: .42}, info: {h: 215, s: .6, l: .42}};
const hueOf = h => toHsl(h).h;
const circular = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

/**
 * 시드 3~6개를 팔레트 자리에 배정한다. 규칙(결정적):
 *   neutral  채도가 가장 낮은 시드. 가장 낮아도 채도가 높으면(≥0.20) 브랜드 색상각에서 낮은 채도로 만든다(source: derived)
 *   brand    남은 시드 중 입력 순서의 첫 번째, accent는 두 번째. 없으면 브랜드 색상각을 150° 돌려 만든다(derived)
 *   상태색   세 번째부터 남은 시드를 색상각이 40° 안인 가장 가까운 상태 자리(success·warning·danger·info)에 한 번씩 배정한다. 못 맞춘 자리는 기본값(derived), 못 쓴 시드는 ignored
 * 반환: {ok, errors, seeds, assignments: [{slot, seed, source}], ignored: [hex]}
 */
export function assignSeeds(input) {
  const errors = [];
  if (!Array.isArray(input) || input.length < 3 || input.length > 6) return {ok: false, errors: [{code: 'P_SEEDS_COUNT', message: '시드는 hex 3개에서 6개입니다'}], seeds: null, assignments: [], ignored: []};
  input.forEach((v, i) => { if (typeof v !== 'string' || !HEX_IN.test(v)) errors.push({code: 'P_SEEDS_HEX', message: `시드 ${i + 1}은 #RRGGBB 형식이어야 합니다`}); });
  if (errors.length) return {ok: false, errors, seeds: null, assignments: [], ignored: []};
  const seeds = input.map(v => ('#' + v.replace('#', '')).toUpperCase());
  if (new Set(seeds).size !== seeds.length) return {ok: false, errors: [{code: 'P_SEEDS_DUPLICATE', message: '같은 시드가 두 번 들어 있습니다'}], seeds: null, assignments: [], ignored: []};
  const assignments = [], by = {};
  const put = (slot, seed, source) => { by[slot] = seed; assignments.push({slot, seed, source}); };
  const lowest = seeds.reduce((a, b) => (chromaOf(b) < chromaOf(a) ? b : a));
  const rest = seeds.filter(x => x !== lowest);
  put('brand', rest[0], 'user');
  if (chromaOf(lowest) >= .2) put('neutral', fromHsl({h: toHsl(rest[0]).h, s: .08, l: .5}), 'derived'); else put('neutral', lowest, 'user');
  const spare = chromaOf(lowest) >= .2 ? [lowest, ...rest.slice(1)] : rest.slice(1);
  if (spare.length) put('accent', spare.shift(), 'user'); else put('accent', rotate(rest[0], 150, .45), 'derived');
  const ignored = [];
  const free = new Set(Object.keys(STATUS_HUE));
  for (const seed of spare) {
    const best = [...free].map(k => [k, circular(hueOf(seed), STATUS_HUE[k])]).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
    if (best && best[1] <= 40 && isChromatic(seed)) { put(best[0], seed, 'user'); free.delete(best[0]); } else ignored.push(seed);
  }
  for (const k of Object.keys(STATUS_HUE)) if (free.has(k)) put(k, fromHsl(STATUS_DEFAULT[k]), 'derived');
  assignments.sort((a, b) => PALETTE_SLOTS.indexOf(a.slot) - PALETTE_SLOTS.indexOf(b.slot));
  return {ok: true, errors: [], seeds: Object.fromEntries(PALETTE_SLOTS.map(k => [k, by[k]])), assignments, ignored};
}

/**
 * 팔레트 × 서브토큰 세트 결합 평가 엔진 (TASK-TRB-04).
 * 팔레트와 25종 서브토큰 세트의 대비 적합도, 권장 순위(랭킹), 자동 보정 내역 및 차단 이유를 산출한다.
 *
 * @param {Object|string} paletteInput 팔레트 객체 또는 id 문자열
 * @param {Object} [options]
 * @param {string} [options.mode] 'light' | 'dark' (미지정 시 양쪽 모드 검사)
 * @param {string} [options.context] 페이지 유형 맥락 (예: 'landing', 'general', 'dashboard')
 * @param {Array} [options.sets=SUBTOKEN_SETS] 평가 대상 세트 목록
 * @returns {Array} 25종 세트 평가 결과 배열. Array 속성으로 .ranked, .blocked 제공.
 */
export function evaluatePaletteSubtokens(paletteInput, {mode, context, sets = SUBTOKEN_SETS} = {}) {
  let palette = paletteInput;
  if (typeof paletteInput === 'string') {
    const rawId = paletteInput.startsWith('palette:') ? paletteInput : `palette:${paletteInput}`;
    palette = PALETTES.find(p => p.id === rawId || p.id === paletteInput);
    if (!palette) {
      throw new Error(`P_PALETTE_NOT_FOUND: 팔레트를 찾을 수 없습니다: ${paletteInput}`);
    }
  }
  if (!palette || !palette.seeds) {
    throw new Error('P_PALETTE_INVALID: 유효한 seeds를 가진 팔레트가 필요합니다.');
  }

  const results = sets.map(set => {
    const modesToTest = mode ? [mode] : set.modes;
    const modes = {};
    const blockedReasons = [];
    const adjustments = [];
    const contrastReport = {};
    let minMargin = Infinity;

    // 맥락 금지 확인
    if (context && set.forbiddenContexts?.includes(context)) {
      blockedReasons.push({
        code: 'P_FORBIDDEN_CONTEXT',
        mode: mode ?? 'all',
        message: `${set.id}는 ${context} 맥락에서 사용할 수 없습니다(금지 조합)`,
      });
    }

    for (const m of modesToTest) {
      const r = bindColor(palette, set, m);
      if (!r.ok) {
        blockedReasons.push({
          mode: m,
          code: r.error.code,
          message: r.error.message,
        });
      } else {
        modes[m] = {roles: r.roles, vars: r.vars, charts: r.charts};
        contrastReport[m] = r.report;
        for (const item of r.report) {
          const margin = item.ratio / item.minimum;
          if (margin < minMargin) minMargin = margin;
        }

        // 자동 보정 감지: base step 색상 대비 readableColor가 보정한 역할 추적
        const ramps = Object.fromEntries(set.needs.map(n => [n, colorRamp(palette.seeds[n])]));
        for (const [role, rule] of Object.entries(set.roles)) {
          if (rule.from !== undefined) {
            const base = ramps[rule.from][rule[m]];
            if (r.roles[role] !== base) {
              adjustments.push({
                role,
                mode: m,
                from: rule.from,
                originalStep: rule[m],
                initial: base,
                adjusted: r.roles[role],
              });
            }
          }
        }
      }
    }

    const applicable = blockedReasons.length === 0;
    const reasons = [];
    let score = 0;

    if (applicable) {
      score = 50;
      const marginBonus = Math.min(30, Math.round((minMargin - 1) * 10));
      score += Math.max(0, marginBonus);
      reasons.push(`대비 마진 여유도: ${floor4(minMargin)}배 (+${Math.max(0, marginBonus)}점)`);

      if (context && set.contexts?.includes(context)) {
        score += 30;
        reasons.push(`권장 맥락: ${context} 적합 (+30점)`);
      } else if (context) {
        reasons.push(`맥락: ${context} (일반 적용)`);
      }

      if (set.weights) {
        score += 10;
        reasons.push('역할 가중치 규칙 부합 (+10점)');
      }

      if (adjustments.length > 0) {
        reasons.push(`대비 자동 보정 ${adjustments.length}건 적용`);
      }
    } else {
      reasons.push(...blockedReasons.map(b => `${b.mode ? b.mode + ': ' : ''}${b.message}`));
    }

    return {
      id: set.id,
      label: set.label,
      applicable,
      score,
      rank: null,
      reasons,
      contrastReport,
      recommendedContexts: [...(set.contexts ?? [])],
      forbiddenContexts: [...(set.forbiddenContexts ?? [])],
      adjustments,
      blockedReasons,
      modes,
      margin: applicable ? floor4(minMargin) : 0,
    };
  });

  const applicableItems = results.filter(x => x.applicable);
  applicableItems.sort((a, b) => b.score - a.score || b.margin - a.margin || a.id.localeCompare(b.id));
  applicableItems.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  results.filter(x => !x.applicable).forEach(item => {
    item.rank = null;
  });

  results.ranked = applicableItems;
  results.blocked = results.filter(x => !x.applicable);

  return results;
}

export const matchSubtokenSets = evaluatePaletteSubtokens;

/**
 * proposeSubtokenSets(seeds, {sets, context, mode}) → {ok, errors, palette, assignments, ignored, candidates, rejected, evaluations}
 *   candidates  통과한 세트 [{set, label, tags, margin, score, rank, modes: {light: {vars, charts}, dark: {...}}}].
 *   rejected    실패한 세트 [{set, label, reasons: [{mode, code, message}]}]
 *   evaluations 25종 세트 전체 평가 결과 목록
 * 같은 결합 경로(bindColor)를 쓴다. 결과는 호출자에게 돌려줄 뿐 레지스트리에 등록하지 않는다(license 미확인 입력은 등록 불가).
 */
export function proposeSubtokenSets(input, {sets = SUBTOKEN_SETS, context, mode} = {}) {
  const a = assignSeeds(input);
  if (!a.ok) return {ok: false, errors: a.errors, palette: null, assignments: [], ignored: [], candidates: [], rejected: [], evaluations: []};
  const palette = Object.freeze({id: 'palette:user-seeds', kind: 'palette', seeds: Object.freeze(a.seeds)});

  const evaluations = evaluatePaletteSubtokens(palette, {mode, context, sets});
  const candidates = evaluations.ranked.map(r => ({
    set: r.id,
    label: r.label,
    tags: [...(sets.find(s => s.id === r.id)?.tags ?? [])],
    margin: r.margin,
    score: r.score,
    rank: r.rank,
    modes: r.modes,
  }));
  const rejected = evaluations.blocked.map(r => ({
    set: r.id,
    label: r.label,
    reasons: r.blockedReasons,
  }));

  return {ok: true, errors: [], palette, assignments: a.assignments, ignored: a.ignored, candidates, rejected, evaluations};
}
