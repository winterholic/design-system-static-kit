/**
 * 결정적 조립: assemble(profileId, intent, content) → 프로파일 기본값으로 채운 유효한 2.6.0 Blueprint.
 *
 * - 등록된 재료(프로파일·패턴·템플릿·테마·부품)만 고른다. 프로파일이 허용하지 않는 요구는 다른 값으로 바꾸지 않고
 *   ASSEMBLE_* 진단과 대안(alternatives)을 돌려준다(ok:false, blueprint:null). 요구하지 않은 값만 프로파일 기본값으로 정하고 decisions에 적는다.
 * - 시간·난수·전역 상태를 읽지 않는다. 같은 입력은 같은 JSON 바이트를 낸다.
 * - 결과 Blueprint는 검증기(src/validate.mjs, 프로파일 검사 포함)를 통과해야 ok:true다.
 */
import {createBlueprint, axisBans, themes, pageTypes, templates} from '../catalog/index.mjs';
import {validateBlueprint} from '../validate.mjs';
import {hintFor} from '../service/errors.mjs';
import {materialId} from '../materials/contract.mjs';
import {PROFILES, PROFILE_IDS, PATTERNS, PROFILE_AXES, PROFILE_SINCE} from './data.mjs';
import {sharedDesignRegistry} from './registry.mjs';

/** 조립이 받는 요구와 내용의 키. 이 밖의 키(예: css, style, className, html)는 지원하지 않는다는 진단이 된다. */
export const INTENT_KEYS = Object.freeze(['pattern', 'theme', 'density', 'mode', 'shell', 'width', 'typography', 'controlSize', 'components', 'chartPresets']);
export const CONTENT_KEYS = Object.freeze(['name', 'nav', 'slots']);

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x));
const strip = (prefix, x) => (typeof x === 'string' && x.startsWith(prefix + ':') ? x.slice(prefix.length + 1) : x);
const show = v => (typeof v === 'string' ? v : JSON.stringify(v) ?? String(v));

function diag(code, path, message, reason, {severity = 'error', fix = null, alternatives = []} = {}) {
  return {code, path, severity, message, reason, fix, alternatives: [...alternatives], hint: hintFor(code)};
}

/** 검증기 오류·경고를 조립 진단 모양으로. */
const fromValidator = (e, severity) => ({code: e.code, path: e.path, severity, message: e.message, reason: e.message, fix: e.fix ?? null, alternatives: [], hint: hintFor(e.code)});

/**
 * profileId: PROFILE_IDS 중 하나. intent: {pattern, theme, density, mode, shell, width, typography, controlSize, components, chartPresets} 모두 선택.
 * content: {name, nav, slots: {슬롯 id: [노드…]}} 모두 선택. 슬롯을 비우면 패턴 뼈대 템플릿의 내용이 들어간다.
 * options.registry: 재료 레지스트리(기본 sharedDesignRegistry()). 통합 중 재료를 등록한 레지스트리로 시험할 때 준다.
 * 반환: {ok, blueprint, diagnostics, decisions, materials}
 */
export function assemble(profileId, intent = {}, content = {}, {registry = null} = {}) {
  const diagnostics = [], decisions = [];
  const fail = () => ({ok: false, blueprint: null, diagnostics, decisions, materials: null});
  const unsupported = (path, message, reason, alternatives = [], code = 'ASSEMBLE_UNSUPPORTED') => diagnostics.push(diag(code, path, message, reason, {alternatives}));

  if (typeof profileId !== 'string' || !Object.hasOwn(PROFILES, profileId)) {
    unsupported('$args.profile', `알 수 없는 프로파일: ${show(profileId)}`, '등록된 프로파일만 조립합니다.', PROFILE_IDS);
    return fail();
  }
  if (!plain(intent)) { unsupported('$args.intent', 'intent는 객체여야 합니다.', '요구는 닫힌 키를 가진 객체로만 받습니다.', INTENT_KEYS); return fail(); }
  if (!plain(content)) { unsupported('$args.content', 'content는 객체여야 합니다.', '내용은 닫힌 키를 가진 객체로만 받습니다.', CONTENT_KEYS); return fail(); }
  for (const k of Object.keys(intent)) if (!INTENT_KEYS.includes(k)) unsupported(`$args.intent.${k}`, `지원하지 않는 요구: ${k}`, '조립은 재료 id·프리셋·축 값만 고릅니다. 임의 CSS·HTML·className·px·색 값을 넣는 경로는 없습니다.', INTENT_KEYS);
  for (const k of Object.keys(content)) if (!CONTENT_KEYS.includes(k)) unsupported(`$args.content.${k}`, `지원하지 않는 내용 키: ${k}`, '내용은 이름·내비·슬롯 노드만 받습니다.', CONTENT_KEYS);
  if (diagnostics.length) return fail();

  const reg = registry ?? sharedDesignRegistry();
  const p = PROFILES[profileId], pm = reg.get(materialId('profile', profileId));
  const allowedComponents = pm.ext.components.map(id => strip('component', id));
  const allowedPresets = pm.ext.charts.presets;

  // ---- 패턴 ----
  const patternId = strip('pattern', intent.pattern ?? p.patterns[0]);
  if (!p.patterns.includes(materialId('pattern', patternId))) {
    unsupported('$args.intent.pattern', `${profileId} 프로파일은 패턴 ${show(intent.pattern)}을 허용하지 않습니다.`, '프로파일이 고른 레이아웃 패턴만 조립합니다.', p.patterns, 'ASSEMBLE_PATTERN');
    return fail();
  }
  const pattern = PATTERNS[patternId], template = templates[pattern.template], pageType = pageTypes[template.pageType];

  // ---- 스칼라 요구: 허용 목록 안이어야 한다 ----
  const shells = pattern.shells.filter(s => p.chrome.shells.includes(s));
  const widths = pattern.widths.filter(w => p.axes.width.includes(w) && (!pageType.widths || pageType.widths.includes(w)));
  const choices = {theme: p.themes, density: p.density.allowed, mode: p.color.modes, shell: shells, width: widths, typography: p.type.typography, controlSize: p.controlSize.allowed};
  for (const [key, allowed] of Object.entries(choices)) {
    if (!Object.hasOwn(intent, key)) continue;
    if (!allowed.includes(intent[key])) unsupported(`$args.intent.${key}`, `${profileId}/${patternId}에서 ${key}=${show(intent[key])}는 지원하지 않습니다.`, `허용값만 고를 수 있고 다른 값으로 바꾸지 않습니다.`, allowed);
  }
  // ---- 목록 요구: 부품과 차트 프리셋 ----
  const listOf = (key, value) => { if (Array.isArray(value)) return value; unsupported(`$args.intent.${key}`, `${key}는 배열이어야 합니다.`, '재료 id 문자열 목록만 받습니다.'); return []; };
  if (Object.hasOwn(intent, 'components')) listOf('components', intent.components).forEach((raw, i) => {
    const type = strip('component', raw), path = `$args.intent.components[${i}]`;
    if (allowedComponents.includes(type)) return;
    if (p.pendingComponents.includes(raw) || p.pendingComponents.includes(materialId('component', type))) unsupported(path, `부품 재료 ${show(raw)}은 아직 등록되지 않았습니다.`, '통합 중인 재료는 레지스트리에 등록된 뒤에만 고를 수 있습니다.', p.substitutes[type] ? [p.substitutes[type]] : [], 'ASSEMBLE_PENDING');
    else unsupported(path, `${profileId} 프로파일은 부품 ${show(raw)}을 허용하지 않습니다.`, '등록되고 프로파일이 허용한 부품만 조립합니다. 부품 구현을 직접 넣는 경로는 없습니다.', p.substitutes[type] ? [p.substitutes[type]] : allowedComponents);
  });
  if (Object.hasOwn(intent, 'chartPresets')) listOf('chartPresets', intent.chartPresets).forEach((raw, i) => {
    const id = typeof raw === 'string' && !raw.startsWith('chart-preset:') ? materialId('chart-preset', raw) : raw, path = `$args.intent.chartPresets[${i}]`;
    if (allowedPresets.includes(id)) return;
    if (p.charts.presets.includes(id)) unsupported(path, `차트 프리셋 ${show(raw)}은 아직 등록되지 않았습니다.`, '통합 중인 차트 프리셋은 등록된 뒤에만 고를 수 있습니다. 지금은 chart 부품의 형태(kind)로 고르세요.', p.charts.kinds, 'ASSEMBLE_PENDING');
    else unsupported(path, `${profileId} 프로파일은 차트 프리셋 ${show(raw)}을 허용하지 않습니다.`, p.charts.kinds.length ? '프로파일이 고른 차트 프리셋만 씁니다.' : '이 프로파일은 차트를 쓰지 않습니다.', allowedPresets.length ? allowedPresets : p.charts.kinds);
  });
  if (Array.isArray(intent.chartPresets) && allowedPresets.length && intent.chartPresets.length > p.charts.max) unsupported('$args.intent.chartPresets', `차트 프리셋은 ${p.charts.max}개까지입니다.`, '프로파일 품질 기준의 페이지당 차트 수 상한입니다.');

  // ---- 내용 슬롯 ----
  const slots = content.slots ?? {};
  if (!plain(slots)) unsupported('$args.content.slots', 'slots는 {슬롯 id: [노드…]} 객체여야 합니다.', '내용은 패턴 슬롯 단위로만 받습니다.', pattern.slots.map(s => s.id), 'ASSEMBLE_SLOT');
  else for (const [slotId, nodes] of Object.entries(slots)) {
    const slot = pattern.slots.find(s => s.id === slotId), path = `$args.content.slots.${slotId}`;
    if (!slot) { unsupported(path, `패턴 ${patternId}에 슬롯 ${slotId}가 없습니다.`, '패턴이 정한 슬롯에만 내용을 넣습니다.', pattern.slots.map(s => s.id), 'ASSEMBLE_SLOT'); continue; }
    if (!Array.isArray(nodes)) { unsupported(path, '슬롯 내용은 노드 배열이어야 합니다.', '슬롯은 순서 있는 노드 목록입니다.', [], 'ASSEMBLE_SLOT'); continue; }
    if (nodes.length < slot.min || nodes.length > slot.max) unsupported(path, `슬롯 ${slotId}에는 노드 ${slot.min}~${slot.max}개를 넣습니다(${nodes.length}개).`, '패턴의 슬롯 개수 제한입니다.', [], 'ASSEMBLE_SLOT');
    const accepts = slot.accepts.filter(t => allowedComponents.includes(t));
    nodes.forEach((n, i) => { if (!plain(n) || !accepts.includes(n.type)) unsupported(`${path}[${i}]`, `슬롯 ${slotId}는 ${show(plain(n) ? n.type : n)}을 받지 않습니다.`, `이 슬롯과 ${profileId} 프로파일이 함께 허용하는 부품만 넣습니다.`, accepts, 'ASSEMBLE_CONTENT'); });
  }
  if (diagnostics.length) return fail();

  // ---- Blueprint: 뼈대 템플릿 + 테마, 그 위에 프로파일 기본값과 요구 ----
  const themeId = intent.theme ?? p.themes[0];
  const b = createBlueprint(pattern.template, themeId);
  const set = (axis, to, source) => { if (b[axis] !== to) decisions.push({axis, from: b[axis] ?? null, to, source}); b[axis] = to; };
  const keepOr = (axis, allowed) => (allowed.includes(b[axis]) ? b[axis] : allowed[0]);
  set('catalogVersion', PROFILE_SINCE, 'profile');
  b.profile = profileId;
  set('colorPalette', p.color.palettes[0], 'profile');
  const pick = (axis, fallback) => set(axis, Object.hasOwn(intent, axis) ? intent[axis] : fallback, Object.hasOwn(intent, axis) ? 'intent' : 'profile');
  pick('mode', keepOr('mode', p.color.modes));
  pick('density', p.density.default);
  pick('typography', keepOr('typography', p.type.typography));
  pick('shell', shells[0]);
  pick('width', widths[0]);
  for (const axis of PROFILE_AXES.filter(a => a !== 'width')) set(axis, keepOr(axis, p.axes[axis]), 'profile');
  set('footer', keepOr('footer', p.chrome.footer), 'profile');

  // 축 금지 조합과 테마 금지: 요구한 축이면 거부하고, 프로파일 기본값이면 프로파일이 허용하는 다른 값으로 정한다.
  const theme = themes[themeId];
  for (let round = 0; round < 4; round++) {
    let changed = false;
    for (const [axis, banned] of Object.entries(theme.forbid)) {
      if (!banned.includes(b[axis])) continue;
      const pool = (p.axes[axis] ?? choices[axis] ?? []).filter(v => !banned.includes(v));
      if (Object.hasOwn(intent, axis) || !pool.length) { unsupported(`$args.intent.${axis}`, `테마 ${themeId}는 ${axis}=${b[axis]}를 금지합니다.`, '테마 금지 값(R10)과 프로파일 허용값이 겹치지 않습니다.', pool); continue; }
      set(axis, pool[0], 'theme-forbid'); changed = true;
    }
    for (const ban of axisBans) {
      if (!ban.bad(b)) continue;
      const [axis, to] = Object.entries(ban.fix)[0], allowed = p.axes[axis] ?? choices[axis] ?? [to];
      if (Object.hasOwn(intent, axis) || !allowed.includes(to)) { unsupported(`$args.intent.${ban.uses.find(a => Object.hasOwn(intent, a)) ?? axis}`, `${ban.id}: ${ban.why}`, '축 금지 조합(R09)이고 프로파일 안에 대안이 없거나 요구한 값입니다.', allowed.filter(v => v !== b[axis])); continue; }
      set(axis, to, ban.id); changed = true;
    }
    if (diagnostics.length || !changed) break;
  }
  if (diagnostics.length) return fail();

  // ---- 트리와 내비 ----
  const skeleton = b.tree.children, children = [];
  for (const slot of pattern.slots) children.push(...structuredClone(Object.hasOwn(slots, slot.id) ? slots[slot.id] : slot.from.map(i => skeleton[i])));
  if (children.length > pattern.maxTopLevel) { unsupported('$args.content.slots', `패턴 ${patternId}의 최상위 구역은 ${pattern.maxTopLevel}개까지입니다(${children.length}개).`, '패턴 제한 조건입니다.', [], 'ASSEMBLE_SLOT'); return fail(); }
  b.tree = {type: 'page', children};
  if (Object.hasOwn(content, 'name')) b.name = content.name;
  if (Object.hasOwn(content, 'nav')) b.chrome = {...b.chrome, nav: structuredClone(content.nav)};

  const verdict = validateBlueprint(b);
  for (const w of verdict.warnings ?? []) diagnostics.push(fromValidator(w, w.severity === 'info' ? 'info' : 'warning'));
  if (!verdict.valid) {
    diagnostics.unshift(diag('ASSEMBLE_INVALID', '$', '조립 결과가 검증을 통과하지 못했습니다.', '슬롯·프로파일 규칙은 지켰지만 부품·페이지 규칙에 걸렸습니다. 아래 진단을 고치세요.'));
    diagnostics.push(...verdict.errors.map(e => fromValidator(e, 'error')));
    return fail();
  }
  const materials = {
    profile: pm.id, pattern: materialId('pattern', patternId), template: materialId('template', pattern.template), theme: materialId('theme', themeId),
    typeRole: p.type.rolePreset, controlSize: intent.controlSize ?? p.controlSize.default, tableRows: structuredClone(p.tableRows),
    chartPresets: Array.isArray(intent.chartPresets) ? intent.chartPresets.map(x => (x.startsWith('chart-preset:') ? x : materialId('chart-preset', x))) : [],
    narrow: {...p.narrow}, pending: [...pm.ext.pending],
  };
  return {ok: true, blueprint: b, diagnostics, decisions, materials};
}
