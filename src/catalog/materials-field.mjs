/**
 * Blueprint 2.7.0 최상위 `materials` 필드의 스키마(ADR 0012 §7.4, §9.6). 플랫폼 조립이 고른 재료를 id로만 저장한다. 값(색·크기·CSS)은 싣지 않는다.
 * 검증기(src/validate.mjs)가 이 스키마로 모양을 보고, 재료가 실제로 등록돼 있고 함께 쓸 수 있는지는 컴파일(src/platform/compile.mjs)이 판정한다.
 *
 *   palette·subtokenSet·typeSystem  필수. 색은 palette × subtokenSet으로만, 서체는 typeSystem으로만 정한다
 *   styleContext                    선택. 추천 순위와 금지에만 쓴다
 *   families                        {기반 컴포넌트 id: 패밀리 id}. card-surface 노드는 이 패밀리의 구성원으로 렌더한다
 *   surface·motion·background·media 선택. 스타일 재료 id(셸 범위 속성과 CSS로 나간다)
 *   purposes                        [{id: 목적 패밀리 id, visual: 시각 패밀리 id, uid?, variant?, props?, content}]. 트리의 metric 노드(label `platform-purpose-<번호>`)가 이 순서대로 목적 패밀리 렌더로 바뀐다
 *   states                          [{id: 상태 패턴 id, title?, body?, action?, details?}]. 트리의 divider 노드(label `platform-state-<번호>`)가 이 순서대로 상태 화면으로 바뀐다
 */
import {obj, str, arr, num} from './nodes.mjs';

export const MATERIAL_ID = Object.freeze({type: 'string', minLength: 3, maxLength: 80, pattern: '^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9.-]*$'});
export const MATERIAL_KEYS = Object.freeze(['palette', 'subtokenSet', 'typeSystem', 'styleContext', 'families', 'surface', 'motion', 'background', 'media', 'states', 'purposes']);
/** 상태 화면 표지 노드의 라벨. 번호는 materials.states의 위치다. */
export const STATE_MARK = /^platform-state-(\d+)$/;
/** 목적 패밀리 표지 노드의 라벨. */
export const PURPOSE_MARK = /^platform-purpose-(\d+)$/;

/** 목적 패밀리 콘텐츠: 닫힌 키 없이 값만 본다. 스칼라, 스칼라 배열, 스칼라를 값으로 갖는 객체, 그 배열(최대 두 겹). 패밀리가 필드와 필수 여부를 판정한다. */
const SCALAR = {oneOf: [str(500, 0), num(-1000000000, 1000000000), {type: 'boolean'}, {type: 'null'}]};
const ONE = {oneOf: [...SCALAR.oneOf, arr(SCALAR, 0, 40), {type: 'object', properties: {}, additionalProperties: SCALAR}]};
const TWO = {oneOf: [...ONE.oneOf, arr(ONE, 0, 40), {type: 'object', properties: {}, additionalProperties: ONE}]};
const OPEN = inner => ({type: 'object', properties: {}, additionalProperties: inner});

export function materialsSchema() {
  return {
    ...obj({
      palette: MATERIAL_ID, subtokenSet: MATERIAL_ID, typeSystem: MATERIAL_ID, styleContext: MATERIAL_ID,
      families: {type: 'object', properties: {}, additionalProperties: MATERIAL_ID},
      surface: MATERIAL_ID, motion: MATERIAL_ID, background: MATERIAL_ID, media: MATERIAL_ID,
      purposes: arr(obj({id: MATERIAL_ID, visual: MATERIAL_ID, uid: {...str(60), pattern: '^[a-z][a-z0-9-]*$'}, variant: OPEN(str(60)), props: OPEN(str(60)), content: OPEN(TWO)}, ['id', 'visual', 'content']), 0, 40),
      states: arr(obj({id: MATERIAL_ID, title: str(100), body: str(300), details: str(120), action: obj({label: str(80), href: str(300, 1)}, ['label'])}, ['id']), 0, 12),
    }, ['palette', 'subtokenSet', 'typeSystem']),
    description: '2.7.0부터 플랫폼 조립 재료를 id로 고릅니다. 이 필드가 있으면 색은 palette × subtokenSet, 서체는 typeSystem으로만 정해집니다(colorPalette·typeRoles·profile과 함께 쓸 수 없고, palette 필드는 색에 쓰이지 않습니다).',
    'x-since': '2.7.0', 'x-effect': 'output',
  };
}
