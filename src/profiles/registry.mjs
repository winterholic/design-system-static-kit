/**
 * 프로파일·레이아웃 패턴을 재료 계약(ADR 0011)으로 등록한다. catalogRegistry() 위에 `profile` 종류를 더하고
 * 패턴 11개(`pattern` 종류)와 프로파일 7개를 올린 뒤 참조 무결성을 검사한다.
 *
 * catalogRegistry() 자체는 바꾸지 않는다(그 수량과 "pattern 재료 0개"는 기존 계약 테스트가 고정한다). 프로파일을 쓰는 쪽은 designRegistry()를 부른다.
 * 통합 중인 재료(차트 프리셋, Select, 데이터 테이블)는 레지스트리에 있을 때만 허용 목록에 들고, 없으면 `pending`에 남는다.
 */
import {defineKind, defineMaterial, materialId, qualityRank} from '../materials/contract.mjs';
import {catalogRegistry} from '../materials/index.mjs';
import {CONTROL_SIZE_NAMES} from '../materials/typography.mjs';
import {templates, axes, themes, pageTypes} from '../catalog/index.mjs';
import {PROFILES, PROFILE_IDS, PATTERNS, PATTERN_IDS, NARROW_STRATEGIES, INFO_DENSITY, PROFILE_SINCE, PROFILE_RULES} from './data.mjs';

export const PROFILE_KIND = defineKind({
  id: 'profile', label: '디자인 프로파일', categories: ['profile'], presetCapable: true,
  ext: {density: 'object', type: 'object', controlSize: 'object', tableRows: 'object', chrome: 'object', components: 'array', substitutes: 'object', patterns: 'array', charts: 'object', themes: 'array', axes: 'object', color: 'object', fields: 'object', narrow: 'object', quality: 'object', pending: 'array'},
});

/** 품질 근거. 그 재료를 실패시킬 수 있는 테스트의 file:line이다. tests/profiles.test.mjs가 줄이 실제 test( 인지 확인한다. */
export const PROFILE_EVIDENCE = Object.freeze(['tests/profiles.test.mjs:26', 'tests/profiles.test.mjs:173']);
export const PATTERN_EVIDENCE = Object.freeze(['tests/profiles.test.mjs:51', 'tests/profiles-assemble.test.mjs:22']);

const C = type => materialId('component', type);

export function patternMaterials() {
  return PATTERN_IDS.map(id => {
    const pt = PATTERNS[id], t = templates[pt.template];
    const accepts = [...new Set(pt.slots.flatMap(s => s.accepts))].sort();
    return defineMaterial({
      id: materialId('pattern', id), kind: 'pattern', category: 'layout-navigation', label: pt.label, since: PROFILE_SINCE, contexts: [t.pageType],
      render: {module: 'src/profiles/assemble.mjs', export: 'assemble', key: id},
      defaults: {shell: pt.shells[0], width: pt.widths[0]},
      variants: {shell: [...pt.shells], width: [...pt.widths]},
      dependencies: [materialId('template', pt.template), materialId('page-type', t.pageType), ...pt.primitives.map(p => materialId('layout-primitive', p)), ...(pt.recipe ? [materialId('recipe', pt.recipe)] : [])],
      structure: {parents: [], children: {allowed: accepts.map(C), min: pt.slots.reduce((n, s) => n + s.min, 0), max: Math.min(pt.maxTopLevel, pt.slots.reduce((n, s) => n + s.max, 0))}},
      responsive: {strategy: 'viewport', breakpoints: [720], note: '좁은 화면 대체는 프로파일의 narrow 전략(NARROW_STRATEGIES)이 정한다'},
      validation: {rules: ['R11', ...PROFILE_RULES.map(r => r.id)], codes: ['ASSEMBLE_SLOT', 'ASSEMBLE_CONTENT', 'PROFILE_COMPONENT', 'PROFILE_QUALITY']},
      examples: [{pattern: id}],
      quality: {status: 'verified', evidence: [...PATTERN_EVIDENCE]},
      preset: true, tags: ['pattern', t.pageType, id],
      ext: {slots: pt.slots.map(s => ({id: s.id, accepts: [...s.accepts], materials: s.accepts.map(C), min: s.min, max: s.max, from: [...s.from]}))},
    });
  });
}

/** 프로파일 하나를 재료로. registry는 통합 중 재료의 등록 여부를 판단할 때만 읽는다. */
export function profileMaterial(id, registry) {
  const p = PROFILES[id];
  const pendingIds = [...p.pendingComponents, ...p.charts.presets];
  const pending = pendingIds.filter(x => !registry.has(x));
  const extraComponents = p.pendingComponents.filter(x => registry.has(x));
  const presets = p.charts.presets.filter(x => registry.has(x));
  return defineMaterial({
    id: materialId('profile', id), kind: 'profile', category: 'profile', label: p.label, since: PROFILE_SINCE, contexts: [...p.contexts],
    render: {module: 'src/profiles/assemble.mjs', export: 'assemble', key: id},
    defaults: {pattern: p.patterns[0], theme: p.themes[0], density: p.density.default, controlSize: p.controlSize.default, mode: p.color.modes[0]},
    variants: {pattern: [...p.patterns], theme: [...p.themes], density: [...p.density.allowed], controlSize: [...p.controlSize.allowed], mode: [...p.color.modes]},
    tokens: [],
    dependencies: [p.type.rolePreset, ...p.themes.map(t => materialId('theme', t)), ...p.patterns, ...p.components.map(C), ...extraComponents, ...presets, ...p.type.typography.map(t => materialId('type-preset', t))],
    responsive: {strategy: 'viewport', breakpoints: [p.narrow.maxWidth], note: Object.entries(p.narrow).filter(([k]) => k !== 'maxWidth').map(([k, v]) => `${k}:${v}`).join(' ')},
    a11y: {rules: ['R05', 'R12', 'R19']},
    validation: {rules: PROFILE_RULES.map(r => r.id), codes: PROFILE_RULES.map(r => r.code)},
    examples: [{profile: id}],
    quality: {status: 'verified', evidence: [...PROFILE_EVIDENCE]},
    preset: true, tags: ['profile', p.density.info, ...p.contexts],
    ext: {
      density: structuredClone(p.density), type: structuredClone(p.type), controlSize: structuredClone(p.controlSize), tableRows: structuredClone(p.tableRows),
      chrome: structuredClone(p.chrome), components: [...p.components.map(C), ...extraComponents].sort(), substitutes: {...p.substitutes}, patterns: [...p.patterns],
      charts: {kinds: [...p.charts.kinds], max: p.charts.max, presets}, themes: [...p.themes], axes: structuredClone(p.axes), color: structuredClone(p.color),
      fields: structuredClone(p.fields), narrow: {...p.narrow}, quality: {...p.quality}, pending,
    },
  });
}

/**
 * 프로파일 고유의 무결성(재료 계약이 모르는 관계). 오류 {code, path, message}. 비면 통과.
 * 참조 재료의 품질 하한, 패턴 뼈대와 프로파일 맥락, 필수 슬롯의 허용 부품, enum 값(밀도·셸·축·컨트롤 크기·좁은 화면 전략)을 본다.
 */
export function profileIntegrity(registry) {
  const errors = [], err = (code, path, message) => errors.push({code, path, message});
  for (const m of registry.byKind('profile')) {
    const id = m.id.slice('profile:'.length), p = PROFILES[id], at = path => `${m.id}${path}`;
    if (!p) { err('M_PROFILE_UNKNOWN', at(''), '데이터에 없는 프로파일'); continue; }
    if (!INFO_DENSITY.includes(p.density.info)) err('M_PROFILE_ENUM', at('.ext.density.info'), p.density.info);
    for (const [path, values, allowed] of [
      ['.ext.density.allowed', [...p.density.allowed, p.density.default, ...p.tableRows.density], axes.density],
      ['.ext.chrome.shells', p.chrome.shells, axes.shell], ['.ext.chrome.footer', p.chrome.footer, axes.footer],
      ['.ext.color.modes', p.color.modes, axes.mode], ['.ext.controlSize', [...p.controlSize.allowed, p.controlSize.default], CONTROL_SIZE_NAMES],
      ['.ext.type.typography', [...p.type.typography, p.type.default], axes.typography],
      ...Object.entries(p.axes).map(([axis, vs]) => [`.ext.axes.${axis}`, vs, axes[axis] ?? []]),
    ]) for (const v of values) if (!allowed.includes(v)) err('M_PROFILE_ENUM', at(path), `허용되지 않은 값: ${v}`);
    if (!p.density.allowed.includes(p.density.default) || !p.controlSize.allowed.includes(p.controlSize.default) || !p.type.typography.includes(p.type.default)) err('M_PROFILE_DEFAULT', at('.defaults'), '기본값이 허용 목록 밖입니다.');
    for (const [k, v] of Object.entries(p.narrow)) if (k !== 'maxWidth' && !Object.hasOwn(NARROW_STRATEGIES, v)) err('M_PROFILE_NARROW', at(`.ext.narrow.${k}`), `알 수 없는 좁은 화면 전략: ${v}`);
    for (const [from, to] of Object.entries(p.substitutes)) if (p.components.includes(from) || !p.components.includes(to)) err('M_PROFILE_SUBSTITUTE', at(`.ext.substitutes.${from}`), `대체 부품은 금지 부품 → 허용 부품이어야 합니다: ${from} → ${to}`);
    for (const kind of p.charts.kinds) if (!p.components.includes('chart')) err('M_PROFILE_CHART', at('.ext.charts.kinds'), `chart 부품 없이 차트 형태 ${kind}를 허용합니다.`);
    for (const t of p.themes) if (!themes[t]) err('M_REFERENCE', at('.ext.themes'), t);
    for (const pageType of p.contexts) if (!pageTypes[pageType]) err('M_REFERENCE', at('.contexts'), pageType);
    // 참조 재료의 품질 하한: 조립이 enum-only·missing 재료를 고르지 않게 한다.
    for (const dep of m.dependencies) {
      const d = registry.get(dep);
      if (d && qualityRank(d.quality.status) < qualityRank(p.quality.minMaterial)) err('M_PROFILE_QUALITY', at('.dependencies'), `${dep} 품질 ${d.quality.status} < ${p.quality.minMaterial}`);
    }
    for (const pid of p.patterns) {
      const pt = PATTERNS[pid.slice('pattern:'.length)];
      if (!pt) continue; // M_REFERENCE가 잡는다
      const pageType = templates[pt.template].pageType;
      if (!p.contexts.includes(pageType)) err('M_PROFILE_PATTERN', at('.ext.patterns'), `${pid}의 페이지 유형 ${pageType}을 프로파일이 다루지 않습니다.`);
      if (!pt.shells.some(s => p.chrome.shells.includes(s))) err('M_PROFILE_PATTERN', at('.ext.patterns'), `${pid}와 프로파일이 함께 허용하는 셸이 없습니다.`);
      for (const s of pt.slots) if (s.min > 0 && !s.accepts.some(a => p.components.includes(a))) err('M_PROFILE_PATTERN', at('.ext.patterns'), `${pid}의 필수 슬롯 ${s.id}에 프로파일이 허용하는 부품이 없습니다.`);
    }
  }
  for (const m of registry.byKind('pattern')) {
    const pt = PATTERNS[m.id.slice('pattern:'.length)];
    if (!pt) { err('M_PROFILE_UNKNOWN', m.id, '데이터에 없는 패턴'); continue; }
    const top = templates[pt.template].tree, used = pt.slots.flatMap(s => s.from);
    if (JSON.stringify(used) !== JSON.stringify(top.map((_, i) => i))) err('M_PATTERN_SLOTS', `${m.id}.ext.slots`, `슬롯 from이 뼈대 ${pt.template}의 최상위 자식 0..${top.length - 1}을 순서대로 한 번씩 덮어야 합니다.`);
    for (const s of pt.slots) for (const i of s.from) if (top[i] && !s.accepts.includes(top[i].type)) err('M_PATTERN_SLOTS', `${m.id}.ext.slots.${s.id}`, `뼈대의 ${i}번 자식 ${top[i].type}을 슬롯이 받지 않습니다.`);
    for (const s of pt.slots) if (s.from.length < s.min || s.from.length > s.max) err('M_PATTERN_SLOTS', `${m.id}.ext.slots.${s.id}`, '뼈대 내용 수가 슬롯 범위 밖입니다.');
    const pageType = templates[pt.template].pageType;
    for (const s of pt.shells) if (!pageTypes[pageType].shells.includes(s)) err('M_PATTERN_SHELL', `${m.id}.variants.shell`, `페이지 유형 ${pageType}이 셸 ${s}를 허용하지 않습니다.`);
    for (const w of pt.widths) if (pageTypes[pageType].widths && !pageTypes[pageType].widths.includes(w)) err('M_PATTERN_SHELL', `${m.id}.variants.width`, `페이지 유형 ${pageType}이 폭 ${w}를 허용하지 않습니다.`);
  }
  return errors;
}

/**
 * catalogRegistry()(또는 주어진 base)에 profile 종류·패턴·프로파일을 더한 레지스트리. 참조나 프로파일 무결성이 깨지면 예외다.
 * base를 주면 그 레지스트리를 바꾼다(통합 중 재료를 미리 등록한 레지스트리로 시험할 때 쓴다).
 */
export function designRegistry({base = null} = {}) {
  const registry = base ?? catalogRegistry();
  if (!registry.kind('profile')) registry.addKind(PROFILE_KIND);
  registry.registerAll(patternMaterials());
  for (const id of PROFILE_IDS) registry.register(profileMaterial(id, registry));
  const broken = [...registry.check(), ...profileIntegrity(registry)];
  if (broken.length) { const error = new Error('profile graph broken:\n' + broken.slice(0, 10).map(e => `${e.path} [${e.code}] ${e.message}`).join('\n')); error.errors = broken; throw error; }
  return registry;
}

let shared = null;
/** 기본 레지스트리 하나를 만들어 다시 쓴다(조립이 매번 1,000개 넘는 재료를 다시 검사하지 않게). 얼어 있는 재료만 돌려주므로 공유해도 안전하다. */
export const sharedDesignRegistry = () => (shared ??= designRegistry());

/** 프로파일별 통합 대기 재료: 데이터에 적었지만 레지스트리에 아직 없어 허용 목록에서 뺀 id. */
export const pendingMaterials = (registry = sharedDesignRegistry()) => Object.fromEntries(PROFILE_IDS.map(id => [id, registry.get(materialId('profile', id)).ext.pending]));
