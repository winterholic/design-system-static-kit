# 레이아웃 패턴 24종 (layout 재료)

> 이 문서는 `scripts/layouts/doc.mjs`가 등록된 재료(`src/platform/data/layouts.mjs`)에서 생성한다. 손으로 고치지 않는다.

REQUEST §9.2의 24개 레이아웃을 `layout:*` 재료로 등록했다(플랫폼 계약 0.8.0). 레이아웃은 **슬롯 계약**과 **폭 구간별 배치 표**를 가진다. 좁은 화면에서 전체를 줄이는 것이 아니라 슬롯의 자리를 다시 정한다.

## 폭 구간

컨테이너 폭(`container-type:inline-size`)으로 구간을 나눈다. 뷰포트가 아니다: 사이드바 안에 들어간 레이아웃도 자기 폭에 맞춘다.

| 구간 | 컨테이너 폭 | 뷰포트 예 |
|---|---|---|
| xs | 0px 이상 | 320px |
| sm | 560px 이상 | 768px |
| md | 880px 이상 | 1024px |
| lg | 1180px 이상 | 1440px |

## 컴파일과 검증

- 컴파일: `compileLayout(layout, fills)`(`src/layout.mjs`)는 슬롯 계약을 어기면 거부한다(`L_SLOT_REQUIRED`·`L_SLOT_MIN`·`L_SLOT_MAX`·`L_SLOT_ACCEPTS`·`L_NEST_FORBIDDEN`·`L_NEST_DEPTH`·`L_DENSITY`). 조용히 고쳐 통과시키지 않는다.
- 조립: `assembleLayout(env, {layout, fills})`(`src/platform/layouts.mjs`)가 칸의 내용을 목적 패밀리(`purpose:*`) 렌더로 채우고 관계 그래프(`layout-slot-fit`·`layout-axis`·`forbids`·`avoids`)를 거친다.
- 조회: `listPlatformMaterials({kind: "layout"})`, `getPlatformMaterial({id})`, `recommendMaterials({kind: "layout", selected})`, `checkCompatibility({ids})`와 같은 REST·MCP.
- 실측: `node scripts/layouts/measure.mjs`(Chromium)가 24종 × 320·360·480·640·768·1024·1280·1440px의 가로 스크롤과 슬롯 위치를 기록한다(`docs/dev/catalog-platform-upgrade/screens/layouts/measurements.md`).
- 읽기 순서: DOM 순서는 슬롯 선언 순서다. 폭이 넓어질 때 행 우선 읽기 순서가 달라지는 구간은 `reorders`에 선언한다.

## 24종 요약

| # | 레이아웃 | 핵심 구간 | 필수 슬롯 | 선택 슬롯 | 적용 목적 | 최소 콘텐츠 폭 | 기본 밀도 |
|---|---|---|---|---|---|---|---|
| 1 | Single Column (`layout:single-column`) | lg | content | lead, aside | editorial-docs, saas-landing | 280px | comfortable |
| 2 | Two Column (`layout:two-column`) | sm | primary, secondary | - | saas-landing, work-dashboard, editorial-docs, commerce | 280px | comfortable |
| 3 | Three Column (`layout:three-column`) | md | center, left, right | - | work-dashboard, editorial-docs | 280px | comfortable |
| 4 | Equal Grid (`layout:equal-grid`) | md | items | head | saas-landing, work-dashboard, commerce | 240px | comfortable |
| 5 | Asymmetric Grid (`layout:asymmetric-grid`) | md | feature, items | - | saas-landing, editorial-docs | 280px | comfortable |
| 6 | Masonry (`layout:masonry`) | md | items | - | commerce, editorial-docs, saas-landing | 240px | comfortable |
| 7 | Bento (`layout:bento`) | lg | tiles | head | saas-landing, work-dashboard | 280px | comfortable |
| 8 | Sidebar Main (`layout:sidebar-main`) | sm | sidebar, main | - | work-dashboard, editorial-docs | 280px | compact |
| 9 | Double Sidebar (`layout:double-sidebar`) | lg | left, main, right | - | work-dashboard, editorial-docs | 280px | compact |
| 10 | Master-detail (`layout:master-detail`) | sm | list, detail | meta | work-dashboard, commerce | 280px | compact |
| 11 | Dashboard Grid (`layout:dashboard-grid`) | md | kpis, charts, table | side | work-dashboard | 280px | compact |
| 12 | KPI Strip (`layout:kpi-strip`) | md | metrics | lead | work-dashboard, saas-landing | 240px | compact |
| 13 | Editorial Layout (`layout:editorial-layout`) | lg | headline, body | kicker, figure, lede, aside | editorial-docs | 280px | comfortable |
| 14 | Split Hero (`layout:split-hero`) | md | copy, media | actions | saas-landing, commerce | 280px | spacious |
| 15 | Centered Hero (`layout:centered-hero`) | sm | copy | actions, proof | saas-landing | 280px | spacious |
| 16 | Media Hero (`layout:media-hero`) | md | media, copy | actions | saas-landing, commerce | 280px | spacious |
| 17 | Product Detail Layout (`layout:product-detail-layout`) | md | gallery, info, buy | details, related | commerce | 280px | comfortable |
| 18 | Commerce Grid (`layout:commerce-grid`) | md | products | toolbar, filters | commerce | 280px | comfortable |
| 19 | Settings Layout (`layout:settings-layout`) | md | nav, sections | help, actions | work-dashboard | 280px | comfortable |
| 20 | Documentation Layout (`layout:documentation-layout`) | lg | nav, content | toc | editorial-docs | 280px | compact |
| 21 | Mobile Stack (`layout:mobile-stack`) | md | content | header, actions | commerce, work-dashboard | 240px | comfortable |
| 22 | Sticky Action Layout (`layout:sticky-action-layout`) | md | content, actions, summary | - | commerce, work-dashboard | 280px | comfortable |
| 23 | Form Layout (`layout:form-layout`) | md | fields, actions | intro, aside | saas-landing, work-dashboard, commerce | 280px | comfortable |
| 24 | Multi-step Form (`layout:multi-step-form`) | md | steps, panel, actions | summary | commerce, work-dashboard, saas-landing | 280px | comfortable |

## Single Column

`layout:single-column` · 읽기 폭 한 열. 넓은 화면에서 보조 슬롯이 오른쪽 여백으로 이동한다.

- 부모 컨테이너: main(폭 standard) — 본문 컨테이너(--kit-max) 안에서 가운데 정렬
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 lg 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: editorial-docs, saas-landing / 페이지 유형: article, blog, docs, general
- 중첩: layout:equal-grid, layout:two-column (깊이 2)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| lead (도입) | 선택 | 0~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | wrap |
| content (본문) | 필수 | 1~8 | group:card, group:table, group:form, group:feedback, layout:equal-grid, layout:two-column | div | stack | 긴 본문은 줄바꿈하고 높이는 제한하지 않는다. |
| aside (곁글) | 선택 | 0~1 | group:card, group:feedback | aside | stack · sticky | 곁글이 길면 여백 열 안에서 줄바꿈한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `lead` / `content` / `aside` |
| sm (560px~) | `minmax(0rem,40rem)` | `lead` / `content` / `aside` |
| md (880px~) | `minmax(0rem,44rem)` | `lead` / `content` / `aside` |
| lg (1180px~) | `minmax(0,1fr) minmax(0rem,44rem) minmax(0,1fr)` | `_ lead _` / `_ content aside` |

**배치 규칙**

- 한 열의 읽기 폭은 44rem을 넘지 않는다(약 75자).
- aside는 1180px 이상에서만 오른쪽 여백으로 나가고 그보다 좁으면 본문 아래에 쌓인다.

## Two Column

`layout:two-column` · 두 슬롯을 나란히 둔다. 좁으면 한 열로 쌓고, 넓으면 주 슬롯이 더 넓어진다.

- 부모 컨테이너: section(폭 standard) — 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 sm 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing, work-dashboard, editorial-docs, commerce / 페이지 유형: any
- 중첩: layout:equal-grid, layout:single-column (깊이 2)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| primary (주) | 필수 | 1~6 | group:card, group:table, group:form, group:feedback, layout:equal-grid, layout:single-column | div | stack | 높이 제한 없음. 두 열의 높이가 달라도 늘리지 않는다(위쪽 정렬). |
| secondary (보조) | 필수 | 1~6 | group:card, group:table, group:form, group:feedback, layout:equal-grid, layout:single-column | div | stack | 위와 같다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `primary` / `secondary` |
| sm (560px~) | `minmax(0,1fr) minmax(0,1fr)` | `primary secondary` |
| md (880px~) | `minmax(0,1fr) minmax(0,1fr)` | `primary secondary` |
| lg (1180px~) | `minmax(0,3fr) minmax(0,2fr)` | `primary secondary` |

**배치 규칙**

- 560px 미만은 한 열이다(주 → 보조).
- 1180px 이상에서 열 비율이 3:2로 바뀐다.

## Three Column

`layout:three-column` · 본문을 앞에 두는 3분할. 좁으면 본문 → 좌 → 우 순서로 쌓고, 넓어지면 좌·본문·우로 펼친다.

- 부모 컨테이너: main(폭 wide) — 페이지 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: work-dashboard, editorial-docs / 페이지 유형: dashboard, community, docs, general
- 중첩: layout:equal-grid, layout:single-column (깊이 2)
- 시각 순서가 DOM과 달라지는 구간: md, lg

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| center (본문) | 필수 | 1~6 | group:card, group:table, group:form, group:feedback, layout:equal-grid, layout:single-column | div | stack | 본문은 줄바꿈한다. |
| left (왼쪽 보조) | 필수 | 1~4 | group:card, group:feedback, group:navigation | aside | stack | 보조 슬롯은 열 안에서 줄바꿈한다. |
| right (오른쪽 보조) | 필수 | 1~4 | group:card, group:feedback | aside | stack | 위와 같다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `center` / `left` / `right` |
| sm (560px~) | `minmax(0,1fr) minmax(0,1fr)` | `center center` / `left right` |
| md (880px~) | `minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)` | `left center right` |
| lg (1180px~) | `minmax(0,1fr) minmax(0,3fr) minmax(0,1fr)` | `left center right` |

**배치 규칙**

- DOM은 본문이 먼저다. 880px 이상에서만 시각 순서가 좌·본문·우가 된다.
- 560~879px는 본문이 두 칸을 쓰고 좌·우가 그 아래에 나란히 놓인다.

## Equal Grid

`layout:equal-grid` · 같은 크기 칸의 격자. 열 수는 컨테이너 폭이 정하고 항목 수가 마지막 줄 한 칸 남음을 막는다.

- 부모 컨테이너: section(폭 wide) — 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 240px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `gap`
- 적용 가능한 페이지 목적: saas-landing, work-dashboard, commerce / 페이지 유형: any
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| head (머리말) | 선택 | 0~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | wrap |
| items (항목) | 필수 | 2~12 | group:card | div | grid [1,2,3,4] | 칸 높이는 같은 줄의 가장 긴 칸을 따른다. 칸 안 긴 제목은 줄바꿈한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `head` / `items` |
| sm (560px~) | `minmax(0,1fr)` | `head` / `items` |
| md (880px~) | `minmax(0,1fr)` | `head` / `items` |
| lg (1180px~) | `minmax(0,1fr)` | `head` / `items` |

**배치 규칙**

- 열 수 상한은 폭 구간마다 1·2·3·4다.
- 실제 열 수는 bestCols(항목 수, 상한)이 정한다: 마지막 줄에 한 칸만 남기지 않는다.

## Asymmetric Grid

`layout:asymmetric-grid` · 큰 칸 하나와 작은 칸 묶음. 폭마다 큰 칸의 비율과 작은 칸의 열 수가 바뀐다.

- 부모 컨테이너: section(폭 wide) — 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing, editorial-docs / 페이지 유형: landing, portfolio, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| feature (큰 칸) | 필수 | 1~1 | group:card | div | stack | 큰 칸은 줄 높이를 채운다. |
| items (작은 칸) | 필수 | 2~4 | group:card | div | grid [1,2,1,2] | 작은 칸은 묶음 안에서 같은 크기다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `feature` / `items` |
| sm (560px~) | `minmax(0,1fr)` | `feature` / `items` |
| md (880px~) | `minmax(0,3fr) minmax(0,2fr)` | `feature items` |
| lg (1180px~) | `minmax(0,2fr) minmax(0,3fr)` | `feature items` |

**배치 규칙**

- 큰 칸은 880px 이상에서 작은 칸 묶음과 나란히 놓이고 높이를 맞춘다(stretch).
- 작은 칸의 열 수는 1 → 2 → 1 → 2로 바뀐다: 묶음이 차지하는 폭에 맞춘다.

## Masonry

`layout:masonry` · 높이가 다른 카드를 열 단위로 채우는 벽돌 배치(CSS 다단). 읽는 순서는 열 위에서 아래다.

- 부모 컨테이너: section(폭 wide) — 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 240px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `gap`
- 적용 가능한 페이지 목적: commerce, editorial-docs, saas-landing / 페이지 유형: community, portfolio, blog, listing, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| items (항목) | 필수 | 4~16 | group:card | div | columns [1,2,3,4] | 칸 높이는 내용이 정한다. 칸 사이 높이 차이는 허용한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `items` |
| sm (560px~) | `minmax(0,1fr)` | `items` |
| md (880px~) | `minmax(0,1fr)` | `items` |
| lg (1180px~) | `minmax(0,1fr)` | `items` |

**배치 규칙**

- 열은 1·2·3·4개이고 항목은 열 위에서 아래로 채운다(break-inside: avoid).
- 줄 정렬이 없으므로 순서가 중요한 목록(순위·단계)에는 쓰지 않는다.

## Bento

`layout:bento` · 크기가 다른 칸을 빈틈 없이 맞춘다. 큰 칸은 4열에서 2×2, 좁으면 한 줄이다.

- 부모 컨테이너: section(폭 wide) — 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 lg 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing, work-dashboard / 페이지 유형: landing, dashboard, portfolio, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| head (머리말) | 선택 | 0~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | wrap |
| tiles (칸) | 필수 | 3~6 | group:card | div | bento [1,2,2,4] | 칸 높이는 줄에서 가장 긴 칸을 따른다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `head` / `tiles` |
| sm (560px~) | `minmax(0,1fr)` | `head` / `tiles` |
| md (880px~) | `minmax(0,1fr)` | `head` / `tiles` |
| lg (1180px~) | `minmax(0,1fr)` | `head` / `tiles` |

**배치 규칙**

- 칸 크기 표는 src/layout.mjs의 BENTO 표다(3~6칸). 모든 줄이 열을 채운다.
- 1180px 이상은 4열이고 큰 칸이 2×2, 880~1179px는 2열, 560px 미만은 1열이다.
- 한 칸짜리가 홀수 개이면 2열에서 마지막 칸이 줄 전체를 쓴다.

## Sidebar Main

`layout:sidebar-main` · 내비게이션 열과 본문. 좁으면 내비가 본문 위에 쌓이고, 넓으면 고정 폭 열이 된다.

- 부모 컨테이너: page-shell(폭 full) — 셸 본문 영역 전체
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 sm 구간부터
- 밀도: compact·comfortable·spacious(기본 compact), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: work-dashboard, editorial-docs / 페이지 유형: dashboard, data, docs, settings, general
- 중첩: layout:dashboard-grid, layout:equal-grid, layout:two-column, layout:kpi-strip (깊이 2)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| sidebar (사이드바) | 필수 | 1~1 | group:navigation | aside | stack · sticky | 내비 항목이 길면 줄바꿈한다. |
| main (본문) | 필수 | 1~8 | group:card, group:table, group:form, group:feedback, layout:dashboard-grid, layout:equal-grid, layout:two-column, layout:kpi-strip | div | stack | 본문은 남은 폭을 모두 쓴다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `sidebar` / `main` |
| sm (560px~) | `minmax(12rem,15rem) minmax(0,1fr)` | `sidebar main` |
| md (880px~) | `minmax(14rem,16rem) minmax(0,1fr)` | `sidebar main` |
| lg (1180px~) | `minmax(16rem,18rem) minmax(0,1fr)` | `sidebar main` |

**배치 규칙**

- 사이드바는 560px 이상에서 12~18rem 열이 되고 스크롤 중에도 위에 붙는다(sticky).
- 560px 미만은 사이드바가 본문 위에 쌓인다.

## Double Sidebar

`layout:double-sidebar` · 왼쪽 내비·본문·오른쪽 보조. 1180px 미만에서는 보조가 본문 아래로 내려간다.

- 부모 컨테이너: page-shell(폭 full) — 셸 본문 영역 전체
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 lg 구간부터
- 밀도: compact·comfortable(기본 compact), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: work-dashboard, editorial-docs / 페이지 유형: dashboard, community, docs, general
- 중첩: layout:equal-grid, layout:kpi-strip (깊이 2)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| left (왼쪽 내비) | 필수 | 1~1 | group:navigation | aside | stack · sticky | 내비는 열 안에서 줄바꿈한다. |
| main (본문) | 필수 | 1~8 | group:card, group:table, group:form, group:feedback, layout:equal-grid, layout:kpi-strip | div | stack | 본문이 남는 폭을 쓴다. |
| right (오른쪽 보조) | 필수 | 1~4 | group:card, group:feedback | aside | stack | 보조는 열 안에서 줄바꿈한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `left` / `main` / `right` |
| sm (560px~) | `minmax(0,1fr) minmax(0,2fr)` | `left main` / `right main` |
| md (880px~) | `minmax(14rem,16rem) minmax(0,1fr)` | `left main` / `left right` |
| lg (1180px~) | `minmax(14rem,16rem) minmax(0,1fr) minmax(16rem,20rem)` | `left main right` |

**배치 규칙**

- 1180px 이상에서만 세 열이다. 880~1179px는 왼쪽 열과 본문, 오른쪽 보조가 본문 아래다.
- 560~879px는 왼쪽·오른쪽 슬롯이 좁은 열에 쌓이고 본문이 넓은 열이다.

## Master-detail

`layout:master-detail` · 목록과 상세. 좁으면 쌓이고 넓으면 목록이 스크롤 영역이 되며, 가장 넓은 폭에서 메타 열이 생긴다.

- 부모 컨테이너: page-shell(폭 full) — 셸 본문 영역 전체
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 sm 구간부터
- 밀도: compact·comfortable(기본 compact), 칸 사이 간격 `gap`, 항목 사이 간격 `near`
- 적용 가능한 페이지 목적: work-dashboard, commerce / 페이지 유형: dashboard, data, community, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| list (목록) | 필수 | 2~12 | group:card, group:navigation | div | stack · sticky | 목록 항목이 많아도 영역 높이를 제한하고 안에서 스크롤한다. |
| detail (상세) | 필수 | 1~4 | group:card, group:table, group:form, group:feedback | div | stack | 상세는 높이를 제한하지 않는다. |
| meta (메타) | 선택 | 0~1 | group:card, group:feedback | aside | stack | wrap |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `list` / `detail` / `meta` |
| sm (560px~) | `minmax(16rem,20rem) minmax(0,1fr)` | `list detail` / `list meta` |
| md (880px~) | `minmax(18rem,22rem) minmax(0,1fr)` | `list detail` / `list meta` |
| lg (1180px~) | `minmax(20rem,26rem) minmax(0,1fr) minmax(14rem,18rem)` | `list detail meta` |

**배치 규칙**

- 목록은 560px 이상에서 세로 스크롤 영역(최대 높이 min(70vh, 40rem))이고 위에 붙는다.
- 1180px 이상에서만 메타가 상세 오른쪽 열이 된다.

## Dashboard Grid

`layout:dashboard-grid` · 지표 줄·차트 영역·보조·표를 격자에 배치한다. 폭마다 열이 2 → 2 → 3 → 4로 늘어난다.

- 부모 컨테이너: page-shell(폭 full) — 셸 본문 영역 전체
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable(기본 compact), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: work-dashboard / 페이지 유형: dashboard, data
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| kpis (지표) | 필수 | 2~6 | purpose:card.kpi | div | grid [2,2,3,4] | 지표 값이 길어도 칸을 키우지 않는다(줄바꿈). |
| charts (차트·요약) | 필수 | 1~3 | group:card | div | stack | 차트·요약 칸은 내용 높이다. 같은 줄의 알림이 더 길면 위쪽 정렬을 유지한다. |
| side (알림) | 선택 | 0~1 | group:card, group:feedback | aside | stack | wrap |
| table (표) | 필수 | 1~2 | group:table | div | stack | 표는 전폭이고 넘치면 슬롯 안에서 가로 스크롤한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `kpis` / `charts` / `side` / `table` |
| sm (560px~) | `minmax(0,1fr) minmax(0,1fr)` | `kpis kpis` / `charts side` / `table table` |
| md (880px~) | `minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)` | `kpis kpis kpis` / `charts charts side` / `table table table` |
| lg (1180px~) | `minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)` | `kpis kpis kpis kpis` / `charts charts charts side` / `table table table table` |

**배치 규칙**

- 지표 줄은 열 수 상한 2·2·3·4에서 마지막 줄에 한 칸만 남기지 않는다.
- 880px 이상에서 알림이 차트 오른쪽 열로 올라간다. 표는 항상 전폭이고 가로로 넘치면 표 안에서만 스크롤한다.

## KPI Strip

`layout:kpi-strip` · 지표를 한 줄로 늘어놓는다. 좁으면 2열, 560px에서 3열, 880px 이상에서 항목 수만큼 한 줄이다.

- 부모 컨테이너: section(폭 full) — 섹션 안쪽 컨테이너(전폭 띠)
- 최소 콘텐츠 폭 240px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable(기본 compact), 칸 사이 간격 `item`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: work-dashboard, saas-landing / 페이지 유형: dashboard, data, landing, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| lead (띠 제목) | 선택 | 0~1 | purpose:card.status, purpose:card.feature | div | stack | wrap |
| metrics (지표) | 필수 | 2~6 | purpose:card.kpi | div | grid [2,3,5,6] | 값 한 줄 + 라벨. 긴 값은 줄바꿈하고 칸 높이를 키운다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `lead` / `metrics` |
| sm (560px~) | `minmax(0,1fr)` | `lead` / `metrics` |
| md (880px~) | `minmax(0,1fr)` | `lead` / `metrics` |
| lg (1180px~) | `minmax(10rem,12rem) minmax(0,1fr)` | `lead metrics` |

**배치 규칙**

- 지표 열 수 상한은 2·3·5·6이다. 항목이 5개 이하이면 880px 이상에서 한 줄이다(bestCols가 마지막 줄 한 칸 남음을 막는다).
- 1180px 이상에서 띠 제목이 왼쪽 열이 된다.

## Editorial Layout

`layout:editorial-layout` · 표제·그림·리드·본문·곁글의 편집 배치. 넓은 폭에서 리드·본문·곁글이 3열 읽기 줄을 이룬다.

- 부모 컨테이너: main(폭 wide) — 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 lg 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: editorial-docs / 페이지 유형: article, blog, docs
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| kicker (분류) | 선택 | 0~1 | purpose:card.status | div | stack | wrap |
| headline (표제) | 필수 | 1~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | 긴 표제는 줄바꿈한다. |
| figure (대표 그림) | 선택 | 0~1 | purpose:card.gallery, purpose:card.product | div | stack | wrap |
| lede (리드) | 선택 | 0~1 | purpose:card.article, purpose:card.feature | div | stack | wrap |
| body (본문) | 필수 | 1~4 | purpose:card.article | div | stack | 본문 길이는 제한하지 않는다. |
| aside (곁글) | 선택 | 0~1 | group:card, group:feedback | aside | stack · sticky | 곁글이 길면 열 안에서 줄바꿈한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `kicker` / `headline` / `figure` / `lede` / `body` / `aside` |
| sm (560px~) | `minmax(0rem,40rem)` | `kicker` / `headline` / `figure` / `lede` / `body` / `aside` |
| md (880px~) | `minmax(0,1fr) minmax(14rem,18rem)` | `kicker kicker` / `headline headline` / `figure figure` / `lede lede` / `body aside` |
| lg (1180px~) | `minmax(0,2fr) minmax(0,5fr) minmax(0,3fr)` | `kicker kicker kicker` / `headline headline headline` / `figure figure figure` / `lede body aside` |

**배치 규칙**

- 1180px 이상: 표제와 그림은 전폭, 그 아래 리드·본문·곁글이 2:5:3 3열이다.
- 880~1179px: 본문과 곁글이 2열이고 리드가 전폭이다.
- 본문은 어느 폭에서도 읽기 폭(44rem)을 넘지 않게 열 비율로 제한한다.

## Split Hero

`layout:split-hero` · 글 영역과 시각 영역을 나눈 히어로. 좁으면 쌓고 넓으면 5:7 두 칸이다.

- 부모 컨테이너: section(폭 wide) — 히어로 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 spacious), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing, commerce / 페이지 유형: landing, pricing, commerce, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: md, lg

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| copy (글) | 필수 | 1~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | 글 칸이 길면 높이가 늘고 시각 칸이 같이 늘어난다. |
| actions (행동) | 선택 | 0~2 | group:button | div | row [1,2,2,2] | wrap |
| media (시각) | 필수 | 1~1 | purpose:card.gallery, purpose:card.product | div | stack | 시각 칸은 열 높이를 채운다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `copy` / `actions` / `media` |
| sm (560px~) | `minmax(0rem,40rem)` | `copy` / `actions` / `media` |
| md (880px~) | `minmax(0,1fr) minmax(0,1fr)` | `copy media` / `actions media` |
| lg (1180px~) | `minmax(0,5fr) minmax(0,7fr)` | `copy media` / `actions media` |

**배치 규칙**

- 880px 이상에서 글·행동이 왼쪽 열, 시각이 오른쪽 열이다(열 순서로 읽으면 DOM 순서와 같다).
- 행동 버튼은 560px 미만에서 세로로 쌓이고 그 이상은 가로 줄이다.

## Centered Hero

`layout:centered-hero` · 가운데 정렬 히어로. 행동 버튼은 좁으면 세로, 넓으면 가로이고 증거 지표는 열이 늘어난다.

- 부모 컨테이너: section(폭 narrow) — 히어로 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 sm 구간부터
- 밀도: comfortable·spacious(기본 spacious), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing / 페이지 유형: landing, pricing, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| copy (글) | 필수 | 1~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | 글 길이는 제한하지 않는다. |
| actions (행동) | 선택 | 0~2 | group:button | div | row [1,2,2,2] | wrap |
| proof (증거 지표) | 선택 | 2~4 | purpose:card.kpi | div | grid [1,2,3,4] | 지표 값은 줄바꿈한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `copy` / `actions` / `proof` |
| sm (560px~) | `minmax(0rem,40rem)` | `copy` / `actions` / `proof` |
| md (880px~) | `minmax(0rem,48rem)` | `copy` / `actions` / `proof` |
| lg (1180px~) | `minmax(0rem,56rem)` | `copy` / `actions` / `proof` |

**배치 규칙**

- 글·행동·증거는 항상 한 열로 가운데 정렬이고 폭 한도가 40·48·56rem으로 커진다.
- 행동은 560px 미만에서 세로, 그 이상은 가로이고 증거 지표 열 상한은 1·2·3·4다.

## Media Hero

`layout:media-hero` · 큰 시각 위에 글 패널이 겹친다. 좁으면 겹치지 않고 쌓는다.

- 부모 컨테이너: section(폭 wide) — 히어로 섹션 안쪽 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 spacious), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing, commerce / 페이지 유형: landing, portfolio, commerce, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| media (시각) | 필수 | 1~1 | purpose:card.gallery, purpose:card.product | div | stack | 시각은 전폭이고 자기 비율로 높이를 만든다. |
| copy (글 패널) | 필수 | 1~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | 패널은 글 길이만큼 늘고 시각을 가리는 높이는 끌어올린 값(5·8rem)으로 제한된다. |
| actions (행동) | 선택 | 0~2 | group:button | div | row [1,2,2,2] | wrap |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `media` / `copy` / `actions` |
| sm (560px~) | `minmax(0,1fr)` | `media` / `copy` / `actions` |
| md (880px~) | `minmax(0,1fr)` | `media` / `copy` / `actions` |
| lg (1180px~) | `minmax(0,1fr) minmax(0,4fr) minmax(0,1fr)` | `media media media` / `_ copy _` / `_ actions _` |

**배치 규칙**

- 글 패널은 880px 이상에서 위로 5rem(880px) 또는 8rem(1180px) 끌어올려 시각의 아래쪽과 겹친다(칸 간격을 빼면 실제 겹침은 약 56px·104px).
- 겹친 패널은 불투명한 표면 배경과 안쪽 여백을 가져 글 대비를 시각에 맡기지 않는다.
- 560px 미만과 560~879px는 겹치지 않고 시각 → 글 → 행동으로 쌓는다.

## Product Detail Layout

`layout:product-detail-layout` · 갤러리·상품 정보·구매 영역·상세·관련 상품. 넓으면 갤러리가 왼쪽 열을 차지하고 구매 영역이 위에 붙는다.

- 부모 컨테이너: main(폭 wide) — 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: commerce / 페이지 유형: commerce
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| gallery (갤러리) | 필수 | 1~1 | purpose:card.gallery, purpose:card.product | div | stack | 갤러리는 열 폭에 맞춰 자기 비율로 높이를 만든다. |
| info (상품 정보) | 필수 | 1~1 | purpose:card.product, purpose:card.pricing | div | stack | 긴 상품명은 줄바꿈한다. |
| buy (구매) | 필수 | 1~3 | group:button, group:form | div | row [1,1,1,1] · sticky | 구매 버튼은 열 폭을 채운다. |
| details (상세) | 선택 | 0~4 | group:card, group:feedback | div | stack | wrap |
| related (관련 상품) | 선택 | 2~4 | purpose:card.product | div | grid [1,2,3,4] | 칸은 같은 크기다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `gallery` / `info` / `buy` / `details` / `related` |
| sm (560px~) | `minmax(0,1fr) minmax(0,1fr)` | `gallery gallery` / `info buy` / `details details` / `related related` |
| md (880px~) | `minmax(0,1fr) minmax(0,1fr)` | `gallery info` / `gallery buy` / `details details` / `related related` |
| lg (1180px~) | `minmax(0,7fr) minmax(0,5fr)` | `gallery info` / `gallery buy` / `details details` / `related related` |

**배치 규칙**

- 구매 영역은 880px 이상에서 상세 스크롤 중에도 위에 붙는다(sticky).
- 관련 상품 열 상한은 1·2·3·4다. 갤러리 비율은 880px에서 1:1, 1180px에서 7:5다.

## Commerce Grid

`layout:commerce-grid` · 필터·도구줄·상품 격자. 880px 이상에서 필터가 왼쪽 열이 되고 상품은 최대 3열이다.

- 부모 컨테이너: main(폭 wide) — 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `gap`
- 적용 가능한 페이지 목적: commerce / 페이지 유형: commerce, listing
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| toolbar (도구줄) | 선택 | 0~2 | group:form, group:button | div | stack | wrap |
| filters (필터) | 선택 | 0~3 | group:form | aside | stack · sticky | 필터가 길면 열 안에서 줄바꿈한다. |
| products (상품) | 필수 | 2~12 | purpose:card.product | div | grid [1,2,2,3] | 상품명이 길면 줄바꿈하고 칸 높이는 같은 줄에서 같다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `toolbar` / `filters` / `products` |
| sm (560px~) | `minmax(0,1fr)` | `toolbar` / `filters` / `products` |
| md (880px~) | `minmax(14rem,16rem) minmax(0,1fr)` | `toolbar toolbar` / `filters products` |
| lg (1180px~) | `minmax(14rem,16rem) minmax(0,1fr)` | `toolbar toolbar` / `filters products` |

**배치 규칙**

- 필터는 880px 이상에서 14~16rem 왼쪽 열이고 위에 붙는다. 그보다 좁으면 상품 위에 쌓인다.
- 상품 열 상한은 1·2·2·3이다(필터 열을 뺀 폭 기준). 도구줄은 어느 폭에서도 상품 위 전폭이다.

## Settings Layout

`layout:settings-layout` · 설정 내비게이션·설정 구역·도움말. 좁으면 내비가 위에, 저장 영역이 아래에 붙는다.

- 부모 컨테이너: page-shell(폭 standard) — 셸 본문 영역
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `gap`
- 적용 가능한 페이지 목적: work-dashboard / 페이지 유형: settings, form, dashboard
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| nav (설정 내비) | 필수 | 1~1 | group:navigation | aside | stack · sticky | 설정 내비 항목이 길면 줄바꿈한다. |
| sections (설정 구역) | 필수 | 1~8 | group:form | div | stack | 구역이 길어도 높이를 제한하지 않는다. |
| help (도움말) | 선택 | 0~2 | group:card, group:feedback | aside | stack | wrap |
| actions (저장) | 선택 | 0~2 | group:button | div | row [2,2,2,2] · sticky | 저장 영역은 항상 보이고 버튼은 줄바꿈하지 않는다(최대 2개). |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `nav` / `sections` / `help` / `actions` |
| sm (560px~) | `minmax(0,1fr)` | `nav` / `sections` / `help` / `actions` |
| md (880px~) | `minmax(14rem,16rem) minmax(0,1fr)` | `nav sections` / `nav help` / `nav actions` |
| lg (1180px~) | `minmax(14rem,16rem) minmax(0rem,46rem) minmax(14rem,18rem)` | `nav sections help` / `nav actions help` |

**배치 규칙**

- 저장 영역은 880px 미만에서 화면 아래에 붙고(sticky bottom) 그 이상에서는 설정 구역 아래에 놓인다.
- 1180px 이상에서 도움말이 오른쪽 열이 된다. 설정 구역은 46rem을 넘지 않는다.

## Documentation Layout

`layout:documentation-layout` · 문서 내비·목차·본문. 넓은 폭에서 목차가 오른쪽으로 옮겨가고 본문은 읽기 폭으로 제한된다.

- 부모 컨테이너: page-shell(폭 wide) — 셸 본문 영역
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 lg 구간부터
- 밀도: compact·comfortable(기본 compact), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: editorial-docs / 페이지 유형: docs, article
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: lg

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| nav (문서 내비) | 필수 | 1~1 | group:navigation | aside | stack · sticky | 문서 내비 항목이 길면 줄바꿈한다. |
| toc (목차) | 선택 | 0~1 | group:navigation | aside | stack · sticky | 목차 항목이 길면 줄바꿈한다. |
| content (본문) | 필수 | 1~8 | purpose:card.article | div | stack | 긴 코드·표는 본문 안에서 넘치지 않는다(max-width: 100%). |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `nav` / `toc` / `content` |
| sm (560px~) | `minmax(0,1fr)` | `nav` / `toc` / `content` |
| md (880px~) | `minmax(14rem,16rem) minmax(0,1fr)` | `nav toc` / `nav content` |
| lg (1180px~) | `minmax(14rem,16rem) minmax(0rem,46rem) minmax(12rem,14rem)` | `nav content toc` |

**배치 규칙**

- 목차는 1180px 이상에서만 오른쪽 열이고, 그보다 좁으면 본문 앞에 쌓인다(DOM 순서).
- 본문은 46rem을 넘지 않는다. 1180px 이상은 내비·본문·목차가 가운데 정렬된다.

## Mobile Stack

`layout:mobile-stack` · 모바일 우선 쌓기. 행동 영역이 화면 아래에 붙고, 넓어지면 머리·본문·행동이 좁은 3열 띠가 된다.

- 부모 컨테이너: main(폭 narrow) — 본문 컨테이너
- 최소 콘텐츠 폭 240px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: commerce, work-dashboard / 페이지 유형: any
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| header (머리) | 선택 | 0~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | wrap |
| content (본문) | 필수 | 1~8 | group:card, group:table, group:form, group:feedback | div | grid [1,2,1,1] | 본문 항목은 한 열에서 길이를 제한하지 않는다. |
| actions (행동) | 선택 | 0~3 | group:button | div | row [1,2,1,1] · sticky | 행동 영역은 최대 3개이고 좁으면 세로로 쌓인다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `header` / `content` / `actions` |
| sm (560px~) | `minmax(0,1fr)` | `header` / `content` / `actions` |
| md (880px~) | `minmax(12rem,14rem) minmax(0rem,34rem)` | `header content` / `header actions` |
| lg (1180px~) | `minmax(14rem,16rem) minmax(0rem,36rem) minmax(18rem,22rem)` | `header content actions` |

**배치 규칙**

- 행동 영역은 880px 미만에서 화면 아래에 붙는다(sticky bottom).
- 본문은 560~879px에서 2열 타일이고 880px 이상에서는 34~36rem 한 열로 제한된다.
- 880~1179px는 머리가 왼쪽 띠, 1180px 이상은 머리·본문·행동이 3열이다.

## Sticky Action Layout

`layout:sticky-action-layout` · 본문과 요약, 항상 보이는 행동 영역. 좁으면 행동이 화면 아래 바, 넓으면 요약이 오른쪽에 붙는다.

- 부모 컨테이너: main(폭 wide) — 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: commerce, work-dashboard / 페이지 유형: commerce, form, settings, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: md, lg

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| content (본문) | 필수 | 1~8 | group:card, group:table, group:form, group:feedback | div | stack | 본문이 길어도 행동 영역은 보인다. |
| actions (행동) | 필수 | 1~3 | group:button | div | row [2,2,2,2] · sticky | 행동 버튼은 최대 3개이고 좁으면 줄바꿈한다. 영역은 항상 보인다. |
| summary (요약) | 필수 | 1~2 | group:card, group:feedback | aside | stack · sticky | 요약이 길면 열 안에서 줄바꿈한다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `content` / `actions` / `summary` |
| sm (560px~) | `minmax(0,1fr)` | `content` / `actions` / `summary` |
| md (880px~) | `minmax(0,1fr) minmax(18rem,22rem)` | `content summary` / `actions summary` |
| lg (1180px~) | `minmax(0,1fr) minmax(22rem,26rem)` | `content summary` / `actions summary` |

**배치 규칙**

- 행동 영역은 모든 폭에서 위치를 고정한다(sticky bottom): 좁으면 화면 아래 바, 880px 이상은 본문 열 아래 바.
- 요약은 880px 이상에서 오른쪽 열이고 위에 붙는다. 그보다 좁으면 행동 영역 뒤에 쌓인다.

## Form Layout

`layout:form-layout` · 소개·입력 필드·도움말·제출. 필드는 560px 이상에서 2열이고, 1180px 이상에서 소개와 도움말이 양옆으로 나간다.

- 부모 컨테이너: main(폭 standard) — 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: compact·comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: saas-landing, work-dashboard, commerce / 페이지 유형: form, auth, settings, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| intro (소개) | 선택 | 0~1 | purpose:card.feature, purpose:card.article, purpose:button.emphasis | div | stack | wrap |
| fields (입력) | 필수 | 1~12 | group:form | div | grid [1,2,2,2] | 긴 라벨은 줄바꿈하고 입력 폭은 칸 폭이다. |
| aside (도움말) | 선택 | 0~2 | group:feedback, purpose:card.status | aside | stack | wrap |
| actions (제출) | 필수 | 1~3 | group:button | div | row [1,2,2,2] | 제출 버튼은 좁으면 세로로 쌓인다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `intro` / `fields` / `aside` / `actions` |
| sm (560px~) | `minmax(0,1fr)` | `intro` / `fields` / `aside` / `actions` |
| md (880px~) | `minmax(0rem,44rem)` | `intro` / `fields` / `aside` / `actions` |
| lg (1180px~) | `minmax(12rem,14rem) minmax(0rem,42rem) minmax(12rem,14rem)` | `intro fields aside` / `_ actions _` |

**배치 규칙**

- 입력 필드 열 상한은 1·2·2·2이고 마지막 줄에 한 칸만 남기지 않는다(bestCols).
- 1180px 이상에서 소개가 왼쪽 열, 도움말이 오른쪽 열이 되고 제출은 입력 아래에 붙는다.

## Multi-step Form

`layout:multi-step-form` · 단계 표시줄·현재 단계 패널·요약·이전/다음. 단계 표시줄은 항상 위에, 요약은 넓은 폭에서 오른쪽에 붙는다.

- 부모 컨테이너: main(폭 wide) — 본문 컨테이너
- 최소 콘텐츠 폭 280px, 칸 최소 폭 200px, 핵심 배치는 md 구간부터
- 밀도: comfortable·spacious(기본 comfortable), 칸 사이 간격 `gap`, 항목 사이 간격 `item`
- 적용 가능한 페이지 목적: commerce, work-dashboard, saas-landing / 페이지 유형: form, commerce, auth, general
- 중첩: 없음 (깊이 1)
- 시각 순서가 DOM과 달라지는 구간: 없음

**슬롯 계약**(순서 = DOM 순서)

| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |
|---|---|---|---|---|---|---|
| steps (단계 표시줄) | 필수 | 1~1 | group:navigation, purpose:feedback.progress | div | stack | 단계 표시줄은 단계 이름이 길면 줄바꿈한다. |
| panel (현재 단계) | 필수 | 1~3 | group:form | div | stack | 현재 단계 패널은 높이를 제한하지 않는다. |
| summary (요약) | 선택 | 0~2 | group:card, group:feedback | aside | stack · sticky | wrap |
| actions (이전·다음) | 필수 | 1~3 | group:button | div | row [1,2,2,2] · sticky | 버튼은 좁으면 세로로 쌓인다. |

**폭 구간별 배치**

| 구간 | 트랙 | 영역 표 |
|---|---|---|
| xs (0px~) | `minmax(0,1fr)` | `steps` / `panel` / `summary` / `actions` |
| sm (560px~) | `minmax(0,1fr)` | `steps` / `panel` / `summary` / `actions` |
| md (880px~) | `minmax(0,1fr) minmax(14rem,18rem)` | `steps steps` / `panel summary` / `actions summary` |
| lg (1180px~) | `minmax(0,1fr) minmax(18rem,22rem)` | `steps steps` / `panel summary` / `actions summary` |

**배치 규칙**

- 단계 표시줄은 모든 폭에서 맨 위 전폭이다.
- 이전·다음은 880px 미만에서 화면 아래에 붙고 그 이상에서는 패널 아래에 놓인다.
- 요약은 880px 이상에서 오른쪽 열이고 위에 붙는다.

