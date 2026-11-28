/**
 * 서브토큰 세트(색 작업 소유). 팔레트 원색 자리 → 색 역할의 분배 규칙이다. 원색 값을 갖지 않으므로 여러 팔레트에 재사용한다.
 * 역할 순서가 계산 순서다: 배경 역할을 먼저 두고, 글자 역할은 대비 기준(min.against)으로 앞의 배경을 가리킨다.
 *
 * 세트 기록은 다음을 가진다 (지시서 §4.4 기준 25종 완비).
 *   roles                 색 역할 23개의 분배 규칙(라이트·다크 단계, 대비 하한)
 *   weights               브랜드, 보조색, 중립색의 사용 비중 {brand, accent, neutral}
 *   states·components·charts  파생 설계: 상호작용 상태, 컴포넌트 의미 토큰이 읽는 면, 차트 색 역할
 *   contexts              사용 권장 맥락
 *   forbiddenContexts     금지 맥락 및 조합
 */
import {definePlatformMaterial} from '../contract.mjs';

const ALL = ['brand', 'neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const r = (from, light, dark, against, ratio) => (against ? {from, light, dark, min: {against, ratio}} : {from, light, dark});
const on = (role, min) => ({on: role, min});
const FG_BG = ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'];

/** 1. Standard Neutral: 중립 표면, 브랜드 액션. */
const standard = {
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '50', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '50', FG_BG, 7), muted: r('neutral', '700', '300', FG_BG, 4.5), border: r('neutral', '200', '700'), rule: r('neutral', '500', '500', ['surface'], 3),
  action: r('brand', '700', '400', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'cardHover', 'cardActive'], 4.5), focus: r('brand', '600', '300', ['canvas', 'surface'], 3),
  accent: r('accent', '700', '300', ['soft'], 4.5), onAccent: on('accent', 4.5),
  success: r('success', '700', '300', ['surface'], 4.5), warning: r('warning', '800', '300', ['surface'], 4.5), danger: r('danger', '700', '300', ['surface', 'dangerSoft'], 4.5), info: r('info', '700', '300', ['surface'], 4.5),
  disabledFg: r('neutral', '500', '400', ['disabledBg'], 3),
};
const KEYS = Object.keys(standard);
const variant = overrides => Object.fromEntries(KEYS.map(k => [k, overrides[k] ?? standard[k]]));

/** 2. Brand Tinted: 브랜드 색조의 배경 및 표면. */
const tinted = variant({
  canvas: r('brand', '50', '950'), soft: r('brand', '100', '800'), sunken: r('brand', '100', '950'),
  cardHover: r('brand', '50', '800'), cardActive: r('brand', '100', '700'), border: r('brand', '200', '700'), rule: r('brand', '400', '500', ['surface'], 3),
  action: r('brand', '600', '300', ['canvas', 'surface'], 4.5),
});

/** 3. Brand Dominant: 브랜드가 주요 영역을 지배. */
const brandDominant = variant({
  canvas: r('brand', '100', '950'), surface: r('brand', '50', '900'), soft: r('brand', '200', '800'), sunken: r('brand', '200', '900'),
  cardHover: r('brand', '100', '800'), cardActive: r('brand', '200', '700'), border: r('brand', '300', '600'), rule: r('brand', '600', '400', ['surface'], 3),
  action: r('brand', '800', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '200', FG_BG, 4.5), focus: r('brand', '600', '200', FG_BG, 3),
  accent: r('accent', '700', '300', ['soft'], 4.5), onAccent: on('accent', 4.5),
});

/** 4. Accent Dominant: 보조색 중심의 주요 강조. */
const accentDominant = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('accent', '100', '800'), cardActive: r('accent', '200', '800'), border: r('accent', '200', '700'), rule: r('accent', '400', '500', ['surface'], 3),
  action: r('accent', '600', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('accent', '700', '300', FG_BG, 4.5), focus: r('accent', '600', '300', FG_BG, 3),
  accent: r('brand', '700', '400', ['soft'], 4.5), onAccent: on('accent', 4.5),
});

/** 5. Soft Pastel: 저채도 표면 및 부드러운 경계. */
const softPastel = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '50', '800'), sunken: r('neutral', '100', '900'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '200', '800'), rule: r('neutral', '300', '700', ['surface'], 3),
  text: r('neutral', '950', '50', FG_BG, 7), muted: r('neutral', '700', '300', FG_BG, 4.5), action: r('brand', '600', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5),
  link: r('brand', '700', '300', FG_BG, 4.5),
});

/** 6. Minimal Monochrome: 무채색 중심, 제한적인 강조. */
const minimalMonochrome = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('neutral', '100', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '300', '700'), rule: r('neutral', '400', '600', ['surface'], 3),
  action: r('neutral', '900', '100', ['canvas', 'surface'], 7), onAction: on('action', 7), link: r('brand', '700', '300', FG_BG, 4.5), focus: r('neutral', '800', '200', FG_BG, 3),
  accent: r('neutral', '700', '300', ['surface'], 4.5), onAccent: on('accent', 4.5),
});

/** 7. High Contrast: 명확한 전경·배경 대비. */
const highContrast = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('neutral', '100', '900'), sunken: r('neutral', '200', '900'),
  cardHover: r('neutral', '100', '900'), cardActive: r('neutral', '200', '800'), dangerSoft: r('danger', '100', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '50', FG_BG, 10), muted: r('neutral', '800', '200', FG_BG, 7), border: r('neutral', '700', '400', ['canvas', 'surface'], 4.5), rule: r('neutral', '800', '300', ['canvas', 'surface'], 4.5),
  action: r('brand', '800', '300', ['canvas', 'surface'], 7), onAction: on('action', 7), link: r('brand', '800', '200', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 7), focus: r('brand', '700', '200', FG_BG, 4.5),
  accent: r('accent', '800', '200', ['canvas', 'surface', 'soft'], 7), onAccent: on('accent', 7),
  success: r('success', '800', '200', ['surface', 'soft'], 7), warning: r('warning', '900', '200', ['surface', 'soft'], 7), danger: r('danger', '800', '200', ['surface', 'dangerSoft', 'soft'], 7), info: r('info', '800', '200', ['surface', 'soft'], 7),
  disabledFg: r('neutral', '700', '300', ['disabledBg'], 4.5),
});

/** 8. Premium Light: 정제된 밝은 표면과 절제된 강조. */
const premiumLight = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('accent', '100', '900'), sunken: r('neutral', '100', '900'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '200', '800'), rule: r('neutral', '400', '600', ['surface'], 3),
  action: r('neutral', '950', '100', ['canvas', 'surface'], 7), onAction: on('action', 7), link: r('brand', '800', '300', FG_BG, 4.5), focus: r('brand', '700', '300', FG_BG, 3),
  accent: r('accent', '700', '300', ['surface'], 4.5), onAccent: on('accent', 4.5),
});

/** 9. Premium Dark: 깊은 어두운 배경과 밝은 액션. */
const premiumDark = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '100', FG_BG, 7), muted: r('neutral', '700', '400', FG_BG, 4.5), border: r('neutral', '300', '800'), rule: r('neutral', '600', '600', ['surface'], 3),
  action: r('neutral', '900', '100', ['canvas', 'surface'], 7), onAction: on('action', 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'cardHover', 'cardActive'], 4.5), focus: r('accent', '600', '200', FG_BG, 3),
  accent: r('brand', '700', '300', ['surface', 'soft'], 4.5), onAccent: on('accent', 4.5),
  disabledFg: r('neutral', '500', '500', ['disabledBg'], 3),
});

/** 10. Editorial Paper (기존 editorial-warm 확장): 종이색 표면과 선 중심 구분. */
const editorialWarm = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('accent', '100', '800'), dangerSoft: r('danger', '50', '900'), disabledBg: r('neutral', '200', '800'),
  text: r('neutral', '950', '100', FG_BG, 7), muted: r('neutral', '700', '400', FG_BG, 4.5), border: r('neutral', '300', '800'), rule: r('neutral', '600', '500', ['surface'], 3),
  action: r('brand', '700', '300', ['canvas', 'surface'], 4.5), link: r('accent', '800', '300', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 4.5), focus: r('accent', '600', '300', FG_BG, 3),
  accent: r('accent', '700', '300', ['surface', 'soft'], 4.5),
  disabledFg: r('neutral', '500', '400', ['disabledBg'], 3),
});

/** 11. Editorial Ink: 진한 텍스트와 제한적 강조색. */
const editorialInk = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('neutral', '100', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '400', '600'), rule: r('neutral', '700', '300', ['surface'], 4.5),
  text: r('neutral', '950', '50', FG_BG, 8), muted: r('neutral', '700', '300', FG_BG, 4.5), action: r('brand', '700', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5),
  link: r('brand', '800', '300', FG_BG, 4.5), focus: r('brand', '700', '300', FG_BG, 3),
});

/** 12. Corporate: 안정적인 중립 표면과 브랜드 컬러. */
const corporate = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('neutral', '100', '800'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '700'), cardActive: r('neutral', '200', '600'), border: r('neutral', '300', '700'), rule: r('neutral', '600', '400', ['surface'], 3),
  action: r('brand', '800', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '300', FG_BG, 4.5), focus: r('brand', '600', '400', FG_BG, 3),
  accent: r('accent', '700', '300', ['soft'], 4.5), onAccent: on('accent', 4.5),
});

/** 13. ERP Dense (기존 data-dense 확장): 다수의 데이터·경계·상태 표현. */
const dataDense = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('neutral', '100', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '900'), cardActive: r('neutral', '200', '800'), disabledBg: r('neutral', '200', '900'),
  border: r('neutral', '300', '600'), rule: r('neutral', '500', '400', ['surface'], 3),
  action: r('brand', '700', '400', ['canvas', 'surface'], 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 4.5),
  accent: r('accent', '700', '300', ['surface', 'soft'], 4.5),
  success: r('success', '800', '200', ['surface', 'soft'], 4.5), warning: r('warning', '900', '200', ['surface', 'soft'], 4.5), danger: r('danger', '800', '200', ['surface', 'dangerSoft'], 4.5), info: r('info', '800', '200', ['surface', 'soft'], 4.5),
});

/** 14. Finance Precision: 수치 및 상승·하락 정보 중심. */
const financePrecision = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '50', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '200', '700'), rule: r('neutral', '400', '600', ['surface'], 3),
  action: r('brand', '800', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '300', FG_BG, 4.5), focus: r('brand', '600', '300', FG_BG, 3),
  success: r('success', '800', '200', ['surface'], 5), danger: r('danger', '800', '200', ['surface'], 5), warning: r('warning', '800', '200', ['surface'], 4.5),
});

/** 15. Analytics: 차트·데이터 구분 우선. */
const analytics = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('neutral', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('neutral', '50', '900'), cardActive: r('neutral', '100', '800'), border: r('neutral', '300', '700'), rule: r('neutral', '400', '500', ['surface'], 3),
  action: r('brand', '700', '400', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '300', FG_BG, 4.5), focus: r('brand', '600', '300', FG_BG, 3),
  accent: r('accent', '700', '300', ['surface'], 4.5), onAccent: on('accent', 4.5),
});

/** 16. Developer Console: 코드·로그·상태 중심. */
const developerConsole = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '100', '950'), soft: r('neutral', '200', '800'), sunken: r('neutral', '200', '900'),
  cardHover: r('neutral', '200', '800'), cardActive: r('neutral', '300', '700'), border: r('neutral', '400', '600'), rule: r('neutral', '500', '500', ['surface'], 3),
  action: r('brand', '600', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '600', '300', FG_BG, 4.5), focus: r('brand', '500', '400', FG_BG, 3),
  info: r('info', '700', '300', ['surface'], 4.5), warning: r('warning', '800', '300', ['surface'], 4.5), danger: r('danger', '700', '300', ['surface'], 4.5),
});

/** 17. Commerce Vivid: 구매 CTA 및 상품 강조. */
const commerceVivid = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '100', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('accent', '50', '900'), cardActive: r('accent', '100', '800'), dangerSoft: r('danger', '100', '900'), disabledBg: r('neutral', '200', '800'),
  border: r('neutral', '200', '700'), rule: r('neutral', '500', '500', ['surface'], 3),
  action: r('accent', '600', '300', ['canvas', 'surface'], 5), onAction: on('action', 4.5), link: r('brand', '700', '300', ['canvas', 'surface', 'soft', 'cardHover', 'cardActive'], 4.5), focus: r('brand', '600', '300', FG_BG, 3),
  accent: r('brand', '700', '300'), onAccent: on('accent', 4.5),
  danger: r('danger', '700', '300', ['surface', 'dangerSoft'], 4.5),
});

/** 18. Commerce Luxury: 절제된 상품 및 가격 강조. */
const commerceLuxury = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('neutral', '100', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '200', '800'), rule: r('neutral', '300', '700', ['surface'], 3),
  action: r('neutral', '950', '100', ['canvas', 'surface'], 7), onAction: on('action', 7), link: r('accent', '800', '300', FG_BG, 4.5), focus: r('accent', '700', '300', FG_BG, 3),
  accent: r('brand', '800', '300', ['surface'], 4.5), onAccent: on('accent', 4.5),
});

/** 19. Mobile Soft: 터치 컨트롤과 부드러운 면. */
const mobileSoft = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('brand', '100', '800'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('brand', '100', '800'), border: r('neutral', '200', '700'), rule: r('neutral', '400', '600', ['surface'], 3),
  action: r('brand', '600', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '600', '300', FG_BG, 4.5), focus: r('brand', '600', '300', FG_BG, 3),
});

/** 20. Social Expressive: 다수의 보조색과 콘텐츠 강조. */
const socialExpressive = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '50', '900'), sunken: r('neutral', '200', '950'),
  cardHover: r('accent', '50', '800'), cardActive: r('accent', '50', '800'), border: r('neutral', '200', '700'), rule: r('neutral', '400', '600', ['surface'], 3),
  action: r('brand', '600', '400', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('accent', '700', '300', FG_BG, 4.5), focus: r('brand', '600', '300', FG_BG, 3),
  accent: r('accent', '700', '300', ['soft'], 4.5), onAccent: on('accent', 4.5),
});

/** 21. Wellness Calm: 차분하고 낮은 시각적 긴장. */
const wellnessCalm = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '50', '950'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '900'), cardActive: r('neutral', '200', '800'), border: r('neutral', '100', '700'), rule: r('neutral', '300', '600', ['surface'], 3),
  text: r('neutral', '950', '50', FG_BG, 7), muted: r('neutral', '700', '300', FG_BG, 4.5), action: r('brand', '500', '400', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5),
  link: r('accent', '600', '300', FG_BG, 4.5), focus: r('accent', '600', '300', FG_BG, 3),
});

/** 22. Education Friendly: 학습 단계 및 친근한 상태 표현. */
const educationFriendly = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '900'), soft: r('accent', '50', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('accent', '50', '800'), cardActive: r('neutral', '100', '800'), border: r('accent', '200', '700'), rule: r('neutral', '400', '600', ['surface'], 3),
  action: r('brand', '600', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5), link: r('brand', '700', '300', FG_BG, 4.5), focus: r('accent', '600', '300', FG_BG, 3),
  success: r('success', '700', '300', ['surface'], 4.5), info: r('info', '700', '300', ['surface'], 4.5),
});

/** 23. Glass Compatible: 투명·반투명 표면에 적합한 대비. */
const glassCompatible = variant({
  canvas: r('neutral', '50', '900'), surface: r('neutral', '100', '950'), soft: r('brand', '100', '800'), sunken: r('neutral', '50', '950'),
  cardHover: r('neutral', '100', '800'), cardActive: r('neutral', '200', '700'), border: r('neutral', '300', '600'), rule: r('neutral', '500', '400', ['surface'], 3),
  text: r('neutral', '950', '50', FG_BG, 8), muted: r('neutral', '700', '300', FG_BG, 5), action: r('brand', '800', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5),
});

/** 24. Brutalist Contrast: 강한 경계 및 선명한 색상. */
const brutalistContrast = variant({
  canvas: r('neutral', '50', '950'), surface: r('neutral', '50', '950'), soft: r('brand', '100', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '100', '900'), cardActive: r('brand', '100', '800'), border: r('neutral', '950', '50', ['canvas', 'surface'], 5), rule: r('neutral', '950', '50', ['canvas', 'surface'], 5),
  text: r('neutral', '950', '50', FG_BG, 10), muted: r('neutral', '800', '200', FG_BG, 7), action: r('brand', '600', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5),
  link: r('brand', '700', '300', FG_BG, 4.5), focus: r('neutral', '950', '50', FG_BG, 5),
});

/** 25. Gradient Compatible: 그라데이션 표면에서의 색상 역할. */
const gradientCompatible = variant({
  canvas: r('neutral', '100', '950'), surface: r('neutral', '50', '950'), soft: r('accent', '50', '900'), sunken: r('neutral', '100', '950'),
  cardHover: r('neutral', '50', '800'), cardActive: r('neutral', '100', '700'), border: r('neutral', '400', '700'), rule: r('neutral', '600', '400', ['surface'], 3),
  text: r('neutral', '950', '50', FG_BG, 8), muted: r('neutral', '700', '300', FG_BG, 4.5), action: r('brand', '800', '300', ['canvas', 'surface'], 4.5), onAction: on('action', 4.5),
  accent: r('accent', '700', '300', ['surface'], 4.5), onAccent: on('accent', 4.5),
});

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
  'subtoken-set:brand-dominant': design({hover: 0.12, active: 0.22, table: {head: 'soft', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.65, lead: ['brand', 'accent'], minDistinct: 16}, sequential: {from: 'brand'}}}),
  'subtoken-set:accent-dominant': design({hover: 0.14, active: 0.24, table: {head: 'soft', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.7, lead: ['accent', 'brand'], minDistinct: 18}, sequential: {from: 'accent'}}}),
  'subtoken-set:soft-pastel': design({hover: 0.08, active: 0.14, control: {border: 'rule', min: 2.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'soft'},
    charts: {categorical: {tone: 'soft', chroma: 0.4, lead: ['brand', 'accent'], minDistinct: 12, minContrast: 2.5}, sequential: {from: 'brand', minContrast: 2.5}}}),
  'subtoken-set:minimal-monochrome': design({hover: 0.15, active: 0.25, control: {border: 'rule', min: 4}, table: {head: 'sunken', hover: 'cardHover', selected: 'soft'},
    charts: {categorical: {tone: 'deep', chroma: 0.5, lead: ['neutral', 'brand'], minDistinct: 16, minContrast: 4}, sequential: {from: 'neutral', minContrast: 4}}}),
  'subtoken-set:high-contrast': design({hover: 0.18, active: 0.3, control: {border: 'rule', min: 4.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.6, minDistinct: 20, minContrast: 4.5}, sequential: {from: 'brand', minContrast: 4.5}, diverging: {minContrast: 4.5}}}),
  'subtoken-set:premium-light': design({hover: 0.12, active: 0.2, control: {border: 'rule', min: 3.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'standard', chroma: 0.55, lead: ['accent', 'brand'], minDistinct: 16}, sequential: {from: 'accent'}}}),
  'subtoken-set:premium-dark': design({hover: 0.12, active: 0.2, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'standard', chroma: 0.55, lead: ['accent', 'brand']}, sequential: {from: 'accent'}, diverging: {low: ['danger', 'warning'], high: ['info', 'accent']}}}),
  'subtoken-set:editorial-warm': design({hover: 0.1, active: 0.16, control: {border: 'rule'}, table: {head: 'soft', selected: 'cardActive'},
    charts: {categorical: {tone: 'soft', chroma: 0.5, lead: ['accent', 'brand'], minDistinct: 14}, sequential: {from: 'accent'}, diverging: {low: ['accent', 'danger'], high: ['info', 'brand']}}}),
  'subtoken-set:editorial-ink': design({hover: 0.14, active: 0.24, control: {border: 'rule', min: 4.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.6, lead: ['brand', 'accent'], minDistinct: 18}, sequential: {from: 'brand'}}}),
  'subtoken-set:corporate': design({hover: 0.12, active: 0.2, table: {head: 'sunken', hover: 'cardHover', selected: 'soft'},
    charts: {categorical: {tone: 'standard', chroma: 0.55, lead: ['brand', 'accent'], minDistinct: 16}, sequential: {from: 'brand'}}}),
  'subtoken-set:data-dense': design({hover: 0.08, active: 0.14, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.6, lead: ['brand', 'accent'], minDistinct: 18}, sequential: {from: 'brand'}, diverging: {low: ['danger', 'warning'], high: ['info', 'brand']}}}),
  'subtoken-set:finance-precision': design({hover: 0.1, active: 0.18, table: {head: 'sunken', hover: 'cardHover', selected: 'soft'},
    charts: {categorical: {tone: 'deep', chroma: 0.6, lead: ['brand', 'accent'], minDistinct: 18}, sequential: {from: 'brand'}, diverging: {low: ['danger', 'warning'], high: ['success', 'info']}}}),
  'subtoken-set:analytics': design({hover: 0.1, active: 0.18, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.65, lead: ['brand', 'accent'], minDistinct: 20, minContrast: 4.5}, sequential: {from: 'brand', minContrast: 4.5}}}),
  'subtoken-set:developer-console': design({hover: 0.12, active: 0.2, control: {border: 'rule', min: 3.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.65, lead: ['brand', 'info', 'warning'], minDistinct: 18}, sequential: {from: 'brand'}}}),
  'subtoken-set:commerce-vivid': design({hover: 0.14, active: 0.24, table: {head: 'soft', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.75, lead: ['accent', 'brand'], minDistinct: 20}, sequential: {from: 'accent'}, diverging: {low: ['brand', 'danger'], high: ['accent', 'info']}}}),
  'subtoken-set:commerce-luxury': design({hover: 0.12, active: 0.2, control: {border: 'rule', min: 3.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'standard', chroma: 0.5, lead: ['brand', 'accent'], minDistinct: 16}, sequential: {from: 'brand'}}}),
  'subtoken-set:mobile-soft': design({hover: 0.1, active: 0.18, table: {head: 'soft', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'soft', chroma: 0.55, lead: ['brand', 'accent'], minDistinct: 15}, sequential: {from: 'brand'}}}),
  'subtoken-set:social-expressive': design({hover: 0.14, active: 0.22, table: {head: 'soft', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.7, lead: ['brand', 'accent', 'info'], minDistinct: 18}, sequential: {from: 'brand'}}}),
  'subtoken-set:wellness-calm': design({hover: 0.08, active: 0.14, control: {border: 'rule', min: 2.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'soft'},
    charts: {categorical: {tone: 'soft', chroma: 0.45, lead: ['brand', 'accent'], minDistinct: 14, minContrast: 2.5}, sequential: {from: 'brand', minContrast: 2.5}}}),
  'subtoken-set:education-friendly': design({hover: 0.12, active: 0.2, table: {head: 'soft', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'vivid', chroma: 0.6, lead: ['brand', 'accent', 'success'], minDistinct: 16}, sequential: {from: 'brand'}}}),
  'subtoken-set:glass-compatible': design({hover: 0.12, active: 0.2, control: {border: 'rule', min: 3.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'standard', chroma: 0.6, lead: ['brand', 'accent'], minDistinct: 16}, sequential: {from: 'brand'}}}),
  'subtoken-set:brutalist-contrast': design({hover: 0.2, active: 0.35, control: {border: 'rule', min: 5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'deep', chroma: 0.7, lead: ['brand', 'accent'], minDistinct: 22, minContrast: 5}, sequential: {from: 'brand', minContrast: 5}}}),
  'subtoken-set:gradient-compatible': design({hover: 0.12, active: 0.2, control: {border: 'rule', min: 3.5}, table: {head: 'sunken', hover: 'cardHover', selected: 'cardActive'},
    charts: {categorical: {tone: 'standard', chroma: 0.6, lead: ['brand', 'accent'], minDistinct: 16}, sequential: {from: 'brand'}}}),
});

const done = {status: 'implemented', evidence: []};
const designFields = id => {
  const d = SUBTOKEN_SET_DESIGNS[`subtoken-set:${id}`];
  return {states: {hover: d.hover, active: d.active, control: d.control}, components: {table: d.table}, charts: d.charts};
};

const make = (id, label, roles, weights, extra = {}) => definePlatformMaterial({
  id: `subtoken-set:${id}`,
  kind: 'subtoken-set',
  label,
  needs: ALL,
  modes: ['light', 'dark'],
  roles,
  weights,
  forbiddenContexts: [],
  quality: done,
  ...designFields(id),
  ...extra,
});

export const SUBTOKEN_SETS = Object.freeze([
  // 1~7 기존 세트 (ID 및 핵심 설계 유지)
  make('standard', '표준 분배(Standard Neutral)', standard, {brand: 0.2, accent: 0.1, neutral: 0.7}, {
    tags: ['neutral-surface', 'calm-product-ui'],
    reuses: ['color-token:semantic.action'],
  }),
  make('tinted', '틴트 분배(Brand Tinted)', tinted, {brand: 0.5, accent: 0.1, neutral: 0.4}, {
    tags: ['brand-surface', 'brand-tinted'],
  }),
  make('editorial-warm', '따뜻한 에디토리얼(Editorial Paper)', editorialWarm, {brand: 0.2, accent: 0.25, neutral: 0.55}, {
    tags: ['editorial', 'warm-paper', 'editorial-paper'],
    contexts: ['article', 'blog', 'docs', 'landing', 'portfolio', 'community', 'general'],
  }),
  make('commerce-vivid', '강조색이 선명한 커머스(Commerce Vivid)', commerceVivid, {brand: 0.15, accent: 0.45, neutral: 0.4}, {
    tags: ['commerce', 'accent-led', 'vivid-cta'],
    contexts: ['commerce', 'landing', 'listing', 'pricing', 'portfolio', 'general'],
  }),
  make('premium-dark', '어두운 배경의 프리미엄(Premium Dark)', premiumDark, {brand: 0.15, accent: 0.15, neutral: 0.7}, {
    tags: ['premium', 'dark-first'],
    contexts: ['landing', 'portfolio', 'commerce', 'pricing', 'article', 'general'],
  }),
  make('high-contrast', '고대비(High Contrast)', highContrast, {brand: 0.2, accent: 0.1, neutral: 0.7}, {
    tags: ['accessibility', 'high-contrast'],
    contexts: ['dashboard', 'general', 'landing', 'data', 'listing', 'community', 'docs', 'article', 'blog', 'commerce', 'portfolio', 'pricing', 'form', 'settings', 'auth', 'error'],
  }),
  make('data-dense', '데이터 밀집(ERP Dense)', dataDense, {brand: 0.15, accent: 0.15, neutral: 0.7}, {
    tags: ['data', 'table-chart', 'erp-dense'],
    contexts: ['dashboard', 'data', 'listing', 'settings', 'erp'],
  }),

  // 8~25 신규 18종 세트
  make('brand-dominant', '브랜드 지배(Brand Dominant)', brandDominant, {brand: 0.65, accent: 0.1, neutral: 0.25}, {
    tags: ['brand-dominant', 'high-brand-presence'],
    contexts: ['landing', 'general', 'portfolio', 'commerce'],
  }),
  make('accent-dominant', '보조색 강조(Accent Dominant)', accentDominant, {brand: 0.15, accent: 0.55, neutral: 0.3}, {
    tags: ['accent-dominant', 'vibrant-accent'],
    contexts: ['commerce', 'landing', 'pricing', 'general'],
  }),
  make('soft-pastel', '부드러운 파스텔(Soft Pastel)', softPastel, {brand: 0.25, accent: 0.15, neutral: 0.6}, {
    tags: ['soft-pastel', 'low-saturation', 'gentle'],
    contexts: ['general', 'article', 'portfolio', 'docs', 'landing'],
  }),
  make('minimal-monochrome', '미니멀 모노크롬(Minimal Monochrome)', minimalMonochrome, {brand: 0.05, accent: 0.05, neutral: 0.9}, {
    tags: ['minimal-monochrome', 'grayscale', 'editorial-minimal'],
    contexts: ['portfolio', 'article', 'general', 'docs'],
  }),
  make('premium-light', '정제된 라이트 프리미엄(Premium Light)', premiumLight, {brand: 0.15, accent: 0.15, neutral: 0.7}, {
    tags: ['premium-light', 'refined-surface', 'luxury-light'],
    contexts: ['portfolio', 'landing', 'commerce', 'pricing', 'general'],
  }),
  make('editorial-ink', '에디토리얼 잉크(Editorial Ink)', editorialInk, {brand: 0.2, accent: 0.1, neutral: 0.7}, {
    tags: ['editorial-ink', 'typography-first', 'high-legibility'],
    contexts: ['article', 'docs', 'general', 'blog'],
  }),
  make('corporate', '안정된 코퍼레이트(Corporate)', corporate, {brand: 0.35, accent: 0.1, neutral: 0.55}, {
    tags: ['corporate', 'enterprise-classic', 'trustworthy'],
    contexts: ['dashboard', 'landing', 'general'],
  }),
  make('finance-precision', '금융 정밀(Finance Precision)', financePrecision, {brand: 0.2, accent: 0.1, neutral: 0.7}, {
    tags: ['finance', 'precision-data', 'trading'],
    contexts: ['dashboard', 'data', 'listing', 'general'],
  }),
  make('analytics', '애널리틱스 차트 우선(Analytics)', analytics, {brand: 0.2, accent: 0.2, neutral: 0.6}, {
    tags: ['analytics', 'bi-dashboard', 'chart-first'],
    contexts: ['dashboard', 'data', 'general'],
  }),
  make('developer-console', '개발자 콘솔(Developer Console)', developerConsole, {brand: 0.25, accent: 0.1, neutral: 0.65}, {
    tags: ['developer-console', 'terminal', 'code-first'],
    contexts: ['dashboard', 'docs', 'settings', 'general'],
  }),
  make('commerce-luxury', '커머스 럭셔리(Commerce Luxury)', commerceLuxury, {brand: 0.1, accent: 0.1, neutral: 0.8}, {
    tags: ['commerce-luxury', 'understated-elegance'],
    contexts: ['commerce', 'pricing', 'landing', 'general'],
  }),
  make('mobile-soft', '모바일 소프트(Mobile Soft)', mobileSoft, {brand: 0.35, accent: 0.15, neutral: 0.5}, {
    tags: ['mobile-soft', 'touch-friendly'],
    contexts: ['general', 'dashboard', 'listing', 'community'],
  }),
  make('social-expressive', '소셜 익스프레시브(Social Expressive)', socialExpressive, {brand: 0.35, accent: 0.35, neutral: 0.3}, {
    tags: ['social-expressive', 'community', 'vibrant'],
    contexts: ['community', 'landing', 'general'],
  }),
  make('wellness-calm', '웰니스 캄(Wellness Calm)', wellnessCalm, {brand: 0.25, accent: 0.1, neutral: 0.65}, {
    tags: ['wellness-calm', 'low-tension'],
    contexts: ['general', 'landing', 'article'],
  }),
  make('education-friendly', '친근한 교육(Education Friendly)', educationFriendly, {brand: 0.35, accent: 0.25, neutral: 0.4}, {
    tags: ['education-friendly', 'learning'],
    contexts: ['general', 'dashboard', 'landing'],
  }),
  make('glass-compatible', '글래스모피즘 호환(Glass Compatible)', glassCompatible, {brand: 0.3, accent: 0.15, neutral: 0.55}, {
    tags: ['glass-compatible', 'translucent-contrast'],
    contexts: ['landing', 'general', 'dashboard'],
  }),
  make('brutalist-contrast', '브루탈리스트 콘트라스트(Brutalist Contrast)', brutalistContrast, {brand: 0.3, accent: 0.2, neutral: 0.5}, {
    tags: ['brutalist-contrast', 'bold-borders'],
    contexts: ['landing', 'general', 'portfolio'],
  }),
  make('gradient-compatible', '그라데이션 호환(Gradient Compatible)', gradientCompatible, {brand: 0.35, accent: 0.15, neutral: 0.5}, {
    tags: ['gradient-compatible', 'high-surface-separation'],
    contexts: ['landing', 'general'],
  }),
]);

/** §4.4 명칭 ↔ ID ↔ 특성 매핑 정의 */
export const SUBTOKEN_SET_MAPPINGS = Object.freeze([
  {name: 'Standard Neutral', id: 'subtoken-set:standard', legacyId: 'standard', characteristic: '중립 표면, 브랜드 액션'},
  {name: 'Brand Tinted', id: 'subtoken-set:tinted', legacyId: 'tinted', characteristic: '브랜드 색조의 배경 및 표면'},
  {name: 'Brand Dominant', id: 'subtoken-set:brand-dominant', characteristic: '브랜드가 주요 영역을 지배'},
  {name: 'Accent Dominant', id: 'subtoken-set:accent-dominant', characteristic: '보조색 중심의 주요 강조'},
  {name: 'Soft Pastel', id: 'subtoken-set:soft-pastel', characteristic: '저채도 표면 및 부드러운 경계'},
  {name: 'Minimal Monochrome', id: 'subtoken-set:minimal-monochrome', characteristic: '무채색 중심, 제한적인 강조'},
  {name: 'High Contrast', id: 'subtoken-set:high-contrast', legacyId: 'high-contrast', characteristic: '명확한 전경·배경 대비'},
  {name: 'Premium Light', id: 'subtoken-set:premium-light', characteristic: '정제된 밝은 표면과 절제된 강조'},
  {name: 'Premium Dark', id: 'subtoken-set:premium-dark', legacyId: 'premium-dark', characteristic: '깊은 어두운 배경과 밝은 액션'},
  {name: 'Editorial Paper', id: 'subtoken-set:editorial-warm', legacyId: 'editorial-warm', characteristic: '종이색 표면과 선 중심 구분'},
  {name: 'Editorial Ink', id: 'subtoken-set:editorial-ink', characteristic: '진한 텍스트와 제한적 강조색'},
  {name: 'Corporate', id: 'subtoken-set:corporate', characteristic: '안정적인 중립 표면과 브랜드 컬러'},
  {name: 'ERP Dense', id: 'subtoken-set:data-dense', legacyId: 'data-dense', characteristic: '다수의 데이터·경계·상태 표현'},
  {name: 'Finance Precision', id: 'subtoken-set:finance-precision', characteristic: '수치 및 상승·하락 정보 중심'},
  {name: 'Analytics', id: 'subtoken-set:analytics', characteristic: '차트·데이터 구분 우선'},
  {name: 'Developer Console', id: 'subtoken-set:developer-console', characteristic: '코드·로그·상태 중심'},
  {name: 'Commerce Vivid', id: 'subtoken-set:commerce-vivid', legacyId: 'commerce-vivid', characteristic: '구매 CTA 및 상품 강조'},
  {name: 'Commerce Luxury', id: 'subtoken-set:commerce-luxury', characteristic: '절제된 상품 및 가격 강조'},
  {name: 'Mobile Soft', id: 'subtoken-set:mobile-soft', characteristic: '터치 컨트롤과 부드러운 면'},
  {name: 'Social Expressive', id: 'subtoken-set:social-expressive', characteristic: '다수의 보조색과 콘텐츠 강조'},
  {name: 'Wellness Calm', id: 'subtoken-set:wellness-calm', characteristic: '차분하고 낮은 시각적 긴장'},
  {name: 'Education Friendly', id: 'subtoken-set:education-friendly', characteristic: '학습 단계 및 친근한 상태 표현'},
  {name: 'Glass Compatible', id: 'subtoken-set:glass-compatible', characteristic: '투명·반투명 표면에 적합한 대비'},
  {name: 'Brutalist Contrast', id: 'subtoken-set:brutalist-contrast', characteristic: '강한 경계 및 선명한 색상'},
  {name: 'Gradient Compatible', id: 'subtoken-set:gradient-compatible', characteristic: '그라데이션 표면에서의 색상 역할'},
]);
