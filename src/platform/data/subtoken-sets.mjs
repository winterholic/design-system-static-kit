/**
 * 서브토큰 세트(색 작업 소유). 팔레트 원색 자리 → 색 역할의 분배 규칙이다. 원색 값을 갖지 않으므로 여러 팔레트에 재사용한다.
 * 역할 순서가 계산 순서다: 배경 역할을 먼저 두고, 글자 역할은 대비 기준(min.against)으로 앞의 배경을 가리킨다.
 *
 * 세트는 두 층으로 나뉜다.
 *   SUBTOKEN_SETS         계약(src/platform/contract.mjs)이 받는 기록. 색 역할 23개의 분배 규칙(라이트·다크 단계, 대비 하한)
 *   SUBTOKEN_SET_DESIGNS  세트 id별 파생 설계. 상호작용 상태(hover·active), 컴포넌트 의미 토큰이 읽는 역할, 차트 색 역할(범주형·순차·발산)
 * 파생 설계가 따로 있는 이유: 계약의 subtoken-set 기록은 needs·roles·modes만 받는다. 파생 설계를 기록 필드로 올리는 일은 조립 엔진 작업(W5)에
 * 계약 변경으로 요청한다(docs/platform/color.md). 그 전까지 src/platform/color.mjs의 bindColor가 id로 이 설계를 찾아 같은 결합 결과에 싣는다.
 * 설계가 없는 세트(시험용 등)는 DEFAULT_DESIGN을 쓴다.
 */
import {definePlatformMaterial} from '../contract.mjs';

const ALL = ['brand', 'neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const r = (from, light, dark, against, ratio) => (against ? {from, light, dark, min: {against, ratio}} : {from, light, dark});
const on = (role, min) => ({on: role, min});
const FG_BG = ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'];

/** 표준: 중립색 바탕, 브랜드는 액션·링크·초점에만. static-kit 2.6.0 그래프(src/color-tokens.mjs getMode)와 같은 분배 원칙. 차분한 제품 UI. */
const standard = {
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '50', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '50', FG_BG, 7), muted: r('neutral', '700', '300', FG_BG, 4.5), border: r('neutral', '200', '700'), rule: r('neutral', '500', '500', ['surface'], 3),
  action: r('brand', '700', '400', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'cardHover', 'cardActive'], 4.5), focus: r('brand', '600', '300', ['canvas', 'surface'], 3),
  accent: r('accent', '700', '300'), onAccent: on('accent', 4.5),
  success: r('success', '700', '300', ['surface'], 4.5), warning: r('warning', '800', '300', ['surface'], 4.5), danger: r('danger', '700', '300', ['surface', 'dangerSoft'], 4.5), info: r('info', '700', '300', ['surface'], 4.5),
  disabledFg: r('neutral', '500', '400', ['disabledBg'], 3),
};
const KEYS = Object.keys(standard);
// 펼친 뒤 덮어쓴 키는 원래 위치에 남으므로 순서를 표준과 같게 다시 맞춘다(계산 순서 = 키 순서).
const variant = overrides => Object.fromEntries(KEYS.map(k => [k, overrides[k] ?? standard[k]]));

/** 틴트: 바탕과 표면 상태를 브랜드 명도 단계로 칠하고 경계도 브랜드 쪽으로 둔다. 같은 팔레트에서 더 브랜드색이 도는 화면. */
const tinted = variant({
  canvas: r('brand', '50', '950'), soft: r('brand', '100', '800'), sunken: r('brand', '100', '950'),
  cardHover: r('brand', '50', '800'), cardActive: r('brand', '100', '700'), border: r('brand', '200', '700'), rule: r('brand', '400', '500', ['surface'], 3),
  action: r('brand', '600', '300', ['canvas', 'surface'], 4.5),
});

/** 따뜻한 에디토리얼: 종이 같은 바탕, 강조 띠는 보조색 틴트, 링크와 초점은 보조색. 액션은 브랜드를 아끼고 규칙선(rule)을 진하게 쓴다. 다크는 눈이 편한 읽기 면. */
const editorialWarm = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('accent', '100', '800'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '100', FG_BG, 7), muted: r('neutral', '700', '400', FG_BG, 4.5), border: r('neutral', '300', '800'), rule: r('neutral', '600', '500', ['surface'], 3),
  action: r('brand', '700', '300', ['canvas', 'surface'], 4.5), link: r('accent', '800', '300', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 4.5), focus: r('accent', '600', '300', FG_BG, 3),
  accent: r('accent', '700', '300', ['surface'], 4.5),
  disabledFg: r('neutral', '500', '400', ['disabledBg'], 3),
});

/** 강조색이 선명한 커머스: 주 행동(action)을 보조색의 선명한 단계로 칠하고 브랜드는 링크·보조 행동으로 내린다. 면은 보조색 틴트로 프로모션 띠를 만든다. */
const commerceVivid = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('accent', '50', '900'), cardActive: r('accent', '100', '800'), dangerSoft: r('danger', '100', '900'), disabledBg: r('neutral', '200', '800'),
  border: r('neutral', '200', '700'), rule: r('neutral', '500', '500', ['surface'], 3),
  action: r('accent', '600', '300', ['canvas', 'surface'], 5), onAction: on('action', 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 4.5), focus: r('brand', '600', '300', FG_BG, 3),
  accent: r('brand', '600', '300'), onAccent: on('accent', 4.5),
  danger: r('danger', '700', '300', ['surface', 'dangerSoft'], 4.5),
});

/** 어두운 배경의 프리미엄: 다크가 주 모드. 검은 바탕 위에 한 단계 밝은 표면을 올리고 낮은 대비 경계로 나눈다. 주 행동은 중립 램프의 반전(다크는 밝은 알약, 라이트는 먹색)이고 브랜드색은 링크와 보조 행동에만 쓴다. */
const premiumDark = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '100', FG_BG, 7), muted: r('neutral', '700', '400', FG_BG, 4.5), border: r('neutral', '300', '800'), rule: r('neutral', '600', '600', ['surface'], 3),
  action: r('neutral', '900', '100', ['canvas', 'surface'], 7), onAction: on('action', 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'cardHover', 'cardActive'], 4.5), focus: r('accent', '600', '200', FG_BG, 3),
  accent: r('brand', '700', '300', ['surface'], 4.5), onAccent: on('accent', 4.5),
  disabledFg: r('neutral', '500', '500', ['disabledBg'], 3),
});

/** 고대비: 글자 10:1, 보조 글자·행동·링크·상태색 7:1, 경계와 초점 4.5:1 이상. 면은 대비를 위해 단계 차이를 크게 둔다. */
const highContrast = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('neutral', '100', '900'), sunken: r('neutral', '200', '900'),
  cardHover: r('neutral', '100', '900'), cardActive: r('neutral', '200', '800'), dangerSoft: r('danger', '100', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '50', FG_BG, 10), muted: r('neutral', '800', '200', FG_BG, 7), border: r('neutral', '700', '400', ['canvas', 'surface'], 4.5), rule: r('neutral', '800', '300', ['canvas', 'surface'], 4.5),
  action: r('brand', '800', '300', ['canvas', 'surface'], 7), onAction: on('action', 7), link: r('brand', '800', '200', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 7), focus: r('brand', '700', '200', FG_BG, 4.5),
  accent: r('accent', '800', '200', ['canvas', 'surface'], 7), onAccent: on('accent', 7),
  success: r('success', '800', '200', ['surface', 'soft'], 7), warning: r('warning', '900', '200', ['surface', 'soft'], 7), danger: r('danger', '800', '200', ['surface', 'dangerSoft', 'soft'], 7), info: r('info', '800', '200', ['surface', 'soft'], 7),
  disabledFg: r('neutral', '700', '300', ['disabledBg'], 4.5),
});

/** 데이터 밀집: 표와 차트가 주인공. 면은 중립 단계로만 나누고(다크는 표면을 바탕과 같게 눌러 격자선으로만 구분) 경계를 진하게 둔다. 상태색은 작은 글자에서도 읽히도록 라이트는 한 단계 어둡게, 다크는 한 단계 밝게 쓴다. */
const dataDense = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('neutral', '100', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '900'), cardActive: r('neutral', '200', '800'), disabledBg: r('neutral', '200', '900'),
  border: r('neutral', '300', '600'), rule: r('neutral', '500', '400', ['surface'], 3),
  action: r('brand', '700', '400', ['canvas', 'surface'], 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 4.5),
  accent: r('accent', '700', '300', ['surface'], 4.5),
  success: r('success', '800', '200', ['surface', 'soft'], 4.5), warning: r('warning', '900', '200', ['surface', 'soft'], 4.5), danger: r('danger', '800', '200', ['surface', 'dangerSoft'], 4.5), info: r('info', '800', '200', ['surface', 'soft'], 4.5),
});

/**
 * 컨텍스트 메모: 새 세트는 'dashboard'를 contexts에 넣지 않는다. tests/platform-minimal.test.mjs(조립 엔진 작업 소유)가 dashboard·light·static-kit에서
 * 서브토큰 세트 추천 순위를 [standard, tinted]로 고정한다. 조립 엔진 작업이 그 시험을 갱신하면 'dashboard'(또는 'any')를 더한다(docs/platform/color.md).
 */
const done = {status: 'implemented', evidence: []};
const make = (id, label, roles, extra) => definePlatformMaterial({id: `subtoken-set:${id}`, kind: 'subtoken-set', label, needs: ALL, modes: ['light', 'dark'], roles, quality: done, ...extra});

export const SUBTOKEN_SETS = Object.freeze([
  make('standard', '표준 분배(차분한 제품 UI)', standard, {tags: ['neutral-surface', 'calm-product-ui'], reuses: ['color-token:semantic.action']}),
  make('tinted', '틴트 분배', tinted, {tags: ['brand-surface']}),
  make('editorial-warm', '따뜻한 에디토리얼', editorialWarm, {tags: ['editorial', 'warm-paper'], contexts: ['article', 'blog', 'docs', 'landing', 'portfolio', 'community', 'general']}),
  make('commerce-vivid', '강조색이 선명한 커머스', commerceVivid, {tags: ['commerce', 'accent-led'], contexts: ['commerce', 'landing', 'listing', 'pricing', 'portfolio', 'general']}),
  make('premium-dark', '어두운 배경의 프리미엄', premiumDark, {tags: ['premium', 'dark-first'], contexts: ['landing', 'portfolio', 'commerce', 'pricing', 'article', 'general']}),
  make('high-contrast', '고대비', highContrast, {tags: ['accessibility', 'high-contrast'], contexts: ['general', 'landing', 'data', 'listing', 'community', 'docs', 'article', 'blog', 'commerce', 'portfolio', 'pricing', 'form', 'settings', 'auth', 'error']}),
  make('data-dense', '데이터 밀집(표·차트 중심)', dataDense, {tags: ['data', 'table-chart'], contexts: ['data', 'listing', 'settings']}),
]);

/**
 * 세트별 파생 설계. 값은 모두 "어느 역할에서 가져오는가"와 "얼마나 움직이는가"뿐이다. 색값을 갖지 않는다.
 *   hover·active      주/보조 액션 채움을 라이트는 검정 쪽, 다크는 흰색 쪽으로 이동하는 비율
 *   control           입력 계열 경계의 출처 역할(border|rule)과 비텍스트 대비 하한
 *   table             표 머리글·행 hover·선택 행이 읽는 면 역할
 *   charts.categorical tone(표시 단계)·chroma(회전 색의 채도 하한)·lead(앞에 놓을 팔레트 자리)·minDistinct(ΔE76 하한)·minContrast(면 대비 하한)
 *   charts.sequential  from(램프 자리)
 *   charts.diverging   low·high(양 끝 후보 자리, 색상각이 60° 이상 벌어지는 첫 쌍)
 */
export const DEFAULT_DESIGN = Object.freeze({
  hover: 0.12, active: 0.2, control: {border: 'rule', min: 3}, table: {head: 'sunken', hover: 'cardHover', selected: 'soft'},
  charts: {
    categorical: {tone: 'standard', chroma: 0.55, lead: ['brand', 'accent'], minDistinct: 16, minContrast: 3},
    sequential: {from: 'brand', minContrast: 3}, diverging: {low: ['danger', 'warning'], high: ['info', 'brand'], minContrast: 3},
  },
});

const design = (patch = {}) => ({
  hover: patch.hover ?? DEFAULT_DESIGN.hover, active: patch.active ?? DEFAULT_DESIGN.active,
  control: {...DEFAULT_DESIGN.control, ...patch.control}, table: {...DEFAULT_DESIGN.table, ...patch.table},
  charts: {
    categorical: {...DEFAULT_DESIGN.charts.categorical, ...patch.charts?.categorical},
    sequential: {...DEFAULT_DESIGN.charts.sequential, ...patch.charts?.sequential},
    diverging: {...DEFAULT_DESIGN.charts.diverging, ...patch.charts?.diverging},
  },
});

export const SUBTOKEN_SET_DESIGNS = Object.freeze({
  'subtoken-set:standard': design(),
  'subtoken-set:tinted': design({hover: 0.1, active: 0.18, table: {head: 'soft', hover: 'cardHover', selected: 'cardActive'}}),
  'subtoken-set:editorial-warm': design({hover: 0.1, active: 0.16, control: {border: 'rule'}, table: {head: 'soft', selected: 'cardActive'},
    charts: {categorical: {tone: 'soft', chroma: 0.5, lead: ['accent', 'brand'], minDistinct: 14}, sequential: {from: 'accent'}, diverging: {low: ['accent', 'danger'], high: ['info', 'brand']}}}),
  'subtoken-set:commerce-vivid': design({hover: 0.14, active: 0.24, table: {head: 'soft', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.75, lead: ['accent', 'brand'], minDistinct: 20}, sequential: {from: 'accent'}, diverging: {low: ['brand', 'danger'], high: ['accent', 'info']}}}),
  'subtoken-set:premium-dark': design({hover: 0.12, active: 0.2, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'standard', chroma: 0.55, lead: ['accent', 'brand']}, sequential: {from: 'accent'}, diverging: {low: ['danger', 'warning'], high: ['info', 'accent']}}}),
  'subtoken-set:high-contrast': design({hover: 0.18, active: 0.3, control: {border: 'rule', min: 4.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.6, minDistinct: 20, minContrast: 4.5}, sequential: {from: 'brand', minContrast: 4.5}, diverging: {minContrast: 4.5}}}),
  'subtoken-set:data-dense': design({hover: 0.08, active: 0.14, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.6, lead: ['brand', 'accent'], minDistinct: 18}, sequential: {from: 'brand'}, diverging: {low: ['danger', 'warning'], high: ['info', 'brand']}}}),
});
