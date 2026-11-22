/**
 * 기본 팔레트(색 작업 소유). 원색만 둔다. 권리가 확인된 자체 팔레트만 등록한다(Coolors 427개는 등록하지 않는다, ADR 0012 §1).
 *
 * 출처: 아래 시드는 이 저장소에서 색상 계열(hue·채도)을 먼저 정하고 손으로 고른 값이다. 외부 팔레트 사이트의 값을 옮기지 않았다.
 * tests/platform-color-palettes.test.mjs가 Coolors 레거시 카탈로그 색과 한 개도 겹치지 않는지 검사한다.
 * 계열(family:*)은 서로 겹치지 않아야 한다. 겹침 기준은 같은 테스트에 있다.
 *
 * 각 팔레트는 brand(주), accent(보조), neutral(중립)과 상태색 4개를 가진다. 명도 램프(50~950)는 시드에서 colorRamp가 계산한다.
 */
import {STATIC_COLOR_PALETTE} from '../../color-tokens.mjs';
import {definePlatformMaterial} from '../contract.mjs';

const s = STATIC_COLOR_PALETTE.seeds;
const ORIGIN = 'design-system-static-kit 자체 제작(2026-11, 계열을 먼저 정하고 손으로 고른 원색)';

/** 팔레트 한 장. prefers는 [세트 id, 우선순위, 이유]. 이유는 추천 근거에 그대로 나온다. */
const own = ({id, label, family, tone, seeds, prefers = [], avoids = [], contexts = ['any'], tags = []}) => definePlatformMaterial({
  id: `palette:${id}`, kind: 'palette', label, tone, seeds, contexts,
  relations: [
    ...prefers.map(([set, priority, reason]) => ({type: 'prefers', to: `subtoken-set:${set}`, priority, reason})),
    ...avoids.map(([set, priority, reason]) => ({type: 'avoids', to: `subtoken-set:${set}`, priority, reason})),
  ],
  quality: {status: 'implemented', evidence: []}, source: {origin: ORIGIN, license: 'internal'}, tags: [`family:${family}`, 'internal', ...tags],
});

export const PALETTES = Object.freeze([
  definePlatformMaterial({
    id: 'palette:static-kit', kind: 'palette', label: 'Static Kit', tone: 'mid',
    seeds: {brand: s.brand, neutral: s.neutral, accent: s.auxiliary, success: s.status.success, warning: s.status.warning, danger: s.status.danger, info: s.status.info},
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 20, reason: '2.6.0 static-kit 색 토큰 그래프와 같은 역할 분배다'},
      // 팔레트가 여럿이 되면 앵커 없는 추천은 id 순이 된다. 업무 화면(workspace)의 기본값은 2.6.0 기본 팔레트로 유지한다.
      {type: 'prefers', to: 'style-context:workspace', priority: 15, reason: '업무 화면의 기본 팔레트다(2.6.0 static-kit 기본값과 같다)'},
    ],
    quality: {status: 'implemented', evidence: []}, reuses: ['color-token:palette.static-kit.brand.500'], tags: ['family:static-kit', 'internal'],
  }),
  own({
    id: 'slate-neutral', label: '슬레이트 중립', family: 'neutral', tone: 'mid',
    seeds: {brand: '#4B5C74', neutral: '#5D6878', accent: '#9A5B3E', success: '#2E7752', warning: '#8E6200', danger: '#B03A44', info: '#3A64A8'},
    prefers: [['standard', 30, '채도가 낮은 청회색이라 색이 화면을 이끌지 않는 제품 UI에 맞는다'], ['data-dense', 25, '채도가 낮아 표와 차트의 데이터 색이 두드러진다']],
  }),
  own({
    id: 'sunrise-warm', label: '선라이즈 웜', family: 'warm', tone: 'mid',
    seeds: {brand: '#D2501E', neutral: '#6F625A', accent: '#A3294F', success: '#2F7A4B', warning: '#A86500', danger: '#BE3030', info: '#2F66B8'},
    prefers: [['editorial-warm', 30, '주황 브랜드와 베리 보조색이 따뜻한 지면 분위기를 만든다'], ['commerce-vivid', 25, '주황 계열 행동 유도 버튼이 상품 화면에서 눈에 띈다']],
  }),
  own({
    id: 'ocean-cool', label: '오션 쿨', family: 'cool', tone: 'mid',
    seeds: {brand: '#0D6E8E', neutral: '#576B7E', accent: '#6A52C9', success: '#1F7A5C', warning: '#8F6500', danger: '#B13A4F', info: '#2B5FB5'},
    prefers: [['standard', 25, '청록 브랜드가 차분한 제품 UI의 신뢰감을 준다'], ['premium-dark', 25, '청록은 어두운 면 위에서 밝고 차갑게 떠 보인다']],
  }),
  own({
    id: 'forest-green', label: '포레스트 그린', family: 'green', tone: 'mid',
    seeds: {brand: '#2E7A52', neutral: '#5A6B5F', accent: '#B07A1F', success: '#2C8340', warning: '#9E6A00', danger: '#B23A3A', info: '#2D6A9F'},
    prefers: [['editorial-warm', 20, '녹색과 황토 보조색이 자연 매체 지면에 맞는다'], ['standard', 20, '녹색 브랜드 액션이 상태 신호와 구분되도록 램프에서 보정된다']],
  }),
  own({
    id: 'clay-earth', label: '클레이 어스', family: 'earth', tone: 'mid',
    seeds: {brand: '#8A6238', neutral: '#6B6355', accent: '#56784F', success: '#3F7A45', warning: '#9A6B08', danger: '#B04032', info: '#3E6F8C'},
    prefers: [['editorial-warm', 35, '갈색 브랜드와 세이지 보조색이 종이 질감의 지면에 맞는다'], ['premium-dark', 20, '갈색 램프의 밝은 단계가 어두운 면에서 금속 느낌을 낸다']],
  }),
  own({
    id: 'graphite-mono', label: '그래파이트 모노', family: 'mono', tone: 'dark',
    seeds: {brand: '#2B2D33', neutral: '#5E5F63', accent: '#4D4F57', success: '#2F7A4F', warning: '#8D6200', danger: '#B23A40', info: '#37649F'},
    prefers: [['high-contrast', 35, '무채색 램프는 글자와 면의 대비를 가장 안정적으로 낸다'], ['premium-dark', 30, '무채색 면이 어두운 프리미엄 화면의 바탕이 된다']],
    avoids: [['commerce-vivid', 40, '보조색이 회색이라 선명한 강조색이라는 이 세트의 의도를 살리지 못한다']],
  }),
  own({
    id: 'dusk-violet', label: '더스크 바이올렛', family: 'violet', tone: 'mid',
    seeds: {brand: '#6D49B8', neutral: '#645F78', accent: '#C0507A', success: '#2D7A58', warning: '#946000', danger: '#B8384A', info: '#3E64B5'},
    prefers: [['premium-dark', 35, '보라 브랜드는 어두운 면 위에서 고급스러운 인상을 준다'], ['tinted', 20, '보라 틴트 바탕이 브랜드색이 도는 화면을 만든다']],
  }),
  own({
    id: 'magenta-vivid', label: '마젠타 비비드', family: 'vivid', tone: 'bright',
    seeds: {brand: '#D1228F', neutral: '#6A6373', accent: '#00A3AD', success: '#1F8A4C', warning: '#A66A00', danger: '#C42B3C', info: '#2E6FD0'},
    prefers: [['commerce-vivid', 40, '채도가 높은 마젠타와 청록 보조색이 보색 대비로 강조점을 만든다']],
  }),
]);
