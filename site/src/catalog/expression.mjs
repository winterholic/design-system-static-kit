/**
 * 카탈로그 2.5.0 표현력 확장(ADR 0010, docs/dev/expressiveness/report.md 6절 EX-1~EX-5).
 * 새 필드는 모두 범위가 닫힌 enum이고, 값은 기존 토큰·역할·간격 사다리로만 해석된다. 임의 CSS·숫자·className은 받지 않는다.
 * 이 파일은 "무엇이 2.5.0에서 생겼는가"의 단일 출처다: 스키마 설명, 버전 게이트(src/validate.mjs), 렌더러·스타일 게이트가 모두 읽는다.
 */

/** 카탈로그 버전 순서. 새 버전은 끝에 더한다. `atLeast`가 이 순서로 비교한다. */
export const VERSION_ORDER = Object.freeze(['2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0']);
export const EXPRESSION_SINCE = '2.5.0';
export const atLeast = (version, since) => VERSION_ORDER.includes(version) && VERSION_ORDER.indexOf(version) >= VERSION_ORDER.indexOf(since);
/** 2.5.0부터 켜지는 표현력 문법과 렌더러 수정(R1~R4)의 게이트. 버전이 없는 내부 호출(타이포·간격만 가진 객체)은 켜지지 않는다. */
export const expressionApplies = b => atLeast(b?.catalogVersion, EXPRESSION_SINCE);

/** 스키마 필드에 도입 버전과 설명을 단다. `description`·`x-since`는 JSON Schema 주석이라 검증기(src/validate.mjs)가 무시한다. */
export const since = (schema, description, version = EXPRESSION_SINCE) => ({...schema, description, 'x-since': version});

/** 2.5.0에서 생긴 필드(와 확장된 enum 값). 2.4.0 이하 입력이 쓰면 검증기가 거부한다(출력이 고정된 버전의 문법을 넓히지 않는다). */
export const SINCE_FIELDS = Object.freeze([
  {node: 'hero', field: 'ratio', proposal: 'EX-1'},
  {node: 'split', field: 'ratio', values: ['dominant-start', 'dominant-end'], proposal: 'EX-1'},
  {node: 'card', field: 'featured', proposal: 'EX-2'},
  {node: 'quote', field: 'variant', proposal: 'EX-3'},
  {node: 'section', field: 'surface', values: ['flat'], proposal: 'EX-4'},
  {node: 'section', field: 'space', proposal: 'EX-4'},
  {node: 'media', field: 'bleed', proposal: 'EX-5'},
].map(Object.freeze));

/** EX-1 hero.ratio 해석. 열 순서는 DOM 순서가 아니라 화면 순서다(product 히어로는 시각 요소가 왼쪽). */
export const HERO_RATIOS = Object.freeze({copy: [3, 2], visual: [2, 3]});
/** EX-1 split.ratio의 70:30. 좁은 칸이 이 폭보다 좁아지지 않게 컨테이너가 DOMINANT_MIN 이상일 때만 켜진다(그 아래는 wide-*의 3:2, 더 좁으면 한 열). */
export const DOMINANT_MIN = 1000;
/** dominant-* 분할에서 30% 칸에 둘 수 있는 부품. 좁은 열에서 읽히지 않는 부품(표·차트·갤러리·폼·칸반 등)은 넓은 칸에만 둔다. */
export const NARROW_CELL_OK = Object.freeze(['prose', 'card', 'quote', 'media', 'properties', 'notice', 'metric', 'progress', 'list', 'actions', 'cta', 'tags', 'links', 'summary', 'buy-box', 'steps', 'faq', 'empty-state', 'divider']);
/** EX-2 강조 칸을 받는 격자 열 수와 최소 자식 수. 강조 칸은 첫 칸이고 2열을 쓴다. */
export const FEATURED_COLUMNS = Object.freeze(['three', 'four']);
export const FEATURED_MIN_CHILDREN = 3;
/** EX-3 풀쿼트를 둘 수 있는 부모. 보조 칸·격자·벤토 안에서는 크기가 칸 폭에 눌린다. */
export const PULL_PARENTS = Object.freeze(['page', 'section']);
/** EX-5 전폭 미디어가 허용하는 비율(띠로 읽히는 가로형). */
export const BLEED_RATIOS = Object.freeze(['16:9', '21:9']);
/** EX-4 섹션 간격 단계. normal은 지금까지의 값이다. */
export const SECTION_SPACES = Object.freeze(['tight', 'normal', 'loose']);

/** 2.5.0 규칙. `rules`(R01~R20)는 모든 출력의 manifest.rules에 박혀 있어 늘리면 고정 출력(2.1~2.4)이 바뀐다. 그래서 별도 목록이다. */
export const expressionRules = Object.freeze([
  Object.freeze({id: 'R21', intent: '표현력 문법(2.5.0): 비율·강조 칸·풀쿼트·구역 간격·전폭 미디어는 범위가 닫힌 enum이고 놓일 위치가 제한된다. 2.4.0 이하 입력은 이 필드를 거부한다.', codes: Object.freeze(['FEATURED_CARD', 'PULL_POSITION', 'SPACE_POSITION', 'BLEED_POSITION', 'VARIANT_REQUIRES']), source: 'ADR 0010'}),
  Object.freeze({id: 'R22', intent: '변형 결과 계약의 직접 적용(2.5.0): 데이터 보존 계약 V06은 오류, 측정된 품질 계약 V03·V04는 경고, 취향 계약 V01·V02는 진단(info)이다. V05는 변경 전후 비교가 필요해 직접 작성 Blueprint에 해당하지 않는다.', codes: Object.freeze(['VARIANT_REQUIRES', 'CONTRACT_V01', 'CONTRACT_V02', 'CONTRACT_V03', 'CONTRACT_V04']), source: 'ADR 0010, ADR 0006'}),
]);
