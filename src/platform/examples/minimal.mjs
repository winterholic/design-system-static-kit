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
import {STYLE_CONTEXTS, STYLE_CHECKS} from '../data/style-contexts.mjs';
import {BASE_COMPONENTS, BASE_IMPLEMENTATIONS} from '../data/base-components.mjs';
import {FAMILIES} from '../data/families.mjs';
import {buildAxisValues, withStyleForbids} from '../axes.mjs';

/** 계산 관계는 각 작업이 자기 파일의 *_CHECKS 배열로 소유한다(docs/platform/wbs.md). */
export const PLATFORM_CHECKS = Object.freeze([...COLOR_CHECKS, ...TYPE_CHECKS, ...FAMILY_CHECKS, ...STYLE_CHECKS]);

/** records·implementations를 더 줄 수 있다(시험·통합 중 재료). 참조가 끊기면 예외다. */
export function createPlatform({records = [], implementations = {}, checks = PLATFORM_CHECKS} = {}) {
  const registry = createPlatformRegistry().registerAll([...STYLE_CONTEXTS.map(withStyleForbids), ...PALETTES, ...SUBTOKEN_SETS, ...TYPE_SYSTEMS, ...BASE_COMPONENTS, ...FAMILIES, ...buildAxisValues(), ...records.map(withStyleForbids)]);
  for (const [id, impl] of Object.entries({...BASE_IMPLEMENTATIONS, ...implementations})) registry.kind('base-component').implement(id, impl);
  const broken = registry.check();
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
