/**
 * 기존 카탈로그(부품·축·서체·테마·팔레트·페이지 유형·템플릿·레시피·배치 원형·아이콘)를 재료 계약으로 옮긴다.
 * 읽기만 한다: 카탈로그 객체를 바꾸지 않고 컴파일 경로(src/compiler.mjs)는 이 파일을 import하지 않는다.
 * 그래서 2.1.0~2.5.0 출력은 그대로다(tests/materials-registry.test.mjs가 2.4.0·2.5.0 고정 해시로 확인).
 *
 * 근거(quality.evidence)는 해당 동작을 실패시킬 수 있는 테스트의 file:line이다. 테스트가 줄을 옮기면 materials 테스트가 잡는다.
 */
import {nodeSpecs, axes, styleAxes, axisDefs, axisBans, themes, palettes, pageTypes, pageTypeIds, templates, recipes, icons, iconAliases, rules, requiredOf} from '../catalog/index.mjs';
import {chunks} from '../styles/chunks.mjs';
import {RADIUS, WIDTH, WEIGHT, ICON, ELEVATION, MOTION, BACKDROP, DENSITY, SCALE} from '../styles/base.mjs';
import {TYPE} from '../typography.mjs';
import {PRIMITIVES} from '../layout.mjs';
import {defineMaterial, materialId} from './contract.mjs';

const C = id => materialId('component', id);

/** 부품 그룹 → 감사 분류. content는 구역·레시피 재료로 센다(독립 콘텐츠 분류가 10분류에 없다). */
const GROUP_CATEGORY = {structure: 'section-recipe', layout: 'layout-navigation', data: 'form-data-feedback', content: 'section-recipe', form: 'form-data-feedback', feedback: 'form-data-feedback', media: 'icon-media', nav: 'layout-navigation'};
const NODE_CATEGORY = {page: 'layout-navigation', chart: 'chart'};

/** 부품별로 검증기가 내는 규칙·코드(src/validate.mjs). 모든 부품에 공통인 R01·R02·R07은 따로 붙인다. */
const NODE_RULES = {
  'page-header': ['R03'], hero: ['R04', 'R13', 'R18'], actions: ['R04'], cta: ['R04'], tabs: ['R13'], kanban: ['R13'], pricing: ['R13'], plan: ['R13'],
  table: ['R06', 'R15'], list: ['R06', 'R15'], chart: ['R15'], calendar: ['R15'], metric: ['R15'], stepper: ['R15'], pagination: ['R15'], 'filter-bar': ['R15'],
  form: ['R16'], media: ['R14', 'R18'], gallery: ['R14'], card: ['R18'], 'empty-state': ['R18'], toc: ['R17'], section: ['R17', 'R20'], links: ['R14'], breadcrumb: ['R14'],
};
const RENDERED_BY = {tab: 'tabs'};
const COMMON_RULES = ['R01', 'R02', 'R07'];
const codesOf = ids => [...new Set(rules.filter(r => ids.includes(r.id)).flatMap(r => r.codes).filter(c => /^[A-Z_]+$/.test(c)))];
/** 고정 런타임(src/render/index.mjs formRuntime)이 상태를 바꾸는 부품. 나머지는 정적이다. */
const RUNTIME_STATES = {
  tabs: {values: ['selected', 'unselected'], transitions: [{from: 'unselected', to: 'selected', trigger: 'click | ArrowLeft/ArrowRight/Home/End'}]},
  form: {values: ['idle', 'invalid', 'checked'], transitions: [{from: 'idle', to: 'invalid', trigger: 'submit (reportValidity false)'}, {from: 'idle', to: 'checked', trigger: 'submit (reportValidity true)'}, {from: 'invalid', to: 'checked', trigger: 'submit (reportValidity true)'}]},
  'filter-bar': {values: ['pressed', 'unpressed'], transitions: [{from: 'unpressed', to: 'pressed', trigger: 'click chip'}]},
};
const A11Y = {tabs: {role: 'tablist', keyboard: 'Arrow/Home/End'}, form: {role: 'form', keyboard: 'native'}, chart: {role: 'img + data table'}, table: {role: 'table'}, notice: {role: 'status | alert'}};

const varsOf = css => [...new Set([...(css ?? '').matchAll(/var\((--kit-[a-z0-9-]+)/g)].map(m => m[1]))].sort();
const responsiveOf = css => (!css ? {strategy: 'unspecified'} : /@container|container-type/.test(css) ? {strategy: 'container'} : /@media\s*\(\s*(max|min)-width/.test(css) ? {strategy: 'viewport'} : /clamp\(|min\(|max\(/.test(css) ? {strategy: 'fluid'} : {strategy: 'unspecified'});

/** 부품이 놓일 수 있는 맥락: 금지하지 않고 allow 목록이 있으면 그 안에 든 페이지 유형. 전부면 any. */
function contextsOf(type) {
  const ok = pageTypeIds.filter(id => { const pt = pageTypes[id]; return !(pt.forbid ?? []).includes(type) && (!pt.allow || pt.allow.includes(type) || type === 'page'); });
  return ok.length === pageTypeIds.length ? ['any'] : ok;
}

export function componentMaterials() {
  const parents = {};
  for (const [type, spec] of Object.entries(nodeSpecs)) for (const child of spec.children ?? []) (parents[child] ??= []).push(C(type));
  return Object.entries(nodeSpecs).map(([type, spec]) => {
    const variants = Object.fromEntries(Object.entries(spec.fields).filter(([, f]) => f.type === 'string' && Array.isArray(f.enum)).map(([k, f]) => [k, [...f.enum]]));
    const css = chunks[type];
    const ruleIds = [...COMMON_RULES, ...(NODE_RULES[type] ?? [])];
    return defineMaterial({
      id: C(type), kind: 'component', category: NODE_CATEGORY[type] ?? GROUP_CATEGORY[spec.group], label: spec.label,
      contexts: contextsOf(type),
      // tab 패널은 부모 tabs의 렌더러가 그린다.
      render: {module: 'src/render/nodes.mjs', export: 'makeRenderer', key: RENDERED_BY[type] ?? type},
      variants,
      tokens: varsOf(css),
      dependencies: (spec.children ?? []).map(C),
      structure: {parents: (parents[type] ?? []).sort(), children: spec.children ? {allowed: spec.children.map(C), min: spec.min ?? 0, max: spec.max ?? 0} : null},
      states: RUNTIME_STATES[type] ?? {values: variants.state ?? [], transitions: []},
      responsive: responsiveOf(css),
      a11y: {rules: ['R05', ...ruleIds.filter(r => ['R03', 'R14', 'R16', 'R17'].includes(r))], ...(A11Y[type] ?? {})},
      validation: {rules: ruleIds, codes: codesOf(ruleIds)},
      examples: spec.example ? [structuredClone(spec.example)] : [],
      quality: spec.example ? {status: 'verified', evidence: ['tests/catalog.test.mjs:116']} : {status: 'implemented', evidence: []},
      tags: [spec.group, type],
      ext: {nodeType: type, group: spec.group, fields: Object.keys(spec.fields), required: [...requiredOf(spec)]},
    });
  });
}

const AXIS_CATEGORY = {mode: 'color', shell: 'layout-navigation', typography: 'typography', density: 'spacing', radius: 'shape', control: 'shape', elevation: 'shape', motion: 'interaction-state', icon: 'icon-media', ornament: 'icon-media', backdrop: 'color', width: 'layout-navigation', scale: 'typography', weight: 'typography', footer: 'layout-navigation'};
const AXIS_TABLE = {radius: RADIUS, width: WIDTH, weight: WEIGHT, icon: ICON, elevation: ELEVATION, motion: MOTION, backdrop: BACKDROP, density: DENSITY, scale: SCALE};

export function axisMaterials() {
  return ['mode', ...styleAxes].map(axis => defineMaterial({
    id: materialId('axis', axis), kind: 'axis', category: AXIS_CATEGORY[axis], label: axisDefs[axis].label,
    render: {module: axis === 'shell' || axis === 'footer' ? 'src/styles/shells.mjs' : axis === 'mode' ? 'src/tokens.mjs' : 'src/styles/base.mjs', export: axis === 'shell' || axis === 'footer' ? 'shellCSS' : axis === 'mode' ? 'resolveAll' : 'axisVars', key: axis},
    variants: {value: [...axes[axis]]},
    responsive: {strategy: axis === 'shell' ? 'viewport' : 'none'},
    a11y: {rules: axis === 'mode' ? ['R05', 'R19'] : axis === 'shell' ? ['R12'] : []},
    validation: {rules: ['R01', 'R09', 'R10'], codes: ['ENUM', 'AXIS_BAN', 'THEME_FORBID']},
    quality: {status: 'verified', evidence: ['tests/catalog.test.mjs:93']},
    tags: ['axis', axis],
    ext: {axis, table: AXIS_TABLE[axis] ? structuredClone(AXIS_TABLE[axis]) : null, bans: axisBans.filter(b => b.uses.includes(axis)).map(b => b.id)},
  }));
}

export function typePresetMaterials() {
  return Object.values(TYPE).map(p => defineMaterial({
    id: materialId('type-preset', p.id), kind: 'type-preset', category: 'typography', label: p.label,
    render: {module: 'src/typography.mjs', export: 'typeVars', key: p.id},
    tokens: ['--kit-t-display', '--kit-t-title', '--kit-t-heading', '--kit-t-sub', '--kit-t-body', '--kit-t-label'],
    responsive: {strategy: 'fluid'},
    a11y: {rules: ['R05']},
    validation: {rules: ['R01', 'R09'], codes: ['ENUM', 'AXIS_BAN']},
    quality: {status: 'verified', evidence: ['tests/typography.test.mjs:23', 'tests/typography.test.mjs:94']},
    preset: true, tags: ['typography', p.id],
    ext: {head: p.head, text: p.text, ratio: p.ratio},
  }));
}

export function themeMaterials() {
  return Object.values(themes).map(t => defineMaterial({
    id: materialId('theme', t.id), kind: 'theme', category: 'profile', label: t.name,
    render: {module: 'src/catalog/index.mjs', export: 'composeBlueprint', key: t.id},
    defaults: {variant: 'base', palette: t.palettes[0], mode: t.defaults.mode},
    responsive: {strategy: 'none', note: 'shell·width 축 값이 정한다'},
    variants: {variant: ['base', ...t.variants.map(v => v.id)], palette: [...t.palettes], mode: [...axes.mode]},
    dependencies: [...t.palettes.map(p => materialId('palette', p)), materialId('type-preset', t.defaults.typography)],
    a11y: {rules: ['R05', 'R19']},
    validation: {rules: ['R09', 'R10'], codes: ['AXIS_BAN', 'THEME_FORBID']},
    quality: {status: 'verified', evidence: ['tests/catalog.test.mjs:148', 'tests/catalog.test.mjs:59']},
    preset: true, tags: ['theme', t.category, t.id],
    ext: {palettes: [...t.palettes], forbid: structuredClone(t.forbid), variants: t.variants.map(v => v.id), covers: [...t.covers]},
  }));
}

/** Coolors 팔레트의 재사용 판정은 docs/materials/audit.md §3을 따른다. */
export const PALETTE_SOURCE_VERDICT = 'Coolors 약관·라이선스는 팔레트 묶음 재배포와 디자인 템플릿 제작 앱 사용을 제한한다. 별도 권리 허락 미확인. 기존 데이터와 입출력은 호환성 검증용으로 보존하며 신규 노출·내보내기·수집에 부적합하다. label·likes는 출처 표시용 메타데이터다.';

/** resolveTokens가 팔레트×모드마다 만드는 역할 토큰(src/tokens.mjs:59). 테스트가 실제 키와 같은지 본다. */
export const PALETTE_ROLES = Object.freeze(['canvas', 'surface', 'soft', 'sunken', 'accentSoft', 'text', 'muted', 'action', 'onAction', 'actionHover', 'onActionHover', 'link', 'focus', 'rule', 'border', 'success', 'warning', 'danger', 'info', 'accent', 'onAccent', 'accentInk', 'chart1', 'chart2', 'chart3', 'chart4', 'chart5']);

export function paletteMaterials() {
  return Object.values(palettes).map(p => defineMaterial({
    id: materialId('palette', p.id), kind: 'palette', category: 'color', label: p.name,
    render: {module: 'src/tokens.mjs', export: 'resolveTokens', key: p.id},
    variants: {mode: ['light', 'dark']},
    responsive: {strategy: 'none'},
    tokens: [...PALETTE_ROLES],
    a11y: {rules: ['R05', 'R19'], contrast: 'text 7:1, muted·link·status 4.5:1, focus·rule·chart 3:1'},
    validation: {rules: ['R05'], codes: []},
    quality: {status: 'verified', evidence: ['tests/compiler.test.mjs:42', 'tests/catalog.test.mjs:27']},
    source: {origin: 'coolors', license: 'unverified', url: p.source.url, observed: p.source.observed, evidence: p.source.evidence, verdict: PALETTE_SOURCE_VERDICT},
    tags: ['palette', p.family, p.tone, p.theme],
    ext: {colors: [...p.colors], brand: p.brand, family: p.family, tone: p.tone},
  }));
}

export function pageTypeMaterials() {
  return pageTypeIds.map(id => {
    const pt = pageTypes[id], uses = [...new Set([...pt.require.flat(), ...(pt.allow ?? [])])];
    return defineMaterial({
      id: materialId('page-type', id), kind: 'page-type', category: 'page', label: pt.label, contexts: [id],
      render: {module: 'src/validate.mjs', export: 'validateBlueprint', key: id},
      dependencies: uses.map(C),
      responsive: {strategy: 'none', note: 'shells·widths 허용 목록만 정한다'},
      validation: {rules: ['R11'], codes: codesOf(['R11'])},
      quality: {status: 'verified', evidence: ['tests/compiler.test.mjs:158']},
      tags: ['page-type', id],
      ext: {require: structuredClone(pt.require), forbid: [...(pt.forbid ?? [])], allow: pt.allow ? [...pt.allow] : null, shells: [...pt.shells], widths: pt.widths ? [...pt.widths] : null},
    });
  });
}

function nodeTypesOf(tree, out = new Set()) {
  for (const n of tree) { out.add(n.type); if (n.children) nodeTypesOf(n.children, out); }
  return out;
}
const countNodes = tree => tree.reduce((n, x) => n + 1 + (x.children ? countNodes(x.children) : 0), 0);

export function templateMaterials() {
  return Object.values(templates).map(t => defineMaterial({
    id: materialId('template', t.id), kind: 'template', category: 'page', label: t.label, contexts: [t.pageType],
    render: {module: 'src/catalog/index.mjs', export: 'createBlueprint', key: t.id},
    dependencies: [materialId('theme', t.theme), materialId('page-type', t.pageType), ...[...nodeTypesOf(t.tree)].sort().map(C)],
    responsive: {strategy: 'none', note: '부품의 반응형에 위임'},
    validation: {rules: ['R11'], codes: []},
    examples: [{template: t.id}],
    quality: {status: 'verified', evidence: ['tests/catalog.test.mjs:131', 'tests/compiler.test.mjs:20']},
    preset: true, tags: ['template', t.pageType, t.theme],
    ext: {pageType: t.pageType, theme: t.theme, nodeCount: countNodes(t.tree)},
  }));
}

export function recipeMaterials() {
  return Object.entries(recipes).map(([id, r]) => defineMaterial({
    id: materialId('recipe', id), kind: 'recipe', category: 'section-recipe', label: r.label, contexts: [...r.pageTypes],
    render: {module: 'src/recipes.mjs', export: 'selectRecipe', key: id},
    variants: Object.fromEntries(Object.entries(r.layout ?? {}).map(([slot, options]) => ['layout.' + slot, [...options]])),
    dependencies: r.templates.map(x => materialId('template', x)),
    responsive: {strategy: 'none'},
    quality: {status: 'verified', evidence: ['tests/recipes.test.mjs:12', 'tests/recipes.test.mjs:56']},
    tags: ['recipe', ...r.pageTypes],
    ext: {pageTypes: [...r.pageTypes], templates: [...r.templates], rules: [...(r.rules ?? [])]},
  }));
}

const PRIMITIVE_EVIDENCE = {flow: ['tests/layout.test.mjs:13', 'tests/layout.test.mjs:34'], bento: ['tests/layout.test.mjs:49']};
export function layoutPrimitiveMaterials() {
  return PRIMITIVES.map(p => defineMaterial({
    id: materialId('layout-primitive', p.id), kind: 'layout-primitive', category: 'layout-navigation', label: p.name,
    render: {module: 'src/layout.mjs', export: p.id === 'flow' ? 'flowCSS' : p.id === 'bento' ? 'bentoPlan' : 'layoutContractCSS', key: p.id},
    responsive: {strategy: ['flow', 'bento'].includes(p.id) ? 'container' : p.id === 'split' ? 'viewport' : 'fluid'},
    quality: PRIMITIVE_EVIDENCE[p.id] ? {status: 'verified', evidence: PRIMITIVE_EVIDENCE[p.id]} : {status: 'implemented', evidence: []},
    tags: ['layout', p.id],
    ext: {css: p.css},
  }));
}

export function iconMaterials() {
  const aliasesOf = name => Object.entries(iconAliases).filter(([, to]) => to === name).map(([from]) => from);
  return Object.keys(icons).map(name => defineMaterial({
    id: materialId('icon', name), kind: 'icon', category: 'icon-media', label: name,
    render: {module: 'src/render/util.mjs', export: 'icon', key: name},
    responsive: {strategy: 'none'},
    a11y: {rules: ['R12', 'R14'], role: 'decorative (aria-hidden) unless labelled'},
    quality: {status: 'verified', evidence: ['tests/catalog.test.mjs:162']},
    tags: ['icon', name, ...aliasesOf(name)],
    ext: {aliases: aliasesOf(name)},
  }));
}

/** 기존 카탈로그 전체를 재료 목록으로. 순서: 의존 대상이 먼저 오도록(검사는 순서와 무관하다). */
export const catalogMaterialList = () => [
  ...paletteMaterials(), ...typePresetMaterials(), ...axisMaterials(), ...iconMaterials(), ...layoutPrimitiveMaterials(),
  ...componentMaterials(), ...pageTypeMaterials(), ...themeMaterials(), ...templateMaterials(), ...recipeMaterials(),
];
