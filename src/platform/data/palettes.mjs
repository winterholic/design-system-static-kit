/** 기본 팔레트(색 작업 소유). 원색만 둔다. 권리가 확인된 자체 팔레트만 등록한다(Coolors 427개는 등록하지 않는다, ADR 0012 §1). */
import {STATIC_COLOR_PALETTE} from '../../color-tokens.mjs';
import {definePlatformMaterial} from '../contract.mjs';

const s = STATIC_COLOR_PALETTE.seeds;

export const PALETTES = Object.freeze([
  definePlatformMaterial({
    id: 'palette:static-kit', kind: 'palette', label: 'Static Kit', tone: 'mid',
    seeds: {brand: s.brand, neutral: s.neutral, accent: s.auxiliary, success: s.status.success, warning: s.status.warning, danger: s.status.danger, info: s.status.info},
    relations: [{type: 'prefers', to: 'subtoken-set:standard', priority: 20, reason: '2.6.0 static-kit 색 토큰 그래프와 같은 역할 분배다'}],
    quality: {status: 'implemented', evidence: []}, reuses: ['color-token:palette.static-kit.brand.500'], tags: ['internal'],
  }),
]);
