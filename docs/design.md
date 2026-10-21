# 설계서

## 1. 한 줄 요약

이 저장소는 **사전에 정의한 카탈로그 안의 선택만 JSON 트리로 조립해 HTML/CSS를 만드는 컴파일러**입니다. 규칙은 프롬프트가 아니라 코드가 강제합니다. 카탈로그에 없는 값, 허용되지 않은 조합, 대비가 모자라는 색, 손으로 고친 산출물은 생성되거나 통과하지 못합니다.

카탈로그 2.1.0은 템플릿 85종(구성 변형 366개), 테마 54종(테마 변형 239개), 팔레트 427개(11개 색 계열), 셸 10종, 부품 55종, 페이지 유형 16종, 아이콘 87개, 스타일 축 15개입니다. 템플릿·테마·팔레트는 서로 독립이라 어느 조합도 고를 수 있고, 템플릿 구성 변형과 테마 변형이 그 위에 곱해집니다.

## 2. 파이프라인과 강제 경계

```
Blueprint(JSON) → 검증기(스키마·간선·조합·페이지 유형·링크·데이터)
               → 토큰 해석(팔레트×모드, 대비 게이트)
               → 렌더(부품 → HTML) + 스타일(축 → CSS, 사용 부품만)
               → 산출물 5파일 + SHA-256 해시 → check로 재현 검사
```

- **입력 경계.** 알 수 없는 속성은 모두 `UNKNOWN_KEY`입니다. 문자열은 항상 이스케이프되고, 링크는 HTTPS·`#main`·페이지에 선언된 앵커만 허용합니다. 생성 페이지의 스크립트는 고정 런타임(폼 확인, 탭, 필터 칩, 드롭다운) 하나뿐이고 CSP로 네트워크를 막습니다.
- **한계.** 카탈로그와 검사기 자체를 고칠 권한은 막지 못합니다. 새 표현이 필요하면 근거와 반례를 남겨 카탈로그를 개정합니다. 사용자 승인이나 미감을 보증하는 기록은 만들지 않습니다.
- **버전.** Blueprint 2.0과 카탈로그 2.1.0이 아니면 거부합니다. 1.x 입력은 `kit migrate`로 변환합니다.

## 3. 스타일 축 15개

모든 값은 `src/styles/base.mjs`와 셸·부품 CSS에 구현되어 있고, 테스트가 enum과 구현표의 일치를 확인합니다.

| 축 | 이름 | 값 |
|---|---|---|
| `mode` | 모드 | `light` `dark` `auto` |
| `shell` | 셸(내비 구조) | `sidebar` `topbar` `editorial` `split` `rail` `centered` `stacked` `dock` `minimal` `masthead` |
| `typography` | 서체 조합 | `sans` `serif` `mono` `editorial` `rounded` `geometric` `humanist` `grotesk` `swiss` `newsroom` `literary` `luxe` `poster` `slab` `tech` `bookish` `terminal` `condensed` |
| `density` | 밀도 | `compact` `comfortable` `spacious` |
| `radius` | 모서리 | `square` `subtle` `soft` `round` `bubble` |
| `control` | 컨트롤 모양 | `match` `pill` `square` |
| `elevation` | 깊이 | `flat` `outline` `soft` `lifted` `glow` `hard` |
| `motion` | 모션 | `none` `subtle` `lively` |
| `icon` | 아이콘 스타일 | `line-fine` `line` `line-bold` `line-square` `solid` `duotone` |
| `ornament` | 장식 | `none` `geometric` `organic` `lines` `dots` |
| `backdrop` | 배경 | `plain` `tint` `gradient` `grid` |
| `width` | 콘텐츠 폭 | `narrow` `standard` `wide` `full` |
| `scale` | 타입 스케일 | `tight` `balanced` `dramatic` |
| `weight` | 굵기 | `regular` `medium` `bold` |
| `footer` | 푸터 | `simple` `columns` `minimal` |

축 값이 가리키는 시각 기반(타입 스케일 비율, 전폭 밴드와 섹션 리듬, 열린 부품과 상자 부품, 앱 화면의 틴트 바탕)은 docs/foundation.md에 진단 수치와 함께 기록합니다. 같은 축 값이라도 페이지 유형(랜딩·앱·콘텐츠)에 따라 쓰이는 크기와 간격이 다릅니다. 이미지 자리의 주제 일러스트(motif 37종), 제품 목업, 상품 카드는 docs/ui-level-up.md에 레퍼런스 대비와 함께 기록합니다.

## 4. 테마 54종

테마는 분류, 설명, 기본 축 프로필, 금지 값, **추천 팔레트 순서**, **테마 변형**(축 값 묶음) 3개 이상으로 구성됩니다. 팔레트는 테마에 묶이지 않습니다. 추천은 조립기에서 먼저 보일 뿐이고, 427개 어느 팔레트도 어느 테마와 쓸 수 있습니다. 테마가 금지한 값은 거부됩니다(`THEME_FORBID`). 예를 들어 시빅은 글로우·그라데이션을, 네온은 라이트 모드를 금지합니다. 테마 변형은 같은 시각 언어를 다른 결로 입는 방법이며(예: 워크스페이스의 촘촘한 운영·레일 집중·다크 워크스페이스), 금지 값과 축 조합 금지를 그대로 따릅니다.

| 분류 | 테마 |
|---|---|
| 업무·제품 | 워크스페이스(`workspace`), 레저(`ledger`), 콘솔(`console`), 오로라(`aurora`), 트러스트(`trust`), 인사이트(`insight`), 허브(`hub`), 프리시전(`precision`), 엔터프라이즈(`enterprise`), 데브툴(`devtool`) |
| 브랜드·마케팅 | 네온(`neon`), 플레이풀(`playful`), 스튜디오(`studio`), 갤러리(`gallery`), 브루탈(`brutalist`), 레트로(`retro`), 시그널(`signal`), 럭셔리(`luxe`), 스위스(`swiss`), 컬러블록(`colorblock`) |
| 읽기·문서 | 에디토리얼(`editorial`), 페이퍼(`paper`), 매뉴얼(`manual`), 저널(`journal`), 매거진(`magazine`), 뉴스룸(`newsroom`), 아카데믹(`academic`) |
| 생활·서비스 | 보태니컬(`botanical`), 클라우드(`cloud`), 클리닉(`clinic`), 다이닝(`dining`), 카페(`cafe`), 스테이(`stay`), 커머스(`commerce`), 뷰티(`beauty`), 리얼티(`realty`), 아틀리에(`atelier`), 러닝(`learning`), 웨딩(`wedding`), 키즈(`kids`), 와인바(`wine`), 가든(`garden`) |
| 공공·기관 | 시빅(`civic`), 한지(`hanji`), 헤리티지(`heritage`), 스쿨(`school`), 뱅크(`bank`) |
| 모바일·앱 | 클래리티(`clarity`), 포켓(`pocket`), 녹턴(`nocturne`), 스포츠(`sport`), 솔라(`solar`), 오션(`ocean`), 게임(`game`) |

## 5. 토큰과 대비

팔레트의 원본 색은 보존하고, 역할별 토큰을 팔레트×모드마다 계산합니다. 역할은 `canvas surface soft sunken accentSoft text muted action link focus rule border success warning danger info accent accentInk chart1~5`입니다. 기준을 넘지 못하면 원색을 검정(라이트) 또는 흰색(다크) 쪽으로 최소한만 이동합니다.

| 검사 | 기준 | 범위 |
|---|---|---|
| 본문 글자 | 7:1 | 5개 배경 |
| 보조·링크·상태·보조색 글자 | 4.5:1 | 5개 배경 |
| 포커스 링·구조선·차트색 | 3:1 | 배경과 표면 |
| 그라데이션 위 본문·보조 글자 | 7:1 / 4.5:1 | 두 그라데이션 각 11점 |
| 채움 위 글자(행동·강조·호버) | 4.5:1 | 각 채움색 |

전수 결과: **427개 팔레트 × 2모드 = 854모드, 89,670쌍 전부 통과**. 가장 빠듯한 쌍은 rule/canvas(creamy-pastel-summer/dark) 3.00:3입니다. 반전 구역(`surface: inverse`, `tone: inverse`)은 반대 모드의 같은 검증을 통과한 토큰 세트를 씁니다. 통과는 WCAG 전체 준수나 시각 품질을 뜻하지 않습니다.

## 6. 부품 55종

| 그룹 | 수 | 부품 |
|---|---|---|
| 구조 | 3 | 페이지(`page`), 페이지 제목(`page-header`), 히어로(`hero`) |
| 레이아웃 | 10 | 섹션(`section`), 그리드(`grid`), 2분할(`split`), 본문+보조 영역(`aside`), 벤토 격자(`bento`), 탭(`tabs`), 탭 패널(`tab`), 칸반(`kanban`), 칸반 열(`lane`), 가로 스크롤 줄(`reel`) |
| 데이터 | 10 | 작업 카드(`task`), 타임라인(`timeline`), 목록+상세(`master-detail`), 대화(`chat`), 월간 달력(`calendar`), 지표(`metric`), 표(`table`), 목록(`list`), 속성 목록(`properties`), 차트(`chart`) |
| 콘텐츠 | 19 | 단계 안내(`steps`), 카드(`card`), 본문(`prose`), 액션 그룹(`actions`), 자주 묻는 질문(`faq`), 인용·후기(`quote`), 기능 목록(`feature-list`), 고객사 이름 줄(`logo-cloud`), 행동 유도 띠(`cta`), 태그 모음(`tags`), 팀 소개(`team`), 코드 블록(`code`), 주문·요약 박스(`summary`), 구매 박스(`buy-box`), 리뷰(`reviews`), 메뉴판(`menu`), 구분선(`divider`), 요금제(`pricing`), 요금제 항목(`plan`) |
| 폼 | 1 | 폼(`form`) |
| 피드백·상태 | 4 | 알림(`notice`), 진행률(`progress`), 상태 화면(`empty-state`), 스켈레톤(`skeleton`) |
| 미디어 | 2 | 이미지 자리(`media`), 갤러리(`gallery`) |
| 내비게이션 | 6 | 브레드크럼(`breadcrumb`), 페이지네이션(`pagination`), 검색·필터 바(`filter-bar`), 단계 표시(`stepper`), 링크 목록(`links`), 목차(자동)(`toc`) |

각 부품은 허용 속성, 선택 속성, 허용 자식, 자식 수, 예시를 카탈로그 한 곳에 둡니다. 예시는 감사 단계에서 실제로 검증·컴파일됩니다. 제목 단계는 구조에서 계산되어 건너뛰지 않고, 표 첫 열은 행 머리글이며, 차트에는 텍스트 대안과 데이터 표가 붙습니다.

## 7. 페이지 유형 16종

| 유형 | 필수 | 금지·허용 | 셸·폭 제한 |
|---|---|---|---|
| 일반(`general`) | — | — | 모든 셸 |
| 랜딩(`landing`) | hero | 금지: kanban, master-detail, chat, calendar, toc, filter-bar, pagination | topbar, editorial, split, centered, stacked, minimal, masthead |
| 대시보드(`dashboard`) | metric·chart·table·list·kanban·calendar | 금지: hero, pricing, cta, logo-cloud, quote | sidebar, topbar, split, rail, stacked, dock |
| 데이터 리포트(`data`) | chart·table·metric | 금지: hero, pricing, cta, logo-cloud, quote | sidebar, topbar, split, rail, stacked, dock |
| 목록·탐색(`listing`) | table·list·grid·filter-bar·reel·gallery·team | 금지: hero, pricing, cta | 모든 셸 |
| 협업·소통(`community`) | chat·master-detail·kanban·list·calendar | 금지: hero, pricing, cta, logo-cloud | sidebar, topbar, split, rail, centered, stacked, dock |
| 문서·레퍼런스(`docs`) | prose·code·steps·faq·properties·table·timeline | 금지: hero, pricing, logo-cloud, buy-box, summary | sidebar, topbar, editorial, split, centered, stacked, masthead |
| 글(`article`) | prose | 금지: hero, pricing, logo-cloud, kanban, master-detail, chat, calendar, buy-box, summary, menu | sidebar, topbar, editorial, split, centered, stacked, minimal, masthead / narrow, standard |
| 블로그 목록(`blog`) | card·list·reel | 금지: kanban, master-detail, chat, calendar, pricing, buy-box, summary | topbar, editorial, split, centered, stacked, minimal, masthead / narrow, standard, wide |
| 커머스(`commerce`) | buy-box·grid·gallery·summary·menu·reel | 금지: kanban, master-detail, chat, calendar, code | sidebar, topbar, editorial, split, centered, stacked, dock, masthead |
| 포트폴리오(`portfolio`) | gallery·media·bento·grid·reel | 금지: kanban, master-detail, chat, calendar | 모든 셸 |
| 요금제(`pricing`) | pricing | 금지: kanban, master-detail, chat, calendar | topbar, editorial, split, centered, stacked, minimal, masthead |
| 폼(`form`) | form | 금지: hero, pricing, logo-cloud, kanban, master-detail, chat, calendar | 모든 셸 / narrow, standard |
| 설정(`settings`) | form·list·properties | 금지: hero, pricing, quote, logo-cloud, cta, gallery | sidebar, topbar, split, rail, centered, stacked, dock |
| 인증(`auth`) | form | 허용: page-header, form, notice, actions, links, divider, empty-state · 최상위 4개 이하 | centered, minimal, split, topbar, stacked / narrow, standard |
| 오류·상태 페이지(`error`) | empty-state | 허용: page-header, empty-state, actions, links, notice · 최상위 4개 이하 | 모든 셸 |

## 8. 규칙 20개와 금지 조합 11개

| 규칙 | 내용 | 오류 코드 |
|---|---|---|
| R01 | 허용된 속성·값(variant 포함)만. 알 수 없는 키와 범위 밖 값은 실패. | UNKNOWN_KEY, ENUM, STRING, NUMBER |
| R02 | 허용 간선·자식 수·깊이·노드 수로 위계 유지. | CHILD_TYPE, ARRAY_LENGTH, DEPTH, NODE_LIMIT |
| R03 | 페이지 첫 위치에 h1 하나, 이후 제목 단계는 구조에서 계산되어 건너뛰지 않음. | PAGE_HEADER |
| R04 | 한 액션 그룹(액션 묶음·히어로·CTA·페이지 제목)에 주 액션 하나. | PRIMARY_ACTION |
| R05 | 모든 팔레트×모드×역할 쌍: 본문·보조·링크·상태색 4.5:1, 본문 7:1, 포커스·구조선·차트색·그라데이션 위 글자까지 검사. | audit |
| R06 | 데이터 부품은 로딩·빈·오류·부분 성공·권한 없음 상태를 가지며 ready·partial에는 실제 데이터가 있어야 함. | STATE_DATA |
| R07 | 텍스트 이스케이프·HTTPS 또는 선언된 앵커 링크·고정 런타임, 임의 HTML/CSS 불가. | URL |
| R08 | 입력·카탈로그·산출물 일치 검사, 버전 불일치 거부, 생성물 수동 수정 거부. | VERSION, CATALOG_VERSION, check |
| R09 | 축 조합 금지(X01~X11): 접근성·가독성·구조상 함께 쓸 수 없는 값. | AXIS_BAN |
| R10 | 테마가 금지한 축 값(예: 시빅의 글로우·그라데이션) 거부. | THEME_FORBID |
| R11 | 페이지 유형 계약: 필수 부품·금지 부품·허용 셸/폭·최대 노드·상태 페이지 구성. | PAGE_REQUIRE, PAGE_FORBID, PAGE_ALLOW, PAGE_MAX, PAGE_SHELL, PAGE_WIDTH, PAGE_SECOND |
| R12 | 내비 구조: 셸별 항목 수 상한과 아이콘 필수(레일·하단 탭), 드롭다운 메뉴는 가로 셸에서 최대 2개, 푸터 링크 조건. | NAV_COUNT, NAV_ICON, FOOTER_LINKS, NAV_MEGA, NAV_GROUP |
| R13 | 페이지당 히어로 하나, 요금제 추천 하나, 탭·칸반의 중첩 금지. | SINGLE_HERO, FEATURED_PLAN, NESTED_TABS, HERO_POSITION |
| R14 | 의미 있는 이미지 대체 텍스트 필수, 모호한 링크 라벨 금지. | LINK_LABEL, STRING |
| R15 | 데이터 일관성: 표 열 폭, 차트 계열 길이·값, 달력 날짜, 지표 추세 쌍, 진행 목록 선택값. | TABLE_WIDTH, CHART_SHAPE, CALENDAR_DAY, METRIC_TREND, SELECTED_RANGE, STEPPER_RANGE, PAGINATION_RANGE |
| R16 | 폼 접근성: 필드 id 유일, select·radio 선택지 계약, options 오용 금지. | DUPLICATE_ID, SELECT_OPTIONS, FIELD_OPTIONS |
| R17 | 앵커 링크는 같은 페이지에 선언된 anchor만, 목차는 anchor 있는 섹션 2개 이상. | ANCHOR_MISSING, ANCHOR_DUPLICATE, TOC_EMPTY |
| R18 | 변형 조건: 미디어 카드는 visual, 링크 카드는 액션, 오류성 상태 화면은 액션 필수. | VARIANT_REQUIRES, HERO_VISUAL |
| R19 | auto 모드는 밝은/어두운 두 토큰 세트를 모두 검증하고 prefers-contrast·forced-colors를 따름. | audit |
| R20 | 간격 계약(S01~S10): 간격은 밀도 토큰과 4px 격자 값만 쓰고, 색 섹션 중첩·섹션 3단 중첩처럼 안쪽 여백이 겹치는 구성은 거부. | SURFACE_NEST, SECTION_DEPTH |

축 조합 금지는 각각 근거와 대안 값을 가집니다. 대안은 작성기의 "자동 수정"과 `repairAxes`가 사용하며, 검증기는 값을 고치지 않고 거부만 합니다.

| 번호 | 조합 | 이유 | 대안 |
|---|---|---|---|
| X01 | density × shell | 하단 탭바는 44px 터치 타깃이 필요한데 compact 밀도는 이를 줄입니다. | density=comfortable |
| X02 | width × shell | 760px 폭에 224~280px 내비 열을 더하면 본문이 480px 아래로 줄어듭니다. | width=standard |
| X03 | width × shell | 읽기 중심 셸에 1600px 폭을 주면 한 줄이 읽기 한계(약 75자)를 넘습니다. | width=wide |
| X04 | elevation × backdrop | 굵은 오프셋 그림자는 단색 바탕에서만 윤곽이 분명합니다. | backdrop=plain |
| X05 | elevation × mode | 글로우는 밝은 바탕에서 보이지 않아 경계 신호가 사라집니다. dark 또는 auto에서만 허용합니다. | elevation=soft |
| X06 | typography × scale | 모노스페이스 제목은 큰 크기에서 24ch를 넘어 모바일에서 넘칩니다. | scale=balanced |
| X07 | radius × density | 28px 반경은 16px 안쪽 여백을 침범해 내용이 잘립니다. | density=comfortable |
| X08 | footer × shell | 링크 열 푸터는 내비 구조가 있는 셸에서만 의미가 있습니다. | footer=simple |
| X09 | icon × density | 1.5px 선을 작은 아이콘에 쓰면 3:1 비텍스트 대비를 안정적으로 유지하기 어렵습니다. | icon=line |
| X10 | backdrop × ornament | 격자 위에 점 패턴을 겹치면 시각 소음이 됩니다. | ornament=none |
| X11 | motion × elevation | 움직임은 깊이 변화로 설명되어야 하는데 flat에는 변화할 깊이가 없습니다. | motion=subtle |

내비 항목 수 상한은 셸마다 다릅니다: sidebar 8, topbar 6, editorial 5, split 6, rail 7, centered 6, stacked 8, dock 5, minimal 2, masthead 6. 레일과 하단 탭은 모든 항목에 아이콘이 필요합니다.

## 9. 템플릿 85종

| 페이지 유형 | 템플릿 |
|---|---|
| 일반 | 팀 소개(`about-team`), 음악 플레이어(`music-player`) |
| 랜딩 | SaaS 서비스 소개(`saas-landing`), 앱 소개(`app-landing`), 제품 소개(`product-landing`), 행사 안내(`event-landing`), 대기자 등록(`waitlist`), 캠페인·후원(`campaign-donate`), 강의 소개(`learning-course`), 피트니스(`fitness-landing`), 에너지·태양광(`solar-landing`), 여행 소개(`travel-ocean`), 박물관·재단(`museum-home`), 전통 문화 여행(`hanji-journey`), 카페 홈(`cafe-home`), 병원 홈(`clinic-home`), 기업용 솔루션 소개(`b2b-solution`), 개발자 도구 소개(`devtool-landing`), 럭셔리 브랜드(`luxury-brand`), 캠페인 포스터형 소개(`campaign-poster`), 청첩장(`wedding-invite`), 어린이 클래스(`kids-class`), 금융 상품 안내(`bank-product`), 게임 출시 안내(`game-launch`) |
| 대시보드 | 프로젝트 현황 대시보드(`dashboard-overview`), 프로젝트 보드(`project-board`), 영업 현황 대시보드(`sales-dashboard`), 재무 현황(`finance-overview`), 인사 현황(`hr-people`) |
| 데이터 리포트 | 분석 리포트(`dashboard-analytics`), 감사 로그(`audit-log`), 서비스 상태(`status-page`) |
| 목록·탐색 | 관리자 목록(`admin-table`), 구성원 디렉터리(`team-directory`), 채용 공고 목록(`job-board`), 강좌 목록(`course-catalog`), 매물 검색(`property-search`), 행사 일정표(`event-schedule`) |
| 협업·소통 | 메시지함(`inbox`), 팀 대화(`team-chat`), 월간 일정(`calendar-view`), 고객 문의 대기열(`support-queue`) |
| 문서·레퍼런스 | 레퍼런스 문서(`docs-reference`), 튜토리얼(`tutorial`), 변경 기록(`changelog`), 도움말 센터(`help-center`), 민원 안내(`civic-service`), 장애 회고(`incident-report`), 채용 상세(`job-detail`), API 레퍼런스(`api-reference`) |
| 글 | 읽는 문서(`article`), 블로그 글(`blog-post`), 정책 문서(`policy`), 레시피(`recipe-detail`), 연구 논문(`research-paper`) |
| 블로그 목록 | 블로그 목록(`blog-index`), 뉴스 메인(`news-home`) |
| 커머스 | 상품 상세(`product-detail`), 상품 목록(`product-listing`), 결제(`checkout`), 주문 배송 조회(`order-tracking`), 뷰티 상세(`beauty-detail`), 메뉴판(`menu-dining`), 부동산 매물(`realty-detail`), 숙소 상세(`stay-detail`), 식물 가게 상품 목록(`garden-shop`), 와인 리스트(`wine-list`) |
| 포트폴리오 | 에이전시 홈(`agency-home`), 포트폴리오 모음(`portfolio-grid`), 사례 연구(`case-study`) |
| 요금제 | 요금 비교(`pricing-page`) |
| 폼 | 문의하기(`contact`), 온보딩 단계(`onboarding-wizard`), 설문(`survey`) |
| 설정 | 결제·구독 관리(`billing`), 설정(`settings`), 프로필(`profile`) |
| 인증 | 로그인(`login`), 회원가입(`signup`), 비밀번호 재설정(`forgot-password`) |
| 오류·상태 페이지 | 404 페이지(`not-found`), 500 오류(`server-error`), 403 권한 없음(`forbidden`), 점검 안내(`maintenance`), 오프라인(`offline`) |

템플릿은 어느 테마와도 조합됩니다. 테마의 기본 셸이 페이지 유형과 맞지 않으면 합성기가 템플릿의 셸로 대체하고, 금지 조합은 `repairAxes`가 해결합니다.

## 10. 검사 체계

| 층 | 명령 | 확인하는 것 | 최근 수치 |
|---|---|---|---|
| 계약·CLI | `node --test` | 스키마, 규칙별 거부, 카탈로그 무결성, 변형·팔레트 계약, 조립기 순수 함수, 번들 동일성 | 테스트 87개 |
| 감사 | `node scripts/audit.mjs` | 증거 대조, 전 팔레트 대비, 부품 예시, 템플릿×테마, 쌍별 커버링, 축 요인분해 | 대비 89,670쌍, 컴파일 4,590+1,249+1000+12,496개 |
| 재현 | `check-generated` | 새 빌드와 저장소 산출물의 바이트 일치 | 생성 파일 수는 verification.md |
| 브라우저 | `npm run test:browser` | 작성기, 템플릿 3폭 오버플로, 구조 접근성, 키보드 포커스, auto 모드, 갤러리(오프라인) | Chromium 13개 흐름 |

가능한 조합 공간(축·팔레트만 센 값이며 템플릿·구성 변형은 곱하지 않았습니다)은 축 간 규칙으로 연결되는 묶음별로 나누어 세어 **46,503,809,181,648개**입니다(팔레트 포함, 규칙 필터 뒤). 이 가운데 쌍별 커버링 1000개 조합이 허용 가능한 축 값 쌍 6,927개를 모두 덮고 실제로 컴파일됩니다. 전체 공간의 육안 검수는 하지 않았습니다.

## 11. 산출물과 사용

- 작성기(`index.html`): 템플릿과 구성 변형, 테마와 테마 변형, 팔레트(계열 필터·검색), 모드, 14개 축을 고르고 트리를 편집합니다. 미리보기는 휴대폰·태블릿·데스크톱·맞춤 폭을 고정 폭으로 그린 뒤 영역에 맞춰 줄여서 가로로 잘리지 않으며, **새 창**과 **전체 화면 모달**로 크게 볼 수 있습니다. 테마·페이지 유형이 막은 값은 고를 수 없게 하고, 다른 축과 부딪히는 값은 규칙의 대안으로 부딪힌 축을 함께 바꿉니다. 카탈로그 탭에서는 템플릿·테마·팔레트·부품의 실제 렌더를 보고 바로 조립을 시작합니다.
- 갤러리(`site/gallery/index.html`): 컴파일러를 포함한 단일 파일. 휴대폰에서 템플릿·테마·부품·축을 열어 보고 저장합니다.
- CLI: `catalog | templates | themes | init | migrate | validate | build | check`.
- 예시: `site/examples/<template>/` 85개, `site/examples/themes/<theme>/` 54개.
- 카탈로그 API: `site/v1/catalog.json`, `site/v1/blueprint.schema.json`.

## 12. 출처와 라이선스

- 토큰·타이포·간격·상태 철학: winterholic-design-system의 winterholic-base 문서(04 모양·깊이, 05 모션, 07 상태, 08 접근성, 09 다크, 12 페이지 패턴)와 로컬 `frontend-design` 스킬.
- 팔레트: [Coolors](https://coolors.co/palettes/popular) 인기 목록을 렌더해 관측한 두 번의 기록. 2026-10-18 후보 목록(`docs/evidence/coolors-palettes.json`)과 2026-10-20 좋아요 수가 있는 인기 목록 73개 페이지(`docs/evidence/coolors-popular-2026-10-20.json`). 각 팔레트에 원본 URL을 보존했습니다. 선정 방법과 수치는 [팔레트 근거](palettes.html)에 있습니다.
- 접근성 기준: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) SC 1.4.3, 1.4.11, 2.5.8, 1.1.1, 2.4.4.

## 13. 범위 밖과 알려진 한계

- 상태가 있는 위젯(모달, 토스트의 자동 소멸)과 실제 지도·결제·인증 동작은 정적 코드 범위 밖입니다.
- 실제 Safari/iOS, 스크린리더, 고대비 모드의 실기기 검증은 하지 않았습니다(Chromium 에뮬레이션만).
- Coolors 이름·팔레트의 재사용 조건은 확인하지 않았습니다. 각 팔레트의 원본 URL을 남겼습니다.
- 정확한 미감은 보증하지 않습니다. 규칙은 접근성·일관성·구조의 하한을 지킬 뿐입니다.
- 서체는 시스템 폰트 스택입니다. 웹폰트를 싣지 않는 이유(CSP와 외부 요청 금지)와 결과는 docs/foundation.md에 있습니다.
