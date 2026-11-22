// Explore 에 올리는 플랫폼 조립 사례의 입력. 네 가지 페이지 유형을 서로 다른 재료로 조립한다. 화면은 Core 가 조립한 결과이고 여기 있는 것은 어떤 재료를 고를지의 요청뿐이다.
import type {AssembleState} from './assemble-state';

export type PlatformCase = {id: string; title: string; state: Pick<AssembleState, 'purpose' | 'palette' | 'set' | 'type' | 'family'>};
const c = (id: string, title: string, purpose: string, palette: string, set: string, type: string, family: string | null = null): PlatformCase => ({id, title, state: {purpose, palette, set, type, family}});

export const PLATFORM_CASES: readonly PlatformCase[] = [
  c('saas-ocean', '차분한 SaaS 소개', 'saas-landing', 'ocean-cool', 'standard', 'mkt-launch', 'soft'),
  c('saas-dusk', '어두운 프리미엄 SaaS', 'saas-landing', 'dusk-violet', 'premium-dark', 'mkt-brand'),
  c('dash-forest', '데이터 밀도가 높은 운영 화면', 'work-dashboard', 'forest-green', 'data-dense', 'work-console'),
  c('dash-slate', '고대비 업무 화면', 'work-dashboard', 'slate-neutral', 'high-contrast', 'tech-erp'),
  c('editorial-clay', '따뜻한 에디토리얼', 'editorial-docs', 'clay-earth', 'editorial-warm', 'doc-essay'),
  c('commerce-vivid', '선명한 커머스', 'commerce', 'magenta-vivid', 'commerce-vivid', 'shop-catalog', 'bold'),
];
