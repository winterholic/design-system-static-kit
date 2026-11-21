/**
 * 오류·경고 형식과 code → hint 표의 단일 출처(ADR 0009, 결정 D1).
 * 서비스 계층(src/service)과 편집 계층(src/edit)이 같은 표를 import한다. 표를 따로 만들면 코드와 문구가 갈라진다.
 *
 * Diagnostic = {code, path, message, hint}. 네 필드는 항상 비지 않은 문자열이다. 선택 필드: rule(규칙 ID), fix(기계가 읽는 대안 값).
 * 브라우저와 Node에서 같게 동작한다(node:*, DOM, import.meta 없음).
 */

/** 검증기·서비스 오류 코드별 해결 방법. 검증기는 값을 고치지 않으므로 어떻게 고칠지는 이 표가 안내한다. */
export const HINTS = {
  UNKNOWN_KEY: '카탈로그에 없는 속성입니다. 부품 스키마(blueprintSchema())의 필드만 쓸 수 있고 임의 CSS·HTML 속성은 지원하지 않습니다.',
  REQUIRED: '필수 속성을 채우세요. 부품별 필수 필드는 blueprintSchema()에 있습니다.',
  ENUM: '메시지에 적힌 허용값 중 하나를 고르세요.',
  STRING: '글자 수 범위와 제어 문자 금지를 지켜 다시 쓰세요. 비울 수 없는 필드입니다.',
  NUMBER: '허용 범위의 숫자로 고치세요.',
  PATTERN: '형식(소문자·숫자·하이픈 등)에 맞게 고치세요.',
  ARRAY_LENGTH: '항목 수를 허용 범위로 맞추세요(insertNode·removeNode).',
  CHILD_TYPE: '그 부모에 넣을 수 없는 부품입니다. 허용 자식은 nodeSpecs[부모].children에 있습니다.',
  NODE_TYPE: 'nodeTypes에 있는 부품 type만 쓸 수 있습니다.',
  DEPTH: '중첩을 줄이세요(최대 깊이는 limits.depth).',
  NODE_LIMIT: '노드를 줄이세요(최대 limits.nodes).',
  SIZE: '문서가 너무 큽니다. 내용을 줄이세요(limits.bytes).',
  THEME_FORBID: '테마가 금지한 값입니다. 허용되는 값을 고르거나 다른 테마를 쓰세요. setTheme의 axes:"theme"는 테마 기본값을 씁니다.',
  AXIS_BAN: '메시지의 대안 값으로 바꾸거나, 연산에 repair:"auto"를 주어 대안 값을 적용하게 하세요.',
  NAV_COUNT: '내비 항목을 줄이거나(removeNode) 더 많은 항목을 받는 셸을 고르세요(navLimits). setTheme은 navPolicy:"fit"으로 셸을 대신 고릅니다.',
  NAV_MEGA: '드롭다운 메뉴(mega)는 topbar·stacked·centered·editorial·masthead 셸에서 최대 2개입니다. 셸을 바꾸거나 mega를 줄이세요.',
  NAV_GROUP: '그룹 라벨은 sidebar·split 셸에서만 보입니다. 그 셸을 쓰거나 group을 정리하세요.',
  NAV_ICON: 'rail·dock 셸은 모든 내비 항목에 icon이 필요합니다. icon을 채우거나 다른 셸을 쓰세요.',
  FOOTER_LINKS: 'columns 푸터는 chrome.footerLinks가 1개 이상 필요합니다.',
  PAGE_HEADER: '첫 노드는 page-header 하나여야 합니다. 그 노드를 옮기거나 지우지 마세요.',
  PAGE_REQUIRE: '이 페이지 유형이 요구하는 부품을 추가하세요(insertNode). pageTypes[유형].require에 목록이 있습니다.',
  PAGE_FORBID: '이 페이지 유형이 금지한 부품입니다. 지우거나 다른 페이지 유형의 문서를 쓰세요.',
  PAGE_ALLOW: '이 페이지 유형이 허용하지 않는 최상위 부품입니다.',
  PAGE_MAX: '최상위 노드를 줄이세요.',
  PAGE_SECOND: '두 번째 노드가 페이지 유형의 요구와 다릅니다.',
  PAGE_SHELL: '허용된 셸 중 하나를 고르세요.',
  PAGE_WIDTH: '허용된 폭 중 하나를 고르세요.',
  SINGLE_HERO: '히어로는 하나만 둘 수 있습니다.',
  HERO_POSITION: '히어로는 page-header 바로 다음 위치에만 둘 수 있습니다.',
  HERO_VISUAL: 'visual은 split·product 히어로에서만 씁니다. variant를 바꾸거나 visual을 지우세요.',
  VARIANT_REQUIRES: '변형 조건을 맞추세요. 메시지의 필드를 함께 쓰거나 함께 지워야 합니다.',
  FEATURED_CARD: 'featured 카드는 3개 이상인 three·four 열 grid의 첫 칸에 하나만 둘 수 있습니다.',
  PULL_POSITION: 'pull 인용은 페이지 또는 section 바로 아래로 옮기세요.',
  SPACE_POSITION: 'space는 최상위 section에만 지정할 수 있습니다.',
  BLEED_POSITION: 'bleed 미디어는 페이지 바로 아래에 두세요.',
  CONTRACT_V03: '측정된 지표 격자 줄바꿈 품질 계약입니다. 열 수를 지표 수에 맞추거나 의도한 줄바꿈이면 경고를 검토하세요.',
  CONTRACT_V04: '가운데 정렬 머리말과 왼쪽 정렬 본문이 만납니다. 정렬을 맞추거나 의도한 구성이면 경고를 검토하세요.',
  CONTRACT_V01: 'split·product 히어로에 visual이 없습니다. 의도한 모양이면 진단을 무시할 수 있습니다.',
  CONTRACT_V02: '한 격자 안에서 카드 모양이 섞였습니다. 의도한 구성이면 진단을 무시할 수 있습니다.',
  LINK_LABEL: '링크·버튼 이름을 목적지를 설명하는 글로 바꾸세요.',
  URL: 'HTTPS 주소, #main, 같은 페이지의 앵커만 쓸 수 있습니다.',
  ANCHOR_MISSING: '그 앵커를 가진 section을 만들거나 링크를 고치세요.',
  ANCHOR_DUPLICATE: 'section.anchor를 페이지에서 유일하게 만드세요.',
  DUPLICATE_ID: '폼 필드 id를 페이지에서 유일하게 만드세요.',
  PRIMARY_ACTION: '한 액션 그룹에는 주(primary) 액션이 하나만 있어야 합니다.',
  SURFACE_NEST: '색을 입힌 섹션 안에 색 섹션을 넣지 마세요. 안쪽 섹션의 surface를 plain으로 하세요.',
  SECTION_DEPTH: '섹션은 두 단계까지만 중첩합니다.',
  CATALOG_VERSION: '지원하는 catalogVersion으로 바꾸거나 importBlueprint에 upgrade:true를 주세요.',
  VERSION: '1.0 문서는 importBlueprint로 들여오면 변환됩니다.',
  // 검증기가 내지만 편집 계층의 표에는 없던 코드. 이전에는 DEFAULT_HINT가 나갔다.
  JSON: 'JSON으로 표현할 수 있는 값(순환 참조 없음)만 보내세요.',
  CONST: '고정된 값입니다. 메시지에 적힌 값을 그대로 쓰세요.',
  OBJECT: '객체가 필요합니다. 배열·문자열·null이 아니라 {…} 형태로 보내세요.',
  ARRAY: '배열이 필요합니다. […] 형태로 보내세요.',
  ROOT: '문서의 최상위 노드는 type이 page여야 합니다.',
  FEATURED_PLAN: '추천 요금제(featured)는 pricing 안에서 하나만 둘 수 있습니다.',
  NESTED_TABS: '탭·칸반 안에 탭이나 칸반을 중첩하지 마세요. 안쪽 부품을 다른 부품으로 바꾸세요.',
  TOC_EMPTY: '목차(toc)는 anchor가 있는 section이 2개 이상일 때만 둘 수 있습니다. section에 anchor를 주거나 toc를 지우세요.',
  STATE_DATA: '데이터 부품의 상태(ready·partial)에는 실제 데이터가 있어야 합니다. 데이터를 채우거나 state를 바꾸세요.',
  TABLE_WIDTH: '표의 열 폭 합계와 열 수가 맞지 않습니다. columns와 rows의 칸 수를 맞추세요.',
  CHART_SHAPE: '차트 계열의 길이와 값 범위를 labels와 맞추세요.',
  CHART_AXIS: '차트 축 범위가 잘못됐습니다. min<max로 두고 데이터가 범위 안에 들어오게 고치거나 axis를 지우세요.',
  CHART_VALUE: '차트 값이 유한한 숫자가 아닙니다. NaN·Infinity를 제거하고 실제 숫자로 채우세요.',
  CHART_PRESET: '알 수 없는 차트 프리셋 id입니다. chart-preset: 로 시작하는 등록된 재료 id를 쓰세요.',
  CALENDAR_DAY: '달력의 날짜가 해당 월에 없는 날입니다. 존재하는 날짜로 고치세요.',
  METRIC_TREND: '지표의 trend와 값 쌍이 서로 맞지 않습니다. 둘을 함께 채우거나 함께 지우세요.',
  SELECTED_RANGE: '선택값이 항목 범위 밖입니다. 존재하는 항목 번호로 고치세요.',
  STEPPER_RANGE: '현재 단계가 단계 수 범위 밖입니다. 존재하는 단계로 고치세요.',
  PAGINATION_RANGE: '현재 페이지가 전체 페이지 수 범위 밖입니다. 1부터 전체 페이지 수 사이로 고치세요.',
  SELECT_OPTIONS: 'select·radio에는 options가 필요하고 그 밖의 필드에는 쓸 수 없습니다.',
  FIELD_OPTIONS: 'options는 select·radio 필드에서만 씁니다. 필드 종류를 바꾸거나 options를 지우세요.',
  // 서비스 계층이 내는 코드(요청 형식·조회·컴파일).
  BAD_REQUEST: '요청 인자의 형식이 맞지 않습니다. 메시지에 적힌 인자의 타입과 허용 범위를 확인하세요.',
  UNKNOWN_KIND: 'listCatalog의 kind는 listCatalog({kind:"…"})가 거부할 때 알려 주는 목록 중 하나여야 합니다.',
  UNKNOWN_TEMPLATE: 'listCatalog({kind:"templates"})로 존재하는 템플릿 id를 조회하세요.',
  UNKNOWN_THEME: 'listCatalog({kind:"themes"})로 존재하는 테마 id를 조회하세요.',
  UNKNOWN_PALETTE: 'listCatalog({kind:"palettes"})로 존재하는 팔레트 id를 조회하세요.',
  UNKNOWN_COMPONENT: 'listCatalog({kind:"components"})로 존재하는 부품 type을 조회하세요.',
  UNKNOWN_AXIS: 'listCatalog({kind:"axes"})로 존재하는 축 이름을 조회하세요.',
  CONTRAST_GATE: '팔레트나 모드를 바꾸세요. 모든 팔레트×모드×역할 쌍이 대비 기준을 넘어야 컴파일됩니다.',
  UNSUPPORTED_VERSION: '지원하는 catalogVersion으로 요청하세요(SUPPORTED_CATALOG_VERSIONS).',
  INTERNAL: '서버 안의 예상하지 못한 오류입니다. 같은 입력으로 다시 시도하고, 반복되면 입력과 함께 보고하세요.',
  // 컴파일이 성공한 뒤 보고만 하는 페이지 규칙 잔여 문제(경고).
  PAGE_DUP_VISUAL: '페이지 규칙이 보고만 하는 문제입니다. 같은 그림이 반복되는 구성을 바꾸면 사라집니다.',
  PAGE_BENTO_SPARSE: '페이지 규칙이 보고만 하는 문제입니다. 벤토의 짧은 숫자 칸 구성을 바꾸면 사라집니다.',
  OUTPUT_OMITTED: '크기 제한으로 본문을 줄였습니다. 전체가 필요하면 html:"full"로 maxBytes를 늘려 다시 요청하세요.',
};
export const DEFAULT_HINT = '메시지를 읽고 카탈로그가 허용하는 값으로 고치세요(npm run kit -- validate로 같은 오류를 재현할 수 있습니다).';

/** 컴파일이 성공한 뒤에도 보고하는 페이지 규칙 잔여 문제의 코드. 나머지 페이지 규칙 결정은 이미 해결된 사실이라 경고가 아니다. */
export const QUALITY_PAGE_CODES = ['PAGE_DUP_VISUAL', 'PAGE_BENTO_SPARSE'];

const str = x => typeof x === 'string' && x.length > 0;
export const hintFor = code => (Object.hasOwn(HINTS, code) ? HINTS[code] : DEFAULT_HINT);

/** 검증기·연산이 낸 오류에 hint를 보탠다. 이미 hint가 있으면 그대로 둔다(연산이 상황에 맞춘 안내를 줄 수 있다). */
export const withHint = e => ({code: e.code, path: e.path, message: e.message, hint: str(e.hint) ? e.hint : hintFor(e.code)});

/** 서비스가 만드는 Diagnostic. extra는 rule·fix 같은 선택 필드이며 값이 있을 때만 붙는다. */
export function diagnostic(code, path, message, hint = hintFor(code), extra = {}) {
  const d = {code, path, message, hint};
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null) d[k] = v;
  return d;
}
