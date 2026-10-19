# UI 수준 상향: 이미지 자리·목업·상품 카드·콘텐츠 (2026-10-20)

직전 라운드(`docs/foundation.md`)가 타입·간격·표면의 기반을 고친 뒤에도 "UI 자체가 아직 꽤 많이 못생겼다"는 평가가 남았다. 이번에는 실제 서비스 화면과 나란히 놓고 차이를 수치로 적은 뒤, 차이가 가장 큰 곳(이미지 자리, 목업, 상품 카드, 더미 문구)을 생성기·토큰·부품 CSS·템플릿 데이터 수준에서 고쳤다. 카탈로그 2.0.0의 축 이름·값, 금지 조합 11개, 대비 하한, 기존 계약 테스트 56개는 그대로다. 새 선택 값(`motif` 37종 등)은 카탈로그에 추가했고 같은 방식으로 검증한다.

## 1. 진단 방법

- **배포본 표본.** 페이지 유형 16종을 모두 덮는 템플릿 30개를 배포본(https://design-system-static-kit.vercel.app/examples/*)에서 390/1280px로 촬영했다(60장, `.qa/d0`).
- **레퍼런스 표본.** 외부 사이트 20곳을 같은 폭으로 촬영하고 `scripts/design-qa/metrics.mjs`로 제목 크기·굵기·자간, 큰 이미지가 차지하는 면적, 쓰인 색 수, 문단 평균 길이를 쟀다. 기준 저장소(winterholic-design-system)의 AIP·notting·ttakkari 화면도 함께 찍었다. 코드·이미지·문구는 가져오지 않았고 구도·밀도·타이포 수치만 읽었다.
- **같은 기준의 수치.** 같은 측정 스크립트를 이 저장소 표본에도 돌렸다(표 3).

## 2. 페이지 유형 16종 × 레퍼런스 대비표

"전"은 이번 라운드 이전 배포본이다. 수치는 1280px 측정이다.

| 유형 | 표본(템플릿) | 레퍼런스 | 왜 못해 보였나 (근거) | 한 일 |
|---|---|---|---|---|
| 랜딩 | saas-landing, product-landing, cafe-home | Linear, Vercel (Stripe는 수치만) | 큰 이미지 면적이 쪽 높이의 3.6%(Linear 37.7%, Vercel 27%, Stripe 75.7%). 히어로 목업이 막대와 선 몇 개여서 실제 앱처럼 안 읽힘. 고객사 줄이 평문 이름 5개(두 사이트는 서로 다른 모양의 로고). 문단 평균 20자(Linear 89자). 한 쪽에서 쓰인 색 7가지(Linear 43, Stripe 39) | 앱 화면 목업(사이드바·지표·꺾은선·활동·토스트), 로고 마크 8종, 섹션 머리말 2열(제목+설명), 벤토, 문단 30자로 |
| 커머스 | product-listing, product-detail, checkout | Aesop, 29CM, 무신사, Apple Store | 목록 6장이 모두 같은 "해+언덕" 그림이고 상품과 무관. 상세 페이지 이미지 면적 5.4%(Aesop 45%, Apple 16%). 가격만 있고 평점·할인·브랜드 줄이 없음 | 상품 컷 20종(스튜디오 배경·접촉 그림자), 카드에 브랜드·가격·정가·할인율·평점, 쇼케이스 갤러리, 주문 요약 썸네일 |
| 블로그 | blog-index | Toss Tech, Vercel Blog | 글마다 같은 풍경 그림. 작성자·분류가 없고 대표 글과 일반 글의 위계가 없고, 분류 필터·검색 줄이 없음(Vercel Blog와 Toss Tech는 둘 다 가진다) | 대표 글 가로 카드, 편집 일러스트 7종(격자·색표·상태·타이포 등), 작성자 초상과 날짜 줄, 분류 배지, 검색·분류 필터 줄 |
| 문서 | docs-reference, tutorial | Vercel Docs, AIP Docs (Tailwind Docs는 수치만) | 소개 대신 조립기 자체를 설명하는 문구, 제목 3단이 연달아 쌓임, 코드·표·그림이 없어 문단 27자 | API 문서 문구, 설치 탭(npm/pnpm/yarn), 요청 흐름도(그림 설명 포함), 매개변수 표, 감싸는 섹션 제목은 보조기기용으로만 |
| 대시보드·데이터 | dashboard-overview, dashboard-analytics | shadcn/ui Dashboard, Linear 제품 목업 | 지표 카드에 추세 그림이 없고, 표의 담당자 열이 글자뿐, 작업 이름이 도구 내부 용어 | 지표 스파크라인, 담당자 아바타 셀, 실제 업무 문구 |
| 목록·협업 | admin-table, team-directory, project-board, inbox, team-chat | Linear 제품 목업(이슈·스레드), shadcn/ui Dashboard 표 | 칸반 열이 2~3개 카드뿐이라 보드로 안 읽힘, 메시지함 항목 4개 | 열마다 카드 3~4개, 최소 높이, 지표·진행률 추가, 메시지·대화 늘림 |
| 요금 | pricing-page | Linear Pricing (Vercel Pricing은 수치만) | 비교표가 "포함/없음" 글자뿐 | 표 안의 포함·없음 셀을 체크·대시 표시로(글자는 보조기기용으로 유지) |
| 포트폴리오 | portfolio-grid, agency-home | Pentagram | 작업 6개 중 4개가 같은 풍경, 빈 칸이 생기는 격자(Pentagram은 작업마다 색 면이 달라 목록만으로 구별됨) | 포스터·패키지·로고·건물 일러스트, 8개로 맞춘 격자 |
| 글 | article | Vercel Blog, AIP Docs 본문 | 본문 글자뿐, 인용이 상자형 | 상단 와이드 이미지, 리드 문단 확대, 인용을 왼쪽 선 풀쿼트로 |
| 폼·설정 | contact, onboarding-wizard, settings, billing | shadcn/ui(폼·표 밀도), ttakkari 인증 화면 | 폼이 왼쪽 반에만 있고 오른쪽이 비어 있음, billing은 짧고 빈약 | 문의 옆 연락처 열, billing에 지표·사용량 막대·청구 표·플랜 속성 |
| 인증 | login | Linear Login, ttakkari 인증 | 제목 48px(Linear는 약 18px로 육안 추정, 확인 필요. ttakkari는 한 줄 제목+짧은 설명), 보조 로그인 수단 없음 | 제목 26~32px, 구분선+소셜 로그인 버튼, 비밀번호 찾기 링크 |
| 오류 | not-found | GitHub 404 | 일반 아이콘+작은 글씨 | 큰 상태 코드 숫자(404·500·403·503), 제목·행동은 그대로 |
| 일반 | about-team, music-player | AIP 홈(소제목+제목+리드 구성) | 팀 카드가 글자 한 자 아바타, 앨범 아트가 점 패턴 | 초상 일러스트, 공방 도자기 컷, 타이포 앨범 커버 |

외부 레퍼런스를 읽고 얻은 구체 관찰(원리만 사용):

- **제목 서체.** Linear h1 64px/굵기 510/자간 -0.022em/행간 1.0. Vercel 54px/400/-0.06em. Stripe 48px/300/-0.02em. shadcn 48px/600/-0.05em. 디스플레이는 얇거나 중간 굵기에 좁은 자간이다. 이 저장소의 `bold` 축은 제목 800이라 같은 크기에서 더 무겁다(남은 한계).
- **이미지 비중.** 커머스(Aesop 45.2%, 29CM 69%)는 쪽의 절반 안팎이 상품 사진이다. SaaS도 목업이 쪽의 4분의 1 이상(Linear 37.7%, Vercel 27%).
- **상품 카드 정보 순서.** 브랜드(작게, 진하게) → 이름 → 한 줄 설명 → 가격(굵게, 정가 취소선, 할인율 강조색) → 평점. 같은 간격이 아니라 묶음마다 간격이 다르다(29CM, Aesop).
- **로고 줄.** 고객사 이름이 아니라 서로 다른 모양의 마크+워드마크(Linear, Vercel).
- **비교표.** 글자 대신 체크 표시(Linear Pricing).
- **섹션 머리말.** 왼쪽 큰 제목, 오른쪽 한 문단 설명의 2열(Linear, Vercel).
- **기준 저장소.** AIP는 종이색 바탕에 점 격자, 섹션마다 영문 모노 소제목(01 — PRINCIPLES), 제목 아래 한 줄 리드, 코드 블록·다이어그램·콜아웃이 한 화면에 있다. 문서 화면은 왼쪽 그룹 라벨, 코드 탭과 복사 버튼, 그림 번호와 범례를 쓴다. ttakkari 인증 화면은 마스코트 로고, 제목+설명, 주 행동 하나와 보조 하나, 상태 점 한 줄로 끝난다.

## 3. 전/후 수치 (1280px)

| 표본 | 큰 이미지 면적(전→후) | 문단 평균 글자(전→후) | 쓰인 색 수(전→후) | h1 |
|---|---|---|---|---|
| saas-landing | 3.6% → 9.6% | 20 → 30 | 7 → 9 | 48px/800 유지 |
| product-detail | 5.4% → 16.1% | 19 → 27 | 7 → 7 | 30px/800 |
| portfolio-grid | 20.8% → 27.1% | 17 → 23 | 5 → 6 | 48px/700 |
| article | 0% → 15.9% | 28 → 28 | 9 → 7 | 48px/600 |
| docs-reference | 0% → 0% | 27 → 39 | 8 → 9 | 40px/700 |
| login | 0% → 0% | 16 → 26 | 5 → 5 | 48px → 32px |
| blog-index | 11.6% → 8.4% | 19 → 32 | 5 → 7 | 48px/600 |
| product-listing | 23.8% → 23.0% | 10 → 16 | 5 → 5 | 30px/800 |

해석: 이미지 면적이 큰 폭으로 오른 곳은 목업·갤러리를 키운 랜딩과 상세 페이지다. 블로그는 대표 글+3열로 바꾸며 그림이 작아졌지만 작성자·분류·날짜 줄이 생겼다. 상품 목록은 면적이 같아도 같은 그림 6장이 상품 6종으로 바뀐 것이 핵심이다(면적으로는 안 보인다). 문단 평균 글자는 레퍼런스(문서 97자, Linear 89자)에 아직 못 미친다. 쓰인 색 수는 팔레트 하나로 만들어 근본적으로 레퍼런스(Linear 43, Stripe 39)보다 적다. 이 숫자는 색의 풍부함이 아니라 통제된 팔레트라는 선택의 결과로 보고 바꾸지 않았다.

## 4. 이번에 바꾼 것

**카탈로그(추가만, 기존 값 불변).**

- `motif` 37종(`lamp`·`desklamp`·`floorlamp`·`orb`·`candle`·`mug`·`bottle`·`jar`·`bag`·`chair`·`plant`·`books`·`headphones`·`sneaker`·`watch`·`vase`·`shirt`·`speaker`·`camera`·`laptop`, 장면 10종 `coast`·`solar`·`interior`·`building`·`food`·`coffee`·`fitness`·`care`·`museum`·`ticket`, 편집 7종 `poster`·`package`·`brandmark`·`swatches`·`states`·`grid`·`type`). `media`·`gallery` 항목·`card`·`hero`에서 `photo` 슬롯에만 쓸 수 있고 `VARIANT_REQUIRES`로 검증한다.
- 카드: `price`·`listPrice`·`rating`·`reviews`·`author`(할인율은 계산). `section.description`. `gallery.layout=showcase`. `summary.thumb`.

**렌더·CSS.**

- `src/render/motifs.mjs`: 스튜디오 컷(배경 그라데이션, 접촉 그림자, 2톤 음영)과 장면. 모든 색은 토큰 클래스이고 하드코딩 색이 없으며 테스트가 이를 강제한다. SVG gradient id는 페이지 안에서 유일하다.
- `src/render/mocks.mjs`: 앱 화면과 모바일 앱 목업(실제 숫자·한글 라벨). 히어로는 오른쪽 가장자리까지 확장한다.
- `src/styles/polish.mjs`: 상품 카드, 쇼케이스 갤러리, 2열 섹션 머리말, 로고 마크, 스파크라인, 체크·대시 셀, 상태 코드 숫자, 칸반·CTA·푸터·인증 화면 다듬기.
- 초상 일러스트(`portrait`), 지표 스파크라인, 담당자 아바타 셀, 고객사 로고 마크(8종×4 서체), 상단 내비 배경 블러, `theme-color` 메타.

**템플릿 데이터.** 상품명·가격·정가·후기, API 문서, 결제 내역, 업무 보드·메시지·대화 등을 실제 서비스에 가까운 한국어로 바꿨다. 템플릿 61개 모두 같은 규칙으로 검증된다.

## 5. 읽은 자료와 적용한 원칙

| 자료 | 원칙 | 적용한 곳 |
|---|---|---|
| frontend-design `ai-tells.md` §3, §5 | 모든 콘텐츠를 같은 라운드 카드로 쪼개지 말 것, "3열 아이콘+제목+한 줄" 반복 금지, 무내용 카피 금지 | 상품 카드를 열린 표면으로(flat·outline·soft에서 상자 없음), SaaS 기능을 벤토로, 모든 템플릿 카피를 구체적 문구로 |
| frontend-design `spacing-layout.md` §3 | 관계 거리=의미 거리. 묶음 안 간격 < 묶음 사이 간격 | 상품 카드 간격(브랜드↔이름 2px, 이름↔설명 4px, 설명↔가격 10px, 가격↔평점 4px). ui-refine-loop 계측이 같은 간격 6px 균등을 `hierarchy`로 지적해 수정 |
| frontend-design `typography-color.md` | 숫자는 `tabular-nums`, 섀도 2겹, 회색 위계 | 가격·표·지표 숫자, 카드 hover 그림자, 제목>보조>메타 3단 |
| frontend-design `self-critique.md` | 흑백 테스트, 액세서리 하나 빼기 | 랜딩·상품 목록·대시보드를 회색조로 렌더해 위계가 유지됨을 확인. 히어로 격자 장식은 `grid` 배경 축과 겹치면 끈다 |
| ui-refine-loop T0 `quick.mjs` | 쟀다는 증거는 실행 영수증으로 | product-listing 계측에서 푸터 링크 어포던스 7건, 간격 위계 1건을 받아 푸터 링크에 옅은 밑줄을 복원하고 카드 간격을 재설계(보고서 부록) |
| ui-refine-loop 규율 10·12 | 공용 CSS를 바꾸면 전파 점검, 완료는 라이브 기준 | 61개 템플릿 390px 전수 촬영, 극단 테마 7종, 무작위 10종, test-lab 3,380 전수 가로 넘침 검사, 배포 후 실제 URL 확인 |
| biz-ui-designer | 위계 1·2·3차, 강조색은 희소하게, 테두리 최소 | 가격만 굵게, 할인율만 강조색, 평점 별만 강조색. 상품 카드는 테두리 없이 이미지로 구분 |
| biz-graphic-designer | 모든 요소가 메시지를 돕는지 점검. 메시지 없는 장식 금지 | 일러스트는 상품·맥락과 일치하는 것만 사용(램프 목록에 램프). 장식용 도형 이미지를 상품 자리에서 제거 |
| biz-brand-designer | 단순·단색에서도 작동하는 마크, 시스템으로 | 로고 마크 8종은 한 색(`currentColor`)이며 흑백에서도 읽힘 |
| biz-design-system | 토큰 단일 진실, 하드코딩 금지 | 새 일러스트·목업·CSS 모두 기존 토큰 클래스·변수만 사용. 신규 토큰 0개, 하드코딩 색 검사 테스트 추가 |
| biz-product-designer | 드리블화(이상적 화면만) 금지, 현실 상태 | 상품 목록·상세에 할인 없는 상품, 평점·후기 수가 다른 상품, 리뷰 탭, 배송·교환 탭, 오류·점검·권한 없음 화면의 상태 코드 |
| biz-ux-writer | 결과 동사 버튼, 에러·빈 상태는 원인+행동 | "14일 무료로 시작", "장바구니 담기", "Google 계정으로 계속하기", 오류 화면의 다음 행동 |
| dev-css-tailwind | 토큰 안에서 디자인, 상태 variant 세트, `transition: all` 금지 | `color-mix(토큰)`만 사용, 호버·포커스 전환은 속성을 명시 |
| web-design-guidelines (Vercel, 원문을 직접 읽음) | `theme-color` 메타, `-webkit-tap-highlight-color`, `tabular-nums`, reduced-motion, 장식 아이콘 `aria-hidden`, 구체적 버튼 라벨 | `theme-color` 메타(자동 모드는 라이트·다크 둘), 탭 하이라이트 색, 가격 숫자, 새 SVG는 모두 `aria-hidden` 또는 이름이 있는 이미지 |
| webapp-testing | 동적 렌더는 로드 후 촬영, 서버 수명 관리 | `quick.mjs`·`random10.mjs`·`sweep.mjs`가 같은 규약으로 촬영 |
| winterholic-base `10-iconography-imagery.md` §7·§8 | 이미지 비율 고정, 일러스트는 3색 이내·사물 중심·장면 복잡도 제한 | 일러스트는 사물 중심 + 토큰 색만 사용, `aspect-ratio`로 자리 고정 |
| ttakkari `23-illustration-assets.md` | 일러스트는 장식이며 글자·UI를 넣지 않는다, 다크에서 윤곽 보존 | motif에는 글자가 없다(목업만 예외, 목업은 UI 그림이며 `aria-hidden`). 모든 motif 색이 토큰이라 다크에서 따라 바뀜 |
| AIP·ttakkari 예제 화면 | 소제목+제목+한 줄 리드, 코드 탭·그림 번호, 주 행동 하나와 보조 하나 | 섹션 머리말 2열, 문서 설치 탭·그림 설명, 로그인 주/보조 버튼 |

## 6. 반복 기록

| 회차 | 가장 못한 화면 | 고친 것 |
|---|---|---|
| 0 진단 | 상품 목록, 상품 상세, 랜딩 | 위 표 |
| 1 | product-listing, product-detail, saas-landing | 모티프 엔진, 상품 카드, 쇼케이스 갤러리, 앱 목업 히어로, 로고 마크, 섹션 2열 머리말. 촬영 후 발견: 카드 안 가격↔평점 간격 24px(`p+p` 전역 규칙), 블로그 카드 푸터 줄바꿈, 모바일에서 필터가 상품보다 먼저, 404 숫자 크기가 안 먹음(선택자 우선순위), 문서 제목 3단 |
| 2 | product-landing, fitness-landing, billing | 벤토 첫 칸을 이미지로, 히어로를 이미지 분할로, billing 재구성, 아티클 와이드 이미지·풀쿼트, 결제 요약 썸네일, 칸반 높이, 초상, CTA 장식 |
| 3 | stay-detail, contact, project-board | 마스너리 빈칸(4→3개), 흰 용기 윤곽, 문의 연락처 열, 보드·메시지·대화 데이터, 표 체크 표시, 푸터 링크 밑줄 복원, 상품 카드 간격 재설계, 사진 장면 그라데이션, 흐름도 노드에 캡션 막대, 문서 설치 탭 |
| 회귀 | 다크·극단 테마·모바일 | neon+dark, brutalist, retro, nocturne+dark, magazine, playful+dark, 61개 모바일 전수, 무작위 10종 |

회귀 검증 중 하나는 실제 결함을 드러냈다. about-team의 이미지에 motif(ornament 축에 반응하지 않는 그림)를 넣자 `d-axis-ornament-dots` 케이스가 중복으로 판정돼 test-lab이 3,379건으로 줄었다. ornament 축을 시험하는 케이스가 사라지는 것은 시험 범위 축소이므로 about-team은 이전 그림으로 되돌렸고 3,380건이 복원됐다.

## 7. 독립 표본: 무작위 10개 테마

`node scripts/design-qa/random10.mjs rand 20261020 10`(시드 고정). 테마·템플릿·팔레트·모드가 모두 무작위다.

| 테마 | 템플릿 | 팔레트 | 모드 | 관찰 |
|---|---|---|---|---|
| manual | changelog | moonlit-mist | light | 이미지 없음, 평이함 |
| clarity | learning-course | blue-gradient | dark | 히어로 노트북 일러스트, CTA 면, 양호 |
| dining | product-listing | burgundy-plum-nightfall | light | 상품 컷이 팔레트 색을 따라감, 양호 |
| neon | blog-index | electric-neon-dreams | dark | 편집 일러스트가 네온 색으로, 양호 |
| signal | learning-course | twilight | dark | 사이드바 셸에서도 히어로·CTA 유지 |
| cafe | stay-detail | mocha-latte | light | 마스너리 3컷, 양호 |
| journal | museum-home | soft-serenity-3 | dark | 전시 카드 일러스트, 양호 |
| learning | login | neon-bright-sparks | dark | 구분선+소셜 버튼, 양호 |
| ledger | solar-landing | deep-blue-sea | dark | 설치 사례 장면, 양호 |
| precision | profile | serene-nature-tones | dark | 정보 위주라 평이함 |

이 확인은 같은 모델이 했으므로 독립 검토가 아니다. 시드와 스크립트를 남겨 다른 사람이 같은 표본을 재현해 볼 수 있다.

## 8. 남은 한계

- **제목 굵기.** 레퍼런스 디스플레이는 300~600인데 `bold` 축 제목은 800이다. 축의 의미를 바꾸지 않으려고 그대로 뒀다.
- **서체.** 시스템 폰트이며 웹폰트를 싣지 않았다(CSP와 파일 크기). Windows·Android의 한글은 Pretendard보다 덜 단정하다.
- **일러스트의 한계.** 사진이 아니라 도형 일러스트다. 상품 컷 20종 밖의 상품(예: 가구 세부 종류, 식품 포장)은 가장 가까운 컷으로 대체된다. 같은 motif를 6번 쓰면 색과 배경만 달라진다.
- **히어로 텍스트형.** `statement`·`cover`·`centered` 히어로는 규칙(`HERO_VISUAL`)상 이미지를 못 가져서 에이전시·후원 같은 랜딩은 여전히 글자만 크다.
- **문서 화면.** 왼쪽 내비 그룹 라벨, 코드 복사 버튼, 이전/다음 글 링크가 없다(AIP 문서에는 있다). 코드 구문 색칠도 없다.
- **정보량.** 문단 평균 글자는 레퍼런스의 절반 이하다. 템플릿 61개 모두를 문서 수준으로 채우지는 않았고 대표 템플릿을 중심으로 고쳤다.
- **평이한 화면.** changelog, profile, menu-dining, calendar-view는 이미지·목업이 없어 여전히 평이하다.
- **측정.** 육안 검토는 표본(30개 × 2폭, 61개 모바일, 극단 7종, 무작위 10종)이다. 3,380 전수 육안이 아니다. 전수로 확인한 것은 가로 넘침(세 폰트)과 정적 구조 검사다. 실제 Safari·iOS, 스크린리더는 미검증이다.
- **계측 도구의 오탐.** ui-refine-loop의 `focus-missing`은 전역 `:focus-visible` 규칙을 인식하지 못해 모든 버튼을 지적한다(실제로는 포커스 링이 그려진다). 반영하지 않았다.
- **SVG 글자.** 목업 안 글자는 이미지의 일부(`aria-hidden`)이지만, 계측기는 SVG 글자 크기를 CSS 글자 크기 종류로 세어 saas-landing의 "글자 크기 종류"가 15→26으로 보인다.

## 9. 출처

| 사이트 | 읽은 것(원리만) |
|---|---|
| https://linear.app | 디스플레이 서체 수치, 목업 크기와 밀도, 로고 줄, 2열 섹션 머리말 |
| https://linear.app/pricing | 카드 없는 열 구조, 체크 표시 비교표 |
| https://linear.app/login | 인증 화면의 최소 구성 |
| https://vercel.com, https://vercel.com/pricing | 디스플레이 서체, 서로 다른 모양의 로고 줄, 섹션 구성 |
| https://vercel.com/docs | 문서 카드·왼쪽 내비·코드 블록 구성 |
| https://vercel.com/blog | 블로그 목록의 위계 |
| https://stripe.com, https://stripe.com/blog | 이미지 비중, 디스플레이 서체 |
| https://docs.stripe.com | 문서 레이아웃 |
| https://tailwindcss.com/docs/installation | 문서 본문 폭과 문단 길이 |
| https://ui.shadcn.com/examples/dashboard | 대시보드 밀도, 표·지표 구성 |
| https://www.aesop.com/kr/ | 상품 컷 배경, 카드 정보 순서, 신뢰 줄 |
| https://www.29cm.co.kr | 이미지 우선 격자, 가격·할인·찜 정보 줄 |
| https://www.musinsa.com | 상품 목록 정보 밀도 |
| https://www.apple.com/kr/shop/buy-iphone | 타일형 카드, 제목+회색 이어쓰기 |
| https://toss.tech, https://toss.im | 한국어 블로그 목록 위계, 한글 디스플레이 서체 |
| https://github.com/404 | 오류 화면의 상태 코드 |
| https://dawn-theme.myshopify.com | Shopify 테마 구성(촬영만, 첫 화면 외 확인 못함) |
| winterholic-design-system (AIP·ttakkari·notting·base) | 사용자 기준 화면과 이미지·일러스트 규칙 |

촬영본은 `.qa/ref`에 두고 저장소에는 넣지 않는다(gitignore). 이 문서의 수치는 `scripts/design-qa/metrics.mjs`로 재현할 수 있다.
