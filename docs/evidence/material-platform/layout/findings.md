# Chromium 레이아웃 검사 결과

## 실행 정보

- 소스 기준 커밋: `5b607d374bbc4f168818c96f40db6af7296187ce` (`feat/representative-layout-fix`). 재료 조립과 네 화면 계측은 이 커밋의 체크아웃에서 실행했다.
- 입력: `docs/evidence/material-platform/assembled/{erp,commerce,saas,analytics}/index.html`과 생성 CSS. 공개 `assembleBlueprint` + `compileBlueprint` API로 네 맥락을 조립했다. 화면 입력/선택 재료 및 Blueprint·HTML·CSS SHA-256은 [assembly.json](../assembly.json)에 기록했다.
- 브라우저: 구성된 Ttakkari browser MCP Chromium, `HeadlessChrome/157.0.0.0`, DPR 1. 캡처·계측 시각은 2026-11-21T19:02:03.723Z (KST 2026-11-22 04:02:03). 브라우저 버전과 상세 실행 기록은 [run.json](run.json), 원시 결과는 [report.json](report.json).
- 대표 측정: ERP·커머스·SaaS·분석 화면을 390px·1280px에서 측정했다. 대조군 S21@320, S06@1440도 함께 측정했다.
- 사람의 C 평가는 진행하지 않았다: `미평가`. 자동 검사 결과는 사람의 시각 평가를 대신하지 않는다.

## 현재 결과

대표 화면 8개 조합에서 미면제 `error`와 `warn`은 0건이다. ERP@390에 의도된 수평 스크롤 영역 정보 2건(`SCROLL_REGION`: 내비게이션 55px, 표 134px)만 남는다. 나머지 대표 화면 7개 조합에는 발견이 없다.

| 화면 | 390px | 1280px |
|---|---|---|
| ERP | 오류 0, 정보 2 | 발견 0 |
| 커머스 | 발견 0 | 발견 0 |
| SaaS | 발견 0 | 발견 0 |
| 분석 | 발견 0 | 발견 0 |

레거시 회귀 대조군 결과는 대표 화면 합계에 포함하지 않는다. S21@320은 의도된 메뉴·탭 수평 스크롤 정보 2건, 오류 0건이다. S06@1440은 `SVG_SLICE_CROP` 경고 1건이다. SVG `viewBox="0 0 320 320"`가 594×328.4px 상자에 `preserveAspectRatio="xMidYMid slice"`로 렌더되어 세로 viewBox의 추정 크롭이 44.7%(위·아래 각각 22.4%)라는 계측값이다. 이는 의미 콘텐츠 자체가 실제로 잘렸는지를 판별하는 검사가 아니라 비율 기반 위험 경고다. S06 대조 입력은 미탐 반례로 보존해 두었으며, 이 작업은 범위 밖 화면을 수정하지 않았다.

## 화면 캡처

이번 실행에서 browser MCP Chromium으로 새로 캡처한 전체 페이지 PNG:

| 화면 | 390px | 1280px |
|---|---|---|
| ERP | [캡처](erp-390.png) | [캡처](erp-1280.png) |
| 커머스 | [캡처](commerce-390.png) | [캡처](commerce-1280.png) |
| SaaS | [캡처](saas-390.png) | [캡처](saas-1280.png) |
| 분석 | [캡처](analytics-390.png) | [캡처](analytics-1280.png) |

## 이전 결과 보존

덮어쓰기 전에 기존 assembly, findings, report, run 및 대표 캡처를 `previous-2026-11-21T190139Z` 접두어로 보존했다. 앞선 세션이 남긴 `previous-2026-11-21T175341Z` 보존 파일도 그대로 유지했다. 더 오래된 17:29 결과와 17:42 baseline 역시 삭제하거나 덮어쓰지 않았다.

## 발견과 변경 경계

이번 실행에서 대표 화면 결함은 발견되지 않아 `src/`, `apps/web/`, `site/v1`, `site/examples`는 수정하지 않았다. S06에서 새로 관측한 대조군 경고의 원인과 판단은 위에 기록했다. 이 실행은 화면 결함을 고치는 작업이 아니므로 대조 입력도 변경하지 않았다.
