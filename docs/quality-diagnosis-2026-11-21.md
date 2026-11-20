# 품질 진단: 카탈로그 2.3.0 대표 화면 34개 실측 (2026-11-21)

대상은 카탈로그 2.3.0(HEAD 89573577f, composition 1.2.0)이다. 이번 단위는 진단과 재현 도구까지다. `src/`는 고치지 않았다.

기존 A/B/C 콤보 등급(`src/combo-grades.mjs`, 2026-10-21)은 1440·390px에서 잰 레이아웃 결함의 유무이지 미적 완성도 점수가 아니다. 이 문서의 A/B/C는 그 등급과 다른 축이다(3절). 이름이 같아 헷갈리면 이 문서의 것을 "진단 A/B/C"로 부른다.

## 1. 방법과 증거 위치

| 항목 | 내용 |
|---|---|
| 표본 | 34개(`docs/evidence/quality-2026-11-21/samples.json`). 랜딩 12 · 대시보드 5 · 데이터 3 · 폼 3 · 커머스 5 · 문서 6 |
| 렌더 | Playwright Chromium, macOS 폰트, 320·390·768·1440px, `reducedMotion:'reduce'` |
| 스크린샷 | `docs/evidence/quality-2026-11-21/before/<키>__<조합id>[@보기설정]__w<폭>.png` 136장. 조합 id의 `~`는 `+`, `:`는 `-`로 바꿨다 |
| 저장 높이 | 폭별 상한(320·390: 3600px, 768: 3000px, 1440: 2600px)까지 상단만 저장. 실제 문서 높이와 잘림 여부는 `measure-before.json`의 `docH`·`clipped` |
| DOM 실측 | `measure-before.json`(표본×폭마다 페이지 지표와 기존 세 프로브 지적), `claims-before.json`(결함마다 붙은 측정 조건 Q01~Q17의 값과 통과 여부) |
| 폭 스윕 | `sweep-320-768.json`: 전 조합 4,955개를 320·768px에서 기존 프로브로 훑은 결과(1,197개 조합에 지적, 그중 심각 지적 1,173개) |
| 재현 | `node scripts/design-qa/quality-shoot.mjs --phase before`, `node scripts/design-qa/quality-claims.mjs --phase before`, `node scripts/design-qa/width-sweep.mjs` |

개선 후에는 같은 목록으로 `--phase after`를 돌리면 `after/`와 `measure-after.json`, `claims-after.json`이 같은 파일명으로 생긴다. 표본 목록을 바꾸지 않는 것이 전제다.

### 표본 목록

성격 분포: 완성도 높음 7 · 규약 위반(측정) 5 · 규칙 통과·어색 5 · 변형 후 나빠짐 6 · 변형 효과 없음 6 · 테마·서체 변경 5, 합계 34. `기준 표본`이 있는 행은 같은 Blueprint를 나란히 비교하는 쌍이다(S28·S32의 기준은 S34).

| 키 | 조합 ID | 보기 설정 | 유형 | 성격 | 기준 표본 |
|---|---|---|---|---|---|
| S01 | `saas-landing` | 기본 | 랜딩 | 완성도 높음 |  |
| S02 | `saas-landing~hero:statement` | 기본 | 랜딩 | 변형 후 나빠짐 | S01 |
| S03 | `saas-landing~hero:cover` | 기본 | 랜딩 | 변형 후 나빠짐 | S01 |
| S04 | `saas-landing~cards:filled` | 기본 | 랜딩 | 변형 후 나빠짐 | S01 |
| S05 | `devtool-landing` | 기본 | 랜딩 | 규칙 통과·어색 |  |
| S06 | `product-landing` | 기본 | 랜딩 | 규칙 통과·어색 |  |
| S07 | `agency-home` | 기본 | 랜딩 | 규약 위반(측정) |  |
| S08 | `saas-landing` | theme=brutalist | 랜딩 | 테마·서체 변경 | S01 |
| S09 | `saas-landing` | type=terminal | 랜딩 | 테마·서체 변경 | S01 |
| S10 | `dashboard-overview` | 기본 | 대시보드 | 완성도 높음 |  |
| S11 | `dashboard-overview~columns:two` | 기본 | 대시보드 | 변형 후 나빠짐 | S10 |
| S12 | `sales-dashboard` | 기본 | 대시보드 | 규약 위반(측정) |  |
| S13 | `dashboard-overview` | theme=neon | 대시보드 | 테마·서체 변경 | S10 |
| S14 | `finance-overview` | 기본 | 데이터 | 완성도 높음 |  |
| S15 | `dashboard-analytics` | 기본 | 데이터 | 규칙 통과·어색 |  |
| S16 | `finance-overview~data:bordered` | 기본 | 데이터 | 변형 효과 없음·중립 | S14 |
| S17 | `checkout` | 기본 | 폼 | 규칙 통과·어색 |  |
| S18 | `signup` | 기본 | 폼 | 완성도 높음 |  |
| S19 | `signup~notice:toast` | 기본 | 폼 | 변형 효과 없음·중립 | S18 |
| S20 | `product-detail` | 기본 | 커머스 | 완성도 높음 |  |
| S21 | `product-detail~tabs:boxed` | 기본 | 커머스 | 변형 효과 없음·중립 | S20 |
| S22 | `product-detail~gallery:masonry` | 기본 | 커머스 | 변형 효과 없음·중립 | S20 |
| S23 | `menu-dining` | 기본 | 커머스 | 규약 위반(측정) |  |
| S24 | `product-detail` | theme=luxe | 커머스 | 테마·서체 변경 | S20 |
| S25 | `docs-reference` | 기본 | 문서 | 완성도 높음 |  |
| S26 | `docs-reference~tabs:boxed` | 기본 | 문서 | 변형 효과 없음·중립 | S25 |
| S27 | `offline` | 기본 | 문서 | 규약 위반(측정) |  |
| S28 | `article` | type=condensed | 문서 | 테마·서체 변경 |  |
| S29 | `hr-people` | 기본 | 대시보드 | 규약 위반(측정) |  |
| S30 | `saas-landing~heads:center` | 기본 | 랜딩 | 변형 후 나빠짐 | S01 |
| S31 | `saas-landing~rhythm:banded` | 기본 | 랜딩 | 변형 효과 없음·중립 | S01 |
| S32 | `article~intro:center` | 기본 | 문서 | 변형 후 나빠짐 |  |
| S33 | `bank-product` | 기본 | 랜딩 | 규칙 통과·어색 |  |

## 2. 한계와 정직한 표시

- **육안과 측정의 차이.** 이 문서의 "규약 위반"은 프로브·DOM 측정으로 확인된 것이다. S27(오프라인 상태 화면)은 측정상 3줄 제목이지만 육안으로는 큰 문제가 아니다. 그래서 A에 두되 심각도는 낮음으로 적었다.
- **오탐 후보.** S21의 `EDGE` 지적(320px 탭 줄 우측 3px)은 탭 줄이 가로 스크롤 영역(`scrollWidth 308 > clientWidth 286`)이라 위반으로 확정하지 못했다(Q17 통과). 결함으로 세지 않았다.
- **스크린샷 가공.** 전체 페이지 캡처에서 사이드바 구분선이 한 뷰포트 높이(900px)에서 끊겨 보인다(S12 등). 사이드바가 `100vh` 고정이라 생기는 캡처 현상으로 보며 결함으로 세지 않았다. 실제 스크롤 중의 모습은 확인하지 못했다(확인 필요).
- **폭·테마 범위.** 폭 스윕은 기본 테마 한 벌, 320·768px만 쟀다. 54개 테마 × 전 조합 × 4폭은 재지 않았다. 테마·서체 표본은 5개뿐이라 테마 전반의 비율을 말할 수 없다.
- **환경.** Chromium만, macOS 폰트다. Safari·실기기는 확인하지 못했다. Linux CI 폰트에서는 줄바꿈이 달라질 수 있다.
- **전수 육안은 하지 않았다.** 34개 중 S16·S18·S21·S25·S29 다섯 개는 스크린샷을 직접 보지 않고 DOM 측정과 프로브로만 확인했다. 나머지는 직접 봤지만 다수는 축소(0.42배) 비교 이미지로 봤다.

## 3. 분류 기준

| 등급 | 뜻 | 판정 근거 |
|---|---|---|
| **A 기본 규약 위반** | 이미 문서화된 규약(고아 없는 흐름, 가장자리 여백, 글줄, 가로 넘침)을 어긴다. 원인은 규약이 닿지 않는 곳이다 | 기존 프로브 코드 또는 Q 측정 조건이 위반을 직접 판정 |
| **B 조립·선택 오류** | 각 부품은 규약을 지키는데 선택·조립(구성 변형, 폼 필드 배치, 테마 조합)이 의미를 해친다 | 같은 Blueprint의 기준 표본과 비교하거나 조립 결과의 구조 값으로 판정 |
| **C 페이지 수준 완성도** | 규칙은 모두 통과하고 부품도 정상인데 페이지 전체의 위계·리듬·반복이 어색하다 | 페이지 지표(히어로·벤토·간격·반복)와 스크린샷. 프로브 지적 0이어도 나온다 |

## 4. 결함 목록

모든 결함은 카탈로그 2.3.0이다. 스크린샷 경로의 접두사는 `docs/evidence/quality-2026-11-21/before/`다. "다른 조합"은 같은 원인이 닿는 범위이고, 숫자는 이 저장소 명령으로 센 값이다.

### A. 기본 규약 위반

#### A1. 320px에서 히어로 수치 3개가 2열 + 1 (GRID_ORPHAN)
- **표본**: S07 `agency-home`, 320px. 스크린샷 `S07__agency-home__w320.png`
- **측정**: `dl.kit-hero-facts` 3개 항목이 `grid-template-columns: 128px 128px`. 마지막 줄 1칸(Q01 `orphan:true`). 390·768·1440px는 통과(3열·5열).
- **원인**: 히어로 수치 격자가 `repeat(auto-fit,minmax(96px,1fr))`로 직접 선언된다(`src/styles/polish.mjs:45`). 6차에서 만든 "마지막 줄 고아 없음" 불변식은 흐름 원시 요소(`data-flow`)에만 걸리고, `.kit-hero-facts`는 허용 목록에 있어 검사에서 빠진다(`src/layout.mjs:125-130` `EQUAL_COLUMNS_OK`, 주석은 "항목 수가 정해져 있는 구조 틀"이라고 적었지만 항목 수가 3이면 어떤 폭에서도 2+1이 가능하다).
- **담당 코드**: `src/layout.mjs:125-130`, `src/styles/polish.mjs:45`, 규칙 R02·(6차 흐름 불변식, `tests/layout.test.mjs`)
- **같은 원인의 조합**: 히어로 `facts`를 쓰는 9개 템플릿(`agency-home`, `wedding-invite`, `game-launch`, `hanji-journey`, `luxury-brand`, `campaign-poster`, `museum-home`, `campaign-donate`, `waitlist`)의 1,152개 조합. 320px에서 모두 GRID_ORPHAN(Q01이 8개 템플릿 기본 구성에서 재확인). 기존 진단(1440·390)은 이를 잡지 못해 C 0이었다.
- **개선안**: 히어로 수치를 흐름 원시 요소(`bestCols`, 컨테이너 폭×개수)로 옮기고 `EQUAL_COLUMNS_OK`에서 뺀다. 예외 목록의 항목마다 "고정 개수여도 어떤 폭에서 고아가 없다"는 증명 테스트를 요구한다.

#### A2. 메뉴 점선 가격 줄이 320px에서 넘침 (EDGE_VIEW, EDGE)
- **표본**: S23 `menu-dining`, 320px. `S23__menu-dining__w320.png`
- **측정**: `.kit-menu-row` 폭 142px, `scrollWidth` 178px(넘침 36px). 가격 `11,000`의 오른쪽 끝이 307px로 `section.kit-menu` 내용 오른쪽(304px)을 3px 넘고, 화면 가장자리까지 13px 남는다(Q02 `maxOverflow:36`). 390px는 통과.
- **원인**: 메뉴 줄이 `display:flex`에 `gap:4px`이고 이름·점선·가격이 줄어들거나 줄바꿈하지 않는다(`src/styles/chunks.mjs:161` `.kit-menu-row`, `.kit-menu-price{margin-left:auto;padding-left:12px}`). `min-width:0`·줄바꿈 대비가 없다.
- **담당 코드**: `src/styles/chunks.mjs:161`, 규칙 S(간격)·EDGE_VIEW 프로브
- **다른 조합**: `menu-dining`계 6개 조합이 320px에서 EDGE_VIEW(스윕). `menu:grid`의 `li`도 우측 -2px(EDGE 3건).
- **개선안**: 행 요소 전반에 "텍스트 행은 가용 폭에서 줄바꿈하고 가로로 넘치지 않는다" 공통 규약을 둔다(이름 `min-width:0; flex:1 1 auto`, 가격은 줄바꿈 허용 또는 아래로 내림).

#### A3. 사진 메뉴 3개가 768px에서 2열 + 1 (GRID_ORPHAN)
- **표본**: S23 `menu-dining`, 768px. `S23__menu-dining__w768.png`
- **측정**: `.kit-menu ul` 3개 항목, 열 2개(311px×2). 두 번째 항목은 제목이 한 줄이라 첫 항목보다 위로 떠 보인다(같은 칸 안 수직 정렬 불일치). Q03 `orphan:true`. 1440px는 3열이라 통과.
- **원인**: A1과 같다. `.kit-menu[data-layout=photo] ul`이 `repeat(auto-fit,minmax(min(100%,220px),1fr))`로 열 수를 직접 정하고(`src/styles/polish.mjs:26`) `.kit-menu`가 `EQUAL_COLUMNS_OK`에 있다(`src/layout.mjs:127`).
- **다른 조합**: 스윕에서 768px GRID_ORPHAN 3개 조합(`menu-dining`, `~notice:banner`, `~notice:toast`).
- **개선안**: A1과 같은 처방(흐름 원시 요소로 이전).

#### A4. 차트 카드가 이웃 카드 높이로 늘어나 아래가 빔 (EMPTY_CELL)
- **표본**: S12 `sales-dashboard`, 768px와 1440px. `S12__sales-dashboard__w768.png`, `S12__sales-dashboard__w1440.png`
- **측정**: 768px에서 차트 카드 둘 모두 높이 513px, 막대 차트 카드 아래 빈 공간 215px(42%)로 프로브가 EMPTY_CELL을 냈다. 1440px에서는 프로브 지적이 없지만 도넛 카드의 마지막 내용 아래가 210px(42%) 비어 있다(스크린샷 확인, Q04는 두 폭 모두 실패).
- **원인**: `.kit-grid`의 두 카드가 같은 행에 있으면 기본 `align-items: stretch`로 높이가 같아진다(`src/styles/chunks.mjs:30`). 막대(축+범례 없음)와 도넛(범례 5줄)은 자연 높이가 달라, 짧은 쪽에 빈 면이 생긴다. 흐름은 열 수만 정하고 카드 높이 균형은 보지 않는다.
- **담당 코드**: `src/styles/chunks.mjs:30`, `src/layout.mjs` 흐름 정의, 6차 EMPTY_CELL 프로브(`scripts/design-qa/layout-probe.mjs`)
- **다른 조합**: 스윕에서 768px EMPTY_CELL 4개(`sales-dashboard`계). 1440px는 프로브가 지적하지 않았고 이유는 확인하지 못했다. 영향 범위는 이번에 세지 않았다(확인 필요).
- **개선안**: 같은 행의 시각 요소 카드는 같은 종횡비로 맞추거나(차트 높이 고정), 짧은 카드의 본문을 상단·중앙에서 균형 있게 배치하는 규칙을 둔다. 프로브는 카드 내부 마지막 내용 아래의 빈 비율로 판정한다(Q04).

#### A5. 상태 화면 제목이 320px에서 3줄 (BIG_NARROW) — 심각도 낮음
- **표본**: S27 `offline`, 320px. `S27__offline__w320.png`
- **측정**: `.kit-empty h2` 33px, 칸 폭 224px(6.8em), 3줄(Q05). 육안으로는 읽기에 문제없는 수준이다.
- **원인**: 상태 화면 제목이 페이지 제목 역할을 쓴다(`.kit-empty h2{font-size:var(--kit-t-title)}`, `src/styles/chunks.mjs:135`). 320px에서 `--kit-t-title`은 `clamp(33px,3.8vw,49px)`로 하한이 33px이고(`title.min .68`, `src/typography.mjs:121`), 상태 상자는 좌우 안쪽 여백 32px씩으로 칸이 224px가 된다(`chunks.mjs:134`). 글자 크기 하한이 칸 폭과 따로 정해진다.
- **같은 원인**: S28 `article`에 `type=condensed`를 적용하면 320px에서 h1이 38px·3줄·칸 288px(7.6em)으로 BIG_NARROW(`title.minCap: 38`, `src/typography.mjs:121`). 기본 서체에서는 나오지 않는다. 서체 프리셋이 바뀌면 같은 하한이 위반으로 바뀐다는 증거다.
- **개선안**: 타입 역할의 최솟값을 "칸 폭 대비 em" 조건과 함께 선언해(예: 칸 폭 < 9em이면 한 단계 낮은 역할) px 하한과 칸 폭을 같은 규칙에서 풀도록 한다. 새 서체 프리셋마다 320px에서 BIG_NARROW 0을 시험으로 고정한다.

#### A6. 카드·행 제목의 끝줄 고아 (ORPHAN_LINE) — 경미
- **표본**: S29 `hr-people`, 320·390·768px. `S29__hr-people__w390.png`
- **측정**: 제목 `strong`("백엔드 엔지니어 · 지원 24명")이 2줄, 끝줄 34px(2.1em). 세 폭 모두 3개 항목에서 발생(프로브 `ORPHAN_LINE`). 1440px는 없음. 계산된 `text-wrap`은 `wrap`이다.
- **원인**: 줄바꿈 정책이 태그 단위다. `h1~h6`에 `balance`, `p/li/dd/dt/blockquote/figcaption/summary`에 `pretty`가 걸려 있고(`src/styles/base.mjs:62-63`), 역할은 `strong`이라 어느 쪽에도 속하지 않는다.
- **다른 조합**: 6차 이후 표에서 ORPHAN_LINE이 138개 조합(`docs/diagnosis-round6.md`). 스윕에서 `wine-list`(320px), `changelog`(768px)의 `strong`·`span.kit-brand-name`도 같은 코드.
- **개선안**: 줄바꿈 정책을 태그가 아니라 타입 역할에 묶는다(제목 역할은 `balance`, 본문 역할은 `pretty`). 역할 밖 `strong`이 제목으로 쓰이는 부품은 역할을 지정하게 한다.

### B. 조립·선택 오류

#### B1. 히어로 형태 변경이 제품 시각 요소를 지운다
- **표본**: S02 `saas-landing~hero:statement`, S03 `saas-landing~hero:cover`, 기준 S01. `S02__saas-landing+hero-statement__w1440.png`, `S03__saas-landing+hero-cover__w1440.png`, `S01__saas-landing__w1440.png`
- **측정**: S01 히어로 `visual:"chart"`(제품 화면 목업). S02·S03은 `visual:null`이다(Q14 둘 다 실패). 화면에는 SaaS와 무관한 장식 원(S02)·추상 도형(S03)이 들어가고, 제품 화면은 첫 화면 아래의 벤토에만 남는다. 폭 390px에서도 같다.
- **원인**: `setHero`가 변형을 바꾸면서 변형이 허용하지 않는 `visual`·`motif`를 지운다(`src/catalog/variants.mjs:24-31`). 히어로 슬롯은 페이지 유형 제한도 내용 조건도 없다(`:46-47`, `when`이 히어로 1개 존재 여부만 확인). 제품이 무엇인지 보여 주는 시각 요소가 필수인지는 어디에도 선언돼 있지 않다.
- **담당 코드**: `src/catalog/variants.mjs:16-31, 46-47`, 규칙 없음(ID 부여 필요)
- **다른 조합**: `hero` 슬롯 옵션이 든 3,480개 조합 중 1,314개(11개 템플릿)에서 시각 요소가 있던 히어로가 시각 요소를 잃는다(`applyLayout` 전후 비교).
- **개선안**: 구성 변형에 "결과 계약"을 둔다. 히어로 변형은 `visual`이 있던 히어로를 유지할 수 있는 형태(split·product)로만 바꾸거나, 지울 때는 페이지가 제품 증명을 다른 곳에서 먼저 보여 주는지 확인한다. 계약은 Design Recipe(SaaS 랜딩)가 "첫 화면에 제품 시각 요소 1개"로 선언한다.

#### B2. 카드 스타일 일괄 변경이 페이지 카드의 절반만 바꾼다
- **표본**: S04 `saas-landing~cards:filled`, 기준 S01. `S04__saas-landing+cards-filled__w1440.png`
- **측정**: 카드 2개 중 `basic` 1개만 `filled`로 바뀌고 `media` 카드는 그대로(`{media:1, filled:1}`). 바뀐 카드 비율 0.5, 문서 높이는 4,823px로 기준과 같다(Q15 `S04:false`). 육안으로 두 화면의 차이가 거의 없다.
- **원인**: `cardsAs`는 `variant`가 `basic`인 카드만 바꾼다(`src/catalog/variants.mjs:39-44`). 슬롯 조건도 `basic` 카드가 하나라도 있으면 열린다(`:71`). 사용자는 "카드 일괄 변경"을 기대하지만 실제 변경 범위는 템플릿 데이터에 달려 있다.
- **다른 조합**: `cards` 슬롯이 든 1,528개 조합 중 488개(2개 템플릿)에서 일부 카드가 안 바뀐다.
- **개선안**: 변형 적용 후 "바뀐 요소 수 / 대상 요소 수"를 계산해 임계(예: 75%) 미만이면 옵션을 만들지 않거나 대상 범위(media 카드 포함)를 넓힌다. 이 조건이 Q15다.

#### B3. 격자 열 수 변경이 핵심 지표를 아래로 민다
- **표본**: S11 `dashboard-overview~columns:two`, 기준 S10. `S11__dashboard-overview+columns-two__w1440.png`
- **측정**: KPI 4개가 한 줄 4열(셀 275px)에서 2행 2열(셀 562px)이 된다. 첫 차트 위치 367px → 535px(+46%), 문서 높이 1,390px → 1,558px(+12%)(Q11 `rows:2` 실패). 390px에서는 두 화면이 같다.
- **원인**: `fitsColumns(4, 2)`는 고아만 본다(4개는 2열에 딱 맞음)(`src/catalog/variants.mjs:8`). 열 수 옵션은 `metric` 격자와 `card` 격자를 구분하지 않고 모든 `grid`에 적용한다(`:68-70`). 가로 폭이 넓어도 요약 지표는 한 줄에 읽히는 편이 낫다는 규칙이 없다.
- **다른 조합**: `columns:two`가 KPI 격자(4개 이하)에 적용되는 11개 조합(`dashboard-overview`, `dashboard-analytics`, `sales-dashboard`, `hr-people`).
- **개선안**: 열 수 변형의 적합성 조건에 "자식 의미"를 넣는다(KPI·요약 지표는 컨테이너가 넓으면 한 줄 유지). 이 규칙은 Design Recipe(업무 대시보드)의 "지표는 첫 화면 한 줄"로 선언한다.

#### B4. 가운데 정렬 변형이 정렬선을 둘로 가른다
- **표본**: S30 `saas-landing~heads:center`, S32 `article~intro:center`, 기준 S01·S34. `S30__saas-landing+heads-center__w1440.png`, `S32__article+intro-center__w1440.png`
- **측정**: S30은 5개 섹션 모두 머리말이 가운데, 첫 본문 요소가 왼쪽(Q12 `mismatched:5`, 기준 0). S32는 페이지 제목이 가운데이고 본문 첫 문단이 왼쪽(`intro:true`, 기준 S34 0).
- **원인**: `heads:center`는 `section.align`만 바꾸고 섹션 안의 격자·단계·후기의 정렬은 건드리지 않는다(`src/catalog/variants.mjs:113`). `intro:center`도 `page-header.align`만 바꾼다(`:48-49`). 6차는 `pages` 필터로 앱·문서에서 가운데 머리말을 없앴지만, 허용된 페이지(랜딩·글 등)에서도 "머리말만 가운데"가 남는다. `article`은 허용 목록(`CENTERED_OK`)에 들어 있다.
- **다른 조합**: `heads:center` 2,154개, `intro:center` 2,287개 조합. 이 중 실제로 정렬이 갈리는 비율은 이번에 전수로 재지 않았다(표본 2개만 측정, 확인 필요).
- **개선안**: 정렬을 한 번에 하나의 축으로 선언한다. 가운데 정렬은 그 영역의 모든 직계 콘텐츠(설명, 격자 항목의 텍스트 정렬)까지 같이 정하거나, 섹션 단위로만 허용한다. Q12 조건이 재현 테스트의 초안이다.

#### B5. 폼 2열에서 반폭 필드 혼자 한 줄
- **표본**: S17 `checkout`, 1440px. `S17__checkout__w1440.png`
- **측정**: `.kit-form-fields` 2열(413px×2). 필드 5개 중 "주소"가 왼쪽 반폭에 혼자 놓이고 오른쪽 413px이 빈다(Q09 `loneHalfRows:1`). 나머지 둘은 전폭이다.
- **원인**: 폼 2열 전환은 컨테이너 폭 조건(`2×minField+gap`)만 보고(`src/composition.mjs:57, 133-138`) 필드 개수와 짝 지음은 보지 않는다. 열 수가 개수와 맞는지 보는 흐름의 불변식이 폼에는 없다.
- **다른 조합**: 같은 `two-column` 폼을 쓰는 템플릿·조합의 범위는 이번에 세지 않았다(확인 필요).
- **개선안**: 폼도 "반폭 필드는 짝이 있어야 한다"를 규약에 넣는다. 짝이 없는 반폭 필드는 전폭으로 올리거나, 연관 필드(예: 우편번호·상세주소)로 짝을 짓게 템플릿 데이터를 고친다.

#### B6. 같은 Blueprint가 테마·서체에 따라 구성 자체가 바뀐다 — 관찰
- **표본**: S01(기본)·S08(`theme=brutalist`)·S09(`type=terminal`), S10(기본)·S13(`theme=neon`). 각 폭 스크린샷.
- **측정**: 히어로 제목 59.6 / 71.6 / 50px, 벤토 열 수 2 / 4 / 2, 문서 높이(1440px) 4,823 / 4,193 / 4,817px(Q16, 판정 없음). `dashboard-overview`는 기본이 `sidebar` 셸, 네온 테마에서는 `topbar` 셸이다(S13에서 사이드바 내비가 상단 내비로 바뀜).
- **원인**: 테마가 `shell`·`width`·`scale` 기본값을 함께 정한다(`src/catalog/themes.mjs`의 `D(...)` 기본값). 콘텐츠 폭이 달라지면 벤토 열 수와 히어로 글자 크기가 바뀐다. 이것이 의도한 "시각 언어"인지 구성 변형인지의 경계가 코드에 없다.
- **판정**: 결함으로 단정하지 않는다. 같은 템플릿을 테마만 바꿨을 때 내비 구조(사이드바→상단)가 바뀌는 것이 사용자가 기대한 변경인지가 불분명하다. 다음 단계의 Design Recipe가 "테마가 바꿔도 되는 것"과 "바꾸면 안 되는 것"을 선언해야 판정할 수 있다.

### C. 페이지 수준 완성도

#### C1. 같은 큰 일러스트가 한 페이지에 두 번
- **표본**: S01 `saas-landing`, 1440·390px. `S01__saas-landing__w1440.png`, `S01__saas-landing__w390.png`
- **측정**: 히어로 목업과 벤토 첫 칸의 큰 SVG(200×120px 이상) 2개가 id를 빼면 같은 내용이다(Q13 `duplicateGroups:1`, `places:["hero","bento"]`). 기본 구성 85개를 1440px에서 전부 재면 같은 큰 일러스트가 두 번 나오는 템플릿은 `saas-landing`, `fitness-landing`, `travel-ocean` 3개다.
- **원인**: 템플릿 데이터가 히어로와 벤토에 같은 `visual` 종류를 쓰고(`src/catalog/templates.mjs:24` 이하 `saas-landing`), 페이지 수준에서 반복을 검사하는 규칙이 없다. 맥락 결정표 C01~C35는 모두 노드 단위다(`src/catalog/composition.mjs:10-44`).
- **다른 조합**: 위 3개 템플릿의 기본 구성. 구성 변형 조합에서 유지되는 정도는 세지 않았다(확인 필요). 참고로 S06 `product-landing`은 시각 종류는 반복하지만 일러스트 내용이 달라 중복이 아니다(Q13 통과).
- **개선안**: 페이지 수준 규칙 한 개: "같은 종류·같은 내용의 큰 시각 요소는 한 페이지에 한 번". 위반 시 템플릿 데이터를 고치게 하거나 소스 일러스트를 다른 화면으로 바꾼다.

#### C2. 텍스트만 있는 split 히어로: 제목이 작고 오른쪽 절반이 빔
- **표본**: S05 `devtool-landing`, 대조 S33 `bank-product`. `S05__devtool-landing__w1440.png`, `S33__bank-product__w1440.png`
- **측정**: S05 히어로는 `variant:"split"`인데 시각 요소가 없고(`.kit-hero-copy`만 존재) 제목 34px, 글줄 오른쪽 끝 719px(콘텐츠 폭의 50%가 빔), 높이는 뷰포트의 0.47배(Q06 실패). S33도 시각 요소가 없지만 제목이 64px라 빈 비율 0.41로 통과한다.
- **원인**: 두 템플릿 모두 `split` 히어로에 `visual`이 없다(분포 검사: `devtool-landing:split`, `bank-product:split`). 히어로 제목은 `display` 역할이고(`src/typography.mjs:122`), devtool 테마의 기본 `scale`은 `tight`, SaaS(trust)는 `balanced`다(`src/catalog/themes.mjs`). 제목 34px와 59.6px의 차이는 이 스케일 차이로 추정하지만 역할별 계산을 따라가 확인하지는 않았다(확인 필요). 시각 요소 없는 히어로가 `split` 형태로 남는 것을 막는 조건이 없다는 점은 코드로 확인했다.
- **다른 조합**: 이번 분포 검사에서 `split`/`product` 히어로의 `visual` 누락은 두 템플릿뿐이다. 같은 테마(`devtool`)·스케일(`tight`)을 쓰는 다른 템플릿의 히어로 크기는 이번에 재지 않았다(확인 필요).
- **개선안**: 히어로는 "시각 요소가 없으면 `statement`/`centered`처럼 텍스트 중심 형태로, 제목 최소 크기를 보장". Design Recipe(SaaS 랜딩)가 첫 화면에서 히어로 제목이 본문 제목보다 최소 1.6배 큰 위계를 선언한다.

#### C3. 벤토의 낮은 칸이 60% 이상 비어 있음
- **표본**: S06 `product-landing`, S01 `saas-landing`, 1440px. `S06__product-landing__w1440.png`, `S01__saas-landing__w1440.png`
- **측정**: S06 벤토 4열 안 낮은 칸 4개의 내용 비율이 31~41%(빈 비율 평균 0.63, 최대 0.69). S01 벤토 낮은 칸 4개 평균 0.42, 최대 0.63(진행률 카드)(Q07 둘 다 실패). 기존 프로브(EMPTY_CELL)는 두 화면 모두 지적 0이다.
- **원인**: 벤토는 칸 높이를 행에서 가장 큰 칸(2×2 시각 칸)에 맞춘다(`src/layout.mjs:106-125` `bentoPlan`, `src/styles/chunks.mjs:41-44`). 짧은 내용(지표 숫자 1개, 진행률 막대)은 늘어난 칸 위쪽에 놓인다. 프로브 임계(96px·38% + 표면 상자 판정)는 이 조합을 놓친다.
- **다른 조합**: 벤토를 가진 템플릿 전반(`saas-landing`, `product-landing`, `devtool-landing`, 일부 `portfolio`계). 범위는 이번에 세지 않았다(확인 필요).
- **개선안**: 벤토에서 시각 칸이 아닌 칸은 내용 높이에 맞춘 행 높이(마지막 줄 균형 포함)를 쓰거나, 칸 내부 수직 중앙 정렬을 기본으로 한다. 프로브에는 "벤토 칸 내용 비율"을 추가한다(Q07).

#### C4. 막대 차트 값 도메인과 가로 늘림
- **표본**: S15 `dashboard-analytics`, 1440px. `S15__dashboard-analytics__w1440.png`
- **측정**: 전폭 가로 막대 차트의 축 최대 10에 데이터 최대 5.1(채움 51%), SVG 가로세로 왜곡 2.46배(viewBox 360×240이 1254×340으로 렌더, `preserveAspectRatio="none"`)(Q08 실패).
- **원인**: 축 최댓값을 `niceMax`로 올리고(`src/render/chart.mjs:7, 16`) 배정된 폭을 채우도록 `preserveAspectRatio="none"`을 쓴다(`:77`). 폭이 넓은 한 칸에서는 막대가 짧고 빈 면이 많은 차트가 된다.
- **다른 조합**: 전폭 가로 막대·선 차트를 쓰는 데이터 화면. 범위는 이번에 세지 않았다(확인 필요).
- **개선안**: 차트 부품에 "최소 채움 비율"과 폭 대비 최대 종횡비를 둔다(좁은 칸에 두 개씩 놓거나 높이를 늘린다).

#### C5. 히어로 아래 죽은 간격
- **표본**: S07 `agency-home`, 768·1440px. `S07__agency-home__w768.png`
- **측정**: 히어로 수치 아래 가장자리에서 다음 섹션 제목까지 768px 223px, 1440px 208px(320px 154px)(Q10 두 폭 실패). 히어로 아래 여백 119px(히어로 하단 728px, 수치 하단 609px)와 다음 섹션의 위쪽 안쪽 여백 104px를 더한 값이다(768px 기준).
- **원인**: 히어로가 자체 아래 여백을 갖고 다음 섹션도 위쪽 여백을 갖는다. 둘이 더해져 시각적으로 한 덩어리처럼 읽혀야 할 수치와 다음 섹션 제목 사이가 비게 된다. 이 간격을 페이지 수준에서 조정하는 규칙이 없다(`src/spacing.mjs`는 부품 사이 tier만 다룬다).
- **다른 조합**: `facts`를 쓰는 히어로를 가진 9개 템플릿(A1과 같은 범위).
- **개선안**: 히어로와 다음 섹션 사이는 둘 중 큰 여백 하나만 쓴다(여백 겹침 규칙). 페이지 수준 리듬 규칙으로 선언한다.

#### C6. 일러스트 상자가 직선으로 잘림
- **표본**: S27 `offline`, 320px. `S27__offline__w320.png`
- **관찰**: 상태 화면 일러스트의 언덕 도형이 사각형 상자(x 48~272px)에서 잘려 좌우·아래 가장자리가 직선으로 끊긴다(스크린샷 확인, 측정값 없음). 육안 관찰이며 다른 상태 화면(`not-found` 등)에서도 같은지는 확인하지 못했다(확인 필요).
- **개선안**: 상태 일러스트는 상자 없이 가장자리가 페이드되거나 도형 전체가 상자 안에 들어오게 한다.

### 변형 효과가 없거나 중립인 표본 (결함으로 세지 않음)

S16(`finance-overview~data:bordered`), S19(`signup~notice:toast`), S21(`product-detail~tabs:boxed`), S22(`product-detail~gallery:masonry`), S26(`docs-reference~tabs:boxed`), S31(`saas-landing~rhythm:banded`)은 기준 표본과 비교했을 때 눈에 띄는 악화를 못 찾았다. S31은 기본 구성이 이미 3개 섹션을 띠로 구분하고 있어(`bandRuns.banded:3`) 변형이 문서 높이(4,823px)를 포함해 거의 바꾸지 않는다. S19의 `toast`는 떠 있는 카드가 아니라 폼 아래 정적 카드로 그려진다(육안). S22는 문서 높이가 1,881→2,377px로 26% 늘지만 구매 박스와의 균형이 깨지지는 않았다. 이들은 "변형이 의미가 있는지"의 문제이고 B1~B4 계열(적용 조건 없음)과 같은 뿌리다.

## 5. 좋은 화면과 나쁜 화면의 차이

| 비교 | 좋은 쪽 | 나쁜 쪽 | 차이를 만든 구체 원인 |
|---|---|---|---|
| 랜딩 첫 화면 | S01: 제품 목업이 있는 split 히어로. 제목 59.6px, 히어로 높이 뷰포트의 0.63배, 4폭 모두 심각 프로브 지적 0 | S05: 시각 요소 없는 split 히어로. 제목 34px, 글줄 오른쪽 50%가 빔 | 시각 요소 유무와 `display` 스케일. 시각 요소를 지우는 규칙은 B1과 같은 뿌리다 |
| 같은 SaaS 랜딩의 히어로 | S01(`visual:"chart"`) | S02·S03(`visual:null`) | `setHero`가 `visual`을 지움(`variants.mjs:24-31`), 첫 화면에 제품 증명이 남는지 보는 계약이 없음 |
| 대시보드 | S10: KPI 한 줄(`rows:1`, 셀 275px) 아래 차트, 첫 차트 y=367px | S11: KPI 2행(셀 562px), 첫 차트 y=535px | 열 수 변형이 의미를 안 봄(`fitsColumns`는 고아만 봄) |
| 섹션 정렬 | S01: 머리말·본문 정렬 일치(Q12 불일치 0/5) | S30: 5/5 불일치. S32도 제목만 가운데 | 정렬 변형이 머리말 한 요소만 바꿈 |
| 폭 대응 | S01: 4폭 프로브 지적 0(1440에서 경미 MEASURE_SHORT만) | S07: 320px에서만 2+1. 390·768에서는 3열·5열 | 개수 고정 격자가 흐름 불변식 밖에 있음(`EQUAL_COLUMNS_OK`) |
| 같은 로직의 텍스트 히어로 | S33: 제목 64px, 빈 비율 0.41 | S05: 제목 34px, 빈 비율 0.50 | 같은 구조이고 차이는 테마 스케일(`tight`)뿐 |
| 글 페이지 | S34: 제목·본문·인용 한 정렬선 | S32: 제목만 가운데 | 변형이 한 요소만 바꿈(B4) |
| 폼 | S18 인증 폼: 한 열, 프로브 0 | S17: 2열에서 반폭 필드가 혼자 있음 | 폼 2열이 필드 짝을 모름(`composition.mjs:133-138`) |

공통점은 이렇다. 좋은 화면은 **부품이 아니라 페이지 전체에서 하나의 규칙(한 정렬선, 한 개의 주 시각 요소, 한 줄 KPI)을 지키는** 화면이다. 나쁜 화면은 각 부품이 규약을 지키는데, 부품 사이의 관계(시각 요소 유무, 정렬축, 높이 균형, 반복)를 보는 규칙이 없어 생긴다.

## 6. 공통 원인과 우선순위

우선순위는 (영향 범위) × (개선 효과)로 정했다. "조합 수"는 이 저장소 데이터로 센 값이다. 측정 조건은 `scripts/design-qa/quality-claims.mjs`에 구현돼 있고 개선 전에는 해당 표본이 모두 `pass:false`다.

| 순위 | 공통 원인(상위 규칙 단위) | 닿는 결함 | 영향 범위 | 개선 효과 | 측정 가능한 조건(재현 테스트 초안) |
|---|---|---|---|---|---|
| 1 | **검증 폭이 1440·390에 한정되고, "고정 개수 구조 틀"이 흐름 불변식 밖에 있다.** 6차 C 0은 두 폭에서만 성립한다 | A1, A2, A3, A5(일부) | 전 조합 4,955개 중 1,173개(23.7%)가 320·768px에서 심각 지적. GRID_ORPHAN 1,152(히어로 수치 9개 템플릿)·EDGE 15·EDGE_VIEW 6·EMPTY_CELL 4·BIG_NARROW 1·NARROW_COL 1·768px GRID_ORPHAN 3 | 가장 큼: 한 규칙(히어로 수치를 흐름으로 이전)이 1,152개를 없앤다. 게이트 폭을 4개로 늘리면 이후 회귀를 막는다 | Q01: `.kit-hero-facts` 항목 ≥3일 때 `n % cols !== 1`. Q03: `.kit-menu ul` 동일 조건. `width-sweep`가 320·390·768·1440에서 심각 지적 0. `e2e/quality.spec.mjs:39`의 폭 목록에 320·768 추가 |
| 2 | **구성 변형이 값을 치환할 뿐 "결과 계약"이 없다.** 선택 가능성은 있는지(`when`)와 페이지 유형(`pages`)만 보고, 바뀐 뒤 의미(시각 요소 유지, 형제 전체 변경, 한 정렬축, 첫 화면 위계)를 검사하지 않는다 | B1, B2, B3, B4, 변형 중립 표본 | `hero` 1,314개 조합이 시각 요소 상실, `cards` 488개가 부분 변경, `columns:two`가 KPI에 닿는 11개, `heads:center` 2,154·`intro:center` 2,287개(실제 불일치 비율은 확인 필요) | 크다: 변형 시스템 전체의 품질이 한 곳(`variants.mjs`)에서 정해진다. 나쁜 옵션이 만들어지지 않고 중립 옵션도 걸러진다 | Q14: 히어로 변형 전환 후 `visual` 보존. Q15: 바뀐 카드 / 전체 카드 ≥ 0.75. Q11: KPI ≤4개·폭 ≥1100px일 때 `rows=1`. Q12: 머리말·본문 text-align 불일치 쌍 0. 추가 후보: "변형 적용 전후 DOM 차이가 0이면 옵션 제거" |
| 3 | **페이지 수준 판단 규칙이 없다.** 결정표 C01~C35는 노드 단위이고 형제·페이지 사실(중복 시각 요소, 시각 요소 없는 히어로, 섹션 사이 간격, 벤토 칸 채움)을 입력으로 받지 않는다 | C1, C2, C3, C5, C4(일부) | 같은 일러스트 중복 템플릿 3개, 시각 요소 없는 split 히어로 2개, 히어로 수치 뒤 죽은 간격 9개 템플릿, 벤토를 가진 템플릿 전반(범위 확인 필요) | 중간~큼: Design Recipe 3종의 기반. 프로브가 못 잡는 "어색함"을 DOM 지표로 승격한다 | Q13: 큰 SVG 중복 그룹 0. Q06: 시각 요소 없는 split 히어로의 오른쪽 빈 비율 < 0.45. Q07: 벤토 낮은 칸 빈 비율 ≤ 0.6. Q10: 히어로 하단→다음 제목 ≤ 160px |
| 4 | **타입 역할의 px 하한이 칸 폭과 분리돼 있다.** 서체 프리셋·테마가 바뀌면 같은 하한이 위반이 된다 | A5, S28 | 상태 화면 320px 1개 조합, 서체 `condensed`+글 320px 확인. 18개 프리셋 × 모든 화면의 전수는 못 셌다(확인 필요) | 중간: 새 서체·테마를 더해도 320px에서 안전해진다 | Q05: `.kit-empty h2` 320px 줄 수 ≤ 2. 프로브 BIG_NARROW 0을 18 프리셋 × 대표 템플릿 × 320px로 시험 |
| 5 | **격자·벤토가 칸 높이 균형을 보지 않는다.** 행 안 카드는 `stretch`로 늘어나고 시각 칸은 가장 큰 칸에 맞춰진다 | A4, C3, S12 1440 | 768px EMPTY_CELL 4개 조합(`sales-dashboard`계), 1440px는 범위 미확인 | 중간 | Q04: 같은 격자 안 카드 아래 빈 공간 < 96px 또는 < 38% |
| 6 | **줄바꿈 정책이 태그 단위이고 역할 단위가 아니다** | A6 | ORPHAN_LINE 138개 조합(`diagnosis-round6.md`), 스윕 추가 확인 | 작음~중간: 한 줄 규칙으로 138개 조합이 해소될 가능성(확인 필요) | 프로브 ORPHAN_LINE 0(제목 역할 `strong`·`span`) |
| 7 | **폼 2열 전환이 필드 짝을 모른다** | B5 | `two-column` 폼 전반(범위 확인 필요) | 작음 | Q09: 반폭 필드 혼자 한 줄인 행 0 |
| 8 | **테마가 셸·폭·스케일을 함께 바꿔 같은 Blueprint의 구성 자체가 달라진다** | B6 | 테마 54개 중 5개 표본만 확인. 전체는 모름 | 정책 결정 필요(결함 단정 불가) | Q16(정보용): 같은 Blueprint를 테마만 바꿨을 때 `shell`·히어로 줄 수·벤토 열 수의 변화 기록 |
| 9 | 막대 차트 도메인·종횡 왜곡 | C4 | 전폭 차트 화면(범위 확인 필요) | 작음 | Q08: 데이터 최댓값/축 최댓값 ≥ 0.6, 종횡 왜곡 ≤ 1.5 |

## 7. 다음 단계로 이어지는 입력

사용자가 정한 다음 단계 항목과 이 진단의 연결이다. 이번 단위는 아래를 고치지 않았다(범위 밖).

| 다음 단계 항목 | 근거 결함 | 필요한 상위 규칙 |
|---|---|---|
| 공통 규약(타이포·간격·레이아웃) | A1~A6, 순위 1·4·5·6 | 예외 목록에 증명 요구, 타입 하한과 칸 폭 연동, 태그 대신 역할별 줄바꿈 |
| 변형 적합성(카드 일괄 변경, 섹션 배경 리듬, 가운데 정렬, 히어로 형태, 격자 열 수) | B1~B4, S31 | 구성 변형의 결과 계약(보존·전체 변경·한 정렬축·DOM 차이 0이면 제거) |
| 페이지 전체 위계 판단 | C1~C3, C5 | 페이지 수준 사실(시각 요소 중복·히어로 크기·섹션 간격)을 입력으로 받는 규칙 |
| Design Recipe 3종 | 아래 | 아래 |

- **SaaS 랜딩**: 첫 화면에 제품 시각 요소 1개, 히어로 제목이 섹션 제목의 1.6배 이상, 같은 시각 요소 반복 금지, 섹션 머리말·본문 정렬 일치(B1, B4, C1, C2).
- **업무 대시보드**: KPI는 한 줄, 같은 행 카드의 높이 균형, 차트 도메인 채움(B3, A4, C4).
- **콘텐츠 페이지**: 제목·본문 한 정렬선, 줄바꿈 정책, 320px 제목 하한(B4, A5, A6).

## 8. 개선 후 재측정 방법

1. `src/`를 고친 뒤 `node scripts/design-qa/quality-shoot.mjs --phase after` → `docs/evidence/quality-2026-11-21/after/`에 같은 파일명으로 저장.
2. `node scripts/design-qa/quality-claims.mjs --phase after` → Q01~Q17의 `pass`가 개선 대상 표본에서 `true`로 바뀌는지 확인(Q16은 정보용).
3. `node scripts/design-qa/width-sweep.mjs --out docs/evidence/quality-2026-11-21/sweep-320-768-after.json`로 심각 지적 조합 수(현재 1,173)를 다시 센다.
4. 개선 효과가 없는 변형(표본 S16, S19, S21, S22, S26, S31)은 "기준 표본과 DOM·스크린샷 차이가 0"인지로 다시 판정한다.

## 11. 수정 결과: 공통 원인 1·4·5·6·7 (카탈로그 2.4.0, 레이아웃 리비전 2)

이 절은 6절 우선순위 표의 원인 1·4·5·6·7을 상위 규약(layout·typography·spacing 토큰·렌더러 짝 짓기)에서 고친 결과다. 원인 2·3(변형 결과 계약, 페이지 수준 규칙)과 8·9는 이번 범위가 아니라 고치지 않았고, `claims-after.json`에서 해당 청구(Q06~Q08, Q10~Q15)는 그대로 `pass:false`다. 컴포넌트별 일회성 CSS나 소비자 경로는 더하지 않았다. 진단 도구의 임계값은 바꾸지 않았다.

### 11.1 원인별 수정과 증거

재현 시험은 `e2e/layout-common.spec.mjs`(브라우저 실측)와 `tests/layout-rev2.test.mjs`(규약·호환)다. 수정 전 실패 출력은 `docs/evidence/layout-refine/red-e2e.log`(수정 전 커밋 `a0f28b279`에서 7개 중 6개 실패)에 있다. 스크린샷 접두사는 `docs/evidence/quality-2026-11-21/`이다.

| 원인 | 상위 규칙으로 고친 것 | 측정(수정 전 → 후) | 전후 스크린샷 |
|---|---|---|---|
| 1 고정 개수 격자가 흐름 밖 | 히어로 수치·사진 메뉴·프로필 수치·라디오 선택지에 흐름 표지와 예산(`FLOW_BUDGETS`). 예외 목록을 `FLOW_FALLBACKS`·`FIXED_FRAMES`(증명 필수)·`REV1_GRIDS`로 나눔. 메뉴 줄은 나열(cluster)로 줄바꿈. 품질 게이트 폭에 768·320 추가 | Q01 S07@320 `cols 2, orphan true` → `cols 3, orphan false`(9개 템플릿 320px 전부 통과). Q02 `maxOverflow 36 → 0`. Q03 S23@768 `orphan true → false` | `before/S07__agency-home__w320.png` → `after/S07__agency-home__w320.png`, `before/S23__menu-dining__w320.png`·`w768` → `after/` |
| 4 타입 하한 ≠ 칸 폭 | `FIT`: 상자(`.kit-empty`·`.kit-page-header` 9em, `.kit-quote` 12em) 안에서 역할 값을 `min(원래 값, 칸 폭/em)`으로 재정의 | Q05 S27@320 `33px 3줄 → 24.9px 2줄`. S28 condensed@320 BIG_NARROW 해소. 서체 프리셋 18종 × 상태 화면·글·인증 × 320px BIG_NARROW 27건 → 0 | `before/S27__offline__w320.png` → `after/`, `S28__article@ty-condensed__w320.png` |
| 5 칸 높이 균형 | `STRETCH_ABSORB`: 같은 행에서 늘어난 차트 카드는 본문을 세로 가운데에 두고 "데이터 표 보기"를 아래에 붙임 | Q04 S12@768 `빈 공간 287px(56%) → 180px(35%)`, @1440 `210px(42%) → 142px(28%)`. EMPTY_CELL 해소. 여전히 140~180px는 비어 있다(아래 한계) | `before/S12__sales-dashboard__w768.png`·`w1440` → `after/` |
| 6 줄바꿈이 태그 단위 | `WRAP`: 제목 역할(`strong`·`dt`·브랜드 이름)은 `balance`, 본문 역할은 `pretty` | S29 ORPHAN_LINE 3개 × 3폭 → 0. 스윕 ORPHAN_LINE 320px 8건(`strong`)·768px 5건 중 `strong` 2건 해소, 수정 중 새로 드러난 `dt`(히어로 수치 라벨, 3칸이 좁아져 생김)도 같은 규칙으로 해소. 768px의 `span.kit-brand-name` 3건만 남음 | `before/S29__hr-people__w390.png` → `after/` |
| 7 폼 2열이 짝을 모름 | `loneFields`: 짝 없는 반폭 필드는 전폭. 순서는 그대로 | Q09 S17@1440 `loneHalfRows 1 → 0` | `before/S17__checkout__w1440.png` → `after/` |

히어로 수치가 320px에서 한 줄 3칸(48 / 12년 / 96%)이 되었고, 3칸이 들어가지 않는 더 좁은 컨테이너(240px 미만)에서는 한 열이 된다. 2+1이 되는 폭은 없다(`flowColumns(3, 3) = [1, 1, 3, 3]`).

### 11.2 전수 재측정

| 측정 | 수정 전 | 수정 후 |
|---|---|---|
| 폭 스윕 320·768px 심각 지적 조합(`sweep-320-768-after.json`) | 1,173 (지적 있는 조합 1,197) | **7** (지적 있는 조합 23) |
| 심각 지적 내역 | GRID_ORPHAN 1,152+3, EDGE 15, EDGE_VIEW 6, EMPTY_CELL 4, BIG_NARROW 1, NARROW_COL 1 | EDGE 6(탭 줄 가로 스크롤 영역, Q17로 오탐 판정), NARROW_COL 1(달력 일정 목록, 이번에 고치지 않음) |
| 구조 등급(`docs/evidence/diagnosis-2.4.0.json`, 카탈로그 2.4.0) | A 4,515 · B 440 · C 0 (2.3.0) | A 4,538 · B 417 · C 0. 상승 23개(ORPHAN_LINE 해소: campaign-donate 17, event-landing 4, hr-people 2), **하락 0** |
| 표본 34개 × 4폭 프로브 지적(`measure-after.json`) | 32건 | 16건(MEASURE_SHORT 15, EDGE 1). 악화한 표본·폭 0 |

표본 34개 × 4폭 after 스크린샷 136장은 `after/`에 같은 파일명으로 있다. 완성도 높음으로 분류한 S01·S10·S33은 before와 after가 바이트 단위로 같고, S18은 푸터 버전 문구(2.3.0 → 2.4.0)만 다르고 화면 지표가 같다. S34는 320px에서 제목이 33px에서 32px로 줄어 높이가 4px 짧아졌다(직접 확인, 악화 없음).

### 11.3 출력 호환과 카탈로그 버전

출력이 바뀌므로 저장소의 버전 고정 규칙(`docs/governance.md`, 타이포그래피 리비전 2의 선례)에 따라 2.3.0 위에 얹지 않고 카탈로그를 2.4.0으로 올렸다. 2.1.0~2.3.0 입력은 `layoutRev() = 1`로 이전 출력을 유지한다. 2.3.0은 수정 전 코드(`a0f28b279`)에서 85개 템플릿의 입력과 출력 SHA-256을 `docs/evidence/layout-refine/legacy-2-3-{blueprints,hashes}.json`에 고정했고 `tests/layout-rev2.test.mjs`가 매번 같은 바이트인지 비교한다. 2.1.0·2.2.0 고정 시험(`legacy-hashes.json`, `legacy-2-2-hashes.json`)도 그대로 통과한다. `kit migrate`는 catalogVersion만 2.4.0으로 바꾼다.

### 11.4 한계와 남은 범위

- **Q04는 줄었지만 해소는 아니다.** 도넛 카드는 본문을 가운데에 둬 위아래로 각각 비는 면이 생겼다. Q04 통과는 비율 조건(< 38%)으로 이뤄졌고 절대값 96px 조건은 아직 아니다. 차트 높이를 이웃과 맞추는 쪽(원인 9, C4)은 하지 않았다.
- **FIT의 칸 폭은 근사다.** `100vw − 2×거터 − 상자 안쪽 여백`이다. 상자가 한 열로 접힌 좁은 화면에서만 의미가 있다. 사이드바 셸이 좁은 화면에서 한 열로 접히지 않는 조합이 있다면 별도 확인이 필요하다(확인 필요). 컨테이너 쿼리로 못 한 이유는 `.kit-empty`가 shrink-to-fit 격자 항목이라 격리를 걸면 폭이 64px로 무너졌기 때문이다.
- **브랜드 이름의 끝줄(ORPHAN_LINE `span.kit-brand-name`)은 고치지 않았다.** `changelog`계 768px에서 196px 사이드바 안의 두 단어("FlowWorks 문서")가 둘로 갈리는 것이라 `balance`로 해소되지 않고 사이드바 폭의 문제다(3개 조합).
- **`MEASURE_SHORT` 399건, `MEASURE`(`saas-landing`의 `faq:split`) 27건은 건드리지 않았다.** 글줄 폭 역할(max-width)의 문제이고 이번 다섯 원인과 같은 규칙으로 풀리는지 확인하지 못했다. 768px의 MEASURE_SHORT 13건도 같다.
- **`NARROW_COL`(달력 일정 목록 62px)과 `.kit-tablist`의 EDGE 오탐 6건은 그대로다.** 원인 1에서 말한 "탭 줄" 지적은 Q17이 오탐으로 판정했다.
- **`src/catalog/variants.mjs`는 건드리지 않았다.** `src/catalog/index.mjs`에서 버전 상수만 바꿨다.
- **환경.** Chromium·macOS 폰트만 확인했다. Linux CI 폰트에서의 줄바꿈은 확인하지 못했다.

## 12. 수정 결과: 공통 원인 2·3 (변형 결과 계약과 페이지 규칙, 2026-11-21)

결정·호환 정책·한계는 `docs/adr/0006-variant-contracts-and-page-rules.md`. 측정은 같은 표본 목록, 같은 Chromium·macOS 폰트다. 스크린샷과 측정 JSON은 `docs/evidence/quality-2026-11-21/after-variants/`(다른 작업자의 `after/`와 분리)에 있다.

### 12.1 무엇을 했나

- **변형 결과 계약 V01~V05**(원인 2): 옵션을 지우지 않고 기본 추천에서만 뺀다. 4,955개 조합 id는 모두 남는다. 규칙별 영향: V01 1,314개 조합(진단의 1,314개와 같다), V02 480개(진단 488개, 8개 차이는 75% 이상 바뀌어 통과하는 조합으로 추정하며 개별로 확인하지 않았다), V03 11개(진단과 같다), V04 2,266개, V05 997개. 합쳐 3,466개(70%)가 갤러리 기본 목록에서 빠지고 `combo.rules`에 규칙 ID가 남는다.
- **페이지 규칙 P01~P04**(원인 3): P01 히어로 그림 뒤 장면 순환·중복 보고, P02 시각 요소 없는 split 히어로를 가운데 텍스트형으로(2개 템플릿), P03 히어로 바로 뒤 투명 섹션의 이중 띠 여백 제거, P04 희박한 벤토 보고. 결정은 `manifest.design.page`에서 규칙 ID로 추적한다.
- 계약 예측을 1440px DOM과 대조했다(`docs/evidence/variants/contract-verify.json`, 옵션 약 250개): V01 33/33·V02 2/2·V03 4/4 일치, V04 34건 일치와 예측만 1건(`music-player~intro:center`, Q12 측정이 `<p>` 없는 본문을 못 봄, 스크린샷으로는 제목만 가운데).

### 12.2 측정 조건 전후 (표본, `claims-after-variants.json`)

| 조건 | 대상 | 전 | 후 | 이유 |
|---|---|---|---|---|
| Q06 | S05 (1440) | 실패 0.50 | **통과 0.29** | P02: 텍스트만 있는 split 히어로가 가운데 형태. S33 0.41→0.28, S01 변함없음 |
| Q10 | S07 (320/768/1440) | 154 통과 / 223 실패 / 208 실패 | **90 / 119 / 104, 모두 통과** | P03: 히어로 뒤 섹션의 band 여백 제거(히어로 자체의 아래 여백 하나만 남음) |
| Q13 | S01 (1440, 390), S06 | S01 실패 | **통과** | 히어로 목업과 같은 차트가 벤토에 또 나오던 것을 벤토 카드 `diagram`으로 교체(템플릿 데이터), P01은 재발을 보고 |
| Q07 | S06, S01 | 실패 | **실패 그대로**(0.69, 0.63) | 벤토 행 높이는 `bentoPlan`·`.kit-bento`(원인 5, 다른 작업자). P04는 보고만 한다 |
| Q11 | S11 | 실패 | 실패 그대로, 단 `recommended:false`·V03 | 명시적으로 고른 실험 조합은 렌더가 그대로다. S10(기준)은 통과 |
| Q12 | S30, S32 | 실패 | 실패 그대로, `recommended:false`·V04 | 렌더러가 본문을 따라 가운데로 옮길 수단이 없다(컴포넌트별 CSS 금지) |
| Q14 | S02, S03 | 실패 | 실패 그대로, `recommended:false`·V01 | 위와 같음 |
| Q15 | S04 | 실패 | 실패 그대로, `recommended:false`·V02 | 위와 같음 |

변형 표본(S02·S03·S04·S11·S30·S32)이 계속 `pass:false`인 것은 의도한 결과다. 고친 것은 렌더가 아니라 "추천되는가"이고, 이 표본들은 그 반례로 남는다. 기준 표본(S01·S10·S34 등)은 전후 모두 통과다.

### 12.3 육안 확인 (직접 본 것과 못 본 것)

직접 본 전후 비교: S07(히어로~다음 섹션 간격이 줄고 한 덩어리로 읽힘), S05(왼쪽 치우친 반쪽 히어로가 가운데 정렬로), S33(제목 64px 가운데, 안정적), S01(히어로 목업과 다른 흐름도로 바뀜), S06(벤토 낮은 칸은 여전히 비어 있음), 그리고 `saas-landing~intro:center`와 `music-player~intro:center`. 못 본 것: S02·S03·S04·S11·S30·S32·S08~S34 중 나머지의 after 이미지는 육안으로 비교하지 않았고 프로브 지적 수와 문서 높이만 전후 대조했다(S06·S07의 문서 높이만 줄었고 지적 코드 변화 없음). S01의 `diagram` 카드는 벤토 2열 모드에서 폭 전체로 늘어나 흐름도가 크고 성긴 점이 눈에 띈다(원인 5 영역, 해결하지 않음).

### 12.4 구조 등급 재측정

`diagnose.mjs /tmp/diag-variants.json --workers 8` → 4,955개 조합 19,820회: **A 4,515 · B 440 · C 0**, `grades-diff.mjs`(기준 `diagnosis-2.3.0.json`): 상승 0·하락 0·지적 코드 추가 0·감소 0(개수만 달라진 조합 1개). 등급은 구조 결함의 유무이지 완성도가 아니라서 이 변화 없음이 개선을 증명하지 않는다. 증거는 `docs/evidence/diagnosis-2.4.0.json`.

### 12.5 재현 테스트 (수정 전 실패 → 수정 후 통과)

`tests/variant-contracts.test.mjs` 9개, `tests/page-rules.test.mjs` 9개. 수정 전 18개 모두 실패(`docs/evidence/variants/red.log`, 모두 단언 실패), 수정 후 통과. 변이 확인: 버전 게이트 제거 시 2.3.0 호환 시험, V01 검사 무력화 시 V01 시험 2개, P03 CSS 제거 시 P03 시험이 각각 실패한다.

