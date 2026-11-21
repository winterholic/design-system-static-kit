# Select · Table 컨트롤 재료 (2.6.0 후보)

이 문서는 `component:select-control`과 `component:data-table`의 독립 렌더·상호작용 계약이다. 둘 다 `catalogRegistry()`에 등록되며 `since: 2.6.0`이다. 현재 Blueprint 검증기와 컴파일러는 계속 2.5.0까지만 받는다. 아래 함수들은 새 데이터 계약을 제공하지만 기존 컴파일 경로에 자동으로 연결되지는 않는다.

## Select

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

기본 정렬은 화면 행 순서를 바꾸고 주입된 `sortChange`로 앱 상태와 동기화할 수 있다. 선택은 체크박스와 `aria-selected`를 같이 갱신한다. 우선순위 열은 작은 화면에서 숨기고 각 데이터 셀은 열 레이블을 함께 표시한다.

미제공: 페이지네이션, 가상 스크롤, 열 너비 조절, 셀 편집, 서버 정렬 구현. 서버 정렬은 앱의 주입 콜백이 담당한다.

## 토큰

Select는 `--kit-action`, `--kit-surface`, `--kit-text`, `--kit-muted`, `--kit-border`, `--kit-focus`, `--kit-radius`, `--kit-control`을 읽는다. Table은 여기에 `--kit-soft`, `--kit-danger`를 더 읽는다. `selectStyles`와 `tableStyles`는 이 토큰만 참조하며, 호출 데이터로 CSS를 만들지 않는다.

## 2.6.0 컴파일·Studio 연결 지점

1. 새 Blueprint 노드 `select-control`과 `data-table`의 필드·조합·행/열 입력 검사를 `src/catalog/nodes.mjs`/`src/validate.mjs`에 추가한다. 기본 `CATALOG_VERSION`은 바꾸지 않고 2.6.0 게이트 아래에서만 받는다.
2. `src/catalog/expression.mjs`의 지원 버전을 여는 동일 커밋에서 `src/render/nodes.mjs`에 이 함수들을 연결하고, `src/render/index.mjs` 런타임에는 정적 이벤트 처리와 주입 provider 경계만 둔다.
3. 사용 노드에 맞춰 CSS 조각을 `src/styles/chunks.mjs`에서 선택한다. 토큰 변수는 현재 디자인 시스템 토큰의 소유 작업자가 제공하는 실제 변수 이름과 교차 확인한다.
4. `src/materials/adapters.mjs`는 두 재료를 등록하고, 2.6.0 컴파일 예시와 Studio B 통합은 `since`·입력 계약을 기준으로 연결한다. 기존 `component:table`은 legacy 문자열 행 계약으로 보존한다.
5. 기존 출력 고정 파일은 갱신하지 않는다. 2.4.0/2.5.0 해시 검사를 유지한 상태에서 신규 2.6.0 검증·렌더 테스트를 추가한다.
