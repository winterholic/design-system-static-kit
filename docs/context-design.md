# 맥락 기반 디자인 규약 — composition 1.1.0

현재 후속 규약: composition 1.2의 `table-content-1`, `chrome-row-1`, `sequence-content-1`과 콘텐츠 정정은 [R14-C](evidence/context-rollout/remediation-c.md)에 있다. 아래 초기 규약과 기존 결정표·토큰·흐름을 재사용하며 자연어 런타임을 추가하지 않는다.

## 선택과 실행의 경계

카탈로그 2.2.0에서 기본 적용한다. Blueprint 2.0의 필드·노드·축·토큰 권한은 그대로다. 2.1.0 입력은 새 정책을 거치지 않는다. `kit migrate old.json new.json`은 2.1→2.2에서 `catalogVersion`만 바꾸며 콘텐츠와 축을 고치지 않는다. 1.0 입력은 기존 migration을 이용한다. 소비 프로젝트는 버전을 명시적으로 pin한다.

정본: `src/catalog/composition.mjs`의 `compositionRules`, `compositionCoverage`, `PAGE_INTENT`, `src/composition.mjs`의 파생 계산, 기존 `typography.mjs`/`spacing.mjs`/`layout.mjs`. `site/v1/catalog.json`은 정책 버전, 조건·결과 결정표, 부품별 적용 범위를 기계가 읽도록 노출한다. 자연어 `reason`은 설명용이며 선택 술어가 아니다.

## 사실 → 선택 → 배치

1. 검증된 tree에서 페이지 목적, 노드 의미(가격→상품, 작성자→편집 콘텐츠), 부모·section 중첩, 형제 수, 텍스트 폭 bucket, 테마·서체·밀도를 읽는다.
2. 결정표 `when`은 사실 필드의 동등 비교다. 배열 값은 허용 집합이다. 알 수 없는 자유 표현식·프롬프트를 평가하지 않는다.
3. `priority` 오름차순, 같은 priority는 ID 사전순으로 적용한다. 결과 필드별 높은 priority가 우선한다. **같은 priority가 같은 필드에 다른 값을 쓰면 오류**다. 조용히 마지막 값을 채택하지 않는다.
4. 선택 결과는 기존 역할(`app`, `heading-s`, `sub`, `body`, `stat`)과 간격 tier(`head`, `item`, `inset`, `insetS`, `insetL`)를 참조한다. 카탈로그 변형·색·안전성·명시적 split 비율은 유지한다.
5. 실제 컨테이너 폭과 폰트 렌더는 CSS가 결정한다. 컴파일러는 폭을 실측했다고 주장하지 않으며 콘텐츠를 잘라 fitting 결과를 만들지 않는다.

## 공통 규칙과 유도식

| 대상 | 결정 | 예외와 책임 |
|---|---|---|
| 페이지 헤더 | task/form/commerce는 app, 그 외 title | 바로 다음 hero/동일 상태 제목과 중복되는 기존 `leadOf` 접기 규칙이 우선한다. |
| 섹션 | operation/reading/form/commerce는 heading-s, 그 외 heading | 중첩 표면은 insetS. 구조적 제목 단계는 renderer가 계속 계산한다. |
| 카드 | 상품은 body·상품 가격 위계, 작성자는 editorial·sub, 업무 보조 정보는 body-l·insetS, feature는 sub·inset | variant·상품 open surface 토큰·작성자 footer를 보존한다. profile·설정 행 등 별도 의미 부품은 자동 변환하지 않는다. |
| KPI | summary·stat·insetS·sub 행간, 충분한 셀 폭 확보 후 기존 숫자 fit | 짧은 숫자도 긴 이웃과 같은 그리드에서는 정렬을 위해 같은 열 폭을 쓴다. 좁은 metric content box에서는 장식 spark를 숨기며 값·라벨은 남긴다. |
| 폼 | fieldGap=head, 기본 inset, 주 폼 intent는 insetL | two-column은 form content box가 `2 × minField + head`를 수용할 때만. 긴 라벨은 280px, 나머지는 220px 입력 예산. textarea와 choice의 기존 full-span 유지. |
| 표·목록 | 셀/행의 간격은 item 밀도 tier | 표는 모든 폭에서 내부 가로 스크롤이 가능하다. 데이터·caption·행/열 머리 의미를 바꾸지 않는다. |
| grid | 자식 의미와 수량이 최소 셀/간격을 공급하고 기존 bestCols가 열을 고른다 | summary는 item gap, 그 외 gap. `columns`는 여전히 열 수 상한이며 더 많은 열을 강제하지 않는다. |
| split | 실제 할당 영역이 `2 × 320 + gap` 이상일 때만 2열 | even/wide-start/wide-end·reverse를 넓은 컨테이너에서 보존. 좁으면 DOM 읽기 순서대로 1열. |
| hero | copy/action 관계 간격은 head/gap, visual이 있으면 intrinsic grid | copy 최소 폭은 제목 bucket과 기존 display/heading 역할에서 유도하고 320px 이상 finite bucket으로 선택. 실제 hero content box에서 auto-fit하고 frame의 viewport 음수 bleed를 제거한다. |
| aside | 본문 최소 320px + 보조 300/380px + gap을 수용할 때 2열 | 실제 배정 영역을 query한다. 보조 자손은 `supporting` 사실을 전달받는다. |
| team | 소개글 또는 긴 역할명이 있으면 280px, 짧은 이름·역할은 200px 최소 셀 | 기존 bestCols를 재사용하고 dense 2열 하한을 사용하지 않는다. 내부 여백은 insetS다. |
| pricing/plan | 비교 열은 최소 280px, 주 요금제 insetL, 보조 영역 요금제 insetS | 가격·기간·추천·기능·액션의 의미와 원문을 보존한다. |
| gallery | grid는 기존 flow, masonry는 480/760px 컨테이너 경계, showcase는 560px 경계 | 300px 보조 갤러리에 데스크톱 뷰포트의 3열/세로 썸네일을 강제하지 않는다. |
| timeline/properties/master-detail | 컨테이너 기준 메타·본문 및 라벨·값 트랙 전환 | 글줄·근접 계약을 유지하고 타임라인 변경 내역은 기존 small 역할에 42em 상한을 둔다. |
| quote/chart/calendar | 인용·출처, 차트·범례, 일정·agenda의 기존 의미를 재사용 | 기존 editorial 인용과 calendar의 컨테이너 agenda 분기는 그대로다. 내용은 자동 축약하지 않는다. |
| feature-list/steps/menu | 내용과 수량이 240/280px 셀과 gap을 공급 | 반복 항목 배치는 기존 orphan-free flow가 담당한다. |

KPI 최소 셀 폭 예산:

```
target = max(sub.max, stat.min)  // 선택한 서체·scale의 기존 역할
valueWidth = vlOf(value) × target × 1.04
labelWidth = cplOf(label) × small.max  // 기존 언어별 폭 추정 재사용
needed = max(valueWidth, labelWidth) + 2 × insetS + 2px border
minCell = first fitting bucket in [160,200,240,280,320,360,400,480]
```

`vlOf`/`cplOf`는 휴리스틱이다. 긴 영단어·emoji·플랫폼 대체 폰트·bucket 상한에서 오차가 있으므로 browser 검사가 최종 관측이다. 수치와 220/280/320px 예산은 이 kit의 검증 가능한 정책 출발점이며 외부 디자인 시스템의 보편적 규정으로 주장하지 않는다.

상한 진단은 bucket에 넣기 전의 `valueUnits`로도 계산한다. 필요한 최소 폭이 480px을 넘으면 `CONTENT_BUDGET_LIMIT`와 필요한 폭·상한·single-column/table 대안을 결정 진단에 남긴다. 원문 값을 자르거나 통화 단위를 임의로 바꾸지 않는다.

그리드 폭 경계는 `0, 2m+g, 3m+2g, 4m+3g`이다. `m`은 최소 셀 폭, `g`는 실제 적용 gap이다. 열 선택·고아 줄 해소는 기존 `bestCols`를 재사용한다. `kit-layout-region`은 full/content 트랙을 가진 부모의 전체 폭 대신 실제 자식 배정 폭을 제공한다. 간격과 최소 폭이 달라졌는데 기존 24px 기준 경계를 재사용하지 않는다.

## 진단 예시와 추적

`compile(blueprint).manifest.design`에는 정책 버전과 노드별 `path`, `type`, `facts`, `coverage`, `applied` 규칙 ID, 최종 `values`, 필드별 승자 `sources`, `flow`/`container`/KPI `budget`이 들어간다. `inherited`에는 기존 계약을 재사용한 노드의 경로·타입·계약 근거가 들어간다. `manifest.blueprint`는 사용자 입력 복제이며 파생 역할을 역주입하지 않는다.

55종 전체를 `compositionCoverage`로 열거한다. 25종은 맥락 결정표 적용, 30종은 기존 구조·간격·타입·상태·내비게이션 계약의 명시적 재사용이다. 이 둘을 모두 새 CSS 처리한 55종으로 세지 않는다. 새 부품에 coverage가 없으면 컴파일 단계에서 실패한다. 내비게이션 셸은 노드 55종과 별도이며 기존 navLimits·반응형·키보드 계약을 유지한다.

예: 업무 KPI의 패딩은 C10이 선택한 insetS, 역할 크기는 해당 서체의 stat, 열 수는 C17 아래 자식 폭 예산과 실제 container의 bestCols다. 상품 제목 body는 C06의 generic sub보다 priority가 높은 C07이 선택한다. 충돌과 결정성은 `tests/composition.test.mjs`, 브라우저 폭·위계 반례는 `e2e/composition.spec.mjs`에서 고정한다.

브라우저 검사는 `SUMMARY_HIERARCHY`, `FIELD_CAPACITY`, `FLOW_CAPACITY`, `SPLIT_CAPACITY`를 추가 관측한다. 이 지표는 미감 점수가 아니다. 기존 layout/text/spacing probe를 함께 실행하고 확인하지 않은 영역은 미검증으로 남긴다.

## 확장 후 남은 검증

1. 이번 입력 예산 밖의 장문·큰 통화 단위·한글/영문 혼합·320px에서 남는 위계 문제를 반례로 추가한다.
2. Chromium 외 Safari/iOS, Android 실기기와 보조기기는 해당 장비·도구로 검증해야 한다. 현재 Chromium의 뷰포트 검증을 실기기 결과로 표시하지 않는다.
3. 강조 예산·section 리듬·선택된 이웃 관계와 콘텐츠 중요도는 실제 소비 반례가 필요할 때 확장한다. 자동 텍스트 축약은 도입하지 않는다.
