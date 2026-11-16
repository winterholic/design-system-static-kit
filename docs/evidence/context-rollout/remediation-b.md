# R14-B — 공통 데이터 표 설계 계약

작성: 2026-11-16 · 작업 단위: 독립 모듈 + 계약 테스트

## 메인 통합 상태

독립 모듈 보고를 받은 뒤 `planComposition()`이 각 표의 `deriveTableDesign()` 결과를 결정 메타데이터에 연결했다. manifest에는 `table-content-1` 정책과 근거 규칙 ID, 열별 폭·정렬·줄바꿈 예산이 남는다. 렌더러는 원래 헤더와 모든 셀을 순회하면서 컴파일러가 도출한 숫자·enum 속성만 덧붙인다. CSS는 그 속성을 실제 최소 폭과 정렬, 내부 가로 스크롤에 연결한다. 기존 2.1 경로에서는 속성 값이 빈 문자열이며 원래 마크업을 보존한다.

새 `tests/table-integration.test.mjs`는 규약이 함수에만 존재하고 실제 컴파일 결과에는 없는 누락을 잡는다. 연결 전에는 `missing readable table budget`와 `renderer did not emit a contextual table` 두 건이 실패하고 레거시 확인 한 건만 통과했다. 연결 뒤 다음 검사가 통과했다.

```text
$ node --test tests/table-design.test.mjs tests/table-integration.test.mjs tests/composition.test.mjs tests/layout.test.mjs
tests 33 · pass 33 · fail 0
all 2.1 templates preserve the original complete compiler output byte for byte
```

테스트는 네 대표 표의 메타데이터→HTML/CSS 연결, 원본 불변, 열 순서와 셀 값 보존, 통화 정렬 및 레거시 출력 경로를 확인한다. 실제 390px에서 읽기 폭과 스크롤, 320px·데스크톱 및 밀도 경계는 아직 브라우저에서 검증하지 않았다. 전체 생성·전체 회귀·운영 배포 역시 미실행이다. 아래 독립 모듈 단계의 기록과 당시 미실행 범위는 이 통합 이후 상태와 구별한다.

## 감사 발견과 확인한 원인

| 감사 ID | 기존 390px 관찰 | 기존 캡처 | 현재 컴파일 대조 |
|---|---|---|---|
| #145 admin-table | 주문 ID가 두 줄로 쪼개지고 상태 셀이 오른쪽에서 잘려 보임 | [admin-table 390](visual-reaudit/390/admin-table.png) | 5열 · 파생 최소 폭 392px |
| #147 api-reference | 경로·해시 값과 설명이 좁은 열에서 중간 줄바꿈 | [api-reference 390](visual-reaudit/390/api-reference.png) | 4열 · 파생 최소 폭 440px |
| #162 docs-reference | 설명 열이 좁아 한국어 설명이 4~5줄로 쌓임 | [docs-reference 390](visual-reaudit/390/docs-reference.png) | 요청 표 4열 · 파생 최소 폭 456px |
| #180 sales-dashboard | 마감 열이 잘리고 단계 라벨이 접힘 | [sales-dashboard 390](visual-reaudit/390/sales-dashboard.png) | 현재 Blueprint는 5열 · 파생 최소 폭 368px |

네 예시를 카탈로그 Blueprint → `compile()` → `planComposition()` → 표 렌더/CSS 경로와 대조했다. 현재 표는 `width:100%`이고 셀에는 `overflow-wrap:break-word`가 있으며, composition은 밀도별 `cellSpace:item`을 네 변에 적용한다. 스크롤 영역은 이미 `overflow-x:auto`와 키보드 포커스를 갖지만, 표·열의 최소 콘텐츠 폭이 없어 브라우저가 표를 가용 폭으로 줄이고 식별자·설명을 셀 안에서 접는다. 바깥 `.kit-table-wrap{overflow:hidden}`은 카드 밖의 넘침을 감춘다. 따라서 근본 수정 지점은 임의의 더 좁은 화면 중단점이 아니라 **콘텐츠 기반 열 최소 폭과 각 열의 줄바꿈 계약**이다. 스크롤 가능한 영역은 있었지만 이 캡처들에는 스크롤 필요를 알리는 단서가 보이지 않았다.

감사 #180은 6열이라고 적었으나 현재 `sales-dashboard` Blueprint에는 `고객·단계·예상 금액·담당·마감` 5열이 있다. 캡처에서 보이는 끝 열과 원본 데이터의 순서를 보존하고, 수가 다른 이유는 이 문서에서 확인된 불일치로 기록한다.

이 네 캡처의 문서 전체 `scrollWidth`는 각각 390px이다. 자동 전체 페이지 넘침 0건은 표 안 콘텐츠가 읽히는지 또는 내부 표가 가로 스크롤되는지 보증하지 않는다. 코드 원인은 현재 컴파일 경로 대조로 확인했으며, 대체 CSS를 실제 브라우저에서 렌더해 확인한 것은 아니다.

## 공식 규칙과 적용 범위

- [Carbon Data Table specifications](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/specifications) · `CAR-12`: 기본 표에서 셀 좌우는 16px (`$spacing-05`). 킷의 현재 `cellSpace:item`은 compact 12px, comfortable 12px, spacious 16px다. 좌우 패딩이 고정 16px이어야 한다는 Carbon의 조건은 spacious에서만 일치한다. **채택:** 좌우 셀 여백을 명시적으로 별도 계산하고 각 열 최소 폭에 포함한다. **예외:** 기존 밀도 축과 C13의 `item` 계약을 유지하며 Carbon 값을 모든 밀도에 덮어쓰지 않는다.
- [Ant Design Table](https://ant.design/components/table/) · `ANT-11`: 공식 design token은 large 16/16, middle 12(세로)/8(가로), small 8/8이다. 표 크기 맥락에 따라 세로·가로 패딩을 분리한다. 킷의 편안함/밀도 토큰은 Ant 크기와 같은 축이 아니므로 수치 매핑을 주장하지 않는다. **채택:** 세로는 기존 `near`(8px), 가로는 composition의 `cellSpace:item`(compact 12px, comfortable 12px, spacious 16px)을 사용해 네 변 동일 패딩을 없앤다. `near=8`은 세 밀도 모두 기존 spacing 토큰이다.
- [Polaris Web Components Table](https://shopify.dev/docs/api/app-home/latest/web-components/layout-and-structure/table) · `POL-06`: `numeric`/`currency` 열 형식을 통해 우측 정렬을 표현한다. [Ant Design Table](https://ant.design/components/table/) · `ANT-12`: 숫자 우측 정렬 예시를 보이며 기본은 왼쪽이다. 두 규칙은 숫자 열의 표현 원리이지, 헤더 문구만 보고 열 타입을 추측하라는 뜻이 아니다. **채택:** 데이터 값 전체가 명확한 수량 형식일 때만 `end`를 낸다. **예외:** 주문 ID, 전화번호, `2.4.0`/`2.4` 버전, 날짜, 혼합값, 정수처럼 식별자일 수도 있는 단순 숫자열은 자동 우측 정렬하지 않는다. 현재 Blueprint 스키마에는 열 의미 타입이 없으므로, 값 패턴이 모호하면 기본 `start`를 택한다.

공식 원문 조건은 ledger JSON에서 요청된 `CAR-12`, `ANT-11`, `POL-06`, `ANT-12` 네 객체만 파싱해 확인했고 위 공식 문서와 대조했다. rule-ledger 전체 JSON은 출력하지 않았다.

## 파생 결과 계약

`src/table-design.mjs`의 `deriveTableDesign(tableNode, compositionDecision, {availableWidth})`는 기존 `table` 노드와 composition의 `facts.density`, `values.cellSpace`만 읽는다. Blueprint 입력·catalog version·자유 스타일 설정은 받지 않는다.

- 각 원본 열 인덱스에 최소 폭(px), 정렬(`start`/`end`), 줄바꿈(`nowrap`/`words`) 결과를 낸다. 열 이름이나 순서를 바꾸지 않는다.
- 글자 폭은 이미 쓰는 `valueUnits` 추정치를 재사용하고, 열별 폭 단위는 기존 밀도 `item` 토큰이다. 제목·짧은 값 폭 경계는 기존 `CPL_BUCKETS` / `VL_BUCKETS`를 따른다. 열 폭은 4px 격자로 올림한다.
- 설명 같은 긴 문장은 12~16 기존 CPL 단위의 읽기 폭을 보장하고 초과 내용은 여러 단어 줄로 둔다. 식별자·짧은 상태·숫자열은 줄바꿈을 억제하고, 필요한 전체 폭을 가로 스크롤에 남긴다.
- 전체 최소 폭은 각 열 최소 폭의 합이다. 호출자가 실제 가용 폭을 제공하면 `scroll.required`를 판정하고, 제공하지 않으면 `null`로 둔다. 스크롤 방식은 기존 포커스 가능한 스크롤 영역과 일치하는 `auto`다.
- 2/4/6열, 빈 행, 짧고 긴 한글, 비대칭 폭, 혼합 및 모호한 숫자 패턴, 결정성, 불변 입력을 계약 테스트로 검사한다. 이 모듈은 값을 복제·정규화하지 않으며 결과는 기존 표의 각 원본 열에 붙일 파생 설명이다.

| 현재 컴파일 표 | 열 수 | 파생 최소 폭 | 340px 폭에서 스크롤 |
|---|---:|---:|---|
| docs-reference · 요청 매개변수 | 4 | 456px | 필요 |
| api-reference · 경로·쿼리 매개변수 | 4 | 440px | 필요 |
| admin-table · 주문 목록 | 5 | 392px | 필요 |
| sales-dashboard · 진행 중인 큰 계약 | 5 | 368px | 필요 |

340px는 390px 모바일 캡처에서 페이지·카드 거터를 뺀 표 가용 폭을 확인하기 위한 계약 시험 예산이다. 모듈은 이 수치를 고정하지 않고 호출자가 준 `availableWidth`만 비교한다. 모듈의 폭 수치는 브라우저 글리프 계측이 아닌 기존 `valueUnits`와 토큰에 기초한 보수적 예산이다.

## 통합과 합격 조건

메인 통합 지점은 `src/composition.mjs`의 `planComposition()`이 table decision을 만든 뒤 이 모듈 결과를 결정 메타데이터로 붙이는 곳이다. `compositionCSS()`에서 좌우/세로 토큰을 분리하고 표를 최소 콘텐츠 폭으로 유지하며, `src/render/nodes.mjs`의 `R.table`은 기존 `n.columns`·`n.rows`를 그대로 순회하면서 열별 파생 정렬·줄바꿈을 연결한다. 기존 `.kit-table-scroll`의 `role=region`, `tabindex=0`, `overflow-x:auto`를 유지한다. 2.1 입력에서 composition 계획이 없는 기존 경로는 이 모듈의 선택자·속성을 추가하지 않아야 한다.

합격은 (1) 390px 예시에서 요청 데이터·헤더·링크가 누락/변경되지 않고, (2) 좁은 4~6열 표가 긴 설명을 세로로 압축하지 않고 최소 폭과 스크롤을 갖고, (3) ID·전화·버전·날짜가 수량처럼 우측 정렬되지 않으며 통화/명확한 수량만 우측 정렬되고, (4) 빈 표 및 2열이 불필요하게 폭을 강제하지 않고, (5) catalog 2.1 출력은 기존 바이트 경로를 유지하는 것이다. 브라우저 전후 캡처, 2.1 전체 출력 회귀, 전체 verify, site 재생성은 이번 범위 밖이며 아직 검증하지 않았다.

2.1 입력은 현재 독립 모듈을 import하거나 composition 속성을 추가하지 않는다. `compile()` 스모크에서 `design=false`, 기존 표 클래스 유지, 새 `data-design-kind=table` 속성 부재를 확인했다. 이는 이 모듈 변경이 2.1 경로에 연결되지 않았다는 확인이며, 이전 버전 산출물과의 전체 바이트 비교를 대신하지 않는다.

## RED / GREEN 실행 증거

계약 파일을 먼저 작성한 후 구현 전 실행:

```text
$ node --test tests/table-design.test.mjs
ERR_MODULE_NOT_FOUND: Cannot find module '/Users/winterholic/development/projects/design-system-static-kit/src/table-design.mjs'
✖ tests/table-design.test.mjs (75.43725ms)
```

첫 구현에서 긴 한글 설명을 짧은 값으로 처리하는 반례가 실패했고, 줄바꿈 조건을 고친 뒤 최종 GREEN:

```text
$ node --test tests/table-design.test.mjs
✔ derives stable minimum readable widths and scroll requirement from existing table metadata
✔ aligns strongly typed quantitative values without using header labels
✔ does not treat identifiers, phone numbers, versions, dates, mixed values or prose as numbers
✔ supports 2, 4 and 6 columns while preserving every source label and cell
✔ uses deterministic density spacing and preserves useful width for empty tables
✔ rejects unsupported types and inconsistent table shapes instead of inventing widths
ℹ tests 6 · pass 6 · fail 0
```

숫자 정렬 계약의 민감도 확인으로 구현에서 `end` 분기를 잠시 제거해 실행했을 때 `aligns strongly typed quantitative values`가 `actual ['start','start','start']` 대 `expected ['start','end','start']`로 실패했다. 분기를 복구한 최종 실행은 위 GREEN이다.

현재 컴파일 대조 명령은 네 Blueprint를 `compile()`하고 `planComposition()` 결정에서 폭을 도출했다. 출력에서 네 표 모두 `table{width:100%}`, `.kit-table-wrap{overflow:hidden}`, `overflow-wrap:break-word`, `.kit-table-scroll`이 확인됐다. 이 대조는 컴파일 HTML/CSS와 파생 계약의 일치 검사이며 브라우저 렌더 검증은 아니다.
