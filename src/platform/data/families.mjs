/**
 * 디자인 패밀리(컴포넌트 패밀리 작업 소유). 패밀리 계약 필드는 ADR 0012 §4.
 *   members  {base-component id: {preset: 고정 축, open: 호출자에게 여는 축, needs?: {typeRoles}}}
 *   shape    {radius, elevation, motion}: src/styles/base.mjs 축 값 표의 이름
 *   density  패밀리가 전제한 간격 밀도, states: 구성원 전체가 보장하는 상태
 */
import {definePlatformMaterial} from '../contract.mjs';

export const FAMILIES = Object.freeze([
  definePlatformMaterial({
    id: 'family:quiet', kind: 'family', label: '조용한 업무 카드', contexts: ['dashboard', 'data', 'listing', 'settings'],
    members: {'base-component:card-surface': {preset: {appearance: 'outline', shape: 'soft', footer: 'none'}, open: ['size', 'behavior', 'media', 'state'], needs: {typeRoles: ['sub', 'body', 'caption', 'small', 'label']}}},
    shape: {radius: 'soft', elevation: 'outline', motion: 'subtle'}, density: 'comfortable', states: ['default', 'hover', 'focus', 'active', 'selected', 'loading', 'error', 'disabled'],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '외곽선 카드는 중립 표면에서 경계가 가장 잘 읽힌다'},
      {type: 'prefers', to: 'type-system:tech-erp', priority: 10, reason: '업무 카드의 제목·숫자는 촘촘한 역할 체계와 맞는다'},
    ],
    quality: {status: 'implemented', evidence: []}, reuses: ['component:card-surface'],
  }),
]);
