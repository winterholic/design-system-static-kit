# 4차 고도화: 템플릿·부품(기본 재료) 레벨업과 간격 계약 (2026-10-20)

3차까지는 화면을 하나씩 고쳤다. 이번에는 AI가 자주 하는 실수, 특히 패딩·마진 실수가 조립기의 **기본 재료 단계**에서 생기지 않게 하는 것이 목표였다. 간격 규칙을 코드로 강제하고, 그 위에서 3차의 약한 화면(changelog·profile·menu-dining·calendar-view, statement·cover 히어로, 문서 화면, 큰 이미지 면적)을 부품 수준에서 고쳤다. 카탈로그 2.0.0의 기존 값, 금지 조합 11개, 대비 하한, test-lab 3,380건, 기존 계약 테스트 63개는 그대로다. 추가는 모두 선택 필드다.

## 1. 간격 규칙 체계화

규칙 전문은 [docs/spacing.md](spacing.md)(생성 문서), 결정 기록은 [ADR 0003](adr/0003-spacing-contract.md).

### 진단(3차 결과물, 같은 측정 스크립트)

| 항목 | 3차 | 4차 |
|---|---|---|
| 부품 제목→본문 간격의 값 종류(템플릿 61개, comfortable, 1280px) | **10종**(0·4·6·8·10·12·16·20·22·24px) | **3종**(4·8·16px = tight·near·head) |
| 격자 밖 margin·padding·gap 개수(61개 × 밀도 3 × 폭 2 실측) | 13,654 | 0 |
| 격자 밖 값(같은 표본 comfortable 1280, 요소×속성 24,478개 중) | 2,158 | 10(`margin:auto`가 px로 계산된 값) |
| 근접 위반(묶음 안 간격 > 묶음 사이 간격) | 233 | 0 |
| 제목→본문 간격 위반(3차는 토큰이 없어 부품 20px·섹션 40px 초과로 셈, 4차는 토큰 값과 다르면 위반) | 244 | 0 |
| 글자가 상자 가장자리에 붙은 곳 | 44 | 0 |
| 컨트롤 안쪽 여백 비율 위반(입력 가로 14 < 세로 10×1.5) | 144 | 0 |

### 규칙 요약(밀도별 px는 spacing.md)

| 관계 | 규칙 | 값 |
|---|---|---|
| **붙임**(S01) | 라벨↔값, 목록 제목↔부연, 가격↔평점, 카드 안 메타↔제목↔본문 | tight 4px · near 8px 이하 |
| **같은 규격**(S02, S08) | 모든 부품 제목→본문, 섹션 머리말→내용 | head 12·16·20px, 섹션 머리말은 gap |
| 근접(S03) | 묶음 안 간격 ≤ 이웃 묶음과의 간격 | tight < near ≤ item ≤ head < gap < section < band |
| 상자(S04) | 글자↔가장자리 12px(작은 상자 8px) 이상, 좌우 대칭 | inset·insetS |
| 중첩(S05) | 색 섹션 중첩·섹션 3단 중첩 금지 | 검증기 `SURFACE_NEST`·`SECTION_DEPTH` |
| 컨트롤(S06) | 가로 안쪽 여백 ≥ 세로 × 1.5 | 8×16 · 12×20 |
| 격자(S07) | margin·padding·gap은 토큰 또는 4의 배수(1·2px 예외) | 린트 |
| 고아 제목(S10) | 본문 없는 부품 제목 금지 | 실측 |

### 어디서 막히나(조합이 어긋나면 생성 단계나 시험에서 걸린다)

1. `src/spacing.mjs`: 밀도별 토큰 한 벌과 순서. 순서가 뒤집히면 `tests/spacing.test.mjs` 실패.
2. `lintSpacing`: 모든 스타일 소스(부품 CSS 61조각, 셸 10×푸터 3, 코어)를 훑는다. 6·10·14px, `calc(var(--kit-gap) * .9)`, 허용 목록 밖 `clamp()`는 실패. 음성 대조 8건.
3. `contractCSS`: 제목→본문, 라벨 제목 같은 부품 횡단 관계를 한 곳에서 생성해 스타일시트 끝에 둔다. 부품 CSS가 되돌릴 수 없다.
4. 검증기 R20: `SURFACE_NEST`, `SECTION_DEPTH`. 사용자가 색 섹션 안에 색 섹션을 넣으면 입력 단계에서 거부된다.
5. 렌더 실측(`spacing-probe`): 템플릿 61 × 밀도 3 × 폭 2를 실제 브라우저에서 잰다. 점검마다 훑은 개수를 함께 내고(제목 1,057·쌍 927·근접 1,945·가장자리 1,487·격자 171,761·컨트롤 686), 일부러 틀린 페이지로 각 위반 종류가 실제로 걸리는지 확인한다.

시험 중에 규칙이 실제 결함 두 개를 잡았다. 설문 폼의 입력 padding 비율(CTRL_PAD)과, 새로 만든 로그 타임라인의 규칙이 조용히 적용되지 않던 문제(문자열 치환 실패, 실측이 제목→본문 12px 위반으로 발견).

## 2. 부품 레벨업

| 3차의 약점 | 4차에서 한 일(부품 수준) | 근거 |
|---|---|---|
| changelog 밋밋 | 타임라인 `variant=release`: 버전·날짜·상태 열 + 본문 열, 변경 종류(신규·개선·수정·제거) 칩, 최신 릴리스 강조. 호환 표는 지원 환경 표로 | Linear 변경 기록의 날짜 헤더·종류별 묶음·릴리스 사이 큰 간격, AIP 문서의 버전 배지 |
| profile 밋밋 | `page-header`에 `avatar`·`stats`·`meta`: 배너+겹친 아바타+이름 묶음+지표 줄. 활동 차트·프로젝트 카드 추가 | GitHub 프로필의 정체성 묶음(아바타·이름·버튼을 가깝게)과 지표를 인접 배치, 탭은 분리 |
| menu-dining 밋밋 | 메뉴 항목 `motif` 사진·`layout=photo`·요리 장면 5종(스테이크·국수·전·비빔밥·찌개), 카테고리 칩. 가운데 정렬 제목이 어긋나던 버그 수정 | 3차 원칙(맥락에 맞는 그림만) |
| calendar-view 밋밋 | 오늘 표시, 일정 시간·색(`tone`), 주말 음영, 지표 3개·보기 전환 칩. 중복 캡션을 보조기기용으로 | Google·Apple 캘린더의 오늘 원·색 일정 |
| statement·cover 텍스트뿐 | 히어로 `facts`(핵심 수치 2~4개, 복사 열 안)와 장식 그림(statement=링+진행 호, cover=브랜드 구성). 화면이 좁으면 장식은 끄고 텍스트 대비는 그대로 | Linear·Vercel 랜딩의 수치 줄 |
| 문서 내비 그룹 라벨 | `chrome.nav[].group`, `current`: sidebar·split 셸에서 그룹 제목과 현재 위치 표시. 가로 셸은 라벨을 뺀다(검증기는 거부, 수리는 제거) | AIP docs `aip-sidebar__title` 구조(그룹 제목 + 목록 `aria-labelledby`) |
| 코드 복사 버튼 | `code`에 복사 버튼, 상태 알림 영역, 구문 색(js·json·bash·css·html·python). 복사 실패 시 선택 방식으로 대체 | AIP docs `aip-copy`(복사/복사됨 상태 전환) |
| 큰 이미지 면적 밋밋 | 모든 장면·스튜디오 그림에 창가 빛 줄기 + 비네트 조명 층. 피트니스 장면 3종 | winterholic-base 10 아이콘·이미지 §7·§8 |
| 기타(3회차 선정) | 폼 라디오 타일, 가로 타임라인(`rail`), 로그 타임라인(`log`), 튜토리얼 좌우 배치(단계 | 명령) | 설문·소개·튜토리얼·감사 로그 화면 |

## 3. 반복 기록(회차마다 가장 못한 화면 3개부터)

| 회차 | 가장 못한 화면 | 고친 것 |
|---|---|---|
| 0 진단 | changelog, profile, menu-dining | 간격 계약(위 1장)과 CSS 이관 |
| 1 | changelog, profile, menu-dining | 릴리스 타임라인, 프로필 헤더, 사진 메뉴, 문서 내비 그룹·복사·구문 색. 촬영 후 발견: 릴리스 규칙이 변경 목록에도 걸려 줄·간격이 어긋남, 프로필 헤더 `align-items:end`로 지표가 오른쪽 좁은 열, 가운데 정렬 제목 어긋남, 메뉴 장면 이름 불일치 |
| 2 | calendar-view, agency-home(cover), campaign-donate(statement) | 달력 오늘·색·지표, 히어로 팩트·장식, 조명 층. 촬영 후 발견: 장식이 팩트 줄 위에 겹침 → 팩트를 복사 열 안으로 |
| 3 | survey, about-team, tutorial | 라디오 타일, 가로 타임라인, 좌우 배치. 촬영 후 발견: 이벤트 랜딩 팩트가 아래 지표 카드와 같은 숫자를 반복 → 팩트 삭제, `.kit-sr`가 가로 스크롤 영역 밖으로 문서 폭을 늘림(390px 464) → `position:relative` |
| 4 | audit-log, fitness-landing, 무작위 표본 | 로그 타임라인, 피트니스 장면 3종 |

## 3-1. 독립 표본: 무작위 테마 10개와 전수 실측

`node scripts/design-qa/random10.mjs rand4f 20261021 10`(시드 20261021, 마지막 코드로 재촬영). 테마·템플릿·팔레트·모드가 모두 무작위다. 같은 10개에 간격 실측도 돌렸다.

| 테마 | 템플릿 | 팔레트 | 모드 | 밀도 | 간격 실측 |
|---|---|---|---|---|---|
| studio | blog-post | white-elegance | light | spacious | 통과 |
| ledger | saas-landing | deep-sea-2 | dark | compact | 통과 |
| heritage | team-chat | golden-harvest | dark | spacious | 통과 |
| realty | dashboard-overview | midnight-ocean-depths-2 | light | comfortable | 통과 |
| beauty | calendar-view | blush-harmony | dark | spacious | 통과 |
| clarity | audit-log | dreamy-blue-gradient | light | comfortable | 통과 |
| commerce | case-study | orange-sunset-sky | light | comfortable | 통과 |
| brutalist | help-center | midnight-fire | light | comfortable | 통과 |
| pocket | fitness-landing | spring-blooms | light | spacious | 통과 |
| precision | blog-index | steel | light | compact | 처음엔 근접 위반 1종(아래) → 예외 명시 후 통과 |

- 이 무작위 표본이 **간격 실측의 허점을 하나 드러냈다**. 카드 푸터는 `margin-top:auto`로 카드 바닥에 고정되어, 옆 카드와 높이를 맞출 때 생기는 빈 공간(32px)이 "묶음 안 간격"으로 잡혔다. 의도된 동작이므로 실측에서 푸터 앞 간격을 제외하고 이유를 코드 주석과 이 문서에 남겼다. 근접 규칙을 약화한 것이 아니라 측정 대상을 정확히 한 것이다.
- **전수 실측.** 템플릿 61 × 테마 40 × 폭 2 = 4,880쪽을 실측했다. 위반은 위 1종(4건)뿐이었다.
- **글꼴 스트레스.** 같은 실측을 Nanum Gothic·Verdana·Courier New(아주 넓음)로 바꿔 돌렸다(344쪽씩). 위반 0.
- **CI(Linux)가 macOS에서 안 보이던 오탐 2개를 잡았다.** (1) 위 카드 푸터, (2) 글자가 길어지면 폭이 160px을 넘는 ghost 버튼의 **투명 테두리**를 상자로 센 것. 둘 다 측정기 쪽 문제였고 CSS는 맞았다. 투명 테두리는 상자로 세지 않는다.

## 4. 읽은 자료

| 자료 | 읽은 것(원리만) | 적용 |
|---|---|---|
| winterholic-base `03-spacing-layout.md` | 4px 격자, "가까운 것은 가깝게", 안쪽 패딩 ≤ 바깥 간격, 하지 말 것 표 | 간격 토큰·린트·근접 실측 |
| AIP `examples/docs.html` | 사이드바 그룹 제목, 복사 버튼 상태, 문서 메타 줄 | 내비 그룹, 코드 복사, 문서 메타 |
| https://linear.app/changelog | 날짜 머리, 변경 종류별 묶음, 릴리스 사이 큰 간격과 목록 안 좁은 간격 | 릴리스 타임라인 |
| https://github.com/torvalds | 정체성 묶음과 지표의 인접 배치 | 프로필 헤더 |
| https://vercel.com/docs/getting-started-with-vercel | 단계 제목, 설치 탭, 다음 단계 목록 | 튜토리얼 좌우 배치 |
| https://docs.stripe.com/get-started | 문서 시작 화면의 카드 목록 구성 | (참고만, 반영 없음) |

웹 페이지는 마크다운으로 변환된 텍스트에서 구조를 읽었다. 픽셀 수치는 읽지 못했다. 코드·이미지·문구는 가져오지 않았다.

## 5. 남은 한계(정직하게)

- **실측 범위.** 렌더 실측은 템플릿 61 × 밀도 3 × 폭 2 표본이다. test-lab 3,380건 전수에는 CSS 린트와 가로 넘침만 돌린다(Pretendard 아닌 시스템 폰트·Nanum Gothic·Verdana 3회 전수 overflow 0).
- **미감 보증 아님.** 간격 규칙은 일관성을 보증한다. 보기 좋은지는 육안 표본(촬영 40여 화면, 무작위 10종)이다.
- **그림.** 여전히 도형 일러스트다. 같은 motif를 여러 번 쓰면 색과 조명만 달라진다(피트니스·요리는 장면 변형을 추가했지만 그 밖은 단일).
- **카드 제목↔본문.** winterholic-base는 12px, 여기는 near 8px로 한 단계 더 붙였다(의도한 차이).
- **자식 margin 금지.** winterholic-base는 부모 gap을 권한다. 제목→본문은 생성 계약 층 한 곳에 margin으로 모았다.
- **히어로 장식.** statement·cover의 장식은 데이터 없는 도형이다. 실제 사진·제품 화면은 `split`·`product` 변형(규칙 `HERO_VISUAL`)에서만 쓴다.
- **문서 화면.** 이전/다음 글 링크, 검색, 버전 선택은 없다.
- **육안 검토는 같은 모델이 했다.** 독립 검토가 아니다. 시드와 스크립트를 남겼다.
