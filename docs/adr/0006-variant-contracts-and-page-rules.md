# ADR 0006 · 구성 변형에 결과 계약을, 페이지에 판단 규칙을 둔다

- 상태: 채택 · 2026-11-21
- 근거: `../quality-diagnosis-2026-11-21.md` 6절 원인 2·3, 4절 B1~B4·C1~C3·C5, 측정은 `scripts/design-qa/quality-claims.mjs`(Q06·Q07·Q10~Q15)

## 결정

1. **변형 결과 계약(V01~V05, `src/catalog/variant-contracts.mjs`).** 구성 변형은 값을 치환할 뿐이라 바뀐 뒤 의미를 보지 못했다. 계약은 구조화 데이터(`id`, `claim`, `slots`, `check:{kind,…}`, `effect`, `why`, `source`)이고, 검사 종류(`keeps-field`, `changed-ratio`, `single-row`, `one-axis`, `visible-effect`)는 코드 한 곳에 닫혀 있다. 자유 표현식·DSL·소비자 입력은 없다.

   | ID | 주장 | 위반 | 근거 결함 |
   |---|---|---|---|
   | V01 | Q14 | 히어로 변형이 있던 `visual`을 지운다 | B1 |
   | V02 | Q15 | 카드 스타일이 카드의 75% 미만만 바꾼다 | B2 |
   | V03 | Q11 | 지표 4개 이하 격자가 열 수 변경으로 두 줄이 된다 | B3 |
   | V04 | Q12 | 머리말만 가운데로 바뀌고 본문은 왼쪽이다(본문이 스스로 가운데인 로고 줄·상태 화면, 히어로·상태 화면 위에서 접히는 페이지 제목은 예외) | B4 |
   | V05 | 없음 | 렌더 지문(요소 위치·크기·글자·색)이 기본 구성과 1440·390px에서 같다 | 원인 2 추가 후보 |

2. **효과는 `not-recommended` 하나뿐이다.** 옵션과 조합 id는 지우지 않는다. 위반한 옵션은 `layoutSlots`에서 `recommended:false, rules:[{id,claim,detail}]`가 되고, 조합은 `combo.experimental`(`V01+V04` 형식, 진단 등급 사유와 ` · `로 이어짐)과 `combo.rules`(슬롯·옵션·규칙·주장·사유)를 얻어 갤러리 기본 목록에서 빠진다. 조립기는 점선 칩과 툴팁으로 표시한다. 명시적으로 고르면 예전과 같은 트리가 적용된다(실험적 자유도 유지). `assessLayout(tree, choice, pageType, ctx)`가 선택의 근거를 돌려준다.
   - **보정(correction)을 변형 단계에 두지 않았다.** 후보(히어로를 시각 요소 보존형으로 바꿔 치기, KPI 격자 건너뛰기, 카드 범위 확장)는 모두 조합 id의 뜻을 바꾸거나 `dashboard-overview~columns:two`처럼 효과가 사라지는 조합을 만들어 삭제와 같아진다. 보정은 컴파일러의 페이지 규칙(P02·P03)에 둔다.
   - V05의 측정 데이터는 `src/catalog/variant-effects.mjs`(생성 파일, `scripts/design-qa/variant-effects.mjs --write`)다. 단일 옵션 366개 중 10개가 중립이었다.
   - 계약의 예측은 `scripts/design-qa/contract-verify.mjs`로 1440px DOM과 대조했다(`docs/evidence/variants/contract-verify.json`).

3. **페이지 수준 규칙(P01~P04, composition 1.3.0).** `src/catalog/composition.mjs`의 `pageRules`는 노드 결정표(C01~C35)와 같은 엔진(`selectDesign`)을 쓰지만 입력이 페이지 사실이다(`intent`, `heroVariant`, `heroVisual`, `heroArt`, `afterHero`, 벤토 칸 구성, 렌더 그림 로그). 조건은 평범한 값이고 같은 우선순위의 같은 필드 충돌은 오류다. 결정은 `manifest.design.page`에 규칙 ID·경로·읽은 사실·사유와 함께 남는다. Blueprint는 고쳐 쓰지 않는다.

   | ID | 주장 | 사실 → 결정 |
   |---|---|---|
   | P01 | Q13 | 히어로에 그림이 있으면 본문의 첫 그림이 6장면 순환의 다음 장면을 쓴다. 순환하지 않는 그림(차트·기기)이 같은 내용으로 두 번 나오면 `PAGE_DUP_VISUAL`로 보고한다(렌더 그림 로그 기반) |
   | P02 | Q06 | 시각 요소 없는 `split`·`product` 히어로는 `centered`로 그린다(`data-hero-form`, 선언값은 manifest에 `declared`로 남음) |
   | P03 | Q10 | 마케팅·일반 페이지에서 히어로 바로 뒤의 투명(plain) 섹션은 위쪽 띠 여백을 0으로 한다. 히어로가 이미 띠 여백으로 끝나고 배경이 캔버스로 풀리기 때문이다. 색 면(tint·inverse)이면 경계가 보이므로 그대로 둔다 |
   | P04 | Q07 | 2×2 시각 칸 옆에 짧은 숫자 칸(metric·progress)이 2개 이상이면 `PAGE_BENTO_SPARSE`로 보고한다. 해소는 벤토 행 높이 규칙(`src/layout.mjs`)의 일이라 이번에 하지 않았다 |

   P03의 CSS는 결정에서 생성되는 한 줄(`compositionCSS`)이고 컴포넌트별 CSS·토큰 우회는 더하지 않았다.

## 호환 정책 (카탈로그 2.4.0)

- 2.4.0에서 페이지 규칙이 켜진다. **2.1.0·2.2.0·2.3.0 입력은 출력을 바이트 단위로 유지한다**(`PAGE_RULE_LEGACY_VERSIONS`, 레거시 composition 버전 `1.2.0`을 manifest와 CSS 주석에 그대로 쓴다). 고정 증거는 변경 전 코드(`a0f28b279`)에서 만든 `docs/evidence/variants/legacy-2-3-{blueprints,hashes}.json`이고 `tests/page-rules.test.mjs`가 85개 전체를 대조한다. 기존 2.1·2.2 hash 시험은 그대로 통과한다.
- `kit migrate`는 catalogVersion만 2.4.0으로 바꾸고 tree와 축을 보존한다. 다음 컴파일부터 페이지 규칙이 적용된다.
- 변형 계약은 Blueprint 컴파일이 아니라 템플릿 조립(`createBlueprint`)과 선택 경로에만 닿는다. 저장된 Blueprint에는 변형 선택이 남지 않으므로 호환 문제가 없다. 조합 id(`템플릿~슬롯:옵션`)는 전부 유지되어 URL·이상함 표시·표본(S02~S04, S11, S30, S32)이 그대로 풀린다.
- 템플릿 기본 데이터 수정은 호환 대상이 아니다(2.2.0 때와 같은 구분). `saas-landing` 벤토 카드의 `visual`을 `chart`에서 `diagram`으로 바꿨다(히어로 제품 목업과 같은 그림이 두 번 나오던 것, P01이 남기는 유일한 수정).

## 하지 않은 것과 한계

- Q07(벤토 칸 채움)은 통과하지 못했다. S06 최악 빈 비율 0.69, S01 0.63. 행 높이는 `bentoPlan`과 `.kit-bento` CSS가 정하고 이는 다른 작업자(원인 5)의 영역이다. P04는 사실 보고까지만 한다.
- Q12·Q11·Q14·Q15의 변형 표본(S30·S32·S11·S02·S03·S04)은 DOM이 예전과 같아 계속 `pass:false`다. 계약은 이 조합들을 기본 추천에서 뺐을 뿐 렌더를 바꾸지 않았다. `claims-after-variants.json`에 `recommended:false`와 규칙 ID가 함께 남는다.
- V04는 렌더러가 본문을 따라 가운데로 옮길 수단이 없어서(컴포넌트별 CSS 금지) 추천 제외까지만 한다. 전체 조합 4,955개 중 2,266개(46%)가 V04에 걸린다(`heads:center` 2,154, `intro:center` 112; 랜딩의 `intro:center`는 히어로 위에서 접혀 보이지 않으므로 제외된다). 계약 전체로는 3,466개(70%)가 기본 목록에서 빠지고 1,489개가 남는다. 가운데 정렬 머리말이 늘 나쁘다는 주장이 아니라 "현재 렌더러에서 본문이 따라오지 않는다"는 사실이다.
- Q12의 DOM 측정은 `<p>`가 없는 본문(music-player의 split)을 보지 못한다. 계약 예측 1건(`music-player~intro:center`)이 DOM과 달랐고 스크린샷으로는 제목만 가운데다.
- 제목 크기(`tight` 스케일에서 34px)는 타입 하한(원인 4, 다른 작업자) 영역이라 건드리지 않았다. P02는 형태만 바꾼다.
- 시각적으로 개선됐다는 판단은 표본 육안 확인에 한정한다(34개 중 일부). 미감 보증이 아니다.
