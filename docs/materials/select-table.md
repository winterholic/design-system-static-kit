# Select · Table 컨트롤 재료 (2.6.0 후보)

이 문서는 `component:select-control`과 `component:data-table`의 독립 렌더·상호작용 계약이다. 둘 다 `catalogRegistry()`에 등록되며 `since: 2.6.0`이다. `catalogVersion: "2.6.0"` Blueprint는 노드 `select-control`·`data-table`로 이 재료를 고르고(아래 "Blueprint 노드"), 2.5.0 이하는 `VERSION_FIELD`로 거부한다. 렌더 함수는 컴파일러가 그대로 호출한다.

## Select

`attachSelect`·`attachTable`은 Core(`src/`) 안에 있으므로 `document` 같은 DOM 전역을 읽지 않는다(`tests/core-boundary.test.mjs`). 두 함수는 받은 `root`만 만지고, 문서가 필요하면 `root.ownerDocument`를 쓴다(바깥 클릭 감지, 비동기 옵션 노드 생성).

```js
renderSelect({
  id: 'region', label: '지역', mode: 'single', search: 'local',
  size: 'md', shape: 'soft', state: 'ready', maxMenuHeight: 288,
  options: [{value: 'kr', label: '한국'}, {value: 'jp', label: '일본'}],
});
attachSelect(root, {
  onOptionsRequest: async ({query, signal}) => appOptions.searchRegions(query, {signal}),
});
```

`onOptionsRequest`는 앱이 주입한다. 렌더러는 네트워크에 접근하지 않는다. provider는 `{value: string, label: string, group?: string, disabled?: boolean}[]`를 반환한다. 연속된 같은 `group` 값은 접근 가능한 그룹으로 묶인다. 오래된 응답은 무시되고 새 검색은 이전 요청의 `AbortSignal`을 취소한다.

| 축 | 값 |
|---|---|
| mode | `single`, `multiple` |
| search | `none`, `local`, `async` |
| size | `sm`, `md`, `lg` |
| shape | `soft`, `square`, `pill` |
| state | `ready`, `loading`, `error`, `disabled` |
| 메뉴 높이 | `192`, `240`, `288`, `360` px |

`multiple + async`, `disabled + loading`, `disabled + error`는 금지한다. 키보드는 ArrowUp/Down, Home/End, Enter/Space, Escape, Tab을 처리한다. Escape는 Select 트리거로 포커스를 돌려준다. 검색 모드에 따라 로컬 필터 또는 주입 provider를 사용한다.

미제공: 가상화, 그룹형 비동기 결과, 새 태그 생성, 전체 선택. 비동기 검색은 단일 선택만 지원한다.

## Table

```js
renderDataTable({
  id: 'projects', density: 'comfortable', responsive: 'priority',
  sortable: true, selectable: true,
  columns: [
    {id: 'name', label: '프로젝트', sortable: true},
    {id: 'updated', label: '수정일', sortable: true},
    {id: 'owner', label: '담당자', hideBelow: '800px'},
  ],
  rows: [{id: 'p-1', name: 'Materials', updated: '2026-11-22', owner: '민지'}],
});
attachTable(root, {
  sortChange: ({column, direction}) => appData.sort(column, direction),
  selectionChange: ({selected}) => appData.select(selected),
});
```

열은 2–8개이며 `id`는 고유한 소문자 kebab-case다. 모든 행은 각 열 id에 문자열·숫자·불리언 값(또는 null)을 제공해야 한다. `hideBelow`는 `640px`, `800px`, `900px`만 받는다. 열 폭·정렬·줄바꿈은 기존 `deriveTableDesign` 정책을 재사용한다.

| 축 | 값 |
|---|---|
| density | `compact`, `comfortable`, `spacious` |
| responsive | `scroll`, `priority` |
| state | `ready`, `partial`, `empty`, `loading`, `error` |
| sorting / selection | 각각 켜거나 끌 수 있음 |

정렬 버튼은 Enter 또는 Space로 실행한다. 정렬 방향은 현재 열의 헤더에만 `aria-sort`로 표시하고, 같은 버튼을 다시 누르면 방향이 바뀐다. `sortChange`로 앱 상태를 동기화할 수 있다. 선택 상태는 네이티브 체크박스가 전달한다. 우선순위 열은 작은 화면에서 숨기고 각 데이터 셀은 열 레이블을 함께 표시한다.

`loading`, `ready`, `empty`, `error`, `partial`은 호출자가 데이터를 받은 뒤 다시 렌더링할 때 지정한다. `partial`은 받은 행과 부분 결과 안내를 함께 표시한다.

미제공: 페이지네이션, 가상 스크롤, 열 너비 조절, 셀 편집, 서버 정렬 구현. 서버 정렬은 앱의 주입 콜백이 담당한다.

## 토큰

Select는 `--kit-action`, `--kit-surface`, `--kit-text`, `--kit-muted`, `--kit-border`, `--kit-focus`, `--kit-radius`, `--kit-control`을 읽는다. Table은 여기에 `--kit-soft`, `--kit-danger`를 더 읽는다. `selectStyles`와 `tableStyles`는 이 토큰만 참조하며, 호출 데이터로 CSS를 만들지 않는다.

## Blueprint 노드 (2.6.0)

`NODE_SPEC_EXTENSIONS['2.6.0']`(`src/catalog/node-extensions.mjs`)의 노드이고 `kit` 명령·서비스에서는 `getComponentSpec({type, catalogVersion: '2.6.0'})`로 조회한다. `page`·`section`·`split`·`aside`·`tab` 안에 놓을 수 있고 `grid`·`bento` 안에는 못 놓는다.

```json
{"type": "select-control", "id": "region", "label": "지역", "mode": "multiple", "search": "local", "size": "md", "shape": "soft", "state": "ready", "maxMenuHeight": 288, "values": ["kr"],
 "options": [{"value": "kr", "label": "한국"}, {"value": "jp", "label": "일본", "group": "아시아"}]}
{"type": "data-table", "id": "projects", "title": "프로젝트", "sortable": "yes", "selectable": "yes", "responsive": "priority",
 "columns": [{"id": "name", "label": "프로젝트", "sortable": "yes"}, {"id": "owner", "label": "담당자", "hideBelow": "800px"}],
 "rows": [{"id": "p-1", "name": "재료 플랫폼", "owner": "민지"}]}
```

- 필수: select-control은 `id`·`label`·`options`(2~50개), data-table은 `id`·`title`·`columns`(2~8개)·`rows`(0~40개). 나머지는 이 문서 위쪽 표의 축과 같고, 불리언은 `yes`·`no`다(`requirement: required|optional`).
- 렌더: 재료의 `renderSelect`·`renderDataTable`이 만든 마크업 그대로다. DOM id는 `select-<id>`·`table-<id>`이고 표 제목은 `title`의 제목 요소다. CSS는 쓴 노드의 `selectStyles`·`tableStyles`만 나오고, 생성 페이지의 고정 스크립트 뒤에 `attachSelect`·`attachTable` 소스가 붙는다(provider 없음, 네트워크 없음).
- 진단(코드, 구조화 오류 `{code, path, message, hint}`):

| 코드 | 때 |
|---|---|
| `SELECT_COMBO` | `multiple + async`, 정적 페이지의 `async` 검색, `mode: multiple`에 `value`, `mode: single`에 `values` |
| `SELECT_OPTIONS` | 옵션 value 중복·쉼표, 선택값이 옵션에 없음, 같은 group이 떨어져 있음 |
| `TABLE_COLUMNS` | 열 id 중복, `hideBelow`가 `responsive: priority`가 아닌 표나 첫 열에 있음, `priority`인데 숨길 열이 없음, 열 `sortable`이 표 `sortable: no`에서 쓰임, 정렬 가능한 열이 하나도 없음 |
| `TABLE_ROWS` | 행에 열 값이 없음·열이 아닌 키, 행 id 중복, `empty`에 행, `loading`·`error`에 보이지 않는 행 |
| `STATE_DATA` | `ready`·`partial`에 행이 없음 |
| `ENUM`·`ARRAY_LENGTH`·`PATTERN`·`ONE_OF` | 계약 밖의 크기·모양·메뉴 높이·밀도, 열 수·옵션 수, 열 id 형식, 객체·배열 셀 |

`disabled + loading`·`disabled + error`는 `state`가 한 필드라 쓸 수 없다.

## 2.6.0 컴파일·Studio 연결 지점 (처리 결과는 audit.md §7)

1. 새 Blueprint 노드 `select-control`과 `data-table`의 필드·조합·행/열 입력 검사를 `src/validate.mjs`에 추가하고, 노드 명세는 `src/catalog/nodes.mjs`가 아니라 버전별 확장 표 `src/catalog/node-extensions.mjs`(`NODE_SPEC_EXTENSIONS['2.6.0']`)에 둔다. `nodes.mjs`를 바꾸면 `site/v1/catalog.json`의 2.4.0 snapshot 바이트가 바뀐다. 기본 `CATALOG_VERSION`은 바꾸지 않고 2.6.0 게이트 아래에서만 받는다.
2. `src/catalog/expression.mjs`의 지원 버전을 여는 동일 커밋에서 `src/render/nodes.mjs`에 이 함수들을 연결하고, `src/render/index.mjs` 런타임에는 정적 이벤트 처리와 주입 provider 경계만 둔다.
3. 사용 노드에 맞춰 CSS 조각을 `src/styles/chunks.mjs`에서 선택한다. 토큰 변수는 현재 디자인 시스템 토큰의 소유 작업자가 제공하는 실제 변수 이름과 교차 확인한다.
4. `src/materials/adapters.mjs`는 두 재료를 등록하고, 2.6.0 컴파일 예시와 Studio B 통합은 `since`·입력 계약을 기준으로 연결한다. 기존 `component:table`은 legacy 문자열 행 계약으로 보존한다.
5. 기존 출력 고정 파일은 갱신하지 않는다. 2.4.0/2.5.0 해시 검사를 유지한 상태에서 신규 2.6.0 검증·렌더 테스트를 추가한다.
