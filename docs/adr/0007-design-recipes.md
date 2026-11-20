# ADR 0007 · Design Recipe: 페이지 유형별 권장 조합을 데이터로 둔다

- 상태: 채택 · 2026-11-21
- 근거: `../quality-diagnosis-2026-11-21.md` 7절(Recipe 입력), ADR 0006(V01~V06, P01~P04). 설계·측정·한계는 `../recipes.md`.

## 결정

1. **Recipe 3종(`src/catalog/recipes.mjs`)**: SaaS 랜딩, 업무 대시보드, 콘텐츠 페이지. 기존 템플릿·구성 변형·컨셉 look을 고르는 선호 순서, 어울리는 축 범위, 지켜야 할 규칙 ID, 피할 조합과 이유를 구조화 데이터로 둔다. 새 규칙은 RC01~RC09만 더하고 V·P 규칙은 그대로 쓴다. DSL·자유 표현식·소비자 CSS는 없고 검사 종류는 코드 한 곳(`src/recipes.mjs`)에 닫힌다.
2. **결정적 선택 함수(`selectRecipe`)**: 같은 입력이면 같은 조합과 같은 근거(레시피 id, 지킨·피한 규칙 ID, 탈락 후보)를 돌려준다. 후보 순서는 데이터가 정하고 난수·시간·브라우저를 쓰지 않는다. 선택 시 판정할 수 없는 렌더 결과(RC07~RC09)는 브라우저 측정 시험이 맡는다.
3. **조합을 금지·삭제하지 않는다.** Recipe는 "추천 순서"만 바꾼다. 갤러리 기본 정렬이 추천 먼저이고 배지·필터·정렬 복귀가 있다. 조립기는 레시피 버튼과 근거를 보여 주고 카탈로그 탭의 시작 경로가 추천을 쓴다. 규칙을 못 지키는 템플릿은 `satisfied:false`와 이유만 남고 추천 표시가 붙지 않는다. 조합 id 4,955개와 URL은 그대로다.

4. **콘텐츠 보존 계약 V06**(ADR 0006의 V계약 확장): 히어로 형태 변경이 히어로 수치(facts)를 지우면 기본 추천에서 뺀다. 발견 경위: Recipe가 waitlist에서 고른 `hero:product`가 수치 3개를 지웠다. 원인은 `setHero`의 필드 정리이고 같은 손실은 `hero:split`·`hero:product` × 수치 있는 9개 템플릿(768개 조합)뿐이다. 조합은 지우지 않는다. 결과로 waitlist는 추천하지 않는다(콘텐츠 손실 없이 RC01을 지킬 후보가 없음). 상세는 `../recipes.md` 5.4절.

## 호환 정책 (카탈로그 2.4.0)

- 카탈로그는 아직 배포 전인 2.4.0에 넣는다. 출력(HTML/CSS)을 바꾸지 않는다: `compile`·렌더러 코드는 그대로이고 `src/render/chart.mjs`는 `niceMax`에 `export`만 붙였다. 2.1.0~2.3.0 고정 출력 시험(`tests/layout-rev2.test.mjs`, `tests/page-rules.test.mjs`)은 그대로 통과한다.
- Blueprint에는 Recipe 흔적이 남지 않는다. 선택 결과는 평범한 {템플릿, 구성 변형, 보기 설정}이다. `combo.recipe`(갤러리 목록 표시용)와 `site/v1/catalog.json`의 `recipes`·`recipeRules`·`recipePicks`가 새로 생긴다.

## 하지 않은 것과 한계

- 전체 카탈로그 재설계, 새 테마·템플릿, 벤토 행 높이(`src/layout.mjs` `bentoPlan`)는 범위 밖이다. P04/Q07은 해결하지 못했다.
- Recipe 선택 15개 중 기본과 다른 추천은 1개(devtool-landing)이고 추천하지 못하는 템플릿은 2개(hr-people RC05, waitlist RC01)다. 나머지 12개는 기본이 이미 규칙을 지켜 같은 조합이다. 가치는 회귀 방지와 비교 실험의 기준 축이다.
- 시각적 개선 주장은 직접 본 R1 1440·390px에 한정한다. 범용 device 목업, 테마 교체에 따른 구성 변화, 좁은 폭의 위계(1.58배)는 `../recipes.md` 7절에 있다.
