/** Role typography materials independent of the 2.5.0 compiler path.
 *
 *  Relation to src/typography.mjs (the 2.1~2.5 engine, ADR 0011 appendix "타이포그래피 재료와 기존 엔진"):
 *  - Faces, display/heading tracking and leading, label tracking and the body px floor are read from the engine's revision 2 table (TYPE_R2) through
 *    `engine`; this file holds no font stack and no Hangul limit of its own. The engine's HANGUL limits (leading floors, body leading band, role caps) are enforced here.
 *  - What stays here because the engine has no equivalent: fluid clamp() slopes per context, weights, the numeric/code roles, the density and viewport factors and control sizes.
 *  - body, label and caption are floor roles: the engine fixes them in px (body, round(body*.8125), round(body*.75)), so density and viewport factors never shrink them.
 *  - numeric keeps tight tracking on purpose: the engine also leaves numerals, prices and metrics out of Hangul tracking (NUMERIC_RULE). */
import {defineKind, defineMaterial, materialId} from './contract.mjs';
import {STACKS, TYPE_R2, HANGUL} from '../typography.mjs';
import {SPACE} from '../spacing.mjs';

/** Roles the engine fixes in px. Density and viewport factors are 1 for these. */
export const FLOOR_ROLES = Object.freeze(['body', 'label', 'caption']);
/** Engine leading limits per role (HANGUL): [floor, ceiling]. Roles without an engine counterpart are unbounded. */
const LEADING_BOUNDS = Object.freeze({display: [HANGUL.leading.display, Infinity], heading: [HANGUL.leading.heading, Infinity], body: HANGUL.body});
/** `size` scales font size, `leading` scales line height. Leading is clamped to LEADING_BOUNDS after scaling, so compact density cannot go below the Hangul floors. */
export const DENSITY_FACTORS = Object.freeze({compact: Object.freeze({size: .94, leading: .94}), relaxed: Object.freeze({size: 1.02, leading: 1.04})});
export const NARROW_VIEWPORT = Object.freeze({max: 720, base: .96, display: .9, heading: .94});

const rem = px => `${+(px / 16).toFixed(4)}rem`.replace(/^0\./, '.');
const fluid = (lo, vw, hi) => `clamp(${rem(lo)},${vw}vw,${rem(hi)})`;
export const clampBounds = size => { const m = /^clamp\(([\d.]+)rem,[\d.]+vw,([\d.]+)rem\)$/.exec(size); return {min: +m[1] * 16, max: +m[2] * 16}; };
const role = (size, weight, lineHeight, trackingEm, fontFamily, policy = 'wrap') => ({size, weight, lineHeight, trackingEm, fontFamily, policy});

/** Engine fixed px for the floor roles at a body size (src/typography.mjs ROLES: caption .75, label .8125). */
const floorPx = body => ({body, label: Math.round(body * .8125), caption: Math.round(body * .75)});

/** `name`: display label. `engine`: TYPE_R2 preset the faces and Hangul-bound values come from. `ui`: stack name for label/caption/numeric (default: the engine text face).
 *  display/heading/numeric/code: [minPx, vw slope, maxPx]. body/label/caption: [vw slope, px above the engine floor]. weights: display, heading, body, label, caption, numeric. */
const SPEC = {
  erp: {name: 'ERP', context: ['dashboard', 'data'], density: 'compact', space: 'compact', engine: 'tech',
    display: [28, 3.6, 44], heading: [20, 2, 26], body: [1.1, 2], label: [.82, 1], caption: [.75, 1], numeric: [16, 1.25, 22], code: [13, .9, 15],
    weight: [700, 650, 400, 650, 450, 650], bodyTracking: 0},
  dashboard: {name: 'Dashboard', context: ['dashboard', 'data'], density: 'compact', space: 'compact', engine: 'sans',
    display: [32, 4.2, 52], heading: [28, 3.1, 40], body: [1.05, 1], label: [.82, 1], caption: [.75, 1], numeric: [20, 2, 32], code: [13, .9, 15],
    weight: [720, 700, 420, 650, 450, 700], bodyTracking: 0},
  document: {name: 'Document', context: ['article', 'docs'], density: 'relaxed', space: 'comfortable', engine: 'editorial', ui: 'system',
    display: [44, 6, 72], heading: [26, 2.8, 36], body: [1.2, 2], label: [.85, 1], caption: [.8, 1], numeric: [16, 1.2, 20], code: [13, .9, 15],
    weight: [650, 650, 400, 650, 450, 600], bodyTracking: .005},
  marketing: {name: 'Marketing', context: ['landing', 'pricing'], density: 'relaxed', space: 'comfortable', engine: 'geometric',
    display: [48, 8, 80], heading: [28, 3.6, 40], body: [1.25, 3], label: [.85, 1], caption: [.75, 1], numeric: [20, 2.5, 36], code: [13, .9, 15],
    weight: [750, 700, 420, 700, 450, 700], bodyTracking: 0},
};

/** Control text roles. `step` is the height offset from the density's `control` token (src/spacing.mjs SPACE), `pad` and `gap` are SPACE token names.
 *  The size names are control sizes, not densities: `compact` here is the smallest button, the preset density `compact` is a page-level rhythm. */
export const CONTROL_SIZES = Object.freeze({
  compact: Object.freeze({step: -12, pad: 'near', gap: 'tight', role: 'label', icon: 16}),
  small: Object.freeze({step: -8, pad: 'item', gap: 'tight', role: 'label', icon: 16}),
  medium: Object.freeze({step: 0, pad: 'inset', gap: 'near', role: 'label', icon: 18}),
  large: Object.freeze({step: 8, pad: 'insetL', gap: 'near', role: 'body', icon: 20}),
});
export const CONTROL_SIZE_NAMES = Object.freeze(Object.keys(CONTROL_SIZES));
/** Vertical room kept above and below the line box, in px. */
export const CONTROL_MIN_INSET = 4;
/** Icon edge relative to the control text's largest font size. */
export const CONTROL_ICON_RATIO = Object.freeze([1, 1.5]);

function buildRoles(spec) {
  const e = TYPE_R2[spec.engine], head = STACKS[e.head], text = STACKS[e.text], ui = STACKS[spec.ui ?? e.text], floor = floorPx(e.body);
  const floorRole = (name, [vw, up]) => fluid(floor[name], vw, floor[name] + up);
  const [wd, wh, wb, wl, wc, wn] = spec.weight;
  return {
    display: role(fluid(...spec.display), wd, e.lh.display, e.track.display, head),
    heading: role(fluid(...spec.heading), wh, e.lh.heading, e.track.heading, head),
    body: role(floorRole('body', spec.body), wb, e.lh.body, spec.bodyTracking, text),
    label: role(floorRole('label', spec.label), wl, 1.35, e.track.label, ui),
    caption: role(floorRole('caption', spec.caption), wc, 1.4, .01, ui),
    numeric: role(fluid(...spec.numeric), wn, 1.15, -.02, ui, 'nowrap'),
    code: role(fluid(...spec.code), 450, 1.55, 0, STACKS.mono, 'scroll'),
  };
}

const freezeRoles = roles => Object.freeze(Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, Object.freeze(v)])));
const scaleOf = density => DENSITY_FACTORS[density];

/** Line height after the density factor, bounded by the engine's Hangul limits. */
export function effectiveLeading(name, spec, density) {
  const [lo, hi] = LEADING_BOUNDS[name] ?? [-Infinity, Infinity];
  return Math.min(hi, Math.max(lo, spec.lineHeight * scaleOf(density).leading));
}
/** Largest rendered font size in px: clamp() maximum times the density factor (floor roles are not scaled). */
export const maxFontPx = (name, spec, density) => clampBounds(spec.size).max * (FLOOR_ROLES.includes(name) ? 1 : scaleOf(density).size);
export const lineBoxPx = (name, spec, density) => maxFontPx(name, spec, density) * effectiveLeading(name, spec, density);

const resolveControls = (id, spec) => Object.freeze(Object.fromEntries(Object.entries(CONTROL_SIZES).map(([size, c]) => [size, Object.freeze({
  height: SPACE[spec.space].control + c.step, padX: SPACE[spec.space][c.pad], gap: SPACE[spec.space][c.gap], labelRole: c.role, iconPx: c.icon,
})])));

/** Relations between control height, horizontal padding, label role and icon. Returns [] when they hold; each entry is {code, path, message}.
 *  Takes the preset object so a test can pass a deliberately broken copy. */
export function controlViolations(preset) {
  const out = [], err = (code, path, message) => out.push({code, path: `$.controls.${path}`, message});
  const names = CONTROL_SIZE_NAMES, controls = preset.controls, density = preset.density;
  let prev = null;
  for (const name of names) {
    const c = controls?.[name];
    if (!c) { err('CT_MISSING', name, `${preset.id}: 컨트롤 크기 ${name}이 없습니다.`); continue; }
    const spec = preset.roles[c.labelRole];
    if (!spec || !['label', 'body'].includes(c.labelRole)) { err('CT_ROLE', `${name}.labelRole`, `${preset.id}/${name}: 라벨 역할은 label 또는 body여야 합니다(${c.labelRole}).`); continue; }
    const line = lineBoxPx(c.labelRole, spec, density), fontMax = maxFontPx(c.labelRole, spec, density);
    if (line + 2 * CONTROL_MIN_INSET > c.height) err('CT_LINE_BOX', `${name}.height`, `${preset.id}/${name}: 줄 높이 ${line.toFixed(1)}px + 위아래 여백 ${2 * CONTROL_MIN_INSET}px가 컨트롤 높이 ${c.height}px를 넘습니다.`);
    if (c.height % 4 !== 0) err('CT_GRID', `${name}.height`, `${preset.id}/${name}: 높이 ${c.height}px가 4px 격자 밖입니다.`);
    if (c.padX % 4 !== 0) err('CT_GRID', `${name}.padX`, `${preset.id}/${name}: 좌우 패딩 ${c.padX}px가 4px 격자 밖입니다.`);
    if (c.iconPx < fontMax * CONTROL_ICON_RATIO[0] || c.iconPx > fontMax * CONTROL_ICON_RATIO[1]) err('CT_ICON_RATIO', `${name}.iconPx`, `${preset.id}/${name}: 아이콘 ${c.iconPx}px가 글자 최대 ${fontMax.toFixed(1)}px의 ${CONTROL_ICON_RATIO.join('~')}배 밖입니다.`);
    if (c.iconPx + 2 * CONTROL_MIN_INSET > c.height) err('CT_ICON_FIT', `${name}.iconPx`, `${preset.id}/${name}: 아이콘 ${c.iconPx}px가 컨트롤 높이 ${c.height}px 안에 위아래 여백과 함께 들어가지 않습니다.`);
    if (prev) {
      if (!(c.height > prev.c.height)) err('CT_ORDER', `${name}.height`, `${preset.id}: ${prev.name} → ${name} 높이가 늘지 않습니다(${prev.c.height} → ${c.height}).`);
      if (c.padX < prev.c.padX) err('CT_ORDER', `${name}.padX`, `${preset.id}: ${prev.name} → ${name} 좌우 패딩이 줄었습니다(${prev.c.padX} → ${c.padX}).`);
      if (c.iconPx < prev.c.iconPx) err('CT_ORDER', `${name}.iconPx`, `${preset.id}: ${prev.name} → ${name} 아이콘이 줄었습니다(${prev.c.iconPx} → ${c.iconPx}).`);
      if (fontMax < prev.fontMax) err('CT_ORDER', `${name}.labelRole`, `${preset.id}: ${prev.name} → ${name} 라벨 글자가 작아졌습니다(${prev.fontMax.toFixed(1)} → ${fontMax.toFixed(1)}px).`);
    }
    prev = {name, c, fontMax};
  }
  const medium = controls?.medium;
  if (medium && medium.height !== SPACE[preset.space].control) err('CT_MEDIUM', 'medium.height', `${preset.id}: medium 높이 ${medium.height}px가 ${preset.space} 밀도의 control 토큰 ${SPACE[preset.space].control}px와 다릅니다.`);
  return out;
}

const buildPreset = ([id, spec]) => Object.freeze({
  id, label: spec.name, context: spec.context, density: spec.density, space: spec.space, engine: spec.engine,
  roles: freezeRoles(buildRoles(spec)), controls: resolveControls(id, spec),
});
export const MATERIAL_TYPE_PRESETS = Object.freeze(Object.fromEntries(Object.entries(SPEC).map(entry => [entry[0], buildPreset(entry)])));

export const MULTILINGUAL_TYPE_CORPUS = Object.freeze([
  {id: 'pangram-ko', role: 'body', text: '다람쥐 헌 쳇바퀴에 타고파.', policy: 'wrap'},
  {id: 'pangram-en', role: 'body', text: 'The quick brown fox jumps over the lazy dog.', policy: 'wrap'},
  {id: 'heading-short', role: 'display', text: '현황 요약', policy: 'wrap'},
  {id: 'heading-long', role: 'heading', text: '분기별 매출과 고객 유지율을 한 화면에서 확인하세요', policy: 'wrap'},
  {id: 'label', role: 'label', text: '활성 계정 · 결제 완료', policy: 'wrap'},
  {id: 'mixed-script', role: 'body', text: '이번 분기 Q3 매출은 YoY 18.4% 증가했습니다.', policy: 'wrap'},
  {id: 'unspaced-hangul', role: 'body', text: '한글한국어무공백긴문자열넘침확인용가나다라마바사아자차카타파하', policy: 'wrap'},
  {id: 'date', role: 'numeric', text: '2026-11-22 · 2026년 11월 22일', policy: 'nowrap'},
  {id: 'currency', role: 'numeric', text: '₩1,234,500 · USD 1,234,567.89', policy: 'nowrap'},
  {id: 'percent', role: 'numeric', text: '12.75% · −0.83%', policy: 'nowrap'},
  {id: 'table-number', role: 'numeric', text: '₩98,765,432  |  1,234,567  |  99.95%', policy: 'nowrap'},
  {id: 'code', role: 'code', text: 'const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);', policy: 'scroll'},
  {id: 'symbols', role: 'caption', text: '→ ⇧ ≤ ≥ ± × ÷ • — “한글” & English', policy: 'wrap'},
]);

const leadingCSS = name => {
  const base = `calc(var(--mt-${name}-leading) * var(--mt-leading-factor))`, [lo, hi] = LEADING_BOUNDS[name] ?? [];
  return lo === undefined ? base : hi === Infinity ? `max(${lo},${base})` : `clamp(${lo},${base},${hi})`;
};
const policyCSS = spec => (spec.policy === 'nowrap' ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' : spec.policy === 'scroll' ? 'white-space:pre;overflow-wrap:normal;' : 'word-break:keep-all;overflow-wrap:anywhere;');

export function renderMaterialTypeCSS(id) {
  const preset = MATERIAL_TYPE_PRESETS[id];
  if (!preset) throw new RangeError(`unknown material type preset: ${id}`);
  const scope = `.mt-specimen[data-preset="${id}"]`;
  const declarations = [
    ...Object.entries(preset.roles).flatMap(([name, spec]) => [
      `--mt-${name}:${spec.size}`, `--mt-${name}-weight:${spec.weight}`, `--mt-${name}-leading:${spec.lineHeight}`,
      `--mt-${name}-tracking:${spec.trackingEm}em`, `--mt-${name}-font:${spec.fontFamily}`,
    ]),
    ...Object.entries(preset.controls).flatMap(([size, c]) => [`--mt-control-${size}-h:${c.height}px`, `--mt-control-${size}-pad:${c.padX}px`, `--mt-control-${size}-gap:${c.gap}px`, `--mt-control-${size}-icon:${c.iconPx}px`]),
  ].join(';');
  const rules = Object.entries(preset.roles).map(([name, spec]) =>
    `.mt-role-${name}{font-family:var(--mt-${name}-font);${FLOOR_ROLES.includes(name) ? '--mt-density-factor:1;--mt-viewport-factor:1;' : ''}font-size:calc(var(--mt-${name}) * var(--mt-density-factor) * var(--mt-viewport-factor));font-weight:var(--mt-${name}-weight);line-height:${leadingCSS(name)};letter-spacing:var(--mt-${name}-tracking);${policyCSS(spec)}${name === 'numeric' ? 'font-variant-numeric:tabular-nums lining-nums;' : ''}}`
  ).join('\n');
  const densityRules = Object.entries(DENSITY_FACTORS).map(([d, f]) => `${scope}[data-density="${d}"]{--mt-density-factor:${f.size};--mt-leading-factor:${f.leading}}`).join('\n');
  const controlRules = Object.entries(preset.controls).map(([size]) => `${scope} .mt-control[data-size="${size}"]{height:var(--mt-control-${size}-h);padding-inline:var(--mt-control-${size}-pad);gap:var(--mt-control-${size}-gap)}${scope} .mt-control[data-size="${size}"] .mt-control-icon{width:var(--mt-control-${size}-icon);height:var(--mt-control-${size}-icon)}`).join('\n');
  const n = NARROW_VIEWPORT;
  return `/* ${preset.label}: viewport-fluid role sizes; density changes scale and rhythm (floor roles and Hangul leading limits stay fixed). */\n${scope}{${declarations};--mt-density-factor:1;--mt-leading-factor:1;--mt-viewport-factor:1;font-variant-numeric:proportional-nums;min-width:0}\n${densityRules}\n${rules}\n@media (max-width:${n.max}px){${scope}{--mt-viewport-factor:${n.base}}${scope} .mt-role-display{--mt-viewport-factor:${n.display}}${scope} .mt-role-heading{--mt-viewport-factor:${n.heading}}}\n.mt-control{display:inline-flex;align-items:center;justify-content:center;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;white-space:nowrap}.mt-control-icon{flex:none;border:2px solid currentColor;border-radius:4px}\n${controlRules}\n.mt-code-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain;padding:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:8px}\n.mt-table{width:100%;table-layout:fixed;border-collapse:collapse}.mt-table td.numeric{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums}\n`;
}

export function registerMaterialType(registry) {
  registry.addKind(defineKind({id: 'type-role-preset', label: '역할형 타이포그래피', categories: ['typography'], presetCapable: true, ext: {roles: 'object', fonts: 'array', density: 'string', wrap: 'object', engine: 'string', controls: 'object'}}));
  for (const [id, preset] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    const broken = controlViolations(preset);
    if (broken.length) throw new Error(`type-role-preset ${id}: control relations broken\n${broken.map(e => `${e.path} [${e.code}] ${e.message}`).join('\n')}`);
    const fonts = [...new Set(Object.values(preset.roles).map(r => r.fontFamily))];
    const roles = Object.fromEntries(Object.entries(preset.roles).map(([name, spec]) => [name, {...spec}]));
    const controls = Object.fromEntries(Object.entries(preset.controls).map(([size, c]) => [size, {...c}]));
    registry.register(defineMaterial({
      id: materialId('type-role-preset', id), kind: 'type-role-preset', category: 'typography', label: preset.label,
      since: '2.6.0', contexts: preset.context, render: {module: 'src/materials/typography.mjs', export: 'renderMaterialTypeCSS', key: id},
      defaults: {preset: id}, variants: {preset: [id]},
      tokens: [...Object.keys(preset.roles).map(name => `--mt-${name}`), ...CONTROL_SIZE_NAMES.map(size => `--mt-control-${size}-h`)],
      responsive: {strategy: 'fluid', breakpoints: [NARROW_VIEWPORT.max], note: 'role sizes use clamp(); display and heading reduce on compact viewports'},
      examples: [{render: 'renderMaterialTypeCSS', key: id}],
      quality: {status: 'verified', evidence: ['tests/material-type.test.mjs:14', 'tests/material-type.test.mjs:49', 'tests/material-type.test.mjs:126', 'tests/material-type.test.mjs:143']},
      preset: true, tags: ['role-based', 'multilingual', 'responsive'],
      ext: {roles, fonts, density: preset.density, engine: preset.engine, controls, wrap: {body: 'pretty with Korean-safe overflow fallback', title: 'balanced', numeric: 'nowrap', code: 'horizontal-scroll'}},
    }));
  }
  return registry;
}

const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function renderMaterialTypeExample() {
  const styles = Object.keys(MATERIAL_TYPE_PRESETS).map(renderMaterialTypeCSS).join('\n');
  const specimens = Object.values(MATERIAL_TYPE_PRESETS).map(preset => {
    const rows = MULTILINGUAL_TYPE_CORPUS.map(sample => `<div class="mt-sample" data-sample="${sample.id}" data-policy="${sample.policy}"><span class="mt-caption">${sample.id} · ${sample.policy}</span><p class="mt-role-${sample.role}">${escapeHTML(sample.text)}</p></div>`).join('\n');
    const controls = Object.entries(preset.controls).map(([size, c]) => `<button type="button" class="mt-control mt-role-${c.labelRole}" data-size="${size}"><span class="mt-control-icon" aria-hidden="true"></span>${size} ${c.height}px</button>`).join('');
    return `<section class="mt-specimen" data-preset="${preset.id}" data-density="${preset.density}"><h2 class="mt-role-heading">${preset.label} · 역할 타이포그래피</h2><div class="mt-grid">${rows}</div><div class="mt-code-scroll"><code class="mt-role-code">const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);</code></div><table class="mt-table"><thead><tr><th>항목</th><th>합계</th></tr></thead><tbody><tr><td>구독 수익</td><td class="numeric mt-role-numeric">₩1,234,500</td></tr><tr><td>전환율</td><td class="numeric mt-role-numeric">12.75%</td></tr></tbody></table><div class="mt-controls">${controls}</div></section>`;
  }).join('\n');
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Material Type · 다국어 코퍼스</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f5f6f8;color:#17191c;font:16px/1.5 ${STACKS.system};word-break:keep-all;overflow-wrap:anywhere}.mt-page{max-width:1200px;margin:auto}.mt-page>h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;letter-spacing:-.04em}.mt-specimen{margin:24px 0;padding:clamp(16px,3vw,28px);background:white;border:1px solid #d9dde3;border-radius:12px}.mt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px}.mt-sample{min-width:0;padding:14px;border:1px solid #e3e6eb;border-radius:8px}.mt-caption{display:block;margin-bottom:8px;font:600 .7rem/1.4 ${STACKS.system};color:#626b78}.mt-role-display{font-family:var(--mt-display-font);font-size:var(--mt-display);font-weight:var(--mt-display-weight);line-height:var(--mt-display-leading);letter-spacing:var(--mt-display-tracking)}.mt-role-heading{font-family:var(--mt-heading-font);font-size:var(--mt-heading);font-weight:var(--mt-heading-weight);line-height:var(--mt-heading-leading);letter-spacing:var(--mt-heading-tracking)}.mt-role-body{font-family:var(--mt-body-font);font-size:var(--mt-body);font-weight:var(--mt-body-weight);line-height:var(--mt-body-leading);letter-spacing:var(--mt-body-tracking)}.mt-role-label{font:var(--mt-label-weight) var(--mt-label) / var(--mt-label-leading) var(--mt-label-font);letter-spacing:var(--mt-label-tracking)}.mt-role-caption{font:var(--mt-caption-weight) var(--mt-caption) / var(--mt-caption-leading) var(--mt-caption-font);letter-spacing:var(--mt-caption-tracking)}.mt-role-numeric{font-family:var(--mt-numeric-font);font-size:var(--mt-numeric);font-weight:var(--mt-numeric-weight);line-height:var(--mt-numeric-leading);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}.mt-role-code{font-family:var(--mt-code-font);font-size:var(--mt-code);line-height:var(--mt-code-leading);white-space:pre}.mt-code-scroll{max-width:100%;overflow-x:auto;padding:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:8px}.mt-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:16px}.mt-table{width:100%;table-layout:fixed;border-collapse:collapse;margin-top:16px}.mt-table td,.mt-table th{padding:10px;border-bottom:1px solid #e3e6eb;text-align:left}.mt-table td.numeric{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums}.mt-sample[data-policy=nowrap] p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-sample[data-policy=scroll] p{white-space:pre;overflow-x:auto}.mt-sample[data-policy=wrap] p{word-break:keep-all;overflow-wrap:anywhere}@media(max-width:720px){body{padding:14px}.mt-specimen{padding:16px}.mt-grid{grid-template-columns:minmax(0,1fr)}}\n${styles}</style><main class="mt-page"><h1>다국어 타이포그래피 코퍼스</h1><p>역할별 크기·굵기·행간·자간·실제 시스템 서체 폴백과 화면 폭·밀도 대응을 확인합니다.</p>${specimens}</main></html>`;
}
