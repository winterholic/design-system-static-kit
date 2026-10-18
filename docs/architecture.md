# 조립 규약과 강제 범위 (카탈로그 2.0)

```mermaid
flowchart LR
  A[카탈로그: 테마·팔레트·축·부품·페이지 유형·템플릿] --> V[검증기]
  B[에이전트 / 시각 조립기 / 갤러리 JSON] --> V
  V -->|허용된 트리| T[토큰 해석 + 대비 게이트]
  V -->|오류 경로·규칙 ID·대안| E[마지막 유효 미리보기 / 출력 중단]
  T --> R[렌더러 + 사용 부품만 CSS]
  R --> H[HTML + CSS + 토큰 + manifest(SHA-256)]
  H --> C[새 빌드와 바이트 일치 검사]
```

## 모듈

| 경로 | 역할 |
|---|---|
| `src/catalog/` | 정본. `axes`(축·금지 조합·내비 한도), `themes`, `palette-rows`/`palettes`, `nodes`(부품 스키마·예시), `pagetypes`, `templates`, `icons`, `coverage`, `index`(규칙·스키마·합성·마이그레이션) |
| `src/validate.mjs` | 엄격·유한 검증기. 보정·기본값·키 제거 없음 |
| `src/tokens.mjs` | 팔레트×모드 → 역할 토큰, 대비 보고서(팔레트×모드당 105쌍) |
| `src/render/` | `nodes`(부품 55), `shell`(셸 10·푸터 3), `chart`(SVG), `art`(미디어 일러스트), `util`(아이콘·링크) |
| `src/styles/` | `base`(축→값 표), `shells`, `chunks`(부품별 CSS), `index`(사용 부품만 조립) |
| `src/compiler.mjs` | 검증 → 토큰 → CSS → HTML → manifest. 대비 게이트 실패 시 예외 |
| `scripts/` | `kit`(CLI), `output`(관리 파일·해시), `audit`, `build`, `gallery`/`bundle`(단일 HTML), `docs`/`md`(문서 생성) |

## 입력 트리

`blueprintSchema()`가 JSON Schema 2020-12를 생성하지만 에디터 안내용입니다. 테마-팔레트 관계, 축 조합 금지, 페이지 유형 계약, 앵커·링크, 표 너비, 차트 형태, 폼 ID 중복 등은 **런타임 검증기**가 판정합니다.

- page: 첫 노드는 page-header 하나. 히어로는 그 바로 다음에 최대 하나. 나머지는 레이아웃 6종과 콘텐츠·데이터 부품 42종.
- 레이아웃 부품은 허용 자식이 다릅니다. split·aside는 정확히 2개, tabs는 tab 2~6개, kanban은 lane 2~5개, 탭 중첩은 거부됩니다.
- 한도: 192KiB, 200노드, 깊이 7. 문자열·행·열·필드·계열 길이도 제한됩니다.
- 링크는 HTTPS, `#main`, 같은 페이지에 선언된 `section.anchor`만 허용합니다. 작성자의 `#features`는 렌더링 시 `#s-features`가 됩니다.

## 토큰

원본 팔레트 → 라이트/다크 표면 → 역할색 → 컴포넌트 CSS. 원색을 UI에 직접 칠하지 않습니다. 보정은 검정/흰색 방향 sRGB 보간이며 지각 균등 램프를 구현했다고 주장하지 않습니다. 보조색은 브랜드와 색상 거리가 가장 먼 채도 있는 스워치에서 고르고, 차트 5색은 브랜드·보조·나머지 스워치 순으로 표면 3:1을 맞춥니다. 색이 부족한 팔레트는 혼합색으로 채우며, 그래서 계열은 색 외에 점선·마커로도 구분됩니다.

## 상태와 상호작용

데이터 부품은 ready/loading/empty/error/partial/forbidden을 가지며 ready·partial에는 실제 데이터가 있어야 합니다. 폼은 **입력 검증 데모**이고 저장하지 않습니다. 생성 페이지의 스크립트는 고정 런타임 하나(폼 확인, ARIA 탭과 화살표 키, 필터 칩, 드롭다운 열기·닫기)입니다. JS가 꺼지면 탭 패널은 모두 펼쳐지고 폼은 안내문을 보입니다.

## 안전성과 수정 감지

텍스트는 항상 이스케이프되고 입력에서 HTML/CSS/JS를 받지 않습니다. 생성 HTML의 CSP는 외부 연결·폼 전송·기본 URL 변경을 막습니다. 미리보기 iframe에는 allow-scripts와 allow-forms만 주고 allow-same-origin은 주지 않습니다.

`kit check`는 manifest를 믿지 않고 blueprint를 현재 카탈로그로 다시 컴파일해 모든 관리 파일을 비교하며 추가·누락·symlink를 거부합니다. SHA-256은 수정 감지용이고 서명이 아닙니다. 검사기를 같이 고칠 권한은 저장소 정책의 몫입니다.

## 조합 공간과 검사

허용 조합 수는 `uses`로 연결되는 축 묶음별로 나누어 셉니다(감사가 Proxy로 `uses`의 정직성을 증명). 전수 컴파일이 불가능한 크기이므로 (1) 팔레트×모드×셸 전수, (2) 템플릿×테마 전수, (3) 축 값 쌍별 커버링, (4) 모든 부품 예시를 컴파일합니다. 수치는 `docs/evidence/coverage.json`과 `docs/verification.md`에 있습니다.

생성 코드 밖 CSS로 감싸거나 상위 앱이 전역 스타일을 덮는 소비 방식은 이 검사로 차단되지 않습니다. standalone HTML 또는 격리된 iframe으로 소비하세요.
