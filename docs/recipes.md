# Design Recipe: 검증된 권장 조합 (카탈로그 2.4.0, 2026-11-21)

결정 요약은 `docs/adr/0007-design-recipes.md`. 근거 결함은 `docs/quality-diagnosis-2026-11-21.md` 4절, 입력은 같은 문서 7절이다. 이 문서는 설계, 선택 방식, 측정 결과, 한계를 적는다.

## 1. 무엇이고 무엇이 아닌가

Recipe는 **기존** 템플릿·구성 변형·컨셉 look(테마+서체) 위에서 "이 페이지 유형이면 어떤 조합을 먼저 권하는가"를 구조화한 작은 데이터와, 같은 입력이면 같은 조합을 돌려주는 선택 함수다.

- 새 테마·템플릿·변형을 만들지 않는다. 소비자 CSS, 임의 클래스, 토큰 우회 경로가 없다. 검사 종류(`check.kind`)는 `src/recipes.mjs` 한 곳에 닫혀 있고 자유 표현식은 없다.
- **조합을 금지하거나 지우지 않는다.** 조합 4,955개와 id·URL은 그대로다. Recipe가 피한 조합도 갤러리 목록, 조립기 슬롯, 직접 렌더에서 예전처럼 열린다(`tests/recipes.test.mjs`가 `saas-landing~hero:statement` 등을 렌더해 확인한다). 변형 결과 계약 V01~V05와 같은 정책이다.
- 미감 보증이 아니다. Recipe는 "진단이 찾은 결함을 일으키는 조합을 피하고 진단 규칙을 지키는 조합을 먼저 권한다"는 뜻이고, 직접 본 범위는 6절에 적었다.

## 2. 데이터

`src/catalog/recipes.mjs`의 `recipes`(3종)와 `recipeRules`(RC01~RC09). 레시피는 다음 필드만 가진다(`tests/recipes.test.mjs`가 필드 집합을 고정한다).

| 필드 | 뜻 |
|---|---|
| `label`, `pageTypes`, `purpose` | 페이지 유형과 목적 |
| `content.form` | 콘텐츠의 주 형태 |
| `templates` | 권장 템플릿(선호 순서) |
| `layout` | `{슬롯: [옵션 선호 순서]}`. 'default'는 슬롯을 바꾸지 않음. 여기 없는 슬롯은 건드리지 않는다 |
| `looks` | 템플릿 기본 테마가 규칙을 못 지킬 때 순서대로 시도하는 기존 컨셉 look |
| `fit` | 어울리는 밀도·서체·스케일·셸(Blueprint 축 값, RC03) |
| `emphasis`, `support` | 강조 요소와 보조 정보를 표현하는 방식(노드 종류와 문장) |
| `rules` | 선택 결과가 지켜야 하는 규칙 ID(V·P·RC 혼합) |
| `avoid` | 피할 조합과 이유. `slot`·`option` 또는 `axis`·`value`와 `rule`, `why` |

규칙 ID는 기존 V01~V05(변형 결과 계약), P01~P04(페이지 규칙)를 그대로 쓰고, 새로 필요한 것만 RC로 더했다.

| ID | 방식 | 내용 | 청구·근거 |
|---|---|---|---|
| RC01 | 선택 시 판정 | 히어로에 제품 시각 요소(chart·device) 1개 | Q14 · B1, C2 |
| RC02 | 선택 시 판정 | 히어로 제목 ≥ 섹션 제목 × 1.6 (1440px 기준, `roleSizes`로 계산) | Q06 · C2 |
| RC03 | 선택 시 판정 | 밀도·서체·스케일·셸이 레시피 범위 안 | B6 |
| RC04 | 선택 시 판정 | KPI 4개 이하는 열 수 ≥ 항목 수 | Q11 · B3 |
| RC05 | 선택 시 판정 | 차트 채움 ≥ 60%, 넓은 폭(wide·full)에서 페이지 바로 아래의 단독 차트 금지 | Q08 · C4 |
| RC06 | 선택 시 판정 | 페이지 머리말·최상위 섹션이 가운데 정렬이 아님 | Q12 · B4 |
| RC07 | 브라우저 측정 | 같은 행 차트 카드 아래 빈 공간 96px 미만 또는 38% 미만 | Q04 · A4 |
| RC08 | 브라우저 측정 | 프로브 ORPHAN_LINE 0 | A6 |
| RC09 | 브라우저 측정 | 프로브 BIG_NARROW 0(320px 제목 하한) | Q05 · A5 |

선택 시 판정에는 V01~V05(후보 조합이 `recommended`인가)와 P01(컴파일 결과의 `PAGE_DUP_VISUAL` 없음), P02(보정이 필요했다는 사실 자체)도 함께 걸린다.

### 레시피 3종

| 레시피 | 유형·목적 | 권장 템플릿 | 선호하는 구성 변형 | 어울리는 축 | 피하는 것 |
|---|---|---|---|---|---|
| `saas-landing` SaaS 랜딩 | 랜딩. 제품을 첫 화면에서 보여 주고 가입으로 잇는다 | saas-landing, b2b-solution, app-landing, devtool-landing, waitlist | hero: default → product → split. 기본 템플릿 테마가 먼저, 안 되면 SaaS 컨셉 look(트러스트 → 워크스페이스 → 정돈된 SaaS) | 밀도 comfortable·spacious, 스케일 balanced·dramatic | hero:statement·cover(V01), heads:center(V04), 스케일 tight(RC02) |
| `ops-dashboard` 업무 대시보드 | 대시보드. KPI 한 줄, 차트 행, 표 | dashboard-overview, sales-dashboard, hr-people, finance-overview | columns: default만 통과(열 수 변경은 V03이 걸러 냄) | 밀도 compact·comfortable, 스케일 tight·balanced, 셸 sidebar·rail·topbar | columns:two(V03), 셸 minimal(RC03). hr-people은 RC05로 추천 제외 |
| `content-page` 콘텐츠 페이지 | 글·문서. 제목·본문 한 정렬선 | article, blog-post, research-paper, policy, docs-reference, tutorial | intro: default만 통과 | 밀도 comfortable·spacious, 서체 serif·literary·bookish·editorial·humanist·sans·newsroom·tech | intro:center(V04), 서체 condensed(RC03) |

## 3. 선택 함수

`selectRecipe({recipe, templateId?})`(`src/recipes.mjs`). 난수·시간·브라우저가 없고, 새 모듈 인스턴스에서도 같은 결과임을 시험한다.

1. 템플릿이 없으면 `templates` 순서로, 있으면 그 템플릿으로 후보를 만든다.
2. 후보 = (템플릿 기본 look, 레시피 look…) × (`layout`의 슬롯별 선호 옵션 곱, 'default'가 먼저). 템플릿에 없거나 효과 없는 옵션은 제외된다.
3. 후보마다 Blueprint를 만들고 V규칙(`assessLayout`), 검증, 컴파일 결과의 페이지 사실(P01·P02), RC 선택 시 규칙을 대조한다. 첫 통과 후보가 선택이다.
4. 어느 후보도 통과하지 못하면 실패 규칙이 가장 적은 후보를 돌려주고 `satisfied:false`와 `unmet`에 이유를 남긴다(예: hr-people RC05). 이 선택은 "추천"으로 표시하지 않는다.

결과에는 선택 근거가 남는다: `recipeId`, `applied`(지킨 규칙 ID와 청구), `avoided`(피한 규칙, 슬롯·옵션 또는 축 값, 이유), `unmet`, `measured`(브라우저 측정이 판정하는 RC), `pageRules`(결과에 P규칙이 낸 결정, P04처럼 보고만 하는 것 포함), `trace`(탈락 후보와 실패 규칙). `evaluateRecipe`는 임의의 조합이 왜 레시피 밖인지 설명하는 데 쓴다(조합을 막지 않는다).

## 4. 기본 추천 경로에서 우선

- **갤러리**(`combos/`): 기본 정렬이 "레시피 추천 먼저"다. 추천 조합 14개가 앞에 오고 나머지는 템플릿 순 그대로다. "템플릿 순" 정렬로 되돌릴 수 있다. 조합 카드에 "레시피 추천" 배지(툴팁에 지킨 규칙 ID와 보기 설정), "레시피 추천만" 필터, 확대 보기에 레시피의 보기 설정을 적용하는 버튼이 있다. 추천이 아닌 조합은 모두 그대로 있다.
- **조립기**(`index.html`): 템플릿에 레시피가 있으면 "레시피 추천으로 맞추기" 버튼과 근거 문장이 보인다. 규칙을 못 지키는 템플릿(hr-people)은 이유만 보이고 버튼이 숨는다. 카탈로그 탭의 "이 템플릿으로 시작"이 레시피 추천으로 시작한다(예전에는 템플릿 기본). 템플릿 선택 드롭다운과 슬롯 칩은 예전 그대로 동작한다.
- `site/v1/catalog.json`에 `recipes`, `recipeRules`, `recipePicks`(선택 결과와 근거)가 들어간다. 다음 단계의 비교 실험(기본 자동 조립 대 Recipe 대 AI 재선택)이 읽는 입력이다.

## 5. 측정 결과 (Chromium, macOS 폰트, 320·390·768·1440px, `reducedMotion:'reduce'`)

도구: `node scripts/design-qa/recipe-evidence.mjs`(비교와 스크린샷, `docs/evidence/recipes/measure.json`·PNG 32장), `--matrix`(선택 15개 전체, `picks-matrix.json`), `node scripts/design-qa/diagnose.mjs … --ids-file`(`diagnose-picks.json`). "기본 자동 조립"은 `createBlueprint(템플릿 id)`(템플릿 기본 테마, 구성 변형 없음)다.

### 5.1 Recipe가 기본과 달라진 곳과 같은 곳

선택 15개 중 기본과 다른 것은 2개뿐이다(`devtool-landing`, `waitlist`). 나머지 13개는 기본 조립이 이미 규칙을 지켜 Recipe가 그대로 고른다(같은 조합 id, 렌더 바이트 동일). 이는 한계이기도 하다(7절).

| 입력(같은 콘텐츠) | 기본 자동 조립 | Recipe 조립 |
|---|---|---|
| R1 `devtool-landing` (S05) | `devtool-landing`: P02가 시각 요소 없는 split을 가운데 텍스트형으로 바꿈. 히어로 제목 29(320·390·768px)·34(1440px)px, 섹션 제목 대비 1.38~1.42배. 문서 높이 4401/4293/3429/2684px | `devtool-landing~hero:product` + 컨셉 look SaaS·트러스트(`saas.trust`). 제목 38·38·38.4·**64px**, 섹션 제목 대비 1.58·1.58·1.6·**1.94배**, 제품 시각 요소(`device`) 있음. 문서 높이 4778/4830/3546/3294px |
| R3 `waitlist` | centered 히어로, 시각 요소 없음, 제목 39.6~80px | `waitlist~hero:product`(device 시각 요소 추가), 템플릿 기본 테마, 제목 크기 같음(80px@1440). 문서 높이 1575→1701(320), 1422→1352(1440) |
| R2 `saas-landing` (S01) | 제목 59.6px@1440, 비율 1.81배, 시각 요소 있음 | 같음(Recipe = 기본) |
| R4 `sales-dashboard` (S12) | Q11 1440px 한 줄 통과, Q04 768px 180px/35%·1440px 142px/28% 통과 | 같음 |
| R5 `dashboard-overview`, R8 `docs-reference`, R9 `blog-post`, R7 `article` (S34) | Q11 한 줄, Q12 불일치 0 | 같음 |
| R6 `hr-people` (S29) | Q08 **실패**(차트 가로 2.13배 늘어남, 채움 74%) | Recipe가 추천하지 않음(RC05). 렌더는 기본과 같음 |

모든 입력에서 기본과 Recipe 모두 4개 폭 심각 프로브 지적 0이다. 기본 devtool-landing이 프로브로는 A이므로 R1의 차이는 프로브가 아니라 위계(제목 크기 비)와 시각 요소 유무에서 나온다.

### 5.2 선택 15개의 등급과 프로브(완료 기준 5)

`picks-matrix.json`(폭 4개, Recipe 보기 설정으로 렌더): **심각 프로브 지적 15개 모두 0/0/0/0**. 구조 등급은 A 13, B 2. B는 `saas-landing`(1440px `MEASURE_SHORT` 2건)과 `dashboard-overview`(768px `MEASURE_SHORT` 1건)이고, 글줄 폭 역할의 경미한 지적이다(진단 11.4절이 남긴 범위, 이번에 고치지 않았다). `diagnose.mjs`(1440·390px, 기본 보기 + 회전 테마 1개, 선택 조합 id 15개, 60뷰): A 13, B 2(`saas-landing` MEASURE_SHORT 3, `b2b-solution` MEASURE_SHORT 1), C 0. 두 측정의 B 조합이 다른 것은 폭·테마 구성이 달라서다. 이 B 조합은 "구조 등급 A" 기준을 채우지 못한다: 사유는 위와 같다.

### 5.3 선택 시 규칙이 브라우저 측정과 어긋난 사례

RC05를 처음에는 차트 채움(≥60%)만 봤다. hr-people은 채움 74%로 통과했는데 브라우저 Q08이 가로 왜곡 2.13배로 실패했다(`preserveAspectRatio none`인 단독 전폭 차트). 규칙을 "넓은 폭에서 페이지 바로 아래의 단독 차트 금지"까지 넓혔고, 그 결과 hr-people은 추천에서 빠졌다. 정적 규칙이 측정을 모두 대신하지 못하므로 `e2e/recipes.spec.mjs`가 추천 조합마다 측정 규칙을 브라우저로 다시 잰다.

## 6. 직접 본 것과 못 본 것

- **직접 본 스크린샷**: R1 기본·Recipe 1440px, R1 기본·Recipe 390px, R4 Recipe 1440px, R7 Recipe 1440px. (R4·R7은 Recipe = 기본이라 한 장씩만 봤다.)
  - R1 1440px: 기본은 가운데 정렬된 짧은 히어로(제목 34px, 시각 요소 없음)이고, Recipe는 제목이 크게(64px) 왼쪽에 서고 오른쪽에 제품 목업이 있어 섹션 제목과의 위계가 분명하다. 그러나 목업은 devtool과 무관한 범용 휴대폰 화면("오늘의 기록", 72%)이다. 시각 요소가 "있다"는 구조 조건은 채웠지만 제품 의미를 보증하지 않는다. 테마가 `devtool`에서 `trust`로 바뀌어 색과 콘텐츠 폭이 달라졌고 벤토가 큰 차트 한 칸 + 카드 2×2로 재배열되어 차트가 넓고 성기다(원인 5 영역, 해결하지 않음).
  - R1 390px: Recipe는 제목이 29→38px로 커지고 히어로가 왼쪽 정렬로 목업을 가진다. KPI 카드는 한 열로 쌓이고 문서가 4293→4830px로 길어진다.
  - R4 1440px: KPI 4개가 한 줄이고 막대 차트는 채워져 있다. 도넛 카드는 본문이 가운데에 떠서 위아래가 비어 있다(Q04는 28%로 통과이나 142px 빈 공간이 남는다, 진단 11.4절과 같다).
  - R7 1440px: 제목·본문·인용이 한 정렬선에 있다.
- **직접 보지 않은 것**: R1·R2·R3 나머지 폭과 R2·R3·R5~R9의 모든 스크린샷은 눈으로 비교하지 않았고 프로브 지적, 문서 높이, 청구 수치로만 확인했다. R1 320·768px 스크린샷도 보지 않았다. R2·R4~R9는 Recipe = 기본이라 비교 자체가 같은 화면이다.
- "시각적으로 개선됐다"고 쓸 수 있는 근거는 R1의 1440·390px에서 본 위계와 시각 요소 변화에 한정한다. 그것이 devtool 페이지에 더 적합하다는 판단은 하지 않았다.

## 7. 한계

- **Recipe가 하는 일은 대부분 "이미 좋은 기본을 그대로 고르는 것"이다.** 선택 15개 중 기본과 다른 것은 2개다. ops·content 레시피는 이번 표본에서 기본과 같은 조합을 고른다. 이 가치는 회귀 방지(나쁜 조합을 기본 추천에서 우선하지 않음)와 AI 재선택과의 비교 기준을 만든다는 데 있고, 이 화면들의 시각 품질 향상은 아니다.
- **RC02는 1440px 기준이다.** 320·390px에서는 R1 Recipe가 1.58배(1.6 미만), saas-landing 기본이 1.44·1.58배로 같은 수준이다. 좁은 폭의 위계는 이 규칙이 보지 않는다.
- **device 시각 요소는 범용 목업이다.** `setHero`가 시각 요소가 없던 히어로에 넣는 값이라 제품과 맞지 않을 수 있다. Recipe는 구조 조건만 확인한다. 의미 있는 제품 그림은 템플릿 데이터를 고쳐야 한다(범위 밖).
- **테마를 바꾸는 선택은 화면 구성을 바꾼다**(진단 B6). devtool-landing의 Recipe 선택은 look이 `trust`라 devtool 테마의 어두운 결을 잃는다. 순서상 `trust`를 먼저 시도하는 선택은 규칙이 아니라 데이터 순서이고 `looks`를 바꾸면 달라진다(미감 판단을 포함).
- **`fit`의 서체 목록**(content)은 기존 컨셉 look과 템플릿 기본 서체에서 모은 것이다. 나머지 서체가 나쁘다는 측정은 없다.
- **P04(벤토 희박)와 Q07은 해결하지 못했다.** saas-landing의 선택에도 P04 보고가 남는다(`pageRules`). 벤토 행 높이(`src/layout.mjs`)는 다른 작업자 영역이라 건드리지 않았다.
- **RC07~RC09는 선택 시 판정이 아니라 브라우저 측정이다.** `e2e/recipes.spec.mjs`가 추천 조합에서 잰다(Q04, ORPHAN_LINE, Q12). BIG_NARROW는 심각 프로브에 포함되어 같은 시험이 본다.
- **레시피 look은 Blueprint 전체 범위 중 일부만 본다**: 팔레트·모드·서체 단독 선택(`type`)은 레시피 입력이 아니다. 사용자가 보기 설정을 직접 고르면 그 값이 우선한다(갤러리).
- 환경: Chromium·macOS 폰트만 측정했다. Linux CI 폰트의 줄바꿈은 확인하지 못했다.

## 8. 재현

```
node --test tests/recipes.test.mjs                       # 데이터·결정성·규칙 효과·조합 보존
PW_PORT=4273 npx playwright test e2e/recipes.spec.mjs    # 추천 조합 4폭 프로브, Q08/Q04/Q12, 갤러리·조립기
node scripts/design-qa/recipe-evidence.mjs --matrix      # picks-matrix.json
node scripts/design-qa/recipe-evidence.mjs               # measure.json + PNG
```
