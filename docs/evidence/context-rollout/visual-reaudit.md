# 시각 재감사 — 85개 예시 데스크톱·모바일

기준 시각: 2026-11-16T02:44:34.817Z · 대상: https://design-system-static-kit.vercel.app · 캡처 엔진: playwright chromium 156.0.8078.4

## 요약

- 전체 페이지 캡처 170/170 (85개 × 1440px·390px), 응답 오류 0, 문서 가로 넘침 0.
- 육안 메모에서 분류한 결함 183건: 상 19, 중 93, 하 71. 구성 양호로 적힌 예시는 결함 수에서 제외.
- 심각도는 화면 완성도·목적 적합성을 기준으로 한 디자이너 판단이다. 자동 가로 넘침 0건은 시각 품질이 양호하다는 뜻이 아니다.
- 화면을 실제로 본 근거는 아래 전체 캡처와 메모다. 원인 코드 위치는 구조를 대조해 추정했으며, 개별 슬롯 값이 렌더링된 경로까지는 확인하지 않았다.

## 반복 원인 그룹

| 원인 그룹 | 건수 | 우선 확인할 코드 위치(추정) |
|---|---:|---|
| 타이포그래피·위계 | 45 | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 공간·정렬·밀도 | 69 | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 콘텐츠·시각 자산 적합성 | 34 | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 부품 선택·정보 구성 | 17 | src/catalog/templates.mjs, src/render/ (추정) |
| 좁은 화면 반응형 | 18 | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |

그룹은 각 발견을 한 범주에만 넣은 편의 집계다. 서로 겹치는 원인은 있으므로 합계는 전체 발견 건수와 같다. 개별 템플릿 데이터 문제는 공통 규칙 수정과 분리해 판단해야 한다.

## 가장 나쁜 예시 10개

| 순위 | 예시 | 뷰포트 | 주요 근거 | 캡처 |
|---:|---|---:|---|---|
| 1 | bank-product | 1440 | 은행 예금 상품에 SaaS 프로젝트 대시보드 목업; 이자 차트는 카드 폭 약 45%에 그치고 라벨이 선과 겹침 | visual-reaudit/1440/bank-product.png |
| 2 | game-launch | 1440 | 로드맵 타임라인은 좌측 20%만 사용; 680px 정사각 갤러리와 거대 재생 버튼이 화면을 압도 | visual-reaudit/1440/game-launch.png |
| 3 | campaign-donate | 1440 | 후원 핵심 수치 6,420이 세 곳에 중복; 도넛도 카드 폭 40%만 차지 | visual-reaudit/1440/campaign-donate.png |
| 4 | dashboard-analytics | 1440 | 막대 차트가 770px 카드 중 300px만 사용해 넓은 공백 발생 | visual-reaudit/1440/dashboard-analytics.png |
| 5 | hanji-journey | 1440 | 여행 일정 타임라인이 695px 기둥의 좌측 1/3만 사용 | visual-reaudit/1440/hanji-journey.png |
| 6 | learning-course | 1440 | 커리큘럼 세로 단계가 좌측 1/3에 몰리고 우측 2/3가 비어 있음 | visual-reaudit/1440/learning-course.png |
| 7 | blog-index | 390 | 대표 글 이미지가 110×65px로 좌상단에 축소되어 다른 카드의 전폭 이미지 규칙과 충돌 | visual-reaudit/390/blog-index.png |
| 8 | docs-reference | 390 | 4열 요청 표가 폭에 눌려 설명이 4~5줄로 쌓이고 값이 읽기 어려움 | visual-reaudit/390/docs-reference.png |
| 9 | product-landing | 1440 | 램프 사양 옆에 노드·화살표 워크플로 그림이 배치되어 제품 설명 목적과 불일치 | visual-reaudit/1440/product-landing.png |
| 10 | realty-detail | 1440 | 매물 갤러리 4장 중 평면도는 워크플로 그림, 위치는 지도 자리표시 아이콘 | visual-reaudit/1440/realty-detail.png |

## 가장 좋은 예시 3개

| 예시 | 선정 근거 | 캡처 |
|---|---|---|
| 1 | changelog | 변경 목록을 중심으로 정보가 일관되게 이어지고 육안 메모에 전반 구성 양호로 기록 | visual-reaudit/1440/changelog.png |
| 2 | help-center | 도움말 탐색 목적에 맞는 구성으로 기록, 뚜렷한 위계·공간 결함 메모 없음 | visual-reaudit/1440/help-center.png |
| 3 | stay-detail | 갤러리·예약 카드·편의시설·후기 흐름이 목적에 맞고 균형이 양호하다고 기록 | visual-reaudit/1440/stay-detail.png |

선정은 현재 캡처 세트와 기록된 육안 관찰에 한정된다. 사용성 테스트나 실제 서비스 데이터 적합성 평가는 하지 않았다.

## 전체 발견 목록 (183건)

| # | 예시 | 뷰포트 | 위치 | 관찰 | 심각도 | 캡처 | 원인 위치(추정) |
|---:|---|---:|---|---|---|---|---|
| 1 | about-team | 1440 | 섹션 제목 3개 | "우리 이야기"가 "함께하는 사람들"·"지나온 길"보다 크다(형제 섹션 제목 크기 불일치) | 하 | visual-reaudit/1440/about-team.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 2 | admin-table | 1440 | 테이블 금액열 | 금액이 좌측 정렬, 열 폭 균등(주문번호/금액/접수 동일 폭) | 중 | visual-reaudit/1440/admin-table.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 3 | admin-table | 1440 | "주문 목록" 카드 | 카드 제목 아래 "최근 주문 목록" 부제가 제목 반복 | 하 | visual-reaudit/1440/admin-table.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 4 | agency-home | 1440 | 서비스 카드 3개 | 카드가 작고 본문 11px대, 헤딩 대비 카드 내부 위계 약함 | 하 | visual-reaudit/1440/agency-home.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 5 | api-reference | 1440 | h2/h3 | "캐시 조회"(섹션)와 "GET /v3/cache/{hash}"(소제목) 크기 차이가 거의 없음 | 중 | visual-reaudit/1440/api-reference.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 6 | app-landing | 1440 | 기능 목록 | icon+제목이 왼쪽, 설명이 37% 지점에서 시작해 우측 40%가 빔; 행 간격만 크고 정보 밀도 낮음 | 중 | visual-reaudit/1440/app-landing.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 7 | app-landing | 1440 | "이렇게 써요" 3단계 | 설명 11~12px, 섹션 상하 여백(약 100px)에 비해 내용이 빈약 | 중 | visual-reaudit/1440/app-landing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 8 | audit-log | 1440 | 페이지 제목 | "감사 로그" 제목(15px대)이 통계 값 "1,284"보다 작음: 위계 역전 | 중 | visual-reaudit/1440/audit-log.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 9 | audit-log | 1440 | 최근 이벤트 | 감사 이벤트에 "완료/진행" 상태 배지(로그인 실패에 '진행'); 시간+배지 열과 제목열 사이 간격 크고 우측 40% 빔 | 중 | visual-reaudit/1440/audit-log.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 10 | audit-log | 1440 | 전역 | 한글 본문이 모노스페이스 폴백으로 렌더, 글자 간격 들쭉 | 중 | visual-reaudit/1440/audit-log.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 11 | b2b-solution | 1440 | 히어로 이미지 | 프로젝트 현황 SaaS 대시보드 목업(bank-product와 동일 그림)이 B2B 보안 솔루션 문맥 | 중 | visual-reaudit/1440/b2b-solution.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 12 | b2b-solution | 1440 | "엔터프라이즈가 요구하는 것" | 2x2 feature 설명 11px 회색, 섹션 설명이 우측 끝에 분리 | 중 | visual-reaudit/1440/b2b-solution.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 13 | b2b-solution | 1440 | 후기 | 인용문 x가 컨테이너 좌측보다 ~15px 들여쓰여 정렬 어긋남, 인용 강조 약함 | 하 | visual-reaudit/1440/b2b-solution.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 14 | b2b-solution | 1440 | CTA 띠 | 보조 버튼이 밑줄 링크 스타일+테두리 상자 혼합 | 하 | visual-reaudit/1440/b2b-solution.png | src/catalog/templates.mjs, src/render/ (추정) |
| 15 | bank-product | 1440 | 히어로 이미지 | 은행 예금 상품에 "프로젝트 현황" SaaS 대시보드 목업 | 상 | visual-reaudit/1440/bank-product.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 16 | bank-product | 1440 | 이자 미리보기 차트 | 차트 SVG가 카드 폭의 약 45%만 차지, 오른쪽이 빈 영역; 데이터 라벨이 선과 겹침 | 상 | visual-reaudit/1440/bank-product.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 17 | bank-product | 1440 | "유의 사항" | "가입 전에 확인하세요"(소) 와 "유의 사항"(대) 제목 크기 불일치, 구분 없이 연달아 | 중 | visual-reaudit/1440/bank-product.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 18 | beauty-detail | 1440 | 페이지 제목+상품 카드 | 제목 "수분 장벽 크림"과 카드 "수분 장벽 크림 50ml" 중복; 카드가 이미지 대비 작고 세로 중앙 부유 | 중 | visual-reaudit/1440/beauty-detail.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 19 | beauty-detail | 1440 | 장바구니 버튼 | 컨트롤 폭 대비 라벨이 극단적으로 작음(전폭 pill, 라벨 10px대) | 중 | visual-reaudit/1440/beauty-detail.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 20 | beauty-detail | 1440 | 섹션 제목 | 얇은 세리프+넓은 자간 "핵 심 성 분", 섹션 사이 간격이 제목-내용 간격과 비슷해 묶임이 모호 | 중 | visual-reaudit/1440/beauty-detail.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 21 | beauty-detail | 1440 | 포토 리뷰 | 사진 없는 "포토 리뷰" 라벨, 별점 반복 | 하 | visual-reaudit/1440/beauty-detail.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 22 | billing | 1440 | 청구내역+현재 플랜 | 좌 카드가 우 카드보다 짧아 아래 빈 영역(높이 불일치) | 하 | visual-reaudit/1440/billing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 23 | blog-index | 1440 | 본문 기둥 | 콘텐츠가 695px 기둥에만 있고 좌우 각 ~370px 비어 있음; 헤더는 중앙 로고+우측 구독 버튼 | 중 | visual-reaudit/1440/blog-index.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 24 | blog-index | 1440 | 하단 주제 칩 | 상단 필터 칩과 같은 주제를 하단에 다시 나열(중복) | 하 | visual-reaudit/1440/blog-index.png | src/catalog/templates.mjs, src/render/ (추정) |
| 25 | blog-index | 1440 | 카드 3번째 | 큰 일러스트 카드(690x390)가 목록 위계를 압도, 카드 3종이 크기 제각각 | 하 | visual-reaudit/1440/blog-index.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 26 | blog-post | 1440 | 인용 | 인용 좌측 선이 거의 안 보이고 강조 약함 | 하 | visual-reaudit/1440/blog-post.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 27 | cafe-home | 1440 | 대표 메뉴 | 흰 카드 안에 회색 아이템 상자(카드 속 카드) | 하 | visual-reaudit/1440/cafe-home.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 28 | cafe-home | 1440 | 매장 정보 | 섹션 제목 없이 카드만 있어 다른 섹션과 구성 불일치 | 하 | visual-reaudit/1440/cafe-home.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 29 | calendar-view | 1440 | 일정 | 같은 이벤트가 달력·일정 목록·다가오는 일정에 3번 표시 | 중 | visual-reaudit/1440/calendar-view.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 30 | calendar-view | 1440 | 페이지 제목 | "10월 일정"(17px)이 통계 "8건"(24px)보다 작음 | 중 | visual-reaudit/1440/calendar-view.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 31 | campaign-donate | 1440 | 사이드바 | 브랜드·내비가 사이드바 세로 중앙부터 시작, 위 ~200px 비어 있음 | 중 | visual-reaudit/1440/campaign-donate.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 32 | campaign-donate | 1440 | 히어로 이미지 | 궤도 동심원 추상 그래픽이 나무 심기 캠페인과 무관 | 중 | visual-reaudit/1440/campaign-donate.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 33 | campaign-donate | 1440 | 수치 중복 | 6,420그루가 히어로 통계·진행바·지표 카드 3곳에 반복 | 상 | visual-reaudit/1440/campaign-donate.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 34 | campaign-donate | 1440 | 지표 카드 | 3번째 카드(42ha)만 상세/보조 줄이 없어 카드 내부 구성 불일치 | 하 | visual-reaudit/1440/campaign-donate.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 35 | campaign-donate | 1440 | 후원금 도넛 | 도넛+범례가 카드 폭의 40%만 쓰고 우측 빈 영역 | 상 | visual-reaudit/1440/campaign-donate.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 36 | campaign-donate | 1440 | 전역 타이포 | 900 굵기 대형 헤드라인+통계 숫자로 강조 과다, 본문·카드 제목과 위계 격차 큼 | 중 | visual-reaudit/1440/campaign-donate.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 37 | campaign-poster | 1440 | 히어로 이미지 | 동일 궤도 추상 그래픽을 도시 텃밭에 재사용 | 중 | visual-reaudit/1440/campaign-poster.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 38 | campaign-poster | 1440 | 진행 bento | 첫 줄 좌측 카드가 폭 345px에 내용은 짧아 우측 절반 빈 영역 | 하 | visual-reaudit/1440/campaign-poster.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 39 | case-study | 1440 | 히어로 이미지 | 와이드 배너 안에 소형 삽화가 가운데 떠 있고 좌우 회색 빈 영역 | 중 | visual-reaudit/1440/case-study.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 40 | case-study | 1440 | 문제/접근 vs 결과물 | "문제""접근"은 h2급, "결과물"은 소제목급으로 형제 제목 크기 불일치 | 중 | visual-reaudit/1440/case-study.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 41 | case-study | 1440 | 지표 행·인용 | 지표/인용이 컨테이너 좌측(77)보다 12~19px 들여써 정렬 어긋남 | 하 | visual-reaudit/1440/case-study.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 42 | checkout | 1440 | 배송 폼 | 주소 필드가 절반 폭이고 우측이 빔(주소는 전폭이어야), 결제 진행 버튼 작음 | 중 | visual-reaudit/1440/checkout.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 43 | civic-service | 1440 | 처리 정보 카드 | 속성 3개가 라벨 위·값 아래로 쌓여 1000px 카드에서 우측 70%가 빔 (stacked properties in wide card) | 중 | visual-reaudit/1440/civic-service.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 44 | clinic-home | 1440 | 진료 안내 카드 | 평일/토요일 시간표가 stacked 속성으로 1000px 카드에 좌측만 채움 | 중 | visual-reaudit/1440/clinic-home.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 45 | clinic-home | 1440 | 진료 과목 2x2 | 항목 설명 11px, 2열이 610px 중 좌 50%에 몰려 sparse | 하 | visual-reaudit/1440/clinic-home.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 46 | contact | 1440 | 문의 폼 | 입력 폭 ~560px로 카드 안에서 라벨 10px; 우측 연락처 카드가 훨씬 짧음 | 하 | visual-reaudit/1440/contact.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 47 | (공통) | 1440 | 푸터 | 브랜드 칼럼과 링크 칼럼 사이 간격 과다(링크가 55%, 75% 지점) | 하 | visual-reaudit/1440/(공통).png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 48 | course-catalog | 1440 | 강좌 카드 | 메타(평점·수강생, 굵게)가 제목보다 먼저 나오고 제목은 가는 굵기: 카드 내부 위계 뒤집힘; 이미지 영역은 큰 회색판에 작은 물체 | 중 | visual-reaudit/1440/course-catalog.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 49 | dashboard-analytics | 1440 | 막대 차트 카드 | 차트가 카드 폭 770px 중 300px만 쓰고 좌우가 큼직하게 빔 | 상 | visual-reaudit/1440/dashboard-analytics.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 50 | dashboard-analytics | 1440 | 유입 채널 도넛 카드 | 옆 선차트 카드 높이에 맞춰 늘어나 아래 50%가 비어 있음 | 중 | visual-reaudit/1440/dashboard-analytics.png | src/catalog/templates.mjs, src/render/ (추정) |
| 51 | dashboard-overview | 1440 | "지금 집중할 일" 첫 항목 | 제목이 2줄로 접히며 줄간격이 과대, 나머지 항목과 높이·행간 불일치 | 중 | visual-reaudit/1440/dashboard-overview.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 52 | dashboard-overview | 1440 | 새 프로젝트 버튼 | 헤더와 사이드바 하단에 동일 주 액션 중복 | 하 | visual-reaudit/1440/dashboard-overview.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 53 | dashboard-overview | 1440 | 막대 차트 | 카드 안에서 차트가 좌측 여백을 두고 폭 60%만 사용 | 중 | visual-reaudit/1440/dashboard-overview.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 54 | devtool-landing | 1440 | 히어로 이미지 | 개발자 CLI 도구에 모바일 앱 폰 목업 | 중 | visual-reaudit/1440/devtool-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 55 | devtool-landing | 1440 | "개발자가 쓰는 이유" bento | 차트·카드·인용이 높이 제각각, 인용은 카드 없이 떠 있어 격자가 깨져 보임 | 중 | visual-reaudit/1440/devtool-landing.png | src/catalog/templates.mjs, src/render/ (추정) |
| 56 | devtool-landing | 1440 | 섹션 제목 | "개발자가 쓰는 이유""요금""자주 묻는 질문" 제목이 17px 안팎으로 히어로와 위계 단절, 카드 제목과 크기 비슷 | 중 | visual-reaudit/1440/devtool-landing.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 57 | devtool-landing | 1440 | 전역 | 모눈 배경 장식이 카드 뒤 전 섹션에 깔려 노이즈 | 하 | visual-reaudit/1440/devtool-landing.png | src/catalog/templates.mjs, src/render/ (추정) |
| 58 | devtool-landing | 1440 | 지표 3번째 | 라벨 "팁"만 한 글자로 의미 불명(콘텐츠) | 하 | visual-reaudit/1440/devtool-landing.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 59 | docs-reference | 1440 | 섹션/소제목 | "설치"(h2)와 "요구 사항"(h3)이 크기·굵기 차이 거의 없음(위계 약함); 본문 기둥 810px 우측 25% 비고 TOC만 | 중 | visual-reaudit/1440/docs-reference.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 60 | event-landing | 1440 | 지표 카드 | 앞 2장(12명, 6개)은 값만 있어 카드 하단 50%가 비고 3번째만 보조 줄 있음 | 중 | visual-reaudit/1440/event-landing.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 61 | event-landing | 1440 | FAQ 제목 | "자주 묻는 질문"이 "프로그램/연사/티켓" 섹션 제목보다 훨씬 작음 | 중 | visual-reaudit/1440/event-landing.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 62 | event-landing | 1440 | 티켓 카드 | 혜택 2~3줄과 버튼 사이 ~60px 빈 영역(카드 높이 stretch) | 하 | visual-reaudit/1440/event-landing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 63 | event-landing | 1440 | 연사 카드 | 4장 균일, 역할 텍스트 10px대 | 하 | visual-reaudit/1440/event-landing.png | src/catalog/templates.mjs, src/render/ (추정) |
| 64 | event-schedule | 1440 | 참여 공방 | 카드 안에 테두리 있는 행이 다시 들어감(카드 속 카드) | 하 | visual-reaudit/1440/event-schedule.png | src/catalog/templates.mjs, src/render/ (추정) |
| 65 | finance-overview | 1440 | 최근 거래 표 | 금액 열이 좌측 정렬(부호 혼재 -6,800/+3,200,000 정렬 안 맞음) | 중 | visual-reaudit/1440/finance-overview.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 66 | finance-overview | 1440 | 월별 지출 vs 예산 현황 | 우 카드가 짧아 아래 빈 영역 | 하 | visual-reaudit/1440/finance-overview.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 67 | fitness-landing | 1440 | 프로그램 카드 4열 | 격자가 컨테이너 폭보다 좁아 우측 ~12px 부족, 좌측 3px 들여씀(헤딩 정렬과 어긋남) | 하 | visual-reaudit/1440/fitness-landing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 68 | forbidden | 1440 | 이전 페이지 링크 | 버튼과 링크 사이 ~100px 공백으로 링크가 떠 있음 | 하 | visual-reaudit/1440/forbidden.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 69 | forgot-password | 1440 | 헤더 | 헤더 로고·탭·구분선이 417px 좁은 기둥 안에 갇혀 1440 화면에서 어색 | 중 | visual-reaudit/1440/forgot-password.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 70 | game-launch | 1440 | "게임 속으로" gallery | 680x680 크림색 뷰어 + 거대 재생 버튼이 어두운 페이지에서 눈부시게 튐, 썸네일은 45px 세로 스택 | 상 | visual-reaudit/1440/game-launch.png | src/catalog/templates.mjs, src/render/ (추정) |
| 71 | game-launch | 1440 | 출시 로드맵 타임라인 | 세로 타임라인이 좌측 20%에만 있고 우측 80% 비어 있음 | 상 | visual-reaudit/1440/game-launch.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 72 | game-launch | 1440 | 히어로 이미지 | 게임에 노란 아치+원 추상 도형(카탈로그 공용 art) | 하 | visual-reaudit/1440/game-launch.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 73 | hanji-journey | 1440 | 히어로 이미지 | 한옥 여행에 궤도 동심원 추상 그래픽 | 중 | visual-reaudit/1440/hanji-journey.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 74 | hanji-journey | 1440 | 여행 일정 타임라인 | 695px 기둥 안에서 세로 타임라인이 좌 1/3만 쓰고 우 2/3 빔 | 상 | visual-reaudit/1440/hanji-journey.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 75 | hanji-journey | 1440 | 전역 | 695px 기둥+얇은 세리프 본문(연회색)이라 1440에서 좌우 ~370px 비고 가독성 낮음; 헤더 구분선도 기둥 폭에 갇힘 | 중 | visual-reaudit/1440/hanji-journey.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 76 | hr-people | 1440 | 직군별 막대 차트 | 카드 폭 680px 중 400px만 쓰고 좌측 100px 비고 우측 150px 빔 | 중 | visual-reaudit/1440/hr-people.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 77 | hr-people | 1440 | 칸반 | 제목 없이 바로 4열 보드, 레인 하단이 비어 높이만 늘어남 | 하 | visual-reaudit/1440/hr-people.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 78 | inbox | 1440 | master-detail | 상세창이 140px만 차지하고 아래 ~300px 비어 있음, 목록 항목 제목 크기 불일치("2.4 배포 안내"만 큼) | 중 | visual-reaudit/1440/inbox.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 79 | incident-report | 1440 | 전역 | 한글 본문이 모노스페이스 폴백(자간 들쭉), 타임라인 "완료" 배지가 마지막 행에만 붙어 의미 불명 | 중 | visual-reaudit/1440/incident-report.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 80 | job-board | 1440 | 인재 풀 등록 | 헤더 우측과 사이드바 하단에 동일 CTA 중복 | 하 | visual-reaudit/1440/job-board.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 81 | job-detail | 1440 | 자격 요건 | 불릿/아이콘 없이 굵은 줄만 30px 간격으로 나열, h2 아래에 카드 제목이 다시 나옴(제목 이중) | 중 | visual-reaudit/1440/job-detail.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 82 | job-detail | 1440 | 채용 과정 | 세로 steps가 좌측만 사용하고 우측 40% 비어 있음 | 중 | visual-reaudit/1440/job-detail.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 83 | kids-class | 1440 | "수업은 이렇게 흘러가요" | 3단계 설명 11px, 섹션 상하 여백 대비 내용 빈약; FAQ 제목이 다른 섹션 제목보다 작음 | 중 | visual-reaudit/1440/kids-class.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 84 | learning-course | 1440 | 단계 표시줄 | 히어로 바로 아래 진행 stepper(기초-반복-함수-프로젝트)가 제목 없이 떠 있어 목적 불명 | 중 | visual-reaudit/1440/learning-course.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 85 | learning-course | 1440 | 커리큘럼 | 세로 steps 4개가 좌 1/3만 쓰고 우 2/3 빔 | 상 | visual-reaudit/1440/learning-course.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 86 | login | 1440 | 헤더 | 로고 아래에 "도움말" pill이 따로 줄을 차지(헤더 2단), 헤더가 중앙 좁은 기둥 | 하 | visual-reaudit/1440/login.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 87 | luxury-brand | 1440 | "이번 시즌 컬렉션" gallery | 680x680 거대 뷰어에 가방 삽화 + 45px 썸네일 3개, 세로 약 1000px 차지 | 상 | visual-reaudit/1440/luxury-brand.png | src/catalog/templates.mjs, src/render/ (추정) |
| 88 | luxury-brand | 1440 | 히어로 이미지 | 노란 아치·원 공용 추상 도형이 럭셔리 브랜드와 무관 | 중 | visual-reaudit/1440/luxury-brand.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 89 | maintenance | 1440 | 이전 페이지 링크 | 버튼과 링크 사이 공백 ~90px로 떠 있음; 503 숫자 대비 낮음 | 하 | visual-reaudit/1440/maintenance.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 90 | menu-dining | 1440 | 페이지 제목 | "저녁 메뉴"(18px 세리프)가 섹션 제목과 거의 같은 크기라 페이지 제목 위계 약함 | 중 | visual-reaudit/1440/menu-dining.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 91 | menu-dining | 1440 | 시그니처 카드 | 첫 카드만 "시그니처" 태그가 있어 3카드의 이름·설명 baseline 불일치 | 하 | visual-reaudit/1440/menu-dining.png | src/catalog/templates.mjs, src/render/ (추정) |
| 92 | menu-dining | 1440 | 섹션 | 시그니처/식사/코스 구성이 흰 카드 3개 연속(획일적 카드 스택) | 하 | visual-reaudit/1440/menu-dining.png | src/catalog/templates.mjs, src/render/ (추정) |
| 93 | museum-home | 1440 | 헤더 | "관람 예약" 버튼이 내비 규칙선 아래 중앙에 붙어 헤더가 3단 | 하 | visual-reaudit/1440/museum-home.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 94 | museum-home | 1440 | 히어로 이미지 | 박물관에 궤도 동심원 추상 그래픽 | 중 | visual-reaudit/1440/museum-home.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 95 | music-player | 1440 | 커버+재생목록 | 커버(285px)와 재생 목록 카드가 세로 중앙 정렬돼 상·하 경계가 어긋남(상단 53px/하단 33px 차), 커버는 공용 "A" 삽화 | 중 | visual-reaudit/1440/music-player.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 96 | music-player | 1440 | 재생 컨트롤 | 이전/재생/다음이 밑줄 링크+작은 pill로 컨트롤 어포던스 약함(음악 플레이어에 링크 부품) | 중 | visual-reaudit/1440/music-player.png | src/catalog/templates.mjs, src/render/ (추정) |
| 97 | news-home | 1440 | 구독 버튼 | 신문 마스트헤드 규칙선 아래 중앙에 빨간 버튼이 떠 있음 | 하 | visual-reaudit/1440/news-home.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 98 | news-home | 1440 | 기사 카드 | "기사 보기/읽기" 링크가 카드마다 반복돼 잡음, 카드 표면이 거의 안 보임 | 하 | visual-reaudit/1440/news-home.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 99 | not-found | 1440 | 제목 | 제목 폭이 ~240px로 좁아 "페이지를 찾을 / 수 없어요"로 어색하게 끊김, 이전 페이지 링크 떠 있음 | 중 | visual-reaudit/1440/not-found.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 100 | offline | 1440 | 제목·헤더 | 제목 200px 폭에서 "인터넷에 연결되지 / 않았어요"로 끊김, 헤더는 좌측 기둥·본문은 중앙으로 정렬축 불일치 | 중 | visual-reaudit/1440/offline.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 101 | onboarding-wizard | 1440 | 수준 라디오 | 3개 옵션이 2열 격자에서 2+1 고아 배치 | 하 | visual-reaudit/1440/onboarding-wizard.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 102 | (공통) | 1440 | 푸터/마스트헤드 | "Static Kit 2.2.0"·"정적 데모 · Static Kit" 도구 문구가 서비스 푸터·헤더에 노출 | 하 | visual-reaudit/1440/(공통).png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 103 | order-tracking | 1440 | 배송 현황 타임라인 | 최신(배송 중)이 맨 위, 미래(도착 예정)가 맨 아래로 시간 순서 혼재; 타임라인(좌 150px)과 주문 내역(우 180px) 사이 ~450px 빈 영역 | 중 | visual-reaudit/1440/order-tracking.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 104 | policy | 1440 | 전체 | 구성 양호 (best 후보 아님, 중상); "1.수집" 번호와 제목 사이 공백 없음 | 하 | visual-reaudit/1440/policy.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 105 | portfolio-grid | 1440 | 필터 칩 | 활성 칩이 없고 전부 외곽선, 칩과 격자 사이 ~90px 공백 | 하 | visual-reaudit/1440/portfolio-grid.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 106 | portfolio-grid | 1440 | 작품 격자 | 4x2 동일 크기 썸네일 균일 격자, 캡션 10px | 하 | visual-reaudit/1440/portfolio-grid.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 107 | pricing-page | 1440 | 기능 비교 표 카드 | 요금제 카드와 같은 초록 글로우 테두리가 표 카드에도 적용되어 강조 희석 | 하 | visual-reaudit/1440/pricing-page.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 108 | product-detail | 1440 | 제목 중복 | 페이지 제목 "무드램프 미니"와 구매 박스 제목이 중복 | 하 | visual-reaudit/1440/product-detail.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 109 | product-detail | 1440 | 탭 패널 | 탭 바 바로 아래에 "제품 설명" 제목이 붙어 위 여백 부족(탭-제목 간격 ≈ 섹션 내 간격) | 중 | visual-reaudit/1440/product-detail.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 110 | product-landing | 1440 | "왜 이 램프인가요" bento | 우측 4칸이 높이 190/170으로 다르고 칸 안은 절반이 비어 있음, 인용 칸만 테두리 없이 떠 있음 | 중 | visual-reaudit/1440/product-landing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 111 | product-landing | 1440 | "사양" 옆 일러스트 | 램프 사양 옆에 노드-화살표 워크플로 다이어그램(문서용 그림)이 들어감: 목적 불일치 | 상 | visual-reaudit/1440/product-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 112 | product-listing | 1440 | 필터 패널 | 색상 라디오가 테두리 있는 행 3개로 무겁고 패널 폭 180px에 안내문 2줄 | 하 | visual-reaudit/1440/product-listing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 113 | profile | 1440 | 활동 차트 | 차트가 카드 폭의 60%만 쓰고 좌우 빔 | 중 | visual-reaudit/1440/profile.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 114 | property-search | 1440 | 매물 목록+지도 | 부동산 매물을 사진 없는 표로, 지도는 "자리 표시 일러스트입니다" 문구가 노출된 230px 박스 | 중 | visual-reaudit/1440/property-search.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 115 | realty-detail | 1440 | 갤러리 "평면도"·"위치" | "평면도" 캡션 이미지가 노드-화살표 워크플로 다이어그램, "위치"는 지도 자리표시 아이콘: 매물 사진 4장 중 2장이 목적 불일치 | 상 | visual-reaudit/1440/realty-detail.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 116 | realty-detail | 1440 | 실거래가 차트 | 카드 폭 730px 중 500px만 사용, 우측 빔 | 중 | visual-reaudit/1440/realty-detail.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 117 | recipe-detail | 1440 | 본문 구성 | 1000px 단일 기둥에 약 570px 높이 대형 사진 + 재료·순서가 세로 일렬; 만드는 순서는 우측 60% 빔, 재료 카드와 순서(카드 없음) 처리 불일치 | 중 | visual-reaudit/1440/recipe-detail.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 118 | research-paper | 1440 | 그림 1 | 하천 기온 논문 그림 자리에 SaaS "프로젝트 현황" 대시보드 목업(하단 잘림) | 상 | visual-reaudit/1440/research-paper.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 119 | research-paper | 1440 | 본문 기둥 | 695px 기둥에 헤더·구분선까지 갇혀 좌우 비고, 연회색 얇은 세리프 | 중 | visual-reaudit/1440/research-paper.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 120 | saas-landing | 1440 | 핵심 기능 | 히어로와 동일한 대시보드 목업을 610px로 확대해 다시 사용(중복 art) | 중 | visual-reaudit/1440/saas-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 121 | saas-landing | 1440 | 하단 bento | 칸 높이·폭이 제각각이고 인용만 카드 없이 떠 있어 격자가 흐트러짐 | 중 | visual-reaudit/1440/saas-landing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 122 | saas-landing | 1440 | 섹션 머리말 | 제목 좌측, 설명 우측 끝 분리(제목-설명 간격 350px) | 하 | visual-reaudit/1440/saas-landing.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 123 | sales-dashboard | 1440 | 지역별 도넛 카드 | 막대 차트 카드 높이에 맞춰 늘어나 아래 ~40% 빔 | 중 | visual-reaudit/1440/sales-dashboard.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 124 | server-error | 1440 | 전역 | 한글이 모노스페이스 폴백, 이전 페이지 링크가 버튼에서 ~80px 떨어져 떠 있음 | 중 | visual-reaudit/1440/server-error.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 125 | settings | 1440 | 프로필 폼 | 입력 폭이 카드 폭의 절반(336/680)이고 우측 절반이 비어 있음 | 중 | visual-reaudit/1440/settings.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 126 | signup | 1440 | 푸터 | "모아 · Static Kit 2.2.0" 도구 문구 노출 | 하 | visual-reaudit/1440/signup.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 127 | solar-landing | 1440 | 히어로 이미지 | 태양광 서비스에 갈색 사각형+청록 원+삼각형 공용 추상 도형 | 중 | visual-reaudit/1440/solar-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 128 | solar-landing | 1440 | 지표 카드 | 앞 카드만 보조 줄이 있고 2·3번째는 값만 있어 카드 내부 밀도 불일치 | 하 | visual-reaudit/1440/solar-landing.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 129 | solar-landing | 1440 | 월간 발전량 차트 | 카드 폭 610px 중 약 330px만 쓰고 좌우 빔 | 중 | visual-reaudit/1440/solar-landing.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 130 | status-page | 1440 | 전역 | 한글 모노스페이스 폴백, 섹션 전체가 좌우 ~40px 패딩으로 1380px까지 늘어나 작은 글씨가 퍼짐 | 중 | visual-reaudit/1440/status-page.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 131 | status-page | 1440 | 상태 카드+구성 요소 표 | API/웹/업로드 상태가 카드와 표에 2번 반복 | 중 | visual-reaudit/1440/status-page.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 132 | status-page | 1440 | 사건 기록 | 세로 타임라인이 좌측 150px만 쓰고 우측 비어 있음 | 중 | visual-reaudit/1440/status-page.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 133 | support-queue | 1440 | 문의 상세 창 | 상세 창이 140px만 차지하고 목록 아래까지 ~250px 빈 영역(inbox와 동일 패턴) | 중 | visual-reaudit/1440/support-queue.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 134 | survey | 1440 | 헤더/본문 | 695px 기둥에 헤더 구분선까지 갇힘, 라디오 라벨 11px, 질문은 한 문항뿐이라 카드 안이 휑함 | 하 | visual-reaudit/1440/survey.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 135 | team-chat | 1440 | 입력부 | 채팅 입력이 라벨+도움말+입력+버튼을 담은 폼 카드로, 대화 UI와 어색(composer 아님) | 중 | visual-reaudit/1440/team-chat.png | src/catalog/templates.mjs, src/render/ (추정) |
| 136 | team-directory | 1440 | 구성원 카드 | 6장 균일 카드, 각 카드 우측 60%가 비고 이름/역할/팀 3줄이 모두 같은 크기 위계 | 하 | visual-reaudit/1440/team-directory.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 137 | travel-ocean | 1440 | 히어로/카드 | 히어로 삽화와 첫 카드 삽화가 동일(중복) | 하 | visual-reaudit/1440/travel-ocean.png | src/catalog/templates.mjs, src/render/ (추정) |
| 138 | tutorial | 1440 | 단계 표시 | 상단 stepper(준비-작성-검증-빌드)와 아래 번호 steps 4개가 같은 내용을 두 번 표시 | 중 | visual-reaudit/1440/tutorial.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 139 | waitlist | 1440 | 카드 | 폼·기능 카드 전부 청록 네온 글로우로 강조 과다; 이메일 입력 옆에 동의 체크박스가 같은 줄에 붙어 정렬 어색 | 중 | visual-reaudit/1440/waitlist.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 140 | wedding-invite | 1440 | 사진 갤러리 | 대형 1+소형 2+고아 1장으로 끝나는 비대칭 배치, 사진 내용이 커피잔·화분·침대(청첩장과 무관) | 중 | visual-reaudit/1440/wedding-invite.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 141 | wedding-invite | 1440 | 제목 | 얇은 세리프 제목에 자간이 넓어 "서 로 의  계 절 이" 로 흩어져 읽힘; 섹션 상하 여백 과다(페이지 4481px) | 중 | visual-reaudit/1440/wedding-invite.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 142 | wine-list | 1440 | 헤더 | 로고 중앙 2단 헤더에서 "예약하기" 버튼이 우측 상단에 붙어 로고와 세로 중심 불일치 | 하 | visual-reaudit/1440/wine-list.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 143 | (공통) | 1440 | 중앙 로고 헤더 | blog-index·menu-dining·beauty-detail·wine-list·luxury-brand: CTA가 로고 행과 세로 정렬이 안 맞음 | 하 | visual-reaudit/1440/(공통).png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 144 | about-team | 390 | 팀 카드 | 3장이 1열로 쌓이며 카드당 내용 3줄에 상하 패딩 큼(카드 높이 130px 중 절반 빔) | 하 | visual-reaudit/390/about-team.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 145 | admin-table | 390 | 주문 표 | 표가 카드 안에서 잘려 "상태" 열이 가로로 끊기고 주문번호 "A-/10231"이 줄바꿈됨 | 중 | visual-reaudit/390/admin-table.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 146 | agency-home | 390 | 서비스 카드 | 카드 3장이 높이 ~150px로 큰 위아래 여백, 히어로 통계와 "선별한 작업" 사이 ~80px 공백, 작업 이미지 5장이 1열로 길게 쌓임 | 하 | visual-reaudit/390/agency-home.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 147 | api-reference | 390 | 매개변수 표 | 4열 표가 카드 폭에 눌려 "SHA-/256 해시" 등 중간 줄바꿈, 코드 블록 끝 잘림 | 중 | visual-reaudit/390/api-reference.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 148 | app-landing | 390 | 전체 | 지표 카드 3장 1열(각 ~100px), 구성 무난 | 하 | visual-reaudit/390/app-landing.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 149 | audit-log | 390 | 전역 | 한글 모노스페이스 폴백(데스크톱과 동일 원인) | 중 | visual-reaudit/390/audit-log.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 150 | b2b-solution | 390 | 히어로 이미지 | 대시보드 목업이 폭 250px로 축소되어 글씨 판독 불가(장식화) | 하 | visual-reaudit/390/b2b-solution.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 151 | bank-product | 390 | 히어로 목업 | 대시보드 목업이 축소돼 판독 불가, 은행 상품과 무관(데스크톱과 동일 원인) | 중 | visual-reaudit/390/bank-product.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 152 | beauty-detail | 390 | 헤더 | 로고 / 장바구니 pill / 탭 3단으로 쌓여 헤더가 ~130px, 첫 화면의 15% | 중 | visual-reaudit/390/beauty-detail.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 153 | beauty-detail | 390 | 지표 카드 | 카드 3장이 각 ~100px로 쌓여 값 하나에 큰 패딩 | 하 | visual-reaudit/390/beauty-detail.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 154 | billing | 390 | 청구 내역 표 | "팀 플랜 · 5명"이 3줄, "10월 19일"이 2줄로 쪼개져 행이 불규칙 | 중 | visual-reaudit/390/billing.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 155 | blog-index | 390 | 헤더 | 로고 / 구독 버튼(큰 면) / 탭 3단 헤더가 ~150px | 중 | visual-reaudit/390/blog-index.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 156 | blog-index | 390 | 첫 카드(대표 글) | 대표 카드 이미지가 110x65 썸네일로 좌상단에 붙고 다른 카드는 전폭 이미지: 같은 카드 부품이 모바일에서 규칙 없이 달라짐 | 상 | visual-reaudit/390/blog-index.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 157 | cafe-home | 390 | 공간 갤러리 | 이미지 3장이 전폭으로 1열 쌓여 약 750px 차지 | 하 | visual-reaudit/390/cafe-home.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 158 | case-study | 390 | 지표 3개 | 기간/재방문율/SNS 언급이 항목당 ~110px 간격으로 늘어져 큰 빈 영역 | 하 | visual-reaudit/390/case-study.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 159 | course-catalog | 390 | 강좌 카드 | 2열 카드(폭 130px)에 설명이 3줄로 접혀 11px 텍스트가 빽빽, 데스크톱 3열의 단순 축소 | 중 | visual-reaudit/390/course-catalog.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 160 | dashboard-overview | 390 | 새 프로젝트 | 헤더와 제목 아래에 같은 주 버튼 2개가 연달아 나옴 | 하 | visual-reaudit/390/dashboard-overview.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 161 | devtool-landing | 390 | 히어로 이미지 | 개발 CLI 제품에 모바일 앱 목업(데스크톱과 동일) | 중 | visual-reaudit/390/devtool-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 162 | docs-reference | 390 | 요청 매개변수 표 | 4열 표 설명 열이 ~60px로 눌려 "한 번에/가져올/개수(최대/100)"처럼 4~5줄 세로 쌓임 | 상 | visual-reaudit/390/docs-reference.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 163 | hr-people | 390 | 칸반 | 열이 폭 ~150px로 가로 스크롤되며 두 번째 열 카드 제목이 잘려 보이고 스크롤 단서가 없음 | 하 | visual-reaudit/390/hr-people.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 164 | incident-report | 390 | 전역 | 한글 모노스페이스 폴백 | 중 | visual-reaudit/390/incident-report.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 165 | forbidden | 390 | 이전 페이지 링크 | 데스크톱과 동일하게 버튼과 링크가 ~90px 떨어짐 | 하 | visual-reaudit/390/forbidden.png | src/catalog/templates.mjs, src/render/ (추정) |
| 166 | luxury-brand | 390 | 헤더 | 로고 / 방문 예약 버튼 / 탭 3단 헤더 ~150px | 중 | visual-reaudit/390/luxury-brand.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 167 | menu-dining | 390 | 헤더 | 로고 / 예약하기 / 탭 3단 헤더 ~170px(첫 화면의 20%) | 중 | visual-reaudit/390/menu-dining.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 168 | museum-home | 390 | 통계 행 | "120/11.30/무료" 중 "무료"만 라벨이 2줄이라 값 baseline이 위로 올라감 | 하 | visual-reaudit/390/museum-home.png | src/catalog/templates.mjs, src/render/ (추정) |
| 169 | museum-home | 390 | 헤더 | 마스트헤드·관람 예약 버튼·탭이 3단으로 쌓임 | 하 | visual-reaudit/390/museum-home.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 170 | news-home | 390 | 대표 기사 카드 | 대표 카드 이미지가 115x65 썸네일로 좌상단에 붙음(blog-index와 동일 카드 부품 모바일 붕괴) | 상 | visual-reaudit/390/news-home.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 171 | news-home | 390 | 구독 버튼 | 마스트헤드 아래 우측에 빨간 버튼이 단독 줄을 차지 | 하 | visual-reaudit/390/news-home.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 172 | news-home | 390 | 많이 읽은 기사 | 가로 스크롤 카드가 잘려 제목 중간에서 끊김 | 하 | visual-reaudit/390/news-home.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 173 | portfolio-grid | 390 | 작업 격자 | 8개 썸네일이 전폭 1열로 쌓여 약 3000px, 2열 전환 없음 | 하 | visual-reaudit/390/portfolio-grid.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 174 | product-landing | 390 | "사양" 일러스트 | 램프 사양 아래 노드-화살표 다이어그램(데스크톱과 동일) | 상 | visual-reaudit/390/product-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 175 | product-listing | 390 | 필터 패널 | 필터가 상품 6개 아래(페이지 하단)에 놓여 접근 불가에 가까움 | 중 | visual-reaudit/390/product-listing.png | src/catalog/templates.mjs, src/render/ (추정) |
| 176 | project-board | 390 | 칸반 | 열 ~150px 가로 스크롤, 2번째 열 카드 제목이 잘리고 스크롤 단서 없음 | 하 | visual-reaudit/390/project-board.png | src/typography.mjs, src/styles/chunks.mjs (추정) |
| 177 | property-search | 390 | 매물 표 | 단지명 "성수/리버뷰", "59/㎡", "11월/말"이 중간 줄바꿈되는 5열 표, 지도는 표 아래 자리표시 박스 | 중 | visual-reaudit/390/property-search.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 178 | realty-detail | 390 | 갤러리 | 4장 중 "평면도"(워크플로 다이어그램)·"위치"(지도 자리표시)가 전폭으로 길게 쌓임(데스크톱과 동일 문제) | 상 | visual-reaudit/390/realty-detail.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 179 | research-paper | 390 | 그림 1 | SaaS 대시보드 목업(데스크톱과 동일) | 상 | visual-reaudit/390/research-paper.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 180 | sales-dashboard | 390 | 진행 중인 큰 계약 표 | 6열 표가 카드 밖으로 잘려 마지막 "마감" 열이 "1"만 보임, 단계 칸 "최종/협상" 줄바꿈 | 중 | visual-reaudit/390/sales-dashboard.png | src/styles/chunks.mjs, src/styles/shells.mjs (추정) |
| 181 | saas-landing | 390 | 핵심 기능 목업 | 히어로와 같은 대시보드 목업이 2번 반복(데스크톱과 동일) | 하 | visual-reaudit/390/saas-landing.png | src/catalog/templates.mjs, src/render/motifs.mjs (추정) |
| 182 | signup | 390 | 푸터 | "Static Kit 2.2.0" 노출 | 하 | visual-reaudit/390/signup.png | src/styles/shells.mjs, src/styles/chunks.mjs (추정) |
| 183 | status-page | 390 | 전역 | 한글 모노스페이스 폴백 | 중 | visual-reaudit/390/status-page.png | src/typography.mjs, src/styles/chunks.mjs (추정) |

## 커버리지와 한계

- 캡처 영수증: [receipt.json](visual-reaudit/receipt.json). 예시별 응답 상태·문서 높이·가로 스크롤 폭이 기록돼 있다.
- 자동 검사: 브라우저 렌더 폭 초과 0/170. 이 검사는 시각 위계, 과밀·공백, 콘텐츠와 이미지의 문맥 일치, 부품 선택을 판별하지 않는다.
- 브라우저 재확인: 현재 세션에서 운영 bank-product를 브라우저 도구로 열고 전체 페이지 캡처를 추가 확인했다. 기존 전체 세트는 이전 실행의 영수증과 파일을 재사용했다.
- 보조 계측 스크립트는 문법 오류를 고쳤고 node --check 통과. 직접 Playwright 실행은 macOS 브라우저 preflight가 blocked(Mach register / LaunchServices Mach lookup denied)로 끝나 이번 세션에서는 미실행했다. 이미 생성된 캡처·영수증의 출처와 현재 재현은 구분한다.
- 이번 작업은 감사만 수행했다. src, site, tests 수정·커밋·푸시·배포는 하지 않았다.
