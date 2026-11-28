/**
 * 끝까지 도는 최소 예시(ADR 0012 §6): 팔레트 1 · 서브토큰 세트 2 · 타이포 시스템 1 · 스타일 맥락 1 · Card 패밀리 1.
 * tests/platform-minimal.test.mjs가 이 조립을 검사한다. 이후 작업은 같은 createPlatform에 자기 data 파일을 더한다.
 */
import {createPlatformRegistry} from '../registry.mjs';
import {createRelationGraph} from '../relations.mjs';
import {COLOR_CHECKS} from '../color.mjs';
import {TYPE_CHECKS} from '../type.mjs';
import {FAMILY_CHECKS} from '../family.mjs';
import {PALETTES} from '../data/palettes.mjs';
import {SUBTOKEN_SETS} from '../data/subtoken-sets.mjs';
import {TYPE_SYSTEMS} from '../data/type-systems.mjs';
import {STYLE_CONTEXTS, STYLE_CHECKS, STYLE_MATERIALS} from '../data/style-contexts.mjs';
import {STYLE_VALIDATORS, checkStyleMaterials} from '../style-materials.mjs';
import {BASE_COMPONENTS, BASE_IMPLEMENTATIONS} from '../data/base-components.mjs';
import {FAMILIES} from '../data/families.mjs';
import {LAYOUTS, validateLayout} from '../data/layouts.mjs';
import {LAYOUT_CHECKS} from '../layouts.mjs';
import {definePlatformMaterial} from '../contract.mjs';
import {PURPOSE_FAMILIES, VISUAL_LANGUAGES, checkPurposeCombination} from '../families/index.mjs';
import {defineCheck} from '../relations.mjs';
import {axisValueId} from '../contract.mjs';
import {buildAxisValues, withStyleForbids} from '../axes.mjs';

/** 계산 관계는 각 작업이 자기 파일의 *_CHECKS 배열로 소유한다(docs/platform/wbs.md). */
const purposeRecords = PURPOSE_FAMILIES.map(f => definePlatformMaterial({
  ...Object.fromEntries(Object.entries(f).filter(([key]) => key !== 'render' && key !== 'tokens')),
  kind: 'purpose-family', label: f.label, contexts: f.contexts, tags: [f.group, ...f.contexts],
  bases: [...f.bases], children: [...f.children],
  relations: [
    ...f.bases.map(to => ({type: 'requires', to, priority: 0, reason: `${f.id}의 목적 구조를 렌더하려면 기반 컴포넌트 ${to}가 필요하다`})),
    ...(f.id === 'purpose:navigation.bottom' ? [{type: 'forbids', to: axisValueId('density', 'compact'), priority: 100, reason: 'X01: 44px 이상 터치 칸이 필요한 하단 내비게이션은 compact 밀도와 함께 쓸 수 없다', when: {density: ['compact']}, evidence: 'X01 axis ban'}] : []),
  ],
  reuses: [...f.bases],
  visual: Object.fromEntries(Object.entries(VISUAL_LANGUAGES).map(([id, v]) => {
    const fit = checkPurposeCombination(f, {visual: id, variant: f.example.variant, props: f.example.props, content: f.example.content});
    return [id, {key: v.key, metrics: v.metrics, vars: v.vars, recipe: v.recipe, allowed: fit.ok, reasons: fit.errors.map(e => e.message)}];
  })),
  quality: {status: f.verification.status, evidence: f.verification.evidence},
}));

export const purposeFamilyVisualCheck = defineCheck({
  id: 'purpose-family-visual', kinds: ['purpose-family', 'family'], reason: '목적 구조가 시각 패밀리의 모든 기반 구성원과 맥락·밀도 조건에 맞는다',
  run(purpose, visual, ctx = {}) {
    const source = PURPOSE_FAMILIES.find(f => f.id === purpose.id);
    if (!source) return {ok: false, reason: `목적 패밀리 정의가 없습니다: ${purpose.id}`};
    if (ctx.context && !source.contexts.includes('any') && !source.contexts.includes(ctx.context)) return {ok: false, reason: `${purpose.id}는 ${ctx.context} 페이지용이 아닙니다(어울리는 페이지 유형: ${source.contexts.join(', ')})`};
    const densityValues = source.props?.density ?? source.variants?.density;
    if (ctx.density && densityValues && !densityValues.includes(ctx.density)) return {ok: false, reason: `${purpose.id}는 ${ctx.density} 밀도를 받지 않습니다(허용: ${densityValues.join('·')})`};
    const fit = checkPurposeCombination(source, {visual: visual.id, variant: source.example.variant, props: source.example.props, content: source.example.content});
    return fit.ok ? {ok: true, detail: {visual: visual.id, bases: purpose.bases}} : {ok: false, reason: fit.errors.map(e => e.message).join('; ')};
  },
});

export const purposeFamilyBaseCheck = defineCheck({
  id: 'purpose-family-base', kinds: ['purpose-family', 'base-component'], reason: '목적 패밀리가 기반 컴포넌트를 구성원으로 선언한다',
  run(purpose, base) { return purpose.bases.includes(base.id) ? {ok: true, detail: {base: base.id}} : {ok: false, reason: `${purpose.id}는 ${base.id}를 기반 부품으로 선언하지 않습니다`}; },
});

export const PURPOSE_CHECKS = Object.freeze([purposeFamilyVisualCheck, purposeFamilyBaseCheck]);
export const PLATFORM_CHECKS = Object.freeze([...COLOR_CHECKS, ...TYPE_CHECKS, ...FAMILY_CHECKS, ...STYLE_CHECKS, ...PURPOSE_CHECKS, ...LAYOUT_CHECKS]);

/** records·implementations를 더 줄 수 있다(시험·통합 중 재료). 참조가 끊기면 예외다. */
export function createPlatform({records = [], implementations = {}, checks = PLATFORM_CHECKS} = {}) {
  const registry = createPlatformRegistry({validators: {...STYLE_VALIDATORS, layout: validateLayout}}).registerAll([...STYLE_CONTEXTS.map(withStyleForbids), ...Object.values(STYLE_MATERIALS).flat(), ...PALETTES, ...SUBTOKEN_SETS, ...TYPE_SYSTEMS, ...BASE_COMPONENTS, ...FAMILIES, ...purposeRecords, ...buildAxisValues(), ...LAYOUTS, ...records.map(withStyleForbids)]);
  for (const [id, impl] of Object.entries({...BASE_IMPLEMENTATIONS, ...implementations})) registry.kind('base-component').implement(id, impl);
  const broken = [...registry.check(), ...checkStyleMaterials(registry)];
  if (broken.length) { const e = new Error('platform graph broken:\n' + broken.map(x => `${x.path} [${x.code}] ${x.message}`).join('\n')); e.errors = broken; throw e; }
  return {registry, graph: createRelationGraph(registry, {checks})};
}

export const MINIMAL_REQUEST = Object.freeze({
  context: 'dashboard', mode: 'light', density: 'comfortable', styleContext: 'style-context:workspace',
  // 타입 시스템을 고정한다: 추천은 맥락 적합성 표를 읽으므로(0.3.0) 등록 재료가 늘면 1순위가 바뀐다. 이 예시는 구형 tech × erp 조합을 가리킨다.
  typeSystem: 'type-system:tech-erp',
  components: [
    {base: 'base-component:card-surface', content: {id: 'revenue', title: '이번 달 매출', body: '지난달보다 12% 늘었습니다.', meta: '2026-11'}},
    {base: 'base-component:card-surface', props: {behavior: 'link', media: 'start'}, content: {id: 'report', title: '분기 보고서', body: '재무팀 검토 대기', href: '#report', mediaIcon: 'book'}},
  ],
});
