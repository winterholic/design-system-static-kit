/**
 * 디자인 패밀리 = 시각 언어(컴포넌트 패밀리 작업 소유). 패밀리 계약 필드는 ADR 0012 §4.
 *   members  {base-component id: {preset: 고정 축, open: 호출자에게 여는 축, needs?: {typeRoles}}}
 *   shape    {radius, elevation, motion}: src/styles/base.mjs 축 값 표의 이름
 *   density  패밀리가 전제한 간격 밀도, states: 구성원 전체가 보장하는 상태
 * 목적 패밀리(구조)는 이 파일이 아니라 src/platform/families/에 있고, 시각 패밀리와 독립 축으로 곱해진다. 계약에 없는 시각 값(--pf-*)은 families/visual.mjs.
 *
 * 구성원은 10개 기반 컴포넌트 전부다. 의존(Card→Button 등)은 family-requires 검사가 지킨다.
 * 고정 축은 "이 시각 언어의 정체성"(외형·모양), 열린 축은 "맥락이 정하는 것"(크기·동작·상태)이다.
 */
import {definePlatformMaterial} from '../contract.mjs';
import {VISUAL_LANGUAGES} from '../families/visual.mjs';

const T = id => `base-component:${id}`;
const ALL_STATES = ['default', 'hover', 'focus', 'active', 'selected', 'loading', 'error', 'disabled'];
const roles = (...r) => ({typeRoles: r});

const OPEN = {
  button: ['appearance', 'size', 'behavior', 'content', 'tone', 'state'],
  input: ['size', 'kind', 'affix', 'state'],
  card: ['size', 'behavior', 'media', 'state'],
  nav: ['size', 'orientation', 'overflow', 'submenu', 'icons', 'state'],
  modal: ['size', 'role', 'placement', 'footer', 'state'],
  tabs: ['size', 'orientation', 'activation', 'overflow', 'icons', 'state'],
  tooltip: ['size', 'trigger', 'purpose', 'placement', 'delay', 'state'],
  feedback: ['size', 'placement', 'dismiss', 'action', 'autoDismiss', 'tone', 'state'],
  select: ['mode', 'search', 'size', 'state', 'maxMenuHeight'],
  table: ['density', 'sortable', 'selectable', 'responsive', 'state'],
};

const TYPE = {
  button: roles('label'),
  input: roles('label', 'small'),
  card: roles('sub', 'body', 'caption', 'small', 'label'),
  nav: roles('label'),
  modal: roles('heading', 'body'),
  tabs: roles('label'),
  tooltip: roles('small'),
  feedback: roles('body', 'small'),
  select: roles('label', 'small'),
  table: roles('small', 'numeric'),
};

const BASE_ID = {
  button: 'button-control',
  input: 'input-control',
  card: 'card-surface',
  nav: 'navigation-menu',
  modal: 'modal-dialog',
  tabs: 'tabs-control',
  tooltip: 'tooltip',
  feedback: 'feedback-message',
  select: 'select-control',
  table: 'data-table',
};

/**
 * 시각 언어별 고정 축.
 * Button의 외형은 강조 단계(기본·보조·강조)가 정하므로 열어 두고 모양만 고정한다(단계별 외형은 visual.mjs recipe).
 * 12개 시각 패밀리가 고유한 고정 축 조합(signature)을 가진다.
 */
const PRESETS = {
  // 1. Minimal Flat
  quiet: {
    button: {shape: 'soft'}, input: {appearance: 'outline', shape: 'soft'}, card: {appearance: 'outline', shape: 'soft', footer: 'none'},
    nav: {appearance: 'underline', shape: 'soft'}, modal: {appearance: 'outline', shape: 'soft'}, tabs: {appearance: 'underline', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'outline', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 2. Soft Rounded
  soft: {
    button: {shape: 'pill'}, input: {appearance: 'filled', shape: 'soft'}, card: {appearance: 'filled', shape: 'round', footer: 'none'},
    nav: {appearance: 'pill', shape: 'pill'}, modal: {appearance: 'filled', shape: 'round'}, tabs: {appearance: 'pill', shape: 'pill'},
    tooltip: {appearance: 'inverse', shape: 'pill'}, feedback: {appearance: 'soft', shape: 'soft'}, select: {shape: 'pill'}, table: {},
  },
  // 3. Brutalist
  bold: {
    button: {shape: 'square'}, input: {appearance: 'outline', shape: 'square'}, card: {appearance: 'elevated', shape: 'square', footer: 'none'},
    nav: {appearance: 'block', shape: 'square'}, modal: {appearance: 'elevated', shape: 'square'}, tabs: {appearance: 'segmented', shape: 'square'},
    tooltip: {appearance: 'inverse', shape: 'square'}, feedback: {appearance: 'solid', shape: 'square'}, select: {shape: 'square'}, table: {},
  },
  // 4. Editorial
  editorial: {
    button: {shape: 'soft'}, input: {appearance: 'underline', shape: 'soft'}, card: {appearance: 'flat', shape: 'soft', footer: 'none'},
    nav: {appearance: 'underline', shape: 'soft'}, modal: {appearance: 'outline', shape: 'soft'}, tabs: {appearance: 'underline', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'plain', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 5. Outline Precise
  'outline-precise': {
    button: {shape: 'square'}, input: {appearance: 'outline', shape: 'square'}, card: {appearance: 'outline', shape: 'square', footer: 'none'},
    nav: {appearance: 'block', shape: 'square'}, modal: {appearance: 'outline', shape: 'square'}, tabs: {appearance: 'segmented', shape: 'square'},
    tooltip: {appearance: 'surface', shape: 'square'}, feedback: {appearance: 'outline', shape: 'square'}, select: {shape: 'square'}, table: {},
  },
  // 6. Corporate Formal
  'corporate-formal': {
    button: {shape: 'soft'}, input: {appearance: 'outline', shape: 'soft'}, card: {appearance: 'outline', shape: 'soft', footer: 'none'},
    nav: {appearance: 'underline', shape: 'soft'}, modal: {appearance: 'elevated', shape: 'soft'}, tabs: {appearance: 'underline', shape: 'soft'},
    tooltip: {appearance: 'inverse', shape: 'soft'}, feedback: {appearance: 'soft', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 7. Dense Enterprise
  'dense-enterprise': {
    button: {shape: 'soft'}, input: {appearance: 'outline', shape: 'soft'}, card: {appearance: 'outline', shape: 'soft', footer: 'none'},
    nav: {appearance: 'block', shape: 'soft'}, modal: {appearance: 'outline', shape: 'soft'}, tabs: {appearance: 'segmented', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'outline', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 8. Elevated Material
  'elevated-material': {
    button: {shape: 'soft'}, input: {appearance: 'filled', shape: 'soft'}, card: {appearance: 'elevated', shape: 'soft', footer: 'none'},
    nav: {appearance: 'pill', shape: 'soft'}, modal: {appearance: 'elevated', shape: 'soft'}, tabs: {appearance: 'pill', shape: 'soft'},
    tooltip: {appearance: 'inverse', shape: 'soft'}, feedback: {appearance: 'soft', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 9. Tonal Layered
  'tonal-layered': {
    button: {shape: 'soft'}, input: {appearance: 'filled', shape: 'soft'}, card: {appearance: 'filled', shape: 'soft', footer: 'none'},
    nav: {appearance: 'block', shape: 'soft'}, modal: {appearance: 'filled', shape: 'soft'}, tabs: {appearance: 'pill', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'soft', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 10. Glass
  glass: {
    button: {shape: 'soft'}, input: {appearance: 'outline', shape: 'soft'}, card: {appearance: 'outline', shape: 'soft', footer: 'none'},
    nav: {appearance: 'pill', shape: 'soft'}, modal: {appearance: 'outline', shape: 'soft'}, tabs: {appearance: 'pill', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'outline', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  // 11. Luxury
  luxury: {
    button: {shape: 'square'}, input: {appearance: 'outline', shape: 'square'}, card: {appearance: 'outline', shape: 'square', footer: 'none'},
    nav: {appearance: 'underline', shape: 'soft'}, modal: {appearance: 'outline', shape: 'square'}, tabs: {appearance: 'underline', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'square'}, feedback: {appearance: 'outline', shape: 'square'}, select: {shape: 'square'}, table: {},
  },
  // 12. Expressive
  expressive: {
    button: {shape: 'pill'}, input: {appearance: 'filled', shape: 'pill'}, card: {appearance: 'elevated', shape: 'round', footer: 'none'},
    nav: {appearance: 'pill', shape: 'pill'}, modal: {appearance: 'filled', shape: 'round'}, tabs: {appearance: 'pill', shape: 'pill'},
    tooltip: {appearance: 'surface', shape: 'pill'}, feedback: {appearance: 'soft', shape: 'soft'}, select: {shape: 'pill'}, table: {},
  },
};

const members = key => Object.fromEntries(Object.keys(OPEN).map(k => [T(BASE_ID[k]), {preset: PRESETS[key][k], open: OPEN[k], needs: TYPE[k]}]));

const FAMILY_BASE = {
  kind: 'family',
  states: ALL_STATES,
  quality: {status: 'implemented', evidence: ['tests/platform-family-visual.test.mjs:29', 'tests/platform-family-visual.test.mjs:73']},
  reuses: ['component:card-surface'],
};

export const FAMILIES = Object.freeze([
  // 1. Minimal Flat
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:quiet',
    label: '조용한 업무 (Minimal Flat)',
    contexts: ['dashboard', 'data', 'listing', 'settings'],
    members: members('quiet'),
    shape: {radius: 'soft', elevation: 'outline', motion: 'subtle'},
    density: 'comfortable',
    tags: [VISUAL_LANGUAGES['family:quiet'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '외곽선 카드는 중립 표면에서 경계가 가장 잘 읽힌다'},
      {type: 'prefers', to: 'type-system:tech-erp', priority: 10, reason: '업무 카드의 제목·숫자는 촘촘한 역할 체계와 맞는다'},
    ],
  }),

  // 2. Soft Rounded
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:soft',
    label: '부드러운 채움 (Soft Rounded)',
    members: members('soft'),
    shape: {radius: 'round', elevation: 'lifted', motion: 'subtle'},
    density: 'spacious',
    tags: [VISUAL_LANGUAGES['family:soft'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:tinted', priority: 10, reason: '채운 면은 브랜드 쪽으로 기운 바탕에서 면 구분이 가장 자연스럽다'},
    ],
  }),

  // 3. Brutalist
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:bold',
    label: '굵은 대비 (Brutalist)',
    members: members('bold'),
    shape: {radius: 'square', elevation: 'hard', motion: 'lively'},
    density: 'comfortable',
    tags: [VISUAL_LANGUAGES['family:bold'].key],
    relations: [
      {type: 'avoids', to: 'subtoken-set:tinted', priority: 10, reason: '굵은 검은 선은 색이 도는 바탕에서 탁해 보인다'},
      {type: 'prefers', to: 'subtoken-set:high-contrast', priority: 10, reason: '강한 경계와 오프셋 그림자는 명확한 명암 대비에서 극대화된다'},
    ],
  }),

  // 4. Editorial
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:editorial',
    label: '에디토리얼 (Editorial)',
    members: members('editorial'),
    shape: {radius: 'subtle', elevation: 'flat', motion: 'none'},
    density: 'spacious',
    tags: [VISUAL_LANGUAGES['family:editorial'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 5, reason: '선과 여백만으로 구획하므로 중립 바탕에서 읽기 흐름이 가장 안정적이다'},
    ],
  }),

  // 5. Outline Precise
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:outline-precise',
    label: '정밀 외곽선 (Outline Precise)',
    contexts: ['dashboard', 'data', 'listing', 'docs'],
    members: members('outline-precise'),
    shape: {radius: 'subtle', elevation: 'outline', motion: 'subtle'},
    density: 'comfortable',
    tags: [VISUAL_LANGUAGES['family:outline-precise'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '정밀 외곽선은 중립 바탕에서 정렬선이 가장 선명하다'},
      {type: 'prefers', to: 'type-system:tech-erp', priority: 10, reason: '정밀한 구조는 수치·단위 정렬 시스템과 어울린다'},
    ],
  }),

  // 6. Corporate Formal
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:corporate-formal',
    label: '안정된 기업형 (Corporate Formal)',
    contexts: ['dashboard', 'listing', 'settings', 'docs'],
    members: members('corporate-formal'),
    shape: {radius: 'soft', elevation: 'soft', motion: 'subtle'},
    density: 'comfortable',
    tags: [VISUAL_LANGUAGES['family:corporate-formal'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '기업형 화면은 차분한 중립 표면과 절제된 브랜드 액션이 적합하다'},
    ],
  }),

  // 7. Dense Enterprise
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:dense-enterprise',
    label: '고밀도 엔터프라이즈 (Dense Enterprise)',
    contexts: ['dashboard', 'data', 'listing', 'settings'],
    members: members('dense-enterprise'),
    shape: {radius: 'subtle', elevation: 'outline', motion: 'none'},
    density: 'compact',
    tags: [VISUAL_LANGUAGES['family:dense-enterprise'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:data-dense', priority: 15, reason: '고밀도 제어 요소는 다수의 데이터 경계를 지원하는 세트와 맞는다'},
      {type: 'avoids', to: 'subtoken-set:tinted', priority: 10, reason: '밀집된 정보 화면에서 배경 색조는 텍스트 가독성을 저해할 수 있다'},
    ],
  }),

  // 8. Elevated Material
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:elevated-material',
    label: '입체 머티리얼 (Elevated Material)',
    members: members('elevated-material'),
    shape: {radius: 'soft', elevation: 'lifted', motion: 'subtle'},
    density: 'comfortable',
    tags: [VISUAL_LANGUAGES['family:elevated-material'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '부유하는 그림자 계층은 밝은 중립 바탕에서 자연스럽게 읽힌다'},
      {type: 'avoids', to: 'subtoken-set:editorial-warm', priority: 10, reason: '종이 질감 표면 위에 인위적인 그림자는 어색하다'},
    ],
  }),

  // 9. Tonal Layered
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:tonal-layered',
    label: '톤 계층 (Tonal Layered)',
    members: members('tonal-layered'),
    shape: {radius: 'soft', elevation: 'flat', motion: 'subtle'},
    density: 'comfortable',
    tags: [VISUAL_LANGUAGES['family:tonal-layered'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:tinted', priority: 12, reason: '외곽선 없이 색조 면으로 구획하므로 틴트 바탕에서 자연스러운 계층이 형성된다'},
      {type: 'avoids', to: 'subtoken-set:high-contrast', priority: 10, reason: '명암 대비 중심 세트에서는 미세한 톤 차이가 사라진다'},
    ],
  }),

  // 10. Glass
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:glass',
    label: '유리 질감 (Glass)',
    contexts: ['landing', 'commerce', 'dashboard'],
    members: members('glass'),
    shape: {radius: 'soft', elevation: 'lifted', motion: 'subtle'},
    density: 'spacious',
    tags: [VISUAL_LANGUAGES['family:glass'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '반투명 표면 뒤에 배경 대비를 유지하기에 적합하다'},
      {type: 'avoids', to: 'subtoken-set:data-dense', priority: 15, reason: '복잡한 데이터 표 뒤에 비치는 배경은 숫자 가독성을 저해한다'},
    ],
  }),

  // 11. Luxury
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:luxury',
    label: '럭셔리 (Luxury)',
    contexts: ['landing', 'commerce', 'article'],
    members: members('luxury'),
    shape: {radius: 'square', elevation: 'flat', motion: 'subtle'},
    density: 'spacious',
    tags: [VISUAL_LANGUAGES['family:luxury'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:premium-dark', priority: 12, reason: '넓은 여백과 섬세한 선은 프리미엄 다크 또는 프리미엄 라이트에서 극대화된다'},
      {type: 'avoids', to: 'subtoken-set:data-dense', priority: 15, reason: '고밀도 정보 배치는 럭셔리 패밀리의 넓은 호흡과 충돌한다'},
    ],
  }),

  // 12. Expressive
  definePlatformMaterial({
    ...FAMILY_BASE,
    id: 'family:expressive',
    label: '표현형 (Expressive)',
    contexts: ['landing', 'commerce'],
    members: members('expressive'),
    shape: {radius: 'bubble', elevation: 'lifted', motion: 'lively'},
    density: 'spacious',
    tags: [VISUAL_LANGUAGES['family:expressive'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:commerce-vivid', priority: 12, reason: '과감한 형태와 글로우는 역동적인 커머스·쇼케이스 세트와 어울린다'},
      {type: 'avoids', to: 'subtoken-set:data-dense', priority: 15, reason: '큰 라운드와 과감한 강조는 밀집 업무 화면에 부적합하다'},
    ],
  }),
]);
