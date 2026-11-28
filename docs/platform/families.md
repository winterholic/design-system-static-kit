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
| family:bold | 두꺼운 경계선과 오프셋 그림자, 각진 모서리로 구획한다. 높은 시각적 대비와 강한 힘이 필요한 화면용. | square·hard·lively | comfortable | 10/10 | card {"appearance":"elevated","shape":"square","footer":"none"}; button {"shape":"square"}; nav {"appearance":"block","shape":"square"} |
| family:corporate-formal | 절제된 4px 모서리와 안정적 정렬. 가는 경계에 은은한 그림자를 겹쳐 신뢰감을 주는 계층을 만든다. | subtle·soft·subtle | comfortable | 10/10 | card {"appearance":"elevated","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"underline","shape":"soft"} |
| family:dense-enterprise | 30px 컨트롤과 4~8px 간격, 움직임 없는 반응. 데이터 집약적 전문 도구와 관리 콘솔을 위한 압축된 구조. | subtle·outline·none | compact | 10/10 | card {"appearance":"outline","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"block","shape":"soft"} |
| family:editorial | 상자 대신 가는 선과 넓은 여백, 타이포그래피 중심으로 구획한다. 규칙선을 활용한 읽기 중심 화면용. | subtle·flat·none | spacious | 10/10 | card {"appearance":"flat","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"underline","shape":"soft"} |
| family:elevated-material | 테두리 없이 그림자 깊이로 계층을 만든다. 놓인 카드는 얕게, 메뉴·대화상자·툴팁은 깊게 떠 있다. | soft·lifted·subtle | comfortable | 10/10 | card {"appearance":"elevated","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"pill","shape":"soft"} |
| family:expressive | 28px 라운드와 알약형 컨트롤, 강조색이 도는 테두리와 큰 상승 모션, 6px 악센트 띠로 리듬을 만든다. 글로우 그림자는 밝은 모드에서 보이지 않아(X05) 쓰지 않는다. | bubble·lifted·lively | spacious | 10/10 | card {"appearance":"elevated","shape":"round","footer":"none"}; button {"shape":"pill"}; nav {"appearance":"pill","shape":"pill"} |
| family:glass | 반투명 면과 배경 블러, 반투명 테두리. 면 뒤로 배경이 비치므로 본문 위에 겹쳐 고정되는 요소에는 쓰지 못한다. | round·lifted·subtle | spacious | 10/10 | card {"appearance":"outline","shape":"round","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"pill","shape":"soft"} |
| family:luxury | 넓은 여백과 직각 모서리, 44px 컨트롤과 32px 가로 여백. 가는 글자 굵기에 넓게 벌어진 대문자 라벨. | square·flat·subtle | spacious | 10/10 | card {"appearance":"outline","shape":"square","footer":"none"}; button {"shape":"square"}; nav {"appearance":"underline","shape":"soft"} |
| family:outline-precise | 선명한 1px 경계와 각진 컨트롤, 정밀한 정렬선. 직각 끝맺음의 아이콘과 카드 위 기준선이 구조를 드러낸다. | subtle·outline·subtle | comfortable | 10/10 | card {"appearance":"outline","shape":"square","footer":"none"}; button {"shape":"square"}; nav {"appearance":"block","shape":"square"} |
| family:quiet | 외곽선과 여백으로 구획한다. 평평한 표면과 제한적 경계의 절제된 업무 화면용. | soft·outline·subtle | comfortable | 10/10 | card {"appearance":"outline","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"underline","shape":"soft"} |
| family:soft | 채운 면과 큰 모서리로 구획한다. 알약형 컨트롤과 떠 있는 부드러운 표면의 친근한 화면용. | round·lifted·subtle | spacious | 10/10 | card {"appearance":"filled","shape":"round","footer":"none"}; button {"shape":"pill"}; nav {"appearance":"pill","shape":"pill"} |
| family:tonal-layered | 선과 그림자 없이 색조 면 위에 면을 쌓는다. 카드 위 4px 띠와 큰 컨트롤, 붙은 분절 탭이 계층을 알린다. | round·flat·none | comfortable | 10/10 | card {"appearance":"filled","shape":"soft","footer":"none"}; button {"shape":"soft"}; nav {"appearance":"block","shape":"soft"} |
<!-- /generated:visual -->

열린 축의 허용 조합 수(허용 / 전체). 허용은 `memberCombinations`가 기반 계약의 금지 조합을 빼고 센 값이다. 같은 기반 컴포넌트라도 시각 패밀리가 고정하는 축이 다르면 열린 조합 수가 다르다.

<!-- generated:openAxes -->
| 시각 패밀리 | button-control | card-surface | data-table | feedback-message | input-control | modal-dialog | navigation-menu | select-control | tabs-control | tooltip |
|---|---|---|---|---|---|---|---|---|---|---|
| family:bold | 884/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 64/192 | 240/288 | 32/128 | 160/256 |
| family:corporate-formal | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:dense-enterprise | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 64/192 | 240/288 | 32/128 | 160/256 |
| family:editorial | 936/1920 | 77/180 | 66/120 | 208/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:elevated-material | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:expressive | 884/1920 | 132/180 | 66/120 | 320/1152 | 132/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:glass | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:luxury | 884/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:outline-precise | 884/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 64/192 | 240/288 | 32/128 | 160/256 |
| family:quiet | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:soft | 884/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 72/192 | 240/288 | 96/128 | 160/256 |
| family:tonal-layered | 936/1920 | 132/180 | 66/120 | 320/1152 | 144/192 | 50/128 | 64/192 | 240/288 | 32/128 | 160/256 |
<!-- /generated:openAxes -->

## 4. 목적 패밀리 37종

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
| purpose:card.comparison | 두 개 이상의 상품을 같은 필드 순서로 비교하고 차이를 행 단위로 읽게 한다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:card.notification | 알림 한 건의 제목·본문·시각과 읽음 상태를 전달한다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:card.activity | 최근 작업 활동을 행위자·행동·시각 순으로 보여 준다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:card.integration | 외부 서비스 연동의 이름·연결 상태·설명을 보여 준다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:card.review | 평점·후기·작성자를 함께 보여 주며 별점은 숫자로도 읽힌다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:card.selection | 선택 목록에서 한 항목을 키보드와 포인터로 선택한다. | card-surface |  | size: small·medium·large; behavior: selectable; state: default·selected·loading·empty·error·disabled | {"size":"medium","behavior":"selectable","state":"default"} | needs.visual {"minBorderW":1} |
| purpose:card.dashboard-widget | 제목·주요 수치·보조 지표를 조합해 대시보드의 한 업무 지표를 요약한다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:card.financial-asset | 자산 이름·현재 값·변동을 숫자와 방향 문구로 함께 전달한다. | card-surface |  | size: small·medium·large; behavior: static; state: default·loading·empty·error·disabled | {"size":"medium","behavior":"static","state":"default"} | 없음 |
| purpose:button.primary | 화면의 주 동작 하나(저장, 다음, 확인)를 맨 앞에 두고 취소 같은 보조 동작을 곁들인다. 폼 하단과 카드 하단에서 쓴다. | button-control | layout: single·pair·stack; align: start·end | size: small·medium·large; state: default·loading·disabled | {"layout":"single","align":"start","size":"medium","state":"default"} | BTN_PRIMARY_STACK_END |
| purpose:button.secondary | 주 동작 곁에 놓이는 낮은 강조 동작(내보내기, 더 보기, 필터 초기화)을 아이콘과 함께 한 줄로 늘어놓는다. 툴바와 카드 머리에서 쓴다. | button-control | layout: single·row; tier: secondary·tertiary | size: small·medium·large; state: default·disabled | {"layout":"row","tier":"secondary","size":"medium","state":"default"} | BTN_SECONDARY_SINGLE_TIER |
| purpose:button.emphasis | 페이지에서 가장 먼저 눌러야 할 동작 하나를 문구·보조 설명과 함께 크게 보인다. 랜딩 히어로와 구독 유도 영역에서 쓴다. | button-control | layout: inline·banner | size: medium·large | {"layout":"inline","size":"large"} | BTN_EMPHASIS_BANNER_MEDIUM |
| purpose:button.destructive | 되돌릴 수 없는 동작(삭제, 탈퇴, 초기화)을 취소와 함께 두고, 결과를 안내하는 글을 붙인다. 위험 동작은 주 동작보다 앞에 놓지 않는다. | button-control | guard: note·none; layout: pair·stack | size: small·medium·large; state: default·loading·disabled | {"guard":"note","layout":"pair","size":"medium","state":"default"} | BTN_DESTRUCTIVE_NO_NOTE_STACK, BTN_DESTRUCTIVE_LOADING_NOTE |
| purpose:button.icon | 글자 없이 아이콘만으로 동작을 나열한다(복사, 편집, 더보기). 좁은 머리줄과 표 행 끝에서 쓰며, 모든 버튼은 접근 가능한 이름을 가진다. | button-control | layout: toolbar·attached | size: small·medium·large; state: default·disabled | {"layout":"toolbar","size":"medium","state":"default"} | 없음 |
| purpose:button.loading | 요청을 보내는 동안 버튼의 크기를 바꾸지 않고 진행 중임을 알린다. 저장·결제·업로드처럼 응답을 기다리는 동작에서 쓴다. | button-control | phase: loading·idle·compare; tier: primary·secondary | size: small·medium·large | {"phase":"loading","tier":"primary","size":"medium"} | 없음 |
| purpose:button.toggle | 켜짐·꺼짐이 남는 선택(즐겨찾기, 보기 방식, 필터 칩)을 aria-pressed 버튼으로 보인다. 단일 토글과 여러 개를 묶은 그룹이 있다. | button-control | layout: single·group | size: small·medium·large; state: default·pressed·disabled | {"layout":"single","size":"medium","state":"default"} | BTN_TOGGLE_GROUP_PRESSED |
| purpose:button.split | 자주 쓰는 주 동작 하나와 같은 계열의 대안 동작(다른 형식으로 저장, 예약 전송)을 한 덩어리로 둔다. 주 동작은 바로 실행하고 화살표 버튼은 메뉴만 연다. | button-control | tier: primary·secondary | size: small·medium·large; state: default·loading·disabled | {"tier":"primary","size":"medium","state":"default"} | 없음 |
| purpose:button.menu | 여러 동작을 하나의 버튼 뒤에 접어 둔다(더 보기, 정렬 기준, 작업 메뉴). 버튼 자체는 동작을 실행하지 않고 메뉴만 연다. | button-control | tier: secondary·tertiary | size: small·medium·large; state: default·disabled | {"tier":"secondary","size":"medium","state":"default"} | 없음 |
| purpose:button.fab | 화면에서 가장 중요한 단일 동작(새 글, 새 작업)을 떠 있는 원형 버튼으로 둔다. 아이콘만 있는 형태와 라벨을 더한 확장형이 있다. | button-control | extended: icon·extended | size: medium·large; state: default·loading·disabled | {"extended":"icon","size":"large","state":"default"} | 없음 |
| purpose:button.copy | 값(링크, 코드, 계좌번호)을 클립보드로 복사하고 복사됐음을 말해 준다. 시각 변화가 아니라 읽어 주는 상태 문구로 결과를 전달한다. | button-control | display: label·icon-only | size: small·medium·large; state: default·disabled | {"display":"label","size":"medium","state":"default"} | 없음 |
| purpose:button.close | 배너·패널·알림처럼 사용자가 치울 수 있는 덩어리의 오른쪽 끝에 둔다. 닫기 버튼은 이름 있는 아이콘 버튼이며 가장 가까운 닫을 수 있는 영역을 숨긴다. | button-control | layout: standalone·attached | size: small·medium·large; state: default·disabled | {"layout":"attached","size":"medium","state":"default"} | BTN_CLOSE_ATTACHED_DISABLED |
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
| purpose:table.filterable | 열 기준을 안내하는 검색 입력으로 행을 즉시 좁히고 일치 건수를 읽게 한다. | data-table |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:table.expandable | 각 행의 상세 내용을 네이티브 disclosure로 펼쳐 본다. | data-table |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:table.grouped | 행을 같은 범주의 묶음으로 나누고 그룹 제목을 표 구조에서 읽게 한다. | data-table |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:table.tree | 계층형 항목을 펼치고 접으며 방향키로 이동한다. | card-surface |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:table.inspector | 레코드의 필드 이름과 값을 쌍으로 나열하고 긴 값을 줄바꿈한다. | card-surface |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:table.log-viewer | 시각·심각도·메시지를 열로 나눠 긴 로그 문장을 읽는다. | data-table |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:table.diff | 이전·이후 텍스트를 나란히 비교하고 모바일에서는 위아래로 쌓는다. | card-surface |  | density: compact·comfortable·spacious; state: ready·partial·empty·loading·error | {"density":"comfortable","state":"ready"} | 없음 |
| purpose:feedback.confirm | 되돌리기 어려운 동작 앞에서 사용자의 확인을 받는다. 위험 확인(danger)은 취소가 첫 포커스를 받고, 일반 확인은 제목이 받는다. | modal-dialog, button-control | tone: neutral·danger; form: dialog·sheet; display: preview·trigger | size: small·medium·large | {"tone":"neutral","form":"dialog","display":"preview","size":"medium"} | CONFIRM_SHEET_SIZE |
| purpose:feedback.error | 실패를 원인과 다음 행동(재시도·문의)과 함께 알린다. 화면 위쪽 배너나 대화상자의 오류 상태로 낸다. | feedback-message, modal-dialog, button-control | form: banner·dialog; retry: button·none | size: small·medium·large | {"form":"banner","retry":"button","size":"medium"} | ERROR_DIALOG_NO_RETRY |
| purpose:feedback.warning | 실패는 아니지만 확인이 필요한 상황(만료 임박, 용량 부족, 되돌릴 수 없는 변경 예고)을 알린다. 인라인 안내나 확인이 필요한 대화상자로 낸다. | feedback-message, modal-dialog, button-control | form: inline·dialog; ack: none·button | size: small·medium·large | {"form":"inline","ack":"button","size":"medium"} | WARNING_DIALOG_NO_ACK |
| purpose:feedback.progress | 시간이 걸리는 작업(업로드, 가져오기, 배포)의 진행을 막대·단계 목록·취소와 함께 보인다. 사용자가 언제 끝나는지와 취소할 수 있는지를 안다. | feedback-message, button-control | kind: determinate·indeterminate·steps; cancel: button·none | size: small·medium·large | {"kind":"determinate","cancel":"button","size":"medium"} | 없음 |
| purpose:feedback.result | 작업이 끝난 뒤 결과(완료, 실패, 확인 중)를 한 화면 분량으로 알리고 다음 행동을 둔다. 결제 완료, 가입 완료, 신청 접수 화면에서 쓴다. | button-control | outcome: success·failure·pending; layout: page·inline | size: medium·large | {"outcome":"success","layout":"page","size":"large"} | 없음 |
| purpose:info.status-badge | 엔터티의 현재 상태(활성, 성공, 대기, 실패 등)를 상태 점(dot)과 텍스트 라벨로 명확하게 표시한다. | feedback-message | tone: neutral·info·success·warning·danger | size: small·medium·large | {"tone":"neutral","size":"medium"} | 없음 |
| purpose:info.avatar | 사용자 또는 엔터티를 나타내는 프로필 이미지 또는 이니셜 텍스트를 표시한다. | card-surface | shape: circle·square | size: small·medium·large | {"shape":"circle","size":"medium"} | 없음 |
| purpose:info.avatar-group | 협업자 또는 참가자 목록을 겹친 아바타들과 초과 인원 카운터로 표시한다. | card-surface | spacing: tight·normal | size: small·medium·large | {"spacing":"tight","size":"medium"} | 없음 |
| purpose:info.accordion | 여러 접이식 섹션을 목록으로 제공하여 연관된 정보를 공간 절약형으로 탐색한다. | card-surface, button-control | layout: stack·separated | density: compact·comfortable·spacious | {"layout":"stack","density":"comfortable"} | 없음 |
| purpose:info.collapsible | 단일 영역의 상세 내용을 버튼으로 접거나 펼쳐서 점진적으로 정보를 노출한다. | button-control | layout: inline·card | size: small·medium·large | {"layout":"inline","size":"medium"} | 없음 |
| purpose:info.counter | 알림 수, 장바구니 수량 등 단일 수치를 시각적 캡슐이나 원형으로 표현한다. | feedback-message | variant: pill·circle | size: small·medium·large; tone: neutral·action·danger | {"variant":"pill","size":"medium","tone":"neutral"} | 없음 |
| purpose:info.notification-indicator | 새 소식이나 읽지 않은 알림이 있음을 시각적 점(dot) 또는 펄스 애니메이션으로 알린다. | feedback-message | style: dot·pulse | tone: danger·action·warning | {"style":"dot","tone":"danger"} | 없음 |
| purpose:info.keyboard-shortcut | 명령 메뉴나 단축키 조합을 명확한 kbd 태그 묶음으로 안내한다. | card-surface | style: outline·solid | size: small·medium | {"style":"outline","size":"medium"} | 없음 |
| purpose:info.metadata-row | 키-값 메타데이터 항목들을 정렬된 행으로 명확하게 전달한다. | card-surface | layout: inline·stacked | density: compact·comfortable | {"layout":"inline","density":"comfortable"} | 없음 |
| purpose:info.stat-comparison | 현재 수치와 이전 기간 대비 변화율/증감치를 비교하여 시각적 지표를 제공한다. | card-surface | layout: horizontal·vertical | size: medium·large | {"layout":"horizontal","size":"medium"} | 없음 |
| purpose:media.responsive-image | 지정된 화면 비율과 최적 맞춤(fit)으로 왜곡 없이 반응하는 이미지를 제공한다. | card-surface | aspectRatio: 16:9·4:3·1:1·21:9 | fit: cover·contain | {"aspectRatio":"16:9","fit":"cover"} | 없음 |
| purpose:media.carousel | 여러 개의 이미지나 콘텐츠 슬라이드를 순회하는 키보드 접근 가능한 캐러셀을 제공한다. | card-surface, button-control | layout: single·cards | size: medium·large | {"layout":"single","size":"medium"} | 없음 |
| purpose:media.audio-player | 재생/일시정지 제어, 진행률 바, 시간 정보를 갖춘 오디오 재생기 UI를 제공한다. | card-surface, button-control | layout: compact·full | size: small·medium | {"layout":"full","size":"medium"} | 없음 |
| purpose:media.file-preview | 첨부 파일의 확장자 배지, 파일명, 용량 및 다운로드 동작을 명확하게 안내한다. | card-surface | layout: card·row | size: small·medium·large | {"layout":"row","size":"medium"} | 없음 |
| purpose:media.image-comparison | Before/After 두 이미지를 좌우 분할 슬라이더로 실시간 비교한다. | card-surface | orientation: horizontal | size: medium·large | {"orientation":"horizontal","size":"medium"} | 없음 |
| purpose:media.figure-caption | 시각 이미지와 설명 캡션, 출처 정보를 표준 figure 및 figcaption 구조로 전달한다. | card-surface | placement: bottom·top | align: start·center | {"placement":"bottom","align":"start"} | 없음 |
| purpose:navigation.collapsible-sidebar | 주요 내비게이션을 작은 화면에서 접고 펼치는 독립형 사이드바 | navigation-menu, button-control |  |  | {} | 없음 |
| purpose:navigation.drawer | Navigation Drawer는 콘텐츠를 주변 흐름 위에 표시하고 키보드로 닫을 수 있다. | button-control, navigation-menu |  |  | {} | 없음 |
| purpose:navigation.command-menu | Command Menu는 항목 사이 방향키 이동과 Escape 닫기를 지원한다. | button-control |  |  | {} | 없음 |
| purpose:navigation.context-menu | Context Menu는 항목 사이 방향키 이동과 Escape 닫기를 지원한다. | button-control |  |  | {} | 없음 |
| purpose:overlay.drawer | Drawer는 콘텐츠를 주변 흐름 위에 표시하고 키보드로 닫을 수 있다. | button-control |  |  | {} | 없음 |
| purpose:overlay.popover | Popover는 시작 요소 바로 아래에 붙어 보조 콘텐츠를 보여 주는 비모달 패널이다. | button-control |  |  | {} | 없음 |
| purpose:overlay.dropdown-menu | 선택 명령을 메뉴 항목으로 제공하는 키보드 내비게이션 팝업 | button-control |  |  | {} | 없음 |
| purpose:overlay.contextual-help | 현재 입력이나 작업 맥락에 연결된 보조 설명 | button-control |  |  | {} | 없음 |
| purpose:feedback.callout | 본문 흐름 안에서 맥락이 필요한 안내를 정적인 문구로 전달한다. 알림 영역(live region)이 아니라 읽는 순서에 놓이는 note다. | feedback-message |  |  | {} | 없음 |
| purpose:feedback.circular-progress | 작업 진행률을 원형 표시와 접근 가능한 값으로 함께 제공한다. | feedback-message |  |  | {} | 없음 |
| purpose:feedback.loading-overlay | 한 영역 위에 진행 중 상태를 겹쳐 보이고 그 영역의 내용 조작을 막는다. 화면 전체를 덮지 않는다. | feedback-message |  |  | {} | 없음 |
| purpose:feedback.status-indicator | 상태를 점 모양·색·텍스트를 함께 사용해 전달한다. | feedback-message |  |  | {} | 없음 |
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
| purpose:card.comparison | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardComparison |
| purpose:card.notification | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardNotification |
| purpose:card.activity | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardActivity |
| purpose:card.integration | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardIntegration |
| purpose:card.review | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardReview |
| purpose:card.selection | default, selected, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardSelection |
| purpose:card.dashboard-widget | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardDashboardWidget |
| purpose:card.financial-asset | default, hover, focus, active, loading, empty, error, disabled | loading → 내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다 [base-component:card-surface] / error → 오류를 role=alert로 표시한다 | container and viewport container 280px,640px: 긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다. | article; all user text is escaped; loading and error state is rendered; responsive card content wraps | slot:main, slot:grid-item, slot:aside | src/platform/families/card-extra.mjs#renderCardFinancialAsset |
| purpose:button.primary | default, hover, focus, active, loading, disabled | click·Enter·Space → 주 동작 실행(기반 버튼 attachButton) / pair → 보조 버튼은 같은 크기·같은 높이의 보조 외형 | viewport 640px: pair는 640px 이하에서 세로로 쌓이고 주 동작이 위에 온다(DOM 순서 그대로 위에서 아래로). 버튼은 전체 폭이 된다. | group; 버튼 이름은 동사로 시작; 그룹에는 aria-label이 없어도 되지만 폼 안에서는 폼 제목과 연결된다; 포커스 링 3:1 이상 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonPrimary |
| purpose:button.secondary | default, hover, focus, active, disabled | click·Enter·Space → 각 버튼의 동작(기반 버튼) / hover·focus → 외곽선·배경 변화 | viewport 640px: row는 줄바꿈된다(flex-wrap). 버튼 높이와 글자 크기는 모두 같다. | group; 아이콘은 라벨 옆 장식; 비활성은 disabled 속성과 대비 3:1 표시 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonSecondary |
| purpose:button.emphasis | default, hover, focus, active | click·Enter·Space → 핵심 동작 실행(기반 버튼) / hover → 배경 한 단계 어둡게(action-hover) | viewport 640px: 배너는 640px 이하에서 문구 위, 버튼 아래로 쌓이고 버튼은 전체 폭이 된다. | group (+ banner는 section); 버튼 대비 4.5:1; 보조 설명은 aria-describedby로 버튼과 연결 | slot:main, slot:header, slot:footer | src/platform/families/button.mjs#renderButtonEmphasis |
| purpose:button.destructive | default, hover, focus, active, loading, disabled | click·Enter·Space → 위험 동작 실행(기반 버튼, tone=danger) / loading → 진행 중에는 클릭 차단, 포커스 유지(aria-disabled) | viewport 640px: 640px 이하에서 세로로 쌓이고 취소가 위, 위험 버튼이 아래 전체 폭이다. | group; 위험 동작의 결과를 안내 글이 설명하고 aria-describedby로 연결; 위험 의미는 색만이 아니라 문구(삭제·영구)로 전달; 대비 4.5:1 | slot:main, slot:footer, slot:overlay | src/platform/families/button.mjs#renderButtonDestructive |
| purpose:button.icon | default, hover, focus, active, disabled | click·Enter·Space → 각 아이콘 동작 / hover·focus → 배경 변화, 포커스 링 | viewport 640px: 버튼은 정사각형 터치 영역(최소 44px 변)을 유지한다. 줄이 모자라면 줄바꿈한다. | toolbar; 모든 아이콘 버튼에 aria-label(필수, BTN_ICON_NAME); 툴바에 aria-label; 아이콘만으로 의미가 모호하면 Tooltip과 함께 쓴다 | slot:header, slot:main, slot:grid-item | src/platform/families/button.mjs#renderButtonIcon |
| purpose:button.loading | default, loading, hover, focus | loading → 스피너가 시작 자리를 채우고 클릭만 막는다(aria-disabled). 포커스는 유지된다 [attachButton] / compare → 대기와 로딩을 나란히 놓아 두 상태의 크기가 같음을 확인한다 | viewport -: 라벨은 줄바꿈하지 않는다. 대기·로딩 버튼은 최소 폭(9em, 가로 여백이 넓은 패밀리는 여백 두 배 + 6em)을 같이 쓰고, compare는 같은 폭의 두 칸이라 상태가 바뀌어도 폭이 흔들리지 않는다. | button (aria-busy, aria-disabled); 진행 안내는 role=status 숨은 글(처리 중입니다); 진행 중 라벨을 바꾸더라도 버튼 이름은 동작을 설명 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonLoading |
| purpose:button.toggle | default, pressed, hover, focus, active, disabled | click·Space·Enter → aria-pressed 전환, onPress 콜백 [attachButton] / group → 항목이 독립 토글(복수 선택). 단일 선택 라디오와 다르다 | viewport 640px: 그룹은 줄바꿈된다. 눌림 상태는 색만이 아니라 아이콘(check)과 aria-pressed로 전달한다. | button[aria-pressed] (group은 role=group + aria-label); pressed 상태는 aria-pressed로 전달; 라벨은 상태가 바뀌어도 같다(상태를 라벨에 넣지 않는다) | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonToggle |
| purpose:button.split | default, hover, focus, active, disabled, loading, expanded | 주 버튼 click·Enter·Space → 주 동작 실행(메뉴는 열리지 않는다) [attachButton] / 화살표 버튼 click·Enter·Space·ArrowDown → 메뉴를 열고 첫 항목에 포커스를 둔다(aria-expanded=true) [actionRuntime] / Escape·바깥 클릭 → 메뉴를 닫고 화살표 버튼으로 포커스를 돌려준다 [actionRuntime] | viewport 640px: 두 버튼은 붙어 있는 한 덩어리로 줄바꿈하지 않는다. 메뉴 패널은 12em 이상, 화면 폭의 90%를 넘지 않는다. 각 버튼은 44px 이상이다. | group (주 버튼 + button[aria-haspopup=menu]); 화살표 버튼은 aria-haspopup=menu와 aria-expanded; 화살표 버튼의 접근 가능한 이름; 메뉴는 role=menu이고 항목은 menuitem | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonSplit |
| purpose:button.menu | default, hover, focus, active, disabled, expanded | 버튼 click·Enter·Space·ArrowDown → 메뉴를 열고 첫 항목에 포커스를 둔다(aria-expanded=true) [actionRuntime] / 항목 click·Enter·Space → 메뉴를 닫고 트리거로 포커스를 돌려준 뒤 kit-menu-select 이벤트를 낸다 [actionRuntime] / Escape·바깥 클릭·Tab → 메뉴를 닫는다 [actionRuntime] | viewport 640px: 트리거 라벨은 줄바꿈하지 않고 메뉴 패널이 화면 폭의 90%를 넘지 않는다. 항목은 44px 이상이다. | button[aria-haspopup=menu]; 트리거는 aria-haspopup=menu와 aria-expanded와 aria-controls; 메뉴는 role=menu이고 항목은 menuitem; 닫을 때 포커스는 트리거로 돌아간다 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonMenu |
| purpose:button.fab | default, hover, focus, active, loading, disabled | click·Enter·Space → 화면의 주 동작 실행(기반 버튼 attachButton) [attachButton] / loading → 스피너가 아이콘 자리를 채우고 클릭만 막는다 [attachButton] | viewport 640px: 터치 영역은 56px 이상의 원형이다. 화면 모서리 고정(position)과 safe-area는 페이지 배치가 정하며 이 컴포넌트는 흐름 안에 놓인다. | button; 아이콘만 있는 형태도 접근 가능한 이름; 원형 터치 영역 56px 이상; 떠 있는 그림자는 장식이며 포커스 링이 따로 보인다 | slot:main, slot:footer, slot:overlay, slot:grid-item | src/platform/families/button.mjs#renderButtonFab |
| purpose:button.copy | default, hover, focus, active, disabled, copied | click·Enter·Space → 값을 클립보드로 복사하고 상태 문구(role=status)를 갱신한다. 클립보드를 쓸 수 없으면 실패 문구를 읽어 준다 [actionRuntime] / disabled → 복사를 실행하지 않는다 [actionRuntime] | viewport -: 아이콘만 있는 형태도 터치 영역은 44px 이상이다. 라벨은 줄바꿈된다. | button; 복사 결과는 role=status 안내로 전달; 아이콘만 있는 형태도 접근 가능한 이름; 복사할 값은 버튼 이름에 넣지 않는다 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/button.mjs#renderButtonCopy |
| purpose:button.close | default, hover, focus, active, disabled | click·Enter·Space → attached는 가장 가까운 닫을 수 있는 영역을 숨기고 kit-dismiss 이벤트를 낸다. standalone은 이벤트만 낸다 [actionRuntime] | viewport 640px: 터치 영역은 44px 이상이다. attached는 내용이 길어도 닫기 버튼이 밀려나지 않고 내용이 줄바꿈된다. | button; 아이콘만 있으므로 접근 가능한 이름; 닫힌 뒤 영역은 접근성 트리에서도 사라진다(hidden); 터치 영역 44px 이상 | slot:main, slot:header, slot:footer, slot:overlay, slot:grid-item | src/platform/families/button.mjs#renderButtonClose |
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
| purpose:table.filterable | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert / search input → 대소문자 구분 없이 행 전체 텍스트를 필터링하고 건수·빈 결과 문구를 갱신한다 [cardDataRuntimeFor] | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | region containing a labelled data table and search field; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderFilterable |
| purpose:table.expandable | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert / details summary click·Enter·Space → native disclosure opens the row detail and aria-expanded follows open state [cardDataRuntimeFor] | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | table; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderExpandable |
| purpose:table.grouped | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | table with rowgroup heading rows; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderGrouped |
| purpose:table.tree | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert / ArrowUp·ArrowDown·Home·End → roving focus moves between visible treeitems / ArrowRight·ArrowLeft·Enter·Space → expand, collapse, or activate the focused treeitem [cardDataRuntimeFor] | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | tree with labelled treeitems and nested groups; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderTree |
| purpose:table.inspector | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | article containing a definition list; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderInspector |
| purpose:table.log-viewer | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | region containing a labelled log table; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderLogViewer |
| purpose:table.diff | ready, partial, empty, loading, error | empty/loading/error → table base renders status text and aria-busy or role=alert | container and viewport 640px,800px: tables scroll within their own region; key/value and diff columns stack below 640px; long cells wrap. | article with two labelled, line-numbered code lists; table headers label data columns; filtering or disclosure behavior is exposed in rendered markup; responsive data remains readable without page overflow | slot:main, slot:grid-item | src/platform/families/data-display.mjs#renderDiff |
| purpose:feedback.confirm | closed, open, busy, error | trigger click → showModal로 열고 뒤 페이지를 inert로 만든다 [attachModal] / Escape·취소 → 닫고 연 버튼으로 포커스 복귀(busy 중에는 닫히지 않는다) / confirm → busy 상태로 확인 버튼에 스피너 | viewport 640px: sheet는 화면 아래에 붙고 버튼은 한 줄. dialog는 폭이 화면 안으로 제한된다. | dialog \| alertdialog(danger); danger는 role=alertdialog, 취소 버튼 autofocus; 제목과 설명은 aria-labelledby·aria-describedby로 연결; 닫으면 연 요소로 포커스 복귀 | slot:overlay, slot:main, slot:aside | src/platform/families/feedback.mjs#renderFeedbackConfirm |
| purpose:feedback.error | visible, dismissed, error | dismiss click·Escape → 배너를 숨기고 포커스를 부모로 옮긴다 [attachFeedback] / retry click → 재시도 동작(기반 버튼) | viewport 640px: 배너는 화면 폭을 채우고 동작 버튼은 아래로 내려간다. 메시지는 keep-all로 줄바꿈한다. | alert; 오류는 role=alert로 즉시 낭독; 오류 의미는 아이콘 모양·"오류:" 숨은 글·색으로 함께 전달; 원인과 해결 행동을 문장으로 쓴다 | slot:main, slot:header, slot:overlay | src/platform/families/feedback.mjs#renderFeedbackError |
| purpose:feedback.warning | visible, dismissed, closed, open | ack click → 경고를 확인하고 닫는다(기반 버튼·dismiss) [attachFeedback] / dialog confirm·cancel → 계속·취소 선택 [attachModal] | viewport 640px: 인라인 안내는 한 줄이 모자라면 버튼이 아래로 내려간다. 메시지 폭은 부모를 따른다. | status(inline) \| alertdialog(dialog); 경고는 삼각형 아이콘과 "주의:" 숨은 글로 전달(노랑만으로 구분하지 않는다); 경고색 글자는 어두운 단계(대비 4.5:1); 확인이 필요한 경고는 대화상자로 낸다 | slot:main, slot:header, slot:overlay | src/platform/families/feedback.mjs#renderFeedbackWarning |
| purpose:feedback.progress | pending, done | progress → native <progress>의 value 갱신(앱이 value를 바꾼다), indeterminate는 value 없음 / cancel click → 진행 취소(기반 버튼) | container -: 막대는 컨테이너 폭을 채운다. 단계 목록은 세로로 쌓인다. 퍼센트 글자는 줄바꿈하지 않는다. | progressbar(native progress) + status; <progress>에 접근 가능한 이름(aria-labelledby); 진행률 숫자를 글자로도 제공; 단계 상태는 아이콘·글자(완료·진행 중·대기)로 전달; indeterminate는 aria-busy | slot:main, slot:overlay, slot:aside | src/platform/families/feedback.mjs#renderFeedbackProgress |
| purpose:feedback.result | success, failure, pending | primary click → 다음 행동으로 이동(기반 버튼) / mount → 결과 영역이 role=status(실패는 alert)로 한 번 낭독된다 | viewport 640px: 가운데 정렬한 한 열 구성. 640px 이하에서 버튼은 세로로 쌓이고 전체 폭이 된다. 상세 목록은 값을 줄바꿈 없이 오른쪽에 둔다. | status \| alert(failure); 결과는 아이콘 모양·제목 글자·색으로 함께 전달; 제목은 h2(페이지) 또는 h3(인라인); 실패는 원인과 다음 행동을 문장으로 쓴다 | slot:main, slot:overlay | src/platform/families/feedback.mjs#renderFeedbackResult |
| purpose:info.status-badge | default, hover | hover → 설명이 있는 경우 툴팁 또는 보조 텍스트 표시 | fluid 640px: 줄바꿈 시 인라인 흐름 유지 | status; 상태를 색상만이 아니라 텍스트와 함께 전달; role=status 제공; 대비 4.5:1 이상 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderStatusBadge |
| purpose:info.avatar | default | display → 이미지 로딩 실패 시 이니셜 fallback 표시 | fixed 640px: 정해진 크기 토큰 유지 | img; aria-label 또는 alt로 이름 제공; 이니셜 표시 시 고대비 유지 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderAvatar |
| purpose:info.avatar-group | default | hover → 각 아바타 툴팁으로 전체 이름 안내 | fluid 640px: 가로 넘침 시 +N으로 축약 | group; 그룹 aria-label 제공; 초과 수치 명확히 안내 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderAvatarGroup |
| purpose:info.accordion | default, open, closed, focus | click·Enter·Space → 패널 토글 [INFO_MEDIA_RUNTIME] / ArrowDown·ArrowUp·Home·End → 헤더 간 포커스 이동 [INFO_MEDIA_RUNTIME] | fluid 640px: 너비 100% 채움 | region; 버튼에 aria-expanded 및 aria-controls; 패널에 role=region 및 aria-labelledby; 키보드 상호작용 완비 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderAccordion |
| purpose:info.collapsible | default, open, closed, focus | click·Enter·Space → 영역 토글 [INFO_MEDIA_RUNTIME] | fluid 640px: 너비 유연 처리 | region; aria-expanded 동기화; aria-controls 연결; hidden 속성 동기화 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderCollapsible |
| purpose:info.counter | default | display → 최대치 초과 시 축약 표시 | fixed 640px: 정해진 크기 유지 | status; 스크린리더용 설명 제공; 대비 4.5:1 이상 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderCounter |
| purpose:info.notification-indicator | default | display → 시각적 알림 표시 | fixed 640px: 크기 고정 | status; 스크린리더용 레이블 필수; 시각적 점에 aria-hidden | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderNotificationIndicator |
| purpose:info.keyboard-shortcut | default | display → 단축키 안내 | fixed 640px: 인라인 유지 | group; kbd 요소 시맨틱 사용; 전체 조합 aria-label 제공 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderKeyboardShortcut |
| purpose:info.metadata-row | default | display → 항목 목록 나열 | fluid 640px: 작은 화면에서 세로 적층 | list; dt/dd 시맨틱 구조 준수; 키-값 일대일 매핑 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderMetadataRow |
| purpose:info.stat-comparison | default | display → 통계 지표 전달 | fluid 640px: 카드 폭에 맞춰 유연 배치 | region; 수치와 증감 비교 명시; trend 상승/하락 접근 가능한 전달 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderStatComparison |
| purpose:media.responsive-image | default | display → 반응형 이미지 표시 | aspect-ratio 640px: 비율 고정 및 유연 너비 | figure; 의미 있는 alt 텍스트 필수; 반응형 가로세로 비율 유지 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderResponsiveImage |
| purpose:media.carousel | default, focus | click·Enter·Space → 이전/다음 슬라이드 이동 [INFO_MEDIA_RUNTIME] / ArrowLeft·ArrowRight·Home·End → 슬라이드 순회 [INFO_MEDIA_RUNTIME] | fluid 640px: 슬라이드 폭 100% | region; aria-roledescription="carousel"; 슬라이드에 aria-roledescription="slide" 및 aria-label; 현재 활성 슬라이드 안내 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderCarousel |
| purpose:media.audio-player | default, playing, paused, focus | click·Enter·Space → 재생/일시정지 토글 [INFO_MEDIA_RUNTIME] | fluid 640px: 컨트롤 너비 유연 처리 | region; aria-label="오디오 플레이어"; 재생 버튼에 aria-pressed; 진행 바에 role=progressbar | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderAudioPlayer |
| purpose:media.file-preview | default, hover, focus | click·Enter → 파일 다운로드/열기 | fluid 640px: 카드 또는 행 레이아웃 전환 | group; 파일명과 파일 크기 명시; 다운로드 링크에 명확한 aria-label | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderFilePreview |
| purpose:media.image-comparison | default, focus | input·drag → 슬라이더 값에 따라 분할선 이동 [INFO_MEDIA_RUNTIME] / ArrowLeft·ArrowRight·Home·End → 키보드로 분할선 조절 [INFO_MEDIA_RUNTIME] | fluid 640px: 너비 100% 비율 유지 | region; 슬라이더에 aria-label 제공; 이미지에 대체 텍스트 제공; 키보드 조작 완비 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderImageComparison |
| purpose:media.figure-caption | default | display → 도판 및 설명 표시 | fluid 640px: 너비 유연 처리 | figure; figure 및 figcaption 표준 시맨틱 준수; alt 텍스트 제공 | slot:main, slot:header, slot:footer, slot:aside, slot:grid-item | src/platform/families/info-media.mjs#renderFigureCaption |
| purpose:navigation.collapsible-sidebar | closed, open, focus, current | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] | viewport 640px: 열림 영역은 넓은 화면에서 18rem을 넘지 않고, 640px 이하에서는 전체 너비로 늘어난다. | complementary > navigation; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; 열림 상태에 aria-expanded·aria-controls가 실제 요소에 반영된다; 현재 위치 항목에 aria-current=page | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderCollapsibleSidebar |
| purpose:navigation.drawer | closed, open, focus | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] / 바깥 클릭 → 비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다 [EHI_RUNTIME] / Tab → 모달 오버레이 안에서 포커스를 순환시키고, 배경 스크롤은 열린 동안 잠근다 [EHI_RUNTIME] | viewport 640px: 넓은 화면에서는 오른쪽 가장자리의 패널, 640px 이하에서는 화면 아래의 시트로 열리고 내용이 길면 패널 안에서 스크롤한다. | dialog; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; 모달은 포커스를 내부에 가두고 닫을 때 호출 요소로 복귀; Escape·배경 클릭·닫기 단추로 닫힌다; 열려 있는 동안 배경 스크롤을 잠근다; 열림 상태에 aria-expanded·aria-controls가 일치 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderNavigationDrawer |
| purpose:navigation.command-menu | closed, open, focus, filtered, empty | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] / 바깥 클릭 → 비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다 [EHI_RUNTIME] / ArrowDown·ArrowUp·Home·End·Tab → 비활성 항목을 건너뛰며 항목 사이를 옮기고, Tab은 메뉴를 닫고 다음 요소로 넘어간다 [EHI_RUNTIME] / 입력 → 글자가 들어간 항목만 남기고, 맞는 항목이 없으면 안내 문구를 live region에 쓴다 [EHI_RUNTIME] | viewport 640px: 메뉴는 시작 요소 아래에 겹쳐 열리고 화면 가장자리를 넘으면 안쪽으로 밀린다. | button > dialog > menu; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; aria-expanded·aria-controls가 닫힌 메뉴와 연결된다; 항목을 고르면 메뉴가 닫히고 포커스가 시작 요소로 돌아온다; 명령 검색 입력은 이름을 갖고 결과 항목을 거른다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderCommandMenu |
| purpose:navigation.context-menu | closed, open, focus | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] / 바깥 클릭 → 비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다 [EHI_RUNTIME] / ArrowDown·ArrowUp·Home·End·Tab → 비활성 항목을 건너뛰며 항목 사이를 옮기고, Tab은 메뉴를 닫고 다음 요소로 넘어간다 [EHI_RUNTIME] / 오른쪽 클릭·ContextMenu 키·Shift+F10 → 시작 요소에서 메뉴를 연다 [EHI_RUNTIME] | viewport 640px: 메뉴는 시작 요소 아래에 겹쳐 열리고 화면 가장자리를 넘으면 안쪽으로 밀린다. | button > menu; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; aria-expanded·aria-controls가 닫힌 메뉴와 연결된다; 항목을 고르면 메뉴가 닫히고 포커스가 시작 요소로 돌아온다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderContextMenu |
| purpose:overlay.drawer | closed, open, focus | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] / 바깥 클릭 → 비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다 [EHI_RUNTIME] / Tab → 모달 오버레이 안에서 포커스를 순환시키고, 배경 스크롤은 열린 동안 잠근다 [EHI_RUNTIME] | viewport 640px: 넓은 화면에서는 오른쪽 가장자리의 패널, 640px 이하에서는 화면 아래의 시트로 열리고 내용이 길면 패널 안에서 스크롤한다. | dialog; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; 모달은 포커스를 내부에 가두고 닫을 때 호출 요소로 복귀; Escape·배경 클릭·닫기 단추로 닫힌다; 열려 있는 동안 배경 스크롤을 잠근다; 열림 상태에 aria-expanded·aria-controls가 일치 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderDrawer |
| purpose:overlay.popover | closed, open, focus | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] / 바깥 클릭 → 비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다 [EHI_RUNTIME] | viewport 640px: 패널은 시작 요소 아래에 열리고 화면 가장자리를 넘으면 안쪽으로 밀리며, 아래 공간이 없으면 위로 뒤집힌다. | dialog; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; 팝오버는 비모달이며 포커스를 가두지 않고 배경 스크롤을 잠그지 않음; Escape·바깥 클릭·닫기 단추로 닫힌다; 열림 상태에 aria-expanded·aria-controls가 일치 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderPopover |
| purpose:overlay.dropdown-menu | closed, open, focus, disabled | click·Enter·Space → 열기·닫기 상태와 aria-expanded가 실제 DOM에 반영된다 [EHI_RUNTIME] / Escape → 열린 오버레이를 닫고 시작 요소로 포커스를 복귀한다 [EHI_RUNTIME] / 바깥 클릭 → 비모달 팝업은 닫히고 포커스는 누른 요소에 남는다. 모달은 배경 클릭으로 닫히고 시작 요소로 복귀한다 [EHI_RUNTIME] / ArrowDown·ArrowUp·Home·End·Tab → 비활성 항목을 건너뛰며 항목 사이를 옮기고, Tab은 메뉴를 닫고 다음 요소로 넘어간다 [EHI_RUNTIME] | viewport 640px: 메뉴는 시작 요소 아래에 겹쳐 열리고 화면 가장자리를 넘으면 안쪽으로 밀린다. | button > menu; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; aria-expanded·aria-controls가 닫힌 메뉴와 연결된다; 항목을 고르면 메뉴가 닫히고 포커스가 시작 요소로 돌아온다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderDropdownMenu |
| purpose:overlay.contextual-help | hidden, shown, focus | focus·hover → 보조 설명을 보이고, 포인터는 설명 위로 옮겨도 유지된다 [EHI_RUNTIME] / Escape → 포커스를 옮기지 않고 보조 설명만 닫는다 [EHI_RUNTIME] / blur·pointer leave → 포커스가 다른 요소로 가면 포커스를 되돌리지 않고 설명을 닫는다 [EHI_RUNTIME] | viewport 640px: 설명은 시작 요소 아래에 떠 있고 화면 가장자리를 넘으면 안쪽으로 밀린다. | button > tooltip; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; aria-describedby는 도움말 tooltip의 실제 id를 가리킨다; Escape로 설명만 닫을 수 있고 포인터가 설명 위에 있어도 유지된다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderContextualHelp |
| purpose:feedback.callout | info, success, warning, error | Tab → 정적 문구라 포커스 정지점을 만들지 않는다 | viewport 640px: 문구는 본문 폭 안에서 줄바꿈되며 좁은 화면에서도 한 칸으로 읽힌다. | note; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; live region이 아니다: 화면이 바뀔 때 알리지 않고 읽는 순서에 놓인다; 의미는 색뿐 아니라 숨은 접두 문구와 아이콘으로도 전달된다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderCallout |
| purpose:feedback.circular-progress | determinate, indeterminate | value 변경 → 숫자·원 채움·aria-valuenow가 같은 값으로 함께 바뀐다(값이 없으면 진행 중 표시) | viewport 640px: 원은 3.5rem 고정 크기이고 설명 문구는 원 아래에서 줄바꿈된다. | progressbar; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; progressbar 값은 그려진 진행량과 숫자가 같다; 원 안의 숫자는 채움색이 아니라 표면 위에 놓여 대비가 유지된다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderCircularProgress |
| purpose:feedback.loading-overlay | loading | 표시 → 덮인 영역은 aria-busy=true가 되고 진행 문구가 live region으로 알려진다 | viewport 640px: 덮는 영역은 부모 폭을 따르고 36rem을 넘지 않는다. | status; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; 덮는 영역은 aria-busy=true이고 가려진 내용은 보조기기에서 숨긴다; 진행 문구는 role=status live region이다; 화면 전체가 아니라 영역 안에만 겹친다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderLoadingOverlay |
| purpose:feedback.status-indicator | success, warning, error, info, neutral | 문구 변경 → 같은 live region 노드의 문구가 바뀌면 보조기기가 알린다 | viewport 640px: 점과 문구는 한 줄로 놓이고 긴 문구는 줄바꿈된다. | status; 모든 조작 요소에 44px 이상 터치 영역; 긴 문구는 줄바꿈되며 뷰포트를 가로로 밀지 않음; 모션 감소 설정에서는 진행 장식 애니메이션을 정지; 상태 문구는 role=status aria-live=polite live region에 넣는다; 의미는 색뿐 아니라 점 모양(경고 마름모, 오류 사각)과 숨은 접두 문구로도 전달된다 | slot:main, slot:header, slot:aside | src/platform/families/ehi.mjs#renderStatusIndicator |
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
| purpose:card.kpi | 96 | 1152 | 864 | 288 |
| purpose:card.product | 180 | 2160 | 900 | 1260 |
| purpose:card.article | 72 | 864 | 768 | 96 |
| purpose:card.feature | 72 | 864 | 648 | 216 |
| purpose:card.profile | 48 | 576 | 408 | 168 |
| purpose:card.pricing | 16 | 192 | 48 | 144 |
| purpose:card.status | 240 | 2880 | 2280 | 600 |
| purpose:card.gallery | 96 | 1152 | 600 | 552 |
| purpose:card.comparison | 15 | 180 | 180 | 0 |
| purpose:card.notification | 15 | 180 | 180 | 0 |
| purpose:card.activity | 15 | 180 | 180 | 0 |
| purpose:card.integration | 15 | 180 | 180 | 0 |
| purpose:card.review | 15 | 180 | 180 | 0 |
| purpose:card.selection | 18 | 216 | 144 | 72 |
| purpose:card.dashboard-widget | 15 | 180 | 180 | 0 |
| purpose:card.financial-asset | 15 | 180 | 180 | 0 |
| purpose:button.primary | 54 | 648 | 540 | 108 |
| purpose:button.secondary | 24 | 288 | 216 | 72 |
| purpose:button.emphasis | 4 | 48 | 36 | 12 |
| purpose:button.destructive | 36 | 432 | 252 | 180 |
| purpose:button.icon | 12 | 144 | 144 | 0 |
| purpose:button.loading | 18 | 216 | 216 | 0 |
| purpose:button.toggle | 18 | 216 | 180 | 36 |
| purpose:button.split | 18 | 216 | 216 | 0 |
| purpose:button.menu | 12 | 144 | 144 | 0 |
| purpose:button.fab | 12 | 144 | 144 | 0 |
| purpose:button.copy | 12 | 144 | 144 | 0 |
| purpose:button.close | 12 | 144 | 108 | 36 |
| purpose:navigation.sidebar | 24 | 288 | 288 | 0 |
| purpose:navigation.topbar | 16 | 192 | 184 | 8 |
| purpose:navigation.tabs | 96 | 1152 | 1104 | 48 |
| purpose:navigation.bottom | 4 | 48 | 40 | 8 |
| purpose:form.search | 24 | 288 | 288 | 0 |
| purpose:form.auth | 12 | 144 | 144 | 0 |
| purpose:form.settings | 6 | 72 | 72 | 0 |
| purpose:form.filter | 12 | 144 | 144 | 0 |
| purpose:form.group | 81 | 972 | 891 | 81 |
| purpose:table.business | 160 | 1920 | 720 | 1200 |
| purpose:table.analytic | 80 | 960 | 528 | 432 |
| purpose:table.dense | 80 | 960 | 352 | 608 |
| purpose:table.filterable | 15 | 180 | 180 | 0 |
| purpose:table.expandable | 15 | 180 | 180 | 0 |
| purpose:table.grouped | 15 | 180 | 180 | 0 |
| purpose:table.tree | 15 | 180 | 180 | 0 |
| purpose:table.inspector | 15 | 180 | 180 | 0 |
| purpose:table.log-viewer | 15 | 180 | 180 | 0 |
| purpose:table.diff | 15 | 180 | 180 | 0 |
| purpose:feedback.confirm | 24 | 288 | 192 | 96 |
| purpose:feedback.error | 12 | 144 | 108 | 36 |
| purpose:feedback.warning | 12 | 144 | 108 | 36 |
| purpose:feedback.progress | 18 | 216 | 216 | 0 |
| purpose:feedback.result | 12 | 144 | 144 | 0 |
| purpose:info.status-badge | 15 | 180 | 180 | 0 |
| purpose:info.avatar | 6 | 72 | 72 | 0 |
| purpose:info.avatar-group | 6 | 72 | 72 | 0 |
| purpose:info.accordion | 6 | 72 | 72 | 0 |
| purpose:info.collapsible | 6 | 72 | 72 | 0 |
| purpose:info.counter | 18 | 216 | 216 | 0 |
| purpose:info.notification-indicator | 6 | 72 | 72 | 0 |
| purpose:info.keyboard-shortcut | 4 | 48 | 48 | 0 |
| purpose:info.metadata-row | 4 | 48 | 48 | 0 |
| purpose:info.stat-comparison | 4 | 48 | 48 | 0 |
| purpose:media.responsive-image | 8 | 96 | 96 | 0 |
| purpose:media.carousel | 4 | 48 | 48 | 0 |
| purpose:media.audio-player | 4 | 48 | 48 | 0 |
| purpose:media.file-preview | 6 | 72 | 72 | 0 |
| purpose:media.image-comparison | 2 | 24 | 24 | 0 |
| purpose:media.figure-caption | 4 | 48 | 48 | 0 |
| purpose:navigation.collapsible-sidebar | 1 | 12 | 12 | 0 |
| purpose:navigation.drawer | 1 | 12 | 12 | 0 |
| purpose:navigation.command-menu | 1 | 12 | 12 | 0 |
| purpose:navigation.context-menu | 1 | 12 | 12 | 0 |
| purpose:overlay.drawer | 1 | 12 | 12 | 0 |
| purpose:overlay.popover | 1 | 12 | 12 | 0 |
| purpose:overlay.dropdown-menu | 1 | 12 | 12 | 0 |
| purpose:overlay.contextual-help | 1 | 12 | 12 | 0 |
| purpose:feedback.callout | 1 | 12 | 12 | 0 |
| purpose:feedback.circular-progress | 1 | 12 | 12 | 0 |
| purpose:feedback.loading-overlay | 1 | 12 | 12 | 0 |
| purpose:feedback.status-indicator | 1 | 12 | 12 | 0 |

합계: 전체 24816개 중 허용 18423개, 거부 6393개. 허용은 패밀리 계약(변형·열린 기반 축 값, 금지 조합, 시각 패밀리 요구)과 기반 컴포넌트 계약(`resolveMember`)을 모두 통과한다고 보장하는 수가 아니라, 패밀리 계약만 통과한 수다. 기반 계약 위반은 렌더 때 `P_REL_CONTRACT`로 거부된다.
<!-- /generated:combos -->

목적 패밀리 × 시각 패밀리(각 패밀리 예시 기준)에서 거부되는 쌍과 이유.

<!-- generated:matrix -->
| 목적 패밀리 | bold | corporate-formal | dense-enterprise | editorial | elevated-material | expressive | glass | luxury | outline-precise | quiet | soft | tonal-layered |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| purpose:card.kpi | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.product | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.article | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.feature | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.profile | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.pricing | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.status | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.gallery | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.comparison | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.notification | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.activity | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.integration | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.review | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.selection | 허용 | 허용 | 허용 | 거부: purpose:card.selection × family:editorial: 테두리 0px가 이 패밀리의 하한 1px에 못 미친다 | 거부: purpose:card.selection × family:elevated-material: 테두리 0px가 이 패밀리의 하한 1px에 못 미친다 | 허용 | 허용 | 허용 | 허용 | 허용 | 거부: purpose:card.selection × family:soft: 테두리 0px가 이 패밀리의 하한 1px에 못 미친다 | 거부: purpose:card.selection × family:tonal-layered: 테두리 0px가 이 패밀리의 하한 1px에 못 미친다 |
| purpose:card.dashboard-widget | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:card.financial-asset | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.primary | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.secondary | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.emphasis | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.destructive | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.icon | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.loading | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.toggle | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.split | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.menu | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.fab | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.copy | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:button.close | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.sidebar | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.topbar | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.tabs | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.bottom | 허용 | 허용 | 허용 | 거부: purpose:navigation.bottom × family:editorial: 면이 투명하다(본문 위에 겹쳐 고정되는 요소는 불투명한 면이 필요하다) | 허용 | 허용 | 거부: purpose:navigation.bottom × family:glass: 면이 투명하다(본문 위에 겹쳐 고정되는 요소는 불투명한 면이 필요하다) | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:form.search | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:form.auth | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:form.settings | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:form.filter | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:form.group | 허용 | 허용 | 허용 | 거부: GROUP_EDITORIAL: editorial의 입력 외형은 underline이라 칸의 상자가 없어 애드온·버튼을 같은 테두리로 이을 수 없다 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.business | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.analytic | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.dense | 허용 | 허용 | 허용 | 거부: purpose:table.dense × family:editorial: 셀 상하 패딩 12px가 이 패밀리의 상한 8px를 넘는다 | 허용 | 허용 | 허용 | 거부: purpose:table.dense × family:luxury: 셀 상하 패딩 12px가 이 패밀리의 상한 8px를 넘는다 | 허용 | 허용 | 거부: purpose:table.dense × family:soft: 셀 상하 패딩 12px가 이 패밀리의 상한 8px를 넘는다 | 거부: purpose:table.dense × family:tonal-layered: 셀 상하 패딩 12px가 이 패밀리의 상한 8px를 넘는다 |
| purpose:table.filterable | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.expandable | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.grouped | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.tree | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.inspector | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.log-viewer | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:table.diff | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.confirm | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.error | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.warning | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.progress | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.result | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.status-badge | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.avatar | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.avatar-group | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.accordion | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.collapsible | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.counter | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.notification-indicator | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.keyboard-shortcut | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.metadata-row | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:info.stat-comparison | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:media.responsive-image | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:media.carousel | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:media.audio-player | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:media.file-preview | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:media.image-comparison | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:media.figure-caption | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.collapsible-sidebar | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.drawer | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.command-menu | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:navigation.context-menu | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:overlay.drawer | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:overlay.popover | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:overlay.dropdown-menu | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:overlay.contextual-help | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.callout | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.circular-progress | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.loading-overlay | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| purpose:feedback.status-indicator | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
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

- `tests/platform-family-a11y.test.mjs`: 37종 전부. 계약의 조건 문구마다 마크업 단언이 하나씩 있어야 하고(키가 조건과 일대일), 계약이 바뀌면 단언 없는 조건이 시험을 깨뜨린다. 마크업으로 볼 수 없는 조건(터치 크기·대비)은 브라우저 시험 또는 대비 시험으로 넘기고 그 위치를 적는다. 예시 렌더로 루트 역할·Tab 순서·조건별 단언을 보고, 모든 변형 값 × 시각 패밀리 4종(1,000여 렌더)에서 id 중복, 끊어진 `aria-labelledby`·`describedby`·`controls`·`activedescendant`, 이름 없는 컨트롤, 라벨 없는 입력, 양수 `tabindex`, 노출된 장식 아이콘을 본다.
- `e2e/platform-family-a11y.spec.mjs`: 37종 × 390·1280에서 Tab이 DOM 순서와 화면 읽기 순서대로 모든 정지에 닿고 포커스 표시가 있는지, 계약의 크기 조건(44px·56px·24px, 같은 줄 높이, 전체 폭), 탭·대화상자·콤보박스·메뉴 토글·비밀번호 보기·정렬·닫기의 키 조작과 상태 전이를 본다. 닫기 버튼은 관례상 모서리에 놓이고 DOM 끝에 있으므로 화면 읽기 순서 비교에서 뺀다.

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
- 기준선은 목적 패밀리 등록 수와 페이지 출력 사용 수를 분리한다. `registered.purposeFamily`는 레지스트리 수, `distinct.purposeFamilies`는 품질 검증을 통과한 대표 페이지 Blueprint의 `materials.purposes`에서 센 고유 ID다. `registered.family`와 `distinct.families`는 등록된 시각 패밀리 수, `verifiedFamilies`는 검증 페이지 출력에 실제 나타난 고유 시각 패밀리 수다. 페이지에서 쓰이지 않은 등록 목적 패밀리를 사용 수에 더하지 않는다.

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
