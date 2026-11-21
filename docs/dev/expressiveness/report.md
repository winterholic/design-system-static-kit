# Core 표현력 실험 보고서

- 브랜치 `next/f-expressiveness`, 기준 `main` f1d250cf2, 카탈로그 2.4.0
- 범위: 실험과 제안까지. `src/**`는 수정하지 않았다(`git diff main -- src` 비어 있음). 이 문서의 표 일부는 `build-report.mjs`가 `specs.mjs`, `verdicts.mjs`, `cases/results.json`, `negative-probes-results.json`에서 생성한다.
- 시각 판단은 1280px·390px 캡처를 직접 보고 내렸다. 자동 검사 통과(validate·check·가로 넘침 0)는 미감 평가가 아니다. 직접 본 캡처는 15개 사례의 1280px 전부, 390px은 01·12·13이고 나머지 390px은 가로 넘침 측정만 했다(7절).

## 0. 결론

1. 15개 유형을 현재 문법으로 모두 검증·컴파일·`check`까지 통과시켰다. 그러나 원하는 요소 90개 중 완전히 구현된 것은 44개뿐이고 32개는 부분, 14개는 불가였다.
2. 부족의 대부분은 "무엇이 더 중요한가"를 정하는 수단의 부재다. 비율(히어로·분할), 강조 칸, 풀쿼트 크기, 섹션 여백과 배경 리듬, 전폭 사진이 반복해서 막혔다. 서체·모서리·깊이 같은 기존 축은 대체로 충분했다. 예외는 형광색으로, 라이트 모드에서는 대비 게이트가 어둡게 옮긴다.
3. 작성자 선택 실패가 생각보다 많았다. 첫 시도에서 놓쳐 막힌 것으로 기록했다가 문법 안의 해법을 찾은 것이 7건이다(월/연 전환, 색 블록 둘, 두 트랙 나란히, 점선 메뉴 단 배치, 불규칙 갤러리, 가격 먼저, 어두운 히어로). 2건은 해법이 부분적이다(두 트랙, 갤러리). AI가 카탈로그를 탐색하는 경로(조합 예시·탐침)가 필요하다는 근거다.
4. 강제 규칙 11개(X01~X11) 중 반사실 실험으로 전제가 재현된 것은 X02 하나, 부분 재현은 X01뿐이다. X03·X06·X07은 전제가 재현되지 않았다(5절). 변형 계약 V01~V06은 직접 작성한 Blueprint에는 적용되지 않는다(ADR 0006 호환 정책, 11번 사례로 확인).
5. 제안은 5개로 줄였다(6절). 모두 닫힌 enum 필드이고 자유 CSS가 없다. 색 블록 surface 제안은 `split` 안의 `cta` 둘로 가능함이 확인되어 접었다.
6. 표현력과 별개의 렌더러·계약 결함 5건을 찾았다(4.3절). 제안이 아니라 수정 후보다.

## 1. 방법

| 단계 | 내용 | 파일 |
|---|---|---|
| 정의 | 구조·스타일을 글로 먼저 고정하고 항목마다 "원하는 것" 6개를 적었다 | `specs.mjs` |
| 작성 | 현재 Blueprint 문법만으로 작성. 첫 오류와 수정은 `cases/attempts.log`에 남는다 | `cases-src/*.mjs` → `cases/*.json` |
| 실행 | `kit validate` → `compile` → `kit build` → `kit check` → Chromium 캡처 1280·390 | `run-cases.mjs` |
| 측정 | 눈으로 의심한 항목을 DOM 수치로 확인. `probe-results.json`은 최종 사례 기준이고 초안 수치(grid 카드 384px, 요금제 452px)는 판정 근거 열에 옮겨 적었다 | `probe.mjs` → `probe-results.json` |
| 부정 탐침 | 원하는 것을 쓰려 했을 때 검증기의 답 | `negative-probes.mjs` |
| 반사실 | `axisBans`를 비운 `src` 복사본(`/tmp/expr/nb`, 원본 무수정)으로 금지 조합을 실제로 렌더 | `counterfactual.mjs`, `counterfactual2.mjs` |
| 판정 | 캡처와 수치를 보고 ○·△·✕와 원인을 적음 | `verdicts.mjs` |

원인 분류: A 작성자·AI 선택 실패, B 카탈로그 표현력, C 렌더러, D 자산 부족, E 규약이 막음. 정적 범위 밖 동작(카운트다운 계산 등)은 E로 적었다(`docs/design.md` 13절).

한계: 모든 사진 자리는 일러스트 모티프이므로 "사진 중심" 사례의 시각 품질은 실제 사진일 때와 다르다(D). 사례마다 한 사람이 한 번 작성했고 반복 시도 횟수는 `attempts.log`가 전부다. 사용자 승인이나 미감 보증이 아니다.

## 2. 사례 정의 (15개)

외부 이미지·문구를 복사하지 않고 구조만 적었다.

### 01-magazine · 편집형 매거진

테마 `magazine`. 신문 제호가 달린 월간지의 표지 기사 페이지. 첫 화면은 큰 세리프 헤드라인과 커버 사진이 비대칭(글 40 : 사진 60)으로 놓인다. 아래는 기사 3개가 한 줄 카드이고, 한 기사만 두 배 폭으로 강조된다. 중간에 본문 폭을 벗어난 큰 풀쿼트가 한 번 나오고, 맨 아래는 촘촘한 "이달의 목록"이 작은 글씨로 이어진다. 위쪽은 여백이 크고 아래쪽은 촘촘하게 밀도가 구역마다 다르다.

원하는 요소: 커버 헤드라인과 사진이 40:60 비대칭 / 3개 기사 카드 중 하나만 2배 폭 / 본문 폭 밖으로 나온 대형 풀쿼트 / 위는 여백 크게, 아래 목록은 촘촘하게(구역별 밀도) / 기사 카드의 키커·바이라인 위계 / 제호형 머리와 섹션 내비

### 02-asym-portfolio · 비대칭 포트폴리오

테마 `studio`. 건축 사진가의 포트폴리오. 글은 거의 없고 사진이 주인공이다. 첫 화면은 한 장의 큰 사진(전폭 21:9)과 오른쪽 아래에 작게 붙은 이름·연락 문구. 그 아래 프로젝트는 "큰 사진 70% + 좁은 캡션 30%"가 번갈아 좌우를 바꿔 가며 세 번 나온다. 마지막은 불규칙한 크기의 갤러리 한 덩어리.

원하는 요소: 글보다 사진이 지배하는 전폭 첫 화면(캡션은 모서리에 작게) / 사진 70 : 캡션 30 비율 / 좌우를 번갈아 바꾸는 반복 / 캡션이 사진 아래 가장자리에 걸치는 비정렬 배치 / 크기가 불규칙한 갤러리 / 본문 글 최소(프로젝트당 두 줄 이하)

### 03-dense-dashboard-landing · 밀도 높은 대시보드형 랜딩

테마 `insight`. 데이터 분석 SaaS의 랜딩. 첫 화면에 제품 화면 목업과 헤드라인, 바로 아래 지표 4개가 한 줄. 이어 차트 2개가 나란히, 그 옆에 표, 다시 지표 격자와 활동 목록이 촘촘하게 이어진다. 스크롤 한 번에 5개 이상의 데이터 덩어리가 보이는 compact 밀도. CTA는 맨 끝 한 번.

원하는 요소: 히어로에 제품 화면 목업 / 지표 4개가 한 줄 / 차트 둘과 표를 같은 줄에 나란히(3칸 대시보드 줄) / 랜딩인데 영역 간 간격이 대시보드 수준으로 촘촘 / 활동 목록과 지표가 한 구역 안에서 혼합 / CTA 하나

### 04-pricing-saas · 가격표 중심 SaaS

테마 `trust`. 가격이 첫 화면인 SaaS. 헤드라인 한 줄 뒤에 곧바로 3개 요금제가 나란히, 가운데 추천 요금제가 더 크고 진하게 돋보인다. 월/연 전환이 보이고(연 결제 할인 표시), 아래에 기능 비교표(행 12개, 요금제 3열), 신뢰 로고 줄, FAQ 6개로 끝난다.

원하는 요소: 3 요금제, 가운데 추천이 크기·색으로 강조 / 월/연 결제 전환 표시 / 요금제×기능 비교표(체크 표시 셀) / 헤드라인 직후 가격이 첫 화면에 들어옴 / 신뢰 로고 줄과 FAQ / 연 결제 할인 배지

### 05-image-product · 이미지 중심 제품

테마 `commerce`. 조명 브랜드의 제품 상세. 첫 화면은 제품 사진이 화면 반 이상을 차지하고 오른쪽에 이름·가격·구매 박스가 고정된다. 아래로 사진 갤러리(큰 1 + 작은 3), 소재와 치수 속성표, 사용 장면 사진 한 장 풀폭, 후기 3개.

원하는 요소: 제품 사진이 첫 화면의 절반 이상 / 스크롤 중에도 구매 박스가 따라옴 / 큰 사진 1 + 작은 사진 3 갤러리 / 소재·치수 속성표 / 사용 장면 사진 1장 풀폭 띠 / 후기 3개

### 06-docs-reference · 문서형

테마 `manual`. 개발 문서의 한 페이지. 왼쪽 고정 사이드바 내비, 가운데 본문, 오른쪽 "이 페이지" 목차가 3단이다. 본문은 제목, 설치 코드 블록, 단계 목록, 매개변수 표, 경고 알림, 이전/다음 링크 순서. 읽기 폭 70자 안팎.

원하는 요소: 사이드바·본문·우측 목차 3단 / 코드 블록과 설명이 번갈아 / 매개변수 표(이름·타입·설명) / 경고 알림 박스 / 이전/다음 문서 링크 한 쌍 / 본문 읽기 폭 70자 안팎

### 07-event-conference · 이벤트

테마 `playful`. 1일 디자인 컨퍼런스. 첫 화면은 날짜와 장소가 거대한 숫자 타이포로, 곁에 카운트다운 느낌의 남은 일수. 일정은 시간대별 세로 타임라인에 트랙 두 개가 나란히. 연사 6명은 사진 자리와 이름. 티켓 3종, 오시는 길(지도 자리)과 안내.

원하는 요소: 날짜가 첫 화면을 지배하는 거대 숫자 타이포 / 남은 일수 표시 / 두 트랙이 같은 시간축에 나란한 일정표 / 연사 6명 사진 자리 격자 / 티켓 3종 비교 / 지도 자리와 오시는 길

### 08-restaurant · 레스토랑

테마 `dining`. 동네 비스트로의 홈페이지. 어두운 톤의 첫 화면에 가게 사진과 짧은 소개, 예약 버튼. 대표 메뉴는 사진 카드 4개, 전체 메뉴는 점선 리더(이름 ····· 가격)로 코스별 두 단. 영업시간·위치 표, 간단한 예약 폼.

원하는 요소: 어둡고 분위기 있는 첫 화면 / 대표 메뉴 사진 카드 4 / 리더선 메뉴를 코스별로 두 단 배치 / 영업시간 표 / 예약 폼 / 코스 이름이 메뉴 단의 머리말

### 09-brutalist-zine · 브루탈리즘

테마 `brutalist`. 독립 출판 집단의 웹사이트. 거친 두꺼운 테두리, 오프셋 그림자, 모노스페이스, 대문자 거대 제목. 격자는 일부러 불규칙해서 큰 칸과 작은 칸이 뒤섞이고, 어떤 요소는 살짝 기울거나 겹친다. 색은 형광 두 가지와 검정.

원하는 요소: 두꺼운 테두리와 오프셋 그림자 / 모노스페이스 + 대문자 거대 제목 / 불규칙 격자(큰 칸·작은 칸 혼합) / 기울거나 겹친 요소 / 형광 2색 + 검정 팔레트 / 날것의 내비(박스 버튼 나열)

### 10-swiss-type · 스위스 타이포

테마 `swiss`. 이미지가 없는 타이포그래피 페이지. 12열 격자에서 작은 인덱스 번호(01~04)는 왼쪽 2열, 제목은 가운데 6열, 본문은 오른쪽 4열에 놓인다. 가는 가로 선이 섹션을 나누고, 왼쪽 정렬만 쓰며, 큰 제목은 한 줄에 크게. 색은 흑백과 빨강 하나.

원하는 요소: 인덱스 번호·제목·본문이 12열 격자의 서로 다른 열 / 가는 가로 선 구분 / 이미지 없이 타이포로만 구성 / 왼쪽 정렬 단일 축 / 큰 제목이 한 줄에 크게 / 흑백과 빨강 하나

### 11-luxe-brand · 럭셔리 브랜드 스토리

테마 `luxe`. 향수 하우스의 브랜드 스토리. 다크 모드에 얇은 세리프, 넓은 여백. 첫 화면은 문장 하나와 작은 버튼. 이어 사진 한 장 전폭, 그 옆 아닌 아래에 짧은 철학 문단 세 개가 큰 간격으로. 제품은 3개를 큰 여백 속에 이름과 가격만. 맨 아래 뉴스레터 한 줄.

원하는 요소: 문장 하나와 작은 버튼뿐인 첫 화면 / 섹션 간 매우 큰 여백(밴드 150px 이상) / 얇은 세리프(가벼운 굵기) / 제품 3개를 이름·가격만으로 / 전폭 사진 한 장 / 이메일 입력 한 줄 뉴스레터

### 12-news-home · 고밀도 뉴스 메인

테마 `newsroom`. 뉴스 포털 메인. 상단에 톱 기사 하나(사진 + 큰 제목)와 그 오른쪽에 속보 목록 6줄. 아래 4열 기사 카드, 그 아래 "많이 본 뉴스" 번호 목록과 섹션별 3열 목록. 글꼴은 작고 촘촘, 사진은 작은 썸네일 위주.

원하는 요소: 톱 기사(좌)와 속보 목록(우)이 한 줄 / 4열 기사 카드 / 번호가 붙은 많이 본 뉴스 목록 / 작은 썸네일이 붙은 촘촘한 목록 / 섹션별 3열 목록 / 작고 촘촘한 글자 크기

### 13-app-landing-dark · 다크 모바일 앱 소개

테마 `nocturne`. 수면 기록 앱의 소개 페이지. 다크 모드, 은은한 그라데이션. 첫 화면은 헤드라인과 휴대폰 목업 2개가 겹쳐 놓인 구성, 스토어 버튼 두 개. 기능 3개는 번갈아 좌우로 목업과 함께, 후기 한 개 크게, 마지막 다운로드 띠.

원하는 요소: 휴대폰 목업 둘이 겹쳐 놓임 / 스토어 버튼 둘(아이콘과 두 줄 라벨) / 기능 소개가 좌우 번갈아 목업과 함께 / 다크 + 은은한 그라데이션 배경 / 큰 후기 한 개 / 마지막 다운로드 띠

### 14-campaign-poster · 캠페인·후원 포스터형

테마 `colorblock`. 환경 단체 후원 캠페인. 첫 화면은 포스터처럼 커다란 한 줄 문구가 화면 전폭, 단색 큰 블록 두 개가 나란히. 모금 현황은 큰 진행 막대와 숫자, 이야기는 날짜 순서 타임라인, 후원 금액은 4개 카드에서 하나를 고르는 폼.

원하는 요소: 전폭 한 줄 포스터 문구 / 단색 대형 블록 둘이 나란히 / 큰 진행 막대와 모금액 숫자 / 날짜 순서 이야기 타임라인 / 후원 금액 4택1 카드 / 화면 어디서든 주 행동 하나

### 15-devtool-terminal · 개발자 도구 터미널형

테마 `devtool`. 명령줄 도구의 소개. 터미널 서체와 격자 배경. 첫 화면에 한 줄 설치 명령 코드가 가장 크고, 곁에 실행 결과 예시. 기능은 코드 조각 3개 탭(JS·Python·bash), 변경 기록 3줄, GitHub 별 수 같은 숫자 3개.

원하는 요소: 설치 명령이 첫 화면의 최대 요소 / 언어별 코드 탭 / 실행 결과 예시 블록 / 격자 배경 / 변경 기록 3줄 / 제목까지 모노스페이스

## 3. 사례별 결과

### 3.1 실행 결과

| 사례 | validate | compile | build·check | 가로 넘침 1280 / 390 | 문서 높이 1280 / 390 |
|---|---|---|---|---|---|
| 01-magazine | VALID | ok | VERIFIED | none / none | 2877 / 3624 |
| 02-asym-portfolio | VALID | ok | VERIFIED | none / none | 4286 / 3908 |
| 03-dense-dashboard-landing | VALID | ok | VERIFIED | none / none | 2668 / 3608 |
| 04-pricing-saas | VALID | ok | VERIFIED | none / none | 2945 / 3792 |
| 05-image-product | VALID | ok | VERIFIED | none / none | 4316 / 3335 |
| 06-docs-reference | VALID | ok | VERIFIED | none / none | 1769 / 2040 |
| 07-event-conference | VALID | ok | VERIFIED | none / none | 3570 / 5337 |
| 08-restaurant | VALID | ok | VERIFIED | none / none | 3655 / 3863 |
| 09-brutalist-zine | VALID | ok | VERIFIED | none / none | 1894 / 2947 |
| 10-swiss-type | VALID | ok | VERIFIED | none / none | 1518 / 1899 |
| 11-luxe-brand | VALID | ok | VERIFIED | none / none | 2835 / 2205 |
| 12-news-home | VALID | ok | VERIFIED | none / none | 2012 / 4156 |
| 13-app-landing-dark | VALID | ok | VERIFIED | none / none | 4231 / 3569 |
| 14-campaign-poster | VALID | ok | VERIFIED | none / none | 3151 / 3686 |
| 15-devtool-terminal | VALID | ok | VERIFIED | none / none | 2496 / 2889 |

산출 파일(30개 캡처): `01-magazine-1280.jpg`, `01-magazine-390.jpg`, `01-magazine.json`, `02-asym-portfolio-1280.jpg`, `02-asym-portfolio-390.jpg`, `02-asym-portfolio.json`, `03-dense-dashboard-landing-1280.jpg`, `03-dense-dashboard-landing-390.jpg`, `03-dense-dashboard-landing.json`, `04-pricing-saas-1280.jpg`, `04-pricing-saas-390.jpg`, `04-pricing-saas.json`, `05-image-product-1280.jpg`, `05-image-product-390.jpg`, `05-image-product.json`, `06-docs-reference-1280.jpg`, `06-docs-reference-390.jpg`, `06-docs-reference.json`, `07-event-conference-1280.jpg`, `07-event-conference-390.jpg`, `07-event-conference.json`, `08-restaurant-1280.jpg`, `08-restaurant-390.jpg`, `08-restaurant.json`, `09-brutalist-zine-1280.jpg`, `09-brutalist-zine-390.jpg`, `09-brutalist-zine.json`, `10-swiss-type-1280.jpg`, `10-swiss-type-390.jpg`, `10-swiss-type.json`, `11-luxe-brand-1280.jpg`, `11-luxe-brand-390.jpg`, `11-luxe-brand.json`, `12-news-home-1280.jpg`, `12-news-home-390.jpg`, `12-news-home.json`, `13-app-landing-dark-1280.jpg`, `13-app-landing-dark-390.jpg`, `13-app-landing-dark.json`, `14-campaign-poster-1280.jpg`, `14-campaign-poster-390.jpg`, `14-campaign-poster.json`, `15-devtool-terminal-1280.jpg`, `15-devtool-terminal-390.jpg`, `15-devtool-terminal.json`

### 3.2 항목별 판정

총 90개 항목: ○ 44, △ 32, ✕ 14.

| 사례 | 항목 | ○ | △ | ✕ |
|---|---|---|---|---|
| 01-magazine | 6 | 1 | 2 | 3 |
| 02-asym-portfolio | 6 | 2 | 2 | 2 |
| 03-dense-dashboard-landing | 6 | 3 | 2 | 1 |
| 04-pricing-saas | 6 | 4 | 2 | 0 |
| 05-image-product | 6 | 4 | 2 | 0 |
| 06-docs-reference | 6 | 5 | 1 | 0 |
| 07-event-conference | 6 | 2 | 4 | 0 |
| 08-restaurant | 6 | 6 | 0 | 0 |
| 09-brutalist-zine | 6 | 1 | 4 | 1 |
| 10-swiss-type | 6 | 2 | 3 | 1 |
| 11-luxe-brand | 6 | 1 | 4 | 1 |
| 12-news-home | 6 | 2 | 2 | 2 |
| 13-app-landing-dark | 6 | 2 | 2 | 2 |
| 14-campaign-poster | 6 | 5 | 0 | 1 |
| 15-devtool-terminal | 6 | 4 | 2 | 0 |

### 01-magazine · 편집형 매거진

캡처: `cases/01-magazine-1280.jpg`, `cases/01-magazine-390.jpg` · Blueprint: `cases/01-magazine.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 커버 헤드라인과 사진이 40:60 비대칭 | ✕ | B | 히어로에 비율 키 없음(N04 UNKNOWN_KEY). 측정 527:527(P:hero01) |
| 3개 기사 카드 중 하나만 2배 폭 | △ | B+C | 초안 grid는 3칸 균등 384px(초안 측정). bento로 바꾸면 첫 카드가 왼쪽, 나머지 둘이 오른쪽에 쌓인 2열이 되고 카드 폭은 592px로 같다(P:cards01). 강조 폭이 아니라 균등 2열이며 사진은 얇은 띠로 잘린다(캡처) |
| 본문 폭 밖으로 나온 대형 풀쿼트 | ✕ | B | 인용에 크기 키 없음(N07). 박스형 후기로만 그려진다 |
| 위는 여백 크게, 아래 목록은 촘촘하게(구역별 밀도) | ✕ | B | 밀도는 페이지 전역 축이고 섹션 키 없음(N06) |
| 기사 카드의 키커·바이라인 위계 | △ | C | author·meta는 있으나 키커(분류)가 제목 아래 meta 줄에 고정 |
| 제호형 머리와 섹션 내비 | ○ | - | masthead 셸과 제호, 섹션 내비 |

### 02-asym-portfolio · 비대칭 포트폴리오

캡처: `cases/02-asym-portfolio-1280.jpg`, `cases/02-asym-portfolio-390.jpg` · Blueprint: `cases/02-asym-portfolio.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 글보다 사진이 지배하는 전폭 첫 화면(캡션은 모서리에 작게) | ✕ | B+E | cover 히어로에 visual 거부(N05 HERO_VISUAL), media는 콘텐츠 폭 안이며 bleed 키 없음(N28). minimal+full 폭은 X03(N18) |
| 사진 70 : 캡션 30 비율 | △ | B | ratio 3값뿐. wide-start 측정 710:474 ≈ 60:40(P:split02) |
| 좌우를 번갈아 바꾸는 반복 | ○ | - | reverse로 좌우 교대. 캡처 확인 |
| 캡션이 사진 아래 가장자리에 걸치는 비정렬 배치 | ✕ | B | overlay는 사진 가운데 라벨 박스로만 나온다(캡처). 위치 선택 없음 |
| 크기가 불규칙한 갤러리 | △ | A | 첫 시도 showcase는 큰 사진 1장과 썸네일 줄이라 불규칙 배치가 아니었다(캡처). masonry로 바꾸자 높이가 불규칙하게 나오나 마지막 줄에 빈칸이 남는다(캡처) |
| 본문 글 최소(프로젝트당 두 줄 이하) | ○ | - | 프로젝트당 한 줄 설명 |

### 03-dense-dashboard-landing · 밀도 높은 대시보드형 랜딩

캡처: `cases/03-dense-dashboard-landing-1280.jpg`, `cases/03-dense-dashboard-landing-390.jpg` · Blueprint: `cases/03-dense-dashboard-landing.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 히어로에 제품 화면 목업 | ○ | - | product 히어로 + chart 목업 |
| 지표 4개가 한 줄 | ○ | - | grid four 지표 한 줄 |
| 차트 둘과 표를 같은 줄에 나란히(3칸 대시보드 줄) | ✕ | B | grid에 table 불가(N01 CHILD_TYPE), split은 2칸(N02). 차트 3열 뒤에 표가 전폭으로 따로 놓인다 |
| 랜딩인데 영역 간 간격이 대시보드 수준으로 촘촘 | △ | B | compact여도 랜딩 밴드는 band 56px(SPACE.compact.band) 고정이라 대시보드 section 28px 밀도가 아니다. 구역별 조절 키 없음(N06) |
| 활동 목록과 지표가 한 구역 안에서 혼합 | △ | C | 목록과 진행률을 한 줄에 놓으면 진행률 상자가 높이만 늘어 대부분 비어 있다(캡처) |
| CTA 하나 | ○ | - | cta 하나 |

### 04-pricing-saas · 가격표 중심 SaaS

캡처: `cases/04-pricing-saas-1280.jpg`, `cases/04-pricing-saas-390.jpg` · Blueprint: `cases/04-pricing-saas.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 3 요금제, 가운데 추천이 크기·색으로 강조 | △ | C | 추천은 테두리와 "추천" 배지만 다르고 크기·위치 동일(최종 측정 323×409, top 459 셋 모두. 초안은 323×452로 같은 값) |
| 월/연 결제 전환 표시 | ○ | A | 첫 시도는 전환을 못 만든다고 봤으나 tabs(pill) 안에 pricing 둘로 가능(N10 통과). 작성자 선택 실패였다 |
| 요금제×기능 비교표(체크 표시 셀) | ○ | - | 12행 3열, "포함"은 체크 아이콘으로 렌더 |
| 헤드라인 직후 가격이 첫 화면에 들어옴 | ○ | A | 첫 시도는 섹션 제목이 가격 앞에 끼었다. section 없이 pricing·tabs를 페이지 직속에 두어 해결 |
| 신뢰 로고 줄과 FAQ | ○ | - | logo-cloud, faq split |
| 연 결제 할인 배지 | △ | B | plan에 배지 필드 없음. 탭 라벨("2개월 무료")과 period 문구로 대체 |

### 05-image-product · 이미지 중심 제품

캡처: `cases/05-image-product-1280.jpg`, `cases/05-image-product-390.jpg` · Blueprint: `cases/05-image-product.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 제품 사진이 첫 화면의 절반 이상 | ○ | - | aside 본문 804px / 1184px(P:aside05) |
| 스크롤 중에도 구매 박스가 따라옴 | ○ | - | kit-aside-side가 position:sticky(P:sticky05) |
| 큰 사진 1 + 작은 사진 3 갤러리 | △ | C | showcase 큰 사진이 1:1로 전폭을 채워 약 1180px 높이가 되고 썸네일은 작은 세로 줄(캡처) |
| 소재·치수 속성표 | ○ | - | properties inline |
| 사용 장면 사진 1장 풀폭 띠 | △ | B | 21:9 사진은 콘텐츠 폭 안. 전폭 띠 아님(N28) |
| 후기 3개 | ○ | - | 후기 3개 |

### 06-docs-reference · 문서형

캡처: `cases/06-docs-reference-1280.jpg`, `cases/06-docs-reference-390.jpg` · Blueprint: `cases/06-docs-reference.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 사이드바·본문·우측 목차 3단 | ○ | - | sidebar 셸 + aside(본문 652 + 목차 300, P:aside06) |
| 코드 블록과 설명이 번갈아 | ○ | - | prose·code·steps 교대 |
| 매개변수 표(이름·타입·설명) | ○ | - | 이름·타입·기본값·설명 4열. 표가 aside 밖이라 본문 열보다 넓다(작성자 배치) |
| 경고 알림 박스 | ○ | - | notice warning |
| 이전/다음 문서 링크 한 쌍 | △ | B | links는 세로 카드 목록. 좌우 한 쌍 배치 없음 |
| 본문 읽기 폭 70자 안팎 | ○ | - | 본문 652px |

### 07-event-conference · 이벤트

캡처: `cases/07-event-conference-1280.jpg`, `cases/07-event-conference-390.jpg` · Blueprint: `cases/07-event-conference.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 날짜가 첫 화면을 지배하는 거대 숫자 타이포 | △ | B | 히어로 제목은 display 상한 80px(P:sizes_07). 날짜가 첫 화면을 지배하는 크기 단계 없음(N29 titleSize 키 없음) |
| 남은 일수 표시 | △ | E | facts에 "D-7" 정적 문구. 날짜 계산은 정적 범위 밖(design.md 13절) |
| 두 트랙이 같은 시간축에 나란한 일정표 | △ | A+B | 첫 시도 tabs는 한 트랙만 보여 실패. split+timeline 둘로 나란히는 가능. 두 트랙이 같은 시간축에 정렬되지는 않는다(캡처) |
| 연사 6명 사진 자리 격자 | △ | D | team에 사진 키 없음(N30). 실루엣 아바타 6명 |
| 티켓 3종 비교 | ○ | - | pricing 3종, 얼리버드 추천 |
| 지도 자리와 오시는 길 | ○ | - | map 자리 + properties |

### 08-restaurant · 레스토랑

캡처: `cases/08-restaurant-1280.jpg`, `cases/08-restaurant-390.jpg` · Blueprint: `cases/08-restaurant.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 어둡고 분위기 있는 첫 화면 | ○ | A | 첫 시도는 hero를 쓰지 않고 section+media로 만들어 약했다. split 히어로+photo로 교체해 해결 |
| 대표 메뉴 사진 카드 4 | ○ | D | menu photo 4칸. 사진이 아니라 일러스트 모티프 |
| 리더선 메뉴를 코스별로 두 단 배치 | ○ | A | 첫 시도는 점선을 텍스트로 흉내 내(가격 의미 손실) 폐기. split 안에 menu leader 둘로 해결 |
| 영업시간 표 | ○ | - | table plain |
| 예약 폼 | ○ | - | form two-column |
| 코스 이름이 메뉴 단의 머리말 | ○ | - | menu title |

### 09-brutalist-zine · 브루탈리즘

캡처: `cases/09-brutalist-zine-1280.jpg`, `cases/09-brutalist-zine-390.jpg` · Blueprint: `cases/09-brutalist-zine.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 두꺼운 테두리와 오프셋 그림자 | ○ | - | elevation hard 2px 테두리와 4px 오프셋 |
| 모노스페이스 + 대문자 거대 제목 | △ | E+B | terminal+dramatic은 X06(N19)이라 balanced(49.9px). 대문자는 입력 문자열에만 의존(text-transform 수단 없음) |
| 불규칙 격자(큰 칸·작은 칸 혼합) | △ | B | bento 큰 칸 1+작은 4칸까지. 아래 3칸 카드는 균등 |
| 기울거나 겹친 요소 | ✕ | B | 기울임·겹침 수단 없음(의도된 선택일 수 있음). 사진 안 일러스트가 기운 것은 우연 |
| 형광 2색 + 검정 팔레트 | △ | E+C | 라이트 모드는 대비 게이트가 형광을 어둡게 이동(#00CCFF→#007896). 어두운 모드에서만 형광 유지. 바탕은 canvas 고정 |
| 날것의 내비(박스 버튼 나열) | △ | C | 내비는 셸 고정 모양. 박스 버튼 나열 아님 |

### 10-swiss-type · 스위스 타이포

캡처: `cases/10-swiss-type-1280.jpg`, `cases/10-swiss-type-390.jpg` · Blueprint: `cases/10-swiss-type.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 인덱스 번호·제목·본문이 12열 격자의 서로 다른 열 | ✕ | B | 열을 지정하는 수단 없음. properties inline의 라벨|값 2열이 가장 가깝다 |
| 가는 가로 선 구분 | △ | B | properties 안 선과 divider 라벨 선뿐. 섹션 사이 가는 선 없음 |
| 이미지 없이 타이포로만 구성 | ○ | - | 이미지 없음 |
| 왼쪽 정렬 단일 축 | ○ | - | section align start |
| 큰 제목이 한 줄에 크게 | △ | B | h1 64px 한 줄(dramatic이 최대 단계, P:sizes) |
| 흑백과 빨강 하나 | △ | C | 빨강 강조는 되나 섹션에 분홍 띠가 자동으로 칠해진다. surface:plain을 줘도 짝수 섹션은 칠해진다(shells.mjs:22, P:probe 11·10 배경값) |

### 11-luxe-brand · 럭셔리 브랜드 스토리

캡처: `cases/11-luxe-brand-1280.jpg`, `cases/11-luxe-brand-390.jpg` · Blueprint: `cases/11-luxe-brand.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 문장 하나와 작은 버튼뿐인 첫 화면 | △ | B | hero.body 필수(N14). "파리 · 1987"을 덧붙였다 |
| 섹션 간 매우 큰 여백(밴드 150px 이상) | ✕ | E | spacious 밴드 104px가 최대(SPACE.spacious.band). S09가 순서를 고정 |
| 얇은 세리프(가벼운 굵기) | ○ | - | luxe 서체 regular |
| 제품 3개를 이름·가격만으로 | △ | B | card.body 필수(N17). menu plain으로 우회해 이름·가격만 표시 |
| 전폭 사진 한 장 | △ | B | 21:9가 콘텐츠 폭 안(N28) |
| 이메일 입력 한 줄 뉴스레터 | △ | C | variant inline인데 라벨·입력·버튼이 3줄로 쌓임(캡처) |

### 12-news-home · 고밀도 뉴스 메인

캡처: `cases/12-news-home-1280.jpg`, `cases/12-news-home-390.jpg` · Blueprint: `cases/12-news-home.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 톱 기사(좌)와 속보 목록(우)이 한 줄 | ○ | - | aside wide: 톱 기사 + 속보 6줄 |
| 4열 기사 카드 | △ | C | 1280px 4열 ○. 390px에서 사진 카드 4개가 전폭 1열로 쌓여 밀도 상실(캡처) |
| 번호가 붙은 많이 본 뉴스 목록 | ✕ | B | list variant ordered 없음(N09 ENUM) |
| 작은 썸네일이 붙은 촘촘한 목록 | ✕ | B | list 항목에 썸네일 없음. horizontal 카드는 밀도가 낮다 |
| 섹션별 3열 목록 | ○ | - | grid three × list |
| 작고 촘촘한 글자 크기 | △ | E | compact+tight에서 카드 본문 15px(P:type12). 더 작은 role 없음 |

### 13-app-landing-dark · 다크 모바일 앱 소개

캡처: `cases/13-app-landing-dark-1280.jpg`, `cases/13-app-landing-dark-390.jpg` · Blueprint: `cases/13-app-landing-dark.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 휴대폰 목업 둘이 겹쳐 놓임 | ✕ | D+B | device 목업은 휴대폰 1대와 칩 2개로 고정, 겹침 수단 없음 |
| 스토어 버튼 둘(아이콘과 두 줄 라벨) | ✕ | B | action에 icon 키 없음(N08), 라벨 한 줄 |
| 기능 소개가 좌우 번갈아 목업과 함께 | △ | C | 좌우 교대 ○. 3:4 목업이 높이 795px로 커지고 위성 칩이 오른쪽에서 잘림(캡처, svg overflow hidden, P:device13) |
| 다크 + 은은한 그라데이션 배경 | ○ | - | nocturne 다크 + gradient + glow |
| 큰 후기 한 개 | △ | B | 인용 크기 키 없음(N07) |
| 마지막 다운로드 띠 | ○ | - | cta inverse(다크에서는 크림색 띠) |

### 14-campaign-poster · 캠페인·후원 포스터형

캡처: `cases/14-campaign-poster-1280.jpg`, `cases/14-campaign-poster-390.jpg` · Blueprint: `cases/14-campaign-poster.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 전폭 한 줄 포스터 문구 | ✕ | B | cover 히어로 제목 88px이 좌측 열 두 줄. 전폭 한 줄 불가, visual 불가(N05) |
| 단색 대형 블록 둘이 나란히 | ○ | A | 첫 시도는 수단이 없다고 봤으나 split 안에 cta(brand)와 cta(inverse)를 나란히 두어 가능(캡처). 색은 brand·inverse 둘뿐이고 내용은 제목·본문·행동 하나로 제한 |
| 큰 진행 막대와 모금액 숫자 | ○ | - | progress 전폭 막대 + metric 3 |
| 날짜 순서 이야기 타임라인 | ○ | - | timeline line |
| 후원 금액 4택1 카드 | ○ | - | radio 선택지 카드 2×2 |
| 화면 어디서든 주 행동 하나 | ○ | - | R04가 보장 |

### 15-devtool-terminal · 개발자 도구 터미널형

캡처: `cases/15-devtool-terminal-1280.jpg`, `cases/15-devtool-terminal-390.jpg` · Blueprint: `cases/15-devtool-terminal.json`

| 원하는 것 | 상태 | 원인 | 근거 |
|---|---|---|---|
| 설치 명령이 첫 화면의 최대 요소 | △ | B | 히어로 제목이 "npx kit build"로 최대이나 복사 버튼 있는 code는 히어로에 못 둔다. 설치 코드는 다음 섹션 |
| 언어별 코드 탭 | ○ | - | tabs boxed × code 3 |
| 실행 결과 예시 블록 | ○ | - | code language text |
| 격자 배경 | ○ | - | backdrop grid |
| 변경 기록 3줄 | ○ | - | timeline release(첫 시도 log는 changes 불가, VARIANT_REQUIRES) |
| 제목까지 모노스페이스 | △ | D | 제목·코드는 모노. 한글은 시스템 폰트 대체 |

## 4. 원인 분석

### 4.1 원인별 집계

| 원인 | 뜻 | △·✕ 항목 수(복수 원인은 각각 셈) |
|---|---|---|
| A | 작성자·AI 선택 | 2 |
| B | 카탈로그 표현력 | 30 |
| C | 렌더러 | 11 |
| D | 자산 부족 | 3 |
| E | 규약이 막음 | 6 |

B(카탈로그)가 가장 많고 C(렌더러)가 그다음이다. A(작성자)는 △·✕ 항목에는 2건뿐이지만, 첫 시도에서 놓쳤다가 ○로 해결한 항목이 5건 더 있어 합치면 7건이다. E(규약)는 소수지만 모두 "스타일을 한 단계 더 밀고 싶을 때" 걸렸다(X06 계열, 밴드 상한, 형광색 대비 게이트).

### 4.2 부정 탐침: 검증기는 무엇이라 답하는가

| 탐침 | 결과 | 오류 코드 |
|---|---|---|
| N01 grid 안에 표를 둔다(차트 둘+표를 한 줄에) | 거부 | CHILD_TYPE |
| N02 split에 자식 3개(3칸 비대칭) | 거부 | ARRAY_LENGTH |
| N03 카드에 span(2배 폭) 키 | 거부 | UNKNOWN_KEY |
| N04 히어로에 ratio(글:사진 40:60) 키 | 거부 | UNKNOWN_KEY |
| N05 cover 히어로에 visual(전폭 사진) | 거부 | HERO_VISUAL |
| N06 섹션에 style/density(구역별 밀도) 키 | 거부 | UNKNOWN_KEY |
| N07 인용에 size(대형 풀쿼트) 키 | 거부 | UNKNOWN_KEY |
| N08 액션에 icon(스토어 버튼) 키 | 거부 | UNKNOWN_KEY |
| N09 목록 variant ordered(번호 목록) | 거부 | ENUM |
| N10 요금제 월/연 탭: 두 요금제 모두 추천(탭 안 pricing 둘) | 통과 | - |
| N11 split 안에 split | 거부 | CHILD_TYPE |
| N12 플랜 1개짜리 요금제(단일 제안) | 거부 | ARRAY_LENGTH |
| N13 제목 없는 섹션(밴드만) | 거부 | REQUIRED |
| N14 본문 없는 히어로(문장 하나) | 거부 | REQUIRED |
| N15 제목 없는 본문 문단 | 거부 | REQUIRED |
| N16 빈 표 셀 | 거부 | STRING |
| N17 카드 본문 없음(이름·가격만) | 거부 | REQUIRED |
| N18 minimal 셸 + 1600px 폭(전폭 사진 작가 사이트) | 거부 | AXIS_BAN |
| N19 terminal 서체 + dramatic(모노 대문자 거대 제목) | 거부 | AXIS_BAN |
| N20 브루탈 테마 + flat(테두리 없는 브루탈) | 거부 | THEME_FORBID |
| N21 럭셔리 테마 + hard 깊이 | 거부 | THEME_FORBID |
| N22 스위스 테마 + gradient 배경 | 거부 | THEME_FORBID |
| N23 녹턴 테마 + light 모드 | 거부 | THEME_FORBID, AXIS_BAN |
| N24 문서 페이지에 히어로 | 거부 | PAGE_FORBID |
| N25 랜딩에 목차(toc) | 거부 | PAGE_FORBID |
| N26 팔레트에 임의 hex(#ff00ff) | 거부 | ENUM |
| N27 media에 ratio 32:9(전폭 띠) | 거부 | ENUM |
| N28 media에 bleed(전폭 돌출) 키 | 거부 | UNKNOWN_KEY |
| N29 hero에 title 두 번째 단계(문자 크기 role) | 거부 | UNKNOWN_KEY |
| N30 팀 구성원에 photo 키 | 거부 | UNKNOWN_KEY |
| N31 form 변형 inline 한 줄(필드 1개)은 허용되는가(대조군) | 통과 | - |

해석:
- `UNKNOWN_KEY`, `ENUM`, `CHILD_TYPE`, `ARRAY_LENGTH`는 문법에 수단이 없다는 뜻이다(B). 같은 오류 코드 아래 "수단이 없음"과 "있지만 금지"가 섞이지 않아 원인 분류가 쉬웠다.
- `AXIS_BAN`, `THEME_FORBID`, `PAGE_FORBID`는 수단은 있고 조합이 막힌 경우다(E).
- N10(요금제 두 개를 탭에 넣고 둘 다 추천)은 통과했다. R13 `FEATURED_PLAN`은 pricing 노드마다 하나이지 페이지당 하나가 아니다. 설계서 8절의 "요금제 추천 하나"는 이 범위를 적지 않았다.
- N31(대조군)은 변경 없이 통과해야 하며 통과했다.

### 4.3 반복 관찰된 결함

표현력 결함(제안으로 이어짐)은 6절에, 아래는 렌더러·계약 결함이다. 각각 재현 사례와 수치가 있다.

| ID | 결함 | 증거 | 사례 |
|---|---|---|---|
| R1 | 히어로 직후 섹션의 머리말이 위쪽 여백 0으로 붙는다. 페이지 `backdrop`이 tint일 때 히어로 아래가 canvas 색으로 끝나 경계가 보이는데 P03은 이를 보지 못한다 | `composition.mjs:39` afterHero 사실에 backdrop이 없다. 측정(최종 사례): 07(backdrop tint)의 다음 섹션 `paddingTop 0px`, 머리말이 섹션 위에서 0px(`probe-results.json`). 03·09(backdrop plain)도 0px이지만 히어로가 canvas로 끝나 경계가 보이지 않는다. 캡처: 07 최종과 반사실 07 변형(`counterfactual/X05-1280.jpg`, `X07-1280.jpg`)에서 히어로 하단 경계에 "프로그램"이 닿는다. 14 초안(히어로 바로 뒤 "모금 현황")에서도 같은 모양을 봤으나 최종 사례는 색 블록 `split`을 끼워 사라졌고 초안 캡처는 남기지 않았다 | 07, 14(초안) |
| R2 | `surface: plain`을 명시해도 짝수 번째 섹션이 자동으로 soft 배경이 칠해진다. 끌 방법이 없다 | `shells.mjs:22`의 `[data-surface=plain]:nth-child(even)`. 측정: 11의 1·3번 섹션 `rgb(46,46,45)`, 10의 1번 `rgb(252,237,240)` | 10, 11 |
| R3 | device 목업을 3:4 `media`로 쓰면 위성 칩이 오른쪽에서 잘리고 높이가 795px까지 커진다 | `svg viewBox 0 0 240 320`, `overflow:hidden`, 캡처 | 13 |
| R4 | `gallery showcase`의 큰 사진이 1:1로 전폭을 채워 약 1180px 높이가 된다 | 캡처 05 | 02(초안), 05 |
| R5 | V04 계열 정렬 불일치(가운데 머리말, 왼쪽 본문)가 직접 작성한 Blueprint에서는 검증을 통과한다. 변형 계약은 템플릿 조립 경로에만 닿는다 | 11의 `철학` 섹션: 머리말 가운데(중심 x 640), 본문 start(왼쪽 x 32), `validate` VALID. ADR 0006 호환 정책 문장 | 11 |

그 밖의 관찰(수정 후보, 근거 약함): 히어로 `visual: device`가 CLI 도구 소개에 수면 앱 화면을 보여 준다(15, D). `code`의 라벨과 언어가 "bash bash"로 겹쳐 나온다(15). 390px에서 4열 기사 카드가 전폭 1열 4개로 쌓여 뉴스형 밀도가 사라진다(12). 추천 요금제는 크기·위치가 같고 테두리와 배지만 다르다(04, 측정 323×409 동일(초안 323×452도 동일)).

## 5. 강제 규칙 분류

분류 기준
- **불변**: 접근성, 데이터 보존, 구조 무결성. 어떤 스타일에서도 풀지 않는다.
- **스타일별 품질**: 특정 값 조합에서 측정 가능한 결함을 막는다. 임계값이 근거여야 하고 근거가 낡으면 갱신한다.
- **취향**: 측정 가능한 결함이 없고 "그렇게 보이면 보기 나쁘다"에 가깝다. 경고·추천이면 충분하고 거부는 과하다.

반사실 실험의 뜻: `axisBans`를 비운 복사본으로 같은 Blueprint에 금지 조합을 적용해 렌더한 뒤 금지의 전제(문구가 말한 결함)를 측정했다(`counterfactual*.mjs`). "재현"은 전제가 측정으로 확인됐다는 뜻이다. 모든 사례에서 `kit validate`는 금지 조합을 거부했다(`realValidatorRejects: true`).

### 5.1 축 조합 금지 X01~X11 (`src/catalog/axes.mjs`)

| ID | 조합 | 분류 | 근거 | 권고 |
|---|---|---|---|---|
| X01 | density compact × shell dock | 스타일별 품질(내부 임계) | CF:X01·`counterfactual2`: dock 390px에서 compact와 comfortable 모두 62px(차이 없음), 1280px에서 compact 40px 대 comfortable 44px. 소스가 인용한 WCAG 2.2 SC 2.5.8의 AA 최소 크기는 24px이고 44px은 별도 기준(SC 2.5.5, AAA)으로 알고 있다(`확인 필요`: 원문 재확인 안 함). 40px도 AA는 통과한다 | 유지하되 근거를 "내부 44px 기준, 데스크톱 폭에서만 해당"으로 고친다. dock은 모바일 셸이므로 실제 영향은 작다 |
| X02 | width narrow × shell sidebar·rail·split | 스타일별 품질(가독성 하한) | 재현됨. `counterfactual2`: narrow에서 본문 열 372px(<480), standard에서 652px. 문구의 "480px 아래"와 일치 | 유지 |
| X03 | width full × shell centered·minimal·editorial·masthead | 취향(근거 약함) | 재현 실패. width full·1920px 화면에서 prose 폭은 wide와 같은 720px(한글 약 52자)이고 `max-width:none`인데도 상한이 걸린다(`counterfactual2` X03). prose 외 부품(목록 설명, 카드 본문)의 줄 길이는 측정하지 않았다(`검증 못함`) | 완화 후보: 02 사례(사진가 포트폴리오)가 이 금지 때문에 minimal+full을 못 썼다(N18). prose 외 부품 줄 길이 측정 뒤 결정 |
| X04 | elevation hard × backdrop gradient | 취향 | 02 기반 반사실 캡처에서 굵은 윤곽이 또렷하고 결함이 보이지 않았다(`counterfactual/X04-1280.jpg`). 문구의 "윤곽"은 주관 판단 | 경고로 전환 후보 |
| X05 | elevation glow × mode light | 스타일별 품질(가시성), 판정 못함 | 반사실 화면(07)에 글로우가 적용된 카드가 첫 화면에 없어 가시성을 판단하지 못했다(`검증 못함`) | 카드가 보이는 화면에서 재측정 |
| X06 | typography mono·terminal × scale dramatic | 스타일별 품질로 적혔으나 전제 미재현 | 37자 영문 제목을 390px에서 렌더: 가로 넘침 0, 제목 38px 두 줄(`counterfactual2` X06). 히어로는 `--kit-fit`로 글자가 컨테이너 폭에 맞춰 줄어든다(`chunks.mjs` hero 규칙). 09 사례가 모노 대문자 거대 제목을 이 금지 때문에 balanced로 내렸다(49.9px) | 완화 후보 |
| X07 | radius bubble × density compact | 스타일별 품질, 전제 미재현 | 07 반사실: compact 카드 안쪽 여백 24px, 반경 28px. 모서리가 내용을 침범하려면 안쪽 여백이 반경×(1−1/√2)≈8px보다 작아야 하는데 24px이다. 문구의 "16px"은 현재 토큰(`SPACE.compact`)과 맞지 않는다. 캡처에서 잘림이 없다 | 근거 문구 갱신 또는 제거 |
| X08 | footer columns × shell minimal·dock | 불변(구조) 후보, 미검증 | 반사실 02(minimal+columns)는 가로 넘침 0이나 푸터를 캡처하지 않았다(`검증 못함`) | 푸터 열이 비는지 재측정 |
| X09 | icon line-fine × density compact | 스타일별 품질, 근거 약함 | 실제 아이콘 18px, 선 굵기 변수 1.5 대 2(`counterfactual2` X09). WCAG 1.4.11은 색 대비 3:1이고 선 굵기를 직접 규정하지 않는다. 색 대비는 이미 R05가 검사한다 | 근거 문구 정정 |
| X10 | backdrop grid × ornament dots | 취향 후보, 판정 못함 | 15 기반 반사실 캡처에 격자는 나오지만 점 장식은 `pattern` 미디어에서만 그려지는데 이 화면에 없어 겹침을 보지 못했다(`검증 못함`) | `pattern` 미디어가 있는 화면으로 재측정 |
| X11 | motion lively × elevation flat | 취향 | 근거는 논리("설명할 깊이가 없다")이고 14 기반 반사실 캡처에서 레이아웃 결함이 없다. 히어로 글자가 흐린 것은 진입 애니메이션(`kit-rise`) 중간 프레임이다 | 경고로 전환 후보 |

요약: 재현 1(X02), 부분 재현 1(X01), 미재현 3(X03·X06·X07), 근거 약함 1(X09), 취향 2(X04·X11), 판정 못함 3(X05·X08·X10).

### 5.2 변형 결과 계약 V01~V06 (`src/catalog/variant-contracts.mjs`)

| ID | 주장 | 분류 | 근거 |
|---|---|---|---|
| V01 | 히어로 형태를 바꾸며 `visual`을 지우지 않는다 | 스타일별 품질 | 장식(visual) 손실이고 사용자 글이 아니다. 소스의 `CONTENT_FIELDS`에 visual이 없다 |
| V02 | 카드 스타일은 카드의 75% 이상을 바꾼다 | 취향 | "일괄"의 기대 문제이고 접근성·데이터와 무관 |
| V03 | 지표 4개 이하는 한 줄 | 스타일별 품질 | 03 사례에서 `grid four`의 한 줄 지표가 첫 화면 아래에서 읽기 좋았다(캡처). 14 사례의 `grid three` 지표 한 줄도 같다 |
| V04 | 가운데 머리말 아래 본문도 가운데 | 스타일별 품질 | 11 사례에서 위반 상태가 실제로 보인다. 단 직접 작성한 Blueprint에서는 검사되지 않는다(R5) |
| V05 | 적용 전후 렌더 지문이 같은 옵션은 추천하지 않는다 | 메타(추천 품질) | 측정 기반 |
| V06 | 히어로 변형이 `facts`를 지우지 않는다 | 불변(데이터 보존) | `CONTENT_FIELDS = {facts}`, `contentPreserved`와 일치(`variant-contracts.mjs`). ADR 0007 4항 |

효과는 모두 `not-recommended`이고 옵션을 지우지 않는다. 변형 계약은 Blueprint 컴파일에 닿지 않는다(ADR 0006 "호환 정책"). 따라서 AI·사람이 직접 쓰는 경로에는 V계약이 하한을 주지 못한다.

### 5.3 그 밖에 사례에서 마주친 강제 규칙

| 규칙 | 분류 | 근거 |
|---|---|---|
| `THEME_FORBID` (테마별 금지 값) | 취향(테마 정체성) | N20~N23. 예: 브루탈은 flat 금지, 럭셔리는 hard 금지, 스위스는 gradient 금지, 녹턴은 light 금지. 테마가 시각 언어를 정의하는 방식이므로 취향이지만 테마 선택으로 우회할 수 있어 해롭지 않다 |
| `PAGE_FORBID`·`PAGE_REQUIRE` (페이지 유형) | 구조 | N24(문서에 히어로), N25(랜딩에 toc). 유형이 구조 의도를 정한다 |
| `REQUIRED` 중 `hero.body`, `card.body`, `prose.title`, `section.title` | 취향·편의(불변 아님) | N13~N15, N17. 접근성이나 데이터 보존 때문이 아니라 빈 요소를 막으려는 규칙이다. 11 사례(한 문장 히어로, 이름·가격만 있는 제품)가 이 때문에 우회(menu plain)했다. 제목 계층은 R03이 이미 구조에서 계산한다 |
| `STRING` 빈 표 셀 | 불변(데이터 보존) | N16. 빈 문자열 대신 "—"를 쓰게 한다(04, 08에서 실제로 마주침) |
| `UNKNOWN_KEY`, `ENUM`, `CHILD_TYPE`, `ARRAY_LENGTH` | 불변(닫힌 문법) | R01·R02. 이 실험의 모든 제안도 이 닫힌 문법 안에서 필드를 더한다 |
| R04 주 액션 하나, R06 상태 데이터, R14 대체 텍스트, R17 앵커 | 불변 | 14 사례의 단일 주 행동, 01·04·13 사례의 `ANCHOR_MISSING`(내비가 선언된 앵커만 가리키게 함) 등 사례에서 오히려 도움이 됐다 |
| `SPACE` 밴드 상한(spacious 104px), S09 순서 | 스타일별 품질 | 11 사례가 150px 이상을 원했으나 불가. S09의 순서 불변(gap<section<band)은 유지하되 단계를 하나 더 두는 것은 제안 EX-4 |

## 6. 확장 제안 (5개)

공통 원칙: (1) 닫힌 enum 필드 하나씩, (2) 기존 토큰·역할·간격 값으로만 해석, (3) 검증기가 거부하는 규칙을 함께 정의, (4) 필드를 쓰지 않은 Blueprint의 HTML·CSS 바이트는 변하지 않는다.

해시 공통 사항: `src/styles/index.mjs`는 사용한 노드 타입의 CSS 덩어리를 통째로 붙인다(`chunks[type]`). 덩어리 안에 규칙을 추가하면 그 타입을 쓰는 모든 기존 출력의 CSS 해시가 바뀐다. 2.1~2.3 고정 출력(`PAGE_RULE_LEGACY_VERSIONS`, `LEGACY_LAYOUT_VERSIONS`)을 깨지 않으려면 `flowCSS(flowUsage(body))`처럼 **사용한 속성값만 내는 방식**이어야 한다. ADR 0005는 신규 정책을 `catalogVersion` 변경으로만 채택한다고 정했으므로 모든 제안은 2.5.0에서 켜고 2.4.0 입력은 새 필드를 거부한다(`확인 필요`: 버전별 필드 허용 구현 방식은 구현 단계에서 `validate.mjs`와 맞춘다). `site/v1/catalog.json`·`blueprint.schema.json`과 `docs/*.html`은 모든 제안에서 재생성되어 해시가 바뀐다. 아래 "해시 영향"은 Blueprint 출력(`index.html`·`tokens.css`·`manifest.json`)에 대한 것이다.

관찰 근거 요약

| 제안 | 사례 | 항목 |
|---|---|---|
| EX-1 비율 | 01, 02, 13 | hero-asym, split-70-30, (5:5 고정) |
| EX-2 강조 칸 | 01, 04, 12 | span-feature, plans-3-featured, top-story |
| EX-3 풀쿼트 | 01, 13 | pullquote-big, big-testimonial |
| EX-4 섹션 리듬 | 01, 03, 10, 11, 12 | density-by-zone, compact-landing, bw-red(R2), generous-whitespace |
| EX-5 전폭 미디어 | 02, 05, 11, 14 | hero-fullbleed-image, scene-fullwidth, single-fullwidth-photo |

### EX-1 비율 토큰: `hero.ratio`, `split.ratio` 확장

- **스키마 초안**: `hero.ratio: en('even', 'copy', 'visual')`(기본 even=현재 1.05:0.95), `split.ratio`에 `'dominant-start'`, `'dominant-end'` 추가(약 70:30). 숫자나 임의 비율은 없다.
- **검증 규칙**: `hero.ratio`는 `visual`이 있는 `split`·`product` 히어로에만(`VARIANT_REQUIRES`, `validate.mjs:120`의 기존 HERO_VISUAL 검사 옆). `split.dominant-*`는 자식이 둘이고 좁은 폭(컨테이너 폭 기준)에서 한 열로 접힌다(현재 `data-ratio`와 같은 규칙).
- **6문항**: ① 기존 문법으로 불가능한가: 예. N04 `UNKNOWN_KEY`, 히어로 측정 527:527, split 최대 60:40(710:474). ② 재사용성: 매거진·포트폴리오·앱 소개·상품 상세 등 이미지:글 비중이 정체성인 유형 전반(3개 사례+). ③ 검증기로 강제 가능한가: 예. enum과 조합 조건. ④ 무제한 CSS보다 안전한가: 예. 값 3개가 `grid-template-columns` 세 줄로만 해석된다. ⑤ 하위 호환: 필드 미사용 출력 불변(렌더가 속성을 쓰지 않으면 HTML 동일). 사용 시에만 CSS를 내도록 한다. ⑥ AI가 탐색 가능한가: `blueprintSchema()` enum에 뜻 설명을 달면 된다. 현재 `UNKNOWN_KEY` 응답은 "수단이 없음"과 "있지만 조건 불일치"를 구분하지 못하므로 오류 메시지에 허용 값을 싣는 것이 함께 필요하다.
- **컴포지션 연동**: C16(split 폭 예산)의 최소 칸 폭 계산이 30% 열에서도 성립해야 한다(`composition.mjs`의 `data-aside-min` 계열 확인 필요).
- **영향 파일**: `src/catalog/nodes.mjs`(필드), `src/render/nodes.mjs`(`R.hero`·`R.split` data 속성), `src/styles/chunks.mjs`(hero·split 열 규칙, 사용 게이트), `src/validate.mjs`, `src/catalog/index.mjs`(스키마·버전), `src/composition.mjs`(split 폭 예산), 테스트·문서.
- **해시 영향**: Blueprint 출력은 필드 미사용 시 불변(게이트 전제). 카탈로그 JSON·스키마는 변함.

### EX-2 강조 칸: `card.featured`(grid 안), 추천 요금제의 시각 비중

- **스키마 초안**: `card.featured: en('yes')`(`plan.featured`와 같은 이름·값). 허용 위치는 `columns`가 three·four인 `grid`와 `bento`의 첫 칸.
- **검증 규칙**: 한 `grid`에 `featured` 카드는 하나(`FEATURED_CARD`, `FEATURED_PLAN`과 같은 방식, `validate.mjs:123` 인근). 자식이 3개 이상. `bentoPlan`의 첫 칸(큰 칸)과 충돌하지 않게 bento는 첫 칸만 허용.
- **레이아웃 규칙**: 강조 카드는 2열을 차지한다. 열 수 선택(`bestCols`)은 강조 칸을 2칸으로 세어 마지막 줄에 한 칸만 남는 고아가 없게 한다. 좁은 폭(1열)에서는 같은 폭이다. `lintLayout`·`flowOrphans` 시험에 강조 칸 경우를 더한다.
- **6문항**: ① 불가능한가: 예. N03 `UNKNOWN_KEY`. 01에서 grid는 균등 384px 3칸, bento 3칸은 큰 칸이 사진을 얇은 띠로 자른다(R, 캡처). ② 재사용성: 기사 카드, 뉴스 톱, 요금제, 제품 목록. ③ 강제 가능: 예. 하나만 허용, 위치 제한, 시험. ④ 안전성: 열 폭 2칸 하나뿐이고 값이 없다. ⑤ 하위 호환: 필드 미사용 출력 불변. ⑥ 탐색 가능성: `plan.featured`와 같은 이름이라 유추가 쉽다.
- **함께 고칠 렌더러 사항(스키마 아님)**: 추천 요금제가 테두리와 배지뿐이고 크기가 같다(04 측정). 이것은 기존 출력의 CSS를 바꾸므로 카탈로그 2.5.0에서 켜는 별도 결정이다.
- **영향 파일**: `nodes.mjs`, `validate.mjs`, `src/layout.mjs`(`bestCols`·`flowColumns` 가중), `src/styles/chunks.mjs`, `src/render/nodes.mjs`, `tests/layout.test.mjs`.
- **해시 영향**: 필드 미사용 시 불변. `bestCols` 시그니처를 바꾸면 기존 호출 결과가 같음을 시험으로 고정해야 한다.

### EX-3 풀쿼트: `quote.variant`

- **스키마 초안**: `quote.variant: en('box', 'pull')`(기본 box). `pull`은 상자 없이 큰 인용 글자(기존 role `quote-l`, C25가 읽기 페이지에 이미 쓰는 값)로 그린다.
- **검증 규칙**: `pull`은 `section` 직속 또는 페이지 직속에서만(`grid`·`bento`·`aside` 보조 칸 안은 금지). 인용문 길이 상한 이내(현재 400자).
- **6문항**: ① 불가능한가: 예. N07 `UNKNOWN_KEY`. 01·13 캡처에서 인용은 박스형 한 크기. ② 재사용성: 매거진, 사례 연구, 브랜드 소개, 후기 강조. ③ 강제 가능: 예. 위치·길이. ④ 안전성: 새 글자 크기를 만들지 않고 기존 role을 재사용. ⑤ 하위 호환: 필드 미사용 출력 불변, 사용 시에만 CSS. ⑥ 탐색 가능성: 이름이 직관적.
- **영향 파일**: `nodes.mjs`, `render/nodes.mjs`(`R.quote`), `styles/chunks.mjs`, `catalog/composition.mjs`(C24·C25와 충돌 없는지), `validate.mjs`.
- **해시 영향**: 필드 미사용 시 불변. 대비는 기존 text/canvas 쌍과 같아 R05 전수 검사에 새 쌍이 필요 없다.

### EX-4 섹션 리듬: `section.surface: 'flat'`, `section.space`

- **스키마 초안**: `surface`에 `'flat'` 추가(자동 띠 칠하기에서 제외, 색은 canvas). `space: en('tight', 'normal', 'loose')`(기본 normal=현재).
- **의미**: `tight`는 기존 `bandM`(마케팅) 또는 `sectionS`(앱), `loose`는 새 토큰 `bandL`(마케팅 84·120·156px, 4px 격자) 또는 `sectionL`(앱, 이미 있음). S09의 순서(gap<section<band)는 `band<bandL`을 더해 유지한다. 구역마다 서로 다른 값을 쓸 수 있다(01 구역별 밀도).
- **검증 규칙**: `flat`은 `plain`처럼 SURFACE_NEST 계산에서 면 없음으로 센다. `space`는 enum뿐이며 숫자 불가. `bandL` 추가는 `tests/spacing.test.mjs`의 순서 시험과 S07 격자 시험을 통과해야 한다.
- **6문항**: ① 불가능한가: 예. N06 `UNKNOWN_KEY`. `plain`을 줘도 짝수 섹션이 칠해짐(R2, `shells.mjs:22`, 측정 `rgb(46,46,45)`), 밴드 상한 104px(`SPACE.spacious.band`). ② 재사용성: 스위스·럭셔리처럼 면을 쓰지 않는 스타일, 뉴스·대시보드형 랜딩의 촘촘함, 브랜드 소개의 여백(5개 사례). ③ 강제 가능: 예. enum, 간격 계약(`lintSpacing`)이 토큰 외 값을 막는다. ④ 안전성: 간격 토큰 사다리 안의 값만 고른다. ⑤ 하위 호환: 필드 미사용 시 불변이 되려면 `spaceVars`가 모든 SPACE 항목을 `:root`에 내므로(`spacing.mjs`) `bandL`은 사용될 때만 변수를 내야 한다. ⑥ 탐색 가능성: `surface` enum 설명에 "flat은 면 없음"을 적는다.
- **영향 파일**: `nodes.mjs`, `validate.mjs`(SURFACE_NEST), `src/spacing.mjs`(`SPACE`, `TOKEN`, 순서 계약), `src/styles/shells.mjs`(22행), `src/styles/chunks.mjs`, `src/layout.mjs`(밴드 사용처), `docs/spacing.md` 생성기.
- **해시 영향**: 위 전제를 지키면 Blueprint 출력 불변. 지키지 않으면 모든 2.4.0 출력의 `tokens.css`가 바뀐다.

### EX-5 전폭 미디어: `media.bleed`

- **스키마 초안**: `media.bleed: en('yes')`. `ratio`는 `'16:9'` 또는 `'21:9'`만 허용.
- **의미**: 페이지 직속 `media`가 `--kit-bleed` 토큰(콘텐츠 열 바깥으로 패딩하는 기존 방식)으로 전폭 띠가 된다. C15가 "뷰포트 기준 음수 여백(100vw)을 피한다"고 정한 원칙을 따라 컨테이너 기준으로 구현한다. 390px 이하에서는 콘텐츠 폭과 같다.
- **검증 규칙**: 페이지 직속 자식일 때만(`BLEED_POSITION`). `alt`는 기존대로 필수. 캡션은 사진 아래 한 줄. 한 페이지에서 `bleed` 미디어는 P01의 장면 순환에 포함된다.
- **6문항**: ① 불가능한가: 예. N28 `UNKNOWN_KEY`, N05 `HERO_VISUAL`(cover 히어로에 visual 불가), 사진은 항상 콘텐츠 폭 안(캡처 02·05·11). ② 재사용성: 포트폴리오, 상품 사용 장면, 브랜드 스토리, 캠페인(4개 사례). ③ 강제 가능: 예. 위치·비율. ④ 안전성: 새 CSS 값이 없고 기존 `--kit-bleed`를 재사용한다. ⑤ 하위 호환: 필드 미사용 시 불변. ⑥ 탐색 가능성: 필드 이름이 의미를 설명한다.
- **영향 파일**: `nodes.mjs`, `validate.mjs`, `render/nodes.mjs`(`R.media`), `styles/chunks.mjs`(media 덩어리), `composition.mjs`(C15·P01 페이지 사실), `tests/composition.test.mjs`.
- **해시 영향**: 필드 미사용 시 불변.

### 접은 제안과 이유

| 후보 | 이유 |
|---|---|
| 색 블록 surface(`accent`) | 14에서 `split` 안의 `cta` 둘(brand·inverse)로 구현됨(캡처). 색은 두 가지뿐이라는 한계는 남지만 1~2개 사례다 |
| `grid`에 `table` 허용 | 1개 사례(03). 표는 열 폭이 필요해 3열 칸에서 읽기 어렵다. `split`(2칸)이 대안 |
| 12열 열 지정(스위스 인덱스) | 1개 사례(10). 열 지정은 DSL로 번지기 쉽다 |
| 회전·겹침 | 1개 사례(09). 겹침은 가림·초점 접근성 검사를 새로 요구한다 |
| `list` 번호·썸네일, 스토어 버튼 아이콘, 대문자 변환 | 각각 1개 사례(12, 13, 09) |
| 요금제 추천 비중 | 스키마가 아니라 렌더러 수정(EX-2 안의 별도 결정) |
| 필수 필드 완화(`hero.body` 등) | 확장이 아니라 계약 완화. 5.3절에 근거를 두었고 별도 결정이 필요하다 |

## 7. 2.5.0 통합 결과와 남은 확인 범위

- 초안의 변경을 보존하고 main `ce049dd2e`의 서비스 계층과 통합했다. `kit migrate`는 `--to 2.5.0`을 받을 때만 명시적으로 올리며, 새 문서·템플릿·기본 migrate는 2.4.0이다. 근거와 버전 경계는 [ADR 0010](../../adr/0010-expression-grammar-2-5.md)에 기록했다.
- EX-1~EX-5 필드·enum·검증·서비스 진단·`blueprintSchema`, `getSchema`, `getComponentSpec`, 카탈로그 조회 노출을 같은 정의로 맞췄다. 임의 HTML·CSS·className 경로는 추가하지 않았다.
- `docs/evidence/expression/legacy-2-4-hashes.json`의 100개 기준(85 템플릿 + 15 사례)과 대조했다. 2.5.0에서 기본 템플릿 85개는 오류 없이 검증·컴파일되며, 15개 사례는 모두 검증·컴파일·출력 check를 통과했다. 사례별 경고 2건, 오류 0건은 `cases-2-5-results.json`에 보존한다.
- 검증 실행: `node --test tests/expression-2-5.test.mjs`는 20/20 통과, `npm run verify`는 334/334 테스트와 3,318개 생성 파일 byte-check 통과, `node docs/evidence/expression/verify-cases.mjs`는 15/15 통과했다. 서비스 계약 시험도 전체 검증에 포함했다. Playwright 명령은 시도했으나 nested worker sandbox의 Chromium 실행이 `bootstrap_check_in ... Permission denied (1100)`로 중단됐다. UI 전후 확인은 구성된 브라우저 MCP로 따로 수행했다.
- R1~R4 전후 시각 증거는 `docs/evidence/expression/visual/before/`와 `visual/after/`에 둔다. before는 2.4.0 전체 페이지 캡처, after는 대표 사례 05·07·11·13의 390×900 및 1280×900 화면과 문제 부위 크롭이다. R1은 히어로와 다음 구역 사이 간격, R2는 plain 섹션의 불필요한 교차 배경, R3는 3:4 device 칩 잘림/폭, R4는 showcase 주 이미지 비율을 개선했다. 모든 화면을 모든 폭에서 눈으로 본 것은 아니며, 캡처는 단일 headless Chromium 환경이다.
- X03·X06·X07은 측정 조건을 ADR 0010에 제한해 기록하고 유지했다. X03의 prose 외 카드·목록 줄 길이, X06의 긴 한글·다른 셸/브라우저, X07의 다른 부품·패딩·플랫폼은 미확인이다. X05·X08·X10과 사례의 사진은 이번 시각 검증 대상이 아니며, 일러스트 이미지로 실제 사진의 시각 품질을 보증하지 않는다.
- 직접 판정은 단일 평가자의 관찰이며 눈가림 평가가 아니다. 전체 사례의 모든 조합·기기·브라우저를 보증하지 않는다.

## 8. 재현

```
cd docs/dev/expressiveness
node run-cases.mjs                 # 사례 전체: validate, compile, build, check, 캡처
node probe.mjs                     # DOM 측정
node negative-probes.mjs           # 검증기 부정 탐침
node counterfactual.mjs && node counterfactual2.mjs   # /tmp/expr/nb 필요(아래)
node build-report.mjs              # report.md 재생성
cd ../../..
node --test tests/expression-2-5.test.mjs
npm run verify
node docs/evidence/expression/verify-cases.mjs
PW_PORT=41937 npx playwright test e2e/expression-2-5.spec.mjs --project=chromium
```

반사실 실험은 `src`를 `/tmp/expr/nb/src`로 복사하고 `src/catalog/axes.mjs`의 `axisBans`를 `[]`로 바꾼 사본을 쓴다. `node_modules`는 메인 저장소의 것을 worktree에 symlink했고 git은 무시한다.
