# 격차 분석

## 1. 목적과 방법

사용자 피드백은 "너무 부실하다. 동료분 레포는 굉장히 다양한 테마·레이아웃 컨셉을 반영하는데, 거기에 더 보완해서 더 완성도 높게 만들어야 한다"였습니다. 이 문서는 동료분 레포의 축과 수량을 전수 목록화하고, 이 저장소(카탈로그 2.0.0)와 항목별로 대조합니다.

- 대조 대상: [yehsb123/design-system-kit](https://github.com/yehsb123/design-system-kit) 커밋 `a72f5b8`. 라이선스는 **AGPL-3.0** 입니다.
- 가져온 것은 **축의 이름·값의 범위·수량**뿐입니다(`docs/evidence/peer-axes.json`). 코드, 토큰 값, CSS, 문구, 아이콘 그림은 가져오지 않았습니다. 이 저장소의 아이콘 87개는 24px 격자에서 새로 그렸습니다.
- 철학만 빌렸습니다. 동료분 레포는 프롬프트에 규칙을 심는 도구이고, 이 저장소는 **카탈로그 밖의 값은 코드가 생성하지 못하게** 강제합니다.
- 이 표의 대응 관계는 `src/catalog/coverage.mjs`와 각 테마의 `covers`에 데이터로 있고, `tests/catalog.test.mjs`가 실제 카탈로그와 대조합니다. 문서가 주장만 하고 코드가 따르지 않는 상태를 막습니다.

## 2. 동료분 레포 인벤토리

| 항목 | 수량 | 관찰된 값 |
|---|---|---|
| 디자인 시스템 | 38 | 분류 7종: 앱 4, SaaS 7, 엔터프라이즈 9, 생활 서비스 4, 랜딩 5, 개발·데이터 6, 협업 3 |
| 서체 | 33종 | 시스템마다 한 가지 대표 서체 |
| 카드 모서리 | 12값 | 0px, 2px, 4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 22px, 28px |
| 버튼 모서리 | 14값 | 0px, 2px, 3px, 4px, 5px, 6px, 8px, 10px, 12px, 14px, 75px, 128px, 999px, 9999px |
| 버튼 굵기 | 4값 | 400, 500, 600, 700 |
| 버튼 그림자 | 없음 26, 있음 12 | 평면, 1px 테두리, 옅은 그림자, 브랜드색 글로우 |
| 아이콘 선 굵기 | 10값 | 1.25, 1.4, 1.5, 1.6, 1.75, 1.8, 2, 2.2, 2.4, 2.6 (끝 모양: round 34, butt 4) |
| 태그 모서리 | 8값 | 0px, 2px, 3px, 4px, 5px, 6px, 75px, 999px |
| 시그니처(특징 표현) | 12종 | fintech 1, list 3, data 4, elevated 1, photo 3, hero 1, article 1, mono 1, chat 1, gallery 1, health 1, band 1 |
| 레이아웃 패턴 | 38 | Holy Grail, 벤토, 칸반, 달력, 채팅, 메뉴판 4종 등 |
| 콘텐츠 구조 | 9 | 섹션 합계 87개: menu, beauty-detail, saas-landing, portfolio, ecommerce, app-landing, clinic, restaurant, realestate |
| 아이콘 | 48 | SVG 스프라이트·개별 파일·React 컴포넌트로 내보내기 |
| 산출물 | 6 | 프롬프트, CLAUDE.md, CSS 토큰, 컴포넌트 CSS, Tailwind 설정, 스펙 문서 |
| 조립기 | 1 | 브랜드색 하나로 50~950 램프와 대비 검사 |
| 생성기 | 1 | 제품 정보로 동작하는 HTML 페이지(섹션 약 30종) |
| 검사 | 4종 | UI 조작, 사용 흐름, 접근성(다크·390px·키보드·대비), API 일치 |

## 3. 축 대조표

| 축 | 동료분 레포 | static-kit 1.0 | static-kit 2.0.0 | 강제 방식 |
|---|---|---|---|---|
| 테마·시스템 | 38종 | 6 | **40종** (6분류) | 스키마 enum, 테마별 금지 값 |
| 색 팔레트 | 시스템당 램프 1벌 | 18(테마당 3) | **160개**(테마당 4개 이상, Coolors 렌더 출처) | 증거 파일 대조, 테마 소속 검사 |
| 대비 | 램프별 AA 계산 | 900쌍 | **33,600쌍**(320모드) | 컴파일 게이트, 실패 시 생성 불가 |
| 다크 모드 | 라이트·다크 토큰 | light·dark | light·dark·**auto**(두 세트 모두 검증) | 모드별 대비 검사 |
| 레이아웃 셸 | 38 패턴(혼합) | 4 | **10종**(레일·하단탭·제호형 등) | enum, 셸별 내비 항목 수·아이콘 규칙 |
| 레이아웃 부품 | — | 3 | split·aside·bento·tabs·kanban·reel·master-detail 등 | 허용 간선, 중첩 금지 |
| 페이지 템플릿 | 9종 | 4 | **61종**(16개 페이지 유형) | 페이지 유형 계약 |
| 부품 | 섹션 약 30종 | 13 | **55종**과 변형 438개 | 스키마·검증기 |
| 서체 | 시스템별 | 3 | 8종 조합 + 타입 스케일 3단계 + 굵기 3단계 | enum |
| 모서리 | 12값 | 3 | 5단계 + 컨트롤 모양 3종(카드와 버튼을 분리) | enum |
| 그림자·깊이 | 시스템별 | 없음 | 6종(평면~굵은 오프셋·글로우) | enum, 금지 조합 |
| 모션 | 없음 | 없음 | 3종 + reduced-motion 항상 존중 | enum |
| 아이콘 스타일 | 선 굵기·끝 모양 | 없음 | 6종, 아이콘 87개 | enum, 아이콘 enum |
| 장식·일러스트 | 없음 | 조합 도형 1종 | 5종 + 미디어 자리 7종 | enum |
| 배경 | 없음 | 없음 | 4종(그라데이션 위 글자도 대비 검사) | enum, 대비 샘플 22점 |
| 접근성 | 대비·키보드 검사 | 대비 | 대비 + 구조 감사(제목 단계·이름·라벨·타깃 24px·앵커) + 포커스 표시 + 강제 색상·고대비 | 브라우저 검사 |
| 반응형 | 768px 1열 | 640/1000 | 3폭(390·768·1280) 전수 오버플로 검사, 61 템플릿 | Chromium 검사 |
| 상태 컴포넌트 | 일부 | 5상태 | 5상태 + 상태 화면 9종 + 스켈레톤 + 오류 페이지 템플릿 | 상태 데이터 규칙 |
| 금지 조합 | 없음(프롬프트 규칙) | 간선만 | 축 조합 금지 11개 + 테마 금지 + 페이지 유형 계약 16개 | **코드(검증기)** |
| 산출물 일치 | 프롬프트에 CSS 포함 | 해시 검사 | 해시 검사 + 자동 수정은 규칙의 대안으로만 | CLI check |

## 4. 디자인 시스템 38종 → 테마·축 대응

동료분 레포는 실제 디자인 시스템의 성격(분류, 모서리, 버튼 모양·굵기, 그림자, 아이콘 선)을 값으로 담습니다. 이 저장소는 브랜드 자체를 복제하지 않고, 같은 **성격**을 낼 수 있는 축 조합과 테마를 둡니다. 아래 값은 동료분 레포의 관찰값을 이 저장소의 가장 가까운 축 값으로 환산한 것입니다. 카드 모서리 환산 오차는 최대 4px입니다.

| 대상 시스템 | 분류 | 카드 모서리 → 우리 값 | 버튼 → control | 굵기 → weight | 아이콘 → icon | 대응 테마 |
|---|---|---|---|---|---|---|
| Toss (TDS) | 앱 | 16px → round | 10px → match | 600 → medium | 2/round → line | trust |
| Aurora | SaaS | 12px → soft | 8px → match | 600 → medium | 2/round → line | aurora |
| Graphite | 엔터프라이즈 | 10px → soft | 6px → match | 600 → medium | 1.75/round → line | ledger |
| Ant Design | 엔터프라이즈 | 8px → soft | 6px → match | 400 → regular | 1.6/round → line-fine | ledger |
| Material 3 | 앱 | 16px → round | 999px → pill | 500 → regular | 2/round → line | clarity |
| IBM Carbon | 엔터프라이즈 | 0px → square | 0px → square | 400 → regular | 2/butt → line-square | ledger |
| Apple HIG | 앱 | 14px → soft | 12px → match | 600 → medium | 1.6/round → line-fine | clarity |
| Shopify Polaris | 생활 서비스 | 12px → soft | 8px → match | 600 → medium | 1.8/round → line | commerce |
| Neon | 랜딩 | 20px → round | 14px → match | 700 → bold | 2.2/round → line | neon |
| Editorial | 랜딩 | 4px → subtle | 2px → match | 600 → medium | 1.4/round → line-fine | editorial |
| Playful | 랜딩 | 22px → round | 999px → pill | 700 → bold | 2.6/round → line-bold | playful |
| Mobile Kit | 앱 | 20px → round | 14px → match | 600 → medium | 2/round → line | pocket |
| Vercel / Geist | 랜딩 | 8px → soft | 6px → match | 500 → regular | 1.75/round → line | studio |
| GitLab (Pajamas) | 개발·데이터 | 8px → soft | 6px → match | 600 → medium | 2/round → line | console |
| Airbnb | 생활 서비스 | 16px → round | 10px → match | 600 → medium | 2.4/round → line-bold | stay |
| Slack | 협업 | 12px → soft | 8px → match | 700 → bold | 2/round → line | hub |
| monopo saigon | 랜딩 | 0px → square | 75px → pill | 400 → regular | 1.25/butt → line-square | gallery |
| Bevel | 생활 서비스 | 28px → bubble | 128px → pill | 600 → medium | 1.8/round → line | cloud |
| Wise | 생활 서비스 | 10px → soft | 9999px → pill | 700 → bold | 2.2/round → line | trust |
| Pinterest Gestalt | 협업 | 16px → round | 999px → pill | 700 → bold | 2.4/round → line-bold | hub |
| Zendesk Garden | 협업 | 4px → subtle | 4px → match | 600 → medium | 1.5/round → line-fine | hub |
| Mantine | SaaS | 8px → soft | 4px → match | 600 → medium | 1.5/round → line-fine | workspace |
| Adobe Spectrum | SaaS | 8px → soft | 999px → pill | 700 → bold | 2/round → line | insight |
| Microsoft Fluent 2 | 엔터프라이즈 | 8px → soft | 4px → match | 600 → medium | 1.5/round → line-fine | workspace |
| Red Hat PatternFly | 개발·데이터 | 8px → soft | 3px → match | 600 → medium | 1.75/butt → line-square | console |
| GitHub Primer | 개발·데이터 | 6px → subtle | 6px → match | 600 → medium | 2/round → line | console |
| Bootstrap | SaaS | 8px → soft | 6px → match | 400 → regular | 1.5/round → line-fine | workspace |
| Tailwind CSS | SaaS | 8px → soft | 6px → match | 600 → medium | 1.5/round → line-fine | workspace |
| Salesforce Lightning | 엔터프라이즈 | 4px → subtle | 4px → match | 400 → regular | 2/round → line | ledger |
| MongoDB LeafyGreen | 개발·데이터 | 16px → round | 6px → match | 500 → regular | 1.6/round → line-fine | console |
| Palantir Blueprint | 개발·데이터 | 2px → square | 2px → match | 400 → regular | 2/butt → line-square | precision |
| Workday Canvas | 엔터프라이즈 | 4px → subtle | 999px → pill | 700 → bold | 2/round → line | ledger |
| Radix UI | SaaS | 12px → soft | 6px → match | 500 → regular | 1.6/round → line-fine | workspace |
| Arco Design | 엔터프라이즈 | 4px → subtle | 2px → match | 400 → regular | 1.6/round → line-fine | workspace |
| Semi Design | 엔터프라이즈 | 6px → subtle | 6px → match | 600 → medium | 1.8/round → line | workspace |
| USWDS | 엔터프라이즈 | 4px → subtle | 4px → match | 700 → bold | 2/round → line | civic |
| Segment Evergreen | SaaS | 8px → soft | 4px → match | 500 → regular | 1.6/round → line-fine | insight |
| HashiCorp Helios | 개발·데이터 | 6px → subtle | 5px → match | 500 → regular | 1.6/round → line-fine | console |

환산 결과 사용된 축 값은 모서리 5/5, 컨트롤 3/3, 굵기 3/3, 아이콘 4/6입니다. 38개 시스템이 모두 하나 이상의 테마에 대응하며(`covers`) 테스트가 이를 확인합니다.

## 5. 레이아웃 38종 대응

완전 대응 34, 부분 대응 4, 미대응 0입니다. 부분 대응은 정적 코드 범위의 한계를 그대로 적었습니다.

| 동료분 레이아웃 | 대응 | 상태 | 비고 |
|---|---|---|---|
| Holy Grail (양쪽 사이드바 3단) | `shell:sidebar` + `node:aside` | 완전 | 사이드바 셸 + 본문·보조 영역 |
| Dashboard (관리자 화면) | `template:dashboard-overview` | 완전 | 사이드바 셸, 지표·차트·표 |
| Landing Hero (첫 화면 크게) | `node:hero` | 완전 | statement·split·centered·cover·product 5변형 |
| Split (화면 반반) | `node:split` + `shell:split` | 완전 | 2분할 부품과 분할 셸 |
| Modular Grid (지그재그 좌우교차) | `node:split` | 완전 | reverse 값으로 좌우 교차 |
| Bento (도시락 칸 나누기) | `node:bento` | 완전 | 3~6칸, 첫 칸 2×2 |
| List–Detail (목록 + 내용 · 메일함형) | `node:master-detail` + `template:inbox` | 완전 |  |
| Magazine (잡지형) | `shell:masthead` + `template:blog-index` | 완전 | 제호형 머리 |
| Centered (가운데 한 줄) | `shell:centered` | 완전 |  |
| Stacked (위에서 아래로 쌓기) | `node:section` + `shell:stacked` | 완전 | 섹션 쌓기와 2단 내비 |
| Masonry (벽돌 쌓기 · 갤러리) | `node:gallery` | 완전 | layout=masonry |
| Sticky Sidebar (한쪽 고정 · 구매박스형) | `node:aside` + `node:buy-box` | 완전 | sticky=yes |
| Anchor Long Page (앵커 탭 롱페이지) | `node:section` + `node:toc` + `template:docs-reference` | 완전 | section.anchor, 앵커 링크 검증, 자동 목차 |
| Full-bleed Scroll (풀화면 몰입형) | `node:hero` + `axis:width` | 부분 | cover 히어로와 full 폭. 스크롤 연동 연출은 정적 범위 밖 |
| Card Feed (피드형 · SNS) | `node:grid` + `node:card` + `template:blog-index` | 완전 |  |
| Tabbed (탭 전환형) | `node:tabs` | 완전 | ARIA 탭 + 화살표 키 |
| Wizard Steps (단계별 진행) | `node:stepper` + `template:onboarding-wizard` | 완전 |  |
| Pricing Compare (요금제 비교표) | `node:pricing` + `template:pricing-page` | 완전 | 추천 플랜은 하나만 |
| Grid Gallery (균일 격자 갤러리) | `node:gallery` | 완전 | layout=grid |
| Cluster (태그 뭉치) | `node:tags` | 완전 |  |
| Switcher (폭 따라 가로세로 전환) | `node:grid` + `node:feature-list` | 완전 | 열 수가 폭에 따라 줄어듦 |
| Cover (세로 가운데 + 상하 고정) | `node:hero` | 완전 | variant=cover |
| Reel (가로 스크롤 줄) | `node:reel` | 완전 | 키보드 스크롤 영역 |
| Imposter (겹쳐 띄우기) | `node:media` | 완전 | media.overlay 칩(불투명 면, 대비 검증 대상) |
| Frame (비율 고정 틀) | `node:media` | 완전 | 16:9·4:3·1:1·3:4·21:9 |
| Supporting Pane (본문 + 보조 패널) | `node:aside` | 완전 |  |
| Kanban Board (칸반 · 상태별 세로 열) | `node:kanban` + `template:project-board` | 완전 |  |
| Timeline (시간순 세로줄) | `node:timeline` | 완전 |  |
| Map + List (지도와 목록 나란히) | `node:media` + `node:split` + `template:realty-detail` | 부분 | 지도는 자리 표시 일러스트(kind=map). 실제 지도 타일은 정적 코드 범위 밖 |
| Chat (대화 · 좌우 교차 말풍선) | `node:chat` + `template:team-chat` | 완전 |  |
| Calendar Grid (달력 격자) | `node:calendar` + `template:calendar-view` | 완전 | 월 길이·요일 계산, 날짜 검증 |
| Settings (설정 · 왼쪽 메뉴 + 오른쪽 폼) | `template:settings` | 완전 | 탭 + 폼 |
| Search Results (검색 결과 · 필터 + 목록) | `node:filter-bar` + `node:pagination` + `template:product-listing` | 완전 |  |
| Mega Menu (대형 메뉴 펼침) | `shell:topbar` + `template:product-listing` | 완전 | chrome.nav[].mega, details 기반(JS 없이 동작), 가로 셸에서 최대 2개 |
| Menu 2단 (클래식 다이닝 메뉴판) | `node:menu` | 완전 | layout=grid |
| Menu 점선 리더 (가격 우측 정렬형) | `node:menu` | 완전 | layout=leader |
| Menu 사진 그리드 (카페·배달 메뉴) | `node:menu` + `node:gallery` + `template:cafe-home` | 부분 | 메뉴 격자와 갤러리를 조합. 한 카드 안의 사진은 card variant=media로 대체 |
| Menu 시그니처 강조 (골든 트라이앵글) | `node:menu` | 부분 | tag 배지로 시그니처 표시. 지면 배치 이론(골든 트라이앵글)은 구현하지 않음 |

## 6. 콘텐츠 구조 9종 대응

| 동료분 구조 | 섹션 수 | static-kit 템플릿 | 페이지 유형 |
|---|---|---|---|
| 메뉴판 (레스토랑·카페) | 10 | `menu-dining` | 커머스 |
| 뷰티 상세페이지 | 10 | `beauty-detail` | 커머스 |
| SaaS 랜딩페이지 | 10 | `saas-landing` | 랜딩 |
| 포트폴리오 / 에이전시 | 9 | `portfolio-grid` | 포트폴리오 |
| 이커머스 상품 상세 | 10 | `product-detail` | 커머스 |
| 앱 소개 랜딩 | 9 | `app-landing` | 랜딩 |
| 병원 / 클리닉 | 10 | `clinic-home` | 랜딩 |
| 레스토랑 / 카페 | 9 | `cafe-home` | 랜딩 |
| 부동산 매물 상세 | 10 | `realty-detail` | 커머스 |

동료분의 9개 구조 외에 52개 템플릿을 더했습니다. 페이지 유형별 수는 다음과 같습니다: 일반 2, 랜딩 14, 대시보드 2, 데이터 리포트 3, 목록·탐색 2, 협업·소통 3, 문서·레퍼런스 5, 글 3, 블로그 목록 1, 커머스 8, 포트폴리오 3, 요금제 1, 폼 3, 설정 3, 인증 3, 오류·상태 페이지 5.

## 7. 아이콘 48종 대응

이름이 같은 것은 42개이고, 이름만 다른 6개는 별칭으로 대응합니다(close→x, chevron→chevron-right, more-h→more, pin→map-pin, card→credit-card, alert→alert-triangle). 이 저장소에는 87개가 있으며, 선 굵기·끝 모양·채움을 아이콘 축(line-fine, line, line-bold, line-square, solid, duotone)으로 바꿉니다. 아이콘 데이터는 새로 그렸습니다.

## 8. 동료분 레포에 없는 보완

1. **코드 강제.** 입력은 JSON Schema에서 생성한 검증기를 통과해야 하고, 알 수 없는 속성·값·간선은 거부됩니다. 규칙 19개, 오류 코드 49종.
2. **금지 조합.** 축 조합 금지 11개(각각 접근성·가독성 근거와 대안 값 포함), 테마별 금지 값, 페이지 유형 계약 16개. 가능한 조합 공간은 규칙 필터 뒤 약 157,900,457,808개로, 쌍별 커버링 450개 조합과 2,440개 템플릿×테마를 실제로 컴파일해 확인했습니다.
3. **접근성.** 모든 팔레트×모드×역할 쌍 33,600개 대비 통과(가장 빠듯한 쌍 chart1/canvas 3.00:1, 기준 3:1). 차트색·그라데이션 위 글자·보조 색까지 포함합니다. 제목 단계, 이름 없는 컨트롤, 라벨, 24px 타깃, 깨진 앵커를 브라우저에서 전수 검사합니다.
4. **반응형.** 61개 템플릿을 390·768·1280px에서 가로 넘침 없이 렌더링하는지 검사합니다. 표·코드·칸반·달력은 키보드로 스크롤할 수 있는 영역입니다.
5. **다크·auto 모드.** auto는 두 토큰 세트를 모두 검증하고 시스템 설정을 따릅니다. 반전 구역은 반대 모드의 검증된 토큰 세트를 씁니다.
6. **상태 컴포넌트.** 로딩·빈·오류·부분·권한 없음에 더해 상태 화면 9종, 스켈레톤, 404·500·403·점검·오프라인 템플릿. ready·partial 상태에는 실제 데이터가 있어야 합니다.
7. **데이터 시각화.** 막대·가로 막대·선·영역·도넛 SVG를 데이터에서 생성하고, 색 외에 점선·마커로 계열을 구분하며, 텍스트 대안과 데이터 표를 함께 냅니다.
8. **출처와 재현성.** 팔레트는 Coolors 렌더 페이지에서 관측한 814개 후보 목록(`docs/evidence/coolors-palettes.json`)과 대조되고, 모든 생성물은 SHA-256 해시와 새 빌드의 바이트 비교로 검사합니다. 생성물을 손으로 고치면 `check`가 거부합니다.
9. **휴대폰용 단일 파일 갤러리.** 컴파일러를 포함해 테마·팔레트·모드·축을 바로 바꿔 보고, 금지 조합은 이유와 함께 거부하며 자동 수정 대안을 보입니다.

## 9. 의도적으로 하지 않은 것과 미검증

- 모달·오버레이 같은 **상태 있는 위젯**과 JavaScript가 필요한 연출(스크롤 연동, 실제 지도 타일)은 정적 생성 범위 밖입니다. 부분 대응으로 표시했습니다.
- 프롬프트·CLAUDE.md·Tailwind 설정 내보내기는 만들지 않았습니다. 이 저장소의 산출물은 코드가 검증한 HTML/CSS이고, 프롬프트에 의존하지 않는 것이 목적입니다.
- 실제 브랜드 디자인 시스템의 값을 복제하지 않았습니다. 대응 표는 성격의 환산이며 브랜드 일치를 뜻하지 않습니다.
- 미검증: 실제 Safari/iOS와 스크린리더 동작, 157,900,457,808개 조합 전체의 육안 미감(컴파일·대비·구조 검사만 통과), Coolors 팔레트 이름의 출처 표기 정책, 카카오 Katalog 원 발표(확인 필요).
