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
  button: ['appearance', 'size', 'behavior', 'content', 'tone', 'state'], input: ['size', 'kind', 'affix', 'state'], card: ['size', 'behavior', 'media', 'state'],
  nav: ['size', 'orientation', 'overflow', 'submenu', 'icons', 'state'], modal: ['size', 'role', 'placement', 'footer', 'state'],
  tabs: ['size', 'orientation', 'activation', 'overflow', 'icons', 'state'], tooltip: ['size', 'trigger', 'purpose', 'placement', 'delay', 'state'],
  feedback: ['size', 'placement', 'dismiss', 'action', 'autoDismiss', 'tone', 'state'], select: ['mode', 'search', 'size', 'state', 'maxMenuHeight'],
  table: ['density', 'sortable', 'selectable', 'responsive', 'state'],
};
const TYPE = {
  button: roles('label'), input: roles('label', 'small'), card: roles('sub', 'body', 'caption', 'small', 'label'), nav: roles('label'), modal: roles('heading', 'body'),
  tabs: roles('label'), tooltip: roles('small'), feedback: roles('body', 'small'), select: roles('label', 'small'), table: roles('small', 'numeric'),
};
const BASE_ID = {button: 'button-control', input: 'input-control', card: 'card-surface', nav: 'navigation-menu', modal: 'modal-dialog', tabs: 'tabs-control', tooltip: 'tooltip', feedback: 'feedback-message', select: 'select-control', table: 'data-table'};

/** 시각 언어별 고정 축. Button의 외형은 강조 단계(기본·보조·강조)가 정하므로 열어 두고 모양만 고정한다(단계별 외형은 visual.mjs recipe). 이 표가 "quiet은 외곽선, soft는 채움, bold는 각진 굵은 면, editorial은 면 없는 선"이라는 정체성이다. */
const PRESETS = {
  quiet: {
    button: {shape: 'soft'}, input: {appearance: 'outline', shape: 'soft'}, card: {appearance: 'outline', shape: 'soft', footer: 'none'},
    nav: {appearance: 'underline', shape: 'soft'}, modal: {appearance: 'outline', shape: 'soft'}, tabs: {appearance: 'underline', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'outline', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
  soft: {
    button: {shape: 'pill'}, input: {appearance: 'filled', shape: 'soft'}, card: {appearance: 'filled', shape: 'round', footer: 'none'},
    nav: {appearance: 'pill', shape: 'pill'}, modal: {appearance: 'filled', shape: 'round'}, tabs: {appearance: 'pill', shape: 'pill'},
    tooltip: {appearance: 'inverse', shape: 'pill'}, feedback: {appearance: 'soft', shape: 'soft'}, select: {shape: 'pill'}, table: {},
  },
  bold: {
    button: {shape: 'square'}, input: {appearance: 'outline', shape: 'square'}, card: {appearance: 'elevated', shape: 'square', footer: 'none'},
    nav: {appearance: 'block', shape: 'square'}, modal: {appearance: 'elevated', shape: 'square'}, tabs: {appearance: 'segmented', shape: 'square'},
    tooltip: {appearance: 'inverse', shape: 'square'}, feedback: {appearance: 'solid', shape: 'square'}, select: {shape: 'square'}, table: {},
  },
  editorial: {
    button: {shape: 'soft'}, input: {appearance: 'underline', shape: 'soft'}, card: {appearance: 'flat', shape: 'soft', footer: 'none'},
    nav: {appearance: 'underline', shape: 'soft'}, modal: {appearance: 'outline', shape: 'soft'}, tabs: {appearance: 'underline', shape: 'soft'},
    tooltip: {appearance: 'surface', shape: 'soft'}, feedback: {appearance: 'plain', shape: 'soft'}, select: {shape: 'soft'}, table: {},
  },
};

const members = key => Object.fromEntries(Object.keys(OPEN).map(k => [T(BASE_ID[k]), {preset: PRESETS[key][k], open: OPEN[k], needs: TYPE[k]}]));

const FAMILY_BASE = {kind: 'family', states: ALL_STATES, quality: {status: 'implemented', evidence: []}, reuses: ['component:card-surface']};

export const FAMILIES = Object.freeze([
  definePlatformMaterial({
    ...FAMILY_BASE, id: 'family:quiet', label: '조용한 업무', contexts: ['dashboard', 'data', 'listing', 'settings'], members: members('quiet'),
    shape: {radius: 'soft', elevation: 'outline', motion: 'subtle'}, density: 'comfortable', tags: [VISUAL_LANGUAGES['family:quiet'].key],
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 10, reason: '외곽선 카드는 중립 표면에서 경계가 가장 잘 읽힌다'},
      {type: 'prefers', to: 'type-system:tech-erp', priority: 10, reason: '업무 카드의 제목·숫자는 촘촘한 역할 체계와 맞는다'},
    ],
  }),
  definePlatformMaterial({
    ...FAMILY_BASE, id: 'family:soft', label: '부드러운 채움', members: members('soft'),
    shape: {radius: 'round', elevation: 'lifted', motion: 'subtle'}, density: 'spacious', tags: [VISUAL_LANGUAGES['family:soft'].key],
    relations: [{type: 'prefers', to: 'subtoken-set:tinted', priority: 10, reason: '채운 면은 브랜드 쪽으로 기운 바탕에서 면 구분이 가장 자연스럽다'}],
  }),
  definePlatformMaterial({
    ...FAMILY_BASE, id: 'family:bold', label: '굵은 대비', members: members('bold'),
    shape: {radius: 'square', elevation: 'hard', motion: 'lively'}, density: 'comfortable', tags: [VISUAL_LANGUAGES['family:bold'].key],
    relations: [{type: 'avoids', to: 'subtoken-set:tinted', priority: 10, reason: '굵은 검은 선은 색이 도는 바탕에서 탁해 보인다'}],
  }),
  definePlatformMaterial({
    ...FAMILY_BASE, id: 'family:editorial', label: '에디토리얼', members: members('editorial'),
    shape: {radius: 'subtle', elevation: 'flat', motion: 'none'}, density: 'spacious', tags: [VISUAL_LANGUAGES['family:editorial'].key],
    relations: [{type: 'prefers', to: 'subtoken-set:standard', priority: 5, reason: '선과 여백만으로 구획하므로 중립 바탕에서 읽기 흐름이 가장 안정적이다'}],
  }),
]);
