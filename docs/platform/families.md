# 컴포넌트 패밀리 (W3)

기준은 [ADR 0012](../adr/0012-assembly-platform.md) §4와 [WBS](wbs.md) W3다. 표의 숫자는 `node scripts/families/doc-tables.mjs`가 코드와 측정 결과에서 다시 쓴다(`<!-- generated:… -->` 구간). 구간 밖의 글은 사람이 쓴다.

## 1. 구조: 두 축과 책임 나눔

사용자가 요구한 것은 size·variant·state 속성만 정의된 컴포넌트가 아니라, 목적마다 구조와 배치가 다른 완성형 코드다. 그래서 컴포넌트는 세 층으로 나눈다.

| 층 | 무엇을 소유하나 | 어디에 있나 |
|---|---|---|
| 기반 컴포넌트(`base-component`) | 계약 축, 상태 전이, 접근성 속성, 런타임(`attach*`), 셸 CSS | `src/materials/*.mjs`(2.6.0, 바이트 고정) |
| 시각 패밀리(`family:*`) | 시각 언어: 구성원별 고정 축(외형·모양), 모양(radius·elevation·motion), 전제 밀도, `--pf-*` 시각 값 | `src/platform/data/families.mjs`, `src/platform/families/visual.mjs` |
| 목적 패밀리(`purpose:<묶음>.<이름>`) | 마크업 구조와 배치: 어떤 기반 컴포넌트를 어떻게 묶고 재배치하나, 그 구조에만 필요한 마크업·CSS | `src/platform/families/*.mjs` |

시각 패밀리와 목적 패밀리는 **독립 축**이다. 둘의 곱(예: `purpose:card.pricing` × `family:bold`)이 렌더 단위이고, 곱 가운데 함께 쓰면 안 되는 쌍은 패밀리 단위로 이유와 함께 거부한다(§5).

중복을 피하는 방식은 다음과 같다.

- 목적 패밀리는 기반 컴포넌트를 복사하지 않는다. `ctx.base(id, {props, content})`로 렌더하고, 시각 패밀리 구성원 규칙(고정 축 잠금 `P_ATTR_LOCKED`, 열린 축, 계약 금지 조합 `P_REL_CONTRACT`)이 그대로 적용된다.
- 기반 컴포넌트로 표현되지 않는 안쪽 구조(KPI 값, 가격, 상태 칩, 표 셀 등)만 목적 패밀리가 마크업한다. 이때도 기반 컴포넌트가 읽는 모양을 지킨다. Card 계열은 `article.kit-ctl-card`의 data 속성 이름·순서를 그대로 두어 카드 셸 CSS와 `attachCard`가 같이 동작한다(`tests/platform-family-purpose.test.mjs`가 `renderCard`와 대조).
- 출력에 어떤 기반 컴포넌트가 쓰였는지는 마커(`BASE_MARKERS`)로 읽어 목적 패밀리가 선언한 자식(`children`)과 대조한다. 선언하지 않은 기반 컴포넌트가 나오면 `P_PURPOSE_CHILD`로 거부한다.
- 외형·모양은 시각 패밀리가 정한다. 목적 패밀리 CSS는 색과 서체를 직접 쓰지 않고 `var(--kit-*)`와 `var(--pf-*)`만 읽는다(테스트가 정규식으로 확인).

## 2. 기반 컴포넌트 10종

2.6.0 컨트롤 10종을 `BASE_COMPONENTS`와 `BASE_IMPLEMENTATIONS`에 등록했다(`src/platform/data/base-components.mjs`). 계약·렌더러·CSS는 기존 모듈의 같은 객체와 같은 문자열이다. 복사하지 않았고, 기존 컨트롤의 렌더·CSS·계약·재료 기록이 이전 커밋과 바이트가 같다는 것을 해시로 고정했다(`tests/platform-family-base.test.mjs`).

Select와 Table은 `Object.freeze`만 쓰던 계약을 `defineContract` 방식으로 다시 썼다(`selectControlContract`, `tableControlContract`). 2.6.0 카탈로그에 실리는 기존 `selectContract`·`tableContract`는 바이트 고정이라 건드리지 않았고, 두 계약이 같은 축·기본값·상태를 가진다는 것을 테스트가 본다. 새 계약은 외형·모양 축이 없는 컨트롤을 위해 `defineContract`의 필수 개념을 `required` 옵션으로 줄일 수 있게 했다(기본값은 기존과 같은 다섯 개념이라 나머지 8개 계약은 그대로다).

- Select의 `disabled`는 계약에서 `state` 값이라 `disabled + loading`·`disabled + error`는 축 조합으로 존재할 수 없다(구조적 금지). 남는 축 금지는 `SELECT_MULTI_ASYNC`뿐이다.
- Table은 행을 보이지 않는 상태(`empty`·`loading`·`error`)에서 정렬·선택이 의미가 없으므로 `TABLE_NO_ROWS_SORT`·`TABLE_NO_ROWS_SELECT`로 드러냈다. 렌더 출력은 그대로다.

의존은 기존 재료의 `dependencies`를 읽는다. Card의 footer actions → Button처럼 기반 컴포넌트가 다른 기반 컴포넌트에 의존하면 패밀리도 그 컴포넌트를 구성원으로 가져야 하고, 계산 관계 `family-requires`가 이것을 검사한다.

<!-- generated:base -->
| 기반 컴포넌트 | 계약(defineContract) | 축 수 | 허용 조합 / 전체 | 의존 | 출처 |
|---|---|---|---|---|---|
| base-component:button-control | component:button-control | 7 | 2704 / 5760 | 없음 | src/materials/button.mjs |
| base-component:card-surface | component:card-surface | 7 | 1485 / 4320 | component:button-control | src/materials/card.mjs |
| base-component:data-table | component:data-table | 5 | 66 / 120 | 없음 | src/materials/table.mjs |
| base-component:feedback-message | component:feedback-message | 9 | 3088 / 13824 | component:button-control | src/materials/feedback.mjs |
| base-component:input-control | component:input-control | 6 | 1404 / 2304 | 없음 | src/materials/input.mjs |
| base-component:modal-dialog | component:modal-dialog | 7 | 450 / 1152 | component:button-control, component:input-control | src/materials/modal.mjs |
| base-component:navigation-menu | component:navigation-menu | 8 | 480 / 1728 | 없음 | src/materials/navigation.mjs |
| base-component:select-control | component:select-control | 6 | 720 / 864 | 없음 | src/materials/select.mjs |
| base-component:tabs-control | component:tabs-control | 8 | 480 / 1152 | 없음 | src/materials/tabs.mjs |
| base-component:tooltip | component:tooltip | 8 | 960 / 1536 | component:button-control | src/materials/tooltip.mjs |
<!-- /generated:base -->

## 3. 시각 패밀리

네 개(quiet, soft, bold, editorial)이고 각각 10개 기반 컴포넌트를 모두 덮는다(요구는 3개 이상, 각 4개 이상). 고정 축은 그 시각 언어의 정체성(외형·모양)이고, 열린 축은 맥락이 정하는 것(크기·동작·상태)이다. Button의 외형은 강조 단계(기본·보조·강조)가 정하므로 열어 두고 모양만 고정한다. 단계별 외형은 `visual.mjs`의 `recipe`다.

<!-- generated:visual -->
| 시각 패밀리 | 한 줄 설명 | 모양(radius·elevation·motion) | 전제 밀도 | 덮는 기반 컴포넌트 | 고정 축 예(Card·Button·Navigation) |
|---|---|---|---|---|---|
| family:bold | 굵은 선과 각진 모서리, 딱딱한 그림자로 구획한다. 강한 대비와 큰 숫자가 필요한 화면용. | square·hard·lively | comfortable | 10/10 | card {"appearance":"elevated","shape":"square","footer":"none"}; button {"shape":"square"}; nav {"appearance":"block","shape":"square"} |
| family:editorial | 상자 대신 가는 선과 넓은 여백으로 구획한다. 읽기 중심 화면과 큰 제목용. | subtle·flat·none | spacious | 10/10 | card {"appearance":"flat","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"underline","shape":"soft"} |
| family:quiet | 외곽선과 여백으로 구획한다. 장식이 적고 정보 밀도가 높은 업무 화면용. | soft·outline·subtle | comfortable | 10/10 | card {"appearance":"outline","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"underline","shape":"soft"} |
| family:soft | 채운 면과 큰 모서리로 구획한다. 선이 거의 없어 부드럽고 친근한 화면용. | round·lifted·subtle | spacious | 10/10 | card {"appearance":"filled","shape":"round","footer":"none"}; button {"shape":"pill"}; nav {"appearance":"pill","shape":"pill"} |
<!-- /generated:visual -->

열린 축의 허용 조합 수(허용 / 전체). 허용은 `memberCombinations`가 기반 계약의 금지 조합을 빼고 센 값이다. 같은 기반 컴포넌트라도 시각 패밀리가 고정하는 축이 다르면 열린 조합 수가 다르다.

<!-- generated:openAxes -->
| 시각 패밀리 | button-control | card-surface | data-table | feedback-message | input-control | modal-dialog | navigation-menu | select-control | tabs-control | tooltip |
|---|---|---|---|---|---|---|---|---|---|---|
| family:bold | 884/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 64/192 | 240/288 | 32/128 | 160/256 |
| family:editorial | 936/1920 | 77/180 | 66/120 | 208/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:quiet | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:soft | 884/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
<!-- /generated:openAxes -->

## 4. 목적 패밀리 32종

필수 필드(`PURPOSE_FIELDS`): 목적·맥락, 어울리는 페이지 유형, 구성 기반 컴포넌트, 렌더 진입점, 변형과 기본값, 허용·금지 조합, 상태, 실제 상호작용, 반응형 동작, 접근성 조건, 사용 토큰(CSS에서 계산), 허용 부모·자식, 컴파일 가능한 예시, 검증 결과. 하나라도 빠지면 `validatePurposeFamily`가 거부한다.

<!-- generated:purpose -->
| 목적 패밀리 | 목적·맥락 | 기반 컴포넌트 | 변형 축 | 열린 기반 축 | 기본값 | 거부 규칙 |
|---|---|---|---|---|---|---|
| purpose:card.kpi | 핵심 지표 하나를 값·증감·추세로 보여 준다. 대시보드 상단 지표 줄에서 같은 높이로 나란히 놓인다. | card-surface | layout: stacked·inline; trend: none·spark | size: small·medium·large; behavior: static·link; state: default·loading·error·disabled | {"layout":"stacked","trend":"none","size":"medium","behavior":"static","state":"default"} | KPI_INLINE_SPARK |
| purpose:card.product | 상품 한 개를 이미지 자리·이름·가격·평점·담기 동작으로 보여 준다. 목록 격자에서 이미지 비율과 가격 줄이 맞는다. | card-surface, button-control | layout: vertical·horizontal; cta: none·button | size: small·medium·large; behavior: static·link·selectable; state: default·selected·loading·error·disabled | {"layout":"vertical","cta":"none","size":"medium","behavior":"link","state":"default"} | PRODUCT_NESTED_CTA, PRODUCT_SELECTED_NOT_SELECTABLE, PRODUCT_INERT_CTA, PRODUCT_HORIZONTAL_SMALL |
| purpose:card.article | 글 한 편을 분류·제목·요약·작성자·읽는 시간으로 보여 준다. 읽기 목록과 홈 피드에서 제목이 먼저 읽힌다. | card-surface | layout: stacked·split·text | size: small·medium·large; behavior: link·static; state: default·loading·error·disabled | {"layout":"stacked","size":"medium","behavior":"link","state":"default"} | ARTICLE_SPLIT_SMALL |
| purpose:card.feature | 제품 기능 하나를 아이콘·제목·설명으로 소개한다. 랜딩 페이지의 3~4열 기능 줄에서 같은 높이로 놓인다. | card-surface | align: start·center; icon: badge·plain | size: small·medium·large; behavior: static·link; state: default·loading·disabled | {"align":"start","icon":"badge","size":"medium","behavior":"static","state":"default"} | FEATURE_CENTER_LINK |
| purpose:card.profile | 사람 한 명을 아바타·이름·역할·상태·연락 동작으로 보여 준다. 팀 목록과 상세 사이드 패널에서 쓴다. | card-surface, button-control | layout: stacked·row; actions: none·buttons | size: small·medium·large; state: default·loading·error·disabled | {"layout":"stacked","actions":"none","size":"medium","state":"default"} | PROFILE_ROW_STATS, PROFILE_INERT_ACTIONS |
| purpose:card.pricing | 요금제 하나를 이름·가격·기간·포함 기능·신청 버튼으로 보여 준다. 요금제 비교 줄에서 가격과 버튼 위치가 모든 카드에서 같은 줄에 맞는다. | card-surface, button-control | emphasis: standard·featured | size: medium·large; state: default·selected·loading·disabled | {"emphasis":"standard","size":"medium","state":"default"} | PRICING_SELECTED_STATIC, PRICING_INERT_CTA |
| purpose:card.status | 시스템·작업·결제 같은 대상의 상태를 아이콘·상태 글자·세부 내용·시각으로 보여 준다. 상태 대시보드 격자에서 쓴다. | card-surface | tone: success·warning·danger·info·neutral; layout: compact·detailed | size: small·medium·large; behavior: static·link; state: default·loading·error·disabled | {"tone":"success","layout":"detailed","size":"medium","behavior":"static","state":"default"} | STATUS_COMPACT_DETAIL, STATUS_DANGER_DISABLED |
| purpose:card.gallery | 이미지 묶음 한 개를 타일 격자와 제목·개수로 보여 준다. 앨범·컬렉션 목록과 이미지 선택 화면에서 쓴다. | card-surface | layout: grid·mosaic; tiles: view·select | size: small·medium·large; behavior: static·link; state: default·loading·error·disabled | {"layout":"grid","tiles":"view","size":"medium","behavior":"static","state":"default"} | GALLERY_LINK_SELECT, GALLERY_MOSAIC_SMALL, GALLERY_SELECT_LOADING |
| purpose:button.primary | 화면의 주 동작 하나(저장, 다음, 확인)를 맨 앞에 두고 취소 같은 보조 동작을 곁들인다. 폼 하단과 카드 하단에서 쓴다. | button-control | layout: single·pair·stack; align: start·end | size: small·medium·large; state: default·loading·disabled | {"layout":"single","align":"start","size":"medium","state":"default"} | BTN_PRIMARY_STACK_END |
| purpose:button.secondary | 주 동작 곁에 놓이는 낮은 강조 동작(내보내기, 더 보기, 필터 초기화)을 아이콘과 함께 한 줄로 늘어놓는다. 툴바와 카드 머리에서 쓴다. | button-control | layout: single·row; tier: secondary·tertiary | size: small·medium·large; state: default·disabled | {"layout":"row","tier":"secondary","size":"medium","state":"default"} | BTN_SECONDARY_SINGLE_TIER |
| purpose:button.emphasis | 페이지에서 가장 먼저 눌러야 할 동작 하나를 문구·보조 설명과 함께 크게 보인다. 랜딩 히어로와 구독 유도 영역에서 쓴다. | button-control | layout: inline·banner | size: medium·large | {"layout":"inline","size":"large"} | BTN_EMPHASIS_BANNER_MEDIUM |
| purpose:button.destructive | 되돌릴 수 없는 동작(삭제, 탈퇴, 초기화)을 취소와 함께 두고, 결과를 안내하는 글을 붙인다. 위험 동작은 주 동작보다 앞에 놓지 않는다. | button-control | guard: note·none; layout: pair·stack | size: small·medium·large; state: default·loading·disabled | {"guard":"note","layout":"pair","size":"medium","state":"default"} | BTN_DESTRUCTIVE_NO_NOTE_STACK, BTN_DESTRUCTIVE_LOADING_NOTE |
| purpose:button.icon | 글자 없이 아이콘만으로 동작을 나열한다(복사, 편집, 더보기). 좁은 머리줄과 표 행 끝에서 쓰며, 모든 버튼은 접근 가능한 이름을 가진다. | button-control | layout: toolbar·attached | size: small·medium·large; state: default·disabled | {"layout":"toolbar","size":"medium","state":"default"} | 없음 |
| purpose:button.loading | 요청을 보내는 동안 버튼의 크기를 바꾸지 않고 진행 중임을 알린다. 저장·결제·업로드처럼 응답을 기다리는 동작에서 쓴다. | button-control | phase: loading·idle·compare; tier: primary·secondary | size: small·medium·large | {"phase":"loading","tier":"primary","size":"medium"} | 없음 |
| purpose:button.toggle | 켜짐·꺼짐이 남는 선택(즐겨찾기, 보기 방식, 필터 칩)을 aria-pressed 버튼으로 보인다. 단일 토글과 여러 개를 묶은 그룹이 있다. | button-control | layout: single·group | size: small·medium·large; state: default·pressed·disabled | {"layout":"single","size":"medium","state":"default"} | BTN_TOGGLE_GROUP_PRESSED |
| purpose:navigation.sidebar | 서비스의 주요 구역을 세로 목록으로 늘어놓고 현재 위치를 보인다. 대시보드·관리 화면의 왼쪽 고정 영역에서 쓰며 640px 이하에서는 머리만 남기고 접힌다. | navigation-menu | density: default·compact; footer: none·links | size: small·medium·large; icons: none·start | {"density":"default","footer":"none","size":"medium","icons":"none"} | 없음 |
| purpose:navigation.topbar | 브랜드, 가로 메뉴, 우측 주요 동작(로그인·시작하기)을 한 줄 머리로 묶는다. 랜딩·콘텐츠·대시보드 페이지 맨 위에서 쓰며 640px 이하에서는 메뉴가 토글 뒤로 접힌다. | navigation-menu, button-control | actions: none·buttons; sticky: static·sticky | size: small·medium; icons: none·start | {"actions":"buttons","sticky":"static","size":"medium","icons":"none"} | TOPBAR_STICKY_TRANSPARENT |
| purpose:navigation.tabs | 같은 대상의 관점(개요·작업·파일)을 한 자리에서 바꿔 보여 준다. 패널 머리(제목·설명)와 탭별 개수 배지를 곁들여 상세 화면과 설정 화면에서 쓴다. | tabs-control | layout: top·side; counts: none·badge | size: small·medium·large; activation: automatic·manual; icons: none·start; state: ready·loading | {"layout":"top","counts":"none","size":"medium","activation":"automatic","icons":"none","state":"ready"} | TABS_SIDE_SEGMENTED |
| purpose:navigation.bottom | 모바일 화면 맨 아래에서 주요 3~5개 구역을 아이콘 위·라벨 아래 칸으로 바꿔 누르게 한다. 엄지가 닿는 자리라 항목마다 44px 이상의 터치 칸을 갖는다. | navigation-menu | position: static·sticky | size: small·medium | {"position":"static","size":"medium"} | needs.visual {"opaqueSurface":true} |
| purpose:form.search | 검색어 하나(필요하면 범위 선택)를 받아 제출한다. 머리줄과 목록 위에서 쓰며 inline은 한 줄, stacked는 세로로 쌓는다. | input-control, button-control, select-control | layout: inline·stacked; scope: none·select | size: small·medium·large; state: default·disabled | {"layout":"inline","scope":"none","size":"medium","state":"default"} | 없음 |
| purpose:form.auth | 로그인 또는 가입 정보를 받는다. 제목, 입력 2~3개, 오류 안내, 전체 폭 제출 버튼, 보조 링크 순서로 쌓여 가운데에 놓인다. | input-control, button-control, feedback-message | mode: login·signup; error: none·shown | size: small·medium·large | {"mode":"login","error":"none","size":"medium"} | 없음 |
| purpose:form.settings | 계정·알림 같은 설정을 구역별로 나눠 바꾼다. 구역 제목·설명이 왼쪽, 컨트롤이 오른쪽에 놓이는 행으로 읽히고 맨 아래에서 저장·취소한다. | input-control, select-control, button-control | layout: rows·cards | size: small·medium·large | {"layout":"rows","size":"medium"} | 없음 |
| purpose:form.filter | 목록·표를 좁히는 조건을 선택 여러 개와 토글 칩으로 고르고 적용·초기화한다. 적용된 조건 수와 결과 건수를 안내한다. | select-control, button-control | layout: bar·panel; chips: none·toggles | size: small·medium·large | {"layout":"bar","chips":"none","size":"medium"} | 없음 |
| purpose:form.group | 입력 칸 앞이나 뒤에 단위·주소 같은 애드온 또는 제출 버튼을 한 테두리로 이어 하나의 컨트롤처럼 보인다. 도메인·금액·구독 입력에서 쓴다. | input-control, button-control | addon: prefix·suffix·button | size: small·medium·large; kind: text·email·number; state: default·error·disabled | {"addon":"prefix","size":"medium","kind":"text","state":"default"} | GROUP_EDITORIAL |
| purpose:table.business | 주문·결재·고객 같은 업무 목록을 선택(체크박스)·정렬(머리글 버튼)·상태 칩으로 다루는 표다. 툴바에 제목과 선택 건수, 선택 항목 일괄 동작을 둔다. | data-table, button-control | toolbar: none·bulk | density: comfortable·spacious; state: ready·partial·empty·loading·error; sortable: true·false; selectable: true·false; responsive: scroll·priority | {"toolbar":"bulk","density":"comfortable","state":"ready","sortable":true,"selectable":true,"responsive":"scroll"} | BUSINESS_NO_ROWS_SORT, BUSINESS_NO_ROWS_SELECT, BUSINESS_BULK_NO_SELECT |
| purpose:table.analytic | 채널·상품별 수치를 비교한다. 숫자 열은 오른쪽 정렬이고 전월 대비 증감(아이콘+부호+글자), 인라인 막대(값 글자 병기), 합계 행을 갖고 머리글은 스크롤해도 고정된다. | data-table | summary: none·footer; bars: none·inline | density: comfortable·spacious; state: ready·partial·empty·loading·error; sortable: true·false | {"summary":"footer","bars":"inline","density":"comfortable","state":"ready","sortable":true} | ANALYTIC_NO_ROWS_SORT, ANALYTIC_NO_ROWS_SUMMARY |
| purpose:table.dense | 로그·재고·작업 큐처럼 한 화면에 행을 많이 보려는 표다. 셀 패딩을 최소로 줄이고 숫자는 모노·tabular-nums, 상태는 점 + 글자 약식으로 보인다. 줄무늬와 고정 머리를 켤 수 있다. | data-table | zebra: off·on; stickyHead: off·on | state: ready·partial·empty·loading·error; sortable: true·false; selectable: false·true | {"zebra":"on","stickyHead":"on","state":"ready","sortable":true,"selectable":false} | DENSE_NO_ROWS_SORT, DENSE_NO_ROWS_SELECT, needs.visual {"maxCellPadY":8} |
| purpose:feedback.confirm | 되돌리기 어려운 동작 앞에서 사용자의 확인을 받는다. 위험 확인(danger)은 취소가 첫 포커스를 받고, 일반 확인은 제목이 받는다. | modal-dialog, button-control | tone: neutral·danger; form: dialog·sheet; display: preview·trigger | size: small·medium·large | {"tone":"neutral","form":"dialog","display":"preview","size":"medium"} | CONFIRM_SHEET_SIZE |
| purpose:feedback.error | 실패를 원인과 다음 행동(재시도·문의)과 함께 알린다. 화면 위쪽 배너나 대화상자의 오류 상태로 낸다. | feedback-message, modal-dialog, button-control | form: banner·dialog; retry: button·none | size: small·medium·large | {"form":"banner","retry":"button","size":"medium"} | ERROR_DIALOG_NO_RETRY |
| purpose:feedback.warning | 실패는 아니지만 확인이 필요한 상황(만료 임박, 용량 부족, 되돌릴 수 없는 변경 예고)을 알린다. 인라인 안내나 확인이 필요한 대화상자로 낸다. | feedback-message, modal-dialog, button-control | form: inline·dialog; ack: none·button | size: small·medium·large | {"form":"inline","ack":"button","size":"medium"} | WARNING_DIALOG_NO_ACK |
| purpose:feedback.progress | 시간이 걸리는 작업(업로드, 가져오기, 배포)의 진행을 막대·단계 목록·취소와 함께 보인다. 사용자가 언제 끝나는지와 취소할 수 있는지를 안다. | feedback-message, button-control | kind: determinate·indeterminate·steps; cancel: button·none | size: small·medium·large | {"kind":"determinate","cancel":"button","size":"medium"} | 없음 |
| purpose:feedback.result | 작업이 끝난 뒤 결과(완료, 실패, 확인 중)를 한 화면 분량으로 알리고 다음 행동을 둔다. 결제 완료, 가입 완료, 신청 접수 화면에서 쓴다. | button-control | outcome: success·failure·pending; layout: page·inline | size: medium·large | {"outcome":"success","layout":"page","size":"large"} | 없음 |
<!-- /generated:purpose -->

상태·상호작용·반응형·접근성·부모·진입점은 다음과 같다.

<!-- generated:fields -->
| 목적 패밀리 | 상태 | 실제 상호작용 | 반응형 | 접근성 조건(요약) | 허용 부모 | 렌더 진입점 |
|---|---|---|---|---|---|---|
| purpose:card.kpi | default, hover, focus, active, loading, error, disabled | link: click·Enter → 카드 전체가 하나의 링크 대상(늘린 링크) / hover·focus → 배경·외곽선 변화(기반 카드) / loading → 값 자리에 스켈레톤, aria-busy | container container 220px: 값 글자는 컨테이너 너비(cqi)에 맞춰 줄고 줄바꿈하지 않는다. 640px 이하에서 inline 배치는 stacked로 접힌다. | article(+link 시 stretched link); 증감은 아이콘과 숨은 글(증가·감소)로도 전달한다(색만으로 구분하지 않는다); 추세선은 role=img와 요약 라벨; 값은 한 줄로 읽히며 단위는 값과 함께 읽힌다 | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardKpi |
| purpose:card.product | default, hover, focus, active, loading, error, disabled, selected | link: click·Enter → 상품 상세로 이동(늘린 링크) / selectable: Space·Enter → 선택 토글(aria-pressed), 체크 표시 [attachCard] / cta: click → 담기 버튼(기반 버튼) | viewport+container 640px: 640px 이하에서 horizontal은 vertical로 쌓인다. 이미지 자리는 4:3 비율을 유지한다. | article; 평점은 숫자 글로도 제공(별 아이콘은 장식); 원가는 <s>와 숨은 글(정가)로 구분; 가격은 줄바꿈하지 않는다 | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardProduct |
| purpose:card.article | default, hover, focus, active, loading, error, disabled | link: click·Enter → 기사로 이동(제목이 링크, 카드 전체가 대상) / hover·focus → 제목 밑줄과 배경 변화 | viewport 640px: 640px 이하에서 split은 stacked로 쌓인다. 제목은 keep-all로 줄바꿈한다. | article; 날짜는 <time datetime>; 이미지 자리는 장식(aria-hidden); 요약은 3줄로 자르되 전체 글은 DOM에 남긴다(line-clamp) | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardArticle |
| purpose:card.feature | default, hover, focus, active, loading, disabled | link: click·Enter → 기능 상세로 이동 / hover·focus → 배경 변화(링크일 때만) | viewport 640px: 격자 열 수는 부모가 정한다. 카드는 한 열에서도 아이콘·제목·설명이 세로로 유지된다. | article; 아이콘은 장식(aria-hidden)이며 의미는 제목이 전달; 제목은 h3 | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardFeature |
| purpose:card.profile | default, loading, error, disabled | buttons: click → 연락·팔로우 같은 동작(기반 버튼) / presence → 상태 점과 글자로 온라인·자리비움·오프라인을 함께 표시 | container container 260px: row는 컨테이너가 좁아지면 stacked로 접힌다. 이메일은 말줄임 없이 줄바꿈한다. | article; 아바타 이니셜은 aria-hidden, 이름이 접근 가능한 이름; 상태는 색 점만이 아니라 글자로도 전달; 통계는 dl/dt/dd | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardProfile |
| purpose:card.pricing | default, hover, focus, loading, disabled | cta: click → 신청(기반 버튼). featured는 solid, 나머지는 secondary / features → 체크 아이콘 목록(정적) | viewport 640px: 부모 격자가 열 수를 정한다. 카드 안에서 가격 줄은 줄바꿈하지 않고 버튼은 바닥에 붙는다. | article + ul; 기능 목록은 ul/li, 체크 아이콘은 장식; 추천 배지는 글자로 전달; 가격과 기간은 함께 읽힌다(월·연 단위) | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardPricing |
| purpose:card.status | default, hover, focus, active, loading, error, disabled | link: click·Enter → 상세 로그로 이동 / loading → 상태 확인 중 스켈레톤(role=status) | container container 240px: 컨테이너가 좁아지면 시각 줄이 아래로 내려간다. 상태 글자는 줄바꿈하지 않는다. | article; 상태는 아이콘 모양과 글자로 전달한다(색만으로 구분하지 않는다); danger는 role=status가 아니라 일반 텍스트(자동 낭독 폭주 방지); 시각은 <time> 또는 상대 표현과 함께 | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardStatus |
| purpose:card.gallery | default, hover, focus, active, loading, error, disabled | select: Space → 타일 체크박스 토글(네이티브 input, :checked로 표시) / link: click·Enter → 앨범으로 이동 | container container 280px: 타일 격자는 3열이며 컨테이너가 280px 아래로 줄면 2열이 된다. 타일은 정사각형을 유지한다. | article + group; 타일은 이미지 자리이고 각 타일에 이름(label)이 있다; 선택은 체크박스의 checked와 체크 아이콘으로 전달한다; 타일 그룹 role=group + 제목 연결 | slot:main, slot:grid-item, slot:aside | src/platform/families/card.mjs#renderCardGallery |
| purpose:button.primary | default, hover, focus, active, loading, disabled | click·Enter·Space → 주 동작 실행(기반 버튼 attachButton) / pair → 보조 버튼은 같은 크기·같은 높이의 보조 외형 | viewport 640px: pair는 640px 이하에서 세로로 쌓이고 주 동작이 위에 온다(DOM 순서 그대로 위에서 아래로). 버튼은 전체 폭이 된다. | group; 버튼 이름은 동사로 시작; 그룹에는 aria-label이 없어도 되지만 폼 안에서는 폼 제목과 연결된다; 포커스 링 3:1 이상 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonPrimary |
| purpose:button.secondary | default, hover, focus, active, disabled | click·Enter·Space → 각 버튼의 동작(기반 버튼) / hover·focus → 외곽선·배경 변화 | viewport 640px: row는 줄바꿈된다(flex-wrap). 버튼 높이와 글자 크기는 모두 같다. | group; 아이콘은 라벨 옆 장식; 비활성은 disabled 속성과 대비 3:1 표시 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonSecondary |
| purpose:button.emphasis | default, hover, focus, active | click·Enter·Space → 핵심 동작 실행(기반 버튼) / hover → 배경 한 단계 어둡게(action-hover) | viewport 640px: 배너는 640px 이하에서 문구 위, 버튼 아래로 쌓이고 버튼은 전체 폭이 된다. | group (+ banner는 section); 버튼 대비 4.5:1; 보조 설명은 aria-describedby로 버튼과 연결 | slot:main, slot:header, slot:footer | src/platform/families/button.mjs#renderButtonEmphasis |
| purpose:button.destructive | default, hover, focus, active, loading, disabled | click·Enter·Space → 위험 동작 실행(기반 버튼, tone=danger) / loading → 진행 중에는 클릭 차단, 포커스 유지(aria-disabled) | viewport 640px: 640px 이하에서 세로로 쌓이고 취소가 위, 위험 버튼이 아래 전체 폭이다. | group; 위험 동작의 결과를 안내 글이 설명하고 aria-describedby로 연결; 위험 의미는 색만이 아니라 문구(삭제·영구)로 전달; 대비 4.5:1 | slot:main, slot:footer, slot:overlay | src/platform/families/button.mjs#renderButtonDestructive |
| purpose:button.icon | default, hover, focus, active, disabled | click·Enter·Space → 각 아이콘 동작 / hover·focus → 배경 변화, 포커스 링 | viewport 640px: 버튼은 정사각형 터치 영역(최소 44px 변)을 유지한다. 줄이 모자라면 줄바꿈한다. | toolbar; 모든 아이콘 버튼에 aria-label(필수, BTN_ICON_NAME); 툴바에 aria-label; 아이콘만으로 의미가 모호하면 Tooltip과 함께 쓴다 | slot:header, slot:main, slot:grid-item | src/platform/families/button.mjs#renderButtonIcon |
| purpose:button.loading | default, loading, hover, focus | loading → 스피너가 시작 자리를 채우고 클릭만 막는다(aria-disabled). 포커스는 유지된다 [attachButton] / compare → 대기와 로딩을 나란히 놓아 두 상태의 크기가 같음을 확인한다 | viewport -: 라벨은 줄바꿈하지 않는다. 대기·로딩 버튼은 최소 폭(9em)을 같이 쓰고, compare는 같은 폭의 두 칸이라 상태가 바뀌어도 폭이 흔들리지 않는다. | button (aria-busy, aria-disabled); 진행 안내는 role=status 숨은 글(처리 중입니다); 진행 중 라벨을 바꾸더라도 버튼 이름은 동작을 설명 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonLoading |
| purpose:button.toggle | default, pressed, hover, focus, active, disabled | click·Space·Enter → aria-pressed 전환, onPress 콜백 [attachButton] / group → 항목이 독립 토글(복수 선택). 단일 선택 라디오와 다르다 | viewport 640px: 그룹은 줄바꿈된다. 눌림 상태는 색만이 아니라 아이콘(check)과 aria-pressed로 전달한다. | button[aria-pressed] (group은 role=group + aria-label); pressed 상태는 aria-pressed로 전달; 라벨은 상태가 바뀌어도 같다(상태를 라벨에 넣지 않는다) | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonToggle |
| purpose:navigation.sidebar | default, hover, focus, active, current, disabled | link click → 쪽 안 링크면 현재 위치(aria-current)가 눌린 항목으로 옮겨진다 [attachNavigation] / ≤640px summary click·Enter·Space → 접힌 메뉴 영역을 연다(네이티브 details/summary, 스크립트 없음). 641px 이상에서는 항상 펼쳐져 있다 | viewport 640px: 641px 이상은 폭 18rem 이내의 세로 목록이다. 640px 이하는 전체 폭 머리줄(브랜드 + 메뉴 열기 버튼)만 보이고 메뉴는 details 안에 접힌다. ::details-content를 모르는 브라우저는 모든 폭에서 열기 버튼이 보인다. | complementary > navigation; 현재 위치는 aria-current=page(색만이 아니라 기반 메뉴의 굵기·표시); 터치 대상은 브랜드·열기 버튼 44px 이상; 메뉴 이름(aria-label)이 필수; 아이콘은 장식(aria-hidden) | slot:aside, slot:main | src/platform/families/navigation.mjs#renderNavigationSidebar |
| purpose:navigation.topbar | default, hover, focus, active, current, disabled | ≤640px toggle click·Enter·Space → 메뉴 목록을 머리 아래 패널로 열고 닫는다(aria-expanded) [attachNavigation] / Escape·바깥 클릭·링크 클릭 → 열린 메뉴를 닫고 Escape는 토글로 포커스를 돌려준다 [attachNavigation] / link click → 쪽 안 링크면 aria-current가 옮겨진다 [attachNavigation] / sticky → sticky 변형은 스크롤해도 화면 위에 남는다(position:sticky) | viewport 640px: 641px 이상은 브랜드 \| 메뉴 \| 우측 동작이 한 줄이다. 640px 이하는 브랜드 + 메뉴 토글이 첫 줄, 동작 버튼이 둘째 줄(같은 너비)이고 메뉴 목록은 머리 아래 패널로 열린다. | banner > navigation; 토글은 aria-expanded·aria-controls; 현재 위치 aria-current=page; 메뉴와 버튼은 같은 size라 같은 줄에서 높이가 같다; 터치 대상 44px 이상(브랜드·토글) | slot:header | src/platform/families/navigation.mjs#renderNavigationTopbar |
| purpose:navigation.tabs | ready, loading, selected, unselected, hover, focus, active, disabled | click → 눌린 탭이 선택되고 해당 패널만 보인다 [attachTabs] / ArrowLeft·ArrowRight(side는 ArrowUp·ArrowDown)·Home·End → 탭 사이 포커스 이동(roving tabindex), automatic은 포커스가 곧 선택, manual은 Enter·Space로 선택 [attachTabs] | viewport 640px: side는 640px 이하에서 가로 줄로 눕고 그 줄 안에서만 스크롤한다. 탭 목록이 폭을 넘으면 목록 안에서만 가로 스크롤하고 쪽은 넘치지 않는다. | tablist > tab + tabpanel; 선택은 aria-selected(색만이 아니라 기반 탭의 표시 방식); 개수 배지는 숫자 글자이고 숨은 글 "개"가 붙는다; 패널 머리 제목이 탭 목록의 이름이 된다; loading은 패널 aria-busy와 role=status | slot:main, slot:grid-item | src/platform/families/navigation.mjs#renderNavigationTabs |
| purpose:navigation.bottom | default, hover, focus, active, current, disabled | link click → 쪽 안 링크면 aria-current가 눌린 칸으로 옮겨진다 [attachNavigation] / sticky → sticky 변형은 스크롤해도 본문 아래에 붙어 있다(position:sticky; bottom:0) | viewport 640px: 640px 이하는 전체 폭 바이고 모서리가 없다. 641px 이상은 32rem 폭의 정적 바로 가운데에 놓인다. 칸은 균등 폭이며 라벨은 줄바꿈된다. 하단 안전 영역(safe-area)만큼 아래 여백이 더해진다. | navigation; 모든 칸에 아이콘과 라벨(아이콘만으로 구분하지 않는다); 칸 높이 56px(터치 44px 이상); 현재 위치 aria-current=page; 바깥 셸은 landmark를 만들지 않고 기반 메뉴가 navigation을 맡는다 | slot:footer | src/platform/families/navigation.mjs#renderNavigationBottom |
| purpose:form.search | default, hover, focus, error, disabled | Enter·검색 버튼 click → role=search 폼을 제출한다(네이티브 submit, 범위 선택은 hidden input으로 함께 전달) / 지우기 버튼·Escape → 입력값을 지우고 포커스를 칸에 돌려준다 [attachInput] / scope 선택 click·ArrowDown·Enter → 범위 목록 열기, 방향키·Enter·Escape [attachSelect] | viewport 640px: inline은 [범위 \| 검색 칸 \| 버튼] 한 줄이고 640px 이하에서 범위 선택이 윗줄로 올라간다(검색 칸과 버튼은 한 줄 유지). stacked는 어느 폭에서도 세로 한 열이고 버튼은 전체 폭이다. | search (form); inline은 칸 이름을 시각적으로만 숨기고(.pf-sr) 접근 가능한 이름은 유지한다; 검색 칸·선택·버튼은 같은 size라 같은 줄에서 높이가 같다; 검색어 지우기 버튼은 접근 가능한 이름을 가진다(기반 입력) | slot:header, slot:main, slot:aside | src/platform/families/form.mjs#renderFormSearch |
| purpose:form.auth | default, hover, focus, error, disabled, error-summary | Enter·제출 버튼 click → 폼을 제출한다(네이티브 submit) / 비밀번호 표시 버튼 click → aria-pressed로 비밀번호를 보이고 숨긴다 [attachInput] / blur → 네이티브 제약 검사로 칸별 오류를 표시한다(required·type=email) [attachInput] | viewport 640px: 폭이 26rem 이내인 한 열이라 좁은 화면에서는 컨테이너 폭으로 줄어든다. 보조 링크는 줄바꿈된다. | form (aria-labelledby 제목); 오류 요약은 role=alert이고 문제 칸에는 aria-invalid와 칸별 메시지가 있다; 모든 칸에 보이는 라벨(자리 표시자는 라벨을 대신하지 못한다); 보조 링크는 터치 44px 이상; 제출 버튼은 전체 폭 | slot:main | src/platform/families/form.mjs#renderFormAuth |
| purpose:form.settings | default, hover, focus, error, disabled | 저장 버튼 click·Enter → 폼을 제출한다(네이티브 submit, 선택 값은 hidden input으로 전달) / blur → 입력 칸의 네이티브 제약 검사 결과를 칸 아래에 표시한다 [attachInput] / select click·방향키 → 선택 목록 열기·이동·확정 [attachSelect] | viewport 640px: rows는 [설명 1fr \| 컨트롤 2fr] 두 열이고 640px 이하에서 한 열(설명 위, 컨트롤 아래)로 쌓인다. cards는 항상 한 열이다. 저장·취소는 640px 이하에서 전체 폭으로 쌓이고 저장이 위에 온다. | form > group(구역); 구역은 role=group이고 제목·설명과 aria-labelledby·aria-describedby로 연결된다; 모든 칸에 보이는 라벨; 입력·선택·버튼은 같은 size라 높이가 같다; 구역 제목과 컨트롤 사이 간격은 구역마다 같다 | slot:main | src/platform/families/form.mjs#renderFormSettings |
| purpose:form.filter | default, hover, focus, pressed, open | 선택 click·방향키·Enter → 조건 목록 열기·이동·확정 [attachSelect] / 칩 click·Space·Enter → aria-pressed 전환(복수 선택) [attachButton] / 적용 버튼 click → 폼을 제출한다(네이티브 submit, 선택 값은 hidden input으로 전달) / 초기화 버튼 click → 앱이 onPress 콜백으로 조건을 비운다(선택 칸의 표시 문구는 앱이 갱신한다) [attachButton] | viewport 640px: bar는 한 줄(줄바꿈 허용)이고 640px 이하에서 선택이 한 열, 적용·초기화는 전체 폭 두 칸이 된다. panel은 선택을 격자(최소 12rem 칸)로 놓고 칩·버튼을 아래 줄에 둔다. | form(aria-label) > group(칩); 적용 건수 안내는 role=status(aria-live polite); 칩 그룹은 role=group과 이름을 가진다; 칩의 눌림은 aria-pressed(색만이 아니라 기반 버튼의 테두리 변화); 선택·칩·버튼은 같은 size라 같은 줄에서 높이가 같다 | slot:main, slot:header | src/platform/families/form.mjs#renderFormFilter |
| purpose:form.group | default, hover, focus, error, disabled | 입력 포커스 → 칸 테두리가 포커스 색으로 바뀌고 윤곽선이 이어 붙은 조각 위에 놓인다 / addon=button 버튼 click → 앱이 onPress 콜백으로 처리한다 [attachButton] / blur → 네이티브 제약 검사 결과를 그룹 아래에 표시한다 [attachInput] | fluid -: 입력 칸이 남는 폭을 채우고(min-width:0) 애드온·버튼은 글자 폭만 차지한다. 애드온 글자는 줄바꿈하지 않는다. | group(aria-labelledby 라벨); 라벨은 그룹과 입력에 모두 연결된다(그룹 aria-labelledby, 입력 label for); 애드온 글자는 입력의 aria-describedby에 연결되어 "https:// " 같은 문맥이 읽힌다; 아이콘 애드온은 장식(aria-hidden); 입력·애드온·버튼은 같은 size라 높이가 같다 | slot:main, slot:aside, slot:grid-item | src/platform/families/form.mjs#renderFormGroup |
| purpose:table.business | ready, partial, empty, loading, error, sorted, selected, hover, focus | 머리글 버튼 click·Enter·Space → 그 열로 정렬하고 같은 버튼을 다시 누르면 방향이 바뀐다(머리글 aria-sort, 숫자 열은 크기순) [attachTable] / 행 체크박스·전체 선택 change → 행 선택과 전체 선택을 전환한다(선택된 행은 data-selected 배경으로 표시) [attachTable] / 행 선택 변경 → 툴바의 선택 건수가 갱신되고 일괄 동작 버튼은 선택이 있을 때만 나타난다(CSS :has와 카운터, 스크립트 없음) / 일괄 동작 버튼 click → 앱이 onPress 콜백으로 선택된 행(attachTable의 selectionChange)에 적용한다 [attachButton] | container+viewport 640px,800px: 표는 .kit-table-scroll 안에서만 가로 스크롤한다. responsive=priority는 hideBelow가 지정된 열을 숨기고 640px 이하에서 셀에 열 이름을 함께 보인다. 툴바는 640px 이하에서 제목 → (건수·동작) 두 줄이 된다. | table(region 안, 영역 이름은 title); 정렬 방향은 머리글 aria-sort와 화살표 글자로 전달한다; 상태는 색 + 글자 + 아이콘 칩이다(색만으로 전달하지 않는다); 행 체크박스는 첫 열 값으로 이름이 붙는다("A-1042 선택"); 숫자 열은 오른쪽 정렬, tabular-nums, 줄바꿈하지 않는다 | slot:main, slot:grid-item | src/platform/families/table.mjs#renderTableBusiness |
| purpose:table.analytic | ready, partial, empty, loading, error, sorted, selected, hover, focus | 머리글 버튼 click·Enter·Space → 그 열로 정렬하고 같은 버튼을 다시 누르면 방향이 바뀐다(머리글 aria-sort, 숫자 열은 크기순) [attachTable] / scroll → 표 영역을 세로로 스크롤해도 머리글이 위에 고정된다(position:sticky, 영역 최대 높이 22rem) | container 640px: 표는 .kit-table-scroll 안에서만 가로·세로로 스크롤한다. 숫자 열은 줄바꿈하지 않아 폭이 줄면 영역 안에서 스크롤된다. | table(region 안, 영역 이름은 title); 증감은 아이콘 + 부호 + 글자이고 숨은 글(증가·감소)이 붙는다(색만으로 전달하지 않는다); 막대는 장식(aria-hidden)이고 같은 값이 글자로 병기된다; 합계 행은 tfoot의 th scope=row 합계로 시작한다; 숫자 열 머리글도 오른쪽 정렬 | slot:main, slot:grid-item | src/platform/families/table.mjs#renderTableAnalytic |
| purpose:table.dense | ready, partial, empty, loading, error, sorted, selected, hover, focus | 머리글 버튼 click·Enter·Space → 그 열로 정렬하고 같은 버튼을 다시 누르면 방향이 바뀐다(머리글 aria-sort, 숫자 열은 크기순) [attachTable] / 행 체크박스·전체 선택 change → 행 선택과 전체 선택을 전환한다(선택된 행은 data-selected 배경으로 표시) [attachTable] / scroll → stickyHead=on이면 표 영역(최대 높이 24rem)을 스크롤해도 머리글이 위에 고정된다(position:sticky) | container 640px: 표는 .kit-table-scroll 안에서만 가로·세로로 스크롤한다. 셀은 줄바꿈하지 않아 행 높이가 일정하다. | table(region 안, 영역 이름은 title); 상태는 점(색) + 글자라 색만으로 전달하지 않는다; 행 높이가 작아도 머리글 버튼과 체크박스는 24px 이상 터치 대상을 갖는다; 줄무늬 배경에서도 글자 대비 4.5:1; 숫자 열은 오른쪽 정렬, 모노, tabular-nums | slot:main, slot:grid-item | src/platform/families/table.mjs#renderTableDense |
| purpose:feedback.confirm | closed, open, busy, error | trigger click → showModal로 열고 뒤 페이지를 inert로 만든다 [attachModal] / Escape·취소 → 닫고 연 버튼으로 포커스 복귀(busy 중에는 닫히지 않는다) / confirm → busy 상태로 확인 버튼에 스피너 | viewport 640px: sheet는 화면 아래에 붙고 버튼은 한 줄. dialog는 폭이 화면 안으로 제한된다. | dialog \| alertdialog(danger); danger는 role=alertdialog, 취소 버튼 autofocus; 제목과 설명은 aria-labelledby·aria-describedby로 연결; 닫으면 연 요소로 포커스 복귀 | slot:overlay, slot:main, slot:aside | src/platform/families/feedback.mjs#renderFeedbackConfirm |
| purpose:feedback.error | visible, dismissed, error | dismiss click·Escape → 배너를 숨기고 포커스를 부모로 옮긴다 [attachFeedback] / retry click → 재시도 동작(기반 버튼) | viewport 640px: 배너는 화면 폭을 채우고 동작 버튼은 아래로 내려간다. 메시지는 keep-all로 줄바꿈한다. | alert; 오류는 role=alert로 즉시 낭독; 오류 의미는 아이콘 모양·"오류:" 숨은 글·색으로 함께 전달; 원인과 해결 행동을 문장으로 쓴다 | slot:main, slot:header, slot:overlay | src/platform/families/feedback.mjs#renderFeedbackError |
| purpose:feedback.warning | visible, dismissed, closed, open | ack click → 경고를 확인하고 닫는다(기반 버튼·dismiss) [attachFeedback] / dialog confirm·cancel → 계속·취소 선택 [attachModal] | viewport 640px: 인라인 안내는 한 줄이 모자라면 버튼이 아래로 내려간다. 메시지 폭은 부모를 따른다. | status(inline) \| alertdialog(dialog); 경고는 삼각형 아이콘과 "주의:" 숨은 글로 전달(노랑만으로 구분하지 않는다); 경고색 글자는 어두운 단계(대비 4.5:1); 확인이 필요한 경고는 대화상자로 낸다 | slot:main, slot:header, slot:overlay | src/platform/families/feedback.mjs#renderFeedbackWarning |
| purpose:feedback.progress | pending, done | progress → native <progress>의 value 갱신(앱이 value를 바꾼다), indeterminate는 value 없음 / cancel click → 진행 취소(기반 버튼) | container -: 막대는 컨테이너 폭을 채운다. 단계 목록은 세로로 쌓인다. 퍼센트 글자는 줄바꿈하지 않는다. | progressbar(native progress) + status; <progress>에 접근 가능한 이름(aria-labelledby); 진행률 숫자를 글자로도 제공; 단계 상태는 아이콘·글자(완료·진행 중·대기)로 전달; indeterminate는 aria-busy | slot:main, slot:overlay, slot:aside | src/platform/families/feedback.mjs#renderFeedbackProgress |
| purpose:feedback.result | success, failure, pending | primary click → 다음 행동으로 이동(기반 버튼) / mount → 결과 영역이 role=status(실패는 alert)로 한 번 낭독된다 | viewport 640px: 가운데 정렬한 한 열 구성. 640px 이하에서 버튼은 세로로 쌓이고 전체 폭이 된다. 상세 목록은 값을 줄바꿈 없이 오른쪽에 둔다. | status \| alert(failure); 결과는 아이콘 모양·제목 글자·색으로 함께 전달; 제목은 h2(페이지) 또는 h3(인라인); 실패는 원인과 다음 행동을 문장으로 쓴다 | slot:main, slot:overlay | src/platform/families/feedback.mjs#renderFeedbackResult |
<!-- /generated:fields -->

## 5. 조합 규칙

개별 값의 유효성과 조합의 유효성은 다른 코드로 보고한다.

| 코드 | 뜻 | 단계 |
|---|---|---|
| `P_PURPOSE_VARIANT`, `P_PURPOSE_PROP`, `P_PURPOSE_CONTENT`, `P_PURPOSE_VISUAL_UNKNOWN` | 값 하나가 틀렸다(없는 축, 허용 밖 값, 필수 콘텐츠 없음, 모르는 시각 패밀리) | 개별 값 |
| `P_PURPOSE_COMBO` | 각 값은 유효하지만 함께 쓰면 안 된다. 규칙 id와 이유를 낸다 | 패밀리 단위 조합 |
| `P_PURPOSE_VISUAL` | 시각 패밀리의 측정값이 목적 패밀리의 요구에 못 미친다. 이유는 측정값에서 계산한다(예: 셀 상하 패딩 12px가 상한 8px를 넘는다) | 패밀리 × 패밀리 |
| `P_ATTR_LOCKED`, `P_ATTR_AXIS`, `P_ATTR_VALUE`, `P_REL_CONTRACT` | 기반 컴포넌트 단계: 시각 패밀리가 고정한 축, 연 적 없는 축, 계약 값, 계약 금지 조합 | 기반 구성원 |

거부 규칙의 이유는 사실이어야 한다. 기반 계약에서 나온 규칙(예: `PRODUCT_NESTED_CTA`는 `CARD_NESTED_INTERACTIVE`, `CONFIRM_SHEET_SIZE`는 `MODAL_SHEET_SIZE`), 구조상 불가능한 규칙(KPI inline에는 추세선을 놓을 폭이 없다), 시각 언어 측정값에서 계산되는 규칙(`needs.visual`)만 두었다. 처음 쓴 규칙 가운데 브라우저 측정으로 뒷받침되지 않는 이유(예: "bold에서 이어 붙인 아이콘 버튼은 테두리가 두 배"는 실제로는 1px 테두리라 사실이 아니었다)는 지웠다.

패밀리 단위 조합 수(변형 × 열린 기반 축 × 시각 패밀리). 허용은 패밀리 계약만 통과한 수다.

<!-- generated:combos -->
| 목적 패밀리 | 변형×열린 축 조합(시각 패밀리당) | × 시각 패밀리 전체 | 허용 | 거부(패밀리 단위) |
|---|---|---|---|---|
| purpose:card.kpi | 96 | 384 | 288 | 96 |
| purpose:card.product | 180 | 720 | 300 | 420 |
| purpose:card.article | 72 | 288 | 256 | 32 |
| purpose:card.feature | 72 | 288 | 216 | 72 |
| purpose:card.profile | 48 | 192 | 136 | 56 |
| purpose:card.pricing | 16 | 64 | 16 | 48 |
| purpose:card.status | 240 | 960 | 760 | 200 |
| purpose:card.gallery | 96 | 384 | 200 | 184 |
| purpose:button.primary | 54 | 216 | 180 | 36 |
| purpose:button.secondary | 24 | 96 | 72 | 24 |
| purpose:button.emphasis | 4 | 16 | 12 | 4 |
| purpose:button.destructive | 36 | 144 | 84 | 60 |
| purpose:button.icon | 12 | 48 | 48 | 0 |
| purpose:button.loading | 18 | 72 | 72 | 0 |
| purpose:button.toggle | 18 | 72 | 60 | 12 |
| purpose:navigation.sidebar | 24 | 96 | 96 | 0 |
| purpose:navigation.topbar | 16 | 64 | 56 | 8 |
| purpose:navigation.tabs | 96 | 384 | 336 | 48 |
| purpose:navigation.bottom | 4 | 16 | 12 | 4 |
| purpose:form.search | 24 | 96 | 96 | 0 |
| purpose:form.auth | 12 | 48 | 48 | 0 |
| purpose:form.settings | 6 | 24 | 24 | 0 |
| purpose:form.filter | 12 | 48 | 48 | 0 |
| purpose:form.group | 81 | 324 | 243 | 81 |
| purpose:table.business | 160 | 640 | 240 | 400 |
| purpose:table.analytic | 80 | 320 | 176 | 144 |
| purpose:table.dense | 80 | 320 | 88 | 232 |
| purpose:feedback.confirm | 24 | 96 | 64 | 32 |
| purpose:feedback.error | 12 | 48 | 36 | 12 |
| purpose:feedback.warning | 12 | 48 | 36 | 12 |
| purpose:feedback.progress | 18 | 72 | 72 | 0 |
| purpose:feedback.result | 12 | 48 | 48 | 0 |

합계: 전체 6636개 중 허용 4419개, 거부 2217개. 허용은 패밀리 계약(변형·열린 기반 축 값, 금지 조합, 시각 패밀리 요구)과 기반 컴포넌트 계약(`resolveMember`)을 모두 통과한다고 보장하는 수가 아니라, 패밀리 계약만 통과한 수다. 기반 계약 위반은 렌더 때 `P_REL_CONTRACT`로 거부된다.
<!-- /generated:combos -->

목적 패밀리 × 시각 패밀리(각 패밀리 예시 기준)에서 거부되는 쌍과 이유.

<!-- generated:matrix -->
| 목적 패밀리 | bold | editorial | quiet | soft |
|---|---|---|---|---|
| purpose:card.kpi | 허용 | 허용 | 허용 | 허용 |
| purpose:card.product | 허용 | 허용 | 허용 | 허용 |
| purpose:card.article | 허용 | 허용 | 허용 | 허용 |
| purpose:card.feature | 허용 | 허용 | 허용 | 허용 |
| purpose:card.profile | 허용 | 허용 | 허용 | 허용 |
| purpose:card.pricing | 허용 | 허용 | 허용 | 허용 |
| purpose:card.status | 허용 | 허용 | 허용 | 허용 |
| purpose:card.gallery | 허용 | 허용 | 허용 | 허용 |
| purpose:button.primary | 허용 | 허용 | 허용 | 허용 |
| purpose:button.secondary | 허용 | 허용 | 허용 | 허용 |
| purpose:button.emphasis | 허용 | 허용 | 허용 | 허용 |
| purpose:button.destructive | 허용 | 허용 | 허용 | 허용 |
| purpose:button.icon | 허용 | 허용 | 허용 | 허용 |
| purpose:button.loading | 허용 | 허용 | 허용 | 허용 |
| purpose:button.toggle | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.sidebar | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.topbar | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.tabs | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.bottom | 허용 | 거부: purpose:navigation.bottom × family:editorial: 면이 투명하다(본문 위에 겹쳐 고정되는 요소는 불투명한 면이 필요하다) | 허용 | 허용 |
| purpose:form.search | 허용 | 허용 | 허용 | 허용 |
| purpose:form.auth | 허용 | 허용 | 허용 | 허용 |
| purpose:form.settings | 허용 | 허용 | 허용 | 허용 |
| purpose:form.filter | 허용 | 허용 | 허용 | 허용 |
| purpose:form.group | 허용 | 거부: GROUP_EDITORIAL: editorial의 입력 외형은 underline이라 칸의 상자가 없어 애드온·버튼을 같은 테두리로 이을 수 없다 | 허용 | 허용 |
| purpose:table.business | 허용 | 허용 | 허용 | 허용 |
| purpose:table.analytic | 허용 | 허용 | 허용 | 허용 |
| purpose:table.dense | 허용 | 거부: purpose:table.dense × family:editorial: 셀 상하 패딩 12px가 이 패밀리의 상한 8px를 넘는다 | 허용 | 거부: purpose:table.dense × family:soft: 셀 상하 패딩 12px가 이 패밀리의 상한 8px를 넘는다 |
| purpose:feedback.confirm | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.error | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.warning | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.progress | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.result | 허용 | 허용 | 허용 | 허용 |
<!-- /generated:matrix -->

## 6. 정량 측정

`node scripts/families/measure.mjs --shots`가 묶음(card·button·navigation·form·table·feedback) × 시각 패밀리 4 × 모드(light·dark) × 뷰포트(모바일 390, 데스크톱 1280)로 같은 조립 경로(`assembleFamilies`)가 만든 페이지를 Chromium에 열어 잰다. 기존 검사기 `scripts/layout-quality`의 `layoutProbe`를 그대로 쓰고(역할 선택자만 `.kit-ctl-button`·`.pf-num` 등으로 넓혔다), 카드 높이 불균형·제목-본문 패딩·숫자 줄바꿈·버튼 크기 불일치·가로 넘침을 더 잰다. 같은 줄에 놓인 카드가 서로 다른 내용(짧은 값 `3`, 아주 긴 값 `1,284,330,000`, 두 줄 이상 상품명, 가격 카드의 기능 2개와 5개)을 갖도록 스트레스 입력을 더했다. 훑은 대상이 0이면 통과로 세지 않는다(`e2e/platform-families.spec.mjs`가 하한을 둔다).

<!-- generated:measure -->
| 측정 | 대상 수 | 결과 |
|---|---|---|
| 페이지(묶음 × 시각 4 × 모드 2 × 뷰포트 2) | 96 | 실패 0, 건너뜀 0 |
| layout-quality 오류(layoutProbe error) | 96 | 0건 |
| 카드 높이 불균형(같은 줄 카드의 최대 높이 차) | 카드 240장, 비교한 줄 32 | 최대 0px |
| 제목-본문 패딩(상·좌 여백 일치와 8px 이상, 제목-본문 간격 2~32px) | 카드 240장 | 위반 0건 |
| 숫자 줄바꿈(.pf-num이 한 줄) | 숫자 928개 | 줄바꿈 0건 |
| 버튼 크기 불일치(같은 묶음 높이 차 1px 초과) | 버튼 780개, 비교한 묶음 240 | 불일치 0건 |
| 컨트롤 겹침(버튼끼리, 버튼과 입력·선택 칸) | 컨트롤 952개 | 겹침 0건 |
| 가로 넘침(문서가 뷰포트보다 넓음) | 페이지 96 | 0쪽 |

| 묶음 | 페이지 수 | 실패 | layoutProbe가 훑은 글 수(합) | 훑은 가로 넘침 대상(합) |
|---|---|---|---|---|
| card | 16 | 0 | 1328 | 16 |
| button | 16 | 0 | 352 | 16 |
| navigation | 16 | 0 | 320 | 16 |
| form | 16 | 0 | 612 | 16 |
| table | 16 | 0 | 1400 | 16 |
| feedback | 16 | 0 | 320 | 16 |
<!-- /generated:measure -->

측정이 실제로 잡는다는 것은 일부러 깨뜨린 CSS로 확인한다(`e2e/platform-families.spec.mjs`): `.pf-card{height:auto}`는 높이 불균형으로, `.pf-num{white-space:normal;width:4ch}`는 숫자 줄바꿈으로, 카드 좌측 패딩 2px는 패딩 위반으로, 보조 버튼 `min-height:72px`는 버튼 크기 불일치로 실패한다.

스크린샷은 [evidence/families/](evidence/families/)에 묶음 × 시각 패밀리 × (desktop·mobile)로 24쌍 48장이다(`<묶음>-<시각 패밀리>-<desktop|mobile>.png`).

### 6.1 접근성 계약 회귀 시험

재료 검증(F1)은 목적 패밀리의 `a11y`(role·keyboard·conditions)를 렌더 마크업과 직접 대조하는 단언이 없다고 지적했다. 두 파일이 이를 맡는다.

- `tests/platform-family-a11y.test.mjs`: 32종 전부. 계약의 조건 문구마다 마크업 단언이 하나씩 있어야 하고(키가 조건과 일대일), 계약이 바뀌면 단언 없는 조건이 시험을 깨뜨린다. 마크업으로 볼 수 없는 조건(터치 크기·대비)은 브라우저 시험 또는 대비 시험으로 넘기고 그 위치를 적는다. 예시 렌더로 루트 역할·Tab 순서·조건별 단언을 보고, 모든 변형 값 × 시각 패밀리 4종(1,000여 렌더)에서 id 중복, 끊어진 `aria-labelledby`·`describedby`·`controls`·`activedescendant`, 이름 없는 컨트롤, 라벨 없는 입력, 양수 `tabindex`, 노출된 장식 아이콘을 본다.
- `e2e/platform-family-a11y.spec.mjs`: 32종 × 390·1280에서 Tab이 DOM 순서와 화면 읽기 순서대로 모든 정지에 닿고 포커스 표시가 있는지, 계약의 크기 조건(44px·56px·24px, 같은 줄 높이, 전체 폭), 탭·대화상자·콤보박스·메뉴 토글·비밀번호 보기·정렬·닫기의 키 조작과 상태 전이를 본다. 닫기 버튼은 관례상 모서리에 놓이고 DOM 끝에 있으므로 화면 읽기 순서 비교에서 뺀다.

이 시험이 찾아 고친 것(계약과 렌더가 달랐던 곳):

| 패밀리 | 계약 | 이전 렌더 | 고침 |
|---|---|---|---|
| `button.primary` pair | Tab 순서는 주 동작 → 보조 동작 | 보조가 DOM 앞(모바일 column-reverse에서 화면 순서와도 반대) | 주 동작을 앞에 두고 모바일은 위에서 아래 |
| `form.settings` | 마지막에 저장 → 취소 | 취소 → 저장 | 저장을 앞에 둔다 |
| `form.filter` | 선택 → 칩 → 적용 → 초기화 | 초기화 → 적용 | 적용을 앞에 둔다 |
| `button.destructive` pair 모바일 | Tab 순서는 취소 → 위험 동작 | column-reverse라 위험 동작이 위, 취소가 아래(포커스가 아래에서 위로) | 취소가 위, 위험 동작이 아래 |
| `button.emphasis` banner | banner는 section | 이름 없는 div | 제목이 이름인 `section`(제목이 없으면 div) |
| `table.*` | 스크롤 영역에 키보드 접근 | 포커스 가능하지만 표시가 브라우저 기본 1px 고리 | 3px `--kit-focus` 고리 |
| `feedback.confirm`·`error`·`warning` | 버튼 포커스 | 안쪽 버튼에 기본 1px 고리만 보임(기반 CSS가 규칙을 싣지 않음) | 패밀리 CSS가 3px 고리를 더함 |
| `feedback.confirm` 모바일 | 포커스 순서 = 화면 순서 | 기반 모달 푸터가 column-reverse라 취소(위) → 확인(아래) 순서가 거꾸로 | 패밀리 CSS가 column으로 둠(기반 CSS 바이트는 그대로) |

화면의 버튼 순서는 `button.primary` pair, `form.settings`, `form.filter`가 이전과 반대가 됐다(주 동작이 앞). 포커스 순서가 화면 읽기 순서와 같아야 하고 계약이 주 동작을 먼저로 적었기 때문이다. 바꾸려면 계약 문구와 두 시험을 함께 고쳐야 한다.

## 7. 정성 평가

스크린샷 48장을 직접 보고 적은 평가다. 측정이 못 잡는 것을 위주로 쓴다. 측정 통과는 "깨지지 않는다"이지 "좋다"가 아니다.

**잘 된 것**

- 같은 목적 패밀리가 시각 패밀리마다 다르게 읽힌다. quiet는 외곽선 카드, soft는 채운 면과 알약 버튼, bold는 각진 면과 딱딱한 그림자, editorial은 상자 없는 선과 여백이다. 구조(마크업 골격)는 그대로이고 고정 축과 `--pf-*`만 바뀐다(테스트가 골격 동일을 확인).
- 카드 8종은 한 줄에 서로 다른 내용을 놓아도 높이가 같고, 가격 카드의 신청 버튼과 상품 카드의 담기 버튼이 바닥에 붙는다. 긴 값(`1,284,330,000`)은 줄바꿈하지 않고 컨테이너 폭에 맞춰 줄어든다.
- 표 3종은 구조가 실제로 다르다. 업무형은 선택·정렬·상태 칩, 분석형은 합계 행·증감·인라인 막대, 고밀도는 줄무늬·모노 숫자·점 상태다. `attachTable`이 그대로 정렬과 선택을 처리한다(e2e로 확인).
- 폼과 피드백은 접근성 연결(라벨, `aria-describedby`, `role=alert`·`status`)이 구조에 들어 있고, 오류·경고·결과는 색만이 아니라 아이콘과 글자로도 전달한다.

**아쉬운 것(고치지 않았거나 못 고친 것)**

- 시각 패밀리 사이의 버튼 차이가 작다. Button의 고정 축은 모양뿐이라 bold 버튼에는 카드의 딱딱한 그림자가 없다. bold의 큰 숫자(`--pf-stat-scale` 1.25)도 타입 시스템의 `stat` 역할이 작으면 눈에 띄지 않는다. 시각 언어의 강도를 더 벌리려면 기반 버튼 CSS가 `--kit-shadow`를 읽어야 하는데 2.6.0 CSS는 고정이라 W5·기반 쪽 결정이 필요하다.
- 한 줄에서 높이를 맞추면 내용이 적은 카드(상태, 사용자 정보)에 빈 면이 길게 생긴다. 높이 균형과 맞바꾼 것이다. 부모 격자가 `align-items:start`를 주면 사라진다.
- 기반 컴포넌트의 결함을 우회한 곳이 있다: Select에 화살표 표시가 없어 폼 안에서 `::after`로 그렸고, 640px 이하에서 인라인 알림의 본문이 비정상적으로 커지는 기반 feedback CSS를 우회했다. 근본 수정은 기반 CSS(2.6.0 고정)를 바꿔야 한다.
- 어두운 모드에서 선택된 Select 옵션의 대비가 4.39:1이었다(기반 CSS가 action 글자 × soft 면). 고정 CSS는 두고 플랫폼 출력에만 보정 CSS(`selectPlatformPatch`)를 더해 글자를 `text` 역할로 바꿨다.
- 기반 컴포넌트 CSS는 `.kit-icon`을 정의하지 않고 읽기만 한다(정의는 컴파일 CSS). 그대로 조립하면 아이콘이 검은 도형으로 나오므로 조립기가 같은 규칙을 낸다(`ICON_CSS`). 파이프라인의 기본 경로(`assemblePlatform`)는 아직 이 규칙을 내지 않는다. W5에 요청한다.
- Chromium에서만 확인했다. 사이드바는 `::details-content`를 쓰므로 이를 모르는 브라우저는 데스크톱에서도 열기 버튼을 한 번 눌러야 한다.
- 어휘가 달라 대응하지 못한 구형 셸(rail, editorial, centered, split, minimal, masthead)은 §8에 `대응 없음`으로 남겼다.

## 8. 구형 노드 variant → 패밀리 preset 대응표

구형 노드(card, table, tabs, notice, chrome nav)는 2.4.0·2.5.0 호환을 위해 남는다. 새 조립은 2.6.0 컨트롤과 패밀리를 쓴다. 대응표는 `src/platform/families/legacy-map.mjs`이고, `tests/platform-family-legacy.test.mjs`가 모든 행을 실제 계약에 대 본다. 어휘가 다른 값(구형 `boxed` ↔ `segmented`)과 대응이 없는 값(`to: null`)은 이유를 적었다. 조용히 가까운 값으로 바꾸지 않는다.

<!-- generated:legacy -->
| 구형 노드 | 필드 | 값 | 대응(패밀리 preset) | 비고 |
|---|---|---|---|---|
| card | variant | basic | card-surface {"appearance":"outline"} (시각 패밀리가 고정) | 기본 카드는 외곽선 면. quiet의 고정 축과 같다 |
| card | variant | outline | card-surface {"appearance":"outline"} (시각 패밀리가 고정) | ADR 0012 §4의 예: card.variant outline → appearance outline |
| card | variant | filled | card-surface {"appearance":"filled"} (시각 패밀리가 고정) | soft가 고정하는 축 |
| card | variant | media | card-surface {"media":"top"} (열린 축) | 미디어를 위에 두는 열린 축 |
| card | variant | horizontal | card-surface {"media":"start"} (열린 축) | 미디어를 앞에 두는 열린 축(640px 이하에서 세로로 접힌다) |
| card | variant | link | card-surface {"behavior":"link"} (열린 축) | 카드 전체가 하나의 링크 대상(늘린 링크) |
| table | variant | plain | purpose:table.business {"toolbar":"none"} {"sortable":false,"selectable":false} | 정렬·선택 없는 업무형 표 |
| table | variant | striped | purpose:table.dense {"zebra":"on"} {"sortable":false} | 줄무늬는 고밀도 표의 변형 zebra다. 행 패딩이 8px 이하여야 하므로 soft·editorial과는 함께 쓸 수 없다 |
| table | variant | bordered | purpose:table.business {"toolbar":"none"} {"sortable":false,"selectable":false} | 테두리 굵기는 시각 패밀리가 정한다(quiet 1px, bold 2px). 표 자체에는 테두리 축이 없다 |
| tabs | variant | underline | tabs-control {"appearance":"underline"} (시각 패밀리가 고정) | quiet·editorial이 고정하는 축 |
| tabs | variant | pill | tabs-control {"appearance":"pill"} (시각 패밀리가 고정) | soft가 고정하는 축 |
| tabs | variant | boxed | tabs-control {"appearance":"segmented"} (시각 패밀리가 고정) | 어휘가 다르다: 구형 boxed는 2.6.0 segmented(붙은 상자 한 줄). bold가 고정하는 축. 세로 방향·스크롤과는 함께 쓸 수 없다(TABS_SEGMENTED_*) |
| notice | variant | inline | feedback-message {"placement":"inline"} (열린 축) | 문서 흐름 안의 안내 |
| notice | variant | banner | feedback-message {"placement":"banner"} (열린 축) | 화면 폭 전체. 알약 모양(shape pill)과는 함께 쓸 수 없다(FB_BANNER_PILL) |
| notice | variant | toast | feedback-message {"placement":"toast","dismiss":"button"} (열린 축) | 떠 있는 알림. 닫기 없이 오래 남으면 안 되므로(FB_TOAST_STUCK) dismiss 또는 autoDismiss가 있어야 한다 |
| notice | tone | info | feedback-message {"tone":"info"} (열린 축) | 같은 이름 |
| notice | tone | success | feedback-message {"tone":"success"} (열린 축) | 같은 이름 |
| notice | tone | warning | feedback-message {"tone":"warning"} (열린 축) | 같은 이름. 확인이 필요하면 purpose:feedback.warning |
| notice | tone | danger | feedback-message {"tone":"danger"} (열린 축) | 같은 이름. 재시도가 필요하면 purpose:feedback.error |
| chrome-nav | shell | sidebar | purpose:navigation.sidebar {} | 왼쪽 고정 사이드바 |
| chrome-nav | shell | topbar | purpose:navigation.topbar {} | 상단 가로 내비 |
| chrome-nav | shell | dock | purpose:navigation.bottom {} | 모바일 하단 탭바. 구형 X01(compact 밀도와 dock 금지)은 44px 터치 대상 때문이며 패밀리는 항목 높이를 44px 이상으로 고정한다 |
| chrome-nav | shell | stacked | purpose:navigation.topbar {} | 유틸리티 줄과 탭 줄 2단은 topbar + tabs 두 패밀리를 쌓아 만든다(한 패밀리가 아니다) |
| chrome-nav | shell | rail | 대응 없음 | 아이콘만 있는 좁은 세로 레일은 이 패밀리 묶음에 없다(sidebar의 compact 변형은 라벨이 있다). 대응 패밀리를 추가하기 전까지 구형 노드를 쓴다 |
| chrome-nav | shell | editorial | 대응 없음 | 가운데 정렬 편집 내비는 이 묶음에 없다 |
| chrome-nav | shell | centered | 대응 없음 | 가운데 정렬 브랜드와 내비는 이 묶음에 없다 |
| chrome-nav | shell | split | 대응 없음 | 넓은 왼쪽 패널과 본문은 페이지 배치(조립 엔진)의 몫이다 |
| chrome-nav | shell | minimal | 대응 없음 | 브랜드와 한 액션만: topbar의 actions 변형으로 가깝게 만들 수 있으나 항목이 없는 내비는 계약에 없다 |
| chrome-nav | shell | masthead | 대응 없음 | 신문 제호형은 이 묶음에 없다 |
<!-- /generated:legacy -->

## 9. 계약과 다른 작업에 대한 요청

W3는 `src/platform/contract.mjs`와 `pipeline.mjs`를 소유하지 않으므로 자기 파일 안의 확장 필드로 두었다. 요청 항목은 W5-c에서 다음 계약으로 처리했다.

1. **목적 패밀리 재료 종류**: 지금은 `src/platform/families/`가 자체 레지스트리(`PURPOSE_FAMILIES`)와 검사(`validatePurposeFamily`)를 가진다. 플랫폼 레지스트리에 종류 `purpose-family`(또는 `family`의 확장 필드 `purpose`)를 더하면 `recommend()`와 관계 그래프가 목적 패밀리를 직접 다룰 수 있다. 필드 모양은 `PURPOSE_FIELDS`를 그대로 쓰면 된다.
2. **시각 값 확장**: 시각 패밀리의 `--pf-*` 변수와 `metrics`, `recipe`는 `families/visual.mjs`에 있다(계약의 `family` 필드에는 없다). 계약에 `visual: {metrics, vars, recipe}` 필드를 더하면 `data/families.mjs`로 합칠 수 있다.
3. **페이지 단계 진입점**: W5의 페이지 단계는 슬롯에 `renderPurposeFamily(env, id, {visual, variant, props, content})`(또는 `assembleFamilies`)를 부르면 된다. 반환은 `{ok, html, errors, resolved, bases}`다. 파이프라인의 `components: [{base, family, ...}]`는 기반 컴포넌트 단위라 목적 패밀리를 직접 받지 못한다.
4. **`src/platform/index.mjs` 내보내기**: `export * from './families/index.mjs'` 한 줄.
5. **회귀 테스트 한 줄 조정**: `tests/platform-minimal.test.mjs`의 "스타일 맥락이 후보를 모두 걸러 `P_SELECT_EMPTY`" 검사는 Card 패밀리가 하나라는 전제였다. 시각 패밀리가 넷이 되어 `soft` 하나만 금지하면 다른 패밀리가 남으므로, 금지 값을 패밀리가 가진 모서리 값 전부로 넓혔다(검사 의도는 그대로: 대체하지 않고 비운다).
6. **구형 X01 규칙**(dock 셸 × compact 밀도 금지)은 `purpose:navigation.bottom`에 해당하지만 밀도는 패밀리가 아니라 요청이 정한다. 관계로 옮길 때 `forbids`에 `when: {density: ['compact']}`를 쓴다.

### 9.1 W5-c 처리: 레지스트리·공개 API·슬롯

- `purpose-family`는 `PLATFORM_KINDS`에 등록된다. 목적 패밀리 ID(`purpose:<group>.<name>`)와 `PURPOSE_FIELDS`의 필드는 그대로 유지한다. 각 레코드는 `bases` 의존을 `requires` 관계로 선언하고, 기반 부품 조립 계약은 계산 관계 `purpose-family-base`가 검사한다.
- `visual`은 시각 패밀리 ID별 `{key, metrics, vars, recipe, allowed, reasons}`다. 허용 결과와 거부 이유는 `checkPurposeCombination`에서 계산해 레지스트리의 상세·추천·호환성과 실제 렌더가 같은 판정을 쓴다. 시각 패밀리의 원본 값은 `src/platform/families/visual.mjs`를 계속 단일 출처로 쓴다.
- 공개 진입점은 `src/platform/index.mjs`의 `PURPOSE_FAMILY_IDS`, `PURPOSE_FAMILIES`, `PURPOSE_FIELDS`, `VISUAL_LANGUAGES`, `getPurposeFamily`, `listPurposeFamilies`, `validatePurposeFamilies`, `renderPurposeFamily`, `assembleFamilies`, `combinationMatrix`, `validatePurposeFamily`, `checkPurposeCombination`, `ICON_CSS`다. 렌더 시그니처는 `renderPurposeFamily(env, id, {visual, variant?, props?, content, id?}) → {ok, html, errors, resolved, bases}`다.
- W6b Core 호출은 `assemblePage(request, env)`이며 서비스 진입점은 `assembleDesign(request, opts)`다. `request`는 `purpose`, `content`, `components?`, `families?`, `palette?`, `subtokenSet?`, `typeSystem?` 등을 받는다. 목적 컴포넌트 형태는 `{purpose, visual?, variant?, props?, content, id?, slot?}`이고, 자동 슬롯 승격을 같은 목적의 명시 컴포넌트가 대체한다.
- `listPlatformMaterials({kind: 'purpose-family', ...})`, `getPlatformMaterial({id})`, `recommendMaterials({kind: 'purpose-family', context?, density?, styleContext?, selected?})`, `checkCompatibility({ids, context?, density?})`가 같은 레지스트리와 관계 그래프를 읽는다. REST는 각각 `GET /api/v1/platform/materials?kind=purpose-family`, `GET /api/v1/platform/materials/{id}`, `POST /api/v1/recommend`, `POST /api/v1/compatibility`; MCP는 `list_platform_materials`, `get_platform_material`, `recommend_materials`, `check_compatibility`다.
- 기준선은 목적 패밀리 등록 수와 페이지 출력 사용 수를 분리한다. `registered.purposeFamily`는 레지스트리 수, `distinct.purposeFamilies`는 품질 검증을 통과한 대표 페이지 Blueprint의 `materials.purposes`에서 센 고유 ID다. `registered.family`·`distinct.families`·`verifiedFamilies`는 기존처럼 시각 패밀리를 뜻한다. 페이지에서 쓰이지 않은 등록 목적 패밀리를 사용 수에 더하지 않는다.

### 9.2 W5-d 처리: Core 서비스 시연 계약

- 목적 패밀리 목록·상세는 W5-c 서비스 계약을 그대로 쓴다: `listPlatformMaterials({kind: 'purpose-family', ...})` → `getPlatformMaterial({id})`. 새 전용 목록 함수는 두지 않는다.
- `proposeSubtokenSets({seeds})`는 `{ok,value,warnings,catalogVersion,contractVersion}` 봉투로 팔레트 시드 배정, 통과 후보, 거부 이유와 light/dark 토큰 미리보기를 반환한다. 3~6개의 hex 시드는 요청 처리 중에만 메모리에서 쓰며 레지스트리나 저장소에 등록하지 않는다.
- `assembleComponents(request)`는 `{context, mode?, density?, styleContext?, palette?, subtokenSet?, typeSystem?, seeds?, items:[{purpose,visual,variant?,props?,content,id?}]}`를 받고 `{html,css,script,manifest,standalone}`를 반환한다. `items`의 선택값은 기존 `assembleFamilies`/`renderPurposeFamily`와 기반 컴포넌트 런타임으로 렌더·검사한다. manifest는 선택된 목적·시각 패밀리의 변형·props·콘텐츠를 `purposeItems`에, 사용자 팔레트의 완성된 색 슬롯을 `userPalette.seeds`에 담는다. standalone은 해당 서비스 결과의 HTML·CSS·스크립트를 그대로 담는다.
- `seeds`를 주면 `proposeSubtokenSets`의 대비 통과 세트만 선택할 수 있고, 생략한 세트는 첫 통과 후보를 쓴다. 임시 `palette:user-seeds`는 요청 범위의 새 레지스트리 안에만 둔다. 이 선택을 위해 Core 렌더러를 새로 만들지 않는다.
- REST는 `POST /api/v1/platform/propose-subtoken-sets`, `POST /api/v1/platform/assemble-components`; MCP는 `propose_subtoken_sets`, `assemble_components`다. 같은 입력은 서비스 봉투와 두 채널에서 바이트가 같다.
- 서비스 봉투는 1.3.0, 플랫폼 계약은 0.7.0을 유지한다. 이 추가 공개는 기존 필드 모양·레지스트리·baseline 조합 수를 바꾸지 않는다.
- X01은 `purpose:navigation.bottom → axis-value:density.compact`의 조건부 `forbids`로 둔다. 추천·호환성·`assembleFamilies`가 모두 `X01:` 근거를 반환하며, 페이지 축 금지 검사는 기존 `tests/platform-pipeline-forbids.test.mjs`에서 계속 확인한다.
- 기본 콘텐츠 승격은 KPI → `purpose:card.kpi`, 기능 소개 → `purpose:card.feature`, 요금제 → `purpose:card.pricing`, 기사 → `purpose:card.article`, 상품 → `purpose:card.product`, 표 → `purpose:table.business` 또는 명시한 분석형 `purpose:table.analytic`이다. 표의 배열형 columns/rows는 목적 패밀리 입력인 객체형으로 정규화한다. 구성요소를 명시하면 같은 목적의 자동 승격을 생략한다.
- 목적 패밀리 마크업은 W3 구현과 `ICON_CSS`를 재사용한다. 아이콘 스타일은 `VISUAL_LANGUAGES`에서 `src/styles/base.mjs` 계약의 이름으로 선택한다. Coolors 데이터는 목록·상세·추천·호환성에 추가하지 않는다.
